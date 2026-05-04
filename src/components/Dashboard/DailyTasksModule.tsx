"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Candy,
  ChevronDown,
  ChevronUp,
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
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { ReportBugButton } from "@/components/Feedback/ReportBugButton";
import { useNow } from "@/hooks/useNow";
import { useTaskGuidanceActions } from "@/hooks/useTaskGuidanceActions";
import { authFetch } from "@/lib/authFetch";
import { cn } from "@/lib/utils";
import {
  type DailyTaskAssignment,
  type DailyTaskIconName,
  DAILY_TASK_LIMIT,
  type DailyTasksState,
} from "@/lib/tasks/task-catalog";
import { getCSTDateKey, getCSTDayBoundaries } from "@/lib/timezone";
import { trackEvent } from "@/lib/telemetry";
import {
  TASK_GUIDANCE_ACTION_EVENT,
  createTaskGuidanceState,
  findCurrentTaskGuidanceTask,
  focusTaskDestinationAnchor,
  getTaskActionLabel,
  getTaskDestinationPath,
  getTaskDestinationHref,
  getTaskInstruction,
  isSamePageTaskViewEvent,
  isTaskGuidanceActionType,
  readTaskGuidancePendingAction,
  writeTaskGuidancePendingAction,
  type TaskGuidancePendingAction,
} from "@/lib/task-guidance";
import { dispatchActivitySync } from "@/lib/activity-sync";
import { reportClientIssue } from "@/lib/client-error-reporting";

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
  const pathname = usePathname();
  const { userProfile, setUserProfile } = useAuth();
  const { executeTaskGuidanceAction } = useTaskGuidanceActions();
  const [rotating, setRotating] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackCategory, setFeedbackCategory] = useState<FeedbackCategory>("general");
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const nowMs = useNow({ intervalMs: 1_000 });
  const [localTaskState, setLocalTaskState] = useState<DailyTasksState | null>(null);
  const [expandedTaskIds, setExpandedTaskIds] = useState<string[]>([]);
  const lastSuccessfulRefreshRef = useRef<number>(0);

  useEffect(() => {
    lastSuccessfulRefreshRef.current = 0;
  }, [userProfile?.uid]);

  useEffect(() => {
    if (!userProfile?.uid) {
      return;
    }

    trackEvent("daily_tasks_viewed");
  }, [userProfile?.uid]);

  useEffect(() => {
    setLocalTaskState(userProfile?.dailyTasksState ?? null);
  }, [userProfile?.dailyTasksState]);

  const dailyTaskState = localTaskState ?? userProfile?.dailyTasksState ?? null;
  const activeTasks = useMemo(() => dailyTaskState?.tasks ?? [], [dailyTaskState?.tasks]);
  const completedCount = useMemo(
    () => activeTasks.filter((task) => task.claimed).length,
    [activeTasks],
  );
  const fallbackNextRefreshMs = useMemo(
    () => (nowMs > 0 ? getCSTDayBoundaries(nowMs).endOfDay : 0),
    [nowMs],
  );
  const nextRefreshMs = dailyTaskState?.nextRefreshMs || fallbackNextRefreshMs;
  const waitLabel = nowMs > 0 && nextRefreshMs > 0 ? formatCountdown(nextRefreshMs, nowMs) : "--:--:--";
  const isCompleteForToday = completedCount >= DAILY_TASK_LIMIT;
  const headerCountdownLabel = isCompleteForToday ? "Next batch in" : "Deadline in";

  useEffect(() => {
    setExpandedTaskIds((current) => (
      current.filter((taskId) => activeTasks.some((task) => task.id === taskId && !task.claimed))
    ));
  }, [activeTasks]);

  const applyAuthoritativeTaskState = useCallback((
    nextState: Pick<DailyTasksState, "tasks" | "nextRefreshMs"> & Partial<Pick<DailyTasksState, "lastResetMs" | "lastProgressAt" | "lastDeadlineReminderAt" | "completedTaskHistory" | "retiredTaskIds">>,
  ) => {
    const resolvedNowMs = nowMs > 0 ? nowMs : Date.now();
    const mergedState: DailyTasksState = {
      lastResetMs: nextState.lastResetMs ?? userProfile?.dailyTasksState?.lastResetMs ?? localTaskState?.lastResetMs ?? resolvedNowMs,
      lastProgressAt: nextState.lastProgressAt ?? userProfile?.dailyTasksState?.lastProgressAt ?? localTaskState?.lastProgressAt ?? resolvedNowMs,
      lastDeadlineReminderAt: nextState.lastDeadlineReminderAt ?? userProfile?.dailyTasksState?.lastDeadlineReminderAt ?? localTaskState?.lastDeadlineReminderAt ?? 0,
      completedTaskHistory: nextState.completedTaskHistory ?? userProfile?.dailyTasksState?.completedTaskHistory ?? localTaskState?.completedTaskHistory ?? {},
      retiredTaskIds: nextState.retiredTaskIds ?? userProfile?.dailyTasksState?.retiredTaskIds ?? localTaskState?.retiredTaskIds ?? [],
      tasks: nextState.tasks,
      nextRefreshMs: nextState.nextRefreshMs,
    };

    setLocalTaskState(mergedState);
    setUserProfile((currentProfile) => (
      currentProfile
        ? {
          ...currentProfile,
          dailyTasksState: mergedState,
        }
        : currentProfile
    ));
  }, [localTaskState, nowMs, setUserProfile, userProfile?.dailyTasksState?.lastDeadlineReminderAt, userProfile?.dailyTasksState?.lastProgressAt, userProfile?.dailyTasksState?.lastResetMs, userProfile?.dailyTasksState?.retiredTaskIds, userProfile?.dailyTasksState?.completedTaskHistory]);

  const rotateTasks = useCallback(async () => {
    setRotating(true);
    try {
      const response = await authFetch("/api/tasks/rotate", { method: "POST" });
      if (!response.ok) {
        throw new Error("Task rotation failed");
      }

      const result = await response.json() as { state?: DailyTasksState; tasks?: DailyTaskAssignment[]; nextRefreshMs?: number };
      if (result.state && Array.isArray(result.state.tasks) && Number.isFinite(result.state.nextRefreshMs)) {
        applyAuthoritativeTaskState(result.state);
      } else if (Array.isArray(result.tasks) && Number.isFinite(result.nextRefreshMs)) {
        applyAuthoritativeTaskState({
          tasks: result.tasks,
          nextRefreshMs: Number(result.nextRefreshMs),
        } satisfies Pick<DailyTasksState, "tasks" | "nextRefreshMs">);
      }
    } finally {
      setRotating(false);
    }
  }, [applyAuthoritativeTaskState]);

  useEffect(() => {
    if (!userProfile?.uid) {
      return;
    }
    const shouldRotateImmediately = !dailyTaskState
      || dailyTaskState.tasks.length !== DAILY_TASK_LIMIT
      || !Number.isFinite(dailyTaskState.nextRefreshMs)
      || dailyTaskState.nextRefreshMs <= (nowMs > 0 ? nowMs : Date.now());

    if (!shouldRotateImmediately) {
      return;
    }

    let cancelled = false;

    async function rotateTasksOnMount() {
      try {
        await rotateTasks();
      } catch (error) {
        if (!cancelled) {
          reportClientIssue({
            channel: "runtime",
            severity: "warn",
            message: "Daily tasks initial rotation failed",
            error,
            detail: {
              component: "DailyTasksModule",
              phase: "mount",
            },
            consoleLabel: "[DailyTasks] initial rotation failed",
          });
        }
      }
    }

    void rotateTasksOnMount();

    return () => {
      cancelled = true;
    };
  }, [dailyTaskState, nowMs, rotateTasks, userProfile?.uid]);

  useEffect(() => {
    if (!userProfile?.uid || nowMs <= 0 || nowMs < nextRefreshMs || rotating || lastSuccessfulRefreshRef.current === nextRefreshMs) {
      return;
    }
    let cancelled = false;

    async function rotateTasksAfterDeadline() {
      try {
        await rotateTasks();
        if (!cancelled) {
          lastSuccessfulRefreshRef.current = nextRefreshMs;
        }
      } catch (error) {
        if (!cancelled) {
          reportClientIssue({
            channel: "runtime",
            severity: "warn",
            message: "Daily tasks deadline rotation failed",
            error,
            detail: {
              component: "DailyTasksModule",
              phase: "deadline",
              nextRefreshMs,
            },
            consoleLabel: "[DailyTasks] deadline rotation failed",
          });
        }
      }
    }

    void rotateTasksAfterDeadline();

    return () => {
      cancelled = true;
    };
  }, [nextRefreshMs, nowMs, rotateTasks, rotating, userProfile?.uid]);

  const toggleTaskExpanded = (taskId: string) => {
    setExpandedTaskIds((current) => (
      current.includes(taskId)
        ? current.filter((entry) => entry !== taskId)
        : [...current, taskId]
    ));
  };

  const activateTaskGuidance = useCallback((task: DailyTaskAssignment) => {
    if (typeof window === "undefined") {
      return;
    }

    window.dispatchEvent(new CustomEvent("kandydrops:task-guidance", {
      detail: {
        type: "activate",
        guidance: createTaskGuidanceState(task),
      },
    }));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let cancelled = false;

    const runPendingAction = async (pendingAction: TaskGuidancePendingAction | null) => {
      if (!pendingAction || cancelled || !dailyTaskState || dailyTaskState.tasks.length === 0) {
        return;
      }

      const matchingTask = findCurrentTaskGuidanceTask(dailyTaskState.tasks, pendingAction);
      if (!matchingTask || matchingTask.claimed || matchingTask.actionType !== pendingAction.actionType) {
        writeTaskGuidancePendingAction(null);
        return;
      }

      writeTaskGuidancePendingAction(null);
      if (matchingTask.actionType === "enable_notifications") {
        setNotificationLoading(true);
      }

      try {
        const handled = await executeTaskGuidanceAction(pendingAction.actionType, {
          source: "task_guidance",
          onOpenFeedback: () => setShowFeedbackModal(true),
        });
        if (handled) {
          void focusTaskDestinationAnchor(pendingAction.destinationHref);
        }
      } finally {
        if (matchingTask.actionType === "enable_notifications") {
          setNotificationLoading(false);
        }
      }
    };

    const handleRuntimeAction = (event: Event) => {
      const detail = (event as CustomEvent<TaskGuidancePendingAction>).detail;
      void runPendingAction(detail ?? null);
    };

    window.addEventListener(TASK_GUIDANCE_ACTION_EVENT, handleRuntimeAction as EventListener);
    void runPendingAction(readTaskGuidancePendingAction());

    return () => {
      cancelled = true;
      window.removeEventListener(TASK_GUIDANCE_ACTION_EVENT, handleRuntimeAction as EventListener);
    };
  }, [dailyTaskState, executeTaskGuidanceAction]);

  const handleTaskAction = async (task: DailyTaskAssignment) => {
    trackEvent("daily_task_action_clicked", {
      task_id: task.id,
      reward_gd: task.reward,
      day_key: dailyTaskState?.lastResetMs ? getCSTDateKey(dailyTaskState.lastResetMs) : getCSTDateKey(Date.now()),
      action_type: task.actionType,
      sourceTruth: "client_supporting",
      source_component: "daily_tasks_module",
    });
    activateTaskGuidance(task);

    if (isTaskGuidanceActionType(task.actionType)) {
      if (task.actionType === "enable_notifications") {
        setNotificationLoading(true);
      }

      try {
        const handled = await executeTaskGuidanceAction(task.actionType, {
          source: "daily_tasks",
          onOpenFeedback: () => setShowFeedbackModal(true),
        });
        if (handled) {
          void focusTaskDestinationAnchor(getTaskDestinationHref(task));
        }
      } finally {
        if (task.actionType === "enable_notifications") {
          setNotificationLoading(false);
        }
      }
      return;
    }

    const destinationHref = getTaskDestinationHref(task);
    const destinationPath = getTaskDestinationPath(destinationHref);

    if (pathname === destinationPath) {
      if (isSamePageTaskViewEvent(task.eventName)) {
        trackEvent(task.eventName, {
          source: "daily_task_same_page",
          source_component: "daily_tasks_module",
          task_id: task.id,
        });
      }

      void focusTaskDestinationAnchor(destinationHref);
      return;
    }

    switch (task.actionType) {
      case "open_dashboard":
        router.push(destinationHref);
        return;
      case "open_drops":
        router.push(destinationHref);
        return;
      case "open_experiences":
        router.push(destinationHref);
        return;
      case "open_library":
        router.push(destinationHref);
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
        source_component: "daily_tasks_module",
      });

      setShowFeedbackModal(false);
      setFeedbackMessage("");
      setFeedbackCategory("general");
      setFeedbackRating(5);
      dispatchActivitySync();
      toast.success("Thanks for the feedback.");
    } catch (error) {
      reportClientIssue({
        channel: "feedback",
        message: "Daily tasks feedback submission failed",
        error,
        detail: {
          component: "DailyTasksModule",
          feedbackCategory,
          feedbackRating,
        },
        consoleLabel: "[DailyTasks] feedback submission failed",
      });
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
            <p className="mt-1 text-sm leading-6 text-gray-400">Tell us what would make daily tasks more useful.</p>

            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500">Category</label>
                <div className="grid grid-cols-2 gap-2">
                  {FEEDBACK_CATEGORY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFeedbackCategory(option.value)}
                      aria-pressed={feedbackCategory === option.value}
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
                      aria-pressed={feedbackRating === rating}
                      aria-label={`Rate ${rating} out of 5 stars`}
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
                  placeholder="What should we improve?"
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

      <section id="daily-tasks" className="glass-panel rounded-[2rem] border border-white/10 p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-purple/30 bg-brand-purple/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
              <Sparkles className="h-3.5 w-3.5" />
              Earn Free Gum Drops
            </div>
            <div>
              <h2 className="text-xl font-bold text-white sm:text-2xl">Daily tasks</h2>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:min-w-[14rem]">
            <div className="rounded-[1.4rem] border border-white/10 bg-black/30 px-3 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">Completed</p>
              <p className="mt-1 text-2xl font-black text-white">{completedCount}/{DAILY_TASK_LIMIT}</p>
            </div>
            <div className="rounded-[1.4rem] border border-white/10 bg-black/30 px-3 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">{headerCountdownLabel}</p>
              <p className="mt-1 text-lg font-black text-brand-purple">{waitLabel}</p>
            </div>
          </div>
        </div>

      </section>

      {rotating && activeTasks.length === 0 ? (
        <div className="glass-panel rounded-[2rem] border border-white/10 p-6 text-center">
          <Loader2 className="mx-auto h-7 w-7 animate-spin text-brand-purple" />
          <p className="mt-3 text-sm text-gray-400">Loading today&apos;s tasks...</p>
        </div>
      ) : null}

      {!rotating && activeTasks.length === 0 ? (
        <div className="glass-panel rounded-[2rem] border border-white/10 p-6 text-center">
          <Gift className="mx-auto h-8 w-8 text-brand-purple" />
          <p className="mt-3 text-sm text-gray-400">No tasks are ready right now.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                trackEvent("navigation_click", {
                  destination: "/drops",
                  source: "daily_tasks_empty",
                });
                router.push("/drops");
              }}
              className="rounded-2xl border border-brand-purple bg-brand-purple px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
            >
              Unwrap now
            </button>
            <button
              type="button"
              onClick={() => {
                trackEvent("navigation_click", {
                  destination: "/dashboard/library",
                  source: "daily_tasks_empty",
                });
                router.push("/dashboard/library");
              }}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10"
            >
              Open library
            </button>
          </div>
          <div className="mt-4 flex justify-center">
            <ReportBugButton context="daily-tasks-empty" />
          </div>
        </div>
      ) : null}

      {isCompleteForToday ? (
        <div className="glass-panel rounded-[2rem] border border-white/10 p-5">
          <div className="rounded-[1.7rem] border border-brand-purple/25 bg-[radial-gradient(circle_at_top,rgba(178,140,255,0.22),rgba(18,18,24,0.94)_72%)] p-5 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-brand-purple" />
            <h3 className="mt-3 text-xl font-bold text-white">Today&apos;s tasks are complete</h3>
            <p className="mt-2 text-sm leading-6 text-gray-300">You finished all {DAILY_TASK_LIMIT} tasks, and the next batch unlocks at reset.</p>
            <div className="mt-4 inline-flex items-center rounded-full border border-brand-purple/30 bg-brand-purple/15 px-4 py-2 text-sm font-bold text-white">
              Next batch in {waitLabel}
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  trackEvent("navigation_click", {
                    destination: "/drops",
                    source: "daily_tasks_complete",
                  });
                  router.push("/drops");
                }}
                className="rounded-2xl border border-brand-purple bg-brand-purple px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
              >
                Unwrap more drops
              </button>
              <button
                type="button"
                onClick={() => {
                  trackEvent("navigation_click", {
                    destination: "/dashboard/library",
                    source: "daily_tasks_complete",
                  });
                  router.push("/dashboard/library");
                }}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10"
              >
                Watch your library
              </button>
            </div>
            <div className="mt-4 flex justify-center">
              <ReportBugButton context="daily-tasks-complete" />
            </div>
          </div>
        </div>
      ) : null}

      {activeTasks.length > 0 && !isCompleteForToday ? (
        <div className="grid gap-2.5">
          {activeTasks.map((task) => {
            const Icon = ICONS[task.icon] || Gift;
            const progressPercent = Math.min(100, Math.round((task.progress / Math.max(1, task.maxProgress)) * 100));
            const isBusy = notificationLoading && task.actionType === "enable_notifications";
            const isExpanded = expandedTaskIds.includes(task.id);
            const taskInstruction = getTaskInstruction(task);
            const statusLabel = task.claimed
              ? task.oneTime
                ? "Retired forever"
                : "Completed today"
              : task.progress > 0
                ? "Progress saved"
                : "Ready now";

            return (
              <article
                key={task.id}
                className={cn(
                  "overflow-hidden rounded-[1.6rem] border p-3.5 transition-colors",
                  task.claimed
                    ? "border-brand-purple/25 bg-brand-purple/10"
                    : "border-white/10 bg-black/30",
                )}
              >
                <button
                  type="button"
                  onClick={() => toggleTaskExpanded(task.id)}
                  className="w-full text-left"
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-[1.15rem] border",
                      task.claimed
                        ? "border-brand-purple/30 bg-brand-purple text-white"
                        : "border-white/10 bg-white/5 text-brand-purple",
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="mb-2 flex flex-wrap items-center gap-1.5">
                            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-gray-200">
                              Deadline {waitLabel}
                            </span>
                            {task.oneTime ? (
                              <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-emerald-300">
                                One time
                              </span>
                            ) : null}
                          </div>
                          <h3 className="text-[15px] font-bold leading-5 text-white">{task.title}</h3>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="h-2 rounded-full bg-white/8">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              task.claimed ? "bg-brand-purple" : "bg-brand-purple/80",
                          )}
                          style={{ width: `${progressPercent}%` }}
                        />
                        </div>
                      </div>
                    </div>
                  </div>
                </button>

                {isExpanded ? (
                  <div className="ml-[3.25rem] mt-3 border-t border-white/10 pt-3">
                    <p className="text-[13px] leading-5 text-gray-300">{taskInstruction}</p>
                    {task.subtitle && task.subtitle !== taskInstruction ? (
                      <p className="mt-1.5 text-[12px] leading-5 text-gray-500">{task.subtitle}</p>
                    ) : null}
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full border border-brand-purple/30 bg-brand-purple/15 px-2.5 py-1 text-[10px] font-bold text-white">
                        +{task.reward} GD
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-300">
                        {Math.min(task.progress, task.maxProgress)} / {task.maxProgress}
                      </span>
                      <span className={cn(
                        "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em]",
                        task.claimed
                          ? "border-brand-purple/30 bg-brand-purple/15 text-brand-purple"
                          : "border-white/10 bg-white/5 text-gray-300",
                      )}>
                        {statusLabel}
                      </span>
                    </div>

                    <div className="mt-3">
                      {task.claimed ? (
                        <div className="inline-flex items-center gap-2 rounded-full border border-brand-purple/30 bg-brand-purple px-3.5 py-2 text-xs font-bold text-white">
                          <CheckCircle2 className="h-4 w-4" />
                          Completed
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void handleTaskAction(task)}
                          disabled={isBusy}
                          className={cn(
                            "inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-bold transition-opacity disabled:opacity-60",
                            task.actionType === "open_wallet"
                              ? "border-brand-purple bg-brand-purple text-white"
                              : "border-white/10 bg-white/5 text-white hover:bg-white/10",
                          )}
                        >
                          {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
                          {getTaskActionLabel(task)}
                        </button>
                      )}
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
