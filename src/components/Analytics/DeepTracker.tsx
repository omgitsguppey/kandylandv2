"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

interface TelemetryEvent {
    type: "click" | "hover" | "scroll" | "visibility" | "page_view" | "page_leave";
    timestamp: number;
    path: string;
    targetId?: string;
    targetTag?: string;
    targetText?: string;
    dropId?: string;
    x?: number;
    y?: number;
    scrollDepthPercent?: number;
    durationMs?: number;
    referrerHost?: string;
    viewportWidth?: number;
    viewportHeight?: number;
    devicePixelRatio?: number;
    networkType?: string;
}

function getClientSessionId() {
    let kSessionId = sessionStorage.getItem("kandy_session_id");
    if (kSessionId) {
        return kSessionId;
    }

    kSessionId = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem("kandy_session_id", kSessionId);
    return kSessionId;
}

export function DeepTracker() {
    const pathname = usePathname();
    const eventQueue = useRef<TelemetryEvent[]>([]);
    const lastScrollDepth = useRef<number>(0);
    const hoverStart = useRef<Record<string, number>>({});
    const pageEnteredAt = useRef<number>(0);

    useEffect(() => {
        // Skip tracking completely within the admin dashboard to keep stats clean
        if (pathname?.startsWith("/admin")) return;

        let trackingInterval: number;
        pageEnteredAt.current = Date.now();

        const readTelemetryContext = () => ({
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
        });

        const flushQueue = () => {
            if (eventQueue.current.length === 0) return;

            const payload = {
                sessionId: getClientSessionId(),
                events: [...eventQueue.current],
            };

            // Clear immediately to prevent duplicate sends
            eventQueue.current = [];

            // Use sendBeacon for reliable delivery even during page unload
            const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
            if (navigator?.sendBeacon) {
                navigator.sendBeacon("/api/analytics/ingest", blob);
            } else {
                fetch("/api/analytics/ingest", {
                    method: "POST",
                    body: blob,
                    keepalive: true,
                }).catch(() => { });
            }
        };

        const pushEvent = (event: TelemetryEvent) => {
            // Cap queue size just in case network dies, prevents memory leaks
            if (eventQueue.current.length > 500) {
                eventQueue.current.shift();
            }
            eventQueue.current.push(event);
        };

        pushEvent({
            type: "page_view",
            timestamp: Date.now(),
            path: pathname || "/",
            ...readTelemetryContext(),
        });

        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const closestInteractive = target.closest('button, a, input, [role="button"]');
            const interactiveTarget = (closestInteractive || target) as HTMLElement;

            pushEvent({
                type: "click",
                timestamp: Date.now(),
                path: pathname || "/",
                targetId: interactiveTarget.id || undefined,
                targetTag: interactiveTarget.tagName,
                targetText: interactiveTarget.innerText?.slice(0, 50) || interactiveTarget.getAttribute("aria-label")?.slice(0, 50) || undefined,
                dropId: interactiveTarget.getAttribute("data-drop-id") || undefined,
                x: e.clientX,
                y: e.clientY,
            });
        };

        const handleScroll = () => {
            const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            if (docHeight <= 0) return;

            const scrollTop = window.scrollY || document.documentElement.scrollTop;
            const scrollPercent = Math.round((scrollTop / docHeight) * 100);

            // Only log if they scrolled significantly deeper (10% increments)
            if (scrollPercent > lastScrollDepth.current + 10) {
                lastScrollDepth.current = scrollPercent;
                pushEvent({
                    type: "scroll",
                    timestamp: Date.now(),
                    path: pathname || "/",
                    scrollDepthPercent: scrollPercent,
                });
            }
        };

        let lastScrollTime = 0;
        const throttledScroll = () => {
            const now = Date.now();
            if (now - lastScrollTime > 500) { // Throttle scroll checks to 500ms
                handleScroll();
                lastScrollTime = now;
            }
        };

        // Track long hovers (interest indicators) globally but cache current hover to avoid duplicate DOM traversal
        let currentHoverTarget: HTMLElement | null = null;
        let currentHoverKey: string | null = null;

        const handleMouseOver = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            // Early exit if moving within the same interactive parent
            if (currentHoverTarget && currentHoverTarget.contains(target)) return;

            const interactiveTarget = target.closest('button, a, [title], [data-drop-id]') as HTMLElement;
            if (!interactiveTarget) {
                // Clear caching if moved out to a non-interactive element
                currentHoverTarget = null;
                return;
            }

            currentHoverTarget = interactiveTarget;
            const key = interactiveTarget.id || interactiveTarget.getAttribute("data-drop-id") || interactiveTarget.innerText?.slice(0, 20) || interactiveTarget.tagName;
            currentHoverKey = key;
            hoverStart.current[key] = Date.now();
        };

        const handleMouseOut = (e: MouseEvent) => {
            if (!currentHoverTarget || !currentHoverKey) return;

            // If the mouse is moving to a child of the current interactive target, ignore it.
            const relatedTarget = e.relatedTarget as Node | null;
            if (relatedTarget && currentHoverTarget.contains(relatedTarget)) return;

            const startStr = hoverStart.current[currentHoverKey];

            if (startStr) {
                const duration = Date.now() - startStr;
                delete hoverStart.current[currentHoverKey];

                // Only log if hovered for more than 1 second
                if (duration > 1000) {
                    pushEvent({
                        type: "hover",
                        timestamp: Date.now(),
                        path: pathname || "/",
                        targetId: currentHoverTarget.id || undefined,
                        targetTag: currentHoverTarget.tagName,
                        targetText: currentHoverTarget.innerText?.slice(0, 50) || undefined,
                        dropId: currentHoverTarget.getAttribute("data-drop-id") || undefined,
                        durationMs: duration,
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
                path: pathname || "/",
                targetText: document.visibilityState,
            });

            if (document.visibilityState === "hidden") {
                flushQueue();
            }
        };

        document.addEventListener("click", handleClick, { capture: true, passive: true });
        window.addEventListener("scroll", throttledScroll, { passive: true });
        document.addEventListener("mouseover", handleMouseOver, { passive: true });
        document.addEventListener("mouseout", handleMouseOut, { passive: true });
        document.addEventListener("visibilitychange", handleVisibilityChange);

        // Flush telemetry every 15 seconds
        trackingInterval = window.setInterval(flushQueue, 15000);

        return () => {
            pushEvent({
                type: "page_leave",
                timestamp: Date.now(),
                path: pathname || "/",
                durationMs: Math.max(0, Date.now() - pageEnteredAt.current),
                scrollDepthPercent: lastScrollDepth.current,
                ...readTelemetryContext(),
            });
            document.removeEventListener("click", handleClick, { capture: true });
            window.removeEventListener("scroll", throttledScroll);
            document.removeEventListener("mouseover", handleMouseOver);
            document.removeEventListener("mouseout", handleMouseOut);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            clearInterval(trackingInterval);
            flushQueue(); // Final flush on unmount
        };
    }, [pathname]);

    return null; // Silent component
}
