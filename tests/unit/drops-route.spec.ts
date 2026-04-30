import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Drop } from "@/types/db";

const mockState = vi.hoisted(() => ({
    guardApiRequest: vi.fn(),
    handleApiError: vi.fn(),
    getDrops: vi.fn(),
    isDropActiveNow: vi.fn(),
    buildWeakEtag: vi.fn(),
    requestMatchesEtag: vi.fn(),
    buildNotModifiedResponse: vi.fn(),
    reset() {
        this.guardApiRequest.mockReset();
        this.handleApiError.mockReset();
        this.getDrops.mockReset();
        this.isDropActiveNow.mockReset();
        this.buildWeakEtag.mockReset();
        this.requestMatchesEtag.mockReset();
        this.buildNotModifiedResponse.mockReset();
    },
}));

vi.mock("@/lib/server/request-guard", () => ({
    guardApiRequest: mockState.guardApiRequest,
}));

vi.mock("@/lib/server/auth", () => ({
    handleApiError: mockState.handleApiError,
}));

vi.mock("@/lib/server/drops", () => ({
    getDrops: mockState.getDrops,
}));

vi.mock("@/lib/drop-status", () => ({
    isDropActiveNow: mockState.isDropActiveNow,
}));

vi.mock("@/lib/http-cache", () => ({
    buildWeakEtag: mockState.buildWeakEtag,
    requestMatchesEtag: mockState.requestMatchesEtag,
    buildNotModifiedResponse: mockState.buildNotModifiedResponse,
    PRIVATE_REVALIDATE_CACHE_CONTROL: "private, max-age=0, must-revalidate",
}));

vi.mock("@/lib/server/rate-limit", () => ({
    STANDARD: {},
}));

import { GET } from "@/app/api/drops/route";

function makeDrop(id: string, validFrom: number, status: Drop["status"] = "active"): Drop {
    return {
        id,
        title: `Drop ${id}`,
        description: `Description for ${id}`,
        imageUrl: `https://example.com/${id}.jpg`,
        contentUrl: `https://example.com/${id}.mp4`,
        unlockCost: 10,
        validFrom,
        totalUnlocks: 0,
        status,
    };
}

describe("GET /api/drops", () => {
    beforeEach(() => {
        mockState.reset();
        mockState.guardApiRequest.mockResolvedValue({
            uid: "fan_1",
        });
        mockState.handleApiError.mockImplementation((error: unknown) => NextResponse.json({
            error: error instanceof Error ? error.message : String(error),
        }, { status: 500 }));
        mockState.buildWeakEtag.mockReturnValue('W/"drops-feed"');
        mockState.requestMatchesEtag.mockReturnValue(false);
        mockState.buildNotModifiedResponse.mockImplementation((etag: string, cacheControl: string) => new NextResponse(null, {
            status: 304,
            headers: {
                ETag: etag,
                "Cache-Control": cacheControl,
            },
        }));
    });

    it("returns the active drops feed sorted by validFrom and limited by the requested page size", async () => {
        const drops = [
            makeDrop("drop-b", 200),
            makeDrop("drop-a", 200),
            makeDrop("drop-c", 150),
            makeDrop("drop-hidden", 250),
        ];
        mockState.getDrops.mockResolvedValue(drops);
        mockState.isDropActiveNow.mockImplementation((drop: Drop) => drop.id !== "drop-hidden");

        const request = new NextRequest("http://localhost/api/drops?limit=2");
        const response = await GET(request);
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(mockState.guardApiRequest).toHaveBeenCalledWith(request, expect.objectContaining({
            routeName: "drops",
        }));
        expect(payload).toEqual({
            drops: [
                expect.objectContaining({ id: "drop-b", validFrom: 200 }),
                expect.objectContaining({ id: "drop-a", validFrom: 200 }),
            ],
            nextCursor: "200|drop-a",
        });
        expect(response.headers.get("ETag")).toBe('W/"drops-feed"');
        expect(response.headers.get("Cache-Control")).toBe("private, max-age=0, must-revalidate");
        expect(mockState.handleApiError).not.toHaveBeenCalled();
    });

    it("returns a not-modified response when the incoming etag matches", async () => {
        mockState.getDrops.mockResolvedValue([
            makeDrop("drop-b", 200),
        ]);
        mockState.isDropActiveNow.mockReturnValue(true);
        mockState.requestMatchesEtag.mockReturnValue(true);

        const request = new NextRequest("http://localhost/api/drops");
        const response = await GET(request);

        expect(response.status).toBe(304);
        expect(mockState.buildNotModifiedResponse).toHaveBeenCalledWith(
            'W/"drops-feed"',
            "private, max-age=0, must-revalidate",
        );
        expect(mockState.handleApiError).not.toHaveBeenCalled();
    });

    it("delegates failures to the shared API error handler with the standardized drops context", async () => {
        const routeError = new Error("drops backend unavailable");
        mockState.getDrops.mockRejectedValue(routeError);
        mockState.isDropActiveNow.mockReturnValue(true);

        const request = new NextRequest("http://localhost/api/drops");
        const response = await GET(request);
        const payload = await response.json();

        expect(response.status).toBe(500);
        expect(payload).toEqual({
            error: "drops backend unavailable",
        });
        expect(mockState.handleApiError).toHaveBeenCalledWith(routeError, "Drops.List");
    });
});
