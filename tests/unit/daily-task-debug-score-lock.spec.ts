import { describe, expect, it } from "vitest";

import {
  DAILY_TASK_LOCK_SCORE_DIMENSIONS,
  buildDailyTaskDebugScoreLockReport,
  validateDailyTaskDebugScoreLockReport,
} from "../../scripts/agent/validate-daily-task-debug-score-lock";

const TEST_HEAD = "0123456789abcdef0123456789abcdef01234567";
const OTHER_HEAD = "89abcdef0123456789abcdef0123456789abcdef";
const TEST_NOW = "2026-07-14T18:00:00.000Z";
const TEST_NOW_MS = Date.parse(TEST_NOW);
const TEST_CHILD_TIME = "2026-07-14T17:00:00.000Z";

const scoreSnapshot = Object.fromEntries(
  DAILY_TASK_LOCK_SCORE_DIMENSIONS.map((dimension) => [dimension, 90]),
);
const scoreImpact = Object.fromEntries(
  DAILY_TASK_LOCK_SCORE_DIMENSIONS.map((dimension) => [dimension, `${dimension} is source-covered.`]),
);

function sourceEnvelope(reportKey: string, payload: Record<string, unknown>): Record<string, any> {
  return {
    ...payload,
    reportKey,
    status: "pass",
    passed: true,
    generatedAtUtc: TEST_CHILD_TIME,
    currentHead: TEST_HEAD,
    sourceCommit: TEST_HEAD,
    evidenceClass: "source_snapshot",
    canClearSourceGate: true,
    canClearRuntimeGate: false,
    canClearProviderGate: false,
    canClearAdminTruthGate: false,
    nextExactSteps: ["Keep source evidence current."],
    validationFailures: [],
    sourceStatus: "pass",
    sourceValidationFailures: [],
    isolationFailures: [],
    doesNotProve: ["Does not prove deployed runtime behavior."],
  };
}

function buildSourceReports(): {
  resetTruth: Record<string, any>;
  lifecycleTelemetry: Record<string, any>;
  rewardLedger: Record<string, any>;
  guidanceRouteAudit: Record<string, any>;
  publicBetaScore: Record<string, any>;
} {
  return {
    resetTruth: sourceEnvelope("daily-task-reset-truth", {
      resetPolicyExplicit: true,
      duplicateRewardGuard: true,
      rewardSourceTruth: "reward_gd_only",
      unknownLegacyCount: 0,
      debugLanePresent: true,
      scoreAfter: scoreSnapshot,
      scoreDimensionImpact: scoreImpact,
    }),
    lifecycleTelemetry: sourceEnvelope("daily-task-lifecycle-telemetry", {
      requiredEventsRegistered: true,
      completionHasStartAttemptPath: true,
      rewardGrantedServerTruth: true,
      durationRejectsPassivePageTime: true,
      debugLanePresent: true,
      debugLane: {
        lane: "Daily task lifecycle",
        failureReasons: [],
      },
      personTaskMetrics: Array.from({ length: 8 }, () => ({ present: true })),
      scoreDimensionImpact: scoreImpact,
    }),
    rewardLedger: sourceEnvelope("daily-task-reward-ledger", {
      rewardGrantContract: {
        duplicateClaimPolicy: "block_within_reset_window",
        sourceOfFunds: "reward_gd",
        rewardSource: "task_reward",
      },
      debugLane: {
        lane: "Daily task reward ledger",
        unknownLegacyRewards: 0,
      },
      scoreImpactByDimension: scoreImpact,
    }),
    guidanceRouteAudit: sourceEnvelope("daily-task-guidance-route-audit", {
      summary: {
        brokenRoutes: 0,
        wrongSurfaceTasks: 0,
        missingCompletionSignals: 0,
      },
      debugLane: { lane: "Task guidance health" },
      scoreImpact,
    }),
    publicBetaScore: {
      sourceHealthScore: 90,
      runtimeHealthScore: 90,
      evidenceCompletenessScore: 90,
      freshnessScore: 90,
      costRiskScore: 90,
      regressionRiskScore: 90,
      healthScore: 90,
    },
  };
}

function buildReport(sourceReports = buildSourceReports(), dirtyFiles: string[] = []) {
  return buildDailyTaskDebugScoreLockReport({
    now: TEST_NOW,
    nowMs: TEST_NOW_MS,
    currentHead: TEST_HEAD,
    dirtyFiles,
    sourceReports,
  });
}

describe("daily task debug score lock", () => {
  it("locks deterministic same-head child evidence without reading generated artifacts", () => {
    const report = buildReport();

    expect(report).toMatchObject({
      reportKey: "daily-task-debug-score-lock",
      status: "pass",
      passed: true,
      sourceCommit: TEST_HEAD,
      currentHead: TEST_HEAD,
      canClearSourceGate: true,
      resetTruthStatus: "pass",
      lifecycleTelemetryStatus: "pass",
      durationTrackingStatus: "active_duration_only",
      rewardLedgerStatus: "pass",
      guidanceRouteStatus: "pass",
      taskFailureDebugStatus: "present",
      taskPersonMetricsStatus: "present",
      taskScoreCoverageStatus: "present",
      rewardGdSourceTruth: "reward_gd_only",
      duplicateRewardRiskCount: 0,
      activeTaskRouteMismatchCount: 0,
      validationFailures: [],
      sourceValidationFailures: [],
      isolationFailures: [],
    });
    expect(validateDailyTaskDebugScoreLockReport(report, {
      expectedHead: TEST_HEAD,
      nowMs: TEST_NOW_MS,
    })).toEqual([]);
  });

  it("rejects a stale child before consuming its otherwise-positive payload", () => {
    const sources = buildSourceReports();
    sources.resetTruth.generatedAtUtc = "2026-07-13T16:59:59.999Z";
    const report = buildReport(sources);

    expect(report.status).toBe("fail");
    expect(report.resetTruthStatus).toBe("missing");
    expect(report.validationFailures).toContain(
      "daily-task-reset-truth child generatedAtUtc must be non-future and fresh within 86400000ms.",
    );
  });

  it("rejects wrong-head provenance before consuming child payload", () => {
    const sources = buildSourceReports();
    sources.lifecycleTelemetry.currentHead = OTHER_HEAD;
    sources.lifecycleTelemetry.sourceCommit = OTHER_HEAD;
    const report = buildReport(sources);

    expect(report.lifecycleTelemetryStatus).toBe("missing");
    expect(report.validationFailures).toContain(
      "daily-task-lifecycle-telemetry child currentHead must match the current full Git SHA.",
    );
  });

  it("rejects a failing child even when its payload claims healthy reward truth", () => {
    const sources = buildSourceReports();
    sources.rewardLedger.status = "fail";
    sources.rewardLedger.passed = false;
    sources.rewardLedger.canClearSourceGate = false;
    sources.rewardLedger.sourceStatus = "fail";
    sources.rewardLedger.validationFailures = ["task reward source can be paid GD."];
    sources.rewardLedger.sourceValidationFailures = ["task reward source can be paid GD."];
    const report = buildReport(sources);

    expect(report.rewardLedgerStatus).toBe("missing");
    expect(report.rewardGdSourceTruth).toBe("unsafe_unknown");
    expect(report.validationFailures).toContain("daily-task-reward-ledger child canClearSourceGate must be true.");
  });

  it("rejects contradictory verdict and failure arrays", () => {
    const sources = buildSourceReports();
    sources.guidanceRouteAudit.validationFailures = ["active task points to a missing route."];
    sources.guidanceRouteAudit.sourceValidationFailures = ["active task points to a missing route."];
    const report = buildReport(sources);

    expect(report.guidanceRouteStatus).toBe("missing");
    expect(report.validationFailures).toEqual(expect.arrayContaining([
      "guidance route child: status contradicts validationFailures.",
      "guidance route child: passed contradicts validationFailures.",
    ]));
  });

  it("rejects a wrong child identity and a false source gate", () => {
    const sources = buildSourceReports();
    sources.resetTruth.reportKey = "not-reset-truth";
    sources.lifecycleTelemetry.canClearSourceGate = false;
    const report = buildReport(sources);

    expect(report.validationFailures).toEqual(expect.arrayContaining([
      "daily-task-reset-truth child reportKey must be daily-task-reset-truth.",
      "lifecycle telemetry child: canClearSourceGate contradicts validationFailures.",
      "daily-task-lifecycle-telemetry child canClearSourceGate must be true.",
    ]));
  });

  it("still detects a post-build duration or reward-source regression", () => {
    const report = buildReport();
    report.durationTrackingStatus = "passive_page_time";
    report.rewardGdSourceTruth = "paid_gd";

    expect(validateDailyTaskDebugScoreLockReport(report)).toEqual(
      expect.arrayContaining([
        "task duration uses page time.",
        "reward GD source incorrect.",
      ]),
    );
  });

  it("does not clear the aggregate source gate when an isolation failure remains", () => {
    const report = buildReport(buildSourceReports(), ["tmp/unclassified-daily-lock-file.txt"]);

    expect(report.status).toBe("fail");
    expect(report.sourceStatus).toBe("pass");
    expect(report.isolationFailures).toContain("dirty files unclassified.");
    expect(report.canClearSourceGate).toBe(false);
  });

  it("surfaces the exact derived-state blocker when trusted children disagree with daily truth", () => {
    const sources = buildSourceReports();
    sources.lifecycleTelemetry.durationRejectsPassivePageTime = false;
    const report = buildReport(sources);

    expect(report.status).toBe("fail");
    expect(report.validationFailures).toContain("task duration uses page time.");
    expect(report.remainingGaps.join("\n")).toContain("task duration uses page time.");
    expect(report.nextExactSteps.join("\n")).toContain("task duration uses page time.");
  });
});
