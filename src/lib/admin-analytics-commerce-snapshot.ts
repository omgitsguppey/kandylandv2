import type { AdminSurfaceState } from "@/lib/admin-parity";
import {
  PLATFORM_ECONOMY_BASE_USD_PER_100_GD,
  PLATFORM_ECONOMY_WARNING_FLOOR_USD_PER_100_GD,
} from "@/lib/platform-economy";
import { safeRate } from "@/lib/deterministic-admin-truth";
import type {
  CommerceMetricCard,
  CommerceSnapshotState,
  HistoricalAnalyticsResponse,
  RangeOption,
} from "@/types/admin-analytics";

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
  generatedAtUtc: string | null;
  selectedRangeLabel: string;
  cacheState: CommerceSnapshotState["cacheState"];
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
  checkoutConversionWarning: string | null;
  walletOpensValue: number | null;
  walletOpensSource: CommerceSource;
  gdSpentValue: number | null;
  gdSpentSource: CommerceSource;
  paidGdSpentValue: number | null;
  bonusGdSpentValue: number | null;
  rewardFreeGdSpentValue: number | null;
  unknownSourceGdSpentValue: number | null;
  promoGdSpentValue: number | null;
  promoValueGranted: number | null;
  promoDiscountUsdValue: number | null;
  bonusGdGranted: number | null;
  paymentFeesUsdValue: number | null;
  deliveredGumDropsValue: number | null;
  paidSourceDeliveredGdValue: number | null;
  paidBaseDeliveredGdValue: number | null;
  paidBonusDeliveredGdValue: number | null;
  rewardDeliveredGdValue: number | null;
  yieldPer100GdValue: number | null;
  yieldPer100GdFormula: string;
  commerceSnapshotState: CommerceSnapshotState;
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

  if (input.error) {
    return "stale";
  }

  if (input.response.cacheState === "refresh_due" || input.response.staleButVerified) {
    return "cached";
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

function scopeFromRange(range: RangeOption): CommerceMetricCard["scope"] {
  if (range === "all") return "lifetime";
  if (range === "30d") return "rolling_30d";
  return "selected_range";
}

function formatRangeLabel(range: RangeOption) {
  switch (range) {
    case "24h":
      return "1D";
    case "7d":
      return "7D";
    case "30d":
      return "30D";
    case "all":
      return "Lifetime";
    default:
      return "Selected range";
  }
}

function formatScopeLabel(scope: CommerceMetricCard["scope"]) {
  switch (scope) {
    case "lifetime":
      return "Lifetime";
    case "rolling_30d":
      return "30D";
    case "selected_range":
      return "Selected range";
    case "cache_snapshot":
      return "Snapshot";
    default:
      return "Unknown";
  }
}

function scopeMatches(
  left: CommerceMetricCard["scope"],
  right: CommerceMetricCard["scope"],
) {
  return left === right && left !== "unknown";
}

function freshnessFromResponse(response?: HistoricalAnalyticsResponse): CommerceMetricCard["freshnessState"] {
  if (!response) return "unknown";
  if (response.cacheState === "stale") return "stale";
  if (response.cacheState === "refresh_due" || response.staleButVerified) return "delayed";
  if (response.cacheRevalidating) return "delayed";
  if (response.cacheState === "fresh") return "delayed";
  return "live";
}

function snapshotCacheState(response?: HistoricalAnalyticsResponse, error?: Error): CommerceSnapshotState["cacheState"] {
  if (!response) return "unknown";
  if (error) return "stale";
  if (response.cacheState === "stale") return "stale";
  if (response.cacheState === "refresh_due" || response.staleButVerified) return "delayed";
  if (response.cacheRevalidating || response.cacheState === "fresh") return "delayed";
  return "live";
}

function buildCardLabel(base: string, scope: CommerceMetricCard["scope"]) {
  const scopeLabel = formatScopeLabel(scope);
  if (scope === "selected_range") {
    return `${base} (selected range)`;
  }
  return `${scopeLabel} ${base.toLowerCase()}`;
}

function cardSourceToMetricSource(sourceTruth: CommerceMetricCard["sourceTruth"]): CommerceSource {
  switch (sourceTruth) {
    case "payment_transactions":
      return "completed_purchase_records";
    case "commerce_rollup":
      return "validated_backend_cache";
    case "checkout_telemetry":
    case "wallet_telemetry":
      return "telemetry_events";
    case "unlock_ledger":
    case "gumdrop_ledger":
      return "unlock_content_internal_ledger";
    case "platform_economy":
      return "not_primary_for_revenue";
    case "mixed":
      return "validated_backend_cache";
    default:
      return "unavailable";
  }
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
  const selectedRangeScope = scopeFromRange(selectedRange);
  const cardFreshnessState = freshnessFromResponse(response);
  const generatedAtUtc =
    hasNumber(response?.generatedAtMs) && response!.generatedAtMs! > 0
      ? new Date(response!.generatedAtMs!).toISOString()
      : null;
  const rangeStartUtc = commerce?.checkoutRangeStartUtc ?? null;
  const rangeEndUtc = commerce?.checkoutRangeEndUtc ?? null;

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
  const deliveredGumDropsValue =
    hasNumber(commerce?.deliveredGumDrops) && hasResponse ? commerce.deliveredGumDrops : null;
  const bonusGdGranted =
    hasNumber(commerce?.bonusGumDrops) && hasResponse ? commerce.bonusGumDrops : null;
  const promoValueGranted =
    hasNumber(commerce?.bonusValueUsd) && hasResponse ? commerce.bonusValueUsd : null;
  const promoDiscountUsdValue =
    hasNumber(commerce?.promoDiscountUsd) && hasResponse ? commerce.promoDiscountUsd : null;
  const paymentFeesUsdValue =
    hasNumber(commerce?.paymentFeesUsd) && hasResponse ? commerce.paymentFeesUsd : null;
  const paidGdSpentValue =
    hasNumber(commerce?.paidGdSpent) && hasResponse ? commerce.paidGdSpent : null;
  const bonusGdSpentValue =
    hasNumber(commerce?.paidBonusGdSpent) && hasResponse ? commerce.paidBonusGdSpent : null;
  const rewardFreeGdSpentValue =
    hasNumber(commerce?.rewardFreeGdSpent) && hasResponse ? commerce.rewardFreeGdSpent : null;
  const unknownSourceGdSpentValue =
    hasNumber(commerce?.unknownSourceGdSpent) && hasResponse ? commerce.unknownSourceGdSpent : null;
  const paidSourceDeliveredGdValue =
    hasNumber(commerce?.paidSourceDeliveredGd) && hasResponse ? commerce.paidSourceDeliveredGd : null;
  const paidBaseDeliveredGdValue =
    hasNumber(commerce?.paidBaseDeliveredGd) && hasResponse ? commerce.paidBaseDeliveredGd : null;
  const paidBonusDeliveredGdValue =
    hasNumber(commerce?.paidBonusDeliveredGd) && hasResponse ? commerce.paidBonusDeliveredGd : null;
  const rewardDeliveredGdValue =
    hasNumber(commerce?.rewardDeliveredGd) && hasResponse ? commerce.rewardDeliveredGd : null;
  const yieldPer100GdValue =
    hasNumber(commerce?.effectiveUsdPer100Gd) && hasResponse
      ? commerce.effectiveUsdPer100Gd
      : deliveredGumDropsValue && deliveredGumDropsValue > 0 && revenueValue !== null
        ? revenueValue / (deliveredGumDropsValue / 100)
        : null;

  const revenueScope = (commerce?.checkoutScope ?? selectedRangeScope) as CommerceMetricCard["scope"];
  const purchaseScope = selectedRangeScope;
  const checkoutScope = selectedRangeScope;
  const walletScope = selectedRangeScope;
  const gdSpendScope = selectedRangeScope;
  const adjustedProfitScope = revenueScope;
  const yieldScope = revenueScope;
  const promoScope = revenueScope;

  const conversionScopeCompatible = scopeMatches(purchaseScope, checkoutScope);
  const checkoutConversionRate = safeRate({
    numerator: purchaseCompletionsValue,
    denominator: checkoutStartsValue,
    numeratorSource: conversionScopeCompatible ? "commerce_checkout_bridge" : "payment_transactions",
    denominatorSource: conversionScopeCompatible ? "commerce_checkout_bridge" : "checkout_telemetry",
    numeratorRange: purchaseScope,
    denominatorRange: checkoutScope,
    label: "Checkout conversion",
  });
  const checkoutConversionValue =
    checkoutConversionRate.valuePct !== null ? checkoutConversionRate.valuePct / 100 : null;
  const checkoutConversionWarning =
    checkoutConversionRate.state === "unavailable" && checkoutConversionRate.reason.includes("mismatched")
      ? "Checkout conversion unavailable: purchases and checkout starts use different ranges/sources."
      : checkoutConversionRate.state === "unavailable" && (checkoutStartsValue === null || purchaseCompletionsValue === null)
        ? "Checkout conversion unavailable: purchases or checkout starts are missing."
        : checkoutConversionRate.state === "unavailable" && Number(checkoutStartsValue) <= 0
          ? "Checkout conversion unavailable: checkout starts are zero."
          : null;

  const sourceBreakdownAvailable = commerce?.sourceBreakdownAvailable !== false;
  const gdSpentWarnings: string[] = [];
  if (!sourceBreakdownAvailable) {
    gdSpentWarnings.push("source_breakdown_unavailable");
  }
  if (bonusGdSpentValue === null) {
    gdSpentWarnings.push("paid_bonus_spend_unavailable");
  }
  if ((unknownSourceGdSpentValue ?? 0) > 0) {
    gdSpentWarnings.push("unknown_source_spend_present");
  }

  const treasuryWarnings: string[] = [];
  if (yieldPer100GdValue !== null && yieldPer100GdValue < PLATFORM_ECONOMY_WARNING_FLOOR_USD_PER_100_GD) {
    treasuryWarnings.push(
      `Yield / 100 GD is below the Platform Economy floor of $${PLATFORM_ECONOMY_WARNING_FLOOR_USD_PER_100_GD.toFixed(2)}.`,
    );
  } else if (yieldPer100GdValue !== null && yieldPer100GdValue < 0.75) {
    treasuryWarnings.push(
      `Yield / 100 GD is near the Platform Economy watch floor. Base target is $${PLATFORM_ECONOMY_BASE_USD_PER_100_GD.toFixed(2)} per 100 GD and warning floor is $${PLATFORM_ECONOMY_WARNING_FLOOR_USD_PER_100_GD.toFixed(2)}.`,
    );
  }

  const revenueSourceTruth: CommerceMetricCard["sourceTruth"] =
    selectedRange === "all" ? "commerce_rollup" : "payment_transactions";
  const revenueCard: CommerceMetricCard = {
    id: "revenue",
    label: buildCardLabel("Revenue", revenueScope),
    value: revenueValue ?? "Unavailable",
    scope: revenueScope,
    rangeStartUtc,
    rangeEndUtc,
    sourceTruth: revenueSourceTruth,
    freshnessState: cardFreshnessState,
    numerator: revenueValue,
    denominator: null,
    warnings: [],
    explanation:
      selectedRange === "all"
        ? "Revenue means completed real-money currency purchases from the lifetime commerce rollup."
        : "Revenue means completed real-money currency purchases in the selected range.",
  };
  const purchasesCard: CommerceMetricCard = {
    id: "completed_purchases",
    label: buildCardLabel("Purchases", purchaseScope),
    value: purchaseCompletionsValue ?? "Unavailable",
    scope: purchaseScope,
    rangeStartUtc,
    rangeEndUtc,
    sourceTruth: "payment_transactions",
    freshnessState: cardFreshnessState,
    warnings: [],
    explanation:
      selectedRange === "all"
        ? "Completed purchases reflect the lifetime completed-purchase count."
        : "Completed purchases reflect server-confirmed purchase records in the selected range.",
  };
  const checkoutCard: CommerceMetricCard = {
    id: "checkout_starts",
    label: buildCardLabel("Checkout starts", checkoutScope),
    value: checkoutStartsValue ?? "Unavailable",
    scope: checkoutScope,
    rangeStartUtc,
    rangeEndUtc,
    sourceTruth: "checkout_telemetry",
    freshnessState: cardFreshnessState,
    warnings: checkoutConversionWarning ? ["conversion_unavailable_or_partial"] : [],
    explanation:
      checkoutConversionWarning
        ? checkoutConversionWarning
        : "Checkout starts are intent telemetry for the same selected range as completed purchases.",
  };
  const gdSpentCard: CommerceMetricCard = {
    id: "gd_spent",
    label: buildCardLabel("GD spent", gdSpendScope),
    value: gdSpentValue ?? "Unavailable",
    scope: gdSpendScope,
    rangeStartUtc,
    rangeEndUtc,
    sourceTruth: "gumdrop_ledger",
    freshnessState: cardFreshnessState,
    formula: "paidGdSpent + rewardFreeGdSpent + unknownSourceGdSpent",
    warnings: gdSpentWarnings,
    explanation: sourceBreakdownAvailable
      ? "GD spent comes from the unlock ledger with paid, reward/free, and unknown-source spend separated."
      : "GD spent total is loaded, but the source-of-funds spend split is partial for this range.",
  };
  const adjustedProfitCard: CommerceMetricCard = {
    id: "adjusted_profit",
    label: buildCardLabel("Adjusted profit", adjustedProfitScope),
    value: adjustedProfitValue ?? "Unavailable",
    scope: adjustedProfitScope,
    rangeStartUtc,
    rangeEndUtc,
    sourceTruth: revenueSourceTruth,
    freshnessState: cardFreshnessState,
    formula: "grossRevenue - paymentFees - promoBonusValueBasis",
    numerator: adjustedProfitValue,
    denominator: null,
    warnings: paymentFeesUsdValue === null ? ["payment_fees_partial_or_missing"] : [],
    explanation:
      "Adjusted profit is gross revenue minus payment fees and promo/bonus value basis. It is not final accounting profit.",
  };
  const yieldCard: CommerceMetricCard = {
    id: "yield_per_100_gd",
    label: buildCardLabel("Yield / 100 GD", yieldScope),
    value: yieldPer100GdValue ?? "Unavailable",
    scope: yieldScope,
    rangeStartUtc,
    rangeEndUtc,
    sourceTruth: "platform_economy",
    freshnessState: cardFreshnessState,
    formula: "revenue / (deliveredGd / 100)",
    numerator: revenueValue,
    denominator: deliveredGumDropsValue,
    warnings: treasuryWarnings,
    explanation:
      "Delivered GD means paid-source GumDrops delivered by purchases in this range. Treasury truth lives in Platform Economy.",
  };
  const walletCard: CommerceMetricCard = {
    id: "wallet_opens",
    label: buildCardLabel("Wallet opens", walletScope),
    value: walletOpensValue ?? "Unavailable",
    scope: walletScope,
    rangeStartUtc,
    rangeEndUtc,
    sourceTruth: "wallet_telemetry",
    freshnessState: cardFreshnessState,
    warnings: [],
    explanation: "Wallet opens are wallet-intent telemetry and remain separate from checkout or purchase completion.",
  };
  const promoCard: CommerceMetricCard = {
    id: "promo_impact",
    label: buildCardLabel("Promo impact", promoScope),
    value: promoValueGranted ?? "Unavailable",
    scope: promoScope,
    rangeStartUtc,
    rangeEndUtc,
    sourceTruth: "mixed",
    freshnessState: cardFreshnessState,
    formula: "promoBonusValueBasisUsd + bonusGdIssued",
    warnings: [],
    explanation:
      "Promo impact is value basis, not revenue. Bonus GD and promo discount USD remain separate from completed-payment revenue.",
  };
  const cards = [
    revenueCard,
    purchasesCard,
    checkoutCard,
    gdSpentCard,
    adjustedProfitCard,
    yieldCard,
    walletCard,
    promoCard,
  ];
  const distinctScopes = Array.from(new Set(cards.map((card) => card.scope)));
  const rangeConsistency = {
    allSameRange: distinctScopes.length <= 1,
    mismatchedCards:
      distinctScopes.length <= 1
        ? []
        : cards
            .filter((card) => card.scope !== cards[0].scope)
            .map((card) => card.label),
    warning:
      distinctScopes.length <= 1
        ? null
        : "Commerce Snapshot mixes card ranges. Conversion stays disabled unless purchases and checkout starts share the same range.",
  };
  const commerceSnapshotState: CommerceSnapshotState = {
    generatedAtUtc: generatedAtUtc ?? new Date(0).toISOString(),
    selectedRange,
    cacheState: snapshotCacheState(response, error),
    cards,
    rangeConsistency,
    treasuryWarnings,
  };

  const selectedRangeLabel = formatRangeLabel(selectedRange);
  const visibleCopy = hasResponse
    ? [
        flags.fallback
          ? `Commerce refresh is delayed. Showing last verified data from ${generatedAtUtc ?? "an unknown timestamp"}.`
          : `Showing verified commerce data for ${selectedRangeLabel}.`,
        "Promo and bonus GD are excluded from revenue.",
      ]
    : [loading ? "Waiting for first snapshot." : "Commerce unavailable."];

  const needsAttention = [
    checkoutConversionWarning,
    rangeConsistency.warning,
    gdSpentWarnings.includes("source_breakdown_unavailable")
      ? "GD spend source split is partial for this range."
      : null,
    ...treasuryWarnings,
  ].filter((item): item is string => Boolean(item));

  const revenueMetricSource = cardSourceToMetricSource(revenueCard.sourceTruth);
  const purchaseMetricSource = cardSourceToMetricSource(purchasesCard.sourceTruth);
  const telemetryMetricSource = cardSourceToMetricSource(checkoutCard.sourceTruth);
  const gdMetricSource = cardSourceToMetricSource(gdSpentCard.sourceTruth);
  const yieldMetricSource = cardSourceToMetricSource(yieldCard.sourceTruth);
  const promoMetricSource = cardSourceToMetricSource(promoCard.sourceTruth);

  return {
    selectedRange,
    generatedAtUtc,
    selectedRangeLabel,
    cacheState: commerceSnapshotState.cacheState,
    revenueValue,
    revenueSource: revenueMetricSource,
    adjustedProfitValue,
    adjustedProfitFormula: adjustedProfitCard.formula ?? "",
    purchaseCompletionsValue,
    purchaseCompletionsSource: purchaseMetricSource,
    checkoutStartsValue,
    checkoutStartsSource: telemetryMetricSource,
    checkoutConversionValue,
    checkoutConversionFormula: conversionScopeCompatible
      ? "completedPurchases / checkoutStarts"
      : "unavailable_mismatched_range",
    checkoutConversionWarning,
    walletOpensValue,
    walletOpensSource: telemetryMetricSource,
    gdSpentValue,
    gdSpentSource: gdMetricSource,
    paidGdSpentValue,
    bonusGdSpentValue,
    rewardFreeGdSpentValue,
    unknownSourceGdSpentValue,
    promoGdSpentValue: null,
    promoValueGranted,
    promoDiscountUsdValue,
    bonusGdGranted,
    paymentFeesUsdValue,
    deliveredGumDropsValue,
    paidSourceDeliveredGdValue,
    paidBaseDeliveredGdValue,
    paidBonusDeliveredGdValue,
    rewardDeliveredGdValue,
    yieldPer100GdValue,
    yieldPer100GdFormula: yieldCard.formula ?? "",
    commerceSnapshotState,
    metrics: {
      revenue: metric({
        value: revenueValue,
        source: revenueMetricSource,
        label: revenueCard.label,
        truthState: zeroSafeTruth,
        flags,
        fakeZeroPrevented,
      }),
      purchases: metric({
        value: purchaseCompletionsValue,
        source: purchaseMetricSource,
        label: purchasesCard.label,
        truthState: zeroSafeTruth,
        flags,
        fakeZeroPrevented,
      }),
      checkoutStarts: metric({
        value: checkoutStartsValue,
        source: telemetryMetricSource,
        label: checkoutCard.label,
        truthState: zeroSafeTruth,
        flags,
        fakeZeroPrevented,
      }),
      gdSpent: metric({
        value: gdSpentValue,
        source: gdMetricSource,
        label: gdSpentCard.label,
        truthState: zeroSafeTruth,
        flags,
        fakeZeroPrevented,
      }),
      adjustedProfit: metric({
        value: adjustedProfitValue,
        source: revenueMetricSource,
        label: adjustedProfitCard.label,
        truthState: zeroSafeTruth,
        flags,
        fakeZeroPrevented,
      }),
      yieldPer100Gd: metric({
        value: yieldPer100GdValue,
        source: yieldMetricSource,
        label: yieldCard.label,
        truthState: zeroSafeTruth,
        flags,
        fakeZeroPrevented,
      }),
      walletOpens: metric({
        value: walletOpensValue,
        source: telemetryMetricSource,
        label: walletCard.label,
        truthState: zeroSafeTruth,
        flags,
        fakeZeroPrevented,
      }),
      promoImpact: metric({
        value: promoValueGranted,
        source: promoMetricSource,
        label: promoCard.label,
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
