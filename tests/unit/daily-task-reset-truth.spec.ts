import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, writeFileSync, unlinkSync, rmdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

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

function runTaskReader(reader: string, source?: string, bounds?: { min: number | string; max: number }) {
  const repository = process.cwd(), directory = mkdtempSync(join(tmpdir(), "kd-task-reader-")), launcher = join(directory, "reader.cjs");
  const sourcePath = join(repository, "functions/src/daily-task-materializer.ts");
  const body = `const {createRequire}=require('node:module');const req=createRequire(${JSON.stringify(join(repository, "package.json"))});req('tsx/cjs');const fs=require('node:fs'),path=require('node:path');
    const source=${JSON.stringify(source ?? null)},target=${JSON.stringify(sourcePath)},original=fs.readFileSync;
    fs.readFileSync=function(file,...args){if(source!==null&&path.resolve(String(file))===target)return typeof args[0]==='string'?source:Buffer.from(source);return original.call(this,file,...args);};
    const bounds=${JSON.stringify(bounds ?? null)};
    if(bounds){const key=req.resolve(${JSON.stringify(join(repository, "src/lib/tasks/task-catalog.ts"))}),catalog=req(key);req.cache[key].exports={...catalog,DAILY_TASK_GLOBAL_MIN_REWARD_GD:bounds.min==='NaN'?NaN:bounds.min,DAILY_TASK_GLOBAL_MAX_REWARD_GD:bounds.max};}
    req(${JSON.stringify(join(repository, reader))});`;
  writeFileSync(launcher, body);
  try {
    return spawnSync(process.execPath, [launcher], { cwd: repository, encoding: "utf8", windowsHide: true, timeout: 30000 });
  } finally {
    if (resolve(directory) !== directory || !directory.startsWith(resolve(tmpdir()) + require("node:path").sep) || !directory.split(/[\\/]/).at(-1)?.startsWith("kd-task-reader-")) throw new Error("Reader cleanup escaped its own temporary directory");
    unlinkSync(launcher);rmdirSync(directory);
  }
}

describe("actual task reader canonical owners", () => {
  const lifecycle = "scripts/agent/validate-daily-task-lifecycle.ts";
  const materializer = () => readFileSync(join(process.cwd(), "functions/src/daily-task-materializer.ts"), "utf8");
  it.each(["comment", "detached"])("rejects a disconnected schedule accompanied by %s evidence", kind => {
    const source = materializer().replace("schedule: MAINTENANCE_SCHEDULES.materializeDailyTaskResetWindows.schedule", 'schedule: "0 12 * * *"')
      + (kind === "comment" ? '\n// schedule: "5 0 * * *"\n' : '\nconst unusedSchedule = MAINTENANCE_SCHEDULES.materializeDailyTaskResetWindows.schedule;\n');
    const result = runTaskReader(lifecycle, source);
    expect(result.status, result.stdout + result.stderr).not.toBe(0);
    expect(result.stderr).toContain("must connect its exported schedule to the canonical maintenance registry");
  });
  it("accepts the same canonical schedule through actual imported aliases", () => {
    const source = materializer().replace('import {onSchedule}', 'import {onSchedule as scheduleFactory}')
      .replace('= onSchedule({', '= scheduleFactory({')
      .replace('import {MAINTENANCE_SCHEDULES}', 'import {MAINTENANCE_SCHEDULES as schedules}')
      .replaceAll('MAINTENANCE_SCHEDULES.', 'schedules.');
    const result = runTaskReader(lifecycle, source);expect(result.status, result.stdout + result.stderr).toBe(0);
  });
  it.each(['schedule: "0 12 * * *",', '...{ schedule: "0 12 * * *" },'])("rejects a later schedule override %s", override => {
    const source = materializer().replace('  timeZone: "America/Chicago",', override + '\n  timeZone: "America/Chicago",');
    const result = runTaskReader(lifecycle, source);expect(result.status, result.stdout + result.stderr).not.toBe(0);
    expect(result.stderr).toContain("must connect its exported schedule to the canonical maintenance registry");
  });
  it("uses the actual catalog bounds without a second numeric contract", () => {
    const result = runTaskReader("scripts/agent/validate-daily-task-reward-economy.ts");expect(result.status, result.stdout + result.stderr).toBe(0);
  });
  it.each([{ min: "NaN", max: 600 }, { min: 601, max: 600 }])("rejects malformed imported catalog bounds $min/$max", bounds => {
    const result = runTaskReader("scripts/agent/validate-daily-task-reward-economy.ts", undefined, bounds);
    expect(result.status, result.stdout + result.stderr).not.toBe(0);expect(result.stderr).toContain("Canonical task catalog reward bounds must be finite, positive and ordered");
  });
});

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
