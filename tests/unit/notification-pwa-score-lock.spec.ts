import { describe, expect, it } from "vitest";

import {
  buildNotificationPwaScoreLockReport,
  validateNotificationPwaScoreLockReport,
} from "../../scripts/agent/validate-notification-pwa-score-lock";

const score = {
  sourceHealth: 92.5,
  runtimeHealth: 84.2,
  evidenceCompleteness: 69.6,
  freshness: 83.75,
  costRisk: 42,
  regressionRisk: 86,
  overallHealthScore: 79.25,
};

describe("notification PWA score lock", () => {
  it("locks notification permission, push tokens, targeting, PWA safety, telemetry, debug, and score dimensions", () => {
    const report = buildNotificationPwaScoreLockReport({
      currentHead: "test-head",
      scoreBefore: score,
      scoreAfter: score,
      permissionReport: {
        permissionStateTracked: true,
        autoFireOnPageLoadBlocked: true,
        cooldownPolicyPresent: true,
        canonicalEnvelopeMapped: true,
        telemetryCatalogMapped: true,
        featureRegistrationMapped: true,
        personMetricsMapped: true,
        debugLanePresent: true,
        promptLifecycleEvents: ["notification_prompt_viewed", "notification_permission_granted"],
        debugLane: { status: "live", rawDetailsCollapsedByDefault: true },
      },
      pushReport: {
        status: "pass",
        authenticatedOnly: true,
        arbitraryUserBindingBlocked: true,
        rawTokenExposureBlocked: true,
        routeResponseExposesRawToken: false,
        realPushNotificationsSent: false,
        telemetryEvents: ["push_token_registered", "push_token_registration_failed"],
        debugLane: { status: "live", rawTokenExposureCount: 0, rawDetailsCollapsedByDefault: true },
      },
      targetingReport: {
        status: "pass",
        realPushNotificationsSent: false,
        intentTypes: ["drop_live", "creator_broadcast", "chat_message", "daily_task_available", "wallet_payment_success"],
        debugLane: { status: "live", rawDetailsCollapsedByDefault: true },
      },
      pwaReport: {
        status: "pass",
        realPushNotificationsSent: false,
        debugLane: {
          status: "live",
          notificationCompatible: true,
          forbiddenCacheSafe: true,
          offlineFallbackSafe: true,
          rawDetailsCollapsedByDefault: true,
        },
        serviceWorkerSafetyStatus: {
          cachePolicy: {
            forbiddenCacheSafe: true,
            offlineFallbackShowsPrivateTruth: false,
          },
          notificationCompatibility: "compatible",
          debugVisibility: "debug_visible",
        },
        telemetryEvents: ["pwa_service_worker_registered", "pwa_update_available", "pwa_offline_seen"],
      },
      featureRegistryText: "notifications notification_prompt_viewed notification_permission_granted notification_permission_denied notification_permission_failed push_token_registered push_token_registration_failed pwa_service_worker_registered pwa_update_available pwa_offline_seen notification_targeting_dry_run_eligible",
      telemetryCatalogText: "notification_prompt_viewed notification_permission_granted notification_permission_denied notification_permission_failed push_token_registered push_token_registration_failed pwa_service_worker_registered pwa_update_available pwa_offline_seen notification_targeting_dry_run_eligible",
      dirtyFiles: [
        "scripts/agent/validate-notification-pwa-score-lock.ts",
        "tests/unit/notification-pwa-score-lock.spec.ts",
      ],
    });

    expect(report.permissionLifecycleStatus.status).toBe("pass");
    expect(report.pushTokenStatus.status).toBe("pass");
    expect(report.targetingIntentStatus.status).toBe("pass");
    expect(report.pwaServiceWorkerStatus.status).toBe("pass");
    expect(report.offlineSafetyStatus.status).toBe("pass");
    expect(report.notificationTelemetryStatus.status).toBe("pass");
    expect(report.debugVisibilityStatus.status).toBe("pass");
    expect(report.scoreDimensions).toHaveProperty("overallHealthScore");
    expect(report.protectedSurfaceStatus).toMatchObject({
      chatTouched: false,
      taskTouched: false,
      paymentRuntimeTouched: false,
      gumdropRuntimeTouched: false,
    });
    expect(validateNotificationPwaScoreLockReport(report)).toEqual([]);
  });

  it("fails when real push sends or protected runtime changes are present", () => {
    const report = buildNotificationPwaScoreLockReport({
      currentHead: "test-head",
      scoreBefore: score,
      scoreAfter: score,
      pushReport: {
        status: "pass",
        authenticatedOnly: true,
        arbitraryUserBindingBlocked: true,
        rawTokenExposureBlocked: true,
        routeResponseExposesRawToken: false,
        realPushNotificationsSent: true,
        telemetryEvents: ["push_token_registered"],
        debugLane: { status: "live", rawTokenExposureCount: 0, rawDetailsCollapsedByDefault: true },
      },
      dirtyFiles: ["src/lib/chat/chat-telemetry-contract.ts"],
    });

    expect(validateNotificationPwaScoreLockReport(report)).toEqual(
      expect.arrayContaining([
        "real pushes are sent in tests.",
        "chat/task/payment/GumDrop runtime changed.",
      ]),
    );
  });
});
