import {
  DAILY_CHECK_IN_TASK_CONTRACT,
  type DailyTaskKind,
  type DailyTaskResetPolicy,
  type DailyTaskRewardSource,
} from "@/lib/tasks/daily-task-contract";
import type { DailyTaskDurationConfidence } from "@/lib/tasks/daily-task-duration";
import type { ConsentMode } from "@/lib/privacy/consent-tracking-contract";

export const DAILY_TASK_LIFECYCLE_EVENT_NAMES = [
  "daily_task_surface_viewed",
  "daily_task_card_viewed",
  "daily_task_guidance_opened",
  "daily_task_started",
  "daily_task_action_attempted",
  "daily_task_completed",
  "daily_task_reward_granted",
  "daily_task_failed",
  "daily_task_abandoned",
  "daily_task_reset_locked",
  "daily_task_next_eligible_viewed",
] as const;

export type DailyTaskLifecycleEventName = (typeof DAILY_TASK_LIFECYCLE_EVENT_NAMES)[number];
export type DailyTaskLifecycleStatus = "live" | "review" | "degraded";

export type DailyTaskLifecyclePayloadInput = {
  eventName: DailyTaskLifecycleEventName;
  taskId: string;
  taskKind: DailyTaskKind;
  userId?: string | null;
  consentMode?: ConsentMode | "unknown";
  rewardGdAmount: number;
  rewardSource?: DailyTaskRewardSource;
  resetPolicy: DailyTaskResetPolicy;
  nextEligibleAt?: number | null;
  startedAt?: number | null;
  durationMs?: number | null;
  durationConfidence?: DailyTaskDurationConfidence;
  failureReason?: string | null;
  sourceComponent: string;
  route: string;
  serverTruthSource?: string | null;
};

export type DailyTaskLifecycleEventPayload = {
  event_name: DailyTaskLifecycleEventName;
  task_id: string;
  task_kind: DailyTaskKind;
  user_id?: string;
  consent_mode: ConsentMode | "unknown";
  reward_gd: number;
  reward_source: DailyTaskRewardSource;
  reset_policy: DailyTaskResetPolicy;
  next_eligible_at?: number;
  started_at?: number;
  duration_ms?: number;
  duration_confidence?: DailyTaskDurationConfidence;
  failure_reason?: string;
  source_component: string;
  route: string;
  sourceTruth: "client_supporting" | "server_reward_truth";
  server_truth_source?: string;
};

export type DailyTaskLifecycleDebugLane = {
  lane: "Daily task lifecycle";
  status: DailyTaskLifecycleStatus;
  missingStarts: number;
  completionsWithoutStarts: number;
  rewardsWithoutCompletions: number;
  durationUnavailableCount: number;
  failureReasons: string[];
  rawDetailsCollapsedByDefault: true;
  sourceOfTruth: "src/lib/tasks/daily-task-telemetry.ts";
};

function finiteNumber(value: unknown): number | undefined {
  if (!Number.isFinite(value)) return undefined;
  return Math.floor(Number(value));
}

export function buildDailyTaskLifecycleEventPayload(input: DailyTaskLifecyclePayloadInput): DailyTaskLifecycleEventPayload {
  const rewardSource = input.rewardSource ?? DAILY_CHECK_IN_TASK_CONTRACT.rewardSource;
  const payload: DailyTaskLifecycleEventPayload = {
    event_name: input.eventName,
    task_id: input.taskId,
    task_kind: input.taskKind,
    consent_mode: input.consentMode ?? "unknown",
    reward_gd: Math.max(0, Math.floor(input.rewardGdAmount)),
    reward_source: rewardSource,
    reset_policy: input.resetPolicy,
    source_component: input.sourceComponent,
    route: input.route,
    sourceTruth: input.serverTruthSource ? "server_reward_truth" : "client_supporting",
  };

  const nextEligibleAt = finiteNumber(input.nextEligibleAt);
  const startedAt = finiteNumber(input.startedAt);
  const durationMs = finiteNumber(input.durationMs);

  if (input.userId) payload.user_id = input.userId;
  if (nextEligibleAt) payload.next_eligible_at = nextEligibleAt;
  if (startedAt) payload.started_at = startedAt;
  if (typeof durationMs === "number") payload.duration_ms = durationMs;
  if (input.durationConfidence) payload.duration_confidence = input.durationConfidence;
  if (input.failureReason) payload.failure_reason = input.failureReason;
  if (input.serverTruthSource) payload.server_truth_source = input.serverTruthSource;

  return payload;
}

export function buildDailyTaskLifecycleDebugLane(input: {
  missingStarts?: number;
  completionsWithoutStarts?: number;
  rewardsWithoutCompletions?: number;
  durationUnavailableCount?: number;
  failureReasons?: readonly string[];
} = {}): DailyTaskLifecycleDebugLane {
  const missingStarts = Math.max(0, input.missingStarts ?? 0);
  const completionsWithoutStarts = Math.max(0, input.completionsWithoutStarts ?? 0);
  const rewardsWithoutCompletions = Math.max(0, input.rewardsWithoutCompletions ?? 0);
  const durationUnavailableCount = Math.max(0, input.durationUnavailableCount ?? 0);
  const hardGapCount = missingStarts + completionsWithoutStarts + rewardsWithoutCompletions;
  const status: DailyTaskLifecycleStatus = hardGapCount > 0
    ? "degraded"
    : durationUnavailableCount > 0
      ? "review"
      : "live";

  return {
    lane: "Daily task lifecycle",
    status,
    missingStarts,
    completionsWithoutStarts,
    rewardsWithoutCompletions,
    durationUnavailableCount,
    failureReasons: [...new Set(input.failureReasons ?? [])],
    rawDetailsCollapsedByDefault: true,
    sourceOfTruth: "src/lib/tasks/daily-task-telemetry.ts",
  };
}
