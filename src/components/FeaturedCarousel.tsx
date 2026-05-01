"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import NextImage from "next/image";
import { Clock, Eye, Film, Image as ImageIcon, Lock, Unlock } from "lucide-react";

import { TitleMarquee } from "@/components/ui/TitleMarquee";
import { useUserProfile } from "@/context/AuthContext";
import { DROPS_MOBILE_UI_DENSITY } from "@/hooks/useDropCardImpression";
import { DROP_COUNTDOWN_ONE_DAY_MS, DROP_COUNTDOWN_ONE_HOUR_MS, formatDropCountdown, type DropCountdownUrgency } from "@/lib/drop-countdown";
import { getSupportedDropAspectRatio } from "@/lib/drop-presentation";
import { trackEvent } from "@/lib/telemetry";
import { cn } from "@/lib/utils";
import { useNow } from "@/hooks/useNow";
import { Drop } from "@/types/db";

interface FeaturedCarouselProps {
    drops: Drop[];
    onSelectDrop: (drop: Drop) => void;
}

const AUTO_ADVANCE_MS = 5_000;
type DropTimingUrgency = DropCountdownUrgency;

export function FeaturedCarousel({ drops, onSelectDrop }: FeaturedCarouselProps) {
    const [activeIndex, setActiveIndex] = useState(0);
    const { userProfile } = useUserProfile();
    const intervalRef = useRef<number | null>(null);
    const prefersReducedMotion = usePrefersReducedMotion();
    const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, watchDrag: true });

    const featuredDrops = useMemo(() => drops.slice(0, 5), [drops]);

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
                ref={emblaRef}
            >
                <div className="flex h-full w-full">
                    {featuredDrops.map((drop, index) => (
                        <FeaturedDropSlide
                            key={drop.id}
                            drop={drop}
                            index={index}
                            isActive={index === safeActiveIndex}
                            userProfile={userProfile}
                            onSelectDrop={onSelectDrop}
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

function FeaturedDropSlide({
    drop,
    index,
    isActive,
    userProfile,
    onSelectDrop,
}: {
    drop: Drop;
    index: number;
    isActive: boolean;
    userProfile: ReturnType<typeof useUserProfile>["userProfile"];
    onSelectDrop: (drop: Drop) => void;
}) {
    const totalUnwraps = typeof drop.totalUnlocks === "number" && Number.isFinite(drop.totalUnlocks) ? Math.max(0, Math.floor(drop.totalUnlocks)) : 0;
    const isUnlocked = userProfile?.unlockedContent?.includes(drop.id);
    const canAfford = typeof userProfile?.gumDropsBalance === "number" && userProfile.gumDropsBalance >= drop.unlockCost;
    const { images, videos } = getMediaCounts(drop);

    return (
        <div className="relative h-full min-w-0 flex-[0_0_100%] transition-opacity duration-300">
            <button
                onClick={() => {
                    trackEvent("featured_drop_clicked", {
                        drop_id: drop.id,
                        drop_category: drop.type,
                        featured_rank: index + 1,
                        source_component: "compact_featured_carousel",
                        ui_density: DROPS_MOBILE_UI_DENSITY,
                    });
                    onSelectDrop(drop);
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
                    className="bg-black object-cover object-center"
                    sizes="(max-width: 768px) 100vw, 720px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/30 to-transparent" />

                <div className="absolute left-3 top-3 flex flex-wrap gap-1.5 md:left-4 md:top-4 md:gap-2">
                    <div className="rounded-[0.75rem] border border-white/20 bg-black/55 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-white backdrop-blur-xl md:text-[10px]">
                        Featured
                    </div>

                    {images > 0 || videos > 0 ? (
                        <div className="flex items-center gap-1.5 rounded-[0.75rem] border border-white/20 bg-black/60 px-2.5 py-1 text-[9px] font-bold text-white shadow-lg backdrop-blur-md md:text-[10px]">
                            {images > 0 ? (
                                <div className="flex items-center gap-0.5">
                                    <ImageIcon className="h-3 w-3 text-gray-300" />
                                    <span>{images}</span>
                                </div>
                            ) : null}
                            {videos > 0 ? (
                                <div className="flex items-center gap-0.5">
                                    <Film className="h-3 w-3 text-gray-300" />
                                    <span>{videos}</span>
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                </div>

                <div className="absolute right-3 top-3 z-20 md:right-4 md:top-4">
                    <TimerWithProgress validFrom={drop.validFrom} validUntil={drop.validUntil} />
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

                    <div className="flex items-center gap-1.5 pb-0.5 text-[11px] font-semibold text-white/80 md:text-xs">
                        <Eye className="h-3.5 w-3.5 text-brand-purple" />
                        <span>{totalUnwraps.toLocaleString()} unwrapped</span>
                    </div>

                    <div className="w-full max-w-[230px] pt-1 md:max-w-[260px] md:pt-2">
                        <div className="flex w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-[0.9rem] border border-brand-purple bg-gradient-to-r from-brand-purple to-purple-500 px-3 py-2 text-xs font-black text-white shadow-[0_0_15px_rgba(164,118,255,0.24)] md:rounded-xl md:px-4 md:py-2.5 md:text-sm">
                            {isUnlocked ? <Unlock className="h-3.5 w-3.5 md:h-4 md:w-4" /> : <Lock className="h-3.5 w-3.5 md:h-4 md:w-4" />}
                            {isUnlocked
                                ? "View Content"
                                : !userProfile
                                  ? "Create Profile"
                                  : !canAfford
                                    ? "Refill GumDrops"
                                    : `Unwrap for ${drop.unlockCost} GD`}
                        </div>
                    </div>
                </div>
            </button>
        </div>
    );
}

function TimerWithProgress({ validFrom, validUntil }: { validFrom: number; validUntil?: number }) {
    const { label, fullLabel, progressPercent, urgencyState } = useDropTiming(validFrom, validUntil);

    return (
        <div className="w-[104px] space-y-1 md:w-[150px]">
            <div
                className={cn(
                    "flex items-center gap-1.5 rounded-[0.75rem] border px-2 py-1 text-[10px] font-black tracking-tight text-white shadow-lg backdrop-blur-xl md:px-3 md:text-[12px]",
                    urgencyState === "critical"
                        ? "border-fuchsia-500/45 bg-fuchsia-900/35 text-fuchsia-100"
                        : urgencyState === "warm"
                          ? "border-brand-purple/40 bg-brand-purple/18 text-[#dfcdff]"
                          : "border-white/20 bg-black/65 text-white",
                )}
                aria-label={fullLabel}
                title={fullLabel}
            >
                <Clock className={cn("h-3 w-3 md:h-3.5 md:w-3.5", urgencyState === "critical" ? "text-fuchsia-300" : "text-brand-purple")} />
                <span className="truncate">{label}</span>
            </div>
            <LifetimeProgressBar progressPercent={progressPercent} urgencyState={urgencyState} />
        </div>
    );
}

function LifetimeProgressBar({ progressPercent, urgencyState }: { progressPercent: number; urgencyState: DropTimingUrgency }) {
    return (
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/20">
            <div
                className={cn(
                    "h-full rounded-full transition-[width] duration-700 ease-out",
                    urgencyState === "critical"
                        ? "bg-gradient-to-r from-brand-purple via-fuchsia-500 to-pink-500"
                        : urgencyState === "warm"
                          ? "bg-gradient-to-r from-brand-purple to-fuchsia-400"
                          : "bg-brand-purple",
                )}
                style={{ width: `${progressPercent}%` }}
            />
        </div>
    );
}

function useDropTiming(validFrom: number, validUntil?: number): { label: string; fullLabel: string; urgencyState: DropTimingUrgency; progressPercent: number } {
    const nowMs = useNow({ intervalMs: 1_000 });

    return useMemo(() => {
        if (!validUntil) {
            return { label: "Always", fullLabel: "Always available", urgencyState: "calm" as const, progressPercent: 0 };
        }

        const clampedNow = Math.max(validFrom, Math.min(nowMs, validUntil));
        const msLeft = Math.max(0, validUntil - nowMs);
        const lifetime = Math.max(1, validUntil - validFrom);
        const progressPercent = Math.max(0, Math.min(100, ((clampedNow - validFrom) / lifetime) * 100));

        if (msLeft === 0) {
            return { label: "Expired", fullLabel: "Expired", urgencyState: "critical" as const, progressPercent };
        }

        const countdown = formatDropCountdown(validUntil, nowMs);
        const urgencyState: DropTimingUrgency = msLeft <= 4 * DROP_COUNTDOWN_ONE_HOUR_MS ? "critical" : msLeft <= DROP_COUNTDOWN_ONE_DAY_MS ? "warm" : countdown.urgencyState;

        return { label: countdown.visibleLabel, fullLabel: countdown.fullLabel, urgencyState, progressPercent };
    }, [nowMs, validFrom, validUntil]);
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
