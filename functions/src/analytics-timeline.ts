import {onDocumentCreated} from "firebase-functions/v2/firestore"
import {FieldValue} from "firebase-admin/firestore"

import {
  type AnalyticsEventFact,
  readNumber,
  readString,
} from "./analytics-core.js"
import {db} from "./firebase-admin.js"
import {REGION} from "./firebase-runtime.js"

type TimelineSurface = "user" | "guest" | "session" | "drop" | "creator"

const USER_TIMELINE_COLLECTION = "analytics_user_timeline"
const GUEST_TIMELINE_COLLECTION = "analytics_guest_timeline"
const SESSION_TIMELINE_COLLECTION = "analytics_session_timeline"
const DROP_TIMELINE_COLLECTION = "analytics_drop_timeline"
const CREATOR_TIMELINE_COLLECTION = "analytics_creator_timeline"
const STITCH_LINK_COLLECTION = "analytics_timeline_links"
const MAX_STITCH_BACKFILL_EVENTS = 200

function readCreatorId(event: AnalyticsEventFact) {
  const params = event.params && typeof event.params === "object"
    ? event.params as Record<string, unknown>
    : {}

  return readString(params.creator_id)
    || readString(params.creatorId)
    || (readString(params.destinationType) === "creator" ? readString(params.destination) : "")
}

function buildTimelineEntry(input: {
  eventId: string
  data: AnalyticsEventFact
  timestamp: number
  creatorId: string
}) {
  const {eventId, data, timestamp, creatorId} = input
  const sessionId = readString(data.sessionId)
  const userId = readString(data.userId)
  const dropId = readString(data.dropId)
  const watchSeconds = Math.max(
    readNumber(data.watchSeconds),
    readNumber(data.sessionWatchSeconds),
  )

  return {
    eventId,
    eventName: readString(data.eventName),
    timestamp,
    orderingKey: `${String(timestamp).padStart(16, "0")}_${eventId}`,
    pagePath: readString(data.pagePath),
    userId,
    sessionId,
    dropId,
    dropTitle: readString(data.dropTitle),
    dropCategory: readString(data.dropCategory),
    creatorId,
    durationMs: readNumber(data.durationMs),
    watchSeconds,
    sourceTruth: "analytics_event_facts",
    provenanceLabel: "canonical",
    freshnessLabel: "live",
    timelineQuality: "stitched",
    consentMode: readString(data.consentMode) || "unknown",
    authState: userId ? "authenticated" : "guest",
    createdAt: FieldValue.serverTimestamp(),
  }
}

function buildTimelineSummaryPatch(input: {
  scopeKey: string
  surface: TimelineSurface
  timestamp: number
}) {
  return {
    scopeKey: input.scopeKey,
    surface: input.surface,
    eventCount: FieldValue.increment(1),
    latestEventAt: input.timestamp,
    sourceTruth: "analytics_event_facts",
    provenanceLabel: "canonical",
    freshnessLabel: "live",
    orderingStrategy: "timestamp_then_event_id",
    dedupeStrategy: "event_fact_id",
    timelineQuality: "stitched",
    updatedAt: FieldValue.serverTimestamp(),
  }
}

async function backfillGuestSessionIntoUserTimeline(input: {
  userId: string
  sessionId: string
}) {
  const linkRef = db.collection(STITCH_LINK_COLLECTION).doc(input.sessionId)
  const [linkSnapshot, guestEventsSnapshot] = await Promise.all([
    linkRef.get(),
    db.collection(GUEST_TIMELINE_COLLECTION)
      .doc(input.sessionId)
      .collection("events")
      .orderBy("timestamp", "asc")
      .limit(MAX_STITCH_BACKFILL_EVENTS)
      .get(),
  ])

  const existingLink = linkSnapshot.exists ? linkSnapshot.data() as Record<string, unknown> : null
  if (existingLink?.stitchedAt && readString(existingLink.userId) === input.userId) {
    return
  }

  const batch = db.batch()
  guestEventsSnapshot.docs.forEach((doc) => {
    batch.set(
      db.collection(USER_TIMELINE_COLLECTION)
        .doc(input.userId)
        .collection("events")
        .doc(doc.id),
      {
        ...(doc.data() as Record<string, unknown>),
        sessionId: input.sessionId,
        userId: input.userId,
        stitchedFromGuestSession: true,
        stitchLabel: "guest-linked",
        updatedAt: FieldValue.serverTimestamp(),
      },
      {merge: true},
    )
  })

  batch.set(linkRef, {
    sessionId: input.sessionId,
    userId: input.userId,
    stitchedAt: FieldValue.serverTimestamp(),
    latestLinkedAt: FieldValue.serverTimestamp(),
  }, {merge: true})

  if (!guestEventsSnapshot.empty) {
    batch.set(db.collection(USER_TIMELINE_COLLECTION).doc(input.userId), {
      stitchedGuestSessionIds: FieldValue.arrayUnion(input.sessionId),
      stitchedGuestEventCount: FieldValue.increment(guestEventsSnapshot.size),
      updatedAt: FieldValue.serverTimestamp(),
    }, {merge: true})
  }

  await batch.commit()
}

export const onAnalyticsEventFactTimeline = onDocumentCreated(
  {document: "analytics_event_facts/{eventId}", region: REGION},
  async (event) => {
    const data = event.data?.data() as AnalyticsEventFact | undefined
    if (!data) return

    const eventId = event.id
    const timestamp = readNumber(data.timestamp) || Date.now()
    const consentMode = readString(data.consentMode)
    if (consentMode === "denied" || data.globalPrivacyControl === true) {
      return
    }

    const userId = readString(data.userId)
    const sessionId = readString(data.sessionId)
    const dropId = readString(data.dropId)
    const creatorId = readCreatorId(data)
    const eventName = readString(data.eventName)
    if (!eventName) {
      return
    }

    const timelineEntry = buildTimelineEntry({
      eventId,
      data,
      timestamp,
      creatorId,
    })

    const batch = db.batch()

    if (userId) {
      batch.set(
        db.collection(USER_TIMELINE_COLLECTION).doc(userId).collection("events").doc(eventId),
        timelineEntry,
        {merge: true},
      )
      batch.set(
        db.collection(USER_TIMELINE_COLLECTION).doc(userId),
        {
          ...buildTimelineSummaryPatch({
            scopeKey: userId,
            surface: "user",
            timestamp,
          }),
          latestSessionId: sessionId || null,
        },
        {merge: true},
      )
    }

    if (sessionId && !userId) {
      batch.set(
        db.collection(GUEST_TIMELINE_COLLECTION).doc(sessionId).collection("events").doc(eventId),
        timelineEntry,
        {merge: true},
      )
      batch.set(
        db.collection(GUEST_TIMELINE_COLLECTION).doc(sessionId),
        buildTimelineSummaryPatch({
          scopeKey: sessionId,
          surface: "guest",
          timestamp,
        }),
        {merge: true},
      )
    }

    if (sessionId) {
      batch.set(
        db.collection(SESSION_TIMELINE_COLLECTION).doc(sessionId).collection("events").doc(eventId),
        timelineEntry,
        {merge: true},
      )
      batch.set(
        db.collection(SESSION_TIMELINE_COLLECTION).doc(sessionId),
        {
          ...buildTimelineSummaryPatch({
            scopeKey: sessionId,
            surface: "session",
            timestamp,
          }),
          userId: userId || null,
        },
        {merge: true},
      )
    }

    if (dropId) {
      batch.set(
        db.collection(DROP_TIMELINE_COLLECTION).doc(dropId).collection("events").doc(eventId),
        timelineEntry,
        {merge: true},
      )
      batch.set(
        db.collection(DROP_TIMELINE_COLLECTION).doc(dropId),
        buildTimelineSummaryPatch({
          scopeKey: dropId,
          surface: "drop",
          timestamp,
        }),
        {merge: true},
      )
    }

    if (creatorId) {
      batch.set(
        db.collection(CREATOR_TIMELINE_COLLECTION).doc(creatorId).collection("events").doc(eventId),
        timelineEntry,
        {merge: true},
      )
      batch.set(
        db.collection(CREATOR_TIMELINE_COLLECTION).doc(creatorId),
        buildTimelineSummaryPatch({
          scopeKey: creatorId,
          surface: "creator",
          timestamp,
        }),
        {merge: true},
      )
    }

    if (sessionId && userId) {
      batch.set(db.collection(STITCH_LINK_COLLECTION).doc(sessionId), {
        sessionId,
        userId,
        latestLinkedAt: FieldValue.serverTimestamp(),
        sourceTruth: "analytics_event_facts",
      }, {merge: true})
    }

    await batch.commit()

    if (sessionId && userId) {
      await backfillGuestSessionIntoUserTimeline({
        userId,
        sessionId,
      })
    }
  },
)
