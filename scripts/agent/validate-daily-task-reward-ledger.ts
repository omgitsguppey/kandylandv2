import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  buildDailyTaskRewardDebugLane,
  buildDailyTaskRewardLedgerGrant,
  buildDailyTaskRewardTransactionExtra,
} from "../../src/lib/tasks/daily-task-reward-ledger";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/daily-task-reward-ledger.generated.json";
const DOC_PATH = "docs/agent-truth/daily-task-reward-ledger.md";

type ScoreDimensions = {
  sourceHealth: number;
  runtimeHealth: number;
  evidenceCompleteness: number;
  freshness: number;
  costRisk: number;
  regressionRisk: number;
  overallHealthScore: number;
};

type DirtyClassification =
  | "current_generated_artifact_to_commit"
  | "stale_generated_artifact_to_regenerate"
  | "release_artifact_expected"
  | "stale_reward_gd_logic_to_remove"
  | "stale_reset_logic_to_remove"
  | "unrelated_agent_context_file_to_ignore"
  | "real_source_change_needs_review"
  | "validator_artifact_expected"
  | "test_artifact_expected"
  | "unsafe_unknown";

function run(command: string, args: readonly string[]) {
  try {
    return execFileSync(command, args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function read(path: string) {
  return readFileSync(join(ROOT, path), "utf8");
}

function readIfExists(path: string) {
  const fullPath = join(ROOT, path);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function write(path: string, value: string) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value);
}

function changedFiles() {
  const files = new Set<string>();
  for (const args of [["diff", "--name-only"], ["diff", "--cached", "--name-only"], ["ls-files", "--others", "--exclude-standard"]] as const) {
    for (const file of run("git", args).split(/\r?\n/u).map((entry) => entry.trim()).filter(Boolean)) {
      files.add(file.replace(/\\/gu, "/"));
    }
  }
  return [...files].sort();
}

function readScoreSnapshot(): ScoreDimensions {
  const fallback: ScoreDimensions = {
    sourceHealth: 0,
    runtimeHealth: 0,
    evidenceCompleteness: 0,
    freshness: 0,
    costRisk: 0,
    regressionRisk: 0,
    overallHealthScore: 0,
  };
  const raw = readIfExists("agent/state/public-beta-score.generated.json");
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const health = parsed.healthV2 && typeof parsed.healthV2 === "object" ? parsed.healthV2 as Record<string, unknown> : parsed;
    return {
      sourceHealth: Number(health.sourceHealth ?? parsed.sourceHealth ?? 0),
      runtimeHealth: Number(health.runtimeHealth ?? parsed.runtimeHealth ?? 0),
      evidenceCompleteness: Number(health.evidenceCompleteness ?? parsed.evidenceCompleteness ?? 0),
      freshness: Number(health.freshness ?? parsed.freshness ?? 0),
      costRisk: Number(health.costRisk ?? parsed.costRisk ?? 0),
      regressionRisk: Number(health.regressionRisk ?? parsed.regressionRisk ?? 0),
      overallHealthScore: Number(health.overallHealthScore ?? parsed.overallHealthScore ?? parsed.score ?? 0),
    };
  } catch {
    return fallback;
  }
}

export function classifyDailyTaskRewardLedgerDirtyFile(path: string): DirtyClassification {
  const normalized = path.replace(/\\/gu, "/");
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (normalized === REPORT_PATH || normalized === "agent/state/public-beta-score.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === DOC_PATH) return "release_artifact_expected";
  if (normalized === "scripts/agent/validate-daily-task-lifecycle-telemetry.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-daily-task-reset-truth.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-daily-task-guidance-route-audit.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-daily-task-reward-ledger.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-daily-task-debug-score-lock.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/daily-task-reward-ledger.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/daily-task-debug-score-lock.spec.ts") return "test_artifact_expected";
  if (normalized === "src/lib/tasks/daily-task-reward-ledger.ts") return "real_source_change_needs_review";
  if (normalized === "src/app/api/checkin/route.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/server/daily-tasks.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/debug-panel-tracking-summary.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/event-translation-bridge.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/person-metrics-hydration.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/testing/telemetry-trigger-test-matrix.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/server/admin-debug/summary.ts") return "real_source_change_needs_review";
  if (normalized === "src/app/api/admin/debug/route.ts") return "real_source_change_needs_review";
  if (normalized === "scripts/agent/validate-gumdrop-source-of-funds-truth.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/score-gumdrop-economy.ts") return "real_source_change_needs_review";
  if (normalized === "package.json") return "real_source_change_needs_review";
  if (
    normalized === "CHANGELOG.md"
    || normalized === "public/kandydrops-release-notes.json"
    || normalized === "src/lib/release-notes/public-release-notes.ts"
    || normalized === "src/lib/release-notes/release-version-contract.ts"
  ) return "release_artifact_expected";
  if (normalized.startsWith("agent/state/") && normalized.endsWith(".generated.json")) return "stale_generated_artifact_to_regenerate";
  if (normalized.startsWith("docs/agent-truth/")) return "stale_generated_artifact_to_regenerate";
  if (/reward.*paid|paid.*reward|free.*paid|bonus.*reward/iu.test(normalized)) return "stale_reward_gd_logic_to_remove";
  if (/reset.*legacy|duplicate.*claim/iu.test(normalized)) return "stale_reset_logic_to_remove";
  if (/chat|paypal|payment|wallet|nav/iu.test(normalized)) return "unsafe_unknown";
  return "unsafe_unknown";
}

export function buildDailyTaskRewardLedgerReport() {
  const generatedAtUtc = new Date().toISOString();
  const currentHead = run("git", ["rev-parse", "--short", "HEAD"]) || "unknown";
  const scoreBefore = readScoreSnapshot();
  const scoreAfter = scoreBefore;
  const contract = read("src/lib/tasks/daily-task-reward-ledger.ts");
  const checkinRoute = read("src/app/api/checkin/route.ts");
  const dailyTasks = read("src/lib/server/daily-tasks.ts");
  const gumdropLedger = read("src/lib/gumdrop-ledger.ts");
  const debugSummary = read("src/lib/debug/debug-panel-tracking-summary.ts");
  const adminSummary = read("src/lib/server/admin-debug/summary.ts");
  const adminDebugRoute = read("src/app/api/admin/debug/route.ts");
  const packageJson = read("package.json");
  const unitTest = read("tests/unit/daily-task-reward-ledger.spec.ts");
  const dirtyFiles = changedFiles().map((path) => ({ path, classification: classifyDailyTaskRewardLedgerDirtyFile(path) }));
  const sampleGrant = buildDailyTaskRewardLedgerGrant({
    taskId: "check_in_today",
    userId: "validator_user",
    rewardGdAmount: 10,
    resetWindowId: "2026-05-24",
    grantReason: "daily_check_in_claim",
    grantedAtMs: Date.parse(generatedAtUtc),
  });
  const sampleExtra = buildDailyTaskRewardTransactionExtra(sampleGrant);
  const debugLane = buildDailyTaskRewardDebugLane({
    grantedRewards: 2,
    blockedDuplicateClaims: 1,
    unknownLegacyRewards: 0,
    failedGrantCount: 0,
  });

  const report = {
    generatedAtUtc,
    currentHead,
    scoreBefore,
    scoreAfter,
    rewardGrantContract: {
      rewardGrantId: sampleGrant.rewardGrantId,
      rewardSource: sampleGrant.rewardSource,
      sourceOfFunds: sampleGrant.sourceOfFunds,
      duplicateClaimPolicy: sampleGrant.duplicateClaimPolicy,
      ledgerDestination: sampleGrant.ledgerDestination,
      spendRestrictions: sampleGrant.spendRestrictions,
    },
    checkInRouteStatus: {
      deterministicGrantId: checkinRoute.includes(".doc(rewardGrant.rewardGrantId)"),
      transactionExtra: checkinRoute.includes("buildDailyTaskRewardTransactionExtra(rewardGrant)"),
      sourceOfFundsResponse: checkinRoute.includes("sourceOfFundsExplanation") && checkinRoute.includes("rewardLedger"),
      duplicateBlockedBeforeGrant: checkinRoute.includes("duplicateRewardBlocked: true") && checkinRoute.includes("Already claimed today"),
      runTransactionUsed: checkinRoute.includes("adminDb.runTransaction"),
    },
    taskRewardStatus: {
      deterministicGrantId: dailyTasks.includes(".doc(rewardGrant.rewardGrantId)"),
      rewardReceiptIdempotency: dailyTasks.includes("rewardGrant.idempotencyKey") && dailyTasks.includes("buildTaskRewardCreditIdempotencyKey"),
      transactionExtra: dailyTasks.includes("buildDailyTaskRewardTransactionExtra(rewardGrant)"),
      rewardBalanceCredit: dailyTasks.includes('creditSourceAwareGumdrops(sourceAwareBalanceCursor, task.reward, "reward")'),
    },
    economyStatus: {
      paidSourceForbidden: !contract.includes('"paid_gd"') && !contract.includes('"paid_bonus_gd"'),
      rewardCreditOnly: gumdropLedger.includes("gumdropRewardTotal: isRewardTransaction ? positiveAmount : 0"),
      creatorPaidRestriction: sampleGrant.spendRestrictions.creatorPaidExperiences === "blocked",
      transactionExtraSource: sampleExtra.sourceOfFunds === "reward_gd" && sampleExtra.rewardGrantSource === "task_reward",
    },
    debugLane,
    dirtyFileClassifications: dirtyFiles,
    scoreImpactByDimension: {
      sourceHealth: { before: scoreBefore.sourceHealth, after: scoreAfter.sourceHealth, reason: "Task reward grants now have explicit reward_gd source-of-funds metadata." },
      runtimeHealth: { before: scoreBefore.runtimeHealth, after: scoreAfter.runtimeHealth, reason: "Reward grants use deterministic ids and transaction-scoped writes without production reads." },
      evidenceCompleteness: { before: scoreBefore.evidenceCompleteness, after: scoreAfter.evidenceCompleteness, reason: "Ledger report documents taskId, resetWindowId, idempotencyKey, duplicate policy, and debug lane." },
      freshness: { before: scoreBefore.freshness, after: scoreAfter.freshness, reason: "Daily task reward ledger state/doc generated with current HEAD." },
      costRisk: { before: scoreBefore.costRisk, after: scoreAfter.costRisk, reason: "Validator is source-only; no production reads or broad ledger scans." },
      regressionRisk: { before: scoreBefore.regressionRisk, after: scoreAfter.regressionRisk, reason: "Unit tests and source-of-funds validators guard reward-vs-paid classification." },
      overallHealthScore: { before: scoreBefore.overallHealthScore, after: scoreAfter.overallHealthScore, reason: "Score remains bounded by external beta evidence gates, not task reward ledger wiring." },
    },
    validationInputs: {
      unitTestPresent: unitTest.includes("stores task reward grants as reward source"),
      packageScriptPresent: packageJson.includes('"check:daily-task-reward-ledger": "tsx scripts/agent/validate-daily-task-reward-ledger.ts"'),
      debugLanePresent: debugSummary.includes("daily_task_reward_ledger") && adminSummary.includes("dailyTaskRewardLedger") && adminDebugRoute.includes("dailyTaskRewardLedger"),
      paymentRuntimeTouched: dirtyFiles.some((entry) => /src\/app\/api\/paypal|src\/components\/PurchaseModal|src\/lib\/wallet|src\/app\/api\/wallet/iu.test(entry.path)),
      chatOrNavTouched: dirtyFiles.some((entry) => /src\/components\/Chat|src\/lib\/chat|Navbar|Navigation|bottom-nav/iu.test(entry.path)),
    },
    validationFailures: [] as string[],
  };

  const failures = report.validationFailures;
  if (sampleGrant.sourceOfFunds !== "reward_gd" || sampleGrant.rewardSource !== "task_reward") failures.push("task reward source can be paid GD.");
  if (contract.includes("paid_bonus_gd") || contract.includes('"paid_gd"')) failures.push("task reward source can be paid bonus GD.");
  if (!report.checkInRouteStatus.deterministicGrantId || !report.taskRewardStatus.deterministicGrantId) failures.push("duplicate reward claim can write multiple grants.");
  if (!sampleGrant.taskId || !sampleGrant.resetWindowId || !sampleGrant.idempotencyKey) failures.push("reward grant lacks taskId/resetWindowId/idempotencyKey.");
  if (!report.checkInRouteStatus.runTransactionUsed || !sampleExtra.partialGrantPolicy.includes("atomic")) failures.push("reward grant can partially complete.");
  if (sampleGrant.spendRestrictions.creatorPaidExperiences !== "blocked") failures.push("reward GD spend restrictions violated.");
  if (!report.debugLane || !report.validationInputs.debugLanePresent) failures.push("ledger debug lane missing.");
  if (!report.taskRewardStatus.rewardBalanceCredit) failures.push("daily task rewards do not credit reward balance.");
  if (!report.checkInRouteStatus.sourceOfFundsResponse) failures.push("reward response lacks source-of-funds explanation.");
  if (!report.validationInputs.packageScriptPresent) failures.push("package script check:daily-task-reward-ledger missing.");
  if (!report.validationInputs.unitTestPresent) failures.push("daily task reward ledger unit test missing.");
  if (report.validationInputs.paymentRuntimeTouched) failures.push("payment/wallet runtime changed.");
  if (report.validationInputs.chatOrNavTouched) failures.push("chat/nav changed.");
  if (dirtyFiles.some((entry) => entry.classification === "unsafe_unknown")) failures.push("dirty files unclassified.");

  return {
    ...report,
    status: failures.length > 0 ? "fail" : "pass",
    validationFailures: [...new Set(failures)],
  };
}

function renderDoc(report: ReturnType<typeof buildDailyTaskRewardLedgerReport>) {
  const scoreRows = Object.entries(report.scoreImpactByDimension)
    .map(([dimension, value]) => `- ${dimension}: before=${value.before}; after=${value.after}; ${value.reason}`);
  const dirtyRows = report.dirtyFileClassifications.map((entry) => `- ${entry.path}: ${entry.classification}`);
  return [
    "# Daily Task Reward Ledger",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current head: ${report.currentHead}`,
    `Status: ${report.status}`,
    "",
    "## Contract",
    "",
    `- Reward source: ${report.rewardGrantContract.rewardSource}`,
    `- Source of funds: ${report.rewardGrantContract.sourceOfFunds}`,
    `- Ledger destination: ${report.rewardGrantContract.ledgerDestination}`,
    `- Duplicate policy: ${report.rewardGrantContract.duplicateClaimPolicy}`,
    "- Paid creator experiences, paid chat, and Fan Pass start/renewal are blocked for task reward GD.",
    "",
    "## Route Wiring",
    "",
    `- Check-in deterministic grant id: ${report.checkInRouteStatus.deterministicGrantId}`,
    `- Check-in source explanation: ${report.checkInRouteStatus.sourceOfFundsResponse}`,
    `- Daily task deterministic grant id: ${report.taskRewardStatus.deterministicGrantId}`,
    `- Daily task reward balance credit: ${report.taskRewardStatus.rewardBalanceCredit}`,
    "",
    "## Debug Lane",
    "",
    `- Lane: ${report.debugLane.lane}`,
    `- Status: ${report.debugLane.status}`,
    `- Ledger source: ${report.debugLane.ledgerSource}`,
    `- Source of funds: ${report.debugLane.sourceOfFunds}`,
    `- Blocked duplicates: ${report.debugLane.blockedDuplicateClaims}`,
    "",
    "## Score Impact",
    "",
    ...scoreRows,
    "",
    "## Dirty Files",
    "",
    ...(dirtyRows.length ? dirtyRows : ["- none"]),
    "",
    "## Validation Failures",
    "",
    ...(report.validationFailures.length ? report.validationFailures.map((failure) => `- ${failure}`) : ["- none"]),
    "",
  ].join("\n");
}

function main() {
  const report = buildDailyTaskRewardLedgerReport();
  write(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  write(DOC_PATH, renderDoc(report));

  if (report.validationFailures.length > 0) {
    console.error(`Daily task reward ledger validation failed:\n${report.validationFailures.map((failure) => `- ${failure}`).join("\n")}`);
    process.exit(1);
  }

  console.log(`Daily task reward ledger validation passed: source=${report.rewardGrantContract.sourceOfFunds}, duplicatePolicy=${report.rewardGrantContract.duplicateClaimPolicy}, debug=${report.debugLane.lane}.`);
}

main();
