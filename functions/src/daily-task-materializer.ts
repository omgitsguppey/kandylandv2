import {logger} from "firebase-functions"
import {onSchedule} from "firebase-functions/v2/scheduler"

import {REGION} from "./firebase-runtime.js"

const DAILY_TASK_MATERIALIZER_MAX_USERS = 200
const DAILY_TASK_MATERIALIZER_MAX_RUNTIME_MS = 45_000

export const materializeDailyTaskResetWindows = onSchedule({
  schedule: "5 0 * * *",
  timeZone: "America/Chicago",
  region: REGION,
  retryCount: 1,
}, async () => {
  const endpoint = process.env.TASK_MATERIALIZER_ENDPOINT
  const token = process.env.TASK_MATERIALIZER_TOKEN

  if (!endpoint || !token) {
    logger.warn("daily task materializer skipped: endpoint/token not configured", {
      source: "daily_task_materializer",
      reasonCode: "materializer_retry",
    })
    return
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      source: "daily_task_materializer",
      maxUsers: DAILY_TASK_MATERIALIZER_MAX_USERS,
      maxRuntimeMs: DAILY_TASK_MATERIALIZER_MAX_RUNTIME_MS,
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => "")
    throw new Error(`daily task materializer failed: ${response.status} ${body.slice(0, 500)}`)
  }

  logger.info("daily task materializer completed", {
    source: "daily_task_materializer",
    status: response.status,
  })
})
