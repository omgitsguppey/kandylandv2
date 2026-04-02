import "server-only";

import { BetaAnalyticsDataClient } from "@google-analytics/data";

import { adminDb } from "./firebase-admin";
import { fetchTelemetryLogs, safeRunReport } from "./admin-analytics-shared";
import { ADMIN_TELEMETRY_LOG_EVENT_NAMES, TELEMETRY_EVENT_QUERY_NAMES } from "@/lib/telemetry-catalog";

function emptyQuerySnapshot() {
  return {
    docs: [],
    size: 0,
    empty: true,
  } as unknown as FirebaseFirestore.QuerySnapshot;
}

function emptyDocumentSnapshot() {
  return {
    exists: false,
    data: () => undefined,
  } as unknown as FirebaseFirestore.DocumentSnapshot;
}

export function getAdminAnalyticsPropertyId() {
  return process.env.GA_PROPERTY_ID || "";
}

export function createAdminAnalyticsDataClient() {
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (clientEmail && privateKey) {
    return new BetaAnalyticsDataClient({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
        project_id: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      },
    });
  }

  return new BetaAnalyticsDataClient();
}

export async function fetchAdminHistoricalAnalyticsSources(input: {
  analyticsClient: BetaAnalyticsDataClient;
  propertyId: string;
  startDate: string;
  endDate: string;
  startDayKey: string;
  startMs: number;
  period: string | null;
  timelineBucket: "day" | "hour";
}) {
  const { analyticsClient, propertyId, startDate, endDate, startDayKey, startMs, period, timelineBucket } = input;
  const analyticsEventNames = TELEMETRY_EVENT_QUERY_NAMES;
  const trafficDimensionName = timelineBucket === "hour" ? "dateHour" : "date";
  const issues: string[] = [];

  const safeQuery = async (label: string, reader: () => Promise<FirebaseFirestore.QuerySnapshot>) => {
    try {
      return await reader();
    } catch {
      issues.push(`${label} unavailable`);
      return emptyQuerySnapshot();
    }
  };

  const safeDocument = async (label: string, reader: () => Promise<FirebaseFirestore.DocumentSnapshot>) => {
    try {
      return await reader();
    } catch {
      issues.push(`${label} unavailable`);
      return emptyDocumentSnapshot();
    }
  };

    const [
        response,
        eventsResponse,
        geoResponse,
        pagesResponse,
    devicesResponse,
    onboardingResponse,
    dailyRollupsSnapshot,
    pageRollupsSnapshot,
    dropDailySnapshot,
    taskDailySnapshot,
    commerceDailySnapshot,
    sessionFactsSnapshot,
    pipelineHealthSnapshot,
    analyticsEventFactsSnapshot,
    analyticsEventStatsSnapshot,
    securityEventsSnapshot,
    guestBatchesSnapshot,
        commerceSummarySnapshot,
        serverDiagnosticsSnapshot,
        taskRollupSnapshot,
        dropsSnapshot,
        watchSessionsSnapshot,
        watchAssetsSnapshot,
    ] = await Promise.all([
    safeRunReport(analyticsClient, {
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      metrics: [
        { name: "activeUsers" },
        { name: "screenPageViews" },
        { name: "sessions" },
        { name: "newUsers" },
        { name: "averageSessionDuration" },
        { name: "engagementRate" },
      ],
      dimensions: [{ name: trafficDimensionName }],
      orderBys: [{
        dimension: { dimensionName: trafficDimensionName },
        desc: false,
      }],
    }),
    safeRunReport(analyticsClient, {
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      metrics: [{ name: "eventCount" }],
      dimensions: [{ name: "eventName" }],
      dimensionFilter: {
        filter: {
          fieldName: "eventName",
          inListFilter: {
            values: analyticsEventNames,
          },
        },
      },
    }),
    safeRunReport(analyticsClient, {
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      metrics: [{ name: "activeUsers" }],
      dimensions: [{ name: "country" }, { name: "city" }],
      orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
      limit: 15,
    }),
    safeRunReport(analyticsClient, {
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      metrics: [{ name: "screenPageViews" }, { name: "averageSessionDuration" }, { name: "engagementRate" }],
      dimensions: [{ name: "pagePath" }],
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit: 25,
    }),
    safeRunReport(analyticsClient, {
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      metrics: [
        { name: "activeUsers" },
        { name: "sessions" },
        { name: "engagementRate" },
      ],
      dimensions: [{ name: "deviceCategory" }],
      orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
      limit: 3,
    }),
    safeRunReport(analyticsClient, {
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      metrics: [{ name: "eventCount" }],
      dimensions: [{ name: "customEvent:durationSeconds" }],
      dimensionFilter: {
        filter: {
          fieldName: "eventName",
          stringFilter: {
            value: "guided_onboarding_completed",
            matchType: "EXACT",
          },
        },
      },
    }),
    safeQuery("daily analytics rollups", () => adminDb.collection("analytics_rollups_daily")
      .where("dayKey", ">=", startDayKey)
      .get()),
    safeQuery("page analytics rollups", () => adminDb.collection("analytics_page_daily")
      .where("dayKey", ">=", startDayKey)
      .get()),
    safeQuery("drop analytics rollups", () => adminDb.collection("analytics_drop_daily")
      .where("dayKey", ">=", startDayKey)
      .get()),
    safeQuery("task analytics rollups", () => adminDb.collection("analytics_task_daily")
      .where("dayKey", ">=", startDayKey)
      .get()),
    safeQuery("commerce analytics rollups", () => adminDb.collection("analytics_commerce_daily")
      .where("dayKey", ">=", startDayKey)
      .get()),
    safeQuery("session analytics facts", () => adminDb.collection("analytics_session_facts")
      .where("dayKey", ">=", startDayKey)
      .get()),
    safeQuery("pipeline analytics", () => adminDb.collection("analytics_pipeline_daily")
      .where("dayKey", ">=", startDayKey)
      .get()),
    period === "all"
      ? safeQuery("analytics event facts", () => adminDb.collection("analytics_event_facts")
        .orderBy("timestamp", "desc")
        .get())
      : safeQuery("analytics event facts", () => adminDb.collection("analytics_event_facts")
        .where("timestamp", ">=", startMs)
        .get()),
    safeQuery("analytics event stats", () => adminDb.collection("analytics_event_stats").get()),
    period === "all"
      ? safeQuery("security events", () => adminDb.collection("security_events")
        .orderBy("timestamp", "desc")
        .get())
      : safeQuery("security events", () => adminDb.collection("security_events")
        .where("timestamp", ">=", startMs)
        .orderBy("timestamp", "desc")
        .get()),
    period === "all"
      ? safeQuery("guest analytics batches", () => adminDb.collection("analytics_guest_batches")
        .orderBy("receivedAtMs", "desc")
        .get())
      : safeQuery("guest analytics batches", () => adminDb.collection("analytics_guest_batches")
        .where("receivedAtMs", ">=", startMs)
        .orderBy("receivedAtMs", "desc")
        .get()),
    safeDocument("commerce analytics summary", () => adminDb.collection("analytics_commerce_rollup")
      .doc("summary")
      .get()),
    period === "all"
      ? safeQuery("server diagnostics", () => adminDb.collection("server_diagnostics")
        .orderBy("createdAtMs", "desc")
        .get())
      : safeQuery("server diagnostics", () => adminDb.collection("server_diagnostics")
        .where("createdAtMs", ">=", startMs)
        .orderBy("createdAtMs", "desc")
        .get()),
    safeQuery("task analytics summary", () => adminDb.collection("analytics_task_rollup").get()),
    period === "all" ? safeQuery("drops archive", () => adminDb.collection("drops").get()) : Promise.resolve<FirebaseFirestore.QuerySnapshot | null>(null),
    period === "all"
      ? safeQuery("watch sessions", () => adminDb.collection("analytics_watch_sessions")
        .orderBy("lastSeenAtMs", "desc")
        .get())
      : safeQuery("watch sessions", () => adminDb.collection("analytics_watch_sessions")
        .where("lastSeenAtMs", ">=", startMs)
        .orderBy("lastSeenAtMs", "desc")
        .get()),
    period === "all"
      ? safeQuery("watch assets", () => adminDb.collection("analytics_watch_assets")
        .orderBy("lastSeenAtMs", "desc")
        .get())
      : safeQuery("watch assets", () => adminDb.collection("analytics_watch_assets")
        .where("lastSeenAtMs", ">=", startMs)
        .orderBy("lastSeenAtMs", "desc")
        .get()),
  ]);

  const [
    telemetryLogsByEvent,
    taskEventsSnapshot,
    transactionsInRangeSnapshot,
  ] = await Promise.all([
    fetchTelemetryLogs(ADMIN_TELEMETRY_LOG_EVENT_NAMES, startMs),
    safeQuery("daily task events", () => adminDb.collection("daily_task_events")
      .where("timestamp", ">=", startMs)
      .orderBy("timestamp", "desc")
      .get()),
    period === "all"
      ? safeQuery("transactions", () => adminDb.collection("transactions")
        .orderBy("timestamp", "desc")
        .get())
      : safeQuery("transactions", () => adminDb.collection("transactions")
        .where("timestamp", ">=", startMs)
        .orderBy("timestamp", "desc")
        .get()),
  ]);

  return {
    issues,
    response,
    eventsResponse,
    geoResponse,
    pagesResponse,
    devicesResponse,
    onboardingResponse,
    dailyRollupsSnapshot,
    pageRollupsSnapshot,
    dropDailySnapshot,
    taskDailySnapshot,
    commerceDailySnapshot,
    sessionFactsSnapshot,
    pipelineHealthSnapshot,
    analyticsEventFactsSnapshot,
    analyticsEventStatsSnapshot,
    securityEventsSnapshot,
    guestBatchesSnapshot,
    commerceSummarySnapshot,
    serverDiagnosticsSnapshot,
    taskRollupSnapshot,
    dropsSnapshot,
    watchSessionsSnapshot,
    watchAssetsSnapshot,
    telemetryLogsByEvent,
    taskEventsSnapshot,
    transactionsInRangeSnapshot,
  };
}
