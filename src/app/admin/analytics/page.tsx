"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Activity,
  AlertTriangle,
  Candy,
  CheckCircle2,
  Clock3,
  DollarSign,
  Eye,
  FileText,
  Funnel,
  Loader2,
  MapPin,
  Monitor,
  PlayCircle,
  Route,
  Share2,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
  ADMIN_ANALYTICS_RANGE_OPTIONS,
  normalizeAdminAnalyticsModuleRangeMap,
  type AdminAnalyticsModuleRangeMap,
} from "@/lib/admin-analytics-preferences";
import { buildAuthOutcomeChartModel } from "@/lib/admin-auth-outcome-chart";
import { buildAdminNotificationFunnelModel } from "@/lib/admin-notification-funnel";
import { buildAdminOnboardingVelocityModel } from "@/lib/admin-onboarding-velocity";
import { buildAdminTaskPipelineModel } from "@/lib/admin-task-pipeline";
import { cn } from "@/lib/utils";
import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";
import { AdminOnboardingAnalyticsModules } from "@/components/Admin/Analytics/AdminOnboardingAnalyticsModules";
import {
  AnalyticsTooltip,
  MetricCard,
  SectionCard,
} from "@/components/Admin/Analytics/AdminAnalyticsPrimitives";
import { AdminTaskAndNotificationModules } from "@/components/Admin/Analytics/AdminTaskAndNotificationModules";
import { AdminTruthSurfaces } from '../AdminTruthSurfaces';
import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
import { TELEMETRY_EVENT_LABELS } from "@/lib/telemetry-catalog";

import type { ViewTab, RangeOption, HistoricalAnalyticsResponse, RealtimeAnalyticsResponse, AnalyticsPreferencesResponse, RawEventItem, UserJourneyItem, ValidationItem, OnboardingStepStatItem, CountBucketItem, WatchCaptureHealthItem } from "@/types/admin-analytics";

import {
  ANALYTICS_FILTER_STORAGE_KEY,
  EMPTY_COUNT_BUCKETS,
  EMPTY_ONBOARDING_STATS,
  EMPTY_ONBOARDING_STEP_STATS,
  EMPTY_WATCH_CAPTURE_HEALTH,
  PIE_COLORS,
  RANGE_OPTIONS,
  SectionRangeControl,
  TAB_OPTIONS,
  buildSectionHistoricalUrl,
  describeEvent,
  formatAbsoluteDateTime,
  formatCompactNumber,
  formatDuration,
  formatMoney,
  formatPercent,
  formatRelativeTime,
  getDeviceIcon,
  getJourneyStateClasses,
  getJourneyStateLabel,
  getValidationClasses,
  isRecentViolation,
  useHistoricalSectionOverride,
  type TooltipValue,
} from "./AnalyticsHelpers";

const EVENT_LABELS: Record<string, string> = TELEMETRY_EVENT_LABELS;

import { useAdminAnalyticsState } from "./hooks/useAdminAnalyticsState";
import { AdminAnalyticsOperationsTab } from "./components/AdminAnalyticsOperationsTab";
import { AdminAnalyticsAudienceTab } from "./components/AdminAnalyticsAudienceTab";
import { AdminAnalyticsCommerceTab } from "./components/AdminAnalyticsCommerceTab";
export default function AdminAnalyticsPage() {
    const state = useAdminAnalyticsState();
  const { needsSetup, activeTab, setActiveTab, handleRefresh, liveLoading, historicalLoading, isPrimingAnalytics, formatAbsoluteDateTime, formatRelativeTime, liveResponse, clearAllFilters, hasActiveFilters, isExportLivePulseLoading, handleAdminAnalyticsExport, testAdminApiErrorTracking, backgroundAnalyticsIssues, analyticsSectionHealth, EVENT_LABELS } = state;

  if (needsSetup) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
        <div className="glass-panel max-w-xl rounded-[2rem] border border-red-500/20 p-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-red-500/10 text-red-400">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-white">
            Analytics Needs GA Setup
          </h1>
          <p className="mt-3 text-sm text-gray-400">
            Add <code>GA_PROPERTY_ID</code> to the environment so the admin
            analytics console can query Google Analytics 4.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20 md:space-y-5 md:pb-8">
      <PageViewEvent eventName="admin_analytics_viewed" />
      <AdminPageHeader
        eyebrow="Admin Analytics"
        title="Mobile Monitoring Station"
        subtitle="Live pulse, funnels, revenue, and retention tuned for mobile-first admin monitoring."
        compact
      />

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <MetricCard
          label="Live GA"
          value={formatCompactNumber(liveResponse?.totalActive ?? 0)}
          hint="Active in the last 30 mins"
          icon={Activity}
        />
        <MetricCard
          label="Mobile Share"
          value={formatPercent(mobileShare)}
          hint={`${mobileUsers.toLocaleString()} mobile users in range`}
          icon={Smartphone}
        />
        <MetricCard
          label="Revenue"
          value={formatMoney(commerce.revenueUsd)}
          hint={`${range.toUpperCase()} tracked revenue`}
          icon={DollarSign}
        />
        <MetricCard
          label="Purchases"
          value={formatCompactNumber(funnel.purchases)}
          hint={`${funnel.checkoutStarts.toLocaleString()} checkout starts`}
          icon={ShoppingBag}
        />
      </div>

      <div className="sticky top-[8.6rem] z-20 space-y-2.5 rounded-[1.4rem] border border-white/10 bg-black/65 p-2.5 backdrop-blur-xl md:top-24">
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">
            Sync
          </span>
          <span className="text-xs font-semibold text-white">
            {analyticsWarmState}
          </span>
          <span className="rounded-full border border-white/10 bg-black/30 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-300">
            Live {liveSnapshotLabel}
          </span>
          <span className="rounded-full border border-white/10 bg-black/30 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-300">
            History {historicalSnapshotLabel}
          </span>
          {isBackgroundSyncing ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-brand-purple/20 bg-brand-purple/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-purple">
              <Loader2 className="h-3 w-3 animate-spin" />
              Syncing
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">
            Chart health
          </span>
          <span className="rounded-full border border-emerald-400/15 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-200">
            {analyticsSectionHealthSummary.healthy} healthy
          </span>
          {analyticsSectionHealthSummary.warn > 0 ? (
            <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-100">
              {analyticsSectionHealthSummary.warn} warn
            </span>
          ) : null}
          {analyticsSectionHealthSummary.fail > 0 ? (
            <span className="rounded-full border border-red-400/20 bg-red-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-red-100">
              {analyticsSectionHealthSummary.fail} fail
            </span>
          ) : null}
          <span className="text-xs text-gray-400">
            {analyticsSectionHealthSummary.total} sections reporting from live
            admin analytics UI
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {TAB_OPTIONS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "rounded-2xl border px-3 py-3 text-left transition-colors",
                  active
                    ? "border-brand-purple/40 bg-brand-purple/15 text-white"
                    : "border-white/10 bg-white/5 text-gray-300",
                )}
              >
                <Icon
                  className={cn(
                    "mb-2 h-4 w-4",
                    active ? "text-brand-purple" : "text-gray-500",
                  )}
                />
                <div className="text-sm font-bold">{tab.label}</div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
            <Funnel className="h-4 w-4 shrink-0 text-gray-500" />
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">
              Module filters
            </span>
            <span className="text-xs text-gray-400">
              Each card owns its own time range, and only viewer drilldown stays page-level.
            </span>
          </div>
          <button
            type="button"
            onClick={clearAllFilters}
            className="ml-auto shrink-0 rounded-full border border-white/15 bg-black/40 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-300 transition-colors hover:border-brand-purple/40 hover:text-white"
          >
            Clear viewer filter
          </button>
        </div>
      </div>

      {blockingAnalyticsError && (
        <div className="rounded-[1.8rem] border border-red-500/20 bg-red-500/10 p-4">
          <p className="text-sm font-medium text-red-300">
            {blockingAnalyticsError.message || "Analytics request failed."}
          </p>
        </div>
      )}

      {backgroundAnalyticsIssues.length > 0 && !blockingAnalyticsError ? (
        <div className="rounded-[1.8rem] border border-amber-500/20 bg-amber-500/10 p-4">
          <p className="text-sm font-medium text-amber-200">
            Analytics is showing the last good snapshot while a background
            refresh recovers.
          </p>
          <div className="mt-2 space-y-1 text-xs text-amber-100/90">
            {backgroundAnalyticsIssues.map((issue) => (
              <p key={issue}>{issue}</p>
            ))}
          </div>
        </div>
      ) : null}

      {showHistoricalEmptyState ? (
        <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-white">
                No analytics landed for this window yet.
              </p>
              <p className="mt-1 text-sm text-gray-400">
                {activeViewerFilter
                  ? `No tracked events matched ${activeViewerFilter.startsWith("@") ? activeViewerFilter : `@${activeViewerFilter}`} in ${range.toUpperCase()}.`
                  : `No tracked events were found in ${range.toUpperCase()}.`}{" "}
                This usually means the selected window is too narrow for the
                current dataset, or this environment only has older seeded
                analytics.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {viewerUserFilter ? (
                <button
                  type="button"
                  onClick={clearViewerFilter}
                  className="rounded-full border border-white/15 bg-black/40 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-300 transition-colors hover:border-white/30 hover:text-white"
                >
                  Clear viewer filter
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {isPrimingAnalytics ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-brand-purple" />
            <p className="text-sm text-gray-500">Syncing analytics...</p>
          </div>
        </div>
      ) : null}

      <main className="space-y-4 md:space-y-5">
        {state.activeTab === "operations" ? <AdminAnalyticsOperationsTab {...state} /> : null}
        {state.activeTab === "audience" ? <AdminAnalyticsAudienceTab {...state} /> : null}
        {state.activeTab === "commerce" ? <AdminAnalyticsCommerceTab {...state} /> : null}

        <AdminTaskAndNotificationModules
          renderSectionRangeControl={state.renderSectionRangeControl}
          dailyTaskPipelineItems={state.dailyTaskPipelineModel.items}
          dailyTaskPipelineHasData={state.dailyTaskPipelineModel.hasData}
          taskCompletionSpeedBuckets={state.taskCompletionSpeedBuckets}
          taskLeaderboardItems={state.taskLeaderboardItems}
          activeNotificationFunnelPieData={state.activeNotificationFunnelPieData}
          notificationActionItems={state.notificationActionItems}
          maxNotificationActionValue={state.maxNotificationActionValue}
          hasNotificationReminderReasons={state.hasNotificationReminderReasons}
          notificationReminderReasons={state.notificationReminderReasons}
          formatDuration={state.formatDuration}
          formatPercent={state.formatPercent}
        />

        <AdminTruthSurfaces health={state.analyticsSectionHealth} />
</main>
    </div>
  );
}
