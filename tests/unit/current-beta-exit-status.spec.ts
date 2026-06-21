import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  refreshPlanWithCurrentArtifactVersions,
  validateCurrentBetaExitStatusReport,
  type CurrentBetaExitProofLane,
  type CurrentBetaExitStatusReport,
} from "../../scripts/agent/validate-current-beta-exit-status";

const operatorRevenueSmoke = JSON.parse(
  readFileSync(join(process.cwd(), "agent/state/operator-revenue-smoke.generated.json"), "utf8"),
) as {
  summary?: { amountUsdConfirmed?: number };
  plainLanguageNote?: string;
};
const operatorRevenueSmokeAmount = operatorRevenueSmoke.summary?.amountUsdConfirmed ?? null;
const operatorRevenueSmokeNote = operatorRevenueSmoke.plainLanguageNote
  ?? "Operator-confirmed GumDrop revenue smoke was recorded. Provider source evidence is still separate.";

function proofLanesFor(
  summary: Omit<CurrentBetaExitStatusReport["summary"], "proofLanes">,
): CurrentBetaExitProofLane[] {
  return [
    {
      id: "uiSurfaceCoverage",
      label: "UI surface coverage",
      truthState: summary.visualEvidenceStatus.startsWith("stale_")
        ? "stale_evidence"
        : summary.visualEvidenceStatus.includes("source_surface_checks_current")
          ? "source_ui_surface_current"
          : "source_evidence_required",
      actionState: summary.visualEvidenceStatus.startsWith("stale_")
        ? "refresh_stale_evidence"
        : summary.visualEvidenceStatus.includes("source_surface_checks_current")
          ? "gate_cleared"
          : "run_source_ui_checks",
      sourceStatus: summary.visualEvidenceStatus,
      sourcePath: "agent/state/ui-visual-smoke-minimal.generated.json",
      captureStatus: summary.visualEvidenceStatus.includes("source_surface_checks_current") ? "complete" : "missing",
      sourceCommit: "head",
      canClearGate: summary.visualEvidenceStatus.includes("source_surface_checks_current"),
      nextAction: "Run deterministic UI surface coverage checks before optional browser reproduction.",
    },
    {
      id: "providerSmoke",
      label: "Provider-backed site activity evidence",
      truthState: summary.providerSmokeStatus.startsWith("stale_")
        ? "external_evidence_required"
        : summary.providerSmokeStatus.includes("formal_provider_smoke_passed")
          ? "current_source_evidence"
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
      nextAction: "Produce redacted provider-backed site activity evidence; operator confirmation alone cannot clear this gate.",
    },
    {
      id: "runtimeSmoke",
      label: "Deployed route evidence",
      truthState: summary.runtimeSmokeStatus.startsWith("stale_")
        ? "external_evidence_required"
        : summary.runtimeSmokeStatus.includes("formal_runtime_smoke_passed")
          ? "current_source_evidence"
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
      nextAction: "Produce or refresh deployed route evidence for the current code version.",
    },
    {
      id: "adminTruthSample",
      label: "Admin source activity sample evidence",
      truthState: summary.adminTruthSampleStatus.startsWith("stale_")
        ? "admin_truth_source_required"
        : summary.adminTruthSampleStatus.includes("formal_admin_truth_sample_passed")
          ? "current_source_evidence"
          : "admin_truth_source_required",
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
      nextAction: "Produce or refresh a redacted admin source activity sample for the current code version.",
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
      visualEvidenceStatus: "source_surface_checks_current",
      providerSmokeStatus: "missing_formal_evidence",
      operatorRevenueSmokeStatus: "operator_confirmed_revenue_smoke",
      operatorRevenueSmokeAmountUsd: operatorRevenueSmokeAmount,
      operatorRevenueSmokeProduct: "GumDrops",
      operatorRevenueSmokeConfirmationSource: "operator_confirmed",
      operatorRevenueSmokeProviderArtifactAttached: false,
      operatorRevenueSmokeFormalProviderSmokePassed: false,
      operatorRevenueSmokeBetaGateImpact: "product_signal_only",
      operatorRevenueSmokeNote,
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
      betaExitReviewState: "blocked_by_source_evidence",
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
        id: "provider-smoke",
        severity: "P1",
        status: "missing_formal_evidence",
        evidence: ["agent/state/provider-smoke-evidence.generated.json"],
        nextAction: "Attach targeted provider evidence.",
      },
    ],
    deferredOwnerReview: [],
    nextExactSteps: [
      "Use docs/agent-truth/ui-visual-smoke-minimal.md.",
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
  it("blocks beta exit when UI surface coverage is missing", () => {
    const report = reportFixture({
      summary: {
        ...reportFixture().summary,
        visualEvidenceStatus: "source_surface_checks_failed",
        betaExitReviewState: "ready_for_review",
      },
    });

    expect(validateCurrentBetaExitStatusReport(report, "head")).toContain(
      "betaExitReviewState must not be ready_for_review while UI surface/provider/runtime evidence is missing.",
    );
  });

  it("blocks beta exit when provider smoke is missing", () => {
    const report = reportFixture({
      summary: {
        ...reportFixture().summary,
        visualEvidenceStatus: "source_surface_checks_current",
        runtimeSmokeStatus: "formal_runtime_smoke_passed",
        betaExitReviewState: "ready_for_review",
      },
    });

    expect(validateCurrentBetaExitStatusReport(report, "head")).toContain(
      "betaExitReviewState must not be ready_for_review while UI surface/provider/runtime evidence is missing.",
    );
  });

  it("blocks beta exit when runtime smoke is missing", () => {
    const report = reportFixture({
      summary: {
        ...reportFixture().summary,
        visualEvidenceStatus: "source_surface_checks_current",
        providerSmokeStatus: "formal_provider_smoke_passed",
        betaExitReviewState: "ready_for_review",
      },
    });

    expect(validateCurrentBetaExitStatusReport(report, "head")).toContain(
      "betaExitReviewState must not be ready_for_review while UI surface/provider/runtime evidence is missing.",
    );
  });

  it("describes UI surface coverage with a source-derived proof lane state", () => {
    const report = reportFixture();

    expect(report.summary.proofLanes.find((lane) => lane.id === "uiSurfaceCoverage")?.actionState).toBe("gate_cleared");
    expect(validateCurrentBetaExitStatusReport(report, "head")).toEqual([]);
  });

  it("refreshes report freshness rows when a dependency artifact now matches the current code version", () => {
    const refreshed = refreshPlanWithCurrentArtifactVersions({
      head: "current-head",
      generatedAtUtc: "2026-06-19T12:00:00.000Z",
      refreshPlan: [
        {
          artifactPath: "agent/state/current-beta-exit-status.generated.json",
          reportKey: "current-beta-exit-status",
          label: "Current beta exit status",
          status: "stale_source_version",
          needsRefresh: true,
          generatedAtUtc: "2026-06-18T12:00:00.000Z",
          ageHours: 24,
          refreshCommand: "npm run check:current-beta-exit-status",
          message: "Current beta exit status was generated from an older code version.",
          nextAction: "Refresh this report.",
          formalEvidenceGateCanClear: false,
          owner: "beta",
          maxAgeHours: 24,
        },
        {
          artifactPath: "agent/state/beta-evidence-gap-map.generated.json",
          reportKey: "beta-evidence-gap-map",
          label: "Beta evidence gap map",
          status: "stale_source_version",
          needsRefresh: true,
          generatedAtUtc: "2026-06-18T12:00:00.000Z",
          ageHours: 24,
          refreshCommand: "npm run check:beta-evidence-gap-map",
          message: "Beta evidence gap map was generated from an older code version.",
          nextAction: "Refresh this report.",
          formalEvidenceGateCanClear: false,
          owner: "evidence",
          maxAgeHours: 24,
        },
        {
          artifactPath: "agent/state/provider-smoke-evidence.generated.json",
          reportKey: "provider-smoke-evidence",
          label: "Provider-backed site activity evidence",
          status: "stale_source_version",
          needsRefresh: true,
          generatedAtUtc: "2026-06-18T12:00:00.000Z",
          ageHours: 24,
          refreshCommand: "npm run check:provider-smoke-evidence",
          message: "Provider-backed site activity evidence was generated from an older code version.",
        nextAction: "Attach provider-backed site activity evidence.",
          formalEvidenceGateCanClear: false,
          owner: "evidence",
          maxAgeHours: 24,
        },
      ],
      readArtifact: (artifactPath) => {
        if (artifactPath === "agent/state/beta-evidence-gap-map.generated.json") {
          return {
            currentHead: "current-head",
            generatedAtUtc: "2026-06-19T11:30:00.000Z",
          };
        }
        if (artifactPath === "agent/state/provider-smoke-evidence.generated.json") {
          return {
            currentHead: "old-head",
            generatedAtUtc: "2026-06-18T12:00:00.000Z",
          };
        }
        return null;
      },
    });

    expect(refreshed.find((entry) => entry.artifactPath === "agent/state/current-beta-exit-status.generated.json")).toMatchObject({
      status: "current",
      needsRefresh: false,
      nextAction: "No refresh needed.",
    });
    expect(refreshed.find((entry) => entry.artifactPath === "agent/state/beta-evidence-gap-map.generated.json")).toMatchObject({
      status: "current",
      needsRefresh: false,
      nextAction: "No refresh needed.",
    });
    expect(refreshed.find((entry) => entry.artifactPath === "agent/state/provider-smoke-evidence.generated.json")).toMatchObject({
      status: "stale_source_version",
      needsRefresh: true,
      formalEvidenceGateCanClear: false,
    });
  });

  it("classifies stale proof lanes by required source action", () => {
    const { proofLanes: _proofLanes, ...summaryWithoutProofLanes } = reportFixture().summary;
    const staleSummary = {
      ...summaryWithoutProofLanes,
      visualEvidenceStatus: "stale_visual_evidence",
      providerSmokeStatus: "stale_provider_smoke_evidence",
      runtimeSmokeStatus: "stale_runtime_smoke_evidence",
      adminTruthSampleStatus: "stale_admin_truth_sample_evidence",
    };
    const report = reportFixture({
      summary: {
        ...staleSummary,
        proofLanes: proofLanesFor(staleSummary),
      },
    });

    expect(report.summary.proofLanes).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "uiSurfaceCoverage", truthState: "stale_evidence", actionState: "refresh_stale_evidence" }),
      expect.objectContaining({ id: "providerSmoke", truthState: "external_evidence_required", actionState: "refresh_stale_evidence" }),
      expect.objectContaining({ id: "runtimeSmoke", truthState: "external_evidence_required", actionState: "refresh_stale_evidence" }),
      expect.objectContaining({ id: "adminTruthSample", truthState: "admin_truth_source_required", actionState: "refresh_stale_evidence" }),
    ]));
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
      nextExactSteps: ["Run targeted UI source coverage checks."],
    });

    expect(validateCurrentBetaExitStatusReport(report, "head")).toContain(
      "nextExactSteps must reference docs/agent-truth/ui-visual-smoke-minimal.md.",
    );
  });

  it("requires next steps to point at evidence capture status", () => {
    const report = reportFixture({
      nextExactSteps: [
        "Use docs/agent-truth/ui-visual-smoke-minimal.md.",
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

    expect(validateCurrentBetaExitStatusReport(report, "head", {
      changedFilesSinceArtifactHead: ["scripts/agent/validate-current-beta-exit-status.ts"],
    })).toContain(
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
        "Use docs/agent-truth/ui-visual-smoke-minimal.md.",
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
