export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from "next/server";
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import * as firebaseAdmin from "firebase-admin";
import { verifyAdmin, handleApiError } from "@/lib/server/auth";
import { adminDb } from "@/lib/server/firebase-admin";
import { checkRateLimit, ADMIN } from "@/lib/server/rate-limit";
import { TELEMETRY_EVENT_NAMES } from "@/lib/telemetry-catalog";
import { normalizeTransactionRecord } from "@/lib/transaction-normalizers";

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

export async function GET(request: NextRequest) {
    try {
        checkRateLimit(request, "admin/analytics", ADMIN);
        await verifyAdmin(request);

        const searchParams = request.nextUrl.searchParams;
        const type = searchParams.get("type"); // "historical" or "realtime"
        const period = searchParams.get("period"); // "24h", "7d", "30d", "all"

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
            const [totalActiveResponse] = await analyticsClient.runRealtimeReport({
                property: `properties/${propertyId}`,
                metrics: [{ name: "activeUsers" }],
            });

            const totalActive = parseInt(totalActiveResponse.rows?.[0]?.metricValues?.[0]?.value || "0", 10);

            // 2. Get the 1-minute discrete interval chart data
            const [intervalResponse] = await analyticsClient.runRealtimeReport({
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

            rows.forEach(row => {
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

            // 3. Get native DeepTracker Internal Live Users
            const sessionsQuery = await adminDb.collection("analytics_sessions")
                .where("createdAt", ">=", thirtyMinsAgo)
                .get();

            const uniqueDeepTrackerUsers = new Set<string>();
            sessionsQuery.docs.forEach(doc => {
                const sessionData = doc.data();
                if (sessionData.uid) {
                    uniqueDeepTrackerUsers.add(sessionData.uid);
                }
            });

            const deepTrackerActive = uniqueDeepTrackerUsers.size;

            return NextResponse.json({
                success: true,
                totalActive,
                deepTrackerActive,
                data: liveData
            });
        }

        if (type === "historical") {
            const { startDate, startMs } = getRangeWindow(period);

            const [
                [response],
                [eventsResponse],
                [geoResponse],
                [pagesResponse],
                [dropsResponse],
                [devicesResponse],
                [onboardingResponse]
            ] = await Promise.all([
                analyticsClient.runReport({
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
                analyticsClient.runReport({
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
                analyticsClient.runReport({
                    property: `properties/${propertyId}`,
                    dateRanges: [{ startDate, endDate: "today" }],
                    metrics: [{ name: "activeUsers" }],
                    dimensions: [{ name: "country" }, { name: "city" }],
                    orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
                    limit: 15
                }),
                analyticsClient.runReport({
                    property: `properties/${propertyId}`,
                    dateRanges: [{ startDate, endDate: "today" }],
                    metrics: [{ name: "screenPageViews" }, { name: "averageSessionDuration" }, { name: "engagementRate" }],
                    dimensions: [{ name: "pagePath" }],
                    orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
                    limit: 25
                }),
                analyticsClient.runReport({
                    property: `properties/${propertyId}`,
                    dateRanges: [{ startDate, endDate: "today" }],
                    metrics: [{ name: "eventCount" }],
                    dimensions: [{ name: "customEvent:drop_id" }, { name: "eventName" }],
                    dimensionFilter: {
                        filter: {
                            fieldName: "eventName",
                            inListFilter: {
                                values: ["view_drop_details", "unlock_drop_success"]
                            }
                        }
                    },
                    limit: 50
                }),
                analyticsClient.runReport({
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
                analyticsClient.runReport({
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
                })
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
                "viewer_asset_changed",
                "viewer_asset_consumed",
                "viewer_watch_checkpoint",
                "viewer_source_downloaded",
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
                    .orderBy("timestamp", "desc")
                    .get(),
                adminDb.collection("transactions")
                    .orderBy("timestamp", "desc")
                    .get(),
            ]);

            const rows = response.rows || [];

            const chartData = rows.map(row => {
                const dateStr = row.dimensionValues?.[0]?.value || "";
                // Format YYYYMMDD to nice label
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
            });

            const totals = {
                users: chartData.reduce((acc, curr) => acc + curr.users, 0),
                views: chartData.reduce((acc, curr) => acc + curr.views, 0),
                sessions: chartData.reduce((acc, curr) => acc + curr.sessions, 0),
                newUsers: chartData.reduce((acc, curr) => acc + curr.newUsers, 0),
                avgSessionDuration: chartData.length > 0 ? chartData.reduce((acc, curr) => acc + curr.avgSessionDuration, 0) / chartData.length : 0,
                engagementRate: chartData.length > 0 ? chartData.reduce((acc, curr) => acc + curr.engagementRate, 0) / chartData.length : 0,
            };

            const eventsData = (eventsResponse.rows || []).reduce((acc: Record<string, number>, row) => {
                const eventName = row.dimensionValues?.[0]?.value || "unknown";
                const count = parseInt(row.metricValues?.[0]?.value || "0", 10);
                acc[eventName] = count;
                return acc;
            }, {});

            const eventBreakdown = (eventsResponse.rows || [])
                .map((row) => ({
                    eventName: row.dimensionValues?.[0]?.value || "unknown",
                    count: parseInt(row.metricValues?.[0]?.value || "0", 10),
                }))
                .sort((a, b) => b.count - a.count);

            const geoData = (geoResponse.rows || []).map(row => ({
                country: row.dimensionValues?.[0]?.value || "Unknown",
                city: row.dimensionValues?.[1]?.value || "Unknown",
                users: parseInt(row.metricValues?.[0]?.value || "0", 10)
            }));

            const devices = (devicesResponse.rows || []).map((row) => ({
                device: row.dimensionValues?.[0]?.value || "unknown",
                users: parseInt(row.metricValues?.[0]?.value || "0", 10),
                sessions: parseInt(row.metricValues?.[1]?.value || "0", 10),
                engagementRate: parseFloat(row.metricValues?.[2]?.value || "0"),
            }));

            const pagesData = (pagesResponse.rows || []).map(row => ({
                path: row.dimensionValues?.[0]?.value || "/",
                views: parseInt(row.metricValues?.[0]?.value || "0", 10),
                avgTime: parseFloat(row.metricValues?.[1]?.value || "0"),
                engagementRate: parseFloat(row.metricValues?.[2]?.value || "0")
            }));

            // Aggregate drop interactions. A drop object will have: { id, views, unlocks }
            const dropMap = new Map<string, { views: number; unlocks: number }>();
            (dropsResponse.rows || []).forEach(row => {
                const dropId = row.dimensionValues?.[0]?.value;
                const eventName = row.dimensionValues?.[1]?.value;
                const count = parseInt(row.metricValues?.[0]?.value || "0", 10);

                if (!dropId || dropId === "(not set)") return;

                const current = dropMap.get(dropId) || { views: 0, unlocks: 0 };
                if (eventName === "view_drop_details") {
                    current.views += count;
                } else if (eventName === "unlock_drop_success") {
                    current.unlocks += count;
                }
                dropMap.set(dropId, current);
            });

            // Convert to array and sort by views for the Top Drops chart
            const dropsData = Array.from(dropMap.entries())
                .map(([id, stats]) => ({
                    dropId: id,
                    views: stats.views,
                    unlocks: stats.unlocks
                }))
                .sort((a, b) => b.views - a.views)
                .slice(0, 15);

            // --- NEW: Firestore Aggregations ---
            // 1. Commerce: Transaction totals (USD Revenue vs GD Spent) AND feed
            const transactionsSnapshot = await adminDb.collection("transactions")
                .orderBy("timestamp", "desc")
                .limit(50)
                .get();

            let totalRevenueCents = 0; // Purchase amount (USD cents)
            let totalGdSpent = 0; // Unlocks amount (GD)
            const rawTransactions: any[] = [];

            transactionsSnapshot.docs.forEach((doc: any) => {
                const tx = doc.data();
                rawTransactions.push({ id: doc.id, ...tx });
                if (tx.type === "purchase_currency" && tx.status === "completed") {
                    totalRevenueCents += (tx.cost || 0); // Assuming cost is in cents based on standard Stripe/PayPal integration
                } else if (tx.type === "unlock_content") {
                    totalGdSpent += (tx.amount || 0);
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
                return {
                    uid: doc.id,
                    username: data.username || data.displayName || "Unknown User",
                    photoURL: data.photoURL,
                    ripAttempts: data.securityFlags?.ripAttempts || 0,
                    lastViolation: data.securityFlags?.lastViolation || null,
                    lastViolationReason: data.securityFlags?.lastViolationReason || "Unknown",
                    lastViolationDropId: data.securityFlags?.lastViolationDropId || null
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
                revenueUsd: totalRevenueCents / 100,
                gdSpent: totalGdSpent,
                feed: mappedCommerceFeed
            };

            const purchases = Math.max(eventsData.gumdrops_purchase_completed || 0, eventsData.purchase || 0);
            const funnel = {
                authModalOpens: eventsData.auth_modal_opened || 0,
                authSignIns: (eventsData.auth_sign_in_success || 0) + (eventsData.auth_google_sign_in_success || 0),
                authSignUps: eventsData.auth_sign_up_success || 0,
                previewOpens: eventsData.drop_preview_opened || 0,
                viewerOpens: eventsData.viewer_opened || 0,
                assetSwitches: eventsData.viewer_asset_changed || 0,
                unlocks: eventsData.unlock_drop_success || 0,
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
            
            onboardingRows.forEach(row => {
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

            const telemetryLogs = Object.values(telemetryLogsByEvent).flat().sort((left, right) => right.timestamp - left.timestamp);
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
                    status: telemetryLogs.length > 0 ? "pass" : "warn",
                    detail: telemetryLogs.length > 0
                        ? `${telemetryLogs.length.toLocaleString()} authenticated telemetry events with drill-down params in range.`
                        : "No authenticated telemetry logs returned for the selected range.",
                },
                {
                    label: "Task lifecycle",
                    status: normalizedTaskEvents.some((event) => event.type === "completed") ? "pass" : "warn",
                    detail: normalizedTaskEvents.length > 0
                        ? `${normalizedTaskEvents.length.toLocaleString()} task lifecycle events loaded.`
                        : "No task lifecycle events matched the selected range.",
                },
                {
                    label: "Purchase parity",
                    status: Math.abs(completedPurchaseTransactions.length - purchases) <= 2 ? "pass" : "warn",
                    detail: `${completedPurchaseTransactions.length.toLocaleString()} completed purchase transactions vs ${purchases.toLocaleString()} purchase completion events.`,
                },
                {
                    label: "Unlock parity",
                    status: Math.abs(unlockTransactions.length - funnel.unlocks) <= 5 ? "pass" : "warn",
                    detail: `${unlockTransactions.length.toLocaleString()} unlock transactions vs ${funnel.unlocks.toLocaleString()} unwrap events.`,
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
                validations,
            });
        }

        return NextResponse.json({ error: "Invalid query type" }, { status: 400 });

    } catch (error) {
        return handleApiError(error, "Admin.Analytics.GET");
    }
}
