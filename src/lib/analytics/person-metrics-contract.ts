import type { IdentityConfidence } from "@/lib/analytics/identity-handoff-contract";
import type { ConsentMode } from "@/lib/privacy/consent-tracking-contract";

export const PERSON_METRICS_CONTRACT_VERSION = "2026.05.person-metrics.1";

export const PERSON_METRIC_IDS = [
  "sessions",
  "visits",
  "active_days",
  "page_views",
  "creator_profile_views",
  "drop_opens",
  "unwraps",
  "wallet_opens",
  "wallet_closes",
  "package_selections",
  "checkout_starts",
  "payment_approvals",
  "payment_cancels",
  "payment_failures",
  "fan_pass_views",
  "fan_pass_purchases",
  "broadcasts_viewed",
  "broadcasts_clicked",
  "follows",
  "chat_actions",
  "daily_task_views",
  "daily_task_starts",
  "daily_task_completions",
  "daily_task_failures",
  "daily_task_rewards_granted",
  "daily_task_average_duration",
  "daily_task_abandonments",
  "daily_task_reset_locked_views",
  "notification_interactions",
  "runtime_watch_sessions",
  "settings_actions",
  "support_account_actions",
  "creator_drop_manager_actions",
] as const;

export type PersonMetricId = (typeof PERSON_METRIC_IDS)[number];
export type PersonMetricConsentDepth = "necessary_product" | "minimal_product" | "behavioral";
export type PersonMetricDebugOwner = "analytics" | "behavioral-intelligence" | "wallet" | "commerce" | "creator" | "notifications" | "viewer-runtime" | "settings" | "support" | "retention";
export type PersonMetricLegacyAction = "normalize_candidate" | "link_candidate" | "archive_only" | "needs_manual_review";
export type PersonMetricScoreImpact = "evidence_completeness" | "runtime_health" | "behavior_confidence" | "commerce_parity" | "none";

export interface PersonMetricAggregationDefinition {
  enabled: boolean;
  key: string;
  doubleCountPolicy: "count_once" | "linked_user_wins" | "excluded";
}

export interface PersonMetricDefinition {
  id: PersonMetricId;
  label: string;
  eventNames: string[];
  sourceOfTruth: string;
  aggregation: {
    global: PersonMetricAggregationDefinition;
    guest: PersonMetricAggregationDefinition;
    signedIn: PersonMetricAggregationDefinition;
    linkedPerson: PersonMetricAggregationDefinition;
  };
  consentEligibility: {
    depth: PersonMetricConsentDepth;
    allowedModes: ConsentMode[];
  };
  identityConfidence: {
    minimum: IdentityConfidence;
    globalMinimum: IdentityConfidence;
  };
  materializer: string;
  debugOwner: PersonMetricDebugOwner;
  scoreEvidenceImpact: PersonMetricScoreImpact;
  legacyRecoveryMapping: {
    action: PersonMetricLegacyAction;
    confidence: IdentityConfidence;
    source: string;
  };
}

const GLOBAL_AGGREGATION: PersonMetricAggregationDefinition = {
  enabled: true,
  key: "global",
  doubleCountPolicy: "count_once",
};

function aggregation(input?: {
  guest?: boolean;
  signedIn?: boolean;
  linkedPerson?: boolean;
}) {
  return {
    global: GLOBAL_AGGREGATION,
    guest: {
      enabled: input?.guest !== false,
      key: "guestId",
      doubleCountPolicy: "linked_user_wins",
    },
    signedIn: {
      enabled: input?.signedIn !== false,
      key: "userRef.id",
      doubleCountPolicy: "count_once",
    },
    linkedPerson: {
      enabled: input?.linkedPerson !== false,
      key: "linkId|userRef.id",
      doubleCountPolicy: "linked_user_wins",
    },
  } satisfies PersonMetricDefinition["aggregation"];
}

const MINIMAL_MODES: ConsentMode[] = ["minimal_analytics", "full_analytics", "full_behavioral"];
const BEHAVIORAL_MODES: ConsentMode[] = ["full_behavioral"];
const NECESSARY_MODES: ConsentMode[] = ["necessary_only", "minimal_analytics", "full_analytics", "full_behavioral"];

function metric(input: Omit<PersonMetricDefinition, "aggregation" | "identityConfidence"> & {
  aggregation?: Parameters<typeof aggregation>[0];
  minimumConfidence?: IdentityConfidence;
  globalMinimumConfidence?: IdentityConfidence;
}): PersonMetricDefinition {
  return {
    ...input,
    aggregation: aggregation(input.aggregation),
    identityConfidence: {
      minimum: input.minimumConfidence ?? "linked",
      globalMinimum: input.globalMinimumConfidence ?? "weak",
    },
  };
}

export const PERSON_METRIC_DEFINITIONS: PersonMetricDefinition[] = [
  metric({
    id: "sessions",
    label: "Sessions",
    eventNames: ["session_started", "auth_session_established", "auth_session_restored"],
    sourceOfTruth: "analytics_sessions",
    consentEligibility: { depth: "minimal_product", allowedModes: MINIMAL_MODES },
    materializer: "person_metrics.sessions",
    debugOwner: "analytics",
    scoreEvidenceImpact: "evidence_completeness",
    legacyRecoveryMapping: { action: "normalize_candidate", confidence: "weak", source: "legacy session events" },
    minimumConfidence: "weak",
  }),
  metric({
    id: "visits",
    label: "Visits",
    eventNames: ["semantic_page_viewed", "page_viewed", "home_page_viewed"],
    sourceOfTruth: "analytics_event_facts",
    consentEligibility: { depth: "minimal_product", allowedModes: MINIMAL_MODES },
    materializer: "person_metrics.visits",
    debugOwner: "analytics",
    scoreEvidenceImpact: "evidence_completeness",
    legacyRecoveryMapping: { action: "normalize_candidate", confidence: "weak", source: "legacy page/session events" },
    minimumConfidence: "weak",
  }),
  metric({
    id: "active_days",
    label: "Active days",
    eventNames: ["semantic_page_viewed", "session_started", "watch_session_started"],
    sourceOfTruth: "daily person rollup",
    consentEligibility: { depth: "minimal_product", allowedModes: MINIMAL_MODES },
    materializer: "person_metrics.active_days",
    debugOwner: "analytics",
    scoreEvidenceImpact: "behavior_confidence",
    legacyRecoveryMapping: { action: "normalize_candidate", confidence: "weak", source: "legacy daily rollups" },
    minimumConfidence: "weak",
  }),
  metric({
    id: "page_views",
    label: "Page views",
    eventNames: ["semantic_page_viewed", "page_viewed"],
    sourceOfTruth: "analytics_event_facts",
    consentEligibility: { depth: "minimal_product", allowedModes: MINIMAL_MODES },
    materializer: "person_metrics.page_views",
    debugOwner: "analytics",
    scoreEvidenceImpact: "evidence_completeness",
    legacyRecoveryMapping: { action: "normalize_candidate", confidence: "weak", source: "legacy page events" },
    minimumConfidence: "weak",
  }),
  metric({
    id: "creator_profile_views",
    label: "Creator profile views",
    eventNames: ["creator_profile_viewed", "creator_profile_link_clicked"],
    sourceOfTruth: "analytics_event_facts",
    consentEligibility: { depth: "minimal_product", allowedModes: MINIMAL_MODES },
    materializer: "person_metrics.creator_profile_views",
    debugOwner: "creator",
    scoreEvidenceImpact: "behavior_confidence",
    legacyRecoveryMapping: { action: "normalize_candidate", confidence: "weak", source: "legacy creator profile views" },
  }),
  metric({
    id: "drop_opens",
    label: "Drop opens",
    eventNames: ["drop_preview_opened", "drop_preview_page_viewed", "view_drop_details", "drop_clicked"],
    sourceOfTruth: "analytics_event_facts",
    consentEligibility: { depth: "minimal_product", allowedModes: MINIMAL_MODES },
    materializer: "person_metrics.drop_opens",
    debugOwner: "analytics",
    scoreEvidenceImpact: "behavior_confidence",
    legacyRecoveryMapping: { action: "normalize_candidate", confidence: "weak", source: "legacy drop open events" },
  }),
  metric({
    id: "unwraps",
    label: "Unwraps",
    eventNames: ["drop_unwrapped", "unlock_drop_success", "creator_drop_unwrapped"],
    sourceOfTruth: "server unlock entitlement facts; analytics events are projection only",
    consentEligibility: { depth: "necessary_product", allowedModes: NECESSARY_MODES },
    materializer: "person_metrics.unwraps",
    debugOwner: "analytics",
    scoreEvidenceImpact: "commerce_parity",
    legacyRecoveryMapping: { action: "needs_manual_review", confidence: "inferred", source: "legacy unlock/entitlement records" },
  }),
  metric({
    id: "wallet_opens",
    label: "Wallet opens",
    eventNames: ["wallet_opened"],
    sourceOfTruth: "wallet UI telemetry",
    consentEligibility: { depth: "minimal_product", allowedModes: MINIMAL_MODES },
    materializer: "person_metrics.wallet_opens",
    debugOwner: "wallet",
    scoreEvidenceImpact: "commerce_parity",
    legacyRecoveryMapping: { action: "normalize_candidate", confidence: "weak", source: "legacy wallet UI events" },
  }),
  metric({
    id: "wallet_closes",
    label: "Wallet closes",
    eventNames: ["wallet_closed_incomplete"],
    sourceOfTruth: "wallet UI telemetry",
    consentEligibility: { depth: "minimal_product", allowedModes: MINIMAL_MODES },
    materializer: "person_metrics.wallet_closes",
    debugOwner: "wallet",
    scoreEvidenceImpact: "commerce_parity",
    legacyRecoveryMapping: { action: "normalize_candidate", confidence: "weak", source: "legacy wallet UI events" },
  }),
  metric({
    id: "package_selections",
    label: "Package selections",
    eventNames: ["purchase_package_selected"],
    sourceOfTruth: "wallet UI telemetry",
    consentEligibility: { depth: "minimal_product", allowedModes: MINIMAL_MODES },
    materializer: "person_metrics.package_selections",
    debugOwner: "wallet",
    scoreEvidenceImpact: "commerce_parity",
    legacyRecoveryMapping: { action: "normalize_candidate", confidence: "weak", source: "legacy wallet package events" },
  }),
  metric({
    id: "checkout_starts",
    label: "Checkout starts",
    eventNames: ["begin_checkout"],
    sourceOfTruth: "checkout intent telemetry",
    consentEligibility: { depth: "minimal_product", allowedModes: MINIMAL_MODES },
    materializer: "person_metrics.checkout_starts",
    debugOwner: "commerce",
    scoreEvidenceImpact: "commerce_parity",
    legacyRecoveryMapping: { action: "normalize_candidate", confidence: "weak", source: "legacy checkout-start events" },
  }),
  metric({
    id: "payment_approvals",
    label: "Payment approvals",
    eventNames: ["server_purchase_verified", "purchase_verified", "paypal_capture_completed", "purchase_completed", "gumdrops_purchase_completed"],
    sourceOfTruth: "server purchase verification facts",
    consentEligibility: { depth: "necessary_product", allowedModes: NECESSARY_MODES },
    materializer: "person_metrics.payment_approvals",
    debugOwner: "commerce",
    scoreEvidenceImpact: "commerce_parity",
    legacyRecoveryMapping: { action: "needs_manual_review", confidence: "inferred", source: "legacy payment lifecycle records" },
  }),
  metric({
    id: "payment_cancels",
    label: "Payment cancels",
    eventNames: ["payment_canceled", "paypal_checkout_canceled", "wallet_closed_incomplete"],
    sourceOfTruth: "checkout cancellation telemetry",
    consentEligibility: { depth: "minimal_product", allowedModes: MINIMAL_MODES },
    materializer: "person_metrics.payment_cancels",
    debugOwner: "commerce",
    scoreEvidenceImpact: "commerce_parity",
    legacyRecoveryMapping: { action: "normalize_candidate", confidence: "weak", source: "legacy checkout cancellation events" },
  }),
  metric({
    id: "payment_failures",
    label: "Payment failures",
    eventNames: ["gumdrops_purchase_failed", "paypal_capture_failed", "payment_failed"],
    sourceOfTruth: "payment failure telemetry",
    consentEligibility: { depth: "necessary_product", allowedModes: NECESSARY_MODES },
    materializer: "person_metrics.payment_failures",
    debugOwner: "commerce",
    scoreEvidenceImpact: "commerce_parity",
    legacyRecoveryMapping: { action: "needs_manual_review", confidence: "inferred", source: "legacy payment failure records" },
  }),
  metric({
    id: "fan_pass_views",
    label: "Fan Pass views",
    eventNames: ["creator_fan_pass_viewed", "creator_subscription_viewed"],
    sourceOfTruth: "creator subscription telemetry",
    consentEligibility: { depth: "minimal_product", allowedModes: MINIMAL_MODES },
    materializer: "person_metrics.fan_pass_views",
    debugOwner: "creator",
    scoreEvidenceImpact: "behavior_confidence",
    legacyRecoveryMapping: { action: "normalize_candidate", confidence: "weak", source: "legacy subscription view events" },
  }),
  metric({
    id: "fan_pass_purchases",
    label: "Fan Pass purchases",
    eventNames: ["creator_fan_pass_started", "creator_subscription_started", "creator_subscription_renewed"],
    sourceOfTruth: "creator subscription transaction facts",
    consentEligibility: { depth: "necessary_product", allowedModes: NECESSARY_MODES },
    materializer: "person_metrics.fan_pass_purchases",
    debugOwner: "creator",
    scoreEvidenceImpact: "commerce_parity",
    legacyRecoveryMapping: { action: "needs_manual_review", confidence: "inferred", source: "legacy fan pass/subscription records" },
  }),
  metric({
    id: "broadcasts_viewed",
    label: "Broadcasts viewed",
    eventNames: ["creator_broadcast_detail_viewed", "creator_broadcast_opened"],
    sourceOfTruth: "broadcast telemetry",
    consentEligibility: { depth: "minimal_product", allowedModes: MINIMAL_MODES },
    materializer: "person_metrics.broadcasts_viewed",
    debugOwner: "creator",
    scoreEvidenceImpact: "behavior_confidence",
    legacyRecoveryMapping: { action: "normalize_candidate", confidence: "weak", source: "legacy broadcast events" },
  }),
  metric({
    id: "broadcasts_clicked",
    label: "Broadcasts clicked",
    eventNames: ["creator_broadcast_cta_clicked", "notification_action_clicked"],
    sourceOfTruth: "broadcast and notification action telemetry",
    consentEligibility: { depth: "minimal_product", allowedModes: MINIMAL_MODES },
    materializer: "person_metrics.broadcasts_clicked",
    debugOwner: "notifications",
    scoreEvidenceImpact: "behavior_confidence",
    legacyRecoveryMapping: { action: "normalize_candidate", confidence: "weak", source: "legacy broadcast click events" },
  }),
  metric({
    id: "follows",
    label: "Follows",
    eventNames: ["creator_followed", "creator_unfollowed"],
    sourceOfTruth: "creator relationship facts",
    consentEligibility: { depth: "minimal_product", allowedModes: MINIMAL_MODES },
    materializer: "person_metrics.follows",
    debugOwner: "creator",
    scoreEvidenceImpact: "behavior_confidence",
    legacyRecoveryMapping: { action: "link_candidate", confidence: "inferred", source: "legacy creator relationship records" },
  }),
  metric({
    id: "chat_actions",
    label: "Chat actions",
    eventNames: [
      "chat_surface_viewed",
      "chat_thread_list_loaded",
      "chat_thread_opened",
      "chat_compose_sheet_opened",
      "chat_creator_selected",
      "chat_message_send_attempted",
      "chat_message_sent",
      "chat_message_failed",
      "chat_message_blocked",
      "chat_attachment_upload_started",
      "chat_attachment_upload_failed",
      "chat_presence_connected",
      "chat_typing_started",
      "chat_typing_stopped",
      "chat_read_marked",
      "chat_unread_updated",
      "chat_paid_gd_gate_viewed",
      "chat_purchase_cta_clicked",
      "creator_message_sent",
      "creator_media_sent",
      "chat_send_blocked",
      "chat_moderation_blocked",
    ],
    sourceOfTruth: "chat telemetry event facts plus guarded creator message thread records; raw transcript content is drilldown-only",
    consentEligibility: { depth: "minimal_product", allowedModes: MINIMAL_MODES },
    materializer: "person_metrics.chat_actions",
    debugOwner: "support",
    scoreEvidenceImpact: "evidence_completeness",
    legacyRecoveryMapping: { action: "normalize_candidate", confidence: "weak", source: "legacy chat event facts and creator message thread metadata" },
    minimumConfidence: "weak",
  }),
  metric({
    id: "daily_task_views",
    label: "Daily task views",
    eventNames: ["daily_task_surface_viewed", "daily_task_card_viewed", "daily_tasks_viewed"],
    sourceOfTruth: "daily task lifecycle telemetry; surface/card views are not task duration",
    consentEligibility: { depth: "minimal_product", allowedModes: MINIMAL_MODES },
    materializer: "person_metrics.daily_task_views",
    debugOwner: "retention",
    scoreEvidenceImpact: "evidence_completeness",
    legacyRecoveryMapping: { action: "normalize_candidate", confidence: "weak", source: "legacy daily task view telemetry" },
    minimumConfidence: "weak",
  }),
  metric({
    id: "daily_task_starts",
    label: "Daily task starts",
    eventNames: ["daily_task_started"],
    sourceOfTruth: "daily task lifecycle telemetry emitted only after active user start/attempt",
    consentEligibility: { depth: "minimal_product", allowedModes: MINIMAL_MODES },
    materializer: "person_metrics.daily_task_starts",
    debugOwner: "retention",
    scoreEvidenceImpact: "evidence_completeness",
    legacyRecoveryMapping: { action: "normalize_candidate", confidence: "weak", source: "legacy task started events" },
    minimumConfidence: "weak",
  }),
  metric({
    id: "daily_task_completions",
    label: "Daily task completions",
    eventNames: ["daily_task_completed", "task_completed", "daily_checkin_claimed"],
    sourceOfTruth: "canonical task completion events; client completion telemetry is supporting only",
    consentEligibility: { depth: "necessary_product", allowedModes: NECESSARY_MODES },
    materializer: "person_metrics.daily_task_completions",
    debugOwner: "retention",
    scoreEvidenceImpact: "evidence_completeness",
    legacyRecoveryMapping: { action: "normalize_candidate", confidence: "weak", source: "legacy task completion events" },
    minimumConfidence: "weak",
  }),
  metric({
    id: "daily_task_failures",
    label: "Daily task failures",
    eventNames: ["daily_task_failed"],
    sourceOfTruth: "daily task lifecycle failure telemetry with explicit failure reason",
    consentEligibility: { depth: "minimal_product", allowedModes: MINIMAL_MODES },
    materializer: "person_metrics.daily_task_failures",
    debugOwner: "retention",
    scoreEvidenceImpact: "evidence_completeness",
    legacyRecoveryMapping: { action: "normalize_candidate", confidence: "weak", source: "legacy task failure events" },
    minimumConfidence: "weak",
  }),
  metric({
    id: "daily_task_rewards_granted",
    label: "Daily task rewards granted",
    eventNames: ["daily_task_reward_granted", "daily_task_claimed"],
    sourceOfTruth: "server reward truth and reward receipt events; rewardSource remains reward_gd_only",
    consentEligibility: { depth: "necessary_product", allowedModes: NECESSARY_MODES },
    materializer: "person_metrics.daily_task_rewards_granted",
    debugOwner: "retention",
    scoreEvidenceImpact: "evidence_completeness",
    legacyRecoveryMapping: { action: "needs_manual_review", confidence: "inferred", source: "legacy task reward receipts" },
    minimumConfidence: "weak",
  }),
  metric({
    id: "daily_task_average_duration",
    label: "Daily task average duration",
    eventNames: ["daily_task_completed", "daily_task_failed", "daily_task_abandoned"],
    sourceOfTruth: "active task duration only; passive page-open time is unavailable, not zero",
    consentEligibility: { depth: "minimal_product", allowedModes: MINIMAL_MODES },
    materializer: "person_metrics.daily_task_average_duration",
    debugOwner: "retention",
    scoreEvidenceImpact: "evidence_completeness",
    legacyRecoveryMapping: { action: "archive_only", confidence: "weak", source: "legacy duration fields without active-start proof" },
    minimumConfidence: "weak",
  }),
  metric({
    id: "daily_task_abandonments",
    label: "Daily task abandonments",
    eventNames: ["daily_task_abandoned"],
    sourceOfTruth: "daily task lifecycle abandon classification with explicit threshold",
    consentEligibility: { depth: "minimal_product", allowedModes: MINIMAL_MODES },
    materializer: "person_metrics.daily_task_abandonments",
    debugOwner: "retention",
    scoreEvidenceImpact: "evidence_completeness",
    legacyRecoveryMapping: { action: "archive_only", confidence: "weak", source: "legacy abandoned task candidates" },
    minimumConfidence: "weak",
  }),
  metric({
    id: "daily_task_reset_locked_views",
    label: "Daily task reset locked views",
    eventNames: ["daily_task_reset_locked", "daily_task_next_eligible_viewed"],
    sourceOfTruth: "daily task lifecycle telemetry for locked/reset views",
    consentEligibility: { depth: "minimal_product", allowedModes: MINIMAL_MODES },
    materializer: "person_metrics.daily_task_reset_locked_views",
    debugOwner: "retention",
    scoreEvidenceImpact: "evidence_completeness",
    legacyRecoveryMapping: { action: "normalize_candidate", confidence: "weak", source: "legacy reset/locked daily task views" },
    minimumConfidence: "weak",
  }),
  metric({
    id: "notification_interactions",
    label: "Notification interactions",
    eventNames: ["notification_opened", "notification_read", "notification_action_clicked", "notification_mark_all_read", "notification_cleared", "notification_prompt_banner_viewed"],
    sourceOfTruth: "notification runtime and inbox telemetry",
    consentEligibility: { depth: "minimal_product", allowedModes: MINIMAL_MODES },
    materializer: "person_metrics.notification_interactions",
    debugOwner: "notifications",
    scoreEvidenceImpact: "behavior_confidence",
    legacyRecoveryMapping: { action: "normalize_candidate", confidence: "weak", source: "legacy notification records" },
  }),
  metric({
    id: "runtime_watch_sessions",
    label: "Runtime watch sessions",
    eventNames: ["watch_session_started", "watch_session_progress", "watch_session_ended", "viewer_watch_checkpoint"],
    sourceOfTruth: "runtime media watch sessions only; page duration is not a current-person metric",
    consentEligibility: { depth: "behavioral", allowedModes: BEHAVIORAL_MODES },
    materializer: "person_metrics.runtime_watch_sessions",
    debugOwner: "viewer-runtime",
    scoreEvidenceImpact: "runtime_health",
    legacyRecoveryMapping: { action: "archive_only", confidence: "weak", source: "legacy watch/session duration records" },
  }),
  metric({
    id: "settings_actions",
    label: "Settings actions",
    eventNames: [
      "user_settings_viewed",
      "profile_settings_viewed",
      "settings_surface_viewed",
      "setting_toggle_changed",
      "setting_action_clicked",
      "setting_save_succeeded",
      "setting_save_failed",
      "creator_dashboard_settings_viewed",
      "creator_settings_section_opened",
      "creator_setting_updated",
      "creator_settings_updated",
      "creator_settings_control_plane_saved",
      "creator_settings_migrated_redirect_viewed",
      "cookie_consent_updated",
    ],
    sourceOfTruth: "settings surfaces and settings route telemetry",
    consentEligibility: { depth: "minimal_product", allowedModes: MINIMAL_MODES },
    materializer: "person_metrics.settings_actions",
    debugOwner: "settings",
    scoreEvidenceImpact: "evidence_completeness",
    legacyRecoveryMapping: { action: "normalize_candidate", confidence: "weak", source: "legacy settings action events" },
    minimumConfidence: "weak",
  }),
  metric({
    id: "support_account_actions",
    label: "Support/account actions",
    eventNames: [
      "support_inbox_viewed",
      "support_ticket_created",
      "support_thread_opened",
      "support_reply_viewed",
      "support_reply_sent",
      "data_export_requested",
      "account_delete_clicked",
      "account_delete_confirm_opened",
      "account_delete_confirmed",
      "account_delete_cancelled",
      "account_delete_request_submitted",
      "account_delete_failed",
      "account_delete_completed",
    ],
    sourceOfTruth: "support routes, support inbox telemetry, and account safety telemetry",
    consentEligibility: { depth: "minimal_product", allowedModes: MINIMAL_MODES },
    materializer: "person_metrics.support_account_actions",
    debugOwner: "support",
    scoreEvidenceImpact: "evidence_completeness",
    legacyRecoveryMapping: { action: "normalize_candidate", confidence: "weak", source: "legacy support/account action events" },
    minimumConfidence: "weak",
  }),
  metric({
    id: "creator_drop_manager_actions",
    label: "Creator drop manager actions",
    eventNames: [
      "creator_drop_submitted",
      "creator_drop_updated",
      "admin_creator_drop_reviewed",
    ],
    sourceOfTruth: "creator drop manager telemetry and canonical creator drop route facts",
    consentEligibility: { depth: "minimal_product", allowedModes: MINIMAL_MODES },
    materializer: "person_metrics.creator_drop_manager_actions",
    debugOwner: "creator",
    scoreEvidenceImpact: "evidence_completeness",
    legacyRecoveryMapping: { action: "normalize_candidate", confidence: "weak", source: "legacy creator drop manager events" },
    minimumConfidence: "weak",
  }),
];

export function getPersonMetricDefinition(metricId: PersonMetricId) {
  return PERSON_METRIC_DEFINITIONS.find((metric) => metric.id === metricId) ?? null;
}

export function validatePersonMetricsContract(metrics: readonly PersonMetricDefinition[] = PERSON_METRIC_DEFINITIONS): string[] {
  const failures: string[] = [];
  const seenIds = new Set<string>();

  for (const requiredId of PERSON_METRIC_IDS) {
    if (!metrics.some((metric) => metric.id === requiredId)) failures.push(`${requiredId} metric missing.`);
  }

  for (const metric of metrics) {
    if (seenIds.has(metric.id)) failures.push(`${metric.id} metric duplicated.`);
    seenIds.add(metric.id);
    if (!metric.aggregation.global?.enabled) failures.push(`${metric.id} lacks global aggregation.`);
    if (typeof metric.aggregation.guest?.enabled !== "boolean") failures.push(`${metric.id} lacks guest aggregation.`);
    if (typeof metric.aggregation.signedIn?.enabled !== "boolean") failures.push(`${metric.id} lacks signed-in aggregation.`);
    if (typeof metric.aggregation.linkedPerson?.enabled !== "boolean") failures.push(`${metric.id} lacks linked-person aggregation.`);
    if (!metric.consentEligibility.allowedModes.length) failures.push(`${metric.id} lacks consent eligibility.`);
    if (!metric.identityConfidence.minimum || !metric.identityConfidence.globalMinimum) failures.push(`${metric.id} lacks identity confidence.`);
    if (!metric.materializer) failures.push(`${metric.id} lacks materializer.`);
    if (!metric.debugOwner) failures.push(`${metric.id} lacks debug owner.`);
    if (!metric.scoreEvidenceImpact) failures.push(`${metric.id} lacks score/evidence impact.`);
    if (!metric.legacyRecoveryMapping.action || !metric.legacyRecoveryMapping.source) failures.push(`${metric.id} lacks legacy recovery mapping.`);
    if (!metric.sourceOfTruth) failures.push(`${metric.id} lacks source of truth.`);
  }

  const checkoutMetric = metrics.find((metric) => metric.id === "checkout_starts");
  const approvalMetric = metrics.find((metric) => metric.id === "payment_approvals");
  if (!checkoutMetric?.eventNames.includes("begin_checkout")) failures.push("checkout_starts lacks begin_checkout.");
  if (approvalMetric?.eventNames.includes("begin_checkout")) failures.push("payment_approvals conflates checkout start.");
  if (!approvalMetric?.eventNames.some((name) => name === "server_purchase_verified" || name === "paypal_capture_completed")) {
    failures.push("payment_approvals lacks server/provider approval source.");
  }

  const unwrapMetric = metrics.find((metric) => metric.id === "unwraps");
  if (!unwrapMetric?.sourceOfTruth.includes("server unlock")) failures.push("unwraps lacks server unlock source.");
  if (!metrics.some((metric) => metric.id === "wallet_opens") || !metrics.some((metric) => metric.id === "wallet_closes")) {
    failures.push("wallet open/close metrics missing.");
  }

  return failures;
}
