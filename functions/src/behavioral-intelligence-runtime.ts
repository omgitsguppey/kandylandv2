import {createHash} from "node:crypto"

import {FieldValue} from "firebase-admin/firestore"
import {logger} from "firebase-functions"

import {db} from "./firebase-admin.js"
import {readNumber, readString} from "./analytics-core.js"

const USER_PROFILE_COLLECTION = "behavioral_user_profiles"
const GUEST_PROFILE_COLLECTION = "behavioral_guest_profiles"
const DROP_INTELLIGENCE_COLLECTION = "behavioral_drop_intelligence"
const SNAPSHOT_STATUS_COLLECTION = "behavioral_intelligence_status"
const BEHAVIORAL_INTELLIGENCE_CURSOR_COLLECTION = "behavioral_intelligence_runtime_cursors"
const BEHAVIORAL_INTELLIGENCE_CURSOR_ID = "default"

const WINDOW_MS = 45 * 24 * 60 * 60 * 1000
const BEHAVIORAL_INTELLIGENCE_BOOTSTRAP_WINDOW_MS = 24 * 60 * 60 * 1000
const BEHAVIORAL_INTELLIGENCE_CURSOR_OVERLAP_MS = 5 * 60 * 1000
const STALE_AFTER_MS = 24 * 60 * 60 * 1000
const RECENT_EVENT_LIMIT = 5000
const RECENT_WATCH_LIMIT = 3000
const RECENT_GUEST_LIMIT = 2000
const RECENT_FEEDBACK_LIMIT = 3000
const MAX_USER_PROFILE_WRITES = 500
const MAX_GUEST_PROFILE_WRITES = 250
const MAX_DROP_PROFILE_WRITES = 500

const SOURCE_RELIABILITY_WEIGHTS = {
  server_transaction: 1,
  server_entitlement_unlock: 1,
  watch_session_rollup: 0.95,
  server_creator_relationship: 0.9,
  identified_event_fact: 0.75,
  client_ui_event: 0.6,
  guest_batch: 0.45,
  legacy_page_duration: 0.2,
} as const
const SEARCH_INTENT_HALF_LIFE_HOURS = 24
const SATISFACTION_SIGNAL_HALF_LIFE_DAYS = 30
const PRIVACY_LIMITED_RECOMMENDATION_CONFIDENCE_CAP = 0.34

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
type MetricFactRecord = Record<string, unknown>
type WatchSessionRecord = Record<string, unknown>
type GuestBatchRecord = Record<string, unknown>
type FeedbackRecord = Record<string, unknown>
type RelationshipRecord = Record<string, unknown>
type UserRecord = Record<string, unknown>
type BuiltUserProfileDoc = ReturnType<typeof buildUserProfileDoc>

type BehavioralIntelligenceRuntimeWindow = {
  windowStartMs: number
  windowMode: "cursor" | "bootstrap" | "full_rebuild"
  lastSuccessfulRunAtMs: number
  fullRebuild: boolean
}

type SatisfactionAggregateRecord = {
  positiveCount: number
  negativeCount: number
  skippedCount: number
  helpfulReasonCount: number
  notHelpfulReasonCount: number
  latestAtMs: number
  eventNames: Set<string>
}

type UserSignalAggregate = {
  userId: string
  eventCount: number
  watchSessionCount: number
  purchaseCount: number
  serverPurchaseCount: number
  walletOpenCount: number
  checkoutStartCount: number
  previewOpenCount: number
  viewerOpenCount: number
  unlockCount: number
  serverUnlockCount: number
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
  negativeCreatorIds: Set<string>
  mutedCreatorIds: Set<string>
  negativeCategoryScores: Map<string, number>
  repeatedSkipDropIds: Map<string, number>
  lowWatchAfterRecommendationDropIds: Map<string, number>
  negativePreferenceLatestAtMs: number
  negativePreferenceLatestByDrop: Map<string, number>
  negativePreferenceLatestByCreator: Map<string, number>
  negativePreferenceLatestByCategory: Map<string, number>
  negativePreferenceEventNamesByDrop: Map<string, Set<string>>
  negativePreferenceEventNamesByCreator: Map<string, Set<string>>
  negativePreferenceEventNamesByCategory: Map<string, Set<string>>
  searchIntentTokens: Map<string, number>
  searchIntentCategories: Map<string, number>
  searchIntentCreatorIds: Map<string, number>
  searchIntentFilters: Map<string, number>
  searchIntentSorts: Map<string, number>
  searchIntentQueryClusters: Map<string, number>
  searchIntentClasses: Map<string, number>
  searchIntentQueryLengths: number[]
  searchIntentSessionIds: Set<string>
  searchIntentLatestAtMs: number
  satisfactionLatestAtMs: number
  satisfactionDrops: Map<string, SatisfactionAggregateRecord>
  satisfactionCreators: Map<string, SatisfactionAggregateRecord>
  satisfactionCategories: Map<string, SatisfactionAggregateRecord>
  satisfactionRecommendationReasons: Map<string, SatisfactionAggregateRecord>
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
    serverTransactions: number[]
    serverUnlocks: number[]
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
  impressions1h: number
  impressions6h: number
  impressions24h: number
  previewOpens: number
  previewOpens1h: number
  previewOpens6h: number
  viewerOpens: number
  viewerOpens6h: number
  viewerOpens24h: number
  watchSecondsTotal: number
  watchSecondsSamples: number[]
  watchScores: number[]
  watchScoreSources: Set<string>
  completionCount: number
  validWatchCompletions6h: number
  unlocks: number
  unlocks6h: number
  purchasesAfterView24h: number
  uniqueViewerIds: Set<string>
  repeatViewerIds: Set<string>
  positiveFeedbackCount: number
  negativeFeedbackCount: number
  satisfactionScoreTotal: number
  satisfactionSampleCount: number
  satisfactionLatestAtMs: number
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

function clampScore(value: number) {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.max(0, Math.min(100, value))
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

function numberMapToObject(map: Map<string, number>, limit = 24) {
  return Object.fromEntries(
    Array.from(map.entries())
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, limit)
      .map(([key, value]) => [key, round(value)]),
  )
}

function unionKeys(...collections: Array<Iterable<string>>) {
  const keys = new Set<string>()
  collections.forEach((collection) => {
    Array.from(collection).forEach((key) => {
      if (key) {
        keys.add(key)
      }
    })
  })
  return Array.from(keys)
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

function readRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function readStringFromRecord(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    const stringValue = readString(value)
    if (stringValue) {
      return stringValue
    }
  }

  return ""
}

function readNumberFromRecord(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = readNumber(record[key])
    if (value > 0) {
      return value
    }
  }

  return 0
}

function normalizeSearchIntentToken(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/gu, "_")
    .replace(/^_+|_+$/gu, "")
    .slice(0, 40)
}

function readTokenList(record: Record<string, unknown>) {
  const value = record.normalized_query_tokens || record.normalizedQueryTokens || record.search_query_tokens || record.searchQueryTokens
  if (Array.isArray(value)) {
    return value
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => normalizeSearchIntentToken(entry))
      .filter(Boolean)
      .slice(0, 8)
  }

  return readString(value)
    .split(",")
    .map((entry) => normalizeSearchIntentToken(entry))
    .filter(Boolean)
    .slice(0, 8)
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

function countMapIncrement(map: Map<string, number>, key: string, amount = 1) {
  if (!key || !Number.isFinite(amount) || amount <= 0) {
    return
  }

  map.set(key, Math.round((map.get(key) || 0) + amount))
}

function setTimestampMax(map: Map<string, number>, key: string, timestamp: number) {
  if (!key || !Number.isFinite(timestamp) || timestamp <= 0) {
    return
  }

  map.set(key, Math.max(map.get(key) || 0, timestamp))
}

function addEventName(map: Map<string, Set<string>>, key: string, eventName: string) {
  if (!key || !eventName) {
    return
  }

  const names = map.get(key) ?? new Set<string>()
  names.add(eventName)
  map.set(key, names)
}

function ensureSatisfactionRecord(map: Map<string, SatisfactionAggregateRecord>, key: string) {
  const existing = map.get(key)
  if (existing) {
    return existing
  }

  const created: SatisfactionAggregateRecord = {
    positiveCount: 0,
    negativeCount: 0,
    skippedCount: 0,
    helpfulReasonCount: 0,
    notHelpfulReasonCount: 0,
    latestAtMs: 0,
    eventNames: new Set<string>(),
  }
  map.set(key, created)
  return created
}

function updateSatisfactionRecord(input: {
  map: Map<string, SatisfactionAggregateRecord>
  key: string
  normalizedAction: string
  timestamp: number
  eventName: string
}) {
  if (!input.key) {
    return
  }

  const record = ensureSatisfactionRecord(input.map, input.key)
  if (input.normalizedAction === "content_satisfaction_positive") {
    record.positiveCount += 1
  } else if (input.normalizedAction === "content_satisfaction_negative") {
    record.negativeCount += 1
  } else if (input.normalizedAction === "content_satisfaction_skipped") {
    record.skippedCount += 1
  } else if (input.normalizedAction === "recommendation_reason_helpful") {
    record.helpfulReasonCount += 1
  } else if (input.normalizedAction === "recommendation_reason_not_helpful") {
    record.notHelpfulReasonCount += 1
  }
  record.latestAtMs = Math.max(record.latestAtMs, input.timestamp)
  record.eventNames.add(input.eventName)
}

function buildSatisfactionRecord(input: {
  entityId: string
  record: SatisfactionAggregateRecord
}) {
  const total = input.record.positiveCount
    + input.record.negativeCount
    + input.record.skippedCount
    + input.record.helpfulReasonCount
    + input.record.notHelpfulReasonCount
  const satisfactionScore = total > 0
    ? clamp01(((input.record.positiveCount + input.record.helpfulReasonCount) + (input.record.skippedCount * 0.5)) / total)
    : 0.5

  return {
    entityId: input.entityId,
    latestAtMs: input.record.latestAtMs,
    positiveCount: input.record.positiveCount,
    negativeCount: input.record.negativeCount,
    skippedCount: input.record.skippedCount,
    helpfulReasonCount: input.record.helpfulReasonCount,
    notHelpfulReasonCount: input.record.notHelpfulReasonCount,
    satisfactionScore: round(satisfactionScore, 4),
    eventNames: Array.from(input.record.eventNames),
  }
}

function recordSatisfactionSignal(input: {
  aggregate: UserSignalAggregate
  event: Record<string, unknown>
  eventName: string
  normalizedAction: string
  timestamp: number
  dropId?: string
  creatorId?: string
  category?: string
}) {
  const aggregate = input.aggregate
  const params = readRecord(input.event.params)
  const recommendationId = readString(input.event.actionEntityId)
    || readStringFromRecord(params, "recommendation_id", "recommendationId")
  aggregate.feedbackCount += 1
  aggregate.sourceTimestamps.feedbacks.push(input.timestamp)
  aggregate.satisfactionLatestAtMs = Math.max(aggregate.satisfactionLatestAtMs, input.timestamp)

  if (input.normalizedAction === "content_satisfaction_positive" || input.normalizedAction === "recommendation_reason_helpful") {
    aggregate.positiveFeedbackCount += 1
  }
  if (input.normalizedAction === "content_satisfaction_negative" || input.normalizedAction === "recommendation_reason_not_helpful") {
    aggregate.negativeFeedbackCount += 1
  }

  if (input.dropId) {
    updateSatisfactionRecord({
      map: aggregate.satisfactionDrops,
      key: input.dropId,
      normalizedAction: input.normalizedAction,
      timestamp: input.timestamp,
      eventName: input.eventName,
    })
  }
  if (input.creatorId) {
    updateSatisfactionRecord({
      map: aggregate.satisfactionCreators,
      key: input.creatorId,
      normalizedAction: input.normalizedAction,
      timestamp: input.timestamp,
      eventName: input.eventName,
    })
  }
  if (input.category) {
    updateSatisfactionRecord({
      map: aggregate.satisfactionCategories,
      key: input.category,
      normalizedAction: input.normalizedAction,
      timestamp: input.timestamp,
      eventName: input.eventName,
    })
  }
  if (recommendationId) {
    updateSatisfactionRecord({
      map: aggregate.satisfactionRecommendationReasons,
      key: recommendationId,
      normalizedAction: input.normalizedAction,
      timestamp: input.timestamp,
      eventName: input.eventName,
    })
  }
}

function recordNegativePreference(input: {
  aggregate: UserSignalAggregate
  eventName: string
  timestamp: number
  dropId?: string
  creatorId?: string
  category?: string
  explicitDrop?: boolean
  explicitCreator?: boolean
  explicitCategory?: boolean
  creatorMuted?: boolean
  recommendationDismissed?: boolean
}) {
  const aggregate = input.aggregate
  aggregate.feedbackCount += 1
  aggregate.negativeFeedbackCount += 1
  aggregate.sourceTimestamps.feedbacks.push(input.timestamp)
  aggregate.negativePreferenceLatestAtMs = Math.max(aggregate.negativePreferenceLatestAtMs, input.timestamp)

  if (input.dropId) {
    setTimestampMax(aggregate.negativePreferenceLatestByDrop, input.dropId, input.timestamp)
    addEventName(aggregate.negativePreferenceEventNamesByDrop, input.dropId, input.eventName)
    if (input.explicitDrop) {
      aggregate.negativeDropIds.add(input.dropId)
    }
    if (input.recommendationDismissed) {
      countMapIncrement(aggregate.repeatedSkipDropIds, input.dropId)
    }
  }

  if (input.creatorId) {
    setTimestampMax(aggregate.negativePreferenceLatestByCreator, input.creatorId, input.timestamp)
    addEventName(aggregate.negativePreferenceEventNamesByCreator, input.creatorId, input.eventName)
    if (input.explicitCreator || input.creatorMuted) {
      aggregate.negativeCreatorIds.add(input.creatorId)
    }
    if (input.creatorMuted) {
      aggregate.mutedCreatorIds.add(input.creatorId)
    }
  }

  if (input.category) {
    setTimestampMax(aggregate.negativePreferenceLatestByCategory, input.category, input.timestamp)
    addEventName(aggregate.negativePreferenceEventNamesByCategory, input.category, input.eventName)
    scoreMapIncrement(aggregate.negativeCategoryScores, input.category, input.explicitCategory ? 1 : 0.35)
  }
}

function recordSearchIntent(input: {
  aggregate: UserSignalAggregate
  event: Record<string, unknown>
  normalizedAction: string
  sessionId: string
  timestamp: number
  category: string
  creatorId: string
}) {
  const params = readRecord(input.event.params)
  const aggregate = input.aggregate
  const actionEntityId = readString(input.event.actionEntityId)
  const category = normalizeSearchIntentToken(
    input.category
    || readString(input.event.dropCategory)
    || readStringFromRecord(params, "category", "category_id", "categoryId", "drop_category", "dropCategory"),
  )
  const creatorId = normalizeSearchIntentToken(
    input.creatorId
    || readString(input.event.creatorId)
    || readString(input.event.actionCreatorId)
    || readString(input.event.targetCreatorId)
    || readStringFromRecord(params, "creator_id", "creatorId", "target_creator_id", "targetCreatorId"),
  )
  const filterValue = normalizeSearchIntentToken(readStringFromRecord(params, "filter_value", "filterValue", "category"))
  const sortValue = normalizeSearchIntentToken(readStringFromRecord(params, "sort", "sort_key", "sortKey"))
  const queryCluster = normalizeSearchIntentToken(readStringFromRecord(params, "normalized_query_cluster", "normalizedQueryCluster", "query_cluster", "queryCluster") || actionEntityId)
  const intentClass = normalizeSearchIntentToken(readStringFromRecord(params, "intent_class", "intentClass") || "general")
  const queryLength = readNumberFromRecord(params, "query_length", "queryLength")
  const tokens = readTokenList(params)

  aggregate.searchIntentLatestAtMs = Math.max(aggregate.searchIntentLatestAtMs, input.timestamp)
  if (input.sessionId) {
    aggregate.searchIntentSessionIds.add(input.sessionId)
  }
  tokens.forEach((token) => scoreMapIncrement(aggregate.searchIntentTokens, token, 1))
  if (queryCluster) {
    scoreMapIncrement(aggregate.searchIntentQueryClusters, queryCluster, 1)
  }
  if (queryLength > 0) {
    aggregate.searchIntentQueryLengths.push(queryLength)
  }
  if (intentClass) {
    scoreMapIncrement(aggregate.searchIntentClasses, intentClass, 1)
  }
  if (input.normalizedAction === "category_clicked" || category) {
    scoreMapIncrement(aggregate.searchIntentCategories, category || actionEntityId, 1)
  }
  if (input.normalizedAction === "creator_search_selected" || creatorId) {
    scoreMapIncrement(aggregate.searchIntentCreatorIds, creatorId || actionEntityId, 1)
  }
  if (input.normalizedAction === "filter_selected" && filterValue) {
    scoreMapIncrement(aggregate.searchIntentFilters, filterValue, 1)
  }
  if (input.normalizedAction === "sort_changed" && sortValue) {
    scoreMapIncrement(aggregate.searchIntentSorts, sortValue, 1)
  }
}

function deriveExperienceKey(input: {
  normalizedAction: string
  pagePath: string
}) {
  const normalizedAction = input.normalizedAction.toLowerCase()
  const pagePath = input.pagePath.toLowerCase()

  if (normalizedAction.includes("wallet") || pagePath.includes("/wallet")) {
    return "wallet"
  }
  if (normalizedAction.includes("support") || pagePath.includes("/support")) {
    return "support"
  }
  if (normalizedAction.includes("creator") || pagePath.includes("/creator")) {
    return "creator"
  }
  if (normalizedAction.includes("experience") || pagePath.includes("/experiences")) {
    return "experience_hub"
  }
  if (normalizedAction.includes("watch") || normalizedAction.includes("file_viewed") || pagePath.includes("/viewer")) {
    return "viewer"
  }
  if (normalizedAction.includes("chat") || normalizedAction.includes("message") || pagePath.includes("/messages")) {
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

function computeBehavioralTruthConfidence(input: {
  agreeingSources: number
  availableSources: number
  ageMs: number
  maxFreshnessMs: number
  sampleCount: number
  requiredFieldsPresent: number
  requiredFieldsTotal: number
  issueCount: number
}) {
  const availableSources = Math.max(0, input.availableSources)
  const agreeingSources = Math.max(0, Math.min(input.agreeingSources, availableSources))
  const requiredFieldsTotal = Math.max(1, input.requiredFieldsTotal)
  const sourceAgreement = availableSources > 0 ? agreeingSources / availableSources : 0
  const freshnessScore = input.maxFreshnessMs > 0
    ? Math.max(0, 1 - (Math.max(0, input.ageMs) / input.maxFreshnessMs))
    : 0
  const sampleScore = Math.min(1, Math.log10(Math.max(0, input.sampleCount) + 1) / 3)
  const schemaScore = Math.max(0, Math.min(input.requiredFieldsPresent, requiredFieldsTotal)) / requiredFieldsTotal
  const issuePenalty = Math.min(0.6, Math.max(0, input.issueCount) * 0.12)

  const normalizedScore = clamp01(
    (0.35 * sourceAgreement) +
    (0.25 * freshnessScore) +
    (0.25 * sampleScore) +
    (0.15 * schemaScore) -
    issuePenalty,
  )
  const score = Math.round(normalizedScore * 100)
  const label = score >= 90
    ? "verified"
    : score >= 75
      ? "strong"
      : score >= 50
        ? "usable"
        : score >= 30
          ? "low"
          : "insufficient"

  return {
    score,
    normalizedScore,
    label,
  }
}

function computeBehavioralTruthScore(input: {
  sourceReliability: number
  freshnessScore: number
  sampleScore: number
  schemaCompleteness: number
  sourceDisagreementPenalty: number
}) {
  return clamp01(
    (0.40 * clamp01(input.sourceReliability)) +
    (0.25 * clamp01(input.freshnessScore)) +
    (0.20 * clamp01(input.sampleScore)) +
    (0.10 * clamp01(input.schemaCompleteness)) -
    (0.05 * clamp01(input.sourceDisagreementPenalty)),
  )
}

function computeDropRecommendationScore(input: {
  pPurchase7d: number
  pUnlock24h: number
  pWatchComplete: number
  pReturn7d: number
  freshness: number
  urgency: number
  fatiguePenalty: number
  repeatExposurePenalty: number
  diversityBoost: number
}) {
  const baseScore = 100 * (
    (0.35 * clamp01(input.pPurchase7d)) +
    (0.25 * clamp01(input.pUnlock24h)) +
    (0.20 * clamp01(input.pWatchComplete)) +
    (0.10 * clamp01(input.pReturn7d)) +
    (0.05 * clamp01(input.freshness)) +
    (0.05 * clamp01(input.urgency))
  )

  return Math.max(0, Math.min(100, baseScore - input.fatiguePenalty - input.repeatExposurePenalty + input.diversityBoost))
}

function readSourceTruth(record: Record<string, unknown>) {
  return readString(record.sourceTruth || record.normalizedActionSourceTruth).toLowerCase()
}

function isCanonicalMetricSource(record: Record<string, unknown>) {
  const sourceTruth = readSourceTruth(record)
  return sourceTruth === "server"
    || sourceTruth === "canonical"
    || sourceTruth === "materialized"
    || sourceTruth === "server_transaction"
    || sourceTruth === "server_entitlement_unlock"
    || sourceTruth === "watch_session_rollup"
}

function readMetricName(record: Record<string, unknown>) {
  return readString(record.metricName).toLowerCase()
}

function buildCanonicalMetricFacts(input: {
  eventFacts: AnalyticsEventFactRecord[]
  watchSessions: WatchSessionRecord[]
}) {
  const metricFacts: MetricFactRecord[] = []

  input.eventFacts.forEach((record) => {
    const normalizedAction = readNormalizedAction(record)
    if (!normalizedAction || record.metricEligible === false || !isCanonicalMetricSource(record)) {
      return
    }

    if (normalizedAction === "gumdrops_purchased") {
      metricFacts.push({
        metricName: "gumdrops_purchased",
        eventId: readString(record.eventId) || readString(record.id),
        actorUserId: readString(record.actorUserId) || readString(record.userId),
        targetDropId: readString(record.targetDropId) || readString(record.dropId),
        transactionId: readString(record.transactionId),
        sourceTruth: readSourceTruth(record) || "canonical",
        sourceReliability: readNumber(record.sourceConfidence) || 1,
        value: readNumber(record.valueUsd) || readNumber(record.gumDropsAmount) || 1,
        timestampMs: readNumber(record.timestamp) || Date.now(),
        provenance: "server_transaction",
      })
      return
    }

    if (normalizedAction === "drop_unlocked") {
      metricFacts.push({
        metricName: "drop_unlocked",
        eventId: readString(record.eventId) || readString(record.id),
        actorUserId: readString(record.actorUserId) || readString(record.userId),
        targetDropId: readString(record.targetDropId) || readString(record.dropId),
        transactionId: readString(record.transactionId),
        sourceTruth: readSourceTruth(record) || "canonical",
        sourceReliability: readNumber(record.sourceConfidence) || 1,
        value: 1,
        timestampMs: readNumber(record.timestamp) || Date.now(),
        provenance: "server_entitlement",
      })
    }
  })

  input.watchSessions.forEach((record) => {
    const watchScoreSource = readString(record.watchScoreSource)
    const validWatchMs = readNumber(record.validWatchMs)
    if (watchScoreSource !== "watch_session_rollup" || validWatchMs <= 0) {
      return
    }

    metricFacts.push({
      metricName: "watch_session_verified",
      eventId: readString(record.watchSessionId) || readString(record.id),
      actorUserId: readString(record.userId),
      targetDropId: readString(record.dropId),
      sourceTruth: "watch_session_rollup",
      sourceReliability: 0.95,
      value: validWatchMs,
      timestampMs: readNumber(record.lastSeenAtMs) || Date.now(),
      provenance: "watch_session_rollup",
    })
  })

  return metricFacts
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
    purchaseCount: 0,
    serverPurchaseCount: 0,
    walletOpenCount: 0,
    checkoutStartCount: 0,
    previewOpenCount: 0,
    viewerOpenCount: 0,
    unlockCount: 0,
    serverUnlockCount: 0,
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
    negativeCreatorIds: new Set(),
    mutedCreatorIds: new Set(),
    negativeCategoryScores: new Map(),
    repeatedSkipDropIds: new Map(),
    lowWatchAfterRecommendationDropIds: new Map(),
    negativePreferenceLatestAtMs: 0,
    negativePreferenceLatestByDrop: new Map(),
    negativePreferenceLatestByCreator: new Map(),
    negativePreferenceLatestByCategory: new Map(),
    negativePreferenceEventNamesByDrop: new Map(),
    negativePreferenceEventNamesByCreator: new Map(),
    negativePreferenceEventNamesByCategory: new Map(),
    searchIntentTokens: new Map(),
    searchIntentCategories: new Map(),
    searchIntentCreatorIds: new Map(),
    searchIntentFilters: new Map(),
    searchIntentSorts: new Map(),
    searchIntentQueryClusters: new Map(),
    searchIntentClasses: new Map(),
    searchIntentQueryLengths: [],
    searchIntentSessionIds: new Set(),
    searchIntentLatestAtMs: 0,
    satisfactionLatestAtMs: 0,
    satisfactionDrops: new Map(),
    satisfactionCreators: new Map(),
    satisfactionCategories: new Map(),
    satisfactionRecommendationReasons: new Map(),
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
      serverTransactions: [],
      serverUnlocks: [],
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
    impressions1h: 0,
    impressions6h: 0,
    impressions24h: 0,
    previewOpens: 0,
    previewOpens1h: 0,
    previewOpens6h: 0,
    viewerOpens: 0,
    viewerOpens6h: 0,
    viewerOpens24h: 0,
    watchSecondsTotal: 0,
    watchSecondsSamples: [],
    watchScores: [],
    watchScoreSources: new Set(),
    completionCount: 0,
    validWatchCompletions6h: 0,
    unlocks: 0,
    unlocks6h: 0,
    purchasesAfterView24h: 0,
    uniqueViewerIds: new Set(),
    repeatViewerIds: new Set(),
    positiveFeedbackCount: 0,
    negativeFeedbackCount: 0,
    satisfactionScoreTotal: 0,
    satisfactionSampleCount: 0,
    satisfactionLatestAtMs: 0,
    latestAtMs: 0,
    last24hInteractions: 0,
    last7dInteractions: 0,
  }
  store.set(drop.id, created)
  return created
}

function isWithinDropLaunchHours(aggregate: DropSignalAggregate, timestamp: number, hours: number) {
  return aggregate.validFrom > 0
    && timestamp >= aggregate.validFrom
    && timestamp <= aggregate.validFrom + (hours * 60 * 60 * 1000)
}

function isActionEvent(normalizedAction: string) {
  return Boolean(normalizedAction) && ![
    "home_viewed",
    "drop_card_viewed",
  ].includes(normalizedAction)
}

function readNormalizedAction(record: Record<string, unknown>) {
  const explicit = readString(record.normalizedActionName)
  if (explicit) {
    return explicit.toLowerCase()
  }

  return ""
}

function buildBehavioralSourceBreakdown(input: {
  aggregate: UserSignalAggregate
  watchScoreSource: string
}) {
  return {
    runtimeFacts: ["analytics_event_facts"],
    metricFacts: [
      input.aggregate.serverPurchaseCount > 0 ? "server_transaction_truth" : "",
      input.aggregate.serverUnlockCount > 0 ? "server_entitlement_truth" : "",
      input.aggregate.watchSessionCount > 0 ? "analytics_watch_sessions" : "",
      input.aggregate.sourceTimestamps.relationships.length > 0 ? "creator_relationships" : "",
    ].filter(Boolean),
    diagnostics: [
      input.watchScoreSource === "legacy_page_duration" ? "legacy_page_duration" : "",
      input.aggregate.purchaseCount > input.aggregate.serverPurchaseCount ? "client_purchase_context_only" : "",
      input.aggregate.unlockCount > input.aggregate.serverUnlockCount ? "client_unlock_context_only" : "",
    ].filter(Boolean),
  }
}

function buildMaterializerIssues(issueCodes: string[]) {
  return issueCodes.map((code) => ({
    code,
    severity: code.includes("stale") || code.includes("missing") ? "warn" : "info",
    message: code.replace(/_/g, " "),
  }))
}

function resolveMaterializerFreshnessState(input: {
  latestSourceAtMs: number
  nowMs: number
  diagnostics: string[]
}) {
  if (!input.latestSourceAtMs) {
    return "unavailable"
  }
  if (input.nowMs - input.latestSourceAtMs > STALE_AFTER_MS) {
    return "stale"
  }
  if (input.diagnostics.length > 0) {
    return "diagnostic_fallback"
  }
  return "live"
}

async function resolveBehavioralIntelligenceRuntimeWindow(input: {
  nowMs: number
  fullRebuild?: boolean
}): Promise<BehavioralIntelligenceRuntimeWindow> {
  if (input.fullRebuild === true) {
    return {
      windowStartMs: input.nowMs - WINDOW_MS,
      windowMode: "full_rebuild",
      lastSuccessfulRunAtMs: 0,
      fullRebuild: true,
    }
  }

  const cursorSnap = await db.collection(BEHAVIORAL_INTELLIGENCE_CURSOR_COLLECTION)
    .doc(BEHAVIORAL_INTELLIGENCE_CURSOR_ID)
    .get()
  const cursorData = cursorSnap.exists ? cursorSnap.data() || {} : {}
  const lastSuccessfulRunAtMs = readNumber(cursorData.lastSuccessfulRunAtMs)

  if (lastSuccessfulRunAtMs > 0) {
    return {
      windowStartMs: Math.max(
        input.nowMs - WINDOW_MS,
        lastSuccessfulRunAtMs - BEHAVIORAL_INTELLIGENCE_CURSOR_OVERLAP_MS,
      ),
      windowMode: "cursor",
      lastSuccessfulRunAtMs,
      fullRebuild: false,
    }
  }

  return {
    windowStartMs: input.nowMs - BEHAVIORAL_INTELLIGENCE_BOOTSTRAP_WINDOW_MS,
    windowMode: "bootstrap",
    lastSuccessfulRunAtMs: 0,
    fullRebuild: false,
  }
}

async function readChangedSupportingCollections(input: {
  windowStartMs: number
  nowMs: number
  fullRebuild: boolean
}) {
  if (input.fullRebuild) {
    const [dropsSnapshot, relationshipsSnapshot] = await Promise.all([
      db.collection("drops")
        .orderBy("validFrom", "desc")
        .limit(MAX_DROP_PROFILE_WRITES)
        .get(),
      db.collection("creator_relationships")
        .orderBy("updatedAt", "desc")
        .limit(MAX_USER_PROFILE_WRITES)
        .get(),
    ])

    return {
      drops: dropsSnapshot.docs.map((doc) => ({id: doc.id, ...(doc.data() as Record<string, unknown>)})),
      relationships: relationshipsSnapshot.docs.map((doc) => ({id: doc.id, ...(doc.data() as Record<string, unknown>)})),
    }
  }

  const [dropsSnapshot, relationshipsSnapshot] = await Promise.all([
    db.collection("drops")
      .where("validFrom", ">=", input.windowStartMs)
      .orderBy("validFrom", "desc")
      .limit(MAX_DROP_PROFILE_WRITES)
      .get(),
    db.collection("creator_relationships")
      .where("updatedAt", ">=", new Date(input.windowStartMs))
      .orderBy("updatedAt", "desc")
      .limit(MAX_USER_PROFILE_WRITES)
      .get(),
  ])

  return {
    drops: dropsSnapshot.docs.map((doc) => ({id: doc.id, ...(doc.data() as Record<string, unknown>)})),
    relationships: relationshipsSnapshot.docs.map((doc) => ({id: doc.id, ...(doc.data() as Record<string, unknown>)})),
  }
}

async function readRecentCollections(nowMs: number, options: {fullRebuild?: boolean} = {}) {
  const runtimeWindow = await resolveBehavioralIntelligenceRuntimeWindow({
    nowMs,
    fullRebuild: options.fullRebuild,
  })
  const windowStartMs = runtimeWindow.windowStartMs

  const [
    eventFactsSnapshot,
    watchSessionsSnapshot,
    guestBatchesSnapshot,
    feedbackSnapshot,
    supportingCollections,
  ] = await Promise.all([
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
    readChangedSupportingCollections({
      windowStartMs,
      nowMs,
      fullRebuild: runtimeWindow.fullRebuild,
    }),
  ])

  return {
    windowStartMs,
    windowMode: runtimeWindow.windowMode,
    fullRebuild: runtimeWindow.fullRebuild,
    lastSuccessfulRunAtMs: runtimeWindow.lastSuccessfulRunAtMs,
    drops: supportingCollections.drops,
    eventFacts: eventFactsSnapshot.docs.map((doc) => ({id: doc.id, ...(doc.data() as Record<string, unknown>)})),
    watchSessions: watchSessionsSnapshot.docs.map((doc) => ({id: doc.id, ...(doc.data() as Record<string, unknown>)})),
    guestBatches: guestBatchesSnapshot.docs.map((doc) => ({id: doc.id, ...(doc.data() as Record<string, unknown>)})),
    feedbacks: feedbackSnapshot.docs.map((doc) => ({id: doc.id, ...(doc.data() as Record<string, unknown>)})),
    relationships: supportingCollections.relationships,
    metricFacts: buildCanonicalMetricFacts({
      eventFacts: eventFactsSnapshot.docs.map((doc) => ({id: doc.id, ...(doc.data() as Record<string, unknown>)})),
      watchSessions: watchSessionsSnapshot.docs.map((doc) => ({id: doc.id, ...(doc.data() as Record<string, unknown>)})),
    }),
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
    const normalizedAction = readNormalizedAction(event)
    const userId = readString(event.userId)
    const sessionId = readString(event.sessionId)
    const dropId = readString(event.dropId)
    const timestamp = readNumber(event.timestamp) || nowMs
    const params = readRecord(event.params)
    const drop = dropId ? dropMap.get(dropId) : undefined
    const eventCreatorId = readString(event.creatorId) || readString(event.actionCreatorId) || readString(event.targetCreatorId)
    const creatorId = drop ? readString(drop.creatorId) : eventCreatorId
    const category = drop
      ? readString(drop.type)
      : readString(event.dropCategory)
        || readString(event.category)
        || readStringFromRecord(params, "drop_category", "dropCategory", "category")
        || (normalizedAction === "category_not_interested" ? readString(event.actionEntityId) : "")
    const tags = drop ? normalizeTags(drop.tags) : []
    const pagePath = readString(event.pagePath)
    const experienceKey = deriveExperienceKey({
      normalizedAction,
      pagePath,
    })
    const isNegativePreferenceAction = normalizedAction === "drop_not_interested"
      || normalizedAction === "creator_not_interested"
      || normalizedAction === "category_not_interested"
      || normalizedAction === "creator_muted"
      || normalizedAction === "recommendation_dismissed"
    const isSearchIntentAction = normalizedAction === "search_query_submitted"
      || normalizedAction === "filter_selected"
      || normalizedAction === "sort_changed"
      || normalizedAction === "category_clicked"
      || normalizedAction === "creator_search_selected"
    const isSatisfactionAction = normalizedAction === "content_satisfaction_positive"
      || normalizedAction === "content_satisfaction_negative"
      || normalizedAction === "content_satisfaction_skipped"
      || normalizedAction === "recommendation_reason_helpful"
      || normalizedAction === "recommendation_reason_not_helpful"
    const isNegativeSatisfactionAction = normalizedAction === "content_satisfaction_negative"
      || normalizedAction === "recommendation_reason_not_helpful"

    if (drop && dropId) {
      const dropAggregate = ensureDropAggregate(drop, dropAggregates)
      if (normalizedAction === "drop_card_viewed") {
        dropAggregate.impressions += 1
        if (isWithinDropLaunchHours(dropAggregate, timestamp, 1)) {
          dropAggregate.impressions1h += 1
        }
        if (isWithinDropLaunchHours(dropAggregate, timestamp, 6)) {
          dropAggregate.impressions6h += 1
        }
        if (isWithinDropLaunchHours(dropAggregate, timestamp, 24)) {
          dropAggregate.impressions24h += 1
        }
      }
      if (normalizedAction === "drop_preview_opened" || normalizedAction === "drop_viewed") {
        dropAggregate.previewOpens += 1
        if (isWithinDropLaunchHours(dropAggregate, timestamp, 1)) {
          dropAggregate.previewOpens1h += 1
        }
        if (isWithinDropLaunchHours(dropAggregate, timestamp, 6)) {
          dropAggregate.previewOpens6h += 1
        }
      }
      if (normalizedAction === "watch_session_started" || normalizedAction === "file_viewed") {
        dropAggregate.viewerOpens += 1
        if (isWithinDropLaunchHours(dropAggregate, timestamp, 6)) {
          dropAggregate.viewerOpens6h += 1
        }
        if (isWithinDropLaunchHours(dropAggregate, timestamp, 24)) {
          dropAggregate.viewerOpens24h += 1
        }
      }
      if (isNegativePreferenceAction) {
        dropAggregate.negativeFeedbackCount += 1
      }
      if (isSatisfactionAction) {
        const satisfactionScore = readNumberFromRecord(params, "satisfaction_score", "satisfactionScore")
          || (normalizedAction === "content_satisfaction_positive" || normalizedAction === "recommendation_reason_helpful"
            ? 1
            : normalizedAction === "content_satisfaction_negative" || normalizedAction === "recommendation_reason_not_helpful"
              ? 0
              : 0.5)
        dropAggregate.satisfactionScoreTotal += clamp01(satisfactionScore)
        dropAggregate.satisfactionSampleCount += 1
        dropAggregate.satisfactionLatestAtMs = Math.max(dropAggregate.satisfactionLatestAtMs, timestamp)
        if (normalizedAction === "content_satisfaction_positive" || normalizedAction === "recommendation_reason_helpful") {
          dropAggregate.positiveFeedbackCount += 1
        }
        if (isNegativeSatisfactionAction) {
          dropAggregate.negativeFeedbackCount += 1
        }
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
      if (isActionEvent(normalizedAction)) {
        existingSession.actionCount += 1
        if (existingSession.firstActionAtMs === 0) {
          existingSession.firstActionAtMs = timestamp
        } else if (existingSession.secondActionAtMs === 0) {
          existingSession.secondActionAtMs = timestamp
        }
      }
      if (normalizedAction === "wallet_opened" && existingSession.walletAtMs === 0) {
        existingSession.walletAtMs = timestamp
      }
      if (normalizedAction === "drop_unlocked" && existingSession.unlockAtMs === 0) {
        existingSession.unlockAtMs = timestamp
      }
      sessionAggregates.set(sessionId, existingSession)
    }

    if (normalizedAction === "wallet_opened") {
      aggregate.walletOpenCount += 1
    }
    if (normalizedAction === "checkout_started") {
      aggregate.checkoutStartCount += 1
    }
    if (normalizedAction === "drop_preview_opened" || normalizedAction === "drop_viewed") {
      aggregate.previewOpenCount += 1
    }
    if (normalizedAction === "watch_session_started" || normalizedAction === "file_viewed") {
      aggregate.viewerOpenCount += 1
    }
    if (isNegativePreferenceAction) {
      recordNegativePreference({
        aggregate,
        eventName,
        timestamp,
        dropId,
        creatorId,
        category,
        explicitDrop: normalizedAction === "drop_not_interested",
        explicitCreator: normalizedAction === "creator_not_interested",
        explicitCategory: normalizedAction === "category_not_interested",
        creatorMuted: normalizedAction === "creator_muted",
        recommendationDismissed: normalizedAction === "recommendation_dismissed",
      })
    }
    if (isSearchIntentAction) {
      recordSearchIntent({
        aggregate,
        event,
        normalizedAction,
        sessionId,
        timestamp,
        category,
        creatorId,
      })
    }
    if (isSatisfactionAction) {
      recordSatisfactionSignal({
        aggregate,
        event,
        eventName,
        normalizedAction,
        timestamp,
        dropId,
        creatorId,
        category,
      })
    }

    if (dropId) {
      aggregate.uniqueDropIds.add(dropId)
      pushLimited(aggregate.recentDropIds, dropId)
    }
    if (creatorId) {
      aggregate.uniqueCreatorIds.add(creatorId)
      pushLimited(aggregate.recentCreatorIds, creatorId)
      if (!isNegativePreferenceAction && !isNegativeSatisfactionAction) {
        scoreMapIncrement(aggregate.topCreatorScores, creatorId, normalizedAction === "drop_unlocked" ? 2.5 : normalizedAction === "creator_followed" ? 4 : 0.35)
      }
    }
    if (category && !isNegativePreferenceAction && !isNegativeSatisfactionAction) {
      scoreMapIncrement(aggregate.topCategoryScores, category, normalizedAction === "drop_unlocked" ? 2 : 0.25)
    }
    if (!isNegativePreferenceAction && !isNegativeSatisfactionAction) {
      tags.forEach((tag) => scoreMapIncrement(aggregate.topThemeScores, tag, normalizedAction === "drop_unlocked" ? 1.2 : 0.18))
    }
    if (!isNegativePreferenceAction && !isNegativeSatisfactionAction) {
      scoreMapIncrement(
        aggregate.topExperienceScores,
        experienceKey,
        isActionEvent(normalizedAction) ? 0.45 : 0.15,
      )
    }
  })

  input.metricFacts.forEach((record) => {
    const metricName = readMetricName(record)
    const userId = readString(record.actorUserId) || readString(record.targetUserId)
    const dropId = readString(record.targetDropId)
    const timestamp = readNumber(record.timestampMs) || nowMs

    if (!metricName || !userId) {
      return
    }

    const aggregate = ensureUserAggregate(userId, userAggregates)
    aggregate.sourceTimestamps.eventFacts.push(timestamp)

    if (metricName === "gumdrops_purchased") {
      aggregate.purchaseCount += 1
      aggregate.serverPurchaseCount += 1
      aggregate.sourceTimestamps.serverTransactions.push(timestamp)
      if (dropId && dropMap.has(dropId)) {
        const dropAggregate = ensureDropAggregate(dropMap.get(dropId) as DropRecord, dropAggregates)
        if (isWithinDropLaunchHours(dropAggregate, timestamp, 24)) {
          dropAggregate.purchasesAfterView24h += 1
        }
      }
      return
    }

    if (metricName === "drop_unlocked") {
      aggregate.unlockCount += 1
      aggregate.serverUnlockCount += 1
      aggregate.sourceTimestamps.serverUnlocks.push(timestamp)
      if (dropId && dropMap.has(dropId)) {
        const dropAggregate = ensureDropAggregate(dropMap.get(dropId) as DropRecord, dropAggregates)
        dropAggregate.unlocks += 1
        if (isWithinDropLaunchHours(dropAggregate, timestamp, 6)) {
          dropAggregate.unlocks6h += 1
        }
      }
    }
  })

  input.watchSessions.forEach((record) => {
    const session = record as WatchSessionRecord
    const userId = readString(session.userId)
    const dropId = readString(session.dropId)
    const watchedAtMs = readNumber(session.lastSeenAtMs) || nowMs
    const watchScoreSource = readString(session.watchScoreSource) || "watch_session_rollup"
    const validWatchSeconds = watchScoreSource === "watch_session_rollup"
      ? readNumber(session.validWatchMs) / 1000
      : 0
    const totalWatchSeconds = validWatchSeconds
    const watchScore = readNumber(session.watchScore)
    const hasVerifiedWatch = watchScoreSource === "watch_session_rollup" && totalWatchSeconds > 0
    const recommendationSource = readString(session.recommendationId)
      || readString(session.recommendationSource)
      || readString(session.sourceSurface)
      || readString(session.entrySurface)
    const hasRecommendationSource = recommendationSource.toLowerCase().includes("recommend")
    const lowWatchAfterRecommendation = hasRecommendationSource
      && hasVerifiedWatch
      && (totalWatchSeconds < 8 || (watchScore > 0 && watchScore < 25))

    if (dropId && dropMap.has(dropId)) {
      const dropAggregate = ensureDropAggregate(dropMap.get(dropId) as DropRecord, dropAggregates)
      dropAggregate.watchSecondsTotal += totalWatchSeconds
      if (hasVerifiedWatch) {
        dropAggregate.watchSecondsSamples.push(totalWatchSeconds)
      }
      if (watchScore > 0) {
        dropAggregate.watchScores.push(watchScore)
      }
      dropAggregate.watchScoreSources.add(watchScoreSource)
      if (session.completedSession === true || readString(session.sessionOutcome) === "completed") {
        dropAggregate.completionCount += 1
        if (hasVerifiedWatch && isWithinDropLaunchHours(dropAggregate, watchedAtMs, 6)) {
          dropAggregate.validWatchCompletions6h += 1
        }
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
    if (hasVerifiedWatch) {
      aggregate.watchSessionCount += 1
    }
    aggregate.latestWatchAtMs = Math.max(aggregate.latestWatchAtMs, watchedAtMs)
    aggregate.sourceTimestamps.watchSessions.push(watchedAtMs)
    if (hasVerifiedWatch) {
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
      if (lowWatchAfterRecommendation) {
        countMapIncrement(aggregate.lowWatchAfterRecommendationDropIds, dropId)
        aggregate.negativePreferenceLatestAtMs = Math.max(aggregate.negativePreferenceLatestAtMs, watchedAtMs)
        setTimestampMax(aggregate.negativePreferenceLatestByDrop, dropId, watchedAtMs)
        addEventName(aggregate.negativePreferenceEventNamesByDrop, dropId, "low_watch_after_recommendation")
      }
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
        aggregate.negativePreferenceLatestAtMs = Math.max(aggregate.negativePreferenceLatestAtMs, createdAtMs)
        setTimestampMax(aggregate.negativePreferenceLatestByDrop, dropId, createdAtMs)
        addEventName(aggregate.negativePreferenceEventNamesByDrop, dropId, "feedback_negative")
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

function buildPreferenceRecord(input: {
  entityId: string
  explicit: boolean
  repeatedSkips?: number
  lowWatchAfterRecommendation?: number
  latestAtMs?: number
  eventNames?: Set<string>
}) {
  return {
    entityId: input.entityId,
    explicitNegativeFeedback: input.explicit ? 1 : 0,
    repeatedSkips: Math.max(0, input.repeatedSkips || 0),
    lowWatchAfterRecommendation: Math.max(0, input.lowWatchAfterRecommendation || 0),
    latestAtMs: Math.max(0, input.latestAtMs || 0),
    eventNames: Array.from(input.eventNames ?? []).sort(),
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
  const privacyLimitedIssueCode = gpcBlocked
    ? "privacy_limited_global_privacy_control"
    : identifiedEnabled
      ? ""
      : "privacy_limited_identified_analytics_denied"

  const timeToFirstActionMs = average(sessionRecords.map((session) => Math.max(0, session.firstActionAtMs - session.firstEventAtMs)).filter((value) => value > 0))
  const timeToSecondActionMs = average(sessionRecords.map((session) => Math.max(0, session.secondActionAtMs - session.firstEventAtMs)).filter((value) => value > 0))
  const timeToUnlockMs = average(sessionRecords.map((session) => Math.max(0, session.unlockAtMs - session.firstEventAtMs)).filter((value) => value > 0))
  const timeToWalletOpenMs = average(sessionRecords.map((session) => Math.max(0, session.walletAtMs - session.firstEventAtMs)).filter((value) => value > 0))
  const averageSessionDepth = average(sessionRecords.map((session) => session.dropIds.size))
  const sessionFrequency30d = sessionRecords.filter((session) => session.firstEventAtMs >= input.nowMs - (30 * 24 * 60 * 60 * 1000)).length
  const averageWatchSeconds = average(input.aggregate.watchSeconds)
  const medianWatchSeconds = median(input.aggregate.watchSeconds)
  const watchScoreSource = input.aggregate.watchSessionCount > 0
    ? "watch_session_rollup"
    : input.aggregate.viewerOpenCount > 0
      ? "legacy_page_duration"
      : "unavailable"
  const watchScoreConfidence = watchScoreSource === "watch_session_rollup"
    ? "high"
    : watchScoreSource === "legacy_page_duration"
      ? "low"
      : "unknown"
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
  const topCreatorEntries = topEntries(input.aggregate.topCreatorScores, 8)
  const topCategoryEntries = topEntries(input.aggregate.topCategoryScores, 8)
  const topThemeEntries = topEntries(input.aggregate.topThemeScores, 8)
  const topExperienceEntries = topEntries(input.aggregate.topExperienceScores, 8)
  const negativeDropIds = Array.from(input.aggregate.negativeDropIds).slice(0, 24)
  const negativeCreatorIds = Array.from(input.aggregate.negativeCreatorIds).slice(0, 24)
  const mutedCreatorIds = Array.from(input.aggregate.mutedCreatorIds).slice(0, 24)
  const negativeCategoryScores = numberMapToObject(input.aggregate.negativeCategoryScores, 24)
  const negativeCategoryIds = Object.entries(negativeCategoryScores)
    .filter(([, score]) => Number(score) >= 1)
    .map(([category]) => category)
  const negativePreferenceDropKeys = unionKeys(
    input.aggregate.negativeDropIds,
    input.aggregate.repeatedSkipDropIds.keys(),
    input.aggregate.lowWatchAfterRecommendationDropIds.keys(),
    input.aggregate.negativePreferenceLatestByDrop.keys(),
  )
  const negativePreferenceCreatorKeys = unionKeys(
    input.aggregate.negativeCreatorIds,
    input.aggregate.mutedCreatorIds,
    input.aggregate.negativePreferenceLatestByCreator.keys(),
  )
  const negativePreferenceCategoryKeys = unionKeys(
    input.aggregate.negativeCategoryScores.keys(),
    input.aggregate.negativePreferenceLatestByCategory.keys(),
  )
  const negativePreferenceProfile = {
    version: 1,
    halfLifeDays: 30,
    latestAtMs: input.aggregate.negativePreferenceLatestAtMs,
    dropIds: negativeDropIds,
    creatorIds: negativeCreatorIds,
    mutedCreatorIds,
    categoryScores: negativeCategoryScores,
    repeatedSkipDropIds: numberMapToObject(input.aggregate.repeatedSkipDropIds, 24),
    lowWatchAfterRecommendationDropIds: numberMapToObject(input.aggregate.lowWatchAfterRecommendationDropIds, 24),
    drops: Object.fromEntries(negativePreferenceDropKeys.map((dropId) => [dropId, buildPreferenceRecord({
      entityId: dropId,
      explicit: input.aggregate.negativeDropIds.has(dropId),
      repeatedSkips: input.aggregate.repeatedSkipDropIds.get(dropId),
      lowWatchAfterRecommendation: input.aggregate.lowWatchAfterRecommendationDropIds.get(dropId),
      latestAtMs: input.aggregate.negativePreferenceLatestByDrop.get(dropId),
      eventNames: input.aggregate.negativePreferenceEventNamesByDrop.get(dropId),
    })])),
    creators: Object.fromEntries(negativePreferenceCreatorKeys.map((creatorId) => [creatorId, buildPreferenceRecord({
      entityId: creatorId,
      explicit: input.aggregate.negativeCreatorIds.has(creatorId) || input.aggregate.mutedCreatorIds.has(creatorId),
      latestAtMs: input.aggregate.negativePreferenceLatestByCreator.get(creatorId),
      eventNames: input.aggregate.negativePreferenceEventNamesByCreator.get(creatorId),
    })])),
    categories: Object.fromEntries(negativePreferenceCategoryKeys.map((category) => [category, buildPreferenceRecord({
      entityId: category,
      explicit: input.aggregate.negativeCategoryScores.get(category) !== undefined
        && (input.aggregate.negativePreferenceEventNamesByCategory.get(category)?.has("category_not_interested") === true),
      repeatedSkips: input.aggregate.negativeCategoryScores.get(category),
      latestAtMs: input.aggregate.negativePreferenceLatestByCategory.get(category),
      eventNames: input.aggregate.negativePreferenceEventNamesByCategory.get(category),
    })])),
  }
  const latestSearchIntentAtMs = input.aggregate.searchIntentLatestAtMs
  const searchQueryLengthAverage = average(input.aggregate.searchIntentQueryLengths)
  const searchIntentProfile = {
    version: 1,
    halfLifeHours: SEARCH_INTENT_HALF_LIFE_HOURS,
    latestAtMs: latestSearchIntentAtMs,
    activeUntilMs: latestSearchIntentAtMs > 0 ? latestSearchIntentAtMs + (SEARCH_INTENT_HALF_LIFE_HOURS * 60 * 60 * 1000) : 0,
    rawQueryStored: false,
    tokens: numberMapToObject(input.aggregate.searchIntentTokens, 24),
    categories: numberMapToObject(input.aggregate.searchIntentCategories, 16),
    creatorIds: numberMapToObject(input.aggregate.searchIntentCreatorIds, 16),
    filters: numberMapToObject(input.aggregate.searchIntentFilters, 16),
    sorts: numberMapToObject(input.aggregate.searchIntentSorts, 12),
    queryClusters: numberMapToObject(input.aggregate.searchIntentQueryClusters, 16),
    intentClasses: numberMapToObject(input.aggregate.searchIntentClasses, 8),
    queryLengths: {
      latest: input.aggregate.searchIntentQueryLengths[input.aggregate.searchIntentQueryLengths.length - 1] || 0,
      average: searchQueryLengthAverage,
      samples: input.aggregate.searchIntentQueryLengths.length,
    },
    sessionIds: Array.from(input.aggregate.searchIntentSessionIds).slice(0, 8),
  }
  const satisfactionProfile = {
    version: 1,
    halfLifeDays: SATISFACTION_SIGNAL_HALF_LIFE_DAYS,
    latestAtMs: input.aggregate.satisfactionLatestAtMs,
    drops: Object.fromEntries(Array.from(input.aggregate.satisfactionDrops.entries()).slice(0, 24).map(([dropId, record]) => [dropId, buildSatisfactionRecord({
      entityId: dropId,
      record,
    })])),
    creators: Object.fromEntries(Array.from(input.aggregate.satisfactionCreators.entries()).slice(0, 24).map(([creatorId, record]) => [creatorId, buildSatisfactionRecord({
      entityId: creatorId,
      record,
    })])),
    categories: Object.fromEntries(Array.from(input.aggregate.satisfactionCategories.entries()).slice(0, 24).map(([category, record]) => [category, buildSatisfactionRecord({
      entityId: category,
      record,
    })])),
    recommendationReasons: Object.fromEntries(Array.from(input.aggregate.satisfactionRecommendationReasons.entries()).slice(0, 24).map(([recommendationId, record]) => [recommendationId, buildSatisfactionRecord({
      entityId: recommendationId,
      record,
    })])),
  }
  const repeatedCreatorSignalCount = topCreatorEntries.filter((entry) => entry.score >= 2).length
  const categorySignalCount = topCategoryEntries.filter((entry) => entry.score >= 0.75).length
  const themeSignalCount = topThemeEntries.filter((entry) => entry.score >= 0.5).length
  const consentAvailability = recommendationsEnabled && !gpcBlocked ? 1 : 0
  const signalEvidenceCount = [
    input.aggregate.watchSessionCount > 0,
    input.aggregate.unlockCount > 0,
    repeatedCreatorSignalCount > 0,
    categorySignalCount + themeSignalCount > 0,
    input.aggregate.purchaseCount > 0,
    sessionFrequency30d >= 2,
  ].filter(Boolean).length
  const availableSourceCount = [
    input.aggregate.sourceTimestamps.eventFacts.length > 0,
    input.aggregate.sourceTimestamps.watchSessions.length > 0,
    input.aggregate.sourceTimestamps.relationships.length > 0,
    input.aggregate.sourceTimestamps.feedbacks.length > 0,
    input.aggregate.sourceTimestamps.serverTransactions.length > 0,
    input.aggregate.sourceTimestamps.serverUnlocks.length > 0,
  ].filter(Boolean).length
  const profileSampleCount = Math.max(
    input.aggregate.watchSessionCount,
    input.aggregate.serverUnlockCount,
    repeatedCreatorSignalCount + categorySignalCount + themeSignalCount,
    input.aggregate.serverPurchaseCount,
    sessionFrequency30d,
    signalEvidenceCount,
  )
  const profileRequiredFieldsPresent = [
    input.aggregate.watchSessionCount > 0,
    input.aggregate.serverUnlockCount > 0,
    repeatedCreatorSignalCount > 0,
    categorySignalCount + themeSignalCount > 0,
    input.aggregate.serverPurchaseCount > 0,
    sessionFrequency30d > 0,
    consentAvailability > 0,
  ].filter(Boolean).length
  const issueCodes = [
    watchScoreSource === "legacy_page_duration" ? "legacy_page_duration_fallback" : "",
    input.aggregate.viewerOpenCount > 0 && input.aggregate.watchSessionCount === 0 ? "watch_time_missing_despite_views" : "",
    input.aggregate.purchaseCount > input.aggregate.serverPurchaseCount ? "client_purchase_context_only" : "",
    input.aggregate.unlockCount > input.aggregate.serverUnlockCount ? "client_unlock_context_only" : "",
    latestSourceAtMs > 0 && input.nowMs - latestSourceAtMs > STALE_AFTER_MS ? "stale_behavioral_snapshot" : "",
    privacyLimitedIssueCode,
    consentAvailability === 0 ? "deterministic_fallback_profile" : "",
  ].filter(Boolean)
  const confidenceResult = computeBehavioralTruthConfidence({
    agreeingSources: availableSourceCount,
    availableSources: availableSourceCount,
    ageMs: latestSourceAtMs > 0 ? Math.max(0, input.nowMs - latestSourceAtMs) : Number.MAX_SAFE_INTEGER,
    maxFreshnessMs: STALE_AFTER_MS,
    sampleCount: profileSampleCount,
    requiredFieldsPresent: profileRequiredFieldsPresent,
    requiredFieldsTotal: 7,
    issueCount: issueCodes.length,
  })
  const confidenceScore = consentAvailability === 0
    ? Math.min(confidenceResult.normalizedScore, PRIVACY_LIMITED_RECOMMENDATION_CONFIDENCE_CAP)
    : confidenceResult.normalizedScore
  const freshnessScore = latestSourceAtMs > 0
    ? Math.max(0, 1 - (Math.max(0, input.nowMs - latestSourceAtMs) / STALE_AFTER_MS))
    : 0
  const sampleScore = Math.min(1, Math.log10(profileSampleCount + 1) / 3)
  const schemaCompleteness = profileRequiredFieldsPresent / 7
  const sourceReliability = Math.max(
    input.aggregate.serverPurchaseCount > 0 ? SOURCE_RELIABILITY_WEIGHTS.server_transaction : 0,
    input.aggregate.serverUnlockCount > 0 ? SOURCE_RELIABILITY_WEIGHTS.server_entitlement_unlock : 0,
    input.aggregate.watchSessionCount > 0 ? SOURCE_RELIABILITY_WEIGHTS.watch_session_rollup : 0,
    input.aggregate.sourceTimestamps.relationships.length > 0 ? SOURCE_RELIABILITY_WEIGHTS.server_creator_relationship : 0,
    input.aggregate.sourceTimestamps.eventFacts.length > 0 ? SOURCE_RELIABILITY_WEIGHTS.identified_event_fact : 0,
  )
  const sourceDisagreementPenalty = clamp01(
    (watchScoreSource === "legacy_page_duration" ? 0.45 : 0) +
    (input.aggregate.purchaseCount > input.aggregate.serverPurchaseCount ? 0.2 : 0) +
    (input.aggregate.unlockCount > input.aggregate.serverUnlockCount ? 0.2 : 0),
  )
  const truthScore = computeBehavioralTruthScore({
    sourceReliability,
    freshnessScore,
    sampleScore,
    schemaCompleteness,
    sourceDisagreementPenalty,
  })
  const predictionOutputs = {
    pPurchase7d: clamp01(
      (input.aggregate.serverPurchaseCount > 0 ? 0.45 : 0) +
      (input.aggregate.checkoutStartCount > 0 ? 0.15 : 0) +
      (walletOpenPropensity * 0.15) +
      (viewerToUnlockConversion * 0.15) +
      (truthScore * 0.10),
    ),
    pUnlock24h: clamp01((viewerToUnlockConversion * 0.55) + (unlockPropensity * 0.25) + (truthScore * 0.20)),
    pWatchComplete: clamp01((average(input.aggregate.watchScores) / 100 * 0.55) + (completionPropensity * 0.25) + (truthScore * 0.20)),
    pReturn7d: clamp01((sessionFrequency30d / 7 * 0.55) + (repeatConsumptionRate * 0.20) + (truthScore * 0.25)),
    pCreatorFollow: clamp01((repeatedCreatorSignalCount / 6 * 0.35) + (loyaltyScore * 0.35) + (truthScore * 0.30)),
    pNegativeFeedback: clamp01((input.aggregate.negativeFeedbackCount / Math.max(1, input.aggregate.feedbackCount) * 0.55) + (fatigueScore * 0.45)),
  }
  const calibratedEngagementScore = Math.round(100 * (
    (0.24 * predictionOutputs.pPurchase7d) +
    (0.23 * predictionOutputs.pUnlock24h) +
    (0.23 * predictionOutputs.pWatchComplete) +
    (0.13 * predictionOutputs.pReturn7d) +
    (0.10 * clamp01(input.aggregate.eventCount / 100)) +
    (0.07 * clamp01(input.aggregate.checkoutStartCount / 8))
  ))
  const insufficientSignal = confidenceScore < 0.35 || signalEvidenceCount < 2
  const confidenceLabel = confidenceResult.label
  const recommendationState = !consentAvailability
    ? "deterministic-fallback"
    : insufficientSignal
      ? "insufficient-signal"
      : "profile-driven"
  const sourceBreakdown = buildBehavioralSourceBreakdown({
    aggregate: input.aggregate,
    watchScoreSource,
  })
  const issues = buildMaterializerIssues(issueCodes)
  const generatedAt = new Date(input.nowMs).toISOString()
  const freshnessState = resolveMaterializerFreshnessState({
    latestSourceAtMs,
    nowMs: input.nowMs,
    diagnostics: sourceBreakdown.diagnostics ?? [],
  })

  return {
    userId: input.aggregate.userId,
    generatedAt,
    freshnessState,
    dataAvailabilityReason: consentAvailability === 0
      ? privacyLimitedIssueCode || "privacy_limited_identified_analytics_denied"
      : "full_signal",
    sourceBreakdown,
    issues,
    updatedAtMs: input.nowMs,
    sourceWindowStartMs: input.windowStartMs,
    latestSourceAtMs,
    freshnessLabel: normalizeProfileFreshness(latestSourceAtMs || input.nowMs, input.nowMs),
    recommendationState,
    recommendationCardState: recommendationState === "profile-driven" ? "profile-driven" : "fallback-limited",
    recommendationCardCap: recommendationState === "profile-driven" ? null : 3,
    profilingEligibility: {
      anonymousAnalyticsEnabled: anonymousEnabled,
      identifiedAnalyticsEnabled: identifiedEnabled,
      allowRecommendations: recommendationsEnabled,
      gpcBlocked,
      eligible: recommendationsEnabled && !gpcBlocked,
    },
    confidenceScore: round(confidenceScore, 3),
    sourceTruthScore: round(truthScore, 4),
    truthScore: round(truthScore, 4),
    sourceReliability: round(sourceReliability, 2),
    schemaCompleteness: round(schemaCompleteness, 4),
    sourceDisagreementPenalty: round(sourceDisagreementPenalty, 4),
    confidenceLabel,
    recommendationThresholdMet: !insufficientSignal && consentAvailability === 1,
    insufficientSignal,
    insufficientSignalReason: insufficientSignal
      ? consentAvailability === 0
        ? "Identified analytics are disabled for this user, so recommendation confidence stays privacy-limited."
        : "Not enough watch, unwrap, creator, content, purchase, or return-cadence signal yet."
      : "",
    issueCodes,
    signalSummary: {
      watchSessions: input.aggregate.watchSessionCount,
      completedUnwraps: input.aggregate.unlockCount,
      serverEntitlementUnlocks: input.aggregate.serverUnlockCount,
      repeatedCreators: repeatedCreatorSignalCount,
      categorySignals: categorySignalCount,
      themeSignals: themeSignalCount,
      purchases: input.aggregate.serverPurchaseCount,
      clientPurchaseContextCount: Math.max(0, input.aggregate.purchaseCount - input.aggregate.serverPurchaseCount),
      returnCadence30d: sessionFrequency30d,
      consentAvailability,
      evidenceCount: signalEvidenceCount,
    },
    predictionOutputs,
    surfaceObjectives: {
      userDropsPage: ["pUnlock24h", "pPurchase7d", "freshness"],
      previewPage: ["pPurchase7d", "pUnlock24h", "urgency"],
      creatorProfile: ["pCreatorFollow", "pFanPass", "pBooking"],
      dashboard: ["pReturn7d", "pTaskCompletion", "pUnlock24h"],
      adminUsers: ["valueScore", "engagementScore", "truthScore"],
      moderation: ["server_backed_risk_score"],
    },
    behavioralGoalScores: {
      engagementScore: calibratedEngagementScore,
      dropRecommendationReadiness: round((predictionOutputs.pPurchase7d + predictionOutputs.pUnlock24h + predictionOutputs.pWatchComplete + predictionOutputs.pReturn7d) / 4, 4),
      valueProxyScore: Math.round(100 * ((0.45 * clamp01(input.aggregate.serverPurchaseCount / 4)) + (0.25 * clamp01(input.aggregate.serverPurchaseCount / 8)) + (0.12 * predictionOutputs.pPurchase7d) + (0.10 * predictionOutputs.pUnlock24h) + (0.08 * walletOpenPropensity))),
    },
    mathCalibration: {
      activeMode: "deterministic",
      verdict: "deterministic_active",
      reason: "Functions runtime emits deterministic, source-truthed prediction artifacts; ML verdicts remain controlled by validation reports.",
      sampleSize: profileSampleCount,
      minimumMlSampleSize: 50,
    },
    topCreators: topCreatorEntries,
    topCategories: topCategoryEntries,
    topThemes: topThemeEntries,
    topExperiences: topExperienceEntries,
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
    negativeDropIds,
    negativeCreatorIds,
    mutedCreatorIds,
    negativeCategoryIds,
    categoryNegativeAffinity: negativeCategoryScores,
    repeatedSkipDropIds: negativePreferenceProfile.repeatedSkipDropIds,
    lowWatchAfterRecommendationDropIds: negativePreferenceProfile.lowWatchAfterRecommendationDropIds,
    negativePreferenceProfile,
    satisfactionProfile,
    searchIntentProfile,
    eventCount: input.aggregate.eventCount,
    watchSessionCount: input.aggregate.watchSessionCount,
    purchaseCount: input.aggregate.serverPurchaseCount,
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
    generatedAt: new Date(nowMs).toISOString(),
    freshnessState: aggregate.latestAtMs > 0 && nowMs - aggregate.latestAtMs <= STALE_AFTER_MS ? "live" : "stale",
    sourceBreakdown: {
      runtimeFacts: ["analytics_guest_batches"],
      metricFacts: [],
      diagnostics: ["deterministic-fallback"],
    },
    issues: [
      {
        code: "deterministic_fallback_profile",
        severity: "info",
        message: "Guest profiles remain diagnostic fallback only.",
      },
    ],
    updatedAtMs: nowMs,
    sourceWindowStartMs: windowStartMs,
    latestSourceAtMs: aggregate.latestAtMs,
    freshnessLabel: normalizeProfileFreshness(aggregate.latestAtMs || nowMs, nowMs),
    recommendationState: "deterministic-fallback",
    recommendationCardState: "fallback-limited",
    recommendationCardCap: 3,
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
  const satisfactionScore = aggregate.satisfactionSampleCount > 0
    ? clamp01(aggregate.satisfactionScoreTotal / Math.max(1, aggregate.satisfactionSampleCount))
    : 0.5
  const ageDays = aggregate.validFrom > 0 ? Math.max(0, (nowMs - aggregate.validFrom) / (24 * 60 * 60 * 1000)) : 0
  const watchScoreSource = aggregate.watchSecondsSamples.length > 0
    ? "watch_session_rollup"
    : aggregate.viewerOpens > 0
      ? "legacy_page_duration"
      : "unavailable"
  const sourceReliability = Math.max(
    aggregate.unlocks > 0 ? SOURCE_RELIABILITY_WEIGHTS.server_entitlement_unlock : 0,
    aggregate.watchSecondsSamples.length > 0 ? SOURCE_RELIABILITY_WEIGHTS.watch_session_rollup : 0,
    aggregate.viewerOpens > 0 ? SOURCE_RELIABILITY_WEIGHTS.identified_event_fact : 0,
  )
  const freshnessScore = clamp01(1 - (ageDays / 30))
  const sampleCount = aggregate.viewerOpens + aggregate.previewOpens + aggregate.unlocks + aggregate.watchSecondsSamples.length
  const sampleScore = Math.min(1, Math.log10(sampleCount + 1) / 3)
  const schemaCompleteness = [
    aggregate.dropId.length > 0,
    aggregate.creatorId.length > 0,
    aggregate.status === "active",
    aggregate.validFrom > 0,
    aggregate.unlocks >= 0,
    aggregate.viewerOpens >= 0,
    aggregate.watchSecondsSamples.length > 0,
  ].filter(Boolean).length / 7
  const sourceDisagreementPenalty = watchScoreSource === "legacy_page_duration" ? 0.45 : 0
  const truthScore = computeBehavioralTruthScore({
    sourceReliability,
    freshnessScore,
    sampleScore,
    schemaCompleteness,
    sourceDisagreementPenalty,
  })
  const predictionOutputs = {
    pPurchase7d: clamp01((aggregate.unlocks / Math.max(1, aggregate.previewOpens) * 0.45) + (aggregate.viewerOpens / 100 * 0.2) + (truthScore * 0.35)),
    pUnlock24h: clamp01((aggregate.unlocks / Math.max(1, aggregate.viewerOpens) * 0.65) + (freshnessScore * 0.15) + (truthScore * 0.2)),
    pWatchComplete: clamp01((aggregate.completionCount / Math.max(1, aggregate.viewerOpens) * 0.55) + (average(aggregate.watchScores) / 100 * 0.25) + (truthScore * 0.2)),
    pReturn7d: clamp01((repeatViewers / Math.max(1, uniqueViewers) * 0.55) + (aggregate.last7dInteractions / Math.max(1, aggregate.viewerOpens + aggregate.previewOpens) * 0.2) + (truthScore * 0.25)),
    pCreatorFollow: clamp01((aggregate.positiveFeedbackCount / Math.max(1, feedbackCount) * 0.25) + (aggregate.unlocks / Math.max(1, aggregate.viewerOpens) * 0.35) + (truthScore * 0.4)),
    pNegativeFeedback: clamp01(aggregate.negativeFeedbackCount / Math.max(1, feedbackCount)),
  }
  const urgency = aggregate.validUntil > nowMs
    ? clamp01(1 - ((aggregate.validUntil - nowMs) / (72 * 60 * 60 * 1000)))
    : 0
  const earlyMomentumSignals = {
    impressions1h: aggregate.impressions1h,
    impressions6h: aggregate.impressions6h,
    impressions24h: aggregate.impressions24h,
    previewOpens1h: aggregate.previewOpens1h,
    previewOpens6h: aggregate.previewOpens6h,
    viewerOpens6h: aggregate.viewerOpens6h,
    viewerOpens24h: aggregate.viewerOpens24h,
    unlocks6h: aggregate.unlocks6h,
    validWatchCompletions6h: aggregate.validWatchCompletions6h,
    purchasesAfterView24h: aggregate.purchasesAfterView24h,
    negativeFeedbackCount: aggregate.negativeFeedbackCount,
    feedbackCount,
  }
  const earlyMomentumBase = 100 * (
    (0.25 * clamp01(aggregate.previewOpens1h / Math.max(1, aggregate.impressions1h))) +
    (0.25 * clamp01(aggregate.unlocks6h / Math.max(1, aggregate.previewOpens6h))) +
    (0.20 * clamp01(aggregate.validWatchCompletions6h / Math.max(1, aggregate.viewerOpens6h))) +
    (0.20 * clamp01(aggregate.purchasesAfterView24h / Math.max(1, aggregate.viewerOpens24h)))
  )
  const earlyMomentumNegativePenalty = clamp01(aggregate.negativeFeedbackCount / Math.max(1, feedbackCount)) * 40
  const earlyMomentumScore = clampScore(earlyMomentumBase - earlyMomentumNegativePenalty)
  const earlyMomentumSampleLabel = aggregate.impressions24h === 0
    ? "no signal"
    : aggregate.impressions24h < 20
      ? "early signal"
      : "sampled"
  const sourceBreakdown = {
    runtimeFacts: ["analytics_event_facts"],
    metricFacts: [
      aggregate.unlocks > 0 ? "server_entitlement_truth" : "",
      aggregate.watchSecondsSamples.length > 0 ? "analytics_watch_sessions" : "",
    ].filter(Boolean),
    diagnostics: [watchScoreSource === "legacy_page_duration" ? "legacy_page_duration" : ""].filter(Boolean),
  }
  const issueCodes = [
    watchScoreSource === "legacy_page_duration" ? "legacy_page_duration_fallback" : "",
    aggregate.viewerOpens > 0 && aggregate.watchSecondsSamples.length === 0 ? "watch_time_missing_despite_views" : "",
  ].filter(Boolean)
  return {
    dropId: aggregate.dropId,
    generatedAt: new Date(nowMs).toISOString(),
    freshnessState: resolveMaterializerFreshnessState({
      latestSourceAtMs: aggregate.latestAtMs,
      nowMs,
      diagnostics: sourceBreakdown.diagnostics,
    }),
    sourceBreakdown,
    issues: buildMaterializerIssues(issueCodes),
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
    watchScoreConfidence: watchScoreSource === "watch_session_rollup" ? "high" : watchScoreSource === "legacy_page_duration" ? "low" : "unknown",
    completionRate: clamp01(aggregate.viewerOpens === 0 ? 0 : aggregate.completionCount / Math.max(1, aggregate.viewerOpens)),
    uniqueViewers,
    repeatViewers,
    repeatViewerRate: clamp01(uniqueViewers === 0 ? 0 : repeatViewers / Math.max(1, uniqueViewers)),
    unlocks: aggregate.unlocks,
    previewToViewerRate: clamp01(aggregate.previewOpens === 0 ? 0 : aggregate.viewerOpens / Math.max(1, aggregate.previewOpens)),
    viewerToUnlockRate: clamp01(aggregate.viewerOpens === 0 ? 0 : aggregate.unlocks / Math.max(1, aggregate.viewerOpens)),
    positiveFeedbackCount: aggregate.positiveFeedbackCount,
    negativeFeedbackCount: aggregate.negativeFeedbackCount,
    satisfactionScore: round(satisfactionScore, 4),
    satisfactionSampleCount: aggregate.satisfactionSampleCount,
    satisfactionLatestAtMs: aggregate.satisfactionLatestAtMs,
    negativeSignalRate: clamp01(feedbackCount === 0 ? 0 : aggregate.negativeFeedbackCount / feedbackCount),
    freshnessDecayScore: freshnessScore,
    sourceReliability: round(sourceReliability, 2),
    truthScore: round(truthScore, 4),
    schemaCompleteness: round(schemaCompleteness, 4),
    sourceDisagreementPenalty: round(sourceDisagreementPenalty, 4),
    predictionOutputs,
    earlyMomentum: {
      version: 1,
      ...earlyMomentumSignals,
      momentumScore: round(earlyMomentumScore, 4),
      sampleLabel: earlyMomentumSampleLabel,
      negativeFeedbackPenalty: round(earlyMomentumNegativePenalty, 4),
    },
    dropRecommendationScore: round(computeDropRecommendationScore({
      pPurchase7d: predictionOutputs.pPurchase7d,
      pUnlock24h: predictionOutputs.pUnlock24h,
      pWatchComplete: predictionOutputs.pWatchComplete,
      pReturn7d: predictionOutputs.pReturn7d,
      freshness: freshnessScore,
      urgency,
      fatiguePenalty: predictionOutputs.pNegativeFeedback * 16,
      repeatExposurePenalty: clamp01(repeatViewers / Math.max(1, uniqueViewers)) * 20,
      diversityBoost: 0,
    }), 3),
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

function applyLookalikeRecommendationSignals(userDocs: BuiltUserProfileDoc[]) {
  return userDocs.map((profile) => {
    const ownCreators = new Set(Object.keys(profile.creatorAffinity || {}))
    const ownCategories = new Set(Object.keys(profile.categoryAffinity || {}))
    const ownThemes = new Set(Object.keys(profile.themeAffinity || {}))

    const similarProfiles = userDocs
      .filter((candidate) => candidate.userId !== profile.userId)
      .map((candidate) => {
        const creatorOverlap = Object.keys(candidate.creatorAffinity || {}).filter((creatorId) => ownCreators.has(creatorId)).length
        const categoryOverlap = Object.keys(candidate.categoryAffinity || {}).filter((category) => ownCategories.has(category)).length
        const themeOverlap = Object.keys(candidate.themeAffinity || {}).filter((theme) => ownThemes.has(theme)).length
        const score = (creatorOverlap * 3) + (categoryOverlap * 2) + themeOverlap
        return {candidate, score}
      })
      .filter((entry) => entry.score >= 3)
      .sort((left, right) => right.score - left.score)
      .slice(0, 5)

    const lookalikeCreatorIds = Array.from(new Set(
      similarProfiles.flatMap((entry) => Object.keys(entry.candidate.creatorAffinity || {}))
        .filter((creatorId) => !ownCreators.has(creatorId)),
    )).slice(0, 6)

    return {
      ...profile,
      lookalikeCreatorIds,
      lookalikeSourceUserCount: similarProfiles.length,
    }
  })
}

function stableBehavioralValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => stableBehavioralValue(entry))
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    return Object.fromEntries(
      Object.keys(record)
        .filter((key) => ![
          "generatedAt",
          "updatedAt",
          "updatedAtMs",
          "freshnessLabel",
          "sourceWindowStartMs",
        ].includes(key))
        .sort()
        .map((key) => [key, stableBehavioralValue(record[key])]),
    )
  }
  return value
}

function buildBehavioralProfileChangedHash(doc: Record<string, unknown>) {
  return createHash("sha256")
    .update(JSON.stringify(stableBehavioralValue(doc)))
    .digest("hex")
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
  let changedProfileWrites = 0
  let unchangedProfileWritesSkipped = 0

  const commitIfNeeded = async () => {
    if (operationCount === 0) {
      return
    }
    await batch.commit()
    batch = db.batch()
    operationCount = 0
  }

  const writeChangedBehavioralProfileDoc = async (
    collection: string,
    id: string,
    doc: Record<string, unknown>,
  ) => {
    const changedHash = buildBehavioralProfileChangedHash(doc)
    const ref = db.collection(collection).doc(id)
    const existing = await ref.get()
    if (existing.exists && readString(existing.data()?.changedHash) === changedHash) {
      unchangedProfileWritesSkipped += 1
      return
    }

    batch.set(ref, {
      ...doc,
      changedHash,
      updatedAt: FieldValue.serverTimestamp(),
    }, {merge: true})
    operationCount += 1
    changedProfileWrites += 1
    if (operationCount >= 400) {
      await commitIfNeeded()
    }
  }

  for (const doc of input.userDocs.slice(0, MAX_USER_PROFILE_WRITES)) {
    await writeChangedBehavioralProfileDoc(USER_PROFILE_COLLECTION, doc.userId, doc)
  }

  for (const doc of input.guestDocs.slice(0, MAX_GUEST_PROFILE_WRITES)) {
    await writeChangedBehavioralProfileDoc(GUEST_PROFILE_COLLECTION, doc.sessionKey, doc)
  }

  for (const doc of input.dropDocs.slice(0, MAX_DROP_PROFILE_WRITES)) {
    await writeChangedBehavioralProfileDoc(DROP_INTELLIGENCE_COLLECTION, doc.dropId, doc)
  }

  batch.set(db.collection(SNAPSHOT_STATUS_COLLECTION).doc("summary"), {
    generatedAt: new Date(input.nowMs).toISOString(),
    freshnessState: "live",
    sourceBreakdown: {
      runtimeFacts: ["analytics_event_facts", "analytics_guest_batches"],
      metricFacts: ["analytics_metric_facts", "analytics_watch_sessions"],
      diagnostics: [],
    },
    issues: [],
    updatedAtMs: input.nowMs,
    sourceWindowStartMs: input.windowStartMs,
    userProfileCount: input.userDocs.length,
    guestProfileCount: input.guestDocs.length,
    dropProfileCount: input.dropDocs.length,
    changedProfileWrites,
    unchangedProfileWritesSkipped,
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

  return {
    changedProfileWrites,
    unchangedProfileWritesSkipped,
  }
}

async function writeBehavioralIntelligenceRuntimeCursor(input: {
  recent: Awaited<ReturnType<typeof readRecentCollections>>
  nowMs: number
  changedProfileWrites: number
  unchangedProfileWritesSkipped: number
}) {
  await db.collection(BEHAVIORAL_INTELLIGENCE_CURSOR_COLLECTION)
    .doc(BEHAVIORAL_INTELLIGENCE_CURSOR_ID)
    .set({
      lastSuccessfulRunAtMs: input.nowMs,
      lastWindowStartMs: input.recent.windowStartMs,
      lastWindowMode: input.recent.windowMode,
      fullRebuild: input.recent.fullRebuild,
      changedProfileWrites: input.changedProfileWrites,
      unchangedProfileWritesSkipped: input.unchangedProfileWritesSkipped,
      updatedAt: FieldValue.serverTimestamp(),
    }, {merge: true})
}

export async function rebuildBehavioralIntelligenceSnapshots(options: {fullRebuild?: boolean} = {}) {
  const nowMs = Date.now()
  const recent = await readRecentCollections(nowMs, {
    fullRebuild: options.fullRebuild === true,
  })
  const aggregates = buildAggregates(recent, nowMs)
  const userIds = Array.from(aggregates.userAggregates.keys())
  const userRecords = await readUserRecords(userIds)

  const userDocs = applyLookalikeRecommendationSignals(userIds.map((userId) => buildUserProfileDoc({
    aggregate: aggregates.userAggregates.get(userId) as UserSignalAggregate,
    sessionAggregates: aggregates.sessionAggregates,
    userRecord: userRecords.get(userId),
    nowMs,
    windowStartMs: recent.windowStartMs,
  })))
  const guestDocs = Array.from(aggregates.guestAggregates.values())
    .sort((left, right) => right.latestAtMs - left.latestAtMs)
    .map((aggregate) => buildGuestProfileDoc(aggregate, nowMs, recent.windowStartMs))
  const dropDocs = Array.from(aggregates.dropAggregates.values())
    .map((aggregate) => buildDropDoc(aggregate, nowMs, recent.windowStartMs))
    .sort((left, right) => right.viewerOpens - left.viewerOpens || right.previewOpens - left.previewOpens)

  const writeResult = await writeSnapshotDocs({
    userDocs,
    guestDocs,
    dropDocs,
    nowMs,
    windowStartMs: recent.windowStartMs,
  })
  await writeBehavioralIntelligenceRuntimeCursor({
    recent,
    nowMs,
    changedProfileWrites: writeResult.changedProfileWrites,
    unchangedProfileWritesSkipped: writeResult.unchangedProfileWritesSkipped,
  })

  const summary = {
    userProfiles: userDocs.length,
    guestProfiles: guestDocs.length,
    dropIntelligenceRows: dropDocs.length,
    changedProfileWrites: writeResult.changedProfileWrites,
    unchangedProfileWritesSkipped: writeResult.unchangedProfileWritesSkipped,
    sourceWindowStartMs: recent.windowStartMs,
    windowMode: recent.windowMode,
    updatedAtMs: nowMs,
    generatedAt: new Date(nowMs).toISOString(),
    freshnessState: "live",
    sourceBreakdown: {
      runtimeFacts: ["analytics_event_facts", "analytics_guest_batches"],
      metricFacts: ["analytics_metric_facts", "analytics_watch_sessions"],
      diagnostics: [],
    },
    issues: [],
  }

  logger.info("[Behavioral Intelligence] snapshot rebuild completed", summary)
  return summary
}
