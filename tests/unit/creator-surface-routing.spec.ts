import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildCreatorSurfaceRoutingReport,
  validateCreatorSurfaceRoutingReport,
  type CreatorSurfaceRoutingReport,
} from "../../scripts/agent/validate-creator-surface-routing";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("creator surface routing", () => {
  it("keeps /dashboard/creator as the landing surface", () => {
    const page = read("src/app/dashboard/creator/page.tsx");

    expect(page).toContain("CreatorDashboardLandingRoute");
    expect(page).not.toContain("CreatorDashboardSettingsHub");
  });

  it("renders CreatorDashboardSettingsHub from the creator settings workspace route", () => {
    const pagePath = "src/app/dashboard/creator/settings/page.tsx";
    expect(existsSync(join(root, pagePath))).toBe(true);
    expect(read(pagePath)).toContain("CreatorDashboardSettingsHub");
  });

  it("routes creator navigation to separate dashboard and settings surfaces", () => {
    const sidebar = read("src/components/Navigation/ProfileSidebar.tsx");
    const dropdown = read("src/components/Navigation/ProfileDropdown.tsx");

    for (const source of [sidebar, dropdown]) {
      expect(source).toContain("label=\"Creator Dashboard\"");
      expect(source).toContain("href={CREATOR_DASHBOARD_ROUTE}");
      expect(source).toContain("label=\"Creator Settings\"");
      expect(source).toContain("href={CREATOR_SETTINGS_ROUTE}");
    }
  });

  it("labels account settings separately from creator settings", () => {
    const sidebar = read("src/components/Navigation/ProfileSidebar.tsx");
    const dropdown = read("src/components/Navigation/ProfileDropdown.tsx");

    for (const source of [sidebar, dropdown]) {
      expect(source).toContain('label="Account Settings"');
      expect(source).toContain("href={USER_SETTINGS_ROUTE}");
      expect(source).not.toContain('label="Settings"');
      expect(source).not.toContain('title="Settings"');
      expect(source).not.toContain('aria-label="Open settings"');
    }
  });

  it("keeps user settings/profile from owning creator operations", () => {
    const userSettings = read("src/components/Settings/UserSettingsPage.tsx");
    const legacyCreatorSettings = read("src/app/dashboard/profile/creator/page.tsx");

    expect(userSettings).toContain("Creator tools moved to Creator Settings.");
    expect(userSettings).toContain("Open Creator Settings");
    expect(userSettings).toContain("href={CREATOR_SETTINGS_ROUTE}");
    expect(legacyCreatorSettings).toContain("Creator settings now live in Creator Settings.");
    expect(legacyCreatorSettings).toContain("Open Creator Settings");
  });

  it("links the landing dashboard Creator settings pill to creator settings", () => {
    const landing = read("src/components/Dashboard/creator-workspace/CreatorDashboardQuickActions.tsx");

    expect(landing).toContain("href={CREATOR_SETTINGS_ROUTE}");
    expect(landing).not.toContain("Creator settings</Link>\r\n                        </div>");
  });

  it("routes the landing drop CTA to the creator drop manager", () => {
    const landing = read("src/components/Dashboard/creator-workspace/CreatorDashboardQuickActions.tsx");
    const routing = read("src/lib/creator-profile-routing.ts");

    expect(routing).toContain('CREATOR_DROP_MANAGE_ROUTE = "/dashboard/creator/drops"');
    expect(routing).toContain('CREATOR_DROP_ROUTE_STATE = "creator_submission"');
    expect(landing).toContain("Manage drops");
    expect(landing).toContain("href={CREATOR_DROP_MANAGE_ROUTE}");
    expect(landing).toContain("data-create-drop-route-state={CREATOR_DROP_ROUTE_STATE}");
    expect(read("src/components/Creators/CreatorDropManager.tsx")).toContain('data-drop-manager-surface="creator_submission"');
    expect(landing).not.toContain('href="/dashboard/drops"');
    expect(landing).not.toMatch(/Create drop/u);
  });

  it("blocks raw creator settings internal error copy and uses HumanErrorNotice", () => {
    const landing = read("src/components/Dashboard/CreatorWorkspacePanel.tsx");
    const sourceNotice = read("src/components/Dashboard/creator-workspace/CreatorDashboardSourceNotice.tsx");
    const settingsHub = read("src/components/Creators/CreatorDashboardSettingsHub.tsx");
    const combined = `${landing}\n${sourceNotice}\n${settingsHub}`;

    expect(combined).not.toContain("creator settings: Internal server error");
    expect(combined).not.toMatch(/>\s*Internal server error\s*</u);
    expect(combined).toContain("HumanErrorNotice");
    expect(combined).toContain("dashboard_source_unavailable");
    expect(settingsHub).toContain("HumanErrorNotice");
  });

  it("shows partial source review states without platform errors on successful creator settings responses", () => {
    const landing = read("src/components/Dashboard/CreatorWorkspacePanel.tsx");
    const sourceNotice = read("src/components/Dashboard/creator-workspace/CreatorDashboardSourceNotice.tsx");
    const settingsHub = read("src/components/Creators/CreatorDashboardSettingsHub.tsx");
    const combinedLanding = `${landing}\n${sourceNotice}`;

    expect(combinedLanding).toContain("data-creator-landing-source-review=\"partial_safe\"");
    expect(combinedLanding).toContain("Creator Settings need setup");
    expect(settingsHub).toContain("data-creator-settings-source-state={settingsState}");
    expect(settingsHub).toContain("Creator Settings need setup");
  });

  it("marks both creator surfaces with compact mobile density and bottom spacing", () => {
    const landing = read("src/components/Dashboard/CreatorWorkspacePanel.tsx");
    const overview = read("src/components/Dashboard/creator-workspace/CreatorDashboardOverviewModule.tsx");
    const settingsHub = read("src/components/Creators/CreatorDashboardSettingsHub.tsx");

    expect(landing).toContain("data-creator-dashboard-landing-density=\"mobile_compact\"");
    expect(landing).toContain("data-creator-landing-mobile-density=\"compact_v2\"");
    expect(landing).toContain("data-bottom-nav-safe=\"true\"");
    expect(landing).toContain("data-report-issue-safe-offset=\"bottom-nav\"");
    expect(overview).toContain("data-creator-overview-module=\"compact_v1\"");
    expect(overview).toContain("data-creator-dashboard-overview-density=\"mobile_compact\"");
    expect(overview).toContain("data-creator-dashboard-content-scope=\"creator_owned_or_assigned\"");
    expect(landing).not.toContain("data-creator-landing-metric-card=\"compact_v2\"");
    expect(settingsHub).toContain("data-creator-dashboard-density=\"mobile_compact\"");
    expect(settingsHub).toContain("data-bottom-nav-safe=\"true\"");
  });

  it("validates the generated report shape", () => {
    const report = buildCreatorSurfaceRoutingReport();
    const failures = validateCreatorSurfaceRoutingReport(report);

    expect(failures).toEqual([]);
    expect(report.summary.baseDashboardRoute).toBe("/dashboard/creator");
    expect(report.summary.creatorSettingsRoute).toBe("/dashboard/creator/settings");
    expect(report.summary.rawErrorLeaks).toBe(0);
    expect(report.nextFixOrder.length).toBeGreaterThan(0);
  });

  it("fails validation if raw error leaks are represented", () => {
    const report = buildCreatorSurfaceRoutingReport();
    const badReport: CreatorSurfaceRoutingReport = {
      ...report,
      summary: {
        ...report.summary,
        rawErrorLeaks: 1,
      },
    };

    expect(validateCreatorSurfaceRoutingReport(badReport)).toContain("raw creator settings error leaks remain");
  });
});
