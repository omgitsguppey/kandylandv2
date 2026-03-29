"use client";

import { Drop } from "@/types/db";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { cn } from "@/lib/utils";
import NextImage from "next/image";
import { Clock, ChevronRight, Eye, Image as ImageIcon, Film } from "lucide-react";
import { getSupportedDropAspectRatio } from "@/lib/drop-presentation";

import { useUserProfile } from "@/context/AuthContext";
import { trackEvent } from "@/lib/telemetry";

interface FeaturedCarouselProps {
    drops: Drop[];
    onSelectDrop: (drop: Drop) => void;
}

type SwipeDirection = "prev" | "next";

const AUTO_ADVANCE_MS = 5000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function FeaturedCarousel({ drops, onSelectDrop }: FeaturedCarouselProps) {
    const [activeIndex, setActiveIndex] = useState(0);
    const { userProfile } = useUserProfile();
    const intervalRef = useRef<number | null>(null);
    const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, watchDrag: true });

    const featuredDrops = useMemo(() => drops.slice(0, 5), [drops]);

    const onSelect = useCallback(() => {
        if (!emblaApi) return;
        setActiveIndex(emblaApi.selectedScrollSnap());
    }, [emblaApi, setActiveIndex]);

    useEffect(() => {
        if (!emblaApi) return;
        onSelect();
        emblaApi.on("select", onSelect);
        emblaApi.on("reInit", onSelect);
    }, [emblaApi, onSelect]);

    useEffect(() => {
        if (!emblaApi || featuredDrops.length <= 1) return;

        intervalRef.current = window.setInterval(() => {
            emblaApi.scrollNext();
        }, AUTO_ADVANCE_MS);

        return () => {
            if (intervalRef.current) {
                window.clearInterval(intervalRef.current);
            }
        };
    }, [emblaApi, featuredDrops.length]);

    const resetAutoAdvance = useCallback(() => {
        if (intervalRef.current) {
            window.clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        if (emblaApi && featuredDrops.length > 1) {
            intervalRef.current = window.setInterval(() => {
                emblaApi.scrollNext();
            }, AUTO_ADVANCE_MS);
        }
    }, [emblaApi, featuredDrops.length]);

    if (featuredDrops.length === 0) return null;

    const activeDrop = featuredDrops[activeIndex] || featuredDrops[0];
    const activeAspectRatio = getSupportedDropAspectRatio(activeDrop);

    return (
        <div className="w-full mb-8 space-y-4">
            <div className="flex items-center gap-2 px-4 md:px-0">
                <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">Featured Kandy Drops</h2>
                <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
            </div>

            <div
                className={cn(
                    "w-full rounded-3xl relative overflow-hidden border border-white/10 group block mx-auto",
                    "shadow-[0_20px_50px_rgba(236,72,153,0.22)]",
                    activeAspectRatio === "16:9" && "max-w-[720px]",
                    activeAspectRatio === "1:1" && "max-w-[620px]",
                    activeAspectRatio === "9:16" && "max-w-[420px]"
                )}
                style={{ aspectRatio: activeAspectRatio.replace(":", " / ") }}
                ref={emblaRef}
            >
                <div className="flex w-full h-full">
                    {featuredDrops.map((drop, index) => {
                        const isActive = index === activeIndex;
                        const totalUnwraps = typeof drop.totalUnlocks === "number" && Number.isFinite(drop.totalUnlocks) ? Math.max(0, Math.floor(drop.totalUnlocks)) : 0;

                        let images = 0;
                        let videos = 0;
                        if (drop.mediaCounts) {
                            images = drop.mediaCounts.images;
                            videos = drop.mediaCounts.videos;
                        } else {
                            const urls = drop.contentUrls || (drop.contentUrl ? [drop.contentUrl] : []);
                            urls.forEach(url => {
                                const lowerUrl = url.toLowerCase();
                                if (lowerUrl.match(/\.(mp4|webm|ogg|mov)$/)) videos++;
                                else if (lowerUrl.match(/\.(jpg|jpeg|png|gif|webp)$/)) images++;
                                else images++; // Assume image fallback
                            });
                        }

                        return (
                            <div
                                key={drop.id}
                                className="relative flex-[0_0_100%] min-w-0 w-full h-full transition-opacity duration-300"
                            >
                                <button
                                    onClick={() => {
                                        trackEvent("featured_drop_clicked", { drop_id: drop.id, drop_category: drop.type });
                                        onSelectDrop(drop);
                                    }}
                                    type="button"
                                    className="absolute inset-0 block w-full h-full"
                                    tabIndex={isActive ? 0 : -1}
                                >
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(236,72,153,0.30),transparent_45%)] z-0" />
                                    <NextImage
                                        src={drop.imageUrl || "/placeholder.jpg"}
                                        alt={drop.title}
                                        fill
                                        className="object-cover object-center bg-black"
                                        sizes="(max-width: 768px) 100vw, 720px"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />

                                    <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                                        <div className="bg-black/55 backdrop-blur-xl px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.14em] font-bold text-white border border-white/20">
                                            Featured Drop
                                        </div>

                                        {(images > 0 || videos > 0) && (
                                            <div className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold text-white border border-white/20 flex items-center gap-1.5 shadow-lg">
                                                {images > 0 && (
                                                    <div className="flex items-center gap-0.5">
                                                        <ImageIcon className="w-3 h-3 text-gray-300" />
                                                        <span>{images}</span>
                                                    </div>
                                                )}
                                                {videos > 0 && (
                                                    <div className="flex items-center gap-0.5 ml-0.5">
                                                        <Film className="w-3 h-3 text-gray-300" />
                                                        <span>{videos}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="absolute top-4 right-4 z-20">
                                        <TimerWithProgress validFrom={drop.validFrom} validUntil={drop.validUntil} />
                                    </div>

                                    <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6 space-y-2 text-left">
                                        <h3 className="text-2xl font-bold text-white leading-tight">{drop.title}</h3>
                                        <p className="text-sm text-gray-300 line-clamp-2">{drop.description}</p>

                                        <div className="flex items-center gap-1.5 opacity-80 text-xs font-semibold text-white/90 pb-1">
                                            <Eye className="w-3.5 h-3.5 text-[#b28cff]" />
                                            <span>{totalUnwraps.toLocaleString()} unwrapped</span>
                                        </div>

                                        <div className="pt-1 flex items-center gap-3">
                                            {userProfile?.unlockedContent?.includes(drop.id) ? (
                                                <div className="px-3 py-1.5 bg-brand-purple/20 border border-brand-purple/30 rounded-lg text-brand-purple font-bold text-sm">View Content</div>
                                            ) : (
                                                <div className="px-3 py-1.5 bg-brand-purple/20 border border-brand-purple/30 rounded-lg text-brand-purple font-bold text-sm">
                                                    {drop.unlockCost} GD
                                                </div>
                                            )}
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-brand-purple to-purple-500 text-white shadow-[0_0_20px_rgba(164,118,255,0.4)]">
                                                <ChevronRight className="w-5 h-5 ml-0.5" />
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="flex justify-center gap-2">
                {featuredDrops.map((drop, index) => (
                    <button
                        key={drop.id}
                        onClick={() => {
                            if (emblaApi) emblaApi.scrollTo(index);
                            resetAutoAdvance();
                        }}
                        className={cn("h-2.5 rounded-full transition-all", index === activeIndex ? "w-7 bg-brand-purple" : "w-2.5 bg-white/25")}
                        aria-label={`Go to featured drop ${index + 1}`}
                        aria-current={index === activeIndex}
                    />
                ))}
            </div>
        </div>
    );
}

function TimerWithProgress({ validFrom, validUntil }: { validFrom: number; validUntil?: number }) {
    const { label, progressPercent, isUrgent } = useDropTiming(validFrom, validUntil);

    return (
        <div className="space-y-1.5 w-[160px]">
            <div
                className={cn(
                    "backdrop-blur-xl px-3 py-1.5 rounded-lg text-[12px] font-mono font-extrabold tracking-tight text-white border flex items-center gap-1.5 shadow-lg",
                    isUrgent ? "bg-red-500/75 border-red-300/60" : "bg-black/65 border-white/20"
                )}
            >
                <Clock className="w-3.5 h-3.5 text-brand-purple" />
                <span>{label}</span>
            </div>
            <LifetimeProgressBar progressPercent={progressPercent} isUrgent={isUrgent} />
        </div>
    );
}

function LifetimeProgressBar({ progressPercent, isUrgent }: { progressPercent: number; isUrgent: boolean }) {
    return (
        <div className="h-1.5 w-full rounded-full bg-white/20 overflow-hidden">
            <div
                className={cn(
                    "h-full rounded-full transition-[width] duration-700 ease-out",
                    isUrgent ? "bg-gradient-to-r from-brand-orange via-brand-purple to-red-400" : "bg-gradient-to-r from-brand-purple via-brand-purple to-brand-purple"
                )}
                style={{ width: `${progressPercent}%` }}
            />
        </div>
    );
}

function ActivityTicker({ count }: { count: number }) {
    const [displayCount, setDisplayCount] = useState(count);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (count === displayCount) {
            return;
        }

        const start = window.setTimeout(() => {
            setIsAnimating(true);
        }, 0);
        const update = window.setTimeout(() => {
            setDisplayCount(count);
        }, 90);
        const end = window.setTimeout(() => {
            setIsAnimating(false);
        }, 220);

        return () => {
            window.clearTimeout(start);
            window.clearTimeout(update);
            window.clearTimeout(end);
        };
    }, [count, displayCount]);

    return (
        <p className={cn("text-xs text-gray-200 transition-all duration-200", isAnimating ? "opacity-60 translate-y-0.5" : "opacity-100 translate-y-0")}>{displayCount.toLocaleString()} people already unwrapped</p>
    );
}

function useDropTiming(validFrom: number, validUntil?: number) {
    const [label, setLabel] = useState("No end date");
    const [isUrgent, setIsUrgent] = useState(false);
    const [progressPercent, setProgressPercent] = useState(0);

    useEffect(() => {
        const updateTiming = () => {
            if (!validUntil) {
                setLabel("No end date");
                setIsUrgent(false);
                setProgressPercent(0);
                return;
            }

            const now = Date.now();
            const clampedNow = Math.max(validFrom, Math.min(now, validUntil));
            const msLeft = Math.max(0, validUntil - now);
            const lifetime = Math.max(1, validUntil - validFrom);
            const percent = ((clampedNow - validFrom) / lifetime) * 100;
            setProgressPercent(Math.max(0, Math.min(100, percent)));

            if (msLeft === 0) {
                setLabel("Expired");
                setIsUrgent(true);
                return;
            }

            setIsUrgent(msLeft < ONE_DAY_MS);

            if (msLeft >= ONE_DAY_MS) {
                const days = Math.ceil(msLeft / ONE_DAY_MS);
                setLabel(`Ends in ${days} day${days === 1 ? "" : "s"}`);
                return;
            }

            const totalSeconds = Math.floor(msLeft / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            const pad = (value: number) => value.toString().padStart(2, "0");

            setLabel(`Ends in ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
        };

        updateTiming();
        const interval = window.setInterval(updateTiming, 1000);
        return () => window.clearInterval(interval);
    }, [validFrom, validUntil]);

    return { label, isUrgent, progressPercent };
}
