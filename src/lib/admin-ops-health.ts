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
}

export interface AdminOpsHealthDiagnosticCluster {
  id: string;
  fingerprint: string;
  severity: AdminOpsHealthSeverity;
  count: number;
  lastSeenAt: number;
  source: string;
  sourceRouteOrComponent: string;
  message: string;
  suggestedValidator: string;
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
  recentErrorCount: number;
  recentWarnCount: number;
  lastSeenAt: number;
}

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
}

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
