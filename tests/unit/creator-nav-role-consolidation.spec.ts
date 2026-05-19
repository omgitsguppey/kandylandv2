import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildCreatorNavRoleConsolidationReport,
  validateCreatorNavRoleConsolidationReport,
  type CreatorNavRoleConsolidationReport,
} from "../../scripts/agent/validate-creator-nav-role-consolidation";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("creator nav and role consolidation", () => {
  it("routes creator dashboard, creator settings, and account settings to canonical destinations", () => {
    const routing = read("src/lib/creator-profile-routing.ts");
    const sidebar = read("src/components/Navigation/ProfileSidebar.tsx");
    const dropdown = read("src/components/Navigation/ProfileDropdown.tsx");
    const bottomNav = read("src/components/Navigation/MobileBottomBar.tsx");

    expect(routing).toContain('CREATOR_DASHBOARD_ROUTE = "/dashboard/creator"');
    expect(routing).toContain('CREATOR_SETTINGS_ROUTE = "/dashboard/creator/settings"');
    expect(routing).toContain('USER_SETTINGS_ROUTE = "/dashboard/settings"');
    expect(sidebar).toContain("href={CREATOR_DASHBOARD_ROUTE}");
    expect(sidebar).toContain("href={CREATOR_SETTINGS_ROUTE}");
    expect(sidebar).toContain("href={USER_SETTINGS_ROUTE}");
    expect(dropdown).toContain("href={USER_SETTINGS_ROUTE}");
    expect(sidebar).toContain('label="Account Settings"');
    expect(dropdown).toContain('label="Account Settings"');
    expect(bottomNav).toContain("creatorDashboardHref");
    expect(bottomNav).toContain("CREATOR_DASHBOARD_ROUTE");
  });

  it("keeps creator and user dashboard surfaces from stacking", () => {
    const dashboard = read("src/app/dashboard/DashboardClient.tsx");
    const creatorPage = read("src/app/dashboard/creator/page.tsx");
    const workspace = read("src/components/Dashboard/CreatorWorkspacePanel.tsx");
    const creatorSurface = `${creatorPage}\n${workspace}`;

    expect(creatorSurface).toContain('data-dashboard-surface="creator_dashboard"');
    expect(creatorSurface).toContain('data-creator-dashboard-content-boundary="creator_only"');
    expect(creatorSurface).toContain('data-user-dashboard-modules-rendered="false"');
    expect(creatorSurface).not.toContain("<DailyCheckIn");
    expect(creatorSurface).not.toContain("<CreatorDiscoveryRail");
    expect(creatorSurface).not.toContain("<RecentActivityFeed");
    expect(creatorSurface).not.toContain("<CollectionList");
    expect(dashboard).toContain('data-dashboard-surface="user_dashboard"');
    expect(dashboard).toContain("router.replace(CREATOR_DASHBOARD_ROUTE)");
    expect(dashboard).not.toContain("CreatorWorkspacePanel");
    expect(dashboard).toContain("<DailyCheckIn");
    expect(dashboard).toContain("<CollectionList");
  });

  it("keeps Fan Pass CRM and broadcasts on readable Fans semantics", () => {
    const workspace = read("src/components/Dashboard/CreatorWorkspacePanel.tsx");
    const fanPassManager = read("src/components/Creators/CreatorFanPassManager.tsx");
    const subscriberRow = read("src/components/Creators/FanPassSubscriberRow.tsx");
    const broadcastManager = read("src/components/Creators/CreatorBroadcastManager.tsx");
    const profileCreatorTools = read("src/app/dashboard/profile/components/ProfileCreatorToolsSection.tsx");
    const profileState = read("src/app/dashboard/profile/hooks/useProfileState.tsx");
    const combinedCreatorUi = `${workspace}\n${fanPassManager}\n${subscriberRow}\n${broadcastManager}\n${profileCreatorTools}\n${profileState}`;

    expect(workspace).toContain('data-fan-pass-crm="mobile_v1"');
    expect(fanPassManager).toContain('data-fan-pass-crm="mobile_v1"');
    expect(subscriberRow).toContain('data-raw-user-id-hidden="true"');
    expect(combinedCreatorUi).not.toContain("subscription.userId || subscription.id");
    expect(combinedCreatorUi).not.toMatch(/all followers|Tell followers|Broadcast sent to followers|for followers/iu);
    expect(workspace).toContain('data-broadcast-audience="all_fans"');
    expect(broadcastManager).toContain('data-broadcast-audience="all_fans"');
    expect(workspace).toContain("Audience: Fans");
  });

  it("keeps the compact overview and removes old standalone metric grids", () => {
    const workspace = read("src/components/Dashboard/CreatorWorkspacePanel.tsx");

    expect(workspace).toContain('data-creator-overview-module="compact_v1"');
    expect(workspace).toContain('data-creator-dashboard-overview-density="mobile_compact"');
    expect(workspace).toContain('data-creator-dashboard-content-scope="creator_owned_or_assigned"');
    expect(workspace).not.toContain('data-creator-landing-metric-card="compact_v2"');
  });

  it("documents the canonical creator/user route matrix without conflicting doctrine", () => {
    const doc = read("docs/agent-truth/creator-nav-role-consolidation.md");

    expect(doc).toContain("| `/dashboard` | User dashboard surface |");
    expect(doc).toContain("| `/dashboard/creator` | Creator dashboard landing |");
    expect(doc).toContain("| `CREATOR_SETTINGS_ROUTE` | Creator settings/workspace |");
    expect(doc).toContain("| `/dashboard/settings` | Account Settings |");
    expect(doc).not.toMatch(/Creator Settings is the same as Account Settings/iu);
    expect(doc).not.toMatch(/creator dashboard includes user dashboard below it/iu);
  });

  it("validates the generated consolidation report", () => {
    const report = buildCreatorNavRoleConsolidationReport();
    const failures = validateCreatorNavRoleConsolidationReport(report);

    expect(failures).toEqual([]);
    expect(report.reportKey).toBe("creator-nav-role-consolidation");
    expect(report.summary.routeMatrixCanonical).toBe(true);
    expect(report.summary.userDashboardModulesBlockedOnCreatorRoute).toBe(true);
    expect(report.summary.normalUserDashboardPreserved).toBe(true);
    expect(report.summary.fanPassCrmUsesReadableIdentity).toBe(true);
    expect(report.summary.broadcastAudienceExplicit).toBe(true);
  });

  it("fails validation if creator dashboard can leak user modules", () => {
    const report = buildCreatorNavRoleConsolidationReport();
    const badReport: CreatorNavRoleConsolidationReport = {
      ...report,
      summary: {
        ...report.summary,
        userDashboardModulesBlockedOnCreatorRoute: false,
      },
    };

    expect(validateCreatorNavRoleConsolidationReport(badReport)).toContain("/dashboard/creator renders user dashboard modules");
  });
});
