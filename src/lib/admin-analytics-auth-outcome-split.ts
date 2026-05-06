import type { AdminSurfaceState } from "@/lib/admin-parity";
import type {
  AuthBreakdownItem,
  AuthLifecycleOutcome,
  AuthMethodOutcome,
  AuthOutcomeSummary,
  HistoricalAnalyticsResponse,
  RangeOption,
} from "@/types/admin-analytics";

type AuthSourceMode = "first_party_telemetry" | "stale_snapshot" | "mixed_degraded" | "waiting" | "unavailable";
type AuthMethodKey = "google_sign_in" | "email_sign_up" | "email_sign_in" | "unknown";

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
  modeLabel: "LIVE" | "STALE" | "PARTIAL" | "WAIT" | "ERROR";
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

export function buildAdminAnalyticsAuthOutcomeModel(input: {
  selectedRange: RangeOption;
  response?: HistoricalAnalyticsResponse;
  authBreakdown: AuthBreakdownItem[];
  loading: boolean;
  error?: Error;
  overviewTruthState?: AdminSurfaceState;
}): AdminAnalyticsAuthOutcomeModel {
  const hasResponse = Boolean(input.response);
  const fakeZeroPrevented = !hasResponse;
  const stale = Boolean(input.response && (input.error || input.response.cacheState === "stale"));
  const source: AuthSourceMode = !hasResponse
    ? input.loading ? "waiting" : "unavailable"
    : stale
      ? "stale_snapshot"
      : input.response?.authOutcomeSummary ? "first_party_telemetry" : "mixed_degraded";
  const truthState: AdminSurfaceState = !hasResponse
    ? input.loading ? "loading" : "unavailable"
    : stale
      ? "stale"
      : input.overviewTruthState ?? "live";
  const summary = input.response?.authOutcomeSummary ?? buildLegacySummary({
    authBreakdown: input.authBreakdown,
    generatedAtUtc: input.response?.generatedAtMs ? new Date(input.response.generatedAtMs).toISOString() : null,
    range: input.selectedRange,
  });
  const methodBreakdown = buildMethodRows(summary.methods, source, truthState, fakeZeroPrevented);
  const weakestMethod = methodBreakdown
    .filter((row) => row.attempts > 0)
    .sort((left, right) => left.successRatePct - right.successRatePct)[0] ?? null;
  const mostFailuresMethod = methodBreakdown
    .slice()
    .sort((left, right) => right.failures - left.failures)[0] ?? null;
  const mostUnfinishedMethod = methodBreakdown
    .slice()
    .sort((left, right) => right.unfinished - left.unfinished)[0] ?? null;

  const timingState = summary.timingState ?? "unavailable";
  const timingMissingReason = timingState === "available"
    ? null
    : timingState === "missing_starts"
      ? "Finish timing unavailable because start timestamps are missing for one or more completed auth attempts."
      : timingState === "missing_finishes"
        ? "Finish timing unavailable because end timestamps are missing for one or more completed auth attempts."
        : "Finish timing unavailable because completed attempts with start/end timestamps were not observed in this window.";
  const recommendation = !hasResponse
    ? input.loading
      ? "Waiting for auth outcome data."
      : "Auth outcome data is unavailable."
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
    fallback: !input.response?.authOutcomeSummary,
    estimated: false,
    attempts: { value: fakeZeroPrevented ? null : summary.attempts, source },
    successes: { value: fakeZeroPrevented ? null : summary.successes, source },
    failures: { value: fakeZeroPrevented ? null : summary.failures, source },
    unfinished: { value: fakeZeroPrevented ? null : summary.unfinished, source },
    successRate: { formula: "successes / attempts", value: fakeZeroPrevented ? null : (summary.attempts > 0 ? summary.successes / summary.attempts : 0) },
    avgFinish: { formula: "completed attempts with start/end timestamps", value: fakeZeroPrevented ? null : summary.avgFinishMs },
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
    sampleTooSmall: summary.attempts < 10,
    modeLabel: !hasResponse ? input.loading ? "WAIT" : "ERROR" : stale ? "STALE" : input.response?.authOutcomeSummary ? "LIVE" : "PARTIAL",
  };
}
