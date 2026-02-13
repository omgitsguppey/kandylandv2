"use client";

import { useEffect, useState } from "react";
import { collection, getCountFromServer, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Users, Package, DollarSign, Activity, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function AdminDashboardPage() {
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeDrops: 0,
        totalDrops: 0,
        totalStorage: 0,
        recentSales: 0
    });
    const [recentTransactions, setRecentTransactions] = useState<any[]>([]);

    useEffect(() => {
        async function fetchStats() {
            try {
                // 1. Get counts & Calculate Storage
                const usersSnap = await getCountFromServer(collection(db, "users"));

                // Fetch all drops to calculate storage (Optimization: Could be a cloud function aggregator)
                const dropsQuery = query(collection(db, "drops"));
                const dropsSnap = await getDocs(dropsQuery);
                const totalDrops = dropsSnap.size;

                let activeCount = 0;
                let totalBytes = 0;

                dropsSnap.forEach(doc => {
                    const data = doc.data();
                    if (data.status === 'active') activeCount++;
                    if (data.fileMetadata?.size) {
                        totalBytes += data.fileMetadata.size;
                    }
                });

                // 2. Mock sales for now
                // ... existing code ...

                setStats({
                    totalUsers: usersSnap.data().count,
                    totalDrops: totalDrops,
                    activeDrops: activeCount,
                    totalStorage: totalBytes, // Add to state
                    recentSales: 1250
                });
            } catch (err) {
                console.error("Error fetching admin stats:", err);
            }
        }

        fetchStats();
    }, []);

    function formatBytes(bytes: number, decimals = 2) {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    }

    return (
        <div>
            <header className="mb-10">
                <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
                <p className="text-gray-400">Welcome back, Admin. Here's what's happening today.</p>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                <StatCard
                    title="Total Users"
                    value={stats.totalUsers.toString()}
                    icon={<Users className="w-5 h-5 text-brand-cyan" />}
                    trend="+12%"
                    trendUp={true}
                />
                <StatCard
                    title="Active Drops"
                    value={stats.activeDrops.toString()}
                    icon={<Activity className="w-5 h-5 text-brand-green" />}
                    subValue={`of ${stats.totalDrops} total`}
                />
                <StatCard
                    title="Revenue (Est)"
                    value="$1,250"
                    icon={<DollarSign className="w-5 h-5 text-brand-yellow" />}
                    trend="+8%"
                    trendUp={true}
                />
                <StatCard
                    title="Storage Used"
                    value={formatBytes(stats.totalStorage)}
                    icon={<Package className="w-5 h-5 text-brand-blue" />}
                    subValue="Total Content Size"
                />
            </div>

            {/* Recent Activity Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="glass-panel p-6 rounded-3xl">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-white">Recent Drops</h3>
                        <button className="text-xs font-bold text-brand-pink hover:text-white transition-colors">View All</button>
                    </div>
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors group">
                                <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center text-xl">🍬</div>
                                <div>
                                    <div className="font-bold text-white group-hover:text-brand-cyan transition-colors">Neon Pop Pack #{i}</div>
                                    <div className="text-xs text-gray-500">Active • 24 Unlocks</div>
                                </div>
                                <div className="ml-auto text-xs font-mono text-gray-400">2h ago</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="glass-panel p-6 rounded-3xl">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-white">Live Transactions</h3>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
                            <span className="text-xs text-gray-400">Live</span>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {/* Placeholder transactions */}
                        <div className="flex items-center justify-between p-3 border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-brand-yellow/10 flex items-center justify-center">
                                    <DollarSign className="w-4 h-4 text-brand-yellow" />
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-white">New Purchase</div>
                                    <div className="text-xs text-gray-400">uylus@... bought 300 Drops</div>
                                </div>
                            </div>
                            <span className="text-brand-green font-mono font-bold">+$4.99</span>
                        </div>
                        <div className="flex items-center justify-between p-3 border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-brand-pink/10 flex items-center justify-center">
                                    <Package className="w-4 h-4 text-brand-pink" />
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-white">Content Unlocked</div>
                                    <div className="text-xs text-gray-400">user123 unlocked "Secret Mix"</div>
                                </div>
                            </div>
                            <span className="text-gray-500 font-mono text-xs">Just now</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, trend, trendUp, subValue }: any) {
    return (
        <div className="glass-panel p-6 rounded-3xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity transform group-hover:scale-110 duration-500">
                <div className="p-3 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-sm">
                    {icon}
                </div>
            </div>
            <div>
                <p className="text-sm font-medium text-gray-400 mb-1">{title}</p>
                <h3 className="text-3xl font-bold text-white tracking-tight mb-2">{value}</h3>
                <div className="flex items-center gap-2">
                    {trend && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${trendUp ? 'bg-brand-green/10 text-brand-green' : 'bg-red-500/10 text-red-400'}`}>
                            {trend}
                        </span>
                    )}
                    {subValue && (
                        <span className="text-xs text-gray-500">{subValue}</span>
                    )}
                </div>
            </div>
        </div>
    );
}
