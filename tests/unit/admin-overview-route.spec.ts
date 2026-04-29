import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getCSTDateKey, shiftCSTDateKey } from "@/lib/timezone";

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

function toSortableValue(value: unknown) {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    if (
        value
        && typeof value === "object"
        && "toMillis" in value
        && typeof (value as { toMillis: () => number }).toMillis === "function"
    ) {
        return (value as { toMillis: () => number }).toMillis();
    }

    if (typeof value === "string") {
        return value;
    }

    return 0;
}

const mockState = vi.hoisted(() => {
    const collections = new Map<string, MockDoc[]>();
    const documents = new Map<string, Record<string, unknown>>();

    const createQuerySnapshot = (docs: MockDoc[]) => ({
        docs,
        size: docs.length,
        empty: docs.length === 0,
    });

    const createCollectionRef = (name: string) => {
        const clauses: QueryClause[] = [];
        let order: OrderClause | null = null;
        let limitCount: number | null = null;

        const applyClauses = (docs: MockDoc[]) => {
            let filtered = docs.filter((doc) => {
                const raw = doc.data();

                return clauses.every((clause) => {
                    const actual = clause.field === "__name__" ? doc.id : raw[clause.field];

                    if (clause.operator === "==") {
                        return actual === clause.value;
                    }

                    if (clause.operator === ">=") {
                        const actualValue = toSortableValue(actual);
                        const clauseValue = toSortableValue(clause.value);
                        return actualValue >= clauseValue;
                    }

                    if (clause.operator === "in" && Array.isArray(clause.value)) {
                        return clause.value.includes(actual);
                    }

                    return true;
                });
            });

            if (order) {
                const activeOrder = order;
                filtered = [...filtered].sort((left, right) => {
                    const leftValue = toSortableValue(left.data()[activeOrder.field]);
                    const rightValue = toSortableValue(right.data()[activeOrder.field]);
                    const comparison = leftValue > rightValue ? 1 : leftValue < rightValue ? -1 : 0;
                    return activeOrder.direction === "desc" ? comparison * -1 : comparison;
                });
            }

            if (typeof limitCount === "number") {
                filtered = filtered.slice(0, limitCount);
            }

            return filtered;
        };

        return {
            where(field: string, operator: string, value: unknown) {
                clauses.push({ field, operator, value });
                return this;
            },
            orderBy(field: string, direction: "asc" | "desc" = "asc") {
                order = { field, direction };
                return this;
            },
            limit(value: number) {
                limitCount = value;
                return this;
            },
            count() {
                return {
                    get: async () => ({
                        data: () => ({ count: (collections.get(name) ?? []).length }),
                    }),
                };
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
                return createQuerySnapshot(applyClauses(collections.get(name) ?? [])) as FirebaseFirestore.QuerySnapshot;
            },
        };
    };

    return {
        collections,
        documents,
        adminDb: {
            collection(name: string) {
                return createCollectionRef(name);
            },
        },
        guardApiRequest: vi.fn(),
        handleApiError: vi.fn(),
        recordRouteRuntimeSample: vi.fn(),
        normalizeDrop: vi.fn(),
        isDropHidden: vi.fn(),
        buildUserMap: vi.fn(),
        fetchTelemetryLogs: vi.fn(),
        reset() {
            collections.clear();
            documents.clear();
            this.guardApiRequest.mockReset();
            this.handleApiError.mockReset();
            this.recordRouteRuntimeSample.mockReset();
            this.normalizeDrop.mockReset();
            this.isDropHidden.mockReset();
            this.buildUserMap.mockReset();
            this.fetchTelemetryLogs.mockReset();
        },
    };
});

vi.mock("@/lib/server/request-guard", () => ({
    guardApiRequest: mockState.guardApiRequest,
}));
vi.mock("@/lib/server/route-runtime-health", () => ({
    recordRouteRuntimeSample: mockState.recordRouteRuntimeSample,
    withRouteRuntimeHealth: (_key: string, handler: unknown) => handler,
}));

vi.mock("@/lib/server/auth", () => ({
    handleApiError: mockState.handleApiError,
}));

vi.mock("@/lib/server/firebase-admin", () => ({
    adminDb: mockState.adminDb,
}));

vi.mock("@/lib/server/rate-limit", () => ({
    ADMIN: {},
    HEAVY_READ: {},
}));

vi.mock("@/lib/server/diagnostic-read-fallbacks", () => ({
    safeQueryWithDiagnostics: async <T,>({ reader }: { reader: () => Promise<T> }) => reader(),
    safeDocumentWithDiagnostics: async <T,>({ reader }: { reader: () => Promise<T> }) => reader(),
    safeCountWithDiagnostics: async <T,>({ reader }: { reader: () => Promise<T> }) => reader(),
}));

vi.mock("@/lib/drop-read-models", () => ({
    normalizeAndApplyDropStatusOrNull: mockState.normalizeDrop,
    isDropHiddenFromPublic: mockState.isDropHidden,
}));

vi.mock("@/lib/server/admin-overview-users", () => ({
    buildAdminOverviewUserNameMap: mockState.buildUserMap,
}));

vi.mock("@/lib/server/admin-analytics-shared", () => ({
    fetchTelemetryLogs: mockState.fetchTelemetryLogs,
}));

import { GET } from "@/app/api/admin/overview/route";

describe("GET /api/admin/overview", () => {
    beforeEach(() => {
        mockState.reset();
        mockState.guardApiRequest.mockResolvedValue({
            uid: "admin_1",
            role: "admin",
        });
        mockState.handleApiError.mockImplementation((error: unknown) => NextResponse.json({
            error: error instanceof Error ? error.message : String(error),
        }, { status: 500 }));
        mockState.normalizeDrop.mockImplementation((data: Record<string, unknown>, id: string) => ({
            id,
            ...data,
        }));
        mockState.isDropHidden.mockReturnValue(false);
        mockState.buildUserMap.mockImplementation(async ({ userIds }: { userIds: Iterable<string> }) => {
            const map = new Map<string, string>();
            Array.from(userIds).forEach((userId) => {
                if (userId === "fan_1") {
                    map.set(userId, "fanone");
                }
                if (userId === "fan_2") {
                    map.set(userId, "fantwo");
                }
                if (userId === "admin_1") {
                    map.set(userId, "adminone");
                }
            });
            return map;
        });
        mockState.fetchTelemetryLogs.mockResolvedValue({});
    });

    it("returns merged overview stats, truthful deltas, and an admin-only mixed activity feed", async () => {
        const nowMs = Date.now();
        const todayKey = getCSTDateKey(nowMs);
        const currentDayKey = shiftCSTDateKey(todayKey, -1);
        const previousDayKey = shiftCSTDateKey(todayKey, -31);

        mockState.collections.set("users", [
            {
                id: "fan_1",
                data: () => ({
                    username: "fanone",
                    createdAt: nowMs - 2 * 24 * 60 * 60 * 1000,
                }),
            },
            {
                id: "fan_2",
                data: () => ({
                    username: "fantwo",
                    createdAt: nowMs - 35 * 24 * 60 * 60 * 1000,
                }),
            },
        ]);
        mockState.collections.set("drops", [
            {
                id: "drop_1",
                data: () => ({
                    title: "Sour Burst",
                    status: "active",
                    totalUnlocks: 7,
                    totalClicks: 11,
                    unlockCost: 20,
                }),
            },
            {
                id: "drop_2",
                data: () => ({
                    title: "Cherry Pop",
                    status: "scheduled",
                    totalUnlocks: 3,
                    totalClicks: 5,
                    unlockCost: 15,
                }),
            },
        ]);
        mockState.collections.set("transactions", [
            {
                id: "tx_purchase",
                data: () => ({
                    userId: "fan_1",
                    type: "purchase_currency",
                    status: "completed",
                    timestamp: nowMs - 1_000,
                    timestampMs: nowMs - 1_000,
                    grossRevenueCents: 800,
                    description: "Starter pack",
                }),
            },
            {
                id: "tx_unlock",
                data: () => ({
                    userId: "fan_1",
                    type: "unlock_content",
                    status: "completed",
                    timestamp: nowMs - 2_000,
                    timestampMs: nowMs - 2_000,
                    amount: -20,
                    relatedDropId: "drop_1",
                    description: "Unlocked premium drop",
                }),
            },
            {
                id: "tx_admin",
                data: () => ({
                    userId: "fan_2",
                    type: "admin_adjustment",
                    status: "completed",
                    timestamp: nowMs - 3_000,
                    timestampMs: nowMs - 3_000,
                    amount: 25,
                    description: "Admin Adjustment: goodwill",
                    adjustedBy: "owner@example.com",
                }),
            },
        ]);
        mockState.collections.set("analytics_commerce_daily", [
            {
                id: `${currentDayKey}_commerce`,
                data: () => ({
                    dayKey: currentDayKey,
                    revenueCentsTotal: 1200,
                    unlockCount: 9,
                    purchaseCount: 5,
                }),
            },
            {
                id: `${previousDayKey}_commerce`,
                data: () => ({
                    dayKey: previousDayKey,
                    revenueCentsTotal: 600,
                    unlockCount: 4,
                    purchaseCount: 2,
                }),
            },
        ]);
        mockState.collections.set("analytics_drop_daily", [
            {
                id: `${currentDayKey}_drop_1`,
                data: () => ({
                    dayKey: currentDayKey,
                    dropId: "drop_1",
                    unlockTransactionCount: 7,
                }),
            },
        ]);
        mockState.documents.set("analytics_commerce_rollup/summary", {
            grossRevenueUsdTotal: 120.5,
            unlockCount: 44,
            lastTransactionAt: nowMs - 1_000,
        });
        mockState.fetchTelemetryLogs.mockResolvedValue({
            admin_dashboard_viewed: [
                {
                    eventName: "admin_dashboard_viewed",
                    params: { page_path: "/admin" },
                    userId: "admin_1",
                    username: "adminone",
                    timestamp: nowMs - 1_500,
                },
            ],
            creator_legal_sent: [
                {
                    eventName: "creator_legal_sent",
                    params: { destination: "/admin/roster" },
                    userId: "admin_1",
                    username: "adminone",
                    timestamp: nowMs - 1_250,
                },
            ],
        });

        const response = await GET(new NextRequest("http://localhost/api/admin/overview"));
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.verification.module).toBe("admin_overview");
        expect(payload.verification.status).toBe("live");
        expect(payload.stats.totalUsers).toBe(2);
        expect(payload.stats.liveDrops).toBe(1);
        expect(payload.stats.grossRevenueCents).toBe(12050);
        expect(payload.stats.totalUnwraps).toBe(44);
        expect(payload.stats.currentWindowPurchases).toBe(5);
        expect(payload.deltas.purchases.current).toBe(5);
        expect(payload.deltas.purchases.previous).toBe(2);
        expect(payload.recentTransactions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: "tx_purchase",
                    username: "fanone",
                    sourceScope: "overview_snapshot",
                }),
            ]),
        );
        expect(payload.adminActivity).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: "tx_admin",
                    source: "transactions",
                    domain: "admin",
                    actorLabel: "owner@example.com",
                }),
                expect.objectContaining({
                    source: "analytics_event_facts",
                    domain: "admin",
                    label: "Admin dashboard viewed",
                }),
                expect.objectContaining({
                    source: "analytics_event_facts",
                    domain: "admin",
                    label: "Creator legal sent",
                }),
            ]),
        );
        expect(payload.trendSummary.topUnlockDrop).toEqual({
            dropId: "drop_1",
            title: "Sour Burst",
            unwraps: 7,
        });
        expect(payload.truthNotes.adminActivity).toContain("admin balance adjustments");
        expect(mockState.handleApiError).not.toHaveBeenCalled();
    });

    it("falls back honestly when the lifetime commerce summary is unavailable", async () => {
        const nowMs = Date.now();
        const todayKey = getCSTDateKey(nowMs);
        const currentDayKey = shiftCSTDateKey(todayKey, -1);

        mockState.collections.set("users", [
            {
                id: "fan_1",
                data: () => ({
                    username: "fanone",
                    createdAt: nowMs - 2 * 24 * 60 * 60 * 1000,
                }),
            },
        ]);
        mockState.collections.set("drops", [
            {
                id: "drop_1",
                data: () => ({
                    title: "Sour Burst",
                    status: "active",
                    totalUnlocks: 9,
                    totalClicks: 4,
                    unlockCost: 20,
                }),
            },
        ]);
        mockState.collections.set("transactions", []);
        mockState.collections.set("analytics_commerce_daily", [
            {
                id: `${currentDayKey}_commerce`,
                data: () => ({
                    dayKey: currentDayKey,
                    revenueCentsTotal: 500,
                    unlockCount: 3,
                    purchaseCount: 1,
                }),
            },
        ]);
        mockState.collections.set("analytics_drop_daily", []);

        const response = await GET(new NextRequest("http://localhost/api/admin/overview"));
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.verification.status).toBe("live");
        expect(payload.stats.grossRevenueCents).toBe(500);
        expect(payload.stats.totalUnwraps).toBe(9);
        expect(payload.deltas.accounts.percentChange).toBeNull();
        expect(payload.truthNotes.platformPulse).toContain("scoped");
        expect(payload.adminActivity).toEqual([]);
    });
});
