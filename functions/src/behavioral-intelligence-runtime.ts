import {FieldValue} from "firebase-admin/firestore"
import {logger} from "firebase-functions"

import {db} from "./firebase-admin.js"
import {readNumber, readString} from "./analytics-core.js"

const USER_PROFILE_COLLECTION = "behavioral_user_profiles"
const GUEST_PROFILE_COLLECTION = "behavioral_guest_profiles"
const DROP_INTELLIGENCE_COLLECTION = "behavioral_drop_intelligence"
const SNAPSHOT_STATUS_COLLECTION = "behavioral_intelligence_status"

const WINDOW_MS = 45 * 24 * 60 * 60 * 1000
const STALE_AFTER_MS = 12 * 60 * 60 * 1000
const RECENT_EVENT_LIMIT = 5000
const RECENT_WATCH_LIMIT = 3000
const RECENT_GUEST_LIMIT = 2000
const RECENT_FEEDBACK_LIMIT = 3000
const MAX_USER_PROFILE_WRITES = 500
const MAX_GUEST_PROFILE_WRITES = 250
const MAX_DROP_PROFILE_WRITES = 500

type DropRecord = Record<string, unknown> & {
  id: string
  creatorId?: string
  title?: string
  type?: string
  tags?: unknown
  validFrom?: number
  validUntil?: number
  status?: string
}

type AnalyticsEventFactRecord = Record<string, unknown>
type WatchSessionRecord = Record<string, unknown>
type GuestBatchRecord = Record<string, unknown>
type FeedbackRecord = Record<string, unknown>
type RelationshipRecord = Record<string, unknown>
type UserRecord = Record<string, unknown>

type UserSignalAggregate = {
  userId: string
  eventCount: number
  watchSessionCount: number
  walletOpenCount: number
  checkoutStartCount: number
  previewOpenCount: number
  viewerOpenCount: number
  unlockCount: number
  repeatViewCount: number
  feedbackCount: number
  positiveFeedbackCount: number
  negativeFeedbackCount: number
  watchSeconds: number[]
  watchScores: number[]
  watchScoreSources: Set<string>
  topCreatorScores: Map<string, number>
  topCategoryScores: Map<string, number>
  topThemeScores: Map<string, number>
  topExperienceScores: Map<string, number>
  recentDropIds: string[]
  recentCreatorIds: string[]
  positiveDropIds: Set<string>
  negativeDropIds: Set<string>
  sessionIds: Set<string>
  uniqueDropIds: Set<string>
  uniqueCreatorIds: Set<string>
  latestEventAtMs: number
  latestWatchAtMs: number
  sourceTimestamps: {
    eventFacts: number[]
    watchSessions: number[]
    relationships: number[]
    feedbacks: number[]
  }
}

type GuestSignalAggregate = {
  sessionKey: string
  eventCount: number
  pagePaths: Set<string>
  previewOpenCount: number
  maxScrollDepth: number
  latestAtMs: number
}

type DropSignalAggregate = {
  dropId: string
  creatorId: string
  dropTitle: string
  dropCategory: string
  validFrom: number
  validUntil: number
  status: string
  impressions: number
  previewOpens: number
  viewerOpens: number
  watchSecondsTotal: number
  watchSecondsSamples: number[]
  watchScores: number[]
  watchScoreSources: Set<string>
  completionCount: number
  unlocks: number
  uniqueViewerIds: Set<string>
  repeatViewerIds: Set<string>
  positiveFeedbackCount: number
  negativeFeedbackCount: number
  latestAtMs: number
  last24hInteractions: number
  last7dInteractions: number
}

type SessionAggregate = {
  sessionKey: string
  userId: string
  firstEventAtMs: number
  firstActionAtMs: number
  secondActionAtMs: number
  unlockAtMs: number
  walletAtMs: number
  dropIds: Set<string>
  actionCount: number
}

function normalizeTags(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[]
  }

  return value
    .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    .map((entry) => entry.trim().slice(0, 60))
    .slice(0, 10)
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.max(0, Math.min(1, value))
}

function round(value: number, digits = 4) {
  if (!Number.isFinite(value)) {
    return 0
  }

  const multiplier = 10 ** digits
  return Math.round((value + Number.EPSILON) * multiplier) / multiplier
}

function median(values: number[]) {
  if (values.length === 0) {
    return 0
  }

  const sorted = [...values].sort((left, right) => left - right)
  const midpoint = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? round((sorted[midpoint - 1] + sorted[midpoint]) / 2, 2)
    : round(sorted[midpoint], 2)
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0
  }

  return round(values.reduce((sum, value) => sum + value, 0) / values.length, 2)
}

function topEntries(map: Map<string, number>, limit: number) {
  return Array.from(map.entries())
    .map(([key, score]) => ({key, score: round(score)}))
    .sort((left, right) => right.score - left.score || left.key.localeCompare(right.key))
    .slice(0, limit)
}

function readMillis(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (
    value
    && typeof value === "object"
    && "toMillis" in value
    && typeof (value as {toMillis: () => number}).toMillis === "function"
  ) {
    return (value as {toMillis: () => number}).toMillis()
  }

  return 0
}

function pushLimited(list: string[], value: string, limit = 16) {
  if (!value || list.includes(value)) {
    return
  }

  list.unshift(value)
  if (list.length > limit) {
    list.length = limit
  }
}

function scoreMapIncrement(map: Map<string, number>, key: string, amount: number) {
  if (!key || !Number.isFinite(amount) || amount <= 0) {
    return
  }

  map.set(key, round((map.get(key) || 0) + amount))
}

function deriveExperienceKey(input: {
  eventName: string
  pagePath: string
}) {
  const eventName = input.eventName.toLowerCase()
  const pagePath = input.pagePath.toLowerCase()

  if (eventName.includes("wallet") || pagePath.includes("/wallet")) {
    return "wallet"
  }
  if (eventName.includes("support") || pagePath.includes("/support")) {
    return "support"
  }
  if (eventName.includes("creator") || pagePath.includes("/creator")) {
    return "creator"
  }
  if (eventName.includes("experience") || pagePath.includes("/experiences")) {
    return "experience_hub"
  }
  if (eventName.includes("viewer") || pagePath.includes("/viewer")) {
    return "viewer"
  }
  if (eventName.includes("chat") || eventName.includes("message") || pagePath.includes("/messages")) {
    return "chat"
  }
  if (pagePath.includes("/drops")) {
    return "drops"
  }
  if (pagePath.includes("/dashboard")) {
    return "dashboard"
  }

  return "general"
}

function normalizeProfileFreshness(updatedAtMs: number, nowMs: number) {
  return nowMs - updatedAtMs <= STALE_AFTER_MS ? "live" : "stale"
}

function ensureUserAggregate(userId: string, store: Map<string, UserSignalAggregate>) {
  const existing = store.get(userId)
  if (existing) {
    return existing
  }

  const created: UserSignalAggregate = {
    userId,
    eventCount: 0,
    watchSessionCount: 0,
    walletOpenCount: 0,
    checkoutStartCount: 0,
    previewOpenCount: 0,
    viewerOpenCount: 0,
    unlockCount: 0,
    repeatViewCount: 0,
    feedbackCount: 0,
    positiveFeedbackCount: 0,
    negativeFeedbackCount: 0,
    watchSeconds: [],
    watchScores: [],
    watchScoreSources: new Set(),
    topCreatorScores: new Map(),
    topCategoryScores: new Map(),
    topThemeScores: new Map(),
    topExperienceScores: new Map(),
    recentDropIds: [],
    recentCreatorIds: [],
    positiveDropIds: new Set(),
    negativeDropIds: new Set(),
    sessionIds: new Set(),
    uniqueDropIds: new Set(),
    uniqueCreatorIds: new Set(),
    latestEventAtMs: 0,
    latestWatchAtMs: 0,
    sourceTimestamps: {
      eventFacts: [],
      watchSessions: [],
      relationships: [],
      feedbacks: [],
    },
  }

  store.set(userId, created)
  return created
}

function ensureGuestAggregate(sessionKey: string, store: Map<string, GuestSignalAggregate>) {
  const existing = store.get(sessionKey)
  if (existing) {
    return existing
  }

  const created: GuestSignalAggregate = {
    sessionKey,
    eventCount: 0,
    pagePaths: new Set(),
    previewOpenCount: 0,
    maxScrollDepth: 0,
    latestAtMs: 0,
  }
  store.set(sessionKey, created)
  return created
}

function ensureDropAggregate(drop: DropRecord, store: Map<string, DropSignalAggregate>) {
  const existing = store.get(drop.id)
  if (existing) {
    return existing
  }

  const created: DropSignalAggregate = {
    dropId: drop.id,
    creatorId: readString(drop.creatorId),
    dropTitle: readString(drop.title),
    dropCategory: readString(drop.type),
    validFrom: readNumber(drop.validFrom),
    validUntil: readNumber(drop.validUntil),
    status: readString(drop.status) || "unknown",
    impressions: 0,
    previewOpens: 0,
    viewerOpens: 0,
    watchSecondsTotal: 0,
    watchSecondsSamples: [],
    watchScores: [],
    watchScoreSources: new Set(),
    completionCount: 0,
    unlocks: 0,
    uniqueViewerIds: new Set(),
    repeatViewerIds: new Set(),
    positiveFeedbackCount: 0,
    negativeFeedbackCount: 0,
    latestAtMs: 0,
    last24hInteractions: 0,
    last7dInteractions: 0,
  }
  store.set(drop.id, created)
  return created
}

function isActionEvent(eventName: string) {
  return ![
    "drop_card_impression",
    "home_page_viewed",
    "drops_page_viewed",
    "dashboard_viewed",
    "library_viewed",
    "semantic_page_viewed",
    "semantic_page_passive",
  ].includes(eventName)
}

async function readRecentCollections(nowMs: number) {
  const windowStartMs = nowMs - WINDOW_MS

  const [
    dropsSnapshot,
    eventFactsSnapshot,
    watchSessionsSnapshot,
    guestBatchesSnapshot,
    feedbackSnapshot,
    relationshipsSnapshot,
  ] = await Promise.all([
    db.collection("drops").get(),
    db.collection("analytics_event_facts")
      .where("timestamp", ">=", windowStartMs)
      .orderBy("timestamp", "desc")
      .limit(RECENT_EVENT_LIMIT)
      .get(),
    db.collection("analytics_watch_sessions")
      .where("lastSeenAtMs", ">=", windowStartMs)
      .orderBy("lastSeenAtMs", "desc")
      .limit(RECENT_WATCH_LIMIT)
      .get(),
    db.collection("analytics_guest_batches")
      .where("receivedAtMs", ">=", windowStartMs)
      .orderBy("receivedAtMs", "desc")
      .limit(RECENT_GUEST_LIMIT)
      .get(),
    db.collection("feedbacks")
      .orderBy("createdAt", "desc")
      .limit(RECENT_FEEDBACK_LIMIT)
      .get(),
    db.collection("creator_relationships").get(),
  ])

  return {
    windowStartMs,
    drops: dropsSnapshot.docs.map((doc) => ({id: doc.id, ...(doc.data() as Record<string, unknown>)})),
    eventFacts: eventFactsSnapshot.docs.map((doc) => ({id: doc.id, ...(doc.data() as Record<string, unknown>)})),
    watchSessions: watchSessionsSnapshot.docs.map((doc) => ({id: doc.id, ...(doc.data() as Record<string, unknown>)})),
    guestBatches: guestBatchesSnapshot.docs.map((doc) => ({id: doc.id, ...(doc.data() as Record<string, unknown>)})),
    feedbacks: feedbackSnapshot.docs.map((doc) => ({id: doc.id, ...(doc.data() as Record<string, unknown>)})),
    relationships: relationshipsSnapshot.docs.map((doc) => ({id: doc.id, ...(doc.data() as Record<string, unknown>)})),
  }
}

async function readUserRecords(userIds: string[]) {
  if (userIds.length === 0) {
    return new Map<string, UserRecord>()
  }

  const refs = userIds.map((userId) => db.collection("users").doc(userId))
  const records = await db.getAll(...refs)
  const users = new Map<string, UserRecord>()

  records.forEach((snapshot) => {
    if (snapshot.exists) {
      users.set(snapshot.id, snapshot.data() as UserRecord)
    }
  })

  return users
}

function buildAggregates(input: Awaited<ReturnType<typeof readRecentCollections>>, nowMs: number) {
  const dropMap = new Map<string, DropRecord>()
  const userAggregates = new Map<string, UserSignalAggregate>()
  const guestAggregates = new Map<string, GuestSignalAggregate>()
  const dropAggregates = new Map<string, DropSignalAggregate>()
  const sessionAggregates = new Map<string, SessionAggregate>()

  input.drops.forEach((drop) => {
    const normalized = drop as DropRecord
    dropMap.set(normalized.id, normalized)
    ensureDropAggregate(normalized, dropAggregates)
  })

  input.eventFacts.forEach((record) => {
    const event = record as AnalyticsEventFactRecord
    const eventName = readString(event.eventName)
    const userId = readString(event.userId)
    const sessionId = readString(event.sessionId)
    const dropId = readString(event.dropId)
    const timestamp = readNumber(event.timestamp) || nowMs
    const drop = dropId ? dropMap.get(dropId) : undefined
    const creatorId = drop ? readString(drop.creatorId) : ""
    const category = drop ? readString(drop.type) : readString(event.dropCategory)
    const tags = drop ? normalizeTags(drop.tags) : []
    const pagePath = readString(event.pagePath)
    const experienceKey = deriveExperienceKey({
      eventName,
      pagePath,
    })

    if (drop && dropId) {
      const dropAggregate = ensureDropAggregate(drop, dropAggregates)
      if (eventName === "drop_card_impression") {
        dropAggregate.impressions += 1
      }
      if (eventName === "drop_preview_opened" || eventName === "view_drop_details") {
        dropAggregate.previewOpens += 1
      }
      if (eventName === "viewer_opened" || eventName === "viewer_session_started") {
        dropAggregate.viewerOpens += 1
      }
      if (eventName === "unlock_drop_success") {
        dropAggregate.unlocks += 1
      }
      if (timestamp >= nowMs - (24 * 60 * 60 * 1000)) {
        dropAggregate.last24hInteractions += 1
      }
      if (timestamp >= nowMs - (7 * 24 * 60 * 60 * 1000)) {
        dropAggregate.last7dInteractions += 1
      }
      dropAggregate.latestAtMs = Math.max(dropAggregate.latestAtMs, timestamp)
    }

    if (!userId) {
      return
    }

    const aggregate = ensureUserAggregate(userId, userAggregates)
    aggregate.eventCount += 1
    aggregate.latestEventAtMs = Math.max(aggregate.latestEventAtMs, timestamp)
    aggregate.sourceTimestamps.eventFacts.push(timestamp)

    if (sessionId) {
      aggregate.sessionIds.add(sessionId)
      const existingSession = sessionAggregates.get(sessionId) ?? {
        sessionKey: sessionId,
        userId,
        firstEventAtMs: timestamp,
        firstActionAtMs: 0,
        secondActionAtMs: 0,
        unlockAtMs: 0,
        walletAtMs: 0,
        dropIds: new Set<string>(),
        actionCount: 0,
      }
      existingSession.firstEventAtMs = Math.min(existingSession.firstEventAtMs, timestamp)
      if (dropId) {
        existingSession.dropIds.add(dropId)
      }
      if (isActionEvent(eventName)) {
        existingSession.actionCount += 1
        if (existingSession.firstActionAtMs === 0) {
          existingSession.firstActionAtMs = timestamp
        } else if (existingSession.secondActionAtMs === 0) {
          existingSession.secondActionAtMs = timestamp
        }
      }
      if (eventName === "wallet_opened" && existingSession.walletAtMs === 0) {
        existingSession.walletAtMs = timestamp
      }
      if (eventName === "unlock_drop_success" && existingSession.unlockAtMs === 0) {
        existingSession.unlockAtMs = timestamp
      }
      sessionAggregates.set(sessionId, existingSession)
    }

    if (eventName === "wallet_opened") {
      aggregate.walletOpenCount += 1
    }
    if (eventName === "begin_checkout") {
      aggregate.checkoutStartCount += 1
    }
    if (eventName === "drop_preview_opened" || eventName === "view_drop_details") {
      aggregate.previewOpenCount += 1
    }
    if (eventName === "viewer_opened" || eventName === "viewer_session_started") {
      aggregate.viewerOpenCount += 1
    }
    if (eventName === "unlock_drop_success") {
      aggregate.unlockCount += 1
    }

    if (dropId) {
      aggregate.uniqueDropIds.add(dropId)
      pushLimited(aggregate.recentDropIds, dropId)
    }
    if (creatorId) {
      aggregate.uniqueCreatorIds.add(creatorId)
      pushLimited(aggregate.recentCreatorIds, creatorId)
      scoreMapIncrement(aggregate.topCreatorScores, creatorId, eventName === "unlock_drop_success" ? 2.5 : 0.35)
    }
    if (category) {
      scoreMapIncrement(aggregate.topCategoryScores, category, eventName === "unlock_drop_success" ? 2 : 0.25)
    }
    tags.forEach((tag) => scoreMapIncrement(aggregate.topThemeScores, tag, eventName === "unlock_drop_success" ? 1.2 : 0.18))
    scoreMapIncrement(
      aggregate.topExperienceScores,
      experienceKey,
      isActionEvent(eventName) ? 0.45 : 0.15,
    )
  })

  input.watchSessions.forEach((record) => {
    const session = record as WatchSessionRecord
    const userId = readString(session.userId)
    const dropId = readString(session.dropId)
    const watchedAtMs = readNumber(session.lastSeenAtMs) || nowMs
    const validWatchSeconds = readNumber(session.validWatchMs) / 1000
    const totalWatchSeconds = Math.max(
      validWatchSeconds,
      readNumber(session.totalActiveSeconds),
      readNumber(session.totalWatchSeconds),
      readNumber(session.maxAssetWatchSeconds),
    )
    const watchScore = readNumber(session.watchScore)
    const watchScoreSource = readString(session.watchScoreSource) || "watch_session_rollup"

    if (dropId && dropMap.has(dropId)) {
      const dropAggregate = ensureDropAggregate(dropMap.get(dropId) as DropRecord, dropAggregates)
      dropAggregate.watchSecondsTotal += totalWatchSeconds
      if (totalWatchSeconds > 0) {
        dropAggregate.watchSecondsSamples.push(totalWatchSeconds)
      }
      if (watchScore > 0) {
        dropAggregate.watchScores.push(watchScore)
      }
      dropAggregate.watchScoreSources.add(watchScoreSource)
      if (session.completedSession === true || readString(session.sessionOutcome) === "completed") {
        dropAggregate.completionCount += 1
      }
      if (userId) {
        if (dropAggregate.uniqueViewerIds.has(userId)) {
          dropAggregate.repeatViewerIds.add(userId)
        }
        dropAggregate.uniqueViewerIds.add(userId)
      }
      dropAggregate.latestAtMs = Math.max(dropAggregate.latestAtMs, watchedAtMs)
    }

    if (!userId) {
      return
    }

    const aggregate = ensureUserAggregate(userId, userAggregates)
    aggregate.watchSessionCount += 1
    aggregate.latestWatchAtMs = Math.max(aggregate.latestWatchAtMs, watchedAtMs)
    aggregate.sourceTimestamps.watchSessions.push(watchedAtMs)
    if (totalWatchSeconds > 0) {
      aggregate.watchSeconds.push(totalWatchSeconds)
    }
    if (watchScore > 0) {
      aggregate.watchScores.push(watchScore)
    }
    aggregate.watchScoreSources.add(watchScoreSource)
    if (dropId) {
      if (aggregate.uniqueDropIds.has(dropId)) {
        aggregate.repeatViewCount += 1
      }
      aggregate.uniqueDropIds.add(dropId)
      pushLimited(aggregate.recentDropIds, dropId)
    }

    const drop = dropId ? dropMap.get(dropId) : undefined
    if (drop) {
      const creatorId = readString(drop.creatorId)
      const category = readString(drop.type)
      if (creatorId) {
        aggregate.uniqueCreatorIds.add(creatorId)
        scoreMapIncrement(aggregate.topCreatorScores, creatorId, Math.min(3, totalWatchSeconds / 20))
      }
      if (category) {
        scoreMapIncrement(aggregate.topCategoryScores, category, Math.min(2.2, totalWatchSeconds / 30))
      }
      normalizeTags(drop.tags).forEach((tag) => scoreMapIncrement(aggregate.topThemeScores, tag, Math.min(1.2, totalWatchSeconds / 45)))
    }
  })

  input.feedbacks.forEach((record) => {
    const feedback = record as FeedbackRecord
    const userId = readString(feedback.userId)
    const dropId = readString(feedback.dropId)
    const positive = feedback.positive === true
    const createdAtMs = readMillis(feedback.createdAt) || nowMs

    if (dropId && dropMap.has(dropId)) {
      const dropAggregate = ensureDropAggregate(dropMap.get(dropId) as DropRecord, dropAggregates)
      if (positive) {
        dropAggregate.positiveFeedbackCount += 1
      } else {
        dropAggregate.negativeFeedbackCount += 1
      }
      dropAggregate.latestAtMs = Math.max(dropAggregate.latestAtMs, createdAtMs)
    }

    if (!userId) {
      return
    }

    const aggregate = ensureUserAggregate(userId, userAggregates)
    aggregate.feedbackCount += 1
    aggregate.sourceTimestamps.feedbacks.push(createdAtMs)
    if (positive) {
      aggregate.positiveFeedbackCount += 1
      if (dropId) {
        aggregate.positiveDropIds.add(dropId)
      }
    } else {
      aggregate.negativeFeedbackCount += 1
      if (dropId) {
        aggregate.negativeDropIds.add(dropId)
      }
    }
  })

  input.relationships.forEach((record) => {
    const relationship = record as RelationshipRecord
    const userId = readString(relationship.userId)
    const creatorId = readString(relationship.creatorId)
    if (!userId || !creatorId) {
      return
    }

    const aggregate = ensureUserAggregate(userId, userAggregates)
    const updatedAtMs = readMillis(relationship.updatedAt) || nowMs
    aggregate.sourceTimestamps.relationships.push(updatedAtMs)
    if (relationship.following === true) {
      scoreMapIncrement(aggregate.topCreatorScores, creatorId, 4)
      aggregate.uniqueCreatorIds.add(creatorId)
    }
    if (relationship.notificationsEnabled === true) {
      scoreMapIncrement(aggregate.topCreatorScores, creatorId, 1.2)
    }
  })

  input.guestBatches.forEach((record) => {
    const batch = record as GuestBatchRecord
    const sessionKey = readString(batch.sessionKey)
    if (!sessionKey) {
      return
    }

    const aggregate = ensureGuestAggregate(sessionKey, guestAggregates)
    const receivedAtMs = readNumber(batch.receivedAtMs) || nowMs
    aggregate.eventCount += Math.max(1, readNumber(batch.eventCount))
    aggregate.latestAtMs = Math.max(aggregate.latestAtMs, receivedAtMs)
    aggregate.maxScrollDepth = Math.max(aggregate.maxScrollDepth, readNumber(batch.maxScrollDepth))
    const pagePaths = Array.isArray(batch.pagePaths)
      ? batch.pagePaths.filter((value): value is string => typeof value === "string")
      : []
    pagePaths.forEach((path) => aggregate.pagePaths.add(path))
    const events = Array.isArray(batch.events) ? batch.events as Array<Record<string, unknown>> : []
    events.forEach((event) => {
      if (readString(event.targetId) === "drop_preview" || readString(event.targetText).toLowerCase().includes("preview")) {
        aggregate.previewOpenCount += 1
      }
    })
  })

  return {
    userAggregates,
    guestAggregates,
    dropAggregates,
    sessionAggregates,
  }
}

function buildUserProfileDoc(input: {
  aggregate: UserSignalAggregate
  sessionAggregates: Map<string, SessionAggregate>
  userRecord: UserRecord | undefined
  nowMs: number
  windowStartMs: number
}) {
  const sessionRecords = Array.from(input.sessionAggregates.values())
    .filter((session) => session.userId === input.aggregate.userId)
  const privacySettings = (input.userRecord?.privacySettings ?? {}) as Record<string, unknown>
  const anonymousEnabled = privacySettings.anonymousAnalyticsEnabled === true
  const identifiedEnabled = privacySettings.identifiedAnalyticsEnabled === true
  const recommendationsEnabled = privacySettings.allowRecommendations === true && identifiedEnabled
  const gpcBlocked = privacySettings.honorGlobalPrivacyControl !== false && privacySettings.globalPrivacyControl === true

  const timeToFirstActionMs = average(sessionRecords.map((session) => Math.max(0, session.firstActionAtMs - session.firstEventAtMs)).filter((value) => value > 0))
  const timeToSecondActionMs = average(sessionRecords.map((session) => Math.max(0, session.secondActionAtMs - session.firstEventAtMs)).filter((value) => value > 0))
  const timeToUnlockMs = average(sessionRecords.map((session) => Math.max(0, session.unlockAtMs - session.firstEventAtMs)).filter((value) => value > 0))
  const timeToWalletOpenMs = average(sessionRecords.map((session) => Math.max(0, session.walletAtMs - session.firstEventAtMs)).filter((value) => value > 0))
  const averageSessionDepth = average(sessionRecords.map((session) => session.dropIds.size))
  const sessionFrequency30d = sessionRecords.filter((session) => session.firstEventAtMs >= input.nowMs - (30 * 24 * 60 * 60 * 1000)).length
  const averageWatchSeconds = average(input.aggregate.watchSeconds)
  const medianWatchSeconds = median(input.aggregate.watchSeconds)
  const watchScoreSource = input.aggregate.watchSessionCount > 0
    ? (input.aggregate.watchScoreSources.has("watch_session_rollup") ? "watch_session_rollup" : Array.from(input.aggregate.watchScoreSources)[0] || "watch_session_rollup")
    : "legacy_page_duration"
  const watchScoreConfidence = watchScoreSource === "watch_session_rollup" ? "high" : "low"
  const completionPropensity = clamp01(input.aggregate.watchSessionCount === 0 ? 0 : input.aggregate.repeatViewCount / Math.max(1, input.aggregate.watchSessionCount))
  const unlockPropensity = clamp01(input.aggregate.viewerOpenCount === 0 ? 0 : input.aggregate.unlockCount / Math.max(1, input.aggregate.viewerOpenCount))
  const previewToOpenConversion = clamp01(input.aggregate.previewOpenCount === 0 ? 0 : input.aggregate.viewerOpenCount / Math.max(1, input.aggregate.previewOpenCount))
  const viewerToUnlockConversion = clamp01(input.aggregate.viewerOpenCount === 0 ? 0 : input.aggregate.unlockCount / Math.max(1, input.aggregate.viewerOpenCount))
  const walletOpenPropensity = clamp01(input.aggregate.eventCount === 0 ? 0 : input.aggregate.walletOpenCount / Math.max(1, input.aggregate.eventCount))
  const repeatConsumptionRate = clamp01(input.aggregate.viewerOpenCount === 0 ? 0 : input.aggregate.repeatViewCount / Math.max(1, input.aggregate.viewerOpenCount))
  const loyaltyScore = clamp01((topEntries(input.aggregate.topCreatorScores, 1)[0]?.score || 0) / Math.max(1, input.aggregate.eventCount / 5))
  const explorationScore = clamp01(input.aggregate.uniqueCreatorIds.size === 0 ? 0 : input.aggregate.uniqueCreatorIds.size / Math.max(1, input.aggregate.viewerOpenCount))
  const fatigueScore = clamp01(repeatConsumptionRate * 0.65 + (input.aggregate.negativeFeedbackCount > 0 ? 0.35 : 0))
  const latestSourceAtMs = Math.max(input.aggregate.latestEventAtMs, input.aggregate.latestWatchAtMs)

  return {
    userId: input.aggregate.userId,
    updatedAtMs: input.nowMs,
    sourceWindowStartMs: input.windowStartMs,
    latestSourceAtMs,
    freshnessLabel: normalizeProfileFreshness(latestSourceAtMs || input.nowMs, input.nowMs),
    recommendationState: recommendationsEnabled && !gpcBlocked ? "profile-driven" : "deterministic-fallback",
    profilingEligibility: {
      anonymousAnalyticsEnabled: anonymousEnabled,
      identifiedAnalyticsEnabled: identifiedEnabled,
      allowRecommendations: recommendationsEnabled,
      gpcBlocked,
      eligible: recommendationsEnabled && !gpcBlocked,
    },
    topCreators: topEntries(input.aggregate.topCreatorScores, 8),
    topCategories: topEntries(input.aggregate.topCategoryScores, 8),
    topThemes: topEntries(input.aggregate.topThemeScores, 8),
    topExperiences: topEntries(input.aggregate.topExperienceScores, 8),
    creatorAffinity: Object.fromEntries(topEntries(input.aggregate.topCreatorScores, 12).map((entry) => [entry.key, entry.score])),
    categoryAffinity: Object.fromEntries(topEntries(input.aggregate.topCategoryScores, 12).map((entry) => [entry.key, entry.score])),
    themeAffinity: Object.fromEntries(topEntries(input.aggregate.topThemeScores, 12).map((entry) => [entry.key, entry.score])),
    experiencePreferenceScores: Object.fromEntries(topEntries(input.aggregate.topExperienceScores, 12).map((entry) => [entry.key, entry.score])),
    sessionRecencyHours: latestSourceAtMs > 0 ? round((input.nowMs - latestSourceAtMs) / (60 * 60 * 1000), 2) : null,
    sessionFrequency30d,
    averageSessionDepth,
    averageWatchSeconds,
    medianWatchSeconds,
    averageWatchScore: average(input.aggregate.watchScores),
    watchScoreSource,
    watchScoreConfidence,
    completionPropensity,
    unlockPropensity,
    walletOpenPropensity,
    previewToOpenConversion,
    viewerToUnlockConversion,
    repeatConsumptionRate,
    fatigueScore,
    fatigueState: fatigueScore >= 0.7 ? "high" : fatigueScore >= 0.35 ? "medium" : "low",
    refundRiskIndicator: clamp01((input.aggregate.negativeFeedbackCount * 0.6) + (fatigueScore * 0.4)),
    explorationScore,
    loyaltyScore,
    freshnessSensitivity: clamp01(input.aggregate.unlockCount === 0 ? 0.45 : input.aggregate.unlockCount / Math.max(1, input.aggregate.uniqueDropIds.size)),
    timeToFirstActionMs,
    timeToSecondActionMs,
    timeToUnlockMs,
    timeToWalletOpenMs,
    recentDropIds: input.aggregate.recentDropIds,
    recentCreatorIds: input.aggregate.recentCreatorIds,
    positiveDropIds: Array.from(input.aggregate.positiveDropIds),
    negativeDropIds: Array.from(input.aggregate.negativeDropIds),
    eventCount: input.aggregate.eventCount,
    watchSessionCount: input.aggregate.watchSessionCount,
    uniqueDropCount: input.aggregate.uniqueDropIds.size,
    uniqueCreatorCount: input.aggregate.uniqueCreatorIds.size,
    provenance: {
      eventFacts: {
        count: input.aggregate.sourceTimestamps.eventFacts.length,
        latestAtMs: Math.max(0, ...input.aggregate.sourceTimestamps.eventFacts),
      },
      watchSessions: {
        count: input.aggregate.sourceTimestamps.watchSessions.length,
        latestAtMs: Math.max(0, ...input.aggregate.sourceTimestamps.watchSessions),
      },
      relationships: {
        count: input.aggregate.sourceTimestamps.relationships.length,
        latestAtMs: Math.max(0, ...input.aggregate.sourceTimestamps.relationships),
      },
      feedbacks: {
        count: input.aggregate.sourceTimestamps.feedbacks.length,
        latestAtMs: Math.max(0, ...input.aggregate.sourceTimestamps.feedbacks),
      },
    },
  }
}

function buildGuestProfileDoc(aggregate: GuestSignalAggregate, nowMs: number, windowStartMs: number) {
  return {
    sessionKey: aggregate.sessionKey,
    updatedAtMs: nowMs,
    sourceWindowStartMs: windowStartMs,
    latestSourceAtMs: aggregate.latestAtMs,
    freshnessLabel: normalizeProfileFreshness(aggregate.latestAtMs || nowMs, nowMs),
    recommendationState: "deterministic-fallback",
    eventCount: aggregate.eventCount,
    previewOpenCount: aggregate.previewOpenCount,
    maxScrollDepth: round(aggregate.maxScrollDepth, 2),
    pagePaths: Array.from(aggregate.pagePaths).slice(0, 12),
  }
}

function buildDropDoc(aggregate: DropSignalAggregate, nowMs: number, windowStartMs: number) {
  const uniqueViewers = aggregate.uniqueViewerIds.size
  const repeatViewers = aggregate.repeatViewerIds.size
  const feedbackCount = aggregate.positiveFeedbackCount + aggregate.negativeFeedbackCount
  const ageDays = aggregate.validFrom > 0 ? Math.max(0, (nowMs - aggregate.validFrom) / (24 * 60 * 60 * 1000)) : 0
  const watchScoreSource = aggregate.watchSecondsSamples.length > 0
    ? (aggregate.watchScoreSources.has("watch_session_rollup") ? "watch_session_rollup" : Array.from(aggregate.watchScoreSources)[0] || "watch_session_rollup")
    : "legacy_page_duration"
  return {
    dropId: aggregate.dropId,
    creatorId: aggregate.creatorId,
    dropTitle: aggregate.dropTitle,
    dropCategory: aggregate.dropCategory,
    validFrom: aggregate.validFrom,
    validUntil: aggregate.validUntil,
    status: aggregate.status,
    updatedAtMs: nowMs,
    sourceWindowStartMs: windowStartMs,
    latestSourceAtMs: aggregate.latestAtMs,
    freshnessLabel: normalizeProfileFreshness(aggregate.latestAtMs || nowMs, nowMs),
    impressions: aggregate.impressions,
    previewOpens: aggregate.previewOpens,
    viewerOpens: aggregate.viewerOpens,
    watchSecondsTotal: round(aggregate.watchSecondsTotal, 2),
    averageWatchSeconds: average(aggregate.watchSecondsSamples),
    medianWatchSeconds: median(aggregate.watchSecondsSamples),
    averageWatchScore: average(aggregate.watchScores),
    watchScoreSource,
    watchScoreConfidence: watchScoreSource === "watch_session_rollup" ? "high" : "low",
    completionRate: clamp01(aggregate.viewerOpens === 0 ? 0 : aggregate.completionCount / Math.max(1, aggregate.viewerOpens)),
    uniqueViewers,
    repeatViewers,
    repeatViewerRate: clamp01(uniqueViewers === 0 ? 0 : repeatViewers / Math.max(1, uniqueViewers)),
    unlocks: aggregate.unlocks,
    previewToViewerRate: clamp01(aggregate.previewOpens === 0 ? 0 : aggregate.viewerOpens / Math.max(1, aggregate.previewOpens)),
    viewerToUnlockRate: clamp01(aggregate.viewerOpens === 0 ? 0 : aggregate.unlocks / Math.max(1, aggregate.viewerOpens)),
    positiveFeedbackCount: aggregate.positiveFeedbackCount,
    negativeFeedbackCount: aggregate.negativeFeedbackCount,
    negativeSignalRate: clamp01(feedbackCount === 0 ? 0 : aggregate.negativeFeedbackCount / feedbackCount),
    freshnessDecayScore: clamp01(1 - (ageDays / 30)),
    timeWindowPerformance: {
      last24hInteractions: aggregate.last24hInteractions,
      last7dInteractions: aggregate.last7dInteractions,
    },
    confidenceScore: clamp01((aggregate.viewerOpens + aggregate.previewOpens + aggregate.unlocks) / 50),
    provenance: {
      watchSamples: aggregate.watchSecondsSamples.length,
      feedbackCount,
    },
  }
}

async function writeSnapshotDocs(input: {
  userDocs: ReturnType<typeof buildUserProfileDoc>[]
  guestDocs: ReturnType<typeof buildGuestProfileDoc>[]
  dropDocs: ReturnType<typeof buildDropDoc>[]
  nowMs: number
  windowStartMs: number
}) {
  let batch = db.batch()
  let operationCount = 0

  const commitIfNeeded = async () => {
    if (operationCount === 0) {
      return
    }
    await batch.commit()
    batch = db.batch()
    operationCount = 0
  }

  for (const doc of input.userDocs.slice(0, MAX_USER_PROFILE_WRITES)) {
    batch.set(db.collection(USER_PROFILE_COLLECTION).doc(doc.userId), {
      ...doc,
      updatedAt: FieldValue.serverTimestamp(),
    }, {merge: true})
    operationCount += 1
    if (operationCount >= 400) {
      await commitIfNeeded()
    }
  }

  for (const doc of input.guestDocs.slice(0, MAX_GUEST_PROFILE_WRITES)) {
    batch.set(db.collection(GUEST_PROFILE_COLLECTION).doc(doc.sessionKey), {
      ...doc,
      updatedAt: FieldValue.serverTimestamp(),
    }, {merge: true})
    operationCount += 1
    if (operationCount >= 400) {
      await commitIfNeeded()
    }
  }

  for (const doc of input.dropDocs.slice(0, MAX_DROP_PROFILE_WRITES)) {
    batch.set(db.collection(DROP_INTELLIGENCE_COLLECTION).doc(doc.dropId), {
      ...doc,
      updatedAt: FieldValue.serverTimestamp(),
    }, {merge: true})
    operationCount += 1
    if (operationCount >= 400) {
      await commitIfNeeded()
    }
  }

  batch.set(db.collection(SNAPSHOT_STATUS_COLLECTION).doc("summary"), {
    updatedAtMs: input.nowMs,
    sourceWindowStartMs: input.windowStartMs,
    userProfileCount: input.userDocs.length,
    guestProfileCount: input.guestDocs.length,
    dropProfileCount: input.dropDocs.length,
    ownership: {
      canonicalEventIngest: "analytics_event_facts",
      guestIngest: "analytics_guest_batches",
      timelineLayer: "analytics_*_timeline",
      profileServing: USER_PROFILE_COLLECTION,
      guestProfileServing: GUEST_PROFILE_COLLECTION,
      dropIntelligenceServing: DROP_INTELLIGENCE_COLLECTION,
      coldHistory: "firestore canonical analytics collections",
      futureMlInputs: "behavioral_* snapshots",
    },
    freshnessLabel: normalizeProfileFreshness(input.nowMs, input.nowMs),
    updatedAt: FieldValue.serverTimestamp(),
  }, {merge: true})
  operationCount += 1
  await commitIfNeeded()
}

export async function rebuildBehavioralIntelligenceSnapshots() {
  const nowMs = Date.now()
  const recent = await readRecentCollections(nowMs)
  const aggregates = buildAggregates(recent, nowMs)
  const userIds = Array.from(aggregates.userAggregates.keys())
  const userRecords = await readUserRecords(userIds)

  const userDocs = userIds.map((userId) => buildUserProfileDoc({
    aggregate: aggregates.userAggregates.get(userId) as UserSignalAggregate,
    sessionAggregates: aggregates.sessionAggregates,
    userRecord: userRecords.get(userId),
    nowMs,
    windowStartMs: recent.windowStartMs,
  }))
  const guestDocs = Array.from(aggregates.guestAggregates.values())
    .sort((left, right) => right.latestAtMs - left.latestAtMs)
    .map((aggregate) => buildGuestProfileDoc(aggregate, nowMs, recent.windowStartMs))
  const dropDocs = Array.from(aggregates.dropAggregates.values())
    .map((aggregate) => buildDropDoc(aggregate, nowMs, recent.windowStartMs))
    .sort((left, right) => right.viewerOpens - left.viewerOpens || right.previewOpens - left.previewOpens)

  await writeSnapshotDocs({
    userDocs,
    guestDocs,
    dropDocs,
    nowMs,
    windowStartMs: recent.windowStartMs,
  })

  const summary = {
    userProfiles: userDocs.length,
    guestProfiles: guestDocs.length,
    dropIntelligenceRows: dropDocs.length,
    sourceWindowStartMs: recent.windowStartMs,
    updatedAtMs: nowMs,
  }

  logger.info("[Behavioral Intelligence] snapshot rebuild completed", summary)
  return summary
}
