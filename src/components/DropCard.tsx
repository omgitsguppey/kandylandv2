"use client";

import { Drop } from "@/types/db";
import { useEffect, useState, memo } from "react";
import { formatDistanceToNow } from "date-fns";
import NextImage from "next/image";
import { Lock, Unlock, Clock, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { doc, arrayUnion, increment, collection, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import confetti from "canvas-confetti";

interface DropCardProps {
    drop: Drop;
    priority?: boolean;
}

function DropCardBase({ drop, priority = false }: DropCardProps) {
    const { user, userProfile } = useAuth();
    // ... (rest of the component logic remains effectively same, just update the image priority)

    // ... inside return ...
    <NextImage
        src={drop.imageUrl}
        alt={drop.title}
        fill
        priority={priority}
        className="object-cover group-hover:scale-105 transition-transform duration-700 opacity-70 group-hover:opacity-100"
        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
    />
    const [timeLeft, setTimeLeft] = useState("");
    const [isHovered, setIsHovered] = useState(false);
    const [unlocking, setUnlocking] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isUnlocked = userProfile?.unlockedContent?.includes(drop.id);
    const canAfford = (userProfile?.gumDropsBalance || 0) >= drop.unlockCost;

    useEffect(() => {
        const updateTime = () => {
            const now = Date.now();
            if (now < drop.validFrom) {
                setTimeLeft(`Starts in ${formatDistanceToNow(drop.validFrom)}`);
            } else if (now < drop.validUntil) {
                const diff = drop.validUntil - now;
                // If more than 24h, just show days/hours to save rendering
                if (diff > 24 * 60 * 60 * 1000) {
                    // Update only every minute if > 24h
                    setTimeLeft(formatDistanceToNow(drop.validUntil, { addSuffix: true }));
                } else {
                    const seconds = Math.floor((diff / 1000) % 60);
                    const minutes = Math.floor((diff / 1000 / 60) % 60);
                    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
                    setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
                }
            } else {
                setTimeLeft("Expired");
                return true; // Expired
            }
            return false;
        };

        // Initial run
        if (updateTime()) return;

        // Smart interval
        const now = Date.now();
        const timeToStart = drop.validFrom - now;
        const timeToEnd = drop.validUntil - now;

        let intervalMs = 1000;
        if (timeToEnd > 24 * 60 * 60 * 1000 && timeToStart < 0) {
            intervalMs = 60000; // 1 minute if > 24h left
        }

        const timer = setInterval(() => {
            if (updateTime()) clearInterval(timer);
        }, intervalMs);

        return () => clearInterval(timer);
    }, [drop]);

    const handleUnlock = async () => {
        if (!user || unlocking || isUnlocked) return;
        if (!canAfford) {
            toast.error("Not enough Gum Drops!", {
                description: "Purchase more from your wallet.",
                duration: 3000,
            });
            setError("Not enough Gum Drops!");
            setTimeout(() => setError(null), 3000);
            return;
        }

        setUnlocking(true);
        setError(null);

        // Optimistic UI could go here, but let's wait for firestore for safety

        try {
            const userRef = doc(db, "users", user.uid);

            const batch = writeBatch(db);

            // 1. Deduct Gum Drops and Add to Unlocked Content
            batch.update(userRef, {
                gumDropsBalance: increment(-drop.unlockCost),
                unlockedContent: arrayUnion(drop.id)
            });

            // 2. Record Transaction
            const transactionRef = doc(collection(db, "transactions"));
            batch.set(transactionRef, {
                userId: user.uid,
                type: "unlock_content",
                amount: -drop.unlockCost,
                relatedDropId: drop.id,
                description: `Unlocked: ${drop.title}`,
                timestamp: serverTimestamp()
            });

            // Commit Batch
            await batch.commit();

            toast.success(`Unwrapped: ${drop.title}`, {
                description: "Enjoy your exclusive content!",
                icon: "🔓",
                duration: 4000
            });

            // Trigger confetti
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#ec4899', '#06b6d4', '#facc15']
            });

            // Analytics
            if (typeof window !== "undefined") {
                import("firebase/analytics").then(({ getAnalytics, logEvent }) => {
                    const analytics = getAnalytics();
                    logEvent(analytics, "spend_virtual_currency", {
                        value: drop.unlockCost,
                        virtual_currency_name: "Gum Drops",
                        item_name: drop.title
                    });
                });
            }

        } catch (err) {
            console.error("Unwrap failed:", err);
            toast.error("Unwrap failed", {
                description: "Please try again later."
            });
            setError("Unwrap failed. Try again.");
        } finally {
            setUnlocking(false);
        }
    };

    return (
        <div
            className="group relative p-2 md:p-6 rounded-2xl md:rounded-3xl glass-panel transition-all duration-500 hover:-translate-y-2 overflow-hidden"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-brand-pink/5 via-transparent to-brand-cyan/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            {/* Image / Content Container */}
            <div className="relative w-full aspect-square bg-black/40 rounded-xl md:rounded-2xl mb-2 md:mb-5 overflow-hidden group/image shadow-inner border border-white/5">
                {isUnlocked ? (
                    // UNLOCKED STATE: Show Content
                    drop.contentUrl ? (
                        <div className="w-full h-full relative animate-in fade-in duration-700">
                            {['mp4', 'webm'].some(ext => drop.contentUrl.includes(ext)) ? (
                                <video src={drop.contentUrl} controls className="w-full h-full object-cover" />
                            ) : (
                                <NextImage
                                    src={drop.contentUrl}
                                    alt="Unlocked Content"
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                />
                            )}
                            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover/image:opacity-100 transition-opacity duration-300">
                                <span className="font-bold text-brand-green bg-black/90 px-4 py-2 rounded-full border border-brand-green/30 shadow-lg shadow-brand-green/20">View Content</span>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-brand-green/10 to-transparent text-brand-green font-bold border border-brand-green/20">
                            <Unlock className="w-8 h-8 mb-2 opacity-50" />
                            <span className="tracking-widest text-xs">UNWRAPPED</span>
                        </div>
                    )
                ) : (
                    // LOCKED STATE: Show Preview/Placeholder
                    drop.imageUrl ? (
                        <NextImage
                            src={drop.imageUrl}
                            alt={drop.title}
                            fill
                            priority={priority} // Prioritize based on grid position
                            className="object-cover group-hover:scale-105 transition-transform duration-700 opacity-70 group-hover:opacity-100"
                            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw" // Corrected: Mobile is 2-col (50vw), not 1-col
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-5xl bg-zinc-900/50">🍬</div>
                    )
                )}

                {/* Hot Badge */}
                {drop.totalUnlocks > 50 && !isUnlocked && (
                    <div className="absolute top-2 left-2 md:top-3 md:left-3 bg-brand-orange/90 backdrop-blur-md px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-bold text-white flex items-center gap-1 shadow-lg animate-pulse">
                        🔥 Hot
                    </div>
                )}

                <div className={cn(
                    "absolute top-2 right-2 md:top-3 md:right-3 backdrop-blur-xl px-2 py-0.5 md:px-3 md:py-1.5 rounded-full text-[10px] md:text-xs font-mono font-medium flex items-center gap-1 border shadow-lg transition-colors",
                    timeLeft.includes("h ") || timeLeft.includes("m ") // Less than 24h
                        ? "bg-red-500/80 text-white border-red-500/50 animate-pulse"
                        : "bg-black/40 text-white border-white/10"
                )}>
                    <Clock className="w-3 h-3" />
                    {timeLeft}
                </div>
            </div>

            <div className="relative z-10">
                <div className="mb-2 md:mb-4">
                    <h3 className="text-sm md:text-xl font-bold text-white mb-0.5 md:mb-1 leading-tight tracking-tight">{drop.title}</h3>
                    <p className="text-[10px] md:text-sm text-gray-400 line-clamp-2 font-medium leading-relaxed">{drop.description}</p>
                </div>

                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 md:gap-2 px-2 py-1 md:px-3 md:py-1.5 bg-brand-yellow/10 rounded-lg border border-brand-yellow/20">
                        <span className="text-brand-yellow font-bold text-[10px] md:text-sm tracking-wide whitespace-nowrap">{drop.unlockCost} Drops</span>
                    </div>

                    {isUnlocked ? (
                        <button disabled className="px-3 py-1.5 md:px-5 md:py-2.5 rounded-lg md:rounded-xl font-bold text-xs md:text-sm bg-brand-green/10 text-brand-green flex items-center gap-1.5 md:gap-2 border border-brand-green/20 opacity-80">
                            <Unlock className="w-3 h-3 md:w-4 md:h-4" />
                            Unwrapped
                        </button>
                    ) : (
                        <button
                            onClick={handleUnlock}
                            disabled={unlocking || !user}
                            className={cn(
                                "px-4 py-1.5 md:px-6 md:py-2.5 rounded-lg md:rounded-xl font-bold text-xs md:text-sm transition-all flex items-center gap-1.5 md:gap-2 border relative overflow-hidden",
                                canAfford
                                    ? "bg-white text-black border-white hover:bg-brand-pink hover:border-brand-pink hover:text-white shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_25px_rgba(236,72,153,0.4)]"
                                    : "bg-white/5 text-gray-500 border-white/5 cursor-not-allowed",
                                "disabled:opacity-50 disabled:cursor-not-allowed active:scale-95",
                                canAfford && !unlocking ? "animate-pulse" : ""
                            )}
                        >
                            {unlocking ? (
                                <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" />
                            ) : (
                                <Lock className="w-3 h-3 md:w-4 md:h-4" />
                            )}
                            {error ? "Error" : "Unwrap"}
                        </button>
                    )}
                </div>
                {error && (
                    <div className="mt-2 md:mt-3 text-[10px] md:text-xs text-red-400 flex items-center justify-center gap-1.5 animate-bounce font-medium bg-red-500/10 py-1 rounded-md border border-red-500/10">
                        <AlertCircle className="w-3 h-3" /> {error}
                    </div>
                )}
            </div>
        </div>
    );
}

export const DropCard = memo(DropCardBase);
