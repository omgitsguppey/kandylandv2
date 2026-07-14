import { describe, expect, it } from "vitest";

import {
  buildAnalyticsCostRuntimeInventoryReport,
  validateAnalyticsCostRuntimeInventoryReport,
  type AnalyticsCostRuntimeInventoryInputs,
} from "../../scripts/agent/validate-analytics-cost-runtime-inventory";

function inputsFixture(overrides: Partial<AnalyticsCostRuntimeInventoryInputs> = {}): AnalyticsCostRuntimeInventoryInputs {
  const inputs: AnalyticsCostRuntimeInventoryInputs = {
    currentHead: "head",
    generatedAtUtc: "2026-05-18T18:00:00.000Z",
    sources: {
      deepTracker: "const GUEST_ANALYTICS_FLUSH_INTERVAL_MS = 2_500; fetch('/api/analytics/ingest')",
      analyticsIngestRoute: "export const dynamic = \"force-dynamic\"; materializeUserTrackingIndexes({ maxFacts: 500 }); return NextResponse.json({ success: false, retryable: true }, { status: 503 });",
      analyticsEventContract: "identityState: AnalyticsIdentityState; userId: string | null; anonymousVisitorId: string | null;",
      runtimeWatchTime: "RUNTIME_WATCH_HEARTBEAT_INTERVAL_MS = 10_000; validateRuntimeWatchEventPayload",
      bigQueryExport: "new BigQuery(); dataset.createTable(TABLE_ID, { timePartitioning: { type: 'DAY' }, clustering: { fields: ['eventName'] } }); dataset.table(TABLE_ID).insert([row])",
      adminAnalyticsData: "safeRunReport(analyticsClient, {}); safeQueryWithDiagnostics({ label: 'analytics event facts', reader: () => adminDb.collection('analytics_event_facts').limit(5000).get() })",
      adminAnalyticsMaterializers: "ADMIN_ANALYTICS_CANONICAL_DISPLAY_AUTHORITY = 'analytics_admin_metric_snapshots'",
      functionsAnalyticsCore: "watchSeconds?: number; durationMs?: number;",
      functionsAnalyticsGuestBatches: "onGuestAnalyticsBatchCreated; recordSemanticRollupFromGuestBatch",
      functionsAnalyticsEventFacts: "IDENTIFIED_ANALYTICS_MAX_BATCH_EVENTS = 100; mapWithConcurrency(deduplicatedEvents, IDENTIFIED_ANALYTICS_EVENT_WRITE_CONCURRENCY",
      functionsAnalyticsSemantics: "GUEST_SEMANTIC_ROLLUP_MAX_EVENTS = 250; mapWithConcurrency(boundedEvents, GUEST_SEMANTIC_ROLLUP_CONCURRENCY",
      cloudSqlSearch: "dataconnect/dataconnect.yaml Cloud SQL kandydrops-db",
      bigQuerySearch: "functions/src/analytics-bigquery-export.ts BigQuery raw_events",
      geminiSearch: "src/lib/admin-ai-models.ts Gemini Vertex model prompt token",
      retry4xxSearch: "Guest analytics flush failed (${response.status}); retryable: true; 401 403 404 429",
      packageJson: "{}",
    },
  };

  return {
    ...inputs,
    ...overrides,
    sources: {
      ...inputs.sources,
      ...overrides.sources,
    },
  };
}

describe("analytics cost runtime inventory", () => {
  it("classifies all required cost lanes without claiming cost reduction", () => {
    const report = buildAnalyticsCostRuntimeInventoryReport(inputsFixture());

    expect(report.cloudRunFindings.length).toBeGreaterThan(0);
    expect(report.cloudSqlFindings.length).toBeGreaterThan(0);
    expect(report.bigQueryFindings.length).toBeGreaterThan(0);
    expect(report.geminiCloudAssistFindings.length).toBeGreaterThan(0);
    expect(validateAnalyticsCostRuntimeInventoryReport(report).failures).toEqual([]);
    expect(JSON.stringify(report)).not.toMatch(/cost reduction achieved|reduced cost|cost win/iu);
  });

  it("reports Cloud SQL not detected as inventory, not pass", () => {
    const report = buildAnalyticsCostRuntimeInventoryReport(inputsFixture({
      sources: { cloudSqlSearch: "" },
    }));

    expect(report.summary.cloudSqlDetected).toBe(false);
    expect(report.cloudSqlFindings[0]?.status).toBe("cloud_sql_not_detected_in_repo");
    expect(report.cloudSqlFindings[0]?.status).not.toMatch(/\bpass(ed)?\b/iu);
  });

  it("reports BigQuery not detected as inventory, not pass", () => {
    const report = buildAnalyticsCostRuntimeInventoryReport(inputsFixture({
      sources: { bigQueryExport: "", bigQuerySearch: "" },
    }));

    expect(report.summary.bigQueryDetected).toBe(false);
    expect(report.bigQueryFindings[0]?.status).toBe("bigquery_not_detected_in_repo");
    expect(report.bigQueryFindings[0]?.status).not.toMatch(/\bpass(ed)?\b/iu);
  });

  it("reports Gemini and Vertex not detected as inventory, not pass", () => {
    const report = buildAnalyticsCostRuntimeInventoryReport(inputsFixture({
      sources: { geminiSearch: "" },
    }));

    expect(report.summary.geminiCloudAssistDetected).toBe(false);
    expect(report.geminiCloudAssistFindings[0]?.status).toBe("gemini_cloud_assist_not_detected_in_repo");
    expect(report.geminiCloudAssistFindings[0]?.status).not.toMatch(/\bpass(ed)?\b/iu);
  });

  it("classifies the current event-triggered batch, permanent failure policy, and off-hot-path outbox from source", () => {
    const report = buildAnalyticsCostRuntimeInventoryReport(inputsFixture({
      sources: {
        deepTracker: 'scheduleNonPriorityFlush(); flushQueue("batch");',
        telemetry: 'shouldAdvanceGuestAnalyticsQueue(outcome); permanent_failure; return outcome.status !== "retryable_failure";',
        analyticsIngestRoute: 'writeBehavioralTimelineProjection({ queueMode: "written_with_outbox" });',
      },
    }));

    expect(report.cloudRunFindings.find((entry) => entry.id === "analytics-ingest-cloud-run-request-work")?.status)
      .toBe("source_bounded_outbox_external_runtime_evidence_required");
    expect(report.cloudRunFindings.find((entry) => entry.id === "guest-analytics-flush-cadence")?.status)
      .toBe("source_bounded_event_triggered_15s_batch");
    expect(report.retry4xxFindings.find((entry) => entry.id === "analytics-ingest-503-retryable")?.status)
      .toBe("source_classifies_permanent_4xx_and_transient_retry");
    expect(report.analyticsCadenceFindings.find((entry) => entry.id === "deeptracker-non-priority-cadence")?.status)
      .toBe("source_bounded_event_triggered_guest_batch");
  });

  it("fails validation when analytics cadence, 4xx retry, guest/user, or watch-time inventory is missing", () => {
    const report = buildAnalyticsCostRuntimeInventoryReport(inputsFixture());
    report.analyticsCadenceFindings = [];
    report.retry4xxFindings = [];
    report.trackingFindings = [];
    report.watchTimeFindings = [];
    report.nextFixOrder = [];

    const result = validateAnalyticsCostRuntimeInventoryReport(report);

    expect(result.failures).toContain("analytics cadence inventory missing.");
    expect(result.failures).toContain("4xx/retry inventory missing.");
    expect(result.failures).toContain("guest/user tracking inventory missing.");
    expect(result.failures).toContain("watch-time inventory missing.");
    expect(result.failures).toContain("nextFixOrder must not be empty.");
  });
});
