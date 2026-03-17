import { createHash } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { normalizeNotificationCreatePayload, normalizeNotificationDoc } from "@/lib/notification-contracts";
import { verifyAuth, verifyAdmin, handleApiError } from "@/lib/server/auth";
import { adminDb } from "@/lib/server/firebase-admin";
import { broadcastFCM } from "@/lib/server/fcm-utils";
import { fetchUnreadNotificationsForUser, isNotificationVisibleToUser } from "@/lib/server/notification-inbox";
import { checkRateLimit, HEAVY_READ, STANDARD } from "@/lib/server/rate-limit";
import { hasTrustedSiteOrigin } from "@/lib/server/request-origin";

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

export async function GET(request: NextRequest) {
  try {
    const caller = await verifyAuth(request);
    await checkRateLimit(request, "notifications", HEAVY_READ, { scopeId: caller.uid });

    if (!adminDb) {
      return NextResponse.json({ error: "Database not available" }, { status: 500 });
    }

    const notifications = await fetchUnreadNotificationsForUser(caller.uid, {
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
    if (!hasTrustedSiteOrigin(request)) {
      return NextResponse.json({ error: "Untrusted origin" }, { status: 403 });
    }
    await checkRateLimit(request, "notifications", STANDARD);
    await verifyAdmin(request);

    if (!adminDb) {
      return NextResponse.json({ error: "Database not available" }, { status: 500 });
    }

    const payload = normalizeNotificationCreatePayload(await request.json());

    if (!payload) {
      return NextResponse.json({ error: "Invalid notification payload" }, { status: 400 });
    }

    await adminDb.collection("notifications").add({
      title: payload.title,
      message: payload.message,
      type: payload.type,
      target: payload.target,
      link: payload.link || null,
      dropContext: payload.dropContext || null,
      createdAt: FieldValue.serverTimestamp(),
      readBy: [],
    });

    if (payload.target.global) {
      await broadcastFCM(payload.title, payload.message, payload.link || "/drops");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "Notifications.POST");
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!hasTrustedSiteOrigin(request)) {
      return NextResponse.json({ error: "Untrusted origin" }, { status: 403 });
    }
    const caller = await verifyAuth(request);
    await checkRateLimit(request, "notifications", STANDARD, { scopeId: caller.uid });

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
    }, caller.uid);
    if (!visibleToUser) {
      return NextResponse.json({ error: "Notification not available" }, { status: 404 });
    }

    await ref.update({ readBy: FieldValue.arrayUnion(caller.uid) });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "Notifications.PUT");
  }
}
