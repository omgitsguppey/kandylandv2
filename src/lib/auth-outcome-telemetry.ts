import { getClientAnalyticsIdentitySnapshot } from "@/lib/client-session";
import { generateSecureClientToken } from "@/lib/client-random";
import { trackEvent } from "@/lib/telemetry";

export type AuthOutcomeMethod =
  | "email_sign_in"
  | "email_sign_up"
  | "google_sign_in"
  | "manual_sign_in_lookup"
  | "registration";

export type AuthOutcomeSourceTruth =
  | "client_auth"
  | "firebase_auth"
  | "server_session"
  | "registration_api";

export type AuthAttemptTelemetryContext = {
  authAttemptId: string;
  method: AuthOutcomeMethod;
  startedAtUtc: string;
  route: string;
  sourceComponent: string;
  anonymousVisitorId?: string;
  sessionId?: string;
};

function nowUtc() {
  return new Date().toISOString();
}

function buildDurationMs(startedAtUtc: string, finishedAtUtc: string) {
  const durationMs = Date.parse(finishedAtUtc) - Date.parse(startedAtUtc);
  return Number.isFinite(durationMs) && durationMs >= 0 ? durationMs : 0;
}

function buildBaseParams(
  context: AuthAttemptTelemetryContext,
  sourceTruth: AuthOutcomeSourceTruth,
) {
  return {
    authAttemptId: context.authAttemptId,
    method: context.method,
    startedAtUtc: context.startedAtUtc,
    route: context.route,
    sourceComponent: context.sourceComponent,
    sourceTruth,
    anonymousVisitorId: context.anonymousVisitorId || "",
    sessionId: context.sessionId || "",
  };
}

export function createAuthAttemptTelemetryContext(input: {
  method: AuthOutcomeMethod;
  route?: string;
  sourceComponent: string;
}) : AuthAttemptTelemetryContext {
  const identity = getClientAnalyticsIdentitySnapshot();
  const route = input.route || (typeof window !== "undefined" ? window.location.pathname : "/auth");
  return {
    authAttemptId: `auth_attempt_${Date.now()}_${generateSecureClientToken(8)}`,
    method: input.method,
    startedAtUtc: nowUtc(),
    route,
    sourceComponent: input.sourceComponent,
    anonymousVisitorId: identity.anonymousVisitorId || undefined,
    sessionId: identity.sessionId || undefined,
  };
}

export function emitAuthAttemptStarted(
  context: AuthAttemptTelemetryContext,
  extraParams: Record<string, unknown> = {},
) {
  trackEvent("auth_attempt_started", {
    ...buildBaseParams(context, "client_auth"),
    outcome: "started",
    ...extraParams,
  });
}

export function emitAuthAttemptSucceeded(
  context: AuthAttemptTelemetryContext,
  input: {
    actorUserId?: string | null;
    finishedAtUtc?: string;
    sourceTruth?: AuthOutcomeSourceTruth;
    extraParams?: Record<string, unknown>;
  } = {},
) {
  const finishedAtUtc = input.finishedAtUtc || nowUtc();
  const durationMs = buildDurationMs(context.startedAtUtc, finishedAtUtc);
  trackEvent("auth_attempt_succeeded", {
    ...buildBaseParams(context, input.sourceTruth ?? "server_session"),
    outcome: "success",
    actorUserId: input.actorUserId || "",
    finishedAtUtc,
    durationMs,
    duration_ms: durationMs,
    ...input.extraParams,
  });
}

export function emitAuthAttemptFailed(
  context: AuthAttemptTelemetryContext,
  input: {
    failureCode: string;
    actorUserId?: string | null;
    finishedAtUtc?: string;
    sourceTruth?: AuthOutcomeSourceTruth;
    extraParams?: Record<string, unknown>;
  },
) {
  const finishedAtUtc = input.finishedAtUtc || nowUtc();
  const durationMs = buildDurationMs(context.startedAtUtc, finishedAtUtc);
  trackEvent("auth_attempt_failed", {
    ...buildBaseParams(context, input.sourceTruth ?? "client_auth"),
    outcome: "failure",
    actorUserId: input.actorUserId || "",
    failureCode: input.failureCode,
    failure_code: input.failureCode,
    finishedAtUtc,
    durationMs,
    duration_ms: durationMs,
    ...input.extraParams,
  });
}

export function emitAuthAttemptUnfinished(
  context: AuthAttemptTelemetryContext,
  extraParams: Record<string, unknown> = {},
) {
  trackEvent("auth_attempt_unfinished", {
    ...buildBaseParams(context, "client_auth"),
    outcome: "unfinished",
    ...extraParams,
  });
}

export function emitAuthLifecycleEvent(input: {
  eventName:
    | "auth_session_established"
    | "auth_registration_started"
    | "auth_registration_completed"
    | "auth_navigation_session_started"
    | "auth_navigation_session_completed"
    | "auth_navigation_session_failed";
  method?: AuthOutcomeMethod;
  authAttemptId?: string;
  route?: string;
  sourceComponent: string;
  sourceTruth: AuthOutcomeSourceTruth;
  actorUserId?: string | null;
  failureCode?: string;
  startedAtUtc?: string;
  finishedAtUtc?: string;
  extraParams?: Record<string, unknown>;
}) {
  const route = input.route || (typeof window !== "undefined" ? window.location.pathname : "/auth");
  trackEvent(input.eventName, {
    authAttemptId: input.authAttemptId || "",
    method: input.method || "",
    route,
    sourceComponent: input.sourceComponent,
    sourceTruth: input.sourceTruth,
    actorUserId: input.actorUserId || "",
    failureCode: input.failureCode || "",
    failure_code: input.failureCode || "",
    startedAtUtc: input.startedAtUtc || "",
    finishedAtUtc: input.finishedAtUtc || "",
    ...input.extraParams,
  });
}
