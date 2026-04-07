export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";

import type { AdminOverviewActivityItem, AdminOverviewDayPoint } from "@/lib/admin-overview";
import { calculateOverviewMetricDelta } from "@/lib/admin-overview";
import { isDropHiddenFromPublic, normalizeAndApplyDropStatusOrNull } from "@/lib/drop-read-models";
import { TELEMETRY_EVENT_LABELS, TELEMETRY_MODULE_INDEXES } from "@/lib/telemetry-catalog";
import { APP_TIMEZONE, fromCSTInput, getCSTDateKey, shiftCSTDateKey } from "@/lib/timezone";
import { getTransactionDisplayLabel, normalizeTransactionRecord } from "@/lib/transaction-normalizers";
import { handleApiError } from "@/lib/server/auth";
import { fetchTelemetryLogs } from "@/lib/server/admin-analytics-shared";
import { buildAdminOverviewUserNameMap } from "@/lib/server/admin-overview-users";
import {
    safeCountWithDiagnostics,
    safeDocumentWithDiagnostics,
    safeQueryWithDiagnostics,
} from "@/lib/server/diagnostic-read-fallbacks";
import { adminDb } from "@/lib/server/firebase-admin";
import { ADMIN, HEAVY_READ } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";

const OVERVIEW_WINDOW_DAYS = 30;
const RECENT_TRANSACTION_LIMIT = 20;
const ADMIN_ACTIVITY_LIMIT = 20;
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

function toNumber(value: unknown): number {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
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

function serializeRecentTransaction(raw: ReturnType<typeof normalizeTransactionRecord>, username?: string) {
    return {
        ...raw,
        username,
        timestamp: typeof raw.timestamp === "number" ? raw.timestamp : toTimestampNumber(raw.timestamp),
        sourceScope: "overview_snapshot" as const,
    };
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
                source: "telemetry_logs",
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

export async function GET(request: NextRequest) {
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
            return NextResponse.json({ error: "Database not available" }, { status: 500 });
        }

        const now = Date.now();
        const currentEndDayKey = getCSTDateKey(now);
        const currentStartDayKey = shiftCSTDateKey(currentEndDayKey, -(OVERVIEW_WINDOW_DAYS - 1));
        const previousEndDayKey = shiftCSTDateKey(currentStartDayKey, -1);
        const previousStartDayKey = shiftCSTDateKey(currentStartDayKey, -OVERVIEW_WINDOW_DAYS);
        const currentStartMs = fromCSTInput(`${currentStartDayKey}T00:00`);
        const previousStartMs = fromCSTInput(`${previousStartDayKey}T00:00`);
        const adminActivityStartMs = fromCSTInput(`${shiftCSTDateKey(currentEndDayKey, -13)}T00:00`);
        const issues: string[] = [];

        const [
            usersCountSnapshot,
            recentUsersSnapshot,
            dropsSnapshot,
            recentTransactionsSnapshot,
            adminAdjustmentsSnapshot,
            commerceSummarySnapshot,
            commerceDailySnapshot,
            currentDropDailySnapshot,
        ] = await Promise.all([
            safeCountWithDiagnostics({
                routeName: "admin/overview",
                channel: "admin",
                label: "users count",
                issues,
                reader: () => adminDb.collection("users").count().get(),
            }),
            safeQueryWithDiagnostics({
                routeName: "admin/overview",
                channel: "admin",
                label: "recent users",
                issues,
                reader: () => adminDb.collection("users")
                    .where("createdAt", ">=", previousStartMs)
                    .get(),
            }),
            safeQueryWithDiagnostics({
                routeName: "admin/overview",
                channel: "admin",
                label: "drops",
                issues,
                reader: () => adminDb.collection("drops").get(),
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
                    .get(),
            }),
            safeQueryWithDiagnostics({
                routeName: "admin/overview",
                channel: "commerce",
                label: "drop daily",
                issues,
                reader: () => adminDb.collection("analytics_drop_daily")
                    .where("dayKey", ">=", currentStartDayKey)
                    .get(),
            }),
        ]);

        const telemetryLogsByEvent = await fetchTelemetryLogs(ADMIN_ACTIVITY_TELEMETRY_EVENT_NAMES, adminActivityStartMs);

        const drops = dropsSnapshot.docs.flatMap((doc) => {
            const normalized = normalizeAndApplyDropStatusOrNull(doc.data(), doc.id, now);
            return normalized && !isDropHiddenFromPublic(normalized) ? [normalized] : [];
        });
        const dropTitleMap = new Map(drops.map((drop) => [drop.id, drop.title]));
        const dropUnlockTotals = drops.reduce((sum, drop) => sum + (drop.totalUnlocks || 0), 0);
        const topDrops = [...drops]
            .sort((left, right) => (right.totalUnlocks || 0) - (left.totalUnlocks || 0))
            .slice(0, 6);

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

        const userNameMap = await buildAdminOverviewUserNameMap({
            usersCollection: adminDb.collection("users"),
            userIds: overviewUserIds,
        });

        const recentTransactions = recentTransactionsSource.map((transaction) =>
            serializeRecentTransaction(transaction, userNameMap.get(transaction.userId)),
        );

        const adminAdjustmentItems: AdminOverviewActivityItem[] = adminAdjustmentSource.map((transaction) => {
            const username = userNameMap.get(transaction.normalized.userId);
            const timestamp = typeof transaction.normalized.timestamp === "number"
                ? transaction.normalized.timestamp
                : toTimestampNumber(transaction.normalized.timestamp);
            const adjustedBy = typeof transaction.raw.adjustedBy === "string" && transaction.raw.adjustedBy.trim().length > 0
                ? transaction.raw.adjustedBy.trim()
                : "Admin";
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
                detail: `${getTransactionDisplayLabel(transaction.normalized)} · target ${targetLabel}`,
                actorLabel: adjustedBy,
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
        recentUsersSnapshot.docs.forEach((doc) => {
            const raw = doc.data() as Record<string, unknown>;
            const createdAt = toTimestampNumber(raw.createdAt);
            if (!createdAt) {
                return;
            }

            if (createdAt >= currentStartMs) {
                currentNewUsers += 1;
            } else if (createdAt >= previousStartMs) {
                previousNewUsers += 1;
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
        const grossRevenueCents = commerceSummary
            ? Math.max(
                Math.round(readMetric(commerceSummary, "grossRevenueUsdTotal") * 100),
                Math.round(readMetric(commerceSummary, "revenueCentsTotal", "grossRevenueCents")),
            )
            : currentRevenueCents + previousRevenueCents;
        const totalUnwraps = commerceSummary
            ? Math.max(
                Math.round(readMetric(commerceSummary, "unlockCount", "totalUnlocks")),
                dropUnlockTotals,
            )
            : dropUnlockTotals;

        const lastTransactionAt = recentTransactions.reduce(
            (latest, transaction) => Math.max(latest, typeof transaction.timestamp === "number" ? transaction.timestamp : 0),
            toTimestampNumber(commerceSummary?.lastTransactionAt),
        );
        const lastAdminActivityAt = adminActivity.reduce((latest, item) => Math.max(latest, item.timestamp), 0);

        const truthNotes = {
            overview: issues.length > 0
                ? `5s polled overview snapshot with ${issues.length} read fallback${issues.length === 1 ? "" : "s"}.`
                : "5s polled overview snapshot with deterministic server reads.",
            platformPulse: commerceSummary
                ? "Lifetime revenue and unwrap totals merge analytics rollup history with live drop-record fallbacks where needed. Deltas compare the last 30 days to the previous 30 days."
                : "Lifetime revenue and unwrap totals are scoped to currently available overview reads because the lifetime commerce summary was unavailable.",
            drops: "Realtime Firestore drop feed with current drop-record lifecycle status. Counts do not invent hidden queue state outside the canonical drop helpers.",
            revenue: "30-day chart is built from analytics_commerce_daily and compared against the prior 30-day window. It is polled, not realtime.",
            topDrops: "Ranked from current drop records by total unwrap count. This is a compact leaderboard, not a historical export.",
            transactions: "Recent transactions hydrate from the live Firestore transactions collection. The overview shell still refreshes on a 5s poll.",
            adminActivity: "Admin activity combines admin balance adjustments with recent admin telemetry logs only. It does not claim to be a full cross-domain actor history.",
        };

        return NextResponse.json({
            success: true,
            issues,
            generatedAt: now,
            freshness: {
                lastTransactionAt,
                lastAdminActivityAt,
            },
            stats: {
                totalUsers: toNumber(usersCountSnapshot.data()?.count),
                liveDrops: drops.filter((drop) => drop.status === "active").length,
                totalDrops: drops.length,
                grossRevenueCents,
                totalUnwraps,
                currentWindowPurchases: currentPurchases,
                currentWindowNewUsers: currentNewUsers,
            },
            deltas: {
                accounts: calculateOverviewMetricDelta(currentNewUsers, previousNewUsers),
                purchases: calculateOverviewMetricDelta(currentPurchases, previousPurchases),
                revenue: calculateOverviewMetricDelta(currentRevenueCents, previousRevenueCents),
                unwraps: calculateOverviewMetricDelta(currentUnwraps, previousUnwraps),
            },
            recentTransactions,
            adminActivity,
            topDrops,
            chartData: chartSeed,
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
        });
    } catch (error) {
        return handleApiError(error, "Admin.Overview.GET");
    }
}
