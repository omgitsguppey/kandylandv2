import type {
  ChatRealtimeListenerScope,
  ChatRealtimePropagationState,
} from "@/lib/chat/chat-realtime-contract";

export type ChatRealtimeTelemetryEventName =
  | "chat_realtime_listener_attached"
  | "chat_realtime_listener_detached"
  | "chat_realtime_listener_error"
  | "chat_message_send_attempted"
  | "chat_message_api_accepted"
  | "chat_message_optimistic_rendered"
  | "chat_message_listener_observed"
  | "chat_message_reconciled"
  | "chat_message_reconcile_failed"
  | "chat_thread_unread_updated"
  | "chat_thread_read_marked";

export type ChatRealtimeTelemetryEvent = {
  eventName: ChatRealtimeTelemetryEventName;
  featureId: "support";
  surface: "chat";
  materializerLane: "support_materializer";
  debugLane: "Chat realtime";
  identityAware: true;
  consentAware: true;
  debugVisible: true;
  scoreImpact: "runtimeHealth.evidenceCompleteness.costRisk";
  owner: "chat-realtime";
};

export const CHAT_REALTIME_TELEMETRY_EVENTS: readonly ChatRealtimeTelemetryEvent[] = [
  "chat_realtime_listener_attached",
  "chat_realtime_listener_detached",
  "chat_realtime_listener_error",
  "chat_message_send_attempted",
  "chat_message_api_accepted",
  "chat_message_optimistic_rendered",
  "chat_message_listener_observed",
  "chat_message_reconciled",
  "chat_message_reconcile_failed",
  "chat_thread_unread_updated",
  "chat_thread_read_marked",
].map((eventName) => ({
  eventName: eventName as ChatRealtimeTelemetryEventName,
  featureId: "support",
  surface: "chat",
  materializerLane: "support_materializer",
  debugLane: "Chat realtime",
  identityAware: true,
  consentAware: true,
  debugVisible: true,
  scoreImpact: "runtimeHealth.evidenceCompleteness.costRisk",
  owner: "chat-realtime",
}));

export type ChatRealtimeTelemetryPayloadInput = {
  eventName: ChatRealtimeTelemetryEventName;
  userId?: string | null;
  threadId?: string | null;
  messageId?: string | null;
  listenerScope?: ChatRealtimeListenerScope | null;
  propagationState?: ChatRealtimePropagationState | null;
  sourceComponent?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  documentLimit?: number | null;
};

export function buildChatRealtimeTelemetryPayload(input: ChatRealtimeTelemetryPayloadInput) {
  return {
    event_name: input.eventName,
    feature_id: "support",
    surface: "chat",
    route: "/dashboard/chat",
    debug_lane: "Chat realtime",
    materializer_lane: "support_materializer",
    identity_aware: true,
    consent_aware: true,
    debug_visible: true,
    user_id_present: Boolean(input.userId),
    thread_id_present: Boolean(input.threadId),
    message_id_present: Boolean(input.messageId),
    ...(input.threadId ? { thread_id: input.threadId } : {}),
    ...(input.messageId ? { message_id: input.messageId } : {}),
    ...(input.listenerScope ? { listener_scope: input.listenerScope } : {}),
    ...(input.propagationState ? { propagation_state: input.propagationState } : {}),
    ...(input.sourceComponent ? { source_component: input.sourceComponent } : {}),
    ...(typeof input.documentLimit === "number" ? { document_limit: input.documentLimit } : {}),
    ...(input.errorCode ? { error_code: input.errorCode } : {}),
    ...(input.errorMessage ? { error_message: input.errorMessage.slice(0, 160) } : {}),
  };
}

export function validateChatRealtimeTelemetryContract() {
  const failures: string[] = [];
  const names = new Set<string>();
  for (const event of CHAT_REALTIME_TELEMETRY_EVENTS) {
    if (names.has(event.eventName)) failures.push(`${event.eventName} is duplicated.`);
    names.add(event.eventName);
    if (event.featureId !== "support") failures.push(`${event.eventName} is not feature registered to support/chat.`);
    if (!event.identityAware) failures.push(`${event.eventName} is not identity-aware.`);
    if (!event.consentAware) failures.push(`${event.eventName} is not consent-aware.`);
    if (!event.debugVisible) failures.push(`${event.eventName} is not debug-visible.`);
    if (!event.materializerLane) failures.push(`${event.eventName} lacks materializer lane.`);
  }
  return failures;
}
