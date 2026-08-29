"use client";

import { MessageSquare } from "lucide-react";
import type { ReactNode } from "react";

export interface ChatConversationEmptyStateProps {
    primaryAction: ReactNode;
    secondaryAction: ReactNode;
}

export function ChatConversationEmptyState({
    primaryAction,
    secondaryAction,
}: ChatConversationEmptyStateProps) {
    return (
        <div className="flex h-full min-h-0 flex-col items-center justify-center bg-slate-950 px-6 text-center">
            <div className="rounded-2xl border border-brand-purple/30 bg-brand-purple/10 p-4 text-brand-purple">
                <MessageSquare className="h-8 w-8" />
            </div>
            <h2 className="mt-5 text-2xl font-black text-white">Open a creator conversation</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-[#8f9097]">
                Start from a creator page, follow them, then open Chat to keep the conversation in one place.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
                {primaryAction}
                {secondaryAction}
            </div>
        </div>
    );
}
