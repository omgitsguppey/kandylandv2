import { describe, expect, it } from "vitest";

import { buildRouteRuntimeCohortSummary } from "@/lib/debug/route-runtime-rollup-engine";
import { createBatch17RouteRuntimeFixture } from "@/lib/debug/debug-cockpit-batch17-route-runtime";

describe("chat route cohort runtime", () => {
  it("keeps native and compatibility chat counts aligned with display copy", () => {
    const fixture = createBatch17RouteRuntimeFixture();
    const cohorts = buildRouteRuntimeCohortSummary(fixture.items, fixture.options);

    expect(cohorts.chat_native).toMatchObject({
      cohort: "chat_native",
      observedRoutes: 6,
      unseenRoutes: 2,
      staleRoutes: 4,
      currentFailCount: 0,
      samples: 1575,
      errorSamples: 14,
      errorRateLabel: "0.9%",
      errorThreshold: 0.01,
      errorRateState: "under_threshold",
      status: "warning",
    });
    expect(cohorts.chat_native.narrative).toContain("Native chat: 0 current fail / 4 stale / 2 unseen");
    expect(cohorts.chat_native.narrativeContradictionCount).toBe(0);

    expect(cohorts.chat_compat).toMatchObject({
      cohort: "chat_compat",
      observedRoutes: 1,
      unseenRoutes: 2,
      staleRoutes: 0,
      currentFailCount: 0,
      samples: 1045,
      errorSamples: 0,
      migrationStatus: "legacy_visible_until_removal",
      legacyRemovalDate: "2026-07-31",
      status: "legacy_visible_until_removal",
    });
    expect(cohorts.chat_compat.narrative).toContain("Compat chat: 0 current fail / 0 stale / 2 unseen");
    expect(cohorts.chat_compat.narrativeContradictionCount).toBe(0);
  });
});
