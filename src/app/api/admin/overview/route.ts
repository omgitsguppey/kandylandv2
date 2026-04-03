export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";

import { adminDb } from "@/lib/server/firebase-admin";
import { handleApiError } from "@/lib/server/auth";
import { ADMIN, HEAVY_READ } from "@/lib/server/rate-limit";
import { isDropHiddenFromPublic, normalizeAndApplyDropStatusOrNull } from "@/lib/drop-read-models";
import { APP_TIMEZONE, fromCSTInput, getCSTDateKey, shiftCSTDateKey } from "@/lib/timezone";
import { getTransactionRevenueCents, normalizeTransactionRecord } from "@/lib/transaction-normalizers";
import { guardApiRequest } from "@/lib/server/request-guard";
import { buildAdminOverviewUserNameMap } from "@/lib/server/admin-overview-users";
import {
    safeCountWithDiagnostics,
    safeDocumentWithDiagnostics,
    safeQueryWithDiagnostics,
} from "@/lib/server/diagnostic-read-fallbacks";

const THIRTY_DAY_WINDOW = 30;
const CHART_LABEL_FORMATTER = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    month: "short",
    day: "2-digit",
});

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

function serializeRecentTransaction(raw: ReturnType<typeof normalizeTransactionRecord>, username?: string) {
    return {
        ...raw,
        username,
        timestamp: typeof raw.timestamp === "number" ? raw.timestamp : toTimestampNumber(raw.timestamp),
    };
}

function formatChartDayLabel(dayKey: string) {
    const labelTimestamp = fromCSTInput(`${dayKey}T12:00`);
    if (Number.isFinite(labelTimestamp)) {
        return CHART_LABEL_FORMATTER.format(new Date(labelTimestamp));
    }

    return dayKey;
}

function buildThirtyDayChart(nowMs: number) {
    const days: Array<{ key: string; date: string; revenue: number; unwraps: number }> = [];
    const todayKey = getCSTDateKey(nowMs);

    for (let index = THIRTY_DAY_WINDOW - 1; index >= 0; index -= 1) {
        const dayKey = shiftCSTDateKey(todayKey, -index);
        days.push({
            key: dayKey,
            date: formatChartDayLabel(dayKey),
            revenue: 0,
            unwraps: 0,
        });
    }

    return days;
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
        const thirtyDayStartMs = fromCSTInput(`${shiftCSTDateKey(getCSTDateKey(now), -(THIRTY_DAY_WINDOW - 1))}T00:00`);
        const issues: string[] = [];
        const [usersCountSnapshot, dropsSnapshot, recentTransactionsSnapshot, adminActivitySnapshot, commerceSummarySnapshot, recentChartTransactionsSnapshot] = await Promise.all([
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
                label: "drops",
                issues,
                reader: () => adminDb.collection("drops").get(),
            }),
            safeQueryWithDiagnostics({
                routeName: "admin/overview",
                channel: "admin",
                label: "recent transactions",
                issues,
                reader: () => adminDb.collection("transactions").orderBy("timestamp", "desc").limit(20).get(),
            }),
            safeQueryWithDiagnostics({
                routeName: "admin/overview",
                channel: "admin",
                label: "admin activity",
                issues,
                reader: () => adminDb.collection("transactions")
                    .where("type", "==", "admin_adjustment")
                    .orderBy("timestamp", "desc")
                    .limit(10)
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
                label: "chart transactions",
                issues,
                reader: () => adminDb.collection("transactions")
                    .where("timestamp", ">=", thirtyDayStartMs)
                    .orderBy("timestamp", "desc")
                    .get(),
            }),
        ]);

        const drops = dropsSnapshot.docs.flatMap((doc) => {
            const normalized = normalizeAndApplyDropStatusOrNull(doc.data(), doc.id, now);
            return normalized && !isDropHiddenFromPublic(normalized) ? [normalized] : [];
        });

        const recentTransactionsSource = recentTransactionsSnapshot.docs.flatMap((doc) => {
            try {
                return [normalizeTransactionRecord(doc.data(), doc.id)];
            } catch {
                return [];
            }
        });
        const recentChartTransactions = recentChartTransactionsSnapshot.docs.flatMap((doc) => {
            try {
                return [normalizeTransactionRecord(doc.data(), doc.id)];
            } catch {
                return [];
            }
        });
        const purchaseTransactions = recentChartTransactions
            .filter((transaction) => transaction.type === "purchase_currency" && transaction.status === "completed");
        const unlockTransactions = recentChartTransactions
            .filter((transaction) => transaction.type === "unlock_content");

        const adminActivitySource = adminActivitySnapshot.docs
            .flatMap((doc) => {
                try {
                    return [normalizeTransactionRecord(doc.data(), doc.id)];
                } catch {
                    return [];
                }
            })
            .sort((left, right) => {
                const leftTimestamp = typeof left.timestamp === "number" ? left.timestamp : toTimestampNumber(left.timestamp);
                const rightTimestamp = typeof right.timestamp === "number" ? right.timestamp : toTimestampNumber(right.timestamp);
                return rightTimestamp - leftTimestamp;
            })
            .slice(0, 10);
        const overviewUserIds = new Set<string>();
        recentTransactionsSource.forEach((transaction) => {
            if (transaction.userId) {
                overviewUserIds.add(transaction.userId);
            }
        });
        adminActivitySource.forEach((transaction) => {
            if (transaction.userId) {
                overviewUserIds.add(transaction.userId);
            }
        });
        const userNameMap = await buildAdminOverviewUserNameMap({
            usersCollection: adminDb.collection("users"),
            userIds: overviewUserIds,
        });
        const recentTransactions = recentTransactionsSource
            .map((transaction) => serializeRecentTransaction(transaction, userNameMap.get(transaction.userId)));
        const adminActivity = adminActivitySource.map((transaction) => serializeRecentTransaction(transaction, userNameMap.get(transaction.userId)));

        const topDrops = [...drops]
            .sort((left, right) => (right.totalUnlocks || 0) - (left.totalUnlocks || 0))
            .slice(0, 5);

        const chartSeed = buildThirtyDayChart(now);
        const chartMap = new Map(chartSeed.map((entry) => [entry.key, entry]));

        [...purchaseTransactions, ...unlockTransactions].forEach((transaction) => {
            const timestamp = typeof transaction.timestamp === "number" ? transaction.timestamp : toTimestampNumber(transaction.timestamp);
            if (!timestamp) {
                return;
            }

            const dayEntry = chartMap.get(getCSTDateKey(timestamp));
            if (!dayEntry) {
                return;
            }

            if (transaction.type === "purchase_currency") {
                dayEntry.revenue += getTransactionRevenueCents(transaction) / 100;
            } else if (transaction.type === "unlock_content") {
                dayEntry.unwraps += 1;
            }
        });

        const commerceSummary = commerceSummarySnapshot.exists
            ? (commerceSummarySnapshot.data() as Record<string, unknown>)
            : null;
        const grossRevenueCents = commerceSummary
            ? Math.max(
                Math.round(toNumber(commerceSummary.grossRevenueUsdTotal) * 100),
                toNumber(commerceSummary.revenueCentsTotal),
                toNumber(commerceSummary.grossRevenueCents),
            )
            : purchaseTransactions.reduce((sum, transaction) => sum + getTransactionRevenueCents(transaction), 0);

        return NextResponse.json({
            success: true,
            issues,
            stats: {
                totalUsers: toNumber(usersCountSnapshot.data()?.count),
                activeDrops: drops.filter((drop) => drop.status === "active").length,
                totalDrops: drops.length,
                grossRevenueCents,
                totalUnwraps: drops.reduce((sum, drop) => sum + (drop.totalUnlocks || 0), 0),
            },
            recentTransactions,
            adminActivity,
            topDrops,
            chartData: chartSeed,
        });
    } catch (error) {
        return handleApiError(error, "Admin.Overview.GET");
    }
}
