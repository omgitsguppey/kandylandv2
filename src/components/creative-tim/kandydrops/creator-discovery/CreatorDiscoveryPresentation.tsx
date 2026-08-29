"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Loader2, Sparkles, Users } from "lucide-react";

import { CompactNumber } from "@/components/ui/CompactNumber";
import { TitleMarquee } from "@/components/ui/TitleMarquee";
import { Card } from "@/components/creative-tim/ui/card";
import {
  getImageLoadingPolicy,
  getImagePolicyDataAttributes,
} from "@/lib/image-loading-policy";
import { cn } from "@/lib/utils";

export type CreatorDiscoverySurface = "dashboard" | "drops" | "experiences" | "home";

type CreatorDiscoveryCardData = {
  uid: string;
  displayName: string;
  username: string;
  photoURL: string | null;
  isVerified?: boolean;
  followerCount?: number;
  following?: boolean;
};

function initialsFor(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "C";
}

export function KandyCreatorDiscoverySkeleton({
  compact,
  surface,
}: {
  compact: boolean;
  surface: CreatorDiscoverySurface;
}) {
  const isHomeSpotlight = surface === "home";

  return (
    <Card
      data-home-section={isHomeSpotlight ? "creator-spotlight" : undefined}
      data-home-density={isHomeSpotlight ? "compact-mobile-v1" : undefined}
      className={cn(
        "!gap-0 !overflow-hidden !rounded-[2rem] !border-white/10 !p-0 [content-visibility:auto]",
        isHomeSpotlight
          ? "!bg-[radial-gradient(circle_at_8%_0%,rgba(255,111,207,0.2),transparent_26rem),linear-gradient(145deg,rgba(22,12,39,0.98),rgba(5,4,12,0.99))] [contain-intrinsic-size:410px]"
          : "!bg-[linear-gradient(145deg,rgba(255,255,255,0.075),rgba(255,255,255,0.02))] [contain-intrinsic-size:330px]",
      )}
    >
      <div className="border-b border-white/10 px-5 py-5 sm:px-6">
        <div className="h-3 w-28 animate-pulse rounded-full bg-white/10 motion-reduce:animate-none" />
        <div className="mt-4 h-7 w-56 animate-pulse rounded-full bg-white/10 motion-reduce:animate-none" />
      </div>
      <div className="overflow-x-hidden px-5 py-5 sm:px-6">
        <div className="flex min-w-max gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className={cn(
                "animate-pulse rounded-[1.6rem] border border-white/10 bg-white/[0.045] p-4 motion-reduce:animate-none",
                compact ? "w-[13.25rem]" : isHomeSpotlight ? "w-[17rem]" : "w-[15rem]",
              )}
            >
              <div className="h-24 rounded-[1.25rem] bg-white/10" />
              <div className="mt-4 h-4 w-28 rounded bg-white/10" />
              <div className="mt-2 h-3 w-20 rounded bg-white/10" />
              <div className="mt-5 h-11 rounded-2xl bg-white/10" />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

export function KandyCreatorDiscoveryEmpty({
  compact,
  surface,
  title,
}: {
  compact: boolean;
  surface: CreatorDiscoverySurface;
  title?: string;
}) {
  const isHomeSpotlight = surface === "home";
  const emptyTitle = surface === "dashboard"
    ? "Creator spotlight opens as creators go live"
    : surface === "drops"
      ? "No creator spotlights are active here yet"
      : surface === "home"
        ? "Creator spotlight"
        : "No creator experiences are ready here yet";
  const emptySupport = surface === "dashboard"
    ? "As approved creator profiles come online, the dashboard will pin the ones you follow first and then recommend the rest."
    : surface === "drops"
      ? "As creator drops go live, this rail will surface the creators behind them without mixing admin tooling into fan discovery."
      : surface === "home"
        ? "Discover top creators and their exclusive experiences right here."
        : "Creator experiences only appear here once the underlying profile and fan actions are ready.";

  return (
    <Card
      data-home-section={isHomeSpotlight ? "creator-spotlight" : undefined}
      data-home-density={isHomeSpotlight ? "compact-mobile-v1" : undefined}
      className={cn(
        "!gap-0 !overflow-hidden !rounded-[2rem] !border-white/10 !p-0 text-center [content-visibility:auto]",
        isHomeSpotlight
          ? "!bg-[radial-gradient(circle_at_8%_0%,rgba(255,111,207,0.2),transparent_26rem),linear-gradient(145deg,rgba(22,12,39,0.98),rgba(5,4,12,0.99))] [contain-intrinsic-size:410px]"
          : "!bg-[linear-gradient(145deg,rgba(255,255,255,0.075),rgba(255,255,255,0.02))] [contain-intrinsic-size:330px]",
        compact ? "max-w-full" : "",
      )}
    >
      <div className="px-5 pb-6 pt-6 sm:px-7 sm:pb-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[1.3rem] border border-brand-purple/25 bg-brand-purple/15 text-brand-purple">
          <Users className="h-6 w-6" aria-hidden="true" />
        </div>
        <p className="mt-5 text-[10px] font-black uppercase tracking-[0.2em] text-brand-pink">
          {title || "Creator spotlight"}
        </p>
        <h2 className="mt-2 text-xl font-black tracking-tight text-white">{emptyTitle}</h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-white/58">{emptySupport}</p>
      </div>
    </Card>
  );
}

export function KandyCreatorDiscoveryView({
  compact,
  surface,
  support,
  title,
  children,
}: {
  compact: boolean;
  surface: CreatorDiscoverySurface;
  support: string | null;
  title?: string;
  children: ReactNode;
}) {
  const isHomeSpotlight = surface === "home";
  const spotlightTitle = title || (isHomeSpotlight ? "CREATOR SPOTLIGHT" : "Creator spotlight");

  return (
    <Card
      data-home-section={isHomeSpotlight ? "creator-spotlight" : undefined}
      data-home-density={isHomeSpotlight ? "compact-mobile-v1" : undefined}
      className={cn(
        "!gap-0 !overflow-hidden ! !border-white/10 !p-0 [content-visibility:auto]",
        isHomeSpotlight
          ? "!bg-[#0b0b0d]  [contain-intrinsic-size:450px]"
          : "!bg-[#0b0b0d]  [contain-intrinsic-size:350px]",
      )}
    >
      <div className="relative border-b border-white/10 px-5 py-5 sm:px-6">
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-16 h-36 w-36  bg-brand-purple/20 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-brand-pink">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Creator discovery
          </div>
          <h2 className={cn("mt-2 font-black tracking-[-0.04em] text-white", isHomeSpotlight ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl")}>
            {spotlightTitle}
          </h2>
          {support ? <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60 sm:text-base">{support}</p> : null}
        </div>
      </div>

      <div className="overflow-x-auto px-5 py-5 [scrollbar-width:thin] sm:px-6">
        <div className={cn("flex min-w-max", compact ? "gap-3 pr-2" : isHomeSpotlight ? "gap-5 pr-5" : "gap-4 pr-4")}>
          {children}
        </div>
      </div>
    </Card>
  );
}

export function KandyCreatorDiscoveryCard({
  creator,
  compact,
  surface,
  position,
  cardRef,
  profileHref,
  missingProfileReason,
  isPending,
  isSelf,
  onFollow,
  onProfileClick,
}: {
  creator: CreatorDiscoveryCardData;
  compact: boolean;
  surface: CreatorDiscoverySurface;
  position: number;
  cardRef: (node: HTMLElement | null) => void;
  profileHref: string | null;
  missingProfileReason: string;
  isPending: boolean;
  isSelf: boolean;
  onFollow: () => void;
  onProfileClick: () => void;
}) {
  const isHomeSpotlight = surface === "home";
  const avatarPixels = isHomeSpotlight ? 112 : 72;
  const imagePolicy = getImageLoadingPolicy("home_creator_rail");
  const creatorName = creator.username
    ? "@" + creator.username.replace(/^@+/, "")
    : creator.displayName;
  const profileContent = (
    <>
      <div className={cn(
        "relative overflow-hidden rounded-[1.3rem] border border-white/12 bg-[linear-gradient(135deg,rgba(178,140,255,0.24),rgba(255,111,207,0.14),rgba(7,5,12,0.8))]",
        compact ? "h-[4.75rem]" : isHomeSpotlight ? "h-32" : "h-28",
      )}>
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/65 to-transparent" />
        <div
          data-creator-spotlight-avatar-frame={isHomeSpotlight ? "fixed" : undefined}
          className={cn(
            "absolute bottom-3 left-3 flex items-center justify-center overflow-hidden rounded-2xl border-[3px] border-[#0d0915] bg-zinc-900 shadow-[0_10px_24px_rgba(0,0,0,0.35)]",
            compact ? "h-12 w-12" : isHomeSpotlight ? "h-20 w-20" : "h-[4.25rem] w-[4.25rem]",
          )}
        >
          {creator.photoURL ? (
            <Image
              src={creator.photoURL}
              alt={creator.username || creator.displayName}
              width={avatarPixels}
              height={avatarPixels}
              loading={imagePolicy.loading}
              preload={imagePolicy.preload}
              fetchPriority={imagePolicy.fetchPriority}
              quality={imagePolicy.quality}
              sizes={isHomeSpotlight ? avatarPixels + "px" : imagePolicy.sizes}
              decoding="async"
              data-creator-spotlight-image={isHomeSpotlight ? "stable-frame" : undefined}
              className="h-full w-full object-cover"
              {...getImagePolicyDataAttributes(imagePolicy)}
            />
          ) : (
            <span className="text-sm font-black text-white">{initialsFor(creator.username || creator.displayName)}</span>
          )}
        </div>
        <span className="absolute bottom-3 right-3 border-b border-white/20 bg-transparent px-0 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/70">
          Creator
        </span>
      </div>

      <div className="px-1 pt-4 text-left">
        <div className="flex max-w-full items-center gap-1.5">
          <TitleMarquee
            title={creatorName}
            delaySeed={creator.uid.charCodeAt(0) % 6}
            className={cn("max-w-full font-black tracking-tight text-white", compact ? "text-sm" : "text-base")}
          />
          {creator.isVerified ? <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-purple" aria-label="Verified creator" /> : null}
        </div>
        <p className="mt-1 text-xs font-semibold text-white/52">
          <CompactNumber value={Math.max(creator.followerCount ?? 0, 0)} /> followers
        </p>
      </div>
    </>
  );

  return (
    <article
      ref={cardRef}
      data-creator-id={creator.uid}
      data-creator-rail-position={position}
      className={cn(
        "group flex shrink-0 flex-col overflow-hidden rounded-[1.55rem] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.085),rgba(255,255,255,0.025)_48%,rgba(178,140,255,0.08))] p-3 shadow-[0_14px_34px_rgba(0,0,0,0.28)] transition duration-300 hover:-translate-y-1 hover:border-brand-purple/35 motion-reduce:transform-none",
        compact ? "w-[13.25rem]" : isHomeSpotlight ? "w-[17rem]" : "w-[15rem]",
      )}
    >
      {profileHref ? (
        <Link
          href={profileHref}
          onClick={onProfileClick}
          className="rounded-[1.2rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2 focus-visible:ring-offset-[#10091e]"
          data-creator-profile-route-source="canonical-builder"
        >
          {profileContent}
        </Link>
      ) : (
        <div
          className="rounded-[1.2rem]"
          aria-disabled="true"
          title={missingProfileReason || "Creator profile unavailable"}
          data-creator-profile-missing-reason={missingProfileReason || "unknown"}
        >
          {profileContent}
        </div>
      )}

      {isSelf ? null : (
        <button
          type="button"
          onClick={onFollow}
          disabled={isPending}
          aria-label={(creator.following ? "Unfollow " : "Follow ") + creatorName}
          className={cn(
            "mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-2xl border px-4 text-sm font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2 focus-visible:ring-offset-[#10091e] disabled:cursor-not-allowed disabled:opacity-60",
            creator.following
              ? "border-brand-purple/45 bg-black/30 text-purple-100 hover:bg-brand-purple/12"
              : "border-brand-purple/35 bg-brand-purple/14 text-white",
          )}
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : creator.following ? "Following" : "Follow"}
        </button>
      )}
    </article>
  );
}
