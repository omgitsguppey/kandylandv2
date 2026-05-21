import { describe, expect, it } from "vitest";

import {
  buildMobileResidualScoreImpactReport,
  IMPACT_RANKING_CATEGORIES,
  validateMobileResidualScoreImpactReport,
  type MobileResidualScoreImpactReport,
} from "../../scripts/agent/validate-mobile-residual-score-impact";

const baseInputs = {
  currentHead: "head",
  generatedAtUtc: "2026-05-21T12:00:00.000Z",
  changedFiles: [
    "src/app/admin/debug/page.tsx",
    "src/app/creators/[username]/CreatorProfileClient.tsx",
    "src/components/Dashboard/RecentActivityFeed.tsx",
    "src/components/Dashboard/DailyTasksModule.tsx",
    "src/components/Dashboard/CollectionList.tsx",
  ],
  packageJson: '"check:mobile-residual-score-impact"',
  sourceFiles: {
    "src/app/admin/debug/page.tsx": 'data-mobile-residual-cleanup="score-impact" className="p-3 sm:p-4"',
    "src/app/creators/[username]/CreatorProfileClient.tsx": 'data-mobile-residual-cleanup="score-impact" className="py-8 sm:py-10"',
    "src/components/Dashboard/RecentActivityFeed.tsx": 'data-mobile-residual-cleanup="score-impact" className="rounded-[1.35rem] p-3.5 sm:p-5"',
    "src/components/Dashboard/DailyTasksModule.tsx": 'data-mobile-residual-cleanup="score-impact" className="p-4 sm:p-6"',
    "src/components/Dashboard/CollectionList.tsx": 'data-mobile-residual-cleanup="score-impact" className="py-8 sm:py-12"',
  },
  existingReports: {
    mobileUiFinalLock: "mobile-ui-final-lock",
    hardcodedCssCleanup: "mobile-hardcoded-css-cleanup",
  },
};

describe("mobile residual score-impact cleanup", () => {
  it("includes every required impact ranking category", () => {
    const report = buildMobileResidualScoreImpactReport(baseInputs);

    expect(report.impactRanking.map((entry) => entry.category)).toEqual(expect.arrayContaining([...IMPACT_RANKING_CATEGORIES]));
    expect(validateMobileResidualScoreImpactReport(report)).toEqual([]);
  });

  it("fails if chat or navigation files are touched", () => {
    const report = buildMobileResidualScoreImpactReport({
      ...baseInputs,
      changedFiles: ["src/components/Chat/ChatExperience.tsx", "src/components/Navigation/ProfileSidebar.tsx"],
    });

    expect(report.summary.chatUntouched).toBe(false);
    expect(report.summary.navUntouched).toBe(false);
    expect(validateMobileResidualScoreImpactReport(report)).toContain("protected chat/nav files changed.");
  });

  it("fails when a high-impact residual remains without a reason", () => {
    const report = buildMobileResidualScoreImpactReport({
      ...baseInputs,
      sourceFiles: {
        ...baseInputs.sourceFiles,
        "src/components/Dashboard/RecentActivityFeed.tsx": 'className="glass-panel rounded-3xl p-6"',
      },
    });

    expect(validateMobileResidualScoreImpactReport(report)).toContain("high-impact mobile residual remains without reason.");
  });

  it("fails when impact ranking is missing", () => {
    const report: MobileResidualScoreImpactReport = {
      ...buildMobileResidualScoreImpactReport(baseInputs),
      impactRanking: [],
    };

    expect(validateMobileResidualScoreImpactReport(report)).toContain("impact ranking missing.");
  });

  it("tracks deferred cosmetic residuals instead of half-fixing them", () => {
    const report = buildMobileResidualScoreImpactReport(baseInputs);

    expect(report.deferredResiduals.some((entry) => entry.category === "merely cosmetic")).toBe(true);
    expect(report.nextExactSteps.length).toBeGreaterThan(0);
  });
});
