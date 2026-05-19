import Image from "next/image";
import Link from "next/link";
import { MessageCircle, Package, Users } from "lucide-react";
import { toast } from "sonner";

import { CREATOR_DROP_MANAGE_ROUTE, CREATOR_DROP_ROUTE_STATE, CREATOR_SETTINGS_ROUTE } from "@/lib/creator-profile-routing";
import { formatRelativeTime, type CreatorThreadRecord } from "./types";

export function CreatorDashboardQuickActions({
    unreadMessagesCount,
    recentThread,
    isProjectionMode,
}: {
    unreadMessagesCount: number;
    recentThread: CreatorThreadRecord | null;
    isProjectionMode: boolean;
}) {
    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            <div className="flex flex-1 items-center gap-2 overflow-x-auto pb-1 sm:pb-0" data-creator-landing-quick-actions="compact_v2">
                <Link href="/dashboard/chat" className="flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-full border border-brand-purple/20 bg-brand-purple/10 px-2.5 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-brand-purple/20 sm:min-h-10 sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm">
                    <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    Inbox {unreadMessagesCount > 0 ? <span className="flex h-5 items-center justify-center rounded-full bg-brand-purple px-2 text-[10px] font-bold">{unreadMessagesCount}</span> : null}
                </Link>
                {isProjectionMode ? (
                    <button type="button" onClick={() => toast.error("Creator dashboard is read-only in admin projection.")} className="flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold text-white opacity-60 sm:min-h-10 sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm">
                        <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        Manage drops
                    </button>
                ) : (
                    <Link href={CREATOR_DROP_MANAGE_ROUTE} className="flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-white/10 sm:min-h-10 sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm" data-create-drop-route-state={CREATOR_DROP_ROUTE_STATE}>
                        <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        Manage drops
                    </Link>
                )}
                <Link href={CREATOR_SETTINGS_ROUTE} className="flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-white/10 sm:min-h-10 sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm">
                    Creator settings
                </Link>
            </div>

            {recentThread ? (
                <Link href={`/dashboard/chat?thread=${recentThread.id}`} className="group relative flex w-full shrink-0 items-center gap-3 rounded-2xl border border-white/10 bg-black/40 px-3 py-2.5 transition-colors hover:bg-white/5 sm:w-[280px] sm:px-4 sm:py-3">
                    {recentThread.counterpartPhotoURL ? (
                        <Image
                            src={recentThread.counterpartPhotoURL}
                            alt="Fan"
                            width={40}
                            height={40}
                            className="h-10 w-10 shrink-0 rounded-full object-cover"
                            unoptimized
                        />
                    ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white">
                            <Users className="h-5 w-5 opacity-50" />
                        </div>
                    )}
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-bold text-white">{recentThread.counterpartDisplayName || recentThread.counterpartUsername || "Fan"}</p>
                            <span className="shrink-0 text-[10px] text-gray-500">{formatRelativeTime(recentThread.lastMessageAt).replace(" ago", "")}</span>
                        </div>
                        <p className="truncate text-xs text-gray-400">{recentThread.lastMessagePreview || "New thread"}</p>
                    </div>
                    {(recentThread.unreadCount ?? 0) > 0 ? <div className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand-purple" /> : null}
                </Link>
            ) : null}
        </div>
    );
}
