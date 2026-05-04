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
