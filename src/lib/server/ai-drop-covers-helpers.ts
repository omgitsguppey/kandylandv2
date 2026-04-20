import {
    type AdminAiDropCoverErrorCode,
    ADMIN_AI_DROP_COVER_DEFAULT_LOCATION,
    ADMIN_AI_DROP_COVER_MODEL,
    ADMIN_AI_DROP_COVER_OPTIMIZER_MODEL,
    ADMIN_AI_DROP_COVER_PROMPT_VERSION,
    adminAiDropCoverConsistencyRecipeSchema,
    adminAiDropCoverJobSchema,
    adminAiDropCoverPromptPolicyHistoryEntrySchema,
    adminAiDropCoverPromptPolicyPerformanceSchema,
    adminAiDropCoverPromptPolicySchema,
    adminAiDropCoverReferenceAssetSchema,
    adminAiDropCoverSettingsSchema,
    getAdminAiDropCoverGenerationMode,
    getAdminAiDropCoverPriceBasis,
    getAdminAiDropCoverPricePerGenerationUsd,
    getAdminAiDropCoverRecipeLabel,
    getDefaultAdminAiDropCoverPromptPolicy,
    getDefaultAdminAiDropCoverSettings,
    normalizeAdminAiDropCoverLocation,
    normalizeAdminAiDropCoverModel,
    type AdminAiDropCoverGenerationMode,
    type AdminAiDropCoverJobRecord,
    type AdminAiDropCoverJobStatus,
    type AdminAiDropCoverPromptPolicy,
    type AdminAiDropCoverPromptPolicyHistoryEntry,
    type AdminAiDropCoverReferenceAsset,
    type AdminAiDropCoverSettings,
    type AdminAiDropCoverSummaryRecord,
} from "@/lib/ai-drop-covers";
import { sanitizeStorageFileName } from "@/lib/server/storage-assets";

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

export function summarizeAiAvailabilityIssue(
    error: unknown,
    runtime?: Pick<{ model: string; location: string }, "model" | "location">,
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
        return "The Vertex image request ended before the cover finished rendering.";
    }

    return "Vertex image generation is unavailable right now.";
}

export function toNumber(value: unknown, fallback = 0) {
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function createAdminAiDropCoverError(
    code: AdminAiDropCoverErrorCode,
    status: number,
    message: string,
    clientMessage = message,
) {
    return new AdminAiDropCoverError(code, status, message, clientMessage);
}

export function classifyProviderError(
    error: unknown,
    runtime?: Pick<{ model: string; location: string }, "model" | "location">,
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

export function classifyDatabaseError(error: unknown, message: string, clientMessage: string) {
    return createAdminAiDropCoverError("database_failed", 503, message, clientMessage);
}

export function classifyStorageError(error: unknown, message: string, clientMessage: string) {
    return createAdminAiDropCoverError("storage_failed", 503, message, clientMessage);
}

export function getString(value: unknown) {
    return typeof value === "string" ? value : "";
}

export function formatIsoTimestamp(timestamp?: number | null) {
    return typeof timestamp === "number" && Number.isFinite(timestamp) && timestamp > 0
        ? new Date(timestamp).toISOString()
        : "not recorded";
}

export function buildAiDiagnosticSummary(detail: Record<string, unknown>) {
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

export function getGenerationModeDefaults(_generationMode: AdminAiDropCoverGenerationMode) {
    return {
        model: ADMIN_AI_DROP_COVER_MODEL,
        location: ADMIN_AI_DROP_COVER_DEFAULT_LOCATION,
        pricePerGenerationUsd: getAdminAiDropCoverPricePerGenerationUsd(ADMIN_AI_DROP_COVER_MODEL),
        priceBasis: getAdminAiDropCoverPriceBasis(ADMIN_AI_DROP_COVER_MODEL),
    };
}

export function normalizeSettings(raw: unknown): AdminAiDropCoverSettings {
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
        optimizerModel: getString(data.optimizerModel) === ADMIN_AI_DROP_COVER_OPTIMIZER_MODEL
            ? ADMIN_AI_DROP_COVER_OPTIMIZER_MODEL
            : defaults.optimizerModel,
        optimizerEnabled: typeof data.optimizerEnabled === "boolean"
            ? data.optimizerEnabled
            : defaults.optimizerEnabled,
        aspectRatio: "1:1",
        outputMimeType: getString(data.outputMimeType) || defaults.outputMimeType,
        useTemplateReference,
        useRecentDropCoverReferences,
        templateReferenceUrl: getString(data.templateReferenceUrl) || null,
        templateReferenceStoragePath: getString(data.templateReferenceStoragePath) || null,
        templateReferenceFileName: getString(data.templateReferenceFileName) || null,
        primaryStyleReferenceId: getString(data.primaryStyleReferenceId) || null,
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

export function settingsRequireCanonicalMigration(raw: unknown, normalized: AdminAiDropCoverSettings) {
    if (!raw || typeof raw !== "object") {
        return false;
    }

    const data = raw as Record<string, unknown>;
    return (
        (data.useTemplateReference === true) !== normalized.useTemplateReference
        || (data.useRecentDropCoverReferences === true) !== normalized.useRecentDropCoverReferences
        || getString(data.optimizerModel) !== normalized.optimizerModel
        || (data.optimizerEnabled === true) !== normalized.optimizerEnabled
        || getString(data.templateReferenceUrl) !== (normalized.templateReferenceUrl || "")
        || getString(data.templateReferenceStoragePath) !== (normalized.templateReferenceStoragePath || "")
        || getString(data.templateReferenceFileName) !== (normalized.templateReferenceFileName || "")
        || getString(data.primaryStyleReferenceId) !== (normalized.primaryStyleReferenceId || "")
        || getString(data.generationMode) !== normalized.generationMode
        || getString(data.model) !== normalized.model
        || getString(data.location) !== normalized.location
        || getString(data.priceBasis) !== normalized.priceBasis
        || getString(data.priceSourceUrl) !== normalized.priceSourceUrl
        || toNumber(data.pricePerGenerationUsd, NaN) !== normalized.pricePerGenerationUsd
    );
}

export function normalizePromptPolicy(raw: unknown): AdminAiDropCoverPromptPolicy {
    const defaults = getDefaultAdminAiDropCoverPromptPolicy();
    if (!raw || typeof raw !== "object") {
        return defaults;
    }

    const data = raw as Record<string, unknown>;
    const categoryPerformance = data.categoryPerformance && typeof data.categoryPerformance === "object"
        ? Object.fromEntries(
            Object.entries(data.categoryPerformance as Record<string, unknown>)
                .filter(([key]) => key.trim().length > 0)
                .map(([key, value]) => [
                    key,
                    adminAiDropCoverPromptPolicyPerformanceSchema.parse({
                        generationCount: toNumber((value as Record<string, unknown>)?.generationCount),
                        acceptedCount: toNumber((value as Record<string, unknown>)?.acceptedCount),
                        likedCount: toNumber((value as Record<string, unknown>)?.likedCount),
                        dislikedCount: toNumber((value as Record<string, unknown>)?.dislikedCount),
                    }),
                ]),
        )
        : defaults.categoryPerformance;

    return adminAiDropCoverPromptPolicySchema.parse({
        ...defaults,
        version: Math.max(1, toNumber(data.version, defaults.version)),
        optimizerModel: ADMIN_AI_DROP_COVER_OPTIMIZER_MODEL,
        autoOptimize: typeof data.autoOptimize === "boolean" ? data.autoOptimize : defaults.autoOptimize,
        optimizerStatus: (
            data.optimizerStatus === "idle"
            || data.optimizerStatus === "running"
            || data.optimizerStatus === "ready"
            || data.optimizerStatus === "degraded"
            || data.optimizerStatus === "error"
        ) ? data.optimizerStatus : defaults.optimizerStatus,
        optimizerNote: getString(data.optimizerNote) || defaults.optimizerNote,
        optimizerProposal: getString(data.optimizerProposal) || null,
        baseStylePrompt: getString(data.baseStylePrompt) || defaults.baseStylePrompt,
        lockedClauses: Array.isArray(data.lockedClauses)
            ? data.lockedClauses.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
            : defaults.lockedClauses,
        mutableClauses: Array.isArray(data.mutableClauses)
            ? data.mutableClauses.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
            : defaults.mutableClauses,
        currentMutablePrompt: getString(data.currentMutablePrompt) || defaults.currentMutablePrompt,
        lastAcceptedPrompt: getString(data.lastAcceptedPrompt) || null,
        lastOptimizerRunAtMs: typeof data.lastOptimizerRunAtMs === "number" ? data.lastOptimizerRunAtMs : null,
        lastAcceptedAtMs: typeof data.lastAcceptedAtMs === "number" ? data.lastAcceptedAtMs : null,
        lastAutoRefinementDiff: Array.isArray(data.lastAutoRefinementDiff)
            ? data.lastAutoRefinementDiff.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
            : [],
        lastEditedAtMs: typeof data.lastEditedAtMs === "number" ? data.lastEditedAtMs : null,
        lastEditedByUid: getString(data.lastEditedByUid) || undefined,
        lastEditedByEmail: getString(data.lastEditedByEmail) || undefined,
        categoryPerformance,
    });
}

export function normalizeSummary(raw: unknown): AdminAiDropCoverSummaryRecord {
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

export function normalizePromptPolicyHistoryEntry(id: string, raw: unknown): AdminAiDropCoverPromptPolicyHistoryEntry {
    const data = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {};
    return adminAiDropCoverPromptPolicyHistoryEntrySchema.parse({
        id,
        version: Math.max(1, toNumber(data.version, 1)),
        source: data.source === "optimizer" || data.source === "manual_override" ? data.source : "default",
        action: data.action === "feedback" || data.action === "manual_edit" ? data.action : "generation",
        previousMutablePrompt: getString(data.previousMutablePrompt) || null,
        nextMutablePrompt: getString(data.nextMutablePrompt),
        diff: Array.isArray(data.diff) ? data.diff.filter((value): value is string => typeof value === "string") : [],
        createdAtMs: toNumber(data.createdAtMs),
        actorUid: getString(data.actorUid) || null,
        actorEmail: getString(data.actorEmail) || null,
        jobId: getString(data.jobId) || null,
        feedbackAction: data.feedbackAction === "like" || data.feedbackAction === "dislike" || data.feedbackAction === "accept" || data.feedbackAction === "link_drop"
            ? data.feedbackAction
            : null,
    });
}

export function normalizeLibraryAsset(id: string, raw: unknown) {
    const data = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {};
    return {
        ...adminAiDropCoverReferenceAssetSchema.parse({
            id,
            source: "house_reference",
            imageUrl: getString(data.imageUrl),
            fileName: getString(data.fileName) || null,
            storagePath: getString(data.storagePath) || null,
            dropId: null,
            title: getString(data.title) || getString(data.fileName) || "House reference",
            creatorId: null,
            creatorName: null,
            retentionReason: data.pinned === true ? "pinned" : "manual",
            primary: data.primary === true,
            pinned: data.pinned === true,
            reusable: data.reusable !== false,
            active: data.active !== false,
        }),
        uploadedAtMs: typeof data.uploadedAtMs === "number" ? data.uploadedAtMs : null,
        updatedAtMs: typeof data.updatedAtMs === "number" ? data.updatedAtMs : null,
    };
}

export function normalizeJobRecord(id: string, raw: unknown): AdminAiDropCoverJobRecord {
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
        location: getString(data.location) || ADMIN_AI_DROP_COVER_DEFAULT_LOCATION,
        generationMode: data.generationMode === "reference_guided" ? "reference_guided" : "standard",
        promptVersion: getString(data.promptVersion) || ADMIN_AI_DROP_COVER_PROMPT_VERSION,
        promptEditSource: data.promptEditSource === "optimizer" || data.promptEditSource === "manual_override" ? data.promptEditSource : "default",
        promptPolicyVersion: toNumber(data.promptPolicyVersion),
        workingPrompt: typeof data.workingPrompt === "string" ? data.workingPrompt : null,
        optimizerAdjustedPrompt: typeof data.optimizerAdjustedPrompt === "string" ? data.optimizerAdjustedPrompt : null,
        providerEnhancedPrompt: typeof data.providerEnhancedPrompt === "string" ? data.providerEnhancedPrompt : null,
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
        referenceRequestCount: toNumber(data.referenceRequestCount),
        referenceTruncated: data.referenceTruncated === true,
        overAnchoringRisk: data.overAnchoringRisk === "medium" || data.overAnchoringRisk === "high" ? data.overAnchoringRisk : "low",
        validationWarnings: Array.isArray(data.validationWarnings)
            ? data.validationWarnings.filter((warning): warning is string => typeof warning === "string" && warning.trim().length > 0)
            : [],
        manualReuseApproved: data.manualReuseApproved === true,
        acceptedAtMs: typeof data.acceptedAtMs === "number" ? data.acceptedAtMs : null,
        acceptedForDropId: typeof data.acceptedForDropId === "string" ? data.acceptedForDropId : null,
        errorMessage: typeof data.errorMessage === "string" ? data.errorMessage : null,
    });
}

export function createStoragePath(jobId: string, title: string) {
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

export function createTemplateReferenceStoragePath(fileName: string) {
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

export function normalizeReferenceAsset(raw: AdminAiDropCoverReferenceAsset) {
    return adminAiDropCoverReferenceAssetSchema.parse({
        ...raw,
        source: raw.source === "recent_drop_cover" ? "catalog_drop_cover" : raw.source,
    });
}
