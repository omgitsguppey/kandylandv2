import { normalizeTelemetryEventName } from "@/lib/telemetry-catalog";

import {
  BEHAVIORAL_EVENT_DEDUPE_WINDOWS_MS,
  BEHAVIORAL_EVENT_LABELS,
  type BehavioralEventEntityType,
  type BehavioralEventFact,
  type BehavioralEventFactDiagnostic,
  type BehavioralEventSource,
  type BehavioralNormalizedAction,
} from "@/lib/behavioral/event-fact-contract";

type ActionAliasConfig = {
  normalizedAction: BehavioralNormalizedAction;
  entityType?: BehavioralEventEntityType;
  entityKeys: string[];
};

const ACTION_ALIASES: Record<string, ActionAliasConfig> = {
  home_page_viewed: { normalizedAction: "home_viewed", entityType: "page", entityKeys: ["route", "page_path", "pagePath"] },
  hero_cta_clicked: { normalizedAction: "hero_cta_clicked", entityType: "page", entityKeys: ["destination", "action", "route", "page_path", "pagePath"] },
  auth_sign_up_attempted: { normalizedAction: "signup_started", entityKeys: ["user_id", "userId", "session_id", "sessionId", "anonymous_visitor_id", "anonymousVisitorId"] },
  auth_google_sign_in_attempted: { normalizedAction: "signup_started", entityKeys: ["user_id", "userId", "session_id", "sessionId", "anonymous_visitor_id", "anonymousVisitorId"] },
  auth_sign_up_success: { normalizedAction: "signup_completed", entityKeys: ["user_id", "userId"] },
  user_registered: { normalizedAction: "signup_completed", entityKeys: ["user_id", "userId"] },
  guided_onboarding_started: { normalizedAction: "onboarding_started", entityKeys: ["user_id", "userId", "session_id", "sessionId"] },
  guided_onboarding_completed: { normalizedAction: "onboarding_completed", entityKeys: ["user_id", "userId"] },
  onboarding_complete: { normalizedAction: "onboarding_completed", entityKeys: ["user_id", "userId"] },
  onboarding_completed: { normalizedAction: "onboarding_completed", entityKeys: ["user_id", "userId"] },
  daily_checkin_claimed: { normalizedAction: "daily_checkin_claimed", entityType: "task", entityKeys: ["task_id", "taskId", "user_id", "userId"] },
  daily_check_in_claim: { normalizedAction: "daily_checkin_claimed", entityType: "task", entityKeys: ["task_id", "taskId", "user_id", "userId"] },
  daily_reward_claimed: { normalizedAction: "daily_checkin_claimed", entityType: "task", entityKeys: ["task_id", "taskId", "user_id", "userId"] },
  daily_tasks_viewed: { normalizedAction: "task_ready", entityType: "task", entityKeys: ["task_id", "taskId", "task_key", "taskKey", "route", "page_path", "pagePath"] },
  task_completed: { normalizedAction: "task_completed", entityType: "task", entityKeys: ["task_id", "taskId", "task_key", "taskKey"] },
  daily_task_completed: { normalizedAction: "task_completed", entityType: "task", entityKeys: ["task_id", "taskId", "task_key", "taskKey"] },
  creator_spotlight_viewed: { normalizedAction: "creator_spotlight_viewed", entityType: "creator", entityKeys: ["creator_id", "creatorId", "surface"] },
  drop_clicked: { normalizedAction: "drop_viewed", entityType: "drop", entityKeys: ["drop_id", "dropId"] },
  view_drop_details: { normalizedAction: "drop_card_viewed", entityType: "drop", entityKeys: ["drop_id", "dropId"] },
  drop_card_impression: { normalizedAction: "drop_card_viewed", entityType: "drop", entityKeys: ["drop_id", "dropId"] },
  featured_drop_viewed: { normalizedAction: "drop_card_viewed", entityType: "drop", entityKeys: ["drop_id", "dropId"] },
  featured_drop_clicked: { normalizedAction: "drop_card_viewed", entityType: "drop", entityKeys: ["drop_id", "dropId"] },
  drop_preview: { normalizedAction: "drop_preview_opened", entityType: "drop", entityKeys: ["drop_id", "dropId"] },
  drop_preview_opened: { normalizedAction: "drop_preview_opened", entityType: "drop", entityKeys: ["drop_id", "dropId"] },
  drop_preview_page_viewed: { normalizedAction: "drop_preview_opened", entityType: "drop", entityKeys: ["drop_id", "dropId"] },
  drop_preview_cta_clicked: { normalizedAction: "drop_preview_cta_clicked", entityType: "drop", entityKeys: ["drop_id", "dropId"] },
  drop_unlock_attempted: { normalizedAction: "drop_unwrap_attempted", entityType: "drop", entityKeys: ["drop_id", "dropId", "transaction_id", "transactionId", "idempotency_key", "idempotencyKey"] },
  unlock_drop_success: { normalizedAction: "drop_unwrapped", entityType: "drop", entityKeys: ["drop_id", "dropId", "transaction_id", "transactionId", "idempotency_key", "idempotencyKey"] },
  drop_unwrapped: { normalizedAction: "drop_unwrapped", entityType: "drop", entityKeys: ["drop_id", "dropId", "transaction_id", "transactionId"] },
  unlock_drop_failed: { normalizedAction: "drop_unwrap_failed", entityType: "drop", entityKeys: ["drop_id", "dropId", "transaction_id", "transactionId", "idempotency_key", "idempotencyKey"] },
  viewer_asset_started: { normalizedAction: "file_viewed", entityType: "file", entityKeys: ["file_id", "fileId", "asset_key", "assetKey", "media_index", "mediaIndex"] },
  viewer_asset_changed: { normalizedAction: "file_viewed", entityType: "file", entityKeys: ["file_id", "fileId", "asset_key", "assetKey", "media_index", "mediaIndex"] },
  file_viewed: { normalizedAction: "file_viewed", entityType: "file", entityKeys: ["file_id", "fileId", "asset_key", "assetKey", "media_index", "mediaIndex"] },
  watch_session_started: { normalizedAction: "watch_session_started", entityType: "drop", entityKeys: ["watch_session_id", "watchSessionId", "drop_id", "dropId"] },
  watch_session_visible_tick: { normalizedAction: "watch_session_tick", entityType: "drop", entityKeys: ["watch_session_id", "watchSessionId", "drop_id", "dropId"] },
  watch_session_tick: { normalizedAction: "watch_session_tick", entityType: "drop", entityKeys: ["watch_session_id", "watchSessionId", "drop_id", "dropId"] },
  viewer_session_completed: { normalizedAction: "watch_session_completed", entityType: "drop", entityKeys: ["watch_session_id", "watchSessionId", "drop_id", "dropId"] },
  watch_session_completed: { normalizedAction: "watch_session_completed", entityType: "drop", entityKeys: ["watch_session_id", "watchSessionId", "drop_id", "dropId"] },
  watch_session_ended: { normalizedAction: "watch_session_completed", entityType: "drop", entityKeys: ["watch_session_id", "watchSessionId", "drop_id", "dropId"] },
  watch_score_computed: { normalizedAction: "watch_session_completed", entityType: "drop", entityKeys: ["watch_session_id", "watchSessionId", "drop_id", "dropId"] },
  wallet_opened: { normalizedAction: "wallet_opened", entityType: "wallet", entityKeys: ["transaction_id", "transactionId", "preferred_refill_gd", "preferredRefillGd", "route", "page_path", "pagePath"] },
  purchase_package_selected: { normalizedAction: "wallet_package_selected", entityType: "wallet", entityKeys: ["purchase_id", "purchaseId", "order_id", "orderId", "package_drops"] },
  begin_checkout: { normalizedAction: "checkout_started", entityType: "wallet", entityKeys: ["transaction_id", "transactionId", "purchase_id", "purchaseId", "order_id", "orderId"] },
  gumdrops_purchase_completed: { normalizedAction: "gumdrops_purchased", entityType: "wallet", entityKeys: ["transaction_id", "transactionId", "purchase_id", "purchaseId", "order_id", "orderId"] },
  purchase_verified: { normalizedAction: "gumdrops_purchased", entityType: "wallet", entityKeys: ["transaction_id", "transactionId", "purchase_id", "purchaseId", "order_id", "orderId"] },
  purchase: { normalizedAction: "gumdrops_purchased", entityType: "wallet", entityKeys: ["transaction_id", "transactionId", "purchase_id", "purchaseId", "order_id", "orderId"] },
  gumdrops_purchase_failed: { normalizedAction: "purchase_failed", entityType: "wallet", entityKeys: ["transaction_id", "transactionId", "purchase_id", "purchaseId", "order_id", "orderId"] },
  creator_followed: { normalizedAction: "creator_followed", entityType: "creator", entityKeys: ["creator_id", "creatorId"] },
  creator_unfollowed: { normalizedAction: "creator_unfollowed", entityType: "creator", entityKeys: ["creator_id", "creatorId"] },
  creator_fan_pass_started: { normalizedAction: "fan_pass_started", entityType: "creator", entityKeys: ["creator_id", "creatorId", "transaction_id", "transactionId"] },
  creator_subscription_failed: { normalizedAction: "fan_pass_failed", entityType: "creator", entityKeys: ["creator_id", "creatorId", "transaction_id", "transactionId"] },
  creator_experience_cta_clicked: { normalizedAction: "custom_request_started", entityType: "creator", entityKeys: ["creator_id", "creatorId", "lane"] },
  creator_custom_request_created: { normalizedAction: "custom_request_submitted", entityType: "creator", entityKeys: ["creator_id", "creatorId", "request_id", "requestId", "transaction_id", "transactionId"] },
  creator_call_booking_created: { normalizedAction: "booking_started", entityType: "booking", entityKeys: ["booking_id", "bookingId", "creator_id", "creatorId", "transaction_id", "transactionId"] },
  creator_call_booking_completed: { normalizedAction: "booking_completed", entityType: "booking", entityKeys: ["booking_id", "bookingId", "creator_id", "creatorId", "transaction_id", "transactionId"] },
  creator_booking_failed: { normalizedAction: "booking_failed", entityType: "booking", entityKeys: ["booking_id", "bookingId", "creator_id", "creatorId", "transaction_id", "transactionId"] },
  chat_thread_opened: { normalizedAction: "chat_thread_opened", entityType: "chat", entityKeys: ["thread_id", "threadId", "conversation_id", "conversationId"] },
  chat_message_sent: { normalizedAction: "chat_message_sent", entityType: "chat", entityKeys: ["message_id", "messageId", "thread_id", "threadId", "conversation_id", "conversationId"] },
  creator_message_sent: { normalizedAction: "chat_message_sent", entityType: "chat", entityKeys: ["message_id", "messageId", "thread_id", "threadId", "conversation_id", "conversationId"] },
  chat_message_send_failed: { normalizedAction: "chat_message_failed", entityType: "chat", entityKeys: ["message_id", "messageId", "thread_id", "threadId", "conversation_id", "conversationId"] },
  notification_opened: { normalizedAction: "notification_opened", entityType: "notification", entityKeys: ["notification_id", "notificationId", "tag"] },
  notifications_dropdown_opened: { normalizedAction: "notification_opened", entityType: "notification", entityKeys: ["notification_id", "notificationId", "tag"] },
  notification_clicked: { normalizedAction: "notification_opened", entityType: "notification", entityKeys: ["notification_id", "notificationId", "tag"] },
  notification_read: { normalizedAction: "notification_read", entityType: "notification", entityKeys: ["notification_id", "notificationId", "tag"] },
  notification_marked_read: { normalizedAction: "notification_read", entityType: "notification", entityKeys: ["notification_id", "notificationId", "tag"] },
  notification_action_clicked: { normalizedAction: "notification_action_clicked", entityType: "notification", entityKeys: ["notification_id", "notificationId", "tag"] },
  support_ticket_created: { normalizedAction: "support_ticket_created", entityType: "support", entityKeys: ["ticket_id", "ticketId", "thread_id", "threadId"] },
  support_ticket_submitted: { normalizedAction: "support_ticket_created", entityType: "support", entityKeys: ["ticket_id", "ticketId", "thread_id", "threadId"] },
  support_reply_viewed: { normalizedAction: "support_reply_viewed", entityType: "support", entityKeys: ["thread_id", "threadId", "ticket_id", "ticketId"] },
  support_thread_opened: { normalizedAction: "support_reply_viewed", entityType: "support", entityKeys: ["thread_id", "threadId", "ticket_id", "ticketId"] },
  support_reply_sent: { normalizedAction: "support_reply_sent", entityType: "support", entityKeys: ["thread_id", "threadId", "ticket_id", "ticketId"] },
  support_thread_replied: { normalizedAction: "support_reply_sent", entityType: "support", entityKeys: ["thread_id", "threadId", "ticket_id", "ticketId"] },
  support_thread_reply_failed: { normalizedAction: "chat_message_failed", entityType: "support", entityKeys: ["thread_id", "threadId", "ticket_id", "ticketId"] },
  feedback_submitted: { normalizedAction: "bug_report_submitted", entityType: "support", entityKeys: ["ticket_id", "ticketId", "thread_id", "threadId"] },
  bug_report_submitted: { normalizedAction: "bug_report_submitted", entityType: "support", entityKeys: ["ticket_id", "ticketId", "thread_id", "threadId"] },
  heuristic_screenshot_shortcut_mac: { normalizedAction: "moderation_signal_recorded", entityType: "moderation", entityKeys: ["drop_id", "dropId", "asset_key", "assetKey", "security_reason"] },
  heuristic_screenshot_shortcut_windows: { normalizedAction: "moderation_signal_recorded", entityType: "moderation", entityKeys: ["drop_id", "dropId", "asset_key", "assetKey", "security_reason"] },
  heuristic_screen_record_shortcut: { normalizedAction: "moderation_signal_recorded", entityType: "moderation", entityKeys: ["drop_id", "dropId", "asset_key", "assetKey", "security_reason"] },
  heuristic_devtools_shortcut: { normalizedAction: "moderation_signal_recorded", entityType: "moderation", entityKeys: ["drop_id", "dropId", "asset_key", "assetKey", "security_reason"] },
  heuristic_rapid_visibility_capture: { normalizedAction: "moderation_signal_recorded", entityType: "moderation", entityKeys: ["drop_id", "dropId", "asset_key", "assetKey", "security_reason"] },
  heuristic_rip_pattern: { normalizedAction: "moderation_signal_recorded", entityType: "moderation", entityKeys: ["drop_id", "dropId", "asset_key", "assetKey", "security_reason"] },
  confirmed_print_attempt: { normalizedAction: "moderation_signal_recorded", entityType: "moderation", entityKeys: ["drop_id", "dropId", "asset_key", "assetKey", "security_reason"] },
  confirmed_save_attempt: { normalizedAction: "moderation_signal_recorded", entityType: "moderation", entityKeys: ["drop_id", "dropId", "asset_key", "assetKey", "security_reason"] },
  confirmed_copy_attempt: { normalizedAction: "moderation_signal_recorded", entityType: "moderation", entityKeys: ["drop_id", "dropId", "asset_key", "assetKey", "security_reason"] },
  confirmed_cut_attempt: { normalizedAction: "moderation_signal_recorded", entityType: "moderation", entityKeys: ["drop_id", "dropId", "asset_key", "assetKey", "security_reason"] },
  confirmed_selection_attempt: { normalizedAction: "moderation_signal_recorded", entityType: "moderation", entityKeys: ["drop_id", "dropId", "asset_key", "assetKey", "security_reason"] },
  confirmed_drag_attempt: { normalizedAction: "moderation_signal_recorded", entityType: "moderation", entityKeys: ["drop_id", "dropId", "asset_key", "assetKey", "security_reason"] },
  confirmed_context_menu_attempt: { normalizedAction: "moderation_signal_recorded", entityType: "moderation", entityKeys: ["drop_id", "dropId", "asset_key", "assetKey", "security_reason"] },
  entitlement_blocked_asset_access: { normalizedAction: "entitlement_violation_recorded", entityType: "moderation", entityKeys: ["drop_id", "dropId", "asset_key", "assetKey", "security_reason"] },
  admin_user_opened: { normalizedAction: "admin_user_opened", entityType: "admin", entityKeys: ["target_user_id", "targetUserId", "user_id", "userId"] },
  admin_user_detail_viewed: { normalizedAction: "admin_user_opened", entityType: "admin", entityKeys: ["target_user_id", "targetUserId", "entity_id", "entityId", "user_id", "userId"] },
  admin_view_as_creator_started: { normalizedAction: "admin_user_action_taken", entityType: "admin", entityKeys: ["target_user_id", "targetUserId", "target_creator_id", "targetCreatorId"] },
  admin_view_as_creator_ended: { normalizedAction: "admin_user_action_taken", entityType: "admin", entityKeys: ["target_user_id", "targetUserId", "target_creator_id", "targetCreatorId"] },
  admin_user_action_taken: { normalizedAction: "admin_user_action_taken", entityType: "admin", entityKeys: ["target_user_id", "targetUserId", "target_creator_id", "targetCreatorId", "action", "action_key", "actionKey"] },
};

function readString(source: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function readNumber(source: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return 0;
}

function readOptionalString(source: Record<string, unknown>, ...keys: string[]) {
  const value = readString(source, ...keys);
  return value || undefined;
}

function readOptionalNumber(source: Record<string, unknown>, ...keys: string[]) {
  const value = readNumber(source, ...keys);
  return Number.isFinite(value) ? value : undefined;
}

function normalizeRoute(route: string) {
  if (!route) return "/unknown";
  return route.startsWith("/") ? route : `/${route}`;
}

function sanitizeFragment(value: string) {
  return value.replace(/[^A-Za-z0-9:_-]+/gu, "_").slice(0, 80) || "none";
}

function getSourceConfidence(source: BehavioralEventSource) {
  if (source === "server" || source === "materialized") return 1;
  if (source === "client") return 0.95;
  return 0.6;
}

function resolveEntityId(merged: Record<string, unknown>, config: ActionAliasConfig) {
  return readString(merged, ...config.entityKeys)
    || (config.entityType === "drop" ? readString(merged, "drop_id", "dropId") : "")
    || (config.entityType === "creator" ? readString(merged, "creator_id", "creatorId") : "")
    || "";
}

function buildDedupeKey(fact: Omit<BehavioralEventFact, "dedupeKey">) {
  const windowMs = BEHAVIORAL_EVENT_DEDUPE_WINDOWS_MS[fact.normalizedAction];
  const actorKey = sanitizeFragment(fact.userId || fact.sessionId || fact.anonymousVisitorId || "anonymous");
  const entityKey = sanitizeFragment(fact.entityId || fact.dropId || fact.fileId || fact.notificationId || fact.threadId || "none");
  const eventKey = sanitizeFragment(fact.eventId);
  const dayKey = sanitizeFragment(fact.dayKey || "none");

  if ((fact.normalizedAction === "daily_checkin_claimed" || fact.normalizedAction === "task_completed") && fact.taskId && fact.dayKey) {
    return [actorKey, fact.normalizedAction, sanitizeFragment(fact.taskId), dayKey].join(":");
  }

  if (windowMs === "event_id") return [actorKey, fact.normalizedAction, entityKey, eventKey].join(":");
  if (windowMs === "permanent") return [actorKey, fact.normalizedAction, entityKey].join(":");
  const bucket = Math.floor(fact.timestampMs / windowMs);
  return [actorKey, fact.normalizedAction, entityKey, bucket].join(":");
}

export function describeBehavioralAction(action: BehavioralNormalizedAction) {
  return BEHAVIORAL_EVENT_LABELS[action];
}

export function getBehavioralActionAliasMap() {
  return ACTION_ALIASES;
}

export function normalizeBehavioralEventFactWithDiagnostics(input: {
  eventId?: unknown;
  eventName?: unknown;
  params?: Record<string, unknown> | null;
  timestamp?: unknown;
  userId?: unknown;
  sessionId?: unknown;
  anonymousVisitorId?: unknown;
  pagePath?: unknown;
  route?: unknown;
  dropId?: unknown;
  creatorId?: unknown;
  assetKey?: unknown;
  assetIndex?: unknown;
  source?: BehavioralEventSource;
  valueUsd?: unknown;
  gumDropsAmount?: unknown;
  confidence?: number;
}) {
  const rawEventName = typeof input.eventName === "string" ? input.eventName.trim() : "";
  const canonicalEventName = rawEventName ? normalizeTelemetryEventName(rawEventName) : "";
  const config = ACTION_ALIASES[canonicalEventName] || ACTION_ALIASES[rawEventName];
  const params = input.params ?? {};
  const merged: Record<string, unknown> = { ...params };
  const writeIfPresent = (key: string, value: unknown) => {
    if (value !== undefined && value !== null && value !== "") merged[key] = value;
  };

  writeIfPresent("eventId", input.eventId);
  writeIfPresent("userId", input.userId);
  writeIfPresent("user_id", input.userId);
  writeIfPresent("sessionId", input.sessionId);
  writeIfPresent("session_id", input.sessionId);
  writeIfPresent("anonymousVisitorId", input.anonymousVisitorId);
  writeIfPresent("anonymous_visitor_id", input.anonymousVisitorId);
  writeIfPresent("pagePath", input.pagePath);
  writeIfPresent("page_path", input.pagePath);
  writeIfPresent("route", input.route);
  writeIfPresent("dropId", input.dropId);
  writeIfPresent("drop_id", input.dropId);
  writeIfPresent("creatorId", input.creatorId);
  writeIfPresent("creator_id", input.creatorId);
  writeIfPresent("assetKey", input.assetKey);
  writeIfPresent("asset_key", input.assetKey);
  writeIfPresent("assetIndex", input.assetIndex);
  writeIfPresent("asset_index", input.assetIndex);

  const source = input.source ?? "client";
  const route = normalizeRoute(readString(merged, "route", "page_path", "pagePath", "path"));
  const sourceComponent = readString(merged, "source_component", "sourceComponent", "component_name", "componentName") || "unknown";

  if (!config) {
    const diagnostic: BehavioralEventFactDiagnostic = {
      eventName: canonicalEventName || rawEventName || "unknown_event",
      rawEventName: rawEventName || "unknown_event",
      route,
      sourceComponent,
      source,
      reason: "unknown_event_name",
    };
    return { fact: null, diagnostic };
  }

  const timestampMs = Math.max(
    0,
    Math.trunc(typeof input.timestamp === "number" && Number.isFinite(input.timestamp)
      ? input.timestamp
      : readNumber(merged, "event_timestamp_ms", "eventTimestampMs")),
  ) || Date.now();
  const userId = readString(merged, "user_id", "userId", "analytics_user_id", "analyticsUserId");
  const sessionId = readString(merged, "session_id", "sessionId", "watch_session_id", "watchSessionId");
  const anonymousVisitorId = readString(merged, "anonymous_visitor_id", "anonymousVisitorId");
  const entityId = resolveEntityId(merged, config);

  if (!route || !sourceComponent) {
    const diagnostic: BehavioralEventFactDiagnostic = {
      eventName: canonicalEventName || rawEventName || "unknown_event",
      rawEventName: rawEventName || "unknown_event",
      route,
      sourceComponent,
      source,
      reason: "missing_required_context",
    };
    return { fact: null, diagnostic };
  }

  const explicitEventId = readString(merged, "eventId", "event_id", "idempotency_key", "idempotencyKey", "dedupeKey");
  const eventId = explicitEventId || [
    config.normalizedAction,
    sanitizeFragment(userId || sessionId || anonymousVisitorId || "anonymous"),
    sanitizeFragment(entityId || "none"),
    timestampMs,
  ].join(":");
  const confidence = Math.max(0, Math.min(1, typeof input.confidence === "number" && Number.isFinite(input.confidence) ? input.confidence : getSourceConfidence(source)));

  const valueUsd = readNumber({ valueUsd: input.valueUsd, ...merged }, "valueUsd", "value_usd", "gross_revenue_usd", "grossRevenueUsd", "amount_usd", "amountUsd", "price_usd", "priceUsd");
  const gumDropsAmount = readNumber({ gumDropsAmount: input.gumDropsAmount, ...merged }, "gumDropsAmount", "gumdrops_amount", "delivered_gumdrops", "deliveredGumDrops", "paid_gumdrops", "paidGumDrops", "amount");

  const factWithoutDedupe: Omit<BehavioralEventFact, "dedupeKey"> = {
    eventId,
    ...(userId ? { userId } : {}),
    ...(sessionId ? { sessionId } : {}),
    ...(anonymousVisitorId ? { anonymousVisitorId } : {}),
    eventName: canonicalEventName || rawEventName,
    rawEventName: rawEventName || canonicalEventName || "unknown_event",
    normalizedAction: config.normalizedAction,
    timestampMs,
    route,
    pagePath: route,
    sourceComponent,
    ...(readOptionalString(merged, "auth_state", "authState") ? { authState: readOptionalString(merged, "auth_state", "authState") } : {}),
    ...(config.entityType ? { entityType: config.entityType } : {}),
    ...(entityId ? { entityId } : {}),
    ...(readOptionalString(merged, "drop_id", "dropId") ? { dropId: readOptionalString(merged, "drop_id", "dropId") } : {}),
    ...(readOptionalString(merged, "file_id", "fileId", "asset_key", "assetKey") ? { fileId: readOptionalString(merged, "file_id", "fileId", "asset_key", "assetKey") } : {}),
    ...(readOptionalNumber(merged, "media_index", "mediaIndex", "asset_index", "assetIndex") !== undefined ? { mediaIndex: readOptionalNumber(merged, "media_index", "mediaIndex", "asset_index", "assetIndex") } : {}),
    ...(readOptionalString(merged, "creator_id", "creatorId") ? { creatorId: readOptionalString(merged, "creator_id", "creatorId") } : {}),
    ...(readOptionalString(merged, "transaction_id", "transactionId", "purchase_id", "purchaseId", "order_id", "orderId") ? { transactionId: readOptionalString(merged, "transaction_id", "transactionId", "purchase_id", "purchaseId", "order_id", "orderId") } : {}),
    ...(readOptionalString(merged, "thread_id", "threadId", "conversation_id", "conversationId") ? { threadId: readOptionalString(merged, "thread_id", "threadId", "conversation_id", "conversationId") } : {}),
    ...(readOptionalString(merged, "notification_id", "notificationId", "tag") ? { notificationId: readOptionalString(merged, "notification_id", "notificationId", "tag") } : {}),
    ...(readOptionalString(merged, "task_id", "taskId", "task_key", "taskKey") ? { taskId: readOptionalString(merged, "task_id", "taskId", "task_key", "taskKey") } : {}),
    ...(readOptionalString(merged, "day_key", "dayKey") ? { dayKey: readOptionalString(merged, "day_key", "dayKey") } : {}),
    ...(valueUsd > 0 ? { valueUsd } : {}),
    ...(gumDropsAmount > 0 ? { gumDropsAmount: Math.round(gumDropsAmount) } : {}),
    ...(readOptionalString(merged, "reason_code", "reasonCode", "security_reason", "securityReason", "error_code", "errorCode") ? { reasonCode: readOptionalString(merged, "reason_code", "reasonCode", "security_reason", "securityReason", "error_code", "errorCode") } : {}),
    source,
    sourceTruth: source,
    confidence,
  };

  return {
    fact: {
      ...factWithoutDedupe,
      dedupeKey: buildDedupeKey(factWithoutDedupe),
    },
    diagnostic: null,
  };
}

export function normalizeBehavioralEventFact(input: Parameters<typeof normalizeBehavioralEventFactWithDiagnostics>[0]) {
  return normalizeBehavioralEventFactWithDiagnostics(input).fact;
}

export function dedupeBehavioralEventFacts(facts: Array<BehavioralEventFact | null | undefined>) {
  const deduped = new Map<string, BehavioralEventFact>();
  facts.forEach((fact) => {
    if (!fact) return;
    const existing = deduped.get(fact.dedupeKey);
    if (!existing || fact.timestampMs > existing.timestampMs) deduped.set(fact.dedupeKey, fact);
  });
  return Array.from(deduped.values()).sort((left, right) => right.timestampMs - left.timestampMs);
}
