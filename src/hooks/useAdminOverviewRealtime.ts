"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { collection, doc, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import useSWR from "swr";

import { authFetch } from "@/lib/authFetch";
import { reportRealtimeIssue } from "@/lib/client-error-reporting";
import { buildFirestoreClientIssueDetail } from "@/lib/firestore-client-errors";
import { db } from "@/lib/firebase-data";
import { createAutoHealingObserver } from "@/lib/self-healing";
import type { AdminSurfaceState } from "@/lib/admin-parity";
import type { AdminOverviewResponse, AdminOverviewTransactionRecord, AdminOverviewActivityItem, AdminOverviewRealtimeDebugMeta } from "@/lib/admin-overview";
import { buildRolling30dWindow } from "@/lib/admin-overview";
import { normalizeTransactionRecord, getTransactionDisplayLabel } from "@/lib/transaction-normalizers";
import { isDropHiddenFromPublic, normalizeAndApplyDropStatusOrNull } from "@/lib/drop-read-models";

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

const EMPTY_DELTA = {
    current: 0,
    previous: 0,
    percentChange: 0,
    direction: "flat" as const,
    scopeLabel: "vs prior 30d",
};

/** SWR polling interval for the server rollup endpoint (charts, deltas, activity).
 *  Realtime listeners cover the hot-path data. This polling remains intentionally
 *  for chart/trend data that doesn't need sub-minute freshness. */
const SERVER_ROLLUP_POLL_INTERVAL_MS = 60_000;

/**
 * Resolve a human-readable truth chip label from the listener state.
 *
 * Vocabulary:
 * - "Updated"                             - all live upgrade listeners loaded, none from cache
 * - "Showing last verified data"          - verified server data exists, cache is in use, or live upgrade is absent
 * - "Waiting for first overview snapshot" - no verified overview data exists yet
 * - "Live updates delayed"                - at least one live upgrade listener has failed
 * - "Refreshing overview"                 - partial live upgrade listeners loaded, none failed
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
        return "Live updates delayed";
    }

    if (allLoaded && !anyFromCache) {
        return "Updated";
    }

    if (allLoaded && anyFromCache) {
        return "Showing last verified data";
    }

    if (anyLoaded) {
        return "Refreshing overview";
    }

    if (hasServerData) {
        return "Showing last verified data";
    }

    return "Waiting for first overview snapshot";
}

/** Map a truth chip label to a CSS chip style variant. */
export function resolveTruthChipVariant(label: string): AdminSurfaceState {
    if (label === "Updated") return "live";
    if (label === "Showing last verified data") return "stale";
    if (label === "Refreshing overview") return "degraded";
    if (label === "Live updates delayed") return "fallback";
    return "unavailable";
}

function buildRealtimeOnlyOverview(
    realtimeData: Partial<AdminOverviewResponse>,
    listenerState: OverviewRealtimeListenerState,
): AdminOverviewResponse {
    const generatedAt = Date.now();
    const issues = [
        listenerState.dropsFailed ? "Drop activity live updates are delayed." : null,
        listenerState.summaryFailed ? "Commerce live updates are delayed." : null,
        listenerState.transactionsFailed ? "Transaction live updates are delayed." : null,
        listenerState.adminActivityFailed ? "Admin activity live updates are delayed." : null,
    ].filter((issue): issue is string => Boolean(issue));

    const overviewLabel = resolveTruthChipLabel(listenerState, false);

    return {
        success: false,
        issues,
        overviewIssues: issues.map((issue) => ({
            source: issue.toLowerCase().includes("drop") ? "drops" : issue.toLowerCase().includes("commerce") ? "commerce" : issue.toLowerCase().includes("transaction") ? "transactions" : "admin_activity",
            summary: issue,
            sourceTruth: issue.toLowerCase().includes("commerce") || issue.toLowerCase().includes("transaction") ? "server_transaction" : issue.toLowerCase().includes("drop") ? "entitlement_rollup" : "telemetry",
            freshnessState: "review",
        })),
        generatedAt,
        rollingWindow: buildRolling30dWindow(generatedAt),
        freshness: {
            lastTransactionAt: realtimeData.recentTransactions?.[0]?.timestamp ?? 0,
            lastAdminActivityAt: realtimeData.adminActivity?.[0]?.timestamp ?? 0,
        },
        stats: {
            totalUsers: realtimeData.stats?.totalUsers ?? 0,
            liveDrops: realtimeData.stats?.liveDrops ?? 0,
            totalDrops: realtimeData.stats?.totalDrops ?? 0,
            grossRevenueCents: realtimeData.stats?.grossRevenueCents ?? 0,
            totalUnwraps: realtimeData.stats?.totalUnwraps ?? 0,
            currentWindowPurchases: realtimeData.stats?.currentWindowPurchases ?? 0,
            currentWindowNewUsers: realtimeData.stats?.currentWindowNewUsers ?? 0,
            ...(realtimeData.stats ?? {}),
        },
        deltas: {
            accounts: EMPTY_DELTA,
            purchases: EMPTY_DELTA,
            revenue: EMPTY_DELTA,
            unwraps: EMPTY_DELTA,
        },
        recentTransactions: realtimeData.recentTransactions ?? [],
        adminActivity: realtimeData.adminActivity ?? [],
        topDrops: realtimeData.topDrops ?? [],
        chartData: [],
        platformPulse: [],
        trendSummary: {
            windowDays: 30,
            currentStartDayKey: "",
            currentEndDayKey: "",
            previousStartDayKey: "",
            previousEndDayKey: "",
            currentRevenueCents: 0,
            previousRevenueCents: 0,
            currentUnwraps: 0,
            previousUnwraps: 0,
            currentPurchases: 0,
            previousPurchases: 0,
            currentNewUsers: 0,
            previousNewUsers: 0,
            revenueActiveDays: 0,
            unwrapActiveDays: 0,
            bestRevenueDay: null,
            bestUnwrapDay: null,
            topUnlockDrop: null,
        },
        truthNotes: {
            overview: overviewLabel,
            platformPulse: listenerState.dropsLoaded || listenerState.summaryLoaded
                ? "Showing available overview data while the full snapshot loads."
                : "Waiting for first overview snapshot.",
            drops: listenerState.dropsFailed ? "Drop activity is delayed." : listenerState.dropsLoaded ? "Drop activity updated." : "Drop activity is refreshing.",
            revenue: listenerState.summaryFailed ? "Commerce updates are delayed." : listenerState.summaryLoaded ? "Commerce updated." : "Commerce is refreshing.",
            topDrops: listenerState.dropsFailed ? "Drop activity is delayed." : listenerState.dropsLoaded ? "Drop ranking updated." : "Drop ranking is refreshing.",
            transactions: listenerState.transactionsFailed ? "Transactions are delayed." : listenerState.transactionsLoaded ? "Transactions updated." : "Transactions are refreshing.",
            adminActivity: listenerState.adminActivityFailed ? "Admin activity is delayed." : listenerState.adminActivityLoaded ? "Admin activity updated." : "Admin activity is refreshing.",
        },
        realtimeDebugMeta: {
            dropsFromCache: listenerState.dropsFromCache,
            summaryFromCache: listenerState.summaryFromCache,
            transactionsFromCache: listenerState.transactionsFromCache,
            adminActivityFromCache: listenerState.adminActivityFromCache,
            lastServerConfirmedAt: listenerState.lastServerConfirmedAt,
            lastClientSnapshotAt: listenerState.lastClientSnapshotAt,
            pollingActive: true,
            pollingIntervalMs: SERVER_ROLLUP_POLL_INTERVAL_MS,
            legacyDataMapped: false,
        },
    };
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
        { refreshInterval: SERVER_ROLLUP_POLL_INTERVAL_MS, revalidateOnFocus: false }
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
    const dropsLoadedRef = useRef(false);

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
            const drops = snapshot.docs.flatMap(doc => {
                const normalized = normalizeAndApplyDropStatusOrNull(doc.data(), doc.id, now);
                return normalized && !isDropHiddenFromPublic(normalized) ? [normalized] : [];
            });
            const topDrops = [...drops].sort((a, b) => (b.totalUnlocks || 0) - (a.totalUnlocks || 0)).slice(0, 20);
            const latestServerData = serverDataRef.current;

            setRealtimeData(prev => ({
                ...prev,
                generatedAt: now,
                topDrops,
                stats: {
                    ...prev.stats,
                    ...(latestServerData?.stats || {}),
                    liveDrops: drops.filter(d => d.status === "active" && !isDropHiddenFromPublic(d)).length,
                    totalDrops: drops.length,
                    totalUnwraps: drops.reduce((sum, d) => sum + (d.totalUnlocks || 0), 0)
                } as AdminOverviewResponse["stats"]
            }));
            dropsLoadedRef.current = true;
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
            if (snapshot.exists()) {
                const raw = snapshot.data();
                const grossRevenueUsdTotal = Number(raw.grossRevenueUsdTotal || 0);
                const grossRevenueCents = Math.round(grossRevenueUsdTotal * 100) || Number(raw.revenueCentsTotal || 0);
                const unlockCount = Number(raw.unlockCount || raw.totalUnlocks || 0);
                const latestServerData = serverDataRef.current;

                setRealtimeData(prev => ({
                    ...prev,
                    generatedAt: now,
                    stats: {
                        ...prev.stats,
                        ...(latestServerData?.stats || {}),
                        grossRevenueCents: Math.max(grossRevenueCents, prev.stats?.grossRevenueCents || 0, latestServerData?.stats?.grossRevenueCents || 0),
                        totalUnwraps: dropsLoadedRef.current ? (prev.stats?.totalUnwraps || 0) : Math.max(unlockCount, prev.stats?.totalUnwraps || 0, latestServerData?.stats?.totalUnwraps || 0)
                    } as AdminOverviewResponse["stats"]
                }));
            }
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

    const hasRealtimeSnapshot =
        listenerState.dropsLoaded || listenerState.summaryLoaded || listenerState.transactionsLoaded || listenerState.adminActivityLoaded;
    const hasRealtimeFailure =
        listenerState.dropsFailed || listenerState.summaryFailed || listenerState.transactionsFailed || listenerState.adminActivityFailed;
    const allRealtimeLoaded =
        listenerState.dropsLoaded && listenerState.summaryLoaded && listenerState.transactionsLoaded && listenerState.adminActivityLoaded;
    const anyFromCache =
        listenerState.dropsFromCache || listenerState.summaryFromCache || listenerState.transactionsFromCache || listenerState.adminActivityFromCache;

    const mergedData = useMemo(() => {
        if (!serverData && !hasRealtimeSnapshot) {
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
            pollingIntervalMs: SERVER_ROLLUP_POLL_INTERVAL_MS,
            legacyDataMapped: false,
        };

        if (!serverData) {
            return buildRealtimeOnlyOverview(realtimeData, listenerState);
        }

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
            ...realtimeData,
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
            adminActivity: mergedAdminActivity,
            stats: {
                ...serverData.stats,
                ...(realtimeData.stats || {})
            },
            issues: [
                ...(serverData.issues ?? []),
                ...(listenerState.dropsFailed ? ["Drop activity live updates are delayed."] : []),
                ...(listenerState.summaryFailed ? ["Commerce live updates are delayed."] : []),
                ...(listenerState.transactionsFailed ? ["Transaction live updates are delayed."] : []),
                ...(listenerState.adminActivityFailed ? ["Admin activity live updates are delayed."] : []),
            ],
            overviewIssues: [
                ...(serverData.overviewIssues ?? []),
                ...(listenerState.dropsFailed ? [{
                    source: "drops" as const,
                    summary: "Drop activity live updates are delayed.",
                    sourceTruth: "entitlement_rollup" as const,
                    freshnessState: "review" as const,
                }] : []),
                ...(listenerState.summaryFailed ? [{
                    source: "commerce" as const,
                    summary: "Commerce live updates are delayed.",
                    sourceTruth: "server_transaction" as const,
                    freshnessState: "review" as const,
                }] : []),
                ...(listenerState.transactionsFailed ? [{
                    source: "transactions" as const,
                    summary: "Transaction live updates are delayed.",
                    sourceTruth: "server_transaction" as const,
                    freshnessState: "review" as const,
                }] : []),
                ...(listenerState.adminActivityFailed ? [{
                    source: "admin_activity" as const,
                    summary: "Admin activity live updates are delayed.",
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
    }, [hasRealtimeSnapshot, listenerState, realtimeData, serverData]);

    return {
        data: mergedData,
        error,
        isLoading: isLoading && !hasRealtimeSnapshot,
        mutate
    };
}
