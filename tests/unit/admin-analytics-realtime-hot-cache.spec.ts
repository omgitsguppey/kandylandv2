import { describe, expect, it } from "vitest";

import {
  ADMIN_ANALYTICS_REALTIME_HOT_CACHE_LISTENERS,
  validateAdminAnalyticsRealtimeHotCacheContract,
} from "../../src/lib/admin-analytics/realtime-hot-cache-contract";
import {
  buildAdminAnalyticsRealtimeHotCacheReport,
  validateAdminAnalyticsRealtimeHotCacheReport,
} from "../../scripts/agent/debug-cockpit-batch14-shared";

describe("admin analytics realtime hot-cache contract", () => {
  it("classifies bounded realtime listeners without changing admin analytics behavior", () => {
    const collections = ADMIN_ANALYTICS_REALTIME_HOT_CACHE_LISTENERS.map((listener) => listener.collectionPath);

    expect(collections).toEqual([
      "analytics_event_facts",
      "analytics_guest_batches",
      "analytics_sessions",
      "analytics_watch_sessions",
    ]);
    expect(ADMIN_ANALYTICS_REALTIME_HOT_CACHE_LISTENERS.map((listener) => listener.limit)).toEqual([80, 50, 50, 50]);
    expect(ADMIN_ANALYTICS_REALTIME_HOT_CACHE_LISTENERS.every((listener) => listener.debugVisibility === true)).toBe(true);
    expect(ADMIN_ANALYTICS_REALTIME_HOT_CACHE_LISTENERS.every((listener) => listener.listenerCleanup === "required")).toBe(true);
    expect(ADMIN_ANALYTICS_REALTIME_HOT_CACHE_LISTENERS.map((listener) => listener.migrationStatus)).toContain("migration_plan_required");
    expect(ADMIN_ANALYTICS_REALTIME_HOT_CACHE_LISTENERS.map((listener) => listener.migrationStatus)).toContain("intentionally_live_debug_only");
    expect(validateAdminAnalyticsRealtimeHotCacheContract()).toEqual([]);
  });

  it("writes a current report with source-visible reconnect and hot-cache doctrine", () => {
    const report = buildAdminAnalyticsRealtimeHotCacheReport();

    expect(report.status).toBe("migration_plan_required");
    expect(report.uiBehaviorChanged).toBe(false);
    expect(report.realtimeListeners).toHaveLength(4);
    expect(report.realtimeListeners.every((listener) => listener.limit > 0)).toBe(true);
    expect(report.reconnectRisk).toBe("bounded_exponential_backoff");
    expect(validateAdminAnalyticsRealtimeHotCacheReport(report)).toEqual([]);
  });
});
