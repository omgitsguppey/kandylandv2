"use client";

import { useMemo, useState } from "react";
import {
    Area,
    Bar,
    CartesianGrid,
    ComposedChart,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

import type { Drop } from "@/types/db";
import type { AdminOverviewResponse } from "@/lib/admin-overview";
import { calculateOverviewMetricDelta } from "@/lib/admin-overview";
import { trackEvent } from "@/lib/telemetry";
import { AdminStatusBadge } from "@/components/Admin/AdminStatusBadge";
import type { AdminSurfaceState } from "@/lib/admin-parity";
import { TopDropsTable } from "./TopDropsTable";

/* ── Canonical color tokens ─────────────────────────────────────────────── */

/** KandyDrops canonical accent — matches --color-brand-purple in globals.css */
const CHART_PURPLE = "#b28cff";
/** Lighter tint for the secondary dataset (unwraps) */
const CHART_PURPLE_LIGHT = "#d8b4fe";

/* ── Time range definitions ─────────────────────────────────────────────── */

type TimeRangeKey = "24h" | "7d" | "14d" | "30d" | "all";

const TIME_RANGE_OPTIONS: { key: TimeRangeKey; label: string; shortLabel: string; days: number | null }[] = [
    { key: "24h", label: "Last 24 hours", shortLabel: "24h", days: 1 },
    { key: "7d", label: "Last 7 days", shortLabel: "7d", days: 7 },
    { key: "14d", label: "Last 14 days", shortLabel: "14d", days: 14 },
    { key: "30d", label: "Last 30 days", shortLabel: "30d", days: 30 },
    { key: "all", label: "All time", shortLabel: "All", days: null },
];

/* ── Props ──────────────────────────────────────────────────────────────── */

type AdminAnalyticsChartsProps = {
    chartData: AdminOverviewResponse["chartData"];
    trendSummary: AdminOverviewResponse["trendSummary"];
    topDrops: Drop[];
    truthLabel: string;
    truthVariant: AdminSurfaceState;
    loading?: boolean;
};

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function formatDeltaSummary(current: number, previous: number) {
    const delta = calculateOverviewMetricDelta(current, previous);

    if (delta.percentChange === null) {
        return previous === 0 && current > 0 ? "New activity" : "No prior activity";
    }

    if (delta.percentChange === 0) {
        return "Flat";
    }

    const sign = delta.percentChange > 0 ? "+" : "-";
    const absoluteValue = Math.abs(delta.percentChange);
    return `${sign}${absoluteValue.toFixed(absoluteValue >= 10 ? 0 : 1)}%`;
}

/** Filter chartData to the last N days. Returns all data if days is null. */
function filterChartByRange(
    chartData: AdminOverviewResponse["chartData"],
    days: number | null,
) {
    if (days === null || days >= chartData.length) return chartData;
    return chartData.slice(-days);
}

/** Re-aggregate metrics from a filtered chart slice. */
function aggregateFromChart(filtered: AdminOverviewResponse["chartData"]) {
    let revenueCents = 0;
    let unwraps = 0;
    let revenueActiveDays = 0;
    let bestRevenueDay: { label: string; value: number } | null = null;
    let bestUnwrapDay: { label: string; value: number } | null = null;

    for (const day of filtered) {
        const revCents = Math.round(day.revenue * 100);
        revenueCents += revCents;
        unwraps += day.unwraps;
        if (day.revenue > 0) revenueActiveDays += 1;
        if (!bestRevenueDay || day.revenue > bestRevenueDay.value) {
            bestRevenueDay = { label: day.date, value: day.revenue };
        }
        if (!bestUnwrapDay || day.unwraps > bestUnwrapDay.value) {
            bestUnwrapDay = { label: day.date, value: day.unwraps };
        }
    }

    // Ensure we don't claim a "best" day with zero
    if (bestRevenueDay && bestRevenueDay.value <= 0) bestRevenueDay = null;
    if (bestUnwrapDay && bestUnwrapDay.value <= 0) bestUnwrapDay = null;

    return { revenueCents, unwraps, revenueActiveDays, bestRevenueDay, bestUnwrapDay };
}

/** Build previous-window aggregates from the complement of the filtered range. */
function aggregatePreviousWindow(
    chartData: AdminOverviewResponse["chartData"],
    days: number | null,
) {
    if (days === null || days >= chartData.length) {
        return { prevRevenueCents: 0, prevUnwraps: 0, hasPrior: false };
    }
    const priorSlice = chartData.slice(
        Math.max(0, chartData.length - days * 2),
        chartData.length - days,
    );
    if (priorSlice.length === 0) {
        return { prevRevenueCents: 0, prevUnwraps: 0, hasPrior: false };
    }
    let prevRevenueCents = 0;
    let prevUnwraps = 0;
    for (const day of priorSlice) {
        prevRevenueCents += Math.round(day.revenue * 100);
        prevUnwraps += day.unwraps;
    }
    return { prevRevenueCents, prevUnwraps, hasPrior: true };
}

/* ── Truth chip styles ───────────────────────────────────────────────────── */

/* ── Component ───────────────────────────────────────────────────────────── */

export function AdminAnalyticsCharts({
    chartData,
    trendSummary,
    topDrops,
    truthLabel,
    truthVariant,
    loading = false,
}: AdminAnalyticsChartsProps) {
    const [timeRange, setTimeRange] = useState<TimeRangeKey>("30d");

    const selectedOption = TIME_RANGE_OPTIONS.find((o) => o.key === timeRange)!;

    const filteredChart = useMemo(
        () => filterChartByRange(chartData, selectedOption.days),
        [chartData, selectedOption.days],
    );

    const currentAgg = useMemo(() => aggregateFromChart(filteredChart), [filteredChart]);
    const previousAgg = useMemo(
        () => aggregatePreviousWindow(chartData, selectedOption.days),
        [chartData, selectedOption.days],
    );

    const chartHasData = useMemo(
        () => filteredChart.some((entry) => entry.revenue > 0 || entry.unwraps > 0),
        [filteredChart],
    );

    /* For the full 30d range, prefer the server-computed trendSummary (canonical). 
       For shorter ranges, use the client-side re-aggregation. */
    const isFullWindow = timeRange === "30d";
    const revenueTotal = isFullWindow
        ? `$${(trendSummary.currentRevenueCents / 100).toFixed(2)}`
        : `$${(currentAgg.revenueCents / 100).toFixed(2)}`;
    const unwrapTotal = isFullWindow
        ? trendSummary.currentUnwraps.toLocaleString()
        : currentAgg.unwraps.toLocaleString();
    const revenueDelta = isFullWindow
        ? formatDeltaSummary(trendSummary.currentRevenueCents, trendSummary.previousRevenueCents)
        : previousAgg.hasPrior
            ? formatDeltaSummary(currentAgg.revenueCents, previousAgg.prevRevenueCents)
            : "No prior window";
    const unwrapDelta = isFullWindow
        ? formatDeltaSummary(trendSummary.currentUnwraps, trendSummary.previousUnwraps)
        : previousAgg.hasPrior
            ? formatDeltaSummary(currentAgg.unwraps, previousAgg.prevUnwraps)
            : "No prior window";

    const bestRevDay = isFullWindow
        ? trendSummary.bestRevenueDay
            ? `${trendSummary.bestRevenueDay.label} · $${trendSummary.bestRevenueDay.value.toFixed(2)}`
            : "No revenue days yet"
        : currentAgg.bestRevenueDay
            ? `${currentAgg.bestRevenueDay.label} · $${currentAgg.bestRevenueDay.value.toFixed(2)}`
            : "No revenue days yet";

    const bestUnwrapDay = isFullWindow
        ? trendSummary.bestUnwrapDay
            ? `${trendSummary.bestUnwrapDay.label} · ${trendSummary.bestUnwrapDay.value.toLocaleString()}`
            : "No unwrap days yet"
        : currentAgg.bestUnwrapDay
            ? `${currentAgg.bestUnwrapDay.label} · ${currentAgg.bestUnwrapDay.value.toLocaleString()}`
            : "No unwrap days yet";

    const salesDays = isFullWindow
        ? `${trendSummary.revenueActiveDays} of ${trendSummary.windowDays}`
        : `${currentAgg.revenueActiveDays} of ${filteredChart.length}`;

    const windowLabel = timeRange === "all" ? "All available chart rows" : selectedOption.label;

    const metricCards = [
        { label: "Revenue", value: revenueTotal, sub: revenueDelta },
        { label: "Unwraps", value: unwrapTotal, sub: unwrapDelta },
        { label: "Best revenue day", value: bestRevDay },
        { label: "Best unwrap day", value: bestUnwrapDay },
        { label: "Days with sales", value: salesDays },
        {
            label: "Top drop",
            value: trendSummary.topUnlockDrop
                ? `${trendSummary.topUnlockDrop.title}`
                : "—",
            sub: trendSummary.topUnlockDrop
                ? `${trendSummary.topUnlockDrop.unwraps.toLocaleString()} unwraps`
                : undefined,
        },
    ];

    if (loading) {
        return <div className="h-[18rem] animate-pulse rounded-[1.4rem] border border-white/10 bg-white/5" />;
    }

    return (
        <div className="space-y-2.5">
            {/* ── Top row: time-range filter + truth chip ─────────── */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex items-center gap-0.5 rounded-full border border-white/10 bg-black/35 p-0.5">
                    {TIME_RANGE_OPTIONS.map((opt) => (
                        <button
                            key={opt.key}
                            type="button"
                            onClick={() => {
                                setTimeRange(opt.key);
                                trackEvent("admin_revenue_range_changed", { range: opt.key });
                                trackEvent("admin_chart_view_changed", {
                                    chart: "revenue_unwraps",
                                    range: opt.key,
                                });
                            }}
                            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                                timeRange === opt.key
                                    ? "bg-brand-purple/20 text-white"
                                    : "text-gray-500 hover:text-gray-300"
                            }`}
                        >
                            {opt.shortLabel}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                    <AdminStatusBadge state={truthVariant} className="py-0.5" />
                    <span>{truthLabel}</span>
                </div>
            </div>

            {/* ── Window label ─────────────────────────────────────── */}
            <p className="text-[10px] font-medium text-gray-500">{windowLabel}</p>

            {/* ── Metric cards ─────────────────────────────────────── */}
            <div className="grid grid-cols-3 gap-1.5 xl:grid-cols-6">
                {metricCards.map((card) => (
                    <div key={card.label} className="rounded-xl border border-white/8 bg-black/30 px-2.5 py-2">
                        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-gray-500">{card.label}</p>
                        <p className="mt-0.5 truncate text-xs font-bold text-white">{card.value}</p>
                        {card.sub ? (
                            <p className="mt-0.5 text-[9px] font-medium text-gray-400">{card.sub}</p>
                        ) : null}
                    </div>
                ))}
            </div>

            {/* ── Combined chart ────────────────────────────────────── */}
            {!chartHasData ? (
                <div className="rounded-xl border border-white/8 bg-black/25 px-4 py-6 text-center">
                    <div className="flex flex-col items-center gap-2 text-[11px] font-semibold text-gray-400">
                        <AdminStatusBadge state={truthVariant} />
                        <span>No revenue or unwrap activity in this window.</span>
                    </div>
                </div>
            ) : (
                <div className="rounded-xl border border-white/8 bg-black/30 p-3 md:p-3.5">
                    <div className="h-[13rem] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={filteredChart} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={CHART_PURPLE} stopOpacity={0.28} />
                                        <stop offset="95%" stopColor={CHART_PURPLE} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    stroke="#6b7280"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    minTickGap={28}
                                />
                                <YAxis
                                    yAxisId="revenue"
                                    stroke="#6b7280"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `$${value}`}
                                />
                                <YAxis
                                    yAxisId="unwraps"
                                    orientation="right"
                                    stroke="#6b7280"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    allowDecimals={false}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "rgba(0,0,0,0.88)",
                                        borderColor: "rgba(255,255,255,0.12)",
                                        borderRadius: "10px",
                                        color: "white",
                                        fontSize: "11px",
                                    }}
                                    formatter={(value, name) => {
                                        if (name === "Revenue") return [`$${Number(value ?? 0).toFixed(2)}`, "Revenue"];
                                        return [Number(value ?? 0).toLocaleString(), "Unwraps"];
                                    }}
                                />
                                <Legend
                                    iconType="circle"
                                    iconSize={6}
                                    wrapperStyle={{ fontSize: "10px", color: "#9ca3af", paddingTop: "4px" }}
                                />
                                <Bar
                                    yAxisId="unwraps"
                                    dataKey="unwraps"
                                    name="Unwraps"
                                    fill={CHART_PURPLE_LIGHT}
                                    fillOpacity={0.5}
                                    radius={[3, 3, 0, 0]}
                                />
                                <Area
                                    yAxisId="revenue"
                                    type="monotone"
                                    dataKey="revenue"
                                    name="Revenue"
                                    stroke={CHART_PURPLE}
                                    strokeWidth={2.2}
                                    fillOpacity={1}
                                    fill="url(#revenueGradient)"
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* ── Top drops table ─────────────────────────────────── */}
            <TopDropsTable
                drops={topDrops}
                timeRangeKey={timeRange}
            />
        </div>
    );
}
