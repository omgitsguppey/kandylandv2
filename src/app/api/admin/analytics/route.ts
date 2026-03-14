export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from "next/server";
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import * as firebaseAdmin from "firebase-admin";
import { verifyAdmin, handleApiError } from "@/lib/server/auth";
import { adminDb } from "@/lib/server/firebase-admin";
import { checkRateLimit, ADMIN } from "@/lib/server/rate-limit";
import { TELEMETRY_EVENT_NAMES } from "@/lib/telemetry-catalog";
import { deriveGumdropEconomics } from "@/lib/gumdrop-economics";
import { normalizeTransactionRecord } from "@/lib/transaction-normalizers";
import { getAllDropReferenceMap, resolveDropTitle } from "@/lib/server/drop-references";

const propertyId = process.env.GA_PROPERTY_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

// Initialize with explicit credentials if available, otherwise fallback to Default Application Credentials
let analyticsClient: BetaAnalyticsDataClient;
const ANALYTICS_EVENT_NAMES = TELEMETRY_EVENT_NAMES;

if (clientEmail && privateKey) {
    analyticsClient = new BetaAnalyticsDataClient({
        credentials: {
            client_email: clientEmail,
            private_key: privateKey,
            project_id: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        },
    });
} else {
    // In Firebase App Hosting production, this will use the default service account automatically
    analyticsClient = new BetaAnalyticsDataClient();
}

type RangeWindow = {
    startDate: string;
    startMs: number;
};

type TelemetryLogRecord = {
    eventName: string;
    params: Record<string, unknown>;
    userId: string;
    username?: string;
    timestamp: number;
    userAgent?: string;
};

type TaskLifecycleLog = {
    id: string;
    type: string;
    taskId: string;
    title: string;
    triggerEvent: string;
    userId: string;
    username?: string;
    reward: number;
    progress: number;
    maxProgress: number;
    timestamp: number;
    reason?: string;
    assignedAt?: number;
    startedAt?: number;
    durationMs?: number;
};

type ViewerOverview = {
    viewCount: number;
    sessionCount: number;
    uniqueViewerCount: number;
    repeatSessionCount: number;
    totalWatchSeconds: number;
    avgSessionSeconds: number;
    avgWatchSeconds: number;
    avgLoadMs: number;
    assetCompletionRate: number;
    assetSwitches: number;
    downloads: number;
    relatedClicks: number;
};

type ViewerDropInsight = {
    dropId: string;
    dropTitle: string;
    viewCount: number;
    sessionCount: number;
    uniqueViewerCount: number;
    repeatSessionCount: number;
    totalWatchSeconds: number;
    avgSessionSeconds: number;
    avgWatchSeconds: number;
    assetStarts: number;
    assetCompletions: number;
    assetSwitches: number;
    downloads: number;
    relatedClicks: number;
    avgLoadMs: number;
};

type ViewerUserOption = {
    uid: string;
    username: string;
    viewCount: number;
    sessionCount: number;
    totalWatchSeconds: number;
};

type SessionFactRecord = {
    id: string;
    sessionId?: string;
    userId?: string;
    username?: string;
    dropId?: string;
    dropTitle?: string;
    pagePath?: string;
    dayKey?: string;
    hourKey?: string;
    firstEventAtMs?: number;
    lastEventAtMs?: number;
    eventCount?: number;
    startedCount?: number;
    completedCount?: number;
    watchSecondsTotal?: number;
    loadMsTotal?: number;
    loadSampleCount?: number;
};

type ViewerDropFactAccumulator = {
    dropId: string;
    dropTitle: string;
    viewCount: number;
    sessionCount: number;
    uniqueViewerKeys: Set<string>;
    sessionCounts: Map<string, number>;
    totalWatchSeconds: number;
    loadMsTotal: number;
    loadSampleCount: number;
};

type AnalyticsReportRow = {
    dimensionValues?: Array<{ value?: string | null }>;
    metricValues?: Array<{ value?: string | null }>;
};

type AnalyticsReportResponse = {
    rows?: AnalyticsReportRow[];
};

function getRangeWindow(period: string | null): RangeWindow {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    if (period === "24h") {
        return { startDate: "1daysAgo", startMs: now - oneDayMs };
    }

    if (period === "7d") {
        return { startDate: "7daysAgo", startMs: now - (7 * oneDayMs) };
    }

    if (period === "all") {
        return { startDate: "365daysAgo", startMs: now - (365 * oneDayMs) };
    }

    return { startDate: "30daysAgo", startMs: now - (30 * oneDayMs) };
}

function toNumber(value: unknown): number {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
}

function toStringValue(value: unknown): string {
    return typeof value === "string" ? value : "";
}

function safeParams(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return {};
    }

    return value as Record<string, unknown>;
}

function getTelemetryParamString(record: TelemetryLogRecord, key: string): string {
    return toStringValue(record.params[key]).trim();
}

function getTelemetryParamNumber(record: TelemetryLogRecord, key: string): number {
    return toNumber(record.params[key]);
}

async function fetchTelemetryLogs(eventNames: string[], startMs: number): Promise<Record<string, TelemetryLogRecord[]>> {
    const eventMap: Record<string, TelemetryLogRecord[]> = {};

    try {
        const database = firebaseAdmin.database();
        const snapshots = await Promise.all(
            eventNames.map(async (eventName) => {
                const snapshot = await database
                    .ref(`telemetry/events/${eventName}`)
                    .orderByChild("timestamp")
                    .startAt(startMs)
                    .get();

                const rawValue = snapshot.val();
                const records = rawValue && typeof rawValue === "object"
                    ? Object.values(rawValue as Record<string, unknown>).flatMap((entry) => {
                        if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
                            return [];
                        }

                        const rawEntry = entry as Record<string, unknown>;
                        return [{
                            eventName,
                            params: safeParams(rawEntry.params),
                            userId: toStringValue(rawEntry.userId),
                            username: toStringValue(rawEntry.username) || undefined,
                            timestamp: toNumber(rawEntry.timestamp),
                            userAgent: toStringValue(rawEntry.userAgent) || undefined,
                        }];
                    })
                    : [];

                eventMap[eventName] = records
                    .filter((record) => record.timestamp >= startMs)
                    .sort((left, right) => right.timestamp - left.timestamp);
            }),
        );

        await Promise.all(snapshots);
    } catch (error) {
        console.warn("Admin analytics telemetry query failed:", error);
        eventNames.forEach((eventName) => {
            eventMap[eventName] = [];
        });
    }

    eventNames.forEach((eventName) => {
        if (!eventMap[eventName]) {
            eventMap[eventName] = [];
        }
    });

    return eventMap;
}

function buildDurationBuckets(values: number[], bucketEdges: Array<{ label: string; max: number }>) {
    return bucketEdges.map((bucket) => ({
        label: bucket.label,
        count: values.filter((value) => value > 0 && value <= bucket.max).length,
    }));
}

function formatTaskReason(reason: string) {
    if (reason === "tasks_and_checkin") return "Tasks + check-in";
    if (reason === "checkin") return "Check-in only";
    if (reason === "tasks") return "Tasks only";
    if (reason === "missed_daily_progress") return "Missed progress";
    return reason || "Unknown";
}

function normalizeViewerIdentity(value: string) {
    return value.trim().replace(/^@/, "").toLowerCase();
}

function matchesViewerFilter(record: TelemetryLogRecord, viewerFilter: string) {
    if (!viewerFilter) {
        return true;
    }

    const normalizedFilter = normalizeViewerIdentity(viewerFilter);
    if (!normalizedFilter) {
        return true;
    }

    const candidateUserId = normalizeViewerIdentity(record.userId || "");
    const candidateUsername = normalizeViewerIdentity(record.username || "");
    return candidateUserId === normalizedFilter || candidateUsername === normalizedFilter;
}

function getTelemetryDropId(record: TelemetryLogRecord) {
    return getTelemetryParamString(record, "drop_id") || "unknown-drop";
}

function getTelemetryDropTitle(record: TelemetryLogRecord) {
    return getTelemetryParamString(record, "drop_title") || getTelemetryDropId(record);
}

function average(values: number[]) {
    if (values.length === 0) {
        return 0;
    }

    return Math.round(sum(values) / values.length);
}

function sum(values: number[]) {
    return values.reduce((total, value) => total + value, 0);
}

function sumSnapshotField(
    snapshot: FirebaseFirestore.QuerySnapshot,
    fieldName: string,
) {
    return snapshot.docs.reduce((total, doc) => total + toNumber((doc.data() as Record<string, unknown>)[fieldName]), 0);
}

async function safeRunReport(requestConfig: Parameters<BetaAnalyticsDataClient["runReport"]>[0]): Promise<AnalyticsReportResponse> {
    try {
        const [response] = await analyticsClient.runReport(requestConfig);
        return response as AnalyticsReportResponse;
    } catch (error) {
        console.warn("GA runReport failed, falling back to first-party analytics:", error);
        return { rows: [] };
    }
}

async function safeRunRealtimeReport(requestConfig: Parameters<BetaAnalyticsDataClient["runRealtimeReport"]>[0]): Promise<AnalyticsReportResponse> {
    try {
        const [response] = await analyticsClient.runRealtimeReport(requestConfig);
        return response as AnalyticsReportResponse;
    } catch (error) {
        console.warn("GA realtime report failed, falling back to first-party analytics:", error);
        return { rows: [] };
    }
}

export async function GET(request: NextRequest) {
    try {
        await checkRateLimit(request, "admin/analytics", ADMIN);
        await verifyAdmin(request);

        const searchParams = request.nextUrl.searchParams;
        const type = searchParams.get("type"); // "historical" or "realtime"
        const period = searchParams.get("period"); // "24h", "7d", "30d", "all"
        const viewerUser = searchParams.get("viewerUser")?.trim() || "";

        if (!propertyId) {
            return NextResponse.json({
                error: "GA_PROPERTY_ID is missing from environment variables.",
                requiresSetup: true
            }, { status: 400 });
        }

        // Removed old !analyticsClient check since ADC is supported on App Hosting

        if (type === "realtime") {
            const thirtyMinsAgo = Date.now() - 30 * 60 * 1000;

            // 1. Get true Deduplicated Total Active Users from GA4
            const totalActiveResponse = await safeRunRealtimeReport({
                property: `properties/${propertyId}`,
                metrics: [{ name: "activeUsers" }],
            });

            const totalActive = parseInt(totalActiveResponse.rows?.[0]?.metricValues?.[0]?.value || "0", 10);

            // 2. Get the 1-minute discrete interval chart data
            const intervalResponse = await safeRunRealtimeReport({
                property: `properties/${propertyId}`,
                metrics: [{ name: "activeUsers" }, { name: "screenPageViews" }],
                dimensions: [{ name: "minutesAgo" }],
            });

            const rows = intervalResponse.rows || [];

            // Map the past 30 minutes. Fill missing minutes with 0.
            const liveData = Array.from({ length: 30 }, (_, i) => ({
                minute: i,
                users: 0,
                views: 0
            }));

            rows.forEach((row: AnalyticsReportRow) => {
                const minAgo = parseInt(row.dimensionValues?.[0]?.value || "0", 10);
                const usersCount = parseInt(row.metricValues?.[0]?.value || "0", 10);
                const viewsCount = parseInt(row.metricValues?.[1]?.value || "0", 10);
                if (minAgo < 30) {
                    liveData[minAgo].users = usersCount;
                    liveData[minAgo].views = viewsCount;
                }
            });

            // Sort so that 29 minutes ago is first, 0 minutes ago (now) is last
            liveData.sort((a, b) => b.minute - a.minute);

            // 3. Get authenticated telemetry activity in the last 30 minutes
            const sessionsQuery = await adminDb.collection("analytics_active_users")
                .where("lastSeenAt", ">=", thirtyMinsAgo)
                .get();

            const deepTrackerActive = sessionsQuery.size;

            return NextResponse.json({
                success: true,
                totalActive,
                deepTrackerActive,
                data: liveData
            });
        }

        if (type === "historical") {
            const { startDate, startMs } = getRangeWindow(period);
            const dropReferences = await getAllDropReferenceMap();
            const startDayKey = new Date(startMs).toISOString().slice(0, 10);

            const [
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
                dropsSnapshot,
            ] = await Promise.all([
                safeRunReport({
                    property: `properties/${propertyId}`,
                    dateRanges: [{ startDate, endDate: "today" }],
                    metrics: [
                        { name: "activeUsers" },
                        { name: "screenPageViews" },
                        { name: "sessions" },
                        { name: "newUsers" },
                        { name: "averageSessionDuration" },
                        { name: "engagementRate" }
                    ],
                    dimensions: [{ name: "date" }],
                    orderBys: [{
                        dimension: { dimensionName: "date" },
                        desc: false
                    }]
                }),
                safeRunReport({
                    property: `properties/${propertyId}`,
                    dateRanges: [{ startDate, endDate: "today" }],
                    metrics: [{ name: "eventCount" }],
                    dimensions: [{ name: "eventName" }],
                    dimensionFilter: {
                        filter: {
                            fieldName: "eventName",
                            inListFilter: {
                                values: ANALYTICS_EVENT_NAMES
                            }
                        }
                    }
                }),
                safeRunReport({
                    property: `properties/${propertyId}`,
                    dateRanges: [{ startDate, endDate: "today" }],
                    metrics: [{ name: "activeUsers" }],
                    dimensions: [{ name: "country" }, { name: "city" }],
                    orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
                    limit: 15
                }),
                safeRunReport({
                    property: `properties/${propertyId}`,
                    dateRanges: [{ startDate, endDate: "today" }],
                    metrics: [{ name: "screenPageViews" }, { name: "averageSessionDuration" }, { name: "engagementRate" }],
                    dimensions: [{ name: "pagePath" }],
                    orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
                    limit: 25
                }),
                safeRunReport({
                    property: `properties/${propertyId}`,
                    dateRanges: [{ startDate, endDate: "today" }],
                    metrics: [
                        { name: "activeUsers" },
                        { name: "sessions" },
                        { name: "engagementRate" }
                    ],
                    dimensions: [{ name: "deviceCategory" }],
                    orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
                    limit: 3
                }),
                safeRunReport({
                    property: `properties/${propertyId}`,
                    dateRanges: [{ startDate, endDate: "today" }],
                    metrics: [{ name: "eventCount" }],
                    dimensions: [{ name: "customEvent:durationSeconds" }],
                    dimensionFilter: {
                        filter: {
                            fieldName: "eventName",
                            stringFilter: {
                                value: "guided_onboarding_completed",
                                matchType: "EXACT"
                            }
                        }
                    }
                }),
                adminDb.collection("analytics_rollups_daily").get(),
                adminDb.collection("analytics_page_daily")
                    .where("dayKey", ">=", startDayKey)
                    .get(),
                adminDb.collection("analytics_drop_daily")
                    .where("dayKey", ">=", startDayKey)
                    .get(),
                adminDb.collection("analytics_task_daily")
                    .where("dayKey", ">=", startDayKey)
                    .get(),
                adminDb.collection("analytics_commerce_daily")
                    .where("dayKey", ">=", startDayKey)
                    .get(),
                adminDb.collection("analytics_session_facts")
                    .where("dayKey", ">=", startDayKey)
                    .get(),
                adminDb.collection("drops").get(),
            ]);

            const telemetryEventNames = [
                "auth_sign_in_success",
                "auth_sign_up_success",
                "auth_google_sign_in_success",
                "guided_onboarding_completed",
                "wallet_opened",
                "begin_checkout",
                "gumdrops_purchase_completed",
                "gumdrops_purchase_failed",
                "drop_preview_opened",
                "drop_unlock_attempted",
                "unlock_drop_success",
                "viewer_opened",
                "viewer_session_started",
                "viewer_session_completed",
                "viewer_asset_started",
                "viewer_asset_changed",
                "viewer_asset_completed",
                "viewer_asset_consumed",
                "viewer_watch_checkpoint",
                "viewer_content_loaded",
                "viewer_source_downloaded",
                "viewer_related_drop_clicked",
                "notification_opened",
                "notification_marked_read",
                "notification_mark_all_read",
                "notifications_dropdown_opened",
                "task_notifications_enabled",
                "notification_prompt_banner_viewed",
                "notification_prompt_banner_dismissed",
                "navigation_click",
                "dashboard_viewed",
                "library_viewed",
                "experience_hub_viewed",
                "drops_page_viewed",
                "faq_page_viewed",
                "home_page_viewed",
            ];

            const [
                telemetryLogsByEvent,
                taskEventsSnapshot,
                transactionsInRangeSnapshot,
            ] = await Promise.all([
                fetchTelemetryLogs(telemetryEventNames, startMs),
                adminDb.collection("daily_task_events")
                    .where("timestamp", ">=", startMs)
                    .orderBy("timestamp", "desc")
                    .get(),
                adminDb.collection("transactions")
                    .where("timestamp", ">=", startMs)
                    .orderBy("timestamp", "desc")
                    .get(),
            ]);

            const rows = response.rows || [];

            const chartData = rows.length > 0
                ? rows.map((row: AnalyticsReportRow) => {
                    const dateStr = row.dimensionValues?.[0]?.value || "";
                    const label = dateStr.length === 8
                        ? `${dateStr.substring(4, 6)}/${dateStr.substring(6, 8)}`
                        : dateStr;

                    return {
                        date: label,
                        rawDate: dateStr,
                        users: parseInt(row.metricValues?.[0]?.value || "0", 10),
                        views: parseInt(row.metricValues?.[1]?.value || "0", 10),
                        sessions: parseInt(row.metricValues?.[2]?.value || "0", 10),
                        newUsers: parseInt(row.metricValues?.[3]?.value || "0", 10),
                        avgSessionDuration: parseFloat(row.metricValues?.[4]?.value || "0"),
                        engagementRate: parseFloat(row.metricValues?.[5]?.value || "0"),
                    };
                })
                : dailyRollupsSnapshot.docs
                    .map((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
                        const data = doc.data() as Record<string, unknown>;
                        const dayKey = doc.id;
                        return {
                            date: dayKey.slice(5).replace("-", "/"),
                            rawDate: dayKey.replaceAll("-", ""),
                            users: toNumber(data.authenticatedEvents),
                            views: toNumber(data.totalEvents),
                            sessions: toNumber(data.viewerSessions),
                            newUsers: 0,
                            avgSessionDuration: 0,
                            engagementRate: 0,
                            sortKey: dayKey,
                        };
                    })
                    .filter((row: { sortKey: string }) => row.sortKey >= startDayKey)
                    .sort((left: { sortKey: string }, right: { sortKey: string }) => left.sortKey.localeCompare(right.sortKey))
                    .map(({ sortKey, ...row }: { sortKey: string; date: string; rawDate: string; users: number; views: number; sessions: number; newUsers: number; avgSessionDuration: number; engagementRate: number }) => row);

            const totals = {
                users: chartData.reduce((acc: number, curr) => acc + curr.users, 0),
                views: chartData.reduce((acc: number, curr) => acc + curr.views, 0),
                sessions: chartData.reduce((acc: number, curr) => acc + curr.sessions, 0),
                newUsers: chartData.reduce((acc: number, curr) => acc + curr.newUsers, 0),
                avgSessionDuration: chartData.length > 0 ? chartData.reduce((acc: number, curr) => acc + curr.avgSessionDuration, 0) / chartData.length : 0,
                engagementRate: chartData.length > 0 ? chartData.reduce((acc: number, curr) => acc + curr.engagementRate, 0) / chartData.length : 0,
            };

            const eventsData = (eventsResponse.rows || []).reduce((acc: Record<string, number>, row: AnalyticsReportRow) => {
                const eventName = row.dimensionValues?.[0]?.value || "unknown";
                const count = parseInt(row.metricValues?.[0]?.value || "0", 10);
                acc[eventName] = count;
                return acc;
            }, {});

            const eventBreakdown = (eventsResponse.rows || [])
                .map((row: AnalyticsReportRow) => ({
                    eventName: row.dimensionValues?.[0]?.value || "unknown",
                    count: parseInt(row.metricValues?.[0]?.value || "0", 10),
                }))
                .sort((a: { count: number }, b: { count: number }) => b.count - a.count);

            const geoData = (geoResponse.rows || []).map((row: AnalyticsReportRow) => ({
                country: row.dimensionValues?.[0]?.value || "Unknown",
                city: row.dimensionValues?.[1]?.value || "Unknown",
                users: parseInt(row.metricValues?.[0]?.value || "0", 10)
            }));

            const devices = (devicesResponse.rows || []).map((row: AnalyticsReportRow) => ({
                device: row.dimensionValues?.[0]?.value || "unknown",
                users: parseInt(row.metricValues?.[0]?.value || "0", 10),
                sessions: parseInt(row.metricValues?.[1]?.value || "0", 10),
                engagementRate: parseFloat(row.metricValues?.[2]?.value || "0"),
            }));

            const firstPartyPageMap = new Map<string, { views: number; clicks: number; dwellMsTotal: number; dwellSamples: number }>();
            pageRollupsSnapshot.docs.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
                const data = doc.data() as Record<string, unknown>;
                const path = toStringValue(data.pagePath) || "/";
                const entry = firstPartyPageMap.get(path) || { views: 0, clicks: 0, dwellMsTotal: 0, dwellSamples: 0 };
                entry.views += toNumber(data.pageViews);
                entry.clicks += toNumber(data.clickCount);
                entry.dwellMsTotal += toNumber(data.dwellMsTotal);
                entry.dwellSamples += toNumber(data.dwellSampleCount);
                firstPartyPageMap.set(path, entry);
            });

            const pagesData = firstPartyPageMap.size > 0
                ? Array.from(firstPartyPageMap.entries())
                    .map(([path, stats]) => ({
                        path,
                        views: stats.views,
                        avgTime: stats.dwellSamples > 0 ? stats.dwellMsTotal / 1000 / stats.dwellSamples : 0,
                        engagementRate: stats.views > 0 ? stats.clicks / stats.views : 0,
                    }))
                    .sort((a, b) => b.views - a.views)
                    .slice(0, 25)
                : (pagesResponse.rows || []).map((row: AnalyticsReportRow) => ({
                    path: row.dimensionValues?.[0]?.value || "/",
                    views: parseInt(row.metricValues?.[0]?.value || "0", 10),
                    avgTime: parseFloat(row.metricValues?.[1]?.value || "0"),
                    engagementRate: parseFloat(row.metricValues?.[2]?.value || "0")
                }));

            const dropsData = period === "all"
                ? dropsSnapshot.docs
                    .map((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
                        const data = doc.data() as Record<string, unknown>;
                        return {
                            dropId: doc.id,
                            dropTitle: resolveDropTitle(dropReferences, doc.id),
                            views: toNumber(data.totalClicks),
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
                        current.views += toNumber(data.eventCount);
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

            // --- NEW: Firestore Aggregations ---
            // 1. Commerce: Transaction totals (USD Revenue vs GD Spent) AND feed
            const transactionsSnapshot = await adminDb.collection("transactions")
                .orderBy("timestamp", "desc")
                .limit(50)
                .get();

            let totalRevenueUsd = 0;
            let totalAdjustedProfitUsd = 0;
            let totalBonusValueUsd = 0;
            let totalDeliveredGd = 0;
            let totalBonusGd = 0;
            let totalGdSpent = 0; // Unlocks amount (GD)
            const rawTransactions: any[] = [];

            transactionsSnapshot.docs.forEach((doc: any) => {
                const normalized = normalizeTransactionRecord(doc.data(), doc.id);
                rawTransactions.push(normalized);
                if (normalized.type === "purchase_currency" && normalized.status === "completed") {
                    const economics = deriveGumdropEconomics(
                        normalized.deliveredGumDrops ?? normalized.amount,
                        normalized.grossRevenueUsd ?? normalized.cost ?? 0,
                    );
                    totalRevenueUsd += economics.grossRevenueUsd;
                    totalAdjustedProfitUsd += economics.adjustedProfitUsd;
                    totalBonusValueUsd += economics.bonusValueUsd;
                    totalDeliveredGd += economics.deliveredGumDrops;
                    totalBonusGd += economics.bonusGumDrops;
                } else if (normalized.type === "unlock_content") {
                    totalGdSpent += (normalized.amount || 0);
                }
            });

            // Delaying commerce object creation until users are fetched

            // 2. Security: User Security Flags
            const usersWithFlagsSnapshot = await adminDb.collection("users")
                .orderBy("securityFlags.lastViolation", "desc")
                .limit(50)
                .get();

            const securityLogs = usersWithFlagsSnapshot.docs.map((doc: any) => {
                const data = doc.data();
                const violationDropId = data.securityFlags?.lastViolationDropId || null;
                return {
                    uid: doc.id,
                    username: data.username || data.displayName || "Unknown User",
                    photoURL: data.photoURL,
                    ripAttempts: data.securityFlags?.ripAttempts || 0,
                    lastViolation: data.securityFlags?.lastViolation || null,
                    lastViolationReason: data.securityFlags?.lastViolationReason || "Unknown",
                    lastViolationDropId: violationDropId,
                    lastViolationDropTitle: violationDropId ? resolveDropTitle(dropReferences, violationDropId) : null,
                };
            }).filter((log: any) => log.ripAttempts > 0);
            // --- END NEW ---

            // 3. Deep Tracker Sessions (Raw Event Trace)
            // Limit to only 5 recent session buckets to prevent massive payload over the wire
            const deepTrackerSnapshot = await adminDb.collection("analytics_sessions")
                .orderBy("createdAt", "desc")
                .limit(5)
                .get();

            const rawEvents: any[] = [];
            for (const doc of deepTrackerSnapshot.docs) {
                const sessionData = doc.data();
                if (sessionData.events && Array.isArray(sessionData.events)) {
                    rawEvents.push(...sessionData.events);
                }
                // Break early once we hit our cap to save CPU and memory
                if (rawEvents.length >= 200) {
                    break;
                }
            }
            // Sort combined events descending by time
            rawEvents.sort((a, b) => b.timestamp - a.timestamp);
            const slicedEvents = rawEvents.slice(0, 200);

            // --- User Resolution Mapping ---
            const userUids = new Set<string>();
            rawTransactions.forEach(tx => {
                if (tx.userId) userUids.add(tx.userId);
            });
            slicedEvents.forEach(evt => {
                if (evt.uid && evt.uid !== 'anonymous' && evt.uid !== 'anon') userUids.add(evt.uid);
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

            const mappedEvents = slicedEvents.map(evt => ({
                ...evt,
                username: evt.uid && evt.uid !== 'anonymous' && evt.uid !== 'anon' ? (userMap[evt.uid]?.username || evt.uid) : "Guest",
                userPhoto: evt.uid && evt.uid !== 'anonymous' && evt.uid !== 'anon' ? (userMap[evt.uid]?.photoURL || "") : ""
            }));

            const commerce = {
                revenueUsd: totalRevenueUsd,
                adjustedProfitUsd: totalAdjustedProfitUsd,
                bonusValueUsd: totalBonusValueUsd,
                deliveredGumDrops: totalDeliveredGd,
                bonusGumDrops: totalBonusGd,
                effectiveUsdPer100Gd: totalDeliveredGd > 0 ? totalRevenueUsd / (totalDeliveredGd / 100) : 0,
                gdSpent: totalGdSpent,
                feed: mappedCommerceFeed
            };

            const telemetryLogs = Object.values(telemetryLogsByEvent).flat().sort((left, right) => right.timestamp - left.timestamp);
            const firstPartyAuthenticatedEvents = sumSnapshotField(dailyRollupsSnapshot, "authenticatedEvents");
            const firstPartyTaskLifecycleEvents = sumSnapshotField(taskDailySnapshot, "eventCount");
            const firstPartyPurchaseCount = sumSnapshotField(commerceDailySnapshot, "purchaseCount");
            const firstPartyUnlockCount = sumSnapshotField(commerceDailySnapshot, "unlockCount");
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
            const purchaseEventCount = Math.max(eventsData.gumdrops_purchase_completed || 0, eventsData.purchase || 0);
            const purchases = Math.max(purchaseEventCount, firstPartyPurchaseCount);
            const canonicalUnlockCount = Math.max(eventsData.unlock_drop_success || 0, firstPartyUnlockCount);
            const funnel = {
                authModalOpens: eventsData.auth_modal_opened || 0,
                authSignIns: (eventsData.auth_sign_in_success || 0) + (eventsData.auth_google_sign_in_success || 0),
                authSignUps: eventsData.auth_sign_up_success || 0,
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
            
            const avgOnboardingDuration = totalOnboardingCompletions > 0 
                ? Math.round(totalOnboardingSeconds / totalOnboardingCompletions) 
                : 0;

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

            const averageDuration = (records: TelemetryLogRecord[]) => {
                const durations = records
                    .map((record) => getTelemetryParamNumber(record, "duration_ms"))
                    .filter((value) => value > 0);

                if (durations.length === 0) {
                    return 0;
                }

                return Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length);
            };

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
                    successes: eventsData.auth_sign_up_success || 0,
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
            ].map((entry) => ({
                ...entry,
                successRate: entry.attempts > 0 ? entry.successes / entry.attempts : 0,
            }));

            const onboardingDurationsMs = [
                ...telemetryLogsByEvent.guided_onboarding_completed.map((record) => {
                    const directMs = getTelemetryParamNumber(record, "duration_ms");
                    if (directMs > 0) {
                        return directMs;
                    }

                    return getTelemetryParamNumber(record, "durationSeconds") * 1000;
                }),
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

            const taskPipeline = [
                { label: "Assigned", count: normalizedTaskEvents.filter((event) => event.type === "assigned").length },
                { label: "Started", count: normalizedTaskEvents.filter((event) => event.type === "started").length },
                { label: "Completed", count: normalizedTaskEvents.filter((event) => event.type === "completed").length },
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
                    status: Math.abs(completedPurchaseTransactions.length - firstPartyPurchaseCount) <= 1 ? "pass" : "warn",
                    detail: `${completedPurchaseTransactions.length.toLocaleString()} completed purchase transactions vs ${firstPartyPurchaseCount.toLocaleString()} canonical purchase rollups and ${purchaseEventCount.toLocaleString()} telemetry purchase events.`,
                },
                {
                    label: "Unlock parity",
                    status: Math.abs(unlockTransactions.length - firstPartyUnlockCount) <= 1 ? "pass" : "warn",
                    detail: `${unlockTransactions.length.toLocaleString()} unlock transactions vs ${firstPartyUnlockCount.toLocaleString()} canonical unlock rollups and ${eventsData.unlock_drop_success || 0} unwrap telemetry events.`,
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
                onboardingStats: { completions: totalOnboardingCompletions, avgDuration: avgOnboardingDuration },
                rawEvents: mappedEvents,
                authBreakdown,
                onboardingDurationBuckets,
                repeatVisitSegments,
                destinationMix,
                notificationFunnel,
                notificationActions,
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
                validations,
            });
        }

        return NextResponse.json({ error: "Invalid query type" }, { status: 400 });

    } catch (error) {
        return handleApiError(error, "Admin.Analytics.GET");
    }
}
