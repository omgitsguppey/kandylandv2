import type { ConsentMode } from "@/lib/privacy/consent-tracking-policy";

export type NotificationIntentType =
  | "drop_live"
  | "drop_expiring"
  | "drop_unwrapped"
  | "creator_broadcast"
  | "fan_pass_update"
  | "chat_message"
  | "chat_paid_gd_gate"
  | "daily_task_available"
  | "daily_task_streak"
  | "wallet_payment_success"
  | "system_security"
  | "support_update";

export type NotificationAudienceSource =
  | "global_drop_audience"
  | "drop_unwrapper"
  | "creator_followers_or_subscribers"
  | "fan_pass_subscribers"
  | "chat_thread_recipient"
  | "daily_task_eligible_users"
  | "wallet_account_owner"
  | "system_account_owner"
  | "support_thread_participant";

export type NotificationOptInRequirement =
  | "browser_push_enabled"
  | "new_drop_alerts_enabled"
  | "expiring_drop_alerts_enabled"
  | "drop_activity_alerts_enabled"
  | "creator_broadcasts_enabled"
  | "fan_pass_updates_enabled"
  | "chat_notifications_enabled"
  | "daily_task_reminders_enabled"
  | "wallet_updates_enabled"
  | "security_alerts_enabled"
  | "support_updates_enabled";

export type NotificationConsentRequirement =
  | "required_account_integrity"
  | "minimal_analytics_or_stronger"
  | "full_behavioral";

export type NotificationPriority = "critical" | "high" | "normal" | "low";

export type NotificationTargetingDebugLane = {
  lane: "Notification targeting";
  label: "Notification targeting";
  status: "live" | "degraded" | "unavailable";
  intentTypesRegistered: number;
  missingAudienceSource: number;
  blockedByOptOut: number;
  blockedByMissingToken: number;
  blockedByConsent: number;
  dryRunEligible: number;
  telemetryStatus: "mapped" | "missing";
  rawDetailsCollapsedByDefault: true;
};

export type NotificationIntentContract = {
  intentType: NotificationIntentType;
  audienceSource: NotificationAudienceSource;
  eligibility: string[];
  optInRequirement: NotificationOptInRequirement;
  consentRequirement: NotificationConsentRequirement;
  throttleCooldownMs: number;
  dedupeKeyTemplate: string;
  priority: NotificationPriority;
  userFacingCopySource: string;
  deepLinkRoute: string;
  telemetryEvents: string[];
  debugVisibility: {
    lane: "Notification targeting";
    status: "debug_visible";
    rawDetailsCollapsedByDefault: true;
  };
  payloadPolicy: {
    rawPiiAllowed: false;
    rawTokenAllowed: false;
    copySourceOnly: true;
  };
};

export const NOTIFICATION_INTENT_TYPES: NotificationIntentType[] = [
  "drop_live",
  "drop_expiring",
  "drop_unwrapped",
  "creator_broadcast",
  "fan_pass_update",
  "chat_message",
  "chat_paid_gd_gate",
  "daily_task_available",
  "daily_task_streak",
  "wallet_payment_success",
  "system_security",
  "support_update",
];

export const NOTIFICATION_TARGETING_TELEMETRY_EVENTS = [
  "notification_intent_evaluated",
  "notification_targeting_blocked",
  "notification_targeting_dry_run_eligible",
] as const;

const HOUR_MS = 60 * 60 * 1000;

function contract(input: Omit<NotificationIntentContract, "telemetryEvents" | "debugVisibility" | "payloadPolicy">): NotificationIntentContract {
  return {
    ...input,
    telemetryEvents: [...NOTIFICATION_TARGETING_TELEMETRY_EVENTS],
    debugVisibility: {
      lane: "Notification targeting",
      status: "debug_visible",
      rawDetailsCollapsedByDefault: true,
    },
    payloadPolicy: {
      rawPiiAllowed: false,
      rawTokenAllowed: false,
      copySourceOnly: true,
    },
  };
}

export const NOTIFICATION_INTENT_CONTRACTS: Record<NotificationIntentType, NotificationIntentContract> = {
  drop_live: contract({
    intentType: "drop_live",
    audienceSource: "global_drop_audience",
    eligibility: ["drop is active/live", "recipient is not excluded", "browser push token is registered"],
    optInRequirement: "new_drop_alerts_enabled",
    consentRequirement: "minimal_analytics_or_stronger",
    throttleCooldownMs: 4 * HOUR_MS,
    dedupeKeyTemplate: "drop_live:{dropId}:{recipientUserId}:{activationKey}",
    priority: "high",
    userFacingCopySource: "drop notification copy contract",
    deepLinkRoute: "/drops",
  }),
  drop_expiring: contract({
    intentType: "drop_expiring",
    audienceSource: "global_drop_audience",
    eligibility: ["drop is active", "drop expires inside configured reminder window", "recipient is not excluded"],
    optInRequirement: "expiring_drop_alerts_enabled",
    consentRequirement: "minimal_analytics_or_stronger",
    throttleCooldownMs: 4 * HOUR_MS,
    dedupeKeyTemplate: "drop_expiring:{dropId}:{recipientUserId}:{windowId}",
    priority: "normal",
    userFacingCopySource: "drop expiration notification copy contract",
    deepLinkRoute: "/drops",
  }),
  drop_unwrapped: contract({
    intentType: "drop_unwrapped",
    audienceSource: "drop_unwrapper",
    eligibility: ["recipient owns the unwrap event", "server entitlement or unwrap record exists"],
    optInRequirement: "drop_activity_alerts_enabled",
    consentRequirement: "minimal_analytics_or_stronger",
    throttleCooldownMs: HOUR_MS,
    dedupeKeyTemplate: "drop_unwrapped:{dropId}:{recipientUserId}:{unwrapId}",
    priority: "normal",
    userFacingCopySource: "unwrap confirmation notification copy contract",
    deepLinkRoute: "/dashboard/library",
  }),
  creator_broadcast: contract({
    intentType: "creator_broadcast",
    audienceSource: "creator_followers_or_subscribers",
    eligibility: ["broadcast is published", "creator audience setting allows recipient source", "recipient follows or subscribes"],
    optInRequirement: "creator_broadcasts_enabled",
    consentRequirement: "minimal_analytics_or_stronger",
    throttleCooldownMs: 2 * HOUR_MS,
    dedupeKeyTemplate: "creator_broadcast:{creatorId}:{broadcastId}:{recipientUserId}",
    priority: "normal",
    userFacingCopySource: "creator broadcast source record",
    deepLinkRoute: "/creators/{creatorUsername}",
  }),
  fan_pass_update: contract({
    intentType: "fan_pass_update",
    audienceSource: "fan_pass_subscribers",
    eligibility: ["recipient has an active Fan Pass", "creator update is subscriber-visible"],
    optInRequirement: "fan_pass_updates_enabled",
    consentRequirement: "minimal_analytics_or_stronger",
    throttleCooldownMs: 4 * HOUR_MS,
    dedupeKeyTemplate: "fan_pass_update:{creatorId}:{updateId}:{recipientUserId}",
    priority: "normal",
    userFacingCopySource: "fan pass update source record",
    deepLinkRoute: "/dashboard/profile",
  }),
  chat_message: contract({
    intentType: "chat_message",
    audienceSource: "chat_thread_recipient",
    eligibility: ["recipient is a thread participant", "recipient is not the sender", "message is deliverable"],
    optInRequirement: "chat_notifications_enabled",
    consentRequirement: "minimal_analytics_or_stronger",
    throttleCooldownMs: 5 * 60 * 1000,
    dedupeKeyTemplate: "chat_message:{threadId}:{messageId}:{recipientUserId}",
    priority: "high",
    userFacingCopySource: "chat message notification copy contract",
    deepLinkRoute: "/dashboard/chat",
  }),
  chat_paid_gd_gate: contract({
    intentType: "chat_paid_gd_gate",
    audienceSource: "chat_thread_recipient",
    eligibility: ["recipient is the affected user", "paid-GD gate was viewed or blocked"],
    optInRequirement: "chat_notifications_enabled",
    consentRequirement: "minimal_analytics_or_stronger",
    throttleCooldownMs: 12 * HOUR_MS,
    dedupeKeyTemplate: "chat_paid_gd_gate:{threadId}:{recipientUserId}:{windowId}",
    priority: "low",
    userFacingCopySource: "chat paid-GD gate copy contract",
    deepLinkRoute: "/dashboard/chat",
  }),
  daily_task_available: contract({
    intentType: "daily_task_available",
    audienceSource: "daily_task_eligible_users",
    eligibility: ["daily task reset policy says eligible", "task is active and claimable"],
    optInRequirement: "daily_task_reminders_enabled",
    consentRequirement: "minimal_analytics_or_stronger",
    throttleCooldownMs: 12 * HOUR_MS,
    dedupeKeyTemplate: "daily_task_available:{taskId}:{recipientUserId}:{resetWindowId}",
    priority: "normal",
    userFacingCopySource: "daily task guidance contract",
    deepLinkRoute: "/experiences",
  }),
  daily_task_streak: contract({
    intentType: "daily_task_streak",
    audienceSource: "daily_task_eligible_users",
    eligibility: ["daily task streak source exists", "task is active and claimable"],
    optInRequirement: "daily_task_reminders_enabled",
    consentRequirement: "minimal_analytics_or_stronger",
    throttleCooldownMs: 24 * HOUR_MS,
    dedupeKeyTemplate: "daily_task_streak:{taskId}:{recipientUserId}:{resetWindowId}",
    priority: "low",
    userFacingCopySource: "daily task streak copy contract",
    deepLinkRoute: "/experiences",
  }),
  wallet_payment_success: contract({
    intentType: "wallet_payment_success",
    audienceSource: "wallet_account_owner",
    eligibility: ["server payment success truth exists", "recipient owns the wallet transaction"],
    optInRequirement: "wallet_updates_enabled",
    consentRequirement: "required_account_integrity",
    throttleCooldownMs: 0,
    dedupeKeyTemplate: "wallet_payment_success:{transactionId}:{recipientUserId}",
    priority: "high",
    userFacingCopySource: "wallet payment receipt source record",
    deepLinkRoute: "/dashboard/profile",
  }),
  system_security: contract({
    intentType: "system_security",
    audienceSource: "system_account_owner",
    eligibility: ["security/account event targets this account", "message is privacy-safe"],
    optInRequirement: "security_alerts_enabled",
    consentRequirement: "required_account_integrity",
    throttleCooldownMs: 0,
    dedupeKeyTemplate: "system_security:{eventId}:{recipientUserId}",
    priority: "critical",
    userFacingCopySource: "system security notification contract",
    deepLinkRoute: "/settings",
  }),
  support_update: contract({
    intentType: "support_update",
    audienceSource: "support_thread_participant",
    eligibility: ["recipient owns or participates in support thread", "support update is visible to recipient"],
    optInRequirement: "support_updates_enabled",
    consentRequirement: "required_account_integrity",
    throttleCooldownMs: HOUR_MS,
    dedupeKeyTemplate: "support_update:{ticketId}:{recipientUserId}:{messageId}",
    priority: "normal",
    userFacingCopySource: "support inbox source record",
    deepLinkRoute: "/dashboard/support",
  }),
};

export function getNotificationIntentContract(intentType: NotificationIntentType) {
  return NOTIFICATION_INTENT_CONTRACTS[intentType];
}

export function consentAllowsNotificationIntent(
  requirement: NotificationConsentRequirement,
  consentMode: ConsentMode,
) {
  if (requirement === "required_account_integrity") return true;
  if (requirement === "minimal_analytics_or_stronger") {
    return consentMode === "minimal_analytics" || consentMode === "full_analytics" || consentMode === "full_behavioral";
  }
  return consentMode === "full_behavioral";
}

export function buildNotificationTargetingDebugLane(input: {
  intentTypesRegistered?: number;
  missingAudienceSourceCount?: number;
  blockedByOptOutCount?: number;
  blockedByMissingTokenCount?: number;
  blockedByConsentCount?: number;
  dryRunEligibleCount?: number;
  telemetryMapped?: boolean;
} = {}): NotificationTargetingDebugLane {
  const missingAudienceSource = Math.max(0, input.missingAudienceSourceCount ?? 0);
  const telemetryMapped = input.telemetryMapped !== false;
  const status = !telemetryMapped || missingAudienceSource > 0 ? "unavailable" : "live";

  return {
    lane: "Notification targeting",
    label: "Notification targeting",
    status,
    intentTypesRegistered: Math.max(0, input.intentTypesRegistered ?? NOTIFICATION_INTENT_TYPES.length),
    missingAudienceSource,
    blockedByOptOut: Math.max(0, input.blockedByOptOutCount ?? 0),
    blockedByMissingToken: Math.max(0, input.blockedByMissingTokenCount ?? 0),
    blockedByConsent: Math.max(0, input.blockedByConsentCount ?? 0),
    dryRunEligible: Math.max(0, input.dryRunEligibleCount ?? 0),
    telemetryStatus: telemetryMapped ? "mapped" : "missing",
    rawDetailsCollapsedByDefault: true,
  };
}
