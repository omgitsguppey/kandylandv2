import { describe, expect, it } from "vitest";

import {
  ANALYTICS_NON_PRIORITY_TTL_MS,
  assertNonPriorityCadence,
  buildAnalyticsCadenceCostPolicyReport,
  classifyAnalyticsTaskPriority,
  shouldRunNonPriorityAnalytics,
  validateAnalyticsCadenceCostPolicyReport,
} from "../../src/lib/analytics/analytics-cadence-policy";

describe("analytics cadence cost policy", () => {
  it("blocks non-priority analytics inside the 24h TTL", () => {
    const now = Date.UTC(2026, 4, 18, 18);
    const lastRunAt = now - ANALYTICS_NON_PRIORITY_TTL_MS + 1;

    expect(shouldRunNonPriorityAnalytics(lastRunAt, now)).toBe(false);
    expect(assertNonPriorityCadence("bigquery_raw_events_export", lastRunAt, now).shouldRun).toBe(false);
  });

  it("allows non-priority analytics after 24h", () => {
    const now = Date.UTC(2026, 4, 18, 18);
    const lastRunAt = now - ANALYTICS_NON_PRIORITY_TTL_MS;

    expect(shouldRunNonPriorityAnalytics(lastRunAt, now)).toBe(true);
    expect(assertNonPriorityCadence("admin_evidence_refresh", lastRunAt, now).shouldRun).toBe(true);
  });

  it("never blocks priority live ingest behind evidence TTL", () => {
    const now = Date.UTC(2026, 4, 18, 18);
    const lastRunAt = now - 1;

    expect(classifyAnalyticsTaskPriority("analytics_ingest")).toBe("priority_live");
    expect(assertNonPriorityCadence("analytics_ingest", lastRunAt, now).shouldRun).toBe(true);
  });

  it("requires BigQuery export cadence, partition, and query cost guards when source is detected", () => {
    const report = buildAnalyticsCadenceCostPolicyReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-18T18:00:00.000Z",
      sources: {
        bigQueryExport: "new BigQuery(); timePartitioning: { type: \"DAY\" }; BIGQUERY_EXPORT_MIN_CADENCE_MS; BIGQUERY_EXPORT_QUERY_GUARDRAILS; maximumBytesBilled; dryRun;",
        cloudSql: "dataconnect/dataconnect.yaml Cloud SQL kandydrops-db agent-context mirror batch external billing observed",
        adminAnalyticsData: "ADMIN_ANALYTICS_HISTORICAL_CACHE_TTL_MS = ANALYTICS_NON_PRIORITY_TTL_MS",
        priorityIngest: "analytics_ingest priority_live materializeUserTrackingIndexes",
      },
    });

    expect(report.summary.bigQueryExportDetected).toBe(true);
    expect(report.bigQueryFindings[0]?.status).toContain("daily_cadence_guarded");
    expect(validateAnalyticsCadenceCostPolicyReport(report).failures).toEqual([]);
  });

  it("requires Cloud SQL pool/batch classification when SQL source is detected", () => {
    const report = buildAnalyticsCadenceCostPolicyReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-18T18:00:00.000Z",
      sources: {
        bigQueryExport: "",
        cloudSql: "dataconnect/dataconnect.yaml Cloud SQL kandydrops-db agent-context mirror batch external billing observed",
        adminAnalyticsData: "ANALYTICS_NON_PRIORITY_TTL_MS",
        priorityIngest: "analytics_ingest priority_live",
      },
    });

    expect(report.summary.cloudSqlDetected).toBe(true);
    expect(report.cloudSqlFindings[0]?.status).toContain("batch_classified");
    expect(validateAnalyticsCadenceCostPolicyReport(report).failures).toEqual([]);
  });
});
