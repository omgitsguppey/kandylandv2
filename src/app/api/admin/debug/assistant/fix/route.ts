import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/server/auth";
import { ADMIN_DEBUG_ASSISTANT } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { getErrorMessage } from "@/lib/server/route-diagnostics";
import { recordRouteRuntimeSample, withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";
import { recordServerDiagnostic } from "@/lib/server/server-diagnostics";
import { buildAiRepairApplyContract } from "@/lib/debug/ai-repair-apply-contract";
import { evaluateAiRepairApprovalGate } from "@/lib/debug/ai-repair-approval-gate";
import { reviewAiRepairProposal } from "@/lib/debug/ai-repair-critic";
import { createAiRepairProposalRecord, sanitizeAiRepairProposalForStore } from "@/lib/debug/ai-repair-proposal-store";
import type { AiRepairWorkItem } from "@/lib/debug/ai-repair-workbench-contract";

export const dynamic = "force-dynamic";

const SUPPORTED_FIX_TYPES = new Set([
    "inspect_diagnostic",
    "dismiss_diagnostic",
]);
const MANUAL_PATCH_REQUIRED_STATUS = "manual_patch_required";

type AdminAiDebugFixPlannerAction = "inspect" | "apply" | "dismiss";

function buildDiagnosticWorkItem(input: {
    diagnosticMessage: string;
    diagnosticDetail: string;
    fixType: string;
}): AiRepairWorkItem {
    const sourcePatchCandidate = /route context|orchestration|projection|materializer|pipeline|source/i.test(`${input.diagnosticMessage} ${input.diagnosticDetail}`);
    return {
        workItemId: `assistant-fix-${input.fixType.toLowerCase().replace(/[^a-z0-9]+/gu, "-")}`,
        title: input.diagnosticMessage.slice(0, 120) || "Assistant repair proposal",
        sourceKind: sourcePatchCandidate ? "orchestration_finding" : "manual_operator_note",
        sourceRef: `assistant/fix:${input.fixType}`,
        owner: "admin_debug",
        severity: sourcePatchCandidate ? "medium" : "low",
        scoreImpact: sourcePatchCandidate ? 4 : 1,
        risk: ["ops"],
        status: sourcePatchCandidate ? "critic_required" : "deterministic_plan_ready",
        sourceEvidence: [input.diagnosticMessage, input.diagnosticDetail].filter(Boolean),
        redactionClass: "internal",
        allowedModes: sourcePatchCandidate ? ["inspect_only", "source_patch_candidate"] : ["inspect_only", "manual_operator_action"],
        selectedMode: sourcePatchCandidate ? "source_patch_candidate" : "inspect_only",
        applyEligibility: sourcePatchCandidate ? "critic_required" : "inspect_only",
        validators: ["npm run check:admin-ai-control-tower", "npm run check:admin-debug-control-tower"],
        filesToInspect: ["src/lib/server/ai-debug-assistant.ts", "src/app/api/admin/debug/assistant/fix/route.ts"],
        filesPotentiallyTouched: sourcePatchCandidate ? ["src/lib/server/ai-debug-assistant.ts"] : [],
        rollbackPlan: "No source or production state mutation occurs through assistant/fix; discard the manual patch packet if rejected.",
        nextAction: sourcePatchCandidate
            ? "Prepare a reviewable source patch packet with critic and human approval gates."
            : "Inspect the diagnostic and decide whether a manual operator action is needed.",
    };
}

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

        const workItem = buildDiagnosticWorkItem({
            diagnosticMessage,
            diagnosticDetail,
            fixType: fixType || "inspect_diagnostic",
        });
        const proposal = createAiRepairProposalRecord({
            workItemId: workItem.workItemId,
            mode: action === "apply" ? "source_patch_candidate" : workItem.selectedMode,
            filesToChange: action === "apply" || workItem.selectedMode === "source_patch_candidate" ? workItem.filesPotentiallyTouched : [],
            validators: workItem.validators,
            patchSummary: workItem.nextAction,
            rollbackPlan: workItem.rollbackPlan,
            createdBy: caller.uid,
        });
        const criticReview = reviewAiRepairProposal(proposal);
        const approval = evaluateAiRepairApprovalGate({ proposal, criticReview });
        const reviewedProposal = sanitizeAiRepairProposalForStore({
            ...proposal,
            criticReview,
            approval,
            status: approval.status,
            autoApplyAllowed: false,
            humanApprovalRequired: approval.humanApprovalRequired,
            criticRequired: proposal.mode === "source_patch_candidate",
        });
        const applyContract = buildAiRepairApplyContract(reviewedProposal);

        await recordServerDiagnostic({
            channel: "admin",
            severity: "warn",
            message: "Admin AI debug assistant repair proposal created",
            detail: {
                actorAdminId: caller.uid,
                actorAdminEmail: caller.email || "",
                action,
                fixType: fixType || "inspect_diagnostic",
                proposalId: reviewedProposal.proposalId,
                status: reviewedProposal.status,
                actionability: applyContract.status,
                sourceMutationAllowed: applyContract.sourceMutationAllowed,
                productionMutationAllowed: applyContract.productionMutationAllowed,
            },
        });

        return finalize(NextResponse.json({
            success: true,
            status: applyContract.status,
            actionability: applyContract.status,
            reason: `assistant/fix now returns a reviewable proposal packet only. Expected source patch status is ${MANUAL_PATCH_REQUIRED_STATUS}; no silent source or production mutation is allowed.`,
            proposal: reviewedProposal,
            applyContract,
            plan: {
                issue_summary: workItem.title,
                source_evidence: workItem.sourceEvidence,
                likely_cause: "Diagnostic requires bounded inspection before implementation.",
                safe_fix_plan: applyContract.instructions,
                files_to_inspect: workItem.filesToInspect,
                validators_to_run: applyContract.validators,
                apply_eligibility: {
                    state: reviewedProposal.mode,
                    reason: reviewedProposal.approval.reason,
                    allowed_fix_types: ["inspect", "manual_patch_packet"],
                },
                rollback_note: applyContract.rollbackPlan,
                criticReview,
                approval,
            },
        }, { status: 200 }));
    } catch (error) {
        return finalize(handleApiError(error, "admin/debug/assistant/fix"), error);
    }
}

export let POST = withRouteRuntimeHealth("admin/debug/assistant/fix:POST", POST_handler);
