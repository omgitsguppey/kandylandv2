"use client";

import { useMemo } from "react";

import { useAuthSWR } from "@/hooks/useAuthSWR";
import { ADMIN_OVERVIEW_REALTIME_POLICY } from "@/lib/admin/admin-realtime-policy";
import type { AdminSurfaceState } from "@/lib/admin-parity";
import type { AdminOverviewRealtimeDebugMeta, AdminOverviewResponse } from "@/lib/admin-overview";

type OverviewRealtimeListenerState = {
  dropsLoaded: boolean;
  summaryLoaded: boolean;
  transactionsLoaded: boolean;
  adminActivityLoaded: boolean;
  dropsFailed: boolean;
  summaryFailed: boolean;
  transactionsFailed: boolean;
  adminActivityFailed: boolean;
  dropsFromCache: boolean;
  summaryFromCache: boolean;
  transactionsFromCache: boolean;
  adminActivityFromCache: boolean;
  lastServerConfirmedAt: number;
  lastClientSnapshotAt: number;
};

export function resolveTruthChipLabel(
  state: Pick<OverviewRealtimeListenerState,
    "dropsLoaded" | "summaryLoaded" | "transactionsLoaded" | "adminActivityLoaded" |
    "dropsFailed" | "summaryFailed" | "transactionsFailed" | "adminActivityFailed" |
    "dropsFromCache" | "summaryFromCache" | "transactionsFromCache" | "adminActivityFromCache"
  >,
  hasServerData: boolean,
): string {
  const failedCount = [state.dropsFailed, state.summaryFailed, state.transactionsFailed, state.adminActivityFailed].filter(Boolean).length;
  const anyLoaded = state.dropsLoaded || state.summaryLoaded || state.transactionsLoaded || state.adminActivityLoaded;
  const anyFromCache = state.dropsFromCache || state.summaryFromCache || state.transactionsFromCache || state.adminActivityFromCache;

  if (failedCount > 0) return "Live updates delayed";
  if (hasServerData && anyFromCache) return "Showing last verified data";
  if (hasServerData) return "Showing hourly hot-cache snapshot";
  if (anyLoaded) return "Connecting operational pulse";
  return "Waiting for first overview snapshot";
}

export function resolveTruthChipVariant(label: string): AdminSurfaceState {
  if (label === "Showing hourly hot-cache snapshot") return "live";
  if (label === "Showing last verified data") return "stale";
  if (label === "Connecting operational pulse") return "degraded";
  if (label === "Live updates delayed") return "fallback";
  return "unavailable";
}

const SNAPSHOT_READY_DEBUG_META: AdminOverviewRealtimeDebugMeta = {
  dropsFromCache: false,
  summaryFromCache: false,
  transactionsFromCache: false,
  adminActivityFromCache: false,
  lastServerConfirmedAt: 0,
  lastClientSnapshotAt: 0,
  pollingActive: false,
  pollingIntervalMs: ADMIN_OVERVIEW_REALTIME_POLICY.snapshotRefreshCadenceMs ?? 0,
  legacyDataMapped: false,
  metricScope: ADMIN_OVERVIEW_REALTIME_POLICY.metricScope,
  purpose: ADMIN_OVERVIEW_REALTIME_POLICY.purpose,
  owner: ADMIN_OVERVIEW_REALTIME_POLICY.owner,
  costRisk: ADMIN_OVERVIEW_REALTIME_POLICY.costRisk,
  businessTruthSource: ADMIN_OVERVIEW_REALTIME_POLICY.businessTruthSource,
};

export function useAdminOverviewRealtime(options: { enabled?: boolean } = {}) {
  const enabled = options.enabled !== false;
  const { data: serverData, error, isLoading, mutate } = useAuthSWR<AdminOverviewResponse>(
    enabled ? "/api/admin/overview" : null,
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: ADMIN_OVERVIEW_REALTIME_POLICY.snapshotRefreshCadenceMs,
    },
  );

  const data = useMemo(() => {
    if (!serverData) return undefined;

    return {
      ...serverData,
      truthNotes: {
        ...serverData.truthNotes,
        overview: serverData.truthNotes.overview || "Showing hourly hot-cache snapshot",
      },
      realtimeDebugMeta: {
        ...SNAPSHOT_READY_DEBUG_META,
        lastServerConfirmedAt: serverData.generatedAt,
        lastClientSnapshotAt: serverData.generatedAt,
      },
    } satisfies AdminOverviewResponse;
  }, [serverData]);

  return {
    data,
    error,
    isLoading: isLoading && !serverData,
    mutate,
  };
}
