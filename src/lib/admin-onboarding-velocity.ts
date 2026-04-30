import type { AdminSurfaceState } from "@/lib/admin-parity";
import type { HistoricalAnalyticsResponse, RangeOption } from "@/types/admin-analytics";

export interface AdminOnboardingStatsInput {
    starts?: number;
    completions: number;
    avgDuration: number;
    completionRate?: number;
    startSource?: "tracked" | "completion_fallback" | "none";
}

export interface AdminOnboardingStepStatInput {
    stepKey: string;
    stepTitle: string;
    stepIndex: number;
    starts: number;
    completions: number;
    avgDurationMs: number;
}

export interface AdminOnboardingStepModel extends AdminOnboardingStepStatInput {
    completionRate: number;
    dropOffCount: number;
    shortLabel: string;
}

export interface AdminOnboardingVelocityModel {
    selectedRange: RangeOption | "unknown";
    canonicalOnboardingSource: "first_party_onboarding_telemetry";
    onboardingStarts: { value: number | null; source: string };
    onboardingCompletions: { value: number | null; source: string };
    onboardingDropoffs: { value: number | null; formula: "started - completed" };
    completionRateMetric: { value: number | null; formula: "completed / started" };
    avgCompletionTime: { value: number | null; source: string; formula: "mean successful completion duration" };
    medianCompletionTime: { value: number | null; source: "not_available_from_current_summary" };
    durationBucketCounts: Array<{ label: string; count: number }>;
    durationBucketTotal: number;
    bucketReconciliationDelta: number | null;
    authSignups: { value: number | null; source: "journey_funnel_auth_signup_events" };
    onboardingStepFlowStarts: { value: number | null; source: "onboarding_step_flow" };
    discrepancyDetected: boolean;
    discrepancyType: "expected_mismatch" | "source_mismatch" | "timing_window_mismatch" | "event_catalog_mismatch" | "instrumentation_issue" | "unknown" | "none";
    discrepancySummary: string | null;
    discrepancyFormula: string | null;
    discrepancySeverity: "none" | "info" | "warn";
    expectedMismatch: boolean;
    timingMissing: boolean;
    missingStartTimestampCount: number;
    missingCompletionTimestampCount: number;
    stale: boolean;
    cache: boolean;
    serverConfirmed: boolean;
    fallback: boolean;
    estimated: boolean;
    fromCache: boolean | null;
    hasPendingWrites: boolean | null;
    gaSource: "not_used_for_onboarding_velocity";
    fakeZeroPrevented: boolean;
    hydrationMs: number | null;
    duplicateRefreshPrevented: boolean;
    compactLayoutApplied: true;
    truthState: AdminSurfaceState;
    starts: number;
    completions: number;
    completionRate: number;
    dropOffCount: number;
    hasVelocityData: boolean;
    steps: AdminOnboardingStepModel[];
    discrepancies: string[];
}

export function buildAdminOnboardingVelocityModel(input: {
    selectedRange?: RangeOption;
    response?: HistoricalAnalyticsResponse;
    stats: AdminOnboardingStatsInput;
    durationBuckets: Array<{ label: string; count: number }>;
    steps: AdminOnboardingStepStatInput[];
    authSignUps: number;
    loading?: boolean;
    error?: Error;
    overviewTruthState?: AdminSurfaceState;
}) : AdminOnboardingVelocityModel {
    const hasValidatedSource = input.response !== undefined || input.selectedRange === undefined;
    const fakeZeroPrevented = !hasValidatedSource;
    const starts = input.stats.starts ?? 0;
    const completionRate = input.stats.completionRate ?? (
        starts > 0
            ? input.stats.completions / Math.max(1, starts)
            : 0
    );
    const dropOffCount = Math.max(0, starts - input.stats.completions);
    const steps = input.steps.map((step) => ({
        ...step,
        completionRate: step.starts > 0 ? step.completions / Math.max(1, step.starts) : 0,
        dropOffCount: Math.max(0, step.starts - step.completions),
        shortLabel: step.stepTitle.length > 18 ? `${step.stepTitle.slice(0, 18)}...` : step.stepTitle,
    }));
    const finalStep = steps.reduce<AdminOnboardingStepModel | null>((current, step) => {
        if (!current || step.stepIndex > current.stepIndex) {
            return step;
        }
        return current;
    }, null);
    const durationBucketTotal = input.durationBuckets.reduce((sum, bucket) => sum + Math.max(0, bucket.count), 0);
    const bucketReconciliationDelta = hasValidatedSource
        ? durationBucketTotal - input.stats.completions
        : null;
    const timingMissing = input.stats.completions > 0 && input.stats.avgDuration <= 0;
    const onboardingStepFlowStarts = steps[0]?.starts ?? null;
    const authStartDelta = input.authSignUps - starts;
    const startSource = input.stats.startSource ?? "none";
    const onboardingStartSource = startSource === "tracked"
        ? "canonical_onboarding_start_events"
        : startSource === "completion_fallback"
            ? "completion_backfill"
            : "unavailable";
    const discrepancyDetails = [
        input.authSignUps !== starts
            ? `Auth sign-ups ${input.authSignUps} do not match onboarding starts ${starts}.`
            : "",
        finalStep && finalStep.completions !== input.stats.completions
            ? `Final onboarding step completions ${finalStep.completions} do not match onboarding completions ${input.stats.completions}.`
            : "",
        bucketReconciliationDelta !== null && bucketReconciliationDelta !== 0
            ? `Duration bucket total ${durationBucketTotal} does not match onboarding completions ${input.stats.completions}.`
            : "",
    ].filter((entry): entry is string => entry.length > 0);
    const expectedMismatch = input.authSignUps !== starts;
    const discrepancyType: AdminOnboardingVelocityModel["discrepancyType"] =
        discrepancyDetails.length === 0
            ? "none"
            : expectedMismatch
                ? "expected_mismatch"
                : startSource === "completion_fallback"
                    ? "source_mismatch"
                    : finalStep && finalStep.completions !== input.stats.completions
                        ? "event_catalog_mismatch"
                        : "unknown";
    const discrepancySummary = discrepancyDetails.length === 0
        ? null
        : expectedMismatch
            ? "Source mismatch: auth sign-ups and onboarding starts measure different events."
            : input.authSignUps !== starts
                ? "Onboarding starts exceed auth sign-ups in this range. Details in Debug."
                : "Discrepancy detected between onboarding sources. Details in Debug.";
    const stale = Boolean(input.response && (input.error || input.response.cacheState === "stale"));
    const truthState: AdminSurfaceState = !hasValidatedSource
        ? input.loading ? "loading" : "unavailable"
        : stale
            ? "stale"
            : input.overviewTruthState ?? "live";

    return {
        selectedRange: input.selectedRange ?? "unknown",
        canonicalOnboardingSource: "first_party_onboarding_telemetry",
        onboardingStarts: {
            value: fakeZeroPrevented ? null : starts,
            source: onboardingStartSource,
        },
        onboardingCompletions: {
            value: fakeZeroPrevented ? null : input.stats.completions,
            source: "first_party_onboarding_completion_events",
        },
        onboardingDropoffs: {
            value: fakeZeroPrevented ? null : dropOffCount,
            formula: "started - completed",
        },
        completionRateMetric: {
            value: fakeZeroPrevented || starts <= 0 ? null : completionRate,
            formula: "completed / started",
        },
        avgCompletionTime: {
            value: fakeZeroPrevented || timingMissing ? null : input.stats.avgDuration,
            source: timingMissing ? "missing_start_or_completion_timestamps" : "first_party_onboarding_duration_events",
            formula: "mean successful completion duration",
        },
        medianCompletionTime: {
            value: null,
            source: "not_available_from_current_summary",
        },
        durationBucketCounts: input.durationBuckets,
        durationBucketTotal,
        bucketReconciliationDelta,
        authSignups: {
            value: fakeZeroPrevented ? null : input.authSignUps,
            source: "journey_funnel_auth_signup_events",
        },
        onboardingStepFlowStarts: {
            value: fakeZeroPrevented ? null : onboardingStepFlowStarts,
            source: "onboarding_step_flow",
        },
        discrepancyDetected: discrepancyDetails.length > 0,
        discrepancyType,
        discrepancySummary,
        discrepancyFormula: input.authSignUps !== starts
            ? "auth sign-ups compared with canonical onboarding starts; these are different events"
            : finalStep && finalStep.completions !== input.stats.completions
                ? "final step completions compared with onboarding completion summary"
                : null,
        discrepancySeverity: discrepancyDetails.length === 0 ? "none" : expectedMismatch ? "info" : "warn",
        expectedMismatch,
        timingMissing,
        missingStartTimestampCount: timingMissing ? input.stats.completions : 0,
        missingCompletionTimestampCount: timingMissing ? input.stats.completions : 0,
        stale,
        cache: Boolean(input.response?.cacheState && input.response.cacheState !== "miss"),
        serverConfirmed: hasValidatedSource && !input.error,
        fallback: Boolean(input.error || input.response?.cacheRevalidating || startSource === "completion_fallback"),
        estimated: false,
        fromCache: input.response?.cacheState ? input.response.cacheState !== "miss" : null,
        hasPendingWrites: null,
        gaSource: "not_used_for_onboarding_velocity",
        fakeZeroPrevented,
        hydrationMs: null,
        duplicateRefreshPrevented: Boolean(input.response?.cacheRevalidating && input.loading),
        compactLayoutApplied: true,
        truthState,
        starts,
        completions: input.stats.completions,
        completionRate,
        dropOffCount,
        hasVelocityData: input.durationBuckets.some((bucket) => bucket.count > 0),
        steps,
        discrepancies: discrepancyDetails,
    };
}
