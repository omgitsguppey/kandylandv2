import {onDocumentCreated} from "firebase-functions/v2/firestore"
import {FieldValue} from "firebase-admin/firestore"

import {
  type AnalyticsEventFact,
  readString,
  readNumber,
} from "./analytics-core.js"
import {db} from "./firebase-admin.js"
import {REGION} from "./firebase-runtime.js"

export const onAnalyticsEventFactTimeline = onDocumentCreated(
  {document: "analytics_event_facts/{eventId}", region: REGION},
  async (event) => {
    const data = event.data?.data() as AnalyticsEventFact | undefined
    if (!data) return
    
    const eventId = event.id
    const timestamp = readNumber(data.timestamp) || Date.now()
    const consentMode = readString(data.consentMode)

    // Stop propagation to Timeline/Profile layers if tracking is denied or anonymous
    if (consentMode === "denied" || data.globalPrivacyControl) {
      return
    }

    const userId = readString(data.userId)
    const sessionId = readString(data.sessionId)
    const dropId = readString(data.dropId)
    const eventName = readString(data.eventName)
    
    if (!eventName) return

    const batch = db.batch()

    // 1. User Timeline (Only if authenticated)
    if (userId) {
      const userEventRef = db
        .collection("analytics_user_timeline")
        .doc(userId)
        .collection("events")
        .doc(eventId)
        
      batch.set(userEventRef, {
        eventId,
        eventName,
        timestamp,
        pagePath: readString(data.pagePath),
        dropId,
        durationMs: readNumber(data.durationMs),
        createdAt: FieldValue.serverTimestamp(),
      })
    }

    // 2. Guest/Session Timeline (Only if unauthenticated but consented)
    if (sessionId && !userId) {
      const sessionEventRef = db
        .collection("analytics_guest_timeline")
        .doc(sessionId)
        .collection("events")
        .doc(eventId)
        
      batch.set(sessionEventRef, {
        eventId,
        eventName,
        timestamp,
        pagePath: readString(data.pagePath),
        dropId,
        createdAt: FieldValue.serverTimestamp(),
      })
    }

    // 3. Drop Engagement Timeline
    if (dropId) {
      const dropEventRef = db
        .collection("analytics_drop_timeline")
        .doc(dropId)
        .collection("events")
        .doc(eventId)
        
      batch.set(dropEventRef, {
        eventId,
        eventName,
        timestamp,
        userId: userId || "anonymous",
        sessionId: sessionId || "unknown",
        createdAt: FieldValue.serverTimestamp(),
      })
    }

    // If there is nothing to batch, skip
    if (!userId && (!sessionId || userId) && !dropId) {
      return
    }

    await batch.commit()
  }
)
