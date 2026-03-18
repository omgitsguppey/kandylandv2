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
import { buildHistoricalContentAnalytics } from "@/lib/server/admin-analytics-historical-content";
import { buildHistoricalOnboardingOverview } from "@/lib/server/admin-analytics-historical-onboarding";
import { buildHistoricalTrafficOverview } from "@/lib/server/admin-analytics-historical-traffic";
import { buildHistoricalValidationSummary } from "@/lib/server/admin-analytics-historical-validation";
import { buildHistoricalViewerOverview } from "@/lib/server/admin-analytics-historical-viewer";
import { buildSemanticCategorySummaries, summarizeSecurityReason } from "@/lib/server/analytics-semantics";
import { buildAnalyticsMetricReport } from "@/lib/server/analytics-metrics";
import { getDropViewCount } from "@/lib/drop-engagement";
import {
    AUTHENTICATED_PAGE_VIEW_EVENT_NAMES,
    RegistrationFactRecord,
    TaskLifecycleLog,
    TelemetryLogRecord,
    buildDurationBuckets,
    buildMergedCountMap,
    formatTaskReason,
    getRangeWindow,
    getTelemetryParamNumber,
    getTelemetryParamString,
    safeParams,
    sumSnapshotField,
    toNumber,
    toStringValue,
} from "@/lib/server/admin-analytics-shared";
import { guardApiRequest } from "@/lib/server/request-guard";
import { ADMIN, HEAVY_READ } from "@/lib/server/rate-limit";

const propertyId = getAdminAnalyticsPropertyId();
const analyticsClient = createAdminAnalyticsDataClient();

export async function GET(request: NextRequest) {
    try {
        await guardApiRequest(request, {
            routeName: "admin/analytics/historical",
            preAuthRouteName: "admin/analytics/historical/preauth",
            preAuthRateLimit: HEAVY_READ,
            rateLimit: ADMIN,
            auth: "admin",
            scopeToCaller: true,
        });

        const searchParams = request.nextUrl.searchParams;
        const period = searchParams.get("period"); // "24h", "7d", "30d", "all"
        const viewerUser = searchParams.get("viewerUser")?.trim() || "";

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
                onboardingFactsSnapshot,
                securityEventsSnapshot,
                guestBatchesSnapshot,
                commerceSummarySnapshot,
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
                ? dropsSnapshot.docs
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

            const mappedCommerceFeed = rawTransactions.map(tx => ({
                ...tx,
                username: tx.userId ? (userMap[tx.userId]?.username || tx.userId) : "Unknown User",
                userPhoto: tx.userId ? (userMap[tx.userId]?.photoURL || "") : ""
            }));

            const telemetryLogs = Object.values(telemetryLogsByEvent).flat().sort((left, right) => right.timestamp - left.timestamp);
            const telemetryEventCounts = Object.fromEntries(
                Object.entries(telemetryLogsByEvent).map(([eventName, records]) => [eventName, records.length]),
            );
            const canonicalEventCounts = analyticsEventFactsSnapshot.docs.reduce<Record<string, number>>((acc, doc) => {
                const data = doc.data() as Record<string, unknown>;
                const eventName = toStringValue(data.eventName);
                if (!eventName) {
                    return acc;
                }

                acc[eventName] = (acc[eventName] || 0) + 1;
                return acc;
            }, {});
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
            const firstPartyPurchaseCount = period === "all"
                ? toNumber(commerceSummarySnapshot.data()?.purchaseCount)
                : sumSnapshotField(commerceDailySnapshot, "purchaseCount");
            const firstPartyUnlockCount = period === "all"
                ? toNumber(commerceSummarySnapshot.data()?.unlockCount)
                : sumSnapshotField(commerceDailySnapshot, "unlockCount");
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
            const commerceTotals = period === "all" && commerceSummarySnapshot.exists
                ? {
                    revenueUsd: toNumber(commerceSummarySnapshot.data()?.grossRevenueUsdTotal),
                    adjustedProfitUsd: toNumber(commerceSummarySnapshot.data()?.adjustedProfitUsdTotal),
                    bonusValueUsd: toNumber(commerceSummarySnapshot.data()?.bonusValueUsdTotal),
                    deliveredGumDrops: toNumber(commerceSummarySnapshot.data()?.deliveredGumDropsTotal),
                    bonusGumDrops: toNumber(commerceSummarySnapshot.data()?.bonusGumDropsTotal),
                    gdSpent: toNumber(commerceSummarySnapshot.data()?.spendGdTotal),
                }
                : normalizedTransactionsInRange.reduce((acc, transaction) => {
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
            const securityByUser = new Map<string, {
                uid: string;
                username: string;
                photoURL?: string;
                ripAttempts: number;
                lastViolation: string | null;
                lastViolationReason: string;
                lastViolationDropId: string | null;
                lastViolationDropTitle: string | null;
            }>();
            securityEventsSnapshot.docs.forEach((doc) => {
                const data = doc.data() as Record<string, unknown>;
                const uid = toStringValue(data.userId);
                if (!uid) {
                    return;
                }

                const current = securityByUser.get(uid) || {
                    uid,
                    username: userMap[uid]?.username || toStringValue(data.username) || uid,
                    photoURL: userMap[uid]?.photoURL || undefined,
                    ripAttempts: 0,
                    lastViolation: null,
                    lastViolationReason: "Unknown",
                    lastViolationDropId: null,
                    lastViolationDropTitle: null,
                };
                const timestamp = toNumber(data.timestamp);
                current.ripAttempts += 1;
                if (!current.lastViolation || timestamp > Date.parse(current.lastViolation)) {
                    const dropId = toStringValue(data.dropId) || null;
                    current.lastViolation = new Date(timestamp).toISOString();
                    current.lastViolationReason = toStringValue(data.label) || summarizeSecurityReason(toStringValue(data.reason)) || "Unknown";
                    current.lastViolationDropId = dropId;
                    current.lastViolationDropTitle = dropId ? resolveDropTitle(dropReferences, dropId) : null;
                }
                securityByUser.set(uid, current);
            });
            const securityLogs = Array.from(securityByUser.values())
                .sort((left, right) => right.ripAttempts - left.ripAttempts || Date.parse(right.lastViolation || "") - Date.parse(left.lastViolation || ""))
                .slice(0, 50);
            const guestActivity = guestBatchesSnapshot.docs.flatMap((doc) => {
                const data = doc.data() as Record<string, unknown>;
                const events = Array.isArray(data.events) ? data.events as Array<Record<string, unknown>> : [];
                return events.map((event) => ({
                    type: toStringValue(event.type) || "guest_event",
                    detail: toStringValue(event.targetText) || toStringValue(event.targetKey) || "Guest interaction",
                    targetText: toStringValue(event.targetText) || undefined,
                    targetTag: toStringValue(event.targetTag) || undefined,
                    targetId: toStringValue(event.targetId) || undefined,
                    scrollDepthPercent: toNumber(event.scrollDepthPercent) || undefined,
                    path: toStringValue(event.path) || toStringValue(data.pagePath) || "/",
                    uid: "guest",
                    username: "Guest",
                    userPhoto: "",
                    timestamp: toNumber(event.timestamp) || toNumber(data.receivedAtMs),
                }));
            });
            const authActivity = telemetryLogs.map((event) => ({
                type: event.eventName,
                detail: getTelemetryParamString(event, "drop_title")
                    || getTelemetryParamString(event, "destination")
                    || getTelemetryParamString(event, "page_path")
                    || event.eventName,
                targetText: getTelemetryParamString(event, "target_text") || undefined,
                targetTag: getTelemetryParamString(event, "target_tag") || undefined,
                targetId: getTelemetryParamString(event, "target_id") || undefined,
                scrollDepthPercent: getTelemetryParamNumber(event, "scroll_depth_percent") || undefined,
                path: getTelemetryParamString(event, "page_path") || "/",
                uid: event.userId || "guest",
                username: event.userId ? (userMap[event.userId]?.username || event.username || event.userId) : "Guest",
                userPhoto: event.userId ? (userMap[event.userId]?.photoURL || "") : "",
                timestamp: event.timestamp,
            }));
            const transactionActivity = rawTransactions.map((transaction) => ({
                type: transaction.type || "transaction",
                detail: transaction.description || (transaction.type === "purchase_currency" ? "Gum Drops purchase" : "Drop unlock"),
                path: "/dashboard",
                uid: transaction.userId || "unknown",
                username: transaction.userId ? (userMap[transaction.userId]?.username || transaction.userId) : "Unknown User",
                userPhoto: transaction.userId ? (userMap[transaction.userId]?.photoURL || "") : "",
                timestamp: toNumber(transaction.timestamp),
            }));
            const taskActivity = normalizedTaskEvents.map((event) => ({
                type: `task_${event.type}`,
                detail: event.title || event.taskId || "Task update",
                path: "/experiences",
                uid: event.userId || "unknown",
                username: event.userId ? (userMap[event.userId]?.username || event.username || event.userId) : "Unknown User",
                userPhoto: event.userId ? (userMap[event.userId]?.photoURL || "") : "",
                timestamp: event.timestamp,
            }));
            const mappedEvents = [
                ...authActivity,
                ...guestActivity,
                ...transactionActivity,
                ...taskActivity,
            ]
                .filter((event) => event.timestamp >= startMs)
                .sort((left, right) => right.timestamp - left.timestamp)
                .slice(0, 200);
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
            const canonicalRegistrationCount = registrationFacts.length;
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
                onboardingFacts: onboardingFactsSnapshot.docs,
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

            const averageDuration = (records: TelemetryLogRecord[]) => {
                const durations = records
                    .map((record) => getTelemetryParamNumber(record, "duration_ms"))
                    .filter((value) => value > 0);

                if (durations.length === 0) {
                    return 0;
                }

                return Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length);
            };
            const normalizedEmailSignUpCount = emailRegistrationCount > 0
                ? emailRegistrationCount
                : eventsData.auth_sign_up_success || 0;

            const authBreakdown = [
                {
                    method: "Email sign in",
                    attempts: eventsData.auth_sign_in_attempted || 0,
                    successes: eventsData.auth_sign_in_success || 0,
                    failures: eventsData.auth_sign_in_failed || 0,
                    avgDurationMs: averageDuration(telemetryLogsByEvent.auth_sign_in_success || []),
                },
                {
                    method: "Email sign up",
                    attempts: eventsData.auth_sign_up_attempted || 0,
                    successes: normalizedEmailSignUpCount,
                    failures: eventsData.auth_sign_up_failed || 0,
                    avgDurationMs: averageDuration(telemetryLogsByEvent.auth_sign_up_success || []),
                },
                {
                    method: "Google sign in",
                    attempts: eventsData.auth_google_sign_in_attempted || 0,
                    successes: eventsData.auth_google_sign_in_success || 0,
                    failures: eventsData.auth_google_sign_in_failed || 0,
                    avgDurationMs: averageDuration(telemetryLogsByEvent.auth_google_sign_in_success || []),
                },
                {
                    method: "Registered users",
                    attempts: normalizedSignupCount,
                    successes: normalizedSignupCount,
                    failures: 0,
                    avgDurationMs: 0,
                },
            ].map((entry) => ({
                ...entry,
                successRate: entry.attempts > 0 ? entry.successes / entry.attempts : 0,
            }));

            const onboardingDurationsMs = [
                ...(onboardingDurationMsSamples.length > 0
                    ? onboardingDurationMsSamples
                    : telemetryLogsByEvent.guided_onboarding_completed.map((record) => {
                        const directMs = getTelemetryParamNumber(record, "duration_ms");
                        if (directMs > 0) {
                            return directMs;
                        }

                        return getTelemetryParamNumber(record, "durationSeconds") * 1000;
                    })),
            ].filter((value) => value > 0);

            const onboardingDurationBuckets = buildDurationBuckets(onboardingDurationsMs, [
                { label: "<30s", max: 30_000 },
                { label: "30-60s", max: 60_000 },
                { label: "1-2m", max: 120_000 },
                { label: "2-5m", max: 300_000 },
                { label: "5m+", max: Number.POSITIVE_INFINITY },
            ]);

            const activeDaysByUser = new Map<string, Set<string>>();
            telemetryLogs.forEach((record) => {
                if (!record.userId) {
                    return;
                }

                const dayKey = new Date(record.timestamp).toISOString().slice(0, 10);
                if (!activeDaysByUser.has(record.userId)) {
                    activeDaysByUser.set(record.userId, new Set());
                }
                activeDaysByUser.get(record.userId)?.add(dayKey);
            });

            const activeDayCounts = Array.from(activeDaysByUser.values()).map((days) => days.size);
            const repeatVisitSegments = [
                { label: "1 day", users: activeDayCounts.filter((count) => count === 1).length },
                { label: "2 days", users: activeDayCounts.filter((count) => count === 2).length },
                { label: "3-4 days", users: activeDayCounts.filter((count) => count >= 3 && count <= 4).length },
                { label: "5+ days", users: activeDayCounts.filter((count) => count >= 5).length },
            ];

            const destinationMap = new Map<string, number>();
            (telemetryLogsByEvent.navigation_click || []).forEach((record) => {
                const destination = getTelemetryParamString(record, "destination") || "/";
                destinationMap.set(destination, (destinationMap.get(destination) || 0) + 1);
            });
            const destinationMix = Array.from(destinationMap.entries())
                .map(([destination, count]) => ({ destination, count }))
                .sort((left, right) => right.count - left.count)
                .slice(0, 10);

            const notificationFunnel = [
                { label: "Prompt views", count: eventsData.notification_prompt_banner_viewed || 0 },
                { label: "Prompt dismissals", count: eventsData.notification_prompt_banner_dismissed || 0 },
                { label: "Notifications enabled", count: eventsData.task_notifications_enabled || 0 },
                { label: "Dropdown opens", count: eventsData.notifications_dropdown_opened || 0 },
                { label: "Notifications opened", count: eventsData.notification_opened || 0 },
                { label: "Marked read", count: eventsData.notification_marked_read || 0 },
            ];

            const notificationActions = [
                { label: "Dropdown", value: eventsData.notifications_dropdown_opened || 0 },
                { label: "Open", value: eventsData.notification_opened || 0 },
                { label: "Read", value: eventsData.notification_marked_read || 0 },
                { label: "Clear all", value: eventsData.notification_mark_all_read || 0 },
                { label: "Enable", value: eventsData.task_notifications_enabled || 0 },
            ];

            const taskGuidance = {
                viewed: eventsData.task_guidance_banner_viewed || 0,
                dismissed: eventsData.task_guidance_banner_dismissed || 0,
                tapped: eventsData.task_guidance_cta_clicked || 0,
                completed: eventsData.task_guidance_completed || 0,
            };
            const taskPipeline = [
                { label: "Assigned", count: normalizedTaskEvents.filter((event) => event.type === "assigned").length },
                { label: "Guides shown", count: taskGuidance.viewed },
                { label: "Guide taps", count: taskGuidance.tapped },
                { label: "Started", count: normalizedTaskEvents.filter((event) => event.type === "started").length },
                { label: "Completed", count: normalizedTaskEvents.filter((event) => event.type === "completed").length },
                { label: "Guide wins", count: taskGuidance.completed },
                { label: "Failed", count: normalizedTaskEvents.filter((event) => event.type === "failed").length },
                { label: "Reminders", count: normalizedTaskEvents.filter((event) => event.type === "reminder_sent").length },
            ];

            const taskPerformanceMap = new Map<string, {
                taskId: string;
                title: string;
                assigned: number;
                started: number;
                completed: number;
                failed: number;
                rewardTotal: number;
                durations: number[];
            }>();
            normalizedTaskEvents.forEach((event) => {
                const key = event.taskId || event.title;
                const current = taskPerformanceMap.get(key) || {
                    taskId: event.taskId || key,
                    title: event.title || key,
                    assigned: 0,
                    started: 0,
                    completed: 0,
                    failed: 0,
                    rewardTotal: 0,
                    durations: [],
                };

                if (event.type === "assigned") current.assigned += 1;
                if (event.type === "started") current.started += 1;
                if (event.type === "completed") {
                    current.completed += 1;
                    current.rewardTotal += event.reward;
                    if (event.durationMs && event.durationMs > 0) {
                        current.durations.push(event.durationMs);
                    }
                }
                if (event.type === "failed") {
                    current.failed += 1;
                    if (event.durationMs && event.durationMs > 0) {
                        current.durations.push(event.durationMs);
                    }
                }

                taskPerformanceMap.set(key, current);
            });

            const taskLeaderboard = Array.from(taskPerformanceMap.values())
                .map((entry) => ({
                    taskId: entry.taskId,
                    title: entry.title,
                    assigned: entry.assigned,
                    started: entry.started,
                    completed: entry.completed,
                    failed: entry.failed,
                    rewardTotal: entry.rewardTotal,
                    avgDurationMs: entry.durations.length > 0
                        ? Math.round(entry.durations.reduce((sum, value) => sum + value, 0) / entry.durations.length)
                        : 0,
                    completionRate: entry.assigned > 0 ? entry.completed / entry.assigned : 0,
                }))
                .sort((left, right) => right.completed - left.completed || right.rewardTotal - left.rewardTotal)
                .slice(0, 10);

            const taskDurationBuckets = buildDurationBuckets(
                normalizedTaskEvents
                    .filter((event) => event.type === "completed" && (event.durationMs || 0) > 0)
                    .map((event) => event.durationMs || 0),
                [
                    { label: "<1m", max: 60_000 },
                    { label: "1-5m", max: 300_000 },
                    { label: "5-15m", max: 900_000 },
                    { label: "15-60m", max: 3_600_000 },
                    { label: "60m+", max: Number.POSITIVE_INFINITY },
                ],
            );

            const reminderReasonMap = new Map<string, number>();
            normalizedTaskEvents
                .filter((event) => event.type === "reminder_sent")
                .forEach((event) => {
                    const label = formatTaskReason(event.reason || "");
                    reminderReasonMap.set(label, (reminderReasonMap.get(label) || 0) + 1);
                });
            const reminderReasons = Array.from(reminderReasonMap.entries()).map(([label, count]) => ({ label, count }));

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

            const completedPurchaseTransactions = normalizedTransactionsInRange.filter((tx) => tx.type === "purchase_currency" && tx.status === "completed");
            const unlockTransactions = normalizedTransactionsInRange.filter((tx) => tx.type === "unlock_content");
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

            return NextResponse.json({
                success: true,
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
            });

    } catch (error) {
        return handleApiError(error, "Admin.Analytics.Historical.GET");
    }
}
