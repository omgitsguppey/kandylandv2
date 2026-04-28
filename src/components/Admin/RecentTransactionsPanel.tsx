"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatDistance } from "date-fns";
import {
    collection,
    limit,
    onSnapshot,
    orderBy,
    query,
    documentId,
    getDocs,
    where,
} from "firebase/firestore";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { AdminOverviewResponse, AdminOverviewTransactionRecord } from "@/lib/admin-overview";
import { paginateOverviewItems } from "@/lib/admin-overview";
import { useNow } from "@/hooks/useNow";
import { db } from "@/lib/firebase-data";
import { normalizeTransactionRecord, getTransactionBadgeLabel } from "@/lib/transaction-normalizers";
import { reportRealtimeIssue } from "@/lib/client-error-reporting";
import { createAutoHealingObserver } from "@/lib/self-healing";
import { AdminStatusBadge } from "@/components/Admin/AdminStatusBadge";
import type { AdminSurfaceState } from "@/lib/admin-parity";

/* ── Constants ──────────────────────────────────────────────────────────── */

const PAGE_SIZE = 5;
const USER_FETCH_CHUNK_SIZE = 10;

/* ── Types ──────────────────────────────────────────────────────────────── */

type RecentTransactionsPanelProps = {
    transactions: AdminOverviewResponse["recentTransactions"];
};

type DisplayTransaction = AdminOverviewTransactionRecord;

type RecentTransactionsDebugMeta = {
    transactionSource: string;
    identitySource: string;
    listenerStatus: "active" | "errored" | "waiting";
    snapshotSource: "server" | "cache" | "none";
    lastServerFeedMs: number;
    lastClientSnapshotMs: number;
    pageSize: number;
    currentPage: number;
    rawRecords: number;
    eligibleRecords: number;
    excludedRecords: number;
    resolvedUserCount: number;
    pendingLookupCount: number;
    missingActorCount: number;
    identityLookupLatencyMs: number;
    identityLookupFailures: number;
    embeddedUsernameUsed: number;
    firstFeedRenderMs: number;
    identityResolutionCompleteMs: number;
};

/* ── Truth chip helpers ─────────────────────────────────────────────────── */

/* ── Badge colors by type ───────────────────────────────────────────────── */

const BADGE_COLORS: Record<string, string> = {
    purchase_currency: "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
    unlock_content: "border-purple-400/20 bg-purple-500/10 text-purple-300",
    admin_adjustment: "border-sky-400/20 bg-sky-500/10 text-sky-300",
    daily_reward: "border-amber-400/20 bg-amber-500/10 text-amber-300",
    referral_bonus: "border-cyan-400/20 bg-cyan-500/10 text-cyan-300",
    onboarding_reward: "border-indigo-400/20 bg-indigo-500/10 text-indigo-300",
};

/* ── Timestamp helper ───────────────────────────────────────────────────── */

function toTimestampNumber(value: unknown): number {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (
        value && typeof value === "object"
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

/* ── Username display helper ────────────────────────────────────────────── */

function resolveDisplayName(
    transaction: DisplayTransaction,
    identityMap: Map<string, string>,
): { label: string; resolved: boolean; source: string } {
    // 1. Identity map (batch-fetched from users collection)
    const mapped = identityMap.get(transaction.userId);
    if (mapped && mapped !== "Unknown") {
        return { label: `@${mapped}`, resolved: true, source: "users_collection" };
    }

    // 2. Server-provided or embedded username on transaction record
    if (transaction.username && transaction.username.trim().length > 0
        && transaction.username !== "Pending lookup"
        && transaction.username !== "Unknown"
    ) {
        return { label: `@${transaction.username}`, resolved: true, source: "embedded_or_server" };
    }

    // 3. No userId — guest or legacy
    if (!transaction.userId || transaction.userId.trim().length === 0) {
        return { label: "Guest activity", resolved: true, source: "missing_actor" };
    }

    // 4. Identity map returned "Unknown" — user doc exists but has no name
    if (mapped === "Unknown") {
        return { label: "Unknown user", resolved: true, source: "users_collection_unnamed" };
    }

    // 5. Still pending — identity map hasn't loaded yet
    return { label: "", resolved: false, source: "pending" };
}

/* ── Amount display helper ──────────────────────────────────────────────── */

function formatAmountDelta(transaction: DisplayTransaction): { primary: string; secondary: string; color: string } {
    const sign = transaction.amount > 0 ? "+" : "";
    const primary = `${sign}${transaction.amount}`;
    const color = transaction.amount > 0 ? "text-emerald-400" : transaction.amount < 0 ? "text-rose-400" : "text-gray-400";

    let secondary = "";
    if (transaction.type === "purchase_currency" && transaction.grossRevenueCents) {
        secondary = `$${(transaction.grossRevenueCents / 100).toFixed(2)}`;
    } else if (transaction.type === "unlock_content" && Math.abs(transaction.amount) > 0) {
        secondary = `${Math.abs(transaction.amount)} GD`;
    }

    return { primary, secondary, color };
}

/* ═══════════════════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════════════════ */

export function RecentTransactionsPanel({ transactions: fallbackTransactions }: RecentTransactionsPanelProps) {
    const nowMs = useNow({ intervalMs: 60_000 });
    const mountMs = useRef(performance.now());
    const firstRenderMs = useRef(0);
    const identityCompleteMs = useRef(0);

    /* ── Live feed state ────────────────────────────────────────────────── */
    const [liveTransactions, setLiveTransactions] = useState<DisplayTransaction[] | null>(null);
    const [liveFeedError, setLiveFeedError] = useState<string | null>(null);
    const [snapshotFromCache, setSnapshotFromCache] = useState(false);
    const [lastServerFeedMs, setLastServerFeedMs] = useState(0);
    const [lastClientSnapshotMs, setLastClientSnapshotMs] = useState(0);
    const [page, setPage] = useState(0);

    /* ── Identity resolution state ──────────────────────────────────────── */
    const identityMapRef = useRef(new Map<string, string>());
    const [identityMap, setIdentityMap] = useState<Map<string, string>>(new Map());
    const [identityLookupLatencyMs, setIdentityLookupLatencyMs] = useState(0);
    const [identityLookupFailures, setIdentityLookupFailures] = useState(0);
    const pendingLookupRef = useRef(new Set<string>());

    const fallbackById = useMemo(
        () => new Map(fallbackTransactions.map((t) => [t.id, t])),
        [fallbackTransactions],
    );
    const transactions = liveTransactions ?? fallbackTransactions;
    const isLiveFeedActive = liveTransactions !== null;

    /* ── Determine truth state ──────────────────────────────────────────── */
    const truthState: AdminSurfaceState = useMemo(() => {
        if (liveFeedError) return "fallback";
        if (!isLiveFeedActive) return "unavailable";
        if (snapshotFromCache) return "stale";
        if (identityLookupFailures > 0) return "degraded";
        return "live";
    }, [isLiveFeedActive, liveFeedError, snapshotFromCache, identityLookupFailures]);

    /* ── Pagination ─────────────────────────────────────────────────────── */
    const paginated = useMemo(
        () => paginateOverviewItems(transactions, page, PAGE_SIZE),
        [page, transactions],
    );

    /* ── Batch user identity resolution ─────────────────────────────────── */
    const resolveUserIdentities = useCallback(async (userIds: string[]) => {
        const unknownIds = userIds.filter(
            (id) => id.trim().length > 0 && !identityMapRef.current.has(id) && !pendingLookupRef.current.has(id),
        );
        if (unknownIds.length === 0) return;

        // Mark as pending
        unknownIds.forEach((id) => pendingLookupRef.current.add(id));

        const start = performance.now();
        const usersRef = collection(db, "users");

        try {
            // Chunk to stay under Firestore 'in' limit of 30
            const chunks: string[][] = [];
            for (let i = 0; i < unknownIds.length; i += USER_FETCH_CHUNK_SIZE) {
                chunks.push(unknownIds.slice(i, i + USER_FETCH_CHUNK_SIZE));
            }

            const snapshots = await Promise.all(
                chunks.map((chunk) =>
                    getDocs(query(usersRef, where(documentId(), "in", chunk))),
                ),
            );

            const newEntries = new Map<string, string>();
            const foundIds = new Set<string>();

            for (const snap of snapshots) {
                for (const d of snap.docs) {
                    const data = d.data() as Record<string, unknown>;
                    const name = typeof data.username === "string" && data.username.trim().length > 0
                        ? data.username
                        : typeof data.displayName === "string" && data.displayName.trim().length > 0
                            ? data.displayName
                            : "Unknown";
                    newEntries.set(d.id, name);
                    foundIds.add(d.id);
                }
            }

            // Mark unfound users as "Unknown"
            unknownIds.forEach((id) => {
                if (!foundIds.has(id)) {
                    newEntries.set(id, "Unknown");
                }
            });

            // Merge into ref and trigger re-render
            newEntries.forEach((v, k) => identityMapRef.current.set(k, v));
            setIdentityMap(new Map(identityMapRef.current));
            setIdentityLookupLatencyMs(performance.now() - start);

            if (identityCompleteMs.current === 0) {
                identityCompleteMs.current = performance.now() - mountMs.current;
            }
        } catch (err) {
            setIdentityLookupFailures((c) => c + 1);
            reportRealtimeIssue(
                "Admin recent transactions identity resolution",
                err,
                { listener: "admin_recent_transactions_identity" },
            );
        } finally {
            unknownIds.forEach((id) => pendingLookupRef.current.delete(id));
        }
    }, []);

    /* ── Live Firestore listener ────────────────────────────────────────── */
    useEffect(() => {
        let cancelled = false;
        const recentTxQuery = query(
            collection(db, "transactions"),
            orderBy("timestamp", "desc"),
            limit(20),
        );

        const control = createAutoHealingObserver(() => onSnapshot(
            recentTxQuery,
            { includeMetadataChanges: true },
            (snapshot) => {
                if (cancelled) return;
                const now = Date.now();
                const fromCache = snapshot.metadata.fromCache;
                setSnapshotFromCache(fromCache);
                setLastClientSnapshotMs(now);
                if (!fromCache) setLastServerFeedMs(now);

                setLiveFeedError(null);
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

                if (firstRenderMs.current === 0) {
                    firstRenderMs.current = performance.now() - mountMs.current;
                }
            },
            (error) => {
                if (cancelled) return;
                setLiveFeedError(error instanceof Error ? error.message : "Live transaction listener failed.");
                setLiveTransactions(null);
                control.triggerReconnect(error);
            },
        ), (error) => {
            reportRealtimeIssue("Admin recent transactions panel", error, { listener: "admin_recent_transactions_panel" });
        });

        return () => {
            cancelled = true;
            control.cleanup();
        };
    }, [fallbackById]);

    /* ── Trigger identity resolution when transactions change ───────────── */
    useEffect(() => {
        const userIds = transactions
            .map((t) => t.userId)
            .filter((id) => id && id.trim().length > 0);
        if (userIds.length > 0) {
            resolveUserIdentities(userIds);
        }
    }, [transactions, resolveUserIdentities]);

    /* ── Build debug metadata ───────────────────────────────────────────── */
    const debugMeta: RecentTransactionsDebugMeta = useMemo(() => {
        let resolvedCount = 0;
        let pendingCount = 0;
        let missingActorCount = 0;
        let embeddedCount = 0;

        transactions.forEach((t) => {
            const { resolved, source } = resolveDisplayName(t, identityMap);
            if (!t.userId || t.userId.trim().length === 0) missingActorCount++;
            else if (resolved) {
                resolvedCount++;
                if (source === "embedded_or_server") embeddedCount++;
            } else {
                pendingCount++;
            }
        });

        return {
            transactionSource: "firestore/transactions",
            identitySource: "firestore/users",
            listenerStatus: liveFeedError ? "errored" : isLiveFeedActive ? "active" : "waiting",
            snapshotSource: isLiveFeedActive ? (snapshotFromCache ? "cache" : "server") : "none",
            lastServerFeedMs,
            lastClientSnapshotMs,
            pageSize: PAGE_SIZE,
            currentPage: page,
            rawRecords: transactions.length,
            eligibleRecords: transactions.length,
            excludedRecords: 0,
            resolvedUserCount: resolvedCount,
            pendingLookupCount: pendingCount,
            missingActorCount,
            identityLookupLatencyMs,
            identityLookupFailures,
            embeddedUsernameUsed: embeddedCount,
            firstFeedRenderMs: Math.round(firstRenderMs.current),
            identityResolutionCompleteMs: Math.round(identityCompleteMs.current),
        };
    }, [
        transactions, identityMap, liveFeedError, isLiveFeedActive,
        snapshotFromCache, lastServerFeedMs, lastClientSnapshotMs,
        page, identityLookupLatencyMs, identityLookupFailures,
    ]);

    /* ── Render ──────────────────────────────────────────────────────────── */
    return (
        <div className="space-y-2">
            {/* ── Truth chip ──────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
                <AdminStatusBadge state={truthState} />
                {debugMeta.resolvedUserCount > 0 && (
                    <span className="text-[10px] text-gray-500">
                        {debugMeta.resolvedUserCount}/{transactions.length} users resolved
                    </span>
                )}
            </div>

            {/* ── Feed rows ───────────────────────────────────────────── */}
            {transactions.length === 0 ? (
                <div className="rounded-xl border border-white/8 bg-black/25 px-4 py-6 text-center">
                    <p className="text-[11px] font-semibold text-gray-400">No recent transactions available.</p>
                </div>
            ) : (
                <>
                    <div className="divide-y divide-white/6 rounded-xl border border-white/8 bg-black/20 overflow-hidden">
                        {paginated.items.map((transaction) => {
                            const timestamp = typeof transaction.timestamp === "number" && transaction.timestamp > 0
                                ? transaction.timestamp
                                : toTimestampNumber(transaction.timestamp);
                            const relativeLabel = timestamp > 0 && nowMs > 0
                                ? formatDistance(timestamp, nowMs, { addSuffix: true })
                                : "Unknown time";

                            const { label: displayName, resolved: nameResolved } = resolveDisplayName(transaction, identityMap);
                            const badge = getTransactionBadgeLabel(transaction);
                            const badgeColor = BADGE_COLORS[transaction.type] ?? "border-white/10 bg-white/5 text-gray-300";
                            const { primary, secondary, color } = formatAmountDelta(transaction);

                            return (
                                <div
                                    key={transaction.id}
                                    className="flex items-center gap-2 px-3 py-2 min-h-[36px]"
                                >
                                    {/* Type badge */}
                                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] ${badgeColor}`}>
                                        {badge}
                                    </span>

                                    {/* Description + username */}
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-baseline gap-1.5 text-[12px]">
                                            <span className="truncate font-medium text-white">
                                                {transaction.description}
                                            </span>
                                            {nameResolved ? (
                                                <span className="shrink-0 text-[11px] text-gray-400">
                                                    {displayName}
                                                </span>
                                            ) : (
                                                <span className="shrink-0 h-2.5 w-14 animate-pulse rounded bg-white/8" />
                                            )}
                                        </div>
                                    </div>

                                    {/* Time */}
                                    <span className="hidden shrink-0 text-[10px] text-gray-500 sm:block">
                                        {relativeLabel}
                                    </span>

                                    {/* Amount */}
                                    <div className="shrink-0 text-right">
                                        <span className={`text-[12px] font-semibold tabular-nums ${color}`}>
                                            {primary}
                                        </span>
                                        {secondary && (
                                            <span className="ml-1 text-[10px] text-gray-500">
                                                {secondary}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* ── Pagination ──────────────────────────────────────── */}
                    {paginated.totalPages > 1 && (
                        <div className="flex items-center justify-between px-1 text-[11px] text-gray-400">
                            <span>
                                Showing {paginated.startIndex + 1}–{paginated.endIndex} of {transactions.length}
                            </span>
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => setPage((c) => Math.max(0, c - 1))}
                                    disabled={paginated.page === 0}
                                    className="rounded-full border border-white/10 p-1 text-white disabled:opacity-30"
                                    aria-label="Previous page"
                                >
                                    <ChevronLeft size={14} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPage((c) => Math.min(paginated.totalPages - 1, c + 1))}
                                    disabled={paginated.page >= paginated.totalPages - 1}
                                    className="rounded-full border border-white/10 p-1 text-white disabled:opacity-30"
                                    aria-label="Next page"
                                >
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
