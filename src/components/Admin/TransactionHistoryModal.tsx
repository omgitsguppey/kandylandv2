"use client";

import { useState, useEffect } from "react";
import { UserProfile, Transaction } from "@/types/db";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase-data";
import { Button } from "@/components/ui/Button";
import { Loader2, ScrollText, ArrowDownLeft, ArrowUpRight, TrendingUp } from "lucide-react";
import { format } from "date-fns";

interface Props {
    user: UserProfile | null;
    onClose: () => void;
}

export function TransactionHistoryModal({ user, onClose }: Props) {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const fetchHistory = async () => {
            setLoading(true);
            try {
                const q = query(
                    collection(db, "transactions"),
                    where("userId", "==", user.uid),
                    orderBy("timestamp", "desc"),
                    limit(30)
                );

                const snapshot = await getDocs(q);
                const txs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
                setTransactions(txs);
            } catch (error) {
                console.error("Error fetching transactions:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [user]);

    if (!user) return null;

    const formatTxTime = (ts: any) => {
        if (!ts) return "Unknown";
        // Handle Firestore Timestamp
        const ms = ts.toMillis ? ts.toMillis() : (typeof ts === 'number' ? ts : Date.now());
        return format(ms, 'MMM d, h:mm a');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 max-w-lg w-full flex flex-col max-h-[85vh] shadow-2xl animate-in fade-in zoom-in-95 duration-200">

                <div className="flex items-center justify-between mb-6 shrink-0">
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <ScrollText className="w-5 h-5 text-brand-pink" />
                            History: {user.displayName || "User"}
                        </h3>
                        <p className="text-sm text-gray-400 mt-1">Showing last 30 transactions</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-center">
                        <span className="block text-[10px] font-bold text-gray-500 uppercase">Balance</span>
                        <span className="font-mono font-bold text-brand-pink">{user.gumDropsBalance || 0} 🍬</span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto mb-6 pr-2 -mr-2 space-y-3 custom-scrollbar">
                    {loading ? (
                        <div className="py-12 flex justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-brand-pink" />
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="text-center py-12 bg-white/5 rounded-xl border border-white/5 text-gray-500 text-sm">
                            <ScrollText className="w-8 h-8 mx-auto mb-3 opacity-20" />
                            No transactions found for this user.
                        </div>
                    ) : (
                        transactions.map(tx => {
                            const isPositive = tx.amount > 0;
                            const isZero = tx.amount === 0;

                            return (
                                <div key={tx.id} className="flex items-center justify-between bg-black/40 border border-white/5 p-3 rounded-xl hover:bg-white/5 transition-colors">
                                    <div className="flex-1 min-w-0 pr-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            {tx.type === 'admin_adjustment' ? (
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 capitalize">Admin</span>
                                            ) : tx.type === 'unlock_content' ? (
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 capitalize">Unlock</span>
                                            ) : tx.type === 'purchase_currency' ? (
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20 capitalize">Purchase</span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-500/10 text-gray-400 border border-gray-500/20 capitalize">{tx.type}</span>
                                            )}
                                            <span className="text-xs text-gray-500 whitespace-nowrap">{formatTxTime(tx.timestamp)}</span>
                                        </div>
                                        <p className="text-sm text-gray-300 truncate" title={tx.description}>
                                            {tx.description || "No description"}
                                        </p>
                                    </div>

                                    <div className={`flex items-center gap-1 font-mono font-bold shrink-0 ${isPositive ? 'text-green-400' : isZero ? 'text-gray-400' : 'text-red-400'}`}>
                                        {isPositive ? <ArrowUpRight className="w-4 h-4" /> : isZero ? <TrendingUp className="w-4 h-4 text-gray-500" /> : <ArrowDownLeft className="w-4 h-4" />}
                                        {isPositive ? '+' : ''}{tx.amount}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="flex justify-end shrink-0 pt-4 border-t border-white/10">
                    <Button variant="ghost" onClick={onClose}>Close</Button>
                </div>
            </div>
        </div>
    );
}
