import "server-only";

import { SchemaType, VertexAI, type ResponseSchema } from "@google-cloud/vertexai";

import {
    AI_DEBUG_ASSISTANT_MODEL,
    AI_DEBUG_ASSISTANT_PROMPT_VERSION,
    adminAiDebugModelOutputSchema,
    adminAiDebugSummarySchema,
    type AdminAiDebugSignalInput,
    type AdminAiDebugSummary,
} from "@/lib/ai-debug-assistant";
import { getAdminAiModelDefinitionByAlias } from "@/lib/admin-ai-models";
import type { AdminOpsHealth } from "@/lib/admin-ops-health";
import { FIREBASE_PROJECT_ID } from "@/lib/firebase-runtime";
import {
    getAdminAiDebugAssistantSettings,
    type AdminAiDebugAssistantSettings,
} from "@/lib/server/admin-debug-settings";
import type { CreatorOnboardingDiagnosticIssue, CreatorOnboardingDiagnosticSummary } from "@/lib/server/creator-onboarding-diagnostics";
import { recordRouteWarning } from "@/lib/server/route-diagnostics";
import { recordServerDiagnostic } from "@/lib/server/server-diagnostics";

const DEFAULT_VERTEX_LOCATION = "us-central1";
const DEFAULT_TIMEOUT_MS = 8000;
const ADMIN_AI_DEBUG_RESPONSE_SCHEMA: ResponseSchema = {
    type: SchemaType.OBJECT,
    properties: {
        summary: { type: SchemaType.STRING },
        likely_root_causes: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
        },
        affected_systems: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
        },
        confidence_notes: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
        },
        suggested_next_checks: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
        },
    },
    required: [
        "summary",
        "likely_root_causes",
        "affected_systems",
        "confidence_notes",
        "suggested_next_checks",
    ],
};

type AdminOrchestrationSnapshot = ReturnType<typeof import("@/lib/server/admin-orchestration").buildAdminOrchestrationSnapshot>;

type GenerateTextInput = {
    prompt: string;
    project: string;
    location: string;
    model: string;
    timeoutMs: number;
};

export type AdminAiDebugTextRunner = (input: GenerateTextInput) => Promise<string>;

function trimList(values: string[], limit = 4) {
    return values
        .map((value) => value.trim())
        .filter((value, index, list) => value.length > 0 && list.indexOf(value) === index)
        .slice(0, limit);
}

function summarizeAvailabilityIssue(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const normalized = message.toLowerCase();

    if (
        normalized.includes("application default credentials")
        || normalized.includes("could not load the default credentials")
        || normalized.includes("default credentials")
        || normalized.includes("unavailable")
        || normalized.includes("login required")
        || normalized.includes("econnreset")
        || normalized.includes("permission_denied")
        || normalized.includes("unauthenticated")
    ) {
        return "Vertex AI credentials are unavailable. Run `gcloud auth application-default login` locally or use a Google-managed runtime identity.";
    }

    if (normalized.includes("timed out")) {
        return "Vertex AI timed out while preparing a debug summary. Canonical diagnostics remain the source of truth.";
    }

    return "Vertex AI summary is unavailable right now. Canonical diagnostics remain the source of truth.";
}

function extractJsonBlock(raw: string) {
    const trimmed = raw.trim();
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fenced?.[1]?.trim() || trimmed;
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");

    if (start < 0 || end < start) {
        return candidate;
    }

    return candidate.slice(start, end + 1);
}

function extractResponseText(response: unknown) {
    if (!response || typeof response !== "object") {
        return "";
    }

    const responseWithCandidates = response as {
        candidates?: Array<{
            content?: {
                parts?: Array<{ text?: string }>;
            };
        }>;
    };
    const candidates = Array.isArray(responseWithCandidates.candidates)
        ? responseWithCandidates.candidates
        : [];

    return candidates
        .flatMap((candidate) => candidate.content?.parts || [])
        .map((part) => (typeof part?.text === "string" ? part.text : ""))
        .join("\n")
        .trim();
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
    return await new Promise<T>((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error(`Vertex AI request timed out after ${timeoutMs}ms`));
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

export function isAdminAiDebugAssistantEnabled(settings?: Pick<AdminAiDebugAssistantSettings, "enabled"> | null) {
    return settings?.enabled !== false;
}

export function resolveAdminAiDebugVertexRuntime(configuredModel?: string) {
    const model = configuredModel?.trim() || AI_DEBUG_ASSISTANT_MODEL;
    const modelDefinition = getAdminAiModelDefinitionByAlias(model);
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
        || modelDefinition?.location
        || DEFAULT_VERTEX_LOCATION
    ).trim();

    return {
        project,
        location: location || DEFAULT_VERTEX_LOCATION,
        model,
    };
}

export function buildAdminAiDebugSignalInput(input: {
    generatedAt?: string;
    opsHealth: AdminOpsHealth;
    orchestration: AdminOrchestrationSnapshot;
    creatorOnboardingDiagnostics: {
        summary: CreatorOnboardingDiagnosticSummary;
        issues: CreatorOnboardingDiagnosticIssue[];
    };
}) : AdminAiDebugSignalInput {
    return {
        generatedAt: input.generatedAt || new Date().toISOString(),
        ops: {
            score: input.opsHealth.score,
            pipelineFailureCount: input.opsHealth.pipeline.failureCount,
            lastPipelineFailureAt: input.opsHealth.pipeline.lastFailureAt,
            topRoutes: (input.opsHealth.pipeline.routes || []).slice(0, 5).map((entry) => ({
                route: entry.routeKey,
                count: entry.count,
            })),
            degradedMaterializers: (input.opsHealth.materializers || [])
                .filter((entry) => entry.status !== "healthy")
                .slice(0, 5)
                .map((entry) => ({
                    label: entry.label,
                    status: entry.status,
                    detail: entry.detail,
                })),
            runtimeWarnings: trimList(input.opsHealth.runtime.warnings || [], 5),
            diagnosticChannels: (input.opsHealth.diagnostics.channels || []).slice(0, 6).map((entry) => ({
                label: entry.label,
                errorCount: entry.errorCount,
                warnCount: entry.warnCount,
                count: entry.count,
            })),
            recentDiagnostics: (input.opsHealth.diagnostics.recent || []).slice(0, 6).map((entry) => ({
                channel: entry.channel,
                severity: entry.severity,
                message: entry.message,
                detailPreview: entry.detailPreview,
            })),
        },
        orchestration: {
            score: input.orchestration.summary.score,
            openFindings: input.orchestration.summary.openFindings,
            criticalFindings: input.orchestration.summary.criticalFindings,
            actionableProposals: input.orchestration.summary.actionableProposals,
            contaminationRisks: input.orchestration.summary.contaminationRisks,
            lowConfidenceEvents: input.orchestration.summary.lowConfidenceEvents,
            topDomains: (input.orchestration.domainSummary || []).slice(0, 5).map((entry) => ({
                key: entry.key,
                eventCount: entry.eventCount,
                openFindingCount: entry.openFindingCount,
            })),
            findings: (input.orchestration.findings || []).slice(0, 5).map((entry) => ({
                title: entry.title,
                severity: entry.severity,
                summary: entry.humanSummary,
                fixSummary: entry.fixSummary,
            })),
        },
        creatorOnboarding: {
            totalIssues: input.creatorOnboardingDiagnostics.summary.totalIssues,
            missingQueueCount: input.creatorOnboardingDiagnostics.summary.missingQueueCount,
            missingSourceCount: input.creatorOnboardingDiagnostics.summary.missingSourceCount,
            projectionWithoutSourceCount: input.creatorOnboardingDiagnostics.summary.projectionWithoutSourceCount,
            queueParityMismatchCount: input.creatorOnboardingDiagnostics.summary.queueParityMismatchCount,
            missingIdMetadataCount: input.creatorOnboardingDiagnostics.summary.missingIdMetadataCount,
            stuckAwaitingReviewCount: input.creatorOnboardingDiagnostics.summary.stuckAwaitingReviewCount,
            roleMismatchCount: input.creatorOnboardingDiagnostics.summary.roleMismatchCount,
            sampleIssues: (input.creatorOnboardingDiagnostics.issues || []).slice(0, 5).map((entry) => ({
                severity: entry.severity,
                message: entry.message,
                detail: entry.detail,
            })),
        },
    };
}

export function buildAdminAiDebugPrompt(signal: AdminAiDebugSignalInput) {
    return [
        "You are KandyDrops' internal debug assistant.",
        "You are advisory only. You do not mutate state and you do not invent certainty.",
        "Use only the bounded operational summaries provided below.",
        "Return JSON only with these exact keys: summary, likely_root_causes, affected_systems, confidence_notes, suggested_next_checks.",
        "Rules:",
        "- Keep each array at 1 to 6 short items.",
        "- Keep the summary concise and operationally useful.",
        "- Do not mention data you were not given.",
        "- Distinguish probable causes from confidence limitations.",
        "- Prefer naming concrete systems or surfaces over generic wording.",
        "",
        "Bounded operational input:",
        JSON.stringify(signal),
    ].join("\n");
}

export function buildAdminAiDebugFallback(input: {
    signal: AdminAiDebugSignalInput;
    settings: AdminAiDebugAssistantSettings;
    runtime: ReturnType<typeof resolveAdminAiDebugVertexRuntime>;
    availabilityNote: string;
    latencyMs?: number;
}) : AdminAiDebugSummary {
    const signal = input.signal;
    const likelyRootCauses = trimList([
        signal.ops.pipelineFailureCount > 0 ? "Recent route or pipeline failures are already present in canonical admin ops health." : "",
        signal.orchestration.openFindings > 0 ? "Open orchestration findings indicate unresolved cross-system parity or projection issues." : "",
        signal.creatorOnboarding.totalIssues > 0 ? "Creator onboarding records still contain canonical review or metadata mismatches." : "",
        signal.ops.degradedMaterializers.length > 0 ? "One or more materializers are degraded or stale in the bounded health sample." : "",
        signal.ops.runtimeWarnings.length > 0 ? "Runtime configuration warnings remain active in the current Firebase client/server snapshot." : "",
        "Canonical diagnostics should be reviewed directly because the AI assistant did not produce a live summary.",
    ]);
    const affectedSystems = trimList([
        signal.ops.pipelineFailureCount > 0 ? "route pipeline health" : "",
        signal.orchestration.openFindings > 0 ? "behavior orchestration" : "",
        signal.creatorOnboarding.totalIssues > 0 ? "creator onboarding" : "",
        signal.ops.degradedMaterializers.length > 0 ? "analytics materializers" : "",
        signal.ops.runtimeWarnings.length > 0 ? "firebase runtime configuration" : "",
    ]);
    const suggestedNextChecks = trimList([
        signal.ops.recentDiagnostics[0] ? `Inspect recent ${signal.ops.recentDiagnostics[0].channel} diagnostics in Admin Debug.` : "Inspect recent server diagnostics in Admin Debug.",
        signal.ops.topRoutes[0] ? `Review pipeline failures for ${signal.ops.topRoutes[0].route}.` : "",
        signal.orchestration.findings[0] ? `Review orchestration finding: ${signal.orchestration.findings[0].title}.` : "",
        signal.creatorOnboarding.sampleIssues[0] ? `Review creator issue: ${signal.creatorOnboarding.sampleIssues[0].message}.` : "",
    ]);

    return adminAiDebugSummarySchema.parse({
        summary: [
            "AI debug assistant fallback is active.",
            signal.ops.pipelineFailureCount > 0 ? `${signal.ops.pipelineFailureCount} pipeline failures are present in the bounded ops sample.` : "No dominant route failure spike was detected in the bounded ops sample.",
            signal.orchestration.openFindings > 0 ? `${signal.orchestration.openFindings} orchestration findings remain open.` : "No open orchestration findings were present in the bounded sample.",
            signal.creatorOnboarding.totalIssues > 0 ? `${signal.creatorOnboarding.totalIssues} creator onboarding issues are still visible.` : "Creator onboarding diagnostics did not report an issue cluster in the bounded sample.",
        ].join(" "),
        likely_root_causes: likelyRootCauses,
        affected_systems: affectedSystems.length ? affectedSystems : ["canonical diagnostics"],
        confidence_notes: trimList([
            "Fallback summary only; no live Gemini response was used.",
            "This summary is bounded to current admin ops, orchestration, and creator onboarding signals.",
            input.availabilityNote,
        ]),
        suggested_next_checks: suggestedNextChecks.length ? suggestedNextChecks : ["Inspect canonical diagnostics and route health directly in Admin Debug."],
        fallback_used: true,
        enabled: input.settings.enabled,
        runtime_ready: Boolean(input.runtime.project) && input.settings.enabled,
        configured_model: input.settings.model,
        runtime_project: input.runtime.project || undefined,
        runtime_location: input.runtime.location,
        model: input.runtime.model,
        prompt_version: AI_DEBUG_ASSISTANT_PROMPT_VERSION,
        generated_at: signal.generatedAt,
        latency_ms: Math.max(0, Math.round(input.latencyMs || 0)),
        availability_note: input.availabilityNote,
    });
}

export async function generateVertexAiDebugText(input: GenerateTextInput) {
    const vertexAi = new VertexAI({
        project: input.project,
        location: input.location,
    });
    const model = vertexAi.getGenerativeModel({
        model: input.model,
        generationConfig: {
            temperature: 0.2,
            topP: 0.8,
            maxOutputTokens: 700,
            responseMimeType: "application/json",
            responseSchema: ADMIN_AI_DEBUG_RESPONSE_SCHEMA,
        },
    });

    const result = await withTimeout(model.generateContent({
        contents: [{ role: "user", parts: [{ text: input.prompt }] }],
    }), input.timeoutMs);

    const text = extractResponseText(result.response);
    if (!text) {
        throw new Error("Vertex AI returned an empty response.");
    }

    return text;
}

export async function generateAdminAiDebugSummary(
    signal: AdminAiDebugSignalInput,
    options?: {
        runner?: AdminAiDebugTextRunner;
        project?: string;
        location?: string;
        timeoutMs?: number;
        settings?: AdminAiDebugAssistantSettings;
    },
) : Promise<AdminAiDebugSummary> {
    const startedAt = Date.now();
    const settings = options?.settings ?? await getAdminAiDebugAssistantSettings();
    const enabled = isAdminAiDebugAssistantEnabled(settings);

    if (!enabled) {
        return buildAdminAiDebugFallback({
            signal,
            settings,
            runtime: resolveAdminAiDebugVertexRuntime(settings.model),
            availabilityNote: "AI debug assistant is disabled in admin settings.",
            latencyMs: Date.now() - startedAt,
        });
    }

    const runtime = resolveAdminAiDebugVertexRuntime(settings.model);
    const project = options?.project ?? runtime.project;
    const location = options?.location ?? runtime.location;

    if (!project) {
        return buildAdminAiDebugFallback({
            signal,
            settings,
            runtime,
            availabilityNote: "Vertex AI project configuration is missing. Set GOOGLE_CLOUD_PROJECT or FIREBASE_PROJECT_ID before enabling live summaries.",
            latencyMs: Date.now() - startedAt,
        });
    }

    const prompt = buildAdminAiDebugPrompt(signal);
    const runner = options?.runner ?? generateVertexAiDebugText;
    const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    try {
        const rawText = await runner({
            prompt,
            project,
            location,
            model: runtime.model,
            timeoutMs,
        });
        const parsed = adminAiDebugModelOutputSchema.parse(JSON.parse(extractJsonBlock(rawText)));
        const latencyMs = Date.now() - startedAt;

        await recordServerDiagnostic({
            channel: "admin",
            severity: "info",
            message: "Admin AI debug summary generated",
            detail: {
                model: runtime.model,
                promptVersion: AI_DEBUG_ASSISTANT_PROMPT_VERSION,
                location,
                latencyMs,
                fallbackUsed: false,
            },
        });

        return adminAiDebugSummarySchema.parse({
            ...parsed,
            fallback_used: false,
            enabled: settings.enabled,
            runtime_ready: true,
            configured_model: settings.model,
            runtime_project: project,
            runtime_location: location,
            model: runtime.model,
            prompt_version: AI_DEBUG_ASSISTANT_PROMPT_VERSION,
            generated_at: signal.generatedAt,
            latency_ms: latencyMs,
        });
    } catch (error) {
        const latencyMs = Date.now() - startedAt;
        const availabilityNote = summarizeAvailabilityIssue(error);

        recordRouteWarning(
            "admin/debug/assistant",
            "Admin AI debug assistant fallback used",
            error,
            {
                channel: "admin",
                detail: {
                    model: runtime.model,
                    promptVersion: AI_DEBUG_ASSISTANT_PROMPT_VERSION,
                    location,
                    latencyMs,
                    fallbackUsed: true,
                },
            },
        );

        return buildAdminAiDebugFallback({
            signal,
            settings,
            runtime,
            availabilityNote,
            latencyMs,
        });
    }
}
