"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { useAuthIdentity } from "@/context/AuthContext";
import { auth } from "@/lib/firebase";
import { createAnalyticsEventId, createAnalyticsBatchId, isValidAnalyticsBatchId } from "@/lib/analytics-identifiers";
import { buildEventIdentityEnvelope } from "@/lib/analytics/identity-handoff-engine";
import { getClientAnalyticsIdentitySnapshot } from "@/lib/client-session";
import { recordClientDiagnostic } from "@/lib/client-diagnostics";
import { buildAnalyticsSemanticParams, resolveAnalyticsSemanticContext } from "@/lib/analytics-semantics";
import { buildClientTrackingDecision } from "@/lib/analytics/client-tracking-policy";
import { canUseBehavioralAnalytics, readPrivacySettingsSnapshot, subscribeToPrivacySettings } from "@/lib/privacy-consent";
import {
    shouldAdvanceGuestAnalyticsQueue,
    submitGuestAnalyticsIngestPayload,
    trackEvent,
} from "@/lib/telemetry";
import {
    closeSession,
    startSession,
    updateSessionActivity,
    resolveSessionTelemetryPolicy,
} from "@/lib/analytics/session-metrics-engine";
import {
    CLIENT_TELEMETRY_NON_PRIORITY_FLUSH_INTERVAL_MS,
    CLIENT_TELEMETRY_NON_PRIORITY_QUEUE_CAP,
    CLIENT_TELEMETRY_PRIORITY_FLUSH_DELAY_MS,
    classifyClientTelemetryEventPriority,
    resolveClientTelemetryRetryDelayMs,
    shouldFlushClientTelemetryOnNextTurn,
} from "@/lib/analytics/client-telemetry-priority";

import { calculateSessionActiveMs } from "@/lib/math/session-journey-math";

import { SESSION_MEASUREMENT_VERSION, readSessionMeasurementCheckpoint, readSessionMeasurementFromParams, serializeSessionMeasurementCheckpoint, type SessionMeasurementCheckpoint } from "@/lib/analytics/session-metrics-contract";
import { ANALYTICS_CLIENT_ID_PATTERN } from "@/lib/analytics/ingest-contract";

type TelemetryEventType = "click" | "hover" | "scroll" | "visibility" | "page_view" | "page_leave" | "session";
type GuestSemanticEventName =
    | "semantic_page_viewed"
    | "semantic_target_clicked"
    | "semantic_page_engaged"
    | "semantic_page_passive"
    | "semantic_page_bounced"
    | "semantic_page_exited"
    | "session_started"
    | "session_activity_tick"
    | "session_meaningful_interaction"
    | "session_closed"
    | "session_bounced"
    | "session_engaged";

export interface TelemetryEvent {
    type: TelemetryEventType;
    timestamp: number;
    path: string;
    sessionMeasurement?: SessionMeasurementCheckpoint;
    queueIdentity?: StableGuestAnalyticsBatch["identity"];
    targetId?: string;
    targetTag?: string;
    targetText?: string;
    dropId?: string;
    dropCategory?: string;
    x?: number;
    y?: number;
    scrollDepthPercent?: number;
    durationMs?: number;
    referrerHost?: string;
    viewportWidth?: number;
    viewportHeight?: number;
    devicePixelRatio?: number;
    networkType?: string;
    interactionState?: "engaged" | "passive";
    exitIntent?: "bounce" | "exit";
    clickCount?: number;
    hoverCount?: number;
    scrollCount?: number;
    semanticCategory?: string;
    semanticCategoryLabel?: string;
    semanticScopeKey?: string;
    semanticScopeLabel?: string;
    semanticSurfaceKey?: string;
    semanticSurfaceLabel?: string;
    semanticEventName?: GuestSemanticEventName;
    semanticExitEventName?: GuestSemanticEventName;
    activeMs?: number;
    idleMs?: number;
    hiddenMs?: number;
    routeCount?: number;
    eventCount?: number;
    meaningfulInteractionCount?: number;
    conversionCount?: number;
    bounceStatus?: "bounced" | "not_bounced" | "unknown";
    engagementStatus?: "engaged" | "passive" | "abandoned" | "unknown";
    sessionConfidence?: string;
    endReason?: string;
}

const GUEST_ANALYTICS_QUEUE_STORAGE_KEY = "kandydrops.analytics.guest-queue";
const GUEST_ANALYTICS_FLUSH_INTERVAL_MS = CLIENT_TELEMETRY_NON_PRIORITY_FLUSH_INTERVAL_MS;
const GUEST_ANALYTICS_MAX_EVENTS_PER_SESSION = CLIENT_TELEMETRY_NON_PRIORITY_QUEUE_CAP;
const GUEST_ANALYTICS_MAX_DIAGNOSTIC_EVENTS_PER_SESSION = 60;
const GUEST_ANALYTICS_MAX_EVENTS_PER_FLUSH = 200;
const SCROLL_MILESTONES = [25, 50, 75, 100] as const;

type GuestAnalyticsFlushReason = "batch" | "page_view" | "visibility" | "pagehide" | "cleanup" | "online" | "priority";
type HoverSummaryState = {
    totalHoverMs: number;
    hoveredTargetCount: number;
    firstHoverAt: number;
    lastHoverAt: number;
    topTarget: string;
    targetCounts: Record<string, number>;
};
type VisibilitySummaryState = {
    visibleCount: number;
    hiddenCount: number;
    totalVisibleMs: number;
    totalHiddenMs: number;
    lastState: "visible" | "hidden";
    lastTransitionAt: number;
};

function canCaptureAnonymousBehavior() {
    return canUseBehavioralAnalytics(readPrivacySettingsSnapshot()) && buildClientTrackingDecision({
        eventName: "semantic_page_viewed",
        eventType: "page_view",
        privacySettings: readPrivacySettingsSnapshot(),
    }).mayPersist;
}

export type StableGuestAnalyticsBatch = {
    signature: string;
    batchId: string;
    eventCount?: number;
    identity?: { anonymousVisitorId: string | null; sessionId: string; consentMode: ReturnType<typeof readPrivacySettingsSnapshot>["consentMode"] };
};

export function buildGuestAnalyticsBatchSignature(events: TelemetryEvent[]) {
    return JSON.stringify(events, (_key, value) => value && typeof value === "object" && !Array.isArray(value)
        ? Object.fromEntries(Object.keys(value).sort().map(key => [key, value[key]])) : value);
}

export function buildGuestAnalyticsIngestPayload(events: TelemetryEvent[], previous?: StableGuestAnalyticsBatch | null) {
    const currentIdentity = getClientAnalyticsIdentitySnapshot("granted");
    const currentPrivacy = readPrivacySettingsSnapshot();
    const signature = buildGuestAnalyticsBatchSignature(events);
    const retained = previous?.signature === signature ? previous : null;
    const identity = retained?.identity ?? events[0]?.queueIdentity ?? { anonymousVisitorId: currentIdentity.anonymousVisitorId, sessionId: currentIdentity.sessionId, consentMode: currentPrivacy.consentMode };
    const envelope = buildEventIdentityEnvelope({ eventName: "semantic_page_viewed", guestId: identity.anonymousVisitorId ?? undefined, sessionId: identity.sessionId, consentMode: identity.consentMode });
    const stableBatch = { signature, batchId: retained?.batchId ?? createAnalyticsBatchId(identity.sessionId), eventCount: events.length, identity };
    return { stableBatch, payload: { batchId: stableBatch.batchId, anonymousVisitorId: identity.anonymousVisitorId ?? undefined, sessionId: identity.sessionId, consentMode: identity.consentMode,
        actorKind: envelope.actorKind, identityState: envelope.identityState, identityConfidence: envelope.identityConfidence, unavailableGuestReason: envelope.unavailableGuestReason,
        events: events.map(({ queueIdentity: _localIdentity, ...event }) => event) } };
}

export function clearStableGuestAnalyticsBatchAfterSuccess(
    stableBatch: StableGuestAnalyticsBatch | null,
    completedSignature: string,
) {
    return stableBatch?.signature === completedSignature ? null : stableBatch;
}

function quantizeCoordinate(value: number) {
    return Math.floor(value / 24) * 24;
}

function isSensitiveTarget(target: HTMLElement) {
    return Boolean(
        target.closest('input, textarea, select, option, [contenteditable="true"], [contenteditable=""], [data-sensitive], [data-private]'),
    );
}

function getSafeTargetLabel(target: HTMLElement) {
    const explicitLabel =
        target.getAttribute("data-telemetry-id")
        || target.getAttribute("data-analytics-label")
        || target.getAttribute("aria-label")
        || target.getAttribute("data-drop-id")
        || target.id;

    if (explicitLabel) {
        return explicitLabel.slice(0, 60);
    }

    return target.tagName;
}

function readStoredGuestIdentity(value: unknown): StableGuestAnalyticsBatch["identity"] | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    if (typeof record.sessionId !== "string" || !ANALYTICS_CLIENT_ID_PATTERN.test(record.sessionId)
        || typeof record.anonymousVisitorId !== "string" || !ANALYTICS_CLIENT_ID_PATTERN.test(record.anonymousVisitorId)
        || typeof record.consentMode !== "string" || !["minimal_analytics", "full_analytics", "full_behavioral"].includes(record.consentMode)) return null;
    return { sessionId: record.sessionId, anonymousVisitorId: record.anonymousVisitorId, consentMode: record.consentMode as NonNullable<StableGuestAnalyticsBatch["identity"]>["consentMode"] };
}

function loadGuestQueueState() {
    if (typeof window === "undefined") return { events: [] as TelemetryEvent[], stableBatch: null as StableGuestAnalyticsBatch | null };
    try {
        const raw = window.sessionStorage.getItem(GUEST_ANALYTICS_QUEUE_STORAGE_KEY);
        const stored: unknown = raw ? JSON.parse(raw) : [];
        const record = stored && typeof stored === "object" && !Array.isArray(stored) ? stored as Record<string, unknown> : null;
        const rows = Array.isArray(stored) ? stored : record?.events;
        const events = Array.isArray(rows) ? rows.slice(0, GUEST_ANALYTICS_MAX_EVENTS_PER_SESSION).flatMap(row => {
            if (!row || typeof row !== "object" || Array.isArray(row)) return [];
            const value = row as Record<string, unknown>;
            if (typeof value.type !== "string" || !["click", "hover", "scroll", "visibility", "page_view", "page_leave", "session"].includes(value.type)
                || typeof value.timestamp !== "number" || !Number.isFinite(value.timestamp)
                || typeof value.path !== "string" || value.path.length > 250) return [];
            const checkpoint = value.sessionMeasurement === undefined ? null : readSessionMeasurementCheckpoint(value.sessionMeasurement);
            if (value.sessionMeasurement !== undefined && !checkpoint) return [];
            const safe: Record<string, unknown> = { type: value.type, timestamp: value.timestamp, path: value.path };
            const strings = ["targetId", "targetTag", "targetText", "dropId", "dropCategory", "semanticCategory", "semanticCategoryLabel", "semanticScopeKey", "semanticScopeLabel", "semanticSurfaceKey", "semanticSurfaceLabel", "referrerHost", "networkType", "interactionState", "exitIntent", "semanticEventName", "semanticExitEventName", "bounceStatus", "engagementStatus", "sessionConfidence", "endReason"];
            for (const key of strings) if (typeof value[key] === "string" && value[key].length <= 250) safe[key] = value[key];
            const numbers = ["x", "y", "scrollDepthPercent", "durationMs", "viewportWidth", "viewportHeight", "devicePixelRatio", "clickCount", "hoverCount", "scrollCount", "activeMs", "idleMs", "hiddenMs", "routeCount", "eventCount", "meaningfulInteractionCount", "conversionCount"];
            for (const key of numbers) if (typeof value[key] === "number" && Number.isFinite(value[key]) && value[key] >= 0 && value[key] <= 86_400_000) safe[key] = value[key];
            if (checkpoint) safe.sessionMeasurement = checkpoint;
            const localIdentity = readStoredGuestIdentity(value.queueIdentity);
            if (localIdentity) safe.queueIdentity = localIdentity;
            return [safe as unknown as TelemetryEvent];
        }) : [];
        const pending = record?.stableBatch && typeof record.stableBatch === "object" && !Array.isArray(record.stableBatch) ? record.stableBatch as Record<string, unknown> : null;
        const identity = readStoredGuestIdentity(pending?.identity);
        const stableBatch = pending && isValidAnalyticsBatchId(pending.batchId)
            && typeof pending.eventCount === "number" && Number.isInteger(pending.eventCount) && pending.eventCount > 0 && pending.eventCount <= events.length && pending.eventCount <= GUEST_ANALYTICS_MAX_EVENTS_PER_FLUSH
            && typeof pending.signature === "string" && pending.signature === buildGuestAnalyticsBatchSignature(events.slice(0, pending.eventCount))
            && identity && typeof identity.sessionId === "string" && ANALYTICS_CLIENT_ID_PATTERN.test(identity.sessionId)
            && typeof identity.anonymousVisitorId === "string" && ANALYTICS_CLIENT_ID_PATTERN.test(identity.anonymousVisitorId)
            && ["minimal_analytics", "full_analytics", "full_behavioral"].includes(identity.consentMode)
            ? { signature: pending.signature, batchId: pending.batchId, eventCount: pending.eventCount, identity } : null;
        return { events, stableBatch };
    } catch { return { events: [] as TelemetryEvent[], stableBatch: null as StableGuestAnalyticsBatch | null }; }
}

function persistGuestQueue(events: TelemetryEvent[], stableBatch: StableGuestAnalyticsBatch | null) {
    if (typeof window === "undefined") return;
    try {
        if (events.length === 0) window.sessionStorage.removeItem(GUEST_ANALYTICS_QUEUE_STORAGE_KEY);
        else window.sessionStorage.setItem(GUEST_ANALYTICS_QUEUE_STORAGE_KEY, JSON.stringify({ version: 2, events: events.slice(0, GUEST_ANALYTICS_MAX_EVENTS_PER_SESSION), stableBatch }));
    } catch { /* Restricted storage does not block the current interaction. */ }
}

function createEmptyHoverSummary(): HoverSummaryState {
    return {
        totalHoverMs: 0,
        hoveredTargetCount: 0,
        firstHoverAt: 0,
        lastHoverAt: 0,
        topTarget: "",
        targetCounts: {},
    };
}

function createVisibilitySummary(nowMs: number): VisibilitySummaryState {
    return {
        visibleCount: 0,
        hiddenCount: 0,
        totalVisibleMs: 0,
        totalHiddenMs: 0,
        lastState: typeof document !== "undefined" && document.visibilityState === "hidden" ? "hidden" : "visible",
        lastTransitionAt: nowMs,
    };
}

function trimNonPriorityQueueForEvent(queue: TelemetryEvent[], event: TelemetryEvent, protectedCount = 0) {
    if (queue.length < GUEST_ANALYTICS_MAX_EVENTS_PER_SESSION) {
        return true;
    }

    const queuedPriority = classifyClientTelemetryEventPriority(event);
    if (queuedPriority !== "non_priority_batch") {
        const firstNonPriorityIndex = queue.findIndex((queuedEvent, index) => index >= protectedCount &&
            classifyClientTelemetryEventPriority(queuedEvent) === "non_priority_batch");
        if (firstNonPriorityIndex >= 0) {
            queue.splice(firstNonPriorityIndex, 1);
            return true;
        }

        if (protectedCount >= queue.length) return false;
        queue.splice(protectedCount, 1);
        return true;
    }

    const firstQueuedNonPriorityIndex = queue.findIndex((queuedEvent, index) => index >= protectedCount &&
        classifyClientTelemetryEventPriority(queuedEvent) === "non_priority_batch");
    if (firstQueuedNonPriorityIndex < 0) {
        return false;
    }

    queue.splice(firstQueuedNonPriorityIndex, 1);
    return true;
}

function readTelemetryContext() {
    return {
        referrerHost: typeof document !== "undefined" && document.referrer
            ? (() => {
                try {
                    return new URL(document.referrer).host || undefined;
                } catch {
                    return undefined;
                }
            })()
            : undefined,
        viewportWidth: typeof window !== "undefined" ? window.innerWidth : undefined,
        viewportHeight: typeof window !== "undefined" ? window.innerHeight : undefined,
        devicePixelRatio: typeof window !== "undefined" ? window.devicePixelRatio : undefined,
        networkType: typeof navigator !== "undefined" && "connection" in navigator
            ? ((navigator as Navigator & { connection?: { effectiveType?: string } }).connection?.effectiveType || undefined)
            : undefined,
    };
}

export function DeepTracker() {
    const { user } = useAuthIdentity();
    const selectedUserId = user?.uid ?? null;
    const measurementSegmentRef = useRef<{ path: string; userId: string | null; id: string; startedAtMs: number } | null>(null);
    const lastCheckpointRef = useRef<SessionMeasurementCheckpoint | null>(null);
    const pageViewPathRef = useRef<string | null>(null);
    const startedSessionsRef = useRef(new Set<string>());
    const pathname = usePathname();
    const [trackingAllowed, setTrackingAllowed] = useState(canCaptureAnonymousBehavior);
    const eventQueue = useRef<TelemetryEvent[]>([]);
    const guestQueueHydratedRef = useRef(false);
    const guestFlushInFlightRef = useRef<Promise<void> | null>(null);
    const lastScrollDepth = useRef<number>(0);
    const clickCountRef = useRef(0);
    const hoverCountRef = useRef(0);
    const scrollCountRef = useRef(0);
    const hoverStart = useRef<Record<string, number>>({});
    const hoverSummaryRef = useRef<HoverSummaryState>(createEmptyHoverSummary());
    const visibilitySummaryRef = useRef<VisibilitySummaryState>(createVisibilitySummary(Date.now()));
    const nextScrollMilestoneIndexRef = useRef(0);
    const scrollRafRef = useRef<number | null>(null);
    const pageEnteredAt = useRef<number>(0);
    const viewerBackgroundTrackedRef = useRef(false);
    const stableGuestBatchRef = useRef<StableGuestAnalyticsBatch | null>(null);
    const finalCloseoutKeyRef = useRef<string | null>(null);
    const lastSessionActivityTickAtRef = useRef(0);

    useEffect(() => {
        return subscribeToPrivacySettings(() => {
            setTrackingAllowed(canCaptureAnonymousBehavior());
        });
    }, []);

    useEffect(() => {
        if (guestQueueHydratedRef.current || typeof window === "undefined") {
            return;
        }

        guestQueueHydratedRef.current = true;
        const stored = loadGuestQueueState();
        eventQueue.current = stored.events;
        stableGuestBatchRef.current = stored.stableBatch;
    }, []);

    useEffect(() => {
        if (trackingAllowed || typeof window === "undefined") {
            return;
        }

        eventQueue.current = [];
        stableGuestBatchRef.current = null;
        persistGuestQueue([], null);
    }, [trackingAllowed]);

    useEffect(() => {
        if (!pathname) {
            return;
        }

        const semanticContext = resolveAnalyticsSemanticContext({ pagePath: pathname });
        const semanticParams = buildAnalyticsSemanticParams({ pagePath: pathname });
        const rawSemanticFields = {
            semanticCategory: semanticContext.category,
            semanticCategoryLabel: semanticContext.categoryLabel,
            semanticScopeKey: semanticContext.scopeKey,
            semanticScopeLabel: semanticContext.scopeLabel,
            semanticSurfaceKey: semanticContext.surfaceKey,
            semanticSurfaceLabel: semanticContext.surfaceLabel,
        } satisfies Partial<TelemetryEvent>;

        let nonPriorityFlushTimeout: number | null = null;
        let priorityFlushTimeout: number | null = null;
        let currentHoverTarget: HTMLElement | null = null;
        let currentHoverKey: string | null = null;
        let finalized = false;
        let disposed = false;
        const actorUserId = auth?.currentUser?.uid ?? selectedUserId;
        const capturedIdentity = getClientAnalyticsIdentitySnapshot("granted");
        const shouldCaptureAnonymousBatch = actorUserId === null;
        const previousSegment = measurementSegmentRef.current;
        const segment = previousSegment && previousSegment.path === pathname && previousSegment.userId === actorUserId && finalCloseoutKeyRef.current !== previousSegment.id
            ? previousSegment : { path: pathname, userId: actorUserId, id: createAnalyticsEventId(capturedIdentity.sessionId), startedAtMs: Date.now() };
        measurementSegmentRef.current = segment;
        if (segment !== previousSegment) lastCheckpointRef.current = null;
        let queuePersistTimeout: number | null = null;
        let guestFlushRetryAttempt = 0;

        pageEnteredAt.current = segment.startedAtMs;
        lastScrollDepth.current = 0;
        clickCountRef.current = 0;
        hoverCountRef.current = 0;
        scrollCountRef.current = 0;
        viewerBackgroundTrackedRef.current = false;
        hoverSummaryRef.current = createEmptyHoverSummary();
        visibilitySummaryRef.current = createVisibilitySummary(pageEnteredAt.current);
        nextScrollMilestoneIndexRef.current = 0;
        lastSessionActivityTickAtRef.current = 0;
        let activitySampleAt = pageEnteredAt.current;
        let lastObservedActivityAt: number | null = null;
        const sessionTime = { activeMs: 0, idleMs: 0, hiddenMs: 0 };
        const settleSessionTime = (now = Date.now()) => {
            const elapsed = Math.max(0, now - activitySampleAt);
            if (visibilitySummaryRef.current.lastState === "hidden") {
                sessionTime.hiddenMs += elapsed;
            } else {
                const activeMs = lastObservedActivityAt === null ? 0 : calculateSessionActiveMs({ intervals: [{
                    startedAtMs: activitySampleAt, endedAtMs: now, foreground: true,
                    lastActivityAtMs: lastObservedActivityAt,
                }] });
                sessionTime.activeMs += activeMs;
                sessionTime.idleMs += elapsed - activeMs;
            }
            activitySampleAt = now;
            return sessionTime;
        };
        const observeActivity = () => {
            const now = Date.now();
            settleSessionTime(now);
            if (document.visibilityState === "visible") lastObservedActivityAt = now;
        };

        const flushQueue = async (
            reason: GuestAnalyticsFlushReason,
            options: { preferBeacon?: boolean } = {},
        ) => {
            if (!trackingAllowed || eventQueue.current.length === 0) {
                return;
            }

            if (guestFlushInFlightRef.current) {
                await guestFlushInFlightRef.current;
                if (!disposed && eventQueue.current.length > 0) scheduleNonPriorityFlush();
                return;
            }

            const firstIdentity = JSON.stringify(eventQueue.current[0]?.queueIdentity ?? null);
            const boundary = eventQueue.current.findIndex(event => JSON.stringify(event.queueIdentity ?? null) !== firstIdentity);
            const count = stableGuestBatchRef.current?.eventCount ?? Math.min(boundary < 0 ? eventQueue.current.length : boundary, GUEST_ANALYTICS_MAX_EVENTS_PER_FLUSH);
            const queuedEvents = eventQueue.current.slice(0, count);
            const { payload, stableBatch } = buildGuestAnalyticsIngestPayload(queuedEvents, stableGuestBatchRef.current);
            stableGuestBatchRef.current = stableBatch;
            persistGuestQueue(eventQueue.current, stableBatch);

            guestFlushInFlightRef.current = (async () => {
                try {
                    const outcome = await submitGuestAnalyticsIngestPayload({
                        payload,
                        pagePath: pathname,
                        reason,
                        preferBeacon: options.preferBeacon,
                        eventCount: queuedEvents.length,
                    });
                    if (stableGuestBatchRef.current?.batchId !== stableBatch.batchId
                        || buildGuestAnalyticsBatchSignature(eventQueue.current.slice(0, queuedEvents.length)) !== stableBatch.signature) return;
                    if (!shouldAdvanceGuestAnalyticsQueue(outcome)) {
                        persistGuestQueue(eventQueue.current, stableGuestBatchRef.current);
                        if (outcome.status === "retryable_failure") scheduleRetainedQueueRetry();
                        return;
                    }
                    guestFlushRetryAttempt = 0;
                    eventQueue.current = eventQueue.current.slice(queuedEvents.length);
                    stableGuestBatchRef.current = clearStableGuestAnalyticsBatchAfterSuccess(
                        stableGuestBatchRef.current,
                        stableBatch.signature,
                    );
                    persistGuestQueue(eventQueue.current, stableGuestBatchRef.current);
                    if (eventQueue.current.length > 0 && document.visibilityState === "visible") {
                        scheduleNonPriorityFlush();
                    }
                } catch {
                    persistGuestQueue(eventQueue.current, stableGuestBatchRef.current);
                    scheduleRetainedQueueRetry();
                } finally {
                    guestFlushInFlightRef.current = null;
                }
            })();

            await guestFlushInFlightRef.current;
        };

        const persistQueueSoon = () => {
            if (disposed) { persistGuestQueue(eventQueue.current, stableGuestBatchRef.current); return; }
            if (queuePersistTimeout !== null) {
                return;
            }

            queuePersistTimeout = window.setTimeout(() => {
                queuePersistTimeout = null;
                persistGuestQueue(eventQueue.current, stableGuestBatchRef.current);
            }, 250);
        };

        const schedulePriorityFlush = () => {
            if (disposed || priorityFlushTimeout !== null) return;
            priorityFlushTimeout = window.setTimeout(() => {
                priorityFlushTimeout = null;
                void flushQueue("priority");
            }, CLIENT_TELEMETRY_PRIORITY_FLUSH_DELAY_MS);
        };

        const scheduleNonPriorityFlush = (delayMs = GUEST_ANALYTICS_FLUSH_INTERVAL_MS) => {
            if (disposed) return;
            if (nonPriorityFlushTimeout !== null) {
                return;
            }

            nonPriorityFlushTimeout = window.setTimeout(() => {
                nonPriorityFlushTimeout = null;
                if (document.visibilityState === "visible") {
                    void flushQueue("batch");
                }
            }, delayMs);
        };

        const scheduleRetainedQueueRetry = () => {
            guestFlushRetryAttempt += 1;
            const retryDelayMs = resolveClientTelemetryRetryDelayMs(guestFlushRetryAttempt);
            if (retryDelayMs === null || document.visibilityState !== "visible") {
                return;
            }
            scheduleNonPriorityFlush(retryDelayMs);
        };

        const pushEvent = (event: TelemetryEvent) => {
            if (!trackingAllowed || !shouldCaptureAnonymousBatch) {
                return;
            }

            const trackingDecision = buildClientTrackingDecision({
                eventName: event.semanticEventName ?? event.type,
                eventType: event.type,
                privacySettings: readPrivacySettingsSnapshot(),
            });
            if (!trackingDecision.mayQueue || !trackingDecision.mayPersist) {
                return;
            }

            const priority = classifyClientTelemetryEventPriority(event);
            if (priority === "debug_only" && process.env.NODE_ENV === "production") {
                return;
            }

            const isDiagnosticEvent = event.type === "hover" || event.type === "visibility" || event.type === "page_leave";
            if (isDiagnosticEvent) {
                const diagnosticCount = eventQueue.current.filter((queuedEvent) =>
                    queuedEvent.type === "hover" || queuedEvent.type === "visibility" || queuedEvent.type === "page_leave").length;
                if (diagnosticCount >= GUEST_ANALYTICS_MAX_DIAGNOSTIC_EVENTS_PER_SESSION) {
                    return;
                }
            }

            if (!trimNonPriorityQueueForEvent(eventQueue.current, event, stableGuestBatchRef.current?.eventCount ?? 0)) {
                return;
            }

            if (eventQueue.current.length >= GUEST_ANALYTICS_MAX_EVENTS_PER_SESSION) {
                recordClientDiagnostic("telemetry", "Guest analytics queue trimmed", {
                    pagePath: pathname,
                });
            }

            eventQueue.current.push({ ...event, queueIdentity: { anonymousVisitorId: capturedIdentity.anonymousVisitorId, sessionId: capturedIdentity.sessionId, consentMode: readPrivacySettingsSnapshot().consentMode } });
            guestFlushRetryAttempt = 0;
            persistQueueSoon();
            if (shouldFlushClientTelemetryOnNextTurn(event)) {
                schedulePriorityFlush();
            } else {
                scheduleNonPriorityFlush();
            }
        };

        const makeCheckpoint = (status: "checkpoint" | "final", endedAtMs = Date.now()) => {
            settleSessionTime(endedAtMs);
            const next = { version: SESSION_MEASUREMENT_VERSION, segmentId: segment.id, sequence: (lastCheckpointRef.current?.sequence ?? 0) + 1,
                startedAtMs: segment.startedAtMs, endedAtMs, activeMs: sessionTime.activeMs, idleMs: sessionTime.idleMs, hiddenMs: sessionTime.hiddenMs, status } satisfies SessionMeasurementCheckpoint;
            const previous = lastCheckpointRef.current;
            if (previous && previous.endedAtMs === next.endedAtMs && previous.activeMs === next.activeMs && previous.idleMs === next.idleMs && previous.hiddenMs === next.hiddenMs && previous.status === next.status) return previous;
            lastCheckpointRef.current = next;
            return next;
        };

        const trackObservedEvent = (eventName: string, eventParams: Record<string, unknown>) => {
            const measurement = eventName.startsWith("session_") ? readSessionMeasurementFromParams(eventParams) ?? makeCheckpoint("checkpoint") : readSessionMeasurementFromParams(eventParams);
            const timestamp = measurement?.endedAtMs ?? Date.now();
            const params = { ...eventParams, source_truth: "client_supporting", ...(measurement ? { session_measurement: serializeSessionMeasurementCheckpoint(measurement) } : {}) };
            trackEvent(eventName, params, { firstParty: !shouldCaptureAnonymousBatch, expectedUserId: actorUserId, eventTimestampMs: timestamp, sessionId: capturedIdentity.sessionId, pagePath: pathname });
            if (shouldCaptureAnonymousBatch && eventName.startsWith("session_")) {
                const checkpoint = measurement;
                pushEvent({ type: "session", semanticEventName: eventName as GuestSemanticEventName, timestamp, path: pathname, targetId: "DeepTracker",
                    ...(checkpoint ? { sessionMeasurement: checkpoint } : {}), activeMs: checkpoint?.activeMs, idleMs: checkpoint?.idleMs, hiddenMs: checkpoint?.hiddenMs,
                    ...rawSemanticFields });
            }
        };

        const emitSessionActivityTick = () => {
            if (document.visibilityState !== "visible") {
                return;
            }

            const now = Date.now();
            const tickPolicy = resolveSessionTelemetryPolicy({
                eventName: "session_activity_tick",
                lastActivityTickAtMs: lastSessionActivityTickAtRef.current,
                nowMs: now,
            });
            if (!tickPolicy.shouldEmit) {
                return;
            }

            const checkpoint = makeCheckpoint("checkpoint", now);
            lastSessionActivityTickAtRef.current = now;
            trackObservedEvent("session_activity_tick", {
                ...semanticParams,
                page_path: pathname,
                session_id: getClientAnalyticsIdentitySnapshot("granted").sessionId,
                session_measurement: serializeSessionMeasurementCheckpoint(checkpoint),
                active_ms: sessionTime.activeMs,
                idle_ms: sessionTime.idleMs,
                hidden_ms: sessionTime.hiddenMs,
                bounce_status: "unknown",
                engagement_status: "engaged",
                source_component: "DeepTracker",
            });
        };

        const closeCurrentHover = () => {
            if (!currentHoverTarget || !currentHoverKey) {
                return;
            }

            const hoverStartedAt = hoverStart.current[currentHoverKey];
            if (!hoverStartedAt) {
                currentHoverTarget = null;
                currentHoverKey = null;
                return;
            }

            const duration = Date.now() - hoverStartedAt;
            delete hoverStart.current[currentHoverKey];
            if (duration > 1000) {
                hoverCountRef.current += 1;
                emitSessionActivityTick();
                const label = getSafeTargetLabel(currentHoverTarget);
                const summary = hoverSummaryRef.current;
                summary.totalHoverMs += duration;
                summary.hoveredTargetCount += 1;
                summary.firstHoverAt = summary.firstHoverAt || hoverStartedAt;
                summary.lastHoverAt = Date.now();
                summary.targetCounts[label] = (summary.targetCounts[label] || 0) + 1;
                summary.topTarget = Object.entries(summary.targetCounts)
                    .sort((left, right) => right[1] - left[1])[0]?.[0] || label;
            }

            currentHoverTarget = null;
            currentHoverKey = null;
        };

        const updateVisibilitySummary = (nextState: "visible" | "hidden") => {
            const now = Date.now();
            settleSessionTime(now);
            const summary = visibilitySummaryRef.current;
            const elapsed = Math.max(0, now - summary.lastTransitionAt);
            if (summary.lastState === "visible") {
                summary.totalVisibleMs += elapsed;
            } else {
                summary.totalHiddenMs += elapsed;
            }

            if (nextState !== summary.lastState) {
                if (nextState === "visible") {
                    summary.visibleCount += 1;
                } else {
                    summary.hiddenCount += 1;
                }
            }

            summary.lastState = nextState;
            summary.lastTransitionAt = now;
        };

        const emitHoverSummary = () => {
            closeCurrentHover();
            const summary = hoverSummaryRef.current;
            if (summary.hoveredTargetCount <= 0 || summary.totalHoverMs <= 0) {
                return;
            }

            pushEvent({
                type: "hover",
                timestamp: Date.now(),
                path: pathname,
                targetId: "hover_summary",
                targetTag: "SUMMARY",
                targetText: summary.topTarget || "hover_summary",
                durationMs: summary.totalHoverMs,
                hoverCount: summary.hoveredTargetCount,
                ...rawSemanticFields,
            });
            hoverSummaryRef.current = createEmptyHoverSummary();
        };

        const emitVisibilitySummary = () => {
            updateVisibilitySummary(document.visibilityState === "hidden" ? "hidden" : "visible");
            const summary = visibilitySummaryRef.current;
            if (summary.visibleCount + summary.hiddenCount <= 0 && summary.totalVisibleMs <= 0 && summary.totalHiddenMs <= 0) {
                return;
            }

            pushEvent({
                type: "visibility",
                timestamp: Date.now(),
                path: pathname,
                targetId: "visibility_summary",
                targetTag: "SUMMARY",
                targetText: summary.lastState,
                durationMs: summary.totalVisibleMs,
                clickCount: summary.visibleCount,
                scrollCount: summary.hiddenCount,
                ...rawSemanticFields,
            });
        };

        const emitScrollSummary = () => {
            if (lastScrollDepth.current <= 0) {
                return;
            }

            pushEvent({
                type: "scroll",
                timestamp: Date.now(),
                path: pathname,
                targetId: "scroll_summary",
                targetTag: "SUMMARY",
                targetText: "scroll_summary",
                scrollDepthPercent: lastScrollDepth.current,
                scrollCount: scrollCountRef.current,
                ...rawSemanticFields,
            });
        };

        const emitPageSummary = (reason: "pagehide" | "cleanup" | "visibility") => {
            if (reason === "visibility") {
                const checkpoint = makeCheckpoint("checkpoint");
                trackObservedEvent("session_activity_tick", { ...semanticParams, page_path: pathname, session_id: capturedIdentity.sessionId, session_measurement: serializeSessionMeasurementCheckpoint(checkpoint), active_ms: checkpoint.activeMs, idle_ms: checkpoint.idleMs, hidden_ms: checkpoint.hiddenMs, source_component: "DeepTracker" });
                persistGuestQueue(eventQueue.current, stableGuestBatchRef.current);
                void flushQueue(reason, { preferBeacon: true });
                return;
            }
            // StrictMode setup/cleanup replay has no observed interval or action to finalize.
            if (Date.now() === segment.startedAtMs && clickCountRef.current + hoverCountRef.current + scrollCountRef.current === 0) return;
            const closeoutKey = segment.id;
            if (finalCloseoutKeyRef.current === closeoutKey) {
                return;
            }

            if (finalized) {
                return;
            }

            finalized = true;
            finalCloseoutKeyRef.current = closeoutKey;
            emitHoverSummary();
            emitVisibilitySummary();
            emitScrollSummary();
            const now = Date.now();
            const durationMs = Math.max(0, now - pageEnteredAt.current);
            const visibilitySummary = visibilitySummaryRef.current;
            const meaningfulInteractionCount = clickCountRef.current
                + hoverCountRef.current
                + scrollCountRef.current
                + (lastScrollDepth.current >= 25 ? 1 : 0);
            const sessionTime = settleSessionTime(now);
            const sessionMetric = closeSession(updateSessionActivity(startSession({
                sessionId: getClientAnalyticsIdentitySnapshot("granted").sessionId,
                actorKind: actorUserId ? "signed_in" : "guest",
                userId: actorUserId,
                guestId: getClientAnalyticsIdentitySnapshot("granted").anonymousVisitorId,
                startedAt: pageEnteredAt.current,
                routeCount: 1,
            }), {
                at: now,
                activeMsDelta: sessionTime.activeMs,
                idleMsDelta: sessionTime.idleMs,
                foregroundMsDelta: sessionTime.activeMs + sessionTime.idleMs + sessionTime.hiddenMs,
                hiddenMsDelta: sessionTime.hiddenMs,
                eventCountDelta: clickCountRef.current + hoverCountRef.current + scrollCountRef.current + 1,
                meaningfulInteractionCountDelta: meaningfulInteractionCount,
            }), {
                endedAt: now,
                endReason: reason === "pagehide" ? "pagehide" : "cleanup",
                closeoutObserved: true,
            });
            const checkpoint = makeCheckpoint("final", now);
            const engaged = sessionMetric.engagementStatus === "engaged";
            const exitIntent = sessionMetric.bounceStatus === "bounced" ? "bounce" : "exit";

            pushEvent({
                type: "page_leave",
                semanticEventName: engaged ? "semantic_page_engaged" : "semantic_page_passive",
                semanticExitEventName: exitIntent === "bounce" ? "semantic_page_bounced" : "semantic_page_exited",
                timestamp: now,
                path: pathname,
                durationMs,
                sessionMeasurement: checkpoint,
                scrollDepthPercent: lastScrollDepth.current,
                interactionState: engaged ? "engaged" : "passive",
                exitIntent,
                clickCount: clickCountRef.current,
                hoverCount: hoverCountRef.current,
                scrollCount: scrollCountRef.current,
                activeMs: sessionMetric.activeMs,
                idleMs: sessionMetric.idleMs,
                hiddenMs: sessionMetric.hiddenMs,
                routeCount: sessionMetric.routeCount,
                eventCount: sessionMetric.eventCount,
                meaningfulInteractionCount: sessionMetric.meaningfulInteractionCount,
                conversionCount: sessionMetric.conversionCount,
                bounceStatus: sessionMetric.bounceStatus,
                engagementStatus: sessionMetric.engagementStatus,
                sessionConfidence: sessionMetric.confidence,
                endReason: sessionMetric.endReason,
                ...rawSemanticFields,
                ...readTelemetryContext(),
            });

            trackObservedEvent("session_closed", {
                ...semanticParams,
                page_path: pathname,
                session_id: sessionMetric.sessionId,
                session_measurement: serializeSessionMeasurementCheckpoint(checkpoint),
                active_ms: sessionMetric.activeMs,
                idle_ms: sessionMetric.idleMs,
                hidden_ms: sessionMetric.hiddenMs,
                route_count: sessionMetric.routeCount,
                event_count: sessionMetric.eventCount,
                meaningful_interaction_count: sessionMetric.meaningfulInteractionCount,
                conversion_count: sessionMetric.conversionCount,
                bounce_status: sessionMetric.bounceStatus,
                engagement_status: sessionMetric.engagementStatus,
                confidence: sessionMetric.confidence,
                end_reason: sessionMetric.endReason,
            });

            trackObservedEvent(sessionMetric.bounceStatus === "bounced" ? "session_bounced" : "session_engaged", {
                ...semanticParams,
                page_path: pathname,
                session_id: sessionMetric.sessionId,
                session_measurement: serializeSessionMeasurementCheckpoint(checkpoint),
                active_ms: sessionMetric.activeMs,
                idle_ms: sessionMetric.idleMs,
                hidden_ms: sessionMetric.hiddenMs,
                bounce_status: sessionMetric.bounceStatus,
                engagement_status: sessionMetric.engagementStatus,
                end_reason: sessionMetric.endReason,
            });

            trackObservedEvent(engaged ? "semantic_page_engaged" : "semantic_page_passive", {
                ...semanticParams,
                page_path: pathname,
                duration_ms: durationMs,
                session_measurement: serializeSessionMeasurementCheckpoint(checkpoint),
                active_ms: sessionMetric.activeMs,
                idle_ms: sessionMetric.idleMs,
                hidden_ms: sessionMetric.hiddenMs,
                bounce_status: sessionMetric.bounceStatus,
                engagement_status: sessionMetric.engagementStatus,
                click_count: clickCountRef.current,
                hover_count: hoverCountRef.current,
                scroll_count: scrollCountRef.current,
                max_scroll_depth: lastScrollDepth.current,
                exit_intent: exitIntent,
                exit_reason: reason,
            });

            trackObservedEvent(exitIntent === "bounce" ? "semantic_page_bounced" : "semantic_page_exited", {
                ...semanticParams,
                page_path: pathname,
                duration_ms: durationMs,
                session_measurement: serializeSessionMeasurementCheckpoint(checkpoint),
                active_ms: sessionMetric.activeMs,
                idle_ms: sessionMetric.idleMs,
                hidden_ms: sessionMetric.hiddenMs,
                bounce_status: sessionMetric.bounceStatus,
                engagement_status: sessionMetric.engagementStatus,
                click_count: clickCountRef.current,
                hover_count: hoverCountRef.current,
                scroll_count: scrollCountRef.current,
                max_scroll_depth: lastScrollDepth.current,
                exit_reason: reason,
            });

            void flushQueue(reason, { preferBeacon: true });
        };

        if (pageViewPathRef.current !== pathname) {
        pageViewPathRef.current = pathname;
        pushEvent({
            type: "page_view",
            semanticEventName: "semantic_page_viewed",
            timestamp: Date.now(),
            path: pathname,
            ...rawSemanticFields,
            ...readTelemetryContext(),
        });
        void flushQueue("page_view");

        trackObservedEvent("semantic_page_viewed", {
            ...semanticParams,
            page_path: pathname,
        });

        }
        if (!startedSessionsRef.current.has(capturedIdentity.sessionId)) {
        startedSessionsRef.current.add(capturedIdentity.sessionId);
        const startedCheckpoint = makeCheckpoint("checkpoint");
        trackObservedEvent("session_started", {
            ...semanticParams,
            page_path: pathname,
            session_id: getClientAnalyticsIdentitySnapshot("granted").sessionId,
            session_measurement: serializeSessionMeasurementCheckpoint(startedCheckpoint),
            active_ms: startedCheckpoint.activeMs,
            idle_ms: startedCheckpoint.idleMs,
            hidden_ms: startedCheckpoint.hiddenMs,
            bounce_status: "unknown",
            engagement_status: "unknown",
        });

        }

        if (eventQueue.current.length > 0) scheduleNonPriorityFlush();

        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const closestInteractive = target.closest('button, a, input, [role="button"]');
            const interactiveTarget = (closestInteractive || target) as HTMLElement;

            if (isSensitiveTarget(interactiveTarget)) {
                return;
            }

            observeActivity();
            clickCountRef.current += 1;
            emitSessionActivityTick();
            const dropId = interactiveTarget.getAttribute("data-drop-id") || undefined;
            const targetLabel = getSafeTargetLabel(interactiveTarget);

            pushEvent({
                type: "click",
                semanticEventName: "semantic_target_clicked",
                timestamp: Date.now(),
                path: pathname,
                targetId: interactiveTarget.id || undefined,
                targetTag: interactiveTarget.tagName,
                targetText: targetLabel,
                dropId,
                x: quantizeCoordinate(e.clientX),
                y: quantizeCoordinate(e.clientY),
                ...rawSemanticFields,
            });

            trackObservedEvent("semantic_target_clicked", {
                ...semanticParams,
                page_path: pathname,
                target_id: interactiveTarget.id || "",
                target_tag: interactiveTarget.tagName,
                target_label: targetLabel,
                drop_id: dropId,
            });

            trackObservedEvent("session_meaningful_interaction", {
                ...semanticParams,
                page_path: pathname,
                session_id: getClientAnalyticsIdentitySnapshot("granted").sessionId,
                active_ms: 0,
                idle_ms: 0,
                hidden_ms: visibilitySummaryRef.current.totalHiddenMs,
                bounce_status: "not_bounced",
                engagement_status: "engaged",
                source_component: "DeepTracker",
            });
        };

        const handleScroll = () => {
            const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            if (docHeight <= 0) {
                return;
            }

            observeActivity();
            const scrollTop = window.scrollY || document.documentElement.scrollTop;
            const scrollPercent = Math.round((scrollTop / docHeight) * 100);

            if (scrollPercent > lastScrollDepth.current) {
                lastScrollDepth.current = Math.min(100, scrollPercent);
            }

            const previousScrollCount = scrollCountRef.current;
            while (
                nextScrollMilestoneIndexRef.current < SCROLL_MILESTONES.length
                && scrollPercent >= SCROLL_MILESTONES[nextScrollMilestoneIndexRef.current]
            ) {
                const milestone = SCROLL_MILESTONES[nextScrollMilestoneIndexRef.current];
                nextScrollMilestoneIndexRef.current += 1;
                scrollCountRef.current += 1;
                pushEvent({
                    type: "scroll",
                    timestamp: Date.now(),
                    path: pathname,
                    targetId: `scroll_milestone_${milestone}`,
                    targetTag: "SUMMARY",
                    targetText: "scroll_milestone",
                    scrollDepthPercent: milestone,
                    ...rawSemanticFields,
                });
            }
            if (scrollCountRef.current > previousScrollCount) {
                emitSessionActivityTick();
            }
        };

        const throttledScroll = () => {
            if (scrollRafRef.current !== null) {
                return;
            }

            scrollRafRef.current = window.requestAnimationFrame(() => {
                scrollRafRef.current = null;
                handleScroll();
            });
        };

        const handleMouseOver = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (currentHoverTarget && currentHoverTarget.contains(target)) {
                return;
            }

            const interactiveTarget = target.closest('button, a, [title], [data-drop-id]') as HTMLElement | null;
            if (!interactiveTarget) {
                currentHoverTarget = null;
                currentHoverKey = null;
                return;
            }

            if (isSensitiveTarget(interactiveTarget)) {
                currentHoverTarget = null;
                currentHoverKey = null;
                return;
            }

            observeActivity();
            currentHoverTarget = interactiveTarget;
            currentHoverKey = getSafeTargetLabel(interactiveTarget);
            hoverStart.current[currentHoverKey] = Date.now();
        };

        const handleMouseOut = (e: MouseEvent) => {
            if (!currentHoverTarget || !currentHoverKey) {
                return;
            }

            const relatedTarget = e.relatedTarget as Node | null;
            if (relatedTarget && currentHoverTarget.contains(relatedTarget)) {
                return;
            }

            closeCurrentHover();
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === "hidden") {
                updateVisibilitySummary("hidden");
                if (semanticContext.category === "drop" && pathname.startsWith("/dashboard/viewer") && !viewerBackgroundTrackedRef.current) {
                    viewerBackgroundTrackedRef.current = true;
                    trackObservedEvent("viewer_backgrounded", {
                        ...semanticParams,
                        page_path: pathname,
                        background_state: "hidden",
                    });
                }

                emitPageSummary("visibility");
                lastObservedActivityAt = null;
                return;
            }

            updateVisibilitySummary("visible");
            guestFlushRetryAttempt = 0;
            if (eventQueue.current.length > 0) {
                scheduleNonPriorityFlush();
            }
        };

        const handlePageHide = (event: PageTransitionEvent) => {
            updateVisibilitySummary("hidden");
            lastObservedActivityAt = null;
            emitPageSummary(event.persisted ? "visibility" : "pagehide");
        };
        const handlePageShow = (event: PageTransitionEvent) => {
            if (event.persisted) {
                updateVisibilitySummary(document.visibilityState === "hidden" ? "hidden" : "visible");
                lastObservedActivityAt = null;
                if (eventQueue.current.length > 0) scheduleNonPriorityFlush();
            }
        };
        const handleOnline = () => {
            guestFlushRetryAttempt = 0;
            void flushQueue("online");
        };

        document.addEventListener("click", handleClick, { capture: true, passive: true });
        window.addEventListener("scroll", throttledScroll, { passive: true });
        document.addEventListener("mouseover", handleMouseOver, { passive: true });
        document.addEventListener("mouseout", handleMouseOut, { passive: true });
        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("pagehide", handlePageHide);
        window.addEventListener("pageshow", handlePageShow);
        window.addEventListener("online", handleOnline);

        return () => {
            disposed = true;
            document.removeEventListener("click", handleClick, true);
            window.removeEventListener("scroll", throttledScroll);
            document.removeEventListener("mouseover", handleMouseOver);
            document.removeEventListener("mouseout", handleMouseOut);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("pagehide", handlePageHide);
            window.removeEventListener("pageshow", handlePageShow);
            window.removeEventListener("online", handleOnline);
            if (priorityFlushTimeout !== null) window.clearTimeout(priorityFlushTimeout);
            if (nonPriorityFlushTimeout !== null) {
                window.clearTimeout(nonPriorityFlushTimeout);
            }
            if (scrollRafRef.current !== null) {
                window.cancelAnimationFrame(scrollRafRef.current);
                scrollRafRef.current = null;
            }
            if (queuePersistTimeout !== null) {
                window.clearTimeout(queuePersistTimeout);
                queuePersistTimeout = null;
                persistGuestQueue(eventQueue.current, stableGuestBatchRef.current);
            }
            emitPageSummary("cleanup");
        };
    }, [pathname, trackingAllowed, selectedUserId]);

    return null;
}
