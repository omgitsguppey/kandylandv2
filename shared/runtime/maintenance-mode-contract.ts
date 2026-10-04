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
/** Public brand/build assets only. Never exempt an arbitrary file extension. */
export const MAINTENANCE_PUBLIC_ASSET_PATHS = [
  "/candy-main.svg", "/logo-k-monogram.png", "/candy-3d-glass.png", "/icon-192x192.png", "/icon-512x512.png",
  "/kandydrops-release-notes.json",
] as const;

/** Reviewed GET owners retain their auth, bounded queries, rate limits and cache contracts. */
export const MAINTENANCE_ADMIN_BROWSE_READ_PATHS = [
  "/api/drops", "/api/drops/recommendations", "/api/creator/discovery",
  "/api/user/profile", "/api/user/activity", "/api/notifications", "/api/wallet/packages",
  "/api/chat/threads",
] as const;

export function isMaintenancePublicAssetRequest(pathname: string, method: string): boolean {
  return (method === "GET" || method === "HEAD")
    && MAINTENANCE_PUBLIC_ASSET_PATHS.some((asset) => asset === pathname);
}

export function isMaintenanceAdminBrowseRequest(pathname: string, method: string): boolean {
  if (method !== "GET" && method !== "HEAD") return false;
  if (pathname !== "/api" && !pathname.startsWith("/api/")) return true;
  return MAINTENANCE_ADMIN_BROWSE_READ_PATHS.some((route) => route === pathname)
    || /^\/api\/creators\/[A-Za-z0-9_.-]+$/u.test(pathname)
    || /^\/api\/chat\/threads\/[A-Za-z0-9_-]+$/u.test(pathname);
}

/** A return destination requests re-verification; it never grants maintenance access. */
export function resolveMaintenanceAdminReturnPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020\u007f]/u.test(value)) return "/admin";
  try {
    const url = new URL(value, "https://maintenance.invalid");
    const pathname = decodeURIComponent(url.pathname);
    if (url.origin !== "https://maintenance.invalid" || pathname.startsWith("//")
      || /[\\%\u0000-\u0020\u007f]/u.test(pathname)
      || pathname === "/maintenance" || pathname.startsWith("/maintenance/")
      || pathname === "/api" || pathname.startsWith("/api/")) return "/admin";
    return url.pathname + url.search;
  } catch {
    return "/admin";
  }
}
export const MAINTENANCE_BLOCKED_ADMIN_API_PREFIXES = [
  "/api/admin/analytics",
  "/api/admin/ai",
  "/api/admin/debug/assistant",
] as const;

export function isMaintenanceBlockedAdminApiPath(pathname: string, method?: string): boolean {
  // This exact GET reads a stored snapshot; POST/materialization remains blocked.
  if (pathname === MAINTENANCE_ADMIN_ANALYTICS_REFRESH_PATH && method === "GET") return false;
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
