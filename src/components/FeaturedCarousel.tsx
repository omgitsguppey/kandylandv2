"use client";

import { Drop } from "@/types/db";
import { useState, useRef, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import NextImage from "next/image";
import { formatDistanceToNow } from "date-fns";
import { Clock, ChevronRight } from "lucide-react";
import { getSupportedDropAspectRatio } from "@/lib/drop-presentation";

import { useUserProfile } from "@/context/AuthContext";

interface FeaturedCarouselProps {
    drops: Drop[];
    onSelectDrop: (drop: Drop) => void;
}

export function FeaturedCarousel({ drops, onSelectDrop }: FeaturedCarouselProps) {
    const [activeIndex, setActiveIndex] = useState(0);
    const { userProfile } = useUserProfile();
    const intervalRef = useRef<number | null>(null);

    const featuredDrops = useMemo(() => drops.slice(0, 5), [drops]);

    useEffect(() => {
        if (featuredDrops.length <= 1) {
            return;
        }

        intervalRef.current = window.setInterval(() => {
            setActiveIndex((prev) => (prev + 1) % featuredDrops.length);
        }, 5000);

        return () => {
            if (intervalRef.current) {
                window.clearInterval(intervalRef.current);
            }
        };
    }, [featuredDrops.length]);

    if (featuredDrops.length === 0) return null;

    const activeDrop = featuredDrops[activeIndex];
    const aspectRatio = getSupportedDropAspectRatio(activeDrop);

    return (
        <div className="w-full mb-8 space-y-4">
            <div className="flex items-center gap-2 px-4 md:px-0">
                <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">Featured Kandy Drops</h2>
                <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
            </div>

            <button
                onClick={() => onSelectDrop(activeDrop)}
                className={cn(
                    "w-full rounded-3xl relative overflow-hidden transition-all duration-500 ease-out border border-white/10 group block h-[320px] md:h-[360px]",
                    aspectRatio === "16:9" && "max-w-[920px]",
                    aspectRatio === "1:1" && "max-w-[680px]",
                    aspectRatio === "9:16" && "max-w-[460px]",
                    "mx-auto"
                )}
            >
                <NextImage
                    src={activeDrop.imageUrl || "/placeholder.jpg"}
                    alt={activeDrop.title}
                    fill
                    className="object-contain bg-black"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-xl px-4 py-2 rounded-xl text-sm font-mono font-bold text-white border border-white/10 flex items-center gap-2 shadow-lg">
                    <Clock className="w-4 h-4 text-brand-pink" />
                    <CarouselTimer validFrom={activeDrop.validFrom} validUntil={activeDrop.validUntil} />
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-6 space-y-2 text-left">
                    <h3 className="text-2xl font-bold text-white leading-tight">{activeDrop.title}</h3>
                    <p className="text-sm text-gray-300 line-clamp-2">{activeDrop.description}</p>

                    <div className="pt-2 flex items-center gap-3">
                        {userProfile?.unlockedContent?.includes(activeDrop.id) ? (
                            <div className="px-3 py-1.5 bg-brand-green/20 border border-brand-green/30 rounded-lg text-brand-green font-bold text-sm">View Content</div>
                        ) : (
                            <div className="px-3 py-1.5 bg-brand-purple/20 border border-brand-purple/30 rounded-lg text-brand-purple font-bold text-sm">
                                {activeDrop.unlockCost} GD
                            </div>
                        )}
                        <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.4)]">
                            <ChevronRight className="w-5 h-5 ml-0.5" />
                        </div>
                    </div>
                </div>
            </button>

            <div className="flex justify-center gap-2">
                {featuredDrops.map((drop, index) => (
                    <button
                        key={drop.id}
                        onClick={() => setActiveIndex(index)}
                        className={cn("h-2.5 rounded-full transition-all", index === activeIndex ? "w-7 bg-brand-pink" : "w-2.5 bg-white/25")}
                        aria-label={`Go to featured drop ${index + 1}`}
                    />
                ))}
            </div>
        </div>
    );
}

function CarouselTimer({ validFrom, validUntil }: { validFrom: number, validUntil?: number }) {
    const [timeLeft, setTimeLeft] = useState("");

    useEffect(() => {
        const updateTimer = () => {
            const now = Date.now();
            if (now < validFrom) {
                setTimeLeft(`Starts in ${formatDistanceToNow(validFrom)}`);
            } else if (!validUntil || now < validUntil) {
                if (!validUntil) {
                    setTimeLeft("Forever");
                } else {
                    setTimeLeft(formatDistanceToNow(validUntil, { addSuffix: true }));
                }
            } else {
                setTimeLeft("Expired");
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [validFrom, validUntil]);

    return <span>{timeLeft}</span>;
}
