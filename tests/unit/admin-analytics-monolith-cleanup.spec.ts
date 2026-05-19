import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("admin analytics monolith cleanup", () => {
  it("splits Admin Debug summary loading out of the route monolith", () => {
    const route = read("src/app/api/admin/debug/route.ts");

    expect(existsSync(join(root, "src/lib/server/admin-debug/summary.ts"))).toBe(true);
    expect(existsSync(join(root, "src/lib/server/admin-debug/truth-state.ts"))).toBe(true);
    expect(route).toContain("buildAdminDebugSummaryPayload");
    expect(route).toContain("ADMIN_DEBUG_DEFAULT_SECTION");
    expect(route).not.toContain("function readAdminDebugSummaryPayloadStatus");
    const defaultBranch = route.slice(
      route.indexOf('if (section !== "all" && !loadFullDebug)'),
      route.indexOf("const weekAgoMs = nowMs - ONE_WEEK_MS"),
    );
    expect(defaultBranch).not.toMatch(/const runtimeWarningSummary = runtimeWarnings\.reduce/u);
  });

  it("moves GA4 report handling into an evidence-only helper", () => {
    const analyticsData = read("src/lib/server/admin-analytics-data.ts");
    const ga4EvidencePath = "src/lib/server/admin-analytics/ga4-evidence.ts";
    const ga4Evidence = read(ga4EvidencePath);

    expect(existsSync(join(root, ga4EvidencePath))).toBe(true);
    expect(analyticsData).toContain("runVendorReportWhenAllowed");
    expect(analyticsData).toContain("classifyAdminAnalyticsGa4State");
    expect(analyticsData).not.toContain("new BetaAnalyticsDataClient");
    expect(analyticsData).not.toContain("function buildSkippedVendorReport");
    expect(ga4Evidence).toContain("ga4_config_missing");
    expect(ga4Evidence).toContain("ga4_evidence_only");
    expect(ga4Evidence).toContain('sourceRole: "external_evidence_only"');
  });

  it("keeps default historical analytics from running GA4 reports", () => {
    const analyticsData = read("src/lib/server/admin-analytics-data.ts");
    const ga4Evidence = read("src/lib/server/admin-analytics/ga4-evidence.ts");

    expect(analyticsData).toContain("allowVendorReports = false");
    expect(`${analyticsData}\n${ga4Evidence}`).toContain("Skipped ${label} GA report on default admin load");
    expect(`${analyticsData}\n${ga4Evidence}`).toContain('sourceState: "deferred"');
  });
});
