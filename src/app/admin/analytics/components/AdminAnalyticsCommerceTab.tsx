import React from "react";
import {
  Activity, AlertTriangle, Candy, CheckCircle2, Clock3, DollarSign, Eye, Funnel, PlayCircle, Route, ShoppingBag, Sparkles, Users, Wallet,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, LineChart } from "recharts";
import { AnalyticsTooltip, MetricCard, SectionCard } from "@/components/Admin/Analytics/AdminAnalyticsPrimitives";
import { AdminStatusBadge } from "@/components/Admin/AdminStatusBadge";
import { coerceAdminSurfaceState } from "@/lib/admin-parity";
import { cn } from "@/lib/utils";
import Image from "next/image";
import type { AdminAnalyticsState } from "../hooks/useAdminAnalyticsState";

export function AdminAnalyticsCommerceTab(props: AdminAnalyticsState) {
  const {
    renderSectionRangeControl, liveResponse, historicalResponse, liveLoading, historicalLoading, nowMs, EVENT_LABELS,
    liveSurfaceMix, liveActiveUsers, livePulseOnboardingStats, livePulseOnboardingStartCount, livePulseOnboardingCompletionRate, livePulseFunnel, liveSeries,
    journeyFunnelMetrics,
    authOutcomeHasData, authOutcomeChartItems, authOutcomeTotals,
    authOnboardingDiscrepancies, onboardingVelocityHasData, onboardingVelocityBuckets, onboardingVelocityStartCount, onboardingVelocityCompletionCount, onboardingVelocityCompletionRate, onboardingVelocityDropOffCount, onboardingVelocityStats, onboardingVelocityStartSourceHint, onboardingStepFlowItems,
    formatCompactNumber, formatDuration, formatPercent, formatRelativeTime,
    guestBounceQualityCards, guestBounceGlobalSemantics, guestBounceGuestRate, guestBounceEngagedRate, guestBounceIdentifiedRate, guestBounceUserSemantics,
    topEvents,
    
    // Audience Tab
    totalDeviceUsers, mobileUsers, mobileShare, audienceSnapshotRange, semanticQualityCards, guestBounceRate, identifiedBounceRate, guestEngagedRate,
    returnCadenceSegments,
    navigationDestinationsRange, destinationMix,
    deviceMixRange, devices, getDeviceIcon,
    topPathsRange, pages,
    regionsRange, geo,

    // Commerce Tab
    commerceSnapshotRange, commerceSnapshotCommerce, commerceSnapshotFunnel, commerceSnapshotModel,
    packagePerformanceRange, packagePerformanceItems, packagePerformancePanelState,
    contentConversionModel,
    contentConversionRange,
    topDropConversionRange, topDropConversionModel, topDropConversionPage, setTopDropConversionPage, topDropConversionPageSize, setTopDropConversionPageSize,
    recentCommerceFeedItems, describeEvent, formatAbsoluteDateTime,
    
    // Viewer drilldown
    viewerDrilldownFilter, viewerDrilldownOverview, viewerUserDraft, setViewerUserDraft, applyViewerFilter,
    clearViewerFilter, viewerDrilldownUsers, setViewerUserFilter, viewerDrilldownCaptureHealth,
    liveWatchCaptureHealth, viewerDrilldownJourneys,
    
    // Added remaining
    clearAllFilters, formatMoney, activeViewerFilter, viewerUserFilter,
    getJourneyStateClasses, getJourneyStateLabel, topExperienceContexts, viewerDropChartData,
    viewerDrilldownInsights, viewerJourneyItems, watchDepthTagBuckets, watchDepthTagDemand
  } = props;
  const liveCaptureTruthState = liveResponse?.liveTruthLabel
    ? coerceAdminSurfaceState(liveResponse.liveTruthLabel)
    : liveLoading ? "loading" : "unavailable";
  const formatCommerceValue = (
    value: number | null,
    formatter: (next: number) => string,
    waitingLabel = "No verified snapshot yet",
  ) => (typeof value === "number" && Number.isFinite(value) ? formatter(value) : waitingLabel);
  const commerceBadgeLabel = commerceSnapshotModel.cacheState === "live"
    ? "LIVE"
    : commerceSnapshotModel.cacheState === "delayed"
      ? "DELAYED"
      : commerceSnapshotModel.cacheState === "partial"
        ? "REVIEW"
        : commerceSnapshotModel.cacheState === "stale"
          ? "DELAYED"
          : commerceSnapshotModel.refreshStatus === "running" && !commerceSnapshotModel.serverConfirmed
            ? "WAIT"
            : "ERROR";
  const compactMetricClass = "rounded-[1rem] p-2";
  const compactMetricValueClass = "text-lg leading-6 md:text-xl";
  const commerceConversionLabel =
    commerceSnapshotModel.checkoutConversionValue !== null
      ? formatPercent(commerceSnapshotModel.checkoutConversionValue)
      : "Unavailable";
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
  const commerceGeneratedAtLabel = commerceSnapshotModel.generatedAtUtc
    ? formatAbsoluteDateTime(Date.parse(commerceSnapshotModel.generatedAtUtc))
    : "Unknown";
  const commerceConversionFooter = commerceSnapshotModel.checkoutConversionWarning
    ? commerceSnapshotModel.checkoutConversionWarning
    : `Checkout conversion: completed purchases / checkout starts = ${commerceConversionLabel}`;
  const [contentConversionGrouping, setContentConversionGrouping] = React.useState<"contentType" | "flavor" | "creator" | "priceBand">("contentType");
  const contentConversionRows = contentConversionModel.rowsByDimension[contentConversionGrouping] ?? [];
  const contentConversionVisibleRows = contentConversionRows.slice(0, 8);

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
              subtitle="Money in, completed purchases, GD spend, and funnel health."
              icon={DollarSign}
              defaultExpanded
              rightSlot={renderSectionRangeControl("commerceSnapshot")}
            >
              <div className="mb-2.5 rounded-[1rem] border border-white/10 bg-white/[0.035] px-3 py-2 text-[11px] leading-5 text-gray-300">
                {commerceSnapshotModel.visibleCopy.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>

              <div className="mb-2 grid gap-2 rounded-[1rem] border border-white/10 bg-black/25 px-3 py-2 text-[11px] text-gray-300 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.14em] text-gray-500">Range</div>
                  <div className="font-semibold text-white">{commerceSnapshotModel.selectedRangeLabel}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.14em] text-gray-500">Cache freshness</div>
                  <div className="font-semibold text-white">{commerceBadgeLabel}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.14em] text-gray-500">Last verified</div>
                  <div className="font-semibold text-white">{commerceGeneratedAtLabel}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.14em] text-gray-500">Treasury</div>
                  <div className="font-semibold text-white">Platform Economy</div>
                  <div className="text-gray-400">Treasury truth lives in Platform Economy.</div>
                </div>
              </div>

              {commerceSnapshotModel.commerceSnapshotState.rangeConsistency.warning ? (
                <div className="mb-2 rounded-[1rem] border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[11px] leading-5 text-amber-100">
                  {commerceSnapshotModel.commerceSnapshotState.rangeConsistency.warning}
                </div>
              ) : null}

              {commerceSnapshotModel.commerceSnapshotState.treasuryWarnings.length > 0 ? (
                <div className="mb-2 rounded-[1rem] border border-brand-pink/20 bg-brand-pink/10 px-3 py-2 text-[11px] leading-5 text-brand-pink">
                  {commerceSnapshotModel.commerceSnapshotState.treasuryWarnings.join(" ")}
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                <MetricCard
                  label={revenueCard?.label ?? "Revenue"}
                  value={formatCommerceValue(commerceSnapshotModel.revenueValue, formatMoney)}
                  hint={`${revenueCard?.scope ?? "unknown"} | ${revenueCard?.sourceTruth ?? "unknown"}`}
                  icon={DollarSign}
                  truthState={commerceSnapshotModel.metrics.revenue.truthState}
                  statusBadgeLabel={commerceBadgeLabel}
                  className={compactMetricClass}
                  valueClassName={compactMetricValueClass}
                  dictionaryTooltip={revenueCard?.explanation ?? "Completed real-money purchases from internal payment records. Promo and bonus value are excluded."}
                />
                <MetricCard
                  label={purchasesCard?.label ?? "Purchases"}
                  value={formatCommerceValue(commerceSnapshotModel.purchaseCompletionsValue, formatCompactNumber)}
                  hint={`${purchasesCard?.scope ?? "unknown"} | ${purchasesCard?.sourceTruth ?? "unknown"}`}
                  icon={CheckCircle2}
                  truthState={commerceSnapshotModel.metrics.purchases.truthState}
                  statusBadgeLabel={commerceBadgeLabel}
                  className={compactMetricClass}
                  valueClassName={compactMetricValueClass}
                  dictionaryTooltip={purchasesCard?.explanation ?? "Server-confirmed completed purchases, not checkout starts."}
                />
                <MetricCard
                  label={checkoutCard?.label ?? "Checkout Starts"}
                  value={formatCommerceValue(commerceSnapshotModel.checkoutStartsValue, formatCompactNumber)}
                  hint={`${checkoutCard?.scope ?? "unknown"} | ${checkoutCard?.sourceTruth ?? "unknown"}`}
                  icon={Funnel}
                  truthState={commerceSnapshotModel.metrics.checkoutStarts.truthState}
                  statusBadgeLabel={commerceBadgeLabel}
                  className={compactMetricClass}
                  valueClassName={compactMetricValueClass}
                  dictionaryTooltip={checkoutCard?.explanation ?? "Checkout start telemetry. It is separate from completed purchases."}
                />
                <MetricCard
                  label={gdSpentCard?.label ?? "GD Spent"}
                  value={formatCommerceValue(commerceSnapshotModel.gdSpentValue, formatCompactNumber)}
                  hint={`${gdSpentCard?.scope ?? "unknown"} | ${gdSpentCard?.sourceTruth ?? "unknown"}`}
                  icon={ShoppingBag}
                  truthState={commerceSnapshotModel.metrics.gdSpent.truthState}
                  statusBadgeLabel={commerceBadgeLabel}
                  className={compactMetricClass}
                  valueClassName={compactMetricValueClass}
                  dictionaryTooltip={`${gdSpentCard?.explanation ?? "GumDrops spent through internal unwrap/access records."} Paid ${formatCommerceValue(commerceSnapshotModel.paidGdSpentValue, formatCompactNumber, "Unavailable")} | Reward ${formatCommerceValue(commerceSnapshotModel.rewardFreeGdSpentValue, formatCompactNumber, "Unavailable")} | Unknown ${formatCommerceValue(commerceSnapshotModel.unknownSourceGdSpentValue, formatCompactNumber, "Unavailable")}`}
                />
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
                <MetricCard
                  label={adjustedProfitCard?.label ?? "Adj. Profit"}
                  value={formatCommerceValue(commerceSnapshotModel.adjustedProfitValue, formatMoney)}
                  hint={`${adjustedProfitCard?.scope ?? "unknown"} | ${adjustedProfitCard?.sourceTruth ?? "unknown"}`}
                  icon={Wallet}
                  truthState={commerceSnapshotModel.metrics.adjustedProfit.truthState}
                  statusBadgeLabel={commerceBadgeLabel}
                  className={compactMetricClass}
                  valueClassName={compactMetricValueClass}
                  dictionaryTooltip={`${commerceSnapshotModel.adjustedProfitFormula}. Gross ${formatCommerceValue(commerceSnapshotModel.revenueValue, formatMoney, "Unavailable")} | Fees ${formatCommerceValue(commerceSnapshotModel.paymentFeesUsdValue, formatMoney, "Unavailable")} | Promo/bonus value basis ${formatCommerceValue(commerceSnapshotModel.promoValueGranted, formatMoney, "Unavailable")}.`}
                />
                <MetricCard
                  label={yieldCard?.label ?? "Yield / 100 GD"}
                  value={formatCommerceValue(commerceSnapshotModel.yieldPer100GdValue, formatMoney)}
                  hint={`${yieldCard?.scope ?? "unknown"} | ${yieldCard?.sourceTruth ?? "unknown"}`}
                  icon={Sparkles}
                  truthState={commerceSnapshotModel.metrics.yieldPer100Gd.truthState}
                  statusBadgeLabel={commerceBadgeLabel}
                  className={compactMetricClass}
                  valueClassName={compactMetricValueClass}
                  dictionaryTooltip={`${commerceSnapshotModel.yieldPer100GdFormula}. Delivered GD = paid base ${formatCommerceValue(commerceSnapshotModel.paidBaseDeliveredGdValue, formatCompactNumber, "Unavailable")} + paid bonus ${formatCommerceValue(commerceSnapshotModel.paidBonusDeliveredGdValue, formatCompactNumber, "Unavailable")}.`}
                />
                <MetricCard
                  label={walletCard?.label ?? "Wallet Opens"}
                  value={formatCommerceValue(commerceSnapshotModel.walletOpensValue, formatCompactNumber)}
                  hint={`${walletCard?.scope ?? "unknown"} | ${walletCard?.sourceTruth ?? "unknown"}`}
                  icon={Wallet}
                  truthState={commerceSnapshotModel.metrics.walletOpens.truthState}
                  statusBadgeLabel={commerceBadgeLabel}
                  className={compactMetricClass}
                  valueClassName={compactMetricValueClass}
                  dictionaryTooltip={walletCard?.explanation ?? "Wallet open telemetry for the selected range."}
                />
                <MetricCard
                  label={promoCard?.label ?? "Promo Impact"}
                  value={formatCommerceValue(commerceSnapshotModel.promoValueGranted, formatMoney, "Unavailable")}
                  hint={`${promoCard?.scope ?? "unknown"} | ${promoCard?.sourceTruth ?? "unknown"}`}
                  icon={Candy}
                  truthState={commerceSnapshotModel.metrics.promoImpact.truthState}
                  statusBadgeLabel={commerceBadgeLabel}
                  className={compactMetricClass}
                  valueClassName={compactMetricValueClass}
                  dictionaryTooltip={`Bonus GD ${formatCommerceValue(commerceSnapshotModel.bonusGdGranted, formatCompactNumber, "Unavailable")} | Promo discount ${formatCommerceValue(commerceSnapshotModel.promoDiscountUsdValue, formatMoney, "Unavailable")} | Value basis ${formatCommerceValue(commerceSnapshotModel.promoValueGranted, formatMoney, "Unavailable")}.`}
                />
              </div>

              <div className="mt-2 rounded-[1rem] border border-white/10 bg-black/25 px-3 py-2 text-[11px] leading-5 text-gray-300 md:flex md:items-center md:justify-between md:gap-3">
                <div className="font-semibold text-white">
                  {commerceConversionFooter}
                </div>
                <div className="text-gray-400">
                  Revenue source: completed internal payment records. Treasury truth lives in Platform Economy.
                </div>
                <div className="text-brand-purple">
                  {commerceSnapshotModel.needsAttention.length > 0
                    ? commerceSnapshotModel.needsAttention.slice(0, 2).join(" | ")
                    : "No commerce action required."}
                </div>
              </div>
            </SectionCard>

            <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
              <SectionCard
                title="Package Performance"
                subtitle="Which Gum Drop packs earn starts, purchases, and drop-off."
                icon={Wallet}
                rightSlot={renderSectionRangeControl("packagePerformance")}
              >
                <div className="mb-3 grid gap-2 rounded-[1rem] border border-white/10 bg-black/25 px-3 py-2 text-[11px] text-gray-300 md:grid-cols-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.14em] text-gray-500">Range</div>
                    <div className="font-semibold text-white">{packagePerformancePanelState?.range ?? packagePerformanceRange}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.14em] text-gray-500">Source state</div>
                    <div className="font-semibold text-white">{packagePerformancePanelState?.sourceState ?? "unknown"}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.14em] text-gray-500">Packages</div>
                    <div className="font-semibold text-white">{packagePerformancePanelState?.packageCount ?? packagePerformanceItems.length}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.14em] text-gray-500">Totals</div>
                    <div className="font-semibold text-white">
                      {packagePerformancePanelState
                        ? `${packagePerformancePanelState.totals.completedPurchases} purchases | ${formatMoney(packagePerformancePanelState.totals.revenueUsd)}`
                        : `${packagePerformanceItems.length} rows`}
                    </div>
                  </div>
                </div>

                {packagePerformancePanelState?.warnings?.length ? (
                  <div className="mb-3 rounded-[1rem] border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[11px] leading-5 text-amber-100">
                    {packagePerformancePanelState.warnings.join(" ")}
                  </div>
                ) : null}

                {packagePerformancePanelState && packagePerformancePanelState.rows.length > 0 ? (
                  <div className="space-y-2">
                    <div className="hidden grid-cols-[minmax(0,1.8fr)_0.8fr_0.8fr_0.8fr_0.9fr_1fr_1fr_0.9fr] gap-2 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 md:grid">
                      <div>Package</div>
                      <div>Price</div>
                      <div>Starts</div>
                      <div>Purch.</div>
                      <div>Conv.</div>
                      <div>Revenue</div>
                      <div>GD issued</div>
                      <div>State</div>
                    </div>
                    {packagePerformancePanelState.rows.map((row: any) => (
                      <div
                        key={row.packageId}
                        className="rounded-[1rem] border border-white/10 bg-black/30 px-3 py-3"
                        data-package-performance-id={row.packageId}
                        data-package-performance-state={row.performanceState}
                        data-package-performance-source={row.sourceTruth}
                      >
                        <div className="md:hidden">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-white">{row.packageLabel}</p>
                              <p className="text-[11px] text-gray-500">{row.packageId}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-brand-purple">
                                {row.conversionRatePct === null ? "Partial" : `${Math.round(row.conversionRatePct)}%`}
                              </p>
                              <p className="text-[11px] text-gray-500">{row.performanceState}</p>
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-300">
                            <span>{row.priceUsd === null ? "No price" : formatMoney(row.priceUsd)}</span>
                            <span>{row.checkoutStarts} starts</span>
                            <span>{row.completedPurchases} purchases</span>
                            <span>{formatMoney(row.revenueUsd)} revenue</span>
                            <span>{row.paidGdIssued + row.bonusGdIssued} GD issued</span>
                          </div>
                          <p className="mt-2 text-[11px] leading-5 text-gray-400">{row.explanation}</p>
                        </div>

                        <div className="hidden md:grid md:grid-cols-[minmax(0,1.8fr)_0.8fr_0.8fr_0.8fr_0.9fr_1fr_1fr_0.9fr] md:items-start md:gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">{row.packageLabel}</p>
                            <p className="truncate text-[11px] text-gray-500">
                              {row.packageId} | {row.sourceTruth} | {row.effectiveUsdPer100Gd === null ? "No effective rate" : `${formatMoney(row.effectiveUsdPer100Gd)} / 100 GD`}
                            </p>
                          </div>
                          <div className="text-sm text-white">{row.priceUsd === null ? "N/A" : formatMoney(row.priceUsd)}</div>
                          <div className="text-sm text-white">{row.checkoutStarts}</div>
                          <div className="text-sm text-white">{row.completedPurchases}</div>
                          <div className="text-sm text-white">
                            {row.conversionRatePct === null ? "Unavailable" : `${Math.round(row.conversionRatePct)}%`}
                          </div>
                          <div className="text-sm text-white">{formatMoney(row.revenueUsd)}</div>
                          <div className="text-sm text-white">{row.paidGdIssued + row.bonusGdIssued}</div>
                          <div className="text-sm text-white">{row.performanceState}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[1rem] border border-white/10 bg-black/25 px-4 py-4 text-sm text-gray-300">
                    {packagePerformancePanelState?.sourceState === "missing"
                      ? "No package config found. Package value basis should come from Platform Economy packages."
                      : "Package config exists, but no package-specific checkout or purchase data was observed in this range."}
                  </div>
                )}
              </SectionCard>

              <SectionCard
                title="Content Conversion"
                subtitle="Which content types get previews and unwraps."
                icon={Candy}
                rightSlot={renderSectionRangeControl("contentConversion")}
              >
                <div
                  className="space-y-3"
                  data-content-conversion-source-truth={contentConversionModel.sourceTruth}
                  data-content-conversion-source-state={contentConversionModel.sourceState}
                  data-content-conversion-generated-at-utc={contentConversionModel.generatedAtUtc}
                >
                  <div className="grid gap-2 rounded-[1rem] border border-white/10 bg-black/25 px-3 py-2 text-[11px] text-gray-300 md:grid-cols-3 xl:grid-cols-7">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.14em] text-gray-500">Range</div>
                      <div className="font-semibold text-white">{contentConversionModel.range}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.14em] text-gray-500">Source</div>
                      <div className="font-semibold text-white">{contentConversionModel.sourceLabel}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.14em] text-gray-500">Previews</div>
                      <div className="font-semibold text-white">{contentConversionModel.totalPreviews.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.14em] text-gray-500">Unwraps</div>
                      <div className="font-semibold text-white">{contentConversionModel.totalUnlocks.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.14em] text-gray-500">Unwrap rate</div>
                      <div className="font-semibold text-white">
                        {contentConversionModel.overallUnlockRatePct !== null
                          ? formatPercent(contentConversionModel.overallUnlockRatePct / 100)
                          : "Unavailable"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.14em] text-gray-500">Missing metadata</div>
                      <div className="font-semibold text-white">{contentConversionModel.missingMetadataCount}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.14em] text-gray-500">Last updated</div>
                      <div className="font-semibold text-white">{formatAbsoluteDateTime(contentConversionModel.generatedAtUtc)}</div>
                    </div>
                  </div>

                  <div className="rounded-[1rem] border border-white/10 bg-white/[0.035] px-3 py-2 text-[11px] leading-5 text-gray-300">
                    {contentConversionModel.visibleCopy.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {contentConversionModel.availableGroupingKeys.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setContentConversionGrouping(option.value)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors",
                          contentConversionGrouping === option.value
                            ? "border-brand-purple/40 bg-brand-purple/15 text-white"
                            : "border-white/10 bg-black/25 text-gray-300 hover:border-brand-purple/30 hover:text-white",
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  {contentConversionVisibleRows.length > 0 ? (
                    <div className="space-y-2">
                      <div className="hidden grid-cols-[minmax(0,1.4fr)_0.7fr_0.75fr_0.75fr_0.8fr_0.8fr_0.8fr_0.8fr] gap-2 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 md:grid">
                        <div>Group</div>
                        <div>Drops</div>
                        <div>Previews</div>
                        <div>Unwraps</div>
                        <div>Rate</div>
                        <div>Viewer</div>
                        <div>Watch</div>
                        <div>State</div>
                      </div>
                      {contentConversionVisibleRows.map((row) => (
                        <div
                          key={row.groupKey}
                          className="rounded-[1rem] border border-white/10 bg-black/30 px-3 py-3"
                          data-content-conversion-group-key={row.groupKey}
                          data-content-conversion-grouping={row.groupingDimension}
                          data-content-conversion-state={row.conversionState}
                        >
                          <div className="md:hidden">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-white">{row.groupLabel}</p>
                                <p className="mt-1 text-[11px] text-gray-500">{`${row.dropCount} drops | ${row.previewCount.toLocaleString()} previews | ${row.unlockCount.toLocaleString()} ${row.unlockCount === 1 ? "unwrap" : "unwraps"}`}</p>
                              </div>
                              <AdminStatusBadge state={coerceAdminSurfaceState(row.conversionState === "healthy" ? "live" : row.conversionState === "no_data" ? "unavailable" : "degraded")} />
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-400">
                              <span>
                                Rate: {row.unlockRatePct !== null ? formatPercent(row.unlockRatePct / 100) : "Unavailable"}
                              </span>
                              <span>Source: {row.sourceTruth}</span>
                              <span>Freshness: {row.freshnessState}</span>
                              <span>
                                Viewer: {(row.viewerOpenCount ?? 0).toLocaleString()}
                              </span>
                              <span>
                                Watch: {row.watchSeconds !== null && row.watchSeconds !== undefined ? formatDuration(row.watchSeconds) : "Unavailable"}
                              </span>
                            </div>
                            <p className="mt-2 text-[11px] leading-5 text-gray-400">{row.explanation}</p>
                          </div>

                          <div className="hidden items-start gap-2 md:grid md:grid-cols-[minmax(0,1.4fr)_0.7fr_0.75fr_0.75fr_0.8fr_0.8fr_0.8fr_0.8fr]">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-white">{row.groupLabel}</p>
                              <p className="mt-1 text-[11px] leading-5 text-gray-500">{`${row.sourceTruth} | ${row.freshnessState} | ${row.explanation}`}</p>
                            </div>
                            <div className="text-sm font-semibold text-white">{row.dropCount}</div>
                            <div className="text-sm font-semibold text-white">{row.previewCount.toLocaleString()}</div>
                            <div className="text-sm font-semibold text-white">{row.unlockCount.toLocaleString()}</div>
                            <div className="text-sm font-semibold text-brand-purple">
                              {row.unlockRatePct !== null ? formatPercent(row.unlockRatePct / 100) : "Unavailable"}
                            </div>
                            <div className="text-sm text-gray-300">{(row.viewerOpenCount ?? 0).toLocaleString()}</div>
                            <div className="text-sm text-gray-300">
                              {row.watchSeconds !== null && row.watchSeconds !== undefined ? formatDuration(row.watchSeconds) : "Unavailable"}
                            </div>
                            <div>
                              <AdminStatusBadge state={coerceAdminSurfaceState(row.conversionState === "healthy" ? "live" : row.conversionState === "no_data" ? "unavailable" : "degraded")} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[1rem] border border-dashed border-white/10 bg-black/20 px-4 py-5 text-sm text-gray-500">
                      {contentConversionModel.sourceTruth === "missing"
                        ? "No preview/unwrap/drop metadata source available for this range."
                        : contentConversionModel.sourceTruth === "drop_metadata_plus_unlock_rollups"
                          ? "Content conversion is using access rollup fallback because unwrap telemetry is missing."
                          : "No preview/unwrap events in selected range."}
                    </div>
                  )}
                </div>
              </SectionCard>
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
              <SectionCard
                title="Top Drop Conversion"
                subtitle="Drops with enough views to evaluate unwrap conversion."
                icon={ShoppingBag}
                rightSlot={renderSectionRangeControl("topDropConversion")}
              >
                <div
                  className="space-y-3"
                  data-top-drop-conversion-source-truth={topDropConversionModel.sourceTruth}
                  data-top-drop-conversion-freshness={topDropConversionModel.freshnessState}
                  data-top-drop-conversion-generated-at-utc={topDropConversionModel.generatedAtUtc}
                  data-top-drop-conversion-denominator={topDropConversionModel.denominatorLabel}
                  data-top-drop-conversion-page={topDropConversionModel.page}
                  data-top-drop-conversion-page-size={topDropConversionModel.pageSize}
                >
                  <div className="grid gap-2 rounded-[1rem] border border-white/10 bg-black/25 px-3 py-2 text-[11px] text-gray-300 md:grid-cols-4">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.14em] text-gray-500">Range</div>
                      <div className="font-semibold text-white">{topDropConversionModel.range}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.14em] text-gray-500">Source</div>
                      <div className="font-semibold text-white">{topDropConversionModel.sourceTruth}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.14em] text-gray-500">Denominator</div>
                      <div className="font-semibold text-white">{topDropConversionModel.denominatorLabel}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.14em] text-gray-500">Last updated</div>
                      <div className="font-semibold text-white">{formatAbsoluteDateTime(topDropConversionModel.generatedAtUtc)}</div>
                    </div>
                  </div>

                  <div className="rounded-[1rem] border border-white/10 bg-white/[0.035] px-3 py-2 text-[11px] leading-5 text-gray-300">
                    <p>{topDropConversionModel.sourceCopy}</p>
                    <p>{topDropConversionModel.denominatorCopy}</p>
                    {topDropConversionModel.warnings.map((warning) => (
                      <p key={warning}>{warning}</p>
                    ))}
                  </div>

                  {topDropConversionModel.chartRows.length > 0 ? (
                    <details className="rounded-[1rem] border border-white/10 bg-black/20 px-3 py-2">
                      <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                        Chart
                      </summary>
                      <div className="mt-3 h-56 w-full">
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
                    </details>
                  ) : null}

                  <div className="space-y-2">
                    <div className="hidden grid-cols-[minmax(0,1.7fr)_0.8fr_0.8fr_0.8fr_0.8fr] gap-2 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 md:grid">
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
                          className="rounded-[1rem] border border-white/10 bg-black/30 px-3 py-3"
                          data-top-drop-conversion-drop-id={drop.dropId}
                          data-top-drop-conversion-identity-state={drop.dropIdentityState}
                          data-top-drop-conversion-views={drop.views}
                          data-top-drop-conversion-unwraps={drop.unwraps}
                          data-top-drop-conversion-rate={drop.unwrapRateDisplay}
                        >
                          <div className="md:hidden">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-white">{drop.dropTitle}</p>
                                <p className="mt-1 text-[11px] text-gray-500">
                                  {drop.creatorName ? `${drop.creatorName} | ` : ""}{drop.shortDropId}
                                </p>
                              </div>
                              <span className="shrink-0 text-sm font-bold text-brand-purple">{drop.unwrapRateDisplay}</span>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-400">
                              <span>{drop.views.toLocaleString()} {topDropConversionModel.denominatorLabel}</span>
                              <span>{drop.unwraps.toLocaleString()} {drop.unwraps === 1 ? "unwrap" : "unwraps"}</span>
                              <span>{drop.sourceTruth}</span>
                            </div>
                            <p className="mt-2 text-[11px] leading-5 text-gray-400">{drop.explanation}</p>
                          </div>

                          <div className="hidden items-start gap-2 md:grid md:grid-cols-[minmax(0,1.7fr)_0.8fr_0.8fr_0.8fr_0.8fr]">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-white">{drop.dropTitle}</p>
                              <p className="mt-1 text-[11px] text-gray-500">
                                {drop.creatorName ? `${drop.creatorName} | ` : ""}{drop.shortDropId}
                              </p>
                              <details className="mt-1 text-[11px] text-gray-500">
                                <summary className="cursor-pointer">Raw identity and source details</summary>
                                <p>Drop ID: {drop.dropId}</p>
                                <p>Source: {drop.sourceTruth}</p>
                                <p>Freshness: {drop.freshnessState}</p>
                              </details>
                            </div>
                            <div className="text-sm font-semibold text-white">{drop.views.toLocaleString()}</div>
                            <div className="text-sm font-semibold text-white">{drop.unwraps.toLocaleString()}</div>
                            <div className="text-sm font-semibold text-brand-purple">{drop.unwrapRateDisplay}</div>
                            <div>
                              <AdminStatusBadge state={coerceAdminSurfaceState(drop.dropIdentityState === "resolved" ? "cached" : "degraded")} />
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
                      <div className="rounded-[1rem] border border-dashed border-white/10 bg-black/20 px-4 py-5 text-sm text-gray-500">
                        No drop conversion rows were available for this range.
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-[1rem] border border-white/10 bg-black/20 px-3 py-2 text-[11px] text-gray-300">
                    <div>
                      Showing {topDropConversionModel.visibleRows.length > 0 ? topDropConversionModel.visibleStart + 1 : 0}-{topDropConversionModel.visibleEnd} of {topDropConversionModel.totalRows} rows
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={topDropConversionPageSize}
                        onChange={(event) => {
                          setTopDropConversionPageSize(Number(event.target.value));
                          setTopDropConversionPage(1);
                        }}
                        className="rounded-xl border border-white/10 bg-black/40 px-2 py-1 text-white"
                        aria-label="Top drop conversion page size"
                      >
                        {[10, 25, 50].map((size) => (
                          <option key={size} value={size}>{size}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={!topDropConversionModel.hasPreviousPage}
                        onClick={() => setTopDropConversionPage(Math.max(1, topDropConversionPage - 1))}
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-1 font-semibold text-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Prev
                      </button>
                      <span>Page {topDropConversionModel.page} / {topDropConversionModel.pageCount}</span>
                      <button
                        type="button"
                        disabled={!topDropConversionModel.hasNextPage}
                        onClick={() => setTopDropConversionPage(topDropConversionPage + 1)}
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-1 font-semibold text-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Recent Commerce Feed"
                subtitle="Recent transactions condensed into mobile cards."
                icon={Wallet}
                rightSlot={renderSectionRangeControl("recentCommerceFeed")}
              >
                <div className="space-y-3">
                  {recentCommerceFeedItems.length > 0 ? (
                    recentCommerceFeedItems.slice(0, 10).map((item: any) => (
                      <div
                        key={item.id}
                        className="rounded-[1.6rem] border border-white/10 bg-black/30 p-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/5">
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
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-white">
                              {item.description || item.type || "Transaction"}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              {item.username
                                ? `@${item.username}`
                                : "[unavailable] user identity"}{" "}
                              ·{" "}
                              {item.timestamp
                                ? formatRelativeTime(item.timestamp, nowMs)
                                : "Just now"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-brand-purple">
                              {typeof item.cost === "number" && item.cost > 0
                                ? formatMoney(item.cost)
                                : typeof item.amount === "number"
                                  ? item.amount.toLocaleString()
                                  : "0"}
                            </p>
                            <p className="text-[11px] uppercase tracking-[0.14em] text-gray-500">
                              {item.status || "logged"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[1.6rem] border border-dashed border-white/10 bg-black/20 p-5 text-sm text-gray-500">
                      No recent commerce feed entries yet.
                    </div>
                  )}
                </div>
              </SectionCard>
            </div>

            <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
              <SectionCard
                title="Library Viewer Drilldown"
                subtitle={
                  viewerDrilldownFilter
                    ? `Viewer playback, watch time, and drop affinity filtered to ${viewerDrilldownFilter.startsWith("@") ? viewerDrilldownFilter : `@${viewerDrilldownFilter}`}.`
                    : "Overall library viewer performance across watch time, repeat sessions, asset completion, and top drops."
                }
                icon={Eye}
                className="xl:col-span-2"
                rightSlot={
                  <div className="flex flex-wrap items-center gap-2">
                    {renderSectionRangeControl("viewerDrilldown")}
                    {viewerDrilldownFilter ? (
                      <span className="rounded-full border border-brand-purple/25 bg-brand-purple/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-purple">
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
                      <div className="rounded-[1.6rem] border border-white/10 bg-black/30 p-4">
                        <div className="flex flex-col gap-3 lg:flex-row">
                          <label className="min-w-0 flex-1">
                            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                              Filter by username or UID
                            </span>
                            <input
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
                              className="h-12 w-full rounded-2xl border border-white/10 bg-black/40 px-4 text-sm text-white outline-none transition-colors placeholder:text-gray-500 focus:border-brand-purple/40"
                            />
                          </label>
                          <div className="flex gap-2 lg:self-end">
                            <button
                              type="button"
                              onClick={applyViewerFilter}
                              className="min-h-12 rounded-2xl bg-brand-purple px-4 text-sm font-bold text-white transition-colors hover:bg-brand-purple/90"
                            >
                              Apply filter
                            </button>
                            <button
                              type="button"
                              onClick={clearViewerFilter}
                              className="min-h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-gray-200 transition-colors hover:border-brand-purple/30 hover:text-white"
                            >
                              Overall
                            </button>
                          </div>
                        </div>

                        {viewerDrilldownUsers.length > 0 ? (
                          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                            {viewerDrilldownUsers.map((item: any) => (
                              <button
                                key={item.uid}
                                type="button"
                                onClick={() => {
                                  setViewerUserDraft(item.username);
                                  setViewerUserFilter(item.username);
                                }}
                                className={cn(
                                  "shrink-0 rounded-full border px-3 py-2 text-left text-xs transition-colors",
                                  viewerDrilldownFilter &&
                                    item.username === viewerDrilldownFilter
                                    ? "border-brand-purple/40 bg-brand-purple/15 text-white"
                                    : "border-white/10 bg-white/5 text-gray-300 hover:border-brand-purple/30 hover:text-white",
                                )}
                              >
                                <span className="font-semibold">
                                  {item.username.startsWith("@")
                                    ? item.username
                                    : `@${item.username}`}
                                </span>
                                <span className="ml-2 text-gray-500">
                                  {item.sessionCount} sessions
                                </span>
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <div className="grid grid-cols-2 gap-3 xl:grid-cols-8">
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
                          hint={`${viewerDrilldownOverview.repeatSessionCount.toLocaleString()} repeat / ${viewerDrilldownOverview.returnSessionCount.toLocaleString()} returns`}
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
                          label="Watch Time"
                          value={formatDuration(
                            viewerDrilldownOverview.totalWatchSeconds,
                          )}
                          hint={`${formatDuration(viewerDrilldownOverview.avgWatchSeconds)} avg watch`}
                          icon={Clock3}
                        />
                        <MetricCard
                          label="Meaningful"
                          value={formatCompactNumber(
                            viewerDrilldownOverview.meaningfulSessionCount,
                          )}
                          hint={`${viewerDrilldownOverview.convertedSessionCount.toLocaleString()} converted / ${viewerDrilldownOverview.completedSessionCount.toLocaleString()} completed`}
                          icon={CheckCircle2}
                        />
                        <MetricCard
                          label="Completion"
                          value={formatPercent(
                            viewerOverview.assetCompletionRate,
                          )}
                          hint={`${viewerOverview.downloads.toLocaleString()} downloads · ${viewerOverview.relatedClicks.toLocaleString()} next clicks`}
                          icon={CheckCircle2}
                        />
                        <MetricCard
                          label="Opened, No Depth"
                          value={formatCompactNumber(
                            viewerOverview.openedWithoutDepthCount,
                          )}
                          hint="Opened without meaningful consumption"
                          icon={Funnel}
                        />
                        <MetricCard
                          label="Early Exits"
                          value={formatCompactNumber(
                            viewerOverview.bounceSessionCount,
                          )}
                          hint={`${viewerOverview.abandonedSessionCount.toLocaleString()} abandoned / ${viewerOverview.stalledSessionCount.toLocaleString()} stalled`}
                          icon={AlertTriangle}
                        />
                      </div>

                      <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
                        <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                                Watch capture health
                              </p>
                              <p className="mt-1 text-sm text-gray-400">
                                Viewer-session capture quality, including
                                delayed sync, replay recovery, and close-path
                                misses.
                              </p>
                            </div>
                            <span
                              className={cn(
                                "rounded-full border px-3 py-1 text-[11px] font-semibold",
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

                          <div className="grid gap-3 sm:grid-cols-2">
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

                          <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-gray-400">
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

                        <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                                Live capture pulse
                              </p>
                              <p className="mt-1 text-sm text-gray-400">
                                Recent-session continuity signal, kept separate
                                from the broader historical range.
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <AdminStatusBadge state={liveCaptureTruthState} />
                              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-gray-300">
                                {liveCaptureTruthState === "unavailable" ? "No sample" : liveWatchCaptureHealth.sessionCount.toLocaleString()}{" "}
                                recent
                              </span>
                            </div>
                          </div>

                          <div className="space-y-3">
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
                                  <span className="text-white">
                                    {item.label}
                                  </span>
                                  <span className="font-semibold text-brand-purple">
                                    {item.value === null ? "[unavailable]" : item.value.toLocaleString()}
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

                      <div className="grid gap-4 xl:grid-cols-[0.98fr_1.02fr]">
                        <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                                Top user journeys
                              </p>
                              <p className="mt-1 text-sm text-gray-400">
                                Which identities are looping through the viewer,
                                and whether they actually stay long enough to
                                matter.
                              </p>
                            </div>
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-gray-300">
                              {viewerDrilldownJourneys.length} tracked
                            </span>
                          </div>
                          <div className="space-y-3">
                            {viewerDrilldownJourneys.length > 0 ? (
                              viewerDrilldownJourneys.map((item: any) => (
                                <div
                                  key={item.uid}
                                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"
                                >
                                  <div className="mb-2 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-semibold text-white">
                                        {item.username}
                                      </p>
                                      <p className="mt-1 text-[11px] text-gray-500">
                                        {item.primaryPath}
                                      </p>
                                    </div>
                                    <span className="text-sm font-bold text-brand-purple">
                                      {item.eventCount.toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-2 text-[11px] text-gray-400">
                                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-300">
                                      {item.actorType === "guest"
                                        ? "Guest"
                                        : "Member"}
                                    </span>
                                    <span
                                      className={cn(
                                        "rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
                                        getJourneyStateClasses(
                                          item.journeyState,
                                        ),
                                      )}
                                    >
                                      {getJourneyStateLabel(item.journeyState)}
                                    </span>
                                    <span>
                                      {formatDuration(item.watchSeconds)} watch
                                    </span>
                                    <span>
                                      {formatRelativeTime(
                                        item.lastSeenAt,
                                        nowMs,
                                      )}
                                    </span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="rounded-[1.4rem] border border-dashed border-white/10 bg-black/20 p-4 text-sm text-gray-500">
                                User-level viewer journeys will appear as soon
                                as verified watch sessions and telemetry
                                overlap in this range.
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                                Experience context
                              </p>
                              <p className="mt-1 text-sm text-gray-400">
                                Drops and experience surfaces ranked by combined
                                activity, watch depth, and conversion pressure.
                              </p>
                            </div>
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-gray-300">
                              {topExperienceContexts.length} experiences
                            </span>
                          </div>
                          <div className="space-y-3">
                            {topExperienceContexts.length > 0 ? (
                              topExperienceContexts.map((item: any) => (
                                <div
                                  key={item.key}
                                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"
                                >
                                  <div className="mb-2 flex items-center justify-between gap-3">
                                    <p className="truncate text-sm font-semibold text-white">
                                      {item.label}
                                    </p>
                                    <span className="text-sm font-bold text-cyan-300">
                                      {formatDuration(item.watchSeconds)}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-2 text-[11px] text-gray-400">
                                    <span>
                                      {item.eventCount.toLocaleString()} signals
                                    </span>
                                    <span>
                                      {item.uniqueUsers.toLocaleString()} users
                                    </span>
                                    <span>
                                      {item.conversionCount.toLocaleString()}{" "}
                                      conversions
                                    </span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="rounded-[1.4rem] border border-dashed border-white/10 bg-black/20 p-4 text-sm text-gray-500">
                                Experience context will fill in once drop-level
                                watch sessions or interaction traces land for
                                the chosen period.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                        <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
                          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                            Top viewed drops by watch time
                          </p>
                          {viewerDropChartData.length > 0 ? (
                            <div className="h-72 w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                  data={viewerDropChartData}
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
                          ) : (
                            <div className="rounded-[1.6rem] border border-dashed border-white/10 bg-black/20 p-5 text-sm text-gray-500">
                              Viewer drilldown data will populate once
                              collectors start watching library content in the
                              selected range.
                            </div>
                          )}
                        </div>

                        <div className="space-y-3">
                          {viewerDrilldownInsights.slice(0, 5).map((item: any) => (
                            <div
                              key={item.dropId}
                              className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4"
                            >
                              <div className="mb-3 flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-white">
                                    {item.dropTitle}
                                  </p>
                                  <p className="mt-1 text-xs text-gray-500">
                                    {item.sessionCount.toLocaleString()}{" "}
                                    sessions ·{" "}
                                    {item.uniqueViewerCount.toLocaleString()}{" "}
                                    viewers
                                  </p>
                                </div>
                                <span className="shrink-0 rounded-full border border-brand-purple/25 bg-brand-purple/12 px-3 py-1 text-[11px] font-semibold text-brand-purple">
                                  {formatDuration(item.totalWatchSeconds)}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-gray-300">
                                  Meaningful
                                  <br />
                                  {item.meaningfulSessionCount}
                                </div>
                                <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-gray-300">
                                  Opened no depth
                                  <br />
                                  {item.openedWithoutDepthCount}
                                </div>
                                <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-gray-300">
                                  Returns
                                  <br />
                                  {item.returnSessionCount}
                                </div>
                                <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-brand-purple">
                                  Avg load
                                  <br />
                                  {item.avgLoadMs > 0
                                    ? `${item.avgLoadMs}ms`
                                    : "n/a"}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </SectionCard>

              <SectionCard
                title="Viewer Journey"
                subtitle="How far users move from preview to opening, meaningful watch, completion, and return."
                icon={PlayCircle}
                rightSlot={renderSectionRangeControl("viewerJourney")}
              >
                {viewerJourneyItems.some((item: any) => item.count > 0) ? (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={viewerJourneyItems}
                        margin={{ top: 8, right: 4, left: -18, bottom: 0 }}
                      >
                        <CartesianGrid
                          stroke="rgba(255,255,255,0.06)"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="label"
                          stroke="#6b7280"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          interval={0}
                          angle={-18}
                          textAnchor="end"
                          height={56}
                        />
                        <YAxis
                          stroke="#6b7280"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip content={<AnalyticsTooltip />} />
                        <Line
                          type="monotone"
                          dataKey="count"
                          name="Events"
                          stroke="#b28cff"
                          strokeWidth={3}
                          dot={{ r: 4, fill: "#b28cff" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="rounded-[1.6rem] border border-dashed border-white/10 bg-black/20 p-5 text-sm text-gray-500">
                    Viewer journey loaded without any tracked viewer activity.
                  </div>
                )}
              </SectionCard>

              <SectionCard
                title="Watch Depth + Tags"
                subtitle="What people watch after unwrap, plus the tags driving demand."
                icon={Eye}
                rightSlot={renderSectionRangeControl("watchDepthTags")}
              >
                {watchDepthTagBuckets.some((bucket: any) => bucket.count > 0) || watchDepthTagDemand.length > 0 ? (
                  <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                    <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
                      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                        Watch depth
                      </p>
                      <div className="space-y-3">
                        {watchDepthTagBuckets.map((bucket: any) => (
                          <div key={bucket.label}>
                            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                              <span className="text-white">{bucket.label}</span>
                              <span className="font-semibold text-brand-purple">
                                {bucket.count.toLocaleString()}
                              </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-white/10">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-brand-purple to-cyan-400"
                                style={{
                                  width: `${Math.max(6, (bucket.count / Math.max(1, watchDepthTagBuckets[0]?.count || 1)) * 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
                      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                        Top tags
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {watchDepthTagDemand.length > 0 ? (
                          watchDepthTagDemand.map((item: any) => (
                            <span
                              key={item.tag}
                              className="rounded-full border border-brand-purple/25 bg-brand-purple/12 px-3 py-2 text-xs font-semibold text-white"
                            >
                              {item.tag} · {item.count}
                            </span>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500">
                            Tag demand will populate after more unwraps land in
                            this range.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[1.6rem] border border-dashed border-white/10 bg-black/20 p-5 text-sm text-gray-500">
                    No watch-depth or tag-demand rows were returned in this window.
                  </div>
                )}
              </SectionCard>
            </div>
    </>
  );
}
