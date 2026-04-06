import { describe, expect, it } from "vitest";

import {
    ADMIN_AI_DROP_COVER_MODEL,
    ADMIN_AI_DROP_COVER_PRICE_BASIS,
    buildAdminAiDropCoverPrompt,
    estimateAdminAiDropCoverCostUsd,
    getDefaultAdminAiDropCoverSettings,
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
        expect(settings.priceBasis).toBe(ADMIN_AI_DROP_COVER_PRICE_BASIS);
        expect(settings.aspectRatio).toBe("1:1");
    });
});
