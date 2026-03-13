"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Activity, Bell, CheckCircle2, Loader2, Plus, Target } from "lucide-react";
import { toast } from "sonner";

import { UserProfile } from "@/types/db";
import { useAuthSWR } from "@/hooks/useAuthSWR";
import { authFetch } from "@/lib/authFetch";
import { TELEMETRY_EVENT_LABELS } from "@/lib/telemetry-catalog";
import { cn } from "@/lib/utils";

type Scope = "global" | "user";

interface AdminTasksResponse {
  success: boolean;
  customTasks: Array<Record<string, unknown> & { id: string }>;
  recentTaskEvents: Array<Record<string, unknown> & { id: string }>;
  eventStats: Array<Record<string, unknown> & { id: string }>;
  eventOptions: Array<{ eventName: string; label: string; category: string }>;
  actionOptions: Array<{ value: string; label: string }>;
  iconOptions: Array<{ value: string; label: string }>;
  defaultCooldownDays: number;
}

function formatRelativeTime(timestamp: number) {
  const diff = Math.max(0, Date.now() - timestamp);
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function normalizeString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function normalizeNumber(value: unknown, fallback = 0) {
  return Number.isFinite(value) ? Number(value) : fallback;
}

function TaskCard({
  title,
  subtitle,
  children,
  icon: Icon,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  icon: typeof Bell;
}) {
  return (
    <section className="glass-panel rounded-[1.8rem] border border-white/10 p-4 sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-brand-purple/25 bg-brand-purple/15 text-white">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-gray-400">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

export function AdminTasksManager({ users }: { users: UserProfile[] }) {
  const { data, isLoading, mutate } = useAuthSWR<AdminTasksResponse>("/api/admin/tasks", {
    refreshInterval: 30_000,
    keepPreviousData: true,
  });

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [reward, setReward] = useState(150);
  const [maxProgress, setMaxProgress] = useState(1);
  const [scope, setScope] = useState<Scope>("global");
  const [targetUserId, setTargetUserId] = useState("");
  const [eventName, setEventName] = useState("experience_hub_viewed");
  const [actionType, setActionType] = useState("open_experiences");
  const [ctaLabel, setCtaLabel] = useState("Keep going");
  const [icon, setIcon] = useState("sparkles");
  const [group, setGroup] = useState("visit");
  const [submitting, setSubmitting] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  const targetUser = useMemo(
    () => users.find((user) => user.uid === targetUserId),
    [targetUserId, users],
  );

  const handleCreateTask = async () => {
    setSubmitting(true);
    try {
      const response = await authFetch("/api/admin/tasks", {
        method: "POST",
        body: JSON.stringify({
          title,
          subtitle,
          reward,
          maxProgress,
          eventName,
          actionType,
          ctaLabel,
          icon,
          group,
          scope,
          targetUserId: scope === "user" ? targetUserId : null,
        }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || "Task creation failed");
      }

      setTitle("");
      setSubtitle("");
      setReward(150);
      setMaxProgress(1);
      setScope("global");
      setTargetUserId("");
      setEventName("experience_hub_viewed");
      setActionType("open_experiences");
      setCtaLabel("Keep going");
      setIcon("sparkles");
      setGroup("visit");
      toast.success("Task created");
      await mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Task creation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleTaskState = async (taskId: string, active: boolean) => {
    setUpdatingTaskId(taskId);
    try {
      const response = await authFetch("/api/admin/tasks", {
        method: "PUT",
        body: JSON.stringify({ taskId, active }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || "Task update failed");
      }

      await mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Task update failed");
    } finally {
      setUpdatingTaskId(null);
    }
  };

  return (
    <div className="space-y-4">
      <TaskCard
        title="Task builder"
        subtitle="Create global missions or target one user with a custom mission. These tasks stay inside the same daily rotation system."
        icon={Plus}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Task title"
            className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none focus:border-brand-purple"
          />
          <input
            value={subtitle}
            onChange={(event) => setSubtitle(event.target.value)}
            placeholder="Task subtitle"
            className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none focus:border-brand-purple"
          />
          <select
            value={eventName}
            onChange={(event) => setEventName(event.target.value)}
            className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none focus:border-brand-purple"
          >
            {(data?.eventOptions ?? []).map((option) => (
              <option key={option.eventName} value={option.eventName} className="bg-[#111]">
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={actionType}
            onChange={(event) => setActionType(event.target.value)}
            className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none focus:border-brand-purple"
          >
            {(data?.actionOptions ?? []).map((option) => (
              <option key={option.value} value={option.value} className="bg-[#111]">
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={icon}
            onChange={(event) => setIcon(event.target.value)}
            className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none focus:border-brand-purple"
          >
            {(data?.iconOptions ?? []).map((option) => (
              <option key={option.value} value={option.value} className="bg-[#111]">
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={group}
            onChange={(event) => setGroup(event.target.value)}
            className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none focus:border-brand-purple"
          >
            {["visit", "notifications", "unwrap", "watch", "wallet", "purchase", "feedback", "share"].map((option) => (
              <option key={option} value={option} className="bg-[#111]">
                {option}
              </option>
            ))}
          </select>
          <input
            value={ctaLabel}
            onChange={(event) => setCtaLabel(event.target.value)}
            placeholder="CTA label"
            className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none focus:border-brand-purple"
          />
          <input
            type="number"
            min={50}
            max={1000}
            value={reward}
            onChange={(event) => setReward(Number(event.target.value))}
            className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none focus:border-brand-purple"
          />
          <input
            type="number"
            min={1}
            max={10}
            value={maxProgress}
            onChange={(event) => setMaxProgress(Number(event.target.value))}
            className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none focus:border-brand-purple"
          />
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-[auto_1fr]">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setScope("global")}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-bold transition-colors",
                scope === "global" ? "border-brand-purple bg-brand-purple text-white" : "border-white/10 bg-white/5 text-gray-300",
              )}
            >
              Global
            </button>
            <button
              type="button"
              onClick={() => setScope("user")}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-bold transition-colors",
                scope === "user" ? "border-brand-purple bg-brand-purple text-white" : "border-white/10 bg-white/5 text-gray-300",
              )}
            >
              Specific user
            </button>
          </div>

          {scope === "user" ? (
            <div className="space-y-2">
              <input
                list="task-target-users"
                value={targetUserId}
                onChange={(event) => setTargetUserId(event.target.value)}
                placeholder="Target user UID"
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none focus:border-brand-purple"
              />
              <datalist id="task-target-users">
                {users.map((user) => (
                  <option key={user.uid} value={user.uid}>
                    {user.username ? `@${user.username}` : user.displayName || user.email || user.uid}
                  </option>
                ))}
              </datalist>
              {targetUser ? (
                <p className="text-xs text-gray-400">
                  Targeting {targetUser.username ? `@${targetUser.username}` : targetUser.displayName || targetUser.email || targetUser.uid}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={handleCreateTask}
          disabled={submitting}
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-brand-purple bg-brand-purple px-5 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Create task
        </button>
      </TaskCard>

      <TaskCard
        title="Custom task queue"
        subtitle="Pause or reactivate custom missions without removing them from your historical task pool."
        icon={Target}
      >
        {isLoading ? (
          <div className="py-6 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-purple" />
          </div>
        ) : (data?.customTasks?.length ?? 0) === 0 ? (
          <p className="text-sm text-gray-400">No custom tasks created yet.</p>
        ) : (
          <div className="grid gap-3">
            {data?.customTasks.map((task) => {
              const isActive = task.active === true;
              return (
                <div key={task.id} className="rounded-[1.4rem] border border-white/10 bg-black/30 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base font-bold text-white">{normalizeString(task.title, "Untitled task")}</h4>
                        <span className={cn(
                          "rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]",
                          isActive ? "border-brand-purple/30 bg-brand-purple/15 text-white" : "border-white/10 bg-white/5 text-gray-400",
                        )}>
                          {isActive ? "Active" : "Paused"}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-300">
                          {normalizeString(task.scope, "global")}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-gray-400">{normalizeString(task.subtitle)}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-400">
                        <span>{TELEMETRY_EVENT_LABELS[normalizeString(task.eventName)] || normalizeString(task.eventName)}</span>
                        <span>Reward: +{normalizeNumber(task.reward)} GD</span>
                        <span>Progress: {normalizeNumber(task.maxProgress, 1)}</span>
                        {normalizeString(task.targetUserId) ? <span>User: {normalizeString(task.targetUserId)}</span> : null}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={updatingTaskId === task.id}
                      onClick={() => void toggleTaskState(task.id, !isActive)}
                      className={cn(
                        "inline-flex min-h-10 items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition-opacity disabled:opacity-60",
                        isActive ? "border-white/10 bg-white/5 text-white" : "border-brand-purple bg-brand-purple text-white",
                      )}
                    >
                      {updatingTaskId === task.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {isActive ? "Pause" : "Activate"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </TaskCard>

      <TaskCard
        title="Event trigger visibility"
        subtitle="This is the live server-side rollup of the telemetry events currently being seen across the product."
        icon={Activity}
      >
        {(data?.eventStats?.length ?? 0) === 0 ? (
          <p className="text-sm text-gray-400">No event activity has been recorded yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {data?.eventStats.map((stat) => {
              const label = TELEMETRY_EVENT_LABELS[normalizeString(stat.eventName)] || normalizeString(stat.eventName);
              const lastSeenAt = normalizeNumber(stat.lastSeenAt);
              return (
                <div key={stat.id} className="rounded-[1.4rem] border border-white/10 bg-black/30 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-white">{label}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-gray-500">{normalizeString(stat.eventName)}</p>
                    </div>
                    <div className="rounded-full border border-brand-purple/30 bg-brand-purple/15 px-3 py-1 text-xs font-bold text-white">
                      {normalizeNumber(stat.totalCount)}
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-gray-400">
                    Last seen {lastSeenAt ? formatRelativeTime(lastSeenAt) : "never"}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </TaskCard>

      <TaskCard
        title="Task lifecycle feed"
        subtitle="Recent task assignments, starts, and completions from the current live task engine."
        icon={CheckCircle2}
      >
        {(data?.recentTaskEvents?.length ?? 0) === 0 ? (
          <p className="text-sm text-gray-400">No task lifecycle events yet.</p>
        ) : (
          <div className="grid gap-3">
            {data?.recentTaskEvents.map((event) => (
              <div key={event.id} className="rounded-[1.4rem] border border-white/10 bg-black/30 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-brand-purple/30 bg-brand-purple/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
                    {normalizeString(event.type)}
                  </span>
                  <span className="text-sm font-bold text-white">{normalizeString(event.title, "Untitled task")}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-400">
                  <span>User: {normalizeString(event.username) || normalizeString(event.userId)}</span>
                  <span>Trigger: {TELEMETRY_EVENT_LABELS[normalizeString(event.triggerEvent)] || normalizeString(event.triggerEvent)}</span>
                  <span>Progress: {normalizeNumber(event.progress)}/{normalizeNumber(event.maxProgress, 1)}</span>
                  <span>Reward: +{normalizeNumber(event.reward)} GD</span>
                  <span>{normalizeNumber(event.timestamp) ? formatRelativeTime(normalizeNumber(event.timestamp)) : "Just now"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </TaskCard>
    </div>
  );
}
