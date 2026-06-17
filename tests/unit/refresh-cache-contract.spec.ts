import { describe, expect, it } from "vitest";

import {
  REFRESH_CACHE_DISPLAY_STATES,
  getDisplaySnapshot,
  markRefreshCompleted,
  markRefreshFailed,
  markRefreshStarted,
  requestRefresh,
  dedupeRefresh,
  resolveRefreshCacheDisplayState,
  shouldShowWaiting,
  type RefreshCacheRecord,
} from "@/lib/runtime/cache/refresh-cache-contract";

function record(overrides: Partial<RefreshCacheRecord> = {}): RefreshCacheRecord {
  return {
    cacheKey: "admin_analytics:commerce_snapshot:30d",
    moduleKey: "commerce_snapshot",
    surfaceKey: "admin_analytics",
    rangeKey: "30d",
    value: { revenueUsd: 120 },
    generatedAt: "2026-05-01T12:00:00.000Z",
    lastVerifiedAt: "2026-05-01T12:00:00.000Z",
    lastRefreshRequestedAt: null,
    lastRefreshStartedAt: null,
    lastRefreshCompletedAt: null,
    lastRefreshFailedAt: null,
    refreshStatus: "completed",
    refreshVersion: 3,
    sourceVersion: "source-v3",
    invalidationReason: null,
    sourceMode: "verified_cache",
    truthState: "verified",
    confidence: 0.9,
    parityWarnings: [],
    estimatedFlags: {},
    legacyFlags: {},
    ...overrides,
  };
}

describe("refresh cache contract", () => {
  it("declares the refresh-based display states", () => {
    expect(REFRESH_CACHE_DISPLAY_STATES).toEqual([
      "verified",
      "refreshing",
      "refresh_failed",
      "stale_but_verified",
      "unavailable",
      "pending_first_snapshot",
      "server_confirmed",
      "cache_confirmed",
      "estimated",
      "mixed",
      "legacy_mapped",
    ]);
  });

  it("keeps stale verified snapshots displayable", () => {
    const stale = record({
      sourceMode: "stale_cache",
      truthState: "stale",
    });

    expect(getDisplaySnapshot(stale)).toBe(stale);
    expect(resolveRefreshCacheDisplayState(stale)).toBe("stale_but_verified");
    expect(shouldShowWaiting(stale)).toBe(false);
  });

  it("keeps old values visible while refresh runs or fails", () => {
    const refreshing = markRefreshStarted(record(), "2026-05-01T12:01:00.000Z");
    const failed = markRefreshFailed({
      ...refreshing,
      refreshStatus: "failed",
    }, "2026-05-01T12:02:00.000Z");

    expect(resolveRefreshCacheDisplayState({
      ...refreshing,
      refreshStatus: "refreshing",
    })).toBe("refreshing");
    expect(resolveRefreshCacheDisplayState(failed)).toBe("refresh_failed");
    expect(getDisplaySnapshot(failed)?.value).toEqual({ revenueUsd: 120 });
  });

  it("increments refreshVersion only after completion", () => {
    const requested = requestRefresh(record(), "2026-05-01T12:00:30.000Z");
    const started = markRefreshStarted(requested, "2026-05-01T12:01:00.000Z");
    const completed = markRefreshCompleted(started, "2026-05-01T12:02:00.000Z");

    expect(requested.refreshStatus).toBe("queued");
    expect(started.refreshVersion).toBe(3);
    expect(completed.refreshVersion).toBe(4);
  });

  it("dedupes refresh work by cache key", () => {
    expect(dedupeRefresh({
      cacheKey: "admin_analytics:commerce_snapshot:30d",
      activeRefreshKeys: new Set(["admin_analytics:commerce_snapshot:30d"]),
    })).toBe(true);
  });

  it("requires an invalidation reason to block a verified display snapshot", () => {
    const invalidated = record({
      invalidationReason: "parity_failed_purchase_total",
    });

    expect(getDisplaySnapshot(invalidated)).toBeNull();
    expect(shouldShowWaiting(invalidated)).toBe(false);
  });
});
