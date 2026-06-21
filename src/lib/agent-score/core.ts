import {
  PUBLIC_BETA_BLAST_RADIUS_MULTIPLIERS,
  PUBLIC_BETA_DOMAIN_WEIGHTS,
  PUBLIC_BETA_EVIDENCE_SCORE_CAPS,
  PUBLIC_BETA_EVIDENCE_WEIGHTS,
  PUBLIC_BETA_HEALTH_DIMENSION_WEIGHTS,
  PUBLIC_BETA_SEVERITY_PENALTIES,
  PUBLIC_BETA_STATUS_THRESHOLDS,
} from "./weights";
import {
  resolveEvidenceQuality,
  scoreCostReadiness,
  scoreRegressionRisk,
  evidenceArtifactIsPassing,
  evidenceArtifactNumericValue,
  evidenceArtifactStatusText,
  type PublicBetaEvidenceFreshnessState,
  type PublicBetaEvidenceQuality,
} from "./evidence-quality";
import {
  describeFreshnessState,
  normalizeTechnicalFreshnessTerms,
} from "./freshness-language";
import { buildFormalEvidenceBridgeReport } from "./formal-evidence-bridge";
import { buildAlgorithmicEvidencePolicyReport } from "./algorithmic-evidence-policy";
import {
  buildBelowTargetDimensionExplanations,
  summarizeNonEventScorePolicy,
  type NonEventScorePolicySummary,
  type ScoreDimensionExplanation,
} from "./non-event-score-policy";
import type { DebugEvidenceAuditSummary } from "../debug-evidence-contract";

export type PublicBetaDomain = keyof typeof PUBLIC_BETA_DOMAIN_WEIGHTS;
export type PublicBetaSeverity = keyof typeof PUBLIC_BETA_SEVERITY_PENALTIES;
export type PublicBetaBlastRadius = keyof typeof PUBLIC_BETA_BLAST_RADIUS_MULTIPLIERS;
export type PublicBetaStatus = "clean" | "pass" | "warning" | "beta-risk" | "fail";
export type PublicBetaReadinessStatus =
  | "Ready"
  | "Ready with smoke required"
  | "Source validation only"
  | "Source evidence required"
  | "External proof required"
  | "Needs review"
  | "Blocked"
  | "Unknown evidence"
  | "Stale evidence"
  | "Runtime unverified";
export type PublicBetaDocsBasis = "google" | "apple" | "kandydrops" | "repo";
export type PublicBetaHealthDimension =
  | "sourceHealth"
  | "runtimeHealth"
  | "evidenceCompleteness"
  | "freshness"
  | "costRisk"
  | "regressionRisk";
export type PublicBetaGateConfidence = "high" | "medium" | "low" | "none";
export type PublicBetaLaunchGateStatus =
  | "source_ready"
  | "runtime_proven"
  | "evidence_complete"
  | "owner_review"
  | "launch_ready"
  | "blocked";
export type PublicBetaHealthGate = {
  id: string;
  dimension: PublicBetaHealthDimension;
  score: number;
  maxScore: number;
  confidence: PublicBetaGateConfidence;
  evidenceQuality: PublicBetaEvidenceQuality;
  freshness: PublicBetaEvidenceFreshnessState;
  blocksLaunch: boolean;
  reason: string;
};
export type PublicBetaHealthScoreBreakdown = Record<PublicBetaHealthDimension, {
  weight: number;
  score: number;
  reasons: string[];
}>;

export type PublicBetaGeneratedReportEvidence = {
  path: string;
  generatedAt?: string;
  sourceCommit?: string;
  freshness?: "fresh" | "stale" | "unknown" | "missing";
  ageHours?: number;
  currentHead?: string;
};

export type PublicBetaEvidenceStatus =
  | "missing_formal_evidence"
  | "operator_reported_not_formal_provider_smoke"
  | "runtime_unverified"
  | "missing_or_unknown"
  | "passed"
  | "failed"
  | "stale"
  | "unavailable"
  | "needs_review"
  | "tracked_not_passing";

export type PublicBetaEvidenceArtifact = {
  path: string;
  status: PublicBetaEvidenceStatus | string;
  passed: boolean;
  detail: string;
  evidence: string[];
  generatedAtUtc?: string;
  sourceCommit?: string;
};

export type PublicBetaCostReadinessStatus =
  | "source_inventory_complete"
  | "source_guarded_external_review_remaining"
  | "source_ready_no_runtime_usage_detected"
  | "source_ready_config_missing_safe"
  | "source_ready_retry_storm_guarded"
  | "source_ready_batched_or_cached"
  | "owner_review_external_billing_required"
  | "cost_review_required"
  | "not_detected_in_repo"
  | "config_not_in_repo"
  | "owner_review"
  | "missing_inventory"
  | "blocked";

export type PublicBetaCostReadinessLane = {
  status: PublicBetaCostReadinessStatus | string;
  detail: string;
  evidence: string[];
  blocksBetaExit: boolean;
};

export type PublicBetaCostReadiness = {
  cloudRunCostReadiness: PublicBetaCostReadinessLane;
  cloudSqlCostReadiness: PublicBetaCostReadinessLane;
  geminiCloudAssistCostReadiness: PublicBetaCostReadinessLane;
  route4xxReadiness: PublicBetaCostReadinessLane;
};

export type PublicBetaScoreExplanation = {
  scannerScoreMeaning: string;
  evidenceScoreMeaning: string;
  missingEvidenceCaps: string[];
  staleReportHandling: string;
  sourcePassConfidence: string;
  betaExitBlockedBy: string[];
};

export type PublicBetaOperatorFinalVisualSurface = {
  surfaceId: string;
  status:
    | "source_surface_checked"
    | "source_surface_gap"
    | "not_required";
  needsOperatorReview: boolean;
};

export type PublicBetaOperatorFinalChecks = {
  uiVisualSurfaces: {
    status:
      | "source_surface_checked"
      | "source_surface_gap"
      | "not_required";
    needsOperatorReview: boolean;
    passedInCodex: boolean;
    sourceChecksPassed: boolean;
    note: string;
    sourcePath: string;
    surfaces: PublicBetaOperatorFinalVisualSurface[];
  };
};

export type PublicBetaStudioDashboardSection = {
  id: "audienceActivity" | "runtimeConfidence" | "sourceQuality" | "debugSignal" | "adminHydration" | "needsProof";
  label: string;
  score: number;
  status: "healthy" | "watching" | "needs_attention" | "needs_proof";
  source: string;
  detail: string;
};

export type PublicBetaStudioDashboard = {
  status: "healthy" | "watching" | "needs_attention";
  sections: PublicBetaStudioDashboardSection[];
};

export type PublicBetaLaunchClearance = {
  status: PublicBetaLaunchGateStatus;
  blockers: string[];
  formalGates: {
    providerSmoke: { cleared: boolean; status: string; source: string };
    deployedRuntimeSmoke: { cleared: boolean; status: string; source: string };
    adminTruthSample: { cleared: boolean; status: string; source: string };
    uiSurfaceCoverage: { cleared: boolean; status: string; source: string };
    paymentSourceOfFunds: { cleared: false; status: "protected_not_evaluated_in_source_model"; source: string };
  };
};

export type PublicBetaEvidenceInput = {
  requiredReports?: PublicBetaGeneratedReportEvidence[];
  debugEvidence?: Record<string, DebugEvidenceAuditSummary[]>;
  debugRuntimeEvidenceArtifact?: PublicBetaEvidenceArtifact;
  runtimeSmokeSubstituteMatrixEvidence?: PublicBetaEvidenceArtifact;
  targetedBehaviorEvidence?: PublicBetaEvidenceArtifact;
  sourceBackedRuntimeConfidenceEvidence?: PublicBetaEvidenceArtifact;
  realUsageConfidenceEvidence?: PublicBetaEvidenceArtifact;
  realUsageConfidenceCalibrationEvidence?: PublicBetaEvidenceArtifact;
  behaviorMathEvidence?: PublicBetaEvidenceArtifact;
  uiSurfaceCoverageEvidence?: PublicBetaEvidenceArtifact;
  providerSmokeEvidence?: PublicBetaEvidenceArtifact;
  runtimeSmokeEvidence?: PublicBetaEvidenceArtifact;
  adminTruthSampleEvidence?: PublicBetaEvidenceArtifact;
  costReadiness?: PublicBetaCostReadiness;
  hasTargetedBehaviorEvidence?: boolean;
  hasVisualManualEvidence?: boolean;
  hasProviderSmokeEvidence?: boolean;
  hasAdminTruthSampleEvidence?: boolean;
  openPrTriageFresh?: boolean;
  runtimeCodeChangedSinceReport?: boolean;
  launchWarningCount?: number;
  nonEventScorePolicy?: NonEventScorePolicySummary;
  regressionRiskRefreshEvidence?: {
    highBlastCoverageCurrent?: boolean;
    regressionRiskScore?: number;
    failedLaneCount?: number;
    inFlightLaneCount?: number;
  };
};

export type PublicBetaEvidenceGate = {
  id: keyof typeof PUBLIC_BETA_EVIDENCE_WEIGHTS | "debugRuntimeEvidence" | "algorithmicEvidenceCoverage" | "formalEvidenceBridge";
  label: string;
  weight: number;
  score: number;
  maxScore: number;
  confidence: PublicBetaGateConfidence;
  evidenceQuality: PublicBetaEvidenceQuality;
  freshness: PublicBetaEvidenceFreshnessState;
  sourceCredit: number;
  runtimeCredit: number;
  evidenceCredit: number;
  riskPenalty: number;
  capImpact: number;
  gateRequiredForExit: boolean;
  blocksLaunch: boolean;
  partialReason?: string;
  status: PublicBetaReadinessStatus;
  detail: string;
  evidence: string[];
  recommendedAction: string;
};

export type PublicBetaFinding = {
  id: string;
  domain: PublicBetaDomain;
  category: string;
  title: string;
  severity: PublicBetaSeverity;
  confidence: number;
  blastRadius: PublicBetaBlastRadius;
  filePath: string;
  line?: number;
  excerpt?: string;
  rawPenalty: number;
  weightedPenalty: number;
  canAutofix: boolean;
  autofixConfidence: number;
  autofixPlan?: string;
  escalation: string;
  evidence: string[];
  docsBasis: PublicBetaDocsBasis[];
};

export type PublicBetaScoreReport = {
  generatedAt: string;
  currentHead?: string;
  scoreVersion: "beta_health_v2";
  scannerScore: number;
  scannerStatus: PublicBetaStatus;
  sourceHealthScore: number;
  runtimeHealthScore: number;
  evidenceCompletenessScore: number;
  freshnessScore: number;
  costRiskScore: number;
  regressionRiskScore: number;
  quietFutureActivityCount: number;
  actionableSignalGroupCount: number;
  scoreDragSignalGroupCount: number;
  nonEventScorePenaltyCount: number;
  launchGateStatus: PublicBetaLaunchGateStatus;
  launchBlockers: string[];
  healthScore: number;
  healthScoreBreakdown: PublicBetaHealthScoreBreakdown;
  studioDashboard: PublicBetaStudioDashboard;
  launchClearance: PublicBetaLaunchClearance;
  scoreDimensionExplanations: Record<PublicBetaHealthDimension | "overallHealthScore", ScoreDimensionExplanation>;
  scoreDeltaDrivers: string[];
  nuancedScoreExplanation: string[];
  overallScore: number;
  overallStatus: PublicBetaStatus;
  readinessStatus: PublicBetaReadinessStatus;
  readinessStatusReason: string;
  evidenceScore: number;
  evidenceGates: PublicBetaEvidenceGate[];
  evidenceCapsApplied: string[];
  evidenceCapDetails: string[];
  evidenceWeights: typeof PUBLIC_BETA_EVIDENCE_WEIGHTS;
  scoreExplanation: PublicBetaScoreExplanation;
  operatorFinalChecks: PublicBetaOperatorFinalChecks;
  costReadiness: PublicBetaCostReadiness;
  domainScores: Record<PublicBetaDomain, {
    weight: number;
    score: number;
    status: PublicBetaStatus;
    findingCount: number;
    criticalCount: number;
    majorCount: number;
  }>;
  findings: PublicBetaFinding[];
  dedupedFindingCount: number;
  safeAutofixesAvailable: number;
  safeAutofixesApplied: number;
  recommendedNextActions: string[];
  minimalVerificationCommands: string[];
  refreshPlan?: unknown[];
  staleArtifacts?: unknown[];
  exactRefreshCommands?: string[];
  commandBudget: {
    allowedCommands: string[];
    forbiddenCommands: string[];
    maxCommands: number;
  };
  debugEvidence?: Record<string, DebugEvidenceAuditSummary[]>;
  summary: string;
};

export type PublicBetaFindingInput = Omit<PublicBetaFinding, "id" | "rawPenalty" | "weightedPenalty"> & {
  id?: string;
};

export type PublicBetaScoreOptions = {
  generatedAt?: string;
  recentFiles?: string[];
  safeAutofixesApplied?: number;
  recommendedNextActions?: string[];
  minimalVerificationCommands?: string[];
  currentHead?: string;
  commandBudget: PublicBetaScoreReport["commandBudget"];
  evidence?: PublicBetaEvidenceInput;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function stableHash(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function normalizeScorePath(filePath: string) {
  return filePath.replace(/\\/g, "/").replace(/^\.?\//u, "");
}

function normalizeExcerpt(excerpt?: string) {
  return (excerpt ?? "").replace(/\s+/gu, " ").trim().slice(0, 160);
}

function normalizeTitle(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "");
}

export function resolvePublicBetaStatus(score: number, hasCritical = false): PublicBetaStatus {
  if (hasCritical) {
    return "fail";
  }
  if (score >= PUBLIC_BETA_STATUS_THRESHOLDS.clean) {
    return "clean";
  }
  if (score >= PUBLIC_BETA_STATUS_THRESHOLDS.pass) {
    return "pass";
  }
  if (score >= PUBLIC_BETA_STATUS_THRESHOLDS.warning) {
    return "warning";
  }
  if (score >= PUBLIC_BETA_STATUS_THRESHOLDS.betaRisk) {
    return "beta-risk";
  }
  return "fail";
}

const READINESS_STATUS_RANK: Record<PublicBetaReadinessStatus, number> = {
  Ready: 0,
  "Source validation only": 1,
  "Ready with smoke required": 2,
  "Runtime unverified": 3,
  "Source evidence required": 4,
  "Unknown evidence": 5,
  "Needs review": 6,
  "Stale evidence": 7,
  "External proof required": 8,
  Blocked: 9,
};

function mostSevereReadinessStatus(statuses: PublicBetaReadinessStatus[]) {
  return statuses.reduce<PublicBetaReadinessStatus>((current, status) =>
    READINESS_STATUS_RANK[status] > READINESS_STATUS_RANK[current] ? status : current, "Ready");
}

function readinessStatusToLegacyStatus(status: PublicBetaReadinessStatus, score: number, hasCritical: boolean): PublicBetaStatus {
  if (status === "Blocked" || hasCritical) return "fail";
  if (status === "External proof required" || status === "Stale evidence" || status === "Needs review") return "beta-risk";
  if (status === "Source evidence required" || status === "Unknown evidence" || status === "Runtime unverified") return "warning";
  if (status === "Source validation only" || status === "Ready with smoke required") return score >= PUBLIC_BETA_STATUS_THRESHOLDS.pass ? "pass" : "warning";
  return resolvePublicBetaStatus(score, hasCritical);
}

function capForReadinessStatus(status: PublicBetaReadinessStatus) {
  switch (status) {
    case "Ready with smoke required":
    case "Source validation only":
      return PUBLIC_BETA_EVIDENCE_SCORE_CAPS.readyWithSmokeRequired;
    case "Source evidence required":
      return PUBLIC_BETA_EVIDENCE_SCORE_CAPS.unknownEvidence;
    case "External proof required":
      return PUBLIC_BETA_EVIDENCE_SCORE_CAPS.staleEvidence;
    case "Runtime unverified":
      return PUBLIC_BETA_EVIDENCE_SCORE_CAPS.runtimeUnverified;
    case "Unknown evidence":
      return PUBLIC_BETA_EVIDENCE_SCORE_CAPS.unknownEvidence;
    case "Needs review":
      return PUBLIC_BETA_EVIDENCE_SCORE_CAPS.needsReview;
    case "Stale evidence":
      return PUBLIC_BETA_EVIDENCE_SCORE_CAPS.staleEvidence;
    case "Blocked":
      return PUBLIC_BETA_EVIDENCE_SCORE_CAPS.blocked;
    case "Ready":
      return 100;
  }
}

function summarizeEvidenceGateForCap(gate: PublicBetaEvidenceGate) {
  if (gate.id === "targetedBehaviorTests") {
    if (gate.status === "Source validation only") {
      return `${gate.status}: ${gate.label} - Source behavior passed; runtime, provider-backed, and admin truth lanes still need matching site activity records.`;
    }
    if (gate.status === "Stale evidence") {
      return `${gate.status}: ${gate.label} - Refresh the targeted source validator evidence.`;
    }
    if (gate.status === "Source evidence required" || gate.status === "Unknown evidence") {
      return `${gate.status}: ${gate.label} - Attach targeted source validator evidence.`;
    }
  }

  if (gate.id === "runtimeProviderSmoke") {
    if (gate.status === "External proof required" || gate.status === "Source evidence required") {
      if (gate.freshness === "stale" || gate.freshness === "head_mismatch") {
        return `${gate.status}: ${gate.label} - Refresh provider-backed site activity and deployed runtime route evidence.`;
      }
      return `${gate.status}: ${gate.label} - Produce provider-backed site activity and keep deployed runtime route evidence current.`;
    }
    if (gate.status === "Stale evidence") {
      return `${gate.status}: ${gate.label} - Refresh provider-backed site activity and deployed runtime route evidence.`;
    }
    if (gate.status === "Runtime unverified" || gate.status === "Ready with smoke required") {
      return `${gate.status}: ${gate.label} - Deployed runtime and provider-backed source evidence are still required.`;
    }
  }

  if (gate.id === "adminTruthSamples") {
    if (gate.status === "External proof required" || gate.status === "Source evidence required" || gate.status === "Unknown evidence") {
      if ((gate.status === "External proof required" || gate.status === "Source evidence required") && (gate.freshness === "stale" || gate.freshness === "head_mismatch")) {
        return `${gate.status}: ${gate.label} - Refresh the redacted admin source activity sample.`;
      }
      return `${gate.status}: ${gate.label} - Produce a redacted admin source activity sample.`;
    }
    if (gate.status === "Stale evidence") {
      return `${gate.status}: ${gate.label} - Refresh the redacted admin source activity sample.`;
    }
  }

  if (gate.id === "freshnessIntegrity" && gate.status === "Stale evidence") {
    return `${gate.status}: ${gate.label} - Refresh generated reports that are outside the freshness window.`;
  }

  return `${gate.status}: ${gate.label} - ${normalizeTechnicalFreshnessTerms(gate.recommendedAction || gate.detail)}`;
}

export function evidenceArtifactPassed(
  artifact: PublicBetaEvidenceArtifact | undefined,
  fallbackBoolean?: boolean,
) {
  return evidenceArtifactIsPassing(artifact, fallbackBoolean);
}

export function evidenceArtifactStatus(
  artifact: PublicBetaEvidenceArtifact | undefined,
  fallbackStatus = "missing_formal_evidence",
) {
  return evidenceArtifactStatusText(artifact, fallbackStatus);
}

export function evidenceArtifactDetail(
  artifact: PublicBetaEvidenceArtifact | undefined,
  fallbackDetail: string,
) {
  return normalizeTechnicalFreshnessTerms(artifact?.detail || fallbackDetail);
}

export function evidenceArtifactEvidence(artifact: PublicBetaEvidenceArtifact | undefined) {
  if (!artifact) return [];
  return Array.from(new Set([
    `artifactPath=${artifact.path}`,
    `artifactStatus=${artifact.status}`,
    `artifactPassed=${artifact.passed}`,
    ...(artifact.generatedAtUtc ? [`generatedAtUtc=${artifact.generatedAtUtc}`] : []),
    ...(artifact.sourceCommit ? [`sourceCommit=${artifact.sourceCommit}`] : []),
    `artifactDetail=${normalizeTechnicalFreshnessTerms(artifact.detail)}`,
    ...artifact.evidence.map(normalizeTechnicalFreshnessTerms),
  ]));
}

function evidenceArtifactNumber(artifact: PublicBetaEvidenceArtifact | undefined, key: string) {
  return evidenceArtifactNumericValue(artifact, key);
}

function hasDebugEvidence(debugEvidence?: Record<string, DebugEvidenceAuditSummary[]>) {
  if (!debugEvidence) return false;
  for (const entries of Object.values(debugEvidence)) {
    if (Array.isArray(entries) && entries.length > 0) return true;
  }
  return false;
}

const DEFAULT_COST_READINESS: PublicBetaCostReadiness = {
  cloudRunCostReadiness: {
    status: "missing_inventory",
    detail: "Cloud Run/App Hosting cost inventory was not supplied.",
    evidence: ["costReadiness.cloudRunCostReadiness=missing_inventory"],
    blocksBetaExit: false,
  },
  cloudSqlCostReadiness: {
    status: "missing_inventory",
    detail: "Cloud SQL cost inventory was not supplied.",
    evidence: ["costReadiness.cloudSqlCostReadiness=missing_inventory"],
    blocksBetaExit: false,
  },
  geminiCloudAssistCostReadiness: {
    status: "missing_inventory",
    detail: "Gemini, Cloud Assist, and Vertex cost inventory was not supplied.",
    evidence: ["costReadiness.geminiCloudAssistCostReadiness=missing_inventory"],
    blocksBetaExit: false,
  },
  route4xxReadiness: {
    status: "missing_inventory",
    detail: "Route 4xx inventory was not supplied.",
    evidence: ["costReadiness.route4xxReadiness=missing_inventory"],
    blocksBetaExit: false,
  },
};

function buildScoreExplanation(input: {
  scannerScore: number;
  scannerStatus: PublicBetaStatus;
  evidenceScore: number;
  healthScore: number;
  launchGateStatus: PublicBetaLaunchGateStatus;
  readinessStatus: PublicBetaReadinessStatus;
  evidenceGates: PublicBetaEvidenceGate[];
  evidenceCapDetails: string[];
}): PublicBetaScoreExplanation {
  const blockedBy = input.evidenceGates
    .filter((gate) => gate.status !== "Ready")
    .map((gate) => `${gate.label}: ${gate.status}`);

  return {
    scannerScoreMeaning: `Scanner score ${input.scannerScore}/100 (${input.scannerStatus}) is scanner-only source hygiene, not beta readiness.`,
    evidenceScoreMeaning: `Evidence score ${input.evidenceScore}/100 is partial-credit evidence confidence. Missing required lanes block launch and reduce evidence credit, but they do not erase unrelated source health. Health score ${input.healthScore}/100 currently maps to launch gate ${input.launchGateStatus}.`,
    missingEvidenceCaps: input.evidenceCapDetails,
    staleReportHandling: "Legacy launch/readiness reports are evidence snapshots and must be classified before they affect freshness math.",
    sourcePassConfidence: "Source-pass lanes increase confidence, but source passing does not clear provider, runtime, admin truth, or cost owner-review lanes unless matching source activity records are present. Deterministic UI surface coverage is the default UI readiness lane; browser reproduction is optional only after a source-reported issue.",
    betaExitBlockedBy: blockedBy,
  };
}

function readEvidenceListValue(artifact: PublicBetaEvidenceArtifact | undefined, key: string) {
  const prefix = `${key}=`;
  const entry = artifact?.evidence.find((item) => item.startsWith(prefix));
  if (!entry) return [];
  return entry.slice(prefix.length).split(",").map((item) => item.trim()).filter(Boolean);
}

function buildOperatorFinalChecks(uiSurfaceCoverageEvidence?: PublicBetaEvidenceArtifact): PublicBetaOperatorFinalChecks {
  const requiredSurfaceIds = readEvidenceListValue(uiSurfaceCoverageEvidence, "uiVisualSmoke.requiredSurfaces");
  const pendingSurfaceIds = readEvidenceListValue(uiSurfaceCoverageEvidence, "uiVisualSmoke.missingSurfaces");
  const statusText = String(uiSurfaceCoverageEvidence?.status ?? "source_surface_checks_failed");
  const status: PublicBetaOperatorFinalVisualSurface["status"] =
    statusText === "source_surface_checks_current" || statusText === "source_surface_checked"
      ? "source_surface_checked"
      : statusText === "source_surface_checks_failed" || statusText === "source_surface_gap"
        ? "source_surface_gap"
        : statusText === "not_required"
          ? "not_required"
          : "source_surface_gap";
  const surfaceIds = requiredSurfaceIds.length > 0 ? requiredSurfaceIds : pendingSurfaceIds;
  const pendingSet = new Set(pendingSurfaceIds);
  const sourceChecksPassed = uiSurfaceCoverageEvidence?.passed === true || status === "source_surface_checked" || status === "not_required";
  const needsOperatorReview = status === "source_surface_gap" || pendingSurfaceIds.length > 0;

  return {
    uiVisualSurfaces: {
      status: needsOperatorReview ? status : "source_surface_checked",
      needsOperatorReview,
      passedInCodex: sourceChecksPassed,
      sourceChecksPassed,
      note: "deterministic UI surface coverage is the default UI readiness lane; browser reproduction is optional only to reproduce a source-reported UI issue and does not clear provider/runtime/admin truth.",
      sourcePath: uiSurfaceCoverageEvidence?.path ?? "agent/state/ui-visual-smoke-minimal.generated.json",
      surfaces: surfaceIds.map((surfaceId) => ({
        surfaceId,
        status: pendingSet.has(surfaceId) ? "source_surface_gap" : status,
        needsOperatorReview: pendingSet.has(surfaceId),
      })),
    },
  };
}

function confidenceFromNumeric(confidence: number): PublicBetaGateConfidence {
  if (confidence >= 0.85) return "high";
  if (confidence >= 0.5) return "medium";
  if (confidence > 0) return "low";
  return "none";
}

function buildEvidenceGate(input: {
  id: PublicBetaEvidenceGate["id"];
  label: string;
  weight: number;
  status: PublicBetaReadinessStatus;
  detail: string;
  evidence: string[];
  recommendedAction: string;
  quality: ReturnType<typeof resolveEvidenceQuality>;
  gateRequiredForExit: boolean;
  sourceCredit?: number;
  runtimeCredit?: number;
}) {
  const sourceCredit = roundScore(input.sourceCredit ?? input.quality.partialCredit * 100);
  const runtimeCredit = roundScore(input.runtimeCredit ?? (input.quality.quality === "formal_passed" ? input.quality.partialCredit * 100 : 0));
  const evidenceCredit = roundScore(input.quality.partialCredit * 100);
  const score = roundScore(input.weight * input.quality.partialCredit);
  const blocksLaunch = input.quality.blocksLaunch || input.status === "Blocked";
  return {
    id: input.id,
    label: input.label,
    weight: input.weight,
    score,
    maxScore: input.weight,
    confidence: confidenceFromNumeric(input.quality.confidence),
    evidenceQuality: input.quality.quality,
    freshness: input.quality.freshness,
    sourceCredit,
    runtimeCredit,
    evidenceCredit,
    riskPenalty: roundScore(100 - evidenceCredit),
    capImpact: blocksLaunch ? roundScore(input.weight - score) : 0,
    gateRequiredForExit: input.gateRequiredForExit,
    blocksLaunch,
    partialReason: input.quality.partialCredit < 1 ? input.quality.reason : undefined,
    status: input.status,
    detail: input.detail,
    evidence: input.evidence,
    recommendedAction: input.recommendedAction,
  } satisfies PublicBetaEvidenceGate;
}

function summarizeRequiredReportEvidence(reports: PublicBetaGeneratedReportEvidence[] | undefined) {
  const requiredReports = reports ?? [];
  const missingReports = requiredReports.filter((report) => report.freshness === "missing");
  const staleReports = requiredReports.filter((report) => report.freshness === "stale");
  const unknownReports = requiredReports.filter((report) => report.freshness === "unknown" || !report.freshness);
  const commitMismatches = requiredReports.filter((report) =>
    report.sourceCommit && report.currentHead && report.sourceCommit !== report.currentHead);

  if (missingReports.length > 0) {
    return {
      status: "Needs review" as const,
      score: 0,
      detail: `${missingReports.length} required generated report(s) are missing.`,
      evidence: missingReports.map((report) => report.path),
    };
  }
  if (staleReports.length > 0) {
    return {
      status: "Stale evidence" as const,
      score: 0,
      detail: `${staleReports.length} required generated report(s) are older than the freshness window.`,
      evidence: staleReports.map((report) =>
        `${report.path}${typeof report.ageHours === "number" ? ` (${roundScore(report.ageHours)}h old)` : ""}`),
    };
  }
  if (commitMismatches.length > 0) {
    return {
      status: "Needs review" as const,
      score: 0,
      detail: `${commitMismatches.length} generated report(s) were created before the latest code changes.`,
      evidence: commitMismatches.map((report) => report.path),
    };
  }
  if (unknownReports.length > 0) {
    return {
      status: "Source evidence required" as const,
      score: 0,
      detail: `${unknownReports.length} required generated report(s) have unknown freshness.`,
      evidence: unknownReports.map((report) => report.path),
    };
  }
  if (requiredReports.length === 0) {
    return {
      status: "Source evidence required" as const,
      score: 0,
      detail: "No generated report freshness evidence was supplied.",
      evidence: [],
    };
  }
  return {
    status: "Ready" as const,
    score: PUBLIC_BETA_EVIDENCE_WEIGHTS.freshnessIntegrity,
    detail: requiredReports.length > 0
      ? "Required generated reports are fresh for deterministic scoring."
      : "No required generated report freshness evidence was provided.",
    evidence: requiredReports.map((report) => report.path),
  };
}

export function buildPublicBetaEvidenceGates(input: {
  scannerScore: number;
  scannerStatus: PublicBetaStatus;
  hasCritical: boolean;
  evidence?: PublicBetaEvidenceInput;
}) {
  const evidence = input.evidence ?? {};
  const currentHead = evidence.requiredReports?.find((report) => report.currentHead)?.currentHead;
  const reportEvidence = summarizeRequiredReportEvidence(evidence.requiredReports);
  const debugRuntimeEvidenceQuality = resolveEvidenceQuality({
    artifact: evidence.debugRuntimeEvidenceArtifact,
    context: {
      currentHead,
      lane: "debug_runtime_evidence",
      requiredForExit: false,
      requiresRuntimeProof: true,
    },
  });
  const debugRuntimeEvidenceArtifactReady = debugRuntimeEvidenceQuality.quality === "source_ready"
    && String(evidenceArtifactStatus(evidence.debugRuntimeEvidenceArtifact, "missing_or_unknown")).includes("source_ready");
  const debugEvidenceAvailable = hasDebugEvidence(evidence.debugEvidence) || debugRuntimeEvidenceArtifactReady;
  const freshnessStatus = mostSevereReadinessStatus([
    reportEvidence.status,
    evidence.openPrTriageFresh === false || evidence.runtimeCodeChangedSinceReport ? "Needs review" : "Ready",
  ]);
  const freshnessDetail = freshnessStatus === reportEvidence.status && reportEvidence.status !== "Ready"
    ? reportEvidence.detail
    : evidence.runtimeCodeChangedSinceReport
      ? describeFreshnessState({ runtimeCodeChangedSinceReport: true }).userMessage
      : evidence.openPrTriageFresh === false
        ? describeFreshnessState({ openPrTriageFresh: false }).userMessage
        : reportEvidence.detail;
  const targetedQuality = resolveEvidenceQuality({
    artifact: evidence.targetedBehaviorEvidence,
    context: {
      currentHead,
      lane: "targeted_behavior",
      requiredForExit: false,
    },
  });
  const targetedBehaviorPassed = targetedQuality.quality === "formal_passed";
  const targetedBehaviorDetail = evidenceArtifactDetail(
    evidence.targetedBehaviorEvidence,
    targetedBehaviorPassed
      ? "Targeted behavior evidence was supplied."
      : "No targeted source behavior evidence artifact was supplied.",
  );
  const targetedBehaviorEvidence = evidence.targetedBehaviorEvidence
    ? evidenceArtifactEvidence(evidence.targetedBehaviorEvidence)
    : ["targetedBehaviorArtifactStatus=missing_formal_evidence"];
  const targetedBehaviorStatus: PublicBetaReadinessStatus = targetedBehaviorPassed
    ? "Ready"
    : targetedQuality.freshness === "stale" || targetedQuality.freshness === "head_mismatch"
      ? "Stale evidence"
      : targetedQuality.quality === "source_ready" || targetedQuality.quality === "formal_partial"
        ? "Source validation only"
        : targetedQuality.quality === "failed"
        ? "Needs review"
        : "Source evidence required";

  const providerQuality = resolveEvidenceQuality({
    artifact: evidence.providerSmokeEvidence,
    context: {
      currentHead,
      lane: "provider_smoke",
      requiredForExit: true,
    },
  });
  const runtimeQuality = resolveEvidenceQuality({
    artifact: evidence.runtimeSmokeEvidence,
    context: {
      currentHead,
      lane: "runtime_smoke",
      requiredForExit: true,
      requiresRuntimeProof: true,
    },
  });
  const providerSmokePassed = evidenceArtifactPassed(evidence.providerSmokeEvidence);
  const runtimeSmokePassed = evidenceArtifactPassed(evidence.runtimeSmokeEvidence);
  const providerSmokeStatus = String(evidenceArtifactStatus(evidence.providerSmokeEvidence));
  const runtimeSmokeStatus = String(evidenceArtifactStatus(evidence.runtimeSmokeEvidence, "runtime_unverified"));
  const runtimeProviderSmokePassed = providerSmokePassed && runtimeSmokePassed;
  const providerNeedsFormalProof = /missing_formal_evidence|operator_reported_not_formal_provider_smoke|tracked_not_passing|missing_or_unknown/iu.test(providerSmokeStatus);
  const runtimeNeedsFormalProof = /runtime_unverified|missing_formal_evidence|tracked_not_passing|missing_or_unknown/iu.test(runtimeSmokeStatus);
  const runtimeProviderSmokeFreshnessUnknown = providerQuality.freshness === "unknown" || runtimeQuality.freshness === "unknown";
  let runtimeProviderSmokeStatus: PublicBetaReadinessStatus = "Ready with smoke required";
  if (runtimeProviderSmokePassed && !runtimeProviderSmokeFreshnessUnknown) {
    runtimeProviderSmokeStatus = "Ready";
  } else if (providerQuality.quality === "failed" || runtimeQuality.quality === "failed") {
    runtimeProviderSmokeStatus = "Needs review";
  } else if (providerNeedsFormalProof || runtimeNeedsFormalProof) {
    runtimeProviderSmokeStatus = "Source evidence required";
  } else if (
    providerQuality.freshness === "stale"
    || runtimeQuality.freshness === "stale"
    || providerQuality.freshness === "head_mismatch"
    || runtimeQuality.freshness === "head_mismatch"
  ) {
    runtimeProviderSmokeStatus = "Stale evidence";
  } else if (runtimeProviderSmokeFreshnessUnknown) {
    runtimeProviderSmokeStatus = "Unknown evidence";
  } else if (runtimeSmokeStatus === "runtime_unverified") {
    runtimeProviderSmokeStatus = "Runtime unverified";
  }
  const providerSmokeDetail = evidenceArtifactDetail(
    evidence.providerSmokeEvidence,
    providerSmokePassed ? "Provider-backed site activity evidence was supplied." : "No provider-backed site activity evidence artifact was supplied.",
  );
  const runtimeSmokeDetail = evidenceArtifactDetail(
    evidence.runtimeSmokeEvidence,
    runtimeSmokePassed ? "Runtime route evidence was supplied." : "No deployed runtime route evidence artifact was supplied.",
  );
  const runtimeProviderSmokeDetail = runtimeProviderSmokePassed
    ? "Provider-backed site activity and deployed route evidence artifacts passed."
    : `Provider-backed site activity: ${providerSmokeDetail} Deployed route evidence: ${runtimeSmokeDetail}`;
  const runtimeProviderSmokeEvidence = Array.from(new Set([
    `providerArtifactStatus=${providerSmokeStatus}`,
    `runtimeArtifactStatus=${runtimeSmokeStatus}`,
    ...evidenceArtifactEvidence(evidence.providerSmokeEvidence),
    ...evidenceArtifactEvidence(evidence.runtimeSmokeEvidence),
  ]));
  const sourceBackedRuntimeConfidenceStatus = String(evidenceArtifactStatus(
    evidence.sourceBackedRuntimeConfidenceEvidence,
    "missing_or_unknown",
  ));
  const sourceBackedRuntimeConfidenceQuality = resolveEvidenceQuality({
    artifact: evidence.sourceBackedRuntimeConfidenceEvidence,
    context: {
      currentHead,
      lane: "source_backed_runtime_confidence",
      requiredForExit: false,
      requiresRuntimeProof: true,
    },
  });
  const sourceBackedRuntimeConfidenceCredit = sourceBackedRuntimeConfidenceQuality.quality === "source_ready"
    && sourceBackedRuntimeConfidenceStatus.includes("source_ready")
    ? sourceBackedRuntimeConfidenceQuality.partialCredit * 100
    : 0;
  const realUsageConfidenceStatus = String(evidenceArtifactStatus(
    evidence.realUsageConfidenceEvidence,
    "missing_or_unknown",
  ));
  const realUsageConfidenceQuality = resolveEvidenceQuality({
    artifact: evidence.realUsageConfidenceEvidence,
    context: {
      currentHead,
      lane: "real_usage_confidence",
      requiredForExit: false,
      requiresRuntimeProof: true,
    },
  });
  const realUsageCalibrationStatus = String(evidenceArtifactStatus(
    evidence.realUsageConfidenceCalibrationEvidence,
    "missing_or_unknown",
  ));
  const realUsageCalibrationQuality = resolveEvidenceQuality({
    artifact: evidence.realUsageConfidenceCalibrationEvidence,
    context: {
      currentHead,
      lane: "real_usage_confidence_calibration",
      requiredForExit: false,
      requiresRuntimeProof: true,
    },
  });
  const realUsageCalibrationCredit = realUsageCalibrationQuality.quality === "source_ready"
    && realUsageCalibrationStatus.includes("source_ready")
    ? Math.max(
        realUsageCalibrationQuality.partialCredit * 100,
        clamp(evidenceArtifactNumber(evidence.realUsageConfidenceCalibrationEvidence, "runtimeHealthCredit") ?? 0, 0, 100),
      )
    : 0;
  const realUsageConfidenceCredit = realUsageConfidenceQuality.quality === "source_ready"
    && realUsageConfidenceStatus.includes("source_ready")
    ? Math.max(
        realUsageConfidenceQuality.partialCredit * 100,
        clamp(evidenceArtifactNumber(evidence.realUsageConfidenceEvidence, "confidenceScore") ?? 0, 0, 100),
        realUsageCalibrationCredit,
      )
    : realUsageCalibrationCredit;
  const runtimeSmokeSubstituteMatrixStatus = String(evidenceArtifactStatus(
    evidence.runtimeSmokeSubstituteMatrixEvidence,
    "missing_or_unknown",
  ));
  const runtimeSmokeSubstituteMatrixQuality = resolveEvidenceQuality({
    artifact: evidence.runtimeSmokeSubstituteMatrixEvidence,
    context: {
      currentHead,
      lane: "runtime_smoke_substitute_matrix",
      requiredForExit: false,
      requiresRuntimeProof: true,
    },
  });
  const runtimeSmokeSubstituteMatrixCredit = runtimeSmokeSubstituteMatrixQuality.quality === "source_ready"
    && runtimeSmokeSubstituteMatrixStatus.includes("source_ready")
    ? Math.max(
        runtimeSmokeSubstituteMatrixQuality.partialCredit * 100,
        clamp(evidenceArtifactNumber(evidence.runtimeSmokeSubstituteMatrixEvidence, "matrixRuntimeHealthCredit") ?? 0, 0, 100),
      )
    : 0;
  const runtimeProviderSourceActivityCredit = Math.max(
    sourceBackedRuntimeConfidenceCredit,
    realUsageConfidenceCredit,
    runtimeSmokeSubstituteMatrixCredit,
  );
  const runtimeProviderRuntimeCredit = runtimeProviderSmokePassed
    ? 100
    : runtimeProviderSourceActivityCredit;
  const runtimeProviderEvidenceWithSourceConfidence = Array.from(new Set([
    ...runtimeProviderSmokeEvidence,
    ...(
      evidence.sourceBackedRuntimeConfidenceEvidence
        ? [
            `sourceBackedRuntimeConfidenceStatus=${sourceBackedRuntimeConfidenceStatus}`,
            `sourceBackedRuntimeConfidenceCredit=${roundScore(sourceBackedRuntimeConfidenceCredit)}`,
            ...evidenceArtifactEvidence(evidence.sourceBackedRuntimeConfidenceEvidence),
          ]
        : []
    ),
    ...(
      evidence.realUsageConfidenceEvidence
        ? [
            `realUsageConfidenceStatus=${realUsageConfidenceStatus}`,
            `realUsageConfidenceCredit=${roundScore(realUsageConfidenceCredit)}`,
            ...evidenceArtifactEvidence(evidence.realUsageConfidenceEvidence),
          ]
        : []
    ),
    ...(
      evidence.realUsageConfidenceCalibrationEvidence
        ? [
            `realUsageConfidenceCalibrationStatus=${realUsageCalibrationStatus}`,
            `realUsageConfidenceCalibrationCredit=${roundScore(realUsageCalibrationCredit)}`,
            ...evidenceArtifactEvidence(evidence.realUsageConfidenceCalibrationEvidence),
          ]
        : []
    ),
    ...(
      evidence.runtimeSmokeSubstituteMatrixEvidence
        ? [
            `runtimeSmokeSubstituteMatrixStatus=${runtimeSmokeSubstituteMatrixStatus}`,
            `runtimeSmokeSubstituteMatrixCredit=${roundScore(runtimeSmokeSubstituteMatrixCredit)}`,
            ...evidenceArtifactEvidence(evidence.runtimeSmokeSubstituteMatrixEvidence),
          ]
        : []
    ),
  ]));
  const formalEvidenceBridge = buildFormalEvidenceBridgeReport({
    generatedAtUtc: new Date().toISOString(),
    currentHead: currentHead ?? "unknown",
    artifacts: {
      providerSmoke: evidence.providerSmokeEvidence,
      runtimeSmoke: evidence.runtimeSmokeEvidence,
      operatorRevenueSmoke: evidence.providerSmokeEvidence,
      sourceBackedRuntimeConfidence: evidence.sourceBackedRuntimeConfidenceEvidence,
      realUsageConfidence: evidence.realUsageConfidenceEvidence,
      realUsageConfidenceCalibration: evidence.realUsageConfidenceCalibrationEvidence,
      runtimeSubstituteMatrix: evidence.runtimeSmokeSubstituteMatrixEvidence,
      adminSourceSample: evidence.adminTruthSampleEvidence,
      debugRuntimeEvidence: evidence.debugRuntimeEvidenceArtifact,
    },
  });
  const runtimeProviderBridgeCredit = formalEvidenceBridge.gates.runtimeProviderSmoke.evidenceCredit / 100;
  const runtimeProviderFormalCredit = runtimeProviderSmokePassed
    ? Math.min(providerQuality.partialCredit, runtimeQuality.partialCredit)
    : 0;
  const runtimeProviderQuality = {
    quality: providerQuality.quality === "formal_passed" && runtimeQuality.quality === "formal_passed"
      ? "formal_passed"
      : providerQuality.quality === "operator_reported"
        ? "operator_reported"
        : runtimeQuality.quality === "source_ready"
          ? "source_ready"
          : providerQuality.quality === "failed" || runtimeQuality.quality === "failed"
            ? "failed"
            : "missing",
    confidence: runtimeProviderSmokePassed
      ? Math.min(providerQuality.confidence, runtimeQuality.confidence)
      : Math.max(Math.min(providerQuality.confidence, runtimeQuality.confidence), runtimeProviderBridgeCredit * 0.9),
    freshness: providerQuality.freshness === "fresh" ? runtimeQuality.freshness : providerQuality.freshness,
    freshnessScore: Math.min(providerQuality.freshnessScore, runtimeQuality.freshnessScore),
    partialCredit: roundScore(Math.max(runtimeProviderFormalCredit, runtimeProviderSourceActivityCredit / 100)),
    blocksLaunch: providerQuality.blocksLaunch || runtimeQuality.blocksLaunch,
    reason: `${runtimeProviderSmokeDetail} Evidence bridge source confidence is partial and does not clear provider-backed site activity or deployed runtime route evidence.`,
  } satisfies ReturnType<typeof resolveEvidenceQuality>;

  const adminTruthSampleStatus = String(evidenceArtifactStatus(evidence.adminTruthSampleEvidence, "missing_or_unknown"));
  const adminTruthSampleEvidenceRaw = Array.from(new Set([
    `adminTruthSampleArtifactStatus=${adminTruthSampleStatus}`,
    ...evidenceArtifactEvidence(evidence.adminTruthSampleEvidence),
  ]));
  const adminBaseQuality = resolveEvidenceQuality({
    artifact: evidence.adminTruthSampleEvidence,
    context: {
      currentHead,
      lane: "admin_truth_sample",
      requiredForExit: true,
      requiresRuntimeProof: true,
    },
  });
  const currentAdminSourceActivitySamplePassed = evidence.adminTruthSampleEvidence?.passed === true
    && /passed|formal_admin_truth_sample_passed/iu.test(adminTruthSampleStatus)
    && /sampleCount=([1-9][0-9]*)/iu.test(adminTruthSampleEvidenceRaw.join("\n"))
    && adminBaseQuality.freshness === "fresh";
  const adminTruthSamplePassed = evidenceArtifactPassed(evidence.adminTruthSampleEvidence)
    || currentAdminSourceActivitySamplePassed;
  const adminTruthNeedsFormalProof = /missing_formal_evidence|missing_or_unknown|tracked_not_passing|admin_truth_sample_required/iu.test(adminTruthSampleStatus);
  const adminTruthSampleDetail = evidenceArtifactDetail(
    evidence.adminTruthSampleEvidence,
    adminTruthSamplePassed
      ? "Admin source activity sample evidence was supplied."
      : "No admin source activity sample evidence artifact was supplied.",
  );
  const adminTruthSampleEvidence = adminTruthSampleEvidenceRaw;
  const adminBridgeCredit = formalEvidenceBridge.gates.adminTruthSamples.evidenceCredit / 100;
  const adminTruthSampleEvidenceText = adminTruthSampleEvidence.join("\n");
  const adminSourceConfidence = currentAdminSourceActivitySamplePassed
    ? 100
    : adminTruthSampleStatus.includes("source_ready")
      && /sourceTruthStatus=source_backed/iu.test(adminTruthSampleEvidenceText)
      && /criticalAdminTruthIssueCount=0/iu.test(adminTruthSampleEvidenceText)
      && /fakeHealthyStateDetected=false/iu.test(adminTruthSampleEvidenceText)
      ? 92
      : 0;
  const adminSourceActivityCredit = Math.max(adminBridgeCredit, adminSourceConfidence / 100);
  const adminQuality = {
    ...adminBaseQuality,
    quality: adminBaseQuality.quality,
    confidence: Math.max(adminBaseQuality.confidence, adminBridgeCredit * 0.9, adminSourceConfidence / 100),
    partialCredit: adminTruthSamplePassed
      ? roundScore(Math.max(adminBaseQuality.partialCredit, adminSourceActivityCredit))
      : roundScore(adminSourceActivityCredit),
    blocksLaunch: adminBaseQuality.blocksLaunch,
    reason: adminBaseQuality.quality === "formal_passed"
      ? adminBaseQuality.reason
      : "Admin source evidence earns partial bridge confidence; the admin lane needs a matching source activity sample before clearing.",
  } satisfies ReturnType<typeof resolveEvidenceQuality>;
  const adminTruthSampleFreshnessUnknown = adminBaseQuality.freshness === "unknown";
  let adminTruthSampleStatusLabel: PublicBetaReadinessStatus = "Source evidence required";
  if (adminTruthSamplePassed && !adminTruthSampleFreshnessUnknown) {
    adminTruthSampleStatusLabel = "Ready";
  } else if (adminBaseQuality.quality === "failed") {
    adminTruthSampleStatusLabel = "Needs review";
  } else if (adminTruthNeedsFormalProof) {
    adminTruthSampleStatusLabel = "Source evidence required";
  } else if (adminBaseQuality.quality === "source_ready" || adminBridgeCredit > 0 || adminSourceConfidence > 0) {
    adminTruthSampleStatusLabel = "Source evidence required";
  } else if (adminBaseQuality.freshness === "stale" || adminBaseQuality.freshness === "head_mismatch") {
    adminTruthSampleStatusLabel = "Stale evidence";
  } else if (adminTruthSampleFreshnessUnknown) {
    adminTruthSampleStatusLabel = "Unknown evidence";
  }

  const sourceSafetyQuality = {
    quality: input.hasCritical ? "failed" : "formal_passed",
    confidence: input.hasCritical ? 0 : 1,
    freshness: "fresh",
    freshnessScore: 1,
    partialCredit: input.hasCritical ? 0 : input.scannerScore / 100,
    blocksLaunch: input.hasCritical,
    reason: input.hasCritical
      ? "High-confidence critical scanner findings remain."
      : "Deterministic source scanners did not find a critical blocker.",
  } satisfies ReturnType<typeof resolveEvidenceQuality>;

  const freshnessPartialCredit = freshnessStatus === "Ready"
    ? 1
    : freshnessStatus === "Stale evidence"
      ? 0.25
      : freshnessStatus === "Needs review"
        ? 0.4
        : 0;
  const freshnessQuality = {
    quality: freshnessStatus === "Ready" ? "formal_passed" : freshnessStatus === "Stale evidence" ? "stale" : "missing",
    confidence: freshnessStatus === "Ready" ? 0.95 : freshnessPartialCredit,
    freshness: freshnessStatus === "Ready" ? "fresh" : freshnessStatus === "Stale evidence" ? "stale" : "unknown",
    freshnessScore: freshnessPartialCredit,
    partialCredit: freshnessPartialCredit,
    blocksLaunch: freshnessStatus !== "Ready",
    reason: freshnessDetail,
  } satisfies ReturnType<typeof resolveEvidenceQuality>;

  const debugQuality = debugRuntimeEvidenceArtifactReady
    ? {
      ...debugRuntimeEvidenceQuality,
      confidence: Math.max(
        debugRuntimeEvidenceQuality.confidence,
        (evidenceArtifactNumericValue(evidence.debugRuntimeEvidenceArtifact, "sourceBackedRuntimeConfidence") ?? 0) / 100,
      ),
      partialCredit: roundScore(Math.max(
        debugRuntimeEvidenceQuality.partialCredit,
        (evidenceArtifactNumericValue(evidence.debugRuntimeEvidenceArtifact, "sourceBackedRuntimeConfidence") ?? 0) / 100,
      )),
      reason: "Source-backed debug/runtime confidence is counted for Studio health without clearing deployed route evidence.",
    } satisfies ReturnType<typeof resolveEvidenceQuality>
    : {
    quality: debugEvidenceAvailable || formalEvidenceBridge.gates.debugRuntimeEvidence.evidenceCredit > 0 ? "formal_partial" : "missing",
    confidence: Math.max(debugEvidenceAvailable ? 0.65 : 0, formalEvidenceBridge.gates.debugRuntimeEvidence.evidenceCredit / 100 * 0.9),
    freshness: debugEvidenceAvailable ? "fresh" : "missing",
    freshnessScore: debugEvidenceAvailable ? 1 : formalEvidenceBridge.gates.debugRuntimeEvidence.evidenceCredit > 0 ? 1 : 0,
    partialCredit: Math.max(debugEvidenceAvailable ? 0.65 : 0, formalEvidenceBridge.gates.debugRuntimeEvidence.evidenceCredit / 100),
    blocksLaunch: false,
    reason: debugEvidenceAvailable
      ? "Runtime debug evidence is present in the score input."
      : "Debug evidence is empty, so absence of runtime issues is unknown.",
  } satisfies ReturnType<typeof resolveEvidenceQuality>;
  const debugRuntimeEvidenceLines = evidence.debugRuntimeEvidenceArtifact
    ? evidenceArtifactEvidence(evidence.debugRuntimeEvidenceArtifact)
    : [];
  const algorithmicEvidencePolicy = buildAlgorithmicEvidencePolicyReport({
    uiSurfaceCoverageEvidence: evidence.uiSurfaceCoverageEvidence,
    runtimeSmokeEvidence: evidence.runtimeSmokeEvidence,
    providerSmokeEvidence: evidence.providerSmokeEvidence,
    debugRuntimeEvidence: evidence.debugRuntimeEvidenceArtifact,
    runtimeSmokeSubstituteMatrixEvidence: evidence.runtimeSmokeSubstituteMatrixEvidence,
    sourceBackedRuntimeConfidenceEvidence: evidence.sourceBackedRuntimeConfidenceEvidence,
    realUsageConfidenceEvidence: evidence.realUsageConfidenceEvidence,
    realUsageConfidenceCalibrationEvidence: evidence.realUsageConfidenceCalibrationEvidence,
    behaviorMathEvidence: evidence.behaviorMathEvidence,
    adminTruthSampleEvidence: evidence.adminTruthSampleEvidence,
    costReadiness: evidence.costReadiness,
    costReadinessSourcePath: "agent/state/score-80-cost-readiness.generated.json",
    refreshQueueSourcePath: "agent/state/self-healing-refresh-queue.generated.json",
  });
  const algorithmicCoverageEvidence = [
    `nonUiAlgorithmicCoverageScore=${algorithmicEvidencePolicy.nonUiAlgorithmicCoverageScore}`,
    `uiSourceCoverageBlocksNonUi=${algorithmicEvidencePolicy.uiSurfaceCoverageScope.nonUiAlgorithmicEvidence.blockedByUiSourceCoverage}`,
    "uiVisualOperatorFinalChecklist=outside_codex_score",
    `deployedRuntimeSmokeCleared=${algorithmicEvidencePolicy.formalGateImpact.deployedRuntimeSmokeCleared}`,
    `formalProviderGateCleared=${algorithmicEvidencePolicy.formalGateImpact.formalProviderGateCleared}`,
    `formalAdminRuntimeSampleCleared=${algorithmicEvidencePolicy.formalGateImpact.formalAdminRuntimeSampleCleared}`,
    ...algorithmicEvidencePolicy.coverage.map((item) =>
      `${item.category}: confidence=${item.confidence}; score=${item.score}; source=${item.sourcePath}; ${item.distinction}`),
  ];

  const gates: PublicBetaEvidenceGate[] = [
    buildEvidenceGate({
      id: "sourceSafety",
      label: "Source safety",
      weight: PUBLIC_BETA_EVIDENCE_WEIGHTS.sourceSafety,
      status: input.hasCritical ? "Blocked" : "Ready",
      detail: input.hasCritical
        ? "High-confidence critical scanner findings remain."
        : "Deterministic source scanners did not find a critical blocker.",
      evidence: [`scannerStatus=${input.scannerStatus}`, `scannerScore=${input.scannerScore}`],
      recommendedAction: input.hasCritical ? "Fix critical scanner findings before scoring readiness." : "Keep source scanner lane in the fast loop.",
      quality: sourceSafetyQuality,
      gateRequiredForExit: true,
      sourceCredit: input.hasCritical ? 0 : input.scannerScore,
      runtimeCredit: 0,
    }),
    buildEvidenceGate({
      id: "targetedBehaviorTests",
      label: "Targeted behavior tests",
      weight: PUBLIC_BETA_EVIDENCE_WEIGHTS.targetedBehaviorTests,
      status: targetedBehaviorStatus,
      detail: targetedBehaviorDetail,
      evidence: targetedBehaviorEvidence,
      recommendedAction: "Run the targeted validators for the changed surface and refresh the score with fresh evidence metadata.",
      quality: targetedQuality,
      gateRequiredForExit: false,
      sourceCredit: Math.max(targetedQuality.partialCredit * 100, realUsageConfidenceCredit),
      runtimeCredit: 0,
    }),
    buildEvidenceGate({
      id: "runtimeProviderSmoke",
      label: "Provider-backed site activity + deployed route evidence",
      weight: PUBLIC_BETA_EVIDENCE_WEIGHTS.runtimeProviderSmoke,
      status: runtimeProviderSmokeStatus,
      detail: runtimeProviderSmokeDetail,
      evidence: runtimeProviderEvidenceWithSourceConfidence,
      recommendedAction: "Keep provider-backed site activity and deployed route evidence current before clearing launch readiness.",
      quality: runtimeProviderQuality,
      gateRequiredForExit: true,
      sourceCredit: Math.max(
        runtimeQuality.quality === "source_ready" ? runtimeQuality.partialCredit * 100 : 0,
        sourceBackedRuntimeConfidenceCredit,
        realUsageConfidenceCredit,
        runtimeSmokeSubstituteMatrixCredit,
        runtimeProviderQuality.partialCredit * 100,
      ),
      runtimeCredit: runtimeProviderRuntimeCredit,
    }),
    buildEvidenceGate({
      id: "adminTruthSamples",
      label: "Admin source activity sample evidence",
      weight: PUBLIC_BETA_EVIDENCE_WEIGHTS.adminTruthSamples,
      status: adminTruthSampleStatusLabel,
      detail: adminTruthSampleDetail,
      evidence: adminTruthSampleEvidence,
      recommendedAction: "Require a redacted admin source activity sample before rendering zero/live/healthy as launch truth.",
      quality: adminQuality,
      gateRequiredForExit: true,
      sourceCredit: adminTruthSamplePassed || adminQuality.quality === "source_ready" || adminQuality.quality === "formal_partial"
        ? Math.max(adminBridgeCredit * 100, adminSourceConfidence)
        : undefined,
      runtimeCredit: adminQuality.quality === "formal_passed"
        ? adminQuality.partialCredit * 100
        : adminSourceActivityCredit * 100,
    }),
    buildEvidenceGate({
      id: "freshnessIntegrity",
      label: "Report freshness and PR integrity",
      weight: PUBLIC_BETA_EVIDENCE_WEIGHTS.freshnessIntegrity,
      status: freshnessStatus,
      detail: freshnessDetail,
      evidence: reportEvidence.evidence,
      recommendedAction: "Refresh outdated generated reports and PR triage from the latest code version before treating readiness as current.",
      quality: freshnessQuality,
      gateRequiredForExit: true,
      sourceCredit: freshnessQuality.partialCredit * 100,
      runtimeCredit: freshnessQuality.quality === "formal_passed" ? 100 : 0,
    }),
    buildEvidenceGate({
      id: "debugRuntimeEvidence",
      label: "Debug/runtime evidence",
      weight: 0,
      status: debugEvidenceAvailable
        ? "Ready"
        : "Source evidence required",
      detail: debugRuntimeEvidenceArtifactReady
        ? runtimeQuality.quality === "formal_passed"
          ? "source-backed debug/runtime evidence is current and deployed route evidence is attached."
          : "source-backed debug/runtime evidence checked debug sources without clearing deployed route evidence."
        : debugEvidenceAvailable
        ? "Runtime debug evidence is present in the score input."
        : "Debug evidence is empty, so absence of runtime issues is unknown.",
      evidence: debugRuntimeEvidenceLines,
      recommendedAction: "Do not treat empty debug evidence as proof that no runtime issue exists.",
      quality: debugQuality,
      gateRequiredForExit: false,
      runtimeCredit: Math.max(
        debugRuntimeEvidenceArtifactReady ? debugQuality.partialCredit * 100 : debugEvidenceAvailable ? 50 : 0,
        formalEvidenceBridge.gates.debugRuntimeEvidence.runtimeCredit,
      ),
    }),
    buildEvidenceGate({
      id: "algorithmicEvidenceCoverage",
      label: "Algorithmic non-UI evidence coverage",
      weight: 0,
      status: algorithmicEvidencePolicy.overallStatus === "algorithmic_evidence_policy_ready" ? "Ready" : "Needs review",
      detail: "Non-UI runtime, telemetry, admin source, provider signal, cost, and refresh confidence are scored separately from deterministic UI surface coverage.",
      evidence: algorithmicCoverageEvidence,
      recommendedAction: "Use algorithmic evidence for non-UI confidence while keeping UI source coverage, provider-backed activity, runtime route, and admin truth lanes explicit.",
      quality: {
        quality: algorithmicEvidencePolicy.validationFailures.length > 0 ? "failed" : "formal_partial",
        confidence: algorithmicEvidencePolicy.validationFailures.length > 0 ? 0 : 0.72,
        freshness: "fresh",
        freshnessScore: 1,
        partialCredit: algorithmicEvidencePolicy.validationFailures.length > 0
          ? 0
          : algorithmicEvidencePolicy.nonUiAlgorithmicCoverageScore / 100,
        blocksLaunch: false,
        reason: algorithmicEvidencePolicy.validationFailures.length > 0
          ? algorithmicEvidencePolicy.validationFailures.join("; ")
          : "Algorithmic evidence coverage is partial non-UI confidence and does not clear source lanes that still lack matching site activity records.",
      },
      gateRequiredForExit: false,
      sourceCredit: algorithmicEvidencePolicy.nonUiAlgorithmicCoverageScore,
      runtimeCredit: Math.max(
        algorithmicEvidencePolicy.runtimeSourceConfidence.score,
        algorithmicEvidencePolicy.telemetryConfidence.score,
        algorithmicEvidencePolicy.adminTruthConfidence.score,
      ),
    }),
    buildEvidenceGate({
      id: "formalEvidenceBridge",
      label: "Evidence bridge",
      weight: 0,
      status: formalEvidenceBridge.validationFailures.length > 0 ? "Needs review" : "Ready",
      detail: formalEvidenceBridge.formalGapsRemaining.length > 0
        ? `Evidence bridge is current; remaining source gap(s): ${(formalEvidenceBridge.sourceGapsRemaining ?? formalEvidenceBridge.formalGapsRemaining).join(", ")}.`
        : "Evidence bridge is current and source gaps are cleared.",
      evidence: [
        `formalProviderGateCleared=${formalEvidenceBridge.formalGateStatus.providerSmoke.cleared}`,
        `deployedRuntimeSmokeCleared=${formalEvidenceBridge.formalGateStatus.deployedRuntimeSmoke.cleared}`,
        `formalAdminTruthSampleCleared=${formalEvidenceBridge.formalGateStatus.adminProductionSample.cleared}`,
        `runtimeProviderSmokeEvidenceCredit=${formalEvidenceBridge.gates.runtimeProviderSmoke.evidenceCredit}`,
        `adminTruthSamplesEvidenceCredit=${formalEvidenceBridge.gates.adminTruthSamples.evidenceCredit}`,
        `debugRuntimeEvidenceCredit=${formalEvidenceBridge.gates.debugRuntimeEvidence.evidenceCredit}`,
        ...formalEvidenceBridge.evidenceClasses.map((entry) => `evidenceClass=${entry}`),
      ],
      recommendedAction: "Use bridge confidence for score clarity only; produce any remaining source activity records before clearing launch gates.",
      quality: {
        quality: formalEvidenceBridge.validationFailures.length > 0 ? "failed" : "formal_partial",
        confidence: formalEvidenceBridge.validationFailures.length > 0 ? 0 : Math.max(
          0.78,
          runtimeProviderRuntimeCredit / 100,
          adminSourceConfidence / 100,
          (evidenceArtifactNumericValue(evidence.debugRuntimeEvidenceArtifact, "sourceBackedRuntimeConfidence") ?? 0) / 100,
        ),
        freshness: "fresh",
        freshnessScore: 1,
        partialCredit: formalEvidenceBridge.validationFailures.length > 0
          ? 0
          : Math.max(
              formalEvidenceBridge.gates.runtimeProviderSmoke.evidenceCredit,
              formalEvidenceBridge.gates.adminTruthSamples.evidenceCredit,
              formalEvidenceBridge.gates.debugRuntimeEvidence.evidenceCredit,
              runtimeProviderRuntimeCredit,
              adminSourceConfidence,
              evidenceArtifactNumericValue(evidence.debugRuntimeEvidenceArtifact, "sourceBackedRuntimeConfidence") ?? 0,
            ) / 100,
        blocksLaunch: false,
        reason: formalEvidenceBridge.validationFailures.length > 0
          ? formalEvidenceBridge.validationFailures.join("; ")
          : "Evidence bridge is partial confidence and does not clear source lanes that still lack matching site activity records.",
      },
      gateRequiredForExit: false,
      sourceCredit: Math.max(
        formalEvidenceBridge.gates.runtimeProviderSmoke.evidenceCredit,
        formalEvidenceBridge.gates.adminTruthSamples.evidenceCredit,
        adminSourceConfidence,
        evidenceArtifactNumericValue(evidence.debugRuntimeEvidenceArtifact, "sourceBackedRuntimeConfidence") ?? 0,
      ),
      runtimeCredit: Math.max(
        formalEvidenceBridge.gates.runtimeProviderSmoke.runtimeCredit,
        formalEvidenceBridge.gates.adminTruthSamples.runtimeCredit,
        formalEvidenceBridge.gates.debugRuntimeEvidence.runtimeCredit,
      ),
    }),
  ];

  if ((evidence.launchWarningCount ?? 0) > 0) {
    gates.push(buildEvidenceGate({
      id: "runtimeProviderSmoke",
      label: "Launch warning confidence",
      weight: 0,
      status: "Ready with smoke required",
      detail: `${evidence.launchWarningCount} launch warning(s) remain recorded.`,
      evidence: [],
      recommendedAction: "Keep launch warnings visible and out of perfect readiness scoring.",
      quality: {
        quality: "formal_partial",
        confidence: 0.5,
        freshness: "fresh",
        freshnessScore: 1,
        partialCredit: 0.5,
        blocksLaunch: true,
        reason: `${evidence.launchWarningCount} launch warning(s) remain recorded.`,
      },
      gateRequiredForExit: false,
    }));
  }

  const evidenceScore = roundScore(gates.reduce((sum, gate) => sum + gate.score, 0));
  const readinessStatus = mostSevereReadinessStatus(gates.map((gate) => gate.status));
  const caps = gates
    .filter((gate) => gate.status !== "Ready")
    .map((gate) => `${gate.status}: ${gate.label}`);
  const evidenceCapDetails = gates
    .filter((gate) => gate.status !== "Ready")
    .map(summarizeEvidenceGateForCap);
  const readinessCap = capForReadinessStatus(readinessStatus);
  const readinessGate = gates.find((gate) => gate.status === readinessStatus);

  return {
    evidenceScore,
    readinessStatus,
    readinessStatusReason: readinessGate ? summarizeEvidenceGateForCap(readinessGate) : "Evidence gates passed.",
    evidenceGates: gates,
    evidenceCapsApplied: caps,
    evidenceCapDetails,
    cappedScore: readinessStatus === "Ready" ? input.scannerScore : Math.min(input.scannerScore, readinessCap),
  };
}

export function isCriticalAutoFail(finding: Pick<PublicBetaFinding, "severity" | "confidence" | "domain" | "category">) {
  if (finding.severity !== "critical") {
    return false;
  }
  if (finding.confidence >= 0.85) {
    return true;
  }
  return finding.domain === "contentProtection" && finding.category.includes("content-leak");
}

export function calculatePublicBetaPenalty(input: {
  severity: PublicBetaSeverity;
  confidence: number;
  blastRadius: PublicBetaBlastRadius;
  filePath: string;
  recentFiles?: string[];
}) {
  const confidence = clamp(input.confidence, 0, 1);
  const rawPenalty = PUBLIC_BETA_SEVERITY_PENALTIES[input.severity] * confidence;
  const blastMultiplier = PUBLIC_BETA_BLAST_RADIUS_MULTIPLIERS[input.blastRadius];
  const normalizedPath = normalizeScorePath(input.filePath);
  const recentMultiplier = input.recentFiles?.some((file) => normalizeScorePath(file) === normalizedPath) ? 1.15 : 1;
  return {
    rawPenalty: roundScore(rawPenalty),
    weightedPenalty: roundScore(rawPenalty * blastMultiplier * recentMultiplier),
  };
}

export function buildPublicBetaFinding(input: PublicBetaFindingInput, recentFiles: string[] = []): PublicBetaFinding {
  const normalizedPath = normalizeScorePath(input.filePath);
  const confidence = clamp(input.confidence, 0, 1);
  const resolvedSeverity = input.severity === "critical"
    && confidence < 0.85
    && !(input.domain === "contentProtection" && input.category.includes("content-leak"))
    ? "major"
    : input.severity;
  const penalties = calculatePublicBetaPenalty({
    severity: resolvedSeverity,
    confidence,
    blastRadius: input.blastRadius,
    filePath: normalizedPath,
    recentFiles,
  });
  const signature = [
    input.domain,
    input.category,
    normalizeTitle(input.title),
    normalizedPath,
    input.line ?? "",
    normalizeExcerpt(input.excerpt),
  ].join("|");

  return {
    ...input,
    severity: resolvedSeverity,
    id: input.id ?? `${input.domain}-${input.category}-${stableHash(signature)}`,
    filePath: normalizedPath,
    confidence,
    rawPenalty: penalties.rawPenalty,
    weightedPenalty: penalties.weightedPenalty,
    evidence: Array.from(new Set(input.evidence)),
    docsBasis: Array.from(new Set(input.docsBasis)),
  };
}

function severityRank(severity: PublicBetaSeverity) {
  return ["info", "minor", "moderate", "major", "critical"].indexOf(severity);
}

function dedupeKey(finding: PublicBetaFinding) {
  return [
    finding.filePath,
    finding.line ?? "",
    normalizeExcerpt(finding.excerpt),
    finding.category,
    normalizeTitle(finding.title),
  ].join("|");
}

export function dedupePublicBetaFindings(findings: PublicBetaFinding[]) {
  const byKey = new Map<string, PublicBetaFinding>();
  for (const finding of findings) {
    const key = dedupeKey(finding);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, finding);
      continue;
    }

    const keepIncoming = severityRank(finding.severity) > severityRank(existing.severity)
      || (finding.severity === existing.severity && finding.confidence > existing.confidence);
    const winner = keepIncoming ? finding : existing;
    const loser = keepIncoming ? existing : finding;
    byKey.set(key, {
      ...winner,
      evidence: Array.from(new Set([...winner.evidence, ...loser.evidence])),
      docsBasis: Array.from(new Set([...winner.docsBasis, ...loser.docsBasis])),
      canAutofix: winner.canAutofix && loser.canAutofix,
      autofixConfidence: Math.max(winner.autofixConfidence, loser.autofixConfidence),
    });
  }
  return Array.from(byKey.values()).sort((left, right) =>
    severityRank(right.severity) - severityRank(left.severity)
    || right.weightedPenalty - left.weightedPenalty
    || left.filePath.localeCompare(right.filePath));
}

export function roundScore(value: number) {
  return Math.round(value * 100) / 100;
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return roundScore(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function weightedHealthScore(breakdown: PublicBetaHealthScoreBreakdown) {
  const entries = Object.entries(PUBLIC_BETA_HEALTH_DIMENSION_WEIGHTS) as Array<[PublicBetaHealthDimension, number]>;
  const weighted = entries.reduce((sum, [dimension, weight]) => sum + (breakdown[dimension].score * weight), 0);
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  return roundScore(weighted / Math.max(1, total));
}

function launchGateStatusFrom(input: {
  hasCritical: boolean;
  readinessStatus: PublicBetaReadinessStatus;
  launchBlockers: string[];
  costOwnerReview: boolean;
  runtimeHealthScore: number;
  evidenceCompletenessScore: number;
}): PublicBetaLaunchGateStatus {
  if (input.hasCritical || input.readinessStatus === "Blocked") return "blocked";
  if (input.launchBlockers.length === 0 && input.evidenceCompletenessScore >= 95 && input.runtimeHealthScore >= 95) {
    return "launch_ready";
  }
  if (input.costOwnerReview) return "owner_review";
  if (input.evidenceCompletenessScore >= 90) return "evidence_complete";
  if (input.runtimeHealthScore >= 70) return "runtime_proven";
  return "source_ready";
}

function studioStatusFromScore(score: number): PublicBetaStudioDashboardSection["status"] {
  if (score >= 90) return "healthy";
  if (score >= 80) return "watching";
  return "needs_attention";
}

function summarizeEvidenceGateStates(gates: PublicBetaEvidenceGate[]) {
  const openGates = gates.filter((gate) => gate.status !== "Ready");
  if (openGates.length === 0) {
    return {
      openGates,
      detail: "All evidence gates are clear in the existing evidence model.",
    };
  }

  const statusCounts = openGates.reduce<Record<string, number>>((counts, gate) => {
    counts[gate.status] = (counts[gate.status] ?? 0) + 1;
    return counts;
  }, {});
  const summary = Object.entries(statusCounts)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([status, count]) => `${status} (${count})`)
    .join(", ");

  return {
    openGates,
    detail: `Open evidence gates: ${summary}. Source checks stay separate from provider-backed site activity, deployed route evidence, and admin source activity evidence.`,
  };
}

function buildStudioDashboard(input: {
  sourceHealthScore: number;
  runtimeHealthScore: number;
  evidenceCompletenessScore: number;
  freshnessScore: number;
  costRiskScore: number;
  regressionRiskScore: number;
  evidenceGates: PublicBetaEvidenceGate[];
}): PublicBetaStudioDashboard {
  const debugGate = input.evidenceGates.find((gate) => gate.id === "debugRuntimeEvidence");
  const adminGate = input.evidenceGates.find((gate) => gate.id === "adminTruthSamples");
  const evidenceGateSummary = summarizeEvidenceGateStates(input.evidenceGates);
  const sections: PublicBetaStudioDashboardSection[] = [
    {
      id: "audienceActivity",
      label: "Audience Activity",
      score: input.runtimeHealthScore,
      status: studioStatusFromScore(input.runtimeHealthScore),
      source: "runtimeHealthScore",
      detail: "Estimated from codebase-verifiable activity, telemetry, runtime substitute, and source-ready signals.",
    },
    {
      id: "runtimeConfidence",
      label: "Runtime Confidence",
      score: input.runtimeHealthScore,
      status: studioStatusFromScore(input.runtimeHealthScore),
      source: "runtimeHealthScore",
      detail: "Shows source-backed runtime confidence without clearing typed deployed route evidence.",
    },
    {
      id: "sourceQuality",
      label: "Source Quality",
      score: input.sourceHealthScore,
      status: studioStatusFromScore(input.sourceHealthScore),
      source: "sourceHealthScore",
      detail: "Scanner and source-gate confidence using the existing source health dimension.",
    },
    {
      id: "debugSignal",
      label: "Debug Signal",
      score: roundScore(debugGate?.runtimeCredit ?? debugGate?.evidenceCredit ?? input.regressionRiskScore),
      status: studioStatusFromScore(debugGate?.runtimeCredit ?? debugGate?.evidenceCredit ?? input.regressionRiskScore),
      source: debugGate ? "debugRuntimeEvidence gate" : "regressionRiskScore",
      detail: debugGate?.detail ?? "Uses existing regression/debug signal confidence when no debug runtime gate is available.",
    },
    {
      id: "adminHydration",
      label: "Admin Hydration",
      score: roundScore(adminGate?.sourceCredit ?? adminGate?.evidenceCredit ?? input.evidenceCompletenessScore),
      status: studioStatusFromScore(adminGate?.sourceCredit ?? adminGate?.evidenceCredit ?? input.evidenceCompletenessScore),
      source: adminGate ? "adminTruthSamples gate" : "evidenceCompletenessScore",
      detail: adminGate?.detail ?? "Admin analytics hydration is summarized from existing evidence completeness.",
    },
    {
      id: "needsProof",
      label: "Evidence Gates",
      score: input.evidenceCompletenessScore,
      status: evidenceGateSummary.openGates.length > 0 ? "needs_proof" : studioStatusFromScore(input.evidenceCompletenessScore),
      source: "evidenceCompletenessScore",
      detail: evidenceGateSummary.detail,
    },
  ];
  const overall = Math.min(...sections.filter((section) => section.id !== "needsProof").map((section) => section.score));
  return {
    status: sections.some((section) => section.status === "needs_attention" || section.status === "needs_proof")
      ? "needs_attention"
      : overall >= 90
        ? "healthy"
        : "watching",
    sections,
  };
}

function buildLaunchClearance(input: {
  launchGateStatus: PublicBetaLaunchGateStatus;
  launchBlockers: string[];
  evidence?: PublicBetaEvidenceInput;
}): PublicBetaLaunchClearance {
  const evidence = input.evidence ?? {};
  const providerSmoke = evidence.providerSmokeEvidence;
  const runtimeSmoke = evidence.runtimeSmokeEvidence;
  const adminTruth = evidence.adminTruthSampleEvidence;
  const uiSurfaceCoverage = evidence.uiSurfaceCoverageEvidence;
  return {
    status: input.launchGateStatus,
    blockers: input.launchBlockers,
    formalGates: {
      providerSmoke: {
        cleared: evidenceArtifactPassed(providerSmoke),
        status: String(evidenceArtifactStatus(providerSmoke)),
        source: providerSmoke?.path ?? "agent/state/provider-smoke-evidence.generated.json",
      },
      deployedRuntimeSmoke: {
        cleared: evidenceArtifactPassed(runtimeSmoke),
        status: String(evidenceArtifactStatus(runtimeSmoke, "runtime_unverified")),
        source: runtimeSmoke?.path ?? "agent/state/runtime-smoke-evidence.generated.json",
      },
      adminTruthSample: {
        cleared: evidenceArtifactPassed(adminTruth),
        status: String(evidenceArtifactStatus(adminTruth, "missing_or_unknown")),
        source: adminTruth?.path ?? "agent/state/admin-truth-sample-evidence.generated.json",
      },
      uiSurfaceCoverage: {
        cleared: evidenceArtifactPassed(uiSurfaceCoverage),
        status: String(evidenceArtifactStatus(uiSurfaceCoverage, "source_surface_checks_current")),
        source: uiSurfaceCoverage?.path ?? "agent/state/ui-visual-smoke-minimal.generated.json",
      },
      paymentSourceOfFunds: {
        cleared: false,
        status: "protected_not_evaluated_in_source_model",
        source: "protected lane: GumDrop source-of-funds and provider callbacks",
      },
    },
  };
}

export function buildPublicBetaScoreReport(
  rawFindings: PublicBetaFindingInput[],
  options: PublicBetaScoreOptions,
): PublicBetaScoreReport {
  const recentFiles = options.recentFiles ?? [];
  const findings = dedupePublicBetaFindings(rawFindings.map((finding) => buildPublicBetaFinding(finding, recentFiles)));
  const domainScores = {} as PublicBetaScoreReport["domainScores"];
  let weightedScoreTotal = 0;
  let weightTotal = 0;
  let criticalAutoFail = false;

  for (const [domain, weight] of Object.entries(PUBLIC_BETA_DOMAIN_WEIGHTS) as Array<[PublicBetaDomain, number]>) {
    const domainFindings = findings.filter((finding) => finding.domain === domain);
    const penalty = domainFindings.reduce((sum, finding) => sum + finding.weightedPenalty, 0);
    const hasCritical = domainFindings.some(isCriticalAutoFail);
    const score = roundScore(clamp(100 - penalty, 0, 100));
    const status = resolvePublicBetaStatus(score, hasCritical);
    criticalAutoFail ||= hasCritical;
    weightedScoreTotal += score * weight;
    weightTotal += weight;
    domainScores[domain] = {
      weight,
      score,
      status,
      findingCount: domainFindings.length,
      criticalCount: domainFindings.filter((finding) => finding.severity === "critical").length,
      majorCount: domainFindings.filter((finding) => finding.severity === "major").length,
    };
  }

  const scannerScore = roundScore(weightTotal > 0 ? weightedScoreTotal / weightTotal : 100);
  const safeAutofixesAvailable = findings.filter((finding) => finding.canAutofix && finding.autofixConfidence >= 0.95).length;
  const scannerStatus = resolvePublicBetaStatus(scannerScore, criticalAutoFail);
  const evidenceReadiness = buildPublicBetaEvidenceGates({
    scannerScore,
    scannerStatus,
    hasCritical: criticalAutoFail,
    evidence: options.evidence,
  });
  const uiSurfaceCoverageEvidence = options.evidence?.uiSurfaceCoverageEvidence;
  const costReadiness = options.evidence?.costReadiness ?? DEFAULT_COST_READINESS;
  const costScore = scoreCostReadiness(costReadiness);
  const nonEventScorePolicy = options.evidence?.nonEventScorePolicy ?? summarizeNonEventScorePolicy();
  const regressionScore = scoreRegressionRisk({
    requiredReports: options.evidence?.requiredReports,
    runtimeCodeChangedSinceReport: options.evidence?.runtimeCodeChangedSinceReport,
    openPrTriageFresh: options.evidence?.openPrTriageFresh,
    recentHighBlastFilesChanged: recentFiles.some((file) =>
      /paypal|wallet|gumdrop|booking|analytics|admin|runtime|creator/iu.test(file)),
    highBlastRefreshCurrent: options.evidence?.regressionRiskRefreshEvidence?.highBlastCoverageCurrent,
    highBlastRefreshScore: options.evidence?.regressionRiskRefreshEvidence?.regressionRiskScore,
    highBlastRefreshFailedLaneCount: options.evidence?.regressionRiskRefreshEvidence?.failedLaneCount,
    highBlastRefreshInFlightLaneCount: options.evidence?.regressionRiskRefreshEvidence?.inFlightLaneCount,
  });
  const sourceGates = evidenceReadiness.evidenceGates.filter((gate) =>
    gate.id === "sourceSafety" || gate.id === "targetedBehaviorTests" || gate.id === "freshnessIntegrity");
  const runtimeRequiredGates = evidenceReadiness.evidenceGates.filter((gate) =>
    gate.id === "runtimeProviderSmoke"
    || gate.id === "adminTruthSamples"
    || gate.id === "debugRuntimeEvidence"
    || gate.id === "algorithmicEvidenceCoverage"
    || gate.id === "formalEvidenceBridge");
  const requiredExitGates = evidenceReadiness.evidenceGates.filter((gate) => gate.gateRequiredForExit);
  const nonUiRequiredExitGates = [
    ...requiredExitGates,
    ...evidenceReadiness.evidenceGates.filter((gate) => gate.id === "formalEvidenceBridge"),
  ];
  const operatorFinalChecks = buildOperatorFinalChecks(uiSurfaceCoverageEvidence);
  const sourceHealthScore = roundScore(clamp((scannerScore * 0.7) + (average(sourceGates.map((gate) => gate.sourceCredit)) * 0.3), 0, 100));
  const runtimeHealthScore = average(runtimeRequiredGates.map((gate) => gate.runtimeCredit));
  const evidenceCompletenessScore = average(nonUiRequiredExitGates.map((gate) => gate.evidenceCredit));
  const freshnessScore = average(evidenceReadiness.evidenceGates.map((gate) => gate.freshness === "fresh" ? 100 : gate.freshness === "stale" ? 35 : gate.freshness === "head_mismatch" ? 40 : 0));
  const costRiskScore = costScore.score;
  const regressionRiskScore = regressionScore.score;
  const launchBlockers = Array.from(new Set([
    ...evidenceReadiness.evidenceGates
      .filter((gate) => gate.blocksLaunch && gate.gateRequiredForExit)
      .map((gate) => `${gate.label}: ${gate.status}`),
    ...(criticalAutoFail ? ["critical scanner finding blocks launch"] : []),
    ...(costScore.blocksLaunch ? costScore.reasons : []),
  ]));
  const launchGateStatus = launchGateStatusFrom({
    hasCritical: criticalAutoFail,
    readinessStatus: evidenceReadiness.readinessStatus,
    launchBlockers,
    costOwnerReview: costScore.ownerReviewRequired,
    runtimeHealthScore,
    evidenceCompletenessScore,
  });
  const healthScoreBreakdown: PublicBetaHealthScoreBreakdown = {
    sourceHealth: {
      weight: PUBLIC_BETA_HEALTH_DIMENSION_WEIGHTS.sourceHealth,
      score: sourceHealthScore,
      reasons: [`scannerScore=${scannerScore}`, `sourceGateCredit=${average(sourceGates.map((gate) => gate.sourceCredit))}`],
    },
    runtimeHealth: {
      weight: PUBLIC_BETA_HEALTH_DIMENSION_WEIGHTS.runtimeHealth,
      score: runtimeHealthScore,
      reasons: [
        ...runtimeRequiredGates.map((gate) => `${gate.label} runtimeCredit=${gate.runtimeCredit}`),
        "Below-target runtime health reflects source-activity evidence requirements or broken connectivity, not future activity placeholders.",
      ],
    },
    evidenceCompleteness: {
      weight: PUBLIC_BETA_HEALTH_DIMENSION_WEIGHTS.evidenceCompleteness,
      score: evidenceCompletenessScore,
      reasons: [
        "Deterministic UI surface coverage is source-owned and runs before any visual review.",
        "Quiet future activity does not reduce evidence completeness.",
        ...nonUiRequiredExitGates.map((gate) => `${gate.label} evidenceCredit=${gate.evidenceCredit}`),
      ],
    },
    freshness: {
      weight: PUBLIC_BETA_HEALTH_DIMENSION_WEIGHTS.freshness,
      score: freshnessScore,
      reasons: [
        ...evidenceReadiness.evidenceGates.map((gate) => `${gate.label} freshness=${gate.freshness}`),
        "Freshness penalties apply to stale score-impacting artifacts only, not non-events.",
      ],
    },
    costRisk: {
      weight: PUBLIC_BETA_HEALTH_DIMENSION_WEIGHTS.costRisk,
      score: costRiskScore,
      reasons: costScore.reasons.length > 0 ? costScore.reasons : ["Cost source inventory did not block launch."],
    },
    regressionRisk: {
      weight: PUBLIC_BETA_HEALTH_DIMENSION_WEIGHTS.regressionRisk,
      score: regressionRiskScore,
      reasons: [
        ...(regressionScore.reasons.length > 0 ? regressionScore.reasons : ["No current regression freshness penalty."]),
        "Regression risk is based on stale/high-blast evidence, not future activity that has not happened.",
      ],
    },
  };
  const healthScore = weightedHealthScore(healthScoreBreakdown);
  const launchCap = launchGateStatus === "launch_ready" ? 100 : capForReadinessStatus(evidenceReadiness.readinessStatus);
  const overallScore = roundScore(Math.min(healthScore, launchCap));
  const scoreDimensionExplanations = buildBelowTargetDimensionExplanations({
    metrics: {
      sourceHealth: sourceHealthScore,
      runtimeHealth: runtimeHealthScore,
      evidenceCompleteness: evidenceCompletenessScore,
      freshness: freshnessScore,
      costRisk: costRiskScore,
      regressionRisk: regressionRiskScore,
      overallHealthScore: healthScore,
    },
  });
  const summaryStatus = readinessStatusToLegacyStatus(evidenceReadiness.readinessStatus, overallScore, criticalAutoFail);
  const scoreDeltaDrivers = [
    `sourceHealthScore=${sourceHealthScore}`,
    `runtimeHealthScore=${runtimeHealthScore}`,
    `evidenceCompletenessScore=${evidenceCompletenessScore}`,
    `freshnessScore=${freshnessScore}`,
    `costRiskScore=${costRiskScore}`,
    `regressionRiskScore=${regressionRiskScore}`,
    `quietFutureActivityCount=${nonEventScorePolicy.quietFutureActivityCount}`,
    `actionableSignalGroupCount=${nonEventScorePolicy.actionableSignalGroupCount}`,
    `scoreDragSignalGroupCount=${nonEventScorePolicy.scoreDragSignalGroupCount}`,
    `nonEventScorePenaltyCount=${nonEventScorePolicy.nonEventScorePenaltyCount}`,
    launchBlockers.length > 0 ? `launchBlockers=${launchBlockers.length}` : "launchGates=clear",
  ];
  const studioDashboard = buildStudioDashboard({
    sourceHealthScore,
    runtimeHealthScore,
    evidenceCompletenessScore,
    freshnessScore,
    costRiskScore,
    regressionRiskScore,
    evidenceGates: evidenceReadiness.evidenceGates,
  });
  const launchClearance = buildLaunchClearance({
    launchGateStatus,
    launchBlockers,
    evidence: options.evidence,
  });
  const nuancedScoreExplanation = [
    "Source-ready evidence earns source health credit without becoming deployed runtime truth.",
    "Future activity placeholders and source-ready lanes waiting for first real user events do not reduce score.",
    "Debug signal score impact is counted from actionable groups, not raw quiet catalog rows.",
    "Deterministic UI surface coverage is the default UI readiness lane; browser reproduction is optional only to reproduce source-reported UI issues.",
    "Provider-backed site activity, deployed runtime route evidence, and admin source activity samples remain required for launch readiness.",
    "Outdated evidence, including reports generated before the latest code changes, decays freshness and raises regression risk instead of erasing source health.",
    "Owner-review cost lanes carry partial cost-risk credit and do not become passes.",
  ].map(normalizeTechnicalFreshnessTerms);
  const scoreExplanation = buildScoreExplanation({
    scannerScore,
    scannerStatus,
    evidenceScore: evidenceReadiness.evidenceScore,
    healthScore,
    launchGateStatus,
    readinessStatus: evidenceReadiness.readinessStatus,
    evidenceGates: evidenceReadiness.evidenceGates,
    evidenceCapDetails: evidenceReadiness.evidenceCapDetails,
  });

  return {
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    currentHead: options.currentHead,
    scoreVersion: "beta_health_v2",
    scannerScore,
    scannerStatus,
    sourceHealthScore,
    runtimeHealthScore,
    evidenceCompletenessScore,
    freshnessScore,
    costRiskScore,
    regressionRiskScore,
    quietFutureActivityCount: nonEventScorePolicy.quietFutureActivityCount,
    actionableSignalGroupCount: nonEventScorePolicy.actionableSignalGroupCount,
    scoreDragSignalGroupCount: nonEventScorePolicy.scoreDragSignalGroupCount,
    nonEventScorePenaltyCount: nonEventScorePolicy.nonEventScorePenaltyCount,
    launchGateStatus,
    launchBlockers,
    healthScore,
    healthScoreBreakdown,
    studioDashboard,
    launchClearance,
    scoreDimensionExplanations,
    scoreDeltaDrivers,
    nuancedScoreExplanation,
    overallScore,
    overallStatus: summaryStatus,
    readinessStatus: evidenceReadiness.readinessStatus,
    readinessStatusReason: evidenceReadiness.readinessStatusReason,
    evidenceScore: evidenceReadiness.evidenceScore,
    evidenceGates: evidenceReadiness.evidenceGates,
    evidenceCapsApplied: evidenceReadiness.evidenceCapsApplied,
    evidenceCapDetails: evidenceReadiness.evidenceCapDetails,
    evidenceWeights: PUBLIC_BETA_EVIDENCE_WEIGHTS,
    scoreExplanation,
    operatorFinalChecks,
    costReadiness,
    domainScores,
    findings,
    dedupedFindingCount: findings.length,
    safeAutofixesAvailable,
    safeAutofixesApplied: options.safeAutofixesApplied ?? 0,
    recommendedNextActions: options.recommendedNextActions ?? [],
    minimalVerificationCommands: options.minimalVerificationCommands ?? [],
    commandBudget: options.commandBudget,
    summary: `Public beta readiness score ${overallScore}/100 (${evidenceReadiness.readinessStatus}; scanner ${scannerScore}/100 ${scannerStatus}) with ${findings.length} deduped finding(s), ${safeAutofixesAvailable} safe autofix(es), and ${evidenceReadiness.evidenceCapsApplied.length} evidence cap(s) applied.`,
  };
}
