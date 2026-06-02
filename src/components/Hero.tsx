import { Sparkles } from "lucide-react";

import { DeferredHomeDropTicker } from "@/components/Landing/DeferredHomeDropTicker";
import { HomeHeroActions } from "@/components/Landing/HomeHeroActions";
import { HomeHeroTelemetry } from "@/components/Landing/HomeHeroTelemetry";
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
            data-hydration-lane="critical"
            className="relative flex min-h-[calc(100dvh_-_var(--root-shell-top-spacing,6rem)_-_var(--user-mobile-bottom-nav-reserved-height,0px)_-_0.75rem)] w-full flex-col justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_34%,rgba(124,58,237,0.22),transparent_38%),radial-gradient(circle_at_82%_48%,rgba(178,140,255,0.12),transparent_28%),#020104] pb-3 pt-1 max-[360px]:min-h-[calc(100dvh_-_var(--root-shell-top-spacing,6rem)_-_var(--user-mobile-bottom-nav-reserved-height,0px)_-_1rem)] max-[360px]:pb-3 max-[360px]:pt-0 sm:min-h-[90vh] sm:pb-12 sm:pt-24 landscape:min-h-0 landscape:justify-start landscape:pb-8 landscape:pt-10"
        >
            <HomeHeroTelemetry activeDropsCount={activeDropsCount} />

            <div className="pointer-events-none absolute inset-0 z-0 motion-reduce:hidden" aria-hidden="true">
                <div className="absolute left-1/2 top-[18%] h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-brand-purple/20 blur-[92px] mix-blend-screen" />
                <div className="absolute bottom-[12%] right-[10%] h-[320px] w-[320px] rounded-full bg-brand-purple/12 blur-[86px] mix-blend-screen" />
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-purple/30 to-transparent" />
            </div>

            <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
                <div className="flex min-w-0 max-w-2xl w-full flex-col items-center space-y-3.5 max-[360px]:space-y-3 sm:space-y-7">
                    <div className="inline-flex items-center gap-2 rounded-full border border-brand-purple/45 bg-black/35 px-3.5 py-1.5 text-[10px] font-bold tracking-wide text-purple-200 shadow-[0_0_28px_rgba(168,85,247,0.22),inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-md max-[360px]:px-2.5 max-[360px]:py-1 max-[360px]:text-[9px] sm:px-5 sm:text-sm">
                        <Sparkles className="h-4 w-4 text-purple-200" />
                        Exclusive Creator Experiences
                    </div>

                    <h1 className="inline-flex max-w-fit flex-col items-center text-[clamp(1.95rem,9.4vw,4.5rem)] font-extrabold leading-[1.02] text-white drop-shadow-[0_12px_34px_rgba(0,0,0,0.7)] sm:leading-[1.06] lg:text-7xl landscape:max-w-none landscape:text-[clamp(2.1rem,7vw,3.5rem)]">
                        KandyDrops
                        <br />
                        <span className="whitespace-nowrap bg-gradient-to-b from-purple-100 via-brand-purple to-violet-700 bg-clip-text text-transparent">
                            for your eyes only.
                        </span>
                    </h1>

                    <p className="max-w-xl text-[15px] font-medium leading-6 text-white/68 max-[360px]:text-[14px] max-[360px]:leading-6 sm:text-xl sm:leading-relaxed">
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
                        <DeferredHomeDropTicker drops={activeDrops} />
                    </div>
                </div>
            </div>
        </section>
    );
}

function ActivityTicker({ count }: { count: number }) {
    return (
        <div
            data-testid="home-hero-live-chip"
            data-home-live-chip-state="ready"
            className="inline-flex min-h-9 max-w-[95vw] items-center gap-2 overflow-hidden rounded-full border border-brand-purple/25 bg-black/38 px-3 py-1.5 shadow-[0_0_24px_rgba(168,85,247,0.18),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-md max-[360px]:px-2.5 max-[360px]:py-1 sm:min-h-10 sm:gap-3 sm:px-5 sm:py-2"
        >
            <div className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-purple opacity-75 motion-reduce:animate-none"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-purple"></span>
            </div>
            <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[10px] font-semibold text-white/88 max-[360px]:text-[9px] sm:text-sm">
                Live Now: <span className="text-white font-bold">{count}</span> KandyDrops are ready to unwrap!
            </span>
        </div>
    );
}
