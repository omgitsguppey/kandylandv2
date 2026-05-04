import { NextRequest, NextResponse } from "next/server";
import type { User } from "firebase/auth";

import { adminDb } from "@/lib/server/firebase-admin";
import { handleApiError } from "@/lib/server/auth";
import { ADMIN, HEAVY_READ } from "@/lib/server/rate-limit";
import { normalizeTransactionRecord } from "@/lib/transaction-normalizers";
import { normalizeUserProfile } from "@/lib/user-utils";
import { describeSecurityEvent } from "@/lib/security-events";
import { getDropReferenceMap, resolveDropTitle } from "@/lib/server/drop-references";
import { deriveGumdropEconomics } from "@/lib/gumdrop-economics";
import { recordRouteWarning } from "@/lib/server/route-diagnostics";
import { buildServerAdminModuleVerification } from "@/lib/server/admin-source-verification";
import { buildModuleCoverageReport, buildParityInsight } from "@/lib/server/analytics-parity";
import { guardApiRequest } from "@/lib/server/request-guard";
import { CREATOR_COLLECTIONS, isCreatorRole } from "@/lib/creator-experiences";
import { buildCommerceMetricsFromRollup } from "@/lib/admin-user-commerce";
import {
    buildAdminUserMetricIntegrity,
} from "@/lib/admin-user-metrics";
import { buildUserBehaviorRollup } from "@/lib/server/user-behavior-rollup";
import { buildWatchTimeRollupFromRecords } from "@/lib/server/watch-time-rollup";
import {
    buildUserEngagementScoreInputFromActivityDays,
    type UserEngagementActivityDay,
} from "@/lib/behavioral/user-engagement-score";
import {
    buildUserValueScoreInputFromActivityDays,
    type UserValueActivityDay,
} from "@/lib/behavioral/user-value-score";
import {
    toUserActionLedgerItem,
} from "@/lib/analytics-action-taxonomy";
import { BEHAVIORAL_EVENT_FACT_VERSION } from "@/lib/behavioral/event-fact-contract";
import { normalizeBehavioralEventFactWithDiagnostics } from "@/lib/behavioral/normalize-event-fact";
import { buildBehavioralEventFactRollup } from "@/lib/server/event-fact-rollup";
import {
    buildCreatorOnboardingCanonicalRecord,
    normalizeCreatorOnboardingCanonicalRecord,
    normalizeCreatorOnboardingHistoryEntry,
} from "@/lib/creator-onboarding";
import { normalizeCreatorAdminDetail } from "@/lib/creator-onboarding-projection";
import {
    CREATOR_ONBOARDING_COLLECTION,
    CREATOR_ONBOARDING_HISTORY_SUBCOLLECTION,
} from "@/lib/server/creator-onboarding";
import {
    buildSupportThreadKey,
    describeSupportState,
    describeSupportStateDetail,
    getSupportPrimaryHandle,
    normalizeSupportThreadCategory,
    normalizeSupportThreadStatus,
    SUPPORT_COLLECTIONS,
} from "@/lib/support-readiness";
import {
    buildBehavioralRecommendationState,
    buildDeterministicDropRecommendations,
    getBehavioralUserProfile,
} from "@/lib/server/behavioral-intelligence";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";
import { buildNotFoundResponse } from "@/lib/server/not-found";

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

function buildUserEngagementDay(raw: Record<string, unknown>): UserEngagementActivityDay {
    const timestampMs = Math.max(
        toTimestampNumber(raw.lastSeenAt),
        toTimestampNumber(raw.lastSeenAtMs),
        toTimestampNumber(raw.updatedAt),
        toTimestampNumber(raw.createdAt),
    );
    return {
        timestampMs,
        normalizedActionCount: readNumber(raw.eventCount),
        unwrappedCount: Math.max(readNumber(raw.unwrapCount), readNumber(raw.unlockCount)),
        validWatchMinutes: Math.round(readNumber(raw.watchSecondsTotal) / 60),
        purchaseCount: Math.max(readNumber(raw.purchaseCount), readNumber(raw.purchaseTransactionCount)),
        freeGdEarned: Math.max(
            readNumber(raw.rewardGdEarned),
            readNumber(raw.rewardGdEarnedTotal),
            readNumber(raw.rewardGumDropsEarned),
            readNumber(raw.rewardAmountEarned),
            readNumber(raw.dailyRewardGd),
            readNumber(raw.dailyRewardGdTotal),
            readNumber(raw.freeGdEarned),
        ),
        hadVisit: readNumber(raw.viewCount) > 0 || readNumber(raw.watchSecondsTotal) > 0,
        hadAuth: Math.max(readNumber(raw.authSuccessCount), readNumber(raw.signInCount)) > 0,
    };
}

function buildUserValueDay(raw: Record<string, unknown>): UserValueActivityDay {
    const grossRevenueUsd = Math.max(
        readNumber(raw.grossRevenueUsdTotal),
        readNumber(raw.grossRevenueUsd),
    );
    const purchaseCount = Math.max(
        readNumber(raw.purchaseCount),
        readNumber(raw.purchaseTransactionCount),
        grossRevenueUsd > 0 ? 1 : 0,
    );

    return {
        timestampMs: Math.max(
            toTimestampNumber(raw.lastPurchaseAt),
            toTimestampNumber(raw.lastSeenAt),
            toTimestampNumber(raw.lastSeenAtMs),
            toTimestampNumber(raw.updatedAt),
            toTimestampNumber(raw.createdAt),
        ),
        grossRevenueUsd,
        purchaseCount,
        paidGdPurchased: Math.max(readNumber(raw.paidGumDropsTotal), readNumber(raw.paidGumDrops)),
        bonusGdDelivered: Math.max(readNumber(raw.bonusGumDropsTotal), readNumber(raw.bonusGumDrops)),
        rewardGdEarned: Math.max(
            readNumber(raw.rewardGdEarned),
            readNumber(raw.rewardGdEarnedTotal),
            readNumber(raw.rewardGumDropsEarned),
            readNumber(raw.rewardAmountEarned),
            readNumber(raw.dailyRewardGd),
            readNumber(raw.dailyRewardGdTotal),
            readNumber(raw.freeGdEarned),
        ),
        unwrappedCount: Math.max(readNumber(raw.unwrapCount), readNumber(raw.unlockCount)),
    };
}

async function GET_handler(
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
        const creatorOnboardingRef = adminDb.collection(CREATOR_ONBOARDING_COLLECTION).doc(userId);
        const [userSnap, transactionsSnap, analyticsRollupSnap, analyticsFactsSnap, sessionFactsSnap, watchSessionsSnap, userDailySnapshot, securityEventsSnap, supportThreadSnap, feedbackSnap, creatorOnboardingSnap, creatorOnboardingHistorySnap] = await Promise.all([
            userRef.get(),
            adminDb.collection("transactions")
                .where("userId", "==", userId)
                .orderBy("timestamp", "desc")
                .limit(historyLimit)
                .get(),
            adminDb.collection("analytics_users_rollup").doc(userId).get(),
            adminDb.collection("analytics_event_facts")
                .where("userId", "==", userId)
                .orderBy("timestamp", "desc")
                .limit(400)
                .get(),
            adminDb.collection("analytics_session_facts")
                .where("userId", "==", userId)
                .orderBy("lastEventAt", "desc")
                .get(),
            adminDb.collection("analytics_watch_sessions")
                .where("userId", "==", userId)
                .get(),
            adminDb.collection("analytics_user_daily")
                .where("uid", "==", userId)
                .orderBy("dayKey", "desc")
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
            creatorOnboardingRef.get(),
            creatorOnboardingRef
                .collection(CREATOR_ONBOARDING_HISTORY_SUBCOLLECTION)
                .orderBy("timestamp", "desc")
                .limit(historyLimit)
                .get(),
        ]);

        if (!userSnap.exists) {
            return buildNotFoundResponse("user", "User not found");
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

        // Legacy projection read boundary: user.creatorApplication is used only
        // to reconstruct old records for admin evidence when canonical
        // creator_onboarding is absent.
        const creatorOnboardingCanonical = normalizeCreatorOnboardingCanonicalRecord(creatorOnboardingSnap.data())
            ?? (user.creatorApplication
                ? buildCreatorOnboardingCanonicalRecord({
                    userId,
                    email: user.email,
                    username: user.username,
                    displayName: user.displayName ?? undefined,
                    photoURL: user.photoURL,
                    role: user.role,
                    createdAt: user.createdAt,
                    queuePosition: user.creatorApplication.queuePosition,
                    creatorDisplayName: user.creatorApplication.creatorDisplayName,
                    creatorPrimaryPlatform: user.creatorApplication.creatorPrimaryPlatform,
                    creatorContentFocus: user.creatorApplication.creatorContentFocus,
                    nowMs: user.creatorApplication.updatedAt || Date.now(),
                    source: user.creatorApplication,
                })
                : null);
        const creatorOnboardingProjection = creatorOnboardingCanonical
            ? normalizeCreatorAdminDetail(creatorOnboardingCanonical, { source: creatorOnboardingSnap.exists ? "canonical" : "legacy" })
            : user.creatorApplication
                ? normalizeCreatorAdminDetail({
                    ...user.creatorApplication,
                    userId,
                    email: user.email,
                    username: user.username,
                    displayName: user.displayName ?? undefined,
                    photoURL: user.photoURL,
                    role: user.role,
                    createdAt: user.createdAt,
                }, { source: "legacy" })
                : null;
        const creatorOnboardingHistory = creatorOnboardingHistorySnap.docs
            .map((doc) => normalizeCreatorOnboardingHistoryEntry(doc.data()))
            .filter((entry): entry is Exclude<ReturnType<typeof normalizeCreatorOnboardingHistoryEntry>, undefined> => Boolean(entry))
            .sort((left, right) => right.timestamp - left.timestamp);

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
                const params = data.params && typeof data.params === "object"
                    ? data.params as Record<string, unknown>
                    : {};
                return {
                    id: doc.id,
                    eventId: readString(data.eventId) || doc.id,
                    eventName: readString(data.eventName),
                    timestamp: toTimestampNumber(data.timestamp),
                    userId: readString(data.userId),
                    sessionId: readString(data.sessionId),
                    pagePath: readString(data.pagePath),
                    dropId: readString(data.dropId),
                    dropTitle: readString(data.dropTitle),
                    creatorId: readString(data.creatorId) || readString(params.creator_id) || readString(params.creatorId),
                    assetKey: readString(data.assetKey),
                    assetIndex: readNumber(data.assetIndex),
                    sessionWatchSeconds: readNumber(data.sessionWatchSeconds),
                    watchSeconds: readNumber(data.watchSeconds),
                    loadMs: readNumber(data.loadMs),
                    params,
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
        const directUnwrapCount = analyticsFacts.filter((event) => event.eventName === "drop_unwrapped").length;
        const directPageViewCount = analyticsFacts.filter((event) => event.eventName.endsWith("_page_viewed") || event.eventName === "semantic_page_viewed").length;
        const directBounceCount = analyticsFacts.filter((event) => event.eventName === "semantic_page_bounced").length;
        const directAuthSuccessCount = analyticsFacts.filter((event) => (
            event.eventName === "auth_sign_in_success"
            || event.eventName === "auth_google_sign_in_success"
            || event.eventName === "auth_sign_up_success"
        )).length;
        const directOnboardingStartCount = analyticsFacts.filter((event) => event.eventName === "guided_onboarding_started").length;
        const directOnboardingCompletionCount = analyticsFacts.filter((event) => event.eventName === "guided_onboarding_completed").length;
        const purchaseVerifiedFactCount = analyticsFacts.filter((event) => event.eventName === "purchase_verified").length;
        const purchaseCompletedFactCount = analyticsFacts.filter((event) => event.eventName === "gumdrops_purchase_completed").length;
        const directPurchaseCount = purchaseVerifiedFactCount;
        const directEventCount = analyticsFacts.length;
        const directLastSeenAt = Math.max(
            analyticsFacts.reduce((latest, event) => Math.max(latest, event.timestamp), 0),
        );
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
        const dailyViewCount = userDaily.reduce((sum, day) => sum + readNumber(day.viewCount), 0);
        const dailyBounceCount = userDaily.reduce((sum, day) => sum + readNumber(day.bounceCount), 0);
        const dailyAuthSuccessCount = userDaily.reduce((sum, day) => sum + Math.max(readNumber(day.authSuccessCount), readNumber(day.signInCount)), 0);
        const dailyOnboardingStartCount = userDaily.reduce((sum, day) => sum + Math.max(readNumber(day.onboardingStartCount), readNumber(day.guidedOnboardingStartCount)), 0);
        const dailyOnboardingCompletionCount = userDaily.reduce((sum, day) => sum + Math.max(readNumber(day.onboardingCompletionCount), readNumber(day.guidedOnboardingCompletionCount)), 0);
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
        const {
            transactionGrossRevenueUsd,
            transactionNetRevenueUsd,
            transactionPaypalFeeUsd,
            transactionAdjustedProfitUsd,
            transactionBonusValueUsd,
            transactionBonusGumDrops,
            transactionDeliveredGumDrops,
            transactionPaidGumDrops,
        } = purchaseTransactions.reduce(
            (acc, transaction) => {
                acc.transactionGrossRevenueUsd += transaction.economics.grossRevenueUsd;
                acc.transactionNetRevenueUsd += transaction.economics.netRevenueUsd;
                acc.transactionPaypalFeeUsd += transaction.economics.paypalFeeUsd;
                acc.transactionAdjustedProfitUsd += transaction.economics.adjustedProfitUsd;
                acc.transactionBonusValueUsd += transaction.economics.bonusValueUsd;
                acc.transactionBonusGumDrops += transaction.economics.bonusGumDrops;
                acc.transactionDeliveredGumDrops += transaction.economics.deliveredGumDrops;
                acc.transactionPaidGumDrops += transaction.economics.paidGumDrops;
                return acc;
            },
            {
                transactionGrossRevenueUsd: 0,
                transactionNetRevenueUsd: 0,
                transactionPaypalFeeUsd: 0,
                transactionAdjustedProfitUsd: 0,
                transactionBonusValueUsd: 0,
                transactionBonusGumDrops: 0,
                transactionDeliveredGumDrops: 0,
                transactionPaidGumDrops: 0,
            }
        );







        const rollupCommerce = buildCommerceMetricsFromRollup(analyticsRollup, {
            commerceSourceLabel: "analytics_users_rollup_recomputed_display",
            commerceTruthLabel: "stale",
        });
        const transactionCommerce = {
            grossRevenueUsd: transactionGrossRevenueUsd,
            netRevenueUsd: transactionNetRevenueUsd,
            paypalFeeUsd: transactionPaypalFeeUsd,
            adjustedProfitUsd: transactionAdjustedProfitUsd,
            bonusValueUsd: transactionBonusValueUsd,
            bonusGumDrops: transactionBonusGumDrops,
            deliveredGumDrops: transactionDeliveredGumDrops,
            paidGumDrops: transactionPaidGumDrops,
            effectiveUsdPer100Gd: transactionDeliveredGumDrops > 0
                ? Math.round(((transactionGrossRevenueUsd / (transactionDeliveredGumDrops / 100)) + Number.EPSILON) * 100) / 100
                : 0,
            commerceTruthLabel: purchaseTransactions.length > 0 ? "live" as const : "unknown" as const,
            commerceSourceLabel: purchaseTransactions.length > 0 ? "completed_transactions" : "none",
            commerceEmptyReason: purchaseTransactions.length > 0 ? null : "No completed GumDrops purchases found.",
        };
        const commerceMetrics = transactionCommerce.grossRevenueUsd >= rollupCommerce.grossRevenueUsd
            ? transactionCommerce
            : {
                ...rollupCommerce,
                commerceTruthLabel: rollupCommerce.grossRevenueUsd > 0 ? "stale" as const : "unknown" as const,
                commerceEmptyReason: rollupCommerce.grossRevenueUsd > 0
                    ? "Historical rollup display math is recomputed from aggregate fields until transaction backfill runs."
                    : "No completed GumDrops purchases found.",
            };
        const unlockSpendGdTotal = transactions
            .filter((transaction) => transaction.status === "completed" && transaction.type === "unlock_content")
            .reduce((sum, transaction) => sum + transaction.amount, 0);
        const behavioralEventFactRollup = buildBehavioralEventFactRollup({
            facts: [
                ...analyticsFacts.map((event) => normalizeBehavioralEventFactWithDiagnostics({
                    eventId: event.eventId,
                    eventName: event.eventName,
                    params: event.params,
                    timestamp: event.timestamp,
                    userId: event.userId || userId,
                    sessionId: event.sessionId,
                    pagePath: event.pagePath,
                    dropId: event.dropId,
                    creatorId: event.creatorId,
                    assetKey: event.assetKey,
                    assetIndex: event.assetIndex,
                    source: "server",
                }).fact),
                ...watchSessionsSnap.docs.map((doc) => {
                const data = doc.data() as Record<string, unknown>;
                const completed = data.completed === true
                    || data.completedSession === true
                    || readString(data.tier) === "completed"
                    || readString(data.watchTier) === "completed"
                    || readString(data.completionReason) === "completed";
                if (!completed) {
                    return null;
                }

                return normalizeBehavioralEventFactWithDiagnostics({
                    eventId: doc.id,
                    eventName: "watch_session_ended",
                    params: {
                        watch_session_id: doc.id,
                        source_component: "viewer_watch_session_rollup",
                        route: readString(data.route) || readString(data.pagePath) || "/dashboard/viewer",
                        drop_id: readString(data.dropId),
                        file_id: readString(data.fileId),
                        media_index: readNumber(data.mediaIndex),
                    },
                    timestamp: Math.max(toTimestampNumber(data.endedAtMs), toTimestampNumber(data.lastUpdatedAtMs), toTimestampNumber(data.updatedAt)),
                    userId,
                    sessionId: readString(data.sessionId) || doc.id,
                    pagePath: readString(data.route) || readString(data.pagePath) || "/dashboard/viewer",
                    dropId: readString(data.dropId),
                    source: "materialized",
                }).fact;
            }),
            ...transactions.map((transaction) => {
                if (transaction.status !== "completed") {
                    return null;
                }

                const transactionType = String(transaction.type);
                const eventName = transactionType === "purchase_currency" || transactionType === "purchase"
                    ? "gumdrops_purchase_completed"
                    : transactionType === "unlock_content"
                        ? "drop_unwrapped"
                        : "";
                if (!eventName) {
                    return null;
                }

                return normalizeBehavioralEventFactWithDiagnostics({
                    eventId: transaction.id,
                    eventName,
                    params: {
                        transaction_id: transaction.id,
                        source_component: "transaction_ledger",
                        route: transactionType === "unlock_content" ? "/drops" : "/wallet",
                        drop_id: transaction.relatedDropId,
                    },
                    timestamp: toTimestampNumber(transaction.timestamp) || toTimestampNumber(transaction.timestampMs),
                    userId,
                    sessionId: `transaction:${transaction.id}`,
                    pagePath: transactionType === "unlock_content" ? "/drops" : "/wallet",
                    dropId: transaction.relatedDropId,
                    source: "materialized",
                    valueUsd: transaction.grossRevenueUsd ?? transaction.cost ?? 0,
                    gumDropsAmount: transaction.deliveredGumDrops ?? transaction.amount,
                }).fact;
            }),
            ],
            diagnostics: analyticsFacts.map((event) => normalizeBehavioralEventFactWithDiagnostics({
                eventId: event.eventId,
                eventName: event.eventName,
                params: event.params,
                timestamp: event.timestamp,
                userId: event.userId || userId,
                sessionId: event.sessionId,
                pagePath: event.pagePath,
                dropId: event.dropId,
                creatorId: event.creatorId,
                assetKey: event.assetKey,
                assetIndex: event.assetIndex,
                source: "server",
            }).diagnostic),
        });
        const normalizedActionCount = behavioralEventFactRollup.facts.length;
        const purchaseSourceCounts = [
            { key: "transactions", label: "Transactions", count: purchaseTransactions.length },
            { key: "rollup", label: "User rollup", count: rollupPurchaseCount },
            { key: "daily", label: "Daily rollups", count: dailyPurchaseCount },
            { key: "facts", label: "Server facts", count: directPurchaseCount },
        ];
        const unlockSourceCounts = [
            { key: "transactions", label: "Transactions", count: completedUnlockTransactions.length },
            { key: "rollup", label: "User rollup", count: rollupUnlockCount },
            { key: "daily", label: "Daily rollups", count: dailyUnwrapCount },
            { key: "facts", label: "Server facts", count: directUnwrapCount },
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
        const normalizedEventCount = Math.max(normalizedActionCount, readNumber(analyticsRollup.eventCount), directEventCount, dailyEventCount);
        const normalizedViewCount = Math.max(
            readNumber(analyticsRollup.viewCount),
            dailyViewCount,
            directPageViewCount,
            directViewSessionCount || directViewerOpenedCount,
            sessionFactViewCount,
        );
        const normalizedSessionCount = Math.max(readNumber(analyticsRollup.sessionCount), directViewSessionCount || directViewerOpenedCount, sessionFactViewCount);
        const legacyPageDurationMs = Math.max(
            Math.round(readNumber(analyticsRollup.watchSecondsTotal) * 1000),
            Math.round(sessionFactWatchSeconds * 1000),
            Math.round(completedSessionWatchSeconds * 1000),
        );
        const watchTimeRollup = buildWatchTimeRollupFromRecords({
            records: watchSessionsSnap.docs.map((doc) => doc.data() as Record<string, unknown>),
            views: normalizedViewCount,
            viewerOpenMs: legacyPageDurationMs,
            pageDurationMs: legacyPageDurationMs,
            viewedFileCount: Math.max(viewedDrops.size, normalizedViewCount),
            legacyPageDurationMs,
        });
        const normalizedWatchSeconds = Math.round(watchTimeRollup.watchTimeMs / 1000);
        const normalizedBounceCount = Math.max(readNumber(analyticsRollup.bounceCount), dailyBounceCount, directBounceCount);
        const normalizedAuthSuccessCount = Math.max(readNumber(analyticsRollup.authSuccessCount), readNumber(analyticsRollup.signInCount), dailyAuthSuccessCount, directAuthSuccessCount);
        const normalizedOnboardingCompletionCount = Math.max(
            readNumber(analyticsRollup.onboardingCompletionCount),
            readNumber(analyticsRollup.guidedOnboardingCompletionCount),
            dailyOnboardingCompletionCount,
            directOnboardingCompletionCount,
            user.onboardingCompleted ? 1 : 0,
        );
        const normalizedLastPurchaseAt = Math.max(
            readNumber(analyticsRollup.lastPurchaseAt),
            ...userDaily.map((day) => toTimestampNumber(day.lastPurchaseAt)),
            ...purchaseTransactions.map((transaction) => toTimestampNumber(transaction.timestamp)),
        );
        const metricSnapshot = {
            eventCount: normalizedEventCount,
            sessionCount: normalizedSessionCount,
            viewCount: normalizedViewCount,
            bounceCount: normalizedBounceCount,
            authSuccessCount: normalizedAuthSuccessCount,
            onboardingCompletionCount: normalizedOnboardingCompletionCount,
            watchSecondsTotal: normalizedWatchSeconds,
            unwrapCount: normalizedUnlockCount,
            purchaseCount: normalizedPurchaseCount,
            grossRevenueUsd: commerceMetrics.grossRevenueUsd,
            unlockSpendGdTotal: Math.max(readNumber(analyticsRollup.spendGdTotal), readNumber(analyticsRollup.unlockSpendGdTotal), unlockSpendGdTotal),
            lastSeenAt: Math.max(readNumber(analyticsRollup.lastSeenAt), readNumber(analyticsRollup.lastSeenAtMs), directLastSeenAt, sessionFactLastSeenAt, dailyLastSeenAt),
            lastPurchaseAt: normalizedLastPurchaseAt,
        };
        const metricIntegrity = buildAdminUserMetricIntegrity({
            hasRollup: analyticsRollupSnap.exists,
            hasDaily: userDaily.length > 0,
            recoveredFromFacts: directEventCount > 0,
            userOnboarded: user.onboardingCompleted === true,
            userCreatedAt: toTimestampNumber(user.createdAt),
            nowMs: Date.now(),
            lastSeenAt: metricSnapshot.lastSeenAt,
            metrics: metricSnapshot,
        });
        const engagementInput = buildUserEngagementScoreInputFromActivityDays({
            days: userDaily.map((day) => buildUserEngagementDay(day)),
            nowMs: Date.now(),
        });
        const valueInputFromDays = buildUserValueScoreInputFromActivityDays({
            days: userDaily.map((day) => buildUserValueDay(day)),
            nowMs: Date.now(),
        });
        const behaviorRollup = buildUserBehaviorRollup({
            userId,
            totalActions: normalizedActionCount,
            views: normalizedViewCount,
            unwraps: normalizedUnlockCount,
            watchSecondsTotal: normalizedWatchSeconds,
            purchasesCount: normalizedPurchaseCount,
            revenueUsd: commerceMetrics.grossRevenueUsd,
            paidGdPurchased: commerceMetrics.paidGumDrops,
            rewardGdEarned: readNumber(rawUser.gumDropsRewardBalance),
            onboardingCompleted: user.onboardingCompleted === true,
            authEvents: normalizedAuthSuccessCount,
            pushEnabled: user.notificationSettings?.browserPushEnabled === true,
            lastSeenAt: metricSnapshot.lastSeenAt,
            hasRollup: analyticsRollupSnap.exists,
            hasDaily: userDaily.length > 0,
            hasFacts: directEventCount > 0,
            hasSessionFacts: sessionFacts.length > 0,
            hasWatchSessions: watchTimeRollup.validSessionCount > 0,
            hasLegacyPageDuration: watchTimeRollup.source === "legacy_page_duration",
            hasTransactions: transactions.length > 0,
            commerceSourcePresent: Boolean(commerceMetrics.commerceSourceLabel),
            sourceIssues: [
                ...metricIntegrity.failures,
                ...watchTimeRollup.issues,
            ],
            engagementInput,
            valueInput: {
                ...valueInputFromDays,
                totalSpendUsd: commerceMetrics.grossRevenueUsd,
                purchaseCount: normalizedPurchaseCount,
                paidGdPurchased: commerceMetrics.paidGumDrops,
                bonusGdDelivered: commerceMetrics.bonusGumDrops,
                rewardGdEarned: Math.max(valueInputFromDays.rewardGdEarned, readNumber(rawUser.gumDropsRewardBalance)),
                daysSinceLastPurchase: normalizedPurchaseCount > 0 && metricSnapshot.lastPurchaseAt > 0
                    ? Math.max(0, Math.floor((Date.now() - metricSnapshot.lastPurchaseAt) / (24 * 60 * 60 * 1000)))
                    : valueInputFromDays.daysSinceLastPurchase,
            },
        });
        const engagement = behaviorRollup.engagement;
        const value = behaviorRollup.value;

        const analytics = {
            eventCount: normalizedEventCount,
            unwrapCount: normalizedUnlockCount,
            purchaseCount: normalizedPurchaseCount,
            viewerSessionCount: normalizedSessionCount,
            viewerCompletionCount: Math.max(analyticsFacts.filter((event) => event.eventName === "viewer_session_completed").length, sessionFactCompletionCount),
            assetViewCount: directAssetViewCount,
            assetCompletionCount: directAssetCompletionCount,
            uniqueViewedDrops: viewedDrops.size,
            watchSecondsTotal: normalizedWatchSeconds,
            watchHours: roundToSingleDecimal(normalizedWatchSeconds / 3600),
            viewCount: normalizedViewCount,
            bounceCount: normalizedBounceCount,
            authSuccessCount: normalizedAuthSuccessCount,
            onboardingStartCount: Math.max(readNumber(analyticsRollup.onboardingStartCount), readNumber(analyticsRollup.guidedOnboardingStartCount), dailyOnboardingStartCount, directOnboardingStartCount),
            onboardingCompletionCount: normalizedOnboardingCompletionCount,
            downloadCount: directDownloadCount,
            relatedClickCount: directRelatedClickCount,
            avgLoadMs: Math.max(
                rollupAvgLoadMs,
                directAvgLoadMs,
                sessionFactLoadSampleCount > 0 ? Math.round(sessionFactLoadMsTotal / sessionFactLoadSampleCount) : 0,
            ),
            lastSeenAt: metricSnapshot.lastSeenAt,
            grossRevenueUsd: commerceMetrics.grossRevenueUsd,
            netRevenueUsd: commerceMetrics.netRevenueUsd,
            paypalFeeUsd: commerceMetrics.paypalFeeUsd,
            adjustedProfitUsd: commerceMetrics.adjustedProfitUsd,
            bonusValueUsd: commerceMetrics.bonusValueUsd,
            bonusGumDrops: commerceMetrics.bonusGumDrops,
            deliveredGumDrops: commerceMetrics.deliveredGumDrops,
            paidGumDrops: commerceMetrics.paidGumDrops,
            effectiveUsdPer100Gd: commerceMetrics.effectiveUsdPer100Gd,
            commerceTruthLabel: commerceMetrics.commerceTruthLabel,
            commerceSourceLabel: commerceMetrics.commerceSourceLabel,
            commerceEmptyReason: commerceMetrics.commerceEmptyReason,
            unlockSpendGdTotal: metricSnapshot.unlockSpendGdTotal,
            metricTruthLabel: metricIntegrity.truthLabel,
            metricVerificationState: metricIntegrity.verificationState,
            metricSourceLabel: metricIntegrity.sourceLabel,
            metricIntegrityFailures: metricIntegrity.failures,
            metricFreshnessMs: metricIntegrity.freshnessMs,
            recoveredFromFacts: metricIntegrity.recoveredFromFacts,
            engagementScore: engagement.score,
            engagement,
            valueScore: value.valueScore,
            value,
            behaviorRollup,
            actionLedger: behavioralEventFactRollup.facts.slice(0, 80).map((fact) => toUserActionLedgerItem({
                actionName: fact.normalizedAction,
                actionId: fact.dedupeKey,
                timestamp: fact.timestampMs,
                userId: fact.userId || userId,
                sessionId: fact.sessionId || "unknown_session",
                sourceComponent: fact.sourceComponent,
                route: fact.route,
                entityId: fact.entityId || null,
                entityType: fact.entityType || "unknown",
                rawEventName: fact.rawEventName,
            })),
            actionTaxonomyVersion: BEHAVIORAL_EVENT_FACT_VERSION,
            watchTimeSource: watchTimeRollup.source,
            watchTimeIssues: watchTimeRollup.issues,
            watchTimeDiagnosticEstimate: watchTimeRollup.diagnosticEstimate,
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
                    category: normalizeSupportThreadCategory(data.category),
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
                    updatedAt: Math.max(
                        toTimestampNumber(data.updatedAt),
                        toTimestampNumber(data.createdAt),
                    ),
                    lastMessagePreview: readString(data.lastMessagePreview) || null,
                    unreadForUser: data.unreadForUser === true,
                    unreadForAdmin: data.unreadForAdmin === true,
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
                stateDescription: describeSupportStateDetail(derivedSupportState),
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
                    email: user.email,
                    handle: user.username,
                    displayName: user.displayName,
                }),
                channels: {
                    accountEmail: Boolean(user.email),
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
            try {
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
                    adminDb.collection(CREATOR_COLLECTIONS.requests).where("creatorId", "==", userId).get(),
                    adminDb.collection(CREATOR_COLLECTIONS.bookings).where("creatorId", "==", userId).get(),
                    adminDb.collection(CREATOR_COLLECTIONS.payoutRequests).where("creatorId", "==", userId).get(),
                    adminDb.collection(CREATOR_COLLECTIONS.ledgerAccruals).where("creatorId", "==", userId).get(),
                    adminDb.collection(CREATOR_COLLECTIONS.messageThreads).where("creatorId", "==", userId).get(),
                    adminDb.collection(CREATOR_COLLECTIONS.messages).where("creatorId", "==", userId).get(),
                    adminDb.collection(CREATOR_COLLECTIONS.broadcasts).where("creatorId", "==", userId).get(),
                    adminDb.collection("drops").where("submittedByCreatorId", "==", userId).get(),
                ]);

            const relationshipSummary = relationshipSnap.docs.reduce((acc, doc) => {
                const data = doc.data() as Record<string, unknown>;
                if (data.following === true) {
                    acc.followerCount += 1;
                }

                if (data.notificationsEnabled === true) {
                    acc.notificationsEnabledCount += 1;
                }
                return acc;
            }, {
                followerCount: 0,

                notificationsEnabledCount: 0,
            });

            const subscriptions: Array<Record<string, unknown> & { id: string }> = subscriptionSnap.docs
                .map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }) as Record<string, unknown> & { id: string })
                .sort((left, right) => toTimestampNumber(right["renewAt"]) - toTimestampNumber(left["renewAt"]));
            const requests: Array<Record<string, unknown> & { id: string }> = requestSnap.docs
                .map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }) as Record<string, unknown> & { id: string })
                .sort((left, right) => toTimestampNumber(right["createdAt"]) - toTimestampNumber(left["createdAt"]))
                .slice(0, 10);
            const bookings: Array<Record<string, unknown> & { id: string }> = bookingSnap.docs
                .map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }) as Record<string, unknown> & { id: string })
                .sort((left, right) => toTimestampNumber(right["startAt"]) - toTimestampNumber(left["startAt"]))
                .slice(0, 10);
            const payouts: Array<Record<string, unknown> & { id: string }> = payoutSnap.docs
                .map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }) as Record<string, unknown> & { id: string })
                .sort((left, right) => toTimestampNumber(right["createdAt"]) - toTimestampNumber(left["createdAt"]))
                .slice(0, 10);
            const accruals: Array<Record<string, unknown> & { id: string }> = accrualSnap.docs
                .map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }) as Record<string, unknown> & { id: string })
                .sort((left, right) => toTimestampNumber(right["createdAt"]) - toTimestampNumber(left["createdAt"]))
                .slice(0, 10);
            const threads: Array<Record<string, unknown> & { id: string }> = threadSnap.docs
                .map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }) as Record<string, unknown> & { id: string })
                .sort((left, right) => toTimestampNumber(right["lastMessageAt"]) - toTimestampNumber(left["lastMessageAt"]))
                .slice(0, 12);
            const messages: Array<Record<string, unknown> & { id: string }> = messageSnap.docs
                .map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }) as Record<string, unknown> & { id: string })
                .sort((left, right) => toTimestampNumber(right["createdAt"]) - toTimestampNumber(left["createdAt"]))
                .slice(0, 20);
            const broadcasts: Array<Record<string, unknown> & { id: string }> = broadcastSnap.docs
                .map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }) as Record<string, unknown> & { id: string })
                .filter((entry) => entry["removedAt"] === undefined)
                .sort((left, right) => toTimestampNumber(right["createdAtMs"]) - toTimestampNumber(left["createdAtMs"]))
                .slice(0, 6);
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
            } catch (error) {
                recordRouteWarning(
                    "Admin.User.CreatorOps",
                    "[Admin] Gracefully recovered from creatorOps indexing or fetch error",
                    error,
                    { channel: "admin" },
                );
                
                creatorOps = {
                    summary: {
                        followerCount: 0,

                        notificationsEnabledCount: 0,
                        activeSubscribers: 0,
                        lapsedSubscribers: 0,
                        openRequests: 0,
                        bookedCalls: 0,
                        completedCalls: 0,
                        pendingPayouts: 0,
                        openThreads: 0,
                        pendingDropSubmissions: 0,
                        totalAccruedGd: 0,
                        pendingCashoutGd: 0,
                        broadcasts: 0,
                    },
                    subscriptions: [],
                    requests: [],
                    bookings: [],
                    payouts: [],
                    accruals: [],
                    threads: [],
                    messages: [],
                    broadcasts: [],
                    pendingSubmissions: [],
                };
            }
        }

        const [behavioralProfile, recommendedDrops] = await Promise.all([
            getBehavioralUserProfile(userId),
            buildDeterministicDropRecommendations({
                userId,
                limit: 6,
            }),
        ]);
        const behavioralRecommendationState = buildBehavioralRecommendationState(behavioralProfile as Record<string, unknown> | null);
        const recommendationDisplayMode = behavioralRecommendationState.insufficientSignal
            ? "insufficient-signal"
            : behavioralRecommendationState.explanationEligible
                ? "explanations"
                : "fallback-compact";

        return NextResponse.json({
            success: true,
            user: {
                ...user,
                adminAccountControlDebug: rawUser.adminAccountControlDebug && typeof rawUser.adminAccountControlDebug === "object"
                    ? rawUser.adminAccountControlDebug
                    : null,
                creatorFanExperienceSettingsDebug: rawUser.creatorFanExperienceSettingsDebug && typeof rawUser.creatorFanExperienceSettingsDebug === "object"
                    ? rawUser.creatorFanExperienceSettingsDebug
                    : null,
                adminViewAsDebug: rawUser.adminViewAsDebug && typeof rawUser.adminViewAsDebug === "object"
                    ? rawUser.adminViewAsDebug
                    : null,
            },
            creatorOnboardingCanonical,
            creatorOnboardingProjection,
            creatorOnboardingHistory,
            transactions,
            analytics,
            behavioralProfile,
            recommendationDebug: {
                mode: behavioralRecommendationState.recommendationState,
                displayMode: recommendationDisplayMode,
                profileFreshness: behavioralProfile?.freshnessLabel || recommendedDrops[0]?.profileFreshness || "unknown",
                profileConfidence: behavioralRecommendationState.confidenceScore,
                insufficientSignal: behavioralRecommendationState.insufficientSignal,
                insufficientSignalReason: behavioralRecommendationState.fallbackReason,
                showExplanationCards: behavioralRecommendationState.explanationEligible,
                drops: recommendedDrops.map((entry) => ({
                    dropId: entry.drop.id,
                    dropTitle: entry.drop.title,
                    creatorId: entry.drop.creatorId,
                    dropCategory: entry.drop.type,
                    score: entry.score,
                    labels: entry.labels,
                    explanationSummary: entry.explanationSummary,
                    explanationReasons: entry.explanationReasons,
                    candidateSources: entry.candidateSources,
                    rankingMode: entry.rankingMode,
                    factors: entry.factors,
                    explanationEligible: entry.explanationEligible,
                    fallbackReason: entry.fallbackReason,
                    mlDiagnostics: entry.mlDiagnostics,
                })),
            },
            securitySummary,
            securityEvents,
            supportReadiness,
            creatorOps,
            dropReferences,
            verification: buildServerAdminModuleVerification({
                module: "admin_user_detail",
                canonicalSource: "users+analytics_users_rollup+analytics_user_daily",
                fallbackSource: directEventCount > 0 ? "analytics_event_facts+analytics_viewer_session_facts" : null,
                freshnessTimestamp: metricSnapshot.lastSeenAt,
                degradedReason: metricIntegrity.failures[0] ?? null,
                status: metricIntegrity.verificationState === "degraded"
                    ? "degraded"
                    : metricIntegrity.verificationState === "stale"
                        ? "stale"
                        : metricIntegrity.verificationState === "unavailable"
                            ? "unavailable"
                            : directEventCount > 0 && !analyticsRollupSnap.exists
                                ? "fallback"
                                : "live",
                countComposition: {
                    eventCount: normalizedEventCount,
                    viewCount: normalizedViewCount,
                    bounceCount: normalizedBounceCount,
                    authSuccessCount: normalizedAuthSuccessCount,
                    watchSecondsTotal: normalizedWatchSeconds,
                    purchaseCount: normalizedPurchaseCount,
                    unlockCount: normalizedUnlockCount,
                },
            }),
        });
    } catch (error) {
        return handleApiError(error, "Admin.UserDetail.GET");
    }
}

export let GET = withRouteRuntimeHealth("admin/user/[userId]:GET", GET_handler);
