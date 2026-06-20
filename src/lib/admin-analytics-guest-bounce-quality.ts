import type { AdminSurfaceState } from "@/lib/admin-parity";
import {
  buildGuestTrafficRecoveryMetricState,
  type RecoveredLaunchMetricState,
} from "@/lib/analytics/recovery-timeline-spine";
import type { HistoricalAnalyticsResponse, RangeOption, SemanticCategorySummaryItem } from "@/types/admin-analytics";

type GuestTraffic = NonNullable<HistoricalAnalyticsResponse["guestTraffic"]>;
type GuestQualityDiagnostics = NonNullable<HistoricalAnalyticsResponse["guestQualityDiagnostics"]>;

export type AdminAnalyticsGuestQualityRate = {
  value: number | null;
  display: string;
  sampleCount: number | null;
  freshnessState: "live" | "refresh_due" | "stale" | "unknown";
  explanation: string;
  fakeZeroPrevented: boolean;
  unavailableReason: string | null;
};

export type AdminAnalyticsGuestLegacyMetric = {
  value: number | null;
  source: "ga_estimate" | "first_party_semantic_batches" | "signed_in_semantic_batches" | "unavailable";
  numerator: number | null;
  denominator: number | null;
  formula: string | null;
  unavailableReason: string | null;
  fakeZeroPrevented: boolean;
};

export type AdminAnalyticsGuestBounceQualityModel = {
  selectedRange: RangeOption;
  moduleTruthState: "verified" | "estimated" | "no_sample" | "stale" | "waiting" | "error";
  truthState: AdminSurfaceState;
  badgeLabel: "Sample" | "Estimate" | "Refresh due" | "Expired" | "Collecting" | "Failed" | "No sample";
  generatedAtUtc: string | null;
  overallState: "verified" | "estimated" | "no_sample" | "stale" | "unavailable";
  visibleCopy: string;
  summaryFacts: string[];
  estimatedGuestViews: {
    value: number;
    display: string;
    sourceTruth: GuestQualityDiagnostics["estimatedSourceTruth"];
    canonicalSourceTruth: RecoveredLaunchMetricState["sourceTruth"];
    sourceFreshnessState: RecoveredLaunchMetricState["freshnessState"];
    evidenceKind: RecoveredLaunchMetricState["evidenceKind"];
    formula: string | null;
    formulaState: GuestQualityDiagnostics["estimatedFormulaState"];
    confidencePct: number | null;
    confidenceScore: number;
    confidenceBand: RecoveredLaunchMetricState["confidenceBand"];
    freshnessState: "live" | "refresh_due" | "stale" | "unknown";
    lastUpdatedAtUtc: string | null;
    dedupeKey: string;
    dedupeDimensions: RecoveredLaunchMetricState["dedupeDimensions"];
    lateArrivalWindowDays: RecoveredLaunchMetricState["lateArrivalWindowDays"];
    productTruthEligible: boolean;
    missingVsZeroState: RecoveredLaunchMetricState["missingVsZeroState"];
    explanation: string;
  };
  guestQuality: {
    state: GuestQualityDiagnostics["state"];
    sampleCount: number;
    consentedGuestBatchCount: number;
    lastGuestBatchAtUtc: string | null;
    missingReason: string;
    nextAction: string;
    explanation: string;
  };
  signedInBounce: AdminAnalyticsGuestQualityRate;
  series: {
    state: GuestQualityDiagnostics["seriesState"];
    explanation: string;
  };
  guestViews: {
    value: number | null;
    source: "ga_estimate" | "first_party_semantic_batches";
    formula: string | null;
  };
  guestViewsEstimated: boolean;
  guestEstimateFormula: string | null;
  guestEstimateClamped: boolean;
  guestBounce: AdminAnalyticsGuestLegacyMetric;
  guestEngaged: AdminAnalyticsGuestLegacyMetric;
  chartCollapsedBecauseEmpty: boolean;
  fullTechnicalReason: string;
};

function findSemantic(
  semanticCategories: SemanticCategorySummaryItem[],
  key: string,
) {
  return semanticCategories.find((item) => item.key === key);
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
    notation: value >= 1000 ? "compact" : "standard",
  }).format(value);
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function deriveFreshnessState(input: {
  stale: boolean;
  refreshDue: boolean;
  lastUpdatedAtUtc: string | null;
}): "live" | "refresh_due" | "stale" | "unknown" {
  if (!input.lastUpdatedAtUtc) {
    return "unknown";
  }

  if (input.refreshDue) {
    return "refresh_due";
  }

  return input.stale ? "stale" : "live";
}

function buildDefaultDiagnostics(input: {
  guestTraffic?: GuestTraffic;
}): GuestQualityDiagnostics {
  return {
    estimatedSourceTruth: input.guestTraffic?.truthLabel === "estimated" ? "ga4_evidence_only" : "unknown",
    estimatedFormula: input.guestTraffic?.truthLabel === "estimated"
      ? "max(exact guest views, GA total views - identified first-party views)"
      : null,
    estimatedFormulaState: input.guestTraffic?.truthLabel === "estimated" ? "available" : "missing",
    estimatedConfidencePct: null,
    estimatedLastUpdatedAtUtc: null,
    consentedGuestBatchCount: 0,
    guestBatchCount: 0,
    lastGuestBatchAtUtc: null,
    state: "unknown",
    missingReason: "Guest quality diagnostics are unavailable.",
    nextAction: "Inspect guest analytics ingest and consent-safe batch delivery for this range.",
    seriesState: "unavailable",
    seriesExplanation: "Guest quality trend unavailable until consented guest batches arrive.",
  };
}

export function buildAdminAnalyticsGuestBounceQualityModel(input: {
  selectedRange: RangeOption;
  response?: HistoricalAnalyticsResponse;
  guestTraffic?: GuestTraffic;
  semanticCategories: SemanticCategorySummaryItem[];
  loading: boolean;
  error?: Error;
  overviewTruthState?: AdminSurfaceState;
}): AdminAnalyticsGuestBounceQualityModel {
  const hasResponse = Boolean(input.response);
  const stale = Boolean(input.response && (input.error || input.response.cacheState === "stale"));
  const cacheRefreshDue = Boolean(
    input.response &&
      (input.response.cacheState === "refresh_due" ||
        input.response.staleButVerified ||
        input.response.cacheRevalidating),
  );
  const diagnostics = input.response?.guestQualityDiagnostics ?? buildDefaultDiagnostics({
    guestTraffic: input.guestTraffic,
  });
  const generatedAtUtc = input.response?.generatedAtMs
    ? new Date(input.response.generatedAtMs).toISOString()
    : null;
  const globalSemantic = findSemantic(input.semanticCategories, "global");
  const userSemantic = findSemantic(input.semanticCategories, "user");
  const rawGuestViewsValue = input.guestTraffic?.truthLabel === "estimated"
    ? input.guestTraffic?.estimatedGuestViews ?? 0
    : input.guestTraffic?.exactGuestViews ?? globalSemantic?.viewCount ?? 0;
  const guestEstimateClamped = rawGuestViewsValue < 0;
  const guestViewsValue = Math.max(0, rawGuestViewsValue);
  const estimatedFreshness = deriveFreshnessState({
    stale,
    refreshDue: cacheRefreshDue,
    lastUpdatedAtUtc: diagnostics.estimatedLastUpdatedAtUtc ?? generatedAtUtc,
  });
  const guestTrafficRecoveryMetric = buildGuestTrafficRecoveryMetricState({
    truthLabel: input.guestTraffic?.truthLabel ?? "unknown",
    generatedAtUtc: diagnostics.estimatedLastUpdatedAtUtc ?? generatedAtUtc,
    sourcePath: diagnostics.estimatedSourceTruth,
    fromCache: cacheRefreshDue,
    sourceObserved: hasResponse && input.guestTraffic?.truthLabel !== "unknown",
  });
  const signedInBounceValue = userSemantic?.viewCount
    ? (userSemantic.bounceCount ?? 0) / userSemantic.viewCount
    : null;
  const guestQualityAvailable = diagnostics.state === "available";
  const guestBounceValue = guestQualityAvailable && globalSemantic?.viewCount
    ? (globalSemantic.bounceCount ?? 0) / globalSemantic.viewCount
    : null;
  const guestEngagedValue = guestQualityAvailable && globalSemantic?.viewCount
    ? (globalSemantic.engagedViewCount ?? 0) / globalSemantic.viewCount
    : null;
  const signedInBounceFreshness = deriveFreshnessState({
    stale,
    refreshDue: cacheRefreshDue,
    lastUpdatedAtUtc: generatedAtUtc,
  });

  let truthState: AdminSurfaceState;
  let overallState: AdminAnalyticsGuestBounceQualityModel["overallState"];
  let moduleTruthState: AdminAnalyticsGuestBounceQualityModel["moduleTruthState"];
  let badgeLabel: AdminAnalyticsGuestBounceQualityModel["badgeLabel"];

  if (!hasResponse) {
    truthState = input.loading ? "loading" : "unavailable";
    overallState = "unavailable";
    moduleTruthState = input.loading ? "waiting" : "error";
    badgeLabel = input.loading ? "Collecting" : "Failed";
  } else if (stale) {
    truthState = "stale";
    overallState = "stale";
    moduleTruthState = "stale";
    badgeLabel = "Expired";
  } else if (diagnostics.state === "available" && input.guestTraffic?.truthLabel !== "estimated") {
    truthState = cacheRefreshDue ? "cached" : input.overviewTruthState ?? "live";
    overallState = "verified";
    moduleTruthState = "verified";
    badgeLabel = cacheRefreshDue ? "Refresh due" : "Sample";
  } else if (diagnostics.state === "available" || input.guestTraffic?.truthLabel === "estimated") {
    truthState = "degraded";
    overallState = "estimated";
    moduleTruthState = "estimated";
    badgeLabel = "Estimate";
  } else {
    truthState = "degraded";
    overallState = "no_sample";
    moduleTruthState = "no_sample";
    badgeLabel = "No sample";
  }

  const visibleCopy = diagnostics.state === "available"
    ? "Guest traffic estimate and guest-quality sample are both available for this range."
    : input.guestTraffic?.truthLabel === "estimated"
      ? "Guest views are estimated for this range. Guest quality remains unavailable until consented guest batches arrive."
      : "Guest quality has no consented sample for this range.";

  return {
    selectedRange: input.selectedRange,
    moduleTruthState,
    truthState,
    badgeLabel,
    generatedAtUtc,
    overallState,
    visibleCopy,
    summaryFacts: [
      `Guest traffic: ${input.guestTraffic?.truthLabel === "estimated" ? "estimated" : input.guestTraffic?.truthLabel === "exact" ? "tracked" : "unknown"}`,
      `Guest quality: ${diagnostics.state === "available" ? "sample available" : diagnostics.state === "no_sample" ? "no consented sample" : diagnostics.state.replaceAll("_", " ")}`,
      `Signed-in bounce: ${signedInBounceValue === null ? "sample unavailable" : signedInBounceFreshness === "stale" ? "stale sample" : signedInBounceFreshness === "refresh_due" ? "refresh due sample" : "available"}`,
    ],
    estimatedGuestViews: {
      value: guestViewsValue,
      display: formatCompactNumber(guestViewsValue),
      sourceTruth: diagnostics.estimatedSourceTruth,
      canonicalSourceTruth: guestTrafficRecoveryMetric.sourceTruth,
      sourceFreshnessState: guestTrafficRecoveryMetric.freshnessState,
      evidenceKind: guestTrafficRecoveryMetric.evidenceKind,
      formula: diagnostics.estimatedFormula,
      formulaState: diagnostics.estimatedFormulaState,
      confidencePct: diagnostics.estimatedConfidencePct,
      confidenceScore: guestTrafficRecoveryMetric.confidenceScore,
      confidenceBand: guestTrafficRecoveryMetric.confidenceBand,
      freshnessState: estimatedFreshness,
      lastUpdatedAtUtc: diagnostics.estimatedLastUpdatedAtUtc ?? generatedAtUtc,
      dedupeKey: guestTrafficRecoveryMetric.dedupeKey,
      dedupeDimensions: guestTrafficRecoveryMetric.dedupeDimensions,
      lateArrivalWindowDays: guestTrafficRecoveryMetric.lateArrivalWindowDays,
      productTruthEligible: guestTrafficRecoveryMetric.sourceTruth === "first_party_event_fact",
      missingVsZeroState: guestTrafficRecoveryMetric.missingVsZeroState,
      explanation: diagnostics.estimatedFormula
        ? `${diagnostics.estimatedFormula}. This is an estimated guest-view total, not unique guest users.`
        : "Guest estimate formula unavailable.",
    },
    guestQuality: {
      state: diagnostics.state,
      sampleCount: diagnostics.state === "available" ? globalSemantic?.viewCount ?? 0 : 0,
      consentedGuestBatchCount: diagnostics.consentedGuestBatchCount,
      lastGuestBatchAtUtc: diagnostics.lastGuestBatchAtUtc,
      missingReason: diagnostics.missingReason,
      nextAction: diagnostics.nextAction,
      explanation: diagnostics.state === "available"
        ? "Guest quality comes from consented guest batches in this range."
        : diagnostics.missingReason,
    },
    signedInBounce: {
      value: signedInBounceValue,
      display: signedInBounceValue === null ? "Unavailable" : formatPercent(signedInBounceValue),
      sampleCount: userSemantic?.viewCount ?? null,
      freshnessState: signedInBounceFreshness,
      explanation: signedInBounceValue === null
        ? "Signed-in bounce sample unavailable. Guest bounce is not inferred from this metric."
        : "Signed-in bounce sample only. Guest bounce remains unavailable without consented guest batches.",
      fakeZeroPrevented: signedInBounceValue === null,
      unavailableReason: signedInBounceValue === null ? "Signed-in bounce has no valid visit sample." : null,
    },
    series: {
      state: diagnostics.seriesState,
      explanation: diagnostics.seriesExplanation,
    },
    guestViews: {
      value: guestViewsValue,
      source: input.guestTraffic?.truthLabel === "estimated" ? "ga_estimate" : "first_party_semantic_batches",
      formula: input.guestTraffic?.truthLabel === "estimated" ? "GA total views - identified first-party views" : "first-party guest/public views",
    },
    guestViewsEstimated: input.guestTraffic?.truthLabel === "estimated",
    guestEstimateFormula: input.guestTraffic?.truthLabel === "estimated" ? "GA total views - identified first-party views" : null,
    guestEstimateClamped,
    guestBounce: {
      value: guestBounceValue,
      source: guestQualityAvailable ? "first_party_semantic_batches" : "unavailable",
      numerator: globalSemantic?.bounceCount ?? null,
      denominator: guestQualityAvailable ? globalSemantic?.viewCount ?? null : null,
      formula: "guest bounced visits / guest visits",
      unavailableReason: guestQualityAvailable ? null : "Guest quality unavailable until consented guest quality batches arrive.",
      fakeZeroPrevented: !guestQualityAvailable,
    },
    guestEngaged: {
      value: guestEngagedValue,
      source: guestQualityAvailable ? "first_party_semantic_batches" : "unavailable",
      numerator: globalSemantic?.engagedViewCount ?? null,
      denominator: guestQualityAvailable ? globalSemantic?.viewCount ?? null : null,
      formula: "guest engaged visits / guest visits",
      unavailableReason: guestQualityAvailable ? null : "Guest engagement unavailable until consented guest quality batches arrive.",
      fakeZeroPrevented: !guestQualityAvailable,
    },
    chartCollapsedBecauseEmpty: diagnostics.seriesState !== "available",
    fullTechnicalReason: diagnostics.state === "available"
      ? "Guest-quality metrics come from consent-safe guest batches; signed-in bounce remains a separate identified-user sample."
      : "Guest-quality sample is unavailable for this range. Estimated guest views can still be shown from GA totals minus identified first-party traffic when the guest batch lane is absent.",
  };
}
