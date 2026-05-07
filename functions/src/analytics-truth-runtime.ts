import {FieldValue} from "firebase-admin/firestore"
import {logger} from "firebase-functions"

import {readNumber, readString} from "./analytics-core.js"
import {db} from "./firebase-admin.js"
import {
  ANALYTICS_TRUTH_COLLECTIONS,
  ANALYTICS_TRUTH_FINALIZE_AFTER_MS,
  ANALYTICS_TRUTH_MAX_DROP_WRITES,
  ANALYTICS_TRUTH_MAX_EVENT_LIMIT,
  ANALYTICS_TRUTH_MAX_REPAIR_WRITES,
  ANALYTICS_TRUTH_MAX_SESSION_WRITES,
  ANALYTICS_TRUTH_MAX_USER_WRITES,
  ANALYTICS_TRUTH_MAX_WATCH_ASSET_LIMIT,
  ANALYTICS_TRUTH_MAX_WATCH_OBSERVATION_LIMIT,
  ANALYTICS_TRUTH_MAX_WATCH_SESSION_LIMIT,
  ANALYTICS_TRUTH_STALE_SESSION_MS,
  ANALYTICS_TRUTH_WINDOW_MS,
  type AnalyticsTruthLabel,
} from "./analytics-truth-contract.js"

type EventFactRecord = Record<string, unknown>
type MetricFactRecord = Record<string, unknown>
type WatchSessionRecord = Record<string, unknown>
type WatchAssetRecord = Record<string, unknown>
type WatchObservationRecord = Record<string, unknown>

type CounterBucket = {
  rawViewCount: number
  rawPreviewCount: number
  rawWatchTimeMs: number
  rawObservationCount: number
  duplicateRawViewCount: number
  duplicatePreviewCount: number
  dedupedViewCount: number
  uniqueViewerKeys: Set<string>
  totalDropViewSessions: number
  totalFilePlays: number
  repeatFilePlays: number
  dedupedWatchTimeMs: number
  finalizedViewCount: number
  finalizedWatchTimeMs: number
  finalizedCompletionCount: number
  unlockCount: number
  repeatSessionCount: number
  abandonmentCount: number
  estimatedWatchTimeMs: number
  estimatedRecoveredViewCount: number
  estimatedDropSessionEndCount: number
  estimatedFileCompletionCount: number
  repairedCompletionCount: number
  recoveredSessionsCount: number
  repairedDataCount: number
  rawCoverageGapCount: number
}

type SessionTruthDoc = {
  sessionId: string
  userId: string
  dropId: string
  dropTitle: string
  truthLabel: AnalyticsTruthLabel
  sourceLayer: AnalyticsTruthLabel
  lastComputedAtMs: number
  freshnessLabel: AnalyticsTruthLabel
  observed: Record<string, unknown>
  validated: Record<string, unknown>
  finalized: Record<string, unknown>
  estimated: Record<string, unknown>
  qualityLabel: "exact" | "estimated" | "fallback" | "stale"
  confidenceScore: number
  repairedDataRatio: number
}

type RepairRecord = Record<string, unknown> & {
  repairId: string
}

const VIEW_NORMALIZED_ACTIONS = new Set(["watch_session_started", "file_viewed"])
const PREVIEW_NORMALIZED_ACTIONS = new Set(["drop_preview_opened", "drop_viewed"])

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

function average(values: number[]) {
  if (values.length === 0) {
    return 0
  }

  return round(values.reduce((sum, value) => sum + value, 0) / values.length, 2)
}

function readNormalizedAction(record: Record<string, unknown>) {
  return readString(record.normalizedActionName).toLowerCase()
}

function readSourceTruth(record: Record<string, unknown>) {
  return readString(record.sourceTruth || record.normalizedActionSourceTruth).toLowerCase()
}

function isCanonicalMetricSource(record: Record<string, unknown>) {
  const sourceTruth = readSourceTruth(record)
  return sourceTruth === "server"
    || sourceTruth === "canonical"
    || sourceTruth === "materialized"
    || sourceTruth === "server_entitlement_unlock"
    || sourceTruth === "watch_session_rollup"
}

function readMetricName(record: Record<string, unknown>) {
  return readString(record.metricName).toLowerCase()
}

function buildCanonicalMetricFacts(input: {
  eventFacts: EventFactRecord[]
  watchSessions: WatchSessionRecord[]
}) {
  const metricFacts: MetricFactRecord[] = []

  input.eventFacts.forEach((record) => {
    const normalizedAction = readNormalizedAction(record)
    if (normalizedAction !== "drop_unlocked" || record.metricEligible === false || !isCanonicalMetricSource(record)) {
      return
    }

    metricFacts.push({
      metricName: "drop_unlocked",
      actorUserId: readString(record.actorUserId) || readString(record.userId),
      targetDropId: readString(record.targetDropId) || readString(record.dropId),
      timestampMs: readNumber(record.timestamp) || Date.now(),
    })
  })

  input.watchSessions.forEach((record) => {
    const watchScoreSource = readString(record.watchScoreSource)
    const validWatchMs = readNumber(record.validWatchMs)
    if (watchScoreSource !== "watch_session_rollup" || validWatchMs <= 0) {
      return
    }

    metricFacts.push({
      metricName: "watch_session_verified",
      actorUserId: readString(record.userId),
      targetDropId: readString(record.dropId),
      timestampMs: readNumber(record.lastSeenAtMs) || Date.now(),
      value: validWatchMs,
    })
  })

  return metricFacts
}

function buildRecoveryKey(input: {
  userId: string
  sessionId: string
  dropId: string
  timestampMs: number
}) {
  return `${input.userId || "anonymous"}::${input.sessionId || "unknown"}::${input.dropId || "site"}::${Math.floor(input.timestampMs / 90000)}`
}

function buildDuplicateKey(input: {
  userId: string
  sessionId: string
  dropId: string
  actionKey: string
  timestampMs: number
}) {
  const collapseWindowMs = PREVIEW_NORMALIZED_ACTIONS.has(input.actionKey) ? 45000 : 90000
  return `${input.userId || "anonymous"}::${input.sessionId || "unknown"}::${input.dropId || "site"}::${input.actionKey}::${Math.floor(input.timestampMs / collapseWindowMs)}`
}

function ensureBucket(scopeKey: string, store: Map<string, CounterBucket>) {
  const existing = store.get(scopeKey)
  if (existing) {
    return existing
  }

  const created: CounterBucket = {
    rawViewCount: 0,
    rawPreviewCount: 0,
    rawWatchTimeMs: 0,
    rawObservationCount: 0,
    duplicateRawViewCount: 0,
    duplicatePreviewCount: 0,
    dedupedViewCount: 0,
    uniqueViewerKeys: new Set(),
    totalDropViewSessions: 0,
    totalFilePlays: 0,
    repeatFilePlays: 0,
    dedupedWatchTimeMs: 0,
    finalizedViewCount: 0,
    finalizedWatchTimeMs: 0,
    finalizedCompletionCount: 0,
    unlockCount: 0,
    repeatSessionCount: 0,
    abandonmentCount: 0,
    estimatedWatchTimeMs: 0,
    estimatedRecoveredViewCount: 0,
    estimatedDropSessionEndCount: 0,
    estimatedFileCompletionCount: 0,
    repairedCompletionCount: 0,
    recoveredSessionsCount: 0,
    repairedDataCount: 0,
    rawCoverageGapCount: 0,
  }
  store.set(scopeKey, created)
  return created
}

function applyToAllScopes(input: {
  globalBucket: CounterBucket
  dropBucket?: CounterBucket
  userBucket?: CounterBucket
  run: (bucket: CounterBucket) => void
}) {
  input.run(input.globalBucket)
  if (input.dropBucket) {
    input.run(input.dropBucket)
  }
  if (input.userBucket) {
    input.run(input.userBucket)
  }
}

async function readTruthSources(nowMs: number) {
  const windowStartMs = nowMs - ANALYTICS_TRUTH_WINDOW_MS

  const [
    eventFactsSnapshot,
    watchSessionsSnapshot,
    watchAssetsSnapshot,
    watchObservationsSnapshot,
  ] = await Promise.all([
    db.collection("analytics_event_facts")
      .where("timestamp", ">=", windowStartMs)
      .orderBy("timestamp", "desc")
      .limit(ANALYTICS_TRUTH_MAX_EVENT_LIMIT)
      .get(),
    db.collection("analytics_watch_sessions")
      .where("lastSeenAtMs", ">=", windowStartMs)
      .orderBy("lastSeenAtMs", "desc")
      .limit(ANALYTICS_TRUTH_MAX_WATCH_SESSION_LIMIT)
      .get(),
    db.collection("analytics_watch_assets")
      .where("lastSeenAtMs", ">=", windowStartMs)
      .orderBy("lastSeenAtMs", "desc")
      .limit(ANALYTICS_TRUTH_MAX_WATCH_ASSET_LIMIT)
      .get(),
    db.collection("analytics_watch_observations")
      .where("observedAtMs", ">=", windowStartMs)
      .orderBy("observedAtMs", "desc")
      .limit(ANALYTICS_TRUTH_MAX_WATCH_OBSERVATION_LIMIT)
      .get(),
  ])

  return {
    windowStartMs,
    eventFacts: eventFactsSnapshot.docs.map((doc) => ({id: doc.id, ...(doc.data() as Record<string, unknown>)})),
    watchSessions: watchSessionsSnapshot.docs.map((doc) => ({id: doc.id, ...(doc.data() as Record<string, unknown>)})),
    watchAssets: watchAssetsSnapshot.docs.map((doc) => ({id: doc.id, ...(doc.data() as Record<string, unknown>)})),
    watchObservations: watchObservationsSnapshot.docs.map((doc) => ({id: doc.id, ...(doc.data() as Record<string, unknown>)})),
    metricFacts: buildCanonicalMetricFacts({
      eventFacts: eventFactsSnapshot.docs.map((doc) => ({id: doc.id, ...(doc.data() as Record<string, unknown>)})),
      watchSessions: watchSessionsSnapshot.docs.map((doc) => ({id: doc.id, ...(doc.data() as Record<string, unknown>)})),
    }),
  }
}

function buildAnalyticsTruthDocs(input: Awaited<ReturnType<typeof readTruthSources>>, nowMs: number) {
  const globalBucket = ensureBucket("global", new Map<string, CounterBucket>())
  const dropBuckets = new Map<string, CounterBucket>()
  const userBuckets = new Map<string, CounterBucket>()
  const sessionDocs = new Map<string, SessionTruthDoc>()
  const repairs = new Map<string, RepairRecord>()
  const duplicateViewKeys = new Map<string, number>()
  const duplicatePreviewKeys = new Map<string, number>()
  const validatedPresenceKeys = new Set<string>()
  const recoveredViewKeys = new Set<string>()
  const repeatFileKeys = new Map<string, number>()
  const rawObservationCountBySession = new Map<string, number>()
  const rawObservationWatchMsBySession = new Map<string, number>()
  const rawObservationVisibleMsBySession = new Map<string, number>()
  const rawObservationLastAtBySession = new Map<string, number>()
  const confidenceValues: number[] = []

  input.watchObservations.forEach((record) => {
    const observation = record as WatchObservationRecord
    const sessionId = readString(observation.watchSessionId)
    if (!sessionId) {
      return
    }
    rawObservationCountBySession.set(sessionId, (rawObservationCountBySession.get(sessionId) || 0) + 1)
    rawObservationWatchMsBySession.set(
      sessionId,
      (rawObservationWatchMsBySession.get(sessionId) || 0) + Math.max(0, readNumber(observation.observedWatchDeltaMs)),
    )
    rawObservationVisibleMsBySession.set(
      sessionId,
      (rawObservationVisibleMsBySession.get(sessionId) || 0) + Math.max(0, readNumber(observation.observedVisibleDeltaMs)),
    )
    rawObservationLastAtBySession.set(
      sessionId,
      Math.max(rawObservationLastAtBySession.get(sessionId) || 0, readNumber(observation.observedAtMs)),
    )
  })

  input.eventFacts.forEach((record) => {
    const event = record as EventFactRecord
    const normalizedAction = readNormalizedAction(event)
    const timestampMs = readNumber(event.timestamp) || nowMs
    const userId = readString(event.userId)
    const sessionId = readString(event.sessionId)
    const dropId = readString(event.dropId)
    const userBucket = userId ? ensureBucket(userId, userBuckets) : undefined
    const dropBucket = dropId ? ensureBucket(dropId, dropBuckets) : undefined

    if (VIEW_NORMALIZED_ACTIONS.has(normalizedAction)) {
      applyToAllScopes({
        globalBucket,
        dropBucket,
        userBucket,
        run: (bucket) => {
          bucket.rawViewCount += 1
        },
      })
      const duplicateKey = buildDuplicateKey({
        userId,
        sessionId,
        dropId,
        actionKey: normalizedAction || "view_unknown",
        timestampMs,
      })
      const nextCount = (duplicateViewKeys.get(duplicateKey) || 0) + 1
      duplicateViewKeys.set(duplicateKey, nextCount)
      if (nextCount > 1) {
        applyToAllScopes({
          globalBucket,
          dropBucket,
          userBucket,
          run: (bucket) => {
            bucket.duplicateRawViewCount += 1
          },
        })
      }
      recoveredViewKeys.add(buildRecoveryKey({
        userId,
        sessionId,
        dropId,
        timestampMs,
      }))
    }

    if (PREVIEW_NORMALIZED_ACTIONS.has(normalizedAction)) {
      applyToAllScopes({
        globalBucket,
        dropBucket,
        userBucket,
        run: (bucket) => {
          bucket.rawPreviewCount += 1
        },
      })
      const duplicateKey = buildDuplicateKey({
        userId,
        sessionId,
        dropId,
        actionKey: normalizedAction || "preview_unknown",
        timestampMs,
      })
      const nextCount = (duplicatePreviewKeys.get(duplicateKey) || 0) + 1
      duplicatePreviewKeys.set(duplicateKey, nextCount)
      if (nextCount > 1) {
        applyToAllScopes({
          globalBucket,
          dropBucket,
          userBucket,
          run: (bucket) => {
            bucket.duplicatePreviewCount += 1
          },
        })
      }
    }

  })

  input.metricFacts.forEach((record) => {
    const metricName = readMetricName(record)
    if (metricName !== "drop_unlocked") {
      return
    }

    const userId = readString(record.actorUserId)
    const dropId = readString(record.targetDropId)
    const userBucket = userId ? ensureBucket(userId, userBuckets) : undefined
    const dropBucket = dropId ? ensureBucket(dropId, dropBuckets) : undefined

    applyToAllScopes({
      globalBucket,
      dropBucket,
      userBucket,
      run: (bucket) => {
        bucket.unlockCount += 1
      },
    })
  })

  input.watchSessions.forEach((record) => {
    const session = record as WatchSessionRecord
    const sessionId = readString(session.watchSessionId) || readString(record.id)
    const userId = readString(session.userId)
    const dropId = readString(session.dropId)
    const dropTitle = readString(session.dropTitle) || dropId
    const viewerKey = userId || readString(session.username) || sessionId
    const userBucket = userId ? ensureBucket(userId, userBuckets) : undefined
    const dropBucket = dropId ? ensureBucket(dropId, dropBuckets) : undefined
    const dedupedWatchTimeMs = Math.round(readNumber(session.totalWatchSeconds) * 1000)
    const rawObservedWatchTimeMs = rawObservationWatchMsBySession.get(sessionId) || 0
    const rawObservedVisibleTimeMs = rawObservationVisibleMsBySession.get(sessionId) || 0
    const rawObservationCount = rawObservationCountBySession.get(sessionId) || 0
    const lastSeenAtMs = readNumber(session.lastSeenAtMs) || nowMs
    const isClosed = session.isClosed === true
    const completedSession = session.completedSession === true
    const abandoned = session.abandoned === true || session.bounced === true || session.stalled === true
    const staleOpen = !isClosed && lastSeenAtMs <= nowMs - ANALYTICS_TRUTH_STALE_SESSION_MS
    const finalizeReady = isClosed || lastSeenAtMs <= nowMs - ANALYTICS_TRUTH_FINALIZE_AFTER_MS
    const capturePenalty = session.captureDegraded === true ? 0.2 : 0
    const rawCoveragePenalty = rawObservationCount === 0 ? 0.25 : 0
    const estimatedWatchTimeMs = staleOpen ? Math.min(15000, Math.max(3000, Math.round((readNumber(session.totalVisibleSeconds) - readNumber(session.totalWatchSeconds)) * 250))) : 0
    const estimatedSessionEndAtMs = staleOpen ? lastSeenAtMs + estimatedWatchTimeMs : 0
    const repairedDataRatio = clamp01((estimatedWatchTimeMs > 0 ? estimatedWatchTimeMs : 0) / Math.max(1, dedupedWatchTimeMs + estimatedWatchTimeMs))
    const confidenceScore = clamp01(1 - capturePenalty - rawCoveragePenalty - (staleOpen ? 0.25 : 0))
    confidenceValues.push(confidenceScore)

    validatedPresenceKeys.add(buildRecoveryKey({
      userId,
      sessionId: readString(session.clientSessionId) || sessionId,
      dropId,
      timestampMs: readNumber(session.sessionStartedAtMs) || lastSeenAtMs,
    }))

    applyToAllScopes({
      globalBucket,
      dropBucket,
      userBucket,
      run: (bucket) => {
        bucket.dedupedViewCount += 1
        bucket.totalDropViewSessions += 1
        bucket.dedupedWatchTimeMs += dedupedWatchTimeMs
        bucket.finalizedViewCount += 1
        bucket.finalizedWatchTimeMs += dedupedWatchTimeMs + estimatedWatchTimeMs
        bucket.rawWatchTimeMs += rawObservedWatchTimeMs
        bucket.rawObservationCount += rawObservationCount
        bucket.uniqueViewerKeys.add(viewerKey)
        if (completedSession) {
          bucket.finalizedCompletionCount += 1
        }
        if (abandoned) {
          bucket.abandonmentCount += 1
        }
        if (estimatedWatchTimeMs > 0) {
          bucket.estimatedWatchTimeMs += estimatedWatchTimeMs
          bucket.estimatedDropSessionEndCount += 1
          bucket.repairedDataCount += 1
          bucket.recoveredSessionsCount += 1
        }
        if (rawObservationCount === 0) {
          bucket.rawCoverageGapCount += 1
        }
      },
    })

    const sessionDoc: SessionTruthDoc = {
      sessionId,
      userId,
      dropId,
      dropTitle,
      truthLabel: !finalizeReady ? "provisional" : estimatedWatchTimeMs > 0 ? "estimated" : "finalized",
      sourceLayer: !finalizeReady ? "provisional" : estimatedWatchTimeMs > 0 ? "estimated" : "validated",
      lastComputedAtMs: nowMs,
      freshnessLabel: nowMs - lastSeenAtMs <= ANALYTICS_TRUTH_STALE_SESSION_MS ? "live" : "stale",
      observed: {
        rawObservationCount,
        rawObservedWatchTimeMs,
        rawObservedVisibleTimeMs,
        lastObservedAtMs: rawObservationLastAtBySession.get(sessionId) || 0,
      },
      validated: {
        dedupedViewCount: 1,
        dedupedWatchTimeMs,
        uniqueViewerKey: viewerKey,
        viewedAssetCount: readNumber(session.viewedAssetCount),
        completedAssetCount: readNumber(session.completedAssetCount),
        consumedAssetCount: readNumber(session.consumedAssetCount),
        repeatWatchFlag: readNumber(session.assetSwitchCount) > 0,
      },
      finalized: {
        finalizedViewCount: 1,
        finalizedWatchTimeMs: dedupedWatchTimeMs + estimatedWatchTimeMs,
        finalizedSessionEndAtMs: isClosed ? readNumber(session.closedAtMs) || lastSeenAtMs : estimatedSessionEndAtMs || lastSeenAtMs,
        finalizedCompletion: completedSession,
      },
      estimated: {
        estimatedWatchTimeMs,
        estimatedSessionEndAtMs,
        estimatedCompletion: false,
      },
      qualityLabel: estimatedWatchTimeMs > 0 ? "estimated" : rawObservationCount === 0 ? "fallback" : !finalizeReady ? "stale" : "exact",
      confidenceScore: round(confidenceScore, 3),
      repairedDataRatio: round(repairedDataRatio, 4),
    }
    sessionDocs.set(sessionId, sessionDoc)

    if (estimatedWatchTimeMs > 0) {
      repairs.set(`repair_session_${sessionId}`, {
        repairId: `repair_session_${sessionId}`,
        repairType: "estimated_drop_session_end",
        scopeType: "session",
        scopeKey: sessionId,
        userId,
        dropId,
        sourceLayer: "estimated",
        truthLabel: "estimated",
        confidenceScore: round(confidenceScore, 3),
        recoveredWatchTimeMs: estimatedWatchTimeMs,
        repairedCompletionCount: 0,
        repairedAtMs: nowMs,
        provenance: "stale_open_session_timeout",
      })
    }
  })

  input.watchAssets.forEach((record) => {
    const asset = record as WatchAssetRecord
    const sessionId = readString(asset.watchSessionId)
    const userId = readString(asset.userId)
    const dropId = readString(asset.dropId)
    const assetKey = readString(asset.assetKey)
    const userBucket = userId ? ensureBucket(userId, userBuckets) : undefined
    const dropBucket = dropId ? ensureBucket(dropId, dropBuckets) : undefined
    const repeatKey = `${userId || "anonymous"}::${dropId || "site"}::${assetKey || record.id}`
    const repeatCount = (repeatFileKeys.get(repeatKey) || 0) + 1
    repeatFileKeys.set(repeatKey, repeatCount)
    const durationSeconds = readNumber(asset.durationSeconds)
    const progressSeconds = Math.max(
      readNumber(asset.maxProgressSeconds),
      readNumber(asset.checkpointMaxSeconds),
    )
    const completionRatio = durationSeconds > 0 ? clamp01(progressSeconds / durationSeconds) : 0
    const estimatedCompletion = asset.isCompleted !== true && durationSeconds > 0 && completionRatio >= 0.92
    const repairedId = estimatedCompletion ? `repair_asset_${readString(record.id)}` : ""

    applyToAllScopes({
      globalBucket,
      dropBucket,
      userBucket,
      run: (bucket) => {
        bucket.totalFilePlays += 1
        if (repeatCount > 1) {
          bucket.repeatFilePlays += 1
        }
        if (estimatedCompletion) {
          bucket.estimatedFileCompletionCount += 1
          bucket.repairedCompletionCount += 1
          bucket.repairedDataCount += 1
        }
      },
    })

    if (estimatedCompletion) {
      repairs.set(repairedId, {
        repairId: repairedId,
        repairType: "estimated_file_completion",
        scopeType: "asset",
        scopeKey: readString(record.id),
        sessionId,
        userId,
        dropId,
        assetKey,
        sourceLayer: "estimated",
        truthLabel: "estimated",
        confidenceScore: 0.85,
        recoveredWatchTimeMs: 0,
        repairedCompletionCount: 1,
        repairedAtMs: nowMs,
        provenance: "asset_progress_ratio",
      })

      const existingSessionDoc = sessionDocs.get(sessionId)
      if (existingSessionDoc) {
        existingSessionDoc.estimated = {
          ...existingSessionDoc.estimated,
          estimatedCompletion: true,
        }
        existingSessionDoc.qualityLabel = existingSessionDoc.qualityLabel === "exact" ? "estimated" : existingSessionDoc.qualityLabel
        existingSessionDoc.confidenceScore = round(Math.max(0, existingSessionDoc.confidenceScore - 0.08), 3)
      }
    }
  })

  recoveredViewKeys.forEach((recoveryKey) => {
    if (validatedPresenceKeys.has(recoveryKey)) {
      return
    }

    const [userId, sessionId, dropId] = recoveryKey.split("::")
    const userBucket = userId && userId !== "anonymous" ? ensureBucket(userId, userBuckets) : undefined
    const dropBucket = dropId && dropId !== "site" ? ensureBucket(dropId, dropBuckets) : undefined
    applyToAllScopes({
      globalBucket,
      dropBucket,
      userBucket,
      run: (bucket) => {
        bucket.finalizedViewCount += 1
        bucket.estimatedRecoveredViewCount += 1
        bucket.repairedDataCount += 1
      },
    })
    const repairId = `repair_recovered_view_${recoveryKey.replace(/[^A-Za-z0-9:_-]+/gu, "_")}`
    repairs.set(repairId, {
      repairId,
      repairType: "estimated_recovered_view_count",
      scopeType: "session",
      scopeKey: recoveryKey,
      userId: userId === "anonymous" ? "" : userId,
      dropId: dropId === "site" ? "" : dropId,
      sessionId: sessionId === "unknown" ? "" : sessionId,
      sourceLayer: "estimated",
      truthLabel: "estimated",
      confidenceScore: 0.4,
      recoveredWatchTimeMs: 0,
      repairedCompletionCount: 0,
      repairedAtMs: nowMs,
      provenance: "raw_view_event_without_validated_session",
    })
  })

  const buildMetricDoc = (scopeType: "global" | "drop" | "user", scopeKey: string, bucket: CounterBucket, extra: Record<string, unknown> = {}) => {
    const uniqueViewerCount = bucket.uniqueViewerKeys.size
    const finalizedCompletionRate = bucket.finalizedViewCount > 0
      ? clamp01(bucket.finalizedCompletionCount / bucket.finalizedViewCount)
      : 0
    const estimatedDataRatio = clamp01((bucket.estimatedWatchTimeMs + (bucket.estimatedRecoveredViewCount * 1000)) / Math.max(1, bucket.finalizedWatchTimeMs + (bucket.finalizedViewCount * 1000)))
    const duplicateEventRate = clamp01(bucket.duplicateRawViewCount / Math.max(1, bucket.rawViewCount))
    const exactObservedRatio = clamp01(1 - estimatedDataRatio)
    const confidenceScore = round(clamp01(1 - (estimatedDataRatio * 0.65) - (duplicateEventRate * 0.2) - (bucket.rawCoverageGapCount > 0 ? 0.15 : 0)), 3)
    const qualityLabel = estimatedDataRatio === 0
      ? "exact"
      : estimatedDataRatio <= 0.15
        ? "estimated"
        : bucket.finalizedViewCount > 0
          ? "fallback"
          : "stale"

    return {
      scopeType,
      scopeKey,
      lastComputedAtMs: nowMs,
      freshnessTimestampMs: nowMs,
      freshnessLabel: "live",
      qualityLabel,
      confidenceScore,
      truthLayers: {
        raw: {
          truthLabel: "live",
          raw_view_count: bucket.rawViewCount,
          raw_preview_count: bucket.rawPreviewCount,
          raw_watch_time_ms: bucket.rawWatchTimeMs,
          raw_observation_count: bucket.rawObservationCount,
        },
        validated: {
          truthLabel: "validated",
          deduped_view_count: bucket.dedupedViewCount,
          unique_drop_viewer_count: uniqueViewerCount,
          total_drop_view_sessions: bucket.totalDropViewSessions,
          total_file_plays: bucket.totalFilePlays,
          repeat_file_plays: bucket.repeatFilePlays,
          deduped_watch_time_ms: bucket.dedupedWatchTimeMs,
          duplicate_event_rate: round(duplicateEventRate, 4),
          duplicate_event_count: bucket.duplicateRawViewCount,
        },
        finalized: {
          truthLabel: "finalized",
          finalized_view_count: bucket.finalizedViewCount,
          finalized_unique_viewers: uniqueViewerCount,
          finalized_watch_time_ms: bucket.finalizedWatchTimeMs,
          finalized_completion_rate: round(finalizedCompletionRate, 4),
          finalized_drop_session_count: bucket.finalizedViewCount,
          repeat_session_count: bucket.repeatSessionCount,
          abandonment_count: bucket.abandonmentCount,
          unlock_count: bucket.unlockCount,
        },
        estimated: {
          truthLabel: bucket.repairedDataCount > 0 ? "estimated" : "unknown",
          estimated_watch_time_ms: bucket.estimatedWatchTimeMs,
          estimated_recovered_view_count: bucket.estimatedRecoveredViewCount,
          estimated_drop_session_end: bucket.estimatedDropSessionEndCount,
          estimated_file_completion: bucket.estimatedFileCompletionCount,
          repaired_completion_count: bucket.repairedCompletionCount,
          recovered_sessions_count: bucket.recoveredSessionsCount,
          estimated_data_ratio: round(estimatedDataRatio, 4),
          exact_observed_ratio: round(exactObservedRatio, 4),
          raw_coverage_gap_count: bucket.rawCoverageGapCount,
        },
      },
      serving: {
        value: bucket.finalizedViewCount,
        truthLayer: bucket.repairedDataCount > 0 ? "estimated" : "finalized",
        freshnessTimestampMs: nowMs,
        provenance: "analytics_truth_reconciliation",
        confidenceScore,
        exactVsEstimated: bucket.repairedDataCount > 0 ? "estimated" : "exact",
      },
      sortFinalizedViewCount: bucket.finalizedViewCount,
      sortFinalizedWatchTimeMs: bucket.finalizedWatchTimeMs,
      repairedDataRatio: round(estimatedDataRatio, 4),
      ...extra,
    }
  }

  const globalDoc = buildMetricDoc("global", "latest", globalBucket, {
    summary: {
      duplicateRawViewCount: globalBucket.duplicateRawViewCount,
      duplicatePreviewCount: globalBucket.duplicatePreviewCount,
      estimatedRepairCount: repairs.size,
      sessionCount: input.watchSessions.length,
      rawObservationCoverageRatio: round((input.watchSessions.length - globalBucket.rawCoverageGapCount) / Math.max(1, input.watchSessions.length), 4),
      averageConfidenceScore: average(confidenceValues),
      legacyRangesLowConfidence: globalBucket.rawCoverageGapCount,
    },
  })

  const dropDocs = Array.from(dropBuckets.entries())
    .map(([dropId, bucket]) => buildMetricDoc("drop", dropId, bucket, {dropId}))
    .sort((left, right) => Number(right.sortFinalizedViewCount) - Number(left.sortFinalizedViewCount))
    .slice(0, ANALYTICS_TRUTH_MAX_DROP_WRITES)

  const userDocs = Array.from(userBuckets.entries())
    .map(([userId, bucket]) => buildMetricDoc("user", userId, bucket, {userId}))
    .sort((left, right) => Number(right.sortFinalizedViewCount) - Number(left.sortFinalizedViewCount))
    .slice(0, ANALYTICS_TRUTH_MAX_USER_WRITES)

  const sessionWriteDocs = Array.from(sessionDocs.values())
    .sort((left, right) => Number(right.finalized.finalizedSessionEndAtMs || 0) - Number(left.finalized.finalizedSessionEndAtMs || 0))
    .slice(0, ANALYTICS_TRUTH_MAX_SESSION_WRITES)

  const repairDocs = Array.from(repairs.values())
    .sort((left, right) => readNumber(right.repairedAtMs) - readNumber(left.repairedAtMs))
    .slice(0, ANALYTICS_TRUTH_MAX_REPAIR_WRITES)

  return {
    globalDoc,
    dropDocs,
    userDocs,
    sessionWriteDocs,
    repairDocs,
  }
}

async function writeAnalyticsTruthDocs(input: ReturnType<typeof buildAnalyticsTruthDocs>) {
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

  const queueSet = async (path: {collection: string; id: string}, payload: Record<string, unknown>) => {
    batch.set(db.collection(path.collection).doc(path.id), {
      ...payload,
      updatedAt: FieldValue.serverTimestamp(),
    }, {merge: true})
    operationCount += 1
    if (operationCount >= 400) {
      await commitIfNeeded()
    }
  }

  await queueSet({
    collection: ANALYTICS_TRUTH_COLLECTIONS.globalMetrics,
    id: "latest",
  }, input.globalDoc)

  for (const doc of input.dropDocs) {
    await queueSet({
      collection: ANALYTICS_TRUTH_COLLECTIONS.dropMetrics,
      id: readString(doc.scopeKey),
    }, doc)
  }

  for (const doc of input.userDocs) {
    await queueSet({
      collection: ANALYTICS_TRUTH_COLLECTIONS.userMetrics,
      id: readString(doc.scopeKey),
    }, doc)
  }

  for (const doc of input.sessionWriteDocs) {
    await queueSet({
      collection: ANALYTICS_TRUTH_COLLECTIONS.sessionMetrics,
      id: doc.sessionId,
    }, doc)
  }

  for (const doc of input.repairDocs) {
    await queueSet({
      collection: ANALYTICS_TRUTH_COLLECTIONS.repairs,
      id: doc.repairId,
    }, doc)
  }

  await queueSet({
    collection: ANALYTICS_TRUTH_COLLECTIONS.status,
    id: "summary",
  }, {
    lastComputedAtMs: Date.now(),
    globalScope: {
      finalizedViewCount: input.globalDoc.truthLayers.finalized.finalized_view_count,
      estimatedDataRatio: input.globalDoc.truthLayers.estimated.estimated_data_ratio,
      confidenceScore: input.globalDoc.confidenceScore,
    },
    userMetricCount: input.userDocs.length,
    dropMetricCount: input.dropDocs.length,
    sessionMetricCount: input.sessionWriteDocs.length,
    repairCount: input.repairDocs.length,
    freshnessLabel: "live",
  })

  await commitIfNeeded()
}

export async function rebuildAnalyticsTruthLayers() {
  const nowMs = Date.now()
  const sources = await readTruthSources(nowMs)
  const docs = buildAnalyticsTruthDocs(sources, nowMs)
  await writeAnalyticsTruthDocs(docs)
  logger.info("analytics truth layers rebuilt", {
    dropDocs: docs.dropDocs.length,
    userDocs: docs.userDocs.length,
    sessionDocs: docs.sessionWriteDocs.length,
    repairs: docs.repairDocs.length,
  })
}
