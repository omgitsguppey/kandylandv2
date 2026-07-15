import { describe, expect, it } from "vitest";

import {
  buildNotificationPwaScoreLockReport,
  validateNotificationPwaScoreLockReport,
} from "../../scripts/agent/validate-notification-pwa-score-lock";
import {
  targetedBehaviorHeadsMatch,
  targetedBehaviorReportHasExplicitPass,
  targetedBehaviorReportIsFresh,
} from "../../scripts/agent/validate-targeted-behavior-evidence";

const TEST_HEAD = "c".repeat(40);

const score = {
  sourceHealth: 92.5,
  runtimeHealth: 84.2,
  evidenceCompleteness: 69.6,
  freshness: 83.75,
  costRisk: 42,
  regressionRisk: 86,
  overallHealthScore: 79.25,
};

function childEvidence(reportKey: string): Record<string, unknown> {
  return {
    reportKey,
    status: "pass",
    passed: true,
    generatedAtUtc: new Date().toISOString(),
    currentHead: TEST_HEAD,
    sourceCommit: TEST_HEAD,
    canClearSourceGate: true,
    validationFailures: [],
  };
}

function passingChildReports(): {
  permissionReport: Record<string, unknown>;
  pushReport: Record<string, unknown>;
  targetingReport: Record<string, unknown>;
  pwaReport: Record<string, unknown>;
} {
  return {
    permissionReport: {
      ...childEvidence("notification-permission-lifecycle"),
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
      ...childEvidence("push-token-registration"),
      authenticatedOnly: true,
      arbitraryUserBindingBlocked: true,
      rawTokenExposureBlocked: true,
      routeResponseExposesRawToken: false,
      realPushNotificationsSent: false,
      telemetryEvents: ["push_token_registered", "push_token_registration_failed"],
      debugLane: { status: "live", rawTokenExposureCount: 0, rawDetailsCollapsedByDefault: true },
    },
    targetingReport: {
      ...childEvidence("notification-targeting-intent"),
      realPushNotificationsSent: false,
      intentTypes: ["drop_live", "creator_broadcast", "chat_message", "daily_task_available", "wallet_payment_success"],
      debugLane: { status: "live", rawDetailsCollapsedByDefault: true },
    },
    pwaReport: {
      ...childEvidence("pwa-service-worker-safety"),
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
  };
}

describe("notification PWA score lock", () => {
  it("locks notification truth using telemetry derived by the canonical feature registry", () => {
    const report = buildNotificationPwaScoreLockReport({
      currentHead: TEST_HEAD,
      scoreBefore: score,
      scoreAfter: score,
      ...passingChildReports(),
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
    expect(report.status).toBe("pass");
    expect(report.passed).toBe(true);
    expect(report.sourceCommit).toBe(TEST_HEAD);
    expect(targetedBehaviorHeadsMatch(report.sourceCommit, TEST_HEAD)).toBe(true);
    expect(targetedBehaviorReportIsFresh(report as unknown as Record<string, unknown>)).toBe(true);
    expect(targetedBehaviorReportHasExplicitPass(report as unknown as Record<string, unknown>)).toBe(true);
    expect(report.remainingGaps).toEqual(expect.arrayContaining([
      expect.stringContaining("evidenceCompleteness below 80"),
    ]));
    expect(report.scoreDimensions).toHaveProperty("overallHealthScore");
    expect(report.protectedSurfaceStatus).toMatchObject({
      chatTouched: false,
      taskTouched: false,
      paymentRuntimeTouched: false,
      gumdropRuntimeTouched: false,
    });
    expect(validateNotificationPwaScoreLockReport(report)).toEqual([]);
  });

  it("fails when the feature registry omits a required notification event", () => {
    const report = buildNotificationPwaScoreLockReport({
      currentHead: TEST_HEAD,
      scoreBefore: score,
      scoreAfter: score,
      ...passingChildReports(),
      featureTelemetryEvents: [
        "notification_prompt_viewed",
        "notification_permission_granted",
        "notification_permission_denied",
        "notification_permission_failed",
        "push_token_registered",
        "push_token_registration_failed",
        "notification_targeting_dry_run_eligible",
        "pwa_service_worker_registered",
        "pwa_update_available",
      ],
      telemetryCatalogText: "notification_prompt_viewed notification_permission_granted notification_permission_denied notification_permission_failed push_token_registered push_token_registration_failed pwa_service_worker_registered pwa_update_available pwa_offline_seen notification_targeting_dry_run_eligible",
      dirtyFiles: [],
    });

    expect(report.notificationTelemetryStatus.status).toBe("fail");
    expect(report.validationFailures).toContain("notification telemetry missing from feature registry");
  });

  it("fails when real push sends or protected runtime changes are present", () => {
    const report = buildNotificationPwaScoreLockReport({
      currentHead: TEST_HEAD,
      scoreBefore: score,
      scoreAfter: score,
      ...passingChildReports(),
      pushReport: {
        ...passingChildReports().pushReport,
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

    expect(report.status).toBe("fail");
    expect(report.passed).toBe(false);
    expect(targetedBehaviorReportHasExplicitPass(report as unknown as Record<string, unknown>)).toBe(false);
    expect(validateNotificationPwaScoreLockReport(report)).toEqual(
      expect.arrayContaining([
        "real pushes are sent in tests.",
        "chat/task/payment/GumDrop runtime changed.",
      ]),
    );
    expect(report.nextExactSteps.join("\n")).toContain("real pushes are sent in tests");
  });

  it("rejects stale, wrong-head, or failure-bearing child reports", () => {
    const childReports = passingChildReports();
    childReports.permissionReport = {
      ...childReports.permissionReport,
      generatedAtUtc: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
      currentHead: "d".repeat(40),
      validationFailures: ["permission child failed"],
    };
    const report = buildNotificationPwaScoreLockReport({
      currentHead: TEST_HEAD,
      scoreBefore: score,
      scoreAfter: score,
      ...childReports,
      telemetryCatalogText: "notification_prompt_viewed notification_permission_granted notification_permission_denied notification_permission_failed push_token_registered push_token_registration_failed pwa_service_worker_registered pwa_update_available pwa_offline_seen notification_targeting_dry_run_eligible",
      dirtyFiles: [],
    });

    expect(report.status).toBe("fail");
    expect(report.validationFailures).toEqual(expect.arrayContaining([
      "notification-permission-lifecycle child validationFailures must be an explicit empty array.",
      "notification-permission-lifecycle child currentHead must match the current full Git SHA.",
      "notification-permission-lifecycle child generatedAtUtc must be non-future and fresh within 86400000ms.",
    ]));
  });

  it("rejects a child that cannot clear source readiness", () => {
    const childReports = passingChildReports();
    childReports.permissionReport = {
      ...childReports.permissionReport,
      canClearSourceGate: false,
    };
    const report = buildNotificationPwaScoreLockReport({
      currentHead: TEST_HEAD,
      scoreBefore: score,
      scoreAfter: score,
      ...childReports,
      telemetryCatalogText: "notification_prompt_viewed notification_permission_granted notification_permission_denied notification_permission_failed push_token_registered push_token_registration_failed pwa_service_worker_registered pwa_update_available pwa_offline_seen notification_targeting_dry_run_eligible",
      dirtyFiles: [],
    });

    expect(report.status).toBe("fail");
    expect(report.validationFailures).toContain("notification-permission-lifecycle child canClearSourceGate must be true.");
  });

  it("fails closed when provenance is not full-head and current", () => {
    const report = buildNotificationPwaScoreLockReport({
      generatedAtUtc: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
      currentHead: "short-head",
      scoreBefore: score,
      scoreAfter: score,
      dirtyFiles: [],
    });

    expect(report.status).toBe("fail");
    expect(report.passed).toBe(false);
    expect(report.validationFailures).toEqual(expect.arrayContaining([
      "currentHead and sourceCommit must be the same full 40-character Git SHA.",
      "generatedAtUtc must be a current, non-future timestamp inside the 24-hour evidence window.",
    ]));
  });
});
