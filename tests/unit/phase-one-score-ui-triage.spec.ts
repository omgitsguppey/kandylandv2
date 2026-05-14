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
      "targeted-behavior-evidence-hardcoded-false",
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
      "score-stuck-at-source-safety-only",
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
      "admin-user-metrics-test-expects-legacy-watch-seconds-as-watch-time",
    ]));
  });

  it("flags Admin Debug clutter as non-blocking triage", () => {
    expect(REPORT.adminDashboardFindings.length).toBeGreaterThan(0);
    expect(REPORT.adminDashboardFindings.every((finding) => finding.severity === "P2")).toBe(true);
  });

  it("flags Creator Dashboard fake-live source risk", () => {
    const creatorFinding = REPORT.creatorDashboardFindings.find((finding) =>
      finding.findingKey === "creator-dashboard-stats-can-render-live-without-source-samples");

    expect(creatorFinding?.severity).toBe("P0");
    expect(creatorFinding?.recommendedFix).toContain("source/sample metadata");
  });

  it("provides a ranked next fix plan", () => {
    expect(REPORT.recommendedFixOrder.map((step) => step.stepKey)).toEqual([
      "score-evidence-ingestion",
      "creator-dashboard-source-sample-contract",
      "admin-debug-beta-score-connection",
      "watch-time-contract-lock",
      "admin-dashboard-scope-followup",
    ]);
    expect(REPORT.nextPromptRecommendation).toContain("Phase 1 Score Evidence Ingestion Fix");
  });
});
