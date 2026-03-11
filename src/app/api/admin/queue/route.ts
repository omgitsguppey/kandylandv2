import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { verifyAdmin, handleApiError } from "@/lib/server/auth";
import { checkRateLimit, ADMIN } from "@/lib/server/rate-limit";

export async function GET(request: NextRequest) {
    try {
        checkRateLimit(request, "admin/queue", ADMIN);
        await verifyAdmin(request);
        const docRef = adminDb.collection("adminSettings").doc("dropQueue");
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return NextResponse.json({
                queue: [],
                dropsPerDay: 2,
                cooldownDays: 7,
                timesPerDay: ["12:00", "18:00"],
            });
        }

        return NextResponse.json({
            queue: docSnap.data()?.queue || [],
            dropsPerDay: docSnap.data()?.dropsPerDay || 2,
            cooldownDays: docSnap.data()?.cooldownDays || 7,
            timesPerDay: docSnap.data()?.timesPerDay || ["12:00", "18:00"],
        });
    } catch (error) {
        return handleApiError(error, "Admin.Queue.GET");
    }
}

export async function PUT(request: NextRequest) {
    try {
        checkRateLimit(request, "admin/queue", ADMIN);
        await verifyAdmin(request);
        const data = await request.json();

        const docRef = adminDb.collection("adminSettings").doc("dropQueue");
        await docRef.set(data, { merge: true });

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error, "Admin.Queue.PUT");
    }
}
