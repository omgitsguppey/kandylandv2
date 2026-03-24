import {onDocumentWritten} from "firebase-functions/v2/firestore"

import {REGION} from "./firebase-runtime.js"
import {
  buildStableAnalyticsExportId,
  getAnalyticsExportDataConnect,
  markAnalyticsExportStatusError,
  readFloat,
  readInt,
  readNullableInt,
  readNullableStringValue,
  readStringValue,
  readTimestampMillis,
  recordAnalyticsExportFailure,
  upsertAnalyticsExportStatus,
} from "./analytics-export-dataconnect.js"

type FirestoreDoc = Record<string, unknown>

interface ExportSyncPlan {
  domain: string;
  sourceCollection: string;
  sourceKey: string;
  lastSourceUpdatedAtMs: number;
  mutationName: string;
  deleteMutationName: string;
  variables: Record<string, unknown>;
}

function fallbackSourceUpdatedAtMs(data: FirestoreDoc) {
  return Math.max(
    readTimestampMillis(data.updatedAt),
    readInt(data.lastEventAt),
    readInt(data.lastSeenAt),
    readInt(data.lastTransactionAt),
    readInt(data.generatedAtMs),
    readInt(data.lastReceivedAt),
  )
}

function getDocumentParam(params: Record<string, string>) {
  return Object.values(params)[0] || ""
}

function createExportSyncTrigger(
  document: string,
  buildPlan: (docId: string, data: FirestoreDoc) => ExportSyncPlan | null,
) {
  return onDocumentWritten({document, region: REGION}, async (event) => {
    const sourceKey = getDocumentParam(event.params)
    if (!sourceKey) {
      return
    }

    const afterData = event.data?.after.data() as FirestoreDoc | undefined
    if (!afterData) {
      try {
        const deletionPlan = buildPlan(sourceKey, {})
        if (!deletionPlan) {
          return
        }

        const dataConnect = getAnalyticsExportDataConnect()
        await dataConnect.executeMutation(deletionPlan.deleteMutationName, {
          id: buildStableAnalyticsExportId(`${deletionPlan.sourceCollection}:${sourceKey}`),
        })
        await upsertAnalyticsExportStatus({
          domain: deletionPlan.domain,
          sourceCollection: deletionPlan.sourceCollection,
          sourceKey,
          lastSourceUpdatedAtMs: Date.now(),
          status: "deleted",
          lastError: null,
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        const deletionPlan = buildPlan(sourceKey, {})
        if (deletionPlan) {
          await recordAnalyticsExportFailure({
            domain: deletionPlan.domain,
            sourceCollection: deletionPlan.sourceCollection,
            sourceKey,
            errorMessage,
          })
          await markAnalyticsExportStatusError({
            domain: deletionPlan.domain,
            sourceCollection: deletionPlan.sourceCollection,
            sourceKey,
            lastSourceUpdatedAtMs: Date.now(),
            errorMessage,
          })
        }
        throw error
      }

      return
    }

    const plan = buildPlan(sourceKey, afterData)
    if (!plan) {
      return
    }

    try {
      const dataConnect = getAnalyticsExportDataConnect()
      await dataConnect.executeMutation(plan.mutationName, plan.variables)
      await upsertAnalyticsExportStatus({
        domain: plan.domain,
        sourceCollection: plan.sourceCollection,
        sourceKey: plan.sourceKey,
        lastSourceUpdatedAtMs: plan.lastSourceUpdatedAtMs,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      await recordAnalyticsExportFailure({
        domain: plan.domain,
        sourceCollection: plan.sourceCollection,
        sourceKey: plan.sourceKey,
        errorMessage,
      })
      await markAnalyticsExportStatusError({
        domain: plan.domain,
        sourceCollection: plan.sourceCollection,
        sourceKey: plan.sourceKey,
        lastSourceUpdatedAtMs: plan.lastSourceUpdatedAtMs,
        errorMessage,
      })
      throw error
    }
  })
}

export const onAnalyticsPageDailyExportSync = createExportSyncTrigger(
  "analytics_page_daily/{docId}",
  (docId, data) => ({
    domain: "page_daily",
    sourceCollection: "analytics_page_daily",
    sourceKey: docId,
    lastSourceUpdatedAtMs: fallbackSourceUpdatedAtMs(data),
    mutationName: "UpsertAnalyticsPageDaily",
    deleteMutationName: "DeleteAnalyticsPageDaily",
    variables: {
      id: buildStableAnalyticsExportId(`analytics_page_daily:${docId}`),
      dayKey: readStringValue(data.dayKey),
      pagePath: readStringValue(data.pagePath),
      pageViews: readInt(data.pageViews),
      clickCount: readInt(data.clickCount),
      hoverCount: readInt(data.hoverCount),
      scrollCount: readInt(data.scrollCount),
      visibilityCount: readInt(data.visibilityCount),
      dwellMsTotal: readInt(data.dwellMsTotal),
      dwellSampleCount: readInt(data.dwellSampleCount),
      maxScrollDepth: readInt(data.maxScrollDepth),
      lastEventAtMs: readNullableInt(data.lastEventAt),
    },
  }),
)

export const onAnalyticsWatchSessionExportSync = createExportSyncTrigger(
  "analytics_watch_sessions/{docId}",
  (docId, data) => ({
    domain: "watch_session",
    sourceCollection: "analytics_watch_sessions",
    sourceKey: docId,
    lastSourceUpdatedAtMs: fallbackSourceUpdatedAtMs(data),
    mutationName: "UpsertAnalyticsWatchSession",
    deleteMutationName: "DeleteAnalyticsWatchSession",
    variables: {
      id: buildStableAnalyticsExportId(`analytics_watch_sessions:${docId}`),
      watchSessionId: readStringValue(data.watchSessionId) || docId,
      clientSessionId: readNullableStringValue(data.clientSessionId),
      userId: readNullableStringValue(data.userId),
      username: readNullableStringValue(data.username),
      dropId: readStringValue(data.dropId),
      dropTitle: readNullableStringValue(data.dropTitle),
      dropCategory: readNullableStringValue(data.dropCategory),
      pagePath: readNullableStringValue(data.pagePath),
      startedDayKey: readStringValue(data.startedDayKey),
      startedHourKey: readStringValue(data.startedHourKey),
      lastDayKey: readStringValue(data.lastDayKey),
      lastHourKey: readStringValue(data.lastHourKey),
      sessionStartedAtMs: readInt(data.sessionStartedAtMs),
      firstSeenAtMs: readInt(data.firstSeenAtMs),
      lastSeenAtMs: readInt(data.lastSeenAtMs),
      closedAtMs: readNullableInt(data.closedAtMs),
      isClosed: Boolean(data.isClosed),
      closeReason: readNullableStringValue(data.closeReason),
      contentCount: readInt(data.contentCount),
      activeAssetKey: readNullableStringValue(data.activeAssetKey),
      activeAssetIndex: readNullableInt(data.activeAssetIndex),
      totalWatchSeconds: readFloat(data.totalWatchSeconds),
      totalVisibleSeconds: readFloat(data.totalVisibleSeconds),
      maxAssetWatchSeconds: readFloat(data.maxAssetWatchSeconds),
      viewedAssetCount: readInt(data.viewedAssetCount),
      completedAssetCount: readInt(data.completedAssetCount),
      consumedAssetCount: readInt(data.consumedAssetCount),
      assetSwitchCount: readInt(data.assetSwitchCount),
      downloadCount: readInt(data.downloadCount),
      relatedClickCount: readInt(data.relatedClickCount),
      loadMsTotal: readInt(data.loadMsTotal),
      loadSampleCount: readInt(data.loadSampleCount),
      averageLoadMs: readInt(data.averageLoadMs),
      lastSequence: readInt(data.lastSequence),
      unwrappedAtMs: readNullableInt(data.unwrappedAtMs),
    },
  }),
)

export const onAnalyticsWatchAssetExportSync = createExportSyncTrigger(
  "analytics_watch_assets/{docId}",
  (docId, data) => ({
    domain: "watch_asset",
    sourceCollection: "analytics_watch_assets",
    sourceKey: docId,
    lastSourceUpdatedAtMs: fallbackSourceUpdatedAtMs(data),
    mutationName: "UpsertAnalyticsWatchAsset",
    deleteMutationName: "DeleteAnalyticsWatchAsset",
    variables: {
      id: buildStableAnalyticsExportId(`analytics_watch_assets:${docId}`),
      watchSessionId: readStringValue(data.watchSessionId),
      clientSessionId: readNullableStringValue(data.clientSessionId),
      userId: readNullableStringValue(data.userId),
      username: readNullableStringValue(data.username),
      dropId: readStringValue(data.dropId),
      dropTitle: readNullableStringValue(data.dropTitle),
      dropCategory: readNullableStringValue(data.dropCategory),
      pagePath: readNullableStringValue(data.pagePath),
      assetKey: readStringValue(data.assetKey),
      assetIndex: readInt(data.assetIndex),
      contentKind: readNullableStringValue(data.contentKind),
      startedDayKey: readStringValue(data.startedDayKey),
      startedHourKey: readStringValue(data.startedHourKey),
      lastDayKey: readStringValue(data.lastDayKey),
      lastHourKey: readStringValue(data.lastHourKey),
      sessionStartedAtMs: readInt(data.sessionStartedAtMs),
      firstSeenAtMs: readInt(data.firstSeenAtMs),
      lastSeenAtMs: readInt(data.lastSeenAtMs),
      startedAtMs: readInt(data.startedAtMs),
      totalWatchSeconds: readFloat(data.totalWatchSeconds),
      totalVisibleSeconds: readFloat(data.totalVisibleSeconds),
      maxProgressSeconds: readInt(data.maxProgressSeconds),
      checkpointMaxSeconds: readInt(data.checkpointMaxSeconds),
      durationSeconds: readNullableInt(data.durationSeconds),
      consumedAtMs: readNullableInt(data.consumedAtMs),
      completedAtMs: readNullableInt(data.completedAtMs),
      isConsumed: Boolean(data.isConsumed),
      isCompleted: Boolean(data.isCompleted),
      heartbeatCount: readInt(data.heartbeatCount),
      loadMsTotal: readInt(data.loadMsTotal),
      loadSampleCount: readInt(data.loadSampleCount),
      lastSequence: readInt(data.lastSequence),
    },
  }),
)

export const onAnalyticsDropDailyExportSync = createExportSyncTrigger(
  "analytics_drop_daily/{docId}",
  (docId, data) => ({
    domain: "drop_daily",
    sourceCollection: "analytics_drop_daily",
    sourceKey: docId,
    lastSourceUpdatedAtMs: fallbackSourceUpdatedAtMs(data),
    mutationName: "UpsertAnalyticsDropDaily",
    deleteMutationName: "DeleteAnalyticsDropDaily",
    variables: {
      id: buildStableAnalyticsExportId(`analytics_drop_daily:${docId}`),
      dayKey: readStringValue(data.dayKey),
      dropId: readStringValue(data.dropId),
      dropTitle: readNullableStringValue(data.dropTitle),
      dropCategory: readNullableStringValue(data.dropCategory),
      eventCount: readInt(data.eventCount),
      viewerSessionCount: readInt(data.viewerSessionCount),
      unwrapCount: readInt(data.unwrapCount),
      unlockTransactionCount: readInt(data.unlockTransactionCount),
      downloadCount: readInt(data.downloadCount),
      relatedClickCount: readInt(data.relatedClickCount),
      spendGdTotal: readInt(data.spendGdTotal),
      watchSecondsTotal: readInt(data.watchSecondsTotal),
      loadMsTotal: readInt(data.loadMsTotal),
      loadSampleCount: readInt(data.loadSampleCount),
      lastEventAtMs: readNullableInt(data.lastEventAt),
    },
  }),
)

export const onAnalyticsUserDailyExportSync = createExportSyncTrigger(
  "analytics_user_daily/{docId}",
  (docId, data) => ({
    domain: "user_daily",
    sourceCollection: "analytics_user_daily",
    sourceKey: docId,
    lastSourceUpdatedAtMs: fallbackSourceUpdatedAtMs(data),
    mutationName: "UpsertAnalyticsUserDaily",
    deleteMutationName: "DeleteAnalyticsUserDaily",
    variables: {
      id: buildStableAnalyticsExportId(`analytics_user_daily:${docId}`),
      dayKey: readStringValue(data.dayKey),
      uid: readStringValue(data.uid),
      username: readNullableStringValue(data.username),
      eventCount: readInt(data.eventCount),
      sessionCount: readInt(data.sessionCount),
      unwrapCount: readInt(data.unwrapCount),
      unlockCount: readInt(data.unlockCount),
      purchaseCount: readInt(data.purchaseCount),
      taskEventCount: readInt(data.taskEventCount),
      taskRewardTotal: readInt(data.taskRewardTotal),
      spendGdTotal: readInt(data.spendGdTotal),
      revenueCentsTotal: readInt(data.revenueCentsTotal),
      grossRevenueUsdTotal: readFloat(data.grossRevenueUsdTotal),
      paypalFeeUsdTotal: readFloat(data.paypalFeeUsdTotal),
      paypalFeeCentsTotal: readInt(data.paypalFeeCentsTotal),
      netRevenueUsdTotal: readFloat(data.netRevenueUsdTotal),
      netRevenueCentsTotal: readInt(data.netRevenueCentsTotal),
      adjustedProfitUsdTotal: readFloat(data.adjustedProfitUsdTotal),
      bonusValueUsdTotal: readFloat(data.bonusValueUsdTotal),
      bonusGumDropsTotal: readInt(data.bonusGumDropsTotal),
      deliveredGumDropsTotal: readInt(data.deliveredGumDropsTotal),
      paidGumDropsTotal: readInt(data.paidGumDropsTotal),
      unlockSpendGdTotal: readInt(data.unlockSpendGdTotal),
      watchSecondsTotal: readInt(data.watchSecondsTotal),
      loadMsTotal: readInt(data.loadMsTotal),
      loadSampleCount: readInt(data.loadSampleCount),
      lastSeenAtMs: readNullableInt(data.lastSeenAt),
    },
  }),
)

export const onAnalyticsUserRollupExportSync = createExportSyncTrigger(
  "analytics_users_rollup/{docId}",
  (docId, data) => ({
    domain: "user_rollup",
    sourceCollection: "analytics_users_rollup",
    sourceKey: docId,
    lastSourceUpdatedAtMs: fallbackSourceUpdatedAtMs(data),
    mutationName: "UpsertAnalyticsUserRollup",
    deleteMutationName: "DeleteAnalyticsUserRollup",
    variables: {
      id: buildStableAnalyticsExportId(`analytics_users_rollup:${docId}`),
      uid: readStringValue(data.uid) || docId,
      username: readNullableStringValue(data.username),
      eventCount: readInt(data.eventCount),
      sessionCount: readInt(data.sessionCount),
      unwrapCount: readInt(data.unwrapCount),
      unlockCount: readInt(data.unlockCount),
      purchaseCount: readInt(data.purchaseCount),
      taskEventCount: readInt(data.taskEventCount),
      taskRewardTotal: readInt(data.taskRewardTotal),
      spendGdTotal: readInt(data.spendGdTotal),
      revenueCentsTotal: readInt(data.revenueCentsTotal),
      grossRevenueUsdTotal: readFloat(data.grossRevenueUsdTotal),
      paypalFeeUsdTotal: readFloat(data.paypalFeeUsdTotal),
      paypalFeeCentsTotal: readInt(data.paypalFeeCentsTotal),
      netRevenueUsdTotal: readFloat(data.netRevenueUsdTotal),
      netRevenueCentsTotal: readInt(data.netRevenueCentsTotal),
      adjustedProfitUsdTotal: readFloat(data.adjustedProfitUsdTotal),
      bonusValueUsdTotal: readFloat(data.bonusValueUsdTotal),
      bonusGumDropsTotal: readInt(data.bonusGumDropsTotal),
      deliveredGumDropsTotal: readInt(data.deliveredGumDropsTotal),
      paidGumDropsTotal: readInt(data.paidGumDropsTotal),
      unlockSpendGdTotal: readInt(data.unlockSpendGdTotal),
      watchSecondsTotal: readInt(data.watchSecondsTotal),
      loadMsTotal: readInt(data.loadMsTotal),
      loadSampleCount: readInt(data.loadSampleCount),
      lastSeenAtMs: readNullableInt(data.lastSeenAt),
    },
  }),
)

export const onAnalyticsCommerceDailyExportSync = createExportSyncTrigger(
  "analytics_commerce_daily/{docId}",
  (docId, data) => ({
    domain: "commerce_daily",
    sourceCollection: "analytics_commerce_daily",
    sourceKey: docId,
    lastSourceUpdatedAtMs: fallbackSourceUpdatedAtMs(data),
    mutationName: "UpsertAnalyticsCommerceDaily",
    deleteMutationName: "DeleteAnalyticsCommerceDaily",
    variables: {
      id: buildStableAnalyticsExportId(`analytics_commerce_daily:${docId}`),
      dayKey: readStringValue(data.dayKey) || docId,
      transactionCount: readInt(data.transactionCount),
      purchaseCount: readInt(data.purchaseCount),
      unlockCount: readInt(data.unlockCount),
      grossRevenueUsdTotal: readFloat(data.grossRevenueUsdTotal),
      paypalFeeUsdTotal: readFloat(data.paypalFeeUsdTotal),
      paypalFeeCentsTotal: readInt(data.paypalFeeCentsTotal),
      netRevenueUsdTotal: readFloat(data.netRevenueUsdTotal),
      netRevenueCentsTotal: readInt(data.netRevenueCentsTotal),
      adjustedProfitUsdTotal: readFloat(data.adjustedProfitUsdTotal),
      bonusValueUsdTotal: readFloat(data.bonusValueUsdTotal),
      bonusGumDropsTotal: readInt(data.bonusGumDropsTotal),
      deliveredGumDropsTotal: readInt(data.deliveredGumDropsTotal),
      paidGumDropsTotal: readInt(data.paidGumDropsTotal),
      spendGdTotal: readInt(data.spendGdTotal),
      unlockSpendGdTotal: readInt(data.unlockSpendGdTotal),
      lastTransactionAtMs: readNullableInt(data.lastTransactionAt),
    },
  }),
)

export const onAnalyticsCommerceRollupExportSync = createExportSyncTrigger(
  "analytics_commerce_rollup/{docId}",
  (docId, data) => ({
    domain: "commerce_rollup",
    sourceCollection: "analytics_commerce_rollup",
    sourceKey: docId,
    lastSourceUpdatedAtMs: fallbackSourceUpdatedAtMs(data),
    mutationName: "UpsertAnalyticsCommerceRollup",
    deleteMutationName: "DeleteAnalyticsCommerceRollup",
    variables: {
      id: buildStableAnalyticsExportId(`analytics_commerce_rollup:${docId}`),
      transactionCount: readInt(data.transactionCount),
      purchaseCount: readInt(data.purchaseCount),
      unlockCount: readInt(data.unlockCount),
      grossRevenueUsdTotal: readFloat(data.grossRevenueUsdTotal),
      paypalFeeUsdTotal: readFloat(data.paypalFeeUsdTotal),
      paypalFeeCentsTotal: readInt(data.paypalFeeCentsTotal),
      netRevenueUsdTotal: readFloat(data.netRevenueUsdTotal),
      netRevenueCentsTotal: readInt(data.netRevenueCentsTotal),
      adjustedProfitUsdTotal: readFloat(data.adjustedProfitUsdTotal),
      bonusValueUsdTotal: readFloat(data.bonusValueUsdTotal),
      bonusGumDropsTotal: readInt(data.bonusGumDropsTotal),
      deliveredGumDropsTotal: readInt(data.deliveredGumDropsTotal),
      paidGumDropsTotal: readInt(data.paidGumDropsTotal),
      unlockSpendGdTotal: readInt(data.unlockSpendGdTotal),
      lastTransactionAtMs: readNullableInt(data.lastTransactionAt),
    },
  }),
)

export const onAnalyticsBundleDailyExportSync = createExportSyncTrigger(
  "analytics_bundle_daily/{docId}",
  (docId, data) => ({
    domain: "bundle_daily",
    sourceCollection: "analytics_bundle_daily",
    sourceKey: docId,
    lastSourceUpdatedAtMs: fallbackSourceUpdatedAtMs(data),
    mutationName: "UpsertAnalyticsBundleDaily",
    deleteMutationName: "DeleteAnalyticsBundleDaily",
    variables: {
      id: buildStableAnalyticsExportId(`analytics_bundle_daily:${docId}`),
      dayKey: readStringValue(data.dayKey),
      bundleKey: readStringValue(data.bundleKey),
      bundleLabel: readNullableStringValue(data.bundleLabel),
      bundleTier: readNullableStringValue(data.bundleTier),
      purchaseCount: readInt(data.purchaseCount),
      grossRevenueUsdTotal: readFloat(data.grossRevenueUsdTotal),
      paypalFeeUsdTotal: readFloat(data.paypalFeeUsdTotal),
      paypalFeeCentsTotal: readInt(data.paypalFeeCentsTotal),
      netRevenueUsdTotal: readFloat(data.netRevenueUsdTotal),
      netRevenueCentsTotal: readInt(data.netRevenueCentsTotal),
      adjustedProfitUsdTotal: readFloat(data.adjustedProfitUsdTotal),
      bonusValueUsdTotal: readFloat(data.bonusValueUsdTotal),
      bonusGumDropsTotal: readInt(data.bonusGumDropsTotal),
      deliveredGumDropsTotal: readInt(data.deliveredGumDropsTotal),
      paidGumDropsTotal: readInt(data.paidGumDropsTotal),
      lastTransactionAtMs: readNullableInt(data.lastTransactionAt),
    },
  }),
)

export const onAnalyticsTaskDailyExportSync = createExportSyncTrigger(
  "analytics_task_daily/{docId}",
  (docId, data) => ({
    domain: "task_daily",
    sourceCollection: "analytics_task_daily",
    sourceKey: docId,
    lastSourceUpdatedAtMs: fallbackSourceUpdatedAtMs(data),
    mutationName: "UpsertAnalyticsTaskDaily",
    deleteMutationName: "DeleteAnalyticsTaskDaily",
    variables: {
      id: buildStableAnalyticsExportId(`analytics_task_daily:${docId}`),
      dayKey: readStringValue(data.dayKey) || docId,
      eventCount: readInt(data.eventCount),
      rewardTotal: readInt(data.rewardTotal),
      durationMsTotal: readInt(data.durationMsTotal),
      durationSampleCount: readInt(data.durationSampleCount),
      lastEventAtMs: readNullableInt(data.lastEventAt),
    },
  }),
)

export const onAnalyticsTaskRollupExportSync = createExportSyncTrigger(
  "analytics_task_rollup/{docId}",
  (docId, data) => ({
    domain: "task_rollup",
    sourceCollection: "analytics_task_rollup",
    sourceKey: docId,
    lastSourceUpdatedAtMs: fallbackSourceUpdatedAtMs(data),
    mutationName: "UpsertAnalyticsTaskRollup",
    deleteMutationName: "DeleteAnalyticsTaskRollup",
    variables: {
      id: buildStableAnalyticsExportId(`analytics_task_rollup:${docId}`),
      taskId: readStringValue(data.taskId) || docId,
      title: readNullableStringValue(data.title),
      eventCount: readInt(data.eventCount),
      rewardTotal: readInt(data.rewardTotal),
      durationMsTotal: readInt(data.durationMsTotal),
      durationSampleCount: readInt(data.durationSampleCount),
      lastEventAtMs: readNullableInt(data.lastEventAt),
    },
  }),
)

export const onAnalyticsSecurityDailyExportSync = createExportSyncTrigger(
  "analytics_security_daily/{docId}",
  (docId, data) => ({
    domain: "security_daily",
    sourceCollection: "analytics_security_daily",
    sourceKey: docId,
    lastSourceUpdatedAtMs: fallbackSourceUpdatedAtMs(data),
    mutationName: "UpsertAnalyticsSecurityDaily",
    deleteMutationName: "DeleteAnalyticsSecurityDaily",
    variables: {
      id: buildStableAnalyticsExportId(`analytics_security_daily:${docId}`),
      dayKey: readStringValue(data.dayKey) || docId,
      eventCount: readInt(data.eventCount),
      lastEventAtMs: readNullableInt(data.lastEventAt),
    },
  }),
)

export const onAnalyticsUserSecurityRollupExportSync = createExportSyncTrigger(
  "analytics_user_security_rollup/{docId}",
  (docId, data) => ({
    domain: "user_security_rollup",
    sourceCollection: "analytics_user_security_rollup",
    sourceKey: docId,
    lastSourceUpdatedAtMs: fallbackSourceUpdatedAtMs(data),
    mutationName: "UpsertAnalyticsUserSecurityRollup",
    deleteMutationName: "DeleteAnalyticsUserSecurityRollup",
    variables: {
      id: buildStableAnalyticsExportId(`analytics_user_security_rollup:${docId}`),
      uid: readStringValue(data.uid) || docId,
      username: readNullableStringValue(data.username),
      eventCount: readInt(data.eventCount),
      lastEventAtMs: readNullableInt(data.lastEventAt),
      lastReason: readNullableStringValue(data.lastReason),
      lastLabel: readNullableStringValue(data.lastLabel),
      lastMessage: readNullableStringValue(data.lastMessage),
      lastLocationLabel: readNullableStringValue(data.lastLocationLabel),
      lastDropId: readNullableStringValue(data.lastDropId),
      lastPagePath: readNullableStringValue(data.lastPagePath),
    },
  }),
)

export const onAnalyticsAlertsExportMirror = onDocumentWritten(
  {document: "analytics_alerts/{docId}", region: REGION},
  async (event) => {
    const afterData = event.data?.after.data() as FirestoreDoc | undefined
    const hourKey = getDocumentParam(event.params) || readStringValue(afterData?.hourKey)
    const dataConnect = getAnalyticsExportDataConnect()

    if (!afterData) {
      try {
        const existing = await dataConnect.executeQuery<{analyticsAlerts: Array<{id: string}>}, {hourKey: string}>(
          "ListAnalyticsExportAlertsByHourKey",
          {hourKey},
        )
        const rows = existing.data.analyticsAlerts || []
        await Promise.all(rows.map((row) =>
          dataConnect.executeMutation("DeleteAnalyticsAlert", {id: row.id}),
        ))
        await upsertAnalyticsExportStatus({
          domain: "alerts",
          sourceCollection: "analytics_alerts",
          sourceKey: hourKey,
          lastSourceUpdatedAtMs: Date.now(),
          status: "deleted",
          lastError: null,
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        await recordAnalyticsExportFailure({
          domain: "alerts",
          sourceCollection: "analytics_alerts",
          sourceKey: hourKey,
          errorMessage,
        })
        await markAnalyticsExportStatusError({
          domain: "alerts",
          sourceCollection: "analytics_alerts",
          sourceKey: hourKey,
          lastSourceUpdatedAtMs: Date.now(),
          errorMessage,
        })
        throw error
      }
      return
    }

    const alerts = Array.isArray(afterData.alerts) ? afterData.alerts : []

    try {
      const existing = await dataConnect.executeQuery<{analyticsAlerts: Array<{id: string; type: string}>}, {hourKey: string}>(
        "ListAnalyticsExportAlertsByHourKey",
        {hourKey},
      )
      const existingRows = existing.data.analyticsAlerts || []
      const nextTypeIds = new Set<string>()
      await Promise.all(alerts.map(async (rawAlert) => {
        const alert = typeof rawAlert === "object" && rawAlert !== null ? rawAlert as FirestoreDoc : {}
        const type = readStringValue(alert.type) || "unknown"
        const id = buildStableAnalyticsExportId(`analytics_alert:${hourKey}:${type}`)
        nextTypeIds.add(id)
        await dataConnect.executeMutation("UpsertAnalyticsAlert", {
          id,
          hourKey,
          type,
          severity: readStringValue(alert.severity) || "warn",
          message: readStringValue(alert.message) || "Analytics alert",
          baseline: readNullableInt(alert.baseline),
          current: readNullableInt(alert.current),
          generatedAtMs: readInt(afterData.generatedAtMs) || Date.now(),
        })
      }))
      await Promise.all(existingRows
        .filter((row) => !nextTypeIds.has(row.id))
        .map((row) => dataConnect.executeMutation("DeleteAnalyticsAlert", {id: row.id})))

      await upsertAnalyticsExportStatus({
        domain: "alerts",
        sourceCollection: "analytics_alerts",
        sourceKey: hourKey,
        lastSourceUpdatedAtMs: fallbackSourceUpdatedAtMs(afterData),
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      await recordAnalyticsExportFailure({
        domain: "alerts",
        sourceCollection: "analytics_alerts",
        sourceKey: hourKey,
        errorMessage,
      })
      await markAnalyticsExportStatusError({
        domain: "alerts",
        sourceCollection: "analytics_alerts",
        sourceKey: hourKey,
        lastSourceUpdatedAtMs: fallbackSourceUpdatedAtMs(afterData),
        errorMessage,
      })
      throw error
    }
  },
)
