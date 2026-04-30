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

let bqInstance: BigQuery | undefined

function getBQ() {
  if (!bqInstance) {
    bqInstance = new BigQuery()
  }
  return bqInstance
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

export const onAnalyticsEventFactBigQueryExport = onDocumentCreated(
  {document: "analytics_event_facts/{eventId}", region: REGION},
  async (event) => {
    const data = event.data?.data() as AnalyticsEventFact | undefined
    if (!data) return

    try {
      const bq = getBQ()
      const dataset = bq.dataset(DATASET_ID)
      // Check if dataset exists, if not, this would fail gracefully until provisioned.
      // In production, terraform or setup scripts create the dataset.
      
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
