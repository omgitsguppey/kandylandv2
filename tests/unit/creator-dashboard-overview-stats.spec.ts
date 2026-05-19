import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildCreatorDashboardOverviewStatsReport,
  validateCreatorDashboardOverviewStatsReport,
  type CreatorDashboardOverviewStatsReport,
} from "../../scripts/agent/validate-creator-dashboard-overview-stats";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("creator dashboard overview stats", () => {
  it("renders one compact Creator Overview module instead of standalone mobile stat cards", () => {
    const source = read("src/components/Dashboard/CreatorWorkspacePanel.tsx");

    expect(source).toContain("Creator Overview");
    expect(source).toContain('data-creator-overview-module="compact_v1"');
    expect(source).toContain('data-creator-dashboard-overview-density="mobile_compact"');
    expect(source).toContain('data-creator-dashboard-public-visibility-separated="true"');
    expect(source).toContain('data-creator-dashboard-content-scope="creator_owned_or_assigned"');
    expect(source).not.toContain('data-creator-landing-metric-card="compact_v2"');
  });

  it("uses Fans language and keeps content views separate from content count", () => {
    const landing = read("src/components/Dashboard/CreatorWorkspacePanel.tsx");
    const settingsHub = read("src/components/Creators/CreatorDashboardSettingsHub.tsx");
    const combined = `${landing}\n${settingsHub}`;

    expect(combined).toContain("Fans");
    expect(combined).not.toMatch(/>\s*Followers\s*</u);
    expect(combined).not.toMatch(/followers \|/u);
    expect(landing).toContain("Content views");
    expect(landing).toContain("Content");
    expect(landing).toContain("contentCount");
    expect(landing).not.toContain("formatDashboardMetric(creatorStats?.liveDropsCount)</p>");
  });

  it("keeps source metadata for fans and creator-owned content scope", () => {
    const landing = read("src/components/Dashboard/CreatorWorkspacePanel.tsx");
    const route = read("src/app/api/creator/settings/route.ts");

    expect(landing).toContain("data-creator-dashboard-fans-source");
    expect(route).toContain("fanCountSource");
    expect(route).toContain("contentCountScope");
    expect(route).toContain("creator_owned_or_assigned");
    expect(route).toContain("contentCountIncludes");
  });

  it("documents creator dashboard stats separately from public discovery truth", () => {
    const doc = read("docs/agent-truth/creator-dashboard-overview-stats.md");

    expect(doc).toContain("Creator Dashboard stats use creator-scoped truth");
    expect(doc).toContain("Public fans may only see public/available/eligible drops");
    expect(doc).toContain("Drops for all creators is not the same as owned by every creator");
  });

  it("validates the generated overview stats report shape", () => {
    const report = buildCreatorDashboardOverviewStatsReport();
    const failures = validateCreatorDashboardOverviewStatsReport(report);

    expect(failures).toEqual([]);
    expect(report.reportKey).toBe("creator-dashboard-overview-stats");
    expect(report.summary.overviewModuleEnabled).toBe(true);
    expect(report.summary.followerSourceMappedToFans).toBe(true);
    expect(report.summary.contentCountIncludesCreatorExpiredDrops).toBe(true);
    expect(report.nextFixOrder.length).toBeGreaterThan(0);
  });

  it("fails validation when old standalone stat cards remain", () => {
    const report = buildCreatorDashboardOverviewStatsReport();
    const badReport: CreatorDashboardOverviewStatsReport = {
      ...report,
      summary: {
        ...report.summary,
        oldSeparateStatCardsRemoved: false,
      },
    };

    expect(validateCreatorDashboardOverviewStatsReport(badReport)).toContain("old separate standalone metric cards remain");
  });
});
