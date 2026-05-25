import { describe, expect, it } from "vitest";

import { buildDebugCockpitBatch30TelemetryParityReport } from "@/lib/debug/debug-cockpit-batch30-telemetry-parity";

describe("debug cockpit batch 30 telemetry parity", () => {
  it("locks low-confidence samples and current refresh failures as telemetry blockers", () => {
    const report = buildDebugCockpitBatch30TelemetryParityReport({
      eventSamplesStatusBefore: "pass",
      eventSamplesConfidenceBefore: 2,
      eventSamplesPassAllowedBefore: true,
      refreshDiagnosticsStatusBefore: "fail",
      refreshFailureCount: 153,
      failureClusters: [
        {
          source: "server_diagnostics",
          reasonCode: "error",
          count: 107,
          firstSeenAtUtc: "2026-05-24T15:46:35.000Z",
          lastSeenAtUtc: "2026-05-24T15:57:42.000Z",
          suggestedAction: "Repair route attribution.",
        },
        {
          source: "server_diagnostics",
          reasonCode: "UnknownError",
          count: 46,
          firstSeenAtUtc: "2026-05-24T15:49:14.000Z",
          lastSeenAtUtc: "2026-05-24T15:57:42.000Z",
          affectedRoute: "Analytics.IngestIdentified",
          suggestedAction: "Inspect identified ingest failures.",
          current: true,
        },
      ],
    });

    expect(report.eventSamplesStatusAfter).toBe("fail");
    expect(report.eventSamplesPassAllowedAfter).toBe(false);
    expect(report.routeUnknownClusterStatus).toBe("route_unknown_actionable");
    expect(report.ingestIdentifiedClusterStatus).toBe("active_route_failing");
    expect(report.parityBlockers).toEqual(expect.arrayContaining([
      "low_confidence",
      "refresh_failures_present",
      "route_unknown_diagnostics",
      "ingest_identified_failures",
    ]));
    expect(report.telemetryParityScoreAfter).toBeLessThan(report.telemetryParityScoreBefore);
    expect(report.scoreDimensions).toEqual(expect.arrayContaining([
      "telemetryParityPassGate",
      "refreshDiagnosticsFailureClusters",
      "ingestIdentifiedParityBlocker",
      "advancedDebugDisplaySemantics",
    ]));
  });
});
