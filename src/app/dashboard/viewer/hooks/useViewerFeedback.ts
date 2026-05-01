import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useUserProfile } from "@/context/AuthContext";
import { authFetch } from "@/lib/authFetch";
import { reportClientIssue } from "@/lib/client-error-reporting";
import { Drop } from "@/types/db";

interface UseViewerFeedbackProps {
    drop: Drop | null;
    isAuthorized: boolean;
    initialCreatorProfile?: {
        uid: string;
        displayName: string;
        username: string;
        photoURL: string | null;
        isVerified: boolean;
    } | null;
}

export function useViewerFeedback({ drop, isAuthorized, initialCreatorProfile }: UseViewerFeedbackProps) {
    const { setUserProfile } = useUserProfile();
    const [following, setFollowing] = useState(false);
    const [submittingFollow, setSubmittingFollow] = useState(false);
    const [feedbackComplete, setFeedbackComplete] = useState(false);
    const [submittingFeedback, setSubmittingFeedback] = useState(false);
    const [feedbackValue, setFeedbackValue] = useState<boolean | null>(null);
    const [retentionDrops, setRetentionDrops] = useState<Drop[]>([]);

    useEffect(() => {
        setFeedbackComplete(false);
        setSubmittingFeedback(false);
        setFeedbackValue(null);
    }, [drop?.id]);

    useEffect(() => {
        if (!initialCreatorProfile?.uid || !isAuthorized) return;
        authFetch(`/api/creator/relationships?creatorId=${initialCreatorProfile.uid}`)
            .then(res => res.json())
            .then(data => {
                if (data.status === "active") setFollowing(true);
            })
            .catch((err) => reportClientIssue({
                channel: "runtime",
                severity: "warn",
                message: "Creator relationship status fetch failed",
                error: err,
                consoleLabel: "[ViewerFeedback] Relationship status fetch failed",
            }));
    }, [initialCreatorProfile?.uid, isAuthorized]);

    useEffect(() => {
        if (!drop || !isAuthorized) return;
        authFetch(`/api/drops/retention?currentDropId=${drop.id}`)
            .then(res => res.json())
            .then(data => {
                if (data.drops) setRetentionDrops(data.drops);
            })
            .catch((err) => reportClientIssue({
                channel: "runtime",
                severity: "warn",
                message: "Retention drops fetch failed",
                error: err,
                consoleLabel: "[ViewerFeedback] Retention drops fetch failed",
            }));
    }, [drop, isAuthorized]);

    const handleFollow = async () => {
        if (!initialCreatorProfile?.uid || submittingFollow) return;
        setSubmittingFollow(true);
        try {
            const res = await authFetch("/api/creator/relationships", {
                method: "POST",
                body: JSON.stringify({
                    creatorId: initialCreatorProfile.uid,
                    action: following ? "unfollow" : "follow"
                })
            });
            if (res.ok) {
                setFollowing(!following);
                toast.success(following ? "Unfollowed creator" : "Following creator");
            } else {
                const err = await res.json().catch(() => ({}));
                toast.error(err.error || "Failed to update follow status");
            }
        } catch {
            toast.error("Failed to update follow status");
        } finally {
            setSubmittingFollow(false);
        }
    };

    const handleFeedback = async (positive: boolean) => {
        if (!drop || !isAuthorized || submittingFeedback || feedbackComplete) return;
        setSubmittingFeedback(true);
        setFeedbackValue(positive);
        try {
            const res = await authFetch("/api/drops/feedback", {
                method: "POST",
                body: JSON.stringify({ dropId: drop.id, positive })
            });
            const payload = await res.json().catch(() => ({}));
            if (res.ok) {
                const rewardCredited = payload.rewardCredited === true;
                const reward = typeof payload.reward === "number" && Number.isFinite(payload.reward)
                    ? Math.max(0, Math.floor(payload.reward))
                    : 0;
                const resolvedPositive = typeof payload.positive === "boolean" ? payload.positive : positive;

                setFeedbackComplete(true);
                setFeedbackValue(resolvedPositive);
                updateLocalBalance({
                    newBalance: payload.newBalance,
                    purchasedBalance: payload.purchasedBalance,
                    rewardBalance: payload.rewardBalance,
                });

                toast.success(rewardCredited ? `Feedback saved. ${reward} GumDrops added.` : "Feedback already saved.");
                return;
            }

            setFeedbackValue(null);
            const message = typeof payload.error === "string" && payload.error.trim().length > 0
                ? payload.error
                : "Feedback could not be saved";
            toast.error(message);
            reportClientIssue({
                channel: "runtime",
                severity: res.status >= 500 ? "error" : "warn",
                message: "Viewer feedback submission failed",
                detail: {
                    dropId: drop.id,
                    status: res.status,
                    error: message,
                },
                consoleLabel: "[ViewerFeedback] Feedback submission failed",
            });
        } catch (err) {
            setFeedbackValue(null);
            toast.error("Feedback could not be saved");
            reportClientIssue({
                channel: "runtime",
                severity: "error",
                message: "Viewer feedback submission threw",
                error: err,
                detail: { dropId: drop.id },
                consoleLabel: "[ViewerFeedback] Feedback submission threw",
            });
        } finally {
            setSubmittingFeedback(false);
        }
    };

    const updateLocalBalance = (payload: {
        newBalance: unknown;
        purchasedBalance: unknown;
        rewardBalance: unknown;
    }) => {
        if (typeof payload.newBalance !== "number" || !Number.isFinite(payload.newBalance)) {
            return;
        }

        const nextBalance = Math.max(0, Math.floor(payload.newBalance));
        const nextPurchasedBalance = typeof payload.purchasedBalance === "number" && Number.isFinite(payload.purchasedBalance)
            ? Math.max(0, Math.floor(payload.purchasedBalance))
            : null;
        const nextRewardBalance = typeof payload.rewardBalance === "number" && Number.isFinite(payload.rewardBalance)
            ? Math.max(0, Math.floor(payload.rewardBalance))
            : null;

        setUserProfile((currentProfile) => {
            if (!currentProfile) {
                return currentProfile;
            }

            return {
                ...currentProfile,
                gumDropsBalance: nextBalance,
                gumDropsPurchasedBalance: nextPurchasedBalance ?? currentProfile.gumDropsPurchasedBalance,
                gumDropsRewardBalance: nextRewardBalance ?? currentProfile.gumDropsRewardBalance,
            };
        });
    };

    return {
        following,
        submittingFollow,
        feedbackComplete,
        submittingFeedback,
        feedbackValue,
        retentionDrops,
        handleFollow,
        handleFeedback
    };
}
