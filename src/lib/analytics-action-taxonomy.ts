export const USER_ACTION_NAMES = [
  "onboarding_completed",
  "daily_checkin_claimed",
  "drop_viewed",
  "drop_preview_opened",
  "drop_unwrapped",
  "file_viewed",
  "watch_session_completed",
  "gumdrops_purchased",
  "creator_followed",
  "notification_opened",
  "support_ticket_created",
  "chat_message_sent",
] as const;

export type UserActionName = typeof USER_ACTION_NAMES[number];

export type UserActionEntityType =
  | "chat_thread"
  | "creator"
  | "drop"
  | "file"
  | "notification"
  | "support_ticket"
  | "transaction"
  | "user"
  | "unknown";

export type NormalizedUserAction = {
  actionName: UserActionName;
  actionId: string;
  timestamp: number;
  userId: string;
  sessionId: string;
  sourceComponent: string;
  route: string;
  entityId: string | null;
  entityType: UserActionEntityType;
  rawEventName: string;
};

export type UserActionLedgerItem = NormalizedUserAction & {
  label: string;
};

type ActionAliasConfig = {
  actionName: UserActionName;
  entityType: UserActionEntityType;
  entityKeys: string[];
};

const ACTION_ALIASES: Record<string, ActionAliasConfig> = {
  guided_onboarding_completed: {
    actionName: "onboarding_completed",
    entityType: "user",
    entityKeys: ["user_id", "userId"],
  },
  onboarding_completed: {
    actionName: "onboarding_completed",
    entityType: "user",
    entityKeys: ["user_id", "userId"],
  },
  onboarding_complete: {
    actionName: "onboarding_completed",
    entityType: "user",
    entityKeys: ["user_id", "userId"],
  },
  daily_check_in_claim: {
    actionName: "daily_checkin_claimed",
    entityType: "user",
    entityKeys: ["task_id", "taskId", "user_id", "userId"],
  },
  daily_reward_claimed: {
    actionName: "daily_checkin_claimed",
    entityType: "user",
    entityKeys: ["task_id", "taskId", "user_id", "userId"],
  },
  drop_clicked: {
    actionName: "drop_viewed",
    entityType: "drop",
    entityKeys: ["drop_id", "dropId"],
  },
  view_drop_details: {
    actionName: "drop_viewed",
    entityType: "drop",
    entityKeys: ["drop_id", "dropId"],
  },
  drop_preview_opened: {
    actionName: "drop_preview_opened",
    entityType: "drop",
    entityKeys: ["drop_id", "dropId"],
  },
  drop_preview_page_viewed: {
    actionName: "drop_preview_opened",
    entityType: "drop",
    entityKeys: ["drop_id", "dropId"],
  },
  unlock_drop_success: {
    actionName: "drop_unwrapped",
    entityType: "drop",
    entityKeys: ["drop_id", "dropId", "transaction_id", "transactionId", "idempotency_key", "idempotencyKey"],
  },
  drop_unwrapped: {
    actionName: "drop_unwrapped",
    entityType: "drop",
    entityKeys: ["drop_id", "dropId", "transaction_id", "transactionId"],
  },
  viewer_asset_started: {
    actionName: "file_viewed",
    entityType: "file",
    entityKeys: ["file_id", "fileId", "asset_key", "assetKey", "media_index", "mediaIndex"],
  },
  viewer_asset_changed: {
    actionName: "file_viewed",
    entityType: "file",
    entityKeys: ["file_id", "fileId", "asset_key", "assetKey", "media_index", "mediaIndex"],
  },
  file_viewed: {
    actionName: "file_viewed",
    entityType: "file",
    entityKeys: ["file_id", "fileId", "asset_key", "assetKey", "media_index", "mediaIndex"],
  },
  viewer_session_completed: {
    actionName: "watch_session_completed",
    entityType: "drop",
    entityKeys: ["watch_session_id", "watchSessionId", "drop_id", "dropId"],
  },
  watch_session_ended: {
    actionName: "watch_session_completed",
    entityType: "drop",
    entityKeys: ["watch_session_id", "watchSessionId", "drop_id", "dropId"],
  },
  watch_score_computed: {
    actionName: "watch_session_completed",
    entityType: "drop",
    entityKeys: ["watch_session_id", "watchSessionId", "drop_id", "dropId"],
  },
  gumdrops_purchase_completed: {
    actionName: "gumdrops_purchased",
    entityType: "transaction",
    entityKeys: ["transaction_id", "transactionId", "purchase_id", "purchaseId", "order_id", "orderId"],
  },
  purchase_verified: {
    actionName: "gumdrops_purchased",
    entityType: "transaction",
    entityKeys: ["transaction_id", "transactionId", "purchase_id", "purchaseId", "order_id", "orderId"],
  },
  purchase: {
    actionName: "gumdrops_purchased",
    entityType: "transaction",
    entityKeys: ["transaction_id", "transactionId", "purchase_id", "purchaseId", "order_id", "orderId"],
  },
  creator_followed: {
    actionName: "creator_followed",
    entityType: "creator",
    entityKeys: ["creator_id", "creatorId"],
  },
  notification_opened: {
    actionName: "notification_opened",
    entityType: "notification",
    entityKeys: ["notification_id", "notificationId", "tag"],
  },
  notification_clicked: {
    actionName: "notification_opened",
    entityType: "notification",
    entityKeys: ["notification_id", "notificationId", "tag"],
  },
  support_ticket_created: {
    actionName: "support_ticket_created",
    entityType: "support_ticket",
    entityKeys: ["ticket_id", "ticketId", "thread_id", "threadId"],
  },
  support_ticket_submitted: {
    actionName: "support_ticket_created",
    entityType: "support_ticket",
    entityKeys: ["ticket_id", "ticketId", "thread_id", "threadId"],
  },
  feedback_submitted: {
    actionName: "support_ticket_created",
    entityType: "support_ticket",
    entityKeys: ["ticket_id", "ticketId", "thread_id", "threadId"],
  },
  bug_report_submitted: {
    actionName: "support_ticket_created",
    entityType: "support_ticket",
    entityKeys: ["ticket_id", "ticketId", "thread_id", "threadId"],
  },
  chat_message_sent: {
    actionName: "chat_message_sent",
    entityType: "chat_thread",
    entityKeys: ["thread_id", "threadId", "conversation_id", "conversationId", "message_id", "messageId"],
  },
  creator_message_sent: {
    actionName: "chat_message_sent",
    entityType: "chat_thread",
    entityKeys: ["thread_id", "threadId", "conversation_id", "conversationId", "message_id", "messageId"],
  },
};

const ACTION_LABELS: Record<UserActionName, string> = {
  onboarding_completed: "Onboarding completed",
  daily_checkin_claimed: "Daily check-in claimed",
  drop_viewed: "Drop viewed",
  drop_preview_opened: "Drop preview opened",
  drop_unwrapped: "Drop unwrapped",
  file_viewed: "File viewed",
  watch_session_completed: "Watch session completed",
  gumdrops_purchased: "GumDrops refilled",
  creator_followed: "Creator followed",
  notification_opened: "Notification opened",
  support_ticket_created: "Support ticket created",
  chat_message_sent: "Chat message sent",
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

function readNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeRoute(route: string) {
  if (!route) return "/unknown";
  return route.startsWith("/") ? route : `/${route}`;
}

function sanitizeDedupeFragment(value: string) {
  return value.replace(/[^A-Za-z0-9:_-]+/gu, "_").slice(0, 80) || "none";
}

export function describeUserActionName(actionName: UserActionName) {
  return ACTION_LABELS[actionName];
}

export function getUserActionAliasMap() {
  return ACTION_ALIASES;
}

export function normalizeUserAction(input: {
  eventId?: unknown;
  eventName?: unknown;
  params?: Record<string, unknown> | null;
  timestamp?: unknown;
  userId?: unknown;
  sessionId?: unknown;
  pagePath?: unknown;
  route?: unknown;
  dropId?: unknown;
  creatorId?: unknown;
  assetKey?: unknown;
  assetIndex?: unknown;
}): NormalizedUserAction | null {
  const rawEventName = typeof input.eventName === "string" ? input.eventName.trim() : "";
  const config = ACTION_ALIASES[rawEventName];
  if (!config) {
    return null;
  }

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
  const timestamp = Math.max(0, Math.trunc(readNumber(input.timestamp, readNumber(params.event_timestamp_ms, Date.now()))));
  const userId = readString(merged, "user_id", "userId", "analytics_user_id", "analyticsUserId") || "anonymous";
  const sessionId = readString(merged, "session_id", "sessionId", "watch_session_id", "watchSessionId") || "unknown_session";
  const sourceComponent = readString(merged, "source_component", "sourceComponent", "component_name", "componentName") || "unknown";
  const route = normalizeRoute(readString(merged, "route", "page_path", "pagePath", "path"));
  const entityId = readString(merged, ...config.entityKeys)
    || (config.entityType === "drop" ? readString(merged, "drop_id", "dropId") : "")
    || (config.entityType === "creator" ? readString(merged, "creator_id", "creatorId") : "")
    || null;
  const explicitEventId = readString(merged, "eventId", "event_id", "idempotency_key", "idempotencyKey", "dedupeKey");
  const bucketMs = 10_000;
  const timeBucket = Math.floor(timestamp / bucketMs);
  const actionId = explicitEventId
    ? `${config.actionName}:${sanitizeDedupeFragment(explicitEventId)}`
    : [
      config.actionName,
      sanitizeDedupeFragment(userId),
      sanitizeDedupeFragment(sessionId),
      sanitizeDedupeFragment(config.entityType),
      sanitizeDedupeFragment(entityId ?? "none"),
      timeBucket,
    ].join(":");

  return {
    actionName: config.actionName,
    actionId,
    timestamp,
    userId,
    sessionId,
    sourceComponent,
    route,
    entityId,
    entityType: config.entityType,
    rawEventName,
  };
}

export function dedupeNormalizedUserActions(actions: Array<NormalizedUserAction | null | undefined>) {
  const deduped = new Map<string, NormalizedUserAction>();
  actions.forEach((action) => {
    if (!action) return;
    const existing = deduped.get(action.actionId);
    if (!existing || action.timestamp > existing.timestamp) {
      deduped.set(action.actionId, action);
    }
  });
  return Array.from(deduped.values()).sort((left, right) => right.timestamp - left.timestamp);
}

export function toUserActionLedgerItem(action: NormalizedUserAction): UserActionLedgerItem {
  return {
    ...action,
    label: describeUserActionName(action.actionName),
  };
}
