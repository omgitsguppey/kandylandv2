import type { AdminUserMetricsSnapshot, AdminUserMetricsSnapshotSource } from "@/lib/admin-user-metrics-contract";

export type AdminUserTruthSourceTruth =
  | "canonical"
  | "materialized"
  | "server"
  | "legacy_fallback"
  | "blocked";

export type AdminUserTruthFreshnessState =
  | "live"
  | "refreshing"
  | "stale"
  | "degraded"
  | "failed"
  | "unavailable"
  | "delayed"
  | "privacy_limited"
  | "legacy_fallback"
  | "blocked"
  | "review";

export type AdminUserTruthIssue = {
  code: string;
  severity: "info" | "warn" | "fail";
  message: string;
};

export type AdminUserTruthSourceBreakdown = {
  users: AdminUserTruthSourceTruth;
  watchTime: AdminUserTruthSourceTruth;
  purchases: AdminUserTruthSourceTruth;
  revenue: AdminUserTruthSourceTruth;
  unwraps: AdminUserTruthSourceTruth;
};

export type AdminUserTruthSnapshot = {
  totalUsers: number;
  activeUsers: number;
  returnedLast7Days: number;
  onboardedUsers: number;
  verifiedUsers: number;
  pushEnabledUsers: number;
  trackedUnwraps: number;
  verifiedPurchases: number;
  totalRevenueUsd: number;
  validWatchTimeMs: number;
  sourceFreshness: AdminUserTruthFreshnessState;
  generatedAt: number;
  sourceTruthBreakdown: AdminUserTruthSourceBreakdown;
  issues: AdminUserTruthIssue[];
  sourceTruth: AdminUserTruthSourceTruth;
  confidenceScore: number;
  sourceLabel: string;
  legacySource?: AdminUserMetricsSnapshotSource;
};

export type AdminUserTruthCard = {
  id:
    | "total_users"
    | "active_users"
    | "returned_7d"
    | "onboarded"
    | "verified"
    | "push_enabled"
    | "unwraps"
    | "purchases"
    | "watch_time"
    | "revenue";
  label: string;
  primaryValue: string | number;
  secondaryValue?: string;
  sourceTruth: AdminUserTruthSourceTruth;
  sourceFreshness: AdminUserTruthFreshnessState;
  explanation: string;
};

export function mapMetricsSnapshotSourceTruth(
  snapshot: AdminUserMetricsSnapshot,
): AdminUserTruthSourceBreakdown {
  const baseTruth: AdminUserTruthSourceTruth = snapshot.source === "live_fallback"
    ? "legacy_fallback"
    : snapshot.source === "materialized"
      ? "materialized"
      : "canonical";
  const purchaseTruth: AdminUserTruthSourceTruth = snapshot.source === "live_fallback"
    ? "legacy_fallback"
    : "canonical";
  const watchTruth: AdminUserTruthSourceTruth = snapshot.watchTimeSource === "legacy_page_duration"
    ? "legacy_fallback"
    : snapshot.watchTimeSource === "unavailable"
      ? "blocked"
      : "canonical";

  return {
    users: baseTruth,
    watchTime: watchTruth,
    purchases: purchaseTruth,
    revenue: purchaseTruth,
    unwraps: purchaseTruth,
  };
}

