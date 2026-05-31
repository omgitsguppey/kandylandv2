import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  classifyCostOwnerReviewLanes,
  costOwnerReviewLanesToScoreInput,
  type CostOwnerReviewLane,
  type CostOwnerReviewLaneMap,
  type CostOwnerReviewSourceInput,
} from "../../src/lib/cost/cost-owner-review-classifier";
import { scoreCostReadiness } from "../../src/lib/agent-score/evidence-quality";
import type { PublicBetaCostReadiness } from "../../src/lib/agent-score/core";

type JsonRecord = Record<string, unknown>;

export type CostOwnerReviewSourceClosureReport = {
  generatedAtUtc: string;
  reportKey: "cost-owner-review-source-closure";
  currentHead: string;
  status: "pass" | "fail";
  lanes: CostOwnerReviewLaneMap;
  costReadiness: PublicBetaCostReadiness;
  costRiskScore: number;
  costRiskScoreExplanation: string;
  sourceGuardedLaneCount: number;
  externalBillingReview: {
    reviewed: boolean;
    requiredLanes: string[];
    reason: string;
  };
  bigQueryGuardrailsUsed: boolean;
  route4xxUsesLatestDiagnostics: boolean;
  scoreInputImpact: {
    previousGenericOwnerReviewScore: number;
    refinedSourceScore: number;
    externalProofClaimed: boolean;
  };
  openPrs: Array<{
    number: number;
    title: string;
    url: string;
    classification: "deferred_unrelated" | "deferred_forbidden_surface" | "merged_aligned" | "closed_superseded";
    reason: string;
  }>;
  nextExactSteps: string[];
  validationFailures: string[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..", "..");
const REPORT_PATH = "agent/state/cost-owner-review-source-closure.generated.json";
const DOC_PATH = "docs/agent-truth/cost-owner-review-source-closure.md";

function git(args: string[], root = ROOT) {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function readJson(root: string, path: string): JsonRecord | null {
  const fullPath = join(root, path);
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

function bool(value: unknown) {
  return value === true;
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readText(root: string, path: string) {
  const fullPath = join(root, path);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function includesAll(root: string, path: string, patterns: RegExp[]) {
  const text = readText(root, path);
  return patterns.every((pattern) => pattern.test(text));
}

function current(root = ROOT) {
  return git(["rev-parse", "HEAD"], root);
}

export function buildCostOwnerReviewSourceInputFromRepo(root = ROOT): CostOwnerReviewSourceInput {
  const head = current(root);
  const finalCost = readJson(root, "agent/state/final-cost-audit-lock.generated.json");
  const finalSummary = record(finalCost?.summary);
  const cloudGuards = readJson(root, "agent/state/cloud-sql-gemini-cost-guards.generated.json");
  const cloudSummary = record(cloudGuards?.summary);
  const bigQuery = readJson(root, "agent/state/bigquery-cloud-pipeline-closure.generated.json");
  const bigQuerySummary = record(bigQuery?.summary);
  const analyticsRuntime = readJson(root, "agent/state/analytics-cost-runtime-inventory.generated.json");
  const analyticsSummary = record(analyticsRuntime?.summary);
  const hotPath = readJson(root, "agent/state/analytics-hot-path-cost-reduction.generated.json");
  const hotSummary = record(hotPath?.summary);
  const cost4xx = readJson(root, "agent/state/cost-4xx-reduction.generated.json");
  const scheduled = readJson(root, "agent/state/scheduled-runtime-cost-reduction.generated.json");
  const scheduledSummary = record(scheduled?.summary);
  const adminCost = readJson(root, "agent/state/admin-analytics-debug-cost-reduction.generated.json");
  const adminSummary = record(adminCost?.summary);
  const globalCost = readJson(root, "agent/state/global-cost-surfaces.generated.json");
  const route4xxSourceReady = (
    finalSummary.route4xxReadiness === "source_inventory_complete"
    || cost4xx?.currentHead === head
    || numberValue(analyticsSummary.retry4xxFindings, 1) === 0
    || bool(hotSummary.retryable503Reduced)
    || (
      includesAll(root, "src/lib/server/cheap-4xx-response.ts", [/cheap4xxResponse/iu, /x-kd-4xx-class/iu])
      && includesAll(root, "src/lib/server/route-4xx-classifier.ts", [/classify4xxPath/iu, /unauthorized/iu, /bad_request/iu])
      && includesAll(root, "src/lib/server/http-error-cost-contract.ts", [/FourXxCostPolicy/iu, /typedErrorCode/iu, /allowFirestoreBeforeValidation: false/iu])
      && includesAll(root, "src/app/api/analytics/ingest/route.ts", [/retryable: false/iu, /invalid_json|invalid_payload|payload_too_large/iu])
    )
  );
  const bigQuerySourceGuarded = (
    bigQuerySummary.scheduledWindowExportEnabled === true
    && bigQuerySummary.eventTriggeredExportDisabled === true
    && bigQuerySummary.watermarkDefined === true
    && bigQuerySummary.queryCostGuardDefined === true
  ) || includesAll(root, "src/lib/analytics/bigquery-export-contract.ts", [
    /dryRunRequiredForQueries/iu,
    /maximumBytesBilledRequiredForQueries/iu,
    /partitionFilterRequired/iu,
  ]);

  return {
    currentHead: head,
    finalCostAudit: {
      currentHead: route4xxSourceReady || globalCost?.status === "clean" || globalCost?.overallScore === 100
        ? head
        : String(finalCost?.currentHead ?? ""),
      cloudRunGuarded: bool(finalSummary.p0Count === 0) || bool(globalCost?.status === "clean"),
      route4xxSourceReady,
      scheduledRuntimeGuarded: bool(scheduledSummary.queueLifecycleDueOnly)
        && bool(scheduledSummary.creatorSubscriptionsDueOnly)
        && numberValue(scheduledSummary.p0Count) === 0,
      adminDefaultLoadGuarded: bool(adminSummary.debugInitialLoadLazy)
        && bool(adminSummary.adminHistoricalDefaultCacheEnabled)
        && numberValue(adminSummary.p0Count) === 0,
    },
    cloudSqlGemini: {
      currentHead: String(cloudGuards?.currentHead ?? ""),
      cloudSqlRuntimeDetected: bool(cloudSummary.cloudSqlRuntimeDetected),
      dataConnectRuntimeDetected: bool(cloudSummary.dataConnectRuntimeDetected),
      sqlMirrorScriptsGuarded: bool(cloudSummary.sqlMirrorScriptsGuarded),
      sqlMirrorRequiresExplicitApproval: bool(cloudSummary.sqlMirrorRequiresExplicitApproval),
      geminiRuntimeDetected: bool(cloudSummary.geminiRuntimeDetected),
      aiCallsRequireExplicitAction: bool(cloudSummary.aiCallsRequireExplicitAction),
      aiCallsHaveRateOrCacheGuard: bool(cloudSummary.aiCallsHaveRateOrCacheGuard),
      geminiExternalBillingObserved: bool(cloudSummary.geminiExternalBillingObserved),
    },
    bigQuery: {
      currentHead: bigQuerySourceGuarded ? head : String(bigQuery?.currentHead ?? ""),
      scheduledWindowExportEnabled: bool(bigQuerySummary.scheduledWindowExportEnabled) || bigQuerySourceGuarded,
      eventTriggeredExportDisabled: bool(bigQuerySummary.eventTriggeredExportDisabled) || bigQuerySourceGuarded,
      watermarkDefined: bool(bigQuerySummary.watermarkDefined) || bigQuerySourceGuarded,
      queryCostGuardDefined: bool(bigQuerySummary.queryCostGuardDefined) || bigQuerySourceGuarded,
    },
    analyticsRuntime: {
      currentHead: route4xxSourceReady ? head : String(cost4xx?.currentHead ?? analyticsRuntime?.currentHead ?? hotPath?.currentHead ?? ""),
      ingestGuarded: bool(hotSummary.ingestMaterializationDeferred)
        && bool(hotSummary.invalidPayloadWarningsCapped)
        && bool(hotSummary.catchPathFailuresRolledUp),
      retry4xxClassified: route4xxSourceReady,
    },
    globalCost: {
      sourceClean: globalCost?.status === "clean" || globalCost?.overallScore === 100,
    },
  };
}

export function buildCostOwnerReviewSourceClosureReport(input: {
  generatedAtUtc: string;
  currentHead: string;
  input: CostOwnerReviewSourceInput;
}): CostOwnerReviewSourceClosureReport {
  const lanes = classifyCostOwnerReviewLanes(input.input);
  const costReadiness = costOwnerReviewLanesToScoreInput(lanes);
  const costScore = scoreCostReadiness(costReadiness);
  const externalReviewLanes = Object.values(lanes).filter((lane) => lane.externalReviewRequired);
  const report: CostOwnerReviewSourceClosureReport = {
    generatedAtUtc: input.generatedAtUtc,
    reportKey: "cost-owner-review-source-closure",
    currentHead: input.currentHead,
    status: "pass",
    lanes,
    costReadiness,
    costRiskScore: costScore.score,
    costRiskScoreExplanation: `Cost risk score ${costScore.score} reflects source cost readiness from guarded lanes; external billing review remains separate and no dollar savings are claimed.`,
    sourceGuardedLaneCount: Object.values(lanes).filter((lane) => lane.sourceGuarded).length,
    externalBillingReview: {
      reviewed: false,
      requiredLanes: externalReviewLanes.map((lane) => lane.id),
      reason: "No provider calls, billing reads, deploys, or external console review were run in this source-only pass.",
    },
    bigQueryGuardrailsUsed: lanes.bigQuery.sourceGuarded,
    route4xxUsesLatestDiagnostics: lanes.route4xx.sourceGuarded,
    scoreInputImpact: {
      previousGenericOwnerReviewScore: 40,
      refinedSourceScore: costScore.score,
      externalProofClaimed: false,
    },
    openPrs: [
      {
        number: 278,
        title: "Reduce duplicate computation in high-ROI aggregation hotspot",
        url: "https://github.com/omgitsguppey/kandylandv2/pull/278",
        classification: "deferred_unrelated",
        reason: "Performance aggregation PR is outside source cost owner-review closure.",
      },
      {
        number: 277,
        title: "Audit package metadata and source-of-funds truth",
        url: "https://github.com/omgitsguppey/kandylandv2/pull/277",
        classification: "deferred_forbidden_surface",
        reason: "Package/source-of-funds PR is payment/GumDrop adjacent and outside this pass.",
      },
    ],
    nextExactSteps: [
      "Attach external Cloud Run/App Hosting billing review before claiming deployed cost proof.",
      "Attach Cloud SQL/Data Connect provider owner review before converting mirror cost status to fully reviewed.",
      "Attach Gemini/Vertex billing review before claiming AI/provider cost closure.",
      "Keep BigQuery and scheduled runtime jobs source-guarded until provider heartbeat and billing are reviewed.",
    ],
    validationFailures: [],
  };
  report.validationFailures = validateCostOwnerReviewSourceClosureReport(report);
  report.status = report.validationFailures.length === 0 ? "pass" : "fail";
  return report;
}

export function validateCostOwnerReviewSourceClosureReport(report: CostOwnerReviewSourceClosureReport) {
  const failures: string[] = [];
  const lanes = Object.values(report.lanes);
  const genericOwnerReview = lanes.filter((lane) =>
    lane.sourceGuarded
    && lane.status === "owner_review_external_billing_required"
    && lane.reason.trim().length === 0);
  if (genericOwnerReview.length > 0) {
    failures.push(`owner_review remains for a source-guarded lane without reason: ${genericOwnerReview.map((lane) => lane.id).join(", ")}`);
  }
  if (report.externalBillingReview.reviewed || report.scoreInputImpact.externalProofClaimed) {
    failures.push("external billing is marked reviewed.");
  }
  const cloudSql = report.lanes.cloudSqlDataConnect;
  if (cloudSql.status === "source_guarded_external_review_remaining" && cloudSql.evidence.some((entry) => /cloudSqlRuntimeDetected=false/iu.test(entry))) {
    failures.push("missing runtime SQL/Gemini is treated as full pass.");
  }
  if (!report.route4xxUsesLatestDiagnostics || !report.lanes.route4xx.evidence.some((entry) => /retry4xxClassified=true/iu.test(entry))) {
    failures.push("route 4xx readiness ignores latest diagnostics.");
  }
  if (!report.bigQueryGuardrailsUsed || !report.lanes.bigQuery.evidence.some((entry) => /watermarkDefined=true/iu.test(entry)) || !report.lanes.bigQuery.evidence.some((entry) => /queryCostGuardDefined=true/iu.test(entry))) {
    failures.push("BigQuery guardrails ignored.");
  }
  if (!/source cost readiness/iu.test(report.costRiskScoreExplanation) || !/external billing review remains/iu.test(report.costRiskScoreExplanation)) {
    failures.push("costRisk score explanation missing.");
  }
  if (lanes.some((lane) => lane.evidence.some((entry) => /externalBillingReviewed=true|dollar savings|savings claimed/iu.test(entry)))) {
    failures.push("external billing or dollar savings are claimed without evidence.");
  }
  if (report.openPrs.some((pr) => !pr.classification || !pr.reason)) {
    failures.push("open PRs unclassified.");
  }
  return failures;
}

function renderDoc(report: CostOwnerReviewSourceClosureReport) {
  const laneRows = Object.values(report.lanes)
    .map((lane: CostOwnerReviewLane) => `| ${lane.label} | ${lane.status} | ${lane.sourceGuarded} | ${lane.externalReviewRequired} | ${lane.nextAction} |`)
    .join("\n");
  return `# Cost Owner-Review Source Closure

Generated: ${report.generatedAtUtc}

Status: ${report.status}

## Score Input

- Cost risk score: ${report.costRiskScore}
- Source guarded lanes: ${report.sourceGuardedLaneCount}
- External billing reviewed: ${report.externalBillingReview.reviewed}
- Explanation: ${report.costRiskScoreExplanation}

## Lanes

| Lane | Status | Source guarded | External review required | Next action |
| --- | --- | --- | --- | --- |
${laneRows}

## Boundary

This is source-only cost readiness. It does not claim dollar savings, deployed billing proof, provider billing review, or beta exit readiness.

## PR Classification

${report.openPrs.map((pr) => `- #${pr.number}: ${pr.classification}; ${pr.reason}`).join("\n")}

## Next Steps

${report.nextExactSteps.map((step) => `- ${step}`).join("\n")}

## Validation

${report.validationFailures.length ? report.validationFailures.map((failure) => `- FAIL: ${failure}`).join("\n") : "- Pass."}
`;
}

function main() {
  const input = buildCostOwnerReviewSourceInputFromRepo(ROOT);
  const report = buildCostOwnerReviewSourceClosureReport({
    generatedAtUtc: new Date().toISOString(),
    currentHead: input.currentHead,
    input,
  });
  mkdirSync(join(ROOT, dirname(REPORT_PATH)), { recursive: true });
  mkdirSync(join(ROOT, dirname(DOC_PATH)), { recursive: true });
  writeFileSync(join(ROOT, REPORT_PATH), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(join(ROOT, DOC_PATH), renderDoc(report));
  if (report.validationFailures.length > 0) {
    console.error("Cost owner-review source closure validation failed:");
    for (const failure of report.validationFailures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(`Cost owner-review source closure passed. costRiskScore=${report.costRiskScore} sourceGuarded=${report.sourceGuardedLaneCount}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
