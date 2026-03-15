import {setGlobalOptions} from "firebase-functions/v2"
import {onDocumentCreated} from "firebase-functions/v2/firestore"
import {onSchedule} from "firebase-functions/v2/scheduler"
import * as logger from "firebase-functions/logger"
import {FieldValue} from "firebase-admin/firestore"

import {
  buildIncrementUpdate,
  DASHBOARD_CACHE_COLLECTION,
  encodeKeyFragment,
  type AnalyticsEventFact,
  type AnalyticsWindowSummary,
  type GuestAnalyticsBatch,
  quantizePixelPoint,
  readBoolean,
  readNumber,
  readString,
  REGION,
  summarizeEventFacts,
  toTimeKeys,
} from "./analytics-core.js"
import {db, rtdb} from "./firebase-admin.js"
import {deriveGumdropEconomics} from "./gumdrop-economics.js"

setGlobalOptions({
  region: REGION,
  maxInstances: 10,
})

interface TaskEventFact {
  type?: string;
  taskId?: string;
  title?: string;
  userId?: string;
  username?: string;
  reward?: number;
  progress?: number;
  maxProgress?: number;
  timestamp?: number;
  durationMs?: number;
}

interface TransactionFact {
  type?: string;
  status?: string;
  userId?: string;
  amount?: number;
  cost?: number;
  grossRevenueUsd?: number;
  grossRevenueCents?: number;
  paypalFeeUsd?: number;
  paypalFeeCents?: number;
  netRevenueUsd?: number;
  netRevenueCents?: number;
  deliveredGumDrops?: number;
  paidGumDrops?: number;
  bonusGumDrops?: number;
  retailValueUsd?: number;
  bonusValueUsd?: number;
  adjustedProfitUsd?: number;
  adjustedProfitCents?: number;
  effectiveUsdPer100Gd?: number;
  bundleLabel?: string;
  bundleKey?: string;
  bundleTier?: string;
  timestamp?: number;
  description?: string;
  dropId?: string;
}

interface SecurityEventFact {
  eventName?: string;
  userId?: string;
  username?: string;
  reason?: string;
  label?: string;
  message?: string;
  locationLabel?: string;
  severity?: string;
  dropId?: string | null;
  assetIndex?: number | null;
  assetKey?: string | null;
  contentKind?: string | null;
  pagePath?: string | null;
  sessionId?: string | null;
  source?: string;
  userAgent?: string;
  timestamp?: number;
  dayKey?: string;
  hourKey?: string;
  minuteKey?: string;
}

function buildSessionFactId(event: AnalyticsEventFact) {
  const sessionKey = encodeKeyFragment(readString(event.sessionId) || readString(event.userId) || readString(event.minuteKey))
  const dropKey = encodeKeyFragment(readString(event.dropId) || "site")
  return `${sessionKey}_${dropKey}`
}

function buildWindowDocId(windowLabel: string) {
  return `window_${windowLabel.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}`
}

async function incrementRealtimeNode(path: string, patch: Record<string, unknown>) {
  await rtdb.ref(path).transaction((current) => {
    const next = typeof current === "object" && current !== null ? {...current as Record<string, unknown>} : {}
    Object.entries(patch).forEach(([key, value]) => {
      if (typeof value === "number") {
        const currentValue = typeof next[key] === "number" ? next[key] as number : 0
        next[key] = currentValue + value
      } else {
        next[key] = value
      }
    })
    return next
  })
}

async function writeWindowSummary(windowLabel: string, summary: AnalyticsWindowSummary) {
  await db.collection(DASHBOARD_CACHE_COLLECTION).doc(buildWindowDocId(windowLabel)).set({
    ...summary,
    updatedAt: FieldValue.serverTimestamp(),
  }, {merge: true})
}

async function queryEventsSince(sinceMs: number) {
  const snapshot = await db.collection("analytics_event_facts")
    .where("timestamp", ">=", sinceMs)
    .get()

  return snapshot.docs.map((doc) => doc.data() as AnalyticsEventFact)
}

async function writeCurrentAlerts(alerts: Array<Record<string, unknown>>) {
  await db.collection(DASHBOARD_CACHE_COLLECTION).doc("current_alerts").set({
    generatedAtMs: Date.now(),
    alerts,
    updatedAt: FieldValue.serverTimestamp(),
  }, {merge: true})
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export const onAnalyticsEventFactCreated = onDocumentCreated(
  {document: "analytics_event_facts/{eventId}", region: REGION},
  async (event) => {
    const data = event.data?.data() as AnalyticsEventFact | undefined
    if (!data) {
      return
    }

    const timestamp = readNumber(data.timestamp) || Date.now()
    const timeKeys = {
      dayKey: readString(data.dayKey) || toTimeKeys(timestamp).dayKey,
      hourKey: readString(data.hourKey) || toTimeKeys(timestamp).hourKey,
      minuteKey: readString(data.minuteKey) || toTimeKeys(timestamp).minuteKey,
    }
    const eventName = readString(data.eventName)
    const userId = readString(data.userId)
    const username = readString(data.username)
    const pagePath = readString(data.pagePath)
    const dropId = readString(data.dropId)
    const dropTitle = readString(data.dropTitle) || dropId
    const sessionId = readString(data.sessionId)
    const isMobileViewport = readBoolean(data.isMobileViewport)
    const durationMs = readNumber(data.durationMs)
    const watchSeconds = Math.max(
      readNumber(data.watchSeconds),
      readNumber(data.sessionWatchSeconds),
    )
    const loadMs = readNumber(data.loadMs)
    const dayRef = db.collection("analytics_rollups_daily").doc(timeKeys.dayKey)
    const batch = db.batch()

    batch.set(dayRef, {
      dayKey: timeKeys.dayKey,
      totalEvents: buildIncrementUpdate(1),
      authenticatedEvents: buildIncrementUpdate(1),
      mobileEvents: buildIncrementUpdate(isMobileViewport ? 1 : 0),
      viewerSessions: buildIncrementUpdate(eventName === "viewer_session_started" ? 1 : 0),
      unwraps: buildIncrementUpdate(eventName === "unlock_drop_success" ? 1 : 0),
      purchases: buildIncrementUpdate(eventName === "gumdrops_purchase_completed" ? 1 : 0),
      watchSecondsTotal: buildIncrementUpdate(watchSeconds),
      watchSampleCount: buildIncrementUpdate(watchSeconds > 0 ? 1 : 0),
      loadMsTotal: buildIncrementUpdate(loadMs),
      loadSampleCount: buildIncrementUpdate(loadMs > 0 ? 1 : 0),
      durationMsTotal: buildIncrementUpdate(durationMs),
      durationSampleCount: buildIncrementUpdate(durationMs > 0 ? 1 : 0),
      lastEventAt: timestamp,
      updatedAt: FieldValue.serverTimestamp(),
    }, {merge: true})

    batch.set(dayRef.collection("events").doc(encodeKeyFragment(eventName)), {
      eventName,
      count: buildIncrementUpdate(1),
      lastEventAt: timestamp,
      updatedAt: FieldValue.serverTimestamp(),
    }, {merge: true})

    if (pagePath) {
      batch.set(dayRef.collection("pages").doc(encodeKeyFragment(pagePath)), {
        pagePath,
        count: buildIncrementUpdate(1),
        mobileCount: buildIncrementUpdate(isMobileViewport ? 1 : 0),
        lastEventAt: timestamp,
        updatedAt: FieldValue.serverTimestamp(),
      }, {merge: true})
    }

    if (userId) {
      batch.set(db.collection("analytics_users_rollup").doc(userId), {
        uid: userId,
        username: username || userId,
        eventCount: buildIncrementUpdate(1),
        sessionCount: buildIncrementUpdate(eventName === "viewer_session_started" ? 1 : 0),
        unwrapCount: buildIncrementUpdate(eventName === "unlock_drop_success" ? 1 : 0),
        purchaseCount: buildIncrementUpdate(eventName === "gumdrops_purchase_completed" ? 1 : 0),
        watchSecondsTotal: buildIncrementUpdate(watchSeconds),
        loadMsTotal: buildIncrementUpdate(loadMs),
        loadSampleCount: buildIncrementUpdate(loadMs > 0 ? 1 : 0),
        lastSeenAt: timestamp,
        updatedAt: FieldValue.serverTimestamp(),
      }, {merge: true})

      batch.set(db.collection("analytics_user_daily").doc(`${timeKeys.dayKey}_${userId}`), {
        dayKey: timeKeys.dayKey,
        uid: userId,
        username: username || userId,
        eventCount: buildIncrementUpdate(1),
        sessionCount: buildIncrementUpdate(eventName === "viewer_session_started" ? 1 : 0),
        unwrapCount: buildIncrementUpdate(eventName === "unlock_drop_success" ? 1 : 0),
        purchaseCount: buildIncrementUpdate(eventName === "gumdrops_purchase_completed" ? 1 : 0),
        watchSecondsTotal: buildIncrementUpdate(watchSeconds),
        loadMsTotal: buildIncrementUpdate(loadMs),
        loadSampleCount: buildIncrementUpdate(loadMs > 0 ? 1 : 0),
        lastSeenAt: timestamp,
        updatedAt: FieldValue.serverTimestamp(),
      }, {merge: true})
    }

    if (dropId) {
      batch.set(db.collection("analytics_drops_rollup").doc(dropId), {
        dropId,
        dropTitle,
        dropCategory: readString(data.dropCategory),
        eventCount: buildIncrementUpdate(1),
        viewerSessionCount: buildIncrementUpdate(eventName === "viewer_session_started" ? 1 : 0),
        unwrapCount: buildIncrementUpdate(eventName === "unlock_drop_success" ? 1 : 0),
        downloadCount: buildIncrementUpdate(eventName === "viewer_source_downloaded" ? 1 : 0),
        relatedClickCount: buildIncrementUpdate(eventName === "viewer_related_drop_clicked" ? 1 : 0),
        watchSecondsTotal: buildIncrementUpdate(watchSeconds),
        loadMsTotal: buildIncrementUpdate(loadMs),
        loadSampleCount: buildIncrementUpdate(loadMs > 0 ? 1 : 0),
        updatedAt: FieldValue.serverTimestamp(),
        lastEventAt: timestamp,
      }, {merge: true})

      batch.set(db.collection("analytics_drop_daily").doc(`${timeKeys.dayKey}_${dropId}`), {
        dayKey: timeKeys.dayKey,
        dropId,
        dropTitle,
        dropCategory: readString(data.dropCategory),
        eventCount: buildIncrementUpdate(1),
        viewerSessionCount: buildIncrementUpdate(eventName === "viewer_session_started" ? 1 : 0),
        unwrapCount: buildIncrementUpdate(eventName === "unlock_drop_success" ? 1 : 0),
        downloadCount: buildIncrementUpdate(eventName === "viewer_source_downloaded" ? 1 : 0),
        relatedClickCount: buildIncrementUpdate(eventName === "viewer_related_drop_clicked" ? 1 : 0),
        watchSecondsTotal: buildIncrementUpdate(watchSeconds),
        loadMsTotal: buildIncrementUpdate(loadMs),
        loadSampleCount: buildIncrementUpdate(loadMs > 0 ? 1 : 0),
        updatedAt: FieldValue.serverTimestamp(),
        lastEventAt: timestamp,
      }, {merge: true})
    }

    if (sessionId || eventName.startsWith("viewer_")) {
      batch.set(db.collection("analytics_session_facts").doc(buildSessionFactId(data)), {
        sessionId: sessionId || buildSessionFactId(data),
        userId,
        username,
        dropId,
        dropTitle,
        pagePath,
        dayKey: timeKeys.dayKey,
        hourKey: timeKeys.hourKey,
        firstEventAt: timestamp,
        lastEventAt: timestamp,
        eventCount: buildIncrementUpdate(1),
        startedCount: buildIncrementUpdate(eventName === "viewer_session_started" ? 1 : 0),
        completedCount: buildIncrementUpdate(eventName === "viewer_session_completed" ? 1 : 0),
        watchSecondsTotal: buildIncrementUpdate(watchSeconds),
        loadMsTotal: buildIncrementUpdate(loadMs),
        loadSampleCount: buildIncrementUpdate(loadMs > 0 ? 1 : 0),
        updatedAt: FieldValue.serverTimestamp(),
      }, {merge: true})
    }

    await batch.commit()

    const realtimeUpdates: Array<Promise<unknown>> = [
      incrementRealtimeNode("analytics/realtime/overview", {
        totalEvents: 1,
        authenticatedEvents: 1,
        mobileEvents: isMobileViewport ? 1 : 0,
        lastEventAt: timestamp,
      }),
    ]

    if (userId) {
      realtimeUpdates.push(incrementRealtimeNode(`analytics/realtime/users/${encodeKeyFragment(userId)}`, {
        eventCount: 1,
        sessionCount: eventName === "viewer_session_started" ? 1 : 0,
        lastSeenAt: timestamp,
        username: username || userId,
      }))
    }

    if (pagePath) {
      realtimeUpdates.push(incrementRealtimeNode(`analytics/realtime/pages/${encodeKeyFragment(pagePath)}`, {
        eventCount: 1,
        lastEventAt: timestamp,
        pagePath,
      }))
    }

    if (dropId) {
      realtimeUpdates.push(incrementRealtimeNode(`analytics/realtime/drops/${encodeKeyFragment(dropId)}`, {
        eventCount: 1,
        viewerSessionCount: eventName === "viewer_session_started" ? 1 : 0,
        unwrapCount: eventName === "unlock_drop_success" ? 1 : 0,
        lastEventAt: timestamp,
        dropTitle,
      }))
    }

    await Promise.all(realtimeUpdates)
  },
)

export const onGuestAnalyticsBatchCreated = onDocumentCreated(
  {document: "analytics_guest_batches/{batchId}", region: REGION},
  async (event) => {
    const data = event.data?.data() as GuestAnalyticsBatch | undefined
    if (!data) {
      return
    }

    const timestamp = readNumber(data.receivedAtMs) || Date.now()
    const dayKey = readString(data.dayKey) || toTimeKeys(timestamp).dayKey
    const events = Array.isArray(data.events) ? data.events : []
    if (events.length === 0) {
      return
    }

    const pageMap = new Map<string, {count: number; maxScrollDepth: number}>()
    const heatMap = new Map<string, number>()
    const typeMap = new Map<string, number>()

    events.forEach((rawEvent) => {
      const eventPath = readString(rawEvent.path)
      const eventType = readString(rawEvent.type) || "unknown"
      const scrollDepth = readNumber(rawEvent.scrollDepthPercent)

      typeMap.set(eventType, (typeMap.get(eventType) || 0) + 1)
      if (eventPath) {
        const currentPage = pageMap.get(eventPath) || {count: 0, maxScrollDepth: 0}
        currentPage.count += 1
        currentPage.maxScrollDepth = Math.max(currentPage.maxScrollDepth, scrollDepth)
        pageMap.set(eventPath, currentPage)
      }

      const x = readNumber(rawEvent.x)
      const y = readNumber(rawEvent.y)
      if (x > 0 || y > 0) {
        const bucket = quantizePixelPoint(x, y)
        const heatKey = `${eventPath || "/"}::${bucket}`
        heatMap.set(heatKey, (heatMap.get(heatKey) || 0) + 1)
      }
    })

    const batchWrite = db.batch()
    batchWrite.set(db.collection("analytics_guest_daily").doc(dayKey), {
      dayKey,
      batchCount: buildIncrementUpdate(1),
      eventCount: buildIncrementUpdate(events.length),
      maxScrollDepth: Math.max(readNumber(data.maxScrollDepth), 0),
      updatedAt: FieldValue.serverTimestamp(),
      lastReceivedAt: timestamp,
    }, {merge: true})

    pageMap.forEach((value, pagePath) => {
      batchWrite.set(
        db.collection("analytics_guest_daily").doc(dayKey).collection("pages").doc(encodeKeyFragment(pagePath)),
        {
          pagePath,
          eventCount: buildIncrementUpdate(value.count),
          maxScrollDepth: value.maxScrollDepth,
          updatedAt: FieldValue.serverTimestamp(),
          lastReceivedAt: timestamp,
        },
        {merge: true},
      )
    })

    typeMap.forEach((count, eventType) => {
      batchWrite.set(
        db.collection("analytics_guest_daily").doc(dayKey).collection("types").doc(encodeKeyFragment(eventType)),
        {
          eventType,
          count: buildIncrementUpdate(count),
          updatedAt: FieldValue.serverTimestamp(),
        },
        {merge: true},
      )
    })

    heatMap.forEach((count, heatKey) => {
      const [pagePath, bucket] = heatKey.split("::")
      batchWrite.set(
        db.collection("analytics_heatmap_daily").doc(dayKey)
          .collection("pages").doc(encodeKeyFragment(pagePath))
          .collection("pixels").doc(encodeKeyFragment(bucket)),
        {
          pagePath,
          bucket,
          count: buildIncrementUpdate(count),
          updatedAt: FieldValue.serverTimestamp(),
        },
        {merge: true},
      )
    })

    await batchWrite.commit()

    await Promise.all([
      incrementRealtimeNode("analytics/realtime/guest/overview", {
        batchCount: 1,
        eventCount: events.length,
        lastReceivedAt: timestamp,
      }),
      ...Array.from(pageMap.entries()).map(([pagePath, value]) =>
        incrementRealtimeNode(`analytics/realtime/guest/pages/${encodeKeyFragment(pagePath)}`, {
          eventCount: value.count,
          lastReceivedAt: timestamp,
          pagePath,
        }),
      ),
    ])
  },
)

export const onDailyTaskEventCreated = onDocumentCreated(
  {document: "daily_task_events/{eventId}", region: REGION},
  async (event) => {
    const data = event.data?.data() as TaskEventFact | undefined
    if (!data) {
      return
    }

    const timestamp = readNumber(data.timestamp) || Date.now()
    const timeKeys = toTimeKeys(timestamp)
    const type = readString(data.type) || "unknown"
    const taskId = readString(data.taskId) || "unknown-task"
    const title = readString(data.title) || taskId
    const userId = readString(data.userId)
    const username = readString(data.username) || userId
    const reward = readNumber(data.reward)
    const durationMs = readNumber(data.durationMs)
    const batch = db.batch()

    batch.set(db.collection("analytics_task_daily").doc(timeKeys.dayKey), {
      dayKey: timeKeys.dayKey,
      eventCount: buildIncrementUpdate(1),
      rewardTotal: buildIncrementUpdate(reward),
      durationMsTotal: buildIncrementUpdate(durationMs),
      durationSampleCount: buildIncrementUpdate(durationMs > 0 ? 1 : 0),
      [`types.${type}`]: buildIncrementUpdate(1),
      updatedAt: FieldValue.serverTimestamp(),
      lastEventAt: timestamp,
    }, {merge: true})

    batch.set(db.collection("analytics_task_rollup").doc(taskId), {
      taskId,
      title,
      eventCount: buildIncrementUpdate(1),
      rewardTotal: buildIncrementUpdate(reward),
      durationMsTotal: buildIncrementUpdate(durationMs),
      durationSampleCount: buildIncrementUpdate(durationMs > 0 ? 1 : 0),
      [`types.${type}`]: buildIncrementUpdate(1),
      updatedAt: FieldValue.serverTimestamp(),
      lastEventAt: timestamp,
    }, {merge: true})

    if (userId) {
      batch.set(db.collection("analytics_user_daily").doc(`${timeKeys.dayKey}_${userId}`), {
        dayKey: timeKeys.dayKey,
        uid: userId,
        username,
        taskEventCount: buildIncrementUpdate(1),
        taskRewardTotal: buildIncrementUpdate(reward),
        taskDurationMsTotal: buildIncrementUpdate(durationMs),
        taskDurationSampleCount: buildIncrementUpdate(durationMs > 0 ? 1 : 0),
        [`taskTypes.${type}`]: buildIncrementUpdate(1),
        updatedAt: FieldValue.serverTimestamp(),
        lastSeenAt: timestamp,
      }, {merge: true})
    }

    await batch.commit()
    await incrementRealtimeNode("analytics/realtime/tasks", {
      eventCount: 1,
      rewardTotal: reward,
      lastEventAt: timestamp,
    })
  },
)

export const onSecurityEventCreated = onDocumentCreated(
  {document: "security_events/{eventId}", region: REGION},
  async (event) => {
    const data = event.data?.data() as SecurityEventFact | undefined
    if (!data) {
      return
    }

    const timestamp = readNumber(data.timestamp) || Date.now()
    const timeKeys = {
      dayKey: readString(data.dayKey) || toTimeKeys(timestamp).dayKey,
      hourKey: readString(data.hourKey) || toTimeKeys(timestamp).hourKey,
      minuteKey: readString(data.minuteKey) || toTimeKeys(timestamp).minuteKey,
    }
    const userId = readString(data.userId)
    const username = readString(data.username) || userId
    const reason = readString(data.reason) || "unknown"
    const label = readString(data.label) || reason
    const severity = readString(data.severity) || "medium"
    const dropId = readString(data.dropId)
    const pagePath = readString(data.pagePath)
    const eventId = event.params.eventId
    const batch = db.batch()

    batch.set(db.collection("analytics_security_daily").doc(timeKeys.dayKey), {
      dayKey: timeKeys.dayKey,
      eventCount: buildIncrementUpdate(1),
      [`reasons.${reason}`]: buildIncrementUpdate(1),
      [`severities.${severity}`]: buildIncrementUpdate(1),
      updatedAt: FieldValue.serverTimestamp(),
      lastEventAt: timestamp,
    }, {merge: true})

    batch.set(db.collection("analytics_security_rollup").doc("global"), {
      eventCount: buildIncrementUpdate(1),
      [`reasons.${reason}`]: buildIncrementUpdate(1),
      [`severities.${severity}`]: buildIncrementUpdate(1),
      lastEventAt: timestamp,
      updatedAt: FieldValue.serverTimestamp(),
    }, {merge: true})

    if (userId) {
      batch.set(db.collection("analytics_user_security_rollup").doc(userId), {
        uid: userId,
        username,
        eventCount: buildIncrementUpdate(1),
        [`reasons.${reason}`]: buildIncrementUpdate(1),
        [`severities.${severity}`]: buildIncrementUpdate(1),
        lastEventAt: timestamp,
        lastReason: reason,
        lastLabel: label,
        lastMessage: readString(data.message),
        lastLocationLabel: readString(data.locationLabel),
        lastDropId: dropId || null,
        lastPagePath: pagePath || null,
        updatedAt: FieldValue.serverTimestamp(),
      }, {merge: true})

      batch.set(db.collection("analytics_user_daily").doc(`${timeKeys.dayKey}_${userId}`), {
        dayKey: timeKeys.dayKey,
        uid: userId,
        username,
        securityEventCount: buildIncrementUpdate(1),
        [`securityReasons.${reason}`]: buildIncrementUpdate(1),
        [`securitySeverities.${severity}`]: buildIncrementUpdate(1),
        lastSeenAt: timestamp,
        updatedAt: FieldValue.serverTimestamp(),
      }, {merge: true})
    }

    await batch.commit()

    const realtimeUpdates: Array<Promise<unknown>> = [
      incrementRealtimeNode("analytics/realtime/security/overview", {
        eventCount: 1,
        [`severity_${severity}`]: 1,
        lastEventAt: timestamp,
      }),
      rtdb.ref(`analytics/realtime/security/recent/${encodeKeyFragment(eventId)}`).set({
        eventId,
        userId,
        username,
        reason,
        label,
        severity,
        dropId: dropId || null,
        pagePath: pagePath || null,
        timestamp,
      }),
    ]

    if (userId) {
      realtimeUpdates.push(
        incrementRealtimeNode(`analytics/realtime/security/users/${encodeKeyFragment(userId)}`, {
          eventCount: 1,
          [`reason_${reason}`]: 1,
          [`severity_${severity}`]: 1,
          lastEventAt: timestamp,
          username,
        }),
      )
    }

    await Promise.all(realtimeUpdates)
  },
)

export const onTransactionCreated = onDocumentCreated(
  {document: "transactions/{transactionId}", region: REGION},
  async (event) => {
    const data = event.data?.data() as TransactionFact | undefined
    if (!data) {
      return
    }

    const timestamp = readNumber(data.timestamp) || Date.now()
    const timeKeys = toTimeKeys(timestamp)
    const type = readString(data.type) || "unknown"
    const status = readString(data.status) || "unknown"
    const userId = readString(data.userId)
    const dropId = readString(data.dropId)
    const amount = readNumber(data.amount)
    const unlockSpendAmount = type === "unlock_content" ? Math.abs(amount) : 0
    const cost = readNumber(data.cost)
    const grossRevenueUsd = readNumber(data.grossRevenueUsd) || cost
    const paypalFeeUsd = readNumber(data.paypalFeeUsd)
    const netRevenueUsd = readNumber(data.netRevenueUsd)
    const economics = deriveGumdropEconomics(
      readNumber(data.deliveredGumDrops) || amount,
      grossRevenueUsd,
      {
        paypalFeeUsd: paypalFeeUsd > 0 ? paypalFeeUsd : undefined,
        netRevenueUsd: netRevenueUsd > 0 ? netRevenueUsd : undefined,
      },
    )
    const bundleLabel = readString(data.bundleLabel) || `${economics.deliveredGumDrops} GD`
    const bundleKey = readString(data.bundleKey) || encodeKeyFragment(bundleLabel)
    const bundleTier = readString(data.bundleTier) || (economics.bonusGumDrops > 0 ? "bonus" : "standard")
    const batch = db.batch()

    batch.set(db.collection("analytics_commerce_daily").doc(timeKeys.dayKey), {
      dayKey: timeKeys.dayKey,
      transactionCount: buildIncrementUpdate(1),
      amountTotal: buildIncrementUpdate(amount),
      revenueCentsTotal: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? economics.grossRevenueCents : 0),
      grossRevenueUsdTotal: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? economics.grossRevenueUsd : 0),
      paypalFeeUsdTotal: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? economics.paypalFeeUsd : 0),
      paypalFeeCentsTotal: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? economics.paypalFeeCents : 0),
      netRevenueUsdTotal: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? economics.netRevenueUsd : 0),
      netRevenueCentsTotal: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? economics.netRevenueCents : 0),
      adjustedProfitUsdTotal: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? economics.adjustedProfitUsd : 0),
      adjustedProfitCentsTotal: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? economics.adjustedProfitCents : 0),
      retailValueUsdTotal: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? economics.retailValueUsd : 0),
      bonusValueUsdTotal: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? economics.bonusValueUsd : 0),
      bonusGumDropsTotal: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? economics.bonusGumDrops : 0),
      deliveredGumDropsTotal: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? economics.deliveredGumDrops : 0),
      paidGumDropsTotal: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? economics.paidGumDrops : 0),
      purchaseCount: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? 1 : 0),
      unlockCount: buildIncrementUpdate(type === "unlock_content" ? 1 : 0),
      unlockSpendGdTotal: buildIncrementUpdate(unlockSpendAmount),
      updatedAt: FieldValue.serverTimestamp(),
      lastTransactionAt: timestamp,
    }, {merge: true})

    batch.set(db.collection("analytics_commerce_rollup").doc("summary"), {
      transactionCount: buildIncrementUpdate(1),
      purchaseCount: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? 1 : 0),
      unlockCount: buildIncrementUpdate(type === "unlock_content" ? 1 : 0),
      paypalFeeUsdTotal: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? economics.paypalFeeUsd : 0),
      paypalFeeCentsTotal: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? economics.paypalFeeCents : 0),
      netRevenueUsdTotal: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? economics.netRevenueUsd : 0),
      netRevenueCentsTotal: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? economics.netRevenueCents : 0),
      grossRevenueUsdTotal: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? economics.grossRevenueUsd : 0),
      adjustedProfitUsdTotal: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? economics.adjustedProfitUsd : 0),
      retailValueUsdTotal: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? economics.retailValueUsd : 0),
      bonusValueUsdTotal: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? economics.bonusValueUsd : 0),
      bonusGumDropsTotal: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? economics.bonusGumDrops : 0),
      deliveredGumDropsTotal: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? economics.deliveredGumDrops : 0),
      paidGumDropsTotal: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? economics.paidGumDrops : 0),
      unlockSpendGdTotal: buildIncrementUpdate(unlockSpendAmount),
      updatedAt: FieldValue.serverTimestamp(),
      lastTransactionAt: timestamp,
    }, {merge: true})

    if (type === "purchase_currency" && status === "completed") {
      batch.set(db.collection("analytics_bundle_rollup").doc(bundleKey), {
        bundleKey,
        bundleLabel,
        bundleTier,
        purchaseCount: buildIncrementUpdate(1),
        grossRevenueUsdTotal: buildIncrementUpdate(economics.grossRevenueUsd),
        paypalFeeUsdTotal: buildIncrementUpdate(economics.paypalFeeUsd),
        paypalFeeCentsTotal: buildIncrementUpdate(economics.paypalFeeCents),
        netRevenueUsdTotal: buildIncrementUpdate(economics.netRevenueUsd),
        netRevenueCentsTotal: buildIncrementUpdate(economics.netRevenueCents),
        adjustedProfitUsdTotal: buildIncrementUpdate(economics.adjustedProfitUsd),
        retailValueUsdTotal: buildIncrementUpdate(economics.retailValueUsd),
        bonusValueUsdTotal: buildIncrementUpdate(economics.bonusValueUsd),
        bonusGumDropsTotal: buildIncrementUpdate(economics.bonusGumDrops),
        deliveredGumDropsTotal: buildIncrementUpdate(economics.deliveredGumDrops),
        paidGumDropsTotal: buildIncrementUpdate(economics.paidGumDrops),
        effectiveUsdPer100GdTotal: buildIncrementUpdate(economics.effectiveUsdPer100Gd),
        updatedAt: FieldValue.serverTimestamp(),
        lastTransactionAt: timestamp,
      }, {merge: true})

      batch.set(db.collection("analytics_bundle_daily").doc(`${timeKeys.dayKey}_${bundleKey}`), {
        dayKey: timeKeys.dayKey,
        bundleKey,
        bundleLabel,
        bundleTier,
        purchaseCount: buildIncrementUpdate(1),
        grossRevenueUsdTotal: buildIncrementUpdate(economics.grossRevenueUsd),
        paypalFeeUsdTotal: buildIncrementUpdate(economics.paypalFeeUsd),
        paypalFeeCentsTotal: buildIncrementUpdate(economics.paypalFeeCents),
        netRevenueUsdTotal: buildIncrementUpdate(economics.netRevenueUsd),
        netRevenueCentsTotal: buildIncrementUpdate(economics.netRevenueCents),
        adjustedProfitUsdTotal: buildIncrementUpdate(economics.adjustedProfitUsd),
        retailValueUsdTotal: buildIncrementUpdate(economics.retailValueUsd),
        bonusValueUsdTotal: buildIncrementUpdate(economics.bonusValueUsd),
        bonusGumDropsTotal: buildIncrementUpdate(economics.bonusGumDrops),
        deliveredGumDropsTotal: buildIncrementUpdate(economics.deliveredGumDrops),
        paidGumDropsTotal: buildIncrementUpdate(economics.paidGumDrops),
        effectiveUsdPer100GdTotal: buildIncrementUpdate(economics.effectiveUsdPer100Gd),
        updatedAt: FieldValue.serverTimestamp(),
        lastTransactionAt: timestamp,
      }, {merge: true})
    }

    if (userId) {
      const commercePatch: Record<string, number | ReturnType<typeof buildIncrementUpdate>> = {}
      if (type === "purchase_currency" && status === "completed") {
        commercePatch.purchaseCount = buildIncrementUpdate(1)
        commercePatch.purchaseTransactionCount = buildIncrementUpdate(1)
        commercePatch.grossRevenueUsdTotal = buildIncrementUpdate(economics.grossRevenueUsd)
        commercePatch.paypalFeeUsdTotal = buildIncrementUpdate(economics.paypalFeeUsd)
        commercePatch.paypalFeeCentsTotal = buildIncrementUpdate(economics.paypalFeeCents)
        commercePatch.netRevenueUsdTotal = buildIncrementUpdate(economics.netRevenueUsd)
        commercePatch.netRevenueCentsTotal = buildIncrementUpdate(economics.netRevenueCents)
        commercePatch.adjustedProfitUsdTotal = buildIncrementUpdate(economics.adjustedProfitUsd)
        commercePatch.retailValueUsdTotal = buildIncrementUpdate(economics.retailValueUsd)
        commercePatch.bonusValueUsdTotal = buildIncrementUpdate(economics.bonusValueUsd)
        commercePatch.bonusGumDropsTotal = buildIncrementUpdate(economics.bonusGumDrops)
        commercePatch.deliveredGumDropsTotal = buildIncrementUpdate(economics.deliveredGumDrops)
        commercePatch.paidGumDropsTotal = buildIncrementUpdate(economics.paidGumDrops)
        commercePatch.effectiveUsdPer100GdTotal = buildIncrementUpdate(economics.effectiveUsdPer100Gd)
        commercePatch.lastPurchaseAt = timestamp
      }
      batch.set(db.collection("analytics_user_daily").doc(`${timeKeys.dayKey}_${userId}`), {
        dayKey: timeKeys.dayKey,
        uid: userId,
        transactionCount: buildIncrementUpdate(1),
        spendGdTotal: buildIncrementUpdate(unlockSpendAmount),
        unlockSpendGdTotal: buildIncrementUpdate(unlockSpendAmount),
        revenueCentsTotal: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? economics.grossRevenueCents : 0),
        purchaseCount: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? 1 : 0),
        purchaseTransactionCount: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? 1 : 0),
        unlockCount: buildIncrementUpdate(type === "unlock_content" ? 1 : 0),
        ...commercePatch,
        updatedAt: FieldValue.serverTimestamp(),
        lastSeenAt: timestamp,
      }, {merge: true})

      batch.set(db.collection("analytics_users_rollup").doc(userId), {
        uid: userId,
        purchaseCount: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? 1 : 0),
        purchaseTransactionCount: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? 1 : 0),
        unlockCount: buildIncrementUpdate(type === "unlock_content" ? 1 : 0),
        spendGdTotal: buildIncrementUpdate(unlockSpendAmount),
        unlockSpendGdTotal: buildIncrementUpdate(unlockSpendAmount),
        revenueCentsTotal: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? economics.grossRevenueCents : 0),
        ...commercePatch,
        updatedAt: FieldValue.serverTimestamp(),
        lastSeenAt: timestamp,
      }, {merge: true})
    }

    if (dropId) {
      batch.set(db.collection("analytics_drop_daily").doc(`${timeKeys.dayKey}_${dropId}`), {
        dayKey: timeKeys.dayKey,
        dropId,
        unlockTransactionCount: buildIncrementUpdate(type === "unlock_content" ? 1 : 0),
        spendGdTotal: buildIncrementUpdate(unlockSpendAmount),
        updatedAt: FieldValue.serverTimestamp(),
        lastEventAt: timestamp,
      }, {merge: true})
    }

    await batch.commit()

    await incrementRealtimeNode("analytics/realtime/commerce", {
      transactionCount: 1,
      purchaseCount: type === "purchase_currency" && status === "completed" ? 1 : 0,
      unlockCount: type === "unlock_content" ? 1 : 0,
      revenueCentsTotal: type === "purchase_currency" && status === "completed" ? economics.grossRevenueCents : 0,
      grossRevenueUsdTotal: type === "purchase_currency" && status === "completed" ? economics.grossRevenueUsd : 0,
      paypalFeeUsdTotal: type === "purchase_currency" && status === "completed" ? economics.paypalFeeUsd : 0,
      paypalFeeCentsTotal: type === "purchase_currency" && status === "completed" ? economics.paypalFeeCents : 0,
      netRevenueUsdTotal: type === "purchase_currency" && status === "completed" ? economics.netRevenueUsd : 0,
      netRevenueCentsTotal: type === "purchase_currency" && status === "completed" ? economics.netRevenueCents : 0,
      adjustedProfitUsdTotal: type === "purchase_currency" && status === "completed" ? economics.adjustedProfitUsd : 0,
      bonusValueUsdTotal: type === "purchase_currency" && status === "completed" ? economics.bonusValueUsd : 0,
      bonusGumDropsTotal: type === "purchase_currency" && status === "completed" ? economics.bonusGumDrops : 0,
      unlockSpendGdTotal: unlockSpendAmount,
      lastTransactionAt: timestamp,
    })
  },
)

export const refreshRealtimeAnalytics = onSchedule(
  {schedule: "every 5 minutes", region: REGION, timeZone: "Etc/UTC"},
  async () => {
    const activeSince = Date.now() - (30 * 60 * 1000)
    const snapshot = await db.collection("analytics_active_users")
      .where("lastSeenAt", ">=", activeSince)
      .get()

    const activeUsers = snapshot.docs.map((doc) => doc.data())
    await rtdb.ref("analytics/realtime/activity").set({
      refreshedAt: Date.now(),
      activeUserCount: activeUsers.length,
      users: activeUsers.slice(0, 50).map((entry) => ({
        uid: readString(entry.uid),
        username: readString(entry.username),
        lastSeenAt: readNumber(entry.lastSeenAt),
        lastEventName: readString(entry.lastEventName),
      })),
    })
  },
)

export const materializeAnalyticsWindow15m = onSchedule(
  {schedule: "every 15 minutes", region: REGION, timeZone: "Etc/UTC"},
  async () => {
    const events = await queryEventsSince(Date.now() - (15 * 60 * 1000))
    const summary = summarizeEventFacts(events, "15m")
    await writeWindowSummary("15m", summary)
  },
)

export const materializeAnalyticsWindow24h = onSchedule(
  {schedule: "every 60 minutes", region: REGION, timeZone: "Etc/UTC"},
  async () => {
    const events = await queryEventsSince(Date.now() - (24 * 60 * 60 * 1000))
    const summary = summarizeEventFacts(events, "24h")
    await writeWindowSummary("24h", summary)
  },
)

export const materializeDropAnalyticsHourly = onSchedule(
  {schedule: "every 60 minutes", region: REGION, timeZone: "Etc/UTC"},
  async () => {
    const snapshot = await db.collection("analytics_drops_rollup")
      .orderBy("viewerSessionCount", "desc")
      .limit(25)
      .get()

    const drops = snapshot.docs.map((doc) => {
      const data = doc.data()
      const loadSampleCount = readNumber(data.loadSampleCount)
      return {
        dropId: doc.id,
        dropTitle: readString(data.dropTitle) || doc.id,
        dropCategory: readString(data.dropCategory),
        viewerSessionCount: readNumber(data.viewerSessionCount),
        unwrapCount: readNumber(data.unwrapCount),
        downloadCount: readNumber(data.downloadCount),
        relatedClickCount: readNumber(data.relatedClickCount),
        watchSecondsTotal: readNumber(data.watchSecondsTotal),
        avgLoadMs: loadSampleCount > 0 ? Math.round(readNumber(data.loadMsTotal) / loadSampleCount) : 0,
        lastEventAt: readNumber(data.lastEventAt),
      }
    })

    await db.collection(DASHBOARD_CACHE_COLLECTION).doc("drop_snapshot_hourly").set({
      generatedAtMs: Date.now(),
      drops,
      updatedAt: FieldValue.serverTimestamp(),
    }, {merge: true})
  },
)

export const materializeUserAnalyticsDaily = onSchedule(
  {schedule: "every day 00:20", region: REGION, timeZone: "Etc/UTC"},
  async () => {
    const snapshot = await db.collection("analytics_users_rollup")
      .orderBy("eventCount", "desc")
      .limit(50)
      .get()

    const users = snapshot.docs.map((doc) => {
      const data = doc.data()
      const loadSampleCount = readNumber(data.loadSampleCount)
      return {
        uid: doc.id,
        username: readString(data.username) || doc.id,
        eventCount: readNumber(data.eventCount),
        sessionCount: readNumber(data.sessionCount),
        unwrapCount: readNumber(data.unwrapCount),
        purchaseCount: readNumber(data.purchaseCount),
        watchSecondsTotal: readNumber(data.watchSecondsTotal),
        avgLoadMs: loadSampleCount > 0 ? Math.round(readNumber(data.loadMsTotal) / loadSampleCount) : 0,
        lastSeenAt: readNumber(data.lastSeenAt),
      }
    })

    await db.collection(DASHBOARD_CACHE_COLLECTION).doc("user_snapshot_daily").set({
      generatedAtMs: Date.now(),
      users,
      updatedAt: FieldValue.serverTimestamp(),
    }, {merge: true})
  },
)

export const materializeCommerceEconomicsHourly = onSchedule(
  {schedule: "every 60 minutes", region: REGION, timeZone: "Etc/UTC"},
  async () => {
    const [dailySnapshot, bundleSnapshot] = await Promise.all([
      db.collection("analytics_commerce_daily").orderBy("dayKey", "desc").limit(30).get(),
      db.collection("analytics_bundle_rollup").orderBy("grossRevenueUsdTotal", "desc").limit(20).get(),
    ])

    const daily = dailySnapshot.docs.map((doc) => {
      const data = doc.data()
      const purchaseCount = readNumber(data.purchaseCount)
      const grossRevenueUsdTotal = readNumber(data.grossRevenueUsdTotal)
      const deliveredGumDropsTotal = readNumber(data.deliveredGumDropsTotal)
      return {
        dayKey: doc.id,
        purchaseCount,
        grossRevenueUsdTotal,
        adjustedProfitUsdTotal: readNumber(data.adjustedProfitUsdTotal),
        bonusValueUsdTotal: readNumber(data.bonusValueUsdTotal),
        bonusGumDropsTotal: readNumber(data.bonusGumDropsTotal),
        deliveredGumDropsTotal,
        paidGumDropsTotal: readNumber(data.paidGumDropsTotal),
        effectiveUsdPer100Gd: deliveredGumDropsTotal > 0
          ? roundCurrency(grossRevenueUsdTotal / (deliveredGumDropsTotal / 100))
          : 0,
      }
    })

    const bundles = bundleSnapshot.docs.map((doc) => {
      const data = doc.data()
      const purchaseCount = readNumber(data.purchaseCount)
      const grossRevenueUsdTotal = readNumber(data.grossRevenueUsdTotal)
      const deliveredGumDropsTotal = readNumber(data.deliveredGumDropsTotal)
      return {
        bundleKey: doc.id,
        bundleLabel: readString(data.bundleLabel) || doc.id,
        bundleTier: readString(data.bundleTier),
        purchaseCount,
        grossRevenueUsdTotal,
        adjustedProfitUsdTotal: readNumber(data.adjustedProfitUsdTotal),
        bonusValueUsdTotal: readNumber(data.bonusValueUsdTotal),
        bonusGumDropsTotal: readNumber(data.bonusGumDropsTotal),
        deliveredGumDropsTotal,
        paidGumDropsTotal: readNumber(data.paidGumDropsTotal),
        averageOrderUsd: purchaseCount > 0 ? roundCurrency(grossRevenueUsdTotal / purchaseCount) : 0,
        effectiveUsdPer100Gd: deliveredGumDropsTotal > 0
          ? roundCurrency(grossRevenueUsdTotal / (deliveredGumDropsTotal / 100))
          : 0,
      }
    })

    await db.collection(DASHBOARD_CACHE_COLLECTION).doc("commerce_economics_hourly").set({
      generatedAtMs: Date.now(),
      daily,
      bundles,
      updatedAt: FieldValue.serverTimestamp(),
    }, {merge: true})
  },
)

export const materializeUserEconomicsLeaderboardHourly = onSchedule(
  {schedule: "every 60 minutes", region: REGION, timeZone: "Etc/UTC"},
  async () => {
    const snapshot = await db.collection("analytics_users_rollup")
      .orderBy("grossRevenueUsdTotal", "desc")
      .limit(50)
      .get()

    const users = snapshot.docs.map((doc) => {
      const data = doc.data()
      const purchaseCount = readNumber(data.purchaseCount)
      const grossRevenueUsdTotal = readNumber(data.grossRevenueUsdTotal)
      const deliveredGumDropsTotal = readNumber(data.deliveredGumDropsTotal)
      const adjustedProfitUsdTotal = readNumber(data.adjustedProfitUsdTotal)
      return {
        uid: doc.id,
        username: readString(data.username) || doc.id,
        purchaseCount,
        grossRevenueUsdTotal,
        adjustedProfitUsdTotal,
        bonusValueUsdTotal: readNumber(data.bonusValueUsdTotal),
        bonusGumDropsTotal: readNumber(data.bonusGumDropsTotal),
        deliveredGumDropsTotal,
        paidGumDropsTotal: readNumber(data.paidGumDropsTotal),
        averageOrderUsd: purchaseCount > 0 ? roundCurrency(grossRevenueUsdTotal / purchaseCount) : 0,
        effectiveUsdPer100Gd: deliveredGumDropsTotal > 0
          ? roundCurrency(grossRevenueUsdTotal / (deliveredGumDropsTotal / 100))
          : 0,
        yieldRatio: grossRevenueUsdTotal > 0
          ? Number((adjustedProfitUsdTotal / grossRevenueUsdTotal).toFixed(4))
          : 0,
        lastPurchaseAt: readNumber(data.lastPurchaseAt),
      }
    })

    await db.collection(DASHBOARD_CACHE_COLLECTION).doc("user_economics_hourly").set({
      generatedAtMs: Date.now(),
      users,
      updatedAt: FieldValue.serverTimestamp(),
    }, {merge: true})
  },
)

export const detectAnalyticsAnomaliesHourly = onSchedule(
  {schedule: "every 60 minutes", region: REGION, timeZone: "Etc/UTC"},
  async () => {
    const [window15mDoc, window24hDoc] = await Promise.all([
      db.collection(DASHBOARD_CACHE_COLLECTION).doc("window_15m").get(),
      db.collection(DASHBOARD_CACHE_COLLECTION).doc("window_24h").get(),
    ])

    const window15m = window15mDoc.data() as AnalyticsWindowSummary | undefined
    const window24h = window24hDoc.data() as AnalyticsWindowSummary | undefined
    if (!window15m || !window24h) {
      logger.info("Skipping anomaly detection because cached windows are missing")
      return
    }

    const alerts: Array<Record<string, unknown>> = []
    const baselineEventsPer15m = Math.max(1, Math.round(readNumber(window24h.totalEvents) / 96))
    const baselineViewerSessionsPer15m = Math.max(1, Math.round(readNumber(window24h.viewerSessions) / 96))
    const baselineAvgLoadMs = Math.max(1, readNumber(window24h.avgLoadMs))

    if (readNumber(window15m.totalEvents) < Math.round(baselineEventsPer15m * 0.2)) {
      alerts.push({
        type: "traffic_drop",
        severity: "warn",
        message: "Total tracked traffic fell well below the trailing 24h baseline.",
        baseline: baselineEventsPer15m,
        current: readNumber(window15m.totalEvents),
      })
    }

    if (readNumber(window15m.viewerSessions) < Math.round(baselineViewerSessionsPer15m * 0.2)) {
      alerts.push({
        type: "viewer_drop",
        severity: "warn",
        message: "Viewer session starts fell below the recent baseline.",
        baseline: baselineViewerSessionsPer15m,
        current: readNumber(window15m.viewerSessions),
      })
    }

    if (readNumber(window15m.avgLoadMs) > Math.round(baselineAvgLoadMs * 1.8)) {
      alerts.push({
        type: "load_regression",
        severity: "critical",
        message: "Average content load time is materially higher than the trailing baseline.",
        baseline: baselineAvgLoadMs,
        current: readNumber(window15m.avgLoadMs),
      })
    }

    await writeCurrentAlerts(alerts)

    if (alerts.length > 0) {
      const hourKey = toTimeKeys(Date.now()).hourKey
      await db.collection("analytics_alerts").doc(hourKey).set({
        hourKey,
        alerts,
        generatedAtMs: Date.now(),
        updatedAt: FieldValue.serverTimestamp(),
      }, {merge: true})
    }
  },
)
