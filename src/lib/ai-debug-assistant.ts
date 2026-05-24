import { z } from "zod";
import { getAdminAiModelAliasForRole } from "@/lib/admin-ai-models";

export const AI_DEBUG_ASSISTANT_MODEL = getAdminAiModelAliasForRole("admin_debug_assistant");
export const AI_DEBUG_FIX_PLANNER_MODEL = getAdminAiModelAliasForRole("admin_debug_fix_planner");
export const AI_DEBUG_ASSISTANT_PROMPT_VERSION = "debug-assistant-v2";
export const AI_DEBUG_ASSISTANT_FLAG = "AI_DEBUG_ASSISTANT_ENABLED";

const aiDebugListSchema = z.array(z.string().trim().min(1)).max(8);
const aiDebugConfidenceSchema = z.enum(["low", "medium", "high"]);
const aiDebugApplyStateSchema = z.enum(["inspect_only", "applyable", "manual_review"]);

export const adminAiDebugModelOutputSchema = z.object({
    summary: z.string().trim().min(1).max(1200),
    issue_summary: z.string().trim().min(1).max(500),
    source_evidence: aiDebugListSchema,
    likely_cause: z.string().trim().min(1).max(400),
    likely_root_causes: aiDebugListSchema,
    affected_systems: aiDebugListSchema,
    safe_fix_plan: aiDebugListSchema,
    files_to_inspect: aiDebugListSchema,
    validators_to_run: aiDebugListSchema,
    apply_eligibility: z.object({
        state: aiDebugApplyStateSchema,
        reason: z.string().trim().min(1).max(240),
        allowed_fix_types: aiDebugListSchema.optional(),
    }),
    rollback_note: z.string().trim().min(1).max(240),
    confidence: aiDebugConfidenceSchema,
    confidence_notes: aiDebugListSchema,
    suggested_next_checks: aiDebugListSchema,
});

export const adminAiDebugSummarySchema = adminAiDebugModelOutputSchema.extend({
    fallback_used: z.boolean(),
    response_state: z.enum(["live", "saved", "fallback"]),
    enabled: z.boolean(),
    runtime_ready: z.boolean(),
    live_call_eligible: z.boolean(),
    cost_guard_state: z.enum(["admin_gated", "blocked", "disabled"]),
    provider: z.literal("vertex_ai"),
    model_role: z.literal("admin_debug_assistant"),
    configured_model: z.string().trim().min(1),
    resolved_model: z.string().trim().min(1),
    runtime_project: z.string().trim().min(1).optional(),
    runtime_location: z.string().trim().min(1).optional(),
    runtime_checked_at: z.string().trim().min(1).optional(),
    model: z.string().trim().min(1),
    saved_summary_model: z.string().trim().min(1).optional(),
    prompt_version: z.string().trim().min(1),
    generated_at: z.string().trim().min(1),
    debug_evidence_generated_at: z.string().trim().min(1),
    live_summary_status: z.enum(["live", "delayed", "failed", "disabled", "fallback"]),
    live_summary_generated_at: z.string().trim().min(1).optional(),
    saved_summary_generated_at: z.string().trim().min(1).optional(),
    displayed_summary_source: z.enum(["live_model", "saved_guidance", "deterministic_fallback"]),
    displayed_summary_generated_at: z.string().trim().min(1).optional(),
    displayed_summary_freshness: z.enum(["fresh", "stale", "unknown"]),
    displayed_summary_freshness_reason: z.string().trim().min(1).optional(),
    last_model_call_at: z.string().trim().min(1).optional(),
    last_model_latency_ms: z.number().int().nonnegative().nullable().optional(),
    last_fallback_generated_at: z.string().trim().min(1).optional(),
    last_fallback_latency_ms: z.number().int().nonnegative().nullable().optional(),
    latency_ms: z.number().int().nonnegative(),
    budget_guard: z.object({
        killSwitch: z.boolean(),
        modelAllowlist: z.boolean(),
        estimatedInputTokens: z.number().int().nonnegative(),
        maxEstimatedInputTokens: z.number().int().positive(),
        maxOutputTokens: z.number().int().positive(),
        timeoutMs: z.number().int().positive(),
        promptCharLength: z.number().int().nonnegative(),
        providerCallsInValidators: z.literal(false),
    }).optional(),
    estimated_input_tokens: z.number().int().nonnegative().optional(),
    max_estimated_input_tokens: z.number().int().positive().optional(),
    max_output_tokens: z.number().int().positive().optional(),
    prompt_char_count: z.number().int().nonnegative().optional(),
    availability_note: z.string().trim().min(1).max(400).optional(),
    fallback_reason: z.string().trim().min(1).max(240).optional(),
    last_live_call_at: z.string().trim().min(1).optional(),
});

export type AdminAiDebugSummary = z.infer<typeof adminAiDebugSummarySchema>;

export type AdminAiDebugSignalInput = {
    generatedAt: string;
    ops: {
        score: number;
        pipelineFailureCount: number;
        lastPipelineFailureAt: number;
        topRoutes: Array<{
            route: string;
            count: number;
        }>;
        degradedMaterializers: Array<{
            label: string;
            status: string;
            detail: string;
        }>;
        runtimeWarnings: string[];
        diagnosticChannels: Array<{
            label: string;
            errorCount: number;
            warnCount: number;
            count: number;
        }>;
        recentDiagnostics: Array<{
            channel: string;
            severity: string;
            message: string;
            detailPreview: string;
        }>;
    };
    orchestration: {
        score: number;
        openFindings: number;
        criticalFindings: number;
        actionableProposals: number;
        contaminationRisks: number;
        lowConfidenceEvents: number;
        topDomains: Array<{
            key: string;
            eventCount: number;
            openFindingCount: number;
        }>;
        findings: Array<{
            title: string;
            severity: string;
            summary: string;
            fixSummary: string;
        }>;
    };
    creatorOnboarding: {
        totalIssues: number;
        missingQueueCount: number;
        missingSourceCount: number;
        projectionWithoutSourceCount: number;
        queueParityMismatchCount: number;
        missingIdMetadataCount: number;
        stuckAwaitingReviewCount: number;
        roleMismatchCount: number;
        sampleIssues: Array<{
            severity: string;
            message: string;
            detail: string;
        }>;
    };
};
