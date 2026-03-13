import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import * as admin from "firebase-admin";
import { recordDailyTaskProgressFromEvent, recordTelemetryEventStat } from "@/lib/server/daily-tasks";
import { TELEMETRY_EVENT_NAMES } from "@/lib/telemetry-catalog";
import { handleApiError, verifyAuth } from "@/lib/server/auth";
import { checkRateLimit, RELAXED } from "@/lib/server/rate-limit";

const ALLOWED_EVENT_NAMES = new Set(TELEMETRY_EVENT_NAMES);
type SanitizedEventParams = Record<string, string | number | boolean>;

function sanitizeTelemetryValue(value: unknown): string | number | boolean | undefined {
    if (typeof value === "string") {
        return value.slice(0, 250);
    }

    if (typeof value === "number") {
        return Number.isFinite(value) ? value : undefined;
    }

    if (typeof value === "boolean") {
        return value;
    }

    return undefined;
}

function sanitizeEventParams(value: unknown) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return {};
    }

    const entries = Object.entries(value as Record<string, unknown>).slice(0, 20);
    const sanitizedEntries = entries
        .map(([key, entryValue]) => [key.slice(0, 60), sanitizeTelemetryValue(entryValue)] as const)
        .filter(([, entryValue]) => entryValue !== undefined) as Array<[string, string | number | boolean]>;

    return Object.fromEntries(sanitizedEntries) as SanitizedEventParams;
}

export async function POST(req: NextRequest) {
    try {
        await checkRateLimit(req, "telemetry/track", RELAXED);
        const decodedToken = await verifyAuth(req);
        const userId = decodedToken.uid;

        // Extract payload
        const body = await req.json();
        const { eventName, eventParams } = body;

        if (!eventName) {
            return NextResponse.json({ error: "Missing eventName" }, { status: 400 });
        }
        if (!ALLOWED_EVENT_NAMES.has(eventName)) {
            return NextResponse.json({ error: "Unsupported eventName" }, { status: 400 });
        }

        const sanitizedEventParams = sanitizeEventParams(eventParams);

        const realtimeDb = admin.database();
        const profileSnapshot = await adminDb.collection("users").doc(userId).get();
        const profileData = profileSnapshot.data();
        const username = profileData?.username || profileData?.displayName || decodedToken.email || "Unknown Collector";
        const nowMs = Date.now();

        // Construct Telemetry Event
        const telemetryData = {
            eventName,
            params: sanitizedEventParams,
            userId,
            username,
            timestamp: nowMs,
            userAgent: req.headers.get("user-agent") || "unknown",
        };

        // Write directly to Realtime Database
        // Structure: telemetry/events/{eventName}/{pushId}
        const eventsRef = realtimeDb.ref(`telemetry/events/${eventName}`);
        await eventsRef.push(telemetryData);

        // Also write a user-centric log: telemetry/users/{userId}/{pushId}
        const userEventsRef = realtimeDb.ref(`telemetry/users/${userId}`);
        await userEventsRef.push(telemetryData);

        await Promise.all([
            recordTelemetryEventStat(eventName, sanitizedEventParams),
            recordDailyTaskProgressFromEvent(userId, username, eventName, sanitizedEventParams),
            adminDb.collection("analytics_active_users").doc(userId).set({
                uid: userId,
                username,
                lastSeenAt: nowMs,
                lastEventName: eventName,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                createdAt: nowMs,
            }, { merge: true }),
        ]);

        return NextResponse.json({ success: true, logged: true });
    } catch (error) {
        return handleApiError(error, "Telemetry.Track");
    }
}
