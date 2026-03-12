"use client";

import { useState } from "react";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell
} from 'recharts';
import { Loader2, Users, Eye, Activity, RefreshCw, BarChart3, MapPin, Trophy, FileText, DollarSign, ShieldAlert, Clock, AlertTriangle } from "lucide-react";
import { useAuthSWR } from "@/hooks/useAuthSWR";
import Image from "next/image";
import { AdminOnboardingAnalytics } from "@/components/Admin/AdminOnboardingAnalytics";

type TimeFilter = "live" | "24h" | "7d" | "30d" | "all";
type ViewTab = "operations" | "audience" | "commerce" | "security";
type DrillDownState = null | "liveActive" | "uniqueUsers" | "pageViews" | "revenue" | "conversion" | "engagement" | "avgTime";

interface SecurityLog {
    uid: string;
    username: string;
    photoURL?: string;
    ripAttempts: number;
    lastViolation: string;
    lastViolationReason: string;
    lastViolationDropId?: string;
}

interface AnalyticsResponse {
    success: boolean;
    requiresSetup?: boolean;
    error?: string;
    // Live fields
    totalActive?: number;
    deepTrackerActive?: number;
    data?: Array<{ minute?: string; users?: number; date?: string; sessions?: number }>;
    // Historical fields
    totals?: { users: number; views: number; sessions: number; newUsers: number; avgSessionDuration: number; engagementRate: number };
    events?: Record<string, number>;
    geo?: { country: string; city: string; users: number }[];
    pages?: { path: string; views: number; avgTime?: number; engagementRate?: number }[];
    topDrops?: { dropId: string; views: number; unlocks: number }[];
    // Firestore fields
    commerce?: { revenueUsd: number; gdSpent: number; feed?: any[] };
    security?: SecurityLog[];
    rawEvents?: Array<{
        type: string;
        detail?: string;
        targetText?: string;
        targetTag?: string;
        targetId?: string;
        scrollDepthPercent?: number;
        path: string;
        uid: string;
        username?: string;
        userPhoto?: string;
        timestamp: number
    }>;
}

function buildUrl(filter: TimeFilter): string {
    return filter === "live"
        ? `/api/admin/analytics?type=realtime`
        : `/api/admin/analytics?type=historical&period=${filter}`;
}

export default function AdminAnalyticsPage() {
    const [filter, setFilter] = useState<TimeFilter>("30d");
    const [activeTab, setActiveTab] = useState<ViewTab>("operations");
    const [activeDrillDown, setActiveDrillDown] = useState<DrillDownState>(null);

    const { data, error, isLoading, mutate } = useAuthSWR<AnalyticsResponse>(
        buildUrl(filter),
        {
            refreshInterval: filter === "live" || activeTab === "operations" ? 30_000 : 0,
            keepPreviousData: true,
        },
    );

    const needsSetup = (error as { info?: { requiresSetup?: boolean } })?.info?.requiresSetup;

    // Derived Data
    const liveActive = data?.totalActive ?? 0;
    const deepTrackerActive = data?.deepTrackerActive ?? 0;
    const liveData = filter === "live" ? (data?.data ?? []) : [];
    const chartData = filter !== "live" ? (data?.data ?? []) : [];
    const totals = data?.totals ?? { users: 0, views: 0, sessions: 0, newUsers: 0, avgSessionDuration: 0, engagementRate: 0 };
    const eventsData = data?.events ?? {};
    const geoData = data?.geo ?? [];
    const pagesData = data?.pages ?? [];
    const topDropsData = data?.topDrops ?? [];
    const commerceData = data?.commerce ?? { revenueUsd: 0, gdSpent: 0 };
    const securityData = data?.security ?? [];
    const rawEvents = data?.rawEvents ?? [];

    const newSecurityViolations = securityData.filter(log => {
        if (!log.lastViolation) return false;
        const diffHours = (new Date().getTime() - new Date(log.lastViolation).getTime()) / (1000 * 60 * 60);
        return diffHours < 24;
    }).length;

    const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-black/90 border border-white/10 p-3 rounded-xl shadow-2xl backdrop-blur-md">
                    <p className="text-gray-400 text-xs mb-2 font-medium">{label}</p>
                    {payload.map((entry, index) => (
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
                    <pre className="bg-black border border-white/10 p-4 rounded-xl text-xs text-brand-purple overflow-x-auto">
                        GA_PROPERTY_ID=&quot;123456789&quot;
                    </pre>
                </div>
            </div>
        );
    }

    return (
        <div className="pb-28 md:pb-12 min-h-screen flex flex-col pt-4">
            {/* Header & Sticky Tab Bar */}
            <header className="mb-6 sticky top-0 z-50 bg-black/80 backdrop-blur-xl pb-4 border-b border-white/5 md:border-none md:bg-transparent">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        {activeDrillDown ? (
                            <button onClick={() => setActiveDrillDown(null)} className="flex items-center gap-2 text-brand-purple hover:text-white transition-colors mb-2 text-sm font-bold">
                                ← Back to Overview
                            </button>
                        ) : null}
                        <h1 className="text-3xl font-bold text-white mb-1">
                            {activeDrillDown ? "Deep Dive" : "Monitoring Station"}
                        </h1>
                        <p className="text-gray-400 text-sm hidden md:block">Real-time telemetry and platform health.</p>
                    </div>
                    {/* Time Filter - Global for Audience/Commerce */}
                    {(activeTab === "audience" || activeTab === "commerce") && (
                        <div className="flex bg-zinc-900 border border-white/10 rounded-full p-1 overflow-x-auto custom-scrollbar no-scrollbar">
                            {(["24h", "7d", "30d", "all"] as TimeFilter[]).map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${filter === f ? "bg-white text-black shrink-0" : "text-gray-400 hover:text-white shrink-0"}`}
                                >
                                    {f.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Desktop Tabs (Hidden on mobile or during drilldown) */}
                {!activeDrillDown && (
                    <div className="hidden md:flex gap-2 mt-6 p-1 bg-zinc-900 rounded-2xl w-fit border border-white/5">
                        {[
                            { id: "operations", icon: <Activity className="w-4 h-4" />, label: "Operations" },
                            { id: "audience", icon: <Users className="w-4 h-4" />, label: "Audience" },
                            { id: "commerce", icon: <DollarSign className="w-4 h-4" />, label: "Commerce" },
                            { id: "security", icon: <ShieldAlert className="w-4 h-4" />, label: "Security" },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveTab(tab.id as ViewTab);
                                    if (tab.id === "operations") setFilter("live");
                                    else if (filter === "live") setFilter("30d");
                                }}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === tab.id ? "bg-white text-black shadow-md" : "text-gray-400 hover:text-white"}`}
                            >
                                {tab.icon} {tab.label}
                                {tab.id === "security" && newSecurityViolations > 0 && (
                                    <span className="w-2 h-2 rounded-full bg-red-500 ml-1 mt-0.5 animate-pulse" />
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </header>

            {/* Error State */}
            {error && !needsSetup && (
                <div className="p-4 rounded-3xl bg-red-500/10 border border-red-500/20 text-center mb-6">
                    <p className="text-red-400 text-sm font-medium">{error.message}</p>
                    <button onClick={() => mutate()} className="mt-3 px-4 py-2 bg-red-500/20 rounded-full text-xs font-bold text-red-300 hover:bg-red-500/30 transition-colors">
                        Retry Fetch
                    </button>
                </div>
            )}

            {/* Loading Overlay */}
            {isLoading && !data && (
                <div className="flex-1 flex items-center justify-center min-h-[40vh]">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-8 h-8 text-brand-purple animate-spin" />
                        <p className="text-sm font-medium text-gray-500">Syncing telemetry...</p>
                    </div>
                </div>
            )}

            {/* Content Views */}
            {data && (
                <main className="flex-1 w-full max-w-full space-y-6">
                    {activeDrillDown ? (
                        <div className="animate-in fade-in slide-in-from-right-8 duration-300 space-y-4">
                            {/* DRILL DOWN VIEWS */}
                            {activeDrillDown === "liveActive" && (
                                <div className="glass-panel p-6 rounded-3xl border border-white/10">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                            <Activity className="w-5 h-5 text-brand-purple" /> Raw Event Trace Log
                                        </h2>
                                        <div className="flex gap-3">
                                            <div className="px-3 py-1.5 rounded-lg bg-black/50 border border-white/10 text-center">
                                                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">DeepTracker</p>
                                                <p className="text-lg font-bold text-brand-purple">{deepTrackerActive}</p>
                                            </div>
                                            <div className="px-3 py-1.5 rounded-lg bg-black/50 border border-white/10 text-center">
                                                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">GA4</p>
                                                <p className="text-lg font-bold text-white">{liveActive}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-gray-400 text-sm mb-6">Passive telemetry ingestion from Deep Tracker. (Note: In production, this pulls directly from the firestore <code>analytics_sessions</code> collection).</p>
                                    <div className="space-y-3 font-mono text-xs text-left max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                                        {rawEvents.length > 0 ? rawEvents.map((log, i) => {
                                            const detail = log.type === 'scroll' ? `Scrolled to ${log.scrollDepthPercent}% depth` :
                                                log.type === 'click' ? `Clicked [${log.targetText || log.targetId || log.targetTag}]` :
                                                    log.type === 'hover' ? `Hovered [${log.targetText || log.targetId || log.targetTag}]` :
                                                        log.type === 'visibility' ? `Visibility: ${log.targetText}` : "Interaction event";

                                            // Calculate relative time roughly
                                            const diffSec = Math.floor((Date.now() - log.timestamp) / 1000);
                                            const timeStr = diffSec < 60 ? `${diffSec}s ago` : diffSec < 3600 ? `${Math.floor(diffSec / 60)}m ago` : `${Math.floor(diffSec / 3600)}h ago`;

                                            return (
                                                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${log.type === 'click' ? 'bg-blue-500/20 text-blue-400' :
                                                            log.type === 'scroll' ? 'bg-green-500/20 text-green-400' :
                                                                log.type === 'hover' ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-500/20 text-gray-400'
                                                            }`}>{log.type}</span>
                                                        <span className="text-gray-300 truncate max-w-[150px] md:max-w-xs">{detail}</span>
                                                        <span className="text-gray-500 hidden md:inline shrink-0">on {log.path}</span>
                                                    </div>
                                                    <div className="text-right shrink-0 min-w-16">
                                                        <span className="text-gray-500 block">{timeStr}</span>
                                                        <span className="text-[#00ffcc] text-[10px] font-bold opacity-80 truncate max-w-[80px] block" title={log.uid}>
                                                            {log.username || (!log.uid || log.uid === 'anonymous' ? 'anon' : log.uid.slice(0, 6))}
                                                        </span>
                                                    </div>
                                                </div>
                                            )
                                        }) : (
                                            <p className="text-gray-500 text-center py-8">Waiting for telemetry heartbeat...</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeDrillDown === "uniqueUsers" && (
                                <div className="glass-panel p-6 rounded-3xl border border-white/10">
                                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                        <MapPin className="w-5 h-5 text-brand-purple" /> Global Distribution
                                    </h2>
                                    <div className="space-y-2">
                                        {geoData && geoData.length > 0 ? geoData.map((geo, idx) => (
                                            <div key={idx} className="relative p-4 rounded-2xl overflow-hidden group border border-white/5 bg-black/40">
                                                <div
                                                    className="absolute left-0 top-0 bottom-0 bg-brand-purple/20 transition-all"
                                                    style={{ width: `${Math.max(5, (geo.users / geoData[0].users) * 100)}%` }}
                                                />
                                                <div className="relative z-10 flex items-center justify-between">
                                                    <div>
                                                        <p className="font-bold text-white text-sm">{geo.city}</p>
                                                        <p className="text-xs text-brand-purple">{geo.country}</p>
                                                    </div>
                                                    <p className="font-mono text-xl font-black text-white">{geo.users.toLocaleString()}</p>
                                                </div>
                                            </div>
                                        )) : (
                                            <p className="text-sm text-gray-500 py-6">Insufficient region data.</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeDrillDown === "pageViews" && (
                                <div className="glass-panel p-6 rounded-3xl border border-white/10">
                                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-brand-purple" /> Trajectory Paths
                                    </h2>
                                    <div className="space-y-4">
                                        {pagesData && pagesData.length > 0 ? pagesData.map((page, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                                                <div className="flex items-center gap-3 w-2/3">
                                                    <div className="w-6 h-6 rounded-full bg-brand-purple/20 flex items-center justify-center text-[10px] text-brand-purple font-bold shrink-0">{idx + 1}</div>
                                                    <span className="text-sm text-gray-300 font-mono truncate">{page.path}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-white font-bold">{page.views.toLocaleString()}</span>
                                                    <span className="text-[10px] text-gray-500 block uppercase tracking-wider">Views</span>
                                                </div>
                                            </div>
                                        )) : (
                                            <p className="text-sm text-gray-500 py-6">Insufficient page trajectory data.</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeDrillDown === "engagement" && (
                                <div className="glass-panel p-6 rounded-3xl border border-white/10">
                                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                        <Activity className="w-5 h-5 text-brand-purple" /> Engagement Insights
                                    </h2>
                                    <div className="space-y-6">
                                        {/* Trend Graph */}
                                        <div className="h-[200px] w-full mt-4 bg-white/5 rounded-2xl p-4 border border-white/5">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                                    <defs>
                                                        <linearGradient id="colorEngArea" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#b28cff" stopOpacity={0.3} />
                                                            <stop offset="95%" stopColor="#b28cff" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <XAxis dataKey="date" stroke="#ffffff20" fontSize={10} tickLine={false} axisLine={false} minTickGap={30} />
                                                    <YAxis stroke="#ffffff20" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `${(value * 100).toFixed(0)}%`} />
                                                    <Tooltip content={<CustomTooltip />} />
                                                    <Area type="monotone" dataKey="engagementRate" name="Engagement Rate" stroke="#b28cff" strokeWidth={3} fillOpacity={1} fill="url(#colorEngArea)" />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>

                                        {/* Drop Insights */}
                                        <div>
                                            <h3 className="text-sm font-bold text-white mb-3">Top Drops Conversion <span className="text-[10px] text-gray-500 font-normal ml-2">(Unlocks / Views)</span></h3>
                                            <div className="space-y-2">
                                                {topDropsData && topDropsData.length > 0 ? topDropsData.map((drop, idx) => {
                                                    const conv = drop.views > 0 ? (drop.unlocks / drop.views) * 100 : 0;
                                                    return (
                                                        <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                                                            <div className="flex items-center gap-3 w-1/2">
                                                                <span className="text-sm text-gray-300 font-mono truncate">{drop.dropId}</span>
                                                            </div>
                                                            <div className="text-right flex items-center gap-4">
                                                                <span className="text-[10px] text-gray-500">{drop.views.toLocaleString()} views</span>
                                                                <span className="text-white font-bold min-w-12 text-right text-brand-purple">{conv.toFixed(1)}%</span>
                                                            </div>
                                                        </div>
                                                    )
                                                }) : (
                                                    <p className="text-sm text-gray-500 py-4">Insufficient drop data.</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Page Insights */}
                                        <div>
                                            <h3 className="text-sm font-bold text-white mb-3">Top Pages Engagement</h3>
                                            <div className="space-y-2">
                                                {pagesData && pagesData.length > 0 ? pagesData.map((page, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                                                        <div className="flex items-center gap-3 w-2/3">
                                                            <div className="w-5 h-5 rounded-md bg-brand-purple/20 flex items-center justify-center text-[9px] text-brand-purple font-bold shrink-0">{idx + 1}</div>
                                                            <span className="text-sm text-gray-300 font-mono truncate">{page.path}</span>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="text-white font-bold">{((page.engagementRate || 0) * 100).toFixed(1)}%</span>
                                                        </div>
                                                    </div>
                                                )) : (
                                                    <p className="text-sm text-gray-500 py-4">Insufficient page data.</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeDrillDown === "avgTime" && (
                                <div className="glass-panel p-6 rounded-3xl border border-white/10">
                                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                        <Clock className="w-5 h-5 text-brand-purple" /> Session Duration Insights
                                    </h2>
                                    <div className="space-y-6">
                                        {/* Trend Graph */}
                                        <div className="h-[200px] w-full mt-4 bg-white/5 rounded-2xl p-4 border border-white/5">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                                    <defs>
                                                        <linearGradient id="colorTimeArea" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#b28cff" stopOpacity={0.3} />
                                                            <stop offset="95%" stopColor="#b28cff" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <XAxis dataKey="date" stroke="#ffffff20" fontSize={10} tickLine={false} axisLine={false} minTickGap={30} />
                                                    <YAxis stroke="#ffffff20" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `${Math.floor(value / 60)}m`} />
                                                    <Tooltip content={<CustomTooltip />} />
                                                    <Area type="monotone" dataKey="avgSessionDuration" name="Avg Secs" stroke="#b28cff" strokeWidth={3} fillOpacity={1} fill="url(#colorTimeArea)" />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>

                                        {/* Page Insights */}
                                        <div>
                                            <h3 className="text-sm font-bold text-white mb-3">Top Pages Average Time</h3>
                                            <div className="space-y-2">
                                                {pagesData && pagesData.length > 0 ? pagesData.map((page, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                                                        <div className="flex items-center gap-3 w-2/3">
                                                            <div className="w-5 h-5 rounded-md bg-brand-purple/20 flex items-center justify-center text-[9px] text-brand-purple font-bold shrink-0">{idx + 1}</div>
                                                            <span className="text-sm text-gray-300 font-mono truncate">{page.path}</span>
                                                        </div>
                                                        <div className="text-right flex items-center gap-4">
                                                            <span className="text-[10px] text-gray-500">{page.views?.toLocaleString()} views</span>
                                                            <span className="text-white font-bold text-brand-purple min-w-16 text-right">
                                                                {Math.floor((page.avgTime || 0) / 60)}m {Math.round((page.avgTime || 0) % 60)}s
                                                            </span>
                                                        </div>
                                                    </div>
                                                )) : (
                                                    <p className="text-sm text-gray-500 py-4">Insufficient page data.</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeDrillDown === "revenue" && (
                                <div className="glass-panel p-6 rounded-3xl border border-[#00ffcc]/30">
                                    <h2 className="text-xl font-bold text-[#00ffcc] mb-4 flex items-center gap-2">
                                        <DollarSign className="w-5 h-5" /> Commerce Ledger (Last 50)
                                    </h2>
                                    <div className="space-y-3 font-mono text-xs max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                                        {commerceData.feed && commerceData.feed.length > 0 ? commerceData.feed.map((tx: any, i: number) => {
                                            const isPurchase = tx.type === "purchase_currency";
                                            const isUnlock = tx.type === "unlock_content";

                                            let amountStr = tx.amount?.toString() || "";
                                            if (isPurchase) amountStr = `+$${((tx.cost || 0) / 100).toFixed(2)}`;
                                            else if (isUnlock) amountStr = `-${tx.amount} GD`;

                                            let timeStr = "Unknown";
                                            if (tx.timestamp) {
                                                const d = typeof tx.timestamp === 'number' ? new Date(tx.timestamp) : tx.timestamp.toDate ? tx.timestamp.toDate() : new Date();
                                                const diff = Math.floor((Date.now() - d.getTime()) / 1000);
                                                timeStr = diff < 60 ? `${diff}s ago` : diff < 3600 ? `${Math.floor(diff / 60)}m ago` : diff < 86400 ? `${Math.floor(diff / 3600)}h ago` : `${Math.floor(diff / 86400)}d ago`;
                                            }

                                            return (
                                                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 text-left">
                                                    <div>
                                                        <p className={`font-bold ${isPurchase ? 'text-[#00ffcc]' : isUnlock ? 'text-brand-purple' : 'text-gray-400'}`}>
                                                            {amountStr}
                                                        </p>
                                                        <p className="text-gray-500 font-bold text-[10px]">@{tx.username || "Unknown"}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-white">
                                                            {isPurchase ? "Loaded GD" : isUnlock ? "Unlocked Content" : tx.description || tx.type}
                                                        </p>
                                                        <p className="text-gray-500 text-[10px]">{timeStr}</p>
                                                    </div>
                                                </div>
                                            )
                                        }) : (
                                            <p className="text-gray-500 text-center py-8">No recent transactions.</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* View: OPERATIONS (Live) */}
                            {activeTab === "operations" && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    {newSecurityViolations > 0 && (
                                        <button
                                            onClick={() => setActiveTab("security")}
                                            className="w-full flex items-center justify-between p-4 md:p-5 rounded-3xl bg-red-500/10 border border-red-500/40 text-left active:scale-[0.98] transition-all relative overflow-hidden group shadow-[0_0_30px_-10px_rgba(239,68,68,0.3)]"
                                        >
                                            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center border border-red-500/30 shrink-0 shadow-[0_0_15px_-3px_rgba(239,68,68,0.4)]">
                                                    <AlertTriangle className="w-6 h-6 text-red-500 group-hover:animate-pulse" />
                                                </div>
                                                <div>
                                                    <p className="text-red-400 font-bold text-sm uppercase tracking-wider mb-0.5 flex items-center gap-2">
                                                        Action Required <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span></span>
                                                    </p>
                                                    <p className="text-red-300/80 text-xs">{newSecurityViolations} new security violations detected in the last 24h.</p>
                                                </div>
                                            </div>
                                            <span className="text-red-500 text-xs font-bold px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 whitespace-nowrap hidden sm:block">Review Logs &rarr;</span>
                                        </button>
                                    )}

                                    <button
                                        onClick={() => setActiveDrillDown("liveActive")}
                                        className="w-full text-left glass-panel p-6 md:p-8 rounded-[2rem] border border-white/10 relative overflow-hidden flex flex-col items-center hover:bg-white/[0.02] transition-colors group"
                                    >
                                        <div className="absolute top-4 right-4 flex items-center gap-2 bg-brand-purple/20 px-3 py-1 rounded-full border border-brand-purple/30 group-hover:bg-brand-purple/30 transition-colors">
                                            <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-purple opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-purple"></span>
                                            </span>
                                            <span className="text-[10px] text-brand-purple font-bold tracking-widest uppercase">Live</span>
                                        </div>
                                        <p className="text-gray-400 font-medium text-sm mb-2 mt-4">Active Users</p>
                                        <div className="flex items-baseline justify-center gap-4 mb-2">
                                            <h2 className="text-8xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-brand-purple to-brand-purple/50 tracking-tighter">{deepTrackerActive}</h2>
                                        </div>
                                        <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 mt-2">
                                            <div className="flex items-center gap-1.5 bg-black/50 px-3 py-1.5 rounded-full border border-white/10">
                                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
                                                <span className="text-[11px] font-bold text-gray-300 tracking-wider">DEEPTRACKER <span className="text-gray-500">(PRIMARY)</span></span>
                                            </div>
                                            <div className="flex items-center gap-1.5 bg-black/50 px-3 py-1.5 rounded-full border border-white/10">
                                                <span className="text-[11px] font-bold text-gray-400 tracking-wider">GA4: <span className="text-white">{liveActive}</span></span>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-4"><Clock className="w-3 h-3" /> Unique users past 30 minutes</p>

                                        <div className="w-full h-[120px] mt-8">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={liveData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff05' }} />
                                                    <Bar dataKey="users" name="Active Users" fill="#b28cff" radius={[4, 4, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </button>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="glass-panel p-5 rounded-3xl border border-white/10">
                                            <p className="text-xs text-gray-400 font-medium mb-1 truncate">30d Unlocks</p>
                                            <p className="text-2xl font-bold text-brand-purple">{eventsData.unlock_drop_success?.toLocaleString() || 0}</p>
                                        </div>
                                        <div className="glass-panel p-5 rounded-3xl border border-white/10">
                                            <p className="text-xs text-gray-400 font-medium mb-1 truncate">30d New Users</p>
                                            <p className="text-2xl font-bold text-white">{totals.newUsers.toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* View: AUDIENCE */}
                            {activeTab === "audience" && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                                        <button onClick={() => setActiveDrillDown("uniqueUsers")} className="text-left glass-panel p-4 md:p-6 rounded-3xl border border-white/10 hover:bg-white/[0.02] transition-colors">
                                            <Users className="w-5 h-5 text-gray-400 mb-2" />
                                            <p className="text-[10px] md:text-xs text-brand-purple font-bold tracking-wider uppercase mb-1">Unique Users</p>
                                            <h3 className="text-2xl md:text-4xl font-bold text-white tracking-tight">{totals.users.toLocaleString()}</h3>
                                        </button>
                                        <button onClick={() => setActiveDrillDown("pageViews")} className="text-left glass-panel p-4 md:p-6 rounded-3xl border border-white/10 hover:bg-white/[0.02] transition-colors">
                                            <Eye className="w-5 h-5 text-gray-400 mb-2" />
                                            <p className="text-[10px] md:text-xs text-brand-purple font-bold tracking-wider uppercase mb-1">Page Views</p>
                                            <h3 className="text-2xl md:text-4xl font-bold text-white tracking-tight">{totals.views.toLocaleString()}</h3>
                                        </button>
                                        <button onClick={() => setActiveDrillDown("engagement")} className="text-left glass-panel p-4 md:p-6 rounded-3xl border border-white/10 hover:bg-white/[0.02] transition-colors">
                                            <Activity className="w-5 h-5 text-gray-400 mb-2" />
                                            <p className="text-[10px] md:text-xs text-brand-purple font-bold tracking-wider uppercase mb-1">Engagement</p>
                                            <h3 className="text-xl md:text-3xl font-bold text-white tracking-tight">{(totals.engagementRate * 100).toFixed(1)}%</h3>
                                        </button>
                                        <button onClick={() => setActiveDrillDown("avgTime")} className="text-left glass-panel p-4 md:p-6 rounded-3xl border border-white/10 hover:bg-white/[0.02] transition-colors">
                                            <Clock className="w-5 h-5 text-gray-400 mb-2" />
                                            <p className="text-[10px] md:text-xs text-brand-purple font-bold tracking-wider uppercase mb-1">Avg Time</p>
                                            <h3 className="text-xl md:text-3xl font-bold text-white tracking-tight">{Math.floor(totals.avgSessionDuration / 60)}m {Math.round(totals.avgSessionDuration % 60)}s</h3>
                                        </button>
                                    </div>

                                    <div className="glass-panel p-4 rounded-3xl border border-white/10">
                                        <p className="text-xs font-bold text-white mb-4 pl-2">Retention Trend</p>
                                        <div className="h-[200px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                                    <defs>
                                                        <linearGradient id="colorUsersArea" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#b28cff" stopOpacity={0.3} />
                                                            <stop offset="95%" stopColor="#b28cff" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <XAxis dataKey="date" stroke="#ffffff20" fontSize={10} tickLine={false} axisLine={false} minTickGap={30} />
                                                    <YAxis stroke="#ffffff20" fontSize={10} tickLine={false} axisLine={false} />
                                                    <Tooltip content={<CustomTooltip />} />
                                                    <Area type="monotone" dataKey="users" stroke="#b28cff" strokeWidth={3} fillOpacity={1} fill="url(#colorUsersArea)" />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    <div className="glass-panel p-4 rounded-3xl border border-white/10">
                                        <div className="flex items-center gap-2 mb-4 pl-2">
                                            <MapPin className="w-4 h-4 text-brand-purple" />
                                            <h3 className="text-sm font-bold text-white">Top Regions</h3>
                                        </div>
                                        <div className="space-y-1">
                                            {geoData && geoData.length > 0 ? geoData.map((geo, idx) => (
                                                <div key={idx} className="relative p-3 rounded-2xl overflow-hidden group">
                                                    {/* Progress bar background representing volume relative to top region */}
                                                    <div
                                                        className="absolute left-0 top-0 bottom-0 bg-white/5 transition-all"
                                                        style={{ width: `${Math.max(5, (geo.users / geoData[0].users) * 100)}%` }}
                                                    />
                                                    <div className="relative z-10 flex items-center justify-between">
                                                        <div>
                                                            <p className="font-bold text-white text-xs">{geo.city}</p>
                                                            <p className="text-[10px] text-gray-500">{geo.country}</p>
                                                        </div>
                                                        <p className="font-mono text-xs text-brand-purple">{geo.users.toLocaleString()}</p>
                                                    </div>
                                                </div>
                                            )) : (
                                                <p className="text-xs text-gray-500 text-center py-6">No region data available</p>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Onboarding Metrics Table injection */}
                                    <AdminOnboardingAnalytics />
                                </div>
                            )}

                            {/* View: COMMERCE */}
                            {activeTab === "commerce" && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    {/* Sticky-ish Revenue Card */}
                                    <button onClick={() => setActiveDrillDown("revenue")} className="w-full text-left glass-panel p-6 md:p-8 rounded-3xl border border-[#00ffcc]/30 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#00ffcc]/10 via-black to-black hover:from-[#00ffcc]/20 transition-colors">
                                        <p className="text-xs font-bold text-[#00ffcc] tracking-widest uppercase mb-1 flex items-center gap-1">
                                            <DollarSign className="w-3 h-3" /> Total Volume
                                        </p>
                                        <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter mb-4">
                                            ${commerceData.revenueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </h1>
                                        <div className="flex items-center gap-2 py-2 px-3 bg-white/5 w-fit rounded-lg border border-white/10">
                                            <div className="w-2 h-2 rounded-full bg-brand-purple animate-pulse" />
                                            <p className="text-xs font-medium text-gray-300">
                                                <span className="text-white font-bold">{commerceData.gdSpent.toLocaleString()}</span> GD spent on unlocks
                                            </p>
                                        </div>
                                    </button>

                                    <div className="glass-panel p-4 rounded-3xl border border-white/10">
                                        <div className="flex items-center gap-2 mb-4 pl-2">
                                            <BarChart3 className="w-4 h-4 text-brand-purple" />
                                            <h3 className="text-sm font-bold text-white">Conversion Rate</h3>
                                        </div>
                                        <div className="flex gap-4 mb-4 pl-2">
                                            <div>
                                                <p className="text-[10px] text-gray-500 font-bold uppercase">Total Drop Views</p>
                                                <p className="text-lg font-bold text-white">{eventsData.view_drop_details?.toLocaleString() || 0}</p>
                                            </div>
                                            <div className="w-px bg-white/10" />
                                            <div>
                                                <p className="text-[10px] text-brand-purple font-bold uppercase">Successful Unlocks</p>
                                                <p className="text-lg font-bold text-white">{eventsData.unlock_drop_success?.toLocaleString() || 0}</p>
                                            </div>
                                        </div>
                                        <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden flex">
                                            <div
                                                className="bg-brand-purple h-full"
                                                style={{ width: `${Math.min(100, ((eventsData.unlock_drop_success || 0) / Math.max(1, eventsData.view_drop_details || 1)) * 100)}%` }}
                                            />
                                            <div className="bg-[#06b6d4] h-full flex-1" />
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <h3 className="text-sm font-bold text-white mb-3 px-2 flex items-center gap-2">
                                            <Trophy className="w-4 h-4 text-brand-purple" /> Drop Funnel Breakdown
                                        </h3>
                                        <div className="space-y-3">
                                            {topDropsData.length > 0 ? topDropsData.map((drop, idx) => (
                                                <div key={idx} className="glass-panel p-3 rounded-2xl border border-white/5 flex gap-4 items-center">
                                                    <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0 border border-white/10 font-mono text-[10px] text-gray-400 overflow-hidden relative">
                                                        {/* Fallback avatar if no image - in a real app we'd fetch the drop cover, but we only have ID here */}
                                                        <span className="truncate w-full text-center px-1">Img</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-bold text-white truncate max-w-full">{drop.dropId}</p>
                                                        <div className="flex items-center gap-3 mt-1">
                                                            <p className="text-[10px] text-gray-400"><span className="text-white font-medium">{drop.views.toLocaleString()}</span> views</p>
                                                            <p className="text-[10px] text-brand-purple"><span className="font-medium">{drop.unlocks.toLocaleString()}</span> unlocks</p>
                                                        </div>
                                                    </div>
                                                    <div className="shrink-0 text-right pl-2 border-l border-white/10">
                                                        <p className="text-xs font-bold text-white">
                                                            {drop.views > 0 ? Math.round((drop.unlocks / drop.views) * 100) : 0}%
                                                        </p>
                                                        <p className="text-[9px] text-gray-500">Conv.</p>
                                                    </div>
                                                </div>
                                            )) : (
                                                <p className="text-xs text-gray-500 text-center py-6">No drop data in selected period.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* View: SECURITY */}
                            {activeTab === "security" && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="glass-panel p-5 rounded-3xl border border-red-500/20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-red-500/10 via-black to-black flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center border border-red-500/30 shrink-0">
                                            <ShieldAlert className="w-6 h-6 text-red-500" />
                                        </div>
                                        <div>
                                            <p className="text-xl font-black text-white">{securityData.length} Flagged Users</p>
                                            <p className="text-xs text-red-400">Total detected recording / scraping attempts</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-2">
                                        {securityData.length > 0 ? securityData.map((log) => {
                                            const isNew = (new Date().getTime() - new Date(log.lastViolation).getTime()) / (1000 * 60 * 60) < 24;
                                            return (
                                                <div key={log.uid} className={`glass-panel p-4 rounded-3xl border ${isNew ? 'border-red-500/40 bg-red-500/5' : 'border-white/5 bg-black/40'}`}>
                                                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
                                                        <div className="flex items-center gap-3">
                                                            <div className="relative w-12 h-12 rounded-full bg-zinc-800 shrink-0 border border-white/10 overflow-hidden shadow-inner flex items-center justify-center">
                                                                {log.photoURL ? (
                                                                    <Image src={log.photoURL} alt={log.username} fill className="object-cover" />
                                                                ) : (
                                                                    <span className="text-xl text-gray-500 font-bold">{log.username[0]?.toUpperCase()}</span>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="text-base font-bold text-white max-w-[150px] md:max-w-xs truncate">{log.username}</p>
                                                                    {isNew && <span className="px-2 py-0.5 rounded text-[9px] font-black bg-red-500 text-white shadow-sm uppercase tracking-widest">New</span>}
                                                                </div>
                                                                <p className="text-xs text-gray-500 font-mono mt-0.5 select-all">{log.uid}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-left sm:text-right mt-2 sm:mt-0 w-full sm:w-auto">
                                                            <p className="text-sm font-black text-red-400 flex items-center sm:justify-end gap-1.5"><ShieldAlert className="w-3.5 h-3.5" />{log.ripAttempts} violations</p>
                                                            <p className="text-[11px] text-gray-500 mt-1 flex items-center sm:justify-end gap-1"><Clock className="w-3 h-3" />{new Date(log.lastViolation).toLocaleString()}</p>
                                                        </div>
                                                    </div>

                                                    <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-4">
                                                        <div className="bg-black/30 p-3 rounded-2xl border border-white/5">
                                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Activity className="w-3 h-3" />Vector</p>
                                                            <p className="text-xs text-red-300 font-mono break-words">{log.lastViolationReason}</p>
                                                        </div>
                                                        <div className="bg-black/30 p-3 rounded-2xl border border-white/5">
                                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" />Target</p>
                                                            <p className="text-xs text-brand-purple font-mono truncate">{log.lastViolationDropId || "N/A"}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        }) : (
                                            <div className="glass-panel p-8 rounded-3xl border border-white/5 text-center flex flex-col items-center">
                                                <ShieldAlert className="w-8 h-8 text-green-500/50 mb-3" />
                                                <p className="text-white font-bold text-sm">Clear skies</p>
                                                <p className="text-xs text-gray-500 mt-1">No security violations detected on the platform.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </main>
            )}

            {/* Sticky Mobile Tab Bar (Hidden on Desktop) */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-xl border-t border-white/10 pb-safe pb-4 pt-2">
                <div className="flex justify-around items-center px-2">
                    {[
                        { id: "operations", icon: Activity, label: "Live" },
                        { id: "audience", icon: Users, label: "Traffic" },
                        { id: "commerce", icon: DollarSign, label: "Cash" },
                        { id: "security", icon: ShieldAlert, label: "Sec" },
                    ].map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveTab(tab.id as ViewTab);
                                    if (tab.id === "operations") setFilter("live");
                                    else if (filter === "live") setFilter("30d");
                                }}
                                className="flex flex-col items-center gap-1.5 p-2 w-16 relative"
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isActive ? "bg-white text-black scale-110 shadow-[0_0_15px_rgba(255,255,255,0.3)]" : "text-gray-500 hover:text-white"}`}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <p className={`text-[10px] font-bold transition-colors ${isActive ? "text-white" : "text-gray-500"}`}>
                                    {tab.label}
                                </p>
                                {tab.id === "security" && newSecurityViolations > 0 && (
                                    <span className="absolute top-1 right-2 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-black" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
