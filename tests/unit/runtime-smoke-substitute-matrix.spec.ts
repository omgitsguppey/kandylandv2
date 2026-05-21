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
        clearsManualVisual: false,
      },
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
  it("creates one proof-classified row for every required runtime smoke surface", () => {
    const report = buildReport();

    expect(Object.keys(report.rows).sort()).toEqual([...RUNTIME_SMOKE_SUBSTITUTE_ROW_IDS].sort());
    for (const row of Object.values(report.rows)) {
      expect(row.proofTypes.length).toBeGreaterThan(0);
      expect(row.currentProofLevel).not.toBe("unknown");
      expect(row.scoreDimension).toMatch(/runtimeHealth|evidenceCompleteness|sourceHealth|freshness/u);
    }
    expect(validateRuntimeSmokeSubstituteMatrix(report)).toEqual([]);
  });

  it("keeps non-UI source and telemetry rows out of manual UI requirements", () => {
    const report = buildReport();
    const nonUiRows = Object.values(report.rows).filter((row) =>
      (row.canBeSourceProven || row.canBeTelemetryProven || row.canBeDebugProven)
      && row.id !== "wallet_balance_display",
    );

    expect(nonUiRows.length).toBeGreaterThan(10);
    expect(nonUiRows.every((row) => row.requiresManualUI === false)).toBe(true);
    expect(report.manualUiRowIds).toEqual(["wallet_balance_display"]);
  });

  it("does not clear the formal deployed runtime gate", () => {
    const report = buildReport();

    expect(report.formalGateImpact.clearsDeployedRuntime).toBe(false);
    expect(report.deployedRuntimeSmokeStillRequired).toBe(true);
    expect(report.currentProofSummary.formalRuntimeRequiredRows).toBeGreaterThan(0);
    expect(report.matrixRuntimeHealthCredit).toBeGreaterThan(0);
  });

  it("requires exact next actions for rows needing deployed runtime evidence", () => {
    const report = buildReport();

    const formalRows = Object.values(report.rows).filter((row) => row.requiresFormalRuntime);
    expect(formalRows.length).toBeGreaterThan(0);
    expect(formalRows.every((row) => row.nextAction.includes("deployed runtime"))).toBe(true);
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
          requiresManualUI: true,
        },
        route_loads: {
          ...report.rows.route_loads,
          nextAction: "",
        },
      },
    };

    expect(validateRuntimeSmokeSubstituteMatrix(invalid)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("must not clear deployed runtime gate"),
        expect.stringContaining("telemetry_ingest lacks proof type"),
        expect.stringContaining("telemetry_ingest incorrectly requires manual UI"),
        expect.stringContaining("route_loads requires formal runtime evidence but lacks next action"),
      ]),
    );
  });
});
