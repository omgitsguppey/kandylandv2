import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import * as admin from "firebase-admin";
import { CANONICAL_TASK_EVENT_NAMES, recordDailyTaskProgressFromEvent } from "@/lib/server/daily-tasks";
import { handleApiError } from "@/lib/server/auth";
import { ANALYTICS_WRITE } from "@/lib/server/rate-limit";
import { getDropReferenceMap, resolveDropTitle } from "@/lib/server/drop-references";
import { profileAllowsIdentifiedAnalytics, requestHasGlobalPrivacyControl } from "@/lib/server/privacy-consent";
import { BUILT_IN_DAILY_TASKS } from "@/lib/tasks/task-catalog";
import { UserProfile } from "@/types/db";
import { isValidAnalyticsEventId, normalizeAnalyticsClientTimestamp } from "@/lib/analytics-identifiers";
import { buildAnalyticsTimeKeys, resolveTrackedTelemetryEvent } from "@/lib/server/analytics-event-utils";
import { claimAnalyticsReceipt } from "@/lib/server/analytics-receipts";
import { guardApiRequest } from "@/lib/server/request-guard";
import { recordServerDiagnostic } from "@/lib/server/server-diagnostics";

const TASK_PROGRESS_EVENT_NAMES = new Set(BUILT_IN_DAILY_TASKS.map((task) => task.eventName));
type SanitizedEventParams = Record<string, string | number | boolean>;
const MAX_TELEMETRY_BODY_BYTES = 48 * 1024;
const MAX_TELEMETRY_EVENTS_PER_REQUEST = 25;

interface IncomingTelemetryEvent {
    eventId?: unknown;
    eventTimestampMs?: unknown;
    eventName: unknown;
    eventParams?: unknown;
}

interface ResolvedTelemetryEvent {
    eventId: string;
    eventTimestampMs: number;
    canonicalEventName: string;
    option: ReturnType<typeof resolveTrackedTelemetryEvent>["option"];
    eventParamsWithMetadata: SanitizedEventParams;
    canAdvanceTaskProgress: boolean;
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

function normalizeIncomingTelemetryEvents(body: unknown): IncomingTelemetryEvent[] {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return [];
    }

    const payload = body as {
        eventName?: unknown;
        eventParams?: unknown;
        events?: IncomingTelemetryEvent[];
    };

    if (Array.isArray(payload.events)) {
        return payload.events;
    }

    if (typeof payload.eventName === "undefined") {
        return [];
    }

    return [{
        eventName: payload.eventName,
        eventParams: payload.eventParams,
    }];
}

export async function POST(req: NextRequest) {
    try {
        const decodedToken = await guardApiRequest(req, {
            routeName: "telemetry/track",
            preAuthRouteName: "telemetry/track/preauth",
            preAuthRateLimit: ANALYTICS_WRITE,
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

        const body = await req.json();
        const incomingEvents = normalizeIncomingTelemetryEvents(body);

        if (incomingEvents.length === 0) {
            return NextResponse.json({ error: "Missing eventName" }, { status: 400 });
        }

        if (incomingEvents.length > MAX_TELEMETRY_EVENTS_PER_REQUEST) {
            return NextResponse.json({ error: "Too many events" }, { status: 413 });
        }

        const resolvedEvents: ResolvedTelemetryEvent[] = incomingEvents.map((entry) => {
            const rawEventName = String(entry.eventName || "");
            const { canonicalEventName, option, metadataParams, isKnownEvent } = resolveTrackedTelemetryEvent(rawEventName);
            if (!rawEventName || !isKnownEvent) {
                throw new Error("Unsupported eventName");
            }

            if (!isValidAnalyticsEventId(entry.eventId)) {
                throw new Error("Unsupported event payload");
            }

            const sanitizedEventParams = sanitizeEventParams(entry.eventParams);
            const eventParamsWithMetadata: SanitizedEventParams = {
                ...sanitizedEventParams,
                ...metadataParams,
            };
            const canAdvanceTaskProgress = TASK_PROGRESS_EVENT_NAMES.has(canonicalEventName) && !CANONICAL_TASK_EVENT_NAMES.has(canonicalEventName);
            const eventTimestampMs = normalizeAnalyticsClientTimestamp(
                entry.eventTimestampMs ?? sanitizedEventParams.event_timestamp_ms,
                Date.now(),
            );

            return {
                eventId: entry.eventId,
                eventTimestampMs,
                canonicalEventName,
                option,
                eventParamsWithMetadata,
                canAdvanceTaskProgress,
            };
        });

        const acceptedEvents = (await Promise.all(resolvedEvents.map(async (event) => {
            const accepted = await claimAnalyticsReceipt({
                collectionName: "analytics_event_receipts",
                receiptKey: `${userId}:${event.eventId}`,
                data: {
                    userId,
                    eventId: event.eventId,
                    eventName: event.canonicalEventName,
                    eventTimestampMs: event.eventTimestampMs,
                    route: "telemetry_track",
                },
            });

            return accepted ? event : null;
        }))).filter((event): event is ResolvedTelemetryEvent => Boolean(event));

        const realtimeDb = admin.database();
        const profileSnapshot = await adminDb.collection("users").doc(userId).get();
        const profileData = profileSnapshot.data();
        const userProfile = (profileData as UserProfile | undefined) ?? null;

        const username = profileData?.username || profileData?.displayName || userEmail || "Unknown Collector";
        const allowIdentifiedAnalytics = profileAllowsIdentifiedAnalytics(userProfile, req);
        const progressedTaskCount = acceptedEvents.filter((event) => event.canAdvanceTaskProgress).length;

        if (acceptedEvents.length === 0) {
            return NextResponse.json({
                success: true,
                logged: allowIdentifiedAnalytics,
                eventCount: 0,
                duplicateCount: resolvedEvents.length,
                progressedTaskCount: 0,
            });
        }

        if (!allowIdentifiedAnalytics) {
            if (progressedTaskCount > 0) {
                await Promise.all(acceptedEvents
                    .filter((event) => event.canAdvanceTaskProgress)
                    .map((event) => recordDailyTaskProgressFromEvent(
                        userId,
                        username,
                        event.canonicalEventName,
                        event.eventParamsWithMetadata,
                        { source: "telemetry" },
                    )));
            }

            return NextResponse.json({
                success: true,
                logged: false,
                eventCount: 0,
                duplicateCount: resolvedEvents.length - acceptedEvents.length,
                progressedTaskCount,
                reason: "identified_analytics_disabled",
            });
        }

        const globalPrivacyControl = requestHasGlobalPrivacyControl(req);
        const userAgent = req.headers.get("user-agent") || "unknown";
        const uniqueDropIds = Array.from(new Set(
            acceptedEvents
                .map((event) => getStringParam(event.eventParamsWithMetadata, "drop_id"))
                .filter((dropId) => dropId.length > 0),
        ));
        const dropReferences = uniqueDropIds.length > 0 ? await getDropReferenceMap(uniqueDropIds) : {};
        const telemetryFacts = acceptedEvents.map((event) => {
            const nowMs = event.eventTimestampMs;
            const timeKeys = buildAnalyticsTimeKeys(nowMs);
            const pagePath = getStringParam(event.eventParamsWithMetadata, "page_path");
            const sessionId = getStringParam(event.eventParamsWithMetadata, "session_id");
            const dropId = getStringParam(event.eventParamsWithMetadata, "drop_id");
            const dropTitle = dropId
                ? resolveDropTitle(dropReferences, dropId, getStringParam(event.eventParamsWithMetadata, "drop_title"))
                : "";

            return {
                ...event,
                nowMs,
                telemetryData: {
                    eventId: event.eventId,
                    eventName: event.canonicalEventName,
                    params: {
                        ...event.eventParamsWithMetadata,
                        ...(dropId ? { drop_id: dropId, drop_title: dropTitle } : {}),
                    },
                    userId,
                    username,
                    timestamp: nowMs,
                    userAgent,
                },
                analyticsEventFact: {
                    source: "authenticated",
                    consentMode: "identified",
                    globalPrivacyControl,
                    eventName: event.canonicalEventName,
                    userId,
                    username,
                    timestamp: nowMs,
                    userAgent,
                    pagePath,
                    sessionId,
                    dayKey: timeKeys.dayKey,
                    hourKey: timeKeys.hourKey,
                    minuteKey: timeKeys.minuteKey,
                    dropId,
                    dropTitle,
                    dropCategory: getStringParam(event.eventParamsWithMetadata, "drop_category"),
                    assetKey: getStringParam(event.eventParamsWithMetadata, "asset_key"),
                    assetIndex: getNumberParam(event.eventParamsWithMetadata, "asset_index"),
                    contentKind: getStringParam(event.eventParamsWithMetadata, "content_kind"),
                    destination: getStringParam(event.eventParamsWithMetadata, "destination"),
                    destinationType: getStringParam(event.eventParamsWithMetadata, "destination_type"),
                    sessionWatchSeconds: getNumberParam(event.eventParamsWithMetadata, "session_watch_seconds"),
                    watchSeconds: getNumberParam(event.eventParamsWithMetadata, "watch_seconds"),
                    durationMs: getNumberParam(event.eventParamsWithMetadata, "duration_ms"),
                    loadMs: getNumberParam(event.eventParamsWithMetadata, "load_ms"),
                    viewportWidth: getNumberParam(event.eventParamsWithMetadata, "viewport_width"),
                    viewportHeight: getNumberParam(event.eventParamsWithMetadata, "viewport_height"),
                    isMobileViewport: getBooleanParam(event.eventParamsWithMetadata, "is_mobile_viewport"),
                    authState: getStringParam(event.eventParamsWithMetadata, "auth_state"),
                    semanticCategory: getStringParam(event.eventParamsWithMetadata, "semantic_category"),
                    semanticCategoryLabel: getStringParam(event.eventParamsWithMetadata, "semantic_category_label"),
                    semanticScopeKey: getStringParam(event.eventParamsWithMetadata, "semantic_scope_key"),
                    semanticScopeLabel: getStringParam(event.eventParamsWithMetadata, "semantic_scope_label"),
                    semanticSurfaceKey: getStringParam(event.eventParamsWithMetadata, "semantic_surface_key"),
                    semanticSurfaceLabel: getStringParam(event.eventParamsWithMetadata, "semantic_surface_label"),
                    eventCategory: event.option?.category || "system",
                    eventModules: event.option?.modules || [],
                    trackingSources: event.option?.sources || [],
                    eventIndexVersion: getStringParam(event.eventParamsWithMetadata, "event_index_version"),
                    trackingOrigin: "authenticated_client",
                    eventId: event.eventId,
                    params: event.eventParamsWithMetadata,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                },
            };
        });

        await Promise.all(telemetryFacts.flatMap((event) => [
            realtimeDb.ref(`telemetry/events/${event.canonicalEventName}`).push(event.telemetryData),
            realtimeDb.ref(`telemetry/users/${userId}`).push(event.telemetryData),
        ]));

        const factsBatch = adminDb.batch();
        telemetryFacts.forEach((event) => {
            factsBatch.set(adminDb.collection("analytics_event_facts").doc(), event.analyticsEventFact);
        });
        factsBatch.set(adminDb.collection("analytics_active_users").doc(userId), {
            uid: userId,
            username,
            lastSeenAt: telemetryFacts[telemetryFacts.length - 1]?.nowMs ?? Date.now(),
            lastEventName: telemetryFacts[telemetryFacts.length - 1]?.canonicalEventName ?? "",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: telemetryFacts[0]?.nowMs ?? Date.now(),
        }, { merge: true });
        await factsBatch.commit();

        await Promise.all([
            ...telemetryFacts
                .filter((event) => event.canAdvanceTaskProgress)
                .map((event) => recordDailyTaskProgressFromEvent(userId, username, event.canonicalEventName, event.eventParamsWithMetadata, {
                    source: "telemetry",
                })),
        ]);

        return NextResponse.json({
            success: true,
            logged: true,
            eventCount: telemetryFacts.length,
            duplicateCount: resolvedEvents.length - acceptedEvents.length,
            progressedTaskCount,
        });
    } catch (error) {
        if (error instanceof Error && error.message === "Unsupported eventName") {
            return NextResponse.json({ error: "Unsupported eventName" }, { status: 400 });
        }
        if (error instanceof Error && error.message === "Unsupported event payload") {
            return NextResponse.json({ error: "Unsupported event payload" }, { status: 400 });
        }
        await recordServerDiagnostic({
            channel: "analytics",
            severity: "error",
            message: "Identified telemetry tracking failed",
            detail: {
                route: "telemetry/track",
                error: error instanceof Error ? error.message : String(error),
            },
        });
        return handleApiError(error, "Telemetry.Track");
    }
}
