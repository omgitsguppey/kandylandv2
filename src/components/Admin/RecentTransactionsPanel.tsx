"use client";

import { useEffect, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { collection, doc, getDoc, limit, onSnapshot, orderBy, query } from "firebase/firestore";

import { useAdminOverview, type AdminOverviewResponse } from "@/hooks/useAdminOverview";
import { db } from "@/lib/firebase-data";
import { normalizeTransactionRecord } from "@/lib/transaction-normalizers";

const INITIAL_TRANSACTIONS_NOW = Date.now();
type AdminTransaction = AdminOverviewResponse["recentTransactions"][number];

function resolveUserLabel(raw: Record<string, unknown>, uid: string) {
    if (typeof raw.username === "string" && raw.username.trim().length > 0) {
        return raw.username.trim();
    }

    if (typeof raw.displayName === "string" && raw.displayName.trim().length > 0) {
        return raw.displayName.trim();
    }

    return uid;
}

/**
 * Displays the 20 most recent transactions with a real-time listener.
 * Owns its own onSnapshot subscription scoped to recent transactions.
 */
export function RecentTransactionsPanel() {
    const { data } = useAdminOverview();
    const [nowMs, setNowMs] = useState(INITIAL_TRANSACTIONS_NOW);
    const [liveTransactions, setLiveTransactions] = useState<AdminTransaction[] | null>(null);
    const [usernameMap, setUsernameMap] = useState<Record<string, string>>({});
    const usernameMapRef = useRef<Record<string, string>>({});

    const transactionsSource = liveTransactions ?? data?.recentTransactions ?? [];
    const transactions = transactionsSource.map((tx) => ({
        ...tx,
        username: tx.username || usernameMap[tx.userId],
    }));

    useEffect(() => {
        if (!data?.recentTransactions?.length) {
            return;
        }

        const seededEntries = Object.fromEntries(
            data.recentTransactions
                .filter((tx) => typeof tx.username === "string" && tx.username.trim().length > 0)
                .map((tx) => [tx.userId, tx.username!.trim()]),
        );

        if (Object.keys(seededEntries).length === 0) {
            return;
        }

        setUsernameMap((current) => {
            const next = { ...current, ...seededEntries };
            usernameMapRef.current = next;
            return next;
        });
    }, [data?.recentTransactions]);

    useEffect(() => {
        const interval = window.setInterval(() => {
            setNowMs(Date.now());
        }, 60_000);

        return () => window.clearInterval(interval);
    }, []);

    useEffect(() => {
        let cancelled = false;

        const hydrateUsernames = async (userIds: string[]) => {
            const uniqueUserIds = [...new Set(userIds)].filter((uid) => uid && !usernameMapRef.current[uid]);
            if (uniqueUserIds.length === 0) {
                return;
            }

            const resolvedEntries = await Promise.all(uniqueUserIds.map(async (uid) => {
                try {
                    const snapshot = await getDoc(doc(db, "users", uid));
                    if (!snapshot.exists()) {
                        return [uid, uid] as const;
                    }

                    return [uid, resolveUserLabel(snapshot.data() as Record<string, unknown>, uid)] as const;
                } catch {
                    return [uid, uid] as const;
                }
            }));

            if (cancelled) {
                return;
            }

            setUsernameMap((current) => {
                const next = { ...current };
                resolvedEntries.forEach(([uid, label]) => {
                    next[uid] = label;
                });
                usernameMapRef.current = next;
                return next;
            });
        };

        const recentTransactionsQuery = query(
            collection(db, "transactions"),
            orderBy("timestamp", "desc"),
            limit(20),
        );

        const unsubscribe = onSnapshot(recentTransactionsQuery, (snapshot) => {
            const normalizedTransactions = snapshot.docs.flatMap((txDoc) => {
                try {
                    return [normalizeTransactionRecord(txDoc.data(), txDoc.id)];
                } catch {
                    return [];
                }
            }).map((tx) => ({
                ...tx,
                username: usernameMapRef.current[tx.userId],
            }));

            setLiveTransactions(normalizedTransactions);
            void hydrateUsernames(normalizedTransactions.map((tx) => tx.userId));
        }, () => {
            setLiveTransactions(null);
        });

        return () => {
            cancelled = true;
            unsubscribe();
        };
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
