import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
    guardApiRequest: vi.fn(),
    processQueueLifecycleRuntime: vi.fn(),
    recordRuntimeWarning: vi.fn(),
    recordRouteWarning: vi.fn(),
    handleApiError: vi.fn(),
    reset() {
        this.guardApiRequest.mockReset();
        this.processQueueLifecycleRuntime.mockReset();
        this.recordRuntimeWarning.mockReset();
        this.recordRouteWarning.mockReset();
        this.handleApiError.mockReset();
    },
}));

vi.mock("@/lib/server/request-guard", () => ({
    guardApiRequest: mockState.guardApiRequest,
}));

vi.mock("@/lib/server/queue-runtime", () => ({
    processQueueLifecycleRuntime: mockState.processQueueLifecycleRuntime,
}));

vi.mock("@/lib/server/runtime-warning-store", () => ({
    recordRuntimeWarning: mockState.recordRuntimeWarning,
}));

vi.mock("@/lib/server/route-diagnostics", () => ({
    recordRouteWarning: mockState.recordRouteWarning,
}));

vi.mock("@/lib/server/auth", () => ({
    handleApiError: mockState.handleApiError,
}));

vi.mock("@/lib/server/rate-limit", () => ({
    CRON: {},
}));

import { GET } from "@/app/api/cron/process-queue/route";

describe("GET /api/cron/process-queue", () => {
    beforeEach(() => {
        mockState.reset();
        mockState.guardApiRequest.mockResolvedValue({ uid: "cron_runner" });
        mockState.handleApiError.mockImplementation(() => NextResponse.json({ error: "Internal server error" }, { status: 500 }));
        mockState.processQueueLifecycleRuntime.mockResolvedValue({
            message: "Scheduled 1 drops",
            updates: [{ dropId: "drop_1", validFrom: 123, activationCount: 2 }],
            lifecycleReconciled: [],
            invariants: [],
        });
        process.env.CRON_SECRET = "test-secret";
    });

    it("delegates queue lifecycle work to the canonical runtime and marks the route as legacy", async () => {
        const request = new NextRequest("http://localhost/api/cron/process-queue", {
            headers: {
                authorization: "Bearer test-secret",
            },
        });
        const response = await GET(request);
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(mockState.processQueueLifecycleRuntime).toHaveBeenCalledWith({
            executionLayer: "next_route",
            surface: "cron/process-queue",
            staleAfterMs: 60 * 60 * 1000,
        });
        expect(mockState.recordRouteWarning).toHaveBeenCalledWith(
            "cron/process-queue",
            expect.stringContaining("Legacy queue lifecycle adapter invoked"),
            undefined,
            expect.objectContaining({
                channel: "cron",
                moduleKey: "queue_lifecycle_adapter",
            }),
        );
        expect(mockState.recordRuntimeWarning).toHaveBeenCalledWith(expect.objectContaining({
            code: "legacy_queue_adapter_invoked",
            executionLayer: "next_route",
            surface: "cron/process-queue",
            moduleKey: "process_queue",
        }));
        expect(payload).toEqual({
            message: "Scheduled 1 drops",
            updates: [{ dropId: "drop_1", validFrom: 123, activationCount: 2 }],
            lifecycleReconciled: [],
            invariants: [],
            legacyAdapter: true,
        });
    });

    it("returns unauthorized when the cron secret does not match", async () => {
        const request = new NextRequest("http://localhost/api/cron/process-queue", {
            headers: {
                authorization: "Bearer wrong-secret",
            },
        });
        const response = await GET(request);
        const payload = await response.json();

        expect(response.status).toBe(401);
        expect(payload).toEqual({ error: "Unauthorized" });
        expect(mockState.processQueueLifecycleRuntime).not.toHaveBeenCalled();
        expect(mockState.recordRuntimeWarning).not.toHaveBeenCalled();
    });

    it("does not leak internal errors when canonical runtime delegation fails", async () => {
        mockState.processQueueLifecycleRuntime.mockRejectedValue(new Error("runtime exploded"));

        const request = new NextRequest("http://localhost/api/cron/process-queue", {
            headers: {
                authorization: "Bearer test-secret",
            },
        });
        const response = await GET(request);
        const payload = await response.json();

        expect(response.status).toBe(500);
        expect(payload).toEqual({ error: "Internal server error" });
        expect(mockState.handleApiError).toHaveBeenCalledWith(expect.any(Error), "Cron.ProcessQueue.GET");
    });
});
