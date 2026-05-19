import { describe, expect, it } from "vitest";

import {
  FINAL_TELEMETRY_LANE_IDS,
  buildFinalTelemetryClosureLockReport,
  validateFinalTelemetryClosureLockReport,
  type FinalTelemetryClosureLockInputs,
} from "../../scripts/agent/validate-final-telemetry-closure-lock";

function inputsFixture(
  overrides: Partial<FinalTelemetryClosureLockInputs> = {},
): FinalTelemetryClosureLockInputs {
  const inputs: FinalTelemetryClosureLockInputs = {
    currentHead: "head",
    generatedAtUtc: "2026-05-19T23:59:00.000Z",
    packageScripts: {
      "check:telemetry-dependency-graph": "tsx scripts/agent/validate-telemetry-dependency-graph.ts",
      "check:analytics-ingest-firestore-closure": "tsx scripts/agent/validate-analytics-ingest-firestore-closure.ts",
      "check:identity-transfer-telemetry-closure": "tsx scripts/agent/validate-identity-transfer-telemetry-closure.ts",
      "check:behavioral-tracking-semantics-closure": "tsx scripts/agent/validate-behavioral-tracking-semantics-closure.ts",
      "check:event-facts-materializer-closure": "tsx scripts/agent/validate-event-facts-materializer-closure.ts",
      "check:bigquery-cloud-pipeline-closure": "tsx scripts/agent/validate-bigquery-cloud-pipeline-closure.ts",
      "check:external-analytics-truth-closure": "tsx scripts/agent/validate-external-analytics-truth-closure.ts",
      "check:telemetry-admin-debug-truth": "tsx scripts/agent/validate-telemetry-admin-debug-truth.ts",
      "check:analytics-semantics-final-lock": "tsx scripts/agent/validate-analytics-semantics-final-lock.ts",
    },
    telemetryGraph: {
      reportKey: "telemetry-dependency-graph",
      summary: { priorityLanesClosed: true },
      telemetryLanes: FINAL_TELEMETRY_LANE_IDS.map((id) => ({
        id,
        enabledBehavior: "enabled behavior represented",
        disabledBehavior: "disabled behavior represented",
        persistenceDestination: "analytics_event_facts",
      })),
    },
    clientTrackingToggle: null,
    ingestClosure: {
      reportKey: "analytics-ingest-firestore-closure",
      summary: {
        acceptedEventsMapped: true,
        firestoreDestinationsCentralized: true,
        diagnosticsSampled: true,
      },
    },
    identityTransferClosure: {
      reportKey: "identity-transfer-telemetry-closure",
      summary: {
        identityLinkRoutePresent: true,
        individualUserSessionContinuity: true,
        linkedGuestNoDoubleCount: true,
      },
    },
    behavioralClosure: {
      reportKey: "behavioral-tracking-semantics-closure",
      summary: {
        disabledBehaviorSuppressed: true,
        enabledBehaviorBounded: true,
        watchTimeRuntimeOnly: true,
      },
    },
    materializerClosure: {
      reportKey: "event-facts-materializer-closure",
      summary: {
        materializationContractCreated: true,
        persistedCollectionsClassified: true,
        bigQueryCandidatesMarked: true,
      },
    },
    bigQueryClosure: {
      reportKey: "bigquery-cloud-pipeline-closure",
      summary: {
        scheduledWindowExportEnabled: true,
        eventTriggeredExportDisabled: true,
        configMissingStateDefined: true,
        missingBigQueryNotZeroTraffic: true,
      },
    },
    externalAnalyticsClosure: {
      reportKey: "external-analytics-truth-closure",
      summary: {
        ga4Statuses: ["ga4_server_configured", "ga4_evidence_only"],
        firstPartyAnalyticsPrimary: true,
        externalAnalyticsProductTruth: false,
        missingExternalAnalyticsNotZero: true,
      },
    },
    telemetryAdminDebugTruth: {
      reportKey: "telemetry-admin-debug-truth",
      summary: {
        compactHealthModelCreated: true,
        laneCount: 11,
        missingExternalNotZero: true,
      },
    },
    analyticsSemanticsFinalLock: {
      reportKey: "analytics-semantics-final-lock",
      betaScoreImpact: {
        analyticsSemanticsSourceReady: true,
        runtimeEvidenceComplete: false,
        betaExitReady: false,
      },
    },
    currentBetaExitStatus: {
      reportKey: "current-beta-exit-status",
      summary: {
        canStartBetaExitReview: false,
        providerSmokeStatus: "missing_formal_evidence",
        runtimeSmokeStatus: "runtime_unverified",
        adminTruthSampleStatus: "missing_or_unknown",
      },
    },
  };

  return {
    ...inputs,
    ...overrides,
  };
}

describe("final telemetry closure lock", () => {
  it("includes every required telemetry lane", () => {
    const report = buildFinalTelemetryClosureLockReport(inputsFixture());

    expect(report.laneStatus.map((lane) => lane.id)).toEqual(FINAL_TELEMETRY_LANE_IDS);
    expect(validateFinalTelemetryClosureLockReport(report)).toEqual([]);
  });

  it("reports missing phases instead of passing them", () => {
    const report = buildFinalTelemetryClosureLockReport(inputsFixture({
      ingestClosure: null,
    }));

    expect(report.dependencyGaps.some((gap) => gap.id === "analytics-ingest-firestore-closure")).toBe(true);
    expect(report.summary.ingestClosed).toBe(false);
    expect(validateFinalTelemetryClosureLockReport(report)).toContain("dependency gaps must be closed or explicitly marked with next actions.");
  });

  it("represents enabled and disabled tracking semantics", () => {
    const report = buildFinalTelemetryClosureLockReport(inputsFixture());

    expect(report.enabledTelemetryBehavior.length).toBeGreaterThan(0);
    expect(report.disabledTelemetryBehavior.length).toBeGreaterThan(0);
  });

  it("represents BigQuery and GA4/external analytics status", () => {
    const report = buildFinalTelemetryClosureLockReport(inputsFixture());

    expect(report.summary.bigQueryClosed).toBe(true);
    expect(report.summary.ga4ExternalTruthClosed).toBe(true);
    expect(report.laneStatus.find((lane) => lane.id === "bigquery_export")?.status).toContain("source_ready");
    expect(report.laneStatus.find((lane) => lane.id === "external_ga4_evidence")?.status).toContain("ga4_server_configured");
  });

  it("keeps beta evidence not ready without formal evidence", () => {
    const report = buildFinalTelemetryClosureLockReport(inputsFixture());

    expect(report.summary.betaEvidenceReady).toBe(false);
    expect(report.missingEvidence.map((entry) => entry.id)).toContain("provider-smoke");
    expect(report.missingEvidence.map((entry) => entry.id)).toContain("runtime-smoke");
    expect(report.missingEvidence.map((entry) => entry.id)).toContain("admin-truth-sample");
  });
});
