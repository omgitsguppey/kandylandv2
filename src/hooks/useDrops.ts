"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import useSWRInfinite from "swr/infinite";
import { recordClientDiagnostic } from "@/lib/client-diagnostics";
import { Drop } from "@/types/db";
import { applyDropStatus } from "@/lib/drop-status";
import { DROP_RUNTIME_COLLECTION, DROP_RUNTIME_DOC_ID } from "@/lib/drop-runtime";
import { useNetworkConditions } from "@/hooks/useNetworkConditions";

const INITIAL_SWEEP_NOW = Date.now();
const DROPS_PAGE_SIZE = 12;
const DROPS_REFRESH_MS = 30_000;
const DROPS_CONSTRAINED_REFRESH_MS = 90_000;
const DROPS_VERY_SLOW_REFRESH_MS = 120_000;
const EXPIRY_REFRESH_BUFFER_MS = 1_000;

interface DropFeedPage {
  drops: Drop[];
  nextCursor: string | null;
}

const dropPageEtagCache = new Map<string, string>();
const dropPageResponseCache = new Map<string, DropFeedPage>();

const fetcher = async (url: string) => {
  const headers = new Headers();
  const cachedEtag = dropPageEtagCache.get(url);
  if (cachedEtag) {
    headers.set("If-None-Match", cachedEtag);
  }

  const res = await fetch(url, { headers });
  if (res.status === 304) {
    const cachedPage = dropPageResponseCache.get(url);
    if (cachedPage) {
      return cachedPage;
    }

    return {
      drops: [],
      nextCursor: null,
    } satisfies DropFeedPage;
  }

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || `HTTP error! status: ${res.status}`);
  }

  const responseEtag = res.headers.get("etag");
  if (responseEtag) {
    dropPageEtagCache.set(url, responseEtag);
  }
  dropPageResponseCache.set(url, json as DropFeedPage);
  return json;
};

function buildDropCursor(drop: Drop) {
  return `${drop.validFrom}|${drop.id}`;
}

export function useDrops(
  statusFilter: Drop["status"][] | null = ["active", "scheduled"],
  initialData?: Drop[]
) {
  const [sweepNowMs, setSweepNowMs] = useState(INITIAL_SWEEP_NOW);
  const { isConstrained, isVerySlow } = useNetworkConditions();
  const lastRefreshAtRef = useRef(0);
  const refreshIntervalMs = isVerySlow
    ? DROPS_VERY_SLOW_REFRESH_MS
    : isConstrained
      ? DROPS_CONSTRAINED_REFRESH_MS
      : DROPS_REFRESH_MS;

  const getKey = (pageIndex: number, previousPageData: DropFeedPage | null) => {
    if (previousPageData && !previousPageData.nextCursor) return null; // reached the end
    if (pageIndex === 0) return `/api/drops?limit=${DROPS_PAGE_SIZE}`;
    return `/api/drops?limit=${DROPS_PAGE_SIZE}&cursor=${encodeURIComponent(previousPageData?.nextCursor ?? "")}`;
  };

  const fallback = useMemo(() => {
    return initialData ? [{
      drops: initialData,
      nextCursor: initialData.length === DROPS_PAGE_SIZE ? buildDropCursor(initialData[initialData.length - 1]) : null,
    }] : undefined;
  }, [initialData]);

  const { data, error, size, setSize, mutate } = useSWRInfinite<DropFeedPage>(getKey, fetcher, {
    fallbackData: fallback,
    persistSize: true,
    revalidateFirstPage: true,
    revalidateOnFocus: false,
    refreshInterval: refreshIntervalMs,
    refreshWhenHidden: false,
  });

  const refreshDrops = useCallback((throttleMs: number) => {
    const now = Date.now();
    if (throttleMs > 0 && now - lastRefreshAtRef.current < throttleMs) {
      setSweepNowMs(now);
      return;
    }

    lastRefreshAtRef.current = now;
    setSweepNowMs(now);
    void mutate();
  }, [mutate]);

  const swrDrops: Drop[] = useMemo(() => {
    return data ? data.flatMap(page => page?.drops || []) : [];
  }, [data]);

  useEffect(() => {
    const syncDrops = () => {
      refreshDrops(isConstrained ? 20_000 : 6_000);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncDrops();
      }
    };

    window.addEventListener("focus", syncDrops);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", syncDrops);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isConstrained, refreshDrops]);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    let sawInitialSnapshot = false;

    async function subscribeToDropRuntime() {
      try {
        const [{ doc, onSnapshot }, { db }] = await Promise.all([
          import("firebase/firestore"),
          import("@/lib/firebase-data"),
        ]);
        if (cancelled) {
          return;
        }

        unsubscribe = onSnapshot(
          doc(db, DROP_RUNTIME_COLLECTION, DROP_RUNTIME_DOC_ID),
          () => {
            if (!sawInitialSnapshot) {
              sawInitialSnapshot = true;
              return;
            }

            refreshDrops(isConstrained ? 6_000 : 1_500);
          },
          (error) => {
            console.error("Failed to subscribe to drop runtime updates", error);
            recordClientDiagnostic("realtime", "Drop runtime subscription failed", {
              message: error.message,
            });
          },
        );
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to initialize drop runtime subscription", error);
          recordClientDiagnostic("firebase", "Drop runtime setup failed", {
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    void subscribeToDropRuntime();

    return () => {
      cancelled = true;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [isConstrained, refreshDrops]);

  useEffect(() => {
    // Optimization: Single-pass for...of loop avoids O(3N) mapping/filtering and
    // unnecessary intermediate array allocations, reducing garbage collection load.
    const upcomingExpirations: number[] = [];
    for (const drop of swrDrops) {
      const dropWithStatus = applyDropStatus(drop, sweepNowMs);
      if (dropWithStatus.status === "active" && dropWithStatus.validUntil && dropWithStatus.validUntil > sweepNowMs) {
        upcomingExpirations.push(dropWithStatus.validUntil);
      }
    }

    if (upcomingExpirations.length === 0) {
      return;
    }

    const nextExpiryMs = Math.min(...upcomingExpirations);
    const timeoutMs = Math.max(250, nextExpiryMs - Date.now() + EXPIRY_REFRESH_BUFFER_MS);
    const timeoutId = window.setTimeout(() => {
      refreshDrops(0);
    }, timeoutMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [refreshDrops, sweepNowMs, swrDrops]);

  const clientDrops = useMemo(() => {
    // Optimization: Single-pass for...of loop prevents O(2N) mapping/filtering and
    // intermediate array allocations, improving render performance for large drop lists.
    const result: Drop[] = [];
    for (const drop of swrDrops) {
      const dropWithStatus = applyDropStatus(drop, sweepNowMs);
      if (!statusFilter || statusFilter.includes(dropWithStatus.status)) {
        result.push(dropWithStatus);
      }
    }
    return result;
  }, [statusFilter, sweepNowMs, swrDrops]);


  const isLoadingInitialData = !data && !error;
  const isLoadingMore =
    isLoadingInitialData ||
    (size > 0 && data && typeof data[size - 1] === "undefined");
  const isEmpty = data?.[0]?.drops?.length === 0;
  const isReachingEnd = isEmpty || (data && data[data.length - 1]?.nextCursor === null);

  return {
    drops: clientDrops,
    loading: isLoadingInitialData,
    error: error ? "Failed to load drops" : null,
    size,
    setSize,
    isLoadingMore,
    isReachingEnd,
    nowMs: sweepNowMs,
  };
}
