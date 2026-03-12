"use client";

import { useState, useEffect, useMemo } from "react";
import useSWRInfinite from "swr/infinite";
import { Drop } from "@/types/db";

const INITIAL_SWEEP_NOW = Date.now();

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || `HTTP error! status: ${res.status}`);
  }
  return json;
};

export function useDrops(
  statusFilter: string[] | null = ["active", "scheduled"],
  initialData?: Drop[]
) {
  const [sweepNowMs, setSweepNowMs] = useState(INITIAL_SWEEP_NOW);

  // We only support the standard feed currently for pagination (active + scheduled)
  const getKey = (pageIndex: number, previousPageData: any) => {
    if (previousPageData && !previousPageData.nextCursor) return null; // reached the end
    if (pageIndex === 0) return `/api/drops?limit=12`;
    return `/api/drops?limit=12&cursor=${previousPageData.nextCursor}`;
  };

  const fallback = useMemo(() => {
    return initialData ? [{ drops: initialData, nextCursor: initialData.length === 12 ? initialData[11].validFrom : null }] : undefined;
  }, [initialData]);

  const { data, error, size, setSize, isValidating } = useSWRInfinite(getKey, fetcher, {
    fallbackData: fallback,
    revalidateFirstPage: false,
    revalidateOnFocus: false,
  });

  const swrDrops: Drop[] = useMemo(() => {
    return data ? data.flatMap(page => page?.drops || []) : [];
  }, [data]);

  // Handle client-side expiration out of the active set efficiently.
  useEffect(() => {
    const sweepExpired = () => {
      setSweepNowMs(Date.now());
    };

    // Sweep strictly on window focus or visibility transitions instead of continuous heavy polling
    window.addEventListener("focus", sweepExpired);
    document.addEventListener("visibilitychange", sweepExpired);

    return () => {
      window.removeEventListener("focus", sweepExpired);
      document.removeEventListener("visibilitychange", sweepExpired);
    };
  }, []);

  const clientDrops = useMemo(() => {
    return swrDrops.filter((drop) => {
      if (drop.status !== "active" || !drop.validUntil) {
        return true;
      }

      return sweepNowMs < drop.validUntil;
    });
  }, [sweepNowMs, swrDrops]);


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
    isReachingEnd
  };
}
