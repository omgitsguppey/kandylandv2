import {FieldValue} from "firebase-admin/firestore"

export const ANALYTICS_TIMEZONE = "America/Chicago"

export interface AnalyticsEventFact {
  eventName: string;
  userId?: string;
  username?: string;
  consentMode?: string;
  globalPrivacyControl?: boolean;
  timestamp?: number;
  params?: Record<string, unknown>;
  pagePath?: string;
  sessionId?: string;
  dayKey?: string;
  hourKey?: string;
  minuteKey?: string;
  dropId?: string;
  dropTitle?: string;
  dropCategory?: string;
  assetKey?: string;
  assetIndex?: number;
  contentKind?: string;
  destination?: string;
  destinationType?: string;
  sessionWatchSeconds?: number;
  watchSeconds?: number;
  durationMs?: number;
  loadMs?: number;
  viewportWidth?: number;
  viewportHeight?: number;
  isMobileViewport?: boolean;
  authState?: string;
}

export interface GuestBatchEvent {
  type: string;
  timestamp: number;
  path: string;
  targetId?: string;
  targetTag?: string;
  targetText?: string;
  dropId?: string;
  dropCategory?: string;
  x?: number;
  y?: number;
  scrollDepthPercent?: number;
  durationMs?: number;
  interactionState?: string;
  exitIntent?: string;
  clickCount?: number;
  hoverCount?: number;
  scrollCount?: number;
}

export interface GuestAnalyticsBatch {
  sessionKey: string;
  clientSessionId?: string | null;
  consentMode?: string;
  globalPrivacyControl?: boolean;
  receivedAtMs?: number;
  dayKey?: string;
  hourKey?: string;
  minuteKey?: string;
  eventCount?: number;
  pagePaths?: string[];
  interactionTypes?: string[];
  maxScrollDepth?: number;
  hasPixelData?: boolean;
  events?: GuestBatchEvent[];
}

export interface AnalyticsWindowSummary {
  generatedAtMs: number;
  windowLabel: string;
  totalEvents: number;
  uniqueUsers: number;
  mobileEvents: number;
  viewerSessions: number;
  unwraps: number;
  purchases: number;
  avgLoadMs: number;
  avgWatchSeconds: number;
  topEvents: Array<{key: string; count: number}>;
  topPages: Array<{key: string; count: number}>;
  topDrops: Array<{key: string; count: number; label: string}>;
}

const ANALYTICS_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: ANALYTICS_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
})

function readTimePart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes, fallback: string) {
  return parts.find((part) => part.type === type)?.value ?? fallback
}

export function toTimeKeys(timestamp: number) {
  const parts = ANALYTICS_TIME_FORMATTER.formatToParts(new Date(timestamp))
  const year = readTimePart(parts, "year", "1970")
  const month = readTimePart(parts, "month", "01")
  const day = readTimePart(parts, "day", "01")
  const hour = readTimePart(parts, "hour", "00")
  const minute = readTimePart(parts, "minute", "00")
  return {
    dayKey: `${year}-${month}-${day}`,
    hourKey: `${year}-${month}-${day}T${hour}`,
    minuteKey: `${year}-${month}-${day}T${hour}:${minute}`,
  }
}

export function encodeKeyFragment(value: string) {
  if (!value) {
    return "root"
  }

  return Buffer.from(value).toString("base64url").slice(0, 180) || "root"
}

export function readString(value: unknown, maxLength = 1000): string {
  if (typeof value !== "string") return ""
  return value.slice(0, maxLength)
}

export function readNumber(value: unknown, min = -Number.MAX_VALUE, max = Number.MAX_VALUE): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0
  return Math.max(min, Math.min(max, value))
}

export function readBoolean(value: unknown): boolean {
  return value === true || value === "true"
}

export function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0)
}

export function average(values: number[]) {
  if (values.length === 0) {
    return 0
  }

  return Math.round(sum(values) / values.length)
}

export function buildIncrementUpdate(count: number) {
  return FieldValue.increment(count)
}

export function topEntries(map: Map<string, number>, limit: number) {
  return Array.from(map.entries())
    .map(([key, count]) => ({key, count}))
    .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key))
    .slice(0, limit)
}

export function summarizeEventFacts(
  events: AnalyticsEventFact[],
  windowLabel: string,
): AnalyticsWindowSummary {
  const eventCounts = new Map<string, number>()
  const pageCounts = new Map<string, number>()
  const dropCounts = new Map<string, number>()
  const dropLabels = new Map<string, string>()
  const uniqueUsers = new Set<string>()
  const loadSamples: number[] = []
  const watchSamples: number[] = []

  let mobileEvents = 0
  let viewerSessions = 0
  let unwraps = 0
  let purchases = 0

  events.forEach((event) => {
    const eventName = readString(event.eventName)
    if (!eventName) {
      return
    }

    eventCounts.set(eventName, (eventCounts.get(eventName) || 0) + 1)

    const pagePath = readString(event.pagePath)
    if (pagePath) {
      pageCounts.set(pagePath, (pageCounts.get(pagePath) || 0) + 1)
    }

    const dropId = readString(event.dropId)
    if (dropId) {
      dropCounts.set(dropId, (dropCounts.get(dropId) || 0) + 1)
      dropLabels.set(dropId, readString(event.dropTitle) || dropId)
    }

    if (readString(event.userId)) {
      uniqueUsers.add(readString(event.userId))
    }
    if (readBoolean(event.isMobileViewport)) {
      mobileEvents += 1
    }
    if (eventName === "viewer_session_started") {
      viewerSessions += 1
    }
    if (eventName === "unlock_drop_success") {
      unwraps += 1
    }
    if (eventName === "gumdrops_purchase_completed") {
      purchases += 1
    }

    const loadMs = readNumber(event.loadMs)
    if (loadMs > 0) {
      loadSamples.push(loadMs)
    }

    const watchSeconds = Math.max(
      readNumber(event.sessionWatchSeconds),
      readNumber(event.watchSeconds),
    )
    if (watchSeconds > 0) {
      watchSamples.push(watchSeconds)
    }
  })

  return {
    generatedAtMs: Date.now(),
    windowLabel,
    totalEvents: events.length,
    uniqueUsers: uniqueUsers.size,
    mobileEvents,
    viewerSessions,
    unwraps,
    purchases,
    avgLoadMs: average(loadSamples),
    avgWatchSeconds: average(watchSamples),
    topEvents: topEntries(eventCounts, 12),
    topPages: topEntries(pageCounts, 12),
    topDrops: Array.from(dropCounts.entries())
      .map(([key, count]) => ({
        key,
        count,
        label: dropLabels.get(key) || key,
      }))
      .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key))
      .slice(0, 12),
  }
}
