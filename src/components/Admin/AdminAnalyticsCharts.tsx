"use client";

import { useMemo } from "react";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar
} from "recharts";
import { useAdminOverview } from "@/hooks/useAdminOverview";

interface ChartDataPoint {
    date: string;
    revenue: number;
    unwraps: number;
}

export function AdminAnalyticsCharts() {
    const { data, isLoading } = useAdminOverview();
    const loading = isLoading;
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
                <div className="h-72 md:h-80 bg-white/5 animate-pulse rounded-3xl border border-white/10" />
                <div className="h-72 md:h-80 bg-white/5 animate-pulse rounded-3xl border border-white/10" />
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
            <div className="glass-panel p-4 md:p-6 rounded-3xl border border-white/10">
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

            <div className="glass-panel p-4 md:p-6 rounded-3xl border border-white/10">
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
    );
}
