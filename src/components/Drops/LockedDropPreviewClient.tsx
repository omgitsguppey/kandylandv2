"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { LockedDropPreviewView } from "@/components/Drops/LockedDropPreviewView";
import { useAdminViewAs } from "@/context/AdminViewAsContext";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { dispatchActivitySync } from "@/lib/activity-sync";
import { authFetch } from "@/lib/authFetch";
import { formatDropCountdown } from "@/lib/drop-countdown";
import { buildPreviewTelemetryPayload } from "@/lib/drop-preview-telemetry";
import {
    getLockedDropPreviewMediaCounts,
    getLockedDropPreviewSocialProof,
    resolveLockedDropPreviewTruth,
    type LockedDropPreviewCreator,
    type LockedDropPreviewSafeDrop,
    type LockedDropPreviewTruth,
} from "@/lib/locked-drop-preview-truth";
import { applyUnlockedDropPreviewProfilePatch } from "@/lib/locked-drop-preview-profile";
import { getUnlockProblemCopy } from "@/lib/problem-state-copy";
import { clearTimedFlow, consumeTimedFlow, startTimedFlow, trackEvent } from "@/lib/telemetry";
import { useNow } from "@/hooks/useNow";

interface LockedDropPreviewClientProps {
    drop: LockedDropPreviewSafeDrop;
    creator: LockedDropPreviewCreator | null;
    sourceComponent?: string;
}

const PREVIEW_UNLOCK_FLOW_KEY = "drop_preview_unlock";

export function LockedDropPreviewClient({ drop, creator, sourceComponent = "direct_preview_route" }: LockedDropPreviewClientProps) {
    const router = useRouter();
    const { user, userProfile, loading: authLoading, setUserProfile } = useAuth();
    const { viewAsState } = useAdminViewAs();
    const { openAuthModal, openPurchaseModal } = useUI();
    const nowMs = useNow({ intervalMs: 1_000 });
    const [unlocking, setUnlocking] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [successTransactionId, setSuccessTransactionId] = useState<string | null>(null);
    const [successEntitlementId, setSuccessEntitlementId] = useState<string | null>(null);
    const [selectedReaction, setSelectedReaction] = useState<string | null>(null);
    const ctaViewedKeysRef = useRef<Set<string>>(new Set());
    const successStateViewedRef = useRef(false);
    const creatorCoverViewedKeyRef = useRef<string | null>(null);
    const trackIncompleteOnUnmountRef = useRef(true);
    const latestTelemetryPayloadRef = useRef<ReturnType<typeof buildPreviewTelemetryPayload> | null>(null);
    const actorUserId = user?.uid ?? userProfile?.uid ?? null;
    const viewAsCreatorId = viewAsState?.adminViewingAsRole === "creator" ? viewAsState.adminViewingAsUserId : null;
    const profileCreatorId = userProfile?.role === "creator" ? userProfile.uid : null;
    const activeCreatorId = viewAsCreatorId ?? profileCreatorId;

    const isUnlocked = Boolean(
        successTransactionId
        || userProfile?.unlockedContent?.includes(drop.id)
        || userProfile?.unlockedContentTimestamps?.[drop.id] !== undefined,
    );
    const truth = useMemo(
        () => resolveLockedDropPreviewTruth({
            drop,
            isAuthenticated: Boolean(user),
            isUnlocked,
            gumDropsBalance: userProfile?.gumDropsBalance,
            actorUserId,
            activeCreatorId,
            nowMs,
        }),
        [activeCreatorId, actorUserId, drop, isUnlocked, nowMs, user, userProfile?.gumDropsBalance],
    );
    const socialProof = useMemo(() => getLockedDropPreviewSocialProof(drop), [drop]);
    const mediaCounts = useMemo(() => getLockedDropPreviewMediaCounts(drop), [drop]);
    const countdown = useMemo(() => formatDropCountdown(drop.validUntil, nowMs), [drop.validUntil, nowMs]);
    const telemetryPayload = useMemo(() => buildPreviewTelemetryPayload({
        drop,
        creator,
        truth,
        sourceComponent,
        userId: user?.uid ?? null,
        authState: user ? "authenticated" : "guest",
    }), [creator, drop, sourceComponent, truth, user]);
    const getTelemetryPayload = useCallback(() => latestTelemetryPayloadRef.current ?? telemetryPayload, [telemetryPayload]);
    const getPreviewStateTelemetryPayload = useCallback(() => ({
        ...getTelemetryPayload(),
        dropId: drop.id,
        creatorId: drop.creatorId ?? drop.submittedByCreatorId ?? creator?.uid ?? "",
        actorUserId: actorUserId ?? "",
        sourceComponent: "drop_preview_page",
        source_component: "drop_preview_page",
        isGuest: truth.isGuest,
        isOwnerOrCreator: truth.isOwnerOrCreator,
        hasEnoughGumDrops: truth.hasEnoughGumDrops,
        hasUnlockedDrop: truth.hasUnlockedDrop,
        shouldBlurCover: truth.shouldBlurCover,
    }), [actorUserId, creator?.uid, drop.creatorId, drop.id, drop.submittedByCreatorId, getTelemetryPayload, truth.hasEnoughGumDrops, truth.hasUnlockedDrop, truth.isGuest, truth.isOwnerOrCreator, truth.shouldBlurCover]);
    const getCreatorPreviewTelemetryPayload = useCallback(() => ({
        ...getPreviewStateTelemetryPayload(),
        creatorPreviewEligible: true,
    }), [getPreviewStateTelemetryPayload]);

    trackIncompleteOnUnmountRef.current = !truth.isUnlocked && !successTransactionId;

    useEffect(() => {
        latestTelemetryPayloadRef.current = telemetryPayload;
    }, [telemetryPayload]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            const payload = latestTelemetryPayloadRef.current;
            if (!payload) return;
            trackEvent("drop_preview_opened", payload);
        }, 0);
        return () => window.clearTimeout(timer);
    }, [drop.id]);

    useEffect(() => {
        const key = `${drop.id}:${truth.ctaState}:${truth.shortfallGd}`;
        if (ctaViewedKeysRef.current.has(key)) return;

        ctaViewedKeysRef.current.add(key);
        const timer = window.setTimeout(() => {
            const payload = latestTelemetryPayloadRef.current;
            if (payload) {
                trackEvent("drop_preview_cta_viewed", payload);
            }
            const stateEvent = getPreviewCtaEventName(truth, "viewed");
            if (stateEvent) {
                trackEvent(stateEvent, getPreviewStateTelemetryPayload());
            }
        }, 0);
        return () => window.clearTimeout(timer);
    }, [drop.id, getPreviewStateTelemetryPayload, truth, truth.ctaState, truth.shortfallGd]);

    useEffect(() => {
        if (!truth.creatorCoverPreviewEligible) return;

        const key = `${drop.id}:${actorUserId ?? "unknown"}`;
        if (creatorCoverViewedKeyRef.current === key) return;

        creatorCoverViewedKeyRef.current = key;
        const timer = window.setTimeout(() => {
            trackEvent("drop_preview_creator_cover_viewed", getCreatorPreviewTelemetryPayload());
        }, 0);
        return () => window.clearTimeout(timer);
    }, [actorUserId, drop.id, getCreatorPreviewTelemetryPayload, truth.creatorCoverPreviewEligible]);

    useEffect(() => {
        const fiveSecondTimer = window.setTimeout(() => {
            const payload = latestTelemetryPayloadRef.current;
            if (payload) {
                trackEvent("drop_preview_idle_reached", { ...payload, idle_seconds: 5 });
            }
        }, 5_000);
        const fifteenSecondTimer = window.setTimeout(() => {
            const payload = latestTelemetryPayloadRef.current;
            if (payload) {
                trackEvent("drop_preview_idle_reached", { ...payload, idle_seconds: 15 });
            }
        }, 15_000);
        return () => {
            window.clearTimeout(fiveSecondTimer);
            window.clearTimeout(fifteenSecondTimer);
        };
    }, [drop.id]);

    useEffect(() => {
        return () => {
            if (trackIncompleteOnUnmountRef.current) {
                const payload = latestTelemetryPayloadRef.current;
                if (payload) {
                    trackEvent("drop_preview_closed_incomplete", payload);
                }
            }
        };
    }, [drop.id]);

    useEffect(() => {
        if (!confirming) return;

        const timer = window.setTimeout(() => setConfirming(false), 3_500);
        return () => window.clearTimeout(timer);
    }, [confirming]);

    useEffect(() => {
        if (!successTransactionId || successStateViewedRef.current) return;

        successStateViewedRef.current = true;
        trackEvent("drop_preview_unlock_success_state_viewed", {
            ...getTelemetryPayload(),
            transaction_id: successTransactionId,
            entitlement_id: successEntitlementId ?? "",
            price_gd: drop.unlockCost,
            sourceTruth: "client_supporting",
            idempotency_key: `${user?.uid ?? "unknown"}:preview_success_state:${drop.id}`,
        });
    }, [drop.id, drop.unlockCost, getTelemetryPayload, successEntitlementId, successTransactionId, user?.uid]);

    const handleReaction = (reactionKey: string, reactionLabel: string) => {
        setSelectedReaction(reactionKey);
        window.setTimeout(() => {
            trackEvent("drop_preview_feedback_reacted", {
                ...getTelemetryPayload(),
                reaction_key: reactionKey,
                reaction_label: reactionLabel,
            });
        }, 0);
    };

    const handleCtaClick = async () => {
        if (authLoading || unlocking) return;

        const payload = getTelemetryPayload();
        trackEvent("drop_preview_cta_clicked", payload);
        const stateClickEvent = getPreviewCtaEventName(truth, "clicked");
        if (stateClickEvent) {
            trackEvent(stateClickEvent, getPreviewStateTelemetryPayload());
        }

        if (truth.ctaState === "signup") {
            openAuthModal("signup");
            return;
        }

        if (truth.ctaState === "refill") {
            trackEvent("drop_unwrap_intent_blocked_by_funds", {
                ...payload,
                idempotency_key: `${user?.uid ?? "guest"}:preview_unlock_blocked:${drop.id}`,
            });
            trackEvent("wallet_opened", { ...payload, preferred_refill_gd: Math.max(1, truth.shortfallGd) });
            openPurchaseModal(Math.max(1, truth.shortfallGd));
            return;
        }

        if (truth.ctaState === "creator_preview") {
            toast.message("You can preview and share the cover. Full viewer access still follows unlock rules.");
            return;
        }

        if (!user || truth.ctaState !== "unwrap") return;

        if (!confirming) {
            setConfirming(true);
            startTimedFlow(PREVIEW_UNLOCK_FLOW_KEY, payload);
            trackEvent("drop_unlock_attempted", {
                ...payload,
                idempotency_key: `${user.uid}:preview_unlock_attempt:${drop.id}`,
            });
            triggerHaptic();
            return;
        }

        setConfirming(false);
        setUnlocking(true);
        try {
            triggerHaptic();
            const response = await authFetch("/api/drops/unlock", {
                method: "POST",
                body: JSON.stringify({ dropId: drop.id }),
            });
            const result = await response.json();
            if (!response.ok && !result.alreadyUnlocked) {
                throw new Error(result.error || "Unlock failed");
            }

            const unwrappedAt = Number.isFinite(result.unwrappedAt) ? Math.floor(result.unwrappedAt) : Date.now();
            const transactionId = typeof result.transactionId === "string" && result.transactionId.trim().length > 0
                ? result.transactionId.trim()
                : `${user.uid}:unlock:${drop.id}:${unwrappedAt}`;
            const entitlementId = typeof result.entitlementId === "string" && result.entitlementId.trim().length > 0
                ? result.entitlementId.trim()
                : `drop-entitlement:${user.uid}:${drop.id}`;
            setUserProfile((currentProfile) => applyUnlockedDropPreviewProfilePatch({
                currentProfile,
                dropId: drop.id,
                unlockCost: drop.unlockCost,
                newBalance: result.newBalance,
                unwrappedAt,
            }));
            dispatchActivitySync();
            setSuccessTransactionId(transactionId);
            setSuccessEntitlementId(entitlementId);
            trackIncompleteOnUnmountRef.current = false;

            if (!result.alreadyUnlocked) {
                trackEvent("spend_virtual_currency", {
                    value: drop.unlockCost,
                    virtual_currency_name: "Gum Drops",
                    item_name: drop.title,
                });
            }
            consumeTimedFlow(PREVIEW_UNLOCK_FLOW_KEY);
            import("canvas-confetti")
                .then((mod) => mod.default({ particleCount: 70, spread: 60, origin: { y: 0.74 } }))
                .catch(() => undefined);
        } catch (error: unknown) {
            const problemCopy = getUnlockProblemCopy(error);
            trackEvent("unlock_drop_failed", {
                ...payload,
                idempotency_key: `${user.uid}:preview_unlock_failed:${drop.id}`,
                error_message: problemCopy.headline,
                ...(consumeTimedFlow(PREVIEW_UNLOCK_FLOW_KEY).mergedParams ?? {}),
            });
            clearTimedFlow(PREVIEW_UNLOCK_FLOW_KEY);
            toast.error(problemCopy.headline, { description: problemCopy.body });
        } finally {
            setUnlocking(false);
        }
    };

    const handleOpenLibrary = () => {
        trackIncompleteOnUnmountRef.current = false;
        trackEvent("drop_preview_open_library_clicked", getTelemetryPayload());
        trackEvent("drop_preview_owned_view_clicked", getPreviewStateTelemetryPayload());
        router.push(truth.libraryOpenHref);
    };

    const handleKeepUnwrapping = () => {
        trackIncompleteOnUnmountRef.current = false;
        trackEvent("drop_preview_keep_unwrapping_clicked", {
            ...getTelemetryPayload(),
            transaction_id: successTransactionId ?? `${user?.uid ?? "unknown"}:preview_keep_unwrapping:${drop.id}`,
            idempotency_key: `${user?.uid ?? "unknown"}:preview_keep_unwrapping:${drop.id}`,
        });
        router.push(truth.keepUnwrappingHref);
    };

    const handleShare = async () => {
        const sharePath = `/drops/${encodeURIComponent(drop.id)}/preview`;
        const shareUrl = `${window.location.origin}${sharePath}`;
        const payload = getTelemetryPayload();

        if (truth.creatorCoverPreviewEligible) {
            trackEvent("drop_preview_creator_share_clicked", getCreatorPreviewTelemetryPayload());
        }

        try {
            if (navigator.share) {
                await navigator.share({
                    title: drop.title,
                    text: `Preview ${drop.title} on KandyDrops.`,
                    url: shareUrl,
                });
            } else {
                await navigator.clipboard.writeText(shareUrl);
                trackEvent("drop_share_copied", {
                    ...payload,
                    share_path: sharePath,
                    creator_preview_eligible: truth.creatorCoverPreviewEligible,
                });
            }
            toast.success("Share link ready.");
        } catch (error: unknown) {
            const errorName = typeof error === "object" && error !== null && "name" in error
                ? String((error as { name?: unknown }).name)
                : "";
            if (errorName === "AbortError") return;
            toast.error("Share link unavailable.");
        }
    };

    return (
        <LockedDropPreviewView
            drop={drop}
            creator={creator}
            truth={truth}
            socialProof={socialProof}
            mediaCounts={mediaCounts}
            timerLabel={countdown.visibleLabel}
            timerFullLabel={countdown.fullLabel}
            authLoading={authLoading}
            unlocking={unlocking}
            confirming={confirming}
            selectedReaction={selectedReaction}
            onReact={handleReaction}
            onCtaClick={handleCtaClick}
            onOpenLibrary={handleOpenLibrary}
            onKeepUnwrapping={handleKeepUnwrapping}
            onShare={handleShare}
        />
    );
}

function triggerHaptic() {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(10);
    }
}

function getPreviewCtaEventName(truth: LockedDropPreviewTruth, action: "viewed" | "clicked") {
    if (truth.shouldShowSignupCta) return `drop_preview_guest_signup_cta_${action}` as const;
    if (truth.shouldShowTopUpCta) return `drop_preview_topup_cta_${action}` as const;
    if (truth.shouldShowUnwrapCta) return `drop_preview_unwrap_cta_${action}` as const;
    return null;
}
