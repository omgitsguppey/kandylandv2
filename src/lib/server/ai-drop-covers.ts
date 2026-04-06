import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { GoogleAuth } from "google-auth-library";

import {
    type AdminAiDropCoverErrorCode,
    ADMIN_AI_DROP_COVER_JOBS_COLLECTION,
    ADMIN_AI_DROP_COVER_MODEL,
    ADMIN_AI_DROP_COVER_OUTPUT_MIME_TYPE,
    ADMIN_AI_DROP_COVER_PROMPT_VERSION,
    ADMIN_AI_DROP_COVER_SETTINGS_DOC,
    ADMIN_AI_DROP_COVER_SUMMARY_COLLECTION,
    ADMIN_AI_DROP_COVER_SUMMARY_DOC,
    adminAiDropCoverJobSchema,
    adminAiDropCoverRuntimeSchema,
    adminAiDropCoverSettingsSchema,
    adminAiDropCoverSummarySchema,
    buildAdminAiDropCoverPrompt,
    estimateAdminAiDropCoverCostUsd,
    formatAdminAiUsd,
    getAdminAiDropCoverPricePerGenerationUsd,
    getAdminAiDropCoverRecipeLabel,
    getDefaultAdminAiDropCoverSettings,
    type AdminAiDropCoverFeedbackAction,
    type AdminAiDropCoverJobRecord,
    type AdminAiDropCoverJobStatus,
    type AdminAiDropCoverPromptInput,
    type AdminAiDropCoverSettings,
    type AdminAiDropCoverSummaryRecord,
} from "@/lib/ai-drop-covers";
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

const DEFAULT_VERTEX_LOCATION = "us-central1";
const VERTEX_SCOPE = "https://www.googleapis.com/auth/cloud-platform";
const DEFAULT_TIMEOUT_MS = 20_000;
const RECENT_JOB_LIMIT = 18;

type AdminAiDropCoverRuntime = {
    project: string;
    location: string;
    model: string;
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

type VertexImagePrediction = {
    bytesBase64Encoded?: string;
    mimeType?: string;
    prompt?: string;
};

type GenerateVertexImageInput = {
    accessToken: string;
    prompt: string;
    runtime: AdminAiDropCoverRuntime;
    aspectRatio: string;
    outputMimeType: string;
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

function summarizeAiAvailabilityIssue(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const normalized = message.toLowerCase();

    if (
        normalized.includes("application default credentials")
        || normalized.includes("could not load the default credentials")
        || normalized.includes("default credentials")
        || normalized.includes("login required")
        || normalized.includes("unauthenticated")
        || normalized.includes("permission_denied")
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

function classifyProviderError(error: unknown) {
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

    return createAdminAiDropCoverError(
        "provider_unavailable",
        503,
        message,
        summarizeAiAvailabilityIssue(error),
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

function normalizeSettings(raw: unknown): AdminAiDropCoverSettings {
    const defaults = getDefaultAdminAiDropCoverSettings();
    if (!raw || typeof raw !== "object") {
        return defaults;
    }

    const data = raw as Record<string, unknown>;
    return adminAiDropCoverSettingsSchema.parse({
        ...defaults,
        enabled: typeof data.enabled === "boolean" ? data.enabled : defaults.enabled,
        model: getString(data.model) || defaults.model,
        location: getString(data.location) || defaults.location,
        aspectRatio: "1:1",
        outputMimeType: getString(data.outputMimeType) || defaults.outputMimeType,
        pricePerGenerationUsd: typeof data.pricePerGenerationUsd === "number"
            ? data.pricePerGenerationUsd
            : getAdminAiDropCoverPricePerGenerationUsd(getString(data.model) || defaults.model),
        priceBasis: getString(data.priceBasis) || defaults.priceBasis,
        priceSourceUrl: getString(data.priceSourceUrl) || defaults.priceSourceUrl,
        updatedAtMs: typeof data.updatedAtMs === "number" ? data.updatedAtMs : undefined,
        updatedByUid: getString(data.updatedByUid) || undefined,
        updatedByEmail: typeof data.updatedByEmail === "string" ? data.updatedByEmail : undefined,
    });
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
    return adminAiDropCoverJobSchema.parse({
        id,
        title: getString(data.title) || "Untitled Drop",
        creatorName: typeof data.creatorName === "string" ? data.creatorName : null,
        dropId: typeof data.dropId === "string" ? data.dropId : null,
        draftSessionId: typeof data.draftSessionId === "string" ? data.draftSessionId : null,
        model: getString(data.model) || ADMIN_AI_DROP_COVER_MODEL,
        location: getString(data.location) || DEFAULT_VERTEX_LOCATION,
        promptVersion: getString(data.promptVersion) || ADMIN_AI_DROP_COVER_PROMPT_VERSION,
        recipeLabel: getString(data.recipeLabel) || getAdminAiDropCoverRecipeLabel(),
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

async function generateVertexImage(input: GenerateVertexImageInput): Promise<GenerateVertexImageResult> {
    const response = await withTimeout(fetch(
        `https://${input.runtime.location}-aiplatform.googleapis.com/v1/projects/${input.runtime.project}/locations/${input.runtime.location}/publishers/google/models/${input.runtime.model}:predict`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${input.accessToken}`,
                "Content-Type": "application/json; charset=utf-8",
            },
            body: JSON.stringify({
                instances: [
                    {
                        prompt: input.prompt,
                    },
                ],
                parameters: {
                    sampleCount: 1,
                    aspectRatio: input.aspectRatio,
                    enhancePrompt: true,
                    includeRaiReason: true,
                    outputOptions: {
                        mimeType: input.outputMimeType,
                    },
                    personGeneration: "allow_adult",
                    safetySetting: "block_medium_and_above",
                },
            }),
        },
    ).then(async (result) => {
        const json = await result.json().catch(() => null) as { predictions?: VertexImagePrediction[]; error?: { message?: string } } | null;
        if (!result.ok) {
            throw new Error(json?.error?.message || `Vertex image generation failed with status ${result.status}`);
        }
        return json;
    }), input.timeoutMs ?? DEFAULT_TIMEOUT_MS);

    const prediction = Array.isArray(response?.predictions) ? response.predictions[0] : null;
    if (!prediction?.bytesBase64Encoded) {
        throw new Error("Vertex image generation returned no image bytes.");
    }

    return {
        bytes: Buffer.from(prediction.bytesBase64Encoded, "base64"),
        mimeType: prediction.mimeType || ADMIN_AI_DROP_COVER_OUTPUT_MIME_TYPE,
        enhancedPrompt: prediction.prompt,
    };
}

export function resolveAdminAiDropCoverRuntime(settings?: Partial<AdminAiDropCoverSettings>): AdminAiDropCoverRuntime {
    const normalizedSettings = normalizeSettings(settings);
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
        location: (
            normalizedSettings.location
            || process.env.VERTEX_AI_LOCATION
            || process.env.GOOGLE_CLOUD_LOCATION
            || process.env.GCLOUD_LOCATION
            || DEFAULT_VERTEX_LOCATION
        ).trim() || DEFAULT_VERTEX_LOCATION,
        model: normalizedSettings.model || ADMIN_AI_DROP_COVER_MODEL,
    };
}

export async function getAdminAiDropCoverSettings() {
    if (!adminDb) {
        return getDefaultAdminAiDropCoverSettings();
    }

    const snapshot = await adminDb.collection("adminSettings").doc(ADMIN_AI_DROP_COVER_SETTINGS_DOC).get();
    return normalizeSettings(snapshot.exists ? snapshot.data() : null);
}

export async function saveAdminAiDropCoverSettings(input: {
    enabled: boolean;
    actorUid: string;
    actorEmail?: string | undefined;
}) {
    const existing = await getAdminAiDropCoverSettings();
    const nextSettings = normalizeSettings({
        ...existing,
        enabled: input.enabled,
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
        message: `Admin AI drop covers ${nextSettings.enabled ? "enabled" : "disabled"}`,
        detail: {
            actorUid: input.actorUid,
            actorEmail: input.actorEmail || "",
            model: nextSettings.model,
            location: nextSettings.location,
        },
    });

    void trackServerEvent("admin_ai_cover_toggle_updated", {
        ai_feature: "drop_cover_generation",
        ai_enabled: nextSettings.enabled,
        ai_model: nextSettings.model,
        ai_location: nextSettings.location,
    }, input.actorUid);

    return nextSettings;
}

export async function getAdminAiDropCoverRuntimeStatus() {
    const settings = await getAdminAiDropCoverSettings();
    const runtime = resolveAdminAiDropCoverRuntime(settings);
    const configuredStorageBucket = (
        adminStorage?.app?.options?.storageBucket
        || FIREBASE_STORAGE_BUCKET
        || process.env.FIREBASE_STORAGE_BUCKET
        || ""
    ).trim();

    if (!settings.enabled) {
        return adminAiDropCoverRuntimeSchema.parse({
            enabled: false,
            status: "disabled",
            note: "AI cover generation is turned off from the Admin AI page.",
            project: runtime.project,
            location: runtime.location,
            model: runtime.model,
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
            pricePerGenerationUsd: settings.pricePerGenerationUsd,
            priceBasis: settings.priceBasis,
            priceSourceUrl: settings.priceSourceUrl,
        });
    }

    try {
        await getVertexAccessToken(runtime.project);
        return adminAiDropCoverRuntimeSchema.parse({
            enabled: true,
            status: "ready",
            note: `Vertex image generation is ready. Estimated cost is ${formatAdminAiUsd(settings.pricePerGenerationUsd)} per image based on the current Google Cloud pricing page.`,
            project: runtime.project,
            location: runtime.location,
            model: runtime.model,
            pricePerGenerationUsd: settings.pricePerGenerationUsd,
            priceBasis: settings.priceBasis,
            priceSourceUrl: settings.priceSourceUrl,
        });
    } catch (error) {
        return adminAiDropCoverRuntimeSchema.parse({
            enabled: true,
            status: "auth_missing",
            note: summarizeAiAvailabilityIssue(error),
            project: runtime.project,
            location: runtime.location,
            model: runtime.model,
            pricePerGenerationUsd: settings.pricePerGenerationUsd,
            priceBasis: settings.priceBasis,
            priceSourceUrl: settings.priceSourceUrl,
        });
    }
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

export async function buildAdminAiDropCoverDashboard() {
    const [settings, runtime, recentJobs, summarySnapshot, activeJobsSnapshot] = await Promise.all([
        getAdminAiDropCoverSettings(),
        getAdminAiDropCoverRuntimeStatus(),
        listRecentAdminAiDropCoverJobs(),
        adminDb
            ? adminDb.collection(ADMIN_AI_DROP_COVER_SUMMARY_COLLECTION).doc(ADMIN_AI_DROP_COVER_SUMMARY_DOC).get()
            : Promise.resolve(null),
        adminDb
            ? adminDb.collection(ADMIN_AI_DROP_COVER_JOBS_COLLECTION).where("status", "==", "running").get()
            : Promise.resolve(null),
    ]);

    const summary = normalizeSummary(summarySnapshot?.exists ? summarySnapshot.data() : null);
    const averageLatencyMs = summary.latencySampleCount > 0
        ? Math.round(summary.totalLatencyMs / summary.latencySampleCount)
        : 0;
    const activeGenerationCount = activeJobsSnapshot?.size ?? recentJobs.filter((job) => job.status === "running").length;

    return adminAiDropCoverSummarySchema.parse({
        settings,
        runtime,
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
        },
        recentJobs,
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

    const runtime = resolveAdminAiDropCoverRuntime(settings);
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
        creatorName: input.creatorName,
        dropType: input.dropType,
        tags: input.tags,
    };
    const prompt = buildAdminAiDropCoverPrompt(promptInput);

    try {
        await jobRef.set({
            title,
            creatorName: input.creatorName || null,
            creatorId: input.creatorId || null,
            dropId: input.dropId || null,
            draftSessionId: draftSessionId || null,
            model: runtime.model,
            location: runtime.location,
            promptVersion: ADMIN_AI_DROP_COVER_PROMPT_VERSION,
            recipeLabel: getAdminAiDropCoverRecipeLabel(),
            status: "running",
            feedback: "neutral",
            accepted: false,
            requestedAtMs: nowMs,
            estimatedCostUsd: 0,
            billed: false,
            previousJobId: previousJobRecord?.id || null,
            chainId,
            chainDepth,
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
            throw classifyProviderError(error);
        }

        let generated: GenerateVertexImageResult;
        try {
            generated = await generateVertexImage({
                accessToken,
                prompt,
                runtime,
                aspectRatio: settings.aspectRatio,
                outputMimeType: settings.outputMimeType,
            });
        } catch (error) {
            throw classifyProviderError(error);
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
                        aiOrigin: "vertex_imagen",
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
                promptVersion: ADMIN_AI_DROP_COVER_PROMPT_VERSION,
                latencyMs,
                estimatedCostUsd,
            },
        });

        void trackServerEvent("admin_ai_cover_generate_succeeded", {
            ai_feature: "drop_cover_generation",
            ai_job_id: jobRef.id,
            ai_model: runtime.model,
            ai_prompt_version: ADMIN_AI_DROP_COVER_PROMPT_VERSION,
            drop_id: input.dropId || "",
            draft_session_id: draftSessionId,
            latency_ms: latencyMs,
            estimated_cost_usd: estimatedCostUsd,
            regenerated_from_job_id: previousJobRecord?.id || "",
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
                promptVersion: ADMIN_AI_DROP_COVER_PROMPT_VERSION,
                failureCode: classifiedError.code,
                billed,
                latencyMs,
            },
        });

        void trackServerEvent("admin_ai_cover_generate_failed", {
            ai_feature: "drop_cover_generation",
            ai_job_id: jobRef.id,
            ai_model: runtime.model,
            ai_prompt_version: ADMIN_AI_DROP_COVER_PROMPT_VERSION,
            drop_id: input.dropId || "",
            draft_session_id: draftSessionId,
            latency_ms: latencyMs,
            estimated_cost_usd: billed ? estimatedCostUsd : 0,
            billed,
            failure_reason: errorMessage.slice(0, 120),
            failure_code: classifiedError.code,
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
