import type { NotificationPermissionState } from "@/lib/notifications/notification-permission-contract";
import {
  consentAllowsNotificationIntent,
  getNotificationIntentContract,
  type NotificationIntentContract,
  type NotificationIntentType,
} from "@/lib/notifications/notification-intent-contract";
import type { ConsentMode } from "@/lib/privacy/consent-tracking-policy";

export type CreatorAudienceSetting =
  | "followers"
  | "fan_pass_subscribers"
  | "followers_and_subscribers"
  | "disabled"
  | "unknown";

export type NotificationTargetingBlockReason =
  | "blocked_missing_recipient"
  | "blocked_sender_is_recipient"
  | "blocked_permission_not_granted"
  | "blocked_missing_token"
  | "blocked_by_opt_out"
  | "blocked_by_consent"
  | "blocked_by_creator_audience_setting"
  | "blocked_task_not_eligible"
  | "blocked_audience_source_missing";

export type NotificationTargetingSettings = {
  browserPushEnabled?: boolean;
  newDropAlerts?: boolean;
  expiringSoonAlerts?: boolean;
  dropActivityAlerts?: boolean;
  creatorBroadcasts?: boolean;
  fanPassUpdates?: boolean;
  chatNotifications?: boolean;
  dailyTaskReminders?: boolean;
  walletUpdates?: boolean;
  securityAlerts?: boolean;
  supportUpdates?: boolean;
};

export type NotificationTargetingDryRunInput = {
  intentType: NotificationIntentType;
  actorUserId?: string | null;
  actorCreatorId?: string | null;
  recipientUserId?: string | null;
  notificationSettings?: NotificationTargetingSettings;
  permissionState?: NotificationPermissionState;
  hasPushToken?: boolean;
  consentMode?: ConsentMode;
  creatorAudienceSetting?: CreatorAudienceSetting;
  taskEligible?: boolean | null;
  audienceSourceExists?: boolean;
  nowMs?: number;
};

export type NotificationTargetingDryRunResult = {
  intentType: NotificationIntentType;
  allowed: boolean;
  blockedBy: NotificationTargetingBlockReason[];
  contract: NotificationIntentContract;
  audienceSourceStatus: "available" | "missing" | "recipient_only" | "creator_audience_blocked" | "task_ineligible";
  deliveryIntentTruth: "dry_run_only_no_provider_send";
  providerSendAttempted: false;
  dedupeKeyTemplate: string;
  throttleCooldownMs: number;
  telemetryEvents: string[];
  debugVisible: boolean;
  evaluatedAtMs: number;
};

function readOptIn(
  settings: NotificationTargetingSettings,
  contract: NotificationIntentContract,
) {
  if (settings.browserPushEnabled !== true) return false;

  switch (contract.optInRequirement) {
    case "new_drop_alerts_enabled":
      return settings.newDropAlerts !== false;
    case "expiring_drop_alerts_enabled":
      return settings.expiringSoonAlerts !== false;
    case "drop_activity_alerts_enabled":
      return settings.dropActivityAlerts !== false;
    case "creator_broadcasts_enabled":
      return settings.creatorBroadcasts !== false;
    case "fan_pass_updates_enabled":
      return settings.fanPassUpdates !== false;
    case "chat_notifications_enabled":
      return settings.chatNotifications !== false;
    case "daily_task_reminders_enabled":
      return settings.dailyTaskReminders !== false;
    case "wallet_updates_enabled":
      return settings.walletUpdates !== false;
    case "security_alerts_enabled":
      return settings.securityAlerts !== false;
    case "support_updates_enabled":
      return settings.supportUpdates !== false;
    case "browser_push_enabled":
      return true;
  }
}

function creatorAudienceAllows(input: NotificationTargetingDryRunInput) {
  const setting = input.creatorAudienceSetting ?? "unknown";
  if (setting === "disabled") return false;
  if (setting === "unknown") return input.audienceSourceExists !== false;
  return true;
}

export function resolveNotificationTargetingDryRun(
  input: NotificationTargetingDryRunInput,
): NotificationTargetingDryRunResult {
  const contract = getNotificationIntentContract(input.intentType);
  const settings = input.notificationSettings ?? {};
  const blockedBy: NotificationTargetingBlockReason[] = [];
  let audienceSourceStatus: NotificationTargetingDryRunResult["audienceSourceStatus"] = "available";

  if (!input.recipientUserId?.trim()) {
    blockedBy.push("blocked_missing_recipient");
  }

  if (
    (input.intentType === "chat_message" || input.intentType === "chat_paid_gd_gate")
    && input.actorUserId?.trim()
    && input.actorUserId.trim() === input.recipientUserId?.trim()
  ) {
    blockedBy.push("blocked_sender_is_recipient");
    audienceSourceStatus = "recipient_only";
  }

  if (input.permissionState !== "granted") {
    blockedBy.push("blocked_permission_not_granted");
  }

  if (input.hasPushToken !== true) {
    blockedBy.push("blocked_missing_token");
  }

  if (!readOptIn(settings, contract)) {
    blockedBy.push("blocked_by_opt_out");
  }

  if (!consentAllowsNotificationIntent(contract.consentRequirement, input.consentMode ?? "unknown")) {
    blockedBy.push("blocked_by_consent");
  }

  if (input.audienceSourceExists === false) {
    blockedBy.push("blocked_audience_source_missing");
    audienceSourceStatus = "missing";
  }

  if (input.intentType === "creator_broadcast" && !creatorAudienceAllows(input)) {
    blockedBy.push("blocked_by_creator_audience_setting");
    audienceSourceStatus = "creator_audience_blocked";
  }

  if (
    (input.intentType === "daily_task_available" || input.intentType === "daily_task_streak")
    && input.taskEligible !== true
  ) {
    blockedBy.push("blocked_task_not_eligible");
    audienceSourceStatus = "task_ineligible";
  }

  return {
    intentType: input.intentType,
    allowed: blockedBy.length === 0,
    blockedBy: [...new Set(blockedBy)],
    contract,
    audienceSourceStatus,
    deliveryIntentTruth: "dry_run_only_no_provider_send",
    providerSendAttempted: false,
    dedupeKeyTemplate: contract.dedupeKeyTemplate,
    throttleCooldownMs: contract.throttleCooldownMs,
    telemetryEvents: contract.telemetryEvents,
    debugVisible: contract.debugVisibility.status === "debug_visible",
    evaluatedAtMs: input.nowMs ?? Date.now(),
  };
}

export function buildNotificationTargetingSummary(
  results: readonly NotificationTargetingDryRunResult[],
) {
  return {
    evaluatedIntents: results.length,
    dryRunEligible: results.filter((result) => result.allowed).length,
    blockedByOptOut: results.filter((result) => result.blockedBy.includes("blocked_by_opt_out")).length,
    blockedByMissingToken: results.filter((result) => result.blockedBy.includes("blocked_missing_token")).length,
    blockedByConsent: results.filter((result) => result.blockedBy.includes("blocked_by_consent")).length,
    missingAudienceSource: results.filter((result) => result.blockedBy.includes("blocked_audience_source_missing")).length,
    providerSendAttempted: false,
  };
}
