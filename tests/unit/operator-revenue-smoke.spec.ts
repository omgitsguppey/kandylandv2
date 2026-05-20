import { describe, expect, it } from "vitest";

import {
  buildOperatorRevenueSmokeReport,
  validateOperatorRevenueSmokeReport,
  type OperatorRevenueSmokeReport,
} from "../../scripts/agent/validate-operator-revenue-smoke";

function reportFixture(overrides: Partial<OperatorRevenueSmokeReport> = {}): OperatorRevenueSmokeReport {
  const report = buildOperatorRevenueSmokeReport({
    currentHead: "head",
    generatedAtUtc: "2026-05-20T12:00:00.000Z",
  });

  return {
    ...report,
    ...overrides,
    summary: {
      ...report.summary,
      ...overrides.summary,
    },
  };
}

describe("operator revenue smoke", () => {
  it("records the operator-confirmed GumDrop payment without treating it as provider proof", () => {
    const report = reportFixture();

    expect(report.summary.revenueSmokeStatus).toBe("operator_confirmed_revenue_smoke");
    expect(report.summary.amountUsdConfirmed).toBe(50);
    expect(report.summary.product).toBe("GumDrops");
    expect(report.summary.confirmationSource).toBe("operator_confirmed");
    expect(report.summary.providerArtifactAttached).toBe(false);
    expect(report.summary.formalProviderSmokePassed).toBe(false);
    expect(report.summary.betaGateImpact).toBe("product_signal_only");
    expect(validateOperatorRevenueSmokeReport(report, "head")).toEqual([]);
  });

  it("fails if operator confirmation is promoted to formal provider proof", () => {
    const report = reportFixture({
      summary: {
        ...reportFixture().summary,
        formalProviderSmokePassed: true,
        betaGateImpact: "provider_gate_passed",
      } as unknown as OperatorRevenueSmokeReport["summary"],
    });

    const failures = validateOperatorRevenueSmokeReport(report, "head");
    expect(failures).toContain("operator-confirmed revenue smoke must not be treated as formal provider proof.");
    expect(failures).toContain("operator confirmation must keep betaGateImpact as product_signal_only.");
  });

  it("fails if beta exit is marked ready from operator confirmation alone", () => {
    const report = reportFixture({
      summary: {
        ...reportFixture().summary,
        canStartBetaExitReview: true,
      } as unknown as OperatorRevenueSmokeReport["summary"],
    });

    expect(validateOperatorRevenueSmokeReport(report, "head")).toContain(
      "operator-confirmed revenue smoke alone must not mark beta exit ready.",
    );
  });

  it("requires the plain-language separation note", () => {
    const report = reportFixture({
      plainLanguageNote: "A payment happened.",
    });

    expect(validateOperatorRevenueSmokeReport(report, "head")).toContain(
      "plainLanguageNote must separate real $50 payment confirmation from formal provider evidence.",
    );
  });
});
