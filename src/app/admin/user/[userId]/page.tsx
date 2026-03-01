"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, collection, query, where, orderBy, getDocs, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase-data";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft, Ban, CreditCard, Activity, CalendarDays, History, AlertCircle } from "lucide-react";
import Image from "next/image";
import { formatDistanceToNow, format } from "date-fns";
import { normalizeUserProfile } from "@/lib/user-utils";
import { UserProfile, Transaction } from "@/types/db";
import { normalizeTransactionRecord } from "@/lib/transaction-normalizers";

// Specific transaction type for local rendering with resolved timestamps
interface DetailedTransaction extends Transaction {
    resolvedStatus: "completed" | "failed" | "pending";
}

export default function AdminUserAnalyticsPage() {
    const params = useParams();
    const router = useRouter();
    const { userProfile, loading: authLoading } = useAuth();

    const userId = params?.userId as string;

    const [targetUser, setTargetUser] = useState<UserProfile | null>(null);
    const [transactions, setTransactions] = useState<DetailedTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const isAdmin = userProfile?.role === "admin";

    useEffect(() => {
        if (authLoading || !isAdmin || !userId) return;

        async function fetchUserData() {
            try {
                // Fetch Core Identity
                const userDoc = await getDoc(doc(db, "users", userId));
                if (!userDoc.exists()) {
                    setError("User not found.");
                    setLoading(false);
                    return;
                }
                const targetData = userDoc.data();
                const mockUser = { uid: userId, email: targetData.email || "", displayName: targetData.displayName || "", photoURL: targetData.photoURL || "" } as any;
                setTargetUser(normalizeUserProfile(targetData, mockUser) as UserProfile);

                // Fetch Behavior & Transactions (Purchases, Failed Purchases, Unlocks)
                const txQuery = query(
                    collection(db, "transactions"),
                    where("userId", "==", userId),
                    orderBy("timestamp", "desc")
                );

                const txDocs = await getDocs(txQuery);
                const txList: DetailedTransaction[] = [];

                txDocs.forEach((tDoc) => {
                    try {
                        const raw = tDoc.data();
                        const normalized = normalizeTransactionRecord(raw, tDoc.id);

                        // Infer status based on metadata (Some older records might lack direct status fields)
                        let status: "completed" | "failed" | "pending" = "completed";
                        if (raw.status === "failed" || raw.error) status = "failed";
                        if (raw.status === "pending") status = "pending";

                        txList.push({
                            ...normalized,
                            resolvedStatus: status
                        });
                    } catch (e) {
                        console.warn("Skipping malformed transaction", e);
                    }
                });

                setTransactions(txList);
            } catch (err: any) {
                console.error("Failed to load user analytics.", err);
                setError(err.message || "Failed to load deeper analytics. Try again.");
            } finally {
                setLoading(false);
            }
        }

        fetchUserData();
    }, [authLoading, isAdmin, userId]);


    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-[300px]">
                <div className="w-8 h-8 rounded-full border-2 border-brand-pink border-t-transparent animate-spin" />
            </div>
        );
    }

    if (!isAdmin) {
        return <div className="p-8 text-center text-red-500">Access Restricted</div>;
    }

    if (error || !targetUser) {
        return (
            <div className="p-8 text-center text-gray-300">
                <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
                <p>{error}</p>
                <button onClick={() => router.back()} className="mt-4 text-brand-cyan underline">Go back</button>
            </div>
        );
    }

    const totalSpent = transactions
        .filter(t => t.resolvedStatus === "completed" && (t.type === "purchase_currency" || (t.type as string) === "purchase"))
        .reduce((sum, t) => sum + (t.amount > 0 ? t.amount : 0), 0);

    const failedTxCount = transactions.filter(t => t.resolvedStatus === "failed").length;

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20">
            <button
                onClick={() => router.back()}
                className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-2 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" /> Back to Roster
            </button>

            <header className="glass-panel p-6 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-white/5">
                <div className="flex items-center gap-5">
                    <div className="relative w-20 h-20 rounded-2xl bg-zinc-800 border-2 border-brand-purple overflow-hidden">
                        {targetUser.photoURL ? (
                            <Image src={targetUser.photoURL} alt="Avatar" fill className="object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-3xl font-black text-white bg-black">
                                {targetUser.displayName?.charAt(0) || "U"}
                            </div>
                        )}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                            {targetUser.displayName}
                            {targetUser.status !== "active" && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-500 uppercase border border-red-500/20">{targetUser.status}</span>}
                        </h1>
                        <p className="text-sm text-gray-400 font-mono mt-1">{targetUser.email || "No email"} • {targetUser.uid}</p>
                        <p className="text-xs text-brand-cyan/80 mt-2 flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Joined {format(targetUser.createdAt, "PPP")}</p>
                    </div>
                </div>

                <div className="flex bg-black/40 rounded-2xl p-4 gap-8 border border-white/5">
                    <div>
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Current Balance</p>
                        <p className="text-2xl font-black text-brand-pink">{targetUser.gumDropsBalance}</p>
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Total Drops</p>
                        <p className="text-2xl font-black text-white">{targetUser.unlockedContent?.length || 0}</p>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Analytics Summary */}
                <div className="glass-panel p-6 rounded-3xl border border-white/5">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                        <Activity className="w-4 h-4 text-brand-cyan" /> Behavior Profile
                    </h3>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center py-2 border-b border-white/5">
                            <span className="text-sm text-gray-400">Total Purchase Volume</span>
                            <span className="text-sm font-bold text-brand-green">${(totalSpent / 100).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-white/5">
                            <span className="text-sm text-gray-400">Failed Transactions</span>
                            <span className="text-sm font-bold text-red-400">{failedTxCount}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-white/5">
                            <span className="text-sm text-gray-400">Lifetime Pings</span>
                            <span className="text-sm font-bold text-white">{transactions.length}</span>
                        </div>
                    </div>
                </div>

                {/* Event Ledger */}
                <div className="glass-panel p-6 rounded-3xl border border-white/5">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                        <History className="w-4 h-4 text-brand-purple" /> Action Ledger
                    </h3>

                    <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                        {transactions.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-8">No behavior logged yet.</p>
                        ) : (
                            transactions.map(tx => {
                                const tType = tx.type as string;
                                return (
                                    <div key={tx.id} className="bg-black/40 rounded-xl p-3 border border-white/5 flex items-center justify-between">
                                        <div className="min-w-0 flex-1">
                                            <div className="text-sm font-bold text-white line-clamp-1">{tx.description || tType}</div>
                                            <div className="text-[10px] text-gray-500 font-mono mt-1">
                                                {formatDistanceToNow(tx.timestamp > 0 ? tx.timestamp : Date.now(), { addSuffix: true })}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1 ml-4 shrink-0">
                                            {tx.type === "unlock_content" ? (
                                                <span className="text-xs font-bold text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-md border border-white/10">{tx.amount} GD</span>
                                            ) : tType === "purchase_currency" || tType === "purchase" ? (
                                                <span className="text-xs font-bold text-brand-green bg-brand-green/10 px-2 py-0.5 rounded-md border border-brand-green/20">+${((tx.amount > 0 ? tx.amount : 0) / 100).toFixed(2)}</span>
                                            ) : (
                                                <span className="text-xs font-bold text-gray-400">Log</span>
                                            )}

                                            {tx.resolvedStatus === "failed" && (
                                                <span className="text-[9px] text-red-500 font-bold uppercase flex items-center gap-1"><Ban className="w-2 h-2" /> Failed</span>
                                            )}
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
