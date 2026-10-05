"use client";

import type { ReactNode } from "react";
import { ContentFrame, ContentSection, SectionHeader } from "@/components/ui/content-layout";

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
        <main data-onboarding-page="drops" data-drops-page-density="creative-tim-editorial" data-drop-visibility-scope="public_discovery" className="text-foreground">
            <ContentFrame className="space-y-12 pt-[calc(var(--kandy-cookie-offset,0px)+2rem)]">
                <div className="grid min-w-0 items-start gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,24rem),1fr))]">
                    <SectionHeader level={1} title="Explore the Drops" description="Explore the collection and the creators behind each release." accessory={releaseLabel} />
                    <div className="min-w-0" aria-label="Your KandyDrops account">{accountOverview}</div>
                </div>

                {featuredRelease ? (
                    <ContentSection aria-label="Featured KandyDrops">
                        <SectionHeader title="Featured Drops" />
                        {featuredRelease}
                    </ContentSection>
                ) : null}

                <ContentSection aria-label="Search and filter Drops">{filters}</ContentSection>

                <ContentSection id="live-drops" aria-labelledby="live-drops-heading">
                    <SectionHeader headingId="live-drops-heading" title={collectionTitle} accessory={`${visibleDropCount} ${visibleDropCount === 1 ? "loaded Drop" : "loaded Drops"}`} />
                    {collection}
                    {pagination}
                </ContentSection>

                {creatorRail ? <ContentSection aria-label="Featured creators">{creatorRail}</ContentSection> : null}
            </ContentFrame>
        </main>
    );
}
