export const ANALYTICS_NON_PRIORITY_TTL_MS = 24 * 60 * 60 * 1000;

export type AnalyticsTaskPriority =
  | "priority_live"
  | "priority_user_visible"
  | "non_priority_evidence"
  | "debug_only";

export type AnalyticsCadenceDecision = {
  taskKey: string;
  priority: AnalyticsTaskPriority;
  shouldRun: boolean;
  ttlMs: number | null;
  reason: string;
};

export type AnalyticsCadenceCostPolicyFinding = {
  id: string;
  severity: "P0" | "P1" | "P2";
  status: string;
  evidence: string[];
  nextAction: string;
};

export type AnalyticsCadenceCostPolicyReport = {
  generatedAtUtc: string;
  reportKey: "analytics-cadence-cost-policy";
  currentHead: string;
  summary: {
    nonPriorityTtlMs: number;
    priorityLivePreserved: boolean;
    bigQueryExportDetected: boolean;
    bigQueryDailyCadence: boolean;
    bigQueryQueryCostGuards: boolean;
    cloudSqlDetected: boolean;
    cloudSqlPoolBatchClassified: boolean;
    adminEvidenceCadenceGuarded: boolean;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  priorityMap: Array<{
    taskKey: string;
    priority: AnalyticsTaskPriority;
    cadence: string;
  }>;
  bigQueryFindings: AnalyticsCadenceCostPolicyFinding[];
  cloudSqlFindings: AnalyticsCadenceCostPolicyFinding[];
  cadenceFindings: AnalyticsCadenceCostPolicyFinding[];
  nextFixOrder: string[];
};

export type AnalyticsCadenceCostPolicyInputs = {
  currentHead: string;
  generatedAtUtc: string;
  sources: {
    bigQueryExport: string;
    cloudSql: string;
    adminAnalyticsData: string;
    priorityIngest: string;
  };
};

const priorityTasks: Record<string, AnalyticsTaskPriority> = {
  analytics_ingest: "priority_live",
  identity_link: "priority_live",
  runtime_watch_heartbeat: "priority_live",
  creator_dashboard_stats: "priority_user_visible",
  user_visible_stats: "priority_user_visible",
  bigquery_raw_events_export: "non_priority_evidence",
  admin_evidence_refresh: "non_priority_evidence",
  admin_historical_sources: "non_priority_evidence",
  score_artifact_refresh: "non_priority_evidence",
  stale_report_check: "non_priority_evidence",
  debug_panel_source_evidence: "debug_only",
};

function toTimeMs(value: number | string | Date | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const timestamp = value instanceof Date ? value.getTime() : typeof value === "number" ? value : Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function classifyAnalyticsTaskPriority(taskKey: string): AnalyticsTaskPriority {
  return priorityTasks[taskKey] ?? "non_priority_evidence";
}

export function shouldRunNonPriorityAnalytics(
  lastRunAt: number | string | Date | null | undefined,
  now: number | string | Date = Date.now(),
) {
  const lastRunMs = toTimeMs(lastRunAt);
  const nowMs = toTimeMs(now) ?? Date.now();
  if (lastRunMs === null) return true;
  return nowMs - lastRunMs >= ANALYTICS_NON_PRIORITY_TTL_MS;
}

export function assertNonPriorityCadence(
  taskKey: string,
  lastRunAt: number | string | Date | null | undefined,
  now: number | string | Date = Date.now(),
): AnalyticsCadenceDecision {
  const priority = classifyAnalyticsTaskPriority(taskKey);
  if (priority === "priority_live" || priority === "priority_user_visible") {
    return {
      taskKey,
      priority,
      shouldRun: true,
      ttlMs: null,
      reason: "priority analytics is not blocked by non-priority evidence cadence",
    };
  }

  const shouldRun = shouldRunNonPriorityAnalytics(lastRunAt, now);
  return {
    taskKey,
    priority,
    shouldRun,
    ttlMs: ANALYTICS_NON_PRIORITY_TTL_MS,
    reason: shouldRun ? "non-priority analytics cadence window elapsed" : "non-priority analytics cadence window still active",
  };
}

function includesAll(source: string, needles: RegExp[]) {
  return needles.every((needle) => needle.test(source));
}

function finding(input: AnalyticsCadenceCostPolicyFinding): AnalyticsCadenceCostPolicyFinding {
  return input;
}

function countSeverity(findings: AnalyticsCadenceCostPolicyFinding[], severity: "P0" | "P1" | "P2") {
  return findings.filter((entry) => entry.severity === severity).length;
}

export function buildAnalyticsCadenceCostPolicyReport(
  input: AnalyticsCadenceCostPolicyInputs,
): AnalyticsCadenceCostPolicyReport {
  const bigQueryExportDetected = /BigQuery|bigquery|raw_events|dataset\.table|@google-cloud\/bigquery/iu.test(input.sources.bigQueryExport);
  const bigQueryDailyCadence = /BIGQUERY_EXPORT_MIN_CADENCE_MS|ANALYTICS_NON_PRIORITY_TTL_MS|24\s*\*\s*60\s*\*\s*60\s*\*\s*1000|daily cadence/iu.test(input.sources.bigQueryExport);
  const bigQueryQueryCostGuards = includesAll(input.sources.bigQueryExport, [
    /dryRun|dry-run/iu,
    /maximumBytesBilled|max bytes|maximum bytes/iu,
    /timePartitioning|partition/iu,
  ]);
  const cloudSqlDetected = /Cloud SQL|cloudsql|dataconnect|postgres|mysql|prisma|DATABASE_URL|kandydrops-db/iu.test(input.sources.cloudSql);
  const cloudSqlPoolBatchClassified = cloudSqlDetected && /agent-context mirror|pool|batch|connection reuse|not product runtime|external billing observed/iu.test(input.sources.cloudSql);
  const adminEvidenceCadenceGuarded = /ANALYTICS_NON_PRIORITY_TTL_MS|ADMIN_ANALYTICS_HISTORICAL_CACHE_TTL_MS\s*=\s*ANALYTICS_NON_PRIORITY_TTL_MS|24h/iu.test(input.sources.adminAnalyticsData);
  const priorityLivePreserved = /analytics_ingest|priority_live|runtime_watch|identity_link|materializeUserTrackingIndexes/iu.test(input.sources.priorityIngest);

  const bigQueryFindings = bigQueryExportDetected
    ? [
      finding({
        id: "bigquery-raw-events-daily-cadence",
        severity: bigQueryDailyCadence && bigQueryQueryCostGuards ? "P2" : "P1",
        status: bigQueryDailyCadence && bigQueryQueryCostGuards
          ? "daily_cadence_guarded_partitioned_query_cost_guard_documented"
          : "bigquery_export_cost_guard_incomplete",
        evidence: [
          "functions/src/analytics-bigquery-export.ts is the detected raw-events export source.",
          bigQueryDailyCadence ? "Daily cadence guard source is present." : "Daily cadence guard source is missing.",
          bigQueryQueryCostGuards ? "Dry-run/max-bytes/partition query guard contract is present." : "Dry-run/max-bytes/partition query guard contract is missing.",
        ],
        nextAction: "Keep raw-events export as non-priority evidence and do not promote BigQuery rows to product truth without reconciliation.",
      }),
    ]
    : [
      finding({
        id: "bigquery-export-not-detected",
        severity: "P2",
        status: "bigquery_export_not_detected_in_repo",
        evidence: ["No BigQuery export source detected in scoped source input."],
        nextAction: "Do not invent BigQuery fixes; confirm provider billing externally if costs appear.",
      }),
    ];

  const cloudSqlFindings = cloudSqlDetected
    ? [
      finding({
        id: "cloud-sql-dataconnect-batch-classification",
        severity: cloudSqlPoolBatchClassified ? "P2" : "P1",
        status: cloudSqlPoolBatchClassified
          ? "cloud_sql_dataconnect_agent_context_mirror_batch_classified_external_billing_observed"
          : "cloud_sql_detected_pool_batch_classification_missing",
        evidence: [
          "Cloud SQL/Data Connect source is detected in repo doctrine/config.",
          cloudSqlPoolBatchClassified
            ? "Source is classified as agent-context mirror / batched sidecar, not product runtime SQL."
            : "Detected SQL source lacks pool/batch/sidecar classification.",
          "External billing observation still requires owner review outside source-only validation.",
        ],
        nextAction: "Inspect GCP Cloud SQL instance/process externally; do not add runtime SQL code in product paths.",
      }),
    ]
    : [
      finding({
        id: "cloud-sql-not-detected-billing-observed",
        severity: "P2",
        status: "cloud_sql_not_detected_in_repo_but_billing_observed",
        evidence: ["No SQL runtime source detected; operator billing context still observed Cloud SQL cost."],
        nextAction: "Inspect GCP Cloud SQL instance/process externally before source changes.",
      }),
    ];

  const cadenceFindings = [
    finding({
      id: "non-priority-analytics-24h-ttl",
      severity: adminEvidenceCadenceGuarded ? "P2" : "P1",
      status: adminEvidenceCadenceGuarded ? "non_priority_evidence_24h_cadence_guarded" : "non_priority_evidence_24h_cadence_missing",
      evidence: [
        `ANALYTICS_NON_PRIORITY_TTL_MS=${ANALYTICS_NON_PRIORITY_TTL_MS}`,
        adminEvidenceCadenceGuarded ? "Admin/evidence cold-source cache references the daily TTL." : "Admin/evidence cold-source cache lacks the daily TTL.",
      ],
      nextAction: "Keep non-priority evidence refresh/export/check work at daily cadence unless a user-visible owner promotes it.",
    }),
    finding({
      id: "priority-live-telemetry-preserved",
      severity: priorityLivePreserved ? "P2" : "P0",
      status: priorityLivePreserved ? "priority_live_not_downgraded" : "priority_live_missing_or_downgraded",
      evidence: [
        "priority_live covers event ingest, identity link, and runtime watch heartbeat.",
        priorityLivePreserved ? "Priority ingest source remains represented." : "Priority ingest source was not represented.",
      ],
      nextAction: "Do not block core event ingest, identity linking, or runtime watch heartbeat behind the 24h evidence TTL.",
    }),
  ];

  const allFindings = [...bigQueryFindings, ...cloudSqlFindings, ...cadenceFindings];
  return {
    generatedAtUtc: input.generatedAtUtc,
    reportKey: "analytics-cadence-cost-policy",
    currentHead: input.currentHead,
    summary: {
      nonPriorityTtlMs: ANALYTICS_NON_PRIORITY_TTL_MS,
      priorityLivePreserved,
      bigQueryExportDetected,
      bigQueryDailyCadence,
      bigQueryQueryCostGuards,
      cloudSqlDetected,
      cloudSqlPoolBatchClassified,
      adminEvidenceCadenceGuarded,
      p0Count: countSeverity(allFindings, "P0"),
      p1Count: countSeverity(allFindings, "P1"),
      p2Count: countSeverity(allFindings, "P2"),
    },
    priorityMap: [
      { taskKey: "analytics_ingest", priority: "priority_live", cadence: "immediate" },
      { taskKey: "identity_link", priority: "priority_live", cadence: "immediate" },
      { taskKey: "runtime_watch_heartbeat", priority: "priority_live", cadence: "10s playback heartbeat" },
      { taskKey: "creator_dashboard_stats", priority: "priority_user_visible", cadence: "on demand / user-visible" },
      { taskKey: "bigquery_raw_events_export", priority: "non_priority_evidence", cadence: "24h minimum" },
      { taskKey: "admin_evidence_refresh", priority: "non_priority_evidence", cadence: "24h minimum" },
      { taskKey: "debug_panel_source_evidence", priority: "debug_only", cadence: "24h minimum unless operator-forced" },
    ],
    bigQueryFindings,
    cloudSqlFindings,
    cadenceFindings,
    nextFixOrder: [
      "Move any remaining non-priority export/evidence route that performs cold reads to ANALYTICS_NON_PRIORITY_TTL_MS.",
      "Inspect Cloud SQL/Data Connect provider process externally because source only classifies it as agent-context mirror.",
      "If warehouse query code is added later, enforce dryRun, maximumBytesBilled, and partition filters before execution.",
    ],
  };
}

export function validateAnalyticsCadenceCostPolicyReport(report: AnalyticsCadenceCostPolicyReport) {
  const failures: string[] = [];
  if (report.reportKey !== "analytics-cadence-cost-policy") failures.push("reportKey must be analytics-cadence-cost-policy.");
  if (report.summary.nonPriorityTtlMs !== ANALYTICS_NON_PRIORITY_TTL_MS) failures.push("non-priority analytics lacks 24h TTL.");
  if (!report.summary.priorityLivePreserved) failures.push("priority ingest is downgraded or missing.");
  if (report.summary.bigQueryExportDetected && !report.summary.bigQueryDailyCadence) failures.push("BigQuery export source lacks daily cadence.");
  if (report.summary.bigQueryExportDetected && !report.summary.bigQueryQueryCostGuards) failures.push("BigQuery export source lacks query cost guards.");
  if (report.summary.cloudSqlDetected && !report.summary.cloudSqlPoolBatchClassified) failures.push("Cloud SQL detected but no pool/batch/cost finding.");
  if (!report.cloudSqlFindings.some((entry) => /billing_observed|external billing/i.test(`${entry.status} ${entry.evidence.join(" ")}`))) {
    failures.push("report ignores billing-observed Cloud SQL cost.");
  }
  if (!report.summary.adminEvidenceCadenceGuarded) failures.push("debug/evidence routes refresh eagerly or lack 24h cadence.");
  if (report.nextFixOrder.length === 0) failures.push("nextFixOrder must not be empty.");
  return { failures };
}
