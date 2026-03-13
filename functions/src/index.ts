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
  timestamp?: number;
  description?: string;
  dropId?: string;
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
    const cost = readNumber(data.cost)
    const batch = db.batch()

    batch.set(db.collection("analytics_commerce_daily").doc(timeKeys.dayKey), {
      dayKey: timeKeys.dayKey,
      transactionCount: buildIncrementUpdate(1),
      amountTotal: buildIncrementUpdate(amount),
      revenueCentsTotal: buildIncrementUpdate(cost),
      purchaseCount: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? 1 : 0),
      unlockCount: buildIncrementUpdate(type === "unlock_content" ? 1 : 0),
      updatedAt: FieldValue.serverTimestamp(),
      lastTransactionAt: timestamp,
    }, {merge: true})

    if (userId) {
      batch.set(db.collection("analytics_user_daily").doc(`${timeKeys.dayKey}_${userId}`), {
        dayKey: timeKeys.dayKey,
        uid: userId,
        transactionCount: buildIncrementUpdate(1),
        spendGdTotal: buildIncrementUpdate(type === "unlock_content" ? amount : 0),
        revenueCentsTotal: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? cost : 0),
        purchaseCount: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? 1 : 0),
        unlockCount: buildIncrementUpdate(type === "unlock_content" ? 1 : 0),
        updatedAt: FieldValue.serverTimestamp(),
        lastSeenAt: timestamp,
      }, {merge: true})
    }

    if (dropId) {
      batch.set(db.collection("analytics_drop_daily").doc(`${timeKeys.dayKey}_${dropId}`), {
        dayKey: timeKeys.dayKey,
        dropId,
        unlockTransactionCount: buildIncrementUpdate(type === "unlock_content" ? 1 : 0),
        spendGdTotal: buildIncrementUpdate(type === "unlock_content" ? amount : 0),
        updatedAt: FieldValue.serverTimestamp(),
        lastEventAt: timestamp,
      }, {merge: true})
    }

    await batch.commit()

    await incrementRealtimeNode("analytics/realtime/commerce", {
      transactionCount: 1,
      purchaseCount: type === "purchase_currency" && status === "completed" ? 1 : 0,
      unlockCount: type === "unlock_content" ? 1 : 0,
      revenueCentsTotal: type === "purchase_currency" && status === "completed" ? cost : 0,
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
