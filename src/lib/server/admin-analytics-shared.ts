import { BetaAnalyticsDataClient } from "@google-analytics/data";
import * as firebaseAdmin from "firebase-admin";

import { fromCSTInput, getCSTDateKey, getCSTDateParts, shiftCSTDateKey } from "@/lib/timezone";
import { TELEMETRY_EVENT_ALIAS_MAP } from "@/lib/telemetry-catalog";
import { mapLegacyEventToCurrentMetric } from "@/lib/math/legacy-metric-canonicalization";
import { mapWithConcurrency } from "@/lib/server/bounded-concurrency";

const ADMIN_ANALYTICS_EVENT_FACT_QUERY_CONCURRENCY = 3;

export type RangeWindow = {
  startDate: string;
  endDate: string;
  startMs: number;
  endMs: number;
  startDayKey: string;
  endDayKey: string;
  timelineBucket: "day" | "hour";
};

export type TelemetryLogRecord = {
  eventName: string;
  params: Record<string, unknown>;
  userId: string;
  username?: string;
  timestamp: number;
  userAgent?: string;
};

export type TaskLifecycleLog = {
  id: string;
  type: string;
  taskId: string;
  title: string;
  triggerEvent: string;
  userId: string;
  username?: string;
  reward: number;
  progress: number;
  maxProgress: number;
  timestamp: number;
  reason?: string;
  assignedAt?: number;
  startedAt?: number;
  durationMs?: number;
};

export type ViewerOverview = {
  viewCount: number;
  sessionCount: number;
  uniqueViewerCount: number;
  repeatSessionCount: number;
  returnSessionCount: number;
  totalWatchSeconds: number;
  avgSessionSeconds: number;
  avgWatchSeconds: number;
  watchScoreSource?: "watch_session_rollup" | "legacy_page_duration";
  watchScoreConfidence?: "high" | "low";
  avgLoadMs: number;
  assetCompletionRate: number;
  meaningfulSessionCount: number;
  openedWithoutDepthCount: number;
  bounceSessionCount: number;
  abandonedSessionCount: number;
  stalledSessionCount: number;
  convertedSessionCount: number;
  completedSessionCount: number;
  assetSwitches: number;
  downloads: number;
  relatedClicks: number;
};

export type ViewerDropInsight = {
  dropId: string;
  dropTitle: string;
  viewCount: number;
  sessionCount: number;
  uniqueViewerCount: number;
  repeatSessionCount: number;
  returnSessionCount: number;
  totalWatchSeconds: number;
  avgSessionSeconds: number;
  avgWatchSeconds: number;
  watchScoreSource?: "watch_session_rollup" | "legacy_page_duration";
  watchScoreConfidence?: "high" | "low";
  assetStarts: number;
  assetCompletions: number;
  meaningfulSessionCount: number;
  openedWithoutDepthCount: number;
  bounceSessionCount: number;
  abandonedSessionCount: number;
  stalledSessionCount: number;
  convertedSessionCount: number;
  completedSessionCount: number;
  assetSwitches: number;
  downloads: number;
  relatedClicks: number;
  avgLoadMs: number;
};

export type ViewerUserOption = {
  uid: string;
  username: string;
  viewCount: number;
  sessionCount: number;
  totalWatchSeconds: number;
  lastSeenAtMs?: number;
};

export type SessionFactRecord = {
  id: string;
  sessionId?: string;
  userId?: string;
  username?: string;
  dropId?: string;
  dropTitle?: string;
  pagePath?: string;
  dayKey?: string;
  hourKey?: string;
  firstEventAtMs?: number;
  lastEventAtMs?: number;
  eventCount?: number;
  startedCount?: number;
  completedCount?: number;
  watchSecondsTotal?: number;
  loadMsTotal?: number;
  loadSampleCount?: number;
};

export type OnboardingFactRecord = {
  eventName?: string;
  timestamp: number;
  durationMs: number;
};

export type OnboardingStepFactRecord = {
  eventName: string;
  timestamp: number;
  stepKey: string;
  stepTitle: string;
  stepIndex: number;
  durationMs: number;
};

export type RegistrationFactRecord = {
  eventName: string;
  timestamp: number;
  registrationMethod: string;
};

export type ViewerDropFactAccumulator = {
  dropId: string;
  dropTitle: string;
  viewCount: number;
  sessionCount: number;
  uniqueViewerKeys: Set<string>;
  sessionCounts: Map<string, number>;
  totalWatchSeconds: number;
  loadMsTotal: number;
  loadSampleCount: number;
};

export type AnalyticsReportRow = {
  dimensionValues?: Array<{ value?: string | null }>;
  metricValues?: Array<{ value?: string | null }>;
};

export type AnalyticsReportResponse = {
  rows?: AnalyticsReportRow[];
  fallbackUsed?: boolean;
};

export const AUTHENTICATED_PAGE_VIEW_EVENT_NAMES = new Set([
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
]);

function getCstDayStartMs(daysAgo: number) {
  const currentDayKey = getCSTDateKey(Date.now());
  const shiftedDayKey = shiftCSTDateKey(currentDayKey, -daysAgo);
  return fromCSTInput(`${shiftedDayKey}T00:00`);
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function getRangeWindow(period: string | null): RangeWindow {
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const endDayKey = getCSTDateKey(now);

  if (period === "1h") {
    const startMs = now - (60 * 60 * 1000);
    return {
      startDate: getCSTDateKey(startMs),
      endDate: endDayKey,
      startMs,
      endMs: now,
      startDayKey: getCSTDateKey(startMs),
      endDayKey,
      timelineBucket: "hour",
    };
  }

  if (period === "6h") {
    const startMs = now - (6 * 60 * 60 * 1000);
    return {
      startDate: getCSTDateKey(startMs),
      endDate: endDayKey,
      startMs,
      endMs: now,
      startDayKey: getCSTDateKey(startMs),
      endDayKey,
      timelineBucket: "hour",
    };
  }

  if (period === "24h") {
    const startMs = now - oneDayMs;
    return {
      startDate: getCSTDateKey(startMs),
      endDate: endDayKey,
      startMs,
      endMs: now,
      startDayKey: getCSTDateKey(startMs),
      endDayKey,
      timelineBucket: "hour",
    };
  }

  if (period === "3d") {
    const startMs = getCstDayStartMs(3);
    return {
      startDate: getCSTDateKey(startMs),
      endDate: endDayKey,
      startMs,
      endMs: now,
      startDayKey: getCSTDateKey(startMs),
      endDayKey,
      timelineBucket: "day",
    };
  }

  if (period === "7d") {
    const startMs = getCstDayStartMs(7);
    return {
      startDate: getCSTDateKey(startMs),
      endDate: endDayKey,
      startMs,
      endMs: now,
      startDayKey: getCSTDateKey(startMs),
      endDayKey,
      timelineBucket: "day",
    };
  }

  if (period === "14d") {
    const startMs = getCstDayStartMs(14);
    return {
      startDate: getCSTDateKey(startMs),
      endDate: endDayKey,
      startMs,
      endMs: now,
      startDayKey: getCSTDateKey(startMs),
      endDayKey,
      timelineBucket: "day",
    };
  }

  if (period === "90d") {
    const startMs = getCstDayStartMs(90);
    return {
      startDate: getCSTDateKey(startMs),
      endDate: endDayKey,
      startMs,
      endMs: now,
      startDayKey: getCSTDateKey(startMs),
      endDayKey,
      timelineBucket: "day",
    };
  }

  if (period === "all") {
    const startMs = getCstDayStartMs(3650);
    return {
      startDate: "2020-01-01",
      endDate: endDayKey,
      startMs,
      endMs: now,
      startDayKey: "2020-01-01",
      endDayKey,
      timelineBucket: "day",
    };
  }

  const startMs = getCstDayStartMs(30);
  return {
    startDate: getCSTDateKey(startMs),
    endDate: endDayKey,
    startMs,
    endMs: now,
    startDayKey: getCSTDateKey(startMs),
    endDayKey,
    timelineBucket: "day",
  };
}

export function timestampToDayKey(timestamp: number) {
  return getCSTDateKey(timestamp);
}

export function timestampToHourKey(timestamp: number) {
  const { year, month, day, hour } = getCSTDateParts(timestamp);
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}`;
}

export function rawDateToDayKey(rawDate: string) {
  if (rawDate.length !== 8) {
    return rawDate;
  }

  return `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;
}

export function dayKeyToRawDate(dayKey: string) {
  return dayKey.replaceAll("-", "");
}

export function rawDateHourToHourKey(rawDateHour: string) {
  if (rawDateHour.length !== 10) {
    return rawDateHour;
  }

  return `${rawDateHour.slice(0, 4)}-${rawDateHour.slice(4, 6)}-${rawDateHour.slice(6, 8)}T${rawDateHour.slice(8, 10)}`;
}

export function hourKeyToRawDate(hourKey: string) {
  return hourKey.replaceAll("-", "").replace("T", "").replaceAll(":", "");
}

export function dayKeyToLabel(dayKey: string) {
  return dayKey.slice(5).replace("-", "/");
}

export function hourKeyToLabel(hourKey: string) {
  const [datePart, hourPart = "00"] = hourKey.split("T");
  const monthDay = dayKeyToLabel(datePart);
  return `${monthDay} ${hourPart}:00`;
}

export function buildTimelineKeys(input: {
  startMs: number;
  endMs: number;
  startDayKey: string;
  endDayKey: string;
  timelineBucket: "day" | "hour";
}) {
  if (input.timelineBucket === "day") {
    const keys: string[] = [];
    let currentDayKey = input.startDayKey;
    while (currentDayKey <= input.endDayKey) {
      keys.push(currentDayKey);
      currentDayKey = shiftCSTDateKey(currentDayKey, 1);
    }
    return keys;
  }

  const keys: string[] = [];
  const seen = new Set<string>();
  let bucketMs = Math.floor(input.startMs / (60 * 60 * 1000)) * (60 * 60 * 1000);
  while (bucketMs <= input.endMs) {
    const hourKey = timestampToHourKey(bucketMs);
    if (!seen.has(hourKey)) {
      seen.add(hourKey);
      keys.push(hourKey);
    }
    bucketMs += 60 * 60 * 1000;
  }

  const endHourKey = timestampToHourKey(input.endMs);
  if (!seen.has(endHourKey)) {
    keys.push(endHourKey);
  }

  return keys;
}

export function toNumber(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function toStringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function safeParams(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

export function getTelemetryParamString(record: TelemetryLogRecord, key: string): string {
  return toStringValue(record.params[key]).trim();
}

export function getTelemetryParamNumber(record: TelemetryLogRecord, key: string): number {
  return toNumber(record.params[key]);
}

export async function fetchTelemetryLogs(
  eventNames: readonly string[],
  startMs: number,
): Promise<Record<string, TelemetryLogRecord[]>> {
  const eventMap: Record<string, TelemetryLogRecord[]> = {};
  const normalizedEventNames = Array.from(new Set(eventNames.filter((eventName) => eventName.trim().length > 0)));

  normalizedEventNames.forEach((eventName) => {
    eventMap[eventName] = [];
  });

  if (normalizedEventNames.length === 0) {
    return eventMap;
  }

  try {
    const eventNameChunks: string[][] = [];
    for (let index = 0; index < normalizedEventNames.length; index += 10) {
      eventNameChunks.push(normalizedEventNames.slice(index, index + 10));
    }

    const snapshots = await mapWithConcurrency(
      eventNameChunks,
      ADMIN_ANALYTICS_EVENT_FACT_QUERY_CONCURRENCY,
      async (eventNameChunk) => {
      try {
        return await firebaseAdmin.firestore()
          .collection("analytics_event_facts")
          .where("timestamp", ">=", startMs)
          .where("eventName", "in", eventNameChunk)
          .get();
      } catch (error) {
        console.warn(`Admin analytics fact query failed for ${eventNameChunk.join(", ")}:`, error);
        return null;
      }
      },
    );

    snapshots.forEach((snapshot) => {
      if (!snapshot) {
        return;
      }

      snapshot.docs.forEach((doc) => {
        const rawEntry = doc.data() as Record<string, unknown>;
        const eventName = toStringValue(rawEntry.eventName);
        if (!normalizedEventNames.includes(eventName)) {
          return;
        }

        eventMap[eventName].push({
          eventName,
          params: safeParams(rawEntry.params),
          userId: toStringValue(rawEntry.userId),
          username: toStringValue(rawEntry.username) || undefined,
          timestamp: toNumber(rawEntry.timestamp),
          userAgent: toStringValue(rawEntry.userAgent) || undefined,
        });
      });
    });
  } catch (error) {
    console.warn("Admin analytics canonical event query failed:", error);
  }

  normalizedEventNames.forEach((eventName) => {
    eventMap[eventName] = eventMap[eventName]
      .filter((record) => record.timestamp >= startMs)
      .sort((left, right) => right.timestamp - left.timestamp);
  });

  return eventMap;
}

export function buildDurationBuckets(values: number[], bucketEdges: Array<{ label: string; max: number }>) {
  let previousMax = 0;

  return bucketEdges.map((bucket) => {
    const count = values.filter((value) => value > previousMax && value <= bucket.max).length;
    previousMax = bucket.max;

    return {
      label: bucket.label,
      count,
    };
  });
}

export function formatTaskReason(reason: string) {
  if (reason === "tasks_and_checkin") return "Tasks + check-in";
  if (reason === "checkin") return "Check-in only";
  if (reason === "tasks") return "Tasks only";
  if (reason === "missed_daily_progress") return "Missed progress";
  return reason || "Unknown";
}

export function normalizeViewerIdentity(value: string) {
  return value.trim().replace(/^@/, "").toLowerCase();
}

export function matchesViewerFilter(record: TelemetryLogRecord, viewerFilter: string) {
  if (!viewerFilter) {
    return true;
  }

  const normalizedFilter = normalizeViewerIdentity(viewerFilter);
  if (!normalizedFilter) {
    return true;
  }

  const candidateUserId = normalizeViewerIdentity(record.userId || "");
  const candidateUsername = normalizeViewerIdentity(record.username || "");
  return candidateUserId === normalizedFilter || candidateUsername === normalizedFilter;
}

export function getTelemetryDropId(record: TelemetryLogRecord) {
  return getTelemetryParamString(record, "drop_id") || "unknown-drop";
}

export function getTelemetryDropTitle(record: TelemetryLogRecord) {
  return getTelemetryParamString(record, "drop_title") || getTelemetryDropId(record);
}

export function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return Math.round(sum(values) / values.length);
}

export function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

export function buildMergedCountMap(...sources: Array<Record<string, number>>) {
  const merged = new Map<string, number>();

  sources.forEach((source) => {
    Object.entries(source).forEach(([key, value]) => {
      const numericValue = toNumber(value);
      merged.set(key, Math.max(merged.get(key) || 0, numericValue));
    });
  });

  return merged;
}

export function sumEventCounts(
  counts: Record<string, number>,
  eventNames: string[],
) {
  const indexedNames = new Set(eventNames);
  return Object.entries(counts).reduce((total, [eventName, value]) => {
    if (indexedNames.has(eventName) || indexedNames.has(TELEMETRY_EVENT_ALIAS_MAP[eventName] || "")) {
      return total + toNumber(value);
    }

    return total;
  }, 0);
}

export function maxCanonicalEventCount(
  counts: Record<string, number>,
  canonicalEventName: string,
  eventNames: string[] = [],
) {
  const indexedNames = new Set([canonicalEventName, ...eventNames]);

  return Object.entries(counts).reduce((maxCount, [eventName, value]) => {
    const catalogAlias = TELEMETRY_EVENT_ALIAS_MAP[eventName] || "";
    const legacyCanonicalName = mapLegacyEventToCurrentMetric({ eventName }).canonicalEventName;
    const matchesCanonicalFamily = indexedNames.has(eventName)
      || indexedNames.has(catalogAlias)
      || legacyCanonicalName === canonicalEventName;

    return matchesCanonicalFamily ? Math.max(maxCount, toNumber(value)) : maxCount;
  }, 0);
}

export function sumSnapshotField(
  snapshot: FirebaseFirestore.QuerySnapshot,
  fieldName: string,
) {
  return snapshot.docs.reduce((total, doc) => total + toNumber((doc.data() as Record<string, unknown>)[fieldName]), 0);
}

export async function safeRunReport(
  analyticsClient: BetaAnalyticsDataClient,
  requestConfig: Parameters<BetaAnalyticsDataClient["runReport"]>[0],
  options?: { timeoutMs?: number },
): Promise<AnalyticsReportResponse> {
  try {
    const timeoutMs = Math.max(1_000, Math.min(options?.timeoutMs ?? 10_000, 30_000));
    const quotaAwareRequest = {
      ...requestConfig,
      returnPropertyQuota: true,
    };
    const [response] = await analyticsClient.runReport(quotaAwareRequest, { timeout: timeoutMs });
    return response as AnalyticsReportResponse;
  } catch (error) {
    console.warn("GA runReport failed, falling back to first-party analytics:", error);
    return { rows: [], fallbackUsed: true };
  }
}

export async function safeRunRealtimeReport(
  analyticsClient: BetaAnalyticsDataClient,
  requestConfig: Parameters<BetaAnalyticsDataClient["runRealtimeReport"]>[0],
  options?: { timeoutMs?: number },
): Promise<AnalyticsReportResponse> {
  try {
    const timeoutMs = Math.max(1_000, Math.min(options?.timeoutMs ?? 10_000, 30_000));
    const quotaAwareRequest = {
      ...requestConfig,
      returnPropertyQuota: true,
    };
    const [response] = await analyticsClient.runRealtimeReport(quotaAwareRequest, { timeout: timeoutMs });
    return response as AnalyticsReportResponse;
  } catch (error) {
    console.warn("GA realtime report failed, falling back to first-party analytics:", error);
    return { rows: [], fallbackUsed: true };
  }
}
