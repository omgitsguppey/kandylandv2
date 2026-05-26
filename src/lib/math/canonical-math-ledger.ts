import { PUBLIC_BETA_HEALTH_DIMENSION_WEIGHTS } from "@/lib/agent-score/weights";

export const CANONICAL_MATH_LEDGER_VERSION = "canonical-math-ledger.v1";

export const SCORE_DIMENSION_WEIGHTS = {
  sourceHealth: PUBLIC_BETA_HEALTH_DIMENSION_WEIGHTS.sourceHealth,
  runtimeHealth: PUBLIC_BETA_HEALTH_DIMENSION_WEIGHTS.runtimeHealth,
  evidenceCompleteness: PUBLIC_BETA_HEALTH_DIMENSION_WEIGHTS.evidenceCompleteness,
  freshness: PUBLIC_BETA_HEALTH_DIMENSION_WEIGHTS.freshness,
  costRisk: PUBLIC_BETA_HEALTH_DIMENSION_WEIGHTS.costRisk,
  regressionRisk: PUBLIC_BETA_HEALTH_DIMENSION_WEIGHTS.regressionRisk,
} as const;

export type BetaScoreDimension = keyof typeof SCORE_DIMENSION_WEIGHTS;
export type BetaScoreInput = Record<BetaScoreDimension, number>;

export const IDENTITY_CONFIDENCE_WEIGHTS = {
  exact: 1,
  linked: 0.85,
  inferred: 0.6,
  weak: 0.35,
  unknown: 0,
} as const;

export const LEGACY_CONFIDENCE_MAXIMUMS = {
  recoveredWithDeterministicIdentity: {
    maximumConfidence: "inferred",
    requiredEvidence: ["userId", "sessionId", "eventId", "sourceTimestamp"],
    rule: "Legacy recovered data cannot be promoted above inferred unless deterministic userId, sessionId, eventId, and source timestamp all exist.",
  },
  unknownLegacy: {
    maximumConfidence: "unknown",
    requiredEvidence: [],
    rule: "Unknown legacy always remains unknown/archive-only unless deterministic evidence exists.",
  },
} as const;

export const SESSION_THRESHOLDS = {
  activeRequiresForegroundVisibility: true,
  activeRequiresRecentUserActionOrMediaActivity: true,
  hiddenBackgroundExcludedFromActive: true,
  passiveVisibleSeparateFromActive: true,
  userFacingActiveTimeBucket: "active",
  unknownDurationBehavior: "unavailable_not_zero",
} as const;

export const WATCH_TIME_THRESHOLDS = {
  pageOpenTimeCountsAsWatchTime: false,
  watchTimeSource: "media_or_content_exposure_only",
  hiddenBackgroundExcluded: true,
  normalizedWatchPercentFormula: "activeWatchMs / contentDurationMs",
  zeroDenominatorRule: "If contentDurationMs is missing or <= 0, normalized watch percent is unavailable instead of 0.",
  legacyWithoutStartEnd: "legacy_duration_unavailable",
} as const;

export const BOUNCE_THRESHOLDS = {
  sourceEvents: ["session_started", "session_bounced", "session_engaged", "session_closed"],
  zeroDenominatorRule: "If session denominator is missing or unbounded, bounce rate is unavailable instead of 0.",
  futureOnlyRule: "Future-only events do not count as failures.",
  nonEventRule: "Non-events do not reduce score.",
} as const;

export const DEDUPE_WINDOWS = {
  eventIdPriority: "canonical_event_id",
  fallbackPriority: ["dedupeKey", "sessionId:eventName:objectId:timestampBucket"],
  linkedGuestUserRule: "count once globally and once under best user identity only",
  legacyWeakUnknownRule: "count in legacy bucket, not exact user bucket",
  retryReplayRule: "retry/replay events do not increment standard counts unless replay is the metric itself",
} as const;

export const COST_WEIGHTING_RULES = {
  externalBillingProofRequiredForDollarClaims: true,
  sourceGuardsCanImproveSourceCostReadiness: true,
  missingExternalBillingClassification: "source_guarded_external_review_remaining",
  route4xxRule: "Known validation errors should be nonretryable and mapped before they affect cost risk.",
} as const;

export const SOURCE_OF_FUNDS_RULES = {
  paidPackageBonusGumDropsSource: "paid_gd",
  rewardGumDropsSource: "reward_gd",
  bonusGumDropsMustPreserveSourceOfFunds: true,
  rewardGumDropsEligibleForFanPassRenewal: false,
  sourceTruth: "wallet capture and source-of-funds ledger; this ledger documents formula authority without changing GumDrop math",
} as const;

export const PROVEN_ZERO_RULES = {
  missingDataIsZero: false,
  requiredEvidence: ["boundedSourceWindow", "successfulSourceQueryOrSummary"],
  displayRule: "Missing data renders unavailable/source_missing, not zero.",
  scoreRule: "Proven zero can only be scored after bounded successful source evidence.",
} as const;

export const NON_EVENT_SCORE_RULES = {
  nonEventReducesScore: false,
  futureOnlyEventCountsAsFailure: false,
  highTrafficNoLivenessClassifications: ["source_missing", "suspicious_idle"],
  visibleHighTrafficEventRule: "A visible high-traffic event with no liveness source is source_missing or suspicious_idle, not quiet.",
} as const;

export type FormulaComparisonArtifact = {
  formulaOwnerId: string;
  currentFormula: string;
  canonicalFormula: string;
  delta: string;
  accuracyBenefit: string;
  userVisibleProductImpact: string;
  migrationRisk: string;
  filesChanged: string[];
};

export const FORMULA_COMPARISON_ARTIFACTS: FormulaComparisonArtifact[] = [
  {
    formulaOwnerId: "beta_score",
    currentFormula: "Weighted public beta health dimensions from src/lib/agent-score/weights.ts.",
    canonicalFormula: "sourceHealth 25%, runtimeHealth 20%, evidenceCompleteness 20%, freshness 15%, costRisk 10%, regressionRisk 10%.",
    delta: "No formula change; this ledger freezes the implemented score weights and known weighted calculation.",
    accuracyBenefit: "Prevents later score drift from undocumented weight changes.",
    userVisibleProductImpact: "Beta readiness reporting stays explainable and reproducible.",
    migrationRisk: "low",
    filesChanged: ["src/lib/math/canonical-math-ledger.ts", "src/lib/math/math-authority-map.ts"],
  },
  {
    formulaOwnerId: "identity_confidence",
    currentFormula: "Identity confidence labels are carried through envelope and person-metrics code without one freeze map.",
    canonicalFormula: "exact=1.0, linked=0.85, inferred=0.60, weak=0.35, unknown=0.0.",
    delta: "Adds a canonical numeric confidence map without changing event ingestion.",
    accuracyBenefit: "Makes confidence comparisons deterministic across metrics, debug, and legacy recovery.",
    userVisibleProductImpact: "Metrics can explain weak or unavailable identity without pretending exactness.",
    migrationRisk: "low",
    filesChanged: ["src/lib/math/canonical-math-ledger.ts"],
  },
  {
    formulaOwnerId: "legacy_recovery_confidence",
    currentFormula: "Legacy confidence is classified in analytics and behavioral paths with local rules.",
    canonicalFormula: "Legacy recovered data cannot exceed inferred without userId, sessionId, eventId, and source timestamp; unknown legacy remains archive-only.",
    delta: "Documents maximum confidence and required evidence; no legacy data is mutated.",
    accuracyBenefit: "Blocks unsupported exact promotion for legacy events.",
    userVisibleProductImpact: "Legacy-driven metrics stay visibly lower confidence when evidence is incomplete.",
    migrationRisk: "low",
    filesChanged: ["src/lib/math/canonical-math-ledger.ts", "src/lib/math/math-authority-map.ts"],
  },
  {
    formulaOwnerId: "person_metrics",
    currentFormula: "Person metrics hydration computed missingHydration but reported debugLane.gaps and scoreImpact gapCount as 0.",
    canonicalFormula: "debugLane.gaps and scoreImpactByDimension use missingHydration.length unless future-only exclusion is explicitly classified before exclusion.",
    delta: "Fixes fake zero gap count to real missing hydration gap count.",
    accuracyBenefit: "Evidence completeness reflects actual missing metric source/bridge gaps.",
    userVisibleProductImpact: "Admin/debug readiness stops showing quiet healthy gap math when hydration is incomplete.",
    migrationRisk: "low",
    filesChanged: ["src/lib/analytics/person-metrics-hydration.ts", "src/lib/math/canonical-math-ledger.ts"],
  },
  {
    formulaOwnerId: "duration_math",
    currentFormula: "Duration normalizer separates active/passive/idle/hidden/watch/flow categories.",
    canonicalFormula: "Active time requires foreground visibility and recent activity; hidden/background time is excluded; unknown is unavailable, not zero.",
    delta: "No runtime duration formula change; this ledger freezes the already-normalized duration doctrine.",
    accuracyBenefit: "Prevents page-open time from being reused as watch time.",
    userVisibleProductImpact: "Watch/session duration metrics remain honest about unavailable or passive time.",
    migrationRisk: "low",
    filesChanged: ["src/lib/math/canonical-math-ledger.ts", "src/lib/math/duration-math-normalizer.ts"],
  },
  {
    formulaOwnerId: "source_of_funds",
    currentFormula: "Source-of-funds rules live in wallet/economy truth and validators.",
    canonicalFormula: "Paid package bonus GumDrops are paid-source; reward GumDrops are non-purchase rewards; source confidence must remain explicit.",
    delta: "Documents existing source-of-funds authority without changing payment, wallet, PayPal, or GumDrop math.",
    accuracyBenefit: "Prevents future metric formulas from blending paid, reward, and bonus GumDrops.",
    userVisibleProductImpact: "Creator monetization and Fan Pass readiness can distinguish eligible paid-source balances from reward balances.",
    migrationRisk: "low_no_runtime_math_change",
    filesChanged: ["src/lib/math/canonical-math-ledger.ts", "src/lib/math/math-authority-map.ts"],
  },
];

export function calculateWeightedBetaHealthScore(scores: BetaScoreInput) {
  const raw = (Object.keys(SCORE_DIMENSION_WEIGHTS) as BetaScoreDimension[])
    .reduce((total, dimension) => total + (scores[dimension] * SCORE_DIMENSION_WEIGHTS[dimension] / 100), 0);
  return {
    raw,
    rounded: Number(raw.toFixed(2)),
  };
}
