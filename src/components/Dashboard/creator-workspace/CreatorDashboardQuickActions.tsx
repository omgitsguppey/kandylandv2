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
        <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <nav className="grid gap-2 sm:grid-cols-3" aria-label="Creator studio shortcuts" data-creator-landing-quick-actions="soft_ui">
                <Link href="/dashboard/chat" className="flex min-h-11 items-center gap-3 rounded-2xl border border-brand-purple/25 bg-brand-purple/10 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-purple/20">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-purple text-white"><MessageCircle className="h-4 w-4" /></span>
                    <span className="min-w-0">Inbox {unreadMessagesCount > 0 ? <span className="ml-1 text-brand-pink">{unreadMessagesCount}</span> : null}</span>
                </Link>
                {isProjectionMode ? (
                    <button type="button" onClick={() => toast.error("Creator dashboard is read-only in admin projection.")} className="flex min-h-11 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm font-bold text-zinc-400 opacity-70">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.08]"><Package className="h-4 w-4" /></span>
                        Manage drops
                    </button>
                ) : (
                    <Link href={CREATOR_DROP_MANAGE_ROUTE} className="flex min-h-11 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-white/[0.1]" data-create-drop-route-state={CREATOR_DROP_ROUTE_STATE}>
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.08]"><Package className="h-4 w-4" /></span>
                        Manage drops
                    </Link>
                )}
                <Link href={CREATOR_SETTINGS_ROUTE} className="flex min-h-11 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-white/[0.1]">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.08]"><Users className="h-4 w-4" /></span>
                    Settings
                </Link>
            </nav>

            {recentThread ? (
                <Link href={`/dashboard/chat?thread=${recentThread.id}`} className="group relative flex min-h-11 w-full items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 transition-colors hover:bg-white/[0.06]">
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
                            <span className="shrink-0 text-xs text-zinc-500">{formatRelativeTime(recentThread.lastMessageAt).replace(" ago", "")}</span>
                        </div>
                        <p className="truncate text-xs text-gray-400">{recentThread.lastMessagePreview || "New thread"}</p>
                    </div>
                    {(recentThread.unreadCount ?? 0) > 0 ? <div className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand-purple" /> : null}
                </Link>
            ) : null}
        </section>
    );
}
