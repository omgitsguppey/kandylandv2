import { useState, useEffect } from "react";
import { toast } from "sonner";
import { authFetch } from "@/lib/authFetch";
import { trackEvent } from "@/lib/telemetry";
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
    const [following, setFollowing] = useState(false);
    const [submittingFollow, setSubmittingFollow] = useState(false);
    const [feedbackComplete, setFeedbackComplete] = useState(false);
    const [submittingFeedback, setSubmittingFeedback] = useState(false);
    const [feedbackValue, setFeedbackValue] = useState<boolean | null>(null);
    const [retentionDrops, setRetentionDrops] = useState<Drop[]>([]);

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
                const err = await res.json().catch(()=>({}));
                toast.error(err.error || "Failed to update follow status");
            }
        } catch {
            toast.error("Failed to update follow status");
        } finally {
            setSubmittingFollow(false);
        }
    };

    const handleFeedback = async (positive: boolean) => {
        if (!drop || submittingFeedback || feedbackComplete) return;
        setSubmittingFeedback(true);
        setFeedbackValue(positive);
        try {
            const res = await authFetch("/api/drops/feedback", {
                method: "POST",
                body: JSON.stringify({ dropId: drop.id, positive })
            });
            if (res.ok) {
                setFeedbackComplete(true);
                toast.success("Thanks for the feedback! You earned 10 GumDrops 🍬");
                trackEvent("feedback_submitted", { drop_id: drop.id, positive });
            } else {
                toast.error("Failed to submit feedback");
            }
        } catch {
            toast.error("Failed to submit feedback");
        } finally {
            setSubmittingFeedback(false);
        }
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
