"use client";

import { Drop } from "@/types/db";
import { useEffect, useState, memo } from "react";
import { formatDistanceToNow } from "date-fns";
import NextImage from "next/image";
import { Lock, Unlock, Clock, Loader2, AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";

import { toast } from "sonner";
import { User } from "firebase/auth";
import { authFetch } from "@/lib/authFetch";
import { useUserProfile } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import Link from "next/link";
interface DropCardProps {
    drop: Drop;
    priority?: boolean;
    user: User | null;
    isUnlocked?: boolean;
    canAfford?: boolean;
}

interface DropCardBadgeProps {
    type: 'hot' | 'tag';
    label: string;
    index?: number;
}

const DropCardBadge = ({ type, label, index = 0 }: DropCardBadgeProps) => (
    <div
        className={cn(
            "backdrop-blur-md px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-bold text-white shadow-lg border animate-in slide-in-from-left-2 duration-300",
            type === 'hot' ? "bg-brand-orange/90 border-transparent" : "bg-brand-purple/80 border-white/10",
            label === 'Sweet' && "bg-pink-500/80",
            label === 'Spicy' && "bg-red-500/80",
            label === 'RAW' && "bg-zinc-800/80 border-white/20"
        )}
        style={{ animationDelay: `${index * 100}ms` }}
    >
        {type === 'hot' && "🔥 "}
        {label}
    </div>
);

interface DropCardTimerProps {
    validFrom: number;
    validUntil?: number;
}

const DropCardTimer = ({ validFrom, validUntil }: DropCardTimerProps) => {
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
                    const diff = validUntil - now;
                    if (diff > 24 * 60 * 60 * 1000) {
                        setTimeLeft(formatDistanceToNow(validUntil, { addSuffix: true }));
                    } else {
                        const seconds = Math.floor((diff / 1000) % 60);
                        const minutes = Math.floor((diff / 1000 / 60) % 60);
                        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
                        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
                    }
                }
            } else {
                setTimeLeft("Expired");
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [validFrom, validUntil]);

    return (
        <div className={cn(
            "absolute top-2 right-2 md:top-3 md:right-3 backdrop-blur-xl px-2 py-0.5 md:px-3 md:py-1.5 rounded-full text-[10px] md:text-xs font-mono font-medium flex items-center gap-1 border shadow-lg z-10",
            timeLeft.includes("h ") || timeLeft.includes("m ")
                ? "bg-red-500/80 text-white border-red-500/50"
                : "bg-black/40 text-white border-white/10"
        )}>
            <Clock className="w-3 h-3" />
            {timeLeft}
        </div>
    );
};

function DropCardBase({ drop, priority = false, user, isUnlocked = false, canAfford = false }: DropCardProps) {
    const { userProfile, setUserProfile } = useUserProfile();
    const { openInsufficientBalanceModal } = useUI();
    const [unlocking, setUnlocking] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const triggerHaptic = () => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(10);
        }
    };

    const handleUnlock = async () => {
        if (!user || unlocking || isUnlocked) return;

        const balance = userProfile?.gumDropsBalance ?? 0;
        if (balance < drop.unlockCost) {
            openInsufficientBalanceModal(drop.unlockCost);
            return;
        }

        setUnlocking(true);
        setError(null);

        try {
            triggerHaptic();
            const response = await authFetch("/api/drops/unlock", {

                method: "POST",
                body: JSON.stringify({ dropId: drop.id }),
            });

            const result = await response.json();

            if (!response.ok) {
                if (result.alreadyUnlocked) {
                    toast.info("Already unwrapped!");
                    return;
                }
                throw new Error(result.error || "Unlock failed");
            }

            toast.success(`Unwrapped: ${drop.title}`, {
                description: "Enjoy your exclusive content!",
                icon: "🔓",
                duration: 4000
            });

            // Optimistic hot-reload of UserProfile state to bypass any listener latency
            if (userProfile) {
                setUserProfile({
                    ...userProfile,
                    gumDropsBalance: result.newBalance !== undefined ? result.newBalance : userProfile.gumDropsBalance - drop.unlockCost,
                    unlockedContent: [...(userProfile.unlockedContent || []), drop.id]
                });
            }

            import("canvas-confetti").then((mod) => {
                mod.default({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#ec4899', '#06b6d4', '#facc15']
                });
            });

            if (typeof window !== "undefined") {
                import("firebase/analytics").then(({ getAnalytics, logEvent }) => {
                    const analytics = getAnalytics();
                    logEvent(analytics, "spend_virtual_currency", {
                        value: drop.unlockCost,
                        virtual_currency_name: "Gum Drops",
                        item_name: drop.title
                    });
                }).catch(() => { });
            }

        } catch (err: any) {
            console.error("Unwrap failed:", err);
            toast.error("Unwrap failed", {
                description: err.message || "Please try again later."
            });
            setError(err.message || "Unwrap failed. Try again.");
        } finally {
            setUnlocking(false);
        }
    };

    return (
        <div className="group relative p-2 md:p-6 rounded-2xl md:rounded-3xl glass-panel overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-pink/5 via-transparent to-brand-cyan/5 pointer-events-none" />

            {/* Media Area */}
            <div className="relative w-full aspect-square bg-black/40 rounded-xl md:rounded-2xl mb-2 md:mb-5 overflow-hidden group/image shadow-inner border border-white/5">
                {isUnlocked ? (
                    <Link
                        href={`/dashboard/viewer?id=${drop.id}`}
                        className="w-full h-full relative block"
                        onClick={triggerHaptic}
                    >
                        {drop.imageUrl ? (
                            <>
                                <NextImage
                                    src={drop.imageUrl}
                                    alt={drop.title}
                                    fill
                                    className={cn(
                                        "object-contain bg-black transition-all duration-700",
                                        imageLoaded ? "scale-100 blur-0" : "scale-110 blur-xl"
                                    )}
                                    onLoadingComplete={() => setImageLoaded(true)}
                                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                                />
                                {!imageLoaded && (
                                    <div className="absolute inset-0 bg-zinc-800 animate-pulse" />
                                )}
                            </>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-brand-green/10 to-transparent text-brand-green font-bold border border-brand-green/20">
                                <Unlock className="w-8 h-8 mb-2 opacity-50" />
                                <span className="tracking-widest text-xs">UNWRAPPED</span>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover/image:opacity-100 transition-opacity">
                            <span className="font-bold text-brand-green bg-black/90 px-4 py-2 rounded-full border border-brand-green/30 shadow-lg shadow-brand-green/20">View Content</span>
                        </div>
                    </Link>


                ) : (
                    <div className="w-full h-full relative">
                        {drop.imageUrl ? (
                            <>
                                <NextImage
                                    src={drop.imageUrl}
                                    alt={drop.title}
                                    fill
                                    priority={priority}
                                    className={cn(
                                        "object-contain bg-black transition-all duration-700 opacity-80 ",
                                        imageLoaded ? "scale-100 blur-0" : "scale-110 blur-xl"
                                    )}
                                    onLoadingComplete={() => setImageLoaded(true)}
                                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                                />
                                {!imageLoaded && (
                                    <div className="absolute inset-0 bg-zinc-800 animate-pulse" />
                                )}
                            </>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-5xl bg-zinc-900/50">🍬</div>
                        )}
                    </div>
                )}


                {/* Overlays */}
                <div className="absolute top-2 left-2 md:top-3 md:left-3 flex flex-col gap-1 items-start z-10">
                    {drop.totalUnlocks > 50 && !isUnlocked && (
                        <DropCardBadge type="hot" label="Hot" />
                    )}
                    {drop.tags?.map((tag, i) => (
                        <DropCardBadge key={tag} type="tag" label={tag} index={i} />
                    ))}
                </div>

                <DropCardTimer validFrom={drop.validFrom} validUntil={drop.validUntil} />
            </div>

            <div className="relative z-10">
                <div className="mb-2 md:mb-4">
                    <h3 className="text-sm md:text-xl font-bold text-white mb-0.5 md:mb-1 leading-tight tracking-tight">{drop.title}</h3>
                    <p className="text-[10px] md:text-sm text-gray-400 line-clamp-2 font-medium leading-relaxed">{drop.description}</p>
                </div>

                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 md:gap-2 px-2 py-1 md:px-3 md:py-1.5 bg-brand-purple/10 rounded-lg border border-brand-purple/20">
                        <span className="text-brand-purple font-bold text-[10px] md:text-sm tracking-wide whitespace-nowrap">{drop.unlockCost} Drops</span>
                    </div>

                    {isUnlocked ? (
                        <Link
                            href={`/dashboard/viewer?id=${drop.id}`}
                            onClick={triggerHaptic}
                            className="px-3 py-1.5 md:px-5 md:py-2.5 rounded-lg md:rounded-xl font-bold text-xs md:text-sm bg-brand-green/10 text-brand-green flex items-center gap-1.5 md:gap-2 border border-brand-green/20 transition-all active:scale-95"
                        >
                            <Unlock className="w-3 h-3 md:w-4 md:h-4" />
                            View Content
                        </Link>
                    ) : (

                        <button
                            onClick={handleUnlock}
                            disabled={unlocking || !user}
                            className={cn(
                                "px-4 py-1.5 md:px-6 md:py-2.5 rounded-lg md:rounded-xl font-bold text-xs md:text-sm flex items-center gap-1.5 md:gap-2 border relative overflow-hidden",
                                canAfford
                                    ? "bg-white text-black border-white    shadow-[0_0_20px_rgba(255,255,255,0.15)] _0_25px_rgba(236,72,153,0.4)]"
                                    : "bg-white/5 text-gray-500 border-white/5 cursor-not-allowed",
                                "disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
                            )}
                        >
                            {unlocking ? (
                                <div className="flex items-center gap-2">
                                    <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" />
                                    <span>Unwrapping...</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Lock className="w-3 h-3 md:w-4 md:h-4" />
                                    <span>Unwrap</span>
                                </div>
                            )}
                            {error ? "Error" : null}
                        </button>

                    )}
                </div>
                {error && (
                    <div className="mt-2 md:mt-3 text-[10px] md:text-xs text-red-400 flex items-center justify-center gap-1.5 font-medium bg-red-500/10 py-1 rounded-md border border-red-500/10">
                        <AlertCircle className="w-3 h-3" /> {error}
                    </div>
                )}
            </div>
        </div>
    );
}

export const DropCard = memo(DropCardBase);

