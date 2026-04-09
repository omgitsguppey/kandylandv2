import { describe, expect, it } from "vitest";

import {
    ADMIN_AI_DROP_COVER_DEFAULT_LOCATION,
    ADMIN_AI_DROP_COVER_MODEL,
    ADMIN_AI_DROP_COVER_PREMIUM_MODEL,
    ADMIN_AI_DROP_COVER_PRICE_BASIS,
    buildAdminAiDropCoverConsistencyRecipe,
    buildAdminAiDropCoverPrompt,
    estimateAdminAiDropCoverCostUsd,
    getAdminAiDropCoverRecipeLabel,
    getDefaultAdminAiDropCoverSettings,
    getAdminAiDropCoverPriceBasis,
    normalizeAdminAiDropCoverLocation,
    normalizeAdminAiDropCoverModel,
    selectAdminAiDropCoverReferenceAssets,
} from "@/lib/ai-drop-covers";

describe("ai drop cover shared contract", () => {
    it("builds a title-driven prompt that asks for legible cover text", () => {
        const prompt = buildAdminAiDropCoverPrompt({
            title: "Midnight Cherry Crush",
            creatorName: "Kandy Lux",
            dropType: "content",
            tags: ["Sweet"],
        });

        expect(prompt).toContain("Midnight Cherry Crush");
        expect(prompt).toContain("Render Kandy Lux as the smaller creator-name treatment above the main title.");
        expect(prompt).toContain("Render the main title \"Midnight Cherry Crush\" clearly and legibly in the cover.");
        expect(prompt).not.toContain("Do not render any readable text");
        expect(prompt).toContain("Return a complete 1:1 square cover composition.");
    });

    it("adds the reference-image style instruction when cover references are active", () => {
        const prompt = buildAdminAiDropCoverPrompt({
            title: "Jessi Ray's Strawberry Shortcake",
            creatorName: "Jessi Ray",
        }, {
            referenceGuided: true,
        });

        expect(prompt).toContain("Use the provided reference image and maintain the same style, focusing this time on \"Jessi Ray's Strawberry Shortcake\"");
        expect(prompt).toContain("ensuring the color matches the title theme and the colors are easy to distinguish");
        expect(prompt).toContain("Render the main title \"Strawberry Shortcake\" clearly and legibly in the cover.");
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

    it("builds a consistency recipe from the drop title instead of relying on rendered model text", () => {
        const recipe = buildAdminAiDropCoverConsistencyRecipe({
            title: "Jessi Ray's Apple Pie",
            creatorName: "Jessi Ray",
        });

        expect(recipe.normalizedFlavorTitle).toBe("Apple Pie");
        expect(recipe.family).toBe("apple_spice");
        expect(recipe.focusTerms).toContain("apple");
        expect(getAdminAiDropCoverRecipeLabel(recipe)).toContain("apple spice");
    });

    it("ranks the house template and closest positive references ahead of weaker fallback references", () => {
        const recipe = buildAdminAiDropCoverConsistencyRecipe({
            title: "Blueberry Slush",
            creatorName: "Jessi Ray",
        });
        const ranked = selectAdminAiDropCoverReferenceAssets([
            {
                id: "template",
                source: "template",
                imageUrl: "https://example.com/template.png",
                title: "Current template",
            },
            {
                id: "liked-blueberry",
                source: "retained_ai_cover",
                imageUrl: "https://example.com/blueberry.png",
                title: "Blueberry Slush",
                creatorName: "Jessi Ray",
                retentionReason: "liked",
            },
            {
                id: "fallback",
                source: "catalog_drop_cover",
                imageUrl: "https://example.com/caramel.png",
                title: "Caramel Latte",
            },
        ], recipe, 3);

        expect(ranked[0]?.id).toBe("template");
        expect(ranked[1]?.id).toBe("liked-blueberry");
        expect(ranked[1]?.selectionReasons).toContain("same creator context");
    });
});
