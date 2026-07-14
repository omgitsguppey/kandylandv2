import { describe, expect, it } from "vitest";

import {
    GEMINI_3_1_FLASH_LITE_PREVIEW_MODEL,
    estimateAdminAiTextUsageCostUsd,
    getAdminAiModelAlias,
    getAdminAiModelAliasForRole,
    getAdminAiModelDefinitionByKey,
    getAdminAiModelTruth,
    validateAdminAiModelRoleAssignment,
} from "@/lib/admin-ai-models";

describe("admin ai model registry", () => {
    it("uses Gemini 3.1 Flash-Lite Preview for admin debug and cover prompt refinement while keeping image models unchanged", () => {
        expect(getAdminAiModelAlias("drop_description_generation")).toBe("gemini-2.5-flash-lite");
        expect(getAdminAiModelAlias("drop_description_optimizer")).toBe("gemini-2.5-flash-lite");
        expect(getAdminAiModelAlias("drop_cover_optimizer")).toBe(GEMINI_3_1_FLASH_LITE_PREVIEW_MODEL);
        expect(getAdminAiModelAlias("debug_assistant")).toBe(GEMINI_3_1_FLASH_LITE_PREVIEW_MODEL);
        expect(getAdminAiModelAlias("drop_cover_premium")).toBe("gemini-3-pro-image");
        expect(getAdminAiModelAliasForRole("admin_debug_fix_planner")).toBe(GEMINI_3_1_FLASH_LITE_PREVIEW_MODEL);
    });

    it("exposes the Gemini 3 Pro GA reference cap truthfully", () => {
        expect(getAdminAiModelDefinitionByKey("drop_cover_premium")?.maxReferenceInputs).toBe(14);
        expect(getAdminAiModelDefinitionByKey("drop_cover_premium")?.stableAliasSafe).toBe(true);
        expect(getAdminAiModelDefinitionByKey("drop_cover_premium")?.launchStage).toBe("ga");
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

    it("rejects image models for text-only admin debug roles", () => {
        expect(validateAdminAiModelRoleAssignment("admin_debug_assistant", "gemini-3-pro-image").ok).toBe(false);
        expect(validateAdminAiModelRoleAssignment("cover_prompt_refinement", "gemini-2.5-flash-image").ok).toBe(false);
        expect(validateAdminAiModelRoleAssignment("cover_image_generation", GEMINI_3_1_FLASH_LITE_PREVIEW_MODEL).ok).toBe(false);
    });

    it("migrates the retired Gemini 3 Pro Image preview alias to the GA owner", () => {
        expect(validateAdminAiModelRoleAssignment("cover_image_generation", "gemini-3-pro-image-preview")).toMatchObject({
            ok: true,
            normalizedAlias: "gemini-3-pro-image",
        });
    });
});
