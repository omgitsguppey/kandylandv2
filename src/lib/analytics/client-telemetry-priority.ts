export const CLIENT_TELEMETRY_NON_PRIORITY_FLUSH_INTERVAL_MS = 15_000;
export const CLIENT_TELEMETRY_NON_PRIORITY_QUEUE_CAP = 200;
export const CLIENT_TELEMETRY_PRIORITY_FLUSH_DELAY_MS = 0;

export const CLIENT_TELEMETRY_PRIORITIES = [
  "priority_immediate",
  "priority_next_flush",
  "non_priority_batch",
  "debug_only",
] as const;

export type ClientTelemetryPriority = (typeof CLIENT_TELEMETRY_PRIORITIES)[number];

type ClientTelemetryPriorityInput = {
  eventName?: string | null;
  type?: string | null;
  targetId?: string | null;
  targetText?: string | null;
};

const PRIORITY_IMMEDIATE_EVENT_NAMES = new Set([
  "gumdrops_purchase_completed",
  "payment_completed",
  "payment_failed",
  "gumdrop_balance_changed",
  "creator_spend_completed",
  "identity_linked",
  "auth_transition",
  "bug_report_submitted",
  "runtime_watch_time_v2",
  "watch_start",
  "watch_pause",
  "watch_resume",
  "watch_complete",
  "watch_abandon",
  "watch_heartbeat",
]);

const PRIORITY_NEXT_FLUSH_TYPES = new Set([
  "page_view",
  "page_leave",
  "click",
]);

const NON_PRIORITY_TYPES = new Set([
  "hover",
  "visibility",
  "scroll",
]);

const DEBUG_EVENT_PREFIXES = [
  "debug_",
  "source_only_",
  "ui_continuity_",
];

export function classifyClientTelemetryEventPriority(input: ClientTelemetryPriorityInput): ClientTelemetryPriority {
  const eventName = input.eventName?.trim() || "";
  const eventType = input.type?.trim() || "";
  if (eventName && PRIORITY_IMMEDIATE_EVENT_NAMES.has(eventName)) {
    return "priority_immediate";
  }

  if (DEBUG_EVENT_PREFIXES.some((prefix) => eventName.startsWith(prefix))) {
    return "debug_only";
  }

  if (PRIORITY_NEXT_FLUSH_TYPES.has(eventType)) {
    return "priority_next_flush";
  }

  if (NON_PRIORITY_TYPES.has(eventType)) {
    return "non_priority_batch";
  }

  return "non_priority_batch";
}

export function shouldFlushClientTelemetryImmediately(input: ClientTelemetryPriorityInput) {
  return classifyClientTelemetryEventPriority(input) === "priority_immediate";
}

export function shouldFlushClientTelemetryOnNextTurn(input: ClientTelemetryPriorityInput) {
  const priority = classifyClientTelemetryEventPriority(input);
  return priority === "priority_immediate" || priority === "priority_next_flush";
}
