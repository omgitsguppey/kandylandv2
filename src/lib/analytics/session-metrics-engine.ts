import {
  SESSION_ACTIVITY_TICK_THROTTLE_MS,
  SESSION_INACTIVITY_THRESHOLD_MS,
  type SessionBounceStatus,
  type SessionEndReason,
  type SessionEngagementStatus,
  type SessionMetricState,
  type SessionMetricsTelemetryEvent,
} from "@/lib/analytics/session-metrics-contract";
import {
  calculateSessionActiveMs,
  calculateSessionIdleMs,
  classifyBounce as classifyCanonicalBounce,
  classifyEngagedSession as classifyCanonicalEngagedSession,
  classifySessionCloseout,
  linkGuestUserSession,
} from "@/lib/math/session-journey-math";

export interface StartSessionInput {
  sessionId: string;
  actorKind: SessionMetricState["actorKind"];
  guestId?: string | null;
  userId?: string | null;
  linkedPersonId?: string | null;
  linkId?: string | null;
  startedAt: number;
  routeCount?: number;
  inactivityThresholdMs?: number;
}

export interface SessionActivityInput {
  at: number;
  activeMsDelta?: number;
  foregroundMsDelta?: number;
  idleMsDelta?: number;
  hiddenMsDelta?: number;
  routeCountDelta?: number;
  eventCountDelta?: number;
  meaningfulInteractionCountDelta?: number;
  conversionCountDelta?: number;
}

export interface CloseSessionInput {
  endedAt: number;
  endReason: SessionEndReason;
  closeoutObserved: boolean;
}

function clampMs(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

export function startSession(input: StartSessionInput): SessionMetricState {
  return {
    sessionId: input.sessionId,
    actorKind: input.actorKind,
    guestId: input.guestId ?? null,
    userId: input.userId ?? null,
    linkedPersonId: input.linkedPersonId ?? null,
    linkId: input.linkId ?? null,
    startedAt: clampMs(input.startedAt),
    endedAt: null,
    lastActivityAt: clampMs(input.startedAt),
    activeMs: 0,
    idleMs: 0,
    hiddenMs: 0,
    routeCount: Math.max(1, Math.trunc(input.routeCount ?? 1)),
    eventCount: 0,
    meaningfulInteractionCount: 0,
    conversionCount: 0,
    bounceStatus: "unknown",
    engagementStatus: "unknown",
    confidence: "active_session_estimated",
    inactivityThresholdMs: clampMs(input.inactivityThresholdMs ?? SESSION_INACTIVITY_THRESHOLD_MS),
    endReason: "unknown",
    guestUserHandoff: {
      doubleCountSuppressed: false,
      preservedSessionContinuity: false,
      sourceGuestId: input.guestId ?? null,
      targetUserId: input.userId ?? null,
    },
  };
}

export function updateSessionActivity(session: SessionMetricState, input: SessionActivityInput): SessionMetricState {
  const hiddenMsDelta = clampMs(input.hiddenMsDelta);
  const explicitActiveMs = clampMs(input.activeMsDelta);
  const rawForegroundMs = clampMs(input.foregroundMsDelta);
  const foregroundMs = Math.max(0, rawForegroundMs - hiddenMsDelta);
  const meaningfulInteractions = Math.max(0, Math.trunc(input.meaningfulInteractionCountDelta ?? 0));
  const inferredActiveMs = explicitActiveMs > 0
    ? explicitActiveMs
    : meaningfulInteractions > 0
      ? foregroundMs
      : 0;
  const activeMsDelta = explicitActiveMs > 0
    ? Math.min(inferredActiveMs, foregroundMs > 0 ? foregroundMs : inferredActiveMs)
    : meaningfulInteractions > 0
      ? calculateSessionActiveMs({
      intervals: [{
        startedAtMs: clampMs(input.at) - rawForegroundMs,
        endedAtMs: clampMs(input.at) - hiddenMsDelta,
        foreground: rawForegroundMs > hiddenMsDelta,
        lastMeaningfulInteractionAtMs: meaningfulInteractions > 0 ? clampMs(input.at) : null,
      }],
    })
      : 0;
  const idleMsDelta = input.idleMsDelta !== undefined
    ? clampMs(input.idleMsDelta)
    : meaningfulInteractions > 0
      ? calculateSessionIdleMs({
      intervals: [{
        startedAtMs: clampMs(input.at) - rawForegroundMs,
        endedAtMs: clampMs(input.at) - hiddenMsDelta,
        foreground: rawForegroundMs > hiddenMsDelta,
        lastMeaningfulInteractionAtMs: meaningfulInteractions > 0 ? clampMs(input.at) : null,
      }],
    }) || Math.max(0, foregroundMs - activeMsDelta)
      : Math.max(0, foregroundMs - activeMsDelta);
  const routeCount = Math.max(1, session.routeCount + Math.trunc(input.routeCountDelta ?? 0));
  const eventCount = Math.max(0, session.eventCount + Math.trunc(input.eventCountDelta ?? 0));
  const meaningfulInteractionCount = Math.max(0, session.meaningfulInteractionCount + meaningfulInteractions);
  const conversionCount = Math.max(0, session.conversionCount + Math.trunc(input.conversionCountDelta ?? 0));
  const next: SessionMetricState = {
    ...session,
    lastActivityAt: meaningfulInteractions > 0 || activeMsDelta > 0 || conversionCount > session.conversionCount
      ? clampMs(input.at)
      : session.lastActivityAt,
    activeMs: session.activeMs + activeMsDelta,
    idleMs: session.idleMs + idleMsDelta,
    hiddenMs: session.hiddenMs + hiddenMsDelta,
    routeCount,
    eventCount,
    meaningfulInteractionCount,
    conversionCount,
  };

  return {
    ...next,
    engagementStatus: classifyEngagedSession(next),
    bounceStatus: classifyBounce(next),
  };
}

export function calculateActiveSessionTime(session: SessionMetricState) {
  return Math.max(0, Math.trunc(session.activeMs));
}

export function classifyBounce(session: SessionMetricState): SessionBounceStatus {
  const closeout = session.endReason === "missing_closeout" || session.confidence === "estimated_missing_closeout"
    ? "unknown_closeout"
    : session.endedAt
      ? "observed_closeout"
      : "active_session";
  return classifyCanonicalBounce({
    routeCount: session.routeCount,
    meaningfulInteractionCount: session.meaningfulInteractionCount,
    activeMs: session.activeMs,
    conversionCount: session.conversionCount,
    closeout,
  }).bounceStatus;
}

export function classifyEngagedSession(session: SessionMetricState): SessionEngagementStatus {
  const engaged = classifyCanonicalEngagedSession({
    routeCount: session.routeCount,
    meaningfulInteractionCount: session.meaningfulInteractionCount,
    activeMs: session.activeMs,
    conversionCount: session.conversionCount,
  });
  if (engaged.engagementStatus === "engaged") return "engaged";
  if (session.endedAt && session.activeMs === 0 && session.idleMs >= session.inactivityThresholdMs) {
    return "abandoned";
  }
  if (session.eventCount > 0 || session.idleMs > 0 || session.hiddenMs > 0) {
    return "passive";
  }
  return "unknown";
}

export function closeSession(session: SessionMetricState, input: CloseSessionInput): SessionMetricState {
  const endedAt = Math.max(clampMs(input.endedAt), session.startedAt);
  const closeout = classifySessionCloseout({ closeoutObserved: input.closeoutObserved, endReason: input.endReason });
  const closed = {
    ...session,
    endedAt,
    endReason: input.endReason,
    confidence: closeout.confidence === "exact" ? "exact_closeout" : "estimated_missing_closeout",
  } satisfies SessionMetricState;
  return {
    ...closed,
    engagementStatus: classifyEngagedSession(closed),
    bounceStatus: classifyBounce(closed),
  };
}

export function linkGuestSessionToUser(session: SessionMetricState, input: {
  userId: string;
  linkedPersonId?: string | null;
  linkId?: string | null;
  authTransitionAt?: number | null;
}): SessionMetricState {
  const handoff = linkGuestUserSession({
    guestSessionId: session.sessionId,
    userSessionId: session.sessionId,
    guestEventAtMs: session.lastActivityAt,
    authTransitionAtMs: input.authTransitionAt ?? session.lastActivityAt,
    guestId: session.guestId,
    userId: input.userId,
    linkId: input.linkId ?? session.linkId,
  });
  return {
    ...session,
    actorKind: input.linkedPersonId ? "linked_person" : "signed_in",
    userId: input.userId,
    linkedPersonId: input.linkedPersonId ?? session.linkedPersonId ?? null,
    linkId: input.linkId ?? session.linkId ?? null,
    guestUserHandoff: {
      doubleCountSuppressed: handoff.doubleCountSuppressed,
      preservedSessionContinuity: handoff.preservedSessionContinuity,
      sourceGuestId: session.guestId ?? null,
      targetUserId: input.userId,
    },
  };
}

export function explainSessionMetric(session: SessionMetricState) {
  const confidence = session.confidence === "estimated_missing_closeout"
    ? "estimated because closeout was missing"
    : session.confidence;
  return [
    `sessionId=${session.sessionId}`,
    `activeMs=${session.activeMs}`,
    `idleMs=${session.idleMs}`,
    `hiddenMs=${session.hiddenMs}`,
    `bounceStatus=${session.bounceStatus}`,
    `engagementStatus=${session.engagementStatus}`,
    `confidence=${confidence}`,
    `endReason=${session.endReason}`,
  ].join("; ");
}

export function resolveSessionTelemetryPolicy(input: {
  eventName: SessionMetricsTelemetryEvent;
  lastActivityTickAtMs?: number | null;
  nowMs: number;
}) {
  if (input.eventName !== "session_activity_tick") {
    return { shouldEmit: true, reason: "not_tick" as const };
  }
  const lastTick = clampMs(input.lastActivityTickAtMs ?? 0);
  if (lastTick > 0 && clampMs(input.nowMs) - lastTick < SESSION_ACTIVITY_TICK_THROTTLE_MS) {
    return { shouldEmit: false, reason: "tick_throttled" as const };
  }
  return { shouldEmit: true, reason: "tick_allowed" as const };
}
