import type { Drop, Transaction } from "@/types/db";
import type { AdminRealtimeCostRisk, AdminRealtimeMetricScope } from "@/lib/admin/admin-realtime-policy";
import type { AdminModuleVerification } from "@/lib/admin-parity";
import type { AdminUserMetricsSnapshot } from "@/lib/admin-user-metrics-contract";
import type { AdminUserTruthSnapshot } from "@/lib/admin-user-truth-contract";
import { calculatePlatformPulseDelta, formatPlatformPulseDelta } from "@/lib/admin/platform-pulse-window";
import type { TransactionSourceClass, TransactionSourceConfidence } from "@/lib/commerce/transaction-source-of-funds-contract";

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
    id:
        | "accounts"
        | "purchases30d"
        | "revenue"
        | "unwraps"
        | "drops"
        | "gumdropsCirculation30d"
        | "supportBugs30d";
    label: string;
    primaryValue: string | number;
    primaryScope: "rolling_30d";
    current30dValue: number;
    prior30dValue: number;
    deltaPct: number | null;
    deltaLabel: string;
    sourceTruth: "server_transaction" | "user_doc" | "entitlement_rollup" | "materialized_summary" | "bounded_aggregate" | "telemetry" | "legacy" | "mixed" | "unknown";
    freshnessState: "live" | "review" | "stale" | "unknown" | "blocked" | "unavailable";
    issueState?: "ok" | "review" | "stale" | "error" | "blocked" | "unavailable";
    warnings: string[];
    metadata?: {
        rewardGd30d?: number;
        paidGd30d?: number;
        paidBonusGd30d?: number;
        totalCirculationGd30d?: number;
        priorRewardGd30d?: number;
        priorPaidGd30d?: number;
        priorPaidBonusGd30d?: number;
        priorTotalCirculationGd30d?: number;
        displayCombinesPaidAndRewardOnly?: boolean;
        userBugReports30d?: number;
        userSupportRequests30d?: number;
        priorUserBugReports30d?: number;
        priorUserSupportRequests30d?: number;
        excludesAiDebugCodeInternalDiagnostics?: boolean;
        sourceMode?: "materialized_summary" | "bounded_aggregate" | "summary_missing";
    };
};

export type AdminOverviewIssueDetail = {
    source:
        | "users"
        | "commerce"
        | "drops"
        | "revenue"
        | "unwraps"
        | "gumdrops"
        | "support_bugs"
        | "transactions"
        | "analytics_cache"
        | "admin_activity"
        | "unknown";
    summary: string;
    sourceTruth: "server_transaction" | "user_doc" | "entitlement_rollup" | "materialized_summary" | "bounded_aggregate" | "telemetry" | "legacy" | "mixed" | "unknown";
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
    sourceOfFunds?: "reward" | "paid" | "paid_bonus" | "admin_adjustment" | "unknown" | TransactionSourceClass;
    sourceLabel?: string;
    sourceConfidence?: TransactionSourceConfidence;
    userIdRedacted?: string;
    fullUidDefaultVisible?: false;
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
        gumdropsCirculation30d?: AdminOverviewMetricDelta;
        supportBugs30d?: AdminOverviewMetricDelta;
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
    metricScope: AdminRealtimeMetricScope;
    purpose: "operational_pulse_only";
    owner: string;
    costRisk: AdminRealtimeCostRisk;
    businessTruthSource: "refresh_based_hot_cache";
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

type PlatformPulseWindowValues = {
    current: number;
    prior: number;
};

type PlatformPulseWarnings = Record<PlatformPulseMetric["id"], string[]>;

type GumdropPlatformPulseWindow = {
    rewardGd30d: number;
    paidGd30d: number;
    paidBonusGd30d: number;
};

type SupportBugPlatformPulseWindow = {
    userBugReports30d: number;
    userSupportRequests30d: number;
};

export type BuildAdminOverviewPlatformPulseInput = {
    freshnessState: PlatformPulseMetric["freshnessState"];
    warnings?: Partial<PlatformPulseWarnings>;
    accounts: PlatformPulseWindowValues;
    purchases: PlatformPulseWindowValues;
    revenueCents: PlatformPulseWindowValues;
    unwraps: PlatformPulseWindowValues;
    gumdrops: {
        current: GumdropPlatformPulseWindow;
        prior: GumdropPlatformPulseWindow;
        sourceMode?: "materialized_summary" | "bounded_aggregate" | "summary_missing";
    };
    supportBugs: {
        current: SupportBugPlatformPulseWindow;
        prior: SupportBugPlatformPulseWindow;
        sourceMode?: "materialized_summary" | "bounded_aggregate" | "summary_missing";
    };
};

function formatPlatformPulseUsd(cents: number) {
    return `$${(Math.max(0, cents) / 100).toFixed(2)}`;
}

function totalGumdrops(input: GumdropPlatformPulseWindow) {
    return Math.max(0, input.rewardGd30d) + Math.max(0, input.paidGd30d) + Math.max(0, input.paidBonusGd30d);
}

function totalSupportBugs(input: SupportBugPlatformPulseWindow) {
    return Math.max(0, input.userBugReports30d) + Math.max(0, input.userSupportRequests30d);
}

function buildPulseMetric(input: {
    id: PlatformPulseMetric["id"];
    label: string;
    primaryValue: string | number;
    current: number;
    prior: number;
    sourceTruth: PlatformPulseMetric["sourceTruth"];
    freshnessState: PlatformPulseMetric["freshnessState"];
    warnings?: string[];
    metadata?: PlatformPulseMetric["metadata"];
}): PlatformPulseMetric {
    const delta = calculatePlatformPulseDelta(input.current, input.prior);
    const formattedDelta = formatPlatformPulseDelta(delta);
    const warnings = input.warnings ?? [];
    const issueState: PlatformPulseMetric["issueState"] = warnings.length > 0
        ? "review"
        : input.freshnessState === "stale"
            ? "stale"
            : input.freshnessState === "blocked"
                ? "blocked"
                : input.freshnessState === "unavailable" || input.freshnessState === "unknown"
                    ? "unavailable"
                    : input.freshnessState === "review"
                        ? "review"
                        : "ok";

    return {
        id: input.id,
        label: input.label,
        primaryValue: input.primaryValue,
        primaryScope: "rolling_30d",
        current30dValue: input.current,
        prior30dValue: input.prior,
        deltaPct: delta.percentChange,
        deltaLabel: formattedDelta.ariaLabel,
        sourceTruth: input.sourceTruth,
        freshnessState: input.freshnessState,
        issueState,
        warnings,
        ...(input.metadata ? { metadata: input.metadata } : {}),
    };
}

export function buildAdminOverviewPlatformPulse(input: BuildAdminOverviewPlatformPulseInput): PlatformPulseMetric[] {
    const gumdropCurrentTotal = totalGumdrops(input.gumdrops.current);
    const gumdropPriorTotal = totalGumdrops(input.gumdrops.prior);
    const supportBugsCurrentTotal = totalSupportBugs(input.supportBugs.current);
    const supportBugsPriorTotal = totalSupportBugs(input.supportBugs.prior);
    const warnings = input.warnings ?? {};

    return [
        buildPulseMetric({
            id: "accounts",
            label: "Users",
            primaryValue: input.accounts.current,
            current: input.accounts.current,
            prior: input.accounts.prior,
            sourceTruth: "user_doc",
            freshnessState: input.freshnessState,
            warnings: warnings.accounts,
        }),
        buildPulseMetric({
            id: "purchases30d",
            label: "Purchases",
            primaryValue: input.purchases.current,
            current: input.purchases.current,
            prior: input.purchases.prior,
            sourceTruth: "server_transaction",
            freshnessState: input.freshnessState,
            warnings: warnings.purchases30d,
        }),
        buildPulseMetric({
            id: "revenue",
            label: "Revenue",
            primaryValue: formatPlatformPulseUsd(input.revenueCents.current),
            current: input.revenueCents.current,
            prior: input.revenueCents.prior,
            sourceTruth: "server_transaction",
            freshnessState: input.freshnessState,
            warnings: warnings.revenue,
        }),
        buildPulseMetric({
            id: "unwraps",
            label: "Unwraps",
            primaryValue: input.unwraps.current,
            current: input.unwraps.current,
            prior: input.unwraps.prior,
            sourceTruth: "entitlement_rollup",
            freshnessState: input.freshnessState,
            warnings: warnings.unwraps,
        }),
        buildPulseMetric({
            id: "gumdropsCirculation30d",
            label: "GumDrops",
            primaryValue: gumdropCurrentTotal,
            current: gumdropCurrentTotal,
            prior: gumdropPriorTotal,
            sourceTruth: input.gumdrops.sourceMode === "bounded_aggregate" ? "bounded_aggregate" : "materialized_summary",
            freshnessState: input.gumdrops.sourceMode === "summary_missing" ? "review" : input.freshnessState,
            warnings: warnings.gumdropsCirculation30d,
            metadata: {
                ...input.gumdrops.current,
                totalCirculationGd30d: gumdropCurrentTotal,
                priorRewardGd30d: input.gumdrops.prior.rewardGd30d,
                priorPaidGd30d: input.gumdrops.prior.paidGd30d,
                priorPaidBonusGd30d: input.gumdrops.prior.paidBonusGd30d,
                priorTotalCirculationGd30d: gumdropPriorTotal,
                displayCombinesPaidAndRewardOnly: true,
                sourceMode: input.gumdrops.sourceMode ?? "materialized_summary",
            },
        }),
        buildPulseMetric({
            id: "supportBugs30d",
            label: "Support/Bugs",
            primaryValue: supportBugsCurrentTotal,
            current: supportBugsCurrentTotal,
            prior: supportBugsPriorTotal,
            sourceTruth: input.supportBugs.sourceMode === "materialized_summary" ? "materialized_summary" : "bounded_aggregate",
            freshnessState: input.supportBugs.sourceMode === "summary_missing" ? "review" : input.freshnessState,
            warnings: warnings.supportBugs30d,
            metadata: {
                ...input.supportBugs.current,
                priorUserBugReports30d: input.supportBugs.prior.userBugReports30d,
                priorUserSupportRequests30d: input.supportBugs.prior.userSupportRequests30d,
                excludesAiDebugCodeInternalDiagnostics: true,
                sourceMode: input.supportBugs.sourceMode ?? "bounded_aggregate",
            },
        }),
    ];
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
