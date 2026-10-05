"use client";

import { ContentFrame, DetailLayout } from "@/components/ui/content-layout";
import { MediaCover } from "@/components/ui/media-card";

export default function DropPreviewLoading() {
    return (
        <ContentFrame
            className="relative isolate flex min-h-[calc(100dvh_-_var(--root-shell-top-spacing,6rem)_-_var(--user-mobile-bottom-nav-reserved-height,0px))] max-w-5xl flex-col pb-4 pt-[calc(var(--kandy-cookie-offset,0px)+1.5rem)] md:pb-6"
            data-mobile-density="compact"
            data-mobile-sprawl-guard="true"
            data-mobile-skeleton="drop-preview-route"
            aria-busy="true"
            aria-label="Loading Drop preview"
        >
            <div className="mb-6 flex items-center justify-between" aria-hidden="true">
                <div className="h-11 w-24 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
                <div className="h-11 w-11 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
            </div>
            <DetailLayout className="flex-1" aria-hidden="true">
                <MediaCover className="animate-pulse motion-reduce:animate-none" />
                <div className="space-y-6">
                    <div className="h-16 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
                    <div className="h-36 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
                    <div className="h-20 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
                    <div className="h-20 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
                </div>
            </DetailLayout>
        </ContentFrame>
    );
}
