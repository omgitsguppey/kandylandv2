import { describe, expect, it } from "vitest";

import {
  buildMobileSurfaceOrganizationReport,
  validateMobileSurfaceOrganizationReport,
} from "../../scripts/agent/validate-mobile-surface-organization";

const baseSources = {
  packageJson: "check:mobile-surface-organization",
  doctrine: "Admin Creator User summary first drilldowns",
};

describe("mobile surface organization", () => {
  it("passes when admin, user, and creator surfaces expose summary-first organization markers", () => {
    const report = buildMobileSurfaceOrganizationReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-19T12:00:00.000Z",
      changedFiles: [
        "src/app/admin/analytics/page.tsx",
        "src/app/admin/debug/page.tsx",
        "src/app/dashboard/DashboardClient.tsx",
        "src/components/Creators/CreatorDropManager.tsx",
      ],
      sources: {
        ...baseSources,
        files: {
          "src/app/admin/analytics/page.tsx": 'data-mobile-organization="summary-first" data-mobile-drilldown="true" data-desktop-flow-collapsed="true" MetricCard TAB_OPTIONS',
          "src/app/admin/debug/page.tsx": 'data-mobile-organization="summary-first" data-mobile-drilldown="true" data-desktop-flow-collapsed="true" DEBUG_TABS StatCard',
          "src/app/dashboard/DashboardClient.tsx": 'data-mobile-organization="summary-first" data-mobile-drilldown="true" data-desktop-flow-collapsed="true" DailyCheckIn CollectionList RecentActivityFeed CreatorDiscoveryRail',
          "src/app/dashboard/library/LibraryClient.tsx": 'data-mobile-organization="summary-first" data-mobile-drilldown="true" data-user-library-surface="my-kandydrops"',
          "src/components/Creators/CreatorDropManager.tsx": 'data-mobile-organization="summary-first" data-mobile-drilldown="true" data-desktop-flow-collapsed="true" Submit drop REVIEW_TABS',
        },
      },
      inventoryMatches: [],
    });

    expect(report.summary.protectedNavChatUntouched).toBe(true);
    expect(report.summary.adminSummaryFirst).toBe(true);
    expect(report.summary.creatorWorkflowsSeparated).toBe(true);
    expect(report.summary.userDashboardPreserved).toBe(true);
    expect(validateMobileSurfaceOrganizationReport(report)).toEqual([]);
  });

  it("fails when protected nav or chat files changed", () => {
    const report = buildMobileSurfaceOrganizationReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-19T12:00:00.000Z",
      changedFiles: ["src/components/Navigation/ProfileSidebar.tsx"],
      sources: { ...baseSources, files: {} },
      inventoryMatches: [],
    });

    expect(report.summary.protectedNavChatUntouched).toBe(false);
    expect(validateMobileSurfaceOrganizationReport(report)).toContain("protected nav/chat files changed by this pass.");
  });

  it("fails when admin mobile lacks summary-first drilldown structure", () => {
    const report = buildMobileSurfaceOrganizationReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-19T12:00:00.000Z",
      changedFiles: ["src/app/admin/analytics/page.tsx"],
      sources: {
        ...baseSources,
        files: {
          "src/app/admin/analytics/page.tsx": "<table><tbody><tr><td>Raw analytics</td></tr></tbody></table>",
        },
      },
      inventoryMatches: [],
    });

    expect(report.summary.adminSummaryFirst).toBe(false);
    expect(validateMobileSurfaceOrganizationReport(report)).toContain("admin mobile default lacks summary-first drilldown organization.");
  });

  it("fails when user dashboard core modules are missing", () => {
    const report = buildMobileSurfaceOrganizationReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-19T12:00:00.000Z",
      changedFiles: ["src/app/dashboard/DashboardClient.tsx"],
      sources: {
        ...baseSources,
        files: {
          "src/app/dashboard/DashboardClient.tsx": 'data-mobile-organization="summary-first" DailyCheckIn',
        },
      },
      inventoryMatches: [],
    });

    expect(report.summary.userDashboardPreserved).toBe(false);
    expect(validateMobileSurfaceOrganizationReport(report)).toContain("user dashboard key modules are not preserved.");
  });

  it("fails when creator surfaces stack unrelated modules without a drilldown path", () => {
    const report = buildMobileSurfaceOrganizationReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-19T12:00:00.000Z",
      changedFiles: ["src/components/Creators/CreatorDashboardSettingsHub.tsx"],
      sources: {
        ...baseSources,
        files: {
          "src/components/Creators/CreatorDashboardSettingsHub.tsx": 'CreatorBroadcastManager CreatorRequestsManager CreatorBookingsManager CreatorFanPassManager',
        },
      },
      inventoryMatches: [],
    });

    expect(report.summary.creatorWorkflowsSeparated).toBe(false);
    expect(validateMobileSurfaceOrganizationReport(report)).toContain("creator mobile workflows lack separated operations and drilldown markers.");
  });
});
