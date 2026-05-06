import "server-only";

import { SchemaType, VertexAI, type ResponseSchema } from "@google-cloud/vertexai";

import {
    AI_DEBUG_ASSISTANT_MODEL,
    AI_DEBUG_FIX_PLANNER_MODEL,
    AI_DEBUG_ASSISTANT_PROMPT_VERSION,
    adminAiDebugModelOutputSchema,
    adminAiDebugSummarySchema,
    type AdminAiDebugSignalInput,
    type AdminAiDebugSummary,
} from "@/lib/ai-debug-assistant";
import {
    getAdminAiModelAliasForRole,
    getAdminAiModelDefinitionByAlias,
    normalizeAdminAiModelAliasForRole,
    validateAdminAiModelRoleAssignment,
} from "@/lib/admin-ai-models";
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
        issue_summary: { type: SchemaType.STRING },
        source_evidence: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
        },
        likely_cause: { type: SchemaType.STRING },
        likely_root_causes: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
        },
        affected_systems: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
        },
        safe_fix_plan: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
        },
        files_to_inspect: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
        },
        validators_to_run: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
        },
        apply_eligibility: {
            type: SchemaType.OBJECT,
            properties: {
                state: { type: SchemaType.STRING },
                reason: { type: SchemaType.STRING },
                allowed_fix_types: {
                    type: SchemaType.ARRAY,
                    items: { type: SchemaType.STRING },
                },
            },
            required: ["state", "reason"],
        },
        rollback_note: { type: SchemaType.STRING },
        confidence: { type: SchemaType.STRING },
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
        "issue_summary",
        "source_evidence",
        "likely_cause",
        "likely_root_causes",
        "affected_systems",
        "safe_fix_plan",
        "files_to_inspect",
        "validators_to_run",
        "apply_eligibility",
        "rollback_note",
        "confidence",
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

export type AdminAiDebugFixPlannerAction = "inspect" | "apply" | "dismiss";

function trimList(values: string[], limit = 4) {
    return values
        .map((value) => value.trim())
        .filter((value, index, list) => value.length > 0 && list.indexOf(value) === index)
        .slice(0, limit);
}

function summarizeAvailabilityIssue(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const normalized = message.toLowerCase();

    if (error instanceof SyntaxError || normalized.includes("json")) {
        return "Live AI response could not be parsed into the required debug schema. Showing deterministic fallback.";
    }

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

function buildLiveCallEligibility(settings: AdminAiDebugAssistantSettings, runtimeProject: string) {
    if (!settings.enabled) {
        return {
            liveCallEligible: false,
            costGuardState: "disabled" as const,
        };
    }

    if (!runtimeProject.trim()) {
        return {
            liveCallEligible: false,
            costGuardState: "blocked" as const,
        };
    }

    return {
        liveCallEligible: true,
        costGuardState: "admin_gated" as const,
    };
}

function buildAdminAiDebugResponseState(input: {
    fallbackUsed: boolean;
    savedSummary?: boolean;
}) {
    if (input.fallbackUsed) {
        return "fallback" as const;
    }
    if (input.savedSummary) {
        return "saved" as const;
    }
    return "live" as const;
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
    const model = normalizeAdminAiModelAliasForRole(configuredModel, "admin_debug_assistant") || AI_DEBUG_ASSISTANT_MODEL;
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

export function resolveAdminAiDebugFixPlannerRuntime(configuredModel?: string) {
    const normalized = normalizeAdminAiModelAliasForRole(configuredModel, "admin_debug_fix_planner") || AI_DEBUG_FIX_PLANNER_MODEL;
    const modelDefinition = getAdminAiModelDefinitionByAlias(normalized);
    return {
        project: (
            process.env.GOOGLE_CLOUD_PROJECT
            || process.env.GCLOUD_PROJECT
            || process.env.PROJECT_ID
            || FIREBASE_PROJECT_ID
            || process.env.FIREBASE_PROJECT_ID
            || ""
        ).trim(),
        location: (
            process.env.VERTEX_AI_LOCATION
            || process.env.GOOGLE_CLOUD_LOCATION
            || process.env.GCLOUD_LOCATION
            || modelDefinition?.location
            || DEFAULT_VERTEX_LOCATION
        ).trim() || DEFAULT_VERTEX_LOCATION,
        model: normalized,
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
        "Behave like a senior debug guide producing Jules-level implementation guidance.",
        "You are advisory only. You do not mutate state, you do not invent certainty, and you do not claim a fix is safe unless the evidence supports that.",
        "Use only the bounded operational summaries provided below.",
        "Return JSON only with these exact keys: summary, issue_summary, source_evidence, likely_cause, likely_root_causes, affected_systems, safe_fix_plan, files_to_inspect, validators_to_run, apply_eligibility, rollback_note, confidence, confidence_notes, suggested_next_checks.",
        "Rules:",
        "- Keep each array at 1 to 8 short items.",
        "- Keep the summary concise and operationally useful for an admin/operator.",
        "- issue_summary must be a single issue-style sentence.",
        "- source_evidence must point to concrete facts from the bounded input, not guesses.",
        "- safe_fix_plan must be ordered and conservative.",
        "- files_to_inspect must be repo paths or route names when they are inferable from the bounded signals.",
        "- validators_to_run must be explicit npm commands when inferable from the evidence.",
        "- apply_eligibility.state must be one of inspect_only, applyable, manual_review.",
        "- If you do not have enough evidence for a safe auto-apply, use inspect_only or manual_review.",
        "- confidence must be low, medium, or high.",
        "- Do not mention data you were not given.",
        "- Distinguish probable causes from confidence limitations.",
        "- Prefer naming concrete systems or surfaces over generic wording.",
        "",
        "Bounded operational input:",
        JSON.stringify(signal),
    ].join("\n");
}

export function buildAdminAiDebugFixPlannerPrompt(input: {
    diagnosticMessage: string;
    diagnosticDetail?: string | null;
    action: AdminAiDebugFixPlannerAction;
    fixType?: string | null;
}) {
    return [
        "You are KandyDrops' internal debug fix planner.",
        "You are planning, not auto-editing code.",
        "Return JSON only with these exact keys: issue_summary, source_evidence, likely_cause, safe_fix_plan, files_to_inspect, validators_to_run, apply_eligibility, rollback_note, confidence.",
        "Rules:",
        "- Never emit a patch or arbitrary file edits.",
        "- apply_eligibility.state must be inspect_only or manual_review unless the requested fixType is obviously safe and bounded.",
        "- If the request is unsupported, mark apply_eligibility.state as manual_review.",
        `Requested action: ${input.action}`,
        `Requested fix type: ${input.fixType || "unknown"}`,
        "",
        "Diagnostic message:",
        input.diagnosticMessage || "None",
        "",
        "Diagnostic detail:",
        input.diagnosticDetail?.trim() || "None",
    ].join("\n");
}

export function buildAdminAiDebugFallback(input: {
    signal: AdminAiDebugSignalInput;
    settings: AdminAiDebugAssistantSettings;
    runtime: ReturnType<typeof resolveAdminAiDebugVertexRuntime>;
    availabilityNote: string;
    latencyMs?: number;
    fallbackReason?: string;
}) : AdminAiDebugSummary {
    const signal = input.signal;
    const eligibility = buildLiveCallEligibility(input.settings, input.runtime.project);
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
        issue_summary: "Live AI guidance is unavailable, so deterministic fallback is summarizing the current bounded evidence.",
        source_evidence: trimList([
            signal.ops.recentDiagnostics[0] ? `${signal.ops.recentDiagnostics[0].channel}: ${signal.ops.recentDiagnostics[0].message}` : "",
            signal.ops.topRoutes[0] ? `${signal.ops.topRoutes[0].route} has ${signal.ops.topRoutes[0].count} recent failures.` : "",
            signal.orchestration.findings[0] ? `${signal.orchestration.findings[0].title}: ${signal.orchestration.findings[0].summary}` : "",
            signal.creatorOnboarding.sampleIssues[0] ? `${signal.creatorOnboarding.sampleIssues[0].message}: ${signal.creatorOnboarding.sampleIssues[0].detail}` : "",
        ]),
        likely_cause: likelyRootCauses[0] || "The assistant could not verify a live model response, so canonical diagnostics remain the primary source of truth.",
        likely_root_causes: likelyRootCauses,
        affected_systems: affectedSystems.length ? affectedSystems : ["canonical diagnostics"],
        safe_fix_plan: trimList([
            "Inspect the current canonical diagnostics before making changes.",
            suggestedNextChecks[0] || "",
            suggestedNextChecks[1] || "",
            "Run the listed validators after any bounded change.",
        ]),
        files_to_inspect: trimList([
            "src/lib/server/ai-debug-assistant.ts",
            "src/app/api/admin/debug/assistant/route.ts",
            signal.ops.topRoutes[0] ? `route:${signal.ops.topRoutes[0].route}` : "",
        ]),
        validators_to_run: trimList([
            "npm run check:admin-ai-control-tower",
            "npm run check:admin-debug-control-tower",
            input.runtime.project ? "npm run check:google-cost" : "",
        ]),
        apply_eligibility: {
            state: "inspect_only",
            reason: "Fallback output is advisory only. No safe auto-apply path is implied without a verified live plan.",
            allowed_fix_types: ["inspect"],
        },
        rollback_note: "No server or product state was mutated by fallback generation.",
        confidence: "medium",
        confidence_notes: trimList([
            "Fallback summary only; no live Gemini response was used.",
            "This summary is bounded to current admin ops, orchestration, and creator onboarding signals.",
            input.availabilityNote,
        ]),
        suggested_next_checks: suggestedNextChecks.length ? suggestedNextChecks : ["Inspect canonical diagnostics and route health directly in Admin Debug."],
        fallback_used: true,
        response_state: buildAdminAiDebugResponseState({ fallbackUsed: true }),
        enabled: input.settings.enabled,
        runtime_ready: Boolean(input.runtime.project) && input.settings.enabled,
        live_call_eligible: eligibility.liveCallEligible,
        cost_guard_state: eligibility.costGuardState,
        provider: "vertex_ai",
        model_role: "admin_debug_assistant",
        configured_model: input.settings.model,
        runtime_project: input.runtime.project || undefined,
        runtime_location: input.runtime.location,
        model: input.runtime.model,
        prompt_version: AI_DEBUG_ASSISTANT_PROMPT_VERSION,
        generated_at: signal.generatedAt,
        latency_ms: Math.max(0, Math.round(input.latencyMs || 0)),
        availability_note: input.availabilityNote,
        fallback_reason: input.fallbackReason || "live_ai_unavailable",
        last_live_call_at: input.settings.lastLiveCallAtMs ? new Date(input.settings.lastLiveCallAtMs).toISOString() : undefined,
    });
}

export function buildAdminAiDebugSavedSummary(input: {
    signal: AdminAiDebugSignalInput;
    settings: AdminAiDebugAssistantSettings;
    runtime: ReturnType<typeof resolveAdminAiDebugVertexRuntime>;
    savedSummary: AdminAiDebugSummary;
}) {
    const eligibility = buildLiveCallEligibility(input.settings, input.runtime.project);
    return adminAiDebugSummarySchema.parse({
        ...input.savedSummary,
        response_state: buildAdminAiDebugResponseState({ fallbackUsed: false, savedSummary: true }),
        fallback_used: false,
        enabled: input.settings.enabled,
        runtime_ready: Boolean(input.runtime.project) && input.settings.enabled,
        live_call_eligible: eligibility.liveCallEligible,
        cost_guard_state: eligibility.costGuardState,
        provider: "vertex_ai",
        model_role: "admin_debug_assistant",
        configured_model: input.settings.model,
        runtime_project: input.runtime.project || input.savedSummary.runtime_project,
        runtime_location: input.runtime.location || input.savedSummary.runtime_location,
        model: input.savedSummary.model || input.runtime.model,
        availability_note: "Live AI summary is delayed. Showing the latest saved guidance.",
        fallback_reason: undefined,
        last_live_call_at: input.settings.lastLiveCallAtMs ? new Date(input.settings.lastLiveCallAtMs).toISOString() : input.savedSummary.last_live_call_at,
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

export async function planAdminAiDebugFix(input: {
    action: AdminAiDebugFixPlannerAction;
    diagnosticMessage: string;
    diagnosticDetail?: string | null;
    fixType?: string | null;
    settings: AdminAiDebugAssistantSettings;
}) {
    const runtime = resolveAdminAiDebugFixPlannerRuntime(input.settings.model);
    const roleValidation = validateAdminAiModelRoleAssignment("admin_debug_fix_planner", runtime.model);

    if (!input.settings.enabled) {
        return {
            status: "fix_requires_manual_review" as const,
            actionability: "manual_review" as const,
            reason: "AI debug assistant is disabled in admin settings.",
        };
    }

    if (!runtime.project || !roleValidation.ok) {
        return {
            status: "fix_requires_manual_review" as const,
            actionability: "manual_review" as const,
            reason: !runtime.project
                ? "Vertex AI project configuration is missing."
                : roleValidation.reason,
        };
    }

    if (input.action === "dismiss") {
        return {
            status: "fix_dismissed" as const,
            actionability: "inspect_only" as const,
            reason: "Diagnostic was explicitly dismissed by an admin action.",
        };
    }

    if (input.action === "apply") {
        return {
            status: "fix_requires_manual_review" as const,
            actionability: "manual_review" as const,
            reason: "Auto-apply is not enabled for this debug assistant fix type. Use inspect or a bounded repair proposal.",
        };
    }

    const rawText = await generateVertexAiDebugText({
        prompt: buildAdminAiDebugFixPlannerPrompt(input),
        project: runtime.project,
        location: runtime.location,
        model: runtime.model,
        timeoutMs: DEFAULT_TIMEOUT_MS,
    });
    const parsed = adminAiDebugModelOutputSchema.pick({
        issue_summary: true,
        source_evidence: true,
        likely_cause: true,
        safe_fix_plan: true,
        files_to_inspect: true,
        validators_to_run: true,
        apply_eligibility: true,
        rollback_note: true,
        confidence: true,
    }).parse(JSON.parse(extractJsonBlock(rawText)));

    return {
        status: "fix_requires_manual_review" as const,
        actionability: parsed.apply_eligibility.state,
        plan: parsed,
        reason: parsed.apply_eligibility.reason,
    };
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
    const roleValidation = validateAdminAiModelRoleAssignment("admin_debug_assistant", settings.model);

    if (!enabled) {
        return buildAdminAiDebugFallback({
            signal,
            settings,
            runtime: resolveAdminAiDebugVertexRuntime(settings.model),
            availabilityNote: "AI debug assistant is disabled in admin settings.",
            latencyMs: Date.now() - startedAt,
            fallbackReason: "assistant_disabled",
        });
    }

    if (!roleValidation.ok) {
        return buildAdminAiDebugFallback({
            signal,
            settings,
            runtime: resolveAdminAiDebugVertexRuntime(settings.model),
            availabilityNote: roleValidation.reason,
            latencyMs: Date.now() - startedAt,
            fallbackReason: "invalid_model_assignment",
        });
    }

    const runtime = resolveAdminAiDebugVertexRuntime(settings.model);
    const project = options?.project ?? runtime.project;
    const location = options?.location ?? runtime.location;
    const eligibility = buildLiveCallEligibility(settings, project);

    if (!project) {
        return buildAdminAiDebugFallback({
            signal,
            settings,
            runtime,
            availabilityNote: "Vertex AI project configuration is missing. Set GOOGLE_CLOUD_PROJECT or FIREBASE_PROJECT_ID before enabling live summaries.",
            latencyMs: Date.now() - startedAt,
            fallbackReason: "missing_vertex_project",
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
                modelRole: "admin_debug_assistant",
                promptVersion: AI_DEBUG_ASSISTANT_PROMPT_VERSION,
                location,
                latencyMs,
                fallbackUsed: false,
                liveCallEligible: eligibility.liveCallEligible,
                costGuardState: eligibility.costGuardState,
            },
        });

        return adminAiDebugSummarySchema.parse({
            ...parsed,
            fallback_used: false,
            response_state: buildAdminAiDebugResponseState({ fallbackUsed: false }),
            enabled: settings.enabled,
            runtime_ready: true,
            live_call_eligible: eligibility.liveCallEligible,
            cost_guard_state: eligibility.costGuardState,
            provider: "vertex_ai",
            model_role: "admin_debug_assistant",
            configured_model: settings.model,
            runtime_project: project,
            runtime_location: location,
            model: runtime.model,
            prompt_version: AI_DEBUG_ASSISTANT_PROMPT_VERSION,
            generated_at: signal.generatedAt,
            latency_ms: latencyMs,
            last_live_call_at: new Date().toISOString(),
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
                    modelRole: "admin_debug_assistant",
                    promptVersion: AI_DEBUG_ASSISTANT_PROMPT_VERSION,
                    location,
                    latencyMs,
                    fallbackUsed: true,
                    liveCallEligible: eligibility.liveCallEligible,
                    costGuardState: eligibility.costGuardState,
                },
            },
        );

        return buildAdminAiDebugFallback({
            signal,
            settings,
            runtime,
            availabilityNote,
            latencyMs,
            fallbackReason: error instanceof SyntaxError ? "response_parse_failed" : "live_call_failed",
        });
    }
}
