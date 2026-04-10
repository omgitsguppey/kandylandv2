export const ROUTE_RUNTIME_HEALTH_TARGETS = {
    "admin/debug:GET": {
        routeName: "admin/debug",
        method: "GET",
        title: "Admin debug snapshot",
        slowThresholdMs: 1800,
    },
    "admin/debug/assistant:GET": {
        routeName: "admin/debug/assistant",
        method: "GET",
        title: "Admin debug assistant summary",
        slowThresholdMs: 5000,
    },
    "admin/debug/assistant:PUT": {
        routeName: "admin/debug/assistant",
        method: "PUT",
        title: "Admin debug assistant settings writes",
        slowThresholdMs: 1400,
    },
    "admin/debug/preferences:GET": {
        routeName: "admin/debug/preferences",
        method: "GET",
        title: "Admin debug preferences reads",
        slowThresholdMs: 1000,
    },
    "admin/debug/preferences:PUT": {
        routeName: "admin/debug/preferences",
        method: "PUT",
        title: "Admin debug preferences writes",
        slowThresholdMs: 1200,
    },
    "admin/overview:GET": {
        routeName: "admin/overview",
        method: "GET",
        title: "Admin overview snapshot",
        slowThresholdMs: 1800,
    },
    "admin/analytics/realtime:GET": {
        routeName: "admin/analytics/realtime",
        method: "GET",
        title: "Admin realtime analytics snapshot",
        slowThresholdMs: 4000,
    },
    "admin/ui-chart-health:GET": {
        routeName: "admin/ui-chart-health",
        method: "GET",
        title: "Admin UI chart health reads",
        slowThresholdMs: 1200,
    },
    "admin/ui-chart-health:PUT": {
        routeName: "admin/ui-chart-health",
        method: "PUT",
        title: "Admin UI chart health writes",
        slowThresholdMs: 1200,
    },
    "admin/support/threads:GET": {
        routeName: "admin/support/threads",
        method: "GET",
        title: "Admin support queue reads",
        slowThresholdMs: 1200,
    },
    "admin/support/thread:GET": {
        routeName: "admin/support/thread",
        method: "GET",
        title: "Admin support thread reads",
        slowThresholdMs: 1200,
    },
    "admin/support/thread:POST": {
        routeName: "admin/support/thread",
        method: "POST",
        title: "Admin support replies",
        slowThresholdMs: 1500,
    },
    "admin/support/thread:PATCH": {
        routeName: "admin/support/thread",
        method: "PATCH",
        title: "Admin support status updates",
        slowThresholdMs: 1400,
    },
    "admin/moderation/threads:GET": {
        routeName: "admin/moderation/threads",
        method: "GET",
        title: "Admin moderation thread list",
        slowThresholdMs: 1200,
    },
    "admin/moderation/thread:GET": {
        routeName: "admin/moderation/thread",
        method: "GET",
        title: "Admin moderation thread detail",
        slowThresholdMs: 1200,
    },
    "admin/moderation/security-alerts:GET": {
        routeName: "admin/moderation/security-alerts",
        method: "GET",
        title: "Admin moderation security alerts",
        slowThresholdMs: 1200,
    },
    "admin/analytics/preferences:GET": {
        routeName: "admin/analytics/preferences",
        method: "GET",
        title: "Admin analytics preferences reads",
        slowThresholdMs: 1000,
    },
    "admin/analytics/preferences:PUT": {
        routeName: "admin/analytics/preferences",
        method: "PUT",
        title: "Admin analytics preferences writes",
        slowThresholdMs: 1200,
    },
    "creator/discovery:GET": {
        routeName: "creator/discovery",
        method: "GET",
        title: "Creator discovery reads",
        slowThresholdMs: 900,
    },
    "notifications:GET": {
        routeName: "notifications",
        method: "GET",
        title: "Notification inbox reads",
        slowThresholdMs: 900,
    },
    "notifications:POST": {
        routeName: "notifications",
        method: "POST",
        title: "Notification dispatch writes",
        slowThresholdMs: 1400,
    },
    "notifications:PUT": {
        routeName: "notifications",
        method: "PUT",
        title: "Notification read-state writes",
        slowThresholdMs: 1200,
    },
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
    "chat/thread:DELETE": {
        routeName: "chat/thread",
        method: "DELETE",
        title: "Chat thread hides",
        slowThresholdMs: 1000,
    },
    "chat/messages:POST": {
        routeName: "chat/messages",
        method: "POST",
        title: "Chat message sends",
        slowThresholdMs: 1600,
    },
    "chat/attachments/prepare:POST": {
        routeName: "chat/attachments/prepare",
        method: "POST",
        title: "Chat attachment prepare",
        slowThresholdMs: 1200,
    },
    "chat/attachments/complete:POST": {
        routeName: "chat/attachments/complete",
        method: "POST",
        title: "Chat attachment finalize",
        slowThresholdMs: 1800,
    },
    "chat/read:POST": {
        routeName: "chat/read",
        method: "POST",
        title: "Chat read-state updates",
        slowThresholdMs: 800,
    },
    "creator/messages:GET": {
        routeName: "creator/messages",
        method: "GET",
        title: "Legacy creator-message reads",
        slowThresholdMs: 1000,
    },
    "creator/messages:POST": {
        routeName: "creator/messages",
        method: "POST",
        title: "Legacy creator-message sends",
        slowThresholdMs: 1600,
    },
    "creator/messages:DELETE": {
        routeName: "creator/messages",
        method: "DELETE",
        title: "Legacy creator-message moderation",
        slowThresholdMs: 1000,
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
    "user/activity:GET": {
        routeName: "user/activity",
        method: "GET",
        title: "User activity reads",
        slowThresholdMs: 900,
    },
    "checkin:POST": {
        routeName: "checkin",
        method: "POST",
        title: "Daily check-in claims",
        slowThresholdMs: 1400,
    },
    "drops/feed:GET": {
        routeName: "drops/feed",
        method: "GET",
        title: "Drops feed reads",
        slowThresholdMs: 900,
    },
    "drops/content:GET": {
        routeName: "drops/content",
        method: "GET",
        title: "Owned content proxy reads",
        slowThresholdMs: 1800,
    },
    "viewer/watch-session:POST": {
        routeName: "viewer/watch-session",
        method: "POST",
        title: "Viewer watch-session writes",
        slowThresholdMs: 1800,
    },
    "auth/manual-sign-in-lookup:POST": {
        routeName: "auth/manual-sign-in-lookup",
        method: "POST",
        title: "Manual sign-in lookup",
        slowThresholdMs: 1000,
    },
    "user/register:POST": {
        routeName: "user/register",
        method: "POST",
        title: "Manual account registration",
        slowThresholdMs: 1500,
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

export const ROUTE_RUNTIME_HEALTH_STALE_AFTER_MS = 1000 * 60 * 60 * 24;
export const ROUTE_RUNTIME_HEALTH_FAIL_ACTIVE_WINDOW_MS = 1000 * 60 * 60 * 4;

export type RouteRuntimeHealthKey = keyof typeof ROUTE_RUNTIME_HEALTH_TARGETS;
export type RouteRuntimeHealthMethod = typeof ROUTE_RUNTIME_HEALTH_TARGETS[RouteRuntimeHealthKey]["method"];
export type RouteRuntimeHealthLastResult = "success" | "client_error" | "server_error";
export type RouteRuntimeHealthStatus = "healthy" | "warn" | "fail" | "stale";
export type RouteRuntimeHealthCoverageState = "observed" | "unseen";
export type RouteRuntimeHealthFreshness = "fresh" | "stale" | "unseen";
export type RouteRuntimeHealthCluster = "native_chat" | "compatibility_chat" | "other";

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

export function getRouteRuntimeHealthCoverageState(item: Pick<RouteRuntimeHealthItem, "updatedAtMs">): RouteRuntimeHealthCoverageState {
    return toNumber(item.updatedAtMs) > 0 ? "observed" : "unseen";
}

export function getRouteRuntimeHealthFreshness(
    item: Pick<RouteRuntimeHealthItem, "updatedAtMs">,
    nowMs = Date.now(),
): RouteRuntimeHealthFreshness {
    if (getRouteRuntimeHealthCoverageState(item) === "unseen") {
        return "unseen";
    }

    return Math.max(0, nowMs - toNumber(item.updatedAtMs)) >= ROUTE_RUNTIME_HEALTH_STALE_AFTER_MS
        ? "stale"
        : "fresh";
}

export function getRouteRuntimeHealthCluster(key: RouteRuntimeHealthKey | string): RouteRuntimeHealthCluster {
    if (key.startsWith("chat/")) {
        return "native_chat";
    }

    if (key.startsWith("creator/messages:")) {
        return "compatibility_chat";
    }

    return "other";
}

export function getRouteRuntimeHealthStatus(
    item: Pick<RouteRuntimeHealthItem, "updatedAtMs" | "lastResult" | "clientErrorCount" | "serverErrorCount" | "slowCount" | "lastServerErrorAtMs">,
    nowMs = Date.now(),
): RouteRuntimeHealthStatus {
    const freshness = getRouteRuntimeHealthFreshness(item, nowMs);
    if (freshness === "unseen") {
        return "warn";
    }

    if (freshness === "stale") {
        return "stale";
    }

    if (
        item.lastResult === "server_error"
        && Math.max(0, nowMs - toNumber(item.lastServerErrorAtMs || item.updatedAtMs)) <= ROUTE_RUNTIME_HEALTH_FAIL_ACTIVE_WINDOW_MS
    ) {
        return "fail";
    }

    if (item.clientErrorCount > 0 || item.serverErrorCount > 0 || item.slowCount > 0) {
        return "warn";
    }

    return "healthy";
}

export function summarizeRouteRuntimeHealth(items: readonly RouteRuntimeHealthItem[], nowMs = Date.now()) {
    return {
        total: items.length,
        healthy: items.filter((item) => getRouteRuntimeHealthStatus(item, nowMs) === "healthy").length,
        warn: items.filter((item) => getRouteRuntimeHealthStatus(item, nowMs) === "warn").length,
        fail: items.filter((item) => getRouteRuntimeHealthStatus(item, nowMs) === "fail").length,
        stale: items.filter((item) => getRouteRuntimeHealthStatus(item, nowMs) === "stale").length,
        unobserved: items.filter((item) => getRouteRuntimeHealthCoverageState(item) === "unseen").length,
        slow: items.reduce((sum, item) => sum + toNumber(item.slowCount), 0),
        serverErrors: items.reduce((sum, item) => sum + toNumber(item.serverErrorCount), 0),
        clientErrors: items.reduce((sum, item) => sum + toNumber(item.clientErrorCount), 0),
    };
}
