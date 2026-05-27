import {
  PERSON_METRIC_DEFINITIONS,
  type PersonMetricDefinition,
  type PersonMetricId,
} from "@/lib/analytics/person-metrics-contract";
import { FEATURE_REGISTRATION_REGISTRY } from "@/lib/features/feature-registration-registry";
import { SURFACE_PARITY_REGISTRY } from "@/lib/parity/surface-parity-registry";
import { IMPORTANT_EVENT_LIVENESS_INPUTS } from "@/lib/analytics/event-liveness-engine";

import type { AdminAnalyticsPanelRegistryEntry } from "./panel-hydration-contract";

type PanelSeed = {
  panelId: string;
  panelLabel: string;
  panelGroup: AdminAnalyticsPanelRegistryEntry["panelGroup"];
  personMetricIds?: PersonMetricId[];
  sourceType?: AdminAnalyticsPanelRegistryEntry["sourceType"];
  expectedRecentWindow?: AdminAnalyticsPanelRegistryEntry["expectedRecentWindow"];
  sourcePath?: string;
  expectedSource?: string;
  materializerPath?: string | null;
  debugLane?: string;
  expectedDaily?: boolean;
  costClass?: AdminAnalyticsPanelRegistryEntry["costClass"];
  scoreImpact?: AdminAnalyticsPanelRegistryEntry["scoreImpact"];
};

const SAFE_SUMMARY_REDACTION =
  "safe summary only: no raw PII, provider IDs, private chat content, private media URLs, push tokens, storage paths, or access tokens";

const METRICS_BY_ID = new Map(PERSON_METRIC_DEFINITIONS.map((metric) => [metric.id, metric]));
const FEATURE_ROUTE_BY_EVENT = new Map(
  FEATURE_REGISTRATION_REGISTRY.flatMap((feature) =>
    feature.telemetryEvents.map((eventName) => [eventName, feature.routes[0]?.path ?? "src/lib/features/feature-registration-registry.ts"] as const),
  ),
);
const SURFACE_DEBUG_BY_FEATURE = new Map(
  SURFACE_PARITY_REGISTRY.map((surface) => [surface.featureId, surface.debugLane] as const),
);
const EVENT_LIVENESS_BY_NAME = new Map(IMPORTANT_EVENT_LIVENESS_INPUTS.map((event) => [event.eventName, event]));

const PANEL_SEEDS: PanelSeed[] = [
  { panelId: "traffic_overview", panelLabel: "Traffic overview", panelGroup: "traffic", personMetricIds: ["visits", "page_views"], sourceType: "admin_summary", sourcePath: "src/app/api/admin/analytics/historical/route.ts", materializerPath: "analytics_admin_metric_snapshots", debugLane: "admin_analytics_overview", expectedDaily: true },
  { panelId: "active_users", panelLabel: "Active users", panelGroup: "users", personMetricIds: ["sessions"], sourceType: "admin_summary", expectedRecentWindow: "1h", sourcePath: "src/app/api/admin/analytics/realtime/route.ts", materializerPath: "analytics_admin_metric_snapshots:realtime", debugLane: "runtime_debug_evidence", expectedDaily: true, scoreImpact: { runtimeHealth: 1, freshness: 1 } },
  { panelId: "new_users_signups", panelLabel: "New users/signups", panelGroup: "auth", personMetricIds: ["auth_runtime_events"], sourcePath: "src/lib/auth/auth-telemetry-contract.ts", debugLane: "auth_runtime", expectedDaily: true, scoreImpact: { runtimeHealth: 1, evidenceCompleteness: 1 } },
  { panelId: "returning_users", panelLabel: "Returning users", panelGroup: "users", personMetricIds: ["sessions", "active_days"], expectedDaily: true },
  { panelId: "guest_to_user_handoff", panelLabel: "Guest-to-user handoff", panelGroup: "users", personMetricIds: ["sessions", "auth_runtime_events"], sourceType: "global_metric", sourcePath: "src/lib/analytics/identity-handoff-engine.ts", debugLane: "identity_handoff", expectedDaily: true },
  { panelId: "creator_count", panelLabel: "Creator count", panelGroup: "creators", personMetricIds: ["settings_actions"], sourceType: "admin_summary", sourcePath: "src/lib/admin/user-management-contract.ts", materializerPath: "admin_user_truth_snapshot", debugLane: "user_management" },
  { panelId: "creator_profile_views", panelLabel: "Creator profile views", panelGroup: "creators", personMetricIds: ["creator_profile_views"], expectedDaily: true },
  { panelId: "creator_follows", panelLabel: "Creator follows", panelGroup: "creators", personMetricIds: ["follows"], expectedRecentWindow: "7d", sourcePath: "src/lib/discovery/creator-relationship-telemetry.ts", debugLane: "creator_relationships" },
  { panelId: "drops_live", panelLabel: "Drops live", panelGroup: "drops", personMetricIds: ["creator_drop_manager_actions"], sourceType: "admin_summary", expectedRecentWindow: "7d", sourcePath: "src/app/api/admin/overview/route.ts", materializerPath: "admin_overview.platformPulse", debugLane: "admin_overview" },
  { panelId: "drop_opens", panelLabel: "Drop opens", panelGroup: "drops", personMetricIds: ["drop_opens"], expectedDaily: true },
  { panelId: "unlocks", panelLabel: "Unlocks", panelGroup: "unlocks", personMetricIds: ["drop_unlocks"], sourceType: "ledger_summary", sourcePath: "src/app/api/drops/unlock/route.ts", debugLane: "drop_watch_time", scoreImpact: { runtimeHealth: 1, evidenceCompleteness: 2 } },
  { panelId: "unwraps", panelLabel: "Unwraps", panelGroup: "unlocks", personMetricIds: ["unwraps"], sourceType: "event_fact", debugLane: "drop_watch_time", scoreImpact: { runtimeHealth: 1, evidenceCompleteness: 2 } },
  { panelId: "watch_time", panelLabel: "Watch time", panelGroup: "watch", personMetricIds: ["runtime_watch_sessions"], sourceType: "journey_summary", sourcePath: "src/lib/analytics/drop-watch-time-contract.ts", debugLane: "drop_watch_time", scoreImpact: { runtimeHealth: 2, evidenceCompleteness: 1 } },
  { panelId: "completion_rate", panelLabel: "Completion rate", panelGroup: "watch", personMetricIds: ["runtime_watch_sessions"], sourceType: "journey_summary", sourcePath: "src/lib/math/drop-watch-unlock-math.ts", debugLane: "drop_watch_time", scoreImpact: { runtimeHealth: 2 } },
  { panelId: "wallet_opens", panelLabel: "Wallet opens", panelGroup: "wallet", personMetricIds: ["wallet_opens"], expectedDaily: true },
  { panelId: "package_selections", panelLabel: "Package selections", panelGroup: "wallet", personMetricIds: ["package_selections"] },
  { panelId: "checkout_starts", panelLabel: "Checkout starts", panelGroup: "payments", personMetricIds: ["checkout_starts"] },
  { panelId: "payment_approvals", panelLabel: "Payment approvals", panelGroup: "payments", personMetricIds: ["payment_approvals"], sourceType: "external_required", costClass: "external_review", scoreImpact: { runtimeHealth: 1, evidenceCompleteness: 2 } },
  { panelId: "payment_failures", panelLabel: "Payment failures", panelGroup: "payments", personMetricIds: ["payment_failures"], sourceType: "external_required", costClass: "external_review" },
  { panelId: "gumdrop_balances", panelLabel: "GumDrop balances", panelGroup: "gumdrops", personMetricIds: ["payment_approvals", "daily_task_rewards_granted"], sourceType: "ledger_summary", sourcePath: "src/lib/math/gumdrop-ledger-math.ts", materializerPath: "wallet_source_ledger", debugLane: "daily_task_reward_ledger", expectedDaily: true },
  { panelId: "reward_gd_grants", panelLabel: "Reward GD grants", panelGroup: "gumdrops", personMetricIds: ["daily_task_rewards_granted"], sourceType: "ledger_summary", sourcePath: "src/lib/tasks/daily-task-reward-ledger.ts", debugLane: "daily_task_reward_ledger", expectedDaily: true },
  { panelId: "task_starts", panelLabel: "Task starts", panelGroup: "tasks", personMetricIds: ["daily_task_starts"], sourcePath: "src/lib/tasks/daily-task-telemetry.ts", debugLane: "daily_task_lifecycle", expectedDaily: true },
  { panelId: "task_completions", panelLabel: "Task completions", panelGroup: "tasks", personMetricIds: ["daily_task_completions"], sourcePath: "src/lib/tasks/daily-task-telemetry.ts", debugLane: "daily_task_lifecycle", expectedDaily: true },
  { panelId: "task_rewards", panelLabel: "Task rewards", panelGroup: "tasks", personMetricIds: ["daily_task_rewards_granted"], sourceType: "ledger_summary", sourcePath: "src/lib/tasks/daily-task-reward-ledger.ts", debugLane: "daily_task_reward_ledger", expectedDaily: true },
  { panelId: "chat_opens", panelLabel: "Chat opens", panelGroup: "chat", personMetricIds: ["chat_actions"], sourcePath: "src/lib/chat/chat-telemetry-contract.ts", debugLane: "chat_telemetry_admin_truth", expectedDaily: true },
  { panelId: "chat_messages", panelLabel: "Chat messages", panelGroup: "chat", personMetricIds: ["chat_actions"], sourcePath: "src/lib/chat/chat-telemetry-contract.ts", debugLane: "chat_telemetry_admin_truth", expectedDaily: true },
  { panelId: "chat_blocks_errors", panelLabel: "Chat blocks/errors", panelGroup: "chat", personMetricIds: ["chat_actions"], sourceType: "debug_runtime_evidence", sourcePath: "src/lib/chat/chat-gating-contract.ts", debugLane: "chat_gating_moderation" },
  { panelId: "notification_prompts", panelLabel: "Notification prompts", panelGroup: "notifications", personMetricIds: ["notification_interactions"], sourcePath: "src/lib/notifications/notification-permission-contract.ts", debugLane: "notification_permission", expectedDaily: true },
  { panelId: "notification_tokens", panelLabel: "Notification tokens", panelGroup: "notifications", personMetricIds: ["notification_interactions"], sourceType: "debug_runtime_evidence", sourcePath: "src/lib/notifications/push-token-contract.ts", debugLane: "push_token_health" },
  { panelId: "notification_intents", panelLabel: "Notification intents", panelGroup: "notifications", personMetricIds: ["notification_interactions"], sourceType: "debug_runtime_evidence", sourcePath: "src/lib/notifications/notification-intent-contract.ts", debugLane: "notification_targeting" },
  { panelId: "auth_attempts_failures", panelLabel: "Auth attempts/failures", panelGroup: "auth", personMetricIds: ["auth_runtime_events"], sourcePath: "src/lib/auth/auth-telemetry-contract.ts", debugLane: "auth_runtime", expectedDaily: true },
  { panelId: "session_restores", panelLabel: "Session restores", panelGroup: "auth", personMetricIds: ["auth_runtime_events", "sessions"], sourcePath: "src/lib/auth/auth-session-stability.ts", debugLane: "auth_persistence", expectedDaily: true },
  { panelId: "media_uploads_access_blocks", panelLabel: "Media uploads/access blocks", panelGroup: "media", personMetricIds: ["chat_actions"], sourceType: "debug_runtime_evidence", sourcePath: "src/lib/media/media-upload-contract.ts", debugLane: "runtime_debug_evidence" },
  { panelId: "search_queries", panelLabel: "Search queries", panelGroup: "search", personMetricIds: ["search_discovery_actions"], expectedDaily: true },
  { panelId: "search_zero_results_clicks", panelLabel: "Search zero results/clicks", panelGroup: "search", personMetricIds: ["search_discovery_actions"] },
  { panelId: "support_account_actions", panelLabel: "Support/report issue/delete/data export", panelGroup: "support", personMetricIds: ["support_account_actions"] },
  { panelId: "error_rate_4xx", panelLabel: "Error rate/4xx", panelGroup: "errors", sourceType: "route_runtime_sample", expectedRecentWindow: "1h", sourcePath: "src/lib/server/route-runtime-health.ts", materializerPath: "route_runtime_health_summary", debugLane: "runtime_debug_evidence", costClass: "route_sample", expectedDaily: true, scoreImpact: { runtimeHealth: 2, costRisk: 1 } },
  { panelId: "cost_risk", panelLabel: "Cost risk", panelGroup: "cost", sourceType: "external_required", expectedSource: "cost guard summaries plus external billing review", expectedRecentWindow: "24h", sourcePath: "src/lib/math/cost-export-parity-math.ts", materializerPath: "cost_guard_summary", debugLane: "cost_4xx", costClass: "external_review", expectedDaily: true, scoreImpact: { costRisk: 4 } },
  { panelId: "journey_funnel", panelLabel: "Journey funnel", panelGroup: "journeys", personMetricIds: ["sessions", "drop_opens", "checkout_starts", "payment_approvals"], sourceType: "journey_summary", sourcePath: "src/lib/admin-analytics-journey-funnel.ts", materializerPath: "user_journey_summary", debugLane: "user_journey", expectedDaily: true },
  { panelId: "realtime_health", panelLabel: "Realtime health", panelGroup: "realtime", personMetricIds: ["sessions", "page_views"], sourceType: "route_runtime_sample", expectedRecentWindow: "1h", sourcePath: "src/app/api/admin/analytics/realtime/route.ts", materializerPath: "analytics_admin_metric_snapshots:realtime", debugLane: "runtime_debug_evidence", costClass: "route_sample", expectedDaily: true, scoreImpact: { runtimeHealth: 1, freshness: 2 } },
  { panelId: "debug_backlog", panelLabel: "Debug backlog", panelGroup: "errors", sourceType: "debug_runtime_evidence", expectedSource: "debug backlog summary", sourcePath: "src/lib/debug/debug-backlog-builder.ts", materializerPath: "debug_backlog_summary", debugLane: "open_p1_p2_backlog", costClass: "debug_only", expectedDaily: true, scoreImpact: { regressionRisk: 1 } },
];

function firstMetric(ids: readonly PersonMetricId[]): PersonMetricDefinition | null {
  return ids.map((id) => METRICS_BY_ID.get(id)).find(Boolean) ?? null;
}

function sourcePathFor(metrics: readonly PersonMetricDefinition[], fallback: string) {
  const event = metrics.flatMap((metric) => metric.eventNames).find((name) => FEATURE_ROUTE_BY_EVENT.has(name));
  return event ? FEATURE_ROUTE_BY_EVENT.get(event) ?? fallback : fallback;
}

export function derivePanelFromPersonMetric(seed: PanelSeed): AdminAnalyticsPanelRegistryEntry {
  const personMetricIds = seed.personMetricIds ?? [];
  const metrics = personMetricIds.map((id) => METRICS_BY_ID.get(id)).filter((metric): metric is PersonMetricDefinition => Boolean(metric));
  const primary = firstMetric(personMetricIds);
  const expectedEvents = [...new Set(metrics.flatMap((metric) => metric.eventNames))];
  const expectedRecentWindow = seed.expectedRecentWindow
    ?? expectedEvents.map((eventName) => EVENT_LIVENESS_BY_NAME.get(eventName)?.expectedRecentWindow).find(Boolean)
    ?? (seed.expectedDaily ? "24h" : "7d");
  const featureDebugLane = expectedEvents
    .map((eventName) => FEATURE_REGISTRATION_REGISTRY.find((feature) => feature.telemetryEvents.includes(eventName))?.featureId)
    .map((featureId) => featureId ? SURFACE_DEBUG_BY_FEATURE.get(featureId) : null)
    .find(Boolean);

  return {
    panelId: seed.panelId,
    panelLabel: seed.panelLabel,
    panelGroup: seed.panelGroup,
    sourceType: seed.sourceType ?? "person_metric",
    expectedSource: seed.expectedSource ?? primary?.sourceOfTruth ?? "admin debug summary",
    expectedEvents,
    personMetricIds,
    expectedRecentWindow,
    sourcePath: seed.sourcePath ?? sourcePathFor(metrics, "src/lib/analytics/person-metrics-contract.ts"),
    materializerPath: seed.materializerPath ?? (primary?.materializer ?? null),
    debugLane: seed.debugLane ?? primary?.debugOwner ?? featureDebugLane ?? "person_metrics_hydration",
    scoreImpact: seed.scoreImpact ?? { evidenceCompleteness: 1, freshness: 1 },
    costClass: seed.costClass ?? (seed.sourceType === "external_required" ? "external_review" : "summary_first"),
    fallbackDisplayState: seed.sourceType === "external_required" ? "show_external_required" : "show_collecting",
    privacyRedactionRule: SAFE_SUMMARY_REDACTION,
    provenZeroRequiredForZero: true,
    expectedDaily: seed.expectedDaily ?? (expectedRecentWindow === "24h" || expectedRecentWindow === "1h"),
  };
}

export const ADMIN_ANALYTICS_PANEL_HYDRATION_REGISTRY: AdminAnalyticsPanelRegistryEntry[] =
  PANEL_SEEDS.map(derivePanelFromPersonMetric);

export function getAdminAnalyticsPanelRegistryEntry(panelId: string) {
  return ADMIN_ANALYTICS_PANEL_HYDRATION_REGISTRY.find((panel) => panel.panelId === panelId) ?? null;
}
