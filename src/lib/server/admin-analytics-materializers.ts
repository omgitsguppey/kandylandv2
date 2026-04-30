import "server-only";

import {
  type AdminMetricSnapshot,
  type AdminMetricSnapshotRange,
  ADMIN_METRIC_SNAPSHOT_RANGES,
  createUnavailableAdminMetricSnapshot,
} from "@/lib/analytics/admin-metric-snapshot";

export const ADMIN_ANALYTICS_SNAPSHOT_MODULE_KEYS = [
  "platform_pulse",
  "audience_snapshot",
  "commerce_snapshot",
  "live_pulse",
  "journey_funnel",
  "auth_outcomes",
  "onboarding_performance",
  "daily_task_pipeline",
  "notification_funnel",
  "event_mix",
  "live_interaction_stream",
  "data_health_summary",
] as const;

export type AdminAnalyticsSnapshotModuleKey = (typeof ADMIN_ANALYTICS_SNAPSHOT_MODULE_KEYS)[number];
export type AdminAnalyticsMaterializerStatus =
  | "ready"
  | "existing_route_cache"
  | "placeholder_unavailable"
  | "deprecated_debug_only";

export interface AdminAnalyticsMaterializerContext {
  moduleKey: AdminAnalyticsSnapshotModuleKey;
  rangeKey: AdminMetricSnapshotRange;
  force: boolean;
  requestedBy: string;
}

export interface AdminAnalyticsMaterializerEntry {
  moduleKey: AdminAnalyticsSnapshotModuleKey;
  label: string;
  supportedRanges: AdminMetricSnapshotRange[];
  canonicalSources: string[];
  parityChecksRequired: string[];
  legacySupportStatus: "none" | "directional" | "supported" | "debug_only";
  currentImplementationStatus: AdminAnalyticsMaterializerStatus;
  refresh: (context: AdminAnalyticsMaterializerContext) => Promise<AdminMetricSnapshot>;
}

function unavailableRefresh(reason: string) {
  return async (context: AdminAnalyticsMaterializerContext) =>
    createUnavailableAdminMetricSnapshot({
      moduleKey: context.moduleKey,
      rangeKey: context.rangeKey,
      reason,
      sourceBreakdown: {
        materializerStatus: "placeholder_unavailable",
        reason,
        force: context.force,
        requestedBy: context.requestedBy,
      },
    });
}

function buildEntry(input: Omit<AdminAnalyticsMaterializerEntry, "supportedRanges" | "refresh"> & {
  supportedRanges?: AdminMetricSnapshotRange[];
  unavailableReason: string;
}): AdminAnalyticsMaterializerEntry {
  return {
    ...input,
    supportedRanges: input.supportedRanges ?? [...ADMIN_METRIC_SNAPSHOT_RANGES],
    refresh: unavailableRefresh(input.unavailableReason),
  };
}

export const ADMIN_ANALYTICS_MATERIALIZER_REGISTRY: AdminAnalyticsMaterializerEntry[] = [
  buildEntry({
    moduleKey: "platform_pulse",
    label: "Platform Pulse",
    canonicalSources: ["analytics_aggregate_stats/realtime_summary", "analytics_event_facts", "analytics_active_users"],
    parityChecksRequired: ["hot cache vs first-party ledger", "realtime cache freshness"],
    legacySupportStatus: "directional",
    currentImplementationStatus: "existing_route_cache",
    unavailableReason: "Platform Pulse still uses the existing realtime hot summary route; canonical per-range snapshot materializer is not promoted yet.",
  }),
  buildEntry({
    moduleKey: "audience_snapshot",
    label: "Audience Snapshot",
    canonicalSources: ["analytics_page_daily", "analytics_guest_batches", "analytics_sessions", "analytics_event_facts", "ga4_daily"],
    parityChecksRequired: ["guest estimate formula", "identified traffic subtraction", "GA4 daily parity"],
    legacySupportStatus: "directional",
    currentImplementationStatus: "placeholder_unavailable",
    unavailableReason: "Audience Snapshot source normalizer exists, but a verified persisted snapshot materializer is not wired in Phase 3.",
  }),
  buildEntry({
    moduleKey: "commerce_snapshot",
    label: "Commerce Snapshot",
    canonicalSources: ["transactions", "analytics_commerce_rollup", "paypal captures", "analytics_event_facts"],
    parityChecksRequired: ["payments vs internal purchases", "promo excluded from revenue", "GA commerce drift"],
    legacySupportStatus: "supported",
    currentImplementationStatus: "placeholder_unavailable",
    unavailableReason: "Commerce Snapshot requires payment/internal parity before a verified snapshot can be written.",
  }),
  buildEntry({
    moduleKey: "live_pulse",
    label: "Live Pulse",
    canonicalSources: ["analytics_active_users", "analytics_event_facts", "analytics_guest_batches", "watch sessions"],
    parityChecksRequired: ["presence rows vs graph points", "guest inclusion", "stale row count"],
    legacySupportStatus: "directional",
    currentImplementationStatus: "existing_route_cache",
    unavailableReason: "Live Pulse currently depends on the realtime route hot summary; per-module snapshot promotion is pending.",
  }),
  buildEntry({
    moduleKey: "journey_funnel",
    label: "Journey Funnel",
    canonicalSources: ["analytics_event_facts", "onboarding state", "commerce events"],
    parityChecksRequired: ["raw event vs ordered journey", "non-sequential step detection"],
    legacySupportStatus: "directional",
    currentImplementationStatus: "placeholder_unavailable",
    unavailableReason: "Journey Funnel needs count-mode verification before snapshot values can be marked verified.",
  }),
  buildEntry({
    moduleKey: "auth_outcomes",
    label: "Auth Outcomes",
    canonicalSources: ["analytics_event_facts", "auth records", "user records"],
    parityChecksRequired: ["attempt reconciliation", "registered users not method", "timing coverage"],
    legacySupportStatus: "directional",
    currentImplementationStatus: "placeholder_unavailable",
    unavailableReason: "Auth Outcomes requires method/source reconciliation before verified snapshots are promoted.",
  }),
  buildEntry({
    moduleKey: "onboarding_performance",
    label: "Onboarding Performance",
    canonicalSources: ["onboarding step state", "analytics_event_facts"],
    parityChecksRequired: ["starts vs completions", "duration bucket reconciliation", "auth signup mismatch"],
    legacySupportStatus: "supported",
    currentImplementationStatus: "placeholder_unavailable",
    unavailableReason: "Onboarding Performance has a consolidated model but no persisted snapshot writer yet.",
  }),
  buildEntry({
    moduleKey: "daily_task_pipeline",
    label: "Daily Task Pipeline",
    canonicalSources: ["user task state", "daily_task_events", "task lifecycle logs", "task catalog"],
    parityChecksRequired: ["pipeline totals vs leaderboard", "reward reconciliation", "timing coverage"],
    legacySupportStatus: "supported",
    currentImplementationStatus: "placeholder_unavailable",
    unavailableReason: "Daily Task Pipeline needs task-state parity before writing verified snapshots.",
  }),
  buildEntry({
    moduleKey: "notification_funnel",
    label: "Notification Funnel",
    canonicalSources: ["user_notifications", "push/runtime logs", "analytics_event_facts"],
    parityChecksRequired: ["dedupe prevented", "read persistence", "queued drop return-live trigger"],
    legacySupportStatus: "directional",
    currentImplementationStatus: "placeholder_unavailable",
    unavailableReason: "Notification Funnel requires notification pipeline parity before verified snapshots are promoted.",
  }),
  buildEntry({
    moduleKey: "event_mix",
    label: "Event Mix",
    canonicalSources: ["analytics_event_facts", "telemetry catalog", "GA4 daily"],
    parityChecksRequired: ["raw event denominator", "surface mapping hydration", "unmapped events"],
    legacySupportStatus: "directional",
    currentImplementationStatus: "placeholder_unavailable",
    unavailableReason: "Event Mix needs event-to-surface mapping parity before verified snapshots are promoted.",
  }),
  buildEntry({
    moduleKey: "live_interaction_stream",
    label: "Live Interaction Stream",
    supportedRanges: ["24h"],
    canonicalSources: ["analytics_event_facts", "guest interaction buckets"],
    parityChecksRequired: ["admin exclusion", "actor classification", "duplicate task grouping"],
    legacySupportStatus: "none",
    currentImplementationStatus: "placeholder_unavailable",
    unavailableReason: "Live Interaction Stream is intentionally realtime-adjacent and needs row-level admin exclusion parity before snapshot promotion.",
  }),
  buildEntry({
    moduleKey: "data_health_summary",
    label: "Data Health Summary",
    canonicalSources: ["Admin Debug validation", "analytics source health", "parity checks"],
    parityChecksRequired: ["PASS rules", "stale validation", "module coverage"],
    legacySupportStatus: "debug_only",
    currentImplementationStatus: "deprecated_debug_only",
    unavailableReason: "Data validation belongs in Admin Debug; Analytics may only consume a compact health summary after Debug emits one.",
  }),
];

export const ADMIN_ANALYTICS_MATERIALIZER_BY_KEY = Object.fromEntries(
  ADMIN_ANALYTICS_MATERIALIZER_REGISTRY.map((entry) => [entry.moduleKey, entry]),
) as Record<AdminAnalyticsSnapshotModuleKey, AdminAnalyticsMaterializerEntry>;

export function isAdminAnalyticsSnapshotModuleKey(value: string): value is AdminAnalyticsSnapshotModuleKey {
  return ADMIN_ANALYTICS_SNAPSHOT_MODULE_KEYS.includes(value as AdminAnalyticsSnapshotModuleKey);
}

export function getAdminAnalyticsMaterializer(moduleKey: string) {
  return isAdminAnalyticsSnapshotModuleKey(moduleKey) ? ADMIN_ANALYTICS_MATERIALIZER_BY_KEY[moduleKey] : null;
}

export async function materializeAdminAnalyticsSnapshot(context: AdminAnalyticsMaterializerContext) {
  const materializer = getAdminAnalyticsMaterializer(context.moduleKey);
  if (!materializer) {
    return createUnavailableAdminMetricSnapshot({
      moduleKey: context.moduleKey,
      rangeKey: context.rangeKey,
      reason: `No admin analytics materializer is registered for ${context.moduleKey}.`,
    });
  }

  if (!materializer.supportedRanges.includes(context.rangeKey)) {
    return createUnavailableAdminMetricSnapshot({
      moduleKey: context.moduleKey,
      rangeKey: context.rangeKey,
      reason: `${materializer.label} does not support the ${context.rangeKey} snapshot range.`,
    });
  }

  return materializer.refresh(context);
}
