import { NextRequest, NextResponse } from "next/server";
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
                    if (clause.operator === "==") {
                        return raw[clause.field] === clause.value;
                    }

                    if (clause.operator === ">=") {
                        const actual = raw[clause.field];
                        return typeof actual === "number"
                            && typeof clause.value === "number"
                            && actual >= clause.value;
                    }

                    if (clause.operator === "in" && Array.isArray(clause.value)) {
                        return clause.value.includes(clause.field === "__name__" ? doc.id : raw[clause.field]);
                    }

                    return true;
                });
            });

            if (order) {
                const activeOrder = order;
                filtered = [...filtered].sort((left, right) => {
                    const leftValue = left.data()[activeOrder.field];
                    const rightValue = right.data()[activeOrder.field];
                    const direction = activeOrder.direction === "desc" ? -1 : 1;
                    return ((Number(leftValue) || 0) - (Number(rightValue) || 0)) * direction;
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
        normalizeDropRecord: vi.fn(),
        applyDropStatus: vi.fn(),
        normalizeTransactionRecord: vi.fn(),
        getTransactionRevenueCents: vi.fn(),
        reset() {
            collections.clear();
            documents.clear();
            this.guardApiRequest.mockReset();
            this.handleApiError.mockReset();
            this.normalizeDropRecord.mockReset();
            this.applyDropStatus.mockReset();
            this.normalizeTransactionRecord.mockReset();
            this.getTransactionRevenueCents.mockReset();
        },
    };
});

vi.mock("@/lib/server/request-guard", () => ({
    guardApiRequest: mockState.guardApiRequest,
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

vi.mock("@/lib/drop-normalizers", () => ({
    normalizeDropRecord: mockState.normalizeDropRecord,
}));

vi.mock("@/lib/drop-status", () => ({
    applyDropStatus: mockState.applyDropStatus,
}));

vi.mock("@/lib/transaction-normalizers", () => ({
    normalizeTransactionRecord: mockState.normalizeTransactionRecord,
    getTransactionRevenueCents: mockState.getTransactionRevenueCents,
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
        mockState.normalizeDropRecord.mockImplementation((data: Record<string, unknown>, id: string) => ({
            id,
            ...data,
        }));
        mockState.applyDropStatus.mockImplementation((drop: Record<string, unknown>) => ({
            ...drop,
            status: drop.status ?? "active",
        }));
        mockState.normalizeTransactionRecord.mockImplementation((data: Record<string, unknown>, id: string) => ({
            id,
            ...data,
        }));
        mockState.getTransactionRevenueCents.mockImplementation((transaction: Record<string, unknown>) =>
            Number(transaction.grossRevenueCents ?? 0),
        );
    });

    it("returns overview payload with usernames without throwing before the user map is built", async () => {
        const nowMs = Date.now();
        mockState.collections.set("users", [
            {
                id: "fan_1",
                data: () => ({
                    username: "fanone",
                }),
            },
        ]);
        mockState.collections.set("drops", [
            {
                id: "drop_1",
                data: () => ({
                    totalUnlocks: 4,
                    status: "active",
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
                    grossRevenueCents: 500,
                    description: "Starter pack",
                }),
            },
            {
                id: "tx_admin",
                data: () => ({
                    userId: "fan_1",
                    type: "admin_adjustment",
                    status: "completed",
                    timestamp: nowMs - 2_000,
                    description: "Manual credit",
                }),
            },
            {
                id: "tx_unlock",
                data: () => ({
                    userId: "fan_1",
                    type: "unlock_content",
                    status: "completed",
                    timestamp: nowMs - 3_000,
                    description: "Unlocked premium drop",
                }),
            },
        ]);

        const request = new NextRequest("http://localhost/api/admin/overview");
        const response = await GET(request);
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.stats.totalUsers).toBe(1);
        expect(payload.recentTransactions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: "tx_purchase",
                    username: "fanone",
                }),
            ]),
        );
        expect(payload.adminActivity).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: "tx_admin",
                    username: "fanone",
                }),
            ]),
        );
        expect(mockState.handleApiError).not.toHaveBeenCalled();
    });
});
