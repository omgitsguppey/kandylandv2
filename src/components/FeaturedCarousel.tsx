"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import NextImage from "next/image";
import { Clock, Eye, Image as ImageIcon, Unlock } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthIdentity, useAuthLoading, useUserProfile } from "@/context/AuthContext";
import { DROPS_MOBILE_UI_DENSITY } from "@/hooks/useDropCardImpression";
import { DROP_COUNTDOWN_ONE_DAY_MS, DROP_COUNTDOWN_ONE_HOUR_MS, formatDropCountdown, type DropCountdownUrgency } from "@/lib/drop-countdown";
import { getDropCardVisibilityTelemetryPayload, resolveDropCardVisibilityState, type DropCtaState } from "@/lib/drop-card-visibility";
import { getDropViewCount } from "@/lib/drop-engagement";
import { resolvePublicDropCoverSrc } from "@/lib/drop-media-fallback";
import { resolveDropLifecycleStatus } from "@/lib/drop-status";
import { hasUnwrappedDrop } from "@/lib/drop-view-access";
import {
    buildDiscoveryImpressionKey,
    createDiscoveryTrackingSessionId,
    DISCOVERY_IMPRESSION_VISIBILITY_THRESHOLD,
} from "@/lib/discovery-telemetry";
import { getImageLoadingPolicy, getImagePolicyDataAttributes } from "@/lib/image-loading-policy";
import { trackEvent } from "@/lib/telemetry";
import { cn } from "@/lib/utils";
import { useNow } from "@/hooks/useNow";
import { Drop } from "@/types/db";

interface FeaturedCarouselProps {
    drops: Drop[];
    onSelectDrop: (drop: Drop, sourceComponent?: string) => void;
}

type DropTimingUrgency = DropCountdownUrgency;
type FeaturedCoverAccentName = "cherry" | "watermelon" | "honey" | "lemon" | "peach" | "bubblegum" | "chocolate" | "brand";
type FeaturedSocialProofType = "unwraps" | "views";


export function FeaturedCarousel({ drops, onSelectDrop }: FeaturedCarouselProps) {
    const [activeIndex, setActiveIndex] = useState(0);
    const { user } = useAuthIdentity();
    const { userProfile } = useUserProfile();
    const { loading: authLoading } = useAuthLoading();
    const profileReady = !authLoading && Boolean(user?.uid && userProfile?.uid === user.uid);
    const activeProfile = profileReady ? userProfile : null;
    const prefersReducedMotion = usePrefersReducedMotion();
    const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, watchDrag: true });
    const carouselViewportRef = useRef<HTMLDivElement | null>(null);
    const [featuredTrackingSessionId] = useState(() => createDiscoveryTrackingSessionId("featured"));
    const [isCarouselVisible, setIsCarouselVisible] = useState(false);

    const featuredDrops = useMemo(
        () =>
            drops
                .filter((drop) => resolveDropLifecycleStatus(drop, { audience: "public" }).publicVisible)
                .slice(0, 5),
        [drops],
    );
    const setCarouselViewportRef = useCallback((node: HTMLDivElement | null) => {
        carouselViewportRef.current = node;
        emblaRef(node);
    }, [emblaRef]);

    const onSelect = useCallback(() => {
        if (!emblaApi) {
            return;
        }
        setActiveIndex(emblaApi.selectedScrollSnap());
    }, [emblaApi]);

    useEffect(() => {
        if (!emblaApi) {
            return;
        }

        const syncId = window.setTimeout(onSelect, 0);
        emblaApi.on("select", onSelect);
        emblaApi.on("reInit", onSelect);
        return () => {
            window.clearTimeout(syncId);
            emblaApi.off("select", onSelect);
            emblaApi.off("reInit", onSelect);
        };
    }, [emblaApi, onSelect]);

    useEffect(() => {
        const syncId = window.setTimeout(() => {
            if (featuredDrops.length === 0) {
                setActiveIndex(0);
                return;
            }

            setActiveIndex((prev) => {
                const next = Math.min(prev, featuredDrops.length - 1);
                if (emblaApi && next !== prev) {
                    emblaApi.scrollTo(next, true);
                }
                return next;
            });
        }, 0);

        return () => window.clearTimeout(syncId);
    }, [emblaApi, featuredDrops.length]);

    useEffect(() => {
        const node = carouselViewportRef.current;
        if (!node || typeof IntersectionObserver === "undefined") {
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            const entry = entries[0];
            setIsCarouselVisible(Boolean(entry?.isIntersecting && entry.intersectionRatio >= DISCOVERY_IMPRESSION_VISIBILITY_THRESHOLD));
        }, { threshold: [DISCOVERY_IMPRESSION_VISIBILITY_THRESHOLD] });

        observer.observe(node);
        return () => observer.disconnect();
    }, []);

    const featuredDropViewedKeysRef = useRef(new Set<string>());

    useEffect(() => {
        if (!isCarouselVisible) {
            return;
        }

        const activeFeaturedDrop = featuredDrops[safeIndex(activeIndex, featuredDrops.length)];
        if (!activeFeaturedDrop) {
            return;
        }

        const position = safeIndex(activeIndex, featuredDrops.length) + 1;
        const viewedKey = buildDiscoveryImpressionKey({
            sessionId: featuredTrackingSessionId,
            entityId: activeFeaturedDrop.id,
            surface: "featured_carousel",
        });
        if (featuredDropViewedKeysRef.current.has(viewedKey)) {
            return;
        }

        featuredDropViewedKeysRef.current.add(viewedKey);
        trackEvent("featured_slide_viewed", {
            drop_id: activeFeaturedDrop.id,
            creator_id: activeFeaturedDrop.creatorId || "",
            drop_category: activeFeaturedDrop.type,
            position,
            featured_rank: position,
            source_component: "compact_featured_carousel",
            surface: "featured_carousel",
            route: "/drops",
            entity_type: "drop",
            entity_id: activeFeaturedDrop.id,
            impression_session_id: featuredTrackingSessionId,
            viewport_threshold: DISCOVERY_IMPRESSION_VISIBILITY_THRESHOLD,
            ui_density: DROPS_MOBILE_UI_DENSITY,
        });
    }, [activeIndex, featuredDrops, featuredTrackingSessionId, isCarouselVisible]);

    if (featuredDrops.length === 0) {
        return null;
    }

    const safeActiveIndex = Math.min(activeIndex, featuredDrops.length - 1);

    return (
        <section className="min-w-0 w-full" data-featured-drops-density="creative-tim-editorial">
            <div className="mx-auto w-full max-w-5xl overflow-hidden" ref={setCarouselViewportRef}>
                <div className="flex min-w-0 items-stretch">
                    {featuredDrops.map((drop, index) => <FeaturedDropSlide key={drop.id} drop={drop} index={index} isActive={index === safeActiveIndex} user={user} userProfile={activeProfile} onSelectDrop={onSelectDrop} trackingSessionId={featuredTrackingSessionId} />)}
                </div>
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-2" aria-label="Featured Drop navigation">
                {featuredDrops.map((drop, index) => <Button key={drop.id} type="button" variant={index === safeActiveIndex ? "brand" : "ghost"} size="icon" aria-label={`Go to featured Drop ${index + 1}`} aria-current={index === safeActiveIndex} onClick={() => emblaApi?.scrollTo(index, prefersReducedMotion)}><span aria-hidden="true">{index + 1}</span></Button>)}
            </div>
        </section>
    );
}

function safeIndex(index: number, total: number) {
    if (total <= 0) {
        return 0;
    }

    return Math.min(Math.max(index, 0), total - 1);
}

function FeaturedDropSlide({
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
                    <button type="button" disabled={!isActive} onClick={previewDrop} aria-label={`Preview ${drop.title}`} tabIndex={isActive ? 0 : -1} className="relative aspect-[4/3] min-h-11 min-w-0 w-full overflow-hidden bg-muted text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
                        <NextImage src={coverSrc} alt={drop.title} fill loading={imagePolicy.loading} preload={imagePolicy.preload} fetchPriority={imagePolicy.fetchPriority} quality={imagePolicy.quality} sizes={imagePolicy.sizes} className={cn("object-cover object-center", visibilityState.shouldBlurCover && "blur-[10px] brightness-[0.72] saturate-[0.86]")} {...getImagePolicyDataAttributes(imagePolicy)} />
                    </button>
                    <CardContent className="flex min-w-0 flex-col gap-4 px-2 py-4">
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

function usePrefersReducedMotion() {
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
            return;
        }

        const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
        const update = () => setPrefersReducedMotion(mediaQuery.matches);
        update();
        mediaQuery.addEventListener("change", update);
        return () => mediaQuery.removeEventListener("change", update);
    }, []);

    return prefersReducedMotion;
}
