export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";

import type { AdminOverviewActivityItem, AdminOverviewDayPoint, AdminOverviewIssueDetail, RecentTransactionAdminRow } from "@/lib/admin-overview";
import { buildAdminOverviewPlatformPulse, calculateOverviewMetricDelta } from "@/lib/admin-overview";
import { buildPlatformPulseWindow } from "@/lib/admin/platform-pulse-window";
import { isDropHiddenFromPublic, normalizeAndApplyDropStatusOrNull } from "@/lib/drop-read-models";
import { BUG_REPORT_COLLECTION } from "@/lib/errors/bug-report-contract";
import { SUPPORT_COLLECTIONS } from "@/lib/support-readiness";
import { TELEMETRY_EVENT_LABELS, TELEMETRY_MODULE_INDEXES } from "@/lib/telemetry-catalog";
import { APP_TIMEZONE, fromCSTInput, getCSTDateKey, shiftCSTDateKey } from "@/lib/timezone";
import { getTransactionBadgeLabel, getTransactionDisplayLabel, normalizeTransactionRecord } from "@/lib/transaction-normalizers";
import { classifyTransactionSourceOfFunds } from "@/lib/commerce/transaction-source-of-funds-contract";
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
    safeCountWithDiagnostics,
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
const ADMIN_OVERVIEW_DAILY_ROLLUP_LIMIT = 90;
const CHART_LABEL_FORMATTER = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    month: "short",
    day: "2-digit",
});
const ADMIN_ACTIVITY_TELEMETRY_EVENT_NAMES = (
    TELEMETRY_MODULE_INDEXES.find((moduleIndex) => moduleIndex.key === "admin")?.eventNames ?? []
).filter((eventName) => eventName.startsWith("admin_") || eventName.startsWith("creator_") || eventName.startsWith("owner_"));
const SUPPORT_BUG_USER_CHANNELS = ["in_app", "email", "feedback"] as const;

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

function readCountSnapshot(snapshot: FirebaseFirestore.AggregateQuerySnapshot<{ count: FirebaseFirestore.AggregateField<number> }>) {
    const value = snapshot.data().count;
    return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
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
    const classification = classifyTransactionSourceOfFunds({
        transactionId: raw.id,
        userId: raw.userId,
        type: raw.type,
        amount: raw.amount,
        status: raw.status,
        rewardSource: raw.rewardSource,
        ledgerSource: raw.ledgerSource,
        description: raw.description,
        timestamp: typeof raw.timestamp === "number" ? raw.timestamp : toTimestampNumber(raw.timestamp),
        timestampMs: raw.timestampMs,
        purchasedAmountSpent: raw.purchasedAmountSpent,
        rewardAmountSpent: raw.rewardAmountSpent,
        paidGumDrops: raw.paidGumDrops,
        bonusGumDrops: raw.bonusGumDrops,
    });
    if (classification.sourceClass !== "unknown_missing_metadata" && classification.sourceClass !== "legacy_unknown") {
        return classification.sourceClass;
    }
    if (raw.type === "admin_adjustment") return "admin_adjustment";
    if (raw.type === "purchase_currency") return raw.bonusGumDrops && raw.bonusGumDrops > 0 ? "paid_bonus" : "paid";
    if (raw.type === "daily_reward" || raw.type === "referral_bonus" || raw.type === "onboarding_reward") return "reward";
    if (raw.ledgerSource === "purchased") return "paid";
    if (raw.ledgerSource === "reward") return "reward";
    return classification.sourceClass;
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
    const sourceClassification = classifyTransactionSourceOfFunds({
        transactionId: raw.id,
        userId: raw.userId,
        type: raw.type,
        amount: raw.amount,
        status: raw.status,
        rewardSource: raw.rewardSource,
        ledgerSource: raw.ledgerSource,
        description: raw.description,
        timestamp,
        timestampMs: raw.timestampMs,
        purchasedAmountSpent: raw.purchasedAmountSpent,
        rewardAmountSpent: raw.rewardAmountSpent,
        paidGumDrops: raw.paidGumDrops,
        bonusGumDrops: raw.bonusGumDrops,
    });

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
        sourceLabel: sourceClassification.displayLabel,
        sourceConfidence: sourceClassification.sourceConfidence,
        userIdRedacted: sourceClassification.userIdRedacted,
        fullUidDefaultVisible: false,
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
        const rollingWindow = buildPlatformPulseWindow(now);
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
            adminAdjustmentsSnapshot,
            commerceSummarySnapshot,
            commerceDailySnapshot,
            taskDailySnapshot,
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
                channel: "admin",
                label: "task reward daily",
                issues,
                reader: () => adminDb.collection("analytics_task_daily")
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
        const countUserBugReports = async (startMs: number, endMs: number, label: string) => {
            const snapshot = await safeCountWithDiagnostics({
                routeName: "admin/overview",
                channel: "admin",
                label,
                issues,
                detail: {
                    collection: BUG_REPORT_COLLECTION,
                    sourceTruth: "human_error_bug_report",
                    boundedBy: "createdAt",
                },
                reader: () => adminDb.collection(BUG_REPORT_COLLECTION)
                    .where("sourceTruth", "==", "human_error_bug_report")
                    .where("createdAt", ">=", startMs)
                    .where("createdAt", "<", endMs)
                    .count()
                    .get(),
            });

            return readCountSnapshot(snapshot);
        };
        const countUserSupportRequests = async (startMs: number, endMs: number, label: string) => {
            const snapshots = await Promise.all(SUPPORT_BUG_USER_CHANNELS.map((channel) =>
                safeCountWithDiagnostics({
                    routeName: "admin/overview",
                    channel: "admin",
                    label: `${label} ${channel}`,
                    issues,
                    detail: {
                        collection: SUPPORT_COLLECTIONS.threads,
                        channel,
                        boundedBy: "createdAt",
                    },
                    reader: () => adminDb.collection(SUPPORT_COLLECTIONS.threads)
                        .where("channel", "==", channel)
                        .where("createdAt", ">=", startMs)
                        .where("createdAt", "<", endMs)
                        .count()
                        .get(),
                }),
            ));

            return snapshots.reduce((total, snapshot) => total + readCountSnapshot(snapshot), 0);
        };
        const [
            currentUserBugReports,
            previousUserBugReports,
            currentUserSupportRequests,
            previousUserSupportRequests,
        ] = await Promise.all([
            countUserBugReports(currentRollingStartMs, now, "current user bug reports"),
            countUserBugReports(priorRollingStartMs, priorRollingEndMs, "prior user bug reports"),
            countUserSupportRequests(currentRollingStartMs, now, "current user support requests"),
            countUserSupportRequests(priorRollingStartMs, priorRollingEndMs, "prior user support requests"),
        ]);

        if (allUsersSnapshot.size >= ADMIN_OVERVIEW_USER_LIMIT) {
            issues.push("Overview user sample reached the read cap; snapshot-backed totals should be treated as authoritative.");
        }
        if (dropsSnapshot.size >= ADMIN_OVERVIEW_DROP_LIMIT) {
            issues.push("Overview drop sample reached the read cap; detailed drop mix may be partial.");
        }
        const telemetryLogsByEvent = await fetchTelemetryLogs(ADMIN_ACTIVITY_TELEMETRY_EVENT_NAMES, adminActivityStartMs);

        let dropUnlockTotals = 0;
        let liveDropsCount = 0;
        const drops = dropsSnapshot.docs.flatMap((doc) => {
            const normalized = normalizeAndApplyDropStatusOrNull(doc.data(), doc.id, now);
            if (!normalized || isDropHiddenFromPublic(normalized)) {
                return [];
            }

            dropUnlockTotals += normalized.totalUnlocks || 0;
            if (normalized.status === "active") {
                liveDropsCount += 1;
            }

            return [normalized];
        });
        const dropTitleMap = new Map(drops.map((drop) => [drop.id, drop.title]));
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
        let currentPaidGd = 0;
        let previousPaidGd = 0;
        let currentPaidBonusGd = 0;
        let previousPaidBonusGd = 0;
        let currentRewardGd = 0;
        let previousRewardGd = 0;

        commerceDailySnapshot.docs.forEach((doc) => {
            const raw = doc.data() as Record<string, unknown>;
            const dayKey = typeof raw.dayKey === "string" ? raw.dayKey : "";
            if (!dayKey) {
                return;
            }

            const revenueCents = Math.round(readMetric(raw, "revenueCentsTotal", "grossRevenueCents"));
            const unwraps = Math.round(readMetric(raw, "unlockCount", "unlocks"));
            const purchases = Math.round(readMetric(raw, "purchaseCount", "purchaseTransactionCount"));
            const paidGd = Math.round(readMetric(raw, "paidGumDropsTotal", "paidGumDrops"));
            const paidBonusGd = Math.round(readMetric(raw, "bonusGumDropsTotal", "bonusGumDrops", "paidBonusGumDropsTotal"));

            if (dayKey >= currentStartDayKey && dayKey <= currentEndDayKey) {
                currentRevenueCents += revenueCents;
                currentUnwraps += unwraps;
                currentPurchases += purchases;
                currentPaidGd += paidGd;
                currentPaidBonusGd += paidBonusGd;
            } else if (dayKey >= previousStartDayKey && dayKey <= previousEndDayKey) {
                previousRevenueCents += revenueCents;
                previousUnwraps += unwraps;
                previousPurchases += purchases;
                previousPaidGd += paidGd;
                previousPaidBonusGd += paidBonusGd;
            }

            const chartDay = chartMap.get(dayKey);
            if (chartDay) {
                chartDay.revenue += revenueCents / 100;
                chartDay.unwraps += unwraps;
                chartDay.purchases += purchases;
            }
        });

        taskDailySnapshot.docs.forEach((doc) => {
            const raw = doc.data() as Record<string, unknown>;
            const dayKey = typeof raw.dayKey === "string" ? raw.dayKey : "";
            if (!dayKey) {
                return;
            }

            const rewardGd = Math.round(readMetric(raw, "paidRewardTotalGd", "rewardTotal"));
            if (dayKey >= currentStartDayKey && dayKey <= currentEndDayKey) {
                currentRewardGd += rewardGd;
            } else if (dayKey >= previousStartDayKey && dayKey <= previousEndDayKey) {
                previousRewardGd += rewardGd;
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

        let topUnlockDropEntry: [string, number] | undefined;
        let bestRevenueDay = chartSeed[0];
        let bestUnwrapDay = chartSeed[0];
        let revenueActiveDays = 0;
        let unwrapActiveDays = 0;

        for (const entry of currentDropUnlockCounts.entries()) {
            if (!topUnlockDropEntry || entry[1] > topUnlockDropEntry[1]) {
                topUnlockDropEntry = entry;
            }
        }

        for (const entry of chartSeed) {
            if (entry.revenue > 0) {
                revenueActiveDays += 1;
            }
            if (entry.unwraps > 0) {
                unwrapActiveDays += 1;
            }
            if (!bestRevenueDay || entry.revenue > bestRevenueDay.revenue) {
                bestRevenueDay = entry;
            }
            if (!bestUnwrapDay || entry.unwraps > bestUnwrapDay.unwraps) {
                bestUnwrapDay = entry;
            }
        }

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

        const warningsForIssue = (patterns: string[]) => issues.filter((issue) => {
            const normalized = issue.toLowerCase();
            return patterns.some((pattern) => normalized.includes(pattern));
        });
        const userCreatedAtWarnings = usersMissingCreatedAtCount > 0
            ? [`${usersMissingCreatedAtCount.toLocaleString()} user docs are missing createdAt.`]
            : [];
        const commerceDailyWarnings = warningsForIssue(["commerce daily"]);
        const taskRewardWarnings = warningsForIssue(["task reward daily"]);
        const supportBugWarnings = warningsForIssue(["bug report", "support request"]);
        const platformPulse = buildAdminOverviewPlatformPulse({
            freshnessState: "live",
            warnings: {
                accounts: userCreatedAtWarnings,
                purchases30d: commerceDailyWarnings,
                revenue: commerceDailyWarnings,
                unwraps: commerceDailyWarnings,
                gumdropsCirculation30d: [...commerceDailyWarnings, ...taskRewardWarnings],
                supportBugs30d: supportBugWarnings,
            },
            accounts: {
                current: currentNewUsers,
                prior: previousNewUsers,
            },
            purchases: {
                current: currentPurchases,
                prior: previousPurchases,
            },
            revenueCents: {
                current: currentRevenueCents,
                prior: previousRevenueCents,
            },
            unwraps: {
                current: currentUnwraps,
                prior: previousUnwraps,
            },
            gumdrops: {
                current: {
                    rewardGd30d: currentRewardGd,
                    paidGd30d: currentPaidGd,
                    paidBonusGd30d: currentPaidBonusGd,
                },
                prior: {
                    rewardGd30d: previousRewardGd,
                    paidGd30d: previousPaidGd,
                    paidBonusGd30d: previousPaidBonusGd,
                },
                sourceMode: "materialized_summary",
            },
            supportBugs: {
                current: {
                    userBugReports30d: currentUserBugReports,
                    userSupportRequests30d: currentUserSupportRequests,
                },
                prior: {
                    userBugReports30d: previousUserBugReports,
                    userSupportRequests30d: previousUserSupportRequests,
                },
                sourceMode: "bounded_aggregate",
            },
        });

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
                : "Platform Pulse uses one rolling 30-day window across six stats. GumDrops keep paid/reward split metadata while Support/Bugs counts user-reported sources only.",
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
                liveDrops: liveDropsCount,
                totalDrops: drops.length,
                grossRevenueCents,
                totalUnwraps,
                currentWindowPurchases: currentPurchases,
                currentWindowNewUsers: currentNewUsers,
                userMetricsSnapshot: undefined,
            },
            deltas: {
                accounts: calculateOverviewMetricDelta(currentNewUsers, previousNewUsers),
                purchases: calculateOverviewMetricDelta(currentPurchases, previousPurchases),
                revenue: calculateOverviewMetricDelta(currentRevenueCents, previousRevenueCents),
                unwraps: calculateOverviewMetricDelta(currentUnwraps, previousUnwraps),
                gumdropsCirculation30d: calculateOverviewMetricDelta(currentRewardGd + currentPaidGd + currentPaidBonusGd, previousRewardGd + previousPaidGd + previousPaidBonusGd),
                supportBugs30d: calculateOverviewMetricDelta(currentUserBugReports + currentUserSupportRequests, previousUserBugReports + previousUserSupportRequests),
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
                revenueActiveDays,
                unwrapActiveDays,
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
                    liveDrops: liveDropsCount,
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
