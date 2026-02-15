import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";

export async function POST(request: NextRequest) {
    try {
        const { drops } = await request.json();

        if (!drops || !Array.isArray(drops)) {
            return NextResponse.json({ error: "Missing drops array" }, { status: 400 });
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
        console.error("Seed error:", error);
        return NextResponse.json({ error: error.message || "Seed failed" }, { status: 500 });
    }
}
