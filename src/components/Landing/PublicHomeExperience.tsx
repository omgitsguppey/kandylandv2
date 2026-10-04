import type { ComponentProps } from "react";

import { CreatorDiscoveryRail } from "@/components/CreatorDiscoveryRail";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/creative-tim/ui/card";
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
                <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-2 lg:items-center lg:gap-12 lg:px-8 lg:py-16">
                    <div className="max-w-xl space-y-6">
                        <div className="space-y-4">
                            <h1 id="home-title" className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                                Unwrap your KandyDrops
                            </h1>
                            <p className="max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
                                Discover limited Drops from creators you care about. Keep every one you unwrap in your collection.
                            </p>
                        </div>
                        <PublicHomeActions />
                    </div>

                    <Card
                        data-home-featured-state={featuredDrop ? "available" : "empty"}
                        className="min-w-0 gap-4 py-4 shadow-none sm:py-6"
                    >
                        <CardHeader className="px-4 sm:px-6">
                            <CardTitle>
                                <h2 className="text-lg font-semibold text-foreground">Featured Drop</h2>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 sm:px-6">
                            <PublicDropShelf
                                drops={featuredDrop ? [featuredDrop] : []}
                                presentation="feature"
                            />
                        </CardContent>
                    </Card>
                </div>
            </section>

            <section
                data-home-section="creator-spotlight"
                data-home-density="content-first"
                className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8"
            >
                <CreatorDiscoveryRail surface="home" initialCreators={initialCreators} />
            </section>

            <PublicDropShelf drops={remainingDrops} presentation="shelf" />
        </>
    );
}
