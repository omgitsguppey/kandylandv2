import type { ComponentProps } from "react";

import { CreatorDiscoveryRail } from "@/components/CreatorDiscoveryRail";
import type { Drop } from "@/types/db";

import { PublicHomeActions } from "./PublicHomeActions";
import { PublicDropShelf } from "./PublicDropShelf";

interface PublicHomeExperienceProps {
    activeDrops: Drop[];
    initialCreators: ComponentProps<typeof CreatorDiscoveryRail>["initialCreators"];
}

export function PublicHomeExperience({ activeDrops, initialCreators }: PublicHomeExperienceProps) {
    const featuredDrop = activeDrops[0] ?? null;
    const remainingDrops = featuredDrop
        ? activeDrops.filter((drop) => drop.id !== featuredDrop.id)
        : activeDrops;

    return (
        <>
            <section
                data-home-section="hero"
                data-home-hero-layout="editorial-release"
                data-home-hero-shell-aware="true"
                data-hydration-lane="critical"
                className="border-b border-white/10"
            >
                <div className="mx-auto grid w-full max-w-7xl gap-7 px-4 py-7 sm:px-6 sm:py-9 lg:grid-cols-[minmax(0,0.88fr)_minmax(20rem,0.62fr)] lg:items-center lg:gap-12 lg:px-8 lg:py-11">
                    <div className="max-w-2xl">
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/48 sm:text-xs">
                            Limited creator releases
                        </p>
                        <h1 className="mt-4 max-w-xl text-3xl font-black leading-[0.98] tracking-[-0.045em] text-white sm:text-4xl lg:text-5xl">
                            Unwrap your KandyDrops
                        </h1>
                        <p className="mt-5 max-w-xl text-base leading-7 text-white/68 sm:text-lg sm:leading-8">
                            Browse limited Drops from creators you care about, then keep every one you unwrap in your KandyDrops library.
                        </p>

                        <div className="mt-7" data-home-primary-action="true">
                            <PublicHomeActions />
                        </div>

                        <p className="mt-7 max-w-md border-l border-white/20 pl-4 text-sm leading-6 text-white/54">
                            Explore the Drops and creators making the next wave.
                        </p>
                    </div>

                    <div>
                        <div className="border border-white/12 bg-[#0e0e10] p-3 sm:p-4">
                            <div className="mb-3 flex items-start justify-between gap-4 border-b border-white/10 px-1 pb-3">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/52">Featured live Drop</p>
                                    <p className="mt-1 text-sm text-white/56">Ready when you are.</p>
                                </div>
                                <span className="mt-0.5 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/66">
                                    <span className="h-1.5 w-1.5 bg-white/80" />
                                    Live
                                </span>
                            </div>
                            <PublicDropShelf
                                drops={featuredDrop ? [featuredDrop] : []}
                                presentation="feature"
                            />
                        </div>
                    </div>
                </div>
            </section>

            <PublicDropShelf drops={remainingDrops} presentation="shelf" />

            <section
                data-home-section="creator-spotlight"
                data-home-density="editorial-handoff"
                className="border-b border-white/10 py-12 sm:py-16"
                aria-labelledby="home-creator-spotlight-title"
            >
                <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="mb-8 grid gap-5 border-b border-white/10 pb-7 lg:grid-cols-[minmax(0,0.9fr)_minmax(20rem,0.58fr)] lg:items-end lg:gap-12">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/48">Creator spotlight</p>
                            <h2 id="home-creator-spotlight-title" className="mt-3 max-w-2xl text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl">
                                Follow the people behind your next favorite Drop.
                            </h2>
                        </div>
                        <p className="max-w-md text-sm leading-6 text-white/58 lg:justify-self-end">
                            Your unwrapped Drops belong in your library.
                        </p>
                    </div>
                    <CreatorDiscoveryRail surface="home" initialCreators={initialCreators} />
                </div>
            </section>
            <style>{`
                [data-home-primary-action] :is(a, button) {
                    background-color: #8b5cf6 !important;
                    background-image: none !important;
                    color: #ffffff !important;
                }
            `}</style>
        </>
    );
}
