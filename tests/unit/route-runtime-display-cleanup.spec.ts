import { describe, expect, it } from "vitest";

import { buildRouteRuntimeDisplayStatus } from "@/lib/debug/route-runtime-display-status";
import { buildRouteRuntimeRollup } from "@/lib/debug/route-runtime-rollup-engine";
import { createBatch17RouteRuntimeFixture } from "@/lib/debug/debug-cockpit-batch17-route-runtime";

describe("route runtime display cleanup", () => {
  it("separates current failures, stale routes, unseen routes, warning groups, and slow samples", () => {
    const fixture = createBatch17RouteRuntimeFixture();
    const rollup = buildRouteRuntimeRollup(fixture.items, fixture.options);
    const display = buildRouteRuntimeDisplayStatus(rollup);

    expect(rollup.trackedCount).toBe(173);
    expect(rollup.observedCount).toBe(109);
    expect(rollup.unseenCount).toBe(64);
    expect(rollup.staleCount).toBe(54);
    expect(rollup.currentFailCount).toBe(1);
    expect(rollup.staleFailCount).toBeGreaterThan(0);
    expect(rollup.rawWarningCount).toBe(156);
    expect(rollup.warningGroupCount).toBeLessThan(rollup.rawWarningCount);
    expect(rollup.slowSampleCount).toBe(42346);
    expect(rollup.currentSlowRouteCount).toBeLessThan(rollup.slowSampleCount);
    expect(rollup.exactFailRoutes).toEqual([
      expect.objectContaining({
        routeKey: "admin/debug/control-tower:GET",
        failureIsCurrent: true,
      }),
    ]);

    expect(display.displayState).toBe("failed");
    expect(display.badges).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "1 current fail", state: "fail" }),
      expect.objectContaining({ label: "64 unseen tracked routes", state: "no_sample" }),
      expect.objectContaining({ label: "54 stale route samples", state: "stale" }),
      expect.objectContaining({ label: "42346 slow samples", state: "info" }),
    ]));
    expect(display.badges.some((badge) => badge.state === "current" && /stale|unseen|fail|warn/i.test(badge.label) && Number(badge.value) > 0)).toBe(false);
    expect(display.nextAction).toContain("admin/debug/control-tower:GET");
  });
});
