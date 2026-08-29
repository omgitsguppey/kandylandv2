/**
 * Canonical maintenance-mode contract shared by the Next.js edge gate and
 * Firebase Functions. Keep this module pure: it must not import Firebase,
 * Next.js, a database client, or any other billable runtime dependency.
 */

export const MAINTENANCE_MODE_ENV = "KANDY_MAINTENANCE_MODE" as const;

export type MaintenanceModeState = "on" | "off" | "unknown";

/**
 * Parse only explicit values. Ambiguous or missing configuration is unknown
 * and must be treated as maintenance by cost-bearing/background consumers.
 */
export function resolveMaintenanceModeState(value: string | undefined): MaintenanceModeState {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "on") return "on";
  if (normalized === "0" || normalized === "false" || normalized === "off") return "off";
  return "unknown";
}

/** Fail closed for any consumer that could start paid or maintenance-incompatible work. */
export function isMaintenanceStateActive(state: MaintenanceModeState): boolean {
  return state !== "off";
}

export const MAINTENANCE_ADMIN_BOOTSTRAP_PATH = "/maintenance/admin" as const;
export const MAINTENANCE_NAVIGATION_SESSION_PATH = "/api/auth/navigation-session" as const;
export const MAINTENANCE_ADMIN_API_PATH = "/api/admin" as const;
export const MAINTENANCE_ADMIN_DROP_PREFLIGHT_PATH = "/api/drops/duplicate-filenames" as const;
export const MAINTENANCE_ADMIN_ANALYTICS_REFRESH_PATH = "/api/admin/analytics/refresh" as const;
export const MAINTENANCE_BLOCKED_ADMIN_API_PREFIXES = [
  "/api/admin/analytics",
  "/api/admin/ai",
  "/api/admin/debug/assistant",
] as const;

export function isMaintenanceBlockedAdminApiPath(pathname: string): boolean {
  return MAINTENANCE_BLOCKED_ADMIN_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Every scheduled job is disabled by the maintenance contract. */
export const MAINTENANCE_SCHEDULE_MAX_INSTANCES = 1 as const;
export const MAINTENANCE_SCHEDULE_MEMORY = "512MiB" as const;

export const MAINTENANCE_SCHEDULES = {
  refreshAdminAnalyticsRealtimeSummary: {
    sourceFile: "functions/src/analytics-realtime-summary-schedule.ts",
    schedule: "every 5 minutes",
    maxInstances: MAINTENANCE_SCHEDULE_MAX_INSTANCES,
    maintenanceAllowed: false,
  },
  reconcileAnalyticsTruthLayers: {
    sourceFile: "functions/src/analytics-truth-schedule.ts",
    schedule: "every 1 hours",
    maxInstances: MAINTENANCE_SCHEDULE_MAX_INSTANCES,
    memory: MAINTENANCE_SCHEDULE_MEMORY,
    maintenanceAllowed: false,
  },
  processQueueLifecycle: {
    sourceFile: "functions/src/index.ts",
    schedule: "every 15 minutes",
    maxInstances: MAINTENANCE_SCHEDULE_MAX_INSTANCES,
    maintenanceAllowed: false,
  },
  notifyActiveDropsLifecycle: {
    sourceFile: "functions/src/index.ts",
    schedule: "every 5 minutes",
    maxInstances: MAINTENANCE_SCHEDULE_MAX_INSTANCES,
    maintenanceAllowed: false,
  },
  buildMLFeatureProfiles: {
    sourceFile: "functions/src/profile-builder.ts",
    schedule: "every 4 hours",
    maxInstances: MAINTENANCE_SCHEDULE_MAX_INSTANCES,
    memory: MAINTENANCE_SCHEDULE_MEMORY,
    maintenanceAllowed: false,
  },
  materializeDailyTaskResetWindows: {
    sourceFile: "functions/src/daily-task-materializer.ts",
    schedule: "5 0 * * *",
    maxInstances: MAINTENANCE_SCHEDULE_MAX_INSTANCES,
    maintenanceAllowed: false,
  },
  materializeUserTrackingIndexes: {
    sourceFile: "functions/src/user-index-materializer-schedule.ts",
    schedule: "every 5 minutes",
    maxInstances: MAINTENANCE_SCHEDULE_MAX_INSTANCES,
    maintenanceAllowed: false,
  },
  scheduledBigQueryRawEventsExport: {
    sourceFile: "functions/src/analytics-bigquery-export.ts",
    schedule: "0 4 * * *",
    maxInstances: MAINTENANCE_SCHEDULE_MAX_INSTANCES,
    maintenanceAllowed: false,
  },
} as const;

export type MaintenanceScheduleKey = keyof typeof MAINTENANCE_SCHEDULES;

export const MAINTENANCE_SQL_POLICY = {
  canonicalRepoMirrorInstance: "kandydrops-db",
  canonicalRepoMirrorDatabase: "kandydrops_db",
  region: "us-central1",
  runtimeUseAllowed: false,
  computeDuringMaintenance: "stopped",
  storageDuringMaintenance: "retained",
  candidateRedundantInstance: "kandydrops-by-ikandy-instance",
} as const;
