export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/server/auth";
import { adminDb } from "@/lib/server/firebase-admin";
import { ANALYTICS_SEMANTIC_SOURCE_REGISTRY, ANALYTICS_SEMANTIC_STRATEGIES } from "@/lib/analytics-semantics";
import { summarizeAnalyticsTruth } from "@/lib/admin-analytics-truth";
import { deriveGumdropEconomics } from "@/lib/gumdrop-economics";
import { classifyGumdropTransaction } from "@/lib/gumdrop-ledger";
import { normalizeTransactionRecord } from "@/lib/transaction-normalizers";
import { getAllDropReferenceMap, resolveDropTitle } from "@/lib/server/drop-references";
import {
    createAdminAnalyticsDataClient,
    fetchAdminHistoricalAnalyticsSources,
    getAdminAnalyticsPropertyId,
} from "@/lib/server/admin-analytics-data";
import { buildHistoricalActivityFeeds } from "@/lib/server/admin-analytics-historical-activity";
import { buildHistoricalContentAnalytics } from "@/lib/server/admin-analytics-historical-content";
import { buildHistoricalEngagementAnalytics } from "@/lib/server/admin-analytics-historical-engagement";
import { buildHistoricalOnboardingOverview } from "@/lib/server/admin-analytics-historical-onboarding";
import { buildHistoricalTaskAnalytics } from "@/lib/server/admin-analytics-historical-tasks";
import { buildHistoricalTrafficOverview } from "@/lib/server/admin-analytics-historical-traffic";
import { buildHistoricalValidationSummary } from "@/lib/server/admin-analytics-historical-validation";
import { buildHistoricalViewerOverview } from "@/lib/server/admin-analytics-historical-viewer";
import { buildHistoricalAnalyticsUserMap } from "@/lib/server/admin-analytics-historical-users";
import { buildWatchCaptureHealthSummary } from "@/lib/server/admin-analytics-capture-health";
import { buildAdminOpsHealth } from "@/lib/server/admin-ops-health";
import { buildSemanticCategorySummaries } from "@/lib/server/analytics-semantics";
import { buildAnalyticsMetricReport } from "@/lib/server/analytics-metrics";
import { buildHistoricalAnalyticsContext } from "@/lib/server/admin-analytics-context";
import { getDropViewCount } from "@/lib/drop-engagement";
import {
    AUTHENTICATED_PAGE_VIEW_EVENT_NAMES,
    RegistrationFactRecord,
    TaskLifecycleLog,
    buildMergedCountMap,
    getRangeWindow,
    safeParams,
    sumSnapshotField,
    toNumber,
    toStringValue,
} from "@/lib/server/admin-analytics-shared";
import { guardApiRequest } from "@/lib/server/request-guard";
import { ADMIN_ANALYTICS } from "@/lib/server/rate-limit";

const propertyId = getAdminAnalyticsPropertyId();
const analyticsClient = createAdminAnalyticsDataClient();

function toTimestampNumber(value: unknown) {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    if (
        value
        && typeof value === "object"
        && "toMillis" in value
        && typeof (value as { toMillis?: unknown }).toMillis === "function"
    ) {
        try {
            return Number((value as { toMillis: () => number }).toMillis()) || 0;
        } catch {
            return 0;
        }
    }

    return 0;
}

function readLatestSnapshotTimestamp(
    docs: FirebaseFirestore.QueryDocumentSnapshot[],
    keys: string[],
) {
    return docs.reduce((latest, doc) => {
        const data = doc.data() as Record<string, unknown>;
        const timestamp = keys.reduce((current, key) => current || toTimestampNumber(data[key]), 0);
        return Math.max(latest, timestamp);
    }, 0);
}

function scopeHistoricalResponse(section: string | null, payload: Record<string, unknown>) {
    const withSharedFields = (value: Record<string, unknown>) => ({
        generatedAtMs: payload.generatedAtMs,
        viewerFilter: payload.viewerFilter,
        ...value,
    });

    switch (section) {
        case "stationSnapshot":
            return withSharedFields({
                totals: payload.totals,
                devices: payload.devices,
                commerce: payload.commerce,
                security: payload.security,
            });
        case "livePulse":
            return withSharedFields({
                funnel: payload.funnel,
                onboardingStats: payload.onboardingStats,
            });
        case "journeyFunnel":
            return withSharedFields({ funnel: payload.funnel });
        case "authOutcomeSplit":
            return withSharedFields({ authBreakdown: payload.authBreakdown });
        case "onboardingVelocity":
            return withSharedFields({
                onboardingStats: payload.onboardingStats,
                onboardingStepStats: payload.onboardingStepStats,
                onboardingDurationBuckets: payload.onboardingDurationBuckets,
            });
        case "onboardingStepFlow":
            return withSharedFields({
                onboardingStepStats: payload.onboardingStepStats,
            });
        case "eventMix":
            return withSharedFields({ eventBreakdown: payload.eventBreakdown });
        case "liveInteractionStream":
            return withSharedFields({ rawEvents: payload.rawEvents });
        case "serverTelemetryHealth":
            return withSharedFields({ opsHealth: payload.opsHealth });
        case "coverageEngine":
            return withSharedFields({
                moduleCoverage: payload.moduleCoverage,
                unhealthyModules: payload.unhealthyModules,
                parityScore: payload.parityScore,
            });
        case "categorySemantics":
            return withSharedFields({ semanticCategories: payload.semanticCategories });
        case "creatorMetrics":
            return withSharedFields({ socialMetrics: payload.socialMetrics });
        case "semanticsEngine":
            return withSharedFields({ semanticEngine: payload.semanticEngine });
        case "dataValidation":
            return withSharedFields({
                validations: payload.validations,
                watchCaptureHealth: payload.watchCaptureHealth,
            });
        case "audienceSnapshot":
            return withSharedFields({
                data: payload.data,
                totals: payload.totals,
                devices: payload.devices,
            });
        case "returnCadence":
            return withSharedFields({ repeatVisitSegments: payload.repeatVisitSegments });
        case "navigationDestinations":
            return withSharedFields({ destinationMix: payload.destinationMix });
        case "deviceMix":
            return withSharedFields({ devices: payload.devices });
        case "topPaths":
            return withSharedFields({ pages: payload.pages });
        case "regions":
            return withSharedFields({ geo: payload.geo });
        case "commerceSnapshot":
            return withSharedFields({
                commerce: payload.commerce,
                funnel: payload.funnel,
            });
        case "packagePerformance":
            return withSharedFields({ packagePerformance: payload.packagePerformance });
        case "contentConversion":
            return withSharedFields({ unlockCategoryMix: payload.unlockCategoryMix });
        case "topDropConversion":
            return withSharedFields({ topDrops: payload.topDrops });
        case "recentCommerceFeed":
            return withSharedFields({ commerce: payload.commerce });
        case "viewerDrilldown":
            return withSharedFields({
                viewerOverview: payload.viewerOverview,
                viewerDropInsights: payload.viewerDropInsights,
                viewerUsers: payload.viewerUsers,
                watchCaptureHealth: payload.watchCaptureHealth,
                userJourneys: payload.userJourneys,
                viewerFilter: payload.viewerFilter,
            });
        case "viewerJourney":
            return withSharedFields({ contentJourney: payload.contentJourney });
        case "watchDepthTags":
            return withSharedFields({
                watchDepthBuckets: payload.watchDepthBuckets,
                contentTagDemand: payload.contentTagDemand,
            });
        case "securityPosture":
            return withSharedFields({
                security: payload.security,
                funnel: payload.funnel,
            });
        case "dailyTaskPipeline":
            return withSharedFields({
                taskGuidance: payload.taskGuidance,
                taskPipeline: payload.taskPipeline,
            });
        case "taskCompletionSpeed":
            return withSharedFields({ taskDurationBuckets: payload.taskDurationBuckets });
        case "taskLeaderboard":
            return withSharedFields({ taskLeaderboard: payload.taskLeaderboard });
        case "notificationFunnel":
            return withSharedFields({
                notificationFunnel: payload.notificationFunnel,
                notificationActions: payload.notificationActions,
                reminderReasons: payload.reminderReasons,
            });
        case "flaggedAccounts":
            return withSharedFields({ security: payload.security });
        default:
            return payload;
    }
}

export async function GET(request: NextRequest) {
    try {
        await guardApiRequest(request, {
            routeName: "admin/analytics/historical",
            preAuthRouteName: "admin/analytics/historical/preauth",
            preAuthRateLimit: ADMIN_ANALYTICS,
            rateLimit: ADMIN_ANALYTICS,
            auth: "admin",
            scopeToCaller: true,
        });

        const searchParams = request.nextUrl.searchParams;
        const period = searchParams.get("period"); // "24h", "7d", "30d", "all"
        const viewerUser = searchParams.get("viewerUser")?.trim() || "";
        const section = searchParams.get("section")?.trim() || null;

        if (!propertyId) {
            return NextResponse.json({
                error: "GA_PROPERTY_ID is missing from environment variables.",
                requiresSetup: true
            }, { status: 400 });
        }

        // Removed old !analyticsClient check since ADC is supported on App Hosting

            const { startDate, endDate, startMs, endMs, startDayKey, endDayKey, timelineBucket } = getRangeWindow(period);
            const dropReferences = await getAllDropReferenceMap();

            const {
                issues,
                response,
                eventsResponse,
                geoResponse,
                pagesResponse,
                devicesResponse,
                onboardingResponse,
                dailyRollupsSnapshot,
                pageRollupsSnapshot,
                dropDailySnapshot,
                taskDailySnapshot,
                commerceDailySnapshot,
                sessionFactsSnapshot,
                pipelineHealthSnapshot,
                analyticsEventFactsSnapshot,
                analyticsEventStatsSnapshot,
                securityEventsSnapshot,
                guestBatchesSnapshot,
                commerceSummarySnapshot,
                serverDiagnosticsSnapshot,
                taskRollupSnapshot,
                dropsSnapshot,
                watchSessionsSnapshot,
                watchAssetsSnapshot,
                telemetryLogsByEvent,
                taskEventsSnapshot,
                transactionsInRangeSnapshot,
            } = await fetchAdminHistoricalAnalyticsSources({
                analyticsClient,
                propertyId,
                startDate,
                endDate,
                startDayKey,
                startMs,
                period,
                timelineBucket,
            });

            const {
                chartData,
                totals,
                gaEventCounts,
                geoData,
                devices,
                pagesData,
                pageRollupMap,
            } = buildHistoricalTrafficOverview({
                responseRows: response.rows || [],
                eventRows: eventsResponse.rows || [],
                geoRows: geoResponse.rows || [],
                deviceRows: devicesResponse.rows || [],
                pageRows: pagesResponse.rows || [],
                dailyRollups: dailyRollupsSnapshot.docs,
                pageRollups: pageRollupsSnapshot.docs,
                analyticsEventFacts: analyticsEventFactsSnapshot.docs,
                guestBatchDocs: guestBatchesSnapshot.docs,
                sessionFacts: sessionFactsSnapshot.docs,
                startMs,
                endMs,
                startDayKey,
                endDayKey,
                timelineBucket,
                authenticatedPageViewEventNames: AUTHENTICATED_PAGE_VIEW_EVENT_NAMES,
            });
            const filteredDailyRollups = dailyRollupsSnapshot.docs.filter((doc) => doc.id >= startDayKey);

            const dropsData = period === "all"
                ? (dropsSnapshot?.docs || [])
                    .map((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
                        const data = doc.data() as Record<string, unknown>;
                        return {
                            dropId: doc.id,
                            dropTitle: resolveDropTitle(dropReferences, doc.id),
                            views: getDropViewCount(data),
                            unlocks: toNumber(data.totalUnlocks),
                        };
                    })
                    .filter((drop: { views: number; unlocks: number }) => drop.views > 0 || drop.unlocks > 0)
                    .sort((a: { views: number; unlocks: number }, b: { views: number; unlocks: number }) => b.views - a.views || b.unlocks - a.unlocks)
                    .slice(0, 15)
                : (() => {
                    const dropMap = new Map<string, { views: number; unlocks: number }>();
                    dropDailySnapshot.docs.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
                        const data = doc.data() as Record<string, unknown>;
                        const dropId = toStringValue(data.dropId);
                        if (!dropId) {
                            return;
                        }

                        const current = dropMap.get(dropId) || { views: 0, unlocks: 0 };
                        current.views += Math.max(toNumber(data.viewCount), toNumber(data.eventCount));
                        current.unlocks += toNumber(data.unwrapCount);
                        dropMap.set(dropId, current);
                    });

                    return Array.from(dropMap.entries())
                        .map(([id, stats]) => ({
                            dropId: id,
                            dropTitle: resolveDropTitle(dropReferences, id),
                            views: stats.views,
                            unlocks: stats.unlocks,
                        }))
                        .sort((a, b) => b.views - a.views || b.unlocks - a.unlocks)
                        .slice(0, 15);
                })();

            const normalizedTransactionsInRange = transactionsInRangeSnapshot.docs.flatMap((doc) => {
                try {
                    const normalized = normalizeTransactionRecord(doc.data(), doc.id);
                    const normalizedTimestamp = toNumber(normalized.timestamp);
                    if (normalizedTimestamp < startMs) {
                        return [];
                    }

                    return [{ ...normalized, timestamp: normalizedTimestamp }];
                } catch {
                    return [];
                }
            });
            const rawTransactions = normalizedTransactionsInRange.slice(0, 50);
            const creatorSpendParitySummary = normalizedTransactionsInRange.reduce((summary, transaction) => {
                const classified = classifyGumdropTransaction({
                    type: transaction.type,
                    amount: transaction.amount,
                    status: transaction.status,
                    rewardSource: transaction.rewardSource,
                    purchasedAmountSpent: transaction.purchasedAmountSpent,
                    rewardAmountSpent: transaction.rewardAmountSpent,
                    paidGumDrops: transaction.paidGumDrops,
                    bonusGumDrops: transaction.bonusGumDrops,
                });

                summary.creatorSpendTransactionCount += classified.creatorSpendTransactionCount;
                summary.creatorSpendParityMismatchCount += classified.creatorSpendParityMismatchCount;
                summary.creatorRestrictedSpendViolationCount += classified.creatorRestrictedSpendViolationCount;
                return summary;
            }, {
                creatorSpendTransactionCount: 0,
                creatorSpendParityMismatchCount: 0,
                creatorRestrictedSpendViolationCount: 0,
            });

            const userUids = new Set<string>();
            rawTransactions.forEach((tx) => {
                if (tx.userId) {
                    userUids.add(tx.userId);
                }
            });
            telemetryLogsByEvent.viewer_opened?.forEach((record) => {
                if (record.userId) {
                    userUids.add(record.userId);
                }
            });
            securityEventsSnapshot.docs.forEach((doc) => {
                const data = doc.data() as Record<string, unknown>;
                const userId = toStringValue(data.userId);
                if (userId) {
                    userUids.add(userId);
                }
            });

            const userMap = await buildHistoricalAnalyticsUserMap({
                usersCollection: adminDb.collection("users"),
                userIds: userUids,
            });

            const telemetryLogs = Object.values(telemetryLogsByEvent).flat().sort((left, right) => right.timestamp - left.timestamp);
            const telemetryEventCounts = Object.fromEntries(
                Object.entries(telemetryLogsByEvent).map(([eventName, records]) => [eventName, records.length]),
            );
            const rawCanonicalEventCounts = analyticsEventFactsSnapshot.docs.reduce<Record<string, number>>((acc, doc) => {
                const data = doc.data() as Record<string, unknown>;
                const eventName = toStringValue(data.eventName);
                const timestamp = toNumber(data.timestamp);
                if (!eventName || timestamp < startMs) {
                    return acc;
                }

                acc[eventName] = (acc[eventName] || 0) + 1;
                return acc;
            }, {});
            const canonicalEventCounts = period === "all"
                ? analyticsEventStatsSnapshot.docs.reduce<Record<string, number>>((acc, doc) => {
                    const data = doc.data() as Record<string, unknown>;
                    const eventName = toStringValue(data.eventName) || doc.id;
                    if (!eventName) {
                        return acc;
                    }

                    acc[eventName] = Math.max(
                        toNumber(data.totalCount),
                        rawCanonicalEventCounts[eventName] || 0,
                    );
                    return acc;
                }, { ...rawCanonicalEventCounts })
                : rawCanonicalEventCounts;
            const eventsData = Object.fromEntries(buildMergedCountMap(
                gaEventCounts,
                telemetryEventCounts,
                canonicalEventCounts,
            ));
            const eventBreakdown = Array.from(buildMergedCountMap(
                gaEventCounts,
                telemetryEventCounts,
                canonicalEventCounts,
            ).entries())
                .map(([eventName, count]) => ({ eventName, count }))
                .sort((a, b) => b.count - a.count);
            const firstPartyAuthenticatedEvents = filteredDailyRollups.reduce((total, doc) => {
                const data = doc.data() as Record<string, unknown>;
                return total + toNumber(data.authenticatedEvents);
            }, 0);
            const firstPartyTaskLifecycleEvents = sumSnapshotField(taskDailySnapshot, "eventCount");
            const completedPurchaseTransactions = normalizedTransactionsInRange.filter((tx) => tx.type === "purchase_currency" && tx.status === "completed");
            const unlockTransactions = normalizedTransactionsInRange.filter((tx) => tx.type === "unlock_content");
            const commerceSummaryData = commerceSummarySnapshot.exists
                ? (commerceSummarySnapshot.data() as Record<string, unknown>)
                : {};
            const firstPartyPurchaseCount = period === "all"
                ? Math.max(toNumber(commerceSummaryData.purchaseCount), completedPurchaseTransactions.length)
                : Math.max(sumSnapshotField(commerceDailySnapshot, "purchaseCount"), completedPurchaseTransactions.length);
            const firstPartyUnlockCount = period === "all"
                ? Math.max(toNumber(commerceSummaryData.unlockCount), unlockTransactions.length)
                : Math.max(sumSnapshotField(commerceDailySnapshot, "unlockCount"), unlockTransactions.length);
            const normalizedTaskEvents: TaskLifecycleLog[] = taskEventsSnapshot.docs.flatMap((doc) => {
                const data = doc.data();
                const timestamp = toNumber(data.timestamp);
                if (!timestamp || timestamp < startMs) {
                    return [];
                }

                return [{
                    id: doc.id,
                    type: toStringValue(data.type),
                    taskId: toStringValue(data.taskId),
                    title: toStringValue(data.title),
                    triggerEvent: toStringValue(data.triggerEvent),
                    userId: toStringValue(data.userId),
                    username: toStringValue(data.username) || undefined,
                    reward: toNumber(data.reward),
                    progress: toNumber(data.progress),
                    maxProgress: toNumber(data.maxProgress),
                    timestamp,
                    reason: toStringValue(data.reason) || undefined,
                    assignedAt: toNumber(data.assignedAt) || undefined,
                    startedAt: toNumber(data.startedAt) || undefined,
                    durationMs: toNumber(data.durationMs) || undefined,
                }];
            });
            const {
                mappedCommerceFeed,
                securityLogs,
                mappedEvents,
            } = buildHistoricalActivityFeeds({
                rawTransactions,
                telemetryLogs,
                guestBatchDocs: guestBatchesSnapshot.docs,
                normalizedTaskEvents,
                securityEventDocs: securityEventsSnapshot.docs,
                userMap,
                dropReferences,
                startMs,
            });
            const derivedCommerceTotals = normalizedTransactionsInRange.reduce((acc, transaction) => {
                if (transaction.type === "purchase_currency" && transaction.status === "completed") {
                    const economics = deriveGumdropEconomics(
                        transaction.deliveredGumDrops ?? transaction.amount,
                        transaction.grossRevenueUsd ?? transaction.cost ?? 0,
                        {
                            paypalFeeUsd: transaction.paypalFeeUsd,
                            netRevenueUsd: transaction.netRevenueUsd,
                        },
                    );
                    acc.revenueUsd += economics.grossRevenueUsd;
                    acc.adjustedProfitUsd += economics.adjustedProfitUsd;
                    acc.bonusValueUsd += economics.bonusValueUsd;
                    acc.deliveredGumDrops += economics.deliveredGumDrops;
                    acc.bonusGumDrops += economics.bonusGumDrops;
                } else if (transaction.type === "unlock_content") {
                    acc.gdSpent += Math.abs(toNumber(transaction.amount));
                }

                return acc;
            }, {
                revenueUsd: 0,
                adjustedProfitUsd: 0,
                bonusValueUsd: 0,
                deliveredGumDrops: 0,
                bonusGumDrops: 0,
                gdSpent: 0,
            });
            const commerceTotals = period === "all" && commerceSummarySnapshot.exists
                ? {
                    revenueUsd: Math.max(toNumber(commerceSummaryData.grossRevenueUsdTotal), derivedCommerceTotals.revenueUsd),
                    adjustedProfitUsd: Math.max(toNumber(commerceSummaryData.adjustedProfitUsdTotal), derivedCommerceTotals.adjustedProfitUsd),
                    bonusValueUsd: Math.max(toNumber(commerceSummaryData.bonusValueUsdTotal), derivedCommerceTotals.bonusValueUsd),
                    deliveredGumDrops: Math.max(toNumber(commerceSummaryData.deliveredGumDropsTotal), derivedCommerceTotals.deliveredGumDrops),
                    bonusGumDrops: Math.max(toNumber(commerceSummaryData.bonusGumDropsTotal), derivedCommerceTotals.bonusGumDrops),
                    gdSpent: Math.max(toNumber(commerceSummaryData.spendGdTotal), derivedCommerceTotals.gdSpent),
                }
                : derivedCommerceTotals;
            const commerce = {
                revenueUsd: commerceTotals.revenueUsd,
                adjustedProfitUsd: commerceTotals.adjustedProfitUsd,
                bonusValueUsd: commerceTotals.bonusValueUsd,
                deliveredGumDrops: commerceTotals.deliveredGumDrops,
                bonusGumDrops: commerceTotals.bonusGumDrops,
                effectiveUsdPer100Gd: commerceTotals.deliveredGumDrops > 0 ? commerceTotals.revenueUsd / (commerceTotals.deliveredGumDrops / 100) : 0,
                gdSpent: commerceTotals.gdSpent,
                feed: mappedCommerceFeed,
            };
            const semanticCategories = buildSemanticCategorySummaries({
                eventFacts: analyticsEventFactsSnapshot.docs.map((doc) => doc.data() as Record<string, unknown>),
                guestBatches: guestBatchesSnapshot.docs.map((doc) => doc.data() as Record<string, unknown>),
                sessionFacts: sessionFactsSnapshot.docs.map((doc) => doc.data() as Record<string, unknown>),
            }).map((item) => ({
                ...item,
                avgViewSeconds: item.viewCount > 0 ? Math.round(item.viewDurationMs / Math.max(item.viewCount, 1) / 1000) : 0,
                engagedRate: item.viewCount > 0 ? item.engagedViewCount / Math.max(item.viewCount, 1) : 0,
            }));
            const semanticEngine = {
                sources: ANALYTICS_SEMANTIC_SOURCE_REGISTRY,
                strategies: ANALYTICS_SEMANTIC_STRATEGIES,
            };
            const registrationFacts: RegistrationFactRecord[] = analyticsEventFactsSnapshot.docs
                .map((doc) => {
                    const data = doc.data() as Record<string, unknown>;
                    const params = safeParams(data.params);
                    return {
                        eventName: toStringValue(data.eventName),
                        timestamp: toNumber(data.timestamp),
                        registrationMethod: toStringValue(params.registration_method || params.auth_provider || ""),
                    };
                })
                .filter((fact) => fact.eventName === "user_registered" && fact.timestamp >= startMs && fact.registrationMethod !== "");
            const canonicalRegistrationCount = period === "all"
                ? Math.max(
                    registrationFacts.length,
                    toNumber(analyticsEventStatsSnapshot.docs.find((doc) => doc.id === "user_registered")?.data()?.totalCount),
                )
                : registrationFacts.length;
            const emailRegistrationCount = registrationFacts.filter((fact) => fact.registrationMethod === "email").length;
            const telemetryPurchaseCount = Math.max(eventsData.gumdrops_purchase_completed || 0, eventsData.purchase || 0);
            const purchases = Math.max(telemetryPurchaseCount, firstPartyPurchaseCount);
            const telemetryUnlockCount = eventsData.unlock_drop_success || 0;
            const canonicalUnlockCount = Math.max(firstPartyUnlockCount, telemetryUnlockCount);
            const normalizedSignupCount = canonicalRegistrationCount > 0
                ? canonicalRegistrationCount
                : eventsData.auth_sign_up_success || 0;
            const funnel = {
                authModalOpens: eventsData.auth_modal_opened || 0,
                authSignIns: (eventsData.auth_sign_in_success || 0) + (eventsData.auth_google_sign_in_success || 0),
                authSignUps: normalizedSignupCount,
                previewOpens: eventsData.drop_preview_opened || 0,
                viewerOpens: eventsData.viewer_opened || 0,
                assetSwitches: eventsData.viewer_asset_changed || 0,
                unlocks: canonicalUnlockCount,
                shares: eventsData.drop_share_copied || 0,
                walletOpens: eventsData.wallet_opened || 0,
                checkoutStarts: eventsData.begin_checkout || 0,
                purchases,
                checkIns: eventsData.daily_check_in_claim || 0,
                experienceViews: eventsData.experience_hub_viewed || 0,
            };

            const {
                onboardingDurationMsSamples,
                onboardingStepFacts,
                onboardingStepStats,
                guidedOnboardingCompletionCount,
                legacyOnboardingCompletionCount,
                normalizedOnboardingCompletions,
                onboardingStartCount,
                onboardingStartSource,
                avgOnboardingDuration,
                onboardingCompletionRate,
            } = buildHistoricalOnboardingOverview({
                onboardingRows: onboardingResponse.rows || [],
                analyticsEventFacts: analyticsEventFactsSnapshot.docs,
                startMs,
                eventsData,
            });
            const semanticMetricReport = buildAnalyticsMetricReport({
                eventFacts: analyticsEventFactsSnapshot.docs.map((doc) => doc.data() as Record<string, unknown>),
                guestBatches: guestBatchesSnapshot.docs.map((doc) => doc.data() as Record<string, unknown>),
                sessionFacts: sessionFactsSnapshot.docs.map((doc) => doc.data() as Record<string, unknown>),
                eventCounts: eventsData,
                onboarding: {
                    registrations: canonicalRegistrationCount,
                    starts: onboardingStartCount,
                    stepStarts: onboardingStepFacts.filter((fact) => fact.eventName === "guided_onboarding_step_started").length,
                    stepCompletions: onboardingStepFacts.filter((fact) => fact.eventName === "guided_onboarding_step_completed").length,
                },
            });

            const {
                authBreakdown,
                onboardingDurationBuckets,
                repeatVisitSegments,
                destinationMix,
                notificationFunnel,
                notificationActions,
            } = buildHistoricalEngagementAnalytics({
                telemetryLogs,
                telemetryLogsByEvent,
                eventsData,
                onboardingDurationMsSamples,
                emailRegistrationCount,
                canonicalRegistrationCount,
            });

            const {
                taskGuidance,
                taskPipeline,
                taskLeaderboard,
                taskDurationBuckets,
                reminderReasons,
            } = buildHistoricalTaskAnalytics({
                eventsData,
                normalizedTaskEvents,
            });

            const {
                filteredSessionFacts,
                viewerSessionStartedLogs,
                viewerOverviewCanonical,
                viewerDropInsights,
                viewerUsers,
            } = buildHistoricalViewerOverview({
                telemetryLogsByEvent,
                sessionFacts: sessionFactsSnapshot.docs,
                watchSessionDocs: watchSessionsSnapshot.docs,
                watchAssetDocs: watchAssetsSnapshot.docs,
                viewerUser,
                dropReferences,
            });
            const watchCaptureHealth = buildWatchCaptureHealthSummary({
                watchSessionDocs: watchSessionsSnapshot.docs,
                watchAssetDocs: watchAssetsSnapshot.docs,
            });
            const contextInsights = buildHistoricalAnalyticsContext({
                telemetryLogs,
                guestBatchDocs: guestBatchesSnapshot.docs,
                viewerDropInsights,
                viewerUsers,
                securityEventDocs: securityEventsSnapshot.docs,
            });

            const {
                packagePerformance,
                unlockCategoryMix,
                watchDepthBuckets,
                contentJourney,
                contentTagDemand,
            } = buildHistoricalContentAnalytics({
                telemetryLogsByEvent,
                eventsData,
                watchAssetDocs: watchAssetsSnapshot.docs,
                viewerOverview: viewerOverviewCanonical,
                funnel: {
                    previewOpens: funnel.previewOpens,
                    unlocks: funnel.unlocks,
                    viewerOpens: funnel.viewerOpens,
                },
            });

            const guestInteractionCount = guestBatchesSnapshot.docs.reduce((total, doc) => {
                const data = doc.data() as Record<string, unknown>;
                return total + toNumber(data.eventCount);
            }, 0);
            const analyticsTruth = summarizeAnalyticsTruth({
                nowMs: Date.now(),
                sources: [
                    {
                        key: "analytics_event_stats",
                        label: "Event stats",
                        count: analyticsEventStatsSnapshot.docs.length,
                        lastSeenAt: readLatestSnapshotTimestamp(analyticsEventStatsSnapshot.docs, ["lastSeenAt", "updatedAt"]),
                        detail: "Canonical event counters and last-seen timestamps.",
                    },
                    {
                        key: "analytics_rollups_daily",
                        label: "Daily analytics rollups",
                        count: dailyRollupsSnapshot.docs.length,
                        lastSeenAt: readLatestSnapshotTimestamp(dailyRollupsSnapshot.docs, ["lastEventAt", "updatedAt"]),
                        legacyHistoricalSupport: true,
                        detail: "Historical day buckets for authenticated analytics activity.",
                    },
                    {
                        key: "analytics_page_daily",
                        label: "Page daily rollups",
                        count: pageRollupsSnapshot.docs.length,
                        lastSeenAt: readLatestSnapshotTimestamp(pageRollupsSnapshot.docs, ["lastEventAt", "updatedAt"]),
                        required: false,
                        legacyHistoricalSupport: true,
                        detail: "Historical page-level trend and dwell support.",
                    },
                    {
                        key: "analytics_drop_daily",
                        label: "Drop daily rollups",
                        count: dropDailySnapshot.docs.length,
                        lastSeenAt: readLatestSnapshotTimestamp(dropDailySnapshot.docs, ["lastEventAt", "updatedAt"]),
                        legacyHistoricalSupport: true,
                        detail: "Historical drop engagement and unwrap support.",
                    },
                    {
                        key: "analytics_commerce_daily",
                        label: "Commerce daily rollups",
                        count: commerceDailySnapshot.docs.length,
                        lastSeenAt: readLatestSnapshotTimestamp(commerceDailySnapshot.docs, ["lastTransactionAt", "updatedAt"]),
                        legacyHistoricalSupport: true,
                        detail: "Historical purchase and unlock rollups.",
                    },
                    {
                        key: "analytics_commerce_rollup",
                        label: "Commerce summary rollup",
                        count: commerceSummarySnapshot.exists ? 1 : 0,
                        lastSeenAt: commerceSummarySnapshot.exists
                            ? Math.max(
                                toNumber((commerceSummarySnapshot.data() as Record<string, unknown>).lastTransactionAt),
                                toTimestampNumber((commerceSummarySnapshot.data() as Record<string, unknown>).updatedAt),
                            )
                            : 0,
                        detail: "Lifetime commerce summary used for all-range analytics parity.",
                    },
                    {
                        key: "analytics_guest_batches",
                        label: "Guest batches",
                        count: guestBatchesSnapshot.docs.length,
                        lastSeenAt: readLatestSnapshotTimestamp(guestBatchesSnapshot.docs, ["receivedAtMs", "createdAt", "updatedAt"]),
                        required: false,
                        legacyHistoricalSupport: true,
                        detail: "Anonymous browsing history support for legacy and guest traffic.",
                    },
                    {
                        key: "analytics_watch_sessions",
                        label: "Watch sessions",
                        count: watchSessionsSnapshot.docs.length,
                        lastSeenAt: readLatestSnapshotTimestamp(watchSessionsSnapshot.docs, ["lastSeenAtMs", "updatedAt", "createdAt"]),
                        detail: "Canonical watch-session history.",
                    },
                    {
                        key: "analytics_watch_assets",
                        label: "Watch assets",
                        count: watchAssetsSnapshot.docs.length,
                        lastSeenAt: readLatestSnapshotTimestamp(watchAssetsSnapshot.docs, ["lastSeenAtMs", "updatedAt", "createdAt"]),
                        detail: "Asset-level watch history backing canonical sessions.",
                    },
                    {
                        key: "transactions",
                        label: "Transactions",
                        count: transactionsInRangeSnapshot.docs.length,
                        lastSeenAt: readLatestSnapshotTimestamp(transactionsInRangeSnapshot.docs, ["timestampMs", "timestamp", "updatedAt", "createdAt"]),
                        detail: "Canonical purchase and spend ledger.",
                    },
                ],
            });
            const pipelineFailureCount = pipelineHealthSnapshot.docs.reduce((total, doc) => {
                const data = doc.data() as Record<string, unknown>;
                return total + toNumber(data.failureCount);
            }, 0);
            const pageRollupViewCount = Array.from(pageRollupMap.values()).reduce((total, entry) => total + entry.views, 0);
            const dropRollupActivityCount = dropDailySnapshot.docs.reduce((total, doc) => {
                const data = doc.data() as Record<string, unknown>;
                return total + toNumber(data.eventCount) + toNumber(data.unwrapCount);
            }, 0);
            const viewerSessionFactCount = filteredSessionFacts.reduce((total, entry) => total + toNumber(entry.startedCount) + toNumber(entry.completedCount), 0);
            const {
                moduleCoverage,
                unhealthyModules,
                parityScore,
                validations,
            } = buildHistoricalValidationSummary({
                propertyId,
                gaEventCounts,
                telemetryEventCounts,
                canonicalEventCounts,
                taskPipeline,
                normalizedTaskEventCount: normalizedTaskEvents.length,
                firstPartyTaskLifecycleEvents,
                firstPartyPurchaseCount,
                firstPartyUnlockCount,
                completedPurchaseTransactionsCount: completedPurchaseTransactions.length,
                unlockTransactionsCount: unlockTransactions.length,
                guestInteractionCount,
                pageRollupViewCount,
                dropRollupActivityCount,
                viewerSessionFactCount,
                securityEventsCount: securityEventsSnapshot.size,
                securityLogCount: securityLogs.length,
                guidedOnboardingCompletionCount,
                legacyOnboardingCompletionCount,
                normalizedOnboardingCompletions,
                onboardingStartCount,
                onboardingStartSource,
                taskGuidance: {
                    viewed: taskGuidance.viewed,
                    dismissed: taskGuidance.dismissed,
                    tapped: taskGuidance.tapped,
                    completed: taskGuidance.completed,
                },
                firstPartyAuthenticatedEvents,
                telemetryLogCount: telemetryLogs.length,
                telemetryPurchaseCount,
                telemetryUnlockCount,
                viewerSessionCount: viewerOverviewCanonical.sessionCount,
                watchSessionCount: watchSessionsSnapshot.size,
                watchAssetCount: watchAssetsSnapshot.size,
                watchCaptureFullCount: watchCaptureHealth.fullCaptureCount,
                watchCaptureDegradedCount: watchCaptureHealth.degradedSessionCount,
                watchCaptureCloseMissingCount: watchCaptureHealth.closeMissingCount,
                watchCaptureReplayRecoveredCount: watchCaptureHealth.replayRecoveredCount,
                filteredSessionFactsLength: filteredSessionFacts.length,
                viewerSessionStartedLogsLength: viewerSessionStartedLogs.length,
                pipelineFailureCount,
                creatorSpendTransactionCount: creatorSpendParitySummary.creatorSpendTransactionCount,
                creatorSpendParityMismatchCount: creatorSpendParitySummary.creatorSpendParityMismatchCount,
                creatorRestrictedSpendViolationCount: creatorSpendParitySummary.creatorRestrictedSpendViolationCount,
                truthState: analyticsTruth,
            });
            const opsHealth = buildAdminOpsHealth({
                diagnosticsDocs: serverDiagnosticsSnapshot.docs,
                pipelineDocs: pipelineHealthSnapshot.docs,
                eventStatsDocs: analyticsEventStatsSnapshot.docs,
                taskRollupDocs: taskRollupSnapshot.docs,
                guestBatchDocs: guestBatchesSnapshot.docs,
                securityEventDocs: securityEventsSnapshot.docs,
                watchSessionDocs: watchSessionsSnapshot.docs,
                watchAssetDocs: watchAssetsSnapshot.docs,
                commerceSummaryDoc: commerceSummarySnapshot,
            });

            const payload = {
                generatedAtMs: Date.now(),
                data: chartData,
                totals,
                events: eventsData,
                eventBreakdown,
                devices,
                funnel,
                geo: geoData,
                pages: pagesData,
                topDrops: dropsData,
                commerce,
                security: securityLogs,
                onboardingStats: {
                    starts: onboardingStartCount,
                    completions: normalizedOnboardingCompletions,
                    avgDuration: avgOnboardingDuration,
                    completionRate: onboardingCompletionRate,
                    startSource: onboardingStartSource,
                },
                onboardingStepStats,
                rawEvents: mappedEvents,
                componentContexts: contextInsights.componentContexts,
                userJourneys: contextInsights.userJourneys,
                experienceContexts: contextInsights.experienceContexts,
                securityReasons: contextInsights.securityReasons,
                authBreakdown,
                onboardingDurationBuckets,
                repeatVisitSegments,
                destinationMix,
                notificationFunnel,
                notificationActions,
                taskGuidance: {
                    ...taskGuidance,
                    tapThroughRate: taskGuidance.viewed > 0 ? taskGuidance.tapped / taskGuidance.viewed : 0,
                    guidedCompletionRate: taskGuidance.tapped > 0 ? taskGuidance.completed / taskGuidance.tapped : 0,
                },
                taskPipeline,
                taskLeaderboard,
                taskDurationBuckets,
                reminderReasons,
                packagePerformance,
                unlockCategoryMix,
                watchDepthBuckets,
                contentJourney,
                contentTagDemand,
                viewerOverview: viewerOverviewCanonical,
                viewerDropInsights,
                viewerUsers,
                watchCaptureHealth,
                viewerFilter: viewerUser,
                semanticCategories,
                semanticEngine,
                socialMetrics: semanticMetricReport,
                moduleCoverage,
                unhealthyModules,
                parityScore,
                truthState: analyticsTruth,
                validations,
                opsHealth,
            };

            return NextResponse.json({
                success: true,
                issues,
                ...scopeHistoricalResponse(section, payload),
            });

    } catch (error) {
        return handleApiError(error, "Admin.Analytics.Historical.GET");
    }
}
