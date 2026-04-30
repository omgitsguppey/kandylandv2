import { describe, expect, it } from "vitest";

import {
  ADMIN_METRIC_SNAPSHOT_SOURCE_MODES,
  createSnapshotValue,
  createUnavailableAdminMetricSnapshot,
  resolveAdminMetricSnapshotSourceMode,
  shouldPreventSnapshotRefreshStorm,
  validateAdminMetricSnapshot,
  type AdminMetricSnapshot,
} from "@/lib/analytics/admin-metric-snapshot";
import {
  ADMIN_ANALYTICS_MATERIALIZER_REGISTRY,
  ADMIN_ANALYTICS_SNAPSHOT_MODULE_KEYS,
  materializeAdminAnalyticsSnapshot,
} from "@/lib/server/admin-analytics-materializers";

describe("admin metric snapshot contract", () => {
  it("includes every required source mode", () => {
    expect(ADMIN_METRIC_SNAPSHOT_SOURCE_MODES).toEqual([
      "live",
      "verified_cache",
      "stale_cache",
      "intraday",
      "estimated",
      "fallback",
      "unavailable",
      "mixed",
    ]);
  });

  it("creates unavailable snapshots without fake zeros", () => {
    const snapshot = createUnavailableAdminMetricSnapshot({
      moduleKey: "commerce_snapshot",
      rangeKey: "7d",
      reason: "Commerce source parity is not verified.",
    });

    expect(snapshot.truthState).toBe("unavailable");
    expect(snapshot.sourceMode).toBe("unavailable");
    expect(snapshot.values.module.value).toBeNull();
    expect(snapshot.values.module.fakeZeroPrevented).toBe(true);
    expect(validateAdminMetricSnapshot(snapshot)).toEqual([]);
  });

  it("rejects unavailable metric zeros", () => {
    const snapshot = createUnavailableAdminMetricSnapshot({
      moduleKey: "audience_snapshot",
      rangeKey: "24h",
      reason: "Audience snapshot source is unavailable.",
    });
    const invalid: AdminMetricSnapshot = {
      ...snapshot,
      values: {
        activeUsers: createSnapshotValue({
          value: 0,
          available: false,
          source: "missing_source",
          sourceMode: "unavailable",
          fakeZeroPrevented: false,
        }),
      },
    };

    expect(validateAdminMetricSnapshot(invalid)).toEqual([
      "Metric activeUsers renders a zero while unavailable.",
    ]);
  });

  it("resolves verified cache to stale cache after expiry", () => {
    const snapshot: AdminMetricSnapshot = {
      ...createUnavailableAdminMetricSnapshot({
        moduleKey: "platform_pulse",
        rangeKey: "24h",
        reason: "seed",
      }),
      truthState: "verified",
      sourceMode: "verified_cache",
      confidence: 0.9,
      lastVerifiedAt: "2026-04-30T12:00:00.000Z",
      expiresAt: "2026-04-30T12:05:00.000Z",
    };

    expect(resolveAdminMetricSnapshotSourceMode(snapshot, Date.parse("2026-04-30T12:04:00.000Z"))).toBe("verified_cache");
    expect(resolveAdminMetricSnapshotSourceMode(snapshot, Date.parse("2026-04-30T12:06:00.000Z"))).toBe("stale_cache");
  });

  it("prevents duplicate refresh storms while a refresh lock is fresh", () => {
    expect(shouldPreventSnapshotRefreshStorm({
      refreshStatus: "refreshing",
      refreshStartedAt: "2026-04-30T12:00:00.000Z",
      nowMs: Date.parse("2026-04-30T12:01:00.000Z"),
      lockTtlMs: 120_000,
    })).toBe(true);

    expect(shouldPreventSnapshotRefreshStorm({
      refreshStatus: "refreshing",
      refreshStartedAt: "2026-04-30T12:00:00.000Z",
      nowMs: Date.parse("2026-04-30T12:03:00.000Z"),
      lockTtlMs: 120_000,
    })).toBe(false);
  });

  it("registers every required Admin Analytics snapshot materializer", async () => {
    expect(ADMIN_ANALYTICS_MATERIALIZER_REGISTRY.map((entry) => entry.moduleKey)).toEqual(
      [...ADMIN_ANALYTICS_SNAPSHOT_MODULE_KEYS],
    );

    for (const entry of ADMIN_ANALYTICS_MATERIALIZER_REGISTRY) {
      expect(entry.supportedRanges.length).toBeGreaterThan(0);
      expect(entry.canonicalSources.length).toBeGreaterThan(0);
      expect(entry.parityChecksRequired.length).toBeGreaterThan(0);
    }

    const snapshot = await materializeAdminAnalyticsSnapshot({
      moduleKey: "commerce_snapshot",
      rangeKey: "30d",
      force: false,
      requestedBy: "admin_1",
    });

    expect(snapshot.truthState).toBe("unavailable");
    expect(snapshot.unavailableReason).toContain("Commerce Snapshot requires payment/internal parity");
    expect(snapshot.parity[0].fakeZeroPrevented).toBe(true);
  });
});
