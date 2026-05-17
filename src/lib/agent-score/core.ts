import {
  PUBLIC_BETA_BLAST_RADIUS_MULTIPLIERS,
  PUBLIC_BETA_DOMAIN_WEIGHTS,
  PUBLIC_BETA_EVIDENCE_SCORE_CAPS,
  PUBLIC_BETA_EVIDENCE_WEIGHTS,
  PUBLIC_BETA_SEVERITY_PENALTIES,
  PUBLIC_BETA_STATUS_THRESHOLDS,
} from "./weights";
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

export type PublicBetaEvidenceInput = {
  requiredReports?: PublicBetaGeneratedReportEvidence[];
  debugEvidence?: Record<string, DebugEvidenceAuditSummary[]>;
  targetedBehaviorEvidence?: PublicBetaEvidenceArtifact;
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
  id: keyof typeof PUBLIC_BETA_EVIDENCE_WEIGHTS | "debugRuntimeEvidence";
  label: string;
  weight: number;
  score: number;
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
  scannerScore: number;
  scannerStatus: PublicBetaStatus;
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
  return artifact.passed === true && !NON_PASSING_EVIDENCE_STATUSES.has(String(artifact.status));
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
  return artifact?.detail || fallbackDetail;
}

export function evidenceArtifactEvidence(artifact: PublicBetaEvidenceArtifact | undefined) {
  if (!artifact) return [];
  return Array.from(new Set([
    `artifactPath=${artifact.path}`,
    `artifactStatus=${artifact.status}`,
    `artifactPassed=${artifact.passed}`,
    ...(artifact.generatedAtUtc ? [`generatedAtUtc=${artifact.generatedAtUtc}`] : []),
    ...(artifact.sourceCommit ? [`sourceCommit=${artifact.sourceCommit}`] : []),
    `artifactDetail=${artifact.detail}`,
    ...artifact.evidence,
  ]));
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
  readinessStatus: PublicBetaReadinessStatus;
  evidenceGates: PublicBetaEvidenceGate[];
  evidenceCapDetails: string[];
}): PublicBetaScoreExplanation {
  const blockedBy = input.evidenceGates
    .filter((gate) => gate.status !== "Ready")
    .map((gate) => `${gate.label}: ${gate.status}`);

  return {
    scannerScoreMeaning: `Scanner score ${input.scannerScore}/100 (${input.scannerStatus}) is scanner-only source hygiene, not beta readiness.`,
    evidenceScoreMeaning: `Evidence score ${input.evidenceScore}/100 is the sum of passed formal evidence gates; missing lanes score zero.`,
    missingEvidenceCaps: input.evidenceCapDetails,
    staleReportHandling: "Legacy launch/readiness reports are evidence snapshots and must be classified before they affect freshness math.",
    sourcePassConfidence: "Source-pass lanes increase confidence, but source passing does not clear visual, provider, runtime, admin truth, or cost owner-review evidence caps.",
    betaExitBlockedBy: blockedBy,
  };
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
      detail: `${commitMismatches.length} generated report(s) were created before the current HEAD.`,
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
  const reportEvidence = summarizeRequiredReportEvidence(evidence.requiredReports);
  const debugEvidenceAvailable = hasDebugEvidence(evidence.debugEvidence);
  const freshnessStatus = mostSevereReadinessStatus([
    reportEvidence.status,
    evidence.openPrTriageFresh === false || evidence.runtimeCodeChangedSinceReport ? "Needs review" : "Ready",
  ]);
  const freshnessDetail = freshnessStatus === reportEvidence.status && reportEvidence.status !== "Ready"
    ? reportEvidence.detail
    : evidence.runtimeCodeChangedSinceReport
      ? "Runtime code changed after the readiness report was generated."
      : evidence.openPrTriageFresh === false
        ? "Open PR triage is stale or not tied to current HEAD."
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

  const visualManualPassed = evidenceArtifactPassed(evidence.visualManualEvidence, evidence.hasVisualManualEvidence);
  const visualManualDetail = evidenceArtifactDetail(
    evidence.visualManualEvidence,
    visualManualPassed
      ? "Visual/manual smoke evidence was supplied."
      : "No valid visual/manual evidence artifact was supplied.",
  );
  const visualManualEvidence = evidence.visualManualEvidence
    ? evidenceArtifactEvidence(evidence.visualManualEvidence)
    : ["visualManualArtifactStatus=missing_formal_evidence"];

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

  const gates: PublicBetaEvidenceGate[] = [
    {
      id: "sourceSafety",
      label: "Source safety",
      weight: PUBLIC_BETA_EVIDENCE_WEIGHTS.sourceSafety,
      score: input.hasCritical ? 0 : roundScore((input.scannerScore / 100) * PUBLIC_BETA_EVIDENCE_WEIGHTS.sourceSafety),
      status: input.hasCritical ? "Blocked" : "Ready",
      detail: input.hasCritical
        ? "High-confidence critical scanner findings remain."
        : "Deterministic source scanners did not find a critical blocker.",
      evidence: [`scannerStatus=${input.scannerStatus}`, `scannerScore=${input.scannerScore}`],
      recommendedAction: input.hasCritical ? "Fix critical scanner findings before scoring readiness." : "Keep source scanner lane in the fast loop.",
    },
    {
      id: "targetedBehaviorTests",
      label: "Targeted behavior tests",
      weight: PUBLIC_BETA_EVIDENCE_WEIGHTS.targetedBehaviorTests,
      score: targetedBehaviorPassed ? PUBLIC_BETA_EVIDENCE_WEIGHTS.targetedBehaviorTests : 0,
      status: targetedBehaviorPassed ? "Ready" : "Unknown evidence",
      detail: targetedBehaviorDetail,
      evidence: targetedBehaviorEvidence,
      recommendedAction: "Run the targeted validators for the changed surface and regenerate the score with fresh evidence metadata.",
    },
    {
      id: "visualManualSmoke",
      label: "Visual/manual smoke",
      weight: PUBLIC_BETA_EVIDENCE_WEIGHTS.visualManualSmoke,
      score: visualManualPassed ? PUBLIC_BETA_EVIDENCE_WEIGHTS.visualManualSmoke : 0,
      status: visualManualPassed ? "Ready" : "Visual QA required",
      detail: visualManualDetail,
      evidence: visualManualEvidence,
      recommendedAction: "Record targeted manual or screenshot evidence for user-critical surfaces before calling the score ready.",
    },
    {
      id: "runtimeProviderSmoke",
      label: "Runtime/provider smoke",
      weight: PUBLIC_BETA_EVIDENCE_WEIGHTS.runtimeProviderSmoke,
      score: runtimeProviderSmokePassed ? PUBLIC_BETA_EVIDENCE_WEIGHTS.runtimeProviderSmoke : 0,
      status: runtimeProviderSmokeStatus,
      detail: runtimeProviderSmokeDetail,
      evidence: runtimeProviderSmokeEvidence,
      recommendedAction: "Treat launch as smoke-required until PayPal, deployment, push, and provider checks are recorded.",
    },
    {
      id: "adminTruthSamples",
      label: "Admin truth/sample evidence",
      weight: PUBLIC_BETA_EVIDENCE_WEIGHTS.adminTruthSamples,
      score: adminTruthSamplePassed ? PUBLIC_BETA_EVIDENCE_WEIGHTS.adminTruthSamples : 0,
      status: adminTruthSamplePassed ? "Ready" : "Unknown evidence",
      detail: adminTruthSampleDetail,
      evidence: adminTruthSampleEvidence,
      recommendedAction: "Require first-party sample evidence before rendering zero/live/healthy as launch truth.",
    },
    {
      id: "freshnessIntegrity",
      label: "Freshness, PR, and HEAD integrity",
      weight: PUBLIC_BETA_EVIDENCE_WEIGHTS.freshnessIntegrity,
      score: freshnessStatus === "Ready" ? reportEvidence.score : 0,
      status: freshnessStatus,
      detail: freshnessDetail,
      evidence: reportEvidence.evidence,
      recommendedAction: "Regenerate stale generated reports and PR triage from current HEAD before treating readiness as current.",
    },
    {
      id: "debugRuntimeEvidence",
      label: "Debug/runtime evidence",
      weight: 0,
      score: 0,
      status: debugEvidenceAvailable ? "Ready" : "Unknown evidence",
      detail: debugEvidenceAvailable
        ? "Runtime debug evidence is present in the score input."
        : "Debug evidence is empty, so absence of runtime issues is unknown.",
      evidence: [],
      recommendedAction: "Do not treat empty debug evidence as proof that no runtime issue exists.",
    },
  ];

  if ((evidence.launchWarningCount ?? 0) > 0) {
    gates.push({
      id: "runtimeProviderSmoke",
      label: "Launch warning confidence",
      weight: 0,
      score: 0,
      status: "Ready with smoke required",
      detail: `${evidence.launchWarningCount} launch warning(s) remain recorded.`,
      evidence: [],
      recommendedAction: "Keep launch warnings visible and out of perfect readiness scoring.",
    });
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
    cappedScore: readinessStatus === "Ready" ? input.scannerScore : Math.min(input.scannerScore, readinessCap, evidenceScore),
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
  const overallScore = roundScore(evidenceReadiness.cappedScore);
  const summaryStatus = readinessStatusToLegacyStatus(evidenceReadiness.readinessStatus, overallScore, criticalAutoFail);
  const costReadiness = options.evidence?.costReadiness ?? DEFAULT_COST_READINESS;
  const scoreExplanation = buildScoreExplanation({
    scannerScore,
    scannerStatus,
    evidenceScore: evidenceReadiness.evidenceScore,
    readinessStatus: evidenceReadiness.readinessStatus,
    evidenceGates: evidenceReadiness.evidenceGates,
    evidenceCapDetails: evidenceReadiness.evidenceCapDetails,
  });

  return {
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    currentHead: options.currentHead,
    scannerScore,
    scannerStatus,
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
