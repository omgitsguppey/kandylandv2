import { describe, expect, it } from "vitest";

import { hydratePersonMetrics } from "@/lib/analytics/person-metrics-hydration";
import {
  COST_WEIGHTING_RULES,
  DEDUPE_WINDOWS,
  FORMULA_COMPARISON_ARTIFACTS,
  IDENTITY_CONFIDENCE_WEIGHTS,
  LEGACY_CONFIDENCE_MAXIMUMS,
  NON_EVENT_SCORE_RULES,
  PROVEN_ZERO_RULES,
  SCORE_DIMENSION_WEIGHTS,
  SESSION_THRESHOLDS,
  SOURCE_OF_FUNDS_RULES,
  WATCH_TIME_THRESHOLDS,
  BOUNCE_THRESHOLDS,
  calculateWeightedBetaHealthScore,
} from "@/lib/math/canonical-math-ledger";
import {
  FORMULA_AUTHORITY_MAP,
  REQUIRED_FORMULA_OWNER_IDS,
  getFormulaAuthority,
} from "@/lib/math/math-authority-map";

describe("canonical math ledger", () => {
  it("freezes explicit beta score dimension weights and the known weighted calculation", () => {
    expect(SCORE_DIMENSION_WEIGHTS).toEqual({
      sourceHealth: 18,
      runtimeHealth: 30,
      evidenceCompleteness: 25,
      freshness: 10,
      costRisk: 7,
      regressionRisk: 10,
    });
    expect(Object.values(SCORE_DIMENSION_WEIGHTS).reduce((total, weight) => total + weight, 0)).toBe(100);

    const weighted = calculateWeightedBetaHealthScore({
      sourceHealth: 91.7,
      runtimeHealth: 84.2,
      evidenceCompleteness: 69.6,
      freshness: 75.63,
      costRisk: 42,
      regressionRisk: 86,
    });

    expect(weighted.raw).toBeCloseTo(78.269, 4);
    expect(weighted.rounded).toBe(78.27);
  });

  it("freezes confidence, legacy, proven-zero, and non-event score rules", () => {
    expect(IDENTITY_CONFIDENCE_WEIGHTS).toEqual({
      exact: 1,
      linked: 0.85,
      inferred: 0.6,
      weak: 0.35,
      unknown: 0,
    });
    expect(LEGACY_CONFIDENCE_MAXIMUMS.recoveredWithDeterministicIdentity.maximumConfidence).toBe("inferred");
    expect(LEGACY_CONFIDENCE_MAXIMUMS.recoveredWithDeterministicIdentity.requiredEvidence).toEqual([
      "userId",
      "sessionId",
      "eventId",
      "sourceTimestamp",
    ]);
    expect(LEGACY_CONFIDENCE_MAXIMUMS.unknownLegacy.maximumConfidence).toBe("unknown");
    expect(PROVEN_ZERO_RULES.missingDataIsZero).toBe(false);
    expect(PROVEN_ZERO_RULES.requiredEvidence).toEqual([
      "boundedSourceWindow",
      "successfulSourceQueryOrSummary",
    ]);
    expect(NON_EVENT_SCORE_RULES.nonEventReducesScore).toBe(false);
    expect(NON_EVENT_SCORE_RULES.futureOnlyEventCountsAsFailure).toBe(false);
    expect(NON_EVENT_SCORE_RULES.highTrafficNoLivenessClassifications).toEqual([
      "source_missing",
      "suspicious_idle",
    ]);
  });

  it("publishes threshold and cost/source rules without changing economy math", () => {
    expect(SESSION_THRESHOLDS.activeRequiresForegroundVisibility).toBe(true);
    expect(WATCH_TIME_THRESHOLDS.pageOpenTimeCountsAsWatchTime).toBe(false);
    expect(BOUNCE_THRESHOLDS.zeroDenominatorRule).toContain("unavailable");
    expect(DEDUPE_WINDOWS.eventIdPriority).toBe("canonical_event_id");
    expect(COST_WEIGHTING_RULES.externalBillingProofRequiredForDollarClaims).toBe(true);
    expect(SOURCE_OF_FUNDS_RULES.paidBaseGumDropsSource).toBe("paid_gd");
    expect(SOURCE_OF_FUNDS_RULES.paidPackageBonusGumDropsSource).toBe("paid_bonus_gd");
    expect(SOURCE_OF_FUNDS_RULES.taskRewardGumDropsSource).toBe("task_reward_gd");
    expect(SOURCE_OF_FUNDS_RULES.unknownLegacyGumDropsSource).toBe("legacy_unknown");
    expect(SOURCE_OF_FUNDS_RULES.rewardGumDropsEligibleForFanPassRenewal).toBe(false);
  });

  it("maps every major formula owner to a canonical authority entry", () => {
    expect(REQUIRED_FORMULA_OWNER_IDS).toEqual(expect.arrayContaining([
      "beta_score",
      "person_metrics",
      "global_metrics",
      "session_time",
      "bounce",
      "watch_time",
      "gumdrop_balances",
      "source_of_funds",
      "revenue_entitlements",
      "task_rewards",
      "chat_gating",
      "notification_liveness",
      "sql_export_parity",
      "legacy_recovery_confidence",
    ]));

    for (const ownerId of REQUIRED_FORMULA_OWNER_IDS) {
      const authority = getFormulaAuthority(ownerId);
      expect(authority).toBeTruthy();
      expect(authority?.formulaOwnerId).toBe(ownerId);
      expect(authority?.canonicalFormula).toBeTruthy();
      expect(authority?.sourceFiles.length).toBeGreaterThan(0);
    }
    expect(FORMULA_AUTHORITY_MAP).toHaveLength(REQUIRED_FORMULA_OWNER_IDS.length);
  });

  it("reports real person metrics hydration gaps instead of hardcoded zero", () => {
    const report = hydratePersonMetrics({
      generatedAtUtc: "2026-05-26T00:00:00.000Z",
      envelopes: [],
      legacyCandidates: [],
      provenZeroMetricIds: [],
    });

    expect(report.missingHydration.length).toBeGreaterThan(0);
    expect(report.debugLane.gaps).toBe(report.missingHydration.length);
    expect(report.scoreImpactByDimension.evidenceCompleteness.reason)
      .toContain(`${report.missingHydration.length} person metric hydration gap`);
  });

  it("records formula comparison artifacts with accuracy and migration explanations", () => {
    expect(FORMULA_COMPARISON_ARTIFACTS.length).toBeGreaterThanOrEqual(6);
    for (const comparison of FORMULA_COMPARISON_ARTIFACTS) {
      expect(comparison.currentFormula).toBeTruthy();
      expect(comparison.canonicalFormula).toBeTruthy();
      expect(comparison.delta).toBeTruthy();
      expect(comparison.accuracyBenefit).toBeTruthy();
      expect(comparison.userVisibleProductImpact).toBeTruthy();
      expect(comparison.migrationRisk).toBeTruthy();
      expect(comparison.filesChanged.length).toBeGreaterThan(0);
    }
  });
});
