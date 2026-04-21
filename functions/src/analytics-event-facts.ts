import {onDocumentCreated} from "firebase-functions/v2/firestore"
import {FieldValue} from "firebase-admin/firestore"

import {
  buildIncrementUpdate,
  encodeKeyFragment,
  type AnalyticsEventFact,
  readBoolean,
  readNumber,
  readString,
  toTimeKeys,
} from "./analytics-core.js"
import {db} from "./firebase-admin.js"
import {REGION} from "./firebase-runtime.js"
import {recordSemanticRollupFromEventFact} from "./analytics-semantics.js"
import {touchAnalyticsRuntime} from "./analytics-runtime.js"
import {enforcePrivacyConsentOnEvent} from "./privacy-consent-enforcement.js"
import {onCall, HttpsError} from "firebase-functions/v2/https"

function buildSessionFactId(event: AnalyticsEventFact) {
  const sessionKey = encodeKeyFragment(readString(event.sessionId) || readString(event.userId) || readString(event.minuteKey))
  const dropKey = encodeKeyFragment(readString(event.dropId) || "site")
  return `${sessionKey}_${dropKey}`
}

export const ingestAnalyticsEvent = onCall(
  {region: REGION, enforceAppCheck: true},
  async (request) => {
    // 1. Enforce Authentication / App Check
    if (!request.app) {
      throw new HttpsError("failed-precondition", "The function must be called from an App Check verified app.")
    }

    const payload = request.data as Partial<AnalyticsEventFact>
    if (!payload.eventName) {
      throw new HttpsError("invalid-argument", "eventName is required.")
    }

    // 2. Validate and enforce privacy at the gateway
    const enforcement = enforcePrivacyConsentOnEvent(payload as AnalyticsEventFact)
    const sanitizedPayload = enforcement.anonymized ? enforcement.sanitizedFact : payload

    const finalEvent: AnalyticsEventFact = {
      ...sanitizedPayload,
      eventName: readString(payload.eventName),
      timestamp: readNumber(payload.timestamp) || Date.now(),
      origin: "client", // Explicitly assign source of truth
      validatedAt: Date.now(),
    } as AnalyticsEventFact

    // 3. Write to the canonical append-only collection
    // This will trigger `onAnalyticsEventFactCreated` for downstream processing.
    const ref = await db.collection("analytics_event_facts").add(finalEvent)

    return {
      status: "success",
      eventId: ref.id,
      anonymized: enforcement.anonymized,
    }
  }
)

export const onAnalyticsEventFactCreated = onDocumentCreated(
  {document: "analytics_event_facts/{eventId}", region: REGION},
  async (event) => {
    const data = event.data?.data() as AnalyticsEventFact | undefined
    if (!data) return
    
    // Explicit deduplication guard using a dedicated collection
    const dedupeRef = db.collection("analytics_dedupe").doc(event.id)
    const dedupeSnap = await dedupeRef.get()
    if (dedupeSnap.exists) {
      console.warn(`[Analytics] Duplicate event fact skipped: ${event.id}`)
      return
    }

    const enforcement = enforcePrivacyConsentOnEvent(data)
    
    let userId = readString(data.userId)
    let username = readString(data.username)
    let sessionId = readString(data.sessionId)
    
    if (enforcement.anonymized && enforcement.sanitizedFact) {
      userId = readString(enforcement.sanitizedFact.userId)
      username = readString(enforcement.sanitizedFact.username)
      sessionId = readString(enforcement.sanitizedFact.sessionId)
    }

    const timestamp = readNumber(data.timestamp) || Date.now()
    const timeKeys = {
      dayKey: readString(data.dayKey) || toTimeKeys(timestamp).dayKey,
      hourKey: readString(data.hourKey) || toTimeKeys(timestamp).hourKey,
      minuteKey: readString(data.minuteKey) || toTimeKeys(timestamp).minuteKey,
    }
    const eventName = readString(data.eventName)
    const pagePath = readString(data.pagePath)
    const dropId = readString(data.dropId)
    const dropTitle = readString(data.dropTitle) || dropId
    const isMobileViewport = readBoolean(data.isMobileViewport)
    const durationMs = readNumber(data.durationMs, 0, 86400000)
    const watchSeconds = Math.max(
      readNumber(data.watchSeconds),
      readNumber(data.sessionWatchSeconds),
    )
    const loadMs = readNumber(data.loadMs)
    const lastParams = typeof data.params === "object" && data.params !== null ? data.params : {}
    const dayRef = db.collection("analytics_rollups_daily").doc(timeKeys.dayKey)
    const sessionFactRef = sessionId || eventName.startsWith("viewer_")
      ? db.collection("analytics_session_facts").doc(buildSessionFactId(data))
      : null
    const existingSessionFactSnapshot = sessionFactRef ? await sessionFactRef.get() : null
    const batch = db.batch()

    batch.set(dayRef, {
      dayKey: timeKeys.dayKey,
      totalEvents: buildIncrementUpdate(1),
      authenticatedEvents: buildIncrementUpdate(1),
      mobileEvents: buildIncrementUpdate(isMobileViewport ? 1 : 0),
      viewerSessions: buildIncrementUpdate(eventName === "viewer_session_started" ? 1 : 0),
      unwraps: buildIncrementUpdate(eventName === "unlock_drop_success" ? 1 : 0),
      purchases: buildIncrementUpdate(eventName === "gumdrops_purchase_completed" ? 1 : 0),
      watchSecondsTotal: buildIncrementUpdate(watchSeconds),
      watchSampleCount: buildIncrementUpdate(watchSeconds > 0 ? 1 : 0),
      loadMsTotal: buildIncrementUpdate(loadMs),
      loadSampleCount: buildIncrementUpdate(loadMs > 0 ? 1 : 0),
      durationMsTotal: buildIncrementUpdate(durationMs),
      durationSampleCount: buildIncrementUpdate(durationMs > 0 ? 1 : 0),
      lastEventAt: timestamp,
      updatedAt: FieldValue.serverTimestamp(),
    }, {merge: true})

    batch.set(dayRef.collection("events").doc(encodeKeyFragment(eventName)), {
      eventName,
      count: buildIncrementUpdate(1),
      lastEventAt: timestamp,
      updatedAt: FieldValue.serverTimestamp(),
    }, {merge: true})

    batch.set(db.collection("analytics_event_stats").doc(eventName), {
      eventName,
      totalCount: buildIncrementUpdate(1),
      lastSeenAt: timestamp,
      lastParams,
      updatedAt: FieldValue.serverTimestamp(),
    }, {merge: true})

    if (pagePath) {
      batch.set(dayRef.collection("pages").doc(encodeKeyFragment(pagePath)), {
        pagePath,
        count: buildIncrementUpdate(1),
        mobileCount: buildIncrementUpdate(isMobileViewport ? 1 : 0),
        lastEventAt: timestamp,
        updatedAt: FieldValue.serverTimestamp(),
      }, {merge: true})
    }

    if (userId) {
      batch.set(db.collection("analytics_users_rollup").doc(userId), {
        uid: userId,
        username: username || userId,
        eventCount: buildIncrementUpdate(1),
        sessionCount: buildIncrementUpdate(eventName === "viewer_session_started" ? 1 : 0),
        unwrapCount: buildIncrementUpdate(eventName === "unlock_drop_success" ? 1 : 0),
        purchaseCount: buildIncrementUpdate(eventName === "gumdrops_purchase_completed" ? 1 : 0),
        watchSecondsTotal: buildIncrementUpdate(watchSeconds),
        loadMsTotal: buildIncrementUpdate(loadMs),
        loadSampleCount: buildIncrementUpdate(loadMs > 0 ? 1 : 0),
        lastSeenAt: timestamp,
        updatedAt: FieldValue.serverTimestamp(),
      }, {merge: true})

      batch.set(db.collection("analytics_user_daily").doc(`${timeKeys.dayKey}_${userId}`), {
        dayKey: timeKeys.dayKey,
        uid: userId,
        username: username || userId,
        eventCount: buildIncrementUpdate(1),
        sessionCount: buildIncrementUpdate(eventName === "viewer_session_started" ? 1 : 0),
        unwrapCount: buildIncrementUpdate(eventName === "unlock_drop_success" ? 1 : 0),
        purchaseCount: buildIncrementUpdate(eventName === "gumdrops_purchase_completed" ? 1 : 0),
        watchSecondsTotal: buildIncrementUpdate(watchSeconds),
        loadMsTotal: buildIncrementUpdate(loadMs),
        loadSampleCount: buildIncrementUpdate(loadMs > 0 ? 1 : 0),
        lastSeenAt: timestamp,
        updatedAt: FieldValue.serverTimestamp(),
      }, {merge: true})
    }

    if (dropId) {
      batch.set(db.collection("analytics_drops_rollup").doc(dropId), {
        dropId,
        dropTitle,
        dropCategory: readString(data.dropCategory),
        eventCount: buildIncrementUpdate(1),
        viewerSessionCount: buildIncrementUpdate(eventName === "viewer_session_started" ? 1 : 0),
        unwrapCount: buildIncrementUpdate(eventName === "unlock_drop_success" ? 1 : 0),
        downloadCount: buildIncrementUpdate(eventName === "viewer_source_downloaded" ? 1 : 0),
        relatedClickCount: buildIncrementUpdate(eventName === "viewer_related_drop_clicked" ? 1 : 0),
        watchSecondsTotal: buildIncrementUpdate(watchSeconds),
        loadMsTotal: buildIncrementUpdate(loadMs),
        loadSampleCount: buildIncrementUpdate(loadMs > 0 ? 1 : 0),
        updatedAt: FieldValue.serverTimestamp(),
        lastEventAt: timestamp,
      }, {merge: true})

      batch.set(db.collection("analytics_drop_daily").doc(`${timeKeys.dayKey}_${dropId}`), {
        dayKey: timeKeys.dayKey,
        dropId,
        dropTitle,
        dropCategory: readString(data.dropCategory),
        eventCount: buildIncrementUpdate(1),
        viewerSessionCount: buildIncrementUpdate(eventName === "viewer_session_started" ? 1 : 0),
        unwrapCount: buildIncrementUpdate(eventName === "unlock_drop_success" ? 1 : 0),
        downloadCount: buildIncrementUpdate(eventName === "viewer_source_downloaded" ? 1 : 0),
        relatedClickCount: buildIncrementUpdate(eventName === "viewer_related_drop_clicked" ? 1 : 0),
        watchSecondsTotal: buildIncrementUpdate(watchSeconds),
        loadMsTotal: buildIncrementUpdate(loadMs),
        loadSampleCount: buildIncrementUpdate(loadMs > 0 ? 1 : 0),
        updatedAt: FieldValue.serverTimestamp(),
        lastEventAt: timestamp,
      }, {merge: true})
    }

    if (sessionFactRef) {
      batch.set(sessionFactRef, {
        sessionId: sessionId || buildSessionFactId(data),
        userId,
        username,
        dropId,
        dropTitle,
        pagePath,
        dayKey: timeKeys.dayKey,
        hourKey: timeKeys.hourKey,
        ...(existingSessionFactSnapshot?.exists ? {} : {firstEventAt: timestamp}),
        lastEventAt: timestamp,
        eventCount: buildIncrementUpdate(1),
        startedCount: buildIncrementUpdate(eventName === "viewer_session_started" ? 1 : 0),
        completedCount: buildIncrementUpdate(eventName === "viewer_session_completed" ? 1 : 0),
        watchSecondsTotal: buildIncrementUpdate(watchSeconds),
        loadMsTotal: buildIncrementUpdate(loadMs),
        loadSampleCount: buildIncrementUpdate(loadMs > 0 ? 1 : 0),
        updatedAt: FieldValue.serverTimestamp(),
      }, {merge: true})
    }

    batch.set(dedupeRef, {
      processedAt: FieldValue.serverTimestamp(),
      eventId: event.id,
      timestamp,
    })

    await batch.commit()

    await Promise.all([
      recordSemanticRollupFromEventFact({
        eventFact: data,
        sourceKey: "analytics_event_facts",
      }),
      touchAnalyticsRuntime(timestamp),
    ])
  },
)
