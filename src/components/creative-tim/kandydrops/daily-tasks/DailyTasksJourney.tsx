"use client";

import {
  Bell,
  Candy,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
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

import { ReportBugButton } from "@/components/Feedback/ReportBugButton";
import { cn } from "@/lib/utils";
import type { DailyTaskAssignment, DailyTaskIconName } from "@/lib/tasks/task-catalog";

const TASK_ICONS: Record<DailyTaskIconName, typeof Gift> = {
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

type FeedbackOption = {
  value: string;
  label: string;
};

type DailyTasksJourneyProps = {
  activeTasks: DailyTaskAssignment[];
  expandedTaskIds: string[];
  waitLabel: string;
  resetAtLabel: string;
  completedCount: number;
  expectedTaskCount: number;
  isCompleteForToday: boolean;
  shouldShowRepairCard: boolean;
  rotating: boolean;
  notificationLoading: boolean;
  showFeedback: boolean;
  feedbackOptions: readonly FeedbackOption[];
  feedbackCategory: string;
  feedbackRating: number;
  feedbackMessage: string;
  feedbackLoading: boolean;
  getTaskInstruction: (task: DailyTaskAssignment) => string;
  getTaskActionLabel: (task: DailyTaskAssignment) => string;
  onToggleTask: (task: DailyTaskAssignment) => void;
  onTaskAction: (task: DailyTaskAssignment) => void;
  onReloadTasks: () => void;
  onOpenDropsWhenEmpty: () => void;
  onOpenLibraryWhenEmpty: () => void;
  onOpenDropsWhenComplete: () => void;
  onOpenLibraryWhenComplete: () => void;
  onCloseFeedback: () => void;
  onFeedbackCategoryChange: (value: string) => void;
  onFeedbackRatingChange: (value: number) => void;
  onFeedbackMessageChange: (value: string) => void;
  onSubmitFeedback: () => void;
};

function FeedbackSheet({
  feedbackOptions,
  feedbackCategory,
  feedbackRating,
  feedbackMessage,
  feedbackLoading,
  onCloseFeedback,
  onFeedbackCategoryChange,
  onFeedbackRatingChange,
  onFeedbackMessageChange,
  onSubmitFeedback,
}: Pick<
  DailyTasksJourneyProps,
  | "feedbackOptions"
  | "feedbackCategory"
  | "feedbackRating"
  | "feedbackMessage"
  | "feedbackLoading"
  | "onCloseFeedback"
  | "onFeedbackCategoryChange"
  | "onFeedbackRatingChange"
  | "onFeedbackMessageChange"
  | "onSubmitFeedback"
>) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#080412]/82 p-3 backdrop-blur-md sm:items-center sm:p-5">
      <section role="dialog" aria-modal="true" aria-labelledby="daily-task-feedback-heading" className="w-full max-w-lg rounded-[2rem] border border-fuchsia-100/15 bg-[linear-gradient(145deg,rgba(75,28,101,0.98),rgba(19,8,38,0.99)_58%,rgba(11,7,22,0.98))] p-5 shadow-[0_28px_96px_rgba(4,0,12,0.62)] sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-fuchsia-100/20 bg-fuchsia-200/[0.1] text-fuchsia-100"><MessageSquare className="h-5 w-5" /></div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-fuchsia-100/58">Kandy signal</p>
            <h2 id="daily-task-feedback-heading" className="mt-1 text-2xl font-black tracking-[-0.04em] text-white">Shape tomorrow&apos;s tasks.</h2>
            <p className="mt-2 text-sm leading-6 text-violet-100/68">Tell us what would make your daily loop more useful.</p>
          </div>
        </div>

        <div className="mt-5 space-y-5">
          <fieldset>
            <legend className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-100/48">Category</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {feedbackOptions.map((option) => (
                <button key={option.value} type="button" onClick={() => onFeedbackCategoryChange(option.value)} aria-pressed={feedbackCategory === option.value} className={cn(
                  "min-h-11 rounded-2xl border px-3 py-3 text-left text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-100/45",
                  feedbackCategory === option.value ? "border-fuchsia-100/32 bg-fuchsia-200/[0.13] text-white" : "border-white/10 bg-white/[0.045] text-violet-100/68 hover:bg-white/[0.08]",
                )}>
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-100/48">Rating</legend>
            <div className="mt-2 flex gap-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button key={rating} type="button" onClick={() => onFeedbackRatingChange(rating)} aria-pressed={feedbackRating === rating} aria-label={"Rate " + rating + " out of 5 stars"} className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-2xl border text-sm font-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-100/45",
                  feedbackRating === rating ? "border-fuchsia-100/34 bg-[linear-gradient(135deg,#e879f9,#a78bfa)] text-white" : "border-white/10 bg-white/[0.045] text-violet-100/68 hover:bg-white/[0.08]",
                )}>
                  {rating}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="block">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-100/48">Message</span>
            <textarea value={feedbackMessage} onChange={(event) => onFeedbackMessageChange(event.target.value)} className="mt-2 h-32 w-full rounded-[1.4rem] border border-white/10 bg-[#10091e]/72 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-violet-100/35 focus:border-fuchsia-100/45 focus:ring-2 focus:ring-fuchsia-200/18" placeholder="What should we improve?" />
          </label>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button type="button" onClick={onCloseFeedback} className="min-h-11 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-100/45">Cancel</button>
          <button type="button" onClick={onSubmitFeedback} disabled={feedbackLoading} className="min-h-11 rounded-2xl border border-fuchsia-100/30 bg-[linear-gradient(135deg,#e879f9,#8b5cf6)] px-4 py-3 text-sm font-black text-white shadow-[0_12px_30px_rgba(192,90,230,0.26)] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-100/45 disabled:opacity-60">
            {feedbackLoading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" aria-hidden="true" /> : "Send feedback"}
          </button>
        </div>
      </section>
    </div>
  );
}

function TaskCard({
  task,
  index,
  waitLabel,
  expanded,
  notificationLoading,
  getTaskInstruction,
  getTaskActionLabel,
  onToggleTask,
  onTaskAction,
}: {
  task: DailyTaskAssignment;
  index: number;
  waitLabel: string;
  expanded: boolean;
  notificationLoading: boolean;
  getTaskInstruction: (task: DailyTaskAssignment) => string;
  getTaskActionLabel: (task: DailyTaskAssignment) => string;
  onToggleTask: (task: DailyTaskAssignment) => void;
  onTaskAction: (task: DailyTaskAssignment) => void;
}) {
  const Icon = TASK_ICONS[task.icon] || Gift;
  const progressPercent = Math.min(100, Math.round((task.progress / Math.max(1, task.maxProgress)) * 100));
  const isBusy = notificationLoading && task.actionType === "enable_notifications";
  const taskInstruction = getTaskInstruction(task);
  const statusLabel = task.claimed ? (task.oneTime ? "Retired forever" : "Reward claimed") : task.progress > 0 ? "Progress saved" : "Ready now";

  return (
    <article className={cn(
      "relative overflow-hidden rounded-[1.5rem] border p-4 shadow-[0_16px_46px_rgba(5,0,18,0.25)] transition-colors",
      task.claimed ? "border-fuchsia-100/28 bg-[linear-gradient(145deg,rgba(121,58,146,0.5),rgba(28,13,48,0.94))]" : "border-white/10 bg-[linear-gradient(145deg,rgba(55,27,87,0.74),rgba(14,8,28,0.96))]",
    )}>
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-fuchsia-200/[0.09] blur-3xl" />
      <button type="button" onClick={() => onToggleTask(task)} className="relative min-h-11 w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-100/45" aria-expanded={expanded}>
        <div className="flex items-start gap-3">
          <div className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-[1.1rem] border",
            task.claimed ? "border-fuchsia-100/32 bg-[linear-gradient(135deg,#e879f9,#8b5cf6)] text-white" : "border-violet-100/18 bg-white/[0.06] text-fuchsia-100",
          )}><Icon className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-1 text-[9px] font-black uppercase tracking-[0.11em] text-violet-100/64">Task {index + 1}</span>
                  <span className="rounded-full border border-white/10 bg-[#10091e]/46 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.11em] text-violet-100/56">Reset {waitLabel}</span>
                  {task.oneTime ? <span className="rounded-full border border-fuchsia-100/22 bg-fuchsia-200/[0.1] px-2 py-1 text-[9px] font-black uppercase tracking-[0.11em] text-fuchsia-100">One time</span> : null}
                </div>
                <h3 className="text-[16px] font-black leading-5 tracking-[-0.02em] text-white">{task.title}</h3>
              </div>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">{expanded ? <ChevronUp aria-hidden="true" className="h-4 w-4 text-fuchsia-100" /> : <ChevronDown aria-hidden="true" className="h-4 w-4 text-violet-100/52" />}</div>
            </div>
            <div className="mt-3">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.1em] text-violet-100/52"><span>{statusLabel}</span><span>{Math.min(task.progress, task.maxProgress)} / {task.maxProgress}</span></div>
              <div className="mt-2 h-2 rounded-full bg-[#0d0718]/68"><div className={cn("h-full rounded-full transition-all", task.claimed ? "bg-[linear-gradient(90deg,#e879f9,#c4b5fd)]" : "bg-[linear-gradient(90deg,#a78bfa,#f0abfc)]")} style={{ width: progressPercent + "%" }} /></div>
            </div>
          </div>
        </div>
      </button>

      {expanded ? (
        <div className="relative mt-4 border-t border-white/10 pt-4">
          <div className="rounded-[1.1rem] border border-white/10 bg-[#10091e]/46 p-3">
            <p className="text-sm leading-6 text-violet-100/82">{taskInstruction}</p>
            {task.subtitle && task.subtitle !== taskInstruction ? <p className="mt-2 text-xs leading-5 text-violet-100/52">{task.subtitle}</p> : null}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="rounded-full border border-fuchsia-100/25 bg-fuchsia-200/[0.11] px-2.5 py-1 text-[10px] font-black text-white">+{task.reward} GD</span>
            <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-violet-100/64">{statusLabel}</span>
          </div>
          <div className="mt-4">
            {task.claimed ? (
              <div className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-fuchsia-100/28 bg-fuchsia-200/[0.12] px-3.5 py-2 text-xs font-black text-white"><CheckCircle2 className="h-4 w-4" />Reward claimed</div>
            ) : (
              <button type="button" onClick={() => onTaskAction(task)} disabled={isBusy} className={cn(
                "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border px-3.5 py-2 text-sm font-black transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-100/45 disabled:opacity-60 sm:w-auto",
                task.actionType === "open_wallet" ? "border-fuchsia-100/30 bg-[linear-gradient(135deg,#e879f9,#8b5cf6)] text-white shadow-[0_12px_30px_rgba(192,90,230,0.24)]" : "border-white/10 bg-white/[0.06] text-white hover:bg-white/[0.11]",
              )}>
                {isBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Icon className="h-4 w-4" />}
                {getTaskActionLabel(task)}
              </button>
            )}
          </div>
        </div>
      ) : null}
    </article>
  );
}

export function DailyTasksJourney({
  activeTasks,
  expandedTaskIds,
  waitLabel,
  resetAtLabel,
  completedCount,
  expectedTaskCount,
  isCompleteForToday,
  shouldShowRepairCard,
  rotating,
  notificationLoading,
  showFeedback,
  feedbackOptions,
  feedbackCategory,
  feedbackRating,
  feedbackMessage,
  feedbackLoading,
  getTaskInstruction,
  getTaskActionLabel,
  onToggleTask,
  onTaskAction,
  onReloadTasks,
  onOpenDropsWhenEmpty,
  onOpenLibraryWhenEmpty,
  onOpenDropsWhenComplete,
  onOpenLibraryWhenComplete,
  onCloseFeedback,
  onFeedbackCategoryChange,
  onFeedbackRatingChange,
  onFeedbackMessageChange,
  onSubmitFeedback,
}: DailyTasksJourneyProps) {
  const journeyProgress = expectedTaskCount > 0 ? Math.min(100, Math.round((completedCount / expectedTaskCount) * 100)) : 0;

  return (
    <div className="space-y-4">
      {showFeedback ? <FeedbackSheet
        feedbackOptions={feedbackOptions}
        feedbackCategory={feedbackCategory}
        feedbackRating={feedbackRating}
        feedbackMessage={feedbackMessage}
        feedbackLoading={feedbackLoading}
        onCloseFeedback={onCloseFeedback}
        onFeedbackCategoryChange={onFeedbackCategoryChange}
        onFeedbackRatingChange={onFeedbackRatingChange}
        onFeedbackMessageChange={onFeedbackMessageChange}
        onSubmitFeedback={onSubmitFeedback}
      /> : null}

      <section id="daily-tasks" className="relative isolate overflow-hidden rounded-[2rem] border border-fuchsia-100/14 bg-[linear-gradient(135deg,rgba(73,30,103,0.9),rgba(18,9,35,0.98)_56%,rgba(37,17,64,0.92))] p-4 shadow-[0_26px_78px_rgba(4,0,14,0.35),inset_0_1px_0_rgba(255,255,255,0.1)] sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-fuchsia-200/[0.13] blur-[66px]" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-24 left-1/4 h-44 w-44 rounded-full bg-violet-300/[0.1] blur-[56px]" aria-hidden="true" />
        <div className="relative">
          <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-100/20 bg-white/[0.08] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-50"><Sparkles className="h-3.5 w-3.5 text-fuchsia-100" />Daily reward path</div>
              <h2 className="mt-3 text-2xl font-black tracking-[-0.045em] text-white sm:text-3xl">Today&apos;s Kandy list.</h2>
              <p className="mt-2 text-sm leading-6 text-violet-100/68">Make progress, collect each Reward GD, and return when the next path opens.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:min-w-[18rem]">
              <div className="rounded-[1.25rem] border border-white/10 bg-[#120a22]/54 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-violet-100/44">Progress</p><p className="mt-1 text-2xl font-black text-white">{completedCount}<span className="text-sm text-violet-100/45">/{expectedTaskCount}</span></p><div className="mt-2 h-1.5 rounded-full bg-white/[0.08]"><div className="h-full rounded-full bg-[linear-gradient(90deg,#a78bfa,#f0abfc)]" style={{ width: journeyProgress + "%" }} /></div></div>
              <div className="rounded-[1.25rem] border border-white/10 bg-[#120a22]/54 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-violet-100/44">{isCompleteForToday ? "Reset at" : "Resets in"}</p><p className="mt-1 text-lg font-black text-fuchsia-100">{waitLabel}</p>{resetAtLabel ? <p className="mt-1 text-[11px] font-medium text-violet-100/46">{resetAtLabel}</p> : null}</div>
            </div>
          </header>

          {shouldShowRepairCard ? (
            <div className="mt-4 rounded-[1.3rem] border border-amber-200/20 bg-[linear-gradient(145deg,rgba(143,87,13,0.26),rgba(37,20,29,0.88))] p-4">
              <p className="text-sm font-semibold text-amber-100">Your daily tasks need a quick refresh.</p>
              <p className="mt-2 text-sm leading-6 text-violet-100/70">Reload the page to restore the current task set. Your progress stays tied to this daily window.</p>
              <button type="button" onClick={onReloadTasks} className="mt-4 min-h-11 rounded-2xl border border-amber-100/30 bg-amber-100/[0.14] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-amber-100/[0.2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-100/45">Reload tasks</button>
            </div>
          ) : null}

          {rotating && activeTasks.length === 0 ? <div className="mt-4 rounded-[1.4rem] border border-fuchsia-100/12 bg-[#130a23]/58 p-6 text-center" data-mobile-residual-cleanup="score-impact"><Loader2 className="mx-auto h-7 w-7 animate-spin text-fuchsia-100" aria-hidden="true" /><p className="mt-3 text-sm text-violet-100/68">Preparing today&apos;s tasks...</p></div> : null}

          {!rotating && activeTasks.length === 0 ? (
            <div className="mt-4 rounded-[1.4rem] border border-dashed border-fuchsia-100/15 bg-[#130a23]/58 p-5 text-center sm:p-6" data-mobile-residual-cleanup="score-impact">
              <Gift className="mx-auto h-8 w-8 text-fuchsia-100" />
              <p className="mt-3 text-lg font-black text-white">No tasks are ready right now.</p>
              <p className="mt-2 text-sm leading-6 text-violet-100/62">Choose a place to keep your Kandy momentum moving while the next task set is prepared.</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2"><button type="button" onClick={onOpenDropsWhenEmpty} className="min-h-11 rounded-2xl border border-fuchsia-100/30 bg-[linear-gradient(135deg,#e879f9,#8b5cf6)] px-4 py-3 text-sm font-black text-white shadow-[0_12px_30px_rgba(192,90,230,0.24)] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-100/45">Unwrap now</button><button type="button" onClick={onOpenLibraryWhenEmpty} className="min-h-11 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-100/45">Open library</button></div>
              <div className="mt-4 flex justify-center"><ReportBugButton context="daily-tasks-empty" /></div>
            </div>
          ) : null}

          {isCompleteForToday ? (
            <div className="mt-4 rounded-[1.45rem] border border-fuchsia-100/18 bg-[radial-gradient(circle_at_top,rgba(240,171,252,0.18),rgba(27,12,48,0.94)_72%)] p-5 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-fuchsia-100" />
              <h3 className="mt-3 text-2xl font-black tracking-[-0.04em] text-white">Today&apos;s Kandy list is complete.</h3>
              <p className="mt-2 text-sm leading-6 text-violet-100/68">You finished all {expectedTaskCount} tasks, and the next batch unlocks at reset.</p>
              <div className="mt-4 inline-flex min-h-10 items-center rounded-full border border-fuchsia-100/24 bg-fuchsia-200/[0.12] px-4 py-2 text-sm font-bold text-white">Next batch in {waitLabel}</div>
              <div className="mt-5 grid gap-2 sm:grid-cols-2"><button type="button" onClick={onOpenDropsWhenComplete} className="min-h-11 rounded-2xl border border-fuchsia-100/30 bg-[linear-gradient(135deg,#e879f9,#8b5cf6)] px-4 py-3 text-sm font-black text-white shadow-[0_12px_30px_rgba(192,90,230,0.24)] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-100/45">Unwrap more drops</button><button type="button" onClick={onOpenLibraryWhenComplete} className="min-h-11 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-100/45">Watch your library</button></div>
              <div className="mt-4 flex justify-center"><ReportBugButton context="daily-tasks-complete" /></div>
            </div>
          ) : null}

          {activeTasks.length > 0 && !isCompleteForToday ? (
            <div className="mt-4 grid gap-3">
              {activeTasks.map((task, index) => <TaskCard key={task.id} task={task} index={index} waitLabel={waitLabel} expanded={expandedTaskIds.includes(task.id)} notificationLoading={notificationLoading} getTaskInstruction={getTaskInstruction} getTaskActionLabel={getTaskActionLabel} onToggleTask={onToggleTask} onTaskAction={onTaskAction} />)}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}