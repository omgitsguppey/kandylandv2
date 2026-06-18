import type { AdminSurfaceState } from "@/lib/admin-parity";
import type {
  EventChainPanelState,
  EventChainStep,
  EventSupportingGroup,
  HistoricalAnalyticsResponse,
  RangeOption,
} from "@/types/admin-analytics";

type FunnelMode = EventChainPanelState["mode"];
type DenominatorMode = EventChainPanelState["denominatorMode"];
type JourneySource = "first_party_event_counts" | "mixed_first_party_payment" | "waiting" | "unavailable";
export type EventChainHydrationState = "ready" | "waiting" | "no_sample" | "unavailable" | "error";

type FunnelFlags = {
  stale: boolean;
  cache: boolean;
  serverConfirmed: boolean;
  fallback: boolean;
  estimated: boolean;
};

export type AdminAnalyticsJourneyFunnelStep = FunnelFlags & EventChainStep & {
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

export type AdminAnalyticsJourneyFunnelSupportingMetric = FunnelFlags & EventSupportingGroup & {
  stepKey: string;
  visibleLabel: string;
  rawEventCount: number | null;
  source: JourneySource;
  truthState: AdminSurfaceState;
  fakeZeroPrevented: boolean;
};

export type AdminAnalyticsJourneyFunnelModel = FunnelFlags & Omit<EventChainPanelState, "steps" | "supportingEvents"> & {
  selectedRange: RangeOption;
  funnelMode: FunnelMode;
  denominatorMode: DenominatorMode;
  modeLabel:
    | "Updated"
    | "Partial"
    | "Collecting"
    | "No source"
    | "No sample"
    | "Failed"
    | "Refresh due";
  hydrationState: EventChainHydrationState;
  hasUsableEventSample: boolean;
  canRenderStepDetails: boolean;
  exactUserFunnelAvailable: boolean;
  measurementMode: "event_volume_only" | "ordered_actor_session_funnel" | "unavailable";
  unavailableReason: string | null;
  nextSourceStep: string | null;
  algorithmRecommendation: string | null;
  visibleTitle: "Event Chain" | "Journey Funnel";
  visibleHelperCopy: string;
  steps: AdminAnalyticsJourneyFunnelStep[];
  supportingEvents: AdminAnalyticsJourneyFunnelSupportingMetric[];
  supportingMetrics: AdminAnalyticsJourneyFunnelSupportingMetric[];
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
  { stepKey: "checkIns", eventName: "daily_checkin_claimed", visibleLabel: "Daily check-ins" },
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
  if (input.response.cacheState === "refresh_due" || input.response.staleButVerified) {
    return "cached";
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
  priorStepLabel: string | null;
  priorValue: number | null;
  source: JourneySource;
  truthState: AdminSurfaceState;
  flags: FunnelFlags;
  fakeZeroPrevented: boolean;
}): AdminAnalyticsJourneyFunnelStep {
  const missingCount = input.count === null;
  const missingPriorSample = input.priorStep !== null && input.priorValue === null;
  const displayedPercent =
    input.count !== null && input.priorValue !== null && input.priorValue > 0
      ? input.count / input.priorValue
      : input.priorStep === null && input.count !== null
        ? 1
        : null;
  const ratioMeaning: EventChainStep["ratioMeaning"] = input.priorStep
    ? "event_volume_ratio"
    : "not_comparable";
  const stepState: EventChainStep["state"] =
    input.count === null
      ? "unknown"
      : displayedPercent !== null && displayedPercent > 1
        ? "review"
        : input.truthState === "degraded"
          ? "partial"
          : "live";
  const explanation =
    missingCount
      ? `${input.visibleLabel} has no verified event sample for this range.`
      : input.priorStep === null
      ? `${input.visibleLabel} sets the base event count for this repeated activity chain.`
      : missingPriorSample
        ? "Prior-step sample unavailable. Ratio not computed."
      : input.stepKey === "purchases" && input.priorStep === "checkoutStarts"
        ? `${input.count} purchase events are compared against ${input.priorValue} checkout start events. This is closest to a checkout conversion proxy only if actor/session matching exists; otherwise it is still an event ratio.`
      : displayedPercent !== null && displayedPercent > 1
        ? `${input.visibleLabel} has more events than ${input.priorStepLabel ?? input.priorStep} because this is repeated event volume, not a sequential conversion funnel.`
        : `${input.count} ${input.visibleLabel.toLowerCase()} events are compared against ${input.priorValue} ${input.priorStepLabel?.toLowerCase() ?? input.priorStep} events as an event-volume ratio only.`;

  return {
    stepId: input.stepKey,
    label: input.visibleLabel,
    stepKey: input.stepKey,
    eventName: input.eventName,
    visibleLabel: input.visibleLabel,
    count: input.count ?? 0,
    countUnit: "events",
    rawEventCount: input.count,
    uniqueUserCount: null,
    uniqueSessionCount: null,
    orderedTransitionCount: null,
    displayedCount: input.count,
    displayedPercent,
    denominatorStepId: input.priorStep ?? undefined,
    denominatorCount: input.priorValue ?? undefined,
    ratioPct: displayedPercent,
    ratioMeaning,
    state: stepState,
    explanation,
    denominatorStep: input.priorStep,
    denominatorValue: input.priorValue,
    denominatorLabel: input.priorStepLabel ? `vs ${input.priorStepLabel}` : "Base events",
    source: input.source,
    truthState: input.truthState,
    fakeZeroPrevented: input.fakeZeroPrevented || missingCount || missingPriorSample,
    ...input.flags,
  };
}

function buildSupportingMetric(input: {
  stepKey: FunnelKey;
  eventName: string;
  visibleLabel: string;
  count: number | null;
  source: JourneySource;
  truthState: AdminSurfaceState;
  flags: FunnelFlags;
  fakeZeroPrevented: boolean;
}): AdminAnalyticsJourneyFunnelSupportingMetric {
  const stepState: EventSupportingGroup["state"] =
    input.count === null
      ? "unknown"
      : input.truthState === "degraded"
        ? "partial"
        : "live";
  return {
    groupId: input.stepKey,
    label: input.visibleLabel,
    stepKey: input.stepKey,
    visibleLabel: input.visibleLabel,
    eventName: input.eventName,
    count: input.count ?? 0,
    countUnit: "events",
    state: stepState,
    explanation: `${input.visibleLabel} is supporting activity volume, not a sequential funnel step.`,
    rawEventCount: input.count,
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
  const cacheRefreshDue = Boolean(
    input.response &&
      (input.response.cacheState === "refresh_due" ||
        input.response.staleButVerified ||
        input.response.cacheRevalidating),
  );
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
  const hasUsableEventSample = hasResponse && MAIN_STEPS.some((step) => rawCounts.get(step.stepKey) !== null);
  const canRenderStepDetails = hasUsableEventSample;
  const exactUserFunnelAvailable = false;
  const measurementMode: AdminAnalyticsJourneyFunnelModel["measurementMode"] = hasUsableEventSample
    ? "event_volume_only"
    : "unavailable";
  const hydrationState: EventChainHydrationState = input.error
    ? "error"
    : !hasResponse && input.loading
      ? "waiting"
      : !hasResponse
        ? "no_sample"
        : hasUsableEventSample
          ? "ready"
          : "no_sample";
  const unavailableReason = hasUsableEventSample
    ? null
    : "No first-party event-count snapshot is available for this range.";
  const nextSourceStep = hasUsableEventSample
    ? null
    : "Generate bounded sample activity in the selected range, refresh analytics snapshots, or inspect Debug source evidence before treating this lane as measured.";
  const algorithmRecommendation = "Build an ordered actor/session funnel by grouping events by canonical actor/session, sorting by event timestamp, keeping the first occurrence of each step per actor/session/window, then computing step_i_reached / step_(i-1)_reached. Aggregate event counts alone remain event-volume ratios, not conversion.";
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
    ? "partial_event_chain"
    : nonSequentialSteps.length > 0 || sourceMismatchSteps.length > 0
      ? "partial_event_chain"
      : "event_volume_chain";
  const denominatorMode: DenominatorMode = "prior_step_events";
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
      priorStepLabel: prior?.visibleLabel ?? null,
      priorValue: prior ? rawCounts.get(prior.stepKey) ?? null : null,
      source: stepSource,
      truthState,
      flags,
      fakeZeroPrevented,
    });
  });
  const supportingMetrics = SUPPORTING_STEPS.map((step) =>
    buildSupportingMetric({
      ...step,
      count: hasResponse ? rawCounts.get(step.stepKey) ?? null : null,
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
    "This lane is repeated event volume, not a unique-user or session funnel.",
    ...nonSequentialSteps.map((step) => `${step} exceeds its prior step.`),
    ...sourceMismatchSteps.map((step) => `${step} uses purchase evidence that exceeds checkout starts.`),
    onboardingMismatch ? "Onboarding completion counts differ from auth signup counts." : null,
  ].filter((reason): reason is string => Boolean(reason));
  const warnings = [
    "This is event volume, not a sequential conversion funnel.",
    ...nonSequentialSteps.map((step) => `${step} exceeds its prior-step event count because actions are not sequentially deduped.`),
    ...sourceMismatchSteps.map((step) => `${step} exceeds its prior-step event count because the source differs or checkout telemetry is incomplete.`),
  ];
  const visibleHelperCopy = hasUsableEventSample
    ? "This is event volume, not a sequential conversion funnel. Counts can exceed earlier steps when users repeat actions."
    : input.loading
      ? "Collecting activity."
      : "No event sample yet.";
  const generatedAtUtc = input.response?.generatedAtMs
    ? new Date(input.response.generatedAtMs).toISOString()
    : new Date().toISOString();
  const largestEventVolumeDecreaseLabel = biggestDropoff
    ? `${steps.find((step) => step.stepKey === biggestDropoff.step)?.visibleLabel ?? biggestDropoff.step} vs ${steps.find((step) => step.stepKey === biggestDropoff.step)?.denominatorLabel.replace(/^vs /, "") ?? "prior step"}`
    : null;

  return {
    generatedAtUtc,
    mode: funnelMode,
    sequential: false,
    uniqueActorsAvailable: false,
    warningCount: warnings.length,
    warnings,
    selectedRange: input.selectedRange,
    funnelMode,
    denominatorMode,
    modeLabel: input.error
      ? "Failed"
      : !hasResponse
        ? input.loading ? "Collecting" : "No sample"
        : !hasUsableEventSample
          ? "No sample"
          : flags.stale || cacheRefreshDue
            ? "Refresh due"
            : sourceMismatchSteps.length > 0 || nonSequentialSteps.length > 0
              ? "Partial"
              : "Updated",
    hydrationState,
    hasUsableEventSample,
    canRenderStepDetails,
    exactUserFunnelAvailable,
    measurementMode,
    unavailableReason,
    nextSourceStep,
    algorithmRecommendation,
    visibleTitle: "Event Chain",
    visibleHelperCopy,
    steps,
    supportingEvents: supportingMetrics,
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
    biggestDropoffStep: biggestDropoff ? (steps.find((step) => step.stepKey === biggestDropoff.step)?.visibleLabel ?? biggestDropoff.step) : null,
    biggestDropoffPercent: biggestDropoff ? biggestDropoff.dropoff : null,
    recommendation: !hasUsableEventSample
      ? "No event sample yet. Generate bounded sample activity, refresh snapshots, or inspect Debug source evidence before treating this lane as measured."
      : sourceMismatchSteps.length > 0
      ? "True user funnel unavailable until unique actor/session chain is computed. Current ratios are event-volume only."
      : largestEventVolumeDecreaseLabel
        ? `Largest event-volume decrease: ${largestEventVolumeDecreaseLabel}. Not a conversion rate.`
        : "True user funnel unavailable until unique actor/session chain is computed. Current ratios are event-volume only.",
    degradedReasons,
    visibleDegradedCopy: degradedReasons.length > 0
      ? "Some steps need review because later event counts can exceed earlier steps in a repeated-activity chain."
      : "",
    duplicateRefreshPrevented: Boolean(input.response?.cacheRevalidating && input.loading),
    hydrationMs: hasResponse ? 0 : null,
    badgeOverflowProtectionEnabled: true,
    ...flags,
  };
}
