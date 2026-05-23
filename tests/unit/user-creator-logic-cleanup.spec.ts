import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildUserCreatorLogicCleanupReport,
  validateUserCreatorLogicCleanupReport,
  type UserCreatorLogicCleanupReport,
} from "../../scripts/agent/validate-user-creator-logic-cleanup";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

function lineCount(path: string) {
  return read(path).split(/\r?\n/u).length;
}

describe("user creator logic cleanup", () => {
  it("splits creator workspace rendering into focused modules", () => {
    const expectedModules = [
      "src/components/Dashboard/creator-workspace/CreatorDashboardOverviewModule.tsx",
      "src/components/Dashboard/creator-workspace/CreatorDashboardQuickActions.tsx",
      "src/components/Dashboard/creator-workspace/CreatorBroadcastCard.tsx",
      "src/components/Dashboard/creator-workspace/CreatorActionQueuePanel.tsx",
      "src/components/Dashboard/creator-workspace/CreatorFanPassCrmPanel.tsx",
      "src/components/Dashboard/creator-workspace/CreatorDashboardSourceNotice.tsx",
    ];

    for (const modulePath of expectedModules) {
      expect(existsSync(join(root, modulePath)), `${modulePath} should exist`).toBe(true);
      expect(lineCount(modulePath), `${modulePath} should stay focused`).toBeLessThan(300);
    }

    const workspace = read("src/components/Dashboard/CreatorWorkspacePanel.tsx");
    expect(lineCount("src/components/Dashboard/CreatorWorkspacePanel.tsx")).toBeLessThan(500);
    expect(workspace).toContain("CreatorDashboardOverviewModule");
    expect(workspace).toContain("CreatorDashboardQuickActions");
    expect(workspace).toContain("CreatorBroadcastCard");
    expect(workspace).toContain("CreatorActionQueuePanel");
    expect(workspace).toContain("CreatorFanPassCrmPanel");
    expect(workspace).toContain("CreatorDashboardSourceNotice");
  });

  it("keeps creator and user dashboard surfaces route-scoped", () => {
    const dashboardClient = read("src/app/dashboard/DashboardClient.tsx");
    const creatorPage = read("src/app/dashboard/creator/page.tsx");
    const workspace = read("src/components/Dashboard/CreatorWorkspacePanel.tsx");
    const overviewModule = read("src/components/Dashboard/creator-workspace/CreatorDashboardOverviewModule.tsx");

    expect(`${creatorPage}\n${workspace}`).toContain('data-dashboard-surface="creator_dashboard"');
    expect(workspace).toContain('data-creator-dashboard-content-boundary="creator_only"');
    expect(workspace).toContain('data-user-dashboard-modules-rendered="false"');
    expect(`${creatorPage}\n${workspace}\n${overviewModule}`).not.toContain("<DailyCheckIn");
    expect(`${creatorPage}\n${workspace}\n${overviewModule}`).not.toContain("<CreatorDiscoveryRail");
    expect(`${creatorPage}\n${workspace}\n${overviewModule}`).not.toContain("<RecentActivityFeed");
    expect(`${creatorPage}\n${workspace}\n${overviewModule}`).not.toContain("<CollectionList");
    expect(dashboardClient).toContain('data-dashboard-surface="user_dashboard"');
    expect(dashboardClient).toContain("router.replace(CREATOR_DASHBOARD_ROUTE)");
  });

  it("consolidates creator route constants without routing Manage drops to My KandyDrops", () => {
    const routing = read("src/lib/creator-profile-routing.ts");
    const workspace = read("src/components/Dashboard/CreatorWorkspacePanel.tsx");
    const quickActions = read("src/components/Dashboard/creator-workspace/CreatorDashboardQuickActions.tsx");

    expect(routing).toContain('CREATOR_DASHBOARD_ROUTE = "/dashboard/creator"');
    expect(routing).toContain('CREATOR_SETTINGS_ROUTE = "/dashboard/creator/settings"');
    expect(routing).toContain('CREATOR_DROP_MANAGE_ROUTE = "/dashboard/creator/drops"');
    expect(routing).toContain('USER_SETTINGS_ROUTE = "/settings"');
    expect(routing).toContain('USER_LIBRARY_ROUTE = "/dashboard/library"');
    expect(`${workspace}\n${quickActions}`).toContain("href={CREATOR_DROP_MANAGE_ROUTE}");
    expect(`${workspace}\n${quickActions}`).not.toContain('href="/dashboard/library"');
  });

  it("keeps Fan Pass CRM and broadcast audience rendering consolidated", () => {
    const queuePanel = read("src/components/Dashboard/creator-workspace/CreatorActionQueuePanel.tsx");
    const crmPanel = read("src/components/Dashboard/creator-workspace/CreatorFanPassCrmPanel.tsx");
    const broadcastCard = read("src/components/Dashboard/creator-workspace/CreatorBroadcastCard.tsx");
    const row = read("src/components/Creators/FanPassSubscriberRow.tsx");

    expect(crmPanel).toContain("FanPassSubscriberRow");
    expect(crmPanel).toContain('data-fan-pass-crm="mobile_v1"');
    expect(row).toContain('data-raw-user-id-hidden="true"');
    expect(`${queuePanel}\n${crmPanel}`).not.toContain("subscription.userId || subscription.id");
    expect(broadcastCard).toContain('data-broadcast-audience="all_fans"');
    expect(broadcastCard).toContain("Audience: Fans");
    expect(broadcastCard).not.toMatch(/all followers|for followers/iu);
  });

  it("validates the cleanup report and blocks unresolved P0/P1 conflicts", () => {
    const report = buildUserCreatorLogicCleanupReport();
    const failures = validateUserCreatorLogicCleanupReport(report);

    expect(failures).toEqual([]);
    expect(report.reportKey).toBe("user-creator-logic-cleanup");
    expect(report.summary.conflictsFound).toBeGreaterThan(0);
    expect(report.summary.conflictsFixed).toBeGreaterThan(0);
    expect(report.summary.monolithsSplit).toBeGreaterThan(0);
    expect(report.summary.routeConstantsConsolidated).toBe(true);
    expect(report.summary.userDashboardPreserved).toBe(true);
    expect(report.summary.creatorDashboardPreserved).toBe(true);
  });

  it("fails validation when a required split is skipped", () => {
    const report = buildUserCreatorLogicCleanupReport();
    const badReport: UserCreatorLogicCleanupReport = {
      ...report,
      summary: {
        ...report.summary,
        monolithsSplit: 0,
      },
    };

    expect(validateUserCreatorLogicCleanupReport(badReport)).toContain("creator workspace monolith split was required but not completed");
  });
});
