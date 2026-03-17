import { createHash } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { normalizeNotificationCreatePayload, normalizeNotificationDoc } from "@/lib/notification-contracts";
import { handleApiError } from "@/lib/server/auth";
import { adminDb } from "@/lib/server/firebase-admin";
import { broadcastFCM } from "@/lib/server/fcm-utils";
import { fetchUnreadNotificationsForUser, isNotificationVisibleToUser } from "@/lib/server/notification-inbox";
import { HEAVY_READ, STANDARD } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";

const DUPLICATE_NOTIFICATION_WINDOW_MS = 2 * 60 * 1000;

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
  try {
    const caller = await guardApiRequest(request, {
      routeName: "notifications",
      rateLimit: HEAVY_READ,
      requireTrustedOrigin: true,
      auth: "user",
      scopeToCaller: true,
    });

    if (!adminDb) {
      return NextResponse.json({ error: "Database not available" }, { status: 500 });
    }

    const notifications = await fetchUnreadNotificationsForUser(caller?.uid ?? "", {
      targetLimit: 50,
      pageSize: 100,
      maxPages: 5,
    });
    const etag = buildNotificationsEtag(notifications);

    if (request.headers.get("if-none-match") === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          "Cache-Control": "private, no-cache, must-revalidate",
        },
      });
    }

    return NextResponse.json(
      { success: true, notifications },
      {
        headers: {
          ETag: etag,
          "Cache-Control": "private, no-cache, must-revalidate",
        },
      },
    );
  } catch (error) {
    return handleApiError(error, "Notifications.GET");
  }
}

export async function POST(request: NextRequest) {
  try {
    await guardApiRequest(request, {
      routeName: "notifications",
      rateLimit: STANDARD,
      requireTrustedOrigin: true,
      auth: "admin",
    });

    if (!adminDb) {
      return NextResponse.json({ error: "Database not available" }, { status: 500 });
    }

    const payload = normalizeNotificationCreatePayload(await request.json());

    if (!payload) {
      return NextResponse.json({ error: "Invalid notification payload" }, { status: 400 });
    }

    const dispatchFingerprint = buildDispatchFingerprint(payload);
    const dispatchRef = adminDb.collection("notificationDispatchLocks").doc(dispatchFingerprint);
    const notificationRef = adminDb.collection("notifications").doc();
    const nowMs = Date.now();

    const result = await adminDb.runTransaction(async (transaction) => {
      const existingDispatch = await transaction.get(dispatchRef);
      const lastDispatchedAtMs = Number(existingDispatch.data()?.dispatchedAtMs ?? 0);
      const isRecentDuplicate = existingDispatch.exists
        && Number.isFinite(lastDispatchedAtMs)
        && nowMs - lastDispatchedAtMs < DUPLICATE_NOTIFICATION_WINDOW_MS;

      if (isRecentDuplicate) {
        return { duplicate: true };
      }

      transaction.set(notificationRef, {
        title: payload.title,
        message: payload.message,
        type: payload.type,
        target: payload.target,
        link: payload.link || null,
        dropContext: payload.dropContext || null,
        createdAt: FieldValue.serverTimestamp(),
        readBy: [],
        dispatchFingerprint,
      });
      transaction.set(dispatchRef, {
        dispatchedAtMs: nowMs,
        notificationId: notificationRef.id,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      return { duplicate: false };
    });

    if (result.duplicate) {
      return NextResponse.json({ success: true, duplicate: true });
    }

    if (payload.target.global) {
      try {
        await broadcastFCM(payload.title, payload.message, payload.link || "/drops");
      } catch (error) {
        console.error("Notification broadcast failed after notification was recorded:", error);
      }
    }

    return NextResponse.json({ success: true, duplicate: false });
  } catch (error) {
    return handleApiError(error, "Notifications.POST");
  }
}

export async function PUT(request: NextRequest) {
  try {
    const caller = await guardApiRequest(request, {
      routeName: "notifications",
      rateLimit: STANDARD,
      requireTrustedOrigin: true,
      auth: "user",
      scopeToCaller: true,
    });

    const { notificationId } = await request.json();

    if (!notificationId) {
      return NextResponse.json({ error: "Missing notificationId" }, { status: 400 });
    }
    if (!adminDb) {
      return NextResponse.json({ error: "Database not available" }, { status: 500 });
    }

    const ref = adminDb.collection("notifications").doc(notificationId);
    const snapshot = await ref.get();
    if (!snapshot.exists) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    const normalized = normalizeNotificationDoc(notificationId, snapshot.data() as Record<string, unknown>);
    if (!normalized) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    const createdAtMs = normalized.createdAt?.toMillis() ?? 0;
    const visibleToUser = isNotificationVisibleToUser({
      target: normalized.target,
      createdAtMs,
      readBy: normalized.readBy,
    }, caller?.uid ?? "");
    if (!visibleToUser) {
      return NextResponse.json({ error: "Notification not available" }, { status: 404 });
    }

    await ref.update({ readBy: FieldValue.arrayUnion(caller?.uid ?? "") });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "Notifications.PUT");
  }
}
