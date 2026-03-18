import {onDocumentCreated} from "firebase-functions/v2/firestore"
import {FieldValue} from "firebase-admin/firestore"

import {
  buildIncrementUpdate,
  encodeKeyFragment,
  type GuestAnalyticsBatch,
  quantizePixelPoint,
  readNumber,
  readString,
  toTimeKeys,
} from "./analytics-core.js"
import {db} from "./firebase-admin.js"
import {REGION} from "./firebase-runtime.js"
import {incrementRealtimeNode} from "./analytics-realtime.js"
import {recordSemanticRollupFromGuestBatch} from "./analytics-semantics.js"

function buildTargetLabel(rawEvent: {
  targetText?: string;
  targetId?: string;
  targetTag?: string;
}) {
  const targetText = typeof rawEvent.targetText === "string" ? rawEvent.targetText : ""
  const targetId = typeof rawEvent.targetId === "string" ? rawEvent.targetId : ""
  const targetTag = typeof rawEvent.targetTag === "string" ? rawEvent.targetTag : ""
  return (targetText || targetId || targetTag || "unknown").slice(0, 80)
}

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

    const pageMap = new Map<string, {count: number; maxScrollDepth: number}>()
    const heatMap = new Map<string, number>()
    const typeMap = new Map<string, number>()
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
    const targetRollups = new Map<string, {
      pagePath: string;
      targetKey: string;
      targetText: string;
      targetTag: string;
      clickCount: number;
      hoverCount: number;
      lastEventAt: number;
    }>()

    events.forEach((rawEvent) => {
      const eventPath = readString(rawEvent.path) || "/"
      const eventType = readString(rawEvent.type) || "unknown"
      const scrollDepth = readNumber(rawEvent.scrollDepthPercent)

      typeMap.set(eventType, (typeMap.get(eventType) || 0) + 1)

      const currentPage = pageMap.get(eventPath) || {count: 0, maxScrollDepth: 0}
      currentPage.count += 1
      currentPage.maxScrollDepth = Math.max(currentPage.maxScrollDepth, scrollDepth)
      pageMap.set(eventPath, currentPage)

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

      if (eventType === "click" || eventType === "hover") {
        const targetLabel = buildTargetLabel(rawEvent)
        const targetDocId = `${dayKey}__${encodeKeyFragment(eventPath)}__${encodeKeyFragment(targetLabel)}`
        const currentTarget = targetRollups.get(targetDocId) || {
          pagePath: eventPath,
          targetKey: targetLabel,
          targetText: readString(rawEvent.targetText) || readString(rawEvent.targetId),
          targetTag: readString(rawEvent.targetTag),
          clickCount: 0,
          hoverCount: 0,
          lastEventAt: 0,
        }
        if (eventType === "click") currentTarget.clickCount += 1
        if (eventType === "hover") currentTarget.hoverCount += 1
        currentTarget.lastEventAt = Math.max(currentTarget.lastEventAt, readNumber(rawEvent.timestamp) || timestamp)
        targetRollups.set(targetDocId, currentTarget)
      }

      const x = readNumber(rawEvent.x)
      const y = readNumber(rawEvent.y)
      if (x > 0 || y > 0) {
        const bucket = quantizePixelPoint(x, y)
        const heatKey = `${eventPath}::${bucket}`
        heatMap.set(heatKey, (heatMap.get(heatKey) || 0) + 1)
      }
    })

    const batchWrite = db.batch()
    batchWrite.set(db.collection("analytics_guest_daily").doc(dayKey), {
      dayKey,
      batchCount: buildIncrementUpdate(1),
      eventCount: buildIncrementUpdate(events.length),
      maxScrollDepth: Math.max(readNumber(data.maxScrollDepth), 0),
      updatedAt: FieldValue.serverTimestamp(),
      lastReceivedAt: timestamp,
    }, {merge: true})

    pageMap.forEach((value, pagePath) => {
      batchWrite.set(
        db.collection("analytics_guest_daily").doc(dayKey).collection("pages").doc(encodeKeyFragment(pagePath)),
        {
          pagePath,
          eventCount: buildIncrementUpdate(value.count),
          maxScrollDepth: value.maxScrollDepth,
          updatedAt: FieldValue.serverTimestamp(),
          lastReceivedAt: timestamp,
        },
        {merge: true},
      )
    })

    typeMap.forEach((count, eventType) => {
      batchWrite.set(
        db.collection("analytics_guest_daily").doc(dayKey).collection("types").doc(encodeKeyFragment(eventType)),
        {
          eventType,
          count: buildIncrementUpdate(count),
          updatedAt: FieldValue.serverTimestamp(),
        },
        {merge: true},
      )
    })

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

    targetRollups.forEach((entry, docId) => {
      batchWrite.set(db.collection("analytics_target_daily").doc(docId), {
        dayKey,
        pagePath: entry.pagePath,
        targetKey: entry.targetKey,
        targetText: entry.targetText,
        targetTag: entry.targetTag,
        clickCount: buildIncrementUpdate(entry.clickCount),
        hoverCount: buildIncrementUpdate(entry.hoverCount),
        updatedAt: FieldValue.serverTimestamp(),
        lastEventAt: entry.lastEventAt || timestamp,
      }, {merge: true})
    })

    heatMap.forEach((count, heatKey) => {
      const [pagePath, bucket] = heatKey.split("::")
      batchWrite.set(
        db.collection("analytics_heatmap_daily").doc(dayKey)
          .collection("pages").doc(encodeKeyFragment(pagePath))
          .collection("pixels").doc(encodeKeyFragment(bucket)),
        {
          pagePath,
          bucket,
          count: buildIncrementUpdate(count),
          updatedAt: FieldValue.serverTimestamp(),
        },
        {merge: true},
      )
    })

    await batchWrite.commit()

    await Promise.all([
      recordSemanticRollupFromGuestBatch({
        batch: data,
        sourceKey: "analytics_guest_batches",
      }),
      incrementRealtimeNode("analytics/realtime/guest/overview", {
        batchCount: 1,
        eventCount: events.length,
        lastReceivedAt: timestamp,
      }),
      ...Array.from(pageMap.entries()).map(([pagePath, value]) =>
        incrementRealtimeNode(`analytics/realtime/guest/pages/${encodeKeyFragment(pagePath)}`, {
          eventCount: value.count,
          lastReceivedAt: timestamp,
          pagePath,
        }),
      ),
    ])
  },
)
