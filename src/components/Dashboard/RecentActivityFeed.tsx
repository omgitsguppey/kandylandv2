"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase-data";
import { useAuth } from "@/context/AuthContext";
import { Activity, ArrowDownLeft, ArrowUpRight, Gift, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Transaction } from "@/types/db";
import { normalizeTransactionRecord } from "@/lib/transaction-normalizers";

export function RecentActivityFeed() {
    const { user } = useAuth();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        async function fetchRecentActivity() {
            if (!user) return;
            try {
                const q = query(
                    collection(db, "transactions"),
                    where("userId", "==", user.uid),
                    orderBy("createdAt", "desc"),
                    limit(5)
                );

                const snapshot = await getDocs(q);
                if (!mounted) return;

                const txs: Transaction[] = [];
                snapshot.forEach(doc => {
                    try {
                        txs.push(normalizeTransactionRecord(doc.data(), doc.id));
                    } catch (e) {
                        console.error("Malformed transaction", e);
                    }
                });

                setTransactions(txs);
            } catch (error) {
                console.error("Failed to fetch recent activity", error);
            } finally {
                if (mounted) setLoading(false);
            }
        }

        fetchRecentActivity();

        return () => { mounted = false; };
    }, [user]);

    if (!user) return null;

    return (
        <div className="glass-panel p-6 rounded-3xl mt-6 lg:mt-8">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-brand-purple" /> Recent Activity
            </h3>

            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-brand-purple/50" />
                </div>
            ) : transactions.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-sm">
                    No recent activity found. Unwraps and purchases will appear here.
                </div>
            ) : (
                <div className="space-y-3">
                    {transactions.map(tx => (
                        <div key={tx.id} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.type === 'purchase_currency' ? 'bg-brand-purple/20 text-brand-purple' :
                                    tx.type === 'daily_reward' ? 'bg-brand-purple/20 text-brand-purple' :
                                        'bg-brand-purple/20 text-brand-purple'
                                    }`}>
                                    {tx.type === 'purchase_currency' || tx.type === 'daily_reward' || tx.type === 'admin_adjustment' ? (
                                        <ArrowDownLeft className="w-5 h-5" />
                                    ) : tx.type === 'unlock_content' ? (
                                        <ArrowUpRight className="w-5 h-5" />
                                    ) : (
                                        <Gift className="w-5 h-5" />
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white capitalize line-clamp-1">
                                        {tx.type.replace('_', ' ')}
                                        {tx.description && ` - ${tx.description}`}
                                    </p>
                                    <p className="text-[10px] text-gray-400">
                                        {tx.timestamp ? formatDistanceToNow(new Date(tx.timestamp), { addSuffix: true }) : "Just now"}
                                    </p>
                                </div>
                            </div>
                            <div className={`font-bold text-sm ${['purchase_currency', 'daily_reward', 'admin_adjustment'].includes(tx.type)
                                ? 'text-brand-purple'
                                : 'text-white'
                                }`}>
                                {['purchase_currency', 'daily_reward', 'admin_adjustment'].includes(tx.type) ? '+' : '-'}{tx.amount} GD
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
