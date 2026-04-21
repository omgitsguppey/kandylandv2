import {onSchedule} from "firebase-functions/v2/scheduler"

import {REGION} from "./firebase-runtime.js"
import {rebuildAnalyticsTruthLayers} from "./analytics-truth-runtime.js"

export const reconcileAnalyticsTruthLayers = onSchedule({
  schedule: "every 1 hours",
  region: REGION,
  retryCount: 0,
}, async () => {
  await rebuildAnalyticsTruthLayers()
})

