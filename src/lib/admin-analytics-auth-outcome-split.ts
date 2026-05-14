import type { AdminSurfaceState } from "@/lib/admin-parity";
import type {
  AuthBreakdownItem,
  AuthLifecycleOutcome,
  AuthMethodOutcome,
  AuthOutcomeSummary,
  HistoricalAnalyticsResponse,
  RangeOption,
} from "@/types/admin-analytics";

export type AuthSourceMode = "first_party_telemetry" | "stale_snapshot" | "mixed_degraded" | "waiting" | "unavailable";
type AuthMethodKey = "google_sign_in" | "email_sign_up" | "email_sign_in" | "unknown";
type AuthOutcomeHydrationState =
  | "ready"
  | "waiting"
  | "no_sample"
  | "legacy_fallback"
  | "unavailable"
  | "error";

type AuthMethodGroupSummary = {
  attempts: number | null;
  successes: number | null;
  failures: number | null;
  successRate: number | null;
  topFailureCode: string | null;
  source: AuthSourceMode;
};

export type AdminAnalyticsAuthMethodRow = AuthMethodOutcome & {
  methodKey: AuthMethodKey;
  visibleLabel: string;
  rawEventNames: string[];
  casingDriftDetected: boolean;
  reconciliationDelta: number;
  timingAvailable: boolean;
  source: AuthSourceMode;
  truthState: AdminSurfaceState;
  fakeZeroPrevented: boolean;
};

export type AdminAnalyticsAuthLifecycleRow = AuthLifecycleOutcome;

export type AdminAnalyticsAuthOutcomeModel = {
  selectedRange: RangeOption;
  sectionSourceMode: AuthSourceMode;
  canonicalSource: "first_party_auth_telemetry";
  currentSource: AuthSourceMode;
  stale: boolean;
  cache: boolean;
  serverConfirmed: boolean;
  fallback: boolean;
  estimated: boolean;
  attempts: { value: number | null; source: AuthSourceMode };
  successes: { value: number | null; source: AuthSourceMode };
  failures: { value: number | null; source: AuthSourceMode };
  unfinished: { value: number | null; source: AuthSourceMode };
  successRate: { formula: "successes / attempts"; value: number | null };
  avgFinish: { formula: "completed attempts with start/end timestamps"; value: number | null };
  timingAvailable: boolean;
  timingState: AuthOutcomeSummary["timingState"] | "unavailable";
  timingMissingReason: string | null;
  lastAuthEventAtUtc: string | null;
  generatedAtUtc: string | null;
  methodBreakdown: AdminAnalyticsAuthMethodRow[];
  lifecycleOutcomes: AdminAnalyticsAuthLifecycleRow[];
  weakestMethod: AdminAnalyticsAuthMethodRow | null;
  mostFailuresMethod: AdminAnalyticsAuthMethodRow | null;
  mostUnfinishedMethod: AdminAnalyticsAuthMethodRow | null;
  recommendation: string;
  authSourceMode: AuthSourceMode;
  successRateFormula: "successes / attempts";
  fakeZeroPrevented: boolean;
  duplicateRefreshPrevented: boolean;
  badgeOverflowProtectionEnabled: true;
  sampleTooSmall: boolean;
  modeLabel: "LIVE" | "STALE" | "PARTIAL" | "WAIT" | "NO SAMPLE" | "UNAVAILABLE" | "ERROR";
  hydrationState: AuthOutcomeHydrationState;
  hasCanonicalAuthAttemptSample: boolean;
  hasLegacyAuthSample: boolean;
  hasUsableAuthSample: boolean;
  canRenderMethodDetails: boolean;
  measurementMode: "canonical_attempt_chain" | "legacy_event_counts" | "unavailable";
  unavailableReason: string | null;
  manualWorkaround: string | null;
  algorithmRecommendation: string | null;
  primarySummary: string;
  mobileCompactDetail: string | null;
  methodGroups: {
    emailPassword: AuthMethodGroupSummary;
    google: AuthMethodGroupSummary;
  };
  trackingCapability: {
    exactAttemptChainAvailable: boolean;
    failureReasonsAvailable: boolean;
    emailPasswordTracked: boolean;
    googleTracked: boolean;
    missingPieces: string[];
    manualWorkaround: string;
    futureInstrumentation: string[];
  };
};

const METHOD_EVENT_NAMES: Record<AuthMethodKey, string[]> = {
  google_sign_in: [
    "auth_attempt_started",
    "auth_attempt_succeeded",
    "auth_attempt_failed",
    "auth_attempt_unfinished",
  ],
  email_sign_up: [
    "auth_attempt_started",
    "auth_attempt_succeeded",
    "auth_attempt_failed",
    "auth_registration_started",
    "auth_registration_completed",
  ],
  email_sign_in: [
    "auth_attempt_started",
    "auth_attempt_succeeded",
    "auth_attempt_failed",
    "auth_navigation_session_started",
    "auth_navigation_session_completed",
    "auth_navigation_session_failed",
  ],
  unknown: [],
};

export function normalizeAuthOutcomeMethod(method: string): { key: AuthMethodKey; label: string } {
  switch (method) {
    case "google_sign_in":
      return { key: "google_sign_in", label: "Google sign-in" };
    case "email_sign_up":
      return { key: "email_sign_up", label: "Email sign-up" };
    case "email_sign_in":
      return { key: "email_sign_in", label: "Email sign-in" };
    default:
      return { key: "unknown", label: method.trim() || "Unknown method" };
  }
}

function buildLegacySummary(input: {
  authBreakdown: AuthBreakdownItem[];
  generatedAtUtc: string | null;
  range: RangeOption;
}) : AuthOutcomeSummary {
  const methods: AuthMethodOutcome[] = input.authBreakdown.map((item) => {
    const normalized = normalizeAuthOutcomeMethod(
      item.method.toLowerCase().includes("google")
        ? "google_sign_in"
        : item.method.toLowerCase().includes("sign up")
          ? "email_sign_up"
          : "email_sign_in",
    );
    const unfinished = Math.max(0, item.attempts - item.successes - item.failures);
    return {
      method: normalized.key === "unknown" ? "email_sign_in" : normalized.key,
      attempts: item.attempts,
      successes: item.successes,
      failures: item.failures,
      unfinished,
      successRatePct: item.attempts > 0 ? Math.round((item.successes / item.attempts) * 100) : 0,
      avgFinishMs: item.avgDurationMs > 0 ? item.avgDurationMs : null,
      weakestReason: item.successes === 0 && item.failures > 0 ? "failure_code_unavailable" : undefined,
      failureBreakdown: item.failures > 0
        ? [{
          failureCode: "failure_code_unavailable",
          count: item.failures,
          explanation: "Legacy auth telemetry did not capture a normalized failure code for this method.",
        }]
        : [],
      state: unfinished > 0 || item.avgDurationMs <= 0 ? "review" : "stale",
    };
  });

  const attempts = methods.reduce((sum, method) => sum + method.attempts, 0);
  const successes = methods.reduce((sum, method) => sum + method.successes, 0);
  const failures = methods.reduce((sum, method) => sum + method.failures, 0);
  const unfinished = methods.reduce((sum, method) => sum + method.unfinished, 0);
  return {
    generatedAtUtc: input.generatedAtUtc || new Date().toISOString(),
    range: input.range,
    sourceMode: attempts > 0 || successes > 0 || failures > 0 ? "legacy_event_counts" : "unavailable",
    attempts,
    successes,
    failures,
    unfinished,
    successRatePct: attempts > 0 ? Math.round((successes / attempts) * 100) : 0,
    avgFinishMs: null,
    timingState: "missing_starts",
    lastAuthEventAtUtc: null,
    methods,
    lifecycleOutcomes: [],
  };
}

function buildMethodRows(
  methods: AuthMethodOutcome[],
  source: AuthSourceMode,
  truthState: AdminSurfaceState,
  fakeZeroPrevented: boolean,
) : AdminAnalyticsAuthMethodRow[] {
  return methods.map((method) => {
    const normalized = normalizeAuthOutcomeMethod(method.method);
    return {
      ...method,
      methodKey: normalized.key,
      visibleLabel: normalized.label,
      rawEventNames: METHOD_EVENT_NAMES[normalized.key],
      casingDriftDetected: false,
      reconciliationDelta: method.attempts - method.successes - method.failures - method.unfinished,
      timingAvailable: typeof method.avgFinishMs === "number" && method.avgFinishMs > 0,
      source,
      truthState,
      fakeZeroPrevented,
    };
  });
}

function hasMethodSample(method: AuthMethodOutcome) {
  return method.attempts > 0 || method.successes > 0 || method.failures > 0 || method.unfinished > 0;
}

function hasLegacyBreakdownSample(authBreakdown: AuthBreakdownItem[]) {
  return authBreakdown.some((item) => item.attempts > 0 || item.successes > 0 || item.failures > 0);
}

function topFailureCode(rows: AdminAnalyticsAuthMethodRow[]) {
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    row.failureBreakdown.forEach((failure) => {
      if (!failure.failureCode) {
        return;
      }
      counts.set(failure.failureCode, (counts.get(failure.failureCode) ?? 0) + failure.count);
    });
  });

  return Array.from(counts.entries()).sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
}

function hasCapturedFailureReason(rows: AdminAnalyticsAuthMethodRow[]) {
  return rows.some((row) =>
    row.failureBreakdown.some((failure) => failure.count > 0 && failure.failureCode !== "failure_code_unavailable"),
  );
}

function buildMethodGroupSummary(
  rows: AdminAnalyticsAuthMethodRow[],
  keys: AuthMethodKey[],
  source: AuthSourceMode,
): AuthMethodGroupSummary {
  const groupRows = rows.filter((row) => keys.includes(row.methodKey));
  const hasSample = groupRows.some(hasMethodSample);

  if (!hasSample) {
    return {
      attempts: null,
      successes: null,
      failures: null,
      successRate: null,
      topFailureCode: null,
      source,
    };
  }

  const attempts = groupRows.reduce((sum, row) => sum + row.attempts, 0);
  const successes = groupRows.reduce((sum, row) => sum + row.successes, 0);
  const failures = groupRows.reduce((sum, row) => sum + row.failures, 0);

  return {
    attempts,
    successes,
    failures,
    successRate: attempts > 0 ? successes / attempts : null,
    topFailureCode: topFailureCode(groupRows),
    source,
  };
}

const AUTH_MANUAL_WORKAROUND =
  "Run an email/password login attempt and a Google login attempt, including one intentional email/password failure, then refresh the selected range.";

const AUTH_ALGORITHM_RECOMMENDATION =
  "Exact auth outcomes require auth_attempt_started, auth_attempt_succeeded, auth_attempt_failed, and auth_attempt_unfinished grouped by authAttemptId, method/provider, timestamps, duration, terminal outcome, and safe failureCode. Attempts = count distinct authAttemptId per method group; successes = terminal success; failures = terminal failure; unfinished = started without terminal outcome before timeout/window close; successRate = successes / attempts; topFailureCode = mode(failureCode) over failures.";

const AUTH_FUTURE_INSTRUMENTATION = [
  "Emit auth_attempt_started with authAttemptId, method, provider, startedAtUtc.",
  "Emit auth_attempt_succeeded with same authAttemptId, method, provider, finishedAtUtc, durationMs.",
  "Emit auth_attempt_failed with same authAttemptId, method, provider, safe failureCode, finishedAtUtc, durationMs.",
  "Do not log raw password/email values.",
];

export function buildAdminAnalyticsAuthOutcomeModel(input: {
  selectedRange: RangeOption;
  response?: HistoricalAnalyticsResponse;
  authBreakdown: AuthBreakdownItem[];
  loading: boolean;
  error?: Error;
  overviewTruthState?: AdminSurfaceState;
}): AdminAnalyticsAuthOutcomeModel {
  const hasResponse = Boolean(input.response);
  const stale = Boolean(input.response && (input.error || input.response.cacheState === "stale"));
  const hasLegacyInputSample = hasLegacyBreakdownSample(input.authBreakdown);
  const summary = input.response?.authOutcomeSummary ?? buildLegacySummary({
    authBreakdown: input.authBreakdown,
    generatedAtUtc: input.response?.generatedAtMs ? new Date(input.response.generatedAtMs).toISOString() : null,
    range: input.selectedRange,
  });
  const summaryHasMethodSample = summary.methods.some(hasMethodSample);
  const summarySourceMode = summary.sourceMode ?? (
    input.response?.authOutcomeSummary
      ? summaryHasMethodSample ? "canonical_attempt_chain" : "unavailable"
      : hasLegacyInputSample ? "legacy_event_counts" : "unavailable"
  );
  const hasCanonicalAuthAttemptSample =
    Boolean(input.response?.authOutcomeSummary) &&
    summaryHasMethodSample &&
    summarySourceMode === "canonical_attempt_chain";
  const hasLegacyAuthSample =
    summaryHasMethodSample &&
    (summarySourceMode === "legacy_event_counts" || (!input.response?.authOutcomeSummary && hasLegacyInputSample));
  const hasUsableAuthSample = hasCanonicalAuthAttemptSample || hasLegacyAuthSample;
  const measurementMode: AdminAnalyticsAuthOutcomeModel["measurementMode"] = hasCanonicalAuthAttemptSample
    ? "canonical_attempt_chain"
    : hasLegacyAuthSample
      ? "legacy_event_counts"
      : "unavailable";
  const hydrationState: AuthOutcomeHydrationState = input.error
    ? "error"
    : !hasResponse && input.loading
      ? "waiting"
      : !hasResponse
        ? "no_sample"
        : hasCanonicalAuthAttemptSample
          ? "ready"
          : hasLegacyAuthSample
            ? "legacy_fallback"
            : "no_sample";
  const fakeZeroPrevented = !hasUsableAuthSample;
  const source: AuthSourceMode = !hasResponse
    ? input.loading ? "waiting" : "unavailable"
    : stale
      ? "stale_snapshot"
      : hasCanonicalAuthAttemptSample
        ? "first_party_telemetry"
        : hasLegacyAuthSample
          ? "mixed_degraded"
          : "unavailable";
  const truthState: AdminSurfaceState = input.error
    ? "failed"
    : !hasResponse
      ? input.loading ? "loading" : "unavailable"
      : stale
        ? "stale"
        : hasLegacyAuthSample
          ? "degraded"
          : hasCanonicalAuthAttemptSample
            ? input.overviewTruthState ?? "live"
            : "unavailable";
  const methodBreakdown = hasUsableAuthSample
    ? buildMethodRows(summary.methods, source, truthState, fakeZeroPrevented)
    : [];
  const weakestMethod = methodBreakdown
    .filter((row) => row.attempts > 0)
    .sort((left, right) => left.successRatePct - right.successRatePct)[0] ?? null;
  const mostFailuresMethod = methodBreakdown
    .slice()
    .sort((left, right) => right.failures - left.failures)[0] ?? null;
  const mostUnfinishedMethod = methodBreakdown
    .slice()
    .sort((left, right) => right.unfinished - left.unfinished)[0] ?? null;

  const timingState = hasUsableAuthSample ? summary.timingState ?? "unavailable" : "unavailable";
  const timingMissingReason = !hasUsableAuthSample
    ? null
    : timingState === "available"
      ? null
      : timingState === "missing_starts"
        ? "Finish timing unavailable because start timestamps are missing for one or more completed auth attempts."
        : timingState === "missing_finishes"
          ? "Finish timing unavailable because end timestamps are missing for one or more completed auth attempts."
          : "Finish timing unavailable because completed attempts with start/end timestamps were not observed in this window.";
  const methodGroups = {
    emailPassword: buildMethodGroupSummary(methodBreakdown, ["email_sign_in", "email_sign_up"], source),
    google: buildMethodGroupSummary(methodBreakdown, ["google_sign_in"], source),
  };
  const failureReasonsAvailable = hasCapturedFailureReason(methodBreakdown);
  const emailPasswordTracked = (methodGroups.emailPassword.attempts ?? 0) > 0;
  const googleTracked = (methodGroups.google.attempts ?? 0) > 0;
  const missingPieces = [
    hasCanonicalAuthAttemptSample ? null : "No auth_attempt_* sample in selected range",
    methodGroups.emailPassword.failures && methodGroups.emailPassword.failures > 0 && !hasCapturedFailureReason(
      methodBreakdown.filter((row) => row.methodKey === "email_sign_in" || row.methodKey === "email_sign_up"),
    )
      ? "No safe failureCode captured for failed email/password attempts"
      : null,
    googleTracked ? null : "No Google sign-in attempts observed",
    timingState === "available" ? null : "No completed attempts with start/end timestamps",
  ].filter((item): item is string => Boolean(item));
  const unavailableReason = hasUsableAuthSample
    ? null
    : "No auth attempt sample is available for this range.";
  const primarySummary = input.error
    ? "Auth outcomes unavailable"
    : input.loading && !hasResponse
      ? "Auth outcomes loading"
      : hasCanonicalAuthAttemptSample
        ? "Auth attempt chain tracked"
        : hasLegacyAuthSample
          ? "Legacy auth count fallback"
          : "No auth sample yet";
  const mobileCompactDetail = hasUsableAuthSample
    ? hasCanonicalAuthAttemptSample
      ? "Email/password and Google attempts are separated by method."
      : "Legacy auth counts are partial and not exact attempt chains."
    : "Run email/password and Google attempts, then refresh.";
  const recommendation = !hasUsableAuthSample
    ? input.loading && !input.error
      ? "Waiting for auth outcome data."
      : "No auth sample yet. Run email/password and Google attempts, then refresh."
    : hasLegacyAuthSample
      ? "Legacy auth count fallback. Exact attempt chains require authAttemptId-linked auth_attempt_* records."
      : timingMissingReason
        ? timingMissingReason
        : weakestMethod && weakestMethod.successRatePct === 0 && weakestMethod.failures > 0
          ? `${weakestMethod.visibleLabel} has 0 successes; top failure: ${weakestMethod.failureBreakdown[0]?.failureCode || "failure_code_unavailable"}.`
          : mostUnfinishedMethod && mostUnfinishedMethod.unfinished > 0
            ? `${mostUnfinishedMethod.visibleLabel} has the most unfinished attempts.`
            : "Auth outcomes are fully source-truthed for this sample.";

  return {
    selectedRange: input.selectedRange,
    sectionSourceMode: source,
    canonicalSource: "first_party_auth_telemetry",
    currentSource: source,
    stale,
    cache: Boolean(input.response?.cacheState && input.response.cacheState !== "miss"),
    serverConfirmed: hasResponse && !input.error,
    fallback: hasLegacyAuthSample,
    estimated: false,
    attempts: { value: hasUsableAuthSample ? summary.attempts : null, source },
    successes: { value: hasUsableAuthSample ? summary.successes : null, source },
    failures: { value: hasUsableAuthSample ? summary.failures : null, source },
    unfinished: { value: hasUsableAuthSample ? summary.unfinished : null, source },
    successRate: { formula: "successes / attempts", value: hasUsableAuthSample && summary.attempts > 0 ? summary.successes / summary.attempts : null },
    avgFinish: { formula: "completed attempts with start/end timestamps", value: hasUsableAuthSample ? summary.avgFinishMs : null },
    timingAvailable: timingState === "available",
    timingState,
    timingMissingReason,
    lastAuthEventAtUtc: summary.lastAuthEventAtUtc,
    generatedAtUtc: summary.generatedAtUtc,
    methodBreakdown,
    lifecycleOutcomes: summary.lifecycleOutcomes,
    weakestMethod,
    mostFailuresMethod,
    mostUnfinishedMethod,
    recommendation,
    authSourceMode: source,
    successRateFormula: "successes / attempts",
    fakeZeroPrevented,
    duplicateRefreshPrevented: Boolean(input.response?.cacheRevalidating && input.loading),
    badgeOverflowProtectionEnabled: true,
    sampleTooSmall: hasUsableAuthSample && summary.attempts < 10,
    modeLabel: input.error
      ? "ERROR"
      : !hasResponse
        ? input.loading ? "WAIT" : "NO SAMPLE"
        : stale
          ? "STALE"
          : hasCanonicalAuthAttemptSample
            ? "LIVE"
            : hasLegacyAuthSample
              ? "PARTIAL"
              : "NO SAMPLE",
    hydrationState,
    hasCanonicalAuthAttemptSample,
    hasLegacyAuthSample,
    hasUsableAuthSample,
    canRenderMethodDetails: hasUsableAuthSample,
    measurementMode,
    unavailableReason,
    manualWorkaround: hasUsableAuthSample ? null : AUTH_MANUAL_WORKAROUND,
    algorithmRecommendation: AUTH_ALGORITHM_RECOMMENDATION,
    primarySummary,
    mobileCompactDetail,
    methodGroups,
    trackingCapability: {
      exactAttemptChainAvailable: hasCanonicalAuthAttemptSample,
      failureReasonsAvailable,
      emailPasswordTracked,
      googleTracked,
      missingPieces,
      manualWorkaround: AUTH_MANUAL_WORKAROUND,
      futureInstrumentation: AUTH_FUTURE_INSTRUMENTATION,
    },
  };
}
