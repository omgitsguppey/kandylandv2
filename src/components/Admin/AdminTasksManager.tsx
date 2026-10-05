"use client";

import { Surface } from "@/components/ui/content-layout";
import { NativeSelectOption } from "@/components/ui/native-select";
import { NativeSelect } from "@/components/ui/native-select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/Button";


import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  Activity,
  Bell,
  CheckCircle2,
  Clock3,
  Loader2,
  Plus,
  Repeat,
  Target,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";

import { UserProfile } from "@/types/db";
import { useAdminPollingSWR } from "@/hooks/useAdminPollingSWR";
import { authFetch } from "@/lib/authFetch";
import { sanitizeErrorForUser } from "@/lib/errors/resolve-human-error";
import {
  DAILY_TASK_MAX_REWARD,
  DAILY_TASK_MIN_REWARD,
  normalizeDailyTaskReward,
} from "@/lib/tasks/task-catalog";
import { TELEMETRY_EVENT_LABELS } from "@/lib/telemetry-catalog";
import { cn } from "@/lib/utils";

type Scope = "global" | "user";
type CriteriaMode = "none" | "paramEquals" | "minNumberParam" | "includesAnyParam";

interface AdminTasksResponse {
  success: boolean;
  customTasks: Array<Record<string, unknown> & { id: string }>;
  recentTaskEvents: Array<Record<string, unknown> & { id: string }>;
  eventStats: Array<Record<string, unknown> & { id: string }>;
  taskRollups: Array<Record<string, unknown> & { id: string }>;
  eventOptions: Array<{ eventName: string; label: string; category: string }>;
  actionOptions: Array<{ value: string; label: string }>;
  iconOptions: Array<{ value: string; label: string }>;
  defaultCooldownDays: number;
}

const ADMIN_TASKS_SNAPSHOT_REFRESH_INTERVAL_MS = 0;

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

function getAdminTaskSafeErrorMessage(error: unknown, fallback: string) {
  const safeError = sanitizeErrorForUser(error, "admin_truth", "admin_truth_unavailable");
  return safeError.errorKey === "unknown_error" ? fallback : safeError.operatorMessage;
}

function TaskCard({
  title,
  subtitle,
  children,
  icon: Icon,
  action,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  icon: typeof Bell;
  action?: ReactNode;
}) {
  return (
    <section className="glass-panel rounded-[1.5rem] border border-border p-3.5 sm:p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2.5">
        <div className="flex min-w-0 items-start gap-2.5">
          <div className="flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-[1rem] border border-primary/25 bg-primary/15 text-foreground">
            <Icon className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function AdminTasksManager({ users }: { users: UserProfile[] }) {
  const { data, isLoading, mutate } = useAdminPollingSWR<AdminTasksResponse>(
    "/api/admin/tasks",
    ADMIN_TASKS_SNAPSHOT_REFRESH_INTERVAL_MS,
  );

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [reward, setReward] = useState(() => normalizeDailyTaskReward(150));
  const [maxProgress, setMaxProgress] = useState(1);
  const [scope, setScope] = useState<Scope>("global");
  const [targetUserId, setTargetUserId] = useState("");
  const [eventName, setEventName] = useState("experience_hub_viewed");
  const [actionType, setActionType] = useState("open_experiences");
  const [ctaLabel, setCtaLabel] = useState("Keep going");
  const [icon, setIcon] = useState("sparkles");
  const [group, setGroup] = useState("visit");
  const [cooldownDays, setCooldownDays] = useState(data?.defaultCooldownDays ?? 7);
  const [oneTime, setOneTime] = useState(false);
  const [uniqueByParamKey, setUniqueByParamKey] = useState("");
  const [criteriaMode, setCriteriaMode] = useState<CriteriaMode>("none");
  const [criteriaKey, setCriteriaKey] = useState("");
  const [criteriaValue, setCriteriaValue] = useState("");
  const [criteriaValueType, setCriteriaValueType] = useState<"string" | "number" | "boolean">("string");
  const [submitting, setSubmitting] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  const targetUser = useMemo(
    () => users.find((user) => user.uid === targetUserId),
    [targetUserId, users],
  );

  const taskPerformance = useMemo(
    () =>
      (data?.taskRollups ?? []).map((rollup) => {
        const assigned = normalizeNumber(rollup.types && (rollup.types as Record<string, unknown>).assigned);
        const completed = normalizeNumber(rollup.types && (rollup.types as Record<string, unknown>).completed);
        const failed = normalizeNumber(rollup.types && (rollup.types as Record<string, unknown>).failed);
        const durationSampleCount = normalizeNumber(rollup.durationSampleCount);
        const avgCompletionMins = durationSampleCount > 0
          ? Math.round(normalizeNumber(rollup.durationMsTotal) / durationSampleCount / 60000)
          : 0;
        return {
          id: rollup.id,
          title: normalizeString(rollup.title, "Untitled task"),
          assigned,
          completed,
          failed,
          rewardTotal: normalizeNumber(rollup.rewardTotal),
          avgCompletionMins,
          completionRate: assigned > 0 ? Math.round((completed / assigned) * 100) : 0,
          lastEventAt: normalizeNumber(rollup.lastEventAt),
        };
      }).sort((left, right) => right.completed - left.completed),
    [data?.taskRollups],
  );

  const buildCriteriaPayload = () => {
    const trimmedKey = criteriaKey.trim();
    const trimmedValue = criteriaValue.trim();

    if (criteriaMode === "none" || !trimmedKey) {
      return undefined;
    }

    if (criteriaMode === "paramEquals") {
      const parsedValue = criteriaValueType === "number"
        ? Number(trimmedValue)
        : criteriaValueType === "boolean"
          ? trimmedValue.toLowerCase() === "true"
          : trimmedValue;

      if ((criteriaValueType === "number" && !Number.isFinite(parsedValue)) || !trimmedValue) {
        throw new Error("Add a valid exact-match value.");
      }

      return {
        paramEquals: {
          key: trimmedKey,
          value: parsedValue,
        },
      };
    }

    if (criteriaMode === "minNumberParam") {
      const numericValue = Number(trimmedValue);
      if (!Number.isFinite(numericValue)) {
        throw new Error("Add a valid numeric minimum.");
      }

      return {
        minNumberParam: {
          key: trimmedKey,
          value: numericValue,
        },
      };
    }

    const values = trimmedValue
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    if (values.length === 0) {
      throw new Error("Add at least one allowed value.");
    }

    return {
      includesAnyParam: {
        key: trimmedKey,
        values,
      },
    };
  };

  const handleCreateTask = async () => {
    setSubmitting(true);
    try {
      const criteria = buildCriteriaPayload();
      const response = await authFetch("/api/admin/tasks", {
        method: "POST",
        body: JSON.stringify({
          title,
          subtitle,
          reward,
          maxProgress,
          cooldownDays,
          oneTime,
          eventName,
          actionType,
          ctaLabel,
          icon,
          group,
          scope,
          targetUserId: scope === "user" ? targetUserId : null,
          uniqueByParamKey: uniqueByParamKey.trim() || null,
          criteria,
        }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || "Task creation failed");
      }

      setTitle("");
      setSubtitle("");
      setReward(normalizeDailyTaskReward(150));
      setMaxProgress(1);
      setCooldownDays(data?.defaultCooldownDays ?? 7);
      setOneTime(false);
      setUniqueByParamKey("");
      setCriteriaMode("none");
      setCriteriaKey("");
      setCriteriaValue("");
      setCriteriaValueType("string");
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
      toast.error(getAdminTaskSafeErrorMessage(error, "Task creation failed"));
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
      toast.error(getAdminTaskSafeErrorMessage(error, "Task update failed"));
    } finally {
      setUpdatingTaskId(null);
    }
  };

  return (
    <div className="space-y-4">
      <TaskCard
        title="Task builder"
        subtitle="Create global or user-specific missions with reward, progress, cooldown, and filter controls."
        icon={Plus}
        action={
          <Button variant="ghost"
            type="button"
            onClick={() => void mutate()}
            disabled={isLoading}
            aria-label="Refresh task snapshot"
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-secondary px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Repeat className="h-4 w-4" aria-hidden="true" />
            )}
            Refresh
          </Button>
        }
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Task title"
            className="h-12 rounded-2xl border border-border bg-secondary px-4 text-sm text-foreground outline-none focus:border-primary"
          />
          <Input
            value={subtitle}
            onChange={(event) => setSubtitle(event.target.value)}
            placeholder="Task subtitle"
            className="h-12 rounded-2xl border border-border bg-secondary px-4 text-sm text-foreground outline-none focus:border-primary"
          />
          <Input
            value={ctaLabel}
            onChange={(event) => setCtaLabel(event.target.value)}
            placeholder="CTA label"
            className="h-12 rounded-2xl border border-border bg-secondary px-4 text-sm text-foreground outline-none focus:border-primary"
          />
          <NativeSelect
            value={eventName}
            onChange={(event) => setEventName(event.target.value)}
            className="h-12 rounded-2xl border border-border bg-secondary px-4 text-sm text-foreground outline-none focus:border-primary"
          >
            {(data?.eventOptions ?? []).map((option) => (
              <NativeSelectOption key={option.eventName} value={option.eventName} className="bg-card">
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <NativeSelect
            value={actionType}
            onChange={(event) => setActionType(event.target.value)}
            className="h-12 rounded-2xl border border-border bg-secondary px-4 text-sm text-foreground outline-none focus:border-primary"
          >
            {(data?.actionOptions ?? []).map((option) => (
              <NativeSelectOption key={option.value} value={option.value} className="bg-card">
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <NativeSelect
            value={icon}
            onChange={(event) => setIcon(event.target.value)}
            className="h-12 rounded-2xl border border-border bg-secondary px-4 text-sm text-foreground outline-none focus:border-primary"
          >
            {(data?.iconOptions ?? []).map((option) => (
              <NativeSelectOption key={option.value} value={option.value} className="bg-card">
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <NativeSelect
            value={group}
            onChange={(event) => setGroup(event.target.value)}
            className="h-12 rounded-2xl border border-border bg-secondary px-4 text-sm text-foreground outline-none focus:border-primary"
          >
            {["visit", "notifications", "unwrap", "watch", "wallet", "purchase", "feedback", "share"].map((option) => (
              <NativeSelectOption key={option} value={option} className="bg-card">
                {option}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <Input
            type="number"
            min={DAILY_TASK_MIN_REWARD}
            max={DAILY_TASK_MAX_REWARD}
            value={reward}
            onChange={(event) => setReward(Number(event.target.value))}
            className="h-12 rounded-2xl border border-border bg-secondary px-4 text-sm text-foreground outline-none focus:border-primary"
          />
          <Input
            type="number"
            min={1}
            max={10}
            value={maxProgress}
            onChange={(event) => setMaxProgress(Number(event.target.value))}
            className="h-12 rounded-2xl border border-border bg-secondary px-4 text-sm text-foreground outline-none focus:border-primary"
          />
          <Input
            type="number"
            min={1}
            max={30}
            value={cooldownDays}
            onChange={(event) => setCooldownDays(Number(event.target.value))}
            className="h-12 rounded-2xl border border-border bg-secondary px-4 text-sm text-foreground outline-none focus:border-primary"
          />
          <Input
            value={uniqueByParamKey}
            onChange={(event) => setUniqueByParamKey(event.target.value)}
            placeholder="Unique by param key (optional)"
            className="h-12 rounded-2xl border border-border bg-secondary px-4 text-sm text-foreground outline-none focus:border-primary"
          />
          <NativeSelect
            value={criteriaMode}
            onChange={(event) => setCriteriaMode(event.target.value as CriteriaMode)}
            className="h-12 rounded-2xl border border-border bg-secondary px-4 text-sm text-foreground outline-none focus:border-primary"
          >
            <NativeSelectOption value="none" className="bg-card">No criteria</NativeSelectOption>
            <NativeSelectOption value="paramEquals" className="bg-card">Exact param match</NativeSelectOption>
            <NativeSelectOption value="minNumberParam" className="bg-card">Minimum number param</NativeSelectOption>
            <NativeSelectOption value="includesAnyParam" className="bg-card">Includes any value</NativeSelectOption>
          </NativeSelect>
          <Input
            value={criteriaKey}
            onChange={(event) => setCriteriaKey(event.target.value)}
            placeholder="Criteria param key"
            className="h-12 rounded-2xl border border-border bg-secondary px-4 text-sm text-foreground outline-none focus:border-primary"
          />
          <Input
            value={criteriaValue}
            onChange={(event) => setCriteriaValue(event.target.value)}
            placeholder={criteriaMode === "includesAnyParam" ? "Values, separated, by, commas" : "Criteria value"}
            className="h-12 rounded-2xl border border-border bg-secondary px-4 text-sm text-foreground outline-none focus:border-primary"
          />
          <NativeSelect
            value={criteriaValueType}
            onChange={(event) => setCriteriaValueType(event.target.value as "string" | "number" | "boolean")}
            className={cn(
              "h-12 rounded-2xl border border-border bg-secondary px-4 text-sm text-foreground outline-none focus:border-primary",
              criteriaMode !== "paramEquals" && "opacity-60",
            )}
            disabled={criteriaMode !== "paramEquals"}
          >
            <NativeSelectOption value="string" className="bg-card">Exact value is text</NativeSelectOption>
            <NativeSelectOption value="number" className="bg-card">Exact value is number</NativeSelectOption>
            <NativeSelectOption value="boolean" className="bg-card">Exact value is true/false</NativeSelectOption>
          </NativeSelect>
        </div>

        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          Use `uniqueByParamKey` for distinct progress keys, and use criteria to limit valid events.
        </p>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[1.4rem] border border-border bg-background/25 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Assignment scope</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="ghost"
                type="button"
                onClick={() => setScope("global")}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                  scope === "global" ? "border-primary bg-primary text-foreground" : "border-border bg-secondary text-muted-foreground",
                )}
              >
                Global rotation
              </Button>
              <Button variant="ghost"
                type="button"
                onClick={() => setScope("user")}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                  scope === "user" ? "border-primary bg-primary text-foreground" : "border-border bg-secondary text-muted-foreground",
                )}
              >
                Specific user
              </Button>
            </div>

            {scope === "user" ? (
              <div className="mt-3 space-y-2">
                <Input
                  list="task-target-users"
                  value={targetUserId}
                  onChange={(event) => setTargetUserId(event.target.value)}
                  placeholder="Target user UID"
                  className="h-12 w-full rounded-2xl border border-border bg-secondary px-4 text-sm text-foreground outline-none focus:border-primary"
                />
                <datalist id="task-target-users">
                  {users.map((user) => (
                    <NativeSelectOption key={user.uid} value={user.uid}>
                      {user.username ? `@${user.username}` : user.displayName || user.email || user.uid}
                    </NativeSelectOption>
                  ))}
                </datalist>
                {targetUser ? (
                  <p className="text-xs text-muted-foreground">
                    Targeting {targetUser.username ? `@${targetUser.username}` : targetUser.displayName || targetUser.email || targetUser.uid}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="rounded-[1.4rem] border border-border bg-background/25 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Rotation rules</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-primary/25 bg-primary/15 px-3 py-1 text-xs font-semibold text-foreground">
                +{reward} GD
              </span>
              <span className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-semibold text-foreground">
                {maxProgress} step{maxProgress === 1 ? "" : "s"}
              </span>
              <span className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-semibold text-foreground">
                {cooldownDays} day cooldown
              </span>
            </div>
            <label className="mt-4 flex cursor-pointer items-center justify-between rounded-2xl border border-border bg-secondary px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">One-time task</p>
                <p className="text-xs leading-5 text-muted-foreground">Completing it retires it from future rotation for that user.</p>
              </div>
              <Button variant="ghost"
                type="button"
                aria-pressed={oneTime}
                onClick={() => setOneTime((prev) => !prev)}
                className={cn(
                  "flex h-7 w-12 items-center rounded-full border px-1 transition-colors",
                  oneTime ? "border-primary bg-primary/90 justify-end" : "border-border bg-background/40 justify-start",
                )}
              >
                <span className="h-5 w-5 rounded-full bg-foreground" />
              </Button>
            </label>
          </div>
        </div>

        <Button variant="ghost"
          type="button"
          onClick={handleCreateTask}
          disabled={submitting}
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-primary bg-primary px-5 py-2 text-sm font-semibold text-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4" />}
          Create task
        </Button>
      </TaskCard>

      <TaskCard
        title="Custom task queue"
        subtitle="Pause or reactivate custom tasks while keeping cooldown, reward, and performance visible."
        icon={Target}
      >
        {isLoading ? (
          <div className="py-6 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" aria-hidden="true" />
          </div>
        ) : (data?.customTasks?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">No custom tasks created yet.</p>
        ) : (
          <div className="grid gap-3">
            {data?.customTasks.map((task) => {
              const isActive = task.active === true;
              return (
                <div key={task.id} className="rounded-[1.4rem] border border-border bg-background/30 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base font-semibold text-foreground">{normalizeString(task.title, "Untitled task")}</h4>
                        <span className={cn(
                          "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
                          isActive ? "border-primary/30 bg-primary/15 text-foreground" : "border-border bg-secondary text-muted-foreground",
                        )}>
                          {isActive ? "Active" : "Paused"}
                        </span>
                        <span className="rounded-full border border-border bg-secondary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {normalizeString(task.scope, "global")}
                        </span>
                        {task.oneTime === true ? (
                          <span className="rounded-full border border-success/25 bg-success/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-success">
                            One time
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{normalizeString(task.subtitle)}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                        <span>{TELEMETRY_EVENT_LABELS[normalizeString(task.eventName)] || normalizeString(task.eventName)}</span>
                        <span>Reward: +{normalizeNumber(task.reward)} GD</span>
                        <span>Progress: {normalizeNumber(task.maxProgress, 1)}</span>
                        <span>Cooldown: {normalizeNumber(task.cooldownDays, data?.defaultCooldownDays ?? 7)} days</span>
                        {normalizeString(task.targetUserId) ? <span>User: {normalizeString(task.targetUserId)}</span> : null}
                      </div>
                    </div>

                    <Button variant="ghost"
                      type="button"
                      disabled={updatingTaskId === task.id}
                      onClick={() => void toggleTaskState(task.id, !isActive)}
                      className={cn(
                        "inline-flex min-h-10 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-opacity disabled:opacity-60",
                        isActive ? "border-border bg-secondary text-foreground" : "border-primary bg-primary text-foreground",
                      )}
                    >
                      {updatingTaskId === task.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                      {isActive ? "Pause" : "Activate"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </TaskCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <TaskCard
          title="Task performance"
          subtitle="Completion checks, failure pressure, and average completion time from the latest task snapshot."
          icon={Trophy}
        >
          {(taskPerformance.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No task performance data has been recorded yet.</p>
          ) : (
            <div className="grid gap-3">
              {taskPerformance.slice(0, 8).map((task) => (
                <div key={task.id} className="rounded-[1.4rem] border border-border bg-background/30 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{task.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Last activity {task.lastEventAt ? formatRelativeTime(task.lastEventAt) : "just now"}</p>
                    </div>
                    <span className="rounded-full border border-primary/30 bg-primary/15 px-3 py-1 text-xs font-semibold text-foreground">
                      {task.completionRate}% done
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
                    <div className="rounded-2xl border border-border bg-secondary px-3 py-2">Assigned: {task.assigned}</div>
                    <div className="rounded-2xl border border-border bg-secondary px-3 py-2">Completed: {task.completed}</div>
                    <div className="rounded-2xl border border-border bg-secondary px-3 py-2">Failed: {task.failed}</div>
                    <div className="rounded-2xl border border-border bg-secondary px-3 py-2">
                      {task.avgCompletionMins > 0 ? `${task.avgCompletionMins}m avg` : "No avg yet"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TaskCard>

        <TaskCard
          title="Event trigger visibility"
          subtitle="Latest task-trigger rollup from the telemetry events feeding daily tasks."
          icon={Activity}
        >
          {(data?.eventStats?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No event activity has been recorded yet.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {data?.eventStats.slice(0, 12).map((stat) => {
                const label = TELEMETRY_EVENT_LABELS[normalizeString(stat.eventName)] || normalizeString(stat.eventName);
                const lastSeenAt = normalizeNumber(stat.lastSeenAt);
                return (
                  <div key={stat.id} className="rounded-[1.4rem] border border-border bg-background/30 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{label}</p>
                        <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">{normalizeString(stat.eventName)}</p>
                      </div>
                      <div className="rounded-full border border-primary/30 bg-primary/15 px-3 py-1 text-xs font-semibold text-foreground">
                        {normalizeNumber(stat.totalCount)}
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Last seen {lastSeenAt ? formatRelativeTime(lastSeenAt) : "never"}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </TaskCard>
      </div>

      <TaskCard
        title="Task lifecycle feed"
        subtitle="Recent assignments, starts, completions, failures, and reminder sends."
        icon={CheckCircle2}
      >
        {(data?.recentTaskEvents?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">No task lifecycle events yet.</p>
        ) : (
          <div className="grid gap-3">
            {data?.recentTaskEvents.map((event) => (
              <div key={event.id} className="rounded-[1.4rem] border border-border bg-background/30 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-primary/30 bg-primary/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-foreground">
                    {normalizeString(event.type)}
                  </span>
                  <span className="text-sm font-semibold text-foreground">{normalizeString(event.title, "Untitled task")}</span>
                  {normalizeNumber(event.durationMs) > 0 ? (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock3 className="h-3.5 w-3.5" />
                      {Math.round(normalizeNumber(event.durationMs) / 60000)}m
                    </span>
                  ) : null}
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
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

      <Surface className="rounded-[1.6rem] border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/25 bg-primary/15 text-foreground">
            <Repeat className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">Rotation rules now supported</h3>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              Cooldowns, lifecycle tracking, and one-time retirement now stay in one task surface.
            </p>
          </div>
        </div>
      </Surface>
    </div>
  );
}
