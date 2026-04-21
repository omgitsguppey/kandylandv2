export const ANALYTICS_TRUTH_COLLECTIONS = {
  globalMetrics: "analytics_truth_global_metrics",
  dropMetrics: "analytics_truth_drop_metrics",
  userMetrics: "analytics_truth_user_metrics",
  sessionMetrics: "analytics_truth_session_metrics",
  repairs: "analytics_truth_repairs",
  status: "analytics_truth_status",
} as const

export const ANALYTICS_TRUTH_WINDOW_MS = 45 * 24 * 60 * 60 * 1000
export const ANALYTICS_TRUTH_STALE_SESSION_MS = 10 * 60 * 1000
export const ANALYTICS_TRUTH_FINALIZE_AFTER_MS = 6 * 60 * 60 * 1000
export const ANALYTICS_TRUTH_MAX_EVENT_LIMIT = 12000
export const ANALYTICS_TRUTH_MAX_WATCH_SESSION_LIMIT = 6000
export const ANALYTICS_TRUTH_MAX_WATCH_ASSET_LIMIT = 12000
export const ANALYTICS_TRUTH_MAX_WATCH_OBSERVATION_LIMIT = 12000
export const ANALYTICS_TRUTH_MAX_USER_WRITES = 800
export const ANALYTICS_TRUTH_MAX_DROP_WRITES = 800
export const ANALYTICS_TRUTH_MAX_SESSION_WRITES = 2000
export const ANALYTICS_TRUTH_MAX_REPAIR_WRITES = 2000

export type AnalyticsTruthLabel =
  | "live"
  | "provisional"
  | "validated"
  | "finalized"
  | "estimated"
  | "stale"
  | "partial"
  | "failed"
  | "unknown"

