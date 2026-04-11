import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => {
    const userDocs = new Map<string, Record<string, unknown>>();

    return {
        guardApiRequest: vi.fn(),
        handleApiError: vi.fn(),
        safeGetChatThreadDetailForViewer: vi.fn(),
        safeListChatThreadsForViewer: vi.fn(),
        safeSendChatMessageForViewer: vi.fn(),
        toChatClientError: vi.fn(),
        recordRouteRuntimeSample: vi.fn(),
        getErrorMessage: vi.fn(),
        adminDb: {
            collection(name: string) {
                return {
                    doc(id: string) {
                        return {
                            async get() {
                                return {
                                    id,
                                    exists: name === "users" ? userDocs.has(id) : false,
                                    data: () => name === "users" ? userDocs.get(id) : undefined,
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
            this.handleApiError.mockReset();
            this.safeGetChatThreadDetailForViewer.mockReset();
            this.safeListChatThreadsForViewer.mockReset();
            this.safeSendChatMessageForViewer.mockReset();
            this.toChatClientError.mockReset();
            this.recordRouteRuntimeSample.mockReset();
            this.getErrorMessage.mockReset();
        },
    };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/chat", () => ({
    buildChatThreadId: (creatorId: string, userId: string) => `creator_${creatorId}__user_${userId}`,
    CHAT_COLLECTIONS: {
        messages: "creator_messages",
    },
}));
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
vi.mock("@/lib/server/route-runtime-health", () => ({
    recordRouteRuntimeSample: mockState.recordRouteRuntimeSample,
}));
vi.mock("@/lib/server/route-diagnostics", () => ({
    getErrorMessage: mockState.getErrorMessage,
}));
vi.mock("@/lib/server/chat", () => ({
    safeGetChatThreadDetailForViewer: mockState.safeGetChatThreadDetailForViewer,
    safeListChatThreadsForViewer: mockState.safeListChatThreadsForViewer,
    safeSendChatMessageForViewer: mockState.safeSendChatMessageForViewer,
    toChatClientError: mockState.toChatClientError,
}));

import { GET, POST } from "@/app/api/creator/messages/route";

describe("creator/messages compatibility route", () => {
    beforeEach(() => {
        mockState.reset();
        mockState.handleApiError.mockImplementation((error: unknown) => NextResponse.json({
            error: error instanceof Error ? error.message : String(error),
        }, { status: 500 }));
        mockState.toChatClientError.mockReturnValue(null);
        mockState.getErrorMessage.mockImplementation((error: unknown) => error instanceof Error ? error.message : String(error));
    });

    it("returns thread messages for the current viewer", async () => {
        mockState.guardApiRequest.mockResolvedValue({ uid: "fan_1", email: "fan@example.com" });
        mockState.userDocs.set("fan_1", { role: "user" });
        mockState.safeGetChatThreadDetailForViewer.mockResolvedValue({
            thread: { id: "creator_creator_1__user_fan_1", userId: "fan_1" },
            messages: [{ id: "message_1", text: "hello" }],
        });

        const response = await GET(new NextRequest("http://localhost/api/creator/messages?threadId=creator_creator_1__user_fan_1"));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(mockState.safeGetChatThreadDetailForViewer).toHaveBeenCalledWith({
            viewerUid: "fan_1",
            callerRole: "user",
            threadId: "creator_creator_1__user_fan_1",
        });
        expect(mockState.recordRouteRuntimeSample).toHaveBeenCalledWith(expect.objectContaining({
            key: "creator/messages:GET",
            statusCode: 200,
        }));
        expect(body.thread).toMatchObject({ id: "creator_creator_1__user_fan_1" });
        expect(body.messages).toHaveLength(1);
    });

    it("lists creator inbox threads for creator operators", async () => {
        mockState.guardApiRequest.mockResolvedValue({ uid: "creator_1", email: "creator@example.com" });
        mockState.userDocs.set("creator_1", { role: "creator" });
        mockState.safeListChatThreadsForViewer.mockResolvedValue({
            threads: [{ id: "creator_creator_1__user_fan_1" }],
            selectedThreadId: null,
        });

        const response = await GET(new NextRequest("http://localhost/api/creator/messages"));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(mockState.safeListChatThreadsForViewer).toHaveBeenCalledWith({
            viewerUid: "creator_1",
            viewerRole: "creator",
        });
        expect(mockState.recordRouteRuntimeSample).toHaveBeenCalledWith(expect.objectContaining({
            key: "creator/messages:GET",
            statusCode: 200,
        }));
        expect(body.threads).toHaveLength(1);
    });

    it("forwards legacy sends into the chat send helper", async () => {
        mockState.guardApiRequest.mockResolvedValue({ uid: "fan_1", email: "fan@example.com" });
        mockState.userDocs.set("fan_1", { role: "user" });
        mockState.safeSendChatMessageForViewer.mockResolvedValue({
            threadId: "creator_creator_1__user_fan_1",
            message: { id: "message_1" },
            thread: { id: "creator_creator_1__user_fan_1" },
            pricing: { purchasedBalanceGd: 9 },
            warnings: [{ code: "post_send_tracking_failure", detail: "analytics unavailable" }],
        });

        const response = await POST(new NextRequest("http://localhost/api/creator/messages", {
            method: "POST",
            body: JSON.stringify({
                creatorId: "creator_1",
                text: "hello there",
                messageKind: "text",
            }),
        }));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(mockState.safeSendChatMessageForViewer).toHaveBeenCalledWith({
            callerUid: "fan_1",
            callerEmail: "fan@example.com",
            callerRole: "user",
            threadId: "creator_creator_1__user_fan_1",
            text: "hello there",
            assetUrl: undefined,
            assetName: undefined,
            assetMimeType: undefined,
            messageKind: "text",
        });
        expect(mockState.recordRouteRuntimeSample).toHaveBeenCalledWith(expect.objectContaining({
            key: "creator/messages:POST",
            statusCode: 200,
        }));
        expect(body.success).toBe(true);
        expect(body.thread).toMatchObject({ id: "creator_creator_1__user_fan_1" });
        expect(body.pricing).toMatchObject({ purchasedBalanceGd: 9 });
        expect(body.warnings).toHaveLength(1);
    });

    it("returns a stable invalid request payload error for malformed sends", async () => {
        mockState.guardApiRequest.mockResolvedValue({ uid: "fan_1", email: "fan@example.com" });
        mockState.userDocs.set("fan_1", { role: "user" });

        const response = await POST(new NextRequest("http://localhost/api/creator/messages", {
            method: "POST",
            body: JSON.stringify({
                creatorId: "",
                text: "hello there",
                messageKind: "text",
            }),
        }));
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.errorCode).toBe("invalid_message_request");
        expect(mockState.safeSendChatMessageForViewer).not.toHaveBeenCalled();
    });
});
