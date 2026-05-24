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

type JsonRecord = Record<string, unknown>;

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

function buildSourceGuardInputFromRepo(): CostOwnerReviewSourceInput {
  const head = shell("git", ["rev-parse", "HEAD"]);
  const cloudGuards = record(readJson("agent/state/cloud-sql-gemini-cost-guards.generated.json")?.summary);
  const bigQuery = record(readJson("agent/state/bigquery-cloud-pipeline-closure.generated.json")?.summary);
  const hotPath = record(readJson("agent/state/analytics-hot-path-cost-reduction.generated.json")?.summary);
  const analyticsRuntime = record(readJson("agent/state/analytics-cost-runtime-inventory.generated.json")?.summary);
  const scheduled = record(readJson("agent/state/scheduled-runtime-cost-reduction.generated.json")?.summary);
  const adminCost = record(readJson("agent/state/admin-analytics-debug-cost-reduction.generated.json")?.summary);
  const finalCost = record(readJson("agent/state/final-cost-audit-lock.generated.json")?.summary);
  const globalCost = readJson("agent/state/global-cost-surfaces.generated.json");

  const cloudRunSourceGuarded = fileIncludes("src/lib/server/global-cost-surface-contract.ts", [
    /app_hosting_bandwidth/iu,
    /API routes behind hosting use route-level guards|route-level guards/iu,
    /hosting bandwidth warnings/iu,
  ]);
  const route4xxSourceReady = fileIncludes("src/lib/server/cheap-4xx-response.ts", [/nonRetryable|retry/iu])
    || fileIncludes("src/lib/server/route-4xx-classifier.ts", [/retry|4xx/iu])
    || finalCost.route4xxReadiness === "source_inventory_complete";
  const bigQuerySourceGuarded = fileIncludes("functions/src/analytics-bigquery-export.ts", [
    /watermark/iu,
    /maxBytes|maximumBytes|dryRun|queryCost/iu,
  ]) || (bigQuery.watermarkDefined === true && bigQuery.queryCostGuardDefined === true);

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
      currentHead: head,
      cloudSqlRuntimeDetected: cloudGuards.cloudSqlRuntimeDetected === true,
      dataConnectRuntimeDetected: cloudGuards.dataConnectRuntimeDetected === true,
      sqlMirrorScriptsGuarded: cloudGuards.sqlMirrorScriptsGuarded === true
        || fileIncludes("scripts/agent/sync-sql.ts", [/agent-context|mirror|approval|manual/iu]),
      sqlMirrorRequiresExplicitApproval: cloudGuards.sqlMirrorRequiresExplicitApproval === true
        || fileIncludes("scripts/agent/sync-sql.ts", [/approval|explicit|manual/iu]),
      geminiRuntimeDetected: cloudGuards.geminiRuntimeDetected === true,
      aiCallsRequireExplicitAction: cloudGuards.aiCallsRequireExplicitAction === true,
      aiCallsHaveRateOrCacheGuard: cloudGuards.aiCallsHaveRateOrCacheGuard === true,
      geminiExternalBillingObserved: cloudGuards.geminiExternalBillingObserved === true,
    },
    bigQuery: {
      currentHead: head,
      scheduledWindowExportEnabled: bigQuery.scheduledWindowExportEnabled === true || bigQuerySourceGuarded,
      eventTriggeredExportDisabled: bigQuery.eventTriggeredExportDisabled === true || bigQuerySourceGuarded,
      watermarkDefined: bigQuery.watermarkDefined === true || bigQuerySourceGuarded,
      queryCostGuardDefined: bigQuery.queryCostGuardDefined === true || bigQuerySourceGuarded,
    },
    analyticsRuntime: {
      currentHead: head,
      ingestGuarded: hotPath.ingestMaterializationDeferred === true
        && hotPath.invalidPayloadWarningsCapped === true
        && hotPath.catchPathFailuresRolledUp === true,
      retry4xxClassified: route4xxSourceReady || hotPath.retryable503Reduced === true || numberValue(analyticsRuntime.retry4xxFindings, 1) === 0,
    },
    globalCost: {
      sourceClean: globalCost?.status === "clean" || globalCost?.overallScore === 100 || cloudRunSourceGuarded,
    },
  };
}

function changedForbiddenTaskChatFiles() {
  const changed = shell("git", [
    "diff",
    "--name-only",
    "--",
    "src/lib/tasks",
    "src/components/Dashboard/DailyCheckIn.tsx",
    "src/app/api/checkin",
    "src/lib/chat",
    "src/components/Chat",
    "src/app/api/chat",
    "src/app/api/admin/chat",
  ]);
  return changed.split(/\r?\n/u).filter(Boolean);
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
  const costInput = buildSourceGuardInputFromRepo();
  const report = buildCostRiskEvidenceReport({
    generatedAtUtc: new Date().toISOString(),
    currentHead: costInput.currentHead,
    costInput,
    scoreBefore: scoreDimensionsFromPublicBeta(),
    dirtyFilesClassification: classifyDirtyFiles(),
  });
  const failures = [
    ...validateCostRiskEvidenceReport(report),
    ...changedForbiddenTaskChatFiles().map((path) => `Task/chat implementation changed unnecessarily: ${path}`),
  ];
  report.validationFailures = Array.from(new Set(failures));
  report.status = report.validationFailures.length === 0 ? "pass" : "fail";

  mkdirSync(join(ROOT, dirname(REPORT_PATH)), { recursive: true });
  mkdirSync(join(ROOT, dirname(DOC_PATH)), { recursive: true });
  writeFileSync(join(ROOT, REPORT_PATH), `${JSON.stringify(report, null, 2)}\n`);
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
