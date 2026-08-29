import { ChevronDown, MessageCircleMore } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ChatConversationCanvasProps = {
    threadSwitcher: ReactNode;
    switcherExpanded: boolean;
    children: ReactNode;
};

export function ChatConversationCanvas({
    threadSwitcher,
    switcherExpanded,
    children,
}: ChatConversationCanvasProps) {
    return (
        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
            {threadSwitcher ? (
                <details
                    open={switcherExpanded || undefined}
                    className={cn(
                        "group shrink-0 border-b border-white/10 bg-slate-950/90",
                        switcherExpanded && "flex min-h-0 flex-1 flex-col",
                    )}
                >
                    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-left marker:content-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-fuchsia-200/70 sm:px-6 [&::-webkit-details-marker]:hidden">
                        <span className="inline-flex min-w-0 items-center gap-2 text-sm font-semibold text-white">
                            <MessageCircleMore className="h-4 w-4 shrink-0 text-fuchsia-200" aria-hidden="true" />
                            Conversations
                        </span>
                        <span className="inline-flex items-center gap-2 text-xs font-medium text-purple-100/64">
                            Switch thread
                            <ChevronDown className="h-4 w-4 transition group-open:rotate-180" aria-hidden="true" />
                        </span>
                    </summary>
                    <div
                        className={cn(
                            "border-t border-white/10",
                            switcherExpanded ? "min-h-0 flex-1 overflow-y-auto" : "max-h-[min(28rem,48dvh)] overflow-y-auto",
                        )}
                    >
                        {threadSwitcher}
                    </div>
                </details>
            ) : null}
            {children ? <div className={cn("min-h-0 flex-1", switcherExpanded && "hidden")}>{children}</div> : null}
        </div>
    );
}
