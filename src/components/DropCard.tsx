"use client";

import { Drop } from "@/types/db";
import { getSimulatedUnwrapsToday } from "@/lib/unwrap-simulator";
import { useEffect, useState, memo, useMemo } from "react";
import NextImage from "next/image";
import { Lock, Unlock, Clock, Loader2, AlertCircle, Eye, Image as ImageIcon, Film, Wallet } from "lucide-react";

import { cn } from "@/lib/utils";

import { toast } from "sonner";
import { User } from "firebase/auth";
import { authFetch } from "@/lib/authFetch";
import { useUserProfile } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { trackEvent } from "@/lib/telemetry";
import Link from "next/link";
import { SupportedAspectRatio, getDropMediaSummary, getSupportedDropAspectRatio } from "@/lib/drop-presentation";
import { SECONDARY_UNWRAP_CTA } from "@/lib/marketing-copy";


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
    const [isUrgent, setIsUrgent] = useState(false);
    const [isCritical, setIsCritical] = useState(false);

    useEffect(() => {
        const updateTimer = () => {
            if (!validUntil) {
                setTimeLeft("No end date");
                return;
            }

            const msLeft = Math.max(0, validUntil - Date.now());
            const ONE_HOUR_MS = 60 * 60 * 1000;
            const ONE_DAY_MS = 24 * ONE_HOUR_MS;

            setIsUrgent(msLeft > 0 && msLeft <= ONE_DAY_MS);
            setIsCritical(msLeft > 0 && msLeft <= ONE_HOUR_MS);

            if (msLeft === 0) {
                setTimeLeft("Expired");
                return;
            }

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
        <div className={cn(
            "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[10px] md:text-xs font-mono font-bold transition-colors",
            isCritical ? "bg-red-500/10 border-red-500/30 text-red-500 animate-pulse" :
                isUrgent ? "bg-orange-500/10 border-orange-500/30 text-orange-400" :
                    "border-white/20 bg-black/60 text-white"
        )}>
            <Clock className={cn("h-3 w-3", isCritical ? "text-red-500" : isUrgent ? "text-orange-400" : "text-brand-purple")} />
            <span>{timeLeft}</span>
        </div>
    );
}

function DropCardBase({ drop, priority = false, user, isUnlocked = false, canAfford = false, onPreview, aspectRatio }: DropCardProps) {
    const { userProfile, setUserProfile } = useUserProfile();
    const { openAuthModal, openPurchaseModal } = useUI();
    const [unlocking, setUnlocking] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasTrackedImpression, setHasTrackedImpression] = useState(false);

    // Compute deterministic simulative unwraps (client-side only to avoid hydration mismatches)
    const [simulativeUnwraps, setSimulativeUnwraps] = useState(0);

    useEffect(() => {
        setSimulativeUnwraps(getSimulatedUnwrapsToday(drop.id));
    }, [drop.id]);

    useEffect(() => {
        let timeout: ReturnType<typeof setTimeout>;
        if (confirming) {
            timeout = setTimeout(() => setConfirming(false), 3500);
        }
        return () => clearTimeout(timeout);
    }, [confirming]);

    useEffect(() => {
        if (!hasTrackedImpression) {
            trackEvent("drop_card_impression", {
                drop_id: drop.id,
                drop_category: drop.type,
                is_unlocked: !!isUnlocked,
            });
            setHasTrackedImpression(true);
        }
    }, [drop.id, drop.type, hasTrackedImpression, isUnlocked]);

    const resolvedRatio = aspectRatio ?? getSupportedDropAspectRatio(drop);
    const ratioStyle = { aspectRatio: resolvedRatio.replace(":", " / ") };

    const displayedTags = useMemo(() => {
        return (drop.tags || []).filter((tag) => CATEGORY_TAGS.has(tag)).slice(0, 3);
    }, [drop.tags]);

    const fileCounts = useMemo(() => {
        const summary = getDropMediaSummary(drop);
        return {
            images: summary.imageCount,
            videos: summary.videoCount,
        };
    }, [drop]);

    // Handle unlocking flow
    if (drop.validUntil && Date.now() > drop.validUntil && !isUnlocked) {
        return null;
    }

    const triggerHaptic = () => {
        if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate(10);
        }
    };

    const handlePreviewOpen = () => {
        trackEvent("view_drop_details", {
            drop_id: drop.id,
            drop_category: drop.type,
            is_unlocked: !!isUnlocked,
        });
        fetch(`/api/drops/${drop.id}/click`, { method: "POST" }).catch(() => { });
        onPreview(drop);
    };

    const handleUnlock = async () => {
        if (!user) {
            openAuthModal("signup");
            return;
        }

        if (unlocking || isUnlocked) return;

        const balance = userProfile?.gumDropsBalance ?? 0;
        if (balance < drop.unlockCost) {
            openPurchaseModal();
            return;
        }

        if (!confirming) {
            setConfirming(true);
            triggerHaptic();
            return;
        }

        setConfirming(false);
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

            trackEvent('unlock_drop_success', {
                drop_id: drop.id,
                drop_category: drop.type,
                unlock_cost: drop.unlockCost || 0
            });

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
            className="px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl font-bold text-[11px] md:text-xs bg-brand-purple/10 text-brand-purple flex items-center justify-center w-full whitespace-nowrap gap-1.5 border border-brand-purple/20 transition-all active:scale-95"
        >
            <Unlock className="w-3 h-3" />
            View Content
        </Link>
    ) : (
        <button
            onClick={handleUnlock}
            disabled={unlocking}
            className={cn(
                "px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl font-bold text-[11px] md:text-xs flex items-center justify-center w-full whitespace-nowrap gap-1.5 border relative overflow-hidden transition-all active:scale-95 shadow-lg",
                !canAfford ? "bg-brand-purple text-black border-brand-purple hover:bg-[#b28cff] shadow-[0_0_15px_rgba(164,118,255,0.3)]"
                    : confirming ? "bg-orange-500 text-white border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.4)]"
                        : "bg-white text-black border-white hover:bg-gray-100",
                "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
        >
            {unlocking ? (
                <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Unwrapping...</span>
                </>
            ) : !user ? (
                <>
                    <Lock className="w-3 h-3" />
                    <span>{SECONDARY_UNWRAP_CTA}</span>
                </>
            ) : !canAfford ? (
                <>
                    <Wallet className="w-3 h-3" />
                    <span>Get Gum Drops</span>
                </>
            ) : confirming ? (
                <>
                    <Lock className="w-3 h-3" />
                    <span>Confirm {drop.unlockCost} GD?</span>
                </>
            ) : (
                <>
                    <Lock className="w-3 h-3" />
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
                        handlePreviewOpen();
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
                    <div className="space-y-2 w-full">
                        <div className="flex items-center justify-between w-full">
                            <div className="inline-flex px-2 py-1 rounded-md border border-brand-purple/20 bg-brand-purple/10 text-brand-purple font-bold text-[10px] w-fit">
                                {drop.unlockCost} GD
                            </div>
                            <div className="flex items-center gap-1 opacity-60 text-[9px] font-medium text-white/80">
                                <Eye className="w-2.5 h-2.5" />
                                <span>{simulativeUnwraps}</span>
                            </div>
                        </div>
                        {ctaButton}
                    </div>
                    <div className="mt-auto pt-1">
                        <DropCardTimer validUntil={drop.validUntil} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="group relative p-2 md:p-3 rounded-2xl md:rounded-3xl glass-panel overflow-hidden h-full flex flex-col">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-purple/5 via-transparent to-brand-purple/5 pointer-events-none" />

            <button
                onClick={() => {
                    handlePreviewOpen();
                }}
                className="relative w-full bg-black/40 rounded-xl md:rounded-2xl mb-2 md:mb-3 overflow-hidden group/image shadow-inner border border-white/5 text-left flex-shrink-0"
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
                    <h3 className="text-sm md:text-base font-bold text-white mb-0.5 md:mb-1 leading-tight tracking-tight line-clamp-1">{drop.title}</h3>
                    <p className="text-[10px] md:text-xs text-gray-400 line-clamp-1 font-medium leading-relaxed">{drop.description}</p>
                </div>

                <div className="flex flex-col items-start gap-1.5 md:gap-2 mt-auto pt-1">
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-1 md:gap-2 px-2 py-1 bg-brand-purple/10 rounded-lg border border-brand-purple/20">
                            <span className="text-brand-purple font-bold text-[10px] md:text-xs tracking-wide whitespace-nowrap">{drop.unlockCost} GD</span>
                        </div>
                        <div className="flex items-center gap-1 opacity-60 text-[9px] font-medium text-white/80">
                            <Eye className="w-2.5 h-2.5" />
                            <span>{simulativeUnwraps}</span>
                        </div>
                    </div>
                    <div className="w-full">
                        {ctaButton}
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
