import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => {
    const userDocs = new Map<string, Record<string, unknown>>();

    return {
        guardApiRequest: vi.fn(),
        safeListChatThreadsForViewer: vi.fn(),
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
            this.safeListChatThreadsForViewer.mockReset();
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
    safeListChatThreadsForViewer: mockState.safeListChatThreadsForViewer,
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

import { GET } from "@/app/api/chat/threads/route";

describe("GET /api/chat/threads", () => {
    beforeEach(() => {
        mockState.reset();
        mockState.handleApiError.mockImplementation((error: unknown) => NextResponse.json({
            error: error instanceof Error ? error.message : String(error),
        }, { status: 500 }));
    });

    it("uses user viewer role when a creator thread is requested", async () => {
        mockState.guardApiRequest.mockResolvedValue({ uid: "fan_1" });
        mockState.userDocs.set("fan_1", { role: "user" });
        mockState.safeListChatThreadsForViewer.mockResolvedValue({
            threads: [{ id: "creator_creator_1__user_fan_1" }],
            selectedThreadId: "creator_creator_1__user_fan_1",
        });

        const response = await GET(new NextRequest("http://localhost/api/chat/threads?creatorId=creator_1"));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(mockState.safeListChatThreadsForViewer).toHaveBeenCalledWith({
            viewerUid: "fan_1",
            viewerRole: "user",
            creatorId: "creator_1",
        });
        expect(body.selectedThreadId).toBe("creator_creator_1__user_fan_1");
    });

    it("uses creator viewer role for creator operators without a creator filter", async () => {
        mockState.guardApiRequest.mockResolvedValue({ uid: "creator_1" });
        mockState.userDocs.set("creator_1", { role: "creator" });
        mockState.safeListChatThreadsForViewer.mockResolvedValue({
            threads: [{ id: "creator_creator_1__user_fan_1" }],
            selectedThreadId: null,
        });

        const response = await GET(new NextRequest("http://localhost/api/chat/threads"));

        expect(response.status).toBe(200);
        expect(mockState.safeListChatThreadsForViewer).toHaveBeenCalledWith({
            viewerUid: "creator_1",
            viewerRole: "creator",
            creatorId: null,
        });
    });

    it("uses creator viewer role for approved legacy creators without an upgraded role", async () => {
        mockState.guardApiRequest.mockResolvedValue({ uid: "creator_legacy" });
        mockState.userDocs.set("creator_legacy", {
            role: "user",
            status: "active",
            creatorApplication: {
                approvalStatus: "creator_approved",
            },
        });
        mockState.safeListChatThreadsForViewer.mockResolvedValue({
            threads: [{ id: "creator_creator_legacy__user_fan_1" }],
            selectedThreadId: null,
        });

        const response = await GET(new NextRequest("http://localhost/api/chat/threads"));

        expect(response.status).toBe(200);
        expect(mockState.safeListChatThreadsForViewer).toHaveBeenCalledWith({
            viewerUid: "creator_legacy",
            viewerRole: "creator",
            creatorId: null,
        });
    });
});
