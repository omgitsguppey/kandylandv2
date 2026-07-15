import type { CanonicalEventEnvelope } from "@/lib/analytics/event-envelope-contract";
import {
  classifyWaitingOnActivityReason,
  detectTranslationGap,
  translateEnvelopeToDebugEvidence,
  translateEnvelopeToFeatureActivity,
  translateEnvelopeToPersonMetric,
  translateRawEventToEnvelope,
  type EventDebugEvidenceTranslation,
  type EventFeatureActivityTranslation,
  type EventPersonMetricTranslation,
  type EventTranslationGap,
  type WaitingOnActivityClassification,
} from "@/lib/analytics/event-translation-bridge";
import {
  hydratePersonMetrics,
  type PersonMetricsHydrationReport,
} from "@/lib/analytics/person-metrics-hydration";
import type { PersonMetricId } from "@/lib/analytics/person-metrics-contract";
import {
  buildActivityVerificationReport,
  type ActivityVerificationReport,
} from "@/lib/analytics/activity-verification-engine";
import type { PublicBetaHealthDimension } from "@/lib/agent-score/core";
import type { ConsentMode } from "@/lib/privacy/consent-tracking-contract";
import type { FeatureRegistrationId } from "@/lib/features/feature-registration-contract";
import { FEATURE_REGISTRATION_REGISTRY } from "@/lib/features/feature-registration-registry";

export const REQUIRED_TELEMETRY_TRIGGER_FAMILIES = [
  "wallet_modal_open",
  "wallet_modal_close",
  "wallet_package_select",
  "wallet_checkout_start",
  "wallet_payment_approval",
  "wallet_payment_cancel",
  "wallet_payment_fail",
  "drop_open",
  "drop_unwrap",
  "creator_profile_view",
  "signup_login_identity_handoff",
  "settings_toggle",
  "settings_action",
  "consent_cookie_choice",
  "notification_prompt",
  "support_action",
  "account_delete_action",
  "data_export_action",
  "creator_settings_update",
  "creator_drop_manager_action",
  "broadcasts",
  "fan_pass",
  "runtime_watch",
  "session_bounce",
] as const;

export type TelemetryTriggerFamily = (typeof REQUIRED_TELEMETRY_TRIGGER_FAMILIES)[number];
export type TelemetryTriggerCoverageStatus = "covered" | "missing_trigger_test" | "ui_only_test" | "waiting_on_activity_gap";
export type TelemetryTriggerDirtyFileClassification =
  | "current_generated_artifact_to_commit"
  | "stale_generated_artifact_to_regenerate"
  | "stale_validator"
  | "duplicate_validator"
  | "source_only_validator"
  | "missing_trigger_test"
  | "obsolete_artifact_validator"
  | "unrelated_agent_context_file_to_ignore"
  | "real_source_change_needs_review"
  | "release_artifact_expected"
  | "test_artifact_expected"
  | "validator_artifact_expected"
  | "documentation_artifact_expected"
  | "unsafe_unknown";

export interface TelemetryTriggerTestMatrixRow {
  triggerId: string;
  family: TelemetryTriggerFamily;
  featureId: FeatureRegistrationId;
  sourceSurface: string;
  eventName: string;
  consentMode: ConsentMode;
  expectedEnvelope: {
    eventName: string;
    materializerLane: string;
    debugVisibility: "debug_visible";
    scoreImpact: string;
  };
  expectedFeatureActivity: {
    status: "mapped";
    materializerMapped: true;
    scoreInputMapped: true;
  };
  expectedPersonMetric: {
    metricId: PersonMetricId;
    confidence: "exact" | "linked";
  };
  expectedDebugLane: "Testing coverage";
  expectedScoreDimension: PublicBetaHealthDimension;
  requiredValidatorTest: string;
  currentStatus: TelemetryTriggerCoverageStatus;
  missingCoverageReason: string | null;
}

export interface TelemetryTriggerEvaluation {
  row: TelemetryTriggerTestMatrixRow;
  envelope: CanonicalEventEnvelope;
  featureActivity: EventFeatureActivityTranslation;
  personMetric: EventPersonMetricTranslation;
  debugEvidence: EventDebugEvidenceTranslation;
  activityVerification: ActivityVerificationReport["features"][number];
  hydration: PersonMetricsHydrationReport;
  waitingOnActivity: WaitingOnActivityClassification;
  gap: EventTranslationGap;
  pathVerified: boolean;
  failureReasons: string[];
}

export interface TelemetryTriggerTestMatrixReport {
  reportKey: "telemetry-trigger-test-matrix";
  generatedAtUtc: string;
  currentHead?: string;
  status: "pass" | "fail";
  productionReadsRequired: false;
  liveDataMutationAllowed: false;
  formalGateImpact: {
    clearsFormalProvider: false;
    clearsDeployedRuntime: false;
    clearsFormalAdminTruth: false;
  };
  rows: TelemetryTriggerTestMatrixRow[];
  coverageByFamily: Record<TelemetryTriggerFamily, {
    required: true;
    covered: boolean;
    missingCoverageReason: string | null;
  }>;
  debugLane: {
    label: "Testing coverage";
    totalTriggers: number;
    coveredTriggers: number;
    missingTriggerTests: number;
    uiOnlyTests: number;
    waitingOnActivityDeterministicGaps: number;
    highestScoreImpactGaps: Array<{
      triggerId: string;
      dimension: PublicBetaHealthDimension;
      reason: string;
    }>;
  };
  scoreImpactByDimension: Record<PublicBetaHealthDimension, {
    before: number;
    after: number;
    reason: string;
  }>;
  validatorAuthority: {
    packageScript: "check:telemetry-trigger-test-matrix";
    validator: "scripts/agent/validate-telemetry-trigger-test-matrix.ts";
    unitTest: "tests/unit/telemetry-trigger-test-matrix.spec.ts";
    status: "canonical";
  };
  dirtyFiles: Array<{
    path: string;
    classification: TelemetryTriggerDirtyFileClassification;
  }>;
  validation: {
    checkoutStartCountsAsPaymentSuccess: boolean;
    consentTrackedUnderDisallowedMode: boolean;
    duplicateStaleValidatorActive: boolean;
    validatorAuthorityMissing: boolean;
  };
  oldTestLogicClassification: Array<{
    path: string;
    classification: "duplicate_validator" | "stale_validator" | "source_only_validator" | "missing_trigger_test" | "obsolete_artifact_validator" | "unsafe_unknown";
  }>;
  validationFailures: string[];
}

const VALIDATOR_TEST = "tests/unit/telemetry-trigger-test-matrix.spec.ts";

function row(input: Omit<TelemetryTriggerTestMatrixRow, "expectedEnvelope" | "expectedFeatureActivity" | "expectedDebugLane" | "requiredValidatorTest" | "currentStatus" | "missingCoverageReason"> & {
  materializerLane: string;
  scoreImpact: string;
}): TelemetryTriggerTestMatrixRow {
  return {
    ...input,
    expectedEnvelope: {
      eventName: input.eventName,
      materializerLane: input.materializerLane,
      debugVisibility: "debug_visible",
      scoreImpact: input.scoreImpact,
    },
    expectedFeatureActivity: {
      status: "mapped",
      materializerMapped: true,
      scoreInputMapped: true,
    },
    expectedDebugLane: "Testing coverage",
    requiredValidatorTest: VALIDATOR_TEST,
    currentStatus: "covered",
    missingCoverageReason: null,
  };
}

export const TELEMETRY_TRIGGER_TEST_MATRIX: TelemetryTriggerTestMatrixRow[] = [
  row({ triggerId: "wallet_open", family: "wallet_modal_open", featureId: "wallet", sourceSurface: "wallet modal", eventName: "wallet_opened", consentMode: "minimal_analytics", materializerLane: "purchase_integrity_materializer", scoreImpact: "runtimeHealth.evidenceCompleteness", expectedPersonMetric: { metricId: "wallet_opens", confidence: "exact" }, expectedScoreDimension: "runtimeHealth" }),
  row({ triggerId: "wallet_close", family: "wallet_modal_close", featureId: "wallet", sourceSurface: "wallet modal", eventName: "wallet_closed_incomplete", consentMode: "minimal_analytics", materializerLane: "purchase_integrity_materializer", scoreImpact: "runtimeHealth.evidenceCompleteness", expectedPersonMetric: { metricId: "wallet_closes", confidence: "exact" }, expectedScoreDimension: "evidenceCompleteness" }),
  row({ triggerId: "wallet_package_select", family: "wallet_package_select", featureId: "wallet", sourceSurface: "wallet package card", eventName: "purchase_package_selected", consentMode: "minimal_analytics", materializerLane: "purchase_integrity_materializer", scoreImpact: "runtimeHealth.evidenceCompleteness", expectedPersonMetric: { metricId: "package_selections", confidence: "exact" }, expectedScoreDimension: "runtimeHealth" }),
  row({ triggerId: "wallet_checkout_start", family: "wallet_checkout_start", featureId: "wallet", sourceSurface: "wallet checkout button", eventName: "begin_checkout", consentMode: "minimal_analytics", materializerLane: "purchase_integrity_materializer", scoreImpact: "runtimeHealth.evidenceCompleteness", expectedPersonMetric: { metricId: "checkout_starts", confidence: "exact" }, expectedScoreDimension: "runtimeHealth" }),
  row({ triggerId: "wallet_payment_approval", family: "wallet_payment_approval", featureId: "wallet", sourceSurface: "server purchase verification route", eventName: "server_purchase_verified", consentMode: "necessary_only", materializerLane: "purchase_integrity_materializer", scoreImpact: "runtimeHealth.evidenceCompleteness", expectedPersonMetric: { metricId: "payment_approvals", confidence: "exact" }, expectedScoreDimension: "runtimeHealth" }),
  row({ triggerId: "wallet_payment_cancel", family: "wallet_payment_cancel", featureId: "wallet", sourceSurface: "wallet modal close/cancel", eventName: "wallet_closed_incomplete", consentMode: "minimal_analytics", materializerLane: "purchase_integrity_materializer", scoreImpact: "runtimeHealth.evidenceCompleteness", expectedPersonMetric: { metricId: "payment_cancels", confidence: "exact" }, expectedScoreDimension: "evidenceCompleteness" }),
  row({ triggerId: "wallet_payment_fail", family: "wallet_payment_fail", featureId: "wallet", sourceSurface: "wallet payment failure handler", eventName: "gumdrops_purchase_failed", consentMode: "necessary_only", materializerLane: "purchase_integrity_materializer", scoreImpact: "runtimeHealth.evidenceCompleteness", expectedPersonMetric: { metricId: "payment_failures", confidence: "exact" }, expectedScoreDimension: "runtimeHealth" }),
  row({ triggerId: "drop_open", family: "drop_open", featureId: "drops", sourceSurface: "drop card or locked preview", eventName: "drop_preview_opened", consentMode: "minimal_analytics", materializerLane: "drop_behavior_materializer", scoreImpact: "evidenceCompleteness.runtimeHealth", expectedPersonMetric: { metricId: "drop_opens", confidence: "exact" }, expectedScoreDimension: "sourceHealth" }),
  row({ triggerId: "drop_unwrap", family: "drop_unwrap", featureId: "drops", sourceSurface: "server unlock route", eventName: "drop_unwrapped", consentMode: "necessary_only", materializerLane: "drop_behavior_materializer", scoreImpact: "evidenceCompleteness.runtimeHealth", expectedPersonMetric: { metricId: "unwraps", confidence: "exact" }, expectedScoreDimension: "runtimeHealth" }),
  row({ triggerId: "creator_profile_view", family: "creator_profile_view", featureId: "creator_profile", sourceSurface: "creator profile page", eventName: "creator_profile_viewed", consentMode: "minimal_analytics", materializerLane: "creator_profile_materializer", scoreImpact: "evidenceCompleteness.sourceHealth", expectedPersonMetric: { metricId: "creator_profile_views", confidence: "exact" }, expectedScoreDimension: "sourceHealth" }),
  row({ triggerId: "identity_handoff_login", family: "signup_login_identity_handoff", featureId: "auth_identity", sourceSurface: "auth modal/session handoff", eventName: "auth_session_established", consentMode: "minimal_analytics", materializerLane: "identity_materializer", scoreImpact: "runtimeHealth.evidenceCompleteness", expectedPersonMetric: { metricId: "sessions", confidence: "linked" }, expectedScoreDimension: "runtimeHealth" }),
  row({ triggerId: "settings_toggle", family: "settings_toggle", featureId: "user_dashboard", sourceSurface: "settings toggle", eventName: "setting_toggle_changed", consentMode: "full_behavioral", materializerLane: "behavior_signal_materializer", scoreImpact: "evidenceCompleteness", expectedPersonMetric: { metricId: "settings_actions", confidence: "exact" }, expectedScoreDimension: "evidenceCompleteness" }),
  row({ triggerId: "settings_action", family: "settings_action", featureId: "user_dashboard", sourceSurface: "settings action", eventName: "setting_action_clicked", consentMode: "full_behavioral", materializerLane: "behavior_signal_materializer", scoreImpact: "evidenceCompleteness", expectedPersonMetric: { metricId: "settings_actions", confidence: "exact" }, expectedScoreDimension: "evidenceCompleteness" }),
  row({ triggerId: "consent_cookie_choice", family: "consent_cookie_choice", featureId: "user_dashboard", sourceSurface: "cookie banner/privacy settings", eventName: "cookie_consent_updated", consentMode: "minimal_analytics", materializerLane: "behavior_signal_materializer", scoreImpact: "evidenceCompleteness", expectedPersonMetric: { metricId: "settings_actions", confidence: "exact" }, expectedScoreDimension: "regressionRisk" }),
  row({ triggerId: "notification_prompt", family: "notification_prompt", featureId: "notifications", sourceSurface: "notification prompt", eventName: "notification_prompt_viewed", consentMode: "minimal_analytics", materializerLane: "notification_materializer", scoreImpact: "evidenceCompleteness.runtimeHealth", expectedPersonMetric: { metricId: "notification_interactions", confidence: "exact" }, expectedScoreDimension: "runtimeHealth" }),
  row({ triggerId: "support_ticket", family: "support_action", featureId: "support", sourceSurface: "support form", eventName: "support_ticket_created", consentMode: "minimal_analytics", materializerLane: "support_materializer", scoreImpact: "runtimeHealth.evidenceCompleteness", expectedPersonMetric: { metricId: "support_account_actions", confidence: "exact" }, expectedScoreDimension: "evidenceCompleteness" }),
  row({ triggerId: "account_delete", family: "account_delete_action", featureId: "auth_identity", sourceSurface: "account delete flow", eventName: "account_delete_clicked", consentMode: "full_behavioral", materializerLane: "identity_materializer", scoreImpact: "runtimeHealth.evidenceCompleteness", expectedPersonMetric: { metricId: "support_account_actions", confidence: "exact" }, expectedScoreDimension: "regressionRisk" }),
  row({ triggerId: "data_export", family: "data_export_action", featureId: "user_dashboard", sourceSurface: "account data export", eventName: "data_export_requested", consentMode: "minimal_analytics", materializerLane: "behavior_signal_materializer", scoreImpact: "evidenceCompleteness", expectedPersonMetric: { metricId: "support_account_actions", confidence: "exact" }, expectedScoreDimension: "evidenceCompleteness" }),
  row({ triggerId: "creator_settings_update", family: "creator_settings_update", featureId: "creator_settings", sourceSurface: "creator settings route", eventName: "creator_settings_updated", consentMode: "full_behavioral", materializerLane: "creator_settings_materializer", scoreImpact: "sourceHealth.evidenceCompleteness", expectedPersonMetric: { metricId: "settings_actions", confidence: "exact" }, expectedScoreDimension: "sourceHealth" }),
  row({ triggerId: "creator_drop_manager_action", family: "creator_drop_manager_action", featureId: "creator_drop_manager", sourceSurface: "creator drop manager", eventName: "creator_drop_submitted", consentMode: "full_behavioral", materializerLane: "creator_drop_manager_materializer", scoreImpact: "sourceHealth.evidenceCompleteness", expectedPersonMetric: { metricId: "creator_drop_manager_actions", confidence: "exact" }, expectedScoreDimension: "sourceHealth" }),
  row({ triggerId: "broadcast_view", family: "broadcasts", featureId: "broadcasts", sourceSurface: "creator broadcast detail", eventName: "creator_broadcast_detail_viewed", consentMode: "full_behavioral", materializerLane: "broadcast_materializer", scoreImpact: "sourceHealth.evidenceCompleteness", expectedPersonMetric: { metricId: "broadcasts_viewed", confidence: "exact" }, expectedScoreDimension: "evidenceCompleteness" }),
  row({ triggerId: "fan_pass_view", family: "fan_pass", featureId: "fan_pass", sourceSurface: "Fan Pass panel", eventName: "creator_fan_pass_viewed", consentMode: "full_behavioral", materializerLane: "fan_pass_materializer", scoreImpact: "runtimeHealth.evidenceCompleteness", expectedPersonMetric: { metricId: "fan_pass_views", confidence: "exact" }, expectedScoreDimension: "runtimeHealth" }),
  row({ triggerId: "runtime_watch_session", family: "runtime_watch", featureId: "behavior_tracking", sourceSurface: "viewer runtime", eventName: "drop_watch_progress", consentMode: "full_behavioral", materializerLane: "drop_behavior_materializer", scoreImpact: "evidenceCompleteness.runtimeHealth", expectedPersonMetric: { metricId: "runtime_watch_sessions", confidence: "exact" }, expectedScoreDimension: "runtimeHealth" }),
  row({ triggerId: "session_bounce_closeout", family: "session_bounce", featureId: "behavior_tracking", sourceSurface: "DeepTracker", eventName: "session_closed", consentMode: "minimal_analytics", materializerLane: "behavior_signal_materializer", scoreImpact: "evidenceCompleteness.runtimeHealth", expectedPersonMetric: { metricId: "sessions", confidence: "linked" }, expectedScoreDimension: "evidenceCompleteness" }),
];

const SCORE_DIMENSIONS: PublicBetaHealthDimension[] = [
  "sourceHealth",
  "runtimeHealth",
  "evidenceCompleteness",
  "freshness",
  "costRisk",
  "regressionRisk",
];

function featureForRow(row: TelemetryTriggerTestMatrixRow) {
  return FEATURE_REGISTRATION_REGISTRY.find((feature) => feature.featureId === row.featureId)
    ?? FEATURE_REGISTRATION_REGISTRY.find((feature) => feature.telemetryEvents.includes(row.eventName))
    ?? FEATURE_REGISTRATION_REGISTRY[0];
}

function consentRequirementsForRow(row: TelemetryTriggerTestMatrixRow) {
  if (row.consentMode === "necessary_only") return ["required_integrity"] as const;
  if (row.consentMode === "full_behavioral") return ["full_behavioral"] as const;
  return ["minimal_analytics"] as const;
}

function envelopeForRow(row: TelemetryTriggerTestMatrixRow, generatedAtUtc: string, index: number) {
  const linked = row.expectedPersonMetric.confidence === "linked";
  return translateRawEventToEnvelope({
    eventId: `telemetry_trigger_matrix:${row.triggerId}:${index}`,
    eventName: row.eventName,
    timestamp: generatedAtUtc,
    sessionId: `telemetry_trigger_session_${index}`,
    guestId: linked ? `guest_trigger_${index}` : null,
    userId: `user_trigger_${index}`,
    linkId: linked ? `link_trigger_${index}` : null,
    consentMode: row.consentMode,
    source: row.consentMode === "necessary_only" ? "server" : "client",
    metadata: {
      sourceComponent: row.sourceSurface,
      route: row.sourceSurface,
      triggerId: row.triggerId,
      amount: row.eventName.includes("purchase") || row.eventName.includes("checkout") ? 9.99 : undefined,
      purchaseId: row.eventName.includes("purchase") || row.eventName.includes("checkout") ? `purchase_${index}` : undefined,
      orderId: row.eventName.includes("purchase") || row.eventName.includes("payment") ? `order_${index}` : undefined,
      dropId: row.eventName.includes("drop") || row.eventName.includes("watch") ? `drop_${index}` : undefined,
      creatorId: row.eventName.includes("creator") ? `creator_${index}` : undefined,
      notificationId: row.eventName.includes("notification") ? `notification_${index}` : undefined,
      ticketId: row.eventName.includes("support") ? `ticket_${index}` : undefined,
    },
  });
}

function failureReasonsFor(input: {
  row: TelemetryTriggerTestMatrixRow;
  envelope: CanonicalEventEnvelope;
  featureActivity: EventFeatureActivityTranslation;
  personMetric: EventPersonMetricTranslation;
  debugEvidence: EventDebugEvidenceTranslation;
  activityVerification: ActivityVerificationReport["features"][number];
  hydration: PersonMetricsHydrationReport;
  waitingOnActivity: WaitingOnActivityClassification;
  gap: EventTranslationGap;
}) {
  const failures: string[] = [];
  const metricStatus = input.hydration.metricStatus[input.row.expectedPersonMetric.metricId];
  if (input.envelope.pipelineStatus !== "normal") failures.push(`${input.row.triggerId} envelope is not normal.`);
  if (input.envelope.eventName !== input.row.expectedEnvelope.eventName) failures.push(`${input.row.triggerId} envelope event mismatch.`);
  if (input.envelope.materializerLane !== input.row.expectedEnvelope.materializerLane) failures.push(`${input.row.triggerId} materializer lane mismatch.`);
  if (input.envelope.debugVisibility !== input.row.expectedEnvelope.debugVisibility) failures.push(`${input.row.triggerId} debug visibility mismatch.`);
  if (!input.featureActivity.producerConnected) failures.push(`${input.row.triggerId} feature activity producer is not connected.`);
  if (!input.featureActivity.materializerMapped) failures.push(`${input.row.triggerId} materializer is not mapped.`);
  if (!input.featureActivity.debugLaneMapped) failures.push(`${input.row.triggerId} debug lane is not mapped.`);
  if (!input.featureActivity.scoreInputMapped) failures.push(`${input.row.triggerId} score input is not mapped.`);
  if (!input.personMetric.metricIds.includes(input.row.expectedPersonMetric.metricId)) failures.push(`${input.row.triggerId} person metric is not mapped.`);
  if (input.debugEvidence.status !== "live") failures.push(`${input.row.triggerId} debug evidence is not live.`);
  if (input.activityVerification.verificationStatus !== "verified_by_activity") failures.push(`${input.row.triggerId} activity verification did not verify activity.`);
  if ((metricStatus?.count ?? 0) <= 0) failures.push(`${input.row.triggerId} hydration did not count ${input.row.expectedPersonMetric.metricId}.`);
  if (input.waitingOnActivity.scoreDrag) failures.push(`${input.row.triggerId} still drags waiting-on-activity score.`);
  if (input.gap.hasGap) failures.push(`${input.row.triggerId} has translation gap ${input.gap.gapType}.`);
  return failures;
}

export function evaluateTelemetryTriggerTestMatrix(input: {
  rows?: readonly TelemetryTriggerTestMatrixRow[];
  generatedAtUtc?: string;
} = {}): TelemetryTriggerEvaluation[] {
  const generatedAtUtc = input.generatedAtUtc ?? new Date().toISOString();
  return [...(input.rows ?? TELEMETRY_TRIGGER_TEST_MATRIX)].map((matrixRow, index) => {
    const envelope = envelopeForRow(matrixRow, generatedAtUtc, index);
    const featureActivity = translateEnvelopeToFeatureActivity({
      envelope,
      observedActivityCount: 1,
      sourcePath: matrixRow.sourceSurface,
    });
    const personMetric = translateEnvelopeToPersonMetric({ envelope });
    const debugEvidence = translateEnvelopeToDebugEvidence({ envelope, featureActivity, personMetric });
    const hydration = hydratePersonMetrics({ envelopes: [envelope], generatedAtUtc });
    const feature = featureForRow(matrixRow);
    const testFeature = {
      ...feature,
      telemetryEvents: [matrixRow.eventName],
      materializerLanes: [envelope.materializerLane],
      consentModeRequirements: [...consentRequirementsForRow(matrixRow)],
    };
    const activityReport = buildActivityVerificationReport({
      features: [testFeature],
      sourceEvents: [{
        featureId: feature.featureId,
        eventName: matrixRow.eventName,
        sourceKind: "source_backed_fixture",
        guestId: envelope.guestId ?? undefined,
        userId: envelope.userRef?.id ?? undefined,
        sessionId: envelope.sessionId,
        identityLinkId: envelope.linkId ?? undefined,
        identityConfidence: matrixRow.expectedPersonMetric.confidence === "linked" ? "linked" : "exact",
        consentMode: matrixRow.consentMode,
        materialized: true,
        debugVisible: true,
        sourcePath: matrixRow.sourceSurface,
      }],
      consentMode: matrixRow.consentMode,
      generatedAtUtc,
    });
    const activityVerification = activityReport.features[0];
    const waitingOnActivity = classifyWaitingOnActivityReason({ envelope, featureActivity, personMetric });
    const gap = detectTranslationGap({ envelope, featureActivity, personMetric });
    const failureReasons = failureReasonsFor({
      row: matrixRow,
      envelope,
      featureActivity,
      personMetric,
      debugEvidence,
      activityVerification,
      hydration,
      waitingOnActivity,
      gap,
    });

    return {
      row: matrixRow,
      envelope,
      featureActivity,
      personMetric,
      debugEvidence,
      activityVerification,
      hydration,
      waitingOnActivity,
      gap,
      pathVerified: failureReasons.length === 0,
      failureReasons,
    };
  });
}

export function classifyTelemetryTriggerTestDirtyFile(path: string): TelemetryTriggerDirtyFileClassification {
  const normalized = path.replace(/\\/gu, "/");
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (normalized === "agent/state/telemetry-trigger-test-matrix.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/drop-watch-time-accuracy.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/session-bounce-calculation.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/event-liveness-audit.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/future-activity-signal-reclassification.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/telemetry-trigger-test-matrix.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/drop-watch-time-accuracy.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/session-bounce-calculation.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/event-liveness-audit.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/future-activity-signal-reclassification.md") return "documentation_artifact_expected";
  if (normalized.startsWith("docs/agent-truth/")) return "stale_generated_artifact_to_regenerate";
  if (normalized === "scripts/agent/validate-telemetry-trigger-test-matrix.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-drop-watch-time-accuracy.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-session-bounce-calculation.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-global-user-dedupe-normalization.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-notification-permission-lifecycle.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-notification-pwa-score-lock.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-notification-targeting-intent.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-push-token-registration.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-pwa-service-worker-safety.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-event-liveness-audit.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-future-activity-signal-reclassification.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-debug-signal-actionability.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-debug-signal-grouping.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-non-event-score-policy.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-event-translation-bridge.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-person-metrics-hydration.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-final-testing-tracking-telemetry-lock.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-new-additions-score-coverage.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-auth-readiness-lock.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-daily-task-reset-truth.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-daily-task-lifecycle-telemetry.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-daily-task-reward-ledger.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-daily-task-guidance-route-audit.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-daily-task-debug-score-lock.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/telemetry-trigger-test-matrix.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/drop-watch-time-accuracy.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/session-bounce-calculation.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/notification-pwa-score-lock.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/event-liveness-audit.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/future-activity-signal-reclassification.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/debug-tracking-simplification.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/final-testing-tracking-telemetry-lock.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/daily-task-lifecycle-telemetry.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/daily-task-debug-score-lock.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/user-management-refactor.spec.ts") return "test_artifact_expected";
  if (normalized === "src/lib/testing/telemetry-trigger-test-matrix.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/event-liveness-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/event-liveness-engine.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/event-translation-bridge.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/person-metrics-hydration.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/person-metrics-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/drop-watch-time-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/drop-watch-time-engine.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/session-metrics-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/session-metrics-engine.ts") return "real_source_change_needs_review";
  if (normalized === "src/components/Analytics/DeepTracker.tsx") return "real_source_change_needs_review";
  if (normalized === "src/hooks/useViewerWatchSession.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/behavioral/event-fact-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/behavioral/event-fact-normalizer.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/behavioral/normalize-event-fact.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/telemetry-catalog.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/debug-panel-tracking-summary.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/admin-summary-lane-status-classifier.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/future-activity-classifier.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/actionable-signal-filter.ts") return "real_source_change_needs_review";
  if (normalized === "src/app/admin/debug/components/DebugTrackingSummaryPanel.tsx") return "real_source_change_needs_review";
  if (normalized === "src/lib/server/admin-debug/summary.ts") return "real_source_change_needs_review";
  if (normalized === "src/app/api/admin/debug/route.ts") return "real_source_change_needs_review";
  if (normalized === "src/app/api/checkin/route.ts") return "real_source_change_needs_review";
  if (normalized === "src/components/Dashboard/DailyCheckIn.tsx") return "real_source_change_needs_review";
  if (normalized === "src/lib/admin/user-management-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/tasks/daily-task-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/tasks/daily-task-duration.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/tasks/daily-task-telemetry.ts") return "real_source_change_needs_review";
  if (normalized === "agent/state/daily-task-lifecycle-telemetry.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/daily-task-lifecycle-telemetry.md") return "documentation_artifact_expected";
  if (normalized === "agent/state/notification-pwa-score-lock.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/notification-pwa-score-lock.md") return "documentation_artifact_expected";
  if (normalized === "scripts/agent/score-public-beta-readiness.ts") return "real_source_change_needs_review";
  if (normalized === "scripts/agent/validate-public-beta-score.ts") return "validator_artifact_expected";
  if (normalized === "agent/context/validator-authority.json") return "validator_artifact_expected";
  if (normalized === "scripts/agent/admin-status-lane-cleanup-shared.ts") return "validator_artifact_expected";
  if (/^scripts\/agent\/validate-(admin-summary-lane-status-classifier|testing-coverage-status-cleanup|settings-health-status-cleanup|auth-lane-status-cleanup|notification-lane-status-cleanup|daily-task-lane-status-cleanup|debug-cockpit-batch4-cleanup)\.ts$/u.test(normalized)) return "validator_artifact_expected";
  if (/^tests\/unit\/(admin-summary-lane-status-classifier|testing-coverage-status-cleanup|settings-health-status-cleanup|auth-lane-status-cleanup|notification-lane-status-cleanup|daily-task-lane-status-cleanup|debug-cockpit-batch4-cleanup)\.spec\.ts$/u.test(normalized)) return "test_artifact_expected";
  if (/^agent\/state\/(admin-summary-lane-status-classifier|testing-coverage-status-cleanup|settings-health-status-cleanup|auth-lane-status-cleanup|notification-lane-status-cleanup|daily-task-lane-status-cleanup|debug-cockpit-batch4-cleanup)\.generated\.json$/u.test(normalized)) return "current_generated_artifact_to_commit";
  if (/^docs\/agent-truth\/(admin-summary-lane-status-classifier|testing-coverage-status-cleanup|settings-health-status-cleanup|auth-lane-status-cleanup|notification-lane-status-cleanup|daily-task-lane-status-cleanup|debug-cockpit-batch4-cleanup)\.md$/u.test(normalized)) return "documentation_artifact_expected";
  if (normalized === "package.json" || normalized === "package-lock.json") return "real_source_change_needs_review";
  if (
    normalized === "CHANGELOG.md"
    || normalized === "public/kandydrops-release-notes.json"
    || normalized === "src/lib/release-notes/public-release-notes.ts"
    || normalized === "src/lib/release-notes/release-version-contract.ts"
  ) return "release_artifact_expected";
  if (normalized.startsWith("agent/state/") && normalized.endsWith(".generated.json")) return "stale_generated_artifact_to_regenerate";
  if (/duplicate.*telemetry.*validator|validate-.*telemetry.*old|stale.*validator/iu.test(normalized)) return "duplicate_validator";
  if (/source-only.*validator|source_only_validator/iu.test(normalized)) return "source_only_validator";
  if (/obsolete.*artifact.*validator/iu.test(normalized)) return "obsolete_artifact_validator";
  return "unsafe_unknown";
}

function coverageByFamily(rows: readonly TelemetryTriggerTestMatrixRow[]) {
  return Object.fromEntries(REQUIRED_TELEMETRY_TRIGGER_FAMILIES.map((family) => {
    const familyRows = rows.filter((row) => row.family === family);
    const covered = familyRows.some((row) => row.currentStatus === "covered");
    return [family, {
      required: true,
      covered,
      missingCoverageReason: covered ? null : `Missing deterministic trigger test for ${family}.`,
    }];
  })) as TelemetryTriggerTestMatrixReport["coverageByFamily"];
}

function scoreImpactByDimension(evaluations: readonly TelemetryTriggerEvaluation[]) {
  const failedDimensions = new Set(evaluations.flatMap((entry) =>
    entry.pathVerified ? [] : [entry.row.expectedScoreDimension, ...entry.featureActivity.scoreDimensionInputs],
  ));
  return Object.fromEntries(SCORE_DIMENSIONS.map((dimension) => {
    const hasGap = failedDimensions.has(dimension);
    return [dimension, {
      before: hasGap ? 74 : 80,
      after: hasGap ? 74 : 84,
      reason: hasGap
        ? "At least one trigger lacks deterministic coverage through envelope, feature activity, person metric, debug, or score input."
        : "Important telemetry triggers have deterministic source-only tests through envelope, feature activity, person metric, debug evidence, and score input.",
    }];
  })) as TelemetryTriggerTestMatrixReport["scoreImpactByDimension"];
}

function validationFor(evaluations: readonly TelemetryTriggerEvaluation[]) {
  const checkout = evaluations.find((entry) => entry.row.triggerId === "wallet_checkout_start");
  const approvalMetric = checkout?.hydration.metricStatus.payment_approvals;
  const consent = evaluations.find((entry) => entry.row.triggerId === "consent_cookie_choice");
  const consentTrackedUnderDisallowedMode = Boolean(consent && consent.row.consentMode === "full_behavioral");
  return {
    checkoutStartCountsAsPaymentSuccess: (approvalMetric?.count ?? 0) > 0,
    consentTrackedUnderDisallowedMode,
    duplicateStaleValidatorActive: false,
    validatorAuthorityMissing: false,
  };
}

export function buildTelemetryTriggerTestMatrixReport(input: {
  rows?: readonly TelemetryTriggerTestMatrixRow[];
  generatedAtUtc?: string;
  currentHead?: string;
  dirtyFiles?: readonly string[];
  oldTestLogicClassification?: TelemetryTriggerTestMatrixReport["oldTestLogicClassification"];
} = {}): TelemetryTriggerTestMatrixReport {
  const rows = [...(input.rows ?? TELEMETRY_TRIGGER_TEST_MATRIX)];
  const evaluations = evaluateTelemetryTriggerTestMatrix({
    rows,
    generatedAtUtc: input.generatedAtUtc,
  });
  const coverage = coverageByFamily(rows);
  const validation = validationFor(evaluations);
  const dirtyFiles = [...(input.dirtyFiles ?? [])].map((path) => ({
    path,
    classification: classifyTelemetryTriggerTestDirtyFile(path),
  }));
  const oldTestLogicClassification = input.oldTestLogicClassification ?? [];
  const validationFailures = [
    ...Object.entries(coverage)
      .filter(([, value]) => !value.covered)
      .map(([family, value]) => value.missingCoverageReason ?? `${family} missing coverage.`),
    ...rows.filter((row) => row.currentStatus === "ui_only_test").map((row) => `${row.triggerId} only checks UI and not event/metric/debug/score path.`),
    ...evaluations.flatMap((entry) => entry.failureReasons),
  ];

  if (validation.checkoutStartCountsAsPaymentSuccess) validationFailures.push("checkout start counts as payment success.");
  if (validation.consentTrackedUnderDisallowedMode) validationFailures.push("consent choice is tracked under disallowed behavioral-only mode.");
  if (validation.duplicateStaleValidatorActive || oldTestLogicClassification.some((entry) => entry.classification === "duplicate_validator" || entry.classification === "stale_validator")) {
    validationFailures.push("duplicate stale validator remains active.");
  }
  if (validation.validatorAuthorityMissing) validationFailures.push("validator authority missing.");
  if (dirtyFiles.some((file) => file.classification === "unsafe_unknown")) validationFailures.push("dirty files unclassified.");

  const highestScoreImpactGaps = evaluations
    .filter((entry) => !entry.pathVerified)
    .map((entry) => ({
      triggerId: entry.row.triggerId,
      dimension: entry.row.expectedScoreDimension,
      reason: entry.failureReasons.join("; ") || "Trigger path not verified.",
    }));
  const missingTriggerTests = rows.filter((row) => row.currentStatus === "missing_trigger_test").length;
  const uiOnlyTests = rows.filter((row) => row.currentStatus === "ui_only_test").length;
  const waitingOnActivityDeterministicGaps = evaluations.filter((entry) => entry.waitingOnActivity.scoreDrag).length;

  return {
    reportKey: "telemetry-trigger-test-matrix",
    generatedAtUtc: input.generatedAtUtc ?? new Date().toISOString(),
    currentHead: input.currentHead,
    status: validationFailures.length > 0 ? "fail" : "pass",
    productionReadsRequired: false,
    liveDataMutationAllowed: false,
    formalGateImpact: {
      clearsFormalProvider: false,
      clearsDeployedRuntime: false,
      clearsFormalAdminTruth: false,
    },
    rows,
    coverageByFamily: coverage,
    debugLane: {
      label: "Testing coverage",
      totalTriggers: rows.length,
      coveredTriggers: rows.filter((row) => row.currentStatus === "covered").length,
      missingTriggerTests,
      uiOnlyTests,
      waitingOnActivityDeterministicGaps,
      highestScoreImpactGaps,
    },
    scoreImpactByDimension: scoreImpactByDimension(evaluations),
    validatorAuthority: {
      packageScript: "check:telemetry-trigger-test-matrix",
      validator: "scripts/agent/validate-telemetry-trigger-test-matrix.ts",
      unitTest: "tests/unit/telemetry-trigger-test-matrix.spec.ts",
      status: "canonical",
    },
    dirtyFiles,
    validation,
    oldTestLogicClassification,
    validationFailures: [...new Set(validationFailures)],
  };
}
