import "server-only";

import { PLATFORM_ECONOMY_WARNING_FLOOR_USD_PER_100_GD } from "@/lib/platform-economy";
import { normalizeDropRecord } from "@/lib/drop-normalizers";
import type { Drop } from "@/types/db";
import type { ContentConversionState, PackagePerformanceState } from "@/types/admin-analytics";
import {
  getTelemetryDropId,
  ViewerOverview,
  ViewerDropInsight,
  buildDurationBuckets,
  getTelemetryParamNumber,
  getTelemetryParamString,
  TelemetryLogRecord,
  toNumber,
  toStringValue,
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
  contentConversionState: ContentConversionState;
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

type DropMetadataRecord = {
  dropId: string;
  title: string;
  creatorId: string;
  creatorLabel: string;
  unlockCost: number;
  tags: string[];
  type: Drop["type"];
  contentType: "image" | "video" | "bundle" | "mixed" | "unknown";
  priceBand: "free" | "low" | "mid" | "high" | "unknown";
};

type ContentConversionAccumulator = {
  groupKey: string;
  groupLabel: string;
  groupingDimension: "contentType" | "flavor" | "creator" | "priceBand" | "unknown";
  dropIds: Set<string>;
  previewCount: number;
  unlockCount: number;
  viewerOpenCount: number;
  watchSeconds: number;
  completionNumerator: number;
  completionDenominator: number;
  revenueUsd: number;
  gumdropsSpent: number;
  sourceTruths: Set<string>;
  missingMetadata: boolean;
  hasPreviewSource: boolean;
  hasUnlockSource: boolean;
  hasViewerSource: boolean;
};

function deriveContentType(drop: Drop): DropMetadataRecord["contentType"] {
  const images = Math.max(0, drop.mediaCounts?.images ?? 0);
  const videos = Math.max(0, drop.mediaCounts?.videos ?? 0);
  if (images > 0 && videos > 0) return "mixed";
  if (videos > 0) return "video";
  if (images > 1 || (drop.contentUrls?.length ?? 0) > 1) return "bundle";
  if (images === 1 || drop.imageUrl || drop.contentUrl) return "image";
  return "unknown";
}

function derivePriceBand(unlockCost: number): DropMetadataRecord["priceBand"] {
  if (!Number.isFinite(unlockCost) || unlockCost < 0) return "unknown";
  if (unlockCost === 0) return "free";
  if (unlockCost <= 49) return "low";
  if (unlockCost <= 149) return "mid";
  return "high";
}

function deriveFlavor(tags: string[]) {
  const firstTag = tags.find((tag) => tag.trim().length > 0);
  return firstTag ? firstTag.trim() : "Unknown flavor";
}

function normalizeCreatorLabel(raw: Record<string, unknown>, creatorId: string) {
  const displayName = toStringValue(raw.creatorDisplayName);
  const username = toStringValue(raw.creatorUsername);
  if (displayName) return displayName;
  if (username) return username.startsWith("@") ? username : `@${username}`;
  return creatorId || "Unknown creator";
}

function buildDropMetadataMap(dropDocs: FirebaseFirestore.QueryDocumentSnapshot[]) {
  const metadataById = new Map<string, DropMetadataRecord>();
  dropDocs.forEach((doc) => {
    const raw = doc.data() as Record<string, unknown>;
    const normalized = normalizeDropRecord(raw, doc.id);
    const tags = Array.isArray(normalized.tags)
      ? normalized.tags.filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0)
      : [];
    const creatorId = typeof normalized.creatorId === "string" ? normalized.creatorId : "";
    metadataById.set(doc.id, {
      dropId: doc.id,
      title: normalized.title || doc.id,
      creatorId,
      creatorLabel: normalizeCreatorLabel(raw, creatorId),
      unlockCost: Number.isFinite(normalized.unlockCost) ? normalized.unlockCost : 0,
      tags,
      type: normalized.type,
      contentType: deriveContentType(normalized),
      priceBand: derivePriceBand(normalized.unlockCost),
    });
  });
  return metadataById;
}

function buildUnknownDropMetadata(dropId: string): DropMetadataRecord {
  return {
    dropId,
    title: dropId === "unknown-drop" ? "Unknown drop" : dropId,
    creatorId: "",
    creatorLabel: "Unknown creator",
    unlockCost: 0,
    tags: [],
    type: undefined,
    contentType: "unknown",
    priceBand: "unknown",
  };
}

function ensureContentGroup(
  groups: Map<string, ContentConversionAccumulator>,
  groupingDimension: ContentConversionAccumulator["groupingDimension"],
  metadata: DropMetadataRecord,
  key: string,
  label: string,
  sourceTruth: string,
) {
  const groupKey = `${groupingDimension}:${key}`;
  const current = groups.get(groupKey) || {
    groupKey,
    groupLabel: label,
    groupingDimension,
    dropIds: new Set<string>(),
    previewCount: 0,
    unlockCount: 0,
    viewerOpenCount: 0,
    watchSeconds: 0,
    completionNumerator: 0,
    completionDenominator: 0,
    revenueUsd: 0,
    gumdropsSpent: 0,
    sourceTruths: new Set<string>(),
    missingMetadata: metadata.contentType === "unknown" || label.startsWith("Unknown"),
    hasPreviewSource: false,
    hasUnlockSource: false,
    hasViewerSource: false,
  };
  current.dropIds.add(metadata.dropId);
  current.sourceTruths.add(sourceTruth);
  current.missingMetadata = current.missingMetadata || metadata.contentType === "unknown" || label.startsWith("Unknown");
  groups.set(groupKey, current);
  return current;
}

function registerMetadataGroups(
  groups: Map<string, ContentConversionAccumulator>,
  metadata: DropMetadataRecord,
  sourceTruth: string,
) {
  const flavorLabel = deriveFlavor(metadata.tags);
  ensureContentGroup(groups, "contentType", metadata, metadata.contentType, metadata.contentType === "unknown" ? "Unknown content type" : metadata.contentType, sourceTruth);
  ensureContentGroup(groups, "flavor", metadata, flavorLabel.toLowerCase(), flavorLabel, sourceTruth);
  ensureContentGroup(groups, "creator", metadata, metadata.creatorId || metadata.creatorLabel.toLowerCase(), metadata.creatorLabel, sourceTruth);
  ensureContentGroup(groups, "priceBand", metadata, metadata.priceBand, metadata.priceBand === "unknown" ? "Unknown price band" : metadata.priceBand, sourceTruth);
}

export function buildHistoricalContentAnalytics(input: {
  telemetryLogsByEvent: Record<string, TelemetryLogRecord[]>;
  eventsData: Record<string, number>;
  watchAssetDocs: FirebaseFirestore.QueryDocumentSnapshot[];
  dropDocs: FirebaseFirestore.QueryDocumentSnapshot[];
  dropDailyDocs: FirebaseFirestore.QueryDocumentSnapshot[];
  viewerDropInsights: ViewerDropInsight[];
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

  const dropMetadataMap = buildDropMetadataMap(input.dropDocs);
  const contentConversionGroups = new Map<string, ContentConversionAccumulator>();
  dropMetadataMap.forEach((metadata) => {
    registerMetadataGroups(contentConversionGroups, metadata, "drop_metadata");
  });

  const previewCountsByDrop = new Map<string, number>();
  let previewMissingDropIdCount = 0;
  for (const record of input.telemetryLogsByEvent.drop_preview_opened || []) {
    const dropId = getTelemetryDropId(record);
    if (!dropId || dropId === "unknown-drop") {
      previewMissingDropIdCount += 1;
      continue;
    }
    previewCountsByDrop.set(dropId, (previewCountsByDrop.get(dropId) || 0) + 1);
    const metadata = dropMetadataMap.get(dropId) || buildUnknownDropMetadata(dropId);
    registerMetadataGroups(contentConversionGroups, metadata, "preview_telemetry");
    for (const group of contentConversionGroups.values()) {
      if (group.dropIds.has(dropId)) {
        group.previewCount += 1;
        group.hasPreviewSource = true;
      }
    }
  }

  const unlockCountsByDrop = new Map<string, { count: number; revenueUsd: number; gumdropsSpent: number; sourceTruth: string }>();
  let unlockMissingDropIdCount = 0;
  for (const transaction of input.normalizedTransactionsInRange) {
    if (transaction.type !== "unlock_content") {
      continue;
    }
    const transactionRecord = transaction as Record<string, unknown>;
    const dropId = toStringValue(transactionRecord.relatedDropId);
    if (!dropId) {
      unlockMissingDropIdCount += 1;
      continue;
    }
    const current = unlockCountsByDrop.get(dropId) || { count: 0, revenueUsd: 0, gumdropsSpent: 0, sourceTruth: "unlock_transactions" };
    current.count += 1;
    current.revenueUsd += toNumber(transactionRecord.grossRevenueUsd);
    current.gumdropsSpent += Math.max(
      0,
      Math.abs(
        toNumber(transactionRecord.amount)
        || (toNumber(transactionRecord.purchasedAmountSpent) + toNumber(transactionRecord.rewardAmountSpent)),
      ),
    );
    unlockCountsByDrop.set(dropId, current);
  }

  let usingUnlockRollupFallback = false;
  if (unlockCountsByDrop.size === 0) {
    input.dropDailyDocs.forEach((doc) => {
      const raw = doc.data() as Record<string, unknown>;
      const dropId = toStringValue(raw.dropId);
      const unlockCount = Math.max(0, toNumber(raw.unlockCount) || toNumber(raw.unwrapCount));
      if (!dropId || unlockCount <= 0) {
        return;
      }
      usingUnlockRollupFallback = true;
      unlockCountsByDrop.set(dropId, {
        count: unlockCount,
        revenueUsd: 0,
        gumdropsSpent: Math.max(0, toNumber(raw.gumdropsSpent)),
        sourceTruth: "unlock_rollup",
      });
    });
  }

  for (const [dropId, unlockEntry] of unlockCountsByDrop.entries()) {
    const metadata = dropMetadataMap.get(dropId) || buildUnknownDropMetadata(dropId);
    registerMetadataGroups(contentConversionGroups, metadata, unlockEntry.sourceTruth);
    for (const group of contentConversionGroups.values()) {
      if (group.dropIds.has(dropId)) {
        group.unlockCount += unlockEntry.count;
        group.revenueUsd += unlockEntry.revenueUsd;
        group.gumdropsSpent += unlockEntry.gumdropsSpent;
        group.hasUnlockSource = true;
      }
    }
  }

  const viewerOpenCountsByDrop = new Map<string, number>();
  let viewerMissingDropIdCount = 0;
  for (const record of input.telemetryLogsByEvent.viewer_opened || []) {
    const dropId = getTelemetryDropId(record);
    if (!dropId || dropId === "unknown-drop") {
      viewerMissingDropIdCount += 1;
      continue;
    }
    viewerOpenCountsByDrop.set(dropId, (viewerOpenCountsByDrop.get(dropId) || 0) + 1);
    const metadata = dropMetadataMap.get(dropId) || buildUnknownDropMetadata(dropId);
    registerMetadataGroups(contentConversionGroups, metadata, "viewer_telemetry");
    for (const group of contentConversionGroups.values()) {
      if (group.dropIds.has(dropId)) {
        group.viewerOpenCount += 1;
        group.hasViewerSource = true;
      }
    }
  }

  const viewerMetricsByDrop = new Map(
    input.viewerDropInsights.map((item) => [
      item.dropId,
      {
        watchSeconds: Math.max(0, toNumber(item.totalWatchSeconds)),
        completionRatePct: item.assetStarts > 0 ? (item.assetCompletions / item.assetStarts) * 100 : null,
      },
    ]),
  );

  for (const [dropId, viewerMetrics] of viewerMetricsByDrop.entries()) {
    const metadata = dropMetadataMap.get(dropId) || buildUnknownDropMetadata(dropId);
    registerMetadataGroups(contentConversionGroups, metadata, "watch_rollup");
    for (const group of contentConversionGroups.values()) {
      if (group.dropIds.has(dropId)) {
        group.watchSeconds += viewerMetrics.watchSeconds;
        if (viewerMetrics.completionRatePct !== null) {
          group.completionNumerator += viewerMetrics.completionRatePct;
          group.completionDenominator += 1;
        }
      }
    }
  }

  const contentConversionWarnings: string[] = [];
  if (usingUnlockRollupFallback) {
    contentConversionWarnings.push("Unwrap funnel telemetry missing; using unwrap/access rollups.");
  }
  if (previewMissingDropIdCount > 0) {
    contentConversionWarnings.push("Some preview events are missing dropId and are grouped under Unknown mapping.");
  }
  if (unlockMissingDropIdCount > 0) {
    contentConversionWarnings.push("Some unwrap events are missing dropId and are grouped under Unknown mapping.");
  }
  if (viewerMissingDropIdCount > 0) {
    contentConversionWarnings.push("Some viewer-open events are missing dropId and cannot be joined to content metadata.");
  }
  if (Array.from(dropMetadataMap.values()).some((metadata) => metadata.contentType === "unknown")) {
    contentConversionWarnings.push("Some drops are missing contentType metadata and remain in the Unknown content type bucket.");
  }
  if (dropMetadataMap.size === 0) {
    contentConversionWarnings.push("No content metadata found.");
  }

  const contentConversionRows = Array.from(contentConversionGroups.values())
    .map((group): ContentConversionState["rows"][number] => {
      const hasValidPreviewDenominator = group.previewCount > 0;
      const hasAnyActivity = group.previewCount > 0 || group.unlockCount > 0 || group.viewerOpenCount > 0 || group.watchSeconds > 0;
      const unlockRatePct = hasValidPreviewDenominator
        ? (group.unlockCount / group.previewCount) * 100
        : null;
      let conversionState: ContentConversionState["rows"][number]["conversionState"] = "healthy";
      let explanation = "Preview, unwrap, and optional viewer/watch signals are grouped by drop metadata for this content cohort.";
      if (!hasAnyActivity) {
        conversionState = "no_data";
        explanation = "Drop metadata exists for this cohort, but no preview, unwrap, or viewer activity was observed in the selected range.";
      } else if (group.missingMetadata) {
        conversionState = "missing_metadata";
        explanation = "Some drops in this cohort are missing content metadata, so they remain grouped under an Unknown bucket.";
      } else if (!hasValidPreviewDenominator && group.unlockCount > 0) {
        conversionState = "review";
        explanation = "Unwraps exist without preview source for this group.";
      } else if (usingUnlockRollupFallback || previewMissingDropIdCount > 0 || unlockMissingDropIdCount > 0) {
        conversionState = "review";
        explanation = usingUnlockRollupFallback
          ? "Unwrap counts are using drop rollup fallback because unwrap telemetry is missing for this range."
          : "Some preview or unwrap records could not be mapped cleanly, so this cohort is partially hydrated.";
      }

      const sourceTruth = group.hasPreviewSource && group.hasUnlockSource
        ? usingUnlockRollupFallback
          ? "drop_metadata_plus_unlock_rollups"
          : "drop_metadata_plus_telemetry"
        : group.hasUnlockSource
          ? usingUnlockRollupFallback
            ? "drop_metadata_plus_unlock_rollups"
            : "rollup_only"
          : group.hasPreviewSource || group.hasViewerSource
            ? "telemetry_only"
            : "missing";

      const freshnessState: ContentConversionState["rows"][number]["freshnessState"] =
        !hasAnyActivity
          ? "unknown"
          : input.freshnessState === "stale"
            ? "stale"
            : input.freshnessState === "partial" || usingUnlockRollupFallback
              ? "partial"
              : "live";

      return {
        groupKey: group.groupKey,
        groupLabel: group.groupLabel,
        groupingDimension: group.groupingDimension,
        dropCount: group.dropIds.size,
        previewCount: group.previewCount,
        unlockCount: group.unlockCount,
        unlockRatePct,
        viewerOpenCount: group.viewerOpenCount > 0 ? group.viewerOpenCount : null,
        watchSeconds: group.watchSeconds > 0 ? group.watchSeconds : null,
        completionRatePct: group.completionDenominator > 0
          ? group.completionNumerator / group.completionDenominator
          : null,
        revenueUsd: group.revenueUsd > 0 ? roundMoney(group.revenueUsd) : null,
        gumdropsSpent: group.gumdropsSpent > 0 ? group.gumdropsSpent : null,
        sourceTruth,
        freshnessState,
        conversionState,
        explanation,
      };
    })
    .sort((left, right) => right.previewCount - left.previewCount || right.unlockCount - left.unlockCount || left.groupLabel.localeCompare(right.groupLabel));

  const totalPreviews = Array.from(previewCountsByDrop.values()).reduce((sum, count) => sum + count, 0);
  const totalUnlocks = Array.from(unlockCountsByDrop.values()).reduce((sum, entry) => sum + entry.count, 0);
  const totalViewerOpens = Array.from(viewerOpenCountsByDrop.values()).reduce((sum, count) => sum + count, 0);
  const totalWatchSeconds = Array.from(viewerMetricsByDrop.values()).reduce((sum, entry) => sum + entry.watchSeconds, 0);
  const contentConversionSourceTruth: ContentConversionState["sourceTruth"] =
    dropMetadataMap.size === 0 && totalPreviews === 0 && totalUnlocks === 0
      ? "missing"
      : usingUnlockRollupFallback
        ? "drop_metadata_plus_unlock_rollups"
        : totalPreviews > 0 || totalViewerOpens > 0
          ? "drop_metadata_plus_telemetry"
          : totalUnlocks > 0
            ? "rollup_only"
            : "missing";
  const contentConversionSourceState: ContentConversionState["sourceState"] =
    dropMetadataMap.size === 0 && totalPreviews === 0 && totalUnlocks === 0
      ? "missing"
      : usingUnlockRollupFallback || previewMissingDropIdCount > 0 || unlockMissingDropIdCount > 0
        ? "partial"
        : input.freshnessState;
  const contentConversionState: ContentConversionState = {
    generatedAtUtc: input.generatedAtUtc,
    range: input.rangeLabel,
    sourceState: contentConversionSourceState,
    sourceTruth: contentConversionSourceTruth,
    totalPreviews,
    totalUnlocks,
    totalViewerOpens,
    totalWatchSeconds,
    rows: contentConversionRows,
    warnings: contentConversionWarnings,
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

  if (categoryMixMap.size === 0) {
    const fallbackContentTypeRows = contentConversionRows.filter((row) => row.groupingDimension === "contentType");
    fallbackContentTypeRows.forEach((row) => {
      categoryMixMap.set(row.groupLabel, {
        label: row.groupLabel,
        previews: row.previewCount,
        unlocks: row.unlockCount,
      });
    });
  }
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
    { label: "Unwrap attempts", count: input.eventsData.drop_unlock_attempted || 0 },
    { label: "Unwraps", count: input.funnel.unlocks },
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
    contentConversionState,
    unlockCategoryMix,
    watchDepthBuckets,
    contentJourney,
    contentTagDemand,
  };
}
