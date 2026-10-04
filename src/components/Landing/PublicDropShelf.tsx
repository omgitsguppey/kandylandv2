"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";

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
                <div className="min-w-0 rounded-lg bg-muted p-4 text-center [overflow-wrap:anywhere]">
                    <p className="text-sm font-medium text-foreground">No featured Drop is available right now.</p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Explore creators or check back for future releases.</p>
                </div>
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
            <div className="mx-auto min-w-0 w-full max-w-6xl px-4 py-8 sm:py-12 [overflow-wrap:anywhere]">
                <header className="mb-6 space-y-2 sm:mb-8">
                    <h2 id="home-drops-title" className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                        More Drops
                    </h2>
                    <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                        Preview a Drop before you unwrap it.
                    </p>
                </header>

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
                    <div className="min-w-0 rounded-xl bg-muted p-4 text-center [overflow-wrap:anywhere]">
                        <p className="text-base font-medium text-foreground">No additional Drops are available right now.</p>
                        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                            Check back for future releases from creators.
                        </p>
                    </div>
                )}
            </div>
        </section>
    );
}
