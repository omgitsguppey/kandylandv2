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
import type { RegionDemandRow } from "@/types/admin-analytics";

const DAY_KEY_PREFIX_PATTERN = /^(\d{4}-\d{2}-\d{2})/u;

function readRollupDayKey(doc: FirebaseFirestore.QueryDocumentSnapshot, data: Record<string, unknown>, fallbackDayKey: string) {
  const explicitDayKey = toStringValue(data.dayKey);
  if (explicitDayKey) {
    return explicitDayKey;
  }

  const idMatch = DAY_KEY_PREFIX_PATTERN.exec(doc.id);
  return idMatch?.[1] || fallbackDayKey;
}

function readPageRollupViews(data: Record<string, unknown>) {
  return Math.max(
    toNumber(data.pageViews),
    toNumber(data.viewCount),
    toNumber(data.views),
    toNumber(data.eventCount),
  );
}

export function buildHistoricalTrafficOverview(input: {
  responseRows: AnalyticsReportRow[];
  eventRows: AnalyticsReportRow[];
  geoRows: AnalyticsReportRow[];
  geoPathRows: AnalyticsReportRow[];
  deviceRows: AnalyticsReportRow[];
  pageRows: AnalyticsReportRow[];
  dailyRollups: FirebaseFirestore.QueryDocumentSnapshot[];
  pageRollups: FirebaseFirestore.QueryDocumentSnapshot[];
  analyticsEventFacts: FirebaseFirestore.QueryDocumentSnapshot[];
  guestBatchDocs: FirebaseFirestore.QueryDocumentSnapshot[];
  guestSessionDocs: FirebaseFirestore.QueryDocumentSnapshot[];
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
    geoPathRows,
    deviceRows,
    pageRows,
    dailyRollups,
    pageRollups,
    analyticsEventFacts,
    guestBatchDocs,
    guestSessionDocs,
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
    const dayKey = readRollupDayKey(doc, data, startDayKey);
    const path = toStringValue(data.pagePath) || "/";
    const pageViews = readPageRollupViews(data);
    const entry = pageRollupMap.get(path) || { views: 0, clicks: 0, dwellMsTotal: 0, dwellSamples: 0 };
    entry.views += pageViews;
    entry.clicks += toNumber(data.clickCount);
    entry.dwellMsTotal += toNumber(data.dwellMsTotal);
    entry.dwellSamples += toNumber(data.dwellSampleCount);
    pageRollupMap.set(path, entry);
    pageViewsByDay.set(dayKey, (pageViewsByDay.get(dayKey) || 0) + pageViews);
  });

  const authenticatedPagePathFallbacks: Record<string, string> = {
    dashboard_viewed: "/dashboard",
    library_viewed: "/dashboard/library",
    profile_settings_viewed: "/settings",
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

  const guestSessionKeys = new Set<string>();
  const guestSessionSessionsByDay = new Map<string, Set<string>>();
  const guestSessionSessionsByHour = new Map<string, Set<string>>();
  guestSessionDocs.forEach((doc) => {
    const data = doc.data() as Record<string, unknown>;
    const anchorTimestamp = toNumber(data.lastReceivedAtMs)
      || toNumber(data.firstEventAtMs)
      || toNumber(data.lastEventAt)
      || toNumber(data.updatedAt);
    if (anchorTimestamp > 0 && (anchorTimestamp < startMs || anchorTimestamp > endMs)) {
      return;
    }

    const sessionKey = toStringValue(data.sessionKey)
      || toStringValue(data.clientSessionId)
      || doc.id.replace(/_\d{12}$/u, "");
    if (!sessionKey) {
      return;
    }

    const dayKey = toStringValue(data.dayKey) || (anchorTimestamp > 0 ? timestampToDayKey(anchorTimestamp) : startDayKey);
    const hourKey = toStringValue(data.hourKey) || (anchorTimestamp > 0 ? timestampToHourKey(anchorTimestamp) : `${dayKey}T00`);
    guestSessionKeys.add(sessionKey);
    const daySet = guestSessionSessionsByDay.get(dayKey) || new Set<string>();
    daySet.add(sessionKey);
    guestSessionSessionsByDay.set(dayKey, daySet);
    const hourSet = guestSessionSessionsByHour.get(hourKey) || new Set<string>();
    hourSet.add(sessionKey);
    guestSessionSessionsByHour.set(hourKey, hourSet);
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
      ? Math.max(
          viewerSessionsByHour.get(bucketKey) || 0,
          sessionFactSessionsByHour.get(bucketKey) || 0,
          guestSessionSessionsByHour.get(bucketKey)?.size || 0,
        )
      : Math.max(
          rollup?.viewerSessions ?? 0,
          viewerSessionsByDay.get(bucketKey) || 0,
          sessionFactSessionsByDay.get(bucketKey) || 0,
          guestSessionSessionsByDay.get(bucketKey)?.size || 0,
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
  const guestBatchPageViewsExact = Array.from(rawGuestPageStatsByPath.values()).reduce((sum, value) => sum + value.views, 0);
  const guestRollupPageViewsExact = Array.from(pageRollupMap.values()).reduce((sum, value) => sum + value.views, 0);
  const guestViewsExact = Math.max(guestBatchPageViewsExact, guestRollupPageViewsExact);
  const identifiedSessions = Array.from(sessionFactSessionsByDay.values()).reduce((sum, value) => sum + value, 0);
  const guestSessionsExact = Math.max(guestBatchDocs.length, guestSessionKeys.size);
  const estimatedGuestViews = Math.max(guestViewsExact, totals.views - authenticatedViews);
  const estimatedGuestSessions = Math.max(guestSessionsExact, totals.sessions - identifiedSessions);
  const hasExactGuestViews = guestViewsExact > 0;
  const hasExactGuestSessions = guestSessionsExact > 0;
  const guestSourceLabels = [
    guestBatchPageViewsExact > 0 ? "analytics_guest_batches" : null,
    guestRollupPageViewsExact > 0 ? "analytics_page_daily" : null,
    guestSessionKeys.size > 0 ? "analytics_sessions" : null,
  ].filter((value): value is string => Boolean(value));
  const guestTraffic = {
    totalViews: totals.views,
    totalSessions: totals.sessions,
    identifiedViews: authenticatedViews,
    identifiedSessions,
    exactGuestViews: guestViewsExact,
    exactGuestSessions: guestSessionsExact,
    estimatedGuestViews,
    estimatedGuestSessions,
    truthLabel: hasExactGuestViews || hasExactGuestSessions
      ? "exact"
      : estimatedGuestViews > 0 || estimatedGuestSessions > 0
        ? "estimated"
        : "unknown",
    sourceLabel: guestSourceLabels.length > 0
      ? guestSourceLabels.join(" + ")
      : "ga_total_minus_identified_first_party",
    qualityAvailable: hasExactGuestViews,
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

  const normalizeRegionDimension = (value: string | null | undefined) => {
    const normalized = (value || "").trim();
    if (!normalized || normalized.toLowerCase() === "(not set)" || normalized.toLowerCase() === "unknown") {
      return null;
    }
    return normalized;
  };

  const geoPathAggregate = new Map<string, {
    city: string | null;
    country: string | null;
    rawCount: number;
    adminInternalCount: number;
  }>();
  geoPathRows.forEach((row) => {
    const country = normalizeRegionDimension(row.dimensionValues?.[0]?.value || null);
    const city = normalizeRegionDimension(row.dimensionValues?.[1]?.value || null);
    const pagePath = toStringValue(row.dimensionValues?.[2]?.value) || "/";
    const views = parseInt(row.metricValues?.[0]?.value || "0", 10);
    if (views <= 0) {
      return;
    }
    const key = `${country ?? "__unknown_country__"}::${city ?? "__unknown_city__"}`;
    const entry = geoPathAggregate.get(key) || {
      city,
      country,
      rawCount: 0,
      adminInternalCount: 0,
    };
    entry.rawCount += views;
    if (pagePath === "/admin" || pagePath.startsWith("/admin/")) {
      entry.adminInternalCount += views;
    }
    geoPathAggregate.set(key, entry);
  });

  const fallbackRegionRows = geoData.map((row) => {
    const city = normalizeRegionDimension(row.city);
    const country = normalizeRegionDimension(row.country);
    return {
      city,
      country,
      rawCount: Math.max(0, row.users),
      adminInternalCount: 0,
    };
  });

  const regionDemandRowsBase = (
    geoPathAggregate.size > 0
      ? [...geoPathAggregate.values()]
      : fallbackRegionRows
  )
    .map((row) => {
      const rawCount = Math.max(0, row.rawCount);
      const adminInternalCount = Math.min(rawCount, Math.max(0, row.adminInternalCount));
      const adjustedCount = Math.max(0, rawCount - adminInternalCount);
      const unknownLocation = !row.city || !row.country;
      const internalShare = rawCount > 0 ? adminInternalCount / rawCount : 0;
      let demandState: RegionDemandRow["demandState"] = "review";
      if (unknownLocation) {
        demandState = "unknown_location";
      } else if (internalShare >= 0.6 && adminInternalCount > 0) {
        demandState = "mostly_internal";
      } else if (adminInternalCount > 0) {
        demandState = "mixed_with_internal";
      } else if (geoPathAggregate.size > 0) {
        demandState = "verified_external";
      }

      let explanation = "Raw geography is shown without a verified internal split for this row.";
      if (unknownLocation) {
        explanation = "Unknown city/country is a data-quality bucket, not a reliable market-demand signal.";
      } else if (adminInternalCount > 0) {
        explanation = "Raw geography includes proven admin-surface traffic. Adjusted demand excludes those admin/internal views only.";
      } else if (geoPathAggregate.size > 0) {
        explanation = "No admin-surface views were observed for this row in the selected range. Remaining demand is external-facing GA traffic, not actor-verified users.";
      } else {
        explanation = "GA route-level geography is unavailable for this range, so the panel cannot separate admin/internal traffic from raw city counts.";
      }

      return {
        city: row.city,
        region: null,
        country: row.country,
        rawCount,
        adjustedCount,
        adminInternalCount,
        unknownIdentityCount: adjustedCount,
        externalUserCount: adjustedCount,
        sharePct: 0,
        adjustedSharePct: 0,
        demandState,
        explanation,
      } satisfies RegionDemandRow;
    })
    .sort((left, right) => right.rawCount - left.rawCount);

  const regionDemandRawTotal = regionDemandRowsBase.reduce((sum, row) => sum + row.rawCount, 0);
  const regionDemandAdjustedTotal = regionDemandRowsBase.reduce((sum, row) => sum + row.adjustedCount, 0);
  const regionDemandRows = regionDemandRowsBase.map((row) => ({
    ...row,
    sharePct: regionDemandRawTotal > 0 ? row.rawCount / regionDemandRawTotal : 0,
    adjustedSharePct: regionDemandAdjustedTotal > 0 ? row.adjustedCount / regionDemandAdjustedTotal : 0,
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
    regionDemandRows,
    regionDemandRawTotal,
    regionDemandAdjustedTotal,
    regionDemandUsedGeoPathFallback: geoPathAggregate.size === 0,
    devices,
    pagesData,
    pageRollupMap,
  };
}
