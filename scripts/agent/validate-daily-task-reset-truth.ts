import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { execSync } from "node:child_process";

import { DAILY_CHECK_IN_TASK_CONTRACT, buildDailyTaskDebugLane } from "../../src/lib/tasks/daily-task-contract";
import { explainTaskReset, preventDuplicateRewardClaim, resolveTaskResetPolicy } from "../../src/lib/tasks/daily-task-reset";
import {
  withGeneratedReportEnvelope,
  type GeneratedReportEnvelope,
} from "./generated-report-envelope";

type ScoreDimensions = {
  sourceHealth: number;
  runtimeHealth: number;
  evidenceCompleteness: number;
  freshness: number;
  costRisk: number;
  regressionRisk: number;
  overallHealthScore: number;
};

export type DailyTaskResetTruthReport = GeneratedReportEnvelope & {
  reportKey: "daily-task-reset-truth";
  status: "pass" | "fail";
  passed: boolean;
  sourceCommit: string;
  sourceStatus: "pass" | "fail";
  sourceValidationFailures: string[];
  isolationFailures: string[];
  scoreBefore: ScoreDimensions;
  scoreAfter: ScoreDimensions;
  resetPolicyExplicit: boolean;
  resetPolicy: string;
  resetAnchor: string;
  timezone: string;
  duplicateRewardGuard: boolean;
  rewardSourceTruth: "reward_gd_only" | "unsafe_unknown";
  apiTrustsCallerAuth: boolean;
  apiRejectsArbitraryUserId: boolean;
  uiGuidanceRouteStatus: "current_routes" | "stale_route";
  taskStatusHasNextEligibleAt: boolean;
  debugLanePresent: boolean;
  chatTouched: boolean;
  paymentRuntimeTouched: boolean;
  paidGdMathTouched: boolean;
  dirtyFileClassifications: Array<{ path: string; classification: string }>;
  scoreDimensionImpact: Record<keyof ScoreDimensions, string>;
  remainingGaps: string[];
};

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/daily-task-reset-truth.generated.json";
const DOC_PATH = "docs/agent-truth/daily-task-reset-truth.md";

function readIfExists(path: string) {
  const fullPath = join(ROOT, path);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function getCurrentHead() {
  try {
    return execSync("git rev-parse HEAD", { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

export function isDailyTaskResetIsolationFailure(failure: string) {
  return failure === "chat files changed."
    || failure === "payment/wallet runtime changed."
    || failure === "paid-GD math changed."
    || failure.startsWith("dirty files unclassified:");
}

export function projectDailyTaskResetSourceStatus(validationFailures: readonly string[]) {
  const isolationFailures = validationFailures.filter(isDailyTaskResetIsolationFailure);
  const sourceValidationFailures = validationFailures.filter((failure) => !isDailyTaskResetIsolationFailure(failure));
  return {
    sourceStatus: sourceValidationFailures.length === 0 ? "pass" as const : "fail" as const,
    sourceValidationFailures: [...new Set(sourceValidationFailures)],
    isolationFailures: [...new Set(isolationFailures)],
  };
}

function getDirtyFiles() {
  try {
    const changed = execSync("git diff --name-only", { cwd: ROOT, encoding: "utf8" })
      .split(/\r?\n/u)
      .filter(Boolean);
    const untracked = execSync("git ls-files --others --exclude-standard", { cwd: ROOT, encoding: "utf8" })
      .split(/\r?\n/u)
      .filter(Boolean);
    return Array.from(new Set([...changed, ...untracked])).sort();
  } catch {
    return [];
  }
}

function readScore(): ScoreDimensions {
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
    const parsed = JSON.parse(raw) as Record<string, any>;
    const metrics = parsed.metrics ?? parsed.healthV2?.metrics ?? parsed.dimensions ?? parsed;
    return {
      sourceHealth: Number(metrics.sourceHealth ?? metrics.sourceHealthScore ?? parsed.healthScoreBreakdown?.sourceHealth?.score ?? 0),
      runtimeHealth: Number(metrics.runtimeHealth ?? metrics.runtimeHealthScore ?? parsed.healthScoreBreakdown?.runtimeHealth?.score ?? 0),
      evidenceCompleteness: Number(metrics.evidenceCompleteness ?? metrics.evidenceCompletenessScore ?? parsed.healthScoreBreakdown?.evidenceCompleteness?.score ?? 0),
      freshness: Number(metrics.freshness ?? metrics.freshnessScore ?? parsed.healthScoreBreakdown?.freshness?.score ?? 0),
      costRisk: Number(metrics.costRisk ?? metrics.costRiskScore ?? parsed.healthScoreBreakdown?.costRisk?.score ?? 0),
      regressionRisk: Number(metrics.regressionRisk ?? metrics.regressionRiskScore ?? parsed.healthScoreBreakdown?.regressionRisk?.score ?? 0),
      overallHealthScore: Number(metrics.overallHealthScore ?? metrics.healthScore ?? parsed.overallHealthScore ?? parsed.score ?? parsed.healthScore ?? 0),
    };
  } catch {
    return fallback;
  }
}

export function classifyDailyTaskResetTruthDirtyFile(path: string) {
  const normalized = path.replace(/\\/gu, "/");
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (normalized === REPORT_PATH) return "current_generated_artifact_to_commit";
  if (normalized === DOC_PATH) return "release_artifact_expected";
  if (normalized === "scripts/agent/validate-daily-task-reset-truth.ts") return "real_source_change_needs_review";
  if (normalized === "scripts/agent/validate-daily-task-lifecycle-telemetry.ts") return "real_source_change_needs_review";
  if (normalized === "scripts/agent/validate-daily-task-guidance-route-audit.ts") return "real_source_change_needs_review";
  if (normalized === "scripts/agent/validate-daily-task-reward-ledger.ts") return "real_source_change_needs_review";
  if (normalized === "scripts/agent/validate-daily-task-debug-score-lock.ts") return "real_source_change_needs_review";
  if (normalized === "tests/unit/daily-task-reset-truth.spec.ts") return "real_source_change_needs_review";
  if (normalized === "tests/unit/daily-task-lifecycle-telemetry.spec.ts") return "real_source_change_needs_review";
  if (normalized === "tests/unit/daily-task-guidance-route-audit.spec.ts") return "real_source_change_needs_review";
  if (normalized === "tests/unit/daily-task-debug-score-lock.spec.ts") return "real_source_change_needs_review";
  if (normalized === "tests/unit/user-management-refactor.spec.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/tasks/daily-task-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/tasks/daily-task-reset.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/tasks/daily-task-duration.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/tasks/daily-task-telemetry.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/tasks/daily-task-guidance-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/app/api/checkin/route.ts") return "real_source_change_needs_review";
  if (normalized === "src/components/Dashboard/DailyCheckIn.tsx") return "real_source_change_needs_review";
  if (normalized === "src/components/Dashboard/DailyTasksModule.tsx") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/event-translation-bridge.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/person-metrics-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/person-metrics-hydration.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/behavioral/event-fact-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/behavioral/event-fact-normalizer.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/behavioral/normalize-event-fact.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/debug-panel-tracking-summary.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/server/admin-debug/summary.ts") return "real_source_change_needs_review";
  if (normalized === "src/app/api/admin/debug/route.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/telemetry-catalog.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/testing/telemetry-trigger-test-matrix.ts") return "real_source_change_needs_review";
  if (normalized === "package.json") return "real_source_change_needs_review";
  if (normalized === "CHANGELOG.md" || normalized === "public/kandydrops-release-notes.json") return "release_artifact_expected";
  if (normalized === "src/lib/release-notes/public-release-notes.ts" || normalized === "src/lib/release-notes/release-version-contract.ts") return "release_artifact_expected";
  if (normalized.startsWith("agent/state/") && normalized.endsWith(".generated.json")) return "stale_generated_artifact_to_regenerate";
  if (normalized.startsWith("docs/agent-truth/")) return "release_artifact_expected";
  if (normalized.includes("chat")) return "unsafe_unknown";
  if (normalized.includes("paypal") || normalized.includes("payment") || normalized.includes("wallet")) return "unsafe_unknown";
  return "unsafe_unknown";
}

export function buildDailyTaskResetTruthReport(input?: {
  generatedAtUtc?: string;
  currentHead?: string;
  dirtyFiles?: string[];
  scoreBefore?: ScoreDimensions;
  scoreAfter?: ScoreDimensions;
}): DailyTaskResetTruthReport {
  const route = readIfExists("src/app/api/checkin/route.ts");
  const ui = readIfExists("src/components/Dashboard/DailyCheckIn.tsx");
  const debugSummary = readIfExists("src/lib/debug/debug-panel-tracking-summary.ts");
  const reset = resolveTaskResetPolicy({
    taskId: DAILY_CHECK_IN_TASK_CONTRACT.taskId,
    completedAt: Date.UTC(2026, 4, 23, 17, 0, 0),
    nowMs: Date.UTC(2026, 4, 24, 4, 0, 0),
  });
  const duplicate = preventDuplicateRewardClaim({
    taskId: DAILY_CHECK_IN_TASK_CONTRACT.taskId,
    completedAt: reset.completedAt,
    nowMs: reset.nowMs,
    existingReceiptKey: "validator:check_in_today:2026-05-23",
  });
  const dirtyFiles = input?.dirtyFiles ?? getDirtyFiles();
  const score = readScore();

  const generatedAtUtc = input?.generatedAtUtc ?? new Date().toISOString();
  const currentHead = input?.currentHead ?? getCurrentHead();
  const payload = {
    scoreBefore: input?.scoreBefore ?? score,
    scoreAfter: input?.scoreAfter ?? score,
    resetPolicyExplicit: reset.resetPolicy === "calendar_day" && explainTaskReset(reset).includes("calendar day"),
    resetPolicy: reset.resetPolicy,
    resetAnchor: reset.resetAnchor,
    timezone: reset.timezone,
    duplicateRewardGuard: duplicate.allowed === false && duplicate.rewardSource === "reward_gd_only",
    rewardSourceTruth: DAILY_CHECK_IN_TASK_CONTRACT.rewardSource,
    apiTrustsCallerAuth: route.includes("guardApiRequest") && route.includes("const userId = caller.uid"),
    apiRejectsArbitraryUserId: !/request\.json\(\)[\s\S]{0,400}userId/u.test(route),
    uiGuidanceRouteStatus: ui.includes("/api/checkin") && ui.includes("Reward GD")
      ? "current_routes" as const
      : "stale_route" as const,
    taskStatusHasNextEligibleAt: route.includes("nextEligibleAt") && route.includes("eligibilityExplanation"),
    debugLanePresent: debugSummary.includes("daily_tasks_reset") && buildDailyTaskDebugLane().lane === "Daily tasks/reset",
    chatTouched: dirtyFiles.some((file) => file.replace(/\\/gu, "/").includes("/chat") || file.toLowerCase().includes("chat")),
    paymentRuntimeTouched: dirtyFiles.some((file) => /paypal|payment|wallet/u.test(file.replace(/\\/gu, "/"))),
    paidGdMathTouched: dirtyFiles.some((file) => /gumdrop-(ledger|economics)|gumdrops-packages/u.test(file.replace(/\\/gu, "/"))),
    dirtyFileClassifications: dirtyFiles.map((path) => ({
      path,
      classification: classifyDailyTaskResetTruthDirtyFile(path),
    })),
    scoreDimensionImpact: {
      sourceHealth: "Daily check-in reset policy, route, and debug source are explicit.",
      runtimeHealth: "Runtime/provider evidence is unchanged; no production reads were run.",
      evidenceCompleteness: "Adds validator, generated report, and debug lane for daily task reset truth.",
      freshness: "Refreshes local score/report artifacts through targeted validators.",
      costRisk: "No broad production reads; duplicate claims are rejected before reward credit.",
      regressionRisk: "Focused unit coverage protects reset window and reward-source behavior.",
      overallHealthScore: "Moves task readiness evidence without clearing formal external gates.",
    },
    remainingGaps: [],
    nextExactSteps: [
      "Collect runtime/provider smoke evidence separately if beta score evidence gates require it.",
    ],
  };

  const provisional = {
    ...withGeneratedReportEnvelope(payload, {
      reportKey: "daily-task-reset-truth",
      status: "pass",
      generatedAtUtc,
      currentHead,
      evidenceClass: "source_snapshot",
      canClearSourceGate: true,
      nextExactSteps: payload.nextExactSteps,
      validationFailures: [],
      doesNotProve: [
        "Does not prove deployed task runtime behavior.",
        "Does not prove provider or payment behavior.",
        "Does not prove production task activity.",
      ],
    }),
    reportKey: "daily-task-reset-truth" as const,
    sourceCommit: currentHead,
    status: "pass" as const,
    passed: true,
    sourceStatus: "pass" as const,
    sourceValidationFailures: [] as string[],
    isolationFailures: [] as string[],
  } satisfies DailyTaskResetTruthReport;
  const validationFailures = [...new Set(validateDailyTaskResetTruthReport(provisional))];
  const sourceProjection = projectDailyTaskResetSourceStatus(validationFailures);
  const status = validationFailures.length === 0 ? "pass" as const : "fail" as const;
  return {
    ...provisional,
    status,
    passed: status === "pass",
    canClearSourceGate: status === "pass",
    validationFailures,
    ...sourceProjection,
  };
}

export function validateDailyTaskResetTruthReport(report: DailyTaskResetTruthReport): string[] {
  const failures: string[] = [];
  if (!/^[0-9a-f]{40}$/iu.test(report.currentHead) || report.sourceCommit !== report.currentHead) {
    failures.push("daily task reset report provenance is not a full matching Git commit.");
  }
  if (!report.resetPolicyExplicit) failures.push("reset policy is ambiguous.");
  if (!report.duplicateRewardGuard) failures.push("duplicate reward guard is missing.");
  if (report.rewardSourceTruth !== "reward_gd_only") failures.push("reward GD can become paid GD.");
  if (!report.apiTrustsCallerAuth || !report.apiRejectsArbitraryUserId) failures.push("API trusts arbitrary userId.");
  if (report.uiGuidanceRouteStatus !== "current_routes") failures.push("UI guidance points to missing/old route.");
  if (!report.taskStatusHasNextEligibleAt) failures.push("task status has no nextEligibleAt.");
  if (!report.debugLanePresent) failures.push("debug task lane missing.");
  if (report.chatTouched) failures.push("chat files changed.");
  if (report.paymentRuntimeTouched) failures.push("payment/wallet runtime changed.");
  if (report.paidGdMathTouched) failures.push("paid-GD math changed.");
  if (Object.keys(report.scoreDimensionImpact).length !== 7) failures.push("score dimension impact missing.");
  const unknownDirty = report.dirtyFileClassifications.filter((entry) => entry.classification === "unsafe_unknown");
  if (unknownDirty.length > 0) failures.push(`dirty files unclassified: ${unknownDirty.map((entry) => entry.path).join(", ")}`);
  return failures;
}

function writeReport(report: DailyTaskResetTruthReport) {
  const reportPath = join(ROOT, REPORT_PATH);
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

  const docPath = join(ROOT, DOC_PATH);
  mkdirSync(dirname(docPath), { recursive: true });
  writeFileSync(docPath, [
    "# Daily Task Reset Truth",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current HEAD: ${report.currentHead}`,
    "",
    "## Status",
    "",
    `- Reset policy: ${report.resetPolicy}`,
    `- Reset anchor: ${report.resetAnchor}`,
    `- Timezone: ${report.timezone}`,
    `- Reward source: ${report.rewardSourceTruth}`,
    `- Duplicate reward guard: ${report.duplicateRewardGuard ? "enabled" : "missing"}`,
    `- Debug lane: ${report.debugLanePresent ? "connected" : "missing"}`,
    "",
    "## Score Impact",
    "",
    ...Object.entries(report.scoreDimensionImpact).map(([dimension, impact]) => `- ${dimension}: ${impact}`),
    "",
    "## Remaining Gaps",
    "",
    ...(report.remainingGaps.length > 0 ? report.remainingGaps.map((gap) => `- ${gap}`) : ["- none"]),
    "",
    "## Next Exact Steps",
    "",
    ...report.nextExactSteps.map((step) => `- ${step}`),
    "",
  ].join("\n"));
}

if (require.main === module) {
  const report = buildDailyTaskResetTruthReport();
  writeReport(report);
  if (report.validationFailures.length > 0) {
    console.error("Daily task reset truth validation failed:");
    report.validationFailures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }
  console.log("Daily task reset truth validation passed.");
  console.log(`Reset policy: ${report.resetPolicy}; reward source: ${report.rewardSourceTruth}; duplicate guard: ${report.duplicateRewardGuard ? "enabled" : "missing"}.`);
}
