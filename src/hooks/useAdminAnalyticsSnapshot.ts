"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type {
  AdminMetricSnapshot,
  AdminMetricSnapshotRange,
  AdminMetricSnapshotSourceMode,
  SnapshotRefreshStatus,
} from "@/lib/analytics/admin-metric-snapshot";
import { authFetch } from "@/lib/authFetch";

type SnapshotRouteResponse = {
  success: boolean;
  snapshot?: AdminMetricSnapshot | null;
  metadata?: Record<string, unknown> | null;
  refreshStatus?: SnapshotRefreshStatus;
  duplicateRefreshPrevented?: boolean;
  error?: string;
  warnings?: string[];
};

export interface UseAdminAnalyticsSnapshotOptions {
  moduleKey: string;
  rangeKey: AdminMetricSnapshotRange;
  refreshOnMount?: boolean;
}

export interface UseAdminAnalyticsSnapshotResult {
  snapshot: AdminMetricSnapshot | null;
  metadata: Record<string, unknown> | null;
  isLoading: boolean;
  error: string | null;
  firstSnapshotMs: number | null;
  refreshStatus: SnapshotRefreshStatus;
  sourceMode: AdminMetricSnapshotSourceMode;
  duplicateRefreshPrevented: boolean;
  refresh: (input?: { force?: boolean }) => Promise<SnapshotRouteResponse | null>;
}

function getClientPerformanceMs() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }

  return Date.now();
}

function buildSnapshotUrl(moduleKey: string, rangeKey: AdminMetricSnapshotRange) {
  const params = new URLSearchParams({
    moduleKey,
    rangeKey,
  });
  return `/api/admin/analytics/refresh?${params.toString()}`;
}

export function useAdminAnalyticsSnapshot(
  options: UseAdminAnalyticsSnapshotOptions,
): UseAdminAnalyticsSnapshotResult {
  const hydrationStartedAtRef = useRef(getClientPerformanceMs());
  const refreshOnMountStartedRef = useRef(false);
  const [snapshot, setSnapshot] = useState<AdminMetricSnapshot | null>(null);
  const [metadata, setMetadata] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [firstSnapshotMs, setFirstSnapshotMs] = useState<number | null>(null);
  const [refreshStatus, setRefreshStatus] = useState<SnapshotRefreshStatus>("idle");
  const [duplicateRefreshPrevented, setDuplicateRefreshPrevented] = useState(false);

  const markFirstSnapshot = useCallback(() => {
    setFirstSnapshotMs((current) =>
      current ?? Math.round(getClientPerformanceMs() - hydrationStartedAtRef.current),
    );
  }, []);

  const loadSnapshot = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authFetch(buildSnapshotUrl(options.moduleKey, options.rangeKey), {
        method: "GET",
      });
      const result = await response.json() as SnapshotRouteResponse;
      if (!response.ok || result.success !== true) {
        throw new Error(result.error || "Admin analytics snapshot load failed");
      }

      setSnapshot(result.snapshot ?? null);
      setMetadata(result.metadata ?? null);
      setRefreshStatus(result.refreshStatus ?? result.snapshot?.refreshStatus ?? "idle");
      setDuplicateRefreshPrevented(result.duplicateRefreshPrevented === true);
      if (result.snapshot) {
        markFirstSnapshot();
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Admin analytics snapshot load failed");
    } finally {
      setIsLoading(false);
    }
  }, [markFirstSnapshot, options.moduleKey, options.rangeKey]);

  const refresh = useCallback(async (input: { force?: boolean } = {}) => {
    setRefreshStatus("refreshing");
    setError(null);
    try {
      const response = await authFetch("/api/admin/analytics/refresh", {
        method: "POST",
        body: JSON.stringify({
          moduleKey: options.moduleKey,
          rangeKey: options.rangeKey,
          force: input.force === true,
        }),
      });
      const result = await response.json() as SnapshotRouteResponse;
      if (!response.ok && !result.snapshot) {
        throw new Error(result.error || "Admin analytics snapshot refresh failed");
      }

      setSnapshot((current) => result.snapshot ?? current);
      setMetadata(result.metadata ?? null);
      setRefreshStatus(result.refreshStatus ?? result.snapshot?.refreshStatus ?? (result.success ? "completed" : "failed"));
      setDuplicateRefreshPrevented(result.duplicateRefreshPrevented === true);
      if (result.snapshot) {
        markFirstSnapshot();
      }
      if (result.success !== true && result.error) {
        setError(result.error);
      }
      return result;
    } catch (refreshError) {
      const message = refreshError instanceof Error ? refreshError.message : "Admin analytics snapshot refresh failed";
      setError(message);
      setRefreshStatus("failed");
      return null;
    }
  }, [markFirstSnapshot, options.moduleKey, options.rangeKey]);

  useEffect(() => {
    void loadSnapshot();
  }, [loadSnapshot]);

  useEffect(() => {
    if (!options.refreshOnMount || refreshOnMountStartedRef.current) {
      return;
    }

    refreshOnMountStartedRef.current = true;
    void refresh({ force: false });
  }, [options.refreshOnMount, refresh]);

  return {
    snapshot,
    metadata,
    isLoading,
    error,
    firstSnapshotMs,
    refreshStatus,
    sourceMode: snapshot?.sourceMode ?? "unavailable",
    duplicateRefreshPrevented,
    refresh,
  };
}
