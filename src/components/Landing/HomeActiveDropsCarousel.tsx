"use client";

import { useEffect, useMemo, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import NextImage from "next/image";
import { Images, Film } from "lucide-react";

import { useUI } from "@/context/UIContext";
import { useAuthIdentity } from "@/context/AuthContext";
import { useDrops } from "@/hooks/useDrops";
import { cn } from "@/lib/utils";
import { getSupportedDropAspectRatio } from "@/lib/drop-presentation";

export function HomeActiveDropsCarousel() {
    const { user } = useAuthIdentity();
    const { openAuthModal } = useUI();
    const { drops } = useDrops();
    const activeDrops = useMemo(
        () => drops.filter((drop) => drop.status === "active").slice(0, 8),
        [drops],
    );
    const [activeIndex, setActiveIndex] = useState(0);
    const [emblaRef, emblaApi] = useEmblaCarousel({ loop: activeDrops.length > 1, align: "start" });
    const selectedIndex = Math.min(activeIndex, Math.max(activeDrops.length - 1, 0));

    useEffect(() => {
        if (!emblaApi) {
            return;
        }

        const syncSelected = () => {
            setActiveIndex(emblaApi.selectedScrollSnap());
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

    if (activeDrops.length === 0) {
        return (
            <div className="rounded-[1.6rem] border border-white/10 bg-zinc-950 px-5 py-12 text-center text-sm text-gray-500">
                New drops are being staged right now.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div
                ref={emblaRef}
                className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-zinc-950"
            >
                <div className="flex">
                    {activeDrops.map((drop, index) => {
                        const images = drop.mediaCounts?.images ?? 0;
                        const videos = drop.mediaCounts?.videos ?? 0;
                        const isActive = index === selectedIndex;
                        const aspectRatio = getSupportedDropAspectRatio(drop);

                        return (
                            <button
                                key={drop.id}
                                type="button"
                                onClick={() => {
                                    setActiveIndex(index);
                                    if (!user) {
                                        openAuthModal("signup");
                                    }
                                }}
                                className="relative flex-[0_0_100%] min-w-0"
                                style={{ aspectRatio: aspectRatio.replace(":", " / ") }}
                            >
                                <NextImage
                                    src={drop.imageUrl}
                                    alt={drop.title}
                                    fill
                                    sizes="(max-width: 768px) 100vw, 720px"
                                    className={cn(
                                        "object-cover object-center transition-transform duration-500",
                                        isActive ? "scale-100" : "scale-[0.985]",
                                    )}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

                                <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                                    {(images > 0 || videos > 0) ? (
                                        <div className="rounded-full border border-white/10 bg-black/60 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-md">
                                            {images > 0 ? <Images className="mr-1 inline h-3.5 w-3.5 text-brand-purple" /> : null}
                                            {videos > 0 ? <Film className="mr-1 inline h-3.5 w-3.5 text-brand-purple" /> : null}
                                            {images + videos} files
                                        </div>
                                    ) : null}
                                </div>

                                <div className="absolute inset-x-0 bottom-0 p-4 text-left sm:p-5">
                                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-brand-purple">
                                        Featured KandyDrop
                                    </p>
                                    <h3 className="mt-1 text-xl font-extrabold leading-tight text-white sm:text-2xl">
                                        {drop.title}
                                    </h3>
                                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-300">
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
}
