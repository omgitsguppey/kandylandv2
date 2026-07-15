import { describe, expect, it } from "vitest";

import {
  NOTIFICATION_PERMISSION_PROMPT_EVENTS,
  buildNotificationPermissionDebugLane,
  classifyNotificationPermissionState,
  classifyNotificationPromptStatus,
  resolveNotificationPromptCooldown,
  shouldShowNotificationPrompt,
} from "@/lib/notifications/notification-permission-contract";
import {
  buildNotificationPromptTelemetryEnvelope,
  buildNotificationPromptTelemetryPayload,
} from "@/lib/notifications/notification-prompt-telemetry";
import {
  buildNotificationPermissionLifecycleReport,
  validateNotificationPermissionLifecycleReport,
} from "../../scripts/agent/validate-notification-permission-lifecycle";

describe("notification permission lifecycle", () => {
  it("classifies blocked browser states without allowing an auto prompt", () => {
    const unsupported = classifyNotificationPermissionState({
      browserCapable: false,
      messagingSupported: false,
      needsStandaloneInstall: false,
      permission: "unsupported",
    });

    expect(unsupported.permissionState).toBe("unsupported");
    expect(unsupported.canRequestPermission).toBe(false);

    const denied = classifyNotificationPermissionState({
      browserCapable: true,
      messagingSupported: true,
      needsStandaloneInstall: false,
      permission: "denied",
    });

    expect(denied.permissionState).toBe("denied");
    expect(classifyNotificationPromptStatus({
      permission: denied,
      hasNotificationsEnabled: false,
      cooldown: resolveNotificationPromptCooldown({ nowMs: 1_000 }),
      userScope: "signed_in",
    }).status).toBe("unavailable");
  });

  it("shows the prompt only after eligibility and respects dismissal cooldown", () => {
    const permission = classifyNotificationPermissionState({
      browserCapable: true,
      messagingSupported: true,
      needsStandaloneInstall: false,
      permission: "default",
    });

    const freshCooldown = resolveNotificationPromptCooldown({ nowMs: 1_000 });
    expect(shouldShowNotificationPrompt({
      permission,
      hasNotificationsEnabled: false,
      cooldown: freshCooldown,
      userScope: "signed_in",
    })).toBe(true);

    const snoozedCooldown = resolveNotificationPromptCooldown({
      nowMs: 1_000,
      dismissedAtMs: 900,
      snoozedUntilMs: 10_000,
    });

    expect(classifyNotificationPromptStatus({
      permission,
      hasNotificationsEnabled: false,
      cooldown: snoozedCooldown,
      userScope: "signed_in",
    }).status).toBe("snoozed");
    expect(shouldShowNotificationPrompt({
      permission,
      hasNotificationsEnabled: false,
      cooldown: snoozedCooldown,
      userScope: "signed_in",
    })).toBe(false);
  });

  it("builds canonical telemetry envelopes for every notification prompt lifecycle event", () => {
    expect(NOTIFICATION_PERMISSION_PROMPT_EVENTS).toEqual([
      "notification_prompt_eligible",
      "notification_prompt_viewed",
      "notification_prompt_dismissed",
      "notification_permission_requested",
      "notification_permission_granted",
      "notification_permission_denied",
      "notification_permission_failed",
      "notification_prompt_snoozed",
      "notification_prompt_blocked",
    ]);

    const payload = buildNotificationPromptTelemetryPayload({
      eventName: "notification_permission_granted",
      permissionState: "granted",
      promptStatus: "accepted",
      userScope: "signed_in",
      featureSource: "dashboard",
      sourceComponent: "NotificationPromptBanner",
      route: "/dashboard",
      cooldownRemainingMs: 0,
      retryCount: 1,
    });
    const envelope = buildNotificationPromptTelemetryEnvelope(payload);

    expect(envelope.eventName).toBe("notification_permission_granted");
    expect(envelope.featureId).toBe("notifications");
    expect(envelope.materializerLane).toBe("notification_materializer");
    expect(envelope.debugVisibility).toBe("debug_visible");
    expect(envelope.pipelineStatus).toBe("normal");
    expect(envelope.metadata.permissionState).toBe("granted");
    expect(envelope.metadata.promptStatus).toBe("accepted");
  });

  it("exposes one debug lane and fails validator reports that lose lifecycle guarantees", () => {
    const lane = buildNotificationPermissionDebugLane({
      eligibleCount: 1,
      viewedCount: 1,
      grantedCount: 1,
      deniedCount: 0,
      failedCount: 0,
      unsupportedCount: 0,
      cooldownActiveCount: 0,
      snoozedCount: 0,
      telemetryMapped: true,
    });

    expect(lane.label).toBe("Notification permission");
    expect(lane.rawDetailsCollapsedByDefault).toBe(true);
    expect(lane.telemetryStatus).toBe("mapped");

    const report = buildNotificationPermissionLifecycleReport({
      currentHead: "0123456789abcdef0123456789abcdef01234567",
      dirtyFiles: [
        "src/lib/notifications/notification-permission-contract.ts",
        "src/lib/notifications/notification-prompt-telemetry.ts",
        "src/components/Dashboard/NotificationPromptBanner.tsx",
        "src/lib/telemetry-catalog.ts",
      ],
    });

    expect(validateNotificationPermissionLifecycleReport(report)).toEqual([]);
    expect(validateNotificationPermissionLifecycleReport({
      ...report,
      currentHead: "unknown",
    })).toContain("current Git head is missing or is not a full commit SHA.");
    expect(validateNotificationPermissionLifecycleReport({
      ...report,
      autoFireOnPageLoadBlocked: false,
      debugLanePresent: false,
      ariaBusyPreserved: false,
    })).toEqual(expect.arrayContaining([
      "permission prompt can auto-fire on page load.",
      "debug lane missing.",
      "aria-busy lost.",
    ]));
  });
});
