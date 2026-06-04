import React from "react";
import {
  Activity, Clock3, FileText, MapPin, Route, Smartphone, Users,
} from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Pie, PieChart, Cell } from "recharts";
import {
  AnalyticsTooltip,
  AnalyticsViewModeToggle,
  MetricCard,
  SectionCard,
  type AnalyticsViewMode,
} from "@/components/Admin/Analytics/AdminAnalyticsPrimitives";
import {
  buildAdminAnalyticsReturnCadenceBuckets,
  resolveAdminAnalyticsGuestEstimateBadgeLabel,
} from "@/lib/admin-analytics-contracts";
import { formatAdminAnalyticsEvidenceSourceLabel } from "@/lib/analytics/admin-analytics-display-state";
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
    navigationDestinationsRange,
    deviceMixRange, devices, getDeviceIcon,
    topPathsRange, pages,
    regionsRange, geo,
    audienceHistorySeries, audienceSnapshotModel, returnCadenceModel, navigationDestinationsModel, deviceMixDevices, deviceMixTotalUsers, deviceMixModel, topPathsPages, topPathsModel, regionsGeo,
    regionsModel,

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
  const guestBadgeLabel = resolveAdminAnalyticsGuestEstimateBadgeLabel(
    audienceSnapshotModel.guestEstimateFormulaUsed,
  );
  const verifiedSnapshotLabel = formatAdminAnalyticsEvidenceSourceLabel("verified_snapshot");
  const vendorEvidenceLabel = formatAdminAnalyticsEvidenceSourceLabel("vendor_evidence");
  const debugRecoveryLabel = formatAdminAnalyticsEvidenceSourceLabel("debug_only");
  const recoveryReviewLabel = formatAdminAnalyticsEvidenceSourceLabel("recovery_review_only");
  const returnCadenceBuckets = buildAdminAnalyticsReturnCadenceBuckets(returnCadenceModel);
  const continuityLabel = audienceSnapshotModel.continuity.gapSeverity === "error"
    ? "Traffic gap detected"
    : audienceSnapshotModel.continuity.gapSeverity === "review"
      ? "Continuity needs review"
      : "Continuity verified";
  const [topPathsSearch, setTopPathsSearch] = React.useState("");
  const [topPathsFilter, setTopPathsFilter] = React.useState<
    | "all"
    | "high_volume_low_engagement"
    | "zero_time"
    | "creator"
    | "legal_static"
    | "dashboard_authenticated"
  >("all");
  const [topPathsPage, setTopPathsPage] = React.useState(1);
  const [topPathsPageSize, setTopPathsPageSize] = React.useState(10);
  const [deviceMixViewMode, setDeviceMixViewMode] = React.useState<AnalyticsViewMode>("cards");
  const [navigationDestinationsViewMode, setNavigationDestinationsViewMode] = React.useState<AnalyticsViewMode>("cards");
  const [topPathsViewMode, setTopPathsViewMode] = React.useState<AnalyticsViewMode>("cards");
  const [regionsViewMode, setRegionsViewMode] = React.useState<AnalyticsViewMode>("cards");
  const filteredTopPathRows = React.useMemo(() => {
    const search = topPathsSearch.trim().toLowerCase();
    return topPathsModel.rows.filter((row) => {
      const matchesSearch =
        search.length === 0
          || row.path.toLowerCase().includes(search)
          || row.label.toLowerCase().includes(search);
      if (!matchesSearch) {
        return false;
      }

      switch (topPathsFilter) {
        case "high_volume_low_engagement":
          return row.issueState === "warning";
        case "zero_time":
          return (row.avgTimeSeconds ?? 0) <= 1;
        case "creator":
          return row.routeGroup === "creator";
        case "legal_static":
          return row.routeGroup === "legal" || row.routeGroup === "support";
        case "dashboard_authenticated":
          return row.routeGroup === "dashboard" || row.routeGroup === "auth";
        default:
          return true;
      }
    });
  }, [topPathsFilter, topPathsModel.rows, topPathsSearch]);
  const pagedTopPathRows = React.useMemo(() => {
    const startIndex = (topPathsPage - 1) * topPathsPageSize;
    return filteredTopPathRows.slice(startIndex, startIndex + topPathsPageSize);
  }, [filteredTopPathRows, topPathsPage, topPathsPageSize]);
  const topPathsTotalPages = Math.max(
    1,
    Math.ceil(filteredTopPathRows.length / Math.max(1, topPathsPageSize)),
  );
  const topPathsHasNextPage = topPathsPage < topPathsTotalPages;
  React.useEffect(() => {
    setTopPathsPage(1);
  }, [topPathsFilter, topPathsPageSize, topPathsSearch, topPathsRange]);
  React.useEffect(() => {
    if (topPathsPage > topPathsTotalPages) {
      setTopPathsPage(topPathsTotalPages);
    }
  }, [topPathsPage, topPathsTotalPages]);
  const [regionsFilterMode, setRegionsFilterMode] = React.useState<
    "raw" | "external_only" | "admin_excluded" | "comparison"
  >(regionsModel.filterMode);
  React.useEffect(() => {
    setRegionsFilterMode(regionsModel.filterMode);
  }, [regionsModel.filterMode, regionsRange]);
  const filteredRegionRows = React.useMemo(() => {
    switch (regionsFilterMode) {
      case "external_only":
        return regionsModel.rows.filter((row) => row.adjustedCount > 0);
      case "admin_excluded":
        return regionsModel.rows.filter((row) => row.adminInternalCount > 0 || row.adjustedCount > 0);
      default:
        return regionsModel.rows;
    }
  }, [regionsFilterMode, regionsModel.rows]);
  const regionRowsForDisplay = React.useMemo(() => {
    const rows = filteredRegionRows.slice();
    rows.sort((left, right) => {
      const leftCount = regionsFilterMode === "raw" ? left.rawCount : left.adjustedCount;
      const rightCount = regionsFilterMode === "raw" ? right.rawCount : right.adjustedCount;
      return rightCount - leftCount;
    });
    return rows.slice(0, 10);
  }, [filteredRegionRows, regionsFilterMode]);
  const formatRegionLabel = (item: typeof regionsModel.rows[number]) => {
    if (!item.city && !item.country) {
      return "Unknown location";
    }
    if (!item.city && item.country) {
      return `Unknown city, ${item.country}`;
    }
    if (item.city && !item.country) {
      return `${item.city}, Unknown country`;
    }
    return `${item.city}, ${item.country}`;
  };
  const formatRegionCount = (count: number) => {
    const unitLabel = count === 1
      ? regionsModel.countUnit.replace(/s$/u, "")
      : regionsModel.countUnit;
    return `${count.toLocaleString()} ${unitLabel}`;
  };
  const regionPrimaryMetricLabel = regionsFilterMode === "raw"
    ? "Raw traffic"
    : "Adjusted external";
  const regionChartRows = React.useMemo(() => (
    regionRowsForDisplay.map((item) => ({
      ...item,
      displayLabel: formatRegionLabel(item),
      chartLabel: formatRegionLabel(item).length > 18
        ? `${formatRegionLabel(item).slice(0, 18)}...`
        : formatRegionLabel(item),
    }))
  ), [regionRowsForDisplay]);

  return (
    <>
<>
            <SectionCard
              title="Audience Snapshot"
              subtitle="Vendor estimates and first-party snapshot context for the selected range."
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
                data-admin-analytics-snapshot-priority="analytics_admin_metric_snapshots"
                data-admin-analytics-vendor-source-label="vendor_evidence"
                data-admin-analytics-raw-ledger-display="debug_only"
                data-admin-analytics-recovery-promotion="debug_only_not_promoted"
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
                  <p className="text-gray-500">
                    Source labels: {verifiedSnapshotLabel} wins; {vendorEvidenceLabel} is supporting evidence, not product truth.
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
                    Users source: {vendorEvidenceLabel} (GA4 site users) | Views source: vendor evidence + first-party snapshot | Recovery: {audienceSnapshotModel.recovery.mode}
                  </p>
                  <p className="text-gray-500">
                    Recovery label: {debugRecoveryLabel}; {recoveryReviewLabel}.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                <MetricCard
                  label="GA4 Users (estimated)"
                  value={formatAudienceValue(
                    audienceSnapshotModel.totalUsers.value,
                    formatCompactNumber,
                    audienceWaitingLabel,
                  )}
                  hint={audienceSnapshotModel.totalUsers.label}
                  icon={Users}
                  truthState={audienceSnapshotModel.totalUsers.truthState}
                  dictionaryTooltip="GA4 users for the selected range are vendor evidence only. They are site traffic estimates, not authenticated KandyDrops accounts or product truth."
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
                <details className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2 text-[11px] leading-5 text-gray-300" data-product-surface-integrity-debug-detail>
                  <summary className="cursor-pointer list-none font-semibold text-white">Guest estimate source detail</summary>
                  <p>Label: {vendorEvidenceLabel}</p>
                  <p>Source: {audienceSnapshotModel.guestEstimateMetadata.sourceTruth}</p>
                  <p>Formula: {audienceSnapshotModel.guestEstimateMetadata.formula ?? "Unavailable"}</p>
                  <p>Freshness: {audienceSnapshotModel.guestEstimateMetadata.freshnessState}</p>
                </details>
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
                Chart source: vendor evidence plus first-party continuity context. Vendor analytics are supporting evidence, not product truth, and continuity gaps do not become verified first-party traffic.
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
                  {returnCadenceBuckets.map((bucket) => {
                    return (
                      <div
                        key={bucket.label}
                        className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2 text-[11px] leading-5 text-gray-300"
                      >
                        <p className="font-semibold text-white">{bucket.label}</p>
                        <p>{bucket.countDisplay ?? formatCompactNumber(bucket.count)}</p>
                        <p className="text-gray-500">
                          {bucket.percentDisplay ?? formatPercent(bucket.pct)}
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
                subtitle="Top in-app destinations reached from intentional navigation telemetry."
                icon={Route}
                density="compact"
                summaryLine={`${navigationDestinationsModel.totalNavigationEvents.toLocaleString()} events | ${navigationDestinationsModel.sourceModeLabel}`}
                rightSlot={(
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <AnalyticsViewModeToggle
                      value={navigationDestinationsViewMode}
                      onChange={setNavigationDestinationsViewMode}
                      options={[
                        { id: "cards", label: "Cards" },
                        { id: "chart", label: "Chart" },
                        { id: "table", label: "Table" },
                      ]}
                    />
                    {renderSectionRangeControl("navigationDestinations")}
                  </div>
                )}
              >
                <div
                  className="mb-3 space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] leading-5 text-gray-300"
                  data-navigation-source-mode={navigationDestinationsModel.sourceMode}
                  data-navigation-total-events={String(navigationDestinationsModel.totalNavigationEvents)}
                  data-navigation-explicit-taps={String(navigationDestinationsModel.explicitTapCount)}
                  data-navigation-fallback-views={String(navigationDestinationsModel.fallbackViewCount)}
                  data-navigation-generated-at-utc={navigationDestinationsModel.generatedAtUtc}
                >
                  {navigationDestinationsModel.visibleCopy.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                  <p className="text-gray-500">
                    Source mode: {navigationDestinationsModel.sourceModeLabel}
                    {" | "}Total: {navigationDestinationsModel.totalNavigationEvents.toLocaleString()}
                    {" | "}Explicit taps: {navigationDestinationsModel.explicitTapCount.toLocaleString()}
                    {" | "}Fallback views: {navigationDestinationsModel.fallbackViewCount.toLocaleString()}
                  </p>
                  <p className="text-gray-500">
                    Range: {navigationDestinationsModel.range}
                    {" | "}Last updated: {navigationDestinationsModel.generatedAtUtc === new Date(0).toISOString()
                      ? "Unavailable"
                      : formatRelativeTime(Date.parse(navigationDestinationsModel.generatedAtUtc), nowMs)}
                    {" | "}Missing sources: {navigationDestinationsModel.missingSourceCount}
                  </p>
                </div>
                <div
                  className="space-y-3"
                  data-admin-analytics-mobile-view-mode={navigationDestinationsViewMode}
                  data-navigation-destinations-range={navigationDestinationsModel.range}
                  data-navigation-destinations-source-mode={navigationDestinationsModel.sourceMode}
                  data-navigation-destinations-generated-at-utc={navigationDestinationsModel.generatedAtUtc}
                  data-navigation-destinations-source-state={navigationDestinationsModel.destinations.length > 0 ? "loaded" : "no_sample"}
                >
                  {navigationDestinationsModel.destinations.length > 0 && navigationDestinationsViewMode === "chart" ? (
                  <div className="h-56 w-full rounded-[1.35rem] border border-white/10 bg-black/25 p-3">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={navigationDestinationsModel.chartRows
                            .slice(0, 6)
                            .map((item) => ({
                              name: item.label,
                              value: item.value,
                            }))}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={52}
                          outerRadius={84}
                          paddingAngle={3}
                        >
                          {navigationDestinationsModel.chartRows
                            .slice(0, 6)
                            .map((item, index) => (
                              <Cell
                                key={item.key}
                                fill={PIE_COLORS[index % PIE_COLORS.length]}
                              />
                            ))}
                        </Pie>
                        <Tooltip content={<AnalyticsTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  ) : null}

                  {navigationDestinationsModel.destinations.length > 0 && navigationDestinationsViewMode === "table" ? (
                    <div
                      className="overflow-x-auto rounded-[1.35rem] border border-white/10 bg-black/25"
                      data-navigation-destinations-table="compact"
                      data-navigation-destinations-range={navigationDestinationsModel.range}
                      data-navigation-destinations-source-mode={navigationDestinationsModel.sourceMode}
                    >
                      <table className="min-w-full text-left text-xs">
                        <thead className="border-b border-white/10 text-[10px] uppercase tracking-[0.12em] text-gray-500">
                          <tr>
                            <th className="px-3 py-2 font-semibold">Destination</th>
                            <th className="px-3 py-2 font-semibold">Events</th>
                            <th className="px-3 py-2 font-semibold">Source</th>
                            <th className="px-3 py-2 font-semibold">Freshness</th>
                            <th className="px-3 py-2 font-semibold">Last seen</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10 text-gray-300">
                          {navigationDestinationsModel.destinations.slice(0, 8).map((item) => (
                            <tr key={`navigation-destinations-table-${item.destinationPath}`}>
                              <td className="max-w-[16rem] px-3 py-2">
                                <div className="truncate font-semibold text-white">{item.destinationLabel}</div>
                                <div className="truncate text-[11px] text-gray-500">{item.destinationPath}</div>
                              </td>
                              <td className="px-3 py-2 font-semibold text-brand-purple">{item.count.toLocaleString()}</td>
                              <td className="px-3 py-2">{item.sourceTruth}</td>
                              <td className="px-3 py-2">{item.freshnessState}</td>
                              <td className="px-3 py-2">
                                {item.lastSeenAtUtc
                                  ? formatRelativeTime(Date.parse(item.lastSeenAtUtc), nowMs)
                                  : "Unavailable"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}

                  {navigationDestinationsViewMode === "cards" ? (
                    <>
                      {navigationDestinationsModel.destinations.length > 0 ? (
                        navigationDestinationsModel.destinations
                          .slice(0, 6)
                          .map((item, index) => (
                          <div
                            key={item.destinationPath}
                            className="rounded-[1.25rem] border border-white/10 bg-black/30 p-3"
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
                                  {item.destinationLabel}
                                </p>
                              </div>
                              <span className="text-sm font-bold text-brand-purple">
                                {item.count.toLocaleString()}
                              </span>
                            </div>
                            <p className="mb-1 text-[11px] text-gray-400">
                              {item.destinationPath}
                            </p>
                            <p className="mb-2 text-[11px] text-gray-500">
                              Source: {item.sourceTruth}
                              {" | "}Freshness: {item.freshnessState}
                              {" | "}Last seen: {item.lastSeenAtUtc
                                ? formatRelativeTime(Date.parse(item.lastSeenAtUtc), nowMs)
                                : "Unavailable"}
                            </p>
                            <p className="mb-2 text-[11px] text-gray-500">
                              Top source events: {item.topSourceEvents.join(", ")}
                            </p>
                            <p className="mb-3 text-[11px] text-gray-400">
                              {item.explanation}
                            </p>
                            <div className="h-2 overflow-hidden rounded-full bg-white/10">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-brand-purple to-cyan-400"
                                style={{
                                  width: `${Math.max(8, (item.count / Math.max(1, navigationDestinationsModel.destinations[0]?.count || 1)) * 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                          ))
                      ) : (
                        <div className="rounded-[1.6rem] border border-dashed border-white/10 bg-black/20 p-5 text-sm text-gray-500">
                          {navigationDestinationsModel.missingReason
                            ?? "No navigation tap or destination-view events found in this range."}
                          <p className="mt-2 text-xs text-gray-600">
                            {navigationDestinationsModel.expectedEventsLabel}
                          </p>
                        </div>
                      )}
                    </>
                  ) : navigationDestinationsModel.destinations.length === 0 ? (
                    <div className="rounded-[1.6rem] border border-dashed border-white/10 bg-black/20 p-5 text-sm text-gray-500">
                      {navigationDestinationsModel.missingReason
                        ?? "No navigation tap or destination-view events found in this range."}
                      <p className="mt-2 text-xs text-gray-600">
                        {navigationDestinationsModel.expectedEventsLabel}
                      </p>
                    </div>
                  ) : null}
                </div>
              </SectionCard>
            </div>

            <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
              <SectionCard
                title="Device Mix"
                subtitle="Compact device intelligence with source truth and mobile-first implications."
                icon={Smartphone}
                density="compact"
                summaryLine={`${deviceMixModel.totalSessions.toLocaleString()} sessions | ${deviceMixModel.classifiedSessions.toLocaleString()} classified | source ${deviceMixModel.sourceLabel}`}
                rightSlot={(
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <AnalyticsViewModeToggle
                      value={deviceMixViewMode}
                      onChange={setDeviceMixViewMode}
                      options={[
                        { id: "cards", label: "Cards" },
                        { id: "chart", label: "Chart" },
                        { id: "table", label: "Table" },
                      ]}
                    />
                    {renderSectionRangeControl("deviceMix")}
                  </div>
                )}
              >
                <div
                  className="mb-3 space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] leading-5 text-gray-300"
                  data-device-mix-source-truth={deviceMixModel.sourceTruth}
                  data-device-mix-freshness={deviceMixModel.freshnessState}
                  data-device-mix-total-sessions={String(deviceMixModel.totalSessions)}
                  data-device-mix-classified-sessions={String(deviceMixModel.classifiedSessions)}
                  data-device-mix-unknown-sessions={String(deviceMixModel.unknownSessions)}
                  data-device-mix-generated-at-utc={deviceMixModel.generatedAtUtc}
                >
                  {deviceMixModel.visibleCopy.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                  <p className="text-gray-500">
                    Range: {deviceMixModel.range}
                    {" | "}Source: {deviceMixModel.sourceLabel}
                    {" | "}Freshness: {deviceMixModel.freshnessLabel}
                  </p>
                  <p className="text-gray-500">
                    Total sessions: {deviceMixModel.totalSessions.toLocaleString()}
                    {" | "}Classified: {deviceMixModel.classifiedSessions.toLocaleString()}
                    {" | "}Unknown: {deviceMixModel.unknownSessions.toLocaleString()}
                  </p>
                  <p className="text-gray-500">
                    Generated: {deviceMixModel.generatedAtUtc === new Date(0).toISOString()
                      ? "Unavailable"
                      : formatRelativeTime(Date.parse(deviceMixModel.generatedAtUtc), nowMs)}
                    {" | "}Engagement: {deviceMixModel.engagementDefinition}
                  </p>
                </div>
                <div className="mb-3 grid gap-2 md:grid-cols-2">
                  {deviceMixModel.designImplications.map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2 text-[11px] leading-5 text-gray-300"
                    >
                      {item}
                    </div>
                  ))}
                </div>
                <div
                  className="space-y-3"
                  data-admin-analytics-mobile-view-mode={deviceMixViewMode}
                >
                  {deviceMixModel.rows.length > 0 && deviceMixViewMode === "chart" ? (
                    <div className="rounded-[1rem] border border-white/10 bg-black/25 p-3">
                      <div className="h-56 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={deviceMixModel.rows.map((item) => ({
                                name: item.deviceCategory,
                                value: item.sessions,
                              }))}
                              dataKey="value"
                              nameKey="name"
                              innerRadius={42}
                              outerRadius={78}
                              paddingAngle={2}
                            >
                              {deviceMixModel.rows.map((item, index) => (
                                <Cell
                                  key={`device-mix-${item.deviceCategory}`}
                                  fill={PIE_COLORS[index % PIE_COLORS.length]}
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              content={
                                <AnalyticsTooltip
                                  valueFormatter={(value) => `${Number(value).toLocaleString()} sessions`}
                                />
                              }
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-3 grid gap-2 text-[11px] text-gray-300 sm:grid-cols-2">
                        {deviceMixModel.rows.map((item, index) => (
                          <div key={`legend-${item.deviceCategory}`} className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                            <span className="flex min-w-0 items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                              />
                              <span className="truncate capitalize">{item.deviceCategory}</span>
                            </span>
                            <span className="font-semibold text-white">{formatPercent(item.sessionSharePct)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {deviceMixModel.rows.length > 0 && deviceMixViewMode === "table" ? (
                    <div className="overflow-hidden rounded-[1rem] border border-white/10 bg-black/25">
                      <div className="hidden grid-cols-[1.1fr_0.8fr_0.7fr_0.8fr_0.8fr] gap-2 border-b border-white/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 md:grid">
                        <span>Device</span>
                        <span>Sessions</span>
                        <span>Share</span>
                        <span>Engaged</span>
                        <span>Truth</span>
                      </div>
                      <div className="divide-y divide-white/10">
                        {deviceMixModel.rows.map((item) => (
                          <div
                            key={`table-${item.deviceCategory}`}
                            className="grid gap-2 px-3 py-2 text-[11px] text-gray-300 md:grid-cols-[1.1fr_0.8fr_0.7fr_0.8fr_0.8fr]"
                          >
                            <p className="font-semibold capitalize text-white">{item.deviceCategory}</p>
                            <p><span className="text-gray-500 md:hidden">Sessions: </span>{item.sessions.toLocaleString()}</p>
                            <p><span className="text-gray-500 md:hidden">Share: </span>{formatPercent(item.sessionSharePct)}</p>
                            <p><span className="text-gray-500 md:hidden">Engaged: </span>{item.engagedSessions === null ? "Unavailable" : item.engagedSessions.toLocaleString()}</p>
                            <p className="truncate"><span className="text-gray-500 md:hidden">Truth: </span>{item.sourceTruth}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {deviceMixModel.rows.length > 0 && deviceMixViewMode === "cards" ? (
                    deviceMixModel.rows.map((item) => {
                      const Icon = getDeviceIcon(item.deviceCategory);
                      return (
                        <div
                          key={item.deviceCategory}
                          className="rounded-[1rem] border border-white/10 bg-black/30 p-3"
                        >
                          <div className="mb-2 flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-brand-purple">
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold capitalize text-white">
                                  {item.deviceCategory}
                                </p>
                                <p className="text-[11px] text-gray-500">
                                  {item.sessions.toLocaleString()} sessions
                                  {" | "}Source: {item.sourceTruth}
                                  {" | "}Confidence: {item.confidenceState}
                                </p>
                              </div>
                            </div>
                            <div className="text-right text-[11px]">
                              <p className="text-base font-black text-white">
                                {formatPercent(item.sessionSharePct)}
                              </p>
                              <p className="text-gray-500">
                                {item.engagementRatePct === null
                                  ? "Engagement unavailable"
                                  : `${formatPercent(item.engagementRatePct)} engaged`}
                              </p>
                            </div>
                          </div>
                          <div className="mb-2 grid grid-cols-2 gap-2 text-[11px] text-gray-400 md:grid-cols-4">
                            <div className="rounded-xl bg-white/5 px-2 py-1.5">
                              <p className="text-[10px] uppercase tracking-[0.12em] text-gray-500">Sessions</p>
                              <p className="mt-0.5 font-semibold text-white">{item.sessions.toLocaleString()}</p>
                            </div>
                            <div className="rounded-xl bg-white/5 px-2 py-1.5">
                              <p className="text-[10px] uppercase tracking-[0.12em] text-gray-500">Share</p>
                              <p className="mt-0.5 font-semibold text-white">{formatPercent(item.sessionSharePct)}</p>
                            </div>
                            <div className="rounded-xl bg-white/5 px-2 py-1.5">
                              <p className="text-[10px] uppercase tracking-[0.12em] text-gray-500">Engaged</p>
                              <p className="mt-0.5 font-semibold text-white">
                                {item.engagedSessions === null ? "Unavailable" : item.engagedSessions.toLocaleString()}
                              </p>
                            </div>
                            <div className="rounded-xl bg-white/5 px-2 py-1.5">
                              <p className="text-[10px] uppercase tracking-[0.12em] text-gray-500">Commerce / watch</p>
                              <p className="mt-0.5 font-semibold text-white">
                                {deviceMixModel.commerceByDeviceAvailable || deviceMixModel.watchByDeviceAvailable
                                  ? "Available"
                                  : "Unavailable"}
                              </p>
                            </div>
                          </div>
                          <p className="mb-2 text-[11px] text-gray-500">
                            {item.recommendation}
                          </p>
                          <div className="h-2 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-brand-purple to-cyan-400"
                              style={{ width: `${Math.max(8, item.sessionSharePct * 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : null}

                  {deviceMixModel.rows.length === 0 ? (
                    <div className="rounded-[1rem] border border-dashed border-white/10 bg-black/20 p-5 text-sm text-gray-500">
                      Device data will appear after GA has enough sessions for
                      this range.
                    </div>
                  ) : null}
                </div>
                <div className="mt-3 rounded-2xl border border-white/10 bg-black/25 px-3 py-2 text-[11px] leading-5 text-gray-300">
                  <p className="font-semibold text-white">Optional device metrics</p>
                  <p>
                    Purchase rate, unwrap rate, bounce rate, average session length, and watch time by device are unavailable in this lane until a canonical per-device source exists.
                  </p>
                </div>
              </SectionCard>

              <SectionCard
                title="Top Paths"
                subtitle="Paginated path analytics with source truth and engagement context."
                icon={FileText}
                rightSlot={(
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <AnalyticsViewModeToggle
                      value={topPathsViewMode}
                      onChange={setTopPathsViewMode}
                      options={[
                        { id: "cards", label: "Cards" },
                        { id: "chart", label: "Chart" },
                        { id: "table", label: "Table" },
                      ]}
                    />
                    {renderSectionRangeControl("topPaths")}
                  </div>
                )}
              >
                <div
                  className="mb-3 space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] leading-5 text-gray-300"
                  data-top-paths-source-truth={topPathsModel.sourceTruth}
                  data-top-paths-range={topPathsModel.range}
                  data-top-paths-total-count={String(topPathsModel.totalPathCount)}
                  data-top-paths-page={String(topPathsPage)}
                  data-top-paths-page-size={String(topPathsPageSize)}
                >
                  {topPathsModel.visibleCopy.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                  <p className="text-gray-500">
                    Range: {topPathsModel.range}
                    {" | "}Source: {topPathsModel.sourceLabel}
                    {" | "}Freshness: {topPathsModel.freshnessLabel}
                  </p>
                  <p className="text-gray-500">
                    Total views: {topPathsModel.totalViews.toLocaleString()}
                    {" | "}Paths in snapshot: {topPathsModel.totalPathCount.toLocaleString()}
                    {" | "}Page {topPathsPage} of {topPathsTotalPages}
                  </p>
                  <p className="text-gray-500">
                    Generated: {topPathsModel.generatedAtUtc === new Date(0).toISOString()
                      ? "Unavailable"
                      : formatRelativeTime(Date.parse(topPathsModel.generatedAtUtc), nowMs)}
                    {" | "}Percent column: Engagement
                  </p>
                </div>
                <div className="mb-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
                  <label className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2 text-[11px] text-gray-300">
                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                      Search path
                    </span>
                    <input
                      value={topPathsSearch}
                      onChange={(event) => setTopPathsSearch(event.target.value)}
                      placeholder="/drops"
                      className="w-full bg-transparent text-sm text-white outline-none placeholder:text-gray-600"
                    />
                  </label>
                  <label className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2 text-[11px] text-gray-300">
                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                      Filter
                    </span>
                    <select
                      value={topPathsFilter}
                      onChange={(event) => setTopPathsFilter(event.target.value as typeof topPathsFilter)}
                      className="bg-transparent text-sm text-white outline-none"
                    >
                      {topPathsModel.availableFilterKeys.map((item) => (
                        <option key={item.value} value={item.value} className="bg-slate-900">
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2 text-[11px] text-gray-300">
                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                      Page size
                    </span>
                    <select
                      value={topPathsPageSize}
                      onChange={(event) => setTopPathsPageSize(Number(event.target.value))}
                      className="bg-transparent text-sm text-white outline-none"
                    >
                      {[10, 25, 50].map((size) => (
                        <option key={size} value={size} className="bg-slate-900">
                          {size}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2 text-[11px] text-gray-300">
                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                      Snapshot scope
                    </span>
                    <p className="text-sm text-white">
                      {topPathsModel.snapshotLimited
                        ? "Top 25 snapshot only"
                        : "All available rows in snapshot"}
                    </p>
                  </div>
                </div>
                <div
                  className="space-y-2"
                  data-admin-analytics-mobile-view-mode={topPathsViewMode}
                >
                  {pagedTopPathRows.length > 0 && topPathsViewMode === "chart" ? (
                    <div className="h-56 rounded-[1.35rem] border border-white/10 bg-black/25 p-3">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={pagedTopPathRows}
                          margin={{ top: 4, right: 0, left: -22, bottom: 0 }}
                        >
                          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                          <XAxis
                            dataKey="label"
                            stroke="#6b7280"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            interval={0}
                            angle={-18}
                            textAnchor="end"
                            height={52}
                          />
                          <YAxis
                            stroke="#6b7280"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                          />
                          <Tooltip content={<AnalyticsTooltip />} />
                          <Bar dataKey="views" name="Views" fill="#c084fc" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="engagementRatePct" name="Engagement" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : null}

                  {pagedTopPathRows.length > 0 && topPathsViewMode === "table" ? (
                    <div
                      className="overflow-x-auto rounded-[1.35rem] border border-white/10 bg-black/25"
                      data-top-paths-table="compact"
                      data-top-paths-source-truth={topPathsModel.sourceTruth}
                      data-top-paths-page={String(topPathsPage)}
                      data-top-paths-page-size={String(topPathsPageSize)}
                    >
                      <table className="min-w-full text-left text-xs">
                        <thead className="border-b border-white/10 text-[10px] uppercase tracking-[0.12em] text-gray-500">
                          <tr>
                            <th className="px-3 py-2 font-semibold">Path</th>
                            <th className="px-3 py-2 font-semibold">Group</th>
                            <th className="px-3 py-2 font-semibold">Views</th>
                            <th className="px-3 py-2 font-semibold">Share</th>
                            <th className="px-3 py-2 font-semibold">Avg time</th>
                            <th className="px-3 py-2 font-semibold">Engagement</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10 text-gray-300">
                          {pagedTopPathRows.map((row) => (
                            <tr
                              key={`top-path-table-${row.path}`}
                              data-top-paths-path={row.path}
                              data-top-paths-route-group={row.routeGroup}
                              data-top-paths-views={String(row.views)}
                              data-top-paths-issue-state={row.issueState}
                            >
                              <td className="max-w-[18rem] px-3 py-2">
                                <p className="truncate font-semibold text-white">{row.path}</p>
                                <p className="truncate text-[11px] text-gray-500">{row.label}</p>
                              </td>
                              <td className="px-3 py-2">{row.routeGroup}</td>
                              <td className="px-3 py-2">{row.views.toLocaleString()}</td>
                              <td className="px-3 py-2">{formatPercent(row.viewSharePct)}</td>
                              <td className="px-3 py-2">{row.avgTimeDisplay}</td>
                              <td className="px-3 py-2">{row.engagementRatePct === null ? "Unavailable" : formatPercent(row.engagementRatePct)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}

                  {topPathsViewMode === "cards" ? (
                    <>
                      <div className="hidden grid-cols-[minmax(0,2.2fr)_0.9fr_0.9fr_0.9fr_0.9fr_0.8fr] gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 md:grid">
                        <span>Path / label</span>
                        <span>Group</span>
                        <span>Views</span>
                        <span>Share</span>
                        <span>Avg time</span>
                        <span>Engagement</span>
                      </div>
                      {pagedTopPathRows.length > 0 ? (
                    pagedTopPathRows.map((row) => (
                      <div
                        key={row.path}
                        className="rounded-[1.6rem] border border-white/10 bg-black/30 p-4"
                        data-top-paths-path={row.path}
                        data-top-paths-route-group={row.routeGroup}
                        data-top-paths-views={String(row.views)}
                        data-top-paths-avg-time={row.avgTimeDisplay}
                        data-top-paths-engagement-rate={row.engagementRatePct === null ? "unavailable" : String(row.engagementRatePct)}
                        data-top-paths-issue-state={row.issueState}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">
                              {row.path}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              {row.label}
                              {" | "}Source: {row.sourceTruth}
                              {" | "}Confidence: {row.confidenceState}
                            </p>
                          </div>
                          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                            row.issueState === "warning"
                              ? "bg-amber-500/15 text-amber-200"
                              : row.issueState === "review"
                                ? "bg-white/10 text-gray-200"
                                : "bg-emerald-500/15 text-emerald-200"
                          }`}>
                            {row.issueState}
                          </span>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-gray-300 md:grid-cols-[minmax(0,2.2fr)_0.9fr_0.9fr_0.9fr_0.9fr_0.8fr]">
                          <div className="md:hidden" />
                          <p><span className="text-gray-500">Group:</span> {row.routeGroup}</p>
                          <p><span className="text-gray-500">Views:</span> {row.views.toLocaleString()}</p>
                          <p><span className="text-gray-500">Share:</span> {formatPercent(row.viewSharePct)}</p>
                          <p><span className="text-gray-500">Avg time:</span> {row.avgTimeDisplay}</p>
                          <p><span className="text-gray-500">Engagement:</span> {row.engagementRatePct === null ? "Unavailable" : formatPercent(row.engagementRatePct)}</p>
                        </div>
                        <p className="mt-2 text-[11px] text-gray-500">
                          {row.explanation}
                        </p>
                      </div>
                    ))
                      ) : (
                    <div className="rounded-[1.6rem] border border-dashed border-white/10 bg-black/20 p-5 text-sm text-gray-500">
                      {topPathsModel.rows.length > 0
                        ? "No paths match the current search/filter selection."
                        : "No page-path data available for this range."}
                    </div>
                      )}
                    </>
                  ) : pagedTopPathRows.length === 0 ? (
                    <div className="rounded-[1.6rem] border border-dashed border-white/10 bg-black/20 p-5 text-sm text-gray-500">
                      {topPathsModel.rows.length > 0
                        ? "No paths match the current search/filter selection."
                        : "No page-path data available for this range."}
                    </div>
                  ) : null}
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-black/25 px-3 py-2 text-[11px] text-gray-300">
                  <p>
                    Showing {pagedTopPathRows.length === 0 ? 0 : ((topPathsPage - 1) * topPathsPageSize) + 1}
                    {pagedTopPathRows.length === 0 ? "" : `-${((topPathsPage - 1) * topPathsPageSize) + pagedTopPathRows.length}`}
                    {" of "}{filteredTopPathRows.length.toLocaleString()} filtered paths
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTopPathsPage((current) => Math.max(1, current - 1))}
                      disabled={topPathsPage <= 1}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white disabled:opacity-40"
                    >
                      Prev
                    </button>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                      Page {topPathsPage}
                    </span>
                    <button
                      type="button"
                      onClick={() => setTopPathsPage((current) => Math.min(topPathsTotalPages, current + 1))}
                      disabled={!topPathsHasNextPage}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </SectionCard>
            </div>

            <SectionCard
              title="Regions"
              subtitle="Raw geography with internal/admin traffic separated from external demand."
              icon={MapPin}
              rightSlot={(
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <AnalyticsViewModeToggle
                    value={regionsViewMode}
                    onChange={setRegionsViewMode}
                    options={[
                      { id: "cards", label: "Cards" },
                      { id: "chart", label: "Chart" },
                      { id: "table", label: "Table" },
                    ]}
                  />
                  {renderSectionRangeControl("regions")}
                </div>
              )}
            >
              <div
                className="space-y-3"
                data-regions-source-truth={regionsModel.sourceTruth}
                data-regions-freshness={regionsModel.freshnessState}
                data-regions-filter-mode={regionsFilterMode}
                data-regions-count-unit={regionsModel.countUnit}
                data-regions-generated-at-utc={regionsModel.generatedAtUtc}
              >
                <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] leading-5 text-gray-300">
                  {regionsModel.visibleCopy.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                  <p className="text-gray-500">
                    Range: {regionsModel.range}
                    {" | "}Source: {regionsModel.sourceLabel}
                    {" | "}Freshness: {regionsModel.freshnessLabel}
                  </p>
                  <p className="text-gray-500">
                    Unit: {regionsModel.countUnit}
                    {" | "}Raw total: {formatRegionCount(regionsModel.rawTotal)}
                    {" | "}Adjusted total: {formatRegionCount(regionsModel.adjustedTotal)}
                  </p>
                  <p className="text-gray-500">
                    Internal/admin excluded: {formatRegionCount(regionsModel.internalExcludedCount)}
                    {" | "}Generated: {regionsModel.generatedAtUtc === new Date(0).toISOString()
                      ? "Unavailable"
                      : formatRelativeTime(Date.parse(regionsModel.generatedAtUtc), nowMs)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "comparison", label: "Compare raw vs adjusted" },
                    { value: "raw", label: "Raw traffic" },
                    { value: "external_only", label: "External demand" },
                    { value: "admin_excluded", label: "Admin/internal excluded" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setRegionsFilterMode(option.value as typeof regionsFilterMode)}
                      className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                        regionsFilterMode === option.value
                          ? "border-brand-purple/60 bg-brand-purple/15 text-white"
                          : "border-white/10 bg-white/5 text-gray-300"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <div
                  className="space-y-2"
                  data-admin-analytics-mobile-view-mode={regionsViewMode}
                  data-regions-source-truth={regionsModel.sourceTruth}
                  data-regions-freshness={regionsModel.freshnessState}
                  data-regions-filter-mode={regionsFilterMode}
                  data-regions-generated-at-utc={regionsModel.generatedAtUtc}
                >
                  {regionRowsForDisplay.length > 0 && regionsViewMode === "chart" ? (
                    <div className="h-56 rounded-[1.35rem] border border-white/10 bg-black/25 p-3">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={regionChartRows}
                          margin={{ top: 4, right: 0, left: -22, bottom: 0 }}
                        >
                          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                          <XAxis
                            dataKey="chartLabel"
                            stroke="#6b7280"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            interval={0}
                            angle={-18}
                            textAnchor="end"
                            height={52}
                          />
                          <YAxis stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                          <Tooltip content={<AnalyticsTooltip />} />
                          <Bar dataKey="rawCount" name="Raw traffic" fill="#c084fc" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="adjustedCount" name="External demand" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : null}

                  {regionRowsForDisplay.length > 0 && regionsViewMode === "table" ? (
                    <div
                      className="overflow-x-auto rounded-[1.35rem] border border-white/10 bg-black/25"
                      data-regions-table="compact"
                      data-regions-source-truth={regionsModel.sourceTruth}
                      data-regions-freshness={regionsModel.freshnessState}
                      data-regions-filter-mode={regionsFilterMode}
                    >
                      <table className="min-w-full text-left text-xs">
                        <thead className="border-b border-white/10 text-[10px] uppercase tracking-[0.12em] text-gray-500">
                          <tr>
                            <th className="px-3 py-2 font-semibold">Region</th>
                            <th className="px-3 py-2 font-semibold">Raw</th>
                            <th className="px-3 py-2 font-semibold">Adjusted</th>
                            <th className="px-3 py-2 font-semibold">Internal/admin</th>
                            <th className="px-3 py-2 font-semibold">Demand state</th>
                            <th className="px-3 py-2 font-semibold">Share</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10 text-gray-300">
                          {regionRowsForDisplay.map((item) => (
                            <tr
                              key={`regions-table-${item.country ?? "unknown-country"}-${item.city ?? "unknown-city"}`}
                              data-regions-row-state={item.demandState}
                            >
                              <td className="max-w-[16rem] px-3 py-2">
                                <p className="truncate font-semibold text-white">{formatRegionLabel(item)}</p>
                                <p className="truncate text-[11px] text-gray-500">{item.explanation}</p>
                              </td>
                              <td className="px-3 py-2">{formatRegionCount(item.rawCount)}</td>
                              <td className="px-3 py-2">{formatRegionCount(item.adjustedCount)}</td>
                              <td className="px-3 py-2">{formatRegionCount(item.adminInternalCount)}</td>
                              <td className="px-3 py-2">{item.demandState.replace(/_/gu, " ")}</td>
                              <td className="px-3 py-2">{formatPercent(regionsFilterMode === "raw" ? item.sharePct : item.adjustedSharePct)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}

                  {regionsViewMode === "cards" ? (
                    <>
                      {regionRowsForDisplay.length > 0 ? (
                        regionRowsForDisplay.map((item) => {
                          const primaryCount = regionsFilterMode === "raw" ? item.rawCount : item.adjustedCount;
                          const barRatio = regionsFilterMode === "raw"
                            ? item.sharePct
                            : item.adjustedSharePct;
                          return (
                            <div
                              key={`${item.country ?? "unknown-country"}-${item.city ?? "unknown-city"}`}
                              className="rounded-[1.6rem] border border-white/10 bg-black/30 p-4"
                              data-regions-row-state={item.demandState}
                            >
                              <div className="mb-2 flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-white">
                                    {formatRegionLabel(item)}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {regionPrimaryMetricLabel}: {formatRegionCount(primaryCount)}
                                    {" | "}Raw: {formatRegionCount(item.rawCount)}
                                  </p>
                                </div>
                                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                                  item.demandState === "mostly_internal"
                                    ? "bg-amber-500/15 text-amber-200"
                                    : item.demandState === "mixed_with_internal" || item.demandState === "review"
                                      ? "bg-white/10 text-gray-200"
                                      : item.demandState === "unknown_location"
                                        ? "bg-slate-500/20 text-slate-200"
                                        : "bg-emerald-500/15 text-emerald-200"
                                }`}>
                                  {item.demandState.replace(/_/gu, " ")}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-300 md:grid-cols-4">
                                <p><span className="text-gray-500">Adjusted:</span> {formatRegionCount(item.adjustedCount)}</p>
                                <p><span className="text-gray-500">Internal/admin:</span> {formatRegionCount(item.adminInternalCount)}</p>
                                <p><span className="text-gray-500">Raw share:</span> {formatPercent(item.sharePct)}</p>
                                <p><span className="text-gray-500">Adjusted share:</span> {formatPercent(item.adjustedSharePct)}</p>
                              </div>
                              <p className="mt-2 text-[11px] text-gray-500">
                                {item.explanation}
                              </p>
                              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                                <div
                                  className="h-full rounded-full bg-brand-purple"
                                  style={{
                                    width: `${Math.max(8, barRatio * 100)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="rounded-[1.6rem] border border-dashed border-white/10 bg-black/20 p-5 text-sm text-gray-500">
                          {regionsModel.rows.length > 0
                            ? "No region rows match the current filter."
                            : "No region geography source is available for this range."}
                        </div>
                      )}
                    </>
                  ) : regionRowsForDisplay.length === 0 ? (
                    <div className="rounded-[1.6rem] border border-dashed border-white/10 bg-black/20 p-5 text-sm text-gray-500">
                      {regionsModel.rows.length > 0
                        ? "No region rows match the current filter."
                        : "No region geography source is available for this range."}
                    </div>
                  ) : null}
                </div>
              </div>
            </SectionCard>
          </>
    </>
  );
}
