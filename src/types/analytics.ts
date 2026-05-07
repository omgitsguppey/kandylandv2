export type AnalyticsMetricCategory = "global" | "user" | "admin" | "drop";

export type AnalyticsMetricValueType = "count" | "percent" | "seconds" | "ratio";

export type AnalyticsMetricReliability = "canonical" | "cross_source" | "directional";

export type AnalyticsMetricStatus = "healthy" | "partial" | "empty";

export interface AnalyticsEventFactRecord {
  eventId?: string;
  eventName?: string;
  rawEventName?: string;
  normalizedAction?: string;
  normalizedActionName?: string;
  pagePath?: string;
  route?: string;
  source_component?: string;
  sourceTruth?: string;
  confidence?: number;
  sessionId?: string;
  userId?: string;
  username?: string;
  timestamp?: number;
  dropId?: string;
  dropCategory?: string;
  durationMs?: number;
  watchSeconds?: number;
  sessionWatchSeconds?: number;
  params?: Record<string, unknown>;
}

export interface AnalyticsGuestEventRecord {
  type?: string;
  timestamp?: number;
  path?: string;
  targetId?: string;
  targetTag?: string;
  targetText?: string;
  dropId?: string;
  dropCategory?: string;
  scrollDepthPercent?: number;
  durationMs?: number;
  interactionState?: string;
  exitIntent?: string;
  clickCount?: number;
  hoverCount?: number;
  scrollCount?: number;
}

export interface AnalyticsGuestBatchRecord {
  sessionKey?: string;
  clientSessionId?: string;
  receivedAtMs?: number;
  events?: AnalyticsGuestEventRecord[];
}

export interface AnalyticsSessionFactRecord {
  sessionId?: string;
  userId?: string;
  username?: string;
  dropId?: string;
  pagePath?: string;
  startedCount?: number;
  completedCount?: number;
  watchSecondsTotal?: number;
  validWatchMs?: number;
  watchScoreSource?: "watch_session_rollup" | "legacy_page_duration";
  firstEventAtMs?: number;
  lastEventAtMs?: number;
}

export interface AnalyticsMetricDefinition {
  key: string;
  label: string;
  shortLabel: string;
  category: AnalyticsMetricCategory;
  valueType: AnalyticsMetricValueType;
  reliability: AnalyticsMetricReliability;
  description: string;
  referenceModel: string;
  formula: string;
  sources: string[];
}

export interface AnalyticsMetricResult extends AnalyticsMetricDefinition {
  value: number;
  formattedValue: string;
  status: AnalyticsMetricStatus;
  sampleSize: number;
  supportingValues: Record<string, number>;
}

export interface AnalyticsMetricCategoryGroup {
  key: AnalyticsMetricCategory;
  label: string;
  metrics: AnalyticsMetricResult[];
}
