import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const pageSource = readFileSync(join(process.cwd(), "src/app/admin/page.tsx"), "utf8");
const overviewHookSource = readFileSync(join(process.cwd(), "src/hooks/useAdminOverview.ts"), "utf8");
const realtimeHookSource = readFileSync(join(process.cwd(), "src/hooks/useAdminOverviewRealtime.ts"), "utf8");

describe("admin overview fixture boundary", () => {
  it("labels local admin UI fixture overview evidence as source_missing", () => {
    expect(pageSource).toContain("isAdminUiTestSessionUser(user)");
    expect(pageSource).toContain('data-admin-overview-fixture-boundary="true"');
    expect(pageSource).toContain('data-admin-overview-fixture-state="source_missing"');
    expect(pageSource).toContain('label="No source"');
    expect(pageSource).toContain("source_missing: overview source is not loaded in this fixture.");
    expect(pageSource).toContain("source_missing: layout is visible; verified overview data remains unavailable in this fixture");
    expect(pageSource).not.toContain('label="Source missing"');
    expect(pageSource).not.toContain("Overview truth is source_missing");
    expect(pageSource).not.toContain("remain source_missing");
  });

  it("skips overview and child panel reads in fixture mode", () => {
    expect(pageSource).toContain("useAdminOverview({ enabled: !isLocalAdminUiTestSession })");
    expect(pageSource).toContain("isLocalAdminUiTestSession ? sourceMissingPanel : <AdminDropsAtGlancePanel />");
    expect(pageSource).toContain("isLocalAdminUiTestSession ? sourceMissingPanel : data ?");
    expect(overviewHookSource).toContain("useAdminOverview(options: { enabled?: boolean } = {})");
    expect(realtimeHookSource).toContain("useAdminOverviewRealtime(options: { enabled?: boolean } = {})");
    expect(realtimeHookSource).toContain("enabled ? \"/api/admin/overview\" : null");
  });

  it("keeps verified admin access on the canonical overview and drop panels", () => {
    expect(pageSource).toContain("<AdminStatsBar");
    expect(pageSource).toContain("<AdminAnalyticsCharts");
    expect(pageSource).toContain("<RecentTransactionsPanel");
    expect(pageSource).toContain("<AdminActivityLogPanel");
    expect(pageSource).toContain("<AdminDropsAtGlancePanel />");
  });
});
