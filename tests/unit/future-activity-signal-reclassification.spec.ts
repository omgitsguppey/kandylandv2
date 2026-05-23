import { describe, expect, it } from "vitest";

import {
  classifyFutureActivitySignal,
} from "@/lib/debug/future-activity-classifier";
import {
  filterActionableActivitySignals,
  summarizeActionableActivitySignals,
} from "@/lib/debug/actionable-signal-filter";
import {
  buildDebugPanelTrackingSummary,
} from "@/lib/debug/debug-panel-tracking-summary";
import {
  buildFinalTestingTrackingTelemetryLockReport,
  validateFinalTestingTrackingTelemetryLockReport,
} from "../../scripts/agent/validate-final-testing-tracking-telemetry-lock";

const score = {
  healthScore: 63.15,
  sourceHealthScore: 91.7,
  runtimeHealthScore: 70.25,
  evidenceCompletenessScore: 41.75,
  freshnessScore: 62.86,
  costRiskScore: 42,
  regressionRiskScore: 42,
};

describe("future activity signal reclassification", () => {
  it("keeps source-ready future activity in a quiet catalog with no warning or score impact", () => {
    const result = classifyFutureActivitySignal({
      reason: "future_real_activity_pending",
      scoreDrag: false,
      nextAction: "Bridge is wired; wait for real future activity.",
    });

    expect(result).toMatchObject({
      classification: "future_activity_placeholder",
      actionable: false,
      warning: false,
      quiet: true,
      scoreImpact: false,
      evidenceGateOnly: false,
    });
  });

  it("keeps broken activity paths actionable instead of hiding them as future activity", () => {
    const summary = summarizeActionableActivitySignals([
      { reason: "future_real_activity_pending", scoreDrag: false },
      { reason: "producer_missing", scoreDrag: true, missingProducer: "creator_profile_viewed" },
      { reason: "translation_bridge_missing", scoreDrag: true },
      { reason: "materializer_missing", scoreDrag: true },
      { reason: "person_metric_classification_missing", scoreDrag: true },
      { reason: "debug_lane_missing", scoreDrag: true },
      { reason: "blocked_formal_evidence", formalEvidenceBlocked: true },
    ]);

    expect(summary.quietFutureActivityCount).toBe(1);
    expect(summary.actionableActivitySignalCount).toBe(5);
    expect(summary.brokenActivityPathCount).toBe(5);
    expect(summary.scoreDragActivityCount).toBe(5);
    expect(summary.evidenceGateOnlyCount).toBe(1);
    expect(filterActionableActivitySignals(summary.classifiedSignals).map((entry) => entry.classification)).toEqual([
      "missing_producer",
      "missing_bridge",
      "missing_materializer",
      "missing_metric_consumer",
      "broken_debug_mapping",
    ]);
  });

  it("reports quiet future counts separately from actionable waiting-on-activity counts in the final lock", () => {
    const report = buildFinalTestingTrackingTelemetryLockReport({
      generatedAtUtc: "2026-05-23T12:00:00.000Z",
      currentHead: "HEAD",
      changedFiles: [
        "agent/state/final-testing-tracking-telemetry-lock.generated.json",
        "agent/state/future-activity-signal-reclassification.generated.json",
        "docs/agent-truth/final-testing-tracking-telemetry-lock.md",
        "docs/agent-truth/future-activity-signal-reclassification.md",
        "scripts/agent/validate-final-testing-tracking-telemetry-lock.ts",
        "scripts/agent/validate-future-activity-signal-reclassification.ts",
        "tests/unit/future-activity-signal-reclassification.spec.ts",
        "src/lib/debug/future-activity-classifier.ts",
        "src/lib/debug/actionable-signal-filter.ts",
        "src/lib/debug/debug-panel-tracking-summary.ts",
        "package.json",
      ],
      artifacts: {
        publicBetaScore: score,
        currentBetaExitStatus: { summary: score },
        eventTranslation: {
          status: "pass",
          waitingOnActivity: Array.from({ length: 416 }, () => ({
            reason: "future_real_activity_pending",
            scoreDrag: false,
            nextAction: "Bridge is wired; wait for real future activity.",
          })),
        },
        personMetricsHydration: { status: "pass" },
        telemetryTriggerTestMatrix: { status: "pass", oldTestLogicClassification: [] },
        userManagementRefactor: { status: "pass" },
        debugTrackingSimplification: { status: "pass" },
        monolithOrphanMetricRegistry: { metricSummary: { uiWithoutSource: 0, producerWithoutConsumer: 0 } },
      },
    });

    expect(report.activitySignalSummary).toMatchObject({
      actionableActivitySignalCount: 0,
      quietFutureActivityCount: 416,
      brokenActivityPathCount: 0,
      scoreDragActivityCount: 0,
    });
    expect(report.waitingOnActivityLanes).toMatchObject({
      actionableActivitySignalCount: 0,
      quietFutureActivityCount: 416,
      brokenActivityPathCount: 0,
      scoreDragActivityCount: 0,
    });
    expect(validateFinalTestingTrackingTelemetryLockReport(report)).toEqual([]);
  });

  it("hides quiet future activity from default debug warnings while exposing a collapsed catalog", () => {
    const summary = buildDebugPanelTrackingSummary({
      eventTranslationBridge: {
        status: "pass",
        waitingOnActivity: [{ reason: "future_real_activity_pending", scoreDrag: false }],
        debugLane: {
          producersRegistered: 416,
          producersConnected: 416,
          eventEnvelopesTranslated: 416,
          materializersMapped: 416,
          personMetricsMapped: 24,
          gaps: 0,
        },
      },
      telemetryHealth: { summary: { degraded: 0, runtimeUnproven: 0, unavailable: 0, configMissing: 0 }, lanes: [] },
      legacyRecovery: { status: "live", mutationsAllowed: false },
      behavioralSnapshotStatus: { status: "live" },
      costControls: { status: "bounded_initial_summary" },
      routeRuntimeHealthSummary: { fail: 0, warn: 0, stale: 0 },
      runtimeWarningSummary: { failed: 0, degraded: 0, total: 0 },
      debugBacklogSummary: { p0P1Open: 0, open: 0 },
      stats: { receiptsLast7d: 1 },
    });

    const bridgeLane = summary.lanes.find((lane) => lane.id === "event_translation_bridge");
    expect(bridgeLane?.status).toBe("live");
    expect(bridgeLane?.warningCount).toBe(0);
    expect(summary.futureActivityCatalog).toMatchObject({
      defaultOpen: false,
      hiddenFromDefaultWarnings: true,
      quietFutureActivityCount: 1,
      actionableActivitySignalCount: 0,
      brokenActivityPathCount: 0,
      scoreDragActivityCount: 0,
    });
  });
});
