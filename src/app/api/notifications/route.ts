import { createHash } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { buildNotificationRecord, normalizeNotificationCreatePayload, normalizeNotificationDoc } from "@/lib/notification-contracts";
import { handleApiError } from "@/lib/server/auth";
import { adminDb } from "@/lib/server/firebase-admin";
import { broadcastFCMWithReport } from "@/lib/server/fcm-utils";
import { fetchUnreadNotificationsForUser, isNotificationVisibleToUser } from "@/lib/server/notification-inbox";
import { buildNotModifiedResponse, PRIVATE_REVALIDATE_CACHE_CONTROL, requestMatchesEtag } from "@/lib/http-cache";
import { markNotificationsRuntimeChanged, touchNotificationsRuntime } from "@/lib/server/notification-runtime";
import { HEAVY_READ, STANDARD } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { buildNotFoundResponse } from "@/lib/server/not-found";
import { getErrorMessage, recordRouteWarning } from "@/lib/server/route-diagnostics";
import { sanitizeFirestorePayload } from "@/lib/server/firestore-sanitize";
import { recordRouteRuntimeSample } from "@/lib/server/route-runtime-health";
import { touchUserRuntime } from "@/lib/server/user-runtime";
import { buildBrowserNotificationTag, buildNotificationIdempotencyKey } from "@/lib/notification-identity";
import { buildNotificationQualityMetadata } from "@/lib/notifications/notification-quality-score";
import { isBoundedJsonBodyError, readBoundedJsonBody } from "@/lib/server/bounded-json-body";

const DUPLICATE_NOTIFICATION_WINDOW_MS = 2 * 60 * 1000;
const NOTIFICATION_MUTATION_ID_LIMIT = 100;
const NOTIFICATIONS_BODY_LIMIT_BYTES = 32_768;

function buildNotificationBodyErrorResponse(error: unknown) {
  if (!isBoundedJsonBodyError(error)) {
    return null;
  }

  return NextResponse.json({
    error: error.message,
    errorCode: error.code,
    retryable: false,
  }, { status: error.status });
}

function buildNotificationsEtag(
  notifications: Array<{
    id: string;
    createdAtMs: number;
    readBy: string[];
  }>,
) {
  return `"${createHash("sha1").update(JSON.stringify(
    notifications.map((notification) => [notification.id, notification.createdAtMs, notification.readBy.length]),
  )).digest("hex")}"`;
}

function buildDispatchFingerprint(payload: ReturnType<typeof normalizeNotificationCreatePayload>) {
  if (!payload) {
    return "";
  }

  return createHash("sha1").update(JSON.stringify({
    title: payload.title,
    message: payload.message,
    type: payload.type,
    target: {
      global: payload.target.global,
      userIds: [...payload.target.userIds].sort(),
      excludedUserIds: [...(payload.target.excludedUserIds ?? [])].sort(),
    },
    link: payload.link ?? "",
    dropContext: payload.dropContext ? {
      dropId: payload.dropContext.dropId,
      dropTitle: payload.dropContext.dropTitle,
      previewImageUrl: payload.dropContext.previewImageUrl,
    } : null,
  })).digest("hex");
}

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const finalize = (response: NextResponse, error?: unknown) => {
    void recordRouteRuntimeSample({
      key: "notifications:GET",
      durationMs: Date.now() - startedAt,
      statusCode: response.status,
      errorMessage: error ? getErrorMessage(error) : null,
    });
    return response;
  };

  try {
    const caller = await guardApiRequest(request, {
      routeName: "notifications",
      rateLimit: HEAVY_READ,
      requireTrustedOrigin: true,
      auth: "user",
      scopeToCaller: true,
    });

    if (!adminDb) {
      return finalize(NextResponse.json({ error: "Database not available" }, { status: 500 }));
    }

    const userRuntimeRef = adminDb.collection("runtime").doc(caller?.uid ?? "guest");
    const globalRuntimeRef = adminDb.collection("runtime").doc("notifications");
    
    const [userRuntimeDoc, globalRuntimeDoc] = await adminDb.getAll(userRuntimeRef, globalRuntimeRef);
    
    const userVersion = userRuntimeDoc.data()?.notifications_v ?? -1;
    const globalVersion = globalRuntimeDoc.data()?.version ?? -1;

    const etag = `W/"v2-${userVersion}-${globalVersion}"`;

    if (requestMatchesEtag(request, etag)) {
      return finalize(buildNotModifiedResponse(etag, PRIVATE_REVALIDATE_CACHE_CONTROL));
    }

    const notifications = await fetchUnreadNotificationsForUser(caller?.uid ?? "", {
      targetLimit: 50,
      pageSize: 100,
      maxPages: 5,
    });

    return finalize(NextResponse.json(
      { success: true, notifications },
      {
        headers: {
          ETag: etag,
          "Cache-Control": PRIVATE_REVALIDATE_CACHE_CONTROL,
        },
      },
    ));
  } catch (error) {
    return finalize(handleApiError(error, "Notifications.GET"), error);
  }
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const finalize = (response: NextResponse, error?: unknown) => {
    void recordRouteRuntimeSample({
      key: "notifications:POST",
      durationMs: Date.now() - startedAt,
      statusCode: response.status,
      errorMessage: error ? getErrorMessage(error) : null,
    });
    return response;
  };

  try {
    const caller = await guardApiRequest(request, {
      routeName: "notifications",
      rateLimit: STANDARD,
      requireTrustedOrigin: true,
      auth: "admin",
    });

    if (!adminDb) {
      return finalize(NextResponse.json({ error: "Database not available" }, { status: 500 }));
    }

    const rawBody = await readBoundedJsonBody<unknown>(request, {
      maxBytes: NOTIFICATIONS_BODY_LIMIT_BYTES,
      routeName: "notifications",
    });
    const payload = normalizeNotificationCreatePayload(rawBody);

    if (!payload) {
      return finalize(NextResponse.json({ error: "Invalid notification payload" }, { status: 400 }));
    }

    const dispatchFingerprint = buildDispatchFingerprint(payload);
    const idempotencyKey = buildNotificationIdempotencyKey({
      type: payload.type,
      notificationId: dispatchFingerprint,
      lifecycleEvent: "admin_created",
      audience: payload.target.global ? "global" : "targeted",
    });
    const browserTag = buildBrowserNotificationTag(idempotencyKey);
    const dispatchRef = adminDb.collection("notificationDispatchLocks").doc(dispatchFingerprint);
    const notificationRef = adminDb.collection("notifications").doc();
    const nowMs = Date.now();
    const qualityMetadata = buildNotificationQualityMetadata({
      notificationType: payload.dropContext ? "new_drop" : payload.type,
      nowMs,
      dropUrgency: payload.type === "warning" || payload.type === "error" ? 0.85 : payload.dropContext ? 0.64 : 0.35,
    });

    const result = await adminDb.runTransaction(async (transaction) => {
      const existingDispatch = await transaction.get(dispatchRef);
      const lastDispatchedAtMs = Number(existingDispatch.data()?.dispatchedAtMs ?? 0);
      const isRecentDuplicate = existingDispatch.exists
        && Number.isFinite(lastDispatchedAtMs)
        && nowMs - lastDispatchedAtMs < DUPLICATE_NOTIFICATION_WINDOW_MS;

      if (isRecentDuplicate) {
        return { duplicate: true };
      }

      transaction.set(notificationRef, sanitizeFirestorePayload({
        ...buildNotificationRecord({
          title: payload.title,
          message: payload.message,
          type: payload.type,
        target: payload.target,
        targetUserId: !payload.target.global && payload.target.userIds.length === 1
          ? payload.target.userIds[0] ?? null
          : null,
        recipientUserId: !payload.target.global && payload.target.userIds.length === 1
          ? payload.target.userIds[0] ?? null
          : null,
        link: payload.link,
          dropContext: payload.dropContext ?? null,
          createdAtMs: nowMs,
          readBy: [],
          actorAdminId: caller?.uid ?? null,
          actorType: "admin",
          sourceComponent: "notifications_admin_route",
          sourceEntityType: "notification_dispatch",
          sourceEntityId: dispatchFingerprint,
          surface: "background",
          metadata: {
            dispatchFingerprint,
            idempotencyKey,
            dedupeKey: idempotencyKey,
            browserTag,
            ...qualityMetadata,
          },
        }),
        createdAt: FieldValue.serverTimestamp(),
      }));
      transaction.set(dispatchRef, sanitizeFirestorePayload({
        dispatchedAtMs: nowMs,
        notificationId: notificationRef.id,
        updatedAt: FieldValue.serverTimestamp(),
      }), { merge: true });
      markNotificationsRuntimeChanged(transaction, nowMs);

      return { duplicate: false };
    });

    if (result.duplicate) {
      return finalize(NextResponse.json({ success: true, duplicate: true }));
    }

    if (payload.target.global) {
      try {
        const report = await broadcastFCMWithReport(payload.title, payload.message, payload.link || "/drops", "general", {
          notificationId: notificationRef.id,
          idempotencyKey,
          browserTag,
          lifecycleEvent: "admin_created",
          audience: "global",
        });
        if (!report.ok) {
          recordRouteWarning("notifications", "Notification broadcast failed after persistence", undefined, {
            channel: "notifications",
            detail: {
              routeName: "notifications",
              notificationId: notificationRef.id,
              successCount: report.successCount,
              failureCount: report.failureCount,
              skippedPermissionDeniedCount: report.permissionSkippedCount,
              skippedMissingTokenCount: report.missingTokenSkippedCount,
              skippedPreferencesDisabledCount: report.preferenceSkippedCount,
              skippedQualityThrottleCount: report.throttleSkippedCount,
              duplicatePushPreventedCount: report.duplicatePushPreventedCount,
            },
          });
        }
      } catch (error) {
        recordRouteWarning("notifications", "Notification broadcast failed after persistence", {
          routeName: "notifications",
          notificationId: notificationRef.id,
          targetGlobal: true,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    await touchNotificationsRuntime(nowMs);

    return finalize(NextResponse.json({ success: true, duplicate: false }));
  } catch (error) {
    const bodyErrorResponse = buildNotificationBodyErrorResponse(error);
    if (bodyErrorResponse) {
      return finalize(bodyErrorResponse, error);
    }
    return finalize(handleApiError(error, "Notifications.POST"), error);
  }
}

export async function PUT(request: NextRequest) {
  const startedAt = Date.now();
  const finalize = (response: NextResponse, error?: unknown) => {
    void recordRouteRuntimeSample({
      key: "notifications:PUT",
      durationMs: Date.now() - startedAt,
      statusCode: response.status,
      errorMessage: error ? getErrorMessage(error) : null,
    });
    return response;
  };

  try {
    const caller = await guardApiRequest(request, {
      routeName: "notifications",
      rateLimit: STANDARD,
      requireTrustedOrigin: true,
      auth: "user",
      scopeToCaller: true,
    });

    const payload = await readBoundedJsonBody<{
      notificationId?: unknown;
      notificationIds?: unknown;
    }>(request, {
      maxBytes: NOTIFICATIONS_BODY_LIMIT_BYTES,
      routeName: "notifications",
    });
    const requestedIds = [
      ...(typeof payload.notificationId === "string" ? [payload.notificationId.trim()] : []),
      ...(Array.isArray(payload.notificationIds)
        ? payload.notificationIds
          .filter((entry): entry is string => typeof entry === "string")
          .map((entry) => entry.trim())
        : []),
    ].filter(Boolean);

    if (requestedIds.length === 0) {
      return finalize(NextResponse.json({ error: "Missing notificationId" }, { status: 400 }));
    }
    if (!adminDb) {
      return finalize(NextResponse.json({ error: "Database not available" }, { status: 500 }));
    }

    const uniqueIds = [...new Set(requestedIds)];
    if (uniqueIds.length > NOTIFICATION_MUTATION_ID_LIMIT) {
      return finalize(NextResponse.json({ error: "Too many notification ids" }, { status: 400 }));
    }
    const refs = uniqueIds.map((notificationId) => adminDb.collection("notifications").doc(notificationId));
    const snapshots = refs.length === 1
      // bounded document read: one requested notification id.
      ? [await refs[0].get()]
      : await adminDb.getAll(...refs);
    const batch = adminDb.batch();
    const successfulIds: string[] = [];
    const unavailableIds: string[] = [];

    snapshots.forEach((snapshot, index) => {
      const notificationId = uniqueIds[index] ?? "";
      if (!snapshot.exists) {
        unavailableIds.push(notificationId);
        return;
      }

      const normalized = normalizeNotificationDoc(notificationId, snapshot.data() as Record<string, unknown>);
      if (!normalized) {
        unavailableIds.push(notificationId);
        return;
      }

      const visibleToUser = isNotificationVisibleToUser({
        target: normalized.target,
        createdAtMs: normalized.createdAtMs ?? 0,
        readBy: normalized.readBy,
      }, caller?.uid ?? "");
      if (!visibleToUser) {
        unavailableIds.push(notificationId);
        return;
      }

      successfulIds.push(notificationId);
      if (!normalized.readBy.includes(caller?.uid ?? "")) {
        const readAtMs = Date.now();
        batch.update(snapshot.ref, {
          readBy: FieldValue.arrayUnion(caller?.uid ?? ""),
          readAtMs,
          lastReadBy: caller?.uid ?? "",
        });
      }
    });

    if (successfulIds.length === 0 && uniqueIds.length === 1) {
      return finalize(buildNotFoundResponse("notification", "Notification not available"));
    }

    if (successfulIds.length > 0) {
      await batch.commit();
      await touchUserRuntime(caller?.uid ?? "", {
        notifications: true,
      });
    }

    return finalize(NextResponse.json({
      success: true,
      successCount: successfulIds.length,
      failedCount: unavailableIds.length,
      notificationIds: successfulIds,
    }));
  } catch (error) {
    const bodyErrorResponse = buildNotificationBodyErrorResponse(error);
    if (bodyErrorResponse) {
      return finalize(bodyErrorResponse, error);
    }
    return finalize(handleApiError(error, "Notifications.PUT"), error);
  }
}
