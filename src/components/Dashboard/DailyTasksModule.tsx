"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { useNow } from "@/hooks/useNow";
import { useTaskGuidanceActions } from "@/hooks/useTaskGuidanceActions";
import { authFetch } from "@/lib/authFetch";
import {
  type DailyTaskAssignment,
  DAILY_TASK_LIMIT,
  type DailyTasksState,
} from "@/lib/tasks/task-catalog";
import { isDailyTaskGuidanceActive } from "@/lib/tasks/daily-task-guidance-contract";
import { getCSTDateKey, getCSTDayBoundaries } from "@/lib/timezone";
import { trackEvent } from "@/lib/telemetry";
import {
  TASK_GUIDANCE_ACTION_EVENT,
  TASK_GUIDANCE_EVENT_NAMES,
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
import { USER_LIBRARY_ROUTE } from "@/lib/creator-profile-routing";
import { DailyTasksJourney } from "@/components/creative-tim/kandydrops/daily-tasks/DailyTasksJourney";

type FeedbackCategory = "general" | "feature_request" | "bug_report" | "creator_request";

const FEEDBACK_CATEGORY_OPTIONS: Array<{ value: FeedbackCategory; label: string }> = [
  { value: "general", label: "General idea" },
  { value: "feature_request", label: "Feature request" },
  { value: "bug_report", label: "Bug report" },
  { value: "creator_request", label: "Creator feedback" },
];
const TASK_CARD_EXPANDED_EVENT = TASK_GUIDANCE_EVENT_NAMES[4];
const TASK_HELP_OPENED_EVENT = TASK_GUIDANCE_EVENT_NAMES[5];
const TASK_GUIDANCE_VIEWED_EVENT = TASK_GUIDANCE_EVENT_NAMES[0];
const TASK_GUIDANCE_TAPPED_EVENT = TASK_GUIDANCE_EVENT_NAMES[1];
const TASK_GUIDANCE_VERSION = "task_guidance_v2";

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

    trackEvent("daily_tasks_viewed", {
      source_component: "daily_tasks_module",
      sourceTruth: "client_supporting",
    });
  }, [userProfile?.uid]);

  useEffect(() => {
    setLocalTaskState(userProfile?.dailyTasksState ?? null);
  }, [userProfile?.dailyTasksState]);

  const dailyTaskState = localTaskState ?? userProfile?.dailyTasksState ?? null;
  const activeTasks = useMemo(
    () => (dailyTaskState?.tasks ?? []).filter((task) => isDailyTaskGuidanceActive(task)),
    [dailyTaskState?.tasks],
  );
  const completedCount = useMemo(
    () => activeTasks.filter((task) => task.claimed).length,
    [activeTasks],
  );
  const fallbackNextRefreshMs = useMemo(
    () => (nowMs > 0 ? getCSTDayBoundaries(nowMs).endOfDay : 0),
    [nowMs],
  );
  const currentDailyTaskWindowId = useMemo(
    () => (nowMs > 0 ? getCSTDateKey(nowMs) : null),
    [nowMs],
  );
  const nextRefreshMs = dailyTaskState?.nextRefreshMs || fallbackNextRefreshMs;
  const resetAtLabel = useMemo(() => {
    if (!Number.isFinite(nextRefreshMs) || nextRefreshMs <= 0) {
      return "";
    }

    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(nextRefreshMs));
  }, [nextRefreshMs]);
  const waitLabel = nowMs > 0 && nextRefreshMs > 0 ? formatCountdown(nextRefreshMs, nowMs) : "--:--:--";
  const hasCatalogInsufficientAssignment = useMemo(
    () => activeTasks.length > 0 && activeTasks.every((task) => task.reasonCode === "catalog_insufficient_eligible_tasks"),
    [activeTasks],
  );
  const expectedTaskCount = hasCatalogInsufficientAssignment && activeTasks.length > 0
    ? activeTasks.length
    : DAILY_TASK_LIMIT;
  const isCompleteForToday = expectedTaskCount > 0 && completedCount >= expectedTaskCount;
  const shouldShowRepairCard = dailyTaskState?.windowState === "repair_required";

  useEffect(() => {
    setExpandedTaskIds((current) => (
      current.filter((taskId) => activeTasks.some((task) => task.id === taskId && !task.claimed))
    ));
  }, [activeTasks]);

  const applyAuthoritativeTaskState = useCallback((
    nextState: Pick<DailyTasksState, "tasks" | "nextRefreshMs"> & Partial<Pick<DailyTasksState, "lastResetMs" | "lastProgressAt" | "lastDeadlineReminderAt" | "completedTaskHistory" | "retiredTaskIds" | "windowState">>,
  ) => {
    const resolvedNowMs = nowMs > 0 ? nowMs : Date.now();
    const mergedState: DailyTasksState = {
      lastResetMs: nextState.lastResetMs ?? userProfile?.dailyTasksState?.lastResetMs ?? localTaskState?.lastResetMs ?? resolvedNowMs,
      lastProgressAt: nextState.lastProgressAt ?? userProfile?.dailyTasksState?.lastProgressAt ?? localTaskState?.lastProgressAt ?? resolvedNowMs,
      lastDeadlineReminderAt: nextState.lastDeadlineReminderAt ?? userProfile?.dailyTasksState?.lastDeadlineReminderAt ?? localTaskState?.lastDeadlineReminderAt ?? 0,
      completedTaskHistory: nextState.completedTaskHistory ?? userProfile?.dailyTasksState?.completedTaskHistory ?? localTaskState?.completedTaskHistory ?? {},
      retiredTaskIds: nextState.retiredTaskIds ?? userProfile?.dailyTasksState?.retiredTaskIds ?? localTaskState?.retiredTaskIds ?? [],
      windowState: nextState.windowState ?? userProfile?.dailyTasksState?.windowState ?? localTaskState?.windowState,
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
  }, [localTaskState, nowMs, setUserProfile, userProfile?.dailyTasksState?.lastDeadlineReminderAt, userProfile?.dailyTasksState?.lastProgressAt, userProfile?.dailyTasksState?.lastResetMs, userProfile?.dailyTasksState?.retiredTaskIds, userProfile?.dailyTasksState?.completedTaskHistory, userProfile?.dailyTasksState?.windowState]);

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
    const nowForCheck = nowMs > 0 ? nowMs : Date.now();
    const hasCurrentWindowAssignment = Boolean(
      dailyTaskState
      && dailyTaskState.dailyTaskWindowId
      && currentDailyTaskWindowId
      && dailyTaskState.dailyTaskWindowId === currentDailyTaskWindowId
      && (dailyTaskState.tasks.length === DAILY_TASK_LIMIT || hasCatalogInsufficientAssignment),
    );
    const shouldRotateImmediately = !dailyTaskState
      || !hasCurrentWindowAssignment
      || !Number.isFinite(dailyTaskState.nextRefreshMs)
      || dailyTaskState.nextRefreshMs <= nowForCheck;

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
  }, [currentDailyTaskWindowId, dailyTaskState, hasCatalogInsufficientAssignment, nowMs, rotateTasks, userProfile?.uid]);

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

  const toggleTaskExpanded = (task: DailyTaskAssignment) => {
    const isExpanded = expandedTaskIds.includes(task.id);
    if (!isExpanded) {
      const taskWindowId = task.dailyTaskWindowId ?? dailyTaskState?.dailyTaskWindowId;
      const telemetryPayload = {
        task_id: task.id,
        task_title: task.title,
        task_kind: task.group,
        action_type: task.actionType,
        guidance_type: "explanation",
        guidance_version: TASK_GUIDANCE_VERSION,
        source_component: "daily_tasks_module",
        route: pathname,
        daily_task_window_id: taskWindowId,
        assignment_source: task.assignmentSource ?? dailyTaskState?.source,
      } as const;
      trackEvent(TASK_GUIDANCE_VIEWED_EVENT, telemetryPayload);
      trackEvent("daily_task_guidance_opened", telemetryPayload);
      trackEvent(TASK_CARD_EXPANDED_EVENT, telemetryPayload);
      trackEvent(TASK_HELP_OPENED_EVENT, telemetryPayload);
    }

    setExpandedTaskIds((current) => (
      current.includes(task.id)
        ? current.filter((entry) => entry !== task.id)
        : [...current, task.id]
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
    const taskWindowId = task.dailyTaskWindowId ?? dailyTaskState?.dailyTaskWindowId;
    trackEvent(TASK_GUIDANCE_TAPPED_EVENT, {
      task_id: task.id,
      task_title: task.title,
      task_kind: task.group,
      reward_gd: task.reward,
      destination: getTaskDestinationHref(task),
      action_type: task.actionType,
      guidance_type: "task_action",
      guidance_version: TASK_GUIDANCE_VERSION,
      source_component: "daily_tasks_module",
      route: pathname,
      daily_task_window_id: taskWindowId,
      assignment_source: task.assignmentSource ?? dailyTaskState?.source,
      sourceTruth: "client_supporting",
    });
    trackEvent("daily_task_action_clicked", {
      source_component: "daily_tasks_module",
      task_id: task.id,
      reward_gd: task.reward,
      day_key: dailyTaskState?.lastResetMs ? getCSTDateKey(dailyTaskState.lastResetMs) : getCSTDateKey(Date.now()),
      action_type: task.actionType,
      sourceTruth: "client_supporting",
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
    <DailyTasksJourney
      activeTasks={activeTasks}
      expandedTaskIds={expandedTaskIds}
      waitLabel={waitLabel}
      resetAtLabel={resetAtLabel}
      completedCount={completedCount}
      expectedTaskCount={expectedTaskCount}
      isCompleteForToday={isCompleteForToday}
      shouldShowRepairCard={shouldShowRepairCard}
      rotating={rotating}
      notificationLoading={notificationLoading}
      showFeedback={showFeedbackModal}
      feedbackOptions={FEEDBACK_CATEGORY_OPTIONS}
      feedbackCategory={feedbackCategory}
      feedbackRating={feedbackRating}
      feedbackMessage={feedbackMessage}
      feedbackLoading={feedbackLoading}
      getTaskInstruction={getTaskInstruction}
      getTaskActionLabel={getTaskActionLabel}
      onToggleTask={toggleTaskExpanded}
      onTaskAction={(task) => {
        void handleTaskAction(task);
      }}
      onReloadTasks={() => window.location.reload()}
      onOpenDropsWhenEmpty={() => {
        trackEvent("navigation_click", {
          destination: "/drops",
          source: "daily_tasks_empty",
          source_component: "daily_tasks_module",
        });
        router.push("/drops");
      }}
      onOpenLibraryWhenEmpty={() => {
        trackEvent("navigation_click", {
          destination: USER_LIBRARY_ROUTE,
          source: "daily_tasks_empty",
          source_component: "daily_tasks_module",
        });
        router.push(USER_LIBRARY_ROUTE);
      }}
      onOpenDropsWhenComplete={() => {
        trackEvent("navigation_click", {
          destination: "/drops",
          source: "daily_tasks_complete",
          source_component: "daily_tasks_module",
        });
        router.push("/drops");
      }}
      onOpenLibraryWhenComplete={() => {
        trackEvent("navigation_click", {
          destination: USER_LIBRARY_ROUTE,
          source: "daily_tasks_complete",
          source_component: "daily_tasks_module",
        });
        router.push(USER_LIBRARY_ROUTE);
      }}
      onCloseFeedback={() => setShowFeedbackModal(false)}
      onFeedbackCategoryChange={(category) => setFeedbackCategory(category as FeedbackCategory)}
      onFeedbackRatingChange={setFeedbackRating}
      onFeedbackMessageChange={setFeedbackMessage}
      onSubmitFeedback={() => {
        void submitFeedback();
      }}
    />
  );
}