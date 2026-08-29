import {logger} from "firebase-functions"
import {onSchedule} from "firebase-functions/v2/scheduler"
import {setGlobalOptions} from "firebase-functions/v2"

import {REGION} from "./firebase-runtime.js"
import {
  MAINTENANCE_SCHEDULES,
} from "../../shared/runtime/maintenance-mode-contract.js"
import {runIfMaintenanceAllows} from "./maintenance-job-guard.js"

export {
  onAnalyticsEventFactCreated,
  ingestAnalyticsEvent
} from "./analytics-event-facts.js"
export {onAnalyticsEventFactTimeline} from "./analytics-timeline.js"
export {buildMLFeatureProfiles} from "./profile-builder.js"
export {reconcileAnalyticsTruthLayers} from "./analytics-truth-schedule.js"
export {materializeDailyTaskResetWindows} from "./daily-task-materializer.js"
export {materializeUserTrackingIndexes} from "./user-index-materializer-schedule.js"
export {refreshAdminAnalyticsRealtimeSummary} from "./analytics-realtime-summary-schedule.js"
export {scheduledBigQueryRawEventsExport} from "./analytics-bigquery-export.js"
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
  memory: "512MiB",
  minInstances: 0,
  maxInstances: 10,
})

export const processQueueLifecycle = onSchedule({
  schedule: MAINTENANCE_SCHEDULES.processQueueLifecycle.schedule,
  region: REGION,
  maxInstances: MAINTENANCE_SCHEDULES.processQueueLifecycle.maxInstances,
  retryCount: 0,
}, async () => {
  await runIfMaintenanceAllows(async () => {
    const {processQueueLifecycleRuntime} = await import("./queue-runtime.js")
    const result = await processQueueLifecycleRuntime({
      executionLayer: "scheduler",
      surface: "functions/processQueueLifecycle",
      staleAfterMs: 60 * 60 * 1000,
    })
    logger.info("processQueueLifecycle completed", result)
  })
})

export const notifyActiveDropsLifecycle = onSchedule({
  schedule: MAINTENANCE_SCHEDULES.notifyActiveDropsLifecycle.schedule,
  region: REGION,
  maxInstances: MAINTENANCE_SCHEDULES.notifyActiveDropsLifecycle.maxInstances,
  retryCount: 0,
}, async () => {
  await runIfMaintenanceAllows(async () => {
    const {notifyActiveDropsRuntime} = await import("./queue-runtime.js")
    const result = await notifyActiveDropsRuntime({
      executionLayer: "scheduler",
      surface: "functions/notifyActiveDropsLifecycle",
      staleAfterMs: 20 * 60 * 1000,
    })
    logger.info("notifyActiveDropsLifecycle completed", result)
  })
})
