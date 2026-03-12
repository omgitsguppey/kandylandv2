export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from "next/server";
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { verifyAdmin, handleApiError } from "@/lib/server/auth";
import { adminDb } from "@/lib/server/firebase-admin";
import { checkRateLimit, ADMIN } from "@/lib/server/rate-limit";

const propertyId = process.env.GA_PROPERTY_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

// Initialize with explicit credentials if available, otherwise fallback to Default Application Credentials
let analyticsClient: BetaAnalyticsDataClient;

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
            let startDate = "30daysAgo";
            if (period === "24h") startDate = "1daysAgo";
            else if (period === "7d") startDate = "7daysAgo";
            else if (period === "all") startDate = "365daysAgo";

            const [
                [response],
                [eventsResponse],
                [geoResponse],
                [pagesResponse],
                [dropsResponse],
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
                                values: ["view_drop_details", "unlock_drop_success", "user_login", "daily_check_in_claim", "guided_onboarding_completed"]
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

            const geoData = (geoResponse.rows || []).map(row => ({
                country: row.dimensionValues?.[0]?.value || "Unknown",
                city: row.dimensionValues?.[1]?.value || "Unknown",
                users: parseInt(row.metricValues?.[0]?.value || "0", 10)
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

            return NextResponse.json({
                success: true,
                data: chartData,
                totals,
                events: eventsData,
                geo: geoData,
                pages: pagesData,
                topDrops: dropsData,
                commerce,
                security: securityLogs,
                onboardingStats: { completions: totalOnboardingCompletions, avgDuration: avgOnboardingDuration },
                rawEvents: mappedEvents
            });
        }

        return NextResponse.json({ error: "Invalid query type" }, { status: 400 });

    } catch (error) {
        return handleApiError(error, "Admin.Analytics.GET");
    }
}
