import "server-only";

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

export function buildWatchTimeRollupFromRecords(input: {
  records: Record<string, unknown>[];
  views?: number;
  legacyPageDurationMs?: number;
  allowLegacyFallback?: boolean;
}): WatchTimeRollup {
  let watchTimeMs = 0;
  let validSessionCount = 0;
  let latestWatchAt = 0;

  input.records.forEach((record) => {
    if (record.watchScoreSource && record.watchScoreSource !== "watch_session_rollup") {
      return;
    }

    const validWatchMs = readValidWatchMs(record);
    latestWatchAt = Math.max(
      latestWatchAt,
      readTimestamp(record.lastSeenAtMs),
      readTimestamp(record.closedAtMs),
      readTimestamp(record.updatedAtMs),
    );

    if (validWatchMs <= 0) {
      return;
    }

    watchTimeMs += validWatchMs;
    validSessionCount += 1;
  });

  const issues: WatchTimeRollupIssue[] = [];
  let source: WatchTimeRollupSource = validSessionCount > 0 ? "watch_session_rollup" : "unavailable";
  const views = Math.max(0, Math.round(readNumber(input.views)));

  if (validSessionCount === 0 && input.allowLegacyFallback === true && readNumber(input.legacyPageDurationMs) > 0) {
    watchTimeMs = Math.round(readNumber(input.legacyPageDurationMs));
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
