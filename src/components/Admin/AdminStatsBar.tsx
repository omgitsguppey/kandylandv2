"use client";

import { ArrowDownRight, ArrowRight, ArrowUpRight, DollarSign, ShoppingBag, Users, Zap } from "lucide-react";

import { AdminReviewBadge } from "@/components/Admin/AdminReviewBadge";
import { AdminTruthBadge } from "@/components/Admin/AdminTruthBadge";
import type { AdminOverviewIssueDetail, AdminOverviewResponse, PlatformPulseMetric } from "@/lib/admin-overview";
import { calculatePlatformPulseDelta, classifyPlatformPulseTrend, formatPlatformPulseDelta } from "@/lib/admin/platform-pulse-window";
import type { AdminTruthState } from "@/lib/admin-truth-state";
import { resolveAdminMetricTruthState } from "@/lib/admin-truth-state";
import { buildAdminReviewBadge } from "@/lib/behavioral/review-badge-rules";
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
    const tone = trend === "up" || trend === "new" ? "text-emerald-300" : trend === "down" ? "text-rose-300" : "text-gray-300";
    const Icon = trend === "up" || trend === "new" ? ArrowUpRight : trend === "down" ? ArrowDownRight : ArrowRight;
    return <span className={cn("inline-flex items-center gap-1 text-xs font-semibold", tone)} title={formatted.title} aria-label={formatted.ariaLabel}><Icon className="h-3.5 w-3.5" />{formatted.text}</span>;
}

function getMetricIcon(metricId: PlatformPulseMetric["id"]) {
    if (metricId === "accounts") return Users;
    if (metricId === "purchases30d") return ShoppingBag;
    if (metricId === "revenue") return DollarSign;
    return Zap;
}

function formatPrimaryValue(value: PlatformPulseMetric["primaryValue"]) {
    return typeof value === "number" ? value.toLocaleString() : value;
}

function hasMetricValue(value: PlatformPulseMetric["primaryValue"]) {
    return typeof value === "number" ? Number.isFinite(value) : value.trim().length > 0;
}

function metricNeedsIssueBadge(metric: PlatformPulseMetric) {
    return Boolean(metric.warnings.length > 0 || (metric.issueState && metric.issueState !== "ok") || ["review", "stale", "unknown", "blocked", "unavailable"].includes(metric.freshnessState));
}

function resolveIssueTruthState(metric: PlatformPulseMetric): AdminTruthState {
    return resolveAdminMetricTruthState({
        truthState: metric.issueState === "error" ? "failed" : metric.issueState && metric.issueState !== "ok" ? metric.issueState : metric.freshnessState,
        value: metric.primaryValue,
        reviewRequired: metric.issueState === "review" || metric.warnings.length > 0,
    });
}

export function AdminStatsBar({ platformPulse, overviewIssues, truthState }: AdminStatsBarProps) {
    const metrics = (platformPulse ?? []).filter(Boolean);
    const issueSummary = (overviewIssues ?? []).map((issue: AdminOverviewIssueDetail) => `${issue.source}: ${issue.summary}`);

    return (
        <div className="space-y-3" data-admin-platform-pulse-grid="soft-ui-matrix">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">Platform signals</p>
                {truthState && truthState !== "live" ? <AdminTruthBadge state={truthState} hasUsableValue={metrics.length > 0} /> : null}
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {metrics.map((metric) => {
                    const Icon = getMetricIcon(metric.id);
                    const needsReview = metricNeedsIssueBadge(metric);
                    const metricTruthState = resolveIssueTruthState(metric);
                    const reviewDecision = needsReview ? buildAdminReviewBadge({
                        truthState: metricTruthState,
                        missingRequiredData: metric.issueState === "unavailable",
                        sourceDisagreement: metric.warnings.length > 0 || metric.issueState === "review",
                        staleCriticalSource: metric.freshnessState === "stale" || metric.issueState === "stale",
                        reviewSummary: metric.warnings[0] ?? `${metric.label} needs review.`,
                    }) : null;
                    return (
                        <article
                            key={metric.id}
                            data-admin-metric-freshness={metric.freshnessState}
                            data-admin-metric-id={metric.id}
                            data-admin-metric-issue-state={metric.issueState ?? "ok"}
                            data-admin-metric-scope={metric.primaryScope}
                            className="min-w-0 rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-black/25 p-3 shadow-inner shadow-black/15"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex min-w-0 items-center gap-2"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-brand-purple/25 bg-brand-purple/10"><Icon className="h-4 w-4 text-kandy-lilac" /></span><p className="truncate text-xs font-bold uppercase tracking-[0.12em] text-gray-400">{metric.label}</p></div>
                                {needsReview ? <AdminTruthBadge state={metricTruthState} hasUsableValue={hasMetricValue(metric.primaryValue)} /> : null}
                            </div>
                            <p className={cn("mt-4 truncate text-2xl font-black tracking-tight text-white", metric.id === "revenue" ? "font-mono" : "")}>{formatPrimaryValue(metric.primaryValue)}</p>
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2"><DeltaBadge metric={metric} /><span className="text-xs font-medium text-gray-500">{metric.primaryScope} / {metric.freshnessState}</span></div>
                            {reviewDecision ? <AdminReviewBadge decision={reviewDecision} className="mt-3 max-w-full" /> : null}
                        </article>
                    );
                })}
            </div>
            {issueSummary.length > 0 ? <aside className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-amber-100"><p className="font-bold">Source issues require review</p><div className="mt-2 grid gap-1">{issueSummary.map((issue) => <p key={issue} className="text-xs leading-5 text-amber-100/85">{issue}</p>)}</div></aside> : null}
        </div>
    );
}
