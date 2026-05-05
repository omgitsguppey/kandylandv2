"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import NextImage from "next/image";
import { Clock, Eye, Image as ImageIcon, Lock, Unlock } from "lucide-react";

import { TitleMarquee } from "@/components/ui/TitleMarquee";
import { useAuthIdentity, useUserProfile } from "@/context/AuthContext";
import { DROPS_MOBILE_UI_DENSITY } from "@/hooks/useDropCardImpression";
import { DROP_COUNTDOWN_ONE_DAY_MS, DROP_COUNTDOWN_ONE_HOUR_MS, formatDropCountdown, type DropCountdownUrgency } from "@/lib/drop-countdown";
import { getDropCardVisibilityTelemetryPayload, resolveDropCardVisibilityState, type DropCtaState } from "@/lib/drop-card-visibility";
import { getDropViewCount } from "@/lib/drop-engagement";
import { getSupportedDropAspectRatio } from "@/lib/drop-presentation";
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

const FEATURED_CHIP_BASE_CLASSNAME = "border text-white shadow-[0_8px_24px_rgba(0,0,0,0.38)] backdrop-blur-xl";
const FEATURED_COVER_ACCENTS: Record<FeaturedCoverAccentName, { ctaGradientClass: string; chipGlassClass: string }> = {
    cherry: {
        ctaGradientClass: "border-rose-200/45 bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500 shadow-[0_0_18px_rgba(244,63,94,0.30)]",
        chipGlassClass: "border-rose-100/25 bg-black/70 ring-1 ring-rose-500/20",
    },
    watermelon: {
        ctaGradientClass: "border-emerald-100/45 bg-gradient-to-r from-emerald-500 via-rose-500 to-fuchsia-500 shadow-[0_0_18px_rgba(16,185,129,0.24)]",
        chipGlassClass: "border-emerald-100/25 bg-black/70 ring-1 ring-emerald-500/20",
    },
    honey: {
        ctaGradientClass: "border-amber-100/50 bg-gradient-to-r from-amber-500 via-orange-400 to-purple-500 shadow-[0_0_18px_rgba(245,158,11,0.28)]",
        chipGlassClass: "border-amber-100/25 bg-stone-950/72 ring-1 ring-amber-500/20",
    },
    lemon: {
        ctaGradientClass: "border-yellow-100/55 bg-gradient-to-r from-yellow-400 via-amber-500 to-purple-500 shadow-[0_0_18px_rgba(250,204,21,0.26)]",
        chipGlassClass: "border-yellow-100/25 bg-stone-950/72 ring-1 ring-yellow-400/20",
    },
    peach: {
        ctaGradientClass: "border-orange-100/50 bg-gradient-to-r from-orange-400 via-pink-400 to-purple-500 shadow-[0_0_18px_rgba(251,146,60,0.25)]",
        chipGlassClass: "border-orange-100/25 bg-black/68 ring-1 ring-orange-400/20",
    },
    bubblegum: {
        ctaGradientClass: "border-pink-100/45 bg-gradient-to-r from-pink-400 via-fuchsia-500 to-purple-500 shadow-[0_0_18px_rgba(236,72,153,0.28)]",
        chipGlassClass: "border-pink-100/25 bg-black/68 ring-1 ring-pink-500/20",
    },
    chocolate: {
        ctaGradientClass: "border-amber-100/35 bg-gradient-to-r from-stone-800 via-amber-800 to-purple-600 shadow-[0_0_18px_rgba(120,53,15,0.32)]",
        chipGlassClass: "border-amber-100/20 bg-stone-950/76 ring-1 ring-amber-700/20",
    },
    brand: {
        ctaGradientClass: "border-brand-purple bg-gradient-to-r from-brand-purple to-purple-500 shadow-[0_0_15px_rgba(164,118,255,0.24)]",
        chipGlassClass: "border-white/25 bg-black/65 ring-1 ring-black/20",
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

    const featuredDrops = useMemo(() => drops.slice(0, 5), [drops]);
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
        <section className="mb-4 w-full space-y-2 md:mb-7 md:space-y-4" data-featured-drops-density="compact-mobile">
            <div className="flex items-center gap-2 px-1 md:px-0">
                <h2 className="text-base font-black tracking-tight text-white md:text-2xl">Featured Drops</h2>
                <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
            </div>

            <div
                className={cn(
                    "group relative mx-auto block w-full overflow-hidden rounded-[1.35rem] border border-white/10 shadow-[0_14px_34px_rgba(164,118,255,0.16)] md:rounded-[2rem]",
                    "[aspect-ratio:16/10] sm:[aspect-ratio:var(--featured-drop-ratio)]",
                    activeAspectRatio === "16:9" && "max-w-[590px]",
                    activeAspectRatio === "1:1" && "max-w-[500px]",
                    activeAspectRatio === "9:16" && "max-w-[348px]",
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

            <div className="flex justify-center gap-1.5">
                {featuredDrops.map((drop, index) => (
                    <button
                        key={drop.id}
                        type="button"
                        onClick={() => {
                            emblaApi?.scrollTo(index);
                            startAutoAdvance();
                        }}
                        className={cn(
                            "h-2 rounded-full transition-all",
                            index === safeActiveIndex ? "w-6 bg-brand-purple" : "w-2 bg-white/25",
                        )}
                        aria-label={`Go to featured Drop ${index + 1}`}
                        aria-current={index === safeActiveIndex}
                    />
                ))}
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
    const isUnlocked = Boolean(userProfile?.unlockedContent?.includes(drop.id));
    const visibilityState = useMemo(
        () =>
            resolveDropCardVisibilityState({
                drop,
                isAuthenticated: Boolean(user),
                isUnlocked,
                gumDropsBalance: userProfile?.gumDropsBalance,
            }),
        [drop, isUnlocked, user, userProfile?.gumDropsBalance],
    );
    const ctaLabel = getFeaturedCtaLabel(visibilityState.ctaState, drop.unlockCost);
    const coverAccent = useMemo(() => resolveFeaturedCoverAccent(drop), [drop]);
    const socialProof = useMemo(() => getFeaturedSocialProof(drop), [drop]);
    const imagePolicy = useMemo(
        () => getImageLoadingPolicy("featured_carousel", { mediaIndex: index, isLcpCandidate: index === 0 }),
        [index],
    );
    const { images, videos } = getMediaCounts(drop);

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
                <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_20%_0%,rgba(164,118,255,0.30),transparent_44%)]" />
                <NextImage
                    src={drop.imageUrl || "/placeholder.jpg"}
                    alt={drop.title}
                    fill
                    loading={imagePolicy.loading}
                    preload={imagePolicy.preload}
                    fetchPriority={imagePolicy.fetchPriority}
                    quality={imagePolicy.quality}
                    className="bg-black object-cover object-center"
                    sizes={imagePolicy.sizes}
                    {...getImagePolicyDataAttributes(imagePolicy)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/30 to-transparent" />

                <div className="absolute left-3 top-3 flex flex-wrap gap-1.5 md:left-4 md:top-4 md:gap-2">
                    <div className={cn("rounded-[0.75rem] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] md:text-[10px]", FEATURED_CHIP_BASE_CLASSNAME, coverAccent.chipGlassClass)}>
                        Featured
                    </div>

                    {images > 0 || videos > 0 ? (
                        <div
                            className={cn("flex items-center gap-1.5 rounded-[0.75rem] px-2.5 py-1 text-[9px] font-bold md:text-[10px]", FEATURED_CHIP_BASE_CLASSNAME, coverAccent.chipGlassClass)}
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

                <div className="absolute right-3 top-3 z-20 md:right-4 md:top-4">
                    <TimerWithProgress validUntil={drop.validUntil} coverAccent={coverAccent} />
                </div>

                <div className="absolute bottom-0 left-0 right-0 space-y-1.5 p-4 md:space-y-2 md:p-6">
                    <div className="w-full max-w-full overflow-hidden">
                        <TitleMarquee
                            title={drop.title}
                            delaySeed={drop.id.charCodeAt(0) % 6}
                            className="text-lg font-black leading-tight text-white md:text-2xl"
                        />
                    </div>
                    <p className="line-clamp-2 text-xs leading-relaxed text-gray-300 md:text-sm">{drop.description}</p>

                    <div
                        className="flex items-center gap-1.5 pb-0.5 text-[11px] font-semibold text-white/80 md:text-xs"
                        data-featured-social-proof-type={socialProof.type}
                    >
                        {socialProof.type === "unwraps" ? (
                            <Unlock className="h-3.5 w-3.5 text-brand-purple" />
                        ) : (
                            <Eye className="h-3.5 w-3.5 text-brand-purple" />
                        )}
                        <span>{socialProof.label}</span>
                    </div>

                    <div className="w-full max-w-[230px] pt-1 md:max-w-[260px] md:pt-2">
                        <div
                            className={cn(
                                "flex w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-[0.9rem] border px-3 py-2 text-xs font-black text-white transition-transform active:scale-[0.98] md:rounded-xl md:px-4 md:py-2.5 md:text-sm",
                                "drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]",
                                coverAccent.ctaGradientClass,
                            )}
                            data-featured-cta-accent={coverAccent.accentName}
                            data-featured-cta-cover-aware="true"
                        >
                            {visibilityState.ctaState === "view" ? <Unlock className="h-3.5 w-3.5 md:h-4 md:w-4" /> : <Lock className="h-3.5 w-3.5 md:h-4 md:w-4" />}
                            {ctaLabel}
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
        return "Create Profile";
    }
    if (ctaState === "refill") {
        return "Refill GumDrops";
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
