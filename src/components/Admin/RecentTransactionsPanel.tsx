"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDistance } from "date-fns";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";

import type { AdminOverviewResponse, AdminOverviewTransactionRecord } from "@/lib/admin-overview";
import { paginateOverviewItems } from "@/lib/admin-overview";
import { buildAdminUiChartHealthItem } from "@/lib/admin-ui-chart-health";
import { useAdminUiChartHealthReporter } from "@/hooks/useAdminUiChartHealthReporter";
import { useNow } from "@/hooks/useNow";
import { db } from "@/lib/firebase-data";
import { getTransactionBadgeLabel, normalizeTransactionRecord } from "@/lib/transaction-normalizers";

type RecentTransactionsPanelProps = {
    transactions: AdminOverviewResponse["recentTransactions"];
    truthNote: string;
};

type DisplayTransaction = AdminOverviewTransactionRecord;

const PAGE_SIZE = 5;

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
        sourceScope: "realtime_firestore",
    };
}

export function RecentTransactionsPanel({ transactions: fallbackTransactions, truthNote }: RecentTransactionsPanelProps) {
    const nowMs = useNow({ intervalMs: 60_000 });
    const [liveTransactions, setLiveTransactions] = useState<DisplayTransaction[] | null>(null);
    const [liveFeedError, setLiveFeedError] = useState<string | null>(null);
    const [liveFeedErrorAtMs, setLiveFeedErrorAtMs] = useState(0);
    const [page, setPage] = useState(0);
    const fallbackById = useMemo(
        () => new Map(fallbackTransactions.map((transaction) => [transaction.id, transaction])),
        [fallbackTransactions],
    );
    const transactions = liveTransactions ?? fallbackTransactions;
    const isLiveFeedActive = liveTransactions !== null;
    const chartUpdatedAtMs = useMemo(() => {
        if (transactions.length > 0) {
            return transactions.reduce((latest, transaction) => Math.max(latest, toTimestampNumber(transaction.timestamp)), 0);
        }

        return liveFeedErrorAtMs;
    }, [liveFeedErrorAtMs, transactions]);
    const chartHealth = useMemo(() => buildAdminUiChartHealthItem({
        key: "dashboard.recent_transactions",
        title: "Recent transactions",
        page: "dashboard",
        category: "overview",
        source: isLiveFeedActive ? "realtime_analytics" : "overview_snapshot",
        updatedAtMs: chartUpdatedAtMs,
        hasLoaded: fallbackTransactions.length > 0 || isLiveFeedActive || Boolean(liveFeedError),
        hasData: transactions.length > 0,
        blockingIssues: liveFeedError && transactions.length === 0 ? [liveFeedError] : [],
        backgroundIssues: liveFeedError && transactions.length > 0 ? [liveFeedError] : [],
        healthySummary: isLiveFeedActive
            ? "Recent transactions are hydrating from the live Firestore feed."
            : "Recent transactions are loaded from the overview fallback snapshot.",
        emptySummary: "No recent transactions are available in the current admin window.",
        degradedAction: "Review the transactions listener or the fallback overview route before trusting this feed as current.",
    }), [chartUpdatedAtMs, fallbackTransactions.length, isLiveFeedActive, liveFeedError, transactions.length]);
    const paginated = useMemo(
        () => paginateOverviewItems(transactions, page, PAGE_SIZE),
        [page, transactions],
    );

    useAdminUiChartHealthReporter([chartHealth]);

    useEffect(() => {
        const recentTransactionsQuery = query(
            collection(db, "transactions"),
            orderBy("timestamp", "desc"),
            limit(20),
        );

        return onSnapshot(
            recentTransactionsQuery,
            (snapshot) => {
                setLiveFeedError(null);
                setLiveFeedErrorAtMs(0);
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
            (error) => {
                setLiveFeedError(error instanceof Error ? error.message : "Live transaction listener failed.");
                setLiveFeedErrorAtMs(Date.now());
                setLiveTransactions(null);
            },
        );
    }, [fallbackById]);

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
                {isLiveFeedActive ? (
                    <span className="rounded-full border border-emerald-400/15 bg-emerald-500/10 px-2.5 py-1 text-emerald-200">
                        Live Firestore feed
                    </span>
                ) : (
                    <span className="rounded-full border border-white/10 bg-black/30 px-2.5 py-1">
                        5s polled overview fallback
                    </span>
                )}
                {chartHealth.status !== "healthy" ? (
                    <span className={`rounded-full border px-2.5 py-1 ${chartHealth.status === "fail" ? "border-red-400/20 bg-red-500/10 text-red-100" : "border-amber-400/20 bg-amber-500/10 text-amber-100"}`}>
                        {chartHealth.hydrationState === "failed" ? "Listener failed" : chartHealth.hydrationState === "empty" ? "Feed empty" : "Feed degraded"}
                    </span>
                ) : null}
                <span className="text-xs text-gray-500">{truthNote}</span>
            </div>

            {transactions.length === 0 ? (
                <div className="rounded-[1.35rem] border border-white/8 bg-black/25 px-4 py-8 text-center">
                    <p className="text-sm font-semibold text-white">No recent transactions are available.</p>
                    <p className="mt-1 text-sm text-gray-400">{truthNote}</p>
                </div>
            ) : (
                <>
                    <div className="space-y-2">
                        {paginated.items.map((transaction) => {
                            const timestamp = typeof transaction.timestamp === "number" && transaction.timestamp > 0
                                ? transaction.timestamp
                                : toTimestampNumber(transaction.timestamp);
                            const relativeLabel = timestamp > 0 && nowMs > 0
                                ? formatDistance(timestamp, nowMs, { addSuffix: true })
                                : "Unknown time";

                            return (
                                <article
                                    key={transaction.id}
                                    className="grid grid-cols-[minmax(0,1fr),auto,auto] items-center gap-3 rounded-[1.15rem] border border-white/8 bg-black/30 px-3 py-3"
                                >
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-300">
                                                {getTransactionBadgeLabel(transaction)}
                                            </span>
                                            <p className="line-clamp-1 text-sm font-semibold text-white">{transaction.description}</p>
                                        </div>
                                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-400">
                                            <span>{transaction.username ? `@${transaction.username}` : transaction.userId.slice(0, 8)}</span>
                                            <span>{relativeLabel}</span>
                                        </div>
                                    </div>
                                    <div className="text-right text-sm font-semibold text-white">
                                        {transaction.amount > 0 ? "+" : ""}{transaction.amount}
                                    </div>
                                    <div className="text-[11px] text-gray-500">
                                        {transaction.type === "purchase_currency" && transaction.grossRevenueCents
                                            ? `$${(transaction.grossRevenueCents / 100).toFixed(2)}`
                                            : transaction.type === "unlock_content"
                                                ? `${Math.abs(transaction.amount)} GD`
                                                : ""}
                                    </div>
                                </article>
                            );
                        })}
                    </div>

                    {paginated.totalPages > 1 ? (
                        <div className="flex items-center justify-between text-xs text-gray-400">
                            <p>
                                Showing {paginated.startIndex + 1}-{paginated.endIndex} of {transactions.length}
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setPage((current) => Math.max(0, current - 1))}
                                    disabled={paginated.page === 0}
                                    className="rounded-full border border-white/10 px-3 py-1.5 text-white disabled:opacity-40"
                                >
                                    Previous
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPage((current) => Math.min(paginated.totalPages - 1, current + 1))}
                                    disabled={paginated.page >= paginated.totalPages - 1}
                                    className="rounded-full border border-white/10 px-3 py-1.5 text-white disabled:opacity-40"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    ) : null}
                </>
            )}
        </div>
    );
}
