// @ts-nocheck
"use client";

import { useEffect, useMemo, useState } from "react";


import { toast } from "sonner";


import { useAdminPollingSWR } from "@/hooks/useAdminPollingSWR";
import { useAdminUiChartHealthReporter } from "@/hooks/useAdminUiChartHealthReporter";
import { useNow } from "@/hooks/useNow";
import { useAuth } from "@/context/AuthContext";
import { authFetch } from "@/lib/authFetch";
import { reportStorageIssue } from "@/lib/client-error-reporting";
import {
  buildAdminUiChartHealthItem,
  summarizeAdminUiChartHealth,
} from "@/lib/admin-ui-chart-health";
import {
  ADMIN_ANALYTICS_DEFAULT_RANGE,
  normalizeAdminAnalyticsModuleRangeMap,
  type AdminAnalyticsModuleRangeMap,
} from "@/lib/admin-analytics-preferences";
import { buildAuthOutcomeChartModel } from "@/lib/admin-auth-outcome-chart";
import { buildAdminNotificationFunnelModel } from "@/lib/admin-notification-funnel";
import { buildAdminOnboardingVelocityModel } from "@/lib/admin-onboarding-velocity";
import { buildAdminTaskPipelineModel } from "@/lib/admin-task-pipeline";


import { TELEMETRY_EVENT_LABELS } from "@/lib/telemetry-catalog";

import type { ViewTab, RangeOption, HistoricalAnalyticsResponse, RealtimeAnalyticsResponse, AnalyticsPreferencesResponse } from "@/types/admin-analytics";

import {
  ANALYTICS_FILTER_STORAGE_KEY,
  EMPTY_COUNT_BUCKETS,
  EMPTY_ONBOARDING_STATS,
  EMPTY_ONBOARDING_STEP_STATS,
  EMPTY_WATCH_CAPTURE_HEALTH,
  PIE_COLORS,
  SectionRangeControl,
  TAB_OPTIONS,
  describeEvent,
  formatAbsoluteDateTime,
  formatCompactNumber,
  formatDuration,
  formatMoney,
  formatPercent,
  formatRelativeTime,
  getDeviceIcon,
  getValidationClasses,
  isRecentViolation,
  useHistoricalSectionOverride,
} from "../AnalyticsHelpers";

const EVENT_LABELS: Record<string, string> = TELEMETRY_EVENT_LABELS;



export function useAdminAnalyticsState() {
const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ViewTab>("operations");
  const range: RangeOption = ADMIN_ANALYTICS_DEFAULT_RANGE;
  const nowMs = useNow({ intervalMs: 60_000, initialNowMs: 0 });
  const [viewerUserDraft, setViewerUserDraft] = useState("");
  const [viewerUserFilter, setViewerUserFilter] = useState("");
  const [moduleRanges, setModuleRanges] =
    useState<AdminAnalyticsModuleRangeMap>({});
  const [savingSectionKey, setSavingSectionKey] = useState<string | null>(null);
  const analyticsFilterStorageKey = user
    ? `${ANALYTICS_FILTER_STORAGE_KEY}:${user.uid}`
    : ANALYTICS_FILTER_STORAGE_KEY;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const timerId = window.setTimeout(() => {
      try {
        const raw = window.sessionStorage.getItem(analyticsFilterStorageKey);
        if (!raw) {
          return;
        }

        const parsed = JSON.parse(raw) as Partial<{
          activeTab: ViewTab;
          viewerUserDraft: string;
          viewerUserFilter: string;
        }>;

        if (
          parsed.activeTab &&
          TAB_OPTIONS.some((item) => item.id === parsed.activeTab)
        ) {
          setActiveTab(parsed.activeTab);
        }
        if (typeof parsed.viewerUserDraft === "string") {
          setViewerUserDraft(parsed.viewerUserDraft);
        }
        if (typeof parsed.viewerUserFilter === "string") {
          setViewerUserFilter(parsed.viewerUserFilter);
        }
      } catch (error) {
        reportStorageIssue("admin analytics filters read", error, {
          storageKey: analyticsFilterStorageKey,
        });
      }
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [analyticsFilterStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.sessionStorage.setItem(
        analyticsFilterStorageKey,
        JSON.stringify({
          activeTab,
          viewerUserDraft,
          viewerUserFilter,
        }),
      );
    } catch (error) {
      reportStorageIssue("admin analytics filters write", error, {
        storageKey: analyticsFilterStorageKey,
      });
    }
  }, [activeTab, analyticsFilterStorageKey, viewerUserDraft, viewerUserFilter]);

  const {
    data: analyticsPreferencesResponse,
    mutate: mutateAnalyticsPreferences,
  } = useAdminPollingSWR<AnalyticsPreferencesResponse>(
    "/api/admin/analytics/preferences",
    15_000,
    {
      keepPreviousData: true,
    },
  );

  useEffect(() => {
    setModuleRanges(
      normalizeAdminAnalyticsModuleRangeMap(
        analyticsPreferencesResponse?.preferences?.moduleRanges,
      ),
    );
  }, [analyticsPreferencesResponse?.preferences?.moduleRanges]);

  const getSectionRange = (sectionKey: string): RangeOption =>
    moduleRanges[sectionKey] ?? ADMIN_ANALYTICS_DEFAULT_RANGE;

  const handleSectionRangeChange = async (
    sectionKey: string,
    nextRange: RangeOption,
  ) => {
    const previousRanges = moduleRanges;
    setModuleRanges((current) => ({
      ...current,
      [sectionKey]: nextRange,
    }));
    setSavingSectionKey(sectionKey);

    try {
      const response = await authFetch("/api/admin/analytics/preferences", {
        method: "PUT",
        body: JSON.stringify({
          section: sectionKey,
          range: nextRange,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Analytics range update failed");
      }

      const nextRanges = normalizeAdminAnalyticsModuleRangeMap(
        result.preferences?.moduleRanges,
      );
      setModuleRanges(nextRanges);
      await mutateAnalyticsPreferences(
        {
          success: true,
          preferences: {
            moduleRanges: nextRanges,
          },
        },
        { revalidate: false },
      );
    } catch (error) {
      setModuleRanges(previousRanges);
      toast.error(
        error instanceof Error
          ? error.message
          : "Analytics range update failed",
      );
    } finally {
      setSavingSectionKey((current) =>
        current === sectionKey ? null : current,
      );
    }
  };

  const renderSectionRangeControl = (sectionKey: string) => (
    <SectionRangeControl
      sectionKey={sectionKey}
      range={getSectionRange(sectionKey)}
      saving={savingSectionKey === sectionKey}
      onChange={handleSectionRangeChange}
    />
  );

  const historicalUrl = `/api/admin/analytics/historical?period=${ADMIN_ANALYTICS_DEFAULT_RANGE}`;
  const {
    data: liveResponse,
    error: liveError,
    isLoading: liveLoading,
  } = useAdminPollingSWR<RealtimeAnalyticsResponse>(
    "/api/admin/analytics/realtime",
    5_000,
  );

  const {
    data: historicalResponse,
    error: historicalError,
    isLoading: historicalLoading,
  } = useAdminPollingSWR<HistoricalAnalyticsResponse>(historicalUrl, 15_000);

  const livePulseRange = getSectionRange("livePulse");
  const livePulseOverride = useHistoricalSectionOverride(
    "livePulse",
    livePulseRange,
  );
  const journeyFunnelRange = getSectionRange("journeyFunnel");
  const journeyFunnelOverride = useHistoricalSectionOverride(
    "journeyFunnel",
    journeyFunnelRange,
  );
  const authOutcomeSplitRange = getSectionRange("authOutcomeSplit");
  const authOutcomeSplitOverride = useHistoricalSectionOverride(
    "authOutcomeSplit",
    authOutcomeSplitRange,
  );
  const onboardingVelocityRange = getSectionRange("onboardingVelocity");
  const onboardingVelocityOverride = useHistoricalSectionOverride(
    "onboardingVelocity",
    onboardingVelocityRange,
  );
  const onboardingStepFlowRange = getSectionRange("onboardingStepFlow");
  const onboardingStepFlowOverride = useHistoricalSectionOverride(
    "onboardingStepFlow",
    onboardingStepFlowRange,
  );
  const guestBounceQualityRange = getSectionRange("categorySemantics");
  const guestBounceQualityOverride = useHistoricalSectionOverride(
    "categorySemantics",
    guestBounceQualityRange,
  );
  const eventMixRange = getSectionRange("eventMix");
  const eventMixOverride = useHistoricalSectionOverride(
    "eventMix",
    eventMixRange,
  );
  const liveInteractionStreamRange = getSectionRange("liveInteractionStream");
  const liveInteractionStreamOverride = useHistoricalSectionOverride(
    "liveInteractionStream",
    liveInteractionStreamRange,
  );
  const dataValidationRange = getSectionRange("dataValidation");
  const dataValidationOverride = useHistoricalSectionOverride(
    "dataValidation",
    dataValidationRange,
  );
  const audienceSnapshotRange = getSectionRange("audienceSnapshot");
  const audienceSnapshotOverride = useHistoricalSectionOverride(
    "audienceSnapshot",
    audienceSnapshotRange,
  );
  const returnCadenceRange = getSectionRange("returnCadence");
  const returnCadenceOverride = useHistoricalSectionOverride(
    "returnCadence",
    returnCadenceRange,
  );
  const navigationDestinationsRange = getSectionRange("navigationDestinations");
  const navigationDestinationsOverride = useHistoricalSectionOverride(
    "navigationDestinations",
    navigationDestinationsRange,
  );
  const deviceMixRange = getSectionRange("deviceMix");
  const deviceMixOverride = useHistoricalSectionOverride(
    "deviceMix",
    deviceMixRange,
  );
  const topPathsRange = getSectionRange("topPaths");
  const topPathsOverride = useHistoricalSectionOverride(
    "topPaths",
    topPathsRange,
  );
  const regionsRange = getSectionRange("regions");
  const regionsOverride = useHistoricalSectionOverride("regions", regionsRange);
  const commerceSnapshotRange = getSectionRange("commerceSnapshot");
  const commerceSnapshotOverride = useHistoricalSectionOverride(
    "commerceSnapshot",
    commerceSnapshotRange,
  );
  const packagePerformanceRange = getSectionRange("packagePerformance");
  const packagePerformanceOverride = useHistoricalSectionOverride(
    "packagePerformance",
    packagePerformanceRange,
  );
  const contentConversionRange = getSectionRange("contentConversion");
  const contentConversionOverride = useHistoricalSectionOverride(
    "contentConversion",
    contentConversionRange,
  );
  const topDropConversionRange = getSectionRange("topDropConversion");
  const topDropConversionOverride = useHistoricalSectionOverride(
    "topDropConversion",
    topDropConversionRange,
  );
  const recentCommerceFeedRange = getSectionRange("recentCommerceFeed");
  const recentCommerceFeedOverride = useHistoricalSectionOverride(
    "recentCommerceFeed",
    recentCommerceFeedRange,
  );
  const viewerDrilldownRange = getSectionRange("viewerDrilldown");
  const viewerDrilldownOverride = useHistoricalSectionOverride(
    "viewerDrilldown",
    viewerDrilldownRange,
    viewerUserFilter,
  );
  const viewerJourneyRange = getSectionRange("viewerJourney");
  const viewerJourneyOverride = useHistoricalSectionOverride(
    "viewerJourney",
    viewerJourneyRange,
  );
  const watchDepthTagsRange = getSectionRange("watchDepthTags");
  const watchDepthTagsOverride = useHistoricalSectionOverride(
    "watchDepthTags",
    watchDepthTagsRange,
  );
  const dailyTaskPipelineRange = getSectionRange("dailyTaskPipeline");
  const dailyTaskPipelineOverride = useHistoricalSectionOverride(
    "dailyTaskPipeline",
    dailyTaskPipelineRange,
  );
  const taskCompletionSpeedRange = getSectionRange("taskCompletionSpeed");
  const taskCompletionSpeedOverride = useHistoricalSectionOverride(
    "taskCompletionSpeed",
    taskCompletionSpeedRange,
  );
  const taskLeaderboardRange = getSectionRange("taskLeaderboard");
  const taskLeaderboardOverride = useHistoricalSectionOverride(
    "taskLeaderboard",
    taskLeaderboardRange,
  );
  const notificationFunnelRange = getSectionRange("notificationFunnel");
  const notificationFunnelOverride = useHistoricalSectionOverride(
    "notificationFunnel",
    notificationFunnelRange,
  );

  const liveSeries = useMemo(
    () =>
      (liveResponse?.data ?? []).map((point) => ({
        ...point,
        label: point.minute === 0 ? "Now" : `${point.minute}m`,
      })),
    [liveResponse],
  );

  const historySeries = historicalResponse?.data ?? [];
  const totals = historicalResponse?.totals ?? {
    users: 0,
    views: 0,
    sessions: 0,
    newUsers: 0,
    avgSessionDuration: 0,
    engagementRate: 0,
  };
  const eventBreakdown = historicalResponse?.eventBreakdown ?? [];
  const eventsData = historicalResponse?.events ?? {};
  const funnel = historicalResponse?.funnel ?? {
    authModalOpens: 0,
    authSignIns: 0,
    authSignUps: 0,
    previewOpens: 0,
    viewerOpens: 0,
    assetSwitches: 0,
    unlocks: 0,
    shares: 0,
    walletOpens: 0,
    checkoutStarts: 0,
    purchases: 0,
    checkIns: 0,
    experienceViews: 0,
  };
  const devices = historicalResponse?.devices ?? [];
  const pages = historicalResponse?.pages ?? [];
  const geo = historicalResponse?.geo ?? [];
  const topDrops = historicalResponse?.topDrops ?? [];
  const commerce = historicalResponse?.commerce ?? {
    revenueUsd: 0,
    adjustedProfitUsd: 0,
    bonusValueUsd: 0,
    deliveredGumDrops: 0,
    bonusGumDrops: 0,
    effectiveUsdPer100Gd: 0,
    gdSpent: 0,
    feed: [],
  };
  const security = historicalResponse?.security ?? [];
  const rawEvents = historicalResponse?.rawEvents ?? [];
  const onboardingStats =
    historicalResponse?.onboardingStats ?? EMPTY_ONBOARDING_STATS;
  const onboardingStepStats =
    historicalResponse?.onboardingStepStats ?? EMPTY_ONBOARDING_STEP_STATS;
  const authBreakdown = historicalResponse?.authBreakdown ?? [];
  const onboardingDurationBuckets =
    historicalResponse?.onboardingDurationBuckets ?? EMPTY_COUNT_BUCKETS;
  const repeatVisitSegments = historicalResponse?.repeatVisitSegments ?? [];
  const destinationMix = historicalResponse?.destinationMix ?? [];
  const notificationFunnel = useMemo(
    () => historicalResponse?.notificationFunnel ?? [],
    [historicalResponse?.notificationFunnel],
  );
  const notificationActions = historicalResponse?.notificationActions ?? [];
  const taskPipeline = historicalResponse?.taskPipeline ?? [];
  const taskLeaderboard = historicalResponse?.taskLeaderboard ?? [];
  const taskDurationBuckets = historicalResponse?.taskDurationBuckets ?? [];
  const reminderReasons = historicalResponse?.reminderReasons ?? [];
  const packagePerformance = historicalResponse?.packagePerformance ?? [];
  const unlockCategoryMix = historicalResponse?.unlockCategoryMix ?? [];
  const watchDepthBuckets = historicalResponse?.watchDepthBuckets ?? [];
  const contentJourney = historicalResponse?.contentJourney ?? [];
  const contentTagDemand = historicalResponse?.contentTagDemand ?? [];
  const viewerOverview = historicalResponse?.viewerOverview ?? {
    viewCount: 0,
    sessionCount: 0,
    uniqueViewerCount: 0,
    repeatSessionCount: 0,
    returnSessionCount: 0,
    totalWatchSeconds: 0,
    avgSessionSeconds: 0,
    avgWatchSeconds: 0,
    avgLoadMs: 0,
    assetCompletionRate: 0,
    meaningfulSessionCount: 0,
    openedWithoutDepthCount: 0,
    bounceSessionCount: 0,
    abandonedSessionCount: 0,
    stalledSessionCount: 0,
    convertedSessionCount: 0,
    completedSessionCount: 0,
    assetSwitches: 0,
    downloads: 0,
    relatedClicks: 0,
  };
  const viewerDropInsights = historicalResponse?.viewerDropInsights ?? [];
  const viewerUsers = historicalResponse?.viewerUsers ?? [];
  const watchCaptureHealth =
    historicalResponse?.watchCaptureHealth ?? EMPTY_WATCH_CAPTURE_HEALTH;
  const activeViewerFilter =
    historicalResponse?.viewerFilter ?? viewerUserFilter;
  const semanticCategories = historicalResponse?.semanticCategories ?? [];
  const validations = historicalResponse?.validations ?? [];
  const componentContexts = historicalResponse?.componentContexts ?? [];
  const userJourneys = historicalResponse?.userJourneys ?? [];
  const experienceContexts = historicalResponse?.experienceContexts ?? [];
  const securityReasons = historicalResponse?.securityReasons ?? [];
  const liveActiveUsers = liveResponse?.activeUsers ?? [];
  const liveSurfaceMix = liveResponse?.surfaceMix ?? [];
  const liveWatchCaptureHealth =
    liveResponse?.watchCaptureHealth ?? EMPTY_WATCH_CAPTURE_HEALTH;

  const needsSetup =
    liveResponse?.requiresSetup ||
    historicalResponse?.requiresSetup ||
    (liveError as { info?: { requiresSetup?: boolean } } | undefined)?.info
      ?.requiresSetup ||
    (historicalError as { info?: { requiresSetup?: boolean } } | undefined)
      ?.info?.requiresSetup;
  const backgroundAnalyticsIssues = [
    liveResponse && liveError
      ? `Realtime analytics: ${liveError.message || "Background refresh failed."}`
      : null,
    historicalResponse && historicalError
      ? `Historical analytics: ${historicalError.message || "Background refresh failed."}`
      : null,
    ...(liveResponse?.issues || []).map(
      (issue) => `Realtime analytics: ${issue}`,
    ),
    ...(historicalResponse?.issues || []).map(
      (issue) => `Historical analytics: ${issue}`,
    ),
  ].filter(
    (issue, index, array): issue is string =>
      Boolean(issue) && array.indexOf(issue) === index,
  );
  const blockingAnalyticsError =
    (!liveResponse && (liveError as Error | undefined)) ||
    (!historicalResponse && (historicalError as Error | undefined)) ||
    null;
  const isPrimingAnalytics =
    !liveResponse && !historicalResponse && (liveLoading || historicalLoading);
  const isBackgroundSyncing =
    (liveLoading || historicalLoading) &&
    Boolean(liveResponse || historicalResponse);
  const analyticsWarmState = isPrimingAnalytics
    ? "Fetching live data"
    : isBackgroundSyncing
      ? "Refreshing"
      : "Polling enabled";

  const totalDeviceUsers = devices.reduce((sum, item) => sum + item.users, 0);
  const mobileUsers =
    devices.find((item) => item.device.toLowerCase() === "mobile")?.users ?? 0;
  const mobileShare = totalDeviceUsers > 0 ? mobileUsers / totalDeviceUsers : 0;
  const previewToUnlockRate =
    funnel.previewOpens > 0 ? funnel.unlocks / funnel.previewOpens : 0;
  const checkoutToPurchaseRate =
    funnel.checkoutStarts > 0 ? funnel.purchases / funnel.checkoutStarts : 0;
  const securityAlerts = security.filter((item) =>
    isRecentViolation(item.lastViolation, nowMs),
  ).length;
  const onboardingStartCount = onboardingStats.starts ?? 0;
  const onboardingCompletionRate =
    onboardingStats.completionRate ??
    (onboardingStartCount > 0
      ? onboardingStats.completions / Math.max(1, onboardingStartCount)
      : 0);
  const onboardingDropOffCount = Math.max(
    0,
    onboardingStartCount - onboardingStats.completions,
  );
  const historicalOnboardingModel = useMemo(
    () =>
      buildAdminOnboardingVelocityModel({
        stats: onboardingStats,
        durationBuckets: onboardingDurationBuckets,
        steps: onboardingStepStats,
        authSignUps: funnel.authSignUps,
      }),
    [funnel.authSignUps, onboardingDurationBuckets, onboardingStats, onboardingStepStats],
  );
  const globalSemantics = semanticCategories.find(
    (item) => item.key === "global",
  );
  const userSemantics = semanticCategories.find((item) => item.key === "user");
  const adminSemantics = semanticCategories.find(
    (item) => item.key === "admin",
  );
  const dropSemantics = semanticCategories.find((item) => item.key === "drop");
  const guestBounceRate =
    globalSemantics && globalSemantics.viewCount > 0
      ? globalSemantics.bounceCount / Math.max(1, globalSemantics.viewCount)
      : 0;
  const guestEngagedRate = globalSemantics?.engagedRate ?? 0;
  const identifiedBounceRate =
    userSemantics && userSemantics.viewCount > 0
      ? userSemantics.bounceCount / Math.max(1, userSemantics.viewCount)
      : 0;
  const semanticQualityCards = [
    {
      key: "global",
      label: "Guest / Public",
      views: globalSemantics?.viewCount ?? 0,
      engaged: globalSemantics?.engagedViewCount ?? 0,
      bounced: globalSemantics?.bounceCount ?? 0,
      exits: globalSemantics?.exitCount ?? 0,
    },
    {
      key: "user",
      label: "Signed-in",
      views: userSemantics?.viewCount ?? 0,
      engaged: userSemantics?.engagedViewCount ?? 0,
      bounced: userSemantics?.bounceCount ?? 0,
      exits: userSemantics?.exitCount ?? 0,
    },
    {
      key: "admin",
      label: "Admin",
      views: adminSemantics?.viewCount ?? 0,
      engaged: adminSemantics?.engagedViewCount ?? 0,
      bounced: adminSemantics?.bounceCount ?? 0,
      exits: adminSemantics?.exitCount ?? 0,
    },
    {
      key: "drop",
      label: "Viewer",
      views: dropSemantics?.viewCount ?? 0,
      engaged: dropSemantics?.engagedViewCount ?? 0,
      bounced: dropSemantics?.bounceCount ?? 0,
      exits: dropSemantics?.exitCount ?? 0,
    },
  ];

  const topEvents = eventBreakdown.slice(0, 8).map((entry) => ({
    ...entry,
    label:
      EVENT_LABELS[entry.eventName] || entry.eventName.replaceAll("_", " "),
  }));
  const topComponentContexts = componentContexts.slice(0, 6);
  const topUserJourneys = userJourneys.slice(0, 6);
  const topExperienceContexts = experienceContexts.slice(0, 6);
  const topSecurityReasons = securityReasons.slice(0, 8);
  const liveSnapshotLabel = liveResponse?.generatedAtMs
    ? formatRelativeTime(liveResponse.generatedAtMs, nowMs)
    : liveLoading
      ? "Fetching..."
      : "Awaiting snapshot";
  const historicalSnapshotLabel = historicalResponse?.generatedAtMs
    ? formatRelativeTime(historicalResponse.generatedAtMs, nowMs)
    : historicalLoading
      ? "Fetching..."
      : "Awaiting snapshot";
  const livePulseData =
    livePulseRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : livePulseOverride.data;
  const livePulseFunnel = livePulseData?.funnel ?? funnel;
  const livePulseOnboardingStats =
    livePulseData?.onboardingStats ?? onboardingStats;
  const livePulseOnboardingStartCount = livePulseOnboardingStats.starts ?? 0;
  const livePulseOnboardingCompletionRate =
    livePulseOnboardingStats.completionRate ??
    (livePulseOnboardingStartCount > 0
      ? livePulseOnboardingStats.completions /
        Math.max(1, livePulseOnboardingStartCount)
      : 0);
  const journeyFunnelData =
    journeyFunnelRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : journeyFunnelOverride.data;
  const journeyFunnelMetrics = journeyFunnelData?.funnel ?? funnel;
  const authOutcomeData =
    authOutcomeSplitRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : authOutcomeSplitOverride.data;
  const authOutcomeBreakdown = authOutcomeData?.authBreakdown ?? authBreakdown;
  const authOutcomeChartModel = useMemo(
    () => buildAuthOutcomeChartModel(authOutcomeBreakdown),
    [authOutcomeBreakdown],
  );
  const authOutcomeChartItems = authOutcomeChartModel.items;
  const authOutcomeTotals = authOutcomeChartModel.totals;
  const authOutcomeHasData = authOutcomeChartModel.hasData;
  const onboardingStepFlowData =
    onboardingStepFlowRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : onboardingStepFlowOverride.data;
  const onboardingStepFlowStats =
    onboardingStepFlowData?.onboardingStepStats ?? onboardingStepStats;
  const onboardingVelocityData =
    onboardingVelocityRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : onboardingVelocityOverride.data;
  const onboardingVelocityStats =
    onboardingVelocityData?.onboardingStats ?? onboardingStats;
  const onboardingVelocityBuckets =
    onboardingVelocityData?.onboardingDurationBuckets ??
    onboardingDurationBuckets;
  const onboardingVelocityModel = useMemo(
    () =>
      buildAdminOnboardingVelocityModel({
        stats: onboardingVelocityStats,
        durationBuckets: onboardingVelocityBuckets,
        steps: onboardingStepFlowStats,
        authSignUps: journeyFunnelMetrics.authSignUps,
      }),
    [journeyFunnelMetrics.authSignUps, onboardingStepFlowStats, onboardingVelocityBuckets, onboardingVelocityStats],
  );
  const onboardingStepFlowModel = useMemo(
    () =>
      buildAdminOnboardingVelocityModel({
        stats: onboardingVelocityStats,
        durationBuckets: [],
        steps: onboardingStepFlowStats,
        authSignUps: journeyFunnelMetrics.authSignUps,
      }),
    [journeyFunnelMetrics.authSignUps, onboardingStepFlowStats, onboardingVelocityStats],
  );
  const onboardingStepFlowItems = onboardingStepFlowModel.steps;
  const onboardingVelocityStartCount = onboardingVelocityModel.starts;
  const onboardingVelocityCompletionRate = onboardingVelocityModel.completionRate;
  const onboardingVelocityDropOffCount = onboardingVelocityModel.dropOffCount;
  const onboardingVelocityHasData = onboardingVelocityModel.hasVelocityData;
  const onboardingVelocityCompletionCount = onboardingVelocityModel.completions;
  const authOnboardingDiscrepancies = onboardingVelocityModel.discrepancies;
  const onboardingVelocityStartSourceHint =
    onboardingVelocityStats.startSource === "tracked"
      ? "Canonical starts"
      : onboardingVelocityStats.startSource === "completion_fallback"
        ? "Backfilled from completions"
        : "No start signals";
  const guestBounceQualityData =
    guestBounceQualityRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : guestBounceQualityOverride.data;
  const guestBounceSemantics =
    guestBounceQualityData?.semanticCategories ?? semanticCategories;
  const guestBounceGlobalSemantics = guestBounceSemantics.find(
    (item) => item.key === "global",
  );
  const guestBounceUserSemantics = guestBounceSemantics.find(
    (item) => item.key === "user",
  );
  const guestBounceAdminSemantics = guestBounceSemantics.find(
    (item) => item.key === "admin",
  );
  const guestBounceDropSemantics = guestBounceSemantics.find(
    (item) => item.key === "drop",
  );
  const guestBounceGuestRate =
    guestBounceGlobalSemantics && guestBounceGlobalSemantics.viewCount > 0
      ? guestBounceGlobalSemantics.bounceCount /
        Math.max(1, guestBounceGlobalSemantics.viewCount)
      : 0;
  const guestBounceIdentifiedRate =
    guestBounceUserSemantics && guestBounceUserSemantics.viewCount > 0
      ? guestBounceUserSemantics.bounceCount /
        Math.max(1, guestBounceUserSemantics.viewCount)
      : 0;
  const guestBounceEngagedRate =
    guestBounceGlobalSemantics && guestBounceGlobalSemantics.viewCount > 0
      ? guestBounceGlobalSemantics.engagedViewCount /
        Math.max(1, guestBounceGlobalSemantics.viewCount)
      : 0;
  const guestBounceQualityCards = [
    {
      key: "global",
      label: "Guest / Public",
      views: guestBounceGlobalSemantics?.viewCount ?? 0,
      engaged: guestBounceGlobalSemantics?.engagedViewCount ?? 0,
      bounced: guestBounceGlobalSemantics?.bounceCount ?? 0,
      exits: guestBounceGlobalSemantics?.exitCount ?? 0,
    },
    {
      key: "user",
      label: "Signed-in",
      views: guestBounceUserSemantics?.viewCount ?? 0,
      engaged: guestBounceUserSemantics?.engagedViewCount ?? 0,
      bounced: guestBounceUserSemantics?.bounceCount ?? 0,
      exits: guestBounceUserSemantics?.exitCount ?? 0,
    },
    {
      key: "admin",
      label: "Admin",
      views: guestBounceAdminSemantics?.viewCount ?? 0,
      engaged: guestBounceAdminSemantics?.engagedViewCount ?? 0,
      bounced: guestBounceAdminSemantics?.bounceCount ?? 0,
      exits: guestBounceAdminSemantics?.exitCount ?? 0,
    },
    {
      key: "drop",
      label: "Viewer",
      views: guestBounceDropSemantics?.viewCount ?? 0,
      engaged: guestBounceDropSemantics?.engagedViewCount ?? 0,
      bounced: guestBounceDropSemantics?.bounceCount ?? 0,
      exits: guestBounceDropSemantics?.exitCount ?? 0,
    },
  ];
  const eventMixData =
    eventMixRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : eventMixOverride.data;
  const eventMixBreakdown = eventMixData?.eventBreakdown ?? eventBreakdown;
  const eventMixComponentContexts =
    eventMixData?.componentContexts ?? componentContexts;
  const eventMixTopEvents = eventMixBreakdown.slice(0, 8).map((entry) => ({
    ...entry,
    label:
      EVENT_LABELS[entry.eventName] || entry.eventName.replaceAll("_", " "),
  }));
  const eventMixTopComponentContexts = eventMixComponentContexts.slice(0, 6);
  const liveInteractionData =
    liveInteractionStreamRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : liveInteractionStreamOverride.data;
  const liveInteractionEvents = liveInteractionData?.rawEvents ?? rawEvents;
  const validationData =
    dataValidationRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : dataValidationOverride.data;
  const validationItems = validationData?.validations ?? validations;
  const audienceSnapshotData =
    audienceSnapshotRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : audienceSnapshotOverride.data;
  const audienceHistorySeries = audienceSnapshotData?.data ?? historySeries;
  const audienceTotals = audienceSnapshotData?.totals ?? totals;
  const audienceDevices = audienceSnapshotData?.devices ?? devices;
  const returnCadenceData =
    returnCadenceRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : returnCadenceOverride.data;
  const returnCadenceSegments =
    returnCadenceData?.repeatVisitSegments ?? repeatVisitSegments;
  const navigationDestinationsData =
    navigationDestinationsRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : navigationDestinationsOverride.data;
  const navigationDestinationsMix =
    navigationDestinationsData?.destinationMix ?? destinationMix;
  const deviceMixData =
    deviceMixRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : deviceMixOverride.data;
  const deviceMixDevices = deviceMixData?.devices ?? devices;
  const topPathsData =
    topPathsRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : topPathsOverride.data;
  const topPathsPages = topPathsData?.pages ?? pages;
  const regionsData =
    regionsRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : regionsOverride.data;
  const regionsGeo = regionsData?.geo ?? geo;
  const commerceSnapshotData =
    commerceSnapshotRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : commerceSnapshotOverride.data;
  const commerceSnapshotCommerce = commerceSnapshotData?.commerce ?? commerce;
  const commerceSnapshotFunnel = commerceSnapshotData?.funnel ?? funnel;
  const packagePerformanceData =
    packagePerformanceRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : packagePerformanceOverride.data;
  const packagePerformanceItems =
    packagePerformanceData?.packagePerformance ?? packagePerformance;
  const contentConversionData =
    contentConversionRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : contentConversionOverride.data;
  const contentConversionItems =
    contentConversionData?.unlockCategoryMix ?? unlockCategoryMix;
  const topDropConversionData =
    topDropConversionRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : topDropConversionOverride.data;
  const topDropConversionItems = topDropConversionData?.topDrops ?? topDrops;
  const recentCommerceFeedData =
    recentCommerceFeedRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : recentCommerceFeedOverride.data;
  const recentCommerceFeedItems =
    recentCommerceFeedData?.commerce?.feed ?? commerce.feed ?? [];
  const viewerDrilldownData =
    viewerDrilldownRange === ADMIN_ANALYTICS_DEFAULT_RANGE && !viewerUserFilter
      ? historicalResponse
      : viewerDrilldownOverride.data;
  const viewerDrilldownOverview =
    viewerDrilldownData?.viewerOverview ?? viewerOverview;
  const viewerDrilldownInsights =
    viewerDrilldownData?.viewerDropInsights ?? viewerDropInsights;
  const viewerDrilldownUsers = viewerDrilldownData?.viewerUsers ?? viewerUsers;
  const viewerDrilldownCaptureHealth =
    viewerDrilldownData?.watchCaptureHealth ?? watchCaptureHealth;
  const viewerDrilldownFilter =
    viewerDrilldownData?.viewerFilter ?? activeViewerFilter;
  const viewerDrilldownJourneys = (
    viewerDrilldownData?.userJourneys ?? userJourneys
  ).slice(0, 6);
  const viewerDropChartData = viewerDrilldownInsights
    .slice(0, 8)
    .map((item) => ({
      ...item,
      shortLabel:
        item.dropTitle.length > 16
          ? `${item.dropTitle.slice(0, 16)}...`
          : item.dropTitle,
    }));
  const viewerJourneyData =
    viewerJourneyRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : viewerJourneyOverride.data;
  const viewerJourneyItems =
    viewerJourneyData?.contentJourney ?? contentJourney;
  const watchDepthTagsData =
    watchDepthTagsRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : watchDepthTagsOverride.data;
  const watchDepthTagBuckets =
    watchDepthTagsData?.watchDepthBuckets ?? watchDepthBuckets;
  const watchDepthTagDemand =
    watchDepthTagsData?.contentTagDemand ?? contentTagDemand;
  const dailyTaskPipelineData =
    dailyTaskPipelineRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : dailyTaskPipelineOverride.data;
  const dailyTaskPipelineItems =
    dailyTaskPipelineData?.taskPipeline ?? taskPipeline;
  const dailyTaskPipelineModel = useMemo(
    () => buildAdminTaskPipelineModel(dailyTaskPipelineItems),
    [dailyTaskPipelineItems],
  );
  const taskCompletionSpeedData =
    taskCompletionSpeedRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : taskCompletionSpeedOverride.data;
  const taskCompletionSpeedBuckets =
    taskCompletionSpeedData?.taskDurationBuckets ?? taskDurationBuckets;
  const taskLeaderboardData =
    taskLeaderboardRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : taskLeaderboardOverride.data;
  const taskLeaderboardItems =
    taskLeaderboardData?.taskLeaderboard ?? taskLeaderboard;
  const notificationFunnelData =
    notificationFunnelRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : notificationFunnelOverride.data;
  const notificationFunnelItems =
    notificationFunnelData?.notificationFunnel ?? notificationFunnel;
  const notificationActionItems =
    notificationFunnelData?.notificationActions ?? notificationActions;
  const notificationReminderReasons =
    notificationFunnelData?.reminderReasons ?? reminderReasons;
  const notificationFunnelModel = useMemo(
    () =>
      buildAdminNotificationFunnelModel({
        funnelItems: notificationFunnelItems,
        actionItems: notificationActionItems,
        reminderReasons: notificationReminderReasons,
      }),
    [notificationActionItems, notificationFunnelItems, notificationReminderReasons],
  );
  const activeNotificationFunnel = notificationFunnelModel.activeFunnelItems;
  const activeNotificationFunnelPieData = notificationFunnelModel.pieData;
  const maxNotificationActionValue = notificationFunnelModel.maxActionValue;
  const hasNotificationReminderReasons = notificationFunnelModel.reminderReasonCount > 0;
  const deviceMixTotalUsers = deviceMixDevices.reduce(
    (sum, item) => sum + item.users,
    0,
  );
  const historicalHasSignals =
    historySeries.some(
      (point) =>
        point.users > 0 ||
        point.views > 0 ||
        point.sessions > 0 ||
        point.newUsers > 0,
    ) ||
    eventBreakdown.length > 0 ||
    semanticCategories.some(
      (item) =>
        item.viewCount > 0 ||
        item.clickCount > 0 ||
        item.hoverCount > 0 ||
        item.watchSessionCount > 0 ||
        item.signInCount > 0 ||
        item.returnCount > 0 ||
        item.logoutCount > 0,
    ) ||
    devices.length > 0 ||
    pages.length > 0 ||
    geo.length > 0 ||
    topDrops.length > 0 ||
    (commerce.feed?.length ?? 0) > 0 ||
    historicalOnboardingModel.starts > 0 ||
    historicalOnboardingModel.completions > 0 ||
    viewerDropInsights.length > 0 ||
    viewerUsers.length > 0 ||
    taskLeaderboard.length > 0 ||
    packagePerformance.length > 0;
  const showHistoricalEmptyState =
    Boolean(historicalResponse) &&
    !historicalLoading &&
    !blockingAnalyticsError &&
    !historicalHasSignals;
  const liveBlockingIssues =
    !liveResponse && liveError
      ? [liveError.message || "Realtime analytics request failed."]
      : [];
  const historicalBlockingIssues =
    !historicalResponse && historicalError
      ? [historicalError.message || "Historical analytics request failed."]
      : [];
  const liveBackgroundIssues = [
    liveResponse && liveError
      ? `Realtime analytics refresh failed: ${liveError.message || "Background refresh failed."}`
      : null,
    ...(liveResponse?.issues || []).map(
      (issue) => `Realtime analytics issue: ${issue}`,
    ),
  ].filter((issue): issue is string => Boolean(issue));
  const historicalBackgroundIssues = [
    historicalResponse && historicalError
      ? `Historical analytics refresh failed: ${historicalError.message || "Background refresh failed."}`
      : null,
    ...(historicalResponse?.issues || []).map(
      (issue) => `Historical analytics issue: ${issue}`,
    ),
  ].filter((issue): issue is string => Boolean(issue));
  const liveUpdatedAtMs = liveResponse?.generatedAtMs ?? 0;
  const historicalUpdatedAtMs = historicalResponse?.generatedAtMs ?? 0;
  const buildHistoricalSectionState = (
    sectionLabel: string,
    sectionRange: RangeOption,
    overrideRequest: {
      data?: HistoricalAnalyticsResponse;
      error?: Error;
      isLoading: boolean;
    },
  ) => {
    if (sectionRange === ADMIN_ANALYTICS_DEFAULT_RANGE) {
      return {
        updatedAtMs: historicalUpdatedAtMs,
        hasLoaded: Boolean(historicalResponse) || Boolean(historicalError),
        loading: historicalLoading,
        blockingIssues: historicalBlockingIssues,
        backgroundIssues: historicalBackgroundIssues,
      };
    }

    const overrideErrorMessage =
      overrideRequest.error?.message ||
      `${sectionLabel} analytics request failed.`;
    return {
      updatedAtMs: overrideRequest.data?.generatedAtMs ?? 0,
      hasLoaded:
        Boolean(overrideRequest.data) || Boolean(overrideRequest.error),
      loading: overrideRequest.isLoading,
      blockingIssues:
        !overrideRequest.data && overrideRequest.error
          ? [`${sectionLabel}: ${overrideErrorMessage}`]
          : [],
      backgroundIssues: [
        overrideRequest.data && overrideRequest.error
          ? `${sectionLabel}: ${overrideErrorMessage}`
          : null,
        ...(overrideRequest.data?.issues || []).map(
          (issue) => `${sectionLabel}: ${issue}`,
        ),
      ].filter((issue): issue is string => Boolean(issue)),
    };
  };
  const authOutcomeSplitState = buildHistoricalSectionState(
    "Auth outcome split",
    authOutcomeSplitRange,
    authOutcomeSplitOverride,
  );
  const onboardingVelocityState = buildHistoricalSectionState(
    "Onboarding velocity",
    onboardingVelocityRange,
    onboardingVelocityOverride,
  );
  const onboardingStepFlowState = buildHistoricalSectionState(
    "Onboarding step flow",
    onboardingStepFlowRange,
    onboardingStepFlowOverride,
  );
  const guestBounceQualityState = buildHistoricalSectionState(
    "Guest and bounce quality",
    guestBounceQualityRange,
    guestBounceQualityOverride,
  );
  const eventMixState = buildHistoricalSectionState(
    "Event mix",
    eventMixRange,
    eventMixOverride,
  );
  const liveInteractionStreamState = buildHistoricalSectionState(
    "Live interaction stream",
    liveInteractionStreamRange,
    liveInteractionStreamOverride,
  );
  const dataValidationState = buildHistoricalSectionState(
    "Data validation",
    dataValidationRange,
    dataValidationOverride,
  );
  const audienceSnapshotState = buildHistoricalSectionState(
    "Audience snapshot",
    audienceSnapshotRange,
    audienceSnapshotOverride,
  );
  const returnCadenceState = buildHistoricalSectionState(
    "Return cadence",
    returnCadenceRange,
    returnCadenceOverride,
  );
  const navigationDestinationsState = buildHistoricalSectionState(
    "Navigation destinations",
    navigationDestinationsRange,
    navigationDestinationsOverride,
  );
  const deviceMixState = buildHistoricalSectionState(
    "Device mix",
    deviceMixRange,
    deviceMixOverride,
  );
  const topPathsState = buildHistoricalSectionState(
    "Top paths",
    topPathsRange,
    topPathsOverride,
  );
  const regionsState = buildHistoricalSectionState(
    "Regions",
    regionsRange,
    regionsOverride,
  );
  const commerceSnapshotState = buildHistoricalSectionState(
    "Commerce snapshot",
    commerceSnapshotRange,
    commerceSnapshotOverride,
  );
  const packagePerformanceState = buildHistoricalSectionState(
    "Package performance",
    packagePerformanceRange,
    packagePerformanceOverride,
  );
  const contentConversionState = buildHistoricalSectionState(
    "Content conversion",
    contentConversionRange,
    contentConversionOverride,
  );
  const topDropConversionState = buildHistoricalSectionState(
    "Top drop conversion",
    topDropConversionRange,
    topDropConversionOverride,
  );
  const recentCommerceFeedState = buildHistoricalSectionState(
    "Recent commerce feed",
    recentCommerceFeedRange,
    recentCommerceFeedOverride,
  );
  const viewerDrilldownState = buildHistoricalSectionState(
    "Viewer drilldown",
    viewerDrilldownRange,
    viewerDrilldownOverride,
  );
  const viewerJourneyState = buildHistoricalSectionState(
    "Viewer journey",
    viewerJourneyRange,
    viewerJourneyOverride,
  );
  const watchDepthTagsState = buildHistoricalSectionState(
    "Watch depth and tags",
    watchDepthTagsRange,
    watchDepthTagsOverride,
  );
  const dailyTaskPipelineState = buildHistoricalSectionState(
    "Daily task pipeline",
    dailyTaskPipelineRange,
    dailyTaskPipelineOverride,
  );
  const taskCompletionSpeedState = buildHistoricalSectionState(
    "Task completion speed",
    taskCompletionSpeedRange,
    taskCompletionSpeedOverride,
  );
  const taskLeaderboardState = buildHistoricalSectionState(
    "Task leaderboard",
    taskLeaderboardRange,
    taskLeaderboardOverride,
  );
  const notificationFunnelState = buildHistoricalSectionState(
    "Notification funnel",
    notificationFunnelRange,
    notificationFunnelOverride,
  );
  const analyticsSectionHealth = [
    buildAdminUiChartHealthItem({
      key: "analytics.operations.live_pulse",
      title: "Live Pulse",
      page: "analytics",
      category: "operations",
      source: "mixed_client_live",
      updatedAtMs: Math.max(liveUpdatedAtMs, historicalUpdatedAtMs),
      hasLoaded:
        Boolean(liveResponse) ||
        Boolean(historicalResponse) ||
        Boolean(liveError) ||
        Boolean(historicalError),
      loading: liveLoading || historicalLoading,
      hasData:
        liveSeries.length > 0 ||
        (liveResponse?.totalActive ?? 0) > 0 ||
        (liveResponse?.deepTrackerActive ?? 0) > 0,
      blockingIssues: [...liveBlockingIssues, ...historicalBlockingIssues],
      backgroundIssues: [
        ...liveBackgroundIssues,
        ...historicalBackgroundIssues,
      ],
      healthySummary: "Realtime and historical pulse metrics are both loaded.",
      emptySummary:
        "Live pulse loaded without any realtime or recent historical signal.",
    }),
    buildAdminUiChartHealthItem({
      key: "analytics.operations.auth_outcome_split",
      title: "Auth Outcome Split",
      page: "analytics",
      category: "operations",
      source: "historical_analytics",
      updatedAtMs: authOutcomeSplitState.updatedAtMs,
      hasLoaded: authOutcomeSplitState.hasLoaded,
      loading: authOutcomeSplitState.loading,
      hasData: authOutcomeHasData,
      blockingIssues: authOutcomeSplitState.blockingIssues,
      backgroundIssues: authOutcomeSplitState.backgroundIssues,
      healthySummary:
        "Authentication outcome split is loaded from the historical analytics window.",
      emptySummary:
        "Auth outcome split loaded without any tracked auth attempts or outcomes in this window.",
    }),
    buildAdminUiChartHealthItem({
      key: "analytics.operations.onboarding_velocity",
      title: "Onboarding Velocity",
      page: "analytics",
      category: "operations",
      source: "historical_analytics",
      updatedAtMs: onboardingVelocityState.updatedAtMs,
      hasLoaded: onboardingVelocityState.hasLoaded,
      loading: onboardingVelocityState.loading,
      hasData:
        onboardingVelocityHasData ||
        onboardingStepFlowItems.length > 0 ||
        onboardingVelocityStartCount > 0 ||
        onboardingVelocityCompletionCount > 0,
      blockingIssues: onboardingVelocityState.blockingIssues,
      backgroundIssues: onboardingVelocityState.backgroundIssues,
      healthySummary:
        "Onboarding velocity is loaded from tracked onboarding history.",
      emptySummary:
        "Onboarding velocity loaded without any tracked starts, completions, or duration buckets in this window.",
    }),
    buildAdminUiChartHealthItem({
      key: "analytics.operations.onboarding_step_flow",
      title: "Onboarding Step Flow",
      page: "analytics",
      category: "operations",
      source: "historical_analytics",
      updatedAtMs: onboardingStepFlowState.updatedAtMs,
      hasLoaded: onboardingStepFlowState.hasLoaded,
      loading: onboardingStepFlowState.loading,
      hasData: onboardingStepFlowItems.length > 0,
      blockingIssues: onboardingStepFlowState.blockingIssues,
      backgroundIssues: onboardingStepFlowState.backgroundIssues,
      healthySummary: "Step-level onboarding flow is loaded.",
      emptySummary:
        "No onboarding step-flow records were returned for the selected window.",
    }),
    buildAdminUiChartHealthItem({
      key: "analytics.operations.guest_bounce_quality",
      title: "Guest + Bounce Quality",
      page: "analytics",
      category: "operations",
      source: "historical_analytics",
      updatedAtMs: guestBounceQualityState.updatedAtMs,
      hasLoaded: guestBounceQualityState.hasLoaded,
      loading: guestBounceQualityState.loading,
      hasData: Boolean(
        guestBounceGlobalSemantics?.viewCount ||
        guestBounceUserSemantics?.viewCount ||
        guestBounceAdminSemantics?.viewCount ||
        guestBounceDropSemantics?.viewCount,
      ),
      blockingIssues: guestBounceQualityState.blockingIssues,
      backgroundIssues: guestBounceQualityState.backgroundIssues,
      healthySummary:
        "Semantic quality metrics are loaded for guest and signed-in traffic.",
      emptySummary:
        "Semantic quality metrics loaded without any view-count signal.",
    }),
    buildAdminUiChartHealthItem({
      key: "analytics.operations.event_mix",
      title: "Event Mix",
      page: "analytics",
      category: "operations",
      source: "historical_analytics",
      updatedAtMs: eventMixState.updatedAtMs,
      hasLoaded: eventMixState.hasLoaded,
      loading: eventMixState.loading,
      hasData: eventMixBreakdown.length > 0,
      blockingIssues: eventMixState.blockingIssues,
      backgroundIssues: eventMixState.backgroundIssues,
      healthySummary: "Event mix is loaded from the selected historical range.",
      emptySummary:
        "Event mix loaded without any tracked event counts in this window.",
    }),
    buildAdminUiChartHealthItem({
      key: "analytics.operations.live_interaction_stream",
      title: "Live Interaction Stream",
      page: "analytics",
      category: "operations",
      source: "mixed_client_live",
      updatedAtMs: Math.max(
        liveUpdatedAtMs,
        liveInteractionStreamState.updatedAtMs,
      ),
      hasLoaded:
        Boolean(liveResponse) ||
        liveInteractionStreamState.hasLoaded ||
        Boolean(liveError),
      loading: liveLoading || liveInteractionStreamState.loading,
      hasData:
        liveInteractionEvents.length > 0 ||
        liveActiveUsers.length > 0 ||
        liveSurfaceMix.length > 0,
      blockingIssues: [
        ...liveBlockingIssues,
        ...liveInteractionStreamState.blockingIssues,
      ],
      backgroundIssues: [
        ...liveBackgroundIssues,
        ...liveInteractionStreamState.backgroundIssues,
      ],
      healthySummary:
        "Interaction stream is loaded from realtime and recent historical inputs.",
      emptySummary:
        "Interaction stream loaded without any recent live or historical interaction records.",
    }),
    buildAdminUiChartHealthItem({
      key: "analytics.operations.data_validation",
      title: "Data Validation",
      page: "analytics",
      category: "operations",
      source: "historical_analytics",
      updatedAtMs: dataValidationState.updatedAtMs,
      hasLoaded: dataValidationState.hasLoaded,
      loading: dataValidationState.loading,
      hasData: validationItems.length > 0,
      blockingIssues: dataValidationState.blockingIssues,
      backgroundIssues: dataValidationState.backgroundIssues,
      healthySummary:
        "Validation checks are loaded for the selected analytics window.",
      emptySummary: "Validation checks did not return any loaded rows.",
    }),
    buildAdminUiChartHealthItem({
      key: "analytics.audience.audience_snapshot",
      title: "Audience Snapshot",
      page: "analytics",
      category: "audience",
      source: "historical_analytics",
      updatedAtMs: audienceSnapshotState.updatedAtMs,
      hasLoaded: audienceSnapshotState.hasLoaded,
      loading: audienceSnapshotState.loading,
      hasData:
        audienceHistorySeries.length > 0 ||
        audienceTotals.users > 0 ||
        audienceTotals.views > 0 ||
        audienceTotals.sessions > 0,
      blockingIssues: audienceSnapshotState.blockingIssues,
      backgroundIssues: audienceSnapshotState.backgroundIssues,
      healthySummary: "Audience snapshot is loaded for the selected range.",
      emptySummary:
        "Audience snapshot loaded without any audience metrics in this window.",
    }),
    buildAdminUiChartHealthItem({
      key: "analytics.audience.return_cadence",
      title: "Return Cadence",
      page: "analytics",
      category: "audience",
      source: "historical_analytics",
      updatedAtMs: returnCadenceState.updatedAtMs,
      hasLoaded: returnCadenceState.hasLoaded,
      loading: returnCadenceState.loading,
      hasData: returnCadenceSegments.length > 0,
      blockingIssues: returnCadenceState.blockingIssues,
      backgroundIssues: returnCadenceState.backgroundIssues,
      healthySummary: "Return cadence segments are loaded.",
      emptySummary: "No return-cadence segments were returned in this window.",
    }),
    buildAdminUiChartHealthItem({
      key: "analytics.audience.navigation_destinations",
      title: "Navigation Destinations",
      page: "analytics",
      category: "audience",
      source: "historical_analytics",
      updatedAtMs: navigationDestinationsState.updatedAtMs,
      hasLoaded: navigationDestinationsState.hasLoaded,
      loading: navigationDestinationsState.loading,
      hasData: navigationDestinationsMix.length > 0,
      blockingIssues: navigationDestinationsState.blockingIssues,
      backgroundIssues: navigationDestinationsState.backgroundIssues,
      healthySummary: "Navigation destinations are loaded.",
      emptySummary:
        "No navigation-destination mix was returned in this window.",
    }),
    buildAdminUiChartHealthItem({
      key: "analytics.audience.device_mix",
      title: "Device Mix",
      page: "analytics",
      category: "audience",
      source: "historical_analytics",
      updatedAtMs: deviceMixState.updatedAtMs,
      hasLoaded: deviceMixState.hasLoaded,
      loading: deviceMixState.loading,
      hasData: deviceMixDevices.length > 0,
      blockingIssues: deviceMixState.blockingIssues,
      backgroundIssues: deviceMixState.backgroundIssues,
      healthySummary: "Device mix is loaded.",
      emptySummary: "No device-mix rows were returned in this window.",
    }),
    buildAdminUiChartHealthItem({
      key: "analytics.audience.top_paths",
      title: "Top Paths",
      page: "analytics",
      category: "audience",
      source: "historical_analytics",
      updatedAtMs: topPathsState.updatedAtMs,
      hasLoaded: topPathsState.hasLoaded,
      loading: topPathsState.loading,
      hasData: topPathsPages.length > 0,
      blockingIssues: topPathsState.blockingIssues,
      backgroundIssues: topPathsState.backgroundIssues,
      healthySummary: "Top path performance is loaded.",
      emptySummary: "No top-path rows were returned in this window.",
    }),
    buildAdminUiChartHealthItem({
      key: "analytics.audience.regions",
      title: "Regions",
      page: "analytics",
      category: "audience",
      source: "historical_analytics",
      updatedAtMs: regionsState.updatedAtMs,
      hasLoaded: regionsState.hasLoaded,
      loading: regionsState.loading,
      hasData: regionsGeo.length > 0,
      blockingIssues: regionsState.blockingIssues,
      backgroundIssues: regionsState.backgroundIssues,
      healthySummary: "Regional demand is loaded.",
      emptySummary: "No regional demand rows were returned in this window.",
    }),
    buildAdminUiChartHealthItem({
      key: "analytics.commerce.commerce_snapshot",
      title: "Commerce Snapshot",
      page: "analytics",
      category: "commerce",
      source: "historical_analytics",
      updatedAtMs: commerceSnapshotState.updatedAtMs,
      hasLoaded: commerceSnapshotState.hasLoaded,
      loading: commerceSnapshotState.loading,
      hasData:
        commerceSnapshotCommerce.revenueUsd > 0 ||
        commerceSnapshotCommerce.gdSpent > 0 ||
        commerceSnapshotFunnel.purchases > 0,
      blockingIssues: commerceSnapshotState.blockingIssues,
      backgroundIssues: commerceSnapshotState.backgroundIssues,
      healthySummary: "Commerce snapshot is loaded.",
      emptySummary:
        "Commerce snapshot loaded without any revenue, spend, or purchase signal.",
    }),
    buildAdminUiChartHealthItem({
      key: "analytics.commerce.package_performance",
      title: "Package Performance",
      page: "analytics",
      category: "commerce",
      source: "historical_analytics",
      updatedAtMs: packagePerformanceState.updatedAtMs,
      hasLoaded: packagePerformanceState.hasLoaded,
      loading: packagePerformanceState.loading,
      hasData: packagePerformanceItems.length > 0,
      blockingIssues: packagePerformanceState.blockingIssues,
      backgroundIssues: packagePerformanceState.backgroundIssues,
      healthySummary: "Package performance is loaded.",
      emptySummary: "No package-performance rows were returned in this window.",
    }),
    buildAdminUiChartHealthItem({
      key: "analytics.commerce.content_conversion",
      title: "Content Conversion",
      page: "analytics",
      category: "commerce",
      source: "historical_analytics",
      updatedAtMs: contentConversionState.updatedAtMs,
      hasLoaded: contentConversionState.hasLoaded,
      loading: contentConversionState.loading,
      hasData: contentConversionItems.length > 0,
      blockingIssues: contentConversionState.blockingIssues,
      backgroundIssues: contentConversionState.backgroundIssues,
      healthySummary: "Content conversion mix is loaded.",
      emptySummary: "No content-conversion mix was returned in this window.",
    }),
    buildAdminUiChartHealthItem({
      key: "analytics.commerce.top_drop_conversion",
      title: "Top Drop Conversion",
      page: "analytics",
      category: "commerce",
      source: "historical_analytics",
      updatedAtMs: topDropConversionState.updatedAtMs,
      hasLoaded: topDropConversionState.hasLoaded,
      loading: topDropConversionState.loading,
      hasData: topDropConversionItems.length > 0,
      blockingIssues: topDropConversionState.blockingIssues,
      backgroundIssues: topDropConversionState.backgroundIssues,
      healthySummary: "Top drop conversion is loaded.",
      emptySummary: "No top-drop conversion rows were returned in this window.",
    }),
    buildAdminUiChartHealthItem({
      key: "analytics.commerce.recent_commerce_feed",
      title: "Recent Commerce Feed",
      page: "analytics",
      category: "commerce",
      source: "historical_analytics",
      updatedAtMs: recentCommerceFeedState.updatedAtMs,
      hasLoaded: recentCommerceFeedState.hasLoaded,
      loading: recentCommerceFeedState.loading,
      hasData: recentCommerceFeedItems.length > 0,
      blockingIssues: recentCommerceFeedState.blockingIssues,
      backgroundIssues: recentCommerceFeedState.backgroundIssues,
      healthySummary: "Recent commerce feed is loaded.",
      emptySummary:
        "No recent commerce feed rows were returned in this window.",
    }),
    buildAdminUiChartHealthItem({
      key: "analytics.commerce.viewer_drilldown",
      title: "Viewer Drilldown",
      page: "analytics",
      category: "commerce",
      source: "historical_analytics",
      updatedAtMs: viewerDrilldownState.updatedAtMs,
      hasLoaded: viewerDrilldownState.hasLoaded,
      loading: viewerDrilldownState.loading,
      hasData:
        viewerDrilldownOverview.viewCount > 0 ||
        viewerDrilldownInsights.length > 0 ||
        viewerDrilldownUsers.length > 0,
      blockingIssues: viewerDrilldownState.blockingIssues,
      backgroundIssues: viewerDrilldownState.backgroundIssues,
      healthySummary:
        "Viewer drilldown is loaded for the current viewer scope.",
      emptySummary:
        "Viewer drilldown loaded without any viewer-level watch or identity signal.",
    }),
    buildAdminUiChartHealthItem({
      key: "analytics.commerce.viewer_journey",
      title: "Viewer Journey",
      page: "analytics",
      category: "commerce",
      source: "historical_analytics",
      updatedAtMs: viewerJourneyState.updatedAtMs,
      hasLoaded: viewerJourneyState.hasLoaded,
      loading: viewerJourneyState.loading,
      hasData: viewerJourneyItems.some((item) => item.count > 0),
      blockingIssues: viewerJourneyState.blockingIssues,
      backgroundIssues: viewerJourneyState.backgroundIssues,
      healthySummary: "Viewer journey metrics are loaded.",
      emptySummary:
        "Viewer journey loaded without any tracked viewer activity.",
    }),
    buildAdminUiChartHealthItem({
      key: "analytics.commerce.watch_depth_tags",
      title: "Watch Depth + Tags",
      page: "analytics",
      category: "commerce",
      source: "historical_analytics",
      updatedAtMs: watchDepthTagsState.updatedAtMs,
      hasLoaded: watchDepthTagsState.hasLoaded,
      loading: watchDepthTagsState.loading,
      hasData:
        watchDepthTagBuckets.some((bucket) => bucket.count > 0) || watchDepthTagDemand.length > 0,
      blockingIssues: watchDepthTagsState.blockingIssues,
      backgroundIssues: watchDepthTagsState.backgroundIssues,
      healthySummary: "Watch-depth and tag demand are loaded.",
      emptySummary:
        "No watch-depth or tag-demand rows were returned in this window.",
    }),
    buildAdminUiChartHealthItem({
      key: "analytics.commerce.daily_task_pipeline",
      title: "Daily Task Pipeline",
      page: "analytics",
      category: "commerce",
      source: "historical_analytics",
      updatedAtMs: dailyTaskPipelineState.updatedAtMs,
      hasLoaded: dailyTaskPipelineState.hasLoaded,
      loading: dailyTaskPipelineState.loading,
      hasData: dailyTaskPipelineModel.hasData,
      blockingIssues: dailyTaskPipelineState.blockingIssues,
      backgroundIssues: dailyTaskPipelineState.backgroundIssues,
      healthySummary: "Daily task pipeline metrics are loaded.",
      emptySummary: "No daily task pipeline rows were returned in this window.",
    }),
    buildAdminUiChartHealthItem({
      key: "analytics.commerce.task_completion_speed",
      title: "Task Completion Speed",
      page: "analytics",
      category: "commerce",
      source: "historical_analytics",
      updatedAtMs: taskCompletionSpeedState.updatedAtMs,
      hasLoaded: taskCompletionSpeedState.hasLoaded,
      loading: taskCompletionSpeedState.loading,
      hasData: taskCompletionSpeedBuckets.length > 0,
      blockingIssues: taskCompletionSpeedState.blockingIssues,
      backgroundIssues: taskCompletionSpeedState.backgroundIssues,
      healthySummary: "Task completion speed buckets are loaded.",
      emptySummary:
        "No task completion speed buckets were returned in this window.",
    }),
    buildAdminUiChartHealthItem({
      key: "analytics.commerce.task_leaderboard",
      title: "Task Leaderboard",
      page: "analytics",
      category: "commerce",
      source: "historical_analytics",
      updatedAtMs: taskLeaderboardState.updatedAtMs,
      hasLoaded: taskLeaderboardState.hasLoaded,
      loading: taskLeaderboardState.loading,
      hasData: taskLeaderboardItems.length > 0,
      blockingIssues: taskLeaderboardState.blockingIssues,
      backgroundIssues: taskLeaderboardState.backgroundIssues,
      healthySummary: "Task leaderboard is loaded.",
      emptySummary: "No task leaderboard rows were returned in this window.",
    }),
    buildAdminUiChartHealthItem({
      key: "analytics.commerce.notification_funnel",
      title: "Notification Funnel",
      page: "analytics",
      category: "commerce",
      source: "historical_analytics",
      updatedAtMs: notificationFunnelState.updatedAtMs,
      hasLoaded: notificationFunnelState.hasLoaded,
      loading: notificationFunnelState.loading,
      hasData: notificationFunnelModel.hasData,
      blockingIssues: notificationFunnelState.blockingIssues,
      backgroundIssues: notificationFunnelState.backgroundIssues,
      healthySummary: "Notification funnel metrics are loaded.",
      emptySummary:
        "No notification funnel metrics were returned in this window.",
    }),
  ];
  const analyticsSectionHealthSummary = summarizeAdminUiChartHealth(
    analyticsSectionHealth,
  );

  useAdminUiChartHealthReporter(analyticsSectionHealth);

  const applyViewerFilter = () => {
    setViewerUserFilter(viewerUserDraft.trim());
  };

  const clearViewerFilter = () => {
    setViewerUserDraft("");
    setViewerUserFilter("");
  };

  const clearAllFilters = () => {
    clearViewerFilter();
  };

  
  return {
    user, activeTab, setActiveTab, range, nowMs, viewerUserDraft, setViewerUserDraft, viewerUserFilter, setViewerUserFilter,
    moduleRanges, setModuleRanges, savingSectionKey, setSavingSectionKey, analyticsFilterStorageKey,
    activeSessionFilter, setActiveSessionFilter, activeDropFilter, setActiveDropFilter, activeSubFilter, setActiveSubFilter,
    customDateRange, setCustomDateRange, handleRangeSelect, isCustomRangeDisabled,
    hasActiveFilters, isExportLivePulseLoading, setIsExportLivePulseLoading,
    liveResponse, historicalResponse, liveError, historicalError, liveLoading, historicalLoading,
    needsSetup, blockingAnalyticsError, isPrimingAnalytics, backgroundAnalyticsIssues, updateActiveSessionFilter,
    updateActiveDropFilter, updateActiveSubFilter, handleRefresh, handleAdminAnalyticsExport, getSectionRange, renderSectionRangeControl,
    EVENT_LABELS, funnel, onboardingStats, onboardingDurationBuckets, onboardingStepStats, authBreakdown, historySeries,
    rawEvents, componentContexts, semanticCategories, devices, pages, geo, totals, commerce, activeViewerFilter, setActiveViewerFilter,
    testAdminApiErrorTracking, clearAllFilters, clearViewerFilter,
    authOutcomeHasData, authOutcomeChartItems, authOutcomeTotals,
    authOnboardingDiscrepancies, onboardingVelocityHasData, onboardingVelocityBuckets, onboardingVelocityStartCount, onboardingVelocityCompletionCount, onboardingVelocityCompletionRate, onboardingVelocityDropOffCount, onboardingVelocityStats, onboardingVelocityStartSourceHint, onboardingStepFlowItems,
    guestBounceQualityCards, guestBounceGlobalSemantics, guestBounceGuestRate, guestBounceEngagedRate, guestBounceIdentifiedRate, guestBounceUserSemantics,
    topEvents, liveInteractionStreamRange, liveInteractionStreamData,
    validations, getValidationClasses, dataValidationRange,
    totalDeviceUsers, mobileUsers, mobileShare, audienceSnapshotRange, semanticQualityCards, guestBounceRate, identifiedBounceRate, guestEngagedRate,
    returnCadenceRange, returnCadenceData, repeatVisitSegments, uniqueReturners, returnerConversionRate,
    navigationDestinationsRange, destinationMix, deviceMixRange, getDeviceIcon, topPathsRange, regionsRange,
    commerceSnapshotRange, packagePerformanceRange, packagePerformance,
    PIE_COLORS, contentConversionRange, unlockCategoryMix, previewToUnlockRate, checkoutToPurchaseRate,
    topDropConversionRange, topDrops, recentCommerceFeedRange, feedItems, describeEvent, formatAbsoluteDateTime,
    formatMoney, formatCompactNumber, formatDuration, formatPercent, formatRelativeTime, analyticsSectionHealth,
    liveSurfaceMix, liveActiveUsers, livePulseOnboardingStats, livePulseOnboardingStartCount, livePulseOnboardingCompletionRate, livePulseFunnel, liveSeries, journeyFunnelMetrics
,
    dailyTaskPipelineModel, taskCompletionSpeedBuckets, taskLeaderboardItems, activeNotificationFunnelPieData, notificationActionItems, maxNotificationActionValue, hasNotificationReminderReasons, notificationReminderReasons
  };
}

