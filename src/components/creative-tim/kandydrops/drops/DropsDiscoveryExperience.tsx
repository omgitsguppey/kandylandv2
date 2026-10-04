"use client";

import type { ReactNode } from "react";

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
    const collectionTitle = deferredSearchQuery.trim()
        ? `Results for "${deferredSearchQuery.trim()}"`
        : selectedCategory === "All" ? "All Drops" : `${selectedCategory} Drops`;
    const releaseLabel = activeDropCount === 0
        ? "No loaded releases"
        : `${activeDropCount} loaded ${activeDropCount === 1 ? "release" : "releases"}`;

    return (
        <main
            className="mx-auto min-w-0 w-full max-w-7xl space-y-8 px-4 pb-8 pt-[calc(var(--kandy-cookie-offset,0px)+0.5rem)] text-foreground"
            data-onboarding-page="drops"
            data-drops-page-density="creative-tim-editorial"
            data-drop-visibility-scope="public_discovery"
        >
            <header className="flex min-w-0 flex-wrap items-start justify-between gap-5">
                <div className="min-w-0 flex-1 basis-72">
                    <h1 className="text-3xl font-semibold tracking-tight [overflow-wrap:anywhere]">Explore the Drops</h1>
                    <p className="mt-2 text-base leading-relaxed text-muted-foreground">Explore the collection and the creators behind each release.</p>
                    <p className="mt-2 text-sm text-muted-foreground">{releaseLabel}</p>
                </div>
                <div className="min-w-0 max-w-full flex-1 basis-72" aria-label="Your KandyDrops account">{accountOverview}</div>
            </header>

            <section aria-label="Search and filter Drops" className="min-w-0">{filters}</section>

            {featuredRelease ? (
                <section aria-label="Featured KandyDrops" className="min-w-0 space-y-4">
                    <h2 className="text-xl font-semibold tracking-tight">Featured Drops</h2>
                    {featuredRelease}
                </section>
            ) : null}

            <section id="live-drops" className="min-w-0 scroll-mt-24 space-y-4" aria-labelledby="live-drops-heading">
                <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-3">
                    <h2 id="live-drops-heading" className="min-w-0 text-2xl font-semibold tracking-tight [overflow-wrap:anywhere]">{collectionTitle}</h2>
                    <p className="text-sm text-muted-foreground">{visibleDropCount} {visibleDropCount === 1 ? "loaded Drop" : "loaded Drops"}</p>
                </div>
                {collection}
                {pagination}
            </section>

            {creatorRail ? <section className="min-w-0" aria-label="Featured creators">{creatorRail}</section> : null}
        </main>
    );
}
