"use client";

import { ArrowDownRight, ArrowRight, ArrowUpRight, DollarSign, ShoppingBag, Users, Zap } from "lucide-react";

import type { AdminOverviewIssueDetail, AdminOverviewResponse, PlatformPulseMetric } from "@/lib/admin-overview";
import { AdminMetricCard } from "@/components/Admin/AdminMetricCard";
import { AdminReviewBadge } from "@/components/Admin/AdminReviewBadge";
import { AdminTruthBadge } from "@/components/Admin/AdminTruthBadge";
import { buildAdminReviewBadge } from "@/lib/behavioral/review-badge-rules";
import { resolveAdminMetricTruthState, type AdminTruthState } from "@/lib/admin-truth-state";
import { calculatePlatformPulseDelta, classifyPlatformPulseTrend, formatPlatformPulseDelta } from "@/lib/admin/platform-pulse-window";
import { cn } from "@/lib/utils";

type AdminStatsBarProps = {
    platformPulse?: AdminOverviewResponse["platformPulse"];
    overviewIssues?: AdminOverviewResponse["overviewIssues"];
    truthState?: AdminTruthState;
};

function DeltaBadge({ metric }: { metric: PlatformPulseMetric }) {
    const delta = calculatePlatformPulseDelta(metric.current30dValue, metric.prior30dValue);
    const trend = classifyPlatformPulseTrend(delta);
    const formatted = formatPlatformPulseDelta(delta);
    const tone = trend === "up" || trend === "new"
        ? "text-emerald-300"
        : trend === "down"
            ? "text-rose-300"
            : "text-gray-300";
    const Icon = trend === "up" || trend === "new"
        ? ArrowUpRight
        : trend === "down"
            ? ArrowDownRight
            : ArrowRight;

    return (
        <span
            className={cn("inline-flex items-center gap-1 text-[11px] font-semibold", tone)}
            title={formatted.title}
            aria-label={formatted.ariaLabel}
        >
            <Icon className="h-3.5 w-3.5" />
            {formatted.text}
        </span>
    );
}

function getMetricIcon(metricId: PlatformPulseMetric["id"]) {
    if (metricId === "accounts") return Users;
    if (metricId === "purchases30d") return ShoppingBag;
    if (metricId === "revenue") return DollarSign;
    if (metricId === "supportBugs30d") return Zap;
    if (metricId === "gumdropsCirculation30d") return Zap;
    return Zap;
}

function formatPrimaryValue(value: PlatformPulseMetric["primaryValue"]) {
    if (typeof value === "number") {
        return value.toLocaleString();
    }

    return value;
}

function hasMetricValue(value: PlatformPulseMetric["primaryValue"]) {
    if (typeof value === "number") return Number.isFinite(value);
    return value.trim().length > 0;
}

function buildIssueSummary(issues: AdminOverviewIssueDetail[] | undefined) {
    if (!issues || issues.length === 0) {
        return [];
    }

    return issues.map((issue) => `${issue.source}: ${issue.summary}`);
}

function metricNeedsIssueBadge(metric: PlatformPulseMetric) {
    return Boolean(
        metric.warnings.length > 0
        || (metric.issueState && metric.issueState !== "ok")
        || metric.freshnessState === "review"
        || metric.freshnessState === "stale"
        || metric.freshnessState === "unknown"
        || metric.freshnessState === "blocked"
        || metric.freshnessState === "unavailable",
    );
}

function resolveIssueTruthState(metric: PlatformPulseMetric): AdminTruthState {
    const truthState =
        metric.issueState === "error" ? "failed" :
            metric.issueState && metric.issueState !== "ok" ? metric.issueState :
                metric.freshnessState;

    return resolveAdminMetricTruthState({
        truthState,
        value: metric.primaryValue,
        reviewRequired: metric.issueState === "review" || metric.warnings.length > 0,
    });
}

export function AdminStatsBar({ platformPulse, overviewIssues, truthState }: AdminStatsBarProps) {
    const metrics = (platformPulse ?? []).filter(Boolean);
    const issueSummary = buildIssueSummary(overviewIssues);
    const reviewSummary = issueSummary.length > 0 ? `${issueSummary.length} overview source issue${issueSummary.length === 1 ? "" : "s"}` : undefined;
    const showOverallTruthBadge = Boolean(truthState && truthState !== "live");

    return (
        <div className="space-y-3">
            {showOverallTruthBadge ? (
                <div className="flex items-center justify-end">
                    <AdminTruthBadge
                        state={truthState as AdminTruthState}
                        className="py-0.5"
                        hasUsableValue={metrics.length > 0}
                    />
                </div>
            ) : null}
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3" data-admin-platform-pulse-grid="compact-six">
                {metrics.map((metric) => {
                    const Icon = getMetricIcon(metric.id);
                    const shouldRenderIssue = metricNeedsIssueBadge(metric);
                    const metricTruthState = resolveIssueTruthState(metric);
                    const reviewDecision = shouldRenderIssue
                        ? buildAdminReviewBadge({
                            truthState: metricTruthState,
                            missingRequiredData: metric.issueState === "unavailable",
                            sourceDisagreement: metric.warnings.length > 0 || metric.issueState === "review",
                            staleCriticalSource: metric.freshnessState === "stale" || metric.issueState === "stale",
                            reviewSummary: metric.warnings[0] ?? reviewSummary ?? `${metric.label} needs review.`,
                        })
                        : null;

                    return (
                        <div
                            key={metric.id}
                            data-admin-metric-id={metric.id}
                            data-admin-metric-freshness={metric.freshnessState}
                            data-admin-metric-scope={metric.primaryScope}
                            data-admin-metric-issue-state={metric.issueState ?? "ok"}
                            className="min-w-0"
                        >
                            <AdminMetricCard
                                label={metric.label}
                                value={formatPrimaryValue(metric.primaryValue)}
                                meta={(
                                    <div className="space-y-1">
                                        <DeltaBadge metric={metric} />
                                        {reviewDecision ? (
                                            <div className="min-w-0">
                                                <AdminReviewBadge decision={reviewDecision} className="max-w-full truncate py-0.5" />
                                            </div>
                                        ) : null}
                                    </div>
                                )}
                                truthState={metricTruthState}
                                hasUsableValue={hasMetricValue(metric.primaryValue)}
                                showTruthBadge={shouldRenderIssue}
                                icon={<Icon className="h-3.5 w-3.5 shrink-0 text-brand-purple" />}
                                className="rounded-xl border-white/8 bg-black/35 p-2.5"
                                valueClassName={cn("truncate text-lg leading-none md:text-[1.45rem]", metric.id === "revenue" ? "font-mono" : "")}
                            />
                        </div>
                    );
                })}
            </div>

            {issueSummary.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
                    {issueSummary.map((issue) => (
                        <span
                            key={issue}
                            className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-amber-200"
                            title={issue}
                        >
                            {issue}
                        </span>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
