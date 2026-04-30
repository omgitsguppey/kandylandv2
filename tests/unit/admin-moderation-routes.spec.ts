import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
    guardApiRequest: vi.fn(),
    handleApiError: vi.fn(),
    listAdminModerationThreads: vi.fn(),
    getAdminModerationThreadDetail: vi.fn(),
    listAdminModerationSecurityAlerts: vi.fn(),
    recordRouteRuntimeSample: vi.fn(),
    getErrorMessage: vi.fn((error: unknown) => error instanceof Error ? error.message : String(error)),
    reset() {
        this.guardApiRequest.mockReset();
        this.handleApiError.mockReset();
        this.listAdminModerationThreads.mockReset();
        this.getAdminModerationThreadDetail.mockReset();
        this.listAdminModerationSecurityAlerts.mockReset();
        this.recordRouteRuntimeSample.mockReset();
    },
}));

vi.mock("@/lib/server/request-guard", () => ({
    guardApiRequest: mockState.guardApiRequest,
}));
vi.mock("@/lib/server/auth", () => ({
    handleApiError: mockState.handleApiError,
}));
vi.mock("@/lib/server/admin-moderation", () => ({
    listAdminModerationThreads: mockState.listAdminModerationThreads,
    getAdminModerationThreadDetail: mockState.getAdminModerationThreadDetail,
    listAdminModerationSecurityAlerts: mockState.listAdminModerationSecurityAlerts,
}));
vi.mock("@/lib/server/rate-limit", () => ({
    ADMIN: {},
    HEAVY_READ: {},
}));
vi.mock("@/lib/server/route-runtime-health", () => ({
    recordRouteRuntimeSample: mockState.recordRouteRuntimeSample,
}));
vi.mock("@/lib/server/route-diagnostics", () => ({
    getErrorMessage: mockState.getErrorMessage,
}));

import { GET as getThreads } from "@/app/api/admin/moderation/threads/route";
import { GET as getThreadDetail } from "@/app/api/admin/moderation/threads/[threadId]/route";
import { GET as getSecurityAlerts } from "@/app/api/admin/moderation/security-alerts/route";

describe("admin moderation routes", () => {
    beforeEach(() => {
        mockState.reset();
        mockState.guardApiRequest.mockResolvedValue({ uid: "admin_1" });
        mockState.handleApiError.mockImplementation((error: unknown) => NextResponse.json({
            error: error instanceof Error ? error.message : String(error),
        }, { status: 500 }));
    });

    it("returns the server-backed moderation thread list", async () => {
        mockState.listAdminModerationThreads.mockResolvedValue([{
            id: "thread_1",
            creatorId: "creator_1",
            userId: "user_1",
            lastMessageAt: 100,
            lastMessagePreview: "hello",
            messageCount: 1,
            unreadCountForCreator: 1,
            unreadCountForUser: 0,
            subscriberChatFree: false,
        }]);

        const response = await getThreads(new NextRequest("http://localhost/api/admin/moderation/threads"));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.threads).toHaveLength(1);
        expect(mockState.recordRouteRuntimeSample).toHaveBeenCalledWith(expect.objectContaining({
            key: "admin/moderation/threads:GET",
            statusCode: 200,
        }));
    });

    it("returns the selected moderation thread detail and exchanged files", async () => {
        mockState.getAdminModerationThreadDetail.mockResolvedValue({
            thread: {
                id: "thread_1",
                creatorId: "creator_1",
                userId: "user_1",
                lastMessageAt: 100,
                lastMessagePreview: "hello",
                messageCount: 1,
                unreadCountForCreator: 1,
                unreadCountForUser: 0,
                subscriberChatFree: false,
            },
            messages: [{
                id: "message_1",
                threadId: "thread_1",
                creatorId: "creator_1",
                userId: "user_1",
                senderRole: "user",
                messageKind: "image",
                assetUrl: "https://cdn.example.com/file.png",
                costGd: 5,
                createdAt: 100,
            }],
        });

        const response = await getThreadDetail(
            new NextRequest("http://localhost/api/admin/moderation/threads/thread_1"),
            { params: Promise.resolve({ threadId: "thread_1" }) },
        );
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.thread?.id).toBe("thread_1");
        expect(body.messages[0].assetUrl).toBe("https://cdn.example.com/file.png");
        expect(mockState.recordRouteRuntimeSample).toHaveBeenCalledWith(expect.objectContaining({
            key: "admin/moderation/threads/[threadId]:GET",
            statusCode: 200,
        }));
    });

    it("returns the primary moderation security alert feed", async () => {
        mockState.listAdminModerationSecurityAlerts.mockResolvedValue([{
            id: "alert_1",
            userId: "user_1",
            username: "userone",
            label: "Screenshot attempt",
            message: "Screenshot capture blocked.",
            reason: "screenshot_blocked",
            severity: "high",
            detectionKind: "runtime",
            pagePath: "/dashboard/viewer",
            dropId: "drop_1",
            assetKey: "asset_1",
            timestamp: 123,
        }]);

        const response = await getSecurityAlerts(new NextRequest("http://localhost/api/admin/moderation/security-alerts"));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.alerts).toHaveLength(1);
        expect(body.alerts[0].severity).toBe("high");
        expect(body.verification.module).toBe("admin_moderation_security_alerts");
        expect(body.verification.status).toBe("live");
        expect(mockState.recordRouteRuntimeSample).toHaveBeenCalledWith(expect.objectContaining({
            key: "admin/moderation/security-alerts:GET",
            statusCode: 200,
        }));
    });
});
