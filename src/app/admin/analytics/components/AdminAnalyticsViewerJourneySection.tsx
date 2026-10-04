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
        <div className="flex flex-wrap items-center justify-end gap-2 min-w-0 max-w-full">
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
            className="rounded-2xl bg-card overflow-x-auto"
            data-viewer-journey-table="compact"
            data-viewer-journey-range={viewerJourneyRange}
            data-viewer-journey-source-state={viewerJourneyItems.length > 0 ? "loaded" : "no_sample"}
          >
            <table className="min-w-full text-left text-xs">
              <thead className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-semibold">Step</th>
                  <th className="px-3 py-2 font-semibold">Events</th>
                  <th className="px-3 py-2 font-semibold">Range</th>
                  <th className="px-3 py-2 font-semibold">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-muted-foreground">
                {viewerJourneyItems.map((item) => (
                  <tr key={`viewer-journey-row-${item.label}`}>
                    <td className="max-w-[14rem] min-w-0 whitespace-normal wrap-anywhere px-3 py-2 font-semibold text-foreground">{item.label}</td>
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
          <div className="grid gap-2 min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
            {viewerJourneyItems.map((item, index) => (
              <div
                key={`viewer-journey-card-${item.label}`}
                className="border-b border-border p-3"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Step {index + 1}</p>
                <p className="mt-1 min-w-0 whitespace-normal wrap-anywhere text-sm font-semibold text-foreground">{item.label}</p>
                <p className="mt-2 text-xl font-black text-brand-purple">{item.count.toLocaleString()}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.count > 0 ? "Observed in selected range." : "No sample in selected range."}</p>
              </div>
            ))}
          </div>
        ) : null}

        {viewerJourneyItems.length === 0 || !viewerJourneyItems.some((item) => item.count > 0) ? (
          <div className="border-b border-border p-5 text-sm text-muted-foreground">
            Viewer journey loaded without any tracked viewer activity.
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}
