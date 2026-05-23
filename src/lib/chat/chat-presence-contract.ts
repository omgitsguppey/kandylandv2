import type { ChatViewerRole } from "@/lib/chat";
import type { PublicBetaHealthDimension } from "@/lib/agent-score/core";

export const CHAT_PRESENCE_TELEMETRY_EVENT_NAMES = [
  "chat_typing_started",
  "chat_typing_stopped",
  "chat_presence_connected",
  "chat_presence_disconnected",
  "chat_presence_error",
] as const;

export type ChatPresenceTelemetryEventName = typeof CHAT_PRESENCE_TELEMETRY_EVENT_NAMES[number];

export type ChatPresenceTelemetryDefinition = {
  eventName: ChatPresenceTelemetryEventName;
  featureId: "support";
  surface: "chat";
  debugLane: "Chat presence/typing";
  sampled: true;
  perKeystrokeAllowed: false;
  debugVisible: true;
  consentAware: true;
  identityAware: true;
};

export const CHAT_PRESENCE_TELEMETRY_EVENTS: readonly ChatPresenceTelemetryDefinition[] =
  CHAT_PRESENCE_TELEMETRY_EVENT_NAMES.map((eventName) => ({
    eventName,
    featureId: "support",
    surface: "chat",
    debugLane: "Chat presence/typing",
    sampled: true,
    perKeystrokeAllowed: false,
    debugVisible: true,
    consentAware: true,
    identityAware: true,
  }));

export type ChatPresencePayload = {
  typing: boolean;
  activeAt: number;
  role: ChatViewerRole;
  threadId: string;
  userId: string;
  displayName?: string;
};

export const CHAT_PRESENCE_CONTRACT = {
  storage: {
    root: "chat_presence",
    presencePathPattern: "chat_presence/{creatorId}/{userId}/{uid}",
    typingPathPattern: "chat_presence/{creatorId}/{userId}/{uid}/typing",
  },
  payloadFields: ["typing", "activeAt", "role", "threadId", "userId"] as const,
  presence: {
    activeAtField: "activeAt",
    ttlMs: 45_000,
    heartbeatMs: 30_000,
  },
  typing: {
    typingField: "typing",
    writeThrottleMs: 3_000,
    stopTimeoutMs: 4_000,
    maxStaleTypingMs: 10_000,
  },
  cleanup: {
    onDisconnectRemove: true,
    clearOnTimeout: true,
    clearOnBlur: true,
    clearOnSend: true,
    clearOnClose: true,
    clearOnUnmount: true,
  },
  costControls: {
    throttleTypingWrites: true,
    telemetrySampled: true,
    noDurableTypingMessages: true,
    noPerKeystrokeWrites: true,
    rtdbPresenceOnly: true,
  },
  debugStatus: {
    lane: "Chat presence/typing",
    errorCountField: "presenceTypingErrorCount",
    costRisk: "bounded",
  },
} as const;

export type ChatPresenceDebugLane = {
  lane: "Chat presence/typing";
  onDisconnectAttached: boolean;
  writeThrottleActive: boolean;
  staleTypingCleanupActive: boolean;
  errorCount: number;
  costRisk: "bounded" | "elevated";
  scoreDimensionsAffected: readonly PublicBetaHealthDimension[];
};

export function buildChatPresencePayload(input: {
  typing: boolean;
  activeAt: number;
  role: ChatViewerRole;
  threadId: string;
  userId: string;
  displayName?: string | null;
}): ChatPresencePayload {
  return {
    typing: input.typing === true,
    activeAt: Number.isFinite(input.activeAt) ? Math.max(0, Math.trunc(input.activeAt)) : 0,
    role: input.role,
    threadId: input.threadId,
    userId: input.userId,
    ...(input.displayName ? { displayName: input.displayName.slice(0, 80) } : {}),
  };
}

export function isChatPresenceFresh(input: Pick<ChatPresencePayload, "activeAt"> | null | undefined, nowMs: number) {
  if (!input || !Number.isFinite(input.activeAt) || input.activeAt <= 0) return false;
  return nowMs - input.activeAt <= CHAT_PRESENCE_CONTRACT.presence.ttlMs;
}

export function normalizeChatPresenceSnapshot(value: unknown, nowMs: number): ChatPresencePayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const activeAt = typeof raw.activeAt === "number" && Number.isFinite(raw.activeAt) ? raw.activeAt : 0;
  if (!isChatPresenceFresh({ activeAt }, nowMs)) return null;
  const typing = raw.typing === true && nowMs - activeAt <= CHAT_PRESENCE_CONTRACT.typing.maxStaleTypingMs;
  const role = raw.role === "creator" ? "creator" : "user";
  return buildChatPresencePayload({
    typing,
    activeAt,
    role,
    threadId: typeof raw.threadId === "string" ? raw.threadId : "",
    userId: typeof raw.userId === "string" ? raw.userId : "",
    displayName: typeof raw.displayName === "string" ? raw.displayName : null,
  });
}

export function buildChatPresenceDebugLane(errorCount = 0): ChatPresenceDebugLane {
  return {
    lane: "Chat presence/typing",
    onDisconnectAttached: true,
    writeThrottleActive: true,
    staleTypingCleanupActive: true,
    errorCount,
    costRisk: "bounded",
    scoreDimensionsAffected: ["runtimeHealth", "evidenceCompleteness", "costRisk"],
  };
}

export function buildChatPresenceTelemetryPayload(input: {
  eventName: ChatPresenceTelemetryEventName;
  userId?: string | null;
  threadId?: string | null;
  typing?: boolean | null;
  reason?: string | null;
  errorMessage?: string | null;
}) {
  return {
    event_name: input.eventName,
    feature_id: "support",
    surface: "chat",
    route: "/dashboard/chat",
    debug_lane: "Chat presence/typing",
    sampled: true,
    per_keystroke_allowed: false,
    user_id_present: Boolean(input.userId),
    thread_id_present: Boolean(input.threadId),
    ...(input.threadId ? { thread_id: input.threadId } : {}),
    ...(typeof input.typing === "boolean" ? { typing: input.typing } : {}),
    ...(input.reason ? { reason: input.reason } : {}),
    ...(input.errorMessage ? { error_message: input.errorMessage.slice(0, 160) } : {}),
  };
}

export type ChatPresenceSourceValidation = {
  onDisconnectAttached: boolean;
  usesTypingController: boolean;
  noPerKeystrokeTypingWrites: boolean;
  timeoutStopsTyping: boolean;
  blurStopsTyping: boolean;
  sendStopsTyping: boolean;
  unmountStopsTyping: boolean;
  presenceErrorsDebugVisible: boolean;
  telemetryNotPerKeystroke: boolean;
  failures: string[];
};

export function validateChatPresenceSource(source: string): ChatPresenceSourceValidation {
  const compact = source.replace(/\s+/gu, " ");
  const onDisconnectAttached = compact.includes("onDisconnect(ownPresenceRef).remove()");
  const usesTypingController = compact.includes("resolveChatTypingIntent(")
    && compact.includes("typingControllerStateRef");
  const directTypingWriteInInput = /handleComposerTextChange[\s\S]*?pushTypingState\(value\.trim\(\)\.length > 0\)/u.test(source);
  const noPerKeystrokeTypingWrites = usesTypingController && !directTypingWriteInInput;
  const timeoutStopsTyping = compact.includes('reason: "timeout"') || compact.includes('"timeout"');
  const blurStopsTyping = compact.includes('reason: "blur"') || compact.includes('"blur"');
  const sendStopsTyping = compact.includes('reason: "send"') || compact.includes('"send"');
  const unmountStopsTyping = compact.includes('reason: "unmount"') || compact.includes('"unmount"');
  const presenceErrorsDebugVisible = compact.includes("deferChatRealtimeIssue(")
    && compact.includes("chat_presence_error");
  const telemetryNotPerKeystroke = compact.includes("deferChatPresenceTelemetry(")
    && !/onChange=\{[^}]*deferChatPresenceTelemetry/u.test(source);

  const failures: string[] = [];
  if (!noPerKeystrokeTypingWrites) failures.push("typing writes can fire every keystroke.");
  if (!timeoutStopsTyping) failures.push("typing state has no timeout.");
  if (!blurStopsTyping) failures.push("typing state is not cleared on blur.");
  if (!sendStopsTyping) failures.push("typing state is not cleared on send.");
  if (!unmountStopsTyping) failures.push("typing state is not cleared on unmount.");
  if (!onDisconnectAttached) failures.push("onDisconnect cleanup is missing.");
  if (!presenceErrorsDebugVisible) failures.push("presence errors are not debug-visible.");
  if (!telemetryNotPerKeystroke) failures.push("presence telemetry can spam per keystroke.");

  return {
    onDisconnectAttached,
    usesTypingController,
    noPerKeystrokeTypingWrites,
    timeoutStopsTyping,
    blurStopsTyping,
    sendStopsTyping,
    unmountStopsTyping,
    presenceErrorsDebugVisible,
    telemetryNotPerKeystroke,
    failures,
  };
}
