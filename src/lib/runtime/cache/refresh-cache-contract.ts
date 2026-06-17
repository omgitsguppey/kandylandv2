export const REFRESH_CACHE_DISPLAY_STATES = [
  "verified",
  "refreshing",
  "refresh_failed",
  "stale_but_verified",
  "unavailable",
  "pending_first_snapshot",
  "server_confirmed",
  "cache_confirmed",
  "estimated",
  "mixed",
  "legacy_mapped",
] as const;

export type RefreshCacheDisplayState = (typeof REFRESH_CACHE_DISPLAY_STATES)[number];

export interface RefreshCacheRecord<TPayload = unknown> {
  cacheKey: string;
  moduleKey?: string | null;
  surfaceKey: string;
  rangeKey?: string | null;
  value: TPayload | null;
  generatedAt: string | null;
  lastVerifiedAt: string | null;
  lastRefreshRequestedAt: string | null;
  lastRefreshStartedAt: string | null;
  lastRefreshCompletedAt: string | null;
  lastRefreshFailedAt: string | null;
  refreshStatus: string;
  refreshVersion: number;
  sourceVersion: string;
  invalidationReason: string | null;
  sourceMode: string;
  truthState: string;
  confidence: number;
  parityWarnings: readonly unknown[];
  estimatedFlags: Record<string, unknown>;
  legacyFlags: Record<string, unknown>;
}

export type RefreshCacheDisplayInput = {
  lastVerifiedAt?: string | null;
  lastRefreshStartedAt?: string | null;
  lastRefreshCompletedAt?: string | null;
  lastRefreshFailedAt?: string | null;
  refreshStartedAt?: string | null;
  refreshCompletedAt?: string | null;
  refreshFailedAt?: string | null;
  refreshStatus?: string | null;
  invalidationReason?: string | null;
  sourceMode?: string | null;
  truthState?: string | null;
  confidence?: number | null;
};

export function buildRefreshCacheKey(input: {
  surfaceKey: string;
  moduleKey?: string | null;
  rangeKey?: string | null;
}) {
  return [
    input.surfaceKey,
    input.moduleKey ?? "surface",
    input.rangeKey ?? "default",
  ].join(":").replace(/[^a-zA-Z0-9:_-]+/g, "_");
}

export function getLastVerifiedOrNull<T extends RefreshCacheDisplayInput>(
  record: T | null | undefined,
): T | null {
  if (!record?.lastVerifiedAt || record.invalidationReason) {
    return null;
  }

  return record;
}

export function getDisplaySnapshot<T extends RefreshCacheDisplayInput>(
  record: T | null | undefined,
): T | null {
  return getLastVerifiedOrNull(record);
}

export function getRefreshStatus(record: RefreshCacheDisplayInput | null | undefined) {
  if (!record) {
    return "unavailable";
  }

  return record.refreshStatus ?? "idle";
}

export function shouldShowWaiting(record: RefreshCacheDisplayInput | null | undefined) {
  return !getDisplaySnapshot(record) && !record?.invalidationReason && getRefreshStatus(record) !== "failed";
}

export function shouldShowUnavailable(record: RefreshCacheDisplayInput | null | undefined) {
  return !getDisplaySnapshot(record) && getRefreshStatus(record) === "failed";
}

export function shouldShowStale(record: RefreshCacheDisplayInput | null | undefined) {
  if (!getDisplaySnapshot(record)) {
    return false;
  }

  return record?.sourceMode === "stale_cache" || record?.truthState === "stale";
}

export function resolveRefreshCacheDisplayState(
  record: RefreshCacheDisplayInput | null | undefined,
): RefreshCacheDisplayState {
  const displayable = getDisplaySnapshot(record);

  if (!displayable) {
    return getRefreshStatus(record) === "failed" ? "unavailable" : "pending_first_snapshot";
  }

  if (record?.refreshStatus === "refreshing" || record?.refreshStatus === "queued") {
    return "refreshing";
  }

  if (record?.refreshStatus === "failed") {
    return "refresh_failed";
  }

  if (record?.sourceMode === "estimated") {
    return "estimated";
  }

  if (record?.sourceMode === "mixed" || record?.truthState === "partial") {
    return "mixed";
  }

  if (record?.sourceMode === "stale_cache" || record?.truthState === "stale") {
    return "stale_but_verified";
  }

  if (record?.sourceMode === "live" || record?.sourceMode === "intraday") {
    return "server_confirmed";
  }

  if (record?.sourceMode === "verified_cache") {
    return "cache_confirmed";
  }

  return "verified";
}

export function markRefreshRequested<T extends RefreshCacheRecord>(
  record: T,
  requestedAt: string,
): T {
  return {
    ...record,
    lastRefreshRequestedAt: requestedAt,
    refreshStatus: "queued",
  };
}

export function requestRefresh<T extends RefreshCacheRecord>(
  record: T,
  requestedAt: string,
): T {
  return markRefreshRequested(record, requestedAt);
}

export function dedupeRefresh(input: {
  cacheKey: string;
  activeRefreshKeys: ReadonlySet<string>;
}) {
  return input.activeRefreshKeys.has(input.cacheKey);
}

export function markRefreshStarted<T extends RefreshCacheRecord>(
  record: T,
  startedAt: string,
): T {
  return {
    ...record,
    lastRefreshRequestedAt: record.lastRefreshRequestedAt ?? startedAt,
    lastRefreshStartedAt: startedAt,
    refreshStatus: "refreshing",
  };
}

export function markRefreshCompleted<T extends RefreshCacheRecord>(
  record: T,
  completedAt: string,
): T {
  return {
    ...record,
    lastRefreshCompletedAt: completedAt,
    lastRefreshFailedAt: null,
    refreshStatus: "completed",
    refreshVersion: record.refreshVersion + 1,
  };
}

export function markRefreshFailed<T extends RefreshCacheRecord>(
  record: T,
  failedAt: string,
): T {
  return {
    ...record,
    lastRefreshFailedAt: failedAt,
    refreshStatus: "failed",
  };
}
