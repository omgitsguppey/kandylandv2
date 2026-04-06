import { z } from "zod";

export const ADMIN_AI_DROP_COVER_SETTINGS_DOC = "aiDropCovers";
export const ADMIN_AI_DROP_COVER_JOBS_COLLECTION = "admin_ai_drop_cover_jobs";
export const ADMIN_AI_DROP_COVER_SUMMARY_COLLECTION = "admin_ai_drop_cover_summary";
export const ADMIN_AI_DROP_COVER_SUMMARY_DOC = "overview";

export const ADMIN_AI_DROP_COVER_MODEL = "imagen-3.0-fast-generate-001";
export const ADMIN_AI_DROP_COVER_PROMPT_VERSION = "drop-cover-v1";
export const ADMIN_AI_DROP_COVER_PRICE_BASIS = "vertex-ai-pricing-imagen-fast-2026-04-05";
export const ADMIN_AI_DROP_COVER_PRICE_SOURCE_URL = "https://cloud.google.com/vertex-ai/generative-ai/pricing";
export const ADMIN_AI_DROP_COVER_OUTPUT_MIME_TYPE = "image/png";

export type AdminAiDropCoverRuntimeStatus =
    | "disabled"
    | "ready"
    | "missing_project"
    | "auth_missing"
    | "error";

export type AdminAiDropCoverJobStatus = "running" | "succeeded" | "failed";

export type AdminAiDropCoverFeedback = "neutral" | "liked" | "disliked";

export type AdminAiDropCoverFeedbackAction = "like" | "dislike" | "accept" | "link_drop";

export interface AdminAiDropCoverPromptInput {
    title: string;
    creatorName?: string | null;
    dropType?: "content" | "promo" | "external" | string | null;
    tags?: string[] | null;
}

export interface AdminAiDropCoverSettings {
    enabled: boolean;
    model: string;
    location: string;
    aspectRatio: "1:1";
    outputMimeType: string;
    pricePerGenerationUsd: number;
    priceBasis: string;
    priceSourceUrl: string;
    updatedAtMs?: number;
    updatedByUid?: string;
    updatedByEmail?: string | null;
}

export interface AdminAiDropCoverJobRecord {
    id: string;
    title: string;
    creatorName?: string | null;
    dropId?: string | null;
    model: string;
    location: string;
    promptVersion: string;
    recipeLabel: string;
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
    acceptedAtMs?: number | null;
    acceptedForDropId?: string | null;
    errorMessage?: string | null;
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

export const adminAiDropCoverJobSchema = z.object({
    id: z.string(),
    title: z.string(),
    creatorName: z.string().nullable().optional(),
    dropId: z.string().nullable().optional(),
    model: z.string(),
    location: z.string(),
    promptVersion: z.string(),
    recipeLabel: z.string(),
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
    acceptedAtMs: z.number().nullable().optional(),
    acceptedForDropId: z.string().nullable().optional(),
    errorMessage: z.string().nullable().optional(),
});

export const adminAiDropCoverSettingsSchema = z.object({
    enabled: z.boolean(),
    model: z.string(),
    location: z.string(),
    aspectRatio: z.literal("1:1"),
    outputMimeType: z.string(),
    pricePerGenerationUsd: z.number(),
    priceBasis: z.string(),
    priceSourceUrl: z.string().url(),
    updatedAtMs: z.number().optional(),
    updatedByUid: z.string().optional(),
    updatedByEmail: z.string().nullable().optional(),
});

export const adminAiDropCoverRuntimeSchema = z.object({
    enabled: z.boolean(),
    status: z.enum(["disabled", "ready", "missing_project", "auth_missing", "error"]),
    note: z.string(),
    project: z.string(),
    location: z.string(),
    model: z.string(),
    pricePerGenerationUsd: z.number(),
    priceBasis: z.string(),
    priceSourceUrl: z.string().url(),
});

export const adminAiDropCoverSummarySchema = z.object({
    settings: adminAiDropCoverSettingsSchema,
    runtime: adminAiDropCoverRuntimeSchema,
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
    }),
    recentJobs: z.array(adminAiDropCoverJobSchema),
});

const AI_DROP_COVER_MODEL_PRICING_USD = {
    "imagen-3.0-fast-generate-001": 0.02,
    "imagen-3.0-generate-001": 0.04,
    "imagen-3.0-generate-002": 0.04,
    "imagen-4.0-fast-generate-001": 0.02,
    "imagen-4.0-generate-001": 0.04,
    "imagen-4.0-ultra-generate-001": 0.06,
} as const;

const DEFAULT_RECIPE_LABEL = "KandyDrops title-safe cover art";

function normalizeTag(label: string) {
    return label.trim().toLowerCase();
}

function buildTagStyleNote(tags?: string[] | null) {
    const normalizedTags = Array.isArray(tags) ? tags.map(normalizeTag) : [];

    if (normalizedTags.includes("spicy")) {
        return "Use a bold high-contrast palette with glossy reds, ember tones, and cinematic heat.";
    }

    if (normalizedTags.includes("raw")) {
        return "Use a darker monochrome-forward palette with dramatic contrast, metallic highlights, and premium editorial tension.";
    }

    if (normalizedTags.includes("sweet")) {
        return "Use a candy-premium palette with luminous pinks, creams, berry tones, and glossy confection energy.";
    }

    return "Use a premium candy-poster palette with one dominant flavor color and controlled contrast.";
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

export function buildAdminAiDropCoverPrompt(input: AdminAiDropCoverPromptInput) {
    const title = input.title.trim();
    const creatorName = input.creatorName?.trim();

    return [
        "Create premium square cover art for a KandyDrops drop.",
        `Drop title concept: ${title}.`,
        creatorName ? `Creator context: ${creatorName}. Use this only as mood context, never as rendered text.` : "",
        buildDropTypeNote(input.dropType),
        buildTagStyleNote(input.tags),
        "The image must feel like luxury candy packaging meets a premium poster.",
        "Keep one centered hero composition with enough clean space for the product UI to display deterministic title text outside the image.",
        "Use depth, gloss, tactile lighting, and a flavor-led visual identity.",
        "Do not render any readable text, letters, typography, logos, watermarks, UI, split panels, collage grids, or captions.",
        "Do not crop the hero subject awkwardly. Avoid busy backgrounds, extra props, or generic stock-photo composition.",
        "Return a clean 1:1 square image background/art treatment only.",
    ].filter((line) => line.length > 0).join(" ");
}

export function getAdminAiDropCoverPricePerGenerationUsd(model = ADMIN_AI_DROP_COVER_MODEL) {
    return AI_DROP_COVER_MODEL_PRICING_USD[model as keyof typeof AI_DROP_COVER_MODEL_PRICING_USD] ?? 0.02;
}

export function estimateAdminAiDropCoverCostUsd(model = ADMIN_AI_DROP_COVER_MODEL, imageCount = 1) {
    const normalizedCount = Math.max(1, Math.floor(imageCount || 1));
    return Number((getAdminAiDropCoverPricePerGenerationUsd(model) * normalizedCount).toFixed(4));
}

export function getDefaultAdminAiDropCoverSettings(): AdminAiDropCoverSettings {
    return {
        enabled: false,
        model: ADMIN_AI_DROP_COVER_MODEL,
        location: "us-central1",
        aspectRatio: "1:1",
        outputMimeType: ADMIN_AI_DROP_COVER_OUTPUT_MIME_TYPE,
        pricePerGenerationUsd: getAdminAiDropCoverPricePerGenerationUsd(),
        priceBasis: ADMIN_AI_DROP_COVER_PRICE_BASIS,
        priceSourceUrl: ADMIN_AI_DROP_COVER_PRICE_SOURCE_URL,
    };
}

export function getAdminAiDropCoverRecipeLabel() {
    return DEFAULT_RECIPE_LABEL;
}

export function formatAdminAiUsd(value: number) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: value >= 1 ? 2 : 4,
        maximumFractionDigits: value >= 1 ? 2 : 4,
    }).format(value);
}
