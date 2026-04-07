import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/firebase-admin", () => ({
    adminDb: null,
    adminStorage: null,
}));
vi.mock("@/lib/server/analytics", () => ({
    trackServerEvent: vi.fn(),
}));
vi.mock("@/lib/server/route-diagnostics", () => ({
    recordRouteWarning: vi.fn(),
}));
vi.mock("@/lib/server/server-diagnostics", () => ({
    recordServerDiagnostic: vi.fn(),
}));
vi.mock("@/lib/server/storage-assets", () => ({
    ensureFirebaseDownloadUrl: vi.fn(),
    sanitizeStorageFileName: (value: string) => value,
}));

import { buildCatalogDropCoverReferenceAssetsFromDocs } from "@/lib/server/ai-drop-covers";

describe("admin AI drop cover catalog references", () => {
    it("retains legacy and current drop covers in the same reference catalog", () => {
        const assets = buildCatalogDropCoverReferenceAssetsFromDocs([
            {
                id: "legacy-drop",
                data: () => ({
                    title: "Blueberry Slush",
                    imageUrl: "https://example.com/legacy-blueberry.png",
                    coverFileName: "legacy-blueberry.png",
                    creatorId: "creator_1",
                    createdAt: { _seconds: 1710000000, _nanoseconds: 0 },
                    totalUnlocks: 12,
                }),
            },
            {
                id: "recent-drop",
                data: () => ({
                    title: "Apple Pie",
                    imageUrl: "https://example.com/apple-pie.png",
                    creatorId: "creator_1",
                    validFrom: { seconds: 1720000000, nanoseconds: 0 },
                    totalUnlocks: 3,
                }),
            },
            {
                id: "no-cover",
                data: () => ({
                    title: "Missing Cover",
                    totalUnlocks: 99,
                }),
            },
            {
                id: "duplicate-cover",
                data: () => ({
                    title: "Duplicate Apple Pie",
                    imageUrl: "https://example.com/apple-pie.png",
                    totalUnlocks: 99,
                }),
            },
        ], {
            limit: 10,
        });

        expect(assets).toHaveLength(2);
        expect(assets.map((asset) => asset.dropId)).toEqual(["legacy-drop", "recent-drop"]);
        expect(assets.every((asset) => asset.source === "catalog_drop_cover")).toBe(true);
        expect(assets[0]?.fileName).toBe("legacy-blueberry.png");
    });

    it("excludes the current drop id from the reusable catalog", () => {
        const assets = buildCatalogDropCoverReferenceAssetsFromDocs([
            {
                id: "drop-1",
                data: () => ({
                    title: "Apple Pie",
                    imageUrl: "https://example.com/apple-pie.png",
                }),
            },
            {
                id: "drop-2",
                data: () => ({
                    title: "Lemon Cake Spread",
                    imageUrl: "https://example.com/lemon-cake.png",
                }),
            },
        ], {
            excludeDropId: "drop-2",
            limit: 10,
        });

        expect(assets.map((asset) => asset.dropId)).toEqual(["drop-1"]);
    });
});
