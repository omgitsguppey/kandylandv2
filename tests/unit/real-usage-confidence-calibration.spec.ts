import { describe, expect, it } from "vitest";

import {
  REQUIRED_REAL_USAGE_CALIBRATION_FLOWS,
  buildRealUsageConfidenceCalibration,
  validateRealUsageConfidenceCalibration,
  type RealUsageConfidenceCalibrationInput,
} from "@/lib/analytics/real-usage-confidence-calibration";

function input(overrides: Partial<RealUsageConfidenceCalibrationInput> = {}): RealUsageConfidenceCalibrationInput {
  return {
    currentHead: "abc123",
    generatedAtUtc: "2026-05-21T12:00:00.000Z",
    realUsageConfidence: {
      confidenceScore: 92,
      formalGateImpact: {
        clearsFormalProvider: false,
        clearsDeployedRuntime: false,
      },
      signals: {
        purchase_flow_seen: {
          status: "observed",
          operatorConfirmed: true,
          confidenceContribution: 30,
          sourcePath: "agent/state/operator-revenue-smoke.generated.json",
          telemetryLaneId: "purchase",
          evidence: ["count=1", "confirmationSource=operator_confirmed"],
        },
        wallet_flow_source_ready: {
          status: "source_ready",
          operatorConfirmed: false,
          confidenceContribution: 10,
          sourcePath: "agent/state/source-backed-runtime-confidence.generated.json",
          telemetryLaneId: "purchase",
          evidence: ["laneStatus=closed"],
        },
      },
    },
    behaviorMath: {
      overallScore: 100,
      summary: {
        disabledEventsExcluded: 1,
        legacyUnknownExcluded: 1,
        duplicateEventsDeduped: 1,
        linkedGuestEventsAttributedToUsers: 1,
      },
      debugOutput: {
        perUserConfidence: { "user-1": "exact" },
        disabledTrackingHandling: "excluded_from_behavior_metrics",
        legacyRecoveryReadiness: "dry_run_only_from_2026_03_01",
        watchTimeTruth: "watch_session_rollups_only_not_page_time",
      },
      recovery: {
        startDate: "2026-03-01",
        mode: "dry_run_only",
        readsProduction: false,
        mutationsAllowed: false,
        summary: { probable: 1, unknown: 1 },
      },
    },
    operatorRevenueSmoke: {
      amountUsdConfirmed: 50,
      confirmationSource: "operator_confirmed",
      formalProviderSmokePassed: false,
      providerArtifactAttached: false,
    },
    telemetryClosure: {
      laneStatus: {
        page_view: "source_ready_graph_mapped",
        purchase: "source_ready_graph_mapped",
        gumdrop_balance: "source_ready_graph_mapped",
        creator_experience: "source_ready_graph_mapped",
        creator_subscription: "source_ready_graph_mapped",
        creator_drop_submission: "source_ready_graph_mapped",
        runtime_watch: "source_ready_graph_mapped",
        behavior_signal: "source_ready_graph_mapped",
      },
    },
    ...overrides,
  };
}

describe("real usage confidence calibration", () => {
  it("recognizes the operator-confirmed sale without clearing formal gates", () => {
    const report = buildRealUsageConfidenceCalibration(input());

    expect(report.operatorConfirmedRevenueSmoke).toMatchObject({
      amountUsdConfirmed: 50,
      recognized: true,
      formalProviderGateCleared: false,
    });
    expect(report.formalGateImpact).toEqual({
      clearsFormalProvider: false,
      clearsDeployedRuntime: false,
    });
    expect(report.perFlowConfidence.wallet_refill.confidenceClass).toBe("observed_operator_confirmed");
    expect(report.perFlowConfidence.wallet_refill.observedCount).toBe(1);
    expect(validateRealUsageConfidenceCalibration(report)).toEqual([]);
  });

  it("keeps inferred and source-ready signals out of observed proof", () => {
    const report = buildRealUsageConfidenceCalibration(input());

    expect(report.perFlowConfidence.creator_dashboard.confidenceClass).toBe("observed_telemetry_source_ready");
    expect(report.perFlowConfidence.creator_dashboard.observedCount).toBe(0);
    expect(report.perFlowConfidence.broadcast_source.confidenceClass).toBe("inferred_from_validated_path");
    expect(report.perFlowConfidence.broadcast_source.observedCount).toBe(0);
    expect(report.fakeUsageCountsUsed).toBe(false);
  });

  it("connects behavior math without counting disabled tracking or unknown legacy behavior", () => {
    const report = buildRealUsageConfidenceCalibration(input());

    expect(report.behaviorMathConnection).toMatchObject({
      perUserConfidence: "exact",
      linkedGuestUserNoDoubleCount: true,
      disabledTrackingSuppressed: true,
      unknownLegacyExcluded: true,
      legacyMarchFirstDryRun: true,
    });
    expect(report.perFlowConfidence.creator_profile_timeline.confidenceClass).toBe("unknown_legacy");
    expect(report.perFlowConfidence.creator_profile_timeline.confidenceScore).toBe(0);
    expect(validateRealUsageConfidenceCalibration(report)).toEqual([]);
  });

  it("requires every calibrated flow and rejects formal-gate overclaiming", () => {
    const report = buildRealUsageConfidenceCalibration(input());
    const flowIds = Object.keys(report.perFlowConfidence);

    expect(flowIds.sort()).toEqual([...REQUIRED_REAL_USAGE_CALIBRATION_FLOWS].sort());

    const invalid = {
      ...report,
      formalGateImpact: {
        ...report.formalGateImpact,
        clearsFormalProvider: true,
      },
      perFlowConfidence: {
        ...report.perFlowConfidence,
        fan_pass_source: {
          ...report.perFlowConfidence.fan_pass_source,
          confidenceClass: "observed_operator_confirmed" as const,
          observedCount: 12,
        },
      },
    };

    expect(validateRealUsageConfidenceCalibration(invalid)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("must not clear formal provider"),
        expect.stringContaining("fan_pass_source uses observed proof without operator confirmation"),
      ]),
    );
  });
});
