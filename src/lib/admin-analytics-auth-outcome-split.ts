import type { AdminSurfaceState } from "@/lib/admin-parity";
import type { AuthBreakdownItem, HistoricalAnalyticsResponse, RangeOption } from "@/types/admin-analytics";

type AuthSourceMode = "first_party_telemetry" | "stale_snapshot" | "mixed_degraded" | "waiting" | "unavailable";
type AuthMethodKey = "google_sign_in" | "email_sign_up" | "email_sign_in" | "registration_completed" | "unknown";

export type AdminAnalyticsAuthMethodRow = {
  methodKey: AuthMethodKey;
  visibleLabel: string;
  rawEventNames: string[];
  casingDriftDetected: boolean;
  attempts: number | null;
  successes: number | null;
  failures: number | null;
  unfinished: number | null;
  reconciliationDelta: number | null;
  successRate: number | null;
  avgFinishMs: number | null;
  timingAvailable: boolean;
  source: AuthSourceMode;
  truthState: AdminSurfaceState;
  registeredUsersClassifiedAsMethod: boolean;
  registeredUsersMovedToOutcome: boolean;
  fakeZeroPrevented: boolean;
};

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
  avgFinish: { formula: "weighted successful finish duration"; value: number | null };
  timingAvailable: boolean;
  timingMissingReason: string | null;
  missingStartCount: number;
  missingFinishCount: number;
  unfinishedTimeoutWindow: "not_available_from_current_summary";
  methodBreakdown: AdminAnalyticsAuthMethodRow[];
  registrationOutcome: AdminAnalyticsAuthMethodRow | null;
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
  modeLabel: "LIVE" | "STALE" | "RAW" | "MIXED" | "WAIT" | "ERROR";
};

const METHOD_EVENT_NAMES: Record<AuthMethodKey, string[]> = {
  google_sign_in: [
    "auth_google_sign_in_attempted",
    "auth_google_sign_in_success",
    "auth_google_sign_in_failed",
  ],
  email_sign_up: [
    "auth_sign_up_attempted",
    "auth_sign_up_success",
    "auth_sign_up_failed",
    "user_registered",
  ],
  email_sign_in: [
    "auth_sign_in_attempted",
    "auth_sign_in_success",
    "auth_sign_in_failed",
  ],
  registration_completed: ["user_registered", "auth_sign_up_success"],
  unknown: [],
};

export function normalizeAuthOutcomeMethod(method: string): { key: AuthMethodKey; label: string; isOutcome: boolean } {
  const normalized = method.trim().replaceAll("_", " ").replaceAll("-", " ").toLowerCase();
  if (normalized.includes("google")) return { key: "google_sign_in", label: "Google sign-in", isOutcome: false };
  if (normalized.includes("sign up") || normalized.includes("signup")) return { key: "email_sign_up", label: "Email sign-up", isOutcome: false };
  if (normalized.includes("registered")) return { key: "registration_completed", label: "Registration completed", isOutcome: true };
  if (normalized.includes("email") || normalized.includes("password") || normalized.includes("sign in")) return { key: "email_sign_in", label: "Email sign-in", isOutcome: false };
  return { key: "unknown", label: method.trim() || "Unknown method", isOutcome: false };
}

function detectCasingDrift(method: string, label: string): boolean {
  const readable = method.trim().replaceAll("_", " ").replaceAll("-", " ");
  if (!readable) return false;
  return readable !== label && readable.toLowerCase() === label.toLowerCase();
}

function hasNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function buildRow(input: {
  item: AuthBreakdownItem;
  source: AuthSourceMode;
  truthState: AdminSurfaceState;
  fakeZeroPrevented: boolean;
}): AdminAnalyticsAuthMethodRow {
  const normalized = normalizeAuthOutcomeMethod(input.item.method);
  const attempts = Math.max(0, input.item.attempts ?? 0);
  const successes = Math.max(0, input.item.successes ?? 0);
  const failures = Math.max(0, input.item.failures ?? 0);
  const unfinished = Math.max(0, attempts - successes - failures);
  const reconciliationDelta = attempts - successes - failures - unfinished;
  const timingAvailable = hasNumber(input.item.avgDurationMs) && input.item.avgDurationMs > 0;

  return {
    methodKey: normalized.key,
    visibleLabel: normalized.label,
    rawEventNames: METHOD_EVENT_NAMES[normalized.key],
    casingDriftDetected: detectCasingDrift(input.item.method, normalized.label),
    attempts: input.fakeZeroPrevented ? null : attempts,
    successes: input.fakeZeroPrevented ? null : successes,
    failures: input.fakeZeroPrevented ? null : failures,
    unfinished: input.fakeZeroPrevented ? null : unfinished,
    reconciliationDelta: input.fakeZeroPrevented ? null : reconciliationDelta,
    successRate: input.fakeZeroPrevented || attempts <= 0 ? null : successes / attempts,
    avgFinishMs: timingAvailable ? input.item.avgDurationMs : null,
    timingAvailable,
    source: input.source,
    truthState: input.truthState,
    registeredUsersClassifiedAsMethod: normalized.key === "registration_completed",
    registeredUsersMovedToOutcome: normalized.isOutcome,
    fakeZeroPrevented: input.fakeZeroPrevented,
  };
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
      : "first_party_telemetry";
  const truthState: AdminSurfaceState = !hasResponse
    ? input.loading ? "loading" : "unavailable"
    : stale
      ? "stale"
      : input.overviewTruthState ?? "live";
  const rawRows = input.authBreakdown.map((item) =>
    buildRow({ item, source, truthState, fakeZeroPrevented }),
  );
  const rows = rawRows
    .map((row) => ({ ...row, truthState }))
    .filter((row) => row.methodKey !== "registration_completed");
  const registrationOutcome = rawRows
    .map((row) => ({ ...row, truthState }))
    .find((row) => row.methodKey === "registration_completed") ?? null;
  const totals = rows.reduce(
    (acc, row) => ({
      attempts: acc.attempts + (row.attempts ?? 0),
      successes: acc.successes + (row.successes ?? 0),
      failures: acc.failures + (row.failures ?? 0),
      unfinished: acc.unfinished + (row.unfinished ?? 0),
      durationWeight: acc.durationWeight + ((row.avgFinishMs ?? 0) * (row.successes ?? 0)),
      durationSamples: acc.durationSamples + (row.timingAvailable ? row.successes ?? 0 : 0),
    }),
    { attempts: 0, successes: 0, failures: 0, unfinished: 0, durationWeight: 0, durationSamples: 0 },
  );
  const rankedRows = rows.filter((row) => (row.attempts ?? 0) >= 3);
  const weakestMethod = rankedRows.slice().sort((a, b) => (a.successRate ?? 1) - (b.successRate ?? 1))[0] ?? null;
  const mostFailuresMethod = rows.slice().sort((a, b) => (b.failures ?? 0) - (a.failures ?? 0))[0] ?? null;
  const mostUnfinishedMethod = rows.slice().sort((a, b) => (b.unfinished ?? 0) - (a.unfinished ?? 0))[0] ?? null;
  const timingAvailable = rows.some((row) => row.timingAvailable);
  const missingFinishCount = rows.reduce((sum, row) => sum + (row.timingAvailable ? 0 : row.successes ?? 0), 0);
  const attemptsValue = fakeZeroPrevented ? null : totals.attempts;
  const successesValue = fakeZeroPrevented ? null : totals.successes;
  const failuresValue = fakeZeroPrevented ? null : totals.failures;
  const unfinishedValue = fakeZeroPrevented ? null : totals.unfinished;
  const successRateValue = fakeZeroPrevented || totals.attempts <= 0 ? null : totals.successes / totals.attempts;
  const avgFinishValue = timingAvailable && totals.durationSamples > 0
    ? totals.durationWeight / totals.durationSamples
    : null;
  const recommendation = !hasResponse
    ? input.loading ? "Waiting for auth outcome data." : "Auth outcome data is unavailable."
    : !timingAvailable
      ? "Finish timing unavailable; start/end timestamps are missing."
      : weakestMethod && (weakestMethod.successRate ?? 1) < 0.5
        ? `${weakestMethod.visibleLabel} needs attention.`
        : mostUnfinishedMethod && (mostUnfinishedMethod.unfinished ?? 0) > 0
          ? `${mostUnfinishedMethod.visibleLabel} has the most unfinished attempts.`
          : "No auth action required for this sample.";

  return {
    selectedRange: input.selectedRange,
    sectionSourceMode: source,
    canonicalSource: "first_party_auth_telemetry",
    currentSource: source,
    stale,
    cache: Boolean(input.response?.cacheState && input.response.cacheState !== "miss"),
    serverConfirmed: hasResponse && !input.error,
    fallback: Boolean(input.error || input.response?.cacheRevalidating),
    estimated: false,
    attempts: { value: attemptsValue, source },
    successes: { value: successesValue, source },
    failures: { value: failuresValue, source },
    unfinished: { value: unfinishedValue, source },
    successRate: { formula: "successes / attempts", value: successRateValue },
    avgFinish: { formula: "weighted successful finish duration", value: avgFinishValue },
    timingAvailable,
    timingMissingReason: timingAvailable ? null : "Auth start/end duration parameters are missing or zero.",
    missingStartCount: timingAvailable ? 0 : totals.attempts,
    missingFinishCount,
    unfinishedTimeoutWindow: "not_available_from_current_summary",
    methodBreakdown: rows,
    registrationOutcome,
    weakestMethod,
    mostFailuresMethod,
    mostUnfinishedMethod,
    recommendation,
    authSourceMode: source,
    successRateFormula: "successes / attempts",
    fakeZeroPrevented,
    duplicateRefreshPrevented: Boolean(input.response?.cacheRevalidating && input.loading),
    badgeOverflowProtectionEnabled: true,
    sampleTooSmall: totals.attempts < 10,
    modeLabel: !hasResponse ? input.loading ? "WAIT" : "ERROR" : stale ? "STALE" : "RAW",
  };
}
