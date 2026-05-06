import React from "react";
import {
  Activity, AlertTriangle, CheckCircle2, Clock3, Eye, Monitor, Route, Share2, Sparkles, Users,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AnalyticsTooltip, MetricCard, SectionCard } from "@/components/Admin/Analytics/AdminAnalyticsPrimitives";
import { AdminOnboardingAnalyticsModules } from "@/components/Admin/Analytics/AdminOnboardingAnalyticsModules";
import { AdminStatusBadge } from "@/components/Admin/AdminStatusBadge";
import { coerceAdminSurfaceState, type AdminSurfaceState } from "@/lib/admin-parity";
import { cn } from "@/lib/utils";
import type { AdminAnalyticsState } from "../hooks/useAdminAnalyticsState";

function formatJourneyDenominatorMode(mode: string) {
  if (mode === "raw_event_ratio") return "Prior-step event ratio";
  if (mode === "ordered_transition") return "Ordered journey ratio";
  if (mode === "base_step") return "Base-step ratio";
  if (mode === "prior_step") return "Prior-step ratio";
  return "Event ratio";
}

export function AdminAnalyticsOperationsTab(props: AdminAnalyticsState) {
  const {
    renderSectionRangeControl, liveResponse, historicalResponse, liveLoading, historicalLoading, nowMs, EVENT_LABELS,
    liveSurfaceMix, liveActiveUsers, livePulseOnboardingStats, livePulseOnboardingStartCount, livePulseOnboardingCompletionRate, livePulseFunnel, liveSeries, livePulseModel, journeyFunnelModel,
    liveActiveTruthState, historicalOverviewTruthState,
    journeyFunnelMetrics,
    authOutcomeModel,
    authOnboardingDiscrepancies, onboardingVelocityModel, onboardingVelocityHasData, onboardingVelocityBuckets, onboardingVelocityStartCount, onboardingVelocityCompletionCount, onboardingVelocityCompletionRate, onboardingVelocityDropOffCount, onboardingVelocityStats, onboardingVelocityStartSourceHint, onboardingStepFlowItems,
    formatCompactNumber, formatDuration, formatPercent, formatRelativeTime,
    guestBounceQualityCards, guestBounceQualityModel, guestBounceGlobalSemantics, guestBounceGuestRate, guestBounceEngagedRate, guestBounceIdentifiedRate, guestBounceUserSemantics,
    guestViewsDisplayCount, guestViewsHint, guestBounceRateDisplay, guestBounceHint, guestEngagedRateDisplay, guestEngagedHint,
    topEvents,
    
    // Audience Tab
    totalDeviceUsers, mobileUsers, mobileShare, audienceSnapshotRange, semanticQualityCards, guestBounceRate, identifiedBounceRate, guestEngagedRate,
    returnCadenceSegments,
    navigationDestinationsRange, destinationMix,
    deviceMixRange, devices, getDeviceIcon,
    topPathsRange, pages,
    regionsRange, geo,

    // Commerce Tab
    commerceSnapshotRange, commerce,
    packagePerformanceRange, packagePerformance,
    PIE_COLORS, contentConversionRange, unlockCategoryMix, previewToUnlockRate, checkoutToPurchaseRate,
    topDropConversionRange, topDrops,
    
    // Added remaining
    clearAllFilters, clearViewerFilter, viewerUserFilter, formatMoney, activeViewerFilter,
    eventMixTopEvents, eventMixTopComponentContexts, eventMixModel, topComponentContexts,
    liveInteractionStreamModel
  } = props;

  const livePulseTruthState: AdminSurfaceState = liveActiveTruthState ?? (liveLoading ? "loading" : "failed");
  const historicalMetricTruthState: AdminSurfaceState = historicalOverviewTruthState ?? (historicalLoading ? "loading" : "failed");
  const activeUsersTruthState: AdminSurfaceState = liveResponse?.activeUsersTruthLabel
    ? coerceAdminSurfaceState(liveResponse.activeUsersTruthLabel)
    : livePulseTruthState;
  const realtimeCacheHint = livePulseModel.primaryDisplaySource === "verified_snapshot"
    ? livePulseModel.latestVerifiedSnapshotExists
      ? "Last verified data"
      : "No verified live snapshot yet"
    : liveResponse?.liveTruthLabel === "stale"
    ? "Live updates are delayed"
    : liveResponse?.cacheState === "fresh"
      ? "Updated"
      : liveResponse?.liveTruthLabel === "fallback"
        ? "Showing last verified data"
        : "Live updates";
  const compactLiveMetricClass = "rounded-[1rem] p-2";
  const compactLiveMetricValueClass = "text-lg leading-6 md:text-xl";
  const livePulseBadgeLabel =
    livePulseModel.mode === "delayed_snapshot"
      ? "SNAP"
      : livePulseModel.presenceSourceStatus === "failed"
      ? "ERROR"
      : livePulseModel.presenceSourceStatus === "fallback"
        ? "SNAP"
        : livePulseModel.presenceSourceStatus === "waiting"
          ? "WAIT"
          : livePulseModel.presenceSourceStatus === "cache"
            ? "DELAYED"
            : "LIVE";
  const firstSnapshotLabel = "Waiting for first snapshot";
  const noSnapshotLabel = "No verified snapshot yet";
  const activeNowValue = livePulseModel.activeCount.value === null
    ? liveLoading ? firstSnapshotLabel : noSnapshotLabel
    : formatCompactNumber(livePulseModel.activeCount.value);
  const guestAuthMixValue = livePulseModel.guestMixLabel;
  const topSurfaceValue = livePulseModel.topSurface.value ?? (liveLoading ? firstSnapshotLabel : noSnapshotLabel);
  const lastUpdateValue = liveResponse?.generatedAtMs
    ? formatRelativeTime(liveResponse.generatedAtMs, nowMs)
    : livePulseModel.activeIdentities[0]?.lastSeenLabel ?? (liveLoading ? firstSnapshotLabel : noSnapshotLabel);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    (window as typeof window & {
      __KANDYDROPS_ADMIN_ANALYTICS_LIVE_PULSE_DEBUG__?: typeof livePulseModel;
    }).__KANDYDROPS_ADMIN_ANALYTICS_LIVE_PULSE_DEBUG__ = livePulseModel;
  }, [livePulseModel]);
  const journeyFunnelBadgeLabel = journeyFunnelModel.modeLabel;
  const journeyPercentLabel = (value: number | null) =>
    value === null ? firstSnapshotLabel : formatPercent(value);
  const journeyCountLabel = (value: number | null) =>
    value === null ? firstSnapshotLabel : formatCompactNumber(value);
  const biggestDropoffLabel =
    journeyFunnelModel.biggestDropoffStep && journeyFunnelModel.biggestDropoffPercent !== null
      ? `${journeyFunnelModel.biggestDropoffStep} ${formatPercent(journeyFunnelModel.biggestDropoffPercent)}`
      : "Unavailable";

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    (window as typeof window & {
      __KANDYDROPS_ADMIN_ANALYTICS_JOURNEY_FUNNEL_DEBUG__?: typeof journeyFunnelModel;
    }).__KANDYDROPS_ADMIN_ANALYTICS_JOURNEY_FUNNEL_DEBUG__ = journeyFunnelModel;
  }, [journeyFunnelModel]);
  const authOutcomeBadgeLabel = authOutcomeModel.modeLabel;
  const authCountLabel = (value: number | null) =>
    value === null ? firstSnapshotLabel : formatCompactNumber(value);
  const authPercentLabel = (value: number | null) =>
    value === null ? firstSnapshotLabel : formatPercent(value);
  const authFinishLabel = authOutcomeModel.avgFinish.value === null
    ? "Unavailable"
    : formatDuration(authOutcomeModel.avgFinish.value / 1000);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const debugWindow = window as typeof window & {
      __KANDYDROPS_ADMIN_ANALYTICS_AUTH_OUTCOME_DEBUG__?: typeof authOutcomeModel;
      __KANDYDROPS_ADMIN_ANALYTICS_AUTH_OUTCOME_SPLIT_DEBUG__?: typeof authOutcomeModel;
    };
    debugWindow.__KANDYDROPS_ADMIN_ANALYTICS_AUTH_OUTCOME_DEBUG__ = authOutcomeModel;
    debugWindow.__KANDYDROPS_ADMIN_ANALYTICS_AUTH_OUTCOME_SPLIT_DEBUG__ = authOutcomeModel;
  }, [authOutcomeModel]);
  const guestQualityCountLabel = (value: number | null) =>
    value === null ? "Unavailable" : formatCompactNumber(value);
  const guestQualityRateLabel = (value: number | null) =>
    value === null ? "Unavailable" : formatPercent(value);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    (window as typeof window & {
      __KANDYDROPS_ADMIN_ANALYTICS_GUEST_BOUNCE_QUALITY_DEBUG__?: typeof guestBounceQualityModel;
    }).__KANDYDROPS_ADMIN_ANALYTICS_GUEST_BOUNCE_QUALITY_DEBUG__ = guestBounceQualityModel;
  }, [guestBounceQualityModel]);
  const eventMixCountLabel = (value: number | null) =>
    value === null ? firstSnapshotLabel : formatCompactNumber(value);
  const eventMixShareLabel = (value: number | null) =>
    value === null ? "Share unavailable" : formatPercent(value);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    (window as typeof window & {
      __KANDYDROPS_ADMIN_ANALYTICS_EVENT_MIX_DEBUG__?: typeof eventMixModel;
    }).__KANDYDROPS_ADMIN_ANALYTICS_EVENT_MIX_DEBUG__ = eventMixModel;
  }, [eventMixModel]);
  const streamCountLabel = (value: number | null) =>
    value === null ? firstSnapshotLabel : formatCompactNumber(value);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    (window as typeof window & {
      __KANDYDROPS_ADMIN_ANALYTICS_LIVE_INTERACTION_STREAM_DEBUG__?: typeof liveInteractionStreamModel;
    }).__KANDYDROPS_ADMIN_ANALYTICS_LIVE_INTERACTION_STREAM_DEBUG__ = liveInteractionStreamModel;
  }, [liveInteractionStreamModel]);

  return (
    <>
<>
            <SectionCard
              title="Live Pulse"
              subtitle="First-party realtime presence and graph health."
              icon={Activity}
              defaultExpanded
              rightSlot={renderSectionRangeControl("livePulse")}
            >
              <div className="mb-2.5 flex flex-col gap-2 rounded-[1rem] border border-white/10 bg-white/[0.035] px-3 py-2 text-[11px] leading-5 text-gray-300 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <p>{livePulseModel.topWarning}</p>
                  {livePulseModel.topWarningDetail ? (
                    <p className="mt-1 text-[10px] text-gray-400">{livePulseModel.topWarningDetail}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold text-gray-300">
                    {livePulseModel.refreshState === "refreshing" ? "Refreshing" : "Ready"}
                  </span>
                  <AdminStatusBadge
                    state={livePulseTruthState}
                    label={livePulseBadgeLabel}
                    className="max-w-[5.75rem] truncate whitespace-nowrap px-1.5 py-0.5 text-[9px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                <MetricCard
                  label="Active Now"
                  value={activeNowValue}
                  hint={realtimeCacheHint}
                  icon={Users}
                  truthState={livePulseTruthState}
                  statusBadgeLabel={livePulseBadgeLabel}
                  className={compactLiveMetricClass}
                  valueClassName={compactLiveMetricValueClass}
                />
                <MetricCard
                  label="Guest / Auth"
                  value={guestAuthMixValue}
                  hint={livePulseModel.guestEstimateState === "estimated"
                    ? `Estimated from ${livePulseModel.guestEstimateSourceLabel ?? "event facts"}`
                    : livePulseModel.guestEstimateState === "not_observed"
                      ? "Guest not observed in this window"
                      : livePulseModel.adminCount.value !== null && livePulseModel.adminCount.value > 0
                        ? `Admin included in auth count (${livePulseModel.adminCount.value})`
                        : "Presence mix"}
                  icon={Sparkles}
                  truthState={activeUsersTruthState}
                  statusBadgeLabel={livePulseModel.guestEstimateState === "estimated" ? "REVIEW" : livePulseBadgeLabel}
                  className={compactLiveMetricClass}
                  valueClassName={compactLiveMetricValueClass}
                />
                <MetricCard
                  label="Top Surface"
                  value={topSurfaceValue}
                  hint={`${livePulseModel.surfaces.length} surfaces`}
                  icon={Monitor}
                  truthState={livePulseTruthState}
                  statusBadgeLabel={livePulseBadgeLabel}
                  className={compactLiveMetricClass}
                  valueClassName="truncate text-base leading-6 md:text-lg"
                />
                <MetricCard
                  label="Last Update"
                  value={lastUpdateValue}
                  hint={livePulseModel.graphSourceMismatch ? "Graph source mismatch" : livePulseModel.graphSourceLabel}
                  icon={Clock3}
                  truthState={livePulseTruthState}
                  statusBadgeLabel={livePulseBadgeLabel}
                  className={compactLiveMetricClass}
                  valueClassName="truncate text-base leading-6 md:text-lg"
                />
              </div>

              <div className={cn("relative mt-2 w-full", livePulseModel.compactChartHeightClass)}>
                <div className="mb-1 flex items-center justify-between gap-2 px-1 text-[10px] text-gray-400">
                  <span>{livePulseModel.graphSourceLabel}</span>
                  <span>{livePulseModel.graphLegendLabel}</span>
                </div>
                {livePulseModel.graphHydrated ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={livePulseModel.graphPoints}
                      margin={{ top: 6, right: 6, left: -24, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="liveUsersFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#b28cff" stopOpacity={0.32} />
                          <stop offset="95%" stopColor="#b28cff" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="liveViewsFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ffffff" stopOpacity={0.22} />
                          <stop offset="95%" stopColor="#ffffff" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="label" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip content={<AnalyticsTooltip />} />
                      <Area type="monotone" dataKey="users" name="Active users" stroke="#b28cff" strokeWidth={2} fill="url(#liveUsersFill)" />
                      <Area type="monotone" dataKey="views" name="Page views" stroke="#ffffff" strokeWidth={2} fill="url(#liveViewsFill)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-[1rem] border border-dashed border-white/10 bg-black/25 px-3 text-center text-xs text-gray-400">
                    {livePulseModel.backendSnapshotStatus === "available"
                      ? "Graph awaiting live upgrade."
                      : liveLoading ? "Graph awaiting first snapshot." : "No verified graph data yet."}
                  </div>
                )}
              </div>

              <div className="mt-2 grid gap-2 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-[1rem] border border-white/10 bg-black/30 p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                      Realtime surfaces
                    </p>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold text-gray-300">
                      {livePulseModel.surfaces.length} lanes
                    </span>
                  </div>
                  <div className="space-y-2">
                    {livePulseModel.surfaces.length > 0 ? (
                      livePulseModel.surfaces.map((item) => (
                        <div
                          key={item.key}
                          className="rounded-[0.9rem] border border-white/10 bg-white/[0.03] px-3 py-2"
                        >
                          <div className="mb-1.5 flex items-center justify-between gap-3">
                          <p className="truncate text-xs font-semibold text-white">
                              {item.label}
                            </p>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-brand-purple">
                                {item.activeUsers}
                              </span>
                              <AdminStatusBadge
                                state={item.freshness}
                                label={item.freshness === "live" ? "LIVE" : item.freshness === "degraded" ? "DELAYED" : "STALE"}
                                className="max-w-[4.75rem] truncate whitespace-nowrap px-1.5 py-0.5 text-[9px]"
                              />
                            </div>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-brand-purple to-cyan-400"
                              style={{
                                width: `${Math.max(8, (item.activeUsers / Math.max(1, livePulseModel.surfaces[0]?.activeUsers || 1)) * 100)}%`,
                              }}
                            />
                          </div>
                          <p className="mt-1.5 text-[10px] text-gray-500">
                            Seen {formatRelativeTime(item.lastSeenAt, nowMs)} · {item.source}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[0.9rem] border border-dashed border-white/10 bg-black/20 p-3 text-xs text-gray-500">
                        <AdminStatusBadge state={livePulseTruthState} className="mb-2" />
                        Surface detail has no verified live upgrade yet.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-[1rem] border border-white/10 bg-black/30 p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                      Active identities
                    </p>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold text-gray-300">
                      {livePulseModel.activeIdentities.length} shown
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {livePulseModel.activeIdentities.length > 0 ? (
                      livePulseModel.activeIdentities.map((item) => (
                        <div
                          key={item.rawId}
                          title={item.fullDebugId}
                          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-[0.9rem] border border-white/10 bg-white/[0.03] px-3 py-2"
                        >
                          <div className="min-w-0">
                            <div className="flex min-w-0 items-center gap-1.5">
                              <p className="truncate text-xs font-semibold text-white">
                                {item.displayLabel}
                              </p>
                              <span className="shrink-0 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] font-bold text-gray-300">
                                {item.actorBadgeLabel}
                              </span>
                              <span className="shrink-0 rounded border border-white/10 bg-black/30 px-1.5 py-0.5 text-[9px] font-bold text-gray-300">
                                {item.purposeLabel}
                              </span>
                            </div>
                            <p className="mt-1 truncate text-[10px] text-gray-500">
                              {item.routeLabel} · {item.actionLabel}
                            </p>
                            <p className="mt-1 truncate text-[10px] text-gray-500">
                              {item.shortUserId} · {item.sourceTruth}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="rounded-full border border-white/10 bg-black/30 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-gray-300">
                              {item.lastSeenLabel}
                            </span>
                            <AdminStatusBadge
                              state={item.truthState}
                              label={item.statusLabel}
                              className="max-w-[4.5rem] truncate whitespace-nowrap px-1.5 py-0.5 text-[9px]"
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[0.9rem] border border-dashed border-white/10 bg-black/20 p-3 text-xs text-gray-500">
                        <AdminStatusBadge state={activeUsersTruthState} className="mb-2" />
                        {livePulseModel.fakeZeroPrevented
                          ? "No verified active identity rows yet."
                          : "No active identity details are available."}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title={journeyFunnelModel.visibleTitle}
              subtitle="Event chain with source and denominator truth."
              icon={Eye}
              rightSlot={renderSectionRangeControl("journeyFunnel")}
            >
              <div className="mb-2.5 flex flex-col gap-2 rounded-[1rem] border border-white/10 bg-white/[0.035] px-3 py-2 text-[11px] leading-5 text-gray-300 md:flex-row md:items-center md:justify-between">
                <span>{journeyFunnelModel.visibleHelperCopy}</span>
                <AdminStatusBadge
                  state={historicalMetricTruthState}
                  label={journeyFunnelBadgeLabel}
                  className="max-w-[5.75rem] truncate whitespace-nowrap px-1.5 py-0.5 text-[9px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                <MetricCard
                  label="Mode"
                  value={journeyFunnelModel.modeLabel}
                  hint={formatJourneyDenominatorMode(journeyFunnelModel.denominatorMode)}
                  icon={Route}
                  truthState={historicalMetricTruthState}
                  statusBadgeLabel={journeyFunnelBadgeLabel}
                  className="rounded-[1rem] p-2"
                  valueClassName="text-lg leading-6 md:text-xl"
                />
                <MetricCard
                  label="Base"
                  value={journeyCountLabel(journeyFunnelModel.steps[0]?.displayedCount ?? null)}
                  hint="Auth modal events"
                  icon={Users}
                  truthState={historicalMetricTruthState}
                  statusBadgeLabel={journeyFunnelBadgeLabel}
                  className="rounded-[1rem] p-2"
                  valueClassName="text-lg leading-6 md:text-xl"
                />
                <MetricCard
                  label="Biggest Drop"
                  value={biggestDropoffLabel}
                  hint="Prior-step event ratio"
                  icon={AlertTriangle}
                  truthState={historicalMetricTruthState}
                  statusBadgeLabel={journeyFunnelBadgeLabel}
                  className="rounded-[1rem] p-2"
                  valueClassName="truncate text-base leading-6 md:text-lg"
                />
                <MetricCard
                  label="Attention"
                  value={journeyFunnelModel.nonSequentialSteps.length.toLocaleString()}
                  hint="Non-sequential steps"
                  icon={CheckCircle2}
                  truthState={historicalMetricTruthState}
                  statusBadgeLabel={journeyFunnelBadgeLabel}
                  className="rounded-[1rem] p-2"
                  valueClassName="text-lg leading-6 md:text-xl"
                />
              </div>

              {journeyFunnelModel.visibleDegradedCopy ? (
                <p className="mt-2 rounded-[1rem] border border-white/10 bg-black/25 px-3 py-2 text-[11px] leading-5 text-gray-300">
                  {journeyFunnelModel.visibleDegradedCopy}
                </p>
              ) : null}

              <div className="mt-2 space-y-1.5">
                {journeyFunnelModel.steps.map((step) => {
                  const percentLabel = step.denominatorStep ? journeyPercentLabel(step.displayedPercent) : "Base";
                  const barWidth = step.displayedPercent === null
                    ? 0
                    : Math.max(6, Math.min(100, step.displayedPercent * 100));
                  const rowDiffers = journeyFunnelModel.sourceMismatchSteps.includes(step.stepKey);
                  return (
                    <div
                      key={step.stepKey}
                      className="rounded-[0.9rem] border border-white/10 bg-black/30 px-3 py-2"
                    >
                      <div className="mb-1.5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-white">
                            {step.visibleLabel}
                          </p>
                          <p className="mt-0.5 truncate text-[10px] text-gray-500">
                            {journeyCountLabel(step.displayedCount)} tracked events - {step.denominatorLabel}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold text-gray-200">
                            {percentLabel}
                          </span>
                          {rowDiffers ? (
                            <AdminStatusBadge
                              state="degraded"
                              label="PARTIAL"
                              className="max-w-[4.5rem] truncate whitespace-nowrap px-1.5 py-0.5 text-[9px]"
                            />
                          ) : null}
                        </div>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-brand-purple to-cyan-400"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                {journeyFunnelModel.supportingMetrics.map((item) => (
                  <MetricCard
                    key={item.stepKey}
                    label={item.visibleLabel}
                    value={journeyCountLabel(item.displayedCount)}
                    hint="Supporting events"
                    icon={item.stepKey === "shares" ? Share2 : CheckCircle2}
                    truthState={historicalMetricTruthState}
                    statusBadgeLabel={journeyFunnelBadgeLabel}
                    className="rounded-[1rem] p-2"
                    valueClassName="text-lg leading-6 md:text-xl"
                  />
                ))}
              </div>

              <p className="mt-2 rounded-[1rem] border border-white/10 bg-black/25 px-3 py-2 text-[11px] leading-5 text-gray-300">
                {journeyFunnelModel.recommendation}
              </p>
            </SectionCard>

            <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
              <SectionCard
                title="Auth Outcomes"
                subtitle="Compact auth method health with source truth."
                icon={Users}
                rightSlot={renderSectionRangeControl("authOutcomeSplit")}
              >
                <div className="mb-2.5 flex flex-col gap-2 rounded-[1rem] border border-white/10 bg-white/[0.035] px-3 py-2 text-[11px] leading-5 text-gray-300 md:flex-row md:items-center md:justify-between">
                  <span>{authOutcomeModel.recommendation}</span>
                  <AdminStatusBadge
                    state={historicalMetricTruthState}
                    label={authOutcomeBadgeLabel}
                    className="max-w-[5.75rem] truncate whitespace-nowrap px-1.5 py-0.5 text-[9px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                  <MetricCard
                    label="Attempts"
                    value={authCountLabel(authOutcomeModel.attempts.value)}
                    hint="Auth attempts"
                    icon={Users}
                    truthState={historicalMetricTruthState}
                    statusBadgeLabel={authOutcomeBadgeLabel}
                    className="rounded-[1rem] p-2"
                    valueClassName="text-lg leading-6 md:text-xl"
                  />
                  <MetricCard
                    label="Success Rate"
                    value={authPercentLabel(authOutcomeModel.successRate.value)}
                    hint={authOutcomeModel.successRate.formula}
                    icon={Sparkles}
                    truthState={historicalMetricTruthState}
                    statusBadgeLabel={authOutcomeBadgeLabel}
                    className="rounded-[1rem] p-2"
                    valueClassName="text-lg leading-6 md:text-xl"
                  />
                  <MetricCard
                    label="Failures"
                    value={authCountLabel(authOutcomeModel.failures.value)}
                    hint="Failed outcomes"
                    icon={AlertTriangle}
                    truthState={historicalMetricTruthState}
                    statusBadgeLabel={authOutcomeBadgeLabel}
                    className="rounded-[1rem] p-2"
                    valueClassName="text-lg leading-6 md:text-xl"
                  />
                  <MetricCard
                    label="Avg Finish"
                    value={authFinishLabel}
                    hint={authOutcomeModel.timingAvailable ? "Successful finishes" : "Timing unavailable"}
                    icon={Clock3}
                    truthState={historicalMetricTruthState}
                    statusBadgeLabel={authOutcomeBadgeLabel}
                    className="rounded-[1rem] p-2"
                    valueClassName="truncate text-base leading-6 md:text-lg"
                  />
                </div>

                <div className="mt-2 grid gap-2 md:grid-cols-3">
                  <div className="rounded-[1rem] border border-white/10 bg-black/25 px-3 py-2 text-[11px] leading-5 text-gray-300">
                    <span className="font-semibold text-white">Weakest:</span>{" "}
                    {authOutcomeModel.weakestMethod?.visibleLabel ?? "Unavailable"}
                  </div>
                  <div className="rounded-[1rem] border border-white/10 bg-black/25 px-3 py-2 text-[11px] leading-5 text-gray-300">
                    <span className="font-semibold text-white">Most failed:</span>{" "}
                    {authOutcomeModel.mostFailuresMethod?.visibleLabel ?? "Unavailable"}
                  </div>
                  <div className="rounded-[1rem] border border-white/10 bg-black/25 px-3 py-2 text-[11px] leading-5 text-gray-300">
                    <span className="font-semibold text-white">Most unfinished:</span>{" "}
                    {authOutcomeModel.mostUnfinishedMethod?.visibleLabel ?? "Unavailable"}
                  </div>
                </div>

                <div className="mt-2 rounded-[1rem] border border-white/10 bg-black/30 p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                      Method split
                    </p>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold text-gray-300">
                      {authOutcomeModel.methodBreakdown.length} methods
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {authOutcomeModel.methodBreakdown.length > 0 ? (
                      authOutcomeModel.methodBreakdown.map((item) => {
                        const attempts = Math.max(1, item.attempts ?? 0);
                        const successShare = item.successes === null ? 0 : item.successes / attempts;
                        const failureShare = item.failures === null ? 0 : item.failures / attempts;
                        const unfinishedShare = item.unfinished === null ? 0 : item.unfinished / attempts;

                        return (
                          <div
                            key={item.methodKey}
                            className="rounded-[0.9rem] border border-white/10 bg-white/[0.03] px-3 py-2"
                          >
                            <div className="mb-1.5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-xs font-semibold text-white">
                                  {item.visibleLabel}
                                </p>
                                <p className="mt-0.5 truncate text-[10px] text-gray-500">
                                  {authCountLabel(item.attempts)} attempts - {authCountLabel(item.failures)} failed - {authCountLabel(item.unfinished)} unfinished
                                </p>
                              </div>
                              <span className="rounded-full border border-brand-purple/25 bg-brand-purple/10 px-2 py-1 text-[10px] font-bold text-brand-purple">
                                {authPercentLabel(item.successRate)}
                              </span>
                            </div>
                            <div className="flex h-1.5 overflow-hidden rounded-full bg-white/10">
                              <div className="h-full bg-brand-purple" style={{ width: `${successShare * 100}%` }} />
                              <div className="h-full bg-rose-400" style={{ width: `${failureShare * 100}%` }} />
                              <div className="h-full bg-slate-500" style={{ width: `${unfinishedShare * 100}%` }} />
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-[0.9rem] border border-dashed border-white/10 bg-black/20 p-3 text-xs text-gray-500">
                        Auth method detail needs tracked attempts.
                      </div>
                    )}
                  </div>
                </div>

                {authOutcomeModel.registrationOutcome ? (
                  <p className="mt-2 rounded-[1rem] border border-white/10 bg-black/25 px-3 py-2 text-[11px] leading-5 text-gray-300">
                    Registration completed: {authCountLabel(authOutcomeModel.registrationOutcome.successes)} outcomes. This is not listed as an auth method.
                  </p>
                ) : null}
              </SectionCard>

              <AdminOnboardingAnalyticsModules
                renderSectionRangeControl={renderSectionRangeControl}
                discrepancies={authOnboardingDiscrepancies}
                onboardingVelocityModel={onboardingVelocityModel}
                onboardingVelocityHasData={onboardingVelocityHasData}
                onboardingVelocityBuckets={onboardingVelocityBuckets}
                onboardingVelocityStartCount={onboardingVelocityStartCount}
                onboardingVelocityCompletionCount={onboardingVelocityCompletionCount}
                onboardingVelocityCompletionRate={onboardingVelocityCompletionRate}
                onboardingVelocityDropOffCount={onboardingVelocityDropOffCount}
                onboardingVelocityAvgDurationSeconds={onboardingVelocityStats.avgDuration}
                onboardingVelocityStartSourceHint={onboardingVelocityStartSourceHint}
                onboardingStepFlowItems={onboardingStepFlowItems}
                formatCompactNumber={formatCompactNumber}
                formatDuration={formatDuration}
                formatPercent={formatPercent}
              />
            </div>

            <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
              <SectionCard
                title="Guest Quality"
                subtitle="Estimated guest traffic and source-labeled quality."
                icon={Monitor}
                rightSlot={renderSectionRangeControl("categorySemantics")}
              >
                <div className="mb-2.5 flex flex-col gap-2 rounded-[1rem] border border-white/10 bg-white/[0.035] px-3 py-2 text-[11px] leading-5 text-gray-300 md:flex-row md:items-center md:justify-between">
                  <span>{guestBounceQualityModel.visibleCopy}</span>
                  <AdminStatusBadge
                    state={guestBounceQualityModel.truthState}
                    label={guestBounceQualityModel.badgeLabel}
                    className="max-w-[6.25rem] truncate whitespace-nowrap px-1.5 py-0.5 text-[9px]"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <MetricCard
                    label={guestBounceQualityModel.guestViewsEstimated ? "Est. Guest Views" : "Guest Views"}
                    value={guestQualityCountLabel(guestBounceQualityModel.guestViews.value)}
                    hint={guestBounceQualityModel.guestViewsEstimated ? "Estimated guest views" : "Tracked guest views"}
                    icon={Users}
                    truthState={guestBounceQualityModel.truthState}
                    statusBadgeLabel={guestBounceQualityModel.guestViewsEstimated ? "EST" : guestBounceQualityModel.badgeLabel}
                    className="rounded-[1rem] p-2"
                    valueClassName="text-lg leading-6 md:text-xl"
                  />
                  <MetricCard
                    label="Guest Quality"
                    value={guestBounceQualityModel.guestBounce.value === null && guestBounceQualityModel.guestEngaged.value === null ? "Unavailable" : guestQualityRateLabel(guestBounceQualityModel.guestEngaged.value)}
                    hint={guestBounceQualityModel.guestEngaged.unavailableReason ?? "Guest engaged rate"}
                    icon={AlertTriangle}
                    truthState={guestBounceQualityModel.truthState}
                    statusBadgeLabel={guestBounceQualityModel.guestEngaged.value === null ? "NO SAMPLE" : guestBounceQualityModel.badgeLabel}
                    className="rounded-[1rem] p-2"
                    valueClassName="truncate text-base leading-6 md:text-lg"
                  />
                  <MetricCard
                    label="Signed-in Bounce"
                    value={guestQualityRateLabel(guestBounceQualityModel.signedInBounce.value)}
                    hint={guestBounceQualityModel.signedInBounce.unavailableReason ?? "Signed-in bounce sample"}
                    icon={Activity}
                    truthState={guestBounceQualityModel.truthState}
                    statusBadgeLabel={guestBounceQualityModel.signedInBounce.value === null ? "NO SAMPLE" : guestBounceQualityModel.badgeLabel}
                    className="rounded-[1rem] p-2"
                    valueClassName="truncate text-base leading-6 md:text-lg"
                  />
                </div>

                <div className="mt-2 grid gap-2 rounded-[1rem] border border-white/10 bg-black/25 px-3 py-2 text-[11px] leading-5 text-gray-300 md:grid-cols-2">
                  <span>
                    <span className="font-semibold text-white">Action:</span>{" "}
                    {guestBounceQualityModel.actionCopy}
                  </span>
                  <span>
                    <span className="font-semibold text-white">Series:</span>{" "}
                    {guestBounceQualityModel.chartCollapsedBecauseEmpty ? "collapsed" : "available"}
                  </span>
                </div>
              </SectionCard>
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
              <SectionCard
                title="Event Mix"
                subtitle="Top event activity with source and surface context."
                icon={Sparkles}
                rightSlot={renderSectionRangeControl("eventMix")}
              >
                <div className="grid gap-2.5">
                  <div className="flex flex-col gap-2 rounded-[1rem] border border-white/10 bg-white/[0.035] px-3 py-2 text-[11px] leading-5 text-gray-300 md:flex-row md:items-center md:justify-between">
                    <span>{eventMixModel.visibleCopy}</span>
                    <AdminStatusBadge
                      state={eventMixModel.truthState}
                      label={eventMixModel.badgeLabel}
                      className="max-w-[6.25rem] truncate whitespace-nowrap px-1.5 py-0.5 text-[9px]"
                    />
                  </div>

                  <div className="grid gap-2 rounded-[1rem] border border-white/10 bg-black/25 px-3 py-2 text-[11px] leading-5 text-gray-300 md:grid-cols-3">
                    <span>
                      <span className="font-semibold text-white">Total:</span>{" "}
                      {eventMixCountLabel(eventMixModel.totalEventsInRange)} tracked events
                    </span>
                    <span>
                      <span className="font-semibold text-white">Top:</span>{" "}
                      {eventMixModel.topEvent?.displayLabel ?? "No verified event yet"}
                    </span>
                    <span>
                      <span className="font-semibold text-white">Surfaces:</span>{" "}
                      {eventMixModel.mappedSurfaceCount === null ? "context unavailable" : eventMixModel.mappedSurfaceCount}
                    </span>
                  </div>

                  <div className="rounded-[1rem] border border-white/10 bg-black/30 p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                        Ranked event activity
                      </p>
                      <span className="text-[10px] text-gray-500">
                        event count / total counted events
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {eventMixModel.eventRows.length > 0 ? (
                        eventMixModel.eventRows.map((item) => (
                          <div
                            key={item.eventKey}
                            className="rounded-[0.9rem] border border-white/10 bg-white/[0.03] px-3 py-2"
                          >
                            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
                              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[10px] font-semibold text-gray-300">
                                {item.rank}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate text-xs font-semibold text-white">
                                  {item.displayLabel}
                                </p>
                                <p className="mt-0.5 truncate text-[10px] text-gray-500">
                                  {item.mappedSurface ?? "Surface context is unavailable"} / {item.mappingSource === "component_context" ? "mapped" : item.mappingSource === "fallback_event_catalog" ? "catalog" : "unmapped"}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-bold text-brand-purple">
                                  {eventMixCountLabel(item.rawCount)}
                                </p>
                                <p className="text-[10px] text-gray-500">
                                  {eventMixShareLabel(item.share)}
                                </p>
                              </div>
                            </div>
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                              <div
                                className="h-full rounded-full bg-brand-purple"
                                style={{
                                  width: `${Math.max(4, Math.min(100, (item.share ?? 0) * 100))}%`,
                                }}
                              />
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-[0.9rem] border border-dashed border-white/10 bg-black/20 p-3 text-xs text-gray-500">
                          Event mix needs verified event counts.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-[1rem] border border-white/10 bg-black/25 px-3 py-2 text-[11px] leading-5 text-gray-300">
                    <span className="font-semibold text-white">Context:</span>{" "}
                    {eventMixModel.componentContextStatus === "available"
                      ? `${eventMixModel.mappedSurfaceCount ?? 0} mapped surfaces`
                      : "Surface context unavailable for this range."}
                    {eventMixModel.unmappedEventCount ? ` ${eventMixModel.unmappedEventCount} events need mapping.` : ""}
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Live Interaction Stream"
                subtitle="Recent telemetry events and guest interaction buckets from the live site."
                icon={Clock3}
                rightSlot={renderSectionRangeControl("liveInteractionStream")}
              >
                <div className="grid gap-2.5">
                  <div className="flex flex-col gap-2 rounded-[1rem] border border-white/10 bg-white/[0.035] px-3 py-2 text-[11px] leading-5 text-gray-300 sm:flex-row sm:items-center sm:justify-between">
                    <span className="min-w-0">{liveInteractionStreamModel.recommendation}</span>
                    <AdminStatusBadge
                      state={liveInteractionStreamModel.truthState}
                      label={liveInteractionStreamModel.badgeLabel}
                      className="max-w-[5.5rem] shrink-0 truncate whitespace-nowrap px-1.5 py-0.5 text-[9px]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 rounded-[1rem] border border-white/10 bg-black/25 px-3 py-2 text-[10px] leading-5 text-gray-300 sm:grid-cols-4">
                    <span className="min-w-0 truncate"><span className="font-semibold text-white">Shown:</span> {streamCountLabel(liveInteractionStreamModel.visibleEventCount)}</span>
                    <span className="min-w-0 truncate"><span className="font-semibold text-white">Actors:</span> {streamCountLabel(liveInteractionStreamModel.uniqueActorCount)}</span>
                    <span className="min-w-0 truncate"><span className="font-semibold text-white">Failures:</span> {streamCountLabel(liveInteractionStreamModel.failureCount)}</span>
                    <span className="min-w-0 truncate"><span className="font-semibold text-white">Admin excl.:</span> {liveInteractionStreamModel.adminExcludedCount}</span>
                  </div>

                  <div className="space-y-1.5">
                    {liveInteractionStreamModel.eventRows.length > 0 ? (
                      liveInteractionStreamModel.eventRows.map((event) => (
                        <div
                          key={`${event.timestamp}-${event.duplicateGroupKey}`}
                          className="rounded-[0.9rem] border border-white/10 bg-white/[0.03] px-3 py-2"
                        >
                          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-white">
                                {event.displayLabel}
                                {event.duplicateCount > 1 ? (
                                  <span className="ml-1 text-[10px] text-brand-purple">
                                    x{event.duplicateCount}
                                  </span>
                                ) : null}
                              </p>
                              <p className="mt-0.5 truncate text-[10px] text-gray-500">
                                {event.actorDisplayLabel} / {event.surface || "unknown surface"} / {formatRelativeTime(event.timestamp, nowMs)}
                              </p>
                            </div>
                            <span
                              className={cn(
                                "max-w-[5.5rem] truncate rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em]",
                                /fail/i.test(event.eventKey)
                                  ? "border-rose-400/25 bg-rose-500/10 text-rose-200"
                                  : "border-brand-purple/25 bg-brand-purple/10 text-brand-purple",
                              )}
                              title={event.eventKey}
                            >
                              {event.compactTypeLabel}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[0.9rem] border border-dashed border-white/10 bg-black/20 p-3 text-xs text-gray-500">
                        No user interactions available for this range.
                      </div>
                    )}
                  </div>
                </div>
              </SectionCard>
            </div>
          </>
    </>
  );
}
