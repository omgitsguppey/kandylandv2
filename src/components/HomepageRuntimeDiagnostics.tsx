"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { recordClientDiagnostic } from "@/lib/client-diagnostics";

const HOMEPAGE_INTERACTIVE_WARN_MS = 900;
const HOMEPAGE_LAYOUT_SHIFT_WARN_THRESHOLD = 0.12;

type LayoutShiftEntry = PerformanceEntry & {
    hadRecentInput?: boolean;
    value?: number;
};

function observeHomepageSectionCollapses() {
    if (typeof window === "undefined" || typeof document === "undefined" || typeof ResizeObserver === "undefined") {
        return () => undefined;
    }

    const observedHeights = new Map<Element, number>();
    const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
            const section = entry.target;
            const nextHeight = Math.round(entry.contentRect.height);
            const previousHeight = observedHeights.get(section) ?? nextHeight;
            observedHeights.set(section, nextHeight);

            if (previousHeight >= 180 && nextHeight <= 40) {
                recordClientDiagnostic("ui", "Homepage section collapsed unexpectedly", {
                    surface: "home",
                    section: section.getAttribute("data-home-section") ?? "unknown",
                    previousHeight,
                    nextHeight,
                    qualityLabel: "failed",
                }, "warn");
            }
        }
    });

    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-home-section]"));
    for (const section of sections) {
        observedHeights.set(section, Math.round(section.getBoundingClientRect().height));
        observer.observe(section);
    }

    return () => {
        observer.disconnect();
    };
}

function observeHomepageLayoutShift() {
    if (typeof window === "undefined" || typeof PerformanceObserver === "undefined") {
        return () => undefined;
    }

    try {
        const observer = new PerformanceObserver((list) => {
            let totalShift = 0;

            for (const entry of list.getEntries() as LayoutShiftEntry[]) {
                if (entry.hadRecentInput) {
                    continue;
                }

                totalShift += typeof entry.value === "number" ? entry.value : 0;
            }

            if (totalShift >= HOMEPAGE_LAYOUT_SHIFT_WARN_THRESHOLD) {
                recordClientDiagnostic("ui", "Homepage layout shift exceeded stability threshold", {
                    surface: "home",
                    totalShift: Number(totalShift.toFixed(4)),
                    qualityLabel: "partial",
                }, "warn");
            }
        });

        observer.observe({ type: "layout-shift", buffered: true });
        return () => observer.disconnect();
    } catch {
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

        const mountOrder = Array.from(document.querySelectorAll<HTMLElement>("[data-home-section]"))
            .map((section) => section.getAttribute("data-home-section"))
            .filter((value): value is string => Boolean(value));

        recordClientDiagnostic("ui", "Homepage section order captured", {
            surface: "home",
            sectionOrder: mountOrder,
            qualityLabel: "live",
        });

        const mountedAt = performance.now();
        const interactiveFrame = window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
                const interactiveMs = Math.round(performance.now() - mountedAt);
                recordClientDiagnostic("runtime", "Homepage first interactive checkpoint", {
                    surface: "home",
                    interactiveMs,
                    qualityLabel: interactiveMs > HOMEPAGE_INTERACTIVE_WARN_MS ? "partial" : "live",
                }, interactiveMs > HOMEPAGE_INTERACTIVE_WARN_MS ? "warn" : "info");
            });
        });

        const cleanupSectionObserver = observeHomepageSectionCollapses();
        const cleanupLayoutShiftObserver = observeHomepageLayoutShift();

        return () => {
            window.cancelAnimationFrame(interactiveFrame);
            cleanupSectionObserver();
            cleanupLayoutShiftObserver();
        };
    }, [pathname]);

    return null;
}
