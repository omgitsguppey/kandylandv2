import { describe, expect, it } from "vitest";

import {
  buildAdminTruthSourceSampleReport,
  validateAdminTruthSourceSampleReport,
} from "../../scripts/agent/validate-admin-truth-source-sample";

describe("admin truth source sample", () => {
  it("records source wiring without clearing admin source activity sample evidence", () => {
    const report = buildAdminTruthSourceSampleReport({
      generatedAtUtc: "2026-05-20T00:00:00.000Z",
      currentHead: "abc123",
      adminDebugControlTowerModelPresent: true,
      adminDebugRoutePresent: true,
      routeDiagnosticsPresent: true,
      debugEvidenceContractPresent: true,
      summaryCardsPresent: true,
      productionSampleAttached: false,
      formalRuntimeSampleAttached: false,
      formalAdminTruthSamplePassed: false,
      sourceTruthLabelsPresent: true,
      sourceTruthStatus: "source_backed",
      telemetryHealthLaneStatus: "partial",
      degradedOrUnavailableLanes: [
        { lane: "admin_snapshots", status: "unavailable", nextAction: "Refresh admin analytics snapshots." },
      ],
      criticalAdminTruthIssueCount: 0,
      fakeHealthyStateDetected: false,
    });

    expect(report.status).toBe("source_ready_admin_truth_sample");
    expect(report.launchGateImpact).toBe("partial_source_admin_truth_only");
    expect(report.formalAdminTruthSamplePassed).toBe(false);
    expect(report.formalRuntimeSampleAttached).toBe(false);
    expect(report.degradedOrUnavailableLanes).toHaveLength(1);
    expect(validateAdminTruthSourceSampleReport(report)).toEqual([]);
  });

  it("fails if degraded lanes are omitted or unavailable lanes are called healthy", () => {
    const report = buildAdminTruthSourceSampleReport({
      generatedAtUtc: "2026-05-20T00:00:00.000Z",
      currentHead: "abc123",
      adminDebugControlTowerModelPresent: true,
      adminDebugRoutePresent: true,
      routeDiagnosticsPresent: true,
      debugEvidenceContractPresent: true,
      summaryCardsPresent: true,
      productionSampleAttached: false,
      formalRuntimeSampleAttached: false,
      formalAdminTruthSamplePassed: false,
      sourceTruthLabelsPresent: true,
      sourceTruthStatus: "source_backed",
      telemetryHealthLaneStatus: "partial",
      degradedOrUnavailableLanes: [],
      criticalAdminTruthIssueCount: 0,
      fakeHealthyStateDetected: false,
    });

    const failures = validateAdminTruthSourceSampleReport({
      ...report,
      degradedOrUnavailableLanes: [{ lane: "ga4_external_evidence", status: "live", nextAction: "none" }],
    });

    expect(validateAdminTruthSourceSampleReport(report)).toContain(
      "admin truth source sample must list degraded or unavailable lanes.",
    );
    expect(failures).toContain("unknown or unavailable lanes must not be marked healthy/live.");
  });

  it("fails if source-backed sample clears admin source sample evidence", () => {
    const report = buildAdminTruthSourceSampleReport({
      generatedAtUtc: "2026-05-20T00:00:00.000Z",
      currentHead: "abc123",
      adminDebugControlTowerModelPresent: true,
      adminDebugRoutePresent: true,
      routeDiagnosticsPresent: true,
      debugEvidenceContractPresent: true,
      summaryCardsPresent: true,
      productionSampleAttached: false,
      formalRuntimeSampleAttached: false,
      formalAdminTruthSamplePassed: false,
      sourceTruthLabelsPresent: true,
      sourceTruthStatus: "source_backed",
      telemetryHealthLaneStatus: "partial",
      degradedOrUnavailableLanes: [
        { lane: "materializers", status: "runtime_unproven", nextAction: "Attach runtime evidence." },
      ],
      criticalAdminTruthIssueCount: 0,
      fakeHealthyStateDetected: false,
    });

    expect(validateAdminTruthSourceSampleReport({
      ...report,
      formalAdminTruthSamplePassed: true,
    })).toContain("source sample must not clear the admin source sample gate.");
  });
});
