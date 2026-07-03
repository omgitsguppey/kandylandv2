import { describe, expect, it } from "vitest";

import {
  RUNTIME_SMOKE_SUBSTITUTE_ROW_IDS,
  buildRuntimeSmokeSubstituteMatrix,
  validateRuntimeSmokeSubstituteMatrix,
  type RuntimeSmokeSubstituteMatrixReport,
} from "@/lib/runtime/runtime-smoke-substitute-matrix";

function buildReport() {
  return buildRuntimeSmokeSubstituteMatrix({
    currentHead: "abc123",
    generatedAtUtc: "2026-05-21T12:00:00.000Z",
    debugRuntimeEvidence: {
      status: "source_ready_debug_runtime_evidence",
      sourceBackedRuntimeConfidence: 100,
      deployedRuntimeSmokeCleared: false,
    },
    sourceBackedRuntimeConfidence: {
      status: "source_ready_runtime_confidence",
      runtimeConfidenceScore: 100,
      deployedSmokePresent: false,
    },
    realUsageConfidenceCalibration: {
      status: "source_ready_real_usage_confidence_calibrated",
      runtimeHealthCredit: 92,
      formalGateImpact: {
        clearsDeployedRuntime: false,
        clearsFormalProvider: false,
      },
    },
    realUsageConfidence: {
      status: "source_ready_real_usage_confidence",
      confidenceScore: 92,
      observedSignals: 4,
    },
    behaviorMath: {
      status: "live",
      overallScore: 100,
    },
    adminTruthSample: {
      status: "source_ready_admin_truth_sample_formal_missing",
      passed: true,
    },
    telemetryClosure: {
      lanes: {
        page_view: "source_ready_graph_mapped",
        purchase: "source_ready_graph_mapped",
        gumdrop_balance: "source_ready_graph_mapped",
        creator_experience: "source_ready_graph_mapped",
        creator_subscription: "source_ready_graph_mapped",
        creator_drop_submission: "source_ready_graph_mapped",
        runtime_watch: "source_ready_graph_mapped",
        behavior_signal: "source_ready_graph_mapped",
        admin_evidence: "source_ready_graph_mapped",
        external_ga4_evidence: "ga4_server_configured;ga4_evidence_only",
      },
    },
  });
}

describe("runtime smoke substitute matrix", () => {
  it("creates one proof-classified row for every required deployed route evidence surface", () => {
    const report = buildReport();

    expect(Object.keys(report.rows).sort()).toEqual([...RUNTIME_SMOKE_SUBSTITUTE_ROW_IDS].sort());
    for (const row of Object.values(report.rows)) {
      expect(row.proofTypes.length).toBeGreaterThan(0);
      expect(row.currentProofLevel).not.toBe("unknown");
      expect(row.scoreDimension).toMatch(/runtimeHealth|evidenceCompleteness|sourceHealth|freshness/u);
    }
    expect(validateRuntimeSmokeSubstituteMatrix(report)).toEqual([]);
  });

  it("keeps source and telemetry rows out of optional visual requirements", () => {
    const report = buildReport();
    const sourceRows = Object.values(report.rows).filter((row) =>
      row.canBeSourceProven || row.canBeTelemetryProven || row.canBeDebugProven,
    );

    expect(sourceRows.length).toBeGreaterThan(10);
    expect(report.rows.wallet_balance_display.currentProofLevel).toBe("source_proven");
    expect(report.currentProofSummary.formalRuntimeRequiredRows).toBeGreaterThan(0);
  });

  it("does not clear the deployed route evidence lane", () => {
    const report = buildReport();

    expect(report.formalGateImpact.clearsDeployedRuntime).toBe(false);
    expect(report.deployedRuntimeSmokeStillRequired).toBe(true);
    expect(report.currentProofSummary.formalRuntimeRequiredRows).toBeGreaterThan(0);
    expect(report.matrixRuntimeHealthCredit).toBeGreaterThan(0);
    expect(report.matrixRuntimeProviderActivityCredit).toBeGreaterThan(0);
  });

  it("does not turn calibration-only confidence into runtime/provider activity credit", () => {
    const report = buildRuntimeSmokeSubstituteMatrix({
      currentHead: "abc123",
      generatedAtUtc: "2026-05-21T12:00:00.000Z",
      realUsageConfidence: {
        status: "source_ready_real_usage_confidence",
        confidenceScore: 95,
        observedSignals: 0,
      },
      realUsageConfidenceCalibration: {
        status: "source_ready_real_usage_confidence_calibrated",
        runtimeHealthCredit: 95,
        formalGateImpact: {
          clearsDeployedRuntime: false,
          clearsFormalProvider: false,
        },
      },
    });

    expect(report.matrixRuntimeHealthCredit).toBe(0);
    expect(report.matrixRuntimeProviderActivityCredit).toBe(0);
    expect(report.rows.gumdrop_refill_source_readiness.currentProofLevel).toBe("formal_runtime_required");
    expect(report.evidence.join("\n")).toContain("realUsageObservedSignals=0");
    expect(report.evidence.join("\n")).toContain("realUsageObservedActivityCredit=0");
  });

  it("does not count source-ready activity verification as observed runtime/provider activity", () => {
    const report = buildRuntimeSmokeSubstituteMatrix({
      currentHead: "abc123",
      generatedAtUtc: "2026-05-21T12:00:00.000Z",
      realUsageConfidence: {
        status: "source_ready_real_usage_confidence",
        confidenceScore: 95,
        observedSignals: 0,
      },
      realUsageConfidenceCalibration: {
        status: "source_ready_real_usage_confidence_calibrated",
        runtimeHealthCredit: 95,
        verifiedByActivity: 3,
        formalGateImpact: {
          clearsDeployedRuntime: false,
          clearsFormalProvider: false,
        },
      },
    });

    expect(report.matrixRuntimeHealthCredit).toBe(0);
    expect(report.matrixRuntimeProviderActivityCredit).toBe(0);
    expect(report.evidence.join("\n")).toContain("realUsageObservedSignals=0");
    expect(report.evidence.join("\n")).toContain("realUsageObservedActivityCredit=0");
    expect(report.formalGateImpact.clearsDeployedRuntime).toBe(false);
  });

  it("requires exact next actions for rows needing deployed route evidence", () => {
    const report = buildReport();

    const formalRows = Object.values(report.rows).filter((row) => row.requiresFormalRuntime);
    expect(formalRows.length).toBeGreaterThan(0);
    expect(formalRows.every((row) => row.nextAction.includes("deployed"))).toBe(true);
  });

  it("fails validation when the matrix overclaims runtime proof or leaves rows unclassified", () => {
    const report = buildReport();
    const invalid: RuntimeSmokeSubstituteMatrixReport = {
      ...report,
      formalGateImpact: {
        ...report.formalGateImpact,
        clearsDeployedRuntime: true,
      },
      rows: {
        ...report.rows,
        telemetry_ingest: {
          ...report.rows.telemetry_ingest,
          proofTypes: [],
        },
        route_loads: {
          ...report.rows.route_loads,
          nextAction: "",
        },
      },
    };

    expect(validateRuntimeSmokeSubstituteMatrix(invalid)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("must not clear deployed route evidence lane"),
        expect.stringContaining("telemetry_ingest lacks proof type"),
        expect.stringContaining("route_loads requires deployed route evidence but lacks next action"),
      ]),
    );
  });
});
