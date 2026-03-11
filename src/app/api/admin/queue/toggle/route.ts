import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { verifyAdmin, handleApiError } from "@/lib/server/auth";
import { FieldValue } from "firebase-admin/firestore";
import { checkRateLimit, ADMIN } from "@/lib/server/rate-limit";

export async function POST(request: NextRequest) {
    try {
        checkRateLimit(request, "admin/queue/toggle", ADMIN);
        await verifyAdmin(request);

        const { dropId } = await request.json();

        if (!dropId) {
            return NextResponse.json({ error: "Missing dropId" }, { status: 400 });
        }

        const docRef = adminDb.collection("adminSettings").doc("dropQueue");
        const docSnap = await docRef.get();
        let queue: string[] = [];

        if (docSnap.exists) {
            queue = docSnap.data()?.queue || [];
        }

        const isQueued = queue.includes(dropId);

        if (isQueued) {
            await docRef.set({ queue: FieldValue.arrayRemove(dropId) }, { merge: true });
            return NextResponse.json({ success: true, added: false });
        } else {
            await docRef.set({ queue: FieldValue.arrayUnion(dropId) }, { merge: true });
            return NextResponse.json({ success: true, added: true });
        }
    } catch (error) {
        return handleApiError(error, "Admin.Queue.Toggle");
    }
}
