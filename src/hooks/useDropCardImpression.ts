"use client";

import { RefObject, useEffect } from "react";

import { trackEvent } from "@/lib/telemetry";
import type { SupportedAspectRatio } from "@/lib/drop-presentation";
import type { Drop } from "@/types/db";

export const DROPS_MOBILE_UI_DENSITY = "compact_mobile_apple_2026";

const CARD_IMPRESSION_VISIBILITY_THRESHOLD = 0.6;
const CARD_IMPRESSION_MIN_VISIBLE_MS = 500;
const trackedDropCardImpressions = new Set<string>();

interface UseDropCardImpressionInput {
    cardRef: RefObject<HTMLDivElement | null>;
    drop: Drop;
    isUnlocked: boolean;
    aspectRatio: SupportedAspectRatio;
    impressionTrackingSurface?: string;
    impressionTrackingSessionId?: string;
}

export function useDropCardImpression({
    cardRef,
    drop,
    isUnlocked,
    aspectRatio,
    impressionTrackingSurface,
    impressionTrackingSessionId,
}: UseDropCardImpressionInput) {
    useEffect(() => {
        if (!impressionTrackingSurface || !impressionTrackingSessionId || !cardRef.current) {
            return;
        }

        const impressionKey = `${impressionTrackingSessionId}:${drop.id}`;
        if (trackedDropCardImpressions.has(impressionKey)) {
            return;
        }

        let visibleTimer: ReturnType<typeof setTimeout> | null = null;
        let cancelled = false;

        const flushImpression = async () => {
            if (cancelled || trackedDropCardImpressions.has(impressionKey)) {
                return;
            }

            trackedDropCardImpressions.add(impressionKey);
            trackEvent("drop_card_impression", {
                drop_id: drop.id,
                drop_category: drop.type,
                is_unlocked: isUnlocked,
                impression_surface: impressionTrackingSurface,
                viewport_threshold: CARD_IMPRESSION_VISIBILITY_THRESHOLD,
                card_aspect_ratio: aspectRatio,
                ui_density: DROPS_MOBILE_UI_DENSITY,
            });

            try {
                await fetch("/api/drops/impression", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        dropId: drop.id,
                        pagePath: window.location.pathname,
                        surface: impressionTrackingSurface,
                        sessionId: impressionTrackingSessionId,
                    }),
                    keepalive: true,
                });
            } catch {
                // Impression analytics should never block the card UI.
            }
        };

        const observer = new IntersectionObserver((entries) => {
            const entry = entries[0];
            const isVisibleEnough = entry?.isIntersecting && entry.intersectionRatio >= CARD_IMPRESSION_VISIBILITY_THRESHOLD;
            if (!isVisibleEnough) {
                if (visibleTimer) {
                    clearTimeout(visibleTimer);
                    visibleTimer = null;
                }
                return;
            }

            if (!visibleTimer) {
                visibleTimer = setTimeout(() => {
                    visibleTimer = null;
                    void flushImpression();
                }, CARD_IMPRESSION_MIN_VISIBLE_MS);
            }
        }, { threshold: [CARD_IMPRESSION_VISIBILITY_THRESHOLD] });

        observer.observe(cardRef.current);

        return () => {
            cancelled = true;
            observer.disconnect();
            if (visibleTimer) {
                clearTimeout(visibleTimer);
            }
        };
    }, [aspectRatio, cardRef, drop.id, drop.type, impressionTrackingSessionId, impressionTrackingSurface, isUnlocked]);
}
