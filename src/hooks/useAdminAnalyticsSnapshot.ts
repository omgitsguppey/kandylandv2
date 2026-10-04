"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type {
  AdminMetricSnapshot,
  AdminMetricSnapshotRange,
  AdminMetricSnapshotSourceMode,
  SnapshotRefreshStatus,
} from "@/lib/analytics/admin-metric-snapshot";
import { validateAdminMetricSnapshot } from "@/lib/analytics/admin-metric-snapshot";
import { authFetch } from "@/lib/authFetch";
import { sanitizeErrorForUser } from "@/lib/errors/resolve-human-error";

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
  enabled?: boolean;
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

function getAdminAnalyticsSnapshotSafeErrorMessage(error: unknown, fallback: string) {
  const safeError = sanitizeErrorForUser(error, "admin_truth", "admin_truth_unavailable");
  return safeError.errorKey === "unknown_error" ? fallback : safeError.operatorMessage;
}

export function useAdminAnalyticsSnapshot(
  options: UseAdminAnalyticsSnapshotOptions,
): UseAdminAnalyticsSnapshotResult {
  const enabled = options.enabled !== false;
  const selectionKey = `${options.moduleKey}:${options.rangeKey}`;
  const selectionRef = useRef(selectionKey);
  const selectionVersionRef = useRef(0);
  const requestVersionRef = useRef(0);
  const controllersRef = useRef(new Set<AbortController>());
  const mountedRef = useRef(false);
  const hydrationStartedAtRef = useRef(getClientPerformanceMs());
  const [snapshot, setSnapshot] = useState<AdminMetricSnapshot | null>(null);
  const [metadata, setMetadata] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [firstSnapshotMs, setFirstSnapshotMs] = useState<number | null>(null);
  const [refreshStatus, setRefreshStatus] = useState<SnapshotRefreshStatus>("idle");
  const [duplicateRefreshPrevented, setDuplicateRefreshPrevented] = useState(false);

  const beginRequest = useCallback(() => {
    for (const previous of controllersRef.current) previous.abort();
    controllersRef.current.clear();
    const controller = new AbortController();
    controllersRef.current.add(controller);
    const selectionVersion = selectionVersionRef.current;
    const requestVersion = ++requestVersionRef.current;
    return {
      controller,
      isCurrent: () => mountedRef.current
        && !controller.signal.aborted
        && selectionRef.current === selectionKey
        && selectionVersionRef.current === selectionVersion
        && requestVersionRef.current === requestVersion,
      finish: () => controllersRef.current.delete(controller),
    };
  }, [selectionKey]);

  const validateResultSnapshot = useCallback((value: unknown): AdminMetricSnapshot | null => {
    if (value === null || value === undefined) return null;
    if (typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid analytics snapshot response");
    const candidate = value as AdminMetricSnapshot;
    if (candidate.moduleKey !== options.moduleKey || candidate.rangeKey !== options.rangeKey
      || !candidate.values || typeof candidate.values !== "object" || Array.isArray(candidate.values)
      || validateAdminMetricSnapshot(candidate).length > 0) {
      throw new Error("Analytics snapshot does not match the selected module and range");
    }
    return candidate;
  }, [options.moduleKey, options.rangeKey]);

  const markFirstSnapshot = useCallback(() => {
    setFirstSnapshotMs((current) =>
      current ?? Math.round(getClientPerformanceMs() - hydrationStartedAtRef.current),
    );
  }, []);

  const loadSnapshot = useCallback(async () => {
    if (!enabled) return;
    const request = beginRequest();
    setIsLoading(true);
    setError(null);
    try {
      const response = await authFetch(buildSnapshotUrl(options.moduleKey, options.rangeKey), {
        method: "GET",
        signal: request.controller.signal,
      });
      const result = await response.json() as SnapshotRouteResponse;
      if (!request.isCurrent()) return;
      if (!response.ok || result.success !== true) {
        throw new Error(result.error || "Admin analytics snapshot load failed");
      }

      const nextSnapshot = validateResultSnapshot(result.snapshot);
      setSnapshot(nextSnapshot);
      setMetadata(result.metadata ?? null);
      setRefreshStatus(result.refreshStatus ?? result.snapshot?.refreshStatus ?? "idle");
      setDuplicateRefreshPrevented(result.duplicateRefreshPrevented === true);
      if (nextSnapshot) {
        markFirstSnapshot();
      }
      return request;
    } catch (loadError) {
      if (!request.isCurrent()) return;
      setError(getAdminAnalyticsSnapshotSafeErrorMessage(loadError, "Admin analytics snapshot load failed"));
      setRefreshStatus("failed");
    } finally {
      if (request.isCurrent()) setIsLoading(false);
      request.finish();
    }
  }, [beginRequest, enabled, markFirstSnapshot, options.moduleKey, options.rangeKey, validateResultSnapshot]);

  const refresh = useCallback(async (input: { force?: boolean } = {}) => {
    if (!enabled || !mountedRef.current || selectionRef.current !== selectionKey) return null;
    const request = beginRequest();
    setRefreshStatus("refreshing");
    setError(null);
    try {
      const response = await authFetch("/api/admin/analytics/refresh", {
        method: "POST",
        signal: request.controller.signal,
        body: JSON.stringify({
          moduleKey: options.moduleKey,
          rangeKey: options.rangeKey,
          force: input.force === true,
        }),
      });
      const result = await response.json() as SnapshotRouteResponse;
      if (!request.isCurrent()) return null;
      if (!response.ok && !result.snapshot) {
        throw new Error(result.error || "Admin analytics snapshot refresh failed");
      }

      const nextSnapshot = validateResultSnapshot(result.snapshot);
      const completed = response.ok && result.success === true;
      const displaySnapshot = nextSnapshot?.lastVerifiedAt ? nextSnapshot : null;
      setSnapshot((current) => displaySnapshot ?? current);
      setMetadata(result.metadata ?? null);
      setRefreshStatus(completed ? result.refreshStatus ?? nextSnapshot?.refreshStatus ?? "completed" : "failed");
      setDuplicateRefreshPrevented(result.duplicateRefreshPrevented === true);
      if (displaySnapshot) {
        markFirstSnapshot();
      }
      if (!completed) {
        setError(getAdminAnalyticsSnapshotSafeErrorMessage(result.error, "Admin analytics snapshot refresh failed"));
      }
      return result;
    } catch (refreshError) {
      if (!request.isCurrent()) return null;
      const message = getAdminAnalyticsSnapshotSafeErrorMessage(refreshError, "Admin analytics snapshot refresh failed");
      setError(message);
      setRefreshStatus("failed");
      return null;
    } finally {
      if (request.isCurrent()) setIsLoading(false);
      request.finish();
    }
  }, [beginRequest, enabled, markFirstSnapshot, options.moduleKey, options.rangeKey, selectionKey, validateResultSnapshot]);

  useEffect(() => {
    mountedRef.current = enabled;
    selectionRef.current = selectionKey;
    const version = ++selectionVersionRef.current;
    hydrationStartedAtRef.current = getClientPerformanceMs();
    setSnapshot(null);
    setMetadata(null);
    setError(null);
    setFirstSnapshotMs(null);
    setRefreshStatus("idle");
    setDuplicateRefreshPrevented(false);
    setIsLoading(enabled);
    if (enabled) void loadSnapshot().then((initialRequest) => {
      if (options.refreshOnMount && initialRequest?.isCurrent()
        && mountedRef.current && selectionVersionRef.current === version) {
        void refresh({ force: false });
      }
    });
    return () => {
      mountedRef.current = false;
      selectionVersionRef.current += 1;
      for (const controller of controllersRef.current) controller.abort();
      controllersRef.current.clear();
    };
  }, [enabled, loadSnapshot, options.refreshOnMount, refresh, selectionKey]);

  const visibleSelection = enabled && selectionRef.current === selectionKey;

  return {
    snapshot: visibleSelection ? snapshot : null,
    metadata: visibleSelection ? metadata : null,
    isLoading: enabled && (visibleSelection ? isLoading : true),
    error: visibleSelection ? error : null,
    firstSnapshotMs: visibleSelection ? firstSnapshotMs : null,
    refreshStatus: visibleSelection ? refreshStatus : "idle",
    sourceMode: visibleSelection ? snapshot?.sourceMode ?? "unavailable" : "unavailable",
    duplicateRefreshPrevented: visibleSelection && duplicateRefreshPrevented,
    refresh,
  };
}
