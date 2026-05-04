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
        buildCreatorExperienceIdempotencyKey: vi.fn((input: { clientKey?: string; action: string; userId: string; creatorId: string }) => input.clientKey || `${input.action}:${input.userId}:${input.creatorId}`),
        buildCreatorExperienceRecordIds: vi.fn((input: { idempotencyKey: string }) => ({
            userTransactionId: `txn_${input.idempotencyKey.replace(/[^a-z0-9_-]/gi, "_")}`,
            creatorAccrualId: `accrual_${input.idempotencyKey.replace(/[^a-z0-9_-]/gi, "_")}`,
            creatorExperienceRecordId: `experience_${input.idempotencyKey.replace(/[^a-z0-9_-]/gi, "_")}`,
        })),
        buildCreatorExperienceTelemetryPayload: vi.fn((input: any) => ({
            actorType: input.marker.actorType,
            actor_user_id: input.marker.actorType === "user" ? input.marker.actorUid : "",
            actor_creator_id: input.marker.actorType === "creator" ? input.marker.actorUid : "",
            actor_admin_id: input.marker.actorType === "admin" || input.marker.actorType === "owner_admin" ? input.marker.actorUid : "",
            creator_id: input.creatorId,
            target_creator_id: input.marker.targetCreatorId ?? input.creatorId,
            price_gd: input.priceGd,
            idempotency_key: input.idempotencyKey,
            duplicate_prevented: input.duplicatePrevented,
        })),
        buildCreatorExperienceTransactionDebug: vi.fn((input: any) => ({
            userTransactionId: input.userTransactionId,
            creatorAccrualId: input.creatorAccrualId,
            creatorExperienceRecordId: input.creatorExperienceRecordId,
            priceGd: input.priceGd,
            platformShareGd: Math.max(0, input.priceGd - 250),
            creatorShareGd: 250,
            idempotencyKey: input.idempotencyKey,
            duplicatePrevented: input.duplicatePrevented,
            sourceAwareBalanceBefore: input.sourceAwareBalanceBefore ?? null,
            sourceAwareBalanceAfter: input.sourceAwareBalanceAfter ?? null,
        })),
        buildSourceAwareBalancePatch: vi.fn((next: { total: number; purchased: number; reward: number }) => ({
            gumDropsBalance: next.total,
            gumDropsPurchasedBalance: next.purchased,
            gumDropsRewardBalance: next.reward,
        })),
        readSourceAwareBalance: vi.fn(() => ({ total: 1200, purchased: 1200, reward: 0 })),
        spendCreatorExperienceGumdrops: vi.fn((balance: { total: number; purchased: number; reward: number }, amount: number, policyKey: string) => {
            if (policyKey !== "subscription" || balance.purchased < amount) {
                return { ok: false, error: "Insufficient purchased balance." };
            }

            return {
                ok: true,
                next: { total: balance.total - amount, purchased: balance.purchased - amount, reward: balance.reward },
                purchasedSpent: amount,
                rewardSpent: 0,
                ledgerSource: "purchased",
            };
        }),
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
    CREATOR_EXPERIENCE_PAID_EVENTS: {
        fan_pass: "creator_fan_pass_started",
        private_chat: "creator_private_chat_opened",
        custom_request: "creator_custom_request_created",
        live_time: "creator_live_time_booked",
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
        expect(mockState.spendCreatorExperienceGumdrops).toHaveBeenCalledWith(
            { total: 1200, purchased: 1200, reward: 0 },
            700,
            "subscription",
        );
        expect(mockState.documents.get("creator_subscriptions/fan_1__creator_1")).toMatchObject({
            status: "active",
            creatorId: "creator_1",
            userId: "fan_1",
            userTransactionId: "txn_fan_pass_fan_1_creator_1",
            purchasedOnly: true,
            gracePeriodEndsAt: null,
            renewalFailureCount: 0,
            lastRenewalAttemptAt: null,
            renewalState: "active",
            transactionDebug: {
                paidBalanceBefore: 1200,
                paidBalanceAfter: 500,
                rewardBalanceBefore: 0,
                rewardBalanceAfter: 0,
                purchasedOnly: true,
                source_policy: "creator_subscription_paid_only",
            },
        });
        expect(mockState.trackServerEvent).toHaveBeenCalledWith(
            "creator_fan_pass_started",
            expect.objectContaining({
                actor_user_id: "fan_1",
                actor_creator_id: "",
                target_creator_id: "creator_1",
                creator_id: "creator_1",
            }),
            "fan_1",
        );
    });

    it("allows paid-pack bonus when it is credited into purchased balance", async () => {
        mockState.guardApiRequest.mockResolvedValue({ uid: "fan_1" });
        mockState.setDocument("users", "fan_1", {
            role: "user",
            gumDropsBalance: 550,
            gumDropsPurchasedBalance: 550,
            gumDropsRewardBalance: 0,
        });
        mockState.setDocument("users", "creator_1", {
            role: "creator",
            displayName: "Creator One",
            creatorSettings: { subscriptionPriceGd: 550, subscriptionsEnabled: true },
        });
        mockState.readSourceAwareBalance.mockReturnValueOnce({ total: 550, purchased: 550, reward: 0 });

        const response = await POST(new NextRequest("http://localhost/api/creator/subscriptions", {
            method: "POST",
            body: JSON.stringify({
                creatorId: "creator_1",
                action: "subscribe",
                idempotencyKey: "fan-pass-paid-bonus",
            }),
        }));

        expect(response.status).toBe(200);
        expect(mockState.spendCreatorExperienceGumdrops).toHaveBeenCalledWith(
            { total: 550, purchased: 550, reward: 0 },
            550,
            "subscription",
        );
        expect(mockState.documents.get("creator_subscriptions/fan_1__creator_1")).toMatchObject({
            status: "active",
            priceGd: 550,
            purchasedOnly: true,
        });
    });

    it("prevents duplicate fan pass charges for the same idempotency key", async () => {
        mockState.guardApiRequest.mockResolvedValue({ uid: "fan_1" });
        mockState.setDocument("users", "fan_1", { role: "user", gumDropsBalance: 1200 });
        mockState.setDocument("users", "creator_1", {
            role: "creator",
            displayName: "Creator One",
            creatorSettings: { subscriptionPriceGd: 700, subscriptionsEnabled: true },
        });

        const requestBody = {
            creatorId: "creator_1",
            action: "subscribe",
            idempotencyKey: "fan-pass-key-1",
        };
        const firstResponse = await POST(new NextRequest("http://localhost/api/creator/subscriptions", {
            method: "POST",
            body: JSON.stringify(requestBody),
        }));
        const secondResponse = await POST(new NextRequest("http://localhost/api/creator/subscriptions", {
            method: "POST",
            body: JSON.stringify(requestBody),
        }));
        const secondBody = await secondResponse.json();

        expect(firstResponse.status).toBe(200);
        expect(secondResponse.status).toBe(200);
        expect(secondBody.duplicatePrevented).toBe(true);
        expect(mockState.spendCreatorExperienceGumdrops).toHaveBeenCalledTimes(1);
        expect(Array.from(mockState.documents.keys()).filter((key) => key.startsWith("transactions/"))).toHaveLength(1);
        expect(Array.from(mockState.documents.keys()).filter((key) => key.startsWith("creator_ledger_accruals/"))).toHaveLength(1);
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
        expect(mockState.spendCreatorExperienceGumdrops).not.toHaveBeenCalled();
        expect(Array.from(mockState.documents.keys()).filter((key) => key.startsWith("transactions/"))).toHaveLength(0);
        expect(mockState.documents.get("creator_subscriptions/fan_1__creator_1")).toMatchObject({
            status: "canceled",
            autoRenew: false,
        });
    });

    it("starts a new paid Fan Pass after a canceled subscription", async () => {
        mockState.guardApiRequest.mockResolvedValue({ uid: "fan_1" });
        mockState.setDocument("users", "fan_1", { role: "user", gumDropsBalance: 1200 });
        mockState.setDocument("users", "creator_1", {
            role: "creator",
            displayName: "Creator One",
            creatorSettings: { subscriptionPriceGd: 700, subscriptionsEnabled: true },
        });
        mockState.setDocument("creator_subscriptions", "fan_1__creator_1", {
            status: "canceled",
            creatorId: "creator_1",
            userId: "fan_1",
            autoRenew: false,
        });

        const response = await POST(new NextRequest("http://localhost/api/creator/subscriptions", {
            method: "POST",
            body: JSON.stringify({
                creatorId: "creator_1",
                action: "subscribe",
                idempotencyKey: "fan-pass-restart",
            }),
        }));

        expect(response.status).toBe(200);
        expect(mockState.spendCreatorExperienceGumdrops).toHaveBeenCalledTimes(1);
        expect(mockState.documents.get("creator_subscriptions/fan_1__creator_1")).toMatchObject({
            status: "active",
            autoRenew: true,
            userTransactionId: "txn_fan-pass-restart",
        });
        expect(Array.from(mockState.documents.keys()).filter((key) => key.startsWith("transactions/"))).toHaveLength(1);
    });

    it("returns typed unavailable errors for blocked or restricted creators", async () => {
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

        expect(response.status).toBe(409);
        expect(body.code).toBe("subscriptions_unavailable");
        expect(body.message).toBe("Fan Pass is not available for this creator right now.");
    });

    it("returns typed unavailable errors for unavailable creators", async () => {
        mockState.guardApiRequest.mockResolvedValue({ uid: "fan_1" });
        mockState.setDocument("users", "fan_1", { role: "user" });
        mockState.setDocument("users", "creator_1", {
            role: "creator",
            status: "banned",
            creatorSettings: { subscriptionPriceGd: 900, subscriptionsEnabled: true },
        });

        const response = await POST(new NextRequest("http://localhost/api/creator/subscriptions", {
            method: "POST",
            body: JSON.stringify({ creatorId: "creator_1", action: "subscribe" }),
        }));
        const body = await response.json();

        expect(response.status).toBe(403);
        expect(body.code).toBe("creator_unavailable");
    });

    it("returns typed insufficient paid GumDrops when reward balance alone cannot start Fan Pass", async () => {
        mockState.guardApiRequest.mockResolvedValue({ uid: "fan_1" });
        mockState.setDocument("users", "fan_1", {
            role: "user",
            gumDropsBalance: 900,
            gumDropsPurchasedBalance: 0,
            gumDropsRewardBalance: 900,
        });
        mockState.setDocument("users", "creator_1", {
            role: "creator",
            creatorSettings: { subscriptionPriceGd: 900, subscriptionsEnabled: true },
        });
        mockState.readSourceAwareBalance.mockReturnValueOnce({ total: 900, purchased: 0, reward: 900 });

        const response = await POST(new NextRequest("http://localhost/api/creator/subscriptions", {
            method: "POST",
            body: JSON.stringify({ creatorId: "creator_1", action: "subscribe" }),
        }));
        const body = await response.json();

        expect(response.status).toBe(402);
        expect(body).toMatchObject({
            code: "insufficient_paid_gumdrops",
            priceGd: 900,
            paidBalanceGd: 0,
            shortfallGd: 900,
            creatorId: "creator_1",
            action: "subscribe",
        });
        expect(Array.from(mockState.documents.keys()).filter((key) => key.startsWith("transactions/"))).toHaveLength(0);
        expect(Array.from(mockState.documents.keys()).filter((key) => key.startsWith("creator_ledger_accruals/"))).toHaveLength(0);
    });

    it("returns typed invalid and not-found subscription errors", async () => {
        mockState.guardApiRequest.mockResolvedValue({ uid: "fan_1" });
        const invalidResponse = await POST(new NextRequest("http://localhost/api/creator/subscriptions", {
            method: "POST",
            body: JSON.stringify({ creatorId: "", action: "subscribe" }),
        }));
        const invalidBody = await invalidResponse.json();
        expect(invalidResponse.status).toBe(400);
        expect(invalidBody.code).toBe("invalid_subscription_request");

        mockState.setDocument("users", "fan_1", { role: "user" });
        const missingResponse = await POST(new NextRequest("http://localhost/api/creator/subscriptions", {
            method: "POST",
            body: JSON.stringify({ creatorId: "creator_missing", action: "subscribe" }),
        }));
        const missingBody = await missingResponse.json();
        expect(missingResponse.status).toBe(404);
        expect(missingBody.code).toBe("creator_or_user_not_found");
    });
});
