import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
    guardApiRequest: vi.fn(),
    notifyActiveDropsRuntime: vi.fn(),
    recordRuntimeWarning: vi.fn(),
    recordRouteWarning: vi.fn(),
    handleApiError: vi.fn(),
    reset() {
        this.guardApiRequest.mockReset();
        this.notifyActiveDropsRuntime.mockReset();
        this.recordRuntimeWarning.mockReset();
        this.recordRouteWarning.mockReset();
        this.handleApiError.mockReset();
    },
}));

vi.mock("@/lib/server/request-guard", () => ({
    guardApiRequest: mockState.guardApiRequest,
}));

vi.mock("@/lib/server/queue-runtime", () => ({
    notifyActiveDropsRuntime: mockState.notifyActiveDropsRuntime,
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

import { GET } from "@/app/api/cron/notify-active-drops/route";

describe("GET /api/cron/notify-active-drops", () => {
    beforeEach(() => {
        mockState.reset();
        mockState.guardApiRequest.mockResolvedValue({ uid: "cron_runner" });
        mockState.handleApiError.mockImplementation(() => NextResponse.json({ error: "Internal server error" }, { status: 500 }));
        mockState.notifyActiveDropsRuntime.mockResolvedValue({
            message: "Activated 1 drops, expired 1 drops, and reconciled lifecycle status.",
            activatedDrops: ["Scheduled Drop"],
            expiredDrops: ["Finished Drop"],
            autoQueuedDrops: ["finished_drop"],
            invariants: [],
        });
        process.env.CRON_SECRET = "test-secret";
    });

    it("delegates activation work to the canonical runtime and marks the route as legacy", async () => {
        const request = new NextRequest("http://localhost/api/cron/notify-active-drops", {
            headers: {
                authorization: "Bearer test-secret",
            },
        });
        const response = await GET(request);
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(mockState.notifyActiveDropsRuntime).toHaveBeenCalledWith({
            executionLayer: "next_route",
            surface: "cron/notify-active-drops",
            staleAfterMs: 20 * 60 * 1000,
        });
        expect(mockState.recordRouteWarning).toHaveBeenCalledWith(
            "cron/notify-active-drops",
            expect.stringContaining("Legacy activation adapter invoked"),
            undefined,
            expect.objectContaining({
                channel: "cron",
                moduleKey: "notify_active_drops_adapter",
            }),
        );
        expect(mockState.recordRuntimeWarning).toHaveBeenCalledWith(expect.objectContaining({
            code: "legacy_queue_adapter_invoked",
            executionLayer: "next_route",
            surface: "cron/notify-active-drops",
            moduleKey: "notify_active_drops",
        }));
        expect(payload).toEqual({
            message: "Activated 1 drops, expired 1 drops, and reconciled lifecycle status.",
            activatedDrops: ["Scheduled Drop"],
            expiredDrops: ["Finished Drop"],
            autoQueuedDrops: ["finished_drop"],
            invariants: [],
            legacyAdapter: true,
        });
    });

    it("returns unauthorized when the cron secret does not match", async () => {
        const request = new NextRequest("http://localhost/api/cron/notify-active-drops", {
            headers: {
                authorization: "Bearer wrong-secret",
            },
        });
        const response = await GET(request);
        const payload = await response.json();

        expect(response.status).toBe(401);
        expect(payload).toEqual({ error: "Unauthorized" });
        expect(mockState.notifyActiveDropsRuntime).not.toHaveBeenCalled();
        expect(mockState.recordRuntimeWarning).not.toHaveBeenCalled();
    });

    it("does not leak internal errors when canonical runtime delegation fails", async () => {
        mockState.notifyActiveDropsRuntime.mockRejectedValue(new Error("runtime exploded"));

        const request = new NextRequest("http://localhost/api/cron/notify-active-drops", {
            headers: {
                authorization: "Bearer test-secret",
            },
        });
        const response = await GET(request);
        const payload = await response.json();

        expect(response.status).toBe(500);
        expect(payload).toEqual({ error: "Internal server error" });
        expect(mockState.handleApiError).toHaveBeenCalledWith(expect.any(Error), "Cron.NotifyActiveDrops.GET");
    });
});
