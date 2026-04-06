import { describe, expect, it } from "vitest";

import {
    ADMIN_AI_DROP_COVER_DEFAULT_LOCATION,
    ADMIN_AI_DROP_COVER_MODEL,
    ADMIN_AI_DROP_COVER_PRICE_BASIS,
    buildAdminAiDropCoverPrompt,
    estimateAdminAiDropCoverCostUsd,
    getDefaultAdminAiDropCoverSettings,
    normalizeAdminAiDropCoverLocation,
    normalizeAdminAiDropCoverModel,
} from "@/lib/ai-drop-covers";

describe("ai drop cover shared contract", () => {
    it("builds a title-driven hidden recipe with deterministic no-text rules", () => {
        const prompt = buildAdminAiDropCoverPrompt({
            title: "Midnight Cherry Crush",
            creatorName: "Kandy Lux",
            dropType: "content",
            tags: ["Sweet"],
        });

        expect(prompt).toContain("Midnight Cherry Crush");
        expect(prompt).toContain("Kandy Lux");
        expect(prompt).toContain("Do not render any readable text");
        expect(prompt).toContain("1:1 square image");
    });

    it("uses the fast Imagen cost basis for the default model", () => {
        expect(estimateAdminAiDropCoverCostUsd(ADMIN_AI_DROP_COVER_MODEL, 1)).toBe(0.02);
        expect(estimateAdminAiDropCoverCostUsd(ADMIN_AI_DROP_COVER_MODEL, 3)).toBe(0.06);
    });

    it("exposes safe default settings with admin toggle off by default", () => {
        const settings = getDefaultAdminAiDropCoverSettings();

        expect(settings.enabled).toBe(false);
        expect(settings.model).toBe(ADMIN_AI_DROP_COVER_MODEL);
        expect(settings.location).toBe(ADMIN_AI_DROP_COVER_DEFAULT_LOCATION);
        expect(settings.priceBasis).toBe(ADMIN_AI_DROP_COVER_PRICE_BASIS);
        expect(settings.aspectRatio).toBe("1:1");
    });

    it("migrates the legacy Imagen 3 fast default to Imagen 4 fast", () => {
        expect(normalizeAdminAiDropCoverModel("imagen-3.0-fast-generate-001")).toBe("imagen-4.0-fast-generate-001");
        expect(normalizeAdminAiDropCoverModel("imagen-4.0-generate-001")).toBe("imagen-4.0-generate-001");
    });

    it("migrates the legacy default location to the global endpoint for the migrated default model", () => {
        expect(normalizeAdminAiDropCoverLocation("us-central1", "imagen-3.0-fast-generate-001")).toBe("global");
        expect(normalizeAdminAiDropCoverLocation("us-central1", "imagen-4.0-generate-001")).toBe("us-central1");
    });
});
