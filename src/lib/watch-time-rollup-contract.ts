export type WatchTimeRollupSource = "watch_session_rollup" | "legacy_page_duration" | "unavailable";

export type WatchTimeRollupIssueCode =
  | "watch_time_missing_despite_views"
  | "legacy_page_duration_fallback";

export type WatchTimeRollupIssue = {
  code: WatchTimeRollupIssueCode;
  severity: "info" | "warn" | "fail";
  message: string;
  evidence: Record<string, unknown>;
};

export type WatchTimeRollup = {
  watchTimeMs: number;
  source: WatchTimeRollupSource;
  sessionCount: number;
  validSessionCount: number;
  latestWatchAt: number;
  issues: WatchTimeRollupIssue[];
  diagnosticEstimate: import("@/lib/behavioral/watch-time-estimation").WatchTimeDiagnosticEstimate | null;
  legacyPageDurationMs: number;
};

export function normalizeWatchTimeRollupSource(source: unknown): WatchTimeRollupSource {
  return source === "watch_session_rollup" || source === "legacy_page_duration" || source === "unavailable"
    ? source
    : "unavailable";
}

export function isVerifiedWatchTimeRollupSource(source: unknown) {
  return normalizeWatchTimeRollupSource(source) === "watch_session_rollup";
}

export function isLegacyWatchTimeRollupSource(source: unknown) {
  return normalizeWatchTimeRollupSource(source) === "legacy_page_duration";
}

export function buildWatchTimeRollupBehaviorInput(input: {
  source: unknown;
  watchTimeMs?: number;
  watchSecondsTotal?: number;
}) {
  const source = normalizeWatchTimeRollupSource(input.source);
  const watchTimeMs = typeof input.watchTimeMs === "number" && Number.isFinite(input.watchTimeMs)
    ? Math.max(0, Math.round(input.watchTimeMs))
    : 0;
  const watchSecondsTotal = typeof input.watchSecondsTotal === "number" && Number.isFinite(input.watchSecondsTotal)
    ? Math.max(0, Math.round(input.watchSecondsTotal))
    : 0;

  return {
    watchTimeMs: source === "watch_session_rollup" ? watchTimeMs : undefined,
    watchSecondsTotal: source === "legacy_page_duration" ? watchSecondsTotal : undefined,
    hasWatchSessions: source === "watch_session_rollup",
    hasLegacyPageDuration: source === "legacy_page_duration",
  };
}
