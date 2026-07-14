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
            limit() {
                return buildQuery(name, filters);
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
        buildCreatorExperienceAttribution: vi.fn((input: any) => ({
            ...input,
            creatorShareGd: 250,
            platformShareGd: Math.max(0, input.grossSpendGd - 250),
            cashoutValueUsd: 2.5,
            paidSourceRequired: true,
            attributionTruth: "creator_experience_paid_source",
        })),
        buildCreatorExperienceTransactionAttributionExtra: vi.fn((attribution: any) => ({
            purchasedAmountSpent: attribution.purchasedAmountSpent,
            rewardAmountSpent: attribution.rewardAmountSpent,
            ledgerSource: "purchased",
            source_policy: "creator_experience_paid_only",
            creatorId: attribution.creatorId,
            userId: attribution.userId,
            userTransactionId: attribution.userTransactionId,
            creatorAccrualId: attribution.creatorAccrualId,
            creatorExperienceRecordId: attribution.creatorExperienceRecordId,
            creatorShareGd: attribution.creatorShareGd,
            cashoutValueUsd: attribution.cashoutValueUsd,
            platformShareGd: attribution.platformShareGd,
            creatorAttribution: attribution,
            attributionTruth: attribution.attributionTruth,
            sourceAwareBalanceBefore: attribution.sourceAwareBalanceBefore,
            sourceAwareBalanceAfter: attribution.sourceAwareBalanceAfter,
            paidSourceRequired: true,
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
        readPaidSourceBalanceForRestrictedSpend: vi.fn((source: { gumDropsBalance?: unknown; gumDropsPurchasedBalance?: unknown; gumDropsRewardBalance?: unknown }) => {
            const total = typeof source.gumDropsBalance === "number" && Number.isFinite(source.gumDropsBalance) ? source.gumDropsBalance : 0;
            if (typeof source.gumDropsPurchasedBalance !== "number" || !Number.isFinite(source.gumDropsPurchasedBalance)) {
                return { balance: { total, purchased: 0, reward: 0 }, sourceState: "legacy_total_only", paidSourceEligible: false };
            }

            return {
                balance: {
                    total,
                    purchased: source.gumDropsPurchasedBalance,
                    reward: typeof source.gumDropsRewardBalance === "number" && Number.isFinite(source.gumDropsRewardBalance) ? source.gumDropsRewardBalance : Math.max(0, total - source.gumDropsPurchasedBalance),
                },
                sourceState: "explicit_paid_source",
                paidSourceEligible: true,
            };
        }),
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
        buildCompletedGumdropTransaction: vi.fn((input: Record<string, any>) => ({
            ...input,
            ...input.extra,
            status: "completed",
            verifiedServerSide: true,
        })),
        trackServerEvent: vi.fn<(
            eventName: string,
            payload: Record<string, unknown>,
            actorId?: string,
        ) => Promise<void>>(() => Promise.resolve()),
        adminDb: {
            collection(name: string) {
                return {
                    ...buildQuery(name),
                    doc(id?: string) {
                        return buildDocRef(name, id);
                    },
                };
            },
            async getAll(...refs: Array<ReturnType<typeof buildDocRef>>) {
                return Promise.all(refs.map((ref) => ref.get()));
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
            this.buildCreatorExperienceAttribution.mockClear();
            this.buildCreatorExperienceTransactionAttributionExtra.mockClear();
            this.buildCreatorExperienceTelemetryPayload.mockClear();
            this.buildCreatorExperienceTransactionDebug.mockClear();
            this.buildSourceAwareBalancePatch.mockClear();
            this.readSourceAwareBalance.mockClear();
            this.readPaidSourceBalanceForRestrictedSpend.mockClear();
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
    CREATOR_BOOKING_RATES: { phone: 500, video: 1000 },
    CREATOR_MESSAGE_COSTS: { text: 1, image: 5, video: 10 },
    CREATOR_SUBSCRIPTION_MIN_GD: 500,
    DEFAULT_CREATOR_SETTINGS: {
        subscriptionsEnabled: true,
        subscriptionPriceGd: 500,
        bookingsEnabled: true,
        customRequestsEnabled: true,
        phoneRatePerMinuteGd: 500,
        videoRatePerMinuteGd: 1000,
        bookingMinimumMinutes: 5,
        videoSubscriberDiscountPercent: 50,
        requestCategories: [],
        availabilityWindows: [],
        availabilityTimezone: "America/Chicago",
    },
    CREATOR_COLLECTIONS: {
        subscriptions: "creator_subscriptions",
        ledgerAccruals: "creator_ledger_accruals",
    },
    isCreatorRole: (role: unknown) => role === "creator",
    isCreatorOrAdminRole: (role: unknown) => role === "creator" || role === "admin",
    normalizeCreatorSettings: (value: unknown) => ({
        subscriptionsEnabled: true,
        subscriptionPriceGd: 500,
        bookingsEnabled: true,
        customRequestsEnabled: true,
        phoneRatePerMinuteGd: 500,
        videoRatePerMinuteGd: 1000,
        bookingMinimumMinutes: 5,
        videoSubscriberDiscountPercent: 50,
        requestCategories: [],
        availabilityWindows: [],
        availabilityTimezone: "America/Chicago",
        ...(value && typeof value === "object" ? value as Record<string, unknown> : {}),
    }),
    normalizeCreatorRestrictions: (value: unknown) => ({
        messagingRestricted: false,
        broadcastsRestricted: false,
        subscriptionsRestricted: false,
        bookingsRestricted: false,
        customRequestsRestricted: false,
        dropSubmissionsRestricted: false,
        payoutsRestricted: false,
        ...(value && typeof value === "object" ? value as Record<string, unknown> : {}),
    }),
    normalizeCreatorRequestCategories: (value: unknown) => Array.isArray(value) ? value : [],
    normalizeCreatorAvailabilityWindows: (value: unknown) => Array.isArray(value) ? value : [],
    normalizePositiveWholeNumber: (value: unknown, fallback: number) => {
        const numeric = typeof value === "number" ? value : Number(value);
        return Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : fallback;
    },
}));
vi.mock("@/lib/server/creator-experiences", () => ({
    CREATOR_EXPERIENCE_PAID_EVENTS: {
        fan_pass: "creator_fan_pass_started",
        private_chat: "creator_private_chat_opened",
        custom_request: "creator_custom_request_created",
        live_time: "creator_live_time_booked",
    },
    buildCreatorAccrual: mockState.buildCreatorAccrual,
    buildCreatorExperienceAttribution: mockState.buildCreatorExperienceAttribution,
    buildCreatorExperienceIdempotencyKey: mockState.buildCreatorExperienceIdempotencyKey,
    buildCreatorExperienceRecordIds: mockState.buildCreatorExperienceRecordIds,
    buildCreatorExperienceTelemetryPayload: mockState.buildCreatorExperienceTelemetryPayload,
    buildCreatorExperienceTransactionAttributionExtra: mockState.buildCreatorExperienceTransactionAttributionExtra,
    buildCreatorExperienceTransactionDebug: mockState.buildCreatorExperienceTransactionDebug,
    buildSourceAwareBalancePatch: mockState.buildSourceAwareBalancePatch,
    readSourceAwareBalance: mockState.readSourceAwareBalance,
    readPaidSourceBalanceForRestrictedSpend: mockState.readPaidSourceBalanceForRestrictedSpend,
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
        expect(body.viewMode).toBe("fan_subscription_status");
        expect(body.subscription).toMatchObject({ id: "fan_1__creator_1", status: "active" });
        expect(body.subscribers).toBeUndefined();
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

    it("returns creator subscriber rows for explicit creatorId when the creator owns the dashboard", async () => {
        mockState.guardApiRequest.mockResolvedValue({ uid: "creator_1" });
        mockState.setDocument("users", "creator_1", { role: "creator" });
        mockState.setDocument("users", "fan_1", { role: "user", username: "zayfan", displayName: "Zay Fan", photoURL: "/avatars/zayfan.jpg", email: "fan@example.com" });
        mockState.collections.set("creator_subscriptions", [
            { id: "fan_1__creator_1", data: { creatorId: "creator_1", userId: "fan_1", status: "active" } },
            { id: "fan_2__creator_1", data: { creatorId: "creator_1", userId: "fan_2", status: "canceled" } },
            { id: "fan_3__creator_2", data: { creatorId: "creator_2", userId: "fan_3", status: "active" } },
        ]);

        const response = await GET(new NextRequest("http://localhost/api/creator/subscriptions?creatorId=creator_1"));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.viewMode).toBe("creator_subscriber_visibility");
        expect(body.subscribers).toHaveLength(2);
        expect(body.subscribers[0]).toMatchObject({
            id: "fan_1__creator_1",
            subscriberId: "fan_1__creator_1",
            fanUsername: "zayfan",
            fanDisplayName: "Zay Fan",
            fanPhotoURL: "/avatars/zayfan.jpg",
            fanHandle: "@zayfan",
            fanLabel: "@zayfan",
            fanIdentitySource: "user_profile",
        });
        expect(body.subscribers[0].email).toBeUndefined();
        expect(body.subscribers[0].userId).toBeUndefined();
        expect(body.subscribers[1]).toMatchObject({
            fanLabel: "Fan",
            fanIdentitySource: "unavailable",
        });
        expect(body.crmHydration).toBe("partial");
        expect(body.crmHydrationMissingCount).toBe(1);
        expect(body.identityFieldsRedacted).toBe(true);
        expect(body.subscription).toBeUndefined();
    });

    it("uses subscription snapshot identity before profile hydration and never exposes private email", async () => {
        mockState.guardApiRequest.mockResolvedValue({ uid: "creator_1" });
        mockState.setDocument("users", "creator_1", { role: "creator" });
        mockState.collections.set("creator_subscriptions", [
            {
                id: "fan_1__creator_1",
                data: {
                    creatorId: "creator_1",
                    userId: "fan_1",
                    status: "active",
                    fanUsername: "snapshotfan",
                    fanDisplayName: "Snapshot Fan",
                    fanPhotoURL: "/snapshot.jpg",
                    email: "private@example.com",
                },
            },
        ]);

        const response = await GET(new NextRequest("http://localhost/api/creator/subscriptions?creatorId=creator_1"));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.subscribers[0]).toMatchObject({
            fanUsername: "snapshotfan",
            fanDisplayName: "Snapshot Fan",
            fanPhotoURL: "/snapshot.jpg",
            fanLabel: "@snapshotfan",
            fanIdentitySource: "subscription_snapshot",
        });
        expect(body.subscribers[0].email).toBeUndefined();
        expect(body.subscribers[0].userId).toBeUndefined();
        expect(body.crmHydration).toBe("hydrated");
    });

    it("returns projected subscriber visibility for admin view-as headers", async () => {
        mockState.guardApiRequest.mockResolvedValue({ uid: "admin_1" });
        mockState.setDocument("users", "admin_1", { role: "admin" });
        mockState.collections.set("creator_subscriptions", [
            { id: "fan_1__creator_1", data: { creatorId: "creator_1", userId: "fan_1", status: "active" } },
            { id: "fan_2__creator_2", data: { creatorId: "creator_2", userId: "fan_2", status: "active" } },
        ]);

        const response = await GET(new NextRequest("http://localhost/api/creator/subscriptions?creatorId=ignored_creator", {
            headers: {
                "x-admin-view-as-user-id": "creator_1",
                "x-admin-view-as-actor-uid": "admin_1",
                "x-admin-view-as-started-at": String(Date.now()),
                "x-admin-view-as-role": "creator",
            },
        }));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.viewMode).toBe("subscriber_visibility_projection");
        expect(body.subscribers).toHaveLength(1);
        expect(body.subscribers[0]).toMatchObject({ id: "fan_1__creator_1", creatorId: "creator_1", userIdDebug: "fan_1" });
        expect(body.subscription).toBeUndefined();
    });

    it("subscribes successfully when the creator is eligible and balance is sufficient", async () => {
        mockState.guardApiRequest.mockResolvedValue({ uid: "fan_1" });
        mockState.setDocument("users", "fan_1", {
            role: "user",
            gumDropsBalance: 1200,
            gumDropsPurchasedBalance: 1200,
            gumDropsRewardBalance: 0,
        });
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
                source_policy: "creator_experience_paid_only",
                subscription_source_policy: "creator_subscription_paid_only",
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

    it("rejects oversized subscription action payloads before parsing JSON", async () => {
        mockState.guardApiRequest.mockResolvedValue({ uid: "fan_1" });
        mockState.setDocument("users", "fan_1", { role: "user" });
        const oversizedBody = JSON.stringify({
            creatorId: "creator_1",
            action: "subscribe",
            idempotencyKey: "x".repeat(33_000),
        });

        const response = await POST(new NextRequest("http://localhost/api/creator/subscriptions", {
            method: "POST",
            body: oversizedBody,
            headers: {
                "Content-Type": "application/json",
                "content-length": String(oversizedBody.length),
            },
        }));
        const body = await response.json();

        expect(response.status).toBe(413);
        expect(body).toMatchObject({ success: false, code: "payload_too_large" });
        expect(Array.from(mockState.documents.keys()).filter((key) => key.startsWith("transactions/"))).toHaveLength(0);
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
        mockState.setDocument("users", "fan_1", {
            role: "user",
            gumDropsBalance: 1200,
            gumDropsPurchasedBalance: 1200,
            gumDropsRewardBalance: 0,
        });
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

    it("returns a historical receipt with current canceled truth when an old subscribe key is replayed", async () => {
        mockState.guardApiRequest.mockResolvedValue({ uid: "fan_1" });
        mockState.setDocument("users", "fan_1", {
            role: "user",
            gumDropsBalance: 1200,
            gumDropsPurchasedBalance: 1200,
            gumDropsRewardBalance: 0,
        });
        mockState.setDocument("users", "creator_1", {
            role: "creator",
            displayName: "Creator One",
            creatorSettings: { subscriptionPriceGd: 700, subscriptionsEnabled: true },
        });
        const payload = {
            creatorId: "creator_1",
            action: "subscribe" as const,
            idempotencyKey: "fan-pass-lost-response",
        };

        const firstResponse = await POST(new NextRequest("http://localhost/api/creator/subscriptions", {
            method: "POST",
            body: JSON.stringify(payload),
        }));
        mockState.setDocument("users", "fan_1", {
            role: "user",
            gumDropsBalance: 0,
            gumDropsPurchasedBalance: 0,
            gumDropsRewardBalance: 0,
        });
        mockState.setDocument("users", "creator_1", {
            role: "creator",
            status: "banned",
            creatorSettings: { subscriptionsEnabled: false },
            creatorRestrictions: { subscriptionsRestricted: true },
        });
        mockState.setDocument("creator_subscriptions", "fan_1__creator_1", {
            creatorId: "creator_1",
            userId: "fan_1",
            status: "canceled",
            autoRenew: false,
            renewAt: Date.now() + 86_400_000,
            idempotencyKey: "fan-pass-lost-response",
            userTransactionId: "txn_fan-pass-lost-response",
        });
        const firstAttemptId = mockState.trackServerEvent.mock.calls.find(
            ([eventName]) => eventName === "fan_pass_purchase_attempted",
        )?.[1]?.idempotencyKey;
        mockState.trackServerEvent.mockClear();

        const replayResponse = await POST(new NextRequest("http://localhost/api/creator/subscriptions", {
            method: "POST",
            body: JSON.stringify(payload),
        }));
        const replayBody = await replayResponse.json();

        expect(firstResponse.status).toBe(200);
        expect(replayResponse.status).toBe(200);
        expect(replayBody).toMatchObject({
            action: "cancel",
            requestedAction: "subscribe",
            code: "historical_receipt",
            subscriptionStatus: "canceled",
            accessGranted: false,
            historicalReceipt: true,
            historicalAction: "subscribe",
            renewAt: null,
            duplicatePrevented: true,
            debug: {
                userTransactionId: "txn_fan-pass-lost-response",
                creatorExperienceRecordId: "fan_1__creator_1",
            },
        });
        expect(mockState.spendCreatorExperienceGumdrops).toHaveBeenCalledTimes(1);
        expect(mockState.trackServerEvent).not.toHaveBeenCalledWith(
            "fan_pass_access_granted",
            expect.anything(),
            expect.anything(),
        );
        expect(mockState.trackServerEvent).toHaveBeenCalledWith(
            "fan_pass_purchase_attempted",
            expect.objectContaining({
                idempotencyKey: firstAttemptId,
                eventId: firstAttemptId,
                actionIdempotencyKey: "fan-pass-lost-response",
            }),
            "fan_1",
        );
    });

    it("returns materializer_missing without claiming success when payment exists but the subscription is absent", async () => {
        mockState.guardApiRequest.mockResolvedValue({ uid: "fan_1" });
        mockState.setDocument("users", "fan_1", {
            role: "user",
            gumDropsBalance: 1200,
            gumDropsPurchasedBalance: 1200,
            gumDropsRewardBalance: 0,
        });
        mockState.setDocument("users", "creator_1", {
            role: "creator",
            displayName: "Creator One",
            creatorSettings: { subscriptionPriceGd: 700, subscriptionsEnabled: true },
        });
        const payload = {
            creatorId: "creator_1",
            action: "subscribe" as const,
            idempotencyKey: "fan-pass-materializer-gap",
        };

        const firstResponse = await POST(new NextRequest("http://localhost/api/creator/subscriptions", {
            method: "POST",
            body: JSON.stringify(payload),
        }));
        mockState.documents.delete("creator_subscriptions/fan_1__creator_1");
        mockState.trackServerEvent.mockClear();

        const replayResponse = await POST(new NextRequest("http://localhost/api/creator/subscriptions", {
            method: "POST",
            body: JSON.stringify(payload),
        }));
        const replayBody = await replayResponse.json();

        expect(firstResponse.status).toBe(200);
        expect(replayResponse.status).toBe(409);
        expect(replayBody).toMatchObject({
            success: false,
            code: "materializer_missing",
            reconciliationState: "materializer_missing",
            retryable: true,
            preserveIdempotencyKey: true,
        });
        expect(replayBody.action).toBe("subscribe");
        expect(replayBody.accessGranted).not.toBe(true);
        expect(mockState.spendCreatorExperienceGumdrops).toHaveBeenCalledTimes(1);
        expect(mockState.trackServerEvent).not.toHaveBeenCalledWith(
            "fan_pass_purchase_failed",
            expect.anything(),
            expect.anything(),
        );
    });

    it("rejects a cancel payload that reuses a committed subscribe key", async () => {
        mockState.guardApiRequest.mockResolvedValue({ uid: "fan_1" });
        mockState.setDocument("users", "fan_1", {
            role: "user",
            gumDropsBalance: 1200,
            gumDropsPurchasedBalance: 1200,
            gumDropsRewardBalance: 0,
        });
        mockState.setDocument("users", "creator_1", {
            role: "creator",
            creatorSettings: { subscriptionPriceGd: 700, subscriptionsEnabled: true },
        });
        const idempotencyKey = "fan-pass-action-conflict";
        await POST(new NextRequest("http://localhost/api/creator/subscriptions", {
            method: "POST",
            body: JSON.stringify({ creatorId: "creator_1", action: "subscribe", idempotencyKey }),
        }));

        const conflictResponse = await POST(new NextRequest("http://localhost/api/creator/subscriptions", {
            method: "POST",
            body: JSON.stringify({ creatorId: "creator_1", action: "cancel", idempotencyKey }),
        }));
        const conflictBody = await conflictResponse.json();

        expect(conflictResponse.status).toBe(409);
        expect(conflictBody.code).toBe("idempotency_conflict");
        expect(conflictBody.preserveIdempotencyKey).toBe(true);
        expect(mockState.spendCreatorExperienceGumdrops).toHaveBeenCalledTimes(1);
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
            userTransactionId: "txn_original_purchase",
            creatorAccrualId: "accrual_original_purchase",
        });

        const response = await POST(new NextRequest("http://localhost/api/creator/subscriptions", {
            method: "POST",
            body: JSON.stringify({ creatorId: "creator_1", action: "cancel", idempotencyKey: "cancel-one" }),
        }));
        const body = await response.json();
        const firstCanceledAt = mockState.documents.get("creator_subscriptions/fan_1__creator_1")?.canceledAt;

        const duplicateResponse = await POST(new NextRequest("http://localhost/api/creator/subscriptions", {
            method: "POST",
            body: JSON.stringify({ creatorId: "creator_1", action: "cancel", idempotencyKey: "cancel-two" }),
        }));
        const duplicateBody = await duplicateResponse.json();

        expect(response.status).toBe(200);
        expect(body).toMatchObject({
            action: "cancel",
            subscriptionStatus: "canceled",
            accessGranted: false,
            duplicatePrevented: false,
            debug: {
                userTransactionId: "txn_original_purchase",
                creatorAccrualId: "accrual_original_purchase",
                creatorExperienceRecordId: "fan_1__creator_1",
            },
        });
        expect(duplicateResponse.status).toBe(200);
        expect(duplicateBody).toMatchObject({
            action: "cancel",
            subscriptionStatus: "canceled",
            duplicatePrevented: true,
        });
        expect(mockState.spendCreatorExperienceGumdrops).not.toHaveBeenCalled();
        expect(Array.from(mockState.documents.keys()).filter((key) => key.startsWith("transactions/"))).toHaveLength(0);
        expect(mockState.documents.get("creator_subscriptions/fan_1__creator_1")).toMatchObject({
            status: "canceled",
            autoRenew: false,
            canceledAt: firstCanceledAt,
        });
    });

    it.each([
        ["missing creator", null],
        ["suspended creator", { role: "creator", status: "suspended", creatorSettings: { subscriptionsEnabled: true } }],
        ["disabled Fan Pass", { role: "creator", creatorSettings: { subscriptionsEnabled: false } }],
        ["restricted Fan Pass", {
            role: "creator",
            creatorSettings: { subscriptionsEnabled: true },
            creatorRestrictions: { subscriptionsRestricted: true },
        }],
    ])("allows an existing subscriber to cancel with a %s", async (_scenario, creatorData) => {
        mockState.guardApiRequest.mockResolvedValue({ uid: "fan_1" });
        mockState.setDocument("users", "fan_1", { role: "user" });
        if (creatorData) {
            mockState.setDocument("users", "creator_1", creatorData);
        }
        mockState.setDocument("creator_subscriptions", "fan_1__creator_1", {
            status: "active",
            creatorId: "creator_1",
            userId: "fan_1",
            autoRenew: true,
        });

        const response = await POST(new NextRequest("http://localhost/api/creator/subscriptions", {
            method: "POST",
            body: JSON.stringify({ creatorId: "creator_1", action: "cancel", idempotencyKey: `cancel-${_scenario}` }),
        }));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toMatchObject({
            action: "cancel",
            subscriptionStatus: "canceled",
            accessGranted: false,
            debug: {
                userTransactionId: null,
                creatorAccrualId: null,
                creatorExperienceRecordId: "fan_1__creator_1",
            },
        });
        expect(mockState.documents.get("creator_subscriptions/fan_1__creator_1")).toMatchObject({
            status: "canceled",
            autoRenew: false,
        });
        expect(mockState.spendCreatorExperienceGumdrops).not.toHaveBeenCalled();
    });

    it("rejects cancellation when the stored subscription owner does not match the caller and target", async () => {
        mockState.guardApiRequest.mockResolvedValue({ uid: "fan_1" });
        mockState.setDocument("users", "fan_1", { role: "user" });
        mockState.setDocument("creator_subscriptions", "fan_1__creator_1", {
            status: "active",
            creatorId: "creator_1",
            userId: "another_fan",
            autoRenew: true,
        });

        const response = await POST(new NextRequest("http://localhost/api/creator/subscriptions", {
            method: "POST",
            body: JSON.stringify({ creatorId: "creator_1", action: "cancel", idempotencyKey: "owner-mismatch" }),
        }));
        const body = await response.json();

        expect(response.status).toBe(409);
        expect(body).toMatchObject({ code: "idempotency_conflict", preserveIdempotencyKey: true });
        expect(mockState.documents.get("creator_subscriptions/fan_1__creator_1")).toMatchObject({
            status: "active",
            autoRenew: true,
        });
    });

    it("does not fabricate transaction or accrual IDs for an already-active subscription", async () => {
        mockState.guardApiRequest.mockResolvedValue({ uid: "fan_1" });
        mockState.setDocument("users", "fan_1", {
            role: "user",
            gumDropsBalance: 1200,
            gumDropsPurchasedBalance: 1200,
            gumDropsRewardBalance: 0,
        });
        mockState.setDocument("users", "creator_1", {
            role: "creator",
            creatorSettings: { subscriptionPriceGd: 700, subscriptionsEnabled: true },
        });
        mockState.setDocument("creator_subscriptions", "fan_1__creator_1", {
            status: "active",
            creatorId: "creator_1",
            userId: "fan_1",
            autoRenew: true,
        });

        const response = await POST(new NextRequest("http://localhost/api/creator/subscriptions", {
            method: "POST",
            body: JSON.stringify({ creatorId: "creator_1", action: "subscribe", idempotencyKey: "new-unused-key" }),
        }));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toMatchObject({
            action: "subscribe",
            subscriptionStatus: "active",
            duplicatePrevented: true,
            debug: {
                userTransactionId: null,
                creatorAccrualId: null,
                creatorExperienceRecordId: "fan_1__creator_1",
            },
        });
        expect(body.debug.userTransactionId).not.toBe("txn_new-unused-key");
        expect(body.debug.creatorAccrualId).not.toBe("accrual_new-unused-key");
        expect(mockState.spendCreatorExperienceGumdrops).not.toHaveBeenCalled();
        expect(Array.from(mockState.documents.keys()).filter((key) => key.startsWith("transactions/"))).toHaveLength(0);
    });

    it("starts a new paid Fan Pass after a canceled subscription", async () => {
        mockState.guardApiRequest.mockResolvedValue({ uid: "fan_1" });
        mockState.setDocument("users", "fan_1", {
            role: "user",
            gumDropsBalance: 1200,
            gumDropsPurchasedBalance: 1200,
            gumDropsRewardBalance: 0,
        });
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
        expect(mockState.trackServerEvent).toHaveBeenCalledWith(
            "fan_pass_purchase_attempted",
            expect.objectContaining({
                eventId: "fan-pass-attempted:fan_pass:fan_1:creator_1",
                idempotencyKey: "fan-pass-attempted:fan_pass:fan_1:creator_1",
                actionIdempotencyKey: "fan_pass:fan_1:creator_1",
            }),
            "fan_1",
        );
        expect(mockState.trackServerEvent).toHaveBeenCalledWith(
            "fan_pass_purchase_failed",
            expect.anything(),
            "fan_1",
        );
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
