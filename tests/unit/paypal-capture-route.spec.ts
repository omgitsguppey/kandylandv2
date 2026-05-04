import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type StoredDoc = Record<string, unknown>;

const mockState = vi.hoisted(() => {
    const documents = new Map<string, StoredDoc>();
    const transactionWrites: Array<{ path: string; data: StoredDoc }> = [];
    let autoId = 0;

    const buildDocSnapshot = (path: string) => ({
        exists: documents.has(path),
        data: () => documents.get(path),
    });

    const buildDocRef = (path: string) => ({
        path,
        async get() {
            return buildDocSnapshot(path);
        },
    });

    const adminDb = {
        collection(name: string) {
            return {
                async add(data: StoredDoc) {
                    const resolvedId = `auto_${++autoId}`;
                    const path = `${name}/${resolvedId}`;
                    transactionWrites.push({ path, data });
                    documents.set(path, data);
                    return buildDocRef(path);
                },
                doc(id?: string) {
                    const resolvedId = id ?? `auto_${++autoId}`;
                    return buildDocRef(`${name}/${resolvedId}`);
                },
            };
        },
        async runTransaction(callback: (transaction: {
            get: (ref: { path: string }) => Promise<{ exists: boolean; data: () => StoredDoc | undefined }>;
            update: (ref: { path: string }, data: StoredDoc) => void;
            set: (ref: { path: string }, data: StoredDoc) => void;
        }) => Promise<unknown>) {
            return callback({
                async get(ref) {
                    return buildDocSnapshot(ref.path);
                },
                update(ref, data) {
                    documents.set(ref.path, {
                        ...(documents.get(ref.path) ?? {}),
                        ...data,
                    });
                },
                set(ref, data) {
                    transactionWrites.push({ path: ref.path, data });
                    documents.set(ref.path, {
                        ...(documents.get(ref.path) ?? {}),
                        ...data,
                    });
                },
            });
        },
    };

    return {
        documents,
        transactionWrites,
        adminDb,
        guardApiRequest: vi.fn(),
        handleApiError: vi.fn(),
        capturePayPalOrder: vi.fn(),
        trackServerEvent: vi.fn(async () => undefined),
        recordCanonicalTaskEvent: vi.fn(async () => undefined),
        touchUserRuntime: vi.fn(async () => undefined),
        recordRouteWarning: vi.fn(),
        reset() {
            documents.clear();
            transactionWrites.length = 0;
            autoId = 0;
            this.guardApiRequest.mockReset();
            this.handleApiError.mockReset();
            this.capturePayPalOrder.mockReset();
            this.trackServerEvent.mockReset();
            this.recordCanonicalTaskEvent.mockReset();
            this.touchUserRuntime.mockReset();
            this.recordRouteWarning.mockReset();
        },
    };
});

vi.mock("@/lib/server/firebase-admin", () => ({
    adminDb: mockState.adminDb,
}));

vi.mock("@/lib/server/request-guard", () => ({
    guardApiRequest: mockState.guardApiRequest,
}));

vi.mock("@/lib/server/auth", () => ({
    handleApiError: mockState.handleApiError,
}));

vi.mock("@/lib/server/rate-limit", () => ({
    SENSITIVE_WRITE: {},
}));

vi.mock("@/lib/server/paypal", () => ({
    capturePayPalOrder: mockState.capturePayPalOrder,
}));

vi.mock("@/lib/server/analytics", () => ({
    trackServerEvent: mockState.trackServerEvent,
}));

vi.mock("@/lib/server/daily-tasks", () => ({
    recordCanonicalTaskEvent: mockState.recordCanonicalTaskEvent,
}));

vi.mock("@/lib/server/user-runtime", () => ({
    touchUserRuntime: mockState.touchUserRuntime,
}));

vi.mock("@/lib/server/route-diagnostics", () => ({
    recordRouteWarning: mockState.recordRouteWarning,
}));

vi.mock("firebase-admin/firestore", () => ({
    FieldValue: {
        serverTimestamp: () => "__server_timestamp__",
    },
}));

import { POST } from "@/app/api/paypal/capture/route";

describe("POST /api/paypal/capture", () => {
    beforeEach(() => {
        mockState.reset();
        mockState.guardApiRequest.mockResolvedValue({
            uid: "fan_1",
            email: "fan@example.com",
        });
        mockState.handleApiError.mockImplementation((error: Error) => NextResponse.json({
            error: error.message,
        }, { status: 500 }));
        mockState.capturePayPalOrder.mockResolvedValue({
            status: "COMPLETED",
            purchase_units: [
                {
                    custom_id: "fan_1:550",
                    payments: {
                        captures: [
                            {
                                id: "capture_1",
                                custom_id: "fan_1:550",
                                amount: {
                                    currency_code: "USD",
                                    value: "5.00",
                                },
                                seller_receivable_breakdown: {
                                    paypal_fee: {
                                        currency_code: "USD",
                                        value: "0.45",
                                    },
                                    net_amount: {
                                        currency_code: "USD",
                                        value: "4.55",
                                    },
                                },
                            },
                        ],
                    },
                },
            ],
        });
        mockState.documents.set("users/fan_1", {
            uid: "fan_1",
            email: "fan@example.com",
            username: "fan_1",
            displayName: "Fan One",
            gumDropsBalance: 0,
            gumDropsPurchasedBalance: 0,
            gumDropsRewardBalance: 0,
        });
    });

    it("credits purchased and paid-pack bonus GumDrops into paid-source backend balance", async () => {
        const request = new NextRequest("http://localhost/api/paypal/capture", {
            method: "POST",
            body: JSON.stringify({
                orderId: "order_1",
                expectedDrops: 550,
            }),
        });

        const response = await POST(request);
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload).toMatchObject({
            success: true,
            drops: 550,
            gumDropsBalance: 550,
        });
        expect(mockState.documents.get("users/fan_1")).toMatchObject({
            gumDropsBalance: 550,
            gumDropsPurchasedBalance: 550,
            gumDropsRewardBalance: 0,
        });
        const purchaseWrite = mockState.transactionWrites.find((write) => write.path.startsWith("transactions/"));
        expect(purchaseWrite?.data).toMatchObject({
            type: "purchase_currency",
            amount: 550,
            deliveredGumDrops: 550,
            paidGumDrops: 500,
            bonusGumDrops: 50,
            purchaseBonusGumDrops: 50,
            purchasedBalanceCreditGumDrops: 550,
            rewardBalanceCreditGumDrops: 0,
            purchaseSourceClassification: "paid_purchase_including_bonus",
            sourceTruth: "server_purchase_transaction",
        });
        expect(mockState.trackServerEvent).toHaveBeenCalledWith("purchase_verified", expect.objectContaining({
            order_id: "order_1",
            transaction_id: expect.any(String),
            sourceTruth: "canonical",
            purchase_source: "paypal_capture",
        }), "fan_1");
    });

    it("suppresses duplicate purchase credit when the payment lock already exists", async () => {
        mockState.documents.set("paymentLocks/order_1", {
            orderId: "order_1",
            userId: "fan_1",
            expectedDrops: 550,
        });

        const request = new NextRequest("http://localhost/api/paypal/capture", {
            method: "POST",
            body: JSON.stringify({
                orderId: "order_1",
                expectedDrops: 550,
            }),
        });

        const response = await POST(request);
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload).toMatchObject({
            success: true,
            drops: 550,
            duplicate: true,
        });
        expect(mockState.documents.get("users/fan_1")).toMatchObject({
            gumDropsBalance: 0,
            gumDropsPurchasedBalance: 0,
            gumDropsRewardBalance: 0,
        });
        expect(mockState.transactionWrites.some((write) => write.path.startsWith("gumdrop_transactions/"))).toBe(false);
        expect(mockState.trackServerEvent).not.toHaveBeenCalled();
        expect(mockState.recordCanonicalTaskEvent).not.toHaveBeenCalled();
    });

    it("rejects completed captures that are missing the server-created custom id", async () => {
        mockState.capturePayPalOrder.mockResolvedValue({
            status: "COMPLETED",
            purchase_units: [
                {
                    payments: {
                        captures: [
                            {
                                id: "capture_missing_identity",
                                amount: {
                                    currency_code: "USD",
                                    value: "5.00",
                                },
                            },
                        ],
                    },
                },
            ],
        });

        const request = new NextRequest("http://localhost/api/paypal/capture", {
            method: "POST",
            body: JSON.stringify({
                orderId: "order_missing_identity",
                expectedDrops: 550,
            }),
        });

        const response = await POST(request);
        const payload = await response.json();

        expect(response.status).toBe(403);
        expect(payload).toMatchObject({ error: "User verification failed" });
        expect(mockState.documents.get("users/fan_1")).toMatchObject({
            gumDropsBalance: 0,
            gumDropsPurchasedBalance: 0,
            gumDropsRewardBalance: 0,
        });
        expect(mockState.documents.has("paymentLocks/order_missing_identity")).toBe(false);
        expect(mockState.trackServerEvent).not.toHaveBeenCalled();
        expect(mockState.recordRouteWarning).toHaveBeenCalledWith(
            "paypal/capture",
            "PayPal capture was missing its server-created identity binding",
            undefined,
            expect.any(Object),
        );
    });

    it("rejects captures whose custom id does not match the requested package", async () => {
        mockState.capturePayPalOrder.mockResolvedValue({
            status: "COMPLETED",
            purchase_units: [
                {
                    custom_id: "fan_1:100",
                    payments: {
                        captures: [
                            {
                                id: "capture_package_mismatch",
                                custom_id: "fan_1:100",
                                amount: {
                                    currency_code: "USD",
                                    value: "5.00",
                                },
                            },
                        ],
                    },
                },
            ],
        });

        const request = new NextRequest("http://localhost/api/paypal/capture", {
            method: "POST",
            body: JSON.stringify({
                orderId: "order_package_mismatch",
                expectedDrops: 550,
            }),
        });

        const response = await POST(request);
        const payload = await response.json();

        expect(response.status).toBe(403);
        expect(payload).toMatchObject({ error: "User verification failed" });
        expect(mockState.documents.get("users/fan_1")).toMatchObject({
            gumDropsBalance: 0,
            gumDropsPurchasedBalance: 0,
            gumDropsRewardBalance: 0,
        });
        expect(mockState.documents.has("paymentLocks/order_package_mismatch")).toBe(false);
        expect(mockState.trackServerEvent).not.toHaveBeenCalled();
    });

    it("rejects malformed custom id package bindings", async () => {
        mockState.capturePayPalOrder.mockResolvedValue({
            status: "COMPLETED",
            purchase_units: [
                {
                    custom_id: "fan_1:550abc",
                    payments: {
                        captures: [
                            {
                                id: "capture_malformed_package",
                                custom_id: "fan_1:550abc",
                                amount: {
                                    currency_code: "USD",
                                    value: "5.00",
                                },
                            },
                        ],
                    },
                },
            ],
        });

        const request = new NextRequest("http://localhost/api/paypal/capture", {
            method: "POST",
            body: JSON.stringify({
                orderId: "order_malformed_package",
                expectedDrops: 550,
            }),
        });

        const response = await POST(request);
        const payload = await response.json();

        expect(response.status).toBe(403);
        expect(payload).toMatchObject({ error: "User verification failed" });
        expect(mockState.documents.get("users/fan_1")).toMatchObject({
            gumDropsBalance: 0,
            gumDropsPurchasedBalance: 0,
            gumDropsRewardBalance: 0,
        });
        expect(mockState.documents.has("paymentLocks/order_malformed_package")).toBe(false);
        expect(mockState.trackServerEvent).not.toHaveBeenCalled();
    });
});
