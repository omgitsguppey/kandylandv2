export const SESSION_METRICS_CONTRACT_VERSION = "2026.05.session-bounce.1";

export const SESSION_INACTIVITY_THRESHOLD_MS = 30 * 60 * 1000;
export const SESSION_ACTIVITY_TICK_THROTTLE_MS = 15 * 1000;

export const SESSION_METRICS_TELEMETRY_EVENTS = [
  "session_started",
  "session_activity_tick",
  "session_meaningful_interaction",
  "session_closed",
  "session_bounced",
  "session_engaged",
] as const;

export type SessionMetricsTelemetryEvent = (typeof SESSION_METRICS_TELEMETRY_EVENTS)[number];
export type SessionActorKind = "guest" | "signed_in" | "linked_person" | "admin" | "system" | "unknown";
export type SessionBounceStatus = "bounced" | "not_bounced" | "unknown";
export type SessionEngagementStatus = "engaged" | "passive" | "abandoned" | "unknown";
export type SessionMetricConfidence = "exact_closeout" | "active_session_estimated" | "estimated_missing_closeout" | "unavailable";
export type SessionEndReason = "pagehide" | "visibility_hidden" | "route_change" | "inactivity_timeout" | "explicit_logout" | "cleanup" | "missing_closeout" | "unknown";

export interface SessionMetricState {
  sessionId: string;
  actorKind: SessionActorKind;
  guestId?: string | null;
  userId?: string | null;
  linkedPersonId?: string | null;
  linkId?: string | null;
  startedAt: number;
  endedAt?: number | null;
  lastActivityAt: number;
  activeMs: number;
  idleMs: number;
  hiddenMs: number;
  routeCount: number;
  eventCount: number;
  meaningfulInteractionCount: number;
  conversionCount: number;
  bounceStatus: SessionBounceStatus;
  engagementStatus: SessionEngagementStatus;
  confidence: SessionMetricConfidence;
  inactivityThresholdMs: number;
  endReason: SessionEndReason;
  guestUserHandoff: {
    doubleCountSuppressed: boolean;
    preservedSessionContinuity: boolean;
    sourceGuestId?: string | null;
    targetUserId?: string | null;
  };
}

export interface SessionBounceDebugLane {
  label: "Session/bounce";
  activeSessionCount: number;
  idleSessionCount: number;
  missingCloseoutCount: number;
  bounceClassifiedCount: number;
  hiddenTimeExcludedCount: number;
  guestUserLinkStatus: "mapped" | "missing" | "not_applicable";
  telemetryStatus: "mapped";
  sourceOfTruth: "src/lib/analytics/session-metrics-engine.ts";
}

export function buildSessionBounceDebugLane(input: Partial<Omit<SessionBounceDebugLane, "label" | "telemetryStatus" | "sourceOfTruth">> = {}): SessionBounceDebugLane {
  return {
    label: "Session/bounce",
    activeSessionCount: input.activeSessionCount ?? 0,
    idleSessionCount: input.idleSessionCount ?? 0,
    missingCloseoutCount: input.missingCloseoutCount ?? 0,
    bounceClassifiedCount: input.bounceClassifiedCount ?? 0,
    hiddenTimeExcludedCount: input.hiddenTimeExcludedCount ?? 0,
    guestUserLinkStatus: input.guestUserLinkStatus ?? "not_applicable",
    telemetryStatus: "mapped",
    sourceOfTruth: "src/lib/analytics/session-metrics-engine.ts",
  };
}

export const SESSION_MEASUREMENT_VERSION = "session_measurement_v1";
// Matches the existing guest duration limit; this is a client observation, not server time truth.
export const SESSION_MEASUREMENT_MAX_DURATION_MS = 24 * 60 * 60 * 1000;
export type SessionMeasurementCheckpoint = {
  version: typeof SESSION_MEASUREMENT_VERSION;
  segmentId: string;
  sequence: number;
  startedAtMs: number;
  endedAtMs: number;
  activeMs: number;
  idleMs: number;
  hiddenMs: number;
  status: "checkpoint" | "final";
};

export function readSessionMeasurementCheckpoint(value: unknown): SessionMeasurementCheckpoint | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (row.version !== SESSION_MEASUREMENT_VERSION
    || typeof row.segmentId !== "string" || !/^[A-Za-z0-9:_-]{8,200}$/u.test(row.segmentId)
    || (row.status !== "checkpoint" && row.status !== "final")) return null;
  const keys = ["sequence", "startedAtMs", "endedAtMs", "activeMs", "idleMs", "hiddenMs"] as const;
  if (keys.some(key => typeof row[key] !== "number" || !Number.isSafeInteger(row[key]) || (row[key] as number) < 0)) return null;
  const { sequence, startedAtMs, endedAtMs, activeMs, idleMs, hiddenMs } = row as Record<typeof keys[number], number>;
  const duration = endedAtMs - startedAtMs;
  if (sequence < 1 || duration < 0 || duration > SESSION_MEASUREMENT_MAX_DURATION_MS
    || activeMs + idleMs + hiddenMs !== duration) return null;
  return { version: SESSION_MEASUREMENT_VERSION, segmentId: row.segmentId, sequence,
    startedAtMs, endedAtMs, activeMs, idleMs, hiddenMs, status: row.status };
}

export function readSessionMeasurementFromParams(params: Record<string, unknown> | null | undefined) {
  const raw = params?.session_measurement;
  if (typeof raw !== "string" || raw.length > 1024) return null;
  try { return readSessionMeasurementCheckpoint(JSON.parse(raw)); } catch { return null; }
}

export function serializeSessionMeasurementCheckpoint(value: unknown) {
  const checkpoint = readSessionMeasurementCheckpoint(value);
  return checkpoint ? JSON.stringify(checkpoint) : null;
}
