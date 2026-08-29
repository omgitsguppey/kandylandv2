"use client";

import type { CSSProperties, ReactNode, Ref } from "react";

import { cn } from "@/lib/utils";

export interface ChatComposerSurfaceProps {
    composerRef: Ref<HTMLDivElement>;
    composerStyle?: CSSProperties;
    controlsRef: Ref<HTMLDivElement>;
    attachmentRef: Ref<HTMLDivElement>;
    hasStatusTray: boolean;
    statusTray?: ReactNode;
    attachmentControl: ReactNode;
    iosPwa: boolean;
    textareaControl: ReactNode;
    sendControl: ReactNode;
}

export interface ChatComposerFrameProps {
    composerRef: Ref<HTMLDivElement>;
    composerStyle?: CSSProperties;
    children: ReactNode;
}

export function ChatComposerFrame({
    composerRef,
    composerStyle,
    children,
}: ChatComposerFrameProps) {
    return (
        <div
            ref={composerRef}
            className="shrink-0 min-w-0 border-t border-white/10 bg-slate-950/95 px-4 pb-2 pt-2 sm:px-6 sm:pb-4"
            style={composerStyle}
            data-chat-composer-above-bottom-nav="true"
            data-chat-density="public-beta-compact"
            data-chat-composer-chin="compact"
        >
            {children}
        </div>
    );
}

export function ChatComposerSurface({
    composerRef,
    composerStyle,
    controlsRef,
    attachmentRef,
    hasStatusTray,
    statusTray,
    attachmentControl,
    iosPwa,
    textareaControl,
    sendControl,
}: ChatComposerSurfaceProps) {
    return (
        <div
            ref={composerRef}
            className="shrink-0 min-w-0 border-t border-white/10 bg-slate-950/95 px-4 pb-2 pt-2 sm:px-6 sm:pb-4"
            style={composerStyle}
            data-chat-composer-above-bottom-nav="true"
            data-chat-density="public-beta-compact"
            data-chat-composer-chin="compact"
        >
            {hasStatusTray ? (
                <div className="mb-2.5 space-y-2 max-h-[calc(var(--chat-composer-status-tray-max-height,7.25rem))] overflow-y-auto overscroll-contain">
                    {statusTray}
                </div>
            ) : null}
            <div ref={controlsRef} className="flex min-h-12 max-h-12 min-w-0 items-center gap-2">
                <div ref={attachmentRef} className="relative shrink-0">
                    {attachmentControl}
                </div>
                <div className={cn(
                    "flex min-h-12 max-h-12 min-w-0 flex-1 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] shadow-inner shadow-white/5",
                    iosPwa ? "py-0.5 pl-3 pr-0.5" : "py-1 pl-4 pr-1",
                )}>
                    {textareaControl}
                    {sendControl}
                </div>
            </div>
        </div>
    );
}
