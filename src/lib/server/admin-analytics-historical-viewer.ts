import "server-only";

import {
  deriveViewerWatchAssetState,
  deriveViewerWatchSessionState,
} from "@/lib/viewer-watch-session";

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
  loadMsTotalAggregated: number;
  loadSampleCountAggregated: number;
  fallbackAssetStarts: number;
  fallbackAssetCompletions: number;
  hasAssetDocs: boolean;
};

type WatchSessionRecord = {
  id: string;
  userId: string;
  username: string;
  dropId: string;
  dropTitle: string;
  totalWatchSeconds: number;
  totalVisibleSeconds: number;
  meaningfulWatch: boolean;
  deepWatch: boolean;
  bounced: boolean;
  abandoned: boolean;
  stalled: boolean;
  converted: boolean;
  completedSession: boolean;
  openedWithoutDepth: boolean;
  viewedAssetCount: number;
  completedAssetCount: number;
  consumedAssetCount: number;
  assetSwitchCount: number;
  downloadCount: number;
  relatedClickCount: number;
  loadMsTotal: number;
  loadSampleCount: number;
  averageLoadMs: number;
};

type WatchAssetRecord = {
  id: string;
  userId: string;
  username: string;
  dropId: string;
  dropTitle: string;
  totalWatchSeconds: number;
  totalVisibleSeconds: number;
  meaningfulWatch: boolean;
  bounced: boolean;
  abandoned: boolean;
  maxProgressSeconds: number;
  checkpointMaxSeconds: number;
  isCompleted: boolean;
};

export interface HistoricalViewerOverview {
  filteredSessionFacts: SessionFactRecord[];
  viewerSessionStartedLogs: TelemetryLogRecord[];
  viewerOverviewCanonical: ViewerOverview;
  viewerDropInsights: ViewerDropInsight[];
  viewerUsers: ViewerUserOption[];
}

function matchesResolvedViewerIdentity(userId: string, username: string, viewerFilter: string) {
  if (!viewerFilter) {
    return true;
  }

  const normalizedFilter = normalizeViewerIdentity(viewerFilter);
  if (!normalizedFilter) {
    return true;
  }

  const candidateUserId = normalizeViewerIdentity(userId);
  const candidateUsername = normalizeViewerIdentity(username);
  return candidateUserId === normalizedFilter || candidateUsername === normalizedFilter;
}

function parseWatchSessionDoc(doc: FirebaseFirestore.QueryDocumentSnapshot): WatchSessionRecord {
  const data = doc.data() as Record<string, unknown>;
  const derivedState = deriveViewerWatchSessionState({
    totalWatchSeconds: Math.max(toNumber(data.validWatchMs) / 1000, toNumber(data.totalActiveSeconds), toNumber(data.totalWatchSeconds)),
    totalVisibleSeconds: toNumber(data.totalVisibleSeconds),
    maxAssetWatchSeconds: toNumber(data.maxAssetWatchSeconds),
    viewedAssetCount: toNumber(data.viewedAssetCount),
    completedAssetCount: toNumber(data.completedAssetCount),
    consumedAssetCount: toNumber(data.consumedAssetCount),
    assetSwitchCount: toNumber(data.assetSwitchCount),
    downloadCount: toNumber(data.downloadCount),
    relatedClickCount: toNumber(data.relatedClickCount),
    loadSampleCount: toNumber(data.loadSampleCount),
  });
  return {
    id: doc.id,
    userId: toStringValue(data.userId),
    username: toStringValue(data.username),
    dropId: toStringValue(data.dropId) || "unknown-drop",
    dropTitle: toStringValue(data.dropTitle),
    totalWatchSeconds: Math.max(toNumber(data.validWatchMs) / 1000, toNumber(data.totalActiveSeconds), toNumber(data.totalWatchSeconds)),
    totalVisibleSeconds: toNumber(data.totalVisibleSeconds),
    meaningfulWatch: data.meaningfulWatch === true || derivedState.meaningfulWatch,
    deepWatch: data.deepWatch === true || derivedState.deepWatch,
    bounced: data.bounced === true || derivedState.bounced,
    abandoned: data.abandoned === true || derivedState.abandoned,
    stalled: data.stalled === true || derivedState.stalled,
    converted: data.converted === true || derivedState.converted,
    completedSession: data.completedSession === true || derivedState.completedSession,
    openedWithoutDepth: data.openedWithoutDepth === true || derivedState.openedWithoutDepth,
    viewedAssetCount: toNumber(data.viewedAssetCount),
    completedAssetCount: toNumber(data.completedAssetCount),
    consumedAssetCount: toNumber(data.consumedAssetCount),
    assetSwitchCount: toNumber(data.assetSwitchCount),
    downloadCount: toNumber(data.downloadCount),
    relatedClickCount: toNumber(data.relatedClickCount),
    loadMsTotal: toNumber(data.loadMsTotal),
    loadSampleCount: toNumber(data.loadSampleCount),
    averageLoadMs: toNumber(data.averageLoadMs),
  };
}

function parseWatchAssetDoc(doc: FirebaseFirestore.QueryDocumentSnapshot): WatchAssetRecord {
  const data = doc.data() as Record<string, unknown>;
  const derivedState = deriveViewerWatchAssetState({
    totalWatchSeconds: Math.max(toNumber(data.validWatchMs) / 1000, toNumber(data.totalActiveSeconds), toNumber(data.totalWatchSeconds)),
    totalVisibleSeconds: toNumber(data.totalVisibleSeconds),
    maxProgressSeconds: Math.max(toNumber(data.maxProgressSeconds), toNumber(data.checkpointMaxSeconds)),
    completedAssetCount: data.isCompleted === true ? 1 : 0,
    consumedAssetCount: data.isConsumed === true ? 1 : 0,
    loadSampleCount: toNumber(data.loadSampleCount),
    viewedAssetCount: 1,
  });
  return {
    id: doc.id,
    userId: toStringValue(data.userId),
    username: toStringValue(data.username),
    dropId: toStringValue(data.dropId) || "unknown-drop",
    dropTitle: toStringValue(data.dropTitle),
    totalWatchSeconds: Math.max(toNumber(data.validWatchMs) / 1000, toNumber(data.totalActiveSeconds), toNumber(data.totalWatchSeconds)),
    totalVisibleSeconds: toNumber(data.totalVisibleSeconds),
    meaningfulWatch: data.meaningfulWatch === true || derivedState.meaningfulWatch,
    bounced: data.bounced === true || derivedState.bounced,
    abandoned: data.abandoned === true || derivedState.abandoned,
    maxProgressSeconds: toNumber(data.maxProgressSeconds),
    checkpointMaxSeconds: toNumber(data.checkpointMaxSeconds),
    isCompleted: data.isCompleted === true,
  };
}

function buildWatchOverview(
  watchSessions: WatchSessionRecord[],
  watchAssets: WatchAssetRecord[],
): ViewerOverview {
  const sessionCountsByUser = new Map<string, number>();
  const uniqueViewerKeys = new Set<string>();
  const sessionDurations: number[] = [];
  const watchDurations: number[] = [];
  const loadSamples: number[] = [];
  const viewerDropSessionCounts = new Map<string, number>();
  let totalLoadMs = 0;
  let totalLoadSampleCount = 0;
  let meaningfulSessionCount = 0;
  let openedWithoutDepthCount = 0;
  let bounceSessionCount = 0;
  let abandonedSessionCount = 0;
  let stalledSessionCount = 0;
  let convertedSessionCount = 0;
  let completedSessionCount = 0;

  watchSessions.forEach((record) => {
    const viewerKey = record.userId || record.username || "";
    if (viewerKey) {
      uniqueViewerKeys.add(viewerKey);
      sessionCountsByUser.set(viewerKey, (sessionCountsByUser.get(viewerKey) || 0) + 1);
      viewerDropSessionCounts.set(
        `${viewerKey}::${record.dropId}`,
        (viewerDropSessionCounts.get(`${viewerKey}::${record.dropId}`) || 0) + 1,
      );
    }

    const sessionSeconds = record.totalVisibleSeconds > 0 ? record.totalVisibleSeconds : record.totalWatchSeconds;
    if (sessionSeconds > 0) {
      sessionDurations.push(sessionSeconds);
    }
    if (record.totalWatchSeconds > 0) {
      watchDurations.push(record.totalWatchSeconds);
    }
    totalLoadMs += record.loadMsTotal;
    totalLoadSampleCount += record.loadSampleCount;

    const loadMs = record.averageLoadMs > 0
      ? record.averageLoadMs
      : record.loadSampleCount > 0
        ? Math.round(record.loadMsTotal / record.loadSampleCount)
        : 0;
    if (loadMs > 0) {
      loadSamples.push(loadMs);
    }

    if (record.meaningfulWatch) meaningfulSessionCount += 1;
    if (record.openedWithoutDepth) openedWithoutDepthCount += 1;
    if (record.bounced) bounceSessionCount += 1;
    if (record.abandoned) abandonedSessionCount += 1;
    if (record.stalled) stalledSessionCount += 1;
    if (record.converted) convertedSessionCount += 1;
    if (record.completedSession) completedSessionCount += 1;
  });

  const viewedAssetCount = watchSessions.reduce((total, record) => total + record.viewedAssetCount, 0);
  const completedAssetCount = watchSessions.reduce((total, record) => total + record.completedAssetCount, 0);
  const assetStarts = watchAssets.length > 0 ? watchAssets.length : viewedAssetCount;
  const assetCompletions = watchAssets.length > 0
    ? watchAssets.filter((record) => record.isCompleted).length
    : completedAssetCount;

  return {
    viewCount: watchSessions.length,
    sessionCount: watchSessions.length,
    uniqueViewerCount: uniqueViewerKeys.size,
    repeatSessionCount: Array.from(sessionCountsByUser.values()).reduce(
      (total, value) => total + Math.max(0, value - 1),
      0,
    ),
    returnSessionCount: Array.from(viewerDropSessionCounts.values()).reduce(
      (total, value) => total + Math.max(0, value - 1),
      0,
    ),
    totalWatchSeconds: sum(watchDurations),
    avgSessionSeconds: average(sessionDurations),
    avgWatchSeconds: average(watchDurations),
    watchScoreSource: "watch_session_rollup",
    watchScoreConfidence: "high",
    avgLoadMs: totalLoadSampleCount > 0 ? Math.round(totalLoadMs / totalLoadSampleCount) : average(loadSamples),
    assetCompletionRate: assetStarts > 0 ? assetCompletions / assetStarts : 0,
    meaningfulSessionCount,
    openedWithoutDepthCount,
    bounceSessionCount,
    abandonedSessionCount,
    stalledSessionCount,
    convertedSessionCount,
    completedSessionCount,
    assetSwitches: watchSessions.reduce((total, record) => total + record.assetSwitchCount, 0),
    downloads: watchSessions.reduce((total, record) => total + record.downloadCount, 0),
    relatedClicks: watchSessions.reduce((total, record) => total + record.relatedClickCount, 0),
  };
}

function buildWatchDropInsights(input: {
  watchSessions: WatchSessionRecord[];
  watchAssets: WatchAssetRecord[];
  dropReferences: Record<string, DropReference>;
}): ViewerDropInsight[] {
  const viewerDropInsightMap = new Map<string, MutableViewerDropInsight>();

  const ensureViewerDropInsight = (dropId: string, dropTitle?: string) => {
    const existing = viewerDropInsightMap.get(dropId);
    if (existing) {
      if (existing.dropTitle === existing.dropId && dropTitle) {
        existing.dropTitle = dropTitle;
      }
      return existing;
    }

    const created: MutableViewerDropInsight = {
      dropId,
      dropTitle: dropTitle || dropId,
      viewCount: 0,
      sessionCount: 0,
      uniqueViewerCount: 0,
      repeatSessionCount: 0,
      returnSessionCount: 0,
      totalWatchSeconds: 0,
      avgSessionSeconds: 0,
      avgWatchSeconds: 0,
      watchScoreSource: "legacy_page_duration",
      watchScoreConfidence: "low",
      assetStarts: 0,
      assetCompletions: 0,
      meaningfulSessionCount: 0,
      openedWithoutDepthCount: 0,
      bounceSessionCount: 0,
      abandonedSessionCount: 0,
      stalledSessionCount: 0,
      convertedSessionCount: 0,
      completedSessionCount: 0,
      assetSwitches: 0,
      downloads: 0,
      relatedClicks: 0,
      avgLoadMs: 0,
      uniqueViewerKeys: new Set<string>(),
      sessionCountsByUser: new Map<string, number>(),
      sessionDurations: [],
      watchDurations: [],
      loadSamples: [],
      loadMsTotalAggregated: 0,
      loadSampleCountAggregated: 0,
      fallbackAssetStarts: 0,
      fallbackAssetCompletions: 0,
      hasAssetDocs: false,
    };
    viewerDropInsightMap.set(dropId, created);
    return created;
  };

  input.watchSessions.forEach((record) => {
    const insight = ensureViewerDropInsight(record.dropId, record.dropTitle);
    insight.viewCount += 1;
    insight.sessionCount += 1;
    insight.totalWatchSeconds += record.totalWatchSeconds;
    insight.assetSwitches += record.assetSwitchCount;
    insight.downloads += record.downloadCount;
    insight.relatedClicks += record.relatedClickCount;
    insight.fallbackAssetStarts += record.viewedAssetCount;
    insight.fallbackAssetCompletions += record.completedAssetCount;
    insight.loadMsTotalAggregated += record.loadMsTotal;
    insight.loadSampleCountAggregated += record.loadSampleCount;

    const viewerKey = record.userId || record.username || "";
    if (viewerKey) {
      insight.uniqueViewerKeys.add(viewerKey);
      insight.sessionCountsByUser.set(viewerKey, (insight.sessionCountsByUser.get(viewerKey) || 0) + 1);
    }

    const sessionSeconds = record.totalVisibleSeconds > 0 ? record.totalVisibleSeconds : record.totalWatchSeconds;
    if (sessionSeconds > 0) {
      insight.sessionDurations.push(sessionSeconds);
    }
    if (record.totalWatchSeconds > 0) {
      insight.watchDurations.push(record.totalWatchSeconds);
    }

    const loadMs = record.averageLoadMs > 0
      ? record.averageLoadMs
      : record.loadSampleCount > 0
        ? Math.round(record.loadMsTotal / record.loadSampleCount)
        : 0;
    if (loadMs > 0) {
      insight.loadSamples.push(loadMs);
    }

    if (record.meaningfulWatch) insight.meaningfulSessionCount += 1;
    if (record.openedWithoutDepth) insight.openedWithoutDepthCount += 1;
    if (record.bounced) insight.bounceSessionCount += 1;
    if (record.abandoned) insight.abandonedSessionCount += 1;
    if (record.stalled) insight.stalledSessionCount += 1;
    if (record.converted) insight.convertedSessionCount += 1;
    if (record.completedSession) insight.completedSessionCount += 1;
  });

  input.watchAssets.forEach((record) => {
    const insight = ensureViewerDropInsight(record.dropId, record.dropTitle);
    insight.hasAssetDocs = true;
    insight.assetStarts += 1;
    if (record.isCompleted) {
      insight.assetCompletions += 1;
    }
  });

  return Array.from(viewerDropInsightMap.values())
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
      returnSessionCount: Array.from(entry.sessionCountsByUser.values()).reduce(
        (total, value) => total + Math.max(0, value - 1),
        0,
      ),
      totalWatchSeconds: entry.totalWatchSeconds,
      avgSessionSeconds: average(entry.sessionDurations),
      avgWatchSeconds: average(entry.watchDurations),
      assetStarts: entry.hasAssetDocs ? entry.assetStarts : entry.fallbackAssetStarts,
      assetCompletions: entry.hasAssetDocs ? entry.assetCompletions : entry.fallbackAssetCompletions,
      meaningfulSessionCount: entry.meaningfulSessionCount,
      openedWithoutDepthCount: entry.openedWithoutDepthCount,
      bounceSessionCount: entry.bounceSessionCount,
      abandonedSessionCount: entry.abandonedSessionCount,
      stalledSessionCount: entry.stalledSessionCount,
      convertedSessionCount: entry.convertedSessionCount,
      completedSessionCount: entry.completedSessionCount,
      assetSwitches: entry.assetSwitches,
      downloads: entry.downloads,
      relatedClicks: entry.relatedClicks,
      avgLoadMs: entry.loadSampleCountAggregated > 0
        ? Math.round(entry.loadMsTotalAggregated / entry.loadSampleCountAggregated)
        : average(entry.loadSamples),
    }))
    .sort((left, right) =>
      right.totalWatchSeconds - left.totalWatchSeconds
      || right.sessionCount - left.sessionCount
      || right.viewCount - left.viewCount,
    )
    .slice(0, 20);
}

function buildWatchViewerUsers(watchSessions: WatchSessionRecord[]): ViewerUserOption[] {
  const viewerUserMap = new Map<string, ViewerUserOption>();

  watchSessions.forEach((record) => {
    const uid = record.userId;
    if (!uid) {
      return;
    }

    const existing = viewerUserMap.get(uid) || {
      uid,
      username: record.username || uid,
      viewCount: 0,
      sessionCount: 0,
      totalWatchSeconds: 0,
    };
    existing.viewCount += 1;
    existing.sessionCount += 1;
    existing.totalWatchSeconds += record.totalWatchSeconds;
    if (!existing.username && record.username) {
      existing.username = record.username;
    }
    viewerUserMap.set(uid, existing);
  });

  return Array.from(viewerUserMap.values())
    .sort((left, right) =>
      right.sessionCount - left.sessionCount
      || right.totalWatchSeconds - left.totalWatchSeconds
      || right.viewCount - left.viewCount,
    )
    .slice(0, 12);
}

export function buildHistoricalViewerOverview(input: {
  telemetryLogsByEvent: Record<string, TelemetryLogRecord[]>;
  sessionFacts: FirebaseFirestore.QueryDocumentSnapshot[];
  watchSessionDocs: FirebaseFirestore.QueryDocumentSnapshot[];
  watchAssetDocs: FirebaseFirestore.QueryDocumentSnapshot[];
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

  const filteredWatchSessions = input.watchSessionDocs
    .map((doc) => parseWatchSessionDoc(doc))
    .filter((record) => matchesResolvedViewerIdentity(record.userId, record.username, input.viewerUser));
  const filteredWatchAssets = input.watchAssetDocs
    .map((doc) => parseWatchAssetDoc(doc))
    .filter((record) => matchesResolvedViewerIdentity(record.userId, record.username, input.viewerUser));

  const viewerOpenLogs = (input.telemetryLogsByEvent.viewer_opened || []).filter((record) => matchesViewerFilter(record, input.viewerUser));
  const viewerSessionStartedLogs = (input.telemetryLogsByEvent.viewer_session_started || []).filter((record) => matchesViewerFilter(record, input.viewerUser));
  const viewerSessionCompletedLogs = (input.telemetryLogsByEvent.viewer_session_completed || []).filter((record) => matchesViewerFilter(record, input.viewerUser));
  const viewerAssetStartedLogs = (input.telemetryLogsByEvent.viewer_asset_started || []).filter((record) => matchesViewerFilter(record, input.viewerUser));
  const viewerAssetCompletedLogs = (input.telemetryLogsByEvent.viewer_asset_completed || []).filter((record) => matchesViewerFilter(record, input.viewerUser));
  const viewerAssetChangedLogs = (input.telemetryLogsByEvent.viewer_asset_changed || []).filter((record) => matchesViewerFilter(record, input.viewerUser));
  const viewerDownloadLogs = (input.telemetryLogsByEvent.viewer_source_downloaded || []).filter((record) => matchesViewerFilter(record, input.viewerUser));
  const viewerRelatedLogs = (input.telemetryLogsByEvent.viewer_related_drop_clicked || []).filter((record) => matchesViewerFilter(record, input.viewerUser));
  const viewerContentLoadedLogs = (input.telemetryLogsByEvent.viewer_content_loaded || []).filter((record) => matchesViewerFilter(record, input.viewerUser));
  const viewerAssetConsumedLogs = (input.telemetryLogsByEvent.viewer_asset_consumed || []).filter((record) => matchesViewerFilter(record, input.viewerUser));

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
  const meaningfulSessionCountFromTelemetry = viewerSessionCompletedLogs
    .filter((record) => getTelemetryParamNumber(record, "session_watch_seconds") >= 10)
    .length;
  const bounceSessionCountFromTelemetry = viewerSessionCompletedLogs
    .filter((record) => {
      const watchSeconds = getTelemetryParamNumber(record, "session_watch_seconds");
      const durationSeconds = getTelemetryParamNumber(record, "duration_seconds")
        || Math.round(getTelemetryParamNumber(record, "duration_ms") / 1000);
      return Math.max(watchSeconds, durationSeconds) > 0 && Math.max(watchSeconds, durationSeconds) < 5;
    })
    .length;
  const completedSessionCountFromTelemetry = Math.min(viewerSessionStartedLogs.length, viewerAssetCompletedLogs.length);
  const convertedSessionCountFromTelemetry = Math.min(
    viewerSessionStartedLogs.length,
    Math.max(completedSessionCountFromTelemetry, viewerAssetConsumedLogs.length),
  );
  const abandonedSessionCountFromTelemetry = Math.max(
    0,
    viewerSessionCompletedLogs.length - meaningfulSessionCountFromTelemetry - completedSessionCountFromTelemetry,
  );
  const openedWithoutDepthCountFromTelemetry = Math.max(
    0,
    viewerSessionStartedLogs.length - meaningfulSessionCountFromTelemetry,
  );

  const viewerOverview: ViewerOverview = {
    viewCount: viewerOpenLogs.length,
    sessionCount: viewerSessionStartedLogs.length,
    uniqueViewerCount: overallViewerKeys.size,
    repeatSessionCount,
    returnSessionCount: repeatSessionCount,
    totalWatchSeconds: sum(overallWatchDurations),
    avgSessionSeconds: average(overallSessionDurations),
    avgWatchSeconds: average(overallWatchDurations),
    watchScoreSource: "legacy_page_duration",
    watchScoreConfidence: "low",
    avgLoadMs: average(overallLoadSamples),
    assetCompletionRate: viewerAssetStartedLogs.length > 0 ? viewerAssetCompletedLogs.length / viewerAssetStartedLogs.length : 0,
    meaningfulSessionCount: meaningfulSessionCountFromTelemetry,
    openedWithoutDepthCount: openedWithoutDepthCountFromTelemetry,
    bounceSessionCount: bounceSessionCountFromTelemetry,
    abandonedSessionCount: abandonedSessionCountFromTelemetry,
    stalledSessionCount: 0,
    convertedSessionCount: convertedSessionCountFromTelemetry,
    completedSessionCount: completedSessionCountFromTelemetry,
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

  const watchOverview = buildWatchOverview(filteredWatchSessions, filteredWatchAssets);
  watchOverview.watchScoreSource = "watch_session_rollup";
  watchOverview.watchScoreConfidence = "high";
  const viewerOverviewCanonical: ViewerOverview = filteredWatchSessions.length > 0
    ? watchOverview
    : viewerOverview.sessionCount > 0
      ? viewerOverview
      : {
        viewCount: sessionFactOverview.sessionCount,
        sessionCount: sessionFactOverview.sessionCount,
        uniqueViewerCount: sessionFactOverview.uniqueViewerKeys.size,
        repeatSessionCount: Array.from(sessionFactOverview.sessionCounts.values()).reduce(
          (total, value) => total + Math.max(0, value - 1),
          0,
        ),
        returnSessionCount: Array.from(sessionFactOverview.sessionCounts.values()).reduce(
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
        watchScoreSource: "legacy_page_duration",
        watchScoreConfidence: "low",
        avgLoadMs: sessionFactOverview.loadSampleCount > 0
          ? Math.round(sessionFactOverview.loadMsTotal / sessionFactOverview.loadSampleCount)
          : 0,
        assetCompletionRate: 0,
        meaningfulSessionCount: 0,
        openedWithoutDepthCount: 0,
        bounceSessionCount: 0,
        abandonedSessionCount: 0,
        stalledSessionCount: 0,
        convertedSessionCount: 0,
        completedSessionCount: 0,
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
      returnSessionCount: 0,
      totalWatchSeconds: 0,
      avgSessionSeconds: 0,
      avgWatchSeconds: 0,
      assetStarts: 0,
      assetCompletions: 0,
      meaningfulSessionCount: 0,
      openedWithoutDepthCount: 0,
      bounceSessionCount: 0,
      abandonedSessionCount: 0,
      stalledSessionCount: 0,
      convertedSessionCount: 0,
      completedSessionCount: 0,
      assetSwitches: 0,
      downloads: 0,
      relatedClicks: 0,
      avgLoadMs: 0,
      uniqueViewerKeys: new Set<string>(),
      sessionCountsByUser: new Map<string, number>(),
      sessionDurations: [],
      watchDurations: [],
      loadSamples: [],
      loadMsTotalAggregated: 0,
      loadSampleCountAggregated: 0,
      fallbackAssetStarts: 0,
      fallbackAssetCompletions: 0,
      hasAssetDocs: false,
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
    const derivedState = deriveViewerWatchSessionState({
      totalWatchSeconds: watchSeconds,
      totalVisibleSeconds: sessionSeconds,
      viewedAssetCount: 1,
    });

    if (sessionSeconds > 0) {
      insight.sessionDurations.push(sessionSeconds);
    }
    if (watchSeconds > 0) {
      insight.watchDurations.push(watchSeconds);
      insight.totalWatchSeconds += watchSeconds;
    }
    if (derivedState.meaningfulWatch) insight.meaningfulSessionCount += 1;
    if (derivedState.openedWithoutDepth) insight.openedWithoutDepthCount += 1;
    if (derivedState.bounced) insight.bounceSessionCount += 1;
    if (derivedState.abandoned) insight.abandonedSessionCount += 1;
  });
  viewerAssetStartedLogs.forEach((record) => {
    ensureViewerDropInsight(record).assetStarts += 1;
  });
  viewerAssetCompletedLogs.forEach((record) => {
    const insight = ensureViewerDropInsight(record);
    insight.assetCompletions += 1;
    insight.completedSessionCount += 1;
    insight.convertedSessionCount += 1;
  });
  viewerAssetConsumedLogs.forEach((record) => {
    ensureViewerDropInsight(record).convertedSessionCount += 1;
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
    .map((entry) => {
      const sessionCount = entry.sessionCount;
      const meaningfulSessionCount = Math.min(sessionCount, entry.meaningfulSessionCount);
      const convertedSessionCount = Math.min(sessionCount, entry.convertedSessionCount);
      const completedSessionCount = Math.min(sessionCount, entry.completedSessionCount);
      const bounceSessionCount = Math.min(sessionCount, entry.bounceSessionCount);
      const abandonedSessionCount = Math.min(sessionCount, entry.abandonedSessionCount);

      return {
        dropId: entry.dropId,
        dropTitle: resolveDropTitle(input.dropReferences, entry.dropId, entry.dropTitle),
        viewCount: entry.viewCount,
        sessionCount,
        uniqueViewerCount: entry.uniqueViewerKeys.size,
        repeatSessionCount: Array.from(entry.sessionCountsByUser.values()).reduce(
          (total, value) => total + Math.max(0, value - 1),
          0,
        ),
        returnSessionCount: Array.from(entry.sessionCountsByUser.values()).reduce(
          (total, value) => total + Math.max(0, value - 1),
          0,
        ),
        totalWatchSeconds: entry.totalWatchSeconds,
        avgSessionSeconds: average(entry.sessionDurations),
        avgWatchSeconds: average(entry.watchDurations),
        assetStarts: entry.assetStarts,
        assetCompletions: entry.assetCompletions,
        meaningfulSessionCount,
        openedWithoutDepthCount: Math.max(0, sessionCount - meaningfulSessionCount),
        bounceSessionCount,
        abandonedSessionCount,
        stalledSessionCount: 0,
        convertedSessionCount,
        completedSessionCount,
        assetSwitches: entry.assetSwitches,
        downloads: entry.downloads,
        relatedClicks: entry.relatedClicks,
        avgLoadMs: average(entry.loadSamples),
      };
    })
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
      returnSessionCount: Array.from(entry.sessionCounts.values()).reduce(
        (total, value) => total + Math.max(0, value - 1),
        0,
      ),
      totalWatchSeconds: entry.totalWatchSeconds,
      avgSessionSeconds: entry.sessionCount > 0 ? Math.round(entry.totalWatchSeconds / entry.sessionCount) : 0,
      avgWatchSeconds: entry.sessionCount > 0 ? Math.round(entry.totalWatchSeconds / entry.sessionCount) : 0,
      assetStarts: 0,
      assetCompletions: 0,
      meaningfulSessionCount: 0,
      openedWithoutDepthCount: 0,
      bounceSessionCount: 0,
      abandonedSessionCount: 0,
      stalledSessionCount: 0,
      convertedSessionCount: 0,
      completedSessionCount: 0,
      assetSwitches: 0,
      downloads: 0,
      relatedClicks: 0,
      avgLoadMs: entry.loadSampleCount > 0 ? Math.round(entry.loadMsTotal / entry.loadSampleCount) : 0,
    }))
    .sort((left, right) => right.totalWatchSeconds - left.totalWatchSeconds || right.sessionCount - left.sessionCount)
    .slice(0, 20);

  const viewerDropInsightsFromWatch = buildWatchDropInsights({
    watchSessions: filteredWatchSessions,
    watchAssets: filteredWatchAssets,
    dropReferences: input.dropReferences,
  });
  const viewerDropInsights = viewerDropInsightsFromWatch.length > 0
    ? viewerDropInsightsFromWatch
    : viewerDropInsightsFromTelemetry.length > 0
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

  const viewerUsersFromTelemetry = Array.from(viewerUserMap.values())
    .sort((left, right) =>
      right.sessionCount - left.sessionCount
      || right.totalWatchSeconds - left.totalWatchSeconds
      || right.viewCount - left.viewCount,
    )
    .slice(0, 12);
  const viewerUsersFromWatch = buildWatchViewerUsers(filteredWatchSessions);
  const viewerUsers = viewerUsersFromWatch.length > 0 ? viewerUsersFromWatch : viewerUsersFromTelemetry;

  return {
    filteredSessionFacts,
    viewerSessionStartedLogs,
    viewerOverviewCanonical,
    viewerDropInsights,
    viewerUsers,
  };
}
