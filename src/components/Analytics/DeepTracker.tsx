"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { CLIENT_RUNTIME_STORAGE_KEYS } from "@/hooks/client-runtime";
import { createAnalyticsBatchId } from "@/lib/analytics-identifiers";
import { getAppCheckToken } from "@/lib/app-check";
import { recordClientDiagnostic } from "@/lib/client-diagnostics";
import { buildAnalyticsSemanticParams, resolveAnalyticsSemanticContext } from "@/lib/analytics-semantics";
import { canUseAnonymousAnalytics, readPrivacySettingsSnapshot, subscribeToPrivacySettings } from "@/lib/privacy-consent";
import { trackEvent } from "@/lib/telemetry";

type TelemetryEventType = "click" | "hover" | "scroll" | "visibility" | "page_view" | "page_leave";

interface TelemetryEvent {
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
}

const GUEST_ANALYTICS_QUEUE_STORAGE_KEY = "kandydrops.analytics.guest-queue";
const GUEST_ANALYTICS_FLUSH_INTERVAL_MS = 5_000;

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

function getClientSessionId() {
    let kSessionId = sessionStorage.getItem(CLIENT_RUNTIME_STORAGE_KEYS.analyticsSessionId);
    if (kSessionId) {
        return kSessionId;
    }

    kSessionId = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem(CLIENT_RUNTIME_STORAGE_KEYS.analyticsSessionId, kSessionId);
    return kSessionId;
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

        window.sessionStorage.setItem(GUEST_ANALYTICS_QUEUE_STORAGE_KEY, JSON.stringify(events.slice(-500)));
    } catch {
        // Ignore storage write failures in restricted contexts.
    }
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
    const [trackingAllowed, setTrackingAllowed] = useState(() => canUseAnonymousAnalytics(readPrivacySettingsSnapshot()));
    const eventQueue = useRef<TelemetryEvent[]>([]);
    const guestQueueHydratedRef = useRef(false);
    const guestFlushInFlightRef = useRef<Promise<void> | null>(null);
    const lastScrollDepth = useRef<number>(0);
    const clickCountRef = useRef(0);
    const hoverCountRef = useRef(0);
    const scrollCountRef = useRef(0);
    const hoverStart = useRef<Record<string, number>>({});
    const pageEnteredAt = useRef<number>(0);
    const viewerBackgroundTrackedRef = useRef(false);

    useEffect(() => {
        return subscribeToPrivacySettings(() => {
            setTrackingAllowed(canUseAnonymousAnalytics(readPrivacySettingsSnapshot()));
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
        const shouldCaptureAnonymousBatch = !pathname.startsWith("/admin");

        pageEnteredAt.current = Date.now();
        lastScrollDepth.current = 0;
        clickCountRef.current = 0;
        hoverCountRef.current = 0;
        scrollCountRef.current = 0;
        viewerBackgroundTrackedRef.current = false;

        const flushQueue = async (reason: "interval" | "page_view" | "visibility" | "pagehide" | "cleanup" | "online") => {
            if (!trackingAllowed || !shouldCaptureAnonymousBatch || eventQueue.current.length === 0) {
                return;
            }

            if (guestFlushInFlightRef.current) {
                await guestFlushInFlightRef.current;
                return;
            }

            const queuedEvents = [...eventQueue.current];
            const payload = {
                batchId: createAnalyticsBatchId(getClientSessionId()),
                sessionId: getClientSessionId(),
                events: queuedEvents,
            };

            guestFlushInFlightRef.current = (async () => {
                const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
                try {
                    const appCheckToken = await getAppCheckToken().catch(() => null);
                    if (appCheckToken) {
                        const response = await fetch("/api/analytics/ingest", {
                            method: "POST",
                            body: blob,
                            keepalive: true,
                            headers: {
                                "X-Firebase-AppCheck": appCheckToken,
                            },
                        });
                        if (!response.ok) {
                            throw new Error(`Guest analytics flush failed (${response.status})`);
                        }
                    } else if (navigator?.sendBeacon) {
                        const accepted = navigator.sendBeacon("/api/analytics/ingest", blob);
                        if (!accepted) {
                            throw new Error("Guest analytics sendBeacon was rejected");
                        }
                    } else {
                        const response = await fetch("/api/analytics/ingest", {
                            method: "POST",
                            body: blob,
                            keepalive: true,
                        });
                        if (!response.ok) {
                            throw new Error(`Guest analytics flush failed (${response.status})`);
                        }
                    }

                    eventQueue.current = eventQueue.current.slice(queuedEvents.length);
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

        const pushEvent = (event: TelemetryEvent) => {
            if (!trackingAllowed || !shouldCaptureAnonymousBatch) {
                return;
            }

            if (eventQueue.current.length > 500) {
                eventQueue.current.shift();
                recordClientDiagnostic("telemetry", "Guest analytics queue trimmed", {
                    pagePath: pathname,
                });
            }

            eventQueue.current.push(event);
            persistGuestQueue(eventQueue.current);
        };

        const emitPageSummary = (reason: "pagehide" | "cleanup" | "visibility") => {
            if (finalized) {
                return;
            }

            finalized = true;
            const durationMs = Math.max(0, Date.now() - pageEnteredAt.current);
            const engaged = clickCountRef.current > 0
                || hoverCountRef.current > 0
                || scrollCountRef.current > 0
                || lastScrollDepth.current >= 25
                || durationMs >= 15_000;
            const exitIntent = !engaged && durationMs < 10_000 ? "bounce" : "exit";

            pushEvent({
                type: "page_leave",
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

            void flushQueue(reason);
        };

        pushEvent({
            type: "page_view",
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

            if (scrollPercent > lastScrollDepth.current + 10) {
                lastScrollDepth.current = scrollPercent;
                scrollCountRef.current += 1;
                pushEvent({
                    type: "scroll",
                    timestamp: Date.now(),
                    path: pathname,
                    scrollDepthPercent: scrollPercent,
                    ...rawSemanticFields,
                });
            }
        };

        let lastScrollTime = 0;
        const throttledScroll = () => {
            const now = Date.now();
            if (now - lastScrollTime > 500) {
                handleScroll();
                lastScrollTime = now;
            }
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

            const hoverStartedAt = hoverStart.current[currentHoverKey];
            if (hoverStartedAt) {
                const duration = Date.now() - hoverStartedAt;
                delete hoverStart.current[currentHoverKey];
                if (duration > 1000) {
                    hoverCountRef.current += 1;
                    pushEvent({
                        type: "hover",
                        timestamp: Date.now(),
                        path: pathname,
                        targetId: currentHoverTarget.id || undefined,
                        targetTag: currentHoverTarget.tagName,
                        targetText: getSafeTargetLabel(currentHoverTarget),
                        dropId: currentHoverTarget.getAttribute("data-drop-id") || undefined,
                        durationMs: duration,
                        ...rawSemanticFields,
                    });
                }
            }

            currentHoverTarget = null;
            currentHoverKey = null;
        };

        const handleVisibilityChange = () => {
            pushEvent({
                type: "visibility",
                timestamp: Date.now(),
                path: pathname,
                targetText: document.visibilityState,
                ...rawSemanticFields,
            });

            if (document.visibilityState === "hidden") {
                if (semanticContext.category === "drop" && pathname.startsWith("/dashboard/viewer") && !viewerBackgroundTrackedRef.current) {
                    viewerBackgroundTrackedRef.current = true;
                    trackEvent("viewer_backgrounded", {
                        ...semanticParams,
                        page_path: pathname,
                        background_state: "hidden",
                    });
                }

                void flushQueue("visibility");
            }
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
            emitPageSummary("cleanup");
        };
    }, [pathname, trackingAllowed]);

    return null;
}
