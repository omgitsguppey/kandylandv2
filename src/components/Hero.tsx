import { Sparkles } from "lucide-react";

import { Badge } from "@/components/creative-tim/ui/badge";
import { Card } from "@/components/creative-tim/ui/card";
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
            className="relative flex min-h-[calc(100dvh_-_var(--root-shell-top-spacing,6rem)_-_var(--user-mobile-bottom-nav-reserved-height,0px)_-_0.75rem)] w-full flex-col justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_26%,rgba(147,51,234,0.26),transparent_34%),radial-gradient(circle_at_12%_72%,rgba(236,72,153,0.14),transparent_27%),radial-gradient(circle_at_88%_58%,rgba(96,165,250,0.11),transparent_25%),#06020c] pb-5 pt-3 max-[360px]:min-h-[calc(100dvh_-_var(--root-shell-top-spacing,6rem)_-_var(--user-mobile-bottom-nav-reserved-height,0px)_-_1rem)] max-[360px]:pb-3 max-[360px]:pt-0 sm:min-h-[90vh] sm:pb-16 sm:pt-28 landscape:min-h-0 landscape:justify-start landscape:pb-8 landscape:pt-10"
        >
            <HomeHeroTelemetry activeDropsCount={activeDropsCount} />

            <div className="pointer-events-none absolute inset-0 z-0 motion-reduce:hidden" aria-hidden="true">
                <div className="absolute left-1/2 top-[10%] h-[31rem] w-[31rem] -translate-x-1/2 rounded-full border border-purple-200/10 bg-brand-purple/18 blur-[92px] mix-blend-screen" />
                <div className="absolute -left-24 bottom-[4%] h-72 w-72 rounded-full bg-fuchsia-500/13 blur-[86px] mix-blend-screen" />
                <div className="absolute -right-16 top-[28%] h-64 w-64 rounded-full bg-violet-400/13 blur-[78px] mix-blend-screen" />
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-200/35 to-transparent" />
                <div className="absolute left-1/2 top-[14%] h-[19rem] w-[19rem] -translate-x-1/2 rotate-45 rounded-[3.5rem] border border-white/[0.07] bg-white/[0.025] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]" />
                <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#06020c] to-transparent" />
            </div>

            <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center px-4 text-center sm:px-6 lg:px-8">
                <div className="flex w-full min-w-0 max-w-3xl flex-col items-center space-y-4 max-[360px]:space-y-3 sm:space-y-7">
                    <Badge className="h-8 gap-2 rounded-full border-purple-200/20 bg-black/35 px-3 text-[10px] font-black uppercase tracking-[0.24em] text-purple-100/90 shadow-[0_10px_30px_rgba(0,0,0,0.18)] backdrop-blur-xl hover:bg-black/35 max-[360px]:h-7 max-[360px]:px-2.5 max-[360px]:text-[9px] sm:h-9 sm:px-4 sm:text-xs">
                        <Sparkles className="h-4 w-4 text-purple-200" />
                        Exclusive Creator Drops
                    </Badge>

                    <h1 className="inline-flex max-w-fit flex-col items-center text-[clamp(2.15rem,10vw,5rem)] font-black leading-[0.98] tracking-[-0.055em] text-white drop-shadow-[0_14px_38px_rgba(0,0,0,0.72)] sm:leading-[1.02] lg:text-8xl landscape:max-w-none landscape:text-[clamp(2.1rem,7vw,3.7rem)]">
                        KandyDrops
                        <br />
                        <span className="whitespace-nowrap bg-gradient-to-b from-white via-purple-100 to-brand-purple bg-clip-text text-transparent">
                            worth keeping.
                        </span>
                    </h1>

                    <p className="max-w-2xl text-[15px] font-medium leading-6 text-white/68 max-[360px]:text-[14px] max-[360px]:leading-6 sm:text-xl sm:leading-relaxed">
                        Explore limited Drops from your favorite creators, then unlock the ones you want in your library.
                    </p>

                    <HomeHeroActions />

                    <Card
                        data-testid="hero-activity-ticker-mask"
                        className="!gap-0 !border-0 !bg-transparent !p-0 pb-1 pt-1 shadow-none max-[360px]:pt-0 landscape:pb-0"
                    >
                        <ActivityTicker count={activeDropsCount} />
                    </Card>

                    <Card className="hidden w-full !gap-0 !rounded-[2rem] !border-white/10 !bg-black/28 !p-0 shadow-[0_22px_70px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:block lg:w-4/5 landscape:hidden">
                        <div className="px-5 pb-2 pt-5 sm:pt-7">
                            <p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-purple-100/75">Available now</p>
                            <DeferredHomeDropTicker drops={activeDrops} />
                        </div>
                    </Card>
                </div>
            </div>
        </section>
    );
}

function ActivityTicker({ count }: { count: number }) {
    return (
        <Badge
            data-testid="home-hero-live-chip"
            data-home-live-chip-state="ready"
            className="min-h-9 max-w-[95vw] items-center gap-2 overflow-hidden rounded-full border-purple-200/15 bg-black/45 px-3 py-1.5 shadow-[0_0_24px_rgba(168,85,247,0.18),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-xl hover:bg-black/45 max-[360px]:px-2.5 max-[360px]:py-1 sm:min-h-10 sm:gap-3 sm:px-5 sm:py-2"
        >
            <div className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-purple opacity-75 motion-reduce:animate-none"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-purple"></span>
            </div>
            <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[10px] font-semibold text-white/88 max-[360px]:text-[9px] sm:text-sm">
                Available Now: <span className="text-white font-bold">{count}</span> KandyDrops are ready to unwrap.
            </span>
        </Badge>
    );
}
