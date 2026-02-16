import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { verifyAdmin, AuthError } from "@/lib/server/auth";

export async function POST(request: NextRequest) {
    try {
        await verifyAdmin(request);

        const { drops } = await request.json();

        if (!drops || !Array.isArray(drops)) {
            return NextResponse.json({ error: "Missing drops array" }, { status: 400 });
        }
        if (drops.length > 500) {
            return NextResponse.json({ error: "Batch limit exceeded (max 500)" }, { status: 400 });
        }
        if (!adminDb) {
            return NextResponse.json({ error: "Database not available" }, { status: 500 });
        }

        const batch = adminDb.batch();

        for (const drop of drops) {
            const newDocRef = adminDb.collection("drops").doc();
            batch.set(newDocRef, { ...drop, id: newDocRef.id });
        }

        await batch.commit();

        return NextResponse.json({ success: true, count: drops.length });
    } catch (error: any) {
        if (error instanceof AuthError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        console.error("Seed error:", error);
        return NextResponse.json({ error: error.message || "Seed failed" }, { status: 500 });
    }
}
