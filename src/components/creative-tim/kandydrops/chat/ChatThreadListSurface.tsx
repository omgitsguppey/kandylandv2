"use client";

import { Check, ChevronRight, MessageSquare } from "lucide-react";
import type { CSSProperties, ReactNode, Ref } from "react";

import { cn } from "@/lib/utils";

export interface ChatAvatarRenderArgs {
    photoURL?: string | null;
    label: string;
    sizeClassName: string;
    textClassName: string;
}

export interface ChatThreadListEntry {
    id: string;
    displayName: string;
    username?: string | null;
    secondaryLabel?: string | null;
    photoURL?: string | null;
    lastMessagePreview?: string | null;
    timeLabel: string;
    unreadCount: number;
    selected: boolean;
    onOpen: () => void;
}

export interface ChatThreadListSurfaceProps {
    visible: boolean;
    compactOnly: boolean;
    panelRef: Ref<HTMLElement>;
    compactPanelClassName: string;
    compactScrollRef: Ref<HTMLDivElement>;
    compactScrollClassName: string;
    compactScrollStyle?: CSSProperties;
    headerActions?: ReactNode;
    listControls?: ReactNode;
    loading: boolean;
    threadCount: number;
    selectionMode: boolean;
    compactRows: readonly ChatThreadListEntry[];
    desktopRows: readonly ChatThreadListEntry[];
    searchEmptyState: ReactNode;
    compactEmptyState: ReactNode;
    renderAvatar: (args: ChatAvatarRenderArgs) => ReactNode;
}

export interface ChatCompactThreadRowsProps {
    rows: readonly ChatThreadListEntry[];
    selectionMode: boolean;
    renderAvatar: (args: ChatAvatarRenderArgs) => ReactNode;
}

export function ChatCompactThreadRows({
    rows,
    selectionMode,
    renderAvatar,
}: ChatCompactThreadRowsProps) {
    return (
        <div className="min-h-full space-y-1">
            {rows.map((thread) => (
                <button
                    key={thread.id}
                    type="button"
                    onClick={thread.onOpen}
                    className="flex min-h-11 w-full items-center gap-3 rounded-2xl border border-transparent px-3 py-3 text-left transition hover:border-white/10 hover:bg-white/[0.04]"
                >
                    {selectionMode ? (
                        <span className={cn(
                            "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition",
                            thread.selected
                                ? "border-[#4d9cff] bg-[#4d9cff] text-white"
                                : "border-white/20 bg-transparent text-transparent",
                        )}>
                            <Check className="h-3.5 w-3.5" />
                        </span>
                    ) : null}
                    {renderAvatar({
                        photoURL: thread.photoURL,
                        label: thread.displayName,
                        sizeClassName: "h-12 w-12",
                        textClassName: "text-sm",
                    })}
                    <div className="min-w-0 flex-1 border-b border-white/6 pb-3">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-white">{thread.displayName}</p>
                                <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-400">
                                    {thread.lastMessagePreview || "No messages yet"}
                                </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2 pl-2">
                                <span className="text-xs font-medium text-slate-500">{thread.timeLabel}</span>
                                {thread.unreadCount > 0 ? (
                                    <span className="inline-flex h-2.5 w-2.5 rounded-full bg-brand-purple" />
                                ) : null}
                                {!selectionMode ? <ChevronRight className="h-4 w-4 text-[#63646b]" /> : null}
                            </div>
                        </div>
                    </div>
                </button>
            ))}
        </div>
    );
}

export interface ChatDesktopThreadRowsProps {
    rows: readonly ChatThreadListEntry[];
    renderAvatar: (args: ChatAvatarRenderArgs) => ReactNode;
}

export function ChatDesktopThreadRows({
    rows,
    renderAvatar,
}: ChatDesktopThreadRowsProps) {
    return (
        <>
            {rows.map((thread) => (
                <button
                    key={thread.id}
                    type="button"
                    onClick={thread.onOpen}
                    className={cn(
                        "mx-3 mb-1 flex w-[calc(100%-1.5rem)] items-center gap-3 rounded-2xl border border-transparent px-3 py-3 text-left transition sm:mx-4 sm:w-[calc(100%-2rem)]",
                        thread.selected
                            ? "border-brand-purple/30 bg-brand-purple/10"
                            : "hover:border-white/10 hover:bg-white/[0.04]",
                    )}
                >
                    {renderAvatar({
                        photoURL: thread.photoURL,
                        label: thread.displayName,
                        sizeClassName: "h-11 w-11",
                        textClassName: "text-sm",
                    })}
                    <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-white">{thread.displayName}</p>
                                <p className="truncate text-xs text-[#7e7f87]">
                                    {thread.username ? "@" + thread.username : thread.secondaryLabel || thread.id}
                                </p>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-1">
                                <span className="text-[11px] text-[#6b6c73]">{thread.timeLabel}</span>
                                {thread.unreadCount > 0 ? (
                                    <span className="rounded-full bg-brand-purple px-2 py-0.5 text-[10px] font-semibold text-white">{thread.unreadCount}</span>
                                ) : null}
                            </div>
                        </div>
                        <p className="mt-1 line-clamp-1 text-sm text-[#b6b6bc]">{thread.lastMessagePreview || "No messages yet"}</p>
                    </div>
                </button>
            ))}
        </>
    );
}

export function ChatThreadListSurface({
    visible,
    compactOnly,
    panelRef,
    compactPanelClassName,
    compactScrollRef,
    compactScrollClassName,
    compactScrollStyle,
    headerActions,
    listControls,
    loading,
    threadCount,
    selectionMode,
    compactRows,
    desktopRows,
    searchEmptyState,
    compactEmptyState,
    renderAvatar,
}: ChatThreadListSurfaceProps) {
    if (!visible) {
        return null;
    }

    return (
        <aside
            ref={panelRef}
            className={cn(
                "min-h-0 bg-slate-950/95",
                compactOnly
                    ? "relative h-full overflow-hidden"
                    : "flex min-h-0 flex-col border-b border-white/10 lg:border-b-0 lg:border-r lg:border-r-white/10",
            )}
        >
            {compactOnly ? (
                <div className={compactPanelClassName}>
                    <div className="border-b border-white/10 bg-white/[0.025] px-5 pb-4 pt-4">
                        <div className="flex items-center justify-between">
                            {headerActions}
                        </div>
                        <div className="mt-3">
                            <p className="text-2xl font-semibold tracking-tight text-white">Messages</p>
                            <p className="mt-1 text-sm text-[#8f9097]">
                                {loading ? "Loading your conversations..." : String(threadCount) + " conversation" + (threadCount === 1 ? "" : "s")}
                            </p>
                        </div>
                    </div>

                    <div
                        ref={compactScrollRef}
                        className={cn(compactScrollClassName, "flex min-h-0 flex-1 flex-col")}
                        style={compactScrollStyle}
                    >
                        {loading && threadCount === 0 ? (
                            <div className="flex min-h-full flex-1 flex-col items-center justify-center text-center">
                                <div className="rounded-2xl border border-brand-purple/30 bg-brand-purple/10 p-4 text-brand-purple">
                                    <MessageSquare className="h-8 w-8" />
                                </div>
                                <p className="mt-5 text-2xl font-black text-white">Loading conversations</p>
                                <p className="mt-2 max-w-sm text-sm leading-6 text-[#8f9097]">
                                    Pulling your creator threads into the chat shell.
                                </p>
                            </div>
                        ) : compactRows.length > 0 ? (
                            <div className="min-h-full space-y-1">
                                {compactRows.map((thread) => (
                                    <button
                                        key={thread.id}
                                        type="button"
                                        onClick={thread.onOpen}
                                        className="flex min-h-11 w-full items-center gap-3 rounded-2xl border border-transparent px-3 py-3 text-left transition hover:border-white/10 hover:bg-white/[0.04]"
                                    >
                                        {selectionMode ? (
                                            <span className={cn(
                                                "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition",
                                                thread.selected
                                                    ? "border-[#4d9cff] bg-[#4d9cff] text-white"
                                                    : "border-white/20 bg-transparent text-transparent",
                                            )}>
                                                <Check className="h-3.5 w-3.5" />
                                            </span>
                                        ) : null}
                                        {renderAvatar({
                                            photoURL: thread.photoURL,
                                            label: thread.displayName,
                                            sizeClassName: "h-12 w-12",
                                            textClassName: "text-sm",
                                        })}
                                        <div className="min-w-0 flex-1 border-b border-white/6 pb-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-semibold text-white">{thread.displayName}</p>
                                                    <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-400">
                                                        {thread.lastMessagePreview || "No messages yet"}
                                                    </p>
                                                </div>
                                                <div className="flex shrink-0 items-center gap-2 pl-2">
                                                    <span className="text-xs font-medium text-slate-500">{thread.timeLabel}</span>
                                                    {thread.unreadCount > 0 ? (
                                                        <span className="inline-flex h-2.5 w-2.5 rounded-full bg-brand-purple" />
                                                    ) : null}
                                                    {!selectionMode ? <ChevronRight className="h-4 w-4 text-[#63646b]" /> : null}
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : threadCount > 0 ? searchEmptyState : compactEmptyState}
                    </div>

                    {listControls}
                </div>
            ) : (
                <>
                    <div className="border-b border-white/10 bg-white/[0.025] px-4 py-4 sm:px-5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7f7f86]">Chat</p>
                        <p className="mt-1 text-sm text-[#b6b6bc]">
                            {loading ? "Loading live threads..." : String(threadCount) + " conversation" + (threadCount === 1 ? "" : "s")}
                        </p>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
                        {desktopRows.length > 0 ? desktopRows.map((thread) => (
                            <button
                                key={thread.id}
                                type="button"
                                onClick={thread.onOpen}
                                className={cn(
                                    "mx-3 mb-1 flex w-[calc(100%-1.5rem)] items-center gap-3 rounded-2xl border border-transparent px-3 py-3 text-left transition sm:mx-4 sm:w-[calc(100%-2rem)]",
                                    thread.selected
                                        ? "border-brand-purple/30 bg-brand-purple/10"
                                        : "hover:border-white/10 hover:bg-white/[0.04]",
                                )}
                            >
                                {renderAvatar({
                                    photoURL: thread.photoURL,
                                    label: thread.displayName,
                                    sizeClassName: "h-11 w-11",
                                    textClassName: "text-sm",
                                })}
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-white">{thread.displayName}</p>
                                            <p className="truncate text-xs text-[#7e7f87]">
                                                {thread.username ? "@" + thread.username : thread.id}
                                            </p>
                                        </div>
                                        <div className="flex shrink-0 flex-col items-end gap-1">
                                            <span className="text-[11px] text-[#6b6c73]">{thread.timeLabel}</span>
                                            {thread.unreadCount > 0 ? (
                                                <span className="rounded-full bg-brand-purple px-2 py-0.5 text-[10px] font-semibold text-white">{thread.unreadCount}</span>
                                            ) : null}
                                        </div>
                                    </div>
                                    <p className="mt-1 line-clamp-1 text-sm text-[#b6b6bc]">{thread.lastMessagePreview || "No messages yet"}</p>
                                </div>
                            </button>
                        )) : (
                            <div className="px-4 py-10 text-sm text-[#8f9097] sm:px-5">
                                No chat threads yet. Start from a creator page to open the first one.
                            </div>
                        )}
                    </div>
                </>
            )}
        </aside>
    );
}
