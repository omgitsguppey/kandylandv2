import type { AnalyticsIdentityState } from "@/lib/analytics/analytics-event-contract";

export const RUNTIME_WATCH_HEARTBEAT_INTERVAL_MS = 10_000;
export const RUNTIME_WATCH_MIN_HEARTBEAT_INTERVAL_MS = 5_000;
export const RUNTIME_WATCH_MAX_HEARTBEAT_DELTA_MS = 15_000;
export const RUNTIME_WATCH_MAX_FLUSH_DELTA_MS = 30_000;

export const RUNTIME_WATCH_EVENT_TYPES = [
  "watch_start",
  "watch_heartbeat",
  "watch_pause",
  "watch_resume",
  "watch_complete",
  "watch_abandon",
] as const;

export type RuntimeWatchEventType = (typeof RUNTIME_WATCH_EVENT_TYPES)[number];
export type RuntimeWatchConfidence = "runtime_verified" | "client_limited" | "invalid";

export type RuntimeWatchEvent = {
  watchSessionId: string;
  mediaId: string;
  surface: string;
  route: string;
  guestId?: string | null;
  userId?: string | null;
  sessionId?: string | null;
  identityState: AnalyticsIdentityState;
  identityLinkId?: string | null;
  mediaDurationMs: number;
  playheadMs: number;
  playbackRate: number;
  muted: boolean;
  visible: boolean;
  active: boolean;
  eventType: RuntimeWatchEventType;
  clientElapsedMs: number;
  clientEventAt: string;
  eventId: string;
  sequence: number;
  loopIndex?: number | null;
};

export type RuntimeWatchDelta = {
  eventId: string;
  eventType: RuntimeWatchEventType;
  watchTimeMs: number;
  attentionTimeMs: number;
  completed: boolean;
  completionPercent: number;
  confidence: RuntimeWatchConfidence;
  clamped: boolean;
  duplicate: boolean;
  reasonCodes: string[];
};

export type RuntimeWatchSessionState = {
  watchTimeMs: number;
  attentionTimeMs: number;
  completed: boolean;
  completionPercent: number;
  confidence: RuntimeWatchConfidence;
  processedEventIds: string[];
  lastEvent: RuntimeWatchEvent | null;
};

export type RuntimeWatchValidationResult =
  | { ok: true; status: 200; event: RuntimeWatchEvent }
  | { ok: false; status: 422; retryable: false; reason: string };

function isFinitePositive(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function normalizeMs(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
}

function includesRuntimeWatchEventType(value: unknown): value is RuntimeWatchEventType {
  return typeof value === "string" && RUNTIME_WATCH_EVENT_TYPES.includes(value as RuntimeWatchEventType);
}

function parseEventTimeMs(value: string) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isFlushEvent(eventType: RuntimeWatchEventType) {
  return eventType === "watch_pause" || eventType === "watch_complete" || eventType === "watch_abandon";
}

function resolveCompletionPercent(event: RuntimeWatchEvent) {
  if (!isFinitePositive(event.mediaDurationMs)) {
    return 0;
  }
  return clamp((normalizeMs(event.playheadMs) / event.mediaDurationMs) * 100, 0, 100);
}

function resolvePlayheadDeltaMs(previous: RuntimeWatchEvent | null, event: RuntimeWatchEvent, reasonCodes: string[]) {
  if (!previous) {
    return 0;
  }

  const previousLoopIndex = normalizeMs(previous.loopIndex);
  const currentLoopIndex = normalizeMs(event.loopIndex);
  const previousPlayhead = normalizeMs(previous.playheadMs);
  const currentPlayhead = normalizeMs(event.playheadMs);
  const duration = normalizeMs(event.mediaDurationMs);

  if (currentLoopIndex > previousLoopIndex && duration > 0) {
    return clamp((duration - previousPlayhead) + currentPlayhead, 0, duration);
  }

  if (currentPlayhead < previousPlayhead) {
    reasonCodes.push("playhead_decrease_excluded");
    return 0;
  }

  return clamp(currentPlayhead - previousPlayhead, 0, duration || Number.MAX_SAFE_INTEGER);
}

function resolveClientDeltaMs(previous: RuntimeWatchEvent | null, event: RuntimeWatchEvent) {
  const elapsed = normalizeMs(event.clientElapsedMs);
  if (elapsed > 0) {
    return elapsed;
  }

  if (!previous) {
    return 0;
  }

  const currentAt = parseEventTimeMs(event.clientEventAt);
  const previousAt = parseEventTimeMs(previous.clientEventAt);
  return currentAt > previousAt ? currentAt - previousAt : 0;
}

function resolveTrustedDeltaMs(previous: RuntimeWatchEvent | null, event: RuntimeWatchEvent, reasonCodes: string[]) {
  const clientDelta = resolveClientDeltaMs(previous, event);
  if (clientDelta <= 0) {
    reasonCodes.push("negative_or_zero_delta_ignored");
    return { deltaMs: 0, clamped: false };
  }

  const maxDelta = isFlushEvent(event.eventType)
    ? RUNTIME_WATCH_MAX_FLUSH_DELTA_MS
    : RUNTIME_WATCH_MAX_HEARTBEAT_DELTA_MS;
  const clamped = clientDelta > maxDelta;
  if (clamped) {
    reasonCodes.push("heartbeat_delta_clamped");
  }
  return { deltaMs: Math.min(clientDelta, maxDelta), clamped };
}

export function createInitialRuntimeWatchSessionState(): RuntimeWatchSessionState {
  return {
    watchTimeMs: 0,
    attentionTimeMs: 0,
    completed: false,
    completionPercent: 0,
    confidence: "client_limited",
    processedEventIds: [],
    lastEvent: null,
  };
}

export function validateRuntimeWatchEventPayload(value: unknown): RuntimeWatchValidationResult {
  const event = value as Partial<RuntimeWatchEvent> | null;
  if (!event || typeof event !== "object") {
    return { ok: false, status: 422, retryable: false, reason: "invalid_payload" };
  }
  if (typeof event.eventId !== "string" || event.eventId.trim().length === 0) {
    return { ok: false, status: 422, retryable: false, reason: "missing_event_id" };
  }
  if (typeof event.watchSessionId !== "string" || event.watchSessionId.trim().length === 0) {
    return { ok: false, status: 422, retryable: false, reason: "missing_watch_session_id" };
  }
  if (typeof event.mediaId !== "string" || event.mediaId.trim().length === 0) {
    return { ok: false, status: 422, retryable: false, reason: "missing_media_id" };
  }
  if (!includesRuntimeWatchEventType(event.eventType)) {
    return { ok: false, status: 422, retryable: false, reason: "invalid_event_type" };
  }
  if (!isFinitePositive(event.mediaDurationMs)) {
    return { ok: false, status: 422, retryable: false, reason: "invalid_media_duration" };
  }
  if (typeof event.visible !== "boolean" || typeof event.active !== "boolean") {
    return { ok: false, status: 422, retryable: false, reason: "missing_visibility_state" };
  }
  if (typeof event.clientEventAt !== "string" || !Number.isFinite(Date.parse(event.clientEventAt))) {
    return { ok: false, status: 422, retryable: false, reason: "invalid_client_event_at" };
  }
  const sequence = event.sequence;
  if (!Number.isInteger(sequence) || typeof sequence !== "number" || sequence < 1) {
    return { ok: false, status: 422, retryable: false, reason: "invalid_sequence" };
  }

  return { ok: true, status: 200, event: event as RuntimeWatchEvent };
}

export function applyRuntimeWatchEvent(
  state: RuntimeWatchSessionState,
  event: RuntimeWatchEvent,
): { state: RuntimeWatchSessionState; delta: RuntimeWatchDelta } {
  const validation = validateRuntimeWatchEventPayload(event);
  if (!validation.ok) {
    return {
      state: { ...state, confidence: "invalid" },
      delta: {
        eventId: typeof event.eventId === "string" ? event.eventId : "",
        eventType: includesRuntimeWatchEventType(event.eventType) ? event.eventType : "watch_heartbeat",
        watchTimeMs: 0,
        attentionTimeMs: 0,
        completed: state.completed,
        completionPercent: state.completionPercent,
        confidence: "invalid",
        clamped: false,
        duplicate: false,
        reasonCodes: [validation.reason],
      },
    };
  }

  if (state.processedEventIds.includes(event.eventId)) {
    return {
      state,
      delta: {
        eventId: event.eventId,
        eventType: event.eventType,
        watchTimeMs: 0,
        attentionTimeMs: 0,
        completed: state.completed,
        completionPercent: state.completionPercent,
        confidence: state.confidence,
        clamped: false,
        duplicate: true,
        reasonCodes: ["duplicate_event_id_ignored"],
      },
    };
  }

  const reasonCodes: string[] = [];
  const trustedDelta = resolveTrustedDeltaMs(state.lastEvent, event, reasonCodes);
  const playheadDeltaMs = resolvePlayheadDeltaMs(state.lastEvent, event, reasonCodes);
  const canCountAttention = event.visible && event.active;
  const canCountWatch = canCountAttention
    && event.eventType !== "watch_start"
    && event.eventType !== "watch_pause"
    && event.eventType !== "watch_abandon";
  const attentionTimeMs = canCountAttention ? trustedDelta.deltaMs : 0;
  const watchTimeMs = canCountWatch ? Math.min(trustedDelta.deltaMs, playheadDeltaMs) : 0;

  if (!event.visible) {
    reasonCodes.push("hidden_time_excluded");
  }
  if (!event.active) {
    reasonCodes.push("inactive_time_excluded");
  }
  if (canCountWatch && watchTimeMs === 0 && playheadDeltaMs === 0) {
    reasonCodes.push("no_playhead_progress");
  }

  const completionPercent = Math.max(state.completionPercent, resolveCompletionPercent(event));
  const completed = state.completed || event.eventType === "watch_complete" || completionPercent >= 95;
  const confidence: RuntimeWatchConfidence = watchTimeMs > 0 && reasonCodes.length === 0
    ? "runtime_verified"
    : "client_limited";
  const processedEventIds = [...state.processedEventIds, event.eventId].slice(-500);
  const nextState: RuntimeWatchSessionState = {
    watchTimeMs: state.watchTimeMs + watchTimeMs,
    attentionTimeMs: state.attentionTimeMs + attentionTimeMs,
    completed,
    completionPercent,
    confidence,
    processedEventIds,
    lastEvent: event,
  };

  return {
    state: nextState,
    delta: {
      eventId: event.eventId,
      eventType: event.eventType,
      watchTimeMs,
      attentionTimeMs,
      completed,
      completionPercent,
      confidence,
      clamped: trustedDelta.clamped,
      duplicate: false,
      reasonCodes,
    },
  };
}
