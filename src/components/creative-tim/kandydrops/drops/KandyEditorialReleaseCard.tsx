"use client";

import type { CSSProperties, ReactNode, RefObject } from "react";
import { ArrowUpRight, Eye, Image as ImageIcon, Lock, Video } from "lucide-react";

import { DropCardTimer } from "@/components/DropCardParts";
import { TitleMarquee } from "@/components/ui/TitleMarquee";
import { cn } from "@/lib/utils";
import type { Drop } from "@/types/db";

type EditorialStateAttributes = Record<string, string | boolean | undefined>;

interface KandyEditorialReleaseCardProps {
    rootRef: RefObject<HTMLDivElement | null>;
    drop: Drop;
    presentation: "feature" | "shelf";
    ratioStyle: CSSProperties;
    cover: ReactNode;
    onPreview: () => void;
    files: { images: number; videos: number };
    tags: string[];
    totalViews: number;
    cta: ReactNode;
    error: string | null;
    isPortrait: boolean;
    stateAttributes: EditorialStateAttributes;
}

export function KandyEditorialReleaseCard({
    rootRef,
    drop,
    presentation,
    ratioStyle,
    cover,
    onPreview,
    files,
    tags,
    totalViews,
    cta,
    error,
    isPortrait,
    stateAttributes,
}: KandyEditorialReleaseCardProps) {
    const hasFiles = files.images > 0 || files.videos > 0;

    return (
        <article
            ref={rootRef}
            data-drop-card-root
            data-drop-card-density="compact-media"
            data-drop-card-layout="creative-tim-media-grid"
            data-drop-card-presentation={presentation}
            {...stateAttributes}
            className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#121214] shadow-[0_14px_34px_rgba(0,0,0,0.24)]"
        >
            <button
                type="button"
                onClick={onPreview}
                aria-label={`Preview ${drop.title}`}
                style={ratioStyle}
                className={cn(
                    "relative min-h-[11rem] w-full overflow-hidden bg-black text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-inset",
                    isPortrait ? "min-h-[16rem]" : "sm:min-h-[13rem]",
                )}
            >
                {cover}
                <div className="pointer-events-none absolute inset-0 bg-black/25" />
                <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-white/15 bg-black/70 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-white/90">Live KandyDrop</span>
                    {hasFiles ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-black/70 px-2.5 py-1 text-[9px] font-bold text-white/85">
                            {files.images > 0 ? <span className="inline-flex items-center gap-1"><ImageIcon className="h-3 w-3" aria-hidden="true" />{files.images}</span> : null}
                            {files.videos > 0 ? <span className="inline-flex items-center gap-1"><Video className="h-3 w-3" aria-hidden="true" />{files.videos}</span> : null}
                        </span>
                    ) : null}
                </div>
            </button>

            <div className="flex min-w-0 flex-1 flex-col p-3 sm:p-4">
                <div className="flex items-center justify-between gap-3">
                    <span className="text-[9px] font-black uppercase tracking-[0.16em] text-white/52">Unwrap when ready</span>
                    <span className="shrink-0 rounded-full border border-brand-purple/40 bg-brand-purple/10 px-2.5 py-1 text-[10px] font-black text-brand-purple">{drop.unlockCost.toLocaleString()} GD</span>
                </div>

                <div className="mt-3 min-w-0">
                    <TitleMarquee
                        title={drop.title}
                        delaySeed={drop.id.charCodeAt(0) % 6}
                        className="text-lg font-black leading-[1.02] tracking-[-0.035em] text-white sm:text-xl"
                    />
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/62 sm:text-sm">{drop.description}</p>
                </div>

                {tags.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Release tags">
                        {tags.slice(0, 2).map((tag) => (
                            <span key={tag} className="rounded-full border border-white/10 bg-white/[0.035] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-white/65">{tag}</span>
                        ))}
                        {tags.length > 2 ? <span className="rounded-full border border-white/10 px-2 py-1 text-[9px] font-bold text-white/52">+{tags.length - 2}</span> : null}
                    </div>
                ) : null}

                <div className="mt-auto pt-4">
                    <div className="flex items-center justify-between gap-2 border-t border-white/[0.08] pt-3 text-[10px] font-semibold text-white/58">
                        <span className="inline-flex items-center gap-1.5"><Eye className="h-3.5 w-3.5 text-brand-purple" aria-hidden="true" />{totalViews.toLocaleString()} views</span>
                        <DropCardTimer validUntil={drop.validUntil} />
                    </div>
                    <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-brand-purple">See release <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></span>
                    <div className="mt-3">{cta}</div>
                </div>

                {error ? (
                    <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-500/15 bg-red-500/10 px-3 py-2 text-xs leading-5 text-red-100">
                        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>{error}</span>
                    </div>
                ) : null}
            </div>
        </article>
    );
}
