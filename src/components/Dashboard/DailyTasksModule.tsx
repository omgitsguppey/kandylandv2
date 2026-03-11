"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import {
    CheckCircle2,
    Circle,
    ChevronDown,
    ChevronUp,
    Bell,
    Zap,
    Trophy,
    MessageSquare,
    Share2,
    Lock,
    Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { authFetch } from "@/lib/authFetch";
import { isIOSNonStandalone } from "@/lib/browser-utils";
import { requestFirebaseNotificationPermission } from "@/lib/firebase-messaging";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase-data";

interface Task {
    id: string;
    progress: number;
    claimed: boolean;
}

const TASK_DEFS: Record<string, { title: string; subtitle: string; icon: any; maxProgress: number; reward: number }> = {
    'enable_notifications': {
        title: "Enable Notifications",
        subtitle: "Stay updated on new drops and events",
        icon: Bell,
        maxProgress: 1,
        reward: 1000
    },
    'unwrap_drops': {
        title: "Unwrap 2 Drops",
        subtitle: "Unlock your favorite content today",
        icon: Zap,
        maxProgress: 2,
        reward: 1000
    },
    'streak_30': {
        title: "30-Day Streak",
        subtitle: "Check in 30 days in a row",
        icon: Trophy,
        maxProgress: 30,
        reward: 10000
    },
    'give_feedback': {
        title: "Give Us Feedback",
        subtitle: "Help us improve KandyDrops",
        icon: MessageSquare,
        maxProgress: 1,
        reward: 1000
    },
    'share_drop': {
        title: "Share a Drop",
        subtitle: "Spread the sugar with a friend",
        icon: Share2,
        maxProgress: 1,
        reward: 200
    },
    'unlock_spicy': {
        title: "Unlock a Spicy Drop",
        subtitle: "Add some heat to your collection",
        icon: Lock,
        maxProgress: 1,
        reward: 500
    }
};

export function DailyTasksModule() {
    const { userProfile, refreshProfile } = useAuth();
    const [isExpanded, setIsExpanded] = useState(true);
    const [loading, setLoading] = useState(false);
    const [claimingId, setClaimingId] = useState<string | null>(null);
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [feedbackValue, setFeedbackValue] = useState("");

    // Identify current tasks from profile
    const activeTasks = useMemo(() => {
        return userProfile?.dailyTasksState?.tasks || [];
    }, [userProfile?.dailyTasksState?.tasks]);

    // Handle rotation if needed
    useEffect(() => {
        const rotateTasks = async () => {
            if (!userProfile) return;

            // Check if rotation is needed locally first
            // (Backend also checks this as a security layer)
            try {
                const res = await authFetch("/api/tasks/rotate", { method: "POST" });
                if (res.ok) {
                    const data = await res.json();
                    if (data.rotated) {
                        refreshProfile();
                    }
                }
            } catch (err) {
                console.error("Task rotation failed", err);
            }
        };

        rotateTasks();
    }, [userProfile?.uid]);

    const calculateProgress = (taskId: string, savedProgress: number) => {
        if (!userProfile) return 0;

        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

        switch (taskId) {
            case 'streak_30':
                return Math.min(userProfile.streakCount || 0, 30);
            case 'unwrap_drops':
                // Calculate today's unwraps from timestamps
                const unwraps = Object.values(userProfile.unlockedContentTimestamps || {})
                    .filter(ts => ts >= startOfDay).length;
                return Math.min(unwraps, 2);
            case 'share_drop':
                const sharedTodayMs = userProfile.dailyTasksState?.sharedToday || 0;
                return sharedTodayMs >= startOfDay ? 1 : savedProgress;
            case 'enable_notifications':
                const fcmTokens = (userProfile as any).fcmTokens || [];
                return fcmTokens.length > 0 ? 1 : savedProgress;
            // give_feedback is handled by backend state currently, or we can assume it's done if completedOneTimeTasks has it.
            default:
                if (userProfile.dailyTasksState?.completedOneTimeTasks?.includes(taskId)) return 1;
                return savedProgress;
        }
    };

    const handleClaim = async (taskId: string) => {
        if (claimingId) return;
        setClaimingId(taskId);

        try {
            const res = await authFetch("/api/tasks/claim", {
                method: "POST",
                body: JSON.stringify({ taskId })
            });

            if (res.ok) {
                const data = await res.json();
                toast.success(`Claimed ${data.reward} Gum Drops!`);
                refreshProfile();
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to claim reward");
            }
        } catch (err) {
            toast.error("An error occurred while claiming");
        } finally {
            setClaimingId(null);
        }
    };


    const handleAction = async (taskId: string) => {
        if (!userProfile) return;

        if (taskId === 'enable_notifications') {
            if (isIOSNonStandalone()) {
                toast.error("To enable notifications on iOS, please add this app to your Home Screen first (Share > Add to Home Screen).", {
                    duration: 6000
                });
                return;
            }

            if ('Notification' in window) {
                try {
                    const token = await requestFirebaseNotificationPermission();
                    if (token) {
                        try {
                            const userRef = doc(db, "users", userProfile.uid);
                            await updateDoc(userRef, {
                                fcmTokens: arrayUnion(token)
                            });
                        } catch (docErr) {
                            console.error("Failed to save fcmToken", docErr);
                        }
                        handleClaim(taskId);
                    } else {
                        toast.error("Notification permission denied or unsupported");
                    }
                } catch (err) {
                    console.error("Notification request error", err);
                    toast.error("Failed to request notification permission");
                }
            } else {
                toast.error("Notifications not supported on this device. Try adding to Home Screen if on iOS.");
            }
        } else if (taskId === 'give_feedback') {
            setShowFeedbackModal(true);
        } else if (taskId === 'share_drop') {
            // Logic for sharing would trigger here
            toast.info("Share a drop from your inventory to complete this!");
        } else {
            // For others, just try claiming if progress is met
            handleClaim(taskId);
        }
    };

    const submitFeedback = async () => {
        if (feedbackValue.length < 1) {
            toast.error("Please enter some feedback");
            return;
        }

        setLoading(true);
        try {
            const res = await authFetch("/api/tasks/feedback", {
                method: "POST",
                body: JSON.stringify({ message: feedbackValue })
            });

            if (res.ok) {
                toast.success("Feedback submitted!");
                setShowFeedbackModal(false);
                handleClaim('give_feedback');
            } else {
                toast.error("Failed to submit feedback");
            }
        } catch (err) {
            toast.error("Error submitting feedback");
        } finally {
            setLoading(false);
        }
    };

    if (!userProfile) return null;

    return (
        <div className="w-full space-y-4">
            {/* Feedback Modal */}
            {showFeedbackModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="glass-panel w-full max-w-md p-6 rounded-3xl space-y-4">
                        <h2 className="text-xl font-bold text-white">Share Your Feedback</h2>
                        <textarea
                            className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder-gray-500 focus:outline-none focus:border-brand-purple transition-colors resize-none"
                            placeholder="Tell us what you love or what we can improve..."
                            value={feedbackValue}
                            onChange={(e) => setFeedbackValue(e.target.value)}
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowFeedbackModal(false)}
                                className="flex-1 px-4 py-3 rounded-full bg-white/5 text-white font-bold hover:bg-white/10 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={submitFeedback}
                                disabled={loading}
                                className="flex-1 px-4 py-3 rounded-full bg-brand-purple text-white font-bold hover:bg-brand-purple/80 transition-opacity disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Submit"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="glass-panel overflow-hidden transition-all duration-300 rounded-3xl">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-brand-purple/20 flex items-center justify-center">
                            <Zap className="w-5 h-5 text-brand-purple" />
                        </div>
                        <div className="text-left">
                            <h2 className="font-bold text-white text-lg">Daily Tasks</h2>
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                                {activeTasks.filter(t => t.claimed).length} / 3 Completed
                            </p>
                        </div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </button>

                <div className={cn(
                    "grid gap-1 px-4 pb-6 transition-all duration-500 overflow-hidden",
                    isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                )}>
                    {activeTasks.length === 0 ? (
                        <div className="py-8 text-center text-gray-400 text-sm">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 opacity-50" />
                            Loading tasks...
                        </div>
                    ) : activeTasks.map((task) => {
                        const def = TASK_DEFS[task.id];
                        if (!def) return null;

                        const currentProgress = calculateProgress(task.id, task.progress);
                        const isComplete = currentProgress >= def.maxProgress;
                        const progressPercent = (currentProgress / def.maxProgress) * 100;
                        const Icon = def.icon;

                        return (
                            <div
                                key={task.id}
                                className="relative group p-4 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/[0.08] transition-all"
                            >
                                <div className="flex items-center gap-4 relative z-10">
                                    <div className={cn(
                                        "w-12 h-12 rounded-xl flex items-center justify-center transition-colors shadow-inner border",
                                        task.claimed ? "bg-green-500/20 border-green-500/20 text-green-500" : "bg-white/5 border-white/10 text-white/40"
                                    )}>
                                        <Icon className="w-6 h-6" />
                                    </div>

                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-bold text-white text-sm md:text-base">{def.title}</h3>
                                            <span className="text-xs font-bold text-brand-purple">
                                                +{def.reward} GD
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-400 line-clamp-1">{def.subtitle}</p>

                                        {/* Progress Bar */}
                                        <div className="relative h-1.5 w-full bg-white/5 rounded-full mt-2 overflow-hidden shadow-inner">
                                            <div
                                                className={cn(
                                                    "absolute inset-y-0 left-0 rounded-full transition-all duration-1000",
                                                    task.claimed ? "bg-green-500" : "bg-brand-purple"
                                                )}
                                                style={{ width: `${progressPercent}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between items-center mt-1">
                                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                                                {currentProgress} / {def.maxProgress}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="ml-2">
                                        {task.claimed ? (
                                            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                                                <CheckCircle2 className="w-6 h-6 text-green-500" />
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => isComplete ? handleClaim(task.id) : handleAction(task.id)}
                                                disabled={claimingId === task.id}
                                                className={cn(
                                                    "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                                                    isComplete
                                                        ? "bg-brand-purple text-white hover:scale-110 shadow-lg shadow-brand-purple/20"
                                                        : "bg-white/10 text-white/40 hover:bg-white/20"
                                                )}
                                            >
                                                {claimingId === task.id ? (
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                ) : isComplete ? (
                                                    <Circle className="w-5 h-5 fill-white stroke-none" />
                                                ) : (
                                                    <Circle className="w-5 h-5" />
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
