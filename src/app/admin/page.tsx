"use client";

import { useEffect, useState } from "react";
import { collection, getCountFromServer, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase-data";
import { CandyOutlineIcon as Users, CandyOutlineIcon as Package, CandyOutlineIcon as DollarSign, CandyOutlineIcon as Activity, CandyOutlineIcon as TrendingUp } from "@/components/ui/Icon";

import { formatDistanceToNow } from "date-fns";
import { Drop, Transaction } from "@/types/db";

export default function AdminDashboardPage() {
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeDrops: 0,
        totalDrops: 0,
        totalStorage: 0,
        recentSales: 0
    });
    const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
    const [recentDrops, setRecentDrops] = useState<Drop[]>([]);

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
                let drops: Drop[] = [];

                dropsSnap.forEach(doc => {
                    const data = doc.data() as Drop;
                    drops.push({ ...data, id: doc.id });
                    if (data.status === 'active') activeCount++;
                    if (data.fileMetadata?.size) {
                        totalBytes += data.fileMetadata.size;
                    }
                });

                // Sort drops by unlocks for the "Trending" view
                const sortedDrops = drops.sort((a, b) => (b.totalUnlocks || 0) - (a.totalUnlocks || 0)).slice(0, 5);
                setRecentDrops(sortedDrops);

                // 2. Transactions & Sales
                const txQuery = query(collection(db, "transactions"), orderBy("timestamp", "desc"), limit(10));
                const txSnap = await getDocs(txQuery);

                let revenue = 0;
                const txs: Transaction[] = [];
                txSnap.forEach(doc => {
                    const data = doc.data() as Transaction;
                    txs.push({ ...data, id: doc.id });
                    if (data.type === 'purchase_currency' && data.amount > 0) {
                        // Assuming amount is in USD cents for purchase_currency, this is a rough estimation
                        // or you can track actual USD paid separately.
                        revenue += data.amount;
                    }
                });
                setRecentTransactions(txs);

                setStats({
                    totalUsers: usersSnap.data().count,
                    totalDrops: totalDrops,
                    activeDrops: activeCount,
                    totalStorage: totalBytes,
                    recentSales: revenue
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
                    title="Revenue (Transactions)"
                    value={`$${(stats.recentSales / 100).toFixed(2)}`}
                    icon={<DollarSign className="w-5 h-5 text-brand-yellow" />}
                    trend="+Live"
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
                        <h3 className="text-lg font-bold text-white">Trending Content</h3>
                        <span className="text-xs font-bold text-brand-pink">Top 5 Unlocked</span>
                    </div>
                    <div className="space-y-4">
                        {recentDrops.length === 0 ? (
                            <div className="text-sm text-gray-500 py-4 text-center">No drops found.</div>
                        ) : recentDrops.map((drop) => (
                            <div key={drop.id} className="flex items-center gap-4 p-3 rounded-xl transition-colors group">
                                <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center text-xl overflow-hidden relative">
                                    {drop.imageUrl ? (
                                        <img src={drop.imageUrl} alt={drop.title} className="object-cover w-full h-full opacity-80" />
                                    ) : "🍬"}
                                </div>
                                <div>
                                    <div className="font-bold text-white transition-colors line-clamp-1">{drop.title}</div>
                                    <div className="text-xs text-gray-500 capitalize">{drop.status} • {drop.totalUnlocks || 0} Unlocks</div>
                                </div>
                                <div className="ml-auto flex flex-col items-end">
                                    <div className="text-xs font-mono text-brand-purple font-bold">{drop.unlockCost} GD</div>
                                    {drop.totalClicks !== undefined && <div className="text-[10px] text-gray-500">{drop.totalClicks} views</div>}
                                </div>
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
                        {recentTransactions.length === 0 ? (
                            <div className="text-sm text-gray-500 py-4 text-center">No recent transactions.</div>
                        ) : recentTransactions.map((tx) => {
                            const isUnlock = tx.type === 'unlock_content';
                            const timestamp = tx.timestamp?.toMillis ? tx.timestamp.toMillis() : Date.now();
                            return (
                                <div key={tx.id} className="flex items-center justify-between p-3 border-b border-white/5 last:border-0 transition-colors rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isUnlock ? 'bg-brand-pink/10' : 'bg-brand-yellow/10'}`}>
                                            {isUnlock ? <Package className="w-4 h-4 text-brand-pink" /> : <DollarSign className="w-4 h-4 text-brand-yellow" />}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-white line-clamp-1">{tx.description}</div>
                                            <div className="text-xs text-gray-400 font-mono truncate max-w-[150px]">{tx.userId.substring(0, 8)}...</div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className={`font-mono font-bold text-sm ${isUnlock ? 'text-gray-400' : 'text-brand-green'}`}>
                                            {tx.amount > 0 ? '+' : ''}{tx.amount}
                                        </span>
                                        <span className="text-gray-500 font-mono text-[10px] whitespace-nowrap">{formatDistanceToNow(timestamp, { addSuffix: true })}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, trend, trendUp, subValue }: any) {
    return (
        <div className="glass-panel p-6 rounded-3xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-50 transition-opacity transform duration-500">
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
