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
