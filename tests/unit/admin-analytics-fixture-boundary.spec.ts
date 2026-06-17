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
const preferencesSource = readFileSync(
  join(process.cwd(), "src/lib/admin-analytics-preferences.ts"),
  "utf8",
);

describe("admin analytics local fixture boundary", () => {
  it("labels local admin UI fixture analytics evidence as source_missing", () => {
    expect(pageSource).toContain('data-admin-analytics-fixture-boundary="true"');
    expect(pageSource).toContain('data-admin-analytics-fixture-state="source_missing"');
    expect(pageSource).toContain("analytics data waits for verified snapshots");
    expect(pageSource).not.toContain("analytics data stays source_missing");
  });

  it("skips top-level admin analytics reads and preference writes for fixture sessions", () => {
    expect(hookSource).toContain("isAdminUiTestSessionUser(user)");
    expect(hookSource).toContain('isLocalAdminUiTestSession ? null : "/api/admin/analytics/preferences"');
    expect(hookSource).toContain('isLocalAdminUiTestSession ? null : "/api/admin/analytics/realtime"');
    expect(hookSource).toContain("isLocalAdminUiTestSession ? null : historicalUrl");
    expect(hookSource).toContain('isLocalAdminUiTestSession ? null : "/api/admin/overview"');
    expect(hookSource).toContain("Analytics preferences need a real admin session with verified snapshots.");
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

  it("does not classify missing fixture realtime snapshots as broken runtime errors", () => {
    expect(hookSource).toContain('liveRealtime.feedStatus === "failed" && effectiveLiveResponse');
    expect(hookSource).toContain("const liveRealtimeFailureDetail");
    expect(hookSource).toContain("error: liveRealtimeFailureDetail");
    expect(hookSource).toContain("realtimeError: liveRealtimeFailureDetail");
    expect(hookSource).toContain("liveError instanceof Error");
    expect(hookSource).not.toContain('error: liveRealtime.feedStatus === "failed" ? liveRealtime.feedDetail : null');
    expect(hookSource).not.toContain('realtimeError: liveRealtime.feedStatus === "failed" ? liveRealtime.feedDetail : null');
  });

  it("defaults admin analytics hydration to launch history without enabling raw polling", () => {
    expect(preferencesSource).toContain('ADMIN_ANALYTICS_DEFAULT_RANGE = "all"');
    expect(hookSource).toContain("const historicalUrl = `/api/admin/analytics/historical?period=${ADMIN_ANALYTICS_DEFAULT_RANGE}`");
    expect(hookSource).toContain("Launch history hydrating; showing verified snapshots");
    expect(hookSource).toContain("Launch history hydrating; showing 30D transaction fallback");
    expect(hookSource).toContain("Hydrating launch history from source evidence");
    expect(hookSource).toContain("Hydrating launch history");
    expect(hookSource).not.toContain("Waiting for first analytics snapshot");
    expect(hookSource).not.toContain('ADMIN_ANALYTICS_DEFAULT_RANGE = "30d"');
  });
});
