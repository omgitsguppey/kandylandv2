import "server-only";

import {
  type AdminMetricSnapshot,
  type AdminMetricSnapshotRange,
  ADMIN_METRIC_SNAPSHOT_RANGES,
  createUnavailableAdminMetricSnapshot,
} from "@/lib/analytics/admin-metric-snapshot";
import {
  buildCanonicalMaterializerSourcePolicy,
  type MaterializerSourcePolicy,
} from "@/lib/materializers/materializer-source-policy";

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
  | "manual_refresh_only"
  | "debug_drilldown_only"
  | "retired_from_default_admin_analytics";

export const ADMIN_ANALYTICS_CANONICAL_DISPLAY_AUTHORITY = "analytics_admin_metric_snapshots";
export const ADMIN_ANALYTICS_RAW_SOURCE_USE_POLICY = "materializer_input_debug_evidence_only";
export const ADMIN_ANALYTICS_LEGACY_SUMMARY_USE_POLICY = "fallback_live_pulse_evidence_only";

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
  displayAuthority: typeof ADMIN_ANALYTICS_CANONICAL_DISPLAY_AUTHORITY;
  rawSourceUse: typeof ADMIN_ANALYTICS_RAW_SOURCE_USE_POLICY;
  legacySummaryUse: typeof ADMIN_ANALYTICS_LEGACY_SUMMARY_USE_POLICY | "not_applicable";
  costSimplificationRuntimeNote: string;
  sourcePolicy: MaterializerSourcePolicy;
  parityChecksRequired: string[];
  legacySupportStatus: "none" | "directional" | "supported" | "debug_only";
  currentImplementationStatus: AdminAnalyticsMaterializerStatus;
  defaultAdminAnalyticsCoverage: AdminAnalyticsMaterializerStatus;
  canRunDefaultRefresh: boolean;
  unavailableReason: string;
  refresh: (context: AdminAnalyticsMaterializerContext) => Promise<AdminMetricSnapshot>;
}

function unavailableRefresh(reason: string, status: AdminAnalyticsMaterializerStatus) {
  return async (context: AdminAnalyticsMaterializerContext) =>
    createUnavailableAdminMetricSnapshot({
      moduleKey: context.moduleKey,
      rangeKey: context.rangeKey,
      reason,
      sourceBreakdown: {
        materializerStatus: status,
        reason,
        force: context.force,
        requestedBy: context.requestedBy,
      },
    });
}

function buildEntry(input: Omit<
  AdminAnalyticsMaterializerEntry,
  | "supportedRanges"
  | "refresh"
  | "sourcePolicy"
  | "displayAuthority"
  | "rawSourceUse"
  | "legacySummaryUse"
  | "costSimplificationRuntimeNote"
  | "defaultAdminAnalyticsCoverage"
  | "canRunDefaultRefresh"
  | "unavailableReason"
> & {
  sourcePolicy?: MaterializerSourcePolicy;
  supportedRanges?: AdminMetricSnapshotRange[];
  unavailableReason: string;
}): AdminAnalyticsMaterializerEntry {
  return {
    ...input,
    displayAuthority: ADMIN_ANALYTICS_CANONICAL_DISPLAY_AUTHORITY,
    rawSourceUse: ADMIN_ANALYTICS_RAW_SOURCE_USE_POLICY,
    legacySummaryUse: input.canonicalSources.some((source) => source.includes("analytics_aggregate_stats/realtime_summary"))
      ? ADMIN_ANALYTICS_LEGACY_SUMMARY_USE_POLICY
      : "not_applicable",
    costSimplificationRuntimeNote:
      "Compact Admin Analytics display reads analytics_admin_metric_snapshots first; raw ledgers are materializer input or Debug evidence only.",
    sourcePolicy: input.sourcePolicy ?? buildCanonicalMaterializerSourcePolicy(),
    supportedRanges: input.supportedRanges ?? [...ADMIN_METRIC_SNAPSHOT_RANGES],
    defaultAdminAnalyticsCoverage: input.currentImplementationStatus,
    canRunDefaultRefresh: input.currentImplementationStatus === "ready",
    unavailableReason: input.unavailableReason,
    refresh: unavailableRefresh(input.unavailableReason, input.currentImplementationStatus),
  };
}

export const ADMIN_ANALYTICS_MATERIALIZER_REGISTRY: AdminAnalyticsMaterializerEntry[] = [
  buildEntry({
    moduleKey: "platform_pulse",
    label: "Platform Pulse",
    canonicalSources: ["analytics_aggregate_stats/realtime_summary", "analytics_event_facts", "analytics_active_users"],
    sourcePolicy: buildCanonicalMaterializerSourcePolicy({
      metricFacts: ["analytics_metric_facts", "analytics_active_users"],
      diagnostics: ["realtime_operational_pulse_only"],
    }),
    parityChecksRequired: ["hot cache vs first-party ledger", "realtime cache freshness"],
    legacySupportStatus: "directional",
    currentImplementationStatus: "existing_route_cache",
    unavailableReason: "Platform Pulse still uses the existing realtime hot summary route; canonical per-range snapshot materializer is not promoted yet.",
  }),
  buildEntry({
    moduleKey: "audience_snapshot",
    label: "Audience Snapshot",
    canonicalSources: ["analytics_page_daily", "analytics_guest_batches", "analytics_sessions", "analytics_event_facts", "ga4_daily"],
    sourcePolicy: buildCanonicalMaterializerSourcePolicy({
      metricFacts: ["analytics_metric_facts"],
      diagnostics: ["ga4_daily"],
    }),
    parityChecksRequired: ["guest estimate formula", "identified traffic subtraction", "GA4 daily parity"],
    legacySupportStatus: "directional",
    currentImplementationStatus: "manual_refresh_only",
    unavailableReason: "Audience Snapshot source normalizer exists, but a verified persisted snapshot materializer is not wired in Phase 3.",
  }),
  buildEntry({
    moduleKey: "commerce_snapshot",
    label: "Commerce Snapshot",
    canonicalSources: ["transactions", "analytics_commerce_rollup", "paypal captures", "analytics_event_facts"],
    sourcePolicy: buildCanonicalMaterializerSourcePolicy({
      metricFacts: ["transactions", "analytics_metric_facts"],
      diagnostics: ["paypal captures", "analytics_commerce_rollup"],
    }),
    parityChecksRequired: ["payments vs internal purchases", "promo excluded from revenue", "GA commerce drift"],
    legacySupportStatus: "supported",
    currentImplementationStatus: "manual_refresh_only",
    unavailableReason: "Commerce Snapshot requires payment/internal parity before a verified snapshot can be written.",
  }),
  buildEntry({
    moduleKey: "live_pulse",
    label: "Live Pulse",
    canonicalSources: ["analytics_active_users", "analytics_event_facts", "analytics_guest_batches", "watch sessions"],
    sourcePolicy: buildCanonicalMaterializerSourcePolicy({
      metricFacts: ["analytics_metric_facts", "analytics_watch_sessions"],
      diagnostics: ["analytics_active_users", "analytics_guest_batches"],
    }),
    parityChecksRequired: ["presence rows vs graph points", "guest inclusion", "stale row count"],
    legacySupportStatus: "directional",
    currentImplementationStatus: "existing_route_cache",
    unavailableReason: "Live Pulse currently depends on the realtime route hot summary; per-module snapshot promotion is pending.",
  }),
  buildEntry({
    moduleKey: "journey_funnel",
    label: "Journey Funnel",
    canonicalSources: ["analytics_event_facts", "onboarding state", "commerce events"],
    sourcePolicy: buildCanonicalMaterializerSourcePolicy({
      metricFacts: ["analytics_metric_facts"],
      diagnostics: ["onboarding state", "commerce events"],
    }),
    parityChecksRequired: ["raw event vs ordered journey", "non-sequential step detection"],
    legacySupportStatus: "directional",
    currentImplementationStatus: "manual_refresh_only",
    unavailableReason: "Journey Funnel needs count-mode verification before snapshot values can be marked verified.",
  }),
  buildEntry({
    moduleKey: "auth_outcomes",
    label: "Auth Outcomes",
    canonicalSources: ["analytics_event_facts", "auth records", "user records"],
    sourcePolicy: buildCanonicalMaterializerSourcePolicy({
      metricFacts: ["analytics_metric_facts"],
      diagnostics: ["auth records", "user records"],
    }),
    parityChecksRequired: ["attempt reconciliation", "registered users not method", "timing coverage"],
    legacySupportStatus: "directional",
    currentImplementationStatus: "manual_refresh_only",
    unavailableReason: "Auth Outcomes requires method/source reconciliation before verified snapshots are promoted.",
  }),
  buildEntry({
    moduleKey: "onboarding_performance",
    label: "Onboarding Performance",
    canonicalSources: ["onboarding step state", "analytics_event_facts"],
    sourcePolicy: buildCanonicalMaterializerSourcePolicy({
      metricFacts: ["analytics_metric_facts"],
      diagnostics: ["onboarding step state"],
    }),
    parityChecksRequired: ["starts vs completions", "duration bucket reconciliation", "auth signup mismatch"],
    legacySupportStatus: "supported",
    currentImplementationStatus: "manual_refresh_only",
    unavailableReason: "Onboarding Performance has a consolidated model but no persisted snapshot writer yet.",
  }),
  buildEntry({
    moduleKey: "daily_task_pipeline",
    label: "Daily Task Pipeline",
    canonicalSources: ["user task state", "daily_task_events", "task lifecycle logs", "task catalog"],
    sourcePolicy: buildCanonicalMaterializerSourcePolicy({
      metricFacts: ["analytics_metric_facts"],
      diagnostics: ["user task state", "daily_task_events", "task lifecycle logs", "task catalog"],
    }),
    parityChecksRequired: ["pipeline totals vs leaderboard", "reward reconciliation", "timing coverage"],
    legacySupportStatus: "supported",
    currentImplementationStatus: "manual_refresh_only",
    unavailableReason: "Daily Task Pipeline needs task-state parity before writing verified snapshots.",
  }),
  buildEntry({
    moduleKey: "notification_funnel",
    label: "Notification Funnel",
    canonicalSources: ["user_notifications", "push/runtime logs", "analytics_event_facts"],
    sourcePolicy: buildCanonicalMaterializerSourcePolicy({
      metricFacts: ["analytics_metric_facts"],
      diagnostics: ["user_notifications", "push/runtime logs"],
    }),
    parityChecksRequired: ["dedupe prevented", "read persistence", "queued drop return-live trigger"],
    legacySupportStatus: "directional",
    currentImplementationStatus: "manual_refresh_only",
    unavailableReason: "Notification Funnel requires notification pipeline parity before verified snapshots are promoted.",
  }),
  buildEntry({
    moduleKey: "event_mix",
    label: "Event Mix",
    canonicalSources: ["analytics_event_facts", "telemetry catalog", "GA4 daily"],
    sourcePolicy: buildCanonicalMaterializerSourcePolicy({
      metricFacts: ["analytics_metric_facts"],
      diagnostics: ["telemetry catalog", "GA4 daily"],
    }),
    parityChecksRequired: ["raw event denominator", "surface mapping hydration", "unmapped events"],
    legacySupportStatus: "directional",
    currentImplementationStatus: "manual_refresh_only",
    unavailableReason: "Event Mix needs event-to-surface mapping parity before verified snapshots are promoted.",
  }),
  buildEntry({
    moduleKey: "live_interaction_stream",
    label: "Live Interaction Stream",
    supportedRanges: ["24h"],
    canonicalSources: ["analytics_event_facts", "guest interaction buckets"],
    sourcePolicy: buildCanonicalMaterializerSourcePolicy({
      metricFacts: ["analytics_metric_facts"],
      diagnostics: ["guest interaction buckets"],
    }),
    parityChecksRequired: ["admin exclusion", "actor classification", "duplicate task grouping"],
    legacySupportStatus: "none",
    currentImplementationStatus: "debug_drilldown_only",
    unavailableReason: "Live Interaction Stream is intentionally realtime-adjacent and needs row-level admin exclusion parity before snapshot promotion.",
  }),
  buildEntry({
    moduleKey: "data_health_summary",
    label: "Data Health Summary",
    canonicalSources: ["Admin Debug validation", "analytics source health", "parity checks"],
    sourcePolicy: buildCanonicalMaterializerSourcePolicy({
      metricFacts: ["analytics_metric_facts"],
      diagnostics: ["Admin Debug validation", "analytics source health", "parity checks"],
    }),
    parityChecksRequired: ["PASS rules", "stale validation", "module coverage"],
    legacySupportStatus: "debug_only",
    currentImplementationStatus: "debug_drilldown_only",
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

export function canRunAdminAnalyticsDefaultRefresh(materializer: AdminAnalyticsMaterializerEntry) {
  return materializer.canRunDefaultRefresh;
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
