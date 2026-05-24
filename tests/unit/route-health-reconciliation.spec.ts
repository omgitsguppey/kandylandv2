import { describe, expect, it } from "vitest";

import { reconcileRouteHealth } from "@/lib/debug/route-health-reconciler";

describe("route health reconciliation", () => {
  it("does not count stale last-verified failures as active route failures", () => {
    const result = reconcileRouteHealth({
      routeChecksActiveFailures: 0,
      routeHealthFailCount: 2,
      routeHealthWarnCount: 8,
      routeHealthStaleCount: 55,
      trackedRoutes: 173,
      observedRoutes: 109,
      unseenRoutes: 64,
      hasRealtimeRows: false,
      hasSnapshotRows: true,
      routeListenerFailed: true,
      missingLastFailureTimestamp: true,
      lastVerifiedAgeMs: 30 * 60_000,
      slowCount: 6,
      serverErrorCount: 7,
      clientErrorCount: 4,
    });

    expect(result.activeFailureCount).toBe(0);
    expect(result.staleFailureCount).toBe(2);
    expect(result.routeListenerStatus).toBe("failed");
    expect(result.status).toBe("route_listener_delayed");
    expect(result.unseenRoutesClassified).toEqual(expect.objectContaining({ stale_unseen: 64 }));
    expect(result.nextAction).toContain("route listener");
  });
});
