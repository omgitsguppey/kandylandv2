"use client";

import { DisclosureSummary } from "@/components/ui/disclosure";
import { Disclosure } from "@/components/ui/disclosure";


import { ArrowDownRight, ArrowRight, ArrowUpRight, DollarSign, ShoppingBag, Users, Zap } from "lucide-react";

import { AdminReviewBadge } from "@/components/Admin/AdminReviewBadge";
import { AdminMetricCard } from "@/components/Admin/AdminMetricCard";
import { AdminTruthBadge } from "@/components/Admin/AdminTruthBadge";
import type { AdminOverviewIssueDetail, AdminOverviewResponse, PlatformPulseMetric } from "@/lib/admin-overview";
import { calculatePlatformPulseDelta, classifyPlatformPulseTrend, formatPlatformPulseDelta } from "@/lib/admin/platform-pulse-window";
import type { AdminTruthState } from "@/lib/admin-truth-state";
import { resolveAdminInputTruthState } from "@/lib/admin-truth-state";
import { buildAdminReviewBadge } from "@/lib/behavioral/review-badge-rules";
import { cn } from "@/lib/utils";

type AdminStatsBarProps = {
    platformPulse?: AdminOverviewResponse["platformPulse"];
    overviewIssues?: AdminOverviewResponse["overviewIssues"];
    truthState?: AdminTruthState;
};

function DeltaBadge({ metric }: { metric: PlatformPulseMetric }) {
    if (metric.current30dValue === null || metric.prior30dValue === null) return null;
    const delta = calculatePlatformPulseDelta(metric.current30dValue, metric.prior30dValue);
    const trend = classifyPlatformPulseTrend(delta);
    const formatted = formatPlatformPulseDelta(delta);
    const tone = trend === "up" || trend === "new" ? "text-success" : trend === "down" ? "text-destructive" : "text-muted-foreground";
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
    if (value === null) return "Unavailable";
    return typeof value === "number" ? value.toLocaleString() : value;
}

function metricNeedsIssueBadge(metric: PlatformPulseMetric) {
    return Boolean(metric.warnings.length > 0 || (metric.issueState && metric.issueState !== "ok") || ["review", "stale", "unknown", "blocked", "unavailable"].includes(metric.freshnessState));
}

function resolveMetricInput(metric: PlatformPulseMetric) {
    return resolveAdminInputTruthState({
        truthState: metric.freshnessState === "unavailable" || metric.freshnessState === "unknown"
            ? "unavailable"
            : metric.issueState === "error" ? "failed" : metric.issueState && metric.issueState !== "ok" ? metric.issueState : metric.freshnessState,
        value: metric.primaryValue,
        reviewRequired: metric.issueState === "review" || metric.warnings.length > 0,
    });
}

export function AdminStatsBar({ platformPulse, overviewIssues, truthState }: AdminStatsBarProps) {
    const metrics = (platformPulse ?? []).filter(Boolean);
    const issueSummary = (overviewIssues ?? []).map((issue: AdminOverviewIssueDetail) => `${issue.source}: ${issue.summary}`);

    return (
        <div className="min-w-0 space-y-3">
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-muted-foreground">Platform signals</p>
                {truthState && truthState !== "live" ? <AdminTruthBadge state={truthState} hasUsableValue={metrics.some((metric) => resolveMetricInput(metric).hasUsableValue)} /> : null}
            </div>
            <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))] gap-3" data-admin-platform-pulse-grid="compact-six">
                {metrics.map((metric) => {
                    const Icon = getMetricIcon(metric.id);
                    const needsReview = metricNeedsIssueBadge(metric);
                    const { truthState: metricTruthState, hasUsableValue } = resolveMetricInput(metric);
                    const reviewDecision = needsReview && hasUsableValue ? buildAdminReviewBadge({
                        truthState: metricTruthState,
                        missingRequiredData: metric.issueState === "unavailable",
                        sourceDisagreement: metric.sourceTruth === "mixed" && metric.issueState === "review",
                        staleCriticalSource: metric.freshnessState === "stale" || metric.issueState === "stale",
                        reviewSummary: metric.warnings[0] ?? `${metric.label} needs review.`,
                    }) : null;
                    const shouldRenderIssue = needsReview && !reviewDecision;
                    return (
                        <article
                            key={metric.id}
                            data-admin-metric-freshness={metric.freshnessState}
                            data-admin-metric-id={metric.id}
                            data-admin-metric-issue-state={metric.issueState ?? "ok"}
                            data-admin-metric-scope={metric.primaryScope}
                            className="min-w-0"
                        >
                            <AdminMetricCard
                                label={metric.label}
                                value={hasUsableValue ? formatPrimaryValue(metric.primaryValue) : "Unavailable"}
                                truthState={metricTruthState}
                                hasUsableValue={hasUsableValue}
                                showTruthBadge={shouldRenderIssue}
                                icon={<Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-kandy-lilac" />}
                                valueClassName={hasUsableValue ? undefined : "text-sm md:text-base text-muted-foreground"}
                                meta={hasUsableValue ? <DeltaBadge metric={metric} /> : undefined}
                                auxiliaryBadges={reviewDecision ? <AdminReviewBadge decision={reviewDecision} className="max-w-full" /> : undefined}
                            />
                        </article>
                    );
                })}
            </div>
            {issueSummary.length > 0 ? (
                <Disclosure className="min-w-0 rounded-xl border border-warning/20 bg-warning/10 p-3 text-sm text-warning">
                    <DisclosureSummary className="min-h-11 cursor-pointer content-center font-bold">Source details ({issueSummary.length})</DisclosureSummary>
                    <div className="mt-2 grid min-w-0 gap-1">{issueSummary.map((issue) => <p key={issue} className="break-words text-xs leading-5 text-warning/85">{issue}</p>)}</div>
                </Disclosure>
            ) : null}
        </div>
    );
}
