import type { ComponentProps } from "react";

import { CreatorDiscoveryRail } from "@/components/CreatorDiscoveryRail";
import { ContentFrame, ContentSection, SectionHeader } from "@/components/ui/content-layout";
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
                data-home-hero-layout="content-first"
                data-home-hero-shell-aware="true"
                data-hydration-lane="critical"
                className="border-b border-border"
                aria-labelledby="home-title"
            >
                <ContentFrame className="grid items-start gap-10 [grid-template-columns:repeat(auto-fit,minmax(min(100%,24rem),1fr))]">
                    <div className="max-w-xl space-y-6">
                        <SectionHeader level={1} headingId="home-title" title="Unwrap your KandyDrops" description="Discover limited Drops from creators you care about. Keep every one you unwrap in your collection." />
                        <PublicHomeActions />
                    </div>

                    <ContentSection data-home-featured-state={featuredDrop ? "available" : "empty"} aria-label="Featured Drop">
                        <SectionHeader title="Featured Drop" />
                        <PublicDropShelf drops={featuredDrop ? [featuredDrop] : []} presentation="feature" />
                    </ContentSection>
                </ContentFrame>
            </section>

            <section
                data-home-section="creator-spotlight"
                data-home-density="content-first"
                className="min-w-0"
            >
                <ContentFrame>
                    <CreatorDiscoveryRail surface="home" initialCreators={initialCreators} />
                </ContentFrame>
            </section>

            <PublicDropShelf drops={remainingDrops} presentation="shelf" />
        </>
    );
}
