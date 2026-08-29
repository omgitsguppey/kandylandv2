import React from "react";
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
import { cn } from "@/lib/utils";
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
        <div className="flex flex-wrap items-center justify-end gap-2">
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
        <div className="grid gap-2 rounded-[1rem] border border-white/10 bg-black/25 px-3 py-2 text-[11px] text-gray-300 md:grid-cols-3 xl:grid-cols-7">
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-gray-500">Range</div>
            <div className="font-semibold text-white">{contentConversionModel.range}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-gray-500">Source</div>
            <div className="font-semibold text-white">{contentConversionModel.sourceLabel}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-gray-500">Previews</div>
            <div className="font-semibold text-white">{contentConversionModel.totalPreviews.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-gray-500">Unwraps</div>
            <div className="font-semibold text-white">{contentConversionModel.totalUnlocks.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-gray-500">Unwrap rate</div>
            <div className="font-semibold text-white">
              {contentConversionModel.overallUnlockRatePct !== null
                ? formatPercent(contentConversionModel.overallUnlockRatePct / 100)
                : noRateSampleLabel}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-gray-500">Missing metadata</div>
            <div className="font-semibold text-white">{contentConversionModel.missingMetadataCount}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-gray-500">Last updated</div>
            <div className="font-semibold text-white">{formatAbsoluteDateTime(contentConversionModel.generatedAtUtc)}</div>
          </div>
        </div>

        <div className="rounded-[1rem] border border-white/10 bg-white/[0.035] px-3 py-2 text-[11px] leading-5 text-gray-300">
          {contentConversionModel.visibleCopy.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {contentConversionModel.availableGroupingKeys.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setContentConversionGrouping(option.value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors",
                contentConversionGrouping === option.value
                  ? "border-brand-purple/40 bg-brand-purple/15 text-white"
                  : "border-white/10 bg-black/25 text-gray-300 hover:border-brand-purple/30 hover:text-white",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {contentConversionVisibleRows.length > 0 ? (
          <div className="space-y-2">
            {contentConversionViewMode === "chart" ? (
              <div className="h-72 w-full rounded-[1rem] border border-white/10 bg-black/25 p-3">
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
                className="overflow-x-auto rounded-[1rem] border border-white/10 bg-black/25"
                data-content-conversion-table="compact"
              >
                <table className="min-w-full text-left text-xs">
                  <thead className="border-b border-white/10 text-[10px] uppercase tracking-[0.14em] text-gray-500">
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
                  <tbody className="divide-y divide-white/10 text-gray-300">
                    {contentConversionVisibleRows.map((row) => (
                      <tr
                        key={`content-conversion-table-${row.groupKey}`}
                        data-content-conversion-group-key={row.groupKey}
                        data-content-conversion-grouping={row.groupingDimension}
                        data-content-conversion-state={row.conversionState}
                        title={`Source: ${row.sourceTruth}; Freshness: ${row.freshnessState}`}
                      >
                        <td className="max-w-[14rem] truncate px-3 py-2 font-semibold text-white">{row.groupLabel}</td>
                        <td className="px-3 py-2">{row.dropCount}</td>
                        <td className="px-3 py-2">{row.previewCount.toLocaleString()}</td>
                        <td className="px-3 py-2">{row.unlockCount.toLocaleString()}</td>
                        <td className="px-3 py-2 text-brand-purple">{row.unlockRatePct !== null ? formatPercent(row.unlockRatePct / 100) : noRateSampleLabel}</td>
                        <td className="px-3 py-2">{(row.viewerOpenCount ?? 0).toLocaleString()}</td>
                        <td className="px-3 py-2">{row.watchSeconds !== null && row.watchSeconds !== undefined ? formatDuration(row.watchSeconds) : noWatchSampleLabel}</td>
                        <td className="px-3 py-2"><AdminStatusBadge state={resolveAdminAnalyticsContentConversionRowTruthState(row.conversionState)} /></td>
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
                    className="rounded-[1rem] border border-white/10 bg-black/30 px-3 py-3"
                    data-content-conversion-group-key={row.groupKey}
                    data-content-conversion-grouping={row.groupingDimension}
                    data-content-conversion-state={row.conversionState}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{row.groupLabel}</p>
                        <p className="mt-1 text-[11px] text-gray-500">{`${row.dropCount} drops | ${row.previewCount.toLocaleString()} previews | ${row.unlockCount.toLocaleString()} ${row.unlockCount === 1 ? "unwrap" : "unwraps"}`}</p>
                      </div>
                      <AdminStatusBadge state={resolveAdminAnalyticsContentConversionRowTruthState(row.conversionState)} />
                    </div>
                    <div
                      className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-400"
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
                    <p className="mt-2 text-[11px] leading-5 text-gray-400">{row.explanation}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-[1rem] border border-dashed border-white/10 bg-black/20 px-4 py-5 text-sm text-gray-500">
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
