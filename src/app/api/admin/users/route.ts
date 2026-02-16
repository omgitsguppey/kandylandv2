import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { verifyAdmin, AuthError, handleApiError } from "@/lib/server/auth";
import { FieldValue } from "firebase-admin/firestore";

// PUT — Update user status/role (admin-only)
export async function PUT(request: NextRequest) {
    try {
        await verifyAdmin(request);

        const { userId, updates } = await request.json();

        if (!userId || !updates) {
            return NextResponse.json({ error: "Missing userId or updates" }, { status: 400 });
        }
        if (!adminDb) {
            return NextResponse.json({ error: "Database not available" }, { status: 500 });
        }

        // Whitelist allowed fields to prevent arbitrary writes
        const allowedFields = ["role", "isVerified", "status", "statusReason"];
        const sanitized: Record<string, any> = {};
        for (const key of allowedFields) {
            if (updates[key] !== undefined) {
                sanitized[key] = updates[key];
            }
        }

        if (Object.keys(sanitized).length === 0) {
            return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
        }

        const userRef = adminDb.collection("users").doc(userId);
        await userRef.update(sanitized);

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error, "Admin.Users.PUT");
    }
}

// POST — Manage user content (add/remove unlocked drops, admin-only)
export async function POST(request: NextRequest) {
    try {
        await verifyAdmin(request);

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
    } catch (error) {
        return handleApiError(error, "Admin.Users.POST");
    }
}
