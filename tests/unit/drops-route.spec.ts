import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Drop } from "@/types/db";

const mockState = vi.hoisted(() => {
    const sourceGet = vi.fn();
    const sourceLimit = vi.fn(() => ({ get: sourceGet }));
    const sourceOrderBy = vi.fn(() => ({ limit: sourceLimit }));
    const sourceCollection = vi.fn(() => ({ orderBy: sourceOrderBy }));
    const database = { collection: sourceCollection };
    return {
    database,
    sourceDb: database as typeof database | null,
    sourceGet,
    sourceCollection,
    recordRouteWarning: vi.fn(),
    recordRouteFailure: vi.fn(),
    recordRouteRuntimeSample: vi.fn(),
    guardApiRequest: vi.fn(),
    handleApiError: vi.fn(),
    getDrops: vi.fn(),
    isDropActiveNow: vi.fn(),
    buildWeakEtag: vi.fn(),
    requestMatchesEtag: vi.fn(),
    buildNotModifiedResponse: vi.fn(),
    reset() {
        this.sourceDb = database;
        this.sourceGet.mockReset();
        this.sourceCollection.mockClear();
        this.recordRouteWarning.mockReset();
        this.recordRouteFailure.mockReset();
        this.recordRouteRuntimeSample.mockReset();
        this.guardApiRequest.mockReset();
        this.handleApiError.mockReset();
        this.getDrops.mockReset();
        this.isDropActiveNow.mockReset();
        this.buildWeakEtag.mockReset();
        this.requestMatchesEtag.mockReset();
        this.buildNotModifiedResponse.mockReset();
    },
};
});

vi.mock("@/lib/server/request-guard", () => ({
    guardApiRequest: mockState.guardApiRequest,
}));

vi.mock("@/lib/server/auth", () => ({
    handleApiError: mockState.handleApiError,
}));

vi.mock("@/lib/server/drops", () => ({
    getDrops: mockState.getDrops,
}));

vi.mock("@/lib/drop-status", async (importOriginal) => ({
    ...await importOriginal<typeof import("@/lib/drop-status")>(),
    isDropActiveNow: mockState.isDropActiveNow,
}));

vi.mock("@/lib/http-cache", () => ({
    buildWeakEtag: mockState.buildWeakEtag,
    requestMatchesEtag: mockState.requestMatchesEtag,
    buildNotModifiedResponse: mockState.buildNotModifiedResponse,
    PRIVATE_REVALIDATE_CACHE_CONTROL: "private, max-age=0, must-revalidate",
}));

vi.mock("@/lib/server/rate-limit", async (importOriginal) => ({
    ...await importOriginal<typeof import("@/lib/server/rate-limit")>(),
    STANDARD: {},
}));

vi.mock("@/lib/server/firebase-admin", () => ({
    get adminDb() { return mockState.sourceDb; },
    adminAuth: {},
}));

vi.mock("@/lib/server/route-diagnostics", async (importOriginal) => ({
    ...await importOriginal<typeof import("@/lib/server/route-diagnostics")>(),
    recordRouteWarning: mockState.recordRouteWarning,
    recordRouteFailure: mockState.recordRouteFailure,
}));

vi.mock("@/lib/server/route-runtime-health", () => ({
    recordRouteRuntimeSample: mockState.recordRouteRuntimeSample,
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
        expect(response.headers.get("Cache-Control")).toBe("public, max-age=0, s-maxage=60, stale-while-revalidate=300");
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
            "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
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

describe("GET /api/drops actual producer availability boundary", () => {
    beforeEach(async () => {
        mockState.reset();
        mockState.guardApiRequest.mockResolvedValue(null);
        const producer = await vi.importActual<typeof import("@/lib/server/drops")>("@/lib/server/drops");
        const auth = await vi.importActual<typeof import("@/lib/server/auth")>("@/lib/server/auth");
        const httpCache = await vi.importActual<typeof import("@/lib/http-cache")>("@/lib/http-cache");
        const dropStatus = await vi.importActual<typeof import("@/lib/drop-status")>("@/lib/drop-status");
        mockState.getDrops.mockImplementation(producer.getDrops);
        mockState.handleApiError.mockImplementation(auth.handleApiError);
        mockState.buildWeakEtag.mockImplementation(httpCache.buildWeakEtag);
        mockState.requestMatchesEtag.mockImplementation(httpCache.requestMatchesEtag);
        mockState.buildNotModifiedResponse.mockImplementation(httpCache.buildNotModifiedResponse);
        mockState.isDropActiveNow.mockImplementation(dropStatus.isDropActiveNow);
        vi.spyOn(console, "error").mockImplementation(() => undefined);
    });

    function availableFeed() {
        const record = {
            ...makeDrop("recovered-drop", Date.now() - 60_000),
            validUntil: Date.now() + 600_000,
            approvalStatus: "approved",
            contentUrls: ["https://example.test/locked.mp4"],
        };
        return {
            empty: false,
            docs: [{ id: "recovered-drop", data: () => record }],
        };
    }

    function assertFailure(response: NextResponse) {
        expect(response.status).toBe(500);
        expect(response.headers.get("ETag")).toBeNull();
        expect(response.headers.get("Cache-Control") ?? "").not.toMatch(/public|s-maxage|stale-while-revalidate/);
        expect(mockState.recordRouteRuntimeSample).toHaveBeenLastCalledWith(expect.objectContaining({ key: "drops:GET", statusCode: 500 }));
    }

    it("serves a real empty source with the existing successful cache contract", async () => {
        mockState.sourceGet.mockResolvedValue({ empty: true, docs: [] });
        const response = await GET(new NextRequest("http://localhost/api/drops"));
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ drops: [], nextCursor: null });
        expect(response.headers.get("Cache-Control")).toBe("public, max-age=0, s-maxage=60, stale-while-revalidate=300");
        expect(response.headers.get("ETag")).toBeTruthy();
        expect(mockState.sourceGet).toHaveBeenCalledTimes(1);
        expect(mockState.handleApiError).not.toHaveBeenCalled();
    });

    it("passes a real source rejection through the existing safe API failure owner", async () => {
        const failure = Object.assign(new Error("Provider path private-value must stay server-side"), { code: "unavailable" });
        mockState.sourceGet.mockRejectedValue(failure);
        const response = await GET(new NextRequest("http://localhost/api/drops"));
        assertFailure(response);
        const payload = await response.json();
        expect(payload).toMatchObject({ success: false, errorKey: "internal_server_error" });
        expect(payload).not.toHaveProperty("drops");
        expect(JSON.stringify(payload)).not.toContain("private-value");
        expect(mockState.handleApiError).toHaveBeenCalledWith(failure, "Drops.List");
        expect(mockState.recordRouteFailure).toHaveBeenCalledWith("Drops.List", failure, expect.objectContaining({ detail: { status: 500 } }));
        expect(mockState.buildWeakEtag).not.toHaveBeenCalled();
        expect(mockState.requestMatchesEtag).not.toHaveBeenCalled();
        expect(mockState.sourceGet).toHaveBeenCalledTimes(1);
    });

    it("does not fabricate an empty feed when the producer database is absent", async () => {
        mockState.sourceDb = null;
        const response = await GET(new NextRequest("http://localhost/api/drops"));
        assertFailure(response);
        expect(await response.json()).toMatchObject({ success: false, errorKey: "internal_server_error" });
        expect(mockState.sourceCollection).not.toHaveBeenCalled();
        expect(mockState.sourceGet).not.toHaveBeenCalled();
        expect(mockState.buildWeakEtag).not.toHaveBeenCalled();
    });

    it("does not acknowledge a prior empty ETag when the current source read fails", async () => {
        mockState.sourceGet.mockResolvedValueOnce({ empty: true, docs: [] });
        const firstResponse = await GET(new NextRequest("http://localhost/api/drops"));
        const etag = firstResponse.headers.get("ETag")!;
        expect(firstResponse.status).toBe(200);
        mockState.sourceGet.mockRejectedValueOnce(new Error("Current read failed"));
        const response = await GET(new NextRequest("http://localhost/api/drops", { headers: { "If-None-Match": etag } }));
        assertFailure(response);
        expect(mockState.buildNotModifiedResponse).not.toHaveBeenCalled();
        expect(mockState.sourceGet).toHaveBeenCalledTimes(2);
    });

    it("recovers on a new request, then permits a conditional successful response", async () => {
        mockState.sourceGet.mockRejectedValueOnce(new Error("Transient read failure"))
            .mockResolvedValue(availableFeed());
        const failed = await GET(new NextRequest("http://localhost/api/drops"));
        assertFailure(failed);
        const recovered = await GET(new NextRequest("http://localhost/api/drops"));
        expect(recovered.status).toBe(200);
        expect(await recovered.json()).toEqual({ drops: [expect.objectContaining({ id: "recovered-drop", contentUrl: "", contentUrls: [""] })], nextCursor: null });
        expect(recovered.headers.get("Cache-Control")).toBe("public, max-age=0, s-maxage=60, stale-while-revalidate=300");
        const conditional = await GET(new NextRequest("http://localhost/api/drops", { headers: { "If-None-Match": recovered.headers.get("ETag")! } }));
        expect(conditional.status).toBe(304);
        expect(mockState.sourceGet).toHaveBeenCalledTimes(3);
        expect(mockState.handleApiError).toHaveBeenCalledTimes(1);
    });

    it("also carries a synchronous SDK setup failure through Drops.List", async () => {
        const failure = new Error("SDK query setup failed");
        mockState.sourceCollection.mockImplementationOnce(() => { throw failure; });
        const response = await GET(new NextRequest("http://localhost/api/drops"));
        assertFailure(response);
        expect(mockState.handleApiError).toHaveBeenCalledWith(failure, "Drops.List");
        expect(mockState.sourceCollection).toHaveBeenCalledTimes(1);
        expect(mockState.sourceGet).not.toHaveBeenCalled();
    });
});
