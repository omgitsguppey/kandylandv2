import type { DebugBacklogItem } from "./debug-backlog-contract";

export type AiDebugCriticStatus = "pass" | "request_changes" | "blocked";

export type AiDebugCriticCheckId =
  | "no_patch_on_top_of_stale_logic"
  | "no_duplicate_systems"
  | "no_fake_evidence"
  | "no_formal_gate_cleared_without_artifact"
  | "no_monolith_growth_without_split_plan"
  | "no_chat_nav_touch_without_explicit_request"
  | "no_payment_math_change_without_explicit_request"
  | "no_unowned_debug_warning"
  | "no_orphaned_telemetry"
  | "no_hardcoded_ui_scale_regression"
  | "no_new_cost_path_without_guard"
  | "no_source_ready_as_runtime_proof";

export type AiDebugCriticFindingSeverity = "blocker" | "required" | "warning" | "info";

export type AiDebugCriticCheck = {
  id: AiDebugCriticCheckId;
  label: string;
  failureMode: string;
};

export type AiDebugCriticFinding = {
  id: string;
  check: AiDebugCriticCheckId;
  severity: AiDebugCriticFindingSeverity;
  title: string;
  detail: string;
  sourceFiles: string[];
  requiredFix: string;
  suggestedValidators: string[];
};

export type AiDebugCriticMonolithRisk = {
  file: string;
  lineCount: number;
  limit: number;
  splitPlanRequired: true;
};

export type AiDebugCriticGateBlocker = {
  id: string;
  label: string;
  evidenceStatus: string;
  requiredArtifact: string;
};

export type AiDebugCriticInput = {
  changedFiles: string[];
  proposedFixSummary?: string;
  explicitRequest?: {
    chatNav?: boolean;
    paymentMath?: boolean;
  };
  debugBacklog?: DebugBacklogItem[];
  betaScoreBlockers?: AiDebugCriticGateBlocker[];
  doctrineIndex?: {
    surfaces?: string[];
  };
  validatorMap?: {
    suggestedValidators?: string[];
  };
  routeDiagnostics?: {
    routes?: string[];
  };
  telemetryGraph?: {
    canonicalEventFiles?: string[];
    changedTelemetryFiles?: string[];
  };
  costReadiness?: {
    guardedCostPaths?: string[];
  };
  evidenceStatus?: {
    formalArtifacts?: string[];
    sourceOnlyClaims?: string[];
  };
  fileLineCounts?: Record<string, number>;
};

export type AiDebugCriticReport = {
  generatedAt: string;
  reportKey: "ai-debug-critic";
  criticStatus: AiDebugCriticStatus;
  checks: AiDebugCriticCheck[];
  findings: AiDebugCriticFinding[];
  requiredFixes: string[];
  suggestedValidators: string[];
  unsafeChanges: string[];
  duplicateSystems: string[];
  monolithRisks: AiDebugCriticMonolithRisk[];
  evidenceMisclassificationRisks: string[];
  sourceOnly: true;
  externalAiCallsAllowed: false;
};

export type AiDebugCriticSummary = {
  totalFindings: number;
  blockedFindings: number;
  requiredFindings: number;
  warningFindings: number;
  unsafeChangeCount: number;
  duplicateSystemCount: number;
  monolithRiskCount: number;
  evidenceMisclassificationRiskCount: number;
};
