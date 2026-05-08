import type { Drop, Transaction } from "@/types/db";
import type { AdminModuleVerification } from "@/lib/admin-parity";
import type { AdminUserMetricsSnapshot } from "@/lib/admin-user-metrics-contract";
import type { AdminUserTruthSnapshot } from "@/lib/admin-user-truth-contract";

export type AdminOverviewDeltaDirection = "up" | "down" | "flat";

export type AdminOverviewMetricDelta = {
    current: number;
    previous: number;
    percentChange: number | null;
    direction: AdminOverviewDeltaDirection;
    scopeLabel: string;
};

export type RollingWindow = {
    nowUtc: string;
    currentStartUtc: string;
    currentEndUtc: string;
    priorStartUtc: string;
    priorEndUtc: string;
    label: "rolling_30d";
};

export type PlatformPulseMetric = {
    id: "accounts" | "purchases30d" | "revenue" | "unwraps" | "drops";
    label: string;
    primaryValue: string | number;
    primaryScope: "lifetime" | "rolling_30d";
    current30dValue?: number;
    prior30dValue?: number;
    lifetimeValue?: number;
    lifetimeLabel?: string;
    deltaPct?: number | null;
    deltaLabel: string;
    subtext: string;
    sourceTruth: "server_transaction" | "user_doc" | "entitlement_rollup" | "materialized_snapshot" | "telemetry" | "legacy" | "mixed";
    freshnessState: "live" | "review" | "stale" | "unknown";
    confidence: number | null;
    warnings: string[];
};

export type AdminOverviewIssueDetail = {
    source:
        | "users"
        | "commerce"
        | "drops"
        | "revenue"
        | "unwraps"
        | "transactions"
        | "analytics_cache"
        | "admin_activity"
        | "unknown";
    summary: string;
    sourceTruth: "server_transaction" | "user_doc" | "entitlement_rollup" | "materialized_snapshot" | "telemetry" | "legacy" | "mixed" | "unknown";
    freshnessState: "live" | "review" | "stale" | "unknown";
};

export type AdminOverviewDayPoint = {
    key: string;
    date: string;
    revenue: number;
    unwraps: number;
    purchases: number;
};

export type AdminOverviewDayInsight = {
    key: string;
    label: string;
    value: number;
};

export type AdminOverviewWindowSummary = {
    windowDays: number;
    currentStartDayKey: string;
    currentEndDayKey: string;
    previousStartDayKey: string;
    previousEndDayKey: string;
    currentRevenueCents: number;
    previousRevenueCents: number;
    currentUnwraps: number;
    previousUnwraps: number;
    currentPurchases: number;
    previousPurchases: number;
    currentNewUsers: number;
    previousNewUsers: number;
    revenueActiveDays: number;
    unwrapActiveDays: number;
    bestRevenueDay: AdminOverviewDayInsight | null;
    bestUnwrapDay: AdminOverviewDayInsight | null;
    topUnlockDrop: {
        dropId: string;
        title: string;
        unwraps: number;
    } | null;
};

export type AdminOverviewStats = {
    totalUsers: number;
    liveDrops: number;
    totalDrops: number;
    grossRevenueCents: number;
    totalUnwraps: number;
    currentWindowPurchases: number;
    currentWindowNewUsers: number;
    userMetricsSnapshot?: AdminUserMetricsSnapshot;
};

export type AdminOverviewTransactionRecord = Transaction & {
    username?: string;
    timestamp: number;
    sourceScope: "overview_snapshot" | "realtime_firestore";
};

export type RecentTransactionAdminRow = AdminOverviewTransactionRecord & {
    transactionId: string;
    createdAtUtc: string;
    typeLabel: string;
    amountDisplay: string;
    unit: "GD" | "USD" | "unknown";
    direction: "credit" | "debit" | "neutral";
    userDisplayName: string;
    shortUserId: string;
    userIdentityState: "resolved" | "fallback_uid" | "missing";
    adminUserHref: string;
    sourceOfFunds?: "reward" | "paid" | "paid_bonus" | "admin_adjustment" | "unknown";
    continuityLabel?: string;
};

export type AdminOverviewActivityItem = {
    id: string;
    domain: "admin";
    source: "transactions" | "analytics_event_facts";
    type: string;
    label: string;
    detail: string;
    actorLabel: string;
    /** Target user display label (e.g. "@username" or truncated userId). */
    targetLabel?: string;
    /** Target user ID affected by the admin action. */
    targetUserId?: string;
    username?: string;
    userId?: string;
    timestamp: number;
    path?: string;
};

export type AdminOverviewTruthNotes = {
    overview: string;
    platformPulse: string;
    drops: string;
    revenue: string;
    topDrops: string;
    transactions: string;
    adminActivity: string;
};

export interface AdminOverviewResponse {
    success: boolean;
    issues?: string[];
    overviewIssues?: AdminOverviewIssueDetail[];
    generatedAt: number;
    rollingWindow?: RollingWindow;
    freshness: {
        lastTransactionAt: number;
        lastAdminActivityAt: number;
    };
    stats: AdminOverviewStats;
    deltas: {
        accounts: AdminOverviewMetricDelta;
        purchases: AdminOverviewMetricDelta;
        revenue: AdminOverviewMetricDelta;
        unwraps: AdminOverviewMetricDelta;
    };
    recentTransactions: AdminOverviewTransactionRecord[];
    adminActivity: AdminOverviewActivityItem[];
    topDrops: Drop[];
    chartData: AdminOverviewDayPoint[];
    trendSummary: AdminOverviewWindowSummary;
    platformPulse?: PlatformPulseMetric[];
    truthSnapshot?: AdminUserTruthSnapshot;
    truthNotes: AdminOverviewTruthNotes;
    verification?: AdminModuleVerification;
    /** Debug metadata surfaced from the realtime layer for admin debug panel visibility.
     *  Only populated on the client when Firestore snapshot listeners are active. */
    realtimeDebugMeta?: AdminOverviewRealtimeDebugMeta;
}

/** Per-listener metadata for admin debug panel truth visibility. */
export type AdminOverviewRealtimeDebugMeta = {
    dropsFromCache: boolean;
    summaryFromCache: boolean;
    transactionsFromCache: boolean;
    adminActivityFromCache: boolean;
    lastServerConfirmedAt: number;
    lastClientSnapshotAt: number;
    pollingActive: boolean;
    pollingIntervalMs: number;
    legacyDataMapped: boolean;
};

export function calculateOverviewMetricDelta(
    current: number,
    previous: number,
    scopeLabel = "vs prior 30d",
): AdminOverviewMetricDelta {
    if (current === previous) {
        return {
            current,
            previous,
            percentChange: 0,
            direction: "flat",
            scopeLabel,
        };
    }

    if (previous === 0) {
        return {
            current,
            previous,
            percentChange: null,
            direction: current > 0 ? "up" : "down",
            scopeLabel,
        };
    }

    const percentChange = Number((((current - previous) / previous) * 100).toFixed(1));

    return {
        current,
        previous,
        percentChange,
        direction: percentChange > 0 ? "up" : "down",
        scopeLabel,
    };
}

export function buildRolling30dWindow(nowMs = Date.now()): RollingWindow {
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const currentEndMs = nowMs;
    const currentStartMs = currentEndMs - THIRTY_DAYS_MS;
    const priorEndMs = currentStartMs;
    const priorStartMs = priorEndMs - THIRTY_DAYS_MS;

    return {
        nowUtc: new Date(currentEndMs).toISOString(),
        currentStartUtc: new Date(currentStartMs).toISOString(),
        currentEndUtc: new Date(currentEndMs).toISOString(),
        priorStartUtc: new Date(priorStartMs).toISOString(),
        priorEndUtc: new Date(priorEndMs).toISOString(),
        label: "rolling_30d",
    };
}

export function paginateOverviewItems<T>(
    items: readonly T[],
    requestedPage: number,
    pageSize: number,
) {
    const safePageSize = Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : 1;
    const totalPages = Math.max(1, Math.ceil(items.length / safePageSize));
    const page = Math.min(Math.max(0, Math.floor(requestedPage || 0)), totalPages - 1);
    const startIndex = page * safePageSize;
    const endIndex = Math.min(items.length, startIndex + safePageSize);

    return {
        items: items.slice(startIndex, endIndex),
        page,
        totalPages,
        startIndex,
        endIndex,
    };
}
