import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildCreatorLandingDashboardMobileReport,
  validateCreatorLandingDashboardMobileReport,
  type CreatorLandingDashboardMobileReport,
} from "../../scripts/agent/validate-creator-landing-dashboard-mobile";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("creator landing dashboard mobile", () => {
  it("keeps /dashboard/creator as the landing route", () => {
    const page = read("src/app/dashboard/creator/page.tsx");

    expect(page).toContain("CreatorDashboardLandingRoute");
    expect(page).not.toContain("CreatorDashboardSettingsHub");
  });

  it("uses a truthful manage-only drop CTA instead of the missing create route", () => {
    const landing = read("src/components/Dashboard/CreatorWorkspacePanel.tsx");
    const routing = read("src/lib/creator-profile-routing.ts");

    expect(routing).toContain('CREATOR_DROP_MANAGE_ROUTE = "/dashboard/library"');
    expect(routing).toContain('CREATOR_DROP_ROUTE_STATE = "manage_only"');
    expect(landing).toContain("Manage drops");
    expect(landing).toContain("href={CREATOR_DROP_MANAGE_ROUTE}");
    expect(landing).toContain("data-create-drop-route-state={CREATOR_DROP_ROUTE_STATE}");
    expect(landing).not.toContain('href="/dashboard/drops"');
    expect(landing).not.toMatch(/Create drop/u);
  });

  it("marks compact_v2 density for cards, unavailable values, quick actions, and safe spacing", () => {
    const landing = read("src/components/Dashboard/CreatorWorkspacePanel.tsx");

    expect(landing).toContain('data-creator-landing-mobile-density="compact_v2"');
    expect(landing).toContain('data-creator-landing-quick-actions="compact_v2"');
    expect(landing).toContain('data-creator-landing-metric-card="compact_v2"');
    expect(landing).toContain('data-creator-landing-unavailable-density="compact"');
    expect(landing).toContain("min-h-[72px]");
    expect(landing).toContain("text-lg font-black");
    expect(landing).toContain("h-3.5 w-3.5");
    expect(landing).not.toContain("min-h-[86px]");
    expect(landing).toContain("pb-[calc(env(safe-area-inset-bottom)+9rem)]");
    expect(landing).toContain('data-report-issue-safe-offset="bottom-nav"');
  });

  it("keeps Quick Broadcast lower priority while creator stats are unavailable", () => {
    const landing = read("src/components/Dashboard/CreatorWorkspacePanel.tsx");

    expect(landing).toContain("broadcastSourceReady");
    expect(landing).toContain("data-creator-broadcast-mobile-priority");
    expect(landing).toContain("Broadcasts unlock when creator stats finish loading.");
  });

  it("uses human module warning copy instead of raw module errors", () => {
    const landing = read("src/components/Dashboard/CreatorWorkspacePanel.tsx");

    expect(landing).toContain('data-creator-landing-error-language="human"');
    expect(landing).toContain("HumanErrorNotice");
    expect(landing).toContain("dashboard_source_unavailable");
    expect(landing).toContain("Bookings are not loading right now. Try again in a bit.");
    expect(landing).toContain("Fan Pass subscribers are not loading right now. Try again in a bit.");
    expect(landing).not.toContain("body={moduleErrors.bookings}");
    expect(landing).not.toContain("body={moduleErrors.subscriptions}");
    expect(landing).not.toContain("creator settings: Internal server error");
  });

  it("validates the generated report shape", () => {
    const report = buildCreatorLandingDashboardMobileReport();
    const failures = validateCreatorLandingDashboardMobileReport(report);

    expect(failures).toEqual([]);
    expect(report.summary.landingRoute).toBe("/dashboard/creator");
    expect(report.summary.createDropRouteState).toBe("manage_only");
    expect(report.summary.createDropHref).toBe("/dashboard/library");
    expect(report.summary.rawModuleErrorLeaks).toBe(0);
  });

  it("fails validation when raw module leaks are represented", () => {
    const report = buildCreatorLandingDashboardMobileReport();
    const badReport: CreatorLandingDashboardMobileReport = {
      ...report,
      summary: {
        ...report.summary,
        rawModuleErrorLeaks: 1,
      },
    };

    expect(validateCreatorLandingDashboardMobileReport(badReport)).toContain("raw module error leaks remain");
  });
});
