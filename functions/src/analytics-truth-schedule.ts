import {onSchedule} from "firebase-functions/v2/scheduler"

import {REGION} from "./firebase-runtime.js"
import {MAINTENANCE_SCHEDULES} from "../../shared/runtime/maintenance-mode-contract.js"
import {runIfMaintenanceAllows} from "./maintenance-job-guard.js"

export const reconcileAnalyticsTruthLayers = onSchedule({
  schedule: MAINTENANCE_SCHEDULES.reconcileAnalyticsTruthLayers.schedule,
  region: REGION,
  maxInstances: MAINTENANCE_SCHEDULES.reconcileAnalyticsTruthLayers.maxInstances,
  memory: MAINTENANCE_SCHEDULES.reconcileAnalyticsTruthLayers.memory,
  retryCount: 0,
}, async () => {
  await runIfMaintenanceAllows(async () => {
    const {rebuildAnalyticsTruthLayers} = await import("./analytics-truth-runtime.js")
    await rebuildAnalyticsTruthLayers()
  })
})
