import { describe, expect, it } from "vitest";

import { ADMIN_HEARTBEAT_INTERVAL_SECONDS } from "@/lib/admin/admin-heartbeat-contract";
import { ADMIN_HOT_CACHE_SNAPSHOTS } from "@/lib/admin/admin-hot-cache-contract";
import { buildAdminHotCacheCostEstimate } from "@/lib/admin/admin-hot-cache-cost-estimator";
import { ADMIN_REALTIME_TO_HOT_CACHE_MIGRATION } from "@/lib/admin/admin-realtime-to-hot-cache-migration";
import { resolveAdminSurfaceHydrationState } from "@/lib/admin/admin-surface-hydration-contract";

describe("admin hot-cache heartbeat final lock", () => {
  it("defines all admin hot-cache snapshots and hourly heartbeat cadence", () => {
    expect(ADMIN_HOT_CACHE_SNAPSHOTS.map((snapshot) => snapshot.snapshotId)).toEqual([
      "admin_overview_snapshot",
      "admin_analytics_snapshot",
      "admin_debug_snapshot",
      "admin_users_snapshot",
      "admin_roster_snapshot",
      "admin_queue_snapshot",
      "admin_settings_snapshot",
      "admin_creator_snapshot",
      "admin_support_bug_snapshot",
      "admin_runtime_snapshot",
    ]);
    expect(ADMIN_HOT_CACHE_SNAPSHOTS.every((snapshot) => snapshot.allowedRealtime === false)).toBe(true);
    expect(ADMIN_HOT_CACHE_SNAPSHOTS.every((snapshot) => snapshot.ttlSeconds === 3600)).toBe(true);
    expect(ADMIN_HEARTBEAT_INTERVAL_SECONDS).toBe(3600);
  });

  it("ties migration, hydration, and cost evidence together", () => {
    const estimate = buildAdminHotCacheCostEstimate();
    const staleHydration = resolveAdminSurfaceHydrationState({ hasSnapshot: true, isStale: true });

    expect(ADMIN_REALTIME_TO_HOT_CACHE_MIGRATION.some((entry) => entry.surface === "admin_overview" && entry.currentRealtimeRefs === 0)).toBe(true);
    expect(staleHydration.shouldRenderSnapshotValues).toBe(true);
    expect(estimate.estimatedPollingReductionPct).toBeGreaterThan(98);
  });
});
