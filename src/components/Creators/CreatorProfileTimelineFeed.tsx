"use client";

import { Megaphone, Sparkles } from "lucide-react";

import { MarqueeText } from "@/components/ui/MarqueeText";
import type { CreatorProfileTimelineItem } from "@/lib/creator/profile/timeline-contract";
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
            className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.2)] backdrop-blur-xl sm:rounded-[1.75rem] sm:p-5"
            data-creator-profile-timeline-feed="true"
            data-creator-profile-timeline-source="creator_profile_timeline_contract"
            data-mobile-density="compact"
        >
            <div className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-brand-purple/15 blur-3xl" aria-hidden="true" />
            <div className="relative mb-4 flex items-center justify-between gap-3">
                <div>
                    <h2 className="text-base font-black text-white">Timeline</h2>
                    <p className="mt-0.5 text-xs text-gray-500">Drops and creator updates</p>
                </div>
                <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400">
                    {visibleItems.length} live
                </span>
            </div>

            {visibleItems.length > 0 ? (
                <div className="relative space-y-2.5">
                    {visibleItems.map((item) => {
                        const drop = item.type === "drop" ? dropById.get(item.id) : undefined;
                        const isDrop = item.type === "drop";
                        const itemBody = item.body.trim();
                        const sharedClassName = "group flex min-h-11 w-full items-start gap-3 rounded-[1.15rem] border border-white/10 bg-black/25 px-3 py-3 text-left transition-colors hover:border-brand-purple/25 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2 focus-visible:ring-offset-[#100b18]";

                        const content = (
                            <>
                                <span
                                    className={cn(
                                        "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                                        isDrop
                                            ? "border-brand-purple/30 bg-brand-purple/15 text-brand-purple"
                                            : "border-white/10 bg-white/[0.06] text-white",
                                    )}
                                >
                                    {isDrop ? <Sparkles className="h-4 w-4" /> : <Megaphone className="h-4 w-4" />}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <MarqueeText
                                            title={item.title}
                                            className="text-sm font-black text-white group-hover:text-purple-100"
                                            ariaLabel={item.title}
                                        />
                                        <span className="shrink-0 text-[11px] font-semibold text-gray-500">{formatTimelineDate(item.createdAtMs)}</span>
                                    </div>
                                    <span className="mt-1 line-clamp-2 text-xs leading-5 text-gray-400">
                                        {itemBody || (isDrop ? "Drop available now." : "Creator update.")}
                                    </span>
                                </div>
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
                <div className="relative rounded-[1.15rem] border border-dashed border-white/10 bg-black/25 px-4 py-6 text-center">
                    <p className="text-sm font-bold text-white">No timeline updates yet</p>
                    <p className="mt-1 text-xs leading-5 text-gray-500">Public Drops and creator updates will appear here when they are live.</p>
                </div>
            )}
        </section>
    );
}