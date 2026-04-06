"use client";

import Image from "next/image";
import {
    Bell,
    CheckCircle2,
    Ghost,
    Loader2,
    MessageSquare,
    UserCheck,
    UserPlus,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { UserProfile } from "@/types/db";

type CreatorProfileHeaderProps = {
    canMessageCreator: boolean;
    creator: UserProfile & { followerCount?: number };
    dropsCount: number;
    followLoading: boolean;
    following: boolean;
    hasGlobalAlerts: boolean;
    notificationsEnabled: boolean;
    onFollow: () => void;
    onMessage: () => void;
    onToggleAlerts: () => void;
    relationshipLoading: boolean;
    subscribeLoading: boolean;
};

export function CreatorProfileHeader({
    canMessageCreator,
    creator,
    dropsCount,
    followLoading,
    following,
    hasGlobalAlerts,
    notificationsEnabled,
    onFollow,
    onMessage,
    onToggleAlerts,
    relationshipLoading,
    subscribeLoading,
}: CreatorProfileHeaderProps) {
    return (
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.08] via-black to-black p-4 shadow-[0_30px_80px_rgba(0,0,0,0.45)] sm:p-5">
            <div className="flex flex-col gap-4">
                <div className="flex items-start gap-4">
                    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border border-white/10 bg-zinc-900 shadow-2xl sm:h-28 sm:w-28">
                        {creator.photoURL ? (
                            <Image src={creator.photoURL} alt={creator.displayName || ""} fill sizes="112px" priority className="object-cover" />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center text-brand-purple">
                                <Ghost className="h-10 w-10 sm:h-12 sm:w-12" />
                            </div>
                        )}
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="min-w-0 text-2xl font-black tracking-tight text-white sm:text-4xl">{creator.displayName}</h1>
                            {creator.isVerified ? <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-purple" /> : null}
                        </div>
                        <p className="mt-1 text-sm font-medium text-gray-400">@{creator.username}</p>
                        {creator.bio ? (
                            <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-200">
                                {creator.bio}
                            </p>
                        ) : null}
                    </div>
                </div>

                <div className="grid max-w-md grid-cols-2 gap-2">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">Drops</p>
                        <p className="mt-1 text-2xl font-black text-white">{dropsCount}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">Followers</p>
                        <p className="mt-1 text-2xl font-black text-white">{creator.followerCount || 0}</p>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    <button
                        type="button"
                        onClick={onFollow}
                        disabled={followLoading}
                        className={cn(
                            "flex h-11 items-center justify-center gap-2 rounded-2xl px-3 text-sm font-bold transition-all",
                            following
                                ? "border border-white/15 bg-white/10 text-white"
                                : "bg-brand-purple text-white shadow-lg shadow-brand-purple/20",
                        )}
                    >
                        {followLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : following ? (
                            <>
                                <UserCheck className="h-4 w-4" /> Following
                            </>
                        ) : (
                            <>
                                <UserPlus className="h-4 w-4" /> Follow
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={onMessage}
                        disabled={!canMessageCreator}
                        className={cn(
                            "flex h-11 items-center justify-center gap-2 rounded-2xl border px-3 text-sm font-bold transition-all",
                            canMessageCreator
                                ? "border-white/10 bg-white/5 text-white hover:bg-white/10"
                                : "cursor-not-allowed border-white/5 bg-white/[0.04] text-gray-500",
                        )}
                    >
                        <MessageSquare className="h-4 w-4" />
                        Message
                    </button>

                    <button
                        type="button"
                        disabled={hasGlobalAlerts || followLoading || subscribeLoading || relationshipLoading}
                        onClick={onToggleAlerts}
                        className={cn(
                            "flex h-11 items-center justify-center gap-2 rounded-2xl border px-3 text-sm font-bold transition-all",
                            hasGlobalAlerts
                                ? "cursor-not-allowed border-transparent bg-white/5 text-gray-500 opacity-60"
                                : notificationsEnabled
                                    ? "border-white/20 bg-white/15 text-white"
                                    : "border-white/10 bg-white/5 text-gray-200 hover:bg-white/10",
                        )}
                        title={hasGlobalAlerts ? "All drop alerts are already enabled globally" : undefined}
                    >
                        <Bell className="h-4 w-4" />
                        {hasGlobalAlerts ? "All alerts" : notificationsEnabled ? "Alerts on" : "Alerts"}
                    </button>
                </div>
            </div>
        </section>
    );
}
