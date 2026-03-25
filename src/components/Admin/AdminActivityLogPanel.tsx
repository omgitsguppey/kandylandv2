"use client";

import { useEffect, useMemo, useState } from "react";
import { ShieldAlert, Fingerprint } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { collection, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";

import { useAdminOverview } from "@/hooks/useAdminOverview";
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

export function AdminActivityLogPanel() {
    const { data, isLoading } = useAdminOverview();
    const [liveLogs, setLiveLogs] = useState<DisplayTransaction[] | null>(null);
    const fallbackLogs = useMemo(
        () => (data?.adminActivity || []) as DisplayTransaction[],
        [data?.adminActivity],
    );
    const fallbackById = useMemo(
        () => new Map(fallbackLogs.map((log) => [log.id, log])),
        [fallbackLogs],
    );
    const logs = liveLogs ?? fallbackLogs;
    const loading = isLoading && liveLogs === null;

    useEffect(() => {
        const adminActivityQuery = query(
            collection(db, "transactions"),
            where("type", "==", "admin_adjustment"),
            orderBy("timestamp", "desc"),
            limit(10),
        );

        return onSnapshot(
            adminActivityQuery,
            (snapshot) => {
                const nextLogs = snapshot.docs.flatMap((doc) => {
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
                setLiveLogs(nextLogs);
            },
            () => {
                setLiveLogs(null);
            },
        );
    }, [fallbackById]);

    return (
        <div className="glass-panel flex h-full flex-col rounded-[1.6rem] border border-white/10 p-4 md:p-5 lg:col-span-2">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
                <ShieldAlert className="h-5 w-5 text-brand-purple" />
                Admin Activity Log
            </h2>

            {loading ? (
                <div className="flex min-h-[150px] flex-1 items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-purple border-t-transparent" />
                </div>
            ) : logs.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center py-10 text-gray-500">
                    <Fingerprint className="mb-3 h-10 w-10 opacity-20" />
                    <p className="text-sm">No recent admin adjustments found.</p>
                </div>
            ) : (
                <div className="scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 flex max-h-[320px] flex-col gap-2.5 overflow-y-auto pr-1">
                    {logs.map((log) => {
                        const timestamp = typeof log.timestamp === "number" && log.timestamp > 0
                            ? log.timestamp
                            : toTimestampNumber(log.timestamp);

                        return (
                            <details key={log.id} className="rounded-2xl border border-white/10 bg-black/30 p-3">
                                <summary className="flex list-none items-start gap-3">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10">
                                        <ShieldAlert className="h-4 w-4 text-red-400" />
                                    </div>
                                    <div className="min-w-0 flex-1 pt-0.5">
                                        <div className="mb-1 flex items-start justify-between gap-2">
                                            <p className="text-sm font-bold leading-tight text-white">
                                                Admin Adjustment
                                            </p>
                                            <span className="ml-3 whitespace-nowrap text-[10px] text-gray-500">
                                                {timestamp > 0 ? formatDistanceToNow(timestamp, { addSuffix: true }) : "Unknown time"}
                                            </span>
                                        </div>
                                        <p className="mb-1 text-xs text-brand-purple">
                                            <span className="mr-1 text-gray-500">Target UID:</span>
                                            {log.userId}
                                        </p>
                                        <p className="line-clamp-1 text-sm text-gray-300">
                                            {log.description}
                                        </p>
                                        {log.amount !== 0 && (
                                            <p className="mt-1 text-xs font-bold font-mono text-brand-purple">
                                                {log.amount > 0 ? "+" : ""}{log.amount} Gum Drops
                                            </p>
                                        )}
                                    </div>
                                </summary>
                                <p className="mt-2 rounded-xl border border-white/10 bg-black/40 px-2.5 py-2 text-xs text-gray-300">{log.description}</p>
                            </details>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
