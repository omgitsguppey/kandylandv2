import { NextRequest, NextResponse } from "next/server";
import type { User } from "firebase/auth";

import { adminDb, firebaseAdmin } from "@/lib/server/firebase-admin";
import { handleApiError } from "@/lib/server/auth";
import { ADMIN, HEAVY_READ } from "@/lib/server/rate-limit";
import { normalizeTransactionRecord } from "@/lib/transaction-normalizers";
import { normalizeUserProfile } from "@/lib/user-utils";
import { describeSecurityEvent } from "@/lib/security-events";
import { getDropReferenceMap, resolveDropTitle } from "@/lib/server/drop-references";
import { deriveGumdropEconomics } from "@/lib/gumdrop-economics";
import { buildModuleCoverageReport, buildParityInsight } from "@/lib/server/analytics-parity";
import { guardApiRequest } from "@/lib/server/request-guard";
import { CREATOR_COLLECTIONS, isCreatorRole } from "@/lib/creator-experiences";
import {
    buildSupportThreadKey,
    describeSupportState,
    getSupportPrimaryHandle,
    normalizeSupportThreadStatus,
    SUPPORT_COLLECTIONS,
} from "@/lib/support-readiness";

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

function readNumber(value: unknown, fallback = 0): number {
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readString(value: unknown, fallback = ""): string {
    return typeof value === "string" ? value : fallback;
}

function roundToSingleDecimal(value: number) {
    return Math.round((value + Number.EPSILON) * 10) / 10;
}

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ userId: string }> },
) {
    try {
        await guardApiRequest(request, {
            routeName: "admin/user-detail",
            preAuthRouteName: "admin/user-detail/preauth",
            preAuthRateLimit: HEAVY_READ,
            rateLimit: ADMIN,
            auth: "admin",
            scopeToCaller: true,
        });

        const { userId } = await context.params;
        const limitParam = Number(request.nextUrl.searchParams.get("limit") || 60);
        const historyLimit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 60;
        const securityHistoryLimit = Math.max(historyLimit, 1000);

        const userRef = adminDb.collection("users").doc(userId);
        const [userSnap, transactionsSnap, analyticsRollupSnap, analyticsFactsSnap, sessionFactsSnap, userDailySnapshot, securityEventsSnap, supportThreadSnap, feedbackSnap] = await Promise.all([
            userRef.get(),
            adminDb.collection("transactions")
                .where("userId", "==", userId)
                .orderBy("timestamp", "desc")
                .limit(historyLimit)
                .get(),
            adminDb.collection("analytics_users_rollup").doc(userId).get(),
            adminDb.collection("analytics_event_facts")
                .where("userId", "==", userId)
                .limit(400)
                .get(),
            adminDb.collection("analytics_session_facts")
                .where("userId", "==", userId)
                .get(),
            adminDb.collection("analytics_user_daily")
                .where("uid", "==", userId)
                .get(),
            adminDb.collection("security_events")
                .where("userId", "==", userId)
                .orderBy("timestamp", "desc")
                .limit(securityHistoryLimit)
                .get(),
            adminDb.collection(SUPPORT_COLLECTIONS.threads)
                .where("userId", "==", userId)
                .limit(20)
                .get(),
            adminDb.collection("platform_feedback")
                .where("userId", "==", userId)
                .limit(20)
                .get(),
        ]);

        if (!userSnap.exists) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const rawUser = userSnap.data() as Record<string, unknown>;
        const mockUser = {
            uid: userId,
            email: typeof rawUser.email === "string" ? rawUser.email : "",
            displayName: typeof rawUser.displayName === "string" ? rawUser.displayName : "",
            photoURL: typeof rawUser.photoURL === "string" ? rawUser.photoURL : "",
        } as User;

        const user = normalizeUserProfile(rawUser, mockUser);
        if (!user) {
            return NextResponse.json({ error: "User profile is malformed" }, { status: 500 });
        }

        const transactions = transactionsSnap.docs.flatMap((doc) => {
            try {
                const normalized = normalizeTransactionRecord(doc.data(), doc.id);
                const raw = doc.data() as Record<string, unknown>;
                const status = raw.status === "failed" || raw.error
                    ? "failed"
                    : raw.status === "pending"
                        ? "pending"
                        : "completed";

                return [{ ...normalized, status }];
            } catch {
                return [];
            }
        });

        const purchaseTransactions = transactions
            .filter((transaction) => transaction.status === "completed" && transaction.type === "purchase_currency")
            .map((transaction) => ({
                ...transaction,
                economics: deriveGumdropEconomics(
                    transaction.deliveredGumDrops ?? transaction.amount,
                    transaction.grossRevenueUsd ?? transaction.cost ?? 0,
                    {
                        paypalFeeUsd: transaction.paypalFeeUsd,
                        netRevenueUsd: transaction.netRevenueUsd,
                    },
                ),
            }));
        const completedUnlockTransactions = transactions
            .filter((transaction) => transaction.status === "completed" && transaction.type === "unlock_content");

        const analyticsRollup = analyticsRollupSnap.exists
            ? analyticsRollupSnap.data() as Record<string, unknown>
            : {};
        const sessionFacts = sessionFactsSnap.docs.map((doc) => {
            const data = doc.data() as Record<string, unknown>;
            return {
                id: doc.id,
                dropId: readString(data.dropId),
                dropTitle: readString(data.dropTitle),
                userId: readString(data.userId),
                username: readString(data.username),
                startedCount: readNumber(data.startedCount),
                completedCount: readNumber(data.completedCount),
                watchSecondsTotal: readNumber(data.watchSecondsTotal),
                loadMsTotal: readNumber(data.loadMsTotal),
                loadSampleCount: readNumber(data.loadSampleCount),
                lastEventAt: toTimestampNumber(data.lastEventAt) || toTimestampNumber(data.lastEventAtMs),
            };
        });
        const userDaily = userDailySnapshot.docs.map((doc) => doc.data() as Record<string, unknown>);

        const analyticsFacts = analyticsFactsSnap.docs
            .map((doc) => {
                const data = doc.data() as Record<string, unknown>;
                return {
                    id: doc.id,
                    eventName: readString(data.eventName),
                    timestamp: toTimestampNumber(data.timestamp),
                    dropId: readString(data.dropId),
                    dropTitle: readString(data.dropTitle),
                    sessionWatchSeconds: readNumber(data.sessionWatchSeconds),
                    watchSeconds: readNumber(data.watchSeconds),
                    loadMs: readNumber(data.loadMs),
                };
            })
            .sort((left, right) => right.timestamp - left.timestamp);

        const referencedDropIds = [
            ...analyticsFacts.map((event) => event.dropId).filter(Boolean),
            ...transactions.map((transaction) => transaction.relatedDropId || "").filter(Boolean),
            ...(user.unlockedContent || []),
            ...securityEventsSnap.docs.map((doc) => {
                const data = doc.data() as Record<string, unknown>;
                return readString(data.dropId);
            }).filter(Boolean),
        ];
        const dropReferences = await getDropReferenceMap(referencedDropIds);

        const realtimeUserSnap = await firebaseAdmin.database().ref(`telemetry/users/${userId}`).get();
        const realtimeUserData = realtimeUserSnap.val() || {};
        const realtimeEvents = Object.values(realtimeUserData) as any[];

        const isNewerThanFacts = (rtEvent: any) => {
            const timestamp = typeof rtEvent?.timestamp === "number" ? rtEvent.timestamp : 0;
            return timestamp > (analyticsFacts[0]?.timestamp || 0); // facts are sorted desc, so [0] is the latest
        };

        const realtimePurchaseVerified = realtimeEvents.filter((e) => e.eventName === "purchase_verified" && isNewerThanFacts(e)).length;
        const realtimePurchaseCompleted = realtimeEvents.filter((e) => e.eventName === "gumdrops_purchase_completed" && isNewerThanFacts(e)).length;
        const realtimePurchases = realtimePurchaseVerified > 0 ? realtimePurchaseVerified : realtimePurchaseCompleted;
        const realtimeUnlocks = realtimeEvents.filter((e) => e.eventName === "unlock_drop_success" && isNewerThanFacts(e)).length;
        const realtimeViewerSessionStarted = realtimeEvents.filter((e) => e.eventName === "viewer_session_started" && isNewerThanFacts(e)).length;
        const realtimeViewerOpened = realtimeEvents.filter((e) => e.eventName === "viewer_opened" && isNewerThanFacts(e)).length;
        const realtimeAssetStarted = realtimeEvents.filter((e) => e.eventName === "viewer_asset_started" && isNewerThanFacts(e)).length;
        const realtimeAssetCompleted = realtimeEvents.filter((e) => e.eventName === "viewer_asset_completed" && isNewerThanFacts(e)).length;
        const realtimeSourceDownloaded = realtimeEvents.filter((e) => e.eventName === "viewer_source_downloaded" && isNewerThanFacts(e)).length;
        const realtimeRelatedClick = realtimeEvents.filter((e) => e.eventName === "viewer_related_drop_clicked" && isNewerThanFacts(e)).length;

        const directViewSessionCount = analyticsFacts.filter((event) => event.eventName === "viewer_session_started").length + realtimeViewerSessionStarted;
        const directViewerOpenedCount = analyticsFacts.filter((event) => event.eventName === "viewer_opened").length + realtimeViewerOpened;
        const directAssetViewCount = analyticsFacts.filter((event) => event.eventName === "viewer_asset_started").length + realtimeAssetStarted;
        const directAssetCompletionCount = analyticsFacts.filter((event) => event.eventName === "viewer_asset_completed").length + realtimeAssetCompleted;
        const directDownloadCount = analyticsFacts.filter((event) => event.eventName === "viewer_source_downloaded").length + realtimeSourceDownloaded;
        const directRelatedClickCount = analyticsFacts.filter((event) => event.eventName === "viewer_related_drop_clicked").length + realtimeRelatedClick;
        const directUnwrapCount = analyticsFacts.filter((event) => event.eventName === "unlock_drop_success").length + realtimeUnlocks;
        const purchaseVerifiedFactCount = analyticsFacts.filter((event) => event.eventName === "purchase_verified").length;
        const purchaseCompletedFactCount = analyticsFacts.filter((event) => event.eventName === "gumdrops_purchase_completed").length;
        const directPurchaseCount = (purchaseVerifiedFactCount > 0 ? purchaseVerifiedFactCount : purchaseCompletedFactCount) + realtimePurchases;
        const directEventCount = analyticsFacts.length + realtimeEvents.filter(isNewerThanFacts).length;
        const directLastSeenAt = Math.max(
            analyticsFacts.reduce((latest, event) => Math.max(latest, event.timestamp), 0),
            realtimeEvents.reduce((latest, event) => Math.max(latest, typeof event?.timestamp === "number" ? event.timestamp : 0), 0)
        );
        const completedSessionWatchSeconds = analyticsFacts.reduce((total, event) => {
            if (event.eventName !== "viewer_session_completed") {
                return total;
            }

            return total + Math.max(event.sessionWatchSeconds, event.watchSeconds, 0);
        }, 0) + realtimeEvents.filter((e) => e.eventName === "viewer_session_completed" && isNewerThanFacts(e)).reduce((total, event) => {
            const sessionWatchSeconds = typeof event.sessionWatchSeconds === "number" ? event.sessionWatchSeconds : 0;
            const watchSeconds = typeof event.watchSeconds === "number" ? event.watchSeconds : 0;
            return total + Math.max(sessionWatchSeconds, watchSeconds, 0);
        }, 0);
        const loadSamples = analyticsFacts.filter((event) => event.loadMs > 0).map((event) => event.loadMs);
        const directAvgLoadMs = loadSamples.length > 0
            ? Math.round(loadSamples.reduce((sum, value) => sum + value, 0) / loadSamples.length)
            : 0;
        const sessionFactViewCount = sessionFacts.reduce((sum, fact) => sum + fact.startedCount, 0);
        const sessionFactCompletionCount = sessionFacts.reduce((sum, fact) => sum + fact.completedCount, 0);
        const sessionFactWatchSeconds = sessionFacts.reduce((sum, fact) => sum + fact.watchSecondsTotal, 0);
        const sessionFactLoadMsTotal = sessionFacts.reduce((sum, fact) => sum + fact.loadMsTotal, 0);
        const sessionFactLoadSampleCount = sessionFacts.reduce((sum, fact) => sum + fact.loadSampleCount, 0);
        const sessionFactLastSeenAt = sessionFacts.reduce((latest, fact) => Math.max(latest, fact.lastEventAt), 0);
        const dailyEventCount = userDaily.reduce((sum, day) => sum + readNumber(day.eventCount), 0);
        const dailyUnwrapCount = userDaily.reduce((sum, day) => sum + Math.max(readNumber(day.unwrapCount), readNumber(day.unlockCount)), 0);
        const dailyPurchaseCount = userDaily.reduce((sum, day) => sum + Math.max(readNumber(day.purchaseCount), readNumber(day.purchaseTransactionCount)), 0);
        const dailyLastSeenAt = userDaily.reduce((latest, day) => Math.max(latest, toTimestampNumber(day.lastSeenAt), toTimestampNumber(day.lastSeenAtMs)), 0);
        const rollupPurchaseCount = Math.max(readNumber(analyticsRollup.purchaseCount), readNumber(analyticsRollup.purchaseTransactionCount));
        const rollupUnlockCount = Math.max(readNumber(analyticsRollup.unwrapCount), readNumber(analyticsRollup.unlockCount));

        const viewedDrops = new Map<string, { dropId: string; dropTitle: string; views: number; watchSeconds: number }>();
        analyticsFacts.forEach((event) => {
            if (!event.dropId) {
                return;
            }

            const isViewSignal = event.eventName === "viewer_session_started" || event.eventName === "viewer_opened";
            const isWatchSignal = event.eventName === "viewer_session_completed";

            if (!isViewSignal && !isWatchSignal) {
                return;
            }

            const existing = viewedDrops.get(event.dropId) ?? {
                dropId: event.dropId,
                dropTitle: resolveDropTitle(dropReferences, event.dropId, event.dropTitle),
                views: 0,
                watchSeconds: 0,
            };

            if (isViewSignal) {
                existing.views += 1;
            }

            if (isWatchSignal) {
                existing.watchSeconds += Math.max(event.sessionWatchSeconds, event.watchSeconds, 0);
            }

            viewedDrops.set(event.dropId, existing);
        });
        sessionFacts.forEach((fact) => {
            if (!fact.dropId) {
                return;
            }

            const existing = viewedDrops.get(fact.dropId) ?? {
                dropId: fact.dropId,
                dropTitle: resolveDropTitle(dropReferences, fact.dropId, fact.dropTitle),
                views: 0,
                watchSeconds: 0,
            };
            existing.views += fact.startedCount;
            existing.watchSeconds += fact.watchSecondsTotal;
            viewedDrops.set(fact.dropId, existing);
        });

        const rollupWatchSeconds = readNumber(analyticsRollup.watchSecondsTotal);
        const rollupLoadSampleCount = readNumber(analyticsRollup.loadSampleCount);
        const rollupLoadMsTotal = readNumber(analyticsRollup.loadMsTotal);
        const rollupAvgLoadMs = rollupLoadSampleCount > 0 ? Math.round(rollupLoadMsTotal / rollupLoadSampleCount) : 0;
        const transactionGrossRevenueUsd = purchaseTransactions.reduce((sum, transaction) => sum + transaction.economics.grossRevenueUsd, 0);
        const transactionNetRevenueUsd = purchaseTransactions.reduce((sum, transaction) => sum + transaction.economics.netRevenueUsd, 0);
        const transactionPaypalFeeUsd = purchaseTransactions.reduce((sum, transaction) => sum + transaction.economics.paypalFeeUsd, 0);
        const transactionAdjustedProfitUsd = purchaseTransactions.reduce((sum, transaction) => sum + transaction.economics.adjustedProfitUsd, 0);
        const transactionBonusValueUsd = purchaseTransactions.reduce((sum, transaction) => sum + transaction.economics.bonusValueUsd, 0);
        const transactionBonusGumDrops = purchaseTransactions.reduce((sum, transaction) => sum + transaction.economics.bonusGumDrops, 0);
        const transactionDeliveredGumDrops = purchaseTransactions.reduce((sum, transaction) => sum + transaction.economics.deliveredGumDrops, 0);
        const transactionPaidGumDrops = purchaseTransactions.reduce((sum, transaction) => sum + transaction.economics.paidGumDrops, 0);
        const unlockSpendGdTotal = transactions
            .filter((transaction) => transaction.status === "completed" && transaction.type === "unlock_content")
            .reduce((sum, transaction) => sum + transaction.amount, 0);
        const purchaseSourceCounts = [
            { key: "transactions", label: "Transactions", count: purchaseTransactions.length },
            { key: "rollup", label: "User rollup", count: rollupPurchaseCount },
            { key: "daily", label: "Daily rollups", count: dailyPurchaseCount },
            { key: "facts", label: purchaseVerifiedFactCount > 0 ? "Server facts" : "Telemetry facts", count: directPurchaseCount },
        ];
        const unlockSourceCounts = [
            { key: "transactions", label: "Transactions", count: completedUnlockTransactions.length },
            { key: "rollup", label: "User rollup", count: rollupUnlockCount },
            { key: "daily", label: "Daily rollups", count: dailyUnwrapCount },
            { key: "facts", label: "Event facts", count: directUnwrapCount },
        ];
        const purchaseParity = buildParityInsight(purchaseSourceCounts, { tolerance: 1, relativeTolerance: 0.2 });
        const unlockParity = buildParityInsight(unlockSourceCounts, { tolerance: 1, relativeTolerance: 0.2 });
        const parityScore = Math.round((purchaseParity.score + unlockParity.score) / 2);
        const moduleCoverage = [
            buildModuleCoverageReport({
                key: "purchases",
                label: "Purchases",
                sources: purchaseSourceCounts,
                emptyDetail: "No purchase activity landed for this user across transactions, rollups, daily aggregates, or event facts.",
            }),
            buildModuleCoverageReport({
                key: "unlocks",
                label: "Unlocks",
                sources: unlockSourceCounts,
                emptyDetail: "No unlock activity landed for this user across transactions, rollups, daily aggregates, or event facts.",
            }),
        ];
        const validations = [
            {
                label: "Purchase parity",
                status: purchaseParity.status,
                detail: `${purchaseTransactions.length.toLocaleString()} completed transactions, ${rollupPurchaseCount.toLocaleString()} user-rollup purchases, ${dailyPurchaseCount.toLocaleString()} daily purchases, and ${directPurchaseCount.toLocaleString()} purchase facts. Confidence ${purchaseParity.score}%.`,
            },
            {
                label: "Unlock parity",
                status: unlockParity.status,
                detail: `${completedUnlockTransactions.length.toLocaleString()} completed unlock transactions, ${rollupUnlockCount.toLocaleString()} user-rollup unlocks, ${dailyUnwrapCount.toLocaleString()} daily unlocks, and ${directUnwrapCount.toLocaleString()} unlock facts. Confidence ${unlockParity.score}%.`,
            },
            {
                label: "Coverage",
                status: moduleCoverage.every((module) => module.status === "healthy")
                    ? "pass"
                    : moduleCoverage.some((module) => module.status === "empty")
                        ? "fail"
                        : "warn",
                detail: `${moduleCoverage.filter((module) => module.status === "healthy").length.toLocaleString()}/${moduleCoverage.length.toLocaleString()} tracked modules are fully covered for this user. Parity score ${parityScore}%.`,
            },
        ];
        const normalizedPurchaseCount = purchaseTransactions.length > 0
            ? purchaseTransactions.length
            : Math.max(rollupPurchaseCount, dailyPurchaseCount, directPurchaseCount);
        const normalizedUnlockCount = completedUnlockTransactions.length > 0
            ? completedUnlockTransactions.length
            : Math.max(rollupUnlockCount, dailyUnwrapCount, directUnwrapCount);

        const analytics = {
            eventCount: Math.max(readNumber(analyticsRollup.eventCount), directEventCount, dailyEventCount),
            unwrapCount: normalizedUnlockCount,
            purchaseCount: normalizedPurchaseCount,
            viewerSessionCount: Math.max(readNumber(analyticsRollup.sessionCount), directViewSessionCount || directViewerOpenedCount, sessionFactViewCount),
            viewerCompletionCount: Math.max(analyticsFacts.filter((event) => event.eventName === "viewer_session_completed").length, sessionFactCompletionCount),
            assetViewCount: directAssetViewCount,
            assetCompletionCount: directAssetCompletionCount,
            uniqueViewedDrops: viewedDrops.size,
            watchSecondsTotal: Math.max(rollupWatchSeconds, completedSessionWatchSeconds, sessionFactWatchSeconds),
            watchHours: roundToSingleDecimal(Math.max(rollupWatchSeconds, completedSessionWatchSeconds, sessionFactWatchSeconds) / 3600),
            viewCount: Math.max(directViewSessionCount || directViewerOpenedCount, sessionFactViewCount),
            downloadCount: directDownloadCount,
            relatedClickCount: directRelatedClickCount,
            avgLoadMs: Math.max(
                rollupAvgLoadMs,
                directAvgLoadMs,
                sessionFactLoadSampleCount > 0 ? Math.round(sessionFactLoadMsTotal / sessionFactLoadSampleCount) : 0,
            ),
            lastSeenAt: Math.max(readNumber(analyticsRollup.lastSeenAt), readNumber(analyticsRollup.lastSeenAtMs), directLastSeenAt, sessionFactLastSeenAt, dailyLastSeenAt),
            grossRevenueUsd: Math.max(readNumber(analyticsRollup.grossRevenueUsdTotal), transactionGrossRevenueUsd),
            netRevenueUsd: Math.max(readNumber(analyticsRollup.netRevenueUsdTotal), transactionNetRevenueUsd),
            paypalFeeUsd: Math.max(readNumber(analyticsRollup.paypalFeeUsdTotal), transactionPaypalFeeUsd),
            adjustedProfitUsd: Math.max(readNumber(analyticsRollup.adjustedProfitUsdTotal), transactionAdjustedProfitUsd),
            bonusValueUsd: Math.max(readNumber(analyticsRollup.bonusValueUsdTotal), transactionBonusValueUsd),
            bonusGumDrops: Math.max(readNumber(analyticsRollup.bonusGumDropsTotal), transactionBonusGumDrops),
            deliveredGumDrops: Math.max(readNumber(analyticsRollup.deliveredGumDropsTotal), transactionDeliveredGumDrops),
            paidGumDrops: Math.max(readNumber(analyticsRollup.paidGumDropsTotal), transactionPaidGumDrops),
            unlockSpendGdTotal: Math.max(readNumber(analyticsRollup.spendGdTotal), readNumber(analyticsRollup.unlockSpendGdTotal), unlockSpendGdTotal),
            topViewedDrops: Array.from(viewedDrops.values())
                .sort((left, right) => {
                    if (right.views !== left.views) {
                        return right.views - left.views;
                    }

                    return right.watchSeconds - left.watchSeconds;
                })
                .slice(0, 6),
            parity: {
                score: parityScore,
                purchase: {
                    ...purchaseParity,
                    sources: purchaseSourceCounts,
                    canonicalCount: normalizedPurchaseCount,
                },
                unlock: {
                    ...unlockParity,
                    sources: unlockSourceCounts,
                    canonicalCount: normalizedUnlockCount,
                },
                coverage: moduleCoverage,
                validations,
            },
        };

        const securityEvents = securityEventsSnap.docs
            .map((doc) => {
                const data = doc.data() as Record<string, unknown>;
                const descriptor = describeSecurityEvent(readString(data.reason));
                return {
                    id: doc.id,
                    reason: descriptor.reason,
                    label: readString(data.label) || descriptor.label,
                    message: readString(data.message) || descriptor.message,
                    locationLabel: readString(data.locationLabel) || descriptor.locationLabel,
                    severity: readString(data.severity) || descriptor.severity,
                    dropId: readString(data.dropId) || null,
                    dropTitle: readString(data.dropId) ? resolveDropTitle(dropReferences, readString(data.dropId)) : null,
                    pagePath: readString(data.pagePath) || null,
                    sessionId: readString(data.sessionId) || null,
                    contentKind: readString(data.contentKind) || null,
                    assetKey: readString(data.assetKey) || null,
                    assetIndex: readNumber(data.assetIndex, -1),
                    timestamp: toTimestampNumber(data.timestamp) || toTimestampNumber(data.createdAt),
                };
            })
            .sort((left, right) => right.timestamp - left.timestamp);

        if (securityEvents.length === 0 && user.securityFlags?.ripAttempts) {
            const descriptor = describeSecurityEvent(user.securityFlags.lastViolationReason);
            securityEvents.push({
                id: "legacy-last-violation",
                reason: descriptor.reason,
                label: descriptor.label,
                message: user.securityFlags.lastViolationMessage || descriptor.message,
                locationLabel: descriptor.locationLabel,
                severity: descriptor.severity,
                dropId: user.securityFlags.lastViolationDropId || null,
                dropTitle: user.securityFlags.lastViolationDropId
                    ? resolveDropTitle(dropReferences, user.securityFlags.lastViolationDropId)
                    : null,
                pagePath: null,
                sessionId: null,
                contentKind: null,
                assetKey: null,
                assetIndex: -1,
                timestamp: user.securityFlags.lastViolation ? new Date(user.securityFlags.lastViolation).getTime() : 0,
            });
        }

        const last30DaysMs = Date.now() - (30 * 24 * 60 * 60 * 1000);
        const legacyReasonCounts = user.securityFlags?.reasonCounts ?? {};
        const eventReasonCounts = securityEvents.reduce<Record<string, number>>((acc, event) => {
            acc[event.reason] = (acc[event.reason] || 0) + 1;
            return acc;
        }, {});
        const mergedReasonCounts = Object.entries({
            ...legacyReasonCounts,
            ...eventReasonCounts,
        })
            .map(([reason, count]) => {
                const descriptor = describeSecurityEvent(reason);
                return {
                    reason: descriptor.reason,
                    label: descriptor.label,
                    count: Math.max(readNumber(count), eventReasonCounts[reason] || 0),
                };
            })
            .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
        const securitySummary = {
            allTimeCount: Math.max(user.securityFlags?.ripAttempts || 0, securityEvents.length),
            last30DaysCount: securityEvents.filter((event) => event.timestamp >= last30DaysMs).length,
            lastViolationAt: user.securityFlags?.lastViolation || securityEvents[0]?.timestamp || null,
            lastViolationReason: describeSecurityEvent(user.securityFlags?.lastViolationReason || securityEvents[0]?.reason).label,
            reasons: mergedReasonCounts,
        };

        const supportThreads = supportThreadSnap.docs
            .map((doc) => {
                const data = doc.data() as Record<string, unknown>;
                return {
                    id: doc.id,
                    status: normalizeSupportThreadStatus(data.status),
                    channel: (() => {
                        const channel = readString(data.channel);
                        if (channel === "email" || channel === "feedback" || channel === "system") {
                            return channel;
                        }
                        return "in_app";
                    })(),
                    subject: readString(data.subject) || null,
                    lastMessageAt: Math.max(
                        toTimestampNumber(data.lastMessageAt),
                        toTimestampNumber(data.updatedAt),
                        toTimestampNumber(data.createdAt),
                    ),
                    createdAt: Math.max(
                        toTimestampNumber(data.createdAt),
                        toTimestampNumber(data.updatedAt),
                    ),
                };
            })
            .sort((left, right) => right.lastMessageAt - left.lastMessageAt);

        const supportFeedback = feedbackSnap.docs
            .map((doc) => {
                const data = doc.data() as Record<string, unknown>;
                return {
                    id: doc.id,
                    summary: readString(data.summary) || readString(data.message) || "Support signal",
                    status: readString(data.status, "new"),
                    timestamp: Math.max(toTimestampNumber(data.timestamp), toTimestampNumber(data.updatedAt)),
                    path: readString(data.currentPath) || null,
                };
            })
            .sort((left, right) => right.timestamp - left.timestamp);

        const openSupportThreads = supportThreads.filter((thread) => thread.status === "open" || thread.status === "waiting_on_support" || thread.status === "waiting_on_user");
        const derivedSupportState = openSupportThreads.some((thread) => thread.status === "waiting_on_support")
            ? "waiting_on_support"
            : openSupportThreads.some((thread) => thread.status === "waiting_on_user")
                ? "waiting_on_user"
                : openSupportThreads.length > 0
                    ? "open"
                    : supportThreads.length > 0
                        ? "resolved"
                        : "ready";
        const supportState = describeSupportState(derivedSupportState);
        const latestSupportThreadAt = supportThreads[0]?.lastMessageAt || 0;
        const latestSupportFeedbackAt = supportFeedback[0]?.timestamp || 0;
        const supportReadiness = {
            summary: {
                threadKey: buildSupportThreadKey(userId),
                state: derivedSupportState,
                stateLabel: supportState,
                stateDescription: supportState,
                totalThreads: supportThreads.length,
                openThreads: openSupportThreads.length,
                bugReportCount: supportFeedback.length,
                lastSupportAt: Math.max(latestSupportThreadAt, latestSupportFeedbackAt),
                lastSupportSource: latestSupportThreadAt >= latestSupportFeedbackAt && latestSupportThreadAt > 0
                    ? "support_thread"
                    : latestSupportFeedbackAt > 0
                        ? "feedback"
                        : "none",
                primaryHandle: getSupportPrimaryHandle({
                    username: user.username,
                    displayName: user.displayName,
                    email: user.email,
                    uid: user.uid,
                }),
                channels: {
                    email: Boolean(user.email),
                    inApp: Boolean(user.uid),
                    browserPush: user.notificationSettings?.browserPushEnabled === true,
                },
            },
            threads: supportThreads.slice(0, 6),
            signals: [
                ...supportThreads.slice(0, 3).map((thread) => ({
                    id: `thread:${thread.id}`,
                    kind: "thread" as const,
                    summary: thread.subject || "Support thread ready",
                    status: thread.status,
                    timestamp: thread.lastMessageAt,
                    path: null,
                })),
                ...supportFeedback.slice(0, 4).map((feedback) => ({
                    id: `feedback:${feedback.id}`,
                    kind: "feedback" as const,
                    summary: feedback.summary,
                    status: feedback.status,
                    timestamp: feedback.timestamp,
                    path: feedback.path,
                })),
            ]
                .sort((left, right) => right.timestamp - left.timestamp)
                .slice(0, 6),
        };

        let creatorOps: Record<string, unknown> | null = null;
        if (isCreatorRole(user.role)) {
            const [
                relationshipSnap,
                subscriptionSnap,
                requestSnap,
                bookingSnap,
                payoutSnap,
                accrualSnap,
                threadSnap,
                messageSnap,
                broadcastSnap,
                pendingSubmissionSnap,
            ] = await Promise.all([
                adminDb.collection(CREATOR_COLLECTIONS.relationships).where("creatorId", "==", userId).get(),
                adminDb.collection(CREATOR_COLLECTIONS.subscriptions).where("creatorId", "==", userId).get(),
                adminDb.collection(CREATOR_COLLECTIONS.requests).where("creatorId", "==", userId).orderBy("createdAt", "desc").limit(10).get(),
                adminDb.collection(CREATOR_COLLECTIONS.bookings).where("creatorId", "==", userId).orderBy("startAt", "desc").limit(10).get(),
                adminDb.collection(CREATOR_COLLECTIONS.payoutRequests).where("creatorId", "==", userId).orderBy("createdAt", "desc").limit(10).get(),
                adminDb.collection(CREATOR_COLLECTIONS.ledgerAccruals).where("creatorId", "==", userId).orderBy("createdAt", "desc").limit(10).get(),
                adminDb.collection(CREATOR_COLLECTIONS.messageThreads).where("creatorId", "==", userId).orderBy("lastMessageAt", "desc").limit(12).get(),
                adminDb.collection(CREATOR_COLLECTIONS.messages).where("creatorId", "==", userId).orderBy("createdAt", "desc").limit(20).get(),
                adminDb.collection(CREATOR_COLLECTIONS.broadcasts).where("creatorId", "==", userId).orderBy("createdAtMs", "desc").limit(6).get(),
                adminDb.collection("drops").where("submittedByCreatorId", "==", userId).get(),
            ]);

            const relationshipSummary = relationshipSnap.docs.reduce((acc, doc) => {
                const data = doc.data() as Record<string, unknown>;
                if (data.following === true) {
                    acc.followerCount += 1;
                }
                if (data.favorited === true) {
                    acc.favoriteCount += 1;
                }
                if (data.notificationsEnabled === true) {
                    acc.notificationsEnabledCount += 1;
                }
                return acc;
            }, {
                followerCount: 0,
                favoriteCount: 0,
                notificationsEnabledCount: 0,
            });

            const subscriptions: Array<Record<string, unknown> & { id: string }> = subscriptionSnap.docs
                .map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }) as Record<string, unknown> & { id: string })
                .sort((left, right) => toTimestampNumber(right["renewAt"]) - toTimestampNumber(left["renewAt"]));
            const requests: Array<Record<string, unknown> & { id: string }> = requestSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }) as Record<string, unknown> & { id: string });
            const bookings: Array<Record<string, unknown> & { id: string }> = bookingSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }) as Record<string, unknown> & { id: string });
            const payouts: Array<Record<string, unknown> & { id: string }> = payoutSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }) as Record<string, unknown> & { id: string });
            const accruals: Array<Record<string, unknown> & { id: string }> = accrualSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }) as Record<string, unknown> & { id: string });
            const threads: Array<Record<string, unknown> & { id: string }> = threadSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }) as Record<string, unknown> & { id: string });
            const messages: Array<Record<string, unknown> & { id: string }> = messageSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }) as Record<string, unknown> & { id: string });
            const broadcasts: Array<Record<string, unknown> & { id: string }> = broadcastSnap.docs
                .map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }) as Record<string, unknown> & { id: string })
                .filter((entry) => entry["removedAt"] === undefined);
            const pendingSubmissions = pendingSubmissionSnap.docs
                .map((doc) => ({
                    id: doc.id,
                    title: readString((doc.data() as Record<string, unknown>).title, "Untitled drop"),
                    approvalStatus: readString((doc.data() as Record<string, unknown>).approvalStatus, "approved"),
                    validFrom: toTimestampNumber((doc.data() as Record<string, unknown>).validFrom),
                }))
                .sort((left, right) => right.validFrom - left.validFrom);

            creatorOps = {
                summary: {
                    ...relationshipSummary,
                    activeSubscribers: subscriptions.filter((entry) => entry.status === "active").length,
                    lapsedSubscribers: subscriptions.filter((entry) => entry.status === "lapsed").length,
                    openRequests: requests.filter((entry) => entry.status === "pending").length,
                    bookedCalls: bookings.filter((entry) => entry.status === "booked").length,
                    completedCalls: bookings.filter((entry) => entry.status === "completed").length,
                    pendingPayouts: payouts.filter((entry) => entry.status === "pending").length,
                    openThreads: threads.length,
                    pendingDropSubmissions: pendingSubmissions.filter((entry) => entry.approvalStatus === "pending_review").length,
                    totalAccruedGd: accruals.reduce((sum, entry) => sum + (typeof entry.creatorShareGd === "number" ? entry.creatorShareGd : 0), 0),
                    pendingCashoutGd: payouts
                        .filter((entry) => entry.status === "pending")
                        .reduce((sum, entry) => sum + (typeof entry.requestedGd === "number" ? entry.requestedGd : 0), 0),
                    broadcasts: broadcasts.length,
                },
                subscriptions: subscriptions.slice(0, 10),
                requests,
                bookings,
                payouts,
                accruals,
                threads,
                messages,
                broadcasts,
                pendingSubmissions,
            };
        }

        return NextResponse.json({
            success: true,
            user,
            transactions,
            analytics,
            securitySummary,
            securityEvents,
            supportReadiness,
            creatorOps,
            dropReferences,
        });
    } catch (error) {
        return handleApiError(error, "Admin.UserDetail.GET");
    }
}
