"use client";
import { Drop } from "@/types/db";
import { useEffect, useLayoutEffect, useState, memo, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { DropCardCover } from "@/components/DropCardCover";
import { toast } from "sonner";
import { User } from "firebase/auth";
import { authFetch } from "@/lib/authFetch";
import { readUiJson } from "@/lib/ui-continuity";
import { createStaleRequestGuard } from "@/lib/frontend-hardening/ui/loading-state-contract";
import { hasUnwrappedDrop } from "@/lib/drop-view-access";
import { applyUnlockedDropPreviewProfilePatch } from "@/lib/locked-drop-preview-profile";
import { useAdminViewAs } from "@/context/AdminViewAsContext";
import { useAuthLoading, useUserProfile } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { trackEvent } from "@/lib/telemetry";
import { SupportedAspectRatio, getDropMediaSummary, getSupportedDropAspectRatio } from "@/lib/drop-presentation";
import { getDropCardVisibilityTelemetryPayload, resolveDropCardVisibilityState } from "@/lib/drop-card-visibility";
import { showUnwrapSuccessToast } from "@/components/Toasts/UnwrapSuccessToast";
import { getDropViewCount } from "@/lib/drop-engagement";
import { dispatchActivitySync } from "@/lib/activity-sync";
import { reportClientIssue } from "@/lib/client-error-reporting";
import { DropCardCta } from "@/components/DropCardCta";
import { KandyEditorialReleaseCard } from "@/components/creative-tim/kandydrops/drops/KandyEditorialReleaseCard";
import { DROPS_MOBILE_UI_DENSITY, useDropCardImpression } from "@/hooks/useDropCardImpression";
import { getUnlockProblemCopy } from "@/lib/problem-state-copy";
interface DropCardProps {
    presentation?: "feature" | "shelf";
    drop: Drop;
    user: User | null;
    isUnlocked?: boolean;
    onPreview: (drop: Drop, sourceComponent?: string) => void;
    aspectRatio?: SupportedAspectRatio;
    impressionTrackingSurface?: string;
    impressionTrackingSessionId?: string;
    impressionTrackingPosition?: number;
}
const CATEGORY_TAGS = new Set(["Sweet", "Spicy", "RAW"]);
function DropCardBase({
    presentation = "shelf",
    drop,
    user,
    isUnlocked = false,
    onPreview,
    aspectRatio,
    impressionTrackingSurface,
    impressionTrackingSessionId,
    impressionTrackingPosition,
}: DropCardProps) {
    const router = useRouter();
    const { userProfile, setUserProfile } = useUserProfile();
    const { viewAsState } = useAdminViewAs();
    const { openAuthModal, openPurchaseModal } = useUI();
    const { loading: authLoading } = useAuthLoading();
    const profileReady = !authLoading && Boolean(user?.uid && userProfile?.uid === user.uid);
    const activeProfile = profileReady ? userProfile : null;
    const actorUid = profileReady ? user?.uid ?? null : null;
    const accessLoading = authLoading || Boolean(user && !profileReady);
    const hasUnlockedDrop = profileReady && (isUnlocked || hasUnwrappedDrop(activeProfile, drop.id));
    const [unlockState, setUnlockState] = useState({ actorUid, dropId: drop.id, unlocking: false, confirming: false, error: null as string | null });
    const stateIsCurrent = unlockState.actorUid === actorUid && unlockState.dropId === drop.id;
    const unlocking = stateIsCurrent && unlockState.unlocking;
    const confirming = stateIsCurrent && unlockState.confirming;
    const error = stateIsCurrent ? unlockState.error : null;
    const unlockGuardRef = useRef(createStaleRequestGuard());
    const unlockScopeRef = useRef({ actorUid: null as string | null, dropId: drop.id, mounted: false, pendingRequestId: null as number | null });
    useLayoutEffect(() => {
        unlockGuardRef.current.next();
        unlockScopeRef.current = { actorUid, dropId: drop.id, mounted: true, pendingRequestId: null };
        setUnlockState({ actorUid, dropId: drop.id, unlocking: false, confirming: false, error: null });
        return () => {
            unlockGuardRef.current.next();
            unlockScopeRef.current.mounted = false;
            unlockScopeRef.current.pendingRequestId = null;
        };
    }, [actorUid, drop.id]);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);
    const cardRef = useRef<HTMLDivElement | null>(null);
    const resolvedRatio = aspectRatio ?? getSupportedDropAspectRatio(drop);
    const ratioStyle = { aspectRatio: resolvedRatio.replace(":", " / ") };
    const viewAsCreatorId = viewAsState?.adminViewingAsRole === "creator" ? viewAsState.adminViewingAsUserId : null;
    const profileCreatorId = activeProfile?.role === "creator" ? activeProfile.uid : null;
    const activeCreatorId = viewAsCreatorId ?? profileCreatorId;
    const visibilityState = useMemo(
        () =>
            resolveDropCardVisibilityState({
                drop,
                isAuthenticated: Boolean(user),
                isUnlocked: hasUnlockedDrop,
                gumDropsBalance: activeProfile?.gumDropsBalance,
                actorUserId: user?.uid ?? null,
                activeCreatorId,
            }),
        [activeCreatorId, activeProfile?.gumDropsBalance, drop, hasUnlockedDrop, user],
    );
    useEffect(() => {
        let timeout: ReturnType<typeof setTimeout>;
        if (confirming) {
            timeout = setTimeout(() => setUnlockState((current) => current.actorUid === actorUid && current.dropId === drop.id ? { ...current, confirming: false } : current), 3500);
        }
        return () => clearTimeout(timeout);
    }, [actorUid, confirming, drop.id]);
    useEffect(() => {
        setImageError(false);
        setImageLoaded(false);
    }, [drop.imageUrl]);
    useDropCardImpression({
        cardRef,
        drop,
        isUnlocked: hasUnlockedDrop,
        aspectRatio: resolvedRatio,
        impressionTrackingSurface,
        impressionTrackingSessionId,
        impressionTrackingPosition,
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
    if (drop.validUntil && Date.now() > drop.validUntil && !hasUnlockedDrop) {
        return null;
    }
    const triggerHaptic = () => {
        if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate(10);
        }
    };
    const handlePreviewOpen = () => {
        trackEvent("view_drop_details", {
            source_component: "compact_drop_card",
            drop_id: drop.id,
            drop_category: drop.type,
            is_unlocked: hasUnlockedDrop,
            drop_tags: (drop.tags || []).join("|"),
            card_aspect_ratio: resolvedRatio,
            ui_density: DROPS_MOBILE_UI_DENSITY,
            ...getDropCardVisibilityTelemetryPayload(visibilityState),
        });
        fetch(`/api/drops/${drop.id}/click`, { method: "POST" }).catch(() => { });
        onPreview(drop, "compact_drop_card");
    };
    const handleUnlock = async () => {
        if (accessLoading) return;
        if (visibilityState.shouldShowCreatorShareCta) {
            handlePreviewOpen();
            return;
        }
        if (!user) {
            openAuthModal("signup");
            return;
        }
        const scope = unlockScopeRef.current;
        if (!actorUid || !scope.mounted || scope.actorUid !== actorUid || scope.dropId !== drop.id || scope.pendingRequestId !== null || unlocking || hasUnlockedDrop) return;
        const balance = activeProfile?.gumDropsBalance ?? 0;
        if (balance < drop.unlockCost) {
            trackEvent("drop_unwrap_intent_blocked_by_funds", {
                source_component: "compact_drop_card",
                drop_id: drop.id,
                drop_category: drop.type,
                unlock_cost: drop.unlockCost,
                current_balance: balance,
                shortfall_gd: Math.max(1, visibilityState.shortfallGd || drop.unlockCost - balance),
                idempotency_key: `${user.uid}:unlock_blocked:${drop.id}`,
                reason_code: "insufficient_gumdrops",
                ui_density: DROPS_MOBILE_UI_DENSITY,
                ...getDropCardVisibilityTelemetryPayload(visibilityState),
            });
            openPurchaseModal(Math.max(1, visibilityState.shortfallGd || drop.unlockCost - balance));
            return;
        }
        if (!confirming) {
            setUnlockState((current) => ({ ...current, confirming: true }));
            triggerHaptic();
            trackEvent("drop_unlock_attempted", {
                source_component: "compact_drop_card",
                drop_id: drop.id,
                drop_category: drop.type,
                unlock_cost: drop.unlockCost,
                idempotency_key: `${user.uid}:unlock_attempt:${drop.id}`,
                drop_tags: (drop.tags || []).join("|"),
                ui_density: DROPS_MOBILE_UI_DENSITY,
                ...getDropCardVisibilityTelemetryPayload(visibilityState),
            });
            return;
        }
        const requestId = unlockGuardRef.current.next();
        scope.pendingRequestId = requestId;
        const isCurrentUnlock = () => unlockScopeRef.current.mounted
            && unlockScopeRef.current.actorUid === actorUid
            && unlockScopeRef.current.dropId === drop.id
            && unlockGuardRef.current.isFresh(requestId);
        setUnlockState((current) => isCurrentUnlock() ? { ...current, confirming: false, unlocking: true, error: null } : current);
        try {
            triggerHaptic();
            const response = await authFetch("/api/drops/unlock", {
                method: "POST",
                body: JSON.stringify({ dropId: drop.id }),
            });
            if (!isCurrentUnlock()) return;
            const result = await readUiJson<Record<string, unknown>>(response, { moduleLabel: "Drop unwrap", url: "/api/drops/unlock", requireSuccess: true });
            if (!isCurrentUnlock()) return;
            const unwrappedAt = typeof result.unwrappedAt === "number" && Number.isFinite(result.unwrappedAt) ? Math.floor(result.unwrappedAt) : Date.now();
            setUserProfile((currentProfile) => isCurrentUnlock() && currentProfile?.uid === actorUid
                ? applyUnlockedDropPreviewProfilePatch({ currentProfile, dropId: drop.id, unlockCost: drop.unlockCost, newBalance: result.newBalance, unwrappedAt })
                : currentProfile);
            dispatchActivitySync();
            showUnwrapSuccessToast({
                dropTitle: drop.title,
                onTaste: () => {
                    if (!isCurrentUnlock()) return;
                    router.push(`/dashboard/viewer?id=${drop.id}`);
                },
            });
        } catch (err: unknown) {
            if (!isCurrentUnlock()) return;
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
            setUnlockState((current) => isCurrentUnlock() ? { ...current, error: problemCopy.body } : current);
        } finally {
            if (isCurrentUnlock() && unlockScopeRef.current.pendingRequestId === requestId) {
                unlockScopeRef.current.pendingRequestId = null;
                setUnlockState((current) => isCurrentUnlock() ? { ...current, unlocking: false } : current);
            }
        }
    };
    const ctaButton = (
        <DropCardCta
            drop={drop}
            user={user}
            isUnlocked={hasUnlockedDrop}
            accessLoading={accessLoading}
            canAfford={visibilityState.canAfford}
            ctaState={visibilityState.ctaState}
            unlocking={unlocking}
            confirming={confirming}
            onUnlock={handleUnlock}
            onHaptic={triggerHaptic}
        />
    );
    const cardStateAttributes = {
        "data-drop-cover-treatment": visibilityState.coverTreatment,
        "data-drop-cta-state": visibilityState.ctaState,
        "data-drop-affordability-reason": visibilityState.reasonCode,
        "data-drop-card-auth-state": visibilityState.authState,
        "data-drop-card-brand-fallback": "KD",
        "data-drop-card-should-blur-cover": visibilityState.shouldBlurCover,
        "data-drop-card-owner-or-creator": visibilityState.isOwnerOrCreator,
    };
    const isPortrait = resolvedRatio === "9:16";

    return (
        <KandyEditorialReleaseCard
            rootRef={cardRef}
            drop={drop}
            presentation={presentation}
            ratioStyle={ratioStyle}
            cover={<DropCardCover drop={drop} resolvedRatio={resolvedRatio} imageError={imageError} imageLoaded={imageLoaded} shouldBlurCover={visibilityState.shouldBlurCover} onLoad={() => setImageLoaded(true)} onError={() => setImageError(true)} />}
            onPreview={handlePreviewOpen}
            files={fileCounts}
            tags={displayedTags}
            totalViews={totalViews}
            cta={ctaButton}
            error={error}
            isPortrait={isPortrait}
            stateAttributes={cardStateAttributes}
        />
    );
}
export const DropCard = memo(DropCardBase);
