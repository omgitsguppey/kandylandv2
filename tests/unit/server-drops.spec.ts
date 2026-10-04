import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => {
    const get = vi.fn();
    const limit = vi.fn(() => ({ get }));
    const orderBy = vi.fn(() => ({ limit }));
    const add = vi.fn();
    const collection = vi.fn(() => ({ orderBy, add }));

    const database = { collection };
    return {
        adminDb: database as typeof database | null,
        get,
        limit,
        orderBy,
        collection,
        reset() {
            this.adminDb = database;
            get.mockReset();
            limit.mockClear();
            orderBy.mockClear();
            collection.mockClear();
        },
    };
});

vi.mock("@/lib/server/firebase-admin", () => ({
    get adminDb() { return mockState.adminDb; },
}));

vi.mock("@/lib/server/route-diagnostics", () => ({
    recordRouteWarning: vi.fn(),
}));

import { getDrops } from "@/lib/server/drops";

describe("getDrops", () => {
    beforeEach(() => {
        mockState.reset();
    });

    it("skips malformed drop documents instead of blanking the entire feed", async () => {
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

        mockState.get.mockResolvedValue({
            empty: false,
            docs: [
                {
                    id: "valid_drop",
                    data: () => ({
                        title: "Valid Drop",
                        description: "A valid drop",
                        imageUrl: "https://example.com/drop.jpg",
                        contentUrl: "https://example.com/drop.mp4",
                        unlockCost: 10,
                        validFrom: 1_000,
                        validUntil: 2_000,
                        status: "active",
                        totalUnlocks: 0,
                        approvalStatus: "approved",
                    }),
                },
                {
                    id: "broken_drop",
                    data: () => ({
                        title: "Broken Drop",
                        status: "scheduled",
                        totalUnlocks: 0,
                    }),
                },
            ],
        });

        const drops = await getDrops();

        expect(mockState.limit).toHaveBeenCalledWith(1_000);
        expect(drops).toHaveLength(1);
        expect(drops[0]).toMatchObject({
            id: "valid_drop",
            title: "Valid Drop",
        });
        const { recordRouteWarning } = await import("@/lib/server/route-diagnostics");
        expect(recordRouteWarning).toHaveBeenCalledWith(
            "drops-list",
            "Skipping invalid drop document broken_drop",
            expect.anything(),
        );
    }, 10_000);
});

describe("getDrops source availability and recovery", () => {
    beforeEach(() => {
        mockState.reset();
    });

    it("keeps a verified empty query distinct from a missing source", async () => {
        mockState.get.mockResolvedValue({ empty: true, docs: [] });
        await expect(getDrops()).resolves.toEqual([]);
        expect(mockState.collection).toHaveBeenCalledWith("drops");
        expect(mockState.orderBy).toHaveBeenCalledWith("validFrom", "desc");
        expect(mockState.limit).toHaveBeenCalledWith(1_000);
        expect(mockState.get).toHaveBeenCalledTimes(1);
    });

    it("rejects when the database source is absent without issuing a query", async () => {
        mockState.adminDb = null;
        await expect(getDrops()).rejects.toBeInstanceOf(Error);
        expect(mockState.collection).not.toHaveBeenCalled();
        expect(mockState.get).not.toHaveBeenCalled();
    });

    it("preserves the exact provider failure instead of reporting an empty feed", async () => {
        const failure = Object.assign(new Error("Firestore read unavailable"), { code: "unavailable" });
        mockState.get.mockRejectedValue(failure);
        await expect(getDrops()).rejects.toBe(failure);
        expect(mockState.get).toHaveBeenCalledTimes(1);
        const diagnostics = await import("@/lib/server/route-diagnostics");
        expect(diagnostics.recordRouteWarning).toHaveBeenLastCalledWith("drops-list", "Error fetching drops", failure);
    });

    it("preserves a synchronous query-construction failure without retrying", async () => {
        const failure = Object.assign(new Error("Collection setup failed"), { code: "failed-precondition" });
        mockState.collection.mockImplementationOnce(() => { throw failure; });
        await expect(getDrops()).rejects.toBe(failure);
        expect(mockState.collection).toHaveBeenCalledTimes(1);
        expect(mockState.get).not.toHaveBeenCalled();
    });

    it("permits a later independent read to recover after a failed read", async () => {
        const failure = new Error("Temporary source failure");
        mockState.get.mockRejectedValueOnce(failure).mockResolvedValueOnce({ empty: true, docs: [] });
        await expect(getDrops()).rejects.toBe(failure);
        await expect(getDrops()).resolves.toEqual([]);
        expect(mockState.get).toHaveBeenCalledTimes(2);
    });

    it("retains public eligibility and content sanitization when the source is available", async () => {
        const document = (id: string, approvalStatus: string) => ({
            id,
            data: () => ({
                title: id,
                description: "Public cover only",
                imageUrl: "https://example.test/cover.jpg",
                contentUrl: "https://example.test/private.mp4",
                contentUrls: ["https://example.test/private-1.mp4", "https://example.test/private-2.jpg"],
                unlockCost: 10,
                validFrom: 1_000,
                validUntil: 3_000_000_000_000,
                status: "active",
                totalUnlocks: 0,
                approvalStatus,
            }),
        });
        mockState.get.mockResolvedValue({ empty: false, docs: [document("approved", "approved"), document("pending", "pending_review")] });
        const drops = await getDrops();
        expect(drops.map(drop => drop.id)).toEqual(["approved"]);
        expect(drops[0]).toMatchObject({ contentUrl: "", contentUrls: ["", ""] });
        expect(mockState.get).toHaveBeenCalledTimes(1);
        expect(mockState.limit).toHaveBeenCalledWith(1_000);
    });
});
