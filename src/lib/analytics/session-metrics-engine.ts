import {
  SESSION_ACTIVITY_TICK_THROTTLE_MS,
  SESSION_INACTIVITY_THRESHOLD_MS,
  type SessionBounceStatus,
  type SessionEndReason,
  type SessionEngagementStatus,
  type SessionMetricState,
  type SessionMetricsTelemetryEvent,
} from "@/lib/analytics/session-metrics-contract";

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
  const foregroundMs = Math.max(0, clampMs(input.foregroundMsDelta) - hiddenMsDelta);
  const meaningfulInteractions = Math.max(0, Math.trunc(input.meaningfulInteractionCountDelta ?? 0));
  const inferredActiveMs = explicitActiveMs > 0
    ? explicitActiveMs
    : meaningfulInteractions > 0
      ? foregroundMs
      : 0;
  const activeMsDelta = Math.min(inferredActiveMs, foregroundMs > 0 ? foregroundMs : inferredActiveMs);
  const idleMsDelta = input.idleMsDelta !== undefined
    ? clampMs(input.idleMsDelta)
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
  if (session.conversionCount > 0 || session.meaningfulInteractionCount > 0 || session.activeMs >= 3_000 || session.routeCount > 1) {
    return "not_bounced";
  }
  if (session.eventCount > 0 || session.endedAt || session.idleMs > 0 || session.hiddenMs > 0) {
    return "bounced";
  }
  return "unknown";
}

export function classifyEngagedSession(session: SessionMetricState): SessionEngagementStatus {
  if (session.conversionCount > 0 || session.meaningfulInteractionCount > 0 || session.activeMs >= 3_000 || session.routeCount > 1) {
    return "engaged";
  }
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
  const closed = {
    ...session,
    endedAt,
    endReason: input.endReason,
    confidence: input.closeoutObserved ? "exact_closeout" : "estimated_missing_closeout",
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
}): SessionMetricState {
  return {
    ...session,
    actorKind: input.linkedPersonId ? "linked_person" : "signed_in",
    userId: input.userId,
    linkedPersonId: input.linkedPersonId ?? session.linkedPersonId ?? null,
    linkId: input.linkId ?? session.linkId ?? null,
    guestUserHandoff: {
      doubleCountSuppressed: Boolean(session.guestId && input.userId),
      preservedSessionContinuity: true,
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
