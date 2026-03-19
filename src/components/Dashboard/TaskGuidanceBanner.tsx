"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  type TaskGuidancePendingAction,
  type TaskGuidanceState,
  isTaskGuidanceActionType,
  TASK_GUIDANCE_ACTION_EVENT,
  TASK_GUIDANCE_STORAGE_KEY,
  writeTaskGuidancePendingAction,
} from "@/lib/task-guidance";

type BannerEventDetail =
  | { type: "activate"; guidance: TaskGuidanceState }
  | { type: "clear" };

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
    if (
      typeof parsed.taskId !== "string"
      || typeof parsed.title !== "string"
      || typeof parsed.reward !== "number"
      || typeof parsed.instruction !== "string"
      || typeof parsed.ctaLabel !== "string"
      || typeof parsed.destinationHref !== "string"
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

export function TaskGuidanceBanner() {
  const router = useRouter();
  const pathname = usePathname();
  const { userProfile } = useAuth();
  const { executeTaskGuidanceAction } = useTaskGuidanceActions();
  const [guidance, setGuidance] = useState<TaskGuidanceState | null>(null);
  const [rewardFlashVisible, setRewardFlashVisible] = useState(false);
  const touchStartYRef = useRef<number | null>(null);

  useEffect(() => {
    setGuidance(readStoredGuidance());
  }, []);

  useEffect(() => {
    function handleGuidanceEvent(event: Event) {
      const detail = (event as CustomEvent<BannerEventDetail>).detail;
      if (!detail) {
        return;
      }

      if (detail.type === "clear") {
        writeStoredGuidance(null);
        setGuidance(null);
        return;
      }

      if (detail.type === "activate") {
        writeStoredGuidance(detail.guidance);
        setRewardFlashVisible(false);
        setGuidance(detail.guidance);
      }
    }

    window.addEventListener("kandydrops:task-guidance", handleGuidanceEvent as EventListener);
    return () => window.removeEventListener("kandydrops:task-guidance", handleGuidanceEvent as EventListener);
  }, []);

  useEffect(() => {
    if (!guidance) {
      return;
    }

    const lastResetMs = userProfile?.dailyTasksState?.lastResetMs ?? 0;
    if (lastResetMs > guidance.activatedAt && (guidance.completedAt || guidance.dismissedAt)) {
      writeStoredGuidance(null);
      setGuidance(null);
      return;
    }

    if (guidance.completedAt || guidance.dismissedAt) {
      return;
    }

    const exactTaskMatch = findCurrentTaskGuidanceTask(userProfile?.dailyTasksState?.tasks, guidance);
    const matchingTask = userProfile?.dailyTasksState?.tasks?.find((task) => task.id === guidance.taskId);
    const taskWasReassigned = Boolean(matchingTask && !exactTaskMatch);

    if (taskWasReassigned || (!matchingTask && lastResetMs > guidance.activatedAt)) {
      writeStoredGuidance(null);
      setGuidance(null);
      return;
    }

    if (!matchingTask?.claimed) {
      return;
    }

    const nextGuidance = {
      ...guidance,
      completedAt: Date.now(),
    };
    writeStoredGuidance(nextGuidance);
    setGuidance(nextGuidance);
    setRewardFlashVisible(true);
    trackEvent("task_guidance_completed", {
      task_id: guidance.taskId,
      task_title: guidance.title,
      reward: guidance.reward,
      destination: guidance.destinationHref,
    });

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

    const timer = window.setTimeout(() => {
      setRewardFlashVisible(false);
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [guidance, userProfile?.dailyTasksState?.lastResetMs, userProfile?.dailyTasksState?.tasks]);

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

  const activeGuidance = useMemo(() => {
    if (!guidance || guidance.dismissedAt) {
      return null;
    }

    return guidance;
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

    const nextGuidance = {
      ...activeGuidance,
      dismissedAt: Date.now(),
    };
    writeStoredGuidance(nextGuidance);
    setGuidance(nextGuidance);
  };

  const handleAction = async () => {
    if (!activeGuidance) {
      return;
    }

    const currentTask = activeGuidance.completedAt
      ? null
      : findCurrentTaskGuidanceTask(userProfile?.dailyTasksState?.tasks, activeGuidance);

    if (!activeGuidance.completedAt && (!currentTask || currentTask.claimed)) {
      writeStoredGuidance(null);
      writeTaskGuidancePendingAction(null);
      setGuidance(null);
      return;
    }

    trackEvent("task_guidance_cta_clicked", {
      task_id: activeGuidance.taskId,
      task_title: activeGuidance.title,
      completed: Boolean(activeGuidance.completedAt),
      destination: activeGuidance.completedAt ? "/experiences#daily-tasks" : activeGuidance.destinationHref,
    });

    if (activeGuidance.completedAt) {
      writeStoredGuidance(null);
      writeTaskGuidancePendingAction(null);
      setGuidance(null);
      if (pathname === "/experiences") {
        void focusTaskDestinationAnchor("/experiences#daily-tasks");
      } else {
        router.push("/experiences#daily-tasks");
      }
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

      const pendingAction: TaskGuidancePendingAction = createTaskGuidancePendingAction(activeGuidance);

      if (pathname === getTaskDestinationPath(activeGuidance.destinationHref)) {
        writeTaskGuidancePendingAction(null);
        window.dispatchEvent(new CustomEvent(TASK_GUIDANCE_ACTION_EVENT, {
          detail: pendingAction,
        }));
        void focusTaskDestinationAnchor(activeGuidance.destinationHref);
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

  if (!activeGuidance) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        key={activeGuidance.taskId + String(activeGuidance.completedAt ?? "")}
        initial={{ opacity: 0, y: -18 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -18 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        onTouchStart={(event) => {
          touchStartYRef.current = event.touches[0]?.clientY ?? null;
        }}
        onTouchEnd={(event) => {
          const startY = touchStartYRef.current;
          const endY = event.changedTouches[0]?.clientY ?? null;
          touchStartYRef.current = null;

          if (startY !== null && endY !== null && endY - startY < -44) {
            dismissBanner();
          }
        }}
        className="pointer-events-none fixed inset-x-0 top-[calc(var(--kandy-cookie-offset,0px)+4.25rem)] z-[70] px-3 sm:px-4"
      >
        <div className="pointer-events-auto mx-auto max-w-3xl overflow-hidden rounded-[1.35rem] border border-white/10 bg-[linear-gradient(135deg,rgba(236,72,153,0.18),rgba(17,17,22,0.95)_32%,rgba(250,204,21,0.12))] shadow-[0_20px_56px_rgba(0,0,0,0.34)] backdrop-blur-xl">
          <div className="flex items-start gap-3 px-3.5 py-3 sm:px-4">
            <div className={cn(
              "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[1rem] border",
              activeGuidance.completedAt
                ? "border-emerald-300/30 bg-emerald-400/15 text-emerald-200"
                : "border-white/10 bg-white/10 text-white",
            )}>
              {activeGuidance.completedAt ? <CheckCircle2 className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-300">
                    {activeGuidance.completedAt ? "Task complete" : "Task guide"}
                  </p>
                  <h3 className="mt-1 text-sm font-bold text-white">
                    {activeGuidance.completedAt ? "Earn more gumdrops" : activeGuidance.title}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={dismissBanner}
                  className="rounded-full border border-white/10 bg-white/5 p-1.5 text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Dismiss task guidance"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="mt-1 text-[13px] leading-5 text-gray-200 sm:pr-2">
                {activeGuidance.completedAt
                  ? "Jump back into Experiences to pick up another mission and keep stacking rewards."
                  : activeGuidance.instruction}
              </p>

              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleAction}
                  className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/15 bg-white px-3.5 py-2 text-xs font-bold text-black transition-transform hover:-translate-y-0.5"
                >
                  {activeGuidance.completedAt ? "Earn more gumdrops" : activeGuidance.ctaLabel}
                  <ArrowUpRight className="h-4 w-4" />
                </button>

                <span className="hidden rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-300 sm:inline-flex">
                  Swipe up to dismiss
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
                      +{activeGuidance.reward} Gum Drops
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
