export const ADMIN_AI_MODEL_PRICE_SOURCE_URL = "https://cloud.google.com/vertex-ai/generative-ai/pricing";
export const GEMINI_3_1_FLASH_LITE_PREVIEW_MODEL = "gemini-3.1-flash-lite-preview";

export type AdminAiModelKey =
    | "drop_cover_standard"
    | "drop_cover_premium"
    | "drop_cover_optimizer"
    | "drop_description_generation"
    | "drop_description_optimizer"
    | "debug_assistant";

export type AdminAiModelRole =
    | "admin_debug_assistant"
    | "admin_debug_fix_planner"
    | "cover_prompt_refinement"
    | "cover_image_generation"
    | "drop_description_generation"
    | "behavioral_summary"
    | "fallback_deterministic";

export type AdminAiModelModality = "image" | "text";
export type AdminAiModelLaunchStage = "ga" | "preview";

export interface AdminAiModelDefinition {
    key: AdminAiModelKey;
    alias: string;
    label: string;
    shortLabel: string;
    modality: AdminAiModelModality;
    launchStage: AdminAiModelLaunchStage;
    stableAliasSafe: boolean;
    location: string;
    priceSourceUrl: string;
    priceBasis: string;
    estimatedRunUsd?: number;
    inputUsdPerMillion?: number;
    outputUsdPerMillion?: number;
    maxReferenceInputs?: number;
    supportsReferenceLibrary?: boolean;
    supportsPromptOptimization?: boolean;
}

export type AdminAiModelReferenceRole =
    | "cover_image_generation"
    | "cover_prompt_refinement";

export type AdminAiModelRoleDefinition = {
    role: AdminAiModelRole;
    alias: string;
    modality: AdminAiModelModality | "none";
    provider: "vertex_ai" | "deterministic";
};

const ADMIN_AI_MODEL_DEFINITIONS: readonly AdminAiModelDefinition[] = [
    {
        key: "drop_cover_standard",
        alias: "gemini-2.5-flash-image",
        label: "Gemini 2.5 Flash Image",
        shortLabel: "2.5 Flash",
        modality: "image",
        launchStage: "ga",
        stableAliasSafe: true,
        location: "global",
        priceSourceUrl: ADMIN_AI_MODEL_PRICE_SOURCE_URL,
        priceBasis: "vertex-ai-pricing-gemini-2.5-flash-image-2026-04-06",
        estimatedRunUsd: 0.0387,
        maxReferenceInputs: 2,
        supportsReferenceLibrary: true,
        supportsPromptOptimization: true,
    },
    {
        key: "drop_cover_premium",
        alias: "gemini-3-pro-image-preview",
        label: "Gemini 3 Pro Image Preview",
        shortLabel: "3 Pro Preview",
        modality: "image",
        launchStage: "preview",
        stableAliasSafe: false,
        location: "global",
        priceSourceUrl: ADMIN_AI_MODEL_PRICE_SOURCE_URL,
        priceBasis: "vertex-ai-pricing-gemini-3-pro-image-preview-2026-04-06",
        estimatedRunUsd: 0.134,
        maxReferenceInputs: 2,
        supportsReferenceLibrary: true,
        supportsPromptOptimization: true,
    },
    {
        key: "drop_cover_optimizer",
        alias: GEMINI_3_1_FLASH_LITE_PREVIEW_MODEL,
        label: "Gemini 3.1 Flash-Lite Preview",
        shortLabel: "3.1 Flash-Lite Preview",
        modality: "text",
        launchStage: "preview",
        stableAliasSafe: false,
        location: "global",
        priceSourceUrl: ADMIN_AI_MODEL_PRICE_SOURCE_URL,
        priceBasis: "vertex-ai-pricing-gemini-3.1-flash-lite-preview-source-unverified-2026-05-05",
        supportsPromptOptimization: true,
    },
    {
        key: "drop_description_generation",
        alias: "gemini-2.5-flash-lite",
        label: "Gemini 2.5 Flash-Lite",
        shortLabel: "Flash-Lite",
        modality: "text",
        launchStage: "ga",
        stableAliasSafe: true,
        location: "global",
        priceSourceUrl: ADMIN_AI_MODEL_PRICE_SOURCE_URL,
        priceBasis: "vertex-ai-pricing-gemini-2.5-flash-lite-2026-04-11",
        inputUsdPerMillion: 0.1,
        outputUsdPerMillion: 0.4,
        supportsPromptOptimization: true,
    },
    {
        key: "drop_description_optimizer",
        alias: "gemini-2.5-flash-lite",
        label: "Gemini 2.5 Flash-Lite",
        shortLabel: "Flash-Lite",
        modality: "text",
        launchStage: "ga",
        stableAliasSafe: true,
        location: "global",
        priceSourceUrl: ADMIN_AI_MODEL_PRICE_SOURCE_URL,
        priceBasis: "vertex-ai-pricing-gemini-2.5-flash-lite-2026-04-11",
        inputUsdPerMillion: 0.1,
        outputUsdPerMillion: 0.4,
        supportsPromptOptimization: true,
    },
    {
        key: "debug_assistant",
        alias: GEMINI_3_1_FLASH_LITE_PREVIEW_MODEL,
        label: "Gemini 3.1 Flash-Lite Preview",
        shortLabel: "3.1 Flash-Lite Preview",
        modality: "text",
        launchStage: "preview",
        stableAliasSafe: false,
        location: "global",
        priceSourceUrl: ADMIN_AI_MODEL_PRICE_SOURCE_URL,
        priceBasis: "vertex-ai-pricing-gemini-3.1-flash-lite-preview-source-unverified-2026-05-05",
        supportsPromptOptimization: false,
    },
] as const;

const ADMIN_AI_MODEL_ROLE_DEFINITIONS: readonly AdminAiModelRoleDefinition[] = [
    {
        role: "admin_debug_assistant",
        alias: GEMINI_3_1_FLASH_LITE_PREVIEW_MODEL,
        modality: "text",
        provider: "vertex_ai",
    },
    {
        role: "admin_debug_fix_planner",
        alias: GEMINI_3_1_FLASH_LITE_PREVIEW_MODEL,
        modality: "text",
        provider: "vertex_ai",
    },
    {
        role: "cover_prompt_refinement",
        alias: GEMINI_3_1_FLASH_LITE_PREVIEW_MODEL,
        modality: "text",
        provider: "vertex_ai",
    },
    {
        role: "cover_image_generation",
        alias: getAdminAiModelAlias("drop_cover_standard"),
        modality: "image",
        provider: "vertex_ai",
    },
    {
        role: "drop_description_generation",
        alias: getAdminAiModelAlias("drop_description_generation"),
        modality: "text",
        provider: "vertex_ai",
    },
    {
        role: "behavioral_summary",
        alias: getAdminAiModelAlias("drop_description_generation"),
        modality: "text",
        provider: "vertex_ai",
    },
    {
        role: "fallback_deterministic",
        alias: "",
        modality: "none",
        provider: "deterministic",
    },
] as const;

export function listAdminAiModels() {
    return ADMIN_AI_MODEL_DEFINITIONS.map((entry) => ({ ...entry }));
}

export function getAdminAiModelDefinitionByKey(key: AdminAiModelKey) {
    return ADMIN_AI_MODEL_DEFINITIONS.find((entry) => entry.key === key) || null;
}

export function getAdminAiModelDefinitionByAlias(alias?: string | null) {
    if (!alias) {
        return null;
    }
    return ADMIN_AI_MODEL_DEFINITIONS.find((entry) => entry.alias === alias) || null;
}

export function getAdminAiModelAlias(key: AdminAiModelKey) {
    return getAdminAiModelDefinitionByKey(key)?.alias || "";
}

export function getAdminAiModelRoleDefinition(role: AdminAiModelRole) {
    return ADMIN_AI_MODEL_ROLE_DEFINITIONS.find((entry) => entry.role === role) || null;
}

export function getAdminAiModelAliasForRole(role: AdminAiModelRole) {
    return getAdminAiModelRoleDefinition(role)?.alias || "";
}

export function isAdminAiImageModelAlias(alias?: string | null) {
    return getAdminAiModelDefinitionByAlias(alias)?.modality === "image";
}

export function isAdminAiTextModelAlias(alias?: string | null) {
    return getAdminAiModelDefinitionByAlias(alias)?.modality === "text";
}

export function normalizeAdminAiModelAlias(alias: string | null | undefined, fallbackKey: AdminAiModelKey) {
    const trimmedAlias = alias?.trim() || "";
    if (!trimmedAlias) {
        return getAdminAiModelAlias(fallbackKey);
    }

    return getAdminAiModelDefinitionByAlias(trimmedAlias)?.alias || getAdminAiModelAlias(fallbackKey);
}

export function normalizeAdminAiModelAliasForRole(alias: string | null | undefined, role: AdminAiModelRole) {
    const roleDefinition = getAdminAiModelRoleDefinition(role);
    if (!roleDefinition || roleDefinition.provider === "deterministic") {
        return "";
    }
    const pinnedPreviewRole = role === "admin_debug_assistant"
        || role === "admin_debug_fix_planner"
        || role === "cover_prompt_refinement";

    const trimmedAlias = alias?.trim() || "";
    if (!trimmedAlias) {
        return roleDefinition.alias;
    }

    if (pinnedPreviewRole) {
        return roleDefinition.alias;
    }

    const resolved = getAdminAiModelDefinitionByAlias(trimmedAlias);
    if (!resolved) {
        return roleDefinition.alias;
    }

    if (roleDefinition.modality !== resolved.modality) {
        return roleDefinition.alias;
    }

    return resolved.alias;
}

export function validateAdminAiModelRoleAssignment(role: AdminAiModelRole, alias?: string | null) {
    const roleDefinition = getAdminAiModelRoleDefinition(role);
    if (!roleDefinition) {
        return {
            ok: false,
            normalizedAlias: "",
            reason: `Unknown admin AI model role: ${role}.`,
        };
    }

    if (roleDefinition.provider === "deterministic") {
        return {
            ok: true,
            normalizedAlias: "",
            reason: "Deterministic fallback does not use a paid model.",
        };
    }

    const trimmedAlias = alias?.trim() || "";
    if (!trimmedAlias) {
        return {
            ok: true,
            normalizedAlias: roleDefinition.alias,
            reason: `${role} defaults to ${roleDefinition.alias}.`,
        };
    }

    const resolved = getAdminAiModelDefinitionByAlias(trimmedAlias);
    if (!resolved) {
        return {
            ok: false,
            normalizedAlias: trimmedAlias,
            reason: `Configured alias ${trimmedAlias || "(empty)"} is not present in the admin AI model registry.`,
        };
    }

    if (roleDefinition.modality === "image" && resolved.modality !== "image") {
        return {
            ok: false,
            normalizedAlias: resolved.alias,
            reason: `${role} must use an image-generation model.`,
        };
    }

    if (roleDefinition.modality === "text" && resolved.modality !== "text") {
        return {
            ok: false,
            normalizedAlias: resolved.alias,
            reason: `${role} must use a text model, not an image-generation model.`,
        };
    }

    return {
        ok: true,
        normalizedAlias: resolved.alias,
        reason: `${role} resolves to ${resolved.alias}.`,
    };
}

export function getAiModelReferenceLimit(
    modelId?: string | null,
    role: AdminAiModelReferenceRole = "cover_image_generation",
) {
    if (role !== "cover_image_generation") {
        return 0;
    }

    const resolvedModelId = normalizeAdminAiModelAliasForRole(modelId, role);
    return getAdminAiModelDefinitionByAlias(resolvedModelId)?.maxReferenceInputs ?? 0;
}

export interface AdminAiUsageMetadataLike {
    promptTokenCount?: number | null;
    candidatesTokenCount?: number | null;
    totalTokenCount?: number | null;
}

function toTokenNumber(value: unknown) {
    return typeof value === "number" && Number.isFinite(value) && value >= 0
        ? value
        : 0;
}

export function estimateAdminAiTextUsageCostUsd(
    modelAlias: string,
    usage?: AdminAiUsageMetadataLike | null,
) {
    const definition = getAdminAiModelDefinitionByAlias(modelAlias);
    if (!definition || definition.modality !== "text") {
        return 0;
    }

    const inputCost = definition.inputUsdPerMillion || 0;
    const outputCost = definition.outputUsdPerMillion || 0;
    const promptTokens = toTokenNumber(usage?.promptTokenCount);
    const outputTokens = toTokenNumber(usage?.candidatesTokenCount);

    const total = ((promptTokens / 1_000_000) * inputCost) + ((outputTokens / 1_000_000) * outputCost);
    return Number(total.toFixed(6));
}

export function getAdminAiModelTruth(configuredAlias: string, resolvedRuntimeModel?: string | null) {
    return {
        configuredAlias,
        resolvedRuntimeModel: resolvedRuntimeModel?.trim() || null,
        runtimeVersionAvailable: typeof resolvedRuntimeModel === "string" && resolvedRuntimeModel.trim().length > 0,
    };
}
