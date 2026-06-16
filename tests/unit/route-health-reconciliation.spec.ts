import { describe, expect, it } from "vitest";

import {
  buildRouteHealthReconciliationReport,
  validateRouteHealthReconciliationReport,
} from "../../scripts/agent/ops-health-cleanup-shared";
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
    expect(result.status).toBe("route_listener_delayed_with_last_verified_sample");
    expect(result.unseenRoutesClassified).toEqual(expect.objectContaining({ stale_unseen: 64 }));
    expect(result.nextAction).toContain("route listener");
  });

  it("keeps delayed listener evidence visible and runtime-evidence gated in generated reports", () => {
    const report = buildRouteHealthReconciliationReport({
      currentHead: "test-head",
      generatedAtUtc: "2026-06-07T00:00:00.000Z",
      changedFiles: [],
    });

    expect(report.delayedListener).toBe("admin_debug_route_health");
    expect(report.delayedClassification).toBe("runtime_evidence_required");
    expect(report.runtimeProofRequired).toBe(true);
    expect(report.sourceOnlyCanClear).toBe(false);
    expect(report.delayedIsHealthy).toBe(false);
    expect(report.status).not.toBe("healthy_current");
    expect(validateRouteHealthReconciliationReport(report)).toEqual([]);
  });
});
