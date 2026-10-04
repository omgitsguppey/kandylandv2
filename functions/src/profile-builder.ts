import {onSchedule} from "firebase-functions/v2/scheduler"
import {logger} from "firebase-functions"
import {REGION} from "./firebase-runtime.js"
import {MAINTENANCE_SCHEDULES} from "../../shared/runtime/maintenance-mode-contract.js"
import {runIfMaintenanceAllows} from "./maintenance-job-guard.js"

/**
 * Scheduled job to compile recent canonical behavior into deterministic profile,
 * guest, and drop-intelligence snapshots used by ranking and admin debugging.
 */
export const buildMLFeatureProfiles = onSchedule({
  schedule: MAINTENANCE_SCHEDULES.buildMLFeatureProfiles.schedule,
  region: REGION,
  maxInstances: MAINTENANCE_SCHEDULES.buildMLFeatureProfiles.maxInstances,
  memory: MAINTENANCE_SCHEDULES.buildMLFeatureProfiles.memory,
  retryCount: 0,
}, async () => {
  await runIfMaintenanceAllows(async () => {
    const {rebuildBehavioralIntelligenceSnapshots} = await import("./behavioral-intelligence-runtime.js")
    logger.info("[Behavioral Intelligence] Starting snapshot rebuild...")
    const summary = await rebuildBehavioralIntelligenceSnapshots()
    logger.info("[Behavioral Intelligence] Snapshot rebuild finished.", summary)
  })
})
