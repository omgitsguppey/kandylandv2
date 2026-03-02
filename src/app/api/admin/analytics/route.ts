import { NextRequest, NextResponse } from "next/server";
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { verifyAdmin, handleApiError } from "@/lib/server/auth";

const propertyId = process.env.GA_PROPERTY_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

let analyticsClient: BetaAnalyticsDataClient | null = null;

if (clientEmail && privateKey) {
    analyticsClient = new BetaAnalyticsDataClient({
        credentials: {
            client_email: clientEmail,
            private_key: privateKey,
        },
    });
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

        if (!analyticsClient) {
            return NextResponse.json({
                error: "Google Analytics credentials missing. Check FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY.",
                requiresSetup: true
            }, { status: 500 });
        }

        if (type === "realtime") {
            // Realtime report gives active users in the last 30 minutes
            const [response] = await analyticsClient.runRealtimeReport({
                property: `properties/${propertyId}`,
                metrics: [{ name: "activeUsers" }],
                dimensions: [{ name: "minutesAgo" }],
            });

            const rows = response.rows || [];

            // Map the past 30 minutes. Fill missing minutes with 0.
            const liveData = Array.from({ length: 30 }, (_, i) => ({
                minute: i,
                users: 0
            }));

            rows.forEach(row => {
                const minAgo = parseInt(row.dimensionValues?.[0]?.value || "0", 10);
                const usersCount = parseInt(row.metricValues?.[0]?.value || "0", 10);
                if (minAgo < 30) {
                    liveData[minAgo].users = usersCount;
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
                metrics: [{ name: "activeUsers" }, { name: "screenPageViews" }, { name: "sessions" }],
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
                };
            });

            const totals = {
                users: chartData.reduce((acc, curr) => acc + curr.users, 0),
                views: chartData.reduce((acc, curr) => acc + curr.views, 0),
                sessions: chartData.reduce((acc, curr) => acc + curr.sessions, 0),
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
