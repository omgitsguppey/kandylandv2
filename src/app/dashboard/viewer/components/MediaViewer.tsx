import React, { useRef } from "react";
import NextImage from "next/image";
import { Loader2, ShieldCheck } from "lucide-react";
import { Drop } from "@/types/db";
import { ResolvedContent } from "../ViewerHelpers";
import { trackEvent } from "@/lib/telemetry";
import { resolvePublicDropCoverSrc } from "@/lib/drop-media-fallback";
import { getImageLoadingPolicy, getImagePolicyDataAttributes } from "@/lib/image-loading-policy";

interface MediaViewerProps {
    drop: Drop;
    contentBlobUrl: string | null;
    resolvedContent: ResolvedContent;
    activeIndex: number;
    contentLoading: boolean;
    preventContextMenu: (e: React.MouseEvent) => void;
    reportWatchMediaPlay: () => void;
    reportWatchMediaPause: (time: number, duration: number) => void;
    reportWatchMediaSeeking: (start: number, end: number, duration: number) => void;
    reportWatchMediaWaiting: (seconds: number) => void;
    reportWatchPlaybackState: (rate: number, muted: boolean) => void;
    handleMediaTimeUpdate: (current: number, duration: number) => void;
    trackAssetCompleted: (currentTime: number, duration?: number) => void;
    reportWatchMediaEnded: (time: number, duration?: number) => void;
}

export function MediaViewer({
    drop,
    contentBlobUrl,
    resolvedContent,
    activeIndex,
    contentLoading,
    preventContextMenu,
    reportWatchMediaPlay,
    reportWatchMediaPause,
    reportWatchMediaSeeking,
    reportWatchMediaWaiting,
    reportWatchPlaybackState,
    handleMediaTimeUpdate,
    trackAssetCompleted,
    reportWatchMediaEnded,
}: MediaViewerProps) {
    const mediaSeekStartedAtRef = useRef<number | null>(null);
    const mediaWaitingStartedAtRef = useRef<number | null>(null);
    const videoFallbackTypes = ["video/mp4", "video/webm", "video/ogg"];
    const audioFallbackTypes = ["audio/mpeg", "audio/mp4", "audio/wav", "audio/ogg", "audio/webm"];
    const coverSrc = resolvePublicDropCoverSrc(drop.imageUrl);
    const viewerImagePolicy = getImageLoadingPolicy("viewer_content", { mediaIndex: activeIndex });
    const viewerSecondaryImagePolicy = getImageLoadingPolicy("viewer_content", { mediaIndex: activeIndex + 1 });

    if (contentLoading) {
        return (
            <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-10 h-10 text-brand-purple animate-spin" />
                <p className="text-sm text-gray-400">Loading content...</p>
            </div>
        );
    }

    if (!contentBlobUrl) {
        return <div className="text-gray-500">Content Unavailable</div>;
    }

    if (resolvedContent.kind === "video") {
        return (
            <video
                key={`viewer-video-${contentBlobUrl}`}
                controls
                controlsList="nodownload noplaybackrate"
                disablePictureInPicture
                className="h-full w-full object-contain bg-black"
                poster={coverSrc}
                data-image-surface={viewerImagePolicy.surface}
                data-image-loading-policy={viewerImagePolicy.loading}
                data-image-preload-allowed={String(viewerImagePolicy.preload)}
                data-image-lcp-candidate={String(viewerImagePolicy.lcpCandidate)}
                data-image-sizes-policy={viewerImagePolicy.sizesPolicy}
                autoPlay
                playsInline
                preload="auto"
                draggable={false}
                onContextMenu={preventContextMenu}
                onPlay={() => {
                    reportWatchMediaPlay();
                    reportWatchPlaybackState(1, false);
                    trackEvent("video_played", { content_id: drop.id, video_title: drop.title });
                }}
                onPause={(e) => {
                    reportWatchMediaPause(e.currentTarget.currentTime, e.currentTarget.duration);
                    reportWatchPlaybackState(e.currentTarget.playbackRate, e.currentTarget.muted);
                }}
                onSeeking={(e) => { mediaSeekStartedAtRef.current = e.currentTarget.currentTime; }}
                onSeeked={(e) => {
                    const duration = e.currentTarget.duration;
                    const cTime = e.currentTarget.currentTime;
                    reportWatchMediaSeeking(mediaSeekStartedAtRef.current ?? cTime, cTime, duration);
                    mediaSeekStartedAtRef.current = null;
                }}
                onWaiting={() => { mediaWaitingStartedAtRef.current = performance.now(); }}
                onPlaying={(e) => {
                    const waiting = mediaWaitingStartedAtRef.current;
                    if (waiting !== null) {
                        reportWatchMediaWaiting(Math.max(0, (performance.now() - waiting) / 1000));
                        mediaWaitingStartedAtRef.current = null;
                    }
                    reportWatchPlaybackState(e.currentTarget.playbackRate, e.currentTarget.muted);
                }}
                onRateChange={(e) => reportWatchPlaybackState(e.currentTarget.playbackRate, e.currentTarget.muted)}
                onVolumeChange={(e) => reportWatchPlaybackState(e.currentTarget.playbackRate, e.currentTarget.muted)}
                onTimeUpdate={(e) => handleMediaTimeUpdate(e.currentTarget.currentTime, e.currentTarget.duration)}
                onEnded={(e) => {
                    const dur = e.currentTarget.duration;
                    const fallbackDur = dur || e.currentTarget.currentTime || 15;
                    reportWatchMediaEnded(fallbackDur, dur);
                    trackAssetCompleted(fallbackDur, dur);
                }}
            >
                <source src={contentBlobUrl} type={resolvedContent.mimeType} />
                {videoFallbackTypes.filter((t) => t !== resolvedContent.mimeType).map((t) => (
                    <source key={t} src={contentBlobUrl} type={t} />
                ))}
            </video>
        );
    }

    if (resolvedContent.kind === "audio") {
        return (
            <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-gray-900 to-black px-6 py-8">
                <NextImage
                    src={coverSrc}
                    alt="Album Art"
                    fill
                    loading={viewerSecondaryImagePolicy.loading}
                    preload={false}
                    fetchPriority="low"
                    sizes={viewerSecondaryImagePolicy.sizes}
                    quality={viewerSecondaryImagePolicy.quality}
                    className="object-cover opacity-30 blur-3xl"
                    {...getImagePolicyDataAttributes(viewerSecondaryImagePolicy)}
                />
                <div className="relative z-10 mb-6 h-36 w-36 overflow-hidden rounded-2xl border border-white/10 shadow-2xl min-[600px]:h-44 min-[600px]:w-44 min-[840px]:h-56 min-[840px]:w-56">
                    <NextImage
                        src={coverSrc}
                        alt="Art"
                        fill
                        loading={viewerImagePolicy.loading}
                        preload={viewerImagePolicy.preload}
                        fetchPriority={viewerImagePolicy.fetchPriority}
                        sizes="(max-width: 600px) 144px, (max-width: 840px) 176px, 224px"
                        quality={viewerImagePolicy.quality}
                        className="object-cover"
                        {...getImagePolicyDataAttributes(viewerImagePolicy)}
                    />
                </div>
                <audio
                    key={`viewer-audio-${contentBlobUrl}`}
                    controls
                    controlsList="nodownload"
                    className="relative z-10 w-full max-w-md"
                    onContextMenu={preventContextMenu}
                    onPlay={() => {
                        reportWatchMediaPlay();
                        reportWatchPlaybackState(1, false);
                    }}
                    onPause={(e) => {
                        reportWatchMediaPause(e.currentTarget.currentTime, e.currentTarget.duration);
                        reportWatchPlaybackState(e.currentTarget.playbackRate, e.currentTarget.muted);
                    }}
                    onSeeking={(e) => { mediaSeekStartedAtRef.current = e.currentTarget.currentTime; }}
                    onSeeked={(e) => {
                        reportWatchMediaSeeking(mediaSeekStartedAtRef.current ?? e.currentTarget.currentTime, e.currentTarget.currentTime, e.currentTarget.duration);
                        mediaSeekStartedAtRef.current = null;
                    }}
                    onWaiting={() => { mediaWaitingStartedAtRef.current = performance.now(); }}
                    onPlaying={(e) => {
                        const waiting = mediaWaitingStartedAtRef.current;
                        if (waiting !== null) {
                            reportWatchMediaWaiting(Math.max(0, (performance.now() - waiting) / 1000));
                            mediaWaitingStartedAtRef.current = null;
                        }
                        reportWatchPlaybackState(e.currentTarget.playbackRate, e.currentTarget.muted);
                    }}
                    onTimeUpdate={(e) => handleMediaTimeUpdate(e.currentTarget.currentTime, e.currentTarget.duration)}
                    onEnded={(e) => {
                        const dur = e.currentTarget.duration;
                        const fallbackDur = dur || e.currentTarget.currentTime || 15;
                        reportWatchMediaEnded(fallbackDur, dur);
                        trackAssetCompleted(fallbackDur, dur);
                    }}
                >
                    <source src={contentBlobUrl} type={resolvedContent.mimeType} />
                    {audioFallbackTypes.filter((t) => t !== resolvedContent.mimeType).map((t) => (
                        <source key={t} src={contentBlobUrl} type={t} />
                    ))}
                </audio>
            </div>
        );
    }

    if (resolvedContent.kind === "image") {
        return (
            <div className="relative h-full w-full bg-black">
                <NextImage
                    key={`viewer-image-${contentBlobUrl}`}
                    src={contentBlobUrl}
                    alt="Content"
                    fill
                    unoptimized
                    loading={viewerImagePolicy.loading}
                    preload={viewerImagePolicy.preload}
                    fetchPriority={viewerImagePolicy.fetchPriority}
                    sizes={viewerImagePolicy.sizes}
                    quality={viewerImagePolicy.quality}
                    className="object-contain"
                    draggable={false}
                    onContextMenu={preventContextMenu}
                    {...getImagePolicyDataAttributes(viewerImagePolicy)}
                />
            </div>
        );
    }

    if (resolvedContent.kind === "pdf") {
        return (
            <div className="h-full w-full overflow-hidden rounded-md bg-white">
                <object
                    key={`viewer-pdf-${contentBlobUrl}`}
                    data={contentBlobUrl}
                    type="application/pdf"
                    className="w-full h-full"
                >
                    <p className="p-4 text-black text-center">
                        Your browser doesn&apos;t support built-in PDF viewing.
                    </p>
                </object>
            </div>
        );
    }

    return (
        <div className="flex h-full w-full items-center justify-center text-center p-10">
            <div>
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck className="w-10 h-10 text-gray-400" />
                </div>
                <p className="text-gray-400">File Preview Not Available</p>
            </div>
        </div>
    );
}
