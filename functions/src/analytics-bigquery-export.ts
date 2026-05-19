import {onDocumentCreated} from "firebase-functions/v2/firestore"
import {onSchedule} from "firebase-functions/v2/scheduler"
import {REGION} from "./firebase-runtime.js"
import {BigQuery} from "@google-cloud/bigquery"
import {FieldPath, FieldValue} from "firebase-admin/firestore"
import {AnalyticsEventFact, readString, readNumber, readBoolean} from "./analytics-core.js"
import {db} from "./firebase-admin.js"
import {logger} from "firebase-functions"

// First-party canonical event dataset
const DATASET_ID = process.env.BQ_ANALYTICS_DATASET_ID || process.env.BIGQUERY_ANALYTICS_DATASET_ID || "kandydrops_canonical_analytics"
const TABLE_ID = process.env.BQ_ANALYTICS_RAW_EVENTS_TABLE_ID || process.env.BIGQUERY_ANALYTICS_RAW_EVENTS_TABLE_ID || "raw_events"
const EXPORT_STATUS_COLLECTION = "analytics_export_status"
const EXPORT_STATUS_DOC_ID = "bigquery_raw_events"
const DATASET_LOCATION = process.env.BQ_ANALYTICS_LOCATION || process.env.BIGQUERY_ANALYTICS_LOCATION || "US"
const EXPORT_TRUTH_CLASS = "analytics_evidence_only"
const BIGQUERY_EXPORT_MIN_CADENCE_MS = 24 * 60 * 60 * 1000
const BIGQUERY_EXPORT_MAX_ROWS_PER_BATCH = 500
const BIGQUERY_EXPORT_READINESS_FAILURE_TTL_MS = 60 * 60 * 1000
const BIGQUERY_EXPORT_QUERY_GUARDRAILS = {
  dryRunRequiredForQueries: true,
  maximumBytesBilledRequiredForQueries: true,
  partitionFilterRequired: true,
  note: "Raw event inserts are non-priority evidence; any future query path must use dryRun, maximumBytesBilled, and timestamp partition filters.",
} as const
const CANONICAL_IMPORT_TARGETS = ["analytics_event_facts", "analytics_metric_facts"] as const
const FORBIDDEN_RUNTIME_MUTATION_SURFACES = [
  "runtime_balances",
  "runtime_transactions",
  "runtime_unlocks",
  "runtime_purchases",
  "runtime_subscriptions",
  "runtime_support_messages",
  "runtime_user_rollups",
  "legacy_admin_metric_snapshots",
] as const
const RAW_EVENTS_TABLE_SCHEMA = [
  {name: "eventId", type: "STRING", mode: "REQUIRED"},
  {name: "eventName", type: "STRING", mode: "NULLABLE"},
  {name: "timestamp", type: "TIMESTAMP", mode: "NULLABLE"},
  {name: "userId", type: "STRING", mode: "NULLABLE"},
  {name: "sessionId", type: "STRING", mode: "NULLABLE"},
  {name: "pagePath", type: "STRING", mode: "NULLABLE"},
  {name: "dropId", type: "STRING", mode: "NULLABLE"},
  {name: "isMobileViewport", type: "BOOLEAN", mode: "NULLABLE"},
  {name: "origin", type: "STRING", mode: "NULLABLE"},
  {name: "params", type: "STRING", mode: "NULLABLE"},
]

let bqInstance: BigQuery | undefined
let rawEventsTableReady: Promise<void> | undefined
let rawEventsTableReadinessFailureUntilMs = 0
let rawEventsTableReadinessFailureMessage = ""
let nextExportClaimCheckAfterMs = 0

function getBQ() {
  if (!bqInstance) {
    bqInstance = new BigQuery()
  }
  return bqInstance
}

async function ensureRawEventsTableReady() {
  const bq = getBQ()
  const dataset = bq.dataset(DATASET_ID)
  const [datasetExists] = await dataset.exists()
  if (!datasetExists) {
    await bq.createDataset(DATASET_ID, {location: DATASET_LOCATION})
  }

  const table = dataset.table(TABLE_ID)
  const [tableExists] = await table.exists()
  if (tableExists) return

  try {
    await dataset.createTable(TABLE_ID, {
      schema: RAW_EVENTS_TABLE_SCHEMA,
      timePartitioning: {
        type: "DAY",
        field: "timestamp",
      },
      clustering: {
        fields: ["eventName", "origin"],
      },
    })
  } catch (error) {
    if ((error as {code?: number}).code === 409) return
    throw error
  }
}

function getRawEventsTableReady() {
  const nowMs = Date.now()
  if (rawEventsTableReadinessFailureUntilMs > nowMs) {
    throw new Error(`BigQuery raw-events table readiness is cooling down after failure: ${rawEventsTableReadinessFailureMessage}`)
  }

  rawEventsTableReady ||= ensureRawEventsTableReady().catch((error) => {
    rawEventsTableReady = undefined
    rawEventsTableReadinessFailureUntilMs = Date.now() + BIGQUERY_EXPORT_READINESS_FAILURE_TTL_MS
    rawEventsTableReadinessFailureMessage = error instanceof Error ? error.message.slice(0, 300) : String(error).slice(0, 300)
    throw error
  })
  return rawEventsTableReady
}

async function recordBigQueryExportStatus(input: {
  eventId: string
  status: "healthy" | "fail"
  error?: unknown
  exportedRows?: number
  skippedRows?: number
  windowStartMs?: number
  windowEndMs?: number
  watermarkTimestampMs?: number
  watermarkEventId?: string
}) {
  const nowMs = Date.now()
  const errorMessage = input.error instanceof Error ? input.error.message : input.error ? String(input.error) : ""
  const payload = input.status === "healthy"
    ? {
      writer: "functions/onAnalyticsEventFactBigQueryExport",
      truthClass: EXPORT_TRUTH_CLASS,
      primaryProductTruth: false,
      runtimeImportBlocked: true,
      canonicalImportTargets: [...CANONICAL_IMPORT_TARGETS],
      forbiddenRuntimeMutationSurfaces: [...FORBIDDEN_RUNTIME_MUTATION_SURFACES],
      cadenceMs: BIGQUERY_EXPORT_MIN_CADENCE_MS,
      queryGuardrails: BIGQUERY_EXPORT_QUERY_GUARDRAILS,
      status: input.status,
      datasetId: DATASET_ID,
      tableId: TABLE_ID,
      lastEventId: input.eventId,
      lastExportedAtMs: nowMs,
      lastExportWindowStartMs: input.windowStartMs ?? null,
      lastExportWindowEndMs: input.windowEndMs ?? null,
      lastExportedEventTimestampMs: input.watermarkTimestampMs ?? null,
      lastExportedEventId: input.watermarkEventId || input.eventId,
      lastExportedRowCount: input.exportedRows ?? 0,
      lastSkippedRowCount: input.skippedRows ?? 0,
      successCount: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    }
    : {
      writer: "functions/onAnalyticsEventFactBigQueryExport",
      truthClass: EXPORT_TRUTH_CLASS,
      primaryProductTruth: false,
      runtimeImportBlocked: true,
      canonicalImportTargets: [...CANONICAL_IMPORT_TARGETS],
      forbiddenRuntimeMutationSurfaces: [...FORBIDDEN_RUNTIME_MUTATION_SURFACES],
      cadenceMs: BIGQUERY_EXPORT_MIN_CADENCE_MS,
      queryGuardrails: BIGQUERY_EXPORT_QUERY_GUARDRAILS,
      status: input.status,
      datasetId: DATASET_ID,
      tableId: TABLE_ID,
      lastEventId: input.eventId,
      lastFailedAtMs: nowMs,
      lastExportWindowStartMs: input.windowStartMs ?? null,
      lastExportWindowEndMs: input.windowEndMs ?? null,
      lastErrorMessage: errorMessage.slice(0, 500),
      failureCount: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    }

  try {
    await db.collection(EXPORT_STATUS_COLLECTION).doc(EXPORT_STATUS_DOC_ID).set(payload, {merge: true})
  } catch (statusError) {
    logger.error(`[BigQuery Export] Failed to record export status for event ${input.eventId}:`, statusError)
  }
}

function readStatusTimestamp(data: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = Number(data[key] || 0)
    if (Number.isFinite(value) && value > 0) return value
  }
  return 0
}

function buildBigQueryExportWatermarkWindow(input: {
  statusData: Record<string, unknown>
  nowMs: number
}) {
  const lastWatermarkMs = readStatusTimestamp(input.statusData, [
    "lastExportedEventTimestampMs",
    "lastExportStartedAtMs",
    "lastExportedAtMs",
  ])
  const fallbackStartMs = input.nowMs - BIGQUERY_EXPORT_MIN_CADENCE_MS
  return {
    windowStartMs: lastWatermarkMs > 0 ? lastWatermarkMs : fallbackStartMs,
    windowEndMs: input.nowMs,
    watermarkEventId: readString(input.statusData.lastExportedEventId),
    maxRows: BIGQUERY_EXPORT_MAX_ROWS_PER_BATCH,
  }
}

async function shouldAttemptBigQueryExportClaim(nowMs: number) {
  if (nowMs < nextExportClaimCheckAfterMs) {
    return false
  }

  const statusSnapshot = await db.collection(EXPORT_STATUS_COLLECTION).doc(EXPORT_STATUS_DOC_ID).get()
  const statusData = statusSnapshot.exists ? statusSnapshot.data() as Record<string, unknown> : {}
  const lastRunAtMs = readStatusTimestamp(statusData, [
    "lastExportStartedAtMs",
    "lastExportedAtMs",
    "lastFailedAtMs",
  ])

  if (lastRunAtMs > 0 && nowMs - lastRunAtMs < BIGQUERY_EXPORT_MIN_CADENCE_MS) {
    nextExportClaimCheckAfterMs = lastRunAtMs + BIGQUERY_EXPORT_MIN_CADENCE_MS
    return false
  }

  return true
}

async function claimBigQueryExportWindow(eventId: string, nowMs: number) {
  const statusRef = db.collection(EXPORT_STATUS_COLLECTION).doc(EXPORT_STATUS_DOC_ID)
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(statusRef)
    const data = snapshot.exists ? snapshot.data() as Record<string, unknown> : {}
    const lastExportedAtMs = Number(data.lastExportedAtMs || data.lastExportStartedAtMs || 0)
    if (Number.isFinite(lastExportedAtMs) && nowMs - lastExportedAtMs < BIGQUERY_EXPORT_MIN_CADENCE_MS) {
      return null
    }

    const window = buildBigQueryExportWatermarkWindow({statusData: data, nowMs})

    transaction.set(statusRef, {
      writer: "functions/onAnalyticsEventFactBigQueryExport",
      truthClass: EXPORT_TRUTH_CLASS,
      primaryProductTruth: false,
      runtimeImportBlocked: true,
      status: "scheduled",
      cadenceMs: BIGQUERY_EXPORT_MIN_CADENCE_MS,
      queryGuardrails: BIGQUERY_EXPORT_QUERY_GUARDRAILS,
      lastExportStartedAtMs: nowMs,
      lastExportWindowStartMs: window.windowStartMs,
      lastExportWindowEndMs: window.windowEndMs,
      lastWindowClaimEventId: eventId,
      updatedAt: FieldValue.serverTimestamp(),
    }, {merge: true})
    return window
  })
}

function mapFactToBigQueryRow(input: {
  eventId: string
  data: AnalyticsEventFact
  bq: BigQuery
}) {
  return {
    eventId: input.eventId,
    eventName: readString(input.data.eventName),
    timestamp: input.bq.timestamp(new Date(readNumber(input.data.timestamp) || Date.now())),
    userId: readString(input.data.userId) || null,
    sessionId: readString(input.data.sessionId) || null,
    pagePath: readString(input.data.pagePath) || null,
    dropId: readString(input.data.dropId) || null,
    isMobileViewport: readBoolean(input.data.isMobileViewport),
    origin: readString((input.data as any).origin) || "unknown",
    params: input.data.params ? JSON.stringify(input.data.params) : null,
  }
}

async function exportBigQueryRawEventsBatch(input: {
  claimEventId: string
  windowStartMs: number
  windowEndMs: number
  watermarkEventId: string
  maxRows: number
}) {
  const bq = getBQ()
  const dataset = bq.dataset(DATASET_ID)
  await getRawEventsTableReady()

  let query = db.collection("analytics_event_facts")
    .where("timestamp", ">", input.windowStartMs)
    .where("timestamp", "<=", input.windowEndMs)
    .orderBy("timestamp", "asc")
    .orderBy(FieldPath.documentId())
    .limit(input.maxRows)

  if (input.watermarkEventId) {
    query = db.collection("analytics_event_facts")
      .where("timestamp", ">=", input.windowStartMs)
      .where("timestamp", "<=", input.windowEndMs)
      .orderBy("timestamp", "asc")
      .orderBy(FieldPath.documentId())
      .startAfter(input.windowStartMs, input.watermarkEventId)
      .limit(input.maxRows)
  }

  const snapshot = await query
    .get()

  const rows = snapshot.docs.map((doc) => mapFactToBigQueryRow({
    eventId: doc.id,
    data: doc.data() as AnalyticsEventFact,
    bq,
  }))

  if (rows.length > 0) {
    await dataset.table(TABLE_ID).insert(rows)
  }

  const lastDoc = snapshot.docs.at(-1)
  const lastDocData = lastDoc?.data() as AnalyticsEventFact | undefined
  return {
    exportedRows: rows.length,
    skippedRows: Math.max(0, snapshot.size - rows.length),
    watermarkTimestampMs: lastDocData ? readNumber(lastDocData.timestamp) : input.windowEndMs,
    watermarkEventId: lastDoc?.id || input.claimEventId,
  }
}

export async function runBigQueryRawEventsExportWindow(eventId: string, nowMs = Date.now()) {
  const window = await claimBigQueryExportWindow(eventId, nowMs)
  if (!window) {
    return {claimed: false, exportedRows: 0}
  }

  const result = await exportBigQueryRawEventsBatch({
    claimEventId: eventId,
    ...window,
  })
  await recordBigQueryExportStatus({
    eventId,
    status: "healthy",
    windowStartMs: window.windowStartMs,
    windowEndMs: window.windowEndMs,
    ...result,
  })
  logger.info(`[BigQuery Export] Exported ${result.exportedRows} raw event row(s) for daily window`, {
    eventId,
    windowStartMs: window.windowStartMs,
    windowEndMs: window.windowEndMs,
  })
  return {claimed: true, ...result}
}

export const scheduledBigQueryRawEventsExport = onSchedule({
  schedule: "0 4 * * *",
  region: REGION,
  retryCount: 0,
}, async () => {
  try {
    await runBigQueryRawEventsExportWindow("scheduled_daily_bigquery_raw_events", Date.now())
  } catch (error) {
    await recordBigQueryExportStatus({
      eventId: "scheduled_daily_bigquery_raw_events",
      status: "fail",
      error,
      windowEndMs: Date.now(),
    })
    logger.error("[BigQuery Export] Scheduled daily raw-events export failed:", error)
  }
})

export const onAnalyticsEventFactBigQueryExport = onDocumentCreated(
  {document: "analytics_event_facts/{eventId}", region: REGION},
  async (event) => {
    if (!event.data?.exists) return

    try {
      const nowMs = Date.now()
      const dueForClaim = await shouldAttemptBigQueryExportClaim(nowMs)
      if (!dueForClaim) {
        logger.info(`[BigQuery Export] Skipped event-triggered export for event ${event.id}; daily cadence window still active`)
        return
      }

      await runBigQueryRawEventsExportWindow(event.id, nowMs)
    } catch (error) {
      await recordBigQueryExportStatus({eventId: event.id, status: "fail", error, windowEndMs: Date.now()})
      logger.error(`[BigQuery Export] Failed to export event ${event.id}:`, error)
    }
  }
)
