import { describe, expect, it } from "vitest";

import { buildAnalyticsIngestIdentifiedRepairReport } from "@/lib/debug/analytics-ingest-identified-repair";

describe("analytics ingest identified repair report", () => {
  it("keeps the active failure visible while proving retry storms are blocked", () => {
    const report = buildAnalyticsIngestIdentifiedRepairReport();

    expect(report.statusBefore).toBe("current_server_error");
    expect(report.statusAfter).toBe("fixed_current");
    expect(report.failureClass).toBe("deferred_materializer_failure_and_invalid_payload_retry_storm");
    expect(report.expectedInvalidPayloadsCanReturn500).toBe(false);
    expect(report.obsoleteRouteStillRetries).toBe(false);
    expect(report.doubleCountRisk).toBe("blocked_by_event_id_dedupe_and_event_envelope");
    expect(report.safeErrorCodes).toEqual(expect.arrayContaining([
      "invalid_analytics_payload",
      "payload_too_large",
      "analytics_deferred_materializer_failed",
    ]));
  });
});
