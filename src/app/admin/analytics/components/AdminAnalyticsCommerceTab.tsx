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
    validations, getValidationClasses, dataValidationRange,
    
    // Audience Tab
    totalDeviceUsers, mobileUsers, mobileShare, audienceSnapshotRange, semanticQualityCards, guestBounceRate, identifiedBounceRate, guestEngagedRate,
    returnCadenceSegments,
    navigationDestinationsRange, destinationMix,
    deviceMixRange, devices, getDeviceIcon,
    topPathsRange, pages,
    regionsRange, geo,

    // Commerce Tab
    commerceSnapshotRange, commerceSnapshotCommerce, commerceSnapshotFunnel, historicalOverviewTruthState,
    packagePerformanceRange, packagePerformanceItems,
    PIE_COLORS, contentConversionRange, contentConversionItems,
    topDropConversionRange, topDropConversionItems,
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
  const commerceTruthState = historicalOverviewTruthState ?? (historicalLoading ? "loading" : "unavailable");
  const liveCaptureTruthState = liveResponse?.liveTruthLabel
    ? coerceAdminSurfaceState(liveResponse.liveTruthLabel)
    : liveLoading ? "loading" : "unavailable";
  const formatCommerceMetric = (value: number | null | undefined, formatter: (next: number) => string) =>
    typeof value === "number" && Number.isFinite(value) ? formatter(value) : "[unavailable]";

  return (
    <>
            <SectionCard
              title="Commerce Snapshot"
              subtitle="Unlock and purchase efficiency kept above the fold."
              icon={DollarSign}
              defaultExpanded
              rightSlot={renderSectionRangeControl("commerceSnapshot")}
            >
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <MetricCard
                  label="Revenue"
                  value={formatMoney(commerceSnapshotCommerce.revenueUsd)}
                  hint="Completed currency purchases"
                  icon={DollarSign}
                  truthState={commerceTruthState}
                  dictionaryTooltip="Total USD revenue collected from all completed purchases."
                />
                <MetricCard
                  label="Adj. Profit"
                  value={formatCommerceMetric(commerceSnapshotCommerce.adjustedProfitUsd, formatMoney)}
                  hint={`${formatCommerceMetric(commerceSnapshotCommerce.bonusValueUsd, formatMoney)} promo value granted`}
                  icon={Wallet}
                  truthState={commerceTruthState}
                  dictionaryTooltip="Net profit after accounting for platform fees and promotional value granted."
                />
                <MetricCard
                  label="Yield / 100 GD"
                  value={formatCommerceMetric(commerceSnapshotCommerce.effectiveUsdPer100Gd, formatMoney)}
                  hint={`${formatCommerceMetric(commerceSnapshotCommerce.deliveredGumDrops, formatCompactNumber)} GD delivered`}
                  icon={Sparkles}
                  truthState={commerceTruthState}
                  dictionaryTooltip="Effective USD revenue earned per 100 GumDrops delivered."
                />
                <MetricCard
                  label="GD Spent"
                  value={formatCompactNumber(commerceSnapshotCommerce.gdSpent)}
                  hint={`${formatCommerceMetric(commerceSnapshotCommerce.bonusGumDrops, formatCompactNumber)} bonus GD granted`}
                  icon={ShoppingBag}
                  truthState={commerceTruthState}
                  dictionaryTooltip="Total volume of GumDrops spent by users across all experiences."
                />
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="rounded-[1.6rem] border border-white/10 bg-black/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                    Wallet Opens
                  </p>
                  <p className="mt-2 text-3xl font-black text-white">
                    {commerceSnapshotFunnel.walletOpens.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-[1.6rem] border border-white/10 bg-black/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                    Checkout Starts
                  </p>
                  <p className="mt-2 text-3xl font-black text-white">
                    {commerceSnapshotFunnel.checkoutStarts.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-[1.6rem] border border-white/10 bg-black/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                    Purchase Completions
                  </p>
                  <p className="mt-2 text-3xl font-black text-white">
                    {commerceSnapshotFunnel.purchases.toLocaleString()}
                  </p>
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
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={packagePerformanceItems.slice(0, 6)}
                      margin={{ top: 8, right: 0, left: -18, bottom: 0 }}
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
                      <Bar
                        dataKey="starts"
                        name="Checkouts"
                        fill="#374151"
                        radius={[8, 8, 0, 0]}
                      />
                      <Bar
                        dataKey="purchases"
                        name="Purchases"
                        fill="#b28cff"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-5 space-y-3">
                  {packagePerformanceItems.slice(0, 5).map((item: any) => (
                    <div
                      key={item.label}
                      className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4"
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {item.label}
                          </p>
                          <p className="text-xs text-gray-500">
                            {item.starts.toLocaleString()} checkouts ·{" "}
                            {item.purchases.toLocaleString()} purchases
                          </p>
                        </div>
                        <span className="text-sm font-bold text-brand-purple">
                          {formatPercent(item.conversionRate)}
                        </span>
                      </div>
                      <p className="text-xs leading-6 text-gray-400">
                        {formatMoney(item.revenueUsd)} revenue ·{" "}
                        {formatPercent(item.abandonmentRate)} abandonment
                      </p>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard
                title="Content Conversion"
                subtitle="Which content types get previews and unwraps."
                icon={Candy}
                rightSlot={renderSectionRangeControl("contentConversion")}
              >
                <div className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={contentConversionItems.slice(0, 6)}
                        margin={{ top: 8, right: 0, left: -18, bottom: 0 }}
                      >
                        <CartesianGrid
                          stroke="rgba(255,255,255,0.06)"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="label"
                          stroke="#6b7280"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="#6b7280"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip content={<AnalyticsTooltip />} />
                        <Bar
                          dataKey="previews"
                          name="Previews"
                          fill="#374151"
                          radius={[8, 8, 0, 0]}
                        />
                        <Bar
                          dataKey="unlocks"
                          name="Unlocks"
                          fill="#b28cff"
                          radius={[8, 8, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-3">
                    {contentConversionItems.slice(0, 5).map((item: any) => (
                      <div
                        key={item.label}
                        className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4"
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold capitalize text-white">
                            {item.label}
                          </p>
                          <span className="text-sm font-bold text-brand-purple">
                            {formatPercent(item.unlockRate)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {item.previews.toLocaleString()} previews ·{" "}
                          {item.unlocks.toLocaleString()} unwraps
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </SectionCard>
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
              <SectionCard
                title="Top Drop Conversion"
                subtitle="Unlocked drops with enough demand to matter."
                icon={ShoppingBag}
                rightSlot={renderSectionRangeControl("topDropConversion")}
              >
                <div className="h-64 w-full md:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topDropConversionItems.slice(0, 8)}
                      margin={{ top: 8, right: 0, left: -18, bottom: 0 }}
                    >
                      <CartesianGrid
                        stroke="rgba(255,255,255,0.06)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="dropId"
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
                      <Tooltip
                        content={
                          <AnalyticsTooltip
                            valueFormatter={(value, name) =>
                              name === "Unlocks" || name === "Views"
                                ? Number(value).toLocaleString()
                                : String(value)
                            }
                          />
                        }
                      />
                      <Bar
                        dataKey="views"
                        name="Views"
                        fill="#374151"
                        radius={[8, 8, 0, 0]}
                      />
                      <Bar
                        dataKey="unlocks"
                        name="Unlocks"
                        fill="#b28cff"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-5 space-y-3">
                  {topDropConversionItems.slice(0, 6).map((drop: any) => {
                    const rate = drop.views > 0 ? drop.unlocks / drop.views : 0;
                    return (
                      <div
                        key={drop.dropId}
                        className="rounded-[1.6rem] border border-white/10 bg-black/30 p-4"
                      >
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">
                              {drop.dropId}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              {drop.views.toLocaleString()} views ·{" "}
                              {drop.unlocks.toLocaleString()} unlocks
                            </p>
                          </div>
                          <span className="shrink-0 text-sm font-bold text-brand-purple">
                            {formatPercent(rate)}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-brand-purple to-cyan-400"
                            style={{ width: `${Math.max(6, rate * 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
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
                                Canonical viewer-session capture quality,
                                including degraded sync, replay recovery, and
                                close-path misses.
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
                              label="Degraded"
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
                              hint={`${viewerDrilldownCaptureHealth.flushDegradedCount.toLocaleString()} flush degraded`}
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
                                Recent-session continuity signal from the
                                realtime lane, kept separate from the broader
                                historical range.
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <AdminStatusBadge state={liveCaptureTruthState} />
                              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-gray-300">
                                {liveCaptureTruthState === "unavailable" ? "[unavailable]" : liveWatchCaptureHealth.sessionCount.toLocaleString()}{" "}
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
                                        ((item.value ?? 0) /
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
                                as canonical watch sessions and telemetry
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
