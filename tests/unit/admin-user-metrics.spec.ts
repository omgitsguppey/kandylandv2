import { describe, expect, it } from "vitest";

import {
  buildAdminUserMetricIntegrity,
  scoreAdminUserEngagement,
  shouldRecoverAdminUserMetricsFromFacts,
} from "@/lib/admin-user-metrics";
import {
  adminMetricStateToSurfaceState,
  hasUsableAdminMetricValue,
  resolveAdminMetricState,
} from "@/lib/admin-metric-truth-state";
import { buildAdminUserMetricsSnapshot } from "@/lib/server/admin-user-metrics-snapshot";

describe("admin user metric source truth", () => {
  it("keeps cached metric values visible while realtime transport refreshes", () => {
    const state = resolveAdminMetricState({
      hasUsableValue: true,
      transportState: "loading",
      refreshInFlight: true,
    });

    expect(state).toBe("refreshing");
    expect(adminMetricStateToSurfaceState(state)).toBe("cached");
  });

  it("degrades transport failures instead of failing over valid cached values", () => {
    expect(resolveAdminMetricState({
      hasUsableValue: true,
      transportState: "failed",
    })).toBe("degraded");
  });

  it("only fails a metric when no usable value exists and the source failed", () => {
    expect(resolveAdminMetricState({
      hasUsableValue: false,
      transportState: "failed",
    })).toBe("failed");
    expect(hasUsableAdminMetricValue(0, undefined)).toBe(true);
  });

  it("builds a canonical admin user metrics snapshot with stale-but-visible values", () => {
    const generatedAt = 1_700_000_000_000;
    const snapshot = buildAdminUserMetricsSnapshot({
      generatedAt,
      users: [
        {
          uid: "user_1",
          status: "active",
          isVerified: true,
          onboardingCompleted: true,
          notificationSettings: { browserPushEnabled: true },
        },
        {
          uid: "user_2",
          status: "suspended",
          isVerified: false,
          onboardingCompleted: false,
          notificationSettings: { browserPushEnabled: false },
        },
      ],
      analyticsByUser: {
        user_1: {
          lastSeenAt: generatedAt - 8 * 24 * 60 * 60 * 1000,
          unwrapCount: 3,
          purchaseCount: 2,
          watchSecondsTotal: 90,
          grossRevenueUsd: 20,
        },
      },
      commerceSummaryRaw: {
        grossRevenueUsdTotal: 20,
        purchaseCount: 2,
        unlockCount: 4,
      },
      commerceSummaryExists: true,
      source: "hot_cache",
    }).snapshot;

    expect(snapshot).toMatchObject({
      totalUsers: 2,
      activeUsers: 1,
      verifiedUsers: 1,
      sevenDayReturners: 0,
      pushEnabledUsers: 1,
      trackedUnwraps: 4,
      trackedPurchases: 2,
      watchTimeMs: 90_000,
      onboardedUsers: 1,
      totalRevenueUsd: 20,
      payingUsers: 1,
      source: "hot_cache",
      freshnessState: "stale",
    });
  });

  it("flags capped rollup events for raw fact recovery", () => {
    expect(shouldRecoverAdminUserMetricsFromFacts({
      hasRollup: true,
      hasDaily: false,
      userOnboarded: true,
      metrics: {
        eventCount: 14,
        sessionCount: 3,
        viewCount: 0,
        watchSecondsTotal: 120,
        onboardingCompletionCount: 0,
      },
    })).toBe(true);
  });

  it("surfaces partial integrity instead of silent zeros", () => {
    const nowMs = Date.now();
    const integrity = buildAdminUserMetricIntegrity({
      hasRollup: true,
      hasDaily: false,
      recoveredFromFacts: false,
      userOnboarded: true,
      userCreatedAt: nowMs - 7 * 24 * 60 * 60 * 1000,
      nowMs,
      lastSeenAt: nowMs - 60_000,
      metrics: {
        eventCount: 14,
        sessionCount: 2,
        viewCount: 0,
        bounceCount: 0,
        authSuccessCount: 0,
        onboardingCompletionCount: 0,
        watchSecondsTotal: 90,
        unwrapCount: 0,
        purchaseCount: 0,
        grossRevenueUsd: 0,
        unlockSpendGdTotal: 0,
        lastSeenAt: nowMs - 60_000,
      },
    });

    expect(integrity.truthLabel).toBe("partial");
    expect(integrity.verificationState).toBe("degraded");
    expect(integrity.failures).toEqual(expect.arrayContaining([
      "event_count_suspected_capped",
      "views_missing_despite_sessions_or_watch_time",
      "auth_stats_missing_for_onboarded_user",
    ]));
  });

  it("marks stale canonical metrics when freshness is too old", () => {
    const nowMs = Date.now();
    const integrity = buildAdminUserMetricIntegrity({
      hasRollup: true,
      hasDaily: true,
      recoveredFromFacts: false,
      userOnboarded: false,
      userCreatedAt: nowMs - 30 * 24 * 60 * 60 * 1000,
      nowMs,
      lastSeenAt: nowMs - 8 * 24 * 60 * 60 * 1000,
      metrics: {
        eventCount: 20,
        sessionCount: 5,
        viewCount: 5,
        bounceCount: 1,
        authSuccessCount: 1,
        onboardingCompletionCount: 0,
        watchSecondsTotal: 120,
        unwrapCount: 0,
        purchaseCount: 0,
        grossRevenueUsd: 0,
        unlockSpendGdTotal: 0,
        lastSeenAt: nowMs - 8 * 24 * 60 * 60 * 1000,
      },
    });

    expect(integrity.truthLabel).toBe("stale");
    expect(integrity.verificationState).toBe("stale");
  });

  it("ranks spenders and recent historical activity above raw event spam", () => {
    const nowMs = Date.now();
    const spender = scoreAdminUserEngagement({
      eventCount: 20,
      sessionCount: 2,
      viewCount: 5,
      bounceCount: 0,
      authSuccessCount: 1,
      onboardingCompletionCount: 1,
      watchSecondsTotal: 300,
      unwrapCount: 2,
      purchaseCount: 2,
      grossRevenueUsd: 20,
      unlockSpendGdTotal: 500,
      lastSeenAt: nowMs - 10 * 60 * 1000,
    }, nowMs);
    const eventOnly = scoreAdminUserEngagement({
      eventCount: 100,
      sessionCount: 1,
      viewCount: 2,
      bounceCount: 0,
      authSuccessCount: 0,
      onboardingCompletionCount: 0,
      watchSecondsTotal: 0,
      unwrapCount: 0,
      purchaseCount: 0,
      grossRevenueUsd: 0,
      unlockSpendGdTotal: 0,
      lastSeenAt: nowMs - 6 * 60 * 60 * 1000,
    }, nowMs);

    expect(spender).toBeGreaterThan(eventOnly);
  });
});
