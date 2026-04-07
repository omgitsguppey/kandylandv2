import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
    guardApiRequest: vi.fn(),
    handleApiError: vi.fn(),
    listAdminUiChartHealth: vi.fn(),
    saveAdminUiChartHealth: vi.fn(),
    reset() {
        this.guardApiRequest.mockReset();
        this.handleApiError.mockReset();
        this.listAdminUiChartHealth.mockReset();
        this.saveAdminUiChartHealth.mockReset();
    },
}));

vi.mock("@/lib/server/request-guard", () => ({
    guardApiRequest: mockState.guardApiRequest,
}));

vi.mock("@/lib/server/auth", () => ({
    handleApiError: mockState.handleApiError,
}));

vi.mock("@/lib/server/rate-limit", () => ({
    ADMIN: {},
    HEAVY_READ: {},
}));

vi.mock("@/lib/server/admin-ui-chart-health", () => ({
    listAdminUiChartHealth: mockState.listAdminUiChartHealth,
    saveAdminUiChartHealth: mockState.saveAdminUiChartHealth,
}));

import { GET, PUT } from "@/app/api/admin/ui-chart-health/route";

describe("GET/PUT /api/admin/ui-chart-health", () => {
    beforeEach(() => {
        mockState.reset();
        mockState.guardApiRequest.mockResolvedValue({
            uid: "admin_1",
            email: "admin@example.com",
        });
        mockState.handleApiError.mockImplementation((error: unknown) => NextResponse.json({
            error: error instanceof Error ? error.message : String(error),
        }, { status: 500 }));
        mockState.listAdminUiChartHealth.mockResolvedValue([
            {
                key: "dashboard.platform_pulse",
                title: "Platform pulse",
                page: "dashboard",
                category: "overview",
                source: "overview_snapshot",
                status: "healthy",
                hydrationState: "loaded",
                hasData: true,
                summary: "Loaded.",
                action: "No action required.",
                issueCount: 0,
                issueMessages: [],
                updatedAtMs: 123,
            },
        ]);
    });

    it("lists the latest reported admin UI chart health items", async () => {
        const response = await GET(new NextRequest("http://localhost/api/admin/ui-chart-health"));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toMatchObject({
            success: true,
            items: [
                expect.objectContaining({
                    key: "dashboard.platform_pulse",
                }),
            ],
        });
    });

    it("stores validated admin UI chart health items", async () => {
        const request = new NextRequest("http://localhost/api/admin/ui-chart-health", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                items: [
                    {
                        key: "analytics.operations.live_pulse",
                        title: "Live Pulse",
                        page: "analytics",
                        category: "operations",
                        source: "mixed_client_live",
                        status: "warn",
                        hydrationState: "background_degraded",
                        hasData: true,
                        summary: "Realtime analytics refresh failed.",
                        action: "Review the realtime source.",
                        issueCount: 1,
                        issueMessages: ["Realtime analytics refresh failed."],
                        updatedAtMs: 456,
                    },
                ],
            }),
        });

        const response = await PUT(request);
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toMatchObject({
            success: true,
            itemCount: 1,
        });
        expect(mockState.saveAdminUiChartHealth).toHaveBeenCalledWith({
            items: [
                expect.objectContaining({
                    key: "analytics.operations.live_pulse",
                }),
            ],
            actorUid: "admin_1",
            actorEmail: "admin@example.com",
        });
    });

    it("rejects empty or invalid chart health payloads", async () => {
        const request = new NextRequest("http://localhost/api/admin/ui-chart-health", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                items: [{ key: "missing_fields_only" }],
            }),
        });

        const response = await PUT(request);
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.error).toContain("No valid chart health items");
        expect(mockState.saveAdminUiChartHealth).not.toHaveBeenCalled();
    });
});
