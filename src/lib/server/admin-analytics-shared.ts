import { BetaAnalyticsDataClient } from "@google-analytics/data";
import * as firebaseAdmin from "firebase-admin";

import { fromCSTInput, getCSTDateKey, shiftCSTDateKey } from "@/lib/timezone";
import { TELEMETRY_EVENT_ALIAS_MAP } from "@/lib/telemetry-catalog";

export type RangeWindow = {
  startDate: string;
  startMs: number;
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
  totalWatchSeconds: number;
  avgSessionSeconds: number;
  avgWatchSeconds: number;
  avgLoadMs: number;
  assetCompletionRate: number;
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
  totalWatchSeconds: number;
  avgSessionSeconds: number;
  avgWatchSeconds: number;
  assetStarts: number;
  assetCompletions: number;
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
};

export const AUTHENTICATED_PAGE_VIEW_EVENT_NAMES = new Set([
  "dashboard_viewed",
  "library_viewed",
  "experience_hub_viewed",
  "drops_page_viewed",
  "faq_page_viewed",
  "home_page_viewed",
]);

function getCstDayStartMs(daysAgo: number) {
  const currentDayKey = getCSTDateKey(Date.now());
  const shiftedDayKey = shiftCSTDateKey(currentDayKey, -daysAgo);
  return fromCSTInput(`${shiftedDayKey}T00:00`);
}

export function getRangeWindow(period: string | null): RangeWindow {
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;

  if (period === "1h") {
    return { startDate: "today", startMs: now - (60 * 60 * 1000) };
  }

  if (period === "6h") {
    return { startDate: "today", startMs: now - (6 * 60 * 60 * 1000) };
  }

  if (period === "24h") {
    return { startDate: "1daysAgo", startMs: now - oneDayMs };
  }

  if (period === "3d") {
    return { startDate: "3daysAgo", startMs: getCstDayStartMs(3) };
  }

  if (period === "7d") {
    return { startDate: "7daysAgo", startMs: getCstDayStartMs(7) };
  }

  if (period === "14d") {
    return { startDate: "14daysAgo", startMs: getCstDayStartMs(14) };
  }

  if (period === "90d") {
    return { startDate: "90daysAgo", startMs: getCstDayStartMs(90) };
  }

  if (period === "all") {
    return { startDate: "2020-01-01", startMs: getCstDayStartMs(3650) };
  }

  return { startDate: "30daysAgo", startMs: getCstDayStartMs(30) };
}

export function timestampToDayKey(timestamp: number) {
  return getCSTDateKey(timestamp);
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

export function dayKeyToLabel(dayKey: string) {
  return dayKey.slice(5).replace("-", "/");
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

  try {
    const database = firebaseAdmin.database();
    await Promise.all(
      eventNames.map(async (eventName) => {
        try {
        const snapshot = await database
          .ref(`telemetry/events/${eventName}`)
          .orderByChild("timestamp")
          .startAt(startMs)
          .get();

        const rawValue = snapshot.val();
        const records = rawValue && typeof rawValue === "object"
          ? Object.values(rawValue as Record<string, unknown>).flatMap((entry) => {
              if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
                return [];
              }

              const rawEntry = entry as Record<string, unknown>;
              return [{
                eventName,
                params: safeParams(rawEntry.params),
                userId: toStringValue(rawEntry.userId),
                username: toStringValue(rawEntry.username) || undefined,
                timestamp: toNumber(rawEntry.timestamp),
                userAgent: toStringValue(rawEntry.userAgent) || undefined,
              }];
            })
          : [];

        eventMap[eventName] = records
          .filter((record) => record.timestamp >= startMs)
          .sort((left, right) => right.timestamp - left.timestamp);
        } catch (error) {
          console.warn(`Admin analytics telemetry query failed for ${eventName}:`, error);
          eventMap[eventName] = [];
        }
      }),
    );
  } catch (error) {
    console.warn("Admin analytics telemetry query failed:", error);
    eventNames.forEach((eventName) => {
      eventMap[eventName] = [];
    });
  }

  eventNames.forEach((eventName) => {
    if (!eventMap[eventName]) {
      eventMap[eventName] = [];
    }
  });

  return eventMap;
}

export function buildDurationBuckets(values: number[], bucketEdges: Array<{ label: string; max: number }>) {
  return bucketEdges.map((bucket) => ({
    label: bucket.label,
    count: values.filter((value) => value > 0 && value <= bucket.max).length,
  }));
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

export function sumSnapshotField(
  snapshot: FirebaseFirestore.QuerySnapshot,
  fieldName: string,
) {
  return snapshot.docs.reduce((total, doc) => total + toNumber((doc.data() as Record<string, unknown>)[fieldName]), 0);
}

export async function safeRunReport(
  analyticsClient: BetaAnalyticsDataClient,
  requestConfig: Parameters<BetaAnalyticsDataClient["runReport"]>[0],
): Promise<AnalyticsReportResponse> {
  try {
    const [response] = await analyticsClient.runReport(requestConfig);
    return response as AnalyticsReportResponse;
  } catch (error) {
    console.warn("GA runReport failed, falling back to first-party analytics:", error);
    return { rows: [] };
  }
}

export async function safeRunRealtimeReport(
  analyticsClient: BetaAnalyticsDataClient,
  requestConfig: Parameters<BetaAnalyticsDataClient["runRealtimeReport"]>[0],
): Promise<AnalyticsReportResponse> {
  try {
    const [response] = await analyticsClient.runRealtimeReport(requestConfig);
    return response as AnalyticsReportResponse;
  } catch (error) {
    console.warn("GA realtime report failed, falling back to first-party analytics:", error);
    return { rows: [] };
  }
}
