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
  evidenceArtifactHasSourceConfidence,
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
  versionStatus?: "current_head" | "same_commit_snapshot" | "current_by_impact" | "stale_source_version" | "missing_version";
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
  versionStatus?: PublicBetaGeneratedReportEvidence["versionStatus"];
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
  overallScoreMeaning: string;
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

export type PublicBetaOperatorActionLane =
  | "source_fix"
  | "source_verification"
  | "evidence_refresh"
  | "external_proof"
  | "owner_review";

export type PublicBetaOperatorAction = {
  id: string;
  lane: PublicBetaOperatorActionLane;
  title: string;
  action: string;
  source: string;
  blocksLaunch: boolean;
};

export type PublicBetaOperatorDecision = {
  version: "operator_decision_v1";
  sourceReadiness: {
    score: number;
    status: "ready" | "verification_due" | "needs_fix" | "blocked";
    detail: string;
  };
  releaseReadiness: {
    status: PublicBetaLaunchGateStatus;
    ready: boolean;
    blockerCount: number;
    detail: string;
  };
  primaryAction: PublicBetaOperatorAction | null;
  actionQueues: {
    sourceFixes: PublicBetaOperatorAction[];
    sourceVerification: PublicBetaOperatorAction[];
    evidenceRefresh: PublicBetaOperatorAction[];
    externalProof: PublicBetaOperatorAction[];
    ownerReview: PublicBetaOperatorAction[];
  };
  compositeConfidence: {
    score: number;
    useAsWorkTarget: false;
    detail: string;
  };
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
  activityVerificationEvidence?: PublicBetaEvidenceArtifact;
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
  id: keyof typeof PUBLIC_BETA_EVIDENCE_WEIGHTS | "uiSourceCoverage" | "debugRuntimeEvidence" | "algorithmicEvidenceCoverage" | "formalEvidenceBridge";
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
  operatorDecision: PublicBetaOperatorDecision;
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
  evidenceAdvisories: string[];
  evidenceAdvisoryDetails: string[];
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

function capForReadinessStatus(status: PublicBetaReadinessStatus) {
  switch (status) {
    case "Ready with smoke required":
    case "Source validation only":
      return PUBLIC_BETA_EVIDENCE_SCORE_CAPS.readyWithSmokeRequired;
    case "Source evidence required":
      return PUBLIC_BETA_EVIDENCE_SCORE_CAPS.unknownEvidence;
    case "External proof required":
      return PUBLIC_BETA_EVIDENCE_SCORE_CAPS.unknownEvidence;
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
  const statusPrefix = gate.status === "Source evidence required"
    ? gate.id === "runtimeProviderSmoke"
      ? "Source activity evidence required"
      : gate.id === "adminTruthSamples"
        ? "Admin source activity sample required"
        : gate.status
    : gate.status;

  if (gate.id === "targetedBehaviorTests") {
    if (gate.status === "Source validation only") {
      const targetedArtifactMissing = gate.evidence.some((entry) => /targetedBehaviorArtifactStatus=missing_formal_evidence/iu.test(entry));
      return targetedArtifactMissing && gate.sourceCredit > gate.evidenceCredit
        ? `${gate.status}: ${gate.label} - Source activity evidence is present; attach targeted source validator evidence before treating targeted behavior tests as passed.`
        : `${gate.status}: ${gate.label} - Source behavior passed; deployed route evidence, provider-backed source activity, and admin source activity lanes still need their matching records.`;
    }
    if (gate.status === "Stale evidence") {
      return `${gate.status}: ${gate.label} - Refresh the targeted source validator evidence.`;
    }
    if (gate.status === "Source evidence required" || gate.status === "Unknown evidence") {
      return `${gate.status}: ${gate.label} - Attach targeted source validator evidence.`;
    }
  }

  if (gate.id === "runtimeProviderSmoke") {
    const evidenceText = gate.evidence.join("\n");
    const providerMissing = /providerArtifactStatus=(missing_formal_evidence|operator_reported_not_formal_provider_smoke|missing_or_unknown)/iu.test(evidenceText);
    const runtimeCurrent = /runtimeArtifactStatus=(passed|formal_runtime_smoke_passed)|runtimeDeploymentSmokePassed=true|readinessImpact\.runtimeGatePassed=true/iu.test(evidenceText);
    if (gate.status === "External proof required" || gate.status === "Source evidence required") {
      if (gate.freshness === "stale" || gate.freshness === "head_mismatch") {
        return `${statusPrefix}: ${gate.label} - Refresh provider-backed source activity and deployed runtime route evidence.`;
      }
      if (providerMissing && runtimeCurrent) {
        return `${statusPrefix}: ${gate.label} - Produce provider-backed source activity evidence; deployed runtime route evidence is current.`;
      }
      return `${statusPrefix}: ${gate.label} - Produce provider-backed source activity and keep deployed runtime route evidence current.`;
    }
    if (gate.status === "Stale evidence") {
      return `${gate.status}: ${gate.label} - ${gate.recommendedAction}`;
    }
    if (gate.status === "Runtime unverified" || gate.status === "Ready with smoke required") {
      return `${gate.status}: ${gate.label} - Deployed runtime and provider-backed source evidence are still required.`;
    }
  }

  if (gate.id === "adminTruthSamples") {
    if (gate.status === "External proof required" || gate.status === "Source evidence required" || gate.status === "Unknown evidence") {
      if ((gate.status === "External proof required" || gate.status === "Source evidence required") && (gate.freshness === "stale" || gate.freshness === "head_mismatch")) {
        return `${statusPrefix}: ${gate.label} - Refresh redacted admin source activity evidence.`;
      }
      return `${statusPrefix}: ${gate.label} - Produce redacted admin source activity evidence.`;
    }
    if (gate.status === "Stale evidence") {
      return `${gate.status}: ${gate.label} - Refresh redacted admin source activity evidence.`;
    }
  }

  if (gate.id === "freshnessIntegrity" && gate.status === "Stale evidence") {
    return `${gate.status}: ${gate.label} - Refresh generated reports that are outside the freshness window.`;
  }

  return `${gate.status}: ${gate.label} - ${normalizeTechnicalFreshnessTerms(gate.recommendedAction || gate.detail)}`;
}

function readinessStatusToSourceEvidencePhrase(status: PublicBetaReadinessStatus) {
  switch (status) {
    case "Source evidence required":
      return "source evidence required";
    case "Source validation only":
      return "source validation only";
    case "Runtime unverified":
      return "deployed route source missing";
    case "External proof required":
      return "external source artifact required";
    case "Unknown evidence":
      return "source status unknown";
    case "Stale evidence":
      return "source evidence refresh due";
    case "Ready with smoke required":
      return "source ready; deployed check still required";
    case "Needs review":
      return "needs source review";
    case "Blocked":
      return "blocked";
    case "Ready":
      return "ready";
  }
}

function summarizeEvidenceCapTitle(gate: PublicBetaEvidenceGate) {
  const phrase = readinessStatusToSourceEvidencePhrase(gate.status);
  if (gate.id === "runtimeProviderSmoke") {
    if (gate.status === "Source evidence required") {
      return `${gate.label}: source activity evidence required`;
    }
    return `${gate.label}: ${phrase}`;
  }
  if (gate.id === "adminTruthSamples") {
    if (gate.status === "Source evidence required") {
      return "Admin source activity: sample required";
    }
    return `Admin source activity: ${phrase}`;
  }
  if (gate.id === "targetedBehaviorTests") {
    return `Targeted behavior source validation: ${phrase}`;
  }
  if (gate.id === "debugRuntimeEvidence") {
    return `Debug/runtime source evidence: ${phrase}`;
  }
  return `${gate.label}: ${phrase}`;
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

function adminSourceActivitySampleIsCurrent(
  artifact: PublicBetaEvidenceArtifact | undefined,
  evidence: string[],
  freshness: PublicBetaEvidenceFreshnessState,
) {
  const status = String(evidenceArtifactStatus(artifact, "missing_or_unknown"));
  return artifact?.passed === true
    && /passed|formal_admin_truth_sample_passed/iu.test(status)
    && /sampleCount=([1-9][0-9]*)/iu.test(evidence.join("\n"))
    && freshness === "fresh";
}

function observedSiteActivityCount(artifact: PublicBetaEvidenceArtifact | undefined) {
  return evidenceArtifactNumber(artifact, "observedSignals") ?? 0;
}

function realUsageObservedSiteActivityCount(input: {
  realUsageConfidenceEvidence?: PublicBetaEvidenceArtifact;
}) {
  return observedSiteActivityCount(input.realUsageConfidenceEvidence);
}

function sourceActivityClearsProviderLane(
  artifact: PublicBetaEvidenceArtifact | undefined,
  currentHead: string | undefined,
) {
  if (!artifact) return false;
  const status = String(evidenceArtifactStatus(artifact, "missing_or_unknown"));
  if (!status.includes("source_ready")) return false;
  const quality = resolveEvidenceQuality({
    artifact,
    context: { currentHead, lane: "source_backed_runtime_confidence", requiredForExit: false },
  });
  return artifact.passed === true
    && artifactMatchesCurrentHead(artifact, currentHead)
    && quality.freshness === "fresh"
    && (quality.quality === "source_ready" || quality.quality === "formal_passed")
    && (evidenceArtifactNumber(artifact, "liveRuntimeEvidence.firstPartySiteActivityConfirmed") ?? 0) > 0
    && (evidenceArtifactNumber(artifact, "liveRuntimeEvidence.providerRequired") ?? 1) === 0
    && (evidenceArtifactNumber(artifact, "liveRuntimeEvidence.blockedSiteActivityLanes") ?? 1) === 0
    && evidenceArtifactEvidence(artifact).some((line) => line.includes("launchGateImpact=site_activity_can_clear_connected_site_activity_lanes"));
}

function sourceActivityStillRequiresProviderArtifact(artifact: PublicBetaEvidenceArtifact | undefined) {
  return (evidenceArtifactNumber(artifact, "liveRuntimeEvidence.providerRequired") ?? 0) > 0;
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
    .filter((gate) => gate.blocksLaunch)
    .map((gate) => `${gate.label}: ${gate.status}`);

  return {
    scannerScoreMeaning: `Scanner score ${input.scannerScore}/100 (${input.scannerStatus}) is scanner-only source hygiene, not beta readiness.`,
    evidenceScoreMeaning: `Evidence score ${input.evidenceScore}/100 is partial-credit evidence confidence. Missing required lanes block launch and reduce evidence credit, but they do not erase unrelated source health. Health score ${input.healthScore}/100 currently maps to launch gate ${input.launchGateStatus}.`,
    overallScoreMeaning: "Overall score is a backward-compatible composite confidence signal. It is diagnostic trend context, not a work target or launch decision; use operatorDecision.sourceReadiness and operatorDecision.releaseReadiness instead.",
    missingEvidenceCaps: input.evidenceCapDetails,
    staleReportHandling: "Legacy launch/readiness reports are evidence snapshots and must be classified before they affect freshness math.",
    sourcePassConfidence: "Source-pass lanes increase confidence, but source passing does not clear provider-backed source activity, deployed route, admin source activity, or cost owner-review lanes unless matching source activity records are present. Deterministic UI surface coverage is the default UI readiness lane; browser reproduction is optional only after a source-reported issue.",
    betaExitBlockedBy: blockedBy,
  };
}

function readEvidenceListValue(artifact: PublicBetaEvidenceArtifact | undefined, key: string) {
  const prefix = `${key}=`;
  const entry = artifact?.evidence.find((item) => item.startsWith(prefix));
  if (!entry) return [];
  return entry.slice(prefix.length).split(",").map((item) => item.trim()).filter(Boolean);
}

function artifactMatchesCurrentHead(
  artifact: PublicBetaEvidenceArtifact | undefined,
  currentHead: string | undefined,
) {
  if (!artifact?.sourceCommit || !currentHead) return false;
  return artifact.sourceCommit === currentHead
    || artifact.versionStatus === "same_commit_snapshot"
    || artifact.versionStatus === "current_by_impact";
}

function buildOperatorFinalChecks(
  uiSurfaceCoverageEvidence: PublicBetaEvidenceArtifact | undefined,
  currentHead: string | undefined,
): PublicBetaOperatorFinalChecks {
  const requiredSurfaceIds = readEvidenceListValue(uiSurfaceCoverageEvidence, "uiVisualSmoke.requiredSurfaces");
  const pendingSurfaceIds = readEvidenceListValue(uiSurfaceCoverageEvidence, "uiVisualSmoke.missingSurfaces");
  const statusText = String(uiSurfaceCoverageEvidence?.status ?? "source_surface_checks_missing");
  const quality = resolveEvidenceQuality({
    artifact: uiSurfaceCoverageEvidence,
    context: { currentHead, lane: "ui_source_coverage", requiredForExit: true },
  });
  const declaredPass = /^(?:source_surface_checks_current|source_surface_checked|not_required)$/iu.test(statusText);
  const sourceChecksPassed = uiSurfaceCoverageEvidence?.passed === true
    && declaredPass
    && quality.freshness === "fresh"
    && artifactMatchesCurrentHead(uiSurfaceCoverageEvidence, currentHead);
  const status: PublicBetaOperatorFinalVisualSurface["status"] =
    sourceChecksPassed && (statusText === "source_surface_checks_current" || statusText === "source_surface_checked")
      ? "source_surface_checked"
      : statusText === "source_surface_checks_failed" || statusText === "source_surface_gap" || !sourceChecksPassed
        ? "source_surface_gap"
        : sourceChecksPassed && statusText === "not_required"
          ? "not_required"
          : "source_surface_gap";
  const surfaceIds = requiredSurfaceIds.length > 0 ? requiredSurfaceIds : pendingSurfaceIds;
  const pendingSet = new Set(pendingSurfaceIds);
  const needsOperatorReview = !sourceChecksPassed || status === "source_surface_gap" || pendingSurfaceIds.length > 0;

  return {
    uiVisualSurfaces: {
      status: needsOperatorReview ? status : "source_surface_checked",
      needsOperatorReview,
      passedInCodex: sourceChecksPassed,
      sourceChecksPassed,
      note: "deterministic UI surface coverage is the default UI readiness lane; browser reproduction is optional only to reproduce a source-reported UI issue and does not clear provider-backed source activity, deployed route, or admin source activity evidence.",
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
  const status: PublicBetaReadinessStatus = blocksLaunch && input.status === "Ready"
    ? "Needs review"
    : input.status;
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
    status,
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
    report.sourceCommit
    && report.currentHead
    && report.sourceCommit !== report.currentHead
    && report.versionStatus !== "same_commit_snapshot"
    && report.versionStatus !== "current_by_impact");

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
  currentHead?: string;
  evidence?: PublicBetaEvidenceInput;
}) {
  const evidence = input.evidence ?? {};
  const currentHead = input.currentHead ?? evidence.requiredReports?.find((report) => report.currentHead)?.currentHead;
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
    && evidence.debugRuntimeEvidenceArtifact?.passed === true
    && debugRuntimeEvidenceQuality.freshness === "fresh"
    && String(evidenceArtifactStatus(evidence.debugRuntimeEvidenceArtifact, "missing_or_unknown")).includes("source_ready");
  const debugEvidenceAvailable = hasDebugEvidence(evidence.debugEvidence) || debugRuntimeEvidenceArtifactReady;
  const freshnessStatus = mostSevereReadinessStatus([
    reportEvidence.status,
    evidence.openPrTriageFresh !== true || evidence.runtimeCodeChangedSinceReport ? "Needs review" : "Ready",
  ]);
  const freshnessDetail = freshnessStatus === reportEvidence.status && reportEvidence.status !== "Ready"
    ? reportEvidence.detail
    : evidence.runtimeCodeChangedSinceReport
      ? describeFreshnessState({ runtimeCodeChangedSinceReport: true }).userMessage
      : evidence.openPrTriageFresh !== true
        ? describeFreshnessState({ openPrTriageFresh: false }).userMessage
        : reportEvidence.detail;
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
    && evidence.realUsageConfidenceCalibrationEvidence?.passed === true
    && realUsageCalibrationQuality.freshness === "fresh"
    ? Math.max(
        realUsageCalibrationQuality.partialCredit * 100,
        clamp(evidenceArtifactNumber(evidence.realUsageConfidenceCalibrationEvidence, "runtimeHealthCredit") ?? 0, 0, 100),
      )
    : 0;
  const realUsageConfidenceCredit = realUsageConfidenceQuality.quality === "source_ready"
    && realUsageConfidenceStatus.includes("source_ready")
    && evidence.realUsageConfidenceEvidence?.passed === true
    && realUsageConfidenceQuality.freshness === "fresh"
    ? Math.max(
        realUsageConfidenceQuality.partialCredit * 100,
        clamp(evidenceArtifactNumber(evidence.realUsageConfidenceEvidence, "confidenceScore") ?? 0, 0, 100),
        realUsageCalibrationCredit,
      )
    : realUsageCalibrationCredit;
  const realUsageObservedActivitySignals = realUsageObservedSiteActivityCount({
    realUsageConfidenceEvidence: evidence.realUsageConfidenceEvidence,
  });
  const realUsageObservedActivityCredit = realUsageObservedActivitySignals > 0 ? realUsageConfidenceCredit : 0;
  const behaviorMathStatus = String(evidenceArtifactStatus(
    evidence.behaviorMathEvidence,
    "missing_or_unknown",
  ));
  const behaviorMathQuality = resolveEvidenceQuality({
    artifact: evidence.behaviorMathEvidence,
    context: {
      currentHead,
      lane: "behavior_math",
      requiredForExit: false,
    },
  });
  const behaviorMathSourceCredit = (behaviorMathQuality.quality === "source_ready" || evidenceArtifactHasSourceConfidence(evidence.behaviorMathEvidence))
    && behaviorMathQuality.freshness === "fresh"
    ? Math.max(
        behaviorMathQuality.partialCredit * 100,
        clamp(evidenceArtifactNumber(evidence.behaviorMathEvidence, "behaviorMathConfidence") ?? 0, 0, 100),
      )
    : 0;
  const activityVerificationStatus = String(evidenceArtifactStatus(
    evidence.activityVerificationEvidence,
    "missing_or_unknown",
  ));
  const activityVerificationQuality = resolveEvidenceQuality({
    artifact: evidence.activityVerificationEvidence,
    context: {
      currentHead,
      lane: "activity_verification",
      requiredForExit: false,
    },
  });
  const activityVerificationSourceCredit = activityVerificationQuality.quality === "source_ready"
    && activityVerificationQuality.freshness === "fresh"
    && (evidenceArtifactNumber(evidence.activityVerificationEvidence, "activityVerification.verifiedByActivity") ?? 0) > 0
    ? Math.max(
        activityVerificationQuality.partialCredit * 100,
        clamp(evidenceArtifactNumber(evidence.activityVerificationEvidence, "activityVerification.confidenceScore") ?? 0, 0, 100),
      )
    : 0;
  const targetedQuality = resolveEvidenceQuality({
    artifact: evidence.targetedBehaviorEvidence,
    context: {
      currentHead,
      lane: "targeted_behavior",
      requiredForExit: false,
    },
  });
  const targetedBehaviorPassed = targetedQuality.quality === "formal_passed";
  const targetedSourceCredit = Math.max(
    targetedQuality.partialCredit * 100,
    realUsageObservedActivityCredit,
    behaviorMathSourceCredit,
    activityVerificationSourceCredit,
  );
  const targetedBehaviorDetail = targetedSourceCredit > 0 && targetedQuality.quality === "missing"
    ? "Source-ready behavior math/site activity evidence was supplied; targeted behavior validator evidence is still required before treating targeted behavior tests as passed."
    : evidenceArtifactDetail(
        evidence.targetedBehaviorEvidence,
        targetedBehaviorPassed
          ? "Targeted behavior evidence was supplied."
          : "No targeted source behavior evidence artifact was supplied.",
      );
  const behaviorMathTargetedEvidence = evidence.behaviorMathEvidence
    ? [
        `behaviorMathStatus=${behaviorMathStatus}`,
        `behaviorMathSourceCredit=${roundScore(behaviorMathSourceCredit)}`,
        ...evidenceArtifactEvidence(evidence.behaviorMathEvidence),
      ]
    : [];
  const activityVerificationTargetedEvidence = evidence.activityVerificationEvidence
    ? [
        `activityVerificationStatus=${activityVerificationStatus}`,
        `activityVerificationSourceCredit=${roundScore(activityVerificationSourceCredit)}`,
        ...evidenceArtifactEvidence(evidence.activityVerificationEvidence),
      ]
    : [];
  const targetedBehaviorEvidence = evidence.targetedBehaviorEvidence
    ? [
        ...evidenceArtifactEvidence(evidence.targetedBehaviorEvidence),
        ...behaviorMathTargetedEvidence,
        ...activityVerificationTargetedEvidence,
      ]
    : [
        "targetedBehaviorArtifactStatus=missing_formal_evidence",
        ...behaviorMathTargetedEvidence,
        ...activityVerificationTargetedEvidence,
      ];
  const targetedBehaviorStatus: PublicBetaReadinessStatus = targetedBehaviorPassed
    ? "Ready"
    : targetedQuality.freshness === "stale" || targetedQuality.freshness === "head_mismatch"
      ? "Stale evidence"
      : targetedQuality.quality === "source_ready" || targetedQuality.quality === "formal_partial" || targetedSourceCredit > 0
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
  const providerSmokePassed = providerQuality.quality === "formal_passed"
    && providerQuality.freshness === "fresh"
    && !providerQuality.blocksLaunch;
  const runtimeSmokePassed = runtimeQuality.quality === "formal_passed"
    && runtimeQuality.freshness === "fresh"
    && !runtimeQuality.blocksLaunch;
  const providerSmokeStatus = String(evidenceArtifactStatus(evidence.providerSmokeEvidence));
  const runtimeSmokeStatus = String(evidenceArtifactStatus(evidence.runtimeSmokeEvidence, "runtime_unverified"));
  const providerLaneSatisfiedBySourceActivity = sourceActivityClearsProviderLane(
    evidence.sourceBackedRuntimeConfidenceEvidence,
    currentHead,
  );
  const providerLaneRequiresExternalArtifact = sourceActivityStillRequiresProviderArtifact(evidence.sourceBackedRuntimeConfidenceEvidence);
  const runtimeProviderSmokePassed = (providerSmokePassed || providerLaneSatisfiedBySourceActivity) && runtimeSmokePassed;
  const providerActivityEvidenceRequired = /missing_formal_evidence|operator_reported_not_formal_provider_smoke|tracked_not_passing|missing_or_unknown/iu.test(providerSmokeStatus);
  const runtimeRouteEvidenceRequired = /runtime_unverified|missing_formal_evidence|tracked_not_passing|missing_or_unknown/iu.test(runtimeSmokeStatus);
  const runtimeEvidenceRecorded = runtimeSmokePassed || /formal_runtime_smoke_passed|passed_formal_evidence|passed/iu.test(runtimeSmokeStatus);
  const providerEvidenceRecorded = providerSmokePassed || providerLaneSatisfiedBySourceActivity || /formal_provider_smoke_passed|passed_formal_evidence|passed/iu.test(providerSmokeStatus);
  const runtimeProviderSmokeFreshnessUnknown = (!providerLaneSatisfiedBySourceActivity && providerQuality.freshness === "unknown")
    || runtimeQuality.freshness === "unknown";
  const providerSmokeOutdated = providerQuality.freshness === "stale" || providerQuality.freshness === "head_mismatch";
  const runtimeSmokeOutdated = runtimeQuality.freshness === "stale" || runtimeQuality.freshness === "head_mismatch";
  let runtimeProviderSmokeStatus: PublicBetaReadinessStatus = "Ready with smoke required";
  if (runtimeProviderSmokePassed && !runtimeProviderSmokeFreshnessUnknown) {
    runtimeProviderSmokeStatus = "Ready";
  } else if (providerQuality.quality === "failed" || runtimeQuality.quality === "failed") {
    runtimeProviderSmokeStatus = "Needs review";
  } else if (providerSmokeOutdated || runtimeSmokeOutdated) {
    runtimeProviderSmokeStatus = "Stale evidence";
  } else if (providerActivityEvidenceRequired && providerLaneRequiresExternalArtifact && !providerLaneSatisfiedBySourceActivity) {
    runtimeProviderSmokeStatus = "External proof required";
  } else if ((providerActivityEvidenceRequired && !providerLaneSatisfiedBySourceActivity) || runtimeRouteEvidenceRequired) {
    runtimeProviderSmokeStatus = "Source evidence required";
  } else if (runtimeProviderSmokeFreshnessUnknown) {
    runtimeProviderSmokeStatus = "Unknown evidence";
  } else if (runtimeSmokeStatus === "runtime_unverified") {
    runtimeProviderSmokeStatus = "Runtime unverified";
  }
  const providerSmokeDetail = evidenceArtifactDetail(
    evidence.providerSmokeEvidence,
    providerSmokePassed ? "Provider-backed source activity evidence was supplied." : "No provider-backed source activity evidence artifact was supplied.",
  );
  const runtimeSmokeDetail = evidenceArtifactDetail(
    evidence.runtimeSmokeEvidence,
    runtimeSmokePassed ? "Runtime route evidence was supplied." : "No deployed runtime route evidence artifact was supplied.",
  );
  const runtimeProviderSmokeDetail = runtimeProviderSmokePassed
    ? "Provider-backed source activity and deployed route evidence artifacts passed."
    : `Provider-backed source activity: ${providerLaneSatisfiedBySourceActivity ? "First-party site activity shows no provider-backed evidence is required for the connected lane." : providerSmokeDetail} Deployed route evidence: ${runtimeSmokePassed && (!providerSmokePassed || providerLaneSatisfiedBySourceActivity) ? "Deployed runtime route evidence is current." : runtimeSmokeDetail}`;
  const runtimeProviderSmokeLabel = providerActivityEvidenceRequired && runtimeEvidenceRecorded
    ? "Provider-backed source activity evidence"
    : runtimeRouteEvidenceRequired && providerEvidenceRecorded
      ? "Deployed route evidence"
      : "Provider-backed source activity + deployed route evidence";
  const runtimeProviderSmokeRecommendedAction = providerSmokeOutdated || runtimeSmokeOutdated
    ? `Refresh ${[
        providerSmokeOutdated ? "provider-backed source activity evidence" : providerActivityEvidenceRequired ? "or produce provider-backed source activity evidence" : null,
        runtimeSmokeOutdated ? "deployed runtime route evidence" : runtimeRouteEvidenceRequired ? "or produce deployed runtime route evidence" : null,
      ].filter(Boolean).join(" and ")} for the current code version.`
    : providerActivityEvidenceRequired && runtimeEvidenceRecorded
      ? "Produce provider-backed source activity evidence; keep deployed route evidence current."
      : runtimeRouteEvidenceRequired && providerEvidenceRecorded
        ? "Produce deployed runtime route evidence; keep provider-backed source activity evidence current."
        : "Keep provider-backed source activity and deployed route evidence current before clearing launch readiness.";
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
  const sourceBackedRuntimeObservedActivityCount =
    evidenceArtifactNumber(evidence.sourceBackedRuntimeConfidenceEvidence, "liveRuntimeEvidence.firstPartySiteActivityConfirmed") ?? 0;
  const sourceBackedRuntimeConfidenceCredit = sourceBackedRuntimeConfidenceQuality.quality === "source_ready"
    && sourceBackedRuntimeConfidenceStatus.includes("source_ready")
    && evidence.sourceBackedRuntimeConfidenceEvidence?.passed === true
    && sourceBackedRuntimeConfidenceQuality.freshness === "fresh"
    && sourceBackedRuntimeObservedActivityCount > 0
    ? sourceBackedRuntimeConfidenceQuality.partialCredit * 100
    : 0;
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
    && evidence.runtimeSmokeSubstituteMatrixEvidence?.passed === true
    && runtimeSmokeSubstituteMatrixQuality.freshness === "fresh"
    ? Math.max(
        runtimeSmokeSubstituteMatrixQuality.partialCredit * 100,
        clamp(evidenceArtifactNumber(evidence.runtimeSmokeSubstituteMatrixEvidence, "matrixRuntimeHealthCredit") ?? 0, 0, 100),
      )
    : 0;
  const runtimeSmokeSubstituteMatrixActivityCredit = runtimeSmokeSubstituteMatrixQuality.quality === "source_ready"
    && runtimeSmokeSubstituteMatrixStatus.includes("source_ready")
    && evidence.runtimeSmokeSubstituteMatrixEvidence?.passed === true
    && runtimeSmokeSubstituteMatrixQuality.freshness === "fresh"
    ? clamp(evidenceArtifactNumber(evidence.runtimeSmokeSubstituteMatrixEvidence, "matrixRuntimeProviderActivityCredit") ?? 0, 0, 100)
    : 0;
  const runtimeProviderSourceActivityCredit = Math.max(
    sourceBackedRuntimeConfidenceCredit,
    realUsageObservedActivityCredit,
    runtimeSmokeSubstituteMatrixActivityCredit,
  );
  const deployedRuntimeRouteCredit = runtimeSmokePassed
    ? runtimeQuality.partialCredit * 100
    : 0;
  const runtimeProviderRuntimeCredit = runtimeProviderSmokePassed
    ? 100
    : Math.max(runtimeProviderSourceActivityCredit, deployedRuntimeRouteCredit);
  const runtimeProviderEvidenceWithSourceConfidence = Array.from(new Set([
    ...runtimeProviderSmokeEvidence,
    `deployedRuntimeRouteCredit=${roundScore(deployedRuntimeRouteCredit)}`,
    `providerBackedSourceActivityCredit=${roundScore(runtimeProviderSourceActivityCredit)}`,
    ...(
      evidence.sourceBackedRuntimeConfidenceEvidence
        ? [
            `sourceBackedRuntimeConfidenceStatus=${sourceBackedRuntimeConfidenceStatus}`,
            `sourceBackedRuntimeObservedActivity=${roundScore(sourceBackedRuntimeObservedActivityCount)}`,
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
            `realUsageObservedSignals=${roundScore(realUsageObservedActivitySignals)}`,
            `realUsageObservedActivityCredit=${roundScore(realUsageObservedActivityCredit)}`,
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
            `runtimeSmokeSubstituteMatrixActivityCredit=${roundScore(runtimeSmokeSubstituteMatrixActivityCredit)}`,
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
      : providerLaneSatisfiedBySourceActivity && runtimeSmokePassed
        ? "source_ready"
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
    freshness: providerLaneSatisfiedBySourceActivity ? runtimeQuality.freshness : providerQuality.freshness === "fresh" ? runtimeQuality.freshness : providerQuality.freshness,
    freshnessScore: providerLaneSatisfiedBySourceActivity ? runtimeQuality.freshnessScore : Math.min(providerQuality.freshnessScore, runtimeQuality.freshnessScore),
    partialCredit: runtimeProviderSmokePassed ? 1 : roundScore(Math.max(runtimeProviderFormalCredit, runtimeProviderSourceActivityCredit / 100)),
    blocksLaunch: providerLaneSatisfiedBySourceActivity && runtimeSmokePassed ? false : providerQuality.blocksLaunch || runtimeQuality.blocksLaunch,
    reason: providerLaneSatisfiedBySourceActivity
      ? `${runtimeProviderSmokeDetail} Provider-specific source activity evidence remains separate only for lanes that declare provider evidence is required.`
      : `${runtimeProviderSmokeDetail} Evidence bridge source confidence is partial and does not clear provider-backed source activity or deployed runtime route evidence.`,
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
  const currentAdminSourceActivitySamplePassed = adminBaseQuality.quality === "formal_passed"
    && !adminBaseQuality.blocksLaunch
    && artifactMatchesCurrentHead(evidence.adminTruthSampleEvidence, currentHead)
    && adminSourceActivitySampleIsCurrent(
      evidence.adminTruthSampleEvidence,
      adminTruthSampleEvidenceRaw,
      adminBaseQuality.freshness,
    );
  const adminTruthSamplePassed = currentAdminSourceActivitySamplePassed;
  const adminSourceActivityEvidenceRequired = /missing_formal_evidence|missing_or_unknown|tracked_not_passing|admin_truth_sample_required/iu.test(adminTruthSampleStatus);
  const adminTruthSampleDetail = evidenceArtifactDetail(
    evidence.adminTruthSampleEvidence,
    adminTruthSamplePassed
      ? "Admin source activity evidence was supplied."
      : "No admin source activity evidence artifact was supplied.",
  );
  const adminTruthSampleEvidence = adminTruthSampleEvidenceRaw;
  const adminBridgeEvidenceCredit = formalEvidenceBridge.gates.adminTruthSamples.evidenceCredit;
  const adminBridgeCanContribute = currentAdminSourceActivitySamplePassed
    || (adminBaseQuality.quality === "source_ready"
      && adminBaseQuality.freshness === "fresh"
      && evidence.adminTruthSampleEvidence?.passed === true);
  const adminBridgeCredit = adminBridgeCanContribute ? adminBridgeEvidenceCredit / 100 : 0;
  const adminSourceActivityCredit = adminBridgeCredit;
  const adminQuality = {
    ...adminBaseQuality,
    quality: adminBaseQuality.quality,
    confidence: Math.max(adminBaseQuality.confidence, adminBridgeCredit * 0.9),
    partialCredit: adminTruthSamplePassed
      ? roundScore(Math.max(adminBaseQuality.partialCredit, adminSourceActivityCredit))
      : roundScore(adminSourceActivityCredit),
    blocksLaunch: adminBaseQuality.blocksLaunch,
    reason: adminBaseQuality.quality === "formal_passed"
      ? adminBaseQuality.reason
      : "Admin source evidence earns partial bridge confidence; the admin lane needs matching source activity evidence before clearing.",
  } satisfies ReturnType<typeof resolveEvidenceQuality>;
  const adminTruthSampleFreshnessUnknown = adminBaseQuality.freshness === "unknown";
  let adminTruthSampleStatusLabel: PublicBetaReadinessStatus = "Source evidence required";
  if (adminTruthSamplePassed && !adminTruthSampleFreshnessUnknown) {
    adminTruthSampleStatusLabel = "Ready";
  } else if (adminBaseQuality.quality === "failed") {
    adminTruthSampleStatusLabel = "Needs review";
  } else if (adminSourceActivityEvidenceRequired) {
    adminTruthSampleStatusLabel = "Source evidence required";
  } else if (adminBaseQuality.quality === "source_ready" || adminBridgeCredit > 0) {
    adminTruthSampleStatusLabel = "Source evidence required";
  } else if (adminBaseQuality.freshness === "stale" || adminBaseQuality.freshness === "head_mismatch") {
    adminTruthSampleStatusLabel = "Stale evidence";
  } else if (adminTruthSampleFreshnessUnknown) {
    adminTruthSampleStatusLabel = "Unknown evidence";
  }

  const uiSurfaceCoverageStatus = String(evidenceArtifactStatus(
    evidence.uiSurfaceCoverageEvidence,
    "source_surface_checks_missing",
  ));
  const uiBaseQuality = resolveEvidenceQuality({
    artifact: evidence.uiSurfaceCoverageEvidence,
    context: {
      currentHead,
      lane: "ui_source_coverage",
      requiredForExit: true,
    },
  });
  const uiSurfaceCoverageDeclaredPass = /^(?:source_surface_checks_current|source_surface_checked|not_required)$/iu
    .test(uiSurfaceCoverageStatus);
  const uiSurfaceCoveragePassed = evidence.uiSurfaceCoverageEvidence?.passed === true
    && uiSurfaceCoverageDeclaredPass
    && uiBaseQuality.freshness === "fresh"
    && artifactMatchesCurrentHead(evidence.uiSurfaceCoverageEvidence, currentHead);
  const uiSurfaceCoverageQuality = {
    ...uiBaseQuality,
    quality: uiSurfaceCoveragePassed
      ? "source_ready"
      : uiBaseQuality.quality === "failed"
        ? "failed"
        : uiBaseQuality.freshness === "stale" || uiBaseQuality.freshness === "head_mismatch"
          ? "stale"
          : "missing",
    confidence: uiSurfaceCoveragePassed ? 1 : 0,
    partialCredit: uiSurfaceCoveragePassed ? 1 : 0,
    blocksLaunch: !uiSurfaceCoveragePassed,
    reason: uiSurfaceCoveragePassed
      ? "Deterministic UI source coverage passed for the current code version."
      : uiBaseQuality.freshness === "head_mismatch"
        ? "UI source coverage was generated before the latest code changes."
        : evidence.uiSurfaceCoverageEvidence?.passed === false && uiSurfaceCoverageDeclaredPass
          ? "UI source coverage declares a current status but its pass flag is false."
          : evidenceArtifactDetail(evidence.uiSurfaceCoverageEvidence, "Current deterministic UI source coverage is required."),
  } satisfies ReturnType<typeof resolveEvidenceQuality>;
  const uiSurfaceCoverageReadinessStatus: PublicBetaReadinessStatus = uiSurfaceCoveragePassed
    ? "Ready"
    : uiBaseQuality.freshness === "stale" || uiBaseQuality.freshness === "head_mismatch"
      ? "Stale evidence"
      : uiBaseQuality.freshness === "unknown"
        ? "Unknown evidence"
        : evidence.uiSurfaceCoverageEvidence?.passed === false && uiSurfaceCoverageDeclaredPass
          ? "Needs review"
          : "Source evidence required";

  const sourceFindingsRemain = input.scannerScore < 100;
  const sourceSafetyQuality = {
    quality: input.hasCritical ? "failed" : sourceFindingsRemain ? "formal_partial" : "formal_passed",
    confidence: input.hasCritical ? 0 : input.scannerScore / 100,
    freshness: "fresh",
    freshnessScore: 1,
    partialCredit: input.hasCritical ? 0 : input.scannerScore / 100,
    blocksLaunch: sourceFindingsRemain,
    reason: input.hasCritical
      ? "High-confidence critical scanner findings remain."
      : sourceFindingsRemain
        ? "Verified source findings remain and must be fixed or explicitly accepted before release readiness can be true."
        : "Deterministic source scanners found no scored source defect.",
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
    `providerActivityGateCleared=${algorithmicEvidencePolicy.formalGateImpact.formalProviderGateCleared}`,
    `adminSourceActivityGateCleared=${algorithmicEvidencePolicy.formalGateImpact.formalAdminRuntimeSampleCleared}`,
    ...algorithmicEvidencePolicy.coverage.map((item) =>
      `${item.category}: confidence=${item.confidence}; score=${item.score}; source=${item.sourcePath}; ${item.distinction}`),
  ];

  const gates: PublicBetaEvidenceGate[] = [
    buildEvidenceGate({
      id: "sourceSafety",
      label: "Source safety",
      weight: PUBLIC_BETA_EVIDENCE_WEIGHTS.sourceSafety,
      status: input.hasCritical ? "Blocked" : sourceFindingsRemain ? "Needs review" : "Ready",
      detail: input.hasCritical
        ? "High-confidence critical scanner findings remain."
        : sourceFindingsRemain
          ? "Verified source findings remain and release readiness stays false until they are fixed or explicitly accepted."
          : "Deterministic source scanners found no scored source defect.",
      evidence: [`scannerStatus=${input.scannerStatus}`, `scannerScore=${input.scannerScore}`],
      recommendedAction: sourceFindingsRemain
        ? "Fix the scored source findings and rerun their targeted validators before evaluating release readiness."
        : "Keep source scanner lane in the fast loop.",
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
      sourceCredit: targetedSourceCredit,
      runtimeCredit: 0,
    }),
    buildEvidenceGate({
      id: "uiSourceCoverage",
      label: "UI source coverage",
      weight: 0,
      status: uiSurfaceCoverageReadinessStatus,
      detail: uiSurfaceCoverageQuality.reason,
      evidence: evidence.uiSurfaceCoverageEvidence
        ? [
            `uiSurfaceCoverageStatus=${uiSurfaceCoverageStatus}`,
            `uiSurfaceCoveragePassed=${evidence.uiSurfaceCoverageEvidence.passed}`,
            ...evidenceArtifactEvidence(evidence.uiSurfaceCoverageEvidence),
          ]
        : ["uiSurfaceCoverageStatus=source_surface_checks_missing"],
      recommendedAction: "Run the deterministic UI source coverage validator for the current code version; use browser reproduction only when that source lane reports a concrete issue.",
      quality: uiSurfaceCoverageQuality,
      gateRequiredForExit: true,
      sourceCredit: uiSurfaceCoveragePassed ? 100 : 0,
      runtimeCredit: 0,
    }),
    buildEvidenceGate({
      id: "runtimeProviderSmoke",
      label: runtimeProviderSmokeLabel,
      weight: PUBLIC_BETA_EVIDENCE_WEIGHTS.runtimeProviderSmoke,
      status: runtimeProviderSmokeStatus,
      detail: runtimeProviderSmokeDetail,
      evidence: runtimeProviderEvidenceWithSourceConfidence,
      recommendedAction: runtimeProviderSmokeRecommendedAction,
      quality: runtimeProviderQuality,
      gateRequiredForExit: true,
      sourceCredit: Math.max(
        runtimeQuality.quality === "source_ready" ? runtimeQuality.partialCredit * 100 : 0,
        sourceBackedRuntimeConfidenceCredit,
        realUsageObservedActivityCredit,
        runtimeSmokeSubstituteMatrixActivityCredit,
        runtimeProviderQuality.partialCredit * 100,
      ),
      runtimeCredit: runtimeProviderRuntimeCredit,
    }),
    buildEvidenceGate({
      id: "adminTruthSamples",
      label: "Admin source activity evidence",
      weight: PUBLIC_BETA_EVIDENCE_WEIGHTS.adminTruthSamples,
      status: adminTruthSampleStatusLabel,
      detail: adminTruthSampleDetail,
      evidence: adminTruthSampleEvidence,
      recommendedAction: "Require redacted admin source activity evidence before rendering zero/live/healthy as launch truth.",
      quality: adminQuality,
      gateRequiredForExit: true,
      sourceCredit: adminTruthSamplePassed || adminQuality.quality === "source_ready" || adminQuality.quality === "formal_partial"
        ? adminBridgeEvidenceCredit
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
      recommendedAction: "Do not treat empty debug evidence as source-backed evidence that no runtime issue exists.",
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
        `providerActivityGateCleared=${formalEvidenceBridge.formalGateStatus.providerSmoke.cleared}`,
        `adminSourceActivitySampleCleared=${formalEvidenceBridge.formalGateStatus.adminProductionSample.cleared}`,
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
          adminBridgeCredit,
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

  const weightedEvidenceGates = gates.filter((gate) => gate.maxScore > 0);
  const weightedEvidenceScore = weightedEvidenceGates.reduce((sum, gate) => sum + gate.score, 0);
  const weightedEvidenceMaximum = weightedEvidenceGates.reduce((sum, gate) => sum + gate.maxScore, 0);
  const evidenceScore = roundScore((weightedEvidenceScore / Math.max(1, weightedEvidenceMaximum)) * 100);
  const blockingGates = gates.filter((gate) => gate.gateRequiredForExit || gate.blocksLaunch);
  const readinessGates = blockingGates.length > 0 ? blockingGates : gates;
  const readinessStatus = mostSevereReadinessStatus(readinessGates.map((gate) => gate.status));
  const capGates = gates.filter((gate) => gate.status !== "Ready" && (gate.gateRequiredForExit || gate.blocksLaunch));
  const advisoryGates = gates.filter((gate) => gate.status !== "Ready" && !gate.gateRequiredForExit && !gate.blocksLaunch);
  const caps = capGates
    .map(summarizeEvidenceCapTitle);
  const evidenceCapDetails = capGates
    .map(summarizeEvidenceGateForCap);
  const evidenceAdvisories = advisoryGates.map(summarizeEvidenceCapTitle);
  const evidenceAdvisoryDetails = advisoryGates.map(summarizeEvidenceGateForCap);
  const readinessCap = capForReadinessStatus(readinessStatus);
  const readinessGate = readinessGates.find((gate) => gate.status === readinessStatus);

  return {
    evidenceScore,
    readinessStatus,
    readinessStatusReason: readinessGate ? summarizeEvidenceGateForCap(readinessGate) : "Evidence gates passed.",
    evidenceGates: gates,
    evidenceCapsApplied: caps,
    evidenceCapDetails,
    evidenceAdvisories,
    evidenceAdvisoryDetails,
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
  costBlocksLaunch: boolean;
  runtimeHealthScore: number;
  evidenceCompletenessScore: number;
}): PublicBetaLaunchGateStatus {
  if (input.hasCritical || input.readinessStatus === "Blocked" || input.costBlocksLaunch) return "blocked";
  if (input.launchBlockers.length > 0) return "source_ready";
  if (input.costOwnerReview) return "owner_review";
  if (input.launchBlockers.length === 0 && input.evidenceCompletenessScore >= 95 && input.runtimeHealthScore >= 95) {
    return "launch_ready";
  }
  if (input.evidenceCompletenessScore >= 90) return "evidence_complete";
  if (input.runtimeHealthScore >= 70) return "runtime_proven";
  return "source_ready";
}

function buildOperatorDecision(input: {
  sourceHealthScore: number;
  overallScore: number;
  hasCritical: boolean;
  findings: PublicBetaFinding[];
  evidenceGates: PublicBetaEvidenceGate[];
  costReadiness: PublicBetaCostReadiness;
  launchGateStatus: PublicBetaLaunchGateStatus;
  launchBlockers: string[];
}): PublicBetaOperatorDecision {
  const findingActions: PublicBetaOperatorAction[] = input.findings
    .filter((finding) => finding.weightedPenalty > 0)
    .map((finding) => ({
      id: `finding:${finding.id}`,
      lane: "source_fix",
      title: finding.title,
      action: `Resolve the verified ${finding.severity} source finding in ${finding.filePath}, then run its targeted validator.`,
      source: finding.filePath,
      blocksLaunch: true,
    }));
  const openGates = input.evidenceGates
    .map((gate, index) => ({ gate, index }))
    .filter(({ gate }) => gate.status !== "Ready");
  const gateAction = (
    gate: PublicBetaEvidenceGate,
    index: number,
    lane: PublicBetaOperatorActionLane,
  ): PublicBetaOperatorAction => ({
    id: `gate:${gate.id}:${index}`,
    lane,
    title: gate.label,
    action: normalizeTechnicalFreshnessTerms(gate.recommendedAction || gate.detail),
    source: `evidenceGate:${gate.id}`,
    blocksLaunch: gate.blocksLaunch,
  });
  const sourceSafetyActions = openGates
    .filter(({ gate }) => gate.id === "sourceSafety" && findingActions.length === 0)
    .map(({ gate, index }) => gateAction(gate, index, "source_fix"));
  const externalProof = openGates
    .filter(({ gate }) => gate.id === "runtimeProviderSmoke" || gate.id === "adminTruthSamples")
    .map(({ gate, index }) => gateAction(gate, index, "external_proof"));
  const evidenceRefresh = openGates
    .filter(({ gate }) => (
      gate.id !== "runtimeProviderSmoke"
      && gate.id !== "adminTruthSamples"
      && (gate.id === "freshnessIntegrity" || gate.freshness === "stale" || gate.freshness === "head_mismatch")
    ))
    .map(({ gate, index }) => gateAction(gate, index, "evidence_refresh"));
  const sourceVerification = openGates
    .filter(({ gate }) => (
      gate.id !== "sourceSafety"
      && gate.id !== "runtimeProviderSmoke"
      && gate.id !== "adminTruthSamples"
      && gate.id !== "freshnessIntegrity"
      && gate.freshness !== "stale"
      && gate.freshness !== "head_mismatch"
    ))
    .map(({ gate, index }) => gateAction(gate, index, "source_verification"));
  const ownerReview = (Object.entries(input.costReadiness) as Array<[keyof PublicBetaCostReadiness, PublicBetaCostReadinessLane]>)
    .filter(([, lane]) => lane.blocksBetaExit || /owner_review|cost_review|external_review/iu.test(lane.status))
    .map(([laneId, lane]): PublicBetaOperatorAction => ({
      id: `cost:${laneId}`,
      lane: "owner_review",
      title: laneId.replace(/Readiness$/u, " readiness").replace(/([a-z])([A-Z])/gu, "$1 $2"),
      action: normalizeTechnicalFreshnessTerms(lane.detail),
      source: `costReadiness:${laneId}`,
      blocksLaunch: lane.blocksBetaExit,
    }));
  const sourceFixes = [...findingActions, ...sourceSafetyActions];
  const blockingSourceVerification = sourceVerification.filter((action) => action.blocksLaunch);
  const blockingEvidenceRefresh = evidenceRefresh.filter((action) => action.blocksLaunch);
  const sourceStatus = input.hasCritical
    ? "blocked"
    : sourceFixes.length > 0
      ? "needs_fix"
      : blockingSourceVerification.length > 0 || blockingEvidenceRefresh.length > 0
        ? "verification_due"
        : "ready";
  const sourceDetail = input.hasCritical
    ? "A verified critical source finding blocks release work."
    : sourceFixes.length > 0
      ? `${sourceFixes.length} locally fixable source finding(s) remain.`
      : blockingSourceVerification.length > 0 || blockingEvidenceRefresh.length > 0
        ? `No scanner defect is blocking, but ${blockingSourceVerification.length + blockingEvidenceRefresh.length} required local verification or evidence refresh action(s) remain.`
        : sourceVerification.length > 0 || evidenceRefresh.length > 0
          ? `Required source gates are ready; ${sourceVerification.length + evidenceRefresh.length} optional advisory action(s) remain.`
          : "No scanner defect or local source-verification action remains in the current score input.";
  const primaryAction = sourceFixes[0]
    ?? sourceVerification[0]
    ?? evidenceRefresh[0]
    ?? externalProof[0]
    ?? ownerReview[0]
    ?? null;
  const releaseReady = input.launchGateStatus === "launch_ready"
    && input.launchBlockers.length === 0
    && sourceStatus === "ready"
    && ownerReview.length === 0;

  return {
    version: "operator_decision_v1",
    sourceReadiness: {
      score: input.sourceHealthScore,
      status: sourceStatus,
      detail: sourceDetail,
    },
    releaseReadiness: {
      status: input.launchGateStatus,
      ready: releaseReady,
      blockerCount: input.launchBlockers.length,
      detail: releaseReady
        ? "All modeled launch gates are clear. Protected payment, provider, deployment, and production truth still require their owning release contracts."
        : `${input.launchBlockers.length} launch blocker(s) remain; missing proof stays separate from local source defects.`,
    },
    primaryAction,
    actionQueues: {
      sourceFixes,
      sourceVerification,
      evidenceRefresh,
      externalProof,
      ownerReview,
    },
    compositeConfidence: {
      score: input.overallScore,
      useAsWorkTarget: false,
      detail: "Backward-compatible composite confidence only. Do not chase this number; act on the typed queues and release gate.",
    },
  };
}

function buildLaunchClearance(input: {
  launchGateStatus: PublicBetaLaunchGateStatus;
  launchBlockers: string[];
  currentHead?: string;
  evidence?: PublicBetaEvidenceInput;
}): PublicBetaLaunchClearance {
  const evidence = input.evidence ?? {};
  const providerSmoke = evidence.providerSmokeEvidence;
  const runtimeSmoke = evidence.runtimeSmokeEvidence;
  const adminTruth = evidence.adminTruthSampleEvidence;
  const uiSurfaceCoverage = evidence.uiSurfaceCoverageEvidence;
  const providerQuality = resolveEvidenceQuality({
    artifact: providerSmoke,
    context: { currentHead: input.currentHead, lane: "provider_smoke", requiredForExit: true },
  });
  const runtimeQuality = resolveEvidenceQuality({
    artifact: runtimeSmoke,
    context: { currentHead: input.currentHead, lane: "runtime_smoke", requiredForExit: true, requiresRuntimeProof: true },
  });
  const adminTruthStatus = String(evidenceArtifactStatus(adminTruth, "missing_or_unknown"));
  const adminTruthEvidence = Array.from(new Set([
    `adminTruthSampleArtifactStatus=${adminTruthStatus}`,
    ...evidenceArtifactEvidence(adminTruth),
  ]));
  const adminTruthQuality = resolveEvidenceQuality({
    artifact: adminTruth,
    context: {
      currentHead: input.currentHead,
      lane: "admin_truth_sample",
      requiredForExit: true,
      requiresRuntimeProof: true,
    },
  });
  const adminTruthSampleCleared = adminTruthQuality.quality === "formal_passed"
    && !adminTruthQuality.blocksLaunch
    && artifactMatchesCurrentHead(adminTruth, input.currentHead)
    && adminSourceActivitySampleIsCurrent(adminTruth, adminTruthEvidence, adminTruthQuality.freshness);
  const uiSurfaceCoverageStatus = String(evidenceArtifactStatus(uiSurfaceCoverage, "source_surface_checks_missing"));
  const uiSurfaceCoverageQuality = resolveEvidenceQuality({
    artifact: uiSurfaceCoverage,
    context: { currentHead: input.currentHead, lane: "ui_source_coverage", requiredForExit: true },
  });
  const uiSurfaceCoverageCleared = uiSurfaceCoverage?.passed === true
    && /^(?:source_surface_checks_current|source_surface_checked|not_required)$/iu.test(uiSurfaceCoverageStatus)
    && uiSurfaceCoverageQuality.freshness === "fresh"
    && artifactMatchesCurrentHead(uiSurfaceCoverage, input.currentHead);
  const providerSmokeCleared = providerQuality.quality === "formal_passed"
    && providerQuality.freshness === "fresh"
    && !providerQuality.blocksLaunch;
  const runtimeSmokeCleared = runtimeQuality.quality === "formal_passed"
    && runtimeQuality.freshness === "fresh"
    && !runtimeQuality.blocksLaunch;
  return {
    status: input.launchGateStatus,
    blockers: input.launchBlockers,
    formalGates: {
      providerSmoke: {
        cleared: providerSmokeCleared,
        status: String(evidenceArtifactStatus(providerSmoke)),
        source: providerSmoke?.path ?? "agent/state/provider-smoke-evidence.generated.json",
      },
      deployedRuntimeSmoke: {
        cleared: runtimeSmokeCleared,
        status: String(evidenceArtifactStatus(runtimeSmoke, "runtime_unverified")),
        source: runtimeSmoke?.path ?? "agent/state/runtime-smoke-evidence.generated.json",
      },
      adminTruthSample: {
        cleared: adminTruthSampleCleared,
        status: adminTruthStatus,
        source: adminTruth?.path ?? "agent/state/admin-truth-sample-evidence.generated.json",
      },
      uiSurfaceCoverage: {
        cleared: uiSurfaceCoverageCleared,
        status: uiSurfaceCoverageStatus,
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
  const currentHead = options.currentHead
    ?? options.evidence?.requiredReports?.find((report) => report.currentHead)?.currentHead;
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
    currentHead,
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
    gate.id === "sourceSafety" || gate.id === "targetedBehaviorTests");
  const runtimeRequiredGates = evidenceReadiness.evidenceGates.filter((gate) =>
    gate.id === "runtimeProviderSmoke"
    || gate.id === "adminTruthSamples");
  const requiredExitGates = evidenceReadiness.evidenceGates.filter((gate) => gate.gateRequiredForExit);
  const freshnessGates = evidenceReadiness.evidenceGates.filter((gate) => gate.maxScore > 0 || gate.gateRequiredForExit);
  const freshnessWeights = freshnessGates.map((gate) => gate.maxScore > 0 ? gate.maxScore : 1);
  const freshnessWeightedTotal = freshnessGates.reduce((sum, gate, index) => {
    const freshnessCredit = gate.freshness === "fresh" ? 100 : gate.freshness === "stale" ? 35 : gate.freshness === "head_mismatch" ? 40 : 0;
    return sum + (freshnessCredit * (freshnessWeights[index] ?? 1));
  }, 0);
  const operatorFinalChecks = buildOperatorFinalChecks(uiSurfaceCoverageEvidence, currentHead);
  const sourceHealthScore = roundScore(clamp((scannerScore * 0.7) + (average(sourceGates.map((gate) => gate.sourceCredit)) * 0.3), 0, 100));
  const runtimeHealthScore = average(runtimeRequiredGates.map((gate) => gate.runtimeCredit));
  const evidenceCompletenessScore = average(requiredExitGates.map((gate) => gate.evidenceCredit));
  const freshnessScore = roundScore(freshnessWeightedTotal / Math.max(1, freshnessWeights.reduce((sum, weight) => sum + weight, 0)));
  const costRiskScore = costScore.score;
  const regressionRiskScore = regressionScore.score;
  const launchBlockers = Array.from(new Set([
    ...evidenceReadiness.evidenceGates
      .filter((gate) => gate.blocksLaunch)
      .map((gate) => `${gate.label}: ${gate.status}`),
    ...(criticalAutoFail ? ["critical scanner finding blocks launch"] : []),
    ...(costScore.blocksLaunch ? costScore.reasons : []),
  ]));
  const launchGateStatus = launchGateStatusFrom({
    hasCritical: criticalAutoFail,
    readinessStatus: evidenceReadiness.readinessStatus,
    launchBlockers,
    costOwnerReview: costScore.ownerReviewRequired,
    costBlocksLaunch: costScore.blocksLaunch,
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
        ...requiredExitGates.map((gate) => `${gate.label} evidenceCredit=${gate.evidenceCredit}`),
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
  const summaryStatus = resolvePublicBetaStatus(overallScore, criticalAutoFail);
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
  const readinessDisplayStatus = evidenceReadiness.readinessStatus === "Source evidence required"
    && evidenceReadiness.evidenceCapsApplied.some((cap) => (
      /source activity evidence required|sample required/iu.test(cap)
    ))
    ? "Source activity evidence required"
    : evidenceReadiness.readinessStatus;
  const operatorDecision = buildOperatorDecision({
    sourceHealthScore,
    overallScore,
    hasCritical: criticalAutoFail,
    findings,
    evidenceGates: evidenceReadiness.evidenceGates,
    costReadiness,
    launchGateStatus,
    launchBlockers,
  });
  const launchClearance = buildLaunchClearance({
    launchGateStatus,
    launchBlockers,
    currentHead,
    evidence: options.evidence,
  });
  const nuancedScoreExplanation = [
    "Source-ready evidence earns source health credit without becoming deployed runtime truth.",
    "Future activity placeholders and source-ready lanes waiting for first real user events do not reduce score.",
    "Debug signal score impact is counted from actionable groups, not raw quiet catalog rows.",
    "Deterministic UI surface coverage is the default UI readiness lane; browser reproduction is optional only to reproduce source-reported UI issues.",
    "Provider-backed source activity, deployed runtime route evidence, and admin source activity evidence remain required for launch readiness.",
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
    currentHead,
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
    operatorDecision,
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
    evidenceAdvisories: evidenceReadiness.evidenceAdvisories,
    evidenceAdvisoryDetails: evidenceReadiness.evidenceAdvisoryDetails,
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
    summary: `Source readiness ${sourceHealthScore}/100 (${operatorDecision.sourceReadiness.status}); launch gate ${launchGateStatus} with ${launchBlockers.length} blocker(s). Composite confidence ${overallScore}/100 is diagnostic-only; ${evidenceReadiness.evidenceCapsApplied.length} release cap(s) and ${evidenceReadiness.evidenceAdvisories.length} advisory item(s) remain (${readinessDisplayStatus}).`,
  };
}
