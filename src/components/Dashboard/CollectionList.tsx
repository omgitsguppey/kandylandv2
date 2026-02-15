"use client";

import { Drop, UserProfile } from "@/types/db";
import { useState, useMemo } from "react";
import { DashboardDropCard } from "./DashboardDropCard";
import { Search, Filter, LayoutGrid, List as ListIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollectionListProps {
    drops: Drop[];
    userProfile: UserProfile | null;
}

export function CollectionList({ drops, userProfile }: CollectionListProps) {
    const [filter, setFilter] = useState<'all' | 'owned' | 'locked'>('all');

    const { ownedIds, ownedCount, lockedCount } = useMemo(() => {
        const ids = new Set(userProfile?.unlockedContent || []);
        const owned = drops.filter(d => ids.has(d.id)).length;
        const locked = drops.length - owned;
        return { ownedIds: ids, ownedCount: owned, lockedCount: locked };
    }, [drops, userProfile]);

    const filteredDrops = useMemo(() => {
        if (filter === 'owned') return drops.filter(d => ownedIds.has(d.id));
        if (filter === 'locked') return drops.filter(d => !ownedIds.has(d.id));
        return drops;
    }, [drops, filter, ownedIds]);

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        My KandyDrops
                    </h2>
                    <div className="text-sm text-gray-400 font-medium mt-1">
                        <span className="text-brand-pink">{ownedCount} Owned</span>
                        <span className="mx-2">·</span>
                        <span>{lockedCount} Locked</span>
                        <span className="mx-2">·</span>
                        <span>{drops.length} Total</span>
                    </div>
                </div>

                {/* Filter Controls */}
                <div className="flex items-center bg-white/5 rounded-xl p-1 self-start md:self-auto border border-white/5">
                    <button
                        onClick={() => setFilter('all')}
                        className={cn(
                            "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                            filter === 'all' ? "bg-white/10 text-white shadow-sm" : "text-gray-500 hover:text-gray-300"
                        )}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilter('owned')}
                        className={cn(
                            "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                            filter === 'owned' ? "bg-white/10 text-white shadow-sm" : "text-gray-500 hover:text-gray-300"
                        )}
                    >
                        Owned
                    </button>
                    <button
                        onClick={() => setFilter('locked')}
                        className={cn(
                            "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                            filter === 'locked' ? "bg-white/10 text-white shadow-sm" : "text-gray-500 hover:text-gray-300"
                        )}
                    >
                        Locked
                    </button>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredDrops.map((drop) => (
                    <DashboardDropCard
                        key={drop.id}
                        drop={drop}
                        isUnlocked={ownedIds.has(drop.id)}
                    />
                ))}

                {filteredDrops.length === 0 && (
                    <div className="col-span-full py-12 text-center text-gray-500 border border-dashed border-white/10 rounded-2xl">
                        <Filter className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No drops found in this filter.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
