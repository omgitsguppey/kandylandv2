import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/server/auth";
import { ADMIN_DEBUG_ASSISTANT } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { getErrorMessage } from "@/lib/server/route-diagnostics";
import { recordRouteRuntimeSample, withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";
import { getAdminAiDebugAssistantSettings } from "@/lib/server/admin-debug-settings";
import { planAdminAiDebugFix, type AdminAiDebugFixPlannerAction } from "@/lib/server/ai-debug-assistant";
import { recordServerDiagnostic } from "@/lib/server/server-diagnostics";

export const dynamic = "force-dynamic";

const SUPPORTED_FIX_TYPES = new Set([
    "inspect_diagnostic",
    "dismiss_diagnostic",
]);

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
            action?: unknown;
            fixType?: unknown;
            diagnosticId?: unknown;
            diagnosticMessage?: unknown;
            diagnosticDetail?: unknown;
        };

        const action = body.action === "inspect" || body.action === "apply" || body.action === "dismiss"
            ? body.action as AdminAiDebugFixPlannerAction
            : null;
        const fixType = typeof body.fixType === "string" ? body.fixType.trim() : "";
        const diagnosticMessage = typeof body.diagnosticMessage === "string" ? body.diagnosticMessage.trim() : "";
        const diagnosticDetail = typeof body.diagnosticDetail === "string" ? body.diagnosticDetail.trim() : "";

        if (!action || !diagnosticMessage) {
            return finalize(NextResponse.json({
                error: "Missing required assistant fix inputs.",
                errorCode: "unsupported_fix_type",
            }, { status: 400 }));
        }

        if (fixType && !SUPPORTED_FIX_TYPES.has(fixType)) {
            return finalize(NextResponse.json({
                error: "This debug assistant fix type is not supported for safe application.",
                errorCode: "unsupported_fix_type",
                status: "unsupported_fix_type",
                actionability: "manual_review",
            }, { status: 400 }));
        }

        if (action === "dismiss") {
            await recordServerDiagnostic({
                channel: "admin",
                severity: "info",
                message: "Admin AI debug assistant diagnostic dismissed",
                detail: {
                    actorAdminId: caller.uid,
                    actorAdminEmail: caller.email || "",
                    diagnosticId: typeof body.diagnosticId === "string" ? body.diagnosticId : "",
                    fixType: fixType || "dismiss_diagnostic",
                },
            });

            return finalize(NextResponse.json({
                success: true,
                status: "fix_dismissed",
                actionability: "inspect_only",
                reason: "Diagnostic was dismissed explicitly by an admin.",
            }, { status: 200 }));
        }

        const settings = await getAdminAiDebugAssistantSettings();
        const result = await planAdminAiDebugFix({
            action,
            diagnosticMessage,
            diagnosticDetail,
            fixType: fixType || "inspect_diagnostic",
            settings,
        });

        await recordServerDiagnostic({
            channel: "admin",
            severity: result.status === "fix_dismissed" ? "info" : "warn",
            message: "Admin AI debug assistant fix planner invoked",
            detail: {
                actorAdminId: caller.uid,
                actorAdminEmail: caller.email || "",
                action,
                fixType: fixType || "inspect_diagnostic",
                status: result.status,
                actionability: result.actionability,
            },
        });

        if (result.status === "fix_requires_manual_review") {
            return finalize(NextResponse.json({
                success: true,
                status: "fix_requires_manual_review",
                actionability: result.actionability,
                reason: result.reason,
                plan: result.plan || null,
                errorCode: "fix_requires_manual_review",
            }, { status: 200 }));
        }

        return finalize(NextResponse.json({
            success: true,
            status: result.status,
            actionability: result.actionability,
            reason: result.reason,
            plan: result.plan || null,
        }, { status: 200 }));
    } catch (error) {
        return finalize(handleApiError(error, "admin/debug/assistant/fix"), error);
    }
}

export let POST = withRouteRuntimeHealth("admin/debug/assistant/fix:POST", POST_handler);
