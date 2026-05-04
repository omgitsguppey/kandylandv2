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
  guided_onboarding_completed: {
    normalizedAction: "onboarding_completed",
    entityKeys: ["user_id", "userId"],
  },
  onboarding_complete: {
    normalizedAction: "onboarding_completed",
    entityKeys: ["user_id", "userId"],
  },
  onboarding_completed: {
    normalizedAction: "onboarding_completed",
    entityKeys: ["user_id", "userId"],
  },
  daily_check_in_claim: {
    normalizedAction: "daily_checkin_claimed",
    entityKeys: ["task_id", "taskId", "user_id", "userId"],
  },
  daily_reward_claimed: {
    normalizedAction: "daily_checkin_claimed",
    entityKeys: ["task_id", "taskId", "user_id", "userId"],
  },
  drop_clicked: {
    normalizedAction: "drop_viewed",
    entityType: "drop",
    entityKeys: ["drop_id", "dropId"],
  },
  view_drop_details: {
    normalizedAction: "drop_viewed",
    entityType: "drop",
    entityKeys: ["drop_id", "dropId"],
  },
  drop_preview: {
    normalizedAction: "drop_preview_opened",
    entityType: "drop",
    entityKeys: ["drop_id", "dropId"],
  },
  drop_preview_opened: {
    normalizedAction: "drop_preview_opened",
    entityType: "drop",
    entityKeys: ["drop_id", "dropId"],
  },
  drop_preview_page_viewed: {
    normalizedAction: "drop_preview_opened",
    entityType: "drop",
    entityKeys: ["drop_id", "dropId"],
  },
  unlock_drop_success: {
    normalizedAction: "drop_unwrapped",
    entityType: "drop",
    entityKeys: ["drop_id", "dropId", "transaction_id", "transactionId", "idempotency_key", "idempotencyKey"],
  },
  drop_unwrapped: {
    normalizedAction: "drop_unwrapped",
    entityType: "drop",
    entityKeys: ["drop_id", "dropId", "transaction_id", "transactionId"],
  },
  viewer_asset_started: {
    normalizedAction: "file_viewed",
    entityType: "file",
    entityKeys: ["file_id", "fileId", "asset_key", "assetKey", "media_index", "mediaIndex"],
  },
  viewer_asset_changed: {
    normalizedAction: "file_viewed",
    entityType: "file",
    entityKeys: ["file_id", "fileId", "asset_key", "assetKey", "media_index", "mediaIndex"],
  },
  file_viewed: {
    normalizedAction: "file_viewed",
    entityType: "file",
    entityKeys: ["file_id", "fileId", "asset_key", "assetKey", "media_index", "mediaIndex"],
  },
  viewer_session_completed: {
    normalizedAction: "watch_session_completed",
    entityType: "drop",
    entityKeys: ["watch_session_id", "watchSessionId", "drop_id", "dropId"],
  },
  watch_session_completed: {
    normalizedAction: "watch_session_completed",
    entityType: "drop",
    entityKeys: ["watch_session_id", "watchSessionId", "drop_id", "dropId"],
  },
  watch_session_ended: {
    normalizedAction: "watch_session_completed",
    entityType: "drop",
    entityKeys: ["watch_session_id", "watchSessionId", "drop_id", "dropId"],
  },
  watch_score_computed: {
    normalizedAction: "watch_session_completed",
    entityType: "drop",
    entityKeys: ["watch_session_id", "watchSessionId", "drop_id", "dropId"],
  },
  gumdrops_purchase_completed: {
    normalizedAction: "gumdrops_purchased",
    entityType: "wallet",
    entityKeys: ["transaction_id", "transactionId", "purchase_id", "purchaseId", "order_id", "orderId"],
  },
  purchase_verified: {
    normalizedAction: "gumdrops_purchased",
    entityType: "wallet",
    entityKeys: ["transaction_id", "transactionId", "purchase_id", "purchaseId", "order_id", "orderId"],
  },
  purchase: {
    normalizedAction: "gumdrops_purchased",
    entityType: "wallet",
    entityKeys: ["transaction_id", "transactionId", "purchase_id", "purchaseId", "order_id", "orderId"],
  },
  creator_followed: {
    normalizedAction: "creator_followed",
    entityType: "creator",
    entityKeys: ["creator_id", "creatorId"],
  },
  notification_opened: {
    normalizedAction: "notification_opened",
    entityType: "notification",
    entityKeys: ["notification_id", "notificationId", "tag"],
  },
  notification_clicked: {
    normalizedAction: "notification_opened",
    entityType: "notification",
    entityKeys: ["notification_id", "notificationId", "tag"],
  },
  support_ticket_created: {
    normalizedAction: "support_ticket_created",
    entityType: "support",
    entityKeys: ["ticket_id", "ticketId", "thread_id", "threadId"],
  },
  support_ticket_submitted: {
    normalizedAction: "support_ticket_created",
    entityType: "support",
    entityKeys: ["ticket_id", "ticketId", "thread_id", "threadId"],
  },
  feedback_submitted: {
    normalizedAction: "support_ticket_created",
    entityType: "support",
    entityKeys: ["ticket_id", "ticketId", "thread_id", "threadId"],
  },
  bug_report_submitted: {
    normalizedAction: "support_ticket_created",
    entityType: "support",
    entityKeys: ["ticket_id", "ticketId", "thread_id", "threadId"],
  },
  chat_message_sent: {
    normalizedAction: "chat_message_sent",
    entityType: "chat",
    entityKeys: ["message_id", "messageId", "thread_id", "threadId", "conversation_id", "conversationId"],
  },
  creator_message_sent: {
    normalizedAction: "chat_message_sent",
    entityType: "chat",
    entityKeys: ["message_id", "messageId", "thread_id", "threadId", "conversation_id", "conversationId"],
  },
};

function readString(source: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return "";
}

function readNumber(source: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return 0;
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
  const entityKey = sanitizeFragment(fact.entityId || "none");
  const eventKey = sanitizeFragment(fact.eventId);

  if (windowMs === "event_id") {
    return [actorKey, fact.normalizedAction, entityKey, eventKey].join(":");
  }

  if (windowMs === "permanent") {
    return [actorKey, fact.normalizedAction, entityKey].join(":");
  }

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
    if (value !== undefined && value !== null && value !== "") {
      merged[key] = value;
    }
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
  const sourceComponent = readString(merged, "source_component", "sourceComponent", "component_name", "componentName")
    || "unknown";

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
  const eventId = explicitEventId
    || [
      config.normalizedAction,
      sanitizeFragment(userId || sessionId || anonymousVisitorId || "anonymous"),
      sanitizeFragment(entityId || "none"),
      timestampMs,
    ].join(":");
  const confidence = Math.max(
    0,
    Math.min(
      1,
      typeof input.confidence === "number" && Number.isFinite(input.confidence)
        ? input.confidence
        : getSourceConfidence(source),
    ),
  );

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
    sourceComponent,
    ...(config.entityType ? { entityType: config.entityType } : {}),
    ...(entityId ? { entityId } : {}),
    ...(readNumber({ valueUsd: input.valueUsd, ...merged }, "valueUsd", "value_usd", "gross_revenue_usd", "grossRevenueUsd", "amount_usd", "amountUsd", "price_usd", "priceUsd") > 0
      ? { valueUsd: readNumber({ valueUsd: input.valueUsd, ...merged }, "valueUsd", "value_usd", "gross_revenue_usd", "grossRevenueUsd", "amount_usd", "amountUsd", "price_usd", "priceUsd") }
      : {}),
    ...(readNumber({ gumDropsAmount: input.gumDropsAmount, ...merged }, "gumDropsAmount", "gumdrops_amount", "gumDropsAmount", "delivered_gumdrops", "deliveredGumDrops", "paid_gumdrops", "paidGumDrops", "amount") > 0
      ? { gumDropsAmount: Math.round(readNumber({ gumDropsAmount: input.gumDropsAmount, ...merged }, "gumDropsAmount", "gumdrops_amount", "gumDropsAmount", "delivered_gumdrops", "deliveredGumDrops", "paid_gumdrops", "paidGumDrops", "amount")) }
      : {}),
    source,
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
    if (!existing || fact.timestampMs > existing.timestampMs) {
      deduped.set(fact.dedupeKey, fact);
    }
  });
  return Array.from(deduped.values()).sort((left, right) => right.timestampMs - left.timestampMs);
}
