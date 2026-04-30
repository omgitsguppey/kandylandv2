"use client";

import { useMemo } from "react";

import type {
  AdminMetricSnapshotRange,
  AdminMetricSnapshotSourceMode,
  AdminMetricSnapshotTruthState,
  SnapshotRefreshStatus,
} from "@/lib/analytics/admin-metric-snapshot";
import { useAdminAnalyticsSnapshot } from "@/hooks/useAdminAnalyticsSnapshot";

export type AdminAnalyticsSnapshotModuleKey =
  | "platform_pulse"
  | "audience_snapshot"
  | "commerce_snapshot"
  | "live_pulse"
  | "journey_funnel"
  | "auth_outcomes"
  | "onboarding_performance"
  | "daily_task_pipeline"
  | "notification_funnel"
  | "event_mix"
  | "live_interaction_stream"
  | "data_health_summary";

export type AdminAnalyticsSnapshotSectionKey =
  | "platformPulse"
  | "audienceSnapshot"
  | "commerceSnapshot"
  | "livePulse"
  | "journeyFunnel"
  | "authOutcomeSplit"
  | "onboardingVelocity"
  | "dailyTaskPipeline"
  | "notificationFunnel"
  | "eventMix"
  | "liveInteractionStream"
  | "dataHealthSummary";

export interface AdminAnalyticsSnapshotRegistryRanges {
  platformPulse: AdminMetricSnapshotRange;
  audienceSnapshot: AdminMetricSnapshotRange;
  commerceSnapshot: AdminMetricSnapshotRange;
  livePulse: AdminMetricSnapshotRange;
  journeyFunnel: AdminMetricSnapshotRange;
  authOutcomeSplit: AdminMetricSnapshotRange;
  onboardingVelocity: AdminMetricSnapshotRange;
  dailyTaskPipeline: AdminMetricSnapshotRange;
  notificationFunnel: AdminMetricSnapshotRange;
  eventMix: AdminMetricSnapshotRange;
  liveInteractionStream: AdminMetricSnapshotRange;
  dataHealthSummary: AdminMetricSnapshotRange;
}

export interface AdminAnalyticsSnapshotModuleState {
  sectionKey: AdminAnalyticsSnapshotSectionKey;
  moduleKey: AdminAnalyticsSnapshotModuleKey;
  rangeKey: AdminMetricSnapshotRange;
  sourceMode: AdminMetricSnapshotSourceMode;
  truthState: AdminMetricSnapshotTruthState | "missing";
  refreshStatus: SnapshotRefreshStatus;
  lastVerifiedAt: string | null;
  generatedAt: string | null;
  debugPath: string;
  hasVerifiedSnapshot: boolean;
  isLoading: boolean;
  error: string | null;
  firstSnapshotMs: number | null;
  duplicateRefreshPrevented: boolean;
  unavailableReason: string | null;
  refresh: (input?: { force?: boolean }) => Promise<unknown>;
}

export interface AdminAnalyticsSnapshotRegistry {
  modules: AdminAnalyticsSnapshotModuleState[];
  bySectionKey: Record<AdminAnalyticsSnapshotSectionKey, AdminAnalyticsSnapshotModuleState>;
  byModuleKey: Record<AdminAnalyticsSnapshotModuleKey, AdminAnalyticsSnapshotModuleState>;
  summary: {
    moduleCount: number;
    verifiedCount: number;
    staleCount: number;
    unavailableCount: number;
    refreshingCount: number;
    duplicateRefreshPrevented: boolean;
    firstSnapshotMs: number | null;
  };
  debug: {
    snapshotFirstMigrationEnabled: true;
    verifiedSnapshotFirstRenderPath: true;
    manualRefreshEnabled: true;
    realtimeUpgradeOptional: true;
    noBlankLoadingWhenSnapshotExists: true;
    modules: AdminAnalyticsSnapshotModuleState[];
    summary: AdminAnalyticsSnapshotRegistry["summary"];
  };
}

function buildModuleState(input: {
  sectionKey: AdminAnalyticsSnapshotSectionKey;
  moduleKey: AdminAnalyticsSnapshotModuleKey;
  rangeKey: AdminMetricSnapshotRange;
  result: ReturnType<typeof useAdminAnalyticsSnapshot>;
}): AdminAnalyticsSnapshotModuleState {
  return {
    sectionKey: input.sectionKey,
    moduleKey: input.moduleKey,
    rangeKey: input.rangeKey,
    sourceMode: input.result.sourceMode,
    truthState: input.result.snapshot?.truthState ?? "missing",
    refreshStatus: input.result.refreshStatus,
    lastVerifiedAt: input.result.snapshot?.lastVerifiedAt ?? null,
    generatedAt: input.result.snapshot?.generatedAt ?? null,
    debugPath: input.result.snapshot?.debugPath ?? `/admin/debug?tab=advanced#analytics-snapshots/${input.moduleKey}/${input.rangeKey}`,
    hasVerifiedSnapshot: Boolean(input.result.snapshot?.lastVerifiedAt),
    isLoading: input.result.isLoading,
    error: input.result.error,
    firstSnapshotMs: input.result.firstSnapshotMs,
    duplicateRefreshPrevented: input.result.duplicateRefreshPrevented,
    unavailableReason: input.result.snapshot?.unavailableReason ?? null,
    refresh: input.result.refresh,
  };
}

export function useAdminAnalyticsSnapshotRegistry(
  ranges: AdminAnalyticsSnapshotRegistryRanges,
): AdminAnalyticsSnapshotRegistry {
  const platformPulse = useAdminAnalyticsSnapshot({
    moduleKey: "platform_pulse",
    rangeKey: ranges.platformPulse,
  });
  const audienceSnapshot = useAdminAnalyticsSnapshot({
    moduleKey: "audience_snapshot",
    rangeKey: ranges.audienceSnapshot,
  });
  const commerceSnapshot = useAdminAnalyticsSnapshot({
    moduleKey: "commerce_snapshot",
    rangeKey: ranges.commerceSnapshot,
  });
  const livePulse = useAdminAnalyticsSnapshot({
    moduleKey: "live_pulse",
    rangeKey: ranges.livePulse,
  });
  const journeyFunnel = useAdminAnalyticsSnapshot({
    moduleKey: "journey_funnel",
    rangeKey: ranges.journeyFunnel,
  });
  const authOutcomes = useAdminAnalyticsSnapshot({
    moduleKey: "auth_outcomes",
    rangeKey: ranges.authOutcomeSplit,
  });
  const onboardingPerformance = useAdminAnalyticsSnapshot({
    moduleKey: "onboarding_performance",
    rangeKey: ranges.onboardingVelocity,
  });
  const dailyTaskPipeline = useAdminAnalyticsSnapshot({
    moduleKey: "daily_task_pipeline",
    rangeKey: ranges.dailyTaskPipeline,
  });
  const notificationFunnel = useAdminAnalyticsSnapshot({
    moduleKey: "notification_funnel",
    rangeKey: ranges.notificationFunnel,
  });
  const eventMix = useAdminAnalyticsSnapshot({
    moduleKey: "event_mix",
    rangeKey: ranges.eventMix,
  });
  const liveInteractionStream = useAdminAnalyticsSnapshot({
    moduleKey: "live_interaction_stream",
    rangeKey: ranges.liveInteractionStream,
  });
  const dataHealthSummary = useAdminAnalyticsSnapshot({
    moduleKey: "data_health_summary",
    rangeKey: ranges.dataHealthSummary,
  });

  return useMemo(() => {
    const modules = [
      buildModuleState({ sectionKey: "platformPulse", moduleKey: "platform_pulse", rangeKey: ranges.platformPulse, result: platformPulse }),
      buildModuleState({ sectionKey: "audienceSnapshot", moduleKey: "audience_snapshot", rangeKey: ranges.audienceSnapshot, result: audienceSnapshot }),
      buildModuleState({ sectionKey: "commerceSnapshot", moduleKey: "commerce_snapshot", rangeKey: ranges.commerceSnapshot, result: commerceSnapshot }),
      buildModuleState({ sectionKey: "livePulse", moduleKey: "live_pulse", rangeKey: ranges.livePulse, result: livePulse }),
      buildModuleState({ sectionKey: "journeyFunnel", moduleKey: "journey_funnel", rangeKey: ranges.journeyFunnel, result: journeyFunnel }),
      buildModuleState({ sectionKey: "authOutcomeSplit", moduleKey: "auth_outcomes", rangeKey: ranges.authOutcomeSplit, result: authOutcomes }),
      buildModuleState({ sectionKey: "onboardingVelocity", moduleKey: "onboarding_performance", rangeKey: ranges.onboardingVelocity, result: onboardingPerformance }),
      buildModuleState({ sectionKey: "dailyTaskPipeline", moduleKey: "daily_task_pipeline", rangeKey: ranges.dailyTaskPipeline, result: dailyTaskPipeline }),
      buildModuleState({ sectionKey: "notificationFunnel", moduleKey: "notification_funnel", rangeKey: ranges.notificationFunnel, result: notificationFunnel }),
      buildModuleState({ sectionKey: "eventMix", moduleKey: "event_mix", rangeKey: ranges.eventMix, result: eventMix }),
      buildModuleState({ sectionKey: "liveInteractionStream", moduleKey: "live_interaction_stream", rangeKey: ranges.liveInteractionStream, result: liveInteractionStream }),
      buildModuleState({ sectionKey: "dataHealthSummary", moduleKey: "data_health_summary", rangeKey: ranges.dataHealthSummary, result: dataHealthSummary }),
    ];
    const bySectionKey = Object.fromEntries(
      modules.map((moduleState) => [moduleState.sectionKey, moduleState]),
    ) as AdminAnalyticsSnapshotRegistry["bySectionKey"];
    const byModuleKey = Object.fromEntries(
      modules.map((moduleState) => [moduleState.moduleKey, moduleState]),
    ) as AdminAnalyticsSnapshotRegistry["byModuleKey"];
    const firstSnapshotMarks = modules
      .map((moduleState) => moduleState.firstSnapshotMs)
      .filter((value): value is number => typeof value === "number");
    const summary = {
      moduleCount: modules.length,
      verifiedCount: modules.filter((moduleState) => moduleState.hasVerifiedSnapshot).length,
      staleCount: modules.filter((moduleState) => moduleState.sourceMode === "stale_cache").length,
      unavailableCount: modules.filter((moduleState) => moduleState.sourceMode === "unavailable").length,
      refreshingCount: modules.filter((moduleState) => moduleState.refreshStatus === "refreshing").length,
      duplicateRefreshPrevented: modules.some((moduleState) => moduleState.duplicateRefreshPrevented),
      firstSnapshotMs: firstSnapshotMarks.length > 0 ? Math.min(...firstSnapshotMarks) : null,
    };

    return {
      modules,
      bySectionKey,
      byModuleKey,
      summary,
      debug: {
        snapshotFirstMigrationEnabled: true,
        verifiedSnapshotFirstRenderPath: true,
        manualRefreshEnabled: true,
        realtimeUpgradeOptional: true,
        noBlankLoadingWhenSnapshotExists: true,
        modules,
        summary,
      },
    };
  }, [
    authOutcomes,
    audienceSnapshot,
    commerceSnapshot,
    dailyTaskPipeline,
    dataHealthSummary,
    eventMix,
    journeyFunnel,
    liveInteractionStream,
    livePulse,
    notificationFunnel,
    onboardingPerformance,
    platformPulse,
    ranges.audienceSnapshot,
    ranges.authOutcomeSplit,
    ranges.commerceSnapshot,
    ranges.dailyTaskPipeline,
    ranges.dataHealthSummary,
    ranges.eventMix,
    ranges.journeyFunnel,
    ranges.liveInteractionStream,
    ranges.livePulse,
    ranges.notificationFunnel,
    ranges.onboardingVelocity,
    ranges.platformPulse,
  ]);
}
