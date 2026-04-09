import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
    guardApiRequest: vi.fn(),
    safeMarkChatThreadReadForViewer: vi.fn(),
    toChatClientError: vi.fn(),
    handleApiError: vi.fn(),
    recordRouteRuntimeSample: vi.fn(),
    getErrorMessage: vi.fn(),
    reset() {
        this.guardApiRequest.mockReset();
        this.safeMarkChatThreadReadForViewer.mockReset();
        this.toChatClientError.mockReset();
        this.handleApiError.mockReset();
        this.recordRouteRuntimeSample.mockReset();
        this.getErrorMessage.mockReset();
    },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/request-guard", () => ({
    guardApiRequest: mockState.guardApiRequest,
}));
vi.mock("@/lib/server/chat", () => ({
    safeMarkChatThreadReadForViewer: mockState.safeMarkChatThreadReadForViewer,
    toChatClientError: mockState.toChatClientError,
}));
vi.mock("@/lib/server/auth", () => ({
    handleApiError: mockState.handleApiError,
}));
vi.mock("@/lib/server/firebase-admin", () => ({
    adminDb: {},
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

import { POST } from "@/app/api/chat/threads/[threadId]/read/route";

describe("POST /api/chat/threads/[threadId]/read", () => {
    beforeEach(() => {
        mockState.reset();
        mockState.toChatClientError.mockReturnValue(null);
        mockState.handleApiError.mockImplementation((error: unknown) => NextResponse.json({
            error: error instanceof Error ? error.message : String(error),
        }, { status: 500 }));
    });

    it("marks the selected thread as read", async () => {
        mockState.guardApiRequest.mockResolvedValue({ uid: "fan_1" });
        mockState.safeMarkChatThreadReadForViewer.mockResolvedValue({
            success: true,
            threadId: "thread_1",
            readAt: 123,
        });

        const response = await POST(new NextRequest("http://localhost/api/chat/threads/thread_1/read", {
            method: "POST",
        }), {
            params: Promise.resolve({ threadId: "thread_1" }),
        });
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(mockState.safeMarkChatThreadReadForViewer).toHaveBeenCalledWith({
            viewerUid: "fan_1",
            threadId: "thread_1",
        });
        expect(body.readAt).toBe(123);
    });
});
