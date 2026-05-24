import { describe, expect, it } from "vitest";

import { buildDebugCockpitBatch6CleanupReport, validateDebugCockpitBatch6CleanupReport } from "../../scripts/agent/ops-health-cleanup-shared";

describe("debug cockpit batch6 cleanup", () => {
  it("locks ops health, route runtime, open actions, and AI fallback truth", () => {
    const report = buildDebugCockpitBatch6CleanupReport({ changedFiles: [] });

    expect(validateDebugCockpitBatch6CleanupReport(report)).toEqual([]);
    expect(report.systemStateAfter).toBe("route_listener_delayed_with_last_verified_sample");
    expect(report.activeRouteFailures).toBe(0);
    expect(report.staleRouteFailures).toBe(2);
    expect(report.openActionsBefore).toBe(65);
    expect(report.openActionsAfter).toBeLessThan(65);
    expect(report.aiAssistantStatusAfter).toBe("fallback_due_to_feed_failure");
    expect(report.aiFallbackStatus).toBe("deterministic_fallback_accepted");
  });
});
