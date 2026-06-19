import { describe, expect, it } from "vitest";

import {
  validateOvernightBetaReadinessLockReport,
  type OvernightBetaReadinessLockReport,
} from "../../scripts/agent/validate-overnight-beta-readiness-lock";

function reportFixture(
  overrides: Partial<OvernightBetaReadinessLockReport> = {},
): OvernightBetaReadinessLockReport {
  return {
    generatedAtUtc: "2026-05-17T06:40:00.000Z",
    currentHead: "head",
    betaScore: 55,
    betaStatus: "Unknown evidence",
    creatorDashboardErrorStatus: "passed; fixed=2; unexpected4xxFixed=1",
    sourceTruthStatus: "passed; active=12; supporting=6; retiredLaunchArtifacts=3",
    cost4xxStatus: "passed; p0=0; p1=0; p2=7",
    cloudRunCostStatus: "cost_review_required",
    cloudSqlCostStatus: "not_detected_in_repo",
    geminiCloudAssistCostStatus: "cost_review_required",
    evidenceStatus:
      "uiSourceCoverage=missing; provider=missing; runtime=missing; adminTruth=missing; templates=4; complete=0",
    speedSecurityStatus: "51/beta-risk; findings=89; critical=0; p2BacklogVisible=true",
    remainingBlockers: [
      {
        id: "ui_source_coverage_missing",
        severity: "P1",
        status: "missing",
        nextAction: "Run UI source coverage.",
      },
      {
        id: "provider_smoke_evidence_missing",
        severity: "P1",
        status: "missing",
        nextAction: "Attach provider smoke evidence.",
      },
    ],
    nextDayPrompts: [
      {
        id: "ui-source-coverage",
        title: "Run UI source coverage evidence",
        goal: "Let source coverage evidence report UI surface gaps first.",
        commands: [
          "npm run check:ui-visual-smoke-minimal",
          "npm run check:evidence-capture-status",
        ],
      },
      {
        id: "provider-runtime-evidence",
        title: "Attach provider and runtime smoke evidence",
        goal: "Capture provider smoke and deployed runtime evidence artifacts.",
        commands: [
          "EVIDENCE_STRICT=1 npm run check:provider-smoke-evidence",
          "EVIDENCE_STRICT=1 npm run check:runtime-smoke-evidence",
        ],
      },
      {
        id: "admin-truth-cost-evidence",
        title: "Attach admin truth sample and cost owner-review evidence",
        goal: "Capture admin truth sample evidence and owner-review cost notes.",
        commands: [
          "EVIDENCE_STRICT=1 npm run check:admin-truth-sample-evidence",
          "npm run check:source-truth-authority-map",
        ],
      },
    ],
    doNotTouchList: [
      "app runtime",
      "admin backend",
      "GumDrop math",
      "PayPal runtime",
      "Firebase rules",
      "Cloud Functions",
      "BigQuery",
      "deployment config",
    ],
    evidenceCaptureStates: [
      {
        id: "uiSourceCoverage",
        label: "UI source coverage",
        truthState: "source_validation_required",
        sourceStatus: "missing",
        nextAction: "Run UI source coverage.",
      },
      {
        id: "providerSmoke",
        label: "Provider smoke",
        truthState: "external_evidence_required",
        sourceStatus: "missing",
        nextAction: "Attach provider smoke evidence.",
      },
      {
        id: "runtimeSmoke",
        label: "Runtime smoke",
        truthState: "external_evidence_required",
        sourceStatus: "missing",
        nextAction: "Attach runtime smoke evidence.",
      },
      {
        id: "adminTruthSample",
        label: "Admin truth sample",
        truthState: "admin_truth_source_required",
        sourceStatus: "missing",
        nextAction: "Attach admin truth sample evidence.",
      },
    ],
    betaExitReviewState: "blocked_by_formal_evidence",
    ...overrides,
  };
}

describe("overnight beta readiness lock validator", () => {
  it("blocks beta exit when evidence is missing", () => {
    const report = reportFixture({ betaExitReviewState: "ready_for_review" });

    expect(validateOvernightBetaReadinessLockReport(report, "head")).toContain(
      "betaExitReviewState must not be ready_for_review while required evidence is missing.",
    );
  });

  it("does not treat not_detected_in_repo as pass", () => {
    const report = reportFixture({ cloudSqlCostStatus: "pass_not_detected_in_repo" });

    expect(validateOvernightBetaReadinessLockReport(report, "head")).toContain(
      "not_detected_in_repo and config_not_in_repo statuses must not be marked pass.",
    );
  });

  it("classifies source-clear evidence lanes with truthful capture states", () => {
    const report = reportFixture();
    const failures = validateOvernightBetaReadinessLockReport(report, "head");

    expect(report.evidenceCaptureStates.map((lane) => lane.truthState)).toEqual([
      "source_validation_required",
      "external_evidence_required",
      "external_evidence_required",
      "admin_truth_source_required",
    ]);
    expect(failures).toEqual([]);
  });

  it("rejects legacy evidence start booleans", () => {
    const report = reportFixture({
      canStartProviderSmoke: true,
    } as unknown as Partial<OvernightBetaReadinessLockReport>);

    expect(validateOvernightBetaReadinessLockReport(report, "head")).toContain(
      "canStartProviderSmoke must not be emitted; use evidenceCaptureStates and betaExitReviewState.",
    );
  });

  it("requires stale launch reports to be classified in source truth status", () => {
    const report = reportFixture({ sourceTruthStatus: "passed; active=12; supporting=6" });

    expect(validateOvernightBetaReadinessLockReport(report, "head")).toContain(
      "sourceTruthStatus must classify stale or retired launch reports.",
    );
  });

  it("requires grouped next-day evidence prompts when blockers remain", () => {
    const report = reportFixture({ nextDayPrompts: [] });

    expect(validateOvernightBetaReadinessLockReport(report, "head")).toContain(
      "nextDayPrompts must not be empty while blockers remain.",
    );
  });
});
