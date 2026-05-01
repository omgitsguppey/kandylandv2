import type { AdminSurfaceState } from "@/lib/admin-parity";
import type { HistoricalAnalyticsResponse, RangeOption } from "@/types/admin-analytics";

type CommerceSource =
  | "internal_completed_currency_purchases"
  | "completed_purchase_records"
  | "telemetry_events"
  | "unlock_content_internal_ledger"
  | "validated_backend_cache"
  | "not_primary_for_revenue"
  | "waiting"
  | "unavailable";

type CommerceTruthFlags = {
  serverConfirmed: boolean;
  stale: boolean;
  cache: boolean;
  fallback: boolean;
  estimated: boolean;
};

export type AdminAnalyticsCommerceMetric = CommerceTruthFlags & {
  value: number | null;
  source: CommerceSource;
  truthState: AdminSurfaceState;
  label: string;
  fakeZeroPrevented: boolean;
  hydrationMs: number | null;
};

export type AdminAnalyticsCommerceSnapshotModel = CommerceTruthFlags & {
  selectedRange: RangeOption;
  revenueValue: number | null;
  revenueSource: CommerceSource;
  adjustedProfitValue: number | null;
  adjustedProfitFormula: string;
  purchaseCompletionsValue: number | null;
  purchaseCompletionsSource: CommerceSource;
  checkoutStartsValue: number | null;
  checkoutStartsSource: CommerceSource;
  checkoutConversionValue: number | null;
  checkoutConversionFormula: string;
  walletOpensValue: number | null;
  walletOpensSource: CommerceSource;
  gdSpentValue: number | null;
  gdSpentSource: CommerceSource;
  paidGdSpentValue: number | null;
  bonusGdSpentValue: number | null;
  promoGdSpentValue: number | null;
  promoValueGranted: number | null;
  bonusGdGranted: number | null;
  yieldPer100GdValue: number | null;
  yieldPer100GdFormula: string;
  metrics: {
    revenue: AdminAnalyticsCommerceMetric;
    purchases: AdminAnalyticsCommerceMetric;
    checkoutStarts: AdminAnalyticsCommerceMetric;
    gdSpent: AdminAnalyticsCommerceMetric;
    adjustedProfit: AdminAnalyticsCommerceMetric;
    yieldPer100Gd: AdminAnalyticsCommerceMetric;
    walletOpens: AdminAnalyticsCommerceMetric;
    promoImpact: AdminAnalyticsCommerceMetric;
  };
  visibleCopy: string[];
  needsAttention: string[];
  backendCacheStatus: HistoricalAnalyticsResponse["cacheState"] | "waiting" | "unavailable";
  lastValidatedAt: number | null;
  refreshStatus: "running" | "complete" | "failed" | "waiting";
  paypalSourceStatus: "reflected_by_completed_internal_purchase_records" | "unavailable";
  internalPurchaseSourceStatus: "server_confirmed" | "waiting" | "unavailable";
  gaCommerceSourceStatus: "not_primary_for_revenue" | "unavailable";
  driftFlags: {
    paypalInternalDrift: boolean | null;
    gaInternalCommerceDrift: boolean | null;
  };
  fakeZeroPrevented: Record<string, boolean>;
  duplicateRefreshPrevented: boolean;
  badgeOverflowProtectionEnabled: true;
  mobileDensityClass: "compact-commerce-panel";
};

function hasNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function resolveTruth(input: {
  response?: HistoricalAnalyticsResponse;
  loading: boolean;
  error?: Error;
  overviewTruthState?: AdminSurfaceState;
}): AdminSurfaceState {
  if (!input.response) {
    return input.loading ? "loading" : "unavailable";
  }

  if (input.error || input.response.cacheState === "stale") {
    return "stale";
  }

  return input.overviewTruthState ?? (input.response.cacheState === "fresh" ? "cached" : "live");
}

function metric(input: {
  value: number | null;
  source: CommerceSource;
  label: string;
  truthState: AdminSurfaceState;
  flags: CommerceTruthFlags;
  fakeZeroPrevented: boolean;
}): AdminAnalyticsCommerceMetric {
  return {
    value: input.value,
    source: input.source,
    label: input.label,
    truthState: input.truthState,
    fakeZeroPrevented: input.fakeZeroPrevented,
    hydrationMs: input.value === null ? null : 0,
    ...input.flags,
  };
}

export function buildAdminAnalyticsCommerceSnapshotModel(input: {
  selectedRange: RangeOption;
  response?: HistoricalAnalyticsResponse;
  commerce?: HistoricalAnalyticsResponse["commerce"];
  funnel?: HistoricalAnalyticsResponse["funnel"];
  loading: boolean;
  error?: Error;
  overviewTruthState?: AdminSurfaceState;
}): AdminAnalyticsCommerceSnapshotModel {
  const { selectedRange, response, commerce, funnel, loading, error, overviewTruthState } = input;
  const hasResponse = Boolean(response);
  const truthState = resolveTruth({ response, loading, error, overviewTruthState });
  const stale = Boolean(response && (error || response.cacheState === "stale"));
  const cache = Boolean(response?.cacheState && response.cacheState !== "miss");
  const flags: CommerceTruthFlags = {
    serverConfirmed: hasResponse && !error,
    stale,
    cache,
    fallback: stale || Boolean(response?.cacheRevalidating),
    estimated: false,
  };
  const unavailableTruthState: AdminSurfaceState = loading ? "loading" : "unavailable";
  const unavailableSource: CommerceSource = loading ? "waiting" : "unavailable";
  const zeroSafeTruth = hasResponse ? truthState : unavailableTruthState;
  const fakeZeroPrevented = !hasResponse;

  const revenueValue = hasNumber(commerce?.revenueUsd) && hasResponse ? commerce.revenueUsd : null;
  const adjustedProfitValue =
    hasNumber(commerce?.adjustedProfitUsd) && hasResponse ? commerce.adjustedProfitUsd : null;
  const gdSpentValue = hasNumber(commerce?.gdSpent) && hasResponse ? commerce.gdSpent : null;
  const purchaseCompletionsValue =
    hasNumber(funnel?.purchases) && hasResponse ? funnel.purchases : null;
  const checkoutStartsValue =
    hasNumber(funnel?.checkoutStarts) && hasResponse ? funnel.checkoutStarts : null;
  const walletOpensValue =
    hasNumber(funnel?.walletOpens) && hasResponse ? funnel.walletOpens : null;
  const deliveredGumDrops =
    hasNumber(commerce?.deliveredGumDrops) && hasResponse ? commerce.deliveredGumDrops : null;
  const bonusGdGranted =
    hasNumber(commerce?.bonusGumDrops) && hasResponse ? commerce.bonusGumDrops : null;
  const promoValueGranted =
    hasNumber(commerce?.bonusValueUsd) && hasResponse ? commerce.bonusValueUsd : null;
  const yieldPer100GdValue =
    hasNumber(commerce?.effectiveUsdPer100Gd) && hasResponse
      ? commerce.effectiveUsdPer100Gd
      : deliveredGumDrops && deliveredGumDrops > 0 && revenueValue !== null
        ? revenueValue / (deliveredGumDrops / 100)
        : null;
  const checkoutConversionValue =
    checkoutStartsValue !== null && checkoutStartsValue > 0 && purchaseCompletionsValue !== null
      ? purchaseCompletionsValue / checkoutStartsValue
      : null;

  const visibleCopy = hasResponse
    ? stale || response?.cacheRevalidating
      ? ["Commerce refresh is delayed. Showing last validated snapshot.", "Promo and bonus GD are excluded from revenue."]
      : ["Showing validated commerce data for the selected range.", "Promo and bonus GD are excluded from revenue."]
    : [loading ? "Waiting for first snapshot." : "Commerce unavailable."];

  const needsAttention = [
    checkoutStartsValue !== null && purchaseCompletionsValue !== null && checkoutStartsValue > 0
      ? null
      : "Checkout conversion unavailable",
    flags.fallback ? "Commerce data is using a validated snapshot" : null,
    revenueValue === null ? "Revenue source unavailable" : null,
  ].filter((item): item is string => Boolean(item));

  const metricSource: CommerceSource = hasResponse
    ? cache
      ? "validated_backend_cache"
      : "internal_completed_currency_purchases"
    : unavailableSource;
  const purchaseSource: CommerceSource = hasResponse ? "completed_purchase_records" : unavailableSource;
  const telemetrySource: CommerceSource = hasResponse ? "telemetry_events" : unavailableSource;
  const gdSource: CommerceSource = hasResponse ? "unlock_content_internal_ledger" : unavailableSource;

  return {
    selectedRange,
    revenueValue,
    revenueSource: metricSource,
    adjustedProfitValue,
    adjustedProfitFormula: "completed purchase gross revenue - payment fees - package-rate promo/bonus value",
    purchaseCompletionsValue,
    purchaseCompletionsSource: purchaseSource,
    checkoutStartsValue,
    checkoutStartsSource: telemetrySource,
    checkoutConversionValue,
    checkoutConversionFormula: "purchaseCompletions / checkoutStarts",
    walletOpensValue,
    walletOpensSource: telemetrySource,
    gdSpentValue,
    gdSpentSource: gdSource,
    paidGdSpentValue: null,
    bonusGdSpentValue: bonusGdGranted,
    promoGdSpentValue: null,
    promoValueGranted,
    bonusGdGranted,
    yieldPer100GdValue,
    yieldPer100GdFormula: "revenue / (deliveredGumDrops / 100)",
    metrics: {
      revenue: metric({
        value: revenueValue,
        source: metricSource,
        label: "Revenue",
        truthState: zeroSafeTruth,
        flags,
        fakeZeroPrevented,
      }),
      purchases: metric({
        value: purchaseCompletionsValue,
        source: purchaseSource,
        label: "Purchases",
        truthState: zeroSafeTruth,
        flags,
        fakeZeroPrevented,
      }),
      checkoutStarts: metric({
        value: checkoutStartsValue,
        source: telemetrySource,
        label: "Checkout starts",
        truthState: zeroSafeTruth,
        flags,
        fakeZeroPrevented,
      }),
      gdSpent: metric({
        value: gdSpentValue,
        source: gdSource,
        label: "GD spent",
        truthState: zeroSafeTruth,
        flags,
        fakeZeroPrevented,
      }),
      adjustedProfit: metric({
        value: adjustedProfitValue,
        source: metricSource,
        label: "Adjusted profit",
        truthState: zeroSafeTruth,
        flags,
        fakeZeroPrevented,
      }),
      yieldPer100Gd: metric({
        value: yieldPer100GdValue,
        source: metricSource,
        label: "Yield / 100 GD",
        truthState: zeroSafeTruth,
        flags,
        fakeZeroPrevented,
      }),
      walletOpens: metric({
        value: walletOpensValue,
        source: telemetrySource,
        label: "Wallet opens",
        truthState: zeroSafeTruth,
        flags,
        fakeZeroPrevented,
      }),
      promoImpact: metric({
        value: promoValueGranted,
        source: metricSource,
        label: "Promo impact",
        truthState: zeroSafeTruth,
        flags,
        fakeZeroPrevented,
      }),
    },
    visibleCopy,
    needsAttention,
    backendCacheStatus: response?.cacheState ?? (loading ? "waiting" : "unavailable"),
    lastValidatedAt: response?.generatedAtMs ?? null,
    refreshStatus: loading ? "running" : error ? "failed" : response ? "complete" : "waiting",
    paypalSourceStatus: hasResponse
      ? "reflected_by_completed_internal_purchase_records"
      : "unavailable",
    internalPurchaseSourceStatus: hasResponse ? "server_confirmed" : loading ? "waiting" : "unavailable",
    gaCommerceSourceStatus: hasResponse ? "not_primary_for_revenue" : "unavailable",
    stale,
    cache,
    serverConfirmed: flags.serverConfirmed,
    fallback: flags.fallback,
    estimated: false,
    driftFlags: {
      paypalInternalDrift: null,
      gaInternalCommerceDrift: null,
    },
    fakeZeroPrevented: Object.fromEntries(
      [
        "revenue",
        "purchases",
        "checkoutStarts",
        "gdSpent",
        "adjustedProfit",
        "yieldPer100Gd",
        "walletOpens",
        "promoImpact",
      ].map((key) => [key, fakeZeroPrevented]),
    ),
    duplicateRefreshPrevented: Boolean(response?.cacheRevalidating && loading),
    badgeOverflowProtectionEnabled: true,
    mobileDensityClass: "compact-commerce-panel",
  };
}
