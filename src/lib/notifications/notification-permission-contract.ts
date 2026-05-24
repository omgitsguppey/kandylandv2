export type NotificationPermissionState =
  | "unknown"
  | "default"
  | "granted"
  | "denied"
  | "unsupported"
  | "blocked_by_context";

export type NotificationPromptStatus =
  | "eligible"
  | "shown"
  | "dismissed"
  | "accepted"
  | "denied"
  | "failed"
  | "snoozed"
  | "unavailable";

export type NotificationPromptUserScope = "guest" | "signed_in" | "linked_person";

export type NotificationPromptFeatureSource =
  | "dashboard"
  | "daily_task"
  | "drops"
  | "chat"
  | "broadcast"
  | "profile";

export type NotificationPromptLifecycleEvent =
  | "notification_prompt_eligible"
  | "notification_prompt_viewed"
  | "notification_prompt_dismissed"
  | "notification_permission_requested"
  | "notification_permission_granted"
  | "notification_permission_denied"
  | "notification_permission_failed"
  | "notification_prompt_snoozed"
  | "notification_prompt_blocked";

export const NOTIFICATION_PERMISSION_PROMPT_EVENTS: NotificationPromptLifecycleEvent[] = [
  "notification_prompt_eligible",
  "notification_prompt_viewed",
  "notification_prompt_dismissed",
  "notification_permission_requested",
  "notification_permission_granted",
  "notification_permission_denied",
  "notification_permission_failed",
  "notification_prompt_snoozed",
  "notification_prompt_blocked",
];

export const NOTIFICATION_PROMPT_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
export const NOTIFICATION_PROMPT_VIEW_DELAY_MS = 2500;
export const NOTIFICATION_PROMPT_RETRY_POLICY = {
  retryPolicy: "retry_after_snooze_only",
  maxPromptAttemptsPerCooldown: 1,
  userActionRequired: true,
} as const;

export type NotificationPermissionStateInput = {
  browserCapable?: boolean;
  messagingSupported?: boolean;
  needsStandaloneInstall?: boolean;
  permission?: NotificationPermission | "unsupported" | "unknown";
};

export type NotificationPermissionStateResult = {
  permissionState: NotificationPermissionState;
  browserCapable: boolean;
  messagingSupported: boolean;
  needsStandaloneInstall: boolean;
  canRequestPermission: boolean;
  blockedReason: "unsupported" | "denied" | "standalone_required" | "context_blocked" | null;
};

export type NotificationPromptCooldownInput = {
  nowMs: number;
  dismissedAtMs?: number | null;
  snoozedUntilMs?: number | null;
  retryCount?: number | null;
};

export type NotificationPromptCooldown = {
  active: boolean;
  dismissedAtMs: number | null;
  snoozedUntilMs: number | null;
  retryCount: number;
  remainingMs: number;
};

export type NotificationPromptStatusInput = {
  permission: NotificationPermissionStateResult;
  hasNotificationsEnabled: boolean;
  cooldown: NotificationPromptCooldown;
  userScope: NotificationPromptUserScope;
};

export type NotificationPermissionDebugLane = {
  lane: "Notification permission";
  label: "Notification permission";
  status: "live" | "degraded" | "unavailable";
  promptEligible: number;
  promptShown: number;
  granted: number;
  denied: number;
  failed: number;
  unsupportedBrowser: number;
  cooldownActive: number;
  snoozed: number;
  telemetryStatus: "mapped" | "missing";
  rawDetailsCollapsedByDefault: true;
};

export function classifyNotificationPermissionState(input: NotificationPermissionStateInput): NotificationPermissionStateResult {
  const browserCapable = input.browserCapable === true;
  const messagingSupported = input.messagingSupported === true;
  const needsStandaloneInstall = input.needsStandaloneInstall === true;
  const permission = input.permission ?? "unknown";

  if (!browserCapable || permission === "unsupported") {
    return {
      permissionState: "unsupported",
      browserCapable,
      messagingSupported,
      needsStandaloneInstall,
      canRequestPermission: false,
      blockedReason: "unsupported",
    };
  }

  if (needsStandaloneInstall) {
    return {
      permissionState: "blocked_by_context",
      browserCapable,
      messagingSupported,
      needsStandaloneInstall,
      canRequestPermission: false,
      blockedReason: "standalone_required",
    };
  }

  if (permission === "denied") {
    return {
      permissionState: "denied",
      browserCapable,
      messagingSupported,
      needsStandaloneInstall,
      canRequestPermission: false,
      blockedReason: "denied",
    };
  }

  if (permission === "granted") {
    return {
      permissionState: "granted",
      browserCapable,
      messagingSupported,
      needsStandaloneInstall,
      canRequestPermission: false,
      blockedReason: messagingSupported ? null : "context_blocked",
    };
  }

  return {
    permissionState: permission === "default" ? "default" : "unknown",
    browserCapable,
    messagingSupported,
    needsStandaloneInstall,
    canRequestPermission: permission === "default",
    blockedReason: null,
  };
}

export function resolveNotificationPromptCooldown(input: NotificationPromptCooldownInput): NotificationPromptCooldown {
  const dismissedAtMs = typeof input.dismissedAtMs === "number" && Number.isFinite(input.dismissedAtMs)
    ? input.dismissedAtMs
    : null;
  const snoozedUntilMs = typeof input.snoozedUntilMs === "number" && Number.isFinite(input.snoozedUntilMs)
    ? input.snoozedUntilMs
    : dismissedAtMs === null
      ? null
      : dismissedAtMs + NOTIFICATION_PROMPT_COOLDOWN_MS;
  const remainingMs = Math.max(0, (snoozedUntilMs ?? 0) - input.nowMs);

  return {
    active: remainingMs > 0,
    dismissedAtMs,
    snoozedUntilMs,
    retryCount: Math.max(0, Math.floor(input.retryCount ?? 0)),
    remainingMs,
  };
}

export function classifyNotificationPromptStatus(input: NotificationPromptStatusInput): {
  status: NotificationPromptStatus;
  reason: string;
} {
  if (input.userScope === "guest") {
    return { status: "unavailable", reason: "notification prompt requires a signed-in user." };
  }
  if (input.hasNotificationsEnabled || input.permission.permissionState === "granted") {
    return { status: "accepted", reason: "browser notification permission or push enrollment is already present." };
  }
  if (input.permission.permissionState === "denied") {
    return { status: "unavailable", reason: "browser permission is denied and cannot be prompted again by the app." };
  }
  if (input.permission.permissionState === "unsupported" || input.permission.permissionState === "blocked_by_context") {
    return { status: "unavailable", reason: input.permission.blockedReason ?? "notification prompt is blocked by browser context." };
  }
  if (input.cooldown.active) {
    return { status: "snoozed", reason: "prompt dismissal cooldown is active." };
  }
  if (input.permission.permissionState === "default") {
    return { status: "eligible", reason: "browser permission is default and the user can choose from the prompt." };
  }
  return { status: "unavailable", reason: "browser permission state is unknown." };
}

export function shouldShowNotificationPrompt(input: NotificationPromptStatusInput) {
  return classifyNotificationPromptStatus(input).status === "eligible";
}

export function buildNotificationPermissionDebugLane(input: {
  eligibleCount?: number;
  viewedCount?: number;
  grantedCount?: number;
  deniedCount?: number;
  failedCount?: number;
  unsupportedCount?: number;
  cooldownActiveCount?: number;
  snoozedCount?: number;
  telemetryMapped?: boolean;
} = {}): NotificationPermissionDebugLane {
  const failed = Math.max(0, input.failedCount ?? 0);
  const unsupported = Math.max(0, input.unsupportedCount ?? 0);
  const telemetryMapped = input.telemetryMapped !== false;

  return {
    lane: "Notification permission",
    label: "Notification permission",
    status: telemetryMapped ? failed > 0 ? "degraded" : "live" : "unavailable",
    promptEligible: Math.max(0, input.eligibleCount ?? 0),
    promptShown: Math.max(0, input.viewedCount ?? 0),
    granted: Math.max(0, input.grantedCount ?? 0),
    denied: Math.max(0, input.deniedCount ?? 0),
    failed,
    unsupportedBrowser: unsupported,
    cooldownActive: Math.max(0, input.cooldownActiveCount ?? 0),
    snoozed: Math.max(0, input.snoozedCount ?? 0),
    telemetryStatus: telemetryMapped ? "mapped" : "missing",
    rawDetailsCollapsedByDefault: true,
  };
}
