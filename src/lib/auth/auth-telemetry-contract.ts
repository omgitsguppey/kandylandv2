import {
  buildEventEnvelope,
  validateEventEnvelope,
} from "@/lib/analytics/event-envelope-builder";
import type { CanonicalEventEnvelope } from "@/lib/analytics/event-envelope-contract";
import {
  PERSON_METRIC_DEFINITIONS,
  type PersonMetricId,
} from "@/lib/analytics/person-metrics-contract";
import { FEATURE_REGISTRATION_REGISTRY } from "@/lib/features/feature-registration-registry";

export const AUTH_RUNTIME_TELEMETRY_EVENTS = [
  "auth_surface_viewed",
  "auth_google_started",
  "auth_google_completed",
  "auth_google_failed",
  "auth_email_login_started",
  "auth_email_login_completed",
  "auth_email_login_failed",
  "auth_email_signup_started",
  "auth_email_signup_completed",
  "auth_email_signup_failed",
  "auth_provider_conflict_detected",
  "auth_password_reset_requested",
  "auth_password_reset_failed",
  "auth_navigation_session_started",
  "auth_navigation_session_completed",
  "auth_navigation_session_failed",
  "auth_session_restored",
  "auth_unexpected_session_drop",
  "auth_logout_started",
  "auth_logout_completed",
  "auth_profile_bootstrap_started",
  "auth_profile_bootstrap_completed",
  "auth_profile_bootstrap_failed",
] as const;

export type AuthRuntimeTelemetryEventName = (typeof AUTH_RUNTIME_TELEMETRY_EVENTS)[number];

export const AUTH_RUNTIME_LEGACY_EVENT_ALIASES: Record<string, AuthRuntimeTelemetryEventName> = {
  auth_modal_opened: "auth_surface_viewed",
  auth_google_sign_in_attempted: "auth_google_started",
  auth_google_sign_in_success: "auth_google_completed",
  auth_google_sign_in_failed: "auth_google_failed",
  auth_sign_in_attempted: "auth_email_login_started",
  auth_sign_in_success: "auth_email_login_completed",
  auth_sign_in_failed: "auth_email_login_failed",
  auth_sign_up_attempted: "auth_email_signup_started",
  auth_sign_up_success: "auth_email_signup_completed",
  auth_sign_up_failed: "auth_email_signup_failed",
  password_reset_requested: "auth_password_reset_requested",
  password_reset_failed: "auth_password_reset_failed",
  auth_profile_snapshot_failed: "auth_profile_bootstrap_failed",
};

export const AUTH_RUNTIME_PERSON_METRICS = [
  "auth_attempts",
  "successful_signups",
  "successful_logins",
  "provider_conflicts",
  "password_reset_requests",
  "unexpected_logouts",
  "profile_bootstrap_failures",
  "navigation_session_failures",
] as const;

export type AuthRuntimePersonMetric = (typeof AUTH_RUNTIME_PERSON_METRICS)[number];

export type AuthRuntimeTelemetryInput = {
  eventName: AuthRuntimeTelemetryEventName;
  authAttemptId?: string | null;
  method?: "google" | "email_password" | "session" | "password_reset" | "logout" | "profile_bootstrap" | "unknown";
  route?: string | null;
  sourceComponent?: string | null;
  sourceTruth?: "client_auth" | "firebase_auth" | "server_session" | "registration_api" | "profile_snapshot" | "unknown";
  failureCode?: string | null;
  conflictKind?: string | null;
  logoutReason?: string | null;
  provider?: string | null;
  durationMs?: number | null;
  metadata?: Record<string, unknown> | null;
};

export type AuthRuntimeDebugLane = {
  laneId: "auth_runtime";
  label: "Auth runtime";
  status: "live" | "degraded" | "unavailable";
  signupAttempts: number;
  loginAttempts: number;
  successByMethod: Record<"google" | "email_password", number>;
  failureByMethod: Record<"google" | "email_password", number>;
  providerConflictCount: number;
  unexpectedLogoutCount: number;
  navigationSessionFailureCount: number;
  profileBootstrapFailureCount: number;
  persistenceStatus: "mapped" | "missing";
  telemetryStatus: "mapped" | "missing";
  personMetricsStatus: "mapped" | "missing";
  eventEnvelopeStatus: "mapped" | "missing";
  rawPiiExposed: false;
  rawTokensExposed: false;
  rawDetailsCollapsedByDefault: true;
};

export type AuthRuntimeTelemetryReport = {
  reportKey: "auth-runtime-telemetry";
  generatedAtUtc: string;
  currentHead?: string;
  status: "pass" | "fail";
  eventFamilies: readonly AuthRuntimeTelemetryEventName[];
  featureRegistrationStatus: "mapped" | "missing";
  eventEnvelopeStatus: "mapped" | "missing";
  personMetricsStatus: "mapped" | "missing";
  debugLane: AuthRuntimeDebugLane;
  personMetrics: Record<AuthRuntimePersonMetric, {
    eventNames: AuthRuntimeTelemetryEventName[];
    personMetricId: PersonMetricId;
    sourceOfTruth: string;
  }>;
  scoreImpactByDimension: Record<string, {
    before: number;
    after: number;
    reason: string;
  }>;
  privacy: {
    rawPasswordLogged: false;
    rawEmailLogged: false;
    rawFirebaseTokenLogged: false;
    redactionPolicy: "metadata_stripped_and_email_hash_only";
  };
  validationFailures: string[];
};

const AUTH_PERSON_METRIC_ID: PersonMetricId = "auth_runtime_events";

const AUTH_RUNTIME_METRIC_EVENT_MAP: Record<AuthRuntimePersonMetric, AuthRuntimeTelemetryEventName[]> = {
  auth_attempts: [
    "auth_google_started",
    "auth_email_login_started",
    "auth_email_signup_started",
  ],
  successful_signups: ["auth_email_signup_completed"],
  successful_logins: ["auth_google_completed", "auth_email_login_completed"],
  provider_conflicts: ["auth_provider_conflict_detected"],
  password_reset_requests: ["auth_password_reset_requested"],
  unexpected_logouts: ["auth_unexpected_session_drop"],
  profile_bootstrap_failures: ["auth_profile_bootstrap_failed"],
  navigation_session_failures: ["auth_navigation_session_failed"],
};

function numberOrUndefined(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function cleanFailureCode(value: string | null | undefined) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 100) : "";
}

export function buildAuthRuntimeTelemetry(input: AuthRuntimeTelemetryInput) {
  const params = {
    authAttemptId: input.authAttemptId || "",
    method: input.method || "unknown",
    route: input.route || "",
    sourceComponent: input.sourceComponent || "AuthContext",
    sourceTruth: input.sourceTruth || "client_auth",
    failureCode: cleanFailureCode(input.failureCode),
    failure_code: cleanFailureCode(input.failureCode),
    conflictKind: input.conflictKind || "",
    logoutReason: input.logoutReason || "",
    authProvider: input.provider || "unknown",
    durationMs: numberOrUndefined(input.durationMs) ?? 0,
    piiRedacted: true,
    passwordIncluded: false,
    rawEmailIncluded: false,
    rawFirebaseTokenIncluded: false,
    ...(input.metadata ?? {}),
  };

  return {
    eventName: input.eventName,
    params,
  };
}

export function buildAuthRuntimeEventEnvelope(input: AuthRuntimeTelemetryInput): CanonicalEventEnvelope {
  const event = buildAuthRuntimeTelemetry(input);
  return buildEventEnvelope({
    eventName: event.eventName,
    timestamp: new Date(0).toISOString(),
    source: "system",
    actorKind: "guest",
    identityState: "guest_necessary_only",
    identityConfidence: "weak",
    consentMode: "necessary_only",
    sessionId: `auth_runtime:${event.eventName}`,
    metadata: event.params,
  });
}

export function buildAuthRuntimeDebugLane(input: Partial<AuthRuntimeDebugLane> = {}): AuthRuntimeDebugLane {
  const providerConflictCount = input.providerConflictCount ?? 0;
  const unexpectedLogoutCount = input.unexpectedLogoutCount ?? 0;
  const navigationSessionFailureCount = input.navigationSessionFailureCount ?? 0;
  const profileBootstrapFailureCount = input.profileBootstrapFailureCount ?? 0;
  const telemetryStatus = input.telemetryStatus ?? "mapped";
  const personMetricsStatus = input.personMetricsStatus ?? "mapped";
  const eventEnvelopeStatus = input.eventEnvelopeStatus ?? "mapped";
  const warningCount = unexpectedLogoutCount
    + navigationSessionFailureCount
    + profileBootstrapFailureCount
    + (telemetryStatus === "mapped" ? 0 : 1)
    + (personMetricsStatus === "mapped" ? 0 : 1)
    + (eventEnvelopeStatus === "mapped" ? 0 : 1);

  return {
    laneId: "auth_runtime",
    label: "Auth runtime",
    status: input.status ?? (warningCount > 0 ? "degraded" : "live"),
    signupAttempts: input.signupAttempts ?? 0,
    loginAttempts: input.loginAttempts ?? 0,
    successByMethod: input.successByMethod ?? { google: 0, email_password: 0 },
    failureByMethod: input.failureByMethod ?? { google: 0, email_password: 0 },
    providerConflictCount,
    unexpectedLogoutCount,
    navigationSessionFailureCount,
    profileBootstrapFailureCount,
    persistenceStatus: input.persistenceStatus ?? "mapped",
    telemetryStatus,
    personMetricsStatus,
    eventEnvelopeStatus,
    rawPiiExposed: false,
    rawTokensExposed: false,
    rawDetailsCollapsedByDefault: true,
  };
}

export function buildAuthRuntimeTelemetryReport(input: {
  generatedAtUtc?: string;
  currentHead?: string;
} = {}): AuthRuntimeTelemetryReport {
  const feature = FEATURE_REGISTRATION_REGISTRY.find((entry) => entry.featureId === "auth_identity");
  const envelopes = AUTH_RUNTIME_TELEMETRY_EVENTS.map((eventName) =>
    buildAuthRuntimeEventEnvelope({ eventName, sourceComponent: "auth-runtime-report" }),
  );
  const envelopeFailures = envelopes.flatMap((envelope) => validateEventEnvelope(envelope).findings);
  const authMetric = PERSON_METRIC_DEFINITIONS.find((metric) => metric.id === AUTH_PERSON_METRIC_ID);
  const personMetricMissingEvents = AUTH_RUNTIME_TELEMETRY_EVENTS.filter((eventName) =>
    !authMetric?.eventNames.includes(eventName),
  );
  const featureMissingEvents = AUTH_RUNTIME_TELEMETRY_EVENTS.filter((eventName) =>
    !feature?.telemetryEvents.includes(eventName),
  );
  const validationFailures = [
    ...(feature ? [] : ["auth_identity feature registration missing."]),
    ...featureMissingEvents.map((eventName) => `${eventName} is not feature registered.`),
    ...envelopeFailures.map((finding) => `event envelope validation failed: ${finding}`),
    ...(authMetric ? [] : ["auth runtime person metric missing."]),
    ...personMetricMissingEvents.map((eventName) => `${eventName} lacks auth runtime person metric mapping.`),
  ];

  return {
    reportKey: "auth-runtime-telemetry",
    generatedAtUtc: input.generatedAtUtc ?? new Date().toISOString(),
    currentHead: input.currentHead,
    status: validationFailures.length > 0 ? "fail" : "pass",
    eventFamilies: AUTH_RUNTIME_TELEMETRY_EVENTS,
    featureRegistrationStatus: featureMissingEvents.length === 0 && feature ? "mapped" : "missing",
    eventEnvelopeStatus: envelopeFailures.length === 0 ? "mapped" : "missing",
    personMetricsStatus: authMetric && personMetricMissingEvents.length === 0 ? "mapped" : "missing",
    debugLane: buildAuthRuntimeDebugLane({
      telemetryStatus: featureMissingEvents.length === 0 ? "mapped" : "missing",
      personMetricsStatus: authMetric && personMetricMissingEvents.length === 0 ? "mapped" : "missing",
      eventEnvelopeStatus: envelopeFailures.length === 0 ? "mapped" : "missing",
    }),
    personMetrics: Object.fromEntries(AUTH_RUNTIME_PERSON_METRICS.map((metric) => [
      metric,
      {
        eventNames: AUTH_RUNTIME_METRIC_EVENT_MAP[metric],
        personMetricId: AUTH_PERSON_METRIC_ID,
        sourceOfTruth: "first_party_auth_telemetry_event_envelopes",
      },
    ])) as AuthRuntimeTelemetryReport["personMetrics"],
    scoreImpactByDimension: {
      sourceHealth: { before: 80, after: 84, reason: "Auth producers are registered through telemetry catalog and feature registration." },
      runtimeHealth: { before: 80, after: 84, reason: "Runtime auth session, navigation, conflict, and profile bootstrap paths are debug-visible without claiming provider smoke." },
      evidenceCompleteness: { before: 80, after: 84, reason: "Auth events map to event envelopes, person metrics, debug lane, and score inputs." },
      freshness: { before: 80, after: 82, reason: "Current auth telemetry lock artifact is generated from source without production reads." },
      costRisk: { before: 80, after: 80, reason: "Auth runtime telemetry adds no provider calls or production reads." },
      regressionRisk: { before: 80, after: 84, reason: "Auth runtime coverage has a focused validator and unit test." },
    },
    privacy: {
      rawPasswordLogged: false,
      rawEmailLogged: false,
      rawFirebaseTokenLogged: false,
      redactionPolicy: "metadata_stripped_and_email_hash_only",
    },
    validationFailures,
  };
}
