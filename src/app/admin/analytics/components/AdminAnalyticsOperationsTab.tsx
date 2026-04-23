import React from "react";
import {
  Activity, AlertTriangle, CheckCircle2, Clock3, Eye, Monitor, PlayCircle, Share2, ShoppingBag, Sparkles, Users, Wallet,
} from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AnalyticsTooltip, MetricCard, SectionCard } from "@/components/Admin/Analytics/AdminAnalyticsPrimitives";
import { AdminOnboardingAnalyticsModules } from "@/components/Admin/Analytics/AdminOnboardingAnalyticsModules";
import { cn } from "@/lib/utils";
import type { AdminAnalyticsState } from "../hooks/useAdminAnalyticsState";

export function AdminAnalyticsOperationsTab(props: AdminAnalyticsState) {
  const {
    renderSectionRangeControl, liveResponse, historicalResponse, liveLoading, historicalLoading, nowMs, EVENT_LABELS,
    liveSurfaceMix, liveActiveUsers, livePulseOnboardingStats, livePulseOnboardingStartCount, livePulseOnboardingCompletionRate, livePulseFunnel, liveSeries,
    journeyFunnelMetrics,
    authOutcomeHasData, authOutcomeChartItems, authOutcomeTotals,
    authOnboardingDiscrepancies, onboardingVelocityHasData, onboardingVelocityBuckets, onboardingVelocityStartCount, onboardingVelocityCompletionCount, onboardingVelocityCompletionRate, onboardingVelocityDropOffCount, onboardingVelocityStats, onboardingVelocityStartSourceHint, onboardingStepFlowItems,
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

  return (
    <>
<>
            <SectionCard
              title="Live Pulse"
              subtitle="Current traffic against the selected historical window."
              icon={Activity}
              defaultExpanded
              rightSlot={renderSectionRangeControl("livePulse")}
            >
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <MetricCard
                  label="GA Active"
                  value={formatCompactNumber(liveResponse?.totalActive ?? 0)}
                  hint={liveResponse?.liveTruthLabel === "fallback"
                    ? `First-party fallback (${liveResponse?.liveSourceLabel || "realtime fallback"})`
                    : "Google Analytics realtime"}
                  icon={Users}
                />
                <MetricCard
                  label="Tracked Users"
                  value={formatCompactNumber(
                    liveResponse?.deepTrackerActive ?? 0,
                  )}
                  hint={liveResponse?.activeUsersTruthLabel === "fallback"
                    ? `Authenticated users reconstructed from ${liveResponse?.activeUsersSourceLabel || "first-party telemetry"}`
                    : `${formatCompactNumber(
                        liveActiveUsers.filter((item: any) => item.actorType === "guest").length,
                      )} live guests plus authenticated users in the last 30 minutes`}
                  icon={Sparkles}
                />
                <MetricCard
                  label="Onboarding"
                  value={livePulseOnboardingStats.completions.toLocaleString()}
                  hint={`${livePulseOnboardingStartCount.toLocaleString()} starts · ${formatPercent(livePulseOnboardingCompletionRate)}`}
                  icon={PlayCircle}
                />
                <MetricCard
                  label="Purchases"
                  value={livePulseFunnel.purchases.toLocaleString()}
                  hint={`${formatPercent(livePulseFunnel.checkoutStarts > 0 ? livePulseFunnel.purchases / Math.max(1, livePulseFunnel.checkoutStarts) : 0)} of checkout starts`}
                  icon={ShoppingBag}
                />
              </div>

              <div className="mt-5 h-64 w-full md:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={liveSeries}
                    margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="liveUsersFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#b28cff"
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="95%"
                          stopColor="#b28cff"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient
                        id="liveViewsFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#22d3ee"
                          stopOpacity={0.25}
                        />
                        <stop
                          offset="95%"
                          stopColor="#22d3ee"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
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
                    <Area
                      type="monotone"
                      dataKey="users"
                      name="Active users"
                      stroke="#b28cff"
                      strokeWidth={2.5}
                      fill="url(#liveUsersFill)"
                    />
                    <Area
                      type="monotone"
                      dataKey="views"
                      name="Page views"
                      stroke="#22d3ee"
                      strokeWidth={2.5}
                      fill="url(#liveViewsFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                        Realtime surfaces
                      </p>
                      <p className="mt-1 text-sm text-gray-400">
                        Where active admins and users are actually concentrated
                        right now.
                      </p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-gray-300">
                      {liveSurfaceMix.length} lanes
                    </span>
                  </div>
                  <div className="space-y-3">
                    {liveSurfaceMix.length > 0 ? (
                      liveSurfaceMix.map((item: any) => (
                        <div
                          key={item.key}
                          className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"
                        >
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-white">
                              {item.label}
                            </p>
                            <span className="text-sm font-bold text-brand-purple">
                              {item.activeUsers}
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-brand-purple to-cyan-400"
                              style={{
                                width: `${Math.max(8, (item.activeUsers / Math.max(1, liveSurfaceMix[0]?.activeUsers || 1)) * 100)}%`,
                              }}
                            />
                          </div>
                          <p className="mt-2 text-[11px] text-gray-500">
                            Seen {formatRelativeTime(item.lastSeenAt, nowMs)}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[1.4rem] border border-dashed border-white/10 bg-black/20 p-4 text-sm text-gray-500">
                        Realtime surface mix will populate as active-user
                        snapshots land.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                        Active identities
                      </p>
                      <p className="mt-1 text-sm text-gray-400">
                        Latest actor, route, and experience context for the live
                        pulse window.
                      </p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-gray-300">
                      {liveActiveUsers.length} live
                    </span>
                  </div>
                  <div className="space-y-3">
                    {liveActiveUsers.length > 0 ? (
                      liveActiveUsers.map((item: any) => (
                        <div
                          key={item.uid}
                          className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-white">
                                {item.username}
                              </p>
                              <p className="mt-1 text-[11px] text-gray-500">
                                {item.lastComponentName ||
                                  item.lastSemanticScopeLabel ||
                                  item.lastPagePath ||
                                  "Live session"}
                              </p>
                            </div>
                            <span className="rounded-full border border-white/10 bg-black/30 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-300">
                              {formatRelativeTime(item.lastSeenAt, nowMs)}
                            </span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span
                              className={
                                item.actorType === "guest"
                                  ? "rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2 py-1 text-[10px] font-semibold text-cyan-100"
                                  : "rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold text-gray-300"
                              }
                            >
                              {item.actorType === "guest"
                                ? item.sessionKey
                                  ? `Guest ${item.sessionKey.slice(-6)}`
                                  : "Guest"
                                : "Authenticated"}
                            </span>
                            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold text-gray-300">
                              {EVENT_LABELS[item.lastEventName] ||
                                item.lastEventName ||
                                "Unknown event"}
                            </span>
                            {item.lastDropTitle ? (
                              <span className="rounded-full border border-brand-purple/20 bg-brand-purple/10 px-2 py-1 text-[10px] font-semibold text-brand-purple">
                                {item.lastDropTitle}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[1.4rem] border border-dashed border-white/10 bg-black/20 p-4 text-sm text-gray-500">
                        No active identity details are available in the current
                        realtime snapshot.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Journey Funnel"
              subtitle="The custom event chain shows where users enter, preview, unlock, and pay."
              icon={Eye}
              rightSlot={renderSectionRangeControl("journeyFunnel")}
            >
              <div className="grid gap-3">
                {[
                  {
                    label: "Auth modal opens",
                    count: journeyFunnelMetrics.authModalOpens,
                    ratio: 1,
                    icon: Users,
                  },
                  {
                    label: "Drop previews",
                    count: journeyFunnelMetrics.previewOpens,
                    ratio:
                      journeyFunnelMetrics.authModalOpens > 0
                        ? journeyFunnelMetrics.previewOpens /
                          Math.max(1, journeyFunnelMetrics.authModalOpens)
                        : 0,
                    icon: Eye,
                  },
                  {
                    label: "Viewer opens",
                    count: journeyFunnelMetrics.viewerOpens,
                    ratio:
                      journeyFunnelMetrics.previewOpens > 0
                        ? journeyFunnelMetrics.viewerOpens /
                          Math.max(1, journeyFunnelMetrics.previewOpens)
                        : 0,
                    icon: PlayCircle,
                  },
                  {
                    label: "Unlocks",
                    count: journeyFunnelMetrics.unlocks,
                    ratio:
                      journeyFunnelMetrics.previewOpens > 0
                        ? journeyFunnelMetrics.unlocks /
                          Math.max(1, journeyFunnelMetrics.previewOpens)
                        : 0,
                    icon: Sparkles,
                  },
                  {
                    label: "Checkout starts",
                    count: journeyFunnelMetrics.checkoutStarts,
                    ratio:
                      journeyFunnelMetrics.unlocks > 0
                        ? journeyFunnelMetrics.checkoutStarts /
                          Math.max(1, journeyFunnelMetrics.unlocks)
                        : 0,
                    icon: Wallet,
                  },
                  {
                    label: "Purchases",
                    count: journeyFunnelMetrics.purchases,
                    ratio:
                      journeyFunnelMetrics.checkoutStarts > 0
                        ? journeyFunnelMetrics.purchases /
                          Math.max(1, journeyFunnelMetrics.checkoutStarts)
                        : 0,
                    icon: ShoppingBag,
                  },
                ].map((step) => {
                  const Icon = step.icon;
                  return (
                    <div
                      key={step.label}
                      className="rounded-[1.6rem] border border-white/10 bg-black/30 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/5 text-brand-purple">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {step.label}
                            </p>
                            <p className="text-xs text-gray-500">
                              {step.count.toLocaleString()} events
                            </p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-white">
                          {step.label === "Auth modal opens"
                            ? "Base"
                            : formatPercent(step.ratio)}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-brand-purple to-cyan-400"
                          style={{
                            width: `${Math.max(6, Math.min(100, step.ratio * 100 || 0))}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <MetricCard
                  label="Shares"
                  value={journeyFunnelMetrics.shares.toLocaleString()}
                  hint="Copied invite/share actions"
                  icon={Share2}
                />
                <MetricCard
                  label="Daily Check-ins"
                  value={journeyFunnelMetrics.checkIns.toLocaleString()}
                  hint="Reward claims in range"
                  icon={CheckCircle2}
                />
              </div>
            </SectionCard>

            <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
              <SectionCard
                title="Auth Outcome Split"
                subtitle="Attempts, completion quality, and finish speed by auth method."
                icon={Users}
                rightSlot={renderSectionRangeControl("authOutcomeSplit")}
              >
                <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
                  <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-brand-purple/20 bg-brand-purple/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-purple">
                        Successes
                      </span>
                      <span className="rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-rose-200">
                        Failures
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-300">
                        Unfinished attempts
                      </span>
                    </div>

                    <div className="h-72 w-full">
                      {authOutcomeHasData ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={authOutcomeChartItems}
                            layout="vertical"
                            margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
                            barCategoryGap={18}
                          >
                            <defs>
                              <linearGradient
                                id="authOutcomeSuccessFill"
                                x1="0"
                                y1="0"
                                x2="1"
                                y2="0"
                              >
                                <stop
                                  offset="0%"
                                  stopColor="#8b5cf6"
                                  stopOpacity={0.95}
                                />
                                <stop
                                  offset="100%"
                                  stopColor="#c084fc"
                                  stopOpacity={1}
                                />
                              </linearGradient>
                              <linearGradient
                                id="authOutcomeFailureFill"
                                x1="0"
                                y1="0"
                                x2="1"
                                y2="0"
                              >
                                <stop
                                  offset="0%"
                                  stopColor="#fb7185"
                                  stopOpacity={0.9}
                                />
                                <stop
                                  offset="100%"
                                  stopColor="#f97316"
                                  stopOpacity={0.95}
                                />
                              </linearGradient>
                            </defs>
                            <CartesianGrid
                              stroke="rgba(255,255,255,0.06)"
                              horizontal={false}
                            />
                            <XAxis
                              type="number"
                              stroke="#6b7280"
                              fontSize={11}
                              tickLine={false}
                              axisLine={false}
                              allowDecimals={false}
                            />
                            <YAxis
                              type="category"
                              dataKey="label"
                              width={84}
                              stroke="#9ca3af"
                              fontSize={11}
                              tickLine={false}
                              axisLine={false}
                            />
                            <Tooltip
                              content={
                                <AnalyticsTooltip
                                  valueFormatter={(value) =>
                                    Number(value).toLocaleString()
                                  }
                                />
                              }
                            />
                            <Bar
                              dataKey="successes"
                              name="Successes"
                              stackId="authOutcome"
                              fill="url(#authOutcomeSuccessFill)"
                              radius={[0, 6, 6, 0]}
                            />
                            <Bar
                              dataKey="failures"
                              name="Failures"
                              stackId="authOutcome"
                              fill="url(#authOutcomeFailureFill)"
                              radius={[0, 6, 6, 0]}
                            />
                            <Bar
                              dataKey="unfinished"
                              name="Unfinished"
                              stackId="authOutcome"
                              fill="#475569"
                              radius={[0, 6, 6, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex h-full items-center justify-center rounded-[1.6rem] border border-dashed border-white/10 bg-black/20 p-5 text-sm text-gray-500">
                          No auth attempts were tracked in this range yet.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <MetricCard
                        label="Attempts"
                        value={formatCompactNumber(authOutcomeTotals.attempts)}
                        hint={`${authOutcomeTotals.unfinished.toLocaleString()} unfinished in range`}
                        icon={Users}
                      />
                      <MetricCard
                        label="Success Rate"
                        value={formatPercent(authOutcomeTotals.successRate)}
                        hint={`${authOutcomeTotals.successes.toLocaleString()} successful completions`}
                        icon={Sparkles}
                      />
                      <MetricCard
                        label="Failures"
                        value={formatCompactNumber(authOutcomeTotals.failures)}
                        hint="Tracked failed auth outcomes"
                        icon={AlertTriangle}
                      />
                      <MetricCard
                        label="Avg Finish"
                        value={formatDuration(
                          authOutcomeTotals.weightedAvgDurationMs / 1000,
                        )}
                        hint="Weighted by successful completions"
                        icon={Clock3}
                      />
                    </div>

                    <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                            Method detail
                          </p>
                          <p className="mt-1 text-sm text-gray-400">
                            Every auth method stays visible even when the range
                            contains failures but no successful finishes.
                          </p>
                        </div>
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-300">
                          {authOutcomeChartItems.length} methods
                        </span>
                      </div>

                      <div className="space-y-3">
                        {authOutcomeHasData ? (
                          authOutcomeChartItems.map((item: any) => {
                            const unfinishedShare =
                              item.attempts > 0
                                ? item.unfinished / Math.max(1, item.attempts)
                                : 0;
                            const successShare =
                              item.attempts > 0
                                ? item.successes / Math.max(1, item.attempts)
                                : 0;
                            const failureShare =
                              item.attempts > 0
                                ? item.failures / Math.max(1, item.attempts)
                                : 0;

                            return (
                              <div
                                key={item.method}
                                className="rounded-[1.35rem] border border-white/10 bg-black/25 p-3.5"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-white">
                                      {item.label}
                                    </p>
                                    <p className="mt-1 text-xs text-gray-500">
                                      {item.attempts.toLocaleString()} attempts
                                      tracked
                                    </p>
                                  </div>
                                  <span className="rounded-full border border-brand-purple/25 bg-brand-purple/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-purple">
                                    {formatPercent(item.successRate)}
                                  </span>
                                </div>

                                <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-white/10">
                                  <div
                                    className="h-full bg-brand-purple"
                                    style={{ width: `${successShare * 100}%` }}
                                  />
                                  <div
                                    className="h-full bg-rose-400"
                                    style={{ width: `${failureShare * 100}%` }}
                                  />
                                  <div
                                    className="h-full bg-slate-500"
                                    style={{
                                      width: `${unfinishedShare * 100}%`,
                                    }}
                                  />
                                </div>

                                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-gray-400">
                                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                                    {item.successes.toLocaleString()} success
                                  </span>
                                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                                    {item.failures.toLocaleString()} failed
                                  </span>
                                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                                    {item.unfinished.toLocaleString()}{" "}
                                    unfinished
                                  </span>
                                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                                    {formatDuration(item.avgDurationMs / 1000)}{" "}
                                    avg finish
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="rounded-[1.35rem] border border-dashed border-white/10 bg-black/20 p-5 text-sm text-gray-500">
                            Auth method detail will populate after attempts are
                            tracked for the selected range.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </SectionCard>

              <AdminOnboardingAnalyticsModules
                renderSectionRangeControl={renderSectionRangeControl}
                discrepancies={authOnboardingDiscrepancies}
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
                  />
                  <MetricCard
                    label="Guest Bounce"
                    value={guestBounceRateDisplay}
                    hint={guestBounceHint}
                    icon={AlertTriangle}
                  />
                  <MetricCard
                    label="Guest Engaged"
                    value={guestEngagedRateDisplay}
                    hint={guestEngagedHint}
                    icon={Sparkles}
                  />
                  <MetricCard
                    label="Signed-in Bounce"
                    value={formatPercent(guestBounceIdentifiedRate)}
                    hint={`${(guestBounceUserSemantics?.bounceCount ?? 0).toLocaleString()} bounced signed-in visits`}
                    icon={Activity}
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
                      No quality analytics data in this range.
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
