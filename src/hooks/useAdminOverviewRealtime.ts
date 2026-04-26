"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { collection, doc, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import useSWR from "swr";

import { authFetch } from "@/lib/authFetch";
import { reportRealtimeIssue } from "@/lib/client-error-reporting";
import { buildFirestoreClientIssueDetail } from "@/lib/firestore-client-errors";
import { db } from "@/lib/firebase-data";
import { createAutoHealingObserver } from "@/lib/self-healing";
import type { AdminOverviewResponse, AdminOverviewTransactionRecord } from "@/lib/admin-overview";
import { normalizeTransactionRecord } from "@/lib/transaction-normalizers";
import { isDropHiddenFromPublic, normalizeAndApplyDropStatusOrNull } from "@/lib/drop-read-models";

type OverviewRealtimeListenerState = {
    dropsLoaded: boolean;
    summaryLoaded: boolean;
    transactionsLoaded: boolean;
    dropsFailed: boolean;
    summaryFailed: boolean;
    transactionsFailed: boolean;
};

const EMPTY_DELTA = {
    current: 0,
    previous: 0,
    percentChange: 0,
    direction: "flat" as const,
    scopeLabel: "vs prior 30d",
};

function buildRealtimeOnlyOverview(
    realtimeData: Partial<AdminOverviewResponse>,
    listenerState: OverviewRealtimeListenerState,
): AdminOverviewResponse {
    const generatedAt = Date.now();
    const issues = [
        listenerState.dropsFailed ? "Drops realtime listener failed." : null,
        listenerState.summaryFailed ? "Commerce summary realtime listener failed." : null,
        listenerState.transactionsFailed ? "Transaction realtime listener failed." : null,
    ].filter((issue): issue is string => Boolean(issue));

    return {
        success: issues.length === 0,
        issues,
        generatedAt,
        freshness: {
            lastTransactionAt: realtimeData.recentTransactions?.[0]?.timestamp ?? 0,
            lastAdminActivityAt: 0,
        },
        stats: {
            totalUsers: 0,
            liveDrops: 0,
            totalDrops: 0,
            grossRevenueCents: 0,
            totalUnwraps: 0,
            currentWindowPurchases: 0,
            currentWindowNewUsers: 0,
            ...(realtimeData.stats ?? {}),
        },
        deltas: {
            accounts: EMPTY_DELTA,
            purchases: EMPTY_DELTA,
            revenue: EMPTY_DELTA,
            unwraps: EMPTY_DELTA,
        },
        recentTransactions: realtimeData.recentTransactions ?? [],
        adminActivity: [],
        topDrops: realtimeData.topDrops ?? [],
        chartData: [],
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
            overview: "[Partial] Firestore realtime subscriptions hydrated before the server rollup snapshot.",
            platformPulse: "[Partial] Realtime drops, commerce summary, and transactions are live; rollup-only metrics are pending.",
            drops: listenerState.dropsFailed ? "[Failed] Firestore drops listener failed." : "[Live] Firestore drops listener.",
            revenue: listenerState.summaryFailed ? "[Failed] Firestore commerce summary listener failed." : "[Live] Firestore commerce rollup listener.",
            topDrops: listenerState.dropsFailed ? "[Failed] Firestore drops listener failed." : "[Live] Firestore drops listener.",
            transactions: listenerState.transactionsFailed ? "[Failed] Firestore transactions listener failed." : "[Live] Firestore transactions listener.",
            adminActivity: "[Unknown] Admin activity requires the server overview rollup snapshot.",
        },
    };
}

export function useAdminOverviewRealtime() {
    const fetcher = async (url: string) => {
        const response = await authFetch(url);
        if (!response.ok) throw new Error("Failed to load overview");
        return response.json() as Promise<AdminOverviewResponse>;
    };

    const { data: serverData, error, isLoading, mutate } = useSWR<AdminOverviewResponse>(
        "/api/admin/overview",
        fetcher,
        { refreshInterval: 60000, revalidateOnFocus: false } // Refresh massive backend charts only every minute
    );

    const serverDataRef = useRef<AdminOverviewResponse | undefined>(undefined);
    const [realtimeData, setRealtimeData] = useState<Partial<AdminOverviewResponse>>({});
    const [listenerState, setListenerState] = useState<OverviewRealtimeListenerState>({
        dropsLoaded: false,
        summaryLoaded: false,
        transactionsLoaded: false,
        dropsFailed: false,
        summaryFailed: false,
        transactionsFailed: false,
    });
    const dropsLoadedRef = useRef(false);

    useEffect(() => {
        serverDataRef.current = serverData;
    }, [serverData]);

    useEffect(() => {
        if (typeof window === "undefined") return;

        let cancelled = false;

        // Subscribe to Drops
        const dropsControl = createAutoHealingObserver(() => onSnapshot(collection(db, "drops"), (snapshot) => {
            if (cancelled) return;
            const now = Date.now();
            const drops = snapshot.docs.flatMap(doc => {
                const normalized = normalizeAndApplyDropStatusOrNull(doc.data(), doc.id, now);
                return normalized && !isDropHiddenFromPublic(normalized) ? [normalized] : [];
            });
            const topDrops = [...drops].sort((a, b) => (b.totalUnlocks || 0) - (a.totalUnlocks || 0)).slice(0, 6);
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
            setListenerState((current) => ({ ...current, dropsLoaded: true, dropsFailed: false }));
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
            if (snapshot.exists()) {
                const raw = snapshot.data();
                const grossRevenueUsdTotal = Number(raw.grossRevenueUsdTotal || 0);
                const grossRevenueCents = Math.round(grossRevenueUsdTotal * 100) || Number(raw.revenueCentsTotal || 0);
                const unlockCount = Number(raw.unlockCount || raw.totalUnlocks || 0);
                const latestServerData = serverDataRef.current;

                setRealtimeData(prev => ({
                    ...prev,
                    generatedAt: Date.now(),
                    stats: {
                        ...prev.stats,
                        ...(latestServerData?.stats || {}),
                        grossRevenueCents: Math.max(grossRevenueCents, prev.stats?.grossRevenueCents || 0, latestServerData?.stats?.grossRevenueCents || 0),
                        totalUnwraps: dropsLoadedRef.current ? (prev.stats?.totalUnwraps || 0) : Math.max(unlockCount, prev.stats?.totalUnwraps || 0, latestServerData?.stats?.totalUnwraps || 0)
                    } as AdminOverviewResponse["stats"]
                }));
            }
            setListenerState((current) => ({ ...current, summaryLoaded: true, summaryFailed: false }));
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
        const txControl = createAutoHealingObserver(() => onSnapshot(txQuery, (snapshot) => {
            if (cancelled) return;
            const latestServerData = serverDataRef.current;
            const txs = snapshot.docs.map(doc => {
                const rawDoc = doc.data() as Record<string, unknown>;
                const raw = normalizeTransactionRecord(rawDoc, doc.id);
                // We won't have usernames eagerly fetched in pure realtime, but we can preserve server ones if matched or extract raw
                const serverMatch = latestServerData?.recentTransactions?.find(s => s.id === doc.id);
                
                let fallbackUsername = "Pending lookup";
                if (typeof rawDoc.username === "string" && rawDoc.username.trim()) fallbackUsername = rawDoc.username;
                else if (typeof rawDoc.userHandle === "string" && rawDoc.userHandle.trim()) fallbackUsername = rawDoc.userHandle;
                else if (typeof rawDoc.userDisplayName === "string" && rawDoc.userDisplayName.trim()) fallbackUsername = rawDoc.userDisplayName;

                return {
                    ...raw,
                    username: serverMatch?.username || fallbackUsername,
                    timestamp: typeof raw.timestamp === "number" ? raw.timestamp : (raw.timestamp as any)?.toMillis?.() || 0,
                    sourceScope: "realtime_firestore" as const
                } as AdminOverviewTransactionRecord;
            });
            setRealtimeData(prev => ({
                ...prev,
                generatedAt: Date.now(),
                recentTransactions: txs
            }));
            setListenerState((current) => ({ ...current, transactionsLoaded: true, transactionsFailed: false }));
        }, (err) => {
            if (cancelled) return;
            setListenerState((current) => ({ ...current, transactionsFailed: true }));
            txControl.triggerReconnect(err);
        }), (error) => {
            const issueDetail = buildFirestoreClientIssueDetail(error);
            reportRealtimeIssue(`Admin overview transactions: ${issueDetail}`, error, { listener: "admin_overview_transactions" });
        });

        return () => {
            cancelled = true;
            dropsControl.cleanup();
            summaryControl.cleanup();
            txControl.cleanup();
        };
    }, []);

    const hasRealtimeSnapshot =
        listenerState.dropsLoaded || listenerState.summaryLoaded || listenerState.transactionsLoaded;
    const hasRealtimeFailure =
        listenerState.dropsFailed || listenerState.summaryFailed || listenerState.transactionsFailed;
    const allRealtimeLoaded =
        listenerState.dropsLoaded && listenerState.summaryLoaded && listenerState.transactionsLoaded;

    const mergedData = useMemo(() => {
        if (!serverData && !hasRealtimeSnapshot) {
            return undefined;
        }

        if (!serverData) {
            return buildRealtimeOnlyOverview(realtimeData, listenerState);
        }

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
            },
            stats: {
                ...serverData.stats,
                ...(realtimeData.stats || {})
            },
            issues: [
                ...(serverData.issues ?? []),
                ...(hasRealtimeFailure ? ["One or more overview realtime listeners are degraded."] : []),
            ],
            truthNotes: {
                ...serverData.truthNotes,
                overview: hasRealtimeFailure
                    ? "[Partial] Firestore realtime subscriptions are overlaying the server rollup, but at least one listener is degraded."
                    : allRealtimeLoaded
                        ? "[Live] Canonical Firestore realtime subscriptions overlaying 60s background rollup caches."
                        : "[Partial] Firestore realtime subscriptions are warming up over the server rollup snapshot."
            }
        } as AdminOverviewResponse;
    }, [allRealtimeLoaded, hasRealtimeFailure, hasRealtimeSnapshot, listenerState, realtimeData, serverData]);

    return {
        data: mergedData,
        error,
        isLoading: isLoading && !hasRealtimeSnapshot,
        mutate
    };
}
