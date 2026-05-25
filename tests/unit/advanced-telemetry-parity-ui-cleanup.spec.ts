import { describe, expect, it } from "vitest";

import { buildAdvancedTelemetryParityUiState } from "@/lib/analytics/advanced-telemetry-parity-ui";

describe("advanced telemetry parity UI cleanup", () => {
  it("shows blocking semantics instead of live semantics for failed refresh diagnostics", () => {
    const ui = buildAdvancedTelemetryParityUiState({
      row: {
        checkKey: "telemetry_depth",
        status: "fail",
        confidence: 2,
        sampleCount: 500,
        passAllowed: false,
        passBlockedReason: "analytics_refresh_failures_present",
        eventSource: "analytics_rollups_daily.authenticatedEvents",
        sampleSource: "analytics_event_facts",
        action: "Fix analytics refresh failures before promoting event sample parity.",
      },
      failureClusters: [
        {
          source: "server_diagnostics",
          reasonCode: "UnknownError",
          count: 46,
          firstSeenAtUtc: "2026-05-24T15:49:14.000Z",
          lastSeenAtUtc: "2026-05-24T15:57:42.000Z",
          affectedRoute: "Analytics.IngestIdentified",
          suggestedAction: "Inspect identified ingest failures.",
          current: true,
          likelyOwner: "analytics ingest identified",
        },
      ],
    });

    expect(ui.statusBadgeLabel).toBe("BLOCKING");
    expect(ui.refreshDiagnosticsBadgeLabel).toBe("FAILED CURRENT");
    expect(ui.rawDiagnosticsDefaultOpen).toBe(false);
    expect(ui.nextAction).toContain("Fix analytics refresh failures");
    expect(ui.nextAction).not.toMatch(/which event source is missing/iu);
    expect(ui.failureClusters[0]).toMatchObject({
      likelyOwner: "analytics ingest identified",
      currentLabel: "current",
    });
  });
});
