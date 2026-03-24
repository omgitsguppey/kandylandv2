"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { useAdminOverview } from "@/hooks/useAdminOverview";

const INITIAL_TRANSACTIONS_NOW = Date.now();

/**
 * Displays the 20 most recent transactions with a real-time listener.
 * Owns its own onSnapshot subscription scoped to recent transactions.
 */
export function RecentTransactionsPanel() {
    const { data } = useAdminOverview();
    const [nowMs, setNowMs] = useState(INITIAL_TRANSACTIONS_NOW);
    const transactions = data?.recentTransactions || [];

    useEffect(() => {
        const interval = window.setInterval(() => {
            setNowMs(Date.now());
        }, 60_000);

        return () => window.clearInterval(interval);
    }, []);

    return (
        <div className="glass-panel rounded-[1.6rem] border border-white/10 p-3.5 md:p-5">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Recent Transactions</h3>
                <span className="text-xs text-gray-400">Realtime</span>
            </div>
            <div className="space-y-2.5">
                {transactions.length === 0 ? (
                    <div className="text-sm text-gray-500 py-4 text-center">No recent transactions.</div>
                ) : transactions.map((tx) => {
                    const timestamp = (tx.timestamp as number) > 0 ? (tx.timestamp as number) : nowMs;
                    return (
                        <details key={tx.id} className="rounded-2xl border border-white/5 bg-black/30 p-3">
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                                <div>
                                    <div className="line-clamp-1 text-sm font-semibold text-white">{tx.description}</div>
                                    <div className="text-xs font-medium text-brand-purple">{tx.username ? `@${tx.username}` : `${tx.userId.slice(0, 8)}…`}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-mono text-brand-purple">{tx.amount > 0 ? "+" : ""}{tx.amount}</div>
                                    <div className="text-[10px] text-gray-500">{formatDistanceToNow(timestamp, { addSuffix: true })}</div>
                                </div>
                            </summary>
                            <div className="mt-2 rounded-xl border border-white/10 bg-black/40 px-2.5 py-2 text-[11px] text-gray-400">
                                UID: <span className="font-semibold text-white">{tx.userId}</span>
                            </div>
                        </details>
                    );
                })}
            </div>
        </div>
    );
}
