import {onSchedule} from "firebase-functions/v2/scheduler"
import * as logger from "firebase-functions/logger"
import {FieldValue} from "firebase-admin/firestore"

import {
  DASHBOARD_CACHE_COLLECTION,
  type AnalyticsEventFact,
  type AnalyticsWindowSummary,
  readNumber,
  readString,
  summarizeEventFacts,
  toTimeKeys,
} from "./analytics-core.js"
import {db, rtdb} from "./firebase-admin.js"
import {REGION} from "./firebase-runtime.js"
import {touchAnalyticsRuntime} from "./analytics-runtime.js"

function buildWindowDocId(windowLabel: string) {
  return `window_${windowLabel.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}`
}

async function writeWindowSummary(windowLabel: string, summary: AnalyticsWindowSummary) {
  await db.collection(DASHBOARD_CACHE_COLLECTION).doc(buildWindowDocId(windowLabel)).set({
    ...summary,
    updatedAt: FieldValue.serverTimestamp(),
  }, {merge: true})
  await touchAnalyticsRuntime()
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
  await touchAnalyticsRuntime()
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

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
    await touchAnalyticsRuntime()
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
    await touchAnalyticsRuntime()
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
    await touchAnalyticsRuntime()
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
    await touchAnalyticsRuntime()
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
    await touchAnalyticsRuntime()
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
      await touchAnalyticsRuntime()
    }
  },
)
