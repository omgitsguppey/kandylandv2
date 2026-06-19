import { describe, expect, it } from "vitest";

import {
  validateBetaScoreCleanupReport,
  type BetaScoreCleanupReport,
} from "../../scripts/agent/validate-beta-score-cleanup";

function reportFixture(overrides: Partial<BetaScoreCleanupReport> = {}): BetaScoreCleanupReport {
  const report: BetaScoreCleanupReport = {
    generatedAtUtc: "2026-05-17T06:00:00.000Z",
    reportKey: "beta-score-cleanup",
    currentHead: "head",
    summary: {
      betaScore: 45,
      betaStatus: "Unknown evidence",
      scannerScore: 100,
      evidenceScore: 45,
      evidenceCaps: 4,
      staleReportsRetired: 5,
      activeReportsNeedingRefresh: 1,
      costReadinessLanes: 4,
      canStartBetaExitReview: false,
    },
    scoreExplanation: {
      scoreMath: [
        "Source safety contributes 25 points.",
        "Targeted behavior contributes 20 points.",
      ],
      missingEvidenceCaps: [
        "Visual/manual smoke evidence is missing.",
      ],
      scannerScoreWarning: "Scanner score 100 is source-only and not beta readiness.",
    },
    costReadiness: {
      cloudRunCostReadiness: {
        status: "cost_review_required",
        detail: "Speed/security cost findings remain.",
        evidence: ["costRunawayWorkControls.findingCount=6"],
        blocksBetaExit: false,
      },
      cloudSqlCostReadiness: {
        status: "not_detected_in_repo",
        detail: "No creator runtime Cloud SQL path detected.",
        evidence: ["cloud-sql-agent-mirror-only"],
        blocksBetaExit: false,
      },
      geminiCloudAssistCostReadiness: {
        status: "cost_review_required",
        detail: "Gemini/Vertex owner review remains.",
        evidence: ["admin-ai-cost-surface-out-of-scope"],
        blocksBetaExit: false,
      },
      route4xxReadiness: {
        status: "source_inventory_complete",
        detail: "Expected 4xx classified; unexpected creator-dashboard 4xx fixed.",
        evidence: ["unexpected4xxFixed=1"],
        blocksBetaExit: false,
      },
    },
    staleReportClassifications: [
      {
        reportKey: "final-launch-readiness-report",
        path: "agent/state/final-launch-readiness-report.generated.json",
        classification: "retired",
        authority: "evidence-capture-status supersedes legacy launch readiness freshness",
        action: "Do not use as required score freshness.",
      },
      {
        reportKey: "speed-security-hardening",
        path: "agent/state/speed-security-hardening.generated.json",
        classification: "active",
        authority: "npm run check:speed-security",
        action: "Refresh through speed/security owner lane when cost findings are addressed.",
      },
    ],
    fixesApplied: [
      "Added beta score explanation fields.",
      "Added cost-readiness lanes.",
    ],
    nextExactSteps: [
      "Run UI source coverage.",
      "Attach provider smoke evidence.",
    ],
  };

  return {
    ...report,
    ...overrides,
    summary: {
      ...report.summary,
      ...overrides.summary,
    },
  };
}

describe("beta score cleanup validator", () => {
  it("accepts explicit score explanation, cost lanes, and stale report classification", () => {
    expect(validateBetaScoreCleanupReport(reportFixture(), "head")).toEqual([]);
  });

  it("fails when scanner score 100 is presented as readiness", () => {
    const failures = validateBetaScoreCleanupReport(reportFixture({
      scoreExplanation: {
        ...reportFixture().scoreExplanation,
        scannerScoreWarning: "Scanner score 100 means beta ready.",
      },
    }), "head");

    expect(failures).toContain("scannerScore 100 must not be presented as beta readiness.");
  });

  it("fails when not_detected_in_repo is marked as a pass", () => {
    const failures = validateBetaScoreCleanupReport(reportFixture({
      costReadiness: {
        ...reportFixture().costReadiness,
        cloudSqlCostReadiness: {
          ...reportFixture().costReadiness.cloudSqlCostReadiness,
          status: "pass",
        },
      },
    }), "head");

    expect(failures).toContain("cost readiness lanes must not mark not-detected or source-only inventory as pass.");
  });

  it("fails when beta exit is allowed with missing evidence caps", () => {
    const failures = validateBetaScoreCleanupReport(reportFixture({
      summary: {
        ...reportFixture().summary,
        canStartBetaExitReview: true,
      },
    }), "head");

    expect(failures).toContain("canStartBetaExitReview must stay false while evidence caps remain.");
  });

  it("fails on currentHead mismatch", () => {
    expect(validateBetaScoreCleanupReport(reportFixture(), "new-head")).toContain(
      "report currentHead must match git HEAD (new-head).",
    );
  });
});
