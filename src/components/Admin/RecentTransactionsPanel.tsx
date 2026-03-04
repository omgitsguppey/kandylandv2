"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query, limit } from "firebase/firestore";
import { db } from "@/lib/firebase-data";
import { Transaction } from "@/types/db";
import { normalizeTransactionRecord } from "@/lib/transaction-normalizers";
import { formatDistanceToNow } from "date-fns";

/**
 * Displays the 20 most recent transactions with a real-time listener.
 * Owns its own onSnapshot subscription scoped to recent transactions.
 */
export function RecentTransactionsPanel() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    useEffect(() => {
        const unsub = onSnapshot(
            query(collection(db, "transactions"), orderBy("timestamp", "desc"), limit(20)),
            (snapshot) => {
                const list: Transaction[] = [];
                snapshot.forEach((doc) => {
                    try { list.push(normalizeTransactionRecord(doc.data(), doc.id)); } catch { /* skip malformed */ }
                });
                setTransactions(list);
            },
        );
        return () => unsub();
    }, []);

    return (
        <div className="glass-panel p-6 rounded-3xl">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white">Recent Transactions</h3>
                <span className="text-xs text-gray-400">Realtime</span>
            </div>
            <div className="space-y-4">
                {transactions.length === 0 ? (
                    <div className="text-sm text-gray-500 py-4 text-center">No recent transactions.</div>
                ) : transactions.map((tx) => {
                    const timestamp = (tx.timestamp as number) > 0 ? (tx.timestamp as number) : Date.now();
                    return (
                        <div key={tx.id} className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0">
                            <div>
                                <div className="text-sm font-semibold text-white line-clamp-1">{tx.description}</div>
                                <div className="text-xs text-gray-500">{tx.userId.slice(0, 8)}…</div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-mono text-brand-purple">{tx.amount > 0 ? "+" : ""}{tx.amount}</div>
                                <div className="text-[10px] text-gray-500">{formatDistanceToNow(timestamp, { addSuffix: true })}</div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
