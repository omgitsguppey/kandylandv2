export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from "next/server";
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { verifyAdmin, handleApiError } from "@/lib/server/auth";

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
            // Realtime report gives active users in the last 30 minutes
            const [response] = await analyticsClient.runRealtimeReport({
                property: `properties/${propertyId}`,
                metrics: [{ name: "activeUsers" }, { name: "screenPageViews" }],
                dimensions: [{ name: "minutesAgo" }],
            });

            const rows = response.rows || [];

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

            const totalActive = rows.reduce((acc, row) => acc + parseInt(row.metricValues?.[0]?.value || "0", 10), 0);

            return NextResponse.json({
                success: true,
                totalActive,
                data: liveData
            });
        }

        if (type === "historical") {
            let startDate = "30daysAgo";
            if (period === "24h") startDate = "1daysAgo";
            else if (period === "7d") startDate = "7daysAgo";
            else if (period === "all") startDate = "365daysAgo";

            const [response] = await analyticsClient.runReport({
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
            });

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

            return NextResponse.json({
                success: true,
                data: chartData,
                totals
            });
        }

        return NextResponse.json({ error: "Invalid query type" }, { status: 400 });

    } catch (error) {
        return handleApiError(error, "Admin.Analytics.GET");
    }
}
