import "server-only";

import { adminDb } from "./firebase-admin";
import { fetchTelemetryLogs } from "./admin-analytics-shared";
import { readThroughEphemeralRouteCache } from "./ephemeral-route-cache";
import {
  safeDocumentWithDiagnostics,
  safeQueryWithDiagnostics,
} from "./diagnostic-read-fallbacks";
import {
  classifyAdminAnalyticsGa4State,
  runVendorReportWhenAllowed,
  type AdminAnalyticsDataClient,
} from "./admin-analytics/ga4-evidence";
import { shouldRunGa4AdminRefresh } from "@/lib/analytics/ga4-truth";
import { ADMIN_TELEMETRY_LOG_EVENT_NAMES, TELEMETRY_EVENT_QUERY_NAMES } from "@/lib/telemetry-catalog";
import { ANALYTICS_NON_PRIORITY_TTL_MS } from "@/lib/analytics/analytics-cadence-policy";

export {
  createAdminAnalyticsDataClient,
  getAdminAnalyticsPropertyId,
} from "./admin-analytics/ga4-evidence";

const ADMIN_ANALYTICS_HISTORICAL_CACHE_TTL_MS = ANALYTICS_NON_PRIORITY_TTL_MS;
const ADMIN_ANALYTICS_DAILY_ROLLUP_LIMIT = 370;
const ADMIN_ANALYTICS_ALL_TIME_DAILY_ROLLUP_LIMIT = 2_500;
const ADMIN_ANALYTICS_EVENT_FACT_LIMIT = 500;
const ADMIN_ANALYTICS_EVENT_STATS_LIMIT = 500;
const ADMIN_ANALYTICS_RECENT_SAMPLE_LIMIT = 200;
const ADMIN_ANALYTICS_DROP_ARCHIVE_LIMIT = 100;
const ADMIN_ANALYTICS_TASK_EVENT_LIMIT = 500;
const ADMIN_ANALYTICS_TRANSACTION_LIMIT = 500;

export async function fetchAdminHistoricalAnalyticsSources(input: {
  analyticsClient: AdminAnalyticsDataClient;
  propertyId: string;
  startDate: string;
  endDate: string;
  startDayKey: string;
  startMs: number;
  period: string | null;
  timelineBucket: "day" | "hour";
  section?: string | null;
  allowVendorReports?: boolean;
}) {
  const { analyticsClient, propertyId, startDate, endDate, startDayKey, startMs, period, timelineBucket, section, allowVendorReports = false } = input;
  const dailyRollupLimit = period === "all"
    ? ADMIN_ANALYTICS_ALL_TIME_DAILY_ROLLUP_LIMIT
    : ADMIN_ANALYTICS_DAILY_ROLLUP_LIMIT;

  return readThroughEphemeralRouteCache({
    key: `admin-historical-sources:${propertyId}:${startDate}:${endDate}:${startDayKey}:${startMs}:${period ?? "default"}:${timelineBucket}:${section ?? "all"}`,
    ttlMs: ADMIN_ANALYTICS_HISTORICAL_CACHE_TTL_MS,
    loader: async () => {
      const analyticsEventNames = TELEMETRY_EVENT_QUERY_NAMES;
      const trafficDimensionName = timelineBucket === "hour" ? "dateHour" : "date";
      const issues: string[] = [];
      const ga4State = classifyAdminAnalyticsGa4State({ propertyId, allowVendorReports });
      const allowGa4VendorReports = shouldRunGa4AdminRefresh({
        explicitRefresh: allowVendorReports,
        propertyId,
      });
      issues.push(ga4State.reason);

      const [
          response,
          eventsResponse,
          geoResponse,
          geoPathResponse,
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
    runVendorReportWhenAllowed({
      allowVendorReports: allowGa4VendorReports,
      analyticsClient,
      label: "traffic overview",
      issues,
      requestConfig: {
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
    }}),
    runVendorReportWhenAllowed({
      allowVendorReports: allowGa4VendorReports,
      analyticsClient,
      label: "event mix",
      issues,
      requestConfig: {
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
    }}),
    runVendorReportWhenAllowed({
      allowVendorReports: allowGa4VendorReports,
      analyticsClient,
      label: "geo active users",
      issues,
      requestConfig: {
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      metrics: [{ name: "activeUsers" }],
      dimensions: [{ name: "country" }, { name: "city" }],
      orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
      limit: 15,
    }}),
    runVendorReportWhenAllowed({
      allowVendorReports: allowGa4VendorReports,
      analyticsClient,
      label: "geo path demand",
      issues,
      requestConfig: {
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      metrics: [{ name: "screenPageViews" }],
      dimensions: [{ name: "country" }, { name: "city" }, { name: "pagePath" }],
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit: 250,
    }}),
    runVendorReportWhenAllowed({
      allowVendorReports: allowGa4VendorReports,
      analyticsClient,
      label: "top pages",
      issues,
      requestConfig: {
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      metrics: [{ name: "screenPageViews" }, { name: "averageSessionDuration" }, { name: "engagementRate" }],
      dimensions: [{ name: "pagePath" }],
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit: 25,
    }}),
    runVendorReportWhenAllowed({
      allowVendorReports: allowGa4VendorReports,
      analyticsClient,
      label: "device mix",
      issues,
      requestConfig: {
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
    }}),
    runVendorReportWhenAllowed({
      allowVendorReports: allowGa4VendorReports,
      analyticsClient,
      label: "guided onboarding duration",
      issues,
      requestConfig: {
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
    }}),
    safeQueryWithDiagnostics({
      routeName: "admin/analytics/historical",
      channel: "analytics",
      label: "daily analytics rollups",
      issues,
      reader: () => {
        const collection = adminDb.collection("analytics_rollups_daily");
        return period === "all"
          ? collection.limit(dailyRollupLimit).get()
          : collection.where("dayKey", ">=", startDayKey).limit(dailyRollupLimit).get();
      },
    }),
    safeQueryWithDiagnostics({
      routeName: "admin/analytics/historical",
      channel: "analytics",
      label: "page analytics rollups",
      issues,
      reader: () => {
        const collection = adminDb.collection("analytics_page_daily");
        return period === "all"
          ? collection.limit(dailyRollupLimit).get()
          : collection.where("dayKey", ">=", startDayKey).limit(dailyRollupLimit).get();
      },
    }),
    safeQueryWithDiagnostics({
      routeName: "admin/analytics/historical",
      channel: "analytics",
      label: "drop analytics rollups",
      issues,
      reader: () => {
        const collection = adminDb.collection("analytics_drop_daily");
        return period === "all"
          ? collection.limit(dailyRollupLimit).get()
          : collection.where("dayKey", ">=", startDayKey).limit(dailyRollupLimit).get();
      },
    }),
    safeQueryWithDiagnostics({
      routeName: "admin/analytics/historical",
      channel: "analytics",
      label: "task analytics rollups",
      issues,
      reader: () => {
        const collection = adminDb.collection("analytics_task_daily");
        return period === "all"
          ? collection.limit(dailyRollupLimit).get()
          : collection.where("dayKey", ">=", startDayKey).limit(dailyRollupLimit).get();
      },
    }),
    safeQueryWithDiagnostics({
      routeName: "admin/analytics/historical",
      channel: "commerce",
      label: "commerce analytics rollups",
      issues,
      reader: () => {
        const collection = adminDb.collection("analytics_commerce_daily");
        return period === "all"
          ? collection.limit(dailyRollupLimit).get()
          : collection.where("dayKey", ">=", startDayKey).limit(dailyRollupLimit).get();
      },
    }),
    safeQueryWithDiagnostics({
      routeName: "admin/analytics/historical",
      channel: "analytics",
      label: "session analytics facts",
      issues,
      reader: () => {
        const collection = adminDb.collection("analytics_session_facts");
        return period === "all"
          ? collection.limit(dailyRollupLimit).get()
          : collection.where("dayKey", ">=", startDayKey).limit(dailyRollupLimit).get();
      },
    }),
    safeQueryWithDiagnostics({
      routeName: "admin/analytics/historical",
      channel: "analytics",
      label: "pipeline analytics",
      issues,
      reader: () => {
        const collection = adminDb.collection("analytics_pipeline_daily");
        return period === "all"
          ? collection.limit(dailyRollupLimit).get()
          : collection.where("dayKey", ">=", startDayKey).limit(dailyRollupLimit).get();
      },
    }),
    period === "all"
      ? safeQueryWithDiagnostics({
        routeName: "admin/analytics/historical",
        channel: "analytics",
        label: "analytics event facts",
        issues,
        reader: () => adminDb.collection("analytics_event_facts")
          .orderBy("timestamp", "desc")
          .limit(ADMIN_ANALYTICS_EVENT_FACT_LIMIT)
          .get(),
      })
      : safeQueryWithDiagnostics({
        routeName: "admin/analytics/historical",
        channel: "analytics",
        label: "analytics event facts",
        issues,
        reader: () => adminDb.collection("analytics_event_facts")
          .where("timestamp", ">=", startMs)
          .limit(ADMIN_ANALYTICS_EVENT_FACT_LIMIT)
          .get(),
      }),
    safeQueryWithDiagnostics({
      routeName: "admin/analytics/historical",
      channel: "analytics",
      label: "analytics event stats",
      issues,
      reader: () => adminDb.collection("analytics_event_stats")
        .limit(ADMIN_ANALYTICS_EVENT_STATS_LIMIT)
        .get(),
    }),
    period === "all"
      ? safeQueryWithDiagnostics({
        routeName: "admin/analytics/historical",
        channel: "analytics",
        label: "security events",
        issues,
        reader: () => adminDb.collection("security_events")
          .orderBy("timestamp", "desc")
          .limit(ADMIN_ANALYTICS_RECENT_SAMPLE_LIMIT)
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
          .limit(ADMIN_ANALYTICS_RECENT_SAMPLE_LIMIT)
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
          .limit(ADMIN_ANALYTICS_RECENT_SAMPLE_LIMIT)
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
          .limit(ADMIN_ANALYTICS_RECENT_SAMPLE_LIMIT)
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
          .limit(ADMIN_ANALYTICS_RECENT_SAMPLE_LIMIT)
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
          .limit(ADMIN_ANALYTICS_RECENT_SAMPLE_LIMIT)
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
          .limit(ADMIN_ANALYTICS_RECENT_SAMPLE_LIMIT)
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
          .limit(ADMIN_ANALYTICS_RECENT_SAMPLE_LIMIT)
          .get(),
      }),
    safeQueryWithDiagnostics({
      routeName: "admin/analytics/historical",
      channel: "analytics",
      label: "task analytics summary",
      issues,
      reader: () => adminDb.collection("analytics_task_rollup")
        .limit(ADMIN_ANALYTICS_EVENT_STATS_LIMIT)
        .get(),
    }),
    period === "all"
      ? safeQueryWithDiagnostics({
        routeName: "admin/analytics/historical",
        channel: "admin",
        label: "drops archive",
        issues,
        reader: () => adminDb.collection("drops")
          .orderBy("validFrom", "desc")
          .limit(ADMIN_ANALYTICS_DROP_ARCHIVE_LIMIT)
          .get(),
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
          .limit(ADMIN_ANALYTICS_RECENT_SAMPLE_LIMIT)
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
          .limit(ADMIN_ANALYTICS_RECENT_SAMPLE_LIMIT)
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
          .limit(ADMIN_ANALYTICS_RECENT_SAMPLE_LIMIT)
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
          .limit(ADMIN_ANALYTICS_RECENT_SAMPLE_LIMIT)
          .get(),
      }),
  ]);

      const cappedDailySources = [
        ["analytics_rollups_daily", dailyRollupsSnapshot.size],
        ["analytics_page_daily", pageRollupsSnapshot.size],
        ["analytics_drop_daily", dropDailySnapshot.size],
        ["analytics_task_daily", taskDailySnapshot.size],
        ["analytics_commerce_daily", commerceDailySnapshot.size],
        ["analytics_session_facts", sessionFactsSnapshot.size],
        ["analytics_pipeline_daily", pipelineHealthSnapshot.size],
      ].filter(([, size]) => typeof size === "number" && size >= dailyRollupLimit)
        .map(([source]) => source);
      if (cappedDailySources.length > 0) {
        issues.push(`Historical daily source sample reached the ${dailyRollupLimit} document cap for ${period === "all" ? "all-time launch history" : "the selected range"}: ${cappedDailySources.join(", ")}.`);
      }

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
            .limit(ADMIN_ANALYTICS_TASK_EVENT_LIMIT)
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
              .limit(ADMIN_ANALYTICS_TRANSACTION_LIMIT)
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
              .limit(ADMIN_ANALYTICS_TRANSACTION_LIMIT)
              .get(),
          }),
      ]);

      if (taskEventsSnapshot.size >= ADMIN_ANALYTICS_TASK_EVENT_LIMIT) {
        issues.push("Daily task event sample reached the analytics read cap; panel totals should be treated as partial.");
      }
      if (transactionsInRangeSnapshot.size >= ADMIN_ANALYTICS_TRANSACTION_LIMIT) {
        issues.push("Commerce transaction sample reached the analytics read cap; rollup-backed totals remain authoritative.");
      }

      return {
        issues,
        response,
        eventsResponse,
        geoResponse,
        geoPathResponse,
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
