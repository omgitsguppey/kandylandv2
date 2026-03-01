"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Lock } from "lucide-react";

import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { Drop } from "@/types/db";
import { OwnedDropGalleryCard } from "@/components/Dashboard/OwnedDropGalleryCard";
import { ContentViewer, ViewerMediaItem } from "@/components/ContentViewer";
import { getGalleryAspectRatio, getGallerySpanClass } from "@/components/Dashboard/gallery-layout";
import { authFetch } from "@/lib/authFetch";

interface LibraryClientProps {
    drops: Drop[];
}

export function LibraryClient({ drops }: LibraryClientProps) {
    const { userProfile, loading: authLoading } = useAuth();
    const [viewerIndex, setViewerIndex] = useState(0);
    const [viewerOpen, setViewerOpen] = useState(false);
    const [contentUrlsById, setContentUrlsById] = useState<Record<string, string>>({});

    const unlockedIds = useMemo(() => {
        const source = userProfile?.unlockedContent;
        return Array.isArray(source) ? new Set(source) : new Set<string>();
    }, [userProfile?.unlockedContent]);

    const unlockedDrops = useMemo(() => drops.filter((drop) => unlockedIds.has(drop.id)), [drops, unlockedIds]);

    useEffect(() => {
        const dropIds = new Set(unlockedDrops.map((drop) => drop.id));
        setContentUrlsById((prev) => {
            const entries = Object.entries(prev).filter(([dropId]) => dropIds.has(dropId));
            return Object.fromEntries(entries);
        });
    }, [unlockedDrops]);

    useEffect(() => {
        let cancelled = false;
        const unresolvedDrops = unlockedDrops.filter((drop) => !contentUrlsById[drop.id]);

        if (unresolvedDrops.length === 0) {
            return;
        }

        const fetchUrls = async () => {
            const resolvedEntries = await Promise.all(
                unresolvedDrops.map(async (drop): Promise<[string, string] | null> => {
                    try {
                        const response = await authFetch(`/api/drops/content?id=${drop.id}`, {
                            headers: {
                                Accept: "application/json",
                            },
                        });

                        if (!response.ok) {
                            return null;
                        }

                        const data = await response.json();
                        if (typeof data?.url !== "string" || data.url.length === 0) {
                            return null;
                        }

                        return [drop.id, data.url];
                    } catch {
                        return null;
                    }
                })
            );

            if (cancelled) {
                return;
            }

            const nextEntries = resolvedEntries.filter((entry): entry is [string, string] => Array.isArray(entry));
            if (nextEntries.length === 0) {
                return;
            }

            setContentUrlsById((prev) => ({
                ...prev,
                ...Object.fromEntries(nextEntries),
            }));
        };

        fetchUrls();

        return () => {
            cancelled = true;
        };
    }, [contentUrlsById, unlockedDrops]);

    const mediaItems = useMemo<ViewerMediaItem[]>(() => {
        return unlockedDrops.map((drop) => {
            const type = drop.fileMetadata?.type?.startsWith("video/") ? "video" : "image";
            const resolvedUrl = contentUrlsById[drop.id];
            const url = typeof resolvedUrl === "string" && resolvedUrl.length > 0 ? resolvedUrl : drop.imageUrl;

            return {
                id: drop.id,
                url,
                type,
                alt: drop.title,
                posterUrl: typeof drop.imageUrl === "string" && drop.imageUrl.length > 0 ? drop.imageUrl : undefined,
            };
        });
    }, [contentUrlsById, unlockedDrops]);

    if (authLoading) {
        return (
            <div className="animate-pulse">
                <div className="mb-6">
                    <div className="h-10 w-64 bg-white/10 rounded mb-2" />
                    <div className="h-5 w-72 bg-white/5 rounded" />
                </div>
                <div className="grid grid-cols-6 gap-3">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="col-span-3 aspect-square bg-white/5 rounded-2xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div>
            <header className="mb-6">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-pink to-brand-cyan mb-1">
                    My KandyDrops
                </h1>
                <p className="text-gray-400 text-sm">Your unlocked gallery.</p>
            </header>

            {unlockedDrops.length === 0 ? (
                <div className="glass-panel p-12 rounded-3xl text-center border border-white/5">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Lock className="w-8 h-8 text-gray-500" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">No Content Yet</h2>
                    <p className="text-gray-400 mb-8 max-w-md mx-auto">
                        You haven't unlocked any drops yet. Visit the home page to start your collection.
                    </p>
                    <Link href="/">
                        <Button variant="brand" className="px-8 py-3 rounded-full text-lg">
                            Browse Drops
                        </Button>
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-6 gap-3 md:gap-4">
                    {unlockedDrops.map((drop, idx) => {
                        const ratio = getGalleryAspectRatio(drop);
                        return (
                            <div key={drop.id} className={getGallerySpanClass(ratio)}>
                                <OwnedDropGalleryCard
                                    drop={drop}
                                    isUnlocked
                                    onOpen={() => {
                                        setViewerIndex(idx);
                                        setViewerOpen(true);
                                    }}
                                />
                            </div>
                        );
                    })}
                </div>
            )}

            <ContentViewer
                items={mediaItems}
                initialIndex={viewerIndex}
                isOpen={viewerOpen}
                onClose={() => setViewerOpen(false)}
            />
        </div>
    );
}
