export type AdminOpsHealthStatus = "healthy" | "warn" | "fail";
export type AdminOpsHealthSeverity = "info" | "warn" | "error";

export interface AdminOpsHealthRuntime {
  gaPropertyConfigured: boolean;
  appCheckConfigured: boolean;
  appCheckRequired: boolean;
  recaptchaConfigured: boolean;
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
}

export interface AdminOpsHealthChannelItem {
  key: string;
  label: string;
  count: number;
  errorCount: number;
  warnCount: number;
  infoCount: number;
  lastSeenAt: number;
}

export interface AdminOpsHealthDiagnostics {
  total: number;
  errorCount: number;
  warnCount: number;
  infoCount: number;
  lastDiagnosticAt: number;
  channels: AdminOpsHealthChannelItem[];
  recent: AdminOpsHealthDiagnosticItem[];
}

export interface AdminOpsHealthPipelineRoute {
  routeKey: string;
  label: string;
  count: number;
}

export interface AdminOpsHealthPipeline {
  failureCount: number;
  lastFailureAt: number;
  lastRouteName: string;
  lastErrorMessage: string;
  routes: AdminOpsHealthPipelineRoute[];
}

export interface AdminOpsHealthMaterializerItem {
  key: string;
  label: string;
  engine: string;
  status: AdminOpsHealthStatus;
  count: number;
  lastSeenAt: number;
  detail: string;
}

export interface AdminOpsHealth {
  score: number;
  runtime: AdminOpsHealthRuntime;
  diagnostics: AdminOpsHealthDiagnostics;
  pipeline: AdminOpsHealthPipeline;
  materializers: AdminOpsHealthMaterializerItem[];
}
