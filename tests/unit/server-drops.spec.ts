import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => {
    const get = vi.fn();
    const orderBy = vi.fn(() => ({ get }));
    const collection = vi.fn(() => ({ orderBy }));

    return {
        adminDb: {
            collection,
        },
        get,
        orderBy,
        collection,
        reset() {
            get.mockReset();
            orderBy.mockClear();
            collection.mockClear();
        },
    };
});

vi.mock("@/lib/server/firebase-admin", () => ({
    adminDb: mockState.adminDb,
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

        expect(drops).toHaveLength(1);
        expect(drops[0]).toMatchObject({
            id: "valid_drop",
            title: "Valid Drop",
        });
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            "Skipping invalid drop document broken_drop",
            expect.anything(),
        );

        consoleErrorSpy.mockRestore();
    }, 10_000);
});
