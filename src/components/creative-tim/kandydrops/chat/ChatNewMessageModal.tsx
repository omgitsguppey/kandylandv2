"use client";

import Link from "next/link";
import { ChevronRight, X } from "lucide-react";
import type { CSSProperties, ReactNode, Ref } from "react";

import { cn } from "@/lib/utils";

export interface ChatNewMessageCreator {
    uid: string;
    displayName: string;
    username?: string | null;
    photoURL?: string | null;
}

export interface ChatNewMessageAvatarArgs {
    photoURL?: string | null;
    label: string;
    sizeClassName: string;
    textClassName: string;
}

export interface ChatNewMessageModalProps {
    open: boolean;
    sheetRef: Ref<HTMLDivElement>;
    sheetStyle?: CSSProperties;
    listStyle?: CSSProperties;
    iosPwa: boolean;
    creators: readonly ChatNewMessageCreator[];
    onClose: () => void;
    onSelectCreator: (creatorId: string) => void;
    renderAvatar: (args: ChatNewMessageAvatarArgs) => ReactNode;
}

export function ChatNewMessageModal({
    open,
    sheetRef,
    sheetStyle,
    listStyle,
    iosPwa,
    creators,
    onClose,
    onSelectCreator,
    renderAvatar,
}: ChatNewMessageModalProps) {
    if (!open) {
        return null;
    }

    return (
        <div
            className="fixed inset-0 z-40 bg-black/75 px-4 pt-6 backdrop-blur-sm"
            data-chat-new-message-modal="true"
            data-chat-modal-above-bottom-nav="true"
            data-chat-modal-glass-skin="true"
            data-chat-functions-unchanged="true"
            data-new-message-sheet-platform={iosPwa ? "ios-pwa" : "default"}
            data-new-message-sheet-safe="above-bottom-nav"
        >
            <div ref={sheetRef} className="mx-auto flex h-full w-full max-w-md flex-col justify-end" style={sheetStyle}>
                <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/95 shadow-2xl shadow-black/50 backdrop-blur-2xl">
                    <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.025] px-5 py-4">
                        <div>
                            <p className="text-base font-semibold text-white">New message</p>
                            <p className="mt-1 text-sm text-[#8f9097]">Choose a creator you already follow.</p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
                            aria-label="Close new message picker"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    <div
                        className={cn("overflow-y-auto px-3 pt-3 overscroll-contain", iosPwa ? "max-h-[52vh]" : "max-h-[56vh]")}
                        style={listStyle}
                        data-chat-modal-list-bottom-padding="true"
                    >
                        {creators.length > 0 ? creators.map((creator) => (
                            <button
                                key={creator.uid}
                                type="button"
                                onClick={() => onSelectCreator(creator.uid)}
                                className="flex min-h-11 w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-white/[0.04]"
                            >
                                {renderAvatar({
                                    photoURL: creator.photoURL,
                                    label: creator.displayName,
                                    sizeClassName: "h-11 w-11",
                                    textClassName: "text-sm",
                                })}
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-white">{creator.displayName}</p>
                                    <p className="truncate text-xs text-[#8f9097]">
                                        {creator.username ? "@" + creator.username : creator.uid}
                                    </p>
                                </div>
                                <ChevronRight className="h-4 w-4 text-[#63646b]" />
                            </button>
                        )) : (
                            <div className="px-3 py-10 text-center">
                                <p className="text-base font-semibold text-white">No followed creators yet</p>
                                <p className="mt-2 text-sm leading-6 text-[#8f9097]">
                                    Follow creators first, then come back here to start a new message.
                                </p>
                                <Link
                                    href="/experiences"
                                    className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-brand-purple px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-purple/25 transition hover:bg-fuchsia-600"
                                >
                                    Follow creators
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
