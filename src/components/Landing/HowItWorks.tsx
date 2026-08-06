import { Eye, Heart, Lock } from "lucide-react";

import { Badge } from "@/components/creative-tim/ui/badge";
import { Card } from "@/components/creative-tim/ui/card";
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
            className="relative isolate overflow-hidden border-t border-white/5 bg-[#08030f] py-10 [content-visibility:auto] [contain-intrinsic-size:1100px] sm:py-24"
        >
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#b28cff05_1px,transparent_1px),linear-gradient(to_bottom,#b28cff05_1px,transparent_1px)] bg-[size:4rem_4rem]" aria-hidden="true" />
            <div className="pointer-events-none absolute -right-28 top-12 h-80 w-80 rounded-full bg-brand-purple/10 blur-[110px] motion-reduce:hidden" aria-hidden="true" />

            <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mx-auto mb-6 max-w-3xl text-center sm:mb-10">
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-purple-200/80">Browse the collection</p>
                    <h2 className="mt-3 text-[1.9rem] font-black tracking-tight text-white sm:text-4xl md:text-5xl">Find your next KandyDrop.</h2>
                    <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-white/62 sm:text-base sm:leading-7">
                        See what is available now, then unwrap when a Drop is right for you.
                    </p>
                </div>

                <Card className="relative !gap-0 !overflow-hidden !rounded-[2rem] !border-purple-200/15 !bg-[linear-gradient(145deg,rgba(28,14,48,0.94),rgba(8,5,17,0.98)_60%,rgba(20,10,35,0.94))] !p-0 shadow-[0_24px_70px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.1)] sm:!rounded-[2.6rem]">
                    <div className="pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full bg-brand-purple/12 blur-[68px] motion-reduce:hidden" aria-hidden="true" />
                    <div className="pointer-events-none absolute bottom-0 left-0 h-72 w-72 rounded-full bg-fuchsia-500/8 blur-[68px] motion-reduce:hidden" aria-hidden="true" />

                    <div className="relative z-10 space-y-4 p-4 sm:space-y-5 sm:p-6 md:p-8">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
                            <div>
                                <p className="mb-2 text-[11px] font-black uppercase tracking-[0.22em] text-purple-200/80">Available now</p>
                                <h3 className="text-[1.5rem] font-black tracking-tight text-white sm:text-3xl">Drops made to be unwrapped.</h3>

                                <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2 text-[10px] font-bold sm:text-[11px]">
                                    <Badge className="h-7 gap-1.5 rounded-full border-green-300/15 bg-green-400/8 px-2.5 text-white shadow-none hover:bg-green-400/8">
                                        <span className="h-1.5 w-1.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]" />
                                        Live Drops
                                    </Badge>
                                    <span className="text-white/20" aria-hidden="true">&middot;</span>
                                    <span className="inline-flex items-center gap-1.5 text-gray-400">
                                        Creator Experiences
                                    </span>
                                    <span className="text-white/20" aria-hidden="true">&middot;</span>
                                    <span className="inline-flex items-center gap-1.5 text-gray-400">
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
                </Card>

                <div className="mx-auto mb-5 mt-14 max-w-3xl text-center sm:mb-10 sm:mt-24">
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-purple-200/80">How it works</p>
                    <h2 className="mt-3 text-[1.8rem] font-black tracking-tight text-white sm:text-4xl">Keep what you unwrap.</h2>
                    <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-white/62 sm:text-base sm:leading-7">
                        Three simple steps keep every Drop clear from discovery through your library.
                    </p>
                </div>

                <div
                    role="region"
                    aria-label="How KandyDrops works steps"
                    className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-4 pb-4 [touch-action:pan-x] sm:mx-0 sm:mb-8 sm:grid sm:grid-cols-3 sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    tabIndex={0}
                >
                    {HOW_IT_WORKS_FEATURES.map((feature, index) => (
                        <Card key={index} className="group flex w-[74vw] max-w-[268px] shrink-0 snap-center !gap-0 !rounded-[1.7rem] !border-white/10 !bg-[linear-gradient(145deg,rgba(255,255,255,0.075),rgba(255,255,255,0.025))] !p-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-transform duration-300 hover:-translate-y-1 motion-reduce:transform-none sm:aspect-square sm:w-auto sm:max-w-none sm:!rounded-3xl">
                            <div className="flex h-full flex-col items-center justify-center p-5 text-center sm:p-6 lg:p-8">
                                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-purple-200/20 bg-brand-purple/12 transition-transform duration-300 group-hover:scale-110 motion-reduce:transform-none sm:h-14 sm:w-14 lg:h-16 lg:w-16">
                                    {feature.icon}
                                </div>
                                <h3 className="mb-1.5 text-[15px] font-bold text-white sm:text-lg lg:text-xl">{feature.title}</h3>
                                <p className="text-[12px] leading-[1.35rem] text-gray-300/75 sm:text-sm sm:leading-6">{feature.description}</p>
                            </div>
                        </Card>
                    ))}
                </div>

                <div className="mt-8 flex justify-center sm:mt-12">
                    <HomeHowItWorksActions variant="primary" />
                </div>
            </div>
        </section>
    );
}
