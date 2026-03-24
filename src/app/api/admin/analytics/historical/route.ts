export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/server/auth";
import { adminDb } from "@/lib/server/firebase-admin";
import { ANALYTICS_SEMANTIC_SOURCE_REGISTRY, ANALYTICS_SEMANTIC_STRATEGIES } from "@/lib/analytics-semantics";
import { deriveGumdropEconomics } from "@/lib/gumdrop-economics";
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
import { buildAdminOpsHealth } from "@/lib/server/admin-ops-health";
import { buildSemanticCategorySummaries } from "@/lib/server/analytics-semantics";
import { buildAnalyticsMetricReport } from "@/lib/server/analytics-metrics";
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

function scopeHistoricalResponse(section: string | null, payload: Record<string, unknown>) {
    switch (section) {
        case "stationSnapshot":
            return {
                totals: payload.totals,
                devices: payload.devices,
                commerce: payload.commerce,
                security: payload.security,
            };
        case "livePulse":
            return {
                funnel: payload.funnel,
                onboardingStats: payload.onboardingStats,
            };
        case "journeyFunnel":
            return { funnel: payload.funnel };
        case "authOutcomeSplit":
            return { authBreakdown: payload.authBreakdown };
        case "onboardingVelocity":
            return {
                onboardingStats: payload.onboardingStats,
                onboardingStepStats: payload.onboardingStepStats,
                onboardingDurationBuckets: payload.onboardingDurationBuckets,
            };
        case "eventMix":
            return { eventBreakdown: payload.eventBreakdown };
        case "liveInteractionStream":
            return { rawEvents: payload.rawEvents };
        case "serverTelemetryHealth":
            return { opsHealth: payload.opsHealth };
        case "coverageEngine":
            return {
                moduleCoverage: payload.moduleCoverage,
                unhealthyModules: payload.unhealthyModules,
                parityScore: payload.parityScore,
            };
        case "categorySemantics":
            return { semanticCategories: payload.semanticCategories };
        case "creatorMetrics":
            return { socialMetrics: payload.socialMetrics };
        case "semanticsEngine":
            return { semanticEngine: payload.semanticEngine };
        case "dataValidation":
            return { validations: payload.validations };
        case "audienceSnapshot":
            return {
                data: payload.data,
                totals: payload.totals,
                devices: payload.devices,
            };
        case "returnCadence":
            return { repeatVisitSegments: payload.repeatVisitSegments };
        case "navigationDestinations":
            return { destinationMix: payload.destinationMix };
        case "deviceMix":
            return { devices: payload.devices };
        case "topPaths":
            return { pages: payload.pages };
        case "regions":
            return { geo: payload.geo };
        case "commerceSnapshot":
            return {
                commerce: payload.commerce,
                funnel: payload.funnel,
            };
        case "packagePerformance":
            return { packagePerformance: payload.packagePerformance };
        case "contentConversion":
            return { unlockCategoryMix: payload.unlockCategoryMix };
        case "topDropConversion":
            return { topDrops: payload.topDrops };
        case "recentCommerceFeed":
            return { commerce: payload.commerce };
        case "viewerDrilldown":
            return {
                viewerOverview: payload.viewerOverview,
                viewerDropInsights: payload.viewerDropInsights,
                viewerUsers: payload.viewerUsers,
                viewerFilter: payload.viewerFilter,
            };
        case "viewerJourney":
            return { contentJourney: payload.contentJourney };
        case "watchDepthTags":
            return {
                watchDepthBuckets: payload.watchDepthBuckets,
                contentTagDemand: payload.contentTagDemand,
            };
        case "securityPosture":
            return {
                security: payload.security,
                funnel: payload.funnel,
            };
        case "dailyTaskPipeline":
            return {
                taskGuidance: payload.taskGuidance,
                taskPipeline: payload.taskPipeline,
            };
        case "taskCompletionSpeed":
            return { taskDurationBuckets: payload.taskDurationBuckets };
        case "taskLeaderboard":
            return { taskLeaderboard: payload.taskLeaderboard };
        case "notificationFunnel":
            return {
                notificationFunnel: payload.notificationFunnel,
                notificationActions: payload.notificationActions,
                reminderReasons: payload.reminderReasons,
            };
        case "flaggedAccounts":
            return { security: payload.security };
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

            const { startDate, startMs } = getRangeWindow(period);
            const dropReferences = await getAllDropReferenceMap();
            const startDayKey = new Date(startMs).toISOString().slice(0, 10);

            const {
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
                telemetryLogsByEvent,
                taskEventsSnapshot,
                transactionsInRangeSnapshot,
            } = await fetchAdminHistoricalAnalyticsSources({
                analyticsClient,
                propertyId,
                startDate,
                startDayKey,
                startMs,
                period,
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
                startDayKey,
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

            const userMap: Record<string, { username: string, photoURL: string }> = {};
            const uidArray = Array.from(userUids);
            if (uidArray.length > 0) {
                for (let i = 0; i < uidArray.length; i += 30) {
                    const chunk = uidArray.slice(i, i + 30);
                    const usersSnapshot = await adminDb.collection("users").where("__name__", "in", chunk).get();
                    usersSnapshot.docs.forEach((doc: any) => {
                        const data = doc.data();
                        userMap[doc.id] = {
                            username: data.username || data.displayName || "Unknown User",
                            photoURL: data.photoURL || ""
                        };
                    });
                }
            }

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
                packagePerformance,
                unlockCategoryMix,
                watchDepthBuckets,
                contentJourney,
                contentTagDemand,
            } = buildHistoricalContentAnalytics({
                telemetryLogsByEvent,
                eventsData,
                funnel: {
                    previewOpens: funnel.previewOpens,
                    unlocks: funnel.unlocks,
                    viewerOpens: funnel.viewerOpens,
                },
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
                viewerUser,
                dropReferences,
            });

            const guestInteractionCount = guestBatchesSnapshot.docs.reduce((total, doc) => {
                const data = doc.data() as Record<string, unknown>;
                return total + toNumber(data.eventCount);
            }, 0);
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
                filteredSessionFactsLength: filteredSessionFacts.length,
                viewerSessionStartedLogsLength: viewerSessionStartedLogs.length,
                pipelineFailureCount,
            });
            const opsHealth = buildAdminOpsHealth({
                diagnosticsDocs: serverDiagnosticsSnapshot.docs,
                pipelineDocs: pipelineHealthSnapshot.docs,
                eventStatsDocs: analyticsEventStatsSnapshot.docs,
                taskRollupDocs: taskRollupSnapshot.docs,
                guestBatchDocs: guestBatchesSnapshot.docs,
                securityEventDocs: securityEventsSnapshot.docs,
                commerceSummaryDoc: commerceSummarySnapshot,
            });

            const payload = {
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
                viewerFilter: viewerUser,
                semanticCategories,
                semanticEngine,
                socialMetrics: semanticMetricReport,
                moduleCoverage,
                unhealthyModules,
                parityScore,
                validations,
                opsHealth,
            };

            return NextResponse.json({
                success: true,
                ...scopeHistoricalResponse(section, payload),
            });

    } catch (error) {
        return handleApiError(error, "Admin.Analytics.Historical.GET");
    }
}
