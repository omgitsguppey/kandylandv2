import type { PublicBetaHealthDimension } from "@/lib/agent-score/core";
import type { BehavioralEventFact } from "@/lib/behavioral/event-fact-contract";
import type { UserJourneyEvent } from "@/lib/behavioral/user-journey-contract";
import type { BodySystemId } from "@/lib/product-integrity/product-body-system-contract";
import type {
  CentralCostSignal,
  CentralDebugSignal,
  CentralMetricFact,
  CentralNormalizerConfidence,
  CentralNormalizerOutput,
  CentralScoreSignal,
} from "./central-normalizer-contract";

export const INTERPRETIVE_BRAIN_CONTRACT_VERSION = "2026.05.interpretive-brain.1";

export type InterpretiveBrainSeverity = "critical" | "p0" | "p1" | "p2" | "p3" | "info";
export type InterpretiveBrainActionability =
  | "fix_now"
  | "score_impacting"
  | "evidence_required"
  | "formal_gate"
  | "monitor"
  | "blocked_external"
  | "informational";
export type InterpretiveBrainRootCause =
  | "source_ready"
  | "normalization_failure"
  | "identity_gap"
  | "missing_body_system"
  | "metric_route_missing"
  | "debug_route_missing"
  | "export_route_missing"
  | "cost_guard_ready"
  | "cost_risk_review"
  | "formal_evidence_missing"
  | "runtime_sample_missing"
  | "admin_truth_sample_missing"
  | "stale_evidence"
  | "in_flight_lane"
  | "unsafe_unknown";
export type InterpretiveBrainFindingType =
  | "product_health"
  | "user_journey"
  | "failure_cause"
  | "cost_risk"
  | "score_impact"
  | "formal_gate";

export interface SourceEvidenceInput {
  evidenceId: string;
  status: string;
  confidence?: CentralNormalizerConfidence;
  detail?: string;
}

export interface FormalEvidenceInput {
  gateId: string;
  status: "passed" | "formal_artifact_missing" | "operator_review" | "runtime_unverified" | "provider_unverified" | string;
  owner: string;
  nextAction: string;
}

export interface StaleArtifactInput {
  artifactPath: string;
  status: "current" | "stale_artifact_refresh_needed" | "in_flight" | string;
  nextAction: string;
}

export interface RuntimeSampleInput {
  sampleId: string;
  status: "present" | "missing" | "runtime_unverified" | string;
  nextAction: string;
}

export interface AdminTruthSampleInput {
  sampleId: string;
  status: "present" | "missing" | "formal_artifact_missing" | string;
  nextAction: string;
}

export interface ScoreDimensionInput {
  dimension: PublicBetaHealthDimension;
  score: number;
  nextAction: string;
  reason: string;
}

export interface InterpretiveBrainInput extends Omit<Partial<CentralNormalizerOutput>,
  "normalizedEventFact"
  | "globalMetricFact"
  | "userMetricFact"
  | "journeyEvent"
  | "debugSignal"
  | "scoreSignal"
  | "costSignal"
> {
  normalizedEventFact?: BehavioralEventFact | null;
  globalMetricFact?: CentralMetricFact | null;
  userMetricFact?: CentralMetricFact | null;
  journeyEvent?: UserJourneyEvent | null;
  debugSignal?: CentralDebugSignal | null;
  scoreSignal?: CentralScoreSignal | null;
  costSignal?: CentralCostSignal | null;
  sourceEvidence?: SourceEvidenceInput[];
  formalEvidence?: FormalEvidenceInput[];
  staleArtifact?: StaleArtifactInput[];
  runtimeSample?: RuntimeSampleInput[];
  adminTruthSample?: AdminTruthSampleInput[];
  scoreDimensions?: ScoreDimensionInput[];
}

export interface InterpretiveBrainNextAction {
  actionId: string;
  action: string;
  validator: string;
  owner?: string;
}

export interface BaseInterpretiveFinding {
  findingType: InterpretiveBrainFindingType;
  findingId: string;
  bodySystem: BodySystemId | "missing";
  severity: InterpretiveBrainSeverity;
  actionability: InterpretiveBrainActionability;
  rootCause: InterpretiveBrainRootCause;
  evidence: string[];
  scoreDimension: PublicBetaHealthDimension | "formalGate" | "none";
  estimatedPointImpact: number;
  owner: string;
  nextAction: InterpretiveBrainNextAction;
  blockedBy: string[];
  confidence: CentralNormalizerConfidence;
  duplicateChildren?: string[];
}

export type ProductHealthFinding = BaseInterpretiveFinding & { findingType: "product_health" };
export type UserJourneyFinding = BaseInterpretiveFinding & { findingType: "user_journey" };
export type FailureCauseFinding = BaseInterpretiveFinding & { findingType: "failure_cause" };
export type CostRiskFinding = BaseInterpretiveFinding & { findingType: "cost_risk" };
export type ScoreImpactFinding = BaseInterpretiveFinding & { findingType: "score_impact" };
export type FormalGateFinding = BaseInterpretiveFinding & { findingType: "formal_gate" };

export type InterpretiveBrainFinding =
  | ProductHealthFinding
  | UserJourneyFinding
  | FailureCauseFinding
  | CostRiskFinding
  | ScoreImpactFinding
  | FormalGateFinding;

export interface InterpretiveBrainTopAction {
  findingId: string;
  bodySystem: BodySystemId | "missing";
  severity: InterpretiveBrainSeverity;
  rootCause: InterpretiveBrainRootCause;
  scoreDimension: PublicBetaHealthDimension | "formalGate" | "none";
  nextAction: string;
  validator: string;
  owner: string;
}

export interface InterpretiveBrainDebugLane {
  label: "Product brain";
  topActionCount: number;
  criticalFindingCount: number;
  bodySystemsHealthy: number;
  bodySystemsDegraded: number;
  bodySystemsBlocked: number;
  scoreBelow80Reasons: number;
  formalGateFindings: number;
  costRiskFindings: number;
  staleArtifactFindings: number;
  inFlightFindings: number;
  unsafeUnknownCount: number;
  defaultView: "product_brain_summary";
  rawLanesDefaultOpen: false;
  sourceOfTruth: "src/lib/product-integrity/interpretive-brain.ts";
}

export interface InterpretiveBrainOperatorSummary {
  defaultView: "product_brain_summary";
  rawLanesDefaultOpen: false;
  rawDetailPolicy: "drilldown_only";
  topActions: InterpretiveBrainTopAction[];
  bodySystemStatus: Record<string, "healthy" | "degraded" | "blocked">;
  scoreBelow80Reasons: Array<{
    dimension: PublicBetaHealthDimension;
    reason: string;
    nextAction: string;
  }>;
  formalGates: InterpretiveBrainFinding[];
  costRisks: InterpretiveBrainFinding[];
  staleArtifacts: InterpretiveBrainFinding[];
  inFlightLanes: InterpretiveBrainFinding[];
  findings: InterpretiveBrainFinding[];
  debugLane: InterpretiveBrainDebugLane;
  hiddenCriticalCount: 0;
}

export type InterpretiveBrainDirtyClassification =
  | "current_generated_artifact_to_commit"
  | "stale_generated_artifact_to_regenerate"
  | "stale_debug_triage_logic_to_remove"
  | "duplicate_debug_summary_to_retire"
  | "in_flight_artifact_to_leave_alone"
  | "unrelated_agent_context_file_to_ignore"
  | "real_source_change_needs_review"
  | "release_artifact_expected"
  | "test_artifact_expected"
  | "documentation_artifact_expected"
  | "validator_artifact_expected"
  | "unsafe_unknown";

export interface InterpretiveBrainDirtyFile {
  path: string;
  classification: InterpretiveBrainDirtyClassification;
}

export interface InterpretiveBrainOpenPullRequest {
  number: number;
  title: string;
  url: string;
  mergeStateStatus?: string;
  isDraft?: boolean;
  classification: string;
}

export interface InterpretiveBrainDebugTriageReport {
  reportKey: "interpretive-brain-debug-triage";
  contractVersion: string;
  generatedAtUtc: string;
  currentHead?: string;
  status: "pass" | "fail";
  productionReadsPerformed: false;
  providerCallsPerformed: false;
  paidAiRuntimeCallsAllowed: false;
  findings: InterpretiveBrainFinding[];
  operatorSummary: InterpretiveBrainOperatorSummary;
  debugLane: InterpretiveBrainDebugLane;
  dirtyFiles: InterpretiveBrainDirtyFile[];
  openPullRequests: InterpretiveBrainOpenPullRequest[];
  scoreDimensions: PublicBetaHealthDimension[];
  duplicateDebugFindingsCollapsed: number;
  rawDebugLanesDefaultOpen: false;
  remainingGaps: string[];
  nextExactSteps: string[];
  validationFailures: string[];
}
