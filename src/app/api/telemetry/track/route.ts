import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/server/firebase-admin";
import * as admin from "firebase-admin";

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 });
        }

        const idToken = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const userId = decodedToken.uid;

        // Extract payload
        const body = await req.json();
        const { eventName, eventParams } = body;

        if (!eventName) {
            return NextResponse.json({ error: "Missing eventName" }, { status: 400 });
        }

        const db = admin.database();

        // Fetch UserProfile to securely bind username as source of truth
        const profileRef = db.ref(`users/${userId}/profile`);
        const snapshot = await profileRef.once("value");
        const profileData = snapshot.val();

        const username = profileData?.displayName || decodedToken.name || "Unknown Collector";

        // Construct Telemetry Event
        const telemetryData = {
            eventName,
            params: eventParams || {},
            userId,
            username,
            timestamp: Date.now(),
            userAgent: req.headers.get("user-agent") || "unknown",
        };

        // Write directly to Realtime Database
        // Structure: telemetry/events/{eventName}/{pushId}
        const eventsRef = db.ref(`telemetry/events/${eventName}`);
        await eventsRef.push(telemetryData);

        // Also write a user-centric log: telemetry/users/{userId}/{pushId}
        const userEventsRef = db.ref(`telemetry/users/${userId}`);
        await userEventsRef.push(telemetryData);

        return NextResponse.json({ success: true, logged: true });
    } catch (error) {
        console.error("Telemetry Logging Error:", error);
        // We return 200 even on error to prevent client-side UI failure loops for non-critical logging.
        return NextResponse.json({ success: false, error: "Internal telemetry failure" }, { status: 200 });
    }
}
