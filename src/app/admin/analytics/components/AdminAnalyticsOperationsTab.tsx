import React from "react";
import {
  Activity, AlertTriangle, CheckCircle2, Clock3, Eye, Monitor, Route, Share2, Sparkles, Users,
} from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AnalyticsTooltip, MetricCard, SectionCard } from "@/components/Admin/Analytics/AdminAnalyticsPrimitives";
import { AdminOnboardingAnalyticsModules } from "@/components/Admin/Analytics/AdminOnboardingAnalyticsModules";
import { AdminStatusBadge } from "@/components/Admin/AdminStatusBadge";
import { coerceAdminSurfaceState, type AdminSurfaceState } from "@/lib/admin-parity";
import { cn } from "@/lib/utils";
import type { AdminAnalyticsState } from "../hooks/useAdminAnalyticsState";

export function AdminAnalyticsOperationsTab(props: AdminAnalyticsState) {
  const {
    renderSectionRangeControl, liveResponse, historicalResponse, liveLoading, historicalLoading, nowMs, EVENT_LABELS,
    liveSurfaceMix, liveActiveUsers, livePulseOnboardingStats, livePulseOnboardingStartCount, livePulseOnboardingCompletionRate, livePulseFunnel, liveSeries, livePulseModel, journeyFunnelModel,
    liveActiveTruthState, historicalOverviewTruthState,
    journeyFunnelMetrics,
    authOutcomeModel,
    authOnboardingDiscrepancies, onboardingVelocityModel, onboardingVelocityHasData, onboardingVelocityBuckets, onboardingVelocityStartCount, onboardingVelocityCompletionCount, onboardingVelocityCompletionRate, onboardingVelocityDropOffCount, onboardingVelocityStats, onboardingVelocityStartSourceHint, onboardingStepFlowItems,
    formatCompactNumber, formatDuration, formatPercent, formatRelativeTime,
    guestBounceQualityCards, guestBounceGlobalSemantics, guestBounceGuestRate, guestBounceEngagedRate, guestBounceIdentifiedRate, guestBounceUserSemantics,
    guestViewsDisplayCount, guestViewsHint, guestBounceRateDisplay, guestBounceHint, guestEngagedRateDisplay, guestEngagedHint,
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
    commerceSnapshotRange, commerce,
    packagePerformanceRange, packagePerformance,
    PIE_COLORS, contentConversionRange, unlockCategoryMix, previewToUnlockRate, checkoutToPurchaseRate,
    topDropConversionRange, topDrops,
    describeEvent,
    
    // Added remaining
    clearAllFilters, clearViewerFilter, viewerUserFilter, formatMoney, activeViewerFilter,
    eventMixTopEvents, validationItems, topComponentContexts, eventMixTopComponentContexts,
    liveInteractionEvents
  } = props;

  const livePulseTruthState: AdminSurfaceState = liveActiveTruthState ?? (liveLoading ? "loading" : "failed");
  const historicalMetricTruthState: AdminSurfaceState = historicalOverviewTruthState ?? (historicalLoading ? "loading" : "failed");
  const activeUsersTruthState: AdminSurfaceState = liveResponse?.activeUsersTruthLabel
    ? coerceAdminSurfaceState(liveResponse.activeUsersTruthLabel)
    : livePulseTruthState;
  const realtimeCacheSource = liveResponse?.cacheSourceLabel || liveResponse?.liveSourceLabel || "admin realtime hot cache";
  const realtimeCacheHint = liveResponse?.liveTruthLabel === "stale"
    ? `Stale hot cache (${realtimeCacheSource})`
    : liveResponse?.cacheState === "fresh"
      ? `Hot cache (${realtimeCacheSource})`
      : liveResponse?.liveTruthLabel === "fallback"
        ? `First-party fallback (${liveResponse?.liveSourceLabel || "realtime fallback"})`
        : "Google Analytics realtime";
  const compactLiveMetricClass = "rounded-[1rem] p-2";
  const compactLiveMetricValueClass = "text-lg leading-6 md:text-xl";
  const livePulseBadgeLabel =
    livePulseModel.presenceSourceStatus === "failed"
      ? "ERROR"
      : livePulseModel.presenceSourceStatus === "fallback"
        ? "SNAP"
        : livePulseModel.presenceSourceStatus === "waiting"
          ? "WAIT"
          : livePulseModel.presenceSourceStatus === "cache"
            ? "STALE"
            : "LIVE";
  const activeNowValue = livePulseModel.activeCount.value === null
    ? liveLoading ? "Waiting" : "Unavailable"
    : formatCompactNumber(livePulseModel.activeCount.value);
  const guestAuthMixValue =
    livePulseModel.guestCount.value === null || livePulseModel.authenticatedCount.value === null
      ? liveLoading ? "Waiting" : "Unavailable"
      : `${formatCompactNumber(livePulseModel.guestCount.value)} / ${formatCompactNumber(livePulseModel.authenticatedCount.value)}`;
  const topSurfaceValue = livePulseModel.topSurface.value ?? (liveLoading ? "Waiting" : "Unavailable");
  const lastUpdateValue = liveResponse?.generatedAtMs
    ? formatRelativeTime(liveResponse.generatedAtMs, nowMs)
    : livePulseModel.activeIdentities[0]?.lastSeenLabel ?? (liveLoading ? "Waiting" : "Unavailable");

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
    value === null ? "Waiting" : formatPercent(value);
  const journeyCountLabel = (value: number | null) =>
    value === null ? "Waiting" : formatCompactNumber(value);
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
    value === null ? "Waiting" : formatCompactNumber(value);
  const authPercentLabel = (value: number | null) =>
    value === null ? "Waiting" : formatPercent(value);
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
                <span>{livePulseModel.visibleCopy}</span>
                <AdminStatusBadge
                  state={livePulseTruthState}
                  label={livePulseBadgeLabel}
                  className="max-w-[5.75rem] truncate whitespace-nowrap px-1.5 py-0.5 text-[9px]"
                />
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
                  hint="Presence mix"
                  icon={Sparkles}
                  truthState={activeUsersTruthState}
                  statusBadgeLabel={livePulseBadgeLabel}
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
                  hint={livePulseModel.graphSourceMismatch ? "Graph source mismatch" : livePulseModel.graphSource}
                  icon={Clock3}
                  truthState={livePulseTruthState}
                  statusBadgeLabel={livePulseBadgeLabel}
                  className={compactLiveMetricClass}
                  valueClassName="truncate text-base leading-6 md:text-lg"
                />
              </div>

              <div className={cn("relative mt-2 w-full", livePulseModel.compactChartHeightClass)}>
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
                    {liveLoading ? "Waiting for pulse data" : "Graph source unavailable"}
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
                            <span className="text-xs font-bold text-brand-purple">
                              {item.activeUsers}
                            </span>
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
                            Seen {formatRelativeTime(item.lastSeenAt, nowMs)}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[0.9rem] border border-dashed border-white/10 bg-black/20 p-3 text-xs text-gray-500">
                        <AdminStatusBadge state={livePulseTruthState} className="mb-2" />
                        Realtime surfaces are waiting for presence rows.
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
                            </div>
                            <p className="mt-1 truncate text-[10px] text-gray-500">
                              {item.routeLabel} - {item.actionLabel}
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
                          ? "Waiting for active identity rows."
                          : "No active identity details are available."}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title={journeyFunnelModel.visibleTitle}
              subtitle="Raw event chain with source and denominator truth."
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
                  hint={journeyFunnelModel.denominatorMode}
                  icon={Route}
                  truthState={historicalMetricTruthState}
                  statusBadgeLabel={journeyFunnelBadgeLabel}
                  className="rounded-[1rem] p-2"
                  valueClassName="text-lg leading-6 md:text-xl"
                />
                <MetricCard
                  label="Base"
                  value={journeyCountLabel(journeyFunnelModel.steps[0]?.displayedCount ?? null)}
                  hint="Auth modal raw events"
                  icon={Users}
                  truthState={historicalMetricTruthState}
                  statusBadgeLabel={journeyFunnelBadgeLabel}
                  className="rounded-[1rem] p-2"
                  valueClassName="text-lg leading-6 md:text-xl"
                />
                <MetricCard
                  label="Biggest Drop"
                  value={biggestDropoffLabel}
                  hint="Prior-step raw ratio"
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
                            {journeyCountLabel(step.displayedCount)} raw events - {step.denominatorLabel}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold text-gray-200">
                            {percentLabel}
                          </span>
                          {rowDiffers ? (
                            <AdminStatusBadge
                              state="degraded"
                              label="MIXED"
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
                    hint="Supporting raw events"
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
                        Auth method detail is waiting for tracked attempts.
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
                title="Guest + Bounce Quality"
                subtitle="Public and signed-in traffic quality from the semantic engine."
                icon={Monitor}
                rightSlot={renderSectionRangeControl("categorySemantics")}
              >
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <MetricCard
                    label="Guest Views"
                    value={formatCompactNumber(guestViewsDisplayCount ?? 0)}
                    hint={guestViewsHint}
                    icon={Users}
                    truthState={historicalMetricTruthState}
                  />
                  <MetricCard
                    label="Guest Bounce"
                    value={guestBounceRateDisplay}
                    hint={guestBounceHint}
                    icon={AlertTriangle}
                    truthState={historicalMetricTruthState}
                  />
                  <MetricCard
                    label="Guest Engaged"
                    value={guestEngagedRateDisplay}
                    hint={guestEngagedHint}
                    icon={Sparkles}
                    truthState={historicalMetricTruthState}
                  />
                  <MetricCard
                    label="Signed-in Bounce"
                    value={formatPercent(guestBounceIdentifiedRate)}
                    hint={`${(guestBounceUserSemantics?.bounceCount ?? 0).toLocaleString()} bounced signed-in visits`}
                    icon={Activity}
                    truthState={historicalMetricTruthState}
                  />
                </div>

                <div className="mt-5 h-72 w-full">
                  {guestBounceQualityCards.some(
                    (card: any) =>
                      card.views > 0 || card.engaged > 0 || card.bounced > 0,
                  ) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={guestBounceQualityCards}
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
                          dataKey="views"
                          name="Views"
                          fill="#b28cff"
                          radius={[10, 10, 0, 0]}
                        />
                        <Bar
                          dataKey="engaged"
                          name="Engaged"
                          fill="#22d3ee"
                          radius={[10, 10, 0, 0]}
                        />
                        <Bar
                          dataKey="bounced"
                          name="Bounced"
                          fill="#f59e0b"
                          radius={[10, 10, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-[1.6rem] border border-dashed border-white/10 bg-black/20 p-5 text-sm text-gray-500">
                      <div className="text-center">
                        <AdminStatusBadge state={historicalMetricTruthState} className="mb-2" />
                        <div>No quality analytics data in this range.</div>
                      </div>
                    </div>
                  )}
                </div>
              </SectionCard>
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
              <SectionCard
                title="Event Mix"
                subtitle="The strongest custom GA events in the selected window."
                icon={Sparkles}
                rightSlot={renderSectionRangeControl("eventMix")}
              >
                <div className="grid gap-4 lg:grid-cols-[1fr_0.92fr]">
                  <div className="h-64 w-full md:h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={eventMixTopEvents}
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
                          dataKey="count"
                          name="Events"
                          fill="#b28cff"
                          radius={[10, 10, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                          Component context
                        </p>
                        <p className="mt-1 text-sm text-gray-400">
                          Which product surfaces are actually generating the
                          event load.
                        </p>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-gray-300">
                        {topComponentContexts.length} surfaces
                      </span>
                    </div>
                    <div className="space-y-3">
                      {eventMixTopComponentContexts.length > 0 ? (
                        eventMixTopComponentContexts.map((item: any) => (
                          <div
                            key={item.key}
                            className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"
                          >
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <p className="text-sm font-semibold text-white">
                                {item.label}
                              </p>
                              <span className="text-sm font-bold text-brand-purple">
                                {item.count.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2 text-[11px] text-gray-400">
                              <span>
                                {item.uniqueUsers.toLocaleString()} users
                              </span>
                              <span>
                                {item.experienceCount.toLocaleString()}{" "}
                                experiences
                              </span>
                              <span>
                                {EVENT_LABELS[item.exampleEvent] ||
                                  item.exampleEvent}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-[1.4rem] border border-dashed border-white/10 bg-black/20 p-4 text-sm text-gray-500">
                          Component context will populate once enough telemetry
                          lanes resolve against the selected range.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Live Interaction Stream"
                subtitle="Recent telemetry events and guest interaction buckets from the live site."
                icon={Clock3}
                rightSlot={renderSectionRangeControl("liveInteractionStream")}
              >
                <div className="space-y-3">
                  {liveInteractionEvents.length > 0 ? (
                    liveInteractionEvents.slice(0, 8).map((event: any, index: any) => (
                      <div
                        key={`${event.timestamp}-${index}`}
                        className="rounded-[1.4rem] border border-white/10 bg-black/30 p-3.5"
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-purple">
                            {event.type}
                          </span>
                          <span className="text-[11px] text-gray-500">
                            {formatRelativeTime(event.timestamp, nowMs)}
                          </span>
                        </div>
                        <p className="text-sm text-white">
                          {describeEvent(event)}
                        </p>
                        <p className="mt-2 text-xs text-gray-500">
                          {(event.username || "Guest").trim()} on{" "}
                          <span className="text-gray-400">{event.path}</span>
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {event.componentName ? (
                            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold text-gray-300">
                              {event.componentName}
                            </span>
                          ) : null}
                          {event.dropTitle || event.dropId ? (
                            <span className="rounded-full border border-brand-purple/20 bg-brand-purple/10 px-2 py-1 text-[10px] font-semibold text-brand-purple">
                              {event.dropTitle || event.dropId}
                            </span>
                          ) : null}
                          {event.watchSeconds ? (
                            <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 text-[10px] font-semibold text-cyan-200">
                              {formatDuration(event.watchSeconds)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[1.6rem] border border-dashed border-white/10 bg-black/20 p-5 text-sm text-gray-500">
                      No recent interaction traces yet.
                    </div>
                  )}
                </div>
              </SectionCard>
            </div>

            <SectionCard
              title="Data Validation"
              subtitle="Every overview here is grounded in a real source with parity checks surfaced."
              icon={CheckCircle2}
              rightSlot={renderSectionRangeControl("dataValidation")}
            >
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {validationItems.map((item: any) => (
                  <div
                    key={item.label}
                    className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4"
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-white">
                        {item.label}
                      </p>
                      <span
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]",
                          getValidationClasses(item.status),
                        )}
                      >
                        {item.status}
                      </span>
                    </div>
                    <p className="text-xs leading-6 text-gray-400">
                      {item.detail}
                    </p>
                  </div>
                ))}
              </div>
            </SectionCard>
          </>
    </>
  );
}
