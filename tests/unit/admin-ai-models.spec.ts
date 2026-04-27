import { describe, expect, it } from "vitest";

import {
    estimateAdminAiTextUsageCostUsd,
    getAdminAiModelAlias,
    getAdminAiModelDefinitionByKey,
    getAdminAiModelTruth,
} from "@/lib/admin-ai-models";

describe("admin ai model registry", () => {
    it("uses stable Flash-Lite aliases for text surfaces and preview ids for preview image models", () => {
        expect(getAdminAiModelAlias("drop_description_generation")).toBe("gemini-2.5-flash-lite");
        expect(getAdminAiModelAlias("drop_description_optimizer")).toBe("gemini-2.5-flash-lite");
        expect(getAdminAiModelAlias("debug_assistant")).toBe("gemini-3.1-flash-lite-preview");
        expect(getAdminAiModelAlias("drop_cover_premium")).toBe("gemini-3-pro-image-preview");
    });

    it("exposes the Gemini 3 Pro preview reference cap truthfully", () => {
        expect(getAdminAiModelDefinitionByKey("drop_cover_premium")?.maxReferenceInputs).toBe(14);
        expect(getAdminAiModelDefinitionByKey("drop_cover_premium")?.stableAliasSafe).toBe(false);
    });

    it("estimates Flash-Lite token cost and model truth", () => {
        expect(estimateAdminAiTextUsageCostUsd("gemini-2.5-flash-lite", {
            promptTokenCount: 2000,
            candidatesTokenCount: 500,
        })).toBe(0.0004);

        expect(getAdminAiModelTruth("gemini-2.5-flash-lite", "gemini-2.5-flash-lite-001")).toEqual({
            configuredAlias: "gemini-2.5-flash-lite",
            resolvedRuntimeModel: "gemini-2.5-flash-lite-001",
            runtimeVersionAvailable: true,
        });
    });
});
