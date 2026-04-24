import React from "react";
import {
  Activity, Clock3, FileText, MapPin, Route, Smartphone, Sparkles, Users,
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
    validations, getValidationClasses, dataValidationRange,
    
    // Audience Tab
    totalDeviceUsers, mobileUsers, mobileShare, audienceSnapshotRange, semanticQualityCards, guestBounceRate, identifiedBounceRate, guestEngagedRate,
    navigationDestinationsRange, destinationMix,
    deviceMixRange, devices, getDeviceIcon,
    topPathsRange, pages,
    regionsRange, geo,
    audienceTotals, audienceHistorySeries, returnCadenceSegments, returnCadenceSummary, navigationDestinationsMix, deviceMixDevices, deviceMixTotalUsers, topPathsPages, regionsGeo,

    // Commerce Tab
    commerceSnapshotRange, commerce,
    packagePerformanceRange, packagePerformance,
    PIE_COLORS, contentConversionRange, unlockCategoryMix, previewToUnlockRate, checkoutToPurchaseRate,
    topDropConversionRange, topDrops,
    // Added remaining
    clearAllFilters, clearViewerFilter, viewerUserFilter, formatMoney, activeViewerFilter
  } = props;

  return (
    <>
<>
            <SectionCard
              title="Audience Snapshot"
              subtitle="The selected time range emphasizes mobile traffic, retention, and visit depth."
              icon={Users}
              defaultExpanded
              rightSlot={renderSectionRangeControl("audienceSnapshot")}
            >
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <MetricCard
                  label="Active Users"
                  value={formatCompactNumber(audienceTotals.users)}
                  hint={`${audienceTotals.newUsers.toLocaleString()} new users`}
                  icon={Users}
                />
                <MetricCard
                  label="Sessions"
                  value={formatCompactNumber(audienceTotals.sessions)}
                  hint={`${audienceTotals.views.toLocaleString()} views`}
                  icon={Activity}
                />
                <MetricCard
                  label="Avg Session"
                  value={formatDuration(audienceTotals.avgSessionDuration)}
                  hint="Average time per visit"
                  icon={Clock3}
                />
                <MetricCard
                  label="Engagement"
                  value={formatPercent(audienceTotals.engagementRate)}
                  hint="GA engagement rate"
                  icon={Sparkles}
                />
              </div>

              <div className="mt-5 h-64 w-full md:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={audienceHistorySeries}
                    margin={{ top: 8, right: 0, left: -18, bottom: 0 }}
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
                          stopColor="#b28cff"
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="95%"
                          stopColor="#b28cff"
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
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={20}
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
                      name="Users"
                      stroke="#b28cff"
                      strokeWidth={2.5}
                      fill="url(#historyUsersFill)"
                    />
                    <Area
                      type="monotone"
                      dataKey="views"
                      name="Views"
                      stroke="#22d3ee"
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
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={returnCadenceSegments}
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
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/5 pt-4">
                  <MetricCard
                    label="Unique Returners"
                    value={formatCompactNumber(returnCadenceSummary?.uniqueReturners || 0)}
                    hint="Multiple days active"
                    icon={Users}
                  />
                  <MetricCard
                    label="Conversion"
                    value={formatPercent(returnCadenceSummary?.returnerConversionRate || 0)}
                    hint={`${(returnCadenceSummary?.trackedUsers || 0).toLocaleString()} tracked users`}
                    icon={Activity}
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
