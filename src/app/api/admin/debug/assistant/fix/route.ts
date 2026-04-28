import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/server/auth";
import { ADMIN_DEBUG_ASSISTANT } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { getErrorMessage } from "@/lib/server/route-diagnostics";
import { recordRouteRuntimeSample, withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";
import { getAdminAiDebugAssistantSettings } from "@/lib/server/admin-debug-settings";
import { resolveAdminAiDebugVertexRuntime, generateVertexAiDebugText } from "@/lib/server/ai-debug-assistant";

export const dynamic = "force-dynamic";

async function POST_handler(request: NextRequest) {
    const startedAt = Date.now();
    const finalize = (response: NextResponse, error?: unknown) => {
        void recordRouteRuntimeSample({
            key: "admin/debug/assistant/fix:POST",
            durationMs: Date.now() - startedAt,
            statusCode: response.status,
            errorMessage: error ? getErrorMessage(error) : null,
        });
        return response;
    };

    try {
        const caller = await guardApiRequest(request, {
            routeName: "admin/debug/assistant/fix",
            rateLimit: ADMIN_DEBUG_ASSISTANT,
            requireTrustedOrigin: true,
            auth: "admin",
            scopeToCaller: true,
        });

        if (!caller) {
            return finalize(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
        }

        const body = await request.json() as {
            diagnosticMessage?: string;
            diagnosticDetail?: string;
        };

        const settings = await getAdminAiDebugAssistantSettings();
        if (!settings.enabled) {
            return finalize(NextResponse.json({ error: "AI Assistant is disabled." }, { status: 400 }));
        }

        const runtime = resolveAdminAiDebugVertexRuntime(settings.model);
        if (!runtime.project) {
            return finalize(NextResponse.json({ error: "Vertex AI project configuration is missing." }, { status: 400 }));
        }

        const prompt = [
            "You are a senior software engineer acting as an auto-fixing agent (like Jules CLI).",
            "You are given a diagnostic error message and detail from a production environment.",
            "Your task is to propose a fix for this issue in the codebase.",
            "If you know the likely fix, return a STRICT Unified Diff (.patch format) that can be applied to fix the issue.",
            "Wrap the patch in a ```diff block.",
            "If you cannot determine a fix, explain why briefly.",
            "",
            "Diagnostic Message:",
            body.diagnosticMessage || "None",
            "",
            "Diagnostic Detail:",
            body.diagnosticDetail || "None"
        ].join("\n");

        const rawText = await generateVertexAiDebugText({
            prompt,
            project: runtime.project,
            location: runtime.location,
            model: runtime.model,
            timeoutMs: 25000,
        });

        const diffMatch = rawText.match(/```(?:diff|patch)\n([\s\S]*?)```/i);
        const patch = diffMatch ? diffMatch[1].trim() : rawText.trim();

        return finalize(NextResponse.json({
            success: true,
            patch,
            rawText
        }, { status: 200 }));

    } catch (error) {
        return finalize(handleApiError(error, "admin/debug/assistant/fix"), error);
    }
}

export let POST = withRouteRuntimeHealth("admin/debug/assistant/fix:POST", POST_handler);
