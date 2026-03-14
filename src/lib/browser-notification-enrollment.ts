"use client";

import type { UserProfile } from "@/types/db";
import { authFetch } from "@/lib/authFetch";
import { requestBrowserNotificationAccess } from "@/lib/firebase-messaging";

export type BrowserNotificationEnrollmentResult =
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

export async function enableBrowserNotifications(userProfile: UserProfile): Promise<BrowserNotificationEnrollmentResult> {
  const result = await requestBrowserNotificationAccess();
  if (!result.granted) {
    return {
      status: "not_granted",
      needsStandaloneInstall: result.state.needsStandaloneInstall,
    };
  }

  const response = await authFetch("/api/user/profile", {
    method: "PUT",
    body: JSON.stringify({
      notificationSettings: buildNotificationSettings(userProfile),
      browserPushToken: result.token,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
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
