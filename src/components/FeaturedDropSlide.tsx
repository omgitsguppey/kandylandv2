"use client";

import { useMemo } from "react";
import NextImage from "next/image";
import { Clock, Eye, Image as ImageIcon, Unlock } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/card";
import { MediaPreview } from "@/components/ui/media-card";
import { Badge } from "@/components/ui/badge";
import { useAuthIdentity, useAuthLoading, useUserProfile } from "@/context/AuthContext";
import { DROPS_MOBILE_UI_DENSITY } from "@/hooks/useDropCardImpression";
import { DROP_COUNTDOWN_ONE_DAY_MS, DROP_COUNTDOWN_ONE_HOUR_MS, formatDropCountdown, type DropCountdownUrgency } from "@/lib/drop-countdown";
import { getDropCardVisibilityTelemetryPayload, resolveDropCardVisibilityState, type DropCtaState } from "@/lib/drop-card-visibility";
import { getDropViewCount } from "@/lib/drop-engagement";
import { resolvePublicDropCoverSrc } from "@/lib/drop-media-fallback";
import { hasUnwrappedDrop } from "@/lib/drop-view-access";
import { getImageLoadingPolicy, getImagePolicyDataAttributes } from "@/lib/image-loading-policy";
import { trackEvent } from "@/lib/telemetry";
import { cn } from "@/lib/utils";
import { useNow } from "@/hooks/useNow";
import { Drop } from "@/types/db";

type DropTimingUrgency = DropCountdownUrgency;
type FeaturedCoverAccentName = "cherry" | "watermelon" | "honey" | "lemon" | "peach" | "bubblegum" | "chocolate" | "brand";
type FeaturedSocialProofType = "unwraps" | "views";


export function FeaturedDropSlide({
    drop,
    index,
    isActive,
    user,
    userProfile,
    onSelectDrop,
    trackingSessionId,
}: {
    drop: Drop;
    index: number;
    isActive: boolean;
    user: ReturnType<typeof useAuthIdentity>["user"];
    userProfile: ReturnType<typeof useUserProfile>["userProfile"];
    onSelectDrop: (drop: Drop, sourceComponent?: string) => void;
    trackingSessionId: string;
}) {
    const isUnlocked = hasUnwrappedDrop(userProfile, drop.id);
    const visibilityState = useMemo(
        () =>
            resolveDropCardVisibilityState({
                drop,
                isAuthenticated: Boolean(user),
                isUnlocked,
                gumDropsBalance: userProfile?.gumDropsBalance,
                actorUserId: user?.uid ?? userProfile?.uid ?? null,
                activeCreatorId: userProfile?.role === "creator" ? userProfile.uid : null,
            }),
        [drop, isUnlocked, user, userProfile?.gumDropsBalance, userProfile?.role, userProfile?.uid],
    );
    const ctaLabel = getFeaturedCtaLabel(visibilityState.ctaState, drop.unlockCost, visibilityState.balanceState === "pending");
    const coverAccent = useMemo(() => resolveFeaturedCoverAccent(drop), [drop]);
    const socialProof = useMemo(() => getFeaturedSocialProof(drop), [drop]);
    const imagePolicy = useMemo(
        () => getImageLoadingPolicy("featured_carousel", { mediaIndex: index, isLcpCandidate: index === 0, intrinsicLayout: true }),
        [index],
    );
    const { images, videos } = getMediaCounts(drop);
    const coverSrc = resolvePublicDropCoverSrc(drop.imageUrl);

    const previewDrop = () => {
        if (!isActive) {
            return;
        }
        trackEvent("featured_slide_clicked", {
            drop_id: drop.id,
            drop_category: drop.type,
            position: index + 1,
            featured_rank: index + 1,
            surface: "featured_carousel",
            route: "/drops",
            source_component: "compact_featured_carousel",
            impression_session_id: trackingSessionId,
            ui_density: DROPS_MOBILE_UI_DENSITY,
            featured_cta_accent: coverAccent.accentName,
            featured_social_proof_type: socialProof.type,
            ...getDropCardVisibilityTelemetryPayload(visibilityState),
        });
        onSelectDrop(drop, "compact_featured_carousel");
    };

    return (
        <div className="min-w-0 flex-[0_0_100%]" aria-hidden={!isActive} inert={!isActive} data-featured-drop-affordability={visibilityState.balanceState} data-featured-drop-cta-state={visibilityState.ctaState} data-featured-chip-treatment="opaque-readout">
            <Card className="gap-0 overflow-hidden py-0">
                <div className="grid min-w-0 [grid-template-columns:repeat(auto-fit,minmax(min(100%,20rem),1fr))]">
                    <MediaPreview disabled={!isActive} onClick={previewDrop} aria-label={`Preview ${drop.title}`} tabIndex={isActive ? 0 : -1} className="relative aspect-[4/3] min-h-11 min-w-0 w-full overflow-hidden bg-muted text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
                        <NextImage src={coverSrc} alt={drop.title} fill loading={imagePolicy.loading} preload={imagePolicy.preload} fetchPriority={imagePolicy.fetchPriority} quality={imagePolicy.quality} sizes={imagePolicy.sizes} className={cn("object-cover object-center", visibilityState.shouldBlurCover && "blur-[10px] brightness-[0.72] saturate-[0.86]")} {...getImagePolicyDataAttributes(imagePolicy)} />
                    </MediaPreview>
                    <CardContent className="flex min-w-0 flex-col gap-5 p-6">
                        <h3 className="text-2xl font-semibold leading-snug tracking-tight [overflow-wrap:anywhere]">{drop.title}</h3>
                        <p className="text-base leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">{drop.description}</p>
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="max-w-full shrink whitespace-normal [overflow-wrap:anywhere]">{drop.unlockCost.toLocaleString()} GD</Badge>
                            {images > 0 || videos > 0 ? <span className="inline-flex min-w-0 max-w-full flex-wrap items-center gap-2 text-sm text-muted-foreground [overflow-wrap:anywhere]" aria-label={`${images > 0 ? `${images} ${images === 1 ? "image" : "images"}` : ""}${images > 0 && videos > 0 ? ", " : ""}${videos > 0 ? `${videos} ${videos === 1 ? "video" : "videos"}` : ""}`}>
                                {images > 0 ? <span className="inline-flex min-w-0 max-w-full flex-wrap items-center gap-1 [overflow-wrap:anywhere]"><ImageIcon className="h-4 w-4 shrink-0" aria-hidden="true" />{images} {images === 1 ? "image" : "images"}</span> : null}
                                {videos > 0 ? <span className="inline-flex min-w-0 max-w-full flex-wrap items-center gap-1 [overflow-wrap:anywhere]"><span aria-hidden="true">🎥</span>{videos} {videos === 1 ? "video" : "videos"}</span> : null}
                            </span> : null}
                        </div>
                        <div className="flex min-w-0 flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            <span className="inline-flex min-w-0 max-w-full flex-wrap items-center gap-1.5 [overflow-wrap:anywhere]" data-featured-social-proof-type={socialProof.type}>{socialProof.type === "unwraps" ? <Unlock className="h-4 w-4 shrink-0" aria-hidden="true" /> : <Eye className="h-4 w-4 shrink-0" aria-hidden="true" />}{socialProof.label}</span>
                            <TimerWithProgress validUntil={drop.validUntil} />
                        </div>
                        <Button type="button" disabled={!isActive} variant="brand" className="mt-auto w-full px-2 whitespace-normal [overflow-wrap:anywhere]" tabIndex={isActive ? 0 : -1} onClick={previewDrop} data-featured-cta-accent={coverAccent.accentName} data-featured-cta-cover-aware="true">
                            <span className="min-w-0 max-w-full">{ctaLabel}</span>
                        </Button>
                    </CardContent>
                </div>
            </Card>
        </div>
    );
}

function TimerWithProgress({ validUntil }: { validUntil?: number }) {
    const { label, fullLabel, urgencyState } = useDropTiming(validUntil);
    return <span className={cn("inline-flex min-w-0 max-w-full flex-wrap items-center gap-1.5 text-sm", urgencyState === "critical" ? "text-destructive" : urgencyState === "warm" ? "text-primary" : "text-muted-foreground")} aria-label={fullLabel} title={fullLabel}><Clock className="h-4 w-4 shrink-0" aria-hidden="true" /><span className="whitespace-nowrap tabular-nums">{label}</span></span>;
}

function useDropTiming(validUntil?: number): { label: string; fullLabel: string; urgencyState: DropTimingUrgency } {
    const nowMs = useNow({ intervalMs: 1_000 });

    return useMemo(() => {
        if (!validUntil) {
            return { label: "Always", fullLabel: "Always available", urgencyState: "calm" as const };
        }

        const msLeft = Math.max(0, validUntil - nowMs);

        if (msLeft === 0) {
            return { label: "Expired", fullLabel: "Expired", urgencyState: "critical" as const };
        }

        const countdown = formatDropCountdown(validUntil, nowMs);
        const urgencyState: DropTimingUrgency = msLeft <= 4 * DROP_COUNTDOWN_ONE_HOUR_MS ? "critical" : msLeft <= DROP_COUNTDOWN_ONE_DAY_MS ? "warm" : countdown.urgencyState;

        return { label: countdown.visibleLabel, fullLabel: countdown.fullLabel, urgencyState };
    }, [nowMs, validUntil]);
}

function getFeaturedCtaLabel(ctaState: DropCtaState, unlockCost: number, isBalancePending: boolean) {
    if (ctaState === "view") {
        return "View Content";
    }
    if (ctaState === "create_profile") {
        return "Create account to unwrap";
    }
    if (ctaState === "refill") {
        return isBalancePending ? "Check access" : "Refill to unwrap";
    }
    if (ctaState === "preview") {
        return "Preview cover";
    }
    if (ctaState === "unavailable") {
        return "Unavailable";
    }
    return `Unwrap for ${unlockCost} GD`;
}

interface FeaturedCoverAccent {
    accentName: FeaturedCoverAccentName;
}

function resolveFeaturedCoverAccent(drop: Pick<Drop, "title" | "type" | "tags" | "imageUrl">): FeaturedCoverAccent {
    const searchable = [drop.title, drop.type, drop.imageUrl, ...(drop.tags ?? [])].join(" ").toLowerCase();
    const accentName: FeaturedCoverAccentName =
        /\b(cherry|berry|strawberry|raspberry|rose|red)\b/.test(searchable) ? "cherry"
            : /\b(watermelon|melon|lime|mint)\b/.test(searchable) ? "watermelon"
                : /\b(honey|caramel|gold|golden|butter|toffee)\b/.test(searchable) ? "honey"
                    : /\b(lemon|citrus|yellow)\b/.test(searchable) ? "lemon"
                        : /\b(peach|apricot|orange|mango|tangerine)\b/.test(searchable) ? "peach"
                            : /\b(bubblegum|bubble|candy|pink|fuchsia|cotton)\b/.test(searchable) ? "bubblegum"
                                : /\b(chocolate|cocoa|coffee|espresso|brown|mocha)\b/.test(searchable) ? "chocolate"
                                    : "brand";
    return {
        accentName,
    };
}

function getFeaturedSocialProof(drop: Drop): { label: string; type: FeaturedSocialProofType; count: number } {
    const totalUnwraps = typeof drop.totalUnlocks === "number" && Number.isFinite(drop.totalUnlocks) ? Math.max(0, Math.floor(drop.totalUnlocks)) : 0;

    if (totalUnwraps > 10) {
        return {
            label: `${totalUnwraps.toLocaleString()} unwrapped`,
            type: "unwraps",
            count: totalUnwraps,
        };
    }

    const views = getDropViewCount(drop);
    return {
        label: `${views.toLocaleString()} views`,
        type: "views",
        count: views,
    };
}

function getMediaCounts(drop: Drop) {
    if (drop.mediaCounts) {
        return {
            images: drop.mediaCounts.images,
            videos: drop.mediaCounts.videos,
        };
    }

    const urls = drop.contentUrls || (drop.contentUrl ? [drop.contentUrl] : []);
    return urls.reduce(
        (counts, url) => {
            const lowerUrl = url.toLowerCase();
            if (lowerUrl.match(/\.(mp4|webm|ogg|mov)$/)) {
                counts.videos += 1;
            } else {
                counts.images += 1;
            }
            return counts;
        },
        { images: 0, videos: 0 },
    );
}

