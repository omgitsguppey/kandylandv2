import { NextRequest, NextResponse } from "next/server";
import type { User } from "firebase/auth";

import { adminDb } from "@/lib/server/firebase-admin";
import { verifyAdmin, handleApiError } from "@/lib/server/auth";
import { checkRateLimit, ADMIN } from "@/lib/server/rate-limit";
import { normalizeTransactionRecord } from "@/lib/transaction-normalizers";
import { normalizeUserProfile } from "@/lib/user-utils";
import { describeSecurityEvent } from "@/lib/security-events";
import { getDropReferenceMap, resolveDropTitle } from "@/lib/server/drop-references";
import { deriveGumdropEconomics } from "@/lib/gumdrop-economics";
import { buildModuleCoverageReport, buildParityInsight } from "@/lib/server/analytics-parity";

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
        await checkRateLimit(request, "admin/user-detail", ADMIN);
        await verifyAdmin(request);

        const { userId } = await context.params;
        const limitParam = Number(request.nextUrl.searchParams.get("limit") || 60);
        const historyLimit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 60;
        const securityHistoryLimit = Math.max(historyLimit, 1000);

        const userRef = adminDb.collection("users").doc(userId);
        const [userSnap, transactionsSnap, analyticsRollupSnap, analyticsFactsSnap, sessionFactsSnap, userDailySnapshot, securityEventsSnap] = await Promise.all([
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

        const directViewSessionCount = analyticsFacts.filter((event) => event.eventName === "viewer_session_started").length;
        const directViewerOpenedCount = analyticsFacts.filter((event) => event.eventName === "viewer_opened").length;
        const directAssetViewCount = analyticsFacts.filter((event) => event.eventName === "viewer_asset_started").length;
        const directAssetCompletionCount = analyticsFacts.filter((event) => event.eventName === "viewer_asset_completed").length;
        const directDownloadCount = analyticsFacts.filter((event) => event.eventName === "viewer_source_downloaded").length;
        const directRelatedClickCount = analyticsFacts.filter((event) => event.eventName === "viewer_related_drop_clicked").length;
        const directUnwrapCount = analyticsFacts.filter((event) => event.eventName === "unlock_drop_success").length;
        const purchaseVerifiedFactCount = analyticsFacts.filter((event) => event.eventName === "purchase_verified").length;
        const purchaseCompletedFactCount = analyticsFacts.filter((event) => event.eventName === "gumdrops_purchase_completed").length;
        const directPurchaseCount = purchaseVerifiedFactCount > 0 ? purchaseVerifiedFactCount : purchaseCompletedFactCount;
        const directEventCount = analyticsFacts.length;
        const directLastSeenAt = analyticsFacts.reduce((latest, event) => Math.max(latest, event.timestamp), 0);
        const completedSessionWatchSeconds = analyticsFacts.reduce((total, event) => {
            if (event.eventName !== "viewer_session_completed") {
                return total;
            }

            return total + Math.max(event.sessionWatchSeconds, event.watchSeconds, 0);
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

        return NextResponse.json({
            success: true,
            user,
            transactions,
            analytics,
            securitySummary,
            securityEvents,
            dropReferences,
        });
    } catch (error) {
        return handleApiError(error, "Admin.UserDetail.GET");
    }
}
