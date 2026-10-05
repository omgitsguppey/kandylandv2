"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";

import { ContentFrame, SectionHeader } from "@/components/ui/content-layout";
import { Card, CardContent } from "@/components/ui/card";
import { DropCard } from "@/components/DropCard";
import { KandyEditorialHomeShelf } from "@/components/creative-tim/kandydrops/drops/KandyEditorialHomeShelf";
import { useAuthIdentity, useUserProfile } from "@/context/AuthContext";
import type { Drop } from "@/types/db";

interface PublicDropShelfProps {
    drops: Drop[];
    presentation: "feature" | "shelf";
}

export function PublicDropShelf({ drops, presentation }: PublicDropShelfProps) {
    const router = useRouter();
    const { user } = useAuthIdentity();
    const { userProfile } = useUserProfile();
    const unlockedDropIds = useMemo(
        () => new Set(userProfile?.unlockedContent ?? []),
        [userProfile?.unlockedContent],
    );
    const previewSource = presentation === "feature" ? "public_home_featured_drop" : "public_home_drop_shelf";
    const handlePreview = useCallback((drop: Drop) => {
        router.push(`/drops/${encodeURIComponent(drop.id)}/preview?source_component=${encodeURIComponent(previewSource)}`);
    }, [previewSource, router]);

    if (presentation === "feature") {
        const featuredDrop = drops[0];

        if (!featuredDrop) {
            return (
                <Card className="py-0"><CardContent className="p-5 text-center [overflow-wrap:anywhere]">
                    <p className="text-sm font-medium text-foreground">No featured Drop is available right now.</p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Explore creators or check back for future releases.</p>
                </CardContent></Card>
            );
        }

        return (
            <div data-home-shelf="featured">
                <DropCard
                    drop={featuredDrop}
                    presentation="feature"
                    user={user}
                    isUnlocked={unlockedDropIds.has(featuredDrop.id)}
                    onPreview={handlePreview}
                    impressionTrackingSurface="home_featured_drop"
                    impressionTrackingPosition={1}
                />
            </div>
        );
    }

    return (
        <section
            data-home-section="drop-shelf"
            data-home-density="content-first"
            className="border-t border-border"
            aria-labelledby="home-drops-title"
        >
            <ContentFrame className="space-y-6 [overflow-wrap:anywhere]">
                <SectionHeader headingId="home-drops-title" title="More Drops" description="Preview a Drop before you unwrap it." />

                {drops.length > 0 ? (
                    <KandyEditorialHomeShelf
                        drops={drops}
                        renderDrop={(drop, index, cardPresentation) => (
                            <DropCard
                                key={drop.id}
                                drop={drop}
                                presentation={cardPresentation}
                                user={user}
                                isUnlocked={unlockedDropIds.has(drop.id)}
                                onPreview={handlePreview}
                                impressionTrackingSurface="home_public_drop_shelf"
                                impressionTrackingPosition={index + 1}
                            />
                        )}
                    />
                ) : (
                    <Card className="py-0"><CardContent className="p-5 text-center [overflow-wrap:anywhere]">
                        <p className="text-base font-medium text-foreground">No additional Drops are available right now.</p>
                        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                            Check back for future releases from creators.
                        </p>
                    </CardContent></Card>
                )}
            </ContentFrame>
        </section>
    );
}
