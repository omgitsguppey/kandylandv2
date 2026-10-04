import {buildDropQueueLifecycleProjection, type QueueManagedDropLike} from "./drop-queue-lifecycle"
import {getFiniteDropTimestamp, resolveDropStatusFromTiming, type QueueDropStatus} from "./drop-status"
import {QUEUE_RUNTIME_WARNING_CODES} from "./runtime-warning-contract"

const ONE_DAY_MS = 24 * 60 * 60 * 1000

export type QueueRuntimeConfig = {
  queue: string[]
  cooldownDays: number
  timesPerDay: string[]
}

/** Existing bootstrap recovery window; complete saved records bypass the legacy scan. */
export const LEGACY_QUEUED_DROP_SCAN_LIMIT = 1_000

export const DROP_QUEUE_AUTHORITY_VERSION = 1

export type QueueSettingsConfig = QueueRuntimeConfig & {
  dropsPerDay: number
  queueAuthorityVersion?: typeof DROP_QUEUE_AUTHORITY_VERSION
}

/** Decode the complete queue DTO without normalizing membership or schedule semantics. */
export function readQueueSettingsConfig(value: unknown): QueueSettingsConfig | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const raw = value as Record<string, unknown>;
    const hasAuthorityVersion = Object.prototype.hasOwnProperty.call(raw, "queueAuthorityVersion");
    if (hasAuthorityVersion && raw.queueAuthorityVersion !== DROP_QUEUE_AUTHORITY_VERSION) return null;
    const { queue, dropsPerDay, cooldownDays, timesPerDay } = raw;
    if (!Array.isArray(queue) || !queue.every(id => typeof id === "string" && id.length > 0) || new Set(queue).size !== queue.length) return null;
    if (typeof dropsPerDay !== "number" || !Number.isSafeInteger(dropsPerDay) || dropsPerDay < 1) return null;
    if (typeof cooldownDays !== "number" || !Number.isSafeInteger(cooldownDays) || cooldownDays < 1) return null;
    if (!Array.isArray(timesPerDay) || timesPerDay.length !== dropsPerDay || !timesPerDay.every(time => typeof time === "string" && /^\d{2}:\d{2}$/.test(time))) return null;
    return { queue: [...queue], dropsPerDay, cooldownDays, timesPerDay: [...timesPerDay],
        ...(hasAuthorityVersion ? { queueAuthorityVersion: DROP_QUEUE_AUTHORITY_VERSION } : {}) };
}

/** Only a deliberately saved complete list can retire legacy membership recovery. */
export function readSavedQueueSettingsConfig(value: unknown): QueueSettingsConfig | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const raw = value as Record<string, unknown>
  if (!Object.prototype.hasOwnProperty.call(raw, "queueAuthorityVersion")) return null
  const config = readQueueSettingsConfig(raw)
  if (!config) throw new Error("Saved drop queue configuration is invalid")
  return config
}

export type QueuedDropRuntime = QueueManagedDropLike & {
  activationCount: number
}

export type ActivationDropRuntime = {
  id: string
  validFrom: number | null
  validUntil: number | null
  activationCount: number
  imageUrl?: string
  title: string
  status: "scheduled" | "active"
  autoQueueOnExpire: boolean
}

export type QueueRuntimeInvariant = {
  code: string
  severity: "warn" | "error"
  message: string
  dropId?: string
  detail?: Record<string, unknown>
}

export function buildProcessQueueLifecyclePlan(input: {
  config: QueueRuntimeConfig
  dropsById: Record<string, QueuedDropRuntime | undefined>
  now: number
}) {
  const queueEntries = input.config.queue
    .map((dropId) => input.dropsById[dropId])
    .filter((drop): drop is QueuedDropRuntime => Boolean(drop))
  const lifecycleMap = buildDropQueueLifecycleProjection(queueEntries, {
    cooldownDays: input.config.cooldownDays,
    timesPerDay: input.config.timesPerDay,
    now: input.now,
  })
  const pendingUpdates = new Map<string, Record<string, unknown>>()
  const lifecycleReconciled: Array<{dropId: string; status: QueueDropStatus}> = []
  const scheduledUpdates: Array<{dropId: string; validFrom: number; activationCount: number}> = []
  const invariants: QueueRuntimeInvariant[] = []

  for (const dropId of input.config.queue) {
    const drop = input.dropsById[dropId]
    if (!drop) {
      invariants.push({
        code: "missing_queue_drop_document",
        severity: "warn",
        message: "Queue configuration references a missing drop document.",
        dropId,
      })
      continue
    }

    const resolvedStatus = resolveDropStatusFromTiming(drop, input.now)
    const projection = lifecycleMap.get(dropId)
    const pending = pendingUpdates.get(dropId) ?? {}

    if (drop.status !== resolvedStatus) {
      pending.status = resolvedStatus
      lifecycleReconciled.push({dropId, status: resolvedStatus})
    }

    if (projection?.queueStatus === "queued" && typeof projection.queueSlotMs === "number") {
      pending.validFrom = projection.queueSlotMs
      pending.validUntil = projection.queueSlotMs + ONE_DAY_MS
      pending.status = "scheduled"
      pending.activationCount = drop.activationCount + 1
      scheduledUpdates.push({
        dropId,
        validFrom: projection.queueSlotMs,
        activationCount: drop.activationCount + 1,
      })
    }

    if (projection?.queueStatus === "queued" && projection.queueSlotMs === null) {
      invariants.push({
        code: QUEUE_RUNTIME_WARNING_CODES.noFutureSlot,
        severity: "error",
        message: "A cooldown-eligible queued drop has no future slot.",
        dropId,
        detail: {
          cooldownEndsAt: projection.cooldownEndsAt,
        },
      })
    }

    const validFrom = getFiniteDropTimestamp(drop.validFrom)
    if (resolvedStatus === "scheduled" && validFrom !== null && validFrom <= input.now) {
      invariants.push({
        code: QUEUE_RUNTIME_WARNING_CODES.scheduledPastDue,
        severity: "error",
        message: "A scheduled drop is past due and should have activated already.",
        dropId,
        detail: {
          validFrom,
          now: input.now,
        },
      })
    }

    if (Object.keys(pending).length > 0) {
      pendingUpdates.set(dropId, pending)
    }
  }

  const queueMembershipDrift = Object.values(input.dropsById)
    .filter((drop): drop is QueuedDropRuntime => Boolean(drop))
    .filter((drop) => !input.config.queue.includes(drop.id))

  for (const drifted of queueMembershipDrift) {
    invariants.push({
      code: QUEUE_RUNTIME_WARNING_CODES.queueMembershipDrift,
      severity: "warn",
      message: "Drop runtime payload surfaced a queue-managed drop outside canonical queue config.",
      dropId: drifted.id,
    })
  }

  return {
    pendingUpdates,
    lifecycleReconciled,
    scheduledUpdates,
    invariants,
    itemsScanned: input.config.queue.length,
    itemsChanged: pendingUpdates.size,
  }
}

export function buildNotifyActiveDropsLifecyclePlan(input: {
  scheduledDrops: ActivationDropRuntime[]
  activeDrops: ActivationDropRuntime[]
  now: number
}) {
  const statusUpdates = new Map<string, Record<string, unknown>>()
  const activatedDrops: string[] = []
  const expiredDrops: string[] = []
  const autoQueuedDropIds = new Set<string>()
  const activationNotifications: Array<{
    dropId: string
    dropTitle: string
    imageUrl?: string
    isReturn: boolean
    activationKey: string
  }> = []
  const invariants: QueueRuntimeInvariant[] = []

  for (const drop of input.scheduledDrops) {
    const nextStatus = resolveDropStatusFromTiming({
      validFrom: drop.validFrom,
      validUntil: drop.validUntil,
      status: drop.status,
    }, input.now)

    if (nextStatus === "scheduled") {
      if (typeof drop.validFrom === "number" && drop.validFrom <= input.now) {
        invariants.push({
          code: QUEUE_RUNTIME_WARNING_CODES.scheduledPastDue,
          severity: "error",
          message: "A scheduled drop is still pending even though its start time has passed.",
          dropId: drop.id,
          detail: {
            validFrom: drop.validFrom,
            now: input.now,
          },
        })
      }
      continue
    }

    statusUpdates.set(drop.id, {status: nextStatus})

    if (nextStatus === "expired") {
      expiredDrops.push(drop.title || drop.id)
      if (drop.autoQueueOnExpire === true) {
        autoQueuedDropIds.add(drop.id)
      }
      continue
    }

    activatedDrops.push(drop.title || drop.id)
    activationNotifications.push({
      dropId: drop.id,
      dropTitle: drop.title || "New Drop",
      imageUrl: drop.imageUrl,
      isReturn: drop.activationCount >= 1,
      activationKey: `drop-activation:${drop.id}:${drop.validFrom || 0}`,
    })
  }

  for (const drop of input.activeDrops) {
    const nextStatus = resolveDropStatusFromTiming({
      validFrom: drop.validFrom,
      validUntil: drop.validUntil,
      status: drop.status,
    }, input.now)

    if (nextStatus === "active") {
      if (typeof drop.validUntil === "number" && drop.validUntil <= input.now) {
        invariants.push({
          code: QUEUE_RUNTIME_WARNING_CODES.activePastDue,
          severity: "error",
          message: "An active drop is past validUntil but has not expired.",
          dropId: drop.id,
          detail: {
            validUntil: drop.validUntil,
            now: input.now,
          },
        })
      }
      continue
    }

    statusUpdates.set(drop.id, {status: nextStatus})
    expiredDrops.push(drop.title || drop.id)
    if (drop.autoQueueOnExpire === true) {
      autoQueuedDropIds.add(drop.id)
    }
  }

  return {
    statusUpdates,
    activatedDrops,
    expiredDrops,
    autoQueuedDropIds,
    activationNotifications,
    invariants,
    itemsScanned: input.scheduledDrops.length + input.activeDrops.length,
    itemsChanged: statusUpdates.size + autoQueuedDropIds.size,
  }
}
