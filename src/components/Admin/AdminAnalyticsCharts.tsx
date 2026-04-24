"use client";

import { useMemo, useState } from "react";
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

import type { AdminOverviewResponse } from "@/lib/admin-overview";
import { calculateOverviewMetricDelta } from "@/lib/admin-overview";
import { trackEvent } from "@/lib/telemetry";

type AdminAnalyticsChartsProps = {
    chartData: AdminOverviewResponse["chartData"];
    trendSummary: AdminOverviewResponse["trendSummary"];
    issueCount: number;
    loading?: boolean;
};

function formatDeltaSummary(current: number, previous: number, suffix = "") {
    const delta = calculateOverviewMetricDelta(current, previous);

    if (delta.percentChange === null) {
        return previous === 0 && current > 0 ? `New${suffix}` : `No change${suffix}`;
    }

    if (delta.percentChange === 0) {
        return `Flat${suffix}`;
    }

    const sign = delta.percentChange > 0 ? "+" : "-";
    const absoluteValue = Math.abs(delta.percentChange);
    return `${sign}${absoluteValue.toFixed(absoluteValue >= 10 ? 0 : 1)}%${suffix}`;
}

export function AdminAnalyticsCharts({
    chartData,
    trendSummary,
    issueCount,
    loading = false,
}: AdminAnalyticsChartsProps) {
    const [chartView, setChartView] = useState<"revenue" | "unwraps">("revenue");

    const chartHasData = useMemo(
        () => chartData.some((entry) => entry.revenue > 0 || entry.unwraps > 0),
        [chartData],
    );

    const supportCards = useMemo(() => {
        if (chartView === "revenue") {
            return [
                {
                    label: "Window total",
                    value: `$${(trendSummary.currentRevenueCents / 100).toFixed(2)}`,
                },
                {
                    label: "Vs prior window",
                    value: formatDeltaSummary(trendSummary.currentRevenueCents, trendSummary.previousRevenueCents),
                },
                {
                    label: "Best day",
                    value: trendSummary.bestRevenueDay
                        ? `${trendSummary.bestRevenueDay.label} · $${trendSummary.bestRevenueDay.value.toFixed(2)}`
                        : "No revenue days yet",
                },
                {
                    label: "Active days",
                    value: `${trendSummary.revenueActiveDays} of ${trendSummary.windowDays}`,
                },
            ];
        }

        return [
            {
                label: "Window unwraps",
                value: trendSummary.currentUnwraps.toLocaleString(),
            },
            {
                label: "Vs prior window",
                value: formatDeltaSummary(trendSummary.currentUnwraps, trendSummary.previousUnwraps),
            },
            {
                label: "Best day",
                value: trendSummary.bestUnwrapDay
                    ? `${trendSummary.bestUnwrapDay.label} · ${trendSummary.bestUnwrapDay.value.toLocaleString()}`
                    : "No unwrap days yet",
            },
            {
                label: "Strongest driver",
                value: trendSummary.topUnlockDrop
                    ? `${trendSummary.topUnlockDrop.title} · ${trendSummary.topUnlockDrop.unwraps.toLocaleString()}`
                    : "No drop-level unwrap lead yet",
            },
        ];
    }, [chartView, trendSummary]);

    if (loading) {
        return <div className="h-[22rem] animate-pulse rounded-[1.4rem] border border-white/10 bg-white/5" />;
    }

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
                    <span className="rounded-full border border-white/10 bg-black/30 px-2.5 py-1">
                        Last {trendSummary.windowDays} days
                    </span>
                    {issueCount > 0 ? (
                        <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-amber-200">
                            {issueCount} read issue{issueCount === 1 ? "" : "s"}
                        </span>
                    ) : null}
                </div>
                <div className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-black/35 p-1">
                    <button
                        type="button"
                        onClick={() => {
                            setChartView("revenue");
                            trackEvent("admin_chart_view_changed", { view: "revenue" });
                        }}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${chartView === "revenue" ? "bg-brand-purple/20 text-white" : "text-gray-400"}`}
                    >
                        Revenue view
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setChartView("unwraps");
                            trackEvent("admin_chart_view_changed", { view: "unwraps" });
                        }}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${chartView === "unwraps" ? "bg-brand-purple/20 text-white" : "text-gray-400"}`}
                    >
                        Unwrap view
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
                {supportCards.map((card) => (
                    <div key={card.label} className="rounded-[1.25rem] border border-white/8 bg-black/30 px-3 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">{card.label}</p>
                        <p className="mt-1 text-sm font-bold text-white">{card.value}</p>
                    </div>
                ))}
            </div>

            {!chartHasData ? (
                <div className="rounded-[1.35rem] border border-white/8 bg-black/25 px-4 py-8 text-center">
                    <p className="text-[11px] font-semibold text-gray-400">No overview trend data is available for this window.</p>
                </div>
            ) : (
                <div className="rounded-[1.45rem] border border-white/8 bg-black/30 p-3.5 md:p-4">
                    <div className="h-[17rem] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            {chartView === "revenue" ? (
                                <AreaChart data={chartData} margin={{ top: 12, right: 8, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="overviewRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#d946ef" stopOpacity={0.28} />
                                            <stop offset="95%" stopColor="#d946ef" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <XAxis dataKey="date" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} minTickGap={22} />
                                    <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "rgba(0,0,0,0.85)",
                                            borderColor: "rgba(255,255,255,0.12)",
                                            borderRadius: "12px",
                                            color: "white",
                                        }}
                                        itemStyle={{ color: "#d946ef", fontWeight: "bold" }}
                                        formatter={(value) => [`$${Number(value ?? 0).toFixed(2)}`, "Revenue"]}
                                    />
                                    <Area type="monotone" dataKey="revenue" stroke="#d946ef" strokeWidth={2.6} fillOpacity={1} fill="url(#overviewRevenueGradient)" />
                                </AreaChart>
                            ) : (
                                <BarChart data={chartData} margin={{ top: 12, right: 8, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <XAxis dataKey="date" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} minTickGap={22} />
                                    <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "rgba(0,0,0,0.85)",
                                            borderColor: "rgba(255,255,255,0.12)",
                                            borderRadius: "12px",
                                            color: "white",
                                        }}
                                        itemStyle={{ color: "#f472b6", fontWeight: "bold" }}
                                        formatter={(value) => [Number(value ?? 0).toLocaleString(), "Unwraps"]}
                                    />
                                    <Bar dataKey="unwraps" fill="#f472b6" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    );
}
