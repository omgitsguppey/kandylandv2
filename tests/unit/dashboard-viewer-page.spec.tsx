import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
    getDropRaw: vi.fn(),
    getDrops: vi.fn(),
    sanitizeDropForClient: vi.fn(),
}));

vi.mock("@/lib/server/drops", () => ({
    getDropRaw: mockState.getDropRaw,
    getDrops: mockState.getDrops,
    sanitizeDropForClient: mockState.sanitizeDropForClient,
}));

import ViewerPage from "@/app/dashboard/viewer/page";

describe("dashboard viewer page", () => {
    beforeEach(() => {
        mockState.getDropRaw.mockReset();
        mockState.getDrops.mockReset();
        mockState.sanitizeDropForClient.mockReset();
    });

    it("loads the raw owned drop and sanitizes it before rendering", async () => {
        const rawDrop = { id: "drop_1", approvalStatus: "pending_review" };
        const safeDrop = { id: "drop_1", approvalStatus: "pending_review", contentUrl: "" };
        const allDrops = [{ id: "drop_2" }];

        mockState.getDropRaw.mockResolvedValue(rawDrop);
        mockState.sanitizeDropForClient.mockReturnValue(safeDrop);
        mockState.getDrops.mockResolvedValue(allDrops);

        const element = await ViewerPage({
            searchParams: Promise.resolve({ id: "drop_1" }),
        });

        expect(mockState.getDropRaw).toHaveBeenCalledWith("drop_1");
        expect(mockState.sanitizeDropForClient).toHaveBeenCalledWith(rawDrop);
        expect(element.props).toMatchObject({
            drop: safeDrop,
            allDrops,
        });
    });
});
