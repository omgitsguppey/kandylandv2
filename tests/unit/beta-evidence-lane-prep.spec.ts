import { describe, expect, it } from "vitest";

import {
  buildBetaEvidenceLanePrepReport,
  validateBetaEvidenceLanePrepReport,
} from "../../scripts/agent/validate-beta-evidence-lane-prep";

const evidenceCaptureSummary = {
  uiSurfaceCoverageEvidence: "complete" as const,
  providerSmokeEvidence: "missing" as const,
  runtimeSmokeEvidence: "missing" as const,
  adminTruthSampleEvidence: "missing" as const,
  canStartBetaExitReview: false,
};

const operatorRevenueSmoke = {
  revenueSmokeStatus: "operator_confirmed_revenue_smoke",
  amountUsdConfirmed: 37.5,
  product: "GumDrops",
  plainLanguageNote: "Operator-confirmed GumDrop revenue smoke was recorded. Formal provider evidence is still separate.",
  formalProviderSmokePassed: false,
  providerArtifactAttached: false,
  providerSmokeGateStatus: "missing_formal_evidence",
};

const refreshPlan = [
  {
    artifactPath: "agent/state/operator-revenue-smoke.generated.json",
    status: "stale_source_version",
    nextAction: "Refresh this report from the latest code version. Run: npm run check:operator-revenue-smoke",
    refreshCommand: "npm run check:operator-revenue-smoke",
  },
];

describe("beta evidence lane prep", () => {
  it("maps every beta evidence lane to a folder, template, checklist, validator, and next action", () => {
    const report = buildBetaEvidenceLanePrepReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-20T22:00:00.000Z",
      evidenceCaptureSummary,
      operatorRevenueSmoke,
      refreshPlan,
    });

    const laneIds = report.lanes.map((lane) => lane.id);
    expect(laneIds).toEqual([
      "ui_surface_coverage",
      "provider_smoke",
      "operator_confirmed_revenue_smoke",
      "runtime_smoke",
      "admin_truth_sample",
      "runtime_watch_time_proof",
      "cost_owner_review",
      "speed_security_owner_review",
    ]);
    expect(report.lanes.every((lane) =>
      lane.folder
      && lane.template
      && lane.checklist
      && lane.validatorCommand
      && lane.scoreImpact
      && lane.launchGateImpact
      && lane.nextAction
    )).toBe(true);
    expect(validateBetaEvidenceLanePrepReport(report, "head")).toEqual([]);
  });

  it("recognizes operator-confirmed revenue without clearing formal provider proof", () => {
    const report = buildBetaEvidenceLanePrepReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-20T22:00:00.000Z",
      evidenceCaptureSummary,
      operatorRevenueSmoke,
      refreshPlan,
    });
    const operatorLane = report.lanes.find((lane) => lane.id === "operator_confirmed_revenue_smoke");
    const providerLane = report.lanes.find((lane) => lane.id === "provider_smoke");

    expect(operatorLane?.status).toBe("operator_confirmed");
    expect(operatorLane?.completeAsProductSignal).toBe(true);
    expect(operatorLane?.clearsFormalProviderGate).toBe(false);
    expect(providerLane?.status).toBe("formal_missing");
    expect(report.summary.betaExitReady).toBe(false);
    expect(report.operatorPlainLanguageNote).toBe("Operator-confirmed GumDrop revenue smoke was recorded. Formal provider evidence is still separate.");
  });

  it("fails validation when a formal lane lacks a source-to-proof checklist or stale action", () => {
    const report = buildBetaEvidenceLanePrepReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-20T22:00:00.000Z",
      evidenceCaptureSummary,
      operatorRevenueSmoke,
      refreshPlan: [
        {
          artifactPath: "agent/state/operator-revenue-smoke.generated.json",
          status: "stale_source_version",
          nextAction: "",
          refreshCommand: "",
        },
      ],
    });
    report.lanes[0] = {
      ...report.lanes[0],
      checklist: "",
    };

    expect(validateBetaEvidenceLanePrepReport(report, "head")).toEqual(expect.arrayContaining([
      "ui_surface_coverage must include folder, template, checklist, validator, status enum, score impact, launch gate impact, and next action.",
      "stale report agent/state/operator-revenue-smoke.generated.json must include a refresh action.",
    ]));
  });
});
