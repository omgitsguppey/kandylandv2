import React from "react";
import {
  Activity, Clock3, FileText, MapPin, Route, Smartphone, Users,
} from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Pie, PieChart, Cell } from "recharts";
import { AnalyticsTooltip, MetricCard, SectionCard } from "@/components/Admin/Analytics/AdminAnalyticsPrimitives";
import type { AdminAnalyticsState } from "../hooks/useAdminAnalyticsState";

export function AdminAnalyticsAudienceTab(props: AdminAnalyticsState) {
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
    totalDeviceUsers, mobileUsers, mobileShare, audienceSnapshotRange, semanticQualityCards, guestBounceRate, identifiedBounceRate, guestEngagedRate, historicalOverviewTruthState,
    navigationDestinationsRange, destinationMix,
    deviceMixRange, devices, getDeviceIcon,
    topPathsRange, pages,
    regionsRange, geo,
    audienceHistorySeries, audienceSnapshotModel, returnCadenceModel, navigationDestinationsMix, deviceMixDevices, deviceMixTotalUsers, topPathsPages, regionsGeo,

    // Commerce Tab
    commerceSnapshotRange, commerce,
    packagePerformanceRange, packagePerformance,
    PIE_COLORS, contentConversionRange, unlockCategoryMix, previewToUnlockRate, checkoutToPurchaseRate,
    topDropConversionRange, topDrops,
    // Added remaining
    clearAllFilters, clearViewerFilter, viewerUserFilter, formatMoney, activeViewerFilter
  } = props;
  const historicalPanelTruthState = historicalOverviewTruthState ?? (historicalLoading ? "loading" : "unavailable");
  const returnCadenceTruthState = returnCadenceModel.truthState ?? (historicalLoading ? "loading" : "unavailable");
  React.useEffect(() => {
    (window as typeof window & {
      __KANDYDROPS_ADMIN_ANALYTICS_AUDIENCE_SNAPSHOT_DEBUG__?: unknown;
    }).__KANDYDROPS_ADMIN_ANALYTICS_AUDIENCE_SNAPSHOT_DEBUG__ =
      audienceSnapshotModel;
  }, [audienceSnapshotModel]);
  const formatAudienceValue = (
    value: number | null,
    formatter: (value: number) => string,
    waitingLabel = "Unavailable",
  ) => (value === null ? waitingLabel : formatter(value));
  const audienceWaitingLabel =
    audienceSnapshotModel.refreshStatus === "running" && !audienceSnapshotModel.serverConfirmed
      ? "Waiting for audience snapshot"
      : "Unavailable";
  const guestBadgeLabel = audienceSnapshotModel.guestEstimateFormulaUsed
    ? "EST"
    : undefined;
  const continuityLabel = audienceSnapshotModel.continuity.gapSeverity === "error"
    ? "Traffic gap detected"
    : audienceSnapshotModel.continuity.gapSeverity === "review"
      ? "Continuity needs review"
      : "Continuity verified";

  return (
    <>
<>
            <SectionCard
              title="Audience Snapshot"
              subtitle="GA totals and first-party activity for the selected range."
              icon={Users}
              defaultExpanded
              rightSlot={renderSectionRangeControl("audienceSnapshot")}
            >
              <div
                className="mb-3 space-y-3"
                data-audience-source-state={audienceSnapshotModel.sourceState}
                data-audience-ga-freshness={audienceSnapshotModel.ga.freshnessState}
                data-audience-first-party-freshness={audienceSnapshotModel.firstParty.freshnessState}
                data-audience-missing-days-count={String(audienceSnapshotModel.continuity.missingDays.length)}
                data-audience-recent-gap-days-count={String(audienceSnapshotModel.continuity.recentGapDays.length)}
                data-audience-recovery-mode={audienceSnapshotModel.recovery.mode}
                data-audience-estimated-share={String(audienceSnapshotModel.recovery.estimatedSharePct)}
                data-audience-generated-at-utc={audienceSnapshotModel.generatedAtUtc}
              >
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] leading-5 text-gray-300">
                  {audienceSnapshotModel.visibleCopy.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                  <p className="mt-1 text-gray-500">
                    Identified first-party:{" "}
                    {audienceSnapshotModel.identifiedViews.value === null
                      ? audienceWaitingLabel
                      : `${audienceSnapshotModel.identifiedViews.value.toLocaleString()} views`}
                    {" | "}Guest: {audienceSnapshotModel.guestVisits.label}
                  </p>
                  <p className="text-gray-500">
                    Last updated: {audienceSnapshotModel.generatedAtUtc === new Date(0).toISOString()
                      ? "Unavailable"
                      : formatRelativeTime(Date.parse(audienceSnapshotModel.generatedAtUtc), nowMs)}
                    {" | "}Source: {audienceSnapshotModel.sourceState}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-6">
                  <div className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">Expected days</p>
                    <p className="mt-1 text-sm font-semibold text-white">{audienceSnapshotModel.continuity.expectedDays}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">Present days</p>
                    <p className="mt-1 text-sm font-semibold text-white">{audienceSnapshotModel.continuity.presentDays}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">Missing days</p>
                    <p className="mt-1 text-sm font-semibold text-white">{audienceSnapshotModel.continuity.missingDays.length}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">Recovered by GA</p>
                    <p className="mt-1 text-sm font-semibold text-white">{audienceSnapshotModel.recovery.recoveredDays.length}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">Estimated guest days</p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {audienceSnapshotModel.recovery.mode === "estimated_guest_bridge"
                        ? audienceSnapshotModel.recovery.recoveredDays.length
                        : 0}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">Unrecovered days</p>
                    <p className="mt-1 text-sm font-semibold text-white">{audienceSnapshotModel.recovery.unrecoveredDays.length}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2 text-[11px] leading-5 text-gray-300">
                  <p className="font-semibold text-white">{continuityLabel}</p>
                  <p>{audienceSnapshotModel.continuitySummary}</p>
                  <p className="text-gray-500">
                    Users source: GA4 site users | Views source: mixed GA + first-party | Recovery: {audienceSnapshotModel.recovery.mode}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                <MetricCard
                  label="GA4 Users"
                  value={formatAudienceValue(
                    audienceSnapshotModel.totalUsers.value,
                    formatCompactNumber,
                    audienceWaitingLabel,
                  )}
                  hint={audienceSnapshotModel.totalUsers.label}
                  icon={Users}
                  truthState={audienceSnapshotModel.totalUsers.truthState}
                  dictionaryTooltip="GA4 users for the selected range. This is site traffic, not authenticated KandyDrops accounts."
                />
                <MetricCard
                  label="Guest Visits"
                  value={formatAudienceValue(
                    audienceSnapshotModel.guestVisits.value,
                    formatCompactNumber,
                    audienceWaitingLabel,
                  )}
                  hint={audienceSnapshotModel.guestVisits.label}
                  icon={Smartphone}
                  truthState={audienceSnapshotModel.guestVisits.truthState}
                  statusBadgeLabel={guestBadgeLabel}
                  dictionaryTooltip="Guest/public visits. When consented guest batches are missing, this stays estimated and does not become verified first-party traffic."
                />
                <MetricCard
                  label="Sessions"
                  value={formatAudienceValue(
                    audienceSnapshotModel.sessions.value,
                    formatCompactNumber,
                    audienceWaitingLabel,
                  )}
                  hint={
                    audienceSnapshotModel.views.value === null
                      ? audienceSnapshotModel.sessions.label
                      : `${audienceSnapshotModel.views.value.toLocaleString()} GA views`
                  }
                  icon={Activity}
                  truthState={audienceSnapshotModel.sessions.truthState}
                  dictionaryTooltip="GA sessions for the selected range. Page views stay labeled separately so sessions and views are not merged into one implied denominator."
                />
                <MetricCard
                  label="Engagement"
                  value={formatAudienceValue(
                    audienceSnapshotModel.engagementRate.value,
                    formatPercent,
                    audienceWaitingLabel,
                  )}
                  hint={
                    audienceSnapshotModel.avgSession.value === null
                      ? audienceSnapshotModel.engagementRate.label
                      : `${formatDuration(audienceSnapshotModel.avgSession.value)} avg GA session`
                  }
                  icon={Clock3}
                  truthState={audienceSnapshotModel.engagementRate.truthState}
                  dictionaryTooltip="GA engagement rate and average GA session duration. This is not first-party watch or activity quality."
                />
              </div>

              <div className="mt-3 grid gap-2.5 lg:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2 text-[11px] leading-5 text-gray-300">
                  <p className="font-semibold text-white">Guest estimate</p>
                  <p>Source: {audienceSnapshotModel.guestEstimateMetadata.sourceTruth}</p>
                  <p>Formula: {audienceSnapshotModel.guestEstimateMetadata.formula ?? "Unavailable"}</p>
                  <p>Freshness: {audienceSnapshotModel.guestEstimateMetadata.freshnessState}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2 text-[11px] leading-5 text-gray-300">
                  <p className="font-semibold text-white">First-party continuity</p>
                  <p>
                    Last seen: {audienceSnapshotModel.firstParty.lastSeenAtUtc
                      ? formatRelativeTime(Date.parse(audienceSnapshotModel.firstParty.lastSeenAtUtc), nowMs)
                      : "Unavailable"}
                  </p>
                  <p>
                    Missing days: {audienceSnapshotModel.continuity.missingDays.length === 0
                      ? "None"
                      : audienceSnapshotModel.continuity.missingDays.join(", ")}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2 text-[11px] leading-5 text-gray-300">
                  <p className="font-semibold text-white">Recovery</p>
                  <p>{audienceSnapshotModel.recovery.explanation}</p>
                  <p>Estimated share: {audienceSnapshotModel.recovery.estimatedSharePct}%</p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                {audienceSnapshotModel.chartSeries.map((series) => (
                  <span key={series.key} className="inline-flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: series.stroke }}
                    />
                    {series.label}
                  </span>
                ))}
              </div>

              <p className="mt-2 text-[11px] text-gray-500">
                Chart source: GA users plus GA views. First-party continuity gaps stay labeled above and do not become verified first-party traffic.
              </p>

              <div className={`mt-2.5 ${audienceSnapshotModel.chartHeightClass} w-full`}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={audienceHistorySeries}
                    margin={{ top: 4, right: 0, left: -22, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="historyUsersFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#ffffff"
                          stopOpacity={0.22}
                        />
                        <stop
                          offset="95%"
                          stopColor="#ffffff"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      stroke="rgba(255,255,255,0.06)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      stroke="#6b7280"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={20}
                    />
                    <YAxis
                      stroke="#6b7280"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<AnalyticsTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="users"
                      name="GA users"
                      stroke="#ffffff"
                      strokeWidth={2.5}
                      fill="url(#historyUsersFill)"
                    />
                    <Area
                      type="monotone"
                      dataKey="views"
                      name="Views"
                      stroke="#b28cff"
                      strokeWidth={2}
                      fillOpacity={0}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
              <SectionCard
                title="Return Cadence"
                subtitle="Authenticated users grouped by distinct return days in the selected range."
                icon={Route}
                rightSlot={renderSectionRangeControl("returnCadence")}
              >
                <div
                  className="mb-3 space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] leading-5 text-gray-300"
                  data-return-cadence-source-truth={returnCadenceModel.sourceTruth}
                  data-return-cadence-freshness={returnCadenceModel.freshnessState}
                  data-return-cadence-tracked-users={String(returnCadenceModel.trackedAuthenticatedUsers)}
                  data-return-cadence-unique-returners={String(returnCadenceModel.uniqueReturners)}
                  data-return-cadence-bucket-one={String(returnCadenceModel.buckets.oneDay)}
                  data-return-cadence-bucket-two={String(returnCadenceModel.buckets.twoDays)}
                  data-return-cadence-bucket-three-four={String(returnCadenceModel.buckets.threeToFourDays)}
                  data-return-cadence-bucket-five-plus={String(returnCadenceModel.buckets.fivePlusDays)}
                  data-return-cadence-generated-at-utc={returnCadenceModel.generatedAtUtc}
                >
                  {returnCadenceModel.visibleCopy.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                  <p className="text-gray-500">
                    Source: {returnCadenceModel.sourceLabel}
                    {" | "}Freshness: {returnCadenceModel.freshnessState}
                    {" | "}Range: {returnCadenceModel.range}
                  </p>
                  <p className="text-gray-500">
                    Generated: {returnCadenceModel.generatedAtUtc === new Date(0).toISOString()
                      ? "Unavailable"
                      : formatRelativeTime(Date.parse(returnCadenceModel.generatedAtUtc), nowMs)}
                  </p>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={returnCadenceModel.fakeZeroPrevented ? [] : returnCadenceModel.chartSegments}
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
                        dataKey="users"
                        name="Users"
                        fill="#b28cff"
                        radius={[10, 10, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-4">
                  {[
                    { label: "1 day", count: returnCadenceModel.buckets.oneDay },
                    { label: "2 days", count: returnCadenceModel.buckets.twoDays },
                    { label: "3-4 days", count: returnCadenceModel.buckets.threeToFourDays },
                    { label: "5+ days", count: returnCadenceModel.buckets.fivePlusDays },
                  ].map((bucket) => {
                    const pct = returnCadenceModel.trackedAuthenticatedUsers > 0
                      ? bucket.count / returnCadenceModel.trackedAuthenticatedUsers
                      : 0;
                    return (
                      <div
                        key={bucket.label}
                        className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2 text-[11px] leading-5 text-gray-300"
                      >
                        <p className="font-semibold text-white">{bucket.label}</p>
                        <p>{returnCadenceModel.fakeZeroPrevented ? "[unavailable]" : formatCompactNumber(bucket.count)}</p>
                        <p className="text-gray-500">
                          {returnCadenceModel.fakeZeroPrevented ? "No verified denominator" : formatPercent(pct)}
                        </p>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11px] text-gray-500">
                  {returnCadenceModel.denominatorExplanation}
                </p>
                <div className="mt-4 grid gap-3 border-t border-white/5 pt-4 md:grid-cols-3">
                  <MetricCard
                    label="Tracked Auth Users"
                    value={
                      returnCadenceModel.fakeZeroPrevented
                        ? "[unavailable]"
                        : formatCompactNumber(returnCadenceModel.trackedAuthenticatedUsers)
                    }
                    hint={returnCadenceModel.sourceTruth === "missing"
                      ? "No verified zero should be displayed"
                      : "Authenticated activity days in range"}
                    icon={Users}
                    truthState={returnCadenceTruthState}
                    dictionaryTooltip="Tracked authenticated users are users with at least one qualifying authenticated activity day in the selected range."
                  />
                  <MetricCard
                    label="Unique Returners"
                    value={returnCadenceModel.fakeZeroPrevented
                      ? "[unavailable]"
                      : formatCompactNumber(returnCadenceModel.uniqueReturners)}
                    hint={returnCadenceModel.sourceTruth === "missing"
                      ? "Return cadence source unavailable"
                      : "Users active on 2+ distinct days"}
                    icon={Users}
                    truthState={returnCadenceTruthState}
                    dictionaryTooltip="Count of authenticated users active on two or more distinct days within the selected time window."
                  />
                  <MetricCard
                    label="Conversion"
                    value={returnCadenceModel.fakeZeroPrevented
                      ? "[unavailable]"
                      : formatPercent(returnCadenceModel.conversionPct)}
                    hint={returnCadenceModel.sourceTruth === "missing"
                      ? "Tracked user source unavailable"
                      : `${returnCadenceModel.trackedAuthenticatedUsers.toLocaleString()} tracked authenticated users`}
                    icon={Activity}
                    truthState={returnCadenceTruthState}
                    dictionaryTooltip="The percentage of tracked authenticated users in this window who were active on multiple distinct days."
                  />
                </div>
              </SectionCard>

              <SectionCard
                title="Navigation Destinations"
                subtitle="Top in-app destinations reached from tracked taps."
                icon={Route}
                rightSlot={renderSectionRangeControl("navigationDestinations")}
              >
                <div className="grid gap-4 lg:grid-cols-[0.88fr_1.12fr]">
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={navigationDestinationsMix
                            .slice(0, 6)
                            .map((item: any) => ({
                              name: item.destination,
                              value: item.count,
                            }))}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={52}
                          outerRadius={84}
                          paddingAngle={3}
                        >
                          {navigationDestinationsMix
                            .slice(0, 6)
                            .map((item: any, index: any) => (
                              <Cell
                                key={item.destination}
                                fill={PIE_COLORS[index % PIE_COLORS.length]}
                              />
                            ))}
                        </Pie>
                        <Tooltip content={<AnalyticsTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-3">
                    {navigationDestinationsMix.length > 0 ? (
                      navigationDestinationsMix
                        .slice(0, 6)
                        .map((item: any, index: any) => (
                          <div
                            key={item.destination}
                            className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4"
                          >
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <span
                                  className="h-2.5 w-2.5 rounded-full"
                                  style={{
                                    backgroundColor:
                                      PIE_COLORS[index % PIE_COLORS.length],
                                  }}
                                />
                                <p className="text-sm font-semibold text-white">
                                  {item.destination}
                                </p>
                              </div>
                              <span className="text-sm font-bold text-brand-purple">
                                {item.count.toLocaleString()}
                              </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-white/10">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-brand-purple to-cyan-400"
                                style={{
                                  width: `${Math.max(8, (item.count / Math.max(1, navigationDestinationsMix[0]?.count || 1)) * 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        ))
                    ) : (
                      <div className="rounded-[1.6rem] border border-dashed border-white/10 bg-black/20 p-5 text-sm text-gray-500">
                        Destination drill-down will fill in once more navigation
                        taps are tracked.
                      </div>
                    )}
                  </div>
                </div>
              </SectionCard>
            </div>

            <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
              <SectionCard
                title="Device Mix"
                subtitle="Device share and engagement with mobile kept first."
                icon={Smartphone}
                rightSlot={renderSectionRangeControl("deviceMix")}
              >
                <div className="space-y-3">
                  {deviceMixDevices.length > 0 ? (
                    deviceMixDevices.map((item: any) => {
                      const Icon = getDeviceIcon(item.device);
                      const share =
                        deviceMixTotalUsers > 0
                          ? item.users / deviceMixTotalUsers
                          : 0;
                      return (
                        <div
                          key={item.device}
                          className="rounded-[1.6rem] border border-white/10 bg-black/30 p-4"
                        >
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 text-brand-purple">
                                <Icon className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold capitalize text-white">
                                  {item.device}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {item.sessions.toLocaleString()} sessions
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-black text-white">
                                {formatPercent(share)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatPercent(item.engagementRate)} engaged
                              </p>
                            </div>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-brand-purple to-cyan-400"
                              style={{ width: `${Math.max(8, share * 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-[1.6rem] border border-dashed border-white/10 bg-black/20 p-5 text-sm text-gray-500">
                      Device data will appear after GA has enough sessions for
                      this range.
                    </div>
                  )}
                </div>
              </SectionCard>

              <SectionCard
                title="Top Paths"
                subtitle="Where people are actually spending time."
                icon={FileText}
                rightSlot={renderSectionRangeControl("topPaths")}
              >
                <div className="space-y-3">
                  {topPathsPages.length > 0 ? (
                    topPathsPages.slice(0, 8).map((page: any) => (
                      <div
                        key={page.path}
                        className="rounded-[1.6rem] border border-white/10 bg-black/30 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">
                              {page.path || "/"}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              {page.views.toLocaleString()} views ·{" "}
                              {formatDuration(page.avgTime)} avg time
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-white/5 px-2.5 py-1 text-xs font-semibold text-brand-purple">
                            {formatPercent(page.engagementRate)}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[1.6rem] border border-dashed border-white/10 bg-black/20 p-5 text-sm text-gray-500">
                      No page-path data available yet.
                    </div>
                  )}
                </div>
              </SectionCard>
            </div>

            <SectionCard
              title="Regions"
              subtitle="Geographic demand in a compact mobile-first list."
              icon={MapPin}
              rightSlot={renderSectionRangeControl("regions")}
            >
              <div className="space-y-3">
                {regionsGeo.length > 0 ? (
                  regionsGeo.slice(0, 10).map((item: any) => (
                    <div
                      key={`${item.country}-${item.city}`}
                      className="rounded-[1.6rem] border border-white/10 bg-black/30 p-4"
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {item.city}
                          </p>
                          <p className="text-xs text-gray-500">
                            {item.country}
                          </p>
                        </div>
                        <p className="text-lg font-black text-white">
                          {item.users.toLocaleString()}
                        </p>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-brand-purple"
                          style={{
                            width: `${Math.max(8, (item.users / Math.max(1, regionsGeo[0]?.users || 1)) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1.6rem] border border-dashed border-white/10 bg-black/20 p-5 text-sm text-gray-500">
                    Not enough location data yet for this range.
                  </div>
                )}
              </div>
            </SectionCard>
          </>
    </>
  );
}
