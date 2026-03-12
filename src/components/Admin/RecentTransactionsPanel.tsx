"use client";

import { useEffect, useState, useRef } from "react";
import { collection, onSnapshot, orderBy, query, limit, getDocs, where } from "firebase/firestore";
import { db } from "@/lib/firebase-data";
import { Transaction } from "@/types/db";
import { normalizeTransactionRecord } from "@/lib/transaction-normalizers";
import { formatDistanceToNow } from "date-fns";

const INITIAL_TRANSACTIONS_NOW = Date.now();

/**
 * Displays the 20 most recent transactions with a real-time listener.
 * Owns its own onSnapshot subscription scoped to recent transactions.
 */
export function RecentTransactionsPanel() {
    const [transactions, setTransactions] = useState<(Transaction & { username?: string })[]>([]);
    const [nowMs, setNowMs] = useState(INITIAL_TRANSACTIONS_NOW);
    const userMapCache = useRef<Record<string, string>>({});

    useEffect(() => {
        const unsub = onSnapshot(
            query(collection(db, "transactions"), orderBy("timestamp", "desc"), limit(20)),
            async (snapshot) => {
                const list: Transaction[] = [];
                const requiredUids = new Set<string>();

                snapshot.forEach((doc) => {
                    try {
                        const tx = normalizeTransactionRecord(doc.data(), doc.id);
                        list.push(tx);
                        if (tx.userId) requiredUids.add(tx.userId);
                    } catch { /* skip malformed */ }
                });

                const missingUids = Array.from(requiredUids).filter(uid => !userMapCache.current[uid]);

                if (missingUids.length > 0) {
                    try {
                        for (let i = 0; i < missingUids.length; i += 30) {
                            const chunk = missingUids.slice(i, i + 30);
                            const usersSnap = await getDocs(query(collection(db, "users"), where("__name__", "in", chunk)));
                            usersSnap.forEach(uDoc => {
                                userMapCache.current[uDoc.id] = uDoc.data().username || uDoc.data().displayName || "Unknown";
                            });
                        }
                    } catch (e) {
                        console.error("Failed to fetch user mappings:", e);
                    }
                }

                const mappedList = list.map(tx => ({
                    ...tx,
                    username: userMapCache.current[tx.userId]
                }));

                setTransactions(mappedList);
            },
        );
        return () => unsub();
    }, []);

    useEffect(() => {
        const interval = window.setInterval(() => {
            setNowMs(Date.now());
        }, 60_000);

        return () => window.clearInterval(interval);
    }, []);

    return (
        <div className="glass-panel p-4 md:p-6 rounded-3xl border border-white/10">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white">Recent Transactions</h3>
                <span className="text-xs text-gray-400">Realtime</span>
            </div>
            <div className="space-y-4">
                {transactions.length === 0 ? (
                    <div className="text-sm text-gray-500 py-4 text-center">No recent transactions.</div>
                ) : transactions.map((tx) => {
                    const timestamp = (tx.timestamp as number) > 0 ? (tx.timestamp as number) : nowMs;
                    return (
                        <div key={tx.id} className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0">
                            <div>
                                <div className="text-sm font-semibold text-white line-clamp-1">{tx.description}</div>
                                <div className="text-xs text-brand-purple font-medium">{tx.username ? `@${tx.username}` : `${tx.userId.slice(0, 8)}…`}</div>
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
