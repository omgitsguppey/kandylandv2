export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/server/auth";
import { adminDb } from "@/lib/server/firebase-admin";
import { ADMIN } from "@/lib/server/rate-limit";
import { TELEMETRY_MODULE_INDEXES } from "@/lib/telemetry-catalog";
import { ANALYTICS_SEMANTIC_SOURCE_REGISTRY, ANALYTICS_SEMANTIC_STRATEGIES } from "@/lib/analytics-semantics";
import { deriveGumdropEconomics } from "@/lib/gumdrop-economics";
import { normalizeTransactionRecord } from "@/lib/transaction-normalizers";
import { getAllDropReferenceMap, resolveDropTitle } from "@/lib/server/drop-references";
import {
    createAdminAnalyticsDataClient,
    fetchAdminHistoricalAnalyticsSources,
    getAdminAnalyticsPropertyId,
} from "@/lib/server/admin-analytics-data";
import { buildHistoricalTrafficOverview } from "@/lib/server/admin-analytics-historical-traffic";
import { buildModuleCoverageReport, buildParityInsight, sumCountBuckets } from "@/lib/server/analytics-parity";
import { buildSemanticCategorySummaries, summarizeSecurityReason } from "@/lib/server/analytics-semantics";
import { buildAnalyticsMetricReport } from "@/lib/server/analytics-metrics";
import { getDropViewCount } from "@/lib/drop-engagement";
import {
    AUTHENTICATED_PAGE_VIEW_EVENT_NAMES,
    AnalyticsReportRow,
    OnboardingFactRecord,
    OnboardingStepFactRecord,
    RegistrationFactRecord,
    SessionFactRecord,
    TaskLifecycleLog,
    TelemetryLogRecord,
    ViewerDropFactAccumulator,
    ViewerDropInsight,
    ViewerOverview,
    ViewerUserOption,
    average,
    buildDurationBuckets,
    buildMergedCountMap,
    formatTaskReason,
    getRangeWindow,
    getTelemetryDropId,
    getTelemetryDropTitle,
    getTelemetryParamNumber,
    getTelemetryParamString,
    matchesViewerFilter,
    normalizeViewerIdentity,
    safeParams,
    sum,
    sumEventCounts,
    sumSnapshotField,
    toNumber,
    toStringValue,
} from "@/lib/server/admin-analytics-shared";
import { guardApiRequest } from "@/lib/server/request-guard";

const propertyId = getAdminAnalyticsPropertyId();
const analyticsClient = createAdminAnalyticsDataClient();

export async function GET(request: NextRequest) {
    try {
        await guardApiRequest(request, {
            routeName: "admin/analytics/historical",
            rateLimit: ADMIN,
            auth: "admin",
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

            // Calculate Onboarding Analytics
            let totalOnboardingCompletions = 0;
            let totalOnboardingSeconds = 0;
            const onboardingRows = onboardingResponse.rows || [];
            const onboardingFacts: OnboardingFactRecord[] = onboardingFactsSnapshot.docs
                .map((doc) => {
                    const data = doc.data() as Record<string, unknown>;
                    const params = safeParams(data.params);
                    return {
                        timestamp: toNumber(data.timestamp),
                        durationMs: Math.max(toNumber(data.durationMs), toNumber(params.duration_ms)),
                    };
                })
                .filter((fact) => fact.timestamp >= startMs);
            const onboardingStepFacts: OnboardingStepFactRecord[] = analyticsEventFactsSnapshot.docs
                .map((doc) => {
                    const data = doc.data() as Record<string, unknown>;
                    const params = safeParams(data.params);
                    return {
                        eventName: toStringValue(data.eventName),
                        timestamp: toNumber(data.timestamp),
                        stepKey: toStringValue(params.step_key),
                        stepTitle: toStringValue(params.step_title),
                        stepIndex: toNumber(params.step_index),
                        durationMs: Math.max(toNumber(data.durationMs), toNumber(params.duration_ms)),
                    };
                })
                .filter((fact) =>
                    fact.timestamp >= startMs
                    && (fact.eventName === "guided_onboarding_step_started" || fact.eventName === "guided_onboarding_step_completed")
                    && fact.stepKey.length > 0,
                );
            
            onboardingRows.forEach((row: AnalyticsReportRow) => {
                const durationRaw = row.dimensionValues?.[0]?.value || "(not set)";
                const count = parseInt(row.metricValues?.[0]?.value || "0", 10);
                
                if (durationRaw !== "(not set)") {
                    const secs = parseInt(durationRaw, 10);
                    if (!isNaN(secs)) {
                        totalOnboardingSeconds += (secs * count);
                        totalOnboardingCompletions += count;
                    }
                }
            });

            if (onboardingFacts.length > 0) {
                totalOnboardingCompletions = onboardingFacts.length;
                totalOnboardingSeconds = onboardingFacts.reduce((sum, fact) => sum + Math.round(fact.durationMs / 1000), 0);
            }

            const onboardingStepStatsMap = new Map<string, {
                stepKey: string;
                stepTitle: string;
                stepIndex: number;
                starts: number;
                completions: number;
                durationTotalMs: number;
            }>();
            onboardingStepFacts.forEach((fact) => {
                const existing = onboardingStepStatsMap.get(fact.stepKey) || {
                    stepKey: fact.stepKey,
                    stepTitle: fact.stepTitle || fact.stepKey.replaceAll("_", " "),
                    stepIndex: fact.stepIndex,
                    starts: 0,
                    completions: 0,
                    durationTotalMs: 0,
                };
                if (fact.eventName === "guided_onboarding_step_started") {
                    existing.starts += 1;
                }
                if (fact.eventName === "guided_onboarding_step_completed") {
                    existing.completions += 1;
                    existing.durationTotalMs += fact.durationMs;
                }
                onboardingStepStatsMap.set(fact.stepKey, existing);
            });
            const onboardingStepStats = Array.from(onboardingStepStatsMap.values())
                .sort((left, right) => left.stepIndex - right.stepIndex)
                .map((entry) => ({
                    stepKey: entry.stepKey,
                    stepTitle: entry.stepTitle,
                    stepIndex: entry.stepIndex,
                    starts: Math.max(entry.starts, entry.completions),
                    completions: entry.completions,
                    avgDurationMs: entry.completions > 0
                        ? Math.round(entry.durationTotalMs / entry.completions)
                        : 0,
                }));

            const guidedOnboardingStartCount = eventsData.guided_onboarding_started || 0;
            const legacyOnboardingStartCount = eventsData.onboarding_started || 0;
            const guidedOnboardingCompletionCount = Math.max(totalOnboardingCompletions, eventsData.guided_onboarding_completed || 0);
            const legacyOnboardingCompletionCount = eventsData.onboarding_complete || 0;
            const normalizedOnboardingCompletions = guidedOnboardingCompletionCount + legacyOnboardingCompletionCount;
            const avgOnboardingDuration = normalizedOnboardingCompletions > 0
                ? Math.round(totalOnboardingSeconds / Math.max(1, guidedOnboardingCompletionCount))
                : 0;
            const onboardingStartCount = Math.max(guidedOnboardingStartCount + legacyOnboardingStartCount, normalizedOnboardingCompletions);
            const onboardingStartSource = (guidedOnboardingStartCount + legacyOnboardingStartCount) > 0
                ? "tracked"
                : normalizedOnboardingCompletions > 0
                    ? "completion_fallback"
                    : "none";
            const onboardingCompletionRate = onboardingStartCount > 0
                ? normalizedOnboardingCompletions / onboardingStartCount
                : 0;
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

            const filteredSessionFacts: SessionFactRecord[] = sessionFactsSnapshot.docs
                .map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }) as SessionFactRecord)
                .filter((entry) => {
                    if (!viewerUser) {
                        return true;
                    }

                    const candidateUserId = normalizeViewerIdentity(toStringValue(entry.userId));
                    const candidateUsername = normalizeViewerIdentity(toStringValue(entry.username));
                    const normalizedFilter = normalizeViewerIdentity(viewerUser);
                    return candidateUserId === normalizedFilter || candidateUsername === normalizedFilter;
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
                ...(onboardingFacts.length > 0
                    ? onboardingFacts.map((fact) => fact.durationMs)
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

            const packagePerformanceMap = new Map<string, {
                label: string;
                starts: number;
                purchases: number;
                failures: number;
                revenueUsd: number;
                drops: number;
            }>();
            const applyPackageEvent = (records: TelemetryLogRecord[], type: "start" | "purchase" | "failure") => {
                records.forEach((record) => {
                    const packageLabel = getTelemetryParamString(record, "package_label")
                        || `${getTelemetryParamNumber(record, "package_drops")} GD`;
                    const current = packagePerformanceMap.get(packageLabel) || {
                        label: packageLabel,
                        starts: 0,
                        purchases: 0,
                        failures: 0,
                        revenueUsd: 0,
                        drops: getTelemetryParamNumber(record, "package_drops"),
                    };

                    if (type === "start") current.starts += 1;
                    if (type === "purchase") {
                        current.purchases += 1;
                        current.revenueUsd += getTelemetryParamNumber(record, "package_price");
                    }
                    if (type === "failure") current.failures += 1;

                    packagePerformanceMap.set(packageLabel, current);
                });
            };
            applyPackageEvent(telemetryLogsByEvent.begin_checkout || [], "start");
            applyPackageEvent(telemetryLogsByEvent.gumdrops_purchase_completed || [], "purchase");
            applyPackageEvent(telemetryLogsByEvent.gumdrops_purchase_failed || [], "failure");

            const packagePerformance = Array.from(packagePerformanceMap.values())
                .map((entry) => ({
                    ...entry,
                    conversionRate: entry.starts > 0 ? entry.purchases / entry.starts : 0,
                    abandonmentRate: entry.starts > 0 ? Math.max(0, entry.starts - entry.purchases) / entry.starts : 0,
                }))
                .sort((left, right) => right.purchases - left.purchases || right.revenueUsd - left.revenueUsd);

            const categoryMixMap = new Map<string, { label: string; previews: number; unlocks: number }>();
            (telemetryLogsByEvent.drop_preview_opened || []).forEach((record) => {
                const label = getTelemetryParamString(record, "drop_category") || "unknown";
                const current = categoryMixMap.get(label) || { label, previews: 0, unlocks: 0 };
                current.previews += 1;
                categoryMixMap.set(label, current);
            });
            (telemetryLogsByEvent.unlock_drop_success || []).forEach((record) => {
                const label = getTelemetryParamString(record, "drop_category") || "unknown";
                const current = categoryMixMap.get(label) || { label, previews: 0, unlocks: 0 };
                current.unlocks += 1;
                categoryMixMap.set(label, current);
            });

            const unlockCategoryMix = Array.from(categoryMixMap.values())
                .map((entry) => ({
                    ...entry,
                    unlockRate: entry.previews > 0 ? entry.unlocks / entry.previews : 0,
                }))
                .sort((left, right) => right.unlocks - left.unlocks);

            const watchDepthValues = [
                ...(telemetryLogsByEvent.viewer_watch_checkpoint || []).map((record) => getTelemetryParamNumber(record, "watch_seconds")),
                ...(telemetryLogsByEvent.viewer_asset_consumed || []).map((record) => getTelemetryParamNumber(record, "watch_seconds")),
            ].filter((value) => value > 0);
            const watchDepthBuckets = buildDurationBuckets(
                watchDepthValues.map((value) => value * 1000),
                [
                    { label: "<30s", max: 30_000 },
                    { label: "30-60s", max: 60_000 },
                    { label: "60-90s", max: 90_000 },
                    { label: "90-180s", max: 180_000 },
                    { label: "180s+", max: Number.POSITIVE_INFINITY },
                ],
            );

            const contentJourney = [
                { label: "Previews", count: funnel.previewOpens },
                { label: "Unlock attempts", count: eventsData.drop_unlock_attempted || 0 },
                { label: "Unlocks", count: funnel.unlocks },
                { label: "Viewer opens", count: funnel.viewerOpens },
                { label: "Assets consumed", count: eventsData.viewer_asset_consumed || 0 },
                { label: "Downloads", count: eventsData.viewer_source_downloaded || 0 },
            ];

            const tagDemandMap = new Map<string, number>();
            (telemetryLogsByEvent.unlock_drop_success || []).forEach((record) => {
                const rawTags = getTelemetryParamString(record, "drop_tags");
                rawTags
                    .split("|")
                    .map((value) => value.trim())
                    .filter(Boolean)
                    .forEach((tag) => {
                        tagDemandMap.set(tag, (tagDemandMap.get(tag) || 0) + 1);
                    });
            });
            const contentTagDemand = Array.from(tagDemandMap.entries())
                .map(([tag, count]) => ({ tag, count }))
                .sort((left, right) => right.count - left.count)
                .slice(0, 10);

            const viewerOpenLogs = (telemetryLogsByEvent.viewer_opened || []).filter((record) => matchesViewerFilter(record, viewerUser));
            const viewerSessionStartedLogs = (telemetryLogsByEvent.viewer_session_started || []).filter((record) => matchesViewerFilter(record, viewerUser));
            const viewerSessionCompletedLogs = (telemetryLogsByEvent.viewer_session_completed || []).filter((record) => matchesViewerFilter(record, viewerUser));
            const viewerAssetStartedLogs = (telemetryLogsByEvent.viewer_asset_started || []).filter((record) => matchesViewerFilter(record, viewerUser));
            const viewerAssetCompletedLogs = (telemetryLogsByEvent.viewer_asset_completed || []).filter((record) => matchesViewerFilter(record, viewerUser));
            const viewerAssetChangedLogs = (telemetryLogsByEvent.viewer_asset_changed || []).filter((record) => matchesViewerFilter(record, viewerUser));
            const viewerDownloadLogs = (telemetryLogsByEvent.viewer_source_downloaded || []).filter((record) => matchesViewerFilter(record, viewerUser));
            const viewerRelatedLogs = (telemetryLogsByEvent.viewer_related_drop_clicked || []).filter((record) => matchesViewerFilter(record, viewerUser));
            const viewerContentLoadedLogs = (telemetryLogsByEvent.viewer_content_loaded || []).filter((record) => matchesViewerFilter(record, viewerUser));

            const viewerSessionCountsByUser = new Map<string, number>();
            const overallViewerKeys = new Set<string>();
            viewerSessionStartedLogs.forEach((record) => {
                const key = record.userId || record.username || "";
                if (!key) {
                    return;
                }

                overallViewerKeys.add(key);
                viewerSessionCountsByUser.set(key, (viewerSessionCountsByUser.get(key) || 0) + 1);
            });
            viewerOpenLogs.forEach((record) => {
                const key = record.userId || record.username || "";
                if (key) {
                    overallViewerKeys.add(key);
                }
            });
            viewerSessionCompletedLogs.forEach((record) => {
                const key = record.userId || record.username || "";
                if (key) {
                    overallViewerKeys.add(key);
                }
            });

            const overallSessionDurations = viewerSessionCompletedLogs
                .map((record) => {
                    const seconds = getTelemetryParamNumber(record, "duration_seconds");
                    if (seconds > 0) {
                        return seconds;
                    }

                    const durationMs = getTelemetryParamNumber(record, "duration_ms");
                    return durationMs > 0 ? Math.round(durationMs / 1000) : 0;
                })
                .filter((value) => value > 0);
            const overallWatchDurations = viewerSessionCompletedLogs
                .map((record) => getTelemetryParamNumber(record, "session_watch_seconds"))
                .filter((value) => value > 0);
            const overallLoadSamples = viewerContentLoadedLogs
                .map((record) => getTelemetryParamNumber(record, "load_ms"))
                .filter((value) => value > 0);
            const repeatSessionCount = Array.from(viewerSessionCountsByUser.values()).reduce((total, value) => total + Math.max(0, value - 1), 0);

            const viewerOverview: ViewerOverview = {
                viewCount: viewerOpenLogs.length,
                sessionCount: viewerSessionStartedLogs.length,
                uniqueViewerCount: overallViewerKeys.size,
                repeatSessionCount,
                totalWatchSeconds: sum(overallWatchDurations),
                avgSessionSeconds: average(overallSessionDurations),
                avgWatchSeconds: average(overallWatchDurations),
                avgLoadMs: average(overallLoadSamples),
                assetCompletionRate: viewerAssetStartedLogs.length > 0 ? viewerAssetCompletedLogs.length / viewerAssetStartedLogs.length : 0,
                assetSwitches: viewerAssetChangedLogs.length,
                downloads: viewerDownloadLogs.length,
                relatedClicks: viewerRelatedLogs.length,
            };
            const sessionFactOverview = filteredSessionFacts.reduce((acc, entry) => {
                const startedCount = toNumber(entry.startedCount);
                const completedCount = toNumber(entry.completedCount);
                const watchSecondsTotal = toNumber(entry.watchSecondsTotal);
                const loadMsTotal = toNumber(entry.loadMsTotal);
                const loadSampleCount = toNumber(entry.loadSampleCount);
                const userKey = `${toStringValue(entry.userId)}::${toStringValue(entry.username)}`;
                if (userKey !== "::") {
                    acc.uniqueViewerKeys.add(userKey);
                    acc.sessionCounts.set(userKey, (acc.sessionCounts.get(userKey) || 0) + startedCount);
                }
                acc.sessionCount += startedCount;
                acc.completedCount += completedCount;
                acc.totalWatchSeconds += watchSecondsTotal;
                acc.loadMsTotal += loadMsTotal;
                acc.loadSampleCount += loadSampleCount;
                return acc;
            }, {
                sessionCount: 0,
                completedCount: 0,
                totalWatchSeconds: 0,
                loadMsTotal: 0,
                loadSampleCount: 0,
                uniqueViewerKeys: new Set<string>(),
                sessionCounts: new Map<string, number>(),
            });
            const viewerOverviewCanonical: ViewerOverview = viewerOverview.sessionCount > 0
                ? viewerOverview
                : {
                    viewCount: sessionFactOverview.sessionCount,
                    sessionCount: sessionFactOverview.sessionCount,
                    uniqueViewerCount: sessionFactOverview.uniqueViewerKeys.size,
                    repeatSessionCount: Array.from(sessionFactOverview.sessionCounts.values()).reduce((total, value) => total + Math.max(0, value - 1), 0),
                    totalWatchSeconds: sessionFactOverview.totalWatchSeconds,
                    avgSessionSeconds: sessionFactOverview.completedCount > 0 ? Math.round(sessionFactOverview.totalWatchSeconds / sessionFactOverview.completedCount) : 0,
                    avgWatchSeconds: sessionFactOverview.sessionCount > 0 ? Math.round(sessionFactOverview.totalWatchSeconds / sessionFactOverview.sessionCount) : 0,
                    avgLoadMs: sessionFactOverview.loadSampleCount > 0 ? Math.round(sessionFactOverview.loadMsTotal / sessionFactOverview.loadSampleCount) : 0,
                    assetCompletionRate: 0,
                    assetSwitches: 0,
                    downloads: 0,
                    relatedClicks: 0,
                };

            type MutableViewerDropInsight = ViewerDropInsight & {
                uniqueViewerKeys: Set<string>;
                sessionCountsByUser: Map<string, number>;
                sessionDurations: number[];
                watchDurations: number[];
                loadSamples: number[];
            };

            const viewerDropInsightMap = new Map<string, MutableViewerDropInsight>();
            const ensureViewerDropInsight = (record: TelemetryLogRecord) => {
                const dropId = getTelemetryDropId(record);
                const existing = viewerDropInsightMap.get(dropId);
                if (existing) {
                    if (existing.dropTitle === existing.dropId) {
                        existing.dropTitle = getTelemetryDropTitle(record);
                    }
                    return existing;
                }

                const created: MutableViewerDropInsight = {
                    dropId,
                    dropTitle: getTelemetryDropTitle(record),
                    viewCount: 0,
                    sessionCount: 0,
                    uniqueViewerCount: 0,
                    repeatSessionCount: 0,
                    totalWatchSeconds: 0,
                    avgSessionSeconds: 0,
                    avgWatchSeconds: 0,
                    assetStarts: 0,
                    assetCompletions: 0,
                    assetSwitches: 0,
                    downloads: 0,
                    relatedClicks: 0,
                    avgLoadMs: 0,
                    uniqueViewerKeys: new Set<string>(),
                    sessionCountsByUser: new Map<string, number>(),
                    sessionDurations: [],
                    watchDurations: [],
                    loadSamples: [],
                };
                viewerDropInsightMap.set(dropId, created);
                return created;
            };

            const registerViewerRecord = (record: TelemetryLogRecord) => {
                const key = record.userId || record.username || "";
                if (!key) {
                    return "";
                }

                return key;
            };

            viewerOpenLogs.forEach((record) => {
                const insight = ensureViewerDropInsight(record);
                insight.viewCount += 1;
                const viewerKey = registerViewerRecord(record);
                if (viewerKey) {
                    insight.uniqueViewerKeys.add(viewerKey);
                }
            });
            viewerSessionStartedLogs.forEach((record) => {
                const insight = ensureViewerDropInsight(record);
                insight.sessionCount += 1;
                const viewerKey = registerViewerRecord(record);
                if (viewerKey) {
                    insight.uniqueViewerKeys.add(viewerKey);
                    insight.sessionCountsByUser.set(viewerKey, (insight.sessionCountsByUser.get(viewerKey) || 0) + 1);
                }
            });
            viewerSessionCompletedLogs.forEach((record) => {
                const insight = ensureViewerDropInsight(record);
                const sessionSeconds = getTelemetryParamNumber(record, "duration_seconds")
                    || Math.round(getTelemetryParamNumber(record, "duration_ms") / 1000);
                const watchSeconds = getTelemetryParamNumber(record, "session_watch_seconds");

                if (sessionSeconds > 0) {
                    insight.sessionDurations.push(sessionSeconds);
                }
                if (watchSeconds > 0) {
                    insight.watchDurations.push(watchSeconds);
                    insight.totalWatchSeconds += watchSeconds;
                }
            });
            viewerAssetStartedLogs.forEach((record) => {
                ensureViewerDropInsight(record).assetStarts += 1;
            });
            viewerAssetCompletedLogs.forEach((record) => {
                ensureViewerDropInsight(record).assetCompletions += 1;
            });
            viewerAssetChangedLogs.forEach((record) => {
                ensureViewerDropInsight(record).assetSwitches += 1;
            });
            viewerDownloadLogs.forEach((record) => {
                ensureViewerDropInsight(record).downloads += 1;
            });
            viewerRelatedLogs.forEach((record) => {
                ensureViewerDropInsight(record).relatedClicks += 1;
            });
            viewerContentLoadedLogs.forEach((record) => {
                const loadMs = getTelemetryParamNumber(record, "load_ms");
                if (loadMs > 0) {
                    ensureViewerDropInsight(record).loadSamples.push(loadMs);
                }
            });

            const viewerDropInsightsFromTelemetry: ViewerDropInsight[] = Array.from(viewerDropInsightMap.values())
                .map((entry) => ({
                    dropId: entry.dropId,
                    dropTitle: resolveDropTitle(dropReferences, entry.dropId, entry.dropTitle),
                    viewCount: entry.viewCount,
                    sessionCount: entry.sessionCount,
                    uniqueViewerCount: entry.uniqueViewerKeys.size,
                    repeatSessionCount: Array.from(entry.sessionCountsByUser.values()).reduce((total, value) => total + Math.max(0, value - 1), 0),
                    totalWatchSeconds: entry.totalWatchSeconds,
                    avgSessionSeconds: average(entry.sessionDurations),
                    avgWatchSeconds: average(entry.watchDurations),
                    assetStarts: entry.assetStarts,
                    assetCompletions: entry.assetCompletions,
                    assetSwitches: entry.assetSwitches,
                    downloads: entry.downloads,
                    relatedClicks: entry.relatedClicks,
                    avgLoadMs: average(entry.loadSamples),
                }))
                .sort((left, right) =>
                    right.totalWatchSeconds - left.totalWatchSeconds
                    || right.sessionCount - left.sessionCount
                    || right.viewCount - left.viewCount
                )
                .slice(0, 20);
            const viewerDropFactsMap = filteredSessionFacts.reduce<Map<string, ViewerDropFactAccumulator>>((map, entry) => {
                    const dropId = toStringValue(entry.dropId);
                    if (!dropId) {
                        return map;
                    }
                    const current: ViewerDropFactAccumulator = map.get(dropId) || {
                        dropId,
                        dropTitle: resolveDropTitle(dropReferences, dropId, toStringValue(entry.dropTitle)),
                        viewCount: 0,
                        sessionCount: 0,
                        uniqueViewerKeys: new Set<string>(),
                        sessionCounts: new Map<string, number>(),
                        totalWatchSeconds: 0,
                        loadMsTotal: 0,
                        loadSampleCount: 0,
                    };
                    const startedCount = toNumber(entry.startedCount);
                    current.viewCount += startedCount;
                    current.sessionCount += startedCount;
                    current.totalWatchSeconds += toNumber(entry.watchSecondsTotal);
                    current.loadMsTotal += toNumber(entry.loadMsTotal);
                    current.loadSampleCount += toNumber(entry.loadSampleCount);
                    const userKey = `${toStringValue(entry.userId)}::${toStringValue(entry.username)}`;
                    if (userKey !== "::") {
                        current.uniqueViewerKeys.add(userKey);
                        current.sessionCounts.set(userKey, (current.sessionCounts.get(userKey) || 0) + startedCount);
                    }
                    map.set(dropId, current);
                    return map;
                }, new Map<string, ViewerDropFactAccumulator>());
            const viewerDropInsightsFromFacts = Array.from(viewerDropFactsMap.values()).map((entry) => ({
                dropId: entry.dropId,
                dropTitle: entry.dropTitle,
                viewCount: entry.viewCount,
                sessionCount: entry.sessionCount,
                uniqueViewerCount: entry.uniqueViewerKeys.size,
                repeatSessionCount: Array.from(entry.sessionCounts.values()).reduce((total: number, value: number) => total + Math.max(0, value - 1), 0),
                totalWatchSeconds: entry.totalWatchSeconds,
                avgSessionSeconds: entry.sessionCount > 0 ? Math.round(entry.totalWatchSeconds / entry.sessionCount) : 0,
                avgWatchSeconds: entry.sessionCount > 0 ? Math.round(entry.totalWatchSeconds / entry.sessionCount) : 0,
                assetStarts: 0,
                assetCompletions: 0,
                assetSwitches: 0,
                downloads: 0,
                relatedClicks: 0,
                avgLoadMs: entry.loadSampleCount > 0 ? Math.round(entry.loadMsTotal / entry.loadSampleCount) : 0,
            }))
                .sort((left, right) => right.totalWatchSeconds - left.totalWatchSeconds || right.sessionCount - left.sessionCount)
                .slice(0, 20);
            const viewerDropInsights = viewerDropInsightsFromTelemetry.length > 0
                ? viewerDropInsightsFromTelemetry
                : viewerDropInsightsFromFacts;

            const viewerUserMap = new Map<string, ViewerUserOption>();
            const ensureViewerUser = (record: TelemetryLogRecord) => {
                const uid = record.userId;
                if (!uid) {
                    return null;
                }

                const existing = viewerUserMap.get(uid);
                if (existing) {
                    if (!existing.username && record.username) {
                        existing.username = record.username;
                    }
                    return existing;
                }

                const created: ViewerUserOption = {
                    uid,
                    username: record.username || uid,
                    viewCount: 0,
                    sessionCount: 0,
                    totalWatchSeconds: 0,
                };
                viewerUserMap.set(uid, created);
                return created;
            };

            (telemetryLogsByEvent.viewer_opened || []).forEach((record) => {
                const entry = ensureViewerUser(record);
                if (entry) {
                    entry.viewCount += 1;
                }
            });
            (telemetryLogsByEvent.viewer_session_started || []).forEach((record) => {
                const entry = ensureViewerUser(record);
                if (entry) {
                    entry.sessionCount += 1;
                }
            });
            (telemetryLogsByEvent.viewer_session_completed || []).forEach((record) => {
                const entry = ensureViewerUser(record);
                if (entry) {
                    entry.totalWatchSeconds += getTelemetryParamNumber(record, "session_watch_seconds");
                }
            });

            const viewerUsers = Array.from(viewerUserMap.values())
                .sort((left, right) =>
                    right.sessionCount - left.sessionCount
                    || right.totalWatchSeconds - left.totalWatchSeconds
                    || right.viewCount - left.viewCount
                )
                .slice(0, 12);

            const completedPurchaseTransactions = normalizedTransactionsInRange.filter((tx) => tx.type === "purchase_currency" && tx.status === "completed");
            const unlockTransactions = normalizedTransactionsInRange.filter((tx) => tx.type === "unlock_content");
            const guestInteractionCount = guestBatchesSnapshot.docs.reduce((total, doc) => {
                const data = doc.data() as Record<string, unknown>;
                return total + toNumber(data.eventCount);
            }, 0);
            const pageRollupViewCount = Array.from(pageRollupMap.values()).reduce((total, entry) => total + entry.views, 0);
            const dropRollupActivityCount = dropDailySnapshot.docs.reduce((total, doc) => {
                const data = doc.data() as Record<string, unknown>;
                return total + toNumber(data.eventCount) + toNumber(data.unwrapCount);
            }, 0);
            const viewerSessionFactCount = filteredSessionFacts.reduce((total, entry) => total + toNumber(entry.startedCount) + toNumber(entry.completedCount), 0);
            const moduleCoverage = TELEMETRY_MODULE_INDEXES.map((moduleIndex) => {
                const sources = [
                    { key: "ga4", label: "GA4", count: sumEventCounts(gaEventCounts, moduleIndex.eventNames) },
                    { key: "facts", label: "Event facts", count: sumEventCounts(canonicalEventCounts, moduleIndex.eventNames) },
                    { key: "logs", label: "Telemetry logs", count: sumEventCounts(telemetryEventCounts, moduleIndex.eventNames) },
                ];

                if (moduleIndex.key === "navigation" || moduleIndex.key === "engagement") {
                    sources.push({ key: "pages", label: "Page rollups", count: pageRollupViewCount });
                }
                if (moduleIndex.key === "engagement") {
                    sources.push({ key: "guest", label: "Guest batches", count: guestInteractionCount });
                }
                if (moduleIndex.key === "tasks") {
                    sources.push({ key: "task_events", label: "Task lifecycle", count: normalizedTaskEvents.length || firstPartyTaskLifecycleEvents });
                }
                if (moduleIndex.key === "task_guidance") {
                    sources.push({ key: "task_pipeline", label: "Task pipeline", count: sumCountBuckets(taskPipeline) });
                }
                if (moduleIndex.key === "commerce") {
                    sources.push({ key: "transactions", label: "Transactions", count: completedPurchaseTransactions.length + unlockTransactions.length });
                    sources.push({ key: "commerce_rollups", label: "Commerce rollups", count: firstPartyPurchaseCount + firstPartyUnlockCount });
                }
                if (moduleIndex.key === "content") {
                    sources.push({ key: "drop_rollups", label: "Drop rollups", count: dropRollupActivityCount });
                    sources.push({ key: "unlock_transactions", label: "Unlock transactions", count: unlockTransactions.length });
                }
                if (moduleIndex.key === "viewer") {
                    sources.push({ key: "session_facts", label: "Session facts", count: viewerSessionFactCount });
                }
                if (moduleIndex.key === "security") {
                    sources.push({ key: "security_events", label: "Security logs", count: securityEventsSnapshot.size });
                    sources.push({ key: "flagged_users", label: "Flagged accounts", count: securityLogs.length });
                }

                return buildModuleCoverageReport({
                    key: moduleIndex.key,
                    label: moduleIndex.label,
                    sources,
                    emptyDetail: `No indexed ${moduleIndex.label.toLowerCase()} signals landed in this range. Expected sources: ${moduleIndex.fallbackSources.join(", ")}.`,
                });
            });
            const unhealthyModules = moduleCoverage.filter((module) => module.status !== "healthy");
            const purchaseParity = buildParityInsight([
                { key: "transactions", label: "Transactions", count: completedPurchaseTransactions.length },
                { key: "rollups", label: "Canonical rollups", count: firstPartyPurchaseCount },
                { key: "telemetry", label: "Telemetry", count: telemetryPurchaseCount },
            ]);
            const unlockParity = buildParityInsight([
                { key: "transactions", label: "Transactions", count: unlockTransactions.length },
                { key: "rollups", label: "Canonical rollups", count: firstPartyUnlockCount },
                { key: "telemetry", label: "Telemetry", count: telemetryUnlockCount },
            ]);
            const onboardingParity = buildParityInsight([
                { key: "ga4", label: "GA4", count: guidedOnboardingCompletionCount + legacyOnboardingCompletionCount },
                { key: "facts", label: "Onboarding facts", count: normalizedOnboardingCompletions },
                { key: "starts", label: "Normalized starts", count: onboardingStartCount },
            ], { tolerance: 2, relativeTolerance: 0.25 });
            const taskGuidanceParity = buildParityInsight([
                { key: "views", label: "Guide views", count: taskGuidance.viewed },
                { key: "taps", label: "Guide taps", count: taskGuidance.tapped },
                { key: "wins", label: "Guide wins", count: taskGuidance.completed },
            ], { tolerance: 2, relativeTolerance: 0.35 });
            const parityScore = Math.round((purchaseParity.score + unlockParity.score + onboardingParity.score + taskGuidanceParity.score) / 4);
            const validations = [
                {
                    label: "GA property",
                    status: propertyId ? "pass" : "fail",
                    detail: propertyId ? "Google Analytics 4 reports loaded." : "GA property is missing.",
                },
                {
                    label: "Telemetry depth",
                    status: (telemetryLogs.length > 0 || firstPartyAuthenticatedEvents > 0) ? "pass" : "warn",
                    detail: (telemetryLogs.length > 0 || firstPartyAuthenticatedEvents > 0)
                        ? `${firstPartyAuthenticatedEvents.toLocaleString()} canonical authenticated events with ${telemetryLogs.length.toLocaleString()} realtime telemetry log records in range.`
                        : "No authenticated telemetry events matched the selected range.",
                },
                {
                    label: "Task lifecycle",
                    status: (normalizedTaskEvents.length > 0 || firstPartyTaskLifecycleEvents > 0) ? "pass" : "warn",
                    detail: (normalizedTaskEvents.length > 0 || firstPartyTaskLifecycleEvents > 0)
                        ? `${firstPartyTaskLifecycleEvents.toLocaleString()} canonical task events with ${normalizedTaskEvents.length.toLocaleString()} raw lifecycle log entries in range.`
                        : "No task lifecycle events matched the selected range.",
                },
                {
                    label: "Purchase parity",
                    status: purchaseParity.status,
                    detail: `${completedPurchaseTransactions.length.toLocaleString()} completed purchase transactions vs ${firstPartyPurchaseCount.toLocaleString()} canonical purchase rollups. Telemetry captured ${telemetryPurchaseCount.toLocaleString()} purchase events in the same range. Confidence ${purchaseParity.score}%.`,
                },
                {
                    label: "Unlock parity",
                    status: unlockParity.status,
                    detail: `${unlockTransactions.length.toLocaleString()} unlock transactions vs ${firstPartyUnlockCount.toLocaleString()} canonical unlock rollups. Telemetry captured ${telemetryUnlockCount.toLocaleString()} unlock events in the same range. Confidence ${unlockParity.score}%.`,
                },
                {
                    label: "Onboarding coverage",
                    status: normalizedOnboardingCompletions > 0 && onboardingStartSource === "completion_fallback" ? "warn" : "pass",
                    detail: onboardingStartCount > 0
                        ? onboardingStartSource === "tracked"
                            ? `${onboardingStartCount.toLocaleString()} onboarding starts and ${normalizedOnboardingCompletions.toLocaleString()} completions were tracked directly. Confidence ${onboardingParity.score}%.`
                            : `${normalizedOnboardingCompletions.toLocaleString()} onboarding completions were tracked, so the legacy start counter is falling back to completed sessions until more start events land. Confidence ${onboardingParity.score}%.`
                        : "No onboarding activity matched the selected range.",
                },
                {
                    label: "Task guidance parity",
                    status: taskGuidance.completed <= taskGuidance.tapped && taskGuidance.tapped <= taskGuidance.viewed ? taskGuidanceParity.status : "warn",
                    detail: `${taskGuidance.viewed.toLocaleString()} guide views, ${taskGuidance.dismissed.toLocaleString()} dismissals, ${taskGuidance.tapped.toLocaleString()} guide taps, and ${taskGuidance.completed.toLocaleString()} guided completions were collected in range. Confidence ${taskGuidanceParity.score}%.`,
                },
                {
                    label: "Module coverage",
                    status: unhealthyModules.length === 0 ? "pass" : unhealthyModules.length <= 3 ? "warn" : "fail",
                    detail: unhealthyModules.length === 0
                        ? `All ${moduleCoverage.length.toLocaleString()} indexed analytics modules are populated across the selected range. Parity score ${parityScore}%.`
                        : `${unhealthyModules.length.toLocaleString()} of ${moduleCoverage.length.toLocaleString()} indexed analytics modules are partial or empty. Parity score ${parityScore}%.`,
                },
                {
                    label: "Viewer drilldown",
                    status: (viewerOverviewCanonical.sessionCount > 0 || filteredSessionFacts.length > 0) ? "pass" : "warn",
                    detail: (viewerOverviewCanonical.sessionCount > 0 || filteredSessionFacts.length > 0)
                        ? `${viewerOverviewCanonical.sessionCount.toLocaleString()} viewer sessions from canonical session facts with ${viewerSessionStartedLogs.length.toLocaleString()} raw session-start events in range.`
                        : "No viewer sessions matched the selected range and filter.",
                },
            ];

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
