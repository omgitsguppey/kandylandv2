import {
    getRouteRuntimeHealthCluster,
    getRouteRuntimeHealthCoverageState,
    getRouteRuntimeHealthStatus,
    type RouteRuntimeHealthItem,
} from "@/lib/route-runtime-health";
import type { AdminDebugRouteRuntimeFilter } from "@/lib/admin-debug-preferences";

export function filterAdminDebugRouteRuntimeHealth(
    items: readonly RouteRuntimeHealthItem[],
    filter: AdminDebugRouteRuntimeFilter,
    nowMs = Date.now(),
) {
    switch (filter) {
        case "failing":
            return items.filter((item) => getRouteRuntimeHealthStatus(item, nowMs) === "fail");
        case "stale":
            return items.filter((item) => getRouteRuntimeHealthStatus(item, nowMs) === "stale");
        case "unseen":
            return items.filter((item) => getRouteRuntimeHealthCoverageState(item) === "unseen");
        case "native_chat":
            return items.filter((item) => getRouteRuntimeHealthCluster(item.key) === "native_chat");
        case "compatibility_chat":
            return items.filter((item) => getRouteRuntimeHealthCluster(item.key) === "compatibility_chat");
        case "all":
        default:
            return [...items];
    }
}

export function mergeAdminDebugRouteRuntimeHealth(input: {
    snapshotItems: readonly RouteRuntimeHealthItem[];
    realtimeItems: readonly RouteRuntimeHealthItem[];
}) {
    if (input.snapshotItems.length === 0) {
        return [...input.realtimeItems];
    }

    const realtimeByKey = new Map(input.realtimeItems.map((item) => [item.key, item]));
    const merged = input.snapshotItems.map((snapshotItem) => realtimeByKey.get(snapshotItem.key) ?? snapshotItem);
    const snapshotKeys = new Set(input.snapshotItems.map((item) => item.key));
    const realtimeOnly = input.realtimeItems.filter((item) => !snapshotKeys.has(item.key));

    return [...merged, ...realtimeOnly].sort((left, right) => {
        const updatedDelta = Math.max(0, right.updatedAtMs) - Math.max(0, left.updatedAtMs);
        if (updatedDelta !== 0) {
            return updatedDelta;
        }

        return left.title.localeCompare(right.title);
    });
}

function toTotalSamples(item: Pick<RouteRuntimeHealthItem, "successCount" | "clientErrorCount" | "serverErrorCount">) {
    return Math.max(0, item.successCount) + Math.max(0, item.clientErrorCount) + Math.max(0, item.serverErrorCount);
}

export function buildAdminDebugRouteRuntimeRateSummary(
    items: readonly RouteRuntimeHealthItem[],
    nowMs = Date.now(),
) {
    const totals = items.reduce((accumulator, item) => {
        accumulator.totalSamples += toTotalSamples(item);
        accumulator.successCount += Math.max(0, item.successCount);
        accumulator.clientErrorCount += Math.max(0, item.clientErrorCount);
        accumulator.serverErrorCount += Math.max(0, item.serverErrorCount);
        accumulator.failCount += getRouteRuntimeHealthStatus(item, nowMs) === "fail" ? 1 : 0;
        accumulator.warnCount += getRouteRuntimeHealthStatus(item, nowMs) === "warn" ? 1 : 0;
        accumulator.staleCount += getRouteRuntimeHealthStatus(item, nowMs) === "stale" ? 1 : 0;
        accumulator.unseenCount += getRouteRuntimeHealthCoverageState(item) === "unseen" ? 1 : 0;
        return accumulator;
    }, {
        totalSamples: 0,
        successCount: 0,
        clientErrorCount: 0,
        serverErrorCount: 0,
        failCount: 0,
        warnCount: 0,
        staleCount: 0,
        unseenCount: 0,
    });

    const errorSamples = totals.clientErrorCount + totals.serverErrorCount;
    const errorRate = totals.totalSamples > 0 ? errorSamples / totals.totalSamples : 0;

    return {
        ...totals,
        errorSamples,
        errorRate,
        errorRateLabel: `${(errorRate * 100).toFixed(errorRate >= 0.1 ? 0 : 1)}%`,
    };
}
