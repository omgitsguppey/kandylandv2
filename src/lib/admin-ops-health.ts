export type AdminOpsHealthStatus = "healthy" | "warn" | "fail";
export type AdminOpsHealthSeverity = "info" | "warn" | "error";

export interface AdminOpsHealthRuntime {
  gaPropertyConfigured: boolean;
  vapidConfigured: boolean;
  databaseUrlConfigured: boolean;
  projectId: string;
  navigationSessionSigningReady: boolean;
  warnings: string[];
}

export interface AdminOpsHealthDiagnosticItem {
  id: string;
  channel: string;
  severity: AdminOpsHealthSeverity;
  message: string;
  timestamp: number;
  detailPreview: string;
  route?: string;
  component?: string;
  routeContext?: string;
  errorName?: string;
}

export interface AdminOpsHealthDiagnosticCluster {
  id: string;
  fingerprint: string;
  severity: AdminOpsHealthSeverity;
  count: number;
  firstSeenAt: number;
  lastSeenAt: number;
  firstSeenAtUtc: string | null;
  lastSeenAtUtc: string | null;
  source: string;
  sourceRouteOrComponent: string;
  routeContext?: string;
  errorName?: string;
  message: string;
  suggestedValidator: string;
  suggestedAction: string;
  eventIds: string[];
}

export interface AdminOpsHealthChannelItem {
  key: string;
  label: string;
  count: number;
  errorCount: number;
  warnCount: number;
  infoCount: number;
  activeErrorCount: number;
  activeWarnCount: number;
  activeInfoCount: number;
  recentErrorCount: number;
  recentWarnCount: number;
  recentInfoCount: number;
  lastSeenAt: number;
  truth: DiagnosticChannelTruth;
}

export type DiagnosticChannelTruth = {
  channel: string;
  lastSeenAtUtc: string | null;
  freshnessState: "live" | "stale" | "expired" | "unknown";
  currentWindow: {
    windowMs: number;
    errors: number;
    warns: number;
    info: number;
    state: "live" | "review" | "error" | "empty";
  };
  recentWindow: {
    windowMs: number;
    errors: number;
    warns: number;
    info: number;
    state: "live" | "review" | "error" | "empty";
  };
  loadedSample: {
    sampleSize: number;
    errors: number;
    warns: number;
    info: number;
    state: "clean_sample" | "sample_has_history" | "sample_error_history" | "empty_sample";
  };
  overallState: "live" | "review" | "stale" | "error";
  explanation: string;
};

export interface AdminOpsHealthDiagnostics {
  total: number;
  errorCount: number;
  warnCount: number;
  infoCount: number;
  activeErrorCount: number;
  activeWarnCount: number;
  recentErrorCount: number;
  recentWarnCount: number;
  activeIssueClusterCount: number;
  recentIssueClusterCount: number;
  activeWindowMs: number;
  recentWindowMs: number;
  lastDiagnosticAt: number;
  channels: AdminOpsHealthChannelItem[];
  recent: AdminOpsHealthDiagnosticItem[];
  activeIssueClusters?: AdminOpsHealthDiagnosticCluster[];
  recentClusters?: AdminOpsHealthDiagnosticCluster[];
}

export interface AdminOpsHealthPipelineRoute {
  routeKey: string;
  label: string;
  count: number;
}

export interface AdminOpsHealthPipeline {
  status: AdminOpsHealthStatus;
  failureCount: number;
  activeFailureCount: number;
  recentFailureCount: number;
  sampleFailureCount: number;
  lastFailureAt: number;
  lastRouteName: string;
  lastErrorMessage: string;
  activeWindowMs: number;
  recentWindowMs: number;
  routes: AdminOpsHealthPipelineRoute[];
}

export interface AdminOpsHealthMaterializerItem {
  key: string;
  label: string;
  engine: string;
  status: AdminOpsHealthStatus;
  count: number;
  lastSeenAt: number;
  ageMs?: number | null;
  detail: string;
  truth: DownstreamWriterTruth;
}

export type DownstreamWriterTruth = {
  id: string;
  label: string;
  lane: "functions" | "route" | "warehouse" | "system";
  tracked: boolean;
  count: number;
  lastSeenAtUtc: string | null;
  expectedActivity: "continuous" | "traffic_dependent" | "scheduled" | "optional";
  freshnessState: "live" | "quiet" | "stale" | "expired" | "unknown";
  errorState: "healthy" | "warn" | "error";
  displayState: "live" | "quiet" | "review" | "stale" | "error" | "unknown";
  explanation: string;
};

export interface AdminOpsHealthMaterializerSummary {
  total: number;
  healthy: number;
  warn: number;
  fail: number;
}

export interface AdminOpsHealthCanonicalState {
  status: "Live" | "Degraded" | "Partial" | "Unavailable";
  reason?: string;
}

export interface AdminOpsHealthScorePenalty {
  id: string;
  label: string;
  points: number;
  source: string;
  truthState: "failed" | "degraded";
}

export interface AdminOpsHealth {
  score: number;
  scorePenalties?: AdminOpsHealthScorePenalty[];
  canonicalState: AdminOpsHealthCanonicalState;
  runtime: AdminOpsHealthRuntime;
  diagnostics: AdminOpsHealthDiagnostics;
  pipeline: AdminOpsHealthPipeline;
  materializers: AdminOpsHealthMaterializerItem[];
  materializerSummary?: AdminOpsHealthMaterializerSummary;
}
