import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

// PUT — Update user status (active/suspended/banned)
export async function PUT(request: NextRequest) {
    try {
        const { userId, updates } = await request.json();

        if (!userId || !updates) {
            return NextResponse.json({ error: "Missing userId or updates" }, { status: 400 });
        }
        if (!adminDb) {
            return NextResponse.json({ error: "Database not available" }, { status: 500 });
        }

        const userRef = adminDb.collection("users").doc(userId);
        await userRef.update(updates);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Admin user update error:", error);
        return NextResponse.json({ error: error.message || "Update failed" }, { status: 500 });
    }
}

// POST — Manage user content (add/remove unlocked drops)
export async function POST(request: NextRequest) {
    try {
        const { userId, action, dropId } = await request.json();

        if (!userId || !action || !dropId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }
        if (!adminDb) {
            return NextResponse.json({ error: "Database not available" }, { status: 500 });
        }

        const userRef = adminDb.collection("users").doc(userId);

        if (action === "add") {
            await userRef.update({ unlockedContent: FieldValue.arrayUnion(dropId) });
        } else if (action === "remove") {
            await userRef.update({ unlockedContent: FieldValue.arrayRemove(dropId) });
        } else {
            return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Admin content manage error:", error);
        return NextResponse.json({ error: error.message || "Action failed" }, { status: 500 });
    }
}
