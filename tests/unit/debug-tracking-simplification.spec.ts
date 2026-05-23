import { describe, expect, it } from "vitest";

import {
  DEBUG_TRACKING_SUMMARY_LANE_IDS,
  buildDebugPanelTrackingSummary,
} from "@/lib/debug/debug-panel-tracking-summary";

describe("debug tracking simplification", () => {
  it("builds one owned summary lane for each tracking system with raw details collapsed", () => {
    const summary = buildDebugPanelTrackingSummary({
      identityHandoff: { status: "live", duplicateCountGuardActive: true },
      eventEnvelope: { status: "live", missingEnvelopeFieldsByFeature: [] },
      legacyRecovery: { status: "ready_for_dry_run_review", mutationsAllowed: false },
      telemetryHealth: {
        summary: { degraded: 1, runtimeUnproven: 1, unavailable: 0 },
        lanes: [{ id: "client_tracking" }, { id: "event_facts" }],
      },
      behavioralSnapshotStatus: { status: "source_ready" },
      costControls: { status: "bounded_initial_summary" },
      routeRuntimeHealthSummary: { fail: 0, warn: 2, stale: 1 },
      runtimeWarningSummary: { failed: 0, degraded: 1, total: 3 },
      debugBacklogSummary: { p0P1Open: 2, open: 7 },
      stats: { receiptsLast7d: 12 },
    });

    expect(summary.rawDetailsDefaultOpen).toBe(false);
    expect(summary.defaultView).toBe("tracking_summary_lanes");
    expect(summary.rawDetailPolicy).toBe("drilldown_only");
    expect(summary.lanes.map((lane) => lane.id).sort()).toEqual([...DEBUG_TRACKING_SUMMARY_LANE_IDS].sort());
    expect(new Set(summary.lanes.map((lane) => lane.trackingSystem)).size).toBe(summary.lanes.length);
    expect(summary.lanes.every((lane) => lane.sourceOwner && lane.sourceOfTruth && lane.drilldownTarget)).toBe(true);
  });

  it("sorts critical tracking lanes first without hiding p1 or p2 backlog", () => {
    const summary = buildDebugPanelTrackingSummary({
      identityHandoff: { status: "live" },
      eventEnvelope: { status: "live" },
      legacyRecovery: { status: "ready_for_dry_run_review" },
      telemetryHealth: { summary: { degraded: 0, runtimeUnproven: 0, unavailable: 0 }, lanes: [] },
      behavioralSnapshotStatus: { status: "live" },
      costControls: { status: "bounded_initial_summary" },
      routeRuntimeHealthSummary: { fail: 3, warn: 0, stale: 0 },
      runtimeWarningSummary: { failed: 1, degraded: 0, total: 1 },
      debugBacklogSummary: { p0P1Open: 4, open: 9 },
      stats: {},
    });

    expect(summary.lanes[0]).toMatchObject({
      id: "runtime_debug_evidence",
      severity: "p1",
    });
    expect(summary.lanes.find((lane) => lane.id === "open_p1_p2_backlog")).toMatchObject({
      criticalCount: 4,
      sourceOwner: "admin_debug",
    });
  });

  it("collapses duplicate monitors into one source of truth per lane", () => {
    const summary = buildDebugPanelTrackingSummary({
      identityHandoff: { status: "degraded" },
      eventEnvelope: { status: "degraded", missingEnvelopeFieldsByFeature: [{ featureId: "x", missingFields: ["consentMode"] }] },
      legacyRecovery: { status: "ready_for_dry_run_review" },
      telemetryHealth: { summary: { degraded: 3, runtimeUnproven: 0, unavailable: 1 }, lanes: [{ id: "a" }] },
      behavioralSnapshotStatus: { status: "stale" },
      costControls: { status: "bounded_initial_summary" },
      routeRuntimeHealthSummary: { fail: 0, warn: 0, stale: 0 },
      runtimeWarningSummary: { failed: 0, degraded: 0, total: 0 },
      debugBacklogSummary: { p0P1Open: 0, open: 2 },
      stats: {},
    });

    expect(summary.duplicateMonitorGroups).toEqual([
      "identity",
      "consent",
      "event_envelope",
      "behavior_math",
      "feature_coverage",
      "settings",
      "legacy_recovery",
      "wallet_funnel",
      "runtime_debug",
      "cost",
      "backlog",
    ]);
    expect(summary.validation.duplicateTrackingSystems).toEqual([]);
    expect(summary.validation.rawDumpsBeforeSummary).toBe(false);
  });
});
