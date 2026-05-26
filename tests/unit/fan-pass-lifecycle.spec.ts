import { describe, expect, it } from "vitest";

import {
  FAN_PASS_DEBUG_LANE,
  FAN_PASS_LIFECYCLE_EVENTS,
  FAN_PASS_LIFECYCLE_STATES,
  FAN_PASS_UNLOCKED_FEATURES,
  buildFanPassLifecycleDebugLane,
  validateFanPassLifecycleReportShape,
} from "@/lib/fan-pass/fan-pass-lifecycle-contract";
import {
  buildFanPassTelemetry,
  classifyFanPassFailure,
  explainFanPassAccess,
  resolveFanPassAccess,
  resolveFanPassVisibility,
} from "@/lib/fan-pass/fan-pass-access-resolver";
import {
  buildFanPassLifecycleReport,
  classifyFanPassLifecycleDirtyFile,
  validateFanPassLifecycleReport,
} from "../../scripts/agent/validate-fan-pass-lifecycle";

describe("fan pass lifecycle contract", () => {
  it("defines the canonical Fan Pass lifecycle states and event spine", () => {
    expect(FAN_PASS_LIFECYCLE_STATES).toEqual([
      "unavailable",
      "not_configured",
      "visible",
      "viewed",
      "purchase_attempted",
      "purchase_succeeded",
      "purchase_failed",
      "active",
      "expired",
      "cancelled",
      "refunded",
      "access_granted",
      "access_denied",
      "unknown_legacy",
    ]);
    expect(FAN_PASS_LIFECYCLE_EVENTS).toEqual([
      "fan_pass_surface_viewed",
      "fan_pass_cta_clicked",
      "fan_pass_purchase_attempted",
      "fan_pass_purchase_succeeded",
      "fan_pass_purchase_failed",
      "fan_pass_access_granted",
      "fan_pass_access_denied",
      "fan_pass_cancelled",
      "fan_pass_expired",
    ]);
    expect(FAN_PASS_UNLOCKED_FEATURES).toEqual(expect.arrayContaining([
      "chat_free_bypass",
      "subscriber_drop_access",
      "fan_pass_notifications",
      "profile_timeline_visibility",
    ]));
  });

  it("requires creator settings source before Fan Pass is visible", () => {
    const missingSource = resolveFanPassVisibility({
      creatorId: "creator_1",
      enabledByCreator: true,
      price: 250,
      creatorSettingsSource: "missing",
    });
    const visible = resolveFanPassVisibility({
      creatorId: "creator_1",
      enabledByCreator: true,
      price: 250,
      creatorSettingsSource: "creator_settings",
    });

    expect(missingSource.state).toBe("not_configured");
    expect(missingSource.visible).toBe(false);
    expect(missingSource.debugReason).toContain("creator settings source");
    expect(visible.state).toBe("visible");
    expect(visible.visible).toBe(true);
    expect(visible.sourceTruth).toBe("creator_settings");
  });

  it("resolves active access with creator, user, and source truth", () => {
    const access = resolveFanPassAccess({
      creatorId: "creator_1",
      fanUserId: "user_1",
      fanPassId: "user_1__creator_1",
      enabledByCreator: true,
      activeForUser: true,
      subscriptionStatus: "active",
      sourceTruth: "creator_subscription",
      price: 250,
      accessStartAt: 1,
      accessEndAt: Date.now() + 100_000,
      chatFreeForSubscribers: true,
      subscriberDropAccessEnabled: true,
      fanPassNotificationsEnabled: true,
      profileTimelineVisible: true,
    });

    expect(access.state).toBe("access_granted");
    expect(access.activeForUser).toBe(true);
    expect(access.creatorId).toBe("creator_1");
    expect(access.fanUserId).toBe("user_1");
    expect(access.sourceTruth).toBe("creator_subscription");
    expect(access.chatBypassStatus).toBe("granted");
    expect(access.unlockedFeatures).toEqual(expect.arrayContaining([...FAN_PASS_UNLOCKED_FEATURES]));
    expect(explainFanPassAccess(access).humanReason).toContain("Fan Pass is active");
  });

  it("returns human and debug reasons for denied access", () => {
    const denied = resolveFanPassAccess({
      creatorId: "creator_1",
      fanUserId: "user_1",
      enabledByCreator: true,
      activeForUser: false,
      subscriptionStatus: "missing",
      sourceTruth: "creator_subscription",
      price: 250,
    });

    expect(denied.state).toBe("access_denied");
    expect(denied.activeForUser).toBe(false);
    expect(denied.unlockedFeatures).toEqual([]);
    expect(explainFanPassAccess(denied)).toMatchObject({
      humanReason: expect.stringContaining("Start Fan Pass"),
      debugReason: expect.stringContaining("missing"),
    });
    expect(classifyFanPassFailure(denied)).toBe("subscription_missing");
  });

  it("builds safe telemetry without provider or payment internals", () => {
    const payload = buildFanPassTelemetry({
      eventName: "fan_pass_purchase_attempted",
      creatorId: "creator_1",
      fanUserId: "user_1",
      fanPassId: "user_1__creator_1",
      state: "purchase_attempted",
      sourceTruth: "creator_settings",
      price: 250,
      surface: "creator_profile",
      route: "/creators/kandy",
      failureReason: "none",
    });

    expect(payload).toMatchObject({
      eventName: "fan_pass_purchase_attempted",
      featureId: "fan_pass",
      creatorId: "creator_1",
      fanUserIdPresent: true,
      sourceTruth: "creator_settings",
      debugLane: FAN_PASS_DEBUG_LANE,
      paymentRuntimeTouched: false,
      gumdropMathTouched: false,
    });
    expect(JSON.stringify(payload)).not.toContain("paypal");
    expect(JSON.stringify(payload)).not.toContain("captureId");
    expect(JSON.stringify(payload)).not.toContain("walletBalanceAfter");
  });

  it("reports lifecycle, telemetry, debug, and score lock evidence", () => {
    const report = buildFanPassLifecycleReport({
      currentHead: "test-head",
      dirtyFiles: [],
      scoreBefore: 77.83,
      scoreAfter: 77.83,
    });

    expect(report.lifecycleStatus).toBe("pass");
    expect(report.accessResolverStatus).toBe("pass");
    expect(report.telemetryStatus).toBe("pass");
    expect(report.debugVisibilityStatus).toBe("pass");
    expect(report.paymentRuntimeStatus).toBe("unchanged");
    expect(report.gumdropMathStatus).toBe("unchanged");
    expect(report.eventSpine).toEqual(FAN_PASS_LIFECYCLE_EVENTS);
    expect(report.debugLane.label).toBe(FAN_PASS_DEBUG_LANE);
    expect(report.scoreDimensions).toEqual(expect.arrayContaining(["sourceHealth", "runtimeHealth", "evidenceCompleteness", "regressionRisk"]));
    expect(validateFanPassLifecycleReportShape(report.contractShape)).toEqual([]);
    expect(validateFanPassLifecycleReport(report)).toEqual([]);
  });

  it("classifies scoped files and blocks payment or GumDrop runtime churn", () => {
    expect(classifyFanPassLifecycleDirtyFile("src/lib/fan-pass/fan-pass-lifecycle-contract.ts")).toBe("current_source_change");
    expect(classifyFanPassLifecycleDirtyFile("scripts/agent/validate-fan-pass-lifecycle.ts")).toBe("validator_artifact_expected");
    expect(classifyFanPassLifecycleDirtyFile("agent/state/fan-pass-lifecycle.generated.json")).toBe("current_generated_artifact_to_commit");
    expect(classifyFanPassLifecycleDirtyFile("src/app/api/paypal/capture/route.ts")).toBe("unsafe_unknown");
    expect(classifyFanPassLifecycleDirtyFile("src/lib/gumdrop-ledger.ts")).toBe("unsafe_unknown");

    const report = buildFanPassLifecycleReport({
      currentHead: "test-head",
      dirtyFiles: ["src/lib/gumdrop-ledger.ts"],
    });
    expect(validateFanPassLifecycleReport(report)).toContain("src/lib/gumdrop-ledger.ts is unclassified for Fan Pass lifecycle.");
  });

  it("summarizes the Fan Pass lifecycle debug lane", () => {
    expect(buildFanPassLifecycleDebugLane({
      configuredCreators: 3,
      viewedCount: 5,
      attemptedCount: 2,
      succeededCount: 1,
      failedCount: 1,
      accessMismatchCount: 0,
      chatBypassMismatchCount: 0,
      notConfiguredSurfaceCount: 1,
    })).toMatchObject({
      label: FAN_PASS_DEBUG_LANE,
      configuredCreators: 3,
      viewedCount: 5,
      attemptedCount: 2,
      succeededCount: 1,
      failedCount: 1,
      notConfiguredSurfaceCount: 1,
      rawPaymentProviderDumpDefault: false,
    });
  });
});
