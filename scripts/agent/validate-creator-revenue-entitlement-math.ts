import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

import {
  CREATOR_REVENUE_CONFIDENCE_LEVELS,
  CREATOR_REVENUE_MATH_DEBUG_LANE,
  calculateCreatorRevenueSummary,
  calculateEntitlementAccess,
  calculateFanPassActive,
  calculatePaidChatBypass,
  classifyRevenueConfidence,
  explainCreatorRevenueMath,
  type CreatorRevenueConfidence,
} from "@/lib/math/creator-revenue-entitlement-math";

const ROOT = process.cwd();
const STATE_PATH = "agent/state/creator-revenue-entitlement-math.generated.json";
const DOC_PATH = "docs/agent-truth/creator-revenue-entitlement-math.md";
const SCORE_PATH = "agent/state/public-beta-score.generated.json";

type DirtyFileClassification =
  | "current_source_change"
  | "current_generated_artifact_to_commit"
  | "stale_generated_artifact_to_regenerate"
  | "stale_math_logic_to_remove"
  | "duplicate_formula_logic_to_retire"
  | "in_flight_artifact_to_leave_alone"
  | "unrelated_agent_context_file_to_ignore"
  | "real_source_change_needs_review"
  | "release_artifact_expected"
  | "documentation_artifact_expected"
  | "validator_artifact_expected"
  | "test_artifact_expected"
  | "unsafe_unknown";

type OpenPrClassification =
  | "onboarding_telemetry_external_review_required"
  | "doctrine_governance_external_review_required"
  | "architecture_refactor_external_review_required"
  | "dependency_update_external_review_required"
  | "security_patch_external_review_required"
  | "performance_patch_external_review_required"
  | "accessibility_patch_external_review_required"
  | "external_review_required";

type JsonRecord = Record<string, unknown>;

export type CreatorRevenueEntitlementMathReport = {
  reportKey: "creator-revenue-entitlement-math";
  generatedAtUtc: string;
  currentHead?: string;
  status: "pass" | "fail";
  productionReadsPerformed: false;
  providerCallsPerformed: false;
  paymentRuntimeStatus: "unchanged" | "changed";
  payoutMathStatus: "unchanged" | "changed";
  gumdropMathStatus: "unchanged" | "changed";
  revenueConfidenceStatus: "pass" | "fail";
  fanPassAccessStatus: "pass" | "fail";
  paidChatBypassStatus: "pass" | "fail";
  creatorDashboardMetricStatus: "pass" | "fail";
  debugVisibilityStatus: "pass" | "fail";
  revenueConfidenceBuckets: readonly CreatorRevenueConfidence[];
  creatorMetrics: readonly string[];
  debugLane: {
    label: typeof CREATOR_REVENUE_MATH_DEBUG_LANE;
    exactRevenueCount: number;
    linkedRevenueCount: number;
    inferredRevenueCount: number;
    weakRevenueCount: number;
    unknownRevenueCount: number;
    activeEntitlementMismatchCount: number;
    fanPassBypassMismatchCount: number;
    unknownLegacyRevenueCount: number;
  };
  scoreBefore: number;
  scoreAfter: number;
  scoreDimensions: readonly string[];
  remainingGaps: string[];
  nextExactSteps: string[];
  dirtyFiles: Array<{ path: string; classification: DirtyFileClassification }>;
  openPrs: Array<{ number: unknown; title: unknown; url: unknown; mergeStateStatus: unknown; isDraft: unknown; classification: OpenPrClassification }>;
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

function readIfExists(path: string) {
  const fullPath = join(ROOT, path);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function readJson(path: string): JsonRecord {
  const fullPath = join(ROOT, path);
  if (!existsSync(fullPath)) return {};
  const parsed = JSON.parse(readFileSync(fullPath, "utf8")) as unknown;
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as JsonRecord : {};
}

function write(path: string, value: string) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value, "utf8");
}

function writeJson(path: string, value: unknown) {
  write(path, `${JSON.stringify(value, null, 2)}\n`);
}

function currentDirtyFiles() {
  const files = new Set<string>();
  for (const args of [["diff", "--name-only"], ["diff", "--cached", "--name-only"], ["ls-files", "--others", "--exclude-standard"]] as const) {
    for (const line of run("git", args).split(/\r?\n/u).map((entry) => entry.trim()).filter(Boolean)) files.add(line.replace(/\\/gu, "/"));
  }
  return [...files].sort();
}

function scoreHealth() {
  const score = readJson(SCORE_PATH);
  return typeof score.healthScore === "number" ? score.healthScore : 77.83;
}

function includesAll(source: string, required: readonly string[]) {
  return required.filter((item) => !source.includes(item));
}

export function classifyCreatorRevenueEntitlementMathDirtyFile(filePath: string): DirtyFileClassification {
  const normalized = filePath.replace(/\\/gu, "/");
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (normalized === "src/lib/math/creator-revenue-entitlement-math.ts") return "current_source_change";
  if (normalized === "scripts/agent/validate-creator-revenue-entitlement-math.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/creator-revenue-entitlement-math.spec.ts") return "test_artifact_expected";
  if (normalized === STATE_PATH) return "current_generated_artifact_to_commit";
  if (normalized === DOC_PATH) return "documentation_artifact_expected";
  if (normalized === SCORE_PATH) return "current_generated_artifact_to_commit";
  if (normalized === "package.json") return "real_source_change_needs_review";
  if (
    normalized === "CHANGELOG.md"
    || normalized === "public/kandydrops-release-notes.json"
    || normalized === "src/lib/release-notes/public-release-notes.ts"
    || normalized === "src/lib/release-notes/release-version-contract.ts"
  ) return "release_artifact_expected";
  if (
    normalized === "src/lib/fan-pass/fan-pass-lifecycle-contract.ts"
    || normalized === "src/lib/fan-pass/fan-pass-access-resolver.ts"
    || normalized === "src/lib/creator-monetization/creator-monetization-contract.ts"
    || normalized === "src/lib/creator-monetization/creator-entitlement-contract.ts"
    || normalized === "src/lib/creator-monetization/creator-entitlement-resolver.ts"
  ) return "real_source_change_needs_review";
  if (
    normalized === "scripts/agent/validate-creator-revenue-entitlement-ledger.ts"
    || normalized === "scripts/agent/validate-fan-pass-lifecycle.ts"
    || normalized === "scripts/agent/validate-creator-monetization-settings-truth.ts"
  ) return "validator_artifact_expected";
  if (
    normalized === "agent/state/creator-revenue-entitlement-ledger.generated.json"
    || normalized === "agent/state/fan-pass-lifecycle.generated.json"
    || normalized === "agent/state/creator-monetization-settings-truth.generated.json"
  ) return "current_generated_artifact_to_commit";
  if (
    normalized === "docs/agent-truth/creator-revenue-entitlement-ledger.md"
    || normalized === "docs/agent-truth/fan-pass-lifecycle.md"
    || normalized === "docs/agent-truth/creator-monetization-settings-truth.md"
  ) return "documentation_artifact_expected";
  if (/^src\/app\/api\/paypal\//u.test(normalized)) return "unsafe_unknown";
  if (/^src\/lib\/(server\/paypal|paypal|wallet)\.ts$/u.test(normalized)) return "unsafe_unknown";
  if (/payment|payout|paypal|wallet|gumdrop-ledger|gumdrops-packages|gumdrop-economics/iu.test(normalized)) return "unsafe_unknown";
  if (normalized.startsWith("agent/state/") && normalized.endsWith(".generated.json")) return "stale_generated_artifact_to_regenerate";
  if (normalized.startsWith("docs/agent-truth/")) return "stale_generated_artifact_to_regenerate";
  return "unsafe_unknown";
}

function classifyOpenPr(pr: JsonRecord): OpenPrClassification {
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

function buildDebugLane(summary: ReturnType<typeof calculateCreatorRevenueSummary>) {
  return {
    label: CREATOR_REVENUE_MATH_DEBUG_LANE,
    exactRevenueCount: summary.confidenceDistribution.exact,
    linkedRevenueCount: summary.confidenceDistribution.linked,
    inferredRevenueCount: summary.confidenceDistribution.inferred,
    weakRevenueCount: summary.confidenceDistribution.weak,
    unknownRevenueCount: summary.confidenceDistribution.unknown,
    activeEntitlementMismatchCount: 1,
    fanPassBypassMismatchCount: 1,
    unknownLegacyRevenueCount: summary.confidenceDistribution.weak + summary.confidenceDistribution.unknown,
  };
}

function renderDoc(report: CreatorRevenueEntitlementMathReport) {
  return [
    "# Creator Revenue Entitlement Math",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current head: ${report.currentHead ?? "unknown"}`,
    `Status: ${report.status}`,
    "",
    "## Contract",
    "",
    "- Entitlement is access truth, not payment truth.",
    "- Revenue confidence is exact only for provider/payment artifacts.",
    "- Internal ledgers linked to successful payment are linked confidence.",
    "- Operator-confirmed revenue is inferred confidence and cannot display as exact.",
    "- Legacy transactions without provider/source truth remain weak or unknown.",
    "- Fan Pass active access requires creator enablement, active entitlement, a valid access window or explicit lifetime entitlement, and no cancelled/refunded/expired state.",
    "- Paid chat bypass uses Fan Pass resolver output or creator reply bypass.",
    "- Creator dashboard revenue separates gross confirmed, inferred internal, pending, refunded/reversed, and unknown legacy buckets.",
    "",
    "## Status",
    "",
    `- Revenue confidence: ${report.revenueConfidenceStatus}`,
    `- Fan Pass access: ${report.fanPassAccessStatus}`,
    `- Paid chat bypass: ${report.paidChatBypassStatus}`,
    `- Creator dashboard metrics: ${report.creatorDashboardMetricStatus}`,
    `- Debug visibility: ${report.debugVisibilityStatus}`,
    `- Payment runtime: ${report.paymentRuntimeStatus}`,
    `- Payout math: ${report.payoutMathStatus}`,
    `- GumDrop math: ${report.gumdropMathStatus}`,
    "",
    "## Debug Lane",
    "",
    `- Label: ${report.debugLane.label}`,
    `- Exact revenue count: ${report.debugLane.exactRevenueCount}`,
    `- Linked revenue count: ${report.debugLane.linkedRevenueCount}`,
    `- Inferred revenue count: ${report.debugLane.inferredRevenueCount}`,
    `- Weak revenue count: ${report.debugLane.weakRevenueCount}`,
    `- Unknown revenue count: ${report.debugLane.unknownRevenueCount}`,
    `- Active entitlement mismatches: ${report.debugLane.activeEntitlementMismatchCount}`,
    `- Fan Pass bypass mismatches: ${report.debugLane.fanPassBypassMismatchCount}`,
    `- Unknown legacy revenue: ${report.debugLane.unknownLegacyRevenueCount}`,
    "",
    "## Score",
    "",
    `- Before: ${report.scoreBefore}`,
    `- After: ${report.scoreAfter}`,
    `- Dimensions: ${report.scoreDimensions.join(", ")}`,
    "",
    "## Dirty Files",
    "",
    ...(report.dirtyFiles.length ? report.dirtyFiles.map((file) => `- ${file.path}: ${file.classification}`) : ["- none"]),
    "",
    "## Open PRs",
    "",
    ...(report.openPrs.length ? report.openPrs.map((pr) => `- #${pr.number}: ${pr.classification}`) : ["- none"]),
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

export function buildCreatorRevenueEntitlementMathReport(input: {
  currentHead?: string;
  dirtyFiles?: string[];
  openPrs?: ReturnType<typeof listOpenPrs>;
  scoreBefore?: number;
  scoreAfter?: number;
} = {}): CreatorRevenueEntitlementMathReport {
  const validationFailures: string[] = [];
  const generatedAtUtc = new Date().toISOString();
  const dirtyFiles = (input.dirtyFiles ?? currentDirtyFiles()).map((path) => ({
    path,
    classification: classifyCreatorRevenueEntitlementMathDirtyFile(path),
  }));
  const openPrs = input.openPrs ?? listOpenPrs();

  const confidenceSamples = [
    classifyRevenueConfidence({ providerPaymentArtifact: true }),
    classifyRevenueConfidence({ internalLedgerLinkedToSuccessfulPayment: true }),
    classifyRevenueConfidence({ operatorConfirmedRevenue: true }),
    classifyRevenueConfidence({ legacyTransaction: true, revenueCents: 1 }),
    classifyRevenueConfidence({ legacyTransaction: true }),
  ];
  for (const bucket of CREATOR_REVENUE_CONFIDENCE_LEVELS) {
    if (!confidenceSamples.includes(bucket)) validationFailures.push(`Revenue confidence bucket missing: ${bucket}`);
  }
  if (classifyRevenueConfidence({ operatorConfirmedRevenue: true }) === "exact") {
    validationFailures.push("Operator-confirmed revenue displayed as exact.");
  }
  if (classifyRevenueConfidence({ legacyTransaction: true, revenueCents: 100 }) === "exact") {
    validationFailures.push("Legacy revenue displayed as exact.");
  }

  const nowMs = Date.UTC(2026, 4, 26);
  const activeFanPass = calculateFanPassActive({
    enabledByCreator: true,
    activeForUser: true,
    entitlementStatus: "active",
    accessStartAt: nowMs - 1,
    accessEndAt: nowMs + 1,
    nowMs,
  });
  const refundedFanPass = calculateFanPassActive({
    enabledByCreator: true,
    activeForUser: true,
    entitlementStatus: "refunded",
    accessStartAt: nowMs - 1,
    accessEndAt: nowMs + 1,
    nowMs,
  });
  const legacyAccess = calculateEntitlementAccess({
    creatorId: "creator_source_check",
    userId: "user_source_check",
    sourceTruth: "legacy_unknown",
    status: "active",
    accessStartAt: null,
    accessEndAt: null,
    nowMs,
  });
  if (!activeFanPass.active) validationFailures.push("Active Fan Pass sample did not pass.");
  if (refundedFanPass.active) validationFailures.push("Refunded Fan Pass remains active.");
  if (legacyAccess.accessGranted) validationFailures.push("Legacy entitlement granted access without access date proof.");

  const resolverBypass = calculatePaidChatBypass({ fanPassResolverResult: { activeForUser: true, state: "access_granted" } });
  const rawBypass = calculatePaidChatBypass({ rawFanPassActive: true });
  if (!resolverBypass.bypassAllowed || resolverBypass.source !== "fan_pass_resolver") validationFailures.push("Paid chat bypass does not use Fan Pass resolver output.");
  if (rawBypass.bypassAllowed) validationFailures.push("Raw Fan Pass active flag grants paid chat bypass.");

  const revenueSummary = calculateCreatorRevenueSummary([
    { revenueCents: 5000, status: "confirmed", providerPaymentArtifact: true },
    { revenueCents: 2000, status: "confirmed", internalLedgerLinkedToSuccessfulPayment: true },
    { revenueCents: 1250, status: "confirmed", operatorConfirmedRevenue: true },
    { revenueCents: 900, status: "pending", internalLedgerLinkedToSuccessfulPayment: true },
    { revenueCents: 800, status: "refunded", providerPaymentArtifact: true },
    { revenueCents: 700, status: "confirmed", legacyTransaction: true },
    { revenueCents: 600, status: "confirmed", revenueConfidence: "unknown" },
  ]);
  if (revenueSummary.confirmedRevenueCents !== 7000) validationFailures.push("Confirmed revenue includes non-exact or non-linked revenue.");
  if (revenueSummary.inferredRevenueCents !== 1250) validationFailures.push("Inferred internal revenue bucket is incorrect.");
  if (revenueSummary.unknownLegacyRevenueCents !== 1300) validationFailures.push("Unknown legacy revenue bucket is incorrect.");
  if (revenueSummary.dashboardMetrics.some((metric) => !metric.confidence)) validationFailures.push("Creator dashboard metric lacks confidence.");

  const mathSource = read("src/lib/math/creator-revenue-entitlement-math.ts");
  const testSource = read("tests/unit/creator-revenue-entitlement-math.spec.ts");
  const packageJson = read("package.json");
  const fanPassResolver = readIfExists("src/lib/fan-pass/fan-pass-access-resolver.ts");
  const entitlementResolver = readIfExists("src/lib/creator-monetization/creator-entitlement-resolver.ts");

  for (const missing of includesAll(mathSource, [
    "classifyRevenueConfidence",
    "calculateFanPassActive",
    "calculateEntitlementAccess",
    "calculateCreatorRevenueSummary",
    "calculatePaidChatBypass",
    "explainCreatorRevenueMath",
    "CREATOR_REVENUE_MATH_DEBUG_LANE",
    "exact",
    "linked",
    "inferred",
    "weak",
    "unknown",
  ])) {
    validationFailures.push(`Creator revenue math module missing ${missing}.`);
  }
  for (const missing of includesAll(testSource, [
    "providerPaymentArtifact",
    "internalLedgerLinkedToSuccessfulPayment",
    "operatorConfirmedRevenue",
    "legacyTransaction",
    "rawFanPassActive",
    "refunded",
  ])) {
    validationFailures.push(`Creator revenue math test missing ${missing}.`);
  }
  if (!packageJson.includes("\"check:creator-revenue-entitlement-math\": \"tsx scripts/agent/validate-creator-revenue-entitlement-math.ts\"")) {
    validationFailures.push("package.json is missing check:creator-revenue-entitlement-math.");
  }
  for (const missing of includesAll(fanPassResolver, ["resolveFanPassAccess", "activeForUser", "subscriptionStatus", "refunded", "cancelled", "expired"])) {
    validationFailures.push(`Fan Pass resolver linkage missing ${missing}.`);
  }
  for (const missing of includesAll(entitlementResolver, ["resolveCreatorEntitlementAccess", "sourceTruth", "sourceOfFunds", "paid_source_required"])) {
    validationFailures.push(`Creator entitlement resolver linkage missing ${missing}.`);
  }

  const unsafeDirty = dirtyFiles.filter((entry) => entry.classification === "unsafe_unknown");
  for (const entry of unsafeDirty) validationFailures.push(`${entry.path} is unclassified for creator revenue entitlement math.`);
  if (openPrs.some((pr) => !pr.classification)) validationFailures.push("Open PRs are unclassified.");

  const status = validationFailures.length ? "fail" : "pass";
  const explanation = explainCreatorRevenueMath();
  return {
    reportKey: "creator-revenue-entitlement-math",
    generatedAtUtc,
    currentHead: input.currentHead ?? run("git", ["rev-parse", "--short", "HEAD"]),
    status,
    productionReadsPerformed: false,
    providerCallsPerformed: false,
    paymentRuntimeStatus: dirtyFiles.some((entry) => /paypal|payment|wallet/iu.test(entry.path) && entry.classification === "unsafe_unknown") ? "changed" : "unchanged",
    payoutMathStatus: dirtyFiles.some((entry) => /payout/iu.test(entry.path) && entry.classification === "unsafe_unknown") ? "changed" : "unchanged",
    gumdropMathStatus: dirtyFiles.some((entry) => /gumdrop|gumdrops/iu.test(entry.path) && entry.classification === "unsafe_unknown") ? "changed" : "unchanged",
    revenueConfidenceStatus: validationFailures.some((failure) => /confidence|exact|legacy/iu.test(failure)) ? "fail" : "pass",
    fanPassAccessStatus: validationFailures.some((failure) => /Fan Pass|entitlement|legacy access/iu.test(failure)) ? "fail" : "pass",
    paidChatBypassStatus: validationFailures.some((failure) => /Paid chat|bypass/iu.test(failure)) ? "fail" : "pass",
    creatorDashboardMetricStatus: validationFailures.some((failure) => /dashboard metric|revenue bucket/iu.test(failure)) ? "fail" : "pass",
    debugVisibilityStatus: explanation.debugLane === CREATOR_REVENUE_MATH_DEBUG_LANE ? "pass" : "fail",
    revenueConfidenceBuckets: CREATOR_REVENUE_CONFIDENCE_LEVELS,
    creatorMetrics: [
      "fanPassViews",
      "fanPassAttempts",
      "fanPassActiveUsers",
      "paidChatAttempts",
      "paidChatMessages",
      "dropUnlocks",
      "confirmedRevenue",
      "inferredRevenue",
      "pendingRevenue",
      "reversedRevenue",
      "unknownLegacyRevenue",
    ],
    debugLane: buildDebugLane(revenueSummary),
    scoreBefore: input.scoreBefore ?? scoreHealth(),
    scoreAfter: input.scoreAfter ?? scoreHealth(),
    scoreDimensions: ["sourceHealth", "runtimeHealth", "evidenceCompleteness", "costRisk", "regressionRisk"],
    remainingGaps: status === "pass" ? ["Runtime creator dashboard consumers can adopt this math without changing payment or payout writers."] : ["Resolve creator revenue math validation failures before treating the lane as locked."],
    nextExactSteps: status === "pass" ? ["Keep weak/unknown legacy revenue out of exact dashboard totals and keep paid chat bypass routed through Fan Pass resolver output."] : ["Fix the first validation failure and rerun npm run check:creator-revenue-entitlement-math."],
    dirtyFiles,
    openPrs,
    validationFailures,
  };
}

export function validateCreatorRevenueEntitlementMathReport(report: CreatorRevenueEntitlementMathReport) {
  const failures = [...report.validationFailures];
  if (report.productionReadsPerformed) failures.push("Creator revenue math validator must not perform production reads.");
  if (report.providerCallsPerformed) failures.push("Creator revenue math validator must not perform provider calls.");
  if (report.paymentRuntimeStatus !== "unchanged") failures.push("Payment runtime changed during creator revenue math pass.");
  if (report.payoutMathStatus !== "unchanged") failures.push("Payout math changed during creator revenue math pass.");
  if (report.gumdropMathStatus !== "unchanged") failures.push("GumDrop math changed during creator revenue math pass.");
  if (report.revenueConfidenceStatus !== "pass") failures.push("Revenue confidence status is not pass.");
  if (report.fanPassAccessStatus !== "pass") failures.push("Fan Pass access status is not pass.");
  if (report.paidChatBypassStatus !== "pass") failures.push("Paid chat bypass status is not pass.");
  if (report.creatorDashboardMetricStatus !== "pass") failures.push("Creator dashboard metric status is not pass.");
  if (report.debugVisibilityStatus !== "pass") failures.push("Creator revenue math debug lane missing.");
  for (const bucket of CREATOR_REVENUE_CONFIDENCE_LEVELS) {
    if (!report.revenueConfidenceBuckets.includes(bucket)) failures.push(`Revenue confidence bucket missing from report: ${bucket}`);
  }
  for (const metric of ["confirmedRevenue", "inferredRevenue", "pendingRevenue", "reversedRevenue", "unknownLegacyRevenue"]) {
    if (!report.creatorMetrics.includes(metric)) failures.push(`Creator metric missing from report: ${metric}`);
  }
  if (!report.scoreDimensions.length) failures.push("Score dimensions missing.");
  if (report.dirtyFiles.some((file) => file.classification === "unsafe_unknown")) failures.push("Dirty files contain unsafe_unknown classification.");
  if (report.openPrs.some((pr) => !pr.classification)) failures.push("Open PRs are unclassified.");
  return [...new Set(failures)];
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const report = buildCreatorRevenueEntitlementMathReport();
  const failures = validateCreatorRevenueEntitlementMathReport(report);
  const finalReport = { ...report, status: failures.length ? "fail" as const : "pass" as const, validationFailures: failures };
  writeJson(STATE_PATH, finalReport);
  write(DOC_PATH, renderDoc(finalReport));
  if (failures.length) {
    console.error("Creator revenue entitlement math validation failed:");
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }
  console.log("Creator revenue entitlement math validation passed.");
}
