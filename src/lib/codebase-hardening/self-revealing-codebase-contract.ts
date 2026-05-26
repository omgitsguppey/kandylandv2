import type { BodySystemId } from "@/lib/product-integrity/product-body-system-contract";
import type { PublicBetaHealthDimension } from "@/lib/agent-score/core";

export type SelfRevealingFindingDomain =
  | "orphaned_limb"
  | "duplicate_formula"
  | "stale_artifact"
  | "broken_telemetry_chain"
  | "missing_metric_materializer"
  | "missing_debug_lane"
  | "score_drag_root_cause"
  | "cost_owner_review_lane"
  | "raw_runtime_issue"
  | "in_flight_lane"
  | "formal_evidence_requirement"
  | "legacy_recovery_candidate"
  | "unsafe_unknown";

export type SelfRevealingFinding = {
  findingId: string;
  domain: SelfRevealingFindingDomain;
  bodySystem: BodySystemId | "repo_governance";
  sourcePath: string;
  owner: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  actionability: "fix_now" | "classify" | "monitor" | "manual_review" | "external_evidence_required";
  rootCause: string;
  exactNextAction: string;
  validator: string;
  scoreImpact: PublicBetaHealthDimension[];
  costImpact: "none" | "low" | "medium" | "high";
  accuracyImpact: "none" | "low" | "medium" | "high";
  userVisibleImpact: string;
  adminVisibleImpact: string;
};

export type SelfRevealingCodebaseReport = {
  reportKey: "self-revealing-codebase";
  generatedAtUtc: string;
  status: "pass" | "review" | "fail";
  productionReadsPerformed: false;
  providerCallsPerformed: false;
  deployPerformed: false;
  findings: SelfRevealingFinding[];
};
