import type { NotificationPermissionState } from "@/lib/notifications/notification-permission-contract";

export type PushTokenStatus =
  | "missing"
  | "registering"
  | "registered"
  | "refreshed"
  | "revoked"
  | "failed"
  | "unsupported";

export type PushTokenScope = "user_device" | "guest_device" | "unknown";

export type PushTokenLifecycleEvent =
  | "push_token_registration_started"
  | "push_token_registered"
  | "push_token_registration_failed"
  | "push_token_refreshed"
  | "push_token_revoked"
  | "push_device_scope_resolved";

export const PUSH_TOKEN_TELEMETRY_EVENTS: PushTokenLifecycleEvent[] = [
  "push_token_registration_started",
  "push_token_registered",
  "push_token_registration_failed",
  "push_token_refreshed",
  "push_token_revoked",
  "push_device_scope_resolved",
];

export const PUSH_TOKEN_DEVICE_ID_PREFIX = "kandydrops_push_device";
export const PUSH_TOKEN_STALE_AFTER_MS = 45 * 24 * 60 * 60 * 1000;

export type PushTokenRegistrationInput = {
  token?: string | null;
  deviceId?: string | null;
  permissionState?: NotificationPermissionState;
  browser?: string | null;
  platform?: string | null;
  standalone?: boolean;
  userAuthenticated?: boolean;
  nowIso?: string;
};

export type PushTokenRegistrationPayload = {
  token: string | null;
  deviceId: string;
  permissionState: NotificationPermissionState;
  browser: string;
  platform: string;
  standalone: boolean;
  userAuthenticated: boolean;
  lastRegisteredAt: string | null;
  lastRefreshAt: string | null;
  tokenRedacted: string;
};

export type PushTokenRegistrationStatus = {
  tokenStatus: PushTokenStatus;
  tokenScope: PushTokenScope;
  safeToTargetNotifications: boolean;
  deviceId: string;
  permissionState: NotificationPermissionState;
  tokenRedacted: string;
  failureReason: string | null;
};

export type PushTokenDebugLane = {
  lane: "Push token health";
  label: "Push token health";
  status: "live" | "degraded" | "unavailable";
  registeredUsers: number;
  registeredDevices: number;
  failedRegistrations: number;
  unsupportedBrowsers: number;
  staleTokens: number;
  rawTokenExposureCount: number;
  telemetryStatus: "mapped" | "missing";
  rawDetailsCollapsedByDefault: true;
};

function cleanTokenPart(value: string) {
  return value.trim().replace(/\s+/gu, "");
}

export function normalizePushToken(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const token = cleanTokenPart(value);
  if (token.length < 32 || token.length > 4096) return null;
  return token;
}

export function redactPushToken(value: unknown) {
  const token = normalizePushToken(value);
  if (!token) return "[push-token:missing]";
  return `[push-token:redacted:${token.length}]`;
}

export function resolvePushDeviceId(value: unknown) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9:_-]+/gu, "_")
    .replace(/_+/gu, "_")
    .replace(/^_+|_+$/gu, "")
    .slice(0, 96);

  return normalized || `${PUSH_TOKEN_DEVICE_ID_PREFIX}:unknown`;
}

export function buildPushTokenRegistrationPayload(input: PushTokenRegistrationInput): PushTokenRegistrationPayload {
  const token = normalizePushToken(input.token);
  return {
    token,
    deviceId: resolvePushDeviceId(input.deviceId),
    permissionState: input.permissionState ?? "unknown",
    browser: String(input.browser ?? "unknown").slice(0, 80),
    platform: String(input.platform ?? "unknown").slice(0, 80),
    standalone: input.standalone === true,
    userAuthenticated: input.userAuthenticated !== false,
    lastRegisteredAt: input.nowIso ?? null,
    lastRefreshAt: null,
    tokenRedacted: redactPushToken(token),
  };
}

export function classifyPushTokenRegistration(input: PushTokenRegistrationPayload): PushTokenRegistrationStatus {
  if (!input.userAuthenticated) {
    return {
      tokenStatus: "failed",
      tokenScope: "unknown",
      safeToTargetNotifications: false,
      deviceId: input.deviceId,
      permissionState: input.permissionState,
      tokenRedacted: input.tokenRedacted,
      failureReason: "authenticated_user_required",
    };
  }

  if (input.permissionState === "unsupported" || input.permissionState === "blocked_by_context") {
    return {
      tokenStatus: "unsupported",
      tokenScope: "user_device",
      safeToTargetNotifications: false,
      deviceId: input.deviceId,
      permissionState: input.permissionState,
      tokenRedacted: input.tokenRedacted,
      failureReason: input.permissionState,
    };
  }

  if (input.permissionState !== "granted") {
    return {
      tokenStatus: "missing",
      tokenScope: "user_device",
      safeToTargetNotifications: false,
      deviceId: input.deviceId,
      permissionState: input.permissionState,
      tokenRedacted: input.tokenRedacted,
      failureReason: "permission_not_granted",
    };
  }

  if (!input.token) {
    return {
      tokenStatus: "failed",
      tokenScope: "user_device",
      safeToTargetNotifications: false,
      deviceId: input.deviceId,
      permissionState: input.permissionState,
      tokenRedacted: input.tokenRedacted,
      failureReason: "token_missing",
    };
  }

  return {
    tokenStatus: "registered",
    tokenScope: "user_device",
    safeToTargetNotifications: true,
    deviceId: input.deviceId,
    permissionState: input.permissionState,
    tokenRedacted: input.tokenRedacted,
    failureReason: null,
  };
}

export function buildPushTokenDebugLane(input: {
  registeredUserCount?: number;
  registeredDeviceCount?: number;
  failedRegistrationCount?: number;
  unsupportedBrowserCount?: number;
  staleTokenCount?: number;
  rawTokenExposureCount?: number;
  telemetryMapped?: boolean;
} = {}): PushTokenDebugLane {
  const failedRegistrations = Math.max(0, input.failedRegistrationCount ?? 0);
  const unsupportedBrowsers = Math.max(0, input.unsupportedBrowserCount ?? 0);
  const staleTokens = Math.max(0, input.staleTokenCount ?? 0);
  const rawTokenExposureCount = Math.max(0, input.rawTokenExposureCount ?? 0);
  const telemetryMapped = input.telemetryMapped !== false;
  const status = !telemetryMapped || rawTokenExposureCount > 0
    ? "unavailable"
    : failedRegistrations + unsupportedBrowsers + staleTokens > 0
      ? "degraded"
      : "live";

  return {
    lane: "Push token health",
    label: "Push token health",
    status,
    registeredUsers: Math.max(0, input.registeredUserCount ?? input.registeredDeviceCount ?? 0),
    registeredDevices: Math.max(0, input.registeredDeviceCount ?? 0),
    failedRegistrations,
    unsupportedBrowsers,
    staleTokens,
    rawTokenExposureCount,
    telemetryStatus: telemetryMapped ? "mapped" : "missing",
    rawDetailsCollapsedByDefault: true,
  };
}
