import type { AdminMetricSnapshot } from "@/lib/analytics/admin-metric-snapshot";
import type { AdminSurfaceState } from "@/lib/admin-parity";
import { getDisplaySnapshot } from "@/lib/cache/refresh-cache-contract";

export type AdminAnalyticsWaitingReason =
  | "snapshot_available"
  | "first_snapshot_pending"
  | "source_unavailable";

export function readAdminSnapshotNumberValue(
  snapshot: AdminMetricSnapshot | null | undefined,
  candidateKeys: readonly string[],
): number | null {
  const displaySnapshot = getDisplaySnapshot(snapshot);
  if (!displaySnapshot) {
    return null;
  }

  for (const key of candidateKeys) {
    const metric = displaySnapshot.values[key];
    if (!metric || metric.available !== true || metric.fakeZeroPrevented === true) {
      continue;
    }

    const value = metric.value;
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}

export function normalizeAdminSnapshotRatio(value: number | null): number | null {
  if (value === null) {
    return null;
  }

  return value > 1 ? value / 100 : value;
}

export function resolveAdminSnapshotSurfaceState(
  snapshot: AdminMetricSnapshot | null | undefined,
): AdminSurfaceState | null {
  const displaySnapshot = getDisplaySnapshot(snapshot);
  if (!displaySnapshot) {
    return null;
  }

  if (displaySnapshot.truthState === "verified") {
    return "cached";
  }

  if (displaySnapshot.truthState === "stale") {
    return "cached";
  }

  if (displaySnapshot.truthState === "partial" || displaySnapshot.sourceMode === "mixed") {
    return "degraded";
  }

  if (displaySnapshot.truthState === "failed" || displaySnapshot.sourceMode === "fallback") {
    return "fallback";
  }

  return null;
}

export function resolveAdminAnalyticsWaitingCopy(input: {
  hasVerifiedValue: boolean;
  loading: boolean;
  error?: string | null;
}): { label: string | null; reason: AdminAnalyticsWaitingReason; allowed: boolean } {
  if (input.hasVerifiedValue) {
    return {
      label: null,
      reason: "snapshot_available",
      allowed: false,
    };
  }

  if (input.loading) {
    return {
      label: "Waiting for first snapshot",
      reason: "first_snapshot_pending",
      allowed: true,
    };
  }

  return {
    label: input.error ? "Source unavailable" : "No verified snapshot yet",
    reason: "source_unavailable",
    allowed: true,
  };
}
