import "server-only";

import {
  ViewerOverview,
  buildDurationBuckets,
  getTelemetryParamNumber,
  getTelemetryParamString,
  TelemetryLogRecord,
  toNumber,
} from "./admin-analytics-shared";

export interface HistoricalContentAnalytics {
  packagePerformance: Array<{
    label: string;
    starts: number;
    purchases: number;
    failures: number;
    revenueUsd: number;
    drops: number;
    conversionRate: number;
    abandonmentRate: number;
  }>;
  unlockCategoryMix: Array<{
    label: string;
    previews: number;
    unlocks: number;
    unlockRate: number;
  }>;
  watchDepthBuckets: Array<{
    label: string;
    count: number;
  }>;
  contentJourney: Array<{ label: string; count: number }>;
  contentTagDemand: Array<{ tag: string; count: number }>;
}

export function buildHistoricalContentAnalytics(input: {
  telemetryLogsByEvent: Record<string, TelemetryLogRecord[]>;
  eventsData: Record<string, number>;
  watchAssetDocs: FirebaseFirestore.QueryDocumentSnapshot[];
  viewerOverview: ViewerOverview;
  funnel: {
    previewOpens: number;
    unlocks: number;
    viewerOpens: number;
  };
}): HistoricalContentAnalytics {
  const packagePerformanceMap = new Map<string, {
    label: string;
    starts: number;
    purchases: number;
    failures: number;
    revenueUsd: number;
    drops: number;
  }>();

  const applyPackageEvent = (records: TelemetryLogRecord[], type: "start" | "purchase" | "failure") => {
    records.forEach((record) => {
      const packageLabel = getTelemetryParamString(record, "package_label")
        || `${getTelemetryParamNumber(record, "package_drops")} GD`;
      const current = packagePerformanceMap.get(packageLabel) || {
        label: packageLabel,
        starts: 0,
        purchases: 0,
        failures: 0,
        revenueUsd: 0,
        drops: getTelemetryParamNumber(record, "package_drops"),
      };

      if (type === "start") current.starts += 1;
      if (type === "purchase") {
        current.purchases += 1;
        current.revenueUsd += getTelemetryParamNumber(record, "package_price");
      }
      if (type === "failure") current.failures += 1;

      packagePerformanceMap.set(packageLabel, current);
    });
  };

  applyPackageEvent(input.telemetryLogsByEvent.begin_checkout || [], "start");
  applyPackageEvent(input.telemetryLogsByEvent.gumdrops_purchase_completed || [], "purchase");
  applyPackageEvent(input.telemetryLogsByEvent.gumdrops_purchase_failed || [], "failure");

  const packagePerformance = Array.from(packagePerformanceMap.values())
    .map((entry) => ({
      ...entry,
      conversionRate: entry.starts > 0 ? entry.purchases / entry.starts : 0,
      abandonmentRate: entry.starts > 0 ? Math.max(0, entry.starts - entry.purchases) / entry.starts : 0,
    }))
    .sort((left, right) => right.purchases - left.purchases || right.revenueUsd - left.revenueUsd);

  const categoryMixMap = new Map<string, { label: string; previews: number; unlocks: number }>();
  (input.telemetryLogsByEvent.drop_preview_opened || []).forEach((record) => {
    const label = getTelemetryParamString(record, "drop_category") || "unknown";
    const current = categoryMixMap.get(label) || { label, previews: 0, unlocks: 0 };
    current.previews += 1;
    categoryMixMap.set(label, current);
  });
  (input.telemetryLogsByEvent.unlock_drop_success || []).forEach((record) => {
    const label = getTelemetryParamString(record, "drop_category") || "unknown";
    const current = categoryMixMap.get(label) || { label, previews: 0, unlocks: 0 };
    current.unlocks += 1;
    categoryMixMap.set(label, current);
  });

  const unlockCategoryMix = Array.from(categoryMixMap.values())
    .map((entry) => ({
      ...entry,
      unlockRate: entry.previews > 0 ? entry.unlocks / entry.previews : 0,
    }))
    .sort((left, right) => right.unlocks - left.unlocks);

  const telemetryWatchDepthValues = [
    ...(input.telemetryLogsByEvent.viewer_watch_checkpoint || []).map((record) => getTelemetryParamNumber(record, "watch_seconds")),
    ...(input.telemetryLogsByEvent.viewer_asset_consumed || []).map((record) => getTelemetryParamNumber(record, "watch_seconds")),
  ].filter((value) => value > 0);
  const canonicalWatchDepthValues = input.watchAssetDocs.map((doc) => {
      const data = doc.data() as Record<string, unknown>;
      return Math.max(
        toNumber(data.totalWatchSeconds),
        toNumber(data.totalVisibleSeconds),
        toNumber(data.maxProgressSeconds),
        toNumber(data.checkpointMaxSeconds),
      );
    })
    .filter((value) => value > 0);
  const watchDepthValues = canonicalWatchDepthValues.length > 0
    ? canonicalWatchDepthValues
    : telemetryWatchDepthValues;
  const watchDepthBuckets = buildDurationBuckets(
    watchDepthValues.map((value) => value * 1000),
    [
      { label: "<30s", max: 30_000 },
      { label: "30-60s", max: 60_000 },
      { label: "60-90s", max: 90_000 },
      { label: "90-180s", max: 180_000 },
      { label: "180s+", max: Number.POSITIVE_INFINITY },
    ],
  );

  const contentJourney = [
    { label: "Previews", count: input.funnel.previewOpens },
    { label: "Unlock attempts", count: input.eventsData.drop_unlock_attempted || 0 },
    { label: "Unlocks", count: input.funnel.unlocks },
    { label: "Viewer opens", count: Math.max(input.funnel.viewerOpens, input.viewerOverview.viewCount) },
    { label: "Meaningful watch", count: input.viewerOverview.meaningfulSessionCount },
    { label: "Opened, no depth", count: input.viewerOverview.openedWithoutDepthCount },
    { label: "Converted", count: input.viewerOverview.convertedSessionCount },
    { label: "Completed", count: input.viewerOverview.completedSessionCount },
    { label: "Returns", count: input.viewerOverview.returnSessionCount },
  ];

  const tagDemandMap = new Map<string, number>();
  (input.telemetryLogsByEvent.unlock_drop_success || []).forEach((record) => {
    const rawTags = getTelemetryParamString(record, "drop_tags");
    rawTags
      .split("|")
      .map((value) => value.trim())
      .filter(Boolean)
      .forEach((tag) => {
        tagDemandMap.set(tag, (tagDemandMap.get(tag) || 0) + 1);
      });
  });
  const contentTagDemand = Array.from(tagDemandMap.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 10);

  return {
    packagePerformance,
    unlockCategoryMix,
    watchDepthBuckets,
    contentJourney,
    contentTagDemand,
  };
}
