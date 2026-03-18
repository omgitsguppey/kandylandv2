"use client";

import { useState, useEffect, useMemo } from "react";
import useSWRInfinite from "swr/infinite";
import { recordClientDiagnostic } from "@/lib/client-diagnostics";
import { Drop } from "@/types/db";
import { applyDropStatus } from "@/lib/drop-status";
import { DROP_RUNTIME_COLLECTION, DROP_RUNTIME_DOC_ID } from "@/lib/drop-runtime";

const INITIAL_SWEEP_NOW = Date.now();
const DROPS_PAGE_SIZE = 12;
const DROPS_REFRESH_MS = 30_000;
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
    refreshInterval: DROPS_REFRESH_MS,
    refreshWhenHidden: false,
  });

  const swrDrops: Drop[] = useMemo(() => {
    return data ? data.flatMap(page => page?.drops || []) : [];
  }, [data]);

  useEffect(() => {
    const syncDrops = () => {
      setSweepNowMs(Date.now());
      void mutate();
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
  }, [mutate]);

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

            setSweepNowMs(Date.now());
            void mutate();
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
  }, [mutate]);

  useEffect(() => {
    const upcomingExpirations = swrDrops
      .map((drop) => applyDropStatus(drop, sweepNowMs))
      .map((drop) => (drop.status === "active" && drop.validUntil && drop.validUntil > sweepNowMs ? drop.validUntil : null))
      .filter((validUntil): validUntil is number => typeof validUntil === "number");

    if (upcomingExpirations.length === 0) {
      return;
    }

    const nextExpiryMs = Math.min(...upcomingExpirations);
    const timeoutMs = Math.max(250, nextExpiryMs - Date.now() + EXPIRY_REFRESH_BUFFER_MS);
    const timeoutId = window.setTimeout(() => {
      setSweepNowMs(Date.now());
      void mutate();
    }, timeoutMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [mutate, sweepNowMs, swrDrops]);

  const clientDrops = useMemo(() => {
    return swrDrops
      .map((drop) => applyDropStatus(drop, sweepNowMs))
      .filter((drop) => (statusFilter ? statusFilter.includes(drop.status) : true));
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
