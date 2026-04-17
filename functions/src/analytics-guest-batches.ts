import {onDocumentCreated} from "firebase-functions/v2/firestore"
import {FieldValue} from "firebase-admin/firestore"

import {
  buildIncrementUpdate,
  encodeKeyFragment,
  type GuestAnalyticsBatch,
  readNumber,
  readString,
  toTimeKeys,
} from "./analytics-core.js"
import {db} from "./firebase-admin.js"
import {REGION} from "./firebase-runtime.js"
import {recordSemanticRollupFromGuestBatch} from "./analytics-semantics.js"
import {touchAnalyticsRuntime} from "./analytics-runtime.js"

export const onGuestAnalyticsBatchCreated = onDocumentCreated(
  {document: "analytics_guest_batches/{batchId}", region: REGION},
  async (event) => {
    const data = event.data?.data() as GuestAnalyticsBatch | undefined
    if (!data) {
      return
    }

    const timestamp = readNumber(data.receivedAtMs) || Date.now()
    const dayKey = readString(data.dayKey) || toTimeKeys(timestamp).dayKey
    const events = Array.isArray(data.events) ? data.events : []
    if (events.length === 0) {
      return
    }

    const pageRollups = new Map<string, {
      pagePath: string;
      pageViews: number;
      clickCount: number;
      hoverCount: number;
      scrollCount: number;
      visibilityCount: number;
      dwellMsTotal: number;
      dwellSampleCount: number;
      maxScrollDepth: number;
    }>()

    events.forEach((rawEvent) => {
      const eventPath = readString(rawEvent.path) || "/"
      const eventType = readString(rawEvent.type) || "unknown"
      const scrollDepth = readNumber(rawEvent.scrollDepthPercent)

      const pageRollupKey = `${dayKey}__${encodeKeyFragment(eventPath)}`
      const currentPageRollup = pageRollups.get(pageRollupKey) || {
        pagePath: eventPath,
        pageViews: 0,
        clickCount: 0,
        hoverCount: 0,
        scrollCount: 0,
        visibilityCount: 0,
        dwellMsTotal: 0,
        dwellSampleCount: 0,
        maxScrollDepth: 0,
      }

      if (eventType === "page_view") currentPageRollup.pageViews += 1
      if (eventType === "click") currentPageRollup.clickCount += 1
      if (eventType === "hover") currentPageRollup.hoverCount += 1
      if (eventType === "scroll") currentPageRollup.scrollCount += 1
      if (eventType === "visibility") currentPageRollup.visibilityCount += 1

      const durationMs = readNumber(rawEvent.durationMs)
      if (eventType === "page_leave" && durationMs > 0) {
        currentPageRollup.dwellMsTotal += durationMs
        currentPageRollup.dwellSampleCount += 1
      }

      currentPageRollup.maxScrollDepth = Math.max(currentPageRollup.maxScrollDepth, scrollDepth)
      pageRollups.set(pageRollupKey, currentPageRollup)
    })

    const batchWrite = db.batch()

    pageRollups.forEach((entry, docId) => {
      batchWrite.set(db.collection("analytics_page_daily").doc(docId), {
        dayKey,
        pagePath: entry.pagePath,
        pageViews: buildIncrementUpdate(entry.pageViews),
        clickCount: buildIncrementUpdate(entry.clickCount),
        hoverCount: buildIncrementUpdate(entry.hoverCount),
        scrollCount: buildIncrementUpdate(entry.scrollCount),
        visibilityCount: buildIncrementUpdate(entry.visibilityCount),
        dwellMsTotal: buildIncrementUpdate(entry.dwellMsTotal),
        dwellSampleCount: buildIncrementUpdate(entry.dwellSampleCount),
        maxScrollDepth: entry.maxScrollDepth,
        updatedAt: FieldValue.serverTimestamp(),
        lastEventAt: timestamp,
      }, {merge: true})
    })

    await batchWrite.commit()

    await Promise.all([
      recordSemanticRollupFromGuestBatch({
        batch: data,
        sourceKey: "analytics_guest_batches",
      }),
      touchAnalyticsRuntime(timestamp),
    ])
  },
)
