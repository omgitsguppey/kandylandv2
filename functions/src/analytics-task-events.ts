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
  potentialRewardGd?: number;
  creditedRewardGd?: number;
  forfeitedPotentialRewardGd?: number;
  expiredPotentialRewardGd?: number;
  reminderPotentialRewardGd?: number;
  progress?: number;
  maxProgress?: number;
  timestamp?: number;
  durationMs?: number;
  rewardAuditFlag?: string;
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
    const potentialRewardGd = readNumber(data.potentialRewardGd)
    const creditedRewardGd = readNumber(data.creditedRewardGd)
    const forfeitedPotentialRewardGd = readNumber(data.forfeitedPotentialRewardGd)
    const expiredPotentialRewardGd = readNumber(data.expiredPotentialRewardGd)
    const reminderPotentialRewardGd = readNumber(data.reminderPotentialRewardGd)
    const durationMs = readNumber(data.durationMs)
    const outOfBoundsEventCount = readString(data.rewardAuditFlag) === "historical_reward_out_of_bounds" ? 1 : 0
    const batch = db.batch()

    batch.set(db.collection("analytics_task_daily").doc(timeKeys.dayKey), {
      dayKey: timeKeys.dayKey,
      eventCount: buildIncrementUpdate(1),
      rewardTotal: buildIncrementUpdate(creditedRewardGd),
      paidRewardTotalGd: buildIncrementUpdate(creditedRewardGd),
      potentialRewardTotalGd: buildIncrementUpdate(potentialRewardGd),
      forfeitedPotentialRewardGd: buildIncrementUpdate(forfeitedPotentialRewardGd),
      expiredPotentialRewardGd: buildIncrementUpdate(expiredPotentialRewardGd),
      reminderPotentialRewardGd: buildIncrementUpdate(reminderPotentialRewardGd),
      outOfBoundsEventCount: buildIncrementUpdate(outOfBoundsEventCount),
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
      rewardTotal: buildIncrementUpdate(creditedRewardGd),
      paidRewardTotalGd: buildIncrementUpdate(creditedRewardGd),
      potentialRewardTotalGd: buildIncrementUpdate(potentialRewardGd),
      forfeitedPotentialRewardGd: buildIncrementUpdate(forfeitedPotentialRewardGd),
      expiredPotentialRewardGd: buildIncrementUpdate(expiredPotentialRewardGd),
      reminderPotentialRewardGd: buildIncrementUpdate(reminderPotentialRewardGd),
      outOfBoundsEventCount: buildIncrementUpdate(outOfBoundsEventCount),
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
        taskRewardTotal: buildIncrementUpdate(creditedRewardGd),
        taskPaidRewardTotalGd: buildIncrementUpdate(creditedRewardGd),
        taskPotentialRewardTotalGd: buildIncrementUpdate(potentialRewardGd),
        taskForfeitedPotentialRewardGd: buildIncrementUpdate(forfeitedPotentialRewardGd),
        taskExpiredPotentialRewardGd: buildIncrementUpdate(expiredPotentialRewardGd),
        taskReminderPotentialRewardGd: buildIncrementUpdate(reminderPotentialRewardGd),
        taskRewardOutOfBoundsEventCount: buildIncrementUpdate(outOfBoundsEventCount),
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
