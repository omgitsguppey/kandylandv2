"use client";

import type { CSSProperties, ReactNode, Ref, UIEventHandler } from "react";

import { cn } from "@/lib/utils";

export interface ChatTranscriptAttachment {
    kind: string;
    url: string;
}

export interface ChatTranscriptMessage {
    id: string;
    text?: string | null;
    assetName?: string | null;
    attachment?: ChatTranscriptAttachment | null;
    assetUnavailable: boolean;
    isOutgoing: boolean;
    isOptimistic: boolean;
    showTimelineMarker: boolean;
    timelineLabel: string;
    statusLabel?: string | null;
}

export interface ChatTranscriptSurfaceProps {
    scrollRef: Ref<HTMLDivElement>;
    onScroll: UIEventHandler<HTMLDivElement>;
    style?: CSSProperties;
    loading: boolean;
    messages: readonly ChatTranscriptMessage[];
    mediaPreviewStyle?: CSSProperties;
    emptyState: ReactNode;
}

export function ChatTranscriptSurface({
    scrollRef,
    onScroll,
    style,
    loading,
    messages,
    mediaPreviewStyle,
    emptyState,
}: ChatTranscriptSurfaceProps) {
    return (
        <div
            ref={scrollRef}
            onScroll={onScroll}
            className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain bg-slate-950 px-4 pt-5 sm:px-6"
            style={style}
        >
            {loading ? (
                <div className="text-sm text-[#b6b6bc]">Loading thread...</div>
            ) : messages.length > 0 ? messages.map((message, index) => {
                const isAttachmentOnlyMessage = Boolean(message.attachment && !message.text?.trim());

                return (
                    <div key={message.id} className={cn(index === 0 ? "" : "mt-1")}>
                        {message.showTimelineMarker ? (
                            <div className="mb-4 flex justify-center">
                                <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[#6b6c73]">
                                    {message.timelineLabel}
                                </span>
                            </div>
                        ) : null}
                        <div className={cn("flex", message.isOutgoing ? "justify-end" : "justify-start")}>
                            <div
                                className={cn(
                                    "min-w-0",
                                    isAttachmentOnlyMessage
                                        ? "w-fit max-w-[78vw] sm:max-w-[28rem]"
                                        : message.attachment
                                            ? "max-w-[65%]"
                                            : "max-w-[84%] sm:max-w-[72%]",
                                )}
                                data-chat-media-density="compact-v2"
                            >
                                <div className={cn(
                                    "overflow-hidden text-sm leading-6 shadow-xl shadow-black/20",
                                    message.isOutgoing
                                        ? "rounded-3xl rounded-br-lg bg-gradient-to-br from-brand-purple to-fuchsia-600 text-white"
                                        : "rounded-3xl rounded-bl-lg border border-white/10 bg-white/[0.06] text-white",
                                    isAttachmentOnlyMessage ? "inline-block p-1.5" : "px-4 py-2.5",
                                    message.isOptimistic ? "opacity-75" : "",
                                )}>
                                    {message.text ? <p className="whitespace-pre-wrap break-words">{message.text}</p> : null}
                                    {message.attachment ? (
                                        <div className={cn(message.text ? "mt-3" : "")}>
                                            <div
                                                className={cn(
                                                    "w-fit max-w-full overflow-hidden rounded-[1.15rem]",
                                                    message.isOutgoing ? "bg-brand-purple/60" : "bg-slate-900",
                                                )}
                                                style={mediaPreviewStyle}
                                            >
                                                {message.attachment.kind === "image" ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        src={message.attachment.url}
                                                        alt={message.assetName || "Chat image attachment"}
                                                        className="h-auto w-auto max-w-full object-contain"
                                                        style={mediaPreviewStyle}
                                                        data-chat-media-kind="image"
                                                    />
                                                ) : (
                                                    <video
                                                        src={message.attachment.url}
                                                        controls
                                                        aria-label={message.assetName || "Chat video attachment"}
                                                        className="h-auto w-auto max-w-full object-contain"
                                                        style={mediaPreviewStyle}
                                                        data-chat-media-kind="video"
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    ) : message.assetUnavailable ? (
                                        <p className={cn(message.text ? "mt-3" : "", "rounded-xl bg-black/20 px-3 py-2 text-sm text-white/75")}>
                                            Attachment unavailable.
                                        </p>
                                    ) : null}
                                </div>
                                {message.statusLabel ? (
                                    <div className="mt-1 px-3 text-right text-xs font-medium text-slate-500">
                                        {message.statusLabel}
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>
                );
            }) : emptyState}
        </div>
    );
}
