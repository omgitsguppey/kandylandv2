import type { DeviceDisplayMode } from "@/lib/device-layout-contract";
import type { NotificationPermissionState } from "@/lib/notifications/notification-permission-contract";
import type { PushTokenStatus } from "@/lib/notifications/push-token-contract";

export type PwaServiceWorkerStatus =
  | "unsupported"
  | "not_registered"
  | "registering"
  | "registered"
  | "failed";

export type PwaServiceWorkerRegistrationStatus =
  | "not_attempted"
  | "started"
  | "registered"
  | "failed"
  | "unsupported";

export type PwaUpdateStatus =
  | "unknown"
  | "current"
  | "update_available"
  | "update_applied"
  | "failed";

export type PwaOfflineSupportStatus =
  | "unsupported"
  | "offline_fallback_safe"
  | "offline_fallback_missing"
  | "stale_private_truth_risk";

export type PwaNotificationCompatibility =
  | "compatible"
  | "permission_required"
  | "token_missing"
  | "unsupported"
  | "blocked_by_context";

export type PwaMobileSafeAreaImpact =
  | "contract_applied"
  | "not_mobile"
  | "unknown"
  | "risk";

export type PwaStaleShellRisk = "low" | "medium" | "high";

export type PwaServiceWorkerTelemetryEvent =
  | "pwa_service_worker_registration_started"
  | "pwa_service_worker_registered"
  | "pwa_service_worker_registration_failed"
  | "pwa_update_available"
  | "pwa_update_applied"
  | "pwa_offline_seen"
  | "pwa_install_prompt_seen"
  | "pwa_install_prompt_accepted"
  | "pwa_install_prompt_dismissed";

export const PWA_SERVICE_WORKER_TELEMETRY_EVENTS: PwaServiceWorkerTelemetryEvent[] = [
  "pwa_service_worker_registration_started",
  "pwa_service_worker_registered",
  "pwa_service_worker_registration_failed",
  "pwa_update_available",
  "pwa_update_applied",
  "pwa_offline_seen",
  "pwa_install_prompt_seen",
  "pwa_install_prompt_accepted",
  "pwa_install_prompt_dismissed",
];

export const FORBIDDEN_SERVICE_WORKER_CACHE_PATHS = [
  "/api/paypal",
  "/api/checkout",
  "/api/wallet",
  "/api/chat",
  "/api/creator/messages",
  "/api/auth",
  "/api/user",
  "/api/notifications",
  "/api/admin",
  "/__/auth",
  "/__/firebase",
  "/dashboard/chat",
  "/dashboard/library",
  "/dashboard/wallet",
  "/wallet",
  "/checkout",
  "/admin",
  "/creator/private",
] as const;

export type PwaCachePolicy = {
  strategy: "public_shell_only";
  precacheUrls: readonly string[];
  runtimeCacheAllowed: readonly string[];
  forbiddenCachePaths: typeof FORBIDDEN_SERVICE_WORKER_CACHE_PATHS;
  forbiddenCacheSafe: boolean;
  offlineFallbackShowsPrivateTruth: false;
};

export type PwaServiceWorkerSafetyInput = {
  serviceWorkerSupported?: boolean;
  registrationAttempted?: boolean;
  registered?: boolean;
  registrationFailed?: boolean;
  updateAvailable?: boolean;
  updateApplied?: boolean;
  offlineFallbackAvailable?: boolean;
  forbiddenCachePathSafe?: boolean;
  notificationPermissionState?: NotificationPermissionState;
  pushTokenStatus?: PushTokenStatus;
  displayMode?: DeviceDisplayMode;
  mobileSafeAreaContractApplied?: boolean;
  staleShellRiskSignals?: readonly string[];
};

export type PwaServiceWorkerSafetyStatus = {
  serviceWorkerStatus: PwaServiceWorkerStatus;
  registrationStatus: PwaServiceWorkerRegistrationStatus;
  updateStatus: PwaUpdateStatus;
  offlineSupportStatus: PwaOfflineSupportStatus;
  cachePolicy: PwaCachePolicy;
  notificationCompatibility: PwaNotificationCompatibility;
  standaloneMode: DeviceDisplayMode;
  mobileSafeAreaImpact: PwaMobileSafeAreaImpact;
  staleShellRisk: PwaStaleShellRisk;
  debugVisibility: "debug_visible";
};

export type PwaServiceWorkerDebugLane = {
  lane: "PWA/service worker";
  label: "PWA/service worker";
  status: "live" | "degraded" | "unavailable";
  registered: boolean;
  updateAvailable: boolean;
  notificationCompatible: boolean;
  forbiddenCacheSafe: boolean;
  offlineFallbackSafe: boolean;
  staleShellRisk: PwaStaleShellRisk;
  telemetryStatus: "mapped" | "missing";
  rawDetailsCollapsedByDefault: true;
};

const PUBLIC_SHELL_PRECACHE_URLS = [
  "/",
  "/drops",
  "/offline",
  "/manifest.json",
  "/candy-main.svg",
  "/candy-3d-glass.png",
  "/icon-192x192.png",
  "/icon-512x512.png",
] as const;

const PUBLIC_RUNTIME_CACHE_PATHS = [
  "/",
  "/drops",
  "/creators",
  "/privacy",
  "/terms",
  "/offline",
] as const;

function normalizePathname(rawPath: string | URL) {
  try {
    const parsed = rawPath instanceof URL ? rawPath : new URL(rawPath, "https://kandydrops.local");
    return parsed.pathname.toLowerCase();
  } catch {
    return String(rawPath || "/").split(/[?#]/u)[0].toLowerCase();
  }
}

export function shouldBypassServiceWorkerCache(rawPath: string | URL): boolean {
  const pathname = normalizePathname(rawPath);
  return FORBIDDEN_SERVICE_WORKER_CACHE_PATHS.some((path) =>
    pathname === path || pathname.startsWith(`${path}/`),
  );
}

export function buildPwaCachePolicy(input: { forbiddenCachePathSafe?: boolean } = {}): PwaCachePolicy {
  return {
    strategy: "public_shell_only",
    precacheUrls: PUBLIC_SHELL_PRECACHE_URLS,
    runtimeCacheAllowed: PUBLIC_RUNTIME_CACHE_PATHS,
    forbiddenCachePaths: FORBIDDEN_SERVICE_WORKER_CACHE_PATHS,
    forbiddenCacheSafe: input.forbiddenCachePathSafe !== false,
    offlineFallbackShowsPrivateTruth: false,
  };
}

function classifyServiceWorkerStatus(input: PwaServiceWorkerSafetyInput): PwaServiceWorkerStatus {
  if (input.serviceWorkerSupported === false) return "unsupported";
  if (input.registrationFailed) return "failed";
  if (input.registered) return "registered";
  if (input.registrationAttempted) return "registering";
  return "not_registered";
}

function classifyRegistrationStatus(input: PwaServiceWorkerSafetyInput): PwaServiceWorkerRegistrationStatus {
  if (input.serviceWorkerSupported === false) return "unsupported";
  if (input.registrationFailed) return "failed";
  if (input.registered) return "registered";
  if (input.registrationAttempted) return "started";
  return "not_attempted";
}

function classifyUpdateStatus(input: PwaServiceWorkerSafetyInput): PwaUpdateStatus {
  if (input.updateApplied) return "update_applied";
  if (input.updateAvailable) return "update_available";
  if (input.registered) return "current";
  return "unknown";
}

function classifyNotificationCompatibility(input: PwaServiceWorkerSafetyInput): PwaNotificationCompatibility {
  if (input.notificationPermissionState === "unsupported") return "unsupported";
  if (input.notificationPermissionState === "blocked_by_context") return "blocked_by_context";
  if (input.notificationPermissionState !== "granted") return "permission_required";
  if (input.pushTokenStatus !== "registered" && input.pushTokenStatus !== "refreshed") return "token_missing";
  return "compatible";
}

function classifyOfflineSupport(input: PwaServiceWorkerSafetyInput): PwaOfflineSupportStatus {
  if (input.serviceWorkerSupported === false) return "unsupported";
  if (input.forbiddenCachePathSafe === false) return "stale_private_truth_risk";
  return input.offlineFallbackAvailable === false ? "offline_fallback_missing" : "offline_fallback_safe";
}

function classifyMobileSafeAreaImpact(input: PwaServiceWorkerSafetyInput): PwaMobileSafeAreaImpact {
  if (input.displayMode !== "standalone-pwa" && input.displayMode !== "fullscreen") return "not_mobile";
  if (input.mobileSafeAreaContractApplied === true) return "contract_applied";
  if (input.mobileSafeAreaContractApplied === false) return "risk";
  return "unknown";
}

export function classifyPwaServiceWorkerSafety(input: PwaServiceWorkerSafetyInput = {}): PwaServiceWorkerSafetyStatus {
  const cachePolicy = buildPwaCachePolicy({ forbiddenCachePathSafe: input.forbiddenCachePathSafe });
  const staleShellRiskSignals = input.staleShellRiskSignals ?? [];
  const staleShellRisk: PwaStaleShellRisk = input.forbiddenCachePathSafe === false
    ? "high"
    : staleShellRiskSignals.length > 0 || input.updateAvailable
      ? "medium"
      : "low";

  return {
    serviceWorkerStatus: classifyServiceWorkerStatus(input),
    registrationStatus: classifyRegistrationStatus(input),
    updateStatus: classifyUpdateStatus(input),
    offlineSupportStatus: classifyOfflineSupport(input),
    cachePolicy,
    notificationCompatibility: classifyNotificationCompatibility(input),
    standaloneMode: input.displayMode ?? "unknown",
    mobileSafeAreaImpact: classifyMobileSafeAreaImpact(input),
    staleShellRisk,
    debugVisibility: "debug_visible",
  };
}

export function buildPwaServiceWorkerDebugLane(input: {
  registered?: boolean;
  updateAvailable?: boolean;
  notificationCompatible?: boolean;
  forbiddenCacheSafe?: boolean;
  offlineFallbackSafe?: boolean;
  staleShellRisk?: PwaStaleShellRisk;
  telemetryMapped?: boolean;
} = {}): PwaServiceWorkerDebugLane {
  const telemetryMapped = input.telemetryMapped !== false;
  const registered = input.registered === true;
  const forbiddenCacheSafe = input.forbiddenCacheSafe !== false;
  const offlineFallbackSafe = input.offlineFallbackSafe !== false;
  const notificationCompatible = input.notificationCompatible !== false;
  const staleShellRisk = input.staleShellRisk ?? "low";
  const status = !telemetryMapped || !forbiddenCacheSafe || staleShellRisk === "high"
    ? "unavailable"
    : !registered || !offlineFallbackSafe || !notificationCompatible || input.updateAvailable || staleShellRisk === "medium"
      ? "degraded"
      : "live";

  return {
    lane: "PWA/service worker",
    label: "PWA/service worker",
    status,
    registered,
    updateAvailable: input.updateAvailable === true,
    notificationCompatible,
    forbiddenCacheSafe,
    offlineFallbackSafe,
    staleShellRisk,
    telemetryStatus: telemetryMapped ? "mapped" : "missing",
    rawDetailsCollapsedByDefault: true,
  };
}
