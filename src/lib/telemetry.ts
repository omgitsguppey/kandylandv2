import { auth } from "./firebase";
import { authFetch } from "./authFetch";
import { prepareAnalyticsEvent } from "./analytics-client-engine";
import { createAnalyticsEventId } from "./analytics-identifiers";
import { buildAnalyticsSemanticParams } from "./analytics-semantics";
import { getClientSessionId } from "./client-session";
import { recordClientDiagnostic } from "./client-diagnostics";
import { canUseAnonymousAnalytics, canUseIdentifiedAnalytics, readPrivacySettingsSnapshot } from "./privacy-consent";
import { BUILT_IN_DAILY_TASKS } from "./tasks/task-catalog";

/**
 * Fire-and-forget telemetry tracking.
 * Sends analytics to GA when available and mirrors them to the backend for authenticated users.
 */
const FLOW_STORAGE_KEY = "kandydrops.telemetry.flows";
const IDENTIFIED_QUEUE_STORAGE_KEY = "kandydrops.telemetry.identified-queue";

type SanitizedEventParams = Record<string, string | number | boolean>;
const TASK_PROGRESS_EVENT_NAMES = new Set(BUILT_IN_DAILY_TASKS.map((task) => task.eventName));
const IMMEDIATE_IDENTIFIED_EVENT_NAMES = new Set([
    "semantic_page_viewed",
    "semantic_target_clicked",
    "guided_onboarding_started",
    "guided_onboarding_step_started",
    "guided_onboarding_step_completed",
    "guided_onboarding_completed",
    "gumdrops_purchase_completed",
    "gumdrops_purchase_failed",
    "unlock_drop_success",
    "viewer_session_started",
    "viewer_session_completed",
    "viewer_asset_started",
    "viewer_asset_completed",
    "viewer_asset_consumed",
    "viewer_watch_checkpoint",
    "viewer_source_downloaded",
    "viewer_related_drop_clicked",
    "feedback_submitted",
]);
const IDENTIFIED_TELEMETRY_BATCH_LIMIT = 12;
const IDENTIFIED_TELEMETRY_BATCH_WINDOW_MS = 1_500;

interface IdentifiedTelemetryEvent {
    eventId: string;
    eventTimestampMs: number;
    eventName: string;
    eventParams: SanitizedEventParams | undefined;
}

let telemetryQueue: IdentifiedTelemetryEvent[] = [];
let telemetryFlushTimeout: number | null = null;
let telemetryFlushInFlight: Promise<void> | null = null;
let lifecycleFlushInstalled = false;
let telemetryQueueUserId: string | null = null;
let telemetryQueueLoaded = false;

function sanitizeEventParams(eventParams?: Record<string, unknown>) {
    if (!eventParams) {
        return undefined;
    }

    const sanitized: SanitizedEventParams = {};

    Object.entries(eventParams).forEach(([key, value]) => {
        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
            sanitized[key] = value;
            return;
        }

        if (value === null || typeof value === "undefined") {
            return;
        }

        sanitized[key] = JSON.stringify(value);
    });

    return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

function readJsonStorage<T>(storageKey: string): T | null {
    if (typeof window === "undefined") {
        return null;
    }

    try {
        const raw = window.sessionStorage.getItem(storageKey);
        return raw ? JSON.parse(raw) as T : null;
    } catch {
        return null;
    }
}

function writeJsonStorage(storageKey: string, value: unknown) {
    if (typeof window === "undefined") {
        return;
    }

    try {
        window.sessionStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
        // Ignore storage write failures in private browsing / restricted contexts.
    }
}

function ensureTelemetryQueueLoaded() {
    if (telemetryQueueLoaded || typeof window === "undefined") {
        return;
    }

    telemetryQueueLoaded = true;
    const persistedState = readJsonStorage<{
        userId: string | null;
        events: IdentifiedTelemetryEvent[];
    } | IdentifiedTelemetryEvent[]>(IDENTIFIED_QUEUE_STORAGE_KEY);
    if (!persistedState) {
        telemetryQueue = [];
        return;
    }

    const persistedQueue = Array.isArray(persistedState) ? persistedState : persistedState.events;
    telemetryQueueUserId = Array.isArray(persistedState) ? null : (persistedState.userId ?? null);
    telemetryQueue = persistedQueue.filter((entry) => (
        typeof entry?.eventId === "string"
        && typeof entry?.eventName === "string"
        && typeof entry?.eventTimestampMs === "number"
        && Number.isFinite(entry.eventTimestampMs)
    )).slice(-50);
}

function persistTelemetryQueue() {
    if (typeof window === "undefined") {
        return;
    }

    writeJsonStorage(IDENTIFIED_QUEUE_STORAGE_KEY, {
        userId: telemetryQueueUserId,
        events: telemetryQueue,
    });
}

function clearPersistedTelemetryQueue() {
    if (typeof window === "undefined") {
        return;
    }

    try {
        window.sessionStorage.removeItem(IDENTIFIED_QUEUE_STORAGE_KEY);
    } catch {
        // Ignore storage failures in restricted contexts.
    }
}

function getSessionId() {
    return getClientSessionId();
}

function getEnrichedEventParams(eventParams?: Record<string, unknown>) {
    const sanitizedParams = sanitizeEventParams(eventParams) ?? {};

    if (typeof window === "undefined") {
        return Object.keys(sanitizedParams).length > 0 ? sanitizedParams : undefined;
    }

    const isAuthenticated = Boolean(auth?.currentUser);
    const viewportWidth = Math.round(window.innerWidth || 0);
    const viewportHeight = Math.round(window.innerHeight || 0);
    const enriched: SanitizedEventParams = {
        ...sanitizedParams,
        page_path: window.location.pathname,
        session_id: getSessionId(),
        viewport_width: viewportWidth,
        viewport_height: viewportHeight,
        is_mobile_viewport: viewportWidth <= 768,
        event_timestamp_ms: Date.now(),
        auth_state: isAuthenticated ? "authenticated" : "guest",
        ...buildAnalyticsSemanticParams({
            pagePath: window.location.pathname,
            dropId: typeof sanitizedParams.drop_id === "string" ? sanitizedParams.drop_id : undefined,
            dropCategory: typeof sanitizedParams.drop_category === "string" ? sanitizedParams.drop_category : undefined,
        }),
    };

    return enriched;
}

function readFlowMap() {
    return readJsonStorage<Record<string, { startedAt: number; params?: SanitizedEventParams }>>(FLOW_STORAGE_KEY) ?? {};
}

function writeFlowMap(nextMap: Record<string, { startedAt: number; params?: SanitizedEventParams }>) {
    writeJsonStorage(FLOW_STORAGE_KEY, nextMap);
}

export function startTimedFlow(flowKey: string, eventParams?: Record<string, unknown>) {
    if (typeof window === "undefined") {
        return;
    }

    const currentMap = readFlowMap();
    currentMap[flowKey] = {
        startedAt: Date.now(),
        params: sanitizeEventParams(eventParams),
    };
    writeFlowMap(currentMap);
}

export function clearTimedFlow(flowKey: string) {
    if (typeof window === "undefined") {
        return;
    }

    const currentMap = readFlowMap();
    if (!(flowKey in currentMap)) {
        return;
    }

    delete currentMap[flowKey];
    writeFlowMap(currentMap);
}

export function consumeTimedFlow(flowKey: string, eventParams?: Record<string, unknown>) {
    const currentMap = readFlowMap();
    const entry = currentMap[flowKey];

    if (typeof window !== "undefined" && entry) {
        delete currentMap[flowKey];
        writeFlowMap(currentMap);
    }

    const durationMs = entry ? Math.max(0, Date.now() - entry.startedAt) : undefined;
    return {
        durationMs,
        startedAt: entry?.startedAt,
        mergedParams: {
            ...(entry?.params ?? {}),
            ...(sanitizeEventParams(eventParams) ?? {}),
            ...(durationMs ? {
                duration_ms: durationMs,
                duration_seconds: Math.round(durationMs / 1000),
            } : {}),
        },
    };
}

function clearTelemetryFlushTimeout() {
    if (typeof window === "undefined" || telemetryFlushTimeout === null) {
        return;
    }

    window.clearTimeout(telemetryFlushTimeout);
    telemetryFlushTimeout = null;
}

function shouldFlushIdentifiedTelemetryImmediately(
    eventName: string,
    eventParams: SanitizedEventParams | undefined,
    shouldSyncTaskProgress: boolean,
) {
    if (shouldSyncTaskProgress || IMMEDIATE_IDENTIFIED_EVENT_NAMES.has(eventName)) {
        return true;
    }

    if (eventName.startsWith("auth_") || eventName.startsWith("security_")) {
        return true;
    }

    const pagePath = typeof eventParams?.page_path === "string" ? eventParams.page_path : "";
    return pagePath.startsWith("/admin");
}

async function flushQueuedTelemetry(reason: "scheduled" | "immediate" | "pagehide" | "visibility") {
    ensureTelemetryQueueLoaded();
    const currentUserId = auth?.currentUser?.uid ?? null;

    if (currentUserId && telemetryQueueUserId && telemetryQueueUserId !== currentUserId) {
        telemetryQueue = [];
        telemetryQueueUserId = currentUserId;
        clearPersistedTelemetryQueue();
    }

    if (!auth?.currentUser || telemetryQueue.length === 0) {
        if (!auth?.currentUser) {
            telemetryQueue = [];
            telemetryQueueUserId = null;
            clearPersistedTelemetryQueue();
        }
        clearTelemetryFlushTimeout();
        return;
    }

    if (telemetryFlushInFlight) {
        await telemetryFlushInFlight;
        return;
    }

    clearTelemetryFlushTimeout();
    const batch = telemetryQueue.splice(0, IDENTIFIED_TELEMETRY_BATCH_LIMIT);
    persistTelemetryQueue();
    if (batch.length === 0) {
        return;
    }

    telemetryFlushInFlight = authFetch("/api/telemetry/track", {
        method: "POST",
        keepalive: reason !== "scheduled",
        body: JSON.stringify({ events: batch }),
    }).then(async (response) => {
        if (!response.ok) {
            const result = await response.json().catch(() => ({}));
            throw new Error(typeof result?.error === "string" ? result.error : "Telemetry batch failed");
        }
    }).catch((error) => {
        telemetryQueue = [...batch, ...telemetryQueue].slice(-50);
        persistTelemetryQueue();
        recordClientDiagnostic("telemetry", "Identified telemetry batch failed", {
            reason,
            batchSize: batch.length,
            message: error instanceof Error ? error.message : String(error),
        });
        console.error("[Telemetry] Failed to flush queued telemetry:", error);
    }).finally(() => {
        telemetryFlushInFlight = null;
    });

    await telemetryFlushInFlight;

    if (telemetryQueue.length > 0 && typeof window !== "undefined" && telemetryFlushTimeout === null) {
        telemetryFlushTimeout = window.setTimeout(() => {
            void flushQueuedTelemetry("scheduled");
        }, IDENTIFIED_TELEMETRY_BATCH_WINDOW_MS);
    }
}

function ensureTelemetryLifecycleFlush() {
    if (typeof window === "undefined" || lifecycleFlushInstalled) {
        return;
    }

    lifecycleFlushInstalled = true;
    const flushOnPageHide = () => {
        void flushQueuedTelemetry("pagehide");
    };
    const flushOnVisibilityHidden = () => {
        if (document.visibilityState === "hidden") {
            void flushQueuedTelemetry("visibility");
        }
    };
    const flushOnReconnect = () => {
        void flushQueuedTelemetry("immediate");
    };

    window.addEventListener("pagehide", flushOnPageHide);
    document.addEventListener("visibilitychange", flushOnVisibilityHidden);
    window.addEventListener("online", flushOnReconnect);
}

function enqueueIdentifiedTelemetryEvent(event: IdentifiedTelemetryEvent, immediate = false) {
    if (typeof window === "undefined") {
        return;
    }

    ensureTelemetryQueueLoaded();
    const currentUserId = auth?.currentUser?.uid ?? null;
    if (!currentUserId) {
        return;
    }

    if (telemetryQueueUserId && telemetryQueueUserId !== currentUserId) {
        telemetryQueue = [];
        persistTelemetryQueue();
    }

    telemetryQueueUserId = currentUserId;
    ensureTelemetryLifecycleFlush();
    telemetryQueue.push(event);
    if (telemetryQueue.length > 50) {
        telemetryQueue = telemetryQueue.slice(-50);
    }
    persistTelemetryQueue();

    if (immediate || telemetryQueue.length >= IDENTIFIED_TELEMETRY_BATCH_LIMIT) {
        void flushQueuedTelemetry("immediate");
        return;
    }

    clearTelemetryFlushTimeout();
    telemetryFlushTimeout = window.setTimeout(() => {
        void flushQueuedTelemetry("scheduled");
    }, IDENTIFIED_TELEMETRY_BATCH_WINDOW_MS);
}

export function trackEvent(eventName: string, eventParams?: Record<string, unknown>) {
    const privacySettings = readPrivacySettingsSnapshot();
    const allowAnonymousAnalytics = canUseAnonymousAnalytics(privacySettings);
    const allowIdentifiedAnalytics = canUseIdentifiedAnalytics(privacySettings);
    const preparedEvent = prepareAnalyticsEvent(eventName, eventParams);
    const shouldSyncTaskProgress = TASK_PROGRESS_EVENT_NAMES.has(preparedEvent.canonicalEventName);
    const eventNameForDispatch = preparedEvent.isKnownEvent ? preparedEvent.canonicalEventName : eventName;

    if (!allowAnonymousAnalytics && !allowIdentifiedAnalytics && !shouldSyncTaskProgress) {
        return;
    }

    if (!preparedEvent.isKnownEvent) {
        recordClientDiagnostic("telemetry", "Unsupported telemetry event ignored", {
            eventName,
        });
        console.warn(`[Telemetry] Ignored unsupported event: ${eventName}`);
        return;
    }

    const enrichedParams = getEnrichedEventParams(preparedEvent.enrichedParams);
    const sessionId = typeof enrichedParams?.session_id === "string" ? enrichedParams.session_id : getSessionId();
    const eventTimestampMs = typeof enrichedParams?.event_timestamp_ms === "number"
        ? enrichedParams.event_timestamp_ms
        : Date.now();

    if (allowAnonymousAnalytics && typeof window !== "undefined" && typeof window.gtag === "function") {
        window.gtag("event", eventNameForDispatch, enrichedParams);
    }

    if (!preparedEvent.isKnownEvent || !auth?.currentUser || (!allowIdentifiedAnalytics && !shouldSyncTaskProgress)) {
        return;
    }

    enqueueIdentifiedTelemetryEvent({
        eventId: createAnalyticsEventId(sessionId),
        eventTimestampMs,
        eventName: preparedEvent.canonicalEventName,
        eventParams: enrichedParams,
    }, shouldFlushIdentifiedTelemetryImmediately(preparedEvent.canonicalEventName, enrichedParams, shouldSyncTaskProgress));
}
