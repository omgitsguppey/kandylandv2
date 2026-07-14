import { NextRequest, NextResponse } from "next/server";

import { AI_DEBUG_ASSISTANT_MODEL } from "@/lib/ai-debug-assistant";
import { handleApiError } from "@/lib/server/auth";
import { isBoundedJsonBodyError, readBoundedJsonBody } from "@/lib/server/bounded-json-body";
import { buildAdminOpsHealth } from "@/lib/server/admin-ops-health";
import { buildAdminOrchestrationSnapshot } from "@/lib/server/admin-orchestration";
import { buildCreatorOnboardingDiagnostics } from "@/lib/server/creator-onboarding-diagnostics";
import { adminDb } from "@/lib/server/firebase-admin";
import {
    buildAdminAiDebugFallback,
    buildAdminAiDebugSavedSummary,
    buildAdminAiDebugSignalInput,
    generateAdminAiDebugSummary,
    resolveAdminAiDebugVertexRuntime,
} from "@/lib/server/ai-debug-assistant";
import {
    getAdminAiDebugAssistantSettings,
    saveAdminAiDebugAssistantSettings,
} from "@/lib/server/admin-debug-settings";
import { ORCHESTRATION_COLLECTIONS } from "@/lib/orchestration/contract";
import { ADMIN_DEBUG_ASSISTANT } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";
import { CREATOR_ONBOARDING_COLLECTION, CREATOR_REVIEW_QUEUE_COLLECTION } from "@/lib/server/creator-onboarding";
import { getCSTDateKey } from "@/lib/timezone";

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const ASSISTANT_USER_SAMPLE_LIMIT = 1_000;
const ASSISTANT_DAILY_SAMPLE_LIMIT = 370;
const ASSISTANT_ROLLUP_SAMPLE_LIMIT = 500;
const ADMIN_DEBUG_ASSISTANT_BODY_LIMIT_BYTES = 64_000;

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function buildAssistantSignalSnapshot() {
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
        adminDb.collection("users").limit(ASSISTANT_USER_SAMPLE_LIMIT).get(),
        adminDb.collection("server_diagnostics")
            .where("createdAtMs", ">=", weekAgoMs)
            .orderBy("createdAtMs", "desc")
            .limit(80)
            .get(),
        adminDb.collection("analytics_pipeline_daily")
            .where("dayKey", ">=", weekAgoDayKey)
            .limit(ASSISTANT_DAILY_SAMPLE_LIMIT)
            .get(),
        adminDb.collection("analytics_event_stats").limit(ASSISTANT_ROLLUP_SAMPLE_LIMIT).get(),
        adminDb.collection("analytics_task_rollup").limit(ASSISTANT_ROLLUP_SAMPLE_LIMIT).get(),
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
        adminDb.collection("analytics_commerce_rollup").doc("summary")
            // bounded document read: assistant commerce context uses the summary doc only.
            .get(),
        adminDb.collection(ORCHESTRATION_COLLECTIONS.events).orderBy("observedAtMs", "desc").limit(80).get(),
        adminDb.collection(ORCHESTRATION_COLLECTIONS.findings).orderBy("updatedAtMs", "desc").limit(40).get(),
        adminDb.collection(ORCHESTRATION_COLLECTIONS.repairProposals).orderBy("updatedAtMs", "desc").limit(40).get(),
        adminDb.collection(ORCHESTRATION_COLLECTIONS.actorSummaries).orderBy("lastSeenAtMs", "desc").limit(40).get(),
        adminDb.collection(ORCHESTRATION_COLLECTIONS.repairActions).orderBy("createdAtMs", "desc").limit(40).get(),
        adminDb.collection(CREATOR_ONBOARDING_COLLECTION).limit(ASSISTANT_USER_SAMPLE_LIMIT).get(),
        adminDb.collection(CREATOR_REVIEW_QUEUE_COLLECTION).limit(ASSISTANT_USER_SAMPLE_LIMIT).get(),
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

    return { nowMs, signal };
}

async function GET_handler(request: NextRequest) {
    try {
        await guardApiRequest(request, {
            routeName: "admin/debug/assistant",
            preAuthRouteName: "admin/debug/assistant/preauth",
            preAuthRateLimit: ADMIN_DEBUG_ASSISTANT,
            rateLimit: ADMIN_DEBUG_ASSISTANT,
            auth: "admin",
            scopeToCaller: true,
        });

        const settings = await getAdminAiDebugAssistantSettings();
        const { signal } = await buildAssistantSignalSnapshot();
        const runtime = resolveAdminAiDebugVertexRuntime(settings.model);
        const summary = settings.lastSummary
            ? buildAdminAiDebugSavedSummary({
                signal,
                settings,
                runtime,
                savedSummary: settings.lastSummary,
            })
            : buildAdminAiDebugFallback({
                signal,
                settings,
                runtime,
                availabilityNote: "Live AI summary delayed. Showing deterministic fallback.",
                fallbackReason: "page_load_no_live_call",
            });

        return NextResponse.json(summary, {
            status: 200,
            headers: {
                "Cache-Control": "no-store, max-age=0",
            },
        });
    } catch (error) {
        return handleApiError(error, "admin/debug/assistant");
    }
}

async function POST_handler(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "admin/debug/assistant",
            rateLimit: ADMIN_DEBUG_ASSISTANT,
            requireTrustedOrigin: true,
            auth: "admin",
            scopeToCaller: true,
        });
        if (!caller) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const settings = await getAdminAiDebugAssistantSettings();
        const { nowMs, signal } = await buildAssistantSignalSnapshot();
        const summary = await generateAdminAiDebugSummary(signal, { settings });

        await saveAdminAiDebugAssistantSettings({
            enabled: settings.enabled,
            model: settings.model,
            actorUid: caller.uid,
            actorEmail: caller.email,
            lastSummary: summary.response_state === "live" ? summary : settings.lastSummary || summary,
            lastLiveCallAtMs: summary.response_state === "live" ? nowMs : settings.lastLiveCallAtMs,
        });

        return NextResponse.json(summary, {
            status: 200,
            headers: {
                "Cache-Control": "no-store, max-age=0",
            },
        });
    } catch (error) {
        return handleApiError(error, "admin/debug/assistant");
    }
}

async function PUT_handler(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "admin/debug/assistant",
            rateLimit: ADMIN_DEBUG_ASSISTANT,
            requireTrustedOrigin: true,
            auth: "admin",
            scopeToCaller: true,
        });
        if (!caller) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await readBoundedJsonBody<{
            enabled?: unknown;
            model?: unknown;
        }>(request, {
            maxBytes: ADMIN_DEBUG_ASSISTANT_BODY_LIMIT_BYTES,
            routeName: "admin/debug/assistant",
            allowEmpty: false,
        });
        const updates: {
            enabled?: boolean;
            model?: string;
        } = {};

        if (typeof body.enabled === "boolean") {
            updates.enabled = body.enabled;
        }

        if (typeof body.model === "string" && body.model.trim().length > 0) {
            updates.model = body.model.trim();
        }

        if (updates.enabled === undefined && !updates.model) {
            return NextResponse.json({ error: "Missing AI debug assistant update fields" }, { status: 400 });
        }

        const settings = await saveAdminAiDebugAssistantSettings({
            enabled: updates.enabled,
            model: updates.model || AI_DEBUG_ASSISTANT_MODEL,
            actorUid: caller.uid,
            actorEmail: caller.email,
        });

        return NextResponse.json({
            success: true,
            settings,
        });
    } catch (error) {
        if (isBoundedJsonBodyError(error)) {
            return NextResponse.json({
                success: false,
                error: error.message,
                errorCode: error.code,
                retryable: false,
            }, { status: error.status });
        }
        return handleApiError(error, "admin/debug/assistant");
    }
}

export let GET = withRouteRuntimeHealth("admin/debug/assistant:GET", GET_handler);
export let POST = withRouteRuntimeHealth("admin/debug/assistant:POST", POST_handler);
export let PUT = withRouteRuntimeHealth("admin/debug/assistant:PUT", PUT_handler);
