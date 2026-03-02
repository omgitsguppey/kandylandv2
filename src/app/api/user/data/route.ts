import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, handleApiError } from "@/lib/server/auth";
import { adminDb } from "@/lib/server/firebase-admin";

export async function GET(request: NextRequest) {
    try {
        const authResult = await verifyAuth(request);
        const { uid, email } = authResult;

        if (!adminDb) {
            return NextResponse.json({ error: "Database not available" }, { status: 500 });
        }

        // 1. Fetch User Profile
        const userDoc = await adminDb.collection("users").doc(uid).get();
        const userData = userDoc.exists ? userDoc.data() : null;

        // 2. Fetch User Unlocked Content
        const dropsSnapshot = await adminDb.collection("users").doc(uid).collection("unlocked_drops").get();
        const unlockedDrops = dropsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // 3. Compile Data Payload
        const exportData = {
            exportDate: new Date().toISOString(),
            identity: {
                uid,
                email,
            },
            profile: userData || {},
            unlockedContent: unlockedDrops,
            analyticsExclusion: userData?.analyticsExclusion || false
        };

        // Return as deeply serialized JSON
        return new NextResponse(JSON.stringify(exportData, null, 2), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                // Instruct browser to trigger a download
                "Content-Disposition": `attachment; filename="kandydrops_data_${uid}.json"`
            }
        });

    } catch (error) {
        return handleApiError(error, "User.Data.GET");
    }
}
