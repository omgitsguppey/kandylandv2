"use client";

import type { AdminOverviewResponse } from "@/lib/admin-overview";

export function TopDropsPanel({ topDrops }: { topDrops: AdminOverviewResponse["topDrops"] }) {
    return (
        <div className="space-y-3">
            {topDrops.length === 0 ? (
                <div className="rounded-[1.35rem] border border-white/8 bg-black/25 px-4 py-8 text-center">
                    <p className="text-[11px] font-semibold text-gray-400">No drops are ranked yet.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {topDrops.map((drop, index) => (
                        <article
                            key={drop.id}
                            className="grid grid-cols-[2.1rem,minmax(0,1fr),auto] items-center gap-3 rounded-[1.2rem] border border-white/8 bg-black/30 px-3 py-3"
                        >
                            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/40 text-sm font-black text-white">
                                {index + 1}
                            </div>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="line-clamp-1 text-sm font-semibold text-white">{drop.title}</p>
                                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-300">
                                        {drop.status}
                                    </span>
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-400">
                                    <span>{(drop.totalUnlocks || 0).toLocaleString()} unwraps</span>
                                    <span>{(drop.totalClicks || 0).toLocaleString()} clicks</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">Price</p>
                                <p className="mt-1 text-sm font-bold text-brand-purple">{drop.unlockCost} GD</p>
                            </div>
                        </article>
                    ))}
                </div>
            )}

        </div>
    );
}
