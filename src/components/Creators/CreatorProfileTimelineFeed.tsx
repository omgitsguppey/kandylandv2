"use client";

import { Megaphone, Sparkles } from "lucide-react";

import type { CreatorProfileTimelineItem } from "@/lib/creator-profile/timeline-contract";
import { cn } from "@/lib/utils";
import type { Drop } from "@/types/db";

type CreatorProfileTimelineFeedProps = {
    drops: Drop[];
    items: CreatorProfileTimelineItem[];
    onOpenDrop: (drop: Drop) => void;
};

function formatTimelineDate(createdAtMs: number) {
    if (!createdAtMs || !Number.isFinite(createdAtMs)) {
        return "New";
    }

    return new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
    }).format(new Date(createdAtMs));
}

export function CreatorProfileTimelineFeed({
    drops,
    items,
    onOpenDrop,
}: CreatorProfileTimelineFeedProps) {
    const dropById = new Map(drops.map((drop) => [drop.id, drop]));
    const visibleItems = items.slice(0, 8);

    return (
        <section
            className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 sm:p-4"
            data-creator-profile-timeline-feed="true"
            data-creator-profile-timeline-source="creator_profile_timeline_contract"
            data-mobile-density="compact"
        >
            <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                    <h2 className="text-sm font-black text-white sm:text-base">Timeline</h2>
                    <p className="text-xs text-gray-500">Drops and creator updates</p>
                </div>
                <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400">
                    {visibleItems.length} live
                </span>
            </div>

            {visibleItems.length > 0 ? (
                <div className="space-y-2">
                    {visibleItems.map((item) => {
                        const drop = item.type === "drop" ? dropById.get(item.id) : undefined;
                        const isDrop = item.type === "drop";
                        const itemBody = item.body.trim();
                        const sharedClassName = "flex w-full items-start gap-3 rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-left transition-colors hover:bg-white/[0.06]";

                        const content = (
                            <>
                                <span
                                    className={cn(
                                        "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
                                        isDrop
                                            ? "border-brand-purple/30 bg-brand-purple/15 text-brand-purple"
                                            : "border-white/10 bg-white/[0.06] text-white",
                                    )}
                                >
                                    {isDrop ? <Sparkles className="h-4 w-4" /> : <Megaphone className="h-4 w-4" />}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="flex items-center gap-2">
                                        <span className="truncate text-sm font-black text-white">{item.title}</span>
                                        <span className="shrink-0 text-[11px] font-semibold text-gray-500">{formatTimelineDate(item.createdAtMs)}</span>
                                    </span>
                                    <span className="mt-1 line-clamp-2 text-xs leading-5 text-gray-400">
                                        {itemBody || (isDrop ? "Drop available now." : "Creator update.")}
                                    </span>
                                </span>
                            </>
                        );

                        return drop ? (
                            <button
                                key={`${item.type}:${item.id}`}
                                type="button"
                                className={sharedClassName}
                                data-creator-profile-timeline-card={item.type}
                                onClick={() => onOpenDrop(drop)}
                            >
                                {content}
                            </button>
                        ) : (
                            <article
                                key={`${item.type}:${item.id}`}
                                className={sharedClassName}
                                data-creator-profile-timeline-card={item.type}
                            >
                                {content}
                            </article>
                        );
                    })}
                </div>
            ) : (
                <div className="rounded-xl border border-dashed border-white/10 bg-black/25 px-4 py-5 text-center">
                    <p className="text-sm font-bold text-white">No timeline updates yet</p>
                    <p className="mt-1 text-xs leading-5 text-gray-500">Public Drops and creator updates will appear here when they are live.</p>
                </div>
            )}
        </section>
    );
}
