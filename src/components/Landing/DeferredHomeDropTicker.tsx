"use client";

import dynamic from "next/dynamic";

import { useDeferredClientReady } from "@/hooks/useDeferredClientReady";
import type { Drop } from "@/types/db";

const HomeDropTicker = dynamic(
    () => import("@/components/HomeDropTicker").then((mod) => mod.HomeDropTicker),
    { ssr: false },
);

export function DeferredHomeDropTicker({ drops }: { drops: Drop[] }) {
    const tickerReady = useDeferredClientReady({
        delayMs: 700,
        idle: true,
    });

    if (!tickerReady) {
        return <div data-hydration-lane="idle" data-home-drop-ticker-deferred="true" />;
    }

    return (
        <div data-hydration-lane="idle" data-home-drop-ticker-deferred="resolved">
            <HomeDropTicker drops={drops} />
        </div>
    );
}
