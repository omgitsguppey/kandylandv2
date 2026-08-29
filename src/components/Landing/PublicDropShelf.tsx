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
                <div className="border border-dashed border-white/14 bg-black/15 px-5 py-10 text-center">
                    <p className="text-sm font-bold text-white">The next Drop is being prepared.</p>
                    <p className="mt-2 text-sm leading-6 text-white/58">Come back when the shelf is live.</p>
                </div>
            );
        }

        return (
            <div data-home-shelf="featured" className="[&_[data-drop-card-root]]:shadow-none">
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
            data-home-density="editorial-mobile-v1"
            className="border-b border-white/10 px-4 py-12 sm:px-6 sm:py-16 lg:px-8"
            aria-labelledby="home-live-drops-title"
        >
            <div className="mx-auto max-w-7xl">
                <header className="mb-8 flex flex-col gap-5 border-b border-white/10 pb-7 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
                    <div className="max-w-2xl">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/48">The live shelf</p>
                        <h2 id="home-live-drops-title" className="mt-3 text-2xl font-black tracking-[-0.045em] text-white sm:text-3xl">
                            Pick the one you will keep.
                        </h2>
                        <p className="mt-3 max-w-xl text-sm leading-6 text-white/60 sm:text-base">
                            Every card is a real live Drop. Preview the public cover, then unwrap only what belongs in your library.
                        </p>
                    </div>
                    <p className="text-sm font-semibold text-white/68">Browse at your pace</p>
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
                    <div className="border border-dashed border-white/14 px-7 py-10 text-center sm:px-10">
                        <p className="text-lg font-black text-white">The next shelf is on its way.</p>
                        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/58">
                            No additional public Drops are live right now. Check back when a creator releases the next one.
                        </p>
                    </div>
                )}
            </div>
        </section>
    );
}
