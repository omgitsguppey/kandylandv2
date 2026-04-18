export const RUNTIME_WARNING_COLLECTION = "runtime_warning_records"
export const QUEUE_JOB_HEARTBEAT_COLLECTION = "queue_job_heartbeats"
export const NOTIFICATION_DISPATCH_OUTCOME_COLLECTION = "notification_dispatch_outcomes"

export type RuntimeWarningExecutionLayer =
  | "client"
  | "next_route"
  | "firebase_function"
  | "scheduler"
  | "derived_mirror"
  | "admin_surface"

export type RuntimeWarningStatus = "ok" | "degraded" | "fallback" | "failed"
export type RuntimeWarningSeverity = "info" | "warn" | "error"

export type RuntimeWarningRecord = {
  stable_id: string
  code: string
  severity: RuntimeWarningSeverity
  surface: string
  moduleKey: string | null
  executionLayer: RuntimeWarningExecutionLayer
  status: RuntimeWarningStatus
  detail: Record<string, unknown>
  firstSeenAt: number
  lastSeenAt: number
  occurrenceCount: number
  freshnessKey: string | null
}

export type QueueJobId = "process_queue" | "notify_active_drops"
export type QueueJobStatus = "ok" | "warn" | "failed" | "running"

export type QueueJobHeartbeat = {
  jobId: QueueJobId
  startedAt: number
  completedAt: number | null
  status: QueueJobStatus
  durationMs: number
  itemsScanned: number
  itemsChanged: number
  warnings: string[]
  lastErrorCode: string | null
  staleAfterMs: number
  updatedAt: number
}

export type NotificationDispatchOutcomeStatus =
  | "sent"
  | "duplicate"
  | "skipped_existing_owner"
  | "failed"

export type NotificationDispatchOutcome = {
  stable_id: string
  activationKey: string
  dropId: string
  status: NotificationDispatchOutcomeStatus
  errorCode: string | null
  detail: Record<string, unknown>
  createdAt: number
  updatedAt: number
}

export const QUEUE_RUNTIME_WARNING_CODES = {
  legacyAdapterInvoked: "legacy_queue_adapter_invoked",
  queueMembershipDrift: "queue_membership_drift",
  noFutureSlot: "queue_no_future_slot",
  scheduledPastDue: "scheduled_drop_past_due",
  activePastDue: "active_drop_past_due",
  activationMissingOutcome: "activation_missing_notification_outcome",
  notificationDispatchFailed: "notification_dispatch_failed",
  requiredFetchFallback: "required_fetch_fallback",
} as const

export const QUEUE_RUNTIME_WARNING_BUDGETS: Record<string, number> = {
  [QUEUE_RUNTIME_WARNING_CODES.legacyAdapterInvoked]: 0,
  [QUEUE_RUNTIME_WARNING_CODES.queueMembershipDrift]: 0,
  [QUEUE_RUNTIME_WARNING_CODES.noFutureSlot]: 0,
  [QUEUE_RUNTIME_WARNING_CODES.scheduledPastDue]: 0,
  [QUEUE_RUNTIME_WARNING_CODES.activePastDue]: 0,
  [QUEUE_RUNTIME_WARNING_CODES.activationMissingOutcome]: 0,
  [QUEUE_RUNTIME_WARNING_CODES.notificationDispatchFailed]: 0,
  [QUEUE_RUNTIME_WARNING_CODES.requiredFetchFallback]: 3,
}

function sanitizeStableSegment(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9/_-]+/g, "-")
    .replace(/[\\/]+/g, "__")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "")
}

export function buildRuntimeWarningStableId(input: {
  code: string
  executionLayer: RuntimeWarningExecutionLayer
  surface: string
  moduleKey?: string | null
}) {
  return [
    "runtime_warning",
    sanitizeStableSegment(input.code),
    sanitizeStableSegment(input.executionLayer),
    sanitizeStableSegment(input.surface),
    sanitizeStableSegment(input.moduleKey ?? "global"),
  ].join("__")
}

export function buildNotificationDispatchStableId(activationKey: string) {
  return `notification_dispatch__${sanitizeStableSegment(activationKey)}`
}
