import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { PublicBetaCostReadiness } from "../../src/lib/agent-score/core";
import { scoreCostReadiness } from "../../src/lib/agent-score/evidence-quality";
import {
  classifyCostRiskEvidence,
  type CostRiskScoreDimensions,
} from "../../src/lib/cost/cost-risk-evidence-classifier";
import type {
  CostOwnerReviewLaneId,
  CostOwnerReviewSourceInput,
} from "../../src/lib/cost/cost-owner-review-classifier";

type JsonRecord = Record<string, unknown>;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..", "..");

export const COST_RISK_EXIT_PASS_STATE_PATH = "agent/state/cost-risk-exit-pass.generated.json";
export const COST_RISK_EXIT_PASS_DOC_PATH = "docs/agent-truth/cost-risk-exit-pass.md";
const COST_RISK_TARGET = 80;

export type CostRiskExitPassDirtyClassification =
  | "current_generated_artifact_to_commit"
  | "cost_evidence_validator"
  | "cost_evidence_test"
  | "score_model_evidence_supported"
  | "release_artifact_expected"
  | "unrelated_agent_context_file_to_ignore"
  | "stale_generated_artifact_to_regenerate"
  | "unsafe_unknown";

export type CostRiskExitLane = {
  id: "cloudRun" | "cloudSqlDataConnect" | "geminiCloudAssistVertex" | "route4xx";
  label: string;
  owner: string;
  sourceGuardStatus: string;
  sourceGuarded: boolean;
  sourceGuardReason: string;
  externalBillingRequirement: "external_billing_required" | "external_billing_not_required";
  externalBillingReviewed: false;
  missingArtifact: string | null;
  exactNextAction: string;
  evidence: string[];
};

export type CostRiskExitPassReport = {
  generatedAtUtc: string;
  reportKey: "cost-risk-exit-pass";
  currentHead: string;
  status: "pass" | "fail";
  lanes: Record<CostRiskExitLane["id"], CostRiskExitLane>;
  costReadiness: PublicBetaCostReadiness;
  costRisk: { before: number; after: number; target: number };
  scoreDimensions: {
    sourceHealth: { before: number; after: number; target: number };
    runtimeHealth: { before: number; after: number; target: number };
    evidenceCompleteness: { before: number; after: number; target: number };
    freshness: { before: number; after: number; target: number };
    costRisk: { before: number; after: number; target: number };
    regressionRisk: { before: number; after: number; target: number };
    overallHealthScore: { before: number; after: number; target: number };
  };
  externalBillingReviewed: false;
  externalBillingRemaining: CostOwnerReviewLaneId[];
  formalEvidenceImpact: "source_cost_guard_only_does_not_clear_provider_billing";
  productionReadsPerformed: false;
  providerCallsPerformed: false;
  deployPerformed: false;
  productRuntimeChanged: false;
  paymentRuntimeChanged: false;
  gumdropMathChanged: false;
  sourceGuardedLaneCount: number;
  genericOwnerReviewLaneCount: number;
  nextExactSteps: string[];
  dirtyFiles: Array<{ path: string; classification: CostRiskExitPassDirtyClassification }>;
  staleLogicClassification: Array<{
    reference: string;
    classification: "source_guarded" | "external_billing_required" | "still_required" | "historical_reference";
    reason: string;
  }>;
  evidence: string[];
  validationFailures: string[];
};

type BuildInput = {
  generatedAtUtc?: string;
  currentHead?: string;
  costInput?: CostOwnerReviewSourceInput;
  scoreBefore?: Partial<CostRiskScoreDimensions>;
  dirtyFiles?: string[];
};

function shell(command: string, args: readonly string[], root = ROOT) {
  try {
    return execFileSync(command, [...args], { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function readJson(relativePath: string): JsonRecord | null {
  const fullPath = join(ROOT, relativePath);
  if (!existsSync(fullPath)) return null;
  try {
    const parsed = JSON.parse(readFileSync(fullPath, "utf8")) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as JsonRecord : null;
  } catch {
    return null;
  }
}

function readHeadJson(relativePath: string): JsonRecord | null {
  const raw = shell("git", ["show", `HEAD:${relativePath}`]);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
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

function readText(relativePath: string) {
  const fullPath = join(ROOT, relativePath);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function includesAll(relativePath: string, patterns: RegExp[]) {
  const text = readText(relativePath);
  return patterns.every((pattern) => pattern.test(text));
}

function currentDirtyFiles() {
  const files = new Set<string>();
  for (const args of [["diff", "--name-only"], ["diff", "--cached", "--name-only"], ["ls-files", "--others", "--exclude-standard"]] as const) {
    for (const line of shell("git", args).split(/\r?\n/u).map((entry) => entry.trim()).filter(Boolean)) {
      files.add(line.replace(/\\/gu, "/"));
    }
  }
  return [...files].sort();
}

function cloneDimensions(input?: Partial<CostRiskScoreDimensions>): CostRiskScoreDimensions {
  const beta = readHeadJson("agent/state/public-beta-score.generated.json") ?? readJson("agent/state/public-beta-score.generated.json");
  return {
    sourceHealth: input?.sourceHealth ?? numberValue(beta?.sourceHealthScore),
    runtimeHealth: input?.runtimeHealth ?? numberValue(beta?.runtimeHealthScore),
    evidenceCompleteness: input?.evidenceCompleteness ?? numberValue(beta?.evidenceCompletenessScore),
    freshness: input?.freshness ?? numberValue(beta?.freshnessScore),
    costRisk: input?.costRisk ?? numberValue(beta?.costRiskScore),
    regressionRisk: input?.regressionRisk ?? numberValue(beta?.regressionRiskScore),
    overallHealthScore: input?.overallHealthScore ?? numberValue(beta?.healthScore, numberValue(beta?.overallScore)),
  };
}

function estimateOverallAfter(before: CostRiskScoreDimensions, afterCostRisk: number) {
  const delta = afterCostRisk - before.costRisk;
  return Math.round((before.overallHealthScore + delta * 0.1) * 100) / 100;
}

export function classifyCostRiskExitPassDirtyFile(filePath: string): CostRiskExitPassDirtyClassification {
  const normalized = filePath.replace(/\\/gu, "/");
  if (normalized === COST_RISK_EXIT_PASS_STATE_PATH || normalized === "agent/state/public-beta-score.generated.json" || normalized === "agent/state/score-80-cost-readiness.generated.json") {
    return "current_generated_artifact_to_commit";
  }
  if (normalized === COST_RISK_EXIT_PASS_DOC_PATH) return "current_generated_artifact_to_commit";
  if (normalized === "scripts/agent/validate-cost-risk-exit-pass.ts") return "cost_evidence_validator";
  if (normalized === "tests/unit/cost-risk-exit-pass.spec.ts") return "cost_evidence_test";
  if (
    normalized === "scripts/agent/validate-score-80-cost-readiness.ts"
    || normalized === "scripts/agent/score-public-beta-readiness.ts"
    || normalized === "src/lib/agent-score/evidence-quality.ts"
    || normalized === "src/lib/agent-score/core.ts"
    || normalized === "src/lib/cost/cost-risk-evidence-classifier.ts"
  ) {
    return "score_model_evidence_supported";
  }
  if (normalized === "package.json") return "score_model_evidence_supported";
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (
    normalized === "CHANGELOG.md"
    || normalized === "public/kandydrops-release-notes.json"
    || normalized.startsWith("src/lib/release-notes/")
  ) return "release_artifact_expected";
  if (/payment|paypal|wallet|gumdrop-ledger|source-of-funds|top-nav|bottom-nav|nav|src\/app\/api\/chat|src\/components\/Chat/iu.test(normalized)) {
    return "unsafe_unknown";
  }
  if (/^agent\/state\/.+\.generated\.json$/u.test(normalized) || /^docs\/agent-truth\/.+\.md$/u.test(normalized)) {
    return "stale_generated_artifact_to_regenerate";
  }
  return "unsafe_unknown";
}

function buildSourceGuardInputFromRepo(currentHead: string): CostOwnerReviewSourceInput {
  const cloudGuards = record(readJson("agent/state/cloud-sql-gemini-cost-guards.generated.json")?.summary);
  const bigQuery = record(readJson("agent/state/bigquery-cloud-pipeline-closure.generated.json")?.summary);
  const hotPath = record(readJson("agent/state/analytics-hot-path-cost-reduction.generated.json")?.summary);
  const scheduled = record(readJson("agent/state/scheduled-runtime-cost-reduction.generated.json")?.summary);
  const adminCost = record(readJson("agent/state/admin-analytics-debug-cost-reduction.generated.json")?.summary);
  const cost4xx = readJson("agent/state/cost-4xx-reduction.generated.json");
  const globalCost = readJson("agent/state/global-cost-surfaces.generated.json");

  const cloudRunSourceGuarded = (
    (globalCost?.status === "clean" || globalCost?.overallScore === 100)
    && includesAll("src/app/api/admin/overview/route.ts", [/hot-cache snapshot/iu, /snapshot[\s\S]*heartbeat|heartbeat[\s\S]*snapshot/iu, /no broad fallback reads/iu])
    && includesAll("src/lib/admin/admin-hot-cache-cost-estimator.ts", [/snapshot doc/iu, /heartbeat doc/iu])
    && includesAll("src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx", [/Raw Firestore realtime listeners are disabled/iu, /snapshot-first realtime route/iu])
  );
  const route4xxSourceReady = (
    includesAll("src/lib/server/cheap-4xx-response.ts", [/cheap4xxResponse/iu, /x-kd-4xx-class/iu])
    && includesAll("src/lib/server/route-4xx-classifier.ts", [/classify4xxPath/iu, /unauthorized/iu, /bad_request/iu])
    && includesAll("src/lib/server/http-error-cost-contract.ts", [/FourXxCostPolicy/iu, /typedErrorCode/iu, /allowFirestoreBeforeValidation: false/iu])
    && includesAll("src/app/api/analytics/ingest/route.ts", [/retryable: false/iu, /invalid_json|invalid_payload|payload_too_large/iu])
  ) || cost4xx?.currentHead === currentHead;
  const bigQuerySourceGuarded = (
    bigQuery.scheduledWindowExportEnabled === true
    && bigQuery.eventTriggeredExportDisabled === true
    && bigQuery.watermarkDefined === true
    && bigQuery.queryCostGuardDefined === true
  ) || includesAll("src/lib/analytics/bigquery-export-contract.ts", [/dryRunRequiredForQueries/iu, /maximumBytesBilledRequiredForQueries/iu, /partitionFilterRequired/iu]);

  return {
    currentHead,
    finalCostAudit: {
      currentHead,
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
      currentHead,
      cloudSqlRuntimeDetected: cloudGuards.cloudSqlRuntimeDetected === true,
      dataConnectRuntimeDetected: cloudGuards.dataConnectRuntimeDetected === true,
      sqlMirrorScriptsGuarded: cloudGuards.sqlMirrorScriptsGuarded === true
        || includesAll("scripts/agent/sync-sql.ts", [/ALLOW_SQL_MIRROR_SYNC/iu, /SQL_MIRROR_SYNC_REASON/iu, /SQL_MIRROR_SYNC_ENV/iu]),
      sqlMirrorRequiresExplicitApproval: cloudGuards.sqlMirrorRequiresExplicitApproval === true
        || includesAll("scripts/agent/sync-sql.ts", [/manual-only|manual only/iu, /SQL_MIRROR_DRY_RUN/iu]),
      geminiRuntimeDetected: cloudGuards.geminiRuntimeDetected === true,
      geminiExternalBillingObserved: cloudGuards.geminiExternalBillingObserved === true,
      aiCallsRequireExplicitAction: cloudGuards.aiCallsRequireExplicitAction === true
        || includesAll("src/app/api/admin/debug/assistant/route.ts", [/POST_handler|POST/iu, /guardAdminRequest|requireAdmin/iu]),
      aiCallsHaveRateOrCacheGuard: cloudGuards.aiCallsHaveRateOrCacheGuard === true
        || includesAll("src/app/api/admin/debug/assistant/route.ts", [/guardApiRequest|rate/iu, /resolveAdminAiDebugVertexRuntime/iu]),
    },
    bigQuery: {
      currentHead,
      scheduledWindowExportEnabled: bigQuery.scheduledWindowExportEnabled === true || bigQuerySourceGuarded,
      eventTriggeredExportDisabled: bigQuery.eventTriggeredExportDisabled === true || bigQuerySourceGuarded,
      watermarkDefined: bigQuery.watermarkDefined === true || bigQuerySourceGuarded,
      queryCostGuardDefined: bigQuery.queryCostGuardDefined === true || bigQuerySourceGuarded,
    },
    analyticsRuntime: {
      currentHead,
      ingestGuarded: hotPath.ingestMaterializationDeferred === true
        && hotPath.invalidPayloadWarningsCapped === true
        && hotPath.catchPathFailuresRolledUp === true,
      retry4xxClassified: route4xxSourceReady || hotPath.retryable503Reduced === true,
    },
    globalCost: {
      sourceClean: globalCost?.status === "clean" || globalCost?.overallScore === 100,
    },
  };
}

function exitLaneFromCostLane(
  lane: ReturnType<typeof classifyCostRiskEvidence>["lanes"][CostOwnerReviewLaneId],
): CostRiskExitLane {
  const externalRequired = lane.externalReviewRequired;
  return {
    id: lane.id as CostRiskExitLane["id"],
    label: lane.label,
    owner: lane.owner,
    sourceGuardStatus: lane.status,
    sourceGuarded: lane.sourceGuarded,
    sourceGuardReason: lane.reason,
    externalBillingRequirement: externalRequired ? "external_billing_required" : "external_billing_not_required",
    externalBillingReviewed: false,
    missingArtifact: lane.sourceGuarded ? null : lane.sourceFiles[0] ?? "unknown",
    exactNextAction: lane.nextAction,
    evidence: [...lane.evidence],
  };
}

export function buildCostRiskExitPassReport(input: BuildInput = {}): CostRiskExitPassReport {
  const currentHead = input.currentHead ?? shell("git", ["rev-parse", "HEAD"]);
  const costInput = input.costInput ?? buildSourceGuardInputFromRepo(currentHead);
  const { lanes: allLanes, costReadiness, score } = classifyCostRiskEvidence(costInput);
  const before = cloneDimensions(input.scoreBefore);
  const costRiskAfter = score.score;
  const overallAfter = estimateOverallAfter(before, costRiskAfter);
  const lanes = {
    cloudRun: exitLaneFromCostLane(allLanes.cloudRun),
    cloudSqlDataConnect: exitLaneFromCostLane(allLanes.cloudSqlDataConnect),
    geminiCloudAssistVertex: exitLaneFromCostLane(allLanes.geminiCloudAssistVertex),
    route4xx: exitLaneFromCostLane(allLanes.route4xx),
  };
  const laneValues = Object.values(lanes);
  const externalBillingRemaining = laneValues
    .filter((lane) => lane.externalBillingRequirement === "external_billing_required")
    .map((lane) => lane.id);
  const dirtyFiles = (input.dirtyFiles ?? currentDirtyFiles()).map((path) => ({
    path,
    classification: classifyCostRiskExitPassDirtyFile(path),
  }));
  const genericOwnerReviewLaneCount = laneValues.filter((lane) => /cost_review_required|owner_review/iu.test(lane.sourceGuardStatus)).length;
  const nextExactSteps = [
    ...laneValues
      .filter((lane) => !lane.sourceGuarded || lane.externalBillingRequirement === "external_billing_required")
      .map((lane) => `${lane.id}: ${lane.exactNextAction}`),
    "Do not promote source cost guard evidence to external billing proof without a separate owner-reviewed artifact.",
  ];
  const report: CostRiskExitPassReport = {
    generatedAtUtc: input.generatedAtUtc ?? new Date().toISOString(),
    reportKey: "cost-risk-exit-pass",
    currentHead,
    status: "pass",
    lanes,
    costReadiness,
    costRisk: { before: before.costRisk, after: costRiskAfter, target: COST_RISK_TARGET },
    scoreDimensions: {
      sourceHealth: { before: before.sourceHealth, after: before.sourceHealth, target: COST_RISK_TARGET },
      runtimeHealth: { before: before.runtimeHealth, after: before.runtimeHealth, target: COST_RISK_TARGET },
      evidenceCompleteness: { before: before.evidenceCompleteness, after: before.evidenceCompleteness, target: COST_RISK_TARGET },
      freshness: { before: before.freshness, after: before.freshness, target: COST_RISK_TARGET },
      costRisk: { before: before.costRisk, after: costRiskAfter, target: COST_RISK_TARGET },
      regressionRisk: { before: before.regressionRisk, after: before.regressionRisk, target: COST_RISK_TARGET },
      overallHealthScore: { before: before.overallHealthScore, after: overallAfter, target: COST_RISK_TARGET },
    },
    externalBillingReviewed: false,
    externalBillingRemaining,
    formalEvidenceImpact: "source_cost_guard_only_does_not_clear_provider_billing",
    productionReadsPerformed: false,
    providerCallsPerformed: false,
    deployPerformed: false,
    productRuntimeChanged: false,
    paymentRuntimeChanged: false,
    gumdropMathChanged: false,
    sourceGuardedLaneCount: laneValues.filter((lane) => lane.sourceGuarded).length,
    genericOwnerReviewLaneCount,
    nextExactSteps,
    dirtyFiles,
    staleLogicClassification: [
      {
        reference: "cost_review_required",
        classification: genericOwnerReviewLaneCount > 0 ? "still_required" : "historical_reference",
        reason: "Generic cost review remains valid only when source guards are missing.",
      },
      {
        reference: "source_guarded_external_review_remaining",
        classification: "source_guarded",
        reason: "Source guard can raise costRisk credit but does not prove provider billing.",
      },
      {
        reference: "owner_review_external_billing_required",
        classification: "external_billing_required",
        reason: "Cloud SQL/Data Connect and Gemini/Vertex provider billing require external owner evidence.",
      },
    ],
    evidence: [
      `currentHead=${currentHead}`,
      `costRiskBefore=${before.costRisk}`,
      `costRiskAfter=${costRiskAfter}`,
      `sourceGuardedLaneCount=${laneValues.filter((lane) => lane.sourceGuarded).length}`,
      "externalBillingReviewed=false",
      "productionReadsPerformed=false",
      "providerCallsPerformed=false",
      "deployPerformed=false",
    ],
    validationFailures: [],
  };
  report.validationFailures = validateCostRiskExitPassReport(report);
  report.status = report.validationFailures.length === 0 ? "pass" : "fail";
  return report;
}

export function validateCostRiskExitPassReport(report: CostRiskExitPassReport) {
  const failures: string[] = [];
  const laneValues = Object.values(report.lanes);
  const allEvidence = laneValues.flatMap((lane) => lane.evidence).join("\n");
  if (report.reportKey !== "cost-risk-exit-pass") failures.push("reportKey must be cost-risk-exit-pass.");
  if (!report.generatedAtUtc || Number.isNaN(Date.parse(report.generatedAtUtc))) failures.push("generatedAtUtc must be parseable UTC.");
  if (!report.currentHead) failures.push("currentHead missing.");
  for (const lane of laneValues) {
    if (/cost_review_required|owner_review/iu.test(lane.sourceGuardStatus) && !lane.sourceGuardReason) {
      failures.push("cost lane remains generic owner_review without source guard reason.");
    }
    if (!lane.exactNextAction) failures.push(`${lane.id} missing exact next action.`);
    if (lane.externalBillingRequirement === "external_billing_required" && lane.externalBillingReviewed !== false) {
      failures.push("missing external billing is treated as pass.");
    }
  }
  if (report.externalBillingReviewed !== false || /externalBillingReviewed=true|dollar savings|provider billing proof passed/iu.test(allEvidence)) {
    failures.push("missing external billing is treated as pass.");
  }
  if (report.costRisk.after < COST_RISK_TARGET && report.nextExactSteps.length === 0) {
    failures.push("costRisk below 80 requires exact lane next action.");
  }
  if (!report.scoreDimensions?.costRisk || typeof report.scoreDimensions.costRisk.before !== "number" || typeof report.scoreDimensions.costRisk.after !== "number") {
    failures.push("score dimension before/after missing.");
  }
  if (report.formalEvidenceImpact !== "source_cost_guard_only_does_not_clear_provider_billing") {
    failures.push("source cost guard evidence clears formal billing gates.");
  }
  if (report.productionReadsPerformed || report.providerCallsPerformed || report.deployPerformed) {
    failures.push("production/provider/deploy actions are not allowed.");
  }
  if (report.paymentRuntimeChanged || report.gumdropMathChanged || report.productRuntimeChanged) {
    failures.push("product runtime files changed.");
  }
  if (report.dirtyFiles.some((entry) => entry.classification === "unsafe_unknown")) {
    failures.push("product runtime files changed.");
  }
  if (!report.costReadiness || scoreCostReadiness(report.costReadiness).score !== report.costRisk.after) {
    failures.push("costReadiness does not match costRisk after score.");
  }
  return Array.from(new Set(failures));
}

function renderDoc(report: CostRiskExitPassReport) {
  const laneRows = Object.values(report.lanes)
    .map((lane) => `| ${lane.label} | ${lane.sourceGuardStatus} | ${lane.sourceGuarded} | ${lane.externalBillingRequirement} | ${lane.exactNextAction} |`)
    .join("\n");
  const dirtyRows = report.dirtyFiles
    .map((entry) => `| ${entry.path} | ${entry.classification} |`)
    .join("\n");
  const scoreRows = Object.entries(report.scoreDimensions)
    .map(([dimension, values]) => `| ${dimension} | ${values.before} | ${values.after} | ${values.target} |`)
    .join("\n");
  return `# Cost Risk Exit Pass

Status: \`${report.status}\`
Artifact: \`${COST_RISK_EXIT_PASS_STATE_PATH}\`
Validator: \`npm run check:cost-risk-exit-pass\`

## Summary

- Current head: \`${report.currentHead}\`
- Cost risk: ${report.costRisk.before} -> ${report.costRisk.after}
- Source guarded lanes: ${report.sourceGuardedLaneCount}
- Generic owner-review lanes: ${report.genericOwnerReviewLaneCount}
- External billing reviewed: ${report.externalBillingReviewed}
- External billing remaining: ${report.externalBillingRemaining.join(", ") || "none"}
- Formal evidence impact: \`${report.formalEvidenceImpact}\`
- Production reads/provider calls/deploys performed: false

## Score Dimensions

| Dimension | Before | After | Target |
| --- | ---: | ---: | ---: |
${scoreRows}

## Exit Lanes

| Lane | Source guard status | Source guarded | External billing | Next action |
| --- | --- | --- | --- | --- |
${laneRows}

## Dirty File Classification

| File | Classification |
| --- | --- |
${dirtyRows || "| None | - |"}

## Stale Reference Classification

${report.staleLogicClassification.map((entry) => `- \`${entry.reference}\`: ${entry.classification} - ${entry.reason}`).join("\n")}

## Boundary

This pass is source-only cost evidence. It does not claim dollar savings, provider billing review, deployed billing proof, production reads, provider calls, or deploy status.

## Next Exact Steps

${report.nextExactSteps.map((step) => `- ${step}`).join("\n")}

## Validation

${report.validationFailures.length ? report.validationFailures.map((failure) => `- FAIL: ${failure}`).join("\n") : "- Pass."}
`;
}

function main() {
  const report = buildCostRiskExitPassReport();
  mkdirSync(join(ROOT, dirname(COST_RISK_EXIT_PASS_STATE_PATH)), { recursive: true });
  mkdirSync(join(ROOT, dirname(COST_RISK_EXIT_PASS_DOC_PATH)), { recursive: true });
  writeFileSync(join(ROOT, COST_RISK_EXIT_PASS_STATE_PATH), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(join(ROOT, COST_RISK_EXIT_PASS_DOC_PATH), renderDoc(report));
  if (report.validationFailures.length > 0) {
    console.error("Cost risk exit pass validation failed:");
    for (const failure of report.validationFailures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(`Cost risk exit pass passed. costRisk ${report.costRisk.before} -> ${report.costRisk.after}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
