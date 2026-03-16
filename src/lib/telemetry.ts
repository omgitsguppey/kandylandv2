import { auth } from "./firebase";
import { authFetch } from "./authFetch";
import { prepareAnalyticsEvent } from "./analytics-client-engine";
import { buildAnalyticsSemanticParams } from "./analytics-semantics";
import { canUseAnonymousAnalytics, canUseIdentifiedAnalytics, readPrivacySettingsSnapshot } from "./privacy-consent";
import { BUILT_IN_DAILY_TASKS } from "./tasks/task-catalog";

/**
 * Fire-and-forget telemetry tracking.
 * Sends analytics to GA when available and mirrors them to the backend for authenticated users.
 */
const FLOW_STORAGE_KEY = "kandydrops.telemetry.flows";
const SESSION_STORAGE_KEY = "kandydrops.telemetry.session";

type SanitizedEventParams = Record<string, string | number | boolean>;
const TASK_PROGRESS_EVENT_NAMES = new Set(BUILT_IN_DAILY_TASKS.map((task) => task.eventName));

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

function getSessionId() {
    if (typeof window === "undefined") {
        return "server";
    }

    const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) {
        return existing;
    }

    const token = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID().slice(0, 8)
        : Math.random().toString(36).slice(2, 10);
    const generated = `sess_${Date.now().toString(36)}_${token}`;
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, generated);
    return generated;
}

function getEnrichedEventParams(eventParams?: Record<string, unknown>) {
    const sanitizedParams = sanitizeEventParams(eventParams) ?? {};

    if (typeof window === "undefined") {
        return Object.keys(sanitizedParams).length > 0 ? sanitizedParams : undefined;
    }

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
        auth_state: auth.currentUser ? "authenticated" : "guest",
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

    const enrichedParams = getEnrichedEventParams(preparedEvent.enrichedParams);

    if (allowAnonymousAnalytics && typeof window !== "undefined" && typeof window.gtag === "function") {
        window.gtag("event", eventNameForDispatch, enrichedParams);
    }

    if (!preparedEvent.isKnownEvent || !auth.currentUser || (!allowIdentifiedAnalytics && !shouldSyncTaskProgress)) {
        return;
    }

    // We don't await this because analytics/task syncing should never block UI.
    authFetch("/api/telemetry/track", {
        method: "POST",
        body: JSON.stringify({ eventName: preparedEvent.canonicalEventName, eventParams: enrichedParams }),
    }).catch((err) => {
        // Silently fail on the client if telemetry drops.
        console.error("[Telemetry] Failed to track event:", err);
    });
}
