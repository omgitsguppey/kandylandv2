import { Drop } from "@/types/db";
import { cn } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";
import NextImage from "next/image";

import { doc, updateDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface PromoCardProps {
    drop: Drop;
}

export function PromoCard({ drop }: PromoCardProps) {
    const handleClick = () => {
        // Track click as an 'unlock' or interaction
        try {
            const dropRef = doc(db, "drops", drop.id);
            updateDoc(dropRef, {
                totalUnlocks: increment(1)
            });
        } catch (e) {
            console.error("Error tracking click:", e);
        }
    };

    return (
        <a
            href={drop.actionUrl}
            onClick={handleClick}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative p-2 md:p-6 rounded-2xl md:rounded-3xl glass-panel transition-all duration-500 hover:-translate-y-2 overflow-hidden flex flex-col h-full bg-gradient-to-br from-white/5 to-white/0 border border-white/10 hover:border-brand-pink/50"
            style={{
                borderColor: drop.accentColor ? `${drop.accentColor}40` : undefined
            }}
        >
            {/* Promo Label */}
            <div className="absolute top-3 left-3 z-20 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold text-gray-300 uppercase tracking-widest border border-white/10">
                Ad
            </div>

            {/* Image Container */}
            <div className="relative w-full aspect-square bg-black/40 rounded-xl md:rounded-2xl mb-2 md:mb-5 overflow-hidden group/image shadow-inner">
                {drop.imageUrl ? (
                    <NextImage
                        src={drop.imageUrl}
                        alt={drop.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-700 opacity-90 group-hover:opacity-100"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                ) : (
                    <div className="w-full h-full bg-zinc-900" />
                )}

                {/* Overlay Icon */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/20 backdrop-blur-[2px]">
                    <div className="bg-white text-black rounded-full p-3 transform scale-50 group-hover:scale-100 transition-transform duration-300">
                        <ArrowUpRight className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="relative z-10 flex-1 flex flex-col">
                <div className="mb-2 md:mb-4 flex-1">
                    <h3 className="text-sm md:text-xl font-bold text-white mb-0.5 md:mb-1 leading-tight tracking-tight group-hover:text-brand-pink transition-colors">
                        {drop.title}
                    </h3>
                    <p className="text-[10px] md:text-sm text-gray-400 line-clamp-2 font-medium leading-relaxed">
                        {drop.description}
                    </p>
                </div>

                <div
                    className="w-full py-2 md:py-3 rounded-lg md:rounded-xl font-bold text-xs md:text-sm bg-white text-black flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                    style={{
                        backgroundColor: drop.accentColor || 'white',
                        color: drop.accentColor ? 'white' : 'black'
                    }}
                >
                    {drop.ctaText || "Visit Now"}
                    <ArrowUpRight className="w-3 h-3 md:w-4 md:h-4" />
                </div>
            </div>
        </a>
    );
}
