import "server-only";

import {
  AnalyticsReportRow,
  dayKeyToLabel,
  dayKeyToRawDate,
  rawDateToDayKey,
  timestampToDayKey,
  toNumber,
  toStringValue,
} from "./admin-analytics-shared";

export function buildHistoricalTrafficOverview(input: {
  responseRows: AnalyticsReportRow[];
  eventRows: AnalyticsReportRow[];
  geoRows: AnalyticsReportRow[];
  deviceRows: AnalyticsReportRow[];
  pageRows: AnalyticsReportRow[];
  dailyRollups: FirebaseFirestore.QueryDocumentSnapshot[];
  pageRollups: FirebaseFirestore.QueryDocumentSnapshot[];
  analyticsEventFacts: FirebaseFirestore.QueryDocumentSnapshot[];
  startDayKey: string;
  authenticatedPageViewEventNames: Set<string>;
}) {
  const {
    responseRows,
    eventRows,
    geoRows,
    deviceRows,
    pageRows,
    dailyRollups,
    pageRollups,
    analyticsEventFacts,
    startDayKey,
    authenticatedPageViewEventNames,
  } = input;

  const dayRollupMap = new Map<string, { totalEvents: number; authenticatedEvents: number; viewerSessions: number }>();
  dailyRollups
    .filter((doc) => doc.id >= startDayKey)
    .forEach((doc) => {
      const data = doc.data() as Record<string, unknown>;
      dayRollupMap.set(doc.id, {
        totalEvents: toNumber(data.totalEvents),
        authenticatedEvents: toNumber(data.authenticatedEvents),
        viewerSessions: toNumber(data.viewerSessions),
      });
    });

  const pageViewsByDay = new Map<string, number>();
  const pageRollupMap = new Map<string, { views: number; clicks: number; dwellMsTotal: number; dwellSamples: number }>();
  pageRollups.forEach((doc) => {
    const data = doc.data() as Record<string, unknown>;
    const dayKey = toStringValue(data.dayKey) || startDayKey;
    const path = toStringValue(data.pagePath) || "/";
    const entry = pageRollupMap.get(path) || { views: 0, clicks: 0, dwellMsTotal: 0, dwellSamples: 0 };
    entry.views += toNumber(data.pageViews);
    entry.clicks += toNumber(data.clickCount);
    entry.dwellMsTotal += toNumber(data.dwellMsTotal);
    entry.dwellSamples += toNumber(data.dwellSampleCount);
    pageRollupMap.set(path, entry);
    pageViewsByDay.set(dayKey, (pageViewsByDay.get(dayKey) || 0) + toNumber(data.pageViews));
  });

  const authenticatedPagePathFallbacks: Record<string, string> = {
    dashboard_viewed: "/dashboard",
    library_viewed: "/dashboard/library",
    profile_settings_viewed: "/dashboard/profile",
    experience_hub_viewed: "/experiences",
    drops_page_viewed: "/drops",
    faq_page_viewed: "/faq",
    home_page_viewed: "/",
    privacy_page_viewed: "/privacy",
    terms_page_viewed: "/terms",
    admin_dashboard_viewed: "/admin",
    admin_analytics_viewed: "/admin/analytics",
    admin_debug_viewed: "/admin/debug",
    admin_users_viewed: "/admin/users",
    admin_content_viewed: "/admin/content",
    admin_drops_viewed: "/admin/drops",
    admin_queue_viewed: "/admin/queue",
    admin_roster_viewed: "/admin/roster",
    admin_user_detail_viewed: "/admin/user",
  };
  const authenticatedPageViewsByPath = new Map<string, number>();
  const authenticatedPageViewsByDay = new Map<string, number>();
  analyticsEventFacts.forEach((doc) => {
    const data = doc.data() as Record<string, unknown>;
    const eventName = toStringValue(data.eventName);
    if (!authenticatedPageViewEventNames.has(eventName)) {
      return;
    }

    const pagePath = toStringValue(data.pagePath) || authenticatedPagePathFallbacks[eventName] || "/";
    const dayKey = toStringValue(data.dayKey) || timestampToDayKey(toNumber(data.timestamp));
    authenticatedPageViewsByPath.set(pagePath, (authenticatedPageViewsByPath.get(pagePath) || 0) + 1);
    authenticatedPageViewsByDay.set(dayKey, (authenticatedPageViewsByDay.get(dayKey) || 0) + 1);
  });

  const gaChartMap = new Map<string, {
    users: number;
    views: number;
    sessions: number;
    newUsers: number;
    avgSessionDuration: number;
    engagementRate: number;
  }>();
  responseRows.forEach((row) => {
    const rawDate = row.dimensionValues?.[0]?.value || "";
    const dayKey = rawDateToDayKey(rawDate);
    gaChartMap.set(dayKey, {
      users: parseInt(row.metricValues?.[0]?.value || "0", 10),
      views: parseInt(row.metricValues?.[1]?.value || "0", 10),
      sessions: parseInt(row.metricValues?.[2]?.value || "0", 10),
      newUsers: parseInt(row.metricValues?.[3]?.value || "0", 10),
      avgSessionDuration: parseFloat(row.metricValues?.[4]?.value || "0"),
      engagementRate: parseFloat(row.metricValues?.[5]?.value || "0"),
    });
  });

  const chartDayKeys = new Set<string>([
    ...gaChartMap.keys(),
    ...dayRollupMap.keys(),
    ...pageViewsByDay.keys(),
    ...authenticatedPageViewsByDay.keys(),
  ]);

  const chartData = Array.from(chartDayKeys)
    .sort((left, right) => left.localeCompare(right))
    .map((dayKey) => {
      const ga = gaChartMap.get(dayKey);
      const rollup = dayRollupMap.get(dayKey);
      const firstPartyViews = (pageViewsByDay.get(dayKey) || 0) + (authenticatedPageViewsByDay.get(dayKey) || 0);
      return {
        date: dayKeyToLabel(dayKey),
        rawDate: dayKeyToRawDate(dayKey),
        users: ga?.users ?? 0,
        views: Math.max(ga?.views ?? 0, firstPartyViews, rollup?.totalEvents ?? 0),
        sessions: Math.max(ga?.sessions ?? 0, rollup?.viewerSessions ?? 0),
        newUsers: ga?.newUsers ?? 0,
        avgSessionDuration: ga?.avgSessionDuration ?? 0,
        engagementRate: ga?.engagementRate ?? 0,
      };
    });

  const totals = {
    users: chartData.reduce((acc: number, curr) => acc + curr.users, 0),
    views: chartData.reduce((acc: number, curr) => acc + curr.views, 0),
    sessions: chartData.reduce((acc: number, curr) => acc + curr.sessions, 0),
    newUsers: chartData.reduce((acc: number, curr) => acc + curr.newUsers, 0),
    avgSessionDuration: chartData.length > 0 ? chartData.reduce((acc: number, curr) => acc + curr.avgSessionDuration, 0) / chartData.length : 0,
    engagementRate: chartData.length > 0 ? chartData.reduce((acc: number, curr) => acc + curr.engagementRate, 0) / chartData.length : 0,
  };

  const gaEventCounts = eventRows.reduce((acc: Record<string, number>, row) => {
    const eventName = row.dimensionValues?.[0]?.value || "unknown";
    const count = parseInt(row.metricValues?.[0]?.value || "0", 10);
    acc[eventName] = count;
    return acc;
  }, {});

  const geoData = geoRows.map((row) => ({
    country: row.dimensionValues?.[0]?.value || "Unknown",
    city: row.dimensionValues?.[1]?.value || "Unknown",
    users: parseInt(row.metricValues?.[0]?.value || "0", 10),
  }));

  const devices = deviceRows.map((row) => ({
    device: row.dimensionValues?.[0]?.value || "unknown",
    users: parseInt(row.metricValues?.[0]?.value || "0", 10),
    sessions: parseInt(row.metricValues?.[1]?.value || "0", 10),
    engagementRate: parseFloat(row.metricValues?.[2]?.value || "0"),
  }));

  const gaPagesMap = new Map<string, { views: number; avgTime: number; engagementRate: number }>();
  pageRows.forEach((row) => {
    const path = row.dimensionValues?.[0]?.value || "/";
    gaPagesMap.set(path, {
      views: parseInt(row.metricValues?.[0]?.value || "0", 10),
      avgTime: parseFloat(row.metricValues?.[1]?.value || "0"),
      engagementRate: parseFloat(row.metricValues?.[2]?.value || "0"),
    });
  });

  authenticatedPageViewsByPath.forEach((views, path) => {
    const current = pageRollupMap.get(path) || { views: 0, clicks: 0, dwellMsTotal: 0, dwellSamples: 0 };
    current.views += views;
    pageRollupMap.set(path, current);
  });

  const allPagePaths = new Set<string>([
    ...gaPagesMap.keys(),
    ...pageRollupMap.keys(),
  ]);

  const pagesData = Array.from(allPagePaths)
    .map((path) => {
      const ga = gaPagesMap.get(path);
      const firstParty = pageRollupMap.get(path) || { views: 0, clicks: 0, dwellMsTotal: 0, dwellSamples: 0 };
      return {
        path,
        views: Math.max(ga?.views ?? 0, firstParty.views),
        avgTime: ga?.avgTime || (firstParty.dwellSamples > 0 ? firstParty.dwellMsTotal / 1000 / firstParty.dwellSamples : 0),
        engagementRate: Math.max(ga?.engagementRate ?? 0, firstParty.views > 0 ? firstParty.clicks / firstParty.views : 0),
      };
    })
    .sort((a, b) => b.views - a.views)
    .slice(0, 25);

  return {
    chartData,
    totals,
    gaEventCounts,
    geoData,
    devices,
    pagesData,
    pageRollupMap,
  };
}
