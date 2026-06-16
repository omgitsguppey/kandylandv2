import { useEffect, useState, useMemo } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase-data";
import { reportRealtimeIssue, buildFirestoreClientIssueDetail } from "@/lib/client-error-reporting";
import { createAutoHealingObserver } from "@/lib/self-healing";
import { RUNTIME_WARNING_COLLECTION, QUEUE_JOB_HEARTBEAT_COLLECTION, type RuntimeWarningRecord, type QueueJobHeartbeat } from "../../../../../shared/runtime/runtime-warning-contract";
import { ROUTE_RUNTIME_HEALTH_COLLECTION, type RouteRuntimeHealthItem } from "@/lib/route-runtime-health";
import { ORCHESTRATION_COLLECTIONS, type OrchestrationRepairProposalRecord } from "@/lib/orchestration/contract";

export type DebugListenerErrors = {
    warningsFailed: boolean;
    warningsLoaded: boolean;
    routeHealthFailed: boolean;
    routeHealthLoaded: boolean;
    repairProposalsFailed: boolean;
    repairProposalsLoaded: boolean;
    heartbeatsFailed: boolean;
    heartbeatsLoaded: boolean;
};

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

const EMPTY_DEBUG_LISTENER_ERRORS: DebugListenerErrors = {
    warningsFailed: false,
    warningsLoaded: false,
    routeHealthFailed: false,
    routeHealthLoaded: false,
    repairProposalsFailed: false,
    repairProposalsLoaded: false,
    heartbeatsFailed: false,
    heartbeatsLoaded: false,
};

const EMPTY_WARNINGS: RuntimeWarningRecord[] = [];
const EMPTY_ROUTE_HEALTH: RouteRuntimeHealthItem[] = [];
const EMPTY_REPAIR_PROPOSALS: OrchestrationRepairProposalRecord[] = [];
const EMPTY_QUEUE_HEARTBEATS: QueueJobHeartbeat[] = [];
const EMPTY_CLUSTERED_WARNINGS: ClusteredRuntimeWarning[] = [];

export function useAdminDebugRealtime(options: { enabled?: boolean } = {}) {
    const enabled = options.enabled ?? true;
    const [warnings, setWarnings] = useState<RuntimeWarningRecord[]>([]);
    const [routeHealth, setRouteHealth] = useState<RouteRuntimeHealthItem[]>([]);
    const [repairProposals, setRepairProposals] = useState<OrchestrationRepairProposalRecord[]>([]);
    const [queueHeartbeats, setQueueHeartbeats] = useState<QueueJobHeartbeat[]>([]);
    const [listenerErrors, setListenerErrors] = useState<DebugListenerErrors>({
        warningsFailed: false,
        warningsLoaded: false,
        routeHealthFailed: false,
        routeHealthLoaded: false,
        repairProposalsFailed: false,
        repairProposalsLoaded: false,
        heartbeatsFailed: false,
        heartbeatsLoaded: false,
    });

    useEffect(() => {
        if (!enabled) {
            return;
        }

        let warningsCancelled = false;
        const warningsQuery = query(
            collection(db, RUNTIME_WARNING_COLLECTION),
            orderBy("lastSeenAt", "desc"),
            limit(200)
        );
        const controlWarnings = createAutoHealingObserver(() => onSnapshot(warningsQuery, (snapshot) => {
            if (warningsCancelled) return;
            const records = snapshot.docs.map(doc => doc.data() as RuntimeWarningRecord);
            setWarnings(records);
            setListenerErrors((current) => ({ ...current, warningsFailed: false, warningsLoaded: true }));
        }, (error) => {
            if (warningsCancelled) return;
            setListenerErrors((current) => ({ ...current, warningsFailed: true }));
            controlWarnings.triggerReconnect(error);
        }), (error) => {
            reportRealtimeIssue("Admin debug warnings", buildFirestoreClientIssueDetail(error), { listener: "admin_debug_warnings" });
        });

        let routeHealthCancelled = false;
        const routeHealthQuery = query(
            collection(db, ROUTE_RUNTIME_HEALTH_COLLECTION),
            orderBy("updatedAtMs", "desc"),
            limit(150)
        );
        const controlRouteHealth = createAutoHealingObserver(() => onSnapshot(routeHealthQuery, (snapshot) => {
            if (routeHealthCancelled) return;
            const records = snapshot.docs.map(doc => doc.data() as RouteRuntimeHealthItem);
            setRouteHealth(records);
            setListenerErrors((current) => ({ ...current, routeHealthFailed: false, routeHealthLoaded: true }));
        }, (error) => {
            if (routeHealthCancelled) return;
            setListenerErrors((current) => ({ ...current, routeHealthFailed: true }));
            controlRouteHealth.triggerReconnect(error);
        }), (error) => {
            reportRealtimeIssue("Admin debug route health", buildFirestoreClientIssueDetail(error), { listener: "admin_debug_route_health" });
        });

        let repairProposalsCancelled = false;
        const repairProposalsQuery = query(
            collection(db, ORCHESTRATION_COLLECTIONS.repairProposals),
            orderBy("updatedAtMs", "desc"),
            limit(80)
        );
        const controlRepairProposals = createAutoHealingObserver(() => onSnapshot(repairProposalsQuery, (snapshot) => {
            if (repairProposalsCancelled) return;
            const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as OrchestrationRepairProposalRecord));
            setRepairProposals(records);
            setListenerErrors((current) => ({ ...current, repairProposalsFailed: false, repairProposalsLoaded: true }));
        }, (error) => {
            if (repairProposalsCancelled) return;
            setListenerErrors((current) => ({ ...current, repairProposalsFailed: true }));
            controlRepairProposals.triggerReconnect(error);
        }), (error) => {
            reportRealtimeIssue("Admin debug repair proposals", buildFirestoreClientIssueDetail(error), { listener: "admin_debug_repair_proposals" });
        });

        let heartbeatsCancelled = false;
        const heartbeatsQuery = query(
            collection(db, QUEUE_JOB_HEARTBEAT_COLLECTION),
            limit(50)
        );
        const controlHeartbeats = createAutoHealingObserver(() => onSnapshot(heartbeatsQuery, (snapshot) => {
            if (heartbeatsCancelled) return;
            const records = snapshot.docs.map(doc => doc.data() as QueueJobHeartbeat);
            setQueueHeartbeats(records);
            setListenerErrors((current) => ({ ...current, heartbeatsFailed: false, heartbeatsLoaded: true }));
        }, (error) => {
            if (heartbeatsCancelled) return;
            setListenerErrors((current) => ({ ...current, heartbeatsFailed: true }));
            controlHeartbeats.triggerReconnect(error);
        }), (error) => {
            reportRealtimeIssue("Admin debug heartbeats", buildFirestoreClientIssueDetail(error), { listener: "admin_debug_heartbeats" });
        });

        return () => {
            warningsCancelled = true;
            routeHealthCancelled = true;
            repairProposalsCancelled = true;
            heartbeatsCancelled = true;
            controlWarnings.cleanup();
            controlRouteHealth.cleanup();
            controlRepairProposals.cleanup();
            controlHeartbeats.cleanup();
        };
    }, [enabled]);

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
    const effectiveWarnings = enabled ? warnings : EMPTY_WARNINGS;
    const effectiveClusteredWarnings = enabled ? clusteredWarnings : EMPTY_CLUSTERED_WARNINGS;
    const effectiveActiveWarnings = enabled ? activeWarnings : EMPTY_CLUSTERED_WARNINGS;
    const effectiveHistoricalWarnings = enabled ? historicalWarnings : EMPTY_CLUSTERED_WARNINGS;

    return {
        rawWarnings: effectiveWarnings,
        clusteredWarnings: effectiveClusteredWarnings,
        activeWarnings: effectiveActiveWarnings,
        historicalWarnings: effectiveHistoricalWarnings,
        routeHealth: enabled ? routeHealth : EMPTY_ROUTE_HEALTH,
        repairProposals: enabled ? repairProposals : EMPTY_REPAIR_PROPOSALS,
        queueHeartbeats: enabled ? queueHeartbeats : EMPTY_QUEUE_HEARTBEATS,
        listenerErrors: enabled ? listenerErrors : EMPTY_DEBUG_LISTENER_ERRORS,
    };
}
