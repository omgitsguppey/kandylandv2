export const ADMIN_AI_MODEL_PRICE_SOURCE_URL = "https://cloud.google.com/vertex-ai/generative-ai/pricing";

export type AdminAiModelKey =
    | "drop_cover_standard"
    | "drop_cover_premium"
    | "drop_cover_optimizer"
    | "drop_description_generation"
    | "drop_description_optimizer"
    | "debug_assistant";

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
        maxReferenceInputs: 6,
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
        maxReferenceInputs: 14,
        supportsReferenceLibrary: true,
        supportsPromptOptimization: true,
    },
    {
        key: "drop_cover_optimizer",
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
        alias: "gemini-3.1-flash-lite-preview",
        label: "Gemini 3.1 Flash-Lite (Preview)",
        shortLabel: "Flash-Lite",
        modality: "text",
        launchStage: "ga",
        stableAliasSafe: true,
        location: "global",
        priceSourceUrl: ADMIN_AI_MODEL_PRICE_SOURCE_URL,
        priceBasis: "vertex-ai-pricing-gemini-3.1-flash-lite-preview-2026-04-11",
        inputUsdPerMillion: 0.1,
        outputUsdPerMillion: 0.4,
        supportsPromptOptimization: false,
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

export function normalizeAdminAiModelAlias(alias: string | null | undefined, fallbackKey: AdminAiModelKey) {
    const trimmedAlias = alias?.trim() || "";
    if (!trimmedAlias) {
        return getAdminAiModelAlias(fallbackKey);
    }

    return getAdminAiModelDefinitionByAlias(trimmedAlias)?.alias || getAdminAiModelAlias(fallbackKey);
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
