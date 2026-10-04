import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildCreatorNavRoleConsolidationReport,
  validateCreatorNavRoleConsolidationReport,
  hasCreatorNavigationItem,
  type CreatorNavRoleConsolidationReport,
} from "../../scripts/agent/validate-creator-nav-role-consolidation";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

function readIfExists(path: string) {
  const fullPath = join(root, path);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function readCreatorWorkspaceModules() {
  const folder = join(root, "src/components/Dashboard/creator-workspace");
  const workspace = read("src/components/Dashboard/CreatorWorkspacePanel.tsx");
  return readdirSync(folder)
    .filter((name) => /\.(ts|tsx)$/u.test(name) && workspace.includes(`./creator-workspace/${name.replace(/\.(ts|tsx)$/u, "")}`))
    .sort()
    .map((name) => readIfExists(`src/components/Dashboard/creator-workspace/${name}`))
    .join("\n");
}

describe("creator nav and role consolidation", () => {
  it("routes creator dashboard, creator settings, and account settings to canonical destinations", () => {
    const routing = read("src/lib/creator-profile-routing.ts");
    const sidebar = read("src/components/Navigation/ProfileSidebar.tsx");
    const dropdown = read("src/components/Navigation/ProfileDropdown.tsx");
    const bottomNav = read("src/components/Navigation/MobileBottomBar.tsx");

    expect(routing).toContain('CREATOR_DASHBOARD_ROUTE = "/dashboard/creator"');
    expect(routing).toContain('CREATOR_SETTINGS_ROUTE = "/dashboard/creator/settings"');
    expect(routing).toContain('USER_SETTINGS_ROUTE = "/settings"');
    expect(hasCreatorNavigationItem(sidebar, "CREATOR_DASHBOARD_ROUTE", ["Creator dashboard"])).toBe(true);
    expect(hasCreatorNavigationItem(dropdown, "CREATOR_DASHBOARD_ROUTE", ["Studio"])).toBe(true);
    expect(hasCreatorNavigationItem(sidebar, "CREATOR_SETTINGS_ROUTE", ["Creator settings"])).toBe(true);
    expect(hasCreatorNavigationItem(dropdown, "CREATOR_SETTINGS_ROUTE", ["Creator settings"])).toBe(true);
    expect(hasCreatorNavigationItem(sidebar, "USER_SETTINGS_ROUTE", ["Settings"])).toBe(true);
    expect(hasCreatorNavigationItem(dropdown, "USER_SETTINGS_ROUTE", ["Settings"])).toBe(true);
    expect(sidebar).toContain("navigationSections={navigationSections}");
    expect(dropdown).toContain("navigationSections={navigationSections}");
    expect(read("src/components/creative-tim/kandydrops/navigation/ProfileSidebarSurface.tsx")).toContain("href={item.href}");
    expect(read("src/components/creative-tim/kandydrops/navigation/KandyProfileMenuSurface.tsx")).toContain("href={item.href}");
    expect(bottomNav).toContain("creatorDashboardHref");
    expect(bottomNav).toContain("CREATOR_DASHBOARD_ROUTE");
  });

  it("keeps creator and user dashboard surfaces from stacking", () => {
    const dashboard = read("src/app/dashboard/DashboardClient.tsx");
    const creatorPage = read("src/app/dashboard/creator/page.tsx");
    const workspace = read("src/components/Dashboard/CreatorWorkspacePanel.tsx");
    const creatorSurface = `${creatorPage}\n${workspace}\n${readCreatorWorkspaceModules()}`;

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

  it("keeps Fan Pass CRM readable and broadcasts on the supported follower audience", () => {
    const workspace = read("src/components/Dashboard/CreatorWorkspacePanel.tsx");
    const workspaceModules = readCreatorWorkspaceModules();
    const fanPassManager = read("src/components/Creators/CreatorFanPassManager.tsx");
    const subscriberRow = read("src/components/Creators/FanPassSubscriberRow.tsx");
    const broadcastManager = read("src/components/Creators/CreatorBroadcastManager.tsx");
    const creatorSettingsHub = read("src/components/Creators/CreatorDashboardSettingsHub.tsx");
    const combinedCreatorUi = `${workspace}\n${workspaceModules}\n${fanPassManager}\n${subscriberRow}\n${broadcastManager}\n${creatorSettingsHub}`;

    expect(combinedCreatorUi).toContain('data-fan-pass-crm="mobile_v1"');
    expect(fanPassManager).toContain('data-fan-pass-crm="mobile_v1"');
    expect(subscriberRow).toContain('data-raw-user-id-hidden="true"');
    expect(combinedCreatorUi).not.toContain("subscription.userId || subscription.id");
    expect(combinedCreatorUi).not.toMatch(/all_fans|all followers|Tell followers|for followers/iu);
    expect(combinedCreatorUi).toContain('data-broadcast-audience="followers"');
    expect(broadcastManager).toContain('data-broadcast-audience="followers"');
    expect(combinedCreatorUi).toContain("Audience: Followers");
  });

  it("keeps the compact overview and removes old standalone metric grids", () => {
    const workspace = `${read("src/components/Dashboard/CreatorWorkspacePanel.tsx")}\n${readCreatorWorkspaceModules()}`;

    expect(workspace).toContain("<CreatorOperatingRunway");
    expect(read("src/components/creative-tim/kandydrops/creator/CreatorOperatingRunway.tsx")).toContain("data-creator-operating-runway");
    expect(read("src/app/api/creator/settings/route.ts")).toContain('contentCountScope: "creator_owned_or_assigned"');
    expect(read("src/app/api/creator/settings/route.ts")).toContain("shouldCountDropForCreatorDashboard(drop, creatorId)");
    expect(workspace).toContain("creatorStats?.contentCount ?? creatorStats?.liveDropsCount");
    expect(workspace).toContain('detail: "Owned or assigned drops"');
    expect(workspace).toContain("facts={runwayFacts}");
    expect(read("src/components/creative-tim/kandydrops/creator/CreatorOperatingRunway.tsx")).toContain("{fact.value}");
    expect(workspace).not.toContain('data-creator-landing-metric-card="compact_v2"');
  });

  it("documents the canonical creator/user route matrix without conflicting doctrine", () => {
    const doc = read("docs/agent-truth/creator-nav-role-consolidation.md");

    expect(doc).toContain("| `/dashboard` | User dashboard surface |");
    expect(doc).toContain("| `/dashboard/creator` | Creator dashboard landing |");
    expect(doc).toContain("| `CREATOR_SETTINGS_ROUTE` | Creator settings/workspace |");
    expect(doc).toContain("| `/settings` | Account Settings |");
    expect(doc).toContain("| `/dashboard/settings`, `/dashboard/profile`, `/profile/settings`, `/account` | Account Settings redirects |");
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

  it("binds a navigation label to its own route rather than another entry", () => {
    const mismatched = '{ href: USER_SETTINGS_ROUTE, label: "Other" }, { href: "/unrelated", label: "Settings" }';
    expect(hasCreatorNavigationItem(mismatched, "USER_SETTINGS_ROUTE", ["Settings"])).toBe(false);
    expect(hasCreatorNavigationItem('{ href: USER_SETTINGS_ROUTE, icon: Settings, label: "Settings" }', "USER_SETTINGS_ROUTE", ["Settings"])).toBe(true);
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
