export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";

import type { AdminOverviewActivityItem, AdminOverviewDayPoint, AdminOverviewIssueDetail, PlatformPulseMetric, RecentTransactionAdminRow } from "@/lib/admin-overview";
import { buildRolling30dWindow, calculateOverviewMetricDelta } from "@/lib/admin-overview";
import type { AdminUserTruthSnapshot } from "@/lib/admin-user-truth-contract";
import { isDropHiddenFromPublic, normalizeAndApplyDropStatusOrNull } from "@/lib/drop-read-models";
import { TELEMETRY_EVENT_LABELS, TELEMETRY_MODULE_INDEXES } from "@/lib/telemetry-catalog";
import { APP_TIMEZONE, fromCSTInput, getCSTDateKey, shiftCSTDateKey } from "@/lib/timezone";
import { getTransactionBadgeLabel, getTransactionDisplayLabel, normalizeTransactionRecord } from "@/lib/transaction-normalizers";
import { handleApiError } from "@/lib/server/auth";
import { fetchTelemetryLogs } from "@/lib/server/admin-analytics-shared";
import {
    buildAdminOverviewFallbackIdentity,
    buildAdminOverviewUserIdentityMap,
    type AdminOverviewUserIdentity,
} from "@/lib/server/admin-overview-users";
import { readAdminUserTruthSnapshot } from "@/lib/server/admin-user-truth-snapshot";
import { buildServerAdminModuleVerification } from "@/lib/server/admin-source-verification";
import {
    safeDocumentWithDiagnostics,
    safeQueryWithDiagnostics,
} from "@/lib/server/diagnostic-read-fallbacks";
import { adminDb } from "@/lib/server/firebase-admin";
import { ADMIN, HEAVY_READ } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { getErrorMessage } from "@/lib/server/route-diagnostics";
import { recordRouteRuntimeSample, withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";

const OVERVIEW_WINDOW_DAYS = 30;
const RECENT_TRANSACTION_LIMIT = 20;
const ADMIN_ACTIVITY_LIMIT = 20;
const ADMIN_OVERVIEW_USER_LIMIT = 5_000;
const ADMIN_OVERVIEW_DROP_LIMIT = 5_000;
const ADMIN_OVERVIEW_ROLLING_TRANSACTION_LIMIT = 5_000;
const ADMIN_OVERVIEW_DAILY_ROLLUP_LIMIT = 90;
const CHART_LABEL_FORMATTER = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    month: "short",
    day: "2-digit",
});
const ADMIN_ACTIVITY_TELEMETRY_EVENT_NAMES = (
    TELEMETRY_MODULE_INDEXES.find((moduleIndex) => moduleIndex.key === "admin")?.eventNames ?? []
).filter((eventName) => eventName.startsWith("admin_") || eventName.startsWith("creator_") || eventName.startsWith("owner_"));

function toTimestampNumber(value: unknown): number {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    if (
        value
        && typeof value === "object"
        && "toMillis" in value
        && typeof (value as { toMillis: () => number }).toMillis === "function"
    ) {
        return (value as { toMillis: () => number }).toMillis();
    }

    return 0;
}

function readMetric(raw: Record<string, unknown>, ...keys: string[]) {
    for (const key of keys) {
        const value = raw[key];
        if (typeof value === "number" && Number.isFinite(value)) {
            return value;
        }
    }

    return 0;
}

function formatChartDayLabel(dayKey: string) {
    const labelTimestamp = fromCSTInput(`${dayKey}T12:00`);
    if (Number.isFinite(labelTimestamp)) {
        return CHART_LABEL_FORMATTER.format(new Date(labelTimestamp));
    }

    return dayKey;
}

function formatUsdFromCents(cents: number) {
    return `$${(Math.max(0, cents) / 100).toFixed(2)}`;
}

function resolveDeltaLabel(current: number, previous: number, noun: string) {
    if (previous === 0) {
        return current > 0 ? `New activity: ${current.toLocaleString()} ${noun}` : `No ${noun} in either 30d window`;
    }

    return `${current.toLocaleString()} vs ${previous.toLocaleString()} ${noun} in prior 30d`;
}

function summarizeOverviewIssueSource(label: string): AdminOverviewIssueDetail["source"] {
    const normalized = label.toLowerCase();
    if (normalized.includes("user")) return "users";
    if (normalized.includes("commerce summary") || normalized.includes("commerce daily")) return "commerce";
    if (normalized.includes("drop daily")) return "unwraps";
    if (normalized.includes("drop")) return "drops";
    if (normalized.includes("transaction")) return "transactions";
    if (normalized.includes("admin activity") || normalized.includes("admin adjustment")) return "admin_activity";
    return "unknown";
}

function buildIssueDetail(input: {
    source: AdminOverviewIssueDetail["source"];
    summary: string;
    sourceTruth: AdminOverviewIssueDetail["sourceTruth"];
    freshnessState: AdminOverviewIssueDetail["freshnessState"];
}) {
  return input;
}

function buildPlatformPulseFromTruthSnapshot(snapshot: AdminUserTruthSnapshot): PlatformPulseMetric[] {
    const confidence = snapshot.confidenceScore;
    const freshnessState: PlatformPulseMetric["freshnessState"] = snapshot.sourceFreshness === "live"
        ? "live"
        : snapshot.sourceFreshness === "refreshing"
            ? "live"
            : snapshot.sourceFreshness === "stale" || snapshot.sourceFreshness === "legacy_fallback"
                ? "stale"
                : snapshot.sourceFreshness === "degraded" || snapshot.sourceFreshness === "delayed" || snapshot.sourceFreshness === "privacy_limited" || snapshot.sourceFreshness === "review"
                    ? "review"
                    : "unknown";
    const warnings = snapshot.issues.map((issue) => issue.message);

    return [
        {
            id: "accounts",
            label: "Users",
            primaryValue: snapshot.totalUsers,
            primaryScope: "lifetime",
            current30dValue: snapshot.activeUsers,
            lifetimeValue: snapshot.totalUsers,
            lifetimeLabel: `${snapshot.activeUsers.toLocaleString()} active accounts`,
            deltaPct: null,
            deltaLabel: `${snapshot.returnedLast7Days.toLocaleString()} returned in last 7d`,
            subtext: `${snapshot.verifiedUsers.toLocaleString()} verified · ${snapshot.onboardedUsers.toLocaleString()} onboarded`,
            sourceTruth: "materialized_snapshot",
            freshnessState,
            confidence,
            warnings,
        },
        {
            id: "purchases30d",
            label: "Purchases",
            primaryValue: snapshot.verifiedPurchases,
            primaryScope: "lifetime",
            current30dValue: snapshot.returnedLast7Days,
            lifetimeValue: snapshot.verifiedPurchases,
            lifetimeLabel: `${snapshot.pushEnabledUsers.toLocaleString()} push enabled`,
            deltaPct: null,
            deltaLabel: `${snapshot.trackedUnwraps.toLocaleString()} verified unwraps`,
            subtext: "Server purchase and entitlement truth only.",
            sourceTruth: "materialized_snapshot",
            freshnessState,
            confidence,
            warnings,
        },
        {
            id: "revenue",
            label: "Revenue",
            primaryValue: `$${snapshot.totalRevenueUsd.toFixed(2)}`,
            primaryScope: "lifetime",
            lifetimeValue: Math.round(snapshot.totalRevenueUsd * 100),
            lifetimeLabel: `${Math.round(snapshot.validWatchTimeMs / 60_000).toLocaleString()} verified watch minutes`,
            deltaPct: null,
            deltaLabel: `${snapshot.verifiedPurchases.toLocaleString()} verified purchases`,
            subtext: "Server transaction truth only.",
            sourceTruth: "materialized_snapshot",
            freshnessState,
            confidence,
            warnings,
        },
        {
            id: "unwraps",
            label: "Unwraps",
            primaryValue: snapshot.trackedUnwraps,
            primaryScope: "lifetime",
            current30dValue: snapshot.returnedLast7Days,
            lifetimeValue: snapshot.trackedUnwraps,
            lifetimeLabel: `${Math.round(snapshot.validWatchTimeMs / 3_600_000 * 10) / 10} verified watch hours`,
            deltaPct: null,
            deltaLabel: `${snapshot.activeUsers.toLocaleString()} active users`,
            subtext: "Unlock truth and watch truth stay separate.",
            sourceTruth: "materialized_snapshot",
            freshnessState,
            confidence,
            warnings,
        },
    ];
}

function buildWindowChart(endDayKey: string) {
    const days: AdminOverviewDayPoint[] = [];

    for (let index = OVERVIEW_WINDOW_DAYS - 1; index >= 0; index -= 1) {
        const dayKey = shiftCSTDateKey(endDayKey, -index);
        days.push({
            key: dayKey,
            date: formatChartDayLabel(dayKey),
            revenue: 0,
            unwraps: 0,
            purchases: 0,
        });
    }

    return days;
}

function getRecentTransactionDirection(raw: ReturnType<typeof normalizeTransactionRecord>): RecentTransactionAdminRow["direction"] {
    if (raw.amount === 0) {
        return "neutral";
    }
    if (
        raw.type === "unlock_content"
        || raw.type.startsWith("creator_")
        || raw.amount < 0
    ) {
        return "debit";
    }
    return "credit";
}

function getRecentTransactionSourceOfFunds(raw: ReturnType<typeof normalizeTransactionRecord>): RecentTransactionAdminRow["sourceOfFunds"] {
    if (raw.type === "admin_adjustment") return "admin_adjustment";
    if (raw.type === "purchase_currency") return raw.bonusGumDrops && raw.bonusGumDrops > 0 ? "paid_bonus" : "paid";
    if (raw.type === "daily_reward" || raw.type === "referral_bonus" || raw.type === "onboarding_reward") return "reward";
    if (raw.ledgerSource === "purchased") return "paid";
    if (raw.ledgerSource === "reward") return "reward";
    return "unknown";
}

function formatRecentTransactionAmount(raw: ReturnType<typeof normalizeTransactionRecord>) {
    const direction = getRecentTransactionDirection(raw);
    const prefix = direction === "credit" ? "+" : direction === "debit" ? "-" : "";
    const absoluteAmount = Math.abs(raw.amount);
    return `${prefix}${absoluteAmount} GD`;
}

function getRecentTransactionTypeLabel(raw: ReturnType<typeof normalizeTransactionRecord>) {
    const badge = getTransactionBadgeLabel(raw);
    if (raw.type === "daily_reward" && raw.rewardSource === "check_in") return "Reward / Check-in";
    if (raw.type === "daily_reward" && raw.rewardSource === "task") return "Reward / Task";
    if (raw.type === "onboarding_reward") return "Reward / Onboarding";
    if (raw.type === "referral_bonus") return "Reward / Referral";
    return badge;
}

function serializeRecentTransaction(
    raw: ReturnType<typeof normalizeTransactionRecord>,
    identity?: AdminOverviewUserIdentity,
): RecentTransactionAdminRow {
    const timestamp = typeof raw.timestamp === "number" ? raw.timestamp : toTimestampNumber(raw.timestamp);
    const resolvedIdentity = identity ?? buildAdminOverviewFallbackIdentity(raw.userId);

    return {
        ...raw,
        transactionId: raw.id,
        timestamp,
        createdAtUtc: timestamp > 0 ? new Date(timestamp).toISOString() : "",
        typeLabel: getRecentTransactionTypeLabel(raw),
        amountDisplay: formatRecentTransactionAmount(raw),
        unit: "GD",
        direction: getRecentTransactionDirection(raw),
        username: resolvedIdentity.username,
        userDisplayName: resolvedIdentity.userDisplayName,
        shortUserId: resolvedIdentity.shortUserId,
        userIdentityState: resolvedIdentity.userIdentityState,
        adminUserHref: `/admin/user/${encodeURIComponent(raw.userId)}`,
        sourceOfFunds: getRecentTransactionSourceOfFunds(raw),
        sourceScope: "overview_snapshot" as const,
    };
}

function addRecentTransactionContinuityLabels(rows: RecentTransactionAdminRow[]) {
    return rows.map((row, index) => {
        const next = rows[index + 1];
        if (!next || next.userId !== row.userId || Math.abs(row.timestamp - next.timestamp) > 60_000) {
            return row;
        }

        return {
            ...row,
            continuityLabel: `Same user sequence: ${row.typeLabel} -> ${next.typeLabel}`,
        };
    });
}

function buildActorLabel(input: {
    username?: string;
    userId?: string;
}) {
    if (input.username && input.username.trim().length > 0) {
        return `@${input.username.trim()}`;
    }

    if (input.userId && input.userId.trim().length > 0) {
        return input.userId.trim().slice(0, 8);
    }

    return "Admin";
}

function buildAdminTelemetryActivityItems(input: {
    telemetryLogsByEvent: Record<string, Awaited<ReturnType<typeof fetchTelemetryLogs>>[string]>;
    userNameMap: Map<string, string>;
}) {
    const items: AdminOverviewActivityItem[] = [];

    Object.entries(input.telemetryLogsByEvent).forEach(([eventName, records]) => {
        records.forEach((record, index) => {
            const username = record.userId ? input.userNameMap.get(record.userId) : record.username;
            const detail = typeof record.params.page_path === "string" && record.params.page_path.trim().length > 0
                ? record.params.page_path.trim()
                : typeof record.params.destination === "string" && record.params.destination.trim().length > 0
                    ? record.params.destination.trim()
                    : TELEMETRY_EVENT_LABELS[eventName] || eventName;

            items.push({
                id: `telemetry_${eventName}_${record.timestamp}_${record.userId || "anonymous"}_${index}`,
                domain: "admin",
                source: "analytics_event_facts",
                type: eventName,
                label: TELEMETRY_EVENT_LABELS[eventName] || eventName,
                detail,
                actorLabel: buildActorLabel({
                    username,
                    userId: record.userId,
                }),
                username,
                userId: record.userId || undefined,
                timestamp: record.timestamp,
                path: typeof record.params.page_path === "string" ? record.params.page_path : undefined,
            });
        });
    });

    return items;
}

async function GET_handler(request: NextRequest) {
    const startedAt = Date.now();
    const finalize = (response: NextResponse, error?: unknown) => {
        void recordRouteRuntimeSample({
            key: "admin/overview:GET",
            durationMs: Date.now() - startedAt,
            statusCode: response.status,
            errorMessage: error ? getErrorMessage(error) : null,
        });
        return response;
    };

    try {
        await guardApiRequest(request, {
            routeName: "admin/overview",
            preAuthRouteName: "admin/overview/preauth",
            preAuthRateLimit: HEAVY_READ,
            rateLimit: ADMIN,
            auth: "admin",
            scopeToCaller: true,
        });

        if (!adminDb) {
            return finalize(NextResponse.json({ error: "Database not available" }, { status: 500 }));
        }

        const now = Date.now();
        const rollingWindow = buildRolling30dWindow(now);
        const currentRollingStartMs = Date.parse(rollingWindow.currentStartUtc);
        const priorRollingStartMs = Date.parse(rollingWindow.priorStartUtc);
        const priorRollingEndMs = Date.parse(rollingWindow.priorEndUtc);
        const currentEndDayKey = getCSTDateKey(now);
        const currentStartDayKey = shiftCSTDateKey(currentEndDayKey, -(OVERVIEW_WINDOW_DAYS - 1));
        const previousEndDayKey = shiftCSTDateKey(currentStartDayKey, -1);
        const previousStartDayKey = shiftCSTDateKey(currentStartDayKey, -OVERVIEW_WINDOW_DAYS);
        const adminActivityStartMs = fromCSTInput(`${shiftCSTDateKey(currentEndDayKey, -13)}T00:00`);
        const issues: string[] = [];

        const [
            allUsersSnapshot,
            dropsSnapshot,
            recentTransactionsSnapshot,
            rollingTransactionsSnapshot,
            adminAdjustmentsSnapshot,
            commerceSummarySnapshot,
            commerceDailySnapshot,
            currentDropDailySnapshot,
            userMetricsSnapshotMeta,
        ] = await Promise.all([
            safeQueryWithDiagnostics({
                routeName: "admin/overview",
                channel: "admin",
                label: "users",
                issues,
                reader: () => adminDb.collection("users")
                    .limit(ADMIN_OVERVIEW_USER_LIMIT)
                    .get(),
            }),
            safeQueryWithDiagnostics({
                routeName: "admin/overview",
                channel: "admin",
                label: "drops",
                issues,
                reader: () => adminDb.collection("drops")
                    .limit(ADMIN_OVERVIEW_DROP_LIMIT)
                    .get(),
            }),
            safeQueryWithDiagnostics({
                routeName: "admin/overview",
                channel: "commerce",
                label: "recent transactions",
                issues,
                reader: () => adminDb.collection("transactions")
                    .orderBy("timestamp", "desc")
                    .limit(RECENT_TRANSACTION_LIMIT)
                    .get(),
            }),
            safeQueryWithDiagnostics({
                routeName: "admin/overview",
                channel: "commerce",
                label: "rolling transactions",
                issues,
                reader: () => adminDb.collection("transactions")
                    .where("timestamp", ">=", priorRollingStartMs)
                    .limit(ADMIN_OVERVIEW_ROLLING_TRANSACTION_LIMIT)
                    .get(),
            }),
            safeQueryWithDiagnostics({
                routeName: "admin/overview",
                channel: "admin",
                label: "admin adjustments",
                issues,
                reader: () => adminDb.collection("transactions")
                    .where("type", "==", "admin_adjustment")
                    .orderBy("timestamp", "desc")
                    .limit(ADMIN_ACTIVITY_LIMIT)
                    .get(),
            }),
            safeDocumentWithDiagnostics({
                routeName: "admin/overview",
                channel: "commerce",
                label: "commerce summary",
                issues,
                reader: () => adminDb.collection("analytics_commerce_rollup").doc("summary").get(),
            }),
            safeQueryWithDiagnostics({
                routeName: "admin/overview",
                channel: "commerce",
                label: "commerce daily",
                issues,
                reader: () => adminDb.collection("analytics_commerce_daily")
                    .where("dayKey", ">=", previousStartDayKey)
                    .limit(ADMIN_OVERVIEW_DAILY_ROLLUP_LIMIT)
                    .get(),
            }),
            safeQueryWithDiagnostics({
                routeName: "admin/overview",
                channel: "commerce",
                label: "drop daily",
                issues,
                reader: () => adminDb.collection("analytics_drop_daily")
                    .where("dayKey", ">=", currentStartDayKey)
                    .limit(ADMIN_OVERVIEW_DAILY_ROLLUP_LIMIT)
                    .get(),
            }),
            readAdminUserTruthSnapshot({
                db: adminDb,
                generatedAt: now,
            }),
        ]);
        const userTruthSnapshot = userMetricsSnapshotMeta;

        if (allUsersSnapshot.size >= ADMIN_OVERVIEW_USER_LIMIT) {
            issues.push("Overview user sample reached the read cap; snapshot-backed totals should be treated as authoritative.");
        }
        if (dropsSnapshot.size >= ADMIN_OVERVIEW_DROP_LIMIT) {
            issues.push("Overview drop sample reached the read cap; detailed drop mix may be partial.");
        }
        if (rollingTransactionsSnapshot.size >= ADMIN_OVERVIEW_ROLLING_TRANSACTION_LIMIT) {
            issues.push("Rolling transaction sample reached the read cap; commerce rollups should be treated as authoritative.");
        }

        const telemetryLogsByEvent = await fetchTelemetryLogs(ADMIN_ACTIVITY_TELEMETRY_EVENT_NAMES, adminActivityStartMs);

        const drops = dropsSnapshot.docs.flatMap((doc) => {
            const normalized = normalizeAndApplyDropStatusOrNull(doc.data(), doc.id, now);
            return normalized && !isDropHiddenFromPublic(normalized) ? [normalized] : [];
        });
        const dropTitleMap = new Map(drops.map((drop) => [drop.id, drop.title]));
        const dropUnlockTotals = drops.reduce((sum, drop) => sum + (drop.totalUnlocks || 0), 0);
        const topDrops = [...drops]
            .sort((left, right) => (right.totalUnlocks || 0) - (left.totalUnlocks || 0))
            .slice(0, 20);

        const recentTransactionsSource = recentTransactionsSnapshot.docs.flatMap((doc) => {
            try {
                return [normalizeTransactionRecord(doc.data(), doc.id)];
            } catch {
                return [];
            }
        }).sort((left, right) => {
            const leftTimestamp = typeof left.timestamp === "number" ? left.timestamp : toTimestampNumber(left.timestamp);
            const rightTimestamp = typeof right.timestamp === "number" ? right.timestamp : toTimestampNumber(right.timestamp);
            return rightTimestamp - leftTimestamp;
        });

        const adminAdjustmentSource = adminAdjustmentsSnapshot.docs.flatMap((doc) => {
            try {
                const raw = doc.data() as Record<string, unknown>;
                return [{
                    id: doc.id,
                    raw,
                    normalized: normalizeTransactionRecord(raw, doc.id),
                }];
            } catch {
                return [];
            }
        }).sort((left, right) => {
            const leftTimestamp = typeof left.normalized.timestamp === "number" ? left.normalized.timestamp : toTimestampNumber(left.normalized.timestamp);
            const rightTimestamp = typeof right.normalized.timestamp === "number" ? right.normalized.timestamp : toTimestampNumber(right.normalized.timestamp);
            return rightTimestamp - leftTimestamp;
        });

        const overviewUserIds = new Set<string>();
        recentTransactionsSource.forEach((transaction) => {
            if (transaction.userId) {
                overviewUserIds.add(transaction.userId);
            }
        });
        adminAdjustmentSource.forEach((transaction) => {
            if (transaction.normalized.userId) {
                overviewUserIds.add(transaction.normalized.userId);
            }
        });
        Object.values(telemetryLogsByEvent).forEach((records) => {
            records.forEach((record) => {
                if (record.userId) {
                    overviewUserIds.add(record.userId);
                }
            });
        });

        const userIdentityMap = await buildAdminOverviewUserIdentityMap({
            usersCollection: adminDb.collection("users"),
            userIds: overviewUserIds,
        });
        const userNameMap = new Map(
            [...userIdentityMap.entries()]
                .filter(([, identity]) => identity.userIdentityState === "resolved")
                .map(([userId, identity]) => [userId, identity.userDisplayName]),
        );

        const recentTransactions = addRecentTransactionContinuityLabels(
            recentTransactionsSource.map((transaction) =>
                serializeRecentTransaction(transaction, userIdentityMap.get(transaction.userId)),
            ),
        );

        const adminAdjustmentItems: AdminOverviewActivityItem[] = adminAdjustmentSource.map((transaction) => {
            const username = userNameMap.get(transaction.normalized.userId);
            const timestamp = typeof transaction.normalized.timestamp === "number"
                ? transaction.normalized.timestamp
                : toTimestampNumber(transaction.normalized.timestamp);
            const adjustedBy = typeof transaction.raw.adjustedBy === "string" && transaction.raw.adjustedBy.trim().length > 0
                ? transaction.raw.adjustedBy.trim()
                : undefined;
            const targetLabel = buildActorLabel({
                username,
                userId: transaction.normalized.userId,
            });

            return {
                id: transaction.id,
                domain: "admin",
                source: "transactions",
                type: transaction.normalized.type,
                label: "Balance adjusted",
                detail: getTransactionDisplayLabel(transaction.normalized),
                actorLabel: adjustedBy ?? "Unknown operator",
                targetLabel: `target ${targetLabel}`,
                targetUserId: transaction.normalized.userId || undefined,
                username,
                userId: transaction.normalized.userId,
                timestamp,
            };
        });

        const adminTelemetryItems = buildAdminTelemetryActivityItems({
            telemetryLogsByEvent,
            userNameMap,
        });

        const adminActivity = [...adminAdjustmentItems, ...adminTelemetryItems]
            .sort((left, right) => right.timestamp - left.timestamp)
            .slice(0, ADMIN_ACTIVITY_LIMIT);

        const chartSeed = buildWindowChart(currentEndDayKey);
        const chartMap = new Map(chartSeed.map((entry) => [entry.key, entry]));

        let currentRevenueCents = 0;
        let previousRevenueCents = 0;
        let currentUnwraps = 0;
        let previousUnwraps = 0;
        let currentPurchases = 0;
        let previousPurchases = 0;

        commerceDailySnapshot.docs.forEach((doc) => {
            const raw = doc.data() as Record<string, unknown>;
            const dayKey = typeof raw.dayKey === "string" ? raw.dayKey : "";
            if (!dayKey) {
                return;
            }

            const revenueCents = Math.round(readMetric(raw, "revenueCentsTotal", "grossRevenueCents"));
            const unwraps = Math.round(readMetric(raw, "unlockCount", "unlocks"));
            const purchases = Math.round(readMetric(raw, "purchaseCount", "purchaseTransactionCount"));

            if (dayKey >= currentStartDayKey && dayKey <= currentEndDayKey) {
                currentRevenueCents += revenueCents;
                currentUnwraps += unwraps;
                currentPurchases += purchases;
            } else if (dayKey >= previousStartDayKey && dayKey <= previousEndDayKey) {
                previousRevenueCents += revenueCents;
                previousUnwraps += unwraps;
                previousPurchases += purchases;
            }

            const chartDay = chartMap.get(dayKey);
            if (chartDay) {
                chartDay.revenue += revenueCents / 100;
                chartDay.unwraps += unwraps;
                chartDay.purchases += purchases;
            }
        });

        let currentNewUsers = 0;
        let previousNewUsers = 0;
        let usersMissingCreatedAtCount = 0;
        allUsersSnapshot.docs.forEach((doc) => {
            const raw = doc.data() as Record<string, unknown>;
            const createdAt = toTimestampNumber(raw.createdAt);
            if (!createdAt) {
                usersMissingCreatedAtCount += 1;
                return;
            }

            if (createdAt >= currentRollingStartMs && createdAt < now) {
                currentNewUsers += 1;
            } else if (createdAt >= priorRollingStartMs && createdAt < priorRollingEndMs) {
                previousNewUsers += 1;
            }
        });

        let rollingPurchaseCount = 0;
        let priorRollingPurchaseCount = 0;
        let rollingRevenueCents = 0;
        let priorRollingRevenueCents = 0;
        rollingTransactionsSnapshot.docs.forEach((doc) => {
            try {
                const normalized = normalizeTransactionRecord(doc.data(), doc.id);
                const timestamp = typeof normalized.timestamp === "number"
                    ? normalized.timestamp
                    : toTimestampNumber(normalized.timestamp);
                if (normalized.type !== "purchase_currency" || normalized.status !== "completed" || timestamp <= 0) {
                    return;
                }

                const revenueCents = typeof normalized.grossRevenueCents === "number" && Number.isFinite(normalized.grossRevenueCents)
                    ? Math.max(0, Math.round(normalized.grossRevenueCents))
                    : 0;

                if (timestamp >= currentRollingStartMs && timestamp < now) {
                    rollingPurchaseCount += 1;
                    rollingRevenueCents += revenueCents;
                } else if (timestamp >= priorRollingStartMs && timestamp < priorRollingEndMs) {
                    priorRollingPurchaseCount += 1;
                    priorRollingRevenueCents += revenueCents;
                }
            } catch {
                return;
            }
        });

        const currentDropUnlockCounts = new Map<string, number>();
        currentDropDailySnapshot.docs.forEach((doc) => {
            const raw = doc.data() as Record<string, unknown>;
            const dropId = typeof raw.dropId === "string" ? raw.dropId : "";
            if (!dropId) {
                return;
            }

            const unwraps = Math.round(readMetric(raw, "unlockTransactionCount", "unlockCount", "unwrapCount"));
            currentDropUnlockCounts.set(dropId, (currentDropUnlockCounts.get(dropId) ?? 0) + unwraps);
        });

        const topUnlockDropEntry = [...currentDropUnlockCounts.entries()]
            .sort((left, right) => right[1] - left[1])[0];

        const bestRevenueDay = [...chartSeed]
            .sort((left, right) => right.revenue - left.revenue)[0];
        const bestUnwrapDay = [...chartSeed]
            .sort((left, right) => right.unwraps - left.unwraps)[0];

        const commerceSummary = commerceSummarySnapshot.exists
            ? (commerceSummarySnapshot.data() as Record<string, unknown>)
            : null;
        const grossRevenueCents = Math.max(
            Math.round(userTruthSnapshot.totalRevenueUsd * 100),
            commerceSummary
                ? Math.round(readMetric(commerceSummary, "revenueCentsTotal", "grossRevenueCents"))
                : currentRevenueCents + previousRevenueCents,
        );
        const totalUnwraps = Math.max(userTruthSnapshot.trackedUnwraps, dropUnlockTotals);

        const overviewIssues: AdminOverviewIssueDetail[] = issues.map((issue) =>
            buildIssueDetail({
                source: summarizeOverviewIssueSource(issue),
                summary: issue,
                sourceTruth: issue.toLowerCase().includes("user")
                    ? "user_doc"
                    : issue.toLowerCase().includes("transaction") || issue.toLowerCase().includes("commerce")
                        ? "server_transaction"
                        : issue.toLowerCase().includes("drop")
                            ? "entitlement_rollup"
                            : "mixed",
                freshnessState: "review",
            }),
        );

        if (usersMissingCreatedAtCount > 0) {
            overviewIssues.push(buildIssueDetail({
                source: "users",
                summary: `${usersMissingCreatedAtCount.toLocaleString()} user docs are missing createdAt, so new-account growth is incomplete.`,
                sourceTruth: "user_doc",
                freshnessState: "review",
            }));
        }

        const platformPulse = buildPlatformPulseFromTruthSnapshot(userTruthSnapshot);

        const lastTransactionAt = recentTransactions.reduce(
            (latest, transaction) => Math.max(latest, typeof transaction.timestamp === "number" ? transaction.timestamp : 0),
            toTimestampNumber(commerceSummary?.lastTransactionAt),
        );
        const lastAdminActivityAt = adminActivity.reduce((latest, item) => Math.max(latest, item.timestamp), 0);

        const truthNotes = {
            overview: issues.length > 0
                ? `Server snapshot via API poll (${Math.round(60)}s interval) — ${issues.length} read fallback${issues.length === 1 ? "" : "s"} active`
                : "Server snapshot via API poll (60s interval) — all reads successful",
            platformPulse: usersMissingCreatedAtCount > 0
                ? "Platform Pulse uses one rolling 30-day window, but account growth is under review because some user docs are missing createdAt."
                : "Platform Pulse uses one rolling 30-day window. Purchases and revenue come from completed transactions, while lifetime totals remain secondary context.",
            drops: "Firestore drop collection with current lifecycle status applied.",
            revenue: "30-day chart built from analytics_commerce_daily, compared against prior 30-day window. Polled via server API, not realtime.",
            topDrops: "Ranked from current drop records by total unwrap count.",
            transactions: "Recent transactions from Firestore transactions collection via server API poll.",
            adminActivity: "Admin activity combines admin balance adjustments with recent canonical admin telemetry event facts.",
        };

        return finalize(NextResponse.json({
            success: true,
            issues,
            overviewIssues,
            generatedAt: now,
            rollingWindow,
            freshness: {
                lastTransactionAt,
                lastAdminActivityAt,
            },
            stats: {
                totalUsers: userTruthSnapshot.totalUsers,
                liveDrops: drops.filter((drop) => drop.status === "active").length,
                totalDrops: drops.length,
                grossRevenueCents,
                totalUnwraps,
                currentWindowPurchases: rollingPurchaseCount,
                currentWindowNewUsers: currentNewUsers,
                userMetricsSnapshot: undefined,
            },
            deltas: {
                accounts: calculateOverviewMetricDelta(currentNewUsers, previousNewUsers),
                purchases: calculateOverviewMetricDelta(rollingPurchaseCount, priorRollingPurchaseCount),
                revenue: calculateOverviewMetricDelta(rollingRevenueCents, priorRollingRevenueCents),
                unwraps: calculateOverviewMetricDelta(currentUnwraps, previousUnwraps),
            },
            recentTransactions,
            adminActivity,
            topDrops,
            chartData: chartSeed,
            platformPulse,
            truthSnapshot: userTruthSnapshot,
            trendSummary: {
                windowDays: OVERVIEW_WINDOW_DAYS,
                currentStartDayKey,
                currentEndDayKey,
                previousStartDayKey,
                previousEndDayKey,
                currentRevenueCents,
                previousRevenueCents,
                currentUnwraps,
                previousUnwraps,
                currentPurchases,
                previousPurchases,
                currentNewUsers,
                previousNewUsers,
                revenueActiveDays: chartSeed.filter((entry) => entry.revenue > 0).length,
                unwrapActiveDays: chartSeed.filter((entry) => entry.unwraps > 0).length,
                bestRevenueDay: bestRevenueDay && bestRevenueDay.revenue > 0
                    ? {
                        key: bestRevenueDay.key,
                        label: bestRevenueDay.date,
                        value: bestRevenueDay.revenue,
                    }
                    : null,
                bestUnwrapDay: bestUnwrapDay && bestUnwrapDay.unwraps > 0
                    ? {
                        key: bestUnwrapDay.key,
                        label: bestUnwrapDay.date,
                        value: bestUnwrapDay.unwraps,
                    }
                    : null,
                topUnlockDrop: topUnlockDropEntry && topUnlockDropEntry[1] > 0
                    ? {
                        dropId: topUnlockDropEntry[0],
                        title: dropTitleMap.get(topUnlockDropEntry[0]) || topUnlockDropEntry[0],
                        unwraps: topUnlockDropEntry[1],
                    }
                    : null,
            },
            truthNotes,
            verification: buildServerAdminModuleVerification({
                module: "admin_overview",
                canonicalSource: "users+drops+transactions+analytics_event_facts",
                fallbackSource: issues.length > 0 ? "diagnostic_read_fallbacks" : null,
                freshnessTimestamp: Math.max(lastTransactionAt, lastAdminActivityAt, now),
                degradedReason: issues.length > 0 ? issues[0] : null,
                status: issues.length > 0 ? "degraded" : "live",
                countComposition: {
                    totalUsers: userTruthSnapshot.totalUsers,
                    liveDrops: drops.filter((drop) => drop.status === "active").length,
                    totalDrops: drops.length,
                    recentTransactions: recentTransactions.length,
                    adminActivity: adminActivity.length,
                },
            }),
        }));
    } catch (error) {
        return finalize(handleApiError(error, "Admin.Overview.GET"), error);
    }
}

export let GET = withRouteRuntimeHealth("admin/overview:GET", GET_handler);
