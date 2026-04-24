import { useEffect, useState, useMemo } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase-data";
import { RUNTIME_WARNING_COLLECTION, QUEUE_JOB_HEARTBEAT_COLLECTION, type RuntimeWarningRecord, type QueueJobHeartbeat } from "../../../../../shared/runtime/runtime-warning-contract";
import { ROUTE_RUNTIME_HEALTH_COLLECTION, type RouteRuntimeHealthItem } from "@/lib/route-runtime-health";
import { ORCHESTRATION_COLLECTIONS, type OrchestrationRepairProposalRecord } from "@/lib/orchestration/contract";

export type ClusteredRuntimeWarning = {
    signature: string;
    code: string;
    surface: string;
    moduleKey: string | null;
    executionLayer: string;
    severity: string;
    status: string;
    latestSeenAt: number;
    totalOccurrences: number;
    sampleDetails: Record<string, unknown>[];
    freshnessKeys: string[];
};

export function useAdminDebugRealtime() {
    const [warnings, setWarnings] = useState<RuntimeWarningRecord[]>([]);
    const [routeHealth, setRouteHealth] = useState<RouteRuntimeHealthItem[]>([]);
    const [repairProposals, setRepairProposals] = useState<OrchestrationRepairProposalRecord[]>([]);
    const [queueHeartbeats, setQueueHeartbeats] = useState<QueueJobHeartbeat[]>([]);

    useEffect(() => {
        const warningsQuery = query(
            collection(db, RUNTIME_WARNING_COLLECTION),
            orderBy("lastSeenAt", "desc"),
            limit(200)
        );
        const unsubscribeWarnings = onSnapshot(warningsQuery, (snapshot) => {
            const records = snapshot.docs.map(doc => doc.data() as RuntimeWarningRecord);
            setWarnings(records);
        });

        const routeHealthQuery = query(
            collection(db, ROUTE_RUNTIME_HEALTH_COLLECTION),
            orderBy("updatedAtMs", "desc"),
            limit(150)
        );
        const unsubscribeRouteHealth = onSnapshot(routeHealthQuery, (snapshot) => {
            const records = snapshot.docs.map(doc => doc.data() as RouteRuntimeHealthItem);
            setRouteHealth(records);
        });

        const repairProposalsQuery = query(
            collection(db, ORCHESTRATION_COLLECTIONS.repairProposals),
            orderBy("updatedAtMs", "desc"),
            limit(80)
        );
        const unsubscribeRepairProposals = onSnapshot(repairProposalsQuery, (snapshot) => {
            const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as OrchestrationRepairProposalRecord));
            setRepairProposals(records);
        });

        const heartbeatsQuery = query(
            collection(db, QUEUE_JOB_HEARTBEAT_COLLECTION),
            limit(10)
        );
        const unsubscribeHeartbeats = onSnapshot(heartbeatsQuery, (snapshot) => {
            const records = snapshot.docs.map(doc => doc.data() as QueueJobHeartbeat);
            setQueueHeartbeats(records);
        });

        return () => {
            unsubscribeWarnings();
            unsubscribeRouteHealth();
            unsubscribeRepairProposals();
            unsubscribeHeartbeats();
        };
    }, []);

    const clusteredWarnings = useMemo(() => {
        const clusters = new Map<string, ClusteredRuntimeWarning>();

        for (const warning of warnings) {
            const signature = `${warning.code}::${warning.surface}::${warning.moduleKey}::${warning.executionLayer}`;
            const existing = clusters.get(signature);

            if (existing) {
                existing.totalOccurrences += Math.max(1, warning.occurrenceCount || 1);
                existing.latestSeenAt = Math.max(existing.latestSeenAt, warning.lastSeenAt);
                if (warning.detail && Object.keys(warning.detail).length > 0 && existing.sampleDetails.length < 3) {
                    existing.sampleDetails.push(warning.detail);
                }
                if (warning.freshnessKey && !existing.freshnessKeys.includes(warning.freshnessKey)) {
                    existing.freshnessKeys.push(warning.freshnessKey);
                }
                // Upgrade severity if needed
                if (warning.severity === "error") existing.severity = "error";
                else if (warning.severity === "warn" && existing.severity === "info") existing.severity = "warn";

                // Upgrade status if needed
                if (warning.status === "failed") existing.status = "failed";
                else if (warning.status === "degraded" && existing.status !== "failed") existing.status = "degraded";
            } else {
                clusters.set(signature, {
                    signature,
                    code: warning.code,
                    surface: warning.surface,
                    moduleKey: warning.moduleKey,
                    executionLayer: warning.executionLayer,
                    severity: warning.severity,
                    status: warning.status,
                    latestSeenAt: warning.lastSeenAt,
                    totalOccurrences: Math.max(1, warning.occurrenceCount || 1),
                    sampleDetails: warning.detail && Object.keys(warning.detail).length > 0 ? [warning.detail] : [],
                    freshnessKeys: warning.freshnessKey ? [warning.freshnessKey] : [],
                });
            }
        }

        return Array.from(clusters.values()).sort((a, b) => b.latestSeenAt - a.latestSeenAt);
    }, [warnings]);

    const activeWarnings = useMemo(() => clusteredWarnings.filter(w => w.status !== "ok"), [clusteredWarnings]);
    const historicalWarnings = useMemo(() => clusteredWarnings.filter(w => w.status === "ok"), [clusteredWarnings]);

    return {
        rawWarnings: warnings,
        clusteredWarnings,
        activeWarnings,
        historicalWarnings,
        routeHealth,
        repairProposals,
        queueHeartbeats,
    };
}
