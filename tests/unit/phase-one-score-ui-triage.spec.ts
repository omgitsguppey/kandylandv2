import { describe, expect, it } from "vitest";

import {
  buildPhaseOneScoreUiTriageReport,
  validatePhaseOneScoreUiTriageReport,
} from "../../scripts/agent/validate-phase-one-score-ui-triage";

const REPORT = buildPhaseOneScoreUiTriageReport({
  now: new Date("2026-05-14T12:00:00.000Z"),
});

describe("phase one score UI triage", () => {
  it("builds the required top-level report fields", () => {
    expect(REPORT.reportKey).toBe("phase-one-score-ui-triage");
    expect(REPORT.generatedAtUtc).toBe("2026-05-14T12:00:00.000Z");
    expect(REPORT.currentHead).toEqual(expect.any(String));
    expect(REPORT.summary.scoreIngestionIssues).toBe(REPORT.scoreIngestionFindings.length);
    expect(validatePhaseOneScoreUiTriageReport(REPORT)).toEqual([]);
  });

  it("records score ingestion gaps for formal evidence artifacts", () => {
    const keys = REPORT.scoreIngestionFindings.map((finding) => finding.findingKey);

    expect(keys).toEqual(expect.arrayContaining([
      "provider-smoke-evidence-not-ingested",
      "runtime-smoke-evidence-not-ingested",
      "admin-truth-sample-evidence-not-ingested",
    ]));
    expect(REPORT.scoreIngestionFindings.every((finding) =>
      typeof finding.evidenceFileExists === "boolean"
      && typeof finding.scoreReadsIt === "boolean"
      && typeof finding.scoreTrustsItCorrectly === "boolean"
      && finding.scoreGateAffected.length > 0)).toBe(true);
  });

  it("keeps missing or operator-reported evidence out of ready scoring", () => {
    const providerFinding = REPORT.scoreIngestionFindings.find((finding) =>
      finding.findingKey === "provider-smoke-evidence-not-ingested");

    expect(providerFinding?.scoreTrustsItCorrectly).toBe(false);
    expect(REPORT.scoreMathFindings.map((finding) => finding.findingKey)).toEqual(expect.arrayContaining([
      "stale-report-cap-has-no-independent-refresh-lane",
      "evidence-gates-are-mostly-boolean",
    ]));
  });

  it("flags the Admin Debug score connection risk", () => {
    expect(REPORT.uiConnectionFindings.map((finding) => finding.findingKey)).toEqual(expect.arrayContaining([
      "control-tower-score-is-report-average-not-public-beta-score",
    ]));
  });

  it("captures watch-time truth defects without changing watch math", () => {
    expect(REPORT.watchTimeFindings.map((finding) => finding.findingKey)).toEqual(expect.arrayContaining([
      "watch-time-contract-canonical-but-needs-ui-lock",
      "admin-user-metrics-feeds-legacy-watch-seconds-into-diagnostics",
    ]));
  });

  it("flags Admin Debug clutter as non-blocking triage", () => {
    expect(REPORT.adminDashboardFindings.length).toBeGreaterThan(0);
    expect(REPORT.adminDashboardFindings.every((finding) => finding.severity === "P2")).toBe(true);
  });

  it("retires the Creator Dashboard fake-live finding after source metadata lands", () => {
    expect(REPORT.creatorDashboardFindings).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ findingKey: "creator-dashboard-stats-can-render-live-without-source-samples" }),
    ]));
    expect(REPORT.summary.creatorDashboardIssues).toBe(0);
    expect(REPORT.recommendedFixOrder.map((step) => step.stepKey)).not.toContain("creator-dashboard-source-sample-contract");
  });

  it("provides a ranked next fix plan", () => {
    expect(REPORT.recommendedFixOrder.map((step) => step.stepKey)).toEqual([
      "score-evidence-ingestion",
      "admin-debug-beta-score-connection",
      "watch-time-contract-lock",
      "admin-dashboard-scope-followup",
    ]);
    expect(REPORT.nextPromptRecommendation).toContain("Phase 1 Score Evidence Ingestion Fix");
  });
});
