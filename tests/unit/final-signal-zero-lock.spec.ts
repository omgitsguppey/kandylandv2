import { describe, expect, it } from "vitest";

import {
  FINAL_SIGNAL_ZERO_DIMENSIONS,
  buildFinalSignalZeroLockReport,
  validateFinalSignalZeroLockReport,
} from "../../scripts/agent/validate-final-signal-zero-lock";

const score = {
  sourceHealthScore: 91.7,
  runtimeHealthScore: 67.5,
  evidenceCompletenessScore: 39,
  freshnessScore: 62.86,
  costRiskScore: 42,
  regressionRiskScore: 42,
  healthScore: 62.05,
  quietFutureActivityCount: 416,
  actionableSignalGroupCount: 15,
  nonEventScorePenaltyCount: 0,
  scoreDimensionExplanations: {
    runtimeHealth: {
      blockerType: "formal_runtime_evidence",
      nextExactAction: "Attach approved runtime/provider/admin evidence.",
    },
    evidenceCompleteness: {
      blockerType: "formal_runtime_evidence",
      nextExactAction: "Complete formal evidence gates.",
    },
    freshness: {
      blockerType: "stale_score_evidence",
      nextExactAction: "Refresh stale score-impacting artifacts.",
    },
    costRisk: {
      blockerType: "cost_owner_review",
      nextExactAction: "Resolve owner-review cost lanes.",
    },
    regressionRisk: {
      blockerType: "stale_score_evidence",
      nextExactAction: "Refresh targeted evidence.",
    },
    overallHealthScore: {
      blockerType: "formal_runtime_evidence",
      nextExactAction: "Raise below-target component dimensions.",
    },
  },
  launchBlockers: [
    "Runtime/provider smoke: Runtime unverified",
    "Admin truth/sample evidence: Ready with smoke required",
  ],
};

const baseArtifacts = {
  publicBetaScore: score,
  futureActivitySignalReclassification: {
    activitySignalSummary: {
      totalSignalCount: 416,
      quietFutureActivityCount: 416,
      actionableActivitySignalCount: 0,
      brokenActivityPathCount: 0,
      scoreDragActivityCount: 0,
    },
    falseWaitingCount: 0,
  },
  debugSignalGrouping: {
    rawSignalCount: 457,
    quietFutureActivityRawCount: 416,
    actionableFutureActivitySignalCount: 0,
    p1P2GroupCount: 15,
    p1GroupCount: 12,
    p2GroupCount: 3,
    defaultDebugPanel: {
      rawRowsDefaultVisible: false,
      futureActivityCatalogCollapsed: true,
    },
    groups: [
      {
        actionability: "quiet_future_activity",
        severity: "info",
        count: 416,
        hiddenByDefault: true,
        estimatedPointImpact: 0,
        scoreDimensionsAffected: [],
        rootCause: "future_activity_placeholder",
      },
      {
        actionability: "formal_gate",
        severity: "p1",
        count: 1,
        hiddenByDefault: false,
        estimatedPointImpact: 10,
        scoreDimensionsAffected: ["runtimeHealth"],
        rootCause: "blocked_formal_evidence",
      },
    ],
  },
  nonEventScorePolicy: {
    quietFutureActivityCount: 416,
    actionableSignalGroupCount: 15,
    nonEventScorePenaltyCount: 0,
    metrics: {},
  },
};

describe("final signal zero lock", () => {
  it("locks future activity to quiet catalog counts with zero actionable or score-drag signals", () => {
    const report = buildFinalSignalZeroLockReport({
      currentHead: "HEAD",
      generatedAtUtc: "2026-05-23T22:00:00.000Z",
      artifacts: baseArtifacts,
      changedFiles: [
        "agent/state/final-signal-zero-lock.generated.json",
        "docs/agent-truth/final-signal-zero-lock.md",
        "scripts/agent/validate-final-signal-zero-lock.ts",
        "tests/unit/final-signal-zero-lock.spec.ts",
        "package.json",
      ],
    });

    expect(Object.keys(report.metrics)).toEqual([...FINAL_SIGNAL_ZERO_DIMENSIONS]);
    expect(report.rawFutureActivityCount).toBe(416);
    expect(report.quietFutureActivityCount).toBe(416);
    expect(report.actionableFutureActivityCount).toBe(0);
    expect(report.falseWaitingCount).toBe(0);
    expect(report.scoreDragActivityCount).toBe(0);
    expect(report.nonEventScorePenaltyCount).toBe(0);
    expect(report.remainingBrokenPaths).toEqual([]);
    expect(report.remainingBelow80Dimensions.map((entry) => entry.dimension)).toEqual([
      "runtimeHealth",
      "evidenceCompleteness",
      "freshness",
      "costRisk",
      "regressionRisk",
      "overallHealthScore",
    ]);
    expect(validateFinalSignalZeroLockReport(report)).toEqual([]);
  });

  it("fails if quiet future activity leaks into actionable debug, score drag, p1/p2, or raw default rows", () => {
    const report = buildFinalSignalZeroLockReport({
      artifacts: {
        ...baseArtifacts,
        futureActivitySignalReclassification: {
          activitySignalSummary: {
            totalSignalCount: 416,
            quietFutureActivityCount: 415,
            actionableActivitySignalCount: 1,
            brokenActivityPathCount: 1,
            scoreDragActivityCount: 1,
          },
          falseWaitingCount: 1,
        },
        debugSignalGrouping: {
          ...baseArtifacts.debugSignalGrouping,
          defaultDebugPanel: {
            rawRowsDefaultVisible: true,
            futureActivityCatalogCollapsed: false,
          },
          groups: [
            {
              actionability: "quiet_future_activity",
              severity: "p1",
              count: 416,
              hiddenByDefault: false,
              estimatedPointImpact: 1,
              scoreDimensionsAffected: ["freshness"],
              rootCause: "future_activity_placeholder",
            },
          ],
        },
        nonEventScorePolicy: {
          ...baseArtifacts.nonEventScorePolicy,
          nonEventScorePenaltyCount: 1,
        },
      },
      changedFiles: ["tmp/unknown.txt"],
    });

    expect(validateFinalSignalZeroLockReport(report)).toEqual(expect.arrayContaining([
      "actionable future activity signals must be zero.",
      "false waiting-on-activity count must be zero.",
      "future activity score drag must be zero.",
      "non-event score penalty count must be zero.",
      "raw future activity appears in the default debug panel.",
      "P1/P2 counts include quiet future activity.",
      "broken activity paths remain actionable and must not be hidden.",
      "dirty files are unclassified.",
    ]));
  });
});
