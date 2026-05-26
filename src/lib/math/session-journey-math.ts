export const SESSION_JOURNEY_MATH_VERSION = "2026.05.session-journey-math.1";
export const SESSION_INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
export const SESSION_ACTIVE_ACTIVITY_WINDOW_MS = 30 * 1000;
export const SESSION_ENGAGED_ACTIVE_THRESHOLD_MS = 10 * 1000;
export const GUEST_USER_HANDOFF_WINDOW_MS = 5 * 60 * 1000;

export type SessionIntervalInput = {
  startedAtMs: number;
  endedAtMs: number;
  foreground?: boolean | null;
  hidden?: boolean | null;
  lastActivityAtMs?: number | null;
  lastMeaningfulInteractionAtMs?: number | null;
};

export type SessionClassificationInput = {
  routeCount: number;
  meaningfulInteractionCount: number;
  activeMs: number;
  conversionCount: number;
  closeout?: "observed_closeout" | "unknown_closeout" | "active_session" | null;
};

export type MeaningfulInteractionCategory =
  | "auth"
  | "drop"
  | "wallet"
  | "creator"
  | "chat"
  | "task"
  | "notification"
  | "settings"
  | "none";

export type JourneyDurationResult = {
  durationMs: number | null;
  activeMs: number | null;
  confidence: "exact" | "estimated" | "weak" | "unavailable";
  reason: "bounded_events" | "active_only" | "missing_end" | "invalid_timestamps";
};

function numberMs(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.trunc(numeric)) : 0;
}

function positiveCount(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.trunc(numeric)) : 0;
}

function intervalLength(interval: SessionIntervalInput) {
  return Math.max(0, numberMs(interval.endedAtMs) - numberMs(interval.startedAtMs));
}

function activityAnchor(interval: SessionIntervalInput) {
  return numberMs(interval.lastMeaningfulInteractionAtMs ?? interval.lastActivityAtMs ?? interval.startedAtMs);
}

function foreground(interval: SessionIntervalInput) {
  return interval.foreground !== false && interval.hidden !== true;
}

function activeMsForInterval(interval: SessionIntervalInput) {
  if (!foreground(interval)) return 0;
  const startedAtMs = numberMs(interval.startedAtMs);
  const endedAtMs = numberMs(interval.endedAtMs);
  const activeStartedAtMs = Math.max(startedAtMs, activityAnchor(interval));
  const activeUntil = activityAnchor(interval) + SESSION_ACTIVE_ACTIVITY_WINDOW_MS;
  return Math.max(0, Math.min(endedAtMs, activeUntil) - activeStartedAtMs);
}

export function calculateSessionActiveMs(input: { intervals?: readonly SessionIntervalInput[] | null }) {
  return (input.intervals ?? []).reduce((total, interval) => total + activeMsForInterval(interval), 0);
}

export function calculateSessionHiddenMs(input: { intervals?: readonly SessionIntervalInput[] | null }) {
  return (input.intervals ?? []).reduce((total, interval) => total + (foreground(interval) ? 0 : intervalLength(interval)), 0);
}

export function calculateSessionIdleMs(input: { intervals?: readonly SessionIntervalInput[] | null }) {
  return (input.intervals ?? []).reduce((total, interval) => {
    if (!foreground(interval)) return total;
    return total + Math.max(0, intervalLength(interval) - activeMsForInterval(interval));
  }, 0);
}

export function classifyMeaningfulInteraction(input: { eventName?: string | null; action?: string | null }) {
  const eventName = String(input.eventName ?? input.action ?? "").toLowerCase();
  const category: MeaningfulInteractionCategory =
    /signup|login|auth_.*attempt|auth_.*started/u.test(eventName) ? "auth"
      : /drop_(opened|viewed|unlocked|unwrapped)|drop_preview_opened|drop_unwrap|watch_session_started/u.test(eventName) ? "drop"
        : /wallet_opened|wallet_package_selected|checkout_started|begin_checkout/u.test(eventName) ? "wallet"
          : /creator_(card_clicked|profile_opened|follow)/u.test(eventName) ? "creator"
            : /chat_thread_opened|chat_message_(attempted|sent|failed)/u.test(eventName) ? "chat"
              : /daily_task_started|task_completed|daily_task_completed/u.test(eventName) ? "task"
                : /notification_permission|notification_action_clicked/u.test(eventName) ? "notification"
                  : /setting_.*(saved|changed)|settings_.*action/u.test(eventName) ? "settings"
                    : "none";
  return {
    meaningful: category !== "none",
    category,
    eventName,
  };
}

export function classifyBounce(input: SessionClassificationInput) {
  if (input.closeout === "unknown_closeout") {
    return { bounceStatus: "unknown" as const, reason: "unknown_closeout" as const };
  }
  if (positiveCount(input.conversionCount) > 0) return { bounceStatus: "not_bounced" as const, reason: "conversion" as const };
  if (positiveCount(input.meaningfulInteractionCount) > 0) return { bounceStatus: "not_bounced" as const, reason: "meaningful_interaction" as const };
  if (positiveCount(input.routeCount) > 1) return { bounceStatus: "not_bounced" as const, reason: "multi_route" as const };
  if (numberMs(input.activeMs) >= SESSION_ENGAGED_ACTIVE_THRESHOLD_MS) return { bounceStatus: "not_bounced" as const, reason: "active_threshold" as const };
  if (positiveCount(input.routeCount) === 1 && numberMs(input.activeMs) < SESSION_ENGAGED_ACTIVE_THRESHOLD_MS) {
    return { bounceStatus: "bounced" as const, reason: "single_route_no_meaningful_activity" as const };
  }
  return { bounceStatus: "unknown" as const, reason: "insufficient_source" as const };
}

export function classifyEngagedSession(input: Omit<SessionClassificationInput, "closeout">) {
  if (positiveCount(input.conversionCount) > 0) return { engagementStatus: "engaged" as const, reason: "conversion" as const };
  if (positiveCount(input.meaningfulInteractionCount) > 0) return { engagementStatus: "engaged" as const, reason: "meaningful_interaction" as const };
  if (positiveCount(input.routeCount) >= 2) return { engagementStatus: "engaged" as const, reason: "multi_route" as const };
  if (numberMs(input.activeMs) >= SESSION_ENGAGED_ACTIVE_THRESHOLD_MS) return { engagementStatus: "engaged" as const, reason: "active_threshold" as const };
  return { engagementStatus: "passive" as const, reason: "below_engagement_threshold" as const };
}

export function classifySessionCloseout(input: { closeoutObserved?: boolean | null; endReason?: string | null }) {
  if (input.closeoutObserved === true) {
    return { closeout: "observed_closeout" as const, confidence: "exact" as const, reason: String(input.endReason ?? "observed") };
  }
  return { closeout: "unknown_closeout" as const, confidence: "weak" as const, reason: String(input.endReason ?? "missing_closeout") };
}

export function calculateJourneyStepDuration(input: {
  startedAtMs?: number | null;
  endedAtMs?: number | null;
  activeMs?: number | null;
}): JourneyDurationResult {
  const startedAtMs = numberMs(input.startedAtMs);
  const endedAtMs = numberMs(input.endedAtMs);
  const activeMs = input.activeMs === null || input.activeMs === undefined ? null : numberMs(input.activeMs);
  if (!startedAtMs || !endedAtMs) {
    return activeMs && activeMs > 0
      ? { durationMs: null, activeMs, confidence: "weak", reason: "active_only" }
      : { durationMs: null, activeMs: null, confidence: "unavailable", reason: "missing_end" };
  }
  if (endedAtMs < startedAtMs) return { durationMs: null, activeMs: null, confidence: "unavailable", reason: "invalid_timestamps" };
  const durationMs = endedAtMs - startedAtMs;
  return {
    durationMs,
    activeMs: activeMs === null ? durationMs : Math.min(activeMs, durationMs),
    confidence: "exact",
    reason: "bounded_events",
  };
}

export function linkGuestUserSession(input: {
  guestSessionId?: string | null;
  userSessionId?: string | null;
  guestEventAtMs?: number | null;
  authTransitionAtMs?: number | null;
  guestId?: string | null;
  userId?: string | null;
  linkId?: string | null;
}) {
  const hasIdentity = Boolean(input.guestId && input.userId);
  const sameSession = Boolean(input.guestSessionId && input.userSessionId && input.guestSessionId === input.userSessionId);
  const withinAuthWindow = Math.abs(numberMs(input.authTransitionAtMs) - numberMs(input.guestEventAtMs)) <= GUEST_USER_HANDOFF_WINDOW_MS;
  const preservedSessionContinuity = hasIdentity && (sameSession || withinAuthWindow);
  return {
    preservedSessionContinuity,
    doubleCountSuppressed: preservedSessionContinuity,
    linkId: input.linkId ?? null,
    reason: sameSession
      ? "same_session" as const
      : withinAuthWindow && hasIdentity
        ? "auth_transition_window" as const
        : "outside_transition_window" as const,
  };
}

export function explainSessionMath(input: SessionClassificationInput) {
  const bounce = classifyBounce(input);
  const engaged = classifyEngagedSession(input);
  return [
    "Session uses a 30 minute inactivity timeout.",
    "Active time requires foreground activity within the last 30 seconds.",
    "Hidden/background time is excluded.",
    `bounce=${bounce.bounceStatus}:${bounce.reason}`,
    `engagement=${engaged.engagementStatus}:${engaged.reason}`,
  ].join(" ");
}
