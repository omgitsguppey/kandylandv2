import {onDocumentCreated} from "firebase-functions/v2/firestore"
import {FieldValue} from "firebase-admin/firestore"

import {buildIncrementUpdate, readString, readNumber, toTimeKeys} from "./analytics-core.js"
import {db} from "./firebase-admin.js"
import {REGION} from "./firebase-runtime.js"
import {touchAnalyticsRuntime} from "./analytics-runtime.js"

interface SecurityEventFact {
  eventName?: string;
  userId?: string;
  username?: string;
  reason?: string;
  label?: string;
  message?: string;
  locationLabel?: string;
  severity?: string;
  dropId?: string | null;
  assetIndex?: number | null;
  assetKey?: string | null;
  contentKind?: string | null;
  pagePath?: string | null;
  sessionId?: string | null;
  source?: string;
  userAgent?: string;
  timestamp?: number;
  dayKey?: string;
  hourKey?: string;
  minuteKey?: string;
}

export const onSecurityEventCreated = onDocumentCreated(
  {document: "security_events/{eventId}", region: REGION},
  async (event) => {
    const data = event.data?.data() as SecurityEventFact | undefined
    if (!data) {
      return
    }

    const timestamp = readNumber(data.timestamp) || Date.now()
    const timeKeys = {
      dayKey: readString(data.dayKey) || toTimeKeys(timestamp).dayKey,
      hourKey: readString(data.hourKey) || toTimeKeys(timestamp).hourKey,
      minuteKey: readString(data.minuteKey) || toTimeKeys(timestamp).minuteKey,
    }
    const userId = readString(data.userId)
    const username = readString(data.username) || userId
    const reason = readString(data.reason) || "unknown"
    const label = readString(data.label) || reason
    const severity = readString(data.severity) || "medium"
    const dropId = readString(data.dropId)
    const pagePath = readString(data.pagePath)
    const batch = db.batch()

    batch.set(db.collection("analytics_security_daily").doc(timeKeys.dayKey), {
      dayKey: timeKeys.dayKey,
      eventCount: buildIncrementUpdate(1),
      [`reasons.${reason}`]: buildIncrementUpdate(1),
      [`severities.${severity}`]: buildIncrementUpdate(1),
      updatedAt: FieldValue.serverTimestamp(),
      lastEventAt: timestamp,
    }, {merge: true})

    batch.set(db.collection("analytics_security_rollup").doc("global"), {
      eventCount: buildIncrementUpdate(1),
      [`reasons.${reason}`]: buildIncrementUpdate(1),
      [`severities.${severity}`]: buildIncrementUpdate(1),
      lastEventAt: timestamp,
      updatedAt: FieldValue.serverTimestamp(),
    }, {merge: true})

    if (userId) {
      batch.set(db.collection("analytics_user_security_rollup").doc(userId), {
        uid: userId,
        username,
        eventCount: buildIncrementUpdate(1),
        [`reasons.${reason}`]: buildIncrementUpdate(1),
        [`severities.${severity}`]: buildIncrementUpdate(1),
        lastEventAt: timestamp,
        lastReason: reason,
        lastLabel: label,
        lastMessage: readString(data.message),
        lastLocationLabel: readString(data.locationLabel),
        lastDropId: dropId || null,
        lastPagePath: pagePath || null,
        updatedAt: FieldValue.serverTimestamp(),
      }, {merge: true})

      batch.set(db.collection("analytics_user_daily").doc(`${timeKeys.dayKey}_${userId}`), {
        dayKey: timeKeys.dayKey,
        uid: userId,
        username,
        securityEventCount: buildIncrementUpdate(1),
        [`securityReasons.${reason}`]: buildIncrementUpdate(1),
        [`securitySeverities.${severity}`]: buildIncrementUpdate(1),
        lastSeenAt: timestamp,
        updatedAt: FieldValue.serverTimestamp(),
      }, {merge: true})
    }

    await batch.commit()
    await touchAnalyticsRuntime(timestamp)
  },
)
