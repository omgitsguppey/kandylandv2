import { describe, expect, it } from "vitest";

import {
  TELEMETRY_ADMIN_HEALTH_LANE_IDS,
  buildAdminTelemetryHealth,
  validateAdminTelemetryHealth,
} from "@/lib/server/admin-telemetry-health";

describe("telemetry admin debug truth", () => {
  it("builds every required telemetry health lane with explicit source state and next action", () => {
    const health = buildAdminTelemetryHealth({
      nowMs: Date.parse("2026-05-19T23:30:00.000Z"),
      routeRuntimeHealth: [],
      runtimeWarnings: [],
      adminMetricSnapshots: [],
      externalAnalyticsState: {
        ga4Statuses: ["ga4_config_missing"],
        posthogStatuses: ["posthog_missing"],
        firstPartyAnalyticsPrimary: true,
        externalAnalyticsProductTruth: false,
        missingExternalAnalyticsTrafficBehavior: "unavailable_not_zero",
        defaultDataApiCallsBlocked: true,
      },
      bigQueryEvidenceState: {
        status: "config_missing",
        evidenceOnly: true,
        primaryProductTruth: false,
        trafficInterpretation: "unavailable_not_zero",
      },
    });

    expect(health.lanes.map((lane) => lane.id)).toEqual(TELEMETRY_ADMIN_HEALTH_LANE_IDS);
    for (const lane of health.lanes) {
      expect(lane.nextAction).not.toHaveLength(0);
      expect(lane.sourceTruth).not.toHaveLength(0);
      expect(lane.lastKnownEvidence).not.toBe("0");
      expect(["live", "degraded", "unavailable", "disabled", "config_missing", "source_ready", "runtime_unproven"]).toContain(lane.status);
    }
  });

  it("does not show unavailable GA4 or BigQuery as zero traffic or exported", () => {
    const health = buildAdminTelemetryHealth({
      externalAnalyticsState: {
        ga4Statuses: ["ga4_config_missing"],
        posthogStatuses: ["posthog_missing"],
        firstPartyAnalyticsPrimary: true,
        externalAnalyticsProductTruth: false,
        missingExternalAnalyticsTrafficBehavior: "unavailable_not_zero",
        defaultDataApiCallsBlocked: true,
      },
      bigQueryEvidenceState: {
        status: "config_missing",
        evidenceOnly: true,
        primaryProductTruth: false,
        trafficInterpretation: "unavailable_not_zero",
      },
    });

    const external = health.lanes.find((lane) => lane.id === "ga4_external_evidence");
    const bigQuery = health.lanes.find((lane) => lane.id === "bigquery_export");

    expect(external?.status).toBe("config_missing");
    expect(external?.lastKnownEvidence).toContain("unavailable");
    expect(external?.lastKnownEvidence).not.toContain("0");
    expect(bigQuery?.status).toBe("config_missing");
    expect(bigQuery?.lastKnownEvidence).toContain("config missing");
    expect(bigQuery?.lastKnownEvidence).not.toContain("exported");
  });

  it("marks source-ready runtime watch separately from proven runtime evidence", () => {
    const health = buildAdminTelemetryHealth({
      routeRuntimeHealth: [],
      adminMetricSnapshots: [],
    });

    const watchTime = health.lanes.find((lane) => lane.id === "watch_time");

    expect(watchTime?.status).toBe("runtime_unproven");
    expect(watchTime?.sourceTruth).toContain("watch sessions");
    expect(watchTime?.nextAction).toContain("deployed");
  });

  it("validates compact summary rules and raw detail drilldown policy", () => {
    const health = buildAdminTelemetryHealth({
      adminMetricSnapshots: [{ moduleKey: "audience", truthState: "verified", generatedAt: "2026-05-19T23:29:00.000Z" }],
      runtimeWarnings: [{ status: "degraded", updatedAt: Date.parse("2026-05-19T23:28:00.000Z") }],
    });

    const result = validateAdminTelemetryHealth(health);

    expect(health.rawDetailsDefault).toBe(false);
    expect(health.defaultAdminLoadPolicy).toBe("compact_summary_only");
    expect(result.ok).toBe(true);
    expect(result.findings).toEqual([]);
  });
});
