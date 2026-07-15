import { describe, expect, it } from "vitest";

import {
  DAILY_CHECK_IN_TASK_CONTRACT,
  buildDailyTaskDebugLane,
} from "@/lib/tasks/daily-task-contract";
import {
  computeNextEligibleAt,
  explainTaskReset,
  isTaskEligibleNow,
  preventDuplicateRewardClaim,
  resolveTaskResetPolicy,
} from "@/lib/tasks/daily-task-reset";
import {
  buildDailyTaskResetTruthReport,
  validateDailyTaskResetTruthReport,
} from "../../scripts/agent/validate-daily-task-reset-truth";

const MAY_23_2026_NOON_CENTRAL = Date.UTC(2026, 4, 23, 17, 0, 0);
const MAY_23_2026_ELEVEN_PM_CENTRAL = Date.UTC(2026, 4, 24, 4, 0, 0);
const MAY_24_2026_ONE_AM_CENTRAL = Date.UTC(2026, 4, 24, 6, 0, 0);
const TEST_HEAD = "0123456789abcdef0123456789abcdef01234567";

describe("daily task reset truth", () => {
  it("makes the daily check-in reset policy explicit as a Central-time calendar day", () => {
    const policy = resolveTaskResetPolicy({
      taskId: "check_in_today",
      completedAt: MAY_23_2026_NOON_CENTRAL,
      nowMs: MAY_23_2026_ELEVEN_PM_CENTRAL,
    });

    expect(policy.resetPolicy).toBe("calendar_day");
    expect(policy.timezone).toBe("America/Chicago");
    expect(policy.resetAnchor).toBe("central_midnight");
    expect(policy.legacyClassification).toBe("known");
    expect(policy.nextEligibleAt).toBeGreaterThan(MAY_23_2026_ELEVEN_PM_CENTRAL);
    expect(explainTaskReset(policy)).toContain("calendar day");
  });

  it("prevents duplicate reward claims inside the reset window and exposes nextEligibleAt", () => {
    const duplicateGuard = preventDuplicateRewardClaim({
      taskId: "check_in_today",
      completedAt: MAY_23_2026_NOON_CENTRAL,
      nowMs: MAY_23_2026_ELEVEN_PM_CENTRAL,
      existingReceiptKey: "fan_1:check_in_today:2026-05-23",
    });

    expect(duplicateGuard.allowed).toBe(false);
    expect(duplicateGuard.reason).toBe("duplicate_within_reset_window");
    expect(duplicateGuard.rewardSource).toBe("reward_gd_only");
    expect(duplicateGuard.provenDuplicate).toBe(true);
    expect(duplicateGuard.nextEligibleAt).toBe(computeNextEligibleAt(resolveTaskResetPolicy({
      taskId: "check_in_today",
      completedAt: MAY_23_2026_NOON_CENTRAL,
      nowMs: MAY_23_2026_ELEVEN_PM_CENTRAL,
    })));

    expect(isTaskEligibleNow({
      taskId: "check_in_today",
      completedAt: MAY_23_2026_NOON_CENTRAL,
      nowMs: MAY_24_2026_ONE_AM_CENTRAL,
    }).eligible).toBe(true);
  });

  it("classifies missing legacy reset anchors as unknown legacy instead of grantable truth", () => {
    const policy = resolveTaskResetPolicy({
      taskId: "legacy_daily_reward",
      resetPolicy: "unknown_legacy",
      completedAt: undefined,
      nowMs: MAY_23_2026_ELEVEN_PM_CENTRAL,
    });

    expect(policy.resetPolicy).toBe("unknown_legacy");
    expect(policy.legacyClassification).toBe("unknown_legacy");
    expect(isTaskEligibleNow(policy).eligible).toBe(false);
    expect(isTaskEligibleNow(policy).reason).toBe("unknown_legacy_reset_anchor");
  });

  it("keeps reward GumDrops separate from paid GumDrops in the task contract and debug lane", () => {
    expect(DAILY_CHECK_IN_TASK_CONTRACT.rewardSource).toBe("reward_gd_only");
    expect(DAILY_CHECK_IN_TASK_CONTRACT.telemetryEvents).toContain("daily_checkin_claimed");
    expect(DAILY_CHECK_IN_TASK_CONTRACT.debugVisibility.lane).toBe("Daily tasks/reset");

    const lane = buildDailyTaskDebugLane({
      duplicateClaimGuard: true,
      unknownLegacyCount: 0,
      failureCount: 0,
    });

    expect(lane.rewardSourceTruth).toBe("reward_gd_only");
    expect(lane.rawDetailsCollapsedByDefault).toBe(true);
    expect(lane.resetPolicy).toBe("calendar_day");
  });

  it("fails the validator report when reset policy or duplicate guard truth is missing", () => {
    const report = buildDailyTaskResetTruthReport({
      generatedAtUtc: "2026-07-14T17:00:00.000Z",
      currentHead: TEST_HEAD,
      dirtyFiles: [
        "src/lib/tasks/daily-task-contract.ts",
        "src/lib/tasks/daily-task-reset.ts",
      ],
    });

    expect(report).toMatchObject({
      reportKey: "daily-task-reset-truth",
      status: "pass",
      passed: true,
      currentHead: TEST_HEAD,
      sourceCommit: TEST_HEAD,
      canClearSourceGate: true,
      sourceStatus: "pass",
      validationFailures: [],
      sourceValidationFailures: [],
      isolationFailures: [],
    });
    expect(validateDailyTaskResetTruthReport(report)).toEqual([]);

    expect(validateDailyTaskResetTruthReport({
      ...report,
      resetPolicyExplicit: false,
      duplicateRewardGuard: false,
    })).toEqual(expect.arrayContaining([
      "reset policy is ambiguous.",
      "duplicate reward guard is missing.",
    ]));
  });

  it("keeps source-slice status but cannot clear the canonical gate after an isolation failure", () => {
    const report = buildDailyTaskResetTruthReport({
      generatedAtUtc: "2026-07-14T17:00:00.000Z",
      currentHead: TEST_HEAD,
      dirtyFiles: ["tmp/unclassified-reset-file.txt"],
    });

    expect(report.status).toBe("fail");
    expect(report.passed).toBe(false);
    expect(report.sourceStatus).toBe("pass");
    expect(report.isolationFailures).toHaveLength(1);
    expect(report.canClearSourceGate).toBe(false);
  });

  it("fails closed when Git provenance is unavailable", () => {
    const report = buildDailyTaskResetTruthReport({ currentHead: "unknown", dirtyFiles: [] });
    expect(report.status).toBe("fail");
    expect(report.canClearSourceGate).toBe(false);
    expect(report.validationFailures).toContain("daily task reset report provenance is not a full matching Git commit.");
  });
});
