import { listBigQueryExportCandidates } from "@/lib/analytics/materialization-contract";

export const BIGQUERY_EXPORT_CONTRACT_VERSION = "bigquery_cloud_pipeline_closure_v1";

export type BigQueryExportStatus =
  | "configured"
  | "config_missing"
  | "disabled"
  | "unavailable"
  | "evidence_only";

export type BigQueryExportTrigger = "scheduled" | "event" | "manual_refresh";

export interface BigQueryExportEnv {
  BQ_ANALYTICS_DATASET_ID?: string;
  BIGQUERY_ANALYTICS_DATASET_ID?: string;
  BQ_ANALYTICS_RAW_EVENTS_TABLE_ID?: string;
  BIGQUERY_ANALYTICS_RAW_EVENTS_TABLE_ID?: string;
  BQ_ANALYTICS_EXPORT_DISABLED?: string;
  BIGQUERY_ANALYTICS_EXPORT_DISABLED?: string;
}

export interface BigQueryExportRunDecision {
  shouldRun: boolean;
  reason:
    | "scheduled_window_due"
    | "manual_refresh_due"
    | "event_trigger_disabled"
    | "config_missing"
    | "disabled"
    | "ttl_not_elapsed";
}

export interface BigQueryExportEvidenceState {
  status: BigQueryExportStatus;
  evidenceOnly: boolean;
  primaryProductTruth: boolean;
  trafficInterpretation: "available_external_evidence" | "unavailable_not_zero";
  productAnalyticsFailure: boolean;
  action: "none" | "configure_bigquery_export" | "keep_first_party_summaries_primary";
}

export interface BigQueryExportContractValidation {
  ok: boolean;
  findings: string[];
}

export const BIGQUERY_EXPORT_CONTRACT = {
  version: BIGQUERY_EXPORT_CONTRACT_VERSION,
  sourceCollection: "analytics_event_facts",
  destination: {
    datasetEnvKeys: ["BQ_ANALYTICS_DATASET_ID", "BIGQUERY_ANALYTICS_DATASET_ID"],
    tableEnvKeys: ["BQ_ANALYTICS_RAW_EVENTS_TABLE_ID", "BIGQUERY_ANALYTICS_RAW_EVENTS_TABLE_ID"],
    defaultDatasetId: "kandydrops_canonical_analytics",
    defaultTableId: "raw_events",
    locationEnvKeys: ["BQ_ANALYTICS_LOCATION", "BIGQUERY_ANALYTICS_LOCATION"],
  },
  watermark: {
    collection: "analytics_export_status",
    documentId: "bigquery_raw_events",
    timestampField: "lastExportedEventTimestampMs",
    eventIdField: "lastExportedEventId",
    startedAtField: "lastExportStartedAtMs",
    failedAtField: "lastFailedAtMs",
  },
  batch: {
    maxRows: 500,
    orderBy: ["timestamp", "__name__"],
    windowStartExclusiveUnlessWatermarkEvent: true,
  },
  cadence: {
    kind: "daily_windowed",
    schedule: "0 4 * * *",
    minCadenceMs: 24 * 60 * 60 * 1000,
    eventTriggeredClaimsAllowed: false,
  },
  retry: {
    failureTtlMs: 60 * 60 * 1000,
    readinessFailureTtlMs: 60 * 60 * 1000,
    retryCount: 0,
    repeatedFailureStatusSuppressed: true,
  },
  queryCostGuards: {
    dryRunRequiredForQueries: true,
    maximumBytesBilledRequiredForQueries: true,
    partitionFilterRequired: true,
    partitionField: "timestamp",
  },
  successSemantics: {
    claimsExportedOnlyAfterInsert: true,
    statusValues: ["scheduled", "healthy", "fail", "config_missing"] as const,
    missingConfigCannotClaimExported: true,
    zeroTrafficNeverInferredFromMissingProvider: true,
  },
  truthClass: "analytics_evidence_only",
  primaryProductTruth: false,
  missingConfigTrafficBehavior: "unavailable_not_zero",
  adminEvidenceConsumer: "Admin Debug analytics export evidence",
  firstPartyFallback: {
    summaryCollections: ["analytics_admin_metric_snapshots", "analytics_rollups_daily", "analytics_event_stats"],
    missingBigQueryDoesNotFailProductAnalytics: true,
  },
} as const;

function envValue(env: BigQueryExportEnv, keys: readonly string[]) {
  for (const key of keys) {
    const value = env[key as keyof BigQueryExportEnv];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return "";
}

function disabledFlag(value?: string) {
  return value === "1" || value?.toLowerCase() === "true";
}

export function resolveBigQueryExportStatus(env: BigQueryExportEnv): BigQueryExportStatus {
  if (disabledFlag(env.BQ_ANALYTICS_EXPORT_DISABLED) || disabledFlag(env.BIGQUERY_ANALYTICS_EXPORT_DISABLED)) {
    return "disabled";
  }

  const datasetId = envValue(env, BIGQUERY_EXPORT_CONTRACT.destination.datasetEnvKeys);
  const tableId = envValue(env, BIGQUERY_EXPORT_CONTRACT.destination.tableEnvKeys);
  if (!datasetId || !tableId) {
    return "config_missing";
  }

  return "configured";
}

export function buildBigQueryExportEvidenceState(input: {
  env: BigQueryExportEnv;
  firstPartySummariesActive: boolean;
}): BigQueryExportEvidenceState {
  const status = resolveBigQueryExportStatus(input.env);
  const unavailable = status === "config_missing" || status === "disabled" || status === "unavailable";

  return {
    status,
    evidenceOnly: true,
    primaryProductTruth: false,
    trafficInterpretation: unavailable ? "unavailable_not_zero" : "available_external_evidence",
    productAnalyticsFailure: unavailable ? !input.firstPartySummariesActive : false,
    action: status === "config_missing"
      ? "configure_bigquery_export"
      : unavailable
        ? "keep_first_party_summaries_primary"
        : "none",
  };
}

export function shouldRunBigQueryExportWindow(input: {
  trigger: BigQueryExportTrigger;
  nowMs: number;
  lastRunAtMs: number;
  configPresent: boolean;
  disabled?: boolean;
}): BigQueryExportRunDecision {
  if (input.disabled) {
    return { shouldRun: false, reason: "disabled" };
  }
  if (!input.configPresent) {
    return { shouldRun: false, reason: "config_missing" };
  }
  if (input.trigger === "event") {
    return { shouldRun: false, reason: "event_trigger_disabled" };
  }

  if (input.lastRunAtMs > 0 && input.nowMs - input.lastRunAtMs < BIGQUERY_EXPORT_CONTRACT.cadence.minCadenceMs) {
    return { shouldRun: false, reason: "ttl_not_elapsed" };
  }

  return {
    shouldRun: true,
    reason: input.trigger === "manual_refresh" ? "manual_refresh_due" : "scheduled_window_due",
  };
}

export function validateBigQueryExportContractClosure(): BigQueryExportContractValidation {
  const findings: string[] = [];
  const candidates = listBigQueryExportCandidates();

  if (BIGQUERY_EXPORT_CONTRACT.cadence.eventTriggeredClaimsAllowed) {
    findings.push("BigQuery export contract still allows event-triggered claims.");
  }
  if (BIGQUERY_EXPORT_CONTRACT.cadence.kind !== "daily_windowed") {
    findings.push("BigQuery export contract is not daily/windowed.");
  }
  if (BIGQUERY_EXPORT_CONTRACT.watermark.collection !== "analytics_export_status") {
    findings.push("BigQuery export contract lacks the analytics_export_status watermark.");
  }
  if (BIGQUERY_EXPORT_CONTRACT.retry.failureTtlMs <= 0) {
    findings.push("BigQuery export contract lacks a failure TTL.");
  }
  if (!BIGQUERY_EXPORT_CONTRACT.queryCostGuards.dryRunRequiredForQueries
    || !BIGQUERY_EXPORT_CONTRACT.queryCostGuards.maximumBytesBilledRequiredForQueries
    || !BIGQUERY_EXPORT_CONTRACT.queryCostGuards.partitionFilterRequired) {
    findings.push("BigQuery export contract lacks required query cost guards.");
  }
  if (!BIGQUERY_EXPORT_CONTRACT.successSemantics.missingConfigCannotClaimExported
    || !BIGQUERY_EXPORT_CONTRACT.successSemantics.zeroTrafficNeverInferredFromMissingProvider) {
    findings.push("BigQuery export contract can misrepresent missing provider data.");
  }
  if (!candidates.includes(BIGQUERY_EXPORT_CONTRACT.sourceCollection)) {
    findings.push("BigQuery source collection is not marked export eligible in the materialization contract.");
  }

  return {
    ok: findings.length === 0,
    findings,
  };
}
