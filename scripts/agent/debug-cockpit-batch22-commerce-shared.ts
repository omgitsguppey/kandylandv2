import fs from "node:fs";
import path from "node:path";

import { classifyTransactionSourceOfFunds } from "../../src/lib/commerce/transaction-source-of-funds-contract";
import { buildRecentTransactionFeedSummary } from "../../src/lib/debug/recent-transaction-feed-contract";
import { buildTransactionSequenceJourneySummary } from "../../src/lib/behavioral/transaction-sequence-contract";
import { buildDebugCockpitBatch22CommerceTruthReport, validateDebugCockpitBatch22CommerceTruthReport } from "../../src/lib/debug/debug-cockpit-batch22-commerce-truth";

type Report = Record<string, unknown>;

const NOW_MS = Date.parse("2026-05-24T12:00:00.000Z");

function readText(filePath: string) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeMarkdown(filePath: string, lines: string[]) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function pushIf(condition: boolean, failures: string[], message: string) {
  if (!condition) failures.push(message);
}

function runValidation(reportKey: string, report: Report, failures: string[]) {
  const generatedAtUtc = new Date().toISOString();
  const output = {
    reportKey,
    generatedAtUtc,
    ...report,
    validationFailures: failures,
  };
  writeJson(`agent/state/${reportKey}.generated.json`, output);
  writeMarkdown(`docs/agent-truth/${reportKey}.md`, [
    `# ${reportKey}`,
    "",
    `Generated: ${generatedAtUtc}`,
    "",
    `Status: ${failures.length === 0 ? "pass" : "fail"}`,
    "",
    "## Summary",
    "- Unlock transactions now classify purchased/reward spend splits without changing GumDrop math.",
    "- Recent transaction summaries redact full UIDs by default and keep full IDs drilldown-only.",
    "- Same-user commerce sequences are compact bounded journey evidence, not causation claims.",
    "",
    "## Validation Failures",
    ...(failures.length === 0 ? ["- none"] : failures.map((failure) => `- ${failure}`)),
  ]);
  if (failures.length > 0) {
    console.error(`${reportKey} failed:`);
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }
  console.log(`${reportKey}: pass`);
}

export function validateUnlockTransactionSourceMetadata() {
  const unlockRoute = readText("src/app/api/drops/unlock/route.ts");
  const ledger = readText("src/lib/gumdrop-ledger.ts");
  const exact = classifyTransactionSourceOfFunds({
    transactionId: "new_unlock",
    userId: "tlove81-full-uid",
    type: "unlock_content",
    amount: -1000,
    status: "completed",
    purchasedAmountSpent: 0,
    rewardAmountSpent: 1000,
    sourceTruth: "server",
    timestampMs: NOW_MS,
  });
  const legacy = classifyTransactionSourceOfFunds({
    transactionId: "legacy_unlock",
    userId: "tlove81-full-uid",
    type: "unlock_content",
    amount: -1000,
    status: "completed",
    timestampMs: Date.parse("2026-05-01T00:00:00.000Z"),
    nowMs: NOW_MS,
  });
  const missing = classifyTransactionSourceOfFunds({
    transactionId: "missing_unlock",
    userId: "tlove81-full-uid",
    type: "unlock_content",
    amount: -1000,
    status: "completed",
    timestampMs: NOW_MS,
    nowMs: NOW_MS,
  });
  const failures: string[] = [];
  pushIf(unlockRoute.includes("purchasedAmountSpent: spend.purchasedSpent"), failures, "new unlock_content transaction can be written without purchased spend split.");
  pushIf(unlockRoute.includes("rewardAmountSpent: spend.rewardSpent"), failures, "new unlock_content transaction can be written without reward spend split.");
  pushIf(unlockRoute.includes("spendSourceAwareGumdrops(sourceAwareBalance, unlockCost)"), failures, "unlock spend math changed or bypassed source-aware helper.");
  pushIf(exact.sourceClass === "unlock_reward_spend" && exact.sourceConfidence === "exact", failures, "unlock display source can be unknown for new transaction.");
  pushIf(legacy.sourceClass === "legacy_unknown", failures, "legacy unknown is promoted to exact.");
  pushIf(missing.sourceClass === "unknown_missing_metadata", failures, "recent missing unlock split is not actionable.");
  pushIf(ledger.includes("unlockPurchasedSpendTotal") && ledger.includes("unlockRewardSpendTotal"), failures, "non-creator unlock source totals missing from ledger classification.");
  runValidation("unlock-transaction-source-metadata", { exact, legacy, missing }, failures);
}

export function validateRecentTransactionFeedCleanup() {
  const ui = readText("src/app/admin/debug/components/DebugTabMonitoring.tsx");
  const summary = buildRecentTransactionFeedSummary({
    feedWindowLabel: "latest_19_loaded_transactions",
    nowMs: NOW_MS,
    transactions: [{
      id: "tx1",
      userId: "tlove81-full-uid",
      username: "tlove81",
      type: "unlock_content",
      amount: -1000,
      status: "completed",
      purchasedAmountSpent: 0,
      rewardAmountSpent: 1000,
      timestamp: NOW_MS,
    }],
  });
  const failures: string[] = [];
  pushIf(summary.fullUidDefaultVisible === false, failures, "full UID is visible by default outside drilldown.");
  pushIf(summary.rawProviderPayloadVisible === false, failures, "raw provider/payment payloads can appear.");
  pushIf(summary.boundedFeedWindow.length > 0 && summary.loadedCount === 1, failures, "loaded feed lacks bounded window.");
  pushIf(summary.items[0]?.identityConfidence === "resolved", failures, "identity resolved has no confidence/source.");
  pushIf(ui.includes("data-full-uid-default-visible=\"false\""), failures, "full UID drilldown-only marker missing.");
  pushIf(!ui.includes("Full UID:"), failures, "old default Full UID label remains.");
  runValidation("recent-transaction-feed-cleanup", summary as unknown as Report, failures);
}

export function validateTransactionSequenceJourney() {
  const summary = buildTransactionSequenceJourneySummary({
    transactions: [
      { id: "onboarding", userId: "tlove81-full-uid", type: "onboarding_reward", amount: 100, timestamp: NOW_MS - 120_000 },
      { id: "checkin", userId: "tlove81-full-uid", type: "daily_reward", rewardSource: "check_in", amount: 50, timestamp: NOW_MS - 60_000 },
      { id: "unlock", userId: "tlove81-full-uid", type: "unlock_content", amount: -1000, purchasedAmountSpent: 0, rewardAmountSpent: 1000, timestamp: NOW_MS },
    ],
  });
  const failures: string[] = [];
  pushIf(summary.compactOnly === true, failures, "user journey receives raw transaction firehose.");
  pushIf(summary.rawTransactionFirehoseAllowed === false, failures, "raw transaction firehose is allowed.");
  pushIf(summary.sequences.every((sequence) => sequence.causationClaimAllowed === false), failures, "sequence implies causation without confidence.");
  pushIf(summary.sequences.every((sequence) => !sequence.userIdRedacted.includes("tlove81-full-uid")), failures, "sequence stores raw UID by default.");
  pushIf(summary.sequences.some((sequence) => sequence.sourceClasses.includes("unlock_reward_spend")), failures, "unlock source unknown hidden in sequence.");
  runValidation("transaction-sequence-journey", summary as unknown as Report, failures);
}

export function validateDebugCockpitBatch22CommerceTruth() {
  const report = buildDebugCockpitBatch22CommerceTruthReport();
  const failures = validateDebugCockpitBatch22CommerceTruthReport(report);
  const gumdropReport = readText("agent/state/gumdrop-economy-score.generated.json");
  pushIf(gumdropReport.length > 0, failures, "GumDrop economy report stale or missing.");
  pushIf(report.unknownSourceTransactionsAfter < report.unknownSourceTransactionsBefore, failures, "recent new unlock transaction source remains generic unknown.");
  pushIf(report.paidRewardSeparationStatus === "unchanged", failures, "reward GD became paid GD or paid/reward separation changed.");
  pushIf(report.fullUidDefaultVisibleAfter === false, failures, "full UID visible by default.");
  pushIf(Object.keys(report.scoreDimensions).length > 0, failures, "score dimensions missing.");
  runValidation("debug-cockpit-batch22-commerce-truth", report as unknown as Report, failures);
}
