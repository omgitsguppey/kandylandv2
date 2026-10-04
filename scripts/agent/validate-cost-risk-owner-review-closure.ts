import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildCostRiskEvidenceReport,
  validateCostRiskEvidenceReport,
  type CostRiskEvidenceReport,
  type CostRiskScoreDimensions,
} from "../../src/lib/cost/cost-risk-evidence-classifier";
import type { CostOwnerReviewSourceInput } from "../../src/lib/cost/cost-owner-review-classifier";
import { listValidatorScopeFiles, readValidatorMutationScope, withValidatorMutationScope } from "./validate-agent-takeover-safety-check";
import { validateGeneratedChildReportEvidence, withGeneratedReportEnvelope } from "./generated-report-envelope";

type JsonRecord = Record<string, unknown>;

const COST_SOURCE_CHILD_KEYS = [
  "cloud-sql-gemini-cost-guards",
  "bigquery-cloud-pipeline-closure",
  "analytics-hot-path-cost-reduction",
  "scheduled-runtime-cost-reduction",
  "admin-analytics-debug-cost-reduction",
] as const;

export function validateCostRiskSourceDependencies(reports: Record<string, unknown>, currentHead: string, nowMs = Date.now()) {
  return COST_SOURCE_CHILD_KEYS.flatMap((key) => validateGeneratedChildReportEvidence({
    report: reports[key], expectedReportKey: key, currentHead, nowMs, requireSourceGate: true,
  }));
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..", "..");
const REPORT_PATH = "agent/state/cost-risk-owner-review-closure.generated.json";
const DOC_PATH = "docs/agent-truth/cost-risk-owner-review-closure.md";

function shell(command: string, args: string[], root = ROOT) {
  try {
    return execFileSync(command, args, { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function readJson(path: string): JsonRecord | null {
  const fullPath = join(ROOT, path);
  if (!existsSync(fullPath)) return null;
  try {
    const parsed = JSON.parse(readFileSync(fullPath, "utf8")) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as JsonRecord : null;
  } catch {
    return null;
  }
}

function readHeadJson(path: string): JsonRecord | null {
  const raw = shell("git", ["show", `HEAD:${path}`]);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as JsonRecord : null;
  } catch {
    return null;
  }
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function fileIncludes(path: string, patterns: RegExp[]) {
  const fullPath = join(ROOT, path);
  if (!existsSync(fullPath)) return false;
  const text = readFileSync(fullPath, "utf8");
  return patterns.every((pattern) => pattern.test(text));
}

function scoreDimensionsFromPublicBeta(): CostRiskScoreDimensions {
  const beta = readHeadJson("agent/state/public-beta-score.generated.json") ?? readJson("agent/state/public-beta-score.generated.json");
  const dimensions = beta?.scoreDimensions && typeof beta.scoreDimensions === "object" && !Array.isArray(beta.scoreDimensions)
    ? beta.scoreDimensions as JsonRecord
    : {};
  return {
    sourceHealth: numberValue(dimensions.sourceHealth, numberValue(beta?.sourceHealthScore)),
    runtimeHealth: numberValue(dimensions.runtimeHealth, numberValue(beta?.runtimeHealthScore)),
    evidenceCompleteness: numberValue(dimensions.evidenceCompleteness, numberValue(beta?.evidenceCompletenessScore)),
    freshness: numberValue(dimensions.freshness, numberValue(beta?.freshnessScore)),
    costRisk: numberValue(dimensions.costRisk, numberValue(beta?.costRiskScore)),
    regressionRisk: numberValue(dimensions.regressionRisk, numberValue(beta?.regressionRiskScore)),
    overallHealthScore: numberValue(dimensions.overallHealthScore, numberValue(beta?.healthScore)),
  };
}

function classifyDirtyFiles() {
  if (readValidatorMutationScope()) return [];
  const status = shell("git", ["status", "--short"]);
  return status.split(/\r?\n/u).filter(Boolean).map((line) => {
    const match = line.match(/^(.{1,2})\s+(.+)$/u);
    const path = match?.[2]?.trim() ?? line.slice(3).trim();
    const statusText = match?.[1] ?? line.slice(0, 2);
    let classification = "real_source_change_needs_review";
    if (/^agent\/state\/cost-risk-owner-review-closure\.generated\.json$/u.test(path)) {
      classification = "current_generated_artifact_to_commit";
    } else if (/^docs\/agent-truth\/cost-risk-owner-review-closure\.md$/u.test(path)) {
      classification = "release_artifact_expected";
    } else if (/^agent\/state\/public-beta-score\.generated\.json$/u.test(path) || /^agent\/state\/score-80-cost-readiness\.generated\.json$/u.test(path)) {
      classification = "stale_generated_artifact_to_regenerate";
    } else if (/event-liveness-audit|event-liveness-(contract|engine)|debug-panel-tracking-summary|admin-debug\/summary|api\/admin\/debug\/route/u.test(path)) {
      classification = "unrelated_inflight_event_liveness_to_ignore";
    } else if (/^agent\/context\/optimized-task-context\.generated\.json$/u.test(path)) {
      classification = "unrelated_agent_context_file_to_ignore";
    } else if (/^src\/lib\/cost\/|^src\/lib\/agent-score\/|^scripts\/agent\/validate-cost-risk-owner-review-closure\.ts$|^tests\/unit\/cost-risk-owner-review-closure\.spec\.ts$|^package\.json$/u.test(path)) {
      classification = "real_source_change_needs_review";
    } else if (/release|changelog|public-beta/iu.test(path)) {
      classification = "release_artifact_expected";
    }
    return { path, status: statusText, classification };
  });
}

function buildSourceGuardInputFromRepo(reports: Record<string, JsonRecord | null>): CostOwnerReviewSourceInput {
  const head = shell("git", ["rev-parse", "HEAD"]);
  const cloudReport = reports["cloud-sql-gemini-cost-guards"];
  const bigQueryReport = reports["bigquery-cloud-pipeline-closure"];
  const hotPathReport = reports["analytics-hot-path-cost-reduction"];
  const cloudGuards = record(cloudReport?.summary);
  const bigQuery = record(bigQueryReport?.summary);
  const hotPath = record(hotPathReport?.summary);
  const scheduled = record(reports["scheduled-runtime-cost-reduction"]?.summary);
  const adminCost = record(reports["admin-analytics-debug-cost-reduction"]?.summary);

  const cloudRunSourceGuarded = fileIncludes("src/lib/server/global-cost-surface-contract.ts", [
    /app_hosting_bandwidth/iu,
    /API routes behind hosting use route-level guards|route-level guards/iu,
    /hosting bandwidth warnings/iu,
  ]);
  const route4xxSourceReady = fileIncludes("src/lib/server/cheap-4xx-response.ts", [/nonRetryable|retry/iu])
    || fileIncludes("src/lib/server/route-4xx-classifier.ts", [/retry|4xx/iu]);

  return {
    currentHead: head,
    finalCostAudit: {
      currentHead: head,
      cloudRunGuarded: cloudRunSourceGuarded,
      route4xxSourceReady,
      scheduledRuntimeGuarded: scheduled.queueLifecycleDueOnly === true
        && scheduled.creatorSubscriptionsDueOnly === true
        && numberValue(scheduled.p0Count) === 0,
      adminDefaultLoadGuarded: adminCost.debugInitialLoadLazy === true
        && adminCost.adminHistoricalDefaultCacheEnabled === true
        && numberValue(adminCost.p0Count) === 0,
    },
    cloudSqlGemini: {
      currentHead: typeof cloudReport?.currentHead === "string" ? cloudReport.currentHead : undefined,
      cloudSqlRuntimeDetected: cloudGuards.cloudSqlRuntimeDetected === true,
      dataConnectRuntimeDetected: cloudGuards.dataConnectRuntimeDetected === true,
      sqlMirrorScriptsGuarded: cloudGuards.sqlMirrorScriptsGuarded === true,
      sqlMirrorRequiresExplicitApproval: cloudGuards.sqlMirrorRequiresExplicitApproval === true,
      geminiRuntimeDetected: cloudGuards.geminiRuntimeDetected === true,
      aiCallsRequireExplicitAction: cloudGuards.aiCallsRequireExplicitAction === true,
      aiCallsHaveRateOrCacheGuard: cloudGuards.aiCallsHaveRateOrCacheGuard === true,
      geminiExternalBillingObserved: cloudGuards.geminiExternalBillingObserved === true,
    },
    bigQuery: {
      currentHead: typeof bigQueryReport?.currentHead === "string" ? bigQueryReport.currentHead : undefined,
      scheduledWindowExportEnabled: bigQuery.scheduledWindowExportEnabled === true,
      eventTriggeredExportDisabled: bigQuery.eventTriggeredExportDisabled === true,
      watermarkDefined: bigQuery.watermarkDefined === true,
      queryCostGuardDefined: bigQuery.queryCostGuardDefined === true,
    },
    analyticsRuntime: {
      currentHead: typeof hotPathReport?.currentHead === "string" ? hotPathReport.currentHead : undefined,
      ingestGuarded: hotPath.ingestMaterializationDeferred === true
        && hotPath.invalidPayloadWarningsCapped === true
        && hotPath.catchPathFailuresRolledUp === true,
      retry4xxClassified: route4xxSourceReady && hotPath.retryable503Reduced === true,
    },
    globalCost: {
      sourceClean: cloudRunSourceGuarded,
    },
  };
}

function changedForbiddenTaskChatFiles() {
  return listValidatorScopeFiles().filter((file) => /^(?:src\/lib\/(?:tasks|chat)(?:\/|$)|src\/components\/Chat(?:\/|$)|src\/components\/Dashboard\/DailyCheckIn\.tsx$|src\/app\/api\/(?:checkin|chat|admin\/chat)(?:\/|$))/u.test(file));
}

function renderDoc(report: CostRiskEvidenceReport) {
  const lanes = Object.values(report.lanes)
    .map((lane) => `| ${lane.label} | ${lane.status} | ${lane.sourceGuarded} | ${lane.externalReviewRequired} | ${lane.scoreImpact} | ${lane.nextAction} |`)
    .join("\n");
  const scoreRows = Object.entries(report.scoreAfter)
    .map(([dimension, after]) => `| ${dimension} | ${report.scoreBefore[dimension as keyof CostRiskScoreDimensions]} | ${after} |`)
    .join("\n");
  return `# Cost Risk Owner-Review Closure

Generated: ${report.generatedAtUtc}

Current head: ${report.currentHead}

Status: ${report.status}

## Summary

- Cost risk score: ${report.scoreBefore.costRisk} -> ${report.scoreAfter.costRisk}
- Source guarded lanes: ${report.sourceGuardedLaneCount}
- External billing reviewed: ${report.externalBillingReviewed}
- External billing remaining: ${report.externalBillingRemaining.join(", ") || "none"}
- Explanation: ${report.costRiskExplanation}

## Score Dimensions

| Dimension | Before | After |
| --- | ---: | ---: |
${scoreRows}

## Cost Lanes

| Lane | Status | Source guarded | External review required | Score impact | Next action |
| --- | --- | --- | --- | --- | --- |
${lanes}

## Dirty File Classification

${report.dirtyFilesClassification.map((entry) => `- ${entry.status} ${entry.path}: ${entry.classification}`).join("\n")}

## Boundary

This report is source-only cost evidence. It does not claim external billing review, provider billing proof, deployed cost savings, or dollar savings.

## Next Steps

${report.nextExactSteps.map((step) => `- ${step}`).join("\n")}

## Validation

${report.validationFailures.length ? report.validationFailures.map((failure) => `- FAIL: ${failure}`).join("\n") : "- Pass."}
`;
}

function main() {
  const head = shell("git", ["rev-parse", "HEAD"]);
  const childReports = Object.fromEntries(COST_SOURCE_CHILD_KEYS.map((key) => [key, readJson(`agent/state/${key}.generated.json`)]));
  const dependencyFailures = validateCostRiskSourceDependencies(childReports, head);
  const costInput = buildSourceGuardInputFromRepo(dependencyFailures.length ? {} : childReports);
  const report = buildCostRiskEvidenceReport({
    generatedAtUtc: new Date().toISOString(),
    currentHead: costInput.currentHead,
    costInput,
    scoreBefore: scoreDimensionsFromPublicBeta(),
    dirtyFilesClassification: classifyDirtyFiles(),
  });
  const failures = [
    ...dependencyFailures,
    ...validateCostRiskEvidenceReport(report),
    ...changedForbiddenTaskChatFiles().map((path) => `Task/chat implementation changed unnecessarily: ${path}`),
  ];
  report.validationFailures = Array.from(new Set(failures));
  report.status = report.validationFailures.length === 0 ? "pass" : "fail";

  mkdirSync(join(ROOT, dirname(REPORT_PATH)), { recursive: true });
  mkdirSync(join(ROOT, dirname(DOC_PATH)), { recursive: true });
  const artifact = withGeneratedReportEnvelope(report, {
    evidenceClass: "source_snapshot",
    canClearSourceGate: report.status === "pass",
    nextExactSteps: report.nextExactSteps,
    doesNotProve: ["External billing acceptance", "Deployed runtime behavior", "Provider settlement", "Authoritative admin activity"],
  });
  writeFileSync(join(ROOT, REPORT_PATH), `${JSON.stringify(withValidatorMutationScope(artifact), null, 2)}\n`);
  writeFileSync(join(ROOT, DOC_PATH), renderDoc(report));

  if (report.validationFailures.length > 0) {
    console.error("Cost risk owner-review closure validation failed:");
    for (const failure of report.validationFailures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(`Cost risk owner-review closure passed. costRisk ${report.scoreBefore.costRisk} -> ${report.scoreAfter.costRisk}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
