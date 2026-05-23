import { describe, expect, it } from "vitest";

import {
  FINAL_LOCK_DIMENSIONS,
  buildFinalTestingTrackingTelemetryLockReport,
  validateFinalTestingTrackingTelemetryLockReport,
} from "../../scripts/agent/validate-final-testing-tracking-telemetry-lock";

const baseArtifacts = {
  publicBetaScore: {
    healthScore: 63.15,
    sourceHealthScore: 91.7,
    runtimeHealthScore: 70.25,
    evidenceCompletenessScore: 41.75,
    freshnessScore: 62.86,
    costRiskScore: 42,
    regressionRiskScore: 42,
    readinessStatus: "Stale evidence",
    launchGateStatus: "owner_review",
  },
  currentBetaExitStatus: {
    summary: {
      healthScore: 55.56,
      sourceHealthScore: 91.7,
      runtimeHealthScore: 59.75,
      evidenceCompletenessScore: 43,
      freshnessScore: 48.57,
      costRiskScore: 42,
      regressionRiskScore: 6,
    },
  },
  eventTranslation: {
    status: "pass",
    waitingOnActivity: [{ reason: "future_real_activity_pending", scoreDrag: false, nextAction: "Wait for real future activity." }],
    debugLane: { gaps: 0 },
  },
  personMetricsHydration: {
    status: "pass",
    lowConfidenceMetrics: [],
    missingHydration: [],
  },
  telemetryTriggerTestMatrix: {
    status: "pass",
    oldTestLogicClassification: [],
    rows: [{ currentStatus: "covered" }, { currentStatus: "covered" }],
  },
  userManagementRefactor: {
    status: "pass",
    lowConfidenceMetrics: [],
    summaryFirstRoute: true,
  },
  debugTrackingSimplification: {
    status: "pass",
    summary: { laneCount: 15, duplicateTrackingSystems: [] },
  },
  monolithOrphanMetricRegistry: {
    metricSummary: { uiWithoutSource: 0, producerWithoutConsumer: 0 },
  },
};

describe("final testing tracking telemetry lock", () => {
  it("reports every score dimension against target 80 with exact next steps for misses", () => {
    const report = buildFinalTestingTrackingTelemetryLockReport({
      artifacts: baseArtifacts,
      changedFiles: [
        "agent/state/final-testing-tracking-telemetry-lock.generated.json",
        "docs/agent-truth/final-testing-tracking-telemetry-lock.md",
        "scripts/agent/validate-final-testing-tracking-telemetry-lock.ts",
        "tests/unit/final-testing-tracking-telemetry-lock.spec.ts",
        "package.json",
      ],
      currentHead: "HEAD",
      generatedAtUtc: "2026-05-23T00:00:00.000Z",
    });

    expect(Object.keys(report.metrics)).toEqual([...FINAL_LOCK_DIMENSIONS]);
    expect(report.metrics.sourceHealth.status).toBe("target_met");
    expect(report.metrics.runtimeHealth.status).toBe("below_target");
    expect(report.metrics.runtimeHealth.nextExactAction).toContain("runtime");
    expect(report.orphanMetricCount).toBe(0);
    expect(report.duplicateValidatorCount).toBe(0);
    expect(report.waitingOnActivityLanes.scoreDragActivityCount).toBe(0);
    expect(validateFinalTestingTrackingTelemetryLockReport(report)).toEqual([]);
  });

  it("fails when a below-target dimension lacks a next action", () => {
    const report = buildFinalTestingTrackingTelemetryLockReport({ artifacts: baseArtifacts, changedFiles: [] });
    report.metrics.runtimeHealth.nextExactAction = "";

    expect(validateFinalTestingTrackingTelemetryLockReport(report)).toContain("runtimeHealth is below 80 and lacks an exact next action.");
  });

  it("fails when source-ready activity is still treated as score drag or counts are unknown", () => {
    const report = buildFinalTestingTrackingTelemetryLockReport({
      artifacts: {
        ...baseArtifacts,
        eventTranslation: {
          status: "pass",
          waitingOnActivity: [{ reason: "future_real_activity_pending", scoreDrag: true, nextAction: "" }],
          debugLane: { gaps: 0 },
        },
      },
      changedFiles: ["tmp/unknown.txt"],
    });
    report.orphanMetricCount = null;
    report.duplicateValidatorCount = null;

    expect(validateFinalTestingTrackingTelemetryLockReport(report)).toEqual(expect.arrayContaining([
      "waiting-on-activity remains as score drag even though the source bridge exists.",
      "orphan metric count is unknown.",
      "duplicate validator count is unknown.",
      "dirty files are unclassified.",
    ]));
  });
});
