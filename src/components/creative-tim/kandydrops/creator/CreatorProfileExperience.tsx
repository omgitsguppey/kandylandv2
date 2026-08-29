"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import {
    Bell,
    CheckCircle2,
    Ghost,
    Loader2,
    MessageSquare,
    Sparkles,
    UserCheck,
    UserPlus,
} from "lucide-react";

import { getImageLoadingPolicy, getImagePolicyDataAttributes } from "@/lib/image-loading-policy";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/types/db";

type CreatorProfileExperienceProps = {
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

type CreatorProfileRouteFrameProps = {
    children: ReactNode;
    className?: string;
};

type CreatorProfileTabsProps = {
    activeTab: "drops" | "experiences";
    hasExperiences: boolean;
    onSelectTab: (tab: "drops" | "experiences") => void;
};

export function CreatorProfileRouteFrame({ children, className }: CreatorProfileRouteFrameProps) {
    return (
        <section className={cn("relative isolate overflow-hidden py-1 sm:py-2", className)}>
            <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-[-5rem] h-80 w-80 rounded-full bg-brand-purple/20 blur-3xl" />
            <div aria-hidden="true" className="pointer-events-none absolute -right-24 bottom-[-6rem] h-80 w-80 rounded-full bg-brand-pink/15 blur-3xl" />
            <div className="relative">{children}</div>
        </section>
    );
}

export function CreatorProfileExperience({
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
}: CreatorProfileExperienceProps) {
    const imagePolicy = getImageLoadingPolicy("creator_profile_header");
    const creatorName = creator.displayName || creator.username || "Creator";
    const releaseLine = dropsCount === 0
        ? "No public Drops are in rotation yet."
        : dropsCount === 1
            ? "One public Drop is waiting below."
            : `${dropsCount} public Drops are waiting below.`;

    return (
        <section aria-labelledby="creator-world-heading" className="relative overflow-hidden rounded-[2.25rem] border border-white/10 bg-[linear-gradient(145deg,rgba(31,15,53,0.96),rgba(11,6,20,0.98)_58%,rgba(22,9,34,0.95))] shadow-[0_28px_76px_rgba(0,0,0,0.44)]">
            <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-20 h-56 w-56 rounded-full bg-brand-purple/25 blur-3xl" />
            <div aria-hidden="true" className="pointer-events-none absolute right-[-3rem] top-[-2rem] h-64 w-64 rounded-full bg-brand-pink/15 blur-3xl" />

            <div className="relative p-5 sm:p-7 lg:p-9">
                <div className="flex flex-col gap-7">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[1.75rem] border border-white/15 bg-black/30 shadow-[0_18px_42px_rgba(0,0,0,0.34)] sm:h-24 sm:w-24">
                            {creator.photoURL ? (
                                <Image
                                    src={creator.photoURL}
                                    alt={creatorName}
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
                                    <Ghost className="h-9 w-9" />
                                </div>
                            )}
                            {creator.isVerified ? (
                                <span className="absolute bottom-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-brand-purple text-white shadow-lg shadow-brand-purple/40">
                                    <CheckCircle2 className="h-3.5 w-3.5" aria-label="Verified creator" />
                                </span>
                            ) : null}
                        </div>

                        <div className="min-w-0 max-w-3xl">
                            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-brand-purple">
                                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Creator world
                            </p>
                            <h1 id="creator-world-heading" className="mt-3 text-4xl font-black leading-[0.95] tracking-[-0.055em] text-white sm:text-5xl">
                                Enter {creatorName}&apos;s world.
                            </h1>
                            <p className="mt-3 text-sm font-semibold text-purple-200/75">@{creator.username}</p>
                            {creator.bio ? <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-200 sm:text-base">{creator.bio}</p> : null}
                        </div>
                    </div>

                    <section className="relative overflow-hidden rounded-[1.75rem] border border-brand-purple/25 bg-[linear-gradient(110deg,rgba(178,140,255,0.18),rgba(255,255,255,0.035)_52%,rgba(255,111,207,0.1))] px-5 py-5 sm:px-6" aria-label="Current creator release">
                        <div aria-hidden="true" className="absolute right-8 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full border border-brand-pink/25 bg-brand-pink/10 blur-[1px]" />
                        <div className="relative max-w-2xl">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-pink">Now in rotation</p>
                            <p className="mt-2 text-2xl font-black tracking-[-0.035em] text-white">Start with the release below.</p>
                            <p className="mt-2 text-sm leading-6 text-zinc-200">{releaseLine}</p>
                        </div>
                    </section>

                    <div aria-label={`${creatorName} connection actions`} className="border-t border-white/10 pt-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Keep close to this world</p>
                            {messageHint ? <p className="max-w-md text-xs leading-5 text-zinc-400">{messageHint}</p> : null}
                        </div>
                        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                        <button
                            type="button"
                            onClick={onFollow}
                            disabled={followLoading}
                            aria-busy={followLoading}
                            className={cn(
                                "flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple",
                                following
                                    ? "border border-white/15 bg-white/10 text-white hover:bg-white/15"
                                    : "bg-brand-purple text-white shadow-lg shadow-brand-purple/25 hover:bg-brand-purple/90",
                            )}
                        >
                            {followLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : following ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                            {following ? "Following" : "Follow"}
                        </button>
                        <button
                            type="button"
                            onClick={onMessage}
                            disabled={!canMessageCreator}
                            title={messageHint || (canMessageCreator ? undefined : "Messages are unavailable for this creator")}
                            className={cn(
                                "flex min-h-11 items-center justify-center gap-2 rounded-full border px-4 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple",
                                canMessageCreator
                                    ? "border-white/10 bg-white/[0.07] text-white hover:bg-white/[0.12]"
                                    : "cursor-not-allowed border-white/5 bg-white/[0.04] text-zinc-500",
                            )}
                        >
                            <MessageSquare className="h-4 w-4" /> Message
                        </button>
                        <button
                            type="button"
                            disabled={hasGlobalAlerts || followLoading || subscribeLoading || relationshipLoading}
                            onClick={onToggleAlerts}
                            title={hasGlobalAlerts ? "All drop alerts are already enabled globally" : undefined}
                            className={cn(
                                "flex min-h-11 items-center justify-center gap-2 rounded-full border px-4 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple",
                                hasGlobalAlerts
                                    ? "cursor-not-allowed border-transparent bg-white/5 text-zinc-500 opacity-60"
                                    : notificationsEnabled
                                        ? "border-brand-purple/30 bg-brand-purple/15 text-white"
                                        : "border-white/10 bg-white/[0.07] text-zinc-200 hover:bg-white/[0.12]",
                            )}
                        >
                            <Bell className="h-4 w-4" />
                            {hasGlobalAlerts ? "All alerts" : notificationsEnabled ? "Alerts on" : "Alerts"}
                        </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

export function CreatorProfileTabs({ activeTab, hasExperiences, onSelectTab }: CreatorProfileTabsProps) {
    return (
        <section className="mt-6 border-y border-white/10 py-5" aria-labelledby="creator-world-paths">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p id="creator-world-paths" className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Choose a way in</p>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-300">Begin with the current releases, or move into a closer experience when this creator offers one.</p>
                </div>
                <div aria-label="Creator world paths" className="flex flex-wrap gap-2">
                <button
                    aria-controls="creator-profile-drops-panel"
                    aria-pressed={activeTab === "drops"}
                    type="button"
                    onClick={() => onSelectTab("drops")}
                    className={cn(
                        "min-h-11 rounded-full border px-4 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple",
                        activeTab === "drops" ? "border-brand-purple/50 bg-brand-purple text-white shadow-lg shadow-brand-purple/20" : "border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/[0.09] hover:text-white",
                    )}
                >
                    Explore Drops
                </button>
                {hasExperiences ? (
                    <button
                        aria-controls="creator-profile-experiences-panel"
                        aria-pressed={activeTab === "experiences"}
                        type="button"
                        onClick={() => onSelectTab("experiences")}
                        className={cn(
                            "min-h-11 rounded-full border px-4 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple",
                            activeTab === "experiences" ? "border-brand-purple/50 bg-brand-purple text-white shadow-lg shadow-brand-purple/20" : "border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/[0.09] hover:text-white",
                        )}
                    >
                        Enter experiences
                    </button>
                ) : (
                    <span aria-hidden="true" className="inline-flex min-h-11 items-center rounded-full border border-white/5 px-4 text-sm font-bold text-zinc-600">Experiences later</span>
                )}
                </div>
            </div>
        </section>
    );
}
