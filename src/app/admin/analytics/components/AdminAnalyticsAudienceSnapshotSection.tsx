import {
  Activity, Clock3, Smartphone, Users,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  AnalyticsTooltip,
  MetricCard,
  SectionCard,
} from "@/components/Admin/Analytics/AdminAnalyticsPrimitives";
import { resolveAdminAnalyticsGuestEstimateBadgeLabel } from "@/lib/admin-analytics-contracts";
import { formatAdminAnalyticsSourceStateLabel } from "@/lib/analytics/admin-analytics-display-state";
import type { AdminAnalyticsState } from "../hooks/useAdminAnalyticsState";
import { formatAudienceSeriesLabel } from "./AdminAnalyticsAudienceTab.utils";

type AdminAnalyticsAudienceSnapshotSectionProps = Pick<
  AdminAnalyticsState,
  | "renderSectionRangeControl"
  | "audienceSnapshotModel"
  | "audienceHistorySeries"
  | "nowMs"
  | "formatCompactNumber"
  | "formatDuration"
  | "formatPercent"
  | "formatRelativeTime"
> & {
  noSnapshotLabel: string;
};

export function AdminAnalyticsAudienceSnapshotSection({
  renderSectionRangeControl,
  audienceSnapshotModel,
  audienceHistorySeries,
  nowMs,
  formatCompactNumber,
  formatDuration,
  formatPercent,
  formatRelativeTime,
  noSnapshotLabel,
}: AdminAnalyticsAudienceSnapshotSectionProps) {
  const noSampleLabel = "No sample";
  const formatAudienceValue = (
    value: number | null,
    formatter: (value: number) => string,
    waitingLabel = noSampleLabel,
  ) => (value === null ? waitingLabel : formatter(value));
  const audienceWaitingLabel =
    audienceSnapshotModel.refreshStatus === "running" && !audienceSnapshotModel.serverConfirmed
      ? "Waiting for audience snapshot"
      : noSnapshotLabel;
  const guestBadgeLabel = resolveAdminAnalyticsGuestEstimateBadgeLabel(
    audienceSnapshotModel.guestEstimateFormulaUsed,
  );
  const audienceSourceStateLabel = formatAdminAnalyticsSourceStateLabel(
    audienceSnapshotModel.sourceState,
  );
  const continuityLabel = audienceSnapshotModel.continuity.gapSeverity === "error"
    ? "Traffic gap detected"
    : audienceSnapshotModel.continuity.gapSeverity === "review"
      ? "Continuity needs review"
      : "Continuity verified";

  return (
    <SectionCard
      title="Audience Snapshot"
      subtitle="First-party snapshots first; site analytics only explain traffic gaps."
      icon={Users}
      defaultExpanded={false}
      rightSlot={renderSectionRangeControl("audienceSnapshot")}
    >
      <div
        className="mb-3 space-y-3"
        data-audience-source-state={audienceSnapshotModel.sourceState}
        data-audience-ga-freshness={audienceSnapshotModel.ga.freshnessState}
        data-audience-first-party-freshness={audienceSnapshotModel.firstParty.freshnessState}
        data-audience-missing-days-count={String(audienceSnapshotModel.continuity.missingDays.length)}
        data-audience-recent-gap-days-count={String(audienceSnapshotModel.continuity.recentGapDays.length)}
        data-audience-recovery-mode={audienceSnapshotModel.recovery.mode}
        data-audience-estimated-share={String(audienceSnapshotModel.recovery.estimatedSharePct)}
        data-audience-generated-at-utc={audienceSnapshotModel.generatedAtUtc}
        data-admin-analytics-snapshot-priority="analytics_admin_metric_snapshots"
        data-admin-analytics-vendor-source-label="vendor_evidence"
        data-admin-analytics-raw-ledger-display="debug_only"
        data-admin-analytics-recovery-promotion="debug_only_not_promoted"
      >
        <div className="border-b border-border px-3 py-2 text-xs leading-5 text-muted-foreground">
          {audienceSnapshotModel.visibleCopy.map((line) => (
            <p key={line}>{line}</p>
          ))}
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground">
            <span>
              First-party{" "}
              {audienceSnapshotModel.identifiedViews.value === null
                ? audienceWaitingLabel
                : `${audienceSnapshotModel.identifiedViews.value.toLocaleString()} views`}
            </span>
            <span>Guest {audienceSnapshotModel.guestVisits.label}</span>
            <span>
              Updated {audienceSnapshotModel.generatedAtUtc === new Date(0).toISOString()
                ? noSnapshotLabel
                : formatRelativeTime(Date.parse(audienceSnapshotModel.generatedAtUtc), nowMs)}
            </span>
            <span>State {audienceSourceStateLabel}</span>
          </div>
        </div>

        <div className="border-b border-border px-3 py-2 text-xs leading-5 text-muted-foreground">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="font-semibold text-foreground">{continuityLabel}</p>
              <p>{audienceSnapshotModel.continuitySummary}</p>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:grid-cols-3">
              <span>Expected {audienceSnapshotModel.continuity.expectedDays}</span>
              <span>Present {audienceSnapshotModel.continuity.presentDays}</span>
              <span>Missing {audienceSnapshotModel.continuity.missingDays.length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-2.5 min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
        <MetricCard
          label="Site users"
          value={formatAudienceValue(
            audienceSnapshotModel.totalUsers.value,
            formatCompactNumber,
            audienceWaitingLabel,
          )}
          hint={audienceSnapshotModel.totalUsers.label}
          icon={Users}
          truthState={audienceSnapshotModel.totalUsers.truthState}
          dictionaryTooltip="Site users for the selected range are supporting traffic estimates, not authenticated KandyDrops accounts or product truth."
        />
        <MetricCard
          label="Guest Visits"
          value={formatAudienceValue(
            audienceSnapshotModel.guestVisits.value,
            formatCompactNumber,
            audienceWaitingLabel,
          )}
          hint={audienceSnapshotModel.guestVisits.label}
          icon={Smartphone}
          truthState={audienceSnapshotModel.guestVisits.truthState}
          statusBadgeLabel={guestBadgeLabel}
          dictionaryTooltip="Guest/public visits. When consented guest batches are missing, this stays estimated and does not become verified first-party traffic."
        />
        <MetricCard
          label="Sessions"
          value={formatAudienceValue(
            audienceSnapshotModel.sessions.value,
            formatCompactNumber,
            audienceWaitingLabel,
          )}
          hint={
            audienceSnapshotModel.views.value === null
              ? audienceSnapshotModel.sessions.label
              : `${audienceSnapshotModel.views.value.toLocaleString()} site views`
          }
          icon={Activity}
          truthState={audienceSnapshotModel.sessions.truthState}
          dictionaryTooltip="Site sessions for the selected range. Page views stay labeled separately so sessions and views are not merged into one implied denominator."
        />
        <MetricCard
          label="Engagement"
          value={formatAudienceValue(
            audienceSnapshotModel.engagementRate.value,
            formatPercent,
            audienceWaitingLabel,
          )}
          hint={
            audienceSnapshotModel.avgSession.value === null
              ? audienceSnapshotModel.engagementRate.label
              : `${formatDuration(audienceSnapshotModel.avgSession.value)} avg site session`
          }
          icon={Clock3}
          truthState={audienceSnapshotModel.engagementRate.truthState}
          dictionaryTooltip="Site engagement rate and average session duration. This is not first-party watch or activity quality."
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {audienceSnapshotModel.chartSeries.map((series) => (
          <span key={series.key} className="inline-flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: series.stroke }}
            />
            {formatAudienceSeriesLabel(series.label)}
          </span>
        ))}
      </div>

      <div className={`mt-2.5 ${audienceSnapshotModel.chartHeightClass} w-full`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={audienceHistorySeries}
            margin={{ top: 4, right: 0, left: -22, bottom: 0 }}
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
                  stopColor="var(--foreground)"
                  stopOpacity={0.22}
                />
                <stop
                  offset="95%"
                  stopColor="var(--foreground)"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="var(--border)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              stroke="var(--muted-foreground)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              minTickGap={20}
            />
            <YAxis
              stroke="var(--muted-foreground)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<AnalyticsTooltip />} />
            <Area
              type="monotone"
              dataKey="users"
              name="Site users"
              stroke="var(--foreground)"
              strokeWidth={2.5}
              fill="url(#historyUsersFill)"
            />
            <Area
              type="monotone"
              dataKey="views"
              name="Views"
              stroke="var(--primary)"
              strokeWidth={2}
              fillOpacity={0}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}
