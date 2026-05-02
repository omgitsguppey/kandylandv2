"use client";

import { RefObject, ReactNode } from "react";
import NextImage from "next/image";
import { AlertCircle, Eye } from "lucide-react";

import { DropCardBadge, DropCardTimer, FileCountChip } from "@/components/DropCardParts";
import { TitleMarquee } from "@/components/ui/TitleMarquee";
import { cn } from "@/lib/utils";
import { resolvePublicDropCoverSrc } from "@/lib/drop-media-fallback";
import type { SupportedAspectRatio } from "@/lib/drop-presentation";
import type { Drop } from "@/types/db";

interface DropCardLayoutProps {
    cardRef: RefObject<HTMLDivElement | null>;
    drop: Drop;
    priority: boolean;
    resolvedRatio: SupportedAspectRatio;
    ratioStyle: { aspectRatio: string };
    fileCounts: { images: number; videos: number };
    displayedTags: string[];
    totalViews: number;
    ctaButton: ReactNode;
    error: string | null;
    imageLoaded: boolean;
    imageError: boolean;
    onImageLoaded: () => void;
    onImageError: () => void;
    onPreviewOpen: () => void;
}

function DropCardViewCount({ totalViews, compact = false }: { totalViews: number; compact?: boolean }) {
    return (
        <div
            className={cn("flex items-center gap-1 font-medium text-white/80 opacity-60", compact ? "text-[9px]" : "text-[9px]")}
            aria-label={`${totalViews.toLocaleString()} views`}
            title={`${totalViews.toLocaleString()} views`}
        >
            <Eye aria-hidden="true" className={compact ? "h-2.5 w-2.5" : "h-[10px] w-[10px]"} />
            <span>{totalViews.toLocaleString()}</span>
        </div>
    );
}

export function DropCardLayout({
    cardRef,
    drop,
    priority,
    resolvedRatio,
    ratioStyle,
    fileCounts,
    displayedTags,
    totalViews,
    ctaButton,
    error,
    imageLoaded,
    imageError,
    onImageLoaded,
    onImageError,
    onPreviewOpen,
}: DropCardLayoutProps) {
    const coverSrc = imageError ? resolvePublicDropCoverSrc(null) : resolvePublicDropCoverSrc(drop.imageUrl);

    if (resolvedRatio === "9:16") {
        return (
            <div ref={cardRef} className="group relative flex h-full flex-col overflow-hidden rounded-[1.15rem] border border-white/8 bg-white/[0.025] p-1.5 shadow-[0_10px_24px_rgba(0,0,0,0.22)] backdrop-blur-md md:rounded-[1.35rem] md:p-2.5" data-drop-card-density="compact-mobile">
                <button type="button" onClick={onPreviewOpen} aria-label={`Preview ${drop.title}`} className="relative w-full flex-shrink-0 overflow-hidden rounded-[0.9rem] border border-white/10 bg-black text-left md:rounded-[1rem]" style={ratioStyle}>
                    <NextImage
                        src={coverSrc}
                        alt={drop.title}
                        fill
                        priority={priority}
                        className={cn("object-cover object-center bg-black transition-all duration-500", imageLoaded ? "scale-100" : "scale-105")}
                        onLoadingComplete={onImageLoaded}
                        onError={onImageError}
                        sizes="(max-width: 768px) 25vw, 180px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute right-1.5 top-1.5 z-10">
                        <FileCountChip images={fileCounts.images} videos={fileCounts.videos} compact />
                    </div>
                    <div className="absolute bottom-1.5 left-1.5 right-1.5 space-y-1">
                        {displayedTags.length > 0 ? <DropCardBadge label={displayedTags[0]} compact /> : null}
                        <TitleMarquee title={drop.title} delaySeed={drop.id.charCodeAt(0) % 6} className="text-[10px] font-bold leading-tight text-white" />
                    </div>
                </button>
                <div className="mt-1.5 flex flex-grow flex-col justify-between gap-1.5">
                    <div className="w-full space-y-1.5">
                        <div className="flex w-full items-center justify-between">
                            <div className="inline-flex w-fit rounded-[0.55rem] border border-brand-purple/20 bg-brand-purple/10 px-2 py-0.5 text-[10px] font-bold text-brand-purple">
                                {drop.unlockCost} GD
                            </div>
                            <DropCardViewCount totalViews={totalViews} compact />
                        </div>
                        {ctaButton}
                    </div>
                    <div className="mt-auto pt-0.5">
                        <DropCardTimer validUntil={drop.validUntil} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div ref={cardRef} className="group relative flex h-full flex-col justify-between overflow-hidden rounded-[1.15rem] border border-white/8 bg-white/[0.025] p-1.5 shadow-[0_10px_24px_rgba(0,0,0,0.22)] backdrop-blur-md md:rounded-[1.35rem] md:p-2.5" data-drop-card-density="compact-mobile">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-purple/5 via-transparent to-brand-purple/5" />

            <button type="button" onClick={onPreviewOpen} aria-label={`Preview ${drop.title}`} className="relative mb-1.5 w-full flex-shrink-0 overflow-hidden rounded-[0.9rem] border border-white/5 bg-black/40 text-left shadow-inner md:mb-2 md:rounded-[1rem]" style={ratioStyle}>
                <NextImage
                    src={coverSrc}
                    alt={drop.title}
                    fill
                    priority={priority}
                    className={cn("object-cover object-center bg-black opacity-90 transition-all duration-700", imageLoaded ? "scale-100 blur-0" : "scale-105 blur-md")}
                    onLoadingComplete={onImageLoaded}
                    onError={onImageError}
                    sizes={resolvedRatio === "16:9" ? "(max-width: 768px) 100vw, 720px" : "(max-width: 768px) 50vw, 360px"}
                />
                {!imageLoaded ? (
                    <div className="absolute inset-0 overflow-hidden bg-zinc-800/80">
                        <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    </div>
                ) : null}
                <div className="absolute right-1.5 top-1.5 z-10 transition-transform group-hover/image:scale-105 md:right-2 md:top-2">
                    <FileCountChip images={fileCounts.images} videos={fileCounts.videos} compact />
                </div>
            </button>

            <div className="relative z-10 flex h-full flex-col space-y-1.5">
                <div className="flex w-full items-center justify-between">
                    {displayedTags.length > 0 ? <DropCardBadge label={displayedTags[0]} compact /> : <div />}
                    <DropCardTimer validUntil={drop.validUntil} />
                </div>

                <TitleMarquee title={drop.title} delaySeed={drop.id.charCodeAt(0) % 6} className="pt-0.5 text-[11px] font-bold leading-tight tracking-tight text-white md:text-sm" />

                <div className="mt-auto flex w-full flex-col items-start gap-1.5 pt-1">
                    <div className="flex w-full items-center justify-between">
                        <div className="flex items-center gap-1 rounded-[0.55rem] border border-brand-purple/20 bg-brand-purple/10 px-2 py-0.5 md:gap-1.5 md:py-1">
                            <span className="whitespace-nowrap text-[10px] font-bold tracking-wide text-brand-purple md:text-[11px]">{drop.unlockCost} GD</span>
                        </div>
                        <DropCardViewCount totalViews={totalViews} />
                    </div>
                    <div className="w-full">{ctaButton}</div>
                </div>

                {error ? (
                    <div className="mt-1 flex items-center justify-center gap-1 rounded-[0.6rem] border border-red-500/10 bg-red-500/10 py-1 text-[9px] font-medium text-red-400 md:text-[10px]">
                        <AlertCircle className="h-2.5 w-2.5" /> {error}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
