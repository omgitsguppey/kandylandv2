import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { PublicBetaCostReadiness } from "../../src/lib/agent-score/core";
import { scoreCostReadiness } from "../../src/lib/agent-score/evidence-quality";

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
  const cloudSqlExternalBillingObserved = cloudSummary.cloudSqlExternalBillingObserved === true;
  const cloudSqlRuntimeDetected = cloudSummary.cloudSqlRuntimeDetected === true || cloudSummary.dataConnectRuntimeDetected === true;
  const geminiRuntimeDetected = cloudSummary.geminiRuntimeDetected === true;
  const geminiExternalBillingObserved = cloudSummary.geminiExternalBillingObserved === true;
  const geminiSourceGuarded = cloudSummary.aiCallsRequireExplicitAction === true
    && cloudSummary.aiCallsHaveRateOrCacheGuard === true;

  const costReadiness: PublicBetaCostReadiness = {
    cloudRunCostReadiness: {
      status: cloudRunSourceReady ? "source_inventory_complete" : "cost_review_required",
      detail: cloudRunSourceReady
        ? "Current source cost locks and global cost surfaces are source-ready; external Cloud Run billing and deployed scheduler review remain separate."
        : "Cloud Run/App Hosting source cost readiness still needs review from current cost locks.",
      evidence: [
        artifactPathEvidence("agent/state/final-cost-audit-lock.generated.json", finalCostCurrent),
        `artifactPath=agent/state/global-cost-surfaces.generated.json; sourceClean=${globalCostClean}`,
        artifactPathEvidence("agent/state/analytics-cost-runtime-inventory.generated.json", artifactCurrent(input.artifacts.analyticsCostRuntimeInventory, input.currentHead)),
        `finalCostP0Count=${finalCostP0}`,
        `finalCostP1Count=${finalCostP1}`,
        "externalBillingProof=false",
      ],
      blocksBetaExit: false,
    },
    cloudSqlCostReadiness: {
      status: cloudSqlRuntimeDetected ? "cost_review_required" : "owner_review",
      detail: cloudSqlRuntimeDetected
        ? "Cloud SQL/Data Connect runtime source needs owner review before cost pass."
        : "Cloud SQL runtime usage is not detected, but external billing observation remains owner-review and is not a pass.",
      evidence: [
        artifactPathEvidence("agent/state/cloud-sql-gemini-cost-guards.generated.json", cloudGuardsCurrent),
        `cloudSqlRuntimeDetected=${cloudSqlRuntimeDetected}`,
        `cloudSqlExternalBillingObserved=${cloudSqlExternalBillingObserved}`,
        "notDetectedIsNotPass=true",
      ],
      blocksBetaExit: false,
    },
    geminiCloudAssistCostReadiness: {
      status: geminiRuntimeDetected || geminiExternalBillingObserved ? "cost_review_required" : "owner_review",
      detail: geminiRuntimeDetected || geminiExternalBillingObserved
        ? "Gemini/Vertex/Cloud Assist remains owner-review; source guards prevent background use but do not prove external billing savings."
        : "No Gemini runtime source is detected, but external AI billing proof is still separate.",
      evidence: [
        artifactPathEvidence("agent/state/cloud-sql-gemini-cost-guards.generated.json", cloudGuardsCurrent),
        `geminiRuntimeDetected=${geminiRuntimeDetected}`,
        `geminiExternalBillingObserved=${geminiExternalBillingObserved}`,
        `geminiSourceGuarded=${geminiSourceGuarded}`,
        "externalBillingProof=false",
      ],
      blocksBetaExit: false,
    },
    route4xxReadiness: {
      status: route4xxSourceReady ? "source_inventory_complete" : "cost_review_required",
      detail: route4xxSourceReady
        ? "Latest telemetry and ingest closure prove source-level 4xx retry/diagnostic guardrails; stale creator-dashboard-only inventory is not the primary source."
        : "Route 4xx readiness needs current telemetry and ingest closure before source credit.",
      evidence: [
        artifactPathEvidence("agent/state/final-cost-audit-lock.generated.json", finalCostCurrent),
        artifactPathEvidence("agent/state/final-telemetry-closure-lock.generated.json", telemetryCurrent),
        `ingestClosed=${telemetrySummary.ingestClosed === true}`,
        `firestoreWritePathClosed=${telemetrySummary.firestoreWritePathClosed === true}`,
        `legacyCreatorDashboardInventoryPrimary=false`,
      ],
      blocksBetaExit: false,
    },
  };
  const costScore = scoreCostReadiness(costReadiness);
  const staleArtifacts = staleArtifactsFor(input.currentHead, input.artifacts);
  const ignoredLegacyArtifacts = !creatorInventoryCurrent && creatorInventory
    ? [CREATOR_DASHBOARD_COST_INVENTORY_PATH]
    : [];
  const ownerReviewLanes = Object.entries(costReadiness)
    .filter(([, lane]) => /owner_review|cost_review_required/u.test(String(lane.status)))
    .map(([laneName]) => laneName);
  const externalOwnerReviewStillRequired = ownerReviewLanes.length > 0;

  return {
    generatedAtUtc: input.generatedAtUtc,
    reportKey: "score-80-cost-readiness",
    currentHead: input.currentHead,
    sourceCommit: input.currentHead,
    summary: {
      latestCostLocksPreferred: finalCostCurrent && telemetryCurrent,
      externalOwnerReviewStillRequired,
      sourceCostReadinessScore: costScore.score,
      costRiskScore: costScore.score,
      staleCreatorDashboardInventoryIgnored: ignoredLegacyArtifacts.includes(CREATOR_DASHBOARD_COST_INVENTORY_PATH),
      cloudRunSourceReady,
      cloudSqlOwnerReview: ownerReviewLanes.includes("cloudSqlCostReadiness"),
      geminiOwnerReview: ownerReviewLanes.includes("geminiCloudAssistCostReadiness"),
      route4xxSourceReady,
      p0Count: 0,
      p1Count: externalOwnerReviewStillRequired ? ownerReviewLanes.length : 0,
      p2Count: staleArtifacts.length,
    },
    costReadiness,
    costRiskScore: costScore.score,
    costRiskScoreExplanation: `Cost risk score ${costScore.score} gives source readiness credit for current cost locks and route 4xx closure, while external billing proof and owner review remain separate.`,
    externalOwnerReviewStillRequired,
    sourceReadinessSignals: [
      `cloudRunSourceReady=${cloudRunSourceReady}`,
      `route4xxSourceReady=${route4xxSourceReady}`,
      `globalCostClean=${globalCostClean}`,
      `finalCostCurrent=${finalCostCurrent}`,
      `telemetryCurrent=${telemetryCurrent}`,
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
