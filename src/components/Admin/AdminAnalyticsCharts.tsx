"use client";

import { useMemo, useState } from "react";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar
} from "recharts";
import { useAdminOverview } from "@/hooks/useAdminOverview";
import { trackEvent } from "@/lib/telemetry";

interface ChartDataPoint {
    date: string;
    revenue: number;
    unwraps: number;
}

export function AdminAnalyticsCharts() {
    const { data, isLoading } = useAdminOverview();
    const loading = isLoading;
    const [chartView, setChartView] = useState<"revenue" | "unwraps">("revenue");
    const chartData = useMemo<ChartDataPoint[]>(
        () => (data?.chartData || []).map((entry) => ({
            date: entry.date,
            revenue: entry.revenue,
            unwraps: entry.unwraps,
        })),
        [data],
    );

    if (loading) {
        return (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                <div className="h-64 animate-pulse rounded-[1.6rem] border border-white/10 bg-white/5 md:h-72" />
                <div className="h-64 animate-pulse rounded-[1.6rem] border border-white/10 bg-white/5 md:h-72" />
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 p-2">
                <p className="px-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-500">Trend focus</p>
                <div className="inline-flex items-center gap-1 rounded-xl bg-black/40 p-1">
                    <button
                        type="button"
                        onClick={() => {
                            setChartView("revenue");
                            trackEvent("admin_chart_view_changed", { view: "revenue" });
                        }}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${chartView === "revenue" ? "bg-brand-purple/25 text-white" : "text-gray-400"}`}
                    >
                        Revenue
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setChartView("unwraps");
                            trackEvent("admin_chart_view_changed", { view: "unwraps" });
                        }}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${chartView === "unwraps" ? "bg-pink-500/25 text-white" : "text-gray-400"}`}
                    >
                        Unwraps
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
            <div className={`glass-panel rounded-[1.6rem] border border-white/10 p-3.5 md:p-5 ${chartView === "unwraps" ? "hidden md:block" : ""}`}>
                <h3 className="text-white font-bold mb-4 md:mb-6 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-brand-purple shadow-[0_0_10px_#d946ef]" />
                    30-Day Revenue
                </h3>
                <div className="h-56 md:h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#d946ef" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#d946ef" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis dataKey="date" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} minTickGap={30} />
                            <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => "$" + value} />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white' }}
                                itemStyle={{ color: '#d946ef', fontWeight: 'bold' }}
                                formatter={(value: any) => ["$" + Number(value).toFixed(2), "Revenue"]}
                            />
                            <Area type="monotone" dataKey="revenue" stroke="#d946ef" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className={`glass-panel rounded-[1.6rem] border border-white/10 p-3.5 md:p-5 ${chartView === "revenue" ? "hidden md:block" : ""}`}>
                <h3 className="text-white font-bold mb-4 md:mb-6 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-pink-500 shadow-[0_0_10px_#ec4899]" />
                    30-Day Unwraps
                </h3>
                <div className="h-56 md:h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis dataKey="date" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} minTickGap={30} />
                            <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white' }}
                                itemStyle={{ color: '#ec4899', fontWeight: 'bold' }}
                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                            />
                            <Bar dataKey="unwraps" fill="#ec4899" radius={[4, 4, 0, 0]} name="Total Unwraps" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
            </div>
        </div>
    );
}
