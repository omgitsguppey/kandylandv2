import { NextRequest, NextResponse } from "next/server";

import { adminDb } from "@/lib/server/firebase-admin";
import { handleApiError } from "@/lib/server/auth";
import { recordServerDiagnostic } from "@/lib/server/server-diagnostics";
import { ADMIN, HEAVY_READ } from "@/lib/server/rate-limit";
import { normalizeDropRecord } from "@/lib/drop-normalizers";
import { applyDropStatus } from "@/lib/drop-status";
import { APP_TIMEZONE, fromCSTInput, getCSTDateKey, shiftCSTDateKey } from "@/lib/timezone";
import { getTransactionRevenueCents, normalizeTransactionRecord } from "@/lib/transaction-normalizers";
import { guardApiRequest } from "@/lib/server/request-guard";

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

async function readOptionalSnapshot(
    label: string,
    load: () => Promise<FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>>,
) {
    try {
        return await load();
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await recordServerDiagnostic({
            channel: "analytics",
            severity: "warn",
            message: "Admin overview query fell back",
            detail: {
                query: label,
                message,
            },
        });

        return null;
    }
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

        const [usersSnapshot, dropsSnapshot, recentTransactionsSnapshot] = await Promise.all([
            adminDb.collection("users").get(),
            adminDb.collection("drops").get(),
            adminDb.collection("transactions").orderBy("timestamp", "desc").limit(250).get(),
        ]);
        const [adminActivitySnapshot, purchaseTransactionsSnapshot, unlockTransactionsSnapshot] = await Promise.all([
            readOptionalSnapshot(
                "transactions_admin_adjustment_recent",
                () => adminDb.collection("transactions").where("type", "==", "admin_adjustment").orderBy("timestamp", "desc").limit(10).get(),
            ),
            readOptionalSnapshot(
                "transactions_purchase_revenue",
                () => adminDb.collection("transactions").where("type", "in", ["purchase_currency", "purchase"]).get(),
            ),
            readOptionalSnapshot(
                "transactions_unlock_content",
                () => adminDb.collection("transactions").where("type", "==", "unlock_content").get(),
            ),
        ]);

        const userNameMap = new Map<string, string>();
        usersSnapshot.docs.forEach((doc) => {
            const raw = doc.data() as Record<string, unknown>;
            userNameMap.set(
                doc.id,
                (typeof raw.username === "string" && raw.username.trim().length > 0
                    ? raw.username
                    : typeof raw.displayName === "string" && raw.displayName.trim().length > 0
                        ? raw.displayName
                        : "Unknown"),
            );
        });

        const now = Date.now();
        const drops = dropsSnapshot.docs.flatMap((doc) => {
            try {
                return [applyDropStatus(normalizeDropRecord(doc.data(), doc.id), now)];
            } catch {
                return [];
            }
        });

        const recentTransactionsSource = recentTransactionsSnapshot.docs.flatMap((doc) => {
            try {
                return [normalizeTransactionRecord(doc.data(), doc.id)];
            } catch {
                return [];
            }
        });
        const purchaseTransactions = (purchaseTransactionsSnapshot?.docs ?? []).flatMap((doc) => {
            try {
                return [normalizeTransactionRecord(doc.data(), doc.id)];
            } catch {
                return [];
            }
        }).filter((transaction) => transaction.type === "purchase_currency" && transaction.status === "completed");
        const unlockTransactions = (unlockTransactionsSnapshot?.docs ?? []).flatMap((doc) => {
            try {
                return [normalizeTransactionRecord(doc.data(), doc.id)];
            } catch {
                return [];
            }
        }).filter((transaction) => transaction.type === "unlock_content");

        const recentTransactions = recentTransactionsSource
            .slice(0, 20)
            .map((transaction) => serializeRecentTransaction(transaction, userNameMap.get(transaction.userId)));

        const adminActivitySource = adminActivitySnapshot
            ? adminActivitySnapshot.docs.flatMap((doc) => {
                try {
                    return [normalizeTransactionRecord(doc.data(), doc.id)];
                } catch {
                    return [];
                }
            })
            : recentTransactionsSource
                .filter((transaction) => transaction.type === "admin_adjustment")
                .slice(0, 10);
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

        return NextResponse.json({
            success: true,
            stats: {
                totalUsers: usersSnapshot.size,
                activeDrops: drops.filter((drop) => drop.status === "active").length,
                totalDrops: drops.length,
                grossRevenueCents: purchaseTransactions.reduce((sum, transaction) => sum + getTransactionRevenueCents(transaction), 0),
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
