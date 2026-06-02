"use client";

import { useEffect, useRef } from "react";

import { trackEvent } from "@/lib/telemetry";

interface HomeHeroTelemetryProps {
    activeDropsCount: number;
}

export function HomeHeroTelemetry({ activeDropsCount }: HomeHeroTelemetryProps) {
    const trackedHeroViewRef = useRef(false);
    const trackedLiveChipRef = useRef(false);

    useEffect(() => {
        if (!trackedHeroViewRef.current) {
            trackedHeroViewRef.current = true;
            trackEvent("homepage_hero_viewed", {
                route: "/",
                source_component: "home_hero",
                hero_variant: "premium_polish_v1",
            });
        }
    }, []);

    useEffect(() => {
        if (activeDropsCount <= 0 || trackedLiveChipRef.current) {
            return;
        }

        trackedLiveChipRef.current = true;
        trackEvent("homepage_live_chip_viewed", {
            drop_count: activeDropsCount,
            route: "/",
            source_component: "home_hero_activity_ticker",
            status_source: "server_active_drops",
        });
    }, [activeDropsCount]);

    return null;
}
