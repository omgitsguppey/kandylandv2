import { describe, expect, it } from "vitest";

import {
  buildEvidenceCaptureStatusReport,
  validateEvidenceCaptureStatusReport,
} from "../../scripts/agent/validate-evidence-capture-status";

describe("evidence capture status", () => {
  it("keeps beta exit blocked when only templates exist", () => {
    const report = buildEvidenceCaptureStatusReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-17T05:30:00.000Z",
      laneStatuses: {
        uiSurfaceCoverageEvidence: "complete",
        providerSmokeEvidence: "missing",
        runtimeSmokeEvidence: "missing",
        adminTruthSampleEvidence: "missing",
      },
      templatesCreated: 4,
      completeArtifacts: 0,
      currentBetaExitCanStart: false,
    });

    expect(report.summary.canStartBetaExitReview).toBe(false);
    expect(report.summary.completeArtifacts).toBe(0);
    expect(report.missingEvidence).toHaveLength(3);
    expect(validateEvidenceCaptureStatusReport(report, "head")).toEqual([]);
  });

  it("represents live runtime evidence import separately from protected source lanes", () => {
    const report = buildEvidenceCaptureStatusReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-17T05:30:00.000Z",
      laneStatuses: {
        uiSurfaceCoverageEvidence: "complete",
        providerSmokeEvidence: "missing",
        runtimeSmokeEvidence: "missing",
        adminTruthSampleEvidence: "missing",
      },
      templatesCreated: 4,
      completeArtifacts: 0,
      currentBetaExitCanStart: false,
      liveRuntimeEvidence: {
        statusSummary: "live_runtime_evidence_bridge=aggregate_activity_confirmed; aggregate_activity_confirmed=2; provider_required=2; admin_truth_source_required=1; billing_required=1; dailyActivityImport=present:agent/evidence/live-runtime-activity/recent-activity.export.json",
        expectedImportPath: "agent/evidence/live-runtime-activity/recent-activity.export.json",
      },
    });

    expect(report.summary.liveRuntimeEvidence.statusSummary).toContain("aggregate_activity_confirmed=2");
    expect(report.sourceReadyEvidence).toContain(
      "live runtime evidence bridge: live_runtime_evidence_bridge=aggregate_activity_confirmed; aggregate_activity_confirmed=2; provider_required=2; admin_truth_source_required=1; billing_required=1; dailyActivityImport=present:agent/evidence/live-runtime-activity/recent-activity.export.json",
    );
    expect(report.formalMissingEvidence).toContain(
      "site activity evidence clears connected site-activity lanes; provider-backed activity, admin source sample, billing, or exact-user lanes need matching source exports before clearing.",
    );
    expect(validateEvidenceCaptureStatusReport(report, "head")).toEqual([]);
  });

  it("removes admin from protected proof wording once admin truth evidence is complete", () => {
    const report = buildEvidenceCaptureStatusReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-17T05:30:00.000Z",
      laneStatuses: {
        uiSurfaceCoverageEvidence: "complete",
        providerSmokeEvidence: "missing",
        runtimeSmokeEvidence: "complete",
        adminTruthSampleEvidence: "complete",
      },
      templatesCreated: 4,
      completeArtifacts: 2,
      currentBetaExitCanStart: false,
    });

    expect(report.formalMissingEvidence).toContain(
      "site activity evidence clears connected site-activity lanes; provider-backed activity, billing, or exact-user lanes need matching source exports before clearing.",
    );
    expect(report.formalMissingEvidence).not.toContain(
      "site activity evidence clears connected site-activity lanes; provider-backed activity, admin source sample, billing, or exact-user lanes need matching source exports before clearing.",
    );
    expect(validateEvidenceCaptureStatusReport(report, "head")).toEqual([]);
  });

  it("fails validation if beta exit is ready while any evidence lane is missing", () => {
    const report = buildEvidenceCaptureStatusReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-17T05:30:00.000Z",
      laneStatuses: {
        uiSurfaceCoverageEvidence: "complete",
        providerSmokeEvidence: "complete",
        runtimeSmokeEvidence: "complete",
        adminTruthSampleEvidence: "missing",
      },
      templatesCreated: 4,
      completeArtifacts: 3,
      currentBetaExitCanStart: true,
    });
    report.summary.canStartBetaExitReview = true;

    expect(validateEvidenceCaptureStatusReport(report, "head")).toContain(
      "canStartBetaExitReview must remain false until all evidence lanes are complete and current beta exit status agrees.",
    );
  });

  it("fails validation when currentHead does not match", () => {
    const report = buildEvidenceCaptureStatusReport({
      currentHead: "old-head",
      generatedAtUtc: "2026-05-17T05:30:00.000Z",
      laneStatuses: {
        uiSurfaceCoverageEvidence: "complete",
        providerSmokeEvidence: "missing",
        runtimeSmokeEvidence: "missing",
        adminTruthSampleEvidence: "missing",
      },
      templatesCreated: 4,
      completeArtifacts: 0,
      currentBetaExitCanStart: false,
    });

    expect(validateEvidenceCaptureStatusReport(report, "head")).toContain(
      "evidence capture status currentHead must match git HEAD (head).",
    );
  });
});
