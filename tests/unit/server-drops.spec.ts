import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => {
    const get = vi.fn();
    const limit = vi.fn(() => ({ get }));
    const orderBy = vi.fn(() => ({ limit }));
    const add = vi.fn();
    const collection = vi.fn(() => ({ orderBy, add }));

    return {
        adminDb: {
            collection,
        },
        get,
        limit,
        orderBy,
        collection,
        reset() {
            get.mockReset();
            limit.mockClear();
            orderBy.mockClear();
            collection.mockClear();
        },
    };
});

vi.mock("@/lib/server/firebase-admin", () => ({
    adminDb: mockState.adminDb,
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
