import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

// POST — Create a new drop
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { dropData } = body;

        if (!dropData) {
            return NextResponse.json({ error: "Missing drop data" }, { status: 400 });
        }
        if (!adminDb) {
            return NextResponse.json({ error: "Database not available" }, { status: 500 });
        }

        const docRef = await adminDb.collection("drops").add({
            ...dropData,
            createdAt: FieldValue.serverTimestamp(),
        });

        return NextResponse.json({ success: true, id: docRef.id });
    } catch (error: any) {
        console.error("Create drop error:", error);
        return NextResponse.json({ error: error.message || "Create failed" }, { status: 500 });
    }
}

// PUT — Update an existing drop
export async function PUT(request: NextRequest) {
    try {
        const { dropId, dropData } = await request.json();

        if (!dropId || !dropData) {
            return NextResponse.json({ error: "Missing dropId or data" }, { status: 400 });
        }
        if (!adminDb) {
            return NextResponse.json({ error: "Database not available" }, { status: 500 });
        }

        const dropRef = adminDb.collection("drops").doc(dropId);
        await dropRef.update(dropData);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Update drop error:", error);
        return NextResponse.json({ error: error.message || "Update failed" }, { status: 500 });
    }
}
