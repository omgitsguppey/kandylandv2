import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";

export async function GET(request: NextRequest) {
    try {
        const username = request.nextUrl.searchParams.get("username");

        if (!username) {
            return NextResponse.json({ error: "Missing username" }, { status: 400 });
        }
        if (!adminDb) {
            return NextResponse.json({ error: "Database not available" }, { status: 500 });
        }

        const snap = await adminDb
            .collection("users")
            .where("username", "==", username)
            .limit(1)
            .get();

        return NextResponse.json({ available: snap.empty });
    } catch (error: any) {
        console.error("Username check error:", error);
        return NextResponse.json({ error: "Check failed" }, { status: 500 });
    }
}
