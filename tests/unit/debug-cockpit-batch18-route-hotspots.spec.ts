import { describe, expect, it } from "vitest";

import { buildDebugCockpitBatch18RouteHotspotsReport } from "@/lib/debug/debug-cockpit-batch18-route-hotspots";

describe("debug cockpit batch 18 route hotspots", () => {
  it("locks active route failure repair, wallet classification, and latency prioritization", () => {
    const report = buildDebugCockpitBatch18RouteHotspotsReport();

    expect(report.ingestIdentifiedStatusBefore).toBe("current_server_error");
    expect(report.ingestIdentifiedStatusAfter).toBe("fixed_current");
    expect(report.ingestIdentifiedFailureClass).toBe("deferred_materializer_failure_and_invalid_payload_retry_storm");
    expect(report.ingestIdentifiedRetryableStatus).toBe("expected_failures_retryable_false");
    expect(report.walletPackagesStatusBefore).toBe("current_client_error");
    expect(report.walletPackagesStatusAfter).toBe("expected_typed_client_error");
    expect(report.currentServerFailuresAfter).toBe(0);
    expect(report.currentClientErrorsAfter).toBe(0);
    expect(report.historicalErrorRoutes).toEqual(expect.arrayContaining([
      "admin/analytics/historical:GET",
      "auth/navigation-session:POST",
      "creator/relationships:POST",
    ]));
    expect(report.currentSlowRoutes).toEqual(expect.arrayContaining([
      "admin/overview:GET",
      "admin/debug/control-tower:GET",
    ]));
    expect(report.scoreDimensions).toEqual(expect.arrayContaining([
      "sourceHealth",
      "runtimeHealth",
      "evidenceCompleteness",
      "freshness",
      "costRisk",
      "regressionRisk",
    ]));
  });
});
