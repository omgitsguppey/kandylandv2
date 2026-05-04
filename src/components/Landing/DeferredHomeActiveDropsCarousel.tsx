"use client";

import dynamic from "next/dynamic";

import { useDeferredClientReady } from "@/hooks/useDeferredClientReady";
import type { Drop } from "@/types/db";

type DeferredHomeActiveDropsCarouselProps = {
    drops: Drop[];
    autoPlayMs?: number;
    emptyLabel?: string;
};

const HomeActiveDropsCarousel = dynamic(
    () => import("@/components/Landing/HomeActiveDropsCarousel").then((mod) => mod.HomeActiveDropsCarousel),
    { ssr: false },
);

export function DeferredHomeActiveDropsCarousel({
    drops,
    autoPlayMs,
    emptyLabel,
}: DeferredHomeActiveDropsCarouselProps) {
    const carouselReady = useDeferredClientReady({
        delayMs: 900,
        idle: true,
    });

    if (!carouselReady) {
        return (
            <div
                aria-hidden="true"
                data-hydration-lane="idle"
                data-home-active-drops-hydration="deferred"
                className="min-h-[20rem] rounded-[1.6rem] border border-white/10 bg-zinc-950/70 [content-visibility:auto] [contain-intrinsic-size:520px]"
            />
        );
    }

    return (
        <div data-hydration-lane="idle" data-home-active-drops-hydration="resolved">
            <HomeActiveDropsCarousel drops={drops} autoPlayMs={autoPlayMs} emptyLabel={emptyLabel} />
        </div>
    );
}
