import type { PublicBetaHealthDimension } from "@/lib/agent-score/core";
import type { ChatMessageKind, ChatViewerRole } from "@/lib/chat";
import {
  CHAT_MEDIA_LIMIT_BYTES_DEFAULT,
  CHAT_MEDIA_LIMIT_BYTES_FAN_PASS,
} from "@/lib/chat/chat-media-limits";
import { isSupportedChatAttachmentMimeType } from "@/lib/chat-attachments";

export const CHAT_MESSAGE_PRICE_GD = {
  text: 1,
  image: 5,
  video: 10,
} as const satisfies Record<ChatMessageKind, number>;

export const CHAT_GATING_STATUSES = [
  "allowed",
  "blocked_insufficient_paid_gd",
  "blocked_media_too_large",
  "blocked_unsupported_media",
  "blocked_moderation",
  "blocked_thread_visibility",
  "blocked_auth",
  "blocked_unknown",
] as const;

export type ChatGatingStatus = typeof CHAT_GATING_STATUSES[number];

export type ChatGatingBypass = "fan_pass_subscriber" | "creator_reply" | null;

export const CHAT_GATING_DEBUG_LANE = "Chat gating/moderation" as const;

export type ChatGatingTelemetryEventName =
  | "chat_gating_checked"
  | "chat_send_blocked"
  | "chat_insufficient_paid_gd_viewed"
  | "chat_purchase_cta_clicked"
  | "chat_media_upload_blocked"
  | "chat_moderation_blocked"
  | "chat_fan_pass_bypass_applied"
  | "chat_creator_reply_bypass_applied";

export type ChatGatingTelemetryEvent = {
  eventName: ChatGatingTelemetryEventName;
  featureId: "support";
  surface: "chat";
  materializerLane: "support_materializer";
  debugLane: typeof CHAT_GATING_DEBUG_LANE;
  identityAware: true;
  consentAware: true;
  debugVisible: true;
  owner: "chat-gating";
  scoreImpact: "sourceHealth.runtimeHealth.evidenceCompleteness.regressionRisk";
};

export const CHAT_GATING_MODERATION_TELEMETRY_EVENTS: readonly ChatGatingTelemetryEvent[] = [
  "chat_gating_checked",
  "chat_send_blocked",
  "chat_insufficient_paid_gd_viewed",
  "chat_purchase_cta_clicked",
  "chat_media_upload_blocked",
  "chat_moderation_blocked",
  "chat_fan_pass_bypass_applied",
  "chat_creator_reply_bypass_applied",
].map((eventName) => ({
  eventName: eventName as ChatGatingTelemetryEventName,
  featureId: "support",
  surface: "chat",
  materializerLane: "support_materializer",
  debugLane: CHAT_GATING_DEBUG_LANE,
  identityAware: true,
  consentAware: true,
  debugVisible: true,
  owner: "chat-gating",
  scoreImpact: "sourceHealth.runtimeHealth.evidenceCompleteness.regressionRisk",
}));

export type ChatGatingDecisionInput = {
  viewerRole: ChatViewerRole;
  messageKind: ChatMessageKind;
  purchasedBalanceGd: number;
  rewardBalanceGd: number;
  subscriberFreeChatApplies: boolean;
  fanPassActive: boolean;
  media: {
    mimeType: string;
    sizeBytes: number;
  } | null;
  threadVisible: boolean;
  authenticated: boolean;
  moderationAllowed: boolean;
};

export type ChatGatingDecision = {
  status: ChatGatingStatus;
  allowed: boolean;
  bypass: ChatGatingBypass;
  requiredPriceGd: number;
  purchasedBalanceGd: number;
  rewardBalanceGd: number;
  paidGdOnly: true;
  rewardGdAccepted: false;
  paidGdShortfall: number;
  maxMediaBytes: number;
  humanSafeErrorCode:
    | "none"
    | "unauthorized"
    | "thread_not_visible"
    | "insufficient_paid_gumdrops"
    | "unsupported_attachment_type"
    | "file_too_large_requires_fan_pass"
    | "fan_pass_file_limit_exceeded"
    | "moderation_blocked"
    | "unknown_chat_block";
};

export type ChatGatingDebugLane = {
  label: typeof CHAT_GATING_DEBUG_LANE;
  backendEnforcement: boolean;
  uiOnlyGate: false;
  paidGdOnlyRule: true;
  rewardFreeGdDisallowed: true;
  fanPassSubscriberBypass: true;
  creatorReplyBypass: true;
  moderationStatusVisible: true;
  mediaLimitBlocksVisible: true;
  blockedAttempts: number;
  insufficientPaidGdAttempts: number;
  moderationBlocks: number;
  mediaLimitBlocks: number;
  bypassCounts: {
    fanPassSubscriber: number;
    creatorReply: number;
  };
  sourceOfFundsTruthStatus: "purchased_only_enforced";
  rawMessageDumpDefault: false;
  scoreDimensionsAffected: readonly PublicBetaHealthDimension[];
};

export type ChatGatingSourceValidation = {
  backendEnforcesPaidOnly: boolean;
  rejectsRewardFreeGd: boolean;
  doesNotTrustClientPriceOrBalance: boolean;
  idempotencyKeyRequired: boolean;
  blockedSendTelemetry: boolean;
  humanSafeBlockedErrors: boolean;
  mediaLimitsEnforcedServerSide: boolean;
  moderationStatusDebugVisible: boolean;
  gumdropMathUntouched: boolean;
  failures: string[];
};

function normalizeGd(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

export function resolveChatGatingDecision(input: ChatGatingDecisionInput): ChatGatingDecision {
  const bypass: ChatGatingBypass = input.viewerRole === "creator"
    ? "creator_reply"
    : input.subscriberFreeChatApplies
      ? "fan_pass_subscriber"
      : null;
  const requiredPriceGd = bypass ? 0 : CHAT_MESSAGE_PRICE_GD[input.messageKind];
  const purchasedBalanceGd = normalizeGd(input.purchasedBalanceGd);
  const rewardBalanceGd = normalizeGd(input.rewardBalanceGd);
  const maxMediaBytes = input.fanPassActive ? CHAT_MEDIA_LIMIT_BYTES_FAN_PASS : CHAT_MEDIA_LIMIT_BYTES_DEFAULT;
  const paidGdShortfall = Math.max(0, requiredPriceGd - purchasedBalanceGd);

  const base = {
    bypass,
    requiredPriceGd,
    purchasedBalanceGd,
    rewardBalanceGd,
    paidGdOnly: true as const,
    rewardGdAccepted: false as const,
    paidGdShortfall,
    maxMediaBytes,
  };

  if (!input.authenticated) {
    return { ...base, status: "blocked_auth", allowed: false, humanSafeErrorCode: "unauthorized" };
  }
  if (!input.threadVisible) {
    return { ...base, status: "blocked_thread_visibility", allowed: false, humanSafeErrorCode: "thread_not_visible" };
  }
  if (!input.moderationAllowed) {
    return { ...base, status: "blocked_moderation", allowed: false, humanSafeErrorCode: "moderation_blocked" };
  }
  if (input.media && !isSupportedChatAttachmentMimeType(input.media.mimeType)) {
    return { ...base, status: "blocked_unsupported_media", allowed: false, humanSafeErrorCode: "unsupported_attachment_type" };
  }
  if (input.media && normalizeGd(input.media.sizeBytes) > maxMediaBytes) {
    return {
      ...base,
      status: "blocked_media_too_large",
      allowed: false,
      humanSafeErrorCode: input.fanPassActive ? "fan_pass_file_limit_exceeded" : "file_too_large_requires_fan_pass",
    };
  }
  if (!bypass && paidGdShortfall > 0) {
    return {
      ...base,
      status: "blocked_insufficient_paid_gd",
      allowed: false,
      humanSafeErrorCode: "insufficient_paid_gumdrops",
    };
  }

  return { ...base, status: "allowed", allowed: true, humanSafeErrorCode: "none" };
}

export function buildChatGatingDebugLane(input: {
  blockedAttempts?: number;
  insufficientPaidGdAttempts?: number;
  moderationBlocks?: number;
  mediaLimitBlocks?: number;
  fanPassSubscriberBypassCount?: number;
  creatorReplyBypassCount?: number;
} = {}): ChatGatingDebugLane {
  return {
    label: CHAT_GATING_DEBUG_LANE,
    backendEnforcement: true,
    uiOnlyGate: false,
    paidGdOnlyRule: true,
    rewardFreeGdDisallowed: true,
    fanPassSubscriberBypass: true,
    creatorReplyBypass: true,
    moderationStatusVisible: true,
    mediaLimitBlocksVisible: true,
    blockedAttempts: normalizeGd(input.blockedAttempts),
    insufficientPaidGdAttempts: normalizeGd(input.insufficientPaidGdAttempts),
    moderationBlocks: normalizeGd(input.moderationBlocks),
    mediaLimitBlocks: normalizeGd(input.mediaLimitBlocks),
    bypassCounts: {
      fanPassSubscriber: normalizeGd(input.fanPassSubscriberBypassCount),
      creatorReply: normalizeGd(input.creatorReplyBypassCount),
    },
    sourceOfFundsTruthStatus: "purchased_only_enforced",
    rawMessageDumpDefault: false,
    scoreDimensionsAffected: ["sourceHealth", "runtimeHealth", "evidenceCompleteness", "regressionRisk"],
  };
}

export function buildChatGatingTelemetryPayload(input: {
  eventName: ChatGatingTelemetryEventName;
  userId?: string | null;
  threadId?: string | null;
  creatorId?: string | null;
  messageKind?: ChatMessageKind | null;
  status?: ChatGatingStatus | null;
  bypass?: ChatGatingBypass;
  errorCode?: string | null;
  requiredPriceGd?: number | null;
  purchasedBalanceGd?: number | null;
  paidGdShortfall?: number | null;
  sourceComponent?: string | null;
}) {
  return {
    event_name: input.eventName,
    feature_id: "support",
    surface: "chat",
    route: "/dashboard/chat",
    debug_lane: CHAT_GATING_DEBUG_LANE,
    materializer_lane: "support_materializer",
    identity_aware: true,
    consent_aware: true,
    debug_visible: true,
    user_id_present: Boolean(input.userId),
    thread_id_present: Boolean(input.threadId),
    creator_id_present: Boolean(input.creatorId),
    paid_gd_only: true,
    reward_gd_accepted: false,
    ...(input.threadId ? { thread_id: input.threadId } : {}),
    ...(input.creatorId ? { creator_id: input.creatorId } : {}),
    ...(input.messageKind ? { message_kind: input.messageKind } : {}),
    ...(input.status ? { gating_status: input.status } : {}),
    ...(input.bypass ? { bypass: input.bypass } : {}),
    ...(input.errorCode ? { error_code: input.errorCode } : {}),
    ...(typeof input.requiredPriceGd === "number" ? { required_price_gd: normalizeGd(input.requiredPriceGd) } : {}),
    ...(typeof input.purchasedBalanceGd === "number" ? { purchased_balance_gd: normalizeGd(input.purchasedBalanceGd) } : {}),
    ...(typeof input.paidGdShortfall === "number" ? { paid_gd_shortfall: normalizeGd(input.paidGdShortfall) } : {}),
    ...(input.sourceComponent ? { source_component: input.sourceComponent } : {}),
  };
}

export function validateChatGatingSource(validation: ChatGatingSourceValidation) {
  const failures = [...validation.failures];
  if (!validation.backendEnforcesPaidOnly) failures.push("UI-only gate without backend enforcement.");
  if (!validation.rejectsRewardFreeGd) failures.push("paid chat can use reward/free GD.");
  if (!validation.doesNotTrustClientPriceOrBalance) failures.push("client can spoof price/balance.");
  if (!validation.idempotencyKeyRequired) failures.push("idempotency key missing.");
  if (!validation.blockedSendTelemetry) failures.push("blocked send lacks telemetry.");
  if (!validation.humanSafeBlockedErrors) failures.push("blocked send lacks human-safe error.");
  if (!validation.mediaLimitsEnforcedServerSide) failures.push("media limits not enforced.");
  if (!validation.moderationStatusDebugVisible) failures.push("moderation status not debug-visible.");
  if (!validation.gumdropMathUntouched) failures.push("GumDrop math/source-of-funds changed.");
  return [...new Set(failures)];
}
