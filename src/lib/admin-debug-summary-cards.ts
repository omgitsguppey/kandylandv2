import type { AdminSurfaceState } from "@/lib/admin-parity";

export type AdminDebugRouteRuntimeSummary = {
    total: number;
    healthy: number;
    warn: number;
    fail: number;
    stale: number;
    unobserved: number;
    slow: number;
    serverErrors: number;
    clientErrors: number;
};

export type AdminDebugRouteListenerState = {
    routeHealthFailed?: boolean;
    routeHealthLoaded?: boolean;
};

export function buildAdminDebugRouteHealthCard(input: {
    summary: AdminDebugRouteRuntimeSummary;
    observedCount: number;
    hasRealtimeRows: boolean;
    hasSnapshotRows: boolean;
    listenerState: AdminDebugRouteListenerState;
    isLoading: boolean;
    hasError: boolean;
}) {
    const { summary, observedCount, hasRealtimeRows, hasSnapshotRows, listenerState, isLoading, hasError } = input;
    const issueCount = summary.warn + summary.fail + summary.stale;
    const sourceLabel = hasRealtimeRows
        ? "[live] route listener"
        : hasSnapshotRows && listenerState.routeHealthFailed
            ? "[fallback] API snapshot; route listener failed"
            : hasSnapshotRows && !listenerState.routeHealthLoaded
                ? "[partial] API snapshot; route listener hydrating"
                : hasSnapshotRows
                    ? "[fallback] API snapshot; live listener empty"
                    : listenerState.routeHealthFailed
                        ? "[failed] route listener and API snapshot empty"
                        : isLoading
                            ? "[loading] route sources"
                            : "[unavailable] no route runtime records";

    const truthState: AdminSurfaceState = isLoading && summary.total === 0
        ? "loading"
        : hasError || (listenerState.routeHealthFailed && summary.total === 0)
            ? "failed"
            : summary.fail > 0
                ? "failed"
                : listenerState.routeHealthFailed || summary.warn > 0 || summary.stale > 0
                    ? "degraded"
                    : summary.total > 0
                        ? "live"
                        : "unavailable";

    return {
        value: summary.total > 0
            ? `${summary.healthy} ok / ${issueCount} action / ${summary.fail} fail`
            : "0 tracked",
        meta: summary.total > 0
            ? `${sourceLabel} | ${summary.total} tracked, ${observedCount} observed, ${summary.unobserved} unseen | slow ${summary.slow}, server ${summary.serverErrors}, client ${summary.clientErrors}`
            : sourceLabel,
        truthState,
        sourceLabel,
    };
}

export function buildAdminDebugOpenActionsCard(input: {
    proposalCount: number;
    panelWarnCount: number;
    panelFailCount: number;
    routeWarnCount: number;
    routeFailCount: number;
    routeStaleCount: number;
    queueStaleCount: number;
    queueFailedCount: number;
    missingNotificationOutcomes: number;
    isLoading: boolean;
    hasError: boolean;
}) {
    const buckets = [
        {
            key: "repairs",
            label: "repair proposals",
            count: input.proposalCount,
            detail: `${input.proposalCount} actionable proposal${input.proposalCount === 1 ? "" : "s"}`,
        },
        {
            key: "panel_logs",
            label: "panel logs",
            count: input.panelWarnCount + input.panelFailCount,
            detail: `${input.panelFailCount} fail, ${input.panelWarnCount} warn`,
        },
        {
            key: "route_runtime",
            label: "route runtime",
            count: input.routeWarnCount + input.routeFailCount + input.routeStaleCount,
            detail: `${input.routeFailCount} fail, ${input.routeStaleCount} stale, ${input.routeWarnCount} warn`,
        },
        {
            key: "queue_runtime",
            label: "queue runtime",
            count: input.queueStaleCount + input.queueFailedCount + input.missingNotificationOutcomes,
            detail: `${input.queueFailedCount} failed jobs, ${input.queueStaleCount} stale jobs, ${input.missingNotificationOutcomes} missing outcomes`,
        },
    ].filter((bucket) => bucket.count > 0);

    const count = buckets.reduce((sum, bucket) => sum + bucket.count, 0);
    const truthState: AdminSurfaceState = input.isLoading
        ? "loading"
        : input.hasError
            ? "failed"
            : input.panelFailCount > 0 || input.routeFailCount > 0 || input.queueFailedCount > 0
                ? "failed"
                : count > 0
                    ? "degraded"
                    : "live";

    const formatBucket = (bucket: (typeof buckets)[number]) => {
        const label = bucket.count === 1 && bucket.label.endsWith("s")
            ? bucket.label.slice(0, -1)
            : bucket.label;
        return `${bucket.count} ${label} (${bucket.detail})`;
    };

    return {
        count,
        meta: buckets.length > 0
            ? buckets.map(formatBucket).join(" | ")
            : "No actionable debug lanes in current snapshot",
        truthState,
        buckets,
    };
}
