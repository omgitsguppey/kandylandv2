"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction, type TouchEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, CheckCircle2, Sparkles, X } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { useTaskGuidanceActions } from "@/hooks/useTaskGuidanceActions";
import { trackEvent } from "@/lib/telemetry";
import { cn } from "@/lib/utils";
import {
  createTaskGuidancePendingAction,
  findCurrentTaskGuidanceTask,
  focusTaskDestinationAnchor,
  getTaskDestinationPath,
  isSamePageTaskViewEvent,
  isTaskGuidanceActionType,
  TASK_GUIDANCE_ACTION_EVENT,
  TASK_GUIDANCE_STORAGE_KEY,
  type TaskGuidancePendingAction,
  type TaskGuidanceState,
  writeTaskGuidancePendingAction,
} from "@/lib/task-guidance";

type BannerEventDetail =
  | { type: "activate"; guidance: TaskGuidanceState }
  | { type: "clear" };

type GuidanceSetter = Dispatch<SetStateAction<TaskGuidanceState | null>>;

const TASK_GUIDANCE_EVENT = "kandydrops:task-guidance";
const COMPLETED_GUIDANCE_DESTINATION = "/experiences#daily-tasks";
const SWIPE_DISMISS_DISTANCE = -44;

function readStoredGuidance() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(TASK_GUIDANCE_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<TaskGuidanceState>;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }

    if (
      typeof parsed.taskId !== "string"
      || typeof parsed.title !== "string"
      || typeof parsed.reward !== "number"
      || typeof parsed.instruction !== "string"
      || typeof parsed.ctaLabel !== "string"
      || typeof parsed.destinationHref !== "string"
      || (!parsed.destinationHref.startsWith("/") && !parsed.destinationHref.startsWith("#"))
      || typeof parsed.activatedAt !== "number"
    ) {
      return null;
    }

    return {
      ...parsed,
      eventName: typeof parsed.eventName === "string" ? parsed.eventName : "",
      actionType: typeof parsed.actionType === "string" ? parsed.actionType : "open_experiences",
      assignedAt: typeof parsed.assignedAt === "number" ? parsed.assignedAt : 0,
    } as TaskGuidanceState;
  } catch {
    return null;
  }
}

function writeStoredGuidance(value: TaskGuidanceState | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!value) {
    window.localStorage.removeItem(TASK_GUIDANCE_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(TASK_GUIDANCE_STORAGE_KEY, JSON.stringify(value));
}

function commitStoredGuidance(setGuidance: GuidanceSetter, value: TaskGuidanceState | null) {
  writeStoredGuidance(value);
  setGuidance(value);
}

function launchRewardConfetti() {
  import("canvas-confetti").then((confettiModule) => {
    const launchConfetti = confettiModule.default;
    const end = Date.now() + 900;
    const colors = ["#ec4899", "#facc15", "#ffffff"];

    (function frame() {
      launchConfetti({
        particleCount: 2,
        angle: 70,
        spread: 45,
        origin: { x: 0.25, y: 0.15 },
        colors,
      });
      launchConfetti({
        particleCount: 2,
        angle: 110,
        spread: 45,
        origin: { x: 0.75, y: 0.15 },
        colors,
      });
      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  }).catch(() => undefined);
}

interface TaskGuidanceCardProps {
  guidance: TaskGuidanceState;
  onAction: () => void;
  onDismiss: () => void;
  onTouchEnd: (event: TouchEvent<HTMLDivElement>) => void;
  onTouchStart: (event: TouchEvent<HTMLDivElement>) => void;
  rewardFlashVisible: boolean;
}

function TaskGuidanceCard({
  guidance,
  onAction,
  onDismiss,
  onTouchEnd,
  onTouchStart,
  rewardFlashVisible,
}: TaskGuidanceCardProps) {
  const completed = Boolean(guidance.completedAt);

  return (
    <AnimatePresence>
      <motion.div
        key={guidance.taskId + String(guidance.completedAt ?? "")}
        initial={{ opacity: 0, y: -18 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -18 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="pointer-events-none fixed inset-x-0 top-[calc(var(--kandy-cookie-offset,0px)+4.25rem)] z-[70] px-3 sm:px-4"
      >
        <div className="pointer-events-auto mx-auto max-w-2xl overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#16161b]/92 shadow-[0_18px_44px_rgba(0,0,0,0.3)] backdrop-blur-xl">
          <div className="flex items-start gap-3 px-3.5 py-3.5 sm:px-4">
            <div className={cn(
              "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] border",
              completed
                ? "border-emerald-300/30 bg-emerald-400/15 text-emerald-200"
                : "border-brand-purple/25 bg-brand-purple/12 text-brand-purple",
            )}>
              {completed ? <CheckCircle2 className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">
                      {completed ? "Task complete" : "Task reminder"}
                    </p>
                    <span className={cn(
                      "inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em]",
                      completed
                        ? "border-emerald-300/25 bg-emerald-400/12 text-emerald-200"
                        : "border-white/10 bg-white/5 text-gray-300",
                    )}>
                      +{guidance.reward} Gum Drops
                    </span>
                  </div>
                  <h3 className="mt-1 truncate text-sm font-bold text-white">
                    {completed ? "Ready for your next reward?" : guidance.title}
                  </h3>
                  <p className="mt-1 text-[12px] leading-5 text-gray-300 sm:pr-2">
                    {completed
                      ? "Jump back into daily tasks and keep the streak moving."
                      : guidance.instruction}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onDismiss}
                  className="rounded-full border border-white/10 bg-white/5 p-1.5 text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Dismiss task guidance"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onAction}
                  className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/15 bg-white px-3.5 py-2 text-xs font-bold text-black transition-transform hover:-translate-y-0.5"
                >
                  {completed ? "Open daily tasks" : guidance.ctaLabel}
                  <ArrowUpRight className="h-4 w-4" />
                </button>

                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-300">
                  {completed ? "Reward ready" : "Dismiss anytime"}
                </span>

                <AnimatePresence>
                  {rewardFlashVisible ? (
                    <motion.span
                      initial={{ opacity: 0, y: 8, scale: 0.94 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.94 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                      className="rounded-full border border-emerald-300/25 bg-emerald-400/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-emerald-200"
                    >
                      +{guidance.reward} Gum Drops
                    </motion.span>
                  ) : null}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function useTaskGuidanceBannerController() {
  const router = useRouter();
  const pathname = usePathname();
  const { userProfile } = useAuth();
  const { executeTaskGuidanceAction } = useTaskGuidanceActions();
  const [guidance, setGuidance] = useState<TaskGuidanceState | null>(() => readStoredGuidance());
  const [rewardFlashVisible, setRewardFlashVisible] = useState(false);
  const touchStartYRef = useRef<number | null>(null);
  const lastResetMs = userProfile?.dailyTasksState?.lastResetMs ?? 0;
  const dailyTasks = userProfile?.dailyTasksState?.tasks;
  const activeGuidance = guidance && !guidance.dismissedAt ? guidance : null;

  useEffect(() => {
    function handleGuidanceEvent(event: Event) {
      const detail = (event as CustomEvent<BannerEventDetail>).detail;
      if (!detail) {
        return;
      }

      if (detail.type === "clear") {
        commitStoredGuidance(setGuidance, null);
        return;
      }

      if (detail.type === "activate") {
        setRewardFlashVisible(false);
        commitStoredGuidance(setGuidance, detail.guidance);
      }
    }

    window.addEventListener(TASK_GUIDANCE_EVENT, handleGuidanceEvent as EventListener);
    return () => window.removeEventListener(TASK_GUIDANCE_EVENT, handleGuidanceEvent as EventListener);
  }, []);

  useEffect(() => {
    if (!guidance) {
      return;
    }

    if (lastResetMs > guidance.activatedAt && (guidance.completedAt || guidance.dismissedAt)) {
      commitStoredGuidance(setGuidance, null);
      return;
    }

    if (guidance.completedAt || guidance.dismissedAt) {
      return;
    }

    const exactTaskMatch = findCurrentTaskGuidanceTask(dailyTasks, guidance);
    const matchingTask = dailyTasks?.find((task) => task.id === guidance.taskId);
    const taskWasReassigned = Boolean(matchingTask && !exactTaskMatch);

    if (taskWasReassigned || (!matchingTask && lastResetMs > guidance.activatedAt)) {
      commitStoredGuidance(setGuidance, null);
      return;
    }

    if (!matchingTask?.claimed) {
      return;
    }

    const nextGuidance = {
      ...guidance,
      completedAt: Date.now(),
    };
    commitStoredGuidance(setGuidance, nextGuidance);
    trackEvent("task_guidance_completed", {
      task_id: guidance.taskId,
      task_title: guidance.title,
      reward: guidance.reward,
      destination: guidance.destinationHref,
    });

    launchRewardConfetti();

    const rewardFlashFrame = window.requestAnimationFrame(() => {
      setRewardFlashVisible(true);
    });
    const timer = window.setTimeout(() => {
      setRewardFlashVisible(false);
    }, 3000);

    return () => {
      window.cancelAnimationFrame(rewardFlashFrame);
      window.clearTimeout(timer);
    };
  }, [dailyTasks, guidance, lastResetMs]);

  useEffect(() => {
    if (!guidance || guidance.completedAt || guidance.dismissedAt) {
      return;
    }

    trackEvent("task_guidance_banner_viewed", {
      task_id: guidance.taskId,
      task_title: guidance.title,
      reward: guidance.reward,
      destination: guidance.destinationHref,
    });
  }, [guidance]);

  const dismissBanner = () => {
    if (!activeGuidance) {
      return;
    }

    trackEvent("task_guidance_banner_dismissed", {
      task_id: activeGuidance.taskId,
      task_title: activeGuidance.title,
      completed: Boolean(activeGuidance.completedAt),
    });

    commitStoredGuidance(setGuidance, {
      ...activeGuidance,
      dismissedAt: Date.now(),
    });
  };

  const clearActiveGuidance = () => {
    writeTaskGuidancePendingAction(null);
    commitStoredGuidance(setGuidance, null);
  };

  const handleCompletedGuidanceAction = () => {
    clearActiveGuidance();
    if (pathname === "/experiences") {
      void focusTaskDestinationAnchor(COMPLETED_GUIDANCE_DESTINATION);
      return;
    }

    router.push(COMPLETED_GUIDANCE_DESTINATION);
  };

  const handleInlineTaskAction = (pendingAction: TaskGuidancePendingAction, destinationHref: string) => {
    writeTaskGuidancePendingAction(null);
    window.dispatchEvent(new CustomEvent(TASK_GUIDANCE_ACTION_EVENT, {
      detail: pendingAction,
    }));
    void focusTaskDestinationAnchor(destinationHref);
  };

  const handleGuidanceAction = async () => {
    if (!activeGuidance) {
      return;
    }

    const currentTask = activeGuidance.completedAt
      ? null
      : findCurrentTaskGuidanceTask(dailyTasks, activeGuidance);

    if (!activeGuidance.completedAt && (!currentTask || currentTask.claimed)) {
      clearActiveGuidance();
      return;
    }

    trackEvent("task_guidance_cta_clicked", {
      task_id: activeGuidance.taskId,
      task_title: activeGuidance.title,
      completed: Boolean(activeGuidance.completedAt),
      destination: activeGuidance.completedAt ? COMPLETED_GUIDANCE_DESTINATION : activeGuidance.destinationHref,
    });

    if (activeGuidance.completedAt) {
      handleCompletedGuidanceAction();
      return;
    }

    if (isTaskGuidanceActionType(activeGuidance.actionType)) {
      const handled = await executeTaskGuidanceAction(activeGuidance.actionType, {
        source: "task_guidance",
      });
      if (handled) {
        if (pathname === getTaskDestinationPath(activeGuidance.destinationHref)) {
          void focusTaskDestinationAnchor(activeGuidance.destinationHref);
        }
        return;
      }

      const pendingAction = createTaskGuidancePendingAction(activeGuidance);
      if (pathname === getTaskDestinationPath(activeGuidance.destinationHref)) {
        handleInlineTaskAction(pendingAction, activeGuidance.destinationHref);
        return;
      }

      writeTaskGuidancePendingAction(pendingAction);
      router.push(activeGuidance.destinationHref);
      return;
    }

    const destinationPath = getTaskDestinationPath(activeGuidance.destinationHref);
    if (pathname === destinationPath) {
      if (isSamePageTaskViewEvent(activeGuidance.eventName)) {
        trackEvent(activeGuidance.eventName, {
          source: "task_guidance_same_page",
          task_id: activeGuidance.taskId,
        });
      }

      void focusTaskDestinationAnchor(activeGuidance.destinationHref);
      return;
    }

    if (pathname !== destinationPath || activeGuidance.destinationHref.includes("#")) {
      router.push(activeGuidance.destinationHref);
    }
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    touchStartYRef.current = event.touches[0]?.clientY ?? null;
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const startY = touchStartYRef.current;
    const endY = event.changedTouches[0]?.clientY ?? null;
    touchStartYRef.current = null;

    if (startY !== null && endY !== null && endY - startY < SWIPE_DISMISS_DISTANCE) {
      dismissBanner();
    }
  };

  return {
    activeGuidance,
    dismissBanner,
    handleGuidanceAction,
    handleTouchEnd,
    handleTouchStart,
    rewardFlashVisible,
  };
}

export function TaskGuidanceBanner() {
  const {
    activeGuidance,
    dismissBanner,
    handleGuidanceAction,
    handleTouchEnd,
    handleTouchStart,
    rewardFlashVisible,
  } = useTaskGuidanceBannerController();

  if (!activeGuidance) {
    return null;
  }

  return (
    <TaskGuidanceCard
      guidance={activeGuidance}
      onAction={handleGuidanceAction}
      onDismiss={dismissBanner}
      onTouchEnd={handleTouchEnd}
      onTouchStart={handleTouchStart}
      rewardFlashVisible={rewardFlashVisible}
    />
  );
}
