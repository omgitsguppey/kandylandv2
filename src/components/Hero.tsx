import { Sparkles } from "lucide-react";

import { HomeDropTicker } from "@/components/HomeDropTicker";
import { HomeHeroActions } from "@/components/Landing/HomeHeroActions";
import type { Drop } from "@/types/db";

interface HeroProps {
    activeDrops: Drop[];
}

export default function Hero({ activeDrops }: HeroProps) {
    const activeDropsCount = activeDrops.length;

    return (
        <section
            data-home-section="hero"
            data-home-hero-layout="shell-centered"
            data-home-hero-shell-aware="true"
            className="relative flex min-h-[calc(100dvh_-_var(--root-shell-top-spacing,6rem)_-_var(--user-mobile-bottom-nav-reserved-height,0px)_-_0.75rem)] w-full flex-col justify-center overflow-hidden pb-3 pt-1 max-[360px]:min-h-[calc(100dvh_-_var(--root-shell-top-spacing,6rem)_-_var(--user-mobile-bottom-nav-reserved-height,0px)_-_1rem)] max-[360px]:pb-3 max-[360px]:pt-0 sm:min-h-[90vh] sm:pb-12 sm:pt-24 landscape:min-h-0 landscape:justify-start landscape:pb-8 landscape:pt-10"
        >
            <div className="pointer-events-none absolute inset-0 z-0 opacity-30 motion-reduce:hidden" aria-hidden="true">
                <div className="absolute left-1/4 top-1/4 h-[360px] w-[360px] rounded-full bg-brand-purple/16 blur-[80px] mix-blend-screen" />
                <div className="absolute bottom-1/4 right-1/4 h-[320px] w-[320px] rounded-full bg-brand-purple/10 blur-[72px] mix-blend-screen" />
            </div>

            <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
                <div className="flex min-w-0 max-w-2xl w-full flex-col items-center space-y-3.5 max-[360px]:space-y-3 sm:space-y-7">
                    <div className="inline-flex items-center gap-2 rounded-full border border-brand-purple/20 bg-brand-purple/10 px-3 py-1.5 text-[10px] font-bold tracking-wide text-brand-purple max-[360px]:px-2.5 max-[360px]:py-1 max-[360px]:text-[9px] sm:text-sm">
                        <Sparkles className="w-4 h-4" />
                        Exclusive Creator Experiences
                    </div>

                    <h1 className="inline-flex max-w-fit flex-col items-center text-[clamp(1.95rem,9.4vw,4.5rem)] font-extrabold leading-[1.02] tracking-tighter text-white sm:leading-[1.1] lg:text-7xl landscape:max-w-none landscape:text-[clamp(2.1rem,7vw,3.5rem)]">
                        KandyDrops
                        <br />
                        <span className="whitespace-nowrap text-transparent bg-clip-text bg-gradient-to-r from-brand-purple to-purple-400">
                            for your eyes only.
                        </span>
                    </h1>

                    <p className="max-w-lg text-[15px] font-medium leading-6 text-gray-400 max-[360px]:text-[14px] max-[360px]:leading-6 sm:text-xl sm:leading-relaxed">
                        Unwrap KandyDrops from your favorite creators before they disappear!
                    </p>

                    <HomeHeroActions />

                    <div
                        data-testid="hero-activity-ticker-mask"
                        className="pb-1 pt-0.5 max-[360px]:pt-0 landscape:pb-0"
                    >
                        <ActivityTicker count={activeDropsCount} />
                    </div>

                    <div className="hidden w-full border-t border-white/10 pt-5 sm:block sm:pt-8 lg:w-4/5 landscape:hidden">
                        <p className="text-sm text-gray-400 font-medium mb-4">Live Right Now</p>
                        <HomeDropTicker drops={activeDrops} />
                    </div>
                </div>
            </div>
        </section>
    );
}

function ActivityTicker({ count }: { count: number }) {
    return (
        <div className="inline-flex max-w-[95vw] items-center gap-2 overflow-hidden rounded-full border border-white/10 bg-white/5 px-3 py-1.5 shadow-lg backdrop-blur-md max-[360px]:px-2.5 max-[360px]:py-1 sm:gap-3 sm:px-4 sm:py-2">
            <div className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-purple opacity-75 motion-reduce:animate-none"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-purple"></span>
            </div>
            <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[10px] font-semibold text-white/90 max-[360px]:text-[9px] sm:text-sm">
                Live Now: <span className="text-white font-bold">{count}</span> KandyDrops are ready to unwrap!
            </span>
        </div>
    );
}
