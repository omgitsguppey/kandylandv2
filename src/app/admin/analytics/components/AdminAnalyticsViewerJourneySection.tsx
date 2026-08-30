import React from "react";
import { PlayCircle } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  AnalyticsTooltip,
  AnalyticsViewModeToggle,
  SectionCard,
  type AnalyticsViewMode,
} from "@/components/Admin/Analytics/AdminAnalyticsPrimitives";
import type { AdminAnalyticsState } from "../hooks/useAdminAnalyticsState";

type AdminAnalyticsViewerJourneySectionProps = Pick<
  AdminAnalyticsState,
  | "renderSectionRangeControl"
  | "viewerJourneyRange"
> & {
  viewerJourneyItems: Array<Pick<AdminAnalyticsState["viewerJourneyItems"][number], "label" | "count">>;
};

export function AdminAnalyticsViewerJourneySection(
  props: AdminAnalyticsViewerJourneySectionProps,
) {
  const {
    renderSectionRangeControl,
    viewerJourneyItems,
    viewerJourneyRange,
  } = props;
  const [viewerJourneyViewMode, setViewerJourneyViewMode] = React.useState<AnalyticsViewMode>("cards");
  const viewerJourneyChartRows = viewerJourneyItems.map((item) => ({
    ...item,
    shortLabel:
      item.label && item.label.length > 14
        ? `${item.label.slice(0, 14)}...`
        : item.label || "Unknown step",
  }));

  return (
    <SectionCard
      title="Viewer Journey"
      subtitle="How far users move from preview to opening, meaningful watch, completion, and return."
      icon={PlayCircle}
      rightSlot={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <AnalyticsViewModeToggle
            value={viewerJourneyViewMode}
            onChange={setViewerJourneyViewMode}
            options={[
              { id: "cards", label: "Cards" },
              { id: "chart", label: "Chart" },
              { id: "table", label: "Table" },
            ]}
          />
          {renderSectionRangeControl("viewerJourney")}
        </div>
      }
    >
      <div
        className="space-y-3"
        data-admin-analytics-mobile-view-mode={viewerJourneyViewMode}
        data-viewer-journey-range={viewerJourneyRange}
        data-viewer-journey-source-state={viewerJourneyItems.length > 0 ? "loaded" : "no_sample"}
      >
        {viewerJourneyItems.some((item) => item.count > 0) && viewerJourneyViewMode === "chart" ? (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={viewerJourneyChartRows}
                margin={{ top: 8, right: 4, left: -18, bottom: 0 }}
              >
                <CartesianGrid
                  stroke="rgba(255,255,255,0.06)"
                  vertical={false}
                />
                <XAxis
                  dataKey="shortLabel"
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
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Events"
                  stroke="#b28cff"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#b28cff" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : null}

        {viewerJourneyItems.length > 0 && viewerJourneyViewMode === "table" ? (
          <div
            className="overflow-x-auto rounded-[1rem] border border-white/10 bg-black/25"
            data-viewer-journey-table="compact"
            data-viewer-journey-range={viewerJourneyRange}
            data-viewer-journey-source-state={viewerJourneyItems.length > 0 ? "loaded" : "no_sample"}
          >
            <table className="min-w-full text-left text-xs">
              <thead className="border-b border-white/10 text-[10px] uppercase tracking-[0.14em] text-gray-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">Step</th>
                  <th className="px-3 py-2 font-semibold">Events</th>
                  <th className="px-3 py-2 font-semibold">Range</th>
                  <th className="px-3 py-2 font-semibold">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-gray-300">
                {viewerJourneyItems.map((item) => (
                  <tr key={`viewer-journey-row-${item.label}`}>
                    <td className="max-w-[14rem] truncate px-3 py-2 font-semibold text-white">{item.label}</td>
                    <td className="px-3 py-2 text-brand-purple">{item.count.toLocaleString()}</td>
                    <td className="px-3 py-2">{viewerJourneyRange}</td>
                    <td className="px-3 py-2">{item.count > 0 ? "Observed" : "No sample"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {viewerJourneyItems.length > 0 && viewerJourneyViewMode === "cards" ? (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {viewerJourneyItems.map((item, index) => (
              <div
                key={`viewer-journey-card-${item.label}`}
                className="rounded-[1rem] border border-white/10 bg-white/[0.035] p-3"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">Step {index + 1}</p>
                <p className="mt-1 truncate text-sm font-semibold text-white">{item.label}</p>
                <p className="mt-2 text-xl font-black text-brand-purple">{item.count.toLocaleString()}</p>
                <p className="mt-1 text-[11px] text-gray-500">{item.count > 0 ? "Observed in selected range." : "No sample in selected range."}</p>
              </div>
            ))}
          </div>
        ) : null}

        {viewerJourneyItems.length === 0 || !viewerJourneyItems.some((item) => item.count > 0) ? (
          <div className="rounded-[1.6rem] border border-dashed border-white/10 bg-black/20 p-5 text-sm text-gray-500">
            Viewer journey loaded without any tracked viewer activity.
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}
