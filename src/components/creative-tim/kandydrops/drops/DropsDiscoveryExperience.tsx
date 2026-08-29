"use client";

import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";

interface DropsDiscoveryExperienceProps {
    activeDropCount: number;
    visibleDropCount: number;
    selectedCategory: string;
    deferredSearchQuery: string;
    accountOverview: ReactNode;
    featuredRelease: ReactNode;
    creatorRail: ReactNode;
    filters: ReactNode;
    collection: ReactNode;
    pagination: ReactNode;
}

export function DropsDiscoveryExperience({
    activeDropCount,
    visibleDropCount,
    selectedCategory,
    deferredSearchQuery,
    accountOverview,
    featuredRelease,
    creatorRail,
    filters,
    collection,
    pagination,
}: DropsDiscoveryExperienceProps) {
    const collectionTitle = deferredSearchQuery
        ? `Results for "${deferredSearchQuery}"`
        : selectedCategory === "All"
            ? "The live collection"
            : `${selectedCategory} Drops`;
    const releaseLabel = activeDropCount === 1 ? "1 release is live" : `${activeDropCount} releases are live`;

    return (
        <main
            className="mx-auto w-full max-w-7xl bg-[#08050d] px-4 pb-8 pt-[calc(var(--kandy-cookie-offset,0px)+0.5rem)] selection:bg-brand-purple/30 sm:px-6 md:px-8 md:pb-12 md:pt-4"
            data-onboarding-page="drops"
            data-drops-page-density="creative-tim-editorial"
            data-drop-visibility-scope="public_discovery"
        >
            <header className="flex flex-col gap-4 border-b border-white/10 pb-4 md:flex-row md:items-center md:justify-between md:gap-6 md:pb-5">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-brand-purple sm:text-[11px]">
                        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                        The KandyDrops collection
                    </div>
                    <h1 className="mt-2 text-2xl font-black leading-none tracking-[-0.04em] text-white sm:text-3xl">
                        Explore the Drops
                    </h1>
                    <p className="mt-2 text-sm leading-6 text-gray-300 sm:text-base">
                        Explore the Drops and creators making the next wave.
                    </p>
                    <span className="mt-2 block text-xs font-semibold text-white/55">{releaseLabel}</span>
                </div>
                <div className="w-full max-w-[16rem] shrink-0" aria-label="Your KandyDrops account">
                    {accountOverview}
                </div>
            </header>

            {featuredRelease ? (
                <section className="mt-5 border-b border-white/10 pb-5 md:mt-6 md:pb-6" aria-label="Featured KandyDrops">
                    <div className="mb-2 flex items-center gap-4 md:mb-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">Featured release</p>
                        <div className="h-px flex-1 bg-white/10" aria-hidden="true" />
                    </div>
                    {featuredRelease}
                </section>
            ) : (
                <section className="mt-5 border-b border-dashed border-white/15 px-1 pb-5 text-center md:mt-6 md:pb-6">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-purple">Sealed for now</p>
                    <h2 className="mt-3 text-xl font-black tracking-tight text-white md:text-2xl">The next KandyDrop is getting ready.</h2>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-400">Check the collection again soon for the next live release.</p>
                </section>
            )}

            <section id="live-drops" className="mt-5 scroll-mt-24 md:mt-7" aria-labelledby="live-drops-heading">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-purple">Release shelf</p>
                        <h2 id="live-drops-heading" className="mt-2 text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl">
                            {collectionTitle}
                        </h2>
                    </div>
                    <span className="text-xs font-bold text-gray-400">
                        {visibleDropCount} {visibleDropCount === 1 ? "Drop" : "Drops"}
                    </span>
                </div>

                <div className="mt-3 border-y border-white/10 md:mt-4">
                    {filters}
                </div>

                <div className="mt-5 md:mt-6">
                    {collection}
                    {pagination}
                </div>
            </section>

            <section className="mt-8 border-t border-white/10 pt-6 md:mt-10 md:pt-8" aria-label="Featured creators">
                {creatorRail}
            </section>
        </main>
    );
}
