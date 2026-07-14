import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
    guardApiRequest: vi.fn(),
    handleApiError: vi.fn(),
    listSupportThreadsForAdmin: vi.fn(),
    getSupportThreadForAdmin: vi.fn(),
    addSupportMessage: vi.fn(),
    updateSupportThreadStatus: vi.fn(),
    recordRouteRuntimeSample: vi.fn(),
    reset() {
        this.guardApiRequest.mockReset();
        this.handleApiError.mockReset();
        this.listSupportThreadsForAdmin.mockReset();
        this.getSupportThreadForAdmin.mockReset();
        this.addSupportMessage.mockReset();
        this.updateSupportThreadStatus.mockReset();
        this.recordRouteRuntimeSample.mockReset();
    },
}));

vi.mock("@/lib/server/request-guard", () => ({
    guardApiRequest: mockState.guardApiRequest,
}));

vi.mock("@/lib/server/auth", () => ({
    AuthError: class MockAuthError extends Error {
        status: number;

        constructor(message: string, status: number) {
            super(message);
            this.status = status;
        }
    },
    handleApiError: mockState.handleApiError,
}));

vi.mock("@/lib/server/rate-limit", () => ({
    ADMIN: {},
}));

vi.mock("@/lib/server/support-threads", () => ({
    listSupportThreadsForAdmin: mockState.listSupportThreadsForAdmin,
    getSupportThreadForAdmin: mockState.getSupportThreadForAdmin,
    addSupportMessage: mockState.addSupportMessage,
    updateSupportThreadStatus: mockState.updateSupportThreadStatus,
    isSupportThreadsMissingIndexError: () => false,
}));
vi.mock("@/lib/server/route-runtime-health", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/server/route-runtime-health")>();
    return {
        ...actual,
        recordRouteRuntimeSample: mockState.recordRouteRuntimeSample,
    };
});

import { GET as getAdminThreads } from "@/app/api/admin/support/threads/route";
import { GET as getAdminThread, PATCH as patchAdminThread, POST as postAdminReply } from "@/app/api/admin/support/threads/[threadId]/route";
import { POST as postAdminMessageReply } from "@/app/api/admin/support/threads/[threadId]/messages/route";

describe("admin support thread routes", () => {
    beforeEach(() => {
        mockState.reset();
        mockState.guardApiRequest.mockResolvedValue({
            uid: "admin_1",
            email: "admin@example.com",
        });
        mockState.handleApiError.mockImplementation((error: unknown) => NextResponse.json({
            error: error instanceof Error ? error.message : "error",
        }, { status: typeof (error as { status?: unknown }).status === "number" ? (error as { status: number }).status : 500 }));
    });

    it("lists support threads with summary counts", async () => {
        mockState.listSupportThreadsForAdmin.mockResolvedValue([
            { id: "thread_1", status: "waiting_on_support", category: "technical", channel: "in_app", subject: "Upload issue", createdAt: 1, lastMessageAt: 2 },
            { id: "thread_2", status: "waiting_on_user", category: "billing", channel: "in_app", subject: "Billing question", createdAt: 1, lastMessageAt: 1 },
            { id: "thread_3", status: "resolved", category: "general", channel: "in_app", subject: "Resolved", createdAt: 1, lastMessageAt: 1 },
        ]);

        const response = await getAdminThreads(new NextRequest("http://localhost/api/admin/support/threads?status=all"));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.verification.module).toBe("admin_support_threads");
        expect(body.verification.status).toBe("live");
        expect(body.summary.openCount).toBe(1);
        expect(body.summary.waitingOnUserCount).toBe(1);
        expect(body.summary.resolvedCount).toBe(1);
        expect(mockState.listSupportThreadsForAdmin).toHaveBeenCalledWith({
            status: "all",
            userId: null,
            limit: 200,
        });
    });

    it("reads, replies to, and updates an admin support thread", async () => {
        mockState.getSupportThreadForAdmin
            .mockResolvedValueOnce({
                thread: { id: "thread_1", status: "waiting_on_support", category: "technical", channel: "in_app", subject: "Upload issue", createdAt: 1, lastMessageAt: 2, userId: "user_1", userEmail: "user@example.com", userDisplayName: "User", userHandle: "user", messageCount: 1 },
                messages: [],
            })
            .mockResolvedValueOnce({
                thread: { id: "thread_1", status: "waiting_on_support", category: "technical", channel: "in_app", subject: "Upload issue", createdAt: 1, lastMessageAt: 2, userId: "user_1", userEmail: "user@example.com", userDisplayName: "User", userHandle: "user", messageCount: 1 },
                messages: [],
            })
            .mockResolvedValueOnce({
                thread: { id: "thread_1", status: "waiting_on_user", category: "technical", channel: "in_app", subject: "Upload issue", createdAt: 1, lastMessageAt: 3, userId: "user_1", userEmail: "user@example.com", userDisplayName: "User", userHandle: "user", messageCount: 2 },
                messages: [{ id: "msg_1", threadId: "thread_1", senderRole: "admin", senderId: "admin_1", senderLabel: "admin@example.com", body: "Thanks, looking now.", createdAt: 3 }],
            })
            .mockResolvedValueOnce({
                thread: { id: "thread_1", status: "waiting_on_user", category: "technical", channel: "in_app", subject: "Upload issue", createdAt: 1, lastMessageAt: 3, userId: "user_1", userEmail: "user@example.com", userDisplayName: "User", userHandle: "user", messageCount: 2 },
                messages: [],
            })
            .mockResolvedValueOnce({
                thread: { id: "thread_1", status: "waiting_on_user", category: "technical", channel: "in_app", subject: "Upload issue", createdAt: 1, lastMessageAt: 3, userId: "user_1", userEmail: "user@example.com", userDisplayName: "User", userHandle: "user", messageCount: 2 },
                messages: [{ id: "msg_1", threadId: "thread_1", senderRole: "admin", senderId: "admin_1", senderLabel: "admin@example.com", body: "Thanks, looking now.", createdAt: 3 }],
            })
            .mockResolvedValueOnce({
                thread: { id: "thread_1", status: "waiting_on_user", category: "technical", channel: "in_app", subject: "Upload issue", createdAt: 1, lastMessageAt: 3, userId: "user_1", userEmail: "user@example.com", userDisplayName: "User", userHandle: "user", messageCount: 2 },
                messages: [],
            })
            .mockResolvedValueOnce({
                thread: { id: "thread_1", status: "resolved", category: "technical", channel: "in_app", subject: "Upload issue", createdAt: 1, lastMessageAt: 4, userId: "user_1", userEmail: "user@example.com", userDisplayName: "User", userHandle: "user", messageCount: 2 },
                messages: [],
            });

        const detailResponse = await getAdminThread(
            new NextRequest("http://localhost/api/admin/support/threads/thread_1"),
            { params: Promise.resolve({ threadId: "thread_1" }) },
        );
        const detailBody = await detailResponse.json();
        expect(detailResponse.status).toBe(200);
        expect(detailBody.verification.module).toBe("admin_support_threads_threadId_GET");
        expect(detailBody.verification.canonicalSource).toBe("support_threads/support_messages");

        const legacyReplyResponse = await postAdminReply(
            new NextRequest("http://localhost/api/admin/support/threads/thread_1", {
                method: "POST",
                body: JSON.stringify({ message: "Thanks, looking now." }),
            }),
            { params: Promise.resolve({ threadId: "thread_1" }) },
        );
        expect(legacyReplyResponse.status).toBe(200);

        const replyResponse = await postAdminMessageReply(
            new NextRequest("http://localhost/api/admin/support/threads/thread_1/messages", {
                method: "POST",
                body: JSON.stringify({ message: "Thanks, looking now." }),
            }),
            { params: Promise.resolve({ threadId: "thread_1" }) },
        );
        const replyBody = await replyResponse.json();

        expect(replyBody.thread.status).toBe("waiting_on_user");
        expect(replyBody.verification.module).toBe("admin_support_threads_threadId_messages_POST");
        expect(mockState.addSupportMessage).toHaveBeenCalledWith(expect.objectContaining({
            threadId: "thread_1",
            senderRole: "admin",
        }));

        const statusResponse = await patchAdminThread(
            new NextRequest("http://localhost/api/admin/support/threads/thread_1", {
                method: "PATCH",
                body: JSON.stringify({ status: "resolved" }),
            }),
            { params: Promise.resolve({ threadId: "thread_1" }) },
        );
        const statusBody = await statusResponse.json();

        expect(statusBody.thread.status).toBe("resolved");
        expect(mockState.updateSupportThreadStatus).toHaveBeenCalledWith("thread_1", "resolved");
    });

    it("rejects oversized reply and status payloads before support mutation", async () => {
        mockState.getSupportThreadForAdmin.mockResolvedValue({
            thread: {
                id: "thread_1",
                status: "waiting_on_support",
                category: "technical",
                channel: "in_app",
                subject: "Upload issue",
                createdAt: 1,
                lastMessageAt: 2,
                userId: "user_1",
                userEmail: "user@example.com",
                userDisplayName: "User",
                userHandle: "user",
                messageCount: 1,
            },
            messages: [],
        });

        const oversizedReply = JSON.stringify({
            message: "Thanks, looking now.",
            padding: "x".repeat(64_000),
        });
        const legacyReplyResponse = await postAdminReply(
            new NextRequest("http://localhost/api/admin/support/threads/thread_1", {
                method: "POST",
                body: oversizedReply,
            }),
            { params: Promise.resolve({ threadId: "thread_1" }) },
        );
        const messageReplyResponse = await postAdminMessageReply(
            new NextRequest("http://localhost/api/admin/support/threads/thread_1/messages", {
                method: "POST",
                body: oversizedReply,
            }),
            { params: Promise.resolve({ threadId: "thread_1" }) },
        );
        const statusResponse = await patchAdminThread(
            new NextRequest("http://localhost/api/admin/support/threads/thread_1", {
                method: "PATCH",
                body: JSON.stringify({
                    status: "resolved",
                    padding: "x".repeat(64_000),
                }),
            }),
            { params: Promise.resolve({ threadId: "thread_1" }) },
        );

        for (const response of [legacyReplyResponse, messageReplyResponse, statusResponse]) {
            expect(response.status).toBe(413);
            await expect(response.json()).resolves.toMatchObject({
                success: false,
                code: "payload_too_large",
                retryable: false,
            });
        }
        expect(mockState.addSupportMessage).not.toHaveBeenCalled();
        expect(mockState.updateSupportThreadStatus).not.toHaveBeenCalled();
    });

    it("non-admin cannot call admin support routes", async () => {
        mockState.guardApiRequest.mockRejectedValueOnce(Object.assign(new Error("Admin access required"), { status: 403 }));

        const response = await getAdminThreads(new NextRequest("http://localhost/api/admin/support/threads"));
        const body = await response.json();

        expect(response.status).toBe(403);
        expect(body.error).toBe("Admin access required");
        expect(mockState.listSupportThreadsForAdmin).not.toHaveBeenCalled();
    });

    it("non-admin cannot reply through admin support message route", async () => {
        mockState.guardApiRequest.mockRejectedValueOnce(Object.assign(new Error("Admin access required"), { status: 403 }));

        const response = await postAdminMessageReply(
            new NextRequest("http://localhost/api/admin/support/threads/thread_1/messages", {
                method: "POST",
                body: JSON.stringify({ message: "Forbidden reply" }),
            }),
            { params: Promise.resolve({ threadId: "thread_1" }) },
        );
        const body = await response.json();

        expect(response.status).toBe(403);
        expect(body.error).toBe("Admin access required");
        expect(mockState.addSupportMessage).not.toHaveBeenCalled();
    });
});
