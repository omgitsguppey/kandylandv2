import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { verifyAdmin, AuthError } from "@/lib/server/auth";
import { FieldValue } from "firebase-admin/firestore";

// Whitelist of allowed drop fields to prevent arbitrary writes
const ALLOWED_DROP_FIELDS = [
    "title", "description", "imageUrl", "contentUrl", "unlockCost",
    "validFrom", "validUntil", "status", "type", "tags",
    "ctaText", "actionUrl", "accentColor", "fileMetadata",
    "totalUnlocks", "totalClicks", "rotationConfig", "creatorId",
];

function sanitizeDropData(raw: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    for (const key of ALLOWED_DROP_FIELDS) {
        if (raw[key] !== undefined) {
            sanitized[key] = raw[key];
        }
    }
    return sanitized;
}

// POST — Create a new drop (admin-only)
export async function POST(request: NextRequest) {
    try {
        await verifyAdmin(request);

        const body = await request.json();
        const { dropData } = body;

        if (!dropData) {
            return NextResponse.json({ error: "Missing drop data" }, { status: 400 });
        }
        if (!adminDb) {
            return NextResponse.json({ error: "Database not available" }, { status: 500 });
        }

        const sanitized = sanitizeDropData(dropData);
        const docRef = await adminDb.collection("drops").add({
            ...sanitized,
            createdAt: FieldValue.serverTimestamp(),
        });

        return NextResponse.json({ success: true, id: docRef.id });
    } catch (error: any) {
        if (error instanceof AuthError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        console.error("Create drop error:", error);
        return NextResponse.json({ error: error.message || "Create failed" }, { status: 500 });
    }
}

// PUT — Update an existing drop (admin-only)
export async function PUT(request: NextRequest) {
    try {
        await verifyAdmin(request);

        const { dropId, dropData } = await request.json();

        if (!dropId || !dropData) {
            return NextResponse.json({ error: "Missing dropId or data" }, { status: 400 });
        }
        if (!adminDb) {
            return NextResponse.json({ error: "Database not available" }, { status: 500 });
        }

        const sanitized = sanitizeDropData(dropData);
        if (Object.keys(sanitized).length === 0) {
            return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
        }

        const dropRef = adminDb.collection("drops").doc(dropId);
        await dropRef.update(sanitized);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        if (error instanceof AuthError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        console.error("Update drop error:", error);
        return NextResponse.json({ error: error.message || "Update failed" }, { status: 500 });
    }
}

// DELETE — Delete a drop (admin-only)
export async function DELETE(request: NextRequest) {
    try {
        await verifyAdmin(request);

        const { dropId } = await request.json();

        if (!dropId) {
            return NextResponse.json({ error: "Missing dropId" }, { status: 400 });
        }
        if (!adminDb) {
            return NextResponse.json({ error: "Database not available" }, { status: 500 });
        }

        const dropRef = adminDb.collection("drops").doc(dropId);
        const dropSnap = await dropRef.get();
        if (!dropSnap.exists) {
            return NextResponse.json({ error: "Drop not found" }, { status: 404 });
        }

        await dropRef.delete();

        return NextResponse.json({ success: true });
    } catch (error: any) {
        if (error instanceof AuthError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        console.error("Delete drop error:", error);
        return NextResponse.json({ error: error.message || "Delete failed" }, { status: 500 });
    }
}
