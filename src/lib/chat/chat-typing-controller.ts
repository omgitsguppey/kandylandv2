import {
  CHAT_PRESENCE_CONTRACT,
  type ChatPresencePayload,
  type ChatPresenceTelemetryEventName,
} from "@/lib/chat/chat-presence-contract";

export type ChatTypingStopReason = "timeout" | "blur" | "send" | "close" | "unmount" | "clear";
export type ChatTypingIntentReason = "input" | ChatTypingStopReason;

export type ChatTypingControllerState = {
  currentTyping: boolean;
  lastTypingWriteAtMs: number;
};

export type ChatTypingIntentDecision = {
  shouldWrite: boolean;
  suppressedReason: "typing_start_throttled" | "typing_stop_already_clear" | null;
  telemetryEvent: ChatPresenceTelemetryEventName | null;
  writePayload: Pick<ChatPresencePayload, "typing" | "activeAt"> | null;
};

export function createChatTypingControllerState(): ChatTypingControllerState {
  return {
    currentTyping: false,
    lastTypingWriteAtMs: 0,
  };
}

function isForcedStop(reason: ChatTypingIntentReason) {
  return reason === "timeout"
    || reason === "blur"
    || reason === "send"
    || reason === "close"
    || reason === "unmount"
    || reason === "clear";
}

export function resolveChatTypingIntent(input: {
  state: ChatTypingControllerState;
  nextTyping: boolean;
  nowMs: number;
  reason: ChatTypingIntentReason;
}): ChatTypingIntentDecision {
  const nowMs = Number.isFinite(input.nowMs) ? Math.max(0, Math.trunc(input.nowMs)) : Date.now();

  if (input.nextTyping) {
    const elapsedSinceLastWrite = nowMs - input.state.lastTypingWriteAtMs;
    if (input.state.currentTyping && elapsedSinceLastWrite < CHAT_PRESENCE_CONTRACT.typing.writeThrottleMs) {
      return {
        shouldWrite: false,
        suppressedReason: "typing_start_throttled",
        telemetryEvent: null,
        writePayload: null,
      };
    }

    const wasTyping = input.state.currentTyping;
    input.state.currentTyping = true;
    input.state.lastTypingWriteAtMs = nowMs;
    return {
      shouldWrite: true,
      suppressedReason: null,
      telemetryEvent: wasTyping ? null : "chat_typing_started",
      writePayload: {
        typing: true,
        activeAt: nowMs,
      },
    };
  }

  const forcedStop = isForcedStop(input.reason);
  if (!input.state.currentTyping && !forcedStop) {
    return {
      shouldWrite: false,
      suppressedReason: "typing_stop_already_clear",
      telemetryEvent: null,
      writePayload: null,
    };
  }

  const wasTyping = input.state.currentTyping;
  input.state.currentTyping = false;
  input.state.lastTypingWriteAtMs = nowMs;
  return {
    shouldWrite: true,
    suppressedReason: null,
    telemetryEvent: wasTyping ? "chat_typing_stopped" : null,
    writePayload: {
      typing: false,
      activeAt: nowMs,
    },
  };
}
