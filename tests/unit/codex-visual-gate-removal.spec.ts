import { describe, expect, it } from "vitest";

import { buildPublicBetaScoreReport } from "@/lib/agent-score/core";
import { buildPublicBetaCommandBudget } from "@/lib/agent-score/reporting";
import {
  buildUiVisualSmokeMinimalReport,
  summarizeUiVisualSmokeEvidenceForScore,
} from "@/lib/evidence/ui-visual-smoke-contract";

const baseEvidence = {
  requiredReports: [{
    path: "agent/state/final-launch-readiness-report.generated.json",
    generatedAt: new Date().toISOString(),
    freshness: "fresh" as const,
  }],
  targetedBehaviorEvidence: {
    path: "agent/state/targeted-behavior-evidence.generated.json",
    status: "passed",
    passed: true,
    detail: "Targeted behavior validators passed.",
    evidence: ["targetedBehavior.status=passed"],
  },
  providerSmokeEvidence: {
    path: "agent/state/provider-smoke-evidence.generated.json",
    status: "missing_formal_evidence",
    passed: false,
    detail: "Formal provider artifact remains missing.",
    evidence: ["providerArtifactStatus=missing_formal_evidence"],
  },
  runtimeSmokeEvidence: {
    path: "agent/state/runtime-smoke-evidence.generated.json",
    status: "runtime_unverified",
    passed: false,
    detail: "Deployed runtime artifact remains missing.",
    evidence: ["runtimeArtifactStatus=runtime_unverified"],
  },
  adminTruthSampleEvidence: {
    path: "agent/state/admin-truth-sample-evidence.generated.json",
    status: "missing_or_unknown",
    passed: false,
    detail: "Formal admin truth sample remains missing.",
    evidence: ["adminTruthSampleArtifactStatus=missing_or_unknown"],
  },
  openPrTriageFresh: true,
};

describe("Codex visual gate removal", () => {
  const retiredUiScoreGateId = ["visual", "Manual", "Smoke"].join("");

  it("keeps UI source coverage as a deterministic gate instead of requiring screenshots", () => {
    const visualReport = buildUiVisualSmokeMinimalReport({
      currentHead: "abc123",
      generatedAtUtc: "2026-05-21T12:00:00.000Z",
    });
    const report = buildPublicBetaScoreReport([], {
      commandBudget: buildPublicBetaCommandBudget(),
      evidence: {
        ...baseEvidence,
        uiSurfaceCoverageEvidence: summarizeUiVisualSmokeEvidenceForScore(visualReport),
      },
    });

    expect(report.evidenceGates.some((gate) => gate.id === retiredUiScoreGateId)).toBe(false);
    expect(report.launchBlockers.join("\n")).not.toMatch(/visual|screenshot|manual smoke/iu);
    expect(report.evidenceCapsApplied.join("\n")).not.toMatch(/Visual QA required|UI visual\/manual/iu);
    expect(report.operatorFinalChecks.uiVisualSurfaces.needsOperatorReview).toBe(false);
    expect(report.operatorFinalChecks.uiVisualSurfaces.sourceChecksPassed).toBe(true);
    expect(report.operatorFinalChecks.uiVisualSurfaces.status).toBe("source_surface_checked");
    expect(report.operatorFinalChecks.uiVisualSurfaces.note).toContain("source-reported UI issue");
    expect(report.operatorFinalChecks.uiVisualSurfaces.surfaces).toHaveLength(9);
    expect(report.operatorFinalChecks.uiVisualSurfaces.surfaces[0]).toEqual(expect.objectContaining({
      surfaceId: "user_dashboard_mobile",
      status: "source_surface_checked",
    }));
  });

  it("does not let UI source coverage clear runtime/provider/admin gates", () => {
    const visualReport = buildUiVisualSmokeMinimalReport();
    const report = buildPublicBetaScoreReport([], {
      commandBudget: buildPublicBetaCommandBudget(),
      evidence: {
        ...baseEvidence,
        uiSurfaceCoverageEvidence: summarizeUiVisualSmokeEvidenceForScore(visualReport),
      },
    });

    expect(report.operatorFinalChecks.uiVisualSurfaces.passedInCodex).toBe(true);
    expect(report.operatorFinalChecks.uiVisualSurfaces.surfaces.every((surface) =>
      surface.status === "source_surface_checked" || surface.status === "not_required"
    )).toBe(true);
    expect(report.launchBlockers).toEqual(expect.arrayContaining([
      "Provider-backed source activity + deployed route evidence: Source evidence required",
      "Admin source activity evidence: Source evidence required",
    ]));
    expect(report.scoreExplanation.sourcePassConfidence).toContain("provider-backed source activity, deployed route, admin source activity");
    expect(report.scoreExplanation.sourcePassConfidence).not.toContain("visual");
  });
});
