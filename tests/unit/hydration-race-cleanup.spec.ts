import { describe, expect, it } from "vitest";

import {
  HYDRATION_RACE_RULES,
  buildHydrationRaceCleanupReport,
  validateHydrationRaceCleanupReport,
} from "@/lib/frontend-hardening/hydration-race-guard";

describe("hydration race cleanup", () => {
  it("tracks browser-api, stale response, and listener cleanup risk through one guardrail", () => {
    const report = buildHydrationRaceCleanupReport({ currentHead: "test-head" });

    expect(HYDRATION_RACE_RULES).toContain("Client-only browser APIs must be guarded.");
    expect(report.highRiskSurfaces).toContain("admin_analytics");
    expect(report.highRiskSurfaces).toContain("chat");
    expect(report.hydrationRaceRisksFixed).toBeGreaterThan(0);
  });

  it("keeps risks classified instead of creating unsafe unknowns", () => {
    const report = buildHydrationRaceCleanupReport({ currentHead: "test-head" });
    const validation = validateHydrationRaceCleanupReport(report);

    expect(report.unsafeUnknowns).toEqual([]);
    expect(report.remainingRisks.length).toBeGreaterThan(0);
    expect(validation.failures).toEqual([]);
  });
});
