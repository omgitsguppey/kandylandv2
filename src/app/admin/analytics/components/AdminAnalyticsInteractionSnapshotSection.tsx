import React from "react";
import { Clock3 } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  AnalyticsTooltip,
  AnalyticsViewModeToggle,
  SectionCard,
  type AnalyticsViewMode,
} from "@/components/Admin/Analytics/AdminAnalyticsPrimitives";
import { AdminStatusBadge } from "@/components/Admin/AdminStatusBadge";
import { formatAdminAnalyticsSourceTruthLabel } from "@/lib/analytics/admin-analytics-display-state";
import { cn } from "@/lib/utils";
import type { AdminAnalyticsState } from "../hooks/useAdminAnalyticsState";

type AdminAnalyticsInteractionSnapshotSectionProps = Pick<
  AdminAnalyticsState,
  | "renderSectionRangeControl"
  | "liveInteractionStreamModel"
  | "formatCompactNumber"
  | "formatRelativeTime"
  | "nowMs"
> & {
  emptyCountLabel: string;
};

export function AdminAnalyticsInteractionSnapshotSection(
  props: AdminAnalyticsInteractionSnapshotSectionProps,
) {
  const {
    renderSectionRangeControl,
    liveInteractionStreamModel,
    formatCompactNumber,
    formatRelativeTime,
    nowMs,
    emptyCountLabel,
  } = props;
  const [liveInteractionViewMode, setLiveInteractionViewMode] = React.useState<AnalyticsViewMode>("cards");
  const liveInteractionSourceLabel = formatAdminAnalyticsSourceTruthLabel(
    liveInteractionStreamModel.sourceTruth,
  );
  const streamCountLabel = (value: number | null) =>
    value === null ? emptyCountLabel : formatCompactNumber(value);
  const formatLiveStreamRelativeUtc = (timestamp: number | null) =>
    timestamp ? formatRelativeTime(timestamp, nowMs) : "unknown";

  return (
    <SectionCard
      title="Interaction Snapshot"
      subtitle="Recent telemetry snapshot with freshness, actor, and task-failure truth."
      icon={Clock3}
      rightSlot={(
        <div className="flex flex-wrap items-center justify-end gap-2">
          <AnalyticsViewModeToggle
            value={liveInteractionViewMode}
            onChange={setLiveInteractionViewMode}
            options={[
              { id: "cards", label: "Cards" },
              { id: "chart", label: "Chart" },
              { id: "table", label: "Table" },
            ]}
          />
          {renderSectionRangeControl("liveInteractionStream")}
        </div>
      )}
    >
      <div className="grid gap-2.5">
        <div className="border-b border-border flex flex-col gap-2 px-3 py-2 text-xs leading-5 text-muted-foreground @min-[40rem]:flex-row @min-[40rem]:items-center @min-[40rem]:justify-between">
          <div className="min-w-0">
            <p>{liveInteractionStreamModel.recommendation}</p>
            <p className="mt-1 text-xs text-muted-foreground">{liveInteractionStreamModel.visibleCopy}</p>
          </div>
          <AdminStatusBadge
            state={liveInteractionStreamModel.truthState}
            label={liveInteractionStreamModel.badgeLabel}
            className="max-w-full overflow-visible whitespace-normal wrap-anywhere text-xs"
          />
        </div>

        <div className="border-b border-border grid gap-1.5 px-3 py-2 text-xs leading-5 text-muted-foreground min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
          <span className="min-w-0 wrap-anywhere"><span className="font-semibold text-foreground">Shown:</span> {streamCountLabel(liveInteractionStreamModel.visibleEventCount)}</span>
          <span className="min-w-0 wrap-anywhere"><span className="font-semibold text-foreground">Actors:</span> {streamCountLabel(liveInteractionStreamModel.uniqueActorCount)}</span>
          <span className="min-w-0 wrap-anywhere"><span className="font-semibold text-foreground">Failures:</span> {streamCountLabel(liveInteractionStreamModel.failureCount)}</span>
          <span className="min-w-0 wrap-anywhere"><span className="font-semibold text-foreground">Admin excl.:</span> {liveInteractionStreamModel.adminExcludedCount}</span>
        </div>

        <div className="border-b border-border grid gap-1.5 px-3 py-2 text-xs leading-5 text-muted-foreground min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
          <span className="min-w-0 wrap-anywhere"><span className="font-semibold text-foreground">Mode:</span> {liveInteractionStreamModel.streamSourceMode.replaceAll("_", " ")}</span>
          <span className="min-w-0 wrap-anywhere" title={liveInteractionStreamModel.sourceTruth}><span className="font-semibold text-foreground">Source:</span> {liveInteractionSourceLabel}</span>
          <span className="min-w-0 wrap-anywhere"><span className="font-semibold text-foreground">Last event:</span> {formatLiveStreamRelativeUtc(liveInteractionStreamModel.lastEventAt)}</span>
          <span className="min-w-0 wrap-anywhere"><span className="font-semibold text-foreground">Generated:</span> {liveInteractionStreamModel.generatedAtUtc ? formatRelativeTime(new Date(liveInteractionStreamModel.generatedAtUtc).getTime(), nowMs) : "unknown"}</span>
        </div>

        {liveInteractionStreamModel.warnings.length > 0 ? (
          <div className="border-b border-border px-3 py-2 text-xs leading-5 text-muted-foreground">
            {liveInteractionStreamModel.warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        ) : null}

        <div
          className="border-b border-border p-3"
          data-admin-analytics-mobile-view-mode={liveInteractionViewMode}
          data-live-interaction-source-truth={liveInteractionStreamModel.sourceTruth}
          data-live-interaction-source-mode={liveInteractionStreamModel.streamSourceMode}
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Recent interaction snapshot
            </p>
            <span className="text-xs text-muted-foreground">
              source / actor / surface truth
            </span>
          </div>

          {liveInteractionStreamModel.eventRows.length > 0 && liveInteractionViewMode === "chart" ? (
            <div className="border-b border-border h-52 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={liveInteractionStreamModel.eventRows}
                  margin={{ top: 4, right: 0, left: -22, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="liveInteractionDuplicateFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis
                    dataKey="compactTypeLabel"
                    stroke="#6b7280"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    minTickGap={12}
                    height={30}
                  />
                  <YAxis stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<AnalyticsTooltip />} />
                  <Area type="monotone" dataKey="duplicateCount" name="Grouped events" stroke="#22d3ee" strokeWidth={2} fill="url(#liveInteractionDuplicateFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : null}

          {liveInteractionStreamModel.eventRows.length > 0 && liveInteractionViewMode === "table" ? (
            <div
              className="rounded-2xl bg-card overflow-x-auto"
              data-live-interaction-table="compact"
              data-live-interaction-source-truth={liveInteractionStreamModel.sourceTruth}
              data-live-interaction-source-mode={liveInteractionStreamModel.streamSourceMode}
            >
              <table className="min-w-full text-left text-xs">
                <thead className="border-b border-white/10 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Event</th>
                    <th className="px-3 py-2 font-semibold">Actor</th>
                    <th className="px-3 py-2 font-semibold">Surface</th>
                    <th className="px-3 py-2 font-semibold">Age</th>
                    <th className="px-3 py-2 font-semibold">Source</th>
                    <th className="px-3 py-2 font-semibold">Grouped</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 text-muted-foreground">
                  {liveInteractionStreamModel.eventRows.map((event) => (
                    <tr
                      key={`live-interaction-table-${event.timestamp}-${event.duplicateGroupKey}`}
                      data-live-interaction-event-key={event.eventKey}
                      data-live-interaction-event-type={event.eventType}
                      data-live-interaction-surface-state={event.surfaceState}
                    >
                      <td className="max-w-[16rem] px-3 py-2">
                        <p className="truncate font-semibold text-foreground">{event.displayLabel}</p>
                        <p className="truncate text-xs text-muted-foreground">{event.eventKey}</p>
                      </td>
                      <td className="px-3 py-2">{event.actorDisplayLabel}</td>
                      <td className="px-3 py-2">{event.surface}</td>
                      <td className="px-3 py-2">{formatRelativeTime(event.timestamp, nowMs)}</td>
                      <td className="px-3 py-2" title={event.sourceTruth}>{formatAdminAnalyticsSourceTruthLabel(event.sourceTruth)}</td>
                      <td className="px-3 py-2">{event.duplicateCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {liveInteractionViewMode === "cards" ? (
            <div className="space-y-1.5">
              {liveInteractionStreamModel.eventRows.length > 0 ? (
                liveInteractionStreamModel.eventRows.map((event) => (
                  <div
                    key={`${event.timestamp}-${event.duplicateGroupKey}`}
                    className="border-b border-border px-3 py-2"
                  >
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-foreground">
                          {event.displayLabel}
                          {event.duplicateCount > 1 ? (
                            <span className="ml-1 text-xs text-brand-purple">
                              x{event.duplicateCount}
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {event.actorDisplayLabel} / {event.surface} / {formatRelativeTime(event.timestamp, nowMs)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatAdminAnalyticsSourceTruthLabel(event.sourceTruth)} - {event.surfaceState === "verified" ? "surface verified" : event.surfaceState === "inferred" ? "surface inferred" : "surface missing"} - {event.explanation}
                        </p>
                        {event.eventType === "task_failed" && event.failureReason ? (
                          <p className="mt-1 text-xs text-rose-200">
                            Failure: {event.failureReason}
                          </p>
                        ) : null}
                      </div>
                      <span
                        className={cn(
                          "max-w-[5.5rem] truncate rounded-full border px-2 py-1 text-xs font-bold uppercase tracking-[0.08em]",
                          event.eventType === "task_failed"
                            ? "border-rose-400/25 bg-rose-500/10 text-rose-200"
                            : "border-brand-purple/25 bg-brand-purple/10 text-brand-purple",
                        )}
                        title={event.eventKey}
                      >
                        {event.compactTypeLabel}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="border-b border-border p-3 text-xs text-muted-foreground">
                  No user interactions available for this range.
                </div>
              )}
            </div>
          ) : liveInteractionStreamModel.eventRows.length === 0 ? (
            <div className="border-b border-border p-3 text-xs text-muted-foreground">
              No user interactions available for this range.
            </div>
          ) : null}
        </div>
      </div>
    </SectionCard>
  );
}
