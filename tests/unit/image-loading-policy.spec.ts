import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { getImageLoadingPolicy } from "@/lib/image-loading-policy";

const ROOT = process.cwd();

describe("image loading policy", () => {
    it("returns lazy loading for grid, list, and library surfaces", () => {
        expect(getImageLoadingPolicy("drops_grid")).toMatchObject({
            loading: "lazy",
            preload: false,
            fetchPriority: "low",
            lcpCandidate: false,
        });
        expect(getImageLoadingPolicy("home_creator_rail")).toMatchObject({
            loading: "lazy",
            preload: false,
            fetchPriority: "low",
        });
        expect(getImageLoadingPolicy("my_kandydrops_library")).toMatchObject({
            loading: "lazy",
            preload: false,
            fetchPriority: "low",
        });
    });

    it("marks the locked preview cover as the route LCP candidate", () => {
        expect(getImageLoadingPolicy("drop_preview", { isLcpCandidate: true })).toMatchObject({
            loading: "eager",
            preload: true,
            fetchPriority: "high",
            lcpCandidate: true,
            sizesPolicy: "drop-preview-cover-lcp",
        });
    });

    it("marks only the first viewer media item eager and high priority", () => {
        expect(getImageLoadingPolicy("viewer_content", { mediaIndex: 0 })).toMatchObject({
            loading: "eager",
            preload: true,
            fetchPriority: "high",
            lcpCandidate: true,
        });
        expect(getImageLoadingPolicy("viewer_content", { mediaIndex: 1 })).toMatchObject({
            loading: "lazy",
            preload: false,
            fetchPriority: "low",
            lcpCandidate: false,
        });
    });

    it("keeps standard grid card sizes below full viewport width", () => {
        expect(getImageLoadingPolicy("drops_grid").sizes).not.toContain("100vw");
        expect(getImageLoadingPolicy("drops_grid").sizes).toContain("50vw");
    });

    it("does not allow preload for repeated card images", () => {
        expect(getImageLoadingPolicy("drops_grid").preload).toBe(false);
        expect(getImageLoadingPolicy("featured_carousel", { mediaIndex: 1 }).preload).toBe(false);
        expect(getImageLoadingPolicy("home_active_drops").preload).toBe(false);
        expect(getImageLoadingPolicy("dashboard_collection").preload).toBe(false);
    });

    it("keeps owned-card image failures connected to a rendered fallback", () => {
        const source = readFileSync(
            path.join(ROOT, "src/components/Dashboard/OwnedDropGalleryCard.tsx"),
            "utf8",
        );

        expect(source).toMatch(/onError\s*=\s*\{[\s\S]{0,160}set(?:ImageError|ErroredImageUrl)\s*\(/u);
        expect(source).toContain("resolvePublicDropCoverSrc(null)");
        expect(source).toMatch(/src\s*=\s*\{\s*coverSrc\s*\}/u);
    });
});
