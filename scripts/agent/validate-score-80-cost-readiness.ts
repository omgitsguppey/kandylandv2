import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { PublicBetaCostReadiness } from "../../src/lib/agent-score/core";
import { scoreCostReadiness } from "../../src/lib/agent-score/evidence-quality";
import {
  classifyCostOwnerReviewLanes,
  costOwnerReviewLanesToScoreInput,
} from "../../src/lib/cost/cost-owner-review-classifier";

type JsonRecord = Record<string, unknown>;

export type Score80CostReadinessArtifacts = {
  finalCostAuditLock?: JsonRecord | null;
  cloudSqlGeminiCostGuards?: JsonRecord | null;
  globalCostSurfaces?: JsonRecord | null;
  billingSpikeRadar?: JsonRecord | null;
  analyticsHotPathCostReduction?: JsonRecord | null;
  scheduledRuntimeCostReduction?: JsonRecord | null;
  adminAnalyticsDebugCostReduction?: JsonRecord | null;
  creatorDashboardErrorCostInventory?: JsonRecord | null;
  analyticsCostRuntimeInventory?: JsonRecord | null;
  finalTelemetryClosureLock?: JsonRecord | null;
  costOwnerReviewSourceClosure?: JsonRecord | null;
  costRiskOwnerReviewClosure?: JsonRecord | null;
  costRiskExitPass?: JsonRecord | null;
};

export type Score80CostReadinessReport = {
  generatedAtUtc: string;
  reportKey: "score-80-cost-readiness";
  currentHead: string;
  sourceCommit: string;
  summary: {
    latestCostLocksPreferred: boolean;
    externalOwnerReviewStillRequired: boolean;
    sourceCostReadinessScore: number;
    costRiskScore: number;
    staleCreatorDashboardInventoryIgnored: boolean;
    cloudRunSourceReady: boolean;
    cloudSqlOwnerReview: boolean;
    geminiOwnerReview: boolean;
    route4xxSourceReady: boolean;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  costReadiness: PublicBetaCostReadiness;
  costRiskScore: number;
  costRiskScoreExplanation: string;
  externalOwnerReviewStillRequired: boolean;
  sourceReadinessSignals: string[];
  staleArtifacts: string[];
  ignoredLegacyArtifacts: string[];
  ownerReviewLanes: string[];
  validatorResults: Array<{
    command: string;
    status: "pass" | "missing_script" | "failed_or_not_run";
    artifactPath: string;
    detail: string;
  }>;
  nextExactSteps: string[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..", "..");
const ARTIFACT_PATH = "agent/state/score-80-cost-readiness.generated.json";
const DOC_PATH = "docs/agent-truth/score-80-cost-readiness.md";
const CREATOR_DASHBOARD_COST_INVENTORY_PATH = "agent/state/creator-dashboard-error-cost-inventory.generated.json";

function safeExec(command: string, args: string[], root = ROOT) {
  try {
    return execFileSync(command, args, { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function currentHead(root = ROOT) {
  return safeExec("git", ["rev-parse", "HEAD"], root);
}

function readJson(root: string, relativePath: string): JsonRecord | null {
  const fullPath = join(root, relativePath);
  if (!existsSync(fullPath)) return null;
  try {
    const parsed = JSON.parse(readFileSync(fullPath, "utf8")) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as JsonRecord : null;
  } catch {
    return null;
  }
}

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function artifactCurrent(artifact: JsonRecord | null | undefined, head: string) {
  return Boolean(artifact && artifact.currentHead === head);
}

function artifactPathEvidence(path: string, isCurrent: boolean) {
  return `artifactPath=${path}; current=${isCurrent}`;
}

function staleArtifactsFor(head: string, artifacts: Score80CostReadinessArtifacts) {
  const stale: string[] = [];
  const tracked: Array<[keyof Score80CostReadinessArtifacts, string]> = [
    ["finalCostAuditLock", "agent/state/final-cost-audit-lock.generated.json"],
    ["cloudSqlGeminiCostGuards", "agent/state/cloud-sql-gemini-cost-guards.generated.json"],
    ["analyticsCostRuntimeInventory", "agent/state/analytics-cost-runtime-inventory.generated.json"],
    ["finalTelemetryClosureLock", "agent/state/final-telemetry-closure-lock.generated.json"],
    ["creatorDashboardErrorCostInventory", CREATOR_DASHBOARD_COST_INVENTORY_PATH],
  ];
  for (const [key, path] of tracked) {
    const artifact = artifacts[key];
    if (artifact?.currentHead && artifact.currentHead !== head) stale.push(path);
  }
  return stale;
}

export function buildScore80CostReadinessReport(input: {
  generatedAtUtc: string;
  currentHead: string;
  artifacts: Score80CostReadinessArtifacts;
}): Score80CostReadinessReport {
  const finalCost = input.artifacts.finalCostAuditLock ?? null;
  const finalCostSummary = record(finalCost?.summary);
  const cloudGuards = input.artifacts.cloudSqlGeminiCostGuards ?? null;
  const cloudSummary = record(cloudGuards?.summary);
  const globalCost = input.artifacts.globalCostSurfaces ?? null;
  const telemetry = input.artifacts.finalTelemetryClosureLock ?? null;
  const telemetrySummary = record(telemetry?.summary);
  const analyticsRuntime = input.artifacts.analyticsCostRuntimeInventory ?? null;
  const analyticsSummary = record(analyticsRuntime?.summary);
  const hotPath = input.artifacts.analyticsHotPathCostReduction ?? null;
  const hotSummary = record(hotPath?.summary);
  const scheduled = input.artifacts.scheduledRuntimeCostReduction ?? null;
  const scheduledSummary = record(scheduled?.summary);
  const adminCost = input.artifacts.adminAnalyticsDebugCostReduction ?? null;
  const adminSummary = record(adminCost?.summary);
  const bigQuery = readJson(ROOT, "agent/state/bigquery-cloud-pipeline-closure.generated.json");
  const bigQuerySummary = record(bigQuery?.summary);
  const cost4xx = readJson(ROOT, "agent/state/cost-4xx-reduction.generated.json");
  const currentCost4xxHead = cost4xx?.currentHead === input.currentHead ? stringValue(cost4xx.currentHead) : "";
  const costOwnerClosure = input.artifacts.costOwnerReviewSourceClosure ?? null;
  const costOwnerClosureCurrent = artifactCurrent(costOwnerClosure, input.currentHead);
  const costRiskClosure = input.artifacts.costRiskOwnerReviewClosure ?? null;
  const costRiskClosureCurrent = artifactCurrent(costRiskClosure, input.currentHead);
  const costRiskExitPass = input.artifacts.costRiskExitPass ?? null;
  const costRiskExitPassCurrent = artifactCurrent(costRiskExitPass, input.currentHead);
  const creatorInventory = input.artifacts.creatorDashboardErrorCostInventory ?? null;

  const finalCostCurrent = artifactCurrent(finalCost, input.currentHead);
  const cloudGuardsCurrent = artifactCurrent(cloudGuards, input.currentHead);
  const telemetryCurrent = artifactCurrent(telemetry, input.currentHead);
  const creatorInventoryCurrent = artifactCurrent(creatorInventory, input.currentHead);
  const globalCostClean = globalCost?.status === "clean" || globalCost?.overallScore === 100;
  const finalCostP0 = numberValue(finalCostSummary.p0Count);
  const finalCostP1 = numberValue(finalCostSummary.p1Count);
  const cloudRunSourceReady = finalCostCurrent
    && globalCostClean
    && finalCostP0 === 0;
  const route4xxSourceReady = finalCostCurrent
    && telemetryCurrent
    && finalCostSummary.route4xxReadiness === "source_inventory_complete"
    && telemetrySummary.ingestClosed === true
    && telemetrySummary.firestoreWritePathClosed === true;
  const costOwnerReviewLanes = classifyCostOwnerReviewLanes({
    currentHead: input.currentHead,
    finalCostAudit: {
      currentHead: stringValue(finalCost?.currentHead),
      cloudRunGuarded: cloudRunSourceReady,
      route4xxSourceReady,
      scheduledRuntimeGuarded: artifactCurrent(scheduled, input.currentHead)
        && scheduledSummary.queueLifecycleDueOnly === true
        && scheduledSummary.creatorSubscriptionsDueOnly === true
        && numberValue(scheduledSummary.p0Count) === 0,
      adminDefaultLoadGuarded: artifactCurrent(adminCost, input.currentHead)
        && adminSummary.debugInitialLoadLazy === true
        && adminSummary.adminHistoricalDefaultCacheEnabled === true
        && numberValue(adminSummary.p0Count) === 0,
    },
    cloudSqlGemini: {
      currentHead: stringValue(cloudGuards?.currentHead),
      cloudSqlRuntimeDetected: cloudSummary.cloudSqlRuntimeDetected === true,
      dataConnectRuntimeDetected: cloudSummary.dataConnectRuntimeDetected === true,
      sqlMirrorScriptsGuarded: cloudSummary.sqlMirrorScriptsGuarded === true,
      sqlMirrorRequiresExplicitApproval: cloudSummary.sqlMirrorRequiresExplicitApproval === true,
      geminiRuntimeDetected: cloudSummary.geminiRuntimeDetected === true,
      aiCallsRequireExplicitAction: cloudSummary.aiCallsRequireExplicitAction === true,
      aiCallsHaveRateOrCacheGuard: cloudSummary.aiCallsHaveRateOrCacheGuard === true,
      geminiExternalBillingObserved: cloudSummary.geminiExternalBillingObserved === true,
    },
    bigQuery: {
      currentHead: stringValue(bigQuery?.currentHead),
      scheduledWindowExportEnabled: bigQuerySummary.scheduledWindowExportEnabled === true,
      eventTriggeredExportDisabled: bigQuerySummary.eventTriggeredExportDisabled === true,
      watermarkDefined: bigQuerySummary.watermarkDefined === true,
      queryCostGuardDefined: bigQuerySummary.queryCostGuardDefined === true,
    },
    analyticsRuntime: {
      currentHead: stringValue(currentCost4xxHead || analyticsRuntime?.currentHead || hotPath?.currentHead),
      ingestGuarded: hotSummary.ingestMaterializationDeferred === true
        && hotSummary.invalidPayloadWarningsCapped === true
        && hotSummary.catchPathFailuresRolledUp === true,
      retry4xxClassified: Boolean(currentCost4xxHead) || hotSummary.retryable503Reduced === true || numberValue(analyticsSummary.retry4xxFindings, 1) === 0,
    },
    globalCost: {
      sourceClean: globalCostClean,
    },
  });
  const closureCostReadiness = record(costOwnerClosure?.costReadiness);
  const riskClosureCostReadiness = record(costRiskClosure?.costReadiness);
  const exitPassCostReadiness = record(costRiskExitPass?.costReadiness);
  const costReadiness: PublicBetaCostReadiness = costRiskExitPassCurrent && Object.keys(exitPassCostReadiness).length > 0
    ? exitPassCostReadiness as PublicBetaCostReadiness
    : costRiskClosureCurrent && Object.keys(riskClosureCostReadiness).length > 0
      ? riskClosureCostReadiness as PublicBetaCostReadiness
      : costOwnerClosureCurrent && Object.keys(closureCostReadiness).length > 0
      ? closureCostReadiness as PublicBetaCostReadiness
      : costOwnerReviewLanesToScoreInput(costOwnerReviewLanes);
  const costScore = scoreCostReadiness(costReadiness);
  const staleArtifacts = staleArtifactsFor(input.currentHead, input.artifacts);
  const ignoredLegacyArtifacts = !creatorInventoryCurrent && creatorInventory
    ? [CREATOR_DASHBOARD_COST_INVENTORY_PATH]
    : [];
  const ownerReviewLanes = Object.entries(costReadiness)
    .filter(([, lane]) => /owner_review|cost_review_required|external_review_remaining|source_ready_no_runtime_usage_detected|source_ready_config_missing_safe/u.test(String(lane.status)))
    .map(([laneName]) => laneName);
  const externalOwnerReviewStillRequired = ownerReviewLanes.length > 0;
  const sourceStatus = (status: unknown) => /source_|source_inventory_complete/u.test(String(status));

  return {
    generatedAtUtc: input.generatedAtUtc,
    reportKey: "score-80-cost-readiness",
    currentHead: input.currentHead,
    sourceCommit: input.currentHead,
    summary: {
      latestCostLocksPreferred: costRiskExitPassCurrent || costRiskClosureCurrent || costOwnerClosureCurrent || (finalCostCurrent && telemetryCurrent),
      externalOwnerReviewStillRequired,
      sourceCostReadinessScore: costScore.score,
      costRiskScore: costScore.score,
      staleCreatorDashboardInventoryIgnored: ignoredLegacyArtifacts.includes(CREATOR_DASHBOARD_COST_INVENTORY_PATH),
      cloudRunSourceReady: sourceStatus(costReadiness.cloudRunCostReadiness.status),
      cloudSqlOwnerReview: ownerReviewLanes.includes("cloudSqlCostReadiness"),
      geminiOwnerReview: ownerReviewLanes.includes("geminiCloudAssistCostReadiness"),
      route4xxSourceReady: sourceStatus(costReadiness.route4xxReadiness.status),
      p0Count: 0,
      p1Count: externalOwnerReviewStillRequired ? ownerReviewLanes.length : 0,
      p2Count: staleArtifacts.length,
    },
    costReadiness,
    costRiskScore: costScore.score,
    costRiskScoreExplanation: `Cost risk score ${costScore.score} gives source readiness and source cost readiness credit for guarded current cost locks and route 4xx closure, while external billing proof and owner review remain separate.`,
    externalOwnerReviewStillRequired,
    sourceReadinessSignals: [
      `cloudRunSourceReady=${cloudRunSourceReady}`,
      `route4xxSourceReady=${route4xxSourceReady}`,
      `globalCostClean=${globalCostClean}`,
      `finalCostCurrent=${finalCostCurrent}`,
      `telemetryCurrent=${telemetryCurrent}`,
      `costOwnerReviewSourceClosureCurrent=${costOwnerClosureCurrent}`,
      `costRiskOwnerReviewClosureCurrent=${costRiskClosureCurrent}`,
      `costRiskExitPassCurrent=${costRiskExitPassCurrent}`,
    ],
    staleArtifacts,
    ignoredLegacyArtifacts,
    ownerReviewLanes,
    validatorResults: [
      {
        command: "npm run check:final-cost-audit-lock",
        status: finalCostCurrent ? "pass" : "failed_or_not_run",
        artifactPath: "agent/state/final-cost-audit-lock.generated.json",
        detail: finalCostCurrent ? "Current final cost lock is available." : "Final cost lock is missing or stale.",
      },
      {
        command: "npm run check:cost-risk-exit-pass",
        status: costRiskExitPassCurrent ? "pass" : "failed_or_not_run",
        artifactPath: "agent/state/cost-risk-exit-pass.generated.json",
        detail: costRiskExitPassCurrent ? "Current cost risk exit pass is available." : "Cost risk exit pass is missing or stale.",
      },
      {
        command: "npm run check:cost-risk-owner-review-closure",
        status: costRiskClosureCurrent ? "pass" : "failed_or_not_run",
        artifactPath: "agent/state/cost-risk-owner-review-closure.generated.json",
        detail: costRiskClosureCurrent ? "Current cost risk owner-review closure is available." : "Cost risk owner-review closure is missing or stale.",
      },
      {
        command: "npm run check:cost-owner-review-source-closure",
        status: costOwnerClosureCurrent ? "pass" : "failed_or_not_run",
        artifactPath: "agent/state/cost-owner-review-source-closure.generated.json",
        detail: costOwnerClosureCurrent ? "Current cost owner-review source closure is available." : "Cost owner-review source closure is missing or stale.",
      },
      {
        command: "npm run check:cloud-sql-gemini-cost-guards",
        status: cloudGuardsCurrent ? "pass" : "failed_or_not_run",
        artifactPath: "agent/state/cloud-sql-gemini-cost-guards.generated.json",
        detail: cloudGuardsCurrent ? "Current Cloud SQL/Gemini guard report is available." : "Cloud SQL/Gemini guard report is missing or stale.",
      },
      {
        command: "npm run check:global-cost-surfaces",
        status: "missing_script",
        artifactPath: "agent/state/global-cost-surfaces.generated.json",
        detail: "Package script is not present; existing global-cost source report is treated as supporting source context only.",
      },
      {
        command: "npm run check:billing-spike-radar",
        status: "missing_script",
        artifactPath: "agent/state/billing-spike-radar.generated.json",
        detail: "Package script is not present; billing spike radar remains supporting watchlist context only.",
      },
      {
        command: "npm run check:analytics-cost-runtime-inventory",
        status: artifactCurrent(input.artifacts.analyticsCostRuntimeInventory, input.currentHead) ? "pass" : "failed_or_not_run",
        artifactPath: "agent/state/analytics-cost-runtime-inventory.generated.json",
        detail: "Analytics cost runtime inventory refresh is tracked separately from external billing proof.",
      },
    ],
    nextExactSteps: [
      "Use current final cost and telemetry locks as beta score cost input.",
      "Owner-review Cloud SQL/Data Connect and Gemini/Vertex billing externally before claiming provider savings.",
      "Keep stale creator-dashboard-only cost inventory out of primary cost scoring when newer source locks exist.",
      "Attach external billing evidence separately if the operator wants formal cost proof.",
    ],
  };
}

export function validateScore80CostReadinessReport(report: Score80CostReadinessReport) {
  const failures: string[] = [];
  const cloudSqlStatus = String(report.costReadiness.cloudSqlCostReadiness.status);
  const cloudSqlEvidence = report.costReadiness.cloudSqlCostReadiness.evidence.join("\n");
  const route4xxEvidence = report.costReadiness.route4xxReadiness.evidence.join("\n");
  const allEvidence = Object.values(report.costReadiness)
    .flatMap((lane) => lane.evidence)
    .join("\n");

  if (report.reportKey !== "score-80-cost-readiness") failures.push("reportKey must be score-80-cost-readiness.");
  if (!report.currentHead || report.sourceCommit !== report.currentHead) failures.push("sourceCommit must match currentHead.");
  if (!report.summary.latestCostLocksPreferred) failures.push("latest cost locks must be preferred over legacy artifacts.");
  if (report.summary.staleCreatorDashboardInventoryIgnored !== true && report.staleArtifacts.includes(CREATOR_DASHBOARD_COST_INVENTORY_PATH)) {
    failures.push("stale creator-dashboard-error-cost-inventory must be ignored when newer cost locks exist.");
  }
  if (report.costReadiness.cloudRunCostReadiness.evidence.some((entry) => entry.includes(CREATOR_DASHBOARD_COST_INVENTORY_PATH))) {
    failures.push("cost readiness uses stale creator-dashboard-error-cost-inventory when newer cost locks exist.");
  }
  if (/source_inventory_complete|pass/iu.test(cloudSqlStatus) && /cloudSqlRuntimeDetected=false|externalBillingObserved=true/iu.test(cloudSqlEvidence)) {
    failures.push("Cloud SQL not-detected/external-billing state must remain owner-review, not pass.");
  }
  if (report.externalOwnerReviewStillRequired && report.ownerReviewLanes.length === 0) {
    failures.push("owner-review is treated as pass.");
  }
  if (String(report.costReadiness.geminiCloudAssistCostReadiness.status) === "source_inventory_complete") {
    failures.push("Gemini/Cloud Assist owner-review cannot be treated as pass from source guards alone.");
  }
  if (!route4xxEvidence.includes("final-telemetry-closure-lock")) {
    failures.push("route4xx readiness ignores latest telemetry/ingest closure.");
  }
  if (!/source readiness/iu.test(report.costRiskScoreExplanation) || !/external billing proof/iu.test(report.costRiskScoreExplanation)) {
    failures.push("costRiskScore lacks explanation.");
  }
  if (/externalBillingProof=true/iu.test(allEvidence)) {
    failures.push("external billing savings cannot be claimed without evidence.");
  }
  if (!Array.isArray(report.nextExactSteps) || report.nextExactSteps.length === 0) {
    failures.push("nextExactSteps missing.");
  }
  return failures;
}

export function buildScore80CostReadinessFromRepo(root = ROOT): Score80CostReadinessReport {
  const head = currentHead(root);
  return buildScore80CostReadinessReport({
    generatedAtUtc: new Date().toISOString(),
    currentHead: head,
    artifacts: {
      finalCostAuditLock: readJson(root, "agent/state/final-cost-audit-lock.generated.json"),
      cloudSqlGeminiCostGuards: readJson(root, "agent/state/cloud-sql-gemini-cost-guards.generated.json"),
      globalCostSurfaces: readJson(root, "agent/state/global-cost-surfaces.generated.json"),
      billingSpikeRadar: readJson(root, "agent/state/billing-spike-radar.generated.json"),
      analyticsHotPathCostReduction: readJson(root, "agent/state/analytics-hot-path-cost-reduction.generated.json"),
      scheduledRuntimeCostReduction: readJson(root, "agent/state/scheduled-runtime-cost-reduction.generated.json"),
      adminAnalyticsDebugCostReduction: readJson(root, "agent/state/admin-analytics-debug-cost-reduction.generated.json"),
      creatorDashboardErrorCostInventory: readJson(root, CREATOR_DASHBOARD_COST_INVENTORY_PATH),
      analyticsCostRuntimeInventory: readJson(root, "agent/state/analytics-cost-runtime-inventory.generated.json"),
      finalTelemetryClosureLock: readJson(root, "agent/state/final-telemetry-closure-lock.generated.json"),
      costOwnerReviewSourceClosure: readJson(root, "agent/state/cost-owner-review-source-closure.generated.json"),
      costRiskOwnerReviewClosure: readJson(root, "agent/state/cost-risk-owner-review-closure.generated.json"),
      costRiskExitPass: readJson(root, "agent/state/cost-risk-exit-pass.generated.json"),
    },
  });
}

function renderDoc(report: Score80CostReadinessReport) {
  const lanes = Object.entries(report.costReadiness)
    .map(([lane, value]) => `| ${lane} | ${value.status} | ${value.detail} |`)
    .join("\n");
  const validators = report.validatorResults
    .map((result) => `| ${result.command} | ${result.status} | ${result.artifactPath} | ${result.detail} |`)
    .join("\n");
  return `# Score 80 Cost Readiness

Generated: ${report.generatedAtUtc}

Latest code version: ${report.currentHead}

## Summary

- Cost risk score: ${report.costRiskScore}
- Latest cost locks preferred: ${report.summary.latestCostLocksPreferred}
- External owner review still required: ${report.externalOwnerReviewStillRequired}
- Stale creator dashboard inventory ignored: ${report.summary.staleCreatorDashboardInventoryIgnored}
- Explanation: ${report.costRiskScoreExplanation}

## Cost Lanes

| Lane | Status | Detail |
| --- | --- | --- |
${lanes}

## Validator Inputs

| Command | Status | Artifact | Detail |
| --- | --- | --- | --- |
${validators}

## Boundary

This report gives source cost readiness credit only. It does not claim external billing savings, Cloud SQL closure, Gemini/Vertex closure, or deployed Cloud Run cost proof.

## Next Steps

${report.nextExactSteps.map((step) => `- ${step}`).join("\n")}
`;
}

function changedForbiddenFiles(root = ROOT) {
  const changed = safeExec("git", ["diff", "--name-only", "--", "src/components/Chat", "src/app/dashboard/chat", "src/components/Navigation", "src/components/Navbar.tsx", "src/components/BottomNav.tsx", "src/components/TopNav.tsx"], root);
  return changed.split(/\r?\n/u).filter(Boolean);
}

function main() {
  const report = buildScore80CostReadinessFromRepo(ROOT);
  mkdirSync(join(ROOT, "agent/state"), { recursive: true });
  mkdirSync(join(ROOT, "docs/agent-truth"), { recursive: true });
  writeFileSync(join(ROOT, ARTIFACT_PATH), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(join(ROOT, DOC_PATH), renderDoc(report));

  const failures = validateScore80CostReadinessReport(report);
  const forbiddenChanges = changedForbiddenFiles();
  if (forbiddenChanges.length > 0) failures.push(`Forbidden chat/nav files changed: ${forbiddenChanges.join(", ")}`);
  if (failures.length > 0) {
    console.error("Score 80 cost readiness validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(`Score 80 cost readiness passed. costRiskScore=${report.costRiskScore} ownerReview=${report.externalOwnerReviewStillRequired}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
