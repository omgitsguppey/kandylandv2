import { auth } from "./firebase";
import { prepareAnalyticsEvent } from "./analytics-client-engine";
import { createAnalyticsEventId } from "./analytics-identifiers";
import destr from "destr";
import { buildAnalyticsSemanticParams } from "./analytics-semantics";
import { getClientSessionId } from "./client-session";
import { recordClientDiagnostic } from "./client-diagnostics";
import { canUseAnonymousAnalytics, canUseIdentifiedAnalytics, readPrivacySettingsSnapshot } from "./privacy-consent";
import { BUILT_IN_DAILY_TASKS } from "./tasks/task-catalog";
import type { RolloutTelemetryContext } from "./rollouts";
import {
    type SanitizedTelemetryParams,
    sanitizeTelemetryParamsForBackend,
    sanitizeTelemetryParamsForGa4,
} from "./telemetry-safety";

/**
 * Fire-and-forget telemetry tracking.
 * Sends analytics to GA when available and mirrors them to the backend for authenticated users.
 */
const FLOW_STORAGE_KEY = "kandydrops.telemetry.flows";

type SanitizedEventParams = SanitizedTelemetryParams;
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
    "feedback_submitted",
    "wallet_opened",
    "wallet_closed_incomplete",
    "drop_preview_opened",
    "auth_sign_up_success",
    "creator_followed",
    "viewer_opened",
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
let telemetryRolloutContext: RolloutTelemetryContext | null = null;
let telemetryReleaseContext: SanitizedEventParams | null = null;

function sanitizeEventParams(eventParams?: Record<string, unknown>) {
    return sanitizeTelemetryParamsForBackend(eventParams);
}

function readJsonStorage<T>(storageKey: string): T | null {
    if (typeof window === "undefined") {
        return null;
    }

    try {
        const raw = window.localStorage.getItem(storageKey);
        return raw ? destr<T>(raw) : null;
    } catch {
        return null;
    }
}

function writeJsonStorage(storageKey: string, value: unknown) {
    if (typeof window === "undefined") {
        return;
    }

    try {
        window.localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
        // Ignore storage write failures in private browsing / restricted contexts.
    }
}

function ensureTelemetryQueueLoaded() {
    // No-op, queue is now purely in-memory
}

function persistTelemetryQueue() {
    // No-op, queue is now purely in-memory
}

function clearPersistedTelemetryQueue() {
    // No-op, queue is now purely in-memory
}

export function syncIdentifiedTelemetryOwnership(userId: string | null) {
    ensureTelemetryQueueLoaded();

    if (!userId) {
        telemetryQueue = [];
        telemetryQueueUserId = null;
        clearTelemetryFlushTimeout();
        clearPersistedTelemetryQueue();
        return;
    }

    if (telemetryQueueUserId && telemetryQueueUserId !== userId) {
        telemetryQueue = [];
        clearTelemetryFlushTimeout();
        clearPersistedTelemetryQueue();
    }

    telemetryQueueUserId = userId;
    persistTelemetryQueue();
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
    const enriched: Record<string, string | number | boolean> = {
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
        ...(telemetryRolloutContext ?? {}),
        ...(telemetryReleaseContext ?? {}),
    };

    return sanitizeTelemetryParamsForBackend(enriched);
}

function getGaDispatchParams(eventParams?: SanitizedEventParams) {
    return sanitizeTelemetryParamsForGa4(eventParams);
}

function dispatchGaCompanionEvent(eventName: string, eventParams?: SanitizedEventParams) {
    if (typeof window === "undefined" || typeof window.gtag !== "function") {
        return;
    }

    if (eventName === "auth_sign_in_success" || eventName === "auth_google_sign_in_success") {
        window.gtag("event", "login", sanitizeTelemetryParamsForGa4({
            method: eventName === "auth_google_sign_in_success" ? "Google" : "Email",
        }));
        return;
    }

    if (eventName === "auth_sign_up_success") {
        window.gtag("event", "sign_up", sanitizeTelemetryParamsForGa4({
            method: eventParams?.signup_intent === "creator" ? "CreatorEmail" : "Email",
        }));
    }
}

export function syncTelemetryRolloutContext(context: RolloutTelemetryContext | null) {
    telemetryRolloutContext = context;
}

export function syncTelemetryReleaseContext(context: SanitizedEventParams | null) {
    telemetryReleaseContext = context;
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

    telemetryFlushInFlight = (async () => {
        try {
            if ((reason === "pagehide" || reason === "visibility") && typeof navigator !== "undefined" && navigator.sendBeacon) {
                // Use sendBeacon for unload events to ensure 100% accuracy during tab closure
                const beaconPayload = new Blob([JSON.stringify({ events: batch })], { type: "application/json" });
                const endpoint = "/api/analytics/ingest-identified";
                const success = navigator.sendBeacon(endpoint, beaconPayload);
                if (!success) {
                   throw new Error("sendBeacon returned false");
                }
            } else {
                const endpoint = "/api/analytics/ingest-identified";
                const response = await fetch(endpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ events: batch }),
                    keepalive: true,
                });
                if (!response.ok) {
                    throw new Error(`fetch failed with status ${response.status}`);
                }
            }
        } catch (error) {
            telemetryQueue = [...batch, ...telemetryQueue].slice(-50);
            persistTelemetryQueue();
            recordClientDiagnostic("telemetry", "Identified telemetry batch failed", {
                reason,
                batchSize: batch.length,
                message: error instanceof Error ? error.message : String(error),
            });
        }
    })().finally(() => {
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
    const gaDispatchParams = getGaDispatchParams(enrichedParams);
    const sessionId = typeof enrichedParams?.session_id === "string" ? enrichedParams.session_id : getSessionId();
    const eventTimestampMs = typeof enrichedParams?.event_timestamp_ms === "number"
        ? enrichedParams.event_timestamp_ms
        : Date.now();

    if (allowAnonymousAnalytics && typeof window !== "undefined" && typeof window.gtag === "function") {
        window.gtag("event", eventNameForDispatch, gaDispatchParams);
        dispatchGaCompanionEvent(eventNameForDispatch, enrichedParams);
    }

    if (!preparedEvent.isKnownEvent || !auth?.currentUser || (!allowIdentifiedAnalytics && !shouldSyncTaskProgress)) {
        return;
    }

    const trackingSources = typeof enrichedParams?.tracking_sources === "string"
        ? enrichedParams.tracking_sources.split("|")
        : ["client", "backend", "ga4"];

    const shouldSendToBackend = trackingSources.includes("client") || trackingSources.includes("backend") || trackingSources.includes("canonical");

    if (!shouldSendToBackend && !shouldSyncTaskProgress) {
        return;
    }

    enqueueIdentifiedTelemetryEvent({
        eventId: createAnalyticsEventId(sessionId),
        eventTimestampMs,
        eventName: preparedEvent.canonicalEventName,
        eventParams: enrichedParams,
    }, shouldFlushIdentifiedTelemetryImmediately(preparedEvent.canonicalEventName, enrichedParams, shouldSyncTaskProgress));
}

export function __getTelemetryStateForTesting() {
    return {
        userId: telemetryQueueUserId,
        events: [...telemetryQueue],
    };
}

export function __setTelemetryStateForTesting(userId: string | null, events: any[]) {
    telemetryQueueUserId = userId;
    telemetryQueue = [...events];
}
