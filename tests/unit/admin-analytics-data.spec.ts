import { beforeEach, describe, expect, it, vi } from "vitest";

type MockDoc = {
    id: string;
    data: () => Record<string, unknown>;
};

type QueryClause = {
    field: string;
    operator: string;
    value: unknown;
};

type OrderClause = {
    field: string;
    direction: "asc" | "desc";
};

const mockState = vi.hoisted(() => {
    const collections = new Map<string, MockDoc[]>();
    const documents = new Map<string, Record<string, unknown>>();
    const queryHistory: Array<{
        name: string;
        clauses: QueryClause[];
        orderBys: OrderClause[];
        limits: number[];
    }> = [];

    const createQuerySnapshot = (docs: MockDoc[]) => ({
        docs,
        size: docs.length,
        empty: docs.length === 0,
    });

    const comparableValue = (value: unknown): string | number => {
        if (typeof value === "number") return value;
        if (typeof value === "string") return value;
        if (
            value &&
            typeof value === "object" &&
            "toMillis" in value &&
            typeof (value as { toMillis?: unknown }).toMillis === "function"
        ) {
            return (value as { toMillis: () => number }).toMillis();
        }
        return "";
    };

    const createCollectionRef = (
        name: string,
        clauses: QueryClause[] = [],
        orderBys: OrderClause[] = [],
        limits: number[] = [],
    ) => {
        const applyClauses = (docs: MockDoc[]) => docs.filter((doc) => {
            const raw = doc.data();
            return clauses.every((clause) => {
                if (clause.operator === ">=") {
                    const actual = raw[clause.field];
                    return typeof actual === "number"
                        && typeof clause.value === "number"
                        && actual >= clause.value;
                }

                return true;
            });
        });
        const applyOrderAndLimit = (docs: MockDoc[]) => {
            const ordered = [...docs];
            for (const order of [...orderBys].reverse()) {
                ordered.sort((left, right) => {
                    const leftValue = comparableValue(left.data()[order.field]);
                    const rightValue = comparableValue(right.data()[order.field]);
                    if (leftValue < rightValue) return order.direction === "desc" ? 1 : -1;
                    if (leftValue > rightValue) return order.direction === "desc" ? -1 : 1;
                    return left.id.localeCompare(right.id);
                });
            }

            const limit = limits[limits.length - 1];
            return typeof limit === "number" ? ordered.slice(0, limit) : ordered;
        };

        return {
            where(field: string, operator: string, value: unknown) {
                return createCollectionRef(name, [...clauses, { field, operator, value }], orderBys, limits);
            },
            orderBy(field: string, direction: "asc" | "desc" = "asc") {
                return createCollectionRef(name, clauses, [...orderBys, { field, direction }], limits);
            },
            limit(value: number) {
                return createCollectionRef(name, clauses, orderBys, [...limits, value]);
            },
            doc(id: string) {
                return {
                    get: async () => {
                        const key = `${name}/${id}`;
                        const data = documents.get(key);
                        return {
                            exists: Boolean(data),
                            data: () => data,
                        };
                    },
                };
            },
            async get() {
                queryHistory.push({
                    name,
                    clauses: [...clauses],
                    orderBys: [...orderBys],
                    limits: [...limits],
                });

                return createQuerySnapshot(applyOrderAndLimit(applyClauses(collections.get(name) ?? []))) as FirebaseFirestore.QuerySnapshot;
            },
        };
    };

    return {
        collections,
        documents,
        queryHistory,
        safeRunReport: vi.fn(),
        fetchTelemetryLogs: vi.fn(),
        safeQueryWithDiagnostics: vi.fn(async ({ reader }: { reader: () => Promise<unknown> }) => reader()),
        safeDocumentWithDiagnostics: vi.fn(async ({ reader }: { reader: () => Promise<unknown> }) => reader()),
        adminDb: {
            collection(name: string) {
                return createCollectionRef(name);
            },
        },
        reset() {
            collections.clear();
            documents.clear();
            queryHistory.length = 0;
            this.safeRunReport.mockReset();
            this.fetchTelemetryLogs.mockReset();
            this.safeQueryWithDiagnostics.mockClear();
            this.safeDocumentWithDiagnostics.mockClear();
        },
    };
});

vi.mock("@/lib/server/firebase-admin", () => ({
    adminDb: mockState.adminDb,
}));

vi.mock("@/lib/server/admin-analytics-shared", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/server/admin-analytics-shared")>();
    return {
        ...actual,
        safeRunReport: mockState.safeRunReport,
        fetchTelemetryLogs: mockState.fetchTelemetryLogs,
    };
});

vi.mock("@/lib/server/diagnostic-read-fallbacks", () => ({
    safeQueryWithDiagnostics: mockState.safeQueryWithDiagnostics,
    safeDocumentWithDiagnostics: mockState.safeDocumentWithDiagnostics,
}));

import { fetchAdminHistoricalAnalyticsSources } from "@/lib/server/admin-analytics-data";

describe("fetchAdminHistoricalAnalyticsSources", () => {
    beforeEach(() => {
        mockState.reset();
        mockState.safeRunReport.mockResolvedValue({ rows: [] });
        mockState.fetchTelemetryLogs.mockResolvedValue({});
    });

    it("reads ranged transactions through the numeric timestamp mirror so purchase revenue stays visible", async () => {
        const startMs = Date.now() - 60_000;
        mockState.collections.set("transactions", [
            {
                id: "purchase_1",
                data: () => ({
                    userId: "fan_1",
                    type: "purchase_currency",
                    status: "completed",
                    timestamp: {
                        toMillis: () => startMs + 5_000,
                    },
                    timestampMs: startMs + 5_000,
                    grossRevenueUsd: 5,
                }),
            },
        ]);

        const result = await fetchAdminHistoricalAnalyticsSources({
            analyticsClient: {} as never,
            propertyId: "prop_123",
            startDate: "2026-04-04",
            endDate: "2026-04-04",
            startDayKey: "2026-04-04",
            startMs,
            period: "30d",
            timelineBucket: "day",
        });

        const transactionQuery = mockState.queryHistory.find((entry) => entry.name === "transactions");

        expect(result.transactionsInRangeSnapshot.size).toBe(1);
        expect(transactionQuery).toMatchObject({
            clauses: expect.arrayContaining([
                expect.objectContaining({
                    field: "timestampMs",
                    operator: ">=",
                    value: startMs,
                }),
            ]),
            orderBys: expect.arrayContaining([
                expect.objectContaining({
                    field: "timestampMs",
                    direction: "desc",
                }),
            ]),
        });
    });

    it("reads all-time launch history rollups without requiring modern dayKey fields", async () => {
        const startMs = Date.UTC(2020, 0, 1, 0, 0, 0);
        mockState.collections.set("analytics_page_daily", [
            {
                id: "2024-01-15__home",
                data: () => ({
                    pagePath: "/",
                    viewCount: 9,
                }),
            },
        ]);

        const result = await fetchAdminHistoricalAnalyticsSources({
            analyticsClient: {} as never,
            propertyId: "prop_123",
            startDate: "2020-01-01",
            endDate: "2026-06-17",
            startDayKey: "2020-01-01",
            startMs,
            period: "all",
            timelineBucket: "day",
        });

        const pageRollupQuery = mockState.queryHistory.find((entry) => entry.name === "analytics_page_daily");
        const dailyRollupQuery = mockState.queryHistory.find((entry) => entry.name === "analytics_rollups_daily");

        expect(result.pageRollupsSnapshot.size).toBe(1);
        expect(pageRollupQuery?.clauses.some((clause) => clause.field === "dayKey")).toBe(false);
        expect(pageRollupQuery?.limits).toContain(2_500);
        expect(dailyRollupQuery?.limits).toContain(2_500);
    });

    it("samples all-time launch and recent edges for capped event lanes", async () => {
        const startMs = Date.UTC(2020, 0, 1, 0, 0, 0);
        const launchTimestamp = Date.UTC(2024, 0, 15, 0, 0, 0);
        const recentTimestamp = Date.UTC(2026, 5, 17, 0, 0, 0);
        mockState.collections.set("analytics_event_facts", [
            {
                id: "launch_fact",
                data: () => ({
                    eventName: "home_page_viewed",
                    timestamp: launchTimestamp,
                    deviceCategory: "mobile",
                }),
            },
            {
                id: "recent_fact",
                data: () => ({
                    eventName: "drops_page_viewed",
                    timestamp: recentTimestamp,
                    deviceCategory: "desktop",
                }),
            },
        ]);
        mockState.collections.set("analytics_guest_batches", [
            {
                id: "launch_guest",
                data: () => ({
                    receivedAtMs: launchTimestamp,
                    events: [{ type: "page_view", timestamp: launchTimestamp, path: "/" }],
                }),
            },
            {
                id: "recent_guest",
                data: () => ({
                    receivedAtMs: recentTimestamp,
                    events: [{ type: "page_view", timestamp: recentTimestamp, path: "/drops" }],
                }),
            },
        ]);

        const result = await fetchAdminHistoricalAnalyticsSources({
            analyticsClient: {} as never,
            propertyId: "prop_123",
            startDate: "2020-01-01",
            endDate: "2026-06-17",
            startDayKey: "2020-01-01",
            startMs,
            period: "all",
            timelineBucket: "day",
        });

        const eventFactQueries = mockState.queryHistory.filter((entry) => entry.name === "analytics_event_facts");
        const guestBatchQueries = mockState.queryHistory.filter((entry) => entry.name === "analytics_guest_batches");

        expect(eventFactQueries).toEqual(expect.arrayContaining([
            expect.objectContaining({
                orderBys: [expect.objectContaining({ field: "timestamp", direction: "asc" })],
                limits: [250],
            }),
            expect.objectContaining({
                orderBys: [expect.objectContaining({ field: "timestamp", direction: "desc" })],
                limits: [250],
            }),
        ]));
        expect(guestBatchQueries).toEqual(expect.arrayContaining([
            expect.objectContaining({
                orderBys: [expect.objectContaining({ field: "receivedAtMs", direction: "asc" })],
                limits: [100],
            }),
            expect.objectContaining({
                orderBys: [expect.objectContaining({ field: "receivedAtMs", direction: "desc" })],
                limits: [100],
            }),
        ]));
        expect(result.analyticsEventFactsSnapshot.docs.map((doc) => doc.id)).toEqual(["launch_fact", "recent_fact"]);
        expect(result.guestBatchesSnapshot.docs.map((doc) => doc.id)).toEqual(["launch_guest", "recent_guest"]);
    });
});
