import { DataTable } from "@/components/ui/data-table";
import { TableScrollArea } from "@/components/ui/data-table";
import { Surface } from "@/components/ui/content-layout";
import React from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  Activity, FileText, MapPin, Route, Smartphone, Users,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Pie, PieChart, Cell } from "recharts";
import {
  AnalyticsTooltip,
  AnalyticsViewModeToggle,
  MetricCard,
  SectionCard,
  type AnalyticsViewMode,
} from "@/components/Admin/Analytics/AdminAnalyticsPrimitives";
import {
  buildAdminAnalyticsReturnCadenceBuckets,
} from "@/lib/admin-analytics-contracts";
import {
  formatAdminAnalyticsSourceStateLabel,
  formatAdminAnalyticsSourceTruthLabel,
} from "@/lib/analytics/admin-analytics-display-state";
import type { AdminAnalyticsState } from "../hooks/useAdminAnalyticsState";
import {
  buildAudienceRegionChartRows,
  filterAudienceTopPathRows,
  formatAudienceRegionCount,
  formatAudienceRegionLabel,
  type AudienceTopPathFilter,
} from "./AdminAnalyticsAudienceTab.utils";
import { AdminAnalyticsAudienceSnapshotSection } from "./AdminAnalyticsAudienceSnapshotSection";

type AdminAnalyticsAudienceTabProps = Pick<
  AdminAnalyticsState,
  | "renderSectionRangeControl"
  | "historicalLoading"
  | "nowMs"
  | "formatCompactNumber"
  | "formatDuration"
  | "formatPercent"
  | "formatRelativeTime"
  | "historicalOverviewTruthState"
  | "getDeviceIcon"
  | "topPathsRange"
  | "regionsRange"
  | "audienceHistorySeries"
  | "audienceSnapshotModel"
  | "returnCadenceModel"
  | "navigationDestinationsModel"
  | "deviceMixModel"
  | "topPathsModel"
  | "regionsModel"
  | "PIE_COLORS"
>;

export function AdminAnalyticsAudienceTab(props: AdminAnalyticsAudienceTabProps) {
  const {
    renderSectionRangeControl,
    historicalLoading,
    nowMs,
    formatCompactNumber,
    formatDuration,
    formatPercent,
    formatRelativeTime,
    historicalOverviewTruthState,
    getDeviceIcon,
    topPathsRange,
    regionsRange,
    audienceHistorySeries,
    audienceSnapshotModel,
    returnCadenceModel,
    navigationDestinationsModel,
    deviceMixModel,
    topPathsModel,
    regionsModel,
    PIE_COLORS,
  } = props;
  const historicalPanelTruthState = historicalOverviewTruthState ?? (historicalLoading ? "loading" : "unavailable");
  const returnCadenceTruthState = returnCadenceModel.truthState ?? (historicalLoading ? "loading" : "unavailable");
  const noSnapshotLabel = "No verified snapshot yet";
  const noSourceLabel = "No source";
  const noEngagementSampleLabel = "No engagement sample";
  const unknownRegionFallbackLabel = "Unknown location";
  React.useEffect(() => {
    (window as typeof window & {
      __KANDYDROPS_ADMIN_ANALYTICS_AUDIENCE_SNAPSHOT_DEBUG__?: unknown;
    }).__KANDYDROPS_ADMIN_ANALYTICS_AUDIENCE_SNAPSHOT_DEBUG__ =
      audienceSnapshotModel;
  }, [audienceSnapshotModel]);
  const returnCadenceSourceTruthLabel = formatAdminAnalyticsSourceTruthLabel(
    returnCadenceModel.sourceTruth,
  );
  const returnCadenceFreshnessLabel = formatAdminAnalyticsSourceStateLabel(
    returnCadenceModel.freshnessState,
  );
  const returnCadenceBuckets = buildAdminAnalyticsReturnCadenceBuckets(returnCadenceModel);
  const navigationDestinationsSourceLabel =
    navigationDestinationsModel.sourceModeLabel === "Unavailable"
      ? noSourceLabel
      : navigationDestinationsModel.sourceModeLabel;
  const navigationDestinationsSummaryLine = [
    navigationDestinationsModel.fakeZeroPrevented
      ? "No verified events"
      : `${navigationDestinationsModel.totalNavigationEvents.toLocaleString()} events`,
    navigationDestinationsSourceLabel,
  ].join(" | ");
  const deviceMixSourceLabel =
    deviceMixModel.sourceLabel === "Unknown" ? noSourceLabel : deviceMixModel.sourceLabel;
  const deviceMixSessionsSummary =
    deviceMixModel.truthState === "unavailable" || deviceMixModel.sourceTruth === "unknown"
      ? "No verified sessions"
      : `${deviceMixModel.totalSessions.toLocaleString()} sessions`;
  const deviceMixClassifiedSummary =
    deviceMixModel.truthState === "unavailable" || deviceMixModel.sourceTruth === "unknown"
      ? "No classified sample"
      : `${deviceMixModel.classifiedSessions.toLocaleString()} classified`;
  const deviceMixSummaryLine = [
    deviceMixSessionsSummary,
    deviceMixClassifiedSummary,
    `source ${deviceMixSourceLabel}`,
  ].join(" | ");
  const [topPathsSearch, setTopPathsSearch] = React.useState("");
  const [topPathsFilter, setTopPathsFilter] = React.useState<AudienceTopPathFilter>("all");
  const [topPathsPage, setTopPathsPage] = React.useState(1);
  const [topPathsPageSize, setTopPathsPageSize] = React.useState(10);
  const [returnCadenceViewMode, setReturnCadenceViewMode] = React.useState<AnalyticsViewMode>("cards");
  const [deviceMixViewMode, setDeviceMixViewMode] = React.useState<AnalyticsViewMode>("cards");
  const [navigationDestinationsViewMode, setNavigationDestinationsViewMode] = React.useState<AnalyticsViewMode>("cards");
  const [topPathsViewMode, setTopPathsViewMode] = React.useState<AnalyticsViewMode>("cards");
  const [regionsViewMode, setRegionsViewMode] = React.useState<AnalyticsViewMode>("cards");
  const filteredTopPathRows = React.useMemo(
    () => filterAudienceTopPathRows(topPathsModel.rows, topPathsSearch, topPathsFilter),
    [topPathsFilter, topPathsModel.rows, topPathsSearch],
  );
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
  const formatRegionLabel = (item: typeof regionsModel.rows[number]) =>
    formatAudienceRegionLabel(item, unknownRegionFallbackLabel);
  const formatRegionCount = (count: number) => formatAudienceRegionCount(count, regionsModel.countUnit);
  const regionPrimaryMetricLabel = regionsFilterMode === "raw"
    ? "Raw traffic"
    : "Adjusted external";
  const regionChartRows = React.useMemo(
    () => buildAudienceRegionChartRows(regionRowsForDisplay),
    [regionRowsForDisplay],
  );

  return (
    <>
            <AdminAnalyticsAudienceSnapshotSection
              renderSectionRangeControl={renderSectionRangeControl}
              audienceSnapshotModel={audienceSnapshotModel}
              audienceHistorySeries={audienceHistorySeries}
              nowMs={nowMs}
              formatCompactNumber={formatCompactNumber}
              formatDuration={formatDuration}
              formatPercent={formatPercent}
              formatRelativeTime={formatRelativeTime}
              noSnapshotLabel={noSnapshotLabel}
            />
            <div className="grid min-w-0 gap-4">
              <SectionCard
              title="Return Cadence"
              subtitle="Authenticated users grouped by distinct return days in the selected range."
              icon={Route}
                rightSlot={(
                  <div className="flex flex-wrap items-center justify-end gap-2 min-w-0 max-w-full">
                    <AnalyticsViewModeToggle
                      value={returnCadenceViewMode}
                      onChange={setReturnCadenceViewMode}
                      options={[
                        { id: "cards", label: "Cards" },
                        { id: "chart", label: "Chart" },
                        { id: "table", label: "Table" },
                      ]}
                    />
                    {renderSectionRangeControl("returnCadence")}
                  </div>
                )}
            >
                <div
                  className="border-b border-border mb-3 space-y-2 px-3 py-2 text-xs leading-5 text-muted-foreground"
                  data-return-cadence-source-truth={returnCadenceModel.sourceTruth}
                  data-return-cadence-freshness={returnCadenceModel.freshnessState}
                  data-return-cadence-range={returnCadenceModel.range}
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
                  <p className="text-muted-foreground">
                    Source: {returnCadenceModel.sourceLabel}
                    {" | "}Freshness: {returnCadenceFreshnessLabel}
                    {" | "}Range: {returnCadenceModel.range}
                  </p>
                  <p className="text-muted-foreground">
                    Generated: {returnCadenceModel.generatedAtUtc === new Date(0).toISOString()
                      ? noSnapshotLabel
                      : formatRelativeTime(Date.parse(returnCadenceModel.generatedAtUtc), nowMs)}
                  </p>
                </div>
                <div
                  className="space-y-3"
                  data-admin-analytics-mobile-view-mode={returnCadenceViewMode}
                  data-return-cadence-source-truth={returnCadenceModel.sourceTruth}
                  data-return-cadence-freshness={returnCadenceModel.freshnessState}
                  data-return-cadence-range={returnCadenceModel.range}
                  data-return-cadence-generated-at-utc={returnCadenceModel.generatedAtUtc}
                >
                  {returnCadenceViewMode === "chart" ? (
                    <Surface
                      className="rounded-2xl bg-card h-56 w-full p-3"
                      data-return-cadence-chart="compact"
                    >
                      {returnCadenceModel.fakeZeroPrevented ? (
                        <div className="border-b border-border flex h-full items-center justify-center px-3 text-center text-xs text-muted-foreground">
                          No return cadence source yet; missing data is not shown as zero.
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={returnCadenceModel.chartSegments}
                            margin={{ top: 8, right: 0, left: -18, bottom: 0 }}
                          >
                            <CartesianGrid
                              stroke="var(--border)"
                              vertical={false}
                            />
                            <XAxis
                              dataKey="label"
                              stroke="var(--muted-foreground)"
                              fontSize={11}
                              tickLine={false}
                              axisLine={false}
                            />
                            <YAxis
                              stroke="var(--muted-foreground)"
                              fontSize={11}
                              tickLine={false}
                              axisLine={false}
                            />
                            <Tooltip content={<AnalyticsTooltip />} />
                            <Bar
                              dataKey="users"
                              name="Users"
                              fill="var(--primary)"
                              radius={[10, 10, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </Surface>
                  ) : null}

                  {returnCadenceViewMode === "table" ? (
                    <TableScrollArea
                      className="rounded-2xl bg-card overflow-x-auto"
                      data-return-cadence-table="compact"
                      data-return-cadence-source-truth={returnCadenceModel.sourceTruth}
                      data-return-cadence-freshness={returnCadenceModel.freshnessState}
                      data-return-cadence-range={returnCadenceModel.range}
                    >
                      <DataTable className="min-w-full text-left text-xs">
                        <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                          <tr>
                            <th className="px-3 py-2 font-semibold">Cadence</th>
                            <th className="px-3 py-2 font-semibold">Users</th>
                            <th className="px-3 py-2 font-semibold">Share</th>
                            <th className="px-3 py-2 font-semibold">Source</th>
                            <th className="px-3 py-2 font-semibold">Freshness</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border text-muted-foreground">
                          {returnCadenceBuckets.map((bucket) => (
                            <tr key={`return-cadence-table-${bucket.label}`}>
                              <td className="px-3 py-2 font-semibold text-foreground">{bucket.label}</td>
                              <td className="px-3 py-2">{bucket.countDisplay ?? formatCompactNumber(bucket.count)}</td>
                              <td className="px-3 py-2">{bucket.percentDisplay ?? formatPercent(bucket.pct)}</td>
                              <td className="px-3 py-2" title={returnCadenceModel.sourceTruth}>
                                {returnCadenceSourceTruthLabel}
                              </td>
                              <td className="px-3 py-2" title={returnCadenceModel.freshnessState}>
                                {returnCadenceFreshnessLabel}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </DataTable>
                    </TableScrollArea>
                  ) : null}

                  {returnCadenceViewMode === "cards" ? (
                    <>
                      <div className="grid gap-2 min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
                        {returnCadenceBuckets.map((bucket) => {
                          return (
                            <div
                              key={bucket.label}
                              className="border-b border-border px-3 py-2 text-xs leading-5 text-muted-foreground"
                            >
                              <p className="font-semibold text-foreground">{bucket.label}</p>
                              <p>{bucket.countDisplay ?? formatCompactNumber(bucket.count)}</p>
                              <p className="text-muted-foreground">
                                {bucket.percentDisplay ?? formatPercent(bucket.pct)}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {returnCadenceModel.denominatorExplanation}
                      </p>
                      <div className="grid gap-3 border-t border-border pt-3 min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
                        <MetricCard
                          label="Tracked Auth Users"
                          value={
                            returnCadenceModel.fakeZeroPrevented
                              ? noSourceLabel
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
                            ? noSourceLabel
                            : formatCompactNumber(returnCadenceModel.uniqueReturners)}
                          hint={returnCadenceModel.sourceTruth === "missing"
                            ? "No return cadence source"
                            : "Users active on 2+ distinct days"}
                          icon={Users}
                          truthState={returnCadenceTruthState}
                          dictionaryTooltip="Count of authenticated users active on two or more distinct days within the selected time window."
                        />
                        <MetricCard
                          label="Conversion"
                          value={returnCadenceModel.fakeZeroPrevented
                            ? noSourceLabel
                            : formatPercent(returnCadenceModel.conversionPct)}
                          hint={returnCadenceModel.sourceTruth === "missing"
                            ? "No tracked user source"
                            : `${returnCadenceModel.trackedAuthenticatedUsers.toLocaleString()} tracked authenticated users`}
                          icon={Activity}
                          truthState={returnCadenceTruthState}
                          dictionaryTooltip="The percentage of tracked authenticated users in this window who were active on multiple distinct days."
                        />
                      </div>
                    </>
                  ) : null}
                </div>
              </SectionCard>

              <SectionCard
                title="Navigation Destinations"
                subtitle="Top in-app destinations reached from intentional navigation telemetry."
                icon={Route}
                density="compact"
                summaryLine={navigationDestinationsSummaryLine}
                rightSlot={(
                  <div className="flex flex-wrap items-center justify-end gap-2 min-w-0 max-w-full">
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
                  className="border-b border-border mb-3 space-y-2 px-3 py-2 text-xs leading-5 text-muted-foreground"
                  data-navigation-source-mode={navigationDestinationsModel.sourceMode}
                  data-navigation-total-events={String(navigationDestinationsModel.totalNavigationEvents)}
                  data-navigation-explicit-taps={String(navigationDestinationsModel.explicitTapCount)}
                  data-navigation-fallback-views={String(navigationDestinationsModel.fallbackViewCount)}
                  data-navigation-generated-at-utc={navigationDestinationsModel.generatedAtUtc}
                >
                  {navigationDestinationsModel.visibleCopy.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                  <p className="text-muted-foreground">
                    Source mode: {navigationDestinationsModel.sourceModeLabel}
                    {" | "}Total: {navigationDestinationsModel.totalNavigationEvents.toLocaleString()}
                    {" | "}Explicit taps: {navigationDestinationsModel.explicitTapCount.toLocaleString()}
                    {" | "}Fallback views: {navigationDestinationsModel.fallbackViewCount.toLocaleString()}
                  </p>
                  <p className="text-muted-foreground">
                    Range: {navigationDestinationsModel.range}
                    {" | "}Last updated: {navigationDestinationsModel.generatedAtUtc === new Date(0).toISOString()
                      ? noSnapshotLabel
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
                  <Surface className="rounded-2xl bg-card h-56 w-full p-3">
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
                  </Surface>
                  ) : null}

                  {navigationDestinationsModel.destinations.length > 0 && navigationDestinationsViewMode === "table" ? (
                    <TableScrollArea
                      className="rounded-2xl bg-card overflow-x-auto"
                      data-navigation-destinations-table="compact"
                      data-navigation-destinations-range={navigationDestinationsModel.range}
                      data-navigation-destinations-source-mode={navigationDestinationsModel.sourceMode}
                    >
                      <DataTable className="min-w-full text-left text-xs">
                        <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                          <tr>
                            <th className="px-3 py-2 font-semibold">Destination</th>
                            <th className="px-3 py-2 font-semibold">Events</th>
                            <th className="px-3 py-2 font-semibold">Source</th>
                            <th className="px-3 py-2 font-semibold">Freshness</th>
                            <th className="px-3 py-2 font-semibold">Last seen</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border text-muted-foreground">
                          {navigationDestinationsModel.destinations.slice(0, 8).map((item) => (
                            <tr key={`navigation-destinations-table-${item.destinationPath}`}>
                              <td className="max-w-[16rem] px-3 py-2">
                                <div className="min-w-0 whitespace-normal wrap-anywhere font-semibold text-foreground">{item.destinationLabel}</div>
                                <div className="min-w-0 whitespace-normal wrap-anywhere text-xs text-muted-foreground">{item.destinationPath}</div>
                              </td>
                              <td className="px-3 py-2 font-semibold text-primary">{item.count.toLocaleString()}</td>
                              <td className="px-3 py-2" title={item.sourceTruth}>
                                {formatAdminAnalyticsSourceTruthLabel(item.sourceTruth)}
                              </td>
                              <td className="px-3 py-2" title={item.freshnessState}>
                                {formatAdminAnalyticsSourceStateLabel(item.freshnessState)}
                              </td>
                              <td className="px-3 py-2">
                                {item.lastSeenAtUtc
                                  ? formatRelativeTime(Date.parse(item.lastSeenAtUtc), nowMs)
                                  : noSnapshotLabel}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </DataTable>
                    </TableScrollArea>
                  ) : null}

                  {navigationDestinationsViewMode === "cards" ? (
                    <>
                      {navigationDestinationsModel.destinations.length > 0 ? (
                        navigationDestinationsModel.destinations
                          .slice(0, 6)
                          .map((item, index) => (
                          <div
                            key={item.destinationPath}
                            className="border-b border-border p-3"
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
                                <p className="text-sm font-semibold text-foreground">
                                  {item.destinationLabel}
                                </p>
                              </div>
                              <span className="text-sm font-semibold text-primary">
                                {item.count.toLocaleString()}
                              </span>
                            </div>
                            <p className="mb-1 text-xs text-muted-foreground">
                              {item.destinationPath}
                            </p>
                            <p className="mb-2 text-xs text-muted-foreground">
                              <span title={item.sourceTruth}>
                                Source: {formatAdminAnalyticsSourceTruthLabel(item.sourceTruth)}
                              </span>
                              {" | "}Freshness: {formatAdminAnalyticsSourceStateLabel(item.freshnessState)}
                              {" | "}Last seen: {item.lastSeenAtUtc
                                ? formatRelativeTime(Date.parse(item.lastSeenAtUtc), nowMs)
                                : noSnapshotLabel}
                            </p>
                            <p className="mb-2 text-xs text-muted-foreground">
                              Top source events: {item.topSourceEvents.join(", ")}
                            </p>
                            <p className="mb-3 text-xs text-muted-foreground">
                              {item.explanation}
                            </p>
                            <div className="h-2 overflow-hidden rounded-full bg-secondary">
                              <Surface
                                className="h-full rounded-full bg-card from-brand-purple"
                                style={{
                                  width: `${Math.max(8, (item.count / Math.max(1, navigationDestinationsModel.destinations[0]?.count || 1)) * 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                          ))
                      ) : (
                        <div className="border-b border-border p-5 text-sm text-muted-foreground">
                          {navigationDestinationsModel.missingReason
                            ?? "No navigation tap or destination-view events found in this range."}
                          <p className="mt-2 text-xs text-muted-foreground">
                            {navigationDestinationsModel.expectedEventsLabel}
                          </p>
                        </div>
                      )}
                    </>
                  ) : navigationDestinationsModel.destinations.length === 0 ? (
                    <div className="border-b border-border p-5 text-sm text-muted-foreground">
                      {navigationDestinationsModel.missingReason
                        ?? "No navigation tap or destination-view events found in this range."}
                      <p className="mt-2 text-xs text-muted-foreground">
                        {navigationDestinationsModel.expectedEventsLabel}
                      </p>
                    </div>
                  ) : null}
                </div>
              </SectionCard>
            </div>

            <div className="grid min-w-0 gap-4">
              <SectionCard
                title="Device Mix"
                subtitle="Compact device intelligence with source-backed mobile context."
                icon={Smartphone}
                density="compact"
                summaryLine={deviceMixSummaryLine}
                rightSlot={(
                  <div className="flex flex-wrap items-center justify-end gap-2 min-w-0 max-w-full">
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
                  className="border-b border-border mb-3 space-y-2 px-3 py-2 text-xs leading-5 text-muted-foreground"
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
                  <p className="text-muted-foreground">
                    Range: {deviceMixModel.range}
                    {" | "}Source: {deviceMixModel.sourceLabel}
                    {" | "}Freshness: {deviceMixModel.freshnessLabel}
                  </p>
                  <p className="text-muted-foreground">
                    Total sessions: {deviceMixModel.totalSessions.toLocaleString()}
                    {" | "}Classified: {deviceMixModel.classifiedSessions.toLocaleString()}
                    {" | "}Unknown: {deviceMixModel.unknownSessions.toLocaleString()}
                  </p>
                  <p className="text-muted-foreground">
                    Generated: {deviceMixModel.generatedAtUtc === new Date(0).toISOString()
                      ? noSnapshotLabel
                      : formatRelativeTime(Date.parse(deviceMixModel.generatedAtUtc), nowMs)}
                    {" | "}Engagement: {deviceMixModel.engagementDefinition}
                  </p>
                </div>
                <div className="mb-3 grid gap-2 min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
                  {deviceMixModel.designImplications.map((item) => (
                    <div
                      key={item}
                      className="border-b border-border px-3 py-2 text-xs leading-5 text-muted-foreground"
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
                    <div className="border-b border-border p-3">
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
                      <div className="mt-3 grid gap-2 text-xs text-muted-foreground min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
                        {deviceMixModel.rows.map((item, index) => (
                          <div key={`legend-${item.deviceCategory}`} className="border-b border-border flex items-center justify-between gap-2 px-3 py-2">
                            <span className="flex min-w-0 items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                              />
                              <span className="min-w-0 whitespace-normal wrap-anywhere capitalize">{item.deviceCategory}</span>
                            </span>
                            <span className="font-semibold text-foreground">{formatPercent(item.sessionSharePct)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {deviceMixModel.rows.length > 0 && deviceMixViewMode === "table" ? (
                    <div className="border-b border-border overflow-hidden">
                      <div className="hidden gap-2 border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground @3xl:grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
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
                            className="grid gap-2 px-3 py-2 text-xs text-muted-foreground min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]"
                          >
                            <p className="font-semibold capitalize text-foreground">{item.deviceCategory}</p>
                            <p><span className="text-muted-foreground @3xl:hidden">Sessions: </span>{item.sessions.toLocaleString()}</p>
                            <p><span className="text-muted-foreground @3xl:hidden">Share: </span>{formatPercent(item.sessionSharePct)}</p>
                            <p><span className="text-muted-foreground @3xl:hidden">Engaged: </span>{item.engagedSessions === null ? noEngagementSampleLabel : item.engagedSessions.toLocaleString()}</p>
                            <p className="min-w-0 whitespace-normal wrap-anywhere" title={item.sourceTruth}>
                              <span className="text-muted-foreground @3xl:hidden">Truth: </span>
                              {formatAdminAnalyticsSourceTruthLabel(item.sourceTruth)}
                            </p>
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
                          className="border-b border-border p-3"
                        >
                          <div className="mb-2 flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-primary">
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold capitalize text-foreground">
                                  {item.deviceCategory}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {item.sessions.toLocaleString()} sessions
                                  {" | "}
                                  <span title={item.sourceTruth}>
                                    Source: {formatAdminAnalyticsSourceTruthLabel(item.sourceTruth)}
                                  </span>
                                  {" | "}Confidence: {item.confidenceState}
                                </p>
                              </div>
                            </div>
                            <div className="text-right text-xs">
                              <p className="text-base font-semibold text-foreground">
                                {formatPercent(item.sessionSharePct)}
                              </p>
                              <p className="text-muted-foreground">
                                {item.engagementRatePct === null
                                  ? noEngagementSampleLabel
                                  : `${formatPercent(item.engagementRatePct)} engaged`}
                              </p>
                            </div>
                          </div>
                          <div className="mb-2 grid gap-2 text-xs text-muted-foreground min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
                            <div className="rounded-xl bg-secondary px-2 py-1.5">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Sessions</p>
                              <p className="mt-0.5 font-semibold text-foreground">{item.sessions.toLocaleString()}</p>
                            </div>
                            <div className="rounded-xl bg-secondary px-2 py-1.5">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Share</p>
                              <p className="mt-0.5 font-semibold text-foreground">{formatPercent(item.sessionSharePct)}</p>
                            </div>
                            <div className="rounded-xl bg-secondary px-2 py-1.5">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Engaged</p>
                              <p className="mt-0.5 font-semibold text-foreground">
                                {item.engagedSessions === null ? noEngagementSampleLabel : item.engagedSessions.toLocaleString()}
                              </p>
                            </div>
                            <div className="rounded-xl bg-secondary px-2 py-1.5">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Commerce / watch</p>
                              <p className="mt-0.5 font-semibold text-foreground">
                                {deviceMixModel.commerceByDeviceAvailable || deviceMixModel.watchByDeviceAvailable
                                  ? "Available"
                                  : "No per-device source"}
                              </p>
                            </div>
                          </div>
                          <p className="mb-2 text-xs text-muted-foreground">
                            {item.recommendation}
                          </p>
                          <div className="h-2 overflow-hidden rounded-full bg-secondary">
                            <Surface
                              className="h-full rounded-full bg-card from-brand-purple"
                              style={{ width: `${Math.max(8, item.sessionSharePct * 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : null}

                  {deviceMixModel.rows.length === 0 ? (
                    <div className="border-b border-border p-5 text-sm text-muted-foreground">
                      Device data will appear after site analytics has enough sessions for
                      this range.
                    </div>
                  ) : null}
                </div>
                <div className="border-b border-border mt-3 px-3 py-2 text-xs leading-5 text-muted-foreground">
                  <p className="font-semibold text-foreground">Optional device metrics</p>
                  <p>
                    Purchase rate, unwrap rate, bounce rate, average session length, and watch time by device are unavailable until a canonical per-device source is connected.
                  </p>
                </div>
              </SectionCard>

              <SectionCard
                title="Top Paths"
                subtitle="Paginated path analytics with source-backed engagement context."
                icon={FileText}
                rightSlot={(
                  <div className="flex flex-wrap items-center justify-end gap-2 min-w-0 max-w-full">
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
                  className="border-b border-border mb-3 space-y-2 px-3 py-2 text-xs leading-5 text-muted-foreground"
                  data-top-paths-source-truth={topPathsModel.sourceTruth}
                  data-top-paths-range={topPathsModel.range}
                  data-top-paths-total-count={String(topPathsModel.totalPathCount)}
                  data-top-paths-page={String(topPathsPage)}
                  data-top-paths-page-size={String(topPathsPageSize)}
                >
                  {topPathsModel.visibleCopy.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                  <p className="text-muted-foreground">
                    Range: {topPathsModel.range}
                    {" | "}Source: {topPathsModel.sourceLabel}
                    {" | "}Freshness: {topPathsModel.freshnessLabel}
                  </p>
                  <p className="text-muted-foreground">
                    Total views: {topPathsModel.totalViews.toLocaleString()}
                    {" | "}Paths in snapshot: {topPathsModel.totalPathCount.toLocaleString()}
                    {" | "}Page {topPathsPage} of {topPathsTotalPages}
                  </p>
                  <p className="text-muted-foreground">
                    Generated: {topPathsModel.generatedAtUtc === new Date(0).toISOString()
                      ? noSnapshotLabel
                      : formatRelativeTime(Date.parse(topPathsModel.generatedAtUtc), nowMs)}
                    {" | "}Percent column: Engagement
                  </p>
                </div>
                <div className="mb-3 grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))] gap-3">
                  <label className="rounded-2xl border border-border bg-background/25 px-3 py-2 text-xs text-muted-foreground">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Search path
                    </span>
                    <Input
                      value={topPathsSearch}
                      onChange={(event) => setTopPathsSearch(event.target.value)}
                      placeholder="/drops"
                      className="min-w-0 max-w-full"
                    />
                  </label>
                  <label className="rounded-2xl border border-border bg-background/25 px-3 py-2 text-xs text-muted-foreground">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Filter
                    </span>
                    <NativeSelect
                      value={topPathsFilter}
                      onChange={(event) => setTopPathsFilter(event.target.value as typeof topPathsFilter)}
                      className="min-w-0 max-w-full"
                    >
                      {topPathsModel.availableFilterKeys.map((item) => (
                        <NativeSelectOption key={item.value} value={item.value} >
                          {item.label}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </label>
                  <label className="rounded-2xl border border-border bg-background/25 px-3 py-2 text-xs text-muted-foreground">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Page size
                    </span>
                    <NativeSelect
                      value={topPathsPageSize}
                      onChange={(event) => setTopPathsPageSize(Number(event.target.value))}
                      className="min-w-0 max-w-full"
                    >
                      {[10, 25, 50].map((size) => (
                        <NativeSelectOption key={size} value={size} >
                          {size}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </label>
                  <div className="border-b border-border px-3 py-2 text-xs text-muted-foreground">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Snapshot scope
                    </span>
                    <p className="text-sm text-foreground">
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
                    <Surface className="rounded-2xl bg-card h-56 p-3">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={pagedTopPathRows}
                          margin={{ top: 4, right: 0, left: -22, bottom: 0 }}
                        >
                          <CartesianGrid stroke="var(--border)" vertical={false} />
                          <XAxis
                            dataKey="label"
                            stroke="var(--muted-foreground)"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            interval={0}
                            angle={-18}
                            textAnchor="end"
                            height={52}
                          />
                          <YAxis
                            stroke="var(--muted-foreground)"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                          />
                          <Tooltip content={<AnalyticsTooltip />} />
                          <Bar dataKey="views" name="Views" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="engagementRatePct" name="Engagement" fill="var(--info)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </Surface>
                  ) : null}

                  {pagedTopPathRows.length > 0 && topPathsViewMode === "table" ? (
                    <TableScrollArea
                      className="rounded-2xl bg-card overflow-x-auto"
                      data-top-paths-table="compact"
                      data-top-paths-source-truth={topPathsModel.sourceTruth}
                      data-top-paths-page={String(topPathsPage)}
                      data-top-paths-page-size={String(topPathsPageSize)}
                    >
                      <DataTable className="min-w-full text-left text-xs">
                        <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                          <tr>
                            <th className="px-3 py-2 font-semibold">Path</th>
                            <th className="px-3 py-2 font-semibold">Group</th>
                            <th className="px-3 py-2 font-semibold">Views</th>
                            <th className="px-3 py-2 font-semibold">Share</th>
                            <th className="px-3 py-2 font-semibold">Avg time</th>
                            <th className="px-3 py-2 font-semibold">Engagement</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border text-muted-foreground">
                          {pagedTopPathRows.map((row) => (
                            <tr
                              key={`top-path-table-${row.path}`}
                              data-top-paths-path={row.path}
                              data-top-paths-route-group={row.routeGroup}
                              data-top-paths-views={String(row.views)}
                              data-top-paths-issue-state={row.issueState}
                            >
                              <td className="max-w-[18rem] px-3 py-2">
                                <p className="min-w-0 whitespace-normal wrap-anywhere font-semibold text-foreground">{row.path}</p>
                                <p className="min-w-0 whitespace-normal wrap-anywhere text-xs text-muted-foreground">{row.label}</p>
                              </td>
                              <td className="px-3 py-2">{row.routeGroup}</td>
                              <td className="px-3 py-2">{row.views.toLocaleString()}</td>
                              <td className="px-3 py-2">{formatPercent(row.viewSharePct)}</td>
                              <td className="px-3 py-2">{row.avgTimeDisplay}</td>
                              <td className="px-3 py-2">{row.engagementRatePct === null ? noEngagementSampleLabel : formatPercent(row.engagementRatePct)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </DataTable>
                    </TableScrollArea>
                  ) : null}

                  {topPathsViewMode === "cards" ? (
                    <>
                      <div className="border-b border-border hidden grid-cols-[minmax(0,2.2fr)_0.9fr_0.9fr_0.9fr_0.9fr_0.8fr] gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground @3xl:grid">
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
                        className="border-b border-border p-4"
                        data-top-paths-path={row.path}
                        data-top-paths-route-group={row.routeGroup}
                        data-top-paths-views={String(row.views)}
                        data-top-paths-avg-time={row.avgTimeDisplay}
                        data-top-paths-engagement-rate={row.engagementRatePct === null ? "unavailable" : String(row.engagementRatePct)}
                        data-top-paths-issue-state={row.issueState}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="min-w-0 whitespace-normal wrap-anywhere text-sm font-semibold text-foreground">
                              {row.path}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {row.label}
                              {" | "}
                              <span title={row.sourceTruth}>
                                Source: {formatAdminAnalyticsSourceTruthLabel(row.sourceTruth)}
                              </span>
                              {" | "}Confidence: {row.confidenceState}
                            </p>
                          </div>
                          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                            row.issueState === "warning"
                              ? "bg-warning/15 text-warning"
                              : row.issueState === "review"
                                ? "bg-secondary text-foreground"
                                : "bg-success/15 text-success"
                          }`}>
                            {row.issueState}
                          </span>
                        </div>
                        <div className="mt-2 grid gap-2 text-xs text-muted-foreground @3xl:grid-cols-[minmax(0,2.2fr)_0.9fr_0.9fr_0.9fr_0.9fr_0.8fr] min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
                          <div className="@3xl:hidden" />
                          <p><span className="text-muted-foreground">Group:</span> {row.routeGroup}</p>
                          <p><span className="text-muted-foreground">Views:</span> {row.views.toLocaleString()}</p>
                          <p><span className="text-muted-foreground">Share:</span> {formatPercent(row.viewSharePct)}</p>
                          <p><span className="text-muted-foreground">Avg time:</span> {row.avgTimeDisplay}</p>
                          <p><span className="text-muted-foreground">Engagement:</span> {row.engagementRatePct === null ? noEngagementSampleLabel : formatPercent(row.engagementRatePct)}</p>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {row.explanation}
                        </p>
                      </div>
                    ))
                      ) : (
                    <div className="border-b border-border p-5 text-sm text-muted-foreground">
                      {topPathsModel.rows.length > 0
                        ? "No paths match the current search/filter selection."
                        : "No page-path data available for this range."}
                    </div>
                      )}
                    </>
                  ) : pagedTopPathRows.length === 0 ? (
                    <div className="border-b border-border p-5 text-sm text-muted-foreground">
                      {topPathsModel.rows.length > 0
                        ? "No paths match the current search/filter selection."
                        : "No page-path data available for this range."}
                    </div>
                  ) : null}
                </div>
                <div className="border-b border-border mt-3 flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs text-muted-foreground min-w-0 max-w-full">
                  <p>
                    Showing {pagedTopPathRows.length === 0 ? 0 : ((topPathsPage - 1) * topPathsPageSize) + 1}
                    {pagedTopPathRows.length === 0 ? "" : `-${((topPathsPage - 1) * topPathsPageSize) + pagedTopPathRows.length}`}
                    {" of "}{filteredTopPathRows.length.toLocaleString()} filtered paths
                  </p>
                  <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      onClick={() => setTopPathsPage((current) => Math.max(1, current - 1))}
                      disabled={topPathsPage <= 1}
                      variant="outline" size="sm" className="max-w-full wrap-anywhere"
                    >
                      Prev
                    </Button>
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Page {topPathsPage}
                    </span>
                    <Button
                      type="button"
                      onClick={() => setTopPathsPage((current) => Math.min(topPathsTotalPages, current + 1))}
                      disabled={!topPathsHasNextPage}
                      variant="outline" size="sm" className="max-w-full wrap-anywhere"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </SectionCard>
            </div>

            <SectionCard
              title="Regions"
              icon={MapPin}
              rightSlot={(
                <div className="flex flex-wrap items-center justify-end gap-2 min-w-0 max-w-full">
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
                <div className="border-b border-border space-y-2 px-3 py-2 text-xs leading-5 text-muted-foreground">
                  {regionsModel.visibleCopy.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                  <p className="text-muted-foreground">
                    Range: {regionsModel.range}
                    {" | "}Source: {regionsModel.sourceLabel}
                    {" | "}Freshness: {regionsModel.freshnessLabel}
                  </p>
                  <p className="text-muted-foreground">
                    Unit: {regionsModel.countUnit}
                    {" | "}Raw total: {formatRegionCount(regionsModel.rawTotal)}
                    {" | "}Adjusted total: {formatRegionCount(regionsModel.adjustedTotal)}
                  </p>
                  <p className="text-muted-foreground">
                    Internal/admin: {formatRegionCount(regionsModel.internalExcludedCount)}
                    {" | "}Generated: {regionsModel.generatedAtUtc === new Date(0).toISOString()
                      ? noSnapshotLabel
                      : formatRelativeTime(Date.parse(regionsModel.generatedAtUtc), nowMs)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 min-w-0 max-w-full">
                  {[
                    { value: "comparison", label: "Compare raw vs adjusted" },
                    { value: "raw", label: "Raw traffic" },
                    { value: "external_only", label: "External demand" },
                    { value: "admin_excluded", label: "Admin/internal excluded" },
                  ].map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      onClick={() => setRegionsFilterMode(option.value as typeof regionsFilterMode)}
                      variant={regionsFilterMode === option.value ? "glass" : "outline"} aria-pressed={regionsFilterMode === option.value} size="sm" className="max-w-full wrap-anywhere"
                    >
                      {option.label}
                    </Button>
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
                    <Surface className="rounded-2xl bg-card h-56 p-3">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={regionChartRows}
                          margin={{ top: 4, right: 0, left: -22, bottom: 0 }}
                        >
                          <CartesianGrid stroke="var(--border)" vertical={false} />
                          <XAxis
                            dataKey="chartLabel"
                            stroke="var(--muted-foreground)"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            interval={0}
                            angle={-18}
                            textAnchor="end"
                            height={52}
                          />
                          <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                          <Tooltip content={<AnalyticsTooltip />} />
                          <Bar dataKey="rawCount" name="Raw traffic" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="adjustedCount" name="External demand" fill="var(--info)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </Surface>
                  ) : null}

                  {regionRowsForDisplay.length > 0 && regionsViewMode === "table" ? (
                    <TableScrollArea
                      className="rounded-2xl bg-card overflow-x-auto"
                      data-regions-table="compact"
                      data-regions-source-truth={regionsModel.sourceTruth}
                      data-regions-freshness={regionsModel.freshnessState}
                      data-regions-filter-mode={regionsFilterMode}
                    >
                      <DataTable className="min-w-full text-left text-xs">
                        <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                          <tr>
                            <th className="px-3 py-2 font-semibold">Region</th>
                            <th className="px-3 py-2 font-semibold">Raw</th>
                            <th className="px-3 py-2 font-semibold">Adjusted</th>
                            <th className="px-3 py-2 font-semibold">Internal/admin</th>
                            <th className="px-3 py-2 font-semibold">Demand state</th>
                            <th className="px-3 py-2 font-semibold">Share</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border text-muted-foreground">
                          {regionRowsForDisplay.map((item) => (
                            <tr
                              key={`regions-table-${item.country ?? "unknown-country"}-${item.city ?? "unknown-city"}`}
                              data-regions-row-state={item.demandState}
                            >
                              <td className="max-w-[16rem] px-3 py-2">
                                <p className="min-w-0 whitespace-normal wrap-anywhere font-semibold text-foreground">{formatRegionLabel(item)}</p>
                                <p className="min-w-0 whitespace-normal wrap-anywhere text-xs text-muted-foreground">{item.explanation}</p>
                              </td>
                              <td className="px-3 py-2">{formatRegionCount(item.rawCount)}</td>
                              <td className="px-3 py-2">{formatRegionCount(item.adjustedCount)}</td>
                              <td className="px-3 py-2">{formatRegionCount(item.adminInternalCount)}</td>
                              <td className="px-3 py-2">{item.demandState.replace(/_/gu, " ")}</td>
                              <td className="px-3 py-2">{formatPercent(regionsFilterMode === "raw" ? item.sharePct : item.adjustedSharePct)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </DataTable>
                    </TableScrollArea>
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
                              className="border-b border-border p-4"
                              data-regions-row-state={item.demandState}
                            >
                              <div className="mb-2 flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="min-w-0 whitespace-normal wrap-anywhere text-sm font-semibold text-foreground">
                                    {formatRegionLabel(item)}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {regionPrimaryMetricLabel}: {formatRegionCount(primaryCount)}
                                    {" | "}Raw: {formatRegionCount(item.rawCount)}
                                  </p>
                                </div>
                                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                                  item.demandState === "mostly_internal"
                                    ? "bg-warning/15 text-warning"
                                    : item.demandState === "mixed_with_internal" || item.demandState === "review"
                                      ? "bg-secondary text-foreground"
                                      : item.demandState === "unknown_location"
                                        ? "bg-secondary text-foreground"
                                        : "bg-success/15 text-success"
                                }`}>
                                  {item.demandState.replace(/_/gu, " ")}
                                </span>
                              </div>
                              <div className="grid gap-2 text-xs text-muted-foreground min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
                                <p><span className="text-muted-foreground">Adjusted:</span> {formatRegionCount(item.adjustedCount)}</p>
                                <p><span className="text-muted-foreground">Internal/admin:</span> {formatRegionCount(item.adminInternalCount)}</p>
                                <p><span className="text-muted-foreground">Raw share:</span> {formatPercent(item.sharePct)}</p>
                                <p><span className="text-muted-foreground">Adjusted share:</span> {formatPercent(item.adjustedSharePct)}</p>
                              </div>
                              <p className="mt-2 text-xs text-muted-foreground">
                                {item.explanation}
                              </p>
                              <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                                <div
                                  className="h-full rounded-full bg-primary"
                                  style={{
                                    width: `${Math.max(8, barRatio * 100)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="border-b border-border p-5 text-sm text-muted-foreground">
                          {regionsModel.rows.length > 0
                            ? "No region rows match the current filter."
                            : "No region geography source is available for this range."}
                        </div>
                      )}
                    </>
                  ) : regionRowsForDisplay.length === 0 ? (
                    <div className="border-b border-border p-5 text-sm text-muted-foreground">
                      {regionsModel.rows.length > 0
                        ? "No region rows match the current filter."
                        : "No region geography source is available for this range."}
                    </div>
                  ) : null}
                </div>
              </div>
            </SectionCard>
    </>
  );
}
