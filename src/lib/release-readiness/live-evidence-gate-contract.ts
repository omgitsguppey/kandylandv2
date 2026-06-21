import type { ScoreDimensions } from "./final-release-readiness";

export type LiveEvidenceGateClass =
  | "live_behavioral_evidence"
  | "live_runtime_evidence"
  | "live_admin_truth_evidence"
  | "live_ledger_evidence"
  | "live_route_health_evidence"
  | "live_error_rate_evidence"
  | "external_provider_evidence"
  | "external_billing_evidence"
  | "source_only_evidence";

export type LiveEvidenceStatus =
  | "live_evidence_replaced"
  | "source_missing_live_evidence"
  | "source_only_evidence"
  | "external_provider_required"
  | "external_billing_required"
  | "current_warning";

export type LiveEvidenceConfidence = "exact" | "linked" | "inferred" | "weak" | "unknown";

export type LiveRuntimeEvidenceStatus =
  | "live_activity_confirmed"
  | "aggregate_activity_confirmed"
  | "source_ready_waiting_for_activity"
  | "not_observed_but_expected"
  | "future_only_quiet"
  | "runtime_export_required"
  | "provider_required"
  | "admin_truth_source_required"
  | "billing_required"
  | "source_missing";

export type LiveEvidenceSystemId =
  | "auth_signup_login_session_restore"
  | "wallet_payment_gumdrop_ledger"
  | "drops_open_unlock_unwrap_watch"
  | "creator_profile_discovery_follow"
  | "creator_monetization_fan_pass_entitlements"
  | "chat_open_thread_message_block_error"
  | "daily_tasks_reward_reset"
  | "notifications_pwa_permission_token_intent"
  | "account_settings_delete_export_support"
  | "media_upload_access"
  | "search_discovery"
  | "admin_debug_user_management"
  | "route_runtime_error_health"
  | "cost_runtime_4xx_summaries";

export type LiveEvidenceSource = {
  artifactPath: string;
  sourceKind: "event_fact" | "admin_debug_summary" | "journey_summary" | "ledger_summary" | "route_health_summary" | "error_rate_summary" | "source_contract";
  clearsLiveGate: boolean;
  currentHead?: string | null;
  generatedAtUtc?: string | null;
  sourceStatus: "present" | "missing" | "stale" | "source_only" | "operator_confirmed";
};

export type LiveEvidenceSystemDecision = {
  systemId: LiveEvidenceSystemId;
  label: string;
  gateClass: LiveEvidenceGateClass;
  status: LiveEvidenceStatus;
  expectedLiveEvidenceSource: string;
  evidenceSources: LiveEvidenceSource[];
  liveRuntimeEvidenceStatus: LiveRuntimeEvidenceStatus;
  dailyActivityImport: {
    expectedPath: string;
    foundPaths: string[];
    schema: string;
    hasRecentActivity: boolean;
  };
  freshnessWindowHours: number;
  minimumAcceptableSignal: string;
  privacyRedactionPolicy: string[];
  confidence: LiveEvidenceConfidence;
  scoreImpact: Partial<ScoreDimensions>;
  betaExitImpact: "can_clear_live_gate" | "blocks_until_live_source_connected" | "external_required" | "source_confidence_only";
  fallbackIfMissing: string;
  reason: string;
  nextExactAction: string;
};

export type ManualGateReduction = {
  gate: string;
  beforeClass: "broad_manual" | "mixed_manual_formal";
  afterClass: LiveEvidenceGateClass;
  status: LiveEvidenceStatus;
  replacement: string;
  reason: string;
  blocksBetaExit: boolean;
};

export type LiveEvidenceGateReplacementReport = {
  reportKey: "live-evidence-gate-replacement";
  generatedAtUtc: string;
  currentHead: string;
  broadManualGatesBefore: string[];
  broadManualGatesAfter: string[];
  gatesReplacedByLiveEvidence: ManualGateReduction[];
  visualOnlyManualGatesRemaining: ManualGateReduction[];
  externalProviderGatesRemaining: ManualGateReduction[];
  externalBillingGatesRemaining: ManualGateReduction[];
  liveEvidenceBySystem: LiveEvidenceSystemDecision[];
  sourceMissingLiveEvidence: LiveEvidenceSystemDecision[];
  betaExitReadyBefore: boolean;
  betaExitReadyAfter: false;
  remainingBlockers: string[];
  nextExactSteps: string[];
  validationFailures: string[];
};

export const LIVE_EVIDENCE_PRIVACY_REDACTION_POLICY = [
  "no raw PII",
  "no raw payment/provider IDs",
  "no raw chat/private content",
  "no private media URLs",
  "no tokens",
  "no storage paths",
];

export const BROAD_MANUAL_GATES_BEFORE = [
  "site activity evidence export",
  "admin source sample evidence",
  "provider-backed site activity + deployed route evidence",
  "external billing review",
];
