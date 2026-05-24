import { createHash } from "node:crypto";

import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";

import { adminDb } from "@/lib/server/firebase-admin";
import { handleApiError } from "@/lib/server/auth";
import { STANDARD } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { trackServerEvent } from "@/lib/server/analytics";
import {
  buildPushTokenRegistrationPayload,
  classifyPushTokenRegistration,
  normalizePushToken,
  redactPushToken,
  resolvePushDeviceId,
  type PushTokenLifecycleEvent,
  type PushTokenScope,
  type PushTokenStatus,
} from "@/lib/notifications/push-token-contract";

export const runtime = "nodejs";

function tokenFingerprint(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function fingerprintPrefix(fingerprint: string) {
  return fingerprint.slice(0, 16);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readBoolean(value: unknown) {
  return value === true;
}

function containsForbiddenUserBinding(payload: Record<string, unknown>) {
  return typeof payload.userId === "string"
    || typeof payload.uid === "string"
    || typeof payload.actorUserId === "string"
    || typeof payload.targetUserId === "string";
}

async function trackPushTokenServerEvent(input: {
  eventName: PushTokenLifecycleEvent;
  userId: string;
  tokenStatus: PushTokenStatus;
  tokenScope: PushTokenScope;
  permissionState: string;
  deviceId: string;
  browser: string;
  platform: string;
  standalone: boolean;
  tokenFingerprint: string | null;
  tokenRedacted: string | null;
  failureReason: string | null;
}) {
  await trackServerEvent(input.eventName, {
    source: "push_token_route",
    route: "/api/notifications/push-token",
    token_status: input.tokenStatus,
    token_scope: input.tokenScope,
    permission_state: input.permissionState,
    device_id: input.deviceId,
    browser: input.browser,
    platform: input.platform,
    standalone: input.standalone,
    token_fingerprint_prefix: input.tokenFingerprint ? fingerprintPrefix(input.tokenFingerprint) : null,
    token_redacted: input.tokenRedacted,
    failure_reason: input.failureReason,
  }, input.userId);
}

export async function POST(request: NextRequest) {
  try {
    const caller = await guardApiRequest(request, {
      routeName: "notifications/push-token",
      rateLimit: STANDARD,
      requireTrustedOrigin: true,
      auth: "user",
      scopeToCaller: true,
    });

    if (!caller) {
      return NextResponse.json({ error: "Sign in to enable browser notifications." }, { status: 401 });
    }
    if (!adminDb) {
      return NextResponse.json({ error: "Notification registration is unavailable right now." }, { status: 500 });
    }

    const rawPayload: unknown = await request.json().catch(() => ({}));
    if (!isRecord(rawPayload)) {
      return NextResponse.json({ error: "Invalid push token registration request." }, { status: 400 });
    }
    if (containsForbiddenUserBinding(rawPayload)) {
      return NextResponse.json({ error: "Push token registration cannot bind an arbitrary user." }, { status: 400 });
    }

    const payload = buildPushTokenRegistrationPayload({
      token: readString(rawPayload.token),
      deviceId: readString(rawPayload.deviceId),
      permissionState: rawPayload.permissionState === "granted" ? "granted" : "unknown",
      browser: readString(rawPayload.browser),
      platform: readString(rawPayload.platform),
      standalone: readBoolean(rawPayload.standalone),
      userAuthenticated: true,
      nowIso: new Date().toISOString(),
    });
    const classification = classifyPushTokenRegistration(payload);

    if (!classification.safeToTargetNotifications || !payload.token) {
      await trackPushTokenServerEvent({
        eventName: "push_token_registration_failed",
        userId: caller.uid,
        tokenStatus: classification.tokenStatus,
        tokenScope: classification.tokenScope,
        permissionState: classification.permissionState,
        deviceId: classification.deviceId,
        browser: payload.browser,
        platform: payload.platform,
        standalone: payload.standalone,
        tokenFingerprint: null,
        tokenRedacted: classification.tokenRedacted,
        failureReason: classification.failureReason,
      });
      return NextResponse.json({
        error: "We could not finish setting up push notifications.",
        tokenStatus: classification.tokenStatus,
        tokenScope: classification.tokenScope,
        failureReason: classification.failureReason,
        tokenRedacted: classification.tokenRedacted,
      }, { status: 400 });
    }

    const fingerprint = tokenFingerprint(payload.token);
    const tokenRef = adminDb.collection("users").doc(caller.uid).collection("pushTokens").doc(fingerprint);
    const existingToken = await tokenRef.get();
    const tokenStatus: PushTokenStatus = existingToken.exists ? "refreshed" : "registered";
    const now = FieldValue.serverTimestamp();

    await adminDb.collection("users").doc(caller.uid).set({
      fcmTokens: FieldValue.arrayUnion(payload.token),
      "notificationSettings.browserPushEnabled": true,
      "notificationSettings.inAppEnabled": true,
      "notificationSettings.newDropAlerts": true,
      "notificationSettings.expiringSoonAlerts": true,
    }, { merge: true });
    await tokenRef.set({
      deviceId: payload.deviceId,
      tokenFingerprint: fingerprint,
      tokenRedacted: redactPushToken(payload.token),
      tokenStatus,
      tokenScope: "user_device",
      safeToTargetNotifications: true,
      browser: payload.browser,
      platform: payload.platform,
      standalone: payload.standalone,
      permissionState: payload.permissionState,
      storagePolicy: "raw_token_user_private_array_fingerprint_metadata",
      redactionPolicy: "never_log_or_debug_raw_token",
      updatedAt: now,
      ...(existingToken.exists ? { lastRefreshAt: now } : { lastRegisteredAt: now }),
    }, { merge: true });

    await trackPushTokenServerEvent({
      eventName: tokenStatus === "refreshed" ? "push_token_refreshed" : "push_token_registered",
      userId: caller.uid,
      tokenStatus,
      tokenScope: "user_device",
      permissionState: payload.permissionState,
      deviceId: payload.deviceId,
      browser: payload.browser,
      platform: payload.platform,
      standalone: payload.standalone,
      tokenFingerprint: fingerprint,
      tokenRedacted: redactPushToken(payload.token),
      failureReason: null,
    });

    return NextResponse.json({
      success: true,
      tokenStatus,
      tokenScope: "user_device",
      safeToTargetNotifications: true,
      deviceId: payload.deviceId,
      tokenFingerprint: fingerprintPrefix(fingerprint),
      tokenRedacted: redactPushToken(payload.token),
    });
  } catch (error) {
    return handleApiError(error, "NotificationsPushToken.POST");
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const caller = await guardApiRequest(request, {
      routeName: "notifications/push-token",
      rateLimit: STANDARD,
      requireTrustedOrigin: true,
      auth: "user",
      scopeToCaller: true,
    });

    if (!caller) {
      return NextResponse.json({ error: "Sign in to update browser notification tokens." }, { status: 401 });
    }
    if (!adminDb) {
      return NextResponse.json({ error: "Notification registration is unavailable right now." }, { status: 500 });
    }

    const rawPayload: unknown = await request.json().catch(() => ({}));
    if (!isRecord(rawPayload)) {
      return NextResponse.json({ error: "Invalid push token revocation request." }, { status: 400 });
    }
    if (containsForbiddenUserBinding(rawPayload)) {
      return NextResponse.json({ error: "Push token revocation cannot bind an arbitrary user." }, { status: 400 });
    }

    const token = normalizePushToken(rawPayload.token);
    const fingerprint = token ? tokenFingerprint(token) : readString(rawPayload.tokenFingerprint);
    if (!fingerprint || !/^[a-f0-9]{64}$/iu.test(fingerprint)) {
      return NextResponse.json({ error: "A valid push token fingerprint is required." }, { status: 400 });
    }

    const deviceId = resolvePushDeviceId(rawPayload.deviceId);
    const tokenRef = adminDb.collection("users").doc(caller.uid).collection("pushTokens").doc(fingerprint);
    await tokenRef.set({
      deviceId,
      tokenFingerprint: fingerprint,
      tokenRedacted: token ? redactPushToken(token) : "[push-token:redacted]",
      tokenStatus: "revoked",
      tokenScope: "user_device",
      safeToTargetNotifications: false,
      revokedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      redactionPolicy: "never_log_or_debug_raw_token",
    }, { merge: true });
    if (token) {
      await adminDb.collection("users").doc(caller.uid).update({
        fcmTokens: FieldValue.arrayRemove(token),
      });
    }

    await trackPushTokenServerEvent({
      eventName: "push_token_revoked",
      userId: caller.uid,
      tokenStatus: "revoked",
      tokenScope: "user_device",
      permissionState: "granted",
      deviceId,
      browser: readString(rawPayload.browser) || "unknown",
      platform: readString(rawPayload.platform) || "unknown",
      standalone: readBoolean(rawPayload.standalone),
      tokenFingerprint: fingerprint,
      tokenRedacted: token ? redactPushToken(token) : "[push-token:redacted]",
      failureReason: null,
    });

    return NextResponse.json({
      success: true,
      tokenStatus: "revoked",
      tokenScope: "user_device",
      safeToTargetNotifications: false,
      tokenFingerprint: fingerprintPrefix(fingerprint),
    });
  } catch (error) {
    return handleApiError(error, "NotificationsPushToken.DELETE");
  }
}
