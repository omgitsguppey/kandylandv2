"use client";

import { Drop } from "@/types/db";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import NextImage from "next/image";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Clock, ChevronRight } from "lucide-react";

import { useUserProfile } from "@/context/AuthContext";

interface FeaturedCarouselProps {
    drops: Drop[];
}

export function FeaturedCarousel({ drops }: FeaturedCarouselProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const { userProfile } = useUserProfile();

    // Filter relevant drops (e.g. Hot or explicitly featured, or just recent)
    // For now, let's take up to 5 drops that are active
    const featuredDrops = drops.slice(0, 5);

    const scrollTimeoutRef = useRef<number | null>(null);

    const handleScroll = () => {
        if (!scrollRef.current) return;

        if (scrollTimeoutRef.current !== null) {
            window.cancelAnimationFrame(scrollTimeoutRef.current);
        }

        scrollTimeoutRef.current = window.requestAnimationFrame(() => {
            if (!scrollRef.current) return;
            const scrollLeft = scrollRef.current.scrollLeft;
            const width = scrollRef.current.offsetWidth;
            const index = Math.round(scrollLeft / (width * 0.8));
            setActiveIndex(index);
        });
    };

    useEffect(() => {
        return () => {
            if (scrollTimeoutRef.current !== null) {
                window.cancelAnimationFrame(scrollTimeoutRef.current);
            }
        };
    }, []);

    if (featuredDrops.length === 0) return null;

    return (
        <div className="w-full mb-8 space-y-4">
            <div className="flex items-center gap-2 px-4 md:px-0">
                <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">Featured Kandy Drops</h2>
                <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
            </div>

            <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex overflow-x-auto snap-x snap-mandatory gap-4 px-4 pb-8 no-scrollbar md:px-0"
                style={{ scrollPaddingLeft: '1rem', scrollPaddingRight: '1rem' }}
            >
                {featuredDrops.map((drop, index) => {
                    const isActive = index === activeIndex;

                    return (
                        <Link
                            href={`#drop-${drop.id}`}
                            key={drop.id}
                            className={cn(
                                "snap-center shrink-0 w-[85vw] md:w-[400px] aspect-[4/3] rounded-3xl relative overflow-hidden transition-all duration-500 ease-out border border-white/10 group block",
                                isActive ? "scale-100 shadow-[0_0_30px_rgba(236,72,153,0.3)] border-brand-pink/30" : "scale-95 opacity-70"
                            )}
                            onClick={(e) => {
                                // Provide smooth scrolling for in-page anchors
                                const target = document.getElementById(`drop-${drop.id}`);
                                if (target) {
                                    e.preventDefault();
                                    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }
                            }}
                        >
                            {/* Background Image */}
                            <NextImage
                                src={drop.imageUrl || "/placeholder.jpg"}
                                alt={drop.title}
                                fill
                                className="object-contain bg-black"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                            {/* Tags */}
                            <div className="absolute top-4 left-4 flex flex-col gap-2 items-start z-10">
                                {drop.tags?.map((tag) => (
                                    <div
                                        key={tag}
                                        className={cn(
                                            "backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white shadow-lg border border-white/10",
                                            tag === 'Sweet' ? "bg-pink-500/80" :
                                                tag === 'Spicy' ? "bg-red-500/80" :
                                                    tag === 'RAW' ? "bg-zinc-800/80 border-white/20" : "bg-brand-purple/80"
                                        )}
                                    >
                                        {tag}
                                    </div>
                                ))}
                            </div>


                            {/* Floating Metadata */}
                            <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-xl px-3 py-1.5 rounded-full text-xs font-mono font-bold text-white border border-white/10 flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5 text-brand-pink" />
                                <CarouselTimer validFrom={drop.validFrom} validUntil={drop.validUntil} />
                            </div>

                            {/* Bottom Content */}
                            <div className="absolute bottom-0 left-0 right-0 p-6 space-y-2">
                                <h3 className="text-2xl font-bold text-white leading-tight">{drop.title}</h3>
                                <p className="text-sm text-gray-300 line-clamp-2">{drop.description}</p>

                                <div className="pt-2 flex items-center gap-3">
                                    {userProfile?.unlockedContent?.includes(drop.id) ? (
                                        <div className="px-3 py-1.5 bg-brand-green/20 border border-brand-green/30 rounded-lg text-brand-green font-bold text-sm flex items-center gap-1 whitespace-nowrap shrink-0">
                                            View Content
                                        </div>
                                    ) : (
                                        <div className="px-3 py-1.5 bg-brand-purple/20 border border-brand-purple/30 rounded-lg text-brand-purple font-bold text-sm whitespace-nowrap shrink-0">
                                            {drop.unlockCost} GD
                                        </div>
                                    )}
                                    <button className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center active:scale-95 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.4)]">
                                        <ChevronRight className="w-5 h-5 ml-0.5" />
                                    </button>
                                </div>
                            </div>
                        </Link>
                    );
                })}
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

