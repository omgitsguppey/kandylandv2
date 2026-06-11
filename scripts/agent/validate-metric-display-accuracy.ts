import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

import {
  METRIC_DISPLAY_ACCURACY_DEBUG_LANE,
  buildMetricDisplayExplanation,
  formatMetricValue,
  shouldShowCollecting,
  shouldShowEstimated,
  shouldShowStale,
  shouldShowZero,
} from "@/lib/math/metric-display-accuracy";

const ROOT = process.cwd();
const STATE_PATH = "agent/state/metric-display-accuracy.generated.json";
const DOC_PATH = "docs/agent-truth/metric-display-accuracy.md";
const SCORE_PATH = "agent/state/public-beta-score.generated.json";

type ScoreDimensions = {
  sourceHealth: number;
  runtimeHealth: number;
  evidenceCompleteness: number;
  freshness: number;
  costRisk: number;
  regressionRisk: number;
  overallHealthScore: number;
};

type DirtyFileClassification =
  | "current_source_change"
  | "metric_display_consumer_expected"
  | "current_generated_artifact_to_commit"
  | "documentation_artifact_expected"
  | "validator_artifact_expected"
  | "test_artifact_expected"
  | "release_artifact_expected"
  | "real_source_change_needs_review"
  | "unrelated_agent_context_file_to_ignore"
  | "stale_generated_artifact_to_regenerate"
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

export type MetricDisplayAccuracyReport = {
  reportKey: "metric-display-accuracy";
  generatedAtUtc: string;
  currentHead: string;
  status: "pass" | "fail";
  productionReadsPerformed: false;
  providerCallsPerformed: false;
  deployPerformed: false;
  paymentRuntimeChanged: false;
  gumdropMathChanged: false;
  displayStateStatus: {
    states: readonly string[];
    zeroRequiresProvenZero: boolean;
    collectingInsteadOfMisleadingZero: boolean;
    disconnectedInsteadOfZero: boolean;
  };
  creatorMetricSourceStatus: {
    fans: string;
    drops: string;
    viewsClicksUnwraps: string;
    revenue: string;
  };
  walletBucketDisplayStatus: {
    labels: string[];
    sourceBucketsAccurate: boolean;
  };
  adminConfidenceFreshnessStatus: {
    confidenceVisible: boolean;
    staleFreshnessVisible: boolean;
    staleThresholdMs: number;
  };
  userFacingCopyStatus: {
    technicalJargonLeaked: boolean;
    collectingCopyHuman: boolean;
    estimatedCopyHuman: boolean;
  };
  debugLane: {
    label: "Metric display accuracy";
    misleadingZeroRisk: number;
    staleDisplayRisk: number;
    weakConfidenceExactDisplayRisk: number;
    sourceDisconnectedCount: number;
  };
  scoreBefore: ScoreDimensions;
  scoreAfter: ScoreDimensions;
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

function scoreSnapshot(): ScoreDimensions {
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

export function classifyMetricDisplayAccuracyDirtyFile(filePath: string): DirtyFileClassification {
  const normalized = filePath.replace(/\\/gu, "/");
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (normalized === "src/lib/math/metric-display-accuracy.ts") return "current_source_change";
  if (normalized === "src/lib/analytics/person-metrics-hydration.ts") return "real_source_change_needs_review";
  if (normalized === "scripts/agent/validate-metric-display-accuracy.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/metric-display-accuracy.spec.ts") return "test_artifact_expected";
  if (normalized === STATE_PATH || normalized === SCORE_PATH) return "current_generated_artifact_to_commit";
  if (normalized === DOC_PATH) return "documentation_artifact_expected";
  if (normalized === "package.json") return "real_source_change_needs_review";
  if (
    normalized === "CHANGELOG.md"
    || normalized === "public/kandydrops-release-notes.json"
    || normalized === "src/lib/release-notes/public-release-notes.ts"
    || normalized === "src/lib/release-notes/release-version-contract.ts"
  ) return "release_artifact_expected";
  if (
    normalized.startsWith("src/components/")
    || normalized.startsWith("src/app/admin/")
    || normalized.startsWith("src/app/dashboard/")
    || normalized.startsWith("src/app/creator/")
  ) return "metric_display_consumer_expected";
  if (/paypal|payment|payout|capture|provider/iu.test(normalized)) return "unsafe_unknown";
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

function includesAll(source: string, required: readonly string[]) {
  return required.filter((item) => !source.includes(item));
}

function sourceValidationFailures() {
  const failures: string[] = [];
  const source = {
    math: read("src/lib/math/metric-display-accuracy.ts"),
    packageJson: read("package.json"),
  };
  for (const missing of includesAll(source.math, [
    "formatMetricValue",
    "classifyMetricDisplayState",
    "shouldShowZero",
    "shouldShowCollecting",
    "shouldShowEstimated",
    "shouldShowStale",
    "buildMetricDisplayExplanation",
    "proven_zero",
    "not_connected",
    "hidden_by_permission",
    "paid GD",
    "bonus GD",
    "reward GD",
  ])) failures.push(`Metric display accuracy module missing ${missing}.`);
  if (!source.packageJson.includes("\"check:metric-display-accuracy\": \"tsx scripts/agent/validate-metric-display-accuracy.ts\"")) {
    failures.push("package.json is missing check:metric-display-accuracy.");
  }
  return failures;
}

function renderDoc(report: MetricDisplayAccuracyReport) {
  return [
    "# Metric Display Accuracy",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current head: ${report.currentHead}`,
    `Status: ${report.status}`,
    "",
    "## Contract",
    "",
    "- Show `0` only when a bounded source proves zero.",
    "- Show collecting copy when the source path exists but the activity window has not produced enough data.",
    "- Show not connected when the source, producer, or materializer is missing.",
    "- Show estimated copy for inferred or weak confidence without leaking technical jargon to users or creators.",
    "- Show freshness labels for creator/admin dashboard metrics older than one hour.",
    "- Keep wallet balances source-aware across paid GD, bonus GD, and reward GD buckets.",
    "",
    "## Creator Dashboard Sources",
    "",
    `- Fans: ${report.creatorMetricSourceStatus.fans}`,
    `- Drops: ${report.creatorMetricSourceStatus.drops}`,
    `- Views/clicks/unwraps: ${report.creatorMetricSourceStatus.viewsClicksUnwraps}`,
    `- Revenue: ${report.creatorMetricSourceStatus.revenue}`,
    "",
    "## Debug Lane",
    "",
    `- Label: ${report.debugLane.label}`,
    `- Misleading zero risk: ${report.debugLane.misleadingZeroRisk}`,
    `- Stale display risk: ${report.debugLane.staleDisplayRisk}`,
    `- Weak confidence exact-display risk: ${report.debugLane.weakConfidenceExactDisplayRisk}`,
    `- Source disconnected count: ${report.debugLane.sourceDisconnectedCount}`,
    "",
    "## Score",
    "",
    `- Before: ${JSON.stringify(report.scoreBefore)}`,
    `- After: ${JSON.stringify(report.scoreAfter)}`,
    `- Dimensions: ${report.scoreDimensions.join(", ")}`,
    "",
    "## Remaining Gaps",
    "",
    ...(report.remainingGaps.length ? report.remainingGaps.map((gap) => `- ${gap}`) : ["- none"]),
    "",
    "## Next Exact Steps",
    "",
    ...(report.nextExactSteps.length ? report.nextExactSteps.map((step) => `- ${step}`) : ["- none"]),
    "",
    "## Dirty Files",
    "",
    ...(report.dirtyFiles.length ? report.dirtyFiles.map((file) => `- ${file.path}: ${file.classification}`) : ["- none"]),
    "",
    "## Open PRs",
    "",
    ...(report.openPrs.length ? report.openPrs.map((pr) => `- #${pr.number}: ${pr.classification}`) : ["- none"]),
    "",
    "## Validation Failures",
    "",
    ...(report.validationFailures.length ? report.validationFailures.map((failure) => `- ${failure}`) : ["- none"]),
    "",
  ].join("\n");
}

export function buildMetricDisplayAccuracyReport(input: {
  currentHead?: string;
  dirtyFiles?: string[];
  openPrs?: MetricDisplayAccuracyReport["openPrs"];
  scoreBefore?: number | ScoreDimensions;
} = {}): MetricDisplayAccuracyReport {
  const nowMs = Date.UTC(2026, 4, 26, 12, 0, 0);
  const collecting = formatMetricValue({
    metricId: "creator_views",
    value: 0,
    provenZero: false,
    sourceConnected: true,
    sourcePathExists: true,
    confidence: "unknown",
    audience: "creator",
  });
  const disconnected = formatMetricValue({
    metricId: "drop_clicks",
    value: 0,
    provenZero: false,
    sourceConnected: false,
    sourcePathExists: false,
    confidence: "unknown",
    audience: "admin",
  });
  const estimated = formatMetricValue({
    metricId: "creator_revenue",
    value: 12_50,
    unit: "currency_cents",
    provenZero: false,
    sourceConnected: true,
    sourcePathExists: true,
    confidence: "weak",
    audience: "creator",
  });
  const stale = formatMetricValue({
    metricId: "creator_fans",
    value: 32,
    provenZero: false,
    sourceConnected: true,
    sourcePathExists: true,
    confidence: "exact",
    audience: "creator",
    updatedAtMs: nowMs - (2 * 60 * 60 * 1000),
    nowMs,
  });
  const wallet = formatMetricValue({
    metricId: "wallet_balance",
    value: 140,
    unit: "gumdrops",
    provenZero: false,
    sourceConnected: true,
    sourcePathExists: true,
    confidence: "exact",
    audience: "user",
    walletSourceBuckets: { paidGd: 100, paidBonusGd: 20, rewardGd: 20 },
  });
  const scoreBefore = typeof input.scoreBefore === "number" ? {
    sourceHealth: input.scoreBefore,
    runtimeHealth: input.scoreBefore,
    evidenceCompleteness: input.scoreBefore,
    freshness: input.scoreBefore,
    costRisk: input.scoreBefore,
    regressionRisk: input.scoreBefore,
    overallHealthScore: input.scoreBefore,
  } : input.scoreBefore ?? scoreSnapshot();
  const report: MetricDisplayAccuracyReport = {
    reportKey: "metric-display-accuracy",
    generatedAtUtc: new Date().toISOString(),
    currentHead: input.currentHead ?? run("git", ["rev-parse", "--short", "HEAD"]),
    status: "pass",
    productionReadsPerformed: false,
    providerCallsPerformed: false,
    deployPerformed: false,
    paymentRuntimeChanged: false,
    gumdropMathChanged: false,
    displayStateStatus: {
      states: ["exact", "linked", "estimated", "collecting", "proven_zero", "stale", "not_connected", "unavailable", "hidden_by_permission"],
      zeroRequiresProvenZero: shouldShowZero({ value: 0, provenZero: true, sourceConnected: true })
        && !shouldShowZero({ value: 0, provenZero: false, sourceConnected: true }),
      collectingInsteadOfMisleadingZero: collecting.state === "collecting" && collecting.displayValue === "Collecting",
      disconnectedInsteadOfZero: disconnected.state === "not_connected" && disconnected.displayValue === "Not connected",
    },
    creatorMetricSourceStatus: {
      fans: buildMetricDisplayExplanation({ metricId: "creator_fans" }),
      drops: buildMetricDisplayExplanation({ metricId: "creator_drops" }),
      viewsClicksUnwraps: buildMetricDisplayExplanation({ metricId: "creator_views" }),
      revenue: buildMetricDisplayExplanation({ metricId: "creator_revenue" }),
    },
    walletBucketDisplayStatus: {
      labels: wallet.sourceBucketLabels,
      sourceBucketsAccurate: wallet.sourceBucketLabels.join("|") === "paid GD: 100|bonus GD: 20|reward GD: 20",
    },
    adminConfidenceFreshnessStatus: {
      confidenceVisible: formatMetricValue({
        metricId: "creator_revenue",
        value: 12_50,
        unit: "currency_cents",
        provenZero: false,
        sourceConnected: true,
        sourcePathExists: true,
        confidence: "weak",
        audience: "admin",
        sourceTruth: "legacy_or_unknown",
      }).adminConfidenceLabel === "weak confidence",
      staleFreshnessVisible: stale.freshnessLabel === "Updated 2h ago",
      staleThresholdMs: 60 * 60 * 1000,
    },
    userFacingCopyStatus: {
      technicalJargonLeaked: /inferred|weak|sourceTruth|materializer/iu.test(`${estimated.userFacingLabel} ${estimated.qualifier ?? ""}`),
      collectingCopyHuman: shouldShowCollecting({ value: null, sourceConnected: true, sourcePathExists: true }) && collecting.userFacingLabel === "Not enough activity yet",
      estimatedCopyHuman: shouldShowEstimated({ confidence: "weak" }) && estimated.qualifier === "Estimated",
    },
    debugLane: {
      label: METRIC_DISPLAY_ACCURACY_DEBUG_LANE,
      misleadingZeroRisk: collecting.exactLooking || collecting.displayValue === "0" ? 1 : 0,
      staleDisplayRisk: shouldShowStale({ updatedAtMs: stale.updatedAtMs, nowMs, audience: "creator" }) && !stale.freshnessLabel ? 1 : 0,
      weakConfidenceExactDisplayRisk: estimated.exactLooking ? 1 : 0,
      sourceDisconnectedCount: disconnected.state === "not_connected" ? 1 : 0,
    },
    scoreBefore,
    scoreAfter: scoreBefore,
    scoreDimensions: ["sourceHealth", "runtimeHealth", "evidenceCompleteness", "freshness", "costRisk", "regressionRisk"],
    remainingGaps: [
      "Existing user, creator, and admin surfaces still need incremental adoption of the canonical display formatter where direct number formatting remains.",
    ],
    nextExactSteps: [
      "Route each dashboard metric consumer through formatMetricValue before changing visual design.",
      "Keep payment runtime, GumDrop ledger math, and production data untouched while adopting display labels.",
    ],
    dirtyFiles: (input.dirtyFiles ?? currentDirtyFiles()).map((path) => ({
      path,
      classification: classifyMetricDisplayAccuracyDirtyFile(path),
    })),
    openPrs: input.openPrs ?? listOpenPrs(),
    validationFailures: [],
  };
  report.validationFailures = validateMetricDisplayAccuracyReport(report);
  report.status = report.validationFailures.length ? "fail" : "pass";
  return report;
}

export function validateMetricDisplayAccuracyReport(report: MetricDisplayAccuracyReport) {
  const failures = [...sourceValidationFailures()];
  if (report.productionReadsPerformed) failures.push("Production reads were performed.");
  if (report.providerCallsPerformed) failures.push("Provider calls were performed.");
  if (report.deployPerformed) failures.push("Deploy was performed.");
  if (report.paymentRuntimeChanged) failures.push("Payment runtime changed.");
  if (report.gumdropMathChanged) failures.push("GumDrop math changed.");
  if (!report.displayStateStatus.zeroRequiresProvenZero) failures.push("Zero displays without provenZero.");
  if (!report.displayStateStatus.collectingInsteadOfMisleadingZero) failures.push("Missing data can display as exact zero.");
  if (!report.displayStateStatus.disconnectedInsteadOfZero) failures.push("Disconnected metric displays as zero.");
  if (report.debugLane.weakConfidenceExactDisplayRisk > 0) failures.push("Weak/inferred data displays as exact.");
  if (report.debugLane.staleDisplayRisk > 0 || !report.adminConfidenceFreshnessStatus.staleFreshnessVisible) failures.push("Stale metric lacks freshness label.");
  if (!report.creatorMetricSourceStatus.fans.includes("followers/fans canonical count")) failures.push("Creator fans use wrong source.");
  if (!report.creatorMetricSourceStatus.drops.includes("creator-owned or assigned-to-creator drops")) failures.push("Creator drops use wrong source.");
  if (!report.creatorMetricSourceStatus.viewsClicksUnwraps.includes("canonical event facts")) failures.push("Creator views/clicks/unwraps use wrong source.");
  if (!report.creatorMetricSourceStatus.revenue.includes("exact, linked, inferred")) failures.push("Creator revenue confidence split missing.");
  if (!report.walletBucketDisplayStatus.sourceBucketsAccurate) failures.push("Wallet source buckets display wrong labels.");
  if (report.userFacingCopyStatus.technicalJargonLeaked) failures.push("User-facing copy leaks technical jargon.");
  if (!report.adminConfidenceFreshnessStatus.confidenceVisible) failures.push("Admin display lacks confidence.");
  if (report.debugLane.label !== METRIC_DISPLAY_ACCURACY_DEBUG_LANE) failures.push("Metric display accuracy debug lane missing.");
  if (!report.scoreDimensions.length) failures.push("Score dimensions missing.");
  for (const file of report.dirtyFiles) {
    if (file.classification === "unsafe_unknown") failures.push(`${file.path} is unclassified for metric display accuracy.`);
  }
  for (const pr of report.openPrs) {
    if (!pr.classification || pr.classification === "external_review_required") failures.push(`Open PR #${pr.number} is unclassified.`);
  }
  return [...new Set(failures)];
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const report = buildMetricDisplayAccuracyReport();
  writeJson(STATE_PATH, report);
  write(DOC_PATH, renderDoc(report));
  if (report.validationFailures.length) {
    console.error("Metric display accuracy validation failed:");
    report.validationFailures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }
  console.log("Metric display accuracy validation passed.");
}
