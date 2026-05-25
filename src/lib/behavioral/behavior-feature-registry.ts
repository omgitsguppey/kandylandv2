import type { TelemetryEventCategory, TelemetryEventFamily, TelemetryModuleKey } from "@/lib/telemetry-catalog";

export type BehaviorFeatureId =
  | "drops"
  | "creator_profile"
  | "creator_timeline"
  | "broadcasts"
  | "fan_pass"
  | "wallet"
  | "daily_checkin"
  | "library"
  | "creator_settings"
  | "creator_drop_manager"
  | "notifications"
  | "admin_debug"
  | "search_discovery"
  | "auth"
  | "security"
  | "support"
  | "viewer"
  | "general_engagement";

export type BehaviorDebugVisibility = "debug_visible" | "debug_admin_only";

export interface BehaviorFeatureRegistration {
  feature: BehaviorFeatureId;
  label: string;
  surface: string;
  owner: string;
  defaultPersistenceLane: string;
  defaultMaterializerLane: string;
  defaultAggregationLane: string;
  scoreEvidenceImpact: string;
  debugVisibility: BehaviorDebugVisibility;
  futureFeatureSafe: boolean;
}

export const REQUIRED_BEHAVIOR_FEATURE_IDS = [
  "drops",
  "creator_profile",
  "creator_timeline",
  "broadcasts",
  "fan_pass",
  "wallet",
  "daily_checkin",
  "library",
  "creator_settings",
  "creator_drop_manager",
  "notifications",
  "admin_debug",
  "search_discovery",
] as const satisfies readonly BehaviorFeatureId[];

export const BEHAVIOR_FEATURE_REGISTRY: BehaviorFeatureRegistration[] = [
  {
    feature: "drops",
    label: "Drops",
    surface: "drops",
    owner: "analytics/drop-behavior",
    defaultPersistenceLane: "analytics_event_facts",
    defaultMaterializerLane: "drop_behavior_materializer",
    defaultAggregationLane: "drop_interest_rollup",
    scoreEvidenceImpact: "evidenceCompleteness.runtimeHealth",
    debugVisibility: "debug_visible",
    futureFeatureSafe: true,
  },
  {
    feature: "creator_profile",
    label: "Creator profile",
    surface: "creator_profile",
    owner: "analytics/creator-profile",
    defaultPersistenceLane: "analytics_event_facts",
    defaultMaterializerLane: "creator_profile_materializer",
    defaultAggregationLane: "creator_interest_rollup",
    scoreEvidenceImpact: "evidenceCompleteness.sourceHealth",
    debugVisibility: "debug_visible",
    futureFeatureSafe: true,
  },
  {
    feature: "creator_timeline",
    label: "Creator timeline",
    surface: "creator_timeline",
    owner: "analytics/creator-timeline",
    defaultPersistenceLane: "analytics_event_facts",
    defaultMaterializerLane: "creator_timeline_materializer",
    defaultAggregationLane: "timeline_interaction_rollup",
    scoreEvidenceImpact: "evidenceCompleteness.sourceHealth",
    debugVisibility: "debug_visible",
    futureFeatureSafe: true,
  },
  {
    feature: "broadcasts",
    label: "Broadcasts",
    surface: "creator_broadcasts",
    owner: "analytics/broadcasts",
    defaultPersistenceLane: "analytics_event_facts",
    defaultMaterializerLane: "broadcast_materializer",
    defaultAggregationLane: "creator_action_rollup",
    scoreEvidenceImpact: "sourceHealth.evidenceCompleteness",
    debugVisibility: "debug_visible",
    futureFeatureSafe: true,
  },
  {
    feature: "fan_pass",
    label: "Fan Pass",
    surface: "creator_monetization",
    owner: "analytics/fan-pass",
    defaultPersistenceLane: "analytics_event_facts_plus_server_truth",
    defaultMaterializerLane: "fan_pass_materializer",
    defaultAggregationLane: "monetization_interest_rollup",
    scoreEvidenceImpact: "runtimeHealth.evidenceCompleteness",
    debugVisibility: "debug_visible",
    futureFeatureSafe: true,
  },
  {
    feature: "wallet",
    label: "Wallet",
    surface: "wallet",
    owner: "analytics/wallet-integrity",
    defaultPersistenceLane: "server_payment_truth_plus_analytics_event_facts",
    defaultMaterializerLane: "purchase_integrity_materializer",
    defaultAggregationLane: "monetization_truth_rollup",
    scoreEvidenceImpact: "runtimeHealth.evidenceCompleteness",
    debugVisibility: "debug_visible",
    futureFeatureSafe: true,
  },
  {
    feature: "daily_checkin",
    label: "Daily check-in",
    surface: "daily_checkin",
    owner: "analytics/retention",
    defaultPersistenceLane: "analytics_event_facts",
    defaultMaterializerLane: "retention_materializer",
    defaultAggregationLane: "retention_rollup",
    scoreEvidenceImpact: "evidenceCompleteness",
    debugVisibility: "debug_visible",
    futureFeatureSafe: true,
  },
  {
    feature: "library",
    label: "Library",
    surface: "library",
    owner: "analytics/library",
    defaultPersistenceLane: "analytics_event_facts",
    defaultMaterializerLane: "library_materializer",
    defaultAggregationLane: "library_engagement_rollup",
    scoreEvidenceImpact: "evidenceCompleteness",
    debugVisibility: "debug_visible",
    futureFeatureSafe: true,
  },
  {
    feature: "creator_settings",
    label: "Creator settings",
    surface: "creator_settings",
    owner: "analytics/creator-settings",
    defaultPersistenceLane: "analytics_event_facts",
    defaultMaterializerLane: "creator_settings_materializer",
    defaultAggregationLane: "creator_action_rollup",
    scoreEvidenceImpact: "sourceHealth.evidenceCompleteness",
    debugVisibility: "debug_visible",
    futureFeatureSafe: true,
  },
  {
    feature: "creator_drop_manager",
    label: "Creator drop manager",
    surface: "creator_drop_manager",
    owner: "analytics/creator-drop-manager",
    defaultPersistenceLane: "analytics_event_facts",
    defaultMaterializerLane: "creator_drop_manager_materializer",
    defaultAggregationLane: "creator_action_rollup",
    scoreEvidenceImpact: "sourceHealth.evidenceCompleteness",
    debugVisibility: "debug_visible",
    futureFeatureSafe: true,
  },
  {
    feature: "notifications",
    label: "Notifications",
    surface: "notifications",
    owner: "analytics/notifications",
    defaultPersistenceLane: "analytics_event_facts_plus_notification_truth",
    defaultMaterializerLane: "notification_materializer",
    defaultAggregationLane: "notification_engagement_rollup",
    scoreEvidenceImpact: "evidenceCompleteness.runtimeHealth",
    debugVisibility: "debug_visible",
    futureFeatureSafe: true,
  },
  {
    feature: "admin_debug",
    label: "Admin debug",
    surface: "admin_debug",
    owner: "analytics/admin-debug",
    defaultPersistenceLane: "admin_debug_evidence",
    defaultMaterializerLane: "admin_debug_materializer",
    defaultAggregationLane: "admin_evidence_rollup",
    scoreEvidenceImpact: "sourceHealth.evidenceCompleteness",
    debugVisibility: "debug_visible",
    futureFeatureSafe: true,
  },
  {
    feature: "search_discovery",
    label: "Search and discovery",
    surface: "search_discovery",
    owner: "analytics/search-discovery",
    defaultPersistenceLane: "analytics_event_facts",
    defaultMaterializerLane: "search_discovery_materializer",
    defaultAggregationLane: "discovery_interest_rollup",
    scoreEvidenceImpact: "evidenceCompleteness",
    debugVisibility: "debug_visible",
    futureFeatureSafe: true,
  },
  {
    feature: "auth",
    label: "Auth and identity",
    surface: "auth",
    owner: "analytics/identity",
    defaultPersistenceLane: "analytics_event_facts",
    defaultMaterializerLane: "identity_materializer",
    defaultAggregationLane: "identity_continuity_rollup",
    scoreEvidenceImpact: "runtimeHealth.evidenceCompleteness",
    debugVisibility: "debug_visible",
    futureFeatureSafe: true,
  },
  {
    feature: "security",
    label: "Security diagnostics",
    surface: "security",
    owner: "analytics/security",
    defaultPersistenceLane: "security_event_facts",
    defaultMaterializerLane: "security_diagnostics_materializer",
    defaultAggregationLane: "security_signal_rollup",
    scoreEvidenceImpact: "regressionRisk",
    debugVisibility: "debug_visible",
    futureFeatureSafe: true,
  },
  {
    feature: "support",
    label: "Support",
    surface: "support",
    owner: "analytics/support",
    defaultPersistenceLane: "analytics_event_facts_plus_support_truth",
    defaultMaterializerLane: "support_materializer",
    defaultAggregationLane: "support_action_rollup",
    scoreEvidenceImpact: "runtimeHealth.evidenceCompleteness",
    debugVisibility: "debug_visible",
    futureFeatureSafe: true,
  },
  {
    feature: "viewer",
    label: "Viewer and watch",
    surface: "viewer",
    owner: "analytics/watch-time",
    defaultPersistenceLane: "analytics_watch_sessions",
    defaultMaterializerLane: "watch_session_materializer",
    defaultAggregationLane: "watch_time_rollup",
    scoreEvidenceImpact: "runtimeHealth.evidenceCompleteness",
    debugVisibility: "debug_visible",
    futureFeatureSafe: true,
  },
  {
    feature: "general_engagement",
    label: "General engagement",
    surface: "main_site",
    owner: "analytics/behavioral",
    defaultPersistenceLane: "analytics_event_facts",
    defaultMaterializerLane: "behavior_signal_materializer",
    defaultAggregationLane: "behavioral_timeline_rollup",
    scoreEvidenceImpact: "evidenceCompleteness",
    debugVisibility: "debug_visible",
    futureFeatureSafe: true,
  },
];

const FEATURE_BY_ID = Object.fromEntries(
  BEHAVIOR_FEATURE_REGISTRY.map((feature) => [feature.feature, feature]),
) as Record<BehaviorFeatureId, BehaviorFeatureRegistration>;

export function getBehaviorFeatureRegistration(featureId: BehaviorFeatureId) {
  return FEATURE_BY_ID[featureId];
}

export function resolveBehaviorFeatureForTelemetryEvent(input: {
  eventName: string;
  category: TelemetryEventCategory;
  family: TelemetryEventFamily;
  modules?: readonly TelemetryModuleKey[];
}): BehaviorFeatureRegistration {
  const eventName = input.eventName.toLowerCase();
  const modules = input.modules ?? [];

  if (eventName.includes("broadcast")) return FEATURE_BY_ID.broadcasts;
  if (eventName.includes("fan_pass") || eventName.includes("subscription")) return FEATURE_BY_ID.fan_pass;
  if (eventName.includes("wallet") || eventName.includes("purchase") || eventName.includes("paypal") || eventName.includes("checkout") || eventName.includes("gumdrops")) return FEATURE_BY_ID.wallet;
  if (eventName.includes("creator_drop") || eventName.includes("drop_manager")) return FEATURE_BY_ID.creator_drop_manager;
  if (eventName.includes("creator_settings") || eventName.includes("settings")) return FEATURE_BY_ID.creator_settings;
  if (eventName.includes("timeline")) return FEATURE_BY_ID.creator_timeline;
  if (
    eventName.includes("creator_profile")
    || eventName.includes("creator_rail")
    || eventName.includes("creator_search")
    || eventName.includes("creator_follow")
    || eventName.includes("creator_unfollow")
    || eventName.includes("creator_relationship")
    || eventName.includes("creator_card")
    || eventName.includes("creator_recommendation")
    || eventName.includes("creator_discovery")
  ) return FEATURE_BY_ID.creator_profile;
  if (eventName.includes("daily_checkin") || eventName.includes("daily_task") || eventName.includes("check_in") || input.family === "task") return FEATURE_BY_ID.daily_checkin;
  if (eventName.includes("library") || eventName.includes("recent_activity")) return FEATURE_BY_ID.library;
  if (eventName.includes("search") || eventName.includes("filter") || eventName.includes("sort") || eventName.includes("category")) return FEATURE_BY_ID.search_discovery;
  if (input.family === "drop" || input.family === "unlock" || modules.includes("content")) return FEATURE_BY_ID.drops;
  if (input.family === "notification" || modules.includes("notifications")) return FEATURE_BY_ID.notifications;
  if (input.family === "admin" || modules.includes("admin")) return FEATURE_BY_ID.admin_debug;
  if (input.family === "auth" || input.family === "onboarding" || modules.includes("auth") || modules.includes("onboarding")) return FEATURE_BY_ID.auth;
  if (input.family === "security" || modules.includes("security")) return FEATURE_BY_ID.security;
  if (input.family === "chat_message" || eventName.includes("support") || eventName.includes("bug_report")) return FEATURE_BY_ID.support;
  if (input.family === "system" || modules.includes("viewer") || modules.includes("runtime") || eventName.includes("watch") || eventName.includes("viewer") || eventName.includes("file_viewed")) return FEATURE_BY_ID.viewer;

  return FEATURE_BY_ID.general_engagement;
}
