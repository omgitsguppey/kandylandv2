import "server-only";

import { VertexAI } from "@google-cloud/vertexai";

import {
    ADMIN_AI_DROP_DESCRIPTION_DEFAULT_LOCATION,
    ADMIN_AI_DROP_DESCRIPTION_JOBS_COLLECTION,
    ADMIN_AI_DROP_DESCRIPTION_PRICE_SOURCE_URL,
    ADMIN_AI_DROP_DESCRIPTION_PROMPT_POLICY_DOC,
    ADMIN_AI_DROP_DESCRIPTION_PROMPT_POLICY_HISTORY_COLLECTION,
    ADMIN_AI_DROP_DESCRIPTION_PROMPT_VERSION,
    ADMIN_AI_DROP_DESCRIPTION_SETTINGS_DOC,
    ADMIN_AI_DROP_DESCRIPTION_SUMMARY_COLLECTION,
    ADMIN_AI_DROP_DESCRIPTION_SUMMARY_DOC,
    adminAiDropDescriptionJobSchema,
    adminAiDropDescriptionPromptPolicyHistoryEntrySchema,
    adminAiDropDescriptionPromptPolicyPerformanceSchema,
    adminAiDropDescriptionPromptPolicySchema,
    adminAiDropDescriptionReviewGalleryItemSchema,
    adminAiDropDescriptionRuntimeSchema,
    adminAiDropDescriptionSettingsSchema,
    adminAiDropDescriptionSummarySchema,
    buildAdminAiDropDescriptionPrompt,
    buildAdminAiDropDescriptionRecipe,
    estimateAdminAiDropDescriptionCostUsd,
    getAdminAiDropDescriptionPriceBasis,
    getDefaultAdminAiDropDescriptionPromptPolicy,
    getDefaultAdminAiDropDescriptionSettings,
    normalizeAdminAiDropDescriptionModel,
    type AdminAiDropDescriptionErrorCode,
    type AdminAiDropDescriptionFeedbackAction,
    type AdminAiDropDescriptionExample,
    type AdminAiDropDescriptionJobRecord,
    type AdminAiDropDescriptionPromptPolicy,
    type AdminAiDropDescriptionPromptPolicyHistoryEntry,
    type AdminAiDropDescriptionPromptPolicyPerformance,
    type AdminAiDropDescriptionRuntimeStatus,
    type AdminAiDropDescriptionSettings,
    type AdminAiDropDescriptionUsageMetadata,
} from "@/lib/ai-drop-descriptions";
import { FIREBASE_PROJECT_ID } from "@/lib/firebase-runtime";
import { trackServerEvent } from "@/lib/server/analytics";
import { adminDb } from "@/lib/server/firebase-admin";
import { recordRouteWarning } from "@/lib/server/route-diagnostics";
import { recordServerDiagnostic } from "@/lib/server/server-diagnostics";

const DEFAULT_VERTEX_LOCATION = ADMIN_AI_DROP_DESCRIPTION_DEFAULT_LOCATION;
const RECENT_JOB_LIMIT = 18;
const PROMPT_POLICY_HISTORY_LIMIT = 20;
const REVIEW_GALLERY_LIMIT = 24;
const CREATOR_HISTORY_LIMIT = 10;
const CATALOG_HISTORY_LIMIT = 20;

type AdminAiDropDescriptionRuntime = {
    project: string;
    location: string;
    model: string;
};

type AdminAiDropDescriptionRuntimeSnapshot = {
    settings: AdminAiDropDescriptionSettings;
    runtime: AdminAiDropDescriptionRuntime;
};

type GenerateTextInput = {
    prompt: string;
    project: string;
    location: string;
    model: string;
};

type GenerateTextResult = {
    text: string;
    usageMetadata: AdminAiDropDescriptionUsageMetadata | null;
    resolvedModel: string | null;
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
    activeGenerationCount: number;
    lastSuccessAtMs: number;
    lastFailureAtMs: number;
}>;

type AdminAiDropDescriptionGenerationInput = {
    title: string;
    creatorId?: string | null;
    creatorName?: string | null;
    dropId?: string | null;
    draftSessionId?: string | null;
    previousJobId?: string | null;
    requestedByUid: string;
    requestedByEmail?: string | undefined;
};

type AdminAiDropDescriptionFeedbackInput = {
    jobId: string;
    action: AdminAiDropDescriptionFeedbackAction;
    dropId?: string | null;
    actorUid: string;
    actorEmail?: string | undefined;
};

export class AdminAiDropDescriptionError extends Error {
    code: AdminAiDropDescriptionErrorCode;
    status: number;
    clientMessage: string;

    constructor(code: AdminAiDropDescriptionErrorCode, status: number, message: string, clientMessage = message) {
        super(message);
        this.name = "AdminAiDropDescriptionError";
        this.code = code;
        this.status = status;
        this.clientMessage = clientMessage;
    }
}

export function toAdminAiDropDescriptionClientError(error: unknown) {
    if (!(error instanceof AdminAiDropDescriptionError)) {
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

function toNumber(value: unknown, fallback = 0) {
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function getString(value: unknown) {
    return typeof value === "string" ? value : "";
}

function toNullableString(value: unknown) {
    const normalized = getString(value).trim();
    return normalized.length > 0 ? normalized : null;
}

function isApprovedDrop(value: unknown) {
    return value === "approved";
}

function buildError(code: AdminAiDropDescriptionErrorCode, status: number, message: string, clientMessage = message) {
    return new AdminAiDropDescriptionError(code, status, message, clientMessage);
}

function summarizeAvailabilityIssue(error: unknown) {
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
        return "Vertex text generation credentials are unavailable. Run `gcloud auth application-default login` locally or use a Google-managed runtime identity.";
    }

    if (normalized.includes("timed out")) {
        return "Vertex text generation timed out before the description finished.";
    }

    return "Vertex text generation is unavailable right now.";
}

function classifyProviderError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.toLowerCase().includes("timed out")) {
        return buildError("provider_timeout", 504, message, "AI description generation timed out before the text finished.");
    }

    return buildError("provider_unavailable", 503, message, summarizeAvailabilityIssue(error));
}

function buildDiff(previousValue: string, nextValue: string) {
    const previous = previousValue.trim();
    const next = nextValue.trim();

    if (previous === next) {
        return [];
    }

    return [
        previous ? `Previous: ${previous}` : "Previous: [empty]",
        next ? `Next: ${next}` : "Next: [empty]",
    ];
}

function extractResponseText(response: unknown) {
    if (!response || typeof response !== "object") {
        return "";
    }

    const candidates = Array.isArray((response as { candidates?: unknown[] }).candidates)
        ? (response as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }).candidates || []
        : [];

    return candidates
        .flatMap((candidate) => candidate.content?.parts || [])
        .map((part) => typeof part?.text === "string" ? part.text : "")
        .join("\n")
        .trim();
}

function normalizeGeneratedDescription(raw: string) {
    const normalized = raw
        .replace(/[\r\n]+/g, " ")
        .replace(/[“”"]/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const sentenceMatches = normalized.match(/[^.!?]+[.!?]+/g) || [];
    const picked = sentenceMatches.slice(0, 2).map((sentence) => sentence.trim()).filter(Boolean);
    const candidate = picked.length > 0 ? picked.join(" ") : normalized;
    const finalValue = candidate.replace(/\s+/g, " ").trim();

    return finalValue.length > 0 ? finalValue : "A premium drop crafted to match the flavor and keep the mood instantly clear.";
}

function trimAcceptedDescription(description: string) {
    return normalizeGeneratedDescription(description).slice(0, 340);
}

function resolveRuntime(configuredModel?: string) {
    const project = (
        process.env.GOOGLE_CLOUD_PROJECT
        || process.env.GCLOUD_PROJECT
        || process.env.PROJECT_ID
        || FIREBASE_PROJECT_ID
        || process.env.FIREBASE_PROJECT_ID
        || ""
    ).trim();
    const location = (
        process.env.VERTEX_AI_LOCATION
        || process.env.GOOGLE_CLOUD_LOCATION
        || process.env.GCLOUD_LOCATION
        || DEFAULT_VERTEX_LOCATION
    ).trim() || DEFAULT_VERTEX_LOCATION;

    return {
        project,
        location,
        model: normalizeAdminAiDropDescriptionModel(configuredModel),
    } satisfies AdminAiDropDescriptionRuntime;
}

async function generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
    const vertex = new VertexAI({
        project: input.project,
        location: input.location,
    });
    const model = vertex.getGenerativeModel({
        model: input.model,
        generationConfig: {
            temperature: 0.6,
            topP: 0.9,
            maxOutputTokens: 220,
        },
    });

    const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: input.prompt }] }],
    });
    const response = result.response as unknown as {
        usageMetadata?: AdminAiDropDescriptionUsageMetadata;
        modelVersion?: string;
    };
    const text = extractResponseText(result.response);

    if (!text) {
        throw new Error("Vertex AI returned an empty description response.");
    }

    return {
        text,
        usageMetadata: response?.usageMetadata || null,
        resolvedModel: typeof response?.modelVersion === "string" ? response.modelVersion : null,
    };
}

async function getSettingsSnapshot(): Promise<AdminAiDropDescriptionRuntimeSnapshot> {
    const settings = await getAdminAiDropDescriptionSettings();
    return {
        settings,
        runtime: resolveRuntime(settings.model),
    };
}

async function readPromptPolicy() {
    if (!adminDb) {
        return getDefaultAdminAiDropDescriptionPromptPolicy();
    }

    const snapshot = await adminDb.collection("adminSettings").doc(ADMIN_AI_DROP_DESCRIPTION_PROMPT_POLICY_DOC).get();
    const defaults = getDefaultAdminAiDropDescriptionPromptPolicy();
    const value = snapshot.exists ? snapshot.data() : null;
    const parsed = adminAiDropDescriptionPromptPolicySchema.safeParse({
        ...defaults,
        ...(value || {}),
    });

    return parsed.success ? parsed.data : defaults;
}

async function writePromptPolicyHistory(entry: AdminAiDropDescriptionPromptPolicyHistoryEntry) {
    if (!adminDb) {
        return;
    }

    await adminDb
        .collection("adminSettings")
        .doc(ADMIN_AI_DROP_DESCRIPTION_PROMPT_POLICY_DOC)
        .collection(ADMIN_AI_DROP_DESCRIPTION_PROMPT_POLICY_HISTORY_COLLECTION)
        .doc(entry.id)
        .set(entry);
}

function buildRuntimeStatus(snapshot: AdminAiDropDescriptionRuntimeSnapshot) {
    const enabled = snapshot.settings.enabled === true;
    let status: AdminAiDropDescriptionRuntimeStatus = "ready";
    let note = "AI description generation is ready.";

    if (!enabled) {
        status = "disabled";
        note = "AI description generation is off.";
    } else if (!snapshot.runtime.project) {
        status = "missing_project";
        note = "AI description generation is missing a Google Cloud project.";
    }

    return adminAiDropDescriptionRuntimeSchema.parse({
        enabled,
        status,
        note,
        project: snapshot.runtime.project,
        location: snapshot.runtime.location,
        model: snapshot.runtime.model,
        resolvedModel: null,
        priceSourceUrl: snapshot.settings.priceSourceUrl,
        priceBasis: snapshot.settings.priceBasis,
        inputUsdPerMillion: snapshot.settings.inputUsdPerMillion,
        outputUsdPerMillion: snapshot.settings.outputUsdPerMillion,
    });
}

async function readSummary() {
    if (!adminDb) {
        return {
            generationCount: 0,
            successfulGenerationCount: 0,
            failedGenerationCount: 0,
            acceptedCount: 0,
            likedCount: 0,
            dislikedCount: 0,
            regeneratedCount: 0,
            totalEstimatedCostUsd: 0,
            averageLatencyMs: 0,
            activeGenerationCount: 0,
            lastSuccessAtMs: null,
            lastFailureAtMs: null,
        };
    }

    const snapshot = await adminDb.collection(ADMIN_AI_DROP_DESCRIPTION_SUMMARY_COLLECTION).doc(ADMIN_AI_DROP_DESCRIPTION_SUMMARY_DOC).get();
    const data = snapshot.exists ? snapshot.data() as Record<string, unknown> : {};

    return {
        generationCount: toNumber(data.generationCount),
        successfulGenerationCount: toNumber(data.successfulGenerationCount),
        failedGenerationCount: toNumber(data.failedGenerationCount),
        acceptedCount: toNumber(data.acceptedCount),
        likedCount: toNumber(data.likedCount),
        dislikedCount: toNumber(data.dislikedCount),
        regeneratedCount: toNumber(data.regeneratedCount),
        totalEstimatedCostUsd: Number(toNumber(data.totalEstimatedCostUsd).toFixed(6)),
        averageLatencyMs: toNumber(data.averageLatencyMs),
        activeGenerationCount: toNumber(data.activeGenerationCount),
        lastSuccessAtMs: typeof data.lastSuccessAtMs === "number" ? data.lastSuccessAtMs : null,
        lastFailureAtMs: typeof data.lastFailureAtMs === "number" ? data.lastFailureAtMs : null,
    };
}

async function readRecentJobs() {
    if (!adminDb) {
        return [] as AdminAiDropDescriptionJobRecord[];
    }

    const snapshot = await adminDb
        .collection(ADMIN_AI_DROP_DESCRIPTION_JOBS_COLLECTION)
        .orderBy("requestedAtMs", "desc")
        .limit(RECENT_JOB_LIMIT)
        .get();

    return snapshot.docs
        .map((doc) => adminAiDropDescriptionJobSchema.safeParse({
            id: doc.id,
            ...doc.data(),
        }))
        .filter((result) => result.success)
        .map((result) => result.data);
}

async function readPromptPolicyHistory() {
    if (!adminDb) {
        return [] as AdminAiDropDescriptionPromptPolicyHistoryEntry[];
    }

    const snapshot = await adminDb
        .collection("adminSettings")
        .doc(ADMIN_AI_DROP_DESCRIPTION_PROMPT_POLICY_DOC)
        .collection(ADMIN_AI_DROP_DESCRIPTION_PROMPT_POLICY_HISTORY_COLLECTION)
        .orderBy("createdAtMs", "desc")
        .limit(PROMPT_POLICY_HISTORY_LIMIT)
        .get();

    return snapshot.docs
        .map((doc) => adminAiDropDescriptionPromptPolicyHistoryEntrySchema.safeParse({
            id: doc.id,
            ...doc.data(),
        }))
        .filter((result) => result.success)
        .map((result) => result.data);
}

async function buildDescriptionExamples(input: Pick<AdminAiDropDescriptionGenerationInput, "creatorId" | "title">) {
    if (!adminDb) {
        return {
            examples: [] as AdminAiDropDescriptionExample[],
            creatorHistoryCount: 0,
            catalogFallbackCount: 0,
            degradedExampleLookup: false,
        };
    }

    try {
        type DropDescriptionSourceRecord = {
            id: string;
            approvalStatus?: unknown;
            description?: unknown;
            creatorId?: unknown;
            title?: unknown;
        };

        const creatorHistoryDocs = input.creatorId
            ? await adminDb.collection("drops").where("creatorId", "==", input.creatorId).limit(CREATOR_HISTORY_LIMIT).get()
            : null;
        const creatorExamples = (creatorHistoryDocs?.docs || [])
            .map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }) as DropDescriptionSourceRecord)
            .filter((drop) => isApprovedDrop(drop.approvalStatus) && getString(drop.description).trim().length >= 10)
            .slice(0, 4)
            .map((drop) => ({
                dropId: drop.id,
                creatorId: toNullableString(drop.creatorId),
                title: getString(drop.title),
                description: trimAcceptedDescription(getString(drop.description)),
                source: "creator_history" as const,
            }));

        const creatorDropIds = new Set(creatorExamples.map((example) => example.dropId));
        const fallbackSnapshot = await adminDb.collection("drops").orderBy("validFrom", "desc").limit(CATALOG_HISTORY_LIMIT).get();
        const fallbackExamples = fallbackSnapshot.docs
            .map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }) as DropDescriptionSourceRecord)
            .filter((drop) => !creatorDropIds.has(drop.id))
            .filter((drop) => isApprovedDrop(drop.approvalStatus) && getString(drop.description).trim().length >= 10)
            .slice(0, creatorExamples.length > 0 ? 2 : 4)
            .map((drop) => ({
                dropId: drop.id,
                creatorId: toNullableString(drop.creatorId),
                title: getString(drop.title),
                description: trimAcceptedDescription(getString(drop.description)),
                source: "catalog_fallback" as const,
            }));

        return {
            examples: [...creatorExamples, ...fallbackExamples],
            creatorHistoryCount: creatorExamples.length,
            catalogFallbackCount: fallbackExamples.length,
            degradedExampleLookup: false,
        };
    } catch (error) {
        recordRouteWarning("admin-ai-drop-descriptions", "Description example lookup failed", error, {
            channel: "runtime",
            detail: {
                creatorId: input.creatorId || "",
            },
        });

        return {
            examples: [] as AdminAiDropDescriptionExample[],
            creatorHistoryCount: 0,
            catalogFallbackCount: 0,
            degradedExampleLookup: true,
        };
    }
}

async function updateSummary(delta: SummaryDelta) {
    if (!adminDb) {
        return;
    }

    const ref = adminDb.collection(ADMIN_AI_DROP_DESCRIPTION_SUMMARY_COLLECTION).doc(ADMIN_AI_DROP_DESCRIPTION_SUMMARY_DOC);
    await adminDb.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(ref);
        const current = snapshot.exists ? snapshot.data() as Record<string, unknown> : {};
        const generationCount = toNumber(current.generationCount) + toNumber(delta.generationCount);
        const successfulGenerationCount = toNumber(current.successfulGenerationCount) + toNumber(delta.successfulGenerationCount);
        const failedGenerationCount = toNumber(current.failedGenerationCount) + toNumber(delta.failedGenerationCount);
        const totalEstimatedCostUsd = toNumber(current.totalEstimatedCostUsd) + toNumber(delta.totalEstimatedCostUsd);
        const totalLatencyMs = toNumber(current.totalLatencyMs) + toNumber(delta.totalLatencyMs);
        const latencySampleCount = toNumber(current.latencySampleCount) + toNumber(delta.latencySampleCount);
        const nextActive = Math.max(0, toNumber(current.activeGenerationCount) + toNumber(delta.activeGenerationCount));

        transaction.set(ref, {
            generationCount,
            successfulGenerationCount,
            failedGenerationCount,
            acceptedCount: toNumber(current.acceptedCount) + toNumber(delta.acceptedCount),
            likedCount: toNumber(current.likedCount) + toNumber(delta.likedCount),
            dislikedCount: toNumber(current.dislikedCount) + toNumber(delta.dislikedCount),
            regeneratedCount: toNumber(current.regeneratedCount) + toNumber(delta.regeneratedCount),
            totalEstimatedCostUsd: Number(totalEstimatedCostUsd.toFixed(6)),
            totalLatencyMs,
            latencySampleCount,
            averageLatencyMs: latencySampleCount > 0 ? Math.round(totalLatencyMs / latencySampleCount) : 0,
            activeGenerationCount: nextActive,
            lastSuccessAtMs: typeof delta.lastSuccessAtMs === "number" ? delta.lastSuccessAtMs : current.lastSuccessAtMs || null,
            lastFailureAtMs: typeof delta.lastFailureAtMs === "number" ? delta.lastFailureAtMs : current.lastFailureAtMs || null,
            updatedAtMs: Date.now(),
        }, { merge: true });
    });
}

async function readJob(jobId: string) {
    if (!adminDb) {
        return null;
    }

    const snapshot = await adminDb.collection(ADMIN_AI_DROP_DESCRIPTION_JOBS_COLLECTION).doc(jobId).get();
    if (!snapshot.exists) {
        return null;
    }

    const parsed = adminAiDropDescriptionJobSchema.safeParse({
        id: snapshot.id,
        ...snapshot.data(),
    });

    return parsed.success ? parsed.data : null;
}

async function maybeOptimizePromptPolicy(input: {
    policy: AdminAiDropDescriptionPromptPolicy;
    settings: AdminAiDropDescriptionSettings;
    feedbackAction: AdminAiDropDescriptionFeedbackAction;
    job: AdminAiDropDescriptionJobRecord;
    actorUid: string;
    actorEmail?: string | undefined;
}) {
    const current = input.policy.currentMutablePrompt.trim();
    const creatorKey = input.job.creatorId || input.job.creatorName || "global";
    const existingPerformance = adminAiDropDescriptionPromptPolicyPerformanceSchema.parse(
        input.policy.creatorPerformance?.[creatorKey] || {
            generationCount: 0,
            acceptedCount: 0,
            likedCount: 0,
            dislikedCount: 0,
        },
    );

    const nextPerformance: AdminAiDropDescriptionPromptPolicyPerformance = {
        generationCount: existingPerformance.generationCount + 1,
        acceptedCount: existingPerformance.acceptedCount + (input.feedbackAction === "accept" || input.feedbackAction === "link_drop" ? 1 : 0),
        likedCount: existingPerformance.likedCount + (input.feedbackAction === "like" ? 1 : 0),
        dislikedCount: existingPerformance.dislikedCount + (input.feedbackAction === "dislike" ? 1 : 0),
    };

    let ruleHint = "Keep premium, concise, flavor-led copy with clean clarity.";
    if (input.feedbackAction === "dislike") {
        ruleHint = "Favor cleaner 1-2 sentence copy with stronger flavor specificity and less generic indulgence wording.";
    } else if (input.feedbackAction === "accept" || input.feedbackAction === "link_drop") {
        ruleHint = "Preserve the concise, polished, flavor-first tone that led to acceptance.";
    } else if (input.feedbackAction === "like") {
        ruleHint = "Preserve the current direction and sharpen the flavor identity slightly.";
    }

    let nextMutablePrompt = ruleHint;
    let optimizerStatus: AdminAiDropDescriptionPromptPolicy["optimizerStatus"] = input.settings.optimizerEnabled ? "running" : "degraded";
    let optimizerNote = input.settings.optimizerEnabled
        ? "Optimizer updated from the latest description feedback."
        : "Optimizer is disabled. Rules-only refinement is active.";
    let optimizerProposal: string | null = null;

    if (input.settings.optimizerEnabled && input.policy.autoOptimize) {
        try {
            const runtime = resolveRuntime(input.settings.optimizerModel);
            if (runtime.project) {
                const optimizerPrompt = [
                    "Rewrite the mutable prompt for a KandyDrops drop-description generator.",
                    "You may only rewrite the mutable prompt. Do not rewrite the base prompt or locked clauses.",
                    "Return one short paragraph only.",
                    `Current mutable prompt: ${current || "Keep premium, concise, flavor-led copy."}`,
                    `Latest feedback action: ${input.feedbackAction}.`,
                    `Accepted description sample: ${input.job.descriptionText || "none"}.`,
                    `Rule hint: ${ruleHint}`,
                ].join("\n");

                const optimizerResult = await generateText({
                    prompt: optimizerPrompt,
                    project: runtime.project,
                    location: runtime.location,
                    model: runtime.model,
                });
                nextMutablePrompt = normalizeGeneratedDescription(optimizerResult.text).replace(/[.!?]+$/u, "");
                optimizerProposal = nextMutablePrompt;
                optimizerStatus = "ready";
                optimizerNote = "Optimizer updated from the latest description feedback.";
            } else {
                optimizerStatus = "degraded";
                optimizerNote = "Optimizer could not run because the Vertex project is missing.";
            }
        } catch (error) {
            optimizerStatus = "degraded";
            optimizerNote = summarizeAvailabilityIssue(error);
            recordServerDiagnostic({
                channel: "runtime",
                severity: "warn",
                message: "AI drop description optimizer degraded",
                detail: {
                    feedbackAction: input.feedbackAction,
                    jobId: input.job.id,
                    error: error instanceof Error ? error.message : String(error),
                },
            });
        }
    }

    const nextPolicy: AdminAiDropDescriptionPromptPolicy = {
        ...input.policy,
        optimizerStatus,
        optimizerNote,
        optimizerProposal,
        currentMutablePrompt: nextMutablePrompt,
        lastOptimizerRunAtMs: Date.now(),
        lastAcceptedPrompt: input.feedbackAction === "accept" || input.feedbackAction === "link_drop"
            ? input.job.workingPrompt || input.policy.lastAcceptedPrompt || null
            : input.policy.lastAcceptedPrompt,
        lastAcceptedAtMs: input.feedbackAction === "accept" || input.feedbackAction === "link_drop"
            ? Date.now()
            : input.policy.lastAcceptedAtMs,
        lastAutoRefinementDiff: buildDiff(current, nextMutablePrompt),
        creatorPerformance: {
            ...(input.policy.creatorPerformance || {}),
            [creatorKey]: nextPerformance,
        },
    };

    if (adminDb) {
        await adminDb.collection("adminSettings").doc(ADMIN_AI_DROP_DESCRIPTION_PROMPT_POLICY_DOC).set(nextPolicy, { merge: true });
    }

    const historyEntry: AdminAiDropDescriptionPromptPolicyHistoryEntry = adminAiDropDescriptionPromptPolicyHistoryEntrySchema.parse({
        id: `${Date.now()}-${input.job.id}`,
        version: nextPolicy.version,
        source: input.settings.optimizerEnabled ? "optimizer" : "default",
        action: "feedback",
        previousMutablePrompt: current || null,
        nextMutablePrompt,
        diff: buildDiff(current, nextMutablePrompt),
        createdAtMs: Date.now(),
        actorUid: input.actorUid,
        actorEmail: input.actorEmail || null,
        jobId: input.job.id,
        feedbackAction: input.feedbackAction,
    });
    await writePromptPolicyHistory(historyEntry);
}

export async function getAdminAiDropDescriptionSettings() {
    if (!adminDb) {
        return getDefaultAdminAiDropDescriptionSettings();
    }

    const snapshot = await adminDb.collection("adminSettings").doc(ADMIN_AI_DROP_DESCRIPTION_SETTINGS_DOC).get();
    const defaults = getDefaultAdminAiDropDescriptionSettings();
    const data = snapshot.exists ? snapshot.data() as Record<string, unknown> : {};
    return adminAiDropDescriptionSettingsSchema.parse({
        ...defaults,
        ...data,
        model: normalizeAdminAiDropDescriptionModel(getString(data.model) || defaults.model),
        optimizerModel: normalizeAdminAiDropDescriptionModel(getString(data.optimizerModel) || defaults.optimizerModel),
        priceSourceUrl: getString(data.priceSourceUrl) || defaults.priceSourceUrl,
        priceBasis: getAdminAiDropDescriptionPriceBasis(getString(data.model) || defaults.model),
        inputUsdPerMillion: typeof data.inputUsdPerMillion === "number" ? data.inputUsdPerMillion : defaults.inputUsdPerMillion,
        outputUsdPerMillion: typeof data.outputUsdPerMillion === "number" ? data.outputUsdPerMillion : defaults.outputUsdPerMillion,
    });
}

export async function saveAdminAiDropDescriptionSettings(input: {
    enabled?: boolean;
    model?: string;
    optimizerEnabled?: boolean;
    actorUid: string;
    actorEmail?: string | undefined;
}) {
    const existing = await getAdminAiDropDescriptionSettings();
    const nextSettings = adminAiDropDescriptionSettingsSchema.parse({
        ...existing,
        enabled: typeof input.enabled === "boolean" ? input.enabled : existing.enabled,
        model: normalizeAdminAiDropDescriptionModel(input.model || existing.model),
        optimizerModel: normalizeAdminAiDropDescriptionModel(existing.optimizerModel),
        optimizerEnabled: typeof input.optimizerEnabled === "boolean" ? input.optimizerEnabled : existing.optimizerEnabled,
        priceSourceUrl: ADMIN_AI_DROP_DESCRIPTION_PRICE_SOURCE_URL,
        priceBasis: getAdminAiDropDescriptionPriceBasis(input.model || existing.model),
        updatedAtMs: Date.now(),
        updatedByUid: input.actorUid,
        updatedByEmail: input.actorEmail || null,
    });

    if (adminDb) {
        await adminDb.collection("adminSettings").doc(ADMIN_AI_DROP_DESCRIPTION_SETTINGS_DOC).set(nextSettings, { merge: true });
    }

    void trackServerEvent("admin_ai_description_toggle_updated", {
        ai_feature: "drop_description_generation",
        ai_enabled: nextSettings.enabled,
        ai_model: nextSettings.model,
        ai_location: nextSettings.location,
    }, input.actorUid);

    return nextSettings;
}

export async function saveAdminAiDropDescriptionPromptPolicy(input: {
    actorUid: string;
    actorEmail?: string | undefined;
    baseInstructionPrompt?: string;
    lockedClauses?: string[];
    mutableClauses?: string[];
    currentMutablePrompt?: string;
    autoOptimize?: boolean;
}) {
    const existing = await readPromptPolicy();
    const nextPolicy = adminAiDropDescriptionPromptPolicySchema.parse({
        ...existing,
        baseInstructionPrompt: input.baseInstructionPrompt?.trim() || existing.baseInstructionPrompt,
        lockedClauses: Array.isArray(input.lockedClauses) && input.lockedClauses.length > 0 ? input.lockedClauses : existing.lockedClauses,
        mutableClauses: Array.isArray(input.mutableClauses) && input.mutableClauses.length > 0 ? input.mutableClauses : existing.mutableClauses,
        currentMutablePrompt: input.currentMutablePrompt?.trim() || existing.currentMutablePrompt,
        autoOptimize: typeof input.autoOptimize === "boolean" ? input.autoOptimize : existing.autoOptimize,
        lastEditedAtMs: Date.now(),
        lastEditedByUid: input.actorUid,
        lastEditedByEmail: input.actorEmail || null,
    });

    if (adminDb) {
        await adminDb.collection("adminSettings").doc(ADMIN_AI_DROP_DESCRIPTION_PROMPT_POLICY_DOC).set(nextPolicy, { merge: true });
    }

    const historyEntry = adminAiDropDescriptionPromptPolicyHistoryEntrySchema.parse({
        id: `${Date.now()}-manual-edit`,
        version: nextPolicy.version,
        source: "manual_override",
        action: "manual_edit",
        previousMutablePrompt: existing.currentMutablePrompt,
        nextMutablePrompt: nextPolicy.currentMutablePrompt,
        diff: buildDiff(existing.currentMutablePrompt, nextPolicy.currentMutablePrompt),
        createdAtMs: Date.now(),
        actorUid: input.actorUid,
        actorEmail: input.actorEmail || null,
        jobId: null,
        feedbackAction: null,
    });
    await writePromptPolicyHistory(historyEntry);

    void trackServerEvent("admin_ai_description_prompt_policy_updated", {
        ai_feature: "drop_description_generation",
        ai_model: nextPolicy.optimizerModel,
        ai_prompt_version: ADMIN_AI_DROP_DESCRIPTION_PROMPT_VERSION,
    }, input.actorUid);

    return nextPolicy;
}

export async function buildAdminAiDropDescriptionDashboard() {
    const [snapshot, summary, recentJobs, promptPolicy, promptPolicyHistory] = await Promise.all([
        getSettingsSnapshot(),
        readSummary(),
        readRecentJobs(),
        readPromptPolicy(),
        readPromptPolicyHistory(),
    ]);
    const latestResolvedModel = recentJobs.find((job) => typeof job.resolvedModel === "string" && job.resolvedModel.trim().length > 0)?.resolvedModel || null;
    const runtime = adminAiDropDescriptionRuntimeSchema.parse({
        ...buildRuntimeStatus(snapshot),
        resolvedModel: latestResolvedModel,
    });
    const reviewGallery = recentJobs
        .slice(0, REVIEW_GALLERY_LIMIT)
        .map((job) => adminAiDropDescriptionReviewGalleryItemSchema.parse({
            id: job.id,
            title: job.title,
            descriptionText: job.descriptionText || job.errorMessage || "",
            feedback: job.feedback,
            status: job.status,
            requestedAtMs: job.requestedAtMs,
            model: job.model,
            accepted: job.accepted,
        }));

    return adminAiDropDescriptionSummarySchema.parse({
        refreshedAtMs: Date.now(),
        settings: snapshot.settings,
        runtime,
        aggregate: summary,
        recentJobs,
        promptPolicy,
        promptPolicyHistory,
        reviewGallery,
    });
}

export async function generateAdminAiDropDescription(input: AdminAiDropDescriptionGenerationInput) {
    const trimmedTitle = input.title.trim();
    if (trimmedTitle.length < 3) {
        throw buildError("validation_failed", 400, "Drop title is too short.", "Enter at least 3 title characters before generating a description.");
    }
    if (!input.dropId && !input.draftSessionId) {
        throw buildError("draft_session_required", 400, "Missing draft session.", "This draft could not be identified. Close and reopen Create Drop, then try again.");
    }

    const snapshot = await getSettingsSnapshot();
    if (!snapshot.settings.enabled) {
        throw buildError("feature_disabled", 403, "AI description generation is disabled.", "AI description generation is turned off.");
    }
    if (!snapshot.runtime.project) {
        throw buildError("runtime_unavailable", 503, "Missing Vertex project.", "AI description generation is unavailable because the Google Cloud project is not configured.");
    }

    const promptPolicy = await readPromptPolicy();
    const draftSessionId = input.dropId ? null : input.draftSessionId || null;
    const recipe = buildAdminAiDropDescriptionRecipe({
        title: trimmedTitle,
        creatorId: input.creatorId,
        creatorName: input.creatorName,
    });
    const exampleContext = await buildDescriptionExamples({
        creatorId: input.creatorId,
        title: trimmedTitle,
    });
    const prompt = buildAdminAiDropDescriptionPrompt({
        title: trimmedTitle,
        creatorId: input.creatorId,
        creatorName: input.creatorName,
    }, {
        recipe,
        promptPolicy,
        examples: exampleContext.examples,
    });

    const jobRef = adminDb
        ? adminDb.collection(ADMIN_AI_DROP_DESCRIPTION_JOBS_COLLECTION).doc()
        : { id: `local-${Date.now()}` } as { id: string };

    const requestedAtMs = Date.now();
    const runningJob = adminAiDropDescriptionJobSchema.parse({
        id: jobRef.id,
        title: trimmedTitle,
        creatorId: input.creatorId || null,
        creatorName: input.creatorName || null,
        dropId: input.dropId || null,
        draftSessionId,
        model: snapshot.runtime.model,
        resolvedModel: null,
        location: snapshot.runtime.location,
        promptVersion: ADMIN_AI_DROP_DESCRIPTION_PROMPT_VERSION,
        promptEditSource: "default",
        promptPolicyVersion: promptPolicy.version,
        workingPrompt: prompt,
        optimizerAdjustedPrompt: promptPolicy.currentMutablePrompt,
        recipe,
        descriptionText: null,
        status: "running",
        feedback: "neutral",
        accepted: false,
        requestedAtMs,
        completedAtMs: null,
        latencyMs: null,
        estimatedCostUsd: 0,
        billed: false,
        usageMetadata: null,
        selectedExamples: exampleContext.examples,
        creatorHistoryCount: exampleContext.creatorHistoryCount,
        catalogFallbackCount: exampleContext.catalogFallbackCount,
        degradedExampleLookup: exampleContext.degradedExampleLookup,
        validationWarnings: exampleContext.degradedExampleLookup ? ["Example history lookup degraded; generation continued with title-only bias."] : [],
        acceptedAtMs: null,
        acceptedForDropId: null,
        errorMessage: null,
    });

    try {
        if (adminDb) {
            await adminDb.collection(ADMIN_AI_DROP_DESCRIPTION_JOBS_COLLECTION).doc(jobRef.id).set(runningJob);
        }
        await updateSummary({
            generationCount: 1,
            regeneratedCount: input.previousJobId ? 1 : 0,
            activeGenerationCount: 1,
        });

        const result = await generateText({
            prompt,
            project: snapshot.runtime.project,
            location: snapshot.runtime.location,
            model: snapshot.runtime.model,
        });

        const descriptionText = trimAcceptedDescription(result.text);
        const estimatedCostUsd = estimateAdminAiDropDescriptionCostUsd(snapshot.runtime.model, result.usageMetadata);
        const completedAtMs = Date.now();
        const latencyMs = completedAtMs - requestedAtMs;
        const succeededJob = adminAiDropDescriptionJobSchema.parse({
            ...runningJob,
            resolvedModel: result.resolvedModel,
            descriptionText,
            status: "succeeded",
            completedAtMs,
            latencyMs,
            estimatedCostUsd,
            billed: true,
            usageMetadata: result.usageMetadata,
        });

        if (adminDb) {
            await adminDb.collection(ADMIN_AI_DROP_DESCRIPTION_JOBS_COLLECTION).doc(jobRef.id).set(succeededJob, { merge: true });
        }

        await updateSummary({
            successfulGenerationCount: 1,
            totalEstimatedCostUsd: estimatedCostUsd,
            totalLatencyMs: latencyMs,
            latencySampleCount: 1,
            lastSuccessAtMs: completedAtMs,
            activeGenerationCount: -1,
        });

        void trackServerEvent("admin_ai_description_generate_succeeded", {
            ai_feature: "drop_description_generation",
            ai_job_id: succeededJob.id,
            ai_model: succeededJob.model,
            ai_prompt_version: ADMIN_AI_DROP_DESCRIPTION_PROMPT_VERSION,
            drop_id: input.dropId || "",
            draft_session_id: draftSessionId || "",
            latency_ms: latencyMs,
            estimated_cost_usd: estimatedCostUsd,
            ai_example_count: exampleContext.examples.length,
            ai_creator_history_count: exampleContext.creatorHistoryCount,
            ai_catalog_history_count: exampleContext.catalogFallbackCount,
        }, input.requestedByUid);

        return succeededJob;
    } catch (error) {
        const classifiedError = error instanceof AdminAiDropDescriptionError ? error : classifyProviderError(error);
        const failedAtMs = Date.now();
        const latencyMs = failedAtMs - requestedAtMs;
        const failedJob = adminAiDropDescriptionJobSchema.parse({
            ...runningJob,
            status: "failed",
            completedAtMs: failedAtMs,
            latencyMs,
            estimatedCostUsd: 0,
            billed: false,
            errorMessage: classifiedError.clientMessage,
        });

        if (adminDb) {
            await adminDb.collection(ADMIN_AI_DROP_DESCRIPTION_JOBS_COLLECTION).doc(jobRef.id).set(failedJob, { merge: true });
        }
        await updateSummary({
            failedGenerationCount: 1,
            totalLatencyMs: latencyMs,
            latencySampleCount: 1,
            lastFailureAtMs: failedAtMs,
            activeGenerationCount: -1,
        });

        recordServerDiagnostic({
            channel: "runtime",
            severity: "warn",
            message: "AI drop description generation failed",
            detail: {
                jobId: jobRef.id,
                model: snapshot.runtime.model,
                errorCode: classifiedError.code,
                error: classifiedError.message,
            },
        });

        void trackServerEvent("admin_ai_description_generate_failed", {
            ai_feature: "drop_description_generation",
            ai_job_id: jobRef.id,
            ai_model: snapshot.runtime.model,
            ai_prompt_version: ADMIN_AI_DROP_DESCRIPTION_PROMPT_VERSION,
            drop_id: input.dropId || "",
            draft_session_id: draftSessionId || "",
            latency_ms: latencyMs,
            failure_reason: classifiedError.clientMessage.slice(0, 120),
            failure_code: classifiedError.code,
            ai_example_count: exampleContext.examples.length,
        }, input.requestedByUid);

        throw classifiedError;
    }
}

export async function updateAdminAiDropDescriptionFeedback(input: AdminAiDropDescriptionFeedbackInput) {
    const existing = await readJob(input.jobId);
    if (!existing) {
        throw buildError("validation_failed", 404, "Description generation job not found.", "Description generation history could not be found.");
    }

    const updates: Partial<AdminAiDropDescriptionJobRecord> = {};
    const summaryDelta: SummaryDelta = {};
    const nowMs = Date.now();

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
            updates.accepted = true;
            updates.acceptedAtMs = existing.acceptedAtMs || nowMs;
            summaryDelta.acceptedCount = 1;
        }
    } else if (input.action === "link_drop") {
        if (!existing.accepted) {
            updates.accepted = true;
            updates.acceptedAtMs = nowMs;
            summaryDelta.acceptedCount = 1;
        }
        updates.acceptedForDropId = input.dropId || existing.dropId || null;
    }

    const nextJob = adminAiDropDescriptionJobSchema.parse({
        ...existing,
        ...updates,
    });

    if (adminDb) {
        await adminDb.collection(ADMIN_AI_DROP_DESCRIPTION_JOBS_COLLECTION).doc(input.jobId).set({
            ...updates,
            updatedAtMs: nowMs,
        }, { merge: true });
    }
    if (Object.keys(summaryDelta).length > 0) {
        await updateSummary(summaryDelta);
    }

    const settings = await getAdminAiDropDescriptionSettings();
    const policy = await readPromptPolicy();
    await maybeOptimizePromptPolicy({
        policy,
        settings,
        feedbackAction: input.action,
        job: nextJob,
        actorUid: input.actorUid,
        actorEmail: input.actorEmail,
    });

    const eventName = input.action === "like"
        ? "admin_ai_description_generation_liked"
        : input.action === "dislike"
            ? "admin_ai_description_generation_disliked"
            : "admin_ai_description_generation_accepted";
    if (input.action !== "link_drop" || !existing.accepted) {
        void trackServerEvent(eventName, {
            ai_feature: "drop_description_generation",
            ai_job_id: nextJob.id,
            ai_model: nextJob.model,
            ai_prompt_version: nextJob.promptVersion,
            drop_id: input.dropId || nextJob.dropId || nextJob.acceptedForDropId || "",
        }, input.actorUid);
    }

    return nextJob;
}
