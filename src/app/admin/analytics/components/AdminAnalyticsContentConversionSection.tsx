import React from "react";
import { Button } from "@/components/ui/Button";
import { Candy } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  AnalyticsTooltip,
  AnalyticsViewModeToggle,
  SectionCard,
  type AnalyticsViewMode,
} from "@/components/Admin/Analytics/AdminAnalyticsPrimitives";
import { AdminStatusBadge } from "@/components/Admin/AdminStatusBadge";
import { resolveAdminAnalyticsContentConversionRowTruthState } from "@/lib/admin-analytics-contracts";
import type { AdminAnalyticsState } from "../hooks/useAdminAnalyticsState";

type AdminAnalyticsContentConversionSectionProps = Pick<
  AdminAnalyticsState,
  | "renderSectionRangeControl"
  | "contentConversionModel"
  | "formatPercent"
  | "formatDuration"
  | "formatAbsoluteDateTime"
>;

export function AdminAnalyticsContentConversionSection(
  props: AdminAnalyticsContentConversionSectionProps,
) {
  const {
    renderSectionRangeControl,
    contentConversionModel,
    formatPercent,
    formatDuration,
    formatAbsoluteDateTime,
  } = props;
  const [contentConversionGrouping, setContentConversionGrouping] = React.useState<"contentType" | "flavor" | "creator" | "priceBand">("contentType");
  const [contentConversionViewMode, setContentConversionViewMode] = React.useState<AnalyticsViewMode>("cards");
  const noRateSampleLabel = "No rate sample";
  const noWatchSampleLabel = "No watch sample";
  const contentConversionRows = contentConversionModel.rowsByDimension[contentConversionGrouping] ?? [];
  const contentConversionVisibleRows = contentConversionRows.slice(0, 8);
  const contentConversionChartRows = contentConversionVisibleRows.map((row) => ({
    ...row,
    chartLabel:
      row.groupLabel && row.groupLabel.length > 14
        ? `${row.groupLabel.slice(0, 14)}...`
        : row.groupLabel || row.groupKey,
  }));

  return (
    <SectionCard
      title="Content Conversion"
      subtitle="Which content types get previews and unwraps."
      icon={Candy}
      rightSlot={(
        <div className="flex flex-wrap items-center justify-end gap-2 min-w-0 max-w-full">
          <AnalyticsViewModeToggle
            value={contentConversionViewMode}
            onChange={setContentConversionViewMode}
            options={[
              { id: "cards", label: "Cards" },
              { id: "chart", label: "Chart" },
              { id: "table", label: "Table" },
            ]}
          />
          {renderSectionRangeControl("contentConversion")}
        </div>
      )}
    >
      <div
        className="space-y-3"
        data-admin-analytics-mobile-view-mode={contentConversionViewMode}
        data-content-conversion-source-truth={contentConversionModel.sourceTruth}
        data-content-conversion-source-state={contentConversionModel.sourceState}
        data-content-conversion-generated-at-utc={contentConversionModel.generatedAtUtc}
      >
        <div className="border-b border-border grid gap-2 px-3 py-2 text-xs text-muted-foreground min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
          <div>
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Range</div>
            <div className="font-semibold text-foreground">{contentConversionModel.range}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Source</div>
            <div className="font-semibold text-foreground">{contentConversionModel.sourceLabel}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Previews</div>
            <div className="font-semibold text-foreground">{contentConversionModel.totalPreviews.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Unwraps</div>
            <div className="font-semibold text-foreground">{contentConversionModel.totalUnlocks.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Unwrap rate</div>
            <div className="font-semibold text-foreground">
              {contentConversionModel.overallUnlockRatePct !== null
                ? formatPercent(contentConversionModel.overallUnlockRatePct / 100)
                : noRateSampleLabel}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Missing metadata</div>
            <div className="font-semibold text-foreground">{contentConversionModel.missingMetadataCount}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Last updated</div>
            <div className="font-semibold text-foreground">{formatAbsoluteDateTime(contentConversionModel.generatedAtUtc)}</div>
          </div>
        </div>

        <div className="border-b border-border px-3 py-2 text-xs leading-5 text-muted-foreground">
          {contentConversionModel.visibleCopy.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 min-w-0 max-w-full">
          {contentConversionModel.availableGroupingKeys.map((option) => (
            <Button
              key={option.value}
              type="button"
              onClick={() => setContentConversionGrouping(option.value)}
              variant={contentConversionGrouping === option.value ? "default" : "ghost"}
              size="sm"
              aria-pressed={contentConversionGrouping === option.value}
              className="max-w-full wrap-anywhere"
            >
              {option.label}
            </Button>
          ))}
        </div>

        {contentConversionVisibleRows.length > 0 ? (
          <div className="space-y-2">
            {contentConversionViewMode === "chart" ? (
              <div className="border-b border-border h-72 w-full p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={contentConversionChartRows}
                    margin={{ top: 8, right: 8, left: -18, bottom: 36 }}
                  >
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
                      height={58}
                    />
                    <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip content={<AnalyticsTooltip />} />
                    <Bar dataKey="previewCount" name="Previews" fill="#22d3ee" radius={[10, 10, 0, 0]} />
                    <Bar dataKey="unlockCount" name="Unwraps" fill="#b28cff" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : null}

            {contentConversionViewMode === "table" ? (
              <div
                className="rounded-2xl bg-card overflow-x-auto"
                data-content-conversion-table="compact"
              >
                <table className="min-w-full text-left text-xs">
                  <thead className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Group</th>
                      <th className="px-3 py-2 font-semibold">Drops</th>
                      <th className="px-3 py-2 font-semibold">Previews</th>
                      <th className="px-3 py-2 font-semibold">Unwraps</th>
                      <th className="px-3 py-2 font-semibold">Rate</th>
                      <th className="px-3 py-2 font-semibold">Viewer</th>
                      <th className="px-3 py-2 font-semibold">Watch</th>
                      <th className="px-3 py-2 font-semibold">State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 text-muted-foreground">
                    {contentConversionVisibleRows.map((row) => (
                      <tr
                        key={`content-conversion-table-${row.groupKey}`}
                        data-content-conversion-group-key={row.groupKey}
                        data-content-conversion-grouping={row.groupingDimension}
                        data-content-conversion-state={row.conversionState}
                        title={`Source: ${row.sourceTruth}; Freshness: ${row.freshnessState}`}
                      >
                        <td className="max-w-[14rem] truncate px-3 py-2 font-semibold text-foreground">{row.groupLabel}</td>
                        <td className="px-3 py-2">{row.dropCount}</td>
                        <td className="px-3 py-2">{row.previewCount.toLocaleString()}</td>
                        <td className="px-3 py-2">{row.unlockCount.toLocaleString()}</td>
                        <td className="px-3 py-2 text-brand-purple">{row.unlockRatePct !== null ? formatPercent(row.unlockRatePct / 100) : noRateSampleLabel}</td>
                        <td className="px-3 py-2">{(row.viewerOpenCount ?? 0).toLocaleString()}</td>
                        <td className="px-3 py-2">{row.watchSeconds !== null && row.watchSeconds !== undefined ? formatDuration(row.watchSeconds) : noWatchSampleLabel}</td>
                        <td className="px-3 py-2"><AdminStatusBadge state={resolveAdminAnalyticsContentConversionRowTruthState(row.conversionState)} className="max-w-full overflow-visible whitespace-normal wrap-anywhere text-xs" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {contentConversionViewMode === "cards" ? (
              <div className="space-y-2">
                {contentConversionVisibleRows.map((row) => (
                  <div
                    key={row.groupKey}
                    className="border-b border-border px-3 py-3"
                    data-content-conversion-group-key={row.groupKey}
                    data-content-conversion-grouping={row.groupingDimension}
                    data-content-conversion-state={row.conversionState}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{row.groupLabel}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{`${row.dropCount} drops | ${row.previewCount.toLocaleString()} previews | ${row.unlockCount.toLocaleString()} ${row.unlockCount === 1 ? "unwrap" : "unwraps"}`}</p>
                      </div>
                      <AdminStatusBadge state={resolveAdminAnalyticsContentConversionRowTruthState(row.conversionState)} className="max-w-full overflow-visible whitespace-normal wrap-anywhere text-xs" />
                    </div>
                    <div
                      className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground"
                      data-product-surface-integrity-debug-detail
                      title={`Source: ${row.sourceTruth}; Freshness: ${row.freshnessState}`}
                    >
                      <span>
                        Rate: {row.unlockRatePct !== null ? formatPercent(row.unlockRatePct / 100) : noRateSampleLabel}
                      </span>
                      <span>
                        Viewer: {(row.viewerOpenCount ?? 0).toLocaleString()}
                      </span>
                      <span>
                        Watch: {row.watchSeconds !== null && row.watchSeconds !== undefined ? formatDuration(row.watchSeconds) : noWatchSampleLabel}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">{row.explanation}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="border-b border-border px-4 py-5 text-sm text-muted-foreground">
            {contentConversionModel.sourceTruth === "missing"
              ? "No preview/unwrap/drop metadata source available for this range."
              : contentConversionModel.sourceTruth === "drop_metadata_plus_unlock_rollups"
                ? "Content conversion is using access rollup fallback because unwrap telemetry is missing."
                : "No preview/unwrap events in selected range."}
          </div>
        )}
      </div>
    </SectionCard>
  );
}
