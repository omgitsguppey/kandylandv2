import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type StoredDoc = Record<string, unknown>;

const mockState = vi.hoisted(() => {
    const documents = new Map<string, StoredDoc>();
    const transactionWrites: Array<{ path: string; data: StoredDoc }> = [];
    let autoId = 0;
    let transactionTail = Promise.resolve();
    let failCommitForPath: string | null = null;

    const buildDocSnapshot = (path: string) => ({
        exists: documents.has(path),
        data: () => documents.get(path),
    });

    const buildDocRef = (path: string) => ({
        path,
        id: path.split("/").at(-1) ?? path,
        async get() {
            return buildDocSnapshot(path);
        },
    });

    const applyWrite = (write: { path: string; data: StoredDoc; merge: boolean }) => {
        const current = documents.get(write.path) ?? {};
        const resolved = Object.fromEntries(Object.entries(write.data).map(([key, value]) => {
            if (value && typeof value === "object" && "__increment" in value) {
                const increment = Number((value as { __increment: number }).__increment);
                return [key, Number(current[key] ?? 0) + increment];
            }
            return [key, value];
        }));
        documents.set(write.path, write.merge ? { ...current, ...resolved } : resolved);
        transactionWrites.push({ path: write.path, data: resolved });
    };

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
            set: (ref: { path: string }, data: StoredDoc, options?: { merge?: boolean }) => void;
        }) => Promise<unknown>) {
            let releaseTransaction!: () => void;
            const priorTransaction = transactionTail;
            transactionTail = new Promise<void>((resolve) => {
                releaseTransaction = resolve;
            });
            await priorTransaction;

            try {
                const stagedWrites: Array<{ path: string; data: StoredDoc; merge: boolean }> = [];
                const result = await callback({
                    async get(ref) {
                        return buildDocSnapshot(ref.path);
                    },
                    update(ref, data) {
                        if (!documents.has(ref.path)) {
                            throw new Error(`Cannot update missing document ${ref.path}`);
                        }
                        stagedWrites.push({ path: ref.path, data, merge: true });
                    },
                    set(ref, data, options) {
                        stagedWrites.push({ path: ref.path, data, merge: options?.merge === true });
                    },
                });
                if (failCommitForPath && stagedWrites.some((write) => write.path === failCommitForPath)) {
                    failCommitForPath = null;
                    throw new Error("Injected transaction commit failure");
                }
                for (const write of stagedWrites) applyWrite(write);
                return result;
            } finally {
                releaseTransaction();
            }
        },
    };

    return {
        documents,
        transactionWrites,
        adminDb,
        guardApiRequest: vi.fn(),
        handleApiError: vi.fn(),
        getPayPalAccessToken: vi.fn(),
        createPayPalOrder: vi.fn(),
        capturePayPalOrder: vi.fn(),
        getPayPalOrder: vi.fn(),
        trackServerEvent: vi.fn(async () => undefined),
        recordCanonicalTaskEvent: vi.fn(async () => undefined),
        touchUserRuntime: vi.fn(async () => undefined),
        recordRouteWarning: vi.fn(),
        reset() {
            documents.clear();
            transactionWrites.length = 0;
            autoId = 0;
            transactionTail = Promise.resolve();
            failCommitForPath = null;
            this.guardApiRequest.mockReset();
            this.handleApiError.mockReset();
            this.getPayPalAccessToken.mockReset();
            this.createPayPalOrder.mockReset();
            this.capturePayPalOrder.mockReset();
            this.getPayPalOrder.mockReset();
            this.trackServerEvent.mockReset();
            this.recordCanonicalTaskEvent.mockReset();
            this.touchUserRuntime.mockReset();
            this.recordRouteWarning.mockReset();
        },
        failNextCommitForPath(path: string) {
            failCommitForPath = path;
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
    getPayPalAccessToken: mockState.getPayPalAccessToken,
    createPayPalOrder: mockState.createPayPalOrder,
    capturePayPalOrder: mockState.capturePayPalOrder,
    getPayPalOrder: mockState.getPayPalOrder,
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

vi.mock("@/lib/server/route-runtime-health", () => ({
    withRouteRuntimeHealth: (_key: string, handler: unknown) => handler,
}));

vi.mock("firebase-admin/firestore", () => ({
    FieldValue: {
        serverTimestamp: () => "__server_timestamp__",
        increment: (value: number) => ({ __increment: value }),
    },
}));

import { POST as CAPTURE_POST } from "@/app/api/paypal/capture/route";
import { POST as CREATE_POST } from "@/app/api/paypal/create/route";

function buildPendingPayment(orderId: string, overrides: StoredDoc = {}) {
    return {
        orderId,
        userId: "fan_1",
        expectedDrops: 550,
        drops: 550,
        expectedPrice: "5.00",
        currency: "USD",
        customId: "fan_1:550",
        status: "pending",
        ...overrides,
    };
}

function buildCompletedCapture(customId = "fan_1:550", amount = "5.00", captureStatus = "COMPLETED") {
    return {
        status: "COMPLETED",
        purchase_units: [
            {
                custom_id: customId,
                payments: {
                    captures: [
                        {
                            id: "capture_1",
                            status: captureStatus,
                            custom_id: customId,
                            amount: {
                                currency_code: "USD",
                                value: amount,
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
    };
}

function captureRequest(orderId: string, expectedDrops = 550) {
    return new NextRequest("http://localhost/api/paypal/capture", {
        method: "POST",
        body: JSON.stringify({ orderId, expectedDrops }),
    });
}

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
        mockState.capturePayPalOrder.mockResolvedValue(buildCompletedCapture());
        mockState.getPayPalOrder.mockResolvedValue({ status: "APPROVED", purchase_units: [] });
        mockState.documents.set("users/fan_1", {
            uid: "fan_1",
            email: "fan@example.com",
            username: "fan_1",
            displayName: "Fan One",
            gumDropsBalance: 0,
            gumDropsPurchasedBalance: 0,
            gumDropsRewardBalance: 0,
        });
        mockState.documents.set("paymentLocks/order_1", buildPendingPayment("order_1"));
    });

    it("rejects an oversized payload before payment reservation, provider capture, or credit", async () => {
        const response = await CAPTURE_POST(new NextRequest("http://localhost/api/paypal/capture", {
            method: "POST",
            body: JSON.stringify({
                orderId: "order_1",
                expectedDrops: 550,
                padding: "x".repeat(32_768),
            }),
        }));
        const payload = await response.json();

        expect(response.status).toBe(413);
        expect(payload).toMatchObject({ code: "payload_too_large", retryable: false });
        expect(mockState.capturePayPalOrder).not.toHaveBeenCalled();
        expect(mockState.getPayPalOrder).not.toHaveBeenCalled();
        expect(mockState.transactionWrites).toHaveLength(0);
        expect(mockState.documents.get("paymentLocks/order_1")).toMatchObject({ status: "pending" });
        expect(mockState.documents.get("users/fan_1")).toMatchObject({ gumDropsBalance: 0 });
    });

    it("returns invalid_payment_request before reserving or capturing an invalid request", async () => {
        const response = await CAPTURE_POST(new NextRequest("http://localhost/api/paypal/capture", {
            method: "POST",
            body: JSON.stringify({ orderId: "bad order id", expectedDrops: -1 }),
        }));
        const payload = await response.json();

        expect(response.status).toBe(400);
        expect(payload).toMatchObject({ code: "invalid_payment_request", retryable: false });
        expect(mockState.capturePayPalOrder).not.toHaveBeenCalled();
        expect(mockState.getPayPalOrder).not.toHaveBeenCalled();
        expect(mockState.transactionWrites).toHaveLength(0);
    });

    it("credits purchased and paid-pack bonus GumDrops into paid-source backend balance", async () => {
        const request = new NextRequest("http://localhost/api/paypal/capture", {
            method: "POST",
            body: JSON.stringify({
                orderId: "order_1",
                expectedDrops: 550,
            }),
        });

        const response = await CAPTURE_POST(request);
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
            paidBaseGd: 500,
            paidBonusGd: 50,
            purchasedCreditGd: 550,
            rewardCreditGd: 0,
            rewardPromoGd: 0,
            purchasedBalanceCreditGumDrops: 550,
            rewardBalanceCreditGumDrops: 0,
            purchaseSourceClassification: "paid_purchase_including_bonus",
            sourceClassification: "paid_purchase_including_bonus",
            sourceOfFundsBreakdown: {
                paidBaseGd: 500,
                paidBonusGd: 50,
                rewardPromoGd: 0,
                purchasedBalanceCreditGd: 550,
                rewardBalanceCreditGd: 0,
            },
            sourceTruth: "server_purchase_transaction",
        });
        expect(mockState.trackServerEvent).toHaveBeenCalledWith("server_purchase_verified", expect.objectContaining({
            order_id: "order_1",
            transaction_id: expect.any(String),
            paypal_capture_id: "capture_1",
            sourceTruth: "canonical",
            purchase_source: "server_paypal_capture",
            idempotency_key: expect.stringContaining("server_purchase_verified:"),
            gross_revenue_cents: 500,
            delivered_gumdrops: 550,
            paid_gumdrops: 500,
            bonus_gumdrops: 50,
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

        const response = await CAPTURE_POST(request);
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
        expect(mockState.capturePayPalOrder).not.toHaveBeenCalled();
        expect(mockState.getPayPalOrder).not.toHaveBeenCalled();
        expect(mockState.trackServerEvent).not.toHaveBeenCalled();
        expect(mockState.recordCanonicalTaskEvent).not.toHaveBeenCalled();
    });

    it("rejects completed captures that are missing the server-created custom id", async () => {
        mockState.documents.set(
            "paymentLocks/order_missing_identity",
            buildPendingPayment("order_missing_identity"),
        );
        mockState.capturePayPalOrder.mockResolvedValue({
            status: "COMPLETED",
            purchase_units: [
                {
                    payments: {
                        captures: [
                            {
                                id: "capture_missing_identity",
                                status: "COMPLETED",
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

        const response = await CAPTURE_POST(request);
        const payload = await response.json();

        expect(response.status).toBe(403);
        expect(payload).toMatchObject({ error: "User verification failed" });
        expect(mockState.documents.get("users/fan_1")).toMatchObject({
            gumDropsBalance: 0,
            gumDropsPurchasedBalance: 0,
            gumDropsRewardBalance: 0,
        });
        expect(mockState.documents.get("paymentLocks/order_missing_identity")).toMatchObject({
            status: "captured_uncredited",
            captureVerification: "blocked",
            recoveryReason: "missing_identity_binding",
        });
        expect(mockState.trackServerEvent).not.toHaveBeenCalled();
        expect(mockState.recordRouteWarning).toHaveBeenCalledWith(
            "paypal/capture",
            "PayPal capture was missing its server-created identity binding",
            undefined,
            expect.any(Object),
        );
    });

    it("rejects captures whose custom id does not match the requested package", async () => {
        mockState.documents.set(
            "paymentLocks/order_package_mismatch",
            buildPendingPayment("order_package_mismatch"),
        );
        mockState.capturePayPalOrder.mockResolvedValue({
            status: "COMPLETED",
            purchase_units: [
                {
                    custom_id: "fan_1:100",
                    payments: {
                        captures: [
                            {
                                id: "capture_package_mismatch",
                                status: "COMPLETED",
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

        const response = await CAPTURE_POST(request);
        const payload = await response.json();

        expect(response.status).toBe(403);
        expect(payload).toMatchObject({ error: "User verification failed" });
        expect(mockState.documents.get("users/fan_1")).toMatchObject({
            gumDropsBalance: 0,
            gumDropsPurchasedBalance: 0,
            gumDropsRewardBalance: 0,
        });
        expect(mockState.documents.get("paymentLocks/order_package_mismatch")).toMatchObject({
            status: "captured_uncredited",
            captureVerification: "blocked",
            recoveryReason: "identity_or_package_binding_mismatch",
        });
        expect(mockState.trackServerEvent).not.toHaveBeenCalled();
    });

    it("rejects malformed custom id package bindings", async () => {
        mockState.documents.set(
            "paymentLocks/order_malformed_package",
            buildPendingPayment("order_malformed_package"),
        );
        mockState.capturePayPalOrder.mockResolvedValue({
            status: "COMPLETED",
            purchase_units: [
                {
                    custom_id: "fan_1:550abc",
                    payments: {
                        captures: [
                            {
                                id: "capture_malformed_package",
                                status: "COMPLETED",
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

        const response = await CAPTURE_POST(request);
        const payload = await response.json();

        expect(response.status).toBe(403);
        expect(payload).toMatchObject({ error: "User verification failed" });
        expect(mockState.documents.get("users/fan_1")).toMatchObject({
            gumDropsBalance: 0,
            gumDropsPurchasedBalance: 0,
            gumDropsRewardBalance: 0,
        });
        expect(mockState.documents.get("paymentLocks/order_malformed_package")).toMatchObject({
            status: "captured_uncredited",
            captureVerification: "blocked",
            recoveryReason: "missing_identity_binding",
        });
        expect(mockState.trackServerEvent).not.toHaveBeenCalled();
    });

    it("rejects a missing server-owned pending order before any provider capture", async () => {
        const response = await CAPTURE_POST(captureRequest("order_missing"));
        const payload = await response.json();

        expect(response.status).toBe(404);
        expect(payload).toMatchObject({
            code: "pending_payment_order_missing",
            retryable: false,
        });
        expect(mockState.capturePayPalOrder).not.toHaveBeenCalled();
        expect(mockState.getPayPalOrder).not.toHaveBeenCalled();
    });

    it.each([
        {
            label: "owner",
            orderId: "order_wrong_owner",
            state: buildPendingPayment("order_wrong_owner", { userId: "fan_2", customId: "fan_2:550" }),
            expectedStatus: 403,
            expectedCode: "payment_order_owner_mismatch",
        },
        {
            label: "package",
            orderId: "order_wrong_package",
            state: buildPendingPayment("order_wrong_package", {
                expectedDrops: 100,
                drops: 100,
                expectedPrice: "1.00",
                customId: "fan_1:100",
            }),
            expectedStatus: 400,
            expectedCode: "payment_order_package_mismatch",
        },
    ])("rejects a mismatched pending-order $label before capture", async ({ orderId, state, expectedStatus, expectedCode }) => {
        mockState.documents.set(`paymentLocks/${orderId}`, state);

        const response = await CAPTURE_POST(captureRequest(orderId));
        const payload = await response.json();

        expect(response.status).toBe(expectedStatus);
        expect(payload).toMatchObject({ code: expectedCode, retryable: false });
        expect(mockState.capturePayPalOrder).not.toHaveBeenCalled();
        expect(mockState.getPayPalOrder).not.toHaveBeenCalled();
    });

    it("allows only one provider capture while a concurrent request observes the reservation", async () => {
        mockState.documents.set("paymentLocks/order_concurrent", buildPendingPayment("order_concurrent"));
        let signalCaptureStarted!: () => void;
        let finishCapture!: (value: ReturnType<typeof buildCompletedCapture>) => void;
        const captureStarted = new Promise<void>((resolve) => {
            signalCaptureStarted = resolve;
        });
        const deferredCapture = new Promise<ReturnType<typeof buildCompletedCapture>>((resolve) => {
            finishCapture = resolve;
        });
        mockState.capturePayPalOrder.mockImplementation(async () => {
            signalCaptureStarted();
            return deferredCapture;
        });

        const firstResponsePromise = CAPTURE_POST(captureRequest("order_concurrent"));
        await captureStarted;
        const concurrentResponse = await CAPTURE_POST(captureRequest("order_concurrent"));
        const concurrentPayload = await concurrentResponse.json();

        expect(concurrentResponse.status).toBe(409);
        expect(concurrentPayload).toMatchObject({
            code: "payment_capture_in_progress",
            retryable: true,
        });
        expect(mockState.capturePayPalOrder).toHaveBeenCalledTimes(1);
        expect(mockState.getPayPalOrder).not.toHaveBeenCalled();

        finishCapture(buildCompletedCapture());
        const firstResponse = await firstResponsePromise;
        expect(firstResponse.status).toBe(200);
        expect(mockState.documents.get("users/fan_1")).toMatchObject({
            gumDropsBalance: 550,
            gumDropsPurchasedBalance: 550,
            gumDropsRewardBalance: 0,
        });
        expect(mockState.documents.get("paymentLocks/order_concurrent")).toMatchObject({
            status: "credited",
        });
    });

    it("serializes concurrent captured-uncredited retries into one credit", async () => {
        mockState.documents.set("paymentLocks/order_recovery", buildPendingPayment("order_recovery", {
            status: "captured_uncredited",
            captureVerification: "verified",
            captureId: "capture_recovery",
            captureStatus: "COMPLETED",
            capturedAmount: "5.00",
            capturedCurrency: "USD",
            capturedCustomId: "fan_1:550",
            paypalFeeAmount: "0.45",
            netAmount: "4.55",
        }));

        const [firstResponse, secondResponse] = await Promise.all([
            CAPTURE_POST(captureRequest("order_recovery")),
            CAPTURE_POST(captureRequest("order_recovery")),
        ]);
        const payloads = await Promise.all([firstResponse.json(), secondResponse.json()]);

        expect(firstResponse.status).toBe(200);
        expect(secondResponse.status).toBe(200);
        expect(payloads.filter((payload) => payload.duplicate === true)).toHaveLength(1);
        expect(mockState.capturePayPalOrder).not.toHaveBeenCalled();
        expect(mockState.getPayPalOrder).not.toHaveBeenCalled();
        expect(mockState.documents.get("paymentLocks/order_recovery")).toMatchObject({
            status: "credited",
            captureId: "capture_recovery",
        });
        expect(mockState.documents.get("users/fan_1")).toMatchObject({
            gumDropsBalance: 550,
            gumDropsPurchasedBalance: 550,
            gumDropsRewardBalance: 0,
        });
        expect(mockState.transactionWrites.filter((write) => write.path.startsWith("transactions/"))).toHaveLength(1);
    });

    it("keeps captured-uncredited state after credit failure and retries credit exactly once", async () => {
        mockState.documents.set("paymentLocks/order_credit_failure", buildPendingPayment("order_credit_failure"));
        mockState.capturePayPalOrder.mockImplementation(async () => {
            mockState.documents.delete("users/fan_1");
            return buildCompletedCapture();
        });

        const failedResponse = await CAPTURE_POST(captureRequest("order_credit_failure"));
        expect(failedResponse.status).toBe(500);
        expect(mockState.documents.get("paymentLocks/order_credit_failure")).toMatchObject({
            status: "captured_uncredited",
            captureVerification: "verified",
            captureId: "capture_1",
        });

        mockState.documents.set("users/fan_1", {
            uid: "fan_1",
            email: "fan@example.com",
            username: "fan_1",
            gumDropsBalance: 0,
            gumDropsPurchasedBalance: 0,
            gumDropsRewardBalance: 0,
        });
        const recoveredResponse = await CAPTURE_POST(captureRequest("order_credit_failure"));

        expect(recoveredResponse.status).toBe(200);
        expect(mockState.capturePayPalOrder).toHaveBeenCalledTimes(1);
        expect(mockState.getPayPalOrder).not.toHaveBeenCalled();
        expect(mockState.documents.get("paymentLocks/order_credit_failure")).toMatchObject({ status: "credited" });
        expect(mockState.documents.get("users/fan_1")).toMatchObject({
            gumDropsBalance: 550,
            gumDropsPurchasedBalance: 550,
            gumDropsRewardBalance: 0,
        });
        expect(mockState.transactionWrites.filter((write) => write.path.startsWith("transactions/"))).toHaveLength(1);

        const duplicateResponse = await CAPTURE_POST(captureRequest("order_credit_failure"));
        expect(duplicateResponse.status).toBe(200);
        await expect(duplicateResponse.json()).resolves.toMatchObject({ duplicate: true });
        expect(mockState.capturePayPalOrder).toHaveBeenCalledTimes(1);
        expect(mockState.transactionWrites.filter((write) => write.path.startsWith("transactions/"))).toHaveLength(1);
    });

    it("reconciles an ambiguous provider failure without a second capture", async () => {
        mockState.documents.set("paymentLocks/order_ambiguous", buildPendingPayment("order_ambiguous"));
        mockState.capturePayPalOrder.mockRejectedValue(new Error("provider timeout"));

        const ambiguousResponse = await CAPTURE_POST(captureRequest("order_ambiguous"));
        const ambiguousPayload = await ambiguousResponse.json();
        expect(ambiguousResponse.status).toBe(503);
        expect(ambiguousPayload).toMatchObject({
            code: "payment_capture_recovery_required",
            errorCode: "payment_failed",
            retryable: true,
        });
        expect(mockState.documents.get("paymentLocks/order_ambiguous")).toMatchObject({
            status: "capture_recovery_required",
            recoveryReason: "provider_capture_result_unknown",
        });

        mockState.getPayPalOrder.mockResolvedValue(buildCompletedCapture());
        const recoveredResponse = await CAPTURE_POST(captureRequest("order_ambiguous"));

        expect(recoveredResponse.status).toBe(200);
        expect(mockState.capturePayPalOrder).toHaveBeenCalledTimes(1);
        expect(mockState.getPayPalOrder).toHaveBeenCalledTimes(1);
        expect(mockState.documents.get("paymentLocks/order_ambiguous")).toMatchObject({ status: "credited" });
        expect(mockState.documents.get("users/fan_1")).toMatchObject({ gumDropsBalance: 550 });
    });

    it("re-reserves a stale capture only after provider reconciliation reports it still approved", async () => {
        mockState.documents.set("paymentLocks/order_stale", buildPendingPayment("order_stale", {
            status: "capture_reserved",
            captureAttemptId: "abandoned_attempt",
            captureLeaseExpiresAtMs: 0,
        }));
        mockState.getPayPalOrder.mockResolvedValue({ status: "APPROVED", purchase_units: [] });

        const response = await CAPTURE_POST(captureRequest("order_stale"));

        expect(response.status).toBe(200);
        expect(mockState.getPayPalOrder).toHaveBeenCalledTimes(1);
        expect(mockState.capturePayPalOrder).toHaveBeenCalledTimes(1);
        expect(mockState.documents.get("paymentLocks/order_stale")).toMatchObject({ status: "credited" });
        expect(mockState.documents.get("users/fan_1")).toMatchObject({ gumDropsBalance: 550 });
    });

    it.each(["5.001", "5.00usd"])("blocks non-canonical provider amount %s", async (amount) => {
        const orderId = `order_amount_${amount.replace(/\W/gu, "_")}`;
        mockState.documents.set(`paymentLocks/${orderId}`, buildPendingPayment(orderId));
        mockState.capturePayPalOrder.mockResolvedValue(buildCompletedCapture("fan_1:550", amount));

        const response = await CAPTURE_POST(captureRequest(orderId));

        expect(response.status).toBe(409);
        expect(mockState.documents.get(`paymentLocks/${orderId}`)).toMatchObject({
            status: "captured_uncredited",
            captureVerification: "blocked",
            recoveryReason: "invalid_capture_amount",
        });
        expect(mockState.documents.get("users/fan_1")).toMatchObject({ gumDropsBalance: 0 });
    });

    it("does not credit an order whose capture itself is still pending", async () => {
        mockState.documents.set("paymentLocks/order_capture_pending", buildPendingPayment("order_capture_pending"));
        mockState.capturePayPalOrder.mockResolvedValue(buildCompletedCapture("fan_1:550", "5.00", "PENDING"));

        const response = await CAPTURE_POST(captureRequest("order_capture_pending"));
        const payload = await response.json();

        expect(response.status).toBe(409);
        expect(payload).toMatchObject({ code: "payment_capture_in_progress", retryable: true });
        expect(mockState.documents.get("paymentLocks/order_capture_pending")).toMatchObject({
            status: "capture_recovery_required",
            providerOrderStatus: "CAPTURE_PENDING",
        });
        expect(mockState.documents.get("users/fan_1")).toMatchObject({ gumDropsBalance: 0 });
    });

    it.each([
        { providerStatus: "VOIDED", code: "payment_capture_terminal" },
        { providerStatus: "PAYER_ACTION_REQUIRED", code: "payment_payer_action_required" },
    ])("classifies $providerStatus recovery without a capture loop", async ({ providerStatus, code }) => {
        const orderId = `order_${providerStatus.toLowerCase()}`;
        mockState.documents.set(`paymentLocks/${orderId}`, buildPendingPayment(orderId, {
            status: "capture_recovery_required",
            captureAttemptId: "prior_attempt",
        }));
        mockState.getPayPalOrder.mockResolvedValue({ status: providerStatus, purchase_units: [] });

        const response = await CAPTURE_POST(captureRequest(orderId));
        const payload = await response.json();

        expect(response.status).toBe(409);
        expect(payload).toMatchObject({ code, retryable: false });
        expect(mockState.capturePayPalOrder).not.toHaveBeenCalled();
        expect(mockState.documents.get(`paymentLocks/${orderId}`)).toMatchObject({
            status: "capture_recovery_required",
            providerOrderStatus: providerStatus,
        });
    });

    it("settles the durable price agreed at order creation after the catalog price changes", async () => {
        mockState.documents.set("paymentLocks/order_old_price", buildPendingPayment("order_old_price", {
            expectedPrice: "4.00",
        }));
        mockState.capturePayPalOrder.mockResolvedValue(buildCompletedCapture("fan_1:550", "4.00"));

        const response = await CAPTURE_POST(captureRequest("order_old_price"));

        expect(response.status).toBe(200);
        expect(mockState.documents.get("users/fan_1")).toMatchObject({
            gumDropsBalance: 550,
            gumDropsPurchasedBalance: 550,
            gumDropsRewardBalance: 0,
        });
        const purchaseWrite = mockState.transactionWrites.find((write) => write.path.startsWith("transactions/"));
        expect(purchaseWrite?.data).toMatchObject({
            grossRevenueCents: 400,
            paidGumDrops: 400,
            bonusGumDrops: 150,
        });
    });

    it("recovers a captured-uncredited package even after that package leaves the catalog", async () => {
        mockState.documents.set("paymentLocks/order_retired_package", buildPendingPayment("order_retired_package", {
            expectedDrops: 777,
            drops: 777,
            expectedPrice: "7.00",
            customId: "fan_1:777",
            status: "captured_uncredited",
            captureVerification: "verified",
            captureId: "capture_retired_package",
            captureStatus: "COMPLETED",
            capturedAmount: "7.00",
            capturedCurrency: "USD",
            capturedCustomId: "fan_1:777",
            paypalFeeAmount: "0.73",
            netAmount: "6.27",
        }));

        const response = await CAPTURE_POST(captureRequest("order_retired_package", 777));

        expect(response.status).toBe(200);
        expect(mockState.capturePayPalOrder).not.toHaveBeenCalled();
        expect(mockState.getPayPalOrder).not.toHaveBeenCalled();
        expect(mockState.documents.get("paymentLocks/order_retired_package")).toMatchObject({ status: "credited" });
        expect(mockState.documents.get("users/fan_1")).toMatchObject({
            gumDropsBalance: 777,
            gumDropsPurchasedBalance: 777,
            gumDropsRewardBalance: 0,
        });
    });

    it("rejects late capture evidence from an expired reservation and recovers through provider read", async () => {
        mockState.documents.set("paymentLocks/order_stale_response", buildPendingPayment("order_stale_response"));
        let signalCaptureStarted!: () => void;
        let finishCapture!: (value: ReturnType<typeof buildCompletedCapture>) => void;
        const captureStarted = new Promise<void>((resolve) => { signalCaptureStarted = resolve; });
        const deferredCapture = new Promise<ReturnType<typeof buildCompletedCapture>>((resolve) => { finishCapture = resolve; });
        mockState.capturePayPalOrder.mockImplementation(async () => {
            signalCaptureStarted();
            return deferredCapture;
        });

        const staleResponsePromise = CAPTURE_POST(captureRequest("order_stale_response"));
        await captureStarted;
        mockState.documents.set("paymentLocks/order_stale_response", {
            ...mockState.documents.get("paymentLocks/order_stale_response"),
            captureAttemptId: "newer_attempt",
            captureLeaseExpiresAtMs: Date.now() + 60_000,
        });
        finishCapture(buildCompletedCapture());

        const staleResponse = await staleResponsePromise;
        expect(staleResponse.status).toBe(500);
        expect(mockState.documents.get("paymentLocks/order_stale_response")).toMatchObject({
            status: "capture_reserved",
            captureAttemptId: "newer_attempt",
        });
        expect(mockState.documents.get("users/fan_1")).toMatchObject({ gumDropsBalance: 0 });

        mockState.documents.set("paymentLocks/order_stale_response", {
            ...mockState.documents.get("paymentLocks/order_stale_response"),
            captureLeaseExpiresAtMs: 0,
        });
        mockState.getPayPalOrder.mockResolvedValue(buildCompletedCapture());
        const recoveredResponse = await CAPTURE_POST(captureRequest("order_stale_response"));

        expect(recoveredResponse.status).toBe(200);
        expect(mockState.capturePayPalOrder).toHaveBeenCalledTimes(1);
        expect(mockState.getPayPalOrder).toHaveBeenCalledTimes(1);
        expect(mockState.documents.get("users/fan_1")).toMatchObject({ gumDropsBalance: 550 });
    });

    it("does not let a stale reconciliation result overwrite a newer capture reservation", async () => {
        mockState.documents.set("paymentLocks/order_stale_reconcile", buildPendingPayment("order_stale_reconcile", {
            status: "capture_recovery_required",
            captureAttemptId: "attempt_a",
            captureLeaseExpiresAtMs: 0,
        }));
        let signalLookupStarted!: () => void;
        let finishLookup!: (value: { status: string; purchase_units: never[] }) => void;
        const lookupStarted = new Promise<void>((resolve) => { signalLookupStarted = resolve; });
        const deferredLookup = new Promise<{ status: string; purchase_units: never[] }>((resolve) => { finishLookup = resolve; });
        mockState.getPayPalOrder.mockImplementation(async () => {
            signalLookupStarted();
            return deferredLookup;
        });

        const staleResponsePromise = CAPTURE_POST(captureRequest("order_stale_reconcile"));
        await lookupStarted;
        mockState.documents.set("paymentLocks/order_stale_reconcile", {
            ...mockState.documents.get("paymentLocks/order_stale_reconcile"),
            status: "capture_reserved",
            captureAttemptId: "attempt_b",
            captureLeaseExpiresAtMs: Date.now() + 60_000,
        });
        finishLookup({ status: "VOIDED", purchase_units: [] });

        const staleResponse = await staleResponsePromise;
        const payload = await staleResponse.json();
        expect(staleResponse.status).toBe(409);
        expect(payload).toMatchObject({ code: "payment_capture_in_progress", retryable: true });
        expect(mockState.documents.get("paymentLocks/order_stale_reconcile")).toMatchObject({
            status: "capture_reserved",
            captureAttemptId: "attempt_b",
        });
        expect(mockState.capturePayPalOrder).not.toHaveBeenCalled();
        expect(mockState.documents.get("users/fan_1")).toMatchObject({ gumDropsBalance: 0 });
    });
});

describe("POST /api/paypal/create", () => {
    beforeEach(() => {
        mockState.reset();
        mockState.guardApiRequest.mockResolvedValue({ uid: "fan_1", email: "fan@example.com" });
        mockState.handleApiError.mockImplementation((error: Error) => NextResponse.json({
            error: error.message,
        }, { status: 500 }));
        mockState.getPayPalAccessToken.mockResolvedValue("access_token");
        mockState.createPayPalOrder.mockResolvedValue({ id: "order_created" });
    });

    it("rejects an oversized payload before requesting a provider token or creating an order", async () => {
        const response = await CREATE_POST(new NextRequest("http://localhost/api/paypal/create", {
            method: "POST",
            body: JSON.stringify({ expectedDrops: 550, padding: "x".repeat(32_768) }),
        }));
        const payload = await response.json();

        expect(response.status).toBe(413);
        expect(payload).toMatchObject({ code: "payload_too_large", retryable: false });
        expect(mockState.getPayPalAccessToken).not.toHaveBeenCalled();
        expect(mockState.createPayPalOrder).not.toHaveBeenCalled();
        expect(mockState.transactionWrites).toHaveLength(0);
        expect(mockState.documents.has("paymentLocks/order_created")).toBe(false);
    });

    it("returns invalid_payment_request for an unknown GumDrop package", async () => {
        const response = await CREATE_POST(new NextRequest("http://localhost/api/paypal/create", {
            method: "POST",
            body: JSON.stringify({ expectedDrops: 123 }),
        }));
        const payload = await response.json();

        expect(response.status).toBe(400);
        expect(payload).toMatchObject({ code: "invalid_payment_request", retryable: false });
        expect(mockState.getPayPalAccessToken).not.toHaveBeenCalled();
        expect(mockState.createPayPalOrder).not.toHaveBeenCalled();
    });

    it("returns payment_failed without persisting an order when the provider is unavailable", async () => {
        mockState.createPayPalOrder.mockRejectedValue(new Error("provider unavailable"));

        const response = await CREATE_POST(new NextRequest("http://localhost/api/paypal/create", {
            method: "POST",
            body: JSON.stringify({ expectedDrops: 550 }),
        }));
        const payload = await response.json();

        expect(response.status).toBe(502);
        expect(payload).toMatchObject({ code: "payment_failed", retryable: true });
        expect(mockState.transactionWrites).toHaveLength(0);
        expect(mockState.documents.has("paymentLocks/order_created")).toBe(false);
    });

    it("persists a server-owned pending order before returning its provider id", async () => {
        const response = await CREATE_POST(new NextRequest("http://localhost/api/paypal/create", {
            method: "POST",
            body: JSON.stringify({ expectedDrops: 550 }),
        }));
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload).toMatchObject({ id: "order_created", transactionId: "order_created" });
        expect(mockState.documents.get("paymentLocks/order_created")).toMatchObject({
            orderId: "order_created",
            userId: "fan_1",
            expectedDrops: 550,
            drops: 550,
            expectedPrice: "5.00",
            currency: "USD",
            customId: "fan_1:550",
            status: "pending",
        });
    });

    it("does not return an order id when pending-state persistence fails", async () => {
        mockState.failNextCommitForPath("paymentLocks/order_created");

        const response = await CREATE_POST(new NextRequest("http://localhost/api/paypal/create", {
            method: "POST",
            body: JSON.stringify({ expectedDrops: 550 }),
        }));
        const payload = await response.json();

        expect(response.status).toBe(500);
        expect(payload).not.toHaveProperty("id");
        expect(mockState.documents.has("paymentLocks/order_created")).toBe(false);
        expect(mockState.createPayPalOrder).toHaveBeenCalledTimes(1);
    });
});
