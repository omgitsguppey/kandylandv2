import type { IdentityConfidence } from "@/lib/analytics/identity-handoff-contract";
import { IDENTITY_CONFIDENCE_WEIGHTS } from "@/lib/math/canonical-math-ledger";
import type { PersonMetricId } from "@/lib/analytics/person-metrics-contract";
import { LAUNCH_ANALYTICS_FIRST_DAY_KEY } from "@/lib/analytics/source-agreement-detail";

export const LEGACY_METRIC_CANONICALIZATION_VERSION = "legacy-metric-canonicalization.v1";
export const LEGACY_RECOVERY_START_DATE = LAUNCH_ANALYTICS_FIRST_DAY_KEY;

export type LegacyAliasCategory =
  | "watch_page_duration"
  | "unlock_drop_open"
  | "wallet_payment"
  | "signup_login"
  | "daily_task_checkin"
  | "chat_message"
  | "notification"
  | "creator_profile_follow"
  | "search_discovery"
  | "support_settings";

export type LegacyRecoveryAction =
  | "normalize_candidate"
  | "link_candidate"
  | "archive_only"
  | "ignore"
  | "needs_manual_review";

export type LegacyDuplicateRisk = "low" | "medium" | "high";

export type LegacyEventKind =
  | "click_action"
  | "view_impression"
  | "session"
  | "payment_ledger"
  | "task"
  | "notification";

export type LegacyCanonicalizationInput = {
  legacySource?: string | null;
  eventName?: string | null;
  eventType?: string | null;
  oldEvent?: string | null;
  canonicalEventName?: string | null;
  metricName?: string | null;
  eventId?: string | null;
  userId?: string | null;
  guestId?: string | null;
  sessionId?: string | null;
  linkId?: string | null;
  objectId?: string | null;
  sourceRoute?: string | null;
  occurredAt?: string | number | Date | null;
  sourceExact?: boolean | null;
  partialRouteMatch?: boolean | null;
  resetWindowId?: string | null;
  intentId?: string | null;
  recipientId?: string | null;
  idempotencyKey?: string | null;
  providerOrderId?: string | null;
};

export type LegacyEventAlias = {
  aliases: readonly string[];
  canonicalEventName: string;
  canonicalMetricId: PersonMetricId | null;
  aliasCategory: LegacyAliasCategory;
  eventKind: LegacyEventKind;
  confidenceFloor: IdentityConfidence;
  reason: string;
};

export type LegacyCanonicalEventMapping = {
  canonicalEventName: string;
  canonicalMetricId: PersonMetricId | null;
  aliasCategory: LegacyAliasCategory | "unknown";
  eventKind: LegacyEventKind;
  confidenceFloor: IdentityConfidence;
  reason: string;
};

export type LegacyConfidenceDecision = {
  identityConfidence: IdentityConfidence;
  confidenceWeight: number;
  action: LegacyRecoveryAction;
  reason: string;
};

function cleanString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : "";
}

function normalizeToken(value: string) {
  return value.trim().replace(/[\s.-]+/gu, "_").replace(/__+/gu, "_").toLowerCase();
}

export const LEGACY_EVENT_ALIAS_TABLE: LegacyEventAlias[] = [
  {
    aliases: ["page_duration", "page_time", "time_on_page", "watch_seconds_total", "watchSecondsTotal", "viewer_watch_seconds"],
    canonicalEventName: "session_closed",
    canonicalMetricId: "sessions",
    aliasCategory: "watch_page_duration",
    eventKind: "session",
    confidenceFloor: "weak",
    reason: "Legacy page duration is session evidence, not canonical watch time.",
  },
  {
    aliases: ["unlock_drop_success", "drop_unlocked", "drop_unwrapped", "creator_drop_unwrapped", "entitlement_granted"],
    canonicalEventName: "drop_unlocked",
    canonicalMetricId: "unwraps",
    aliasCategory: "unlock_drop_open",
    eventKind: "click_action",
    confidenceFloor: "inferred",
    reason: "Unlock aliases map to unwrap metrics; server entitlement remains source truth before current truth promotion.",
  },
  {
    aliases: ["old_drop_view", "drop_opened", "drop_clicked", "view_drop_details", "drop_preview"],
    canonicalEventName: "drop_preview_opened",
    canonicalMetricId: "drop_opens",
    aliasCategory: "unlock_drop_open",
    eventKind: "view_impression",
    confidenceFloor: "weak",
    reason: "Legacy drop open aliases map to current drop open metrics unless the server entitlement event proves an unwrap.",
  },
  {
    aliases: ["wallet_purchase_completed", "purchase_completed", "purchase_verified", "server_purchase_verified", "paypal_capture_completed", "gumdrops_purchase_completed"],
    canonicalEventName: "gumdrops_purchased",
    canonicalMetricId: "payment_approvals",
    aliasCategory: "wallet_payment",
    eventKind: "payment_ledger",
    confidenceFloor: "inferred",
    reason: "Payment aliases map to payment approval metrics for dry-run review only; payment/GumDrop math is untouched.",
  },
  {
    aliases: ["auth_sign_up_success", "auth_registration_completed", "user_registered", "login_success", "auth_login_completed"],
    canonicalEventName: "signup_completed",
    canonicalMetricId: "auth_runtime_events",
    aliasCategory: "signup_login",
    eventKind: "click_action",
    confidenceFloor: "inferred",
    reason: "Signup/login aliases map to auth runtime metrics.",
  },
  {
    aliases: ["daily_check_in_claim", "daily_checkin_claimed", "daily_reward_claimed", "task_completed", "daily_task_completed"],
    canonicalEventName: "task_completed",
    canonicalMetricId: "daily_task_completions",
    aliasCategory: "daily_task_checkin",
    eventKind: "task",
    confidenceFloor: "inferred",
    reason: "Daily check-in and task aliases map to task completion metrics by reset window.",
  },
  {
    aliases: ["chat_send", "chat_message_send", "chat_message_sent", "creator_message_sent", "chat_message_blocked", "chat_message_failed"],
    canonicalEventName: "chat_message_sent",
    canonicalMetricId: "chat_actions",
    aliasCategory: "chat_message",
    eventKind: "click_action",
    confidenceFloor: "weak",
    reason: "Chat aliases map to chat action metrics without touching chat internals.",
  },
  {
    aliases: ["push_opened", "notification_clicked", "notification_opened", "notification_read", "notification_delivered"],
    canonicalEventName: "notification_opened",
    canonicalMetricId: "notification_interactions",
    aliasCategory: "notification",
    eventKind: "notification",
    confidenceFloor: "weak",
    reason: "Notification aliases map by intent/recipient delivery window.",
  },
  {
    aliases: ["creator_profile_viewed", "creator_profile_clicked", "creator_card_clicked"],
    canonicalEventName: "creator_profile_opened",
    canonicalMetricId: "creator_profile_views",
    aliasCategory: "creator_profile_follow",
    eventKind: "view_impression",
    confidenceFloor: "weak",
    reason: "Creator profile/follow aliases map into discovery relationship metrics.",
  },
  {
    aliases: ["creator_followed", "creator_follow_succeeded", "creator_unfollowed", "creator_unfollow_succeeded"],
    canonicalEventName: "creator_followed",
    canonicalMetricId: "follows",
    aliasCategory: "creator_profile_follow",
    eventKind: "click_action",
    confidenceFloor: "inferred",
    reason: "Follow relationship aliases map to follow metrics.",
  },
  {
    aliases: ["drops_searched", "search_query_submitted", "creator_search_selected", "filter_selected", "category_clicked"],
    canonicalEventName: "search_submitted",
    canonicalMetricId: "search_discovery_actions",
    aliasCategory: "search_discovery",
    eventKind: "click_action",
    confidenceFloor: "weak",
    reason: "Search/discovery aliases map to redacted search discovery metrics.",
  },
  {
    aliases: ["support_ticket_submitted", "support_ticket_created", "account_settings_saved", "settings_updated", "bug_report_submitted"],
    canonicalEventName: "support_ticket_created",
    canonicalMetricId: "support_account_actions",
    aliasCategory: "support_settings",
    eventKind: "click_action",
    confidenceFloor: "weak",
    reason: "Support/settings aliases map to support account action metrics.",
  },
];

const METRIC_ALIAS_MAP: Record<string, PersonMetricId> = {
  watchsecondstotal: "runtime_watch_sessions",
  watch_seconds_total: "runtime_watch_sessions",
  page_duration: "sessions",
  page_time: "sessions",
  old_drop_views: "drop_opens",
  drop_opens: "drop_opens",
  unlocks: "unwraps",
  purchases: "payment_approvals",
  wallet_purchases: "payment_approvals",
  checkins: "daily_task_completions",
  daily_checkins: "daily_task_completions",
  chat_messages: "chat_actions",
  push_opens: "notification_interactions",
  creator_views: "creator_profile_views",
  follows: "follows",
  searches: "search_discovery_actions",
  support_actions: "support_account_actions",
  settings_actions: "settings_actions",
};

export function canonicalizeLegacyMetricName(input: string): PersonMetricId | null {
  const normalized = normalizeToken(input);
  return METRIC_ALIAS_MAP[normalized] ?? null;
}

function eventNameFor(input: LegacyCanonicalizationInput) {
  return cleanString(input.canonicalEventName)
    || cleanString(input.eventName)
    || cleanString(input.eventType)
    || cleanString(input.oldEvent)
    || "unknown_legacy";
}

function findAlias(input: LegacyCanonicalizationInput): LegacyEventAlias | null {
  const normalized = normalizeToken(eventNameFor(input));
  return LEGACY_EVENT_ALIAS_TABLE.find((entry) =>
    entry.aliases.some((alias) => normalizeToken(alias) === normalized)) ?? null;
}

export function canonicalizeLegacyEventName(input: LegacyCanonicalizationInput): LegacyCanonicalEventMapping {
  const alias = findAlias(input);
  if (!alias) {
    return {
      canonicalEventName: eventNameFor(input) === "unknown_legacy" ? "unknown_legacy" : normalizeToken(eventNameFor(input)),
      canonicalMetricId: canonicalizeLegacyMetricName(cleanString(input.metricName)) ?? null,
      aliasCategory: "unknown",
      eventKind: "click_action",
      confidenceFloor: "unknown",
      reason: "No canonical legacy alias mapping exists; candidate remains archive/manual review unless source evidence improves.",
    };
  }
  return {
    canonicalEventName: alias.canonicalEventName,
    canonicalMetricId: alias.canonicalMetricId,
    aliasCategory: alias.aliasCategory,
    eventKind: alias.eventKind,
    confidenceFloor: alias.confidenceFloor,
    reason: alias.reason,
  };
}

export function mapLegacyEventToCurrentMetric(input: LegacyCanonicalizationInput): LegacyCanonicalEventMapping {
  return canonicalizeLegacyEventName(input);
}

function hasOccurredAt(input: LegacyCanonicalizationInput) {
  const value = input.occurredAt;
  if (value instanceof Date) return Number.isFinite(value.getTime());
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string") return Number.isFinite(Date.parse(value));
  return false;
}

function hasDeterministicExactIdentity(input: LegacyCanonicalizationInput) {
  return Boolean(
    cleanString(input.userId)
      && cleanString(input.eventId)
      && hasOccurredAt(input)
      && cleanString(input.sourceRoute),
  );
}

export function classifyLegacyMetricConfidence(input: LegacyCanonicalizationInput): LegacyConfidenceDecision {
  const mapping = canonicalizeLegacyEventName(input);
  const sourceExact = input.sourceExact === true;
  const partialMatch = input.partialRouteMatch === true || mapping.aliasCategory !== "unknown";

  if (mapping.canonicalEventName === "unknown_legacy" || mapping.aliasCategory === "unknown") {
    return {
      identityConfidence: "unknown",
      confidenceWeight: IDENTITY_CONFIDENCE_WEIGHTS.unknown,
      action: "archive_only",
      reason: "Unknown source or identity is archive_only; unknown legacy cannot become exact.",
    };
  }
  if (sourceExact && hasDeterministicExactIdentity(input)) {
    return {
      identityConfidence: "exact",
      confidenceWeight: IDENTITY_CONFIDENCE_WEIGHTS.exact,
      action: "normalize_candidate",
      reason: "Exact legacy identity is allowed because deterministic userId, eventId, timestamp, and source route exist.",
    };
  }
  if (sourceExact) {
    return {
      identityConfidence: "inferred",
      confidenceWeight: IDENTITY_CONFIDENCE_WEIGHTS.inferred,
      action: "normalize_candidate",
      reason: "Exact source with incomplete deterministic identity is capped at inferred.",
    };
  }
  if (partialMatch) {
    return {
      identityConfidence: "weak",
      confidenceWeight: IDENTITY_CONFIDENCE_WEIGHTS.weak,
      action: "normalize_candidate",
      reason: "Partial route or event alias match is capped at weak confidence.",
    };
  }
  return {
    identityConfidence: "unknown",
    confidenceWeight: IDENTITY_CONFIDENCE_WEIGHTS.unknown,
    action: "archive_only",
    reason: "Unknown source and identity remain archive_only.",
  };
}

function timestampMs(value: LegacyCanonicalizationInput["occurredAt"]) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function bucket(input: LegacyCanonicalizationInput, windowMs: number) {
  return Math.floor(timestampMs(input.occurredAt) / windowMs);
}

function identityKey(input: LegacyCanonicalizationInput) {
  return cleanString(input.userId)
    || cleanString(input.linkId)
    || cleanString(input.guestId)
    || cleanString(input.sessionId)
    || "unknown_identity";
}

export function buildLegacyDedupeKey(input: LegacyCanonicalizationInput & { canonicalEventName?: string; eventKind?: LegacyEventKind }) {
  const eventKind = input.eventKind ?? canonicalizeLegacyEventName(input).eventKind;
  const eventName = cleanString(input.canonicalEventName) || canonicalizeLegacyEventName(input).canonicalEventName;

  if (eventKind === "payment_ledger") {
    return `payment_ledger:${cleanString(input.idempotencyKey) || cleanString(input.providerOrderId) || "missing_payment_fingerprint"}`;
  }
  if (eventKind === "task") {
    return `task:${cleanString(input.resetWindowId) || `${identityKey(input)}:${bucket(input, 24 * 60 * 60 * 1000)}`}`;
  }
  if (eventKind === "notification") {
    return `notification:${cleanString(input.intentId) || "missing_intent"}:${cleanString(input.recipientId) || identityKey(input)}:${bucket(input, 60 * 60 * 1000)}`;
  }
  if (eventKind === "session") {
    const sessionId = cleanString(input.sessionId);
    return sessionId ? `session:${sessionId}` : `session:${identityKey(input)}:${bucket(input, 30 * 60 * 1000)}`;
  }

  const windowMs = eventKind === "view_impression" ? 60_000 : 5_000;
  return [
    eventKind,
    eventName,
    identityKey(input),
    cleanString(input.objectId) || "unknown_object",
    cleanString(input.sourceRoute) || "unknown_route",
    bucket(input, windowMs),
  ].join(":");
}

export function explainLegacyCanonicalization(input: LegacyCanonicalizationInput) {
  const mapping = canonicalizeLegacyEventName(input);
  const confidence = classifyLegacyMetricConfidence(input);
  const metric = mapping.canonicalMetricId ?? "archive_only";
  return `${eventNameFor(input)} -> ${mapping.canonicalEventName}/${metric}: ${confidence.action}; ${confidence.reason}`;
}
