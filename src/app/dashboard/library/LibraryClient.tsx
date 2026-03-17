"use client";

import { useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { Lock } from "lucide-react";

import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Drop } from "@/types/db";
import { OwnedDropGalleryCard } from "@/components/Dashboard/OwnedDropGalleryCard";
import { trackEvent } from "@/lib/telemetry";

type Ratio = "1:1" | "16:9" | "9:16";

function getRatio(drop: Drop): Ratio {
    const raw = drop.fileMetadata?.dimensions;
    if (raw === "16:9" || raw === "9:16" || raw === "1:1") {
        return raw;
    }
    return "1:1";
}

function getItemSpanClass(drop: Drop): string {
    const ratio = getRatio(drop);
    if (ratio === "16:9") return "col-span-4";
    if (ratio === "9:16") return "col-span-2";
    return "col-span-3";
}

interface LibraryClientProps {
    drops: Drop[];
}

export function LibraryClient({ drops }: LibraryClientProps) {
    const { userProfile, loading: authLoading } = useAuth();
    const unlockedIds = useMemo(() => {
        const source = userProfile?.unlockedContent;
        return Array.isArray(source) ? new Set(source) : new Set<string>();
    }, [userProfile?.unlockedContent]);

    const router = useRouter();

    useEffect(() => {
        if (!userProfile) {
            return;
        }

        trackEvent("library_viewed");
    }, [userProfile]);

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
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-purple to-brand-purple mb-1">
                    My KandyDrops
                </h1>
                <p className="text-gray-400 text-sm">Your unlocked gallery.</p>
            </header>

            {drops.filter((d) => unlockedIds.has(d.id)).length === 0 ? (
                <div className="glass-panel p-12 rounded-3xl text-center border border-white/5">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Lock className="w-8 h-8 text-gray-500" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">No Content Yet</h2>
                    <p className="text-gray-400 mb-8 max-w-md mx-auto">
                        You haven&apos;t unlocked any drops yet. Browse live drops to start building your collection.
                    </p>
                    <Link href="/drops">
                        <Button variant="brand" className="px-8 py-3 rounded-full text-lg">
                            Browse Drops
                        </Button>
                    </Link>
                </div>
            ) : (
                <div id="library-grid" className="grid grid-cols-6 gap-3 md:gap-4">
                    {drops.filter((d) => unlockedIds.has(d.id)).map((drop) => (
                        <div key={drop.id} className={getItemSpanClass(drop)}>
                            <OwnedDropGalleryCard
                                drop={drop}
                                isUnlocked
                                onOpen={() => {
                                    router.push(`/dashboard/viewer?id=${drop.id}`);
                                }}
                            />
                        </div>
                    ))}
                </div>
            )}

        </div>
    );
}
