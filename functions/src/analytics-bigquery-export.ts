import {onDocumentCreated} from "firebase-functions/v2/firestore"
import {REGION} from "./firebase-runtime.js"
import {BigQuery} from "@google-cloud/bigquery"
import {AnalyticsEventFact, readString, readNumber, readBoolean} from "./analytics-core.js"
import {logger} from "firebase-functions"

// First-party canonical event dataset
const DATASET_ID = "kandydrops_canonical_analytics"
const TABLE_ID = "raw_events"

let bqInstance: BigQuery | undefined

function getBQ() {
  if (!bqInstance) {
    bqInstance = new BigQuery()
  }
  return bqInstance
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
      logger.info(`[BigQuery Export] Successfully exported event ${event.id}`)
    } catch (error) {
      // We don't throw here to avoid endless retries on schema errors, 
      // but we log it as an error for visibility.
      logger.error(`[BigQuery Export] Failed to export event ${event.id}:`, error)
    }
  }
)

