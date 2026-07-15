import { describe, expect, it } from "vitest";

import {
  FINAL_LOCK_DIMENSIONS,
  buildFinalTestingTrackingTelemetryLockReport,
  validateFinalTestingTrackingTelemetryLockReport,
} from "../../scripts/agent/validate-final-testing-tracking-telemetry-lock";

const TEST_HEAD = "b".repeat(40);
const GENERATED_AT_UTC = "2026-07-14T12:00:00.000Z";
const NOW_MS = Date.parse("2026-07-14T13:00:00.000Z");

function childEnvelope(reportKey: string) {
  return {
    reportKey,
    generatedAtUtc: GENERATED_AT_UTC,
    currentHead: TEST_HEAD,
    sourceCommit: TEST_HEAD,
    status: "pass",
    passed: true,
    canClearSourceGate: true,
    validationFailures: [],
  };
}

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
    ...childEnvelope("event-translation-bridge"),
    waitingOnActivity: [{ reason: "future_real_activity_pending", scoreDrag: false, nextAction: "Wait for real future activity." }],
    debugLane: { gaps: 0 },
  },
  personMetricsHydration: {
    ...childEnvelope("person-metrics-hydration"),
    lowConfidenceMetrics: [],
    missingHydration: [],
  },
  telemetryTriggerTestMatrix: {
    ...childEnvelope("telemetry-trigger-test-matrix"),
    oldTestLogicClassification: [],
    rows: [{ currentStatus: "covered" }, { currentStatus: "covered" }],
  },
  userManagementRefactor: {
    ...childEnvelope("user-management-refactor"),
    lowConfidenceMetrics: [],
    summaryFirstRoute: true,
  },
  debugTrackingSimplification: {
    ...childEnvelope("debug-tracking-simplification"),
    summary: { laneCount: 15, duplicateTrackingSystems: [] },
  },
  monolithOrphanMetricRegistry: {
    ...childEnvelope("monolith-orphan-metric-registry"),
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
      currentHead: TEST_HEAD,
      generatedAtUtc: GENERATED_AT_UTC,
      nowMs: NOW_MS,
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
    const report = buildFinalTestingTrackingTelemetryLockReport({
      artifacts: baseArtifacts,
      changedFiles: [],
      currentHead: TEST_HEAD,
      generatedAtUtc: GENERATED_AT_UTC,
      nowMs: NOW_MS,
    });
    report.metrics.runtimeHealth.nextExactAction = "";

    expect(validateFinalTestingTrackingTelemetryLockReport(report)).toContain("runtimeHealth is below 80 and lacks an exact next action.");
  });

  it("fails when source-ready activity is still treated as score drag or counts are unknown", () => {
    const report = buildFinalTestingTrackingTelemetryLockReport({
      artifacts: {
        ...baseArtifacts,
        eventTranslation: {
          ...baseArtifacts.eventTranslation,
          waitingOnActivity: [{ reason: "future_real_activity_pending", scoreDrag: true, nextAction: "" }],
          debugLane: { gaps: 0 },
        },
      },
      changedFiles: ["tmp/unknown.txt"],
      currentHead: TEST_HEAD,
      generatedAtUtc: GENERATED_AT_UTC,
      nowMs: NOW_MS,
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

  it("rejects untrusted child envelopes before their payload can influence the verdict", () => {
    const report = buildFinalTestingTrackingTelemetryLockReport({
      artifacts: {
        ...baseArtifacts,
        eventTranslation: {
          ...baseArtifacts.eventTranslation,
          reportKey: "wrong-event-translation-report",
          waitingOnActivity: [{ reason: "broken_materializer", scoreDrag: true, nextAction: "Repair it." }],
        },
        personMetricsHydration: {
          ...baseArtifacts.personMetricsHydration,
          generatedAtUtc: "2026-07-12T12:00:00.000Z",
        },
        telemetryTriggerTestMatrix: {
          ...baseArtifacts.telemetryTriggerTestMatrix,
          currentHead: "c".repeat(40),
          sourceCommit: "c".repeat(40),
          oldTestLogicClassification: [{ classification: "duplicate_validator" }],
        },
        monolithOrphanMetricRegistry: {
          ...baseArtifacts.monolithOrphanMetricRegistry,
          validationFailures: ["fixture failure"],
          metricSummary: { uiWithoutSource: 9, producerWithoutConsumer: 9 },
        },
      },
      changedFiles: [],
      currentHead: TEST_HEAD,
      generatedAtUtc: GENERATED_AT_UTC,
      nowMs: NOW_MS,
    });

    expect(report.status).toBe("fail");
    expect(report.passed).toBe(false);
    expect(report.canClearSourceGate).toBe(false);
    expect(report.eventTranslationStatus).toBe("missing");
    expect(report.personMetricsHydrationStatus).toBe("missing");
    expect(report.triggerTestCoverageStatus).toBe("missing");
    expect(report.waitingOnActivityLanes.scoreDragActivityCount).toBe(0);
    expect(report.duplicateValidatorCount).toBeNull();
    expect(report.orphanMetricCount).toBeNull();
    expect(report.validationFailures).toEqual(expect.arrayContaining([
      "event-translation-bridge child reportKey must be event-translation-bridge.",
      "person-metrics-hydration child generatedAtUtc must be non-future and fresh within 86400000ms.",
      "telemetry-trigger-test-matrix child currentHead must match the current full Git SHA.",
      "monolith-orphan-metric-registry child validationFailures must be an explicit empty array.",
    ]));
  });
});
