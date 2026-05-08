"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { collection, doc, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import useSWR from "swr";

import { authFetch } from "@/lib/authFetch";
import { ADMIN_OVERVIEW_REALTIME_POLICY } from "@/lib/admin/admin-realtime-policy";
import { reportRealtimeIssue } from "@/lib/client-error-reporting";
import { buildFirestoreClientIssueDetail } from "@/lib/firestore-client-errors";
import { db } from "@/lib/firebase-data";
import { createAutoHealingObserver } from "@/lib/self-healing";
import type { AdminSurfaceState } from "@/lib/admin-parity";
import type { AdminOverviewResponse, AdminOverviewTransactionRecord, AdminOverviewActivityItem, AdminOverviewRealtimeDebugMeta } from "@/lib/admin-overview";
import { normalizeTransactionRecord, getTransactionDisplayLabel } from "@/lib/transaction-normalizers";
import { normalizeAndApplyDropStatusOrNull } from "@/lib/drop-read-models";

type OverviewRealtimeListenerState = {
    dropsLoaded: boolean;
    summaryLoaded: boolean;
    transactionsLoaded: boolean;
    adminActivityLoaded: boolean;
    dropsFailed: boolean;
    summaryFailed: boolean;
    transactionsFailed: boolean;
    adminActivityFailed: boolean;
    /** true when the most recent drops snapshot came from Firestore client cache, not the server. */
    dropsFromCache: boolean;
    /** true when the most recent commerce summary snapshot came from Firestore client cache. */
    summaryFromCache: boolean;
    /** true when the most recent transactions snapshot came from Firestore client cache. */
    transactionsFromCache: boolean;
    /** true when the most recent admin activity snapshot came from Firestore client cache. */
    adminActivityFromCache: boolean;
    /** Epoch ms of the most recent server-confirmed (non-cache) snapshot across any listener. */
    lastServerConfirmedAt: number;
    /** Epoch ms of the most recent client snapshot (cache or server) across any listener. */
    lastClientSnapshotAt: number;
};

/**
 * Resolve a human-readable truth chip label from the listener state.
 *
 * Vocabulary:
 * - "Operational pulse connected"         - all live upgrade listeners loaded, none from cache
 * - "Showing verified snapshot totals"    - verified server data exists, cache is in use, or live upgrade is absent
 * - "Waiting for first overview snapshot" - no verified overview data exists yet
 * - "Operational pulse delayed"           - at least one live upgrade listener has failed
 * - "Connecting operational pulse"        - partial live upgrade listeners loaded, none failed
 */
export function resolveTruthChipLabel(
    state: Pick<OverviewRealtimeListenerState,
        "dropsLoaded" | "summaryLoaded" | "transactionsLoaded" | "adminActivityLoaded" |
        "dropsFailed" | "summaryFailed" | "transactionsFailed" | "adminActivityFailed" |
        "dropsFromCache" | "summaryFromCache" | "transactionsFromCache" | "adminActivityFromCache"
    >,
    hasServerData: boolean,
): string {
    const failedCount = [state.dropsFailed, state.summaryFailed, state.transactionsFailed, state.adminActivityFailed].filter(Boolean).length;
    const allLoaded = state.dropsLoaded && state.summaryLoaded && state.transactionsLoaded && state.adminActivityLoaded;
    const anyLoaded = state.dropsLoaded || state.summaryLoaded || state.transactionsLoaded || state.adminActivityLoaded;
    const anyFromCache = state.dropsFromCache || state.summaryFromCache || state.transactionsFromCache || state.adminActivityFromCache;

    if (failedCount > 0) {
        return "Operational pulse delayed";
    }

    if (allLoaded && !anyFromCache) {
        return "Operational pulse connected";
    }

    if (allLoaded && anyFromCache) {
        return "Showing verified snapshot totals";
    }

    if (anyLoaded) {
        return "Connecting operational pulse";
    }

    if (hasServerData) {
        return "Showing verified snapshot totals";
    }

    return "Waiting for first overview snapshot";
}

/** Map a truth chip label to a CSS chip style variant. */
export function resolveTruthChipVariant(label: string): AdminSurfaceState {
    if (label === "Operational pulse connected") return "live";
    if (label === "Showing verified snapshot totals") return "stale";
    if (label === "Connecting operational pulse") return "degraded";
    if (label === "Operational pulse delayed") return "fallback";
    return "unavailable";
}

export function useAdminOverviewRealtime() {
    const fetcher = async (url: string) => {
        const response = await authFetch(url);
        if (!response.ok) {
            const detail = await response.text().catch(() => "");
            throw new Error(`Failed to load overview (${response.status})${detail ? `: ${detail.slice(0, 240)}` : ""}`);
        }
        return response.json() as Promise<AdminOverviewResponse>;
    };

    const { data: serverData, error, isLoading, mutate } = useSWR<AdminOverviewResponse>(
        "/api/admin/overview",
        fetcher,
        {
            refreshInterval: ADMIN_OVERVIEW_REALTIME_POLICY.snapshotRefreshCadenceMs,
            revalidateOnFocus: false,
        }
    );

    const serverDataRef = useRef<AdminOverviewResponse | undefined>(undefined);
    const [realtimeData, setRealtimeData] = useState<Partial<AdminOverviewResponse>>({});
    const [listenerState, setListenerState] = useState<OverviewRealtimeListenerState>({
        dropsLoaded: false,
        summaryLoaded: false,
        transactionsLoaded: false,
        adminActivityLoaded: false,
        dropsFailed: false,
        summaryFailed: false,
        transactionsFailed: false,
        adminActivityFailed: false,
        dropsFromCache: false,
        summaryFromCache: false,
        transactionsFromCache: false,
        adminActivityFromCache: false,
        lastServerConfirmedAt: 0,
        lastClientSnapshotAt: 0,
    });
    useEffect(() => {
        serverDataRef.current = serverData;
    }, [serverData]);

    useEffect(() => {
        if (typeof window === "undefined") return;

        let cancelled = false;

        // Subscribe to Drops
        const dropsControl = createAutoHealingObserver(() => onSnapshot(collection(db, "drops"), { includeMetadataChanges: true }, (snapshot) => {
            if (cancelled) return;
            const now = Date.now();
            const fromCache = snapshot.metadata.fromCache;
            snapshot.docs.forEach((doc) => {
                normalizeAndApplyDropStatusOrNull(doc.data(), doc.id, now);
            });
            setListenerState((current) => ({
                ...current,
                dropsLoaded: true,
                dropsFailed: false,
                dropsFromCache: fromCache,
                lastClientSnapshotAt: now,
                ...(!fromCache ? { lastServerConfirmedAt: Math.max(current.lastServerConfirmedAt, now) } : {}),
            }));
        }, (err) => {
            if (cancelled) return;
            setListenerState((current) => ({ ...current, dropsFailed: true }));
            dropsControl.triggerReconnect(err);
        }), (error) => {
            const issueDetail = buildFirestoreClientIssueDetail(error);
            reportRealtimeIssue(`Admin overview drops: ${issueDetail}`, error, { listener: "admin_overview_drops" });
        });

        // Subscribe to Commerce Rollup Summary
        const summaryControl = createAutoHealingObserver(() => onSnapshot(doc(db, "analytics_commerce_rollup", "summary"), (snapshot) => {
            if (cancelled) return;
            const now = Date.now();
            const fromCache = snapshot.metadata.fromCache;
            setListenerState((current) => ({
                ...current,
                summaryLoaded: true,
                summaryFailed: false,
                summaryFromCache: fromCache,
                lastClientSnapshotAt: now,
                ...(!fromCache ? { lastServerConfirmedAt: Math.max(current.lastServerConfirmedAt, now) } : {}),
            }));
        }, (err) => {
            if (cancelled) return;
            setListenerState((current) => ({ ...current, summaryFailed: true }));
            summaryControl.triggerReconnect(err);
        }), (error) => {
            const issueDetail = buildFirestoreClientIssueDetail(error);
            reportRealtimeIssue(`Admin overview commerce summary: ${issueDetail}`, error, { listener: "admin_overview_commerce_summary" });
        });

        // Subscribe to Recent Transactions
        const txQuery = query(collection(db, "transactions"), orderBy("timestamp", "desc"), limit(20));
        const txControl = createAutoHealingObserver(() => onSnapshot(txQuery, { includeMetadataChanges: true }, (snapshot) => {
            if (cancelled) return;
            const now = Date.now();
            const fromCache = snapshot.metadata.fromCache;
            const latestServerData = serverDataRef.current;
            const txs = snapshot.docs.map(doc => {
                const rawDoc = doc.data() as Record<string, unknown>;
                const raw = normalizeTransactionRecord(rawDoc, doc.id);
                // Prefer server-resolved username (batch-fetched from users collection)
                const serverMatch = latestServerData?.recentTransactions?.find(s => s.id === doc.id);

                // Try embedded fields on the transaction doc (rare but possible on some records)
                let embeddedUsername: string | undefined;
                if (typeof rawDoc.username === "string" && rawDoc.username.trim()) embeddedUsername = rawDoc.username;
                else if (typeof rawDoc.userHandle === "string" && rawDoc.userHandle.trim()) embeddedUsername = rawDoc.userHandle;
                else if (typeof rawDoc.userDisplayName === "string" && rawDoc.userDisplayName.trim()) embeddedUsername = rawDoc.userDisplayName;

                return {
                    ...raw,
                    // Server-resolved > embedded > undefined (panel resolves progressively)
                    username: serverMatch?.username || embeddedUsername || undefined,
                    timestamp: typeof raw.timestamp === "number" ? raw.timestamp : (raw.timestamp as any)?.toMillis?.() || 0,
                    sourceScope: "realtime_firestore" as const
                } as AdminOverviewTransactionRecord;
            });
            setRealtimeData(prev => ({
                ...prev,
                generatedAt: now,
                recentTransactions: txs
            }));
            setListenerState((current) => ({
                ...current,
                transactionsLoaded: true,
                transactionsFailed: false,
                transactionsFromCache: fromCache,
                lastClientSnapshotAt: now,
                ...(!fromCache ? { lastServerConfirmedAt: Math.max(current.lastServerConfirmedAt, now) } : {}),
            }));
        }, (err) => {
            if (cancelled) return;
            setListenerState((current) => ({ ...current, transactionsFailed: true }));
            txControl.triggerReconnect(err);
        }), (error) => {
            const issueDetail = buildFirestoreClientIssueDetail(error);
            reportRealtimeIssue(`Admin overview transactions: ${issueDetail}`, error, { listener: "admin_overview_transactions" });
        });

        // Subscribe to Admin Activity (admin_adjustment transactions)
        const adminActivityQuery = query(
            collection(db, "transactions"),
            where("type", "==", "admin_adjustment"),
            orderBy("timestamp", "desc"),
            limit(20),
        );
        const adminActivityControl = createAutoHealingObserver(() => onSnapshot(adminActivityQuery, { includeMetadataChanges: true }, (snapshot) => {
            if (cancelled) return;
            const now = Date.now();
            const fromCache = snapshot.metadata.fromCache;
            const latestServerData = serverDataRef.current;

            const items: AdminOverviewActivityItem[] = snapshot.docs.map((docSnap) => {
                const rawDoc = docSnap.data() as Record<string, unknown>;
                const normalized = normalizeTransactionRecord(rawDoc, docSnap.id);
                const timestamp = typeof normalized.timestamp === "number"
                    ? normalized.timestamp
                    : (normalized.timestamp as any)?.toMillis?.() || 0;

                // Actor: admin who performed the adjustment
                const adjustedBy = typeof rawDoc.adjustedBy === "string" && rawDoc.adjustedBy.trim().length > 0
                    ? rawDoc.adjustedBy.trim()
                    : undefined;

                // Target: user affected by the adjustment
                // Try server-resolved username first, then fall back to embedded fields
                const serverMatch = latestServerData?.adminActivity?.find(s => s.id === docSnap.id);
                const targetUsername = serverMatch?.username
                    || (typeof rawDoc.username === "string" && rawDoc.username.trim() ? rawDoc.username.trim() : undefined)
                    || (typeof rawDoc.userHandle === "string" && rawDoc.userHandle.trim() ? rawDoc.userHandle.trim() : undefined);
                const targetUserId = normalized.userId || undefined;
                const targetLabel = targetUsername
                    ? `@${targetUsername}`
                    : targetUserId
                        ? targetUserId.slice(0, 8)
                        : undefined;

                return {
                    id: docSnap.id,
                    domain: "admin" as const,
                    source: "transactions" as const,
                    type: normalized.type,
                    label: "Balance adjusted",
                    detail: getTransactionDisplayLabel(normalized),
                    actorLabel: adjustedBy ?? "Unknown operator",
                    targetLabel: targetLabel ? `target ${targetLabel}` : undefined,
                    targetUserId,
                    username: targetUsername,
                    userId: targetUserId,
                    timestamp,
                };
            });

            setRealtimeData(prev => ({
                ...prev,
                generatedAt: now,
                adminActivity: items,
            }));
            setListenerState((current) => ({
                ...current,
                adminActivityLoaded: true,
                adminActivityFailed: false,
                adminActivityFromCache: fromCache,
                lastClientSnapshotAt: now,
                ...(!fromCache ? { lastServerConfirmedAt: Math.max(current.lastServerConfirmedAt, now) } : {}),
            }));
        }, (err) => {
            if (cancelled) return;
            setListenerState((current) => ({ ...current, adminActivityFailed: true }));
            adminActivityControl.triggerReconnect(err);
        }), (error) => {
            const issueDetail = buildFirestoreClientIssueDetail(error);
            reportRealtimeIssue(`Admin overview admin activity: ${issueDetail}`, error, { listener: "admin_overview_admin_activity" });
        });

        return () => {
            cancelled = true;
            dropsControl.cleanup();
            summaryControl.cleanup();
            txControl.cleanup();
            adminActivityControl.cleanup();
        };
    }, []);

    const mergedData = useMemo(() => {
        if (!serverData) {
            return undefined;
        }

        const overviewLabel = resolveTruthChipLabel(listenerState, !!serverData);

        const debugMeta: AdminOverviewRealtimeDebugMeta = {
            dropsFromCache: listenerState.dropsFromCache,
            summaryFromCache: listenerState.summaryFromCache,
            transactionsFromCache: listenerState.transactionsFromCache,
            adminActivityFromCache: listenerState.adminActivityFromCache,
            lastServerConfirmedAt: listenerState.lastServerConfirmedAt,
            lastClientSnapshotAt: listenerState.lastClientSnapshotAt,
            pollingActive: true,
            pollingIntervalMs: ADMIN_OVERVIEW_REALTIME_POLICY.snapshotRefreshCadenceMs ?? 0,
            legacyDataMapped: false,
            metricScope: ADMIN_OVERVIEW_REALTIME_POLICY.metricScope,
            purpose: ADMIN_OVERVIEW_REALTIME_POLICY.purpose,
            owner: ADMIN_OVERVIEW_REALTIME_POLICY.owner,
            costRisk: ADMIN_OVERVIEW_REALTIME_POLICY.costRisk,
            businessTruthSource: ADMIN_OVERVIEW_REALTIME_POLICY.businessTruthSource,
        };

        // Merge admin activity: realtime adjustments override server adjustment items,
        // server telemetry items (analytics_event_facts) remain from server poll.
        const mergedAdminActivity = (() => {
            const realtimeItems = realtimeData.adminActivity ?? [];
            const serverTelemetryItems = (serverData.adminActivity ?? []).filter(item => item.source === "analytics_event_facts");
            if (realtimeItems.length > 0) {
                // Realtime adjustments + server telemetry, sorted by timestamp desc
                return [...realtimeItems, ...serverTelemetryItems]
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .slice(0, 20);
            }
            // No realtime adjustments yet: use full server data
            return serverData.adminActivity ?? [];
        })();

        return {
            ...serverData,
            generatedAt: Math.max(serverData.generatedAt, realtimeData.generatedAt ?? 0),
            freshness: {
                ...serverData.freshness,
                lastTransactionAt: Math.max(
                    serverData.freshness.lastTransactionAt,
                    realtimeData.recentTransactions?.[0]?.timestamp ?? 0,
                ),
                lastAdminActivityAt: Math.max(
                    serverData.freshness.lastAdminActivityAt,
                    mergedAdminActivity[0]?.timestamp ?? 0,
                ),
            },
            stats: serverData.stats,
            deltas: serverData.deltas,
            topDrops: serverData.topDrops,
            recentTransactions: realtimeData.recentTransactions?.length
                ? realtimeData.recentTransactions
                : serverData.recentTransactions,
            adminActivity: mergedAdminActivity,
            issues: [
                ...(serverData.issues ?? []),
                ...(listenerState.dropsFailed ? ["Operational drop pulse is delayed. Showing verified snapshot totals."] : []),
                ...(listenerState.summaryFailed ? ["Operational commerce pulse is delayed. Showing verified snapshot totals."] : []),
                ...(listenerState.transactionsFailed ? ["Operational transaction pulse is delayed. Showing verified snapshot totals."] : []),
                ...(listenerState.adminActivityFailed ? ["Operational admin activity pulse is delayed. Showing verified snapshot totals."] : []),
            ],
            overviewIssues: [
                ...(serverData.overviewIssues ?? []),
                ...(listenerState.dropsFailed ? [{
                    source: "drops" as const,
                    summary: "Operational drop pulse is delayed. Showing verified snapshot totals.",
                    sourceTruth: "entitlement_rollup" as const,
                    freshnessState: "review" as const,
                }] : []),
                ...(listenerState.summaryFailed ? [{
                    source: "commerce" as const,
                    summary: "Operational commerce pulse is delayed. Showing verified snapshot totals.",
                    sourceTruth: "server_transaction" as const,
                    freshnessState: "review" as const,
                }] : []),
                ...(listenerState.transactionsFailed ? [{
                    source: "transactions" as const,
                    summary: "Operational transaction pulse is delayed. Showing verified snapshot totals.",
                    sourceTruth: "server_transaction" as const,
                    freshnessState: "review" as const,
                }] : []),
                ...(listenerState.adminActivityFailed ? [{
                    source: "admin_activity" as const,
                    summary: "Operational admin activity pulse is delayed. Showing verified snapshot totals.",
                    sourceTruth: "telemetry" as const,
                    freshnessState: "review" as const,
                }] : []),
            ],
            truthNotes: {
                ...serverData.truthNotes,
                overview: overviewLabel,
            },
            realtimeDebugMeta: debugMeta,
        } as AdminOverviewResponse;
    }, [listenerState, realtimeData, serverData]);

    return {
        data: mergedData,
        error,
        isLoading: isLoading && !serverData,
        mutate
    };
}
