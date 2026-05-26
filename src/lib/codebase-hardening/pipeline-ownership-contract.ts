import type { PublicBetaHealthDimension } from "@/lib/agent-score/core";

export type PipelineOwnershipStage =
  | "feature_surface_registry"
  | "central_normalizer"
  | "event_envelope"
  | "event_fact"
  | "person_global_metrics"
  | "session_watch_journey_math"
  | "source_of_funds_revenue_entitlement_math"
  | "debug_interpretive_brain"
  | "score_evidence_cost"
  | "display_state";

export type PipelineOwnershipStatus = "owned" | "missing_owner" | "duplicate_owner" | "bypassed" | "exempted";
export type PipelineOwnershipSeverity = "info" | "review" | "blocking";
export type PipelineBypassExemption = "none" | "legacy_alias_documented" | "dry_run_recovery_only" | "formal_evidence_gate" | "agent_context_mirror";

export type PipelineOwnershipRecord = {
  id: string;
  subject: string;
  stage: PipelineOwnershipStage;
  canonicalOwner: string;
  sourceFiles: string[];
  status: PipelineOwnershipStatus;
  severity: PipelineOwnershipSeverity;
  scoreImpact: PublicBetaHealthDimension[];
  exemption: PipelineBypassExemption;
  reason: string;
  exactNextAction: string;
};

export type PipelineOwnershipAuditReport = {
  reportKey: "pipeline-ownership-audit";
  generatedAtUtc: string;
  status: "pass" | "review" | "fail";
  ownershipStages: PipelineOwnershipRecord[];
  duplicateOwners: PipelineOwnershipRecord[];
  missingOwners: PipelineOwnershipRecord[];
  bypassedPipelines: PipelineOwnershipRecord[];
  productionReadsPerformed: false;
  providerCallsPerformed: false;
};

export const PIPELINE_OWNERSHIP_ORDER: PipelineOwnershipStage[] = [
  "feature_surface_registry",
  "central_normalizer",
  "event_envelope",
  "event_fact",
  "person_global_metrics",
  "session_watch_journey_math",
  "source_of_funds_revenue_entitlement_math",
  "debug_interpretive_brain",
  "score_evidence_cost",
  "display_state",
];
