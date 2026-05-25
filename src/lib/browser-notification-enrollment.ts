"use client";

import type { UserProfile } from "@/types/db";
import { authFetch } from "@/lib/authFetch";
import { requestBrowserNotificationAccess } from "@/lib/firebase-messaging";
import { trackEvent } from "@/lib/telemetry";
import { trackPushTokenLifecycleEvent } from "@/lib/notifications/push-token-telemetry";
import {
  PUSH_TOKEN_DEVICE_ID_PREFIX,
  redactPushToken,
  resolvePushDeviceId,
} from "@/lib/notifications/push-token-contract";

type BrowserNotificationEnrollmentResult =
  | { status: "enabled"; messagingSupported: boolean }
  | { status: "not_granted"; needsStandaloneInstall: boolean }
  | { status: "failed"; message: string };

function buildNotificationSettings(userProfile: UserProfile) {
  return {
    inAppEnabled: userProfile.notificationSettings?.inAppEnabled !== false,
    browserPushEnabled: true,
    newDropAlerts: userProfile.notificationSettings?.newDropAlerts !== false,
    expiringSoonAlerts: userProfile.notificationSettings?.expiringSoonAlerts !== false,
  };
}

function getBrowserPushDeviceId() {
  if (typeof window === "undefined") return resolvePushDeviceId("server");

  const storageKey = `${PUSH_TOKEN_DEVICE_ID_PREFIX}:id`;
  try {
    const existing = window.localStorage.getItem(storageKey);
    if (existing) return resolvePushDeviceId(existing);
    const generated = `${PUSH_TOKEN_DEVICE_ID_PREFIX}:${(() => {
      if (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.randomUUID === "function") {
        return globalThis.crypto.randomUUID();
      }
      if (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.getRandomValues === "function") {
        return Array.from(globalThis.crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
      }
      throw new Error("Secure random generation is not supported in this environment");
    })()}`;
    window.localStorage.setItem(storageKey, generated);
    return resolvePushDeviceId(generated);
  } catch {
    return resolvePushDeviceId(`${PUSH_TOKEN_DEVICE_ID_PREFIX}:storage_unavailable`);
  }
}

export async function enableBrowserNotifications(userProfile: UserProfile): Promise<BrowserNotificationEnrollmentResult> {
  const result = await requestBrowserNotificationAccess();
  if (!result.granted) {
    return {
      status: "not_granted",
      needsStandaloneInstall: result.state.needsStandaloneInstall,
    };
  }

  if (!result.state.messagingSupported) {
    return {
      status: "failed",
      message: "Push notifications are not supported on this device yet.",
    };
  }

  if (!result.token) {
    return {
      status: "failed",
      message: "We could not finish setting up push notifications. Please try again.",
    };
  }

  const deviceId = getBrowserPushDeviceId();
  const browser = typeof navigator === "undefined" ? "unknown" : navigator.userAgent;
  const platform = typeof navigator === "undefined" ? "unknown" : navigator.platform;
  const route = typeof window === "undefined" ? "/dashboard" : window.location.pathname;
  trackPushTokenLifecycleEvent({
    eventName: "push_device_scope_resolved",
    tokenStatus: "registering",
    tokenScope: "user_device",
    permissionState: "granted",
    deviceId,
    browser,
    platform,
    standalone: result.state.context === "pwa",
    tokenFingerprint: null,
    tokenRedacted: redactPushToken(result.token),
    failureReason: null,
    route,
    sourceComponent: "browser-notification-enrollment",
  }, trackEvent);
  trackPushTokenLifecycleEvent({
    eventName: "push_token_registration_started",
    tokenStatus: "registering",
    tokenScope: "user_device",
    permissionState: "granted",
    deviceId,
    browser,
    platform,
    standalone: result.state.context === "pwa",
    tokenFingerprint: null,
    tokenRedacted: redactPushToken(result.token),
    failureReason: null,
    route,
    sourceComponent: "browser-notification-enrollment",
  }, trackEvent);

  const response = await authFetch("/api/notifications/push-token", {
    method: "POST",
    body: JSON.stringify({
      token: result.token,
      deviceId,
      permissionState: result.state.permission,
      browser,
      platform,
      standalone: result.state.context === "pwa",
      notificationSettings: buildNotificationSettings(userProfile),
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    trackPushTokenLifecycleEvent({
      eventName: "push_token_registration_failed",
      tokenStatus: "failed",
      tokenScope: "user_device",
      permissionState: "granted",
      deviceId,
      browser,
      platform,
      standalone: result.state.context === "pwa",
      tokenFingerprint: null,
      tokenRedacted: redactPushToken(result.token),
      failureReason: typeof payload?.failureReason === "string" ? payload.failureReason : "push_token_route_failed",
      route,
      sourceComponent: "browser-notification-enrollment",
    }, trackEvent);
    return {
      status: "failed",
      message: typeof payload?.error === "string" ? payload.error : "We could not enable notifications right now.",
    };
  }

  return {
    status: "enabled",
    messagingSupported: result.state.messagingSupported,
  };
}
