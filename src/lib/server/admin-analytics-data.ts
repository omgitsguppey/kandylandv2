import "server-only";

import { BetaAnalyticsDataClient } from "@google-analytics/data";

import { adminDb } from "./firebase-admin";
import { fetchTelemetryLogs, safeRunReport } from "./admin-analytics-shared";
import { readThroughEphemeralRouteCache } from "./ephemeral-route-cache";
import {
  safeDocumentWithDiagnostics,
  safeQueryWithDiagnostics,
} from "./diagnostic-read-fallbacks";
import { ADMIN_TELEMETRY_LOG_EVENT_NAMES, TELEMETRY_EVENT_QUERY_NAMES } from "@/lib/telemetry-catalog";

const ADMIN_ANALYTICS_HISTORICAL_CACHE_TTL_MS = 30_000;

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
  section?: string | null;
}) {
  const { analyticsClient, propertyId, startDate, endDate, startDayKey, startMs, period, timelineBucket, section } = input;

  return readThroughEphemeralRouteCache({
    key: `admin-historical-sources:${propertyId}:${startDate}:${endDate}:${startDayKey}:${startMs}:${period ?? "default"}:${timelineBucket}:${section ?? "all"}`,
    ttlMs: ADMIN_ANALYTICS_HISTORICAL_CACHE_TTL_MS,
    loader: async () => {
      const analyticsEventNames = TELEMETRY_EVENT_QUERY_NAMES;
      const trafficDimensionName = timelineBucket === "hour" ? "dateHour" : "date";
      const issues: string[] = [];

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
      guestSessionsSnapshot,
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
    safeQueryWithDiagnostics({
      routeName: "admin/analytics/historical",
      channel: "analytics",
      label: "daily analytics rollups",
      issues,
      reader: () => adminDb.collection("analytics_rollups_daily")
        .where("dayKey", ">=", startDayKey)
        .get(),
    }),
    safeQueryWithDiagnostics({
      routeName: "admin/analytics/historical",
      channel: "analytics",
      label: "page analytics rollups",
      issues,
      reader: () => adminDb.collection("analytics_page_daily")
        .where("dayKey", ">=", startDayKey)
        .get(),
    }),
    safeQueryWithDiagnostics({
      routeName: "admin/analytics/historical",
      channel: "analytics",
      label: "drop analytics rollups",
      issues,
      reader: () => adminDb.collection("analytics_drop_daily")
        .where("dayKey", ">=", startDayKey)
        .get(),
    }),
    safeQueryWithDiagnostics({
      routeName: "admin/analytics/historical",
      channel: "analytics",
      label: "task analytics rollups",
      issues,
      reader: () => adminDb.collection("analytics_task_daily")
        .where("dayKey", ">=", startDayKey)
        .get(),
    }),
    safeQueryWithDiagnostics({
      routeName: "admin/analytics/historical",
      channel: "commerce",
      label: "commerce analytics rollups",
      issues,
      reader: () => adminDb.collection("analytics_commerce_daily")
        .where("dayKey", ">=", startDayKey)
        .get(),
    }),
    safeQueryWithDiagnostics({
      routeName: "admin/analytics/historical",
      channel: "analytics",
      label: "session analytics facts",
      issues,
      reader: () => adminDb.collection("analytics_session_facts")
        .where("dayKey", ">=", startDayKey)
        .get(),
    }),
    safeQueryWithDiagnostics({
      routeName: "admin/analytics/historical",
      channel: "analytics",
      label: "pipeline analytics",
      issues,
      reader: () => adminDb.collection("analytics_pipeline_daily")
        .where("dayKey", ">=", startDayKey)
        .get(),
    }),
    period === "all"
      ? safeQueryWithDiagnostics({
        routeName: "admin/analytics/historical",
        channel: "analytics",
        label: "analytics event facts",
        issues,
        reader: () => adminDb.collection("analytics_event_facts")
          .orderBy("timestamp", "desc")
          .get(),
      })
      : safeQueryWithDiagnostics({
        routeName: "admin/analytics/historical",
        channel: "analytics",
        label: "analytics event facts",
        issues,
        reader: () => adminDb.collection("analytics_event_facts")
          .where("timestamp", ">=", startMs)
          .get(),
      }),
    safeQueryWithDiagnostics({
      routeName: "admin/analytics/historical",
      channel: "analytics",
      label: "analytics event stats",
      issues,
      reader: () => adminDb.collection("analytics_event_stats").get(),
    }),
    period === "all"
      ? safeQueryWithDiagnostics({
        routeName: "admin/analytics/historical",
        channel: "analytics",
        label: "security events",
        issues,
        reader: () => adminDb.collection("security_events")
          .orderBy("timestamp", "desc")
          .get(),
      })
      : safeQueryWithDiagnostics({
        routeName: "admin/analytics/historical",
        channel: "analytics",
        label: "security events",
        issues,
        reader: () => adminDb.collection("security_events")
          .where("timestamp", ">=", startMs)
          .orderBy("timestamp", "desc")
          .get(),
      }),
    period === "all"
      ? safeQueryWithDiagnostics({
        routeName: "admin/analytics/historical",
        channel: "analytics",
        label: "guest analytics batches",
        issues,
        reader: () => adminDb.collection("analytics_guest_batches")
          .orderBy("receivedAtMs", "desc")
          .get(),
      })
      : safeQueryWithDiagnostics({
        routeName: "admin/analytics/historical",
        channel: "analytics",
        label: "guest analytics batches",
        issues,
        reader: () => adminDb.collection("analytics_guest_batches")
          .where("receivedAtMs", ">=", startMs)
          .orderBy("receivedAtMs", "desc")
          .get(),
      }),
    period === "all"
      ? safeQueryWithDiagnostics({
        routeName: "admin/analytics/historical",
        channel: "analytics",
        label: "guest analytics sessions",
        issues,
        reader: () => adminDb.collection("analytics_sessions")
          .orderBy("lastReceivedAtMs", "desc")
          .get(),
      })
      : safeQueryWithDiagnostics({
        routeName: "admin/analytics/historical",
        channel: "analytics",
        label: "guest analytics sessions",
        issues,
        reader: () => adminDb.collection("analytics_sessions")
          .where("lastReceivedAtMs", ">=", startMs)
          .orderBy("lastReceivedAtMs", "desc")
          .get(),
      }),
    safeDocumentWithDiagnostics({
      routeName: "admin/analytics/historical",
      channel: "commerce",
      label: "commerce analytics summary",
      issues,
      reader: () => adminDb.collection("analytics_commerce_rollup")
        .doc("summary")
        .get(),
    }),
    period === "all"
      ? safeQueryWithDiagnostics({
        routeName: "admin/analytics/historical",
        channel: "admin",
        label: "server diagnostics",
        issues,
        reader: () => adminDb.collection("server_diagnostics")
          .orderBy("createdAtMs", "desc")
          .get(),
      })
      : safeQueryWithDiagnostics({
        routeName: "admin/analytics/historical",
        channel: "admin",
        label: "server diagnostics",
        issues,
        reader: () => adminDb.collection("server_diagnostics")
          .where("createdAtMs", ">=", startMs)
          .orderBy("createdAtMs", "desc")
          .get(),
      }),
    safeQueryWithDiagnostics({
      routeName: "admin/analytics/historical",
      channel: "analytics",
      label: "task analytics summary",
      issues,
      reader: () => adminDb.collection("analytics_task_rollup").get(),
    }),
    period === "all"
      ? safeQueryWithDiagnostics({
        routeName: "admin/analytics/historical",
        channel: "admin",
        label: "drops archive",
        issues,
        reader: () => adminDb.collection("drops").get(),
      })
      : Promise.resolve<FirebaseFirestore.QuerySnapshot | null>(null),
    period === "all"
      ? safeQueryWithDiagnostics({
        routeName: "admin/analytics/historical",
        channel: "analytics",
        label: "watch sessions",
        issues,
        reader: () => adminDb.collection("analytics_watch_sessions")
          .orderBy("lastSeenAtMs", "desc")
          .get(),
      })
      : safeQueryWithDiagnostics({
        routeName: "admin/analytics/historical",
        channel: "analytics",
        label: "watch sessions",
        issues,
        reader: () => adminDb.collection("analytics_watch_sessions")
          .where("lastSeenAtMs", ">=", startMs)
          .orderBy("lastSeenAtMs", "desc")
          .get(),
      }),
    period === "all"
      ? safeQueryWithDiagnostics({
        routeName: "admin/analytics/historical",
        channel: "analytics",
        label: "watch assets",
        issues,
        reader: () => adminDb.collection("analytics_watch_assets")
          .orderBy("lastSeenAtMs", "desc")
          .get(),
      })
      : safeQueryWithDiagnostics({
        routeName: "admin/analytics/historical",
        channel: "analytics",
        label: "watch assets",
        issues,
        reader: () => adminDb.collection("analytics_watch_assets")
          .where("lastSeenAtMs", ">=", startMs)
          .orderBy("lastSeenAtMs", "desc")
          .get(),
      }),
  ]);

      const [
        telemetryLogsByEvent,
        taskEventsSnapshot,
        transactionsInRangeSnapshot,
      ] = await Promise.all([
        fetchTelemetryLogs(ADMIN_TELEMETRY_LOG_EVENT_NAMES, startMs),
        safeQueryWithDiagnostics({
          routeName: "admin/analytics/historical",
          channel: "analytics",
          label: "daily task events",
          issues,
          reader: () => adminDb.collection("daily_task_events")
            .where("timestamp", ">=", startMs)
            .orderBy("timestamp", "desc")
            .get(),
        }),
        period === "all"
          ? safeQueryWithDiagnostics({
            routeName: "admin/analytics/historical",
            channel: "commerce",
            label: "transactions",
            issues,
            reader: () => adminDb.collection("transactions")
              .orderBy("timestamp", "desc")
              .get(),
          })
          : safeQueryWithDiagnostics({
            routeName: "admin/analytics/historical",
            channel: "commerce",
            label: "transactions",
            issues,
            reader: () => adminDb.collection("transactions")
              .where("timestampMs", ">=", startMs)
              .orderBy("timestampMs", "desc")
              .get(),
          }),
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
        guestSessionsSnapshot,
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
    },
  });
}
