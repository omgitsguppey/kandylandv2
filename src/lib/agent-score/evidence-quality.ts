import type {
  PublicBetaCostReadiness,
  PublicBetaEvidenceArtifact,
  PublicBetaGeneratedReportEvidence,
} from "./core";
import {
  PUBLIC_BETA_EVIDENCE_QUALITY_SCORES,
  PUBLIC_BETA_REQUIRED_REPORT_STALE_HOURS,
} from "./weights";
import { normalizeTechnicalFreshnessTerms } from "./freshness-language";

export type PublicBetaEvidenceQuality =
  | "formal_passed"
  | "formal_partial"
  | "source_ready"
  | "operator_reported"
  | "stale"
  | "missing"
  | "unavailable"
  | "failed"
  | "owner_review";

export type PublicBetaEvidenceFreshnessState = "fresh" | "stale" | "missing" | "unknown" | "head_mismatch";

export type PublicBetaEvidenceQualityContext = {
  currentHead?: string;
  lane: string;
  requiredForExit?: boolean;
  requiresRuntimeProof?: boolean;
  nowUtc?: string;
  freshnessWindowHours?: number;
};

export type PublicBetaEvidenceQualityInput = {
  artifact?: PublicBetaEvidenceArtifact;
  context: PublicBetaEvidenceQualityContext;
};

export type PublicBetaEvidenceQualityResult = {
  quality: PublicBetaEvidenceQuality;
  confidence: number;
  freshness: PublicBetaEvidenceFreshnessState;
  freshnessScore: number;
  partialCredit: number;
  blocksLaunch: boolean;
  reason: string;
};

export type PublicBetaCostReadinessScore = {
  score: number;
  ownerReviewRequired: boolean;
  blocksLaunch: boolean;
  reasons: string[];
};

export type PublicBetaRegressionRiskInput = {
  requiredReports?: PublicBetaGeneratedReportEvidence[];
  runtimeCodeChangedSinceReport?: boolean;
  openPrTriageFresh?: boolean;
  recentHighBlastFilesChanged?: boolean;
  staleGeneratedArtifacts?: string[];
  sourceValidatorsMissing?: string[];
};

export type PublicBetaRegressionRiskScore = {
  score: number;
  riskPenalty: number;
  reasons: string[];
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function normalizeStatus(status: unknown) {
  return String(status ?? "").toLowerCase();
}

function ageHours(generatedAtUtc: string | undefined, nowUtc: string | undefined) {
  if (!generatedAtUtc) return null;
  const generated = Date.parse(generatedAtUtc);
  const now = Date.parse(nowUtc ?? new Date().toISOString());
  if (!Number.isFinite(generated) || !Number.isFinite(now)) return null;
  return Math.max(0, (now - generated) / 3_600_000);
}

function resolveFreshness(
  artifact: PublicBetaEvidenceArtifact | undefined,
  context: PublicBetaEvidenceQualityContext,
): { freshness: PublicBetaEvidenceFreshnessState; freshnessScore: number; reason: string } {
  if (!artifact) {
    return { freshness: "missing", freshnessScore: 0, reason: "Evidence artifact is missing." };
  }
  if (artifact.sourceCommit && context.currentHead && artifact.sourceCommit !== context.currentHead) {
    return {
      freshness: "head_mismatch",
      freshnessScore: 0.4,
      reason: "This evidence was generated before the latest code changes.",
    };
  }
  const hours = ageHours(artifact.generatedAtUtc, context.nowUtc);
  if (hours === null) {
    return { freshness: "unknown", freshnessScore: 0.6, reason: "Evidence generatedAtUtc is missing or invalid." };
  }
  const windowHours = context.freshnessWindowHours ?? PUBLIC_BETA_REQUIRED_REPORT_STALE_HOURS;
  if (hours > windowHours) {
    const decay = Math.max(
      PUBLIC_BETA_EVIDENCE_QUALITY_SCORES.staleDecayMin,
      1 - ((hours - windowHours) / Math.max(windowHours * 3, 1)),
    );
    return {
      freshness: "stale",
      freshnessScore: round(clamp(decay, PUBLIC_BETA_EVIDENCE_QUALITY_SCORES.staleDecayMin, 0.85)),
      reason: `Evidence is ${round(hours)}h old and outside the ${windowHours}h freshness window.`,
    };
  }
  return { freshness: "fresh", freshnessScore: 1, reason: "Evidence is fresh." };
}

export function resolveEvidenceQuality(input: PublicBetaEvidenceQualityInput): PublicBetaEvidenceQualityResult {
  const { artifact, context } = input;
  const freshness = resolveFreshness(artifact, context);
  const status = normalizeStatus(artifact?.status);

  if (!artifact) {
    return {
      quality: "missing",
      confidence: 0,
      freshness: freshness.freshness,
      freshnessScore: freshness.freshnessScore,
      partialCredit: 0,
      blocksLaunch: context.requiredForExit === true,
      reason: freshness.reason,
    };
  }

  if (status.includes("failed") || status === "failed" || artifact.passed === false && status === "failed") {
    return {
      quality: "failed",
      confidence: 0,
      freshness: freshness.freshness,
      freshnessScore: freshness.freshnessScore,
      partialCredit: 0,
      blocksLaunch: context.requiredForExit === true,
      reason: artifact.detail || "Evidence failed.",
    };
  }

  if (status.includes("operator_reported")) {
    return {
      quality: "operator_reported",
      confidence: PUBLIC_BETA_EVIDENCE_QUALITY_SCORES.operatorReported,
      freshness: freshness.freshness,
      freshnessScore: freshness.freshnessScore,
      partialCredit: round(PUBLIC_BETA_EVIDENCE_QUALITY_SCORES.operatorReported * freshness.freshnessScore),
      blocksLaunch: context.requiredForExit === true,
      reason: "Operator-reported evidence is tracked but is not formal launch proof.",
    };
  }

  if (status.includes("owner_review") || status.includes("cost_review_required")) {
    return {
      quality: "owner_review",
      confidence: PUBLIC_BETA_EVIDENCE_QUALITY_SCORES.ownerReview,
      freshness: freshness.freshness,
      freshnessScore: freshness.freshnessScore,
      partialCredit: round(PUBLIC_BETA_EVIDENCE_QUALITY_SCORES.ownerReview * freshness.freshnessScore),
      blocksLaunch: false,
      reason: "Owner-review evidence carries risk weight and is not a pass.",
    };
  }

  if (
    status.includes("source_ready")
    || status.includes("source-complete")
    || status.includes("source_complete")
  ) {
    const requiresRuntime = context.requiresRuntimeProof === true || status.includes("runtime_proof");
    return {
      quality: "source_ready",
      confidence: PUBLIC_BETA_EVIDENCE_QUALITY_SCORES.sourceReady,
      freshness: freshness.freshness,
      freshnessScore: freshness.freshnessScore,
      partialCredit: round(PUBLIC_BETA_EVIDENCE_QUALITY_SCORES.sourceReady * freshness.freshnessScore),
      blocksLaunch: context.requiredForExit === true && requiresRuntime,
      reason: requiresRuntime
        ? "Source-ready evidence earns source credit, but runtime proof is still required."
        : "Source-ready evidence earns source credit only.",
    };
  }

  if (
    status.includes("missing")
    || status.includes("unknown")
    || status.includes("unverified")
    || status.includes("tracked_not_passing")
  ) {
    return {
      quality: status.includes("unavailable") ? "unavailable" : "missing",
      confidence: 0,
      freshness: freshness.freshness,
      freshnessScore: freshness.freshnessScore,
      partialCredit: 0,
      blocksLaunch: context.requiredForExit === true,
      reason: artifact.detail || "Required formal evidence is missing.",
    };
  }

  if (status.includes("unavailable")) {
    return {
      quality: "unavailable",
      confidence: 0.1,
      freshness: freshness.freshness,
      freshnessScore: freshness.freshnessScore,
      partialCredit: 0,
      blocksLaunch: context.requiredForExit === true,
      reason: artifact.detail || "Evidence is unavailable.",
    };
  }

  if (status.includes("partial") || status.includes("needs_review")) {
    return {
      quality: "formal_partial",
      confidence: PUBLIC_BETA_EVIDENCE_QUALITY_SCORES.formalPartial,
      freshness: freshness.freshness,
      freshnessScore: freshness.freshnessScore,
      partialCredit: round(PUBLIC_BETA_EVIDENCE_QUALITY_SCORES.formalPartial * freshness.freshnessScore),
      blocksLaunch: context.requiredForExit === true,
      reason: artifact.detail || "Evidence is partial and needs review.",
    };
  }

  if (artifact.passed === true && !status.includes("missing") && !status.includes("unverified")) {
    const credit = freshness.freshness === "fresh"
      ? PUBLIC_BETA_EVIDENCE_QUALITY_SCORES.formalPassed
      : Math.max(PUBLIC_BETA_EVIDENCE_QUALITY_SCORES.staleDecayMin, freshness.freshnessScore);
    return {
      quality: freshness.freshness === "fresh" ? "formal_passed" : "stale",
      confidence: round(0.95 * credit),
      freshness: freshness.freshness,
      freshnessScore: freshness.freshnessScore,
      partialCredit: round(credit),
      blocksLaunch: context.requiredForExit === true && freshness.freshness !== "fresh",
      reason: freshness.freshness === "fresh" ? "Fresh formal evidence passed." : freshness.reason,
    };
  }

  return {
    quality: "missing",
    confidence: 0,
    freshness: freshness.freshness,
    freshnessScore: freshness.freshnessScore,
    partialCredit: 0,
    blocksLaunch: context.requiredForExit === true,
    reason: artifact.detail || "Evidence does not satisfy beta exit.",
  };
}

function laneScore(status: string) {
  const normalized = normalizeStatus(status);
  if (normalized === "source_inventory_complete") return 80;
  if (normalized === "source_guarded_external_review_remaining") return 78;
  if (normalized === "source_ready_no_runtime_usage_detected") return 78;
  if (normalized === "source_ready_config_missing_safe") return 62;
  if (normalized === "source_ready_retry_storm_guarded") return 88;
  if (normalized === "source_ready_batched_or_cached") return 84;
  if (normalized === "owner_review_external_billing_required") return 48;
  if (normalized === "not_detected_in_repo") return 50;
  if (normalized === "cost_review_required" || normalized === "owner_review") return 40;
  if (normalized === "config_not_in_repo") return 35;
  if (normalized === "missing_inventory") return 15;
  if (normalized === "blocked") return 0;
  return 25;
}

export function scoreCostReadiness(costReadiness: PublicBetaCostReadiness): PublicBetaCostReadinessScore {
  const lanes = Object.entries(costReadiness);
  const reasons: string[] = [];
  let ownerReviewRequired = false;
  let blocksLaunch = false;
  let total = 0;

  for (const [key, lane] of lanes) {
    const status = normalizeStatus(lane.status);
    total += laneScore(status);
    if (
      status === "owner_review"
      || status === "cost_review_required"
      || status === "source_guarded_external_review_remaining"
      || status === "source_ready_no_runtime_usage_detected"
      || status === "source_ready_config_missing_safe"
      || status === "owner_review_external_billing_required"
      || (status === "not_detected_in_repo" && lane.evidence.some((entry) => /externalBillingObserved=true|external billing/iu.test(entry)))
    ) {
      ownerReviewRequired = true;
      reasons.push(`${key} remains source-cost/external-review tracked (${lane.status}).`);
    }
    if (lane.blocksBetaExit || status === "blocked") {
      blocksLaunch = true;
      reasons.push(`${key} blocks beta exit (${lane.status}).`);
    }
  }

  return {
    score: round(lanes.length > 0 ? total / lanes.length : 0),
    ownerReviewRequired,
    blocksLaunch,
    reasons,
  };
}

export function scoreRegressionRisk(input: PublicBetaRegressionRiskInput): PublicBetaRegressionRiskScore {
  const reasons: string[] = [];
  let penalty = 0;

  for (const report of input.requiredReports ?? []) {
    if (report.sourceCommit && report.currentHead && report.sourceCommit !== report.currentHead) {
      penalty += 20;
      reasons.push(`${report.path} was generated before the latest code changes.`);
    }
    if (report.freshness === "stale") {
      penalty += 12;
      reasons.push(`${report.path} is stale.`);
    }
    if (report.freshness === "missing") {
      penalty += 20;
      reasons.push(`${report.path} is missing.`);
    }
  }
  if (input.runtimeCodeChangedSinceReport) {
    penalty += 15;
    reasons.push("New runtime code landed after this report was created.");
  }
  if (input.openPrTriageFresh === false) {
    penalty += 10;
    reasons.push("Open PR triage is not fresh.");
  }
  if (input.recentHighBlastFilesChanged) {
    penalty += 10;
    reasons.push("Recent high-blast files changed after evidence.");
  }
  if ((input.staleGeneratedArtifacts ?? []).length > 0) {
    penalty += Math.min(20, (input.staleGeneratedArtifacts ?? []).length * 5);
    reasons.push("Generated artifacts are stale.");
  }
  if ((input.sourceValidatorsMissing ?? []).length > 0) {
    penalty += Math.min(20, (input.sourceValidatorsMissing ?? []).length * 5);
    reasons.push("Relevant source validators are missing.");
  }

  const riskPenalty = round(clamp(penalty, 0, 100));
  return {
    score: round(clamp(100 - riskPenalty, 0, 100)),
    riskPenalty,
    reasons: reasons.map(normalizeTechnicalFreshnessTerms),
  };
}
