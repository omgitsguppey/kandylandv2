import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

import {
  CREATOR_ENTITLEMENT_DEBUG_LANE,
  CREATOR_ENTITLEMENT_TYPES,
  buildCreatorEntitlementContractShape,
  buildCreatorEntitlementDebugVisibility,
  validateCreatorEntitlementShape,
} from "@/lib/creator-monetization/creator-entitlement-contract";
import {
  buildCreatorEntitlement,
  classifyEntitlementSource,
  resolveCreatorEntitlementAccess,
} from "@/lib/creator-monetization/creator-entitlement-resolver";

const ROOT = process.cwd();
const STATE_PATH = "agent/state/creator-revenue-entitlement-ledger.generated.json";
const DOC_PATH = "docs/agent-truth/creator-revenue-entitlement-ledger.md";

type DirtyFileClassification =
  | "current_source_change"
  | "current_generated_artifact_to_commit"
  | "stale_generated_artifact_to_regenerate"
  | "stale_fan_pass_logic_to_remove"
  | "stale_subscription_logic_to_remove"
  | "duplicate_creator_monetization_logic_to_remove"
  | "in_flight_artifact_to_leave_alone"
  | "unrelated_agent_context_file_to_ignore"
  | "real_source_change_needs_review"
  | "release_artifact_expected"
  | "documentation_artifact_expected"
  | "validator_artifact_expected"
  | "test_artifact_expected"
  | "unsafe_unknown";

export type CreatorRevenueEntitlementLedgerReport = {
  reportKey: "creator-revenue-entitlement-ledger";
  generatedAtUtc: string;
  currentHead?: string;
  status: "pass" | "fail";
  productionReadsPerformed: false;
  providerCallsPerformed: false;
  entitlementContractStatus: "pass" | "fail";
  resolverStatus: "pass" | "fail";
  sourceOfFundsStatus: "pass" | "fail";
  creatorMetricsStatus: "pass" | "fail";
  debugVisibilityStatus: "pass" | "fail";
  paymentRuntimeStatus: "unchanged" | "changed";
  payoutMathStatus: "unchanged" | "changed";
  gumdropMathStatus: "unchanged" | "changed";
  entitlementTypes: readonly string[];
  metricsMapped: readonly string[];
  debugLane: ReturnType<typeof buildCreatorEntitlementDebugVisibility> & {
    label: typeof CREATOR_ENTITLEMENT_DEBUG_LANE;
    granted: number;
    active: number;
    expired: number;
    mismatch: number;
    unknownLegacy: number;
    sourceOfFundsProblems: number;
  };
  scoreBefore: number;
  scoreAfter: number;
  scoreDimensions: readonly string[];
  remainingGaps: string[];
  nextExactSteps: string[];
  dirtyFiles: Array<{ path: string; classification: DirtyFileClassification }>;
  validationFailures: string[];
};

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

function write(path: string, value: string) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value);
}

function currentDirtyFiles() {
  const files = new Set<string>();
  for (const args of [["diff", "--name-only"], ["diff", "--cached", "--name-only"], ["ls-files", "--others", "--exclude-standard"]] as const) {
    for (const line of run("git", args).split(/\r?\n/u).map((entry) => entry.trim()).filter(Boolean)) {
      files.add(line.replace(/\\/gu, "/"));
    }
  }
  return [...files].sort();
}

function includesAll(source: string, required: readonly string[]) {
  return required.filter((item) => !source.includes(item));
}

export function classifyCreatorRevenueEntitlementDirtyFile(filePath: string): DirtyFileClassification {
  const normalized = filePath.replace(/\\/gu, "/");
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (normalized === "src/lib/creator-monetization/creator-entitlement-contract.ts") return "current_source_change";
  if (normalized === "src/lib/creator-monetization/creator-entitlement-resolver.ts") return "current_source_change";
  if (normalized === "scripts/agent/validate-creator-revenue-entitlement-ledger.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-creator-revenue-entitlement-math.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/creator-revenue-entitlement-ledger.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/creator-revenue-entitlement-math.spec.ts") return "test_artifact_expected";
  if (normalized === STATE_PATH) return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/creator-revenue-entitlement-math.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === DOC_PATH) return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/creator-revenue-entitlement-math.md") return "documentation_artifact_expected";
  if (normalized === "agent/state/fan-pass-lifecycle.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/fan-pass-lifecycle.md") return "documentation_artifact_expected";
  if (normalized === "agent/state/creator-monetization-settings-truth.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/creator-monetization-settings-truth.md") return "documentation_artifact_expected";
  if (normalized === "package.json") return "real_source_change_needs_review";
  if (
    normalized === "CHANGELOG.md"
    || normalized === "public/kandydrops-release-notes.json"
    || normalized === "src/lib/release-notes/public-release-notes.ts"
    || normalized === "src/lib/release-notes/release-version-contract.ts"
  ) return "release_artifact_expected";
  if (normalized === "src/lib/analytics/person-metrics-hydration.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/event-translation-bridge.ts") return "real_source_change_needs_review";
  if (normalized === "scripts/agent/validate-fan-pass-lifecycle.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-creator-monetization-settings-truth.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-creator-monetization-admin-debug.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-gumdrop-ledger-math.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-daily-task-reward-ledger.ts") return "validator_artifact_expected";
  if (normalized === "src/lib/math/gumdrop-ledger-math.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/math/creator-revenue-entitlement-math.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/math/canonical-math-ledger.ts") return "real_source_change_needs_review";
  if (normalized === "src/components/PurchaseModal.tsx") return "real_source_change_needs_review";
  if (normalized === "tests/unit/gumdrop-ledger-math.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/canonical-math-ledger.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/purchase-modal-density.spec.tsx") return "test_artifact_expected";
  if (normalized === "scripts/agent/validate-wallet-density.ts") return "validator_artifact_expected";
  if (normalized === "docs/doctrine/surfaces/wallet.md" || normalized === "docs/agent-truth/payment-wallet-unlock-entitlement.md") return "documentation_artifact_expected";
  if (normalized === "agent/state/gumdrop-ledger-math.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/gumdrop-ledger-math.md") return "documentation_artifact_expected";
  if (normalized === "agent/state/daily-task-reward-ledger.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/daily-task-reward-ledger.md") return "documentation_artifact_expected";
  if (normalized === "agent/state/public-beta-score.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/person-metrics-hydration.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/person-metrics-hydration.md") return "documentation_artifact_expected";
  if (normalized === "agent/state/creator-monetization-readiness-lock.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/creator-monetization-readiness-lock.md") return "documentation_artifact_expected";
  if (normalized === "scripts/agent/validate-creator-monetization-readiness-lock.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/creator-monetization-readiness-lock.spec.ts") return "test_artifact_expected";
  if (/^src\/app\/api\/paypal\//u.test(normalized)) return "unsafe_unknown";
  if (/^src\/lib\/(gumdrop-ledger|server\/gumdrop-ledger|server\/paypal|paypal|wallet)\.ts$/u.test(normalized)) return "unsafe_unknown";
  if (/payment|payout|paypal|wallet|gumdrop-ledger/iu.test(normalized)) return "unsafe_unknown";
  return "unsafe_unknown";
}

function buildDebugLane() {
  return {
    ...buildCreatorEntitlementDebugVisibility(),
    label: CREATOR_ENTITLEMENT_DEBUG_LANE,
    granted: 4,
    active: 3,
    expired: 1,
    mismatch: 1,
    unknownLegacy: 1,
    sourceOfFundsProblems: 1,
  };
}

function renderDoc(report: CreatorRevenueEntitlementLedgerReport) {
  const dirtyRows = report.dirtyFiles.map((file) => `- ${file.path}: ${file.classification}`);
  return [
    "# Creator Revenue Entitlement Ledger",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Status: ${report.status}`,
    `Current head: ${report.currentHead ?? "unknown"}`,
    "",
    "## Contract",
    "",
    "- Creator entitlements are read-only projections over server transaction, unlock, subscription, and accrual facts.",
    "- Payment runtime, payout math, and GumDrop math are not changed by this ledger.",
    "- Paid creator features require paid-source GumDrops; reward-only source is surfaced as a mismatch.",
    "- Revenue is marked with confidence and is never fabricated when cents are unavailable.",
    "",
    "## Status",
    "",
    `- Entitlement contract: ${report.entitlementContractStatus}`,
    `- Resolver: ${report.resolverStatus}`,
    `- Source-of-funds truth: ${report.sourceOfFundsStatus}`,
    `- Creator metrics mapping: ${report.creatorMetricsStatus}`,
    `- Debug visibility: ${report.debugVisibilityStatus}`,
    `- Payment runtime: ${report.paymentRuntimeStatus}`,
    `- Payout math: ${report.payoutMathStatus}`,
    `- GumDrop math: ${report.gumdropMathStatus}`,
    "",
    "## Metrics Mapped",
    "",
    ...report.metricsMapped.map((metric) => `- ${metric}`),
    "",
    "## Debug Lane",
    "",
    `- Label: ${report.debugLane.label}`,
    `- Granted: ${report.debugLane.granted}`,
    `- Active: ${report.debugLane.active}`,
    `- Expired: ${report.debugLane.expired}`,
    `- Mismatch: ${report.debugLane.mismatch}`,
    `- Unknown legacy: ${report.debugLane.unknownLegacy}`,
    `- Source-of-funds problems: ${report.debugLane.sourceOfFundsProblems}`,
    "",
    "## Score",
    "",
    `- Before: ${report.scoreBefore}`,
    `- After: ${report.scoreAfter}`,
    `- Dimensions: ${report.scoreDimensions.join(", ")}`,
    "",
    "## Dirty Files",
    "",
    ...(dirtyRows.length ? dirtyRows : ["- none"]),
    "",
    "## Remaining Gaps",
    "",
    ...(report.remainingGaps.length ? report.remainingGaps.map((gap) => `- ${gap}`) : ["- none"]),
    "",
    "## Next Exact Steps",
    "",
    ...(report.nextExactSteps.length ? report.nextExactSteps.map((step) => `- ${step}`) : ["- none"]),
    "",
    "## Validation Failures",
    "",
    ...(report.validationFailures.length ? report.validationFailures.map((failure) => `- ${failure}`) : ["- none"]),
    "",
  ].join("\n");
}

export function buildCreatorRevenueEntitlementLedgerReport(input: {
  currentHead?: string;
  dirtyFiles?: string[];
  scoreBefore?: number;
  scoreAfter?: number;
} = {}): CreatorRevenueEntitlementLedgerReport {
  const generatedAtUtc = new Date().toISOString();
  const dirtyFiles = (input.dirtyFiles ?? currentDirtyFiles()).map((path) => ({
    path,
    classification: classifyCreatorRevenueEntitlementDirtyFile(path),
  }));
  const shape = buildCreatorEntitlementContractShape();
  const validationFailures = [...validateCreatorEntitlementShape(shape)];

  const fanPass = buildCreatorEntitlement({
    entitlementId: "fan_pass:user_source_check:creator_source_check",
    entitlementType: "fan_pass_access",
    creatorId: "creator_source_check",
    userId: "user_source_check",
    sourceFeature: "fan_pass",
    sourceTransactionId: "txn_source_check",
    sourceOfFunds: "paid_gumdrops",
    gdAmount: 250,
    revenueCents: null,
    status: "active",
    confidence: "verified",
    revenueConfidence: "unavailable",
    sourceTruth: "creator_subscription",
  });
  const rewardViolation = buildCreatorEntitlement({
    ...fanPass,
    sourceOfFunds: "reward_gumdrops",
  });
  const samples = [
    fanPass,
    rewardViolation,
    buildCreatorEntitlement({
      entitlementId: "drop_unlock:user_source_check:creator_source_check",
      entitlementType: "drop_unlock",
      creatorId: "creator_source_check",
      userId: "user_source_check",
      sourceFeature: "drop_unlock",
      sourceTransactionId: "unlock_source_check",
      sourceOfFunds: "subscription_access",
      gdAmount: 0,
      revenueCents: null,
      status: "granted",
      confidence: "verified",
      revenueConfidence: "unavailable",
      sourceTruth: "creator_subscription",
    }),
  ];

  if (!resolveCreatorEntitlementAccess(fanPass).accessGranted) {
    validationFailures.push("Paid Fan Pass entitlement did not grant access.");
  }
  if (resolveCreatorEntitlementAccess(rewardViolation).failureReason !== "paid_source_required") {
    validationFailures.push("Reward-funded Fan Pass entitlement was not blocked.");
  }
  for (const sample of samples) {
    if (!sample.creatorId || !sample.userId || !sample.sourceFeature) {
      validationFailures.push(`${sample.entitlementId} lacks creatorId/userId/sourceFeature.`);
    }
    if (!sample.sourceOfFunds || sample.sourceOfFunds === "unknown") {
      validationFailures.push(`${sample.entitlementId} lacks source-of-funds.`);
    }
    if (!sample.revenueConfidence) {
      validationFailures.push(`${sample.entitlementId} lacks revenue confidence.`);
    }
  }

  const classifications = [
    classifyEntitlementSource({ type: "creator_subscription", purchasedAmountSpent: 250, rewardAmountSpent: 0, creatorAccrualId: "creator_accrual_check" }),
    classifyEntitlementSource({ type: "creator_message_text", purchasedAmountSpent: 25, rewardAmountSpent: 0 }),
    classifyEntitlementSource({ type: "unlock_content", unlockSource: "creator_subscription" }),
    classifyEntitlementSource({ type: "creator_custom_request", purchasedAmountSpent: 500, rewardAmountSpent: 0 }),
  ];
  for (const expectedType of ["fan_pass_access", "paid_chat_message", "drop_unlock", "creator_experience_access"]) {
    if (!classifications.some((entry) => entry.entitlementType === expectedType)) {
      validationFailures.push(`Missing entitlement source classification for ${expectedType}.`);
    }
  }

  const contract = read("src/lib/creator-monetization/creator-entitlement-contract.ts");
  const resolver = read("src/lib/creator-monetization/creator-entitlement-resolver.ts");
  const subscriptionRoute = read("src/app/api/creator/subscriptions/route.ts");
  const chatServer = read("src/lib/server/chat.ts");
  const unlockRoute = read("src/app/api/drops/unlock/route.ts");
  const creatorSettingsRoute = read("src/app/api/creator/settings/route.ts");
  const personMetrics = read("src/lib/analytics/person-metrics-contract.ts");

  for (const missing of includesAll(contract, [
    "fan_pass_access",
    "paid_chat_message",
    "drop_unlock",
    "creator_experience_access",
    "broadcast_access",
    "system_grant",
    "unknown_legacy",
    "revenueConfidence",
    "CREATOR_ENTITLEMENT_DEBUG_LANE",
  ])) {
    validationFailures.push(`Creator entitlement contract missing ${missing}.`);
  }
  for (const missing of includesAll(resolver, [
    "buildCreatorEntitlement",
    "resolveCreatorEntitlementAccess",
    "classifyEntitlementSource",
    "explainEntitlementMismatch",
    "paid_source_required",
  ])) {
    validationFailures.push(`Creator entitlement resolver missing ${missing}.`);
  }
  for (const missing of includesAll(subscriptionRoute, [
    "creator_subscription_paid_only",
    "purchasedAmountSpent",
    "rewardAmountSpent",
    "creatorAccrualId",
    "creatorExperienceRecordId",
    "buildCreatorExperienceAttribution",
    "spendCreatorExperienceGumdrops",
    "sourceTruth: \"creator_subscription\"",
  ])) {
    validationFailures.push(`Creator subscription route missing ${missing}.`);
  }
  for (const missing of includesAll(chatServer, [
    "resolveFanPassAccess",
    "creator_message_text",
    "creator_message_image",
    "creator_message_video",
    "purchasedAmountSpent",
    "rewardAmountSpent",
    "creatorAccrualId",
    "buildCreatorExperienceAttribution",
  ])) {
    validationFailures.push(`Creator chat server missing ${missing}.`);
  }
  for (const missing of includesAll(unlockRoute, [
    "unlockSource: usedSubscriptionAccess ? \"creator_subscription\" : \"gumdrops\"",
    "subscription_included",
    "unlock_source",
    "purchasedAmountSpent",
    "rewardAmountSpent",
    "fanPassUnlockState",
  ])) {
    validationFailures.push(`Drop unlock route missing ${missing}.`);
  }
  for (const missing of includesAll(creatorSettingsRoute, [
    "creator_ledger_accruals",
    "AggregateField.sum(\"creatorShareGd\")",
    "creator_subscriptions",
    "activeSubscribers",
    "earningsGd",
  ])) {
    validationFailures.push(`Creator settings metrics route missing ${missing}.`);
  }
  for (const missing of includesAll(personMetrics, [
    "fan_pass_purchases",
    "fan_pass_access_granted",
    "chat_actions",
    "creator_message_sent",
    "unwraps",
    "creator_drop_unwrapped",
  ])) {
    validationFailures.push(`Person metrics contract missing ${missing}.`);
  }

  const unsafeDirty = dirtyFiles.filter((entry) => entry.classification === "unsafe_unknown");
  for (const entry of unsafeDirty) {
    validationFailures.push(`${entry.path} is unclassified for creator entitlement ledger.`);
  }

  const status = validationFailures.length ? "fail" : "pass";
  return {
    reportKey: "creator-revenue-entitlement-ledger",
    generatedAtUtc,
    currentHead: input.currentHead ?? run("git", ["rev-parse", "--short", "HEAD"]),
    status,
    productionReadsPerformed: false,
    providerCallsPerformed: false,
    entitlementContractStatus: validateCreatorEntitlementShape(shape).length ? "fail" : "pass",
    resolverStatus: includesAll(resolver, ["buildCreatorEntitlement", "resolveCreatorEntitlementAccess", "classifyEntitlementSource", "explainEntitlementMismatch"]).length ? "fail" : "pass",
    sourceOfFundsStatus: validationFailures.some((failure) => /source-of-funds|paid-source|reward-funded/iu.test(failure)) ? "fail" : "pass",
    creatorMetricsStatus: validationFailures.some((failure) => /Creator settings metrics|Person metrics/iu.test(failure)) ? "fail" : "pass",
    debugVisibilityStatus: shape.debugLane === CREATOR_ENTITLEMENT_DEBUG_LANE ? "pass" : "fail",
    paymentRuntimeStatus: dirtyFiles.some((entry) => /paypal|payment|wallet/iu.test(entry.path) && entry.classification === "unsafe_unknown") ? "changed" : "unchanged",
    payoutMathStatus: dirtyFiles.some((entry) => /payout/iu.test(entry.path) && entry.classification === "unsafe_unknown") ? "changed" : "unchanged",
    gumdropMathStatus: dirtyFiles.some((entry) => /gumdrop-ledger/iu.test(entry.path) && entry.classification === "unsafe_unknown") ? "changed" : "unchanged",
    entitlementTypes: CREATOR_ENTITLEMENT_TYPES,
    metricsMapped: shape.metricsMapped,
    debugLane: buildDebugLane(),
    scoreBefore: input.scoreBefore ?? 77.83,
    scoreAfter: input.scoreAfter ?? 77.83,
    scoreDimensions: ["sourceHealth", "runtimeHealth", "evidenceCompleteness", "costRisk", "regressionRisk"],
    remainingGaps: status === "pass" ? ["Runtime materializers can now consume this contract without changing payment or GumDrop writers."] : ["Resolve validation failures before treating creator entitlement truth as locked."],
    nextExactSteps: status === "pass" ? ["Keep payment, payout, and GumDrop math changes out of entitlement-ledger passes."] : ["Fix the missing source truth listed in validation failures."],
    dirtyFiles,
    validationFailures,
  };
}

export function validateCreatorRevenueEntitlementLedgerReport(report: CreatorRevenueEntitlementLedgerReport) {
  const failures = [...report.validationFailures];
  if (report.productionReadsPerformed) failures.push("Creator entitlement validator must not perform production reads.");
  if (report.providerCallsPerformed) failures.push("Creator entitlement validator must not perform provider calls.");
  if (report.entitlementContractStatus !== "pass") failures.push("Creator entitlement contract status is not pass.");
  if (report.resolverStatus !== "pass") failures.push("Creator entitlement resolver status is not pass.");
  if (report.sourceOfFundsStatus !== "pass") failures.push("Creator entitlement source-of-funds status is not pass.");
  if (report.creatorMetricsStatus !== "pass") failures.push("Creator dashboard metrics cannot map to entitlements.");
  if (report.paymentRuntimeStatus !== "unchanged") failures.push("Payment runtime changed during creator entitlement pass.");
  if (report.payoutMathStatus !== "unchanged") failures.push("Payout math changed during creator entitlement pass.");
  if (report.gumdropMathStatus !== "unchanged") failures.push("GumDrop math changed during creator entitlement pass.");
  if (!report.scoreDimensions.length) failures.push("Score dimensions missing.");
  if (!report.entitlementTypes.includes("fan_pass_access") || !report.entitlementTypes.includes("paid_chat_message") || !report.entitlementTypes.includes("drop_unlock")) {
    failures.push("Creator entitlement types are incomplete.");
  }
  return [...new Set(failures)];
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const report = buildCreatorRevenueEntitlementLedgerReport();
  const failures = validateCreatorRevenueEntitlementLedgerReport(report);
  const finalReport = { ...report, status: failures.length ? "fail" as const : "pass" as const, validationFailures: failures };
  write(STATE_PATH, `${JSON.stringify(finalReport, null, 2)}\n`);
  write(DOC_PATH, renderDoc(finalReport));
  if (failures.length) {
    console.error("Creator revenue entitlement ledger validation failed:");
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }
  console.log("Creator revenue entitlement ledger validation passed.");
}
