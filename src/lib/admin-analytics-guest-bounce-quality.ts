import type { AdminSurfaceState } from "@/lib/admin-parity";
import type { HistoricalAnalyticsResponse, RangeOption, SemanticCategorySummaryItem } from "@/types/admin-analytics";

type GuestTraffic = NonNullable<HistoricalAnalyticsResponse["guestTraffic"]>;

type MetricSource = "ga_estimate" | "first_party_semantic_batches" | "signed_in_semantic_batches" | "unavailable";

export type AdminAnalyticsGuestQualityMetric = {
  value: number | null;
  source: MetricSource;
  numerator: number | null;
  denominator: number | null;
  formula: string | null;
  unavailableReason: string | null;
  fakeZeroPrevented: boolean;
};

export type AdminAnalyticsGuestBounceQualityModel = {
  selectedRange: RangeOption;
  moduleTruthState: "estimated" | "partial" | "live" | "stale" | "waiting" | "error";
  truthState: AdminSurfaceState;
  badgeLabel: "LIVE" | "EST" | "STALE" | "WAIT" | "PARTIAL" | "ERROR" | "NO SAMPLE";
  guestViews: {
    value: number | null;
    source: MetricSource;
    formula: string | null;
  };
  guestViewsEstimated: boolean;
  guestEstimateFormula: string | null;
  guestEstimateClamped: boolean;
  guestBounce: AdminAnalyticsGuestQualityMetric;
  guestEngaged: AdminAnalyticsGuestQualityMetric;
  signedInBounce: AdminAnalyticsGuestQualityMetric;
  semanticBatchStatus: "available" | "missing" | "partial";
  consentedGuestBatchStatus: "available" | "missing";
  anonymousFirstPartyBatchStatus: "available" | "missing";
  identifiedFirstPartyTrafficStatus: "available" | "missing";
  gaTotalsStatus: "available" | "missing" | "not_used";
  gaDailyStatus: "unknown";
  gaIntradayStatus: "unknown";
  backendCacheStatus: "fresh" | "stale" | "miss" | "unknown";
  stale: boolean;
  cache: boolean;
  serverConfirmed: boolean;
  fallback: boolean;
  fromCache: boolean | null;
  hasPendingWrites: boolean | null;
  chartSeriesStatus: "available" | "collapsed_empty" | "collapsed_unavailable";
  chartCollapsedBecauseEmpty: boolean;
  duplicateRefreshPrevented: boolean;
  visibleCopy: string;
  actionCopy: string;
  fullTechnicalReason: string;
};

function findSemantic(
  semanticCategories: SemanticCategorySummaryItem[],
  key: string,
) {
  return semanticCategories.find((item) => item.key === key);
}

function rateMetric(input: {
  source: MetricSource;
  numerator: number | null;
  denominator: number | null;
  formula: string;
  unavailableReason: string;
}): AdminAnalyticsGuestQualityMetric {
  if (input.denominator === null || input.denominator <= 0) {
    return {
      value: null,
      source: "unavailable",
      numerator: input.numerator,
      denominator: input.denominator,
      formula: input.formula,
      unavailableReason: input.unavailableReason,
      fakeZeroPrevented: true,
    };
  }

  return {
    value: (input.numerator ?? 0) / input.denominator,
    source: input.source,
    numerator: input.numerator ?? 0,
    denominator: input.denominator,
    formula: input.formula,
    unavailableReason: null,
    fakeZeroPrevented: false,
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
  const globalSemantic = findSemantic(input.semanticCategories, "global");
  const userSemantic = findSemantic(input.semanticCategories, "user");
  const hasResponse = Boolean(input.response);
  const stale = Boolean(input.response && (input.error || input.response.cacheState === "stale"));
  const cache = Boolean(input.response?.cacheState && input.response.cacheState !== "miss");
  const truthState: AdminSurfaceState = !hasResponse
    ? input.loading ? "loading" : "unavailable"
    : stale
      ? "stale"
      : input.overviewTruthState ?? "live";
  const guestEstimateRaw = (input.guestTraffic?.totalViews ?? 0) - (input.guestTraffic?.identifiedViews ?? 0);
  const guestEstimateClamped = input.guestTraffic?.truthLabel === "estimated" && guestEstimateRaw < 0;
  const guestViewsEstimated = input.guestTraffic?.truthLabel === "estimated";
  const guestViewsValue = !hasResponse
    ? null
    : guestViewsEstimated
      ? Math.max(0, input.guestTraffic?.estimatedGuestViews ?? guestEstimateRaw)
      : input.guestTraffic?.exactGuestViews ?? globalSemantic?.viewCount ?? null;
  const guestQualityUnavailable =
    !input.guestTraffic?.qualityAvailable || input.guestTraffic.truthLabel === "estimated";
  const guestBounce = guestQualityUnavailable
    ? rateMetric({
      source: "unavailable",
      numerator: globalSemantic?.bounceCount ?? null,
      denominator: null,
      formula: "guest bounced visits / guest visits",
      unavailableReason: "Guest quality unavailable until consented guest quality batches arrive.",
    })
    : rateMetric({
      source: "first_party_semantic_batches",
      numerator: globalSemantic?.bounceCount ?? null,
      denominator: globalSemantic?.viewCount ?? null,
      formula: "guest bounced visits / guest visits",
      unavailableReason: "Guest bounce has no valid guest visit sample.",
    });
  const guestEngaged = guestQualityUnavailable
    ? rateMetric({
      source: "unavailable",
      numerator: globalSemantic?.engagedViewCount ?? null,
      denominator: null,
      formula: "guest engaged visits / guest visits",
      unavailableReason: "Guest engagement unavailable until consented guest quality batches arrive.",
    })
    : rateMetric({
      source: "first_party_semantic_batches",
      numerator: globalSemantic?.engagedViewCount ?? null,
      denominator: globalSemantic?.viewCount ?? null,
      formula: "guest engaged visits / guest visits",
      unavailableReason: "Guest engagement has no valid guest visit sample.",
    });
  const signedInBounce = rateMetric({
    source: "signed_in_semantic_batches",
    numerator: userSemantic?.bounceCount ?? null,
    denominator: userSemantic?.viewCount ?? null,
    formula: "signed-in bounced visits / signed-in visits",
    unavailableReason: "Signed-in bounce has no valid visit sample.",
  });
  const meaningfulChart =
    !guestQualityUnavailable &&
    input.semanticCategories.some((item) => item.viewCount > 0 || item.engagedViewCount > 0 || item.bounceCount > 0);
  const partial = guestViewsEstimated || guestQualityUnavailable || signedInBounce.value === null;
  const badgeLabel =
    truthState === "loading"
      ? "WAIT"
      : truthState === "failed" || truthState === "unavailable"
        ? "ERROR"
        : stale
          ? "STALE"
          : signedInBounce.value === null && guestBounce.value === null
            ? "NO SAMPLE"
            : guestViewsEstimated
              ? "EST"
              : partial
                ? "PARTIAL"
                : "LIVE";

  return {
    selectedRange: input.selectedRange,
    moduleTruthState: truthState === "loading"
      ? "waiting"
      : truthState === "failed" || truthState === "unavailable"
        ? "error"
        : stale
          ? "stale"
          : guestViewsEstimated
            ? "estimated"
            : partial
              ? "partial"
              : "live",
    truthState,
    badgeLabel,
    guestViews: {
      value: guestViewsValue,
      source: guestViewsEstimated ? "ga_estimate" : "first_party_semantic_batches",
      formula: guestViewsEstimated ? "GA total views - identified first-party views" : "first-party guest/public views",
    },
    guestViewsEstimated,
    guestEstimateFormula: guestViewsEstimated ? "GA total views - identified first-party views" : null,
    guestEstimateClamped,
    guestBounce,
    guestEngaged,
    signedInBounce,
    semanticBatchStatus: input.semanticCategories.length > 0 ? guestQualityUnavailable ? "partial" : "available" : "missing",
    consentedGuestBatchStatus: guestQualityUnavailable ? "missing" : "available",
    anonymousFirstPartyBatchStatus: input.guestTraffic?.qualityAvailable ? "available" : "missing",
    identifiedFirstPartyTrafficStatus: userSemantic && userSemantic.viewCount > 0 ? "available" : "missing",
    gaTotalsStatus: guestViewsEstimated ? "available" : "not_used",
    gaDailyStatus: "unknown",
    gaIntradayStatus: "unknown",
    backendCacheStatus: input.response?.cacheState ?? "unknown",
    stale,
    cache,
    serverConfirmed: hasResponse && !input.error,
    fallback: Boolean(input.error || input.response?.cacheRevalidating || guestViewsEstimated),
    fromCache: input.response?.cacheState ? input.response.cacheState !== "miss" : null,
    hasPendingWrites: null,
    chartSeriesStatus: meaningfulChart ? "available" : guestQualityUnavailable ? "collapsed_unavailable" : "collapsed_empty",
    chartCollapsedBecauseEmpty: !meaningfulChart,
    duplicateRefreshPrevented: Boolean(input.response?.cacheRevalidating && input.loading),
    visibleCopy: guestQualityUnavailable
      ? "Guest views are estimated. Guest quality is unavailable until consented guest batches arrive."
      : guestViewsEstimated
        ? "Showing estimated guest views with source-labeled quality."
        : "Showing source-labeled guest and signed-in quality.",
    actionCopy: guestQualityUnavailable
      ? "Guest bounce unavailable: consented guest quality batches did not arrive."
      : signedInBounce.value === null
        ? "Signed-in bounce unavailable: no valid visit sample."
        : "Guest quality has a measurable sample.",
    fullTechnicalReason: guestQualityUnavailable
      ? "Guest bounce and engagement require consented guest semantic/quality batches; only estimated guest views are available for this range."
      : "Guest and signed-in quality use first-party semantic category summaries for the selected range.",
  };
}
