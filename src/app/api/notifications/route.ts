import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { verifyAuth, verifyAdmin, AuthError, handleApiError } from "@/lib/server/auth";
import { FieldValue } from "firebase-admin/firestore";

// POST — Send notification (admin-only)
export async function POST(request: NextRequest) {
    try {
        await verifyAdmin(request);

        if (!adminDb) {
            return NextResponse.json({ error: "Database not available" }, { status: 500 });
        }

        const payload = await request.json();
        const { title, message, type, target, link } = payload;

        if (!title || !message || !type || !target) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        await adminDb.collection("notifications").add({
            title,
            message,
            type,
            target,
            link: link || null,
            createdAt: FieldValue.serverTimestamp(),
            readBy: [],
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error, "Notifications.POST");
    }
}

// PUT — Mark notification as read
export async function PUT(request: NextRequest) {
    try {
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
