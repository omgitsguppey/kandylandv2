import { Lock, Eye, Heart } from "lucide-react";
import { DeferredHomeActiveDropsCarousel } from "@/components/Landing/DeferredHomeActiveDropsCarousel";
import { HomeHowItWorksActions } from "@/components/Landing/HomeHowItWorksActions";
import type { Drop } from "@/types/db";

interface HowItWorksProps {
    activeDrops: Drop[];
}

const HOW_IT_WORKS_FEATURES = [
    {
        icon: <Lock className="h-8 w-8 text-brand-purple" />,
        title: "Join Free",
        description: "Create a free profile so your stash and library stay synced.",
    },
    {
        icon: <Eye className="h-8 w-8 text-brand-purple" />,
        title: "Unwrap",
        description: "Check the timer and file count, then unwrap before the window ends.",
    },
    {
        icon: <Heart className="h-8 w-8 text-brand-purple" />,
        title: "Keep Access",
        description: "Unwrap while it is live and keep it in your library after expiry.",
    },
];

export function HowItWorks({ activeDrops }: HowItWorksProps) {
    return (
        <section
            data-home-section="how-it-works"
            data-home-density="compact-mobile-v1"
            className="relative border-t border-white/5 bg-black py-7 [content-visibility:auto] [contain-intrinsic-size:1100px] sm:py-20"
        >
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#b28cff05_1px,transparent_1px),linear-gradient(to_bottom,#b28cff05_1px,transparent_1px)] bg-[size:4rem_4rem]" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
                <div className="mx-auto mb-4 max-w-3xl text-center sm:mb-12">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-brand-purple mb-3">How It Works</p>
                    <h2 className="mb-3 text-[1.72rem] font-extrabold text-white sm:mb-5 sm:text-4xl md:text-5xl">Keep what you unwrap forever</h2>
                </div>

                <div
                    role="region"
                    aria-label="How KandyDrops works steps"
                    className="-mx-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto overscroll-x-contain px-4 pb-4 [touch-action:pan-x] sm:mx-0 sm:mb-8 sm:grid sm:grid-cols-3 sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    tabIndex={0}
                >
                    {HOW_IT_WORKS_FEATURES.map((feature, index) => (
                        <div key={index} className="shrink-0 w-[74vw] max-w-[268px] snap-center sm:w-auto sm:max-w-none group rounded-[1.7rem] border border-white/5 bg-zinc-950 p-5 transition-colors hover:bg-zinc-900 sm:aspect-square sm:rounded-3xl sm:p-6 lg:p-8 flex flex-col justify-center">
                            <div className="flex h-full flex-col items-center justify-center text-center">
                                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-purple/20 bg-brand-purple/10 transition-transform group-hover:scale-110 sm:h-14 sm:w-14 lg:h-16 lg:w-16">
                                    {feature.icon}
                                </div>
                                <h3 className="mb-1.5 text-[15px] font-bold text-white sm:text-lg lg:text-xl">{feature.title}</h3>
                                <p className="text-[12px] leading-[1.35rem] text-gray-400 sm:text-sm sm:leading-6">{feature.description}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mb-10 flex justify-center sm:mb-20">
                    <HomeHowItWorksActions variant="primary" />
                </div>

                <div className="relative overflow-hidden rounded-[2rem] border border-brand-purple/10 bg-zinc-900 p-3.5 sm:rounded-[2.6rem] sm:p-6 md:p-8">
                    <div className="pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full bg-brand-purple/8 blur-[68px] motion-reduce:hidden" aria-hidden="true" />
                    <div className="pointer-events-none absolute bottom-0 left-0 h-72 w-72 rounded-full bg-brand-purple/5 blur-[68px] motion-reduce:hidden" aria-hidden="true" />

                    <div className="relative z-10 space-y-4 sm:space-y-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-brand-purple mb-2">Daily experiences</p>
                                <h3 className="text-[1.42rem] font-extrabold text-white sm:text-3xl">Experiences for you</h3>
                                
                                <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] sm:text-[11px] font-bold">
                                    <span className="inline-flex items-center gap-1.5 px-1 py-1 text-white">
                                        <div className="h-1.5 w-1.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]" />
                                        Live Drops
                                    </span>
                                    <span className="text-white/20 select-none">•</span>
                                    <span className="inline-flex items-center gap-1.5 px-1 py-1 text-gray-400">
                                        Creator Experiences
                                    </span>
                                    <span className="text-white/20 select-none">•</span>
                                    <span className="inline-flex items-center gap-1.5 px-1 py-1 text-gray-400">
                                        Daily Tasks
                                    </span>
                                </div>
                            </div>
                            <HomeHowItWorksActions variant="secondary" />
                        </div>

                        <DeferredHomeActiveDropsCarousel
                            drops={activeDrops}
                            autoPlayMs={5_000}
                            emptyLabel="No daily experiences are live yet."
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}
