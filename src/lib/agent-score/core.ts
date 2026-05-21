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
  type PublicBetaEvidenceFreshnessState,
  type PublicBetaEvidenceQuality,
} from "./evidence-quality";
import {
  describeFreshnessState,
  normalizeTechnicalFreshnessTerms,
} from "./freshness-language";
import { buildAlgorithmicEvidencePolicyReport } from "./algorithmic-evidence-policy";
import type { DebugEvidenceAuditSummary } from "../debug-evidence-contract";

export type PublicBetaDomain = keyof typeof PUBLIC_BETA_DOMAIN_WEIGHTS;
export type PublicBetaSeverity = keyof typeof PUBLIC_BETA_SEVERITY_PENALTIES;
export type PublicBetaBlastRadius = keyof typeof PUBLIC_BETA_BLAST_RADIUS_MULTIPLIERS;
export type PublicBetaStatus = "clean" | "pass" | "warning" | "beta-risk" | "fail";
export type PublicBetaReadinessStatus =
  | "Ready"
  | "Ready with smoke required"
  | "Needs review"
  | "Blocked"
  | "Unknown evidence"
  | "Stale evidence"
  | "Runtime unverified"
  | "Visual QA required";
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
  status: "operator_final_pending" | "operator_confirmed_outside_codex" | "screenshot_attached" | "not_required";
  needsOperatorReview: boolean;
};

export type PublicBetaOperatorFinalChecks = {
  uiVisualSurfaces: {
    status: "operator_final_pending" | "operator_confirmed_outside_codex" | "screenshot_attached" | "not_required";
    needsOperatorReview: boolean;
    passedInCodex: false;
    note: string;
    sourcePath: string;
    surfaces: PublicBetaOperatorFinalVisualSurface[];
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
  visualManualEvidence?: PublicBetaEvidenceArtifact;
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
};

export type PublicBetaEvidenceGate = {
  id: keyof typeof PUBLIC_BETA_EVIDENCE_WEIGHTS | "debugRuntimeEvidence" | "algorithmicEvidenceCoverage";
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
  launchGateStatus: PublicBetaLaunchGateStatus;
  launchBlockers: string[];
  healthScore: number;
  healthScoreBreakdown: PublicBetaHealthScoreBreakdown;
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
  "Ready with smoke required": 1,
  "Runtime unverified": 2,
  "Visual QA required": 3,
  "Unknown evidence": 4,
  "Needs review": 5,
  "Stale evidence": 6,
  Blocked: 7,
};

function mostSevereReadinessStatus(statuses: PublicBetaReadinessStatus[]) {
  return statuses.reduce<PublicBetaReadinessStatus>((current, status) =>
    READINESS_STATUS_RANK[status] > READINESS_STATUS_RANK[current] ? status : current, "Ready");
}

function readinessStatusToLegacyStatus(status: PublicBetaReadinessStatus, score: number, hasCritical: boolean): PublicBetaStatus {
  if (status === "Blocked" || hasCritical) return "fail";
  if (status === "Stale evidence" || status === "Needs review") return "beta-risk";
  if (status === "Unknown evidence" || status === "Visual QA required" || status === "Runtime unverified") return "warning";
  if (status === "Ready with smoke required") return score >= PUBLIC_BETA_STATUS_THRESHOLDS.pass ? "pass" : "warning";
  return resolvePublicBetaStatus(score, hasCritical);
}

function capForReadinessStatus(status: PublicBetaReadinessStatus) {
  switch (status) {
    case "Ready with smoke required":
      return PUBLIC_BETA_EVIDENCE_SCORE_CAPS.readyWithSmokeRequired;
    case "Runtime unverified":
      return PUBLIC_BETA_EVIDENCE_SCORE_CAPS.runtimeUnverified;
    case "Visual QA required":
      return PUBLIC_BETA_EVIDENCE_SCORE_CAPS.visualQaRequired;
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

const NON_PASSING_EVIDENCE_STATUSES = new Set<string>([
  "missing_formal_evidence",
  "operator_reported_not_formal_provider_smoke",
  "runtime_unverified",
  "missing_or_unknown",
  "failed",
  "stale",
  "unavailable",
  "needs_review",
  "tracked_not_passing",
]);

export function evidenceArtifactPassed(
  artifact: PublicBetaEvidenceArtifact | undefined,
  fallbackBoolean?: boolean,
) {
  if (!artifact) return fallbackBoolean === true;
  const status = String(artifact.status);
  return artifact.passed === true
    && !NON_PASSING_EVIDENCE_STATUSES.has(status)
    && !/source[_-]ready|runtime_proof_required/iu.test(status);
}

export function evidenceArtifactStatus(
  artifact: PublicBetaEvidenceArtifact | undefined,
  fallbackStatus = "missing_formal_evidence",
) {
  return artifact?.status ?? fallbackStatus;
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
    ...artifact.evidence,
  ]));
}

function evidenceArtifactNumber(artifact: PublicBetaEvidenceArtifact | undefined, key: string) {
  const match = artifact?.evidence.find((entry) => entry.includes(`${key}=`));
  if (!match) return undefined;
  const value = Number(match.slice(match.indexOf(`${key}=`) + key.length + 1));
  return Number.isFinite(value) ? value : undefined;
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
    sourcePassConfidence: "Source-pass lanes increase confidence, but source passing does not clear provider, runtime, admin truth, or cost owner-review evidence caps. Visual confirmation handled outside Codex as an operator-final checklist.",
    betaExitBlockedBy: blockedBy,
  };
}

function readEvidenceListValue(artifact: PublicBetaEvidenceArtifact | undefined, key: string) {
  const prefix = `${key}=`;
  const entry = artifact?.evidence.find((item) => item.startsWith(prefix));
  if (!entry) return [];
  return entry.slice(prefix.length).split(",").map((item) => item.trim()).filter(Boolean);
}

function buildOperatorFinalChecks(visualManualEvidence?: PublicBetaEvidenceArtifact): PublicBetaOperatorFinalChecks {
  const requiredSurfaceIds = readEvidenceListValue(visualManualEvidence, "uiVisualSmoke.requiredSurfaces");
  const pendingSurfaceIds = readEvidenceListValue(visualManualEvidence, "uiVisualSmoke.missingSurfaces");
  const statusText = String(visualManualEvidence?.status ?? "operator_final_pending");
  const status: PublicBetaOperatorFinalVisualSurface["status"] =
    statusText === "operator_confirmed_outside_codex"
      ? "operator_confirmed_outside_codex"
      : statusText === "screenshot_attached"
        ? "screenshot_attached"
        : statusText === "not_required"
          ? "not_required"
          : "operator_final_pending";
  const surfaceIds = requiredSurfaceIds.length > 0 ? requiredSurfaceIds : pendingSurfaceIds;
  const pendingSet = new Set(pendingSurfaceIds);
  const needsOperatorReview = status === "operator_final_pending" || pendingSurfaceIds.length > 0;

  return {
    uiVisualSurfaces: {
      status: needsOperatorReview ? "operator_final_pending" : status,
      needsOperatorReview,
      passedInCodex: false,
      note: "visual confirmation handled outside Codex; this checklist tracks changed UI surfaces for operator-final review and does not block Codex source/debug scoring.",
      sourcePath: visualManualEvidence?.path ?? "agent/state/ui-visual-smoke-minimal.generated.json",
      surfaces: surfaceIds.map((surfaceId) => ({
        surfaceId,
        status: pendingSet.has(surfaceId) ? "operator_final_pending" : status,
        needsOperatorReview: pendingSet.size === 0 ? needsOperatorReview : pendingSet.has(surfaceId),
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
      status: "Unknown evidence" as const,
      score: 0,
      detail: `${unknownReports.length} required generated report(s) have unknown freshness.`,
      evidence: unknownReports.map((report) => report.path),
    };
  }
  if (requiredReports.length === 0) {
    return {
      status: "Unknown evidence" as const,
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
  const targetedBehaviorPassed = evidenceArtifactPassed(
    evidence.targetedBehaviorEvidence,
    evidence.hasTargetedBehaviorEvidence,
  );
  const targetedBehaviorDetail = evidenceArtifactDetail(
    evidence.targetedBehaviorEvidence,
    targetedBehaviorPassed
      ? "Targeted behavior evidence was supplied."
      : "No formal targeted behavior evidence artifact was supplied.",
  );
  const targetedBehaviorEvidence = evidence.targetedBehaviorEvidence
    ? evidenceArtifactEvidence(evidence.targetedBehaviorEvidence)
    : ["targetedBehaviorArtifactStatus=missing_formal_evidence"];
  const targetedQuality = resolveEvidenceQuality({
    artifact: evidence.targetedBehaviorEvidence,
    context: {
      currentHead,
      lane: "targeted_behavior",
      requiredForExit: false,
    },
  });

  const artifactBackedSmoke = Boolean(evidence.providerSmokeEvidence || evidence.runtimeSmokeEvidence);
  const providerSmokePassed = evidenceArtifactPassed(
    evidence.providerSmokeEvidence,
    artifactBackedSmoke ? false : evidence.hasProviderSmokeEvidence,
  );
  const runtimeSmokePassed = evidenceArtifactPassed(
    evidence.runtimeSmokeEvidence,
    artifactBackedSmoke ? false : evidence.hasProviderSmokeEvidence,
  );
  const providerSmokeStatus = String(evidenceArtifactStatus(evidence.providerSmokeEvidence));
  const runtimeSmokeStatus = String(evidenceArtifactStatus(evidence.runtimeSmokeEvidence, "runtime_unverified"));
  const runtimeProviderSmokePassed = providerSmokePassed && runtimeSmokePassed;
  const runtimeProviderSmokeStatus: PublicBetaReadinessStatus = runtimeProviderSmokePassed
    ? "Ready"
    : runtimeSmokeStatus === "runtime_unverified"
      ? "Runtime unverified"
      : "Ready with smoke required";
  const providerSmokeDetail = evidenceArtifactDetail(
    evidence.providerSmokeEvidence,
    providerSmokePassed ? "Provider smoke evidence was supplied." : "No formal provider smoke evidence artifact was supplied.",
  );
  const runtimeSmokeDetail = evidenceArtifactDetail(
    evidence.runtimeSmokeEvidence,
    runtimeSmokePassed ? "Runtime smoke evidence was supplied." : "No formal runtime smoke evidence artifact was supplied.",
  );
  const runtimeProviderSmokeDetail = runtimeProviderSmokePassed
    ? "Provider and runtime smoke artifacts passed."
    : `Provider smoke: ${providerSmokeDetail} Runtime smoke: ${runtimeSmokeDetail}`;
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
  const runtimeProviderRuntimeCredit = runtimeProviderSmokePassed
    ? 100
    : Math.max(sourceBackedRuntimeConfidenceCredit, realUsageConfidenceCredit, runtimeSmokeSubstituteMatrixCredit);
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
    confidence: Math.min(providerQuality.confidence, runtimeQuality.confidence),
    freshness: providerQuality.freshness === "fresh" ? runtimeQuality.freshness : providerQuality.freshness,
    freshnessScore: Math.min(providerQuality.freshnessScore, runtimeQuality.freshnessScore),
    partialCredit: roundScore((providerQuality.partialCredit + runtimeQuality.partialCredit) / 2),
    blocksLaunch: providerQuality.blocksLaunch || runtimeQuality.blocksLaunch,
    reason: runtimeProviderSmokeDetail,
  } satisfies ReturnType<typeof resolveEvidenceQuality>;

  const adminTruthSamplePassed = evidenceArtifactPassed(
    evidence.adminTruthSampleEvidence,
    evidence.hasAdminTruthSampleEvidence,
  );
  const adminTruthSampleStatus = String(evidenceArtifactStatus(evidence.adminTruthSampleEvidence, "missing_or_unknown"));
  const adminTruthSampleDetail = evidenceArtifactDetail(
    evidence.adminTruthSampleEvidence,
    adminTruthSamplePassed
      ? "Admin truth/sample evidence was supplied."
      : "No admin truth sample evidence artifact was supplied.",
  );
  const adminTruthSampleEvidence = Array.from(new Set([
    `adminTruthSampleArtifactStatus=${adminTruthSampleStatus}`,
    ...evidenceArtifactEvidence(evidence.adminTruthSampleEvidence),
  ]));
  const adminQuality = resolveEvidenceQuality({
    artifact: evidence.adminTruthSampleEvidence,
    context: {
      currentHead,
      lane: "admin_truth_sample",
      requiredForExit: true,
      requiresRuntimeProof: true,
    },
  });
  const adminTruthSampleStatusLabel: PublicBetaReadinessStatus = adminTruthSamplePassed
    ? "Ready"
    : adminQuality.quality === "source_ready"
      ? "Ready with smoke required"
      : "Unknown evidence";

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
    ? debugRuntimeEvidenceQuality
    : {
    quality: debugEvidenceAvailable ? "formal_partial" : "missing",
    confidence: debugEvidenceAvailable ? 0.65 : 0,
    freshness: debugEvidenceAvailable ? "fresh" : "missing",
    freshnessScore: debugEvidenceAvailable ? 1 : 0,
    partialCredit: debugEvidenceAvailable ? 0.65 : 0,
    blocksLaunch: false,
    reason: debugEvidenceAvailable
      ? "Runtime debug evidence is present in the score input."
      : "Debug evidence is empty, so absence of runtime issues is unknown.",
  } satisfies ReturnType<typeof resolveEvidenceQuality>;
  const debugRuntimeEvidenceLines = evidence.debugRuntimeEvidenceArtifact
    ? evidenceArtifactEvidence(evidence.debugRuntimeEvidenceArtifact)
    : [];
  const algorithmicEvidencePolicy = buildAlgorithmicEvidencePolicyReport({
    visualManualEvidence: evidence.visualManualEvidence,
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
    `manualScreenshotBlocksNonUi=${algorithmicEvidencePolicy.manualEvidenceScope.nonUiAlgorithmicEvidence.blockedByManualScreenshot}`,
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
      status: targetedBehaviorPassed ? "Ready" : "Unknown evidence",
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
      label: "Runtime/provider smoke",
      weight: PUBLIC_BETA_EVIDENCE_WEIGHTS.runtimeProviderSmoke,
      status: runtimeProviderSmokeStatus,
      detail: runtimeProviderSmokeDetail,
      evidence: runtimeProviderEvidenceWithSourceConfidence,
      recommendedAction: "Treat launch as smoke-required until PayPal, deployment, push, and provider checks are recorded.",
      quality: runtimeProviderQuality,
      gateRequiredForExit: true,
      sourceCredit: runtimeQuality.quality === "source_ready" ? runtimeQuality.partialCredit * 100 : runtimeProviderQuality.partialCredit * 100,
      runtimeCredit: runtimeProviderRuntimeCredit,
    }),
    buildEvidenceGate({
      id: "adminTruthSamples",
      label: "Admin truth/sample evidence",
      weight: PUBLIC_BETA_EVIDENCE_WEIGHTS.adminTruthSamples,
      status: adminTruthSampleStatusLabel,
      detail: adminTruthSampleDetail,
      evidence: adminTruthSampleEvidence,
      recommendedAction: "Require first-party sample evidence before rendering zero/live/healthy as launch truth.",
      quality: adminQuality,
      gateRequiredForExit: true,
      sourceCredit: adminQuality.quality === "source_ready" ? adminQuality.partialCredit * 100 : undefined,
      runtimeCredit: adminQuality.quality === "formal_passed"
        ? adminQuality.partialCredit * 100
        : adminQuality.quality === "source_ready"
          ? adminQuality.partialCredit * 100
          : 0,
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
      status: debugEvidenceAvailable ? "Ready" : "Unknown evidence",
      detail: debugRuntimeEvidenceArtifactReady
        ? "source-backed debug/runtime evidence checked debug sources without clearing deployed runtime smoke."
        : debugEvidenceAvailable
        ? "Runtime debug evidence is present in the score input."
        : "Debug evidence is empty, so absence of runtime issues is unknown.",
      evidence: debugRuntimeEvidenceLines,
      recommendedAction: "Do not treat empty debug evidence as proof that no runtime issue exists.",
      quality: debugQuality,
      gateRequiredForExit: false,
      runtimeCredit: debugRuntimeEvidenceArtifactReady ? debugRuntimeEvidenceQuality.partialCredit * 100 : debugEvidenceAvailable ? 50 : 0,
    }),
    buildEvidenceGate({
      id: "algorithmicEvidenceCoverage",
      label: "Algorithmic non-UI evidence coverage",
      weight: 0,
      status: algorithmicEvidencePolicy.overallStatus === "algorithmic_evidence_policy_ready" ? "Ready" : "Needs review",
      detail: "Non-UI runtime, telemetry, admin source, provider signal, cost, and refresh confidence are scored separately from UI screenshot evidence.",
      evidence: algorithmicCoverageEvidence,
      recommendedAction: "Use algorithmic evidence for non-UI confidence while keeping visual, provider, runtime, and admin formal gates explicit.",
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
          : "Algorithmic evidence coverage is partial non-UI confidence and does not clear formal gates.",
      },
      gateRequiredForExit: false,
      sourceCredit: algorithmicEvidencePolicy.nonUiAlgorithmicCoverageScore,
      runtimeCredit: Math.max(
        algorithmicEvidencePolicy.runtimeSourceConfidence.score,
        algorithmicEvidencePolicy.telemetryConfidence.score,
        algorithmicEvidencePolicy.adminTruthConfidence.score,
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
    .map((gate) => `${gate.status}: ${gate.label} - ${gate.detail}`);
  const readinessCap = capForReadinessStatus(readinessStatus);

  return {
    evidenceScore,
    readinessStatus,
    readinessStatusReason: gates.find((gate) => gate.status === readinessStatus)?.detail ?? "Evidence gates passed.",
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
  const costReadiness = options.evidence?.costReadiness ?? DEFAULT_COST_READINESS;
  const costScore = scoreCostReadiness(costReadiness);
  const regressionScore = scoreRegressionRisk({
    requiredReports: options.evidence?.requiredReports,
    runtimeCodeChangedSinceReport: options.evidence?.runtimeCodeChangedSinceReport,
    openPrTriageFresh: options.evidence?.openPrTriageFresh,
    recentHighBlastFilesChanged: recentFiles.some((file) =>
      /paypal|wallet|gumdrop|booking|analytics|admin|runtime|creator/iu.test(file)),
  });
  const sourceGates = evidenceReadiness.evidenceGates.filter((gate) =>
    gate.id === "sourceSafety" || gate.id === "targetedBehaviorTests" || gate.id === "freshnessIntegrity");
  const runtimeRequiredGates = evidenceReadiness.evidenceGates.filter((gate) =>
    gate.id === "runtimeProviderSmoke"
    || gate.id === "adminTruthSamples"
    || gate.id === "debugRuntimeEvidence"
    || gate.id === "algorithmicEvidenceCoverage");
  const requiredExitGates = evidenceReadiness.evidenceGates.filter((gate) => gate.gateRequiredForExit);
  const nonUiRequiredExitGates = requiredExitGates;
  const operatorFinalChecks = buildOperatorFinalChecks(options.evidence?.visualManualEvidence);
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
      reasons: runtimeRequiredGates.map((gate) => `${gate.label} runtimeCredit=${gate.runtimeCredit}`),
    },
    evidenceCompleteness: {
      weight: PUBLIC_BETA_HEALTH_DIMENSION_WEIGHTS.evidenceCompleteness,
      score: evidenceCompletenessScore,
      reasons: [
        "UI visual review is an operator-final checklist outside Codex score gates.",
        ...nonUiRequiredExitGates.map((gate) => `${gate.label} evidenceCredit=${gate.evidenceCredit}`),
      ],
    },
    freshness: {
      weight: PUBLIC_BETA_HEALTH_DIMENSION_WEIGHTS.freshness,
      score: freshnessScore,
      reasons: evidenceReadiness.evidenceGates.map((gate) => `${gate.label} freshness=${gate.freshness}`),
    },
    costRisk: {
      weight: PUBLIC_BETA_HEALTH_DIMENSION_WEIGHTS.costRisk,
      score: costRiskScore,
      reasons: costScore.reasons.length > 0 ? costScore.reasons : ["Cost source inventory did not block launch."],
    },
    regressionRisk: {
      weight: PUBLIC_BETA_HEALTH_DIMENSION_WEIGHTS.regressionRisk,
      score: regressionRiskScore,
      reasons: regressionScore.reasons.length > 0 ? regressionScore.reasons : ["No current regression freshness penalty."],
    },
  };
  const healthScore = weightedHealthScore(healthScoreBreakdown);
  const launchCap = launchGateStatus === "launch_ready" ? 100 : capForReadinessStatus(evidenceReadiness.readinessStatus);
  const overallScore = roundScore(Math.min(healthScore, launchCap));
  const summaryStatus = readinessStatusToLegacyStatus(evidenceReadiness.readinessStatus, overallScore, criticalAutoFail);
  const scoreDeltaDrivers = [
    `sourceHealthScore=${sourceHealthScore}`,
    `runtimeHealthScore=${runtimeHealthScore}`,
    `evidenceCompletenessScore=${evidenceCompletenessScore}`,
    `freshnessScore=${freshnessScore}`,
    `costRiskScore=${costRiskScore}`,
    `regressionRiskScore=${regressionRiskScore}`,
    launchBlockers.length > 0 ? `launchBlockers=${launchBlockers.length}` : "launchGates=clear",
  ];
  const nuancedScoreExplanation = [
    "Source-ready evidence earns source health credit without becoming runtime proof.",
    "UI visual confirmation is handled outside Codex as an operator-final checklist and does not block source/debug/beta scoring.",
    "Formal provider, deployed runtime, and admin truth artifacts remain required for launch readiness.",
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
    launchGateStatus,
    launchBlockers,
    healthScore,
    healthScoreBreakdown,
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
