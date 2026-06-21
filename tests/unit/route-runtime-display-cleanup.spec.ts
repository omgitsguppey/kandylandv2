import { describe, expect, it } from "vitest";

import { buildRouteRuntimeDisplayStatus } from "@/lib/debug/route-runtime-display-status";
import { buildRouteRuntimeRollup } from "@/lib/debug/route-runtime-rollup-engine";
import { createBatch17RouteRuntimeFixture } from "@/lib/debug/debug-cockpit-batch17-route-runtime";
import { compactRouteRuntimeRollup } from "../../scripts/agent/debug-cockpit-batch17-shared";

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

  it("keeps generated route runtime artifacts compact while preserving drilldown counts", () => {
    const fixture = createBatch17RouteRuntimeFixture();
    const rollup = buildRouteRuntimeRollup(fixture.items, fixture.options);
    const compact = compactRouteRuntimeRollup(rollup, 24);

    expect(compact.records).toHaveLength(24);
    expect(compact.recordsTotalCount).toBe(173);
    expect(compact.recordsEmittedCount).toBe(24);
    expect(compact.recordsOmittedCount).toBe(149);
    expect(compact.recordsCapReason).toContain("validated in memory");
    expect(compact.records[0]).toMatchObject({
      routeKey: "admin/debug/control-tower:GET",
      failureIsCurrent: true,
    });
    expect(compact.trackedCount).toBe(rollup.trackedCount);
    expect(compact.warningGroups).toEqual(rollup.warningGroups);
  });
});
