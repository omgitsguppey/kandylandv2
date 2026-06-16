import { describe, expect, it } from "vitest";

import {
  validateCurrentBetaExitStatusReport,
  type CurrentBetaExitProofLane,
  type CurrentBetaExitStatusReport,
} from "../../scripts/agent/validate-current-beta-exit-status";

function proofLanesFor(
  summary: Omit<CurrentBetaExitStatusReport["summary"], "proofLanes">,
): CurrentBetaExitProofLane[] {
  return [
    {
      id: "manualScreenshotQa",
      label: "Manual screenshot QA",
      truthState: summary.visualEvidenceStatus.startsWith("stale_")
        ? "stale_evidence"
        : summary.visualEvidenceStatus.includes("source_only")
          ? "source_only_not_formal"
          : "manual_evidence_required",
      actionState: summary.visualEvidenceStatus.startsWith("stale_")
        ? "refresh_stale_evidence"
        : summary.visualEvidenceStatus.includes("source_only")
          ? "source_only_cannot_clear"
          : "attach_manual_evidence",
      sourceStatus: summary.visualEvidenceStatus,
      sourcePath: "agent/state/ui-visual-smoke-minimal.generated.json",
      captureStatus: "missing",
      sourceCommit: "head",
      canClearGate: false,
      nextAction: "Attach real manual screenshot QA evidence before treating visual proof as current.",
    },
    {
      id: "providerSmoke",
      label: "Provider smoke",
      truthState: summary.providerSmokeStatus.startsWith("stale_")
        ? "stale_evidence"
        : summary.providerSmokeStatus.includes("formal_provider_smoke_passed")
          ? "current_formal_evidence"
          : "external_evidence_required",
      actionState: summary.providerSmokeStatus.startsWith("stale_")
        ? "refresh_stale_evidence"
        : summary.providerSmokeStatus.includes("formal_provider_smoke_passed")
          ? "gate_cleared"
          : "attach_external_evidence",
      sourceStatus: summary.providerSmokeStatus,
      sourcePath: "agent/state/provider-smoke-evidence.generated.json",
      captureStatus: summary.providerSmokeStatus.includes("formal_provider_smoke_passed") ? "complete" : "missing",
      sourceCommit: "head",
      canClearGate: summary.providerSmokeStatus.includes("formal_provider_smoke_passed"),
      nextAction: "Attach redacted provider smoke evidence; operator confirmation alone cannot clear provider proof.",
    },
    {
      id: "runtimeSmoke",
      label: "Runtime smoke",
      truthState: summary.runtimeSmokeStatus.startsWith("stale_")
        ? "stale_evidence"
        : summary.runtimeSmokeStatus.includes("formal_runtime_smoke_passed")
          ? "current_formal_evidence"
          : "external_evidence_required",
      actionState: summary.runtimeSmokeStatus.startsWith("stale_")
        ? "refresh_stale_evidence"
        : summary.runtimeSmokeStatus.includes("formal_runtime_smoke_passed")
          ? "gate_cleared"
          : "attach_external_evidence",
      sourceStatus: summary.runtimeSmokeStatus,
      sourcePath: "agent/state/runtime-smoke-evidence.generated.json",
      captureStatus: summary.runtimeSmokeStatus.includes("formal_runtime_smoke_passed") ? "complete" : "missing",
      sourceCommit: "head",
      canClearGate: summary.runtimeSmokeStatus.includes("formal_runtime_smoke_passed"),
      nextAction: "Attach or refresh deployed runtime smoke evidence for the current code version.",
    },
    {
      id: "adminTruthSample",
      label: "Admin truth sample",
      truthState: summary.adminTruthSampleStatus.startsWith("stale_")
        ? "stale_evidence"
        : summary.adminTruthSampleStatus.includes("formal_admin_truth_sample_passed")
          ? "current_formal_evidence"
          : "manual_admin_truth_required",
      actionState: summary.adminTruthSampleStatus.startsWith("stale_")
        ? "refresh_stale_evidence"
        : summary.adminTruthSampleStatus.includes("formal_admin_truth_sample_passed")
          ? "gate_cleared"
          : "attach_admin_truth_sample",
      sourceStatus: summary.adminTruthSampleStatus,
      sourcePath: "agent/state/admin-truth-sample-evidence.generated.json",
      captureStatus: summary.adminTruthSampleStatus.includes("formal_admin_truth_sample_passed") ? "complete" : "missing",
      sourceCommit: "head",
      canClearGate: summary.adminTruthSampleStatus.includes("formal_admin_truth_sample_passed"),
      nextAction: "Attach or refresh a redacted admin truth sample for the current code version.",
    },
  ];
}

function reportFixture(overrides: Partial<CurrentBetaExitStatusReport> = {}): CurrentBetaExitStatusReport {
  const report: CurrentBetaExitStatusReport = {
    generatedAtUtc: "2026-05-17T04:22:16.775Z",
    reportKey: "current-beta-exit-status",
    currentHead: "head",
    summary: {
      betaVersion: "1.2.59",
      betaScore: 45,
      betaStatus: "Stale evidence",
      scoreVersion: "beta_health_v2",
      healthScore: 58,
      launchGateStatus: "source_ready",
      sourceHealthScore: 92,
      runtimeHealthScore: 12,
      evidenceCompletenessScore: 35,
      freshnessScore: 60,
      costRiskScore: 52,
      regressionRiskScore: 80,
      sourceCleanupP0: 0,
      sourceCleanupP1: 0,
      userCreatorP0: 0,
      userCreatorP1: 0,
      economyP0: 0,
      economyP1: 0,
      visualEvidenceStatus: "source_only_screenshotEvidenceAttached_false",
      providerSmokeStatus: "missing_formal_evidence",
      operatorRevenueSmokeStatus: "operator_confirmed_revenue_smoke",
      operatorRevenueSmokeAmountUsd: 50,
      operatorRevenueSmokeProduct: "GumDrops",
      operatorRevenueSmokeConfirmationSource: "operator_confirmed",
      operatorRevenueSmokeProviderArtifactAttached: false,
      operatorRevenueSmokeFormalProviderSmokePassed: false,
      operatorRevenueSmokeBetaGateImpact: "product_signal_only",
      operatorRevenueSmokeNote: "A real $50 GumDrop payment was operator-confirmed. Formal provider evidence is still separate.",
      runtimeSmokeStatus: "runtime_unverified",
      adminTruthSampleStatus: "missing_or_unknown",
      cloudRunCostReadiness: "cost_review_required",
      cloudSqlCostReadiness: "not_detected_in_repo",
      geminiCloudAssistCostReadiness: "cost_review_required",
      route4xxReadiness: "source_inventory_complete",
      errorHandlingSourceStatus: "error_handling_source_complete",
      analyticsSemanticsSourceStatus: "analytics_semantics_source_ready_runtime_proof_required",
      liveRuntimeEvidenceStatus: "live_runtime_evidence_bridge=source_ready_waiting_for_activity; live_activity_confirmed=0; aggregate_activity_confirmed=0; not_observed_but_expected=6; provider_required=2; admin_truth_source_required=1; billing_required=1; dailyActivityImport=missing:agent/evidence/live-runtime-activity/recent-activity.export.json",
      speedSecurityStatus: "51/beta-risk; findings=91; critical=0",
      releaseNotesStatus: "passed_same_commit_validator",
      betaExitReviewState: "blocked_by_formal_evidence",
      proofLanes: [],
    },
    checksRun: [
      { command: "npm run check:gumdrop-economy-accuracy", status: "passed", evidence: "passed" },
      { command: "npm run check:creator-experience-simplification", status: "passed", evidence: "passed" },
      { command: "npm run check:post-economy-creator-flow-qa", status: "passed", evidence: "passed" },
      { command: "npm run check:operator-revenue-smoke", status: "passed", evidence: "operator smoke represented" },
      { command: "npm run check:release-notes", status: "passed", evidence: "passed" },
    ],
    refreshPlan: [
      {
        artifactPath: "agent/state/current-beta-exit-status.generated.json",
        reportKey: "current-beta-exit-status",
        label: "Current beta exit status",
        status: "current",
        needsRefresh: false,
        generatedAtUtc: "2026-05-17T04:22:16.775Z",
        ageHours: 0,
        refreshCommand: "npm run check:current-beta-exit-status",
        message: "Current beta exit status is current for the latest code version.",
        nextAction: "No refresh needed.",
        formalEvidenceGateCanClear: true,
        owner: "beta",
        maxAgeHours: 24,
      },
    ],
    staleArtifacts: [],
    exactRefreshCommands: ["npm run check:current-beta-exit-status"],
    failedChecks: [],
    refreshedArtifacts: [],
    remainingBlockers: [
      {
        id: "visual_manual_smoke_missing",
        severity: "P1",
        status: "visual_qa_required",
        evidence: ["screenshotEvidenceAttached=false"],
        nextAction: "Attach targeted screenshot evidence.",
      },
    ],
    deferredOwnerReview: [],
    nextExactSteps: [
      "Use docs/agent-truth/manual-screenshot-qa-checklist.md.",
      "Use docs/agent-truth/provider-smoke-evidence-checklist.md.",
      "Use docs/agent-truth/runtime-smoke-evidence-checklist.md.",
      "Use docs/agent-truth/admin-truth-sample-evidence-checklist.md.",
      "Reference agent/state/evidence-capture-status.generated.json.",
      "Manual testing can focus on product behavior because user/creator raw error leaks are source-blocked.",
    ],
  };

  const summary = {
    ...report.summary,
    ...overrides.summary,
  };
  const proofLanes = overrides.summary?.proofLanes ?? proofLanesFor(summary);

  return {
    ...report,
    ...overrides,
    summary: {
      ...summary,
      proofLanes,
    },
  };
}

describe("current beta exit status validator", () => {
  it("blocks beta exit when visual evidence is missing", () => {
    const report = reportFixture({
      summary: {
        ...reportFixture().summary,
        betaExitReviewState: "ready_for_review",
      },
    });

    expect(validateCurrentBetaExitStatusReport(report, "head")).toContain(
      "betaExitReviewState must not be ready_for_review while visual/provider/runtime evidence is missing.",
    );
  });

  it("blocks beta exit when provider smoke is missing", () => {
    const report = reportFixture({
      summary: {
        ...reportFixture().summary,
        visualEvidenceStatus: "formal_screenshot_evidence_attached",
        runtimeSmokeStatus: "formal_runtime_smoke_passed",
        betaExitReviewState: "ready_for_review",
      },
    });

    expect(validateCurrentBetaExitStatusReport(report, "head")).toContain(
      "betaExitReviewState must not be ready_for_review while visual/provider/runtime evidence is missing.",
    );
  });

  it("blocks beta exit when runtime smoke is missing", () => {
    const report = reportFixture({
      summary: {
        ...reportFixture().summary,
        visualEvidenceStatus: "formal_screenshot_evidence_attached",
        providerSmokeStatus: "formal_provider_smoke_passed",
        betaExitReviewState: "ready_for_review",
      },
    });

    expect(validateCurrentBetaExitStatusReport(report, "head")).toContain(
      "betaExitReviewState must not be ready_for_review while visual/provider/runtime evidence is missing.",
    );
  });

  it("describes screenshot QA with a source-derived proof lane state", () => {
    const report = reportFixture();

    expect(report.summary.proofLanes.find((lane) => lane.id === "manualScreenshotQa")?.actionState).toBe("source_only_cannot_clear");
    expect(validateCurrentBetaExitStatusReport(report, "head")).toEqual([]);
  });

  it("requires source-derived proof lane truth states instead of bare proof booleans", () => {
    const report = reportFixture({
      summary: {
        ...reportFixture().summary,
        proofLanes: [],
      },
    });

    expect(validateCurrentBetaExitStatusReport(report, "head")).toContain(
      "proofLanes must include providerSmoke.",
    );
  });

  it("rejects legacy manual proof start booleans", () => {
    const legacySummary = {
      ...reportFixture().summary,
      canStartManualScreenshotQa: true,
    } as CurrentBetaExitStatusReport["summary"] & Record<string, unknown>;
    const report = reportFixture({
      summary: legacySummary,
    });

    expect(validateCurrentBetaExitStatusReport(report, "head")).toContain(
      "canStartManualScreenshotQa must not be emitted; use proofLanes truthState/actionState and betaExitReviewState.",
    );
  });

  it("requires release-note status to be represented", () => {
    const report = reportFixture({
      summary: {
        ...reportFixture().summary,
        releaseNotesStatus: "",
      },
    });

    expect(validateCurrentBetaExitStatusReport(report, "head")).toContain(
      "release notes status must be represented.",
    );
  });

  it("requires cost-readiness lanes to be represented", () => {
    const report = reportFixture({
      summary: {
        ...reportFixture().summary,
        cloudRunCostReadiness: "",
        cloudSqlCostReadiness: "",
        geminiCloudAssistCostReadiness: "",
        route4xxReadiness: "",
      },
    });

    expect(validateCurrentBetaExitStatusReport(report, "head")).toContain(
      "cost readiness lanes must be represented.",
    );
  });

  it("requires error handling source readiness to be represented", () => {
    const report = reportFixture({
      summary: {
        ...reportFixture().summary,
        errorHandlingSourceStatus: "",
      },
    });

    expect(validateCurrentBetaExitStatusReport(report, "head")).toContain(
      "error handling source readiness must be represented.",
    );
  });

  it("requires analytics semantic readiness to keep runtime proof separate", () => {
    const report = reportFixture({
      summary: {
        ...reportFixture().summary,
        analyticsSemanticsSourceStatus: "",
      },
    });

    expect(validateCurrentBetaExitStatusReport(report, "head")).toContain(
      "analytics semantics source readiness and runtime proof requirement must be represented.",
    );
  });

  it("requires current beta exit status to represent the live runtime evidence bridge", () => {
    const report = reportFixture({
      summary: {
        ...reportFixture().summary,
        liveRuntimeEvidenceStatus: "",
      },
    });

    expect(validateCurrentBetaExitStatusReport(report, "head")).toContain(
      "live runtime evidence bridge status must be represented with the daily activity import path.",
    );
  });

  it("requires next steps to point at the evidence readiness checklists", () => {
    const report = reportFixture({
      nextExactSteps: ["Run targeted manual screenshot QA."],
    });

    expect(validateCurrentBetaExitStatusReport(report, "head")).toContain(
      "nextExactSteps must reference docs/agent-truth/manual-screenshot-qa-checklist.md.",
    );
  });

  it("requires next steps to point at evidence capture status", () => {
    const report = reportFixture({
      nextExactSteps: [
        "Use docs/agent-truth/manual-screenshot-qa-checklist.md.",
        "Use docs/agent-truth/provider-smoke-evidence-checklist.md.",
        "Use docs/agent-truth/runtime-smoke-evidence-checklist.md.",
        "Use docs/agent-truth/admin-truth-sample-evidence-checklist.md.",
      ],
    });

    expect(validateCurrentBetaExitStatusReport(report, "head")).toContain(
      "nextExactSteps must reference agent/state/evidence-capture-status.generated.json.",
    );
  });

  it("fails when currentHead is not an accepted generated artifact version", () => {
    const report = reportFixture({ currentHead: "old-head" });

    expect(validateCurrentBetaExitStatusReport(report, "head")).toContain(
      "report currentHead must match git HEAD (head) or an accepted generated artifact version.",
    );
  });

  it("accepts same-commit generated artifact snapshots", () => {
    const report = reportFixture({ currentHead: "parent-head" });

    expect(validateCurrentBetaExitStatusReport(report, "head", {
      parentHead: "parent-head",
      changedFilesInHead: ["agent/state/current-beta-exit-status.generated.json"],
    })).not.toContain(
      "report currentHead must match git HEAD (head) or an accepted generated artifact version.",
    );
  });

  it("keeps beta exit next steps in plain refresh language", () => {
    const report = reportFixture({
      nextExactSteps: [
        "Refresh this report from the latest code version before using beta readiness.",
        "Use docs/agent-truth/manual-screenshot-qa-checklist.md.",
        "Use docs/agent-truth/provider-smoke-evidence-checklist.md.",
        "Use docs/agent-truth/runtime-smoke-evidence-checklist.md.",
        "Use docs/agent-truth/admin-truth-sample-evidence-checklist.md.",
        "Reference agent/state/evidence-capture-status.generated.json.",
        "Manual testing can focus on product behavior because user/creator raw error leaks are source-blocked.",
      ],
    });

    expect(report.nextExactSteps.join("\n")).not.toMatch(/\bcurrent HEAD\b|\bHEAD\b|currentHead/u);
    expect(validateCurrentBetaExitStatusReport(report, "head")).toEqual([]);
  });
});
