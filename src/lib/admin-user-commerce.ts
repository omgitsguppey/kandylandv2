export type AdminCommerceTruthLabel = "live" | "partial" | "stale" | "unknown";

export type UserCommerceMetrics = {
  grossRevenueUsd: number;
  grossRevenueCents: number;
  paypalFeeUsd: number;
  paypalFeeCents: number;
  netRevenueUsd: number;
  netRevenueCents: number;
  adjustedProfitUsd: number;
  adjustedProfitCents: number;
  retailValueUsd: number;
  bonusValueUsd: number;
  bonusValueCents: number;
  bonusGumDrops: number;
  deliveredGumDrops: number;
  paidGumDrops: number;
  averageOrderUsd: number;
  effectiveUsdPer100Gd: number;
  unlockSpendGdTotal: number;
  lastPurchaseAt: number;
  commerceTruthLabel: AdminCommerceTruthLabel;
  commerceSourceLabel: string;
  commerceEmptyReason: string | null;
};

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function readMetric(raw: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return 0;
}

function toTimestampNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (
    value
    && typeof value === "object"
    && "toMillis" in value
    && typeof (value as { toMillis: () => number }).toMillis === "function"
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }

  return 0;
}

export function buildEmptyCommerceMetrics(
  input: Partial<Pick<UserCommerceMetrics, "commerceSourceLabel" | "commerceTruthLabel" | "commerceEmptyReason">> = {},
): UserCommerceMetrics {
  return {
    grossRevenueUsd: 0,
    grossRevenueCents: 0,
    paypalFeeUsd: 0,
    paypalFeeCents: 0,
    netRevenueUsd: 0,
    netRevenueCents: 0,
    adjustedProfitUsd: 0,
    adjustedProfitCents: 0,
    retailValueUsd: 0,
    bonusValueUsd: 0,
    bonusValueCents: 0,
    bonusGumDrops: 0,
    deliveredGumDrops: 0,
    paidGumDrops: 0,
    averageOrderUsd: 0,
    effectiveUsdPer100Gd: 0,
    unlockSpendGdTotal: 0,
    lastPurchaseAt: 0,
    commerceTruthLabel: input.commerceTruthLabel ?? "unknown",
    commerceSourceLabel: input.commerceSourceLabel ?? "none",
    commerceEmptyReason: input.commerceEmptyReason ?? "No completed GumDrops purchases found.",
  };
}

export function buildCommerceMetricsFromRollup(
  raw: Record<string, unknown>,
  input: Partial<Pick<UserCommerceMetrics, "commerceSourceLabel" | "commerceTruthLabel" | "commerceEmptyReason">> = {},
): UserCommerceMetrics {
  const grossRevenueUsd = roundCurrency(readMetric(raw, "grossRevenueUsdTotal", "grossRevenueUsd"));
  const grossRevenueCents = Math.round(readMetric(raw, "revenueCentsTotal", "grossRevenueCents") || grossRevenueUsd * 100);
  const paypalFeeUsd = roundCurrency(readMetric(raw, "paypalFeeUsdTotal", "paypalFeeUsd"));
  const paypalFeeCents = Math.round(readMetric(raw, "paypalFeeCentsTotal", "paypalFeeCents") || paypalFeeUsd * 100);
  const explicitNetRevenueUsd = roundCurrency(readMetric(raw, "netRevenueUsdTotal", "netRevenueUsd"));
  const netRevenueUsd = explicitNetRevenueUsd > 0
    ? explicitNetRevenueUsd
    : roundCurrency(Math.max(0, grossRevenueUsd - paypalFeeUsd));
  const netRevenueCents = Math.round(readMetric(raw, "netRevenueCentsTotal", "netRevenueCents") || netRevenueUsd * 100);
  const retailValueUsd = roundCurrency(readMetric(raw, "retailValueUsdTotal", "retailValueUsd"));
  const deliveredGumDrops = Math.round(readMetric(raw, "deliveredGumDropsTotal", "deliveredGumDrops"));
  const paidGumDrops = Math.round(readMetric(raw, "paidGumDropsTotal", "paidGumDrops"));
  const bonusGumDrops = Math.round(readMetric(raw, "bonusGumDropsTotal", "bonusGumDrops"));
  const unlockSpendGdTotal = Math.round(readMetric(raw, "spendGdTotal", "unlockSpendGdTotal"));
  const purchaseCount = Math.max(0, Math.round(readMetric(raw, "purchaseTransactionCount", "purchaseCount")));
  const exactUsdPer100Gd = deliveredGumDrops > 0 ? grossRevenueUsd / (deliveredGumDrops / 100) : 0;
  const effectiveUsdPer100Gd = roundCurrency(exactUsdPer100Gd);
  const bonusValueUsd = roundCurrency(bonusGumDrops * (exactUsdPer100Gd / 100));
  const bonusValueCents = Math.round(bonusValueUsd * 100);
  const adjustedProfitUsd = roundCurrency(Math.max(0, netRevenueUsd - bonusValueUsd));
  const adjustedProfitCents = Math.round(adjustedProfitUsd * 100);
  const hasPurchaseSignal = purchaseCount > 0
    || grossRevenueUsd > 0
    || deliveredGumDrops > 0
    || bonusGumDrops > 0;

  return {
    grossRevenueUsd,
    grossRevenueCents,
    paypalFeeUsd,
    paypalFeeCents,
    netRevenueUsd,
    netRevenueCents,
    adjustedProfitUsd,
    adjustedProfitCents,
    retailValueUsd,
    bonusValueUsd,
    bonusValueCents,
    bonusGumDrops,
    deliveredGumDrops,
    paidGumDrops,
    averageOrderUsd: purchaseCount > 0 ? roundCurrency(grossRevenueUsd / purchaseCount) : 0,
    effectiveUsdPer100Gd,
    unlockSpendGdTotal,
    lastPurchaseAt: toTimestampNumber(raw.lastPurchaseAt),
    commerceTruthLabel: input.commerceTruthLabel ?? (hasPurchaseSignal ? "stale" : "unknown"),
    commerceSourceLabel: input.commerceSourceLabel ?? "analytics_rollup_recomputed_display",
    commerceEmptyReason: hasPurchaseSignal ? null : input.commerceEmptyReason ?? "No completed GumDrops purchases found.",
  };
}
