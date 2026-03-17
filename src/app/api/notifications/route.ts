import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { verifyAuth, verifyAdmin, handleApiError } from "@/lib/server/auth";
import { FieldValue } from "firebase-admin/firestore";
import { normalizeNotificationCreatePayload, normalizeNotificationDoc } from "@/lib/notification-contracts";
import { broadcastFCM } from "@/lib/server/fcm-utils";
import { checkRateLimit, STANDARD } from "@/lib/server/rate-limit";

function toTimestampNumber(value: unknown) {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    if (
        value
        && typeof value === "object"
        && "toMillis" in value
        && typeof (value as { toMillis: () => number }).toMillis === "function"
    ) {
        return (value as { toMillis: () => number }).toMillis();
    }

    return 0;
}

export async function GET(request: NextRequest) {
    try {
        await checkRateLimit(request, "notifications", STANDARD);
        const caller = await verifyAuth(request);

        if (!adminDb) {
            return NextResponse.json({ error: "Database not available" }, { status: 500 });
        }

        const snapshot = await adminDb.collection("notifications").orderBy("createdAt", "desc").limit(50).get();
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

        const notifications = snapshot.docs.flatMap((doc) => {
            const raw = doc.data() as Record<string, unknown>;
            const normalized = normalizeNotificationDoc(doc.id, raw);
            if (!normalized) {
                return [];
            }
            const createdAtMs = toTimestampNumber(normalized.createdAt);

            if (normalized.target.excludedUserIds?.includes(caller.uid)) {
                return [];
            }

            if (createdAtMs && createdAtMs < sevenDaysAgo) {
                return [];
            }

            if (normalized.readBy.includes(caller.uid)) {
                return [];
            }

            if (!(normalized.target.global === true || normalized.target.userIds.includes(caller.uid))) {
                return [];
            }

            return [{
                ...normalized,
                createdAtMs,
            }];
        });

        return NextResponse.json({ success: true, notifications });
    } catch (error) {
        return handleApiError(error, "Notifications.GET");
    }
}

// POST — Send notification (admin-only)
export async function POST(request: NextRequest) {
    try {
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
            // Push custom FCM message linking back to Drops library
            await broadcastFCM(payload.title, payload.message, payload.link || "/drops");
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error, "Notifications.POST");
    }
}

// PUT — Mark notification as read
export async function PUT(request: NextRequest) {
    try {
        await checkRateLimit(request, "notifications", STANDARD);
        const caller = await verifyAuth(request);

        const { notificationId } = await request.json();

        if (!notificationId) {
            return NextResponse.json({ error: "Missing notificationId" }, { status: 400 });
        }
        if (!adminDb) {
            return NextResponse.json({ error: "Database not available" }, { status: 500 });
        }

        // Use verified UID from token
        const ref = adminDb.collection("notifications").doc(notificationId);
        await ref.update({ readBy: FieldValue.arrayUnion(caller.uid) });

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error, "Notifications.PUT");
    }
}
