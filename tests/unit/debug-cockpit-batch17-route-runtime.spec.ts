import { describe, expect, it } from "vitest";

import { buildDebugCockpitBatch17RouteRuntimeReport } from "@/lib/debug/debug-cockpit-batch17-route-runtime";

describe("debug cockpit batch 17 route runtime", () => {
  it("locks route runtime and chat cohort cleanup without hiding failures", () => {
    const report = buildDebugCockpitBatch17RouteRuntimeReport();

    expect(report.trackedRoutes).toBe(173);
    expect(report.observedRoutes).toBe(109);
    expect(report.unseenRoutes).toBe(64);
    expect(report.staleRoutes).toBe(54);
    expect(report.currentFailsAfter).toBe(1);
    expect(report.exactFailRoutes).toEqual(["admin/debug/control-tower:GET"]);
    expect(report.warningSamplesBefore).toBe(156);
    expect(report.warningGroupsAfter).toBeLessThan(report.warningSamplesBefore);
    expect(report.slowSamples).toBe(42346);
    expect(report.currentSlowRoutes).toBeLessThan(report.slowSamples);
    expect(report.nativeChatStatusAfter).toBe("warning");
    expect(report.nativeChatErrorRate).toBe("0.9%");
    expect(report.compatChatStatusAfter).toBe("legacy_visible_until_removal");
    expect(report.compatLegacyRemovalDate).toBe("2026-07-31");
    expect(report.displayContradictionsAfter).toBe(0);
    expect(report.scoreDimensions).toEqual(expect.arrayContaining([
      "sourceHealth",
      "runtimeHealth",
      "evidenceCompleteness",
      "freshness",
      "costRisk",
      "regressionRisk",
    ]));
    expect(report.remainingGaps).toContain("One current failing route remains visible for route owner inspection.");
  });
});
