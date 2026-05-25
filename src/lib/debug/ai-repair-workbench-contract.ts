export type AiRepairSourceKind =
  | "route_runtime_failure"
  | "pipeline_failure"
  | "orchestration_finding"
  | "creator_onboarding_issue"
  | "telemetry_gap"
  | "materializer_gap"
  | "stale_artifact"
  | "formal_evidence_required"
  | "bug_report"
  | "task_issue"
  | "queue_continuity_gap"
  | "dependency_gap"
  | "commerce_ledger_gap"
  | "no_sample_gap"
  | "manual_operator_note";

export type AiRepairSeverity = "critical" | "high" | "medium" | "low" | "info";
export type AiRepairRisk = "security" | "privacy" | "cost" | "revenue" | "data_integrity" | "ux" | "ops" | "none";

export type AiRepairWorkItemStatus =
  | "detected"
  | "grouped"
  | "preflight_ready"
  | "blocked_missing_context"
  | "deterministic_plan_ready"
  | "ai_plan_ready"
  | "critic_required"
  | "critic_passed"
  | "critic_rejected"
  | "human_approval_required"
  | "apply_ready"
  | "applied"
  | "dismissed"
  | "archived";

export type AiRepairMode =
  | "inspect_only"
  | "artifact_refresh"
  | "source_patch_candidate"
  | "formal_evidence_request"
  | "manual_operator_action"
  | "not_planned";

export type AiRepairApplyEligibility =
  | "inspect_only"
  | "critic_required"
  | "human_approval_required"
  | "manual_patch_required"
  | "apply_ready";

export type AiRepairRedactionClass = "public" | "internal" | "sensitive" | "restricted";

export type AiRepairWorkItem = {
  workItemId: string;
  title: string;
  sourceKind: AiRepairSourceKind;
  sourceRef: string;
  owner: string;
  severity: AiRepairSeverity;
  scoreImpact: number;
  risk: AiRepairRisk[];
  status: AiRepairWorkItemStatus;
  sourceEvidence: string[];
  redactionClass: AiRepairRedactionClass;
  allowedModes: AiRepairMode[];
  selectedMode: AiRepairMode;
  applyEligibility: AiRepairApplyEligibility;
  validators: string[];
  filesToInspect: string[];
  filesPotentiallyTouched: string[];
  rollbackPlan: string;
  nextAction: string;
};

export type AiRepairWorkItemGroup = {
  groupId: string;
  title: string;
  sourceKind: AiRepairSourceKind;
  count: number;
  priorityScore: number;
  severity: AiRepairSeverity;
  selectedMode: AiRepairMode;
  applyEligibility: AiRepairApplyEligibility;
  workItemIds: string[];
  sourceRefs: string[];
  nextAction: string;
};

export type AiRepairApprovalState =
  | "not_applicable"
  | "critic_required"
  | "critic_passed_human_required"
  | "human_approved"
  | "rejected"
  | "applied"
  | "archived";

export type AiRepairCriticRisk = "low" | "medium" | "high";
export type AiRepairCriticResult =
  | "pass_to_human_review"
  | "revise_required"
  | "reject_unsafe"
  | "inspect_only"
  | "formal_evidence_required"
  | "manual_operator_action";

export type AiRepairCriticReview = {
  criticId: string;
  proposalId: string;
  result: AiRepairCriticResult;
  issues: string[];
  securityRisk: AiRepairCriticRisk;
  privacyRisk: AiRepairCriticRisk;
  costRisk: AiRepairCriticRisk;
  dataIntegrityRisk: AiRepairCriticRisk;
  paymentGumdropRisk: AiRepairCriticRisk;
  testCoverageRisk: AiRepairCriticRisk;
};

export type AiRepairApproval = {
  status: AiRepairApprovalState;
  humanApprovalRequired: boolean;
  applyAllowed: boolean;
  approvedBy: string | null;
  approvedAt: string | null;
  reason: string;
};

export type AiRepairProposal = {
  proposalId: string;
  workItemId: string;
  mode: AiRepairMode;
  status: AiRepairApprovalState | "manual_patch_required";
  createdAt: string;
  createdBy: string;
  source: "deterministic" | "live_ai" | "manual";
  filesToChange: string[];
  patchSummary: string;
  validators: string[];
  criticReview: AiRepairCriticReview | null;
  approval: AiRepairApproval;
  applyResult: AiRepairApplyResult | null;
  rollbackPlan: string;
  auditTrail: string[];
  autoApplyAllowed: boolean;
  criticRequired: boolean;
  humanApprovalRequired: boolean;
};

export type AiRepairApplyResult = {
  status: "manual_patch_required" | "artifact_refresh_ready" | "not_applicable" | "rejected";
  sourceMutationAllowed: boolean;
  productionMutationAllowed: boolean;
  instructions: string[];
  validators: string[];
  rollbackPlan: string;
};

export type AiRepairContextPacket = {
  packetId: string;
  workItemId: string;
  boundedEvidence: string[];
  safeSourceSnippets: string[];
  artifactRefs: string[];
  validatorRefs: string[];
  routeRefs: string[];
  redactedUserFacts: string[];
  forbiddenPayloadsDetected: string[];
  tokenEstimate: number;
  maxInputTokens: number;
  modelRole: "admin_debug_assistant" | "admin_debug_fix_planner";
  privacyDecision: "safe" | "redacted" | "blocked_for_manual_review";
  costDecision: "within_budget" | "blocked_token_budget";
  sourceCompletenessScore: number;
  missingContextReasons: string[];
  providerCallRequired: false;
  selectedModeAfterSafety: AiRepairMode;
};

export type AiRepairPlannerStatus =
  | "not_requested"
  | "deterministic_plan_ready"
  | "ai_plan_ready"
  | "provider_blocked"
  | "provider_failed";

export type AiRepairWorkbench = {
  status: "async_repair_workbench_ready";
  fallbackStatus: "deterministic_fallback_summary" | "live_model_summary" | "saved_guidance";
  livePlannerStatus: AiRepairPlannerStatus;
  providerCallsInTests: false;
  contextPacketStatus: "ready" | "blocked_for_redaction" | "missing";
  redactionStatus: "raw_payloads_blocked" | "safe";
  workItems: AiRepairWorkItem[];
  workItemGroups: AiRepairWorkItemGroup[];
  proposalQueue: AiRepairProposal[];
  routePreflightStatus: "current" | "stale" | "no_sample" | "failed" | "unknown";
  counts: {
    workItems: number;
    inspectOnly: number;
    sourcePatchCandidates: number;
    formalEvidenceRequests: number;
    manualOperatorActions: number;
    criticRequired: number;
    criticPassed: number;
    humanApprovalRequired: number;
    applyReady: number;
    autoApplyAllowed: number;
  };
  scoreBefore: number;
  scoreAfter: number;
  scoreDimensions: Record<string, { before: number; after: number }>;
  remainingGaps: string[];
  nextExactSteps: string[];
};

export const AI_REPAIR_SCORE_DIMENSIONS = [
  "workItemStructure",
  "contextSafety",
  "triageDeterminism",
  "criticApproval",
  "applySafety",
] as const;
