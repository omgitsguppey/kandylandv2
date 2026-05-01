"use client";

import { Drop } from "@/types/db";
import { useEffect, useState, memo, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";

import { toast } from "sonner";
import { User } from "firebase/auth";
import { authFetch } from "@/lib/authFetch";
import { useUserProfile } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { trackEvent } from "@/lib/telemetry";
import { SupportedAspectRatio, getDropMediaSummary, getSupportedDropAspectRatio } from "@/lib/drop-presentation";
import { showUnwrapSuccessToast } from "@/components/Toasts/UnwrapSuccessToast";
import { getDropViewCount } from "@/lib/drop-engagement";
import { dispatchActivitySync } from "@/lib/activity-sync";
import { reportClientIssue } from "@/lib/client-error-reporting";
import { DropCardCta } from "@/components/DropCardCta";
import { DropCardLayout } from "@/components/DropCardLayout";
import { DROPS_MOBILE_UI_DENSITY, useDropCardImpression } from "@/hooks/useDropCardImpression";
import { getUnlockProblemCopy } from "@/lib/problem-state-copy";


interface DropCardProps {
    drop: Drop;
    priority?: boolean;
    user: User | null;
    isUnlocked?: boolean;
    canAfford?: boolean;
    onPreview: (drop: Drop) => void;
    aspectRatio?: SupportedAspectRatio;
    impressionTrackingSurface?: string;
    impressionTrackingSessionId?: string;
}

const CATEGORY_TAGS = new Set(["Sweet", "Spicy", "RAW"]);

function DropCardBase({
    drop,
    priority = false,
    user,
    isUnlocked = false,
    canAfford = false,
    onPreview,
    aspectRatio,
    impressionTrackingSurface,
    impressionTrackingSessionId,
}: DropCardProps) {
    const router = useRouter();
    const { userProfile, setUserProfile } = useUserProfile();
    const { openAuthModal, openPurchaseModal } = useUI();
    const [unlocking, setUnlocking] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const cardRef = useRef<HTMLDivElement | null>(null);
    const resolvedRatio = aspectRatio ?? getSupportedDropAspectRatio(drop);
    const ratioStyle = { aspectRatio: resolvedRatio.replace(":", " / ") };

    useEffect(() => {
        let timeout: ReturnType<typeof setTimeout>;
        if (confirming) {
            timeout = setTimeout(() => setConfirming(false), 3500);
        }
        return () => clearTimeout(timeout);
    }, [confirming]);

    useDropCardImpression({
        cardRef,
        drop,
        isUnlocked,
        aspectRatio: resolvedRatio,
        impressionTrackingSurface,
        impressionTrackingSessionId,
    });

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
    const totalViews = getDropViewCount(drop);

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
            drop_tags: (drop.tags || []).join("|"),
            card_aspect_ratio: resolvedRatio,
            source_component: "compact_drop_card",
            ui_density: DROPS_MOBILE_UI_DENSITY,
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
            trackEvent("drop_unwrap_intent_blocked_by_funds", {
                drop_id: drop.id,
                drop_category: drop.type,
                unlock_cost: drop.unlockCost,
                current_balance: balance,
                source_component: "compact_drop_card",
                ui_density: DROPS_MOBILE_UI_DENSITY,
            });
            openPurchaseModal(Math.max(1, drop.unlockCost - balance));
            return;
        }

        if (!confirming) {
            setConfirming(true);
            triggerHaptic();
            trackEvent("drop_unlock_attempted", {
                drop_id: drop.id,
                drop_category: drop.type,
                unlock_cost: drop.unlockCost,
                drop_tags: (drop.tags || []).join("|"),
                source_component: "compact_drop_card",
                ui_density: DROPS_MOBILE_UI_DENSITY,
            });
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
                unlock_cost: drop.unlockCost || 0,
                drop_tags: (drop.tags || []).join("|"),
                source_component: "compact_drop_card",
                ui_density: DROPS_MOBILE_UI_DENSITY,
            });

            if (userProfile) {
                const unwrappedAt = Number.isFinite(result.unwrappedAt) ? Math.floor(result.unwrappedAt) : Date.now();

                setUserProfile((currentProfile) => {
                    if (!currentProfile) {
                        return currentProfile;
                    }

                    const currentUnlocked = Array.isArray(currentProfile.unlockedContent) ? currentProfile.unlockedContent : [];
                    const nextUnlockedContent = currentUnlocked.includes(drop.id) ? currentUnlocked : [...currentUnlocked, drop.id];

                    return {
                        ...currentProfile,
                        gumDropsBalance: result.newBalance !== undefined ? result.newBalance : currentProfile.gumDropsBalance - drop.unlockCost,
                        unlockedContent: nextUnlockedContent,
                        unlockedContentTimestamps: {
                            ...(currentProfile.unlockedContentTimestamps || {}),
                            [drop.id]: unwrappedAt,
                        },
                    };
                });
            }

            dispatchActivitySync();
            showUnwrapSuccessToast({
                dropTitle: drop.title,
                onTaste: () => {
                    router.push(`/dashboard/viewer?id=${drop.id}`);
                },
            });
        } catch (err: unknown) {
            const problemCopy = getUnlockProblemCopy(err);
            reportClientIssue({
                channel: "payments",
                message: "Drop unwrap failed",
                error: err,
                detail: { dropId: drop.id, unlockCost: drop.unlockCost },
                consoleLabel: "[DropCard] Unwrap failed",
            });
            toast.error(problemCopy.headline, {
                description: problemCopy.body,
            });
            setError(problemCopy.body);
        } finally {
            setUnlocking(false);
        }
    };

    const ctaButton = (
        <DropCardCta
            drop={drop}
            user={user}
            isUnlocked={isUnlocked}
            canAfford={canAfford}
            unlocking={unlocking}
            confirming={confirming}
            onUnlock={handleUnlock}
            onHaptic={triggerHaptic}
        />
    );

    return (
        <DropCardLayout
            cardRef={cardRef}
            drop={drop}
            priority={priority}
            resolvedRatio={resolvedRatio}
            ratioStyle={ratioStyle}
            fileCounts={fileCounts}
            displayedTags={displayedTags}
            totalViews={totalViews}
            ctaButton={ctaButton}
            error={error}
            imageLoaded={imageLoaded}
            onImageLoaded={() => setImageLoaded(true)}
            onPreviewOpen={handlePreviewOpen}
        />
    );
}

export const DropCard = memo(DropCardBase);
