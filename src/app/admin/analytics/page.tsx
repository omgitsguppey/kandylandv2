"use client";

import { useState, useEffect } from "react";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell
} from 'recharts';
import { Loader2, Users, Eye, Activity, RefreshCw, BarChart3, MapPin, Trophy, FileText, BarChart2 } from "lucide-react";

type TimeFilter = "live" | "24h" | "7d" | "30d" | "all";

export default function AdminAnalyticsPage() {
    const [filter, setFilter] = useState<TimeFilter>("30d");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [needsSetup, setNeedsSetup] = useState(false);

    // Data states
    const [liveActive, setLiveActive] = useState(0);
    const [eventsData, setEventsData] = useState<any>({});
    const [geoData, setGeoData] = useState<any[]>([]);
    const [pagesData, setPagesData] = useState<any[]>([]);
    const [topDropsData, setTopDropsData] = useState<any[]>([]);

    const loadData = async (currentFilter: TimeFilter) => {
        setLoading(true);
        setError(null);
        try {
            const isLive = currentFilter === "live";
            const url = isLive
                ? `/api/admin/analytics?type=realtime`
                : `/api/admin/analytics?type=historical&period=${currentFilter}`;

            const response = await authFetch(url);
            const data = await response.json();

            if (!response.ok) {
                if (data.requiresSetup) setNeedsSetup(true);
                throw new Error(data.error || "Failed to load analytics");
            }

            if (isLive) {
                setLiveData(data.data || []);
                setLiveActive(data.totalActive || 0);
            } else {
                setChartData(data.data || []);
                setTotals(data.totals || { users: 0, views: 0, sessions: 0, newUsers: 0, avgSessionDuration: 0, engagementRate: 0 });
                setEventsData(data.events || {});
                setGeoData(data.geo || []);
                setPagesData(data.pages || []);
                setTopDropsData(data.topDrops || []);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData(filter);

        let interval: NodeJS.Timeout;
        if (filter === "live") {
            // Poll every 30 seconds for live data
            interval = setInterval(() => loadData("live"), 30000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [filter]);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-black/90 border border-white/10 p-3 rounded-xl shadow-2xl backdrop-blur-md">
                    <p className="text-gray-400 text-xs mb-2 font-medium">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-sm font-bold my-1">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span className="text-white capitalize">{entry.name}:</span>
                            <span className="text-white">{entry.value}</span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    if (needsSetup) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
                <div className="w-16 h-16 bg-red-500/10 text-red-400 rounded-3xl flex items-center justify-center mb-6 border border-red-500/20">
                    <Activity className="w-8 h-8" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-4">Analytics Not Configured</h1>
                <p className="text-gray-400 max-w-md mb-8">
                    To enable the native iOS-styled Analytics Dashboard, you must provide your Google Analytics Property ID in the environment variables.
                </p>
                <div className="glass-panel p-6 rounded-2xl text-left max-w-lg w-full">
                    <p className="text-sm font-bold text-white mb-2">Required .env.local additions:</p>
                    <pre className="bg-black border border-white/10 p-4 rounded-xl text-xs text-brand-pink overflow-x-auto">
                        GA_PROPERTY_ID="123456789"
                    </pre>
                </div>
            </div>
        );
    }

    return (
        <div className="pb-20">
            <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Performance</h1>
                    <p className="text-gray-400">Deep telemetry and user retention tracking.</p>
                </div>
                <div className="flex bg-white/5 p-1 rounded-full border border-white/10">
                    {(["live", "24h", "7d", "30d", "all"] as TimeFilter[]).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${filter === f
                                ? "bg-brand-pink text-white shadow-lg"
                                : "text-gray-400 hover:text-white"
                                }`}
                        >
                            {f === "live" ? "Live" : f === "all" ? "All Time" : f.toUpperCase()}
                        </button>
                    ))}
                </div>
            </header>

            {loading && !chartData.length && !liveData.length ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 text-brand-pink animate-spin" />
                </div>
            ) : error ? (
                <div className="p-6 rounded-3xl bg-red-500/10 border border-red-500/20 text-center">
                    <p className="text-red-400">{error}</p>
                    <button onClick={() => loadData(filter)} className="mt-4 px-4 py-2 bg-red-500/20 rounded-full text-xs font-bold text-red-300 hover:bg-red-500/30 transition-colors">
                        Retry
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Key Metrics Row */}
                    {filter === "live" ? (
                        <div className="glass-panel p-8 rounded-[2rem] border border-white/10 relative overflow-hidden group">
                            <div className="absolute top-6 right-6 flex items-center gap-2">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-cyan opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-cyan"></span>
                                </span>
                                <span className="text-xs text-brand-cyan font-bold uppercase tracking-wider">Updates live</span>
                            </div>
                            <p className="text-gray-400 font-medium mb-1">Active Users</p>
                            <h2 className="text-6xl md:text-8xl font-black text-white tracking-tighter mb-4">{liveActive}</h2>
                            <p className="text-sm text-gray-500">Currently active on the platform (Past 30 mins)</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-6">
                            {/* Primary Metrics (Lavender) */}
                            <div className="glass-panel p-4 md:p-6 rounded-2xl md:rounded-3xl border border-white/10 col-span-1 lg:col-span-2">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-8 h-8 rounded-full bg-brand-pink/20 text-brand-pink flex items-center justify-center">
                                        <Users className="w-4 h-4" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-400">Unique Users</p>
                                </div>
                                <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold text-brand-pink tracking-tight">{totals.users.toLocaleString()}</h3>
                            </div>
                            <div className="glass-panel p-4 md:p-6 rounded-2xl md:rounded-3xl border border-white/10 col-span-1 lg:col-span-2">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-8 h-8 rounded-full bg-brand-pink/20 text-brand-pink flex items-center justify-center">
                                        <Eye className="w-4 h-4" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-400">Page Views</p>
                                </div>
                                <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold text-brand-pink tracking-tight">{totals.views.toLocaleString()}</h3>
                            </div>

                            {/* Secondary Metrics (White) */}
                            <div className="glass-panel p-4 md:p-6 rounded-2xl md:rounded-3xl border border-white/10 col-span-1 lg:col-span-2">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center">
                                        <Activity className="w-4 h-4" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-400">Total Sessions</p>
                                </div>
                                <h3 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{totals.sessions.toLocaleString()}</h3>
                            </div>
                            <div className="glass-panel p-4 md:p-6 rounded-2xl md:rounded-3xl border border-white/10 col-span-1">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center">
                                        <Users className="w-4 h-4" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-400">New Users</p>
                                </div>
                                <h3 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{totals.newUsers.toLocaleString()}</h3>
                            </div>
                            <div className="glass-panel p-4 md:p-6 rounded-2xl md:rounded-3xl border border-white/10 col-span-1">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center">
                                        <Activity className="w-4 h-4" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-400">Engagement</p>
                                </div>
                                <h3 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{(totals.engagementRate * 100).toFixed(1)}%</h3>
                            </div>
                            <div className="glass-panel p-4 md:p-6 rounded-2xl md:rounded-3xl border border-white/10 col-span-1 lg:col-span-3">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center">
                                        <Activity className="w-4 h-4" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-400">Avg Duration</p>
                                </div>
                                <h3 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{Math.floor(totals.avgSessionDuration / 60)}m {Math.round(totals.avgSessionDuration % 60)}s</h3>
                            </div>
                        </div>
                    )}

                    {/* Main Chart */}
                    <div className="glass-panel p-4 md:p-8 rounded-3xl md:rounded-[2rem] border border-white/10">
                        <div className="flex items-center justify-between mb-4 md:mb-8">
                            <h3 className="text-lg font-bold text-white">
                                {filter === "live" ? "Live User Traffic (Past 30m)" : "Engagement Trends"}
                            </h3>
                            {filter === "live" && (
                                <button onClick={() => loadData("live")} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors hidden md:block" title="Manual refresh">
                                    <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
                                </button>
                            )}
                        </div>

                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                {filter === "live" ? (
                                    <BarChart data={liveData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                        <XAxis
                                            dataKey="minute"
                                            stroke="#ffffff40"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(val) => `-${val}m`}
                                        />
                                        <YAxis stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff05' }} />
                                        <Bar dataKey="users" name="Active Users" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                ) : (
                                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#b28cff" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#b28cff" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ffffff" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#ffffff" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                        <XAxis
                                            dataKey="date"
                                            stroke="#ffffff40"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                            minTickGap={30}
                                        />
                                        <YAxis stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Area type="monotone" dataKey="users" name="Unique Users" stroke="#b28cff" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
                                        <Area type="monotone" dataKey="sessions" name="Sessions" stroke="#ffffff" strokeWidth={3} fillOpacity={1} fill="url(#colorSessions)" />
                                    </AreaChart>
                                )}
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Additional Metrics Row */}
                    {filter !== "live" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mt-6">
                            {/* Conversion Funnel */}
                            <div className="glass-panel p-4 md:p-6 rounded-3xl border border-white/10 flex flex-col">
                                <div className="flex items-center gap-2 mb-4 md:mb-6">
                                    <BarChart3 className="w-5 h-5 text-brand-pink" />
                                    <h3 className="text-base md:text-lg font-bold text-white">Drop Conversions</h3>
                                </div>
                                <div className="flex-1 min-h-[200px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={[
                                                { name: "Drop Views", value: eventsData.view_drop_details || 0, color: "#b28cff" },
                                                { name: "Unlocks", value: eventsData.unlock_drop_success || 0, color: "#06b6d4" }
                                            ]}
                                            margin={{ top: 20, right: 10, left: -20, bottom: 0 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                            <XAxis dataKey="name" stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} />
                                            <YAxis stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} />
                                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff05' }} />
                                            <Bar dataKey="value" name="Count" radius={[6, 6, 0, 0]}>
                                                {
                                                    [0, 1].map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={index === 0 ? "#b28cff" : "#06b6d4"} />
                                                    ))
                                                }
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Top Drops Leaderboard */}
                            <div className="glass-panel p-4 md:p-6 rounded-3xl border border-white/10 flex flex-col lg:col-span-2">
                                <div className="flex items-center gap-2 mb-4">
                                    <Trophy className="w-5 h-5 text-yellow-400" />
                                    <h3 className="text-base md:text-lg font-bold text-white">Top Performing Drops</h3>
                                </div>
                                <div className="flex-1 overflow-x-auto custom-scrollbar flex flex-col min-h-[200px]">
                                    <table className="w-full text-left border-collapse min-w-[400px]">
                                        <thead>
                                            <tr className="border-b border-white/10 text-xs text-gray-400">
                                                <th className="font-medium pb-3 pr-4">Drop ID</th>
                                                <th className="font-medium pb-3 pr-4 text-right">Views</th>
                                                <th className="font-medium pb-3 pr-4 text-right">Unlocks</th>
                                                <th className="font-medium pb-3 text-right">Conversion Rate</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {topDropsData.length > 0 ? topDropsData.map((drop, idx) => (
                                                <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                    <td className="py-3 pr-4 text-sm font-bold text-white truncate max-w-[120px]">{drop.dropId}</td>
                                                    <td className="py-3 pr-4 text-sm text-brand-pink text-right">{drop.views.toLocaleString()}</td>
                                                    <td className="py-3 pr-4 text-sm text-brand-cyan text-right">{drop.unlocks.toLocaleString()}</td>
                                                    <td className="py-3 text-sm text-gray-300 text-right">
                                                        {drop.views > 0 ? Math.round((drop.unlocks / drop.views) * 100) : 0}%
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan={4} className="py-8 text-center text-sm text-gray-500">No drop engagement tracked yet.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Page Views */}
                            <div className="glass-panel p-4 md:p-6 rounded-3xl border border-white/10 flex flex-col lg:col-span-2">
                                <div className="flex items-center gap-2 mb-4">
                                    <FileText className="w-5 h-5 text-blue-400" />
                                    <h3 className="text-base md:text-lg font-bold text-white">Top Pages</h3>
                                </div>
                                <div className="space-y-2 overflow-y-auto max-h-[250px] pr-2 custom-scrollbar">
                                    {pagesData.length > 0 ? pagesData.map((page, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                                            <p className="font-mono text-xs md:text-sm text-white truncate max-w-[70%]">{page.path}</p>
                                            <div className="px-3 py-1 bg-white/10 text-white rounded-lg font-bold text-xs md:text-sm">
                                                {page.views.toLocaleString()} <span className="text-gray-400 ml-1 font-normal text-xs">views</span>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="h-full flex items-center justify-center text-sm text-gray-500 py-10">
                                            No page view data available.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Geography */}
                            <div className="glass-panel p-4 md:p-6 rounded-3xl border border-white/10 flex flex-col">
                                <div className="flex items-center gap-2 mb-4">
                                    <MapPin className="w-5 h-5 text-brand-cyan" />
                                    <h3 className="text-base md:text-lg font-bold text-white">Top Active Regions</h3>
                                </div>
                                <div className="space-y-2 overflow-y-auto max-h-[250px] pr-2 custom-scrollbar">
                                    {geoData && geoData.length > 0 ? geoData.map((geo, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                                            <div>
                                                <p className="font-bold text-white text-xs md:text-sm">{geo.city}</p>
                                                <p className="text-[10px] md:text-xs text-gray-400">{geo.country}</p>
                                            </div>
                                            <div className="px-2 md:px-3 py-1 bg-brand-cyan/20 text-brand-cyan rounded-lg font-bold text-xs md:text-sm">
                                                {geo.users.toLocaleString()}
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="h-full flex items-center justify-center text-sm text-gray-500 py-10">
                                            No geolocation data available.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
