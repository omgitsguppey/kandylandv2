"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { createAnalyticsBatchId } from "@/lib/analytics-identifiers";
import { getClientAnalyticsIdentitySnapshot } from "@/lib/client-session";
import { recordClientDiagnostic } from "@/lib/client-diagnostics";
import { buildAnalyticsSemanticParams, resolveAnalyticsSemanticContext } from "@/lib/analytics-semantics";
import { buildClientTrackingDecision } from "@/lib/analytics/client-tracking-policy";
import { canUseBehavioralAnalytics, readPrivacySettingsSnapshot, subscribeToPrivacySettings } from "@/lib/privacy-consent";
import { trackEvent } from "@/lib/telemetry";
import {
    CLIENT_TELEMETRY_NON_PRIORITY_FLUSH_INTERVAL_MS,
    CLIENT_TELEMETRY_NON_PRIORITY_QUEUE_CAP,
    CLIENT_TELEMETRY_PRIORITY_FLUSH_DELAY_MS,
    classifyClientTelemetryEventPriority,
    shouldFlushClientTelemetryOnNextTurn,
} from "@/lib/analytics/client-telemetry-priority";

type TelemetryEventType = "click" | "hover" | "scroll" | "visibility" | "page_view" | "page_leave";
type GuestSemanticEventName =
    | "semantic_page_viewed"
    | "semantic_target_clicked"
    | "semantic_page_engaged"
    | "semantic_page_passive"
    | "semantic_page_bounced"
    | "semantic_page_exited";

export interface TelemetryEvent {
    type: TelemetryEventType;
    timestamp: number;
    path: string;
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
}

const GUEST_ANALYTICS_QUEUE_STORAGE_KEY = "kandydrops.analytics.guest-queue";
const GUEST_ANALYTICS_FLUSH_INTERVAL_MS = CLIENT_TELEMETRY_NON_PRIORITY_FLUSH_INTERVAL_MS;
const GUEST_ANALYTICS_MAX_EVENTS_PER_SESSION = CLIENT_TELEMETRY_NON_PRIORITY_QUEUE_CAP;
const GUEST_ANALYTICS_MAX_DIAGNOSTIC_EVENTS_PER_SESSION = 60;
const GUEST_ANALYTICS_MAX_EVENTS_PER_FLUSH = 200;
const SCROLL_MILESTONES = [25, 50, 75, 100] as const;

type GuestAnalyticsFlushReason = "interval" | "page_view" | "visibility" | "pagehide" | "cleanup" | "online" | "priority";
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
};

export function buildGuestAnalyticsBatchSignature(events: TelemetryEvent[]) {
    const first = events[0];
    const last = events[events.length - 1];
    return [
        events.length,
        first?.timestamp ?? 0,
        first?.type ?? "",
        first?.path ?? "",
        last?.timestamp ?? 0,
        last?.type ?? "",
        last?.path ?? "",
    ].join("|");
}

export function buildGuestAnalyticsIngestPayload(
    events: TelemetryEvent[],
    stableBatch?: StableGuestAnalyticsBatch | null,
) {
    const identity = getClientAnalyticsIdentitySnapshot("granted");
    const signature = buildGuestAnalyticsBatchSignature(events);
    const batchId = stableBatch?.signature === signature
        ? stableBatch.batchId
        : createAnalyticsBatchId(identity.sessionId);

    return {
        stableBatch: { signature, batchId },
        payload: {
            batchId,
            anonymousVisitorId: identity.anonymousVisitorId ?? undefined,
            sessionId: identity.sessionId,
            events,
        },
    };
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

function sanitizeStoredTelemetryEvent(value: unknown): TelemetryEvent | null {
    if (!value || typeof value !== "object") {
        return null;
    }

    const event = value as Partial<TelemetryEvent>;
    if (
        typeof event.type !== "string"
        || typeof event.timestamp !== "number"
        || !Number.isFinite(event.timestamp)
        || typeof event.path !== "string"
    ) {
        return null;
    }

    return event as TelemetryEvent;
}

function readPersistedGuestQueue() {
    if (typeof window === "undefined") {
        return [];
    }

    try {
        const raw = window.sessionStorage.getItem(GUEST_ANALYTICS_QUEUE_STORAGE_KEY);
        if (!raw) {
            return [];
        }

        const parsed = JSON.parse(raw) as unknown[];
        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed
            .map((entry) => sanitizeStoredTelemetryEvent(entry))
            .filter((entry): entry is TelemetryEvent => Boolean(entry))
            .slice(-500);
    } catch {
        return [];
    }
}

function persistGuestQueue(events: TelemetryEvent[]) {
    if (typeof window === "undefined") {
        return;
    }

    try {
        if (events.length === 0) {
            window.sessionStorage.removeItem(GUEST_ANALYTICS_QUEUE_STORAGE_KEY);
            return;
        }

        window.sessionStorage.setItem(GUEST_ANALYTICS_QUEUE_STORAGE_KEY, JSON.stringify(events.slice(-GUEST_ANALYTICS_MAX_EVENTS_PER_SESSION)));
    } catch {
        // Ignore storage write failures in restricted contexts.
    }
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

function trimNonPriorityQueueForEvent(queue: TelemetryEvent[], event: TelemetryEvent) {
    if (queue.length < GUEST_ANALYTICS_MAX_EVENTS_PER_SESSION) {
        return true;
    }

    const queuedPriority = classifyClientTelemetryEventPriority(event);
    if (queuedPriority !== "non_priority_batch") {
        const firstNonPriorityIndex = queue.findIndex((queuedEvent) =>
            classifyClientTelemetryEventPriority(queuedEvent) === "non_priority_batch");
        if (firstNonPriorityIndex >= 0) {
            queue.splice(firstNonPriorityIndex, 1);
            return true;
        }

        queue.shift();
        return true;
    }

    const firstQueuedNonPriorityIndex = queue.findIndex((queuedEvent) =>
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
        eventQueue.current = readPersistedGuestQueue();
    }, []);

    useEffect(() => {
        if (trackingAllowed || typeof window === "undefined") {
            return;
        }

        eventQueue.current = [];
        persistGuestQueue([]);
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

        let trackingInterval: number | undefined;
        let currentHoverTarget: HTMLElement | null = null;
        let currentHoverKey: string | null = null;
        let finalized = false;
        const shouldCaptureAnonymousBatch = true;
        let queuePersistTimeout: number | null = null;

        pageEnteredAt.current = Date.now();
        lastScrollDepth.current = 0;
        clickCountRef.current = 0;
        hoverCountRef.current = 0;
        scrollCountRef.current = 0;
        viewerBackgroundTrackedRef.current = false;
        hoverSummaryRef.current = createEmptyHoverSummary();
        visibilitySummaryRef.current = createVisibilitySummary(pageEnteredAt.current);
        nextScrollMilestoneIndexRef.current = 0;

        const flushQueue = async (
            reason: GuestAnalyticsFlushReason,
            options: { preferBeacon?: boolean } = {},
        ) => {
            if (!trackingAllowed || !shouldCaptureAnonymousBatch || eventQueue.current.length === 0) {
                return;
            }

            if (guestFlushInFlightRef.current) {
                await guestFlushInFlightRef.current;
                return;
            }

            const queuedEvents = eventQueue.current.slice(0, GUEST_ANALYTICS_MAX_EVENTS_PER_FLUSH);
            const { payload, stableBatch } = buildGuestAnalyticsIngestPayload(queuedEvents, stableGuestBatchRef.current);
            stableGuestBatchRef.current = stableBatch;

            guestFlushInFlightRef.current = (async () => {
                const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
                const preferBeacon = options.preferBeacon === true
                    || reason === "pagehide"
                    || reason === "visibility"
                    || reason === "cleanup";
                try {
                    if (preferBeacon && navigator?.sendBeacon) {
                        const accepted = navigator.sendBeacon("/api/analytics/ingest", blob);
                        if (!accepted) {
                            throw new Error("Guest analytics sendBeacon was rejected");
                        }
                    } else {
                        const response = await fetch("/api/analytics/ingest", {
                            method: "POST",
                            body: blob,
                            keepalive: preferBeacon,
                        });
                        if (!response.ok) {
                            throw new Error(`Guest analytics flush failed (${response.status})`);
                        }
                    }

                    eventQueue.current = eventQueue.current.slice(queuedEvents.length);
                    stableGuestBatchRef.current = clearStableGuestAnalyticsBatchAfterSuccess(
                        stableGuestBatchRef.current,
                        stableBatch.signature,
                    );
                    persistGuestQueue(eventQueue.current);
                } catch (error) {
                    persistGuestQueue(eventQueue.current);
                    recordClientDiagnostic("telemetry", "Guest analytics flush failed", {
                        pagePath: pathname,
                        reason,
                        queuedEvents: queuedEvents.length,
                        message: error instanceof Error ? error.message : String(error),
                    });
                } finally {
                    guestFlushInFlightRef.current = null;
                }
            })();

            await guestFlushInFlightRef.current;
        };

        const persistQueueSoon = () => {
            if (queuePersistTimeout !== null) {
                return;
            }

            queuePersistTimeout = window.setTimeout(() => {
                queuePersistTimeout = null;
                persistGuestQueue(eventQueue.current);
            }, 250);
        };

        const schedulePriorityFlush = () => {
            window.setTimeout(() => {
                void flushQueue("priority");
            }, CLIENT_TELEMETRY_PRIORITY_FLUSH_DELAY_MS);
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

            if (!trimNonPriorityQueueForEvent(eventQueue.current, event)) {
                return;
            }

            if (eventQueue.current.length >= GUEST_ANALYTICS_MAX_EVENTS_PER_SESSION) {
                recordClientDiagnostic("telemetry", "Guest analytics queue trimmed", {
                    pagePath: pathname,
                });
            }

            eventQueue.current.push(event);
            persistQueueSoon();
            if (shouldFlushClientTelemetryOnNextTurn(event)) {
                schedulePriorityFlush();
            }
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
            const closeoutKey = `${pathname}:${pageEnteredAt.current}`;
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
            const durationMs = Math.max(0, Date.now() - pageEnteredAt.current);
            const engaged = clickCountRef.current > 0
                || hoverCountRef.current > 0
                || scrollCountRef.current > 0
                || lastScrollDepth.current >= 25
                || durationMs >= 15_000;
            const exitIntent = !engaged && durationMs < 10_000 ? "bounce" : "exit";

            pushEvent({
                type: "page_leave",
                semanticEventName: engaged ? "semantic_page_engaged" : "semantic_page_passive",
                semanticExitEventName: exitIntent === "bounce" ? "semantic_page_bounced" : "semantic_page_exited",
                timestamp: Date.now(),
                path: pathname,
                durationMs,
                scrollDepthPercent: lastScrollDepth.current,
                interactionState: engaged ? "engaged" : "passive",
                exitIntent,
                clickCount: clickCountRef.current,
                hoverCount: hoverCountRef.current,
                scrollCount: scrollCountRef.current,
                ...rawSemanticFields,
                ...readTelemetryContext(),
            });

            trackEvent(engaged ? "semantic_page_engaged" : "semantic_page_passive", {
                ...semanticParams,
                page_path: pathname,
                duration_ms: durationMs,
                click_count: clickCountRef.current,
                hover_count: hoverCountRef.current,
                scroll_count: scrollCountRef.current,
                max_scroll_depth: lastScrollDepth.current,
                exit_intent: exitIntent,
                exit_reason: reason,
            });

            trackEvent(exitIntent === "bounce" ? "semantic_page_bounced" : "semantic_page_exited", {
                ...semanticParams,
                page_path: pathname,
                duration_ms: durationMs,
                click_count: clickCountRef.current,
                hover_count: hoverCountRef.current,
                scroll_count: scrollCountRef.current,
                max_scroll_depth: lastScrollDepth.current,
                exit_reason: reason,
            });

            void flushQueue(reason, { preferBeacon: true });
        };

        pushEvent({
            type: "page_view",
            semanticEventName: "semantic_page_viewed",
            timestamp: Date.now(),
            path: pathname,
            ...rawSemanticFields,
            ...readTelemetryContext(),
        });
        void flushQueue("page_view");

        trackEvent("semantic_page_viewed", {
            ...semanticParams,
            page_path: pathname,
        });

        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const closestInteractive = target.closest('button, a, input, [role="button"]');
            const interactiveTarget = (closestInteractive || target) as HTMLElement;

            if (isSensitiveTarget(interactiveTarget)) {
                return;
            }

            clickCountRef.current += 1;
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

            trackEvent("semantic_target_clicked", {
                ...semanticParams,
                page_path: pathname,
                target_id: interactiveTarget.id || "",
                target_tag: interactiveTarget.tagName,
                target_label: targetLabel,
                drop_id: dropId,
            });
        };

        const handleScroll = () => {
            const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            if (docHeight <= 0) {
                return;
            }

            const scrollTop = window.scrollY || document.documentElement.scrollTop;
            const scrollPercent = Math.round((scrollTop / docHeight) * 100);

            if (scrollPercent > lastScrollDepth.current) {
                lastScrollDepth.current = Math.min(100, scrollPercent);
            }

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
                    trackEvent("viewer_backgrounded", {
                        ...semanticParams,
                        page_path: pathname,
                        background_state: "hidden",
                    });
                }

                emitPageSummary("visibility");
                return;
            }

            updateVisibilitySummary("visible");
        };

        const handlePageHide = () => {
            emitPageSummary("pagehide");
        };
        const handleOnline = () => {
            void flushQueue("online");
        };

        document.addEventListener("click", handleClick, { capture: true, passive: true });
        window.addEventListener("scroll", throttledScroll, { passive: true });
        document.addEventListener("mouseover", handleMouseOver, { passive: true });
        document.addEventListener("mouseout", handleMouseOut, { passive: true });
        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("pagehide", handlePageHide);
        window.addEventListener("online", handleOnline);

        trackingInterval = window.setInterval(() => {
            if (document.visibilityState !== "visible") {
                return;
            }
            void flushQueue("interval");
        }, GUEST_ANALYTICS_FLUSH_INTERVAL_MS);

        return () => {
            document.removeEventListener("click", handleClick, true);
            window.removeEventListener("scroll", throttledScroll);
            document.removeEventListener("mouseover", handleMouseOver);
            document.removeEventListener("mouseout", handleMouseOut);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("pagehide", handlePageHide);
            window.removeEventListener("online", handleOnline);
            if (trackingInterval) {
                window.clearInterval(trackingInterval);
            }
            if (scrollRafRef.current !== null) {
                window.cancelAnimationFrame(scrollRafRef.current);
                scrollRafRef.current = null;
            }
            if (queuePersistTimeout !== null) {
                window.clearTimeout(queuePersistTimeout);
                queuePersistTimeout = null;
                persistGuestQueue(eventQueue.current);
            }
            emitPageSummary("cleanup");
        };
    }, [pathname, trackingAllowed]);

    return null;
}
