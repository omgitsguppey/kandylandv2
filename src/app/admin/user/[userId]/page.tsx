"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { collection, doc, getDoc, getDocs, orderBy, query, where } from "firebase/firestore";
import Image from "next/image";
import { format, formatDistanceToNow } from "date-fns";
import { User } from "firebase/auth";
import { Activity, AlertCircle, ArrowLeft, Ban, CalendarDays, History } from "lucide-react";

import { db } from "@/lib/firebase-data";
import { useAuth } from "@/context/AuthContext";
import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";
import { normalizeTransactionRecord } from "@/lib/transaction-normalizers";
import { normalizeUserProfile } from "@/lib/user-utils";
import { Transaction, UserProfile } from "@/types/db";

export default function AdminUserAnalyticsPage() {
    const params = useParams();
    const router = useRouter();
    const { userProfile, loading: authLoading } = useAuth();

    const userId = params?.userId as string;

    const [targetUser, setTargetUser] = useState<UserProfile | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const isAdmin = userProfile?.role === "admin";

    useEffect(() => {
        if (authLoading || !isAdmin || !userId) return;

        async function fetchUserData() {
            try {
                const userDoc = await getDoc(doc(db, "users", userId));
                if (!userDoc.exists()) {
                    setError("User not found.");
                    setLoading(false);
                    return;
                }

                const targetData = userDoc.data();
                const mockUser = {
                    uid: userId,
                    email: targetData.email || "",
                    displayName: targetData.displayName || "",
                    photoURL: targetData.photoURL || "",
                } as User;
                setTargetUser(normalizeUserProfile(targetData, mockUser) as UserProfile);

                const txQuery = query(
                    collection(db, "transactions"),
                    where("userId", "==", userId),
                    orderBy("timestamp", "desc")
                );

                const txDocs = await getDocs(txQuery);
                const txList: Transaction[] = [];

                txDocs.forEach((tDoc) => {
                    try {
                        const raw = tDoc.data();
                        const normalized = normalizeTransactionRecord(raw, tDoc.id);

                        let status: "completed" | "failed" | "pending" = "completed";
                        if (raw.status === "failed" || raw.error) status = "failed";
                        if (raw.status === "pending") status = "pending";

                        txList.push({
                            ...normalized,
                            status,
                        });
                    } catch (transactionError) {
                        console.warn("Skipping malformed transaction", transactionError);
                    }
                });

                setTransactions(txList);
            } catch (fetchError: unknown) {
                console.error("Failed to load user analytics.", fetchError);
                setError(fetchError instanceof Error ? fetchError.message : "Failed to load deeper analytics. Try again.");
            } finally {
                setLoading(false);
            }
        }

        void fetchUserData();
    }, [authLoading, isAdmin, userId]);

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

    const totalSpent = transactions
        .filter((transaction) => transaction.status === "completed" && (transaction.type === "purchase_currency" || String(transaction.type) === "purchase"))
        .reduce((sum, transaction) => sum + (transaction.amount > 0 ? transaction.amount : 0), 0);

    const failedTxCount = transactions.filter((transaction) => transaction.status === "failed").length;

    return (
        <div className="mx-auto max-w-5xl space-y-6 pb-20">
            <AdminPageHeader
                eyebrow="Admin Roster"
                topSlot={
                    <button
                        onClick={() => router.back()}
                        className="inline-flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
                    >
                        <ArrowLeft className="h-4 w-4" /> Back to Roster
                    </button>
                }
                title={
                    <span className="inline-flex flex-wrap items-center justify-center gap-2">
                        <span>{targetUser.displayName || targetUser.email || "User"}</span>
                        {targetUser.status !== "active" ? (
                            <span className="rounded-full border border-red-500/20 bg-red-500/20 px-2 py-0.5 text-[10px] uppercase text-red-400">
                                {targetUser.status}
                            </span>
                        ) : null}
                    </span>
                }
                subtitle={
                    <span className="flex flex-col items-center gap-1 text-center sm:flex-row sm:flex-wrap sm:justify-center">
                        <span className="font-mono text-xs text-gray-400">{targetUser.email || "No email"}</span>
                        <span className="hidden text-gray-600 sm:inline">•</span>
                        <span className="break-all font-mono text-xs text-gray-500">{targetUser.uid}</span>
                        <span className="hidden text-gray-600 sm:inline">•</span>
                        <span className="inline-flex items-center gap-1 text-xs text-brand-purple/80">
                            <CalendarDays className="h-3 w-3" />
                            Joined {format(targetUser.createdAt, "PPP")}
                        </span>
                    </span>
                }
                actions={
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
                                <p className="mt-1 text-xs text-gray-500">Detailed activity and transaction behavior for this account.</p>
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
                }
            />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="glass-panel rounded-3xl border border-white/5 p-6">
                    <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-white">
                        <Activity className="h-4 w-4 text-brand-purple" /> Behavior Profile
                    </h3>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-white/5 py-2">
                            <span className="text-sm text-gray-400">Total Purchase Volume</span>
                            <span className="text-sm font-bold text-brand-purple">${(totalSpent / 100).toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-white/5 py-2">
                            <span className="text-sm text-gray-400">Failed Transactions</span>
                            <span className="text-sm font-bold text-red-400">{failedTxCount}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-white/5 py-2">
                            <span className="text-sm text-gray-400">Lifetime Pings</span>
                            <span className="text-sm font-bold text-white">{transactions.length}</span>
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
                                                    +${((transaction.amount > 0 ? transaction.amount : 0) / 100).toFixed(2)}
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
        </div>
    );
}
