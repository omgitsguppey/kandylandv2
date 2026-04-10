import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => {
    const userDocs = new Map<string, Record<string, unknown>>();

    return {
        guardApiRequest: vi.fn(),
        safeSendChatMessageForViewer: vi.fn(),
        toChatClientError: vi.fn(),
        handleApiError: vi.fn(),
        recordRouteRuntimeSample: vi.fn(),
        getErrorMessage: vi.fn(),
        adminDb: {
            collection(name: string) {
                return {
                    doc(id: string) {
                        return {
                            async get() {
                                return {
                                    exists: name === "users" ? userDocs.has(id) : false,
                                    data: () => userDocs.get(id),
                                };
                            },
                        };
                    },
                };
            },
        },
        userDocs,
        reset() {
            userDocs.clear();
            this.guardApiRequest.mockReset();
            this.safeSendChatMessageForViewer.mockReset();
            this.toChatClientError.mockReset();
            this.handleApiError.mockReset();
            this.recordRouteRuntimeSample.mockReset();
            this.getErrorMessage.mockReset();
        },
    };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/request-guard", () => ({
    guardApiRequest: mockState.guardApiRequest,
}));
vi.mock("@/lib/server/chat", () => ({
    safeSendChatMessageForViewer: mockState.safeSendChatMessageForViewer,
    toChatClientError: mockState.toChatClientError,
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
vi.mock("@/lib/server/route-runtime-health", () => ({
    recordRouteRuntimeSample: mockState.recordRouteRuntimeSample,
}));
vi.mock("@/lib/server/route-diagnostics", () => ({
    getErrorMessage: mockState.getErrorMessage,
}));

import { POST } from "@/app/api/chat/threads/[threadId]/messages/route";

describe("POST /api/chat/threads/[threadId]/messages", () => {
    beforeEach(() => {
        mockState.reset();
        mockState.toChatClientError.mockReturnValue(null);
        mockState.handleApiError.mockImplementation((error: unknown) => NextResponse.json({
            error: error instanceof Error ? error.message : String(error),
        }, { status: 500 }));
    });

    it("sends a message with the structured chat helper", async () => {
        mockState.guardApiRequest.mockResolvedValue({ uid: "fan_1", email: "fan@example.com" });
        mockState.userDocs.set("fan_1", { role: "user" });
        mockState.safeSendChatMessageForViewer.mockResolvedValue({
            thread: { id: "thread_1" },
            message: { id: "message_1" },
            pricing: { purchasedBalanceGd: 9 },
        });

        const response = await POST(new NextRequest("http://localhost/api/chat/threads/thread_1/messages", {
            method: "POST",
            body: JSON.stringify({
                text: "hello",
                messageKind: "text",
            }),
        }), {
            params: Promise.resolve({ threadId: "thread_1" }),
        });
        const body = await response.json();

        expect(response.status).toBe(201);
        expect(mockState.safeSendChatMessageForViewer).toHaveBeenCalledWith({
            callerUid: "fan_1",
            callerEmail: "fan@example.com",
            callerRole: "user",
            threadId: "thread_1",
            text: "hello",
            messageKind: "text",
        });
        expect(body.success).toBe(true);
        expect(body.message).toMatchObject({ id: "message_1" });
        expect(body.pricing).toMatchObject({ purchasedBalanceGd: 9 });
    });

    it("returns structured insufficient-funds style chat errors", async () => {
        mockState.guardApiRequest.mockResolvedValue({ uid: "fan_1", email: "fan@example.com" });
        mockState.userDocs.set("fan_1", { role: "user" });
        mockState.safeSendChatMessageForViewer.mockRejectedValue(new Error("insufficient"));
        mockState.toChatClientError.mockReturnValue({
            status: 409,
            body: {
                error: "Insufficient paid Gum Drops.",
                errorCode: "insufficient_paid_gumdrops",
                requiredPriceGd: 5,
                purchasedBalanceGd: 2,
                paidGdShortfall: 3,
                subscriberFreeChatApplies: false,
                messageKind: "image",
            },
        });

        const response = await POST(new NextRequest("http://localhost/api/chat/threads/thread_1/messages", {
            method: "POST",
            body: JSON.stringify({
                text: "send image",
                messageKind: "image",
            }),
        }), {
            params: Promise.resolve({ threadId: "thread_1" }),
        });
        const body = await response.json();

        expect(response.status).toBe(409);
        expect(body.errorCode).toBe("insufficient_paid_gumdrops");
        expect(body.paidGdShortfall).toBe(3);
    });
});
