import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type SeedDoc = {
    id: string;
    data: Record<string, unknown>;
};

const mockState = vi.hoisted(() => {
    const collections = new Map<string, SeedDoc[]>();
    const documents = new Map<string, Record<string, unknown>>();

    function getCollectionDocs(name: string) {
        return collections.get(name) ?? [];
    }

    function setDocument(name: string, id: string, value: Record<string, unknown>, merge = false) {
        const existing = documents.get(`${name}/${id}`) ?? {};
        const next = merge ? { ...existing, ...value } : value;
        documents.set(`${name}/${id}`, next);
        collections.set(name, [...getCollectionDocs(name).filter((entry) => entry.id !== id), { id, data: next }]);
    }

    function buildDocRef(name: string, id: string) {
        return {
            id,
            path: `${name}/${id}`,
            async get() {
                return {
                    id,
                    exists: documents.has(`${name}/${id}`),
                    data: () => documents.get(`${name}/${id}`),
                };
            },
            set(value: Record<string, unknown>, options?: { merge?: boolean }) {
                setDocument(name, id, value, options?.merge === true);
            },
            update(value: Record<string, unknown>) {
                setDocument(name, id, value, true);
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
                    .map((entry) => ({ id: entry.id, data: () => entry.data }));
                return { docs, empty: docs.length === 0, size: docs.length };
            },
        };
    }

    return {
        guardApiRequest: vi.fn(),
        handleApiError: vi.fn(),
        buildCreatorAccrual: vi.fn((input: { sourceType: string; sourceId: string }) => ({
            sourceType: input.sourceType,
            sourceId: input.sourceId,
            creatorShareGd: 150,
            cashoutValueUsd: 1.5,
        })),
        buildCreatorExperienceIdempotencyKey: vi.fn((input: { clientKey?: string; action: string; userId: string; creatorId: string }) => input.clientKey || `${input.action}:${input.userId}:${input.creatorId}`),
        buildCreatorExperienceRecordIds: vi.fn((input: { idempotencyKey: string }) => ({
            userTransactionId: `txn_${input.idempotencyKey.replace(/[^a-z0-9_-]/gi, "_")}`,
            creatorAccrualId: `accrual_${input.idempotencyKey.replace(/[^a-z0-9_-]/gi, "_")}`,
            creatorExperienceRecordId: `request_${input.idempotencyKey.replace(/[^a-z0-9_-]/gi, "_")}`,
        })),
        buildCreatorExperienceTelemetryPayload: vi.fn((input: any) => ({
            actorType: input.marker.actorType,
            creator_id: input.creatorId,
            price_gd: input.priceGd,
            idempotency_key: input.idempotencyKey,
            duplicate_prevented: input.duplicatePrevented,
        })),
        buildCreatorExperienceTransactionDebug: vi.fn((input: any) => ({
            userTransactionId: input.userTransactionId,
            creatorAccrualId: input.creatorAccrualId,
            creatorExperienceRecordId: input.creatorExperienceRecordId,
            priceGd: input.priceGd,
            platformShareGd: Math.max(0, input.priceGd - 150),
            creatorShareGd: 150,
            idempotencyKey: input.idempotencyKey,
            duplicatePrevented: input.duplicatePrevented,
            sourceAwareBalanceBefore: input.sourceAwareBalanceBefore ?? null,
            sourceAwareBalanceAfter: input.sourceAwareBalanceAfter ?? null,
        })),
        buildSourceAwareBalancePatch: vi.fn((next: { total: number }) => ({ gumDropsBalance: next.total })),
        readSourceAwareBalance: vi.fn(() => ({ total: 1000, purchased: 1000, reward: 0 })),
        spendCreatorExperienceGumdrops: vi.fn(() => ({ ok: true, next: { total: 700, purchased: 700, reward: 0 }, purchasedSpent: 300, rewardSpent: 0, ledgerSource: "purchased" })),
        buildCompletedGumdropTransaction: vi.fn(() => ({ verifiedServerSide: true })),
        trackServerEvent: vi.fn(),
        adminDb: {
            collection(name: string) {
                return {
                    ...buildQuery(name),
                    doc(id: string) {
                        return buildDocRef(name, id);
                    },
                };
            },
            async runTransaction<T>(handler: (transaction: { get: (ref: ReturnType<typeof buildDocRef>) => Promise<{ exists: boolean; data: () => Record<string, unknown> | undefined }>; update: (ref: ReturnType<typeof buildDocRef>, value: Record<string, unknown>) => void; set: (ref: ReturnType<typeof buildDocRef>, value: Record<string, unknown>, options?: { merge?: boolean }) => void; }) => Promise<T>) {
                return handler({
                    get: async (ref: ReturnType<typeof buildDocRef>) => ref.get(),
                    update: (ref: ReturnType<typeof buildDocRef>, value: Record<string, unknown>) => ref.update(value),
                    set: (ref: ReturnType<typeof buildDocRef>, value: Record<string, unknown>, options?: { merge?: boolean }) => ref.set(value, options),
                });
            },
        },
        documents,
        setDocument,
        reset() {
            collections.clear();
            documents.clear();
            this.guardApiRequest.mockReset();
            this.handleApiError.mockReset();
            this.buildCreatorAccrual.mockClear();
            this.buildCreatorExperienceIdempotencyKey.mockClear();
            this.buildCreatorExperienceRecordIds.mockClear();
            this.buildCreatorExperienceTelemetryPayload.mockClear();
            this.buildCreatorExperienceTransactionDebug.mockClear();
            this.buildSourceAwareBalancePatch.mockClear();
            this.readSourceAwareBalance.mockClear();
            this.spendCreatorExperienceGumdrops.mockClear();
            this.buildCompletedGumdropTransaction.mockClear();
            this.trackServerEvent.mockClear();
        },
    };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/request-guard", () => ({ guardApiRequest: mockState.guardApiRequest }));
vi.mock("@/lib/server/auth", () => ({ handleApiError: mockState.handleApiError }));
vi.mock("@/lib/server/firebase-admin", () => ({ adminDb: mockState.adminDb }));
vi.mock("@/lib/server/rate-limit", () => ({ STANDARD: {} }));
vi.mock("@/lib/server/not-found", () => ({
    buildNotFoundResponse: (_kind: string, message: string) => NextResponse.json({ error: message }, { status: 404 }),
}));
vi.mock("@/lib/server/route-runtime-health", () => ({
    withRouteRuntimeHealth: (_key: string, handler: unknown) => handler,
}));
vi.mock("@/lib/creator-experiences", () => ({
    CREATOR_COLLECTIONS: {
        requests: "creator_custom_requests",
        ledgerAccruals: "creator_ledger_accruals",
    },
    isCreatorRole: (role: unknown) => role === "creator",
}));
vi.mock("@/lib/server/creator-experiences", () => ({
    CREATOR_EXPERIENCE_PAID_EVENTS: {
        custom_request: "creator_custom_request_created",
    },
    buildCreatorAccrual: mockState.buildCreatorAccrual,
    buildCreatorExperienceIdempotencyKey: mockState.buildCreatorExperienceIdempotencyKey,
    buildCreatorExperienceRecordIds: mockState.buildCreatorExperienceRecordIds,
    buildCreatorExperienceTelemetryPayload: mockState.buildCreatorExperienceTelemetryPayload,
    buildCreatorExperienceTransactionDebug: mockState.buildCreatorExperienceTransactionDebug,
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

import { POST } from "@/app/api/creator/requests/route";

describe("creator requests route transaction truth", () => {
    beforeEach(() => {
        mockState.reset();
        mockState.handleApiError.mockImplementation((error: unknown) => NextResponse.json({
            error: error instanceof Error ? error.message : String(error),
        }, { status: 500 }));
        mockState.guardApiRequest.mockResolvedValue({ uid: "fan_1", email: "fan@example.com" });
        mockState.setDocument("users", "fan_1", { role: "user", gumDropsBalance: 1000 });
        mockState.setDocument("users", "creator_1", {
            role: "creator",
            creatorSettings: {
                customRequestsEnabled: true,
                requestCategories: [{ id: "photo", label: "Photo", priceGd: 300, enabled: true }],
            },
        });
    });

    it("creates custom request, user transaction, and creator accrual records", async () => {
        const response = await POST(new NextRequest("http://localhost/api/creator/requests", {
            method: "POST",
            body: JSON.stringify({
                creatorId: "creator_1",
                categoryId: "photo",
                details: "A launch-safe request",
                idempotencyKey: "request-key-1",
            }),
        }));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.duplicatePrevented).toBe(false);
        expect(mockState.documents.get("creator_custom_requests/request_request-key-1")).toMatchObject({
            userTransactionId: "txn_request-key-1",
            creatorAccrualId: "accrual_request-key-1",
            priceGd: 300,
        });
        expect(mockState.documents.get("creator_ledger_accruals/accrual_request-key-1")).toMatchObject({
            sourceType: "custom_request",
            idempotencyKey: "request-key-1",
        });
        expect(mockState.documents.get("transactions/txn_request-key-1")).toMatchObject({
            verifiedServerSide: true,
        });
    });

    it("prevents duplicate custom request charges for the same idempotency key", async () => {
        const payload = {
            creatorId: "creator_1",
            categoryId: "photo",
            details: "A launch-safe request",
            idempotencyKey: "request-key-2",
        };

        await POST(new NextRequest("http://localhost/api/creator/requests", {
            method: "POST",
            body: JSON.stringify(payload),
        }));
        const duplicateResponse = await POST(new NextRequest("http://localhost/api/creator/requests", {
            method: "POST",
            body: JSON.stringify(payload),
        }));
        const duplicateBody = await duplicateResponse.json();

        expect(duplicateResponse.status).toBe(200);
        expect(duplicateBody.duplicatePrevented).toBe(true);
        expect(mockState.spendCreatorExperienceGumdrops).toHaveBeenCalledTimes(1);
        expect(Array.from(mockState.documents.keys()).filter((key) => key.startsWith("transactions/"))).toHaveLength(1);
    });

    it("rejects insufficient balance without writing paid records", async () => {
        mockState.spendCreatorExperienceGumdrops.mockReturnValueOnce({ ok: false, error: "Insufficient purchased balance." } as any);

        const response = await POST(new NextRequest("http://localhost/api/creator/requests", {
            method: "POST",
            body: JSON.stringify({
                creatorId: "creator_1",
                categoryId: "photo",
                details: "A launch-safe request",
                idempotencyKey: "request-key-3",
            }),
        }));
        const body = await response.json();

        expect(response.status).toBe(500);
        expect(body.error).toContain("Insufficient purchased balance");
        expect(Array.from(mockState.documents.keys()).filter((key) => key.startsWith("transactions/"))).toHaveLength(0);
        expect(Array.from(mockState.documents.keys()).filter((key) => key.startsWith("creator_ledger_accruals/"))).toHaveLength(0);
    });
});
