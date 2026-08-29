import React from "react";
import { Sparkles } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  AnalyticsTooltip,
  AnalyticsViewModeToggle,
  SectionCard,
  type AnalyticsViewMode,
} from "@/components/Admin/Analytics/AdminAnalyticsPrimitives";
import { AdminStatusBadge } from "@/components/Admin/AdminStatusBadge";
import type { AdminAnalyticsState } from "../hooks/useAdminAnalyticsState";

type AdminAnalyticsEventMixSectionProps = Pick<
  AdminAnalyticsState,
  | "renderSectionRangeControl"
  | "eventMixModel"
  | "formatCompactNumber"
  | "formatPercent"
>;

export function AdminAnalyticsEventMixSection({
  renderSectionRangeControl,
  eventMixModel,
  formatCompactNumber,
  formatPercent,
}: AdminAnalyticsEventMixSectionProps) {
  const [eventMixViewMode, setEventMixViewMode] = React.useState<AnalyticsViewMode>("cards");
  const firstSnapshotLabel = "Collecting activity";
  const noShareSampleLabel = "No share sample";
  const catalogMappingSentence =
    eventMixModel.eventsNeedingCatalogMapping === null
      ? ""
      : `${eventMixModel.eventsNeedingCatalogMapping} need catalog mapping.`;
  const surfaceContextSentence =
    eventMixModel.eventsMissingSurfaceContext === null
      ? ""
      : `${eventMixModel.eventsMissingSurfaceContext} top events need surface context.`;
  const eventMixSurfaceContextLabel =
    eventMixModel.actualSurfaceContextState === "available"
      ? "Surface context verified"
      : eventMixModel.actualSurfaceContextState === "partial"
        ? "Surface context partial"
        : eventMixModel.actualSurfaceContextState === "unknown"
          ? "Surface context checking"
          : "Surface context unavailable";
  const eventMixCountLabel = (value: number | null) =>
    value === null ? firstSnapshotLabel : formatCompactNumber(value);
  const eventMixShareLabel = (value: number | null) =>
    value === null ? noShareSampleLabel : formatPercent(value);
  const eventMixMissingSurfaceLabel = "Surface: missing";
  const eventMixMissingRouteLabel = "Route: missing";
  const eventMixInferenceCopy = "Categories are inferred from the event catalog; verified route and surface context is missing for this range.";

  return (
    <SectionCard
      title="Event Mix"
      subtitle="Top event activity with catalog inference and verified surface-context truth."
      icon={Sparkles}
      rightSlot={(
        <div className="flex flex-wrap items-center justify-end gap-2">
          <AnalyticsViewModeToggle
            value={eventMixViewMode}
            onChange={setEventMixViewMode}
            options={[
              { id: "cards", label: "Cards" },
              { id: "chart", label: "Chart" },
              { id: "table", label: "Table" },
            ]}
          />
          {renderSectionRangeControl("eventMix")}
        </div>
      )}
    >
      <div className="grid gap-2.5">
        <div className="flex flex-col gap-2 rounded-[1rem] border border-white/10 bg-white/[0.035] px-3 py-2 text-[11px] leading-5 text-gray-300 md:flex-row md:items-center md:justify-between">
          <span>{eventMixModel.visibleCopy || eventMixInferenceCopy}</span>
          <AdminStatusBadge
            state={eventMixModel.truthState}
            label={eventMixModel.badgeLabel}
            className="max-w-[6.25rem] truncate whitespace-nowrap px-1.5 py-0.5 text-[9px]"
          />
        </div>

        <div className="grid gap-2 rounded-[1rem] border border-white/10 bg-black/25 px-3 py-2 text-[11px] leading-5 text-gray-300 md:grid-cols-3">
          <span>
            <span className="font-semibold text-white">Total:</span>{" "}
            {eventMixCountLabel(eventMixModel.totalEventsInRange)} tracked events
          </span>
          <span>
            <span className="font-semibold text-white">Top:</span>{" "}
            {eventMixModel.topEvent?.displayLabel ?? "No verified event yet"}
          </span>
          <span>
            <span className="font-semibold text-white">Verified surface context:</span>{" "}
            {eventMixSurfaceContextLabel}
          </span>
        </div>

        <div className="grid gap-2 rounded-[1rem] border border-white/10 bg-black/25 px-3 py-2 text-[11px] leading-5 text-gray-300 md:grid-cols-3">
          <span>
            <span className="font-semibold text-white">Catalog inference:</span>{" "}
            {eventMixModel.catalogInferenceState}
          </span>
          <span data-event-mix-missing-reason="missing verified surface context">
            <span className="font-semibold text-white">Missing verified surface context:</span>{" "}
            {eventMixModel.eventsMissingSurfaceContext ?? "unknown"}
          </span>
          <span>
            <span className="font-semibold text-white">Unmapped catalog events:</span>{" "}
            {eventMixModel.eventsNeedingCatalogMapping ?? "unknown"}
          </span>
        </div>

        <div
          className="rounded-[1rem] border border-white/10 bg-black/30 p-3"
          data-admin-analytics-mobile-view-mode={eventMixViewMode}
          data-event-mix-source-mode={eventMixModel.eventMixSourceMode}
          data-event-mix-surface-context={eventMixModel.actualSurfaceContextState}
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
              Ranked event activity
            </p>
            <span className="text-[10px] text-gray-500">
              event count / total counted events
            </span>
          </div>

          {eventMixModel.eventRows.length > 0 && eventMixViewMode === "chart" ? (
            <div className="h-52 rounded-[0.9rem] border border-white/10 bg-black/25 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={eventMixModel.eventRows}
                  margin={{ top: 4, right: 0, left: -22, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="eventMixCountFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#c084fc" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#c084fc" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis
                    dataKey="displayLabel"
                    stroke="#6b7280"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    minTickGap={12}
                    height={30}
                  />
                  <YAxis stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip content={<AnalyticsTooltip />} />
                  <Area type="monotone" dataKey="rawCount" name="Events" stroke="#c084fc" strokeWidth={2} fill="url(#eventMixCountFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : null}

          {eventMixModel.eventRows.length > 0 && eventMixViewMode === "table" ? (
            <div
              className="overflow-x-auto rounded-[0.9rem] border border-white/10 bg-black/25"
              data-event-mix-table="compact"
              data-event-mix-source-mode={eventMixModel.eventMixSourceMode}
              data-event-mix-surface-context={eventMixModel.actualSurfaceContextState}
            >
              <table className="min-w-full text-left text-xs">
                <thead className="border-b border-white/10 text-[10px] uppercase tracking-[0.12em] text-gray-500">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Event</th>
                    <th className="px-3 py-2 font-semibold">Count</th>
                    <th className="px-3 py-2 font-semibold">Share</th>
                    <th className="px-3 py-2 font-semibold">Category</th>
                    <th className="px-3 py-2 font-semibold">Surface</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 text-gray-300">
                  {eventMixModel.eventRows.map((item) => (
                    <tr
                      key={`event-mix-table-${item.eventKey}`}
                      data-event-mix-event-key={item.eventKey}
                      data-event-mix-mapping-state={item.mappingState}
                      data-event-mix-actual-surface-state={item.actualSurfaceState}
                    >
                      <td className="max-w-[16rem] px-3 py-2">
                        <p className="truncate font-semibold text-white">{item.displayLabel}</p>
                        <p className="truncate text-[11px] text-gray-500">{item.eventKey}</p>
                      </td>
                      <td className="px-3 py-2">{eventMixCountLabel(item.rawCount)}</td>
                      <td className="px-3 py-2">{eventMixShareLabel(item.share)}</td>
                      <td className="px-3 py-2">{item.catalogCategory ?? "missing"}</td>
                      <td className="px-3 py-2">{item.actualSurface ?? "missing"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {eventMixViewMode === "cards" ? (
            <div className="space-y-1.5">
              {eventMixModel.eventRows.length > 0 ? (
                eventMixModel.eventRows.map((item) => (
                  <div
                    key={item.eventKey}
                    className="rounded-[0.9rem] border border-white/10 bg-white/[0.03] px-3 py-2"
                  >
                    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[10px] font-semibold text-gray-300">
                        {item.rank}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-white">
                          {item.displayLabel}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <span className="rounded border border-white/10 bg-black/30 px-1.5 py-0.5 text-[9px] text-gray-300">
                            Category: {item.catalogCategory ?? "missing"} {item.catalogCategoryState === "inferred" ? "(catalog-inferred)" : item.catalogCategoryState === "verified" ? "(verified)" : ""}
                          </span>
                          <span className="rounded border border-white/10 bg-black/30 px-1.5 py-0.5 text-[9px] text-gray-300">
                            {item.actualSurface ? `Surface: ${item.actualSurface}` : eventMixMissingSurfaceLabel}
                          </span>
                          <span className="rounded border border-white/10 bg-black/30 px-1.5 py-0.5 text-[9px] text-gray-300">
                            {item.route ? `Route: ${item.route}` : eventMixMissingRouteLabel}
                          </span>
                        </div>
                        <p className="mt-1 text-[10px] text-gray-500">
                          {item.explanation}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-brand-purple">
                          {eventMixCountLabel(item.rawCount)}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          {eventMixShareLabel(item.share)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-brand-purple"
                        style={{
                          width: `${Math.max(4, Math.min(100, (item.share ?? 0) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[0.9rem] border border-dashed border-white/10 bg-black/20 p-3 text-xs text-gray-500">
                  Event mix needs verified event counts.
                </div>
              )}
            </div>
          ) : eventMixModel.eventRows.length === 0 ? (
            <div className="rounded-[0.9rem] border border-dashed border-white/10 bg-black/20 p-3 text-xs text-gray-500">
              Event mix needs verified event counts.
            </div>
          ) : null}
        </div>

        <div className="rounded-[1rem] border border-white/10 bg-black/25 px-3 py-2 text-[11px] leading-5 text-gray-300">
          <span className="font-semibold text-white">Context:</span>{" "}
          {eventMixModel.actualSurfaceContextState === "available"
            ? "Verified route and surface context available."
            : `${eventMixSurfaceContextLabel}. Verified route and surface context are unavailable for this range.`}
          {" "}
          {catalogMappingSentence}
          {" "}
          {surfaceContextSentence}
        </div>
      </div>
    </SectionCard>
  );
}
