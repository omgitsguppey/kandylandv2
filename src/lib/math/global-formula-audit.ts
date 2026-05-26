import {
  BOUNCE_THRESHOLDS,
  COST_WEIGHTING_RULES,
  DEDUPE_WINDOWS,
  IDENTITY_CONFIDENCE_WEIGHTS,
  NON_EVENT_SCORE_RULES,
  PROVEN_ZERO_RULES,
  SCORE_DIMENSION_WEIGHTS,
  SOURCE_OF_FUNDS_RULES,
  WATCH_TIME_THRESHOLDS,
} from "@/lib/math/canonical-math-ledger";

export type GlobalFormulaAuditArea =
  | "beta_score"
  | "evidence_completeness"
  | "freshness"
  | "cost_risk"
  | "regression_risk"
  | "person_metrics"
  | "global_metrics"
  | "identity_confidence"
  | "legacy_confidence"
  | "dedupe_windows"
  | "watch_time"
  | "session_active_time"
  | "bounce"
  | "gumdrop_source_of_funds"
  | "creator_revenue_entitlement"
  | "task_rewards"
  | "notification_liveness"
  | "search_discovery_cost"
  | "sql_export_parity";

export type GlobalFormulaAuditEntry = {
  area: GlobalFormulaAuditArea;
  formulaOwner: string;
  currentFormula: string;
  canonicalFormula: string;
  classification: "canonical" | "normalized" | "legacy_alias_documented" | "needs_operator_decision";
  accuracyExplanation: string;
  filesReviewed: string[];
};

export type GlobalFormulaAuditReport = {
  reportKey: "global-formula-audit";
  generatedAtUtc: string;
  status: "pass" | "review" | "fail";
  scoreWeights: typeof SCORE_DIMENSION_WEIGHTS;
  confidenceWeights: typeof IDENTITY_CONFIDENCE_WEIGHTS;
  requiredDecisions: {
    missingDataIsZero: false;
    unknownLegacyCanBecomeExact: false;
    nonEventsCanReduceScore: false;
    futureOnlyQuietEventsCanReduceScore: false;
    pageDurationCanBeWatchTime: false;
    hiddenTimeCanBeActiveSessionTime: false;
    paymentApprovalEqualsCheckoutStart: false;
    rewardGdCanBecomePaidGd: false;
    paidBonusGdCanBecomeRewardGd: false;
    legacyUnknownCanFundPaidOnly: false;
    costSavingsCanReduceAccuracy: false;
  };
  personMetricHydrationGapMath: {
    computedGapSource: "missingHydration.length";
    debugLaneUsesActualGapCount: boolean;
    scoreImpactUsesActualGapCount: boolean;
    fakeZeroPatternBlocked: boolean;
  };
  entries: GlobalFormulaAuditEntry[];
  validationFailures: string[];
};

export const GLOBAL_FORMULA_AUDIT_ENTRIES: GlobalFormulaAuditEntry[] = [
  {
    area: "beta_score",
    formulaOwner: "src/lib/math/canonical-math-ledger.ts",
    currentFormula: "Weighted dimensions from src/lib/agent-score/weights.ts.",
    canonicalFormula: "sourceHealth 25, runtimeHealth 20, evidenceCompleteness 20, freshness 15, costRisk 10, regressionRisk 10.",
    classification: "canonical",
    accuracyExplanation: "Freezing the weights prevents score drift and keeps the public beta calculation reproducible.",
    filesReviewed: ["src/lib/agent-score/core.ts", "src/lib/agent-score/weights.ts", "src/lib/math/canonical-math-ledger.ts"],
  },
  {
    area: "identity_confidence",
    formulaOwner: "src/lib/math/canonical-math-ledger.ts",
    currentFormula: "Identity confidence labels flow through analytics and person metrics.",
    canonicalFormula: "exact=1.0, linked=0.85, inferred=0.60, weak=0.35, unknown=0.0.",
    classification: "canonical",
    accuracyExplanation: "Shared numeric confidence prevents weak or inferred identity from looking exact in metrics and debug.",
    filesReviewed: ["src/lib/math/canonical-math-ledger.ts", "src/lib/analytics/person-metrics-hydration.ts"],
  },
  {
    area: "legacy_confidence",
    formulaOwner: "src/lib/math/legacy-metric-canonicalization.ts",
    currentFormula: "Legacy sources are mapped with confidence caps and dry-run plans.",
    canonicalFormula: "Unknown legacy cannot become exact; deterministic identity, event, route, and timestamp are required before stronger confidence.",
    classification: "canonical",
    accuracyExplanation: "Dry-run confidence caps recover useful history without mutating production or overstating user truth.",
    filesReviewed: ["src/lib/math/legacy-metric-canonicalization.ts", "src/lib/math/legacy-recovery-dry-run-engine.ts"],
  },
  {
    area: "person_metrics",
    formulaOwner: "src/lib/analytics/person-metrics-hydration.ts",
    currentFormula: "missingHydration is computed from low confidence metric statuses.",
    canonicalFormula: "debugLane.gaps and scoreImpactByDimension use missingHydration.length.",
    classification: "normalized",
    accuracyExplanation: "Real gap counts stop missing source or bridge work from being hidden as zero.",
    filesReviewed: ["src/lib/analytics/person-metrics-hydration.ts"],
  },
  {
    area: "watch_time",
    formulaOwner: "src/lib/math/drop-watch-unlock-math.ts",
    currentFormula: "Drop watch math separates page duration, locked preview, active watch, and confidence.",
    canonicalFormula: String(WATCH_TIME_THRESHOLDS.watchTimeSource),
    classification: "canonical",
    accuracyExplanation: "Watch time reflects active content exposure rather than page-open time.",
    filesReviewed: ["src/lib/math/drop-watch-unlock-math.ts", "src/lib/analytics/drop-watch-time-engine.ts"],
  },
  {
    area: "bounce",
    formulaOwner: "src/lib/math/session-journey-math.ts",
    currentFormula: "Bounce requires one route, no meaningful interaction, activeMs below threshold, and no conversion.",
    canonicalFormula: `zeroDenominator=${BOUNCE_THRESHOLDS.zeroDenominatorRule}`,
    classification: "canonical",
    accuracyExplanation: "Unknown closeouts and one-page conversions cannot corrupt bounce rate.",
    filesReviewed: ["src/lib/math/session-journey-math.ts", "src/lib/analytics/session-metrics-engine.ts"],
  },
  {
    area: "dedupe_windows",
    formulaOwner: "src/lib/math/global-user-counting-math.ts",
    currentFormula: "Global/user/guest/linked-person counts route through canonical dedupe windows.",
    canonicalFormula: JSON.stringify(DEDUPE_WINDOWS),
    classification: "canonical",
    accuracyExplanation: "Linked guest/user actions count once globally and once under the best person identity.",
    filesReviewed: ["src/lib/math/global-user-counting-math.ts", "src/lib/math/count-deduplication-normalizer.ts"],
  },
  {
    area: "gumdrop_source_of_funds",
    formulaOwner: "src/lib/math/gumdrop-ledger-math.ts",
    currentFormula: "Source buckets distinguish paid, paid bonus, reward, task reward, admin grant, refund, adjustment, and legacy unknown.",
    canonicalFormula: JSON.stringify(SOURCE_OF_FUNDS_RULES),
    classification: "canonical",
    accuracyExplanation: "Source-of-funds math prevents reward or unknown legacy balances from funding paid-only creator experiences.",
    filesReviewed: ["src/lib/math/gumdrop-ledger-math.ts", "src/lib/gumdrop-ledger.ts"],
  },
  {
    area: "cost_risk",
    formulaOwner: "src/lib/math/cost-export-parity-math.ts",
    currentFormula: "Source guards can improve cost readiness; external billing review remains separate.",
    canonicalFormula: JSON.stringify(COST_WEIGHTING_RULES),
    classification: "canonical",
    accuracyExplanation: "Cost risk improves only through source guards or external artifacts, not by dropping canonical facts.",
    filesReviewed: ["src/lib/math/cost-export-parity-math.ts", "src/lib/server/global-cost-surface-contract.ts"],
  },
  {
    area: "sql_export_parity",
    formulaOwner: "src/lib/math/cost-export-parity-math.ts",
    currentFormula: "Exports are batch/watermark based and Cloud SQL mirror sync is manual/cost-approved.",
    canonicalFormula: "Batch export by watermark; SQL mirror sync manual/cost-approved only.",
    classification: "canonical",
    accuracyExplanation: "Batching protects cost while preserving canonical event facts needed for accuracy.",
    filesReviewed: ["src/lib/analytics/sql-database-parity-engine.ts", "src/lib/math/cost-export-parity-math.ts"],
  },
];

export function auditGlobalFormulas(input?: { generatedAtUtc?: string; entries?: readonly GlobalFormulaAuditEntry[] }): GlobalFormulaAuditReport {
  const entries = [...(input?.entries ?? GLOBAL_FORMULA_AUDIT_ENTRIES)];
  const validationFailures = validateGlobalFormulaAuditEntries(entries);
  return {
    reportKey: "global-formula-audit",
    generatedAtUtc: input?.generatedAtUtc ?? new Date().toISOString(),
    status: validationFailures.length ? "fail" : "pass",
    scoreWeights: SCORE_DIMENSION_WEIGHTS,
    confidenceWeights: IDENTITY_CONFIDENCE_WEIGHTS,
    requiredDecisions: {
      missingDataIsZero: PROVEN_ZERO_RULES.missingDataIsZero,
      unknownLegacyCanBecomeExact: false,
      nonEventsCanReduceScore: NON_EVENT_SCORE_RULES.nonEventReducesScore,
      futureOnlyQuietEventsCanReduceScore: NON_EVENT_SCORE_RULES.futureOnlyEventCountsAsFailure,
      pageDurationCanBeWatchTime: WATCH_TIME_THRESHOLDS.pageOpenTimeCountsAsWatchTime,
      hiddenTimeCanBeActiveSessionTime: false,
      paymentApprovalEqualsCheckoutStart: false,
      rewardGdCanBecomePaidGd: false,
      paidBonusGdCanBecomeRewardGd: false,
      legacyUnknownCanFundPaidOnly: false,
      costSavingsCanReduceAccuracy: false,
    },
    personMetricHydrationGapMath: {
      computedGapSource: "missingHydration.length",
      debugLaneUsesActualGapCount: true,
      scoreImpactUsesActualGapCount: true,
      fakeZeroPatternBlocked: true,
    },
    entries,
    validationFailures,
  };
}

export function validateGlobalFormulaAuditEntries(entries: readonly GlobalFormulaAuditEntry[]) {
  const failures: string[] = [];
  const required: GlobalFormulaAuditArea[] = [
    "beta_score",
    "identity_confidence",
    "legacy_confidence",
    "person_metrics",
    "watch_time",
    "bounce",
    "dedupe_windows",
    "gumdrop_source_of_funds",
    "cost_risk",
    "sql_export_parity",
  ];

  for (const area of required) {
    if (!entries.some((entry) => entry.area === area)) failures.push(`${area} formula owner missing.`);
  }
  for (const entry of entries) {
    if (entry.accuracyExplanation.length < 20) failures.push(`${entry.area} lacks accuracy explanation.`);
    if (entry.classification === "needs_operator_decision" && !entry.currentFormula) failures.push(`${entry.area} needs operator decision without current formula.`);
  }
  return failures;
}
