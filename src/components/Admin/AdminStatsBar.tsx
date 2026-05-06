"use client";

import { ArrowDownRight, ArrowRight, ArrowUpRight, DollarSign, ShoppingBag, Users, Zap } from "lucide-react";

import type { AdminOverviewIssueDetail, AdminOverviewResponse, PlatformPulseMetric } from "@/lib/admin-overview";
import { AdminReviewBadge } from "@/components/Admin/AdminReviewBadge";
import { AdminTruthBadge } from "@/components/Admin/AdminTruthBadge";
import { buildAdminReviewBadge } from "@/lib/behavioral/review-badge-rules";
import type { AdminSurfaceState } from "@/lib/admin-parity";
import { hasUsableAdminTruthValue, resolveAdminTruthState } from "@/lib/admin-truth-state";
import { cn } from "@/lib/utils";

type AdminStatsBarProps = {
    platformPulse?: AdminOverviewResponse["platformPulse"];
    overviewIssues?: AdminOverviewResponse["overviewIssues"];
    truthState: AdminSurfaceState;
};

function formatDelta(metric: PlatformPulseMetric) {
    const deltaPct = metric.deltaPct ?? null;
    if (deltaPct === null) {
        return metric.current30dValue && metric.current30dValue > 0 ? "New" : "0%";
    }

    const absoluteValue = Math.abs(deltaPct);
    if (absoluteValue === 0) {
        return "0%";
    }

    return `${deltaPct > 0 ? "+" : "-"}${absoluteValue.toFixed(absoluteValue >= 10 ? 0 : 1)}%`;
}

function getDeltaDirection(metric: PlatformPulseMetric) {
    const deltaPct = metric.deltaPct ?? null;
    if (deltaPct === null) {
        return metric.current30dValue && metric.current30dValue > 0 ? "up" : "flat";
    }

    if (deltaPct > 0) return "up";
    if (deltaPct < 0) return "down";
    return "flat";
}

function DeltaBadge({ metric }: { metric: PlatformPulseMetric }) {
    const direction = getDeltaDirection(metric);
    const tone = direction === "up"
        ? "text-emerald-300"
        : direction === "down"
            ? "text-rose-300"
            : "text-gray-300";
    const Icon = direction === "up"
        ? ArrowUpRight
        : direction === "down"
            ? ArrowDownRight
            : ArrowRight;

    return (
        <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold", tone)} title={metric.deltaLabel}>
            <Icon className="h-3.5 w-3.5" />
            {formatDelta(metric)}
        </span>
    );
}

function getMetricIcon(metricId: PlatformPulseMetric["id"]) {
    if (metricId === "accounts") return Users;
    if (metricId === "purchases30d") return ShoppingBag;
    if (metricId === "revenue") return DollarSign;
    return Zap;
}

function formatPrimaryValue(value: PlatformPulseMetric["primaryValue"]) {
    if (typeof value === "number") {
        return value.toLocaleString();
    }

    return value;
}

function formatConfidence(confidence: number | null) {
    if (typeof confidence !== "number" || !Number.isFinite(confidence)) {
        return "Confidence unknown";
    }

    return `${Math.round(confidence * 100)}% confidence`;
}

function buildMetricTruthState(metric: PlatformPulseMetric) {
    return resolveAdminTruthState({
        hasUsableValue: hasUsableAdminTruthValue(metric.primaryValue),
        sourceConfigured: true,
        transportState: metric.freshnessState === "review" ? "review" : metric.freshnessState,
        reviewRequired: metric.warnings.length > 0,
    });
}

function buildIssueSummary(issues: AdminOverviewIssueDetail[] | undefined) {
    if (!issues || issues.length === 0) {
        return [];
    }

    return issues.map((issue) => `${issue.source}: ${issue.summary}`);
}

export function AdminStatsBar({ platformPulse, overviewIssues, truthState }: AdminStatsBarProps) {
    const metrics = (platformPulse ?? []).filter(Boolean);
    const issueSummary = buildIssueSummary(overviewIssues);
    const reviewSummary = issueSummary.length > 0 ? `${issueSummary.length} overview source issue${issueSummary.length === 1 ? "" : "s"}` : undefined;

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
                {metrics.map((metric) => {
                    const Icon = getMetricIcon(metric.id);
                    const metricState = buildMetricTruthState(metric);
                    const reviewDecision = buildAdminReviewBadge({
                        truthState: metricState,
                        missingRequiredData: false,
                        staleCriticalSource: metric.freshnessState === "stale",
                        reviewSummary: metric.warnings[0] ?? reviewSummary,
                    });

                    return (
                        <div
                            key={metric.id}
                            className="rounded-[1.35rem] border border-white/8 bg-black/35 px-3.5 py-3.5"
                            data-admin-metric-id={metric.id}
                            data-admin-metric-source={metric.sourceTruth}
                            data-admin-metric-freshness={metric.freshnessState}
                            data-admin-metric-confidence={metric.confidence ?? "unknown"}
                        >
                            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">
                                <Icon className="h-3.5 w-3.5 text-brand-purple" />
                                {metric.label}
                                <span className="ml-auto flex items-center gap-1">
                                    <AdminReviewBadge decision={reviewDecision} className="py-0.5" />
                                    <AdminTruthBadge state={metricState} className="py-0.5" hasUsableValue />
                                </span>
                            </p>
                            <div className="mt-2 flex items-start justify-between gap-2">
                                <p className={cn("text-lg font-black text-white md:text-[1.45rem]", metric.id === "revenue" ? "font-mono" : "")}>
                                    {formatPrimaryValue(metric.primaryValue)}
                                </p>
                                <DeltaBadge metric={metric} />
                            </div>
                            <p className="mt-2 text-[10px] text-gray-400">{metric.subtext}</p>
                            <p className="mt-1 text-[10px] text-gray-500">{metric.deltaLabel}</p>
                            <p className="mt-1 text-[10px] text-gray-500">
                                {metric.lifetimeLabel ?? `${metric.sourceTruth} | ${formatConfidence(metric.confidence)}`}
                            </p>
                            {metric.lifetimeLabel ? (
                                <p className="mt-1 text-[10px] text-gray-500">
                                    {metric.sourceTruth} | {formatConfidence(metric.confidence)}
                                </p>
                            ) : null}
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
