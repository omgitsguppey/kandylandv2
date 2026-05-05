import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => {
    const set = vi.fn(async () => undefined);
    const doc = vi.fn(() => ({ id: "feedback_1", set }));

    return {
        guardApiRequest: vi.fn(),
        handleApiError: vi.fn(),
        recordCanonicalTaskEvent: vi.fn(async () => undefined),
        trackServerEvent: vi.fn(async () => undefined),
        adminDb: {
            collection: vi.fn(() => ({ doc })),
        },
        set,
        doc,
        reset() {
            this.guardApiRequest.mockReset();
            this.handleApiError.mockReset();
            this.recordCanonicalTaskEvent.mockReset();
            this.trackServerEvent.mockReset();
            this.adminDb.collection.mockClear();
            this.doc.mockClear();
            this.set.mockClear();
        },
    };
});

vi.mock("@/lib/server/firebase-admin", () => ({
    adminDb: mockState.adminDb,
}));

vi.mock("@/lib/server/auth", () => ({
    handleApiError: mockState.handleApiError,
}));

vi.mock("@/lib/server/rate-limit", () => ({
    STANDARD: {},
}));

vi.mock("@/lib/server/request-guard", () => ({
    guardApiRequest: mockState.guardApiRequest,
}));

vi.mock("@/lib/server/daily-tasks", () => ({
    recordCanonicalTaskEvent: mockState.recordCanonicalTaskEvent,
}));

vi.mock("@/lib/server/analytics", () => ({
    trackServerEvent: mockState.trackServerEvent,
}));

vi.mock("@/lib/server/route-runtime-health", () => ({
    withRouteRuntimeHealth: (_key: string, handler: unknown) => handler,
}));

vi.mock("firebase-admin/firestore", () => ({
    FieldValue: {
        serverTimestamp: vi.fn(() => ({ op: "serverTimestamp" })),
    },
}));

import { POST } from "@/app/api/tasks/feedback/route";

describe("POST /api/tasks/feedback", () => {
    beforeEach(() => {
        mockState.reset();
        mockState.guardApiRequest.mockResolvedValue({
            uid: "user_1",
            email: "user@example.com",
        });
        mockState.handleApiError.mockImplementation((error: unknown) => NextResponse.json({
            error: error instanceof Error ? error.message : String(error),
        }, { status: 500 }));
    });

    it("emits canonical bug report telemetry while preserving task progress receipts", async () => {
        const response = await POST(new NextRequest("http://localhost/api/tasks/feedback", {
            method: "POST",
            body: JSON.stringify({
                category: "bug_report",
                issueType: "action_failed",
                severity: "high",
                contextId: "global:/dashboard/support",
                component: {
                    contextId: "global:/dashboard/support",
                    title: "Support",
                    componentName: "SupportInbox",
                    routeHint: "/dashboard/support",
                },
                autoContext: {
                    currentPath: "/dashboard/support",
                    viewportWidth: 390,
                    viewportHeight: 844,
                    userAgent: "test",
                    sessionId: "session_1",
                    subjectId: "user_1",
                },
                summary: "Reply button failed",
                message: "Reply button failed after refresh",
            }),
        }));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toEqual({ success: true });
        expect(mockState.trackServerEvent).toHaveBeenCalledWith("bug_report_submitted", expect.objectContaining({
            route: "/dashboard/support",
            category: "action_failed",
            severity: "high",
            component: "SupportInbox",
            component_name: "SupportInbox",
            feedback_id: "feedback_1",
            source_truth: "server",
        }), "user_1");
        expect(mockState.recordCanonicalTaskEvent).toHaveBeenCalledWith("user_1", "user@example.com", "feedback_submitted", expect.objectContaining({
            category: "bug_report",
            feedback_id: "feedback_1",
            issue_type: "action_failed",
            severity: "high",
        }));
    });
});
