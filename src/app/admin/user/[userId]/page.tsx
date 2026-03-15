"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { format, formatDistanceToNow } from "date-fns";
import {
    Activity,
    AlertCircle,
    ArrowLeft,
    Ban,
    CalendarDays,
    Eye,
    History,
    Play,
    ShieldAlert,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";
import { deriveGumdropEconomics } from "@/lib/gumdrop-economics";
import { Transaction, UserProfile } from "@/types/db";
import { authFetch } from "@/lib/authFetch";

type UserDetailAnalytics = {
    eventCount: number;
    unwrapCount: number;
    purchaseCount: number;
    viewerSessionCount: number;
    viewerCompletionCount: number;
    assetViewCount: number;
    assetCompletionCount: number;
    uniqueViewedDrops: number;
    watchSecondsTotal: number;
    watchHours: number;
    viewCount: number;
    downloadCount: number;
    relatedClickCount: number;
    avgLoadMs: number;
    lastSeenAt: number;
    grossRevenueUsd: number;
    netRevenueUsd: number;
    paypalFeeUsd: number;
    adjustedProfitUsd: number;
    bonusValueUsd: number;
    bonusGumDrops: number;
    deliveredGumDrops: number;
    paidGumDrops: number;
    unlockSpendGdTotal: number;
    topViewedDrops: Array<{ dropId: string; dropTitle: string; views: number; watchSeconds: number }>;
};

type SecurityEventItem = {
    id: string;
    label: string;
    message: string;
    locationLabel: string;
    severity: string;
    dropId: string | null;
    dropTitle?: string | null;
    timestamp: number;
};

export default function AdminUserAnalyticsPage() {
    const params = useParams();
    const router = useRouter();
    const { userProfile, loading: authLoading } = useAuth();

    const userId = params?.userId as string;

    const [targetUser, setTargetUser] = useState<UserProfile | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [analytics, setAnalytics] = useState<UserDetailAnalytics | null>(null);
    const [securityEvents, setSecurityEvents] = useState<SecurityEventItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const isAdmin = userProfile?.role === "admin";

    useEffect(() => {
        if (authLoading || !isAdmin || !userId) return;

        async function fetchUserData() {
            try {
                const response = await authFetch(`/api/admin/user/${userId}`);
                const result = await response.json() as {
                    success?: boolean;
                    user?: UserProfile;
                    transactions?: Transaction[];
                    analytics?: UserDetailAnalytics;
                    securityEvents?: SecurityEventItem[];
                    error?: string;
                };

                if (!response.ok || !result.success || !result.user) {
                    throw new Error(result.error || "Failed to load deeper analytics. Try again.");
                }

                setTargetUser(result.user);
                setTransactions(result.transactions || []);
                setAnalytics(result.analytics || null);
                setSecurityEvents(result.securityEvents || []);
            } catch (fetchError: unknown) {
                console.error("Failed to load user analytics.", fetchError);
                const message = fetchError instanceof Error ? fetchError.message : "Failed to load deeper analytics. Try again.";
                setError(message === "User not found" ? "User not found." : message);
            } finally {
                setLoading(false);
            }
        }

        void fetchUserData();
    }, [authLoading, isAdmin, userId]);

    const purchaseTransactions = useMemo(() => (
        transactions
            .filter((transaction) => transaction.status === "completed" && (transaction.type === "purchase_currency" || String(transaction.type) === "purchase"))
            .map((transaction) => ({
                ...transaction,
                economics: deriveGumdropEconomics(
                    transaction.deliveredGumDrops ?? transaction.amount,
                    transaction.grossRevenueUsd ?? transaction.cost ?? 0,
                ),
            }))
    ), [transactions]);

    const totalSpentUsd = analytics?.grossRevenueUsd ?? purchaseTransactions.reduce((sum, transaction) => sum + transaction.economics.grossRevenueUsd, 0);
    const adjustedProfitUsd = analytics?.adjustedProfitUsd ?? purchaseTransactions.reduce((sum, transaction) => sum + transaction.economics.adjustedProfitUsd, 0);
    const bonusValueUsd = analytics?.bonusValueUsd ?? purchaseTransactions.reduce((sum, transaction) => sum + transaction.economics.bonusValueUsd, 0);
    const bonusGumDrops = analytics?.bonusGumDrops ?? purchaseTransactions.reduce((sum, transaction) => sum + transaction.economics.bonusGumDrops, 0);
    const paypalFeeUsd = analytics?.paypalFeeUsd ?? purchaseTransactions.reduce((sum, transaction) => sum + transaction.economics.paypalFeeUsd, 0);
    const netRevenueUsd = analytics?.netRevenueUsd ?? purchaseTransactions.reduce((sum, transaction) => sum + transaction.economics.netRevenueUsd, 0);
    const deliveredGumDrops = analytics?.deliveredGumDrops ?? purchaseTransactions.reduce((sum, transaction) => sum + transaction.economics.deliveredGumDrops, 0);
    const averageOrderUsd = (analytics?.purchaseCount || purchaseTransactions.length) > 0
        ? totalSpentUsd / (analytics?.purchaseCount || purchaseTransactions.length)
        : 0;
    const failedTxCount = transactions.filter((transaction) => transaction.status === "failed").length;

    const watchTimeLabel = useMemo(() => {
        if (!analytics?.watchSecondsTotal) {
            return "0m";
        }

        if (analytics.watchSecondsTotal >= 3600) {
            return `${analytics.watchHours.toFixed(1)}h`;
        }

        return `${Math.max(1, Math.round(analytics.watchSecondsTotal / 60))}m`;
    }, [analytics]);

    if (authLoading || loading) {
        return (
            <div className="flex min-h-[300px] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-purple border-t-transparent" />
            </div>
        );
    }

    if (!isAdmin) {
        return <div className="p-8 text-center text-red-500">Access Restricted</div>;
    }

    if (error || !targetUser) {
        return (
            <div className="p-8 text-center text-gray-300">
                <AlertCircle className="mx-auto mb-4 h-8 w-8 text-red-500" />
                <p>{error}</p>
                <button onClick={() => router.back()} className="mt-4 text-brand-purple underline">
                    Go back
                </button>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-5xl space-y-6 pb-20">
            <AdminPageHeader
                eyebrow="Admin Roster"
                topSlot={(
                    <button
                        onClick={() => router.back()}
                        className="inline-flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
                    >
                        <ArrowLeft className="h-4 w-4" /> Back to Roster
                    </button>
                )}
                title={(
                    <span className="inline-flex flex-wrap items-center justify-center gap-2">
                        <span>{targetUser.displayName || targetUser.email || "User"}</span>
                        {targetUser.status !== "active" ? (
                            <span className="rounded-full border border-red-500/20 bg-red-500/20 px-2 py-0.5 text-[10px] uppercase text-red-400">
                                {targetUser.status}
                            </span>
                        ) : null}
                    </span>
                )}
                subtitle={(
                    <span className="flex flex-col items-center gap-1 text-center sm:flex-row sm:flex-wrap sm:justify-center">
                        <span className="font-mono text-xs text-gray-400">{targetUser.email || "No email"}</span>
                        <span className="hidden text-gray-600 sm:inline">|</span>
                        <span className="break-all font-mono text-xs text-gray-500">{targetUser.uid}</span>
                        <span className="hidden text-gray-600 sm:inline">|</span>
                        <span className="inline-flex items-center gap-1 text-xs text-brand-purple/80">
                            <CalendarDays className="h-3 w-3" />
                            Joined {format(targetUser.createdAt, "PPP")}
                        </span>
                    </span>
                )}
                actions={(
                    <div className="flex w-full max-w-2xl flex-col gap-3 sm:flex-row sm:items-stretch">
                        <div className="flex min-h-[5.75rem] flex-1 items-center justify-center gap-4 rounded-[1.6rem] border border-white/10 bg-black/35 px-5 py-4">
                            <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-brand-purple/30 bg-zinc-800">
                                {targetUser.photoURL ? (
                                    <Image src={targetUser.photoURL} alt="Avatar" fill className="object-cover" />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-black text-2xl font-black text-white">
                                        {targetUser.displayName?.charAt(0) || "U"}
                                    </div>
                                )}
                            </div>
                            <div className="text-left">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Profile Snapshot</p>
                                <p className="mt-1 text-sm font-semibold text-white">
                                    {targetUser.username ? `@${targetUser.username}` : "No public username"}
                                </p>
                                <p className="mt-1 text-xs text-gray-500">Detailed activity, watch behavior, and protection events for this account.</p>
                            </div>
                        </div>
                        <div className="grid flex-1 grid-cols-2 gap-3">
                            <div className="rounded-[1.6rem] border border-white/10 bg-black/35 px-4 py-4 text-center">
                                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">Current Balance</p>
                                <p className="mt-2 text-2xl font-black text-brand-purple">{targetUser.gumDropsBalance}</p>
                            </div>
                            <div className="rounded-[1.6rem] border border-white/10 bg-black/35 px-4 py-4 text-center">
                                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">Total Drops</p>
                                <p className="mt-2 text-2xl font-black text-white">{targetUser.unlockedContent?.length || 0}</p>
                            </div>
                        </div>
                    </div>
                )}
            />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="glass-panel rounded-3xl border border-white/5 p-6">
                    <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-white">
                        <Activity className="h-4 w-4 text-brand-purple" /> Behavior Profile
                    </h3>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-white/5 py-2">
                            <span className="text-sm text-gray-400">Gross cash</span>
                            <span className="text-sm font-bold text-brand-purple">${totalSpentUsd.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-white/5 py-2">
                            <span className="text-sm text-gray-400">PayPal fees</span>
                            <span className="text-sm font-bold text-white">${paypalFeeUsd.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-white/5 py-2">
                            <span className="text-sm text-gray-400">Net cash</span>
                            <span className="text-sm font-bold text-white">${netRevenueUsd.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-white/5 py-2">
                            <span className="text-sm text-gray-400">Adjusted profit</span>
                            <span className="text-sm font-bold text-white">${adjustedProfitUsd.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-white/5 py-2">
                            <span className="text-sm text-gray-400">Bonus granted</span>
                            <span className="text-sm font-bold text-white">{bonusGumDrops.toLocaleString()} GD</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-white/5 py-2">
                            <span className="text-sm text-gray-400">Bonus value</span>
                            <span className="text-sm font-bold text-white">${bonusValueUsd.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-white/5 py-2">
                            <span className="text-sm text-gray-400">Avg order</span>
                            <span className="text-sm font-bold text-white">${averageOrderUsd.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-white/5 py-2">
                            <span className="text-sm text-gray-400">Effective rate</span>
                            <span className="text-sm font-bold text-white">
                                ${deliveredGumDrops > 0 ? (totalSpentUsd / (deliveredGumDrops / 100)).toFixed(2) : "0.00"} / 100 GD
                            </span>
                        </div>
                        <div className="flex items-center justify-between border-b border-white/5 py-2">
                            <span className="text-sm text-gray-400">Failed transactions</span>
                            <span className="text-sm font-bold text-red-400">{failedTxCount}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-white/5 py-2">
                            <span className="text-sm text-gray-400">Tracked actions</span>
                            <span className="text-sm font-bold text-white">{analytics?.eventCount || 0}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-white/5 py-2">
                            <span className="text-sm text-gray-400">Unwraps</span>
                            <span className="text-sm font-bold text-white">{analytics?.unwrapCount || 0}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-white/5 py-2">
                            <span className="text-sm text-gray-400">Unlock spend</span>
                            <span className="text-sm font-bold text-white">{analytics?.unlockSpendGdTotal || 0} GD</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-white/5 py-2">
                            <span className="text-sm text-gray-400">Viewer sessions</span>
                            <span className="text-sm font-bold text-white">{analytics?.viewerSessionCount || 0}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-white/5 py-2">
                            <span className="text-sm text-gray-400">Unique drops viewed</span>
                            <span className="text-sm font-bold text-white">{analytics?.uniqueViewedDrops || 0}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-white/5 py-2">
                            <span className="text-sm text-gray-400">Watch time</span>
                            <span className="text-sm font-bold text-white">{watchTimeLabel}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-white/5 py-2">
                            <span className="text-sm text-gray-400">Files started / completed</span>
                            <span className="text-sm font-bold text-white">
                                {analytics?.assetViewCount || 0} / {analytics?.assetCompletionCount || 0}
                            </span>
                        </div>
                        <div className="flex items-center justify-between border-b border-white/5 py-2">
                            <span className="text-sm text-gray-400">Avg load</span>
                            <span className="text-sm font-bold text-white">{analytics?.avgLoadMs || 0}ms</span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                            <span className="text-sm text-gray-400">Last seen</span>
                            <span className="text-sm font-bold text-white">
                                {analytics?.lastSeenAt ? formatDistanceToNow(analytics.lastSeenAt, { addSuffix: true }) : "No activity yet"}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="glass-panel rounded-3xl border border-white/5 p-6">
                    <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-white">
                        <History className="h-4 w-4 text-brand-purple" /> Action Ledger
                    </h3>

                    <div className="custom-scrollbar max-h-[400px] space-y-3 overflow-y-auto pr-2">
                        {transactions.length === 0 ? (
                            <p className="py-8 text-center text-sm text-gray-500">No behavior logged yet.</p>
                        ) : (
                            transactions.map((transaction) => {
                                const transactionType = String(transaction.type);

                                return (
                                    <div key={transaction.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-black/40 p-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="line-clamp-1 text-sm font-bold text-white">
                                                {transaction.description || transactionType}
                                            </div>
                                            <div className="mt-1 font-mono text-[10px] text-gray-500">
                                                {formatDistanceToNow((transaction.timestamp as number) > 0 ? (transaction.timestamp as number) : Date.now(), { addSuffix: true })}
                                            </div>
                                        </div>
                                        <div className="ml-4 flex shrink-0 flex-col items-end gap-1">
                                            {transaction.type === "unlock_content" ? (
                                                <span className="rounded-md border border-white/10 bg-zinc-800 px-2 py-0.5 text-xs font-bold text-zinc-400">
                                                    {transaction.amount} GD
                                                </span>
                                            ) : transactionType === "purchase_currency" || transactionType === "purchase" ? (
                                                <span className="rounded-md border border-brand-purple/20 bg-brand-purple/10 px-2 py-0.5 text-xs font-bold text-brand-purple">
                                                    ${((transaction.grossRevenueUsd ?? transaction.cost ?? 0)).toFixed(2)}
                                                </span>
                                            ) : (
                                                <span className="text-xs font-bold text-gray-400">Log</span>
                                            )}

                                            {transaction.status === "failed" ? (
                                                <span className="flex items-center gap-1 text-[9px] font-bold uppercase text-red-500">
                                                    <Ban className="h-2 w-2" /> Failed
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="glass-panel rounded-3xl border border-white/5 p-6">
                    <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-white">
                        <Play className="h-4 w-4 text-brand-purple" /> Top Viewed Drops
                    </h3>
                    <div className="space-y-3">
                        {(analytics?.topViewedDrops?.length || 0) === 0 ? (
                            <p className="text-sm text-gray-500">No library viewing has been tracked for this user yet.</p>
                        ) : (
                            analytics!.topViewedDrops.map((dropEntry) => (
                                <div key={dropEntry.dropId} className="rounded-2xl border border-white/5 bg-black/35 px-4 py-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-bold text-white">{dropEntry.dropTitle}</p>
                                            <p className="mt-1 text-xs text-gray-500">Drop ID: {dropEntry.dropId}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="inline-flex items-center gap-1 text-sm font-bold text-brand-purple">
                                                <Eye className="h-3.5 w-3.5" />
                                                {dropEntry.views}
                                            </p>
                                            <p className="mt-1 text-xs text-gray-400">
                                                {dropEntry.watchSeconds > 0
                                                    ? `${Math.max(1, Math.round(dropEntry.watchSeconds / 60))}m watched`
                                                    : "No completed watch time"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="glass-panel rounded-3xl border border-white/5 p-6">
                    <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-white">
                        <ShieldAlert className="h-4 w-4 text-brand-purple" /> Security Events
                    </h3>
                    <div className="space-y-3">
                        {securityEvents.length === 0 ? (
                            <p className="text-sm text-gray-500">No viewer protection issues have been logged for this account.</p>
                        ) : (
                            securityEvents.map((event) => (
                                <div key={event.id} className="rounded-2xl border border-white/5 bg-black/35 px-4 py-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-white">{event.label}</p>
                                            <p className="mt-1 text-sm leading-6 text-gray-400">{event.message}</p>
                                            <p className="mt-2 text-xs text-gray-500">
                                                {event.locationLabel}
                                                {event.dropTitle ? ` | ${event.dropTitle}` : event.dropId ? ` | Drop ${event.dropId}` : ""}
                                            </p>
                                            {event.dropTitle && event.dropId ? (
                                                <p className="mt-1 text-[11px] text-gray-500">{event.dropId}</p>
                                            ) : null}
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${
                                                event.severity === "high"
                                                    ? "bg-red-500/15 text-red-300"
                                                    : event.severity === "medium"
                                                        ? "bg-amber-500/15 text-amber-300"
                                                        : "bg-white/10 text-gray-300"
                                            }`}>
                                                {event.severity}
                                            </span>
                                            <p className="mt-2 text-xs text-gray-500">
                                                {event.timestamp ? formatDistanceToNow(event.timestamp, { addSuffix: true }) : "Time unavailable"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    {targetUser.securityFlags?.ripAttempts ? (
                        <p className="mt-4 text-xs text-gray-500">
                            Total viewer protection interruptions logged on this account: {targetUser.securityFlags.ripAttempts}
                        </p>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
