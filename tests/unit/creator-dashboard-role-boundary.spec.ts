import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildCreatorDashboardRoleBoundaryReport,
  validateCreatorDashboardRoleBoundaryReport,
  type CreatorDashboardRoleBoundaryReport,
} from "../../scripts/agent/validate-creator-dashboard-role-boundary";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("creator dashboard role boundary", () => {
  it("keeps /dashboard/creator scoped to creator modules only", () => {
    const page = read("src/app/dashboard/creator/page.tsx");
    const workspace = read("src/components/Dashboard/CreatorWorkspacePanel.tsx");
    const combined = `${page}\n${workspace}`;

    expect(page).toContain("CreatorDashboardLandingRoute");
    expect(combined).toContain('data-dashboard-surface="creator_dashboard"');
    expect(combined).toContain('data-creator-dashboard-content-boundary="creator_only"');
    expect(combined).toContain('data-user-dashboard-modules-rendered="false"');
    expect(combined).not.toContain("<DailyCheckIn");
    expect(combined).not.toContain("<CreatorDiscoveryRail");
    expect(combined).not.toContain("<RecentActivityFeed");
    expect(combined).not.toContain("<CollectionList");
    expect(combined).not.toContain("Owned / Locked");
    expect(combined).not.toContain('data-library-tabs="owned_locked"');
  });

  it("redirects creator-role /dashboard away from the user dashboard stack", () => {
    const dashboardClient = read("src/app/dashboard/DashboardClient.tsx");

    expect(dashboardClient).toContain("const isCreatorPrimaryDashboard");
    expect(dashboardClient).toContain("router.replace(CREATOR_DASHBOARD_ROUTE)");
    expect(dashboardClient).toContain('data-dashboard-surface="creator_redirect"');
    expect(dashboardClient).not.toContain("CreatorWorkspacePanel");
  });

  it("preserves normal user dashboard modules on the user dashboard surface", () => {
    const dashboardClient = read("src/app/dashboard/DashboardClient.tsx");

    expect(dashboardClient).toContain('data-dashboard-surface="user_dashboard"');
    expect(dashboardClient).toContain("<DailyCheckIn");
    expect(dashboardClient).toContain("<CreatorDiscoveryRail");
    expect(dashboardClient).toContain("<RecentActivityFeed");
    expect(dashboardClient).toContain("<CollectionList");
  });

  it("keeps creator user access to explicit user/library routes and bottom navigation", () => {
    const routing = read("src/lib/creator-profile-routing.ts");
    const bottomNav = read("src/components/Navigation/MobileBottomBar.tsx");
    const coreLayout = read("src/components/CoreLayoutWrapper.tsx");

    expect(routing).toContain('CREATOR_DROP_MANAGE_ROUTE = "/dashboard/creator/drops"');
    expect(routing).toContain('CREATOR_DROP_ROUTE_STATE = "creator_submission"');
    expect(bottomNav).toContain("CREATOR_DASHBOARD_ROUTE");
    expect(bottomNav).toContain("creatorDashboardHref");
    expect(coreLayout).toContain("<MobileBottomBar />");
  });

  it("documents that creator and user dashboard bodies must not stack", () => {
    const doc = read("docs/agent-truth/creator-dashboard-role-boundary.md");
    const creatorRoutingDoc = read("docs/agent-truth/creator-surface-routing.md");

    expect(doc).toContain("/dashboard/creator is a creator operations landing surface");
    expect(doc).toContain("must not fall through into Daily Check-In");
    expect(doc).toContain("Normal users must still see user dashboard modules");
    expect(`${doc}\n${creatorRoutingDoc}`).not.toMatch(/creator dashboard includes user dashboard below it/iu);
  });

  it("validates the generated role boundary report shape", () => {
    const report = buildCreatorDashboardRoleBoundaryReport();
    const failures = validateCreatorDashboardRoleBoundaryReport(report);

    expect(failures).toEqual([]);
    expect(report.reportKey).toBe("creator-dashboard-role-boundary");
    expect(report.summary.creatorDashboardRouteScoped).toBe(true);
    expect(report.summary.userModulesRemovedFromCreatorDashboard).toBe(true);
    expect(report.summary.normalUserDashboardPreserved).toBe(true);
    expect(report.summary.bottomNavPreserved).toBe(true);
    expect(report.nextFixOrder.length).toBeGreaterThan(0);
  });

  it("fails validation when user modules still leak into creator dashboard", () => {
    const report = buildCreatorDashboardRoleBoundaryReport();
    const badReport: CreatorDashboardRoleBoundaryReport = {
      ...report,
      summary: {
        ...report.summary,
        userModulesRemovedFromCreatorDashboard: false,
      },
    };

    expect(validateCreatorDashboardRoleBoundaryReport(badReport)).toContain("user dashboard modules still render in the creator dashboard surface");
  });
});
