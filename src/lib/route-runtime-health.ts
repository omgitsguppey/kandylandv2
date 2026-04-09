export const ROUTE_RUNTIME_HEALTH_TARGETS = {
    "chat/threads:GET": {
        routeName: "chat/threads",
        method: "GET",
        title: "Chat thread list reads",
        slowThresholdMs: 900,
    },
    "chat/thread:GET": {
        routeName: "chat/thread",
        method: "GET",
        title: "Chat thread detail reads",
        slowThresholdMs: 1000,
    },
    "chat/messages:POST": {
        routeName: "chat/messages",
        method: "POST",
        title: "Chat message sends",
        slowThresholdMs: 1600,
    },
    "chat/read:POST": {
        routeName: "chat/read",
        method: "POST",
        title: "Chat read-state updates",
        slowThresholdMs: 800,
    },
    "creator/relationships:GET": {
        routeName: "creator/relationships",
        method: "GET",
        title: "Creator relationships reads",
        slowThresholdMs: 800,
    },
    "creator/relationships:POST": {
        routeName: "creator/relationships",
        method: "POST",
        title: "Creator relationships writes",
        slowThresholdMs: 1000,
    },
    "support/threads:GET": {
        routeName: "support/threads",
        method: "GET",
        title: "Support inbox reads",
        slowThresholdMs: 900,
    },
    "support/threads:POST": {
        routeName: "support/threads",
        method: "POST",
        title: "Support ticket creation",
        slowThresholdMs: 1200,
    },
    "admin/ai/drop-covers/generate:POST": {
        routeName: "admin/ai/drop-covers/generate",
        method: "POST",
        title: "AI cover generation",
        slowThresholdMs: 12_000,
    },
} as const;

export type RouteRuntimeHealthKey = keyof typeof ROUTE_RUNTIME_HEALTH_TARGETS;
export type RouteRuntimeHealthMethod = typeof ROUTE_RUNTIME_HEALTH_TARGETS[RouteRuntimeHealthKey]["method"];
export type RouteRuntimeHealthLastResult = "success" | "client_error" | "server_error";
export type RouteRuntimeHealthStatus = "healthy" | "warn" | "fail";

export type RouteRuntimeHealthItem = {
    key: RouteRuntimeHealthKey;
    routeName: string;
    method: RouteRuntimeHealthMethod;
    title: string;
    slowThresholdMs: number;
    successCount: number;
    clientErrorCount: number;
    serverErrorCount: number;
    slowCount: number;
    averageLatencyMs: number;
    maxLatencyMs: number;
    lastLatencyMs: number;
    lastResult: RouteRuntimeHealthLastResult;
    lastStatusCode: number;
    lastErrorMessage: string | null;
    firstObservedAtMs: number;
    updatedAtMs: number;
    lastSuccessAtMs: number;
    lastClientErrorAtMs: number;
    lastServerErrorAtMs: number;
};

function toNumber(value: unknown) {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function getRouteRuntimeHealthStatus(item: Pick<RouteRuntimeHealthItem, "lastResult" | "clientErrorCount" | "serverErrorCount" | "slowCount">): RouteRuntimeHealthStatus {
    if (item.lastResult === "server_error") {
        return "fail";
    }

    if (item.clientErrorCount > 0 || item.serverErrorCount > 0 || item.slowCount > 0) {
        return "warn";
    }

    return "healthy";
}

export function summarizeRouteRuntimeHealth(items: readonly RouteRuntimeHealthItem[]) {
    return {
        total: items.length,
        healthy: items.filter((item) => getRouteRuntimeHealthStatus(item) === "healthy").length,
        warn: items.filter((item) => getRouteRuntimeHealthStatus(item) === "warn").length,
        fail: items.filter((item) => getRouteRuntimeHealthStatus(item) === "fail").length,
        slow: items.reduce((sum, item) => sum + toNumber(item.slowCount), 0),
        serverErrors: items.reduce((sum, item) => sum + toNumber(item.serverErrorCount), 0),
        clientErrors: items.reduce((sum, item) => sum + toNumber(item.clientErrorCount), 0),
    };
}
