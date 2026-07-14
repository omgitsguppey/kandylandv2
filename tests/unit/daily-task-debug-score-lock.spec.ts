import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  buildDailyTaskDebugScoreLockReport,
  validateDailyTaskDebugScoreLockReport,
} from "../../scripts/agent/validate-daily-task-debug-score-lock";
import { expectNoFailuresOrOnlyNamedIsolation } from "./utils/source-validator-contract";

describe("daily task debug score lock", () => {
  it("locks reset, lifecycle, reward, guidance, metrics, and score evidence", () => {
    const report = buildDailyTaskDebugScoreLockReport({
      now: "2026-05-24T04:00:00.000Z",
      currentHead: "test-head",
      dirtyFiles: [],
    });
    const rewardArtifact = JSON.parse(readFileSync("agent/state/daily-task-reward-ledger.generated.json", "utf8")) as {
      status?: string;
      validationFailures?: unknown[];
    };
    const guidanceArtifact = JSON.parse(readFileSync("agent/state/daily-task-guidance-route-audit.generated.json", "utf8")) as {
      status?: string;
      validationFailures?: unknown[];
    };

    expect(report.resetTruthStatus).toBe("pass");
    expect(report.lifecycleTelemetryStatus).toBe("pass");
    expect(report.durationTrackingStatus).toBe("active_duration_only");
    expect(report.rewardLedgerStatus).toBe(rewardArtifact.status === "pass" ? "pass" : "review");
    expect(report.guidanceRouteStatus).toBe(guidanceArtifact.status === "pass" ? "pass" : "review");
    expect(report.taskFailureDebugStatus).toBe("present");
    expect(report.taskPersonMetricsStatus).toBe("present");
    expect(report.taskScoreCoverageStatus).toBe("present");
    expect(report.rewardGdSourceTruth).toBe("reward_gd_only");
    expect(report.duplicateRewardRiskCount).toBe(0);
    expect(report.activeTaskRouteMismatchCount).toBe(0);
    expect(report.scoreDimensions.sourceHealth.target).toBe(80);
    expect(report.nextExactSteps.length).toBeGreaterThan(0);

    if (rewardArtifact.status !== "pass") {
      expect(rewardArtifact.validationFailures?.length ?? 0).toBeGreaterThan(0);
      expectNoFailuresOrOnlyNamedIsolation({
        failures: rewardArtifact.validationFailures ?? [],
        expectedIsolationFailures: [/(?:payment\/wallet runtime changed|chat\/nav changed|dirty files unclassified)\./u],
        allowedIsolationFailures: [
          "payment/wallet runtime changed.",
          "chat/nav changed.",
          "dirty files unclassified.",
        ],
      });
    }
    if (guidanceArtifact.status !== "pass") {
      expect(guidanceArtifact.validationFailures?.length ?? 0).toBeGreaterThan(0);
      expectNoFailuresOrOnlyNamedIsolation({
        failures: guidanceArtifact.validationFailures ?? [],
        expectedIsolationFailures: [/(?:dirty files are unclassified\.|protected chat\/nav\/payment\/GumDrop paid math files changed:|dirty files unclassified:)/u],
        allowedIsolationFailures: [
          "dirty files are unclassified.",
          /^protected chat\/nav\/payment\/GumDrop paid math files changed:/u,
          /^dirty files unclassified:/u,
        ],
      });
    }
    expectNoFailuresOrOnlyNamedIsolation({
      failures: validateDailyTaskDebugScoreLockReport(report),
      expectedIsolationFailures: [/(?:reward ledger missing|guidance route truth missing)\./u],
      allowedIsolationFailures: ["reward ledger missing.", "guidance route truth missing."],
    });
  });

  it("fails when task duration falls back to page time or reward source is unsafe", () => {
    const report = buildDailyTaskDebugScoreLockReport({
      now: "2026-05-24T04:00:00.000Z",
      currentHead: "test-head",
      dirtyFiles: [],
    });

    report.durationTrackingStatus = "passive_page_time";
    report.rewardGdSourceTruth = "paid_gd";

    expect(validateDailyTaskDebugScoreLockReport(report)).toEqual(
      expect.arrayContaining([
        "task duration uses page time.",
        "reward GD source incorrect.",
      ]),
    );
  });
});
