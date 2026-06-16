import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const pageSource = readFileSync(
  join(process.cwd(), "src/app/admin/analytics/page.tsx"),
  "utf8",
);
const hookSource = readFileSync(
  join(process.cwd(), "src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx"),
  "utf8",
);
const helpersSource = readFileSync(
  join(process.cwd(), "src/app/admin/analytics/AnalyticsHelpers.tsx"),
  "utf8",
);

describe("admin analytics local fixture boundary", () => {
  it("labels local admin UI fixture analytics evidence as source_missing", () => {
    expect(pageSource).toContain('data-admin-analytics-fixture-boundary="true"');
    expect(pageSource).toContain('data-admin-analytics-fixture-state="source_missing"');
    expect(pageSource).toContain("realtime, historical, overview, preferences,");
    expect(pageSource).toContain("revenue, identity, and source samples remain source_missing");
  });

  it("skips top-level admin analytics reads and preference writes for fixture sessions", () => {
    expect(hookSource).toContain("isAdminUiTestSessionUser(user)");
    expect(hookSource).toContain('isLocalAdminUiTestSession ? null : "/api/admin/analytics/preferences"');
    expect(hookSource).toContain('isLocalAdminUiTestSession ? null : "/api/admin/analytics/realtime"');
    expect(hookSource).toContain("isLocalAdminUiTestSession ? null : historicalUrl");
    expect(hookSource).toContain('isLocalAdminUiTestSession ? null : "/api/admin/overview"');
    expect(hookSource).toContain("Analytics preferences are source_missing in local UI review.");
  });

  it("skips section drilldown override reads in fixture sessions", () => {
    const normalizedHelpersSource = helpersSource.replace(/\r\n/g, "\n");

    expect(normalizedHelpersSource).toContain("disabled = false");
    expect(normalizedHelpersSource).toContain("const ADMIN_ANALYTICS_SECTION_OVERRIDE_REFRESH_INTERVAL_MS = 0");
    expect(normalizedHelpersSource).toContain("ADMIN_ANALYTICS_SECTION_OVERRIDE_REFRESH_INTERVAL_MS");
    expect(normalizedHelpersSource).not.toContain("60_000");
    expect(normalizedHelpersSource).toContain(
      "!disabled && (range !== ADMIN_ANALYTICS_DEFAULT_RANGE || Boolean(viewerUser))",
    );
    expect(hookSource).toContain("viewerUserFilter,\n    isLocalAdminUiTestSession");
    expect(hookSource.match(/isLocalAdminUiTestSession/g)?.length ?? 0).toBeGreaterThan(20);
  });
});
