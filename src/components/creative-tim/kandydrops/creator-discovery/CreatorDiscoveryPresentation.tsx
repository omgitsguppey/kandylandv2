"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/Button";
import { CompactNumber } from "@/components/ui/CompactNumber";
import { TitleMarquee } from "@/components/ui/TitleMarquee";
import { getImageLoadingPolicy, getImagePolicyDataAttributes } from "@/lib/image-loading-policy";
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
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("") || "C";
}

export function KandyCreatorDiscoverySkeleton({ compact, surface }: { compact: boolean; surface: CreatorDiscoverySurface }) {
  const isHomeSpotlight = surface === "home";
  return (
    <section data-home-section={isHomeSpotlight ? "creator-spotlight" : undefined} data-home-density={isHomeSpotlight ? "compact-mobile-v1" : undefined} className="min-w-0 space-y-5 [content-visibility:auto] [contain-intrinsic-size:330px]" aria-label="Loading creators" aria-busy="true">
      <div className="h-6 w-40 animate-pulse rounded bg-muted motion-reduce:animate-none" />
      <div className="flex flex-wrap gap-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className={cn("flex min-w-0 flex-col items-center gap-3", compact ? "w-40" : "w-48")}>
            <div className={cn("animate-pulse rounded-full bg-muted motion-reduce:animate-none", compact ? "size-18" : isHomeSpotlight ? "size-28" : "size-20")} />
            <div className="h-4 w-28 animate-pulse rounded bg-muted motion-reduce:animate-none" />
            <div className="h-3 w-20 animate-pulse rounded bg-muted motion-reduce:animate-none" />
            <div className="h-11 w-full animate-pulse rounded-full bg-muted motion-reduce:animate-none" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function KandyCreatorDiscoveryEmpty({ compact, surface, title }: { compact: boolean; surface: CreatorDiscoverySurface; title?: string }) {
  const isHomeSpotlight = surface === "home";
  const emptyTitle = surface === "dashboard"
    ? "Creator spotlight opens as creators go live"
    : surface === "drops" ? "No creator spotlights are active here yet"
      : surface === "home" ? "Creator spotlight" : "No creator experiences are ready here yet";
  const emptySupport = surface === "dashboard"
    ? "As approved creator profiles come online, the dashboard will pin the ones you follow first and then recommend the rest."
    : surface === "drops" ? "As creator drops go live, this rail will surface the creators behind them."
      : surface === "home" ? "Discover top creators and their exclusive experiences right here."
        : "Creator experiences only appear here once the underlying profile and fan actions are ready.";
  return (
    <section data-home-section={isHomeSpotlight ? "creator-spotlight" : undefined} data-home-density={isHomeSpotlight ? "compact-mobile-v1" : undefined} className={cn("min-w-0 space-y-3 py-4 [content-visibility:auto] [contain-intrinsic-size:330px]", compact && "max-w-full")}>
      <h2 className="text-xl font-semibold tracking-tight text-foreground">{title || emptyTitle}</h2>
      <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">{emptySupport}</p>
    </section>
  );
}

export function KandyCreatorDiscoveryView({ compact, surface, support, title, children }: { compact: boolean; surface: CreatorDiscoverySurface; support: string | null; title?: string; children: ReactNode }) {
  const isHomeSpotlight = surface === "home";
  const spotlightTitle = title || "Creator spotlight";
  return (
    <section data-home-section={isHomeSpotlight ? "creator-spotlight" : undefined} data-home-density={isHomeSpotlight ? "compact-mobile-v1" : undefined} className={cn("min-w-0 space-y-5 [content-visibility:auto]", isHomeSpotlight ? "[contain-intrinsic-size:450px]" : "[contain-intrinsic-size:350px]")}>
      <header className="min-w-0 space-y-2">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{spotlightTitle}</h2>
        {support ? <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">{support}</p> : null}
      </header>
      <div className="overflow-x-auto pb-2 [scrollbar-width:thin]">
        <div className={cn("flex min-w-max", compact ? "gap-4" : "gap-6")}>{children}</div>
      </div>
    </section>
  );
}

export function KandyCreatorDiscoveryCard({ creator, compact, surface, position, cardRef, profileHref, missingProfileReason, isPending, isSelf, onFollow, onProfileClick }: { creator: CreatorDiscoveryCardData; compact: boolean; surface: CreatorDiscoverySurface; position: number; cardRef: (node: HTMLElement | null) => void; profileHref: string | null; missingProfileReason: string; isPending: boolean; isSelf: boolean; onFollow: () => void; onProfileClick: () => void }) {
  const isHomeSpotlight = surface === "home";
  const avatarPixels = isHomeSpotlight ? 112 : 72;
  const imagePolicy = getImageLoadingPolicy("home_creator_rail");
  const creatorName = creator.username ? "@" + creator.username.replace(/^@+/, "") : creator.displayName;
  const profileContent = (
    <>
      <div data-creator-spotlight-avatar-frame={isHomeSpotlight ? "fixed" : undefined} className={cn("mx-auto flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted", compact ? "size-18" : isHomeSpotlight ? "size-28" : "size-20")}>
        {creator.photoURL ? (
          <Image src={creator.photoURL} alt={creator.username || creator.displayName} width={avatarPixels} height={avatarPixels} loading={imagePolicy.loading} preload={imagePolicy.preload} fetchPriority={imagePolicy.fetchPriority} quality={imagePolicy.quality} sizes={isHomeSpotlight ? avatarPixels + "px" : imagePolicy.sizes} decoding="async" data-creator-spotlight-image={isHomeSpotlight ? "stable-frame" : undefined} className="h-full w-full object-cover" {...getImagePolicyDataAttributes(imagePolicy)} />
        ) : <span className="text-lg font-semibold text-foreground">{initialsFor(creator.username || creator.displayName)}</span>}
      </div>
      <div className="w-full min-w-0 space-y-1 text-center">
        <div className="flex min-w-0 items-center justify-center gap-1.5">
          <TitleMarquee title={creatorName} delaySeed={creator.uid.charCodeAt(0) % 6} className="min-w-0 max-w-full text-sm font-semibold text-foreground" />
          {creator.isVerified ? <CheckCircle2 className="size-4 shrink-0 text-primary" aria-label="Verified creator" /> : null}
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground"><CompactNumber value={Math.max(creator.followerCount ?? 0, 0)} /> followers</p>
      </div>
    </>
  );
  return (
    <article ref={cardRef} data-creator-id={creator.uid} data-creator-rail-position={position} className={cn("flex min-w-0 shrink-0 flex-col gap-3", compact ? "w-40" : "w-48")}>
      {profileHref ? (
        <Link href={profileHref} onClick={onProfileClick} className={cn(buttonVariants({ variant: "ghost" }), "min-w-0 flex-col gap-3 rounded-xl p-0 text-center")} data-creator-profile-route-source="canonical-builder">{profileContent}</Link>
      ) : (
        <div className="flex min-w-0 flex-col gap-3" aria-disabled="true" title={missingProfileReason || "Creator profile unavailable"} data-creator-profile-missing-reason={missingProfileReason || "unknown"}>{profileContent}</div>
      )}
      {isSelf ? null : (
        <Button variant={creator.following ? "ghost" : "brand"} size="sm" onClick={onFollow} disabled={isPending} aria-label={(creator.following ? "Unfollow " : "Follow ") + creatorName} className="w-full min-w-0 whitespace-normal">
          {isPending ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : creator.following ? "Following" : "Follow"}
        </Button>
      )}
    </article>
  );
}
