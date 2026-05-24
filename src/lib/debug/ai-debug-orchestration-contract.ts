export type AiDebugWorkItemSource =
  | "task_issue"
  | "bug_report"
  | "route_diagnostic"
  | "panel_log"
  | "telemetry_gap"
  | "stale_artifact"
  | "repair_proposal"
  | "manual_operator_note";

export type AiDebugWorkItemStatus =
  | "queued"
  | "preflight_ready"
  | "blocked_missing_context"
  | "deterministic_only"
  | "ai_plan_ready"
  | "critic_review_required"
  | "repair_proposed"
  | "inspect_only"
  | "human_approval_required"
  | "applied"
  | "dismissed"
  | "archived";

export type AiDebugPrivacyClass = "public" | "internal" | "sensitive" | "restricted";
export type AiDebugRedactionPolicy = "none" | "strip_user_bodies" | "hash_identifiers" | "metadata_only";
export type AiDebugContaminationRisk = "none" | "low" | "medium" | "high";
export type AiDebugApplyEligibility = "inspect_only" | "human_approval_required" | "deterministic_allowlist_only";

export type AiDebugWorkItem = {
  workItemId: string;
  source: AiDebugWorkItemSource;
  severity: "info" | "p3" | "p2" | "p1" | "p0" | "critical";
  owner: string;
  status: AiDebugWorkItemStatus;
  scoreImpact: number;
  privacyClass: AiDebugPrivacyClass;
  sourceRefs: string[];
  redactionPolicy: AiDebugRedactionPolicy;
  contaminationRisk: AiDebugContaminationRisk;
  applyEligibility: AiDebugApplyEligibility;
  nextAction: string;
};

export type AiDebugContextPacket = {
  packetId: string;
  workItemId: string;
  boundedSourceFacts: string[];
  redactedUserSupportTaskFacts: string[];
  relevantFileRefs: string[];
  validatorRefs: string[];
  scoreDebugRefs: string[];
  forbiddenPayloadFlags: string[];
  tokenEstimate: number;
  maxTokenBudget: number;
  modelRole: "admin_debug_assistant" | "admin_debug_fix_planner";
  deterministicPreflight: {
    status: "pass" | "blocked";
    reasons: string[];
  };
};

export type AiDebugRepairProposalMode =
  | "inspect_only"
  | "source_patch_candidate"
  | "artifact_refresh"
  | "formal_evidence_request"
  | "manual_operator_action"
  | "not_planned";

export type AiDebugRepairProposal = {
  proposalId: string;
  workItemId: string;
  mode: AiDebugRepairProposalMode;
  filesToInspect: string[];
  filesToChange: string[];
  validatorsToRun: string[];
  rollbackPlan: string;
  humanApprovalRequired: boolean;
  autoApplyAllowed: boolean;
  riskScore: number;
  criticReviewRequired?: boolean;
};

export type AiDebugCriticReviewResult =
  | "pass_to_human_review"
  | "revise_required"
  | "reject_unsafe"
  | "inspect_only"
  | "formal_evidence_required"
  | "manual_operator_action";

export type AiDebugCriticRisk = "low" | "medium" | "high";

export type AiDebugCriticReview = {
  criticId: string;
  proposalId: string;
  result: AiDebugCriticReviewResult;
  issues: string[];
  securityRisk: AiDebugCriticRisk;
  costRisk: AiDebugCriticRisk;
  privacyRisk: AiDebugCriticRisk;
  correctnessRisk: AiDebugCriticRisk;
  testCoverageRisk: AiDebugCriticRisk;
};

export const AI_DEBUG_SCORE_DIMENSIONS = [
  "sourceHealth",
  "runtimeHealth",
  "evidenceCompleteness",
  "freshness",
  "costRisk",
  "regressionRisk",
] as const;
