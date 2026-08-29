import { ChevronDown, MessagesSquare } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type KandySupportConversationCanvasProps = {
    threadCount: number;
    switcherOpen: boolean;
    switcher: ReactNode;
    children: ReactNode;
};

export function KandySupportConversationCanvas({
    threadCount,
    switcherOpen,
    switcher,
    children,
}: KandySupportConversationCanvasProps) {
    return (
        <section className="mt-5 flex min-h-[34rem] flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-[linear-gradient(150deg,rgba(41,9,76,0.9),rgba(18,3,42,0.9))] shadow-[0_20px_60px_rgba(10,1,27,0.3)] backdrop-blur-xl">
            <details
                open={switcherOpen || undefined}
                className={cn(
                    "group shrink-0 border-b border-white/10 bg-[#21083e]/72",
                    switcherOpen && "flex min-h-0 flex-1 flex-col",
                )}
            >
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 text-left marker:content-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pink-200/70 sm:px-5 [&::-webkit-details-marker]:hidden">
                    <span className="inline-flex min-w-0 items-center gap-2 text-sm font-semibold text-white">
                        <MessagesSquare className="h-4 w-4 shrink-0 text-pink-100" aria-hidden="true" />
                        Your conversations
                        <span className="inline-flex min-h-7 min-w-7 items-center justify-center rounded-lg border border-pink-200/15 bg-pink-400/10 px-2 text-xs font-bold text-pink-100">
                            {threadCount}
                        </span>
                    </span>
                    <span className="inline-flex items-center gap-2 text-xs font-medium text-purple-100/64">
                        Switch thread
                        <ChevronDown className="h-4 w-4 transition group-open:rotate-180" aria-hidden="true" />
                    </span>
                </summary>
                <div
                    className={cn(
                        "border-t border-white/10",
                        switcherOpen ? "min-h-0 flex-1 overflow-y-auto" : "max-h-[min(28rem,48dvh)] overflow-y-auto",
                    )}
                >
                    {switcher}
                </div>
            </details>
            <div className={cn("min-h-0 flex-1", switcherOpen && "hidden")}>{children}</div>
        </section>
    );
}
