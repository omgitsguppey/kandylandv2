import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import * as admin from "firebase-admin";
import { recordDailyTaskProgressFromEvent, recordTelemetryEventStat } from "@/lib/server/daily-tasks";
import { TELEMETRY_EVENT_NAMES } from "@/lib/telemetry-catalog";
import { handleApiError, verifyAuth } from "@/lib/server/auth";
import { checkRateLimit, RELAXED } from "@/lib/server/rate-limit";
import { hasTrustedSiteOrigin } from "@/lib/server/request-origin";
import { getDropReferenceMap, resolveDropTitle } from "@/lib/server/drop-references";
import { profileAllowsIdentifiedAnalytics, requestHasGlobalPrivacyControl } from "@/lib/server/privacy-consent";
import { UserProfile } from "@/types/db";

const ALLOWED_EVENT_NAMES = new Set(TELEMETRY_EVENT_NAMES);
type SanitizedEventParams = Record<string, string | number | boolean>;

function buildTimeKeys(timestamp: number) {
    const date = new Date(timestamp);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    const hour = String(date.getUTCHours()).padStart(2, "0");
    const minute = String(date.getUTCMinutes()).padStart(2, "0");

    return {
        dayKey: `${year}-${month}-${day}`,
        hourKey: `${year}-${month}-${day}T${hour}`,
        minuteKey: `${year}-${month}-${day}T${hour}:${minute}`,
    };
}

function getStringParam(params: SanitizedEventParams, key: string) {
    const value = params[key];
    return typeof value === "string" ? value : "";
}

function getNumberParam(params: SanitizedEventParams, key: string) {
    const value = params[key];
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function getBooleanParam(params: SanitizedEventParams, key: string) {
    const value = params[key];
    return typeof value === "boolean" ? value : undefined;
}

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

        if (!hasTrustedSiteOrigin(req)) {
            return NextResponse.json({ error: "Untrusted origin" }, { status: 403 });
        }

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
        const userProfile = (profileData as UserProfile | undefined) ?? null;

        if (!profileAllowsIdentifiedAnalytics(userProfile, req)) {
            return NextResponse.json({ success: true, logged: false, reason: "identified_analytics_disabled" });
        }

        const username = profileData?.username || profileData?.displayName || decodedToken.email || "Unknown Collector";
        const nowMs = Date.now();
        const timeKeys = buildTimeKeys(nowMs);
        const pagePath = getStringParam(sanitizedEventParams, "page_path");
        const sessionId = getStringParam(sanitizedEventParams, "session_id");
        const dropId = getStringParam(sanitizedEventParams, "drop_id");
        const dropReferences = dropId ? await getDropReferenceMap([dropId]) : {};
        const dropTitle = dropId
            ? resolveDropTitle(dropReferences, dropId, getStringParam(sanitizedEventParams, "drop_title"))
            : "";

        // Construct Telemetry Event
        const telemetryData = {
            eventName,
            params: {
                ...sanitizedEventParams,
                ...(dropId ? { drop_id: dropId, drop_title: dropTitle } : {}),
            },
            userId,
            username,
            timestamp: nowMs,
            userAgent: req.headers.get("user-agent") || "unknown",
        };
        const analyticsEventFact = {
            source: "authenticated",
            consentMode: "identified",
            globalPrivacyControl: requestHasGlobalPrivacyControl(req),
            eventName,
            userId,
            username,
            timestamp: nowMs,
            userAgent: req.headers.get("user-agent") || "unknown",
            pagePath,
            sessionId,
            dayKey: timeKeys.dayKey,
            hourKey: timeKeys.hourKey,
            minuteKey: timeKeys.minuteKey,
            dropId,
            dropTitle,
            dropCategory: getStringParam(sanitizedEventParams, "drop_category"),
            assetKey: getStringParam(sanitizedEventParams, "asset_key"),
            assetIndex: getNumberParam(sanitizedEventParams, "asset_index"),
            contentKind: getStringParam(sanitizedEventParams, "content_kind"),
            destination: getStringParam(sanitizedEventParams, "destination"),
            destinationType: getStringParam(sanitizedEventParams, "destination_type"),
            sessionWatchSeconds: getNumberParam(sanitizedEventParams, "session_watch_seconds"),
            watchSeconds: getNumberParam(sanitizedEventParams, "watch_seconds"),
            durationMs: getNumberParam(sanitizedEventParams, "duration_ms"),
            loadMs: getNumberParam(sanitizedEventParams, "load_ms"),
            viewportWidth: getNumberParam(sanitizedEventParams, "viewport_width"),
            viewportHeight: getNumberParam(sanitizedEventParams, "viewport_height"),
            isMobileViewport: getBooleanParam(sanitizedEventParams, "is_mobile_viewport"),
            authState: getStringParam(sanitizedEventParams, "auth_state"),
            params: sanitizedEventParams,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        // Write directly to Realtime Database
        // Structure: telemetry/events/{eventName}/{pushId}
        const eventsRef = realtimeDb.ref(`telemetry/events/${eventName}`);
        await eventsRef.push(telemetryData);

        // Also write a user-centric log: telemetry/users/{userId}/{pushId}
        const userEventsRef = realtimeDb.ref(`telemetry/users/${userId}`);
        await userEventsRef.push(telemetryData);
        await adminDb.collection("analytics_event_facts").add(analyticsEventFact);

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
