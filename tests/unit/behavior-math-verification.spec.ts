import { describe, expect, it } from "vitest";

import {
  buildBehaviorMathReport,
  getBehaviorMetricConfidence,
} from "@/lib/behavioral/behavior-math-engine";
import {
  buildLegacyBehaviorRecoveryPlan,
  LEGACY_BEHAVIOR_RECOVERY_START_DATE,
} from "@/lib/behavioral/legacy-behavior-recovery";

describe("behavior math verification", () => {
  it("does not count disabled tracking behavior, linked guest duplicates, legacy unknowns, or page time as watch time", () => {
    const report = buildBehaviorMathReport({
      events: [
        {
          eventId: "guest-page-1",
          eventName: "semantic_page_viewed",
          eventType: "page_view",
          timestampMs: Date.parse("2026-05-20T10:00:00.000Z"),
          sessionId: "session-guest",
          anonymousVisitorId: "guest-1",
          identityState: "guest_only",
          trackingState: "enabled",
          durationMs: 60_000,
        },
        {
          eventId: "guest-page-1",
          eventName: "semantic_page_viewed",
          eventType: "page_view",
          timestampMs: Date.parse("2026-05-20T10:00:00.000Z"),
          sessionId: "session-guest",
          anonymousVisitorId: "guest-1",
          userId: "user-1",
          identityState: "guest_linked_to_user",
          trackingState: "enabled",
          durationMs: 60_000,
        },
        {
          eventId: "disabled-click",
          eventName: "semantic_target_clicked",
          eventType: "click",
          timestampMs: Date.parse("2026-05-20T10:01:00.000Z"),
          sessionId: "session-disabled",
          anonymousVisitorId: "guest-disabled",
          identityState: "guest_only",
          trackingState: "disabled",
        },
        {
          eventId: "legacy-unknown",
          eventName: "creator_profile_viewed",
          eventType: "page_view",
          timestampMs: Date.parse("2026-03-04T10:01:00.000Z"),
          identityState: "unknown_legacy",
          trackingState: "unknown",
          targetCreatorId: "creator-1",
        },
        {
          eventId: "watch-page-duration",
          eventName: "semantic_page_engaged",
          eventType: "visibility",
          timestampMs: Date.parse("2026-05-20T10:02:00.000Z"),
          sessionId: "session-user",
          userId: "user-1",
          identityState: "user_only",
          trackingState: "enabled",
          durationMs: 120_000,
        },
        {
          eventId: "watch-runtime",
          eventName: "watch_session_completed",
          eventType: "watch",
          timestampMs: Date.parse("2026-05-20T10:03:00.000Z"),
          sessionId: "session-user",
          userId: "user-1",
          identityState: "user_only",
          trackingState: "enabled",
          watchTimeMs: 45_000,
          watchScoreSource: "watch_session_rollup",
        },
        {
          eventId: "purchase-intent",
          eventName: "begin_checkout",
          eventType: "click",
          timestampMs: Date.parse("2026-05-20T10:04:00.000Z"),
          sessionId: "session-user",
          userId: "user-1",
          identityState: "user_only",
          trackingState: "enabled",
        },
      ],
      identityLinks: [
        {
          guestId: "guest-1",
          userId: "user-1",
          sessionId: "session-guest",
          identityLinkId: "identity-link-1",
        },
      ],
    });

    expect(report.summary.disabledEventsExcluded).toBe(1);
    expect(report.summary.legacyUnknownExcluded).toBe(1);
    expect(report.summary.duplicateEventsDeduped).toBe(1);
    expect(report.summary.watchTimeFromPageTimeExcluded).toBe(1);

    const user = report.perUser["user-1"];
    expect(user?.metrics.pageViews.value).toBe(1);
    expect(user?.metrics.clicks.value).toBe(1);
    expect(user?.metrics.watchTimeMs.value).toBe(45_000);
    expect(user?.metrics.activeTimeMs.value).toBe(120_000);
    expect(user?.metrics.purchaseIntent.value).toBe(1);
    expect(user?.metrics.purchaseTruthEvents.value).toBe(0);
    expect(report.perGuest["guest-1"]).toBeUndefined();
    expect(report.legacyUnknown.length).toBe(1);
    expect(getBehaviorMetricConfidence(user!.metrics.watchTimeMs)).toBe("exact");
  });

  it("keeps March 1 legacy recovery dry-run only with duplicate risk labels", () => {
    const plan = buildLegacyBehaviorRecoveryPlan({
      records: [
        {
          id: "before-window",
          eventName: "home_page_viewed",
          timestampMs: Date.parse("2026-02-28T23:59:59.000Z"),
          userId: "user-old",
        },
        {
          id: "legacy-known",
          eventName: "creator_profile_viewed",
          timestampMs: Date.parse("2026-03-01T00:00:00.000Z"),
          userId: "user-1",
          sessionId: "session-1",
        },
        {
          id: "legacy-weak",
          eventName: "mystery_interaction",
          timestampMs: Date.parse("2026-03-05T00:00:00.000Z"),
        },
      ],
    });

    expect(LEGACY_BEHAVIOR_RECOVERY_START_DATE).toBe("2026-03-01");
    expect(plan.mode).toBe("dry_run_only");
    expect(plan.mutationsAllowed).toBe(false);
    expect(plan.records).toHaveLength(2);
    expect(plan.records[0]).toMatchObject({
      currentCategory: "creator_interaction",
      confidence: "probable",
      duplicateRisk: "medium",
    });
    expect(plan.records[1]).toMatchObject({
      currentCategory: "unknown",
      confidence: "unknown",
      duplicateRisk: "high",
    });
  });
});
