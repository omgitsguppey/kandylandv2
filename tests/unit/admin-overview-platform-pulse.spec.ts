import { describe, expect, it } from "vitest";

import { buildAdminOverviewPlatformPulse } from "@/lib/admin-overview";

describe("admin overview platform pulse builder", () => {
  it("builds exactly six rolling-30-day metrics with split-preserving GumDrops metadata", () => {
    const metrics = buildAdminOverviewPlatformPulse({
      freshnessState: "live",
      warnings: {
        accounts: [],
        purchases30d: [],
        revenue: [],
        unwraps: [],
        gumdropsCirculation30d: [],
        supportBugs30d: [],
      },
      accounts: { current: 12, prior: 6 },
      purchases: { current: 4, prior: 2 },
      revenueCents: { current: 1234, prior: 617 },
      unwraps: { current: 20, prior: 10 },
      gumdrops: {
        current: { rewardGd30d: 25, paidGd30d: 500, paidBonusGd30d: 50 },
        prior: { rewardGd30d: 10, paidGd30d: 200, paidBonusGd30d: 20 },
      },
      supportBugs: {
        current: { userBugReports30d: 2, userSupportRequests30d: 3 },
        prior: { userBugReports30d: 1, userSupportRequests30d: 1 },
      },
    });

    expect(metrics.map((metric) => metric.id)).toEqual([
      "accounts",
      "purchases30d",
      "revenue",
      "unwraps",
      "gumdropsCirculation30d",
      "supportBugs30d",
    ]);
    expect(metrics).toHaveLength(6);
    expect(metrics.every((metric) => metric.primaryScope === "rolling_30d")).toBe(true);
    expect(metrics.every((metric) => typeof metric.current30dValue === "number")).toBe(true);
    expect(metrics.every((metric) => typeof metric.prior30dValue === "number")).toBe(true);
    expect(metrics.every((metric) => metric.deltaPct !== undefined)).toBe(true);
    expect(metrics.some((metric) => "subtext" in metric || "lifetimeLabel" in metric || "confidence" in metric)).toBe(false);

    expect(metrics.find((metric) => metric.id === "revenue")?.primaryValue).toBe("$12.34");
    expect(metrics.find((metric) => metric.id === "gumdropsCirculation30d")?.primaryValue).toBe(575);
    expect(metrics.find((metric) => metric.id === "gumdropsCirculation30d")?.metadata).toMatchObject({
      rewardGd30d: 25,
      paidGd30d: 500,
      paidBonusGd30d: 50,
      totalCirculationGd30d: 575,
      displayCombinesPaidAndRewardOnly: true,
    });
    expect(metrics.find((metric) => metric.id === "supportBugs30d")?.metadata).toMatchObject({
      userBugReports30d: 2,
      userSupportRequests30d: 3,
      excludesAiDebugCodeInternalDiagnostics: true,
    });
  });
});
