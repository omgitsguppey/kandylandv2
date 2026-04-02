"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDistance } from "date-fns";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";

import { useAdminOverview } from "@/hooks/useAdminOverview";
import { useNow } from "@/hooks/useNow";
import { db } from "@/lib/firebase-data";
import { normalizeTransactionRecord } from "@/lib/transaction-normalizers";
import type { Transaction } from "@/types/db";

type DisplayTransaction = Transaction & { username?: string };

function toTimestampNumber(value: unknown): number {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    if (
        value
        && typeof value === "object"
        && "toMillis" in value
        && typeof (value as { toMillis: () => number }).toMillis === "function"
    ) {
        return (value as { toMillis: () => number }).toMillis();
    }

    return 0;
}

function toDisplayTransaction(
    raw: Record<string, unknown>,
    id: string,
    fallback?: DisplayTransaction,
): DisplayTransaction {
    const normalized = normalizeTransactionRecord(raw, id);
    return {
        ...normalized,
        username: typeof raw.username === "string" && raw.username.trim().length > 0
            ? raw.username
            : fallback?.username,
        timestamp: typeof normalized.timestamp === "number"
            ? normalized.timestamp
            : toTimestampNumber(normalized.timestamp),
    };
}

/**
 * Displays the 20 most recent transactions with a real-time listener.
 * Owns its own onSnapshot subscription scoped to recent transactions.
 */
export function RecentTransactionsPanel() {
    const { data } = useAdminOverview();
    const nowMs = useNow({ intervalMs: 60_000 });
    const [liveTransactions, setLiveTransactions] = useState<DisplayTransaction[] | null>(null);
    const fallbackTransactions = useMemo(
        () => (data?.recentTransactions || []) as DisplayTransaction[],
        [data?.recentTransactions],
    );
    const fallbackById = useMemo(
        () => new Map(fallbackTransactions.map((transaction) => [transaction.id, transaction])),
        [fallbackTransactions],
    );
    const transactions = liveTransactions ?? fallbackTransactions;

    useEffect(() => {
        const recentTransactionsQuery = query(
            collection(db, "transactions"),
            orderBy("timestamp", "desc"),
            limit(20),
        );

        return onSnapshot(
            recentTransactionsQuery,
            (snapshot) => {
                const nextTransactions = snapshot.docs.flatMap((doc) => {
                    try {
                        return [toDisplayTransaction(
                            doc.data() as Record<string, unknown>,
                            doc.id,
                            fallbackById.get(doc.id),
                        )];
                    } catch {
                        return [];
                    }
                });
                setLiveTransactions(nextTransactions);
            },
            () => {
                setLiveTransactions(null);
            },
        );
    }, [fallbackById]);

    return (
        <div className="glass-panel rounded-[1.6rem] border border-white/10 p-3.5 md:p-5">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Recent Transactions</h3>
                <span className="text-xs text-gray-400">Realtime</span>
            </div>
            <div className="space-y-2.5">
                {transactions.length === 0 ? (
                    <div className="py-4 text-center text-sm text-gray-500">No recent transactions.</div>
                ) : transactions.map((tx) => {
                    const timestamp = typeof tx.timestamp === "number" && tx.timestamp > 0
                        ? tx.timestamp
                        : toTimestampNumber(tx.timestamp);
                    const relativeLabel = timestamp > 0 && nowMs > 0
                        ? formatDistance(timestamp, nowMs, { addSuffix: true })
                        : "Just now";
                    return (
                        <details key={tx.id} className="rounded-2xl border border-white/5 bg-black/30 p-3">
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                                <div>
                                    <div className="line-clamp-1 text-sm font-semibold text-white">{tx.description}</div>
                                    <div className="text-xs font-medium text-brand-purple">{tx.username ? `@${tx.username}` : `${tx.userId.slice(0, 8)}...`}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-mono text-brand-purple">{tx.amount > 0 ? "+" : ""}{tx.amount}</div>
                                    <div className="text-[10px] text-gray-500">{relativeLabel}</div>
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
