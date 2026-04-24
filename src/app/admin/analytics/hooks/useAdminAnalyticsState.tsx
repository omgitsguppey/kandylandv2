"use client";

import { startTransition, useEffect, useMemo, useState } from "react";


import { toast } from "sonner";


import { useAdminPollingSWR } from "@/hooks/useAdminPollingSWR";
import { useNow } from "@/hooks/useNow";
import { useAuth } from "@/context/AuthContext";
import { authFetch } from "@/lib/authFetch";
import { reportStorageIssue } from "@/lib/client-error-reporting";
import {
  ADMIN_ANALYTICS_DEFAULT_RANGE,
  normalizeAdminAnalyticsModuleRangeMap,
  type AdminAnalyticsModuleRangeMap,
} from "@/lib/admin-analytics-preferences";
import { buildAuthOutcomeChartModel } from "@/lib/admin-auth-outcome-chart";
import { buildAdminNotificationFunnelModel } from "@/lib/admin-notification-funnel";
import { buildAdminOnboardingVelocityModel } from "@/lib/admin-onboarding-velocity";
import { buildAdminTaskPipelineModel } from "@/lib/admin-task-pipeline";
import {
  buildAdminAnalyticsReturnCadenceSummary,
  normalizeAdminAnalyticsReturnCadenceSegments,
} from "@/lib/admin-analytics-return-cadence";


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
  getJourneyStateClasses,
  getJourneyStateLabel,
  getDeviceIcon,
  getValidationClasses,
  isRecentViolation,
  useHistoricalSectionOverride,
} from "../AnalyticsHelpers";
import { useAdminAnalyticsRealtime } from "./useAdminAnalyticsRealtime";

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
    30_000,
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
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
    30_000,
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
    },
  );

  const {
    data: historicalResponse,
    error: historicalError,
    isLoading: historicalLoading,
  } = useAdminPollingSWR<HistoricalAnalyticsResponse>(historicalUrl, 60_000, {
    keepPreviousData: true,
    revalidateOnFocus: false,
  });

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
  const liveRealtime = useAdminAnalyticsRealtime(nowMs);
  const effectiveLiveResponse = useMemo<RealtimeAnalyticsResponse | undefined>(
    () => {
      if (liveRealtime.feedStatus === "failed" && liveResponse) {
        return liveResponse;
      }

      const base = liveResponse ?? {
        success: liveRealtime.feedStatus !== "failed",
        issues: [liveRealtime.feedDetail],
      };
      return {
        ...base,
        generatedAtMs:
          Math.max(base.generatedAtMs ?? 0, liveRealtime.generatedAtMs ?? 0) ||
          base.generatedAtMs ||
          nowMs,
        totalActive: liveRealtime.totalActive,
        deepTrackerActive: liveRealtime.deepTrackerActive,
        data: liveRealtime.data,
        activeUsers: liveRealtime.activeUsers,
        surfaceMix: liveRealtime.surfaceMix,
        liveTruthLabel: liveRealtime.liveTruthLabel,
        liveSourceLabel: liveRealtime.liveSourceLabel,
        activeUsersTruthLabel: liveRealtime.activeUsersTruthLabel,
        activeUsersSourceLabel: liveRealtime.activeUsersSourceLabel,
        issues: [
          ...(base.issues ?? []),
          ...liveRealtime.issues,
        ].filter(
          (issue, index, array): issue is string =>
            Boolean(issue) && array.indexOf(issue) === index,
        ),
      };
    },
    [liveRealtime, liveResponse, nowMs],
  );

  const liveSeries = useMemo(
    () =>
      (effectiveLiveResponse?.data ?? []).map((point) => ({
        ...point,
        label: point.minute === 0 ? "Now" : `${point.minute}m`,
      })),
    [effectiveLiveResponse],
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
  const repeatVisitSegments =
    normalizeAdminAnalyticsReturnCadenceSegments(historicalResponse);
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
  const activeViewerFilter = historicalResponse?.viewerFilter ?? viewerUserFilter;
  const semanticCategories = historicalResponse?.semanticCategories ?? [];
  const validations = historicalResponse?.validations ?? [];
  const componentContexts = historicalResponse?.componentContexts ?? [];
  const userJourneys = historicalResponse?.userJourneys ?? [];
  const experienceContexts = historicalResponse?.experienceContexts ?? [];
  const securityReasons = historicalResponse?.securityReasons ?? [];
  const liveActiveUsers = effectiveLiveResponse?.activeUsers ?? [];
  const liveSurfaceMix = effectiveLiveResponse?.surfaceMix ?? [];
  const liveWatchCaptureHealth =
    effectiveLiveResponse?.watchCaptureHealth ?? EMPTY_WATCH_CAPTURE_HEALTH;

  const needsSetup =
    effectiveLiveResponse?.requiresSetup ||
    historicalResponse?.requiresSetup ||
    (liveError as { info?: { requiresSetup?: boolean } } | undefined)?.info
      ?.requiresSetup ||
    (historicalError as { info?: { requiresSetup?: boolean } } | undefined)
      ?.info?.requiresSetup;
  const backgroundAnalyticsIssues = [
    effectiveLiveResponse && liveError
      ? `Realtime analytics: ${liveError.message || "Background refresh failed."}`
      : null,
    historicalResponse && historicalError
      ? `Historical analytics: ${historicalError.message || "Background refresh failed."}`
      : null,
    ...(effectiveLiveResponse?.issues || []).map(
      (issue) => `Realtime analytics: ${issue}`,
    ),
    ...(liveRealtime.feedStatus === "partial" || liveRealtime.feedStatus === "failed"
      ? [`Realtime analytics: ${liveRealtime.feedDetail}`]
      : []),
    ...(historicalResponse?.issues || []).map(
      (issue) => `Historical analytics: ${issue}`,
    ),
  ].filter(
    (issue, index, array): issue is string =>
      Boolean(issue) && array.indexOf(issue) === index,
  );
  const blockingAnalyticsError =
    (!effectiveLiveResponse &&
      ((liveError as Error | undefined) ||
        (liveRealtime.feedStatus === "failed"
          ? new Error(liveRealtime.feedDetail)
          : undefined))) ||
    (!historicalResponse && (historicalError as Error | undefined)) ||
    null;
  const isPrimingAnalytics =
    !effectiveLiveResponse &&
    !historicalResponse &&
    (liveLoading || historicalLoading);
  const isBackgroundSyncing =
    historicalLoading && Boolean(effectiveLiveResponse || historicalResponse);
  const analyticsWarmState = isPrimingAnalytics
    ? "Fetching live data"
    : liveRealtime.feedStatus === "realtime"
      ? "Realtime live"
      : liveRealtime.feedStatus === "partial"
        ? "Realtime partial"
        : liveRealtime.feedStatus === "failed"
          ? "Realtime fallback"
          : isBackgroundSyncing
            ? "Refreshing"
            : "Polled fallback";

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
  const guestTraffic = historicalResponse?.guestTraffic;
  const guestViewsDisplayCount =
    guestTraffic?.truthLabel === "estimated"
      ? guestTraffic.estimatedGuestViews
      : guestTraffic?.exactGuestViews ?? globalSemantics?.viewCount ?? 0;
  const guestViewsHint =
    guestTraffic?.truthLabel === "estimated"
      ? `Estimated from GA totals minus identified first-party traffic (${formatCompactNumber(guestTraffic.estimatedGuestViews)} views)`
      : `${(globalSemantics?.clickCount ?? 0).toLocaleString()} tracked public clicks`;
  const guestQualityUnavailable =
    guestTraffic?.truthLabel === "estimated" && !guestTraffic.qualityAvailable;
  const guestBounceRate =
    globalSemantics && globalSemantics.viewCount > 0
      ? globalSemantics.bounceCount / Math.max(1, globalSemantics.viewCount)
      : 0;
  const guestEngagedRate = globalSemantics?.engagedRate ?? 0;
  const guestBounceRateDisplay = guestQualityUnavailable
    ? "Unknown"
    : formatPercent(guestBounceRate);
  const guestEngagedRateDisplay = guestQualityUnavailable
    ? "Unknown"
    : formatPercent(guestEngagedRate);
  const guestBounceHint = guestQualityUnavailable
    ? "Anonymous quality metrics are unavailable because consented guest semantic batches did not land in this window."
    : `${(globalSemantics?.bounceCount ?? 0).toLocaleString()} bounced exits`;
  const guestEngagedHint = guestQualityUnavailable
    ? "Guest engagement quality is unavailable without consented guest semantic batches."
    : `${(globalSemantics?.engagedViewCount ?? 0).toLocaleString()} engaged sessions`;
  const identifiedBounceRate =
    userSemantics && userSemantics.viewCount > 0
      ? userSemantics.bounceCount / Math.max(1, userSemantics.viewCount)
      : 0;
  const semanticQualityCards = [
    {
      key: "global",
      label: "Guest / Public",
      views: guestViewsDisplayCount,
      engaged: globalSemantics?.engagedViewCount ?? 0,
      bounced: globalSemantics?.bounceCount ?? 0,
      exits: globalSemantics?.exitCount ?? 0,
      truthLabel: guestTraffic?.truthLabel ?? "unknown",
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
  const liveSnapshotLabel = effectiveLiveResponse?.generatedAtMs
    ? formatRelativeTime(effectiveLiveResponse.generatedAtMs, nowMs)
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
  const guestBounceTraffic = guestBounceQualityData?.guestTraffic ?? guestTraffic;
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
  const guestBounceQualityUnavailable =
    guestBounceTraffic?.truthLabel === "estimated"
      && !guestBounceTraffic.qualityAvailable;
  const guestBounceQualityCards = [
    {
      key: "global",
      label: "Guest / Public",
      views:
        guestBounceTraffic?.truthLabel === "estimated"
          ? guestBounceTraffic.estimatedGuestViews
          : guestBounceGlobalSemantics?.viewCount ?? 0,
      engaged: guestBounceGlobalSemantics?.engagedViewCount ?? 0,
      bounced: guestBounceGlobalSemantics?.bounceCount ?? 0,
      exits: guestBounceGlobalSemantics?.exitCount ?? 0,
      truthLabel: guestBounceTraffic?.truthLabel ?? "unknown",
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
  const liveInteractionStreamData = liveInteractionData;
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
  const returnCadenceSegments = returnCadenceData
    ? normalizeAdminAnalyticsReturnCadenceSegments(returnCadenceData)
    : repeatVisitSegments;
  const returnCadenceSummary =
    buildAdminAnalyticsReturnCadenceSummary(returnCadenceSegments);
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
    !effectiveLiveResponse && liveError
      ? [liveError.message || "Realtime analytics request failed."]
      : [];
  const historicalBlockingIssues =
    !historicalResponse && historicalError
      ? [historicalError.message || "Historical analytics request failed."]
      : [];
  const liveBackgroundIssues = [
    effectiveLiveResponse && liveError
      ? `Realtime analytics refresh failed: ${liveError.message || "Background refresh failed."}`
      : null,
    ...(effectiveLiveResponse?.issues || []).map(
      (issue) => `Realtime analytics issue: ${issue}`,
    ),
    ...(liveRealtime.feedStatus === "partial" || liveRealtime.feedStatus === "failed"
      ? [`Realtime analytics issue: ${liveRealtime.feedDetail}`]
      : []),
  ].filter((issue): issue is string => Boolean(issue));
  const historicalBackgroundIssues = [
    historicalResponse && historicalError
      ? `Historical analytics refresh failed: ${historicalError.message || "Background refresh failed."}`
      : null,
    ...(historicalResponse?.issues || []).map(
      (issue) => `Historical analytics issue: ${issue}`,
    ),
  ].filter((issue): issue is string => Boolean(issue));
  const liveUpdatedAtMs = effectiveLiveResponse?.generatedAtMs ?? 0;
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

  const setActiveTabDeferred = (nextTab: ViewTab) => {
    startTransition(() => {
      setActiveTab(nextTab);
    });
  };

  
  return {
    user, activeTab, setActiveTab: setActiveTabDeferred, range, nowMs, viewerUserDraft, setViewerUserDraft, viewerUserFilter, setViewerUserFilter,
    moduleRanges, setModuleRanges, savingSectionKey, setSavingSectionKey, analyticsFilterStorageKey,
    liveResponse: effectiveLiveResponse, historicalResponse, liveError, historicalError, liveLoading, historicalLoading,
    needsSetup, blockingAnalyticsError, isPrimingAnalytics, backgroundAnalyticsIssues, getSectionRange, renderSectionRangeControl,
    EVENT_LABELS, funnel, onboardingStats, onboardingDurationBuckets, onboardingStepStats, authBreakdown, historySeries,
    rawEvents, componentContexts, semanticCategories, devices, pages, geo, totals, commerce, activeViewerFilter,
    clearAllFilters, clearViewerFilter,
    showHistoricalEmptyState, liveSnapshotLabel, historicalSnapshotLabel, analyticsWarmState, isBackgroundSyncing,
    authOutcomeHasData, authOutcomeChartItems, authOutcomeTotals,
    authOnboardingDiscrepancies, onboardingVelocityHasData, onboardingVelocityBuckets, onboardingVelocityStartCount, onboardingVelocityCompletionCount, onboardingVelocityCompletionRate, onboardingVelocityDropOffCount, onboardingVelocityStats, onboardingVelocityStartSourceHint, onboardingStepFlowItems,
    guestBounceQualityCards, guestBounceGlobalSemantics, guestBounceGuestRate, guestBounceEngagedRate, guestBounceIdentifiedRate, guestBounceUserSemantics,
    guestViewsDisplayCount, guestViewsHint, guestBounceRateDisplay, guestBounceHint, guestEngagedRateDisplay, guestEngagedHint, guestQualityUnavailable,
    topEvents, liveInteractionStreamRange, liveInteractionStreamData, liveInteractionEvents,
    validations, validationItems, getValidationClasses, dataValidationRange,
    totalDeviceUsers, mobileUsers, mobileShare, audienceSnapshotRange, semanticQualityCards, guestBounceRate, identifiedBounceRate, guestEngagedRate,
    audienceTotals, audienceHistorySeries,
    returnCadenceRange, returnCadenceData, returnCadenceSegments, returnCadenceSummary,
    navigationDestinationsRange, destinationMix, navigationDestinationsMix, deviceMixRange, getDeviceIcon, deviceMixDevices, deviceMixTotalUsers, topPathsRange, topPathsPages, regionsRange, regionsGeo,
    commerceSnapshotRange, commerceSnapshotCommerce, commerceSnapshotFunnel, packagePerformanceRange, packagePerformance, packagePerformanceItems,
    PIE_COLORS, contentConversionRange, unlockCategoryMix, contentConversionItems, previewToUnlockRate, checkoutToPurchaseRate,
    topDropConversionRange, topDrops, topDropConversionItems, recentCommerceFeedRange, recentCommerceFeedItems, describeEvent, formatAbsoluteDateTime,
    formatMoney, formatCompactNumber, formatDuration, formatPercent, formatRelativeTime,
    liveSurfaceMix, liveActiveUsers, livePulseOnboardingStats, livePulseOnboardingStartCount, livePulseOnboardingCompletionRate, livePulseFunnel, liveSeries, journeyFunnelMetrics,
    liveFeedStatus: liveRealtime.feedStatus, liveFeedDetail: liveRealtime.feedDetail, liveGuestActiveCount: liveRealtime.guestActive
,
    viewerDrilldownFilter, viewerDrilldownOverview, applyViewerFilter, viewerDrilldownUsers, viewerDrilldownCaptureHealth, liveWatchCaptureHealth, viewerDrilldownJourneys, viewerDrilldownInsights, viewerDropChartData, viewerJourneyItems, watchDepthTagBuckets, watchDepthTagDemand,
    getJourneyStateClasses, getJourneyStateLabel, topExperienceContexts, topComponentContexts, eventMixTopEvents, eventMixTopComponentContexts,
    dailyTaskPipelineModel, taskCompletionSpeedBuckets, taskLeaderboardItems, activeNotificationFunnelPieData, notificationActionItems, maxNotificationActionValue, hasNotificationReminderReasons, notificationReminderReasons
  };
}

export type AdminAnalyticsState = ReturnType<typeof useAdminAnalyticsState>;

