import { describe, expect, it } from "vitest";

import {
  PUSH_TOKEN_TELEMETRY_EVENTS,
  buildPushTokenDebugLane,
  buildPushTokenRegistrationPayload,
  classifyPushTokenRegistration,
  redactPushToken,
  resolvePushDeviceId,
} from "@/lib/notifications/push-token-contract";
import {
  buildPushTokenTelemetryEnvelope,
} from "@/lib/notifications/push-token-telemetry";

describe("push token registration", () => {
  it("classifies registered user-device tokens without exposing raw token values", () => {
    const payload = buildPushTokenRegistrationPayload({
      token: "fcm-token-example-value-that-is-long-enough-for-validation",
      deviceId: "Kandy Drops Desktop",
      permissionState: "granted",
      browser: "Chrome",
      platform: "Windows",
      standalone: false,
      nowIso: "2026-05-24T07:00:00.000Z",
    });

    const status = classifyPushTokenRegistration(payload);

    expect(status.tokenStatus).toBe("registered");
    expect(status.tokenScope).toBe("user_device");
    expect(status.safeToTargetNotifications).toBe(true);
    expect(status.tokenRedacted).not.toContain("fcm-token-example");
    expect(redactPushToken(payload.token)).toBe(status.tokenRedacted);
  });

  it("requires authenticated user scope and rejects unsafe guest or unknown token binding", () => {
    const payload = buildPushTokenRegistrationPayload({
      token: "fcm-token-example-value-that-is-long-enough-for-validation",
      permissionState: "granted",
      userAuthenticated: false,
      nowIso: "2026-05-24T07:00:00.000Z",
    });

    const status = classifyPushTokenRegistration(payload);

    expect(status.tokenStatus).toBe("failed");
    expect(status.tokenScope).toBe("unknown");
    expect(status.safeToTargetNotifications).toBe(false);
    expect(status.failureReason).toBe("authenticated_user_required");
  });

  it("maps token lifecycle telemetry into canonical notification envelopes", () => {
    const envelope = buildPushTokenTelemetryEnvelope({
      eventName: "push_token_registered",
      tokenStatus: "registered",
      tokenScope: "user_device",
      permissionState: "granted",
      deviceId: resolvePushDeviceId("browser-device"),
      browser: "Chrome",
      platform: "Windows",
      standalone: false,
      tokenFingerprint: "fingerprint_123",
      tokenRedacted: "[push-token:abc123]",
      failureReason: null,
      route: "/api/notifications/push-token",
      sourceComponent: "push-token-route",
    });

    expect(PUSH_TOKEN_TELEMETRY_EVENTS).toContain("push_token_registered");
    expect(envelope.eventName).toBe("push_token_registered");
    expect(envelope.featureId).toBe("notifications");
    expect(envelope.materializerLane).toBe("notification_materializer");
    expect(envelope.debugVisibility).toBe("debug_visible");
    expect(envelope.metadata.pushCredentialRedacted).toBe("[push-token:abc123]");
    expect(JSON.stringify(envelope.metadata)).not.toContain("fcm-token");
  });

  it("summarizes push token health without raw token details", () => {
    const lane = buildPushTokenDebugLane({
      registeredDeviceCount: 2,
      failedRegistrationCount: 1,
      unsupportedBrowserCount: 1,
      staleTokenCount: 0,
      rawTokenExposureCount: 0,
      telemetryMapped: true,
    });

    expect(lane.lane).toBe("Push token health");
    expect(lane.status).toBe("degraded");
    expect(lane.rawDetailsCollapsedByDefault).toBe(true);
    expect(JSON.stringify(lane)).not.toContain("fcm-token");
  });
});
