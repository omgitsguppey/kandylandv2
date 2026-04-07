import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { GoogleAuth } from "google-auth-library";

import {
    type AdminAiDropCoverErrorCode,
    ADMIN_AI_DROP_COVER_DEFAULT_LOCATION,
    ADMIN_AI_DROP_COVER_JOBS_COLLECTION,
    ADMIN_AI_DROP_COVER_MODEL,
    ADMIN_AI_DROP_COVER_OUTPUT_MIME_TYPE,
    ADMIN_AI_DROP_COVER_PROMPT_VERSION,
    ADMIN_AI_DROP_COVER_SETTINGS_DOC,
    ADMIN_AI_DROP_COVER_SUMMARY_COLLECTION,
    ADMIN_AI_DROP_COVER_SUMMARY_DOC,
    adminAiDropCoverReferenceAssetSchema,
    adminAiDropCoverJobSchema,
    adminAiDropCoverConsistencyRecipeSchema,
    adminAiDropCoverRuntimeSchema,
    adminAiDropCoverSettingsSchema,
    adminAiDropCoverSummarySchema,
    buildAdminAiDropCoverConsistencyRecipe,
    buildAdminAiDropCoverPrompt,
    estimateAdminAiDropCoverCostUsd,
    getAdminAiDropCoverGenerationMode,
    getAdminAiDropCoverModelOption,
    getAdminAiDropCoverPriceBasis,
    getAdminAiDropCoverPricePerGenerationUsd,
    getAdminAiDropCoverRecipeLabel,
    getAdminAiDropCoverSelectableModelOptions,
    isAdminAiDropCoverSelectableModel,
    getDefaultAdminAiDropCoverSettings,
    normalizeAdminAiDropCoverLocation,
    normalizeAdminAiDropCoverModel,
    selectAdminAiDropCoverReferenceAssets,
    type AdminAiDropCoverModelHealth,
    type AdminAiDropCoverPreflightCheck,
    type AdminAiDropCoverFeedbackAction,
    type AdminAiDropCoverGenerationMode,
    type AdminAiDropCoverJobRecord,
    type AdminAiDropCoverJobStatus,
    type AdminAiDropCoverRuntimeDiagnostic,
    type AdminAiDropCoverSelectableModel,
    type AdminAiDropCoverConsistencyRecipe,
    type AdminAiDropCoverPromptInput,
    type AdminAiDropCoverReferenceAsset,
    type AdminAiDropCoverSettings,
    type AdminAiDropCoverSummaryRecord,
    type AdminAiDropCoverVisualSignalSummary,
} from "@/lib/ai-drop-covers";
import { getFiniteDropTimestamp } from "@/lib/drop-status";
import { FIREBASE_PROJECT_ID, FIREBASE_STORAGE_BUCKET } from "@/lib/firebase-runtime";
import { trackServerEvent } from "@/lib/server/analytics";
import { adminDb, adminStorage } from "@/lib/server/firebase-admin";
import { recordRouteWarning } from "@/lib/server/route-diagnostics";
import { recordServerDiagnostic } from "@/lib/server/server-diagnostics";
import {
    ensureFirebaseDownloadUrl,
    sanitizeStorageFileName,
    type StorageObjectMetadata,
} from "@/lib/server/storage-assets";

const DEFAULT_VERTEX_LOCATION = ADMIN_AI_DROP_COVER_DEFAULT_LOCATION;
const VERTEX_SCOPE = "https://www.googleapis.com/auth/cloud-platform";
const DEFAULT_TIMEOUT_MS = 20_000;
const RECENT_JOB_LIMIT = 18;
const DROP_COVER_CATALOG_PREVIEW_LIMIT = 4;
const RETAINED_AI_REFERENCE_LIMIT = 4;
const DROP_COVER_CATALOG_CANDIDATE_LIMIT = 12;
const RETAINED_AI_REFERENCE_CANDIDATE_LIMIT = 12;
const MAX_REFERENCE_INPUTS = 6;
const TEMPLATE_REFERENCE_STYLE_DESCRIPTION = "KandyDrops premium candy-poster cover art with centered hero framing, strong flavor palette, and title-safe negative space.";

type AdminAiDropCoverRuntime = {
    project: string;
    location: string;
    model: string;
    provider: "gemini_generate_content";
};

type AdminAiDropCoverRuntimeSnapshot = {
    settings: AdminAiDropCoverSettings;
    runtime: AdminAiDropCoverRuntime;
    configuredStorageBucket: string;
    authReady: boolean;
    authError: unknown;
};

type SummaryDelta = Partial<{
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
    lastSuccessAtMs: number;
    lastFailureAtMs: number;
}>;

type GeminiInlineData = {
    mimeType?: string;
    data?: string;
};

type GeminiImagePart = {
    text?: string;
    inlineData?: GeminiInlineData;
};

type GeminiGenerateContentResponse = {
    candidates?: Array<{
        content?: {
            parts?: GeminiImagePart[];
        };
    }>;
    error?: {
        message?: string;
    };
};

type GenerateImageInput = {
    accessToken: string;
    prompt: string;
    runtime: AdminAiDropCoverRuntime;
    aspectRatio: string;
    outputMimeType: string;
    referenceImages?: LoadedReferenceImage[];
    timeoutMs?: number;
};

type GenerateVertexImageResult = {
    bytes: Buffer;
    mimeType: string;
    enhancedPrompt?: string;
};

type AdminAiDropCoverGenerationInput = {
    title: string;
    creatorName?: string | null;
    creatorId?: string | null;
    dropId?: string | null;
    draftSessionId?: string | null;
    dropType?: "content" | "promo" | "external" | string | null;
    tags?: string[] | null;
    previousJobId?: string | null;
    requestedModel?: AdminAiDropCoverSelectableModel | null;
    requestedByUid: string;
    requestedByEmail?: string | undefined;
};

type AdminAiDropCoverFeedbackInput = {
    jobId: string;
    action: AdminAiDropCoverFeedbackAction;
    dropId?: string | null;
    actorUid: string;
    actorEmail?: string | undefined;
};

type LoadedReferenceImage = {
    bytesBase64Encoded: string;
    mimeType: string;
    styleDescription?: string;
};

type DropReferenceCandidateDoc = {
    id: string;
    data: () => Record<string, unknown>;
};

type AdminAiDropCoverReferenceContext = {
    generationMode: AdminAiDropCoverGenerationMode;
    recipe: AdminAiDropCoverConsistencyRecipe;
    referenceImages: LoadedReferenceImage[];
    referenceAssets: AdminAiDropCoverReferenceAsset[];
    templateReferenceUsed: boolean;
    catalogDropReferenceCount: number;
    recentDropReferenceCount: number;
    retainedAiReferenceCount: number;
    retainedAcceptedAiReferenceCount: number;
    retainedLikedAiReferenceCount: number;
};

export class AdminAiDropCoverError extends Error {
    code: AdminAiDropCoverErrorCode;
    status: number;
    clientMessage: string;

    constructor(
        code: AdminAiDropCoverErrorCode,
        status: number,
        message: string,
        clientMessage = message,
    ) {
        super(message);
        this.name = "AdminAiDropCoverError";
        this.code = code;
        this.status = status;
        this.clientMessage = clientMessage;
    }
}

export function toAdminAiDropCoverClientError(error: unknown) {
    if (!(error instanceof AdminAiDropCoverError)) {
        return null;
    }

    return {
        status: error.status,
        body: {
            error: error.clientMessage,
            errorCode: error.code,
        },
    };
}

function summarizeAiAvailabilityIssue(
    error: unknown,
    runtime?: Pick<AdminAiDropCoverRuntime, "model" | "location">,
    stage: "auth" | "predict" = "predict",
) {
    const message = error instanceof Error ? error.message : String(error);
    const normalized = message.toLowerCase();

    const likelyModelLocationIssue = (
        (
            normalized.includes("permission denied")
            || normalized.includes("permission_denied")
            || normalized.includes("does not have permission")
            || normalized.includes("doesn't have permission")
            || normalized.includes("does not have access")
        )
        && (
            normalized.includes("model")
            || normalized.includes("publisher")
            || normalized.includes("location")
            || normalized.includes("resource locations")
        )
    ) || (
        (normalized.includes("not found") || normalized.includes("unsupported") || normalized.includes("not available"))
        && (normalized.includes("model") || normalized.includes("location") || normalized.includes("publisher"))
    );

    if (stage === "predict" && likelyModelLocationIssue) {
        return `The configured Vertex image model (${runtime?.model || "current model"}) is not available to this project in ${runtime?.location || "the configured location"}. Check Google Cloud model access, preview-model availability, and org location policy.`;
    }

    if (
        normalized.includes("application default credentials")
        || normalized.includes("could not load the default credentials")
        || normalized.includes("default credentials")
        || normalized.includes("login required")
        || normalized.includes("unauthenticated")
        || (stage === "auth" && normalized.includes("permission_denied"))
    ) {
        return "Vertex image generation credentials are unavailable. Run `gcloud auth application-default login` locally or use a Google-managed runtime identity.";
    }

    if (normalized.includes("timed out")) {
        return "Vertex image generation timed out before the cover finished rendering.";
    }

    return "Vertex image generation is unavailable right now.";
}

function toNumber(value: unknown, fallback = 0) {
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function createAdminAiDropCoverError(
    code: AdminAiDropCoverErrorCode,
    status: number,
    message: string,
    clientMessage = message,
) {
    return new AdminAiDropCoverError(code, status, message, clientMessage);
}

function classifyProviderError(
    error: unknown,
    runtime?: Pick<AdminAiDropCoverRuntime, "model" | "location">,
    stage: "auth" | "predict" = "predict",
) {
    const message = error instanceof Error ? error.message : String(error);
    const normalized = message.toLowerCase();

    if (normalized.includes("timed out")) {
        return createAdminAiDropCoverError(
            "provider_timeout",
            504,
            message,
            "AI cover generation timed out before the image finished rendering. Try again in a moment.",
        );
    }

    if (summarizeAiAvailabilityIssue(error, runtime, stage).includes("not available to this project")) {
        return createAdminAiDropCoverError(
            "model_location_unavailable",
            503,
            message,
            summarizeAiAvailabilityIssue(error, runtime, stage),
        );
    }

    return createAdminAiDropCoverError(
        "provider_unavailable",
        503,
        message,
        summarizeAiAvailabilityIssue(error, runtime, stage),
    );
}

function classifyDatabaseError(error: unknown, message: string, clientMessage: string) {
    return createAdminAiDropCoverError("database_failed", 503, message, clientMessage);
}

function classifyStorageError(error: unknown, message: string, clientMessage: string) {
    return createAdminAiDropCoverError("storage_failed", 503, message, clientMessage);
}

function getString(value: unknown) {
    return typeof value === "string" ? value : "";
}

function formatIsoTimestamp(timestamp?: number | null) {
    return typeof timestamp === "number" && Number.isFinite(timestamp) && timestamp > 0
        ? new Date(timestamp).toISOString()
        : "not recorded";
}

function buildAiDiagnosticSummary(detail: Record<string, unknown>) {
    const parts: string[] = [];
    const model = getString(detail.model);
    const failureCode = getString(detail.failureCode);
    const generationMode = getString(detail.generationMode);
    const jobId = getString(detail.jobId);
    const referenceImageCount = toNumber(detail.referenceImageCount, NaN);

    if (failureCode) {
        parts.push(`code ${failureCode}`);
    }
    if (model) {
        parts.push(model);
    }
    if (generationMode) {
        parts.push(generationMode.replace(/_/g, " "));
    }
    if (jobId) {
        parts.push(`job ${jobId}`);
    }
    if (Number.isFinite(referenceImageCount)) {
        parts.push(`${referenceImageCount} refs`);
    }

    return parts.length > 0 ? parts.join(" | ") : null;
}

function getGenerationModeDefaults(_generationMode: AdminAiDropCoverGenerationMode) {
    return {
        model: ADMIN_AI_DROP_COVER_MODEL,
        location: ADMIN_AI_DROP_COVER_DEFAULT_LOCATION,
        pricePerGenerationUsd: getAdminAiDropCoverPricePerGenerationUsd(ADMIN_AI_DROP_COVER_MODEL),
        priceBasis: getAdminAiDropCoverPriceBasis(ADMIN_AI_DROP_COVER_MODEL),
    };
}

function normalizeSettings(raw: unknown): AdminAiDropCoverSettings {
    const defaults = getDefaultAdminAiDropCoverSettings();
    if (!raw || typeof raw !== "object") {
        return defaults;
    }

    const data = raw as Record<string, unknown>;
    const useTemplateReference = data.useTemplateReference === true;
    const useRecentDropCoverReferences = data.useRecentDropCoverReferences === true;
    const generationMode = getAdminAiDropCoverGenerationMode({
        useTemplateReference,
        useRecentDropCoverReferences,
    });
    const modeDefaults = getGenerationModeDefaults(generationMode);
    const rawModel = getString(data.model);
    const rawLocation = getString(data.location);
    const normalizedModel = normalizeAdminAiDropCoverModel(rawModel || modeDefaults.model, generationMode);
    const normalizedLocation = normalizeAdminAiDropCoverLocation(rawLocation || modeDefaults.location, rawModel || normalizedModel, generationMode);
    const migratedLegacyDefault = (
        (!!rawModel && rawModel !== normalizedModel)
        || (!!rawLocation && rawLocation !== normalizedLocation)
    );
    return adminAiDropCoverSettingsSchema.parse({
        ...defaults,
        enabled: typeof data.enabled === "boolean" ? data.enabled : defaults.enabled,
        generationMode,
        model: normalizedModel,
        location: normalizedLocation,
        aspectRatio: "1:1",
        outputMimeType: getString(data.outputMimeType) || defaults.outputMimeType,
        useTemplateReference,
        useRecentDropCoverReferences,
        templateReferenceUrl: getString(data.templateReferenceUrl) || null,
        templateReferenceStoragePath: getString(data.templateReferenceStoragePath) || null,
        templateReferenceFileName: getString(data.templateReferenceFileName) || null,
        pricePerGenerationUsd: !migratedLegacyDefault && typeof data.pricePerGenerationUsd === "number"
            ? data.pricePerGenerationUsd
            : modeDefaults.pricePerGenerationUsd,
        priceBasis: !migratedLegacyDefault && getString(data.priceBasis)
            ? getString(data.priceBasis)
            : modeDefaults.priceBasis,
        priceSourceUrl: !migratedLegacyDefault && getString(data.priceSourceUrl)
            ? getString(data.priceSourceUrl)
            : defaults.priceSourceUrl,
        updatedAtMs: typeof data.updatedAtMs === "number" ? data.updatedAtMs : undefined,
        updatedByUid: getString(data.updatedByUid) || undefined,
        updatedByEmail: typeof data.updatedByEmail === "string" ? data.updatedByEmail : undefined,
    });
}

function settingsRequireCanonicalMigration(raw: unknown, normalized: AdminAiDropCoverSettings) {
    if (!raw || typeof raw !== "object") {
        return false;
    }

    const data = raw as Record<string, unknown>;
    return (
        (data.useTemplateReference === true) !== normalized.useTemplateReference
        || (data.useRecentDropCoverReferences === true) !== normalized.useRecentDropCoverReferences
        || getString(data.templateReferenceUrl) !== (normalized.templateReferenceUrl || "")
        || getString(data.templateReferenceStoragePath) !== (normalized.templateReferenceStoragePath || "")
        || getString(data.templateReferenceFileName) !== (normalized.templateReferenceFileName || "")
        || getString(data.generationMode) !== normalized.generationMode
        || getString(data.model) !== normalized.model
        || getString(data.location) !== normalized.location
        || getString(data.priceBasis) !== normalized.priceBasis
        || getString(data.priceSourceUrl) !== normalized.priceSourceUrl
        || toNumber(data.pricePerGenerationUsd, NaN) !== normalized.pricePerGenerationUsd
    );
}

function normalizeSummary(raw: unknown): AdminAiDropCoverSummaryRecord {
    if (!raw || typeof raw !== "object") {
        return {
            generationCount: 0,
            successfulGenerationCount: 0,
            failedGenerationCount: 0,
            acceptedCount: 0,
            likedCount: 0,
            dislikedCount: 0,
            regeneratedCount: 0,
            totalEstimatedCostUsd: 0,
            totalLatencyMs: 0,
            latencySampleCount: 0,
        };
    }

    const data = raw as Record<string, unknown>;
    return {
        generationCount: toNumber(data.generationCount),
        successfulGenerationCount: toNumber(data.successfulGenerationCount),
        failedGenerationCount: toNumber(data.failedGenerationCount),
        acceptedCount: toNumber(data.acceptedCount),
        likedCount: toNumber(data.likedCount),
        dislikedCount: toNumber(data.dislikedCount),
        regeneratedCount: toNumber(data.regeneratedCount),
        totalEstimatedCostUsd: toNumber(data.totalEstimatedCostUsd),
        totalLatencyMs: toNumber(data.totalLatencyMs),
        latencySampleCount: toNumber(data.latencySampleCount),
        lastSuccessAtMs: typeof data.lastSuccessAtMs === "number" ? data.lastSuccessAtMs : null,
        lastFailureAtMs: typeof data.lastFailureAtMs === "number" ? data.lastFailureAtMs : null,
        updatedAtMs: typeof data.updatedAtMs === "number" ? data.updatedAtMs : undefined,
    };
}

function normalizeJobRecord(id: string, raw: unknown): AdminAiDropCoverJobRecord {
    const data = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {};
    const consistencyRecipeResult = adminAiDropCoverConsistencyRecipeSchema.safeParse(data.consistencyRecipe);
    const consistencyRecipe = consistencyRecipeResult.success
        ? consistencyRecipeResult.data
        : undefined;
    return adminAiDropCoverJobSchema.parse({
        id,
        title: getString(data.title) || "Untitled Drop",
        creatorId: typeof data.creatorId === "string" ? data.creatorId : null,
        creatorName: typeof data.creatorName === "string" ? data.creatorName : null,
        dropId: typeof data.dropId === "string" ? data.dropId : null,
        draftSessionId: typeof data.draftSessionId === "string" ? data.draftSessionId : null,
        model: getString(data.model) || ADMIN_AI_DROP_COVER_MODEL,
        location: getString(data.location) || DEFAULT_VERTEX_LOCATION,
        generationMode: data.generationMode === "reference_guided" ? "reference_guided" : "standard",
        promptVersion: getString(data.promptVersion) || ADMIN_AI_DROP_COVER_PROMPT_VERSION,
        recipeLabel: getString(data.recipeLabel) || getAdminAiDropCoverRecipeLabel(consistencyRecipe),
        consistencyRecipe,
        status: (["running", "succeeded", "failed"] as const).includes(data.status as AdminAiDropCoverJobStatus)
            ? data.status as AdminAiDropCoverJobStatus
            : "failed",
        feedback: data.feedback === "liked" || data.feedback === "disliked" ? data.feedback : "neutral",
        accepted: data.accepted === true,
        requestedAtMs: toNumber(data.requestedAtMs),
        completedAtMs: typeof data.completedAtMs === "number" ? data.completedAtMs : null,
        latencyMs: typeof data.latencyMs === "number" ? data.latencyMs : null,
        estimatedCostUsd: toNumber(data.estimatedCostUsd),
        billed: data.billed === true,
        imageUrl: typeof data.imageUrl === "string" ? data.imageUrl : null,
        storagePath: typeof data.storagePath === "string" ? data.storagePath : null,
        mimeType: typeof data.mimeType === "string" ? data.mimeType : null,
        fileName: typeof data.fileName === "string" ? data.fileName : null,
        previousJobId: typeof data.previousJobId === "string" ? data.previousJobId : null,
        chainId: typeof data.chainId === "string" ? data.chainId : null,
        chainDepth: toNumber(data.chainDepth),
        referenceImageCount: toNumber(data.referenceImageCount),
        templateReferenceUsed: data.templateReferenceUsed === true,
        catalogDropReferenceCount: toNumber(data.catalogDropReferenceCount || data.recentDropReferenceCount),
        recentDropReferenceCount: toNumber(data.recentDropReferenceCount),
        retainedAiReferenceCount: toNumber(data.retainedAiReferenceCount),
        retainedAcceptedAiReferenceCount: toNumber(data.retainedAcceptedAiReferenceCount),
        retainedLikedAiReferenceCount: toNumber(data.retainedLikedAiReferenceCount),
        referenceAssets: Array.isArray(data.referenceAssets)
            ? data.referenceAssets
                .filter((asset): asset is AdminAiDropCoverReferenceAsset => Boolean(asset && typeof asset === "object"))
                .map((asset) => normalizeReferenceAsset(asset))
            : [],
        acceptedAtMs: typeof data.acceptedAtMs === "number" ? data.acceptedAtMs : null,
        acceptedForDropId: typeof data.acceptedForDropId === "string" ? data.acceptedForDropId : null,
        errorMessage: typeof data.errorMessage === "string" ? data.errorMessage : null,
    });
}

function createStoragePath(jobId: string, title: string) {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    const fileBase = sanitizeStorageFileName(title).replace(/\.[A-Za-z0-9]+$/, "") || "drop_cover";
    const fileName = `${jobId}_${fileBase}.png`;
    return {
        fileName,
        storagePath: `drops/images/generated/${year}/${month}/${fileName}`,
    };
}

function createTemplateReferenceStoragePath(fileName: string) {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    const sanitizedName = sanitizeStorageFileName(fileName);
    const extensionMatch = sanitizedName.match(/(\.[A-Za-z0-9]+)$/);
    const extension = extensionMatch?.[1] || ".png";
    const safeName = sanitizedName.replace(/\.[A-Za-z0-9]+$/, "") || "cover_template";
    const finalFileName = `${Date.now()}_${safeName}${extension}`;
    return {
        fileName: finalFileName,
        storagePath: `drops/images/ai-references/${year}/${month}/${finalFileName}`,
    };
}

function normalizeReferenceAsset(raw: AdminAiDropCoverReferenceAsset) {
    return adminAiDropCoverReferenceAssetSchema.parse({
        ...raw,
        source: raw.source === "recent_drop_cover" ? "catalog_drop_cover" : raw.source,
    });
}

function buildDropCoverCatalogReferenceCandidate(
    docId: string,
    raw: Record<string, unknown>,
) {
    const imageUrl = getString(raw.imageUrl);
    if (!imageUrl) {
        return null;
    }

    return {
        asset: normalizeReferenceAsset({
            id: `drop_${docId}`,
            source: "catalog_drop_cover",
            imageUrl,
            fileName: typeof raw.coverFileName === "string"
                ? raw.coverFileName
                : typeof raw.fileName === "string"
                    ? raw.fileName
                    : null,
            storagePath: typeof raw.storagePath === "string" ? raw.storagePath : null,
            dropId: docId,
            title: getString(raw.title) || "Untitled Drop",
            creatorId: getString(raw.creatorId) || null,
            creatorName: getString(raw.creatorName) || null,
            retentionReason: "catalog",
        }),
        unlocks: toNumber(raw.totalUnlocks),
        recencyMs: Math.max(
            getFiniteDropTimestamp(raw.validFrom) || 0,
            getFiniteDropTimestamp(raw.createdAt) || 0,
            getFiniteDropTimestamp(raw.updatedAt) || 0,
        ),
    };
}

export function buildCatalogDropCoverReferenceAssetsFromDocs(
    docs: DropReferenceCandidateDoc[],
    options?: {
        excludeDropId?: string | null;
        limit?: number;
    },
) {
    const limit = Math.max(0, options?.limit ?? DROP_COVER_CATALOG_PREVIEW_LIMIT);
    const excludeDropId = options?.excludeDropId || null;
    const seenImageUrls = new Set<string>();
    const candidates = docs
        .filter((doc) => !excludeDropId || doc.id !== excludeDropId)
        .map((doc) => buildDropCoverCatalogReferenceCandidate(doc.id, doc.data()))
        .filter((candidate): candidate is NonNullable<ReturnType<typeof buildDropCoverCatalogReferenceCandidate>> => Boolean(candidate))
        .filter((candidate) => {
            if (seenImageUrls.has(candidate.asset.imageUrl)) {
                return false;
            }
            seenImageUrls.add(candidate.asset.imageUrl);
            return true;
        });

    return candidates
        .sort((left, right) => {
            if (right.unlocks !== left.unlocks) {
                return right.unlocks - left.unlocks;
            }
            if (right.recencyMs !== left.recencyMs) {
                return right.recencyMs - left.recencyMs;
            }
            return (left.asset.title || "").localeCompare(right.asset.title || "");
        })
        .slice(0, limit)
        .map((candidate) => candidate.asset);
}

async function listCatalogDropCoverReferenceAssets(excludeDropId?: string | null, limit = DROP_COVER_CATALOG_PREVIEW_LIMIT) {
    if (!adminDb) {
        return [] as AdminAiDropCoverReferenceAsset[];
    }

    const snapshot = await adminDb.collection("drops").get();
    return buildCatalogDropCoverReferenceAssetsFromDocs(snapshot.docs, {
        excludeDropId,
        limit,
    });
}

async function listRetainedAiCoverReferenceAssets(limit = RETAINED_AI_REFERENCE_LIMIT) {
    if (!adminDb) {
        return [] as AdminAiDropCoverReferenceAsset[];
    }

    const snapshot = await adminDb.collection(ADMIN_AI_DROP_COVER_JOBS_COLLECTION)
        .orderBy("requestedAtMs", "desc")
        .limit(Math.max(limit * 6, 24))
        .get();

    const assets: AdminAiDropCoverReferenceAsset[] = [];
    const seenImageUrls = new Set<string>();

    for (const doc of snapshot.docs) {
        const job = normalizeJobRecord(doc.id, doc.data());
        if (job.status !== "succeeded" || !job.imageUrl) {
            continue;
        }

        const accepted = job.accepted === true;
        const liked = job.feedback === "liked";
        if (!accepted && !liked) {
            continue;
        }

        if (seenImageUrls.has(job.imageUrl)) {
            continue;
        }
        seenImageUrls.add(job.imageUrl);

        assets.push(normalizeReferenceAsset({
            id: `ai_job_${job.id}`,
            source: "retained_ai_cover",
            imageUrl: job.imageUrl,
            fileName: job.fileName || null,
            storagePath: job.storagePath || null,
            dropId: job.acceptedForDropId || job.dropId || null,
            title: job.title || "Retained AI cover",
            creatorId: job.creatorId || null,
            creatorName: job.creatorName || null,
            retentionReason: accepted ? "accepted" : "liked",
            accepted,
            feedback: job.feedback,
        }));

        if (assets.length >= limit) {
            break;
        }
    }

    return assets;
}

function applyReferenceUsageStats(
    assets: AdminAiDropCoverReferenceAsset[],
    jobs: AdminAiDropCoverJobRecord[],
) {
    const usageMap = new Map<string, {
        usageCount: number;
        lastUsedAtMs: number;
        successfulReuseCount: number;
        positiveReuseCount: number;
        acceptedReuseCount: number;
        likedReuseCount: number;
    }>();

    for (const job of jobs) {
        const requestedAtMs = typeof job.requestedAtMs === "number" ? job.requestedAtMs : 0;
        for (const asset of job.referenceAssets || []) {
            const current = usageMap.get(asset.id);
            const successfulReuseCount = job.status === "succeeded" ? 1 : 0;
            const likedReuseCount = job.feedback === "liked" ? 1 : 0;
            const acceptedReuseCount = job.accepted ? 1 : 0;
            const positiveReuseCount = likedReuseCount || acceptedReuseCount ? 1 : 0;
            usageMap.set(asset.id, {
                usageCount: (current?.usageCount || 0) + 1,
                lastUsedAtMs: Math.max(current?.lastUsedAtMs || 0, requestedAtMs),
                successfulReuseCount: (current?.successfulReuseCount || 0) + successfulReuseCount,
                positiveReuseCount: (current?.positiveReuseCount || 0) + positiveReuseCount,
                acceptedReuseCount: (current?.acceptedReuseCount || 0) + acceptedReuseCount,
                likedReuseCount: (current?.likedReuseCount || 0) + likedReuseCount,
            });
        }
    }

    return assets.map((asset) => {
        const usage = usageMap.get(asset.id);
        return normalizeReferenceAsset({
            ...asset,
            usageCount: usage?.usageCount || 0,
            successfulReuseCount: usage?.successfulReuseCount || 0,
            positiveReuseCount: usage?.positiveReuseCount || 0,
            acceptedReuseCount: usage?.acceptedReuseCount || 0,
            likedReuseCount: usage?.likedReuseCount || 0,
            lastUsedAtMs: usage?.lastUsedAtMs || null,
        });
    });
}

function inferReferenceImageMimeType(url: string, headerMimeType?: string | null) {
    const normalizedHeader = (headerMimeType || "").toLowerCase();
    if (normalizedHeader.startsWith("image/")) {
        return normalizedHeader;
    }

    const normalizedUrl = url.toLowerCase();
    if (normalizedUrl.includes(".jpg") || normalizedUrl.includes(".jpeg")) {
        return "image/jpeg";
    }
    if (normalizedUrl.includes(".webp")) {
        return "image/webp";
    }

    return ADMIN_AI_DROP_COVER_OUTPUT_MIME_TYPE;
}

async function loadReferenceImageBytesFromUrl(url: string): Promise<LoadedReferenceImage> {
    const response = await fetch(url, {
        cache: "no-store",
    });

    if (!response.ok) {
        throw new Error(`Reference image fetch failed with status ${response.status}`);
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    return {
        bytesBase64Encoded: bytes.toString("base64"),
        mimeType: inferReferenceImageMimeType(url, response.headers.get("content-type")),
    };
}

async function buildReferenceContext(
    settings: AdminAiDropCoverSettings,
    recipe: AdminAiDropCoverConsistencyRecipe,
    dropId?: string | null,
): Promise<AdminAiDropCoverReferenceContext> {
    const wantsTemplateReference = settings.useTemplateReference;
    const wantsRecentDropReferences = settings.useRecentDropCoverReferences;

    if (!wantsTemplateReference && !wantsRecentDropReferences) {
        return {
            generationMode: "standard",
            recipe,
            referenceImages: [],
            referenceAssets: [],
            templateReferenceUsed: false,
            catalogDropReferenceCount: 0,
            recentDropReferenceCount: 0,
            retainedAiReferenceCount: 0,
            retainedAcceptedAiReferenceCount: 0,
            retainedLikedAiReferenceCount: 0,
        };
    }

    const referenceImages: LoadedReferenceImage[] = [];
    const referenceAssets: AdminAiDropCoverReferenceAsset[] = [];
    let templateReferenceUsed = false;
    let catalogDropReferenceCount = 0;
    let retainedAiReferenceCount = 0;
    let retainedAcceptedAiReferenceCount = 0;
    let retainedLikedAiReferenceCount = 0;

    const canAddMoreReferenceInputs = () => referenceImages.length < MAX_REFERENCE_INPUTS;

    if (wantsTemplateReference) {
        if (!settings.templateReferenceUrl) {
            throw createAdminAiDropCoverError(
                "validation_failed",
                400,
                "Template-guided AI cover generation was enabled without a template reference image.",
                "Upload a cover template or turn template guidance off before generating.",
            );
        }

        try {
            const templateReference = await loadReferenceImageBytesFromUrl(settings.templateReferenceUrl);
            if (canAddMoreReferenceInputs()) {
                referenceImages.push({
                    ...templateReference,
                    styleDescription: TEMPLATE_REFERENCE_STYLE_DESCRIPTION,
                });
                referenceAssets.push(normalizeReferenceAsset({
                    id: "template",
                    source: "template",
                    imageUrl: settings.templateReferenceUrl,
                    fileName: settings.templateReferenceFileName || null,
                    storagePath: settings.templateReferenceStoragePath || null,
                    dropId: null,
                    title: "Current template",
                    retentionReason: "template",
                }));
            }
            templateReferenceUsed = true;
        } catch (error) {
            throw classifyStorageError(
                error,
                error instanceof Error ? error.message : "Failed to load the template reference image.",
                "The saved AI cover template could not be loaded. Re-upload the template or turn template guidance off.",
            );
        }
    }

    const candidateAssets = [
        ...(await listRetainedAiCoverReferenceAssets(RETAINED_AI_REFERENCE_CANDIDATE_LIMIT)),
        ...(wantsRecentDropReferences
            ? await listCatalogDropCoverReferenceAssets(dropId, DROP_COVER_CATALOG_CANDIDATE_LIMIT)
            : []),
    ];
    const selectedCandidateAssets = selectAdminAiDropCoverReferenceAssets(
        candidateAssets,
        recipe,
        Math.max(0, MAX_REFERENCE_INPUTS - referenceImages.length),
    );

    for (const asset of selectedCandidateAssets) {
        if (!canAddMoreReferenceInputs()) {
            break;
        }

        try {
            const loadedReference = await loadReferenceImageBytesFromUrl(asset.imageUrl);
            referenceImages.push({
                ...loadedReference,
                styleDescription: TEMPLATE_REFERENCE_STYLE_DESCRIPTION,
            });
            referenceAssets.push(asset);
            if (asset.source === "retained_ai_cover") {
                retainedAiReferenceCount += 1;
                if (asset.retentionReason === "accepted") {
                    retainedAcceptedAiReferenceCount += 1;
                }
                if (asset.retentionReason === "liked") {
                    retainedLikedAiReferenceCount += 1;
                }
            } else if (asset.source === "catalog_drop_cover" || asset.source === "recent_drop_cover") {
                catalogDropReferenceCount += 1;
            }
        } catch (error) {
            recordRouteWarning("admin/ai/drop-covers/reference-image", "Failed to load ranked AI cover reference", error, {
                channel: "ai",
                detail: {
                    referenceSource: asset.source,
                    referenceId: asset.id,
                    imageUrl: asset.imageUrl,
                },
            });
        }
    }

    if (referenceImages.length === 0) {
        throw createAdminAiDropCoverError(
            "validation_failed",
            400,
            "Reference-guided cover generation was enabled, but no usable reference images could be loaded.",
            "Reference-guided generation is on, but no usable template, retained positive AI cover, or drop cover library reference was available. Upload a template, keep at least one covered drop in the catalog, or turn reference guidance off.",
        );
    }

    return {
        generationMode: "reference_guided",
        recipe,
        referenceImages,
        referenceAssets,
        templateReferenceUsed,
        catalogDropReferenceCount,
        recentDropReferenceCount: catalogDropReferenceCount,
        retainedAiReferenceCount,
        retainedAcceptedAiReferenceCount,
        retainedLikedAiReferenceCount,
    };
}

async function applySummaryDelta(delta: SummaryDelta) {
    if (!adminDb) {
        return;
    }

    const updatePayload: Record<string, unknown> = {
        updatedAt: FieldValue.serverTimestamp(),
        updatedAtMs: Date.now(),
    };

    const incrementFields: Array<keyof SummaryDelta> = [
        "generationCount",
        "successfulGenerationCount",
        "failedGenerationCount",
        "acceptedCount",
        "likedCount",
        "dislikedCount",
        "regeneratedCount",
        "totalEstimatedCostUsd",
        "totalLatencyMs",
        "latencySampleCount",
    ];

    incrementFields.forEach((field) => {
        const value = delta[field];
        if (typeof value === "number" && value !== 0) {
            updatePayload[field] = FieldValue.increment(value);
        }
    });

    if (typeof delta.lastSuccessAtMs === "number") {
        updatePayload.lastSuccessAtMs = delta.lastSuccessAtMs;
    }

    if (typeof delta.lastFailureAtMs === "number") {
        updatePayload.lastFailureAtMs = delta.lastFailureAtMs;
    }

    try {
        await adminDb.collection(ADMIN_AI_DROP_COVER_SUMMARY_COLLECTION).doc(ADMIN_AI_DROP_COVER_SUMMARY_DOC).set(updatePayload, { merge: true });
    } catch (error) {
        recordRouteWarning("admin/ai/drop-covers/summary", "Admin AI drop cover summary update failed", error, {
            channel: "ai",
            detail: {
                fields: Object.keys(delta),
            },
        });
    }
}

async function getVertexAccessToken(project?: string) {
    const auth = new GoogleAuth({
        scopes: [VERTEX_SCOPE],
        projectId: project || undefined,
    });
    const client = await auth.getClient();
    const accessTokenResult = await client.getAccessToken();
    const accessToken = typeof accessTokenResult === "string"
        ? accessTokenResult
        : accessTokenResult?.token || "";

    if (!accessToken) {
        throw new Error("Could not load the default credentials.");
    }

    return accessToken;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
    return await new Promise<T>((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error(`Vertex image request timed out after ${timeoutMs}ms`));
        }, timeoutMs);

        promise
            .then((value) => {
                clearTimeout(timeout);
                resolve(value);
            })
            .catch((error: unknown) => {
                clearTimeout(timeout);
                reject(error);
            });
    });
}

function buildVertexPublisherGenerateContentEndpoint(runtime: AdminAiDropCoverRuntime) {
    const hostname = runtime.location === "global"
        ? "aiplatform.googleapis.com"
        : `${runtime.location}-aiplatform.googleapis.com`;

    return `https://${hostname}/v1/projects/${runtime.project}/locations/${runtime.location}/publishers/google/models/${runtime.model}:generateContent`;
}

async function generateGeminiImage(input: GenerateImageInput): Promise<GenerateVertexImageResult> {
    const referenceParts = (input.referenceImages || []).map((referenceImage) => ({
        inlineData: {
            mimeType: referenceImage.mimeType,
            data: referenceImage.bytesBase64Encoded,
        },
    }));

    const response = await withTimeout(fetch(
        buildVertexPublisherGenerateContentEndpoint(input.runtime),
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${input.accessToken}`,
                "Content-Type": "application/json; charset=utf-8",
            },
            body: JSON.stringify({
                contents: {
                    role: "USER",
                    parts: [
                        { text: input.prompt },
                        ...referenceParts,
                    ],
                },
                generationConfig: {
                    responseModalities: ["TEXT", "IMAGE"],
                    candidateCount: 1,
                    imageConfig: {
                        aspectRatio: input.aspectRatio,
                    },
                },
            }),
        },
    ).then(async (result) => {
        const json = await result.json().catch(() => null) as GeminiGenerateContentResponse | null;
        if (!result.ok) {
            throw new Error(json?.error?.message || `Vertex image generation failed with status ${result.status}`);
        }
        return json;
    }), input.timeoutMs ?? DEFAULT_TIMEOUT_MS);

    const parts = response?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((part) => typeof part.inlineData?.data === "string" && part.inlineData.data.length > 0) || null;
    if (!imagePart?.inlineData?.data) {
        throw new Error("Vertex image generation returned no image bytes.");
    }

    const textPart = parts.find((part) => typeof part.text === "string" && part.text.trim().length > 0) || null;

    return {
        bytes: Buffer.from(imagePart.inlineData.data, "base64"),
        mimeType: imagePart.inlineData.mimeType || input.outputMimeType || ADMIN_AI_DROP_COVER_OUTPUT_MIME_TYPE,
        enhancedPrompt: textPart?.text,
    };
}

async function generateVertexImage(input: GenerateImageInput): Promise<GenerateVertexImageResult> {
    return generateGeminiImage(input);
}

export function resolveAdminAiDropCoverRuntime(
    settings?: Partial<AdminAiDropCoverSettings>,
    requestedModel?: string | null,
): AdminAiDropCoverRuntime {
    const normalizedSettings = normalizeSettings(settings);
    const requestedModelValue = requestedModel?.trim() || "";
    const preferredModel = requestedModelValue || normalizedSettings.model;
    const runtimeModel = normalizeAdminAiDropCoverModel(
        preferredModel
        || process.env.VERTEX_AI_IMAGE_MODEL
        || process.env.GOOGLE_VERTEX_IMAGE_MODEL
        || normalizedSettings.model,
        normalizedSettings.generationMode,
    );
    const runtimeLocation = normalizeAdminAiDropCoverLocation(
        process.env.VERTEX_AI_LOCATION
        || process.env.GOOGLE_CLOUD_LOCATION
        || process.env.GCLOUD_LOCATION
        || getAdminAiDropCoverModelOption(runtimeModel)?.location
        || normalizedSettings.location,
        runtimeModel,
        normalizedSettings.generationMode,
    );
    const project = (
        process.env.GOOGLE_CLOUD_PROJECT
        || process.env.GCLOUD_PROJECT
        || process.env.PROJECT_ID
        || FIREBASE_PROJECT_ID
        || process.env.FIREBASE_PROJECT_ID
        || ""
    ).trim();

    return {
        project,
        location: runtimeLocation || DEFAULT_VERTEX_LOCATION,
        model: runtimeModel || ADMIN_AI_DROP_COVER_MODEL,
        provider: "gemini_generate_content",
    };
}

export async function getAdminAiDropCoverSettings() {
    if (!adminDb) {
        return getDefaultAdminAiDropCoverSettings();
    }

    const snapshot = await adminDb.collection("adminSettings").doc(ADMIN_AI_DROP_COVER_SETTINGS_DOC).get();
    const rawData = snapshot.exists ? snapshot.data() : null;
    const normalized = normalizeSettings(rawData);

    if (snapshot.exists && settingsRequireCanonicalMigration(rawData, normalized)) {
        await adminDb.collection("adminSettings").doc(ADMIN_AI_DROP_COVER_SETTINGS_DOC).set({
            ...normalized,
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
    }

    return normalized;
}

export async function saveAdminAiDropCoverSettings(input: {
    enabled?: boolean;
    model?: AdminAiDropCoverSelectableModel;
    useTemplateReference?: boolean;
    useRecentDropCoverReferences?: boolean;
    actorUid: string;
    actorEmail?: string | undefined;
}) {
    const existing = await getAdminAiDropCoverSettings();
    const nextModel = input.model && isAdminAiDropCoverSelectableModel(input.model)
        ? input.model
        : existing.model;
    const nextModelOption = getAdminAiDropCoverModelOption(nextModel);
    const nextSettings = normalizeSettings({
        ...existing,
        enabled: typeof input.enabled === "boolean" ? input.enabled : existing.enabled,
        model: nextModel,
        location: nextModelOption?.location || existing.location,
        pricePerGenerationUsd: nextModelOption?.pricePerGenerationUsd || existing.pricePerGenerationUsd,
        priceBasis: nextModelOption?.priceBasis || existing.priceBasis,
        useTemplateReference: typeof input.useTemplateReference === "boolean"
            ? input.useTemplateReference
            : existing.useTemplateReference,
        useRecentDropCoverReferences: typeof input.useRecentDropCoverReferences === "boolean"
            ? input.useRecentDropCoverReferences
            : existing.useRecentDropCoverReferences,
        updatedAtMs: Date.now(),
        updatedByUid: input.actorUid,
        updatedByEmail: input.actorEmail || null,
    });

    if (adminDb) {
        await adminDb.collection("adminSettings").doc(ADMIN_AI_DROP_COVER_SETTINGS_DOC).set({
            ...nextSettings,
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
    }

    await recordServerDiagnostic({
        channel: "ai",
        severity: "info",
        message: "Admin AI drop cover settings updated",
        detail: {
            actorUid: input.actorUid,
            actorEmail: input.actorEmail || "",
            model: nextSettings.model,
            location: nextSettings.location,
            generationMode: nextSettings.generationMode,
            useTemplateReference: nextSettings.useTemplateReference,
            useRecentDropCoverReferences: nextSettings.useRecentDropCoverReferences,
        },
    });

    if (typeof input.enabled === "boolean" && input.enabled !== existing.enabled) {
        void trackServerEvent("admin_ai_cover_toggle_updated", {
            ai_feature: "drop_cover_generation",
            ai_enabled: nextSettings.enabled,
            ai_model: nextSettings.model,
            ai_location: nextSettings.location,
            ai_generation_mode: nextSettings.generationMode,
        }, input.actorUid);
    }

    return nextSettings;
}

export async function uploadAdminAiDropCoverTemplate(input: {
    fileName: string;
    mimeType?: string | null;
    bytes: Buffer;
    actorUid: string;
    actorEmail?: string | undefined;
}) {
    if (!adminDb || !adminStorage) {
        throw createAdminAiDropCoverError(
            "runtime_unavailable",
            503,
            "AI cover template upload requires Firebase Admin runtime access.",
            "AI cover template upload is unavailable because the admin Firebase runtime is not ready.",
        );
    }

    const existing = await getAdminAiDropCoverSettings();
    const { fileName, storagePath } = createTemplateReferenceStoragePath(input.fileName);
    const bucket = adminStorage.bucket();
    const storageFile = bucket.file(storagePath);
    let imageUrl = "";

    try {
        await storageFile.save(input.bytes, {
            resumable: false,
            contentType: input.mimeType || ADMIN_AI_DROP_COVER_OUTPUT_MIME_TYPE,
            metadata: {
                cacheControl: "public,max-age=31536000,immutable",
                metadata: {
                    aiReferenceType: "cover_template",
                    aiReferenceUploadedBy: input.actorUid,
                },
            },
        });

        const metadataResult = await storageFile.getMetadata();
        const metadata = (Array.isArray(metadataResult) ? metadataResult[0] : metadataResult) as unknown as StorageObjectMetadata;
        imageUrl = await ensureFirebaseDownloadUrl(bucket, storageFile, metadata);
    } catch (error) {
        throw classifyStorageError(
            error,
            error instanceof Error ? error.message : "Failed to save the AI cover template.",
            "The AI cover template could not be uploaded to storage.",
        );
    }

    const nextSettings = normalizeSettings({
        ...existing,
        useTemplateReference: true,
        templateReferenceUrl: imageUrl,
        templateReferenceStoragePath: storagePath,
        templateReferenceFileName: fileName,
        updatedAtMs: Date.now(),
        updatedByUid: input.actorUid,
        updatedByEmail: input.actorEmail || null,
    });

    await adminDb.collection("adminSettings").doc(ADMIN_AI_DROP_COVER_SETTINGS_DOC).set({
        ...nextSettings,
        updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    if (existing.templateReferenceStoragePath && existing.templateReferenceStoragePath !== storagePath) {
        void bucket.file(existing.templateReferenceStoragePath).delete().catch((error: unknown) => {
            recordRouteWarning("admin/ai/drop-covers/template", "Failed to remove replaced AI cover template", error, {
                channel: "ai",
                detail: {
                    storagePath: existing.templateReferenceStoragePath,
                },
            });
        });
    }

    await recordServerDiagnostic({
        channel: "ai",
        severity: "info",
        message: "Admin AI cover template uploaded",
        detail: {
            actorUid: input.actorUid,
            actorEmail: input.actorEmail || "",
            storagePath,
            model: nextSettings.model,
            generationMode: nextSettings.generationMode,
        },
    });

    return {
        settings: nextSettings,
        template: normalizeReferenceAsset({
            id: "template",
            source: "template",
            imageUrl,
            fileName,
            storagePath,
            dropId: null,
            title: "Current template",
        }),
    };
}

export async function removeAdminAiDropCoverTemplate(input: {
    actorUid: string;
    actorEmail?: string | undefined;
}) {
    if (!adminDb || !adminStorage) {
        throw createAdminAiDropCoverError(
            "runtime_unavailable",
            503,
            "AI cover template removal requires Firebase Admin runtime access.",
            "AI cover template removal is unavailable because the admin Firebase runtime is not ready.",
        );
    }

    const existing = await getAdminAiDropCoverSettings();
    const nextSettings = normalizeSettings({
        ...existing,
        useTemplateReference: false,
        templateReferenceUrl: null,
        templateReferenceStoragePath: null,
        templateReferenceFileName: null,
        updatedAtMs: Date.now(),
        updatedByUid: input.actorUid,
        updatedByEmail: input.actorEmail || null,
    });

    await adminDb.collection("adminSettings").doc(ADMIN_AI_DROP_COVER_SETTINGS_DOC).set({
        ...nextSettings,
        updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    if (existing.templateReferenceStoragePath) {
        void adminStorage.bucket().file(existing.templateReferenceStoragePath).delete().catch((error: unknown) => {
            recordRouteWarning("admin/ai/drop-covers/template", "Failed to delete AI cover template from storage", error, {
                channel: "ai",
                detail: {
                    storagePath: existing.templateReferenceStoragePath,
                },
            });
        });
    }

    await recordServerDiagnostic({
        channel: "ai",
        severity: "info",
        message: "Admin AI cover template removed",
        detail: {
            actorUid: input.actorUid,
            actorEmail: input.actorEmail || "",
            model: nextSettings.model,
            generationMode: nextSettings.generationMode,
        },
    });

    return nextSettings;
}

async function resolveAdminAiDropCoverRuntimeSnapshot(
    settings: AdminAiDropCoverSettings,
    requestedModel?: string | null,
): Promise<AdminAiDropCoverRuntimeSnapshot> {
    const runtime = resolveAdminAiDropCoverRuntime(settings, requestedModel);
    const configuredStorageBucket = (
        adminStorage?.app?.options?.storageBucket
        || FIREBASE_STORAGE_BUCKET
        || process.env.FIREBASE_STORAGE_BUCKET
        || ""
    ).trim();

    if (!settings.enabled || !adminDb || !adminStorage || !configuredStorageBucket || !runtime.project) {
        return {
            settings,
            runtime,
            configuredStorageBucket,
            authReady: false,
            authError: null,
        };
    }

    try {
        await getVertexAccessToken(runtime.project);
        return {
            settings,
            runtime,
            configuredStorageBucket,
            authReady: true,
            authError: null,
        };
    } catch (error) {
        return {
            settings,
            runtime,
            configuredStorageBucket,
            authReady: false,
            authError: error,
        };
    }
}

function buildAdminAiDropCoverRuntimeStatusFromSnapshot(snapshot: AdminAiDropCoverRuntimeSnapshot) {
    const { settings, runtime, configuredStorageBucket, authReady, authError } = snapshot;

    if (!settings.enabled) {
        return adminAiDropCoverRuntimeSchema.parse({
            enabled: false,
            status: "disabled",
            note: "AI cover generation is turned off from the Admin AI page.",
            project: runtime.project,
            location: runtime.location,
            model: runtime.model,
            generationMode: settings.generationMode,
            pricePerGenerationUsd: settings.pricePerGenerationUsd,
            priceBasis: settings.priceBasis,
            priceSourceUrl: settings.priceSourceUrl,
        });
    }

    if (!adminDb) {
        return adminAiDropCoverRuntimeSchema.parse({
            enabled: true,
            status: "error",
            note: "Firebase Admin database access is unavailable, so AI cover jobs cannot be recorded yet.",
            project: runtime.project,
            location: runtime.location,
            model: runtime.model,
            generationMode: settings.generationMode,
            pricePerGenerationUsd: settings.pricePerGenerationUsd,
            priceBasis: settings.priceBasis,
            priceSourceUrl: settings.priceSourceUrl,
        });
    }

    if (!adminStorage || !configuredStorageBucket) {
        return adminAiDropCoverRuntimeSchema.parse({
            enabled: true,
            status: "error",
            note: "Firebase Storage bucket configuration is missing, so generated covers cannot be saved yet.",
            project: runtime.project,
            location: runtime.location,
            model: runtime.model,
            generationMode: settings.generationMode,
            pricePerGenerationUsd: settings.pricePerGenerationUsd,
            priceBasis: settings.priceBasis,
            priceSourceUrl: settings.priceSourceUrl,
        });
    }

    if (!runtime.project) {
        return adminAiDropCoverRuntimeSchema.parse({
            enabled: true,
            status: "missing_project",
            note: "Vertex project configuration is missing. Set GOOGLE_CLOUD_PROJECT or FIREBASE_PROJECT_ID before enabling live generation.",
            project: "",
            location: runtime.location,
            model: runtime.model,
            generationMode: settings.generationMode,
            pricePerGenerationUsd: settings.pricePerGenerationUsd,
            priceBasis: settings.priceBasis,
            priceSourceUrl: settings.priceSourceUrl,
        });
    }

    if (!authReady) {
        return adminAiDropCoverRuntimeSchema.parse({
            enabled: true,
            status: "auth_missing",
            note: summarizeAiAvailabilityIssue(authError, runtime, "auth"),
            project: runtime.project,
            location: runtime.location,
            model: runtime.model,
            generationMode: settings.generationMode,
            pricePerGenerationUsd: settings.pricePerGenerationUsd,
            priceBasis: settings.priceBasis,
            priceSourceUrl: settings.priceSourceUrl,
        });
    }

    return adminAiDropCoverRuntimeSchema.parse({
        enabled: true,
        status: "ready",
        note: settings.generationMode === "reference_guided"
            ? `Credential, storage, and job-recording checks passed. When reference-guided generation is on, KandyDrops can send the uploaded template, retained positive AI covers, and retained drop cover library references as image inputs to ${runtime.model} in ${runtime.location}. This page does not expose hidden model reasoning or weight updates. Final model access is still only proven by a successful generation request.`
            : `Credential, storage, and job-recording checks passed. The active image runtime is ${runtime.model} in ${runtime.location}. This page does not expose hidden model reasoning or weight updates, and final model access is only proven by a successful generation request.`,
        project: runtime.project,
        location: runtime.location,
        model: runtime.model,
        generationMode: settings.generationMode,
        pricePerGenerationUsd: settings.pricePerGenerationUsd,
        priceBasis: settings.priceBasis,
        priceSourceUrl: settings.priceSourceUrl,
    });
}

export async function getAdminAiDropCoverRuntimeStatus(
    requestedModel?: string | null,
    settingsOverride?: AdminAiDropCoverSettings,
) {
    const settings = settingsOverride ?? await getAdminAiDropCoverSettings();
    const snapshot = await resolveAdminAiDropCoverRuntimeSnapshot(settings, requestedModel);
    return buildAdminAiDropCoverRuntimeStatusFromSnapshot(snapshot);
}

export async function listRecentAdminAiDropCoverJobs(limit = RECENT_JOB_LIMIT) {
    if (!adminDb) {
        return [] as AdminAiDropCoverJobRecord[];
    }

    const snapshot = await adminDb.collection(ADMIN_AI_DROP_COVER_JOBS_COLLECTION)
        .orderBy("requestedAtMs", "desc")
        .limit(limit)
        .get();

    return snapshot.docs.map((doc) => normalizeJobRecord(doc.id, doc.data()));
}

async function listRecentAdminAiDiagnostics(limit = 12) {
    if (!adminDb) {
        return [] as AdminAiDropCoverRuntimeDiagnostic[];
    }

    try {
        const snapshot = await adminDb.collection("server_diagnostics")
            .orderBy("createdAtMs", "desc")
            .limit(Math.max(limit * 10, 80))
            .get();
        const diagnostics: AdminAiDropCoverRuntimeDiagnostic[] = [];
        for (const doc of snapshot.docs) {
            const data = (doc.data() || {}) as Record<string, unknown>;
            if (getString(data.channel) !== "ai") {
                continue;
            }

            const detail = data.detail && typeof data.detail === "object"
                ? data.detail as Record<string, unknown>
                : {};

            diagnostics.push({
                id: doc.id,
                severity: data.severity === "error" || data.severity === "warn" ? data.severity : "info",
                message: getString(data.message) || "AI diagnostic recorded",
                createdAtMs: toNumber(data.createdAtMs),
                model: getString(detail.model) || null,
                generationMode: detail.generationMode === "reference_guided" ? "reference_guided" : detail.generationMode === "standard" ? "standard" : null,
                jobId: getString(detail.jobId) || null,
                failureCode: getString(detail.failureCode) || null,
                summary: buildAiDiagnosticSummary(detail),
            });

            if (diagnostics.length >= limit) {
                break;
            }
        }

        return diagnostics;
    } catch (error) {
        recordRouteWarning("admin/ai/drop-covers/diagnostics", "Failed to load recent AI diagnostics", error, {
            channel: "ai",
            detail: {
                limit,
            },
        });
        return [] as AdminAiDropCoverRuntimeDiagnostic[];
    }
}

function buildVisualSignalsSummary(input: {
    settings: AdminAiDropCoverSettings;
    templateAsset: AdminAiDropCoverReferenceAsset | null;
    catalogDropCovers: AdminAiDropCoverReferenceAsset[];
    retainedAiCovers: AdminAiDropCoverReferenceAsset[];
    aggregate: Pick<AdminAiDropCoverSummaryRecord, "dislikedCount">;
}): AdminAiDropCoverVisualSignalSummary {
    const acceptedRetainedCount = input.retainedAiCovers.filter((asset) => asset.retentionReason === "accepted").length;
    const likedRetainedCount = input.retainedAiCovers.filter((asset) => asset.retentionReason === "liked").length;
    const totalReusableReferenceCount = (input.templateAsset ? 1 : 0) + input.catalogDropCovers.length + input.retainedAiCovers.length;
    const referenceGuidanceReady = input.settings.generationMode === "reference_guided"
        ? totalReusableReferenceCount > 0
        : totalReusableReferenceCount > 0;

    return {
        templateCount: input.templateAsset ? 1 : 0,
        catalogDropCoverCount: input.catalogDropCovers.length,
        retainedAiCoverCount: input.retainedAiCovers.length,
        acceptedRetainedCount,
        likedRetainedCount,
        dislikedHistoryCount: input.aggregate.dislikedCount,
        totalReusableReferenceCount,
        referenceGuidanceReady,
    };
}

async function buildModelHealthEntries(input: {
    settings: AdminAiDropCoverSettings;
    recentJobs: AdminAiDropCoverJobRecord[];
    diagnostics: AdminAiDropCoverRuntimeDiagnostic[];
}) {
    const options = getAdminAiDropCoverSelectableModelOptions();

    return await Promise.all(options.map(async (option) => {
        const runtime = await getAdminAiDropCoverRuntimeStatus(option.id, input.settings);
        const modelJobs = input.recentJobs.filter((job) => job.model === option.id);
        const modelDiagnostics = input.diagnostics.filter((entry) => entry.model === option.id);
        const recentGenerationCount = modelJobs.length;
        const recentSuccessCount = modelJobs.filter((job) => job.status === "succeeded").length;
        const recentFailureCount = modelJobs.filter((job) => job.status === "failed").length;
        const activeGenerationCount = modelJobs.filter((job) => job.status === "running").length;
        const lastRequestedAtMs = modelJobs.find((job) => typeof job.requestedAtMs === "number")?.requestedAtMs || null;
        const lastSuccessAtMs = modelJobs.find((job) => job.status === "succeeded" && typeof job.completedAtMs === "number")?.completedAtMs || null;
        const latestFailedJob = modelJobs.find((job) => job.status === "failed") || null;
        const lastFailureAtMs = latestFailedJob?.completedAtMs || null;
        const lastFailureMessage = latestFailedJob?.errorMessage || null;
        const diagnosticWarnCount = modelDiagnostics.filter((entry) => entry.severity === "warn").length;
        const diagnosticErrorCount = modelDiagnostics.filter((entry) => entry.severity === "error").length;

        let preflightStatus: AdminAiDropCoverModelHealth["preflightStatus"] =
            runtime.status === "ready" ? "pass" : runtime.status === "disabled" ? "warn" : "fail";
        let note = runtime.note;

        if (runtime.status === "ready") {
            if (lastFailureAtMs && (!lastSuccessAtMs || lastFailureAtMs > lastSuccessAtMs)) {
                preflightStatus = "warn";
                note = lastFailureMessage
                    ? `Last ${option.shortLabel} generation failed at ${formatIsoTimestamp(lastFailureAtMs)}. ${lastFailureMessage}`
                    : `Last ${option.shortLabel} generation failed at ${formatIsoTimestamp(lastFailureAtMs)}. Review the recent AI diagnostics before using it again.`;
            } else if (lastSuccessAtMs) {
                note = `Last proven by a successful ${option.shortLabel} generation at ${formatIsoTimestamp(lastSuccessAtMs)}.`;
            } else if (activeGenerationCount > 0) {
                preflightStatus = "warn";
                note = `${activeGenerationCount} ${option.shortLabel} generation job${activeGenerationCount === 1 ? "" : "s"} currently running.`;
            } else {
                preflightStatus = "warn";
                note = `${option.shortLabel} prerequisites are ready, but this model has not been proven by a successful generation yet.`;
            }
        }

        return {
            ...option,
            selected: input.settings.model === option.id,
            location: runtime.location,
            runtimeStatus: runtime.status,
            preflightStatus,
            note,
            authReady: runtime.status === "ready",
            recentGenerationCount,
            recentSuccessCount,
            recentFailureCount,
            activeGenerationCount,
            lastRequestedAtMs,
            lastSuccessAtMs,
            lastFailureAtMs,
            lastFailureMessage,
            diagnosticWarnCount,
            diagnosticErrorCount,
        } satisfies AdminAiDropCoverModelHealth;
    }));
}

function buildPreflightChecks(input: {
    snapshot: AdminAiDropCoverRuntimeSnapshot;
    runtime: ReturnType<typeof adminAiDropCoverRuntimeSchema.parse>;
    modelHealth: AdminAiDropCoverModelHealth[];
    diagnostics: AdminAiDropCoverRuntimeDiagnostic[];
    visualSignals: AdminAiDropCoverVisualSignalSummary;
}): AdminAiDropCoverPreflightCheck[] {
    const recentError = input.diagnostics.find((entry) => entry.severity === "error") || null;
    const recentWarn = input.diagnostics.find((entry) => entry.severity === "warn") || null;
    const selectedModel = input.modelHealth.find((entry) => entry.selected) || input.modelHealth[0] || null;

    return [
        {
            key: "feature_toggle",
            label: "Feature toggle",
            status: input.snapshot.settings.enabled ? "pass" : "warn",
            detail: input.snapshot.settings.enabled
                ? "AI cover generation is enabled from the Admin AI page."
                : "AI cover generation is turned off from the Admin AI page.",
            updatedAtMs: input.snapshot.settings.updatedAtMs || null,
        },
        {
            key: "job_ledger",
            label: "Job ledger",
            status: adminDb ? "pass" : "fail",
            detail: adminDb
                ? "Firebase Admin database access is ready for AI job history."
                : "Firebase Admin database access is unavailable, so AI jobs cannot be recorded.",
            updatedAtMs: null,
        },
        {
            key: "storage_bucket",
            label: "Storage bucket",
            status: adminStorage && input.snapshot.configuredStorageBucket ? "pass" : "fail",
            detail: adminStorage && input.snapshot.configuredStorageBucket
                ? `Generated covers will save into ${input.snapshot.configuredStorageBucket}.`
                : "Firebase Storage bucket configuration is missing, so generated covers cannot be saved.",
            updatedAtMs: null,
        },
        {
            key: "vertex_project",
            label: "Cloud project",
            status: input.snapshot.runtime.project ? "pass" : "fail",
            detail: input.snapshot.runtime.project
                ? `Vertex requests resolve against ${input.snapshot.runtime.project}.`
                : "Vertex project configuration is missing. Set GOOGLE_CLOUD_PROJECT or FIREBASE_PROJECT_ID.",
            updatedAtMs: null,
        },
        {
            key: "vertex_auth",
            label: "Vertex auth",
            status: !input.snapshot.runtime.project
                ? "warn"
                : input.snapshot.authReady
                    ? "pass"
                    : input.runtime.enabled
                        ? "fail"
                        : "warn",
            detail: !input.snapshot.runtime.project
                ? "Vertex auth cannot be checked until the Google Cloud project is configured."
                : input.snapshot.authReady
                    ? "The current runtime can mint a Vertex access token."
                    : input.runtime.enabled
                        ? summarizeAiAvailabilityIssue(input.snapshot.authError, input.snapshot.runtime, "auth")
                        : "Vertex auth is not checked while the feature is disabled.",
            updatedAtMs: null,
        },
        {
            key: "selected_model",
            label: "Selected model",
            status: selectedModel?.preflightStatus || "warn",
            detail: selectedModel
                ? `${selectedModel.label}: ${selectedModel.note}`
                : "No model status is available yet.",
            updatedAtMs: selectedModel?.lastSuccessAtMs || selectedModel?.lastFailureAtMs || selectedModel?.lastRequestedAtMs || null,
        },
        {
            key: "visual_signals",
            label: "Visual signals",
            status: input.snapshot.settings.generationMode === "reference_guided"
                ? (input.visualSignals.referenceGuidanceReady ? "pass" : "fail")
                : (input.visualSignals.totalReusableReferenceCount > 0 ? "pass" : "warn"),
            detail: input.snapshot.settings.generationMode === "reference_guided"
                ? input.visualSignals.referenceGuidanceReady
                    ? `${input.visualSignals.totalReusableReferenceCount} reusable visual reference${input.visualSignals.totalReusableReferenceCount === 1 ? "" : "s"} are ready for the next guided generation.`
                    : "Reference-guided mode is enabled, but there is no template, retained live cover, or retained positive AI cover ready for the next generation."
                : input.visualSignals.totalReusableReferenceCount > 0
                    ? `${input.visualSignals.totalReusableReferenceCount} reusable visual reference${input.visualSignals.totalReusableReferenceCount === 1 ? "" : "s"} are retained even though standard mode is currently selected.`
                    : "Standard mode does not require retained references, and none are currently retained.",
            updatedAtMs: null,
        },
        {
            key: "recent_diagnostics",
            label: "Recent diagnostics",
            status: recentError ? "fail" : recentWarn ? "warn" : "pass",
            detail: recentError
                ? `${recentError.message}${recentError.summary ? ` (${recentError.summary})` : ""}`
                : recentWarn
                    ? `${recentWarn.message}${recentWarn.summary ? ` (${recentWarn.summary})` : ""}`
                    : "No recent AI warnings or errors were recorded in server diagnostics.",
            updatedAtMs: recentError?.createdAtMs || recentWarn?.createdAtMs || null,
        },
    ];
}

export async function buildAdminAiDropCoverDashboard() {
    const refreshedAtMs = Date.now();
    const settings = await getAdminAiDropCoverSettings();
    const [runtimeSnapshot, recentJobs, summarySnapshot, activeJobsSnapshot, catalogDropCovers, retainedAiCovers, recentDiagnostics] = await Promise.all([
        resolveAdminAiDropCoverRuntimeSnapshot(settings, settings.model),
        listRecentAdminAiDropCoverJobs(),
        adminDb
            ? adminDb.collection(ADMIN_AI_DROP_COVER_SUMMARY_COLLECTION).doc(ADMIN_AI_DROP_COVER_SUMMARY_DOC).get()
            : Promise.resolve(null),
        adminDb
            ? adminDb.collection(ADMIN_AI_DROP_COVER_JOBS_COLLECTION).where("status", "==", "running").get()
            : Promise.resolve(null),
        listCatalogDropCoverReferenceAssets(null),
        listRetainedAiCoverReferenceAssets(),
        listRecentAdminAiDiagnostics(),
    ]);
    const runtime = buildAdminAiDropCoverRuntimeStatusFromSnapshot(runtimeSnapshot);

    const summary = normalizeSummary(summarySnapshot?.exists ? summarySnapshot.data() : null);
    const averageLatencyMs = summary.latencySampleCount > 0
        ? Math.round(summary.totalLatencyMs / summary.latencySampleCount)
        : 0;
    const activeGenerationCount = activeJobsSnapshot?.size ?? recentJobs.filter((job) => job.status === "running").length;
    const templateAsset = settings.templateReferenceUrl
        ? normalizeReferenceAsset({
            id: "template",
            source: "template",
            imageUrl: settings.templateReferenceUrl,
            fileName: settings.templateReferenceFileName || null,
            storagePath: settings.templateReferenceStoragePath || null,
            dropId: null,
            title: "Current template",
            retentionReason: "template",
        })
        : null;
    const decoratedTemplateAsset = templateAsset
        ? applyReferenceUsageStats([templateAsset], recentJobs)[0] || null
        : null;
    const decoratedCatalogDropCovers = applyReferenceUsageStats(catalogDropCovers, recentJobs);
    const decoratedRetainedAiCovers = applyReferenceUsageStats(retainedAiCovers, recentJobs);
    const visualSignals = buildVisualSignalsSummary({
        settings,
        templateAsset: decoratedTemplateAsset,
        catalogDropCovers: decoratedCatalogDropCovers,
        retainedAiCovers: decoratedRetainedAiCovers,
        aggregate: summary,
    });
    const modelHealth = await buildModelHealthEntries({
        settings,
        recentJobs,
        diagnostics: recentDiagnostics,
    });
    const preflightChecks = buildPreflightChecks({
        snapshot: runtimeSnapshot,
        runtime,
        modelHealth,
        diagnostics: recentDiagnostics,
        visualSignals,
    });

    return adminAiDropCoverSummarySchema.parse({
        refreshedAtMs,
        settings,
        runtime,
        preflightChecks,
        modelHealth,
        recentDiagnostics,
        aggregate: {
            generationCount: summary.generationCount,
            successfulGenerationCount: summary.successfulGenerationCount,
            failedGenerationCount: summary.failedGenerationCount,
            acceptedCount: summary.acceptedCount,
            likedCount: summary.likedCount,
            dislikedCount: summary.dislikedCount,
            regeneratedCount: summary.regeneratedCount,
            totalEstimatedCostUsd: Number(summary.totalEstimatedCostUsd.toFixed(4)),
            averageLatencyMs,
            activeGenerationCount,
            lastSuccessAtMs: summary.lastSuccessAtMs || null,
            lastFailureAtMs: summary.lastFailureAtMs || null,
        },
        recentJobs,
        referenceAssets: {
            template: decoratedTemplateAsset,
            catalogDropCovers: decoratedCatalogDropCovers,
            retainedAiCovers: decoratedRetainedAiCovers,
        },
        visualSignals,
    });
}

export async function generateAdminAiDropCover(input: AdminAiDropCoverGenerationInput) {
    if (!adminDb || !adminStorage) {
        throw createAdminAiDropCoverError(
            "runtime_unavailable",
            503,
            "AI cover generation requires Firebase Admin runtime access.",
            "AI cover generation is unavailable because the admin Firebase runtime is not ready.",
        );
    }

    const settings = await getAdminAiDropCoverSettings();
    if (!settings.enabled) {
        throw createAdminAiDropCoverError("feature_disabled", 409, "AI cover generation is turned off.");
    }

    if (input.requestedModel && !isAdminAiDropCoverSelectableModel(input.requestedModel)) {
        throw createAdminAiDropCoverError(
            "validation_failed",
            400,
            `Unsupported AI image model requested: ${input.requestedModel}`,
            "The selected AI image model is not supported in the create-drop switch.",
        );
    }

    const runtime = resolveAdminAiDropCoverRuntime(settings, input.requestedModel);
    const storageBucketName = (
        adminStorage.app?.options?.storageBucket
        || FIREBASE_STORAGE_BUCKET
        || process.env.FIREBASE_STORAGE_BUCKET
        || ""
    ).trim();
    if (!runtime.project) {
        throw createAdminAiDropCoverError(
            "runtime_unavailable",
            503,
            "Vertex project configuration is missing.",
            "AI cover generation is unavailable because the Google Cloud project is not configured.",
        );
    }

    if (!storageBucketName) {
        throw createAdminAiDropCoverError(
            "runtime_unavailable",
            503,
            "Firebase Storage bucket configuration is missing.",
            "AI cover generation cannot save images until the Firebase Storage bucket is configured.",
        );
    }

    const title = input.title.trim();
    const draftSessionId = input.draftSessionId?.trim() || "";
    if (!input.dropId && draftSessionId.length === 0) {
        throw createAdminAiDropCoverError(
            "draft_session_required",
            400,
            "Unsaved drop cover generation requires a draft session id.",
            "This draft could not be identified. Close and reopen Create Drop, then try AI cover generation again.",
        );
    }

    const nowMs = Date.now();
    const estimatedCostUsd = estimateAdminAiDropCoverCostUsd(runtime.model, 1);
    const jobRef = adminDb.collection(ADMIN_AI_DROP_COVER_JOBS_COLLECTION).doc();
    let previousJob: FirebaseFirestore.DocumentSnapshot | null = null;
    try {
        previousJob = input.previousJobId
            ? await adminDb.collection(ADMIN_AI_DROP_COVER_JOBS_COLLECTION).doc(input.previousJobId).get()
            : null;
    } catch (error) {
        throw classifyDatabaseError(
            error,
            error instanceof Error ? error.message : "Failed to load the previous AI cover job.",
            "AI cover generation could not load the previous generation history. Try again.",
        );
    }
    const previousJobRecord = previousJob?.exists
        ? normalizeJobRecord(previousJob.id, previousJob.data())
        : null;
    const chainId = previousJobRecord?.chainId || previousJobRecord?.id || jobRef.id;
    const chainDepth = previousJobRecord ? (previousJobRecord.chainDepth || 0) + 1 : 0;
    const promptInput: AdminAiDropCoverPromptInput = {
        title,
        creatorId: input.creatorId,
        creatorName: input.creatorName,
        dropType: input.dropType,
        tags: input.tags,
    };
    const recipe = buildAdminAiDropCoverConsistencyRecipe(promptInput);
    const referenceContext = await buildReferenceContext(settings, recipe, input.dropId);
    const prompt = buildAdminAiDropCoverPrompt(promptInput, {
        referenceGuided: referenceContext.generationMode === "reference_guided",
        recipe,
    });
    const recipeLabel = getAdminAiDropCoverRecipeLabel(recipe);

    try {
        await jobRef.set({
            title,
            creatorName: input.creatorName || null,
            creatorId: input.creatorId || null,
            dropId: input.dropId || null,
            draftSessionId: draftSessionId || null,
            model: runtime.model,
            location: runtime.location,
            generationMode: referenceContext.generationMode,
            promptVersion: ADMIN_AI_DROP_COVER_PROMPT_VERSION,
            recipeLabel,
            consistencyRecipe: recipe,
            status: "running",
            feedback: "neutral",
            accepted: false,
            requestedAtMs: nowMs,
            estimatedCostUsd: 0,
            billed: false,
            previousJobId: previousJobRecord?.id || null,
            chainId,
            chainDepth,
            referenceImageCount: referenceContext.referenceImages.length,
            templateReferenceUsed: referenceContext.templateReferenceUsed,
            catalogDropReferenceCount: referenceContext.catalogDropReferenceCount,
            recentDropReferenceCount: referenceContext.recentDropReferenceCount,
            retainedAiReferenceCount: referenceContext.retainedAiReferenceCount,
            retainedAcceptedAiReferenceCount: referenceContext.retainedAcceptedAiReferenceCount,
            retainedLikedAiReferenceCount: referenceContext.retainedLikedAiReferenceCount,
            referenceAssets: referenceContext.referenceAssets,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            updatedAtMs: nowMs,
        });
    } catch (error) {
        throw classifyDatabaseError(
            error,
            error instanceof Error ? error.message : "Failed to create the AI cover job record.",
            "AI cover generation could not record its job history. Check Firebase admin database access and try again.",
        );
    }
    await applySummaryDelta({
        generationCount: 1,
        regeneratedCount: previousJobRecord ? 1 : 0,
    });

    const startedAtMs = Date.now();
    let billed = false;
    let latencyMs = 0;

    try {
        let accessToken = "";
        try {
            accessToken = await getVertexAccessToken(runtime.project);
        } catch (error) {
            throw classifyProviderError(error, runtime, "auth");
        }

        let generated: GenerateVertexImageResult;
        try {
            generated = await generateVertexImage({
                accessToken,
                prompt,
                runtime,
                aspectRatio: settings.aspectRatio,
                outputMimeType: settings.outputMimeType,
                referenceImages: referenceContext.referenceImages,
            });
        } catch (error) {
            throw classifyProviderError(error, runtime, "predict");
        }
        billed = true;
        latencyMs = Date.now() - startedAtMs;

        const { fileName, storagePath } = createStoragePath(jobRef.id, title);
        const bucket = adminStorage.bucket(storageBucketName);
        const storageFile = bucket.file(storagePath);
        let imageUrl = "";
        try {
            await storageFile.save(generated.bytes, {
                resumable: false,
                contentType: generated.mimeType || ADMIN_AI_DROP_COVER_OUTPUT_MIME_TYPE,
                metadata: {
                    cacheControl: "public,max-age=31536000,immutable",
                    metadata: {
                        aiOrigin: "vertex_gemini_image",
                        aiModel: runtime.model,
                        aiPromptVersion: ADMIN_AI_DROP_COVER_PROMPT_VERSION,
                        aiJobId: jobRef.id,
                    },
                },
            });

            const metadataResult = await storageFile.getMetadata();
            const metadata = (Array.isArray(metadataResult) ? metadataResult[0] : metadataResult) as unknown as StorageObjectMetadata;
            imageUrl = await ensureFirebaseDownloadUrl(bucket, storageFile, metadata);
        } catch (error) {
            throw classifyStorageError(
                error,
                error instanceof Error ? error.message : "Failed to save the generated cover image.",
                "The cover image was generated but could not be saved to storage. Check Firebase Storage configuration and try again.",
            );
        }
        const completedAtMs = Date.now();

        try {
            await jobRef.set({
                status: "succeeded",
                completedAtMs,
                latencyMs,
                billed: true,
                estimatedCostUsd,
                imageUrl,
                storagePath,
                mimeType: generated.mimeType || ADMIN_AI_DROP_COVER_OUTPUT_MIME_TYPE,
                fileName,
                errorMessage: null,
                updatedAt: FieldValue.serverTimestamp(),
                updatedAtMs: completedAtMs,
            }, { merge: true });
        } catch (error) {
            throw classifyDatabaseError(
                error,
                error instanceof Error ? error.message : "Failed to update the completed AI cover job.",
                "The cover image was generated, but the job record could not be finalized. Check Firebase admin database access and try again.",
            );
        }

        await applySummaryDelta({
            successfulGenerationCount: 1,
            totalEstimatedCostUsd: estimatedCostUsd,
            totalLatencyMs: latencyMs,
            latencySampleCount: 1,
            lastSuccessAtMs: completedAtMs,
        });

        await recordServerDiagnostic({
            channel: "ai",
            severity: "info",
            message: "Admin AI drop cover generated",
            detail: {
                jobId: jobRef.id,
                dropId: input.dropId || "",
                model: runtime.model,
                generationMode: referenceContext.generationMode,
                recipeFamily: recipe.family,
                recipeFocusTerms: recipe.focusTerms,
                promptVersion: ADMIN_AI_DROP_COVER_PROMPT_VERSION,
                latencyMs,
                estimatedCostUsd,
                referenceImageCount: referenceContext.referenceImages.length,
                retainedAiReferenceCount: referenceContext.retainedAiReferenceCount,
                retainedAcceptedAiReferenceCount: referenceContext.retainedAcceptedAiReferenceCount,
                retainedLikedAiReferenceCount: referenceContext.retainedLikedAiReferenceCount,
            },
        });

        void trackServerEvent("admin_ai_cover_generate_succeeded", {
            ai_feature: "drop_cover_generation",
            ai_job_id: jobRef.id,
            ai_model: runtime.model,
            ai_generation_mode: referenceContext.generationMode,
            ai_recipe_family: recipe.family,
            ai_prompt_version: ADMIN_AI_DROP_COVER_PROMPT_VERSION,
            drop_id: input.dropId || "",
            draft_session_id: draftSessionId,
            latency_ms: latencyMs,
            estimated_cost_usd: estimatedCostUsd,
            regenerated_from_job_id: previousJobRecord?.id || "",
            ai_reference_image_count: referenceContext.referenceImages.length,
            ai_retained_reference_count: referenceContext.retainedAiReferenceCount,
        }, input.requestedByUid);

        let finalizedSnapshotData: Record<string, unknown> = {};
        try {
            finalizedSnapshotData = ((await jobRef.get()).data() || {}) as Record<string, unknown>;
        } catch (error) {
            recordRouteWarning("admin/ai/drop-covers/generate", "Failed to re-read completed AI cover job", error, {
                channel: "ai",
                detail: {
                    jobId: jobRef.id,
                },
            });
        }

        return normalizeJobRecord(jobRef.id, {
            ...finalizedSnapshotData,
            imageUrl,
            storagePath,
            mimeType: generated.mimeType || ADMIN_AI_DROP_COVER_OUTPUT_MIME_TYPE,
            fileName,
            status: "succeeded",
            billed: true,
            estimatedCostUsd,
            latencyMs,
            completedAtMs,
            draftSessionId: draftSessionId || null,
            generationMode: referenceContext.generationMode,
            recipeLabel,
            consistencyRecipe: recipe,
            referenceImageCount: referenceContext.referenceImages.length,
            templateReferenceUsed: referenceContext.templateReferenceUsed,
            catalogDropReferenceCount: referenceContext.catalogDropReferenceCount,
            recentDropReferenceCount: referenceContext.recentDropReferenceCount,
            retainedAiReferenceCount: referenceContext.retainedAiReferenceCount,
            retainedAcceptedAiReferenceCount: referenceContext.retainedAcceptedAiReferenceCount,
            retainedLikedAiReferenceCount: referenceContext.retainedLikedAiReferenceCount,
            referenceAssets: referenceContext.referenceAssets,
        });
    } catch (error) {
        const classifiedError = error instanceof AdminAiDropCoverError
            ? error
            : createAdminAiDropCoverError(
                "runtime_unavailable",
                503,
                error instanceof Error ? error.message : String(error),
                "AI cover generation is unavailable right now.",
            );
        const failedAtMs = Date.now();
        latencyMs = latencyMs || (failedAtMs - startedAtMs);
        const errorMessage = classifiedError.message;

        try {
            await jobRef.set({
                status: "failed",
                completedAtMs: failedAtMs,
                latencyMs,
                billed,
                estimatedCostUsd: billed ? estimatedCostUsd : 0,
                errorMessage,
                updatedAt: FieldValue.serverTimestamp(),
                updatedAtMs: failedAtMs,
            }, { merge: true });
        } catch (persistError) {
            recordRouteWarning("admin/ai/drop-covers/generate", "Failed to persist AI drop cover failure state", persistError, {
                channel: "ai",
                detail: {
                    jobId: jobRef.id,
                    failureCode: classifiedError.code,
                },
            });
        }

        await applySummaryDelta({
            failedGenerationCount: 1,
            totalEstimatedCostUsd: billed ? estimatedCostUsd : 0,
            lastFailureAtMs: failedAtMs,
        });

        recordRouteWarning("admin/ai/drop-covers/generate", "Admin AI drop cover generation failed", error, {
            channel: "ai",
            detail: {
                jobId: jobRef.id,
                dropId: input.dropId || "",
                draftSessionId,
                model: runtime.model,
                generationMode: referenceContext.generationMode,
                recipeFamily: recipe.family,
                promptVersion: ADMIN_AI_DROP_COVER_PROMPT_VERSION,
                failureCode: classifiedError.code,
                billed,
                latencyMs,
                referenceImageCount: referenceContext.referenceImages.length,
                retainedAiReferenceCount: referenceContext.retainedAiReferenceCount,
            },
        });

        void trackServerEvent("admin_ai_cover_generate_failed", {
            ai_feature: "drop_cover_generation",
            ai_job_id: jobRef.id,
            ai_model: runtime.model,
            ai_generation_mode: referenceContext.generationMode,
            ai_recipe_family: recipe.family,
            ai_prompt_version: ADMIN_AI_DROP_COVER_PROMPT_VERSION,
            drop_id: input.dropId || "",
            draft_session_id: draftSessionId,
            latency_ms: latencyMs,
            estimated_cost_usd: billed ? estimatedCostUsd : 0,
            billed,
            failure_reason: errorMessage.slice(0, 120),
            failure_code: classifiedError.code,
            ai_reference_image_count: referenceContext.referenceImages.length,
            ai_retained_reference_count: referenceContext.retainedAiReferenceCount,
        }, input.requestedByUid);

        throw classifiedError;
    }
}

export async function updateAdminAiDropCoverFeedback(input: AdminAiDropCoverFeedbackInput) {
    if (!adminDb) {
        throw new Error("AI cover feedback requires Firebase Admin runtime access.");
    }

    const jobRef = adminDb.collection(ADMIN_AI_DROP_COVER_JOBS_COLLECTION).doc(input.jobId);
    const snapshot = await jobRef.get();
    if (!snapshot.exists) {
        throw new Error("Generation job not found.");
    }

    const existing = normalizeJobRecord(snapshot.id, snapshot.data());
    if (existing.status === "running") {
        throw new Error("Generation is still in progress.");
    }

    const nowMs = Date.now();
    const updates: Record<string, unknown> = {
        updatedAt: FieldValue.serverTimestamp(),
        updatedAtMs: nowMs,
    };
    const summaryDelta: SummaryDelta = {};

    if (input.action === "like") {
        if (existing.feedback !== "liked") {
            updates.feedback = "liked";
            if (existing.feedback === "disliked") {
                summaryDelta.dislikedCount = -1;
            }
            summaryDelta.likedCount = 1;
        }
    } else if (input.action === "dislike") {
        if (existing.feedback !== "disliked") {
            updates.feedback = "disliked";
            if (existing.feedback === "liked") {
                summaryDelta.likedCount = -1;
            }
            summaryDelta.dislikedCount = 1;
        }
    } else if (input.action === "accept") {
        if (!existing.accepted) {
            summaryDelta.acceptedCount = 1;
        }
        updates.accepted = true;
        updates.acceptedAtMs = existing.acceptedAtMs || nowMs;
        if (input.dropId) {
            updates.acceptedForDropId = input.dropId;
        }
    } else if (input.action === "link_drop") {
        if (!input.dropId) {
            throw new Error("A dropId is required to link the selected cover.");
        }
        if (!existing.accepted) {
            summaryDelta.acceptedCount = 1;
            updates.accepted = true;
            updates.acceptedAtMs = nowMs;
        }
        updates.acceptedForDropId = input.dropId;
    }

    await jobRef.set(updates, { merge: true });

    const hasSummaryDelta = Object.values(summaryDelta).some((value) => typeof value === "number" && value !== 0);
    if (hasSummaryDelta) {
        await applySummaryDelta(summaryDelta);
    }

    const shouldTrackAccepted = input.action === "accept" || (input.action === "link_drop" && !existing.accepted);
    const eventName = input.action === "like"
        ? "admin_ai_cover_generation_liked"
        : input.action === "dislike"
            ? "admin_ai_cover_generation_disliked"
            : shouldTrackAccepted
                ? "admin_ai_cover_generation_accepted"
                : null;

    if (eventName) {
        void trackServerEvent(eventName, {
            ai_feature: "drop_cover_generation",
            ai_job_id: input.jobId,
            ai_model: existing.model,
            ai_prompt_version: existing.promptVersion,
            drop_id: input.dropId || existing.dropId || existing.acceptedForDropId || "",
        }, input.actorUid);
    }

    const nextSnapshot = await jobRef.get();
    return normalizeJobRecord(nextSnapshot.id, nextSnapshot.data());
}
