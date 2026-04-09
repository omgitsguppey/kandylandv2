import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/server/auth";
import { buildAdminOpsHealth } from "@/lib/server/admin-ops-health";
import { buildAdminOrchestrationSnapshot } from "@/lib/server/admin-orchestration";
import { buildCreatorOnboardingDiagnostics } from "@/lib/server/creator-onboarding-diagnostics";
import { adminDb } from "@/lib/server/firebase-admin";
import { buildAdminAiDebugSignalInput, generateAdminAiDebugSummary } from "@/lib/server/ai-debug-assistant";
import { ORCHESTRATION_COLLECTIONS } from "@/lib/orchestration/contract";
import { ADMIN_DEBUG_ASSISTANT } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { getErrorMessage } from "@/lib/server/route-diagnostics";
import { recordRouteRuntimeSample } from "@/lib/server/route-runtime-health";
import { CREATOR_ONBOARDING_COLLECTION, CREATOR_REVIEW_QUEUE_COLLECTION } from "@/lib/server/creator-onboarding";
import { getCSTDateKey } from "@/lib/timezone";

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
    const startedAt = Date.now();
    const finalize = (response: NextResponse, error?: unknown) => {
        void recordRouteRuntimeSample({
            key: "admin/debug/assistant:GET",
            durationMs: Date.now() - startedAt,
            statusCode: response.status,
            errorMessage: error ? getErrorMessage(error) : null,
        });
        return response;
    };

    try {
        await guardApiRequest(request, {
            routeName: "admin/debug/assistant",
            preAuthRouteName: "admin/debug/assistant/preauth",
            preAuthRateLimit: ADMIN_DEBUG_ASSISTANT,
            rateLimit: ADMIN_DEBUG_ASSISTANT,
            auth: "admin",
            scopeToCaller: true,
        });

        const nowMs = Date.now();
        const weekAgoMs = nowMs - ONE_WEEK_MS;
        const weekAgoDayKey = getCSTDateKey(weekAgoMs);

        const [
            usersSnapshot,
            diagnosticsSnapshot,
            pipelineSnapshot,
            eventStatsSnapshot,
            taskRollupSnapshot,
            guestBatchesSnapshot,
            securityEventsSnapshot,
            watchSessionsSnapshot,
            watchAssetsSnapshot,
            commerceSummarySnapshot,
            orchestrationEventsSnapshot,
            orchestrationFindingsSnapshot,
            orchestrationProposalsSnapshot,
            orchestrationActorSummariesSnapshot,
            orchestrationRepairActionsSnapshot,
            creatorOnboardingSnapshot,
            creatorReviewQueueSnapshot,
        ] = await Promise.all([
            adminDb.collection("users").get(),
            adminDb.collection("server_diagnostics")
                .where("createdAtMs", ">=", weekAgoMs)
                .orderBy("createdAtMs", "desc")
                .limit(80)
                .get(),
            adminDb.collection("analytics_pipeline_daily")
                .where("dayKey", ">=", weekAgoDayKey)
                .get(),
            adminDb.collection("analytics_event_stats").get(),
            adminDb.collection("analytics_task_rollup").get(),
            adminDb.collection("analytics_guest_batches")
                .where("receivedAtMs", ">=", weekAgoMs)
                .orderBy("receivedAtMs", "desc")
                .limit(40)
                .get(),
            adminDb.collection("security_events")
                .where("timestamp", ">=", weekAgoMs)
                .orderBy("timestamp", "desc")
                .limit(40)
                .get(),
            adminDb.collection("analytics_watch_sessions")
                .where("lastSeenAtMs", ">=", weekAgoMs)
                .orderBy("lastSeenAtMs", "desc")
                .limit(60)
                .get(),
            adminDb.collection("analytics_watch_assets")
                .where("lastSeenAtMs", ">=", weekAgoMs)
                .orderBy("lastSeenAtMs", "desc")
                .limit(60)
                .get(),
            adminDb.collection("analytics_commerce_rollup").doc("summary").get(),
            adminDb.collection(ORCHESTRATION_COLLECTIONS.events).orderBy("observedAtMs", "desc").limit(80).get(),
            adminDb.collection(ORCHESTRATION_COLLECTIONS.findings).orderBy("updatedAtMs", "desc").limit(40).get(),
            adminDb.collection(ORCHESTRATION_COLLECTIONS.repairProposals).orderBy("updatedAtMs", "desc").limit(40).get(),
            adminDb.collection(ORCHESTRATION_COLLECTIONS.actorSummaries).orderBy("lastSeenAtMs", "desc").limit(40).get(),
            adminDb.collection(ORCHESTRATION_COLLECTIONS.repairActions).orderBy("createdAtMs", "desc").limit(40).get(),
            adminDb.collection(CREATOR_ONBOARDING_COLLECTION).get(),
            adminDb.collection(CREATOR_REVIEW_QUEUE_COLLECTION).get(),
        ]);

        const opsHealth = buildAdminOpsHealth({
            nowMs,
            diagnosticsDocs: diagnosticsSnapshot.docs,
            pipelineDocs: pipelineSnapshot.docs,
            eventStatsDocs: eventStatsSnapshot.docs,
            taskRollupDocs: taskRollupSnapshot.docs,
            guestBatchDocs: guestBatchesSnapshot.docs,
            securityEventDocs: securityEventsSnapshot.docs,
            watchSessionDocs: watchSessionsSnapshot.docs,
            watchAssetDocs: watchAssetsSnapshot.docs,
            commerceSummaryDoc: commerceSummarySnapshot,
        });
        const orchestration = buildAdminOrchestrationSnapshot({
            eventDocs: orchestrationEventsSnapshot.docs,
            findingDocs: orchestrationFindingsSnapshot.docs,
            proposalDocs: orchestrationProposalsSnapshot.docs,
            actorSummaryDocs: orchestrationActorSummariesSnapshot.docs,
            repairActionDocs: orchestrationRepairActionsSnapshot.docs,
        });
        const creatorOnboardingDiagnostics = buildCreatorOnboardingDiagnostics({
            users: usersSnapshot.docs.map((doc) => ({
                uid: doc.id,
                raw: doc.data() as Record<string, unknown>,
            })),
            onboardingRecords: creatorOnboardingSnapshot.docs.map((doc) => doc.data() as Record<string, unknown>),
            queueRecords: creatorReviewQueueSnapshot.docs.map((doc) => doc.data() as Record<string, unknown>),
        });
        const signal = buildAdminAiDebugSignalInput({
            generatedAt: new Date(nowMs).toISOString(),
            opsHealth,
            orchestration,
            creatorOnboardingDiagnostics,
        });
        const summary = await generateAdminAiDebugSummary(signal);

        return finalize(NextResponse.json(summary, {
            status: 200,
            headers: {
                "Cache-Control": "no-store, max-age=0",
            },
        }));
    } catch (error) {
        return finalize(handleApiError(error, "admin/debug/assistant"), error);
    }
}
