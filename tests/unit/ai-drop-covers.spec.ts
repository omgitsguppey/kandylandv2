import { describe, expect, it } from "vitest";

import {
    ADMIN_AI_DROP_COVER_DEFAULT_LOCATION,
    ADMIN_AI_DROP_COVER_MODEL,
    ADMIN_AI_DROP_COVER_PREMIUM_MODEL,
    ADMIN_AI_DROP_COVER_PRICE_BASIS,
    buildAdminAiDropCoverPrompt,
    estimateAdminAiDropCoverCostUsd,
    getDefaultAdminAiDropCoverSettings,
    getAdminAiDropCoverPriceBasis,
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

    it("adds explicit reference-guided wording when cover references are active", () => {
        const prompt = buildAdminAiDropCoverPrompt({
            title: "Midnight Cherry Crush",
        }, {
            referenceGuided: true,
        });

        expect(prompt).toContain("provided KandyDrops cover references as style guidance");
    });

    it("uses the Gemini 2.5 Flash Image cost basis for the default model", () => {
        expect(estimateAdminAiDropCoverCostUsd(ADMIN_AI_DROP_COVER_MODEL, 1)).toBe(0.0387);
        expect(estimateAdminAiDropCoverCostUsd(ADMIN_AI_DROP_COVER_MODEL, 3)).toBe(0.1161);
        expect(getAdminAiDropCoverPriceBasis(ADMIN_AI_DROP_COVER_MODEL)).toBe(ADMIN_AI_DROP_COVER_PRICE_BASIS);
    });

    it("exposes safe default settings with admin toggle off by default", () => {
        const settings = getDefaultAdminAiDropCoverSettings();

        expect(settings.enabled).toBe(false);
        expect(settings.model).toBe(ADMIN_AI_DROP_COVER_MODEL);
        expect(settings.location).toBe(ADMIN_AI_DROP_COVER_DEFAULT_LOCATION);
        expect(settings.priceBasis).toBe(ADMIN_AI_DROP_COVER_PRICE_BASIS);
        expect(settings.aspectRatio).toBe("1:1");
        expect(settings.generationMode).toBe("standard");
        expect(settings.useTemplateReference).toBe(false);
        expect(settings.useRecentDropCoverReferences).toBe(false);
    });

    it("migrates the old Imagen defaults to Gemini 2.5 Flash Image", () => {
        expect(normalizeAdminAiDropCoverModel("imagen-3.0-fast-generate-001")).toBe("gemini-2.5-flash-image");
        expect(normalizeAdminAiDropCoverModel("imagen-4.0-fast-generate-001")).toBe("gemini-2.5-flash-image");
        expect(normalizeAdminAiDropCoverModel("gemini-3-pro-image-preview")).toBe("gemini-3-pro-image-preview");
    });

    it("migrates the legacy default location to the global endpoint for the migrated default model", () => {
        expect(normalizeAdminAiDropCoverLocation("us-central1", "imagen-3.0-fast-generate-001")).toBe("global");
        expect(normalizeAdminAiDropCoverLocation("us-central1", "imagen-4.0-fast-generate-001")).toBe("global");
        expect(normalizeAdminAiDropCoverLocation("us-central1", ADMIN_AI_DROP_COVER_PREMIUM_MODEL)).toBe("us-central1");
    });

    it("keeps Gemini defaults when reference-guided generation is active", () => {
        expect(normalizeAdminAiDropCoverModel("", "reference_guided")).toBe(ADMIN_AI_DROP_COVER_MODEL);
        expect(normalizeAdminAiDropCoverLocation("", ADMIN_AI_DROP_COVER_MODEL, "reference_guided")).toBe(ADMIN_AI_DROP_COVER_DEFAULT_LOCATION);
        expect(estimateAdminAiDropCoverCostUsd(ADMIN_AI_DROP_COVER_PREMIUM_MODEL, 1)).toBe(0.134);
    });
});
