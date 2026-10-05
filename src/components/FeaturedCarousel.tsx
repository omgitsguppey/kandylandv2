"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";

import { Button } from "@/components/ui/Button";
import { useAuthIdentity, useAuthLoading, useUserProfile } from "@/context/AuthContext";
import { DROPS_MOBILE_UI_DENSITY } from "@/hooks/useDropCardImpression";
import { resolveDropLifecycleStatus } from "@/lib/drop-status";
import {
    buildDiscoveryImpressionKey,
    createDiscoveryTrackingSessionId,
    DISCOVERY_IMPRESSION_VISIBILITY_THRESHOLD,
} from "@/lib/discovery-telemetry";
import { trackEvent } from "@/lib/telemetry";
import { Drop } from "@/types/db";

import { FeaturedDropSlide } from "@/components/FeaturedDropSlide";

interface FeaturedCarouselProps {
    drops: Drop[];
    onSelectDrop: (drop: Drop, sourceComponent?: string) => void;
}

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
            <div className="w-full overflow-hidden" ref={setCarouselViewportRef}>
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
