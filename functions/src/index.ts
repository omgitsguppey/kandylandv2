import {logger} from "firebase-functions"
import {onSchedule} from "firebase-functions/v2/scheduler"
import {setGlobalOptions} from "firebase-functions/v2"

import {REGION} from "./firebase-runtime.js"
import {
  notifyActiveDropsRuntime,
  processQueueLifecycleRuntime,
} from "./queue-runtime.js"

export {
  onAnalyticsEventFactCreated,
  ingestAnalyticsEvent
} from "./analytics-event-facts.js"
export {onAnalyticsEventFactTimeline} from "./analytics-timeline.js"
export {buildMLFeatureProfiles} from "./profile-builder.js"
export {reconcileAnalyticsTruthLayers} from "./analytics-truth-schedule.js"
export {onAnalyticsEventFactBigQueryExport} from "./analytics-bigquery-export.js"
export {
  onAnalyticsEventFactOrchestrated,
  onCreatorBookingOrchestrated,
  onCreatorBroadcastOrchestrated,
  onCreatorLedgerAccrualOrchestrated,
  onCreatorMessageOrchestrated,
  onCreatorPayoutRequestOrchestrated,
  onCreatorRelationshipOrchestrated,
  onCreatorRequestOrchestrated,
  onCreatorSubscriptionOrchestrated,
  onDailyTaskEventOrchestrated,
  onGuestAnalyticsBatchOrchestrated,
  onNotificationOrchestrated,
  onOrchestrationRepairActionCreated,
  onSecurityEventOrchestrated,
  onTransactionOrchestrated,
  onWatchAssetOrchestrated,
  onWatchSessionOrchestrated,
} from "./orchestration-engine.js"
export {onGuestAnalyticsBatchCreated} from "./analytics-guest-batches.js"
export {onDailyTaskEventCreated} from "./analytics-task-events.js"
export {onSecurityEventCreated} from "./analytics-security-events.js"
export {onTransactionCreated} from "./analytics-transactions.js"

setGlobalOptions({
  region: REGION,
  maxInstances: 10,
})

export const processQueueLifecycle = onSchedule({
  schedule: "every 15 minutes",
  region: REGION,
  retryCount: 0,
}, async () => {
  const result = await processQueueLifecycleRuntime({
    executionLayer: "scheduler",
    surface: "functions/processQueueLifecycle",
    staleAfterMs: 60 * 60 * 1000,
  })
  logger.info("processQueueLifecycle completed", result)
})

export const notifyActiveDropsLifecycle = onSchedule({
  schedule: "every 5 minutes",
  region: REGION,
  retryCount: 0,
}, async () => {
  const result = await notifyActiveDropsRuntime({
    executionLayer: "scheduler",
    surface: "functions/notifyActiveDropsLifecycle",
    staleAfterMs: 20 * 60 * 1000,
  })
  logger.info("notifyActiveDropsLifecycle completed", result)
})
