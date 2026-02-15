import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: NextRequest) {
    try {
        const { dropId } = await request.json();

        if (!dropId || !adminDb) {
            return NextResponse.json({ error: "Invalid request" }, { status: 400 });
        }

        const dropRef = adminDb.collection("drops").doc(dropId);
        await dropRef.update({ totalUnlocks: FieldValue.increment(1) });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: "Track failed" }, { status: 500 });
    }
}
