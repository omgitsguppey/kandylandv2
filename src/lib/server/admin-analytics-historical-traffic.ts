import "server-only";

import {
  AnalyticsReportRow,
  buildTimelineKeys,
  dayKeyToLabel,
  dayKeyToRawDate,
  hourKeyToLabel,
  hourKeyToRawDate,
  rawDateToDayKey,
  rawDateHourToHourKey,
  timestampToHourKey,
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
  guestBatchDocs: FirebaseFirestore.QueryDocumentSnapshot[];
  sessionFacts: FirebaseFirestore.QueryDocumentSnapshot[];
  startMs: number;
  endMs: number;
  startDayKey: string;
  endDayKey: string;
  timelineBucket: "day" | "hour";
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
    guestBatchDocs,
    sessionFacts,
    startMs,
    endMs,
    startDayKey,
    endDayKey,
    timelineBucket,
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
  const authenticatedPageViewsByHour = new Map<string, number>();
  const viewerSessionsByDay = new Map<string, number>();
  const viewerSessionsByHour = new Map<string, number>();
  analyticsEventFacts.forEach((doc) => {
    const data = doc.data() as Record<string, unknown>;
    const eventName = toStringValue(data.eventName);
    const timestamp = toNumber(data.timestamp);
    if (timestamp < startMs || timestamp > endMs) {
      return;
    }

    if (authenticatedPageViewEventNames.has(eventName)) {
      const pagePath = toStringValue(data.pagePath) || authenticatedPagePathFallbacks[eventName] || "/";
      const dayKey = toStringValue(data.dayKey) || timestampToDayKey(timestamp);
      const hourKey = toStringValue(data.hourKey) || timestampToHourKey(timestamp);
      authenticatedPageViewsByPath.set(pagePath, (authenticatedPageViewsByPath.get(pagePath) || 0) + 1);
      authenticatedPageViewsByDay.set(dayKey, (authenticatedPageViewsByDay.get(dayKey) || 0) + 1);
      authenticatedPageViewsByHour.set(hourKey, (authenticatedPageViewsByHour.get(hourKey) || 0) + 1);
    }

    if (eventName === "viewer_session_started") {
      const dayKey = toStringValue(data.dayKey) || timestampToDayKey(timestamp);
      const hourKey = toStringValue(data.hourKey) || timestampToHourKey(timestamp);
      viewerSessionsByDay.set(dayKey, (viewerSessionsByDay.get(dayKey) || 0) + 1);
      viewerSessionsByHour.set(hourKey, (viewerSessionsByHour.get(hourKey) || 0) + 1);
    }
  });

  const guestPageViewsByDay = new Map<string, number>();
  const guestPageViewsByHour = new Map<string, number>();
  const rawGuestPageStatsByPath = new Map<string, { views: number; clicks: number; dwellMsTotal: number; dwellSamples: number }>();
  guestBatchDocs.forEach((doc) => {
    const data = doc.data() as Record<string, unknown>;
    const events = Array.isArray(data.events) ? (data.events as Array<Record<string, unknown>>) : [];
    events.forEach((event) => {
      const timestamp = toNumber(event.timestamp) || toNumber(data.receivedAtMs);
      if (timestamp < startMs || timestamp > endMs) {
        return;
      }

      const eventType = toStringValue(event.type);
      const pagePath = toStringValue(event.path) || "/";
      const pageStats = rawGuestPageStatsByPath.get(pagePath) || { views: 0, clicks: 0, dwellMsTotal: 0, dwellSamples: 0 };

      if (eventType === "page_view") {
        const dayKey = timestampToDayKey(timestamp);
        const hourKey = timestampToHourKey(timestamp);
        guestPageViewsByDay.set(dayKey, (guestPageViewsByDay.get(dayKey) || 0) + 1);
        guestPageViewsByHour.set(hourKey, (guestPageViewsByHour.get(hourKey) || 0) + 1);
        pageStats.views += 1;
      }

      if (eventType === "click") {
        pageStats.clicks += 1;
      }

      const durationMs = toNumber(event.durationMs);
      if (eventType === "page_leave" && durationMs > 0) {
        pageStats.dwellMsTotal += durationMs;
        pageStats.dwellSamples += 1;
      }

      rawGuestPageStatsByPath.set(pagePath, pageStats);
    });
  });

  const sessionFactSessionsByDay = new Map<string, number>();
  const sessionFactSessionsByHour = new Map<string, number>();
  sessionFacts.forEach((doc) => {
    const data = doc.data() as Record<string, unknown>;
    const startedCount = toNumber(data.startedCount);
    if (startedCount <= 0) {
      return;
    }

    const anchorTimestamp = toNumber(data.firstEventAtMs)
      || toNumber(data.firstEventAt)
      || toNumber(data.lastEventAtMs)
      || toNumber(data.lastEventAt);
    if (anchorTimestamp > 0 && (anchorTimestamp < startMs || anchorTimestamp > endMs)) {
      return;
    }

    const dayKey = toStringValue(data.dayKey) || (anchorTimestamp > 0 ? timestampToDayKey(anchorTimestamp) : startDayKey);
    const hourKey = toStringValue(data.hourKey) || (anchorTimestamp > 0 ? timestampToHourKey(anchorTimestamp) : `${dayKey}T00`);
    sessionFactSessionsByDay.set(dayKey, (sessionFactSessionsByDay.get(dayKey) || 0) + startedCount);
    sessionFactSessionsByHour.set(hourKey, (sessionFactSessionsByHour.get(hourKey) || 0) + startedCount);
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
    const bucketKey = timelineBucket === "hour"
      ? rawDateHourToHourKey(rawDate)
      : rawDateToDayKey(rawDate);
    gaChartMap.set(bucketKey, {
      users: parseInt(row.metricValues?.[0]?.value || "0", 10),
      views: parseInt(row.metricValues?.[1]?.value || "0", 10),
      sessions: parseInt(row.metricValues?.[2]?.value || "0", 10),
      newUsers: parseInt(row.metricValues?.[3]?.value || "0", 10),
      avgSessionDuration: parseFloat(row.metricValues?.[4]?.value || "0"),
      engagementRate: parseFloat(row.metricValues?.[5]?.value || "0"),
    });
  });

  const chartKeys = buildTimelineKeys({
    startMs,
    endMs,
    startDayKey,
    endDayKey,
    timelineBucket,
  });

  const chartData = chartKeys.map((bucketKey) => {
    const ga = gaChartMap.get(bucketKey);
    const isHourly = timelineBucket === "hour";
    const rollup = isHourly ? null : dayRollupMap.get(bucketKey);
    const firstPartyViews = isHourly
      ? (guestPageViewsByHour.get(bucketKey) || 0) + (authenticatedPageViewsByHour.get(bucketKey) || 0)
      : Math.max(pageViewsByDay.get(bucketKey) || 0, guestPageViewsByDay.get(bucketKey) || 0) + (authenticatedPageViewsByDay.get(bucketKey) || 0);
    const firstPartySessions = isHourly
      ? Math.max(viewerSessionsByHour.get(bucketKey) || 0, sessionFactSessionsByHour.get(bucketKey) || 0)
      : Math.max(
          rollup?.viewerSessions ?? 0,
          viewerSessionsByDay.get(bucketKey) || 0,
          sessionFactSessionsByDay.get(bucketKey) || 0,
        );

    return {
      date: isHourly ? hourKeyToLabel(bucketKey) : dayKeyToLabel(bucketKey),
      rawDate: isHourly ? hourKeyToRawDate(bucketKey) : dayKeyToRawDate(bucketKey),
      users: ga?.users ?? 0,
      views: Math.max(ga?.views ?? 0, firstPartyViews, rollup?.totalEvents ?? 0),
      sessions: Math.max(ga?.sessions ?? 0, firstPartySessions),
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
  const authenticatedViews = Array.from(authenticatedPageViewsByPath.values()).reduce((sum, value) => sum + value, 0);
  const guestViewsExact = Array.from(rawGuestPageStatsByPath.values()).reduce((sum, value) => sum + value.views, 0);
  const identifiedSessions = Array.from(sessionFactSessionsByDay.values()).reduce((sum, value) => sum + value, 0);
  const guestSessionsExact = guestBatchDocs.length;
  const estimatedGuestViews = Math.max(guestViewsExact, totals.views - authenticatedViews);
  const estimatedGuestSessions = Math.max(guestSessionsExact, totals.sessions - identifiedSessions);
  const guestTraffic = {
    totalViews: totals.views,
    totalSessions: totals.sessions,
    identifiedViews: authenticatedViews,
    identifiedSessions,
    exactGuestViews: guestViewsExact,
    exactGuestSessions: guestSessionsExact,
    estimatedGuestViews,
    estimatedGuestSessions,
    truthLabel: guestViewsExact > 0 || guestSessionsExact > 0
      ? "exact"
      : estimatedGuestViews > 0 || estimatedGuestSessions > 0
        ? "estimated"
        : "unknown",
    sourceLabel: guestViewsExact > 0 || guestSessionsExact > 0
      ? "analytics_guest_batches"
      : "ga_total_minus_identified_first_party",
    qualityAvailable: guestViewsExact > 0,
  } as const;

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
    ...rawGuestPageStatsByPath.keys(),
  ]);

  const pagesData = Array.from(allPagePaths)
    .map((path) => {
      const ga = gaPagesMap.get(path);
      const firstParty = timelineBucket === "hour"
        ? rawGuestPageStatsByPath.get(path) || { views: 0, clicks: 0, dwellMsTotal: 0, dwellSamples: 0 }
        : pageRollupMap.get(path) || { views: 0, clicks: 0, dwellMsTotal: 0, dwellSamples: 0 };
      const firstPartyViews = firstParty.views + (timelineBucket === "hour" ? (authenticatedPageViewsByPath.get(path) || 0) : 0);
      return {
        path,
        views: Math.max(ga?.views ?? 0, firstPartyViews),
        avgTime: ga?.avgTime || (firstParty.dwellSamples > 0 ? firstParty.dwellMsTotal / 1000 / firstParty.dwellSamples : 0),
        engagementRate: Math.max(ga?.engagementRate ?? 0, firstPartyViews > 0 ? firstParty.clicks / firstPartyViews : 0),
      };
    })
    .sort((a, b) => b.views - a.views)
    .slice(0, 25);

  return {
    chartData,
    totals,
    guestTraffic,
    gaEventCounts,
    geoData,
    devices,
    pagesData,
    pageRollupMap,
  };
}
