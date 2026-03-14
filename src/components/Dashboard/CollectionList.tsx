"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutGrid } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Drop, UserProfile } from "@/types/db";

import { OwnedDropGalleryCard } from "./OwnedDropGalleryCard";

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
    if (ratio === "16:9") return "col-span-1 sm:col-span-4";
    if (ratio === "9:16") return "col-span-1 sm:col-span-2";
    return "col-span-1 sm:col-span-3";
}

interface CollectionListProps {
    drops: Drop[];
    userProfile: UserProfile | null;
}

export function CollectionList({ drops, userProfile }: CollectionListProps) {
    const [filter, setFilter] = useState<"all" | "owned" | "locked">("all");
    const router = useRouter();

    const { ownedIds, visibleDrops, ownedCount, lockedCount } = useMemo(() => {
        const rawUnlocked = userProfile?.unlockedContent;
        const unlockedList = Array.isArray(rawUnlocked) ? rawUnlocked : [];
        const ids = new Set(unlockedList);

        // Match the public Drops page: locked items only surface while active.
        // Already-unwrapped drops stay visible in the dashboard regardless of lifecycle.
        const visible = drops.filter((drop) => drop.status === "active" || ids.has(drop.id));
        const owned = visible.filter((drop) => ids.has(drop.id)).length;
        const locked = visible.length - owned;

        return { ownedIds: ids, visibleDrops: visible, ownedCount: owned, lockedCount: locked };
    }, [drops, userProfile?.unlockedContent]);

    const filteredDrops = useMemo(() => {
        if (filter === "owned") return visibleDrops.filter((drop) => ownedIds.has(drop.id));
        if (filter === "locked") return visibleDrops.filter((drop) => !ownedIds.has(drop.id));
        return visibleDrops;
    }, [visibleDrops, filter, ownedIds]);

    return (
        <div className="space-y-4">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                <div>
                    <h2 className="text-xl font-bold text-white">My KandyDrops</h2>
                    <div className="mt-1 flex flex-wrap items-center text-[11px] font-medium text-gray-400 sm:text-xs">
                        <span className="text-brand-purple">{ownedCount} Owned</span>
                        <span className="mx-2">|</span>
                        <span>{lockedCount} Locked</span>
                        <span className="mx-2">|</span>
                        <span>{visibleDrops.length} Total</span>
                    </div>
                </div>

                <div
                    className="flex w-full self-stretch rounded-xl border border-white/5 bg-white/5 p-1 sm:w-auto md:self-auto"
                    role="group"
                    aria-label="Filter drops by ownership"
                >
                    {(["all", "owned", "locked"] as const).map((option) => (
                        <button
                            key={option}
                            onClick={() => setFilter(option)}
                            aria-pressed={filter === option}
                            className={cn(
                                "flex-1 rounded-lg px-3 py-2 text-[11px] font-bold capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/40 sm:flex-none sm:px-4 sm:py-1.5 sm:text-xs",
                                filter === option ? "bg-white/10 text-white shadow-sm" : "text-gray-500 hover:text-gray-300"
                            )}
                        >
                            {option}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-6 sm:gap-3 md:gap-4">
                {filteredDrops.map((drop) => {
                    const unlocked = ownedIds.has(drop.id);
                    return (
                        <div key={drop.id} className={getItemSpanClass(drop)}>
                            <OwnedDropGalleryCard
                                drop={drop}
                                isUnlocked={unlocked}
                                onOpen={() => {
                                    if (unlocked) {
                                        router.push(`/dashboard/viewer?id=${drop.id}`);
                                        return;
                                    }
                                    router.push("/drops");
                                }}
                            />
                        </div>
                    );
                })}

                {filteredDrops.length === 0 && (
                    <div className="glass-panel col-span-full rounded-3xl border border-white/5 py-16 text-center">
                        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/5 shadow-inner">
                            <LayoutGrid className="h-10 w-10 text-brand-purple opacity-50" />
                        </div>
                        <h3 className="mb-2 text-xl font-bold text-white">No drops to show</h3>
                        <p className="mx-auto mb-8 max-w-xs text-sm text-gray-400">
                            {filter === "owned"
                                ? "You haven't unwrapped any flavors yet."
                                : filter === "locked"
                                    ? "Great news! You've unlocked everything active."
                                    : "The shop is empty or all drops have expired."}
                        </p>
                        <a
                            href="/drops"
                            className="inline-flex items-center gap-2 rounded-xl border border-brand-purple/20 bg-brand-purple/10 px-8 py-3 font-bold text-brand-purple"
                        >
                            Visit Shop
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}
