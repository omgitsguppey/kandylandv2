import { describe, expect, it } from "vitest";

import {
    ADMIN_AI_DROP_DESCRIPTION_MODEL,
    ADMIN_AI_DROP_DESCRIPTION_OPTIMIZER_MODEL,
    buildAdminAiDropDescriptionPrompt,
    buildAdminAiDropDescriptionRecipe,
    estimateAdminAiDropDescriptionCostUsd,
    getDefaultAdminAiDropDescriptionPromptPolicy,
    getDefaultAdminAiDropDescriptionSettings,
    normalizeAdminAiDropDescriptionModel,
} from "@/lib/ai-drop-descriptions";

describe("ai drop descriptions shared contract", () => {
    it("defaults description generation to Gemini 2.5 Flash-Lite", () => {
        const settings = getDefaultAdminAiDropDescriptionSettings();
        const policy = getDefaultAdminAiDropDescriptionPromptPolicy();

        expect(settings.model).toBe("gemini-2.5-flash-lite");
        expect(settings.optimizerModel).toBe("gemini-2.5-flash-lite");
        expect(policy.optimizerModel).toBe("gemini-2.5-flash-lite");
        expect(ADMIN_AI_DROP_DESCRIPTION_MODEL).toBe("gemini-2.5-flash-lite");
        expect(ADMIN_AI_DROP_DESCRIPTION_OPTIMIZER_MODEL).toBe("gemini-2.5-flash-lite");
    });

    it("builds a flavor-specific recipe without anchoring to one food form", () => {
        const recipe = buildAdminAiDropDescriptionRecipe({
            title: "Bloomytrip | Cherry Crush",
            creatorName: "Bloomytrip",
        });

        expect(recipe.flavorTitle).toBe("Cherry Crush");
        expect(recipe.subjectDirection).toContain("Cherry Crush");
        expect(recipe.antiAnchoringDirection).toContain("do not copy the exact subject format");
    });

    it("builds a prompt with locked rules, mutable rules, and reference examples", () => {
        const prompt = buildAdminAiDropDescriptionPrompt({
            title: "Bloomytrip | Cherry Crush",
            creatorName: "Bloomytrip",
        }, {
            examples: [
                {
                    dropId: "drop_1",
                    creatorId: "creator_1",
                    title: "Bloomytrip | Apple Pie",
                    description: "A polished apple pie drop with warm spice energy.",
                    source: "creator_history",
                },
            ],
        });

        expect(prompt).toContain("Write exactly 1 to 2 sentences.");
        expect(prompt).toContain("Flavor title: Cherry Crush.");
        expect(prompt).toContain("Reference examples for tone only");
        expect(prompt).toContain("Return only the finished description");
    });

    it("normalizes missing or unknown models back to Flash-Lite", () => {
        expect(normalizeAdminAiDropDescriptionModel("")).toBe("gemini-2.5-flash-lite");
        expect(normalizeAdminAiDropDescriptionModel("gemini-1.5-pro")).toBe("gemini-2.5-flash-lite");
    });

    it("estimates token cost from usage metadata", () => {
        expect(estimateAdminAiDropDescriptionCostUsd("gemini-2.5-flash-lite", {
            promptTokenCount: 1000,
            candidatesTokenCount: 500,
        })).toBe(0.0003);
    });
});
