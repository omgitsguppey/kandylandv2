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
import { getImageLoadingPolicy, getImagePolicyDataAttributes } from "@/lib/image-loading-policy";
import { UserProfile } from "@/types/db";

type CreatorProfileHeaderProps = {
    canMessageCreator: boolean;
    creator: UserProfile & { followerCount?: number };
    dropsCount: number;
    followLoading: boolean;
    following: boolean;
    hasGlobalAlerts: boolean;
    messageHint?: string | null;
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
    messageHint,
    notificationsEnabled,
    onFollow,
    onMessage,
    onToggleAlerts,
    relationshipLoading,
    subscribeLoading,
}: CreatorProfileHeaderProps) {
    const imagePolicy = getImageLoadingPolicy("creator_profile_header");

    return (
        <section
            className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-white/[0.11] via-[#171022]/95 to-[#08060d] p-4 shadow-[0_22px_65px_rgba(0,0,0,0.42)] sm:rounded-[2.25rem] sm:p-6"
            data-creator-profile-mobile-scale="compact"
        >
            <div className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-brand-purple/20 blur-3xl" aria-hidden="true" />
            <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-8">
                <div className="min-w-0">
                    <div className="flex items-start gap-4 sm:gap-5">
                        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[1.5rem] border border-white/15 bg-zinc-900 shadow-xl shadow-black/30 sm:h-28 sm:w-28 sm:rounded-[2rem]">
                            {creator.photoURL ? (
                                <Image
                                    src={creator.photoURL}
                                    alt={creator.displayName || ""}
                                    fill
                                    loading={imagePolicy.loading}
                                    preload={imagePolicy.preload}
                                    fetchPriority={imagePolicy.fetchPriority}
                                    quality={imagePolicy.quality}
                                    sizes={imagePolicy.sizes}
                                    className="object-cover"
                                    {...getImagePolicyDataAttributes(imagePolicy)}
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center text-brand-purple">
                                    <Ghost className="h-8 w-8 sm:h-12 sm:w-12" />
                                </div>
                            )}
                        </div>

                        <div className="min-w-0 flex-1 pt-0.5 sm:pt-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="min-w-0 text-xl font-black tracking-tight text-white sm:text-4xl">{creator.displayName}</h1>
                                {creator.isVerified ? (
                                    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-brand-purple/30 bg-brand-purple/15 text-brand-purple" title="Verified creator">
                                        <CheckCircle2 className="h-4 w-4" aria-label="Verified creator" />
                                    </span>
                                ) : null}
                            </div>
                            <p className="mt-1 text-sm font-semibold text-purple-200/70">@{creator.username}</p>
                            {creator.bio ? (
                                <p className="mt-3 line-clamp-3 max-w-3xl text-sm leading-6 text-gray-200 sm:text-[15px]">
                                    {creator.bio}
                                </p>
                            ) : null}
                        </div>
                    </div>

                    <div className="mt-5 grid max-w-md grid-cols-2 gap-2.5" data-profile-count-density="compact">
                        <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3 backdrop-blur-sm sm:px-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">Drops</p>
                            <p className="mt-1 text-lg font-black text-white sm:text-2xl">{dropsCount}</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3 backdrop-blur-sm sm:px-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">Followers</p>
                            <p className="mt-1 text-lg font-black text-white sm:text-2xl">{creator.followerCount || 0}</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col justify-end gap-3 lg:border-l lg:border-white/10 lg:pl-6">
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            type="button"
                            onClick={onFollow}
                            disabled={followLoading}
                            aria-busy={followLoading}
                            className={cn(
                                "flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2 focus-visible:ring-offset-[#171022] sm:gap-2 sm:px-3 sm:text-sm",
                                following
                                    ? "border border-white/15 bg-white/10 text-white hover:bg-white/15"
                                    : "bg-brand-purple text-white shadow-lg shadow-brand-purple/25 hover:bg-brand-purple/90",
                            )}
                        >
                            {followLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
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
                            title={messageHint || (canMessageCreator ? undefined : "Messages are unavailable for this creator")}
                            className={cn(
                                "flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2 focus-visible:ring-offset-[#171022] sm:gap-2 sm:px-3 sm:text-sm",
                                canMessageCreator
                                    ? "border-white/10 bg-white/[0.07] text-white hover:bg-white/[0.12]"
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
                                "flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2 focus-visible:ring-offset-[#171022] sm:gap-2 sm:px-3 sm:text-sm",
                                hasGlobalAlerts
                                    ? "cursor-not-allowed border-transparent bg-white/5 text-gray-500 opacity-60"
                                    : notificationsEnabled
                                        ? "border-brand-purple/30 bg-brand-purple/15 text-white"
                                        : "border-white/10 bg-white/[0.07] text-gray-200 hover:bg-white/[0.12]",
                            )}
                            title={hasGlobalAlerts ? "All drop alerts are already enabled globally" : undefined}
                        >
                            <Bell className="h-4 w-4" />
                            {hasGlobalAlerts ? "All alerts" : notificationsEnabled ? "Alerts on" : "Alerts"}
                        </button>
                    </div>

                    {messageHint ? (
                        <p className="text-xs leading-5 text-zinc-400">{messageHint}</p>
                    ) : null}
                </div>
            </div>
        </section>
    );
}
