"use client";

import { memo, startTransition, useEffect, useMemo, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import NextImage from "next/image";
import { useRouter } from "next/navigation";
import { Images, Film } from "lucide-react";
import { TitleMarquee } from "@/components/ui/TitleMarquee";

import { useUIActions } from "@/context/UIContext";
import { useAuthIdentity } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { getSupportedDropAspectRatio } from "@/lib/drop-presentation";
import { isFirebaseStorageMediaUrl } from "@/lib/media-hosts";
import { trackEvent } from "@/lib/telemetry";
import type { Drop } from "@/types/db";

interface HomeActiveDropsCarouselProps {
    drops: Drop[];
    autoPlayMs?: number;
    emptyLabel?: string;
}

export const HomeActiveDropsCarousel = memo(function HomeActiveDropsCarousel({
    drops,
    autoPlayMs = 0,
    emptyLabel = "No live experiences are ready right now.",
}: HomeActiveDropsCarouselProps) {
    const router = useRouter();
    const { user } = useAuthIdentity();
    const { openAuthModal } = useUIActions();
    const activeDrops = useMemo(() => drops.slice(0, 8), [drops]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [isCarouselVisible, setIsCarouselVisible] = useState(
        () => typeof IntersectionObserver === "undefined",
    );
    const [isDocumentVisible, setIsDocumentVisible] = useState(true);
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
    const rootRef = useRef<HTMLDivElement | null>(null);
    const [emblaRef, emblaApi] = useEmblaCarousel({ loop: activeDrops.length > 1, align: "start" });
    const selectedIndex = Math.min(activeIndex, Math.max(activeDrops.length - 1, 0));

    useEffect(() => {
        if (!emblaApi) {
            return;
        }

        const syncSelected = () => {
            const nextIndex = emblaApi.selectedScrollSnap();
            setActiveIndex((currentIndex) => (currentIndex === nextIndex ? currentIndex : nextIndex));
        };

        syncSelected();
        emblaApi.on("select", syncSelected);
        emblaApi.on("reInit", syncSelected);

        return () => {
            emblaApi.off("select", syncSelected);
            emblaApi.off("reInit", syncSelected);
        };
    }, [emblaApi]);

    useEffect(() => {
        emblaApi?.reInit({ loop: activeDrops.length > 1, align: "start" });
    }, [activeDrops.length, emblaApi]);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
        const updateMotionPreference = () => setPrefersReducedMotion(mediaQuery.matches);
        updateMotionPreference();
        mediaQuery.addEventListener("change", updateMotionPreference);

        return () => mediaQuery.removeEventListener("change", updateMotionPreference);
    }, []);

    useEffect(() => {
        if (typeof document === "undefined") {
            return;
        }

        const updateVisibility = () => setIsDocumentVisible(document.visibilityState === "visible");
        updateVisibility();
        document.addEventListener("visibilitychange", updateVisibility);

        return () => document.removeEventListener("visibilitychange", updateVisibility);
    }, []);

    useEffect(() => {
        if (typeof IntersectionObserver === "undefined" || !rootRef.current) {
            return;
        }

        const observer = new IntersectionObserver(([entry]) => {
            setIsCarouselVisible(entry?.isIntersecting === true);
        }, { rootMargin: "160px 0px", threshold: 0.05 });
        observer.observe(rootRef.current);

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (
            !emblaApi
            || activeDrops.length <= 1
            || autoPlayMs <= 0
            || prefersReducedMotion
            || !isCarouselVisible
            || !isDocumentVisible
        ) {
            return;
        }

        let timeoutId: number | null = null;
        let isInteracting = false;

        const clear = () => {
            if (timeoutId) {
                window.clearTimeout(timeoutId);
                timeoutId = null;
            }
        };

        const play = () => {
            clear();
            if (!isInteracting) {
                timeoutId = window.setTimeout(() => {
                    if (emblaApi.canScrollNext()) emblaApi.scrollNext();
                    else emblaApi.scrollTo(0);
                }, autoPlayMs);
            }
        };

        const onPointerDown = () => {
            isInteracting = true;
            clear();
        };

        const onPointerUp = () => {
            isInteracting = false;
            play();
        };

        play();
        emblaApi.on("pointerDown", onPointerDown);
        emblaApi.on("pointerUp", onPointerUp);
        emblaApi.on("select", play);

        return () => {
            clear();
            emblaApi.off("pointerDown", onPointerDown);
            emblaApi.off("pointerUp", onPointerUp);
            emblaApi.off("select", play);
        };
    }, [activeDrops.length, autoPlayMs, emblaApi, isCarouselVisible, isDocumentVisible, prefersReducedMotion]);

    if (activeDrops.length === 0) {
        return (
            <div className="rounded-[1.6rem] border border-white/10 bg-zinc-950 px-5 py-12 text-center text-sm text-gray-400">
                {emptyLabel}
            </div>
        );
    }

    return (
        <div ref={rootRef} className="space-y-4 [content-visibility:auto] [contain-intrinsic-size:520px]">
            <div
                ref={emblaRef}
                className="overflow-hidden"
            >
                <div className="flex [touch-action:pan-y]">
                    {activeDrops.map((drop, index) => {
                        const images = drop.mediaCounts?.images ?? 0;
                        const videos = drop.mediaCounts?.videos ?? 0;
                        const isActive = index === selectedIndex;
                        const aspectRatio = getSupportedDropAspectRatio(drop);
                        const isCreatorDrop = !!drop.creatorId;

                        return (
                            <button
                                key={drop.id}
                                type="button"
                                onClick={() => {
                                    setActiveIndex(index);
                                    if (user) {
                                        trackEvent("navigation_click", {
                                        destination: "/drops",
                                        source: "landing_active_drop_card",
                                        drop_id: drop.id,
                                    });
                                        startTransition(() => {
                                            router.push("/drops");
                                        });
                                        return;
                                    }

                                    openAuthModal("signup");
                                }}
                                className="relative flex-[0_0_44%] min-w-0 sm:flex-[0_0_42.5%] md:flex-[0_0_37.5%] mr-4 group flex flex-col text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple rounded-3xl"
                            >
                                <div 
                                    className={cn("relative w-full overflow-hidden rounded-[1.6rem] border border-white/5 bg-zinc-950 shadow-lg transition-transform duration-500", !isActive && "scale-[0.98]")}
                                    style={{ aspectRatio: aspectRatio.replace(":", " / ") }}
                                >
                                    <NextImage
                                        src={drop.imageUrl}
                                        alt={drop.title}
                                        fill
                                        sizes="(max-width: 640px) 46vw, (max-width: 1024px) 38vw, 360px"
                                        unoptimized={isFirebaseStorageMediaUrl(drop.imageUrl)}
                                        decoding="async"
                                        draggable={false}
                                        className="object-cover object-center transition-transform duration-700 select-none group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                                    />
                                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

                                    <div className="absolute left-3 bottom-3 flex flex-wrap gap-2 pointer-events-none">
                                        {(images > 0 || videos > 0) ? (
                                            <div className="rounded-full border border-white/10 bg-black/60 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-md shadow-sm">
                                                {images > 0 ? <Images className="mr-1 inline h-3.5 w-3.5 text-brand-purple" /> : null}
                                                {videos > 0 ? <Film className="mr-1 inline h-3.5 w-3.5 text-brand-purple" /> : null}
                                                {images + videos} files
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                                
                                <div className="mt-4 px-1">
                                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-brand-purple/90">
                                        {isCreatorDrop ? "Creator Experience" : "Live Drop"}
                                    </p>
                                    <TitleMarquee
                                        title={drop.title}
                                        delaySeed={drop.id.charCodeAt(0) % 6}
                                        className="mt-1 text-lg sm:text-xl font-extrabold leading-tight text-white group-hover:text-brand-purple transition-colors"
                                    />
                                    <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-gray-400">
                                        {drop.description}
                                    </p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {activeDrops.length > 1 ? (
                <div className="flex justify-center gap-2">
                    {activeDrops.map((drop, index) => (
                        <button
                            key={drop.id}
                            type="button"
                            onClick={() => {
                                emblaApi?.scrollTo(index);
                                setActiveIndex(index);
                            }}
                            className={cn(
                                "h-2.5 rounded-full transition-all",
                                index === selectedIndex ? "w-7 bg-brand-purple" : "w-2.5 bg-white/25",
                            )}
                            aria-label={`Go to drop ${index + 1}`}
                        />
                    ))}
                </div>
            ) : null}
        </div>
    );
});
