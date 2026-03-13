"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Candy,
  CheckCircle2,
  Eye,
  Gift,
  Layers3,
  Loader2,
  MessageSquare,
  Play,
  Share2,
  Sparkles,
  Wallet,
} from "lucide-react";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { cn } from "@/lib/utils";
import { authFetch } from "@/lib/authFetch";
import { db } from "@/lib/firebase-data";
import { isIOSNonStandalone } from "@/lib/browser-utils";
import { requestFirebaseNotificationPermission } from "@/lib/firebase-messaging";
import {
  DailyTaskAssignment,
  DAILY_TASK_LIMIT,
  DailyTaskIconName,
} from "@/lib/tasks/task-catalog";
import { trackEvent } from "@/lib/telemetry";
import { getCSTDayBoundaries } from "@/lib/timezone";

type FeedbackCategory = "general" | "feature_request" | "bug_report" | "creator_request";

const ICONS: Record<DailyTaskIconName, typeof Gift> = {
  bell: Bell,
  sparkles: Sparkles,
  wallet: Wallet,
  gift: Gift,
  candy: Candy,
  play: Play,
  share: Share2,
  message: MessageSquare,
  eye: Eye,
  layers: Layers3,
};

const FEEDBACK_CATEGORY_OPTIONS: Array<{ value: FeedbackCategory; label: string }> = [
  { value: "general", label: "General idea" },
  { value: "feature_request", label: "Feature request" },
  { value: "bug_report", label: "Bug report" },
  { value: "creator_request", label: "Creator feedback" },
];

function formatCountdown(targetMs: number, nowMs: number) {
  const remainingMs = Math.max(0, targetMs - nowMs);
  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((segment) => String(segment).padStart(2, "0")).join(":");
}

export function DailyTasksModule() {
  const router = useRouter();
  const { userProfile } = useAuth();
  const { openPurchaseModal } = useUI();
  const [rotating, setRotating] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackCategory, setFeedbackCategory] = useState<FeedbackCategory>("general");
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(timerId);
  }, []);

  useEffect(() => {
    if (!userProfile?.uid) {
      return;
    }

    let cancelled = false;

    async function rotateTasks() {
      setRotating(true);
      try {
        await authFetch("/api/tasks/rotate", { method: "POST" });
      } catch (error) {
        if (!cancelled) {
          console.error("Task rotation failed", error);
        }
      } finally {
        if (!cancelled) {
          setRotating(false);
        }
      }
    }

    void rotateTasks();
    return () => {
      cancelled = true;
    };
  }, [userProfile?.uid]);

  const dailyTaskState = userProfile?.dailyTasksState;
  const activeTasks = useMemo(() => dailyTaskState?.tasks ?? [], [dailyTaskState?.tasks]);
  const completedCount = useMemo(
    () => activeTasks.filter((task) => task.claimed).length,
    [activeTasks],
  );

  const fallbackNextRefreshMs = useMemo(() => getCSTDayBoundaries(nowMs).endOfDay, [nowMs]);
  const nextRefreshMs = dailyTaskState?.nextRefreshMs || fallbackNextRefreshMs;
  const waitLabel = formatCountdown(nextRefreshMs, nowMs);

  const openNotifications = () => {
    window.dispatchEvent(new Event("kandydrops:open-notifications"));
  };

  const handleEnableNotifications = async () => {
    if (!userProfile) {
      return;
    }

    if (isIOSNonStandalone()) {
      toast.error("Add KandyDrops to your Home Screen first to enable notifications on iPhone.");
      return;
    }

    setNotificationLoading(true);
    try {
      const token = await requestFirebaseNotificationPermission();
      if (!token) {
        toast.error("Notification permission was denied.");
        return;
      }

      const userRef = doc(db, "users", userProfile.uid);
      await updateDoc(userRef, {
        fcmTokens: arrayUnion(token),
      });

      trackEvent("task_notifications_enabled");
      toast.success("Notifications enabled");
    } catch (error) {
      console.error("Failed to enable notifications", error);
      toast.error("We could not enable notifications right now.");
    } finally {
      setNotificationLoading(false);
    }
  };

  const handleTaskAction = async (task: DailyTaskAssignment) => {
    switch (task.actionType) {
      case "open_dashboard":
        router.push("/dashboard");
        return;
      case "open_drops":
        router.push("/drops");
        return;
      case "open_experiences":
        router.push("/experiences");
        return;
      case "open_library":
        router.push("/dashboard/library");
        return;
      case "open_notifications":
        openNotifications();
        return;
      case "open_wallet":
        openPurchaseModal();
        return;
      case "enable_notifications":
        await handleEnableNotifications();
        return;
      case "give_feedback":
        trackEvent("feedback_modal_opened");
        setShowFeedbackModal(true);
        return;
      default:
        return;
    }
  };

  const submitFeedback = async () => {
    if (!feedbackMessage.trim()) {
      toast.error("Share a quick note before submitting.");
      return;
    }

    setFeedbackLoading(true);
    try {
      const response = await authFetch("/api/tasks/feedback", {
        method: "POST",
        body: JSON.stringify({
          message: feedbackMessage.trim(),
          category: feedbackCategory,
          rating: feedbackRating,
        }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || "Feedback failed");
      }

      trackEvent("feedback_submitted", {
        category: feedbackCategory,
        rating: feedbackRating,
      });

      setShowFeedbackModal(false);
      setFeedbackMessage("");
      setFeedbackCategory("general");
      setFeedbackRating(5);
      toast.success("Thanks for the feedback.");
    } catch (error) {
      console.error("Feedback submission failed", error);
      toast.error(error instanceof Error ? error.message : "Feedback failed");
    } finally {
      setFeedbackLoading(false);
    }
  };

  if (!userProfile) {
    return null;
  }

  return (
    <div className="space-y-4">
      {showFeedbackModal ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="glass-panel w-full max-w-md rounded-[2rem] border border-white/10 p-5">
            <h2 className="text-xl font-bold text-white">Share feedback</h2>
            <p className="mt-1 text-sm leading-6 text-gray-400">
              Tell us what would make you come back and unwrap more often.
            </p>

            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500">Category</label>
                <div className="grid grid-cols-2 gap-2">
                  {FEEDBACK_CATEGORY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFeedbackCategory(option.value)}
                      className={cn(
                        "rounded-2xl border px-3 py-3 text-left text-sm font-semibold transition-colors",
                        feedbackCategory === option.value
                          ? "border-brand-purple bg-brand-purple/15 text-white"
                          : "border-white/10 bg-white/5 text-gray-300",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setFeedbackRating(rating)}
                      className={cn(
                        "flex h-11 w-11 items-center justify-center rounded-2xl border text-sm font-bold transition-colors",
                        feedbackRating === rating
                          ? "border-brand-purple bg-brand-purple text-white"
                          : "border-white/10 bg-white/5 text-gray-300",
                      )}
                    >
                      {rating}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500">Message</label>
                <textarea
                  value={feedbackMessage}
                  onChange={(event) => setFeedbackMessage(event.target.value)}
                  className="h-32 w-full rounded-[1.4rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-gray-500 focus:border-brand-purple"
                  placeholder="What would make KandyDrops feel more addictive, easier, or more exciting on mobile?"
                />
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setShowFeedbackModal(false)}
                className="flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitFeedback}
                disabled={feedbackLoading}
                className="flex-1 rounded-full border border-brand-purple bg-brand-purple px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {feedbackLoading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "Send feedback"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <section className="glass-panel rounded-[2rem] border border-white/10 p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-purple/30 bg-brand-purple/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
              <Sparkles className="h-3.5 w-3.5" />
              Daily missions
            </div>
            <div>
              <h2 className="text-xl font-bold text-white sm:text-2xl">Three tasks. Bigger rewards.</h2>
              <p className="mt-1 max-w-lg text-sm leading-6 text-gray-400">
                Finish up to {DAILY_TASK_LIMIT} tasks today, then wait for the daily check-in timer before the next set refreshes.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:min-w-[14rem]">
            <div className="rounded-[1.4rem] border border-white/10 bg-black/30 px-3 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">Completed</p>
              <p className="mt-1 text-2xl font-black text-white">{completedCount}/{DAILY_TASK_LIMIT}</p>
            </div>
            <div className="rounded-[1.4rem] border border-white/10 bg-black/30 px-3 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">Refresh in</p>
              <p className="mt-1 text-lg font-black text-brand-purple">{waitLabel}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-gray-200">
            Rewards range from 50 to 1000 Gum Drops
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-gray-200">
            Completed tasks stay out of rotation for 7 days
          </span>
        </div>
      </section>

      {rotating && activeTasks.length === 0 ? (
        <div className="glass-panel rounded-[2rem] border border-white/10 p-8 text-center">
          <Loader2 className="mx-auto h-7 w-7 animate-spin text-brand-purple" />
          <p className="mt-3 text-sm text-gray-400">Loading today&apos;s missions...</p>
        </div>
      ) : null}

      {!rotating && activeTasks.length === 0 ? (
        <div className="glass-panel rounded-[2rem] border border-white/10 p-8 text-center">
          <Gift className="mx-auto h-8 w-8 text-brand-purple" />
          <p className="mt-3 text-sm text-gray-400">No tasks are ready yet. Come back after the daily timer resets.</p>
        </div>
      ) : null}

      {completedCount >= DAILY_TASK_LIMIT ? (
        <div className="glass-panel rounded-[2rem] border border-white/10 p-5">
          <div className="rounded-[1.7rem] border border-brand-purple/25 bg-[radial-gradient(circle_at_top,rgba(178,140,255,0.22),rgba(18,18,24,0.94)_72%)] p-5 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-brand-purple" />
            <h3 className="mt-3 text-xl font-bold text-white">Today&apos;s tasks are complete</h3>
            <p className="mt-2 text-sm leading-6 text-gray-300">
              You already finished all {DAILY_TASK_LIMIT} missions. The next batch unlocks when the daily check-in timer resets.
            </p>
            <div className="mt-4 inline-flex items-center rounded-full border border-brand-purple/30 bg-brand-purple/15 px-4 py-2 text-sm font-bold text-white">
              Refresh in {waitLabel}
            </div>
          </div>
        </div>
      ) : null}

      {activeTasks.length > 0 && completedCount < DAILY_TASK_LIMIT ? (
        <div className="grid gap-3">
          {activeTasks.map((task) => {
            const Icon = ICONS[task.icon] || Gift;
            const progressPercent = Math.min(100, Math.round((task.progress / Math.max(1, task.maxProgress)) * 100));
            const isBusy = notificationLoading && task.actionType === "enable_notifications";

            return (
              <article
                key={task.id}
                className={cn(
                  "overflow-hidden rounded-[1.8rem] border p-4 transition-colors",
                  task.claimed
                    ? "border-brand-purple/25 bg-brand-purple/10"
                    : "border-white/10 bg-black/30",
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border",
                    task.claimed
                      ? "border-brand-purple/30 bg-brand-purple text-white"
                      : "border-white/10 bg-white/5 text-brand-purple",
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-base font-bold text-white">{task.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-gray-400">{task.subtitle}</p>
                      </div>
                      <div className="shrink-0 rounded-full border border-brand-purple/30 bg-brand-purple/15 px-3 py-1 text-xs font-bold text-white">
                        +{task.reward} GD
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="h-2 rounded-full bg-white/8">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            task.claimed ? "bg-brand-purple" : "bg-brand-purple/80",
                          )}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.12em]">
                        <span className="text-gray-500">
                          {Math.min(task.progress, task.maxProgress)} / {task.maxProgress}
                        </span>
                        <span className={task.claimed ? "text-brand-purple" : "text-gray-400"}>
                          {task.claimed ? "Reward added" : "In progress"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4">
                      {task.claimed ? (
                        <div className="inline-flex items-center gap-2 rounded-full border border-brand-purple/30 bg-brand-purple px-4 py-2 text-sm font-bold text-white">
                          <CheckCircle2 className="h-4 w-4" />
                          Completed
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void handleTaskAction(task)}
                          disabled={isBusy}
                          className={cn(
                            "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition-opacity disabled:opacity-60",
                            task.actionType === "open_wallet"
                              ? "border-brand-purple bg-brand-purple text-white"
                              : "border-white/10 bg-white/5 text-white hover:bg-white/10",
                          )}
                        >
                          {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
                          {task.actionType === "open_wallet" ? "Get Gum Drops" : task.ctaLabel}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
