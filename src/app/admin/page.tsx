"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query, limit, where } from "firebase/firestore";
import { db } from "@/lib/firebase-data";
import { Users, Package, DollarSign, Activity, MousePointerClick } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Drop, Transaction, UserProfile } from "@/types/db";
import { normalizeDropRecord } from "@/lib/drop-normalizers";
import { getTransactionRevenueCents, normalizeTransactionRecord } from "@/lib/transaction-normalizers";

export default function AdminDashboardPage() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [drops, setDrops] = useState<Drop[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [purchaseRevenueCents, setPurchaseRevenueCents] = useState(0);

    useEffect(() => {
        const unsubs = [
            onSnapshot(collection(db, "users"), (snapshot) => {
                const list: UserProfile[] = [];
                snapshot.forEach((doc) => {
                    const normalized = normalizeDashboardUserProfile(doc.id, doc.data());
                    if (normalized) {
                        list.push(normalized);
                    }
                });
                setUsers(list);
            }),
            onSnapshot(collection(db, "drops"), (snapshot) => {
                const list: Drop[] = [];
                snapshot.forEach((doc) => {
                    try {
                        list.push(normalizeDropRecord(doc.data(), doc.id));
                    } catch {
                        // Skip malformed records to keep dashboard stable.
                    }
                });
                setDrops(list);
            }),
            onSnapshot(query(collection(db, "transactions"), orderBy("timestamp", "desc"), limit(20)), (snapshot) => {
                const list: Transaction[] = [];
                snapshot.forEach((doc) => {
                    try {
                        list.push(normalizeTransactionRecord(doc.data(), doc.id));
                    } catch {
                        // Skip malformed records to keep dashboard stable.
                    }
                });
                setTransactions(list);
            }),
            onSnapshot(query(collection(db, "transactions"), where("type", "in", ["purchase_currency", "purchase"])), (snapshot) => {
                let revenueCents = 0;
                snapshot.forEach((doc) => {
                    try {
                        revenueCents += getTransactionRevenueCents(normalizeTransactionRecord(doc.data(), doc.id));
                    } catch {
                        // Ignore malformed purchase records.
                    }
                });
                setPurchaseRevenueCents(revenueCents);
            }),
        ];

        return () => unsubs.forEach((unsubscribe) => unsubscribe());
    }, []);

    const stats = useMemo(() => {
        const totalUsers = users.length;
        const activeDrops = drops.filter((drop) => drop.status === "active").length;
        const totalDrops = drops.length;
        const totalStorage = drops.reduce((sum, drop) => sum + (drop.fileMetadata?.size || 0), 0);
        const totalUnwraps = drops.reduce((sum, drop) => sum + (drop.totalUnlocks || 0), 0);
        const totalViews = drops.reduce((sum, drop) => sum + (drop.totalClicks || 0), 0);

        return { totalUsers, activeDrops, totalDrops, totalStorage, grossRevenueCents: purchaseRevenueCents, totalUnwraps, totalViews };
    }, [users, drops, purchaseRevenueCents]);

    const topDrops = useMemo(() => [...drops].sort((a, b) => (b.totalUnlocks || 0) - (a.totalUnlocks || 0)).slice(0, 5), [drops]);

    return (
        <div>
            <header className="mb-10">
                <h1 className="text-3xl font-bold text-white mb-2">Admin Analytics</h1>
                <p className="text-gray-400">Live product health and retention signals based on real app activity.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                <StatCard title="Total Users" value={String(stats.totalUsers)} icon={<Users className="w-5 h-5 text-brand-cyan" />} subValue="Live user count" />
                <StatCard title="Active Drops" value={String(stats.activeDrops)} icon={<Activity className="w-5 h-5 text-brand-green" />} subValue={`of ${stats.totalDrops} total`} />
                <StatCard title="Purchase Revenue" value={`$${(stats.grossRevenueCents / 100).toFixed(2)}`} icon={<DollarSign className="w-5 h-5 text-brand-yellow" />} subValue="Completed purchases" />
                <StatCard title="Drop Views" value={stats.totalViews.toLocaleString()} icon={<MousePointerClick className="w-5 h-5 text-brand-purple" />} subValue="Tracked through drops click events" />
                <StatCard title="Total Unwraps" value={stats.totalUnwraps.toLocaleString()} icon={<Package className="w-5 h-5 text-brand-pink" />} subValue="Successful unlocks" />
                <StatCard title="Storage Used" value={formatBytes(stats.totalStorage)} icon={<Package className="w-5 h-5 text-brand-blue" />} subValue="Uploaded drop assets" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="glass-panel p-6 rounded-3xl">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-white">Top Performing Drops</h3>
                        <span className="text-xs text-gray-400">By unwrap count</span>
                    </div>
                    <div className="space-y-4">
                        {topDrops.length === 0 ? (
                            <div className="text-sm text-gray-500 py-4 text-center">No drops found.</div>
                        ) : topDrops.map((drop) => (
                            <div key={drop.id} className="flex items-center justify-between rounded-xl border border-white/5 p-3">
                                <div>
                                    <div className="font-bold text-white line-clamp-1">{drop.title}</div>
                                    <div className="text-xs text-gray-500">{drop.totalUnlocks || 0} unwraps • {drop.totalClicks || 0} clicks</div>
                                </div>
                                <span className="text-xs font-mono text-brand-purple">{drop.unlockCost} GD</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="glass-panel p-6 rounded-3xl">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-white">Recent Transactions</h3>
                        <span className="text-xs text-gray-400">Realtime</span>
                    </div>
                    <div className="space-y-4">
                        {transactions.length === 0 ? (
                            <div className="text-sm text-gray-500 py-4 text-center">No recent transactions.</div>
                        ) : transactions.map((tx) => {
                            const timestamp = tx.timestamp > 0 ? tx.timestamp : Date.now();
                            return (
                                <div key={tx.id} className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0">
                                    <div>
                                        <div className="text-sm font-semibold text-white line-clamp-1">{tx.description}</div>
                                        <div className="text-xs text-gray-500">{tx.userId.slice(0, 8)}…</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-mono text-brand-green">{tx.amount > 0 ? "+" : ""}{tx.amount}</div>
                                        <div className="text-[10px] text-gray-500">{formatDistanceToNow(timestamp, { addSuffix: true })}</div>
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

function StatCard({ title, value, icon, subValue }: { title: string; value: string; icon: React.ReactNode; subValue: string }) {
    return (
        <div className="glass-panel p-6 rounded-3xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-60">
                <div className="p-3 bg-white/5 rounded-2xl border border-white/5">{icon}</div>
            </div>
            <p className="text-sm font-medium text-gray-400 mb-1">{title}</p>
            <h3 className="text-3xl font-bold text-white tracking-tight mb-2">{value}</h3>
            <span className="text-xs text-gray-500">{subValue}</span>
        </div>
    );
}

function formatBytes(bytes: number, decimals = 2) {
    if (!+bytes) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function normalizeDashboardUserProfile(id: string, raw: unknown): UserProfile | null {
    if (!raw || typeof raw !== "object") {
        return null;
    }

    const source = raw as Record<string, unknown>;
    const rawUnlocked = source.unlockedContent;
    const unlockedContent = Array.isArray(rawUnlocked) ? rawUnlocked.filter((entry): entry is string => typeof entry === "string") : [];

    const rawStatus = source.status;
    const status = rawStatus === "active" || rawStatus === "suspended" || rawStatus === "banned" ? rawStatus : "active";

    return {
        uid: typeof source.uid === "string" ? source.uid : id,
        email: typeof source.email === "string" || source.email === null ? source.email : null,
        displayName: typeof source.displayName === "string" || source.displayName === null ? source.displayName : null,
        photoURL: typeof source.photoURL === "string" || source.photoURL === null ? source.photoURL : null,
        gumDropsBalance: typeof source.gumDropsBalance === "number" && Number.isFinite(source.gumDropsBalance) ? source.gumDropsBalance : 0,
        unlockedContent,
        createdAt: typeof source.createdAt === "number" && Number.isFinite(source.createdAt) ? source.createdAt : 0,
        status,
        role: source.role === "admin" || source.role === "creator" || source.role === "user" ? source.role : "user",
    };
}
