import type { PublicBetaCostReadiness } from "../agent-score/core";

export type CostOwnerReviewStatus =
  | "source_guarded_external_review_remaining"
  | "source_ready_no_runtime_usage_detected"
  | "source_ready_config_missing_safe"
  | "source_ready_retry_storm_guarded"
  | "source_ready_batched_or_cached"
  | "owner_review_external_billing_required"
  | "cost_review_required"
  | "blocked"
  | "unknown";

export type CostOwnerReviewLaneId =
  | "cloudRun"
  | "cloudSqlDataConnect"
  | "geminiCloudAssistVertex"
  | "route4xx"
  | "bigQuery"
  | "analyticsIngestRetryStorms"
  | "scheduledRuntimeJobs"
  | "adminAnalyticsDebugDefaultLoad";

export type CostOwnerReviewLane = {
  id: CostOwnerReviewLaneId;
  label: string;
  owner: string;
  status: CostOwnerReviewStatus;
  sourceGuarded: boolean;
  externalBillingReviewed: boolean;
  externalReviewRequired: boolean;
  sourceFiles: string[];
  evidence: string[];
  reason: string;
  nextAction: string;
};

export type CostOwnerReviewSourceInput = {
  currentHead: string;
  finalCostAudit?: {
    currentHead?: string;
    cloudRunGuarded?: boolean;
    route4xxSourceReady?: boolean;
    scheduledRuntimeGuarded?: boolean;
    adminDefaultLoadGuarded?: boolean;
  };
  cloudSqlGemini?: {
    currentHead?: string;
    cloudSqlRuntimeDetected?: boolean;
    dataConnectRuntimeDetected?: boolean;
    sqlMirrorScriptsGuarded?: boolean;
    sqlMirrorRequiresExplicitApproval?: boolean;
    geminiRuntimeDetected?: boolean;
    aiCallsRequireExplicitAction?: boolean;
    aiCallsHaveRateOrCacheGuard?: boolean;
    geminiExternalBillingObserved?: boolean;
  };
  bigQuery?: {
    currentHead?: string;
    scheduledWindowExportEnabled?: boolean;
    eventTriggeredExportDisabled?: boolean;
    watermarkDefined?: boolean;
    queryCostGuardDefined?: boolean;
  };
  analyticsRuntime?: {
    currentHead?: string;
    ingestGuarded?: boolean;
    retry4xxClassified?: boolean;
  };
  globalCost?: {
    sourceClean?: boolean;
  };
};

export type CostOwnerReviewLaneMap = Record<CostOwnerReviewLaneId, CostOwnerReviewLane>;

function isCurrent(currentHead: string, artifactHead?: string) {
  return artifactHead === currentHead;
}

function lane(input: CostOwnerReviewLane): CostOwnerReviewLane {
  return input;
}

export function classifyCostOwnerReviewLanes(input: CostOwnerReviewSourceInput): CostOwnerReviewLaneMap {
  const finalCurrent = isCurrent(input.currentHead, input.finalCostAudit?.currentHead);
  const cloudCurrent = isCurrent(input.currentHead, input.cloudSqlGemini?.currentHead);
  const bigQueryCurrent = isCurrent(input.currentHead, input.bigQuery?.currentHead);
  const analyticsCurrent = isCurrent(input.currentHead, input.analyticsRuntime?.currentHead);
  const cloudRunGuarded = finalCurrent && input.finalCostAudit?.cloudRunGuarded === true && input.globalCost?.sourceClean === true;
  const cloudSqlRuntimeDetected = input.cloudSqlGemini?.cloudSqlRuntimeDetected === true || input.cloudSqlGemini?.dataConnectRuntimeDetected === true;
  const cloudSqlGuarded = cloudCurrent
    && cloudSqlRuntimeDetected === false
    && input.cloudSqlGemini?.sqlMirrorScriptsGuarded === true
    && input.cloudSqlGemini?.sqlMirrorRequiresExplicitApproval === true;
  const geminiGuarded = cloudCurrent
    && input.cloudSqlGemini?.geminiRuntimeDetected === true
    && input.cloudSqlGemini?.aiCallsRequireExplicitAction === true
    && input.cloudSqlGemini?.aiCallsHaveRateOrCacheGuard === true;
  const route4xxGuarded = finalCurrent && analyticsCurrent
    && input.finalCostAudit?.route4xxSourceReady === true
    && input.analyticsRuntime?.retry4xxClassified === true;
  const bigQueryGuarded = bigQueryCurrent
    && input.bigQuery?.scheduledWindowExportEnabled === true
    && input.bigQuery?.eventTriggeredExportDisabled === true
    && input.bigQuery?.watermarkDefined === true
    && input.bigQuery?.queryCostGuardDefined === true;
  const analyticsGuarded = analyticsCurrent && input.analyticsRuntime?.ingestGuarded === true && input.analyticsRuntime?.retry4xxClassified === true;
  const scheduledGuarded = finalCurrent && input.finalCostAudit?.scheduledRuntimeGuarded === true;
  const adminDefaultLoadGuarded = finalCurrent && input.finalCostAudit?.adminDefaultLoadGuarded === true;

  return {
    cloudRun: lane({
      id: "cloudRun",
      label: "Cloud Run/App Hosting",
      owner: "speed-security-cost",
      status: cloudRunGuarded ? "source_guarded_external_review_remaining" : "cost_review_required",
      sourceGuarded: cloudRunGuarded,
      externalBillingReviewed: false,
      externalReviewRequired: true,
      sourceFiles: [
        "agent/state/final-cost-audit-lock.generated.json",
        "agent/state/global-cost-surfaces.generated.json",
        "agent/state/analytics-cost-runtime-inventory.generated.json",
      ],
      evidence: [
        `finalCostCurrent=${finalCurrent}`,
        `globalCostSourceClean=${input.globalCost?.sourceClean === true}`,
        `cloudRunGuarded=${cloudRunGuarded}`,
        "externalBillingReviewed=false",
      ],
      reason: cloudRunGuarded
        ? "Cloud Run/App Hosting has source guard coverage; deployed billing review remains external."
        : "Cloud Run/App Hosting still needs current source guard evidence before owner-review can be refined.",
      nextAction: "Review Cloud Run/App Hosting billing and deployed scheduler behavior externally before claiming full cost proof.",
    }),
    cloudSqlDataConnect: lane({
      id: "cloudSqlDataConnect",
      label: "Cloud SQL/Data Connect",
      owner: "agent-context-mirror",
      status: cloudSqlGuarded ? "source_ready_no_runtime_usage_detected" : "owner_review_external_billing_required",
      sourceGuarded: cloudSqlGuarded,
      externalBillingReviewed: false,
      externalReviewRequired: true,
      sourceFiles: [
        "agent/state/cloud-sql-gemini-cost-guards.generated.json",
        "scripts/agent/sync-sql.ts",
        "dataconnect/dataconnect.yaml",
      ],
      evidence: [
        `cloudSqlGuardReportCurrent=${cloudCurrent}`,
        `cloudSqlRuntimeDetected=${cloudSqlRuntimeDetected}`,
        `sqlMirrorScriptsGuarded=${input.cloudSqlGemini?.sqlMirrorScriptsGuarded === true}`,
        `sqlMirrorRequiresExplicitApproval=${input.cloudSqlGemini?.sqlMirrorRequiresExplicitApproval === true}`,
        "notDetectedIsNotPass=true",
        "externalBillingReviewed=false",
      ],
      reason: cloudSqlGuarded
        ? "Runtime SQL/Data Connect usage is not detected and mirror sync is manually guarded; provider instance billing still needs owner review."
        : "Cloud SQL/Data Connect source or external billing state still needs owner review.",
      nextAction: "Map Cloud SQL/Data Connect instance state, backups, HA, and billing owner in provider console.",
    }),
    geminiCloudAssistVertex: lane({
      id: "geminiCloudAssistVertex",
      label: "Gemini/Cloud Assist/Vertex AI",
      owner: "admin-ai",
      status: geminiGuarded ? "source_guarded_external_review_remaining" : "cost_review_required",
      sourceGuarded: geminiGuarded,
      externalBillingReviewed: false,
      externalReviewRequired: true,
      sourceFiles: [
        "agent/state/cloud-sql-gemini-cost-guards.generated.json",
        "src/app/api/admin/ai/drop-covers/generate/route.ts",
        "src/app/api/admin/ai/drop-descriptions/generate/route.ts",
        "src/app/api/admin/debug/assistant/route.ts",
      ],
      evidence: [
        `cloudSqlGeminiGuardCurrent=${cloudCurrent}`,
        `geminiRuntimeDetected=${input.cloudSqlGemini?.geminiRuntimeDetected === true}`,
        `aiCallsRequireExplicitAction=${input.cloudSqlGemini?.aiCallsRequireExplicitAction === true}`,
        `aiCallsHaveRateOrCacheGuard=${input.cloudSqlGemini?.aiCallsHaveRateOrCacheGuard === true}`,
        `geminiExternalBillingObserved=${input.cloudSqlGemini?.geminiExternalBillingObserved === true}`,
        "externalBillingReviewed=false",
      ],
      reason: geminiGuarded
        ? "AI routes are explicit admin-action guarded with rate/cache protection; external Gemini/Vertex billing remains owner-review."
        : "AI cost lane lacks enough source guard evidence for refinement.",
      nextAction: "Review Gemini/Vertex billing externally and keep future AI calls explicit, cached/idempotent, and rate-limited.",
    }),
    route4xx: lane({
      id: "route4xx",
      label: "Route 4xx",
      owner: "server-routing",
      status: route4xxGuarded ? "source_ready_retry_storm_guarded" : "cost_review_required",
      sourceGuarded: route4xxGuarded,
      externalBillingReviewed: false,
      externalReviewRequired: false,
      sourceFiles: [
        "agent/state/final-cost-audit-lock.generated.json",
        "agent/state/final-telemetry-closure-lock.generated.json",
        "src/lib/server/cheap-4xx-response.ts",
        "src/lib/server/route-4xx-classifier.ts",
      ],
      evidence: [
        "artifactPath=agent/state/final-cost-audit-lock.generated.json",
        "artifactPath=agent/state/final-telemetry-closure-lock.generated.json",
        `finalCostCurrent=${finalCurrent}`,
        `analyticsRuntimeCurrent=${analyticsCurrent}`,
        `route4xxSourceReady=${input.finalCostAudit?.route4xxSourceReady === true}`,
        `retry4xxClassified=${input.analyticsRuntime?.retry4xxClassified === true}`,
      ],
      reason: route4xxGuarded
        ? "Latest diagnostics classify 4xx/retry paths source-side and avoid generic retry-storm owner review."
        : "Route 4xx readiness needs current diagnostics and retry classification.",
      nextAction: "Keep noisy 4xx routes typed, deduped, and non-retryable unless a validator proves retry is needed.",
    }),
    bigQuery: lane({
      id: "bigQuery",
      label: "BigQuery",
      owner: "analytics-export",
      status: bigQueryGuarded ? "source_ready_batched_or_cached" : "cost_review_required",
      sourceGuarded: bigQueryGuarded,
      externalBillingReviewed: false,
      externalReviewRequired: true,
      sourceFiles: [
        "agent/state/bigquery-cloud-pipeline-closure.generated.json",
        "functions/src/analytics-bigquery-export.ts",
        "src/lib/analytics/bigquery-export-contract.ts",
      ],
      evidence: [
        `bigQueryClosureCurrent=${bigQueryCurrent}`,
        `scheduledWindowExportEnabled=${input.bigQuery?.scheduledWindowExportEnabled === true}`,
        `eventTriggeredExportDisabled=${input.bigQuery?.eventTriggeredExportDisabled === true}`,
        `watermarkDefined=${input.bigQuery?.watermarkDefined === true}`,
        `queryCostGuardDefined=${input.bigQuery?.queryCostGuardDefined === true}`,
        "externalBillingReviewed=false",
      ],
      reason: bigQueryGuarded
        ? "BigQuery export is batched, watermarked, and query-guarded; provider billing/freshness remains external."
        : "BigQuery source guard evidence is missing or stale.",
      nextAction: "Verify BigQuery provider heartbeat/billing externally before treating warehouse evidence as full proof.",
    }),
    analyticsIngestRetryStorms: lane({
      id: "analyticsIngestRetryStorms",
      label: "Analytics ingest/retry storms",
      owner: "analytics-runtime",
      status: analyticsGuarded ? "source_ready_retry_storm_guarded" : "cost_review_required",
      sourceGuarded: analyticsGuarded,
      externalBillingReviewed: false,
      externalReviewRequired: false,
      sourceFiles: [
        "agent/state/analytics-cost-runtime-inventory.generated.json",
        "src/app/api/analytics/ingest/route.ts",
      ],
      evidence: [
        `analyticsRuntimeCurrent=${analyticsCurrent}`,
        `ingestGuarded=${input.analyticsRuntime?.ingestGuarded === true}`,
        `retry4xxClassified=${input.analyticsRuntime?.retry4xxClassified === true}`,
      ],
      reason: analyticsGuarded
        ? "Analytics ingest has source-level batching/retry classification evidence."
        : "Analytics ingest cost lane needs source-level retry and batching proof.",
      nextAction: "Keep non-priority analytics batched and avoid retrying validation failures.",
    }),
    scheduledRuntimeJobs: lane({
      id: "scheduledRuntimeJobs",
      label: "Scheduled/runtime job scan cost",
      owner: "runtime-jobs",
      status: scheduledGuarded ? "source_ready_batched_or_cached" : "cost_review_required",
      sourceGuarded: scheduledGuarded,
      externalBillingReviewed: false,
      externalReviewRequired: true,
      sourceFiles: [
        "agent/state/final-cost-audit-lock.generated.json",
        "agent/state/scheduled-runtime-cost-reduction.generated.json",
      ],
      evidence: [
        `finalCostCurrent=${finalCurrent}`,
        `scheduledRuntimeGuarded=${input.finalCostAudit?.scheduledRuntimeGuarded === true}`,
        "externalBillingReviewed=false",
      ],
      reason: scheduledGuarded
        ? "Scheduled/runtime scan jobs have source guard evidence; deployed schedule billing remains external."
        : "Scheduled/runtime scan job cost lane needs current source guard evidence.",
      nextAction: "Review deployed scheduler cadence and function billing externally before full closure.",
    }),
    adminAnalyticsDebugDefaultLoad: lane({
      id: "adminAnalyticsDebugDefaultLoad",
      label: "Admin analytics/debug default load",
      owner: "admin-debug",
      status: adminDefaultLoadGuarded ? "source_ready_batched_or_cached" : "cost_review_required",
      sourceGuarded: adminDefaultLoadGuarded,
      externalBillingReviewed: false,
      externalReviewRequired: false,
      sourceFiles: [
        "agent/state/final-cost-audit-lock.generated.json",
        "agent/state/admin-analytics-debug-cost-reduction.generated.json",
        "src/app/admin/debug/page.tsx",
      ],
      evidence: [
        `finalCostCurrent=${finalCurrent}`,
        `adminDefaultLoadGuarded=${input.finalCostAudit?.adminDefaultLoadGuarded === true}`,
      ],
      reason: adminDefaultLoadGuarded
        ? "Admin analytics/debug default load has source guard evidence for summary-first behavior."
        : "Admin analytics/debug load cost lane needs current source guard evidence.",
      nextAction: "Keep cold analytics/debug reads behind explicit refresh or drill-down actions.",
    }),
  };
}

export function costOwnerReviewLanesToScoreInput(lanes: CostOwnerReviewLaneMap): PublicBetaCostReadiness {
  return {
    cloudRunCostReadiness: toScoreLane(lanes.cloudRun),
    cloudSqlCostReadiness: toScoreLane(lanes.cloudSqlDataConnect),
    geminiCloudAssistCostReadiness: toScoreLane(lanes.geminiCloudAssistVertex),
    route4xxReadiness: toScoreLane(lanes.route4xx),
  };
}

function toScoreLane(lane: CostOwnerReviewLane): PublicBetaCostReadiness[keyof PublicBetaCostReadiness] {
  return {
    status: lane.status,
    detail: lane.reason,
    evidence: [
      ...lane.evidence,
      `owner=${lane.owner}`,
      `externalReviewRequired=${lane.externalReviewRequired}`,
      `externalBillingReviewed=${lane.externalBillingReviewed}`,
      `nextAction=${lane.nextAction}`,
    ],
    blocksBetaExit: false,
  };
}
