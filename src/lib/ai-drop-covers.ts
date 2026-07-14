import { z } from "zod";
import {
    ADMIN_AI_MODEL_PRICE_SOURCE_URL,
    getAdminAiModelAlias,
    getAiModelReferenceLimit,
    normalizeAdminAiModelAlias,
} from "@/lib/admin-ai-models";
import { buildCoverSemanticBrief } from "@/lib/ai-cover/cover-semantic-brief";
import { compileCoverPrompt } from "@/lib/ai-cover/cover-prompt-compiler";
import { parseCoverTitle } from "@/lib/ai-cover/cover-title-parser";
import { selectDeterministicCoverReferences } from "@/lib/ai-cover/cover-reference-selector";
import { resolveCoverReferenceEligibility } from "@/lib/ai-cover/cover-reference-eligibility";
import type { CoverFeedbackKind } from "@/lib/ai-cover/cover-learning-contract";

export const ADMIN_AI_DROP_COVER_SETTINGS_DOC = "aiDropCovers";
export const ADMIN_AI_DROP_COVER_JOBS_COLLECTION = "admin_ai_drop_cover_jobs";
export const ADMIN_AI_DROP_COVER_SUMMARY_COLLECTION = "admin_ai_drop_cover_summary";
export const ADMIN_AI_DROP_COVER_SUMMARY_DOC = "overview";
export const ADMIN_AI_DROP_COVER_REFERENCE_LIBRARY_COLLECTION = "admin_ai_drop_cover_reference_library";
export const ADMIN_AI_DROP_COVER_PROMPT_POLICY_DOC = "aiDropCoverPromptPolicy";
export const ADMIN_AI_DROP_COVER_PROMPT_POLICY_HISTORY_COLLECTION = "admin_ai_drop_cover_prompt_policy_history";

export const ADMIN_AI_DROP_COVER_MODEL = getAdminAiModelAlias("drop_cover_standard");
export const ADMIN_AI_DROP_COVER_PREMIUM_MODEL = getAdminAiModelAlias("drop_cover_premium");
export const ADMIN_AI_DROP_COVER_OPTIMIZER_MODEL = getAdminAiModelAlias("drop_cover_optimizer");
export const ADMIN_AI_DROP_COVER_DEFAULT_LOCATION = "global";
const LEGACY_ADMIN_AI_DROP_COVER_MODEL_ALIASES = new Set([
    "imagen-3.0-fast-generate-001",
    "imagen-4.0-fast-generate-001",
    "imagen-3.0-capability-001",
]);
const LEGACY_ADMIN_AI_DROP_COVER_GLOBAL_LOCATION_ALIASES = new Set([
    ...LEGACY_ADMIN_AI_DROP_COVER_MODEL_ALIASES,
    "gemini-3-pro-image-preview",
]);
const LEGACY_ADMIN_AI_DROP_COVER_LOCATION_ALIASES = new Set(["us-central1"]);
export const ADMIN_AI_DROP_COVER_PROMPT_VERSION = "drop-cover-v4";
export const ADMIN_AI_DROP_COVER_PRICE_BASIS = "vertex-ai-pricing-gemini-2.5-flash-image-2026-04-06";
export const ADMIN_AI_DROP_COVER_PREMIUM_PRICE_BASIS = "vertex-ai-pricing-gemini-3-pro-image-ga-2026-07-14";
export const ADMIN_AI_DROP_COVER_PRICE_SOURCE_URL = ADMIN_AI_MODEL_PRICE_SOURCE_URL;
export const ADMIN_AI_DROP_COVER_OUTPUT_MIME_TYPE = "image/png";
export const ADMIN_AI_DROP_COVER_ACTIVE_POLL_INTERVAL_MS = 2_500;
export const ADMIN_AI_DROP_COVER_IDLE_POLL_INTERVAL_MS = 10_000;
export const ADMIN_AI_DROP_COVER_LAYOUT_REFERENCE_LIMIT = 2;

export type AdminAiDropCoverSelectableModel =
    | typeof ADMIN_AI_DROP_COVER_MODEL
    | typeof ADMIN_AI_DROP_COVER_PREMIUM_MODEL;

export type AdminAiDropCoverPromptOptimizerModel =
    | typeof ADMIN_AI_DROP_COVER_OPTIMIZER_MODEL;

export const ADMIN_AI_DROP_COVER_MODEL_OPTIONS = [
    {
        id: ADMIN_AI_DROP_COVER_MODEL,
        label: "Gemini 2.5 Flash Image",
        shortLabel: "2.5 Flash",
        provider: "gemini",
        launchStage: "ga",
        pricePerGenerationUsd: 0.0387,
        priceBasis: ADMIN_AI_DROP_COVER_PRICE_BASIS,
        location: ADMIN_AI_DROP_COVER_DEFAULT_LOCATION,
        maxReferenceInputs: ADMIN_AI_DROP_COVER_LAYOUT_REFERENCE_LIMIT,
        supportsReferenceLibrary: true,
        supportsPromptOptimization: true,
    },
    {
        id: ADMIN_AI_DROP_COVER_PREMIUM_MODEL,
        label: "Gemini 3 Pro Image",
        shortLabel: "3 Pro",
        provider: "gemini",
        launchStage: "ga",
        pricePerGenerationUsd: 0.134,
        priceBasis: ADMIN_AI_DROP_COVER_PREMIUM_PRICE_BASIS,
        location: ADMIN_AI_DROP_COVER_DEFAULT_LOCATION,
        maxReferenceInputs: getAiModelReferenceLimit(ADMIN_AI_DROP_COVER_PREMIUM_MODEL, "cover_image_generation")
            || ADMIN_AI_DROP_COVER_LAYOUT_REFERENCE_LIMIT,
        supportsReferenceLibrary: true,
        supportsPromptOptimization: true,
    },
] as const;

export type AdminAiDropCoverRuntimeStatus =
    | "disabled"
    | "ready"
    | "missing_project"
    | "auth_missing"
    | "error";

export type AdminAiDropCoverPreflightStatus = "pass" | "warn" | "fail";

export type AdminAiDropCoverJobStatus = "running" | "succeeded" | "failed";

export type AdminAiDropCoverFeedback = "neutral" | "liked" | "disliked";

export type AdminAiDropCoverFeedbackAction =
    | "like"
    | "dislike"
    | "accept"
    | "link_drop";

export type AdminAiDropCoverGenerationMode = "standard" | "reference_guided";

export type AdminAiDropCoverPromptEditSource = "default" | "optimizer" | "manual_override";

export type AdminAiDropCoverPromptOptimizerStatus =
    | "idle"
    | "running"
    | "ready"
    | "degraded"
    | "error";

export type AdminAiDropCoverErrorCode =
    | "feature_disabled"
    | "validation_failed"
    | "draft_session_required"
    | "runtime_unavailable"
    | "model_location_unavailable"
    | "provider_unavailable"
    | "provider_timeout"
    | "storage_failed"
    | "database_failed";

export type AdminAiDropCoverFlavorFamily =
    | "apple_spice"
    | "berry"
    | "citrus"
    | "cream"
    | "chocolate"
    | "coffee"
    | "mint"
    | "tropical"
    | "candy"
    | "neutral";

export type AdminAiDropCoverSubjectCategory =
    | "drink"
    | "frozen"
    | "fruit"
    | "candy"
    | "baked"
    | "cream"
    | "chocolate"
    | "coffee"
    | "other";

export interface AdminAiDropCoverPromptInput {
    title: string;
    creatorId?: string | null;
    creatorName?: string | null;
    dropType?: "content" | "promo" | "external" | string | null;
    tags?: string[] | null;
}

export interface AdminAiDropCoverConsistencyRecipe {
    family: AdminAiDropCoverFlavorFamily;
    creatorId?: string | null;
    creatorName?: string | null;
    creatorDisplayName?: string | null;
    normalizedFlavorTitle: string;
    subjectCategory: AdminAiDropCoverSubjectCategory;
    focusTerms: string[];
    heroSubject: string;
    paletteDirection: string;
    lightingDirection: string;
    backgroundDirection: string;
    compositionDirection: string;
    overlayDirection: string;
    antiAnchoringDirection: string;
}

export interface AdminAiDropCoverSettings {
    enabled: boolean;
    model: string;
    location: string;
    optimizerModel: AdminAiDropCoverPromptOptimizerModel;
    optimizerEnabled: boolean;
    aspectRatio: "1:1";
    outputMimeType: string;
    pricePerGenerationUsd: number;
    priceBasis: string;
    priceSourceUrl: string;
    generationMode: AdminAiDropCoverGenerationMode;
    useTemplateReference: boolean;
    useRecentDropCoverReferences: boolean;
    templateReferenceUrl?: string | null;
    templateReferenceStoragePath?: string | null;
    templateReferenceFileName?: string | null;
    primaryStyleReferenceId?: string | null;
    updatedAtMs?: number;
    updatedByUid?: string;
    updatedByEmail?: string | null;
}

export interface AdminAiDropCoverPromptPolicyPerformance {
    generationCount: number;
    acceptedCount: number;
    likedCount: number;
    dislikedCount: number;
}

export interface AdminAiDropCoverPromptPolicy {
    version: number;
    optimizerModel: AdminAiDropCoverPromptOptimizerModel;
    autoOptimize: boolean;
    optimizerStatus: AdminAiDropCoverPromptOptimizerStatus;
    optimizerNote?: string | null;
    optimizerProposal?: string | null;
    baseStylePrompt: string;
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
    categoryPerformance?: Record<string, AdminAiDropCoverPromptPolicyPerformance>;
}

export interface AdminAiDropCoverPromptPolicyHistoryEntry {
    id: string;
    version: number;
    source: AdminAiDropCoverPromptEditSource;
    action: "generation" | "feedback" | "manual_edit";
    previousMutablePrompt?: string | null;
    nextMutablePrompt: string;
    diff: string[];
    createdAtMs: number;
    actorUid?: string | null;
    actorEmail?: string | null;
    jobId?: string | null;
    feedbackAction?: AdminAiDropCoverFeedbackAction | null;
}

export interface AdminAiDropCoverJobRecord {
    id: string;
    title: string;
    creatorId?: string | null;
    creatorName?: string | null;
    dropId?: string | null;
    draftSessionId?: string | null;
    clientRequestId?: string | null;
    model: string;
    location: string;
    generationMode: AdminAiDropCoverGenerationMode;
    promptVersion: string;
    promptEditSource?: AdminAiDropCoverPromptEditSource;
    promptPolicyVersion?: number;
    workingPrompt?: string | null;
    optimizerAdjustedPrompt?: string | null;
    providerEnhancedPrompt?: string | null;
    recipeLabel: string;
    consistencyRecipe?: AdminAiDropCoverConsistencyRecipe;
    status: AdminAiDropCoverJobStatus;
    feedback: AdminAiDropCoverFeedback;
    accepted: boolean;
    requestedAtMs: number;
    completedAtMs?: number | null;
    latencyMs?: number | null;
    estimatedCostUsd: number;
    billed: boolean;
    imageUrl?: string | null;
    storagePath?: string | null;
    mimeType?: string | null;
    fileName?: string | null;
    previousJobId?: string | null;
    chainId?: string | null;
    chainDepth?: number;
    referenceImageCount?: number;
    templateReferenceUsed?: boolean;
    catalogDropReferenceCount?: number;
    recentDropReferenceCount?: number;
    retainedAiReferenceCount?: number;
    retainedAcceptedAiReferenceCount?: number;
    retainedLikedAiReferenceCount?: number;
    referenceAssets?: AdminAiDropCoverReferenceAsset[];
    referenceRequestCount?: number;
    referenceTruncated?: boolean;
    referenceLimitApplied?: boolean;
    usedReferenceCount?: number;
    maxReferenceCount?: number;
    droppedReferenceCount?: number;
    overAnchoringRisk?: "low" | "medium" | "high";
    validationWarnings?: string[];
    manualReuseApproved?: boolean;
    acceptedAtMs?: number | null;
    acceptedForDropId?: string | null;
    errorMessage?: string | null;
}

export interface AdminAiDropCoverReferenceAsset {
    id: string;
    source: "template" | "house_reference" | "catalog_drop_cover" | "recent_drop_cover" | "retained_ai_cover";
    imageUrl: string;
    fileName?: string | null;
    storagePath?: string | null;
    dropId?: string | null;
    title?: string | null;
    creatorId?: string | null;
    creatorName?: string | null;
    retentionReason?: "template" | "pinned" | "catalog" | "accepted" | "liked" | "manual";
    primary?: boolean;
    pinned?: boolean;
    reusable?: boolean;
    active?: boolean;
    accepted?: boolean;
    feedback?: AdminAiDropCoverFeedback | null;
    usageCount?: number;
    successfulReuseCount?: number;
    positiveReuseCount?: number;
    acceptedReuseCount?: number;
    likedReuseCount?: number;
    negativeReuseCount?: number;
    lastUsedAtMs?: number | null;
    selectionScore?: number;
    selectionReasons?: string[];
}

export interface AdminAiDropCoverModelOption {
    id: AdminAiDropCoverSelectableModel;
    label: string;
    shortLabel: string;
    provider: "gemini";
    launchStage: "ga" | "preview";
    pricePerGenerationUsd: number;
    priceBasis: string;
    location: string;
    maxReferenceInputs: number;
    supportsReferenceLibrary: boolean;
    supportsPromptOptimization: boolean;
}

export interface AdminAiDropCoverPreflightCheck {
    key: string;
    label: string;
    status: AdminAiDropCoverPreflightStatus;
    detail: string;
    updatedAtMs?: number | null;
}

export interface AdminAiDropCoverModelHealth {
    id: AdminAiDropCoverSelectableModel;
    label: string;
    shortLabel: string;
    provider: "gemini";
    launchStage: "ga" | "preview";
    pricePerGenerationUsd: number;
    selected: boolean;
    location: string;
    runtimeStatus: AdminAiDropCoverRuntimeStatus;
    preflightStatus: AdminAiDropCoverPreflightStatus;
    note: string;
    authReady: boolean;
    recentGenerationCount: number;
    recentSuccessCount: number;
    recentFailureCount: number;
    activeGenerationCount: number;
    lastRequestedAtMs?: number | null;
    lastSuccessAtMs?: number | null;
    lastFailureAtMs?: number | null;
    lastFailureMessage?: string | null;
    diagnosticWarnCount: number;
    diagnosticErrorCount: number;
    maxReferenceInputs: number;
    supportsReferenceLibrary: boolean;
    supportsPromptOptimization: boolean;
}

export interface AdminAiDropCoverRuntimeDiagnostic {
    id: string;
    severity: "info" | "warn" | "error";
    message: string;
    createdAtMs: number;
    model?: string | null;
    generationMode?: AdminAiDropCoverGenerationMode | null;
    jobId?: string | null;
    failureCode?: string | null;
    summary?: string | null;
}

export interface AdminAiDropCoverVisualSignalSummary {
    templateCount: number;
    houseReferenceCount: number;
    catalogDropCoverCount: number;
    retainedAiCoverCount: number;
    acceptedRetainedCount: number;
    likedRetainedCount: number;
    dislikedHistoryCount: number;
    totalReusableReferenceCount: number;
    referenceGuidanceReady: boolean;
}

export interface AdminAiDropCoverReviewGalleryItem {
    id: string;
    title: string;
    imageUrl: string;
    feedback: AdminAiDropCoverFeedback;
    status: AdminAiDropCoverJobStatus;
    requestedAtMs: number;
    model: string;
    reusable: boolean;
    accepted: boolean;
}

export interface AdminAiDropCoverSummaryRecord {
    generationCount: number;
    successfulGenerationCount: number;
    failedGenerationCount: number;
    acceptedCount: number;
    likedCount: number;
    dislikedCount: number;
    regeneratedCount: number;
    totalEstimatedCostUsd: number;
    totalLatencyMs: number;
    latencySampleCount: number;
    lastSuccessAtMs?: number | null;
    lastFailureAtMs?: number | null;
    updatedAtMs?: number;
}

export const adminAiDropCoverPromptPolicyPerformanceSchema = z.object({
    generationCount: z.number(),
    acceptedCount: z.number(),
    likedCount: z.number(),
    dislikedCount: z.number(),
});

export const adminAiDropCoverJobSchema = z.object({
    id: z.string(),
    title: z.string(),
    creatorId: z.string().nullable().optional(),
    creatorName: z.string().nullable().optional(),
    dropId: z.string().nullable().optional(),
    draftSessionId: z.string().nullable().optional(),
    clientRequestId: z.string().nullable().optional(),
    model: z.string(),
    location: z.string(),
    generationMode: z.enum(["standard", "reference_guided"]),
    promptVersion: z.string(),
    promptEditSource: z.enum(["default", "optimizer", "manual_override"]).optional(),
    promptPolicyVersion: z.number().optional(),
    workingPrompt: z.string().nullable().optional(),
    optimizerAdjustedPrompt: z.string().nullable().optional(),
    providerEnhancedPrompt: z.string().nullable().optional(),
    recipeLabel: z.string(),
    consistencyRecipe: z.lazy(() => adminAiDropCoverConsistencyRecipeSchema).optional(),
    status: z.enum(["running", "succeeded", "failed"]),
    feedback: z.enum(["neutral", "liked", "disliked"]),
    accepted: z.boolean(),
    requestedAtMs: z.number(),
    completedAtMs: z.number().nullable().optional(),
    latencyMs: z.number().nullable().optional(),
    estimatedCostUsd: z.number(),
    billed: z.boolean(),
    imageUrl: z.string().nullable().optional(),
    storagePath: z.string().nullable().optional(),
    mimeType: z.string().nullable().optional(),
    fileName: z.string().nullable().optional(),
    previousJobId: z.string().nullable().optional(),
    chainId: z.string().nullable().optional(),
    chainDepth: z.number().optional(),
    referenceImageCount: z.number().optional(),
    templateReferenceUsed: z.boolean().optional(),
    catalogDropReferenceCount: z.number().optional(),
    recentDropReferenceCount: z.number().optional(),
    retainedAiReferenceCount: z.number().optional(),
    retainedAcceptedAiReferenceCount: z.number().optional(),
    retainedLikedAiReferenceCount: z.number().optional(),
    referenceAssets: z.array(z.lazy(() => adminAiDropCoverReferenceAssetSchema)).optional(),
    referenceRequestCount: z.number().optional(),
    referenceTruncated: z.boolean().optional(),
    referenceLimitApplied: z.boolean().optional(),
    usedReferenceCount: z.number().optional(),
    maxReferenceCount: z.number().optional(),
    droppedReferenceCount: z.number().optional(),
    overAnchoringRisk: z.enum(["low", "medium", "high"]).optional(),
    validationWarnings: z.array(z.string()).optional(),
    manualReuseApproved: z.boolean().optional(),
    acceptedAtMs: z.number().nullable().optional(),
    acceptedForDropId: z.string().nullable().optional(),
    errorMessage: z.string().nullable().optional(),
});

export const adminAiDropCoverSettingsSchema = z.object({
    enabled: z.boolean(),
    model: z.string(),
    location: z.string(),
    optimizerModel: z.literal(ADMIN_AI_DROP_COVER_OPTIMIZER_MODEL),
    optimizerEnabled: z.boolean(),
    aspectRatio: z.literal("1:1"),
    outputMimeType: z.string(),
    pricePerGenerationUsd: z.number(),
    priceBasis: z.string(),
    priceSourceUrl: z.string().url(),
    generationMode: z.enum(["standard", "reference_guided"]),
    useTemplateReference: z.boolean(),
    useRecentDropCoverReferences: z.boolean(),
    templateReferenceUrl: z.string().url().nullable().optional(),
    templateReferenceStoragePath: z.string().nullable().optional(),
    templateReferenceFileName: z.string().nullable().optional(),
    primaryStyleReferenceId: z.string().nullable().optional(),
    updatedAtMs: z.number().optional(),
    updatedByUid: z.string().optional(),
    updatedByEmail: z.string().nullable().optional(),
});

export const adminAiDropCoverPromptPolicySchema = z.object({
    version: z.number(),
    optimizerModel: z.literal(ADMIN_AI_DROP_COVER_OPTIMIZER_MODEL),
    autoOptimize: z.boolean(),
    optimizerStatus: z.enum(["idle", "running", "ready", "degraded", "error"]),
    optimizerNote: z.string().nullable().optional(),
    optimizerProposal: z.string().nullable().optional(),
    baseStylePrompt: z.string(),
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
    categoryPerformance: z.record(z.string(), adminAiDropCoverPromptPolicyPerformanceSchema).optional(),
});

export const adminAiDropCoverPromptPolicyHistoryEntrySchema = z.object({
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

export const adminAiDropCoverRuntimeSchema = z.object({
    enabled: z.boolean(),
    status: z.enum(["disabled", "ready", "missing_project", "auth_missing", "error"]),
    note: z.string(),
    project: z.string(),
    location: z.string(),
    model: z.string(),
    generationMode: z.enum(["standard", "reference_guided"]),
    pricePerGenerationUsd: z.number(),
    priceBasis: z.string(),
    priceSourceUrl: z.string().url(),
});

export const adminAiDropCoverPreflightCheckSchema = z.object({
    key: z.string(),
    label: z.string(),
    status: z.enum(["pass", "warn", "fail"]),
    detail: z.string(),
    updatedAtMs: z.number().nullable().optional(),
});

export const adminAiDropCoverConsistencyRecipeSchema = z.object({
    family: z.enum(["apple_spice", "berry", "citrus", "cream", "chocolate", "coffee", "mint", "tropical", "candy", "neutral"]),
    creatorId: z.string().nullable().optional(),
    creatorName: z.string().nullable().optional(),
    creatorDisplayName: z.string().nullable().optional(),
    normalizedFlavorTitle: z.string(),
    subjectCategory: z.enum(["drink", "frozen", "fruit", "candy", "baked", "cream", "chocolate", "coffee", "other"]),
    focusTerms: z.array(z.string()),
    heroSubject: z.string(),
    paletteDirection: z.string(),
    lightingDirection: z.string(),
    backgroundDirection: z.string(),
    compositionDirection: z.string(),
    overlayDirection: z.string(),
    antiAnchoringDirection: z.string(),
});

export const adminAiDropCoverReferenceAssetSchema = z.object({
    id: z.string(),
    source: z.enum(["template", "house_reference", "catalog_drop_cover", "recent_drop_cover", "retained_ai_cover"]),
    imageUrl: z.string().url(),
    fileName: z.string().nullable().optional(),
    storagePath: z.string().nullable().optional(),
    dropId: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    creatorId: z.string().nullable().optional(),
    creatorName: z.string().nullable().optional(),
    retentionReason: z.enum(["template", "pinned", "catalog", "accepted", "liked", "manual"]).optional(),
    primary: z.boolean().optional(),
    pinned: z.boolean().optional(),
    reusable: z.boolean().optional(),
    active: z.boolean().optional(),
    accepted: z.boolean().optional(),
    feedback: z.enum(["neutral", "liked", "disliked"]).nullable().optional(),
    usageCount: z.number().optional(),
    successfulReuseCount: z.number().optional(),
    positiveReuseCount: z.number().optional(),
    acceptedReuseCount: z.number().optional(),
    likedReuseCount: z.number().optional(),
    negativeReuseCount: z.number().optional(),
    lastUsedAtMs: z.number().nullable().optional(),
    selectionScore: z.number().optional(),
    selectionReasons: z.array(z.string()).optional(),
});

export const adminAiDropCoverModelHealthSchema = z.object({
    id: z.enum(["gemini-2.5-flash-image", "gemini-3-pro-image"]),
    label: z.string(),
    shortLabel: z.string(),
    provider: z.literal("gemini"),
    launchStage: z.enum(["ga", "preview"]),
    pricePerGenerationUsd: z.number(),
    selected: z.boolean(),
    location: z.string(),
    runtimeStatus: z.enum(["disabled", "ready", "missing_project", "auth_missing", "error"]),
    preflightStatus: z.enum(["pass", "warn", "fail"]),
    note: z.string(),
    authReady: z.boolean(),
    recentGenerationCount: z.number(),
    recentSuccessCount: z.number(),
    recentFailureCount: z.number(),
    activeGenerationCount: z.number(),
    lastRequestedAtMs: z.number().nullable().optional(),
    lastSuccessAtMs: z.number().nullable().optional(),
    lastFailureAtMs: z.number().nullable().optional(),
    lastFailureMessage: z.string().nullable().optional(),
    diagnosticWarnCount: z.number(),
    diagnosticErrorCount: z.number(),
    maxReferenceInputs: z.number(),
    supportsReferenceLibrary: z.boolean(),
    supportsPromptOptimization: z.boolean(),
});

export const adminAiDropCoverRuntimeDiagnosticSchema = z.object({
    id: z.string(),
    severity: z.enum(["info", "warn", "error"]),
    message: z.string(),
    createdAtMs: z.number(),
    model: z.string().nullable().optional(),
    generationMode: z.enum(["standard", "reference_guided"]).nullable().optional(),
    jobId: z.string().nullable().optional(),
    failureCode: z.string().nullable().optional(),
    summary: z.string().nullable().optional(),
});

export const adminAiDropCoverVisualSignalSummarySchema = z.object({
    templateCount: z.number(),
    houseReferenceCount: z.number(),
    catalogDropCoverCount: z.number(),
    retainedAiCoverCount: z.number(),
    acceptedRetainedCount: z.number(),
    likedRetainedCount: z.number(),
    dislikedHistoryCount: z.number(),
    totalReusableReferenceCount: z.number(),
    referenceGuidanceReady: z.boolean(),
});

export const adminAiDropCoverReviewGalleryItemSchema = z.object({
    id: z.string(),
    title: z.string(),
    imageUrl: z.string().url(),
    feedback: z.enum(["neutral", "liked", "disliked"]),
    status: z.enum(["running", "succeeded", "failed"]),
    requestedAtMs: z.number(),
    model: z.string(),
    reusable: z.boolean(),
    accepted: z.boolean(),
});

export const adminAiDropCoverSummarySchema = z.object({
    refreshedAtMs: z.number(),
    settings: adminAiDropCoverSettingsSchema,
    runtime: adminAiDropCoverRuntimeSchema,
    preflightChecks: z.array(adminAiDropCoverPreflightCheckSchema),
    modelHealth: z.array(adminAiDropCoverModelHealthSchema),
    recentDiagnostics: z.array(adminAiDropCoverRuntimeDiagnosticSchema),
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
    recentJobs: z.array(adminAiDropCoverJobSchema),
    referenceAssets: z.object({
        template: adminAiDropCoverReferenceAssetSchema.nullable(),
        houseReferences: z.array(adminAiDropCoverReferenceAssetSchema),
        catalogDropCovers: z.array(adminAiDropCoverReferenceAssetSchema),
        retainedAiCovers: z.array(adminAiDropCoverReferenceAssetSchema),
    }),
    visualSignals: adminAiDropCoverVisualSignalSummarySchema,
    promptPolicy: adminAiDropCoverPromptPolicySchema,
    promptPolicyHistory: z.array(adminAiDropCoverPromptPolicyHistoryEntrySchema),
    reviewGallery: z.array(adminAiDropCoverReviewGalleryItemSchema),
});

const DEFAULT_RECIPE_LABEL = "KandyDrops title-safe cover art";
const TITLE_TOKEN_STOP_WORDS = new Set([
    "a",
    "an",
    "and",
    "by",
    "drop",
    "edition",
    "exclusive",
    "flavor",
    "for",
    "from",
    "kandydrops",
    "of",
    "the",
    "with",
]);
const FLAVOR_FAMILY_RULES: Array<{
    family: AdminAiDropCoverFlavorFamily;
    keywords: string[];
    paletteDirection: string;
    lightingDirection: string;
    backgroundDirection: string;
}> = [
    {
        family: "apple_spice",
        keywords: ["apple", "cinnamon", "caramel", "pumpkin", "pecan", "cobbler", "spice", "baked"],
        paletteDirection: "Use warm amber, cinnamon, and baked sugar tones without forcing the hero into pastry form unless the flavor explicitly calls for pie, cobbler, or another baked item.",
        lightingDirection: "Use polished warm highlights with tactile gloss and depth, like premium food packaging rather than a literal bakery scene.",
        backgroundDirection: "Build a glowing warm background with spice-led color haze and minimal secondary props.",
    },
    {
        family: "berry",
        keywords: ["berry", "blueberry", "strawberry", "raspberry", "blackberry", "cherry", "grape"],
        paletteDirection: "Use bold berry-driven reds, magentas, violets, or garnet tones with crisp color separation and jewel-like highlights.",
        lightingDirection: "Use glossy premium highlights that suit drinks, candy, frozen treats, or fruit without assuming one food format.",
        backgroundDirection: "Create a saturated berry atmosphere with controlled bokeh and clean subject separation.",
    },
    {
        family: "citrus",
        keywords: ["lemon", "lime", "orange", "citrus", "yuzu", "sorbet"],
        paletteDirection: "Use bright citrus color energy with strong yellow, lime, or orange contrast and clean white balance.",
        lightingDirection: "Use fresh, high-clarity highlights with crisp edges and premium product gloss.",
        backgroundDirection: "Use an airy citrus glow with clean depth and no crowded garnish collage.",
    },
    {
        family: "cream",
        keywords: ["cream", "cake", "vanilla", "cheesecake", "sundae", "ice", "milkshake", "custard"],
        paletteDirection: "Use creamy base tones with one dominant flavor color accent and clearly separated secondary colors.",
        lightingDirection: "Use luscious dessert lighting with polished highlights, creamy depth, and tactile texture.",
        backgroundDirection: "Create a soft confection bokeh backdrop with premium depth and minimal prop noise.",
    },
    {
        family: "chocolate",
        keywords: ["chocolate", "cocoa", "brownie", "cookie", "fudge", "mocha"],
        paletteDirection: "Use rich cocoa and dark confection tones with glossy highlights and premium restraint.",
        lightingDirection: "Use cinematic dessert lighting with deep shadows, glossy syrup highlights, and rich texture detail.",
        backgroundDirection: "Build a dark premium confection background with soft glow and limited supporting props.",
    },
    {
        family: "coffee",
        keywords: ["coffee", "espresso", "latte", "mocha", "cappuccino"],
        paletteDirection: "Use espresso, caramel, cream, and roast tones with polished warmth and readable tonal separation.",
        lightingDirection: "Use editorial cafe-style lighting with premium gloss but without forcing mugs or pastries unless the flavor explicitly asks for them.",
        backgroundDirection: "Create a moody roasted atmosphere with subtle haze and clean visual hierarchy.",
    },
    {
        family: "mint",
        keywords: ["mint", "peppermint", "matcha"],
        paletteDirection: "Use a cool mint-led palette with luminous highlights and clean premium dessert contrast.",
        lightingDirection: "Use crisp cooling light with frosted highlights and glossy premium detail.",
        backgroundDirection: "Build a chilled glow background with soft bokeh and restrained frost-like atmosphere.",
    },
    {
        family: "tropical",
        keywords: ["mango", "pineapple", "banana", "coconut", "peach", "melon", "watermelon"],
        paletteDirection: "Use vibrant tropical hues with one dominant fruit color and supporting accent contrast that still reads clearly at thumbnail size.",
        lightingDirection: "Use juicy, polished highlights and bright premium lighting without collapsing into a generic smoothie or pie format.",
        backgroundDirection: "Create a saturated tropical atmosphere with clean depth and disciplined secondary elements.",
    },
    {
        family: "candy",
        keywords: ["cotton", "candy", "bubblegum", "gummy", "taffy", "lollipop"],
        paletteDirection: "Use a candy-premium palette with one dominant flavor color, glossy sheen, and playful depth.",
        lightingDirection: "Use polished confection lighting with clean highlights and tactile candy texture.",
        backgroundDirection: "Build a glowing candy-world backdrop with soft bokeh and disciplined prop use.",
    },
];
const SUBJECT_CATEGORY_RULES: Array<{
    category: AdminAiDropCoverSubjectCategory;
    keywords: string[];
}> = [
    { category: "drink", keywords: ["slushy", "soda", "juice", "cola", "drink", "tea", "boba", "punch", "spritz", "lemonade"] },
    { category: "frozen", keywords: ["ice", "sorbet", "gelato", "frozen", "float", "snow", "freeze"] },
    { category: "fruit", keywords: ["apple", "berry", "cherry", "grape", "mango", "pineapple", "banana", "peach", "melon", "orange", "lime", "lemon"] },
    { category: "candy", keywords: ["candy", "gummy", "taffy", "lollipop", "bubblegum", "cotton"] },
    { category: "baked", keywords: ["pie", "cake", "brownie", "cookie", "cobbler", "pastry", "donut", "muffin", "bakery"] },
    { category: "cream", keywords: ["cream", "custard", "shake", "milkshake", "sundae", "cheesecake", "vanilla"] },
    { category: "chocolate", keywords: ["chocolate", "cocoa", "fudge"] },
    { category: "coffee", keywords: ["coffee", "espresso", "latte", "cappuccino", "mocha"] },
];
const COLOR_DIRECTION_RULES: Array<{
    keywords: string[];
    direction: string;
}> = [
    { keywords: ["cherry", "strawberry", "raspberry", "watermelon"], direction: "Anchor the palette in vivid cherry-red and crushed pink tones with high contrast accents." },
    { keywords: ["blueberry", "grape", "blackberry"], direction: "Anchor the palette in indigo, violet, and deep berry tones with bright highlight contrast." },
    { keywords: ["apple", "lime", "mint", "matcha"], direction: "Anchor the palette in fresh green tones with controlled cool highlights and readable neutrals." },
    { keywords: ["lemon", "banana", "pineapple"], direction: "Anchor the palette in electric yellow and golden tones with crisp separation from white and black." },
    { keywords: ["orange", "mango", "peach"], direction: "Anchor the palette in orange and sunset tones with warm highlight separation and bold contrast." },
    { keywords: ["chocolate", "coffee", "mocha", "cocoa"], direction: "Anchor the palette in dark cocoa, roast, and caramel tones with polished metallic highlights." },
];
const DEFAULT_STYLE_LOCKED_CLAUSES = [
    "Use approved references only for layout, typography hierarchy, centered framing, title placement, and lower ribbon structure.",
    "Keep the creator-name treatment above the main flavor title when a creator name is available.",
    "Keep the main flavor title bold, legible, and thumbnail-safe.",
    "Keep one centered hero and one distinct lower ribbon or CTA band.",
    "Preserve the KandyDrops square poster system without copying reference ingredients, props, palette, or flavor objects.",
];
const DEFAULT_MUTABLE_CLAUSES = [
    "Build the hero, palette, and atmosphere only from the requested title flavor.",
    "Ignore reference flavor, food, garnish, candy, drink, chocolate, fruit, marshmallow, cream, and prop details unless those words appear in the current title.",
    "Make the new flavor visually distinct while keeping the approved layout system.",
];
const DEFAULT_BASE_STYLE_PROMPT = "Create premium square KandyDrops cover art from the creator name and requested flavor title.";

function normalizeTag(label: string) {
    return label.trim().toLowerCase();
}

function buildDropTypeNote(dropType?: string | null) {
    if (dropType === "promo") {
        return "Compose like a premium campaign poster with a single focal subject and clean promotional framing.";
    }

    if (dropType === "external") {
        return "Compose like a polished editorial cover with a single focal subject and a clear, uncluttered hero frame.";
    }

    return "Compose like a premium collectible content cover with a single hero visual and clean edges.";
}

function escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function parseAdminAiDropCoverTitle(
    title: string,
    creatorName?: string | null,
) {
    const trimmedTitle = title.trim();
    const parsed = parseCoverTitle(trimmedTitle);
    const creatorDisplayName = parsed.creatorBrandFromTitle || creatorName?.trim() || null;
    const normalizedFlavorTitle = parsed.flavorTitle || trimmedTitle;

    return {
        requestedTitle: trimmedTitle,
        creatorDisplayName,
        normalizedFlavorTitle,
    };
}

export function normalizeAdminAiDropCoverFlavorTitle(title: string, creatorName?: string | null) {
    const parsed = parseCoverTitle(title);
    if (parsed.flavorTitle.trim().length > 0) {
        return parsed.flavorTitle.trim();
    }
    const legacyParsed = parseAdminAiDropCoverTitle(title, creatorName);
    return legacyParsed.normalizedFlavorTitle;
}

export function getAdminAiDropCoverFocusTerms(title: string, creatorName?: string | null) {
    const parsed = parseCoverTitle(title);
    const terms = parsed.normalizedFlavorTokens
        .map((token) => token.trim().toLowerCase())
        .filter((token) => token.length >= 3 && !TITLE_TOKEN_STOP_WORDS.has(token));

    return Array.from(new Set(terms));
}

function getFlavorFamilyRule(
    family: AdminAiDropCoverFlavorFamily,
) {
    return FLAVOR_FAMILY_RULES.find((rule) => rule.family === family) || null;
}

export function inferAdminAiDropCoverSubjectCategory(input: AdminAiDropCoverPromptInput): AdminAiDropCoverSubjectCategory {
    const focusTerms = getAdminAiDropCoverFocusTerms(input.title, input.creatorName);
    for (const rule of SUBJECT_CATEGORY_RULES) {
        if (rule.keywords.some((keyword) => focusTerms.includes(keyword))) {
            return rule.category;
        }
    }

    return "other";
}

function getColorDirection(focusTerms: string[]) {
    for (const rule of COLOR_DIRECTION_RULES) {
        if (rule.keywords.some((keyword) => focusTerms.includes(keyword))) {
            return rule.direction;
        }
    }

    return "Anchor the palette in the flavor's most legible dominant color with clearly separated accent colors and premium contrast.";
}

export function inferAdminAiDropCoverFlavorFamily(input: AdminAiDropCoverPromptInput): AdminAiDropCoverFlavorFamily {
    const focusTerms = getAdminAiDropCoverFocusTerms(input.title, input.creatorName);
    const normalizedTags = Array.isArray(input.tags) ? input.tags.map(normalizeTag) : [];

    let bestMatch: { family: AdminAiDropCoverFlavorFamily; score: number } = {
        family: "neutral",
        score: 0,
    };

    for (const rule of FLAVOR_FAMILY_RULES) {
        const score = rule.keywords.reduce((total, keyword) => total + (focusTerms.includes(keyword) ? 1 : 0), 0);
        if (score > bestMatch.score) {
            bestMatch = { family: rule.family, score };
        }
    }

    if (bestMatch.score > 0) {
        return bestMatch.family;
    }

    if (normalizedTags.includes("spicy")) {
        return "apple_spice";
    }
    if (normalizedTags.includes("sweet")) {
        return "candy";
    }
    if (normalizedTags.includes("raw")) {
        return "chocolate";
    }

    return "neutral";
}

export function buildAdminAiDropCoverConsistencyRecipe(input: AdminAiDropCoverPromptInput): AdminAiDropCoverConsistencyRecipe {
    const parsedTitle = parseAdminAiDropCoverTitle(input.title, input.creatorName);
    const semanticBrief = buildCoverSemanticBrief({
        title: input.title,
        creatorSelectedName: input.creatorName,
        creatorDisplayName: input.creatorName,
    });
    const normalizedFlavorTitle = semanticBrief.flavorTitle;
    const focusTerms = Array.from(new Set([
        ...semanticBrief.requiredTokens,
        ...semanticBrief.allowedIngredientTokens,
        ...semanticBrief.allowedTextureTokens,
    ].map((term) => term.trim().toLowerCase()))).slice(0, 5);
    const family = inferAdminAiDropCoverFlavorFamily(input);
    const familyRule = getFlavorFamilyRule(family);
    const subjectCategory = inferAdminAiDropCoverSubjectCategory(input);
    const subjectLabel = subjectCategory === "other" ? "flavor-specific hero object" : `${subjectCategory} hero object`;

    return {
        family,
        creatorId: input.creatorId?.trim() || null,
        creatorName: input.creatorName?.trim() || null,
        creatorDisplayName: parsedTitle.creatorDisplayName,
        normalizedFlavorTitle,
        subjectCategory,
        focusTerms,
        heroSubject: `Center one unmistakable ${subjectLabel} inspired only by "${normalizedFlavorTitle}". Choose the object that best expresses this requested flavor, make it large and immediately readable, and only use pie, cake, pastry, candy, chocolate, drink, fruit, marshmallow, cream, muffin, or other ingredient forms when the requested title explicitly names them.`,
        paletteDirection: `${familyRule?.paletteDirection || "Use one dominant flavor palette with premium contrast, glossy highlights, and restrained accent color drift."} ${getColorDirection(focusTerms)}`,
        lightingDirection: familyRule?.lightingDirection || "Use polished product lighting with tactile highlights, depth, and a premium editorial finish.",
        backgroundDirection: familyRule?.backgroundDirection || "Create a soft glowing bokeh background with flavor-led atmosphere, depth, and minimal distracting props.",
        compositionDirection: "Keep a square poster composition with one centered hero, clear upper title space, and a distinct lower ribbon band so the hero, title, and CTA treatment stay easy to distinguish.",
        overlayDirection: "Render the creator name as a smaller top treatment when available, keep the main flavor title prominent and legible, and make the lower ribbon or CTA band visually distinct from the background.",
        antiAnchoringDirection: "Treat all references as layout-only. Do not copy their food form, garnish, candy pieces, flavor cues, color palette, prop arrangement, or background objects unless the current requested title explicitly names the same detail.",
    };
}

export function scoreAdminAiDropCoverReferenceAsset(
    asset: Pick<AdminAiDropCoverReferenceAsset, "id" | "source" | "title" | "creatorId" | "creatorName" | "retentionReason" | "negativeReuseCount">,
    recipe: AdminAiDropCoverConsistencyRecipe,
) {
    let score = 0;
    const reasons: string[] = [];

    if (asset.source === "template") {
        score += 100;
        reasons.push("uploaded house template anchor");
    }

    if (asset.source === "retained_ai_cover") {
        if (asset.retentionReason === "accepted") {
            score += 36;
            reasons.push("accepted layout by operator");
        } else if (asset.retentionReason === "liked") {
            score += 28;
            reasons.push("liked layout by operator");
        }
    } else if (asset.source === "catalog_drop_cover" || asset.source === "recent_drop_cover") {
        score += 3;
        reasons.push("published layout fallback");
    }

    if (
        asset.creatorId
        && recipe.creatorId
        && asset.creatorId.trim().toLowerCase() === recipe.creatorId.trim().toLowerCase()
    ) {
        score += 4;
        reasons.push("same creator layout context");
    } else if (
        asset.creatorName
        && recipe.creatorName
        && asset.creatorName.trim().toLowerCase() === recipe.creatorName.trim().toLowerCase()
    ) {
        score += 3;
        reasons.push("same creator layout context");
    }

    const negativeReuseCount = typeof asset.negativeReuseCount === "number" ? asset.negativeReuseCount : 0;
    if (negativeReuseCount > 0) {
        score -= negativeReuseCount * 40;
        reasons.push(`${negativeReuseCount} disliked reuse${negativeReuseCount === 1 ? "" : "s"}`);
    }

    if (reasons.length === 0) {
        reasons.push("fallback visual variety candidate");
    }

    return {
        score,
        reasons,
    };
}

export function selectAdminAiDropCoverReferenceAssets(
    assets: AdminAiDropCoverReferenceAsset[],
    recipe: AdminAiDropCoverConsistencyRecipe,
    limit: number,
) {
    const semanticBrief = buildCoverSemanticBrief({
        title: recipe.normalizedFlavorTitle,
        creatorSelectedName: recipe.creatorName,
        creatorBrandName: recipe.creatorName,
        creatorPublicName: recipe.creatorName,
        creatorDisplayName: recipe.creatorDisplayName || recipe.creatorName,
    });
    const candidates = assets.map((asset) => {
        const primaryLayout = asset.primary === true || asset.pinned === true || asset.source === "template";
        const negativeReuseDominates = (asset.negativeReuseCount || 0) > 0
            && (asset.positiveReuseCount || 0) <= (asset.negativeReuseCount || 0);
        const feedbackKind: CoverFeedbackKind = negativeReuseDominates || asset.feedback === "disliked"
            ? "disliked"
            : asset.feedback === "liked" || asset.retentionReason === "liked"
                ? "liked"
            : asset.accepted === true || asset.retentionReason === "accepted"
                ? "accepted_as_cover"
                : primaryLayout
                    ? "ignored"
                    : "generated";
        return {
            id: asset.id,
            title: asset.title || null,
            creatorId: asset.creatorId || null,
            creatorName: asset.creatorName || null,
            semanticCategory: recipe.subjectCategory,
            semanticFamily: recipe.family,
            feedbackKind,
            referenceEligibility: primaryLayout ? "debug_only" : resolveCoverReferenceEligibility(feedbackKind, {
                accepted: asset.accepted,
                liked: asset.feedback === "liked",
            }),
            retentionReason: asset.retentionReason || null,
            accepted: asset.accepted === true,
            liked: asset.feedback === "liked",
            selectedAsPrimaryLayout: primaryLayout,
            selectionOrder: primaryLayout ? 0 : null,
            selectionScore: asset.selectionScore || null,
        };
    });
    const selection = selectDeterministicCoverReferences({
        brief: semanticBrief,
        modelId: ADMIN_AI_DROP_COVER_MODEL,
        maxReferenceCount: limit,
        requestedReferenceCount: candidates.length,
        candidates,
        explicitPrimaryLayoutReferenceId: candidates.find((candidate) => candidate.selectedAsPrimaryLayout)?.id || null,
    });

    return selection.selectedReferences.map((entry) => {
        const asset = assets.find((candidate) => candidate.id === entry.candidate.id);
        if (!asset) {
            return null;
        }
        return adminAiDropCoverReferenceAssetSchema.parse({
            ...asset,
            selectionScore: Math.max(0, 100 - Math.round(entry.semanticConflictScore * 100)),
            selectionReasons: entry.reasons,
        });
    }).filter((asset): asset is AdminAiDropCoverReferenceAsset => Boolean(asset));
}

export function buildAdminAiDropCoverPrompt(
    input: AdminAiDropCoverPromptInput,
    options?: {
        referenceGuided?: boolean;
        recipe?: AdminAiDropCoverConsistencyRecipe;
        promptPolicy?: AdminAiDropCoverPromptPolicy | null;
        manualPromptOverride?: string | null;
    },
) {
    const compiled = compileCoverPrompt({
        title: input.title,
        creatorSelectedName: input.creatorName,
        creatorDisplayName: input.creatorName,
        imageModel: ADMIN_AI_DROP_COVER_MODEL,
        referenceCoverStyleId: options?.referenceGuided ? "reference_guided" : "standard",
        optimizerPrompt: options?.promptPolicy?.currentMutablePrompt || null,
    });
    return compiled.prompt;
}

export function getAdminAiDropCoverPricePerGenerationUsd(model = ADMIN_AI_DROP_COVER_MODEL) {
    return getAdminAiDropCoverModelOption(model)?.pricePerGenerationUsd
        ?? getAdminAiDropCoverModelOption(ADMIN_AI_DROP_COVER_MODEL)?.pricePerGenerationUsd
        ?? 0.0387;
}

export function getAdminAiDropCoverPriceBasis(model = ADMIN_AI_DROP_COVER_MODEL) {
    return getAdminAiDropCoverModelOption(model)?.priceBasis
        ?? ADMIN_AI_DROP_COVER_PRICE_BASIS;
}

export function estimateAdminAiDropCoverCostUsd(model = ADMIN_AI_DROP_COVER_MODEL, imageCount = 1) {
    const normalizedCount = Math.max(1, Math.floor(imageCount || 1));
    return Number((getAdminAiDropCoverPricePerGenerationUsd(model) * normalizedCount).toFixed(4));
}

export function normalizeAdminAiDropCoverModel(
    model?: string | null,
    _generationMode: AdminAiDropCoverGenerationMode = "standard",
) {
    const normalizedModel = model?.trim() || "";

    if (!normalizedModel || LEGACY_ADMIN_AI_DROP_COVER_MODEL_ALIASES.has(normalizedModel)) {
        return ADMIN_AI_DROP_COVER_MODEL;
    }

    const migratedModel = normalizeAdminAiModelAlias(normalizedModel, "drop_cover_standard");
    return isAdminAiDropCoverSelectableModel(migratedModel)
        ? migratedModel
        : ADMIN_AI_DROP_COVER_MODEL;
}

export function normalizeAdminAiDropCoverLocation(
    location?: string | null,
    model?: string | null,
    _generationMode: AdminAiDropCoverGenerationMode = "standard",
) {
    const normalizedLocation = location?.trim() || "";
    const rawModel = model?.trim() || "";
    const normalizedModel = normalizeAdminAiDropCoverModel(rawModel);

    if (!normalizedLocation) {
        return getAdminAiDropCoverModelOption(normalizedModel)?.location || ADMIN_AI_DROP_COVER_DEFAULT_LOCATION;
    }

    if (LEGACY_ADMIN_AI_DROP_COVER_LOCATION_ALIASES.has(normalizedLocation) && LEGACY_ADMIN_AI_DROP_COVER_GLOBAL_LOCATION_ALIASES.has(rawModel)) {
        return getAdminAiDropCoverModelOption(normalizedModel)?.location || ADMIN_AI_DROP_COVER_DEFAULT_LOCATION;
    }

    return normalizedLocation;
}

export function getAdminAiDropCoverSelectableModelOptions(): AdminAiDropCoverModelOption[] {
    return ADMIN_AI_DROP_COVER_MODEL_OPTIONS.map((option) => ({ ...option }));
}

export function isAdminAiDropCoverSelectableModel(model?: string | null): model is AdminAiDropCoverSelectableModel {
    return ADMIN_AI_DROP_COVER_MODEL_OPTIONS.some((option) => option.id === model);
}

export function getAdminAiDropCoverModelOption(model?: string | null) {
    return ADMIN_AI_DROP_COVER_MODEL_OPTIONS.find((option) => option.id === model) || null;
}

export function getAdminAiDropCoverGenerationMode(input: Pick<AdminAiDropCoverSettings, "useTemplateReference" | "useRecentDropCoverReferences">) {
    return input.useTemplateReference || input.useRecentDropCoverReferences
        ? "reference_guided"
        : "standard";
}

export function getAdminAiDropCoverMaxReferenceInputs(model = ADMIN_AI_DROP_COVER_MODEL) {
    return getAiModelReferenceLimit(model, "cover_image_generation")
        || getAdminAiDropCoverModelOption(model)?.maxReferenceInputs
        || getAdminAiDropCoverModelOption(ADMIN_AI_DROP_COVER_MODEL)?.maxReferenceInputs
        || ADMIN_AI_DROP_COVER_LAYOUT_REFERENCE_LIMIT;
}

export function getDefaultAdminAiDropCoverSettings(): AdminAiDropCoverSettings {
    const generationMode: AdminAiDropCoverGenerationMode = "standard";
    return {
        enabled: false,
        model: ADMIN_AI_DROP_COVER_MODEL,
        location: ADMIN_AI_DROP_COVER_DEFAULT_LOCATION,
        optimizerModel: ADMIN_AI_DROP_COVER_OPTIMIZER_MODEL,
        optimizerEnabled: true,
        aspectRatio: "1:1",
        outputMimeType: ADMIN_AI_DROP_COVER_OUTPUT_MIME_TYPE,
        pricePerGenerationUsd: getAdminAiDropCoverPricePerGenerationUsd(),
        priceBasis: getAdminAiDropCoverPriceBasis(ADMIN_AI_DROP_COVER_MODEL),
        priceSourceUrl: ADMIN_AI_DROP_COVER_PRICE_SOURCE_URL,
        generationMode,
        useTemplateReference: false,
        useRecentDropCoverReferences: false,
        templateReferenceUrl: null,
        templateReferenceStoragePath: null,
        templateReferenceFileName: null,
        primaryStyleReferenceId: null,
    };
}

export function getDefaultAdminAiDropCoverPromptPolicy(): AdminAiDropCoverPromptPolicy {
    return {
        version: 1,
        optimizerModel: ADMIN_AI_DROP_COVER_OPTIMIZER_MODEL,
        autoOptimize: true,
        optimizerStatus: "idle",
        optimizerNote: "Prompt optimizer ready.",
        optimizerProposal: null,
        baseStylePrompt: DEFAULT_BASE_STYLE_PROMPT,
        lockedClauses: [...DEFAULT_STYLE_LOCKED_CLAUSES],
        mutableClauses: [...DEFAULT_MUTABLE_CLAUSES],
        currentMutablePrompt: DEFAULT_MUTABLE_CLAUSES.join(" "),
        lastAcceptedPrompt: null,
        lastOptimizerRunAtMs: null,
        lastAcceptedAtMs: null,
        lastAutoRefinementDiff: [],
        lastEditedAtMs: null,
        lastEditedByUid: undefined,
        lastEditedByEmail: undefined,
        categoryPerformance: {},
    };
}

export function getAdminAiDropCoverRecipeLabel(recipe?: AdminAiDropCoverConsistencyRecipe | null) {
    if (!recipe || recipe.family === "neutral") {
        return DEFAULT_RECIPE_LABEL;
    }

    return `KandyDrops ${recipe.family.replace(/_/g, " ")} title-safe cover art`;
}

export function formatAdminAiUsd(value: number) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: value >= 1 ? 2 : 4,
        maximumFractionDigits: value >= 1 ? 2 : 4,
    }).format(value);
}
