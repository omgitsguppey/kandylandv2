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
            className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] via-black to-black p-3 shadow-[0_18px_50px_rgba(0,0,0,0.38)] sm:rounded-[2rem] sm:p-5"
            data-creator-profile-mobile-scale="compact"
        >
            <div className="flex flex-col gap-3 sm:gap-4">
                <div className="flex items-start gap-3 sm:gap-4">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-white/10 bg-zinc-900 shadow-xl sm:h-28 sm:w-28 sm:shadow-2xl">
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

                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="min-w-0 text-xl font-black tracking-tight text-white sm:text-4xl">{creator.displayName}</h1>
                            {creator.isVerified ? <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-purple sm:h-5 sm:w-5" /> : null}
                        </div>
                        <p className="mt-1 text-sm font-medium text-gray-400">@{creator.username}</p>
                        {creator.bio ? (
                            <p className="mt-2 line-clamp-3 max-w-3xl text-sm leading-5 text-gray-200 sm:mt-3 sm:leading-6">
                                {creator.bio}
                            </p>
                        ) : null}
                    </div>
                </div>

                <div className="grid max-w-md grid-cols-2 gap-2" data-profile-count-density="compact">
                    <div className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 sm:rounded-2xl sm:px-4 sm:py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">Drops</p>
                        <p className="mt-0.5 text-lg font-black text-white sm:mt-1 sm:text-2xl">{dropsCount}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 sm:rounded-2xl sm:px-4 sm:py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">Followers</p>
                        <p className="mt-0.5 text-lg font-black text-white sm:mt-1 sm:text-2xl">{creator.followerCount || 0}</p>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    <button
                        type="button"
                        onClick={onFollow}
                        disabled={followLoading}
                        aria-busy={followLoading}
                        className={cn(
                            "flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-bold transition-all sm:gap-2 sm:rounded-2xl sm:px-3 sm:text-sm",
                            following
                                ? "border border-white/15 bg-white/10 text-white"
                                : "bg-brand-purple text-white shadow-lg shadow-brand-purple/20",
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
                            "flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-bold transition-all sm:gap-2 sm:rounded-2xl sm:px-3 sm:text-sm",
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
                            "flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-bold transition-all sm:gap-2 sm:rounded-2xl sm:px-3 sm:text-sm",
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

                {messageHint ? (
                    <p className="text-xs leading-5 text-zinc-400">{messageHint}</p>
                ) : null}
            </div>
        </section>
    );
}
