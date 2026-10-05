"use client";

import type { CSSProperties, ReactNode, RefObject } from "react";
import { Eye, Image as ImageIcon, Lock, Video } from "lucide-react";
import { MediaCard, MediaPreview } from "@/components/ui/media-card";
import { Badge } from "@/components/ui/badge";

import { DropCardTimer } from "@/components/DropCardParts";
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
    stateAttributes,
}: KandyEditorialReleaseCardProps) {
    const hasFiles = files.images > 0 || files.videos > 0;

    return (
        <MediaCard ref={rootRef} data-drop-card-root data-drop-card-density="compact-media" data-drop-card-layout="creative-tim-media-grid" data-drop-card-presentation={presentation} {...stateAttributes} className="group"
            title={drop.title}
            description={drop.description}
            cover={<MediaPreview onClick={onPreview} aria-label={`Preview ${drop.title}`} style={ratioStyle}>{cover}</MediaPreview>}
        >
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="max-w-full shrink whitespace-normal [overflow-wrap:anywhere]">{drop.unlockCost.toLocaleString()} GD</Badge>
                        {hasFiles ? <span className="inline-flex min-w-0 max-w-full flex-wrap items-center gap-2 text-sm text-muted-foreground [overflow-wrap:anywhere]">
                            {files.images > 0 ? <span className="inline-flex min-w-0 max-w-full flex-wrap items-center gap-1 [overflow-wrap:anywhere]"><ImageIcon className="h-4 w-4 shrink-0" aria-hidden="true" />{files.images} {files.images === 1 ? "image" : "images"}</span> : null}
                            {files.videos > 0 ? <span className="inline-flex min-w-0 max-w-full flex-wrap items-center gap-1 [overflow-wrap:anywhere]"><Video className="h-4 w-4 shrink-0" aria-hidden="true" />{files.videos} {files.videos === 1 ? "video" : "videos"}</span> : null}
                        </span> : null}
                    </div>
                    {tags.length > 0 ? <div className="flex min-w-0 flex-wrap gap-2" aria-label="Release tags">{tags.map((tag) => <Badge key={tag} variant="secondary" className="max-w-full shrink whitespace-normal [overflow-wrap:anywhere]">{tag}</Badge>)}</div> : null}
                    <div className="mt-auto space-y-3 pt-2">
                        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                            <span className="inline-flex min-w-0 max-w-full flex-wrap items-center gap-1.5 [overflow-wrap:anywhere]"><Eye className="h-4 w-4 shrink-0" aria-hidden="true" />{totalViews.toLocaleString()} views</span>
                            <DropCardTimer validUntil={drop.validUntil} />
                        </div>
                        {cta}
                    </div>
                    {error ? <p role="alert" className="flex min-w-0 items-start gap-2 rounded-xl bg-destructive/10 p-3 text-sm leading-relaxed text-destructive"><Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><span className="min-w-0 [overflow-wrap:anywhere]">{error}</span></p> : null}
        </MediaCard>
    );
}
