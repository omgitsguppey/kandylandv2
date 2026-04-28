"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { recordClientDiagnostic } from "@/lib/client-diagnostics";

const HOMEPAGE_INTERACTIVE_WARN_MS = 900;
const HOMEPAGE_LAYOUT_SHIFT_WARN_THRESHOLD = 0.12;
const HOMEPAGE_LONG_TASK_WARN_MS = 120;
const HOMEPAGE_INPUT_DELAY_WARN_MS = 160;

type LayoutShiftEntry = PerformanceEntry & {
    hadRecentInput?: boolean;
    value?: number;
};

type DurationPerformanceEntry = PerformanceEntry & {
    duration?: number;
    interactionId?: number;
};

function scheduleHomepageIdle(callback: () => void) {
    if (typeof window === "undefined") {
        return () => undefined;
    }

    if ("requestIdleCallback" in window) {
        const idleId = window.requestIdleCallback(callback, { timeout: 1_800 });
        return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = globalThis.setTimeout(callback, 650);
    return () => globalThis.clearTimeout(timeoutId);
}

function recordObserverUnavailable(observerName: string, reason: string) {
    recordClientDiagnostic("ui", "Homepage runtime observer unavailable", {
        surface: "home",
        observerName,
        reason,
        qualityLabel: "partial",
    }, "warn");
}

function observeHomepageSectionCollapses() {
    if (typeof window === "undefined" || typeof document === "undefined") {
        return () => undefined;
    }

    if (typeof ResizeObserver === "undefined") {
        recordObserverUnavailable("section-collapse", "resize-observer-missing");
        return () => undefined;
    }

    const observedHeights = new Map<Element, number>();
    const reportedSections = new Set<string>();
    let frameId: number | null = null;
    let pendingEntries: ResizeObserverEntry[] = [];
    const flushEntries = () => {
        frameId = null;
        const entries = pendingEntries;
        pendingEntries = [];

        for (const entry of entries) {
            const section = entry.target;
            const nextHeight = Math.round(entry.contentRect.height);
            const previousHeight = observedHeights.get(section) ?? nextHeight;
            observedHeights.set(section, nextHeight);
            const sectionName = section.getAttribute("data-home-section") ?? "unknown";

            if (previousHeight >= 180 && nextHeight <= 40 && !reportedSections.has(sectionName)) {
                reportedSections.add(sectionName);
                recordClientDiagnostic("ui", "Homepage section collapsed unexpectedly", {
                    surface: "home",
                    section: sectionName,
                    previousHeight,
                    nextHeight,
                    qualityLabel: "failed",
                }, "warn");
            }
        }
    };

    const observer = new ResizeObserver((entries) => {
        pendingEntries.push(...entries);
        if (frameId === null) {
            frameId = window.requestAnimationFrame(flushEntries);
        }
    });

    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-home-section]"));
    for (const section of sections) {
        observedHeights.set(section, Math.round(section.getBoundingClientRect().height));
        observer.observe(section);
    }

    return () => {
        if (frameId !== null) {
            window.cancelAnimationFrame(frameId);
        }
        observer.disconnect();
    };
}

function observeHomepageLayoutShift() {
    if (typeof PerformanceObserver === "undefined") {
        recordObserverUnavailable("layout-shift", "performance-observer-missing");
        return () => undefined;
    }

    let cumulativeShift = 0;
    let reported = false;

    try {
        const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries() as LayoutShiftEntry[]) {
                if (!entry.hadRecentInput) {
                    cumulativeShift += typeof entry.value === "number" ? entry.value : 0;
                }
            }

            if (!reported && cumulativeShift >= HOMEPAGE_LAYOUT_SHIFT_WARN_THRESHOLD) {
                reported = true;
                recordClientDiagnostic("ui", "Homepage layout shift exceeded stability threshold", {
                    surface: "home",
                    totalShift: Number(cumulativeShift.toFixed(4)),
                    qualityLabel: "partial",
                }, "warn");
            }
        });

        observer.observe({ type: "layout-shift", buffered: true });
        return () => observer.disconnect();
    } catch (error) {
        recordObserverUnavailable("layout-shift", error instanceof Error ? error.message : "observer-init-failed");
        return () => undefined;
    }
}

function observeHomepageLongTasks() {
    if (typeof PerformanceObserver === "undefined" || !PerformanceObserver.supportedEntryTypes?.includes("longtask")) {
        recordObserverUnavailable("longtask", "unsupported");
        return () => undefined;
    }

    let reported = false;
    try {
        const observer = new PerformanceObserver((list) => {
            if (reported) {
                return;
            }

            const longestTask = Math.max(0, ...list.getEntries().map((entry) => Math.round(entry.duration)));
            if (longestTask >= HOMEPAGE_LONG_TASK_WARN_MS) {
                reported = true;
                recordClientDiagnostic("runtime", "Homepage long task exceeded interaction budget", {
                    surface: "home",
                    longestTaskMs: longestTask,
                    qualityLabel: "partial",
                }, "warn");
            }
        });

        observer.observe({ type: "longtask", buffered: true });
        return () => observer.disconnect();
    } catch (error) {
        recordObserverUnavailable("longtask", error instanceof Error ? error.message : "observer-init-failed");
        return () => undefined;
    }
}

function observeHomepageInputDelay() {
    if (typeof PerformanceObserver === "undefined" || !PerformanceObserver.supportedEntryTypes?.includes("event")) {
        recordObserverUnavailable("event-timing", "unsupported");
        return () => undefined;
    }

    let reported = false;
    try {
        const observer = new PerformanceObserver((list) => {
            if (reported) {
                return;
            }

            for (const entry of list.getEntries() as DurationPerformanceEntry[]) {
                const duration = Math.round(entry.duration ?? 0);
                if (duration >= HOMEPAGE_INPUT_DELAY_WARN_MS) {
                    reported = true;
                    recordClientDiagnostic("runtime", "Homepage input delay exceeded interaction budget", {
                        surface: "home",
                        eventName: entry.name,
                        durationMs: duration,
                        interactionId: entry.interactionId ?? null,
                        qualityLabel: "partial",
                    }, "warn");
                    break;
                }
            }
        });

        observer.observe({
            type: "event",
            buffered: true,
            durationThreshold: HOMEPAGE_INPUT_DELAY_WARN_MS,
        } as PerformanceObserverInit);
        return () => observer.disconnect();
    } catch (error) {
        recordObserverUnavailable("event-timing", error instanceof Error ? error.message : "observer-init-failed");
        return () => undefined;
    }
}

export function HomepageRuntimeDiagnostics() {
    const pathname = usePathname();

    useEffect(() => {
        if (pathname !== "/" || typeof window === "undefined" || typeof document === "undefined") {
            return;
        }

        recordClientDiagnostic("runtime", "Homepage runtime diagnostics ready", {
            surface: "home",
            state: "live",
        });

        const mountedAt = performance.now();
        let firstFrameId: number | null = null;
        let secondFrameId: number | null = null;
        firstFrameId = window.requestAnimationFrame(() => {
            secondFrameId = window.requestAnimationFrame(() => {
                const interactiveMs = Math.round(performance.now() - mountedAt);
                recordClientDiagnostic("runtime", "Homepage first interactive checkpoint", {
                    surface: "home",
                    interactiveMs,
                    qualityLabel: interactiveMs > HOMEPAGE_INTERACTIVE_WARN_MS ? "partial" : "live",
                }, interactiveMs > HOMEPAGE_INTERACTIVE_WARN_MS ? "warn" : "info");
            });
        });

        const cleanupTasks: Array<() => void> = [];
        const cleanupIdle = scheduleHomepageIdle(() => {
            const mountOrder = Array.from(document.querySelectorAll<HTMLElement>("[data-home-section]"))
                .map((section) => section.getAttribute("data-home-section"))
                .filter((value): value is string => Boolean(value));

            recordClientDiagnostic("ui", "Homepage section order captured", {
                surface: "home",
                sectionOrder: mountOrder,
                qualityLabel: "live",
            });

            cleanupTasks.push(observeHomepageSectionCollapses());
            cleanupTasks.push(observeHomepageLayoutShift());
            cleanupTasks.push(observeHomepageLongTasks());
            cleanupTasks.push(observeHomepageInputDelay());
        });

        return () => {
            if (firstFrameId !== null) {
                window.cancelAnimationFrame(firstFrameId);
            }
            if (secondFrameId !== null) {
                window.cancelAnimationFrame(secondFrameId);
            }
            cleanupIdle();
            for (const cleanup of cleanupTasks) {
                cleanup();
            }
        };
    }, [pathname]);

    return null;
}
