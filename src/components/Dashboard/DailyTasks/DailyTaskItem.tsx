"use client";

import { useMemo } from "react";
import {
  Bell,
  Candy,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Gift,
  Layers3,
  Loader2,
  MessageSquare,
  Play,
  Share2,
  Sparkles,
  Wallet,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DailyTaskAssignment, DailyTaskIconName } from "@/lib/tasks/task-catalog";
import { getTaskInstruction, getTaskActionLabel } from "@/lib/task-guidance";

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

interface DailyTaskItemProps {
  task: DailyTaskAssignment;
  isExpanded: boolean;
  isBusy: boolean;
  waitLabel: string;
  onToggleExpand: (task: DailyTaskAssignment) => void;
  onAction: (task: DailyTaskAssignment) => void;
}

export function DailyTaskItem({ task, isExpanded, isBusy, waitLabel, onToggleExpand, onAction }: DailyTaskItemProps) {
  const Icon = ICONS[task.icon] || Gift;
  const progressPercent = Math.min(100, Math.round((task.progress / Math.max(1, task.maxProgress)) * 100));
  const taskInstruction = getTaskInstruction(task);
  const statusLabel = task.claimed
    ? task.oneTime
      ? "Retired forever"
      : "Reward claimed"
    : task.progress > 0
      ? "Progress saved"
      : "Ready now";

  return (
    <article
      className={cn(
        "overflow-hidden rounded-[1.6rem] border p-3.5 transition-colors",
        task.claimed
          ? "border-brand-purple/25 bg-brand-purple/10"
          : "border-white/10 bg-black/30",
      )}
    >
      <button
        type="button"
        onClick={() => onToggleExpand(task)}
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
                    Reset {waitLabel}
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
                Reward claimed
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onAction(task)}
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
}
