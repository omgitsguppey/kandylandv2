import { describe, expect, it } from "vitest";

import {
  NOTIFICATION_INTENT_TYPES,
  buildNotificationTargetingDebugLane,
  getNotificationIntentContract,
} from "@/lib/notifications/notification-intent-contract";
import {
  resolveNotificationTargetingDryRun,
} from "@/lib/notifications/notification-targeting-resolver";

describe("notification targeting intent", () => {
  it("registers every delivery-intent type with audience, opt-in, dedupe, telemetry, and debug rules", () => {
    expect(NOTIFICATION_INTENT_TYPES).toEqual([
      "drop_live",
      "drop_expiring",
      "drop_unwrapped",
      "creator_broadcast",
      "fan_pass_update",
      "chat_message",
      "chat_paid_gd_gate",
      "daily_task_available",
      "daily_task_streak",
      "wallet_payment_success",
      "system_security",
      "support_update",
    ]);

    for (const intentType of NOTIFICATION_INTENT_TYPES) {
      const contract = getNotificationIntentContract(intentType);

      expect(contract.audienceSource).toBeTruthy();
      expect(contract.eligibility.length).toBeGreaterThan(0);
      expect(contract.optInRequirement).toBeTruthy();
      expect(contract.consentRequirement).toBeTruthy();
      expect(contract.throttleCooldownMs).toBeGreaterThanOrEqual(0);
      expect(contract.dedupeKeyTemplate).toContain(intentType);
      expect(contract.userFacingCopySource).toBeTruthy();
      expect(contract.deepLinkRoute).toMatch(/^\//u);
      expect(contract.telemetryEvents).toContain("notification_intent_evaluated");
      expect(contract.debugVisibility.lane).toBe("Notification targeting");
    }
  });

  it("blocks opted-out or missing-token users before delivery becomes eligible", () => {
    const dryRun = resolveNotificationTargetingDryRun({
      intentType: "drop_live",
      actorUserId: "system",
      recipientUserId: "user_1",
      notificationSettings: {
        browserPushEnabled: true,
        newDropAlerts: false,
      },
      permissionState: "granted",
      hasPushToken: true,
      consentMode: "minimal_analytics",
      nowMs: 1_000,
    });

    expect(dryRun.allowed).toBe(false);
    expect(dryRun.blockedBy).toContain("blocked_by_opt_out");
    expect(dryRun.deliveryIntentTruth).toBe("dry_run_only_no_provider_send");
    expect(dryRun.providerSendAttempted).toBe(false);
  });

  it("prevents chat notifications from targeting the sender", () => {
    const dryRun = resolveNotificationTargetingDryRun({
      intentType: "chat_message",
      actorUserId: "user_sender",
      recipientUserId: "user_sender",
      notificationSettings: {
        browserPushEnabled: true,
        chatNotifications: true,
      },
      permissionState: "granted",
      hasPushToken: true,
      consentMode: "minimal_analytics",
      nowMs: 1_000,
    });

    expect(dryRun.allowed).toBe(false);
    expect(dryRun.blockedBy).toContain("blocked_sender_is_recipient");
    expect(dryRun.audienceSourceStatus).toBe("recipient_only");
  });

  it("requires creator broadcast audience settings and daily task eligibility", () => {
    const broadcast = resolveNotificationTargetingDryRun({
      intentType: "creator_broadcast",
      actorCreatorId: "creator_1",
      recipientUserId: "fan_1",
      notificationSettings: {
        browserPushEnabled: true,
        creatorBroadcasts: true,
      },
      permissionState: "granted",
      hasPushToken: true,
      consentMode: "full_behavioral",
      creatorAudienceSetting: "disabled",
      nowMs: 1_000,
    });
    const task = resolveNotificationTargetingDryRun({
      intentType: "daily_task_available",
      actorUserId: "system",
      recipientUserId: "user_1",
      notificationSettings: {
        browserPushEnabled: true,
        dailyTaskReminders: true,
      },
      permissionState: "granted",
      hasPushToken: true,
      consentMode: "minimal_analytics",
      taskEligible: false,
      nowMs: 1_000,
    });

    expect(broadcast.allowed).toBe(false);
    expect(broadcast.blockedBy).toContain("blocked_by_creator_audience_setting");
    expect(task.allowed).toBe(false);
    expect(task.blockedBy).toContain("blocked_task_not_eligible");
  });

  it("summarizes targeting health without raw recipient or token details", () => {
    const lane = buildNotificationTargetingDebugLane({
      intentTypesRegistered: NOTIFICATION_INTENT_TYPES.length,
      missingAudienceSourceCount: 0,
      blockedByOptOutCount: 2,
      blockedByMissingTokenCount: 1,
      blockedByConsentCount: 1,
      dryRunEligibleCount: 4,
    });

    expect(lane.lane).toBe("Notification targeting");
    expect(lane.status).toBe("live");
    expect(lane.rawDetailsCollapsedByDefault).toBe(true);
    expect(JSON.stringify(lane)).not.toMatch(/fcm|token_|recipientUserId/u);
  });
});
