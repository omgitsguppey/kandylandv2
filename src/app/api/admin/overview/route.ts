import { NextRequest, NextResponse } from "next/server";

import { adminDb } from "@/lib/server/firebase-admin";
import { verifyAdmin, handleApiError } from "@/lib/server/auth";
import { checkRateLimit, ADMIN } from "@/lib/server/rate-limit";
import { normalizeDropRecord } from "@/lib/drop-normalizers";
import { applyDropStatus } from "@/lib/drop-status";
import { getTransactionRevenueCents, normalizeTransactionRecord } from "@/lib/transaction-normalizers";

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

function buildThirtyDayChart() {
    const days: Array<{ key: number; date: string; revenue: number; unwraps: number }> = [];
    const now = new Date();

    for (let index = 29; index >= 0; index -= 1) {
        const day = new Date(now);
        day.setHours(0, 0, 0, 0);
        day.setDate(day.getDate() - index);
        days.push({
            key: day.getTime(),
            date: day.toLocaleDateString("en-US", { month: "short", day: "2-digit" }),
            revenue: 0,
            unwraps: 0,
        });
    }

    return days;
}

export async function GET(request: NextRequest) {
    try {
        await checkRateLimit(request, "admin/overview", ADMIN);
        await verifyAdmin(request);

        const [usersSnapshot, dropsSnapshot, transactionsSnapshot] = await Promise.all([
            adminDb.collection("users").get(),
            adminDb.collection("drops").get(),
            adminDb.collection("transactions").orderBy("timestamp", "desc").limit(250).get(),
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

        const transactions = transactionsSnapshot.docs.flatMap((doc) => {
            try {
                return [normalizeTransactionRecord(doc.data(), doc.id)];
            } catch {
                return [];
            }
        });

        const recentTransactions = transactions
            .slice(0, 20)
            .map((transaction) => serializeRecentTransaction(transaction, userNameMap.get(transaction.userId)));

        const adminActivity = transactions
            .filter((transaction) => transaction.type === "admin_adjustment")
            .slice(0, 10)
            .map((transaction) => serializeRecentTransaction(transaction, userNameMap.get(transaction.userId)));

        const topDrops = [...drops]
            .sort((left, right) => (right.totalUnlocks || 0) - (left.totalUnlocks || 0))
            .slice(0, 5);

        const chartSeed = buildThirtyDayChart();
        const chartMap = new Map(chartSeed.map((entry) => [entry.key, entry]));

        transactions.forEach((transaction) => {
            const timestamp = typeof transaction.timestamp === "number" ? transaction.timestamp : toTimestampNumber(transaction.timestamp);
            if (!timestamp) {
                return;
            }

            const bucket = new Date(timestamp);
            bucket.setHours(0, 0, 0, 0);
            const dayEntry = chartMap.get(bucket.getTime());
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
                grossRevenueCents: transactions.reduce((sum, transaction) => sum + getTransactionRevenueCents(transaction), 0),
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
