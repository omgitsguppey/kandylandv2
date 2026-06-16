import React from "react";
import {
  Activity, AlertTriangle, CheckCircle2, Clock3, Eye, Monitor, Route, Share2, Sparkles, Users,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  AnalyticsTooltip,
  AnalyticsViewModeToggle,
  MetricCard,
  SectionCard,
  type AnalyticsViewMode,
} from "@/components/Admin/Analytics/AdminAnalyticsPrimitives";
import { AdminOnboardingAnalyticsModules } from "@/components/Admin/Analytics/AdminOnboardingAnalyticsModules";
import { AdminStatusBadge } from "@/components/Admin/AdminStatusBadge";
import {
  formatAdminAnalyticsJourneyDenominatorMode,
  resolveAdminAnalyticsLivePulseBadgeLabel,
} from "@/lib/admin-analytics-contracts";
import { formatAdminAnalyticsEvidenceSourceLabel } from "@/lib/analytics/admin-analytics-display-state";
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
  const compactLiveMetricClass = "rounded-[1rem] p-2 min-h-[4.75rem]";
  const compactLiveMetricValueClass = "text-[1.05rem] leading-5 md:text-lg";
  const [livePulseViewMode, setLivePulseViewMode] = React.useState<AnalyticsViewMode>("cards");
  const [eventMixViewMode, setEventMixViewMode] = React.useState<AnalyticsViewMode>("cards");
  const [authOutcomeViewMode, setAuthOutcomeViewMode] = React.useState<AnalyticsViewMode>("cards");
  const [journeyFunnelViewMode, setJourneyFunnelViewMode] = React.useState<AnalyticsViewMode>("cards");
  const [guestQualityViewMode, setGuestQualityViewMode] = React.useState<AnalyticsViewMode>("cards");
  const [liveInteractionViewMode, setLiveInteractionViewMode] = React.useState<AnalyticsViewMode>("cards");
  const livePulseBadgeLabel = resolveAdminAnalyticsLivePulseBadgeLabel(livePulseModel);
  const mobileVisibleLiveSurfaces = livePulseModel.surfaces.slice(0, livePulseModel.mobileSurfaceRowsLimit);
  const hiddenLiveSurfaceCount = Math.max(0, livePulseModel.surfaces.length - mobileVisibleLiveSurfaces.length);
  const vendorEvidenceLabel = formatAdminAnalyticsEvidenceSourceLabel("vendor_evidence");
  const debugRecoveryLabel = formatAdminAnalyticsEvidenceSourceLabel("debug_only");
  const recoveryReviewLabel = formatAdminAnalyticsEvidenceSourceLabel("recovery_review_only");
  const firstSnapshotLabel = "Waiting for first snapshot";
  const noSnapshotLabel = "No verified snapshot yet";
  const activeNowValue = livePulseModel.activeCount.value === null
    ? liveLoading ? firstSnapshotLabel : noSnapshotLabel
    : formatCompactNumber(livePulseModel.activeCount.value);
  const guestAuthMixValue = livePulseModel.guestMixLabel;
  const guestMixTruthState: AdminSurfaceState =
    livePulseModel.guestSnapshotTruthState === "live"
      ? activeUsersTruthState
      : livePulseModel.guestSnapshotTruthState === "stale"
        ? "stale"
        : "degraded";
  const guestMixBadgeLabel =
    livePulseModel.guestSnapshotTruthState === "live"
      ? livePulseBadgeLabel
      : livePulseModel.guestSnapshotTruthState === "stale"
        ? "DELAYED"
        : livePulseModel.guestSnapshotTruthState === "needs_review"
          ? "REVIEW"
          : "NO SAMPLE";
  const guestMixHint =
    livePulseModel.guestSnapshotTruthState === "live"
      ? `Guest snapshot from ${livePulseModel.guestSnapshotSourceLabel}`
      : livePulseModel.guestSnapshotReason ?? "Guest samples unavailable";
  const topSurfaceValue = livePulseModel.topSurface.value ?? (liveLoading ? firstSnapshotLabel : noSnapshotLabel);
  const lastUpdateValue = liveResponse?.generatedAtMs
    ? formatRelativeTime(liveResponse.generatedAtMs, nowMs)
    : livePulseModel.activeIdentities[0]?.lastSeenLabel ?? (liveLoading ? firstSnapshotLabel : noSnapshotLabel);
  const livePulseCompactStatusLine = liveResponse?.generatedAtMs
    ? `Updated ${formatRelativeTime(liveResponse.generatedAtMs, nowMs)}`
    : livePulseModel.refreshState === "refreshing"
      ? "Refreshing"
      : livePulseModel.mode === "unavailable"
        ? "Snapshot unavailable"
        : livePulseModel.latestVerifiedSnapshotExists
          ? "Last verified data"
          : "No verified snapshot yet";
  const livePulseCompactIssueLine =
    livePulseModel.guestSnapshotTruthState === "unavailable"
      ? "Guest samples unavailable"
      : livePulseModel.mode === "delayed_snapshot"
        ? "Live updates delayed"
        : null;
  const catalogMappingSentence =
    eventMixModel.eventsNeedingCatalogMapping === null
      ? ""
      : `${eventMixModel.eventsNeedingCatalogMapping} need catalog mapping.`;
  const surfaceContextSentence =
    eventMixModel.eventsMissingSurfaceContext === null
      ? ""
      : `${eventMixModel.eventsMissingSurfaceContext} top events need surface context.`;

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
    value === null ? journeyFunnelModel.hydrationState === "waiting" ? firstSnapshotLabel : "Unavailable" : formatPercent(value);
  const journeyCountLabel = (value: number | null) =>
    value === null ? journeyFunnelModel.hydrationState === "waiting" ? firstSnapshotLabel : "Unavailable" : formatCompactNumber(value);
  const eventChainHasUsableSample = journeyFunnelModel.hasUsableEventSample;
  const eventChainCanRenderDetails = journeyFunnelModel.canRenderStepDetails;
  const biggestDropoffLabel =
    journeyFunnelModel.biggestDropoffStep && journeyFunnelModel.biggestDropoffPercent !== null
      ? `${journeyFunnelModel.biggestDropoffStep} ${formatPercent(journeyFunnelModel.biggestDropoffPercent)}`
      : "Unavailable";
  const journeyFunnelChartRows = journeyFunnelModel.steps.map((step) => ({
    ...step,
    chartLabel:
      step.visibleLabel.length > 14
        ? `${step.visibleLabel.slice(0, 14)}...`
        : step.visibleLabel,
    countValue: step.displayedCount ?? 0,
    percentValue: step.displayedPercent === null ? 0 : Math.round(step.displayedPercent * 100),
  }));

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
    value === null ? "Unavailable" : formatCompactNumber(value);
  const authPercentLabel = (value: number | null) =>
    value === null ? "Unavailable" : formatPercent(value);
  const authFinishLabel = authOutcomeModel.avgFinish.value === null
    ? "Unavailable"
    : formatDuration(authOutcomeModel.avgFinish.value / 1000);
  const authHasUsableSample = authOutcomeModel.hasUsableAuthSample;
  const authCanRenderDetails = authOutcomeModel.canRenderMethodDetails;
  const formatAuthFailureReason = (failureCode: string | null | undefined) =>
    !failureCode || failureCode === "failure_code_unavailable"
      ? "Failure reason not captured"
      : failureCode;
  const authGroupValue = (group: typeof authOutcomeModel.methodGroups.emailPassword) =>
    group.attempts === null ? "Unavailable" : `${formatCompactNumber(group.attempts)} attempts`;
  const authGroupHint = (group: typeof authOutcomeModel.methodGroups.emailPassword) =>
    group.attempts === null
      ? "No tracked attempts"
      : `${formatCompactNumber(group.failures ?? 0)} failed · ${formatCompactNumber(group.successes ?? 0)} succeeded`;
  const authMethodChartRows = authOutcomeModel.methodBreakdown.map((item) => ({
    ...item,
    chartLabel:
      item.visibleLabel.length > 14
        ? `${item.visibleLabel.slice(0, 14)}...`
        : item.visibleLabel,
    attemptsValue: item.attempts ?? 0,
    successesValue: item.successes ?? 0,
    failuresValue: item.failures ?? 0,
    unfinishedValue: item.unfinished ?? 0,
  }));

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
  const formatRelativeUtc = (value: string | null) =>
    value ? formatRelativeTime(new Date(value).getTime(), nowMs) : "none";
  const guestQualityHint = guestBounceQualityModel.guestQuality.state === "available"
    ? [
        `${guestBounceQualityModel.guestQuality.sampleCount} guest views`,
        `last ${formatRelativeUtc(guestBounceQualityModel.guestQuality.lastGuestBatchAtUtc)}`,
      ].join(" | ")
    : [
        guestBounceQualityModel.guestQuality.missingReason,
        `Next: ${guestBounceQualityModel.guestQuality.nextAction}`,
      ].join(" ");
  const signedInBounceHint = guestBounceQualityModel.signedInBounce.sampleCount === null
    ? "Signed-in bounce sample only. Guest bounce unavailable."
    : [
        `${guestBounceQualityModel.signedInBounce.sampleCount} signed-in views`,
        guestBounceQualityModel.signedInBounce.explanation,
      ].join(" | ");
  const guestQualityChartRows = [
    {
      label: "Estimated views",
      value: guestBounceQualityModel.estimatedGuestViews.value ?? 0,
      source: guestBounceQualityModel.estimatedGuestViews.sourceTruth,
      state: guestBounceQualityModel.estimatedGuestViews.freshnessState,
    },
    {
      label: "Guest sample",
      value: guestBounceQualityModel.guestQuality.state === "available"
        ? guestBounceQualityModel.guestQuality.sampleCount
        : 0,
      source: guestBounceQualityModel.guestQuality.state,
      state: guestBounceQualityModel.guestQuality.state,
    },
    {
      label: "Signed-in sample",
      value: guestBounceQualityModel.signedInBounce.sampleCount ?? 0,
      source: guestBounceQualityModel.signedInBounce.freshnessState,
      state: guestBounceQualityModel.signedInBounce.freshnessState,
    },
  ];

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
  const eventMixMissingSurfaceLabel = "Surface context unavailable | Surface: missing";
  const eventMixMissingRouteLabel = "Route: missing";
  const eventMixInferenceCopy = "Categories are inferred from the event catalog; verified route and surface context is missing for this range.";

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
  const formatLiveStreamRelativeUtc = (timestamp: number | null) =>
    timestamp ? formatRelativeTime(timestamp, nowMs) : "unknown";

  const renderLiveSurfaceRow = (item: typeof livePulseModel.surfaces[number]) => (
    <div
      key={item.key}
      className="rounded-[0.9rem] border border-white/10 bg-white/[0.03] px-2.5 py-2 min-h-[3.25rem] md:px-3"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-xs font-semibold text-white">
          {item.label}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-brand-purple">
            {item.activeUsers}
          </span>
          <AdminStatusBadge
            state={item.freshness}
            label={item.freshness === "live" ? "LIVE" : "DELAYED"}
            className="max-w-[4.75rem] truncate whitespace-nowrap px-1.5 py-0.5 text-[9px]"
          />
        </div>
      </div>
      <div className="mt-1.5 hidden h-1 overflow-hidden rounded-full bg-white/10 md:block">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-purple to-cyan-400"
          style={{
            width: `${Math.max(8, (item.activeUsers / Math.max(1, livePulseModel.surfaces[0]?.activeUsers || 1)) * 100)}%`,
          }}
        />
      </div>
      <p className="mt-1 text-[10px] text-gray-500">
        Seen {formatRelativeTime(item.lastSeenAt, nowMs)}
      </p>
    </div>
  );

  const renderActiveIdentityRow = (item: typeof livePulseModel.activeIdentities[number]) => (
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
  );

  const renderJourneyStepRow = (step: typeof journeyFunnelModel.steps[number]) => {
    const percentLabel = step.denominatorStep ? journeyPercentLabel(step.displayedPercent) : "Base";
    const barWidth = step.displayedPercent === null
      ? 0
      : Math.max(6, Math.min(100, step.displayedPercent * 100));
    const rowDiffers = journeyFunnelModel.sourceMismatchSteps.includes(step.stepKey);

    return (
      <div
        key={step.stepKey}
        className="rounded-[0.9rem] border border-white/10 bg-black/30 px-2.5 py-2 md:px-3"
      >
        <div className="mb-1.5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-white">
              {step.visibleLabel}
            </p>
            <p className="mt-0.5 truncate text-[10px] text-gray-500">
              {journeyCountLabel(step.displayedCount)} tracked events - {step.denominatorLabel}
            </p>
            <p className="mt-0.5 line-clamp-2 text-[10px] leading-4 text-gray-400 md:line-clamp-none">
              {step.explanation}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold text-gray-200">
              {percentLabel}
            </span>
            {step.displayedPercent !== null ? (
              <span className="hidden rounded-full border border-brand-purple/20 bg-brand-purple/10 px-2 py-1 text-[10px] font-semibold text-brand-purple md:inline-flex">
                {step.ratioMeaning === "event_volume_ratio"
                  ? "Event ratio"
                  : step.ratioMeaning === "not_comparable"
                    ? "Base"
                    : step.ratioMeaning}
              </span>
            ) : null}
            {rowDiffers ? (
              <AdminStatusBadge
                state="degraded"
                label="PARTIAL"
                className="max-w-[4.5rem] truncate whitespace-nowrap px-1.5 py-0.5 text-[9px]"
              />
            ) : null}
          </div>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-purple to-cyan-400"
            style={{ width: `${barWidth}%` }}
          />
        </div>
      </div>
    );
  };

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
              title="Activity Snapshot"
              subtitle="Recent first-party activity and graph health."
              icon={Activity}
              density="compact"
              defaultExpanded={false}
              rightSlot={(
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <AnalyticsViewModeToggle
                    value={livePulseViewMode}
                    onChange={setLivePulseViewMode}
                    options={[
                      { id: "cards", label: "Cards" },
                      { id: "chart", label: "Chart" },
                      { id: "table", label: "Table" },
                    ]}
                  />
                  {renderSectionRangeControl("livePulse")}
                </div>
              )}
            >
              <div
                className="mb-2.5 flex flex-col gap-2 rounded-[1rem] border border-white/10 bg-white/[0.035] px-3 py-2 text-[11px] leading-5 text-gray-300 md:flex-row md:items-center md:justify-between"
                data-admin-analytics-snapshot-priority="analytics_admin_metric_snapshots"
                data-admin-analytics-vendor-source-label="vendor_evidence"
                data-admin-analytics-raw-ledger-display="debug_only"
                data-admin-analytics-recovery-promotion="debug_only_not_promoted"
                data-admin-analytics-live-pulse-default-expanded="false"
                title={livePulseModel.topWarningDetail ?? livePulseModel.topWarning}
              >
                <div className="min-w-0">
                  <p>{livePulseCompactStatusLine}</p>
                  {livePulseCompactIssueLine ? (
                    <p className="mt-1 text-[10px] text-gray-400">{livePulseCompactIssueLine}</p>
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

              <div
                className="space-y-2"
                data-admin-analytics-mobile-view-mode={livePulseViewMode}
                data-live-pulse-graph-source={livePulseModel.graphSourceLabel}
                data-live-pulse-refresh-state={livePulseModel.refreshState}
                data-live-pulse-source-state={livePulseModel.graphHydrated ? "loaded" : "no_sample"}
              >
              {livePulseViewMode === "cards" ? (
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
                  hint={guestMixHint}
                  icon={Sparkles}
                  truthState={guestMixTruthState}
                  statusBadgeLabel={guestMixBadgeLabel}
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
              ) : null}

              {livePulseViewMode === "chart" ? (
              <div
                className={cn("relative w-full", livePulseModel.compactChartHeightClass)}
                data-live-pulse-chart="compact"
                data-live-pulse-graph-source={livePulseModel.graphSourceLabel}
                data-live-pulse-refresh-state={livePulseModel.refreshState}
              >
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
                      ? "Graph waiting for a realtime upgrade."
                      : liveLoading ? "Graph awaiting first snapshot." : "No verified graph data yet."}
                  </div>
                )}
              </div>
              ) : null}

              {livePulseViewMode === "table" ? (
              <div
                className="grid gap-2 xl:grid-cols-[0.9fr_1.1fr]"
                data-live-pulse-table="compact"
                data-live-pulse-graph-source={livePulseModel.graphSourceLabel}
                data-live-pulse-refresh-state={livePulseModel.refreshState}
              >
                <div className="rounded-[1rem] border border-white/10 bg-black/30 p-2.5 md:p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                      Snapshot surfaces
                    </p>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold text-gray-300">
                      {livePulseModel.surfaces.length} lanes
                    </span>
                  </div>
                  <div className="space-y-2 md:hidden">
                    {livePulseModel.surfaces.length > 0 ? (
                      <>
                        {mobileVisibleLiveSurfaces.map(renderLiveSurfaceRow)}
                        {hiddenLiveSurfaceCount > 0 ? (
                          <div className="rounded-[0.9rem] border border-dashed border-white/10 bg-black/20 px-2.5 py-2 text-[11px] text-gray-400">
                            +{hiddenLiveSurfaceCount} more in Debug
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <div className="rounded-[0.9rem] border border-dashed border-white/10 bg-black/20 p-3 text-xs text-gray-500">
                        <AdminStatusBadge state={livePulseTruthState} className="mb-2" />
                        Surface detail has no verified realtime upgrade yet.
                      </div>
                    )}
                  </div>
                  <div className="hidden space-y-2 md:block">
                    {livePulseModel.surfaces.length > 0 ? (
                      livePulseModel.surfaces.map(renderLiveSurfaceRow)
                    ) : (
                      <div className="rounded-[0.9rem] border border-dashed border-white/10 bg-black/20 p-3 text-xs text-gray-500">
                        <AdminStatusBadge state={livePulseTruthState} className="mb-2" />
                        Surface detail has no verified realtime upgrade yet.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-[1rem] border border-white/10 bg-black/30 p-2.5 md:p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                      Active identities
                    </p>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold text-gray-300">
                      {livePulseModel.activeIdentities.length} shown
                    </span>
                  </div>
                  <div
                    className="rounded-[1rem] border border-white/10 bg-black/25 px-3 py-2 text-[11px] text-gray-300 md:hidden"
                    data-admin-analytics-mobile-can-show-identity-details={String(livePulseModel.mobileCanShowIdentityDetails)}
                  >
                    {livePulseModel.mobilePrimaryIdentitySummary}
                  </div>
                  <div className="hidden space-y-1.5 md:block">
                    {livePulseModel.activeIdentities.length > 0 ? (
                      livePulseModel.activeIdentities.map(renderActiveIdentityRow)
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
              ) : null}
              </div>
            </SectionCard>

            <SectionCard
              title={journeyFunnelModel.visibleTitle}
              subtitle="Repeated event-volume chain. Not a unique-user funnel."
              icon={Eye}
              density="compact"
              rightSlot={(
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <AnalyticsViewModeToggle
                    value={journeyFunnelViewMode}
                    onChange={setJourneyFunnelViewMode}
                    options={[
                      { id: "cards", label: "Cards" },
                      { id: "chart", label: "Chart" },
                      { id: "table", label: "Table" },
                    ]}
                  />
                  {renderSectionRangeControl("journeyFunnel")}
                </div>
              )}
            >
              <div
                className="mb-2 flex flex-col gap-2 rounded-[1rem] border border-white/10 bg-white/[0.035] px-3 py-2 text-[11px] leading-4 text-gray-300 md:flex-row md:items-center md:justify-between"
                data-admin-analytics-hydration-state={journeyFunnelModel.hydrationState}
                data-admin-analytics-measurement-mode={journeyFunnelModel.measurementMode}
                data-admin-analytics-exact-user-funnel-available={String(journeyFunnelModel.exactUserFunnelAvailable)}
                data-admin-analytics-manual-workaround={journeyFunnelModel.manualWorkaround ?? ""}
                title={journeyFunnelModel.algorithmRecommendation ?? journeyFunnelModel.recommendation}
              >
                <span>{journeyFunnelModel.visibleHelperCopy}</span>
                <AdminStatusBadge
                  state={historicalMetricTruthState}
                  label={journeyFunnelBadgeLabel}
                  className="max-w-[5.75rem] truncate whitespace-nowrap px-1.5 py-0.5 text-[9px]"
                />
              </div>

              {!eventChainHasUsableSample ? (
                <div className="max-h-[8.75rem] space-y-2 overflow-hidden rounded-[1rem] border border-white/10 bg-black/25 px-3 py-2 text-[11px] leading-4 text-gray-300">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-white">
                      {journeyFunnelModel.hydrationState === "unavailable" ? "Event chain unavailable" : "No event sample yet"}
                    </p>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold text-gray-300">
                      {journeyFunnelModel.modeLabel}
                    </span>
                  </div>
                  <p>{journeyFunnelModel.unavailableReason}</p>
                  <p className="text-[10px] text-gray-400">
                    Manual workaround: generate sample activity, refresh snapshots, or inspect Debug.
                  </p>
                  <p className="text-[10px] text-gray-500" title={journeyFunnelModel.algorithmRecommendation ?? undefined}>
                    Exact funnel unavailable until ordered actor/session transitions exist.
                  </p>
                </div>
              ) : (
                <div
                  className="space-y-2"
                  data-admin-analytics-mobile-view-mode={journeyFunnelViewMode}
                  data-journey-funnel-hydration-state={journeyFunnelModel.hydrationState}
                  data-journey-funnel-measurement-mode={journeyFunnelModel.measurementMode}
                  data-journey-funnel-denominator-mode={journeyFunnelModel.denominatorMode}
                  data-journey-funnel-exact-user-funnel-available={String(journeyFunnelModel.exactUserFunnelAvailable)}
                >
                  {journeyFunnelViewMode === "chart" ? (
                    <div
                      className="h-56 rounded-[1rem] border border-white/10 bg-black/25 p-3"
                      data-journey-funnel-chart="compact"
                      data-journey-funnel-hydration-state={journeyFunnelModel.hydrationState}
                      data-journey-funnel-measurement-mode={journeyFunnelModel.measurementMode}
                      data-journey-funnel-denominator-mode={journeyFunnelModel.denominatorMode}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={journeyFunnelChartRows} margin={{ top: 4, right: 0, left: -22, bottom: 0 }}>
                          <defs>
                            <linearGradient id="journeyFunnelCountFill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#b28cff" stopOpacity={0.32} />
                              <stop offset="95%" stopColor="#b28cff" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="journeyFunnelPercentFill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.26} />
                              <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                            </linearGradient>
                          </defs>
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
                          <YAxis stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                          <Tooltip content={<AnalyticsTooltip />} />
                          <Area type="monotone" dataKey="countValue" name="Events" stroke="#b28cff" strokeWidth={2} fill="url(#journeyFunnelCountFill)" />
                          <Area type="monotone" dataKey="percentValue" name="Percent" stroke="#22d3ee" strokeWidth={2} fill="url(#journeyFunnelPercentFill)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : null}

                  {journeyFunnelViewMode === "table" ? (
                    <div
                      className="overflow-x-auto rounded-[1rem] border border-white/10 bg-black/25"
                      data-journey-funnel-table="compact"
                      data-journey-funnel-hydration-state={journeyFunnelModel.hydrationState}
                      data-journey-funnel-measurement-mode={journeyFunnelModel.measurementMode}
                      data-journey-funnel-denominator-mode={journeyFunnelModel.denominatorMode}
                    >
                      <table className="min-w-full text-left text-xs">
                        <thead className="border-b border-white/10 text-[10px] uppercase tracking-[0.12em] text-gray-500">
                          <tr>
                            <th className="px-3 py-2 font-semibold">Step</th>
                            <th className="px-3 py-2 font-semibold">Events</th>
                            <th className="px-3 py-2 font-semibold">Percent</th>
                            <th className="px-3 py-2 font-semibold">Denominator</th>
                            <th className="px-3 py-2 font-semibold">Source</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10 text-gray-300">
                          {journeyFunnelModel.steps.map((step) => (
                            <tr
                              key={step.stepKey}
                              data-journey-funnel-step-key={step.stepKey}
                              data-journey-funnel-source-mismatch={String(journeyFunnelModel.sourceMismatchSteps.includes(step.stepKey))}
                            >
                              <td className="max-w-[16rem] px-3 py-2">
                                <p className="truncate font-semibold text-white">{step.visibleLabel}</p>
                                <p className="truncate text-[11px] text-gray-500">{step.explanation}</p>
                              </td>
                              <td className="px-3 py-2">{journeyCountLabel(step.displayedCount)}</td>
                              <td className="px-3 py-2">{step.denominatorStep ? journeyPercentLabel(step.displayedPercent) : "Base"}</td>
                              <td className="px-3 py-2">{step.denominatorLabel}</td>
                              <td className="px-3 py-2">{step.ratioMeaning.replaceAll("_", " ")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}

                  {journeyFunnelViewMode === "cards" ? (
                    <>
                      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                        <MetricCard
                          label="Mode"
                          value={journeyFunnelModel.modeLabel}
                          hint={formatAdminAnalyticsJourneyDenominatorMode(journeyFunnelModel.denominatorMode)}
                          icon={Route}
                          truthState={historicalMetricTruthState}
                          statusBadgeLabel={journeyFunnelBadgeLabel}
                          className="rounded-[1rem] p-2 min-h-[4.75rem]"
                          valueClassName="text-[1.05rem] leading-5 md:text-lg"
                        />
                        <MetricCard
                          label="Base"
                          value={journeyCountLabel(journeyFunnelModel.steps[0]?.displayedCount ?? null)}
                          hint="Auth modal events"
                          icon={Users}
                          truthState={historicalMetricTruthState}
                          statusBadgeLabel={journeyFunnelBadgeLabel}
                          className="rounded-[1rem] p-2 min-h-[4.75rem]"
                          valueClassName="text-[1.05rem] leading-5 md:text-lg"
                        />
                        <MetricCard
                          label="Largest Event-Volume Decrease"
                          value={biggestDropoffLabel}
                          hint="Largest prior-step event gap"
                          icon={AlertTriangle}
                          truthState={historicalMetricTruthState}
                          statusBadgeLabel={journeyFunnelBadgeLabel}
                          className="rounded-[1rem] p-2 min-h-[4.75rem]"
                          valueClassName="truncate text-[1.05rem] leading-5 md:text-lg"
                        />
                        <MetricCard
                          label="Attention"
                          value={journeyFunnelModel.nonSequentialSteps.length.toLocaleString()}
                          hint="Non-sequential steps"
                          icon={CheckCircle2}
                          truthState={historicalMetricTruthState}
                          statusBadgeLabel={journeyFunnelBadgeLabel}
                          className="rounded-[1rem] p-2 min-h-[4.75rem]"
                          valueClassName="text-[1.05rem] leading-5 md:text-lg"
                        />
                      </div>

                      {journeyFunnelModel.visibleDegradedCopy ? (
                        <p className="rounded-[1rem] border border-white/10 bg-black/25 px-3 py-2 text-[11px] leading-4 text-gray-300">
                          {journeyFunnelModel.visibleDegradedCopy}
                        </p>
                      ) : null}

                      <div className="grid grid-cols-2 gap-2">
                        {journeyFunnelModel.supportingEvents.map((item) => (
                          <MetricCard
                            key={item.stepKey}
                            label={item.visibleLabel}
                            value={journeyCountLabel(item.count)}
                            hint={item.explanation}
                            icon={item.stepKey === "shares" ? Share2 : CheckCircle2}
                            truthState={historicalMetricTruthState}
                            statusBadgeLabel={journeyFunnelBadgeLabel}
                            className="rounded-[1rem] p-2 min-h-[4.75rem]"
                            valueClassName="text-[1.05rem] leading-5 md:text-lg"
                          />
                        ))}
                      </div>
                    </>
                  ) : null}

                  {eventChainCanRenderDetails && journeyFunnelViewMode === "cards" ? (
                    <details className="space-y-1.5">
                      <summary className="cursor-pointer rounded-[1rem] border border-white/10 bg-black/25 px-3 py-2 text-[11px] font-semibold text-gray-300">
                        Step details
                      </summary>
                      <div className="mt-2 space-y-1.5">
                        {journeyFunnelModel.steps.map(renderJourneyStepRow)}
                      </div>
                    </details>
                  ) : null}

                  <p className="rounded-[1rem] border border-white/10 bg-black/25 px-3 py-2 text-[11px] leading-4 text-gray-300">
                    {journeyFunnelModel.recommendation}
                  </p>
                </div>
              )}
            </SectionCard>

            <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
              <SectionCard
                title="Auth Outcomes"
                subtitle="Source-truthed auth attempts, lifecycle outcomes, and finish timing."
                icon={Users}
                density="compact"
                rightSlot={(
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <AnalyticsViewModeToggle
                      value={authOutcomeViewMode}
                      onChange={setAuthOutcomeViewMode}
                      options={[
                        { id: "cards", label: "Cards" },
                        { id: "chart", label: "Chart" },
                        { id: "table", label: "Table" },
                      ]}
                    />
                    {renderSectionRangeControl("authOutcomeSplit")}
                  </div>
                )}
              >
                <div
                  className="mb-2 flex flex-col gap-2 rounded-[1rem] border border-white/10 bg-white/[0.035] px-3 py-2 text-[11px] leading-4 text-gray-300 md:flex-row md:items-center md:justify-between"
                  data-admin-analytics-auth-hydration-state={authOutcomeModel.hydrationState}
                  data-admin-analytics-auth-measurement-mode={authOutcomeModel.measurementMode}
                  data-admin-analytics-auth-exact-chain-available={String(authOutcomeModel.trackingCapability.exactAttemptChainAvailable)}
                  data-admin-analytics-auth-failure-reasons-available={String(authOutcomeModel.trackingCapability.failureReasonsAvailable)}
                  data-admin-analytics-auth-manual-workaround={authOutcomeModel.trackingCapability.manualWorkaround}
                  title={authOutcomeModel.algorithmRecommendation ?? undefined}
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-white">{authOutcomeModel.primarySummary}</p>
                    {authOutcomeModel.mobileCompactDetail ? (
                      <p className="mt-1 text-[10px] text-gray-400">{authOutcomeModel.mobileCompactDetail}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold text-gray-300">
                      {authOutcomeModel.measurementMode === "canonical_attempt_chain"
                        ? "Attempt chain"
                        : authOutcomeModel.measurementMode === "legacy_event_counts"
                          ? "Legacy counts"
                          : authOutcomeModel.hydrationState === "waiting"
                            ? "Loading"
                            : "No sample"}
                    </span>
                    <AdminStatusBadge
                      state={historicalMetricTruthState}
                      label={authOutcomeBadgeLabel}
                      className="max-w-[5.75rem] truncate whitespace-nowrap px-1.5 py-0.5 text-[9px]"
                    />
                  </div>
                </div>

                {!authHasUsableSample ? (
                  <div className="max-h-[8.75rem] space-y-2 overflow-hidden rounded-[1rem] border border-white/10 bg-black/25 px-3 py-2 text-[11px] leading-4 text-gray-300">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-white">
                        {authOutcomeModel.hydrationState === "unavailable" ? "Auth outcomes unavailable" : "No auth sample yet"}
                      </p>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold text-gray-300">
                        {authOutcomeModel.modeLabel}
                      </span>
                    </div>
                    <p>{authOutcomeModel.unavailableReason}</p>
                    <p className="text-[10px] text-gray-400">
                      Manual: run email/password and Google login attempts, then refresh.
                    </p>
                  </div>
                ) : (
                  <div
                    className="space-y-2"
                    data-admin-analytics-mobile-view-mode={authOutcomeViewMode}
                    data-auth-outcomes-hydration-state={authOutcomeModel.hydrationState}
                    data-auth-outcomes-measurement-mode={authOutcomeModel.measurementMode}
                    data-auth-outcomes-source-state={authCanRenderDetails ? "loaded" : "no_sample"}
                  >
                    {authOutcomeViewMode === "chart" ? (
                      <div
                        className="h-56 rounded-[1rem] border border-white/10 bg-black/25 p-3"
                        data-auth-outcomes-chart="compact"
                        data-auth-outcomes-hydration-state={authOutcomeModel.hydrationState}
                        data-auth-outcomes-measurement-mode={authOutcomeModel.measurementMode}
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={authMethodChartRows} margin={{ top: 4, right: 0, left: -22, bottom: 0 }}>
                            <defs>
                              <linearGradient id="authOutcomeSuccessFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#b28cff" stopOpacity={0.32} />
                                <stop offset="95%" stopColor="#b28cff" stopOpacity={0} />
                              </linearGradient>
                              <linearGradient id="authOutcomeFailureFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#fb7185" stopOpacity={0.28} />
                                <stop offset="95%" stopColor="#fb7185" stopOpacity={0} />
                              </linearGradient>
                            </defs>
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
                            <YAxis stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                            <Tooltip content={<AnalyticsTooltip />} />
                            <Area type="monotone" dataKey="successesValue" name="Successes" stroke="#b28cff" strokeWidth={2} fill="url(#authOutcomeSuccessFill)" />
                            <Area type="monotone" dataKey="failuresValue" name="Failures" stroke="#fb7185" strokeWidth={2} fill="url(#authOutcomeFailureFill)" />
                            <Area type="monotone" dataKey="unfinishedValue" name="Unfinished" stroke="#64748b" strokeWidth={2} fill="transparent" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    ) : null}

                    {authOutcomeViewMode === "table" ? (
                      <div
                        className="overflow-x-auto rounded-[1rem] border border-white/10 bg-black/25"
                        data-auth-outcomes-table="compact"
                        data-auth-outcomes-hydration-state={authOutcomeModel.hydrationState}
                        data-auth-outcomes-measurement-mode={authOutcomeModel.measurementMode}
                      >
                        <table className="min-w-full text-left text-xs">
                          <thead className="border-b border-white/10 text-[10px] uppercase tracking-[0.12em] text-gray-500">
                            <tr>
                              <th className="px-3 py-2 font-semibold">Method</th>
                              <th className="px-3 py-2 font-semibold">Attempts</th>
                              <th className="px-3 py-2 font-semibold">Successes</th>
                              <th className="px-3 py-2 font-semibold">Failures</th>
                              <th className="px-3 py-2 font-semibold">Unfinished</th>
                              <th className="px-3 py-2 font-semibold">State</th>
                              <th className="px-3 py-2 font-semibold">Top failure</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/10 text-gray-300">
                            {authOutcomeModel.methodBreakdown.map((item) => (
                              <tr key={`auth-outcomes-method-table-${item.methodKey}`}>
                                <td className="max-w-[14rem] truncate px-3 py-2 font-semibold text-white">{item.visibleLabel}</td>
                                <td className="px-3 py-2">{authCountLabel(item.attempts)}</td>
                                <td className="px-3 py-2">{authCountLabel(item.successes)}</td>
                                <td className="px-3 py-2">{authCountLabel(item.failures)}</td>
                                <td className="px-3 py-2">{authCountLabel(item.unfinished)}</td>
                                <td className="px-3 py-2">{item.state}</td>
                                <td className="max-w-[14rem] truncate px-3 py-2">
                                  {formatAuthFailureReason(item.failureBreakdown[0]?.failureCode)}
                                </td>
                              </tr>
                            ))}
                            {authOutcomeModel.lifecycleOutcomes.map((item) => (
                              <tr key={`auth-outcomes-lifecycle-table-${item.name}`}>
                                <td className="max-w-[14rem] truncate px-3 py-2 font-semibold text-white">
                                  {item.name === "registration_completed" ? "Registration completed" : "Navigation session established"}
                                </td>
                                <td className="px-3 py-2">{authCountLabel(item.count)}</td>
                                <td className="px-3 py-2">n/a</td>
                                <td className="px-3 py-2">n/a</td>
                                <td className="px-3 py-2">n/a</td>
                                <td className="px-3 py-2">{item.state}</td>
                                <td className="max-w-[14rem] truncate px-3 py-2">{item.explanation}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : null}

                    {authOutcomeViewMode === "cards" ? (
                      <>
                    <div className="grid grid-cols-2 gap-2 md:hidden">
                      <MetricCard
                        label="Email/password"
                        value={authGroupValue(authOutcomeModel.methodGroups.emailPassword)}
                        hint={authGroupHint(authOutcomeModel.methodGroups.emailPassword)}
                        icon={Users}
                        truthState={historicalMetricTruthState}
                        statusBadgeLabel={authOutcomeBadgeLabel}
                        className="rounded-[1rem] p-2 min-h-[4.75rem]"
                        valueClassName="text-[1.05rem] leading-5 md:text-lg"
                      />
                      <MetricCard
                        label="Google"
                        value={authGroupValue(authOutcomeModel.methodGroups.google)}
                        hint={authGroupHint(authOutcomeModel.methodGroups.google)}
                        icon={Sparkles}
                        truthState={historicalMetricTruthState}
                        statusBadgeLabel={authOutcomeBadgeLabel}
                        className="rounded-[1rem] p-2 min-h-[4.75rem]"
                        valueClassName="text-[1.05rem] leading-5 md:text-lg"
                      />
                    </div>

                    <div className="hidden grid-cols-2 gap-2 md:grid lg:grid-cols-5">
                      <MetricCard
                        label="Attempts"
                        value={authCountLabel(authOutcomeModel.attempts.value)}
                        hint="Auth attempts"
                        icon={Users}
                        truthState={historicalMetricTruthState}
                        statusBadgeLabel={authOutcomeBadgeLabel}
                        className="rounded-[1rem] p-2 min-h-[4.75rem]"
                        valueClassName="text-[1.05rem] leading-5 md:text-lg"
                      />
                      <MetricCard
                        label="Successes"
                        value={authCountLabel(authOutcomeModel.successes.value)}
                        hint="Terminal successes"
                        icon={CheckCircle2}
                        truthState={historicalMetricTruthState}
                        statusBadgeLabel={authOutcomeBadgeLabel}
                        className="rounded-[1rem] p-2 min-h-[4.75rem]"
                        valueClassName="text-[1.05rem] leading-5 md:text-lg"
                      />
                      <MetricCard
                        label="Failures"
                        value={authCountLabel(authOutcomeModel.failures.value)}
                        hint="Failed outcomes"
                        icon={AlertTriangle}
                        truthState={historicalMetricTruthState}
                        statusBadgeLabel={authOutcomeBadgeLabel}
                        className="rounded-[1rem] p-2 min-h-[4.75rem]"
                        valueClassName="text-[1.05rem] leading-5 md:text-lg"
                      />
                      <MetricCard
                        label="Success Rate"
                        value={authPercentLabel(authOutcomeModel.successRate.value)}
                        hint={authOutcomeModel.successRate.formula}
                        icon={Sparkles}
                        truthState={historicalMetricTruthState}
                        statusBadgeLabel={authOutcomeBadgeLabel}
                        className="rounded-[1rem] p-2 min-h-[4.75rem]"
                        valueClassName="text-[1.05rem] leading-5 md:text-lg"
                      />
                      <MetricCard
                        label="Avg Finish"
                        value={authFinishLabel}
                        hint={authOutcomeModel.timingAvailable ? "Completed attempts with start/end timestamps" : "Timing unavailable"}
                        icon={Clock3}
                        truthState={historicalMetricTruthState}
                        statusBadgeLabel={authOutcomeBadgeLabel}
                        className="rounded-[1rem] p-2 min-h-[4.75rem]"
                        valueClassName="truncate text-[1.05rem] leading-5 md:text-lg"
                      />
                    </div>

                    <div className="mt-2 grid gap-2 md:grid-cols-3">
                      <div className="rounded-[1rem] border border-white/10 bg-black/25 px-3 py-2 text-[11px] leading-4 text-gray-300">
                        <span className="font-semibold text-white">Email/password failure:</span>{" "}
                        {formatAuthFailureReason(authOutcomeModel.methodGroups.emailPassword.topFailureCode)}
                      </div>
                      <div className="rounded-[1rem] border border-white/10 bg-black/25 px-3 py-2 text-[11px] leading-4 text-gray-300">
                        <span className="font-semibold text-white">Google failure:</span>{" "}
                        {formatAuthFailureReason(authOutcomeModel.methodGroups.google.topFailureCode)}
                      </div>
                      <div className="rounded-[1rem] border border-white/10 bg-black/25 px-3 py-2 text-[11px] leading-4 text-gray-300">
                        <span className="font-semibold text-white">Most unfinished:</span>{" "}
                        {authOutcomeModel.mostUnfinishedMethod?.visibleLabel ?? "Unavailable"}
                      </div>
                    </div>

                    {authOutcomeModel.timingMissingReason ? (
                      <p className="mt-2 rounded-[1rem] border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-[11px] leading-4 text-amber-100">
                        {authOutcomeModel.timingMissingReason}
                      </p>
                    ) : null}

                    {authCanRenderDetails ? (
                      <>
                        <details className="mt-2 md:hidden">
                          <summary className="cursor-pointer rounded-[1rem] border border-white/10 bg-black/25 px-3 py-2 text-[11px] font-semibold text-gray-300">
                            Method details
                          </summary>
                          <div className="mt-2 space-y-1.5">
                            {authOutcomeModel.methodBreakdown.map((item) => {
                              const attempts = Math.max(1, item.attempts ?? 0);
                              const successShare = item.successes === null ? 0 : item.successes / attempts;
                              const failureShare = item.failures === null ? 0 : item.failures / attempts;
                              const unfinishedShare = item.unfinished === null ? 0 : item.unfinished / attempts;

                              return (
                                <div
                                  key={item.methodKey}
                                  className="rounded-[0.9rem] border border-white/10 bg-white/[0.03] px-2.5 py-2"
                                >
                                  <div className="mb-1.5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                                    <div className="min-w-0">
                                      <p className="truncate text-xs font-semibold text-white">{item.visibleLabel}</p>
                                      <p className="mt-0.5 truncate text-[10px] text-gray-500">
                                        {authCountLabel(item.attempts)} attempts · {authCountLabel(item.failures)} failures
                                      </p>
                                    </div>
                                    <span className="rounded-full border border-brand-purple/25 bg-brand-purple/10 px-2 py-1 text-[10px] font-bold text-brand-purple">
                                      {formatPercent(item.successRatePct / 100)}
                                    </span>
                                  </div>
                                  <div className="flex h-1 overflow-hidden rounded-full bg-white/10">
                                    <div className="h-full bg-brand-purple" style={{ width: `${successShare * 100}%` }} />
                                    <div className="h-full bg-rose-400" style={{ width: `${failureShare * 100}%` }} />
                                    <div className="h-full bg-slate-500" style={{ width: `${unfinishedShare * 100}%` }} />
                                  </div>
                                  {item.failureBreakdown[0] ? (
                                    <p className="mt-1 text-[10px] text-gray-400">
                                      Top failure: {formatAuthFailureReason(item.failureBreakdown[0].failureCode)}
                                    </p>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        </details>

                        <div className="mt-2 hidden rounded-[1rem] border border-white/10 bg-black/30 p-2.5 md:block md:p-3">
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                              Method split
                            </p>
                            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold text-gray-300">
                              {authOutcomeModel.methodBreakdown.length} methods
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            {authOutcomeModel.methodBreakdown.map((item) => {
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
                                        {authCountLabel(item.attempts)} attempts · {authCountLabel(item.successes)} successes · {authCountLabel(item.failures)} failures · {authCountLabel(item.unfinished)} unfinished
                                      </p>
                                    </div>
                                    <span className="rounded-full border border-brand-purple/25 bg-brand-purple/10 px-2 py-1 text-[10px] font-bold text-brand-purple">
                                      {formatPercent(item.successRatePct / 100)}
                                    </span>
                                  </div>
                                  <div className="flex h-1 overflow-hidden rounded-full bg-white/10">
                                    <div className="h-full bg-brand-purple" style={{ width: `${successShare * 100}%` }} />
                                    <div className="h-full bg-rose-400" style={{ width: `${failureShare * 100}%` }} />
                                    <div className="h-full bg-slate-500" style={{ width: `${unfinishedShare * 100}%` }} />
                                  </div>
                                  <div className="mt-1.5 flex flex-wrap gap-2 text-[10px] text-gray-400">
                                    <span>State: {item.state}</span>
                                    <span>Avg finish: {item.avgFinishMs ? formatDuration(item.avgFinishMs / 1000) : "Unavailable"}</span>
                                    {item.failureBreakdown[0] ? <span>Top failure: {formatAuthFailureReason(item.failureBreakdown[0].failureCode)}</span> : null}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="mt-2 hidden rounded-[1rem] border border-white/10 bg-black/25 p-2.5 md:block md:p-3">
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                              Auth lifecycle outcomes
                            </p>
                            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold text-gray-300">
                              {authOutcomeModel.lifecycleOutcomes.length} rows
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            {authOutcomeModel.lifecycleOutcomes.map((item) => (
                              <div
                                key={item.name}
                                className="rounded-[0.9rem] border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] leading-5 text-gray-300"
                              >
                                <p className="text-xs font-semibold text-white">
                                  {item.name === "registration_completed" ? "Registration completed" : "Navigation session established"}
                                </p>
                                <p className="mt-0.5 truncate text-[10px] text-gray-500">
                                  {authCountLabel(item.count)} outcomes · {item.state}
                                </p>
                                <p className="mt-0.5 text-[10px] leading-4 text-gray-400">
                                  {item.explanation}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : null}
                      </>
                    ) : null}
                  </div>
                )}
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
              subtitle="Estimated guest traffic, consent-safe guest quality, and signed-in bounce truth."
              icon={Monitor}
              rightSlot={(
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <AnalyticsViewModeToggle
                    value={guestQualityViewMode}
                    onChange={setGuestQualityViewMode}
                    options={[
                      { id: "cards", label: "Cards" },
                      { id: "chart", label: "Chart" },
                      { id: "table", label: "Table" },
                    ]}
                  />
                  {renderSectionRangeControl("categorySemantics")}
                </div>
              )}
            >
              <div
                className="mb-2.5 flex flex-col gap-2 rounded-[1rem] border border-white/10 bg-white/[0.035] px-3 py-2 text-[11px] leading-5 text-gray-300 md:flex-row md:items-center md:justify-between"
                data-guest-quality-state={guestBounceQualityModel.guestQuality.state}
                data-guest-quality-chart-collapsed-because-empty={guestBounceQualityModel.chartCollapsedBecauseEmpty}
              >
                <div className="min-w-0">
                  <p>{guestBounceQualityModel.visibleCopy}</p>
                  <p className="mt-1 text-[10px] text-gray-400">
                    {guestBounceQualityModel.summaryFacts.join(" · ")}
                  </p>
                  <p className="mt-1 text-[10px] text-gray-400">
                    {vendorEvidenceLabel} supports comparison only; recovery evidence remains {debugRecoveryLabel} and {recoveryReviewLabel}.
                  </p>
                </div>
                <AdminStatusBadge
                  state={guestBounceQualityModel.truthState}
                  label={guestBounceQualityModel.badgeLabel}
                  className="max-w-[6.25rem] truncate whitespace-nowrap px-1.5 py-0.5 text-[9px]"
                />
              </div>

              <div
                className="space-y-2"
                data-admin-analytics-mobile-view-mode={guestQualityViewMode}
                data-guest-quality-state={guestBounceQualityModel.guestQuality.state}
                data-guest-quality-series-state={guestBounceQualityModel.series.state}
                data-guest-estimate-source-truth={guestBounceQualityModel.estimatedGuestViews.sourceTruth}
                data-signed-in-bounce-state={guestBounceQualityModel.signedInBounce.freshnessState}
              >
                {guestQualityViewMode === "chart" ? (
                  <div
                    className="h-52 rounded-[1rem] border border-white/10 bg-black/25 p-3"
                    data-guest-quality-chart="compact"
                    data-guest-quality-state={guestBounceQualityModel.guestQuality.state}
                    data-guest-quality-series-state={guestBounceQualityModel.series.state}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={guestQualityChartRows} margin={{ top: 4, right: 0, left: -22, bottom: 0 }}>
                        <defs>
                          <linearGradient id="guestQualitySampleFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#b28cff" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#b28cff" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis dataKey="label" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} interval={0} angle={-18} textAnchor="end" height={52} />
                        <YAxis stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip content={<AnalyticsTooltip />} />
                        <Area type="monotone" dataKey="value" name="Sample count" stroke="#b28cff" strokeWidth={2} fill="url(#guestQualitySampleFill)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : null}

                {guestQualityViewMode === "table" ? (
                  <div
                    className="overflow-x-auto rounded-[1rem] border border-white/10 bg-black/25"
                    data-guest-quality-table="compact"
                    data-guest-quality-state={guestBounceQualityModel.guestQuality.state}
                    data-guest-quality-series-state={guestBounceQualityModel.series.state}
                  >
                    <table className="min-w-full text-left text-xs">
                      <thead className="border-b border-white/10 text-[10px] uppercase tracking-[0.12em] text-gray-500">
                        <tr>
                          <th className="px-3 py-2 font-semibold">Signal</th>
                          <th className="px-3 py-2 font-semibold">Value</th>
                          <th className="px-3 py-2 font-semibold">Source/state</th>
                          <th className="px-3 py-2 font-semibold">Freshness</th>
                          <th className="px-3 py-2 font-semibold">Detail</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10 text-gray-300">
                        <tr>
                          <td className="px-3 py-2 font-semibold text-white">{guestBounceQualityModel.overallState === "verified" ? "Guest Views" : "Estimated Guest Views"}</td>
                          <td className="px-3 py-2">{guestBounceQualityModel.estimatedGuestViews.display}</td>
                          <td className="px-3 py-2">{guestBounceQualityModel.estimatedGuestViews.sourceTruth}</td>
                          <td className="px-3 py-2">{guestBounceQualityModel.estimatedGuestViews.freshnessState}</td>
                          <td className="max-w-[16rem] truncate px-3 py-2">{guestBounceQualityModel.estimatedGuestViews.formula ?? "Formula unavailable"}</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-semibold text-white">Guest Quality</td>
                          <td className="px-3 py-2">{guestBounceQualityModel.guestQuality.state === "available" ? guestQualityCountLabel(guestBounceQualityModel.guestQuality.sampleCount) : "No sample"}</td>
                          <td className="px-3 py-2">{guestBounceQualityModel.guestQuality.state}</td>
                          <td className="px-3 py-2">{formatRelativeUtc(guestBounceQualityModel.guestQuality.lastGuestBatchAtUtc)}</td>
                          <td className="max-w-[16rem] truncate px-3 py-2">{guestBounceQualityModel.guestQuality.nextAction}</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-semibold text-white">Signed-in Bounce</td>
                          <td className="px-3 py-2">{guestBounceQualityModel.signedInBounce.display}</td>
                          <td className="px-3 py-2">{guestBounceQualityModel.signedInBounce.freshnessState}</td>
                          <td className="px-3 py-2">{guestBounceQualityModel.signedInBounce.sampleCount ?? "unavailable"}</td>
                          <td className="max-w-[16rem] truncate px-3 py-2">{guestBounceQualityModel.signedInBounce.explanation}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : null}

                {guestQualityViewMode === "cards" ? (
              <div className="grid gap-2 md:grid-cols-3">
                <div
                  data-guest-estimated-views={guestBounceQualityModel.estimatedGuestViews.value}
                  data-guest-estimate-source-truth={guestBounceQualityModel.estimatedGuestViews.sourceTruth}
                  data-guest-estimate-formula-state={guestBounceQualityModel.estimatedGuestViews.formulaState}
                  data-guest-estimate-state={livePulseModel.guestEstimateState}
                  data-admin-analytics-vendor-source-label="vendor_evidence"
                  data-admin-analytics-recovery-promotion="debug_only_not_promoted"
                >
                  <MetricCard
                    label={guestBounceQualityModel.overallState === "verified" ? "Guest Views" : "Estimated Guest Views"}
                    value={guestBounceQualityModel.estimatedGuestViews.display}
                    hint={`Source ${guestBounceQualityModel.estimatedGuestViews.sourceTruth} · ${guestBounceQualityModel.estimatedGuestViews.formula ?? "Formula unavailable"}`}
                    icon={Users}
                    truthState={guestBounceQualityModel.estimatedGuestViews.freshnessState === "stale" ? "stale" : guestBounceQualityModel.truthState}
                    statusBadgeLabel="EST"
                    className="rounded-[1rem] p-2"
                    valueClassName="text-lg leading-6 md:text-xl"
                  />
                </div>
                <div
                  data-guest-consented-batch-count={guestBounceQualityModel.guestQuality.consentedGuestBatchCount}
                  data-guest-last-batch-at-utc={guestBounceQualityModel.guestQuality.lastGuestBatchAtUtc ?? "none"}
                  data-guest-quality-next-action={guestBounceQualityModel.guestQuality.nextAction}
                >
                  <MetricCard
                    label="Guest Quality"
                    value={guestBounceQualityModel.guestQuality.state === "available" ? guestQualityCountLabel(guestBounceQualityModel.guestQuality.sampleCount) : "No sample"}
                    hint={guestQualityHint}
                    icon={AlertTriangle}
                    truthState={guestBounceQualityModel.guestQuality.state === "available" ? guestBounceQualityModel.truthState : "degraded"}
                    statusBadgeLabel={guestBounceQualityModel.guestQuality.state === "available" ? "LIVE" : "NO SAMPLE"}
                    className="rounded-[1rem] p-2"
                    valueClassName="truncate text-base leading-6 md:text-lg"
                  />
                </div>
                <div data-signed-in-bounce-state={guestBounceQualityModel.signedInBounce.freshnessState}>
                  <MetricCard
                    label="Signed-in Bounce"
                    value={guestBounceQualityModel.signedInBounce.display}
                    hint={signedInBounceHint}
                    icon={Activity}
                    truthState={guestBounceQualityModel.signedInBounce.freshnessState === "stale" ? "stale" : guestBounceQualityModel.signedInBounce.value === null ? "degraded" : "live"}
                    statusBadgeLabel={guestBounceQualityModel.signedInBounce.freshnessState === "stale" ? "DELAYED" : guestBounceQualityModel.signedInBounce.value === null ? "PARTIAL" : "LIVE"}
                    className="rounded-[1rem] p-2"
                    valueClassName="truncate text-base leading-6 md:text-lg"
                  />
                </div>
              </div>
                ) : null}
              </div>

              <div className="mt-2 grid gap-2 rounded-[1rem] border border-white/10 bg-black/25 px-3 py-2 text-[11px] leading-5 text-gray-300 md:grid-cols-2">
                <span>
                  <span className="font-semibold text-white">Updated:</span>{" "}
                  {formatRelativeUtc(guestBounceQualityModel.generatedAtUtc)}
                </span>
                <span>
                  <span className="font-semibold text-white">Series:</span>{" "}
                  {guestBounceQualityModel.series.explanation}
                </span>
              </div>

              <div className="mt-2 grid gap-2 rounded-[1rem] border border-white/10 bg-black/20 px-3 py-2 text-[10px] leading-5 text-gray-400 md:grid-cols-3">
                <span>
                  <span className="font-semibold text-white">Estimate freshness:</span>{" "}
                  {guestBounceQualityModel.estimatedGuestViews.freshnessState}
                </span>
                <span>
                  <span className="font-semibold text-white">Last guest batch:</span>{" "}
                  {formatRelativeUtc(guestBounceQualityModel.guestQuality.lastGuestBatchAtUtc)}
                </span>
                <span>
                  <span className="font-semibold text-white">Signed-in sample:</span>{" "}
                  {guestBounceQualityModel.signedInBounce.sampleCount ?? "unavailable"}
                </span>
              </div>
            </SectionCard>
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <SectionCard
              title="Event Mix"
              subtitle="Top event activity with catalog inference and verified surface-context truth."
              icon={Sparkles}
              rightSlot={(
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <AnalyticsViewModeToggle
                    value={eventMixViewMode}
                    onChange={setEventMixViewMode}
                    options={[
                      { id: "cards", label: "Cards" },
                      { id: "chart", label: "Chart" },
                      { id: "table", label: "Table" },
                    ]}
                  />
                  {renderSectionRangeControl("eventMix")}
                </div>
              )}
            >
              <div className="grid gap-2.5">
                <div className="flex flex-col gap-2 rounded-[1rem] border border-white/10 bg-white/[0.035] px-3 py-2 text-[11px] leading-5 text-gray-300 md:flex-row md:items-center md:justify-between">
                      <span>{eventMixModel.visibleCopy || eventMixInferenceCopy}</span>
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
                        <span className="font-semibold text-white">Verified surface context:</span>{" "}
                        {eventMixModel.actualSurfaceContextState}
                      </span>
                    </div>

                    <div className="grid gap-2 rounded-[1rem] border border-white/10 bg-black/25 px-3 py-2 text-[11px] leading-5 text-gray-300 md:grid-cols-3">
                      <span>
                        <span className="font-semibold text-white">Catalog inference:</span>{" "}
                        {eventMixModel.catalogInferenceState}
                      </span>
                      <span data-event-mix-missing-reason="missing verified surface context">
                        <span className="font-semibold text-white">Missing verified surface context:</span>{" "}
                        {eventMixModel.eventsMissingSurfaceContext ?? "unknown"}
                      </span>
                      <span>
                        <span className="font-semibold text-white">Unmapped catalog events:</span>{" "}
                        {eventMixModel.eventsNeedingCatalogMapping ?? "unknown"}
                      </span>
                    </div>

                    <div
                      className="rounded-[1rem] border border-white/10 bg-black/30 p-3"
                      data-admin-analytics-mobile-view-mode={eventMixViewMode}
                      data-event-mix-source-mode={eventMixModel.eventMixSourceMode}
                      data-event-mix-surface-context={eventMixModel.actualSurfaceContextState}
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                          Ranked event activity
                      </p>
                      <span className="text-[10px] text-gray-500">
                        event count / total counted events
                      </span>
                    </div>

                    {eventMixModel.eventRows.length > 0 && eventMixViewMode === "chart" ? (
                      <div className="h-52 rounded-[0.9rem] border border-white/10 bg-black/25 p-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={eventMixModel.eventRows}
                            margin={{ top: 4, right: 0, left: -22, bottom: 0 }}
                          >
                            <defs>
                              <linearGradient id="eventMixCountFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#c084fc" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#c084fc" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                            <XAxis
                              dataKey="displayLabel"
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
                            <Area type="monotone" dataKey="rawCount" name="Events" stroke="#c084fc" strokeWidth={2} fill="url(#eventMixCountFill)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    ) : null}

                    {eventMixModel.eventRows.length > 0 && eventMixViewMode === "table" ? (
                      <div
                        className="overflow-x-auto rounded-[0.9rem] border border-white/10 bg-black/25"
                        data-event-mix-table="compact"
                        data-event-mix-source-mode={eventMixModel.eventMixSourceMode}
                        data-event-mix-surface-context={eventMixModel.actualSurfaceContextState}
                      >
                        <table className="min-w-full text-left text-xs">
                          <thead className="border-b border-white/10 text-[10px] uppercase tracking-[0.12em] text-gray-500">
                            <tr>
                              <th className="px-3 py-2 font-semibold">Event</th>
                              <th className="px-3 py-2 font-semibold">Count</th>
                              <th className="px-3 py-2 font-semibold">Share</th>
                              <th className="px-3 py-2 font-semibold">Category</th>
                              <th className="px-3 py-2 font-semibold">Surface</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/10 text-gray-300">
                            {eventMixModel.eventRows.map((item) => (
                              <tr
                                key={`event-mix-table-${item.eventKey}`}
                                data-event-mix-event-key={item.eventKey}
                                data-event-mix-mapping-state={item.mappingState}
                                data-event-mix-actual-surface-state={item.actualSurfaceState}
                              >
                                <td className="max-w-[16rem] px-3 py-2">
                                  <p className="truncate font-semibold text-white">{item.displayLabel}</p>
                                  <p className="truncate text-[11px] text-gray-500">{item.eventKey}</p>
                                </td>
                                <td className="px-3 py-2">{eventMixCountLabel(item.rawCount)}</td>
                                <td className="px-3 py-2">{eventMixShareLabel(item.share)}</td>
                                <td className="px-3 py-2">{item.catalogCategory ?? "missing"}</td>
                                <td className="px-3 py-2">{item.actualSurface ?? "missing"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : null}

                    {eventMixViewMode === "cards" ? (
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
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    <span className="rounded border border-white/10 bg-black/30 px-1.5 py-0.5 text-[9px] text-gray-300">
                                      Category: {item.catalogCategory ?? "missing"} {item.catalogCategoryState === "inferred" ? "(catalog-inferred)" : item.catalogCategoryState === "verified" ? "(verified)" : ""}
                                    </span>
                                    <span className="rounded border border-white/10 bg-black/30 px-1.5 py-0.5 text-[9px] text-gray-300">
                                      {item.actualSurface ? `Surface: ${item.actualSurface}` : eventMixMissingSurfaceLabel}
                                    </span>
                                    <span className="rounded border border-white/10 bg-black/30 px-1.5 py-0.5 text-[9px] text-gray-300">
                                      {item.route ? `Route: ${item.route}` : eventMixMissingRouteLabel}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-[10px] text-gray-500">
                                    {item.explanation}
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
                    ) : eventMixModel.eventRows.length === 0 ? (
                      <div className="rounded-[0.9rem] border border-dashed border-white/10 bg-black/20 p-3 text-xs text-gray-500">
                        Event mix needs verified event counts.
                      </div>
                    ) : null}
                  </div>

                    <div className="rounded-[1rem] border border-white/10 bg-black/25 px-3 py-2 text-[11px] leading-5 text-gray-300">
                      <span className="font-semibold text-white">Context:</span>{" "}
                      {eventMixModel.actualSurfaceContextState === "available"
                        ? "Verified route and surface context available."
                        : "Verified route and surface context are unavailable for this range."}
                      {" "}
                      {catalogMappingSentence}
                      {" "}
                      {surfaceContextSentence}
                    </div>
                  </div>
                </SectionCard>

            <SectionCard
              title="Interaction Snapshot"
              subtitle="Recent telemetry snapshot with freshness, actor, and task-failure truth."
              icon={Clock3}
              rightSlot={(
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <AnalyticsViewModeToggle
                    value={liveInteractionViewMode}
                    onChange={setLiveInteractionViewMode}
                    options={[
                      { id: "cards", label: "Cards" },
                      { id: "chart", label: "Chart" },
                      { id: "table", label: "Table" },
                    ]}
                  />
                  {renderSectionRangeControl("liveInteractionStream")}
                </div>
              )}
            >
              <div className="grid gap-2.5">
                <div className="flex flex-col gap-2 rounded-[1rem] border border-white/10 bg-white/[0.035] px-3 py-2 text-[11px] leading-5 text-gray-300 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p>{liveInteractionStreamModel.recommendation}</p>
                    <p className="mt-1 text-[10px] text-gray-400">{liveInteractionStreamModel.visibleCopy}</p>
                  </div>
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

                <div className="grid grid-cols-2 gap-1.5 rounded-[1rem] border border-white/10 bg-black/25 px-3 py-2 text-[10px] leading-5 text-gray-300 sm:grid-cols-4">
                  <span className="min-w-0 truncate"><span className="font-semibold text-white">Mode:</span> {liveInteractionStreamModel.streamSourceMode.replaceAll("_", " ")}</span>
                  <span className="min-w-0 truncate"><span className="font-semibold text-white">Source:</span> {liveInteractionStreamModel.sourceTruth}</span>
                  <span className="min-w-0 truncate"><span className="font-semibold text-white">Last event:</span> {formatLiveStreamRelativeUtc(liveInteractionStreamModel.lastEventAt)}</span>
                  <span className="min-w-0 truncate"><span className="font-semibold text-white">Generated:</span> {liveInteractionStreamModel.generatedAtUtc ? formatRelativeTime(new Date(liveInteractionStreamModel.generatedAtUtc).getTime(), nowMs) : "unknown"}</span>
                </div>

                {liveInteractionStreamModel.warnings.length > 0 ? (
                  <div className="rounded-[1rem] border border-white/10 bg-black/25 px-3 py-2 text-[10px] leading-5 text-gray-300">
                    {liveInteractionStreamModel.warnings.map((warning) => (
                      <p key={warning}>{warning}</p>
                    ))}
                  </div>
                ) : null}

                <div
                  className="rounded-[1rem] border border-white/10 bg-black/30 p-3"
                  data-admin-analytics-mobile-view-mode={liveInteractionViewMode}
                  data-live-interaction-source-truth={liveInteractionStreamModel.sourceTruth}
                  data-live-interaction-source-mode={liveInteractionStreamModel.streamSourceMode}
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                      Recent interaction snapshot
                    </p>
                    <span className="text-[10px] text-gray-500">
                      source / actor / surface truth
                    </span>
                  </div>

                  {liveInteractionStreamModel.eventRows.length > 0 && liveInteractionViewMode === "chart" ? (
                    <div className="h-52 rounded-[0.9rem] border border-white/10 bg-black/25 p-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={liveInteractionStreamModel.eventRows}
                          margin={{ top: 4, right: 0, left: -22, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="liveInteractionDuplicateFill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                          <XAxis
                            dataKey="compactTypeLabel"
                            stroke="#6b7280"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            interval={0}
                            angle={-18}
                            textAnchor="end"
                            height={52}
                          />
                          <YAxis stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                          <Tooltip content={<AnalyticsTooltip />} />
                          <Area type="monotone" dataKey="duplicateCount" name="Grouped events" stroke="#22d3ee" strokeWidth={2} fill="url(#liveInteractionDuplicateFill)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : null}

                  {liveInteractionStreamModel.eventRows.length > 0 && liveInteractionViewMode === "table" ? (
                    <div
                      className="overflow-x-auto rounded-[0.9rem] border border-white/10 bg-black/25"
                      data-live-interaction-table="compact"
                      data-live-interaction-source-truth={liveInteractionStreamModel.sourceTruth}
                      data-live-interaction-source-mode={liveInteractionStreamModel.streamSourceMode}
                    >
                      <table className="min-w-full text-left text-xs">
                        <thead className="border-b border-white/10 text-[10px] uppercase tracking-[0.12em] text-gray-500">
                          <tr>
                            <th className="px-3 py-2 font-semibold">Event</th>
                            <th className="px-3 py-2 font-semibold">Actor</th>
                            <th className="px-3 py-2 font-semibold">Surface</th>
                            <th className="px-3 py-2 font-semibold">Age</th>
                            <th className="px-3 py-2 font-semibold">Source</th>
                            <th className="px-3 py-2 font-semibold">Grouped</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10 text-gray-300">
                          {liveInteractionStreamModel.eventRows.map((event) => (
                            <tr
                              key={`live-interaction-table-${event.timestamp}-${event.duplicateGroupKey}`}
                              data-live-interaction-event-key={event.eventKey}
                              data-live-interaction-event-type={event.eventType}
                              data-live-interaction-surface-state={event.surfaceState}
                            >
                              <td className="max-w-[16rem] px-3 py-2">
                                <p className="truncate font-semibold text-white">{event.displayLabel}</p>
                                <p className="truncate text-[11px] text-gray-500">{event.eventKey}</p>
                              </td>
                              <td className="px-3 py-2">{event.actorDisplayLabel}</td>
                              <td className="px-3 py-2">{event.surface}</td>
                              <td className="px-3 py-2">{formatRelativeTime(event.timestamp, nowMs)}</td>
                              <td className="px-3 py-2">{event.sourceTruth}</td>
                              <td className="px-3 py-2">{event.duplicateCount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}

                  {liveInteractionViewMode === "cards" ? (
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
                                  {event.actorDisplayLabel} / {event.surface} / {formatRelativeTime(event.timestamp, nowMs)}
                                </p>
                                <p className="mt-1 text-[10px] text-gray-500">
                                  {event.sourceTruth} · {event.surfaceState === "verified" ? "surface verified" : event.surfaceState === "inferred" ? "surface inferred" : "surface missing"} · {event.explanation}
                                </p>
                                {event.eventType === "task_failed" && event.failureReason ? (
                                  <p className="mt-1 text-[10px] text-rose-200">
                                    Failure: {event.failureReason}
                                  </p>
                                ) : null}
                              </div>
                              <span
                                className={cn(
                                  "max-w-[5.5rem] truncate rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em]",
                                  event.eventType === "task_failed"
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
                  ) : liveInteractionStreamModel.eventRows.length === 0 ? (
                    <div className="rounded-[0.9rem] border border-dashed border-white/10 bg-black/20 p-3 text-xs text-gray-500">
                      No user interactions available for this range.
                    </div>
                  ) : null}
                  </div>
                </div>
              </SectionCard>
            </div>
          </>
    </>
  );
}
