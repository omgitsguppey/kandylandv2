import {onDocumentCreated} from "firebase-functions/v2/firestore"
import {FieldValue} from "firebase-admin/firestore"

import {buildIncrementUpdate, readNumber, readString, toTimeKeys} from "./analytics-core.js"
import {db} from "./firebase-admin.js"
import {REGION} from "./firebase-runtime.js"
import {touchAnalyticsRuntime} from "./analytics-runtime.js"

interface TaskEventFact {
  type?: string;
  taskId?: string;
  title?: string;
  userId?: string;
  username?: string;
  reward?: number;
  progress?: number;
  maxProgress?: number;
  timestamp?: number;
  durationMs?: number;
}

export const onDailyTaskEventCreated = onDocumentCreated(
  {document: "daily_task_events/{eventId}", region: REGION},
  async (event) => {
    const data = event.data?.data() as TaskEventFact | undefined
    if (!data) {
      return
    }

    const timestamp = readNumber(data.timestamp) || Date.now()
    const timeKeys = toTimeKeys(timestamp)
    const type = readString(data.type) || "unknown"
    const taskId = readString(data.taskId) || "unknown-task"
    const title = readString(data.title) || taskId
    const userId = readString(data.userId)
    const username = readString(data.username) || userId
    const reward = readNumber(data.reward)
    const durationMs = readNumber(data.durationMs)
    const batch = db.batch()

    batch.set(db.collection("analytics_task_daily").doc(timeKeys.dayKey), {
      dayKey: timeKeys.dayKey,
      eventCount: buildIncrementUpdate(1),
      rewardTotal: buildIncrementUpdate(reward),
      durationMsTotal: buildIncrementUpdate(durationMs),
      durationSampleCount: buildIncrementUpdate(durationMs > 0 ? 1 : 0),
      [`types.${type}`]: buildIncrementUpdate(1),
      updatedAt: FieldValue.serverTimestamp(),
      lastEventAt: timestamp,
    }, {merge: true})

    batch.set(db.collection("analytics_task_rollup").doc(taskId), {
      taskId,
      title,
      eventCount: buildIncrementUpdate(1),
      rewardTotal: buildIncrementUpdate(reward),
      durationMsTotal: buildIncrementUpdate(durationMs),
      durationSampleCount: buildIncrementUpdate(durationMs > 0 ? 1 : 0),
      [`types.${type}`]: buildIncrementUpdate(1),
      updatedAt: FieldValue.serverTimestamp(),
      lastEventAt: timestamp,
    }, {merge: true})

    if (userId) {
      batch.set(db.collection("analytics_user_daily").doc(`${timeKeys.dayKey}_${userId}`), {
        dayKey: timeKeys.dayKey,
        uid: userId,
        username,
        taskEventCount: buildIncrementUpdate(1),
        taskRewardTotal: buildIncrementUpdate(reward),
        taskDurationMsTotal: buildIncrementUpdate(durationMs),
        taskDurationSampleCount: buildIncrementUpdate(durationMs > 0 ? 1 : 0),
        [`taskTypes.${type}`]: buildIncrementUpdate(1),
        updatedAt: FieldValue.serverTimestamp(),
        lastSeenAt: timestamp,
      }, {merge: true})
    }

    await batch.commit()
    await touchAnalyticsRuntime(timestamp)
  },
)
