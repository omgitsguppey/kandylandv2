import "server-only";

import { computeEffectiveUsdPer100Gd, PLATFORM_ECONOMY_WARNING_FLOOR_USD_PER_100_GD } from "@/lib/platform-economy";
import type { PackagePerformanceState } from "@/types/admin-analytics";
import {
  ViewerOverview,
  buildDurationBuckets,
  getTelemetryParamNumber,
  getTelemetryParamString,
  TelemetryLogRecord,
  toNumber,
} from "./admin-analytics-shared";

type PackageConfigRecord = {
  packageId: string;
  label: string;
  priceUsd: number;
  basePaidGd: number;
  bonusPaidGd: number;
  totalGd: number;
  effectiveUsdPer100Gd: number | null;
  sourceTruth: "platform_economy";
};

type NormalizedTransactionLike = {
  type?: string;
  status?: string;
  packageId?: string;
  bundleKey?: string;
  bundleLabel?: string;
  deliveredGumDrops?: number;
  paidGumDrops?: number;
  bonusGumDrops?: number;
  grossRevenueUsd?: number;
  cost?: number;
  discountUsd?: number;
};

export interface HistoricalContentAnalytics {
  packagePerformance: Array<{
    label: string;
    starts: number;
    purchases: number;
    failures: number;
    revenueUsd: number;
    drops: number;
    conversionRate: number;
    abandonmentRate: number;
  }>;
  packagePerformanceState: PackagePerformanceState;
  unlockCategoryMix: Array<{
    label: string;
    previews: number;
    unlocks: number;
    unlockRate: number;
  }>;
  watchDepthBuckets: Array<{
    label: string;
    count: number;
  }>;
  contentJourney: Array<{ label: string; count: number }>;
  contentTagDemand: Array<{ tag: string; count: number }>;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizePackageId(rawValue: string) {
  return rawValue.trim().toLowerCase();
}

function resolveCheckoutPackageId(
  record: TelemetryLogRecord,
  packageConfigs: Map<string, PackageConfigRecord>,
) {
  const explicitId = getTelemetryParamString(record, "package_id")
    || getTelemetryParamString(record, "packageId")
    || getTelemetryParamString(record, "bundle_key");
  if (explicitId) {
    return normalizePackageId(explicitId);
  }

  const packageDrops = getTelemetryParamNumber(record, "package_drops");
  const packagePrice = getTelemetryParamNumber(record, "package_price");
  for (const config of packageConfigs.values()) {
    const dropsMatch = packageDrops > 0 && config.totalGd === packageDrops;
    const priceMatch = packagePrice > 0 && Math.abs(config.priceUsd - packagePrice) < 0.001;
    if (dropsMatch || (dropsMatch && priceMatch)) {
      return config.packageId;
    }
  }

  return "";
}

function resolvePurchasePackageId(
  transaction: NormalizedTransactionLike,
  packageConfigs: Map<string, PackageConfigRecord>,
) {
  const explicitId = transaction.packageId || transaction.bundleKey;
  if (explicitId) {
    return normalizePackageId(explicitId);
  }

  const deliveredGd = Math.max(0, Math.round(toNumber(transaction.deliveredGumDrops)));
  const paidGd = Math.max(0, Math.round(toNumber(transaction.paidGumDrops)));
  const revenueUsd = toNumber(transaction.grossRevenueUsd ?? transaction.cost);

  const exactMatch = Array.from(packageConfigs.values()).find((config) => {
    const gdMatch = deliveredGd > 0 && config.totalGd === deliveredGd;
    const paidMatch = paidGd > 0 && config.basePaidGd === paidGd;
    const priceMatch = revenueUsd > 0 && Math.abs(config.priceUsd - revenueUsd) < 0.001;
    return (gdMatch && priceMatch) || (paidMatch && priceMatch);
  });
  return exactMatch?.packageId ?? "";
}

export function buildHistoricalContentAnalytics(input: {
  telemetryLogsByEvent: Record<string, TelemetryLogRecord[]>;
  eventsData: Record<string, number>;
  watchAssetDocs: FirebaseFirestore.QueryDocumentSnapshot[];
  viewerOverview: ViewerOverview;
  normalizedTransactionsInRange: NormalizedTransactionLike[];
  packageConfigs: PackageConfigRecord[];
  rangeLabel: string;
  generatedAtUtc: string;
  freshnessState: PackagePerformanceState["sourceState"];
  funnel: {
    previewOpens: number;
    unlocks: number;
    viewerOpens: number;
  };
}): HistoricalContentAnalytics {
  const packageConfigsById = new Map(
    input.packageConfigs.map((config) => [normalizePackageId(config.packageId), config]),
  );
  const packagePerformanceMap = new Map<string, {
    label: string;
    starts: number;
    purchases: number;
    failures: number;
    revenueUsd: number;
    drops: number;
  }>();

  const applyPackageEvent = (records: TelemetryLogRecord[], type: "start" | "purchase" | "failure") => {
    records.forEach((record) => {
      const packageLabel = getTelemetryParamString(record, "package_label")
        || `${getTelemetryParamNumber(record, "package_drops")} GD`;
      const current = packagePerformanceMap.get(packageLabel) || {
        label: packageLabel,
        starts: 0,
        purchases: 0,
        failures: 0,
        revenueUsd: 0,
        drops: getTelemetryParamNumber(record, "package_drops"),
      };

      if (type === "start") current.starts += 1;
      if (type === "purchase") {
        current.purchases += 1;
        current.revenueUsd += getTelemetryParamNumber(record, "package_price");
      }
      if (type === "failure") current.failures += 1;

      packagePerformanceMap.set(packageLabel, current);
    });
  };

  applyPackageEvent(input.telemetryLogsByEvent.begin_checkout || [], "start");
  applyPackageEvent(input.telemetryLogsByEvent.gumdrops_purchase_completed || [], "purchase");
  applyPackageEvent(input.telemetryLogsByEvent.gumdrops_purchase_failed || [], "failure");

  const packagePerformance = Array.from(packagePerformanceMap.values())
    .map((entry) => ({
      ...entry,
      conversionRate: entry.starts > 0 ? entry.purchases / entry.starts : 0,
      abandonmentRate: entry.starts > 0 ? Math.max(0, entry.starts - entry.purchases) / entry.starts : 0,
    }))
    .sort((left, right) => right.purchases - left.purchases || right.revenueUsd - left.revenueUsd);

  const checkoutStartsByPackage = new Map<string, number>();
  let missingCheckoutPackageCount = 0;
  for (const record of input.telemetryLogsByEvent.begin_checkout || []) {
    const packageId = resolveCheckoutPackageId(record, packageConfigsById);
    if (!packageId) {
      missingCheckoutPackageCount += 1;
      continue;
    }
    checkoutStartsByPackage.set(packageId, (checkoutStartsByPackage.get(packageId) || 0) + 1);
  }

  const transactionRowsByPackage = new Map<string, {
    completedPurchases: number;
    revenueUsd: number;
    paidGdIssued: number;
    bonusGdIssued: number;
    promoDiscountUsd: number;
  }>();
  let missingPurchasePackageCount = 0;
  for (const transaction of input.normalizedTransactionsInRange) {
    if (transaction.type !== "purchase_currency" || transaction.status !== "completed") {
      continue;
    }
    const packageId = resolvePurchasePackageId(transaction, packageConfigsById);
    if (!packageId) {
      missingPurchasePackageCount += 1;
      continue;
    }
    const current = transactionRowsByPackage.get(packageId) || {
      completedPurchases: 0,
      revenueUsd: 0,
      paidGdIssued: 0,
      bonusGdIssued: 0,
      promoDiscountUsd: 0,
    };
    current.completedPurchases += 1;
    current.revenueUsd += toNumber(transaction.grossRevenueUsd ?? transaction.cost);
    current.paidGdIssued += Math.max(0, Math.round(toNumber(transaction.paidGumDrops)));
    current.bonusGdIssued += Math.max(0, Math.round(toNumber(transaction.bonusGumDrops)));
    current.promoDiscountUsd += toNumber(transaction.discountUsd);
    transactionRowsByPackage.set(packageId, current);
  }

  const warnings: string[] = [];
  if (missingCheckoutPackageCount > 0) {
    warnings.push("Checkout starts missing packageId; conversion by package is partial.");
  }
  if (missingPurchasePackageCount > 0) {
    warnings.push("Completed purchases missing packageId metadata; some package rows use transaction truth only where mapping is safe.");
  }
  if (input.packageConfigs.length === 0) {
    warnings.push("No package config found. Package value basis should come from Platform Economy packages.");
  }

  const rows = input.packageConfigs.map((config) => {
    const checkoutStarts = checkoutStartsByPackage.get(config.packageId) || 0;
    const transactionRow = transactionRowsByPackage.get(config.packageId);
    const completedPurchases = transactionRow?.completedPurchases || 0;
    const revenueUsd = roundMoney(transactionRow?.revenueUsd || 0);
    const paidGdIssued = transactionRow?.paidGdIssued || 0;
    const bonusGdIssued = transactionRow?.bonusGdIssued || 0;
    const promoDiscountUsd = roundMoney(transactionRow?.promoDiscountUsd || 0);
    const conversionRatePct = checkoutStarts > 0
      ? (completedPurchases / checkoutStarts) * 100
      : completedPurchases > 0
        ? null
        : 0;

    let performanceState: PackagePerformanceState["rows"][number]["performanceState"] = "healthy";
    let explanation = "Package config, completed purchase transactions, and checkout telemetry all hydrated for this package.";
    if (checkoutStarts === 0 && completedPurchases === 0) {
      performanceState = "no_data";
      explanation = "Package config exists, but no package-specific checkout or purchase activity was observed in this range.";
    } else if (checkoutStarts === 0 && completedPurchases > 0) {
      performanceState = "review";
      explanation = "Completed purchases exist, but package-specific checkout starts were not observed for this range.";
    } else if (missingCheckoutPackageCount > 0 || missingPurchasePackageCount > 0) {
      performanceState = "review";
      explanation = "Package performance is partially hydrated. Some starts or purchases could not be mapped to a packageId.";
    }
    if (config.effectiveUsdPer100Gd !== null && config.effectiveUsdPer100Gd < PLATFORM_ECONOMY_WARNING_FLOOR_USD_PER_100_GD) {
      performanceState = "review";
      explanation = "Package value basis is below the Platform Economy floor and needs review.";
    }

    const sourceTruth: PackagePerformanceState["rows"][number]["sourceTruth"] =
      checkoutStarts > 0 && completedPurchases > 0
        ? "mixed"
        : completedPurchases > 0
          ? "server_transactions"
          : checkoutStarts > 0
            ? "checkout_telemetry"
            : "platform_economy";

    const freshnessState: PackagePerformanceState["rows"][number]["freshnessState"] =
      (checkoutStarts > 0 || completedPurchases > 0)
        ? (input.freshnessState === "missing"
          ? "partial"
          : input.freshnessState === "unknown"
            ? "unknown"
            : input.freshnessState === "stale"
              ? "stale"
              : "live")
        : "unknown";

    return {
      packageId: config.packageId,
      packageLabel: config.label,
      priceUsd: config.priceUsd,
      basePaidGd: config.basePaidGd,
      bonusPaidGd: config.bonusPaidGd,
      totalGd: config.totalGd,
      effectiveUsdPer100Gd: config.effectiveUsdPer100Gd,
      checkoutStarts,
      completedPurchases,
      conversionRatePct,
      revenueUsd,
      paidGdIssued,
      bonusGdIssued,
      promoDiscountUsd,
      sourceTruth,
      freshnessState,
      performanceState,
      explanation,
    };
  });

  const sourceState: PackagePerformanceState["sourceState"] =
    input.packageConfigs.length === 0
      ? "missing"
      : rows.some((row) => row.checkoutStarts > 0 || row.completedPurchases > 0)
        ? missingCheckoutPackageCount > 0 || missingPurchasePackageCount > 0
          ? "partial"
          : input.freshnessState
        : "partial";

  const packagePerformanceState: PackagePerformanceState = {
    generatedAtUtc: input.generatedAtUtc,
    range: input.rangeLabel,
    sourceState,
    packageCount: rows.length,
    rows: rows.sort((left, right) => right.completedPurchases - left.completedPurchases || right.checkoutStarts - left.checkoutStarts || left.priceUsd! - right.priceUsd!),
    totals: {
      checkoutStarts: rows.reduce((sum, row) => sum + row.checkoutStarts, 0),
      completedPurchases: rows.reduce((sum, row) => sum + row.completedPurchases, 0),
      revenueUsd: roundMoney(rows.reduce((sum, row) => sum + row.revenueUsd, 0)),
      paidGdIssued: rows.reduce((sum, row) => sum + row.paidGdIssued, 0),
      bonusGdIssued: rows.reduce((sum, row) => sum + row.bonusGdIssued, 0),
    },
    warnings,
  };

  const categoryMixMap = new Map<string, { label: string; previews: number; unlocks: number }>();
  (input.telemetryLogsByEvent.drop_preview_opened || []).forEach((record) => {
    const label = getTelemetryParamString(record, "drop_category") || "unknown";
    const current = categoryMixMap.get(label) || { label, previews: 0, unlocks: 0 };
    current.previews += 1;
    categoryMixMap.set(label, current);
  });
  (input.telemetryLogsByEvent.drop_unwrapped || []).forEach((record) => {
    const label = getTelemetryParamString(record, "drop_category") || "unknown";
    const current = categoryMixMap.get(label) || { label, previews: 0, unlocks: 0 };
    current.unlocks += 1;
    categoryMixMap.set(label, current);
  });

  const unlockCategoryMix = Array.from(categoryMixMap.values())
    .map((entry) => ({
      ...entry,
      unlockRate: entry.previews > 0 ? entry.unlocks / entry.previews : 0,
    }))
    .sort((left, right) => right.unlocks - left.unlocks);

  const telemetryWatchDepthValues = [
    ...(input.telemetryLogsByEvent.viewer_watch_checkpoint || []).map((record) => getTelemetryParamNumber(record, "watch_seconds")),
    ...(input.telemetryLogsByEvent.viewer_asset_consumed || []).map((record) => getTelemetryParamNumber(record, "watch_seconds")),
  ].filter((value) => value > 0);
  const canonicalWatchDepthValues = input.watchAssetDocs.map((doc) => {
      const data = doc.data() as Record<string, unknown>;
      return Math.max(
        toNumber(data.totalWatchSeconds),
        toNumber(data.totalVisibleSeconds),
        toNumber(data.maxProgressSeconds),
        toNumber(data.checkpointMaxSeconds),
      );
    })
    .filter((value) => value > 0);
  const watchDepthValues = canonicalWatchDepthValues.length > 0
    ? canonicalWatchDepthValues
    : telemetryWatchDepthValues;
  const watchDepthBuckets = buildDurationBuckets(
    watchDepthValues.map((value) => value * 1000),
    [
      { label: "<30s", max: 30_000 },
      { label: "30-60s", max: 60_000 },
      { label: "60-90s", max: 90_000 },
      { label: "90-180s", max: 180_000 },
      { label: "180s+", max: Number.POSITIVE_INFINITY },
    ],
  );

  const contentJourney = [
    { label: "Previews", count: input.funnel.previewOpens },
    { label: "Unlock attempts", count: input.eventsData.drop_unlock_attempted || 0 },
    { label: "Unlocks", count: input.funnel.unlocks },
    { label: "Viewer opens", count: Math.max(input.funnel.viewerOpens, input.viewerOverview.viewCount) },
    { label: "Meaningful watch", count: input.viewerOverview.meaningfulSessionCount },
    { label: "Opened, no depth", count: input.viewerOverview.openedWithoutDepthCount },
    { label: "Converted", count: input.viewerOverview.convertedSessionCount },
    { label: "Completed", count: input.viewerOverview.completedSessionCount },
    { label: "Returns", count: input.viewerOverview.returnSessionCount },
  ];

  const tagDemandMap = new Map<string, number>();
  (input.telemetryLogsByEvent.drop_unwrapped || []).forEach((record) => {
    const rawTags = getTelemetryParamString(record, "drop_tags");
    rawTags
      .split("|")
      .map((value) => value.trim())
      .filter(Boolean)
      .forEach((tag) => {
        tagDemandMap.set(tag, (tagDemandMap.get(tag) || 0) + 1);
      });
  });
  const contentTagDemand = Array.from(tagDemandMap.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 10);

  return {
    packagePerformance,
    packagePerformanceState,
    unlockCategoryMix,
    watchDepthBuckets,
    contentJourney,
    contentTagDemand,
  };
}
