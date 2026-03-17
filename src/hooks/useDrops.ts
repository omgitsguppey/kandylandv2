"use client";

import { useState, useEffect, useMemo } from "react";
import useSWRInfinite from "swr/infinite";
import { Drop } from "@/types/db";
import { applyDropStatus } from "@/lib/drop-status";

const INITIAL_SWEEP_NOW = Date.now();
const DROPS_PAGE_SIZE = 12;
const DROPS_REFRESH_MS = 30_000;
const EXPIRY_REFRESH_BUFFER_MS = 1_000;

interface DropFeedPage {
  drops: Drop[];
  nextCursor: number | null;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || `HTTP error! status: ${res.status}`);
  }
  return json;
};

export function useDrops(
  statusFilter: Drop["status"][] | null = ["active", "scheduled"],
  initialData?: Drop[]
) {
  const [sweepNowMs, setSweepNowMs] = useState(INITIAL_SWEEP_NOW);

  const getKey = (pageIndex: number, previousPageData: DropFeedPage | null) => {
    if (previousPageData && !previousPageData.nextCursor) return null; // reached the end
    if (pageIndex === 0) return `/api/drops?limit=${DROPS_PAGE_SIZE}`;
    return `/api/drops?limit=${DROPS_PAGE_SIZE}&cursor=${previousPageData?.nextCursor}`;
  };

  const fallback = useMemo(() => {
    return initialData ? [{
      drops: initialData,
      nextCursor: initialData.length === DROPS_PAGE_SIZE ? initialData[initialData.length - 1].validFrom : null,
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
