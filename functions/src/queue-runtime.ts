import {FieldValue} from "firebase-admin/firestore"
import {getMessaging} from "firebase-admin/messaging"

import {adminApp, db} from "./firebase-admin.js"
import {
  recordNotificationDispatchOutcome,
  recordQueueJobHeartbeat,
  recordRuntimeWarning,
} from "./runtime-warning-store.js"
import {
  buildNotifyActiveDropsLifecyclePlan,
  buildProcessQueueLifecyclePlan,
  type ActivationDropRuntime,
  type QueuedDropRuntime,
} from "@shared/runtime/queue-runtime"
import {
  QUEUE_RUNTIME_WARNING_CODES,
  type NotificationDispatchOutcomeStatus,
  type RuntimeWarningExecutionLayer,
} from "@shared/runtime/runtime-warning-contract"
import {getFiniteDropTimestamp} from "@shared/runtime/drop-status"

const DROP_COLLECTION_LINK = "/drops"
const SYSTEM_RUNTIME_COLLECTION = "systemRuntime"
const DROP_RUNTIME_DOC_ID = "drops"
const NOTIFICATION_RUNTIME_DOC_ID = "notifications"
const DEFAULT_QUEUE_CONFIG = {
  queue: [] as string[],
  dropsPerDay: 1,
  cooldownDays: 7,
  timesPerDay: ["12:00"],
}

function normalizeTimesPerDay(timesPerDay: unknown, dropsPerDay: number) {
  const rawTimes = Array.isArray(timesPerDay) ?
    timesPerDay.filter((value): value is string => typeof value === "string" && /^\d{2}:\d{2}$/.test(value)) :
    []
  const sortedTimes = [...rawTimes].sort((left, right) => left.localeCompare(right))

  if (sortedTimes.length === 0) {
    return Array.from({length: dropsPerDay}, (_, index) => (index === 0 ? "12:00" : "18:00"))
  }

  if (sortedTimes.length >= dropsPerDay) {
    return sortedTimes.slice(0, dropsPerDay)
  }

  return [
    ...sortedTimes,
    ...Array(dropsPerDay - sortedTimes.length).fill(sortedTimes[sortedTimes.length - 1] || "12:00"),
  ]
}

function normalizeQueueConfig(raw: Record<string, unknown> | null | undefined) {
  const dropsPerDay = Math.max(1, Math.floor(Number(raw?.dropsPerDay) || DEFAULT_QUEUE_CONFIG.dropsPerDay))
  const cooldownDays = Math.max(1, Math.floor(Number(raw?.cooldownDays) || DEFAULT_QUEUE_CONFIG.cooldownDays))
  const queue = Array.isArray(raw?.queue) ?
    Array.from(new Set(raw.queue.filter((value): value is string => typeof value === "string" && value.length > 0))) :
    []

  return {
    queue,
    dropsPerDay,
    cooldownDays,
    timesPerDay: normalizeTimesPerDay(raw?.timesPerDay, dropsPerDay),
  }
}

async function getLegacyQueuedDropIds() {
  const snapshot = await db.collection("drops").where("rotationConfig.enabled", "==", true).get()
  return snapshot.docs.map((doc) => doc.id)
}

async function getResolvedQueueConfig() {
  const [queueSnap, legacyIds] = await Promise.all([
    db.collection("adminSettings").doc("dropQueue").get(),
    getLegacyQueuedDropIds(),
  ])

  const stored = normalizeQueueConfig(queueSnap.exists ? queueSnap.data() as Record<string, unknown> : DEFAULT_QUEUE_CONFIG)
  return {
    ...stored,
    queue: Array.from(new Set([...stored.queue, ...legacyIds])),
  }
}

async function buildQueuedDropsMap(dropIds: string[]) {
  const dropsMap = Object.create(null) as Record<string, QueuedDropRuntime>
  const refs = dropIds.map((dropId) => db.collection("drops").doc(dropId))
  const snapshots = refs.length > 0 ? await db.getAll(...refs) : []

  for (const snapshot of snapshots) {
    if (!snapshot.exists) {
      continue
    }

    const data = snapshot.data()
    if (!data) {
      continue
    }

    dropsMap[snapshot.id] = {
      id: snapshot.id,
      validFrom: getFiniteDropTimestamp(data.validFrom),
      validUntil: getFiniteDropTimestamp(data.validUntil),
      activationCount: Number.isFinite(Number(data.activationCount)) ? Number(data.activationCount) : 0,
      status: data.status === "active" || data.status === "expired" || data.status === "scheduled" ?
        data.status :
        null,
    }
  }

  return dropsMap
}

function markRuntimeChanged(batch: FirebaseFirestore.WriteBatch, docId: string, nowMs: number) {
  batch.set(db.collection(SYSTEM_RUNTIME_COLLECTION).doc(docId), {
    lastChangedAt: nowMs,
    lastChangedAtServer: FieldValue.serverTimestamp(),
    version: FieldValue.increment(1),
  }, {merge: true})
}

async function recordInvariantWarnings(input: {
  invariants: Array<{code: string; severity: "warn" | "error"; message: string; dropId?: string; detail?: Record<string, unknown>}>
  executionLayer: RuntimeWarningExecutionLayer
  surface: string
}) {
  await Promise.allSettled(
    input.invariants.map((invariant) =>
      recordRuntimeWarning({
        code: invariant.code,
        severity: invariant.severity,
        surface: input.surface,
        moduleKey: invariant.dropId ?? "queue",
        executionLayer: input.executionLayer,
        status: invariant.severity === "error" ? "failed" : "degraded",
        detail: {
          message: invariant.message,
          ...(invariant.detail ?? {}),
        },
      }),
    ),
  )
}

async function reserveDropActivationNotification(dropId: string, activationKey?: string) {
  if (!activationKey) {
    return true
  }

  const dropRef = db.collection("drops").doc(dropId)
  let reserved = false

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(dropRef)
    if (!snapshot.exists) {
      return
    }

    const data = snapshot.data() ?? {}
    const currentKey = typeof data.lastActivationNotificationKey === "string" ?
      data.lastActivationNotificationKey :
      null
    if (currentKey === activationKey) {
      return
    }

    transaction.set(dropRef, {
      lastActivationNotificationKey: activationKey,
      lastActivationNotificationAt: Date.now(),
    }, {merge: true})
    reserved = true
  })

  return reserved
}

async function touchNotificationsRuntime(nowMs: number) {
  await db.collection(SYSTEM_RUNTIME_COLLECTION).doc(NOTIFICATION_RUNTIME_DOC_ID).set({
    lastChangedAt: nowMs,
    lastChangedAtServer: FieldValue.serverTimestamp(),
    version: FieldValue.increment(1),
  }, {merge: true})
}

async function queueDropNotificationDoc(
  dropTitle: string,
  dropId: string,
  imageUrl: string | undefined,
  title: string,
  message: string,
  excludedUserIds: string[],
) {
  const nowMs = Date.now()
  await db.collection("notifications").add({
    title,
    message,
    type: "success",
    target: {global: true, excludedUserIds, userIds: []},
    link: DROP_COLLECTION_LINK,
    dropContext: imageUrl ? {
      dropId,
      dropTitle,
      previewImageUrl: imageUrl,
    } : null,
    createdAt: FieldValue.serverTimestamp(),
    createdAtMs: nowMs,
    readBy: [],
  })

  await touchNotificationsRuntime(nowMs)
}

async function broadcastFCM(
  title: string,
  body: string,
  url = DROP_COLLECTION_LINK,
  type: "new_drop" | "expiring_soon" | "system_alert" | "general" = "general",
) {
  const messaging = getMessaging(adminApp)
  const batchSize = 500
  let tokensChunk: string[] = []
  const tokenToUidMap = new Map<string, string>()
  let successCount = 0
  let failureCount = 0
  let tokensSent = false

  const stream = db.collection("users")
    .select("fcmTokens", "notificationSettings")
    .stream()

  const dispatchBatch = async (tokens: string[]) => {
    if (tokens.length === 0) {
      return
    }

    tokensSent = true
    const response = await messaging.sendEachForMulticast({
      notification: {title, body},
      data: {url},
      tokens,
    })
    successCount += response.successCount
    failureCount += response.failureCount

    if (response.failureCount > 0) {
      const failedTokensToRemoveByUid = new Map<string, string[]>()
      response.responses.forEach((item, index) => {
        const errorCode = item.error?.code
        if (!item.success && (
          errorCode === "messaging/invalid-registration-token" ||
          errorCode === "messaging/registration-token-not-registered"
        )) {
          const deadToken = tokens[index]
          if (!deadToken) {
            return
          }

          const uid = tokenToUidMap.get(deadToken)
          if (!uid) {
            return
          }

          const deadList = failedTokensToRemoveByUid.get(uid) ?? []
          deadList.push(deadToken)
          failedTokensToRemoveByUid.set(uid, deadList)
        }
      })

      if (failedTokensToRemoveByUid.size > 0) {
        const cleanupBatch = db.batch()
        let batchCount = 0
        for (const [uid, deadTokens] of failedTokensToRemoveByUid.entries()) {
          if (batchCount >= 500) {
            break
          }
          cleanupBatch.update(db.collection("users").doc(uid), {
            fcmTokens: FieldValue.arrayRemove(...deadTokens),
          })
          batchCount += 1
        }
        if (batchCount > 0) {
          await cleanupBatch.commit()
        }
      }
    }
  }

  for await (const rawDoc of stream) {
    const doc = rawDoc as unknown as FirebaseFirestore.QueryDocumentSnapshot
    const data = doc.data()
    const notificationSettings = data?.notificationSettings && typeof data.notificationSettings === "object" ?
      data.notificationSettings as Record<string, unknown> :
      {}
    const browserPushEnabled = notificationSettings.browserPushEnabled === true
    const newDropAlertsEnabled = notificationSettings.newDropAlerts !== false
    const expiringSoonAlertsEnabled = notificationSettings.expiringSoonAlerts !== false
    const tokens = Array.isArray(data?.fcmTokens) ?
      data.fcmTokens.filter((entry: unknown): entry is string => typeof entry === "string" && entry.trim().length > 0) :
      []

    let shouldSend = false
    if (browserPushEnabled) {
      if (type === "new_drop") {
        shouldSend = newDropAlertsEnabled
      } else if (type === "expiring_soon") {
        shouldSend = expiringSoonAlertsEnabled
      } else {
        shouldSend = true
      }
    }

    if (shouldSend && tokens.length > 0) {
      tokens.forEach((token: string) => tokenToUidMap.set(token, doc.id))
      tokensChunk.push(...tokens)

      while (tokensChunk.length >= batchSize) {
        const batchToDispatch = tokensChunk.slice(0, batchSize)
        tokensChunk = tokensChunk.slice(batchSize)
        await dispatchBatch(batchToDispatch)
      }
    }
  }

  if (tokensChunk.length > 0) {
    await dispatchBatch(tokensChunk)
  }

  return !tokensSent || failureCount === 0 || successCount > 0
}

async function finalizeDispatchOutcome(input: {
  activationKey: string
  dropId: string
  status: NotificationDispatchOutcomeStatus
  errorCode?: string | null
  detail?: Record<string, unknown>
}) {
  await recordNotificationDispatchOutcome({
    activationKey: input.activationKey,
    dropId: input.dropId,
    status: input.status,
    errorCode: input.errorCode ?? null,
    detail: input.detail,
  })

  return {
    activationKey: input.activationKey,
    dropId: input.dropId,
    status: input.status,
    errorCode: input.errorCode ?? null,
    detail: input.detail ?? {},
  }
}

async function sendTargetedDropNotification(
  dropTitle: string,
  dropId: string,
  imageUrl: string | undefined,
  isReturn: boolean,
  excludedUserIds: string[],
  activationKey: string,
) {
  const shouldSend = await reserveDropActivationNotification(dropId, activationKey)
  if (!shouldSend) {
    return finalizeDispatchOutcome({
      activationKey,
      dropId,
      status: "duplicate",
      detail: {
        dropTitle,
        imageUrlPresent: Boolean(imageUrl),
        isReturn,
        excludedUserIdsCount: excludedUserIds.length,
      },
    })
  }

  const title = isReturn ? "Drop Returned 🔥" : "New Drop Live 🔥"
  const message = isReturn ?
    `Oh, snap! ${dropTitle} is back! Don't miss out this time!` :
    `${dropTitle} is now available in the drops collection!`

  try {
    await queueDropNotificationDoc(dropTitle, dropId, imageUrl, title, message, excludedUserIds)
  } catch (error) {
    return finalizeDispatchOutcome({
      activationKey,
      dropId,
      status: "failed",
      errorCode: "notification_in_app_queue_failed",
      detail: {
        dropTitle,
        imageUrlPresent: Boolean(imageUrl),
        isReturn,
        excludedUserIdsCount: excludedUserIds.length,
        errorMessage: error instanceof Error ? error.message : String(error),
      },
    })
  }

  const fcmDelivered = await broadcastFCM("Kandy Drops", message, DROP_COLLECTION_LINK, "new_drop")
  return finalizeDispatchOutcome({
    activationKey,
    dropId,
    status: fcmDelivered ? "sent" : "failed",
    errorCode: fcmDelivered ? null : "notification_fcm_dispatch_failed",
    detail: {
      dropTitle,
      imageUrlPresent: Boolean(imageUrl),
      isReturn,
      excludedUserIdsCount: excludedUserIds.length,
      fcmDelivered,
    },
  })
}

export async function processQueueLifecycleRuntime(input: {
  executionLayer: RuntimeWarningExecutionLayer
  surface: string
  staleAfterMs: number
}) {
  const startedAt = Date.now()
  await recordQueueJobHeartbeat({
    jobId: "process_queue",
    startedAt,
    completedAt: null,
    status: "running",
    durationMs: 0,
    itemsScanned: 0,
    itemsChanged: 0,
    warnings: [],
    staleAfterMs: input.staleAfterMs,
  })

  try {
    const config = await getResolvedQueueConfig()
    if (config.queue.length === 0) {
      const completedAt = Date.now()
      await recordQueueJobHeartbeat({
        jobId: "process_queue",
        startedAt,
        completedAt,
        status: "ok",
        durationMs: completedAt - startedAt,
        itemsScanned: 0,
        itemsChanged: 0,
        warnings: [],
        staleAfterMs: input.staleAfterMs,
      })

      return {message: "Queue is empty", updates: [], lifecycleReconciled: [], invariants: []}
    }

    const dropsMap = await buildQueuedDropsMap(config.queue)
    const now = Date.now()
    const plan = buildProcessQueueLifecyclePlan({
      config,
      dropsById: dropsMap,
      now,
    })

    await recordInvariantWarnings({
      invariants: plan.invariants,
      executionLayer: input.executionLayer,
      surface: input.surface,
    })

    if (plan.pendingUpdates.size > 0) {
      const batch = db.batch()
      for (const [dropId, update] of plan.pendingUpdates) {
        batch.update(db.collection("drops").doc(dropId), update)
      }
      markRuntimeChanged(batch, DROP_RUNTIME_DOC_ID, now)
      await batch.commit()
    }

    const completedAt = Date.now()
    await recordQueueJobHeartbeat({
      jobId: "process_queue",
      startedAt,
      completedAt,
      status: plan.invariants.some((entry) => entry.severity === "error") ? "warn" : "ok",
      durationMs: completedAt - startedAt,
      itemsScanned: plan.itemsScanned,
      itemsChanged: plan.itemsChanged,
      warnings: plan.invariants.map((entry) => entry.code),
      staleAfterMs: input.staleAfterMs,
    })

    return {
      message: plan.scheduledUpdates.length > 0 ?
        `Scheduled ${plan.scheduledUpdates.length} drops` :
        plan.lifecycleReconciled.length > 0 ?
          `Reconciled ${plan.lifecycleReconciled.length} queued drop statuses` :
          "No drops eligible for scheduling at this time.",
      updates: plan.scheduledUpdates,
      lifecycleReconciled: plan.lifecycleReconciled,
      invariants: plan.invariants,
    }
  } catch (error) {
    const completedAt = Date.now()
    await recordRuntimeWarning({
      code: "queue_runtime_failed",
      severity: "error",
      surface: input.surface,
      executionLayer: input.executionLayer,
      status: "failed",
      detail: {
        message: error instanceof Error ? error.message : String(error),
      },
    })
    await recordQueueJobHeartbeat({
      jobId: "process_queue",
      startedAt,
      completedAt,
      status: "failed",
      durationMs: completedAt - startedAt,
      itemsScanned: 0,
      itemsChanged: 0,
      warnings: ["queue_runtime_failed"],
      lastErrorCode: "queue_runtime_failed",
      staleAfterMs: input.staleAfterMs,
    })
    throw error
  }
}

export async function notifyActiveDropsRuntime(input: {
  executionLayer: RuntimeWarningExecutionLayer
  surface: string
  staleAfterMs: number
}) {
  const startedAt = Date.now()
  await recordQueueJobHeartbeat({
    jobId: "notify_active_drops",
    startedAt,
    completedAt: null,
    status: "running",
    durationMs: 0,
    itemsScanned: 0,
    itemsChanged: 0,
    warnings: [],
    staleAfterMs: input.staleAfterMs,
  })

  try {
    const now = Date.now()
    const dropsRef = db.collection("drops")
    const [scheduledSnap, activeSnap] = await Promise.all([
      dropsRef.where("status", "==", "scheduled").get(),
      dropsRef.where("status", "==", "active").get(),
    ])

    const toRuntimeDrop = (
      doc: FirebaseFirestore.QueryDocumentSnapshot,
      status: "scheduled" | "active",
    ): ActivationDropRuntime => {
      const data = doc.data() as Record<string, unknown>
      return {
        id: doc.id,
        validFrom: getFiniteDropTimestamp(data.validFrom),
        validUntil: getFiniteDropTimestamp(data.validUntil),
        activationCount: Number.isFinite(Number(data.activationCount)) ? Number(data.activationCount) : 0,
        imageUrl: typeof data.imageUrl === "string" ? data.imageUrl : undefined,
        title: typeof data.title === "string" && data.title.trim().length > 0 ? data.title : doc.id,
        status,
        autoQueueOnExpire: data.autoQueueOnExpire === true,
      }
    }

    const plan = buildNotifyActiveDropsLifecyclePlan({
      scheduledDrops: scheduledSnap.docs.map((doc) => toRuntimeDrop(doc, "scheduled")),
      activeDrops: activeSnap.docs.map((doc) => toRuntimeDrop(doc, "active")),
      now,
    })

    await recordInvariantWarnings({
      invariants: plan.invariants,
      executionLayer: input.executionLayer,
      surface: input.surface,
    })

    if (plan.statusUpdates.size > 0 || plan.autoQueuedDropIds.size > 0) {
      const batch = db.batch()
      for (const [dropId, update] of plan.statusUpdates) {
        batch.update(dropsRef.doc(dropId), update)
      }
      if (plan.autoQueuedDropIds.size > 0) {
        batch.set(db.collection("adminSettings").doc("dropQueue"), {
          queue: FieldValue.arrayUnion(...Array.from(plan.autoQueuedDropIds)),
        }, {merge: true})
      }
      markRuntimeChanged(batch, DROP_RUNTIME_DOC_ID, now)
      await batch.commit()
    }

    const warningCodes = plan.invariants.map((entry) => entry.code)

    for (const notification of plan.activationNotifications) {
      const excludedUserIds: string[] = []
      try {
        const ownersSnap = await db.collection("users")
          .where("unlockedContent", "array-contains", notification.dropId)
          .get()
        ownersSnap.forEach((userDoc) => excludedUserIds.push(userDoc.id))
      } catch (error) {
        warningCodes.push("owner_lookup_failed")
        await recordRuntimeWarning({
          code: "owner_lookup_failed",
          severity: "warn",
          surface: input.surface,
          moduleKey: notification.dropId,
          executionLayer: input.executionLayer,
          status: "degraded",
          detail: {
            activationKey: notification.activationKey,
            message: error instanceof Error ? error.message : String(error),
          },
        })
      }

      const outcome = await sendTargetedDropNotification(
        notification.dropTitle,
        notification.dropId,
        notification.imageUrl,
        notification.isReturn,
        excludedUserIds,
        notification.activationKey,
      )

      if (outcome.status === "failed") {
        warningCodes.push(QUEUE_RUNTIME_WARNING_CODES.notificationDispatchFailed)
      }
      if (outcome.status !== "sent" && outcome.status !== "duplicate") {
        await recordRuntimeWarning({
          code: QUEUE_RUNTIME_WARNING_CODES.notificationDispatchFailed,
          severity: "error",
          surface: input.surface,
          moduleKey: notification.dropId,
          executionLayer: input.executionLayer,
          status: "failed",
          detail: {
            activationKey: notification.activationKey,
            outcomeStatus: outcome.status,
            errorCode: outcome.errorCode,
          },
        })
      }
    }

    const completedAt = Date.now()
    await recordQueueJobHeartbeat({
      jobId: "notify_active_drops",
      startedAt,
      completedAt,
      status: warningCodes.length > 0 ? "warn" : "ok",
      durationMs: completedAt - startedAt,
      itemsScanned: plan.itemsScanned,
      itemsChanged: plan.itemsChanged,
      warnings: warningCodes,
      staleAfterMs: input.staleAfterMs,
    })

    return {
      message: `Activated ${plan.activatedDrops.length} drops, expired ${plan.expiredDrops.length} drops, and reconciled lifecycle status.`,
      activatedDrops: plan.activatedDrops,
      expiredDrops: plan.expiredDrops,
      autoQueuedDrops: Array.from(plan.autoQueuedDropIds),
      invariants: plan.invariants,
    }
  } catch (error) {
    const completedAt = Date.now()
    await recordRuntimeWarning({
      code: "notify_active_drops_failed",
      severity: "error",
      surface: input.surface,
      executionLayer: input.executionLayer,
      status: "failed",
      detail: {
        message: error instanceof Error ? error.message : String(error),
      },
    })
    await recordQueueJobHeartbeat({
      jobId: "notify_active_drops",
      startedAt,
      completedAt,
      status: "failed",
      durationMs: completedAt - startedAt,
      itemsScanned: 0,
      itemsChanged: 0,
      warnings: ["notify_active_drops_failed"],
      lastErrorCode: "notify_active_drops_failed",
      staleAfterMs: input.staleAfterMs,
    })
    throw error
  }
}
