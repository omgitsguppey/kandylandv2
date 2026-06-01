import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildCreatorSettingsSourceHealthReport,
  validateCreatorSettingsSourceHealthReport,
  type CreatorSettingsSourceHealthReport,
} from "../../scripts/agent/validate-creator-settings-source-health";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("creator settings source health", () => {
  it("records the generated health artifact shape", () => {
    expect(existsSync(join(root, "agent/state/creator-settings-source-health.generated.json"))).toBe(true);
    const report = JSON.parse(read("agent/state/creator-settings-source-health.generated.json")) as CreatorSettingsSourceHealthReport;

    expect(report.reportKey).toBe("creator-settings-source-health");
    expect(report.summary.routeReturnsPartialOnMissingSettings).toBe(true);
    expect(report.summary.nonCriticalSourceFailuresArePartial).toBe(true);
    expect(report.summary.accountSettingsLabelsFixed).toBe(true);
    expect(report.summary.rawInternalErrorsBlocked).toBe(true);
  });

    it("keeps the route partial-safe for missing settings and failed source reads", () => {
        const route = read("src/app/api/creator/settings/route.ts");

        expect(route).toContain("readCreatorSettingsSource");
        expect(route).toContain("recordRouteWarning");
        expect(route).not.toContain("console.warn");
        expect(route).toContain('"creator_settings_not_configured"');
        expect(route).toContain("settingsState");
    expect(route).toContain("DEFAULT_CREATOR_SETTINGS");
    expect(route).toContain("DEFAULT_CREATOR_RESTRICTIONS");
    expect(route).not.toContain("creatorSettings: data.creatorSettings ?? null");
  });

  it("keeps account settings labels distinct from creator settings labels", () => {
    const sidebar = read("src/components/Navigation/ProfileSidebar.tsx");
    const dropdown = read("src/components/Navigation/ProfileDropdown.tsx");

    expect(sidebar).toContain('label="Account Settings"');
    expect(dropdown).toContain('label="Account Settings"');
    expect(dropdown).toContain('title="Account Settings"');
    expect(dropdown).toContain('aria-label="Open account settings"');
    expect(sidebar).toContain('label="Creator Settings"');
    expect(dropdown).toContain('label="Creator Settings"');
  });

  it("validates the report with no current blockers", () => {
    const report = buildCreatorSettingsSourceHealthReport();
    const failures = validateCreatorSettingsSourceHealthReport(report);

    expect(failures).toEqual([]);
    expect(report.summary.p0Count).toBe(0);
    expect(report.summary.p1Count).toBe(0);
    expect(report.nextFixOrder.length).toBeGreaterThan(0);
  });

  it("fails validation when account settings labels are ambiguous", () => {
    const report = buildCreatorSettingsSourceHealthReport();
    const badReport: CreatorSettingsSourceHealthReport = {
      ...report,
      summary: {
        ...report.summary,
        accountSettingsLabelsFixed: false,
      },
    };

    expect(validateCreatorSettingsSourceHealthReport(badReport)).toContain("account settings labels are still ambiguous");
  });
});
