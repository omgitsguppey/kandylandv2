import {logger} from "firebase-functions"
import {FieldValue, type QueryDocumentSnapshot} from "firebase-admin/firestore"
import {onSchedule} from "firebase-functions/v2/scheduler"

import {db} from "./firebase-admin.js"
import {REGION} from "./firebase-runtime.js"
import {average, readBoolean, readNumber, readString} from "./analytics-core.js"

const REALTIME_WINDOW_MS = 30 * 60 * 1000
const HOT_SUMMARY_DOC_ID = "realtime_summary"
const ACTIVE_USER_LIMIT = 1000
const EVENT_FACT_LIMIT = 1000
const GUEST_BATCH_LIMIT = 500
const WATCH_SESSION_LIMIT = 500
const WATCH_ASSET_LIMIT = 500

const PAGE_VIEW_EVENT_NAMES = new Set([
  "dashboard_viewed",
  "library_viewed",
  "profile_settings_viewed",
  "experience_hub_viewed",
  "drops_page_viewed",
  "faq_page_viewed",
  "home_page_viewed",
  "privacy_page_viewed",
  "terms_page_viewed",
  "admin_dashboard_viewed",
  "admin_analytics_viewed",
  "admin_debug_viewed",
  "admin_users_viewed",
  "admin_content_viewed",
  "admin_drops_viewed",
  "admin_queue_viewed",
  "admin_roster_viewed",
  "admin_user_detail_viewed",
  "semantic_page_viewed",
])

const WATCH_CAPTURE_TRANSPORTS = [
  "fetch",
  "keepalive_fetch",
  "replay_fetch",
  "unknown",
] as const

type WatchCaptureTransport = (typeof WATCH_CAPTURE_TRANSPORTS)[number]

type LiveBucket = {
  minute: number;
  userKeys: Set<string>;
  views: number;
}

type RealtimeIdentity = {
  uid: string;
  username: string;
  lastSeenAt: number;
  lastEventName: string;
  lastPagePath: string;
  lastDropTitle: string;
  lastSemanticScopeLabel: string;
  lastComponentName: string;
  lastEventModules: string;
  actorType?: "guest" | "identified";
  sourceLabel?: string;
  truthLabel?: "live" | "fallback";
  sessionKey?: string;
}

type GuestAnalyticsSnapshot = {
  generatedAtMs: number;
  refreshedAtMs: number;
  sourceWindowMs: number;
  sourceWindowLabel: string;
  guestBatchCount: number;
  guestEventCount: number;
  guestSessionCount: number;
  uniqueAnonymousVisitorCount: number;
  guestBounceCount: number;
  guestBounceRate: number | null;
  guestSamplesAvailable: boolean;
  guestTruthState: "live" | "stale" | "unavailable" | "needs_review";
  sourceCollectionsUsed: string[];
  sourceSampleCounts: Record<string, number>;
  notes: string[];
}

function buildEmptyLiveBuckets() {
  return Array.from({length: 30}, (_, minute) => ({
    minute,
    userKeys: new Set<string>(),
    views: 0,
  } satisfies LiveBucket))
}

function resolveMinutesAgo(nowMs: number, timestamp: number) {
  if (!Number.isFinite(timestamp) || timestamp <= 0 || timestamp > nowMs) {
    return null
  }

  const minutesAgo = Math.floor((nowMs - timestamp) / 60_000)
  if (minutesAgo < 0 || minutesAgo >= 30) {
    return null
  }

  return minutesAgo
}

function isPageViewEvent(eventName: string) {
  return PAGE_VIEW_EVENT_NAMES.has(eventName) ||
    eventName.endsWith("_viewed") ||
    eventName.endsWith("_page_viewed")
}

function applyRealtimePresence(input: {
  buckets: LiveBucket[];
  minute: number | null;
  userKey: string;
  pageViewCount?: number;
  activeActorKeys: Set<string>;
  identifiedActorKeys: Set<string>;
}) {
  if (input.minute === null) {
    return
  }

  if (input.userKey) {
    input.buckets[input.minute].userKeys.add(input.userKey)
    input.activeActorKeys.add(input.userKey)
    if (input.userKey.startsWith("user:")) {
      input.identifiedActorKeys.add(input.userKey)
    }
  }

  if ((input.pageViewCount || 0) > 0) {
    input.buckets[input.minute].views += input.pageViewCount || 0
  }
}

function finalizeRealtimeBuckets(buckets: LiveBucket[]) {
  return buckets
    .map((bucket) => ({
      minute: bucket.minute,
      users: bucket.userKeys.size,
      views: bucket.views,
    }))
    .sort((left, right) => right.minute - left.minute)
}

function readEventModules(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
      .join(", ")
  }

  return readString(value)
}

function upsertRealtimeIdentity(
  identities: Map<string, RealtimeIdentity>,
  candidate: RealtimeIdentity,
) {
  if (!candidate.uid) {
    return
  }

  const current = identities.get(candidate.uid)
  if (!current || candidate.lastSeenAt >= current.lastSeenAt) {
    identities.set(candidate.uid, candidate)
  }
}

function normalizeTransport(value: unknown): WatchCaptureTransport {
  const candidate = readString(value) as WatchCaptureTransport
  return WATCH_CAPTURE_TRANSPORTS.includes(candidate) ? candidate : "unknown"
}

function deriveCaptureState(data: Record<string, unknown>) {
  const replayRecovered = readBoolean(data.replayRecovered) ||
    readNumber(data.replayRecoveredCount) > 0
  const gapDetected = readNumber(data.gapCount) > 0
  const flushDegraded = !readBoolean(data.isClosed) && readNumber(data.flushFailureCount) > 0
  const closeMissing = flushDegraded && !readString(data.closeReason)

  return {
    degraded: closeMissing || flushDegraded || gapDetected,
    replayRecovered,
    closeMissing,
    gapDetected,
    flushDegraded,
  }
}

function buildWatchCaptureHealth(input: {
  watchSessionDocs: QueryDocumentSnapshot[];
  watchAssetDocs: QueryDocumentSnapshot[];
}) {
  const transportCounts = new Map<WatchCaptureTransport, number>()
  const hiddenSeconds: number[] = []
  const gapMsValues: number[] = []
  const waitSecondsBySession = new Map<string, number>()
  const seekCountBySession = new Map<string, number>()
  const playbackRateBySession = new Map<string, number>()
  const mutedSessionKeys = new Set<string>()

  let sessionCount = 0
  let fullCaptureCount = 0
  let degradedSessionCount = 0
  let replayRecoveredCount = 0
  let gapDetectedCount = 0
  let flushDegradedCount = 0
  let closeMissingCount = 0
  let lastSeenAtMs = 0

  input.watchSessionDocs.forEach((doc) => {
    const data = doc.data() as Record<string, unknown>
    const captureState = deriveCaptureState(data)

    sessionCount += 1
    if (captureState.degraded) {
      degradedSessionCount += 1
    } else {
      fullCaptureCount += 1
    }
    if (captureState.replayRecovered) replayRecoveredCount += 1
    if (captureState.gapDetected) gapDetectedCount += 1
    if (captureState.flushDegraded) flushDegradedCount += 1
    if (captureState.closeMissing) closeMissingCount += 1

    const transport = normalizeTransport(data.captureTransport)
    transportCounts.set(transport, (transportCounts.get(transport) || 0) + 1)

    const hiddenDuration = readNumber(data.hiddenDurationSeconds)
    if (hiddenDuration > 0) hiddenSeconds.push(hiddenDuration)

    const gapMs = readNumber(data.maxGapMs)
    if (gapMs > 0) gapMsValues.push(gapMs)

    lastSeenAtMs = Math.max(lastSeenAtMs, readNumber(data.lastSeenAtMs))
  })

  input.watchAssetDocs.forEach((doc) => {
    const data = doc.data() as Record<string, unknown>
    const watchSessionId = readString(data.watchSessionId) || doc.id
    waitSecondsBySession.set(
      watchSessionId,
      (waitSecondsBySession.get(watchSessionId) || 0) + readNumber(data.waitingDurationSeconds),
    )
    seekCountBySession.set(
      watchSessionId,
      (seekCountBySession.get(watchSessionId) || 0) + readNumber(data.seekCount),
    )

    const playbackRate = readNumber(data.playbackRateAverage)
    if (playbackRate > 0) {
      const current = playbackRateBySession.get(watchSessionId) || 0
      playbackRateBySession.set(
        watchSessionId,
        current > 0 ? Number(((current + playbackRate) / 2).toFixed(2)) : playbackRate,
      )
    }

    if (readNumber(data.mutedSampleCount) > 0) {
      mutedSessionKeys.add(watchSessionId)
    }
  })

  const warnings: string[] = []
  if (sessionCount === 0) {
    warnings.push("No canonical watch sessions matched the realtime hot summary window.")
  }
  if (closeMissingCount > 0) {
    warnings.push(`${closeMissingCount} realtime watch session(s) are close-missing.`)
  }
  if (flushDegradedCount > 0) {
    warnings.push(`${flushDegradedCount} realtime watch session(s) reported flush degradation.`)
  }

  return {
    sessionCount,
    fullCaptureCount,
    degradedSessionCount,
    replayRecoveredCount,
    gapDetectedCount,
    flushDegradedCount,
    closeMissingCount,
    degradedRate: sessionCount > 0 ? Number((degradedSessionCount / sessionCount).toFixed(4)) : 0,
    averageGapMs: Math.round(average(gapMsValues)),
    averageHiddenSeconds: Number(average(hiddenSeconds).toFixed(2)),
    averageWaitSeconds: Number(average(Array.from(waitSecondsBySession.values())).toFixed(2)),
    averageSeekCount: Number(average(Array.from(seekCountBySession.values())).toFixed(2)),
    averagePlaybackRate: Number(average(Array.from(playbackRateBySession.values())).toFixed(2)),
    mutedSessionCount: mutedSessionKeys.size,
    transportBreakdown: WATCH_CAPTURE_TRANSPORTS.map((transport) => ({
      transport,
      count: transportCounts.get(transport) || 0,
    })),
    lastSeenAtMs,
    warnings,
  }
}

function buildFirstPartyLiveData(input: {
  nowMs: number;
  activeUserDocs: QueryDocumentSnapshot[];
  eventFactDocs: QueryDocumentSnapshot[];
  guestBatchDocs: QueryDocumentSnapshot[];
  watchSessionDocs: QueryDocumentSnapshot[];
}) {
  const buckets = buildEmptyLiveBuckets()
  const activeActorKeys = new Set<string>()
  const identifiedActorKeys = new Set<string>()

  input.activeUserDocs.forEach((doc) => {
    const data = doc.data() as Record<string, unknown>
    applyRealtimePresence({
      buckets,
      minute: resolveMinutesAgo(input.nowMs, readNumber(data.lastSeenAt)),
      userKey: `user:${doc.id}`,
      activeActorKeys,
      identifiedActorKeys,
    })
  })

  input.eventFactDocs.forEach((doc) => {
    const data = doc.data() as Record<string, unknown>
    const userId = readString(data.userId)
    const eventName = readString(data.eventName)
    applyRealtimePresence({
      buckets,
      minute: resolveMinutesAgo(input.nowMs, readNumber(data.timestamp)),
      userKey: userId ? `user:${userId}` : "",
      pageViewCount: isPageViewEvent(eventName) ? 1 : 0,
      activeActorKeys,
      identifiedActorKeys,
    })
  })

  input.guestBatchDocs.forEach((doc) => {
    const data = doc.data() as Record<string, unknown>
    const guestKey = `guest:${readString(data.sessionKey) || readString(data.clientSessionId) || doc.id}`
    const events = Array.isArray(data.events) ? data.events as Array<Record<string, unknown>> : []
    events.forEach((event) => {
      applyRealtimePresence({
        buckets,
        minute: resolveMinutesAgo(
          input.nowMs,
          readNumber(event.timestamp) || readNumber(data.receivedAtMs),
        ),
        userKey: guestKey,
        pageViewCount: readString(event.type) === "page_view" ? 1 : 0,
        activeActorKeys,
        identifiedActorKeys,
      })
    })
  })

  input.watchSessionDocs.forEach((doc) => {
    const data = doc.data() as Record<string, unknown>
    const userId = readString(data.userId)
    const sessionKey = readString(data.sessionKey) || doc.id
    applyRealtimePresence({
      buckets,
      minute: resolveMinutesAgo(input.nowMs, readNumber(data.lastSeenAtMs)),
      userKey: userId ? `user:${userId}` : `guest:${sessionKey}`,
      activeActorKeys,
      identifiedActorKeys,
    })
  })

  return {
    data: finalizeRealtimeBuckets(buckets),
    totalActive: activeActorKeys.size,
    deepTrackerActive: identifiedActorKeys.size,
  }
}

function buildFallbackActiveUsers(input: {
  activeUserDocs: QueryDocumentSnapshot[];
  eventFactDocs: QueryDocumentSnapshot[];
  watchSessionDocs: QueryDocumentSnapshot[];
}) {
  const identities = new Map<string, RealtimeIdentity>()

  input.activeUserDocs.forEach((doc) => {
    const data = doc.data() as Record<string, unknown>
    upsertRealtimeIdentity(identities, {
      uid: doc.id,
      username: readString(data.username) || doc.id,
      lastSeenAt: readNumber(data.lastSeenAt),
      lastEventName: readString(data.lastEventName),
      lastPagePath: readString(data.lastPagePath),
      lastDropTitle: readString(data.lastDropTitle),
      lastSemanticScopeLabel: readString(data.lastSemanticScopeLabel),
      lastComponentName: readString(data.lastComponentName),
      lastEventModules: readEventModules(data.lastEventModules),
      actorType: "identified",
      sourceLabel: "analytics_active_users",
      truthLabel: "live",
    })
  })

  input.eventFactDocs.forEach((doc) => {
    const data = doc.data() as Record<string, unknown>
    const userId = readString(data.userId)
    if (!userId) {
      return
    }

    const params = (data.params && typeof data.params === "object")
      ? data.params as Record<string, unknown>
      : {}
    upsertRealtimeIdentity(identities, {
      uid: userId,
      username: readString(data.username) || userId,
      lastSeenAt: readNumber(data.timestamp),
      lastEventName: readString(data.eventName),
      lastPagePath: readString(data.pagePath) || readString(params.page_path),
      lastDropTitle: readString(data.dropTitle) || readString(params.drop_title),
      lastSemanticScopeLabel: readString(params.semantic_scope_label),
      lastComponentName: readString(params.component_name),
      lastEventModules: readEventModules(params.event_modules),
      actorType: "identified",
      sourceLabel: "analytics_event_facts",
      truthLabel: "fallback",
    })
  })

  input.watchSessionDocs.forEach((doc) => {
    const data = doc.data() as Record<string, unknown>
    const userId = readString(data.userId)
    if (!userId) {
      return
    }

    upsertRealtimeIdentity(identities, {
      uid: userId,
      username: readString(data.username) || userId,
      lastSeenAt: readNumber(data.lastSeenAtMs),
      lastEventName: readBoolean(data.isClosed) ? "viewer_session_closed" : "viewer_session_active",
      lastPagePath: readString(data.pagePath),
      lastDropTitle: readString(data.dropTitle),
      lastSemanticScopeLabel: "Viewer",
      lastComponentName: "",
      lastEventModules: "viewer",
      actorType: "identified",
      sourceLabel: "analytics_watch_sessions",
      truthLabel: "fallback",
    })
  })

  return Array.from(identities.values())
    .sort((left, right) => right.lastSeenAt - left.lastSeenAt)
    .slice(0, 8)
}

function buildSurfaceLabel(pagePath: string) {
  const normalized = pagePath.startsWith("/") ? pagePath : `/${pagePath}`
  if (normalized.startsWith("/admin")) return "Admin"
  if (normalized.startsWith("/dashboard")) return "Dashboard"
  if (normalized.startsWith("/drops")) return "Drops"
  if (normalized.startsWith("/profile")) return "Profile"
  if (normalized.startsWith("/experience")) return "Experience"
  if (normalized === "/") return "Home"
  return normalized.split("/").filter(Boolean)[0] || "Unknown"
}

function buildSurfaceMix(activeUsers: RealtimeIdentity[]) {
  const surfaces = new Map<string, {label: string; activeUsers: number; lastSeenAt: number}>()
  activeUsers.forEach((activeUser) => {
    const label = buildSurfaceLabel(activeUser.lastPagePath)
    const key = label.toLowerCase().replace(/\s+/g, "_") || "unknown"
    const current = surfaces.get(key) || {
      label,
      activeUsers: 0,
      lastSeenAt: 0,
    }
    current.activeUsers += 1
    current.lastSeenAt = Math.max(current.lastSeenAt, activeUser.lastSeenAt)
    surfaces.set(key, current)
  })

  return Array.from(surfaces.entries())
    .map(([key, value]) => ({key, ...value}))
    .sort((left, right) => right.activeUsers - left.activeUsers || right.lastSeenAt - left.lastSeenAt)
}

function buildOnboardingStats(eventFactDocs: QueryDocumentSnapshot[]) {
  let starts = 0
  let completions = 0
  const durationSamples: number[] = []

  eventFactDocs.forEach((doc) => {
    const data = doc.data() as Record<string, unknown>
    const eventName = readString(data.eventName)
    if (eventName === "guided_onboarding_started") {
      starts += 1
    }
    if (eventName === "guided_onboarding_completed") {
      completions += 1
      const durationMs = readNumber(data.durationMs)
      if (durationMs > 0) {
        durationSamples.push(durationMs)
      }
    }
  })

  return {
    starts,
    completions,
    avgDuration: average(durationSamples),
    completionRate: starts > 0 ? Number((completions / starts).toFixed(4)) : 0,
    startSource: starts > 0 ? "tracked" : "none",
  }
}

function buildLimitIssues(input: {
  activeUserCount: number;
  eventFactCount: number;
  guestBatchCount: number;
  watchSessionCount: number;
  watchAssetCount: number;
}) {
  const issues: string[] = []
  if (input.activeUserCount >= ACTIVE_USER_LIMIT) {
    issues.push("Realtime active user hot summary hit its sample cap.")
  }
  if (input.eventFactCount >= EVENT_FACT_LIMIT) {
    issues.push("Realtime event fact hot summary hit its sample cap.")
  }
  if (input.guestBatchCount >= GUEST_BATCH_LIMIT) {
    issues.push("Realtime guest batch hot summary hit its sample cap.")
  }
  if (input.watchSessionCount >= WATCH_SESSION_LIMIT) {
    issues.push("Realtime watch session hot summary hit its sample cap.")
  }
  if (input.watchAssetCount >= WATCH_ASSET_LIMIT) {
    issues.push("Realtime watch asset hot summary hit its sample cap.")
  }
  return issues
}

function buildGuestAnalyticsSnapshot(input: {
  nowMs: number;
  guestBatchDocs: QueryDocumentSnapshot[];
  guestBatchLimit: number;
}): GuestAnalyticsSnapshot {
  const anonymousVisitorIds = new Set<string>()
  const sessionKeys = new Set<string>()
  let guestEventCount = 0
  let pageLeaveCount = 0
  let guestBounceCount = 0

  input.guestBatchDocs.forEach((doc) => {
    const data = doc.data() as Record<string, unknown>
    const anonymousVisitorId = readString(data.anonymousVisitorId)
      || readString(data.sessionKey)
      || readString(data.clientSessionId)
      || doc.id
    const sessionKey = readString(data.sessionKey)
      || readString(data.serverSessionKey)
      || readString(data.clientSessionId)
      || doc.id
    if (anonymousVisitorId) anonymousVisitorIds.add(anonymousVisitorId)
    if (sessionKey) sessionKeys.add(sessionKey)

    const events = Array.isArray(data.events) ? data.events as Array<Record<string, unknown>> : []
    guestEventCount += Math.max(readNumber(data.eventCount), events.length)

    events.forEach((event) => {
      const eventType = readString(event.type)
      if (eventType === "page_leave") {
        pageLeaveCount += 1
        if (readString(event.exitIntent) === "bounce") {
          guestBounceCount += 1
        }
      }
    })
  })

  const notes: string[] = []
  if (input.guestBatchDocs.length === 0) {
    notes.push("No guest analytics batches were materialized in the realtime source window.")
  }
  if (input.guestBatchDocs.length >= input.guestBatchLimit) {
    notes.push("Guest analytics snapshot hit the bounded source sample cap and needs review.")
  }

  const guestSamplesAvailable = input.guestBatchDocs.length > 0
  const guestTruthState = !guestSamplesAvailable
    ? "unavailable"
    : input.guestBatchDocs.length >= input.guestBatchLimit
      ? "needs_review"
      : "live"

  return {
    generatedAtMs: input.nowMs,
    refreshedAtMs: input.nowMs,
    sourceWindowMs: REALTIME_WINDOW_MS,
    sourceWindowLabel: "last_30_minutes",
    guestBatchCount: input.guestBatchDocs.length,
    guestEventCount,
    guestSessionCount: sessionKeys.size,
    uniqueAnonymousVisitorCount: anonymousVisitorIds.size,
    guestBounceCount,
    guestBounceRate: pageLeaveCount > 0 ? Number((guestBounceCount / pageLeaveCount).toFixed(4)) : null,
    guestSamplesAvailable,
    guestTruthState,
    sourceCollectionsUsed: ["analytics_guest_batches"],
    sourceSampleCounts: {
      analytics_guest_batches: input.guestBatchDocs.length,
    },
    notes,
  }
}

async function readRecentDocs(
  collectionName: string,
  timestampField: string,
  windowStartMs: number,
  limit: number,
) {
  const snapshot = await db.collection(collectionName)
    .where(timestampField, ">=", windowStartMs)
    .orderBy(timestampField, "desc")
    .limit(limit)
    .get()
  return snapshot.docs
}

export async function rebuildAdminAnalyticsRealtimeSummary(nowMs = Date.now()) {
  const windowStartMs = nowMs - REALTIME_WINDOW_MS
  const [
    activeUserDocs,
    eventFactDocs,
    guestBatchDocs,
    watchSessionDocs,
    watchAssetDocs,
  ] = await Promise.all([
    readRecentDocs("analytics_active_users", "lastSeenAt", windowStartMs, ACTIVE_USER_LIMIT),
    readRecentDocs("analytics_event_facts", "timestamp", windowStartMs, EVENT_FACT_LIMIT),
    readRecentDocs("analytics_guest_batches", "receivedAtMs", windowStartMs, GUEST_BATCH_LIMIT),
    readRecentDocs("analytics_watch_sessions", "lastSeenAtMs", windowStartMs, WATCH_SESSION_LIMIT),
    readRecentDocs("analytics_watch_assets", "lastSeenAtMs", windowStartMs, WATCH_ASSET_LIMIT),
  ])

  const firstPartyLive = buildFirstPartyLiveData({
    nowMs,
    activeUserDocs,
    eventFactDocs,
    guestBatchDocs,
    watchSessionDocs,
  })
  const activeUsers = buildFallbackActiveUsers({
    activeUserDocs,
    eventFactDocs,
    watchSessionDocs,
  })
  const issues = buildLimitIssues({
    activeUserCount: activeUserDocs.length,
    eventFactCount: eventFactDocs.length,
    guestBatchCount: guestBatchDocs.length,
    watchSessionCount: watchSessionDocs.length,
    watchAssetCount: watchAssetDocs.length,
  })
  const guestAnalyticsSnapshot = buildGuestAnalyticsSnapshot({
    nowMs,
    guestBatchDocs,
    guestBatchLimit: GUEST_BATCH_LIMIT,
  })
  if (guestAnalyticsSnapshot.guestTruthState === "needs_review") {
    issues.push("Guest analytics snapshot hit its bounded sample cap and needs review.")
  }

  if (firstPartyLive.totalActive === 0 && eventFactDocs.length === 0 && guestBatchDocs.length === 0) {
    issues.push("No first-party realtime analytics facts matched the hot summary window.")
  }

  const payload = {
    success: true,
    generatedAtMs: nowMs,
    windowStartMs,
    windowMs: REALTIME_WINDOW_MS,
    writer: "functions/refreshAdminAnalyticsRealtimeSummary",
    cacheSourceLabel: "analytics_aggregate_stats/realtime_summary",
    liveTruthLabel: "live",
    liveSourceLabel: "analytics_aggregate_stats/realtime_summary",
    activeUsersTruthLabel: activeUserDocs.length > 0 ? "live" : "partial",
    activeUsersSourceLabel: activeUserDocs.length > 0
      ? "analytics_active_users"
      : "analytics_event_facts + analytics_watch_sessions",
    issues,
    totalActive: firstPartyLive.totalActive,
    deepTrackerActive: firstPartyLive.deepTrackerActive,
    guestAnalyticsSnapshot,
    data: firstPartyLive.data,
    activeUsers,
    surfaceMix: buildSurfaceMix(activeUsers),
    watchCaptureHealth: buildWatchCaptureHealth({
      watchSessionDocs,
      watchAssetDocs,
    }),
    onboardingStats: buildOnboardingStats(eventFactDocs),
    sourceSamples: {
      activeUsers: activeUserDocs.length,
      eventFacts: eventFactDocs.length,
      guestBatches: guestBatchDocs.length,
      watchSessions: watchSessionDocs.length,
      watchAssets: watchAssetDocs.length,
    },
    updatedAt: FieldValue.serverTimestamp(),
  }

  await db.collection("analytics_aggregate_stats").doc(HOT_SUMMARY_DOC_ID).set(payload, {merge: true})

  logger.info("refreshAdminAnalyticsRealtimeSummary completed", {
    totalActive: payload.totalActive,
    deepTrackerActive: payload.deepTrackerActive,
    issueCount: issues.length,
    sourceSamples: payload.sourceSamples,
  })

  return payload
}

export const refreshAdminAnalyticsRealtimeSummary = onSchedule({
  schedule: "every 1 minutes",
  region: REGION,
  retryCount: 0,
}, async () => {
  await rebuildAdminAnalyticsRealtimeSummary()
})
