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
    }> = [];

    const createQuerySnapshot = (docs: MockDoc[]) => ({
        docs,
        size: docs.length,
        empty: docs.length === 0,
    });

    const createCollectionRef = (name: string) => {
        const clauses: QueryClause[] = [];
        const orderBys: OrderClause[] = [];

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

        return {
            where(field: string, operator: string, value: unknown) {
                clauses.push({ field, operator, value });
                return this;
            },
            orderBy(field: string, direction: "asc" | "desc" = "asc") {
                orderBys.push({ field, direction });
                return this;
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
                });

                return createQuerySnapshot(applyClauses(collections.get(name) ?? [])) as FirebaseFirestore.QuerySnapshot;
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
});
