import { describe, expect, it } from "vitest";

import { buildUserBehaviorRollup } from "@/lib/server/user-behavior-rollup";

describe("user behavior rollup", () => {
  it("does not apply the privacy floor for full-signal users with no engagement", () => {
    const rollup = buildUserBehaviorRollup({
      userId: "full_signal_empty",
      hasRollup: true,
      identifiedAnalyticsEnabled: true,
      hasPrivacySettings: true,
      engagementInput: {
        normalizedActionCount7d: 0,
        unwrappedCount30d: 0,
        validWatchMinutes30d: 0,
        purchaseCount90d: 0,
        activeDays7d: 0,
        freeGdEarned30d: 0,
      },
    });

    expect(rollup.engagement.rawScore).toBe(0);
    expect(rollup.engagement.displayedScore).toBe(0);
    expect(rollup.engagement.score).toBe(0);
    expect(rollup.engagement.appliedPrivacyFloor).toBe(false);
    expect(rollup.engagement.privacyFloor).toBeNull();
    expect(rollup.engagement.dataAvailabilityReason).toBe("full_signal");
    expect(rollup.engagement.verifiedSignalPresent).toBe(false);
  });

  it("labels the privacy floor when privacy-limited users have no verified engagement signal", () => {
    const rollup = buildUserBehaviorRollup({
      userId: "privacy_limited_no_signal",
      hasRollup: true,
      identifiedAnalyticsEnabled: false,
      hasPrivacySettings: true,
      engagementInput: {
        normalizedActionCount7d: 0,
        unwrappedCount30d: 0,
        validWatchMinutes30d: 0,
        purchaseCount90d: 0,
        activeDays7d: 0,
        freeGdEarned30d: 0,
      },
    });

    expect(rollup.engagement.rawScore).toBe(0);
    expect(rollup.engagement.displayedScore).toBe(24);
    expect(rollup.engagement.score).toBe(24);
    expect(rollup.engagement.appliedPrivacyFloor).toBe(true);
    expect(rollup.engagement.privacyFloor).toBe(24);
    expect(rollup.engagement.dataAvailabilityReason).toBe("privacy_limited_identified_analytics_denied");
    expect(rollup.engagement.verifiedSignalPresent).toBe(false);
  });

  it("uses verified metric snapshot signals when daily engagement input is empty", () => {
    const rollup = buildUserBehaviorRollup({
      userId: "user_with_facts",
      totalActions: 24,
      views: 12,
      unwraps: 4,
      watchTimeMs: 18 * 60_000,
      purchasesCount: 2,
      revenueUsd: 14,
      rewardGdEarned: 120,
      authEvents: 1,
      lastSeenAt: Date.now(),
      hasRollup: true,
      hasDaily: false,
      hasFacts: true,
      hasWatchSessions: true,
      hasTransactions: true,
      identifiedAnalyticsEnabled: true,
      hasPrivacySettings: true,
      engagementInput: {
        normalizedActionCount7d: 0,
        unwrappedCount30d: 0,
        validWatchMinutes30d: 0,
        purchaseCount90d: 0,
        activeDays7d: 0,
        freeGdEarned30d: 0,
      },
    });

    expect(rollup.engagement.score).toBeGreaterThan(24);
    expect(rollup.engagement.rawScore).toBe(rollup.engagement.score);
    expect(rollup.engagement.displayedScore).toBe(rollup.engagement.score);
    expect(rollup.engagement.appliedPrivacyFloor).toBe(false);
    expect(rollup.engagement.verifiedSignalPresent).toBe(true);
    expect(rollup.engagement.inputs).toMatchObject({
      normalizedActionCount7d: 24,
      unwrappedCount30d: 4,
      validWatchMinutes30d: 18,
      purchaseCount90d: 2,
      activeDays7d: 1,
      freeGdEarned30d: 120,
    });
    expect(rollup.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "source_degraded",
        message: expect.stringContaining("Daily engagement materialization"),
        evidence: expect.objectContaining({
          sourceReason: "daily_engagement_input_merged_with_metric_snapshot",
          fallbackReasons: expect.arrayContaining([
            "normalizedActionCount7d:metric_snapshot_fallback",
            "validWatchMinutes30d:metric_snapshot_fallback",
          ]),
        }),
      }),
    ]));
  });

  it("does not apply the privacy floor when verified engagement signals exist under privacy limits", () => {
    const rollup = buildUserBehaviorRollup({
      userId: "privacy_limited_with_signal",
      totalActions: 10,
      views: 3,
      watchTimeMs: 12 * 60_000,
      authEvents: 1,
      hasFacts: true,
      hasWatchSessions: true,
      identifiedAnalyticsEnabled: false,
      hasPrivacySettings: true,
      engagementInput: {
        normalizedActionCount7d: 0,
        unwrappedCount30d: 0,
        validWatchMinutes30d: 0,
        purchaseCount90d: 0,
        activeDays7d: 0,
        freeGdEarned30d: 0,
      },
    });

    expect(rollup.engagement.rawScore).toBeGreaterThan(0);
    expect(rollup.engagement.displayedScore).toBe(rollup.engagement.rawScore);
    expect(rollup.engagement.score).toBe(rollup.engagement.rawScore);
    expect(rollup.engagement.appliedPrivacyFloor).toBe(false);
    expect(rollup.engagement.privacyFloor).toBeNull();
    expect(rollup.engagement.dataAvailabilityReason).toBe("privacy_limited_identified_analytics_denied");
    expect(rollup.engagement.verifiedSignalPresent).toBe(true);
  });

  it("keeps stronger daily fields when materialized daily engagement is already richer", () => {
    const rollup = buildUserBehaviorRollup({
      userId: "user_with_daily",
      totalActions: 1,
      views: 1,
      unwraps: 0,
      watchTimeMs: 0,
      purchasesCount: 0,
      rewardGdEarned: 0,
      lastSeenAt: Date.now(),
      hasDaily: true,
      hasFacts: true,
      identifiedAnalyticsEnabled: true,
      hasPrivacySettings: true,
      engagementInput: {
        normalizedActionCount7d: 18,
        unwrappedCount30d: 3,
        validWatchMinutes30d: 45,
        purchaseCount90d: 1,
        activeDays7d: 4,
        freeGdEarned30d: 200,
      },
    });

    expect(rollup.engagement.inputs).toMatchObject({
      normalizedActionCount7d: 18,
      unwrappedCount30d: 3,
      validWatchMinutes30d: 45,
      purchaseCount90d: 1,
      activeDays7d: 4,
      freeGdEarned30d: 200,
    });
    expect(rollup.issues.some((issue) => (
      issue.message.includes("Daily engagement materialization")
    ))).toBe(false);
  });
});
