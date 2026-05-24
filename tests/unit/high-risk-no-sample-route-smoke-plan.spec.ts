import { describe, expect, it } from "vitest";

import { buildHighRiskNoSampleRouteSmokePlan } from "@/lib/debug/high-risk-route-smoke-plan";

describe("high-risk no-sample route smoke plan", () => {
  it("assigns safe smoke plans without production route calls", () => {
    const plan = buildHighRiskNoSampleRouteSmokePlan();

    expect(plan.every((item) => item.productionRouteCallAllowed === false)).toBe(true);
    expect(plan.find((item) => item.routeKey === "user/revoke-sessions:POST")).toMatchObject({
      smokeType: "local_safe_route_contract",
      sampleRequired: true,
      owner: "security",
    });
    expect(plan.find((item) => item.routeKey === "creator/payouts:POST")).toMatchObject({
      smokeType: "manual_operator_smoke",
      sampleRequired: true,
      owner: "creator_monetization",
    });
    expect(plan.find((item) => item.routeKey === "__/auth/[...path]:POST")).toMatchObject({
      smokeType: "formal_runtime_required",
      sampleRequired: true,
    });
  });
});
