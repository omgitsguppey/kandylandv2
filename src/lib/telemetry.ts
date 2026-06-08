import { auth } from "./firebase";
import { prepareAnalyticsEvent } from "./analytics-client-engine";
import { createAnalyticsEventId } from "./analytics-identifiers";
import { buildClientTrackingDecision } from "./analytics/client-tracking-policy";
import destr from "destr";
import { buildAnalyticsSemanticParams } from "./analytics-semantics";
import { buildClientIdentityLinkRecord, getClientSessionId, readClientIdentityLinkRecord, rememberClientIdentityLink } from "./client-session";
import { buildEventIdentityEnvelope } from "./analytics/identity-handoff-engine";
import { buildEventEnvelope } from "./analytics/event-envelope-builder";
import { recordClientDiagnostic } from "./client-diagnostics";
import { authFetch } from "./authFetch";
import {
    canUseAnonymousAnalytics,
    canUseIdentifiedAnalytics,
    readPrivacySettingsSnapshot,
    resolvePrivacyDataAvailabilityReason,
} from "./privacy-consent";
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
type TelemetryTransportReason = "interval" | "page_view" | "visibility" | "pagehide" | "cleanup" | "online" | "priority";
const TASK_PROGRESS_EVENT_NAMES = new Set(BUILT_IN_DAILY_TASKS.map((task) => task.eventName));
const IMMEDIATE_IDENTIFIED_EVENT_NAMES = new Set([
    "semantic_page_viewed",
    "semantic_target_clicked",
    "guided_onboarding_started",
    "guided_onboarding_step_started",
    "guided_onboarding_step_completed",
    "guided_onboarding_completed",
    "onboarding_step_viewed",
    "wallet_opened",
    "wallet_closed_incomplete",
    "gumdrops_purchase_completed",
    "gumdrops_purchase_failed",
    "drop_preview_opened",
    "drop_preview_page_viewed",
    "drop_preview_cta_clicked",
    "unlock_drop_success",
    "viewer_opened",
    "viewer_session_started",
    "viewer_session_completed",
    "file_viewed",
    "watch_session_started",
    "watch_session_ended",
    "watch_score_computed",
    "creator_followed",
    "feedback_submitted",
    "settings_surface_viewed",
    "setting_toggle_changed",
    "setting_action_clicked",
    "setting_save_succeeded",
    "setting_save_failed",
    "data_export_requested",
    "creator_setting_updated",
    "creator_settings_control_plane_saved",
    "account_delete_clicked",
    "account_delete_confirm_opened",
    "account_delete_confirmed",
    "account_delete_cancelled",
    "account_delete_request_submitted",
    "account_delete_failed",
    "account_delete_completed",
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

function getEnrichedEventParams(eventName: string, eventParams?: Record<string, unknown>, options?: {
    eventId?: string;
    eventTimestampMs?: number;
    sessionId?: string;
}) {
    const sanitizedParams = sanitizeEventParams(eventParams) ?? {};

    if (typeof window === "undefined") {
        return Object.keys(sanitizedParams).length > 0 ? sanitizedParams : undefined;
    }

    const isAuthenticated = Boolean(auth?.currentUser);
    const privacySettings = readPrivacySettingsSnapshot();
    const allowIdentifiedAnalytics = canUseIdentifiedAnalytics(privacySettings);
    const privacyDataAvailabilityReason = resolvePrivacyDataAvailabilityReason(privacySettings);
    const identityLink = readClientIdentityLinkRecord();
    const sessionId = options?.sessionId ?? getSessionId();
    const eventTimestampMs = options?.eventTimestampMs ?? Date.now();
    const identityEnvelope = buildEventIdentityEnvelope({
        eventName,
        guestId: identityLink?.anonymousVisitorId ?? undefined,
        userId: auth?.currentUser?.uid ?? undefined,
        sessionId,
        linkId: identityLink?.identityLinkId,
        consentMode: privacySettings.consentMode,
    });
    const eventEnvelope = buildEventEnvelope({
        eventId: options?.eventId,
        eventName,
        timestamp: eventTimestampMs,
        guestId: identityLink?.anonymousVisitorId ?? undefined,
        userId: auth?.currentUser?.uid ?? undefined,
        sessionId,
        linkId: identityLink?.identityLinkId,
        consentMode: privacySettings.consentMode,
        source: "client",
        metadata: sanitizedParams,
    });
    const viewportWidth = Math.round(window.innerWidth || 0);
    const viewportHeight = Math.round(window.innerHeight || 0);
    const enriched: Record<string, string | number | boolean> = {
        ...sanitizedParams,
        page_path: window.location.pathname,
        event_id: eventEnvelope.eventId,
        event_name: eventEnvelope.eventName,
        event_version: eventEnvelope.eventVersion,
        session_id: sessionId,
        consent_mode: privacySettings.consentMode,
        actor_kind: identityEnvelope.actorKind,
        identity_state: identityEnvelope.identityState,
        identity_confidence: identityEnvelope.identityConfidence,
        identity_link_id: identityEnvelope.linkId ?? "",
        guest_id: identityEnvelope.guestId ?? "",
        unavailable_guest_reason: identityEnvelope.unavailableGuestReason ?? "",
        include_in_user_behavior: identityEnvelope.includeInUserBehavior,
        person_level_behavior_allowed: identityEnvelope.linkCandidate?.personLevelBehaviorAllowed ?? false,
        actorKind: identityEnvelope.actorKind,
        identityState: identityEnvelope.identityState,
        identityConfidence: identityEnvelope.identityConfidence,
        consentMode: identityEnvelope.consentMode,
        sessionId: identityEnvelope.sessionId,
        linkId: identityEnvelope.linkId ?? "",
        eventEnvelopeVersion: eventEnvelope.eventVersion,
        featureId: eventEnvelope.featureId,
        materializerLane: eventEnvelope.materializerLane,
        debugVisibility: eventEnvelope.debugVisibility,
        scoreImpact: eventEnvelope.scoreImpact,
        privacyClass: eventEnvelope.privacyClass,
        eventEnvelopePipelineStatus: eventEnvelope.pipelineStatus,
        eventEnvelopeQuarantineReason: eventEnvelope.quarantineReason ?? "",
        event_envelope_version: eventEnvelope.eventVersion,
        feature_id: eventEnvelope.featureId,
        materializer_lane: eventEnvelope.materializerLane,
        debug_visibility: eventEnvelope.debugVisibility,
        score_impact: eventEnvelope.scoreImpact,
        privacy_class: eventEnvelope.privacyClass,
        event_envelope_pipeline_status: eventEnvelope.pipelineStatus,
        event_envelope_quarantine_reason: eventEnvelope.quarantineReason ?? "",
        viewport_width: viewportWidth,
        viewport_height: viewportHeight,
        is_mobile_viewport: viewportWidth <= 768,
        event_timestamp_ms: eventTimestampMs,
        auth_state: isAuthenticated ? "authenticated" : "guest",
        identified_analytics_allowed: allowIdentifiedAnalytics,
        privacy_data_availability_reason: privacyDataAvailabilityReason,
        metric_exclusion_reason: typeof sanitizedParams.metric_exclusion_reason === "string" && sanitizedParams.metric_exclusion_reason
            ? sanitizedParams.metric_exclusion_reason
            : allowIdentifiedAnalytics ? "" : privacyDataAvailabilityReason,
        privacy_exclusion_reason: allowIdentifiedAnalytics ? "" : privacyDataAvailabilityReason,
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

export async function submitGuestAnalyticsIngestPayload(input: {
    payload: unknown;
    pagePath: string;
    reason: TelemetryTransportReason;
    preferBeacon?: boolean;
    eventCount: number;
}) {
    if (typeof window === "undefined") {
        return false;
    }

    const preferBeacon = input.preferBeacon === true
        || input.reason === "pagehide"
        || input.reason === "visibility"
        || input.reason === "cleanup";
    const body = JSON.stringify(input.payload);
    const blob = new Blob([body], { type: "application/json" });

    try {
        if (preferBeacon && typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
            const accepted = navigator.sendBeacon("/api/analytics/ingest", blob);
            if (!accepted) {
                throw new Error("Guest analytics sendBeacon was rejected");
            }
            return true;
        }

        const response = await fetch("/api/analytics/ingest", {
            method: "POST",
            body: blob,
            keepalive: preferBeacon,
        });
        if (!response.ok) {
            throw new Error(`Guest analytics flush failed (${response.status})`);
        }
        return true;
    } catch (error) {
        recordClientDiagnostic("telemetry", "Guest analytics flush failed", {
            pagePath: input.pagePath,
            reason: input.reason,
            queuedEvents: input.eventCount,
            message: error instanceof Error ? error.message : String(error),
        });
        return false;
    }
}

export function submitRuntimeWatchTelemetryEvent(input: {
    event: unknown;
    ingestEndpoint?: string | null;
    preferBeacon?: boolean;
}) {
    if (!input.ingestEndpoint || typeof window === "undefined") {
        return;
    }

    const body = JSON.stringify({ runtimeWatchEvent: input.event });
    if (
        input.preferBeacon === true
        && typeof navigator !== "undefined"
        && typeof navigator.sendBeacon === "function"
    ) {
        const sent = navigator.sendBeacon(input.ingestEndpoint, new Blob([body], { type: "application/json" }));
        if (sent) {
            return;
        }
    }

    void fetch(input.ingestEndpoint, {
        method: "POST",
        body,
        headers: { "content-type": "application/json" },
        keepalive: input.preferBeacon === true,
    }).catch((error) => {
        recordClientDiagnostic("telemetry", "Runtime watch telemetry flush failed", {
            message: error instanceof Error ? error.message : String(error),
        });
    });
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
            const response = await authFetch("/api/analytics/ingest-identified", {
                method: "POST",
                body: JSON.stringify({ events: batch }),
                keepalive: reason === "pagehide" || reason === "visibility",
            });
            if (!response.ok) {
                throw new Error(`fetch failed with status ${response.status}`);
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
    const trackingDecision = buildClientTrackingDecision({
        eventName: eventNameForDispatch,
        privacySettings,
    });

    if (!trackingDecision.mayQueue && !shouldSyncTaskProgress) {
        return;
    }

    if (!preparedEvent.isKnownEvent) {
        recordClientDiagnostic("telemetry", "Unsupported telemetry event ignored", {
            eventName,
        });
        console.warn(`[Telemetry] Ignored unsupported event: ${eventName}`);
        return;
    }

    const sessionIdForEnvelope = getSessionId();
    const eventTimestampMsForEnvelope = Date.now();
    const eventId = createAnalyticsEventId(sessionIdForEnvelope);
    const enrichedParams = getEnrichedEventParams(eventNameForDispatch, preparedEvent.enrichedParams, {
        eventId,
        eventTimestampMs: eventTimestampMsForEnvelope,
        sessionId: sessionIdForEnvelope,
    });
    const gaDispatchParams = getGaDispatchParams(enrichedParams);
    const sessionId = typeof enrichedParams?.session_id === "string" ? enrichedParams.session_id : getSessionId();
    const eventTimestampMs = typeof enrichedParams?.event_timestamp_ms === "number"
        ? enrichedParams.event_timestamp_ms
        : Date.now();

    if (allowAnonymousAnalytics && trackingDecision.maySendExternal && typeof window !== "undefined" && typeof window.gtag === "function") {
        window.gtag("event", eventNameForDispatch, gaDispatchParams);
        dispatchGaCompanionEvent(eventNameForDispatch, enrichedParams);
    }

    if (
        !preparedEvent.isKnownEvent
        || !auth?.currentUser
        || (!trackingDecision.mayPersist && !allowIdentifiedAnalytics && !shouldSyncTaskProgress)
    ) {
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
        eventId,
        eventTimestampMs,
        eventName: preparedEvent.canonicalEventName,
        eventParams: enrichedParams,
    }, shouldFlushIdentifiedTelemetryImmediately(preparedEvent.canonicalEventName, enrichedParams, shouldSyncTaskProgress));
}

export function trackIdentityLinked(input: {
    userId: string;
    method: "login" | "signup" | "session_restore" | "admin_link" | "import" | "unknown";
    eligiblePastSessionIds?: string[];
}) {
    if (typeof window === "undefined" || !auth?.currentUser?.uid) {
        return;
    }

    const privacySettings = readPrivacySettingsSnapshot();
    const allowIdentifiedAnalytics = canUseIdentifiedAnalytics(privacySettings);
    const privacyDataAvailabilityReason = resolvePrivacyDataAvailabilityReason(privacySettings);
    const consentState = allowIdentifiedAnalytics ? "granted" : "denied";
    const identityLink = buildClientIdentityLinkRecord({
        userId: input.userId,
        method: input.method,
        consentState,
        eligiblePastSessionIds: input.eligiblePastSessionIds,
        source: "client",
    });

    rememberClientIdentityLink(identityLink);

    const preparedEvent = prepareAnalyticsEvent("identity_linked", {
        anonymous_visitor_id: identityLink.anonymousVisitorId ?? "",
        session_id: identityLink.sessionId,
        user_id: identityLink.userId,
        linked_at: identityLink.linkedAt,
        method: identityLink.method,
        eligible_past_session_ids: identityLink.eligiblePastSessionIds,
        confidence: identityLink.persisted ? "high" : "medium",
        diagnostic_only: true,
        metric_eligible: false,
        metric_exclusion_reason: "client_observed_identity_link",
        privacy_exclusion_reason: allowIdentifiedAnalytics ? "" : privacyDataAvailabilityReason,
        privacy_data_availability_reason: privacyDataAvailabilityReason,
        identity_persistence_allowed: identityLink.persisted,
        consent_state: identityLink.consentState,
        source_truth: "client_supporting",
        source_component: "client_identity_link_observer",
        source_confidence: allowIdentifiedAnalytics ? 0.7 : 0.45,
        canonical_link_source: "server_identity_link",
    });
    const sessionIdForEnvelope = getSessionId();
    const eventTimestampMsForEnvelope = Date.now();
    const eventId = createAnalyticsEventId(sessionIdForEnvelope);
    const enrichedParams = getEnrichedEventParams(preparedEvent.canonicalEventName, {
        ...preparedEvent.enrichedParams,
        consent_state: allowIdentifiedAnalytics ? "granted" : "denied",
        identified_analytics_allowed: allowIdentifiedAnalytics,
        privacy_data_availability_reason: privacyDataAvailabilityReason,
        diagnostic_only: true,
        metric_eligible: false,
        metric_exclusion_reason: "client_observed_identity_link",
        privacy_exclusion_reason: allowIdentifiedAnalytics ? "" : privacyDataAvailabilityReason,
        source_truth: "client_supporting",
        source_component: "client_identity_link_observer",
        canonical_link_source: "server_identity_link",
    }, {
        eventId,
        eventTimestampMs: eventTimestampMsForEnvelope,
        sessionId: sessionIdForEnvelope,
    });
    const sessionId = typeof enrichedParams?.session_id === "string" ? enrichedParams.session_id : getSessionId();
    const eventTimestampMs = typeof enrichedParams?.event_timestamp_ms === "number"
        ? enrichedParams.event_timestamp_ms
        : Date.now();

    enqueueIdentifiedTelemetryEvent({
        eventId,
        eventTimestampMs,
        eventName: preparedEvent.canonicalEventName,
        eventParams: enrichedParams,
    }, true);
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
