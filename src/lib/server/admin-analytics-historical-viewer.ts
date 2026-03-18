import "server-only";

import { type DropReference, resolveDropTitle } from "./drop-references";
import {
  average,
  getTelemetryDropId,
  getTelemetryDropTitle,
  getTelemetryParamNumber,
  matchesViewerFilter,
  normalizeViewerIdentity,
  SessionFactRecord,
  sum,
  TelemetryLogRecord,
  toNumber,
  toStringValue,
  ViewerDropFactAccumulator,
  ViewerDropInsight,
  ViewerOverview,
  ViewerUserOption,
} from "./admin-analytics-shared";

type MutableViewerDropInsight = ViewerDropInsight & {
  uniqueViewerKeys: Set<string>;
  sessionCountsByUser: Map<string, number>;
  sessionDurations: number[];
  watchDurations: number[];
  loadSamples: number[];
};

export interface HistoricalViewerOverview {
  filteredSessionFacts: SessionFactRecord[];
  viewerSessionStartedLogs: TelemetryLogRecord[];
  viewerOverviewCanonical: ViewerOverview;
  viewerDropInsights: ViewerDropInsight[];
  viewerUsers: ViewerUserOption[];
}

export function buildHistoricalViewerOverview(input: {
  telemetryLogsByEvent: Record<string, TelemetryLogRecord[]>;
  sessionFacts: FirebaseFirestore.QueryDocumentSnapshot[];
  viewerUser: string;
  dropReferences: Record<string, DropReference>;
}): HistoricalViewerOverview {
  const filteredSessionFacts: SessionFactRecord[] = input.sessionFacts
    .map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }) as SessionFactRecord)
    .filter((entry) => {
      if (!input.viewerUser) {
        return true;
      }

      const normalizedFilter = normalizeViewerIdentity(input.viewerUser);
      const candidateUserId = normalizeViewerIdentity(toStringValue(entry.userId));
      const candidateUsername = normalizeViewerIdentity(toStringValue(entry.username));
      return candidateUserId === normalizedFilter || candidateUsername === normalizedFilter;
    });

  const viewerOpenLogs = (input.telemetryLogsByEvent.viewer_opened || []).filter((record) => matchesViewerFilter(record, input.viewerUser));
  const viewerSessionStartedLogs = (input.telemetryLogsByEvent.viewer_session_started || []).filter((record) => matchesViewerFilter(record, input.viewerUser));
  const viewerSessionCompletedLogs = (input.telemetryLogsByEvent.viewer_session_completed || []).filter((record) => matchesViewerFilter(record, input.viewerUser));
  const viewerAssetStartedLogs = (input.telemetryLogsByEvent.viewer_asset_started || []).filter((record) => matchesViewerFilter(record, input.viewerUser));
  const viewerAssetCompletedLogs = (input.telemetryLogsByEvent.viewer_asset_completed || []).filter((record) => matchesViewerFilter(record, input.viewerUser));
  const viewerAssetChangedLogs = (input.telemetryLogsByEvent.viewer_asset_changed || []).filter((record) => matchesViewerFilter(record, input.viewerUser));
  const viewerDownloadLogs = (input.telemetryLogsByEvent.viewer_source_downloaded || []).filter((record) => matchesViewerFilter(record, input.viewerUser));
  const viewerRelatedLogs = (input.telemetryLogsByEvent.viewer_related_drop_clicked || []).filter((record) => matchesViewerFilter(record, input.viewerUser));
  const viewerContentLoadedLogs = (input.telemetryLogsByEvent.viewer_content_loaded || []).filter((record) => matchesViewerFilter(record, input.viewerUser));

  const viewerSessionCountsByUser = new Map<string, number>();
  const overallViewerKeys = new Set<string>();
  viewerSessionStartedLogs.forEach((record) => {
    const key = record.userId || record.username || "";
    if (!key) {
      return;
    }

    overallViewerKeys.add(key);
    viewerSessionCountsByUser.set(key, (viewerSessionCountsByUser.get(key) || 0) + 1);
  });
  viewerOpenLogs.forEach((record) => {
    const key = record.userId || record.username || "";
    if (key) {
      overallViewerKeys.add(key);
    }
  });
  viewerSessionCompletedLogs.forEach((record) => {
    const key = record.userId || record.username || "";
    if (key) {
      overallViewerKeys.add(key);
    }
  });

  const overallSessionDurations = viewerSessionCompletedLogs
    .map((record) => {
      const seconds = getTelemetryParamNumber(record, "duration_seconds");
      if (seconds > 0) {
        return seconds;
      }

      const durationMs = getTelemetryParamNumber(record, "duration_ms");
      return durationMs > 0 ? Math.round(durationMs / 1000) : 0;
    })
    .filter((value) => value > 0);
  const overallWatchDurations = viewerSessionCompletedLogs
    .map((record) => getTelemetryParamNumber(record, "session_watch_seconds"))
    .filter((value) => value > 0);
  const overallLoadSamples = viewerContentLoadedLogs
    .map((record) => getTelemetryParamNumber(record, "load_ms"))
    .filter((value) => value > 0);
  const repeatSessionCount = Array.from(viewerSessionCountsByUser.values()).reduce(
    (total, value) => total + Math.max(0, value - 1),
    0,
  );

  const viewerOverview: ViewerOverview = {
    viewCount: viewerOpenLogs.length,
    sessionCount: viewerSessionStartedLogs.length,
    uniqueViewerCount: overallViewerKeys.size,
    repeatSessionCount,
    totalWatchSeconds: sum(overallWatchDurations),
    avgSessionSeconds: average(overallSessionDurations),
    avgWatchSeconds: average(overallWatchDurations),
    avgLoadMs: average(overallLoadSamples),
    assetCompletionRate: viewerAssetStartedLogs.length > 0 ? viewerAssetCompletedLogs.length / viewerAssetStartedLogs.length : 0,
    assetSwitches: viewerAssetChangedLogs.length,
    downloads: viewerDownloadLogs.length,
    relatedClicks: viewerRelatedLogs.length,
  };

  const sessionFactOverview = filteredSessionFacts.reduce((acc, entry) => {
    const startedCount = toNumber(entry.startedCount);
    const completedCount = toNumber(entry.completedCount);
    const watchSecondsTotal = toNumber(entry.watchSecondsTotal);
    const loadMsTotal = toNumber(entry.loadMsTotal);
    const loadSampleCount = toNumber(entry.loadSampleCount);
    const userKey = `${toStringValue(entry.userId)}::${toStringValue(entry.username)}`;
    if (userKey !== "::") {
      acc.uniqueViewerKeys.add(userKey);
      acc.sessionCounts.set(userKey, (acc.sessionCounts.get(userKey) || 0) + startedCount);
    }
    acc.sessionCount += startedCount;
    acc.completedCount += completedCount;
    acc.totalWatchSeconds += watchSecondsTotal;
    acc.loadMsTotal += loadMsTotal;
    acc.loadSampleCount += loadSampleCount;
    return acc;
  }, {
    sessionCount: 0,
    completedCount: 0,
    totalWatchSeconds: 0,
    loadMsTotal: 0,
    loadSampleCount: 0,
    uniqueViewerKeys: new Set<string>(),
    sessionCounts: new Map<string, number>(),
  });

  const viewerOverviewCanonical: ViewerOverview = viewerOverview.sessionCount > 0
    ? viewerOverview
    : {
      viewCount: sessionFactOverview.sessionCount,
      sessionCount: sessionFactOverview.sessionCount,
      uniqueViewerCount: sessionFactOverview.uniqueViewerKeys.size,
      repeatSessionCount: Array.from(sessionFactOverview.sessionCounts.values()).reduce(
        (total, value) => total + Math.max(0, value - 1),
        0,
      ),
      totalWatchSeconds: sessionFactOverview.totalWatchSeconds,
      avgSessionSeconds: sessionFactOverview.completedCount > 0
        ? Math.round(sessionFactOverview.totalWatchSeconds / sessionFactOverview.completedCount)
        : 0,
      avgWatchSeconds: sessionFactOverview.sessionCount > 0
        ? Math.round(sessionFactOverview.totalWatchSeconds / sessionFactOverview.sessionCount)
        : 0,
      avgLoadMs: sessionFactOverview.loadSampleCount > 0
        ? Math.round(sessionFactOverview.loadMsTotal / sessionFactOverview.loadSampleCount)
        : 0,
      assetCompletionRate: 0,
      assetSwitches: 0,
      downloads: 0,
      relatedClicks: 0,
    };

  const viewerDropInsightMap = new Map<string, MutableViewerDropInsight>();
  const ensureViewerDropInsight = (record: TelemetryLogRecord) => {
    const dropId = getTelemetryDropId(record);
    const existing = viewerDropInsightMap.get(dropId);
    if (existing) {
      if (existing.dropTitle === existing.dropId) {
        existing.dropTitle = getTelemetryDropTitle(record);
      }
      return existing;
    }

    const created: MutableViewerDropInsight = {
      dropId,
      dropTitle: getTelemetryDropTitle(record),
      viewCount: 0,
      sessionCount: 0,
      uniqueViewerCount: 0,
      repeatSessionCount: 0,
      totalWatchSeconds: 0,
      avgSessionSeconds: 0,
      avgWatchSeconds: 0,
      assetStarts: 0,
      assetCompletions: 0,
      assetSwitches: 0,
      downloads: 0,
      relatedClicks: 0,
      avgLoadMs: 0,
      uniqueViewerKeys: new Set<string>(),
      sessionCountsByUser: new Map<string, number>(),
      sessionDurations: [],
      watchDurations: [],
      loadSamples: [],
    };
    viewerDropInsightMap.set(dropId, created);
    return created;
  };

  const registerViewerRecord = (record: TelemetryLogRecord) => record.userId || record.username || "";

  viewerOpenLogs.forEach((record) => {
    const insight = ensureViewerDropInsight(record);
    insight.viewCount += 1;
    const viewerKey = registerViewerRecord(record);
    if (viewerKey) {
      insight.uniqueViewerKeys.add(viewerKey);
    }
  });
  viewerSessionStartedLogs.forEach((record) => {
    const insight = ensureViewerDropInsight(record);
    insight.sessionCount += 1;
    const viewerKey = registerViewerRecord(record);
    if (viewerKey) {
      insight.uniqueViewerKeys.add(viewerKey);
      insight.sessionCountsByUser.set(viewerKey, (insight.sessionCountsByUser.get(viewerKey) || 0) + 1);
    }
  });
  viewerSessionCompletedLogs.forEach((record) => {
    const insight = ensureViewerDropInsight(record);
    const sessionSeconds = getTelemetryParamNumber(record, "duration_seconds")
      || Math.round(getTelemetryParamNumber(record, "duration_ms") / 1000);
    const watchSeconds = getTelemetryParamNumber(record, "session_watch_seconds");

    if (sessionSeconds > 0) {
      insight.sessionDurations.push(sessionSeconds);
    }
    if (watchSeconds > 0) {
      insight.watchDurations.push(watchSeconds);
      insight.totalWatchSeconds += watchSeconds;
    }
  });
  viewerAssetStartedLogs.forEach((record) => {
    ensureViewerDropInsight(record).assetStarts += 1;
  });
  viewerAssetCompletedLogs.forEach((record) => {
    ensureViewerDropInsight(record).assetCompletions += 1;
  });
  viewerAssetChangedLogs.forEach((record) => {
    ensureViewerDropInsight(record).assetSwitches += 1;
  });
  viewerDownloadLogs.forEach((record) => {
    ensureViewerDropInsight(record).downloads += 1;
  });
  viewerRelatedLogs.forEach((record) => {
    ensureViewerDropInsight(record).relatedClicks += 1;
  });
  viewerContentLoadedLogs.forEach((record) => {
    const loadMs = getTelemetryParamNumber(record, "load_ms");
    if (loadMs > 0) {
      ensureViewerDropInsight(record).loadSamples.push(loadMs);
    }
  });

  const viewerDropInsightsFromTelemetry: ViewerDropInsight[] = Array.from(viewerDropInsightMap.values())
    .map((entry) => ({
      dropId: entry.dropId,
      dropTitle: resolveDropTitle(input.dropReferences, entry.dropId, entry.dropTitle),
      viewCount: entry.viewCount,
      sessionCount: entry.sessionCount,
      uniqueViewerCount: entry.uniqueViewerKeys.size,
      repeatSessionCount: Array.from(entry.sessionCountsByUser.values()).reduce(
        (total, value) => total + Math.max(0, value - 1),
        0,
      ),
      totalWatchSeconds: entry.totalWatchSeconds,
      avgSessionSeconds: average(entry.sessionDurations),
      avgWatchSeconds: average(entry.watchDurations),
      assetStarts: entry.assetStarts,
      assetCompletions: entry.assetCompletions,
      assetSwitches: entry.assetSwitches,
      downloads: entry.downloads,
      relatedClicks: entry.relatedClicks,
      avgLoadMs: average(entry.loadSamples),
    }))
    .sort((left, right) =>
      right.totalWatchSeconds - left.totalWatchSeconds
      || right.sessionCount - left.sessionCount
      || right.viewCount - left.viewCount,
    )
    .slice(0, 20);

  const viewerDropFactsMap = filteredSessionFacts.reduce<Map<string, ViewerDropFactAccumulator>>((map, entry) => {
    const dropId = toStringValue(entry.dropId);
    if (!dropId) {
      return map;
    }

    const current: ViewerDropFactAccumulator = map.get(dropId) || {
      dropId,
      dropTitle: resolveDropTitle(input.dropReferences, dropId, toStringValue(entry.dropTitle)),
      viewCount: 0,
      sessionCount: 0,
      uniqueViewerKeys: new Set<string>(),
      sessionCounts: new Map<string, number>(),
      totalWatchSeconds: 0,
      loadMsTotal: 0,
      loadSampleCount: 0,
    };
    const startedCount = toNumber(entry.startedCount);
    current.viewCount += startedCount;
    current.sessionCount += startedCount;
    current.totalWatchSeconds += toNumber(entry.watchSecondsTotal);
    current.loadMsTotal += toNumber(entry.loadMsTotal);
    current.loadSampleCount += toNumber(entry.loadSampleCount);
    const userKey = `${toStringValue(entry.userId)}::${toStringValue(entry.username)}`;
    if (userKey !== "::") {
      current.uniqueViewerKeys.add(userKey);
      current.sessionCounts.set(userKey, (current.sessionCounts.get(userKey) || 0) + startedCount);
    }
    map.set(dropId, current);
    return map;
  }, new Map<string, ViewerDropFactAccumulator>());

  const viewerDropInsightsFromFacts = Array.from(viewerDropFactsMap.values())
    .map((entry) => ({
      dropId: entry.dropId,
      dropTitle: entry.dropTitle,
      viewCount: entry.viewCount,
      sessionCount: entry.sessionCount,
      uniqueViewerCount: entry.uniqueViewerKeys.size,
      repeatSessionCount: Array.from(entry.sessionCounts.values()).reduce(
        (total, value) => total + Math.max(0, value - 1),
        0,
      ),
      totalWatchSeconds: entry.totalWatchSeconds,
      avgSessionSeconds: entry.sessionCount > 0 ? Math.round(entry.totalWatchSeconds / entry.sessionCount) : 0,
      avgWatchSeconds: entry.sessionCount > 0 ? Math.round(entry.totalWatchSeconds / entry.sessionCount) : 0,
      assetStarts: 0,
      assetCompletions: 0,
      assetSwitches: 0,
      downloads: 0,
      relatedClicks: 0,
      avgLoadMs: entry.loadSampleCount > 0 ? Math.round(entry.loadMsTotal / entry.loadSampleCount) : 0,
    }))
    .sort((left, right) => right.totalWatchSeconds - left.totalWatchSeconds || right.sessionCount - left.sessionCount)
    .slice(0, 20);

  const viewerDropInsights = viewerDropInsightsFromTelemetry.length > 0
    ? viewerDropInsightsFromTelemetry
    : viewerDropInsightsFromFacts;

  const viewerUserMap = new Map<string, ViewerUserOption>();
  const ensureViewerUser = (record: TelemetryLogRecord) => {
    const uid = record.userId;
    if (!uid) {
      return null;
    }

    const existing = viewerUserMap.get(uid);
    if (existing) {
      if (!existing.username && record.username) {
        existing.username = record.username;
      }
      return existing;
    }

    const created: ViewerUserOption = {
      uid,
      username: record.username || uid,
      viewCount: 0,
      sessionCount: 0,
      totalWatchSeconds: 0,
    };
    viewerUserMap.set(uid, created);
    return created;
  };

  (input.telemetryLogsByEvent.viewer_opened || []).forEach((record) => {
    const entry = ensureViewerUser(record);
    if (entry) {
      entry.viewCount += 1;
    }
  });
  (input.telemetryLogsByEvent.viewer_session_started || []).forEach((record) => {
    const entry = ensureViewerUser(record);
    if (entry) {
      entry.sessionCount += 1;
    }
  });
  (input.telemetryLogsByEvent.viewer_session_completed || []).forEach((record) => {
    const entry = ensureViewerUser(record);
    if (entry) {
      entry.totalWatchSeconds += getTelemetryParamNumber(record, "session_watch_seconds");
    }
  });

  const viewerUsers = Array.from(viewerUserMap.values())
    .sort((left, right) =>
      right.sessionCount - left.sessionCount
      || right.totalWatchSeconds - left.totalWatchSeconds
      || right.viewCount - left.viewCount,
    )
    .slice(0, 12);

  return {
    filteredSessionFacts,
    viewerSessionStartedLogs,
    viewerOverviewCanonical,
    viewerDropInsights,
    viewerUsers,
  };
}
