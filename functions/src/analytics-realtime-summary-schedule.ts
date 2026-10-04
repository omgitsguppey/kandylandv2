import {onSchedule} from "firebase-functions/v2/scheduler"

import {REGION} from "./firebase-runtime.js"
import {runIfMaintenanceAllows} from "./maintenance-job-guard.js"
import {MAINTENANCE_SCHEDULES} from "../../shared/runtime/maintenance-mode-contract.js"

export const refreshAdminAnalyticsRealtimeSummary = onSchedule({
  schedule: MAINTENANCE_SCHEDULES.refreshAdminAnalyticsRealtimeSummary.schedule,
  region: REGION,
  maxInstances: MAINTENANCE_SCHEDULES.refreshAdminAnalyticsRealtimeSummary.maxInstances,
  retryCount: 0,
}, async () => {
  await runIfMaintenanceAllows(async () => {
    const {runRefreshAdminAnalyticsRealtimeSummary} = await import("./analytics-realtime-summary.js")
    await runRefreshAdminAnalyticsRealtimeSummary()
  })
})
