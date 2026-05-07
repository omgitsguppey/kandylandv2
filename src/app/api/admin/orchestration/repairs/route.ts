import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { handleApiError } from "@/lib/server/auth";
import { adminDb } from "@/lib/server/firebase-admin";
import { ORCHESTRATION_COLLECTIONS } from "@/lib/orchestration/contract";
import { ADMIN } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";
import { buildNotFoundResponse } from "@/lib/server/not-found";

const repairActionSchema = z.object({
    proposalId: z.string().trim().min(1),
    action: z.enum(["apply", "dismiss"]),
});

async function POST_handler(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "admin/orchestration/repairs",
            preAuthRouteName: "admin/orchestration/repairs/preauth",
            auth: "admin",
            scopeToCaller: true,
            rateLimit: ADMIN,
            requireTrustedOrigin: true,
        });

        if (!caller || !adminDb) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { proposalId, action } = repairActionSchema.parse(await request.json());
        const proposalRef = adminDb.collection(ORCHESTRATION_COLLECTIONS.repairProposals).doc(proposalId);
        // bounded document read: repair actions target one explicit proposal id.
        const proposalSnap = await proposalRef.get();
        if (!proposalSnap.exists) {
            return buildNotFoundResponse("repair_proposal", "Repair proposal not found");
        }

        const proposal = proposalSnap.data() as Record<string, unknown>;
        const nowMs = Date.now();

        if (action === "dismiss") {
            await proposalRef.set({
                status: "dismissed",
                updatedAtMs: nowMs,
                reviewedBy: caller.uid,
                reviewedAtMs: nowMs,
            }, { merge: true });

            const findingKey = typeof proposal.findingKey === "string" ? proposal.findingKey : "";
            if (findingKey) {
                await adminDb.collection(ORCHESTRATION_COLLECTIONS.findings).doc(proposalId).set({
                    status: "dismissed",
                    updatedAtMs: nowMs,
                }, { merge: true });
            }

            return NextResponse.json({ success: true, action: "dismissed" });
        }

        if (proposal.actionType !== "rebuild_projection") {
            return NextResponse.json({
                error: "This proposal is review-only and does not support automatic repair.",
            }, { status: 400 });
        }

        const actionRef = adminDb.collection(ORCHESTRATION_COLLECTIONS.repairActions).doc();
        await Promise.all([
            actionRef.set({
                proposalId,
                findingKey: proposal.findingKey ?? "",
                actionType: "rebuild_projection",
                status: "pending",
                sourceCollection: proposal.sourceCollection ?? "",
                sourceDocumentId: proposal.sourceDocumentId ?? "",
                sourceDocumentPath: proposal.sourceDocumentPath ?? "",
                sourceDocumentKey: proposal.sourceDocumentKey ?? "",
                createdAtMs: nowMs,
                confirmedBy: caller.uid,
                confirmedAtMs: nowMs,
            }),
            proposalRef.set({
                status: "applying",
                updatedAtMs: nowMs,
                reviewedBy: caller.uid,
                reviewedAtMs: nowMs,
                activeRepairActionId: actionRef.id,
            }, { merge: true }),
            typeof proposal.findingKey === "string" && proposal.findingKey.length > 0
                ? adminDb.collection(ORCHESTRATION_COLLECTIONS.findings).doc(proposalId).set({
                    status: "applying",
                    updatedAtMs: nowMs,
                }, { merge: true })
                : Promise.resolve(),
        ]);

        return NextResponse.json({
            success: true,
            action: "applying",
            repairActionId: actionRef.id,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Invalid repair request" }, { status: 400 });
        }

        return handleApiError(error, "Admin.OrchestrationRepairs.POST");
    }
}

export let POST = withRouteRuntimeHealth("admin/orchestration/repairs:POST", POST_handler);
