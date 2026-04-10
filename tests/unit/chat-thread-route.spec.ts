import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => {
    const userDocs = new Map<string, Record<string, unknown>>();

    return {
        guardApiRequest: vi.fn(),
        safeGetChatThreadDetailForViewer: vi.fn(),
        safeHideChatThreadForViewer: vi.fn(),
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
            this.safeGetChatThreadDetailForViewer.mockReset();
            this.safeHideChatThreadForViewer.mockReset();
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
    safeGetChatThreadDetailForViewer: mockState.safeGetChatThreadDetailForViewer,
    safeHideChatThreadForViewer: mockState.safeHideChatThreadForViewer,
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

import { DELETE, GET } from "@/app/api/chat/threads/[threadId]/route";

describe("GET /api/chat/threads/[threadId]", () => {
    beforeEach(() => {
        mockState.reset();
        mockState.toChatClientError.mockReturnValue(null);
        mockState.handleApiError.mockImplementation((error: unknown) => NextResponse.json({
            error: error instanceof Error ? error.message : String(error),
        }, { status: 500 }));
    });

    it("returns 404 when the thread is missing", async () => {
        mockState.guardApiRequest.mockResolvedValue({ uid: "fan_1" });
        mockState.userDocs.set("fan_1", { role: "user" });
        mockState.safeGetChatThreadDetailForViewer.mockResolvedValue(null);

        const response = await GET(new NextRequest("http://localhost/api/chat/threads/thread_1"), {
            params: Promise.resolve({ threadId: "thread_1" }),
        });
        const body = await response.json();

        expect(response.status).toBe(404);
        expect(body.errorCode).toBe("thread_not_found");
    });

    it("returns the thread detail payload", async () => {
        mockState.guardApiRequest.mockResolvedValue({ uid: "fan_1" });
        mockState.userDocs.set("fan_1", { role: "user" });
        mockState.safeGetChatThreadDetailForViewer.mockResolvedValue({
            thread: { id: "thread_1" },
            messages: [{ id: "message_1" }],
            pricing: { textPriceGd: 1, imagePriceGd: 5, videoPriceGd: 10 },
            threadExists: true,
        });

        const response = await GET(new NextRequest("http://localhost/api/chat/threads/thread_1"), {
            params: Promise.resolve({ threadId: "thread_1" }),
        });
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.thread.id).toBe("thread_1");
        expect(body.messages).toHaveLength(1);
        expect(body.threadExists).toBe(true);
    });
});

describe("DELETE /api/chat/threads/[threadId]", () => {
    beforeEach(() => {
        mockState.reset();
        mockState.toChatClientError.mockReturnValue(null);
        mockState.handleApiError.mockImplementation((error: unknown) => NextResponse.json({
            error: error instanceof Error ? error.message : String(error),
        }, { status: 500 }));
    });

    it("hides the thread for the caller", async () => {
        mockState.guardApiRequest.mockResolvedValue({ uid: "fan_1" });
        mockState.safeHideChatThreadForViewer.mockResolvedValue({
            success: true,
            threadId: "thread_1",
            hiddenAt: 123456789,
        });

        const response = await DELETE(new NextRequest("http://localhost/api/chat/threads/thread_1"), {
            params: Promise.resolve({ threadId: "thread_1" }),
        });
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(mockState.safeHideChatThreadForViewer).toHaveBeenCalledWith({
            viewerUid: "fan_1",
            threadId: "thread_1",
        });
        expect(body).toMatchObject({
            success: true,
            threadId: "thread_1",
            hiddenAt: 123456789,
        });
    });
});
