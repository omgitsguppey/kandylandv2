import {onSchedule} from "firebase-functions/v2/scheduler"
import {logger} from "firebase-functions"
import {REGION} from "./firebase-runtime.js"
import {rebuildBehavioralIntelligenceSnapshots} from "./behavioral-intelligence-runtime.js"

/**
 * Scheduled job to compile recent canonical behavior into deterministic profile,
 * guest, and drop-intelligence snapshots used by ranking and admin debugging.
 */
export const buildMLFeatureProfiles = onSchedule({
  schedule: "every 4 hours",
  region: REGION,
  retryCount: 0,
}, async () => {
  logger.info("[Behavioral Intelligence] Starting snapshot rebuild...")
  const summary = await rebuildBehavioralIntelligenceSnapshots()
  logger.info("[Behavioral Intelligence] Snapshot rebuild finished.", summary)
})
