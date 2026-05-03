"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { LockedDropPreviewView } from "@/components/Drops/LockedDropPreviewView";
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
    const { openAuthModal, openPurchaseModal } = useUI();
    const nowMs = useNow({ intervalMs: 1_000 });
    const [unlocking, setUnlocking] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [successTransactionId, setSuccessTransactionId] = useState<string | null>(null);
    const [selectedReaction, setSelectedReaction] = useState<string | null>(null);
    const ctaViewedKeysRef = useRef<Set<string>>(new Set());
    const successStateViewedRef = useRef(false);
    const trackIncompleteOnUnmountRef = useRef(true);
    const latestTelemetryPayloadRef = useRef<ReturnType<typeof buildPreviewTelemetryPayload> | null>(null);

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
            nowMs,
        }),
        [drop, isUnlocked, nowMs, user, userProfile?.gumDropsBalance],
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

    trackIncompleteOnUnmountRef.current = !truth.isUnlocked && !successTransactionId;

    useEffect(() => {
        latestTelemetryPayloadRef.current = telemetryPayload;
    }, [telemetryPayload]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            const payload = latestTelemetryPayloadRef.current;
            if (!payload) return;
            trackEvent("drop_preview_page_viewed", payload);
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
        }, 0);
        return () => window.clearTimeout(timer);
    }, [drop.id, truth.ctaState, truth.shortfallGd]);

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
            idempotency_key: `${user?.uid ?? "unknown"}:preview_success_state:${drop.id}`,
        });
    }, [drop.id, getTelemetryPayload, successTransactionId, user?.uid]);

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
            const transactionId = `${user.uid}:unlock:${drop.id}:${unwrappedAt}`;
            setUserProfile((currentProfile) => applyUnlockedDropPreviewProfilePatch({
                currentProfile,
                dropId: drop.id,
                unlockCost: drop.unlockCost,
                newBalance: result.newBalance,
                unwrappedAt,
            }));
            dispatchActivitySync();
            setSuccessTransactionId(transactionId);
            trackIncompleteOnUnmountRef.current = false;

            if (!result.alreadyUnlocked) {
                trackEvent("spend_virtual_currency", {
                    value: drop.unlockCost,
                    virtual_currency_name: "Gum Drops",
                    item_name: drop.title,
                });
            }
            trackEvent("unlock_drop_success", {
                ...payload,
                transaction_id: transactionId,
                idempotency_key: `${user.uid}:preview_unlock:${drop.id}`,
                ...(consumeTimedFlow(PREVIEW_UNLOCK_FLOW_KEY).mergedParams ?? {}),
            });
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
        />
    );
}

function triggerHaptic() {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(10);
    }
}
