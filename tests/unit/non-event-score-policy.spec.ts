import { describe, expect, it } from "vitest";

import {
  buildBelowTargetDimensionExplanations,
  classifyNonEventScoreImpact,
  summarizeNonEventScorePolicy,
} from "@/lib/agent-score/non-event-score-policy";

describe("non-event score policy", () => {
  it("keeps future activity placeholders score-neutral", () => {
    const quietFuture = classifyNonEventScoreImpact({
      signalId: "future-wallet-open",
      classification: "quiet_future_activity",
      rawCount: 416,
    });
    const firstRealEvent = classifyNonEventScoreImpact({
      signalId: "wallet-ready-waiting",
      classification: "source_ready_waiting_for_real_user_event",
    });

    expect(quietFuture.scorePenalty).toBe(0);
    expect(quietFuture.scoreDimensionsAffected).toEqual([]);
    expect(quietFuture.countsAsRegression).toBe(false);
    expect(firstRealEvent.scorePenalty).toBe(0);
    expect(firstRealEvent.scoreDimensionsAffected).toEqual([]);
    expect(firstRealEvent.countsAsRegression).toBe(false);
  });

  it("keeps broken paths actionable without labeling them as non-events", () => {
    expect(classifyNonEventScoreImpact({
      signalId: "missing-producer",
      classification: "missing_producer",
    })).toMatchObject({
      scoreDimensionsAffected: ["sourceHealth", "evidenceCompleteness"],
      blockerType: "source_connectivity",
      scorePenalty: 6,
    });
    expect(classifyNonEventScoreImpact({
      signalId: "missing-bridge",
      classification: "missing_bridge",
    })).toMatchObject({
      scoreDimensionsAffected: ["runtimeHealth", "evidenceCompleteness"],
      blockerType: "bridge_connectivity",
      scorePenalty: 5,
    });
    expect(classifyNonEventScoreImpact({
      signalId: "missing-materializer",
      classification: "missing_materializer",
    })).toMatchObject({
      scoreDimensionsAffected: ["evidenceCompleteness", "runtimeHealth"],
      blockerType: "materializer_connectivity",
      scorePenalty: 4,
    });
  });

  it("scores grouped actionable signals rather than raw quiet signal rows", () => {
    const summary = summarizeNonEventScorePolicy({
      groups: [
        {
          groupId: "future-activity-catalog",
          actionability: "quiet_future_activity",
          count: 416,
          estimatedPointImpact: 0,
          scoreDimensionsAffected: [],
          rootCause: "future_activity_placeholder",
        },
        {
          groupId: "missing-bridge-wallet",
          actionability: "score_impacting",
          count: 19,
          estimatedPointImpact: 5,
          scoreDimensionsAffected: ["runtimeHealth", "evidenceCompleteness"],
          rootCause: "missing_bridge",
        },
      ],
    });

    expect(summary.quietFutureActivityCount).toBe(416);
    expect(summary.actionableSignalGroupCount).toBe(1);
    expect(summary.scoreDragSignalGroupCount).toBe(1);
    expect(summary.nonEventScorePenaltyCount).toBe(0);
    expect(summary.usesActionableGroups).toBe(true);
  });

  it("explains below-target dimensions by true blocker type", () => {
    const explanations = buildBelowTargetDimensionExplanations({
      metrics: {
        sourceHealth: 91.7,
        runtimeHealth: 67.5,
        evidenceCompleteness: 39,
        freshness: 62.86,
        costRisk: 42,
        regressionRisk: 42,
        overallHealthScore: 62.05,
      },
    });

    expect(explanations.runtimeHealth).toMatchObject({
      status: "below_target",
      blockerType: "formal_runtime_evidence",
    });
    expect(explanations.evidenceCompleteness.reason).not.toMatch(/activity missing|waiting on activity/iu);
    expect(explanations.freshness).toMatchObject({
      blockerType: "stale_score_evidence",
    });
    expect(explanations.overallHealthScore.nextExactAction).toContain("Raise the below-target component dimensions");
  });
});
