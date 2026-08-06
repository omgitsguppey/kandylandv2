"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutGrid } from "lucide-react";

import { Badge } from "@/components/creative-tim/ui/badge";
import { Card } from "@/components/creative-tim/ui/card";
import { Separator } from "@/components/creative-tim/ui/separator";
import { buildDashboardCollectionState } from "@/lib/drop-dashboard";
import { cn } from "@/lib/utils";
import type { Drop, UserProfile } from "@/types/db";

import { OwnedDropGalleryCard } from "./OwnedDropGalleryCard";
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
    if (ratio === "16:9") return "col-span-1 sm:col-span-4";
    if (ratio === "9:16") return "col-span-1 sm:col-span-2";
    return "col-span-1 sm:col-span-3";
}

interface CollectionListProps {
    drops: Drop[];
    userProfile: UserProfile | null;
    currentTimeMs?: number;
}

export function CollectionList({ drops, userProfile, currentTimeMs }: CollectionListProps) {
    const [filter, setFilter] = useState<"all" | "owned" | "locked">("all");
    const router = useRouter();

    const { ownedIds, visibleDrops, ownedDrops, lockedDrops, ownedCount, lockedCount } = useMemo(() => {
        const rawUnlocked = userProfile?.unlockedContent;
        const unlockedList = Array.isArray(rawUnlocked) ? rawUnlocked : [];
        const ids = new Set(unlockedList);

        const {
            visibleDrops: visible,
            ownedDrops: ownedVisible,
            lockedDrops: lockedVisible,
            ownedCount: owned,
            lockedCount: locked,
        } = buildDashboardCollectionState(drops, ids, currentTimeMs);

        return {
            ownedIds: ids,
            visibleDrops: visible,
            ownedDrops: ownedVisible,
            lockedDrops: lockedVisible,
            ownedCount: owned,
            lockedCount: locked,
        };
    }, [currentTimeMs, drops, userProfile?.unlockedContent]);

    const filteredDrops = filter === "owned"
        ? ownedDrops
        : filter === "locked"
            ? lockedDrops
            : visibleDrops;

    return (
        <Card
            className="glass-panel overflow-hidden !gap-0 rounded-3xl border border-white/10 !p-0 shadow-xl"
            data-mobile-residual-cleanup="score-impact"
        >
            <div className="flex flex-col justify-between gap-4 px-3.5 py-4 sm:px-5 sm:py-5 md:flex-row md:items-end">
                <div>
                    <Badge
                        aria-hidden="true"
                        variant="outline"
                        className="mb-3 h-7 gap-1.5 rounded-full border-brand-purple/30 bg-brand-purple/10 px-3 text-xs font-semibold text-brand-purple"
                    >
                        <LayoutGrid className="h-3.5 w-3.5" />
                        Collection
                    </Badge>
                    <h2 className="text-2xl font-bold tracking-tight text-white">My KandyDrops</h2>
                    <p className="mt-1 text-sm text-gray-400">The drops you own and the ones still waiting to be unwrapped.</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold">
                        <span className="rounded-full border border-brand-purple/25 bg-brand-purple/10 px-3 py-1.5 text-brand-purple">
                            {ownedCount} Owned
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-gray-300">
                            {lockedCount} Locked
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-gray-400">
                            {visibleDrops.length} Total
                        </span>
                    </div>
                </div>

                <div
                    className="grid w-full grid-cols-3 self-stretch rounded-2xl border border-white/10 bg-black/20 p-1 sm:w-auto md:self-auto"
                    role="group"
                    aria-label="Filter drops by ownership"
                >
                    {(["all", "owned", "locked"] as const).map((option) => (
                        <button
                            key={option}
                            onClick={() => {
                                setFilter(option);
                                trackEvent("collection_filter_changed", { filter_value: option });
                            }}
                            aria-pressed={filter === option}
                            className={cn(
                                "inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl px-3 text-xs font-bold capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/40 sm:min-w-20 sm:px-4",
                                filter === option ? "bg-white/10 text-white shadow-sm" : "text-gray-500 hover:text-gray-300"
                            )}
                        >
                            {option}
                        </button>
                    ))}
                </div>
            </div>
            <Separator className="bg-white/10" />

            <div className="grid grid-cols-2 gap-2.5 p-3.5 sm:grid-cols-6 sm:gap-3 sm:p-5 md:gap-4">
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
                    <div className="col-span-full rounded-3xl border border-white/10 bg-black/20 px-4 py-8 text-center sm:py-12" data-mobile-residual-cleanup="score-impact">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 shadow-inner sm:h-16 sm:w-16">
                            <LayoutGrid className="h-7 w-7 text-brand-purple opacity-50 sm:h-8 sm:w-8" />
                        </div>
                        <h3 className="mb-2 text-xl font-bold text-white">No drops to show</h3>
                        <p className="mx-auto mb-5 max-w-xs text-sm text-gray-400 sm:mb-7">
                            {filter === "owned"
                                ? "You haven't unwrapped any flavors yet."
                                : filter === "locked"
                                    ? "Great news! You've unlocked everything active."
                                    : "The shop is empty or all drops have expired."}
                        </p>
                        <a
                            href="/drops"
                            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-brand-purple/20 bg-brand-purple/10 px-5 py-2.5 font-bold text-brand-purple sm:px-7"
                        >
                            Visit Shop
                        </a>
                    </div>
                )}
            </div>
        </Card>
    );
}
