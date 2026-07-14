import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => {
    const profileGet = vi.fn(async () => ({
        exists: true,
        data: () => ({
            displayName: "Support User",
            username: "support-user",
        }),
    }));

    return {
        guardApiRequest: vi.fn(),
        handleApiError: vi.fn(),
        listSupportThreadsForUser: vi.fn(),
        createSupportThread: vi.fn(),
        getSupportThreadForUser: vi.fn(),
        addSupportMessage: vi.fn(),
        updateSupportThreadStatus: vi.fn(),
        trackServerEvent: vi.fn(),
        adminDb: {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    get: profileGet,
                })),
            })),
        },
        profileGet,
        reset() {
            this.guardApiRequest.mockReset();
            this.handleApiError.mockReset();
            this.listSupportThreadsForUser.mockReset();
            this.createSupportThread.mockReset();
            this.getSupportThreadForUser.mockReset();
            this.addSupportMessage.mockReset();
            this.updateSupportThreadStatus.mockReset();
            this.trackServerEvent.mockReset();
            this.adminDb.collection.mockClear();
            this.profileGet.mockClear();
        },
    };
});

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
    STANDARD: {},
    STRICT: {},
}));

vi.mock("@/lib/server/support-threads", () => ({
    listSupportThreadsForUser: mockState.listSupportThreadsForUser,
    createSupportThread: mockState.createSupportThread,
    getSupportThreadForUser: mockState.getSupportThreadForUser,
    addSupportMessage: mockState.addSupportMessage,
    updateSupportThreadStatus: mockState.updateSupportThreadStatus,
}));

vi.mock("@/lib/server/firebase-admin", () => ({
    adminDb: mockState.adminDb,
}));

vi.mock("@/lib/server/analytics", () => ({
    trackServerEvent: mockState.trackServerEvent,
}));

import { GET as getThreads, POST as postThread } from "@/app/api/support/threads/route";
import { GET as getThread, PATCH as patchThread, POST as postReply } from "@/app/api/support/threads/[threadId]/route";
import { POST as postGuestThread } from "@/app/api/support/threads/guest/route";

function buildOversizedSupportRequest(url: string, method: "POST" | "PATCH" = "POST") {
    return new NextRequest(url, {
        method,
        body: JSON.stringify({ padding: "x".repeat(70_000) }),
        headers: {
            "content-type": "application/json",
            "content-length": "1",
        },
    });
}

describe("support thread routes", () => {
    beforeEach(() => {
        mockState.reset();
        mockState.guardApiRequest.mockResolvedValue({
            uid: "user_1",
            email: "user@example.com",
        });
        mockState.handleApiError.mockImplementation((error: unknown) => NextResponse.json({
            error: error instanceof Error ? error.message : "error",
        }, { status: typeof (error as { status?: unknown }).status === "number" ? (error as { status: number }).status : 500 }));
    });

    it("lists the current user's support threads", async () => {
        mockState.listSupportThreadsForUser.mockResolvedValue([
            {
                id: "thread_1",
                status: "waiting_on_support",
                category: "technical",
                channel: "in_app",
                subject: "Upload issue",
                createdAt: 1,
                lastMessageAt: 2,
            },
        ]);

        const response = await getThreads(new NextRequest("http://localhost/api/support/threads"));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.threads).toHaveLength(1);
        expect(mockState.listSupportThreadsForUser).toHaveBeenCalledWith("user_1");
    });

    it("creates a support thread with caller profile context", async () => {
        mockState.createSupportThread.mockResolvedValue({
            thread: {
                id: "thread_1",
                status: "waiting_on_support",
                category: "creator_application",
                channel: "in_app",
                subject: "Creator application support",
                createdAt: 1,
                lastMessageAt: 1,
            },
            messages: [],
        });

        const response = await postThread(new NextRequest("http://localhost/api/support/threads", {
            method: "POST",
            body: JSON.stringify({
                subject: "Creator application support",
                category: "creator_application",
                message: "My review stage looks stuck.",
            }),
        }));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.thread.thread.id).toBe("thread_1");
        expect(mockState.createSupportThread).toHaveBeenCalledWith(expect.objectContaining({
            userId: "user_1",
            userEmail: "user@example.com",
            userDisplayName: "Support User",
            userHandle: "support-user",
            category: "creator_application",
        }));
        expect(mockState.trackServerEvent).toHaveBeenCalledWith("support_ticket_created", expect.objectContaining({
            thread_id: "thread_1",
            ticket_id: "thread_1",
            category: "creator_application",
            source_truth: "server",
        }), "user_1");
    });

    it("rejects oversized authenticated thread creation before profile reads, writes, or telemetry", async () => {
        const response = await postThread(buildOversizedSupportRequest("http://localhost/api/support/threads"));
        const body = await response.json();

        expect(response.status).toBe(413);
        expect(body).toMatchObject({
            success: false,
            errorCode: "payload_too_large",
            retryable: false,
        });
        expect(mockState.adminDb.collection).not.toHaveBeenCalled();
        expect(mockState.createSupportThread).not.toHaveBeenCalled();
        expect(mockState.trackServerEvent).not.toHaveBeenCalled();
        expect(mockState.handleApiError).not.toHaveBeenCalled();
    });

    it("rejects oversized guest intake before thread creation", async () => {
        const response = await postGuestThread(buildOversizedSupportRequest("http://localhost/api/support/threads/guest"));
        const body = await response.json();

        expect(response.status).toBe(413);
        expect(body).toMatchObject({
            success: false,
            errorCode: "payload_too_large",
            retryable: false,
        });
        expect(mockState.createSupportThread).not.toHaveBeenCalled();
        expect(mockState.trackServerEvent).not.toHaveBeenCalled();
        expect(mockState.handleApiError).not.toHaveBeenCalled();
    });

    it("preserves valid guest support intake", async () => {
        mockState.createSupportThread.mockResolvedValue({
            thread: { id: "guest_thread_1" },
            messages: [],
        });

        const response = await postGuestThread(new NextRequest("http://localhost/api/support/threads/guest", {
            method: "POST",
            body: JSON.stringify({
                email: "guest@example.com",
                displayName: "Guest User",
                subject: "I need account help",
                category: "account",
                message: "I cannot access my existing account.",
                sourcePath: "/login",
            }),
        }));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toEqual({ success: true, threadId: "guest_thread_1" });
        expect(mockState.createSupportThread).toHaveBeenCalledWith(expect.objectContaining({
            userId: "guest:guest@example.com",
            userEmail: "guest@example.com",
            userDisplayName: "Guest User",
            sourcePath: "/login",
        }));
    });

    it("rejects oversized replies before thread reads, message writes, or telemetry", async () => {
        const response = await postReply(
            buildOversizedSupportRequest("http://localhost/api/support/threads/thread_1"),
            { params: Promise.resolve({ threadId: "thread_1" }) },
        );
        const body = await response.json();

        expect(response.status).toBe(413);
        expect(body).toMatchObject({
            success: false,
            errorCode: "payload_too_large",
            retryable: false,
        });
        expect(mockState.getSupportThreadForUser).not.toHaveBeenCalled();
        expect(mockState.addSupportMessage).not.toHaveBeenCalled();
        expect(mockState.trackServerEvent).not.toHaveBeenCalled();
        expect(mockState.handleApiError).not.toHaveBeenCalled();
    });

    it("rejects oversized status changes before thread reads or writes", async () => {
        const response = await patchThread(
            buildOversizedSupportRequest("http://localhost/api/support/threads/thread_1", "PATCH"),
            { params: Promise.resolve({ threadId: "thread_1" }) },
        );
        const body = await response.json();

        expect(response.status).toBe(413);
        expect(body).toMatchObject({
            success: false,
            errorCode: "payload_too_large",
            retryable: false,
        });
        expect(mockState.getSupportThreadForUser).not.toHaveBeenCalled();
        expect(mockState.updateSupportThreadStatus).not.toHaveBeenCalled();
        expect(mockState.handleApiError).not.toHaveBeenCalled();
    });

    it("returns thread detail and allows replies and resolution", async () => {
        mockState.getSupportThreadForUser
            .mockResolvedValueOnce({
                thread: { id: "thread_1", status: "waiting_on_support", category: "technical", channel: "in_app", subject: "Upload issue", createdAt: 1, lastMessageAt: 2 },
                messages: [],
            })
            .mockResolvedValueOnce({
                thread: { id: "thread_1", status: "waiting_on_support", category: "technical", channel: "in_app", subject: "Upload issue", createdAt: 1, lastMessageAt: 2 },
                messages: [],
            })
            .mockResolvedValueOnce({
                thread: { id: "thread_1", status: "waiting_on_support", category: "technical", channel: "in_app", subject: "Upload issue", createdAt: 1, lastMessageAt: 3 },
                messages: [{ id: "msg_1", threadId: "thread_1", senderRole: "user", senderId: "user_1", senderLabel: "user@example.com", body: "Any update?", createdAt: 3 }],
            })
            .mockResolvedValueOnce({
                thread: { id: "thread_1", status: "waiting_on_support", category: "technical", channel: "in_app", subject: "Upload issue", createdAt: 1, lastMessageAt: 3 },
                messages: [{ id: "msg_1", threadId: "thread_1", senderRole: "user", senderId: "user_1", senderLabel: "user@example.com", body: "Any update?", createdAt: 3 }],
            })
            .mockResolvedValueOnce({
                thread: { id: "thread_1", status: "resolved", category: "technical", channel: "in_app", subject: "Upload issue", createdAt: 1, lastMessageAt: 4 },
                messages: [],
            });

        const detailResponse = await getThread(
            new NextRequest("http://localhost/api/support/threads/thread_1"),
            { params: Promise.resolve({ threadId: "thread_1" }) },
        );
        expect(detailResponse.status).toBe(200);

        const replyResponse = await postReply(
            new NextRequest("http://localhost/api/support/threads/thread_1", {
                method: "POST",
                body: JSON.stringify({ message: "Any update?" }),
            }),
            { params: Promise.resolve({ threadId: "thread_1" }) },
        );
        const replyBody = await replyResponse.json();
        expect(replyBody.messages).toHaveLength(1);
        expect(mockState.addSupportMessage).toHaveBeenCalledWith(expect.objectContaining({
            threadId: "thread_1",
            senderRole: "user",
        }));
        expect(mockState.trackServerEvent).toHaveBeenCalledWith("support_reply_sent", expect.objectContaining({
            thread_id: "thread_1",
            ticket_id: "thread_1",
            category: "technical",
            source_truth: "server",
        }), "user_1");

        const statusResponse = await patchThread(
            new NextRequest("http://localhost/api/support/threads/thread_1", {
                method: "PATCH",
                body: JSON.stringify({ action: "resolve" }),
            }),
            { params: Promise.resolve({ threadId: "thread_1" }) },
        );
        const statusBody = await statusResponse.json();

        expect(statusBody.thread.status).toBe("resolved");
        expect(mockState.updateSupportThreadStatus).toHaveBeenCalledWith("thread_1", "resolved");
    });

    it("user cannot read another user's support thread", async () => {
        mockState.getSupportThreadForUser.mockRejectedValueOnce(Object.assign(new Error("Forbidden"), { status: 403 }));

        const response = await getThread(
            new NextRequest("http://localhost/api/support/threads/thread_other"),
            { params: Promise.resolve({ threadId: "thread_other" }) },
        );
        const body = await response.json();

        expect(response.status).toBe(403);
        expect(body.error).toBe("Forbidden");
        expect(mockState.getSupportThreadForUser).toHaveBeenCalledWith("user_1", "thread_other");
    });
});
