import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type SeedDoc = {
    id: string;
    data: Record<string, unknown>;
};

const mockState = vi.hoisted(() => {
    const collections = new Map<string, SeedDoc[]>();
    const documents = new Map<string, Record<string, unknown>>();
    let generatedIdCounter = 0;

    function getCollectionDocs(name: string) {
        return collections.get(name) ?? [];
    }

    function setDocument(name: string, id: string, value: Record<string, unknown>, merge = false) {
        const existing = documents.get(`${name}/${id}`) ?? {};
        const next = merge ? { ...existing, ...value } : value;
        documents.set(`${name}/${id}`, next);

        const collectionEntries = getCollectionDocs(name).filter((entry) => entry.id !== id);
        collectionEntries.push({ id, data: next });
        collections.set(name, collectionEntries);
    }

    function buildDocRef(name: string, id?: string) {
        const resolvedId = id ?? `${name}_generated_${++generatedIdCounter}`;
        return {
            id: resolvedId,
            path: `${name}/${resolvedId}`,
            async get() {
                return {
                    id: resolvedId,
                    exists: documents.has(`${name}/${resolvedId}`),
                    data: () => documents.get(`${name}/${resolvedId}`),
                };
            },
            set(value: Record<string, unknown>, options?: { merge?: boolean }) {
                setDocument(name, resolvedId, value, options?.merge === true);
            },
            update(value: Record<string, unknown>) {
                setDocument(name, resolvedId, value, true);
            },
        };
    }

    function buildQuery(name: string, filters: Array<{ field: string; value: unknown }> = []) {
        return {
            where(field: string, _operator: string, value: unknown) {
                return buildQuery(name, [...filters, { field, value }]);
            },
            doc(id: string) {
                return buildDocRef(name, id);
            },
            async get() {
                const docs = getCollectionDocs(name)
                    .filter((entry) => filters.every((filter) => entry.data[filter.field] === filter.value))
                    .map((entry) => ({
                        id: entry.id,
                        data: () => entry.data,
                    }));

                return {
                    docs,
                    empty: docs.length === 0,
                    size: docs.length,
                };
            },
        };
    }

    return {
        guardApiRequest: vi.fn(),
        handleApiError: vi.fn(),
        buildCreatorAccrual: vi.fn(() => ({ creatorShareGd: 250, cashoutValueUsd: 2.5 })),
        buildSourceAwareBalancePatch: vi.fn(() => ({ gumDropsBalance: 500 })),
        readSourceAwareBalance: vi.fn(() => ({ total: 1200 })),
        spendCreatorExperienceGumdrops: vi.fn(() => ({ ok: true, next: { total: 700 }, purchasedSpent: 500, rewardSpent: 0, ledgerSource: "purchased" })),
        buildCompletedGumdropTransaction: vi.fn(() => ({ id: "txn" })),
        trackServerEvent: vi.fn(),
        adminDb: {
            collection(name: string) {
                return {
                    ...buildQuery(name),
                    doc(id?: string) {
                        return buildDocRef(name, id);
                    },
                };
            },
            async runTransaction<T>(handler: (transaction: { get: (ref: ReturnType<typeof buildDocRef>) => Promise<{ exists: boolean; data: () => Record<string, unknown> | undefined }>; update: (ref: ReturnType<typeof buildDocRef>, value: Record<string, unknown>) => void; set: (ref: ReturnType<typeof buildDocRef>, value: Record<string, unknown>, options?: { merge?: boolean }) => void; }) => Promise<T>) {
                const transaction = {
                    get: async (ref: ReturnType<typeof buildDocRef>) => ref.get(),
                    update: (ref: ReturnType<typeof buildDocRef>, value: Record<string, unknown>) => ref.update(value),
                    set: (ref: ReturnType<typeof buildDocRef>, value: Record<string, unknown>, options?: { merge?: boolean }) => ref.set(value, options),
                };
                return handler(transaction);
            },
        },
        collections,
        documents,
        setDocument,
        reset() {
            collections.clear();
            documents.clear();
            generatedIdCounter = 0;
            this.guardApiRequest.mockReset();
            this.handleApiError.mockReset();
            this.buildCreatorAccrual.mockClear();
            this.buildSourceAwareBalancePatch.mockClear();
            this.readSourceAwareBalance.mockClear();
            this.spendCreatorExperienceGumdrops.mockClear();
            this.buildCompletedGumdropTransaction.mockClear();
            this.trackServerEvent.mockClear();
        },
    };
});

vi.mock("server-only", () => ({}));
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
    STANDARD: {},
}));
vi.mock("@/lib/creator-experiences", () => ({
    CREATOR_SUBSCRIPTION_MIN_GD: 500,
    CREATOR_COLLECTIONS: {
        subscriptions: "creator_subscriptions",
        ledgerAccruals: "creator_ledger_accruals",
    },
    isCreatorRole: (role: unknown) => role === "creator",
    isCreatorOrAdminRole: (role: unknown) => role === "creator" || role === "admin",
}));
vi.mock("@/lib/server/creator-experiences", () => ({
    buildCreatorAccrual: mockState.buildCreatorAccrual,
    buildSourceAwareBalancePatch: mockState.buildSourceAwareBalancePatch,
    readSourceAwareBalance: mockState.readSourceAwareBalance,
    spendCreatorExperienceGumdrops: mockState.spendCreatorExperienceGumdrops,
}));
vi.mock("@/lib/server/gumdrop-ledger", () => ({
    buildCompletedGumdropTransaction: mockState.buildCompletedGumdropTransaction,
}));
vi.mock("@/lib/server/analytics", () => ({
    trackServerEvent: mockState.trackServerEvent,
}));

import { GET, POST } from "@/app/api/creator/subscriptions/route";

describe("creator subscriptions route", () => {
    beforeEach(() => {
        mockState.reset();
        mockState.handleApiError.mockImplementation((error: unknown) => NextResponse.json({
            error: error instanceof Error ? error.message : String(error),
        }, { status: 500 }));
    });

    it("returns the caller subscription state for creatorId lookups", async () => {
        mockState.guardApiRequest.mockResolvedValue({ uid: "fan_1" });
        mockState.setDocument("creator_subscriptions", "fan_1__creator_1", { status: "active", creatorId: "creator_1", userId: "fan_1" });

        const response = await GET(new NextRequest("http://localhost/api/creator/subscriptions?creatorId=creator_1"));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.subscription).toMatchObject({ id: "fan_1__creator_1", status: "active" });
    });

    it("returns subscribers only for creator or admin callers", async () => {
        mockState.guardApiRequest.mockResolvedValue({ uid: "creator_1" });
        mockState.setDocument("users", "creator_1", { role: "creator" });
        mockState.collections.set("creator_subscriptions", [
            { id: "fan_1__creator_1", data: { creatorId: "creator_1", userId: "fan_1", status: "active" } },
            { id: "creator_1__creator_2", data: { creatorId: "creator_2", userId: "creator_1", status: "active" } },
        ]);

        const creatorResponse = await GET(new NextRequest("http://localhost/api/creator/subscriptions"));
        const creatorBody = await creatorResponse.json();
        expect(creatorBody.subscribers).toHaveLength(1);

        mockState.guardApiRequest.mockResolvedValue({ uid: "fan_1" });
        mockState.setDocument("users", "fan_1", { role: "user" });
        const fanResponse = await GET(new NextRequest("http://localhost/api/creator/subscriptions"));
        const fanBody = await fanResponse.json();
        expect(fanBody.subscribers).toEqual([]);
    });

    it("subscribes successfully when the creator is eligible and balance is sufficient", async () => {
        mockState.guardApiRequest.mockResolvedValue({ uid: "fan_1" });
        mockState.setDocument("users", "fan_1", { role: "user", gumDropsBalance: 1200 });
        mockState.setDocument("users", "creator_1", {
            role: "creator",
            displayName: "Creator One",
            creatorSettings: { subscriptionPriceGd: 700, subscriptionsEnabled: true },
        });

        const response = await POST(new NextRequest("http://localhost/api/creator/subscriptions", {
            method: "POST",
            body: JSON.stringify({ creatorId: "creator_1", action: "subscribe" }),
        }));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.action).toBe("subscribe");
        expect(mockState.documents.get("creator_subscriptions/fan_1__creator_1")).toMatchObject({
            status: "active",
            creatorId: "creator_1",
            userId: "fan_1",
        });
    });

    it("cancels an existing subscription successfully", async () => {
        mockState.guardApiRequest.mockResolvedValue({ uid: "fan_1" });
        mockState.setDocument("users", "fan_1", { role: "user" });
        mockState.setDocument("users", "creator_1", { role: "creator", creatorSettings: { subscriptionsEnabled: true } });
        mockState.setDocument("creator_subscriptions", "fan_1__creator_1", {
            status: "active",
            creatorId: "creator_1",
            userId: "fan_1",
            autoRenew: true,
        });

        const response = await POST(new NextRequest("http://localhost/api/creator/subscriptions", {
            method: "POST",
            body: JSON.stringify({ creatorId: "creator_1", action: "cancel" }),
        }));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.action).toBe("cancel");
        expect(mockState.documents.get("creator_subscriptions/fan_1__creator_1")).toMatchObject({
            status: "canceled",
            autoRenew: false,
        });
    });

    it("rejects blocked or restricted creators", async () => {
        mockState.guardApiRequest.mockResolvedValue({ uid: "fan_1" });
        mockState.setDocument("users", "fan_1", { role: "user" });
        mockState.setDocument("users", "creator_1", {
            role: "creator",
            creatorSettings: { subscriptionsEnabled: false },
            creatorRestrictions: { subscriptionsRestricted: true },
        });

        const response = await POST(new NextRequest("http://localhost/api/creator/subscriptions", {
            method: "POST",
            body: JSON.stringify({ creatorId: "creator_1", action: "subscribe" }),
        }));
        const body = await response.json();

        expect(response.status).toBe(500);
        expect(body.error).toContain("Subscriptions are unavailable");
    });

    it("rejects subscribe when purchased balance is insufficient", async () => {
        mockState.guardApiRequest.mockResolvedValue({ uid: "fan_1" });
        mockState.setDocument("users", "fan_1", { role: "user" });
        mockState.setDocument("users", "creator_1", {
            role: "creator",
            creatorSettings: { subscriptionPriceGd: 900, subscriptionsEnabled: true },
        });
        mockState.spendCreatorExperienceGumdrops.mockReturnValueOnce({ ok: false, error: "Insufficient purchased balance." } as any);

        const response = await POST(new NextRequest("http://localhost/api/creator/subscriptions", {
            method: "POST",
            body: JSON.stringify({ creatorId: "creator_1", action: "subscribe" }),
        }));
        const body = await response.json();

        expect(response.status).toBe(500);
        expect(body.error).toContain("Insufficient purchased balance");
    });
});
