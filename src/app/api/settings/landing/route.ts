import { NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const key = searchParams.get("key");

        if (!key) {
            return NextResponse.json({ error: "Missing key parameter" }, { status: 400 });
        }

        const landingDoc = await adminDb.collection("settings").doc("landing").get();

        if (landingDoc.exists) {
            const data = landingDoc.data();
            if (data && data[key]) {
                return NextResponse.json({ url: data[key] });
            }
        }

        return NextResponse.json({ url: null });
    } catch (error: any) {
        console.error("Failed to fetch landing custom image:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
