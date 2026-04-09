import { z } from "zod";

export const AI_DEBUG_ASSISTANT_MODEL = "gemini-2.5-flash-lite";
export const AI_DEBUG_ASSISTANT_PROMPT_VERSION = "debug-assistant-v1";
export const AI_DEBUG_ASSISTANT_FLAG = "AI_DEBUG_ASSISTANT_ENABLED";

const aiDebugListSchema = z.array(z.string().trim().min(1)).max(6);

export const adminAiDebugModelOutputSchema = z.object({
    summary: z.string().trim().min(1).max(1200),
    likely_root_causes: aiDebugListSchema,
    affected_systems: aiDebugListSchema,
    confidence_notes: aiDebugListSchema,
    suggested_next_checks: aiDebugListSchema,
});

export const adminAiDebugSummarySchema = adminAiDebugModelOutputSchema.extend({
    fallback_used: z.boolean(),
    enabled: z.boolean(),
    runtime_ready: z.boolean(),
    configured_model: z.string().trim().min(1),
    runtime_project: z.string().trim().min(1).optional(),
    runtime_location: z.string().trim().min(1).optional(),
    model: z.string().trim().min(1),
    prompt_version: z.string().trim().min(1),
    generated_at: z.string().trim().min(1),
    latency_ms: z.number().int().nonnegative(),
    availability_note: z.string().trim().min(1).max(400).optional(),
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
