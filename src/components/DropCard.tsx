"use client";

import { Drop } from "@/types/db";
import { getSimulatedUnwrapsToday } from "@/lib/unwrap-simulator";
import { useEffect, useState, memo, useMemo } from "react";
import NextImage from "next/image";
import { Lock, Unlock, Clock, Loader2, AlertCircle, Eye, Image as ImageIcon, Film } from "lucide-react";

import { cn } from "@/lib/utils";

import { toast } from "sonner";
import { User } from "firebase/auth";
import { authFetch } from "@/lib/authFetch";
import { useUserProfile } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { getAnalytics, logEvent } from "firebase/analytics";
import { app } from "@/lib/firebase";
import Link from "next/link";
import { SupportedAspectRatio, getSupportedDropAspectRatio } from "@/lib/drop-presentation";


interface DropCardProps {
    drop: Drop;
    priority?: boolean;
    user: User | null;
    isUnlocked?: boolean;
    canAfford?: boolean;
    onPreview: (drop: Drop) => void;
    aspectRatio?: SupportedAspectRatio;
}

interface DropCardBadgeProps {
    label: string;
    compact?: boolean;
}

const CATEGORY_TAGS = new Set(["Sweet", "Spicy", "RAW"]);

const DropCardBadge = ({ label, compact = false }: DropCardBadgeProps) => (
    <div
        className={cn(
            "backdrop-blur-md rounded-full font-bold text-white shadow-lg border w-fit",
            compact ? "px-2 py-0.5 text-[9px]" : "px-2 py-0.5 md:px-3 md:py-1 text-[10px] md:text-xs",
            "bg-brand-purple/80 border-white/10",
            label === "Sweet" && "bg-brand-purple/90",
            label === "Spicy" && "bg-white/20 border-white/20",
            label === "RAW" && "bg-zinc-800/80 border-white/20"
        )}
    >
        {label}
    </div>
);

interface FileCountChipProps {
    images: number;
    videos: number;
    compact?: boolean;
}

const FileCountChip = ({ images, videos, compact = false }: FileCountChipProps) => {
    if (images === 0 && videos === 0) return null;

    return (
        <div className={cn(
            "backdrop-blur-md rounded-full font-bold text-white shadow-xl border border-white/20 flex items-center gap-2 bg-black/60 z-30",
            compact ? "px-2 py-0.5 text-[9px] gap-1.5" : "px-3 py-1 text-[10px] md:text-xs"
        )}>
            {images > 0 && (
                <div className="flex items-center gap-1">
                    <ImageIcon className={compact ? "w-2.5 h-2.5" : "w-3 h-3 md:w-3.5 md:h-3.5"} />
                    <span>{images}</span>
                </div>
            )}
            {videos > 0 && (
                <div className="flex items-center gap-1">
                    <Film className={compact ? "w-2.5 h-2.5" : "w-3 h-3 md:w-3.5 md:h-3.5"} />
                    <span>{videos}</span>
                </div>
            )}
        </div>
    );
};

function DropCardTimer({ validUntil }: { validUntil?: number }) {
    const [timeLeft, setTimeLeft] = useState("Ends soon");

    useEffect(() => {
        const updateTimer = () => {
            if (!validUntil) {
                setTimeLeft("No end date");
                return;
            }

            const msLeft = Math.max(0, validUntil - Date.now());

            if (msLeft === 0) {
                setTimeLeft("Expired");
                return;
            }

            const ONE_DAY_MS = 24 * 60 * 60 * 1000;
            if (msLeft >= ONE_DAY_MS) {
                const days = Math.ceil(msLeft / ONE_DAY_MS);
                setTimeLeft(`Ends in ${days} day${days === 1 ? "" : "s"}`);
                return;
            }

            const totalSeconds = Math.floor(msLeft / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            const pad = (value: number) => value.toString().padStart(2, "0");
            setTimeLeft(`Ends in ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
        };

        updateTimer();
        const interval = window.setInterval(updateTimer, 1000);
        return () => window.clearInterval(interval);
    }, [validUntil]);

    return (
        <div className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-black/60 px-2.5 py-1 text-[10px] md:text-xs font-mono font-semibold text-white">
            <Clock className="h-3 w-3 text-brand-purple" />
            <span>{timeLeft}</span>
        </div>
    );
}

function DropCardBase({ drop, priority = false, user, isUnlocked = false, canAfford = false, onPreview, aspectRatio }: DropCardProps) {
    const { userProfile, setUserProfile } = useUserProfile();
    const { openInsufficientBalanceModal } = useUI();
    const [unlocking, setUnlocking] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasTrackedView, setHasTrackedView] = useState(false);

    // Compute deterministic simulative unwraps (client-side only to avoid hydration mismatches)
    const [simulativeUnwraps, setSimulativeUnwraps] = useState(0);

    useEffect(() => {
        setSimulativeUnwraps(getSimulatedUnwrapsToday(drop.id));
    }, [drop.id]);

    useEffect(() => {
        if (!hasTrackedView) {
            try {
                const analytics = getAnalytics(app);
                logEvent(analytics, 'view_drop_details', {
                    drop_id: drop.id,
                    drop_category: drop.type,
                    is_unlocked: !!isUnlocked
                });
            } catch (err) {
                // Ignore tracking init failures
            }
            setHasTrackedView(true);
        }
    }, [hasTrackedView, drop.id, drop.type, isUnlocked]);

    const resolvedRatio = aspectRatio ?? getSupportedDropAspectRatio(drop);
    const ratioStyle = { aspectRatio: resolvedRatio.replace(":", " / ") };

    const displayedTags = useMemo(() => {
        return (drop.tags || []).filter((tag) => CATEGORY_TAGS.has(tag)).slice(0, 3);
    }, [drop.tags]);

    const fileCounts = useMemo(() => {
        if (drop.mediaCounts) return drop.mediaCounts;

        let images = 0;
        let videos = 0;

        const urls = drop.contentUrls || [];
        if (urls.length > 0) {
            urls.forEach(url => {
                const lowerUrl = url.toLowerCase();
                if (lowerUrl.match(/\.(mp4|webm|ogg|mov)$/)) videos++;
                else if (lowerUrl.match(/\.(jpg|jpeg|png|gif|webp)$/)) images++;
                else images++; // Assume image if unknown for now based on legacy KandyDrops behavior
            });
        } else if (drop.contentUrl) {
            const lowerUrl = drop.contentUrl.toLowerCase();
            if (lowerUrl.match(/\.(mp4|webm|ogg|mov)$/)) videos++;
            else images++;
        }

        return { images, videos };
    }, [drop.contentUrls, drop.contentUrl, drop.mediaCounts]);

    // Handle unlocking flow
    if (drop.validUntil && Date.now() > drop.validUntil && !isUnlocked) {
        return null;
    }

    const triggerHaptic = () => {
        if (typeof navigator !== "undefined" && navigator.vibrate) {
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

            try {
                const analytics = getAnalytics(app);
                logEvent(analytics, 'unlock_drop_success', {
                    drop_id: drop.id,
                    drop_category: drop.type,
                    unlock_cost: drop.unlockCost || 0
                });
            } catch (err) {
                // Ignore tracking failures
            }

            toast.success(`Unwrapped: ${drop.title}`, {
                description: "Enjoy your exclusive content!",
                icon: "🔓",
                duration: 4000,
            });

            if (userProfile) {
                const currentUnlocked = Array.isArray(userProfile.unlockedContent) ? userProfile.unlockedContent : [];
                const nextUnlockedContent = currentUnlocked.includes(drop.id) ? currentUnlocked : [...currentUnlocked, drop.id];
                const unwrappedAt = Number.isFinite(result.unwrappedAt) ? Math.floor(result.unwrappedAt) : Date.now();

                setUserProfile({
                    ...userProfile,
                    gumDropsBalance: result.newBalance !== undefined ? result.newBalance : userProfile.gumDropsBalance - drop.unlockCost,
                    unlockedContent: nextUnlockedContent,
                    unlockedContentTimestamps: {
                        ...(userProfile.unlockedContentTimestamps || {}),
                        [drop.id]: unwrappedAt,
                    },
                });
            }
        } catch (err: any) {
            console.error("Unwrap failed:", err);
            toast.error("Unwrap failed", {
                description: err.message || "Please try again later.",
            });
            setError(err.message || "Unwrap failed. Try again.");
        } finally {
            setUnlocking(false);
        }
    };

    const ctaButton = isUnlocked ? (
        <Link
            href={`/dashboard/viewer?id=${drop.id}`}
            onClick={triggerHaptic}
            className="px-3 py-1.5 md:px-5 md:py-2.5 rounded-lg md:rounded-xl font-bold text-xs md:text-sm bg-brand-purple/10 text-brand-purple flex items-center justify-center w-full whitespace-nowrap gap-1.5 md:gap-2 border border-brand-purple/20 transition-all active:scale-95"
        >
            <Unlock className="w-3 h-3 md:w-4 md:h-4" />
            View Content
        </Link>
    ) : (
        <button
            onClick={handleUnlock}
            disabled={unlocking || !user}
            className={cn(
                "px-3 py-1.5 md:px-5 md:py-2.5 rounded-lg md:rounded-xl font-bold text-xs md:text-sm flex items-center justify-center w-full whitespace-nowrap gap-1.5 md:gap-2 border relative overflow-hidden",
                canAfford ? "bg-white text-black border-white" : "bg-white/5 text-gray-500 border-white/5 cursor-not-allowed",
                "disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
            )}
        >
            {unlocking ? (
                <>
                    <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" />
                    <span>Unwrapping...</span>
                </>
            ) : (
                <>
                    <Lock className="w-3 h-3 md:w-4 md:h-4" />
                    <span>Unwrap</span>
                </>
            )}
        </button>
    );

    if (resolvedRatio === "9:16") {
        return (
            <div className="group relative p-1.5 md:p-3 rounded-2xl md:rounded-3xl glass-panel overflow-hidden h-full flex flex-col">
                <button
                    onClick={() => {
                        fetch(`/api/drops/${drop.id}/click`, { method: "POST" }).catch(() => { });
                        onPreview(drop);
                    }}
                    className="relative w-full rounded-xl md:rounded-2xl overflow-hidden border border-white/10 bg-black text-left flex-shrink-0" style={ratioStyle}
                >
                    <NextImage
                        src={drop.imageUrl || "/placeholder.jpg"}
                        alt={drop.title}
                        fill
                        priority={priority}
                        className={cn("object-cover object-center bg-black transition-all duration-500", imageLoaded ? "scale-100" : "scale-105")}
                        onLoadingComplete={() => setImageLoaded(true)}
                        sizes="(max-width: 768px) 25vw, 180px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute top-1.5 right-1.5 z-10">
                        <FileCountChip images={fileCounts.images} videos={fileCounts.videos} compact />
                    </div>
                    <div className="absolute bottom-1.5 left-1.5 right-1.5 space-y-1">
                        {displayedTags.length > 0 ? <DropCardBadge label={displayedTags[0]} compact /> : null}
                        <p className="text-[10px] font-bold text-white line-clamp-2 leading-tight">{drop.title}</p>
                    </div>
                </button>
                <div className="mt-2 flex flex-col gap-2 flex-grow justify-between">
                    <div className="flex flex-col gap-2 items-start">
                        <DropCardTimer validUntil={drop.validUntil} />
                        <div className="inline-flex px-2 py-1 rounded-md border border-brand-purple/20 bg-brand-purple/10 text-brand-purple font-bold text-[10px] w-fit">
                            {drop.unlockCost} GD
                        </div>
                    </div>
                    <div className="space-y-1.5 w-full">
                        {ctaButton}
                        <div className="flex items-center justify-center gap-1 opacity-60 text-[9px] font-medium text-white/80">
                            <Eye className="w-2.5 h-2.5" />
                            <span>{simulativeUnwraps} unwrapped today</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="group relative p-2 md:p-5 rounded-2xl md:rounded-3xl glass-panel overflow-hidden h-full">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-purple/5 via-transparent to-brand-purple/5 pointer-events-none" />

            <button
                onClick={() => {
                    fetch(`/api/drops/${drop.id}/click`, { method: "POST" }).catch(() => { });
                    onPreview(drop);
                }}
                className="relative w-full bg-black/40 rounded-xl md:rounded-2xl mb-3 md:mb-4 overflow-hidden group/image shadow-inner border border-white/5 text-left"
                style={ratioStyle}
            >
                {drop.imageUrl ? (
                    <>
                        <NextImage
                            src={drop.imageUrl}
                            alt={drop.title}
                            fill
                            priority={priority}
                            className={cn("object-cover object-center bg-black transition-all duration-700 opacity-90", imageLoaded ? "scale-100 blur-0" : "scale-105 blur-md")}
                            onLoadingComplete={() => setImageLoaded(true)}
                            sizes={resolvedRatio === "16:9" ? "(max-width: 768px) 100vw, 720px" : "(max-width: 768px) 50vw, 360px"}
                        />
                        {!imageLoaded && (
                            <div className="absolute inset-0 bg-zinc-800/80 overflow-hidden">
                                <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                            </div>
                        )}
                    </>
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl bg-zinc-900/50">🍬</div>
                )}
                <div className="absolute top-2 md:top-3 right-2 md:right-3 z-10 transition-transform group-hover/image:scale-110">
                    <FileCountChip images={fileCounts.images} videos={fileCounts.videos} />
                </div>
            </button>

            <div className="relative z-10 space-y-2 md:space-y-3">
                {displayedTags.length > 0 ? <DropCardBadge label={displayedTags[0]} /> : null}
                <DropCardTimer validUntil={drop.validUntil} />

                <div>
                    <h3 className="text-sm md:text-xl font-bold text-white mb-0.5 md:mb-1 leading-tight tracking-tight">{drop.title}</h3>
                    <p className="text-[10px] md:text-sm text-gray-400 line-clamp-2 font-medium leading-relaxed">{drop.description}</p>
                </div>

                <div className="flex flex-col items-start gap-2 md:gap-3">
                    <div className="flex items-center gap-1 md:gap-2 px-2 py-1 md:px-3 md:py-1.5 bg-brand-purple/10 rounded-lg border border-brand-purple/20 w-fit">
                        <span className="text-brand-purple font-bold text-[10px] md:text-sm tracking-wide whitespace-nowrap">{drop.unlockCost} GD</span>
                    </div>
                    <div className="space-y-1.5 w-full">
                        {ctaButton}
                        <div className="flex items-center justify-center gap-1 opacity-60 text-[9px] font-medium text-white/80">
                            <Eye className="w-2.5 h-2.5" />
                            <span>{simulativeUnwraps} unwrapped today</span>
                        </div>
                    </div>
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
