import { z } from "zod";

import {
    ADMIN_AI_MODEL_PRICE_SOURCE_URL,
    estimateAdminAiTextUsageCostUsd,
    getAdminAiModelAlias,
    getAdminAiModelDefinitionByAlias,
    normalizeAdminAiModelAlias,
    type AdminAiUsageMetadataLike,
} from "@/lib/admin-ai-models";
import { parseAdminAiDropCoverTitle } from "@/lib/ai-drop-covers";

export const ADMIN_AI_DROP_DESCRIPTION_SETTINGS_DOC = "aiDropDescriptions";
export const ADMIN_AI_DROP_DESCRIPTION_JOBS_COLLECTION = "admin_ai_drop_description_jobs";
export const ADMIN_AI_DROP_DESCRIPTION_SUMMARY_COLLECTION = "admin_ai_drop_description_summary";
export const ADMIN_AI_DROP_DESCRIPTION_SUMMARY_DOC = "overview";
export const ADMIN_AI_DROP_DESCRIPTION_PROMPT_POLICY_DOC = "aiDropDescriptionPromptPolicy";
export const ADMIN_AI_DROP_DESCRIPTION_PROMPT_POLICY_HISTORY_COLLECTION = "admin_ai_drop_description_prompt_policy_history";

export const ADMIN_AI_DROP_DESCRIPTION_MODEL = getAdminAiModelAlias("drop_description_generation");
export const ADMIN_AI_DROP_DESCRIPTION_OPTIMIZER_MODEL = getAdminAiModelAlias("drop_description_optimizer");
export const ADMIN_AI_DROP_DESCRIPTION_DEFAULT_LOCATION = "global";
export const ADMIN_AI_DROP_DESCRIPTION_PROMPT_VERSION = "drop-description-v1";
export const ADMIN_AI_DROP_DESCRIPTION_PRICE_SOURCE_URL = ADMIN_AI_MODEL_PRICE_SOURCE_URL;
export const ADMIN_AI_DROP_DESCRIPTION_PRICE_BASIS = "vertex-ai-pricing-gemini-2.5-flash-lite-2026-04-11";
export const ADMIN_AI_DROP_DESCRIPTION_ACTIVE_POLL_INTERVAL_MS = 2_500;
export const ADMIN_AI_DROP_DESCRIPTION_IDLE_POLL_INTERVAL_MS = 10_000;

export type AdminAiDropDescriptionRuntimeStatus =
    | "disabled"
    | "ready"
    | "missing_project"
    | "auth_missing"
    | "error";

export type AdminAiDropDescriptionJobStatus = "running" | "succeeded" | "failed";
export type AdminAiDropDescriptionFeedback = "neutral" | "liked" | "disliked";
export type AdminAiDropDescriptionFeedbackAction = "like" | "dislike" | "accept" | "link_drop";
export type AdminAiDropDescriptionPromptEditSource = "default" | "optimizer" | "manual_override";
export type AdminAiDropDescriptionPromptOptimizerStatus = "idle" | "running" | "ready" | "degraded" | "error";
export type AdminAiDropDescriptionErrorCode =
    | "feature_disabled"
    | "validation_failed"
    | "draft_session_required"
    | "runtime_unavailable"
    | "provider_unavailable"
    | "provider_timeout"
    | "database_failed";

export interface AdminAiDropDescriptionPromptInput {
    title: string;
    creatorId?: string | null;
    creatorName?: string | null;
}

export interface AdminAiDropDescriptionConsistencyRecipe {
    creatorDisplayName?: string | null;
    flavorTitle: string;
    flavorTerms: string[];
    subjectDirection: string;
    paletteDirection: string;
    toneDirection: string;
    antiAnchoringDirection: string;
}

export interface AdminAiDropDescriptionUsageMetadata extends AdminAiUsageMetadataLike {
    promptTokenCount?: number | null;
    candidatesTokenCount?: number | null;
    totalTokenCount?: number | null;
}

export interface AdminAiDropDescriptionExample {
    dropId: string;
    creatorId?: string | null;
    title: string;
    description: string;
    source: "creator_history" | "catalog_fallback";
}

export interface AdminAiDropDescriptionSettings {
    enabled: boolean;
    model: string;
    location: string;
    optimizerModel: string;
    optimizerEnabled: boolean;
    priceSourceUrl: string;
    priceBasis: string;
    inputUsdPerMillion: number;
    outputUsdPerMillion: number;
    updatedAtMs?: number;
    updatedByUid?: string;
    updatedByEmail?: string | null;
}

export interface AdminAiDropDescriptionPromptPolicyPerformance {
    generationCount: number;
    acceptedCount: number;
    likedCount: number;
    dislikedCount: number;
}

export interface AdminAiDropDescriptionPromptPolicy {
    version: number;
    optimizerModel: string;
    autoOptimize: boolean;
    optimizerStatus: AdminAiDropDescriptionPromptOptimizerStatus;
    optimizerNote?: string | null;
    optimizerProposal?: string | null;
    baseInstructionPrompt: string;
    lockedClauses: string[];
    mutableClauses: string[];
    currentMutablePrompt: string;
    lastAcceptedPrompt?: string | null;
    lastOptimizerRunAtMs?: number | null;
    lastAcceptedAtMs?: number | null;
    lastAutoRefinementDiff?: string[];
    lastEditedAtMs?: number | null;
    lastEditedByUid?: string;
    lastEditedByEmail?: string | null;
    creatorPerformance?: Record<string, AdminAiDropDescriptionPromptPolicyPerformance>;
}

export interface AdminAiDropDescriptionPromptPolicyHistoryEntry {
    id: string;
    version: number;
    source: AdminAiDropDescriptionPromptEditSource;
    action: "generation" | "feedback" | "manual_edit";
    previousMutablePrompt?: string | null;
    nextMutablePrompt: string;
    diff: string[];
    createdAtMs: number;
    actorUid?: string | null;
    actorEmail?: string | null;
    jobId?: string | null;
    feedbackAction?: AdminAiDropDescriptionFeedbackAction | null;
}

export interface AdminAiDropDescriptionJobRecord {
    id: string;
    title: string;
    creatorId?: string | null;
    creatorName?: string | null;
    dropId?: string | null;
    draftSessionId?: string | null;
    model: string;
    resolvedModel?: string | null;
    location: string;
    promptVersion: string;
    promptEditSource?: AdminAiDropDescriptionPromptEditSource;
    promptPolicyVersion?: number;
    workingPrompt?: string | null;
    optimizerAdjustedPrompt?: string | null;
    recipe?: AdminAiDropDescriptionConsistencyRecipe | null;
    descriptionText?: string | null;
    status: AdminAiDropDescriptionJobStatus;
    feedback: AdminAiDropDescriptionFeedback;
    accepted: boolean;
    requestedAtMs: number;
    completedAtMs?: number | null;
    latencyMs?: number | null;
    estimatedCostUsd: number;
    billed: boolean;
    usageMetadata?: AdminAiDropDescriptionUsageMetadata | null;
    selectedExamples?: AdminAiDropDescriptionExample[];
    creatorHistoryCount?: number;
    catalogFallbackCount?: number;
    degradedExampleLookup?: boolean;
    validationWarnings?: string[];
    acceptedAtMs?: number | null;
    acceptedForDropId?: string | null;
    errorMessage?: string | null;
}

export interface AdminAiDropDescriptionReviewGalleryItem {
    id: string;
    title: string;
    descriptionText: string;
    feedback: AdminAiDropDescriptionFeedback;
    status: AdminAiDropDescriptionJobStatus;
    requestedAtMs: number;
    model: string;
    accepted: boolean;
}

export interface AdminAiDropDescriptionSummaryRecord {
    generationCount: number;
    successfulGenerationCount: number;
    failedGenerationCount: number;
    acceptedCount: number;
    likedCount: number;
    dislikedCount: number;
    regeneratedCount: number;
    totalEstimatedCostUsd: number;
    averageLatencyMs: number;
    activeGenerationCount: number;
    lastSuccessAtMs?: number | null;
    lastFailureAtMs?: number | null;
}

export const adminAiDropDescriptionConsistencyRecipeSchema = z.object({
    creatorDisplayName: z.string().nullable().optional(),
    flavorTitle: z.string(),
    flavorTerms: z.array(z.string()),
    subjectDirection: z.string(),
    paletteDirection: z.string(),
    toneDirection: z.string(),
    antiAnchoringDirection: z.string(),
});

export const adminAiDropDescriptionUsageMetadataSchema = z.object({
    promptTokenCount: z.number().nullable().optional(),
    candidatesTokenCount: z.number().nullable().optional(),
    totalTokenCount: z.number().nullable().optional(),
});

export const adminAiDropDescriptionExampleSchema = z.object({
    dropId: z.string(),
    creatorId: z.string().nullable().optional(),
    title: z.string(),
    description: z.string(),
    source: z.enum(["creator_history", "catalog_fallback"]),
});

export const adminAiDropDescriptionSettingsSchema = z.object({
    enabled: z.boolean(),
    model: z.string(),
    location: z.string(),
    optimizerModel: z.string(),
    optimizerEnabled: z.boolean(),
    priceSourceUrl: z.string(),
    priceBasis: z.string(),
    inputUsdPerMillion: z.number(),
    outputUsdPerMillion: z.number(),
    updatedAtMs: z.number().optional(),
    updatedByUid: z.string().optional(),
    updatedByEmail: z.string().nullable().optional(),
});

export const adminAiDropDescriptionPromptPolicyPerformanceSchema = z.object({
    generationCount: z.number(),
    acceptedCount: z.number(),
    likedCount: z.number(),
    dislikedCount: z.number(),
});

export const adminAiDropDescriptionPromptPolicySchema = z.object({
    version: z.number(),
    optimizerModel: z.string(),
    autoOptimize: z.boolean(),
    optimizerStatus: z.enum(["idle", "running", "ready", "degraded", "error"]),
    optimizerNote: z.string().nullable().optional(),
    optimizerProposal: z.string().nullable().optional(),
    baseInstructionPrompt: z.string(),
    lockedClauses: z.array(z.string()),
    mutableClauses: z.array(z.string()),
    currentMutablePrompt: z.string(),
    lastAcceptedPrompt: z.string().nullable().optional(),
    lastOptimizerRunAtMs: z.number().nullable().optional(),
    lastAcceptedAtMs: z.number().nullable().optional(),
    lastAutoRefinementDiff: z.array(z.string()).optional(),
    lastEditedAtMs: z.number().nullable().optional(),
    lastEditedByUid: z.string().optional(),
    lastEditedByEmail: z.string().nullable().optional(),
    creatorPerformance: z.record(z.string(), adminAiDropDescriptionPromptPolicyPerformanceSchema).optional(),
});

export const adminAiDropDescriptionPromptPolicyHistoryEntrySchema = z.object({
    id: z.string(),
    version: z.number(),
    source: z.enum(["default", "optimizer", "manual_override"]),
    action: z.enum(["generation", "feedback", "manual_edit"]),
    previousMutablePrompt: z.string().nullable().optional(),
    nextMutablePrompt: z.string(),
    diff: z.array(z.string()),
    createdAtMs: z.number(),
    actorUid: z.string().nullable().optional(),
    actorEmail: z.string().nullable().optional(),
    jobId: z.string().nullable().optional(),
    feedbackAction: z.enum(["like", "dislike", "accept", "link_drop"]).nullable().optional(),
});

export const adminAiDropDescriptionJobSchema = z.object({
    id: z.string(),
    title: z.string(),
    creatorId: z.string().nullable().optional(),
    creatorName: z.string().nullable().optional(),
    dropId: z.string().nullable().optional(),
    draftSessionId: z.string().nullable().optional(),
    model: z.string(),
    resolvedModel: z.string().nullable().optional(),
    location: z.string(),
    promptVersion: z.string(),
    promptEditSource: z.enum(["default", "optimizer", "manual_override"]).optional(),
    promptPolicyVersion: z.number().optional(),
    workingPrompt: z.string().nullable().optional(),
    optimizerAdjustedPrompt: z.string().nullable().optional(),
    recipe: adminAiDropDescriptionConsistencyRecipeSchema.nullable().optional(),
    descriptionText: z.string().nullable().optional(),
    status: z.enum(["running", "succeeded", "failed"]),
    feedback: z.enum(["neutral", "liked", "disliked"]),
    accepted: z.boolean(),
    requestedAtMs: z.number(),
    completedAtMs: z.number().nullable().optional(),
    latencyMs: z.number().nullable().optional(),
    estimatedCostUsd: z.number(),
    billed: z.boolean(),
    usageMetadata: adminAiDropDescriptionUsageMetadataSchema.nullable().optional(),
    selectedExamples: z.array(adminAiDropDescriptionExampleSchema).optional(),
    creatorHistoryCount: z.number().optional(),
    catalogFallbackCount: z.number().optional(),
    degradedExampleLookup: z.boolean().optional(),
    validationWarnings: z.array(z.string()).optional(),
    acceptedAtMs: z.number().nullable().optional(),
    acceptedForDropId: z.string().nullable().optional(),
    errorMessage: z.string().nullable().optional(),
});

export const adminAiDropDescriptionReviewGalleryItemSchema = z.object({
    id: z.string(),
    title: z.string(),
    descriptionText: z.string(),
    feedback: z.enum(["neutral", "liked", "disliked"]),
    status: z.enum(["running", "succeeded", "failed"]),
    requestedAtMs: z.number(),
    model: z.string(),
    accepted: z.boolean(),
});

export const adminAiDropDescriptionRuntimeSchema = z.object({
    enabled: z.boolean(),
    status: z.enum(["disabled", "ready", "missing_project", "auth_missing", "error"]),
    note: z.string(),
    project: z.string(),
    location: z.string(),
    model: z.string(),
    resolvedModel: z.string().nullable().optional(),
    priceSourceUrl: z.string(),
    priceBasis: z.string(),
    inputUsdPerMillion: z.number(),
    outputUsdPerMillion: z.number(),
});

export const adminAiDropDescriptionSummarySchema = z.object({
    refreshedAtMs: z.number(),
    settings: adminAiDropDescriptionSettingsSchema,
    runtime: adminAiDropDescriptionRuntimeSchema,
    aggregate: z.object({
        generationCount: z.number(),
        successfulGenerationCount: z.number(),
        failedGenerationCount: z.number(),
        acceptedCount: z.number(),
        likedCount: z.number(),
        dislikedCount: z.number(),
        regeneratedCount: z.number(),
        totalEstimatedCostUsd: z.number(),
        averageLatencyMs: z.number(),
        activeGenerationCount: z.number(),
        lastSuccessAtMs: z.number().nullable().optional(),
        lastFailureAtMs: z.number().nullable().optional(),
    }),
    recentJobs: z.array(adminAiDropDescriptionJobSchema),
    promptPolicy: adminAiDropDescriptionPromptPolicySchema,
    promptPolicyHistory: z.array(adminAiDropDescriptionPromptPolicyHistoryEntrySchema),
    reviewGallery: z.array(adminAiDropDescriptionReviewGalleryItemSchema),
});

const TITLE_TERM_STOP_WORDS = new Set([
    "and",
    "the",
    "drop",
    "edition",
    "exclusive",
    "with",
    "from",
    "for",
]);

const DEFAULT_BASE_PROMPT = "Write a premium KandyDrops drop description that sounds polished, specific, and easy to skim.";
const DEFAULT_LOCKED_CLAUSES = [
    "Write exactly 1 to 2 sentences.",
    "Keep it concrete and consumer-facing.",
    "Make the flavor identity and mood obvious without sounding generic.",
    "Do not mention prices, Gum Drops, subscriptions, shipping, or admin workflow.",
    "Do not use hashtags, bullet points, quotation marks, or emojis.",
];
const DEFAULT_MUTABLE_CLAUSES = [
    "Blend creator energy with flavor-led specificity.",
    "Keep the copy scroll-stopping but readable.",
    "Avoid repeating the title word-for-word unless needed for clarity.",
];

function normalizeFlavorTerms(title: string, creatorName?: string | null) {
    const parsed = parseAdminAiDropCoverTitle(title, creatorName || undefined);
    const flavorTitle = parsed.normalizedFlavorTitle;
    const flavorTerms = flavorTitle
        .split(/[^A-Za-z0-9]+/)
        .map((token) => token.trim().toLowerCase())
        .filter((token) => token.length >= 3 && !TITLE_TERM_STOP_WORDS.has(token));

    return {
        creatorDisplayName: parsed.creatorDisplayName,
        flavorTitle,
        flavorTerms: Array.from(new Set(flavorTerms)).slice(0, 6),
    };
}

function inferPaletteDirection(flavorTerms: string[]) {
    if (flavorTerms.some((term) => ["cherry", "strawberry", "berry", "raspberry", "watermelon"].includes(term))) {
        return "Lean into bright red, pink, or berry-toned color language.";
    }
    if (flavorTerms.some((term) => ["apple", "lime", "mint", "matcha"].includes(term))) {
        return "Lean into crisp green, cool, or refreshing color language.";
    }
    if (flavorTerms.some((term) => ["orange", "mango", "peach", "pineapple", "lemon"].includes(term))) {
        return "Lean into bright citrus or tropical color language.";
    }
    if (flavorTerms.some((term) => ["chocolate", "coffee", "mocha", "cookie", "brownie"].includes(term))) {
        return "Lean into rich indulgent color language with darker premium contrast.";
    }
    return "Lean into the flavor's most legible dominant color and keep the imagery distinct from the source examples.";
}

export function buildAdminAiDropDescriptionRecipe(input: AdminAiDropDescriptionPromptInput): AdminAiDropDescriptionConsistencyRecipe {
    const parsed = normalizeFlavorTerms(input.title, input.creatorName);
    return {
        creatorDisplayName: parsed.creatorDisplayName,
        flavorTitle: parsed.flavorTitle,
        flavorTerms: parsed.flavorTerms,
        subjectDirection: `Focus on ${parsed.flavorTitle} as the hero flavor idea and keep the object choice aligned to that flavor rather than any prior example's exact food form.`,
        paletteDirection: inferPaletteDirection(parsed.flavorTerms),
        toneDirection: "Sound premium, concise, and visually vivid without collapsing into generic dessert copy.",
        antiAnchoringDirection: "Keep the design language consistent but do not copy the exact subject format or stale phrasing from earlier examples when the title points somewhere else.",
    };
}

export function buildAdminAiDropDescriptionPrompt(
    input: AdminAiDropDescriptionPromptInput,
    options?: {
        recipe?: AdminAiDropDescriptionConsistencyRecipe | null;
        promptPolicy?: AdminAiDropDescriptionPromptPolicy | null;
        examples?: AdminAiDropDescriptionExample[];
        manualPromptOverride?: string | null;
    },
) {
    const recipe = options?.recipe || buildAdminAiDropDescriptionRecipe(input);
    const policy = options?.promptPolicy || getDefaultAdminAiDropDescriptionPromptPolicy();
    const mutablePrompt = options?.manualPromptOverride?.trim()
        || policy.currentMutablePrompt.trim()
        || policy.mutableClauses.join(" ");

    return [
        policy.baseInstructionPrompt || DEFAULT_BASE_PROMPT,
        ...policy.lockedClauses,
        `Flavor title: ${recipe.flavorTitle}.`,
        recipe.creatorDisplayName ? `Creator name to preserve in tone context: ${recipe.creatorDisplayName}.` : "",
        recipe.subjectDirection,
        recipe.paletteDirection,
        recipe.toneDirection,
        recipe.antiAnchoringDirection,
        mutablePrompt,
        Array.isArray(options?.examples) && options.examples.length > 0
            ? `Reference examples for tone only: ${options.examples.map((example, index) => `Example ${index + 1} title "${example.title}" | copy "${example.description}"`).join(" ")}`
            : "",
        `Return only the finished description for "${input.title.trim()}".`,
    ].filter((line) => line.length > 0).join(" ");
}

export function getDefaultAdminAiDropDescriptionSettings(): AdminAiDropDescriptionSettings {
    const modelDefinition = getAdminAiModelDefinitionByAlias(ADMIN_AI_DROP_DESCRIPTION_MODEL);
    return {
        enabled: false,
        model: ADMIN_AI_DROP_DESCRIPTION_MODEL,
        location: ADMIN_AI_DROP_DESCRIPTION_DEFAULT_LOCATION,
        optimizerModel: ADMIN_AI_DROP_DESCRIPTION_OPTIMIZER_MODEL,
        optimizerEnabled: true,
        priceSourceUrl: ADMIN_AI_DROP_DESCRIPTION_PRICE_SOURCE_URL,
        priceBasis: ADMIN_AI_DROP_DESCRIPTION_PRICE_BASIS,
        inputUsdPerMillion: modelDefinition?.inputUsdPerMillion || 0.1,
        outputUsdPerMillion: modelDefinition?.outputUsdPerMillion || 0.4,
    };
}

export function getDefaultAdminAiDropDescriptionPromptPolicy(): AdminAiDropDescriptionPromptPolicy {
    return {
        version: 1,
        optimizerModel: ADMIN_AI_DROP_DESCRIPTION_OPTIMIZER_MODEL,
        autoOptimize: true,
        optimizerStatus: "idle",
        optimizerNote: "Description optimizer ready.",
        optimizerProposal: null,
        baseInstructionPrompt: DEFAULT_BASE_PROMPT,
        lockedClauses: [...DEFAULT_LOCKED_CLAUSES],
        mutableClauses: [...DEFAULT_MUTABLE_CLAUSES],
        currentMutablePrompt: DEFAULT_MUTABLE_CLAUSES.join(" "),
        lastAcceptedPrompt: null,
        lastOptimizerRunAtMs: null,
        lastAcceptedAtMs: null,
        lastAutoRefinementDiff: [],
        lastEditedAtMs: null,
        lastEditedByUid: undefined,
        lastEditedByEmail: undefined,
        creatorPerformance: {},
    };
}

export function normalizeAdminAiDropDescriptionModel(model?: string | null) {
    return normalizeAdminAiModelAlias(model, "drop_description_generation");
}

export function getAdminAiDropDescriptionPriceBasis(model = ADMIN_AI_DROP_DESCRIPTION_MODEL) {
    return getAdminAiModelDefinitionByAlias(model)?.priceBasis || ADMIN_AI_DROP_DESCRIPTION_PRICE_BASIS;
}

export function estimateAdminAiDropDescriptionCostUsd(
    model = ADMIN_AI_DROP_DESCRIPTION_MODEL,
    usage?: AdminAiUsageMetadataLike | null,
) {
    return estimateAdminAiTextUsageCostUsd(model, usage);
}

export function formatAdminAiUsd(value: number) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: value >= 1 ? 2 : 4,
        maximumFractionDigits: value >= 1 ? 2 : 6,
    }).format(value);
}
