"use client";

import { useMemo } from "react";
import { useAdminOverview } from "@/hooks/useAdminOverview";

/**
 * Displays the top 5 drops ranked by unwrap count.
 * Owns its own onSnapshot listener for the drops collection.
 */
export function TopDropsPanel() {
    const { data } = useAdminOverview();

    const topDrops = useMemo(
        () => data?.topDrops || [],
        [data],
    );

    return (
        <div className="glass-panel p-4 md:p-6 rounded-3xl border border-white/10">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white">Top Performing Drops</h3>
                <span className="text-xs text-gray-400">By unwrap count</span>
            </div>
            <div className="space-y-4">
                {topDrops.length === 0 ? (
                    <div className="text-sm text-gray-500 py-4 text-center">No drops found.</div>
                ) : topDrops.map((drop) => (
                    <div key={drop.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-black/30 p-3">
                        <div className="min-w-0">
                            <div className="font-bold text-white line-clamp-1">{drop.title}</div>
                            <div className="text-xs text-gray-500">{drop.totalUnlocks || 0} unwraps • {drop.totalClicks || 0} clicks</div>
                        </div>
                        <span className="text-xs font-mono text-brand-purple">{drop.unlockCost} GD</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
