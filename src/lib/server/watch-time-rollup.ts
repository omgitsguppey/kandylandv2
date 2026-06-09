import "server-only";

import { estimateMissingWatchTime } from "@/lib/behavioral/watch-time-estimation";
import { inferLiteralWatchMediaType } from "@/lib/behavioral/watch-time-truth";
import type { WatchTimeRollup, WatchTimeRollupIssue, WatchTimeRollupSource } from "@/lib/watch-time-rollup-contract";

type FirestoreDoc = {
  id: string;
  data: () => Record<string, unknown>;
};

type WatchSessionQuery = {
  get: () => Promise<{ docs: FirestoreDoc[] }>;
};

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function readTimestamp(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (
    value
    && typeof value === "object"
    && "toMillis" in value
    && typeof (value as { toMillis: () => number }).toMillis === "function"
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }

  return 0;
}

function readValidWatchMs(raw: Record<string, unknown>) {
  const explicitValidWatchMs = Math.round(readNumber(raw.validWatchMs));
  if (explicitValidWatchMs > 0) {
    return explicitValidWatchMs;
  }

  return 0;
}

function readDurationMs(raw: Record<string, unknown>, msKey: string, secondsKey: string) {
  const msValue = readNumber(raw[msKey]);
  if (msValue > 0) {
    return Math.round(msValue);
  }

  const secondsValue = readNumber(raw[secondsKey]);
  return secondsValue > 0 ? Math.round(secondsValue * 1000) : 0;
}

function readMediaType(raw: Record<string, unknown>) {
  return inferLiteralWatchMediaType(
    typeof raw.mediaType === "string"
      ? raw.mediaType
      : typeof raw.contentKind === "string"
        ? raw.contentKind
        : typeof raw.activeContentKind === "string"
          ? raw.activeContentKind
          : "",
  );
}

function hasPartialMediaTicks(raw: Record<string, unknown>) {
  return (
    readNumber(raw.validWatchMs) > 0
    || readNumber(raw.visibleMs) > 0
    || readNumber(raw.activeMs) > 0
    || readNumber(raw.playingMs) > 0
    || readNumber(raw.totalVisibleSeconds) > 0
    || readNumber(raw.totalActiveSeconds) > 0
    || readNumber(raw.totalPlayingSeconds) > 0
    || readNumber(raw.maxProgressPercent) > 0
  );
}

function median(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const midpoint = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[midpoint - 1] + sorted[midpoint]) / 2)
    : Math.round(sorted[midpoint]);
}

export function buildWatchTimeRollupFromRecords(input: {
  records: Record<string, unknown>[];
  views?: number;
  viewerOpenMs?: number;
  pageDurationMs?: number;
  viewedFileCount?: number;
  mediaType?: "image" | "video" | "unknown";
  medianKnownWatchMsForMediaType?: number;
  legacyPageDurationMs?: number;
  allowLegacyFallback?: boolean;
}): WatchTimeRollup {
  let watchTimeMs = 0;
  let validSessionCount = 0;
  let latestWatchAt = 0;
  const knownWatchSamplesMs: number[] = [];
  let partialMediaTicks = false;
  let observedVisibleMs = 0;
  let observedActiveMs = 0;
  let observedPlayingMs = 0;
  let maxProgressPercent = 0;
  let manualAdvanceAfterMs = 0;
  let completedFileCount = 0;
  let dominantMediaType = input.mediaType ?? "unknown";

  input.records.forEach((record) => {
    const watchScoreSource = typeof record.watchScoreSource === "string" ? record.watchScoreSource : "";
    if (watchScoreSource && watchScoreSource !== "watch_session_rollup") {
      return;
    }

    const validWatchMs = readValidWatchMs(record);
    const mediaType = readMediaType(record);
    if (dominantMediaType === "unknown" && mediaType !== "unknown") {
      dominantMediaType = mediaType;
    }
    latestWatchAt = Math.max(
      latestWatchAt,
      readTimestamp(record.lastSeenAtMs),
      readTimestamp(record.closedAtMs),
      readTimestamp(record.updatedAtMs),
    );
    partialMediaTicks = partialMediaTicks || hasPartialMediaTicks(record);
    observedVisibleMs += readDurationMs(record, "visibleMs", "totalVisibleSeconds");
    observedActiveMs += readDurationMs(record, "activeMs", "totalActiveSeconds");
    observedPlayingMs += readDurationMs(record, "playingMs", "totalPlayingSeconds");
    maxProgressPercent = Math.max(
      maxProgressPercent,
      readNumber(record.maxProgressPercent),
      readNumber(record.progressPercent),
    );
    manualAdvanceAfterMs = Math.max(
      manualAdvanceAfterMs,
      readDurationMs(record, "manualAdvanceAfterMs", "manualAdvanceAfterSeconds"),
    );
    if (record.completed === true || record.isCompleted === true || record.completedAtMs) {
      completedFileCount += 1;
    }

    if (validWatchMs > 0) {
      if (!input.mediaType || input.mediaType === "unknown" || input.mediaType === mediaType) {
        knownWatchSamplesMs.push(validWatchMs);
      }
    }

    if (validWatchMs <= 0) {
      return;
    }

    watchTimeMs += validWatchMs;
    validSessionCount += 1;
  });

  const issues: WatchTimeRollupIssue[] = [];
  let source: WatchTimeRollupSource = validSessionCount > 0 ? "watch_session_rollup" : "unavailable";
  const views = Math.max(0, Math.round(readNumber(input.views)));
  const legacyPageDurationMs = Math.round(readNumber(input.legacyPageDurationMs));
  const medianKnownWatchMsForMediaType = Math.max(
    0,
    Math.round(readNumber(input.medianKnownWatchMsForMediaType) || median(knownWatchSamplesMs)),
  );
  const viewedFileCount = Math.max(0, Math.round(readNumber(input.viewedFileCount) || views));
  const diagnosticEstimate = views > 0 && validSessionCount === 0
    ? estimateMissingWatchTime({
      viewerOpenMs: input.viewerOpenMs,
      medianKnownWatchMsForMediaType,
      viewedFileCount,
      pageDurationMs: input.pageDurationMs ?? legacyPageDurationMs,
      watchSessionEventCount: input.records.length,
      partialMediaTicks,
      mediaType: dominantMediaType,
      visibleMs: observedVisibleMs,
      activeMs: observedActiveMs,
      playingMs: observedPlayingMs,
      progressPercent: maxProgressPercent,
      manualAdvanceAfterMs,
      completedFileCount,
    })
    : null;

  if (validSessionCount === 0 && input.allowLegacyFallback === true && legacyPageDurationMs > 0) {
    watchTimeMs = legacyPageDurationMs;
    source = "legacy_page_duration";
    issues.push({
      code: "legacy_page_duration_fallback",
      severity: "warn",
      message: "Watch time is using legacy page duration fallback because no valid watch-session rollup exists.",
      evidence: {
        legacyPageDurationMs: watchTimeMs,
        watchSessionRecords: input.records.length,
      },
    });
  }

  if (views > 0 && validSessionCount === 0) {
    issues.push({
      code: "watch_time_missing_despite_views",
      severity: "warn",
      message: "Views exist but valid watch-session rollups are missing.",
      evidence: {
        views,
        watchSessionRecords: input.records.length,
      },
    });
  }

  return {
    watchTimeMs,
    source,
    sessionCount: input.records.length,
    validSessionCount,
    latestWatchAt,
    issues,
    diagnosticEstimate,
    legacyPageDurationMs,
  };
}

export async function readWatchTimeRollupFromQuery(input: {
  query: WatchSessionQuery;
  views?: number;
  legacyPageDurationMs?: number;
  allowLegacyFallback?: boolean;
}): Promise<WatchTimeRollup> {
  const snapshot = await input.query.get();
  return buildWatchTimeRollupFromRecords({
    records: snapshot.docs.map((doc) => doc.data()),
    views: input.views,
    legacyPageDurationMs: input.legacyPageDurationMs,
    allowLegacyFallback: input.allowLegacyFallback,
  });
}
