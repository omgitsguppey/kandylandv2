import type { AdminSurfaceState } from "@/lib/admin-parity";
import type { HistoricalAnalyticsResponse, RangeOption } from "@/types/admin-analytics";

type FunnelMode = "ordered" | "unique_user" | "unique_session" | "raw_event" | "mixed_degraded";
type DenominatorMode = "prior_step" | "base_step" | "raw_event_ratio" | "ordered_transition";
type JourneySource = "first_party_event_counts" | "mixed_first_party_payment" | "waiting" | "unavailable";

type FunnelFlags = {
  stale: boolean;
  cache: boolean;
  serverConfirmed: boolean;
  fallback: boolean;
  estimated: boolean;
};

export type AdminAnalyticsJourneyFunnelStep = FunnelFlags & {
  stepKey: string;
  eventName: string;
  visibleLabel: string;
  rawEventCount: number | null;
  uniqueUserCount: number | null;
  uniqueSessionCount: number | null;
  orderedTransitionCount: number | null;
  displayedCount: number | null;
  displayedPercent: number | null;
  denominatorStep: string | null;
  denominatorValue: number | null;
  denominatorLabel: string;
  source: JourneySource;
  truthState: AdminSurfaceState;
  fakeZeroPrevented: boolean;
};

export type AdminAnalyticsJourneyFunnelModel = FunnelFlags & {
  selectedRange: RangeOption;
  funnelMode: FunnelMode;
  denominatorMode: DenominatorMode;
  modeLabel: "RAW" | "UNIQUE" | "ORDERED" | "MIXED" | "WAIT" | "ERROR" | "STALE";
  visibleTitle: "Event Chain" | "Journey Funnel";
  visibleHelperCopy: string;
  steps: AdminAnalyticsJourneyFunnelStep[];
  supportingMetrics: AdminAnalyticsJourneyFunnelStep[];
  nonSequentialSteps: string[];
  sourceMismatchSteps: string[];
  onboardingComparison: {
    authSignUps: number | null;
    onboardingStarts: number | null;
    onboardingCompletions: number | null;
    mismatchDetected: boolean;
  };
  journeyStatsComparison: {
    orderedJourneyAvailable: boolean;
    uniqueUserAvailable: boolean;
    uniqueSessionAvailable: boolean;
  };
  biggestDropoffStep: string | null;
  biggestDropoffPercent: number | null;
  recommendation: string;
  degradedReasons: string[];
  visibleDegradedCopy: string;
  duplicateRefreshPrevented: boolean;
  hydrationMs: number | null;
  badgeOverflowProtectionEnabled: true;
};

const MAIN_STEPS = [
  { stepKey: "authModalOpens", eventName: "auth_modal_opened", visibleLabel: "Auth modal opens" },
  { stepKey: "previewOpens", eventName: "drop_preview_opened", visibleLabel: "Drop previews" },
  { stepKey: "viewerOpens", eventName: "viewer_opened", visibleLabel: "Viewer opens" },
  { stepKey: "unlocks", eventName: "unlock_drop_success", visibleLabel: "Unlocks" },
  { stepKey: "checkoutStarts", eventName: "begin_checkout", visibleLabel: "Checkout starts" },
  { stepKey: "purchases", eventName: "gumdrops_purchase_completed", visibleLabel: "Purchases" },
] as const;

const SUPPORTING_STEPS = [
  { stepKey: "shares", eventName: "drop_share_copied", visibleLabel: "Shares" },
  { stepKey: "checkIns", eventName: "daily_check_in_claim", visibleLabel: "Daily check-ins" },
] as const;

type FunnelKey = (typeof MAIN_STEPS)[number]["stepKey"] | (typeof SUPPORTING_STEPS)[number]["stepKey"];

function readCount(funnel: HistoricalAnalyticsResponse["funnel"] | undefined, key: FunnelKey) {
  const value = funnel?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function resolveTruthState(input: {
  response?: HistoricalAnalyticsResponse;
  loading: boolean;
  error?: Error;
  overviewTruthState?: AdminSurfaceState;
  nonSequential: boolean;
}): AdminSurfaceState {
  if (!input.response) {
    return input.loading ? "loading" : "unavailable";
  }
  if (input.error || input.response.cacheState === "stale") {
    return "stale";
  }
  if (input.nonSequential) {
    return "degraded";
  }
  return input.overviewTruthState ?? (input.response.cacheState === "fresh" ? "cached" : "live");
}

function buildStep(input: {
  stepKey: FunnelKey;
  eventName: string;
  visibleLabel: string;
  count: number | null;
  priorStep: string | null;
  priorValue: number | null;
  source: JourneySource;
  truthState: AdminSurfaceState;
  flags: FunnelFlags;
  fakeZeroPrevented: boolean;
}): AdminAnalyticsJourneyFunnelStep {
  const displayedPercent =
    input.count !== null && input.priorValue !== null && input.priorValue > 0
      ? input.count / input.priorValue
      : input.priorStep === null && input.count !== null
        ? 1
        : null;

  return {
    stepKey: input.stepKey,
    eventName: input.eventName,
    visibleLabel: input.visibleLabel,
    rawEventCount: input.count,
    uniqueUserCount: null,
    uniqueSessionCount: null,
    orderedTransitionCount: null,
    displayedCount: input.count,
    displayedPercent,
    denominatorStep: input.priorStep,
    denominatorValue: input.priorValue,
    denominatorLabel: input.priorStep ? `vs ${input.priorStep}` : "Base raw events",
    source: input.source,
    truthState: input.truthState,
    fakeZeroPrevented: input.fakeZeroPrevented,
    ...input.flags,
  };
}

export function buildAdminAnalyticsJourneyFunnelModel(input: {
  selectedRange: RangeOption;
  response?: HistoricalAnalyticsResponse;
  funnel?: HistoricalAnalyticsResponse["funnel"];
  onboardingStats?: HistoricalAnalyticsResponse["onboardingStats"];
  loading: boolean;
  error?: Error;
  overviewTruthState?: AdminSurfaceState;
}): AdminAnalyticsJourneyFunnelModel {
  const hasResponse = Boolean(input.response);
  const flags: FunnelFlags = {
    stale: Boolean(input.response && (input.error || input.response.cacheState === "stale")),
    cache: Boolean(input.response?.cacheState && input.response.cacheState !== "miss"),
    serverConfirmed: hasResponse && !input.error,
    fallback: Boolean(input.response?.cacheRevalidating || input.error),
    estimated: false,
  };
  const fakeZeroPrevented = !hasResponse;
  const source: JourneySource = hasResponse ? "first_party_event_counts" : input.loading ? "waiting" : "unavailable";
  const rawCounts = new Map<FunnelKey, number | null>(
    [...MAIN_STEPS, ...SUPPORTING_STEPS].map((step) => [step.stepKey, readCount(input.funnel, step.stepKey)]),
  );
  const nonSequentialSteps = MAIN_STEPS.slice(1)
    .filter((step, index) => {
      const current = rawCounts.get(step.stepKey) ?? null;
      const prior = rawCounts.get(MAIN_STEPS[index].stepKey) ?? null;
      return current !== null && prior !== null && current > prior;
    })
    .map((step) => step.stepKey);
  const purchaseCount = rawCounts.get("purchases") ?? null;
  const checkoutCount = rawCounts.get("checkoutStarts") ?? null;
  const sourceMismatchSteps =
    purchaseCount !== null && checkoutCount !== null && purchaseCount > checkoutCount
      ? ["purchases"]
      : [];
  const funnelMode: FunnelMode = !hasResponse
    ? input.loading ? "mixed_degraded" : "mixed_degraded"
    : nonSequentialSteps.length > 0 || sourceMismatchSteps.length > 0
      ? "raw_event"
      : "raw_event";
  const denominatorMode: DenominatorMode = "raw_event_ratio";
  const truthState = resolveTruthState({
    response: input.response,
    loading: input.loading,
    error: input.error,
    overviewTruthState: input.overviewTruthState,
    nonSequential: nonSequentialSteps.length > 0 || sourceMismatchSteps.length > 0,
  });
  const steps = MAIN_STEPS.map((step, index) => {
    const prior = index === 0 ? null : MAIN_STEPS[index - 1];
    const stepSource: JourneySource =
      step.stepKey === "purchases" && source === "first_party_event_counts"
        ? "mixed_first_party_payment"
        : source;
    return buildStep({
      ...step,
      count: hasResponse ? rawCounts.get(step.stepKey) ?? null : null,
      priorStep: prior?.stepKey ?? null,
      priorValue: prior ? rawCounts.get(prior.stepKey) ?? null : null,
      source: stepSource,
      truthState,
      flags,
      fakeZeroPrevented,
    });
  });
  const supportingMetrics = SUPPORTING_STEPS.map((step) =>
    buildStep({
      ...step,
      count: hasResponse ? rawCounts.get(step.stepKey) ?? null : null,
      priorStep: null,
      priorValue: null,
      source,
      truthState,
      flags,
      fakeZeroPrevented,
    }),
  );
  const dropoffs = steps.slice(1)
    .filter((step) => step.displayedPercent !== null && step.displayedPercent <= 1)
    .map((step) => ({ step: step.stepKey, dropoff: 1 - (step.displayedPercent ?? 0) }))
    .sort((left, right) => right.dropoff - left.dropoff);
  const biggestDropoff = dropoffs[0] ?? null;
  const onboardingStarts = input.onboardingStats?.starts ?? null;
  const onboardingCompletions = input.onboardingStats?.completions ?? null;
  const authSignUps = input.funnel?.authSignUps ?? null;
  const onboardingMismatch =
    authSignUps !== null &&
    onboardingCompletions !== null &&
    Math.abs(authSignUps - onboardingCompletions) > Math.max(3, onboardingCompletions * 0.25);
  const degradedReasons = [
    "Journey Funnel is currently raw repeated event counts, not ordered actor/session transitions.",
    ...nonSequentialSteps.map((step) => `${step} exceeds its prior step.`),
    ...sourceMismatchSteps.map((step) => `${step} uses a mixed purchase source and exceeds checkout starts.`),
    onboardingMismatch ? "Onboarding completion counts differ from auth signup counts." : null,
  ].filter((reason): reason is string => Boolean(reason));
  const visibleHelperCopy = hasResponse
    ? "This view counts repeated events, not unique people moving step by step."
    : input.loading
      ? "Waiting for journey event counts."
      : "Journey event counts are unavailable.";

  return {
    selectedRange: input.selectedRange,
    funnelMode,
    denominatorMode,
    modeLabel: !hasResponse ? input.loading ? "WAIT" : "ERROR" : flags.stale ? "STALE" : "RAW",
    visibleTitle: "Event Chain",
    visibleHelperCopy,
    steps,
    supportingMetrics,
    nonSequentialSteps,
    sourceMismatchSteps,
    onboardingComparison: {
      authSignUps,
      onboardingStarts,
      onboardingCompletions,
      mismatchDetected: onboardingMismatch,
    },
    journeyStatsComparison: {
      orderedJourneyAvailable: false,
      uniqueUserAvailable: false,
      uniqueSessionAvailable: false,
    },
    biggestDropoffStep: biggestDropoff?.step ?? null,
    biggestDropoffPercent: biggestDropoff ? biggestDropoff.dropoff : null,
    recommendation: sourceMismatchSteps.length > 0
      ? "Raw events exceed prior steps; use unique journey mode before treating this as conversion."
      : biggestDropoff
        ? `${biggestDropoff.step} is the largest raw-event drop-off.`
        : "Raw event chain is available; ordered journey validation is still required for conversion claims.",
    degradedReasons,
    visibleDegradedCopy: degradedReasons.length > 0
      ? "Some steps use raw or mixed sources, so conversion is directional."
      : "",
    duplicateRefreshPrevented: Boolean(input.response?.cacheRevalidating && input.loading),
    hydrationMs: hasResponse ? 0 : null,
    badgeOverflowProtectionEnabled: true,
    ...flags,
  };
}
