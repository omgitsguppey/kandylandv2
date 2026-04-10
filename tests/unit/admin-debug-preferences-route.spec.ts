import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
    guardApiRequest: vi.fn(),
    getAdminDebugPreferences: vi.fn(),
    saveAdminDebugPreferences: vi.fn(),
    handleApiError: vi.fn(),
    recordRouteRuntimeSample: vi.fn(),
    getErrorMessage: vi.fn(),
    reset() {
        this.guardApiRequest.mockReset();
        this.getAdminDebugPreferences.mockReset();
        this.saveAdminDebugPreferences.mockReset();
        this.handleApiError.mockReset();
        this.recordRouteRuntimeSample.mockReset();
        this.getErrorMessage.mockReset();
    },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/request-guard", () => ({
    guardApiRequest: mockState.guardApiRequest,
}));
vi.mock("@/lib/server/admin-debug-preferences", () => ({
    getAdminDebugPreferences: mockState.getAdminDebugPreferences,
    saveAdminDebugPreferences: mockState.saveAdminDebugPreferences,
}));
vi.mock("@/lib/server/auth", () => ({
    handleApiError: mockState.handleApiError,
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

import { GET, PUT } from "@/app/api/admin/debug/preferences/route";

describe("admin debug preferences route", () => {
    beforeEach(() => {
        mockState.reset();
        mockState.handleApiError.mockImplementation((error: unknown) => NextResponse.json({
            error: error instanceof Error ? error.message : String(error),
        }, { status: 500 }));
    });

    it("returns persisted preferences for admins", async () => {
        mockState.guardApiRequest.mockResolvedValue({ uid: "admin_1" });
        mockState.getAdminDebugPreferences.mockResolvedValue({
            activeTab: "runtime",
            routeRuntimeFilter: "stale",
        });

        const response = await GET(new NextRequest("http://localhost/api/admin/debug/preferences"));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.preferences).toEqual({
            activeTab: "runtime",
            routeRuntimeFilter: "stale",
        });
    });

    it("rejects invalid preference values", async () => {
        mockState.guardApiRequest.mockResolvedValue({ uid: "admin_1" });

        const response = await PUT(new NextRequest("http://localhost/api/admin/debug/preferences", {
            method: "PUT",
            body: JSON.stringify({
                routeRuntimeFilter: "unknown",
            }),
        }));
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.error).toBe("Invalid route runtime filter");
        expect(mockState.saveAdminDebugPreferences).not.toHaveBeenCalled();
    });

    it("persists valid preference updates", async () => {
        mockState.guardApiRequest.mockResolvedValue({ uid: "admin_1" });
        mockState.saveAdminDebugPreferences.mockResolvedValue({
            activeTab: "now",
            routeRuntimeFilter: "native_chat",
        });

        const response = await PUT(new NextRequest("http://localhost/api/admin/debug/preferences", {
            method: "PUT",
            body: JSON.stringify({
                activeTab: "now",
                routeRuntimeFilter: "native_chat",
            }),
        }));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(mockState.saveAdminDebugPreferences).toHaveBeenCalledWith({
            uid: "admin_1",
            activeTab: "now",
            routeRuntimeFilter: "native_chat",
        });
        expect(body.preferences.routeRuntimeFilter).toBe("native_chat");
    });
});
