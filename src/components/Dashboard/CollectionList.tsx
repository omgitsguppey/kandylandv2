"use client";

import { Drop, UserProfile } from "@/types/db";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutGrid } from "lucide-react";

import { cn } from "@/lib/utils";
import { OwnedDropGalleryCard } from "./OwnedDropGalleryCard";
import { DropPreviewModal } from "@/components/DropPreviewModal";

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

interface CollectionListProps {
    drops: Drop[];
    userProfile: UserProfile | null;
}

export function CollectionList({ drops, userProfile }: CollectionListProps) {
    const [filter, setFilter] = useState<"all" | "owned" | "locked">("all");
    const [selectedPreviewDrop, setSelectedPreviewDrop] = useState<Drop | null>(null);

    const { ownedIds, ownedCount, lockedCount } = useMemo(() => {
        const rawUnlocked = userProfile?.unlockedContent;
        const unlockedList = Array.isArray(rawUnlocked) ? rawUnlocked : [];
        const ids = new Set(unlockedList);
        const owned = drops.filter((drop) => ids.has(drop.id)).length;
        const locked = drops.length - owned;
        return { ownedIds: ids, ownedCount: owned, lockedCount: locked };
    }, [drops, userProfile?.unlockedContent]);

    const filteredDrops = useMemo(() => {
        if (filter === "owned") return drops.filter((drop) => ownedIds.has(drop.id));
        if (filter === "locked") return drops.filter((drop) => !ownedIds.has(drop.id));
        return drops;
    }, [drops, filter, ownedIds]);

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl font-bold text-white">My KandyDrops</h2>
                    <div className="text-xs text-gray-400 font-medium mt-1">
                        <span className="text-brand-pink">{ownedCount} Owned</span>
                        <span className="mx-2">·</span>
                        <span>{lockedCount} Locked</span>
                        <span className="mx-2">·</span>
                        <span>{drops.length} Total</span>
                    </div>
                </div>

                <div className="flex items-center bg-white/5 rounded-xl p-1 self-start md:self-auto border border-white/5" role="group" aria-label="Filter drops by ownership">
                    {(["all", "owned", "locked"] as const).map((option) => (
                        <button
                            key={option}
                            onClick={() => setFilter(option)}
                            aria-pressed={filter === option}
                            className={cn(
                                "px-4 py-1.5 rounded-lg text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink/40 capitalize",
                                filter === option ? "bg-white/10 text-white shadow-sm" : "text-gray-500 hover:text-gray-300"
                            )}
                        >
                            {option}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-4">
                {filteredDrops.map((drop) => {
                    const unlocked = ownedIds.has(drop.id);
                    return (
                        <div key={drop.id} className={getItemSpanClass(drop)}>
                            <OwnedDropGalleryCard
                                drop={drop}
                                isUnlocked={unlocked}
                                onOpen={() => setSelectedPreviewDrop(drop)}
                            />
                        </div>
                    );
                })}

                {filteredDrops.length === 0 && (
                    <div className="col-span-full py-16 text-center glass-panel border border-white/5 rounded-3xl">
                        <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                            <LayoutGrid className="w-10 h-10 text-brand-pink opacity-50" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">No drops to show</h3>
                        <p className="text-gray-400 max-w-xs mx-auto mb-8 text-sm">
                            {filter === "owned"
                                ? "You haven't unwrapped any flavors yet."
                                : filter === "locked"
                                    ? "Great news! You've unlocked everything active."
                                    : "The shop is empty or all drops have expired."}
                        </p>
                        <a href="/drops" className="inline-flex items-center gap-2 px-8 py-3 bg-brand-pink/10 border border-brand-pink/20 text-brand-pink rounded-xl font-bold">
                            Visit Shop
                        </a>
                    </div>
                )}
            </div>

            <DropPreviewModal drop={selectedPreviewDrop} onClose={() => setSelectedPreviewDrop(null)} />
        </div>
    );
}
