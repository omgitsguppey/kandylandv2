import { describe, expect, it } from "vitest";

import { buildRouteHotspotTargetedFixesReport } from "@/lib/debug/route-hotspot-targeted-fixes";

describe("route hotspot targeted fixes", () => {
  it("documents summary-first policies and exact follow-ups for hotspot routes", () => {
    const report = buildRouteHotspotTargetedFixesReport();

    expect(report.summaryFirstPolicies).toEqual(expect.arrayContaining([
      "admin/overview:GET",
      "admin/analytics/historical:GET",
      "admin/debug:GET",
      "admin/debug/control-tower:GET",
    ]));
    expect(report.expected4xxMappings).toEqual(expect.arrayContaining([
      "wallet/packages:GET",
      "notifications:GET",
      "user/onboarding-progress:POST",
      "creator/relationships:GET",
      "creator/relationships:POST",
    ]));
    expect(report.unsafeBroadRefactorPerformed).toBe(false);
    expect(report.followUps.length).toBeGreaterThan(0);
  });
});
