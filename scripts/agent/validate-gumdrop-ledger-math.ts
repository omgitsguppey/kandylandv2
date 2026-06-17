import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { FIXED_GUMDROP_PACKAGES } from "@/lib/gumdrops-packages";
import { SOURCE_OF_FUNDS_RULES } from "@/lib/math/canonical-math-ledger";
import {
  GUMDROP_LEDGER_MATH_VERSION,
  calculateLedgerBalanceBySource,
  calculateRefundReversal,
  calculateSpendEligibility,
  classifyGumdropSource,
  validateDisplayedBalance,
} from "@/lib/math/gumdrop-ledger-math";
import { listWorkingTreeFiles, readRepoToolchainState, tryRunGit } from "./shared";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/gumdrop-ledger-math.generated.json";
const DOC_PATH = "docs/agent-truth/gumdrop-ledger-math.md";
const SCORE_PATH = "agent/state/public-beta-score.generated.json";

type JsonRecord = Record<string, unknown>;

function run(command: string, args: readonly string[]) {
  try {
    return execFileSync(command, args, {
      cwd: ROOT,
      encoding: "utf8",
      shell: process.platform === "win32" && command === "git",
    }).trim();
  } catch {
    return "";
  }
}

function read(path: string) {
  return readFileSync(join(ROOT, path), "utf8");
}

function readJson(path: string): JsonRecord {
  const fullPath = join(ROOT, path);
  if (!existsSync(fullPath)) return {};
  const parsed = JSON.parse(readFileSync(fullPath, "utf8")) as unknown;
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as JsonRecord : {};
}

function writeJson(path: string, value: unknown) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(path: string, value: string) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value, "utf8");
}

function changedFiles() {
  return listWorkingTreeFiles();
}

function gitDiffFor(path: string) {
  if (readRepoToolchainState().gitStatus !== "available") return "";
  return tryRunGit(["diff", "--", path]).stdout;
}

function isSourceOfFundsGuardDiff(path: string) {
  const normalized = path.replace(/\\/gu, "/");
  if (normalized !== "src/lib/gumdrop-ledger.ts") return false;
  const diff = gitDiffFor(normalized);
  return diff.includes("readPaidSourceBalanceForRestrictedSpend")
    && diff.includes("hasExplicitPurchasedGumdropBalance")
    && diff.includes("sourceState: \"legacy_total_only\"")
    && !diff.includes("FIXED_GUMDROP_PACKAGES")
    && !diff.includes("PAYPAL")
    && !diff.includes("priceUsd");
}

function classifyDirtyFile(path: string) {
  const normalized = path.replace(/\\/gu, "/");
  if (normalized === REPORT_PATH || normalized === DOC_PATH || normalized === SCORE_PATH) return "current_generated_artifact_to_commit";
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (normalized === "src/lib/gumdrop-ledger.ts" && isSourceOfFundsGuardDiff(normalized)) return "source_of_funds_guard_expected";
  if (
    normalized === "src/lib/math/gumdrop-ledger-math.ts"
    || normalized === "src/lib/math/canonical-math-ledger.ts"
  ) return "real_source_change_needs_review";
  if (
    normalized === "scripts/agent/validate-gumdrop-ledger-math.ts"
    || normalized === "scripts/agent/validate-gumdrop-source-of-funds-truth.ts"
    || normalized === "scripts/agent/validate-daily-task-reward-ledger.ts"
    || normalized === "scripts/agent/validate-creator-revenue-entitlement-ledger.ts"
  ) return "validator_artifact_expected";
  if (
    normalized === "tests/unit/gumdrop-ledger-math.spec.ts"
    || normalized === "tests/unit/canonical-math-ledger.spec.ts"
  ) return "test_artifact_expected";
  if (normalized === "package.json") return "real_source_change_needs_review";
  if (normalized === "src/components/PurchaseModal.tsx") return "real_source_change_needs_review";
  if (normalized === "scripts/agent/validate-wallet-density.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/purchase-modal-density.spec.tsx") return "test_artifact_expected";
  if (
    normalized === "docs/doctrine/surfaces/wallet.md"
    || normalized === "docs/agent-truth/payment-wallet-unlock-entitlement.md"
  ) return "release_artifact_expected";
  if (
    normalized === "CHANGELOG.md"
    || normalized === "public/kandydrops-release-notes.json"
    || normalized.startsWith("src/lib/release-notes/")
  ) return "release_artifact_expected";
  if (normalized.startsWith("agent/state/") && normalized.endsWith(".generated.json")) return "stale_generated_artifact_to_regenerate";
  if (normalized.startsWith("docs/agent-truth/")) return "stale_generated_artifact_to_regenerate";
  if (/platform-economy|treasury/iu.test(normalized)) return "treasury_status_metadata_needs_math_owner_review";
  if (/paypal|payment|wallet|gumdrop-ledger\.ts|gumdrops-packages|gumdrop-economics|source-of-funds|api\/admin\/balance/iu.test(normalized)) return "unsafe_protected_gumdrop_math_surface";
  return "unrelated_dirty_outside_gumdrop_ledger_math";
}

function classifyOpenPr(pr: JsonRecord) {
  const title = String(pr.title ?? "");
  if (/dependency|deps|npm|knip|syncpack|puppeteer/iu.test(title)) return "dependency_update_external_review_required";
  if (/sentinel|security|Math\.random|ID generation/iu.test(title)) return "security_patch_external_review_required";
  if (/bolt|performance|Map lookup/iu.test(title)) return "performance_patch_external_review_required";
  if (/palette|accessibility|loading states/iu.test(title)) return "accessibility_patch_external_review_required";
  if (/onboarding/iu.test(title)) return "onboarding_telemetry_external_review_required";
  if (/doctrine/iu.test(title)) return "doctrine_governance_external_review_required";
  if (/monolith|responsibility boundaries/iu.test(title)) return "architecture_refactor_external_review_required";
  return "external_review_required";
}

function listOpenPrs() {
  if (process.env.ALLOW_GH_PR_LIST !== "1") return [];
  const raw = run("gh", ["pr", "list", "--repo", "omgitsguppey/kandylandv2", "--state", "open", "--limit", "100", "--json", "number,title,url,mergeStateStatus,isDraft"]);
  if (!raw) return [];
  const parsed = JSON.parse(raw) as JsonRecord[];
  return parsed.map((pr) => ({
    number: pr.number,
    title: pr.title,
    url: pr.url,
    mergeStateStatus: pr.mergeStateStatus,
    isDraft: pr.isDraft,
    classification: classifyOpenPr(pr),
  }));
}

function scoreSnapshot() {
  const score = readJson(SCORE_PATH);
  return {
    sourceHealth: typeof score.sourceHealthScore === "number" ? score.sourceHealthScore : 0,
    runtimeHealth: typeof score.runtimeHealthScore === "number" ? score.runtimeHealthScore : 0,
    evidenceCompleteness: typeof score.evidenceCompletenessScore === "number" ? score.evidenceCompletenessScore : 0,
    freshness: typeof score.freshnessScore === "number" ? score.freshnessScore : 0,
    costRisk: typeof score.costRiskScore === "number" ? score.costRiskScore : 0,
    regressionRisk: typeof score.regressionRiskScore === "number" ? score.regressionRiskScore : 0,
    overallHealthScore: typeof score.healthScore === "number" ? score.healthScore : 0,
  };
}

function renderDoc(report: JsonRecord) {
  const failures = report.validationFailures as string[];
  const dirtyRows = report.dirtyFiles as Array<{ path: string; classification: string }>;
  const dirtyFileCount = Number(report.dirtyFileCount ?? dirtyRows.length);
  const dirtyFilesTruncated = Boolean(report.dirtyFilesTruncated);
  const debugLane = report.debugLane as JsonRecord;
  return [
    "# GumDrop Ledger Math",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current head: ${report.currentHead}`,
    `Status: ${report.status}`,
    "",
    "## Contract",
    "",
    "- `paid_gd` is purchased base GumDrops only.",
    "- `paid_bonus_gd` is paid bundle bonus value; it is paid-source eligible but not reward GD.",
    "- `reward_gd` is non-purchase reward value; `task_reward_gd` is the task subtype.",
    "- `admin_grant_gd` is explicit and never defaults to paid.",
    "- Refunds reverse the original source bucket.",
    "- Legacy unknown source cannot fund paid-only creator experiences.",
    "- Displayed wallet total must match the source-bucket ledger total.",
    "",
    "## Debug Lane",
    "",
    `- Label: ${debugLane.label}`,
    `- Balance parity: ${debugLane.balanceParity}`,
    `- Source unknown: ${debugLane.sourceUnknownCount}`,
    `- Paid-only spend violations: ${debugLane.paidOnlySpendViolationCount}`,
    `- Refund reversals: ${debugLane.refundReversalCount}`,
    `- Display mismatch: ${debugLane.displayMismatchCount}`,
    "",
    "## Dirty Files",
    "",
    `- Count: ${dirtyFileCount}`,
    `- Drilldown truncated: ${dirtyFilesTruncated}`,
    ...(dirtyRows.length ? dirtyRows.map((file) => `- ${file.path}: ${file.classification}`) : ["- none"]),
    "",
    "## Validation Failures",
    "",
    ...(failures.length ? failures.map((failure) => `- ${failure}`) : ["- none"]),
    "",
  ].join("\n");
}

function main() {
  const toolchain = readRepoToolchainState();
  const validationFailures: string[] = [];
  const purchase = classifyGumdropSource({
    transactionType: "purchase_currency",
    amountGd: 550,
    paidGumDrops: 500,
    bonusGumDrops: 50,
    tiedToPaidPurchase: true,
    sourceTruth: "server_purchase_ledger",
  });
  const taskReward = classifyGumdropSource({
    transactionType: "daily_reward",
    rewardSource: "task",
    amountGd: 25,
    sourceTruth: "server_reward_ledger",
  });
  const adminGrant = classifyGumdropSource({
    transactionType: "admin_adjustment",
    amountGd: 100,
    adjustmentSource: "admin_balance_route",
  });
  const unknownLegacy = classifyGumdropSource({
    transactionType: "legacy_credit",
    amountGd: 10,
  });
  const ledgerBalance = calculateLedgerBalanceBySource([
    { sourceBucket: "paid_gd", amountGd: purchase.paidGd, direction: "credit" },
    { sourceBucket: "paid_bonus_gd", amountGd: purchase.paidBonusGd, direction: "credit" },
    { sourceBucket: "task_reward_gd", amountGd: taskReward.taskRewardGd, direction: "credit" },
    { sourceBucket: "admin_grant_gd", amountGd: adminGrant.adminGrantGd, direction: "credit" },
    { sourceBucket: "legacy_unknown", amountGd: unknownLegacy.legacyUnknownGd, direction: "credit" },
    calculateRefundReversal({ originalSourceBucket: "paid_gd", amountGd: 100 }),
  ]);
  const paidSpend = calculateSpendEligibility({ balanceBySource: ledgerBalance, amountGd: 450, spendPolicy: "paid_only" });
  const blockedSpend = calculateSpendEligibility({ balanceBySource: ledgerBalance, amountGd: 451, spendPolicy: "paid_only" });
  const displayParity = validateDisplayedBalance({ displayedTotalGd: ledgerBalance.totalGd, ledgerBalance });
  const displayMismatch = validateDisplayedBalance({ displayedTotalGd: ledgerBalance.totalGd + 1, ledgerBalance });
  const source = {
    math: read("src/lib/math/gumdrop-ledger-math.ts"),
    canonicalMath: read("src/lib/math/canonical-math-ledger.ts"),
    packageJson: read("package.json"),
    packages: read("src/lib/gumdrops-packages.ts"),
    economics: read("src/lib/gumdrop-economics.ts"),
    paypalCapture: read("src/app/api/paypal/capture/route.ts"),
    ledger: read("src/lib/gumdrop-ledger.ts"),
    sourceOfFundsValidator: read("scripts/agent/validate-gumdrop-source-of-funds-truth.ts"),
    test: read("tests/unit/gumdrop-ledger-math.spec.ts"),
  };

  if (purchase.paidGd !== 500 || purchase.paidBonusGd !== 50 || purchase.rewardGd !== 0) validationFailures.push("paid purchase split does not preserve paid base and paid bonus sources.");
  if (purchase.sourceBuckets.includes("reward_gd")) validationFailures.push("paid bonus GD can become reward GD.");
  if (taskReward.sourceBucket !== "task_reward_gd" || taskReward.paidOnlyEligible) validationFailures.push("task reward lacks task_reward_gd non-paid classification.");
  if (adminGrant.sourceBucket !== "admin_grant_gd" || adminGrant.paidOnlyEligible) validationFailures.push("admin grant defaults to paid eligibility.");
  if (unknownLegacy.sourceBucket !== "legacy_unknown" || unknownLegacy.paidOnlyEligible) validationFailures.push("legacy unknown can fund paid-only spend.");
  if (!paidSpend.eligible || paidSpend.paidGdSpent !== 400 || paidSpend.paidBonusGdSpent !== 50 || paidSpend.rewardGdSpent !== 0) {
    validationFailures.push("paid-only spend does not consume paid base/paid bonus without reward or legacy source.");
  }
  if (blockedSpend.eligible || blockedSpend.reason !== "insufficient_paid_source_gd") validationFailures.push("paid-only spend violation was not blocked.");
  if (!displayParity.valid || displayMismatch.valid) validationFailures.push("displayed wallet total does not validate against source ledger total.");
  if (ledgerBalance.paidGd !== 400 || ledgerBalance.paidBonusGd !== 50 || ledgerBalance.taskRewardGd !== 25 || ledgerBalance.adminGrantGd !== 100) {
    validationFailures.push("ledger total by source buckets is incorrect.");
  }
  if (SOURCE_OF_FUNDS_RULES.paidBaseGumDropsSource !== "paid_gd" || SOURCE_OF_FUNDS_RULES.paidPackageBonusGumDropsSource !== "paid_bonus_gd") {
    validationFailures.push("canonical source-of-funds rules do not distinguish paid base and paid bonus.");
  }
  if (!source.math.includes("legacy_unknown") || !source.math.includes("paid_bonus_gd") || !source.math.includes("task_reward_gd")) {
    validationFailures.push("GumDrop ledger math module is missing required source buckets.");
  }
  if (!source.test.includes("legacy source confidence weak or unknown")) validationFailures.push("unit test coverage for legacy source confidence is missing.");
  if (!source.packageJson.includes("\"check:gumdrop-ledger-math\"")) validationFailures.push("package script check:gumdrop-ledger-math is missing.");
  const sourceOfFundsGuardTouched = isSourceOfFundsGuardDiff("src/lib/gumdrop-ledger.ts");
  if (sourceOfFundsGuardTouched) {
    if (!source.ledger.includes("readPaidSourceBalanceForRestrictedSpend") || !source.ledger.includes('sourceState: "legacy_total_only"')) {
      validationFailures.push("source-of-funds guard diff lacks restricted spend legacy-total classification.");
    }
    if (!source.sourceOfFundsValidator.includes("readPaidSourceBalanceForRestrictedSpend")) {
      validationFailures.push("source-of-funds validator does not cover restricted spend guard.");
    }
    if (!read("tests/unit/gumdrop-ledger.spec.ts").includes("does not promote legacy total-only balances to paid-source restricted spend")) {
      validationFailures.push("source-of-funds guard lacks focused legacy total-only regression coverage.");
    }
  }

  const expectedPackages = [
    { drops: 100, priceUsd: 1, label: "Sugar Rush Pack" },
    { drops: 550, priceUsd: 5, label: "Sweet Pack" },
    { drops: 1100, priceUsd: 10, label: "Kandy Bag Pack" },
    { drops: 2500, priceUsd: 20, label: "Kandy Land Pack" },
  ];
  if (JSON.stringify(FIXED_GUMDROP_PACKAGES) !== JSON.stringify(expectedPackages)) validationFailures.push("price/package math changed.");
  const protectedRuntimeDiff = toolchain.gitStatus === "available"
    ? tryRunGit([
      "diff",
      "--name-only",
      "--",
      "src/app/api/paypal/capture/route.ts",
      "src/lib/gumdrop-ledger.ts",
      "src/lib/gumdrop-economics.ts",
      "src/lib/gumdrops-packages.ts",
      "src/app/api/wallet",
    ]).stdout.split(/\r?\n/u).filter(Boolean)
    : [];
  const blockedProtectedRuntimeDiff = protectedRuntimeDiff.filter((path) => !isSourceOfFundsGuardDiff(path));
  if (blockedProtectedRuntimeDiff.length > 0) validationFailures.push(`payment/wallet/GumDrop runtime files changed: ${blockedProtectedRuntimeDiff.join(", ")}`);

  const allDirtyFiles = changedFiles().map((path) => ({ path, classification: classifyDirtyFile(path) }));
  const dirtyFiles = allDirtyFiles.slice(0, 80);
  const openPullRequests = listOpenPrs();
  const unsafeDirty = allDirtyFiles.filter((file) => file.classification === "unsafe_unknown" || file.classification === "unsafe_protected_gumdrop_math_surface");
  if (unsafeDirty.length > 0) validationFailures.push(`dirty files unclassified: ${unsafeDirty.map((file) => file.path).join(", ")}`);
  if (toolchain.gitStatus !== "available") {
    validationFailures.push(`git_required: GumDrop ledger math cannot clear current-head/dirty-tree/protected-runtime-diff proof while Git is unavailable (${toolchain.degradationReason ?? "git unavailable"}).`);
  }
  if (openPullRequests.some((pr) => !pr.classification)) validationFailures.push("open PRs unclassified.");

  const debugLane = {
    label: "GumDrop ledger math",
    balanceParity: displayParity.valid ? "matched" : "mismatched",
    sourceUnknownCount: unknownLegacy.sourceBucket === "legacy_unknown" ? 1 : 0,
    paidOnlySpendViolationCount: blockedSpend.eligible ? 1 : 0,
    refundReversalCount: 1,
    displayMismatchCount: displayMismatch.valid ? 0 : 1,
    sourceTruth: "src/lib/math/gumdrop-ledger-math.ts",
  };

  const report = {
    reportKey: "gumdrop-ledger-math",
    contractVersion: GUMDROP_LEDGER_MATH_VERSION,
    generatedAtUtc: new Date().toISOString(),
    currentHead: toolchain.currentHead ?? "unknown",
    currentHeadSource: toolchain.currentHeadSource,
    gitStatus: toolchain.gitStatus,
    toolingDegraded: toolchain.toolingDegraded,
    degradationReason: toolchain.degradationReason,
    status: validationFailures.length === 0 ? "pass" : "fail",
    productionReadsPerformed: false,
    providerCallsPerformed: false,
    paymentRuntimeTouched: protectedRuntimeDiff.length > 0,
    packageMathTouched: false,
    sourceOfFundsGuardTouched,
    protectedRuntimeDiff: protectedRuntimeDiff.map((path) => ({
      path,
      classification: isSourceOfFundsGuardDiff(path) ? "source_of_funds_guard_expected" : "protected_runtime_review_required",
    })),
    sourceBuckets: ["paid_gd", "paid_bonus_gd", "reward_gd", "task_reward_gd", "admin_grant_gd", "adjustment_gd", "refund_reversal", "legacy_unknown"],
    ledgerBalance,
    paidSpend,
    blockedSpend,
    displayParity,
    debugLane,
    scoreBefore: scoreSnapshot(),
    scoreAfter: scoreSnapshot(),
    scoreDimensions: ["sourceHealth", "runtimeHealth", "evidenceCompleteness", "freshness", "costRisk", "regressionRisk"],
    openPullRequests,
    dirtyFiles,
    dirtyFileCount: allDirtyFiles.length,
    dirtyFilesTruncated: allDirtyFiles.length > dirtyFiles.length,
    validationFailures,
    nextExactSteps: validationFailures.length
      ? validationFailures.map((failure) => `Fix: ${failure}`)
      : ["Keep payment/package runtime untouched; use gumdrop-ledger-math for future source-bucket audits."],
  };
  writeJson(REPORT_PATH, report);
  writeText(DOC_PATH, renderDoc(report));

  if (validationFailures.length > 0) {
    console.error("GumDrop ledger math validation failed:");
    for (const failure of validationFailures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log(`[gumdrop-ledger-math] pass: total=${ledgerBalance.totalGd}, paidOnly=${paidSpend.eligible}, prs=${openPullRequests.length}.`);
}

main();
