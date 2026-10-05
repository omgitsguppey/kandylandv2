import React from "react";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  Activity, AlertTriangle, Candy, CheckCircle2, Clock3, DollarSign, Eye, Funnel, PlayCircle, Route, ShoppingBag, Sparkles, Users, Wallet,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  AnalyticsTooltip,
  AnalyticsViewModeToggle,
  MetricCard,
  SectionCard,
  type AnalyticsViewMode,
} from "@/components/Admin/Analytics/AdminAnalyticsPrimitives";
import { AdminStatusBadge } from "@/components/Admin/AdminStatusBadge";
import {
  buildAdminAnalyticsViewerDrilldownContract,
  resolveAdminAnalyticsCommerceConversionFooter,
  resolveAdminAnalyticsCommerceBadgeLabel,
  resolveAdminAnalyticsTopDropIdentityTruthState,
} from "@/lib/admin-analytics-contracts";
import {
  formatAdminAnalyticsSourceStateLabel,
  formatAdminAnalyticsSourceTruthLabel,
} from "@/lib/analytics/admin-analytics-display-state";
import { coerceAdminSurfaceState } from "@/lib/admin-parity";
import { cn } from "@/lib/utils";
import Image from "next/image";
import type { AdminAnalyticsState } from "../hooks/useAdminAnalyticsState";
import {
  formatCommerceFundsLabel,
  formatCommerceMetricLabel,
  formatCommerceReadableSourceLabel,
  formatCommerceSourceHint,
} from "./AdminAnalyticsCommerceTab.utils";
import { AdminAnalyticsContentConversionSection } from "./AdminAnalyticsContentConversionSection";
import { AdminAnalyticsViewerJourneySection } from "./AdminAnalyticsViewerJourneySection";

type RecentCommerceFeedViewMode = "cards" | "table" | "timeline";

type AdminAnalyticsCommerceTabProps = Pick<
  AdminAnalyticsState,
  | "renderSectionRangeControl"
  | "liveResponse"
  | "liveLoading"
  | "nowMs"
  | "formatCompactNumber"
  | "formatDuration"
  | "formatPercent"
  | "formatRelativeTime"
  | "commerceSnapshotModel"
  | "packagePerformanceRange"
  | "packagePerformanceItems"
  | "packagePerformancePanelState"
  | "contentConversionModel"
  | "topDropConversionModel"
  | "topDropConversionPage"
  | "setTopDropConversionPage"
  | "topDropConversionPageSize"
  | "setTopDropConversionPageSize"
  | "recentCommerceFeedRange"
  | "recentCommerceFeedModel"
  | "formatAbsoluteDateTime"
  | "viewerDrilldownRange"
  | "viewerDrilldownGeneratedAtMs"
  | "viewerDrilldownFilter"
  | "viewerDrilldownOverview"
  | "viewerUserDraft"
  | "setViewerUserDraft"
  | "applyViewerFilter"
  | "clearViewerFilter"
  | "viewerDrilldownUsers"
  | "setViewerUserFilter"
  | "viewerDrilldownCaptureHealth"
  | "liveWatchCaptureHealth"
  | "formatMoney"
  | "getJourneyStateClasses"
  | "topExperienceContexts"
  | "viewerDrilldownInsights"
  | "viewerJourneyRange"
  | "viewerJourneyItems"
  | "watchDepthTagsRange"
  | "watchDepthTagBuckets"
  | "watchDepthTagDemand"
>;

const RECENT_COMMERCE_FEED_VIEW_MODES: Array<{
  id: RecentCommerceFeedViewMode;
  label: string;
}> = [
  { id: "cards", label: "Cards" },
  { id: "table", label: "Table" },
  { id: "timeline", label: "Timeline" },
];

export function AdminAnalyticsCommerceTab(props: AdminAnalyticsCommerceTabProps) {
  const {
    renderSectionRangeControl,
    liveResponse,
    liveLoading,
    nowMs,
    formatCompactNumber,
    formatDuration,
    formatPercent,
    formatRelativeTime,
    commerceSnapshotModel,
    packagePerformanceRange,
    packagePerformanceItems,
    packagePerformancePanelState,
    contentConversionModel,
    topDropConversionModel,
    topDropConversionPage,
    setTopDropConversionPage,
    topDropConversionPageSize,
    setTopDropConversionPageSize,
    recentCommerceFeedRange,
    recentCommerceFeedModel,
    formatAbsoluteDateTime,
    viewerDrilldownRange,
    viewerDrilldownGeneratedAtMs,
    viewerDrilldownFilter,
    viewerDrilldownOverview,
    viewerUserDraft,
    setViewerUserDraft,
    applyViewerFilter,
    clearViewerFilter,
    viewerDrilldownUsers,
    setViewerUserFilter,
    viewerDrilldownCaptureHealth,
    liveWatchCaptureHealth,
    formatMoney,
    getJourneyStateClasses,
    topExperienceContexts,
    viewerDrilldownInsights,
    viewerJourneyRange,
    viewerJourneyItems,
    watchDepthTagsRange,
    watchDepthTagBuckets,
    watchDepthTagDemand,
  } = props;
  const liveCaptureTruthState = liveResponse?.liveTruthLabel
    ? coerceAdminSurfaceState(liveResponse.liveTruthLabel)
    : liveLoading ? "loading" : "unavailable";
  const formatCommerceValue = (
    value: number | null,
    formatter: (next: number) => string,
    waitingLabel = "No verified snapshot yet",
  ) => (typeof value === "number" && Number.isFinite(value) ? formatter(value) : waitingLabel);
  const commerceBadgeLabel = resolveAdminAnalyticsCommerceBadgeLabel(commerceSnapshotModel);
  const compactMetricClass = "rounded-[1rem] p-2";
  const compactMetricValueClass = "text-lg leading-6 md:text-xl";
  const noSnapshotLabel = "No verified snapshot yet";
  const noSourceLabel = "No source";
  const noSampleLabel = "No sample";
  const noRateSampleLabel = "No rate sample";
  const formatCommerceCardSourceHint = (
    scope: string | null | undefined,
    sourceTruth: string | null | undefined,
  ) => formatCommerceSourceHint(scope, sourceTruth, commerceSnapshotModel.selectedRangeLabel);
  const commerceConversionLabel =
    commerceSnapshotModel.checkoutConversionValue !== null
      ? formatPercent(commerceSnapshotModel.checkoutConversionValue)
      : noRateSampleLabel;
  const commerceCardMap = new Map(
    commerceSnapshotModel.commerceSnapshotState.cards.map((card) => [card.id, card]),
  );
  const revenueCard = commerceCardMap.get("revenue");
  const purchasesCard = commerceCardMap.get("completed_purchases");
  const checkoutCard = commerceCardMap.get("checkout_starts");
  const gdSpentCard = commerceCardMap.get("gd_spent");
  const adjustedProfitCard = commerceCardMap.get("adjusted_profit");
  const yieldCard = commerceCardMap.get("yield_per_100_gd");
  const walletCard = commerceCardMap.get("wallet_opens");
  const promoCard = commerceCardMap.get("promo_impact");
  const topDropConversionSourceLabel = formatAdminAnalyticsSourceTruthLabel(
    topDropConversionModel.sourceTruth,
  );
  const recentCommerceFeedSourceLabel = formatAdminAnalyticsSourceTruthLabel(
    recentCommerceFeedModel.sourceTruth,
  );
  const topDropConversionReadableSourceLabel = formatCommerceReadableSourceLabel(
    topDropConversionSourceLabel,
  );
  const topDropConversionSummaryLine = topDropConversionReadableSourceLabel === "Source missing" && topDropConversionModel.totalRows === 0
    ? `No verified drops | ${topDropConversionReadableSourceLabel}`
    : `${topDropConversionModel.visibleRows.length} visible / ${topDropConversionModel.totalRows} total | ${topDropConversionReadableSourceLabel}`;
  const recentCommerceFeedReadableSourceLabel = formatCommerceReadableSourceLabel(
    recentCommerceFeedSourceLabel,
  );
  const gdSpentTooltip = [
    "Unlock spend split by source.",
    `Paid ${formatCommerceValue(commerceSnapshotModel.paidGdSpentValue, formatCompactNumber, noSourceLabel)}`,
    `Reward ${formatCommerceValue(commerceSnapshotModel.rewardFreeGdSpentValue, formatCompactNumber, noSourceLabel)}`,
    `Unknown ${formatCommerceValue(commerceSnapshotModel.unknownSourceGdSpentValue, formatCompactNumber, noSourceLabel)}`,
  ].join(" | ");
  const adjustedProfitTooltip = [
    "Gross revenue minus fees and promo/bonus basis.",
    `Gross ${formatCommerceValue(commerceSnapshotModel.revenueValue, formatMoney, noSourceLabel)}`,
    `Fees ${formatCommerceValue(commerceSnapshotModel.paymentFeesUsdValue, formatMoney, noSourceLabel)}`,
    `Promo/bonus ${formatCommerceValue(commerceSnapshotModel.promoValueGranted, formatMoney, noSourceLabel)}`,
  ].join(" | ");
  const yieldTooltip = [
    "Revenue per 100 delivered paid-source GumDrops.",
    `Paid base ${formatCommerceValue(commerceSnapshotModel.paidBaseDeliveredGdValue, formatCompactNumber, noSourceLabel)}`,
    `Paid bonus ${formatCommerceValue(commerceSnapshotModel.paidBonusDeliveredGdValue, formatCompactNumber, noSourceLabel)}`,
  ].join(" | ");
  const promoTooltip = [
    "Promo and bonus value stay separate from revenue.",
    `Bonus GumDrops ${formatCommerceValue(commerceSnapshotModel.bonusGdGranted, formatCompactNumber, noSourceLabel)}`,
    `Discount ${formatCommerceValue(commerceSnapshotModel.promoDiscountUsdValue, formatMoney, noSourceLabel)}`,
    `Value basis ${formatCommerceValue(commerceSnapshotModel.promoValueGranted, formatMoney, noSourceLabel)}`,
  ].join(" | ");
  const commerceGeneratedAtLabel = commerceSnapshotModel.generatedAtUtc
    ? formatAbsoluteDateTime(Date.parse(commerceSnapshotModel.generatedAtUtc))
    : "Unknown";
  const commerceConversionFooter = resolveAdminAnalyticsCommerceConversionFooter({
    checkoutConversionWarning: commerceSnapshotModel.checkoutConversionWarning,
    checkoutConversionLabel: commerceConversionLabel,
  });
  const [packagePerformanceViewMode, setPackagePerformanceViewMode] = React.useState<AnalyticsViewMode>("cards");
  const [topDropConversionViewMode, setTopDropConversionViewMode] = React.useState<AnalyticsViewMode>("cards");
  const [viewerDropViewMode, setViewerDropViewMode] = React.useState<AnalyticsViewMode>("cards");
  const [watchDepthTagsViewMode, setWatchDepthTagsViewMode] = React.useState<AnalyticsViewMode>("cards");
  const [recentCommerceFeedViewMode, setRecentCommerceFeedViewMode] =
    React.useState<RecentCommerceFeedViewMode>("cards");
  const packagePerformanceRows = packagePerformancePanelState?.rows ?? [];
  const packagePerformanceChartRows = packagePerformanceRows.map((row: any) => ({
    ...row,
    chartLabel:
      row.packageLabel && row.packageLabel.length > 14
        ? `${row.packageLabel.slice(0, 14)}...`
        : row.packageLabel || row.packageId,
  }));
  const [viewerDropPage, setViewerDropPage] = React.useState(1);
  const viewerDropPageSize = 5;
  const viewerDropTotalRows = viewerDrilldownInsights.length;
  const viewerDropPageCount = Math.max(1, Math.ceil(viewerDropTotalRows / viewerDropPageSize));
  const boundedViewerDropPage = Math.min(viewerDropPage, viewerDropPageCount);
  const viewerDropVisibleRows = viewerDrilldownInsights.slice(
    (boundedViewerDropPage - 1) * viewerDropPageSize,
    boundedViewerDropPage * viewerDropPageSize,
  );
  const viewerDropVisibleChartData = viewerDropVisibleRows.map((item: any) => ({
    ...item,
    shortLabel:
      item.dropTitle && item.dropTitle.length > 16
        ? `${item.dropTitle.slice(0, 16)}...`
        : item.dropTitle || "Unknown drop",
  }));
  const viewerJourneyDisplayItems = viewerJourneyItems.map((item) => ({
    label: item.label,
    count: item.count,
  }));
  const watchDepthMaxCount = Math.max(
    1,
    ...watchDepthTagBuckets.map((bucket: any) => Number(bucket.count || 0)),
  );
  const watchDepthChartRows = watchDepthTagBuckets.map((bucket: any) => ({
    ...bucket,
    shortLabel:
      bucket.label && bucket.label.length > 14
        ? `${bucket.label.slice(0, 14)}...`
        : bucket.label || "Unknown depth",
  }));
  const watchTagVisibleRows = watchDepthTagDemand.slice(0, 8);
  const viewerDrilldownGeneratedAtLabel = viewerDrilldownGeneratedAtMs
    ? formatAbsoluteDateTime(viewerDrilldownGeneratedAtMs)
    : "Unknown";
  const viewerLastSessionLabel = viewerDrilldownCaptureHealth.lastSeenAtMs
    ? formatRelativeTime(viewerDrilldownCaptureHealth.lastSeenAtMs, nowMs)
    : "Last viewer session unavailable";
  const viewerDrilldownContract = buildAdminAnalyticsViewerDrilldownContract({
    nowMs,
    formatDuration,
    viewerDrilldownOverview,
    viewerDrilldownCaptureHealth,
    liveWatchCaptureHealth,
    viewerDrilldownUsers,
  });
  const {
    viewerSourceTruth,
    viewerFreshnessState,
    verifiedWatchSeconds,
    estimatedWatchSeconds,
    totalViewerWatchSeconds,
    avgWatchDenominator,
    earlyExitFormula,
    captureHealthExplanation,
    viewerCapturePulseState,
    viewerCapturePulseBadgeLabel,
    viewerCapturePulseExplanation,
    viewerUserJourneyRows,
    viewerPanelWarnings,
  } = viewerDrilldownContract;
  const viewerSourceLabel = formatCommerceReadableSourceLabel(
    formatAdminAnalyticsSourceTruthLabel(viewerSourceTruth),
  );

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    (window as typeof window & {
      __KANDYDROPS_ADMIN_ANALYTICS_COMMERCE_SNAPSHOT_DEBUG__?: typeof commerceSnapshotModel;
    }).__KANDYDROPS_ADMIN_ANALYTICS_COMMERCE_SNAPSHOT_DEBUG__ = commerceSnapshotModel;
  }, [commerceSnapshotModel]);

  return (
    <>
            <SectionCard
              title="Commerce Snapshot"
              subtitle="Money in, completed purchases, GumDrop spend, and funnel health."
              icon={DollarSign}
              defaultExpanded={false}
              rightSlot={renderSectionRangeControl("commerceSnapshot")}
            >
              <div
                className="border-b border-border mb-2.5 px-3 py-2 text-xs leading-5 text-muted-foreground"
                data-admin-analytics-snapshot-priority="analytics_admin_metric_snapshots"
                data-admin-analytics-vendor-source-label="vendor_evidence"
                data-admin-analytics-raw-ledger-display="debug_only"
                data-admin-analytics-recovery-promotion="debug_only_not_promoted"
              >
                {commerceSnapshotModel.visibleCopy.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>

              <div className="border-b border-border mb-2 grid gap-2 px-3 py-2 text-xs text-muted-foreground min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
                <div>
                  <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Range</div>
                  <div className="font-semibold text-foreground">{commerceSnapshotModel.selectedRangeLabel}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Cache freshness</div>
                  <div className="font-semibold text-foreground">{commerceBadgeLabel}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Last verified</div>
                  <div className="font-semibold text-foreground">{commerceGeneratedAtLabel}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Treasury</div>
                  <div className="font-semibold text-foreground">Platform Economy</div>
                  <div className="text-muted-foreground">Server ledger remains the treasury source.</div>
                </div>
              </div>

              {commerceSnapshotModel.commerceSnapshotState.rangeConsistency.warning ? (
                <div className="mb-2 rounded-[1rem] border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-100">
                  {commerceSnapshotModel.commerceSnapshotState.rangeConsistency.warning}
                </div>
              ) : null}

              {commerceSnapshotModel.commerceSnapshotState.treasuryWarnings.length > 0 ? (
                <div className="mb-2 rounded-[1rem] border border-brand-pink/20 bg-brand-pink/10 px-3 py-2 text-xs leading-5 text-brand-pink">
                  {commerceSnapshotModel.commerceSnapshotState.treasuryWarnings.join(" ")}
                </div>
              ) : null}

              <div className="grid gap-2 min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
                <MetricCard
                  label={formatCommerceMetricLabel(revenueCard?.label ?? "Revenue")}
                  value={formatCommerceValue(commerceSnapshotModel.revenueValue, formatMoney)}
                  hint={formatCommerceCardSourceHint(revenueCard?.scope, revenueCard?.sourceTruth)}
                  icon={DollarSign}
                  truthState={commerceSnapshotModel.metrics.revenue.truthState}
                  statusBadgeLabel={commerceBadgeLabel}
                  className={compactMetricClass}
                  valueClassName={compactMetricValueClass}
                  dictionaryTooltip={revenueCard?.explanation ?? "Completed real-money purchases from internal payment records. Promo and bonus value are excluded."}
                />
                <MetricCard
                  label={formatCommerceMetricLabel(purchasesCard?.label ?? "Purchases")}
                  value={formatCommerceValue(commerceSnapshotModel.purchaseCompletionsValue, formatCompactNumber)}
                  hint={formatCommerceCardSourceHint(purchasesCard?.scope, purchasesCard?.sourceTruth)}
                  icon={CheckCircle2}
                  truthState={commerceSnapshotModel.metrics.purchases.truthState}
                  statusBadgeLabel={commerceBadgeLabel}
                  className={compactMetricClass}
                  valueClassName={compactMetricValueClass}
                  dictionaryTooltip={purchasesCard?.explanation ?? "Server-confirmed completed purchases, not checkout starts."}
                />
                <MetricCard
                  label={formatCommerceMetricLabel(checkoutCard?.label ?? "Checkout Starts")}
                  value={formatCommerceValue(commerceSnapshotModel.checkoutStartsValue, formatCompactNumber)}
                  hint={formatCommerceCardSourceHint(checkoutCard?.scope, checkoutCard?.sourceTruth)}
                  icon={Funnel}
                  truthState={commerceSnapshotModel.metrics.checkoutStarts.truthState}
                  statusBadgeLabel={commerceBadgeLabel}
                  className={compactMetricClass}
                  valueClassName={compactMetricValueClass}
                  dictionaryTooltip={checkoutCard?.explanation ?? "Checkout start telemetry. It is separate from completed purchases."}
                />
                <MetricCard
                  label={formatCommerceMetricLabel(gdSpentCard?.label ?? "GumDrops Spent")}
                  value={formatCommerceValue(commerceSnapshotModel.gdSpentValue, formatCompactNumber)}
                  hint={formatCommerceCardSourceHint(gdSpentCard?.scope, gdSpentCard?.sourceTruth)}
                  icon={ShoppingBag}
                  truthState={commerceSnapshotModel.metrics.gdSpent.truthState}
                  statusBadgeLabel={commerceBadgeLabel}
                  className={compactMetricClass}
                  valueClassName={compactMetricValueClass}
                  dictionaryTooltip={gdSpentTooltip}
                />
              </div>

              <div className="mt-2 grid gap-2 min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
                <MetricCard
                  label={formatCommerceMetricLabel(adjustedProfitCard?.label ?? "Adjusted Profit")}
                  value={formatCommerceValue(commerceSnapshotModel.adjustedProfitValue, formatMoney)}
                  hint={formatCommerceCardSourceHint(adjustedProfitCard?.scope, adjustedProfitCard?.sourceTruth)}
                  icon={Wallet}
                  truthState={commerceSnapshotModel.metrics.adjustedProfit.truthState}
                  statusBadgeLabel={commerceBadgeLabel}
                  className={compactMetricClass}
                  valueClassName={compactMetricValueClass}
                  dictionaryTooltip={adjustedProfitTooltip}
                />
                <MetricCard
                  label={formatCommerceMetricLabel(yieldCard?.label ?? "Yield / 100 GumDrops")}
                  value={formatCommerceValue(commerceSnapshotModel.yieldPer100GdValue, formatMoney)}
                  hint={formatCommerceCardSourceHint(yieldCard?.scope, yieldCard?.sourceTruth)}
                  icon={Sparkles}
                  truthState={commerceSnapshotModel.metrics.yieldPer100Gd.truthState}
                  statusBadgeLabel={commerceBadgeLabel}
                  className={compactMetricClass}
                  valueClassName={compactMetricValueClass}
                  dictionaryTooltip={yieldTooltip}
                />
                <MetricCard
                  label={formatCommerceMetricLabel(walletCard?.label ?? "Wallet Opens")}
                  value={formatCommerceValue(commerceSnapshotModel.walletOpensValue, formatCompactNumber)}
                  hint={formatCommerceCardSourceHint(walletCard?.scope, walletCard?.sourceTruth)}
                  icon={Wallet}
                  truthState={commerceSnapshotModel.metrics.walletOpens.truthState}
                  statusBadgeLabel={commerceBadgeLabel}
                  className={compactMetricClass}
                  valueClassName={compactMetricValueClass}
                  dictionaryTooltip={walletCard?.explanation ?? "Wallet open telemetry for the selected range."}
                />
                <MetricCard
                  label={formatCommerceMetricLabel(promoCard?.label ?? "Promo Impact")}
                  value={formatCommerceValue(commerceSnapshotModel.promoValueGranted, formatMoney, noSourceLabel)}
                  hint={formatCommerceCardSourceHint(promoCard?.scope, promoCard?.sourceTruth)}
                  icon={Candy}
                  truthState={commerceSnapshotModel.metrics.promoImpact.truthState}
                  statusBadgeLabel={commerceBadgeLabel}
                  className={compactMetricClass}
                  valueClassName={compactMetricValueClass}
                  dictionaryTooltip={promoTooltip}
                />
              </div>

              <div className="border-b border-border mt-2 px-3 py-2 text-xs leading-5 text-muted-foreground @3xl:flex @3xl:items-center @3xl:justify-between md:gap-3">
                <div className="font-semibold text-foreground">
                  {commerceConversionFooter}
                </div>
                <div className="text-brand-purple">
                  {commerceSnapshotModel.needsAttention.length > 0
                    ? commerceSnapshotModel.needsAttention.slice(0, 2).join(" | ")
                    : "No commerce action required."}
                </div>
              </div>
            </SectionCard>

            <div className="grid min-w-0 gap-4">
              <SectionCard
                title="Package Performance"
                subtitle="Which Gum Drop packs earn starts, purchases, and drop-off."
                icon={Wallet}
                rightSlot={(
                  <div className="flex flex-wrap items-center justify-end gap-2 min-w-0 max-w-full">
                    <AnalyticsViewModeToggle
                      value={packagePerformanceViewMode}
                      onChange={setPackagePerformanceViewMode}
                      options={[
                        { id: "cards", label: "Cards" },
                        { id: "chart", label: "Chart" },
                        { id: "table", label: "Table" },
                      ]}
                    />
                    {renderSectionRangeControl("packagePerformance")}
                  </div>
                )}
              >
                <div
                  className="space-y-3"
                  data-admin-analytics-mobile-view-mode={packagePerformanceViewMode}
                  data-package-performance-source-state={packagePerformancePanelState?.sourceState ?? "unknown"}
                  data-package-performance-range={packagePerformancePanelState?.range ?? packagePerformanceRange}
                >
                <div className="border-b border-border grid gap-2 px-3 py-2 text-xs text-muted-foreground min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
                  <div>
                    <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Range</div>
                    <div className="font-semibold text-foreground">{packagePerformancePanelState?.range ?? packagePerformanceRange}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Source state</div>
                    <div className="font-semibold text-foreground">{packagePerformancePanelState?.sourceState ?? "unknown"}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Packages</div>
                    <div className="font-semibold text-foreground">{packagePerformancePanelState?.packageCount ?? packagePerformanceItems.length}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Totals</div>
                    <div className="font-semibold text-foreground">
                      {packagePerformancePanelState
                        ? `${packagePerformancePanelState.totals.completedPurchases} purchases | ${formatMoney(packagePerformancePanelState.totals.revenueUsd)}`
                        : `${packagePerformanceItems.length} rows`}
                    </div>
                  </div>
                </div>

                {packagePerformancePanelState?.warnings?.length ? (
                  <div className="rounded-[1rem] border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-100">
                    {packagePerformancePanelState.warnings.join(" ")}
                  </div>
                ) : null}

                {packagePerformancePanelState && packagePerformanceRows.length > 0 ? (
                  <div className="space-y-2">
                    {packagePerformanceViewMode === "chart" ? (
                      <div className="border-b border-border h-72 w-full p-3">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={packagePerformanceChartRows} margin={{ top: 8, right: 8, left: -18, bottom: 36 }}>
                            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                            <XAxis dataKey="chartLabel" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} interval={0} angle={-18} textAnchor="end" height={58} />
                            <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                            <Tooltip content={<AnalyticsTooltip />} />
                            <Bar dataKey="checkoutStarts" name="Starts" fill="#22d3ee" radius={[10, 10, 0, 0]} />
                            <Bar dataKey="completedPurchases" name="Purchases" fill="#b28cff" radius={[10, 10, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : null}

                    {packagePerformanceViewMode === "table" ? (
                      <div
                        className="rounded-2xl bg-card overflow-x-auto"
                        data-package-performance-table="compact"
                      >
                        <table className="min-w-full text-left text-xs">
                          <thead className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                            <tr>
                              <th className="px-3 py-2 font-semibold">Package</th>
                              <th className="px-3 py-2 font-semibold">Price</th>
                              <th className="px-3 py-2 font-semibold">Starts</th>
                              <th className="px-3 py-2 font-semibold">Purch.</th>
                              <th className="px-3 py-2 font-semibold">Conv.</th>
                              <th className="px-3 py-2 font-semibold">Revenue</th>
                              <th className="px-3 py-2 font-semibold">GD issued</th>
                              <th className="px-3 py-2 font-semibold">State</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/10 text-muted-foreground">
                            {packagePerformanceRows.map((row: any) => (
                              <tr
                                key={`package-performance-table-${row.packageId}`}
                                data-package-performance-id={row.packageId}
                                data-package-performance-state={row.performanceState}
                                data-package-performance-source={row.sourceTruth}
                              >
                                <td className="max-w-[14rem] min-w-0 whitespace-normal wrap-anywhere px-3 py-2 font-semibold text-foreground" title={`${row.packageId} | ${row.sourceTruth}`}>
                                  {row.packageLabel}
                                </td>
                                <td className="px-3 py-2">{row.priceUsd === null ? "N/A" : formatMoney(row.priceUsd)}</td>
                                <td className="px-3 py-2">{row.checkoutStarts}</td>
                                <td className="px-3 py-2">{row.completedPurchases}</td>
                                <td className="px-3 py-2">{row.conversionRatePct === null ? noRateSampleLabel : `${Math.round(row.conversionRatePct)}%`}</td>
                                <td className="px-3 py-2">{formatMoney(row.revenueUsd)}</td>
                                <td className="px-3 py-2">{row.paidGdIssued + row.bonusGdIssued}</td>
                                <td className="px-3 py-2">{row.performanceState}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : null}

                    {packagePerformanceViewMode === "cards" ? (
                      <div className="space-y-2">
                        {packagePerformanceRows.map((row: any) => (
                          <div
                            key={row.packageId}
                            className="border-b border-border px-3 py-3"
                            data-package-performance-id={row.packageId}
                            data-package-performance-state={row.performanceState}
                            data-package-performance-source={row.sourceTruth}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="min-w-0 whitespace-normal wrap-anywhere text-sm font-semibold text-foreground">{row.packageLabel}</p>
                                <p className="text-xs text-muted-foreground">{row.packageId}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold text-brand-purple">
                                  {row.conversionRatePct === null ? "Partial" : `${Math.round(row.conversionRatePct)}%`}
                                </p>
                                <p className="text-xs text-muted-foreground">{row.performanceState}</p>
                              </div>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                              <span>{row.priceUsd === null ? "No price" : formatMoney(row.priceUsd)}</span>
                              <span>{row.checkoutStarts} starts</span>
                              <span>{row.completedPurchases} purchases</span>
                              <span>{formatMoney(row.revenueUsd)} revenue</span>
                              <span>{row.paidGdIssued + row.bonusGdIssued} GD issued</span>
                            </div>
                            <p className="mt-2 text-xs leading-5 text-muted-foreground">{row.explanation}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="border-b border-border px-4 py-4 text-sm text-muted-foreground">
                    {packagePerformancePanelState?.sourceState === "missing"
                      ? "No package config found. Package value basis should come from Platform Economy packages."
                      : "Package config exists, but no package-specific checkout or purchase data was observed in this range."}
                  </div>
                )}
                </div>
              </SectionCard>

              <AdminAnalyticsContentConversionSection
                renderSectionRangeControl={renderSectionRangeControl}
                contentConversionModel={contentConversionModel}
                formatPercent={formatPercent}
                formatDuration={formatDuration}
                formatAbsoluteDateTime={formatAbsoluteDateTime}
              />
            </div>

            <div className="grid min-w-0 gap-4">
              <SectionCard
                title="Top Drop Conversion"
                subtitle="Drops with enough views to evaluate unwrap conversion."
                icon={ShoppingBag}
                density="compact"
                summaryLine={topDropConversionSummaryLine}
                rightSlot={(
                  <div className="flex flex-wrap items-center justify-end gap-2 min-w-0 max-w-full">
                    <AnalyticsViewModeToggle
                      value={topDropConversionViewMode}
                      onChange={setTopDropConversionViewMode}
                      options={[
                        { id: "cards", label: "Cards" },
                        { id: "chart", label: "Chart" },
                        { id: "table", label: "Table" },
                      ]}
                    />
                    {renderSectionRangeControl("topDropConversion")}
                  </div>
                )}
              >
                <div
                  className="space-y-3"
                  data-admin-analytics-mobile-view-mode={topDropConversionViewMode}
                  data-top-drop-conversion-source-truth={topDropConversionModel.sourceTruth}
                  data-top-drop-conversion-freshness={topDropConversionModel.freshnessState}
                  data-top-drop-conversion-generated-at-utc={topDropConversionModel.generatedAtUtc}
                  data-top-drop-conversion-denominator={topDropConversionModel.denominatorLabel}
                  data-top-drop-conversion-page={topDropConversionModel.page}
                  data-top-drop-conversion-page-size={topDropConversionModel.pageSize}
                >
                  <div className="border-b border-border grid gap-2 px-3 py-2 text-xs text-muted-foreground min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
                    <div>
                      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Range</div>
                      <div className="font-semibold text-foreground">{topDropConversionModel.range}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Decision source</div>
                      <div className="font-semibold text-foreground" title={topDropConversionModel.sourceTruth}>
                        {topDropConversionReadableSourceLabel}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Denominator</div>
                      <div className="font-semibold text-foreground">{topDropConversionModel.denominatorLabel}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Last updated</div>
                      <div className="font-semibold text-foreground">{formatAbsoluteDateTime(topDropConversionModel.generatedAtUtc)}</div>
                    </div>
                  </div>

                  <div className="border-b border-border px-3 py-2 text-xs leading-5 text-muted-foreground">
                    <p>{topDropConversionModel.sourceCopy}</p>
                    <p>{topDropConversionModel.denominatorCopy}</p>
                    {topDropConversionModel.warnings.map((warning) => (
                      <p key={warning}>{warning}</p>
                    ))}
                  </div>

                  {topDropConversionModel.chartRows.length > 0 && topDropConversionViewMode === "chart" ? (
                    <div className="border-b border-border px-3 py-2">
                      <div className="h-56 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={topDropConversionModel.chartRows} margin={{ top: 8, right: 0, left: -18, bottom: 0 }}>
                            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                            <XAxis dataKey="chartLabel" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} interval={0} angle={-18} textAnchor="end" height={56} />
                            <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                            <Tooltip
                              content={
                                <AnalyticsTooltip
                                  valueFormatter={(value, name) =>
                                    name === "Unwraps" || name === "Validated views"
                                      ? Number(value).toLocaleString()
                                      : String(value)
                                  }
                                />
                              }
                            />
                            <Bar dataKey="views" name="Validated views" fill="#374151" radius={[8, 8, 0, 0]} />
                            <Bar dataKey="unwraps" name="Unwraps" fill="#b28cff" radius={[8, 8, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-3 grid gap-2 text-xs text-muted-foreground min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
                        {topDropConversionModel.visibleRows.slice(0, 6).map((drop) => (
                          <div key={`chart-legend-${drop.dropId}`} className="border-b border-border flex items-center justify-between gap-2 px-3 py-2">
                            <span className="min-w-0 min-w-0 whitespace-normal wrap-anywhere text-foreground">{drop.dropTitle}</span>
                            <span className="shrink-0 font-semibold text-brand-purple">{drop.unwrapRateDisplay}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {topDropConversionViewMode === "table" ? (
                    <div className="border-b border-border overflow-hidden">
                      <div className="hidden grid-cols-[minmax(0,1.7fr)_0.8fr_0.8fr_0.8fr_0.9fr] gap-2 border-b border-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground @3xl:grid">
                        <div>Drop</div>
                        <div>Views</div>
                        <div>Unwraps</div>
                        <div>Rate</div>
                        <div>State</div>
                      </div>
                      <div className="divide-y divide-white/10">
                        {topDropConversionModel.visibleRows.length > 0 ? (
                          topDropConversionModel.visibleRows.map((drop) => (
                            <div
                              key={`table-${drop.dropId}`}
                              className="grid gap-2 px-3 py-2 text-xs text-muted-foreground @3xl:grid-cols-[minmax(0,1.7fr)_0.8fr_0.8fr_0.8fr_0.9fr]"
                              data-top-drop-conversion-drop-id={drop.dropId}
                              data-top-drop-conversion-identity-state={drop.dropIdentityState}
                              data-top-drop-conversion-views={drop.views}
                              data-top-drop-conversion-unwraps={drop.unwraps}
                              data-top-drop-conversion-rate={drop.unwrapRateDisplay}
                            >
                              <div className="min-w-0">
                                <p className="min-w-0 whitespace-normal wrap-anywhere font-semibold text-foreground">{drop.dropTitle}</p>
                                <p className="min-w-0 whitespace-normal wrap-anywhere text-muted-foreground">{drop.creatorName ? `${drop.creatorName} | ` : ""}{drop.shortDropId}</p>
                              </div>
                              <p><span className="text-muted-foreground @3xl:hidden">Views: </span>{drop.views.toLocaleString()}</p>
                              <p><span className="text-muted-foreground @3xl:hidden">Unwraps: </span>{drop.unwraps.toLocaleString()}</p>
                              <p className="font-semibold text-brand-purple"><span className="text-muted-foreground @3xl:hidden">Rate: </span>{drop.unwrapRateDisplay}</p>
                              <div>
                                <AdminStatusBadge state={resolveAdminAnalyticsTopDropIdentityTruthState(drop.dropIdentityState)} className="max-w-full overflow-visible whitespace-normal wrap-anywhere text-xs" />
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-5 text-sm text-muted-foreground">
                            No drop conversion rows were available for this range.
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}

                  {topDropConversionViewMode === "cards" ? (
                  <div className="space-y-2">
                    <div className="hidden grid-cols-[minmax(0,1.7fr)_0.8fr_0.8fr_0.8fr_0.8fr] gap-2 px-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground @3xl:grid">
                      <div>Drop</div>
                      <div>Views</div>
                      <div>Unwraps</div>
                      <div>Rate</div>
                      <div>State</div>
                    </div>
                    {topDropConversionModel.visibleRows.length > 0 ? (
                      topDropConversionModel.visibleRows.map((drop) => (
                        <div
                          key={drop.dropId}
                          className="border-b border-border px-3 py-3"
                          data-top-drop-conversion-drop-id={drop.dropId}
                          data-top-drop-conversion-identity-state={drop.dropIdentityState}
                          data-top-drop-conversion-views={drop.views}
                          data-top-drop-conversion-unwraps={drop.unwraps}
                          data-top-drop-conversion-rate={drop.unwrapRateDisplay}
                        >
                          <div className="@3xl:hidden">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="min-w-0 whitespace-normal wrap-anywhere text-sm font-semibold text-foreground">{drop.dropTitle}</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {drop.creatorName ? `${drop.creatorName} | ` : ""}{drop.shortDropId}
                                </p>
                              </div>
                              <span className="shrink-0 text-sm font-bold text-brand-purple">{drop.unwrapRateDisplay}</span>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                              <span>{drop.views.toLocaleString()} {topDropConversionModel.denominatorLabel}</span>
                              <span>{drop.unwraps.toLocaleString()} {drop.unwraps === 1 ? "unwrap" : "unwraps"}</span>
                              <span title={drop.sourceTruth}>{formatAdminAnalyticsSourceTruthLabel(drop.sourceTruth)}</span>
                            </div>
                            <p className="mt-2 text-xs leading-5 text-muted-foreground">{drop.explanation}</p>
                          </div>

                          <div className="hidden items-start gap-2 @3xl:grid @3xl:grid-cols-[minmax(0,1.7fr)_0.8fr_0.8fr_0.8fr_0.8fr]">
                            <div className="min-w-0">
                              <p className="min-w-0 whitespace-normal wrap-anywhere text-sm font-semibold text-foreground">{drop.dropTitle}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {drop.creatorName ? `${drop.creatorName} | ` : ""}{drop.shortDropId}
                              </p>
                              <details className="mt-1 text-xs text-muted-foreground">
                                <summary className={buttonVariants({ variant: "ghost", size: "sm", className: "min-w-11 max-w-full justify-start" })}>Identity details</summary>
                                <p>Drop ID: {drop.dropId}</p>
                                <p title={drop.sourceTruth}>
                                  Source: {formatAdminAnalyticsSourceTruthLabel(drop.sourceTruth)}
                                </p>
                                <p>Freshness: {formatAdminAnalyticsSourceStateLabel(drop.freshnessState)}</p>
                              </details>
                            </div>
                            <div className="text-sm font-semibold text-foreground">{drop.views.toLocaleString()}</div>
                            <div className="text-sm font-semibold text-foreground">{drop.unwraps.toLocaleString()}</div>
                            <div className="text-sm font-semibold text-brand-purple">{drop.unwrapRateDisplay}</div>
                            <div>
                              <AdminStatusBadge state={resolveAdminAnalyticsTopDropIdentityTruthState(drop.dropIdentityState)} className="max-w-full overflow-visible whitespace-normal wrap-anywhere text-xs" />
                            </div>
                          </div>
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-brand-purple to-cyan-400"
                              style={{ width: `${Math.min(100, Math.max(4, drop.unwrapRatePct ?? 0))}%` }}
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="border-b border-border px-4 py-5 text-sm text-muted-foreground">
                        No drop conversion rows were available for this range.
                      </div>
                    )}
                  </div>
                  ) : null}

                  <div className="border-b border-border flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs text-muted-foreground min-w-0 max-w-full">
                    <div>
                      Showing {topDropConversionModel.visibleRows.length > 0 ? topDropConversionModel.visibleStart + 1 : 0}-{topDropConversionModel.visibleEnd} of {topDropConversionModel.totalRows} rows
                    </div>
                    <div className="flex items-center gap-2 min-w-0 max-w-full flex-wrap">
                      <NativeSelect
                        value={topDropConversionPageSize}
                        onChange={(event) => {
                          setTopDropConversionPageSize(Number(event.target.value));
                          setTopDropConversionPage(1);
                        }}
                        className="min-w-0 max-w-full"
                        aria-label="Top drop conversion page size"
                      >
                        {[10, 25, 50].map((size) => (
                          <NativeSelectOption key={size} value={size}>{size}</NativeSelectOption>
                        ))}
                      </NativeSelect>
                      <Button
                        type="button"
                        disabled={!topDropConversionModel.hasPreviousPage}
                        onClick={() => setTopDropConversionPage(Math.max(1, topDropConversionPage - 1))}
                        variant="outline" size="sm" className="max-w-full wrap-anywhere"
                      >
                        Prev
                      </Button>
                      <span>Page {topDropConversionModel.page} / {topDropConversionModel.pageCount}</span>
                      <Button
                        type="button"
                        disabled={!topDropConversionModel.hasNextPage}
                        onClick={() => setTopDropConversionPage(topDropConversionPage + 1)}
                        variant="outline" size="sm" className="max-w-full wrap-anywhere"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Recent Commerce Feed"
                subtitle="Recent transactions condensed into one mobile view at a time."
                icon={Wallet}
                rightSlot={
                  <div className="flex flex-wrap items-center justify-end gap-2 min-w-0 max-w-full">
                    <div
                      className="inline-flex min-w-0 max-w-full flex-wrap gap-1"
                      data-recent-commerce-feed-view-mode={recentCommerceFeedViewMode}
                      aria-label="Recent commerce feed view mode"
                    >
                      {RECENT_COMMERCE_FEED_VIEW_MODES.map((option) => {
                        const active = option.id === recentCommerceFeedViewMode;
                        return (
                          <Button
                            key={option.id}
                            type="button"
                            onClick={() => setRecentCommerceFeedViewMode(option.id)}
                            aria-pressed={active}
                            variant={active ? "glass" : "ghost"} size="sm" className="max-w-full wrap-anywhere"
                          >
                            {option.label}
                          </Button>
                        );
                      })}
                    </div>
                    {renderSectionRangeControl("recentCommerceFeed")}
                  </div>
                }
              >
                <div
                  className="w-full max-w-full space-y-3 overflow-x-hidden"
                  data-admin-analytics-mobile-view-mode={recentCommerceFeedViewMode}
                  data-recent-commerce-feed-range={recentCommerceFeedRange}
                  data-recent-commerce-feed-source-state={recentCommerceFeedModel.rows.length > 0 ? "loaded" : "no_sample"}
                  data-recent-commerce-feed-source-truth={recentCommerceFeedModel.sourceTruth}
                  data-recent-commerce-feed-freshness={recentCommerceFeedModel.freshnessState}
                  data-recent-commerce-feed-generated-at-utc={recentCommerceFeedModel.generatedAtUtc}
                  data-recent-commerce-feed-last-transaction-at-utc={recentCommerceFeedModel.lastTransactionAtUtc ?? "none"}
                >
                  <div className="border-b border-border grid min-w-0 max-w-full grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))] gap-3 px-3 py-2 text-sm text-muted-foreground">
                    <div className="min-w-0">
                      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Decision source</div>
                      <div className="min-w-0 wrap-anywhere font-semibold text-foreground" title={recentCommerceFeedModel.sourceTruth}>
                        {recentCommerceFeedReadableSourceLabel}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Freshness</div>
                      <div className="min-w-0 wrap-anywhere font-semibold text-foreground">{formatAdminAnalyticsSourceStateLabel(recentCommerceFeedModel.freshnessState)}</div>
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Last transaction</div>
                      <div className="min-w-0 wrap-anywhere font-semibold text-foreground">{recentCommerceFeedModel.rows[0]?.ageLabel ?? noSnapshotLabel}</div>
                    </div>
                  </div>

                  {recentCommerceFeedModel.rows.length > 0 && recentCommerceFeedViewMode === "table" ? (
                    <div
                      className="rounded-2xl bg-card overflow-x-auto"
                      data-recent-commerce-feed-table="compact"
                      data-recent-commerce-feed-range={recentCommerceFeedRange}
                      data-recent-commerce-feed-source-state={recentCommerceFeedModel.rows.length > 0 ? "loaded" : "no_sample"}
                    >
                      <table className="min-w-full text-left text-xs">
                        <thead className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                          <tr>
                            <th className="px-3 py-2 font-semibold">Transaction</th>
                            <th className="px-3 py-2 font-semibold">Actor</th>
                            <th className="px-3 py-2 font-semibold">Amount</th>
                            <th className="px-3 py-2 font-semibold">Source</th>
                            <th className="px-3 py-2 font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10 text-muted-foreground">
                          {recentCommerceFeedModel.rows.map((item) => (
                            <tr
                              key={`recent-commerce-feed-table-${item.transactionId}`}
                              data-recent-commerce-feed-row
                              data-recent-commerce-feed-created-at-utc={item.createdAtUtc}
                              data-recent-commerce-feed-source-truth={item.sourceTruth}
                              data-recent-commerce-feed-direction={item.direction}
                              data-recent-commerce-feed-source-of-funds={item.sourceOfFunds}
                            >
                              <td className="max-w-[14rem] px-3 py-2">
                                <div className="min-w-0 whitespace-normal wrap-anywhere font-semibold text-foreground">{item.displayTitle}</div>
                                <div className="min-w-0 whitespace-normal wrap-anywhere text-xs text-muted-foreground">{item.transactionId}</div>
                              </td>
                              <td className="max-w-[10rem] min-w-0 whitespace-normal wrap-anywhere px-3 py-2">{item.actorDisplayName}</td>
                              <td
                                className={cn(
                                  "px-3 py-2 font-semibold",
                                  item.direction === "debit" ? "text-rose-300" : item.direction === "credit" ? "text-emerald-300" : "text-muted-foreground",
                                )}
                              >
                                {item.amountDisplay}
                              </td>
                              <td className="max-w-[10rem] px-3 py-2">
                                <div className="min-w-0 whitespace-normal wrap-anywhere text-foreground">{item.sourceLabel}</div>
                                <div className="min-w-0 whitespace-normal wrap-anywhere text-xs text-muted-foreground" title={item.sourceTruth}>
                                  {formatCommerceReadableSourceLabel(formatAdminAnalyticsSourceTruthLabel(item.sourceTruth))}
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                <div className="min-w-0 whitespace-normal wrap-anywhere text-foreground">{item.status}</div>
                                <div className="min-w-0 whitespace-normal wrap-anywhere text-xs text-muted-foreground">{item.ageLabel}</div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}

                  {recentCommerceFeedModel.rows.length > 0 && recentCommerceFeedViewMode === "timeline" ? (
                    <div
                      className="border-b border-border space-y-2 p-3"
                      data-recent-commerce-feed-timeline="compact"
                      data-recent-commerce-feed-range={recentCommerceFeedRange}
                      data-recent-commerce-feed-source-state={recentCommerceFeedModel.rows.length > 0 ? "loaded" : "no_sample"}
                    >
                      {recentCommerceFeedModel.rows.map((item, index) => (
                        <div
                          key={`recent-commerce-feed-timeline-${item.transactionId}`}
                          className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-3"
                          data-recent-commerce-feed-row
                          data-recent-commerce-feed-created-at-utc={item.createdAtUtc}
                          data-recent-commerce-feed-source-truth={item.sourceTruth}
                          data-recent-commerce-feed-direction={item.direction}
                          data-recent-commerce-feed-source-of-funds={item.sourceOfFunds}
                        >
                          <div className="flex flex-col items-center">
                            <span className="mt-1 h-2.5 w-2.5 rounded-full bg-brand-purple" />
                            {index < recentCommerceFeedModel.rows.length - 1 ? (
                              <span className="mt-1 h-full min-h-8 w-px bg-white/10" />
                            ) : null}
                          </div>
                          <div className="min-w-0 pb-2">
                            <p className="min-w-0 whitespace-normal wrap-anywhere text-sm font-semibold text-foreground">{item.displayTitle}</p>
                            <p className="mt-1 min-w-0 whitespace-normal wrap-anywhere text-xs text-muted-foreground">
                              {item.actorDisplayName} | {item.ageLabel} | {item.status}
                            </p>
                            <p className="mt-1 min-w-0 whitespace-normal wrap-anywhere text-xs text-muted-foreground">
                              {item.sourceLabel} | {formatCommerceReadableSourceLabel(formatAdminAnalyticsSourceTruthLabel(item.sourceTruth))}
                            </p>
                          </div>
                          <div className="max-w-[6.75rem] shrink-0 text-right">
                            <p
                              className={cn(
                                "min-w-0 whitespace-normal wrap-anywhere text-sm font-bold",
                                item.direction === "debit" ? "text-rose-300" : item.direction === "credit" ? "text-emerald-300" : "text-muted-foreground",
                              )}
                            >
                              {item.amountDisplay}
                            </p>
                            <p className="mt-1 min-w-0 whitespace-normal wrap-anywhere text-xs uppercase tracking-[0.14em] text-muted-foreground">
                              {formatCommerceFundsLabel(item.sourceOfFunds)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {recentCommerceFeedModel.rows.length > 0 && recentCommerceFeedViewMode === "cards" ? (
                    recentCommerceFeedModel.rows.map((item) => (
                      <div
                        key={item.transactionId}
                        className="border-b border-border box-border w-full max-w-full overflow-hidden px-3 py-3"
                        data-recent-commerce-feed-row
                        data-recent-commerce-feed-created-at-utc={item.createdAtUtc}
                        data-recent-commerce-feed-source-truth={item.sourceTruth}
                        data-recent-commerce-feed-direction={item.direction}
                        data-recent-commerce-feed-source-of-funds={item.sourceOfFunds}
                      >
                        <div className="grid w-full max-w-full grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 overflow-hidden">
                          <div className="border-b border-border relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden">
                            {item.userPhoto ? (
                              <Image
                                src={item.userPhoto}
                                alt={item.username || "User"}
                                fill
                                sizes="44px"
                                className="object-cover"
                              />
                            ) : (
                              <Wallet className="h-4 w-4 text-brand-purple" />
                            )}
                          </div>
                          <div className="min-w-0 overflow-hidden">
                            <p className="line-clamp-2 break-words text-sm font-semibold leading-5 text-foreground">
                              {item.displayTitle}
                            </p>
                            <p className="mt-1 min-w-0 whitespace-normal wrap-anywhere text-xs text-muted-foreground">
                              {item.actorDisplayName} | {item.ageLabel} | {item.status}
                            </p>
                            <div className="mt-2 flex max-w-full flex-wrap gap-1.5 overflow-hidden text-xs font-semibold uppercase tracking-[0.12em]">
                              <span className="max-w-full min-w-0 whitespace-normal wrap-anywhere rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-muted-foreground">
                                {item.sourceLabel}
                              </span>
                              <span className="max-w-full min-w-0 whitespace-normal wrap-anywhere rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-muted-foreground">
                                {formatCommerceReadableSourceLabel(formatAdminAnalyticsSourceTruthLabel(item.sourceTruth))}
                              </span>
                            </div>
                          </div>
                          <div className="max-w-[6.75rem] shrink-0 text-right">
                            <p
                              className={cn(
                                "min-w-0 whitespace-normal wrap-anywhere text-sm font-bold",
                                item.direction === "debit" ? "text-rose-300" : item.direction === "credit" ? "text-emerald-300" : "text-muted-foreground",
                              )}
                            >
                              {item.amountDisplay}
                            </p>
                            <p className="mt-1 min-w-0 whitespace-normal wrap-anywhere text-xs uppercase tracking-[0.14em] text-muted-foreground">
                              {item.status}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="border-b border-border w-full max-w-full overflow-hidden p-5 text-sm text-muted-foreground">
                      No recent commerce feed entries yet.
                    </div>
                  )}
                </div>
              </SectionCard>
            </div>

            <div className="grid min-w-0 gap-4">
              <SectionCard
                title="Library Viewer Drilldown"
                subtitle={
                  viewerDrilldownFilter
                    ? `Viewer playback, watch time, and drop affinity filtered to ${viewerDrilldownFilter.startsWith("@") ? viewerDrilldownFilter : `@${viewerDrilldownFilter}`}.`
                    : "Overall library viewer performance across watch time, repeat sessions, asset completion, and top drops."
                }
                icon={Eye}
                rightSlot={
                  <div className="flex flex-wrap items-center gap-2">
                    {renderSectionRangeControl("viewerDrilldown")}
                    {viewerDrilldownFilter ? (
                      <span className="rounded-full border border-brand-purple/25 bg-brand-purple/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-brand-purple">
                        Filtered
                      </span>
                    ) : null}
                  </div>
                }
              >
                {(() => {
                  const viewerOverview = viewerDrilldownOverview;

                  return (
                    <div className="space-y-4">
                      <div className="border-b border-border p-4">
                        <div className="flex min-w-0 flex-wrap items-end gap-3 max-w-full">
                          <label className="min-w-0 max-w-full flex-[1_1_12rem]">
                            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                              Filter by username or UID
                            </span>
                            <Input
                              type="text"
                              value={viewerUserDraft}
                              onChange={(event: any) =>
                                setViewerUserDraft(event.target.value)
                              }
                              onKeyDown={(event: any) => {
                                if (event.key === "Enter") {
                                  applyViewerFilter();
                                }
                              }}
                              placeholder="codexkdqa or user uid"
                              className="min-w-0 max-w-full"
                            />
                          </label>
                          <div className="flex min-w-0 max-w-full flex-wrap gap-2">
                            <Button
                              type="button"
                              onClick={applyViewerFilter}
                              variant="brand" size="sm" className="max-w-full wrap-anywhere"
                            >
                              Apply filter
                            </Button>
                            <Button
                              type="button"
                              onClick={clearViewerFilter}
                              variant="outline" size="sm" className="max-w-full wrap-anywhere"
                            >
                              Overall
                            </Button>
                          </div>
                        </div>

                        {viewerDrilldownUsers.length > 0 ? (
                          <div className="mt-4 flex min-w-0 flex-wrap gap-2 max-w-full">
                            {viewerDrilldownUsers.map((item: any) => (
                              <Button
                                key={item.uid}
                                type="button"
                                onClick={() => {
                                  setViewerUserDraft(item.username);
                                  setViewerUserFilter(item.username);
                                }}
                                variant={viewerDrilldownFilter && item.username === viewerDrilldownFilter ? "glass" : "outline"} size="sm" className="max-w-full wrap-anywhere"
                              >
                                <span className="font-semibold">
                                  {item.username.startsWith("@")
                                    ? item.username
                                    : `@${item.username}`}
                                </span>
                                <span className="mx-1 text-muted-foreground">·</span>
                                <span className="text-muted-foreground">
                                  {item.sessionCount.toLocaleString()} sessions
                                </span>
                              </Button>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <div
                        className="border-b border-border grid gap-2 px-3 py-2 text-xs text-muted-foreground min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]"
                        data-library-viewer-source-truth={viewerSourceTruth}
                        data-library-viewer-freshness={viewerFreshnessState}
                        data-library-viewer-generated-at-utc={viewerDrilldownGeneratedAtMs ? new Date(viewerDrilldownGeneratedAtMs).toISOString() : ""}
                        data-library-viewer-last-session-at-utc={viewerDrilldownCaptureHealth.lastSeenAtMs ? new Date(viewerDrilldownCaptureHealth.lastSeenAtMs).toISOString() : ""}
                      >
                        <div>
                          <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Range</div>
                          <div className="font-semibold text-foreground">{String(viewerDrilldownRange).toUpperCase()}</div>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Watch source</div>
                          <div className="font-semibold text-foreground">{viewerSourceLabel}</div>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Last viewer session</div>
                          <div className="font-semibold text-foreground">{viewerLastSessionLabel}</div>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Generated</div>
                          <div className="font-semibold text-foreground">{viewerDrilldownGeneratedAtLabel}</div>
                        </div>
                      </div>

                      {viewerPanelWarnings.length > 0 ? (
                        <div className="rounded-[1rem] border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-100">
                          {viewerPanelWarnings.join(" ")}
                        </div>
                      ) : null}

                      <div className="grid gap-3 min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
                        <MetricCard
                          label="Views"
                          value={formatCompactNumber(
                            viewerDrilldownOverview.viewCount,
                          )}
                          hint="Viewer opens"
                          icon={Eye}
                        />
                        <MetricCard
                          label="Sessions"
                          value={formatCompactNumber(
                            viewerDrilldownOverview.sessionCount,
                          )}
                          hint={[
                            `${viewerDrilldownOverview.repeatSessionCount.toLocaleString()} repeat`,
                            `${viewerDrilldownOverview.returnSessionCount.toLocaleString()} same-viewer`,
                          ].join(" | ")}
                          icon={PlayCircle}
                        />
                        <MetricCard
                          label="Unique Viewers"
                          value={formatCompactNumber(
                            viewerDrilldownOverview.uniqueViewerCount,
                          )}
                          hint="Distinct collectors in filter"
                          icon={Users}
                        />
                        <MetricCard
                          label="Total Watch"
                          value={formatDuration(totalViewerWatchSeconds)}
                          hint={`Verified ${formatDuration(verifiedWatchSeconds)}; estimated ${formatDuration(estimatedWatchSeconds)}; ${avgWatchDenominator}`}
                          icon={Clock3}
                        />
                        <MetricCard
                          label="Meaningful"
                          value={formatCompactNumber(
                            viewerDrilldownOverview.meaningfulSessionCount,
                          )}
                          hint={[
                            `${viewerDrilldownOverview.convertedSessionCount.toLocaleString()} conversions`,
                            `${viewerDrilldownOverview.completedSessionCount.toLocaleString()} completed`,
                          ].join(" | ")}
                          icon={CheckCircle2}
                        />
                        <MetricCard
                          label="Completion"
                          value={formatPercent(
                            viewerOverview.assetCompletionRate,
                          )}
                          hint={`${viewerOverview.downloads.toLocaleString()} downloads; ${viewerOverview.relatedClicks.toLocaleString()} next clicks`}
                          icon={CheckCircle2}
                        />
                        <MetricCard
                          label="Opened, No Depth"
                          value={formatCompactNumber(
                            viewerOverview.openedWithoutDepthCount,
                          )}
                          hint="Viewer opened but did not reach 10s watch, asset consumed, or completion"
                          icon={Funnel}
                        />
                        <MetricCard
                          label="Early Exits"
                          value={formatCompactNumber(
                            viewerOverview.bounceSessionCount,
                          )}
                          hint={earlyExitFormula}
                          icon={AlertTriangle}
                        />
                      </div>

                      <div className="grid gap-4 min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
                        <div className="border-b border-border p-4">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                Watch capture health
                              </p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                Viewer-session capture quality, including
                                delayed sync, replay recovery, and close-path
                                misses.
                              </p>
                            </div>
                            <span
                              className={cn(
                                "rounded-full border px-3 py-1 text-xs font-semibold",
                                viewerDrilldownCaptureHealth.closeMissingCount >
                                  0
                                  ? "border-red-400/25 bg-red-500/10 text-red-200"
                                  : viewerDrilldownCaptureHealth
                                        .degradedSessionCount > 0
                                    ? "border-amber-400/25 bg-amber-500/10 text-amber-100"
                                    : "border-emerald-400/25 bg-emerald-500/10 text-emerald-100",
                              )}
                            >
                              {viewerDrilldownCaptureHealth.sessionCount > 0
                                ? `${formatPercent(
                                    1 -
                                      viewerDrilldownCaptureHealth.degradedRate,
                                  )} full`
                                : "No sessions"}
                            </span>
                          </div>

                          <div className="grid gap-3 min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
                            <MetricCard
                              label="Delayed"
                              value={formatCompactNumber(
                                viewerDrilldownCaptureHealth.degradedSessionCount,
                              )}
                              hint={`${viewerDrilldownCaptureHealth.replayRecoveredCount.toLocaleString()} replay recovered`}
                              icon={AlertTriangle}
                            />
                            <MetricCard
                              label="Close Missing"
                              value={formatCompactNumber(
                                viewerDrilldownCaptureHealth.closeMissingCount,
                              )}
                              hint={`${viewerDrilldownCaptureHealth.flushDegradedCount.toLocaleString()} delayed flushes`}
                              icon={Activity}
                            />
                            <MetricCard
                              label="Avg Wait"
                              value={formatDuration(
                                viewerDrilldownCaptureHealth.averageWaitSeconds,
                              )}
                              hint={`${viewerDrilldownCaptureHealth.averageSeekCount.toFixed(
                                1,
                              )} seeks / session`}
                              icon={Clock3}
                            />
                            <MetricCard
                              label="Avg Gap"
                              value={
                                viewerDrilldownCaptureHealth.averageGapMs > 0
                                  ? `${viewerDrilldownCaptureHealth.averageGapMs}ms`
                                  : "0ms"
                              }
                              hint={`${viewerDrilldownCaptureHealth.mutedSessionCount.toLocaleString()} muted sessions`}
                              icon={Route}
                            />
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                            {viewerDrilldownCaptureHealth.transportBreakdown.map(
                              (item: any) => (
                                <span
                                  key={item.transport}
                                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1"
                                >
                                  {item.transport.replace(/_/g, " ")} ·{" "}
                                  {item.count.toLocaleString()}
                                </span>
                              ),
                            )}
                            {viewerDrilldownCaptureHealth.averagePlaybackRate >
                            0 ? (
                              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                                Avg playback ·{" "}
                                {viewerDrilldownCaptureHealth.averagePlaybackRate.toFixed(
                                  2,
                                )}
                                x
                              </span>
                            ) : null}
                            {viewerDrilldownCaptureHealth.lastSeenAtMs > 0 ? (
                              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                                Last session ·{" "}
                                {formatRelativeTime(
                                  viewerDrilldownCaptureHealth.lastSeenAtMs,
                                  nowMs,
                                )}
                              </span>
                            ) : null}
                          </div>

                          <div className="border-b border-border mt-4 px-3 py-2 text-xs leading-5 text-muted-foreground">
                            {captureHealthExplanation} Transport counts use watch-session captureTransport; unknown transport is a source quality issue, not zero traffic.
                          </div>

                          {viewerDrilldownCaptureHealth.warnings.length > 0 ? (
                            <div className="mt-4 space-y-2">
                              {viewerDrilldownCaptureHealth.warnings.map(
                                (warning: any) => (
                                  <div
                                    key={warning}
                                    className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100"
                                  >
                                    {warning}
                                  </div>
                                ),
                              )}
                            </div>
                          ) : null}
                        </div>

                        <div className="border-b border-border p-4">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                Live capture pulse
                              </p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                Recent-session continuity signal, kept separate
                                from the broader historical range.
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={cn(
                                  "rounded-full border px-3 py-1 text-xs font-semibold",
                                  viewerCapturePulseState === "live"
                                    ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-100"
                                    : viewerCapturePulseState === "stale"
                                      ? "border-amber-400/25 bg-amber-500/10 text-amber-100"
                                      : "border-cyan-400/25 bg-cyan-500/10 text-cyan-100",
                                )}
                                data-library-viewer-live-pulse-state={viewerCapturePulseState}
                              >
                                {viewerCapturePulseBadgeLabel}
                              </span>
                              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-muted-foreground">
                                {liveWatchCaptureHealth.sessionCount <= 0 ? "0" : liveWatchCaptureHealth.sessionCount.toLocaleString()}{" "}
                                recent
                              </span>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="border-b border-border px-3 py-2 text-xs leading-5 text-muted-foreground">
                              {viewerCapturePulseExplanation}
                              {liveWatchCaptureHealth.lastSeenAtMs > 0
                                ? ` Last recent viewer session: ${formatRelativeTime(liveWatchCaptureHealth.lastSeenAtMs, nowMs)}.`
                                : " Last recent viewer session: none."}
                            </div>
                            {[
                              {
                                label: "Full capture",
                                value: liveCaptureTruthState === "unavailable" ? null : liveWatchCaptureHealth.fullCaptureCount,
                              },
                              {
                                label: "Replay recovered",
                                value:
                                  liveCaptureTruthState === "unavailable" ? null : liveWatchCaptureHealth.replayRecoveredCount,
                              },
                              {
                                label: "Gap detected",
                                value: liveCaptureTruthState === "unavailable" ? null : liveWatchCaptureHealth.gapDetectedCount,
                              },
                              {
                                label: "Close missing",
                                value: liveCaptureTruthState === "unavailable" ? null : liveWatchCaptureHealth.closeMissingCount,
                              },
                            ].map((item: any) => (
                              <div key={item.label}>
                                <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                                  <span className="text-foreground">
                                    {item.label}
                                  </span>
                                  <span className="font-semibold text-brand-purple">
                                    {item.value === null ? noSampleLabel : item.value.toLocaleString()}
                                  </span>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                                  <div
                                    className="h-full rounded-full bg-gradient-to-r from-brand-purple to-cyan-400"
                                    style={{
                                      width: `${Math.max(
                                        6,
                                        ((item.value | 0) /
                                          Math.max(
                                            1,
                                            liveWatchCaptureHealth
                                              .sessionCount || 1,
                                          )) *
                                          100,
                                      )}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-4 min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
                        <div className="border-b border-border p-4">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                Top user journeys
                              </p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                Which identities are looping through the viewer,
                                and whether they actually stay long enough to
                                matter.
                              </p>
                            </div>
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-muted-foreground">
                              {viewerUserJourneyRows.length} tracked
                            </span>
                          </div>
                          <div className="space-y-3">
                            {viewerUserJourneyRows.length > 0 ? (
                              viewerUserJourneyRows.map((item: any) => (
                                <div
                                  key={item.uid}
                                  className="border-b border-border p-3"
                                  data-library-viewer-user-session-count={item.sessionCount}
                                  data-library-viewer-user-last-session-at-utc={item.lastSeenAtMs ? new Date(item.lastSeenAtMs).toISOString() : ""}
                                >
                                  <div className="mb-2 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="min-w-0 whitespace-normal wrap-anywhere text-sm font-semibold text-foreground">
                                        {item.displayName}
                                      </p>
                                      <p className="mt-1 text-xs text-muted-foreground">
                                        /dashboard/viewer; {item.sessionCount.toLocaleString()} sessions
                                      </p>
                                    </div>
                                    <span className="text-sm font-bold text-brand-purple">
                                      {formatDuration(item.totalWatchSeconds)}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                      Member
                                    </span>
                                    <span
                                      className={cn(
                                        "rounded-full border px-2 py-1 text-xs font-semibold uppercase tracking-[0.14em]",
                                        getJourneyStateClasses(
                                          item.totalWatchSeconds >= 10 ? "engaged" : "bounced",
                                        ),
                                      )}
                                    >
                                      {item.totalWatchSeconds >= 10 ? "Engaged" : "Shallow"}
                                    </span>
                                    <span>
                                      {formatDuration(item.totalWatchSeconds)} verified watch
                                    </span>
                                    <span>
                                      {item.lastSeenAtMs ? formatRelativeTime(item.lastSeenAtMs, nowMs) : "No viewer session yet"}
                                    </span>
                                    <span>{formatAdminAnalyticsSourceStateLabel(item.freshnessState)}</span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="border-b border-border p-4 text-sm text-muted-foreground">
                                User-level viewer journeys will appear as soon
                                as verified watch sessions and telemetry
                                overlap in this range.
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="border-b border-border p-4">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                Experience context
                              </p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                Drops and experience surfaces ranked by combined
                                activity, watch depth, and unwrap/asset signals.
                              </p>
                            </div>
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-muted-foreground">
                              {topExperienceContexts.length} experiences
                            </span>
                          </div>
                          <div className="space-y-3">
                            {topExperienceContexts.length > 0 ? (
                              topExperienceContexts.map((item: any) => (
                                <div
                                  key={item.key}
                                  className="border-b border-border p-3"
                                >
                                  <div className="mb-2 flex items-center justify-between gap-3">
                                    <p className="min-w-0 whitespace-normal wrap-anywhere text-sm font-semibold text-foreground">
                                      {item.label}
                                    </p>
                                    <span className="text-sm font-bold text-cyan-300">
                                      {formatDuration(item.watchSeconds)}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                    <span>
                                      {item.eventCount.toLocaleString()} telemetry signals
                                    </span>
                                    <span>
                                      {item.uniqueUsers.toLocaleString()} users
                                    </span>
                                    <span>
                                      {item.conversionCount.toLocaleString()} unwrap/asset-consumed signals
                                    </span>
                                    <span>
                                      Source: event facts plus viewer/drop context; not a purchase-only unwrap total
                                    </span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="border-b border-border p-4 text-sm text-muted-foreground">
                                Experience context will fill in once drop-level
                                watch sessions or interaction traces land for
                                the chosen period.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div
                        className="border-b border-border space-y-3 p-3 sm:p-4"
                        data-admin-analytics-mobile-view-mode={viewerDropViewMode}
                      >
                        <div className="border-b border-border p-4">
                          <div className="mb-4 flex items-center justify-between gap-3 min-w-0 max-w-full flex-wrap">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                Top viewed drops by watch time
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                Page {boundedViewerDropPage} of {viewerDropPageCount}; source {viewerSourceLabel}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center justify-end gap-2 min-w-0 max-w-full">
                              <AnalyticsViewModeToggle
                                value={viewerDropViewMode}
                                onChange={setViewerDropViewMode}
                                options={[
                                  { id: "cards", label: "Cards" },
                                  { id: "chart", label: "Chart" },
                                  { id: "table", label: "Table" },
                                ]}
                              />
                              <Button
                                type="button"
                                onClick={() => setViewerDropPage((page) => Math.max(1, page - 1))}
                                disabled={boundedViewerDropPage <= 1}
                                variant="outline" size="sm" className="max-w-full wrap-anywhere"
                              >
                                Prev
                              </Button>
                              <Button
                                type="button"
                                onClick={() => setViewerDropPage((page) => Math.min(viewerDropPageCount, page + 1))}
                                disabled={boundedViewerDropPage >= viewerDropPageCount}
                                variant="outline" size="sm" className="max-w-full wrap-anywhere"
                              >
                                Next
                              </Button>
                            </div>
                          </div>
                          {viewerDropVisibleChartData.length > 0 && viewerDropViewMode === "chart" ? (
                            <div className="h-72 w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                  data={viewerDropVisibleChartData}
                                  margin={{
                                    top: 8,
                                    right: 6,
                                    left: -18,
                                    bottom: 16,
                                  }}
                                >
                                  <CartesianGrid
                                    stroke="rgba(255,255,255,0.06)"
                                    vertical={false}
                                  />
                                  <XAxis
                                    dataKey="shortLabel"
                                    stroke="#6b7280"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    interval={0}
                                    angle={-16}
                                    textAnchor="end"
                                    height={56}
                                  />
                                  <YAxis
                                    stroke="#6b7280"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                  />
                                  <Tooltip
                                    content={
                                      <AnalyticsTooltip
                                        valueFormatter={(value, name) => {
                                          if (name === "Watch") {
                                            return formatDuration(
                                              Number(value),
                                            );
                                          }
                                          return `${value}`;
                                        }}
                                      />
                                    }
                                  />
                                  <Bar
                                    dataKey="totalWatchSeconds"
                                    name="Watch"
                                    fill="#b28cff"
                                    radius={[10, 10, 0, 0]}
                                  />
                                  <Bar
                                    dataKey="sessionCount"
                                    name="Sessions"
                                    fill="#22d3ee"
                                    radius={[10, 10, 0, 0]}
                                  />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          ) : viewerDropVisibleRows.length === 0 ? (
                            <div className="border-b border-border p-5 text-sm text-muted-foreground">
                              Viewer drilldown data will populate once
                              collectors start watching library content in the
                              selected range.
                            </div>
                          ) : null}
                        </div>

                        {viewerDropViewMode === "table" && viewerDropVisibleRows.length > 0 ? (
                          <div
                            className="rounded-2xl bg-card overflow-x-auto"
                            data-library-viewer-drop-table="compact"
                            data-library-viewer-drop-source-truth={viewerSourceTruth}
                            data-library-viewer-drop-freshness={viewerFreshnessState}
                          >
                            <table className="min-w-full text-left text-xs">
                              <thead className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                                <tr>
                                  <th className="px-3 py-2 font-semibold">Drop</th>
                                  <th className="px-3 py-2 font-semibold">Watch</th>
                                  <th className="px-3 py-2 font-semibold">Sessions</th>
                                  <th className="px-3 py-2 font-semibold">Viewers</th>
                                  <th className="px-3 py-2 font-semibold">Meaningful</th>
                                  <th className="px-3 py-2 font-semibold">State</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/10 text-muted-foreground">
                                {viewerDropVisibleRows.map((item: any) => (
                                  <tr
                                    key={`viewer-drop-table-${item.dropId}`}
                                    data-library-viewer-drop-source-truth={viewerSourceTruth}
                                    data-library-viewer-drop-freshness={viewerFreshnessState}
                                  >
                                    <td className="max-w-[14rem] min-w-0 whitespace-normal wrap-anywhere px-3 py-2 font-semibold text-foreground">{item.dropTitle}</td>
                                    <td className="px-3 py-2 text-brand-purple">{formatDuration(item.totalWatchSeconds)}</td>
                                    <td className="px-3 py-2">{item.sessionCount.toLocaleString()}</td>
                                    <td className="px-3 py-2">{item.uniqueViewerCount.toLocaleString()}</td>
                                    <td className="px-3 py-2">{item.meaningfulSessionCount.toLocaleString()}</td>
                                    <td className="px-3 py-2">{item.openedWithoutDepthCount > 0 ? "Needs depth" : "Depth observed"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : null}

                        {viewerDropViewMode === "cards" ? (
                          <div className="grid gap-2 min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
                          {viewerDropVisibleRows.map((item: any) => (
                            <div
                              key={item.dropId}
                              className="border-b border-border p-3"
                              data-library-viewer-drop-source-truth={viewerSourceTruth}
                              data-library-viewer-drop-freshness={viewerFreshnessState}
                            >
                              <div className="mb-3 flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="min-w-0 whitespace-normal wrap-anywhere text-sm font-semibold text-foreground">
                                    {item.dropTitle}
                                  </p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {item.sessionCount.toLocaleString()}{" "}
                                    sessions ·{" "}
                                    {item.uniqueViewerCount.toLocaleString()}{" "}
                                    viewers
                                  </p>
                                </div>
                                <span className="shrink-0 rounded-full border border-brand-purple/25 bg-brand-purple/12 px-3 py-1 text-xs font-semibold text-brand-purple">
                                  {formatDuration(item.totalWatchSeconds)}
                                </span>
                              </div>
                              <div className="grid gap-2 text-xs min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
                                <div className="border-b border-border px-3 py-2 text-muted-foreground">
                                  Meaningful
                                  <span className="block text-xs text-muted-foreground">&gt;=10s watch or asset consumed</span>
                                  <br />
                                  {item.meaningfulSessionCount}
                                </div>
                                <div className="border-b border-border px-3 py-2 text-muted-foreground">
                                  Opened no depth
                                  <span className="block text-xs text-muted-foreground">open without meaningful depth</span>
                                  <br />
                                  {item.openedWithoutDepthCount}
                                </div>
                                <div className="border-b border-border px-3 py-2 text-muted-foreground">
                                  Returns
                                  <span className="block text-xs text-muted-foreground">same viewer repeat sessions</span>
                                  <br />
                                  {item.returnSessionCount}
                                </div>
                                <div className="border-b border-border px-3 py-2 text-brand-purple">
                                  Avg load
                                  <span className="block text-xs text-brand-purple/70">watch-session load samples</span>
                                  <br />
                                  {item.avgLoadMs > 0
                                    ? `${item.avgLoadMs}ms`
                                    : "n/a"}
                                </div>
                              </div>
                            </div>
                          ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })()}
              </SectionCard>

              <AdminAnalyticsViewerJourneySection
                renderSectionRangeControl={renderSectionRangeControl}
                viewerJourneyItems={viewerJourneyDisplayItems}
                viewerJourneyRange={viewerJourneyRange}
              />

              <SectionCard
                title="Watch Depth + Tags"
                subtitle="What people watch after unwrap, plus the tags driving demand."
                icon={Eye}
                rightSlot={
                  <div className="flex flex-wrap items-center justify-end gap-2 min-w-0 max-w-full">
                    <AnalyticsViewModeToggle
                      value={watchDepthTagsViewMode}
                      onChange={setWatchDepthTagsViewMode}
                      options={[
                        { id: "cards", label: "Cards" },
                        { id: "chart", label: "Chart" },
                        { id: "table", label: "Table" },
                      ]}
                    />
                    {renderSectionRangeControl("watchDepthTags")}
                  </div>
                }
              >
                <div
                  className="space-y-3"
                  data-admin-analytics-mobile-view-mode={watchDepthTagsViewMode}
                  data-watch-depth-tags-range={watchDepthTagsRange}
                  data-watch-depth-tags-source-state={watchDepthTagBuckets.length > 0 || watchDepthTagDemand.length > 0 ? "loaded" : "no_sample"}
                >
                  {(watchDepthTagBuckets.some((bucket: any) => bucket.count > 0) || watchDepthTagDemand.length > 0) && watchDepthTagsViewMode === "chart" ? (
                    <div className="grid gap-3 min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
                      <div className="rounded-2xl bg-card h-64 p-3">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={watchDepthChartRows} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                            <XAxis
                              dataKey="shortLabel"
                              stroke="#6b7280"
                              fontSize={10}
                              tickLine={false}
                              axisLine={false}
                              interval={0}
                              angle={-16}
                              textAnchor="end"
                              height={52}
                            />
                            <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                            <Tooltip content={<AnalyticsTooltip />} />
                            <Bar dataKey="count" name="Depth events" fill="#b28cff" radius={[10, 10, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="border-b border-border p-3">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Top tags</p>
                        <div className="flex flex-wrap gap-2">
                          {watchTagVisibleRows.length > 0 ? (
                            watchTagVisibleRows.map((item: any) => (
                              <span key={`watch-tag-chart-${item.tag}`} className="rounded-full border border-brand-purple/25 bg-brand-purple/12 px-3 py-2 text-xs font-semibold text-foreground">
                                {item.tag}; {item.count.toLocaleString()}
                              </span>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground">Tag demand will populate after more unwraps land in this range.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {(watchDepthTagBuckets.length > 0 || watchDepthTagDemand.length > 0) && watchDepthTagsViewMode === "table" ? (
                    <div
                      className="rounded-2xl bg-card overflow-x-auto"
                      data-watch-depth-tags-table="compact"
                      data-watch-depth-tags-range={watchDepthTagsRange}
                      data-watch-depth-tags-source-state={watchDepthTagBuckets.length > 0 || watchDepthTagDemand.length > 0 ? "loaded" : "no_sample"}
                    >
                      <table className="min-w-full text-left text-xs">
                        <thead className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                          <tr>
                            <th className="px-3 py-2 font-semibold">Type</th>
                            <th className="px-3 py-2 font-semibold">Label</th>
                            <th className="px-3 py-2 font-semibold">Count</th>
                            <th className="px-3 py-2 font-semibold">Range</th>
                            <th className="px-3 py-2 font-semibold">State</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10 text-muted-foreground">
                          {watchDepthTagBuckets.map((bucket: any) => (
                            <tr key={`watch-depth-table-${bucket.label}`}>
                              <td className="px-3 py-2 text-muted-foreground">Depth</td>
                              <td className="max-w-[14rem] min-w-0 whitespace-normal wrap-anywhere px-3 py-2 font-semibold text-foreground">{bucket.label}</td>
                              <td className="px-3 py-2 text-brand-purple">{bucket.count.toLocaleString()}</td>
                              <td className="px-3 py-2">{watchDepthTagsRange}</td>
                              <td className="px-3 py-2">{bucket.count > 0 ? "Observed" : "No sample"}</td>
                            </tr>
                          ))}
                          {watchTagVisibleRows.map((item: any) => (
                            <tr key={`watch-tag-table-${item.tag}`}>
                              <td className="px-3 py-2 text-muted-foreground">Tag</td>
                              <td className="max-w-[14rem] min-w-0 whitespace-normal wrap-anywhere px-3 py-2 font-semibold text-foreground">{item.tag}</td>
                              <td className="px-3 py-2 text-brand-purple">{item.count.toLocaleString()}</td>
                              <td className="px-3 py-2">{watchDepthTagsRange}</td>
                              <td className="px-3 py-2">{item.count > 0 ? "Observed" : "No sample"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}

                  {(watchDepthTagBuckets.length > 0 || watchDepthTagDemand.length > 0) && watchDepthTagsViewMode === "cards" ? (
                    <div className="grid gap-3 min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
                      <div className="border-b border-border p-3">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Watch depth</p>
                        <div className="space-y-2">
                          {watchDepthTagBuckets.map((bucket: any) => (
                            <div key={`watch-depth-card-${bucket.label}`} className="border-b border-border px-3 py-2">
                              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                                <span className="min-w-0 whitespace-normal wrap-anywhere text-foreground">{bucket.label}</span>
                                <span className="font-semibold text-brand-purple">{bucket.count.toLocaleString()}</span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-brand-purple to-cyan-400"
                                  style={{ width: `${Math.max(6, (bucket.count / watchDepthMaxCount) * 100)}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="border-b border-border p-3">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Top tags</p>
                        <div className="flex flex-wrap gap-2">
                          {watchTagVisibleRows.length > 0 ? (
                            watchTagVisibleRows.map((item: any) => (
                              <span key={`watch-tag-card-${item.tag}`} className="rounded-full border border-brand-purple/25 bg-brand-purple/12 px-3 py-2 text-xs font-semibold text-foreground">
                                {item.tag}; {item.count.toLocaleString()}
                              </span>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground">Tag demand will populate after more unwraps land in this range.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {watchDepthTagBuckets.length === 0 && watchDepthTagDemand.length === 0 ? (
                    <div className="border-b border-border p-5 text-sm text-muted-foreground">
                      No watch-depth or tag-demand rows were returned in this window.
                    </div>
                  ) : null}
                </div>
              </SectionCard>
            </div>
    </>
  );
}
