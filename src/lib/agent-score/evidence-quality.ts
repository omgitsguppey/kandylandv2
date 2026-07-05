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
  highBlastRefreshCurrent?: boolean;
  highBlastRefreshScore?: number;
  highBlastRefreshFailedLaneCount?: number;
  highBlastRefreshInFlightLaneCount?: number;
};

export type PublicBetaRegressionRiskScore = {
  score: number;
  riskPenalty: number;
  reasons: string[];
};

export const NON_PASSING_EVIDENCE_STATUSES = new Set<string>([
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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function normalizeStatus(status: unknown) {
  return String(status ?? "").toLowerCase();
}

function sourceReadyCreditForEvidence(text: string) {
  return /first[-_\s]?party|site activity|user activity|real[_\s-]?usage|behaviorMathConfidence|watch[-_\s]?session|person metrics|liveRuntimeEvidence|sourceBackedRuntimeConfidence|admin source activity|sampleCount=[1-9]/iu.test(text)
    ? PUBLIC_BETA_EVIDENCE_QUALITY_SCORES.sourceActivity
    : PUBLIC_BETA_EVIDENCE_QUALITY_SCORES.sourceReady;
}

export function evidenceArtifactStatusText(
  artifact: PublicBetaEvidenceArtifact | undefined,
  fallbackStatus = "missing_formal_evidence",
) {
  return String(artifact?.status ?? fallbackStatus);
}

export function evidenceArtifactText(artifact: PublicBetaEvidenceArtifact | undefined) {
  return [
    evidenceArtifactStatusText(artifact, "missing_or_unknown"),
    artifact?.detail ?? "",
    ...(artifact?.evidence ?? []),
  ].join("\n");
}

export function evidenceArtifactNumericValue(artifact: PublicBetaEvidenceArtifact | undefined, key: string) {
  const pattern = new RegExp(`${key}=([0-9]+(?:\\.[0-9]+)?)`, "u");
  const match = evidenceArtifactText(artifact).match(pattern);
  if (!match?.[1]) return undefined;
  const value = Number(match[1]);
  return Number.isFinite(value) ? clamp(value, 0, 100) : undefined;
}

export function evidenceArtifactHasFormalPass(artifact: PublicBetaEvidenceArtifact | undefined) {
  if (!evidenceArtifactIsPassing(artifact)) return false;
  const status = evidenceArtifactStatusText(artifact).toLowerCase();
  const text = evidenceArtifactText(artifact).toLowerCase();
  return /passed|formal_complete|formal_passed|usable/u.test(status)
    && !/source_ready|operator_confirmed|runtime_unverified|missing|unknown|not_formal/u.test(`${status}\n${text}`);
}

export function evidenceArtifactHasSourceConfidence(artifact: PublicBetaEvidenceArtifact | undefined) {
  const status = evidenceArtifactStatusText(artifact, "missing_or_unknown").toLowerCase();
  const text = evidenceArtifactText(artifact).toLowerCase();
  return Boolean(artifact)
    && !/failed|blocked/u.test(status)
    && /source_ready|source_backed|partial_debug|verified_local_contract|operator_confirmed|calibrated|substitute_matrix/u.test(text);
}

export function evidenceArtifactIsPassing(
  artifact: PublicBetaEvidenceArtifact | undefined,
  _fallbackBoolean?: boolean,
) {
  if (!artifact) return false;
  const status = evidenceArtifactStatusText(artifact).toLowerCase();
  const text = evidenceArtifactText(artifact).toLowerCase();
  const freshness = resolveFreshness(artifact, {
    lane: "formal_evidence_artifact",
    requiredForExit: true,
  });
  return artifact.passed === true
    && freshness.freshness === "fresh"
    && !NON_PASSING_EVIDENCE_STATUSES.has(status)
    && !/source[_-]ready|runtime[_-]proof[_-]required|operator[_-]reported|not[_-]formal|runtime[_-]unverified|missing|unknown|failed|stale|unavailable|needs[_-]review|tracked[_-]not[_-]passing/iu.test(`${status}\n${text}`);
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
    if (artifact.versionStatus === "same_commit_snapshot" || artifact.versionStatus === "current_by_impact") {
      return {
        freshness: "fresh",
        freshnessScore: 1,
        reason: "Evidence was generated before the latest commit, but no owned source inputs changed.",
      };
    }
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

  const text = evidenceArtifactText(artifact);

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
      reason: "Operator-reported context is tracked, but launch readiness evidence must come from site activity or provider-backed source records.",
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
    const sourceCredit = sourceReadyCreditForEvidence(`${status}\n${text}`);
    return {
      quality: "source_ready",
      confidence: sourceCredit,
      freshness: freshness.freshness,
      freshnessScore: freshness.freshnessScore,
      partialCredit: round(sourceCredit * freshness.freshnessScore),
      blocksLaunch: context.requiredForExit === true && requiresRuntime,
      reason: requiresRuntime
        ? "Source-ready activity evidence earns source credit, but deployed runtime route evidence is still required."
        : sourceCredit > PUBLIC_BETA_EVIDENCE_QUALITY_SCORES.sourceReady
          ? "Source-ready activity evidence earns elevated source credit without clearing provider/runtime/admin gates."
          : "Source-ready evidence earns source credit only.",
    };
  }

  if (/formalEvidenceImpact=source_behavior_only|source[-_\s]behavior[-_\s]only|source-backed targeted behavior evidence only/iu.test(text)) {
    return {
      quality: "source_ready",
      confidence: PUBLIC_BETA_EVIDENCE_QUALITY_SCORES.sourceReady,
      freshness: freshness.freshness,
      freshnessScore: freshness.freshnessScore,
      partialCredit: round(PUBLIC_BETA_EVIDENCE_QUALITY_SCORES.sourceReady * freshness.freshnessScore),
      blocksLaunch: false,
      reason: "Source behavior evidence earns source credit; runtime, provider-backed, and admin truth lanes need matching site activity records before clearing.",
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
      reason: artifact.detail || "Required source evidence is missing.",
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
      reason: freshness.freshness === "fresh" ? "Fresh source evidence passed." : freshness.reason,
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

export function scoreCostReadinessLaneStatus(status: string) {
  const normalized = normalizeStatus(status);
  if (normalized === "source_inventory_complete") return 80;
  if (normalized === "source_guarded_external_review_remaining") return 92;
  if (normalized === "source_ready_no_runtime_usage_detected") return 92;
  if (normalized === "source_ready_config_missing_safe") return 62;
  if (normalized === "source_ready_retry_storm_guarded") return 94;
  if (normalized === "source_ready_batched_or_cached") return 92;
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
    total += scoreCostReadinessLaneStatus(status);
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

  if (input.highBlastRefreshCurrent) {
    const failedLanePenalty = Math.min(20, (input.highBlastRefreshFailedLaneCount ?? 0) * 8);
    const inFlightLanePenalty = Math.min(8, (input.highBlastRefreshInFlightLaneCount ?? 0) * 2);
    const refreshScore = input.highBlastRefreshScore ?? 88;
    reasons.push("Current high-blast regression refresh covers analytics, debug, chat, task, settings, wallet, admin, score, and cost lanes.");
    if ((input.highBlastRefreshInFlightLaneCount ?? 0) > 0) {
      reasons.push("In-flight lanes are classified separately and do not count as stale regression evidence.");
    }
    if ((input.highBlastRefreshFailedLaneCount ?? 0) > 0) {
      reasons.push("Some high-blast validators failed and remain regression risk.");
    }
    const riskPenalty = round(clamp((100 - refreshScore) + failedLanePenalty + inFlightLanePenalty, 0, 100));
    return {
      score: round(clamp(100 - riskPenalty, 0, 100)),
      riskPenalty,
      reasons: reasons.map(normalizeTechnicalFreshnessTerms),
    };
  }

  for (const report of input.requiredReports ?? []) {
    const versionAccepted = report.versionStatus === "same_commit_snapshot" || report.versionStatus === "current_by_impact";
    if (report.sourceCommit && report.currentHead && report.sourceCommit !== report.currentHead && !versionAccepted) {
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
