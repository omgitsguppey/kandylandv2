import { describe, expect, it } from "vitest";

import {
  buildBetaEvidenceLanePrepReport,
  validateBetaEvidenceLanePrepReport,
} from "../../scripts/agent/validate-beta-evidence-lane-prep";

describe("beta evidence lane prep", () => {
  it("maps every beta evidence lane to a folder, template, checklist, validator, and next action", () => {
    const report = buildBetaEvidenceLanePrepReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-20T22:00:00.000Z",
      evidenceCaptureSummary: {
        manualScreenshotEvidence: "missing",
        providerSmokeEvidence: "missing",
        runtimeSmokeEvidence: "missing",
        adminTruthSampleEvidence: "missing",
        canStartBetaExitReview: false,
      },
      operatorRevenueSmoke: {
        revenueSmokeStatus: "operator_confirmed_revenue_smoke",
        amountUsdConfirmed: 50,
        product: "GumDrops",
        formalProviderSmokePassed: false,
        providerArtifactAttached: false,
        providerSmokeGateStatus: "missing_formal_evidence",
      },
      refreshPlan: [
        {
          artifactPath: "agent/state/operator-revenue-smoke.generated.json",
          status: "stale_source_version",
          nextAction: "Refresh this report from the latest code version. Run: npm run check:operator-revenue-smoke",
          refreshCommand: "npm run check:operator-revenue-smoke",
        },
      ],
    });

    const laneIds = report.lanes.map((lane) => lane.id);
    expect(laneIds).toEqual([
      "manual_screenshot_qa",
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
      operatorRevenueSmoke: {
        revenueSmokeStatus: "operator_confirmed_revenue_smoke",
        amountUsdConfirmed: 50,
        product: "GumDrops",
        formalProviderSmokePassed: false,
        providerArtifactAttached: false,
        providerSmokeGateStatus: "missing_formal_evidence",
      },
    });
    const operatorLane = report.lanes.find((lane) => lane.id === "operator_confirmed_revenue_smoke");
    const providerLane = report.lanes.find((lane) => lane.id === "provider_smoke");

    expect(operatorLane?.status).toBe("operator_confirmed");
    expect(operatorLane?.completeAsProductSignal).toBe(true);
    expect(operatorLane?.clearsFormalProviderGate).toBe(false);
    expect(providerLane?.status).toBe("formal_missing");
    expect(report.summary.betaExitReady).toBe(false);
    expect(report.operatorPlainLanguageNote).toBe("A real $50 GumDrop payment was operator-confirmed. Formal provider evidence is still separate.");
  });

  it("fails validation when a formal lane lacks a source-to-proof checklist or stale action", () => {
    const report = buildBetaEvidenceLanePrepReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-20T22:00:00.000Z",
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
      "manual_screenshot_qa must include folder, template, checklist, validator, status enum, score impact, launch gate impact, and next action.",
      "stale report agent/state/operator-revenue-smoke.generated.json must include a refresh action.",
    ]));
  });
});
