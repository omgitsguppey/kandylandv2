import { normalizeBehavioralEventFact } from "@/lib/behavioral/normalize-event-fact";
import type { BehavioralEventFact, BehavioralNormalizedAction } from "@/lib/behavioral/event-fact-contract";

export type IdentifiedMetricFamily =
  | "auth"
  | "onboarding"
  | "task"
  | "content"
  | "watch"
  | "commerce"
  | "creator"
  | "chat"
  | "notification"
  | "support"
  | "admin"
  | "security";

export type IdentifiedMetricSourceTruth = "client" | "server" | "canonical" | "materialized" | "legacy" | "local_projection";

export type IdentifiedMetricExclusionReason =
  | "admin_event"
  | "admin_projection"
  | "creator_admin_event"
  | "notification_diagnostic_only"
  | "privacy_limited"
  | "unsupported_event"
  | "missing_required_context"
  | "non_behavioral_identity_link";

export type IdentifiedMetricParityFact = {
  behavioralFact: BehavioralEventFact | null;
  normalizedAction: BehavioralNormalizedAction | "";
  metricFamily: IdentifiedMetricFamily | "";
  actorUserId: string;
  actorAdminId: string;
  actorCreatorId: string;
  targetUserId: string;
  targetCreatorId: string;
  targetDropId: string;
  targetFileId: string;
  targetThreadId: string;
  transactionId: string;
  sourceTruth: IdentifiedMetricSourceTruth;
  sourceConfidence: number;
  metricEligible: boolean;
  metricExclusionReason: IdentifiedMetricExclusionReason | "";
  reasonCode: string;
};

type NormalizeInput = {
  eventId: string;
  eventName: string;
  params: Record<string, unknown>;
  timestamp: number;
  callerUid: string;
  pagePath: string;
  includeInUserBehavior: boolean;
  actorType?: string;
  actorLane?: string;
  sourceTruth?: IdentifiedMetricSourceTruth;
};

const NORMALIZED_ACTION_FAMILY: Partial<Record<BehavioralNormalizedAction, IdentifiedMetricFamily>> = {
  signup_started: "auth",
  signup_completed: "auth",
  onboarding_started: "onboarding",
  onboarding_completed: "onboarding",
  daily_checkin_claimed: "task",
  task_ready: "task",
  task_completed: "task",
  creator_spotlight_viewed: "creator",
  drop_viewed: "content",
  drop_card_viewed: "content",
  drop_preview_opened: "content",
  drop_preview_cta_clicked: "content",
  drop_unwrap_attempted: "commerce",
  drop_unwrapped: "commerce",
  drop_unwrap_failed: "commerce",
  file_viewed: "watch",
  watch_session_started: "watch",
  watch_session_tick: "watch",
  watch_session_completed: "watch",
  wallet_opened: "commerce",
  wallet_package_selected: "commerce",
  checkout_started: "commerce",
  gumdrops_purchased: "commerce",
  purchase_failed: "commerce",
  creator_followed: "creator",
  creator_unfollowed: "creator",
  fan_pass_started: "creator",
  fan_pass_failed: "creator",
  custom_request_started: "creator",
  custom_request_submitted: "creator",
  booking_started: "creator",
  booking_failed: "creator",
  booking_completed: "creator",
  chat_thread_opened: "chat",
  chat_message_sent: "chat",
  chat_message_failed: "chat",
  notification_opened: "notification",
  notification_read: "notification",
  notification_action_clicked: "notification",
  support_ticket_created: "support",
  support_reply_viewed: "support",
  support_reply_sent: "support",
  bug_report_submitted: "support",
  moderation_signal_recorded: "security",
  entitlement_violation_recorded: "security",
  admin_user_opened: "admin",
  admin_user_action_taken: "admin",
};

function readString(params: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = params[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return "";
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function isProjectionEvent(params: Record<string, unknown>, eventName: string) {
  return eventName.startsWith("admin_view_as_")
    || eventName.startsWith("admin_projection_")
    || eventName.includes("projection")
    || readString(params, "performed_as", "performedAs") === "admin_view_as_creator"
    || readString(params, "source_truth", "sourceTruth") === "local_projection"
    || readString(params, "projection_mode", "projectionMode", "view_as_mode", "viewAsMode") === "read_only_creator_projection";
}

function resolveMetricFamily(action: BehavioralNormalizedAction | ""): IdentifiedMetricFamily | "" {
  return action ? (NORMALIZED_ACTION_FAMILY[action] ?? "") : "";
}

function resolveMetricEligibility(input: {
  eventName: string;
  metricFamily: IdentifiedMetricFamily | "";
  includeInUserBehavior: boolean;
  actorAdminId: string;
  actorCreatorId: string;
  sourceTruth: IdentifiedMetricSourceTruth;
  params: Record<string, unknown>;
}) {
  if (isProjectionEvent(input.params, input.eventName)) {
    return {
      metricEligible: false,
      metricExclusionReason: "admin_projection" as const,
    };
  }

  if (input.actorAdminId || input.metricFamily === "admin") {
    return {
      metricEligible: false,
      metricExclusionReason: "admin_event" as const,
    };
  }

  if (input.actorCreatorId && readString(input.params, "admin_id", "adminId")) {
    return {
      metricEligible: false,
      metricExclusionReason: "creator_admin_event" as const,
    };
  }

  if (!input.includeInUserBehavior) {
    return {
      metricEligible: false,
      metricExclusionReason: "unsupported_event" as const,
    };
  }

  if (input.metricFamily === "notification" && input.eventName !== "notification_read") {
    return {
      metricEligible: false,
      metricExclusionReason: "notification_diagnostic_only" as const,
    };
  }

  if (input.eventName === "identity_linked") {
    return {
      metricEligible: false,
      metricExclusionReason: "non_behavioral_identity_link" as const,
    };
  }

  if (readString(input.params, "privacy_exclusion_reason", "privacyExclusionReason", "metric_exclusion_reason", "metricExclusionReason") === "privacy_limited") {
    return {
      metricEligible: false,
      metricExclusionReason: "privacy_limited" as const,
    };
  }

  return {
    metricEligible: true,
    metricExclusionReason: "" as const,
  };
}

export function normalizeIdentifiedMetricEventFact(input: NormalizeInput): IdentifiedMetricParityFact {
  const params = input.params;
  const actorAdminId = readString(params, "actor_admin_id", "actorAdminId", "admin_id", "adminId");
  const actorCreatorId = input.actorType === "creator"
    ? (readString(params, "actor_creator_id", "actorCreatorId", "creator_actor_id", "creatorActorId", "creator_uid", "creatorUid", "user_id", "userId") || input.callerUid)
    : "";
  const actorUserId = input.actorType === "user" || (!actorAdminId && !actorCreatorId)
    ? (readString(params, "actor_user_id", "actorUserId", "user_id", "userId") || input.callerUid)
    : "";
  const targetCreatorId = readString(params, "target_creator_id", "targetCreatorId", "creator_id", "creatorId");
  const targetUserId = readString(params, "target_user_id", "targetUserId", "subject_user_id", "subjectUserId");
  const targetDropId = readString(params, "drop_id", "dropId", "target_drop_id", "targetDropId");
  const targetFileId = readString(params, "file_id", "fileId", "asset_key", "assetKey", "target_file_id", "targetFileId");
  const targetThreadId = readString(params, "thread_id", "threadId", "conversation_id", "conversationId", "ticket_id", "ticketId");
  const transactionId = readString(params, "transaction_id", "transactionId", "purchase_id", "purchaseId", "order_id", "orderId");

  const behavioral = normalizeBehavioralEventFact({
    eventId: input.eventId,
    eventName: input.eventName,
    params,
    timestamp: input.timestamp,
    userId: actorUserId,
    sessionId: readString(params, "session_id", "sessionId"),
    anonymousVisitorId: readString(params, "anonymous_visitor_id", "anonymousVisitorId"),
    pagePath: input.pagePath,
    route: input.pagePath,
    dropId: targetDropId,
    creatorId: targetCreatorId,
    assetKey: targetFileId,
    assetIndex: params.asset_index ?? params.assetIndex ?? params.media_index ?? params.mediaIndex,
    source: input.sourceTruth === "canonical"
      ? "server"
      : input.sourceTruth === "materialized"
        ? "materialized"
        : input.sourceTruth === "legacy"
          ? "legacy"
          : input.sourceTruth === "client" || input.sourceTruth === "local_projection"
            ? "client"
            : "server",
    valueUsd: params.gross_revenue_usd ?? params.grossRevenueUsd ?? params.amount_usd ?? params.amountUsd ?? params.value_usd ?? params.valueUsd,
    gumDropsAmount: params.delivered_gumdrops ?? params.deliveredGumDrops ?? params.gumdrops_amount ?? params.gumDropsAmount,
  });

  const normalizedAction = behavioral?.normalizedAction ?? "";
  const metricFamily = resolveMetricFamily(normalizedAction);
  const sourceConfidence = clamp01(
    typeof behavioral?.confidence === "number"
      ? behavioral.confidence
      : input.sourceTruth === "canonical" ? 1
      : input.sourceTruth === "server" ? 0.98
      : input.sourceTruth === "materialized" ? 0.9
      : input.sourceTruth === "legacy" ? 0.45
      : input.sourceTruth === "local_projection" ? 0.2
      : 0.75,
  );
  const eligibility = resolveMetricEligibility({
    eventName: input.eventName,
    metricFamily,
    includeInUserBehavior: input.includeInUserBehavior,
    actorAdminId,
    actorCreatorId,
    sourceTruth: input.sourceTruth ?? "server",
    params,
  });

  return {
    behavioralFact: behavioral,
    normalizedAction,
    metricFamily,
    actorUserId,
    actorAdminId,
    actorCreatorId,
    targetUserId,
    targetCreatorId,
    targetDropId,
    targetFileId,
    targetThreadId,
    transactionId,
    sourceTruth: input.sourceTruth ?? "server",
    sourceConfidence,
    metricEligible: eligibility.metricEligible,
    metricExclusionReason: eligibility.metricExclusionReason,
    reasonCode: readString(params, "reason_code", "reasonCode", "security_reason", "securityReason", "error_code", "errorCode"),
  };
}
