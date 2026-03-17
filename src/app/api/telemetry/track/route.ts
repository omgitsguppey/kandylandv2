import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import * as admin from "firebase-admin";
import { CANONICAL_TASK_EVENT_NAMES, recordDailyTaskProgressFromEvent, recordTelemetryEventStat } from "@/lib/server/daily-tasks";
import { handleApiError } from "@/lib/server/auth";
import { ANALYTICS_WRITE } from "@/lib/server/rate-limit";
import { getDropReferenceMap, resolveDropTitle } from "@/lib/server/drop-references";
import { recordSemanticRollupFromTelemetryEvent } from "@/lib/server/analytics-semantics";
import { profileAllowsIdentifiedAnalytics, requestHasGlobalPrivacyControl } from "@/lib/server/privacy-consent";
import { BUILT_IN_DAILY_TASKS } from "@/lib/tasks/task-catalog";
import { UserProfile } from "@/types/db";
import { buildAnalyticsTimeKeys, resolveTrackedTelemetryEvent } from "@/lib/server/analytics-event-utils";
import { guardApiRequest } from "@/lib/server/request-guard";

const TASK_PROGRESS_EVENT_NAMES = new Set(BUILT_IN_DAILY_TASKS.map((task) => task.eventName));
type SanitizedEventParams = Record<string, string | number | boolean>;
const MAX_TELEMETRY_BODY_BYTES = 16 * 1024;

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
        const decodedToken = await guardApiRequest(req, {
            routeName: "telemetry/track",
            rateLimit: ANALYTICS_WRITE,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });
        const userId = decodedToken?.uid ?? "";
        const userEmail = decodedToken?.email;

        const contentLength = Number(req.headers.get("content-length") || 0);
        if (Number.isFinite(contentLength) && contentLength > MAX_TELEMETRY_BODY_BYTES) {
            return NextResponse.json({ error: "Payload too large" }, { status: 413 });
        }

        // Extract payload
        const body = await req.json();
        const { eventName, eventParams } = body;

        if (!eventName) {
            return NextResponse.json({ error: "Missing eventName" }, { status: 400 });
        }
        const { canonicalEventName, option, metadataParams, isKnownEvent } = resolveTrackedTelemetryEvent(String(eventName));
        if (!isKnownEvent) {
            return NextResponse.json({ error: "Unsupported eventName" }, { status: 400 });
        }

        const sanitizedEventParams = sanitizeEventParams(eventParams);
        const eventParamsWithMetadata: SanitizedEventParams = {
            ...sanitizedEventParams,
            ...metadataParams,
        };
        const canAdvanceTaskProgress = TASK_PROGRESS_EVENT_NAMES.has(canonicalEventName) && !CANONICAL_TASK_EVENT_NAMES.has(canonicalEventName);

        const realtimeDb = admin.database();
        const profileSnapshot = await adminDb.collection("users").doc(userId).get();
        const profileData = profileSnapshot.data();
        const userProfile = (profileData as UserProfile | undefined) ?? null;

        const username = profileData?.username || profileData?.displayName || userEmail || "Unknown Collector";
        const allowIdentifiedAnalytics = profileAllowsIdentifiedAnalytics(userProfile, req);

        if (!allowIdentifiedAnalytics) {
            if (canAdvanceTaskProgress) {
                await recordDailyTaskProgressFromEvent(userId, username, canonicalEventName, eventParamsWithMetadata, {
                    source: "telemetry",
                });
            }

            return NextResponse.json({
                success: true,
                logged: false,
                progressedTask: canAdvanceTaskProgress,
                reason: "identified_analytics_disabled",
            });
        }

        const nowMs = Date.now();
        const timeKeys = buildAnalyticsTimeKeys(nowMs);
        const pagePath = getStringParam(eventParamsWithMetadata, "page_path");
        const sessionId = getStringParam(eventParamsWithMetadata, "session_id");
        const dropId = getStringParam(eventParamsWithMetadata, "drop_id");
        const dropReferences = dropId ? await getDropReferenceMap([dropId]) : {};
        const dropTitle = dropId
            ? resolveDropTitle(dropReferences, dropId, getStringParam(eventParamsWithMetadata, "drop_title"))
            : "";

        // Construct Telemetry Event
        const telemetryData = {
            eventName: canonicalEventName,
            params: {
                ...eventParamsWithMetadata,
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
            eventName: canonicalEventName,
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
            dropCategory: getStringParam(eventParamsWithMetadata, "drop_category"),
            assetKey: getStringParam(eventParamsWithMetadata, "asset_key"),
            assetIndex: getNumberParam(eventParamsWithMetadata, "asset_index"),
            contentKind: getStringParam(eventParamsWithMetadata, "content_kind"),
            destination: getStringParam(eventParamsWithMetadata, "destination"),
            destinationType: getStringParam(eventParamsWithMetadata, "destination_type"),
            sessionWatchSeconds: getNumberParam(eventParamsWithMetadata, "session_watch_seconds"),
            watchSeconds: getNumberParam(eventParamsWithMetadata, "watch_seconds"),
            durationMs: getNumberParam(eventParamsWithMetadata, "duration_ms"),
            loadMs: getNumberParam(eventParamsWithMetadata, "load_ms"),
            viewportWidth: getNumberParam(eventParamsWithMetadata, "viewport_width"),
            viewportHeight: getNumberParam(eventParamsWithMetadata, "viewport_height"),
            isMobileViewport: getBooleanParam(eventParamsWithMetadata, "is_mobile_viewport"),
            authState: getStringParam(eventParamsWithMetadata, "auth_state"),
            semanticCategory: getStringParam(eventParamsWithMetadata, "semantic_category"),
            semanticCategoryLabel: getStringParam(eventParamsWithMetadata, "semantic_category_label"),
            semanticScopeKey: getStringParam(eventParamsWithMetadata, "semantic_scope_key"),
            semanticScopeLabel: getStringParam(eventParamsWithMetadata, "semantic_scope_label"),
            semanticSurfaceKey: getStringParam(eventParamsWithMetadata, "semantic_surface_key"),
            semanticSurfaceLabel: getStringParam(eventParamsWithMetadata, "semantic_surface_label"),
            eventCategory: option?.category || "system",
            eventModules: option?.modules || [],
            trackingSources: option?.sources || [],
            eventIndexVersion: getStringParam(eventParamsWithMetadata, "event_index_version"),
            trackingOrigin: "authenticated_client",
            params: eventParamsWithMetadata,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        // Write directly to Realtime Database
        // Structure: telemetry/events/{eventName}/{pushId}
        const eventsRef = realtimeDb.ref(`telemetry/events/${canonicalEventName}`);
        await eventsRef.push(telemetryData);

        // Also write a user-centric log: telemetry/users/{userId}/{pushId}
        const userEventsRef = realtimeDb.ref(`telemetry/users/${userId}`);
        await userEventsRef.push(telemetryData);
        await adminDb.collection("analytics_event_facts").add(analyticsEventFact);

        const taskProgressPromise = !canAdvanceTaskProgress
            ? Promise.resolve()
            : recordDailyTaskProgressFromEvent(userId, username, canonicalEventName, eventParamsWithMetadata, {
                source: "telemetry",
            });

        await Promise.all([
            recordTelemetryEventStat(canonicalEventName, eventParamsWithMetadata),
            taskProgressPromise,
            recordSemanticRollupFromTelemetryEvent({
                timestamp: nowMs,
                eventName: canonicalEventName,
                params: eventParamsWithMetadata,
                sourceKey: "analytics_event_facts",
            }),
            adminDb.collection("analytics_active_users").doc(userId).set({
                uid: userId,
                username,
                lastSeenAt: nowMs,
                lastEventName: canonicalEventName,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                createdAt: nowMs,
            }, { merge: true }),
        ]);

        return NextResponse.json({ success: true, logged: true });
    } catch (error) {
        return handleApiError(error, "Telemetry.Track");
    }
}
