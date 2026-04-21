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

type IdentifiedAnalyticsBatchEvent = {
  eventId?: unknown;
  eventTimestampMs?: unknown;
  eventName?: unknown;
  eventParams?: unknown;
}

function buildSessionFactId(event: AnalyticsEventFact) {
  const sessionKey = encodeKeyFragment(readString(event.sessionId) || readString(event.userId) || readString(event.minuteKey))
  const dropKey = encodeKeyFragment(readString(event.dropId) || "site")
  return `${sessionKey}_${dropKey}`
}

function buildFallbackEventId(userId: string, eventName: string) {
  return `evt_${encodeKeyFragment(userId || "anonymous")}_${encodeKeyFragment(eventName || "event")}_${Date.now().toString(36)}_${crypto.randomUUID().replace(/-/gu, "").slice(0, 16)}`
}

function normalizeBatchEvents(data: unknown) {
  if (Array.isArray((data as {events?: unknown})?.events)) {
    return ((data as {events: unknown[]}).events || []) as unknown[]
  }

  return [data]
}

function normalizeAnalyticsEventFact(input: {
  rawEvent: unknown
  userId: string
}): AnalyticsEventFact {
  const rawEvent = (input.rawEvent || {}) as IdentifiedAnalyticsBatchEvent & Partial<AnalyticsEventFact>
  if (
    typeof rawEvent.eventName === "string"
    && !("eventParams" in rawEvent)
    && ("pagePath" in rawEvent || "sessionId" in rawEvent || "dropId" in rawEvent || "params" in rawEvent)
  ) {
    return {
      ...(rawEvent as AnalyticsEventFact),
      eventId: readString(rawEvent.eventId) || buildFallbackEventId(input.userId, readString(rawEvent.eventName)),
      userId: input.userId,
      consentMode: readString(rawEvent.consentMode) || "identified",
      sourceLayer: readString(rawEvent.sourceLayer) || "observed",
      sourceSurface: readString(rawEvent.sourceSurface) || "client",
      clientTimestamp: readNumber(rawEvent.clientTimestamp) || readNumber(rawEvent.timestamp) || Date.now(),
      serverTimestamp: Date.now(),
      idempotencyKey: readString(rawEvent.idempotencyKey) || readString(rawEvent.eventId) || buildFallbackEventId(input.userId, readString(rawEvent.eventName)),
      authState: "authenticated",
    }
  }
  const params = rawEvent.eventParams && typeof rawEvent.eventParams === "object"
    ? rawEvent.eventParams as Record<string, unknown>
    : {}
  const eventName = readString(rawEvent.eventName)
  const timestamp = readNumber(rawEvent.eventTimestampMs) || Date.now()
  const eventId = readString(rawEvent.eventId) || buildFallbackEventId(input.userId, eventName)

  return {
    eventId,
    eventName,
    timestamp,
    clientTimestamp: timestamp,
    serverTimestamp: Date.now(),
    userId: input.userId,
    username: "",
    consentMode: "identified",
    sourceLayer: "observed",
    sourceSurface: readString(params.page_path) || readString(params.pagePath) || "client",
    idempotencyKey: eventId,
    sessionId: readString(params.session_id) || readString(params.sessionId),
    pagePath: readString(params.page_path) || readString(params.pagePath),
    dayKey: readString(params.day_key) || readString(params.dayKey),
    hourKey: readString(params.hour_key) || readString(params.hourKey),
    minuteKey: readString(params.minute_key) || readString(params.minuteKey),
    dropId: readString(params.drop_id) || readString(params.dropId),
    dropTitle: readString(params.drop_title) || readString(params.dropTitle),
    dropCategory: readString(params.drop_category) || readString(params.dropCategory),
    assetKey: readString(params.asset_key) || readString(params.assetKey),
    assetIndex: readNumber(params.asset_index) || readNumber(params.assetIndex),
    contentKind: readString(params.content_kind) || readString(params.contentKind),
    destination: readString(params.destination),
    destinationType: readString(params.destination_type) || readString(params.destinationType),
    sessionWatchSeconds: readNumber(params.session_watch_seconds) || readNumber(params.sessionWatchSeconds),
    watchSeconds: readNumber(params.watch_seconds) || readNumber(params.watchSeconds),
    durationMs: readNumber(params.duration_ms) || readNumber(params.durationMs),
    loadMs: readNumber(params.load_ms) || readNumber(params.loadMs),
    viewportWidth: readNumber(params.viewport_width) || readNumber(params.viewportWidth),
    viewportHeight: readNumber(params.viewport_height) || readNumber(params.viewportHeight),
    isMobileViewport: readBoolean(params.is_mobile_viewport) || readBoolean(params.isMobileViewport),
    authState: "authenticated",
    params,
  }
}

export const ingestAnalyticsEvent = onCall(
  {region: REGION, enforceAppCheck: true},
  async (request) => {
    // 1. Enforce Authentication / App Check
    if (!request.app) {
      throw new HttpsError("failed-precondition", "The function must be called from an App Check verified app.")
    }

    const userId = request.auth?.uid || ""
    if (!userId) {
      throw new HttpsError("unauthenticated", "Authenticated telemetry requires a signed-in user.")
    }

    const rawEvents = normalizeBatchEvents(request.data)
    if (rawEvents.length === 0) {
      throw new HttpsError("invalid-argument", "eventName is required.")
    }

    const results = await Promise.all(rawEvents.map(async (rawEvent) => {
      const normalizedEvent = normalizeAnalyticsEventFact({
        rawEvent,
        userId,
      })
      if (!normalizedEvent.eventName) {
        throw new HttpsError("invalid-argument", "eventName is required.")
      }

      const enforcement = enforcePrivacyConsentOnEvent(normalizedEvent)
      if (!enforcement.allowed) {
        return {
          eventId: normalizedEvent.eventId,
          status: "ignored",
          reason: enforcement.reason || "consent_denied",
          anonymized: false,
        }
      }

      const finalEvent: AnalyticsEventFact = {
        ...normalizedEvent,
        ...(enforcement.anonymized ? enforcement.sanitizedFact : {}),
      }
      const eventId = readString(finalEvent.eventId) || buildFallbackEventId(userId, finalEvent.eventName)
      const ref = db.collection("analytics_event_facts").doc(eventId)
      const snapshot = await ref.get()
      if (snapshot.exists) {
        return {
          eventId,
          status: "deduped",
          anonymized: enforcement.anonymized,
        }
      }

      await ref.set(finalEvent, {merge: false})
      return {
        eventId,
        status: "success",
        anonymized: enforcement.anonymized,
      }
    }))

    return {
      status: "success",
      processed: results.length,
      results,
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
    if (!enforcement.allowed) {
      await db.collection("analytics_dedupe").doc(event.id).set({
        processedAt: FieldValue.serverTimestamp(),
        eventId: event.id,
        timestamp: readNumber(data.timestamp) || Date.now(),
        skippedReason: enforcement.reason || "consent_denied",
      }, {merge: true})
      return
    }
    
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
