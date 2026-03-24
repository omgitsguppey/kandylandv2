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
        <div className="glass-panel rounded-[1.6rem] border border-white/10 p-3.5 md:p-5">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Top Performing Drops</h3>
                <span className="text-xs text-gray-400">By unwrap count</span>
            </div>
            <div className="space-y-2.5">
                {topDrops.length === 0 ? (
                    <div className="text-sm text-gray-500 py-4 text-center">No drops found.</div>
                ) : topDrops.map((drop) => (
                    <details key={drop.id} className="rounded-2xl border border-white/5 bg-black/30 p-3">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                            <div className="min-w-0">
                                <div className="line-clamp-1 text-sm font-bold text-white">{drop.title}</div>
                                <div className="text-[11px] text-gray-500">{drop.totalUnlocks || 0} unwraps • {drop.totalClicks || 0} clicks</div>
                            </div>
                            <span className="text-xs font-mono text-brand-purple">{drop.unlockCost} GD</span>
                        </summary>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-gray-400">
                            <div className="rounded-xl border border-white/10 bg-black/40 px-2.5 py-2">Unlocks: <span className="font-semibold text-white">{drop.totalUnlocks || 0}</span></div>
                            <div className="rounded-xl border border-white/10 bg-black/40 px-2.5 py-2">Clicks: <span className="font-semibold text-white">{drop.totalClicks || 0}</span></div>
                        </div>
                    </details>
                ))}
            </div>
        </div>
    );
}
