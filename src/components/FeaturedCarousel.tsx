"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import NextImage from "next/image";
import { ArrowUpRight, Clock, Eye, Image as ImageIcon, Lock, Sparkles, Unlock } from "lucide-react";

import { TitleMarquee } from "@/components/ui/TitleMarquee";
import { useAuthIdentity, useUserProfile } from "@/context/AuthContext";
import { DROPS_MOBILE_UI_DENSITY } from "@/hooks/useDropCardImpression";
import { DROP_COUNTDOWN_ONE_DAY_MS, DROP_COUNTDOWN_ONE_HOUR_MS, formatDropCountdown, type DropCountdownUrgency } from "@/lib/drop-countdown";
import { getDropCardVisibilityTelemetryPayload, resolveDropCardVisibilityState, type DropCtaState } from "@/lib/drop-card-visibility";
import { getDropViewCount } from "@/lib/drop-engagement";
import { resolvePublicDropCoverSrc } from "@/lib/drop-media-fallback";
import { getSupportedDropAspectRatio } from "@/lib/drop-presentation";
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

const AUTO_ADVANCE_MS = 5_000;
type DropTimingUrgency = DropCountdownUrgency;
type FeaturedCoverAccentName = "cherry" | "watermelon" | "honey" | "lemon" | "peach" | "bubblegum" | "chocolate" | "brand";
type FeaturedSocialProofType = "unwraps" | "views";

const FEATURED_CHIP_BASE_CLASSNAME = "border border-white/16 bg-black/64 text-white";
const FEATURED_COVER_ACCENTS: Record<FeaturedCoverAccentName, { ctaGradientClass: string; chipGlassClass: string }> = {
    cherry: {
        ctaGradientClass: "border-brand-purple/50 bg-brand-purple/18",
        chipGlassClass: "border-white/16 bg-black/64",
    },
    watermelon: {
        ctaGradientClass: "border-brand-purple/50 bg-brand-purple/18",
        chipGlassClass: "border-white/16 bg-black/64",
    },
    honey: {
        ctaGradientClass: "border-brand-purple/50 bg-brand-purple/18",
        chipGlassClass: "border-white/16 bg-black/64",
    },
    lemon: {
        ctaGradientClass: "border-brand-purple/50 bg-brand-purple/18",
        chipGlassClass: "border-white/16 bg-black/64",
    },
    peach: {
        ctaGradientClass: "border-brand-purple/50 bg-brand-purple/18",
        chipGlassClass: "border-white/16 bg-black/64",
    },
    bubblegum: {
        ctaGradientClass: "border-brand-purple/50 bg-brand-purple/18",
        chipGlassClass: "border-white/16 bg-black/64",
    },
    chocolate: {
        ctaGradientClass: "border-brand-purple/50 bg-brand-purple/18",
        chipGlassClass: "border-white/16 bg-black/64",
    },
    brand: {
        ctaGradientClass: "border-brand-purple/50 bg-brand-purple/18",
        chipGlassClass: "border-white/16 bg-black/64",
    },
};

export function FeaturedCarousel({ drops, onSelectDrop }: FeaturedCarouselProps) {
    const [activeIndex, setActiveIndex] = useState(0);
    const { user } = useAuthIdentity();
    const { userProfile } = useUserProfile();
    const intervalRef = useRef<number | null>(null);
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

    const stopAutoAdvance = useCallback(() => {
        if (intervalRef.current !== null) {
            window.clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    const startAutoAdvance = useCallback(() => {
        stopAutoAdvance();
        if (!emblaApi || featuredDrops.length <= 1 || prefersReducedMotion) {
            return;
        }

        intervalRef.current = window.setInterval(() => {
            emblaApi.scrollNext();
        }, AUTO_ADVANCE_MS);
    }, [emblaApi, featuredDrops.length, prefersReducedMotion, stopAutoAdvance]);

    useEffect(() => {
        startAutoAdvance();
        return stopAutoAdvance;
    }, [startAutoAdvance, stopAutoAdvance]);

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
    const activeDrop = featuredDrops[safeActiveIndex] || featuredDrops[0];
    const activeAspectRatio = getSupportedDropAspectRatio(activeDrop);
    const aspectStyle = {
        "--featured-drop-ratio": activeAspectRatio.replace(":", " / "),
    } as CSSProperties;

    return (
        <section className="w-full" data-featured-drops-density="creative-tim-editorial">
            <div className="min-w-0">
                <div className="min-w-0">
                    <div
                className={cn(
                    "group relative mx-auto block w-full overflow-hidden rounded-[1.6rem] border border-white/12 bg-black/30 shadow-[0_26px_80px_rgba(0,0,0,0.34)] md:rounded-[2rem]",
                    "[aspect-ratio:16/10] sm:[aspect-ratio:var(--featured-drop-ratio)]",
                    activeAspectRatio === "16:9" && "max-w-[760px]",
                    activeAspectRatio === "1:1" && "max-w-[590px]",
                    activeAspectRatio === "9:16" && "max-w-[390px]",
                )}
                style={aspectStyle}
                ref={setCarouselViewportRef}
            >
                <div className="flex h-full w-full">
                    {featuredDrops.map((drop, index) => (
                        <FeaturedDropSlide
                            key={drop.id}
                            drop={drop}
                            index={index}
                            isActive={index === safeActiveIndex}
                            user={user}
                            userProfile={userProfile}
                            onSelectDrop={onSelectDrop}
                            trackingSessionId={featuredTrackingSessionId}
                        />
                    ))}
                </div>
                    </div>

                    <div className="mt-2 flex justify-center gap-1.5 md:mt-3">
                {featuredDrops.map((drop, index) => (
                    <button
                        key={drop.id}
                        type="button"
                        onClick={() => {
                            emblaApi?.scrollTo(index);
                            startAutoAdvance();
                        }}
                        className={cn(
                            "flex min-h-11 min-w-11 items-center justify-center rounded-full border text-xs font-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2 focus-visible:ring-offset-black",
                            index === safeActiveIndex
                                ? "border-brand-purple/55 bg-brand-purple/20 text-white"
                                : "border-white/10 bg-black/25 text-white/55 hover:border-white/25 hover:text-white",
                        )}
                        aria-label={`Go to featured Drop ${index + 1}`}
                        aria-current={index === safeActiveIndex}
                    >
                        <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                    </button>
                ))}
                    </div>
                </div>
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
    const ctaLabel = getFeaturedCtaLabel(visibilityState.ctaState, drop.unlockCost);
    const coverAccent = useMemo(() => resolveFeaturedCoverAccent(drop), [drop]);
    const socialProof = useMemo(() => getFeaturedSocialProof(drop), [drop]);
    const imagePolicy = useMemo(
        () => getImageLoadingPolicy("featured_carousel", { mediaIndex: index, isLcpCandidate: index === 0 }),
        [index],
    );
    const { images, videos } = getMediaCounts(drop);
    const coverSrc = resolvePublicDropCoverSrc(drop.imageUrl);

    return (
        <div
            className="relative h-full min-w-0 flex-[0_0_100%] transition-opacity duration-300"
            data-featured-drop-affordability={visibilityState.balanceState}
            data-featured-drop-cta-state={visibilityState.ctaState}
            data-featured-chip-treatment="cover-aware-glass"
        >
            <button
                onClick={() => {
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
                }}
                type="button"
                className="absolute inset-0 block h-full w-full text-left"
                tabIndex={isActive ? 0 : -1}
            >
                <div className="absolute inset-0 z-0 bg-brand-purple/10" />
                <NextImage
                    src={coverSrc}
                    alt={drop.title}
                    fill
                    loading={imagePolicy.loading}
                    preload={imagePolicy.preload}
                    fetchPriority={imagePolicy.fetchPriority}
                    quality={imagePolicy.quality}
                    className={cn("bg-black object-cover object-center transition-all duration-500", visibilityState.shouldBlurCover && "blur-[10px] brightness-[0.72] saturate-[0.86]")}
                    sizes={imagePolicy.sizes}
                    {...getImagePolicyDataAttributes(imagePolicy)}
                />
                {visibilityState.shouldBlurCover ? <div className="absolute inset-0 bg-black/20" aria-hidden="true" /> : null}
                <div className="absolute inset-0 bg-black/45" />

                <div className="absolute left-3 top-3 flex flex-wrap gap-1.5 md:left-5 md:top-5 md:gap-2">
                    <span className={cn("border-b px-0 py-1 text-[9px] font-black uppercase tracking-[0.16em] md:text-[10px]", FEATURED_CHIP_BASE_CLASSNAME, coverAccent.chipGlassClass)}>
                        Live release
                    </span>

                    {images > 0 || videos > 0 ? (
                        <div
                            className={cn("flex items-center gap-1.5 border-b px-0 py-1 text-[9px] font-bold md:text-[10px]", FEATURED_CHIP_BASE_CLASSNAME, coverAccent.chipGlassClass)}
                            aria-label={`${images > 0 ? `${images} ${images === 1 ? "image" : "images"}` : ""}${images > 0 && videos > 0 ? ", " : ""}${videos > 0 ? `${videos} ${videos === 1 ? "video" : "videos"}` : ""}`}
                        >
                            {images > 0 ? (
                                <div className="flex items-center gap-0.5">
                                    <ImageIcon aria-hidden="true" className="h-3 w-3 text-gray-300" />
                                    <span>{images}</span>
                                </div>
                            ) : null}
                            {videos > 0 ? (
                                <div className="flex items-center gap-0.5">
                                    <span aria-hidden="true" className="text-[11px] leading-none md:text-xs">🎥</span>
                                    <span>{videos}</span>
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                </div>

                <div className="absolute right-3 top-3 z-20 md:right-5 md:top-5">
                    <TimerWithProgress validUntil={drop.validUntil} coverAccent={coverAccent} />
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
                    <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(12rem,0.45fr)] md:items-end">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/55">
                                <span>Drop {String(index + 1).padStart(2, "0")}</span>
                                <span className="h-px w-8 bg-brand-purple/70" aria-hidden="true" />
                                <span>Limited</span>
                            </div>
                            <div className="w-full max-w-full overflow-hidden">
                                <TitleMarquee
                                    title={drop.title}
                                    delaySeed={drop.id.charCodeAt(0) % 6}
                                    className="text-2xl font-black leading-[0.98] tracking-[-0.04em] text-white md:text-4xl"
                                />
                            </div>
                            <p className="line-clamp-2 max-w-xl text-xs leading-relaxed text-gray-200 md:text-sm">{drop.description}</p>
                            <div
                                className="flex items-center gap-1.5 pt-1 text-[11px] font-semibold text-white/80 md:text-xs"
                                data-featured-social-proof-type={socialProof.type}
                            >
                                {socialProof.type === "unwraps" ? (
                                    <Unlock className="h-3.5 w-3.5 text-brand-purple" />
                                ) : (
                                    <Eye className="h-3.5 w-3.5 text-brand-purple" />
                                )}
                                <span>{socialProof.label}</span>
                            </div>
                        </div>

                        <div className="flex flex-col items-start gap-3 md:items-stretch">
                            <span className="text-xs font-bold text-white/65">{drop.unlockCost.toLocaleString()} GD</span>
                            <div
                                className={cn(
                                    "flex min-h-11 w-full items-center justify-center gap-2 rounded-[1rem] border px-4 py-2 text-xs font-black text-white transition-transform active:scale-[0.98] md:text-sm",
                                    "drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]",
                                    coverAccent.ctaGradientClass,
                                )}
                                data-featured-cta-accent={coverAccent.accentName}
                                data-featured-cta-cover-aware="true"
                            >
                                {visibilityState.ctaState === "view" ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                                {ctaLabel}
                                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                            </div>
                        </div>
                    </div>
                </div>
            </button>
        </div>
    );
}

function TimerWithProgress({ validUntil, coverAccent }: { validUntil?: number; coverAccent: FeaturedCoverAccent }) {
    const { label, fullLabel, urgencyState } = useDropTiming(validUntil);

    return (
        <div className="flex w-auto max-w-[92px] justify-end md:max-w-[118px]">
            <div
                className={cn(
                    "inline-flex min-w-0 items-center gap-1 rounded-[0.75rem] px-2 py-1 text-[10px] font-black tracking-tight md:px-2.5 md:text-[12px]",
                    FEATURED_CHIP_BASE_CLASSNAME,
                    coverAccent.chipGlassClass,
                    urgencyState === "critical"
                        ? "border-fuchsia-400/55 bg-fuchsia-950/55 text-fuchsia-100 ring-fuchsia-500/20"
                        : urgencyState === "warm"
                          ? "border-brand-purple/45 bg-black/70 text-[#dfcdff] ring-brand-purple/20"
                          : "border-white/25 bg-black/65 text-white",
                )}
                aria-label={fullLabel}
                title={fullLabel}
            >
                <Clock className={cn("h-3 w-3 md:h-3.5 md:w-3.5", urgencyState === "critical" ? "text-fuchsia-300" : "text-brand-purple")} />
                <span className="truncate">{label}</span>
            </div>
        </div>
    );
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

function getFeaturedCtaLabel(ctaState: DropCtaState, unlockCost: number) {
    if (ctaState === "view") {
        return "View Content";
    }
    if (ctaState === "create_profile") {
        return "Create account to unwrap";
    }
    if (ctaState === "refill") {
        return "Refill to unwrap";
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
    ctaGradientClass: string;
    chipGlassClass: string;
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
    const accent = FEATURED_COVER_ACCENTS[accentName];

    return {
        accentName,
        ctaGradientClass: accent.ctaGradientClass,
        chipGlassClass: accent.chipGlassClass,
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
