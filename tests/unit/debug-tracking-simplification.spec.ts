import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  DEBUG_TRACKING_SUMMARY_LANE_IDS,
  buildDebugPanelTrackingSummary,
} from "@/lib/debug/debug-panel-tracking-summary";

describe("debug tracking simplification", () => {
  it("keeps the tracking summary in the compact Now tab before heavy drilldowns", () => {
    const root = process.cwd();
    const pageSource = readFileSync(join(root, "src/app/admin/debug/page.tsx"), "utf8");
    const nowTabSource = readFileSync(join(root, "src/app/admin/debug/components/DebugTabNow.tsx"), "utf8");

    expect(pageSource).toContain("trackingSummary={data?.trackingSummary}");
    expect(pageSource).not.toContain("<DebugTrackingSummaryPanel trackingSummary={data?.trackingSummary} />");
    expect(nowTabSource.indexOf("<DebugTrackingSummaryPanel trackingSummary={trackingSummary} />")).toBeGreaterThan(-1);
    expect(nowTabSource.indexOf("<DebugTrackingSummaryPanel trackingSummary={trackingSummary} />")).toBeLessThan(
      nowTabSource.indexOf("<DebugRecoveryEvidenceSummary"),
    );
  });

  it("builds one owned summary lane for each tracking system with raw details collapsed", () => {
    const summary = buildDebugPanelTrackingSummary({
      identityHandoff: { status: "live", duplicateCountGuardActive: true },
      eventEnvelope: { status: "live", missingEnvelopeFieldsByFeature: [] },
      eventTranslationBridge: {
        status: "pass",
        debugLane: {
          producersRegistered: 160,
          producersConnected: 160,
          eventEnvelopesTranslated: 160,
          materializersMapped: 160,
          personMetricsMapped: 22,
          gaps: 0,
        },
      },
      personMetricsHydration: {
        status: "pass",
        debugLane: {
          personMetricsMapped: 23,
          eventEnvelopesHydrated: 20,
          globalMetricsHydrated: 20,
          signedInMetricsHydrated: 12,
          linkedPersonMetricsHydrated: 4,
          lowConfidenceMetrics: 3,
          gaps: 0,
        },
      },
      telemetryTriggerTestMatrix: {
        status: "pass",
        debugLane: {
          totalTriggers: 23,
          coveredTriggers: 23,
          missingTriggerTests: 0,
          uiOnlyTests: 0,
          waitingOnActivityDeterministicGaps: 0,
        },
      },
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
    expect(summary.lanes.find((lane) => lane.id === "event_translation_bridge")).toMatchObject({
      label: "Event translation bridge",
      status: "live",
      criticalCount: 0,
      warningCount: 0,
    });
    expect(summary.lanes.find((lane) => lane.id === "person_metrics_hydration")).toMatchObject({
      label: "Person metrics hydration",
      status: "source_ready_collecting",
      criticalCount: 0,
      warningCount: 3,
    });
    expect(summary.lanes.find((lane) => lane.id === "testing_coverage")).toMatchObject({
      label: "Testing coverage",
      status: "healthy_current",
      criticalCount: 0,
      warningCount: 0,
    });
  });

  it("reports an absent person runtime sample without inventing warnings", () => {
    const summary = buildDebugPanelTrackingSummary({
      personMetricsHydration: {
        status: "review",
        evidenceMode: "runtime_evidence_required",
        debugLane: {
          personMetricsMapped: 37,
          eventEnvelopesHydrated: 0,
          globalMetricsHydrated: 0,
          signedInMetricsHydrated: 0,
          linkedPersonMetricsHydrated: 0,
          lowConfidenceMetrics: 37,
          gaps: 0,
        },
      },
      stats: {},
    });

    expect(summary.lanes.find((lane) => lane.id === "person_metrics_hydration")).toMatchObject({
      status: "source_ready_no_sample_loaded",
      warningCount: 0,
      primarySignal: expect.stringContaining("Evidence=runtime_evidence_required"),
    });
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
      eventTranslationBridge: {
        status: "fail",
        debugLane: {
          producersRegistered: 10,
          producersConnected: 8,
          eventEnvelopesTranslated: 9,
          materializersMapped: 8,
          personMetricsMapped: 4,
          gaps: 2,
        },
      },
      personMetricsHydration: {
        status: "fail",
        debugLane: {
          personMetricsMapped: 20,
          eventEnvelopesHydrated: 4,
          globalMetricsHydrated: 4,
          signedInMetricsHydrated: 2,
          linkedPersonMetricsHydrated: 1,
          lowConfidenceMetrics: 6,
          gaps: 2,
        },
      },
      telemetryTriggerTestMatrix: {
        status: "pass",
        debugLane: {
          totalTriggers: 23,
          coveredTriggers: 23,
          missingTriggerTests: 0,
          uiOnlyTests: 0,
          waitingOnActivityDeterministicGaps: 0,
        },
      },
      legacyRecovery: { status: "ready_for_dry_run_review" },
      telemetryHealth: { summary: { degraded: 3, runtimeUnproven: 0, unavailable: 1 }, lanes: [{ id: "a" }] },
      behavioralSnapshotStatus: { status: "stale" },
      costControls: { status: "bounded_initial_summary" },
      routeRuntimeHealthSummary: { fail: 0, warn: 0, stale: 0 },
      runtimeWarningSummary: { failed: 0, degraded: 0, total: 0 },
      debugBacklogSummary: { p0P1Open: 0, open: 2 },
      stats: {},
    });

    expect(summary.duplicateMonitorGroups).toEqual(expect.arrayContaining([
      "identity",
      "consent",
      "event_envelope",
      "event_translation_bridge",
      "person_metrics_hydration",
      "testing_coverage",
      "behavior_math",
      "feature_coverage",
      "settings",
      "legacy_recovery",
      "wallet_funnel",
      "runtime_debug",
      "cost",
      "backlog",
    ]));
    expect(new Set(summary.duplicateMonitorGroups).size).toBe(summary.duplicateMonitorGroups.length);
    expect(summary.validation.duplicateTrackingSystems).toEqual([]);
    expect(summary.validation.rawDumpsBeforeSummary).toBe(false);
  });
});
