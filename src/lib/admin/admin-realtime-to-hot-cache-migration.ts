export type AdminRealtimeMigrationClassification =
  | "admin_hot_cache_required"
  | "realtime_allowed_user_chat"
  | "realtime_allowed_operator_live_debug"
  | "legacy_remove"
  | "manual_exception_required"
  | "unknown";

export type AdminRealtimeException = {
  owner: string;
  reason: string;
  maxQuerySize: number;
  detachBehavior: "cleanup_required";
  costRisk: "low" | "moderate" | "high";
  fallbackHotCachePath: string;
};

export type AdminRealtimeMigrationEntry = {
  surface: string;
  path: string;
  currentRealtimeRefs: number;
  classification: AdminRealtimeMigrationClassification;
  hotCacheSnapshotId?: string;
  exception?: AdminRealtimeException;
  nextAction: string;
};

export const ADMIN_REALTIME_TO_HOT_CACHE_MIGRATION: readonly AdminRealtimeMigrationEntry[] = [
  {
    surface: "admin_overview",
    path: "src/hooks/useAdminOverviewRealtime.ts",
    currentRealtimeRefs: 0,
    classification: "admin_hot_cache_required",
    hotCacheSnapshotId: "admin_overview_snapshot",
    nextAction: "Default overview data uses /api/admin/overview snapshot and hourly revalidation only.",
  },
  {
    surface: "admin_analytics",
    path: "src/app/admin/analytics/hooks/useAdminAnalyticsRealtime.ts",
    currentRealtimeRefs: 0,
    classification: "legacy_remove",
    hotCacheSnapshotId: "admin_analytics_snapshot",
    nextAction: "Retired the unused raw listener hook. Keep Admin Analytics on the snapshot-first route and use Admin Debug for explicit live evidence.",
  },
  {
    surface: "admin_debug",
    path: "src/app/admin/debug/hooks/useAdminDebugRealtime.ts",
    currentRealtimeRefs: 4,
    classification: "realtime_allowed_operator_live_debug",
    hotCacheSnapshotId: "admin_debug_snapshot",
    exception: {
      owner: "admin_debug",
      reason: "Operator live debug drilldown only; not default overview truth.",
      maxQuerySize: 25,
      detachBehavior: "cleanup_required",
      costRisk: "moderate",
      fallbackHotCachePath: "admin_debug_snapshot",
    },
    nextAction: "Retain only as an explicit live-debug exception and keep snapshot fallback visible.",
  },
  {
    surface: "admin_recent_transactions_panel",
    path: "src/components/Admin/RecentTransactionsPanel.tsx",
    currentRealtimeRefs: 1,
    classification: "manual_exception_required",
    hotCacheSnapshotId: "admin_overview_snapshot",
    nextAction: "Move compact overview feed to snapshot; keep any live feed behind explicit drilldown exception.",
  },
  {
    surface: "user_chat",
    path: "src/components/Chat/ChatExperience.tsx",
    currentRealtimeRefs: 2,
    classification: "realtime_allowed_user_chat",
    exception: {
      owner: "chat",
      reason: "User-facing messaging requires live delivery and presence.",
      maxQuerySize: 50,
      detachBehavior: "cleanup_required",
      costRisk: "moderate",
      fallbackHotCachePath: "not_applicable_user_chat",
    },
    nextAction: "Preserve user-facing chat realtime; this migration must not remove it.",
  },
];

export function validateAdminRealtimeMigrationEntries(entries = ADMIN_REALTIME_TO_HOT_CACHE_MIGRATION): string[] {
  const failures: string[] = [];
  for (const entry of entries) {
    if (entry.classification === "unknown") {
      failures.push(`${entry.surface} is unclassified.`);
    }
    if (entry.classification.includes("allowed") && !entry.exception) {
      failures.push(`${entry.surface} allows realtime without an exception contract.`);
    }
    if (entry.exception) {
      if (!entry.exception.owner || !entry.exception.reason || !entry.exception.fallbackHotCachePath) {
        failures.push(`${entry.surface} realtime exception is missing owner, reason, or fallback.`);
      }
      if (entry.exception.maxQuerySize <= 0) {
        failures.push(`${entry.surface} realtime exception has no max query size.`);
      }
      if (entry.exception.detachBehavior !== "cleanup_required") {
        failures.push(`${entry.surface} realtime exception must require cleanup detach.`);
      }
    }
  }
  return failures;
}
