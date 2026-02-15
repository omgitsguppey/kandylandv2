import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

// POST — Send notification
export async function POST(request: NextRequest) {
    try {
        const payload = await request.json();
        const { title, message, type, target, link } = payload;

        if (!title || !message || !type || !target) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }
        if (!adminDb) {
            return NextResponse.json({ error: "Database not available" }, { status: 500 });
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
    } catch (error: any) {
        console.error("Send notification error:", error);
        return NextResponse.json({ error: error.message || "Failed to send" }, { status: 500 });
    }
}

// PUT — Mark notification as read
export async function PUT(request: NextRequest) {
    try {
        const { notificationId, userId } = await request.json();

        if (!notificationId || !userId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }
        if (!adminDb) {
            return NextResponse.json({ error: "Database not available" }, { status: 500 });
        }

        const ref = adminDb.collection("notifications").doc(notificationId);
        await ref.update({ readBy: FieldValue.arrayUnion(userId) });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Mark read error:", error);
        return NextResponse.json({ error: error.message || "Failed to mark read" }, { status: 500 });
    }
}
