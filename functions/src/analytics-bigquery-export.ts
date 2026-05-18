import {onDocumentCreated} from "firebase-functions/v2/firestore"
import {REGION} from "./firebase-runtime.js"
import {BigQuery} from "@google-cloud/bigquery"
import {FieldValue} from "firebase-admin/firestore"
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
  rawEventsTableReady ||= ensureRawEventsTableReady().catch((error) => {
    rawEventsTableReady = undefined
    throw error
  })
  return rawEventsTableReady
}

async function recordBigQueryExportStatus(input: {
  eventId: string
  status: "healthy" | "fail"
  error?: unknown
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

async function claimBigQueryExportWindow(eventId: string, nowMs: number) {
  const statusRef = db.collection(EXPORT_STATUS_COLLECTION).doc(EXPORT_STATUS_DOC_ID)
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(statusRef)
    const data = snapshot.exists ? snapshot.data() as Record<string, unknown> : {}
    const lastExportedAtMs = Number(data.lastExportedAtMs || data.lastExportStartedAtMs || 0)
    if (Number.isFinite(lastExportedAtMs) && nowMs - lastExportedAtMs < BIGQUERY_EXPORT_MIN_CADENCE_MS) {
      return false
    }

    transaction.set(statusRef, {
      writer: "functions/onAnalyticsEventFactBigQueryExport",
      truthClass: EXPORT_TRUTH_CLASS,
      primaryProductTruth: false,
      runtimeImportBlocked: true,
      status: "scheduled",
      cadenceMs: BIGQUERY_EXPORT_MIN_CADENCE_MS,
      queryGuardrails: BIGQUERY_EXPORT_QUERY_GUARDRAILS,
      lastExportStartedAtMs: nowMs,
      lastWindowClaimEventId: eventId,
      updatedAt: FieldValue.serverTimestamp(),
    }, {merge: true})
    return true
  })
}

export const onAnalyticsEventFactBigQueryExport = onDocumentCreated(
  {document: "analytics_event_facts/{eventId}", region: REGION},
  async (event) => {
    const data = event.data?.data() as AnalyticsEventFact | undefined
    if (!data) return

    try {
      const nowMs = Date.now()
      const claimedExportWindow = await claimBigQueryExportWindow(event.id, nowMs)
      if (!claimedExportWindow) {
        logger.info(`[BigQuery Export] Skipped non-priority export for event ${event.id}; daily cadence window still active`)
        return
      }

      const bq = getBQ()
      const dataset = bq.dataset(DATASET_ID)
      await getRawEventsTableReady()
      
      const row = {
        eventId: event.id,
        eventName: readString(data.eventName),
        timestamp: bq.timestamp(new Date(readNumber(data.timestamp) || Date.now())),
        userId: readString(data.userId) || null,
        sessionId: readString(data.sessionId) || null,
        pagePath: readString(data.pagePath) || null,
        dropId: readString(data.dropId) || null,
        isMobileViewport: readBoolean(data.isMobileViewport),
        origin: readString((data as any).origin) || "unknown",
        // Extracting params as a JSON string for flexible BQ querying
        params: data.params ? JSON.stringify(data.params) : null,
      }

      await dataset.table(TABLE_ID).insert([row])
      await recordBigQueryExportStatus({eventId: event.id, status: "healthy"})
      logger.info(`[BigQuery Export] Successfully exported event ${event.id}`)
    } catch (error) {
      // We don't throw here to avoid endless retries on schema errors, 
      // but we log it as an error for visibility.
      await recordBigQueryExportStatus({eventId: event.id, status: "fail", error})
      logger.error(`[BigQuery Export] Failed to export event ${event.id}:`, error)
    }
  }
)
