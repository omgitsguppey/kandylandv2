import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { handleApiError } from "@/lib/server/auth";
import { STRICT } from "@/lib/server/rate-limit";
import * as admin from "firebase-admin";
import { getTelemetryEventOption, TELEMETRY_EVENT_INDEX_VERSION } from "@/lib/telemetry-catalog";
import { buildAnalyticsTimeKeys } from "@/lib/server/analytics-event-utils";
import { guardApiRequest } from "@/lib/server/request-guard";

type OnboardingStepMetricInput = {
    stepId: string;
    stepIndex: number;
    stepTitle: string;
    stepPath: string;
    startedAtMs: number;
    completedAtMs: number;
    durationMs: number;
    completionReason: string;
};

function toNumber(value: unknown) {
    return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : 0;
}

function toStringValue(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
}

function sanitizeOnboardingStepMetrics(value: unknown) {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .slice(0, 12)
        .map((entry) => {
            if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
                return null;
            }

            const candidate = entry as Record<string, unknown>;
            const stepId = toStringValue(candidate.stepId).slice(0, 60);
            const stepTitle = toStringValue(candidate.stepTitle).slice(0, 120);
            const stepPath = toStringValue(candidate.stepPath).slice(0, 120) || "/dashboard";
            const completionReason = toStringValue(candidate.completionReason).slice(0, 80) || "completed";
            const stepIndex = Math.max(1, toNumber(candidate.stepIndex));
            const startedAtMs = Math.max(0, toNumber(candidate.startedAtMs));
            const completedAtMs = Math.max(startedAtMs, toNumber(candidate.completedAtMs));
            const durationMs = Math.max(0, toNumber(candidate.durationMs) || (completedAtMs - startedAtMs));

            if (!stepId || !stepTitle) {
                return null;
            }

            return {
                stepId,
                stepIndex,
                stepTitle,
                stepPath,
                startedAtMs,
                completedAtMs,
                durationMs,
                completionReason,
            } satisfies OnboardingStepMetricInput;
        })
        .filter((entry): entry is OnboardingStepMetricInput => entry !== null);
}

function buildAnalyticsEventFact(params: {
    eventName: string;
    timestamp: number;
    userId: string;
    username: string;
    pagePath: string;
    durationMs?: number;
    viewportWidth?: number;
    viewportHeight?: number;
    isMobileViewport?: boolean;
    eventParams?: Record<string, string | number | boolean>;
}) {
    const { option } = getTelemetryEventOption(params.eventName);
    const timeKeys = buildAnalyticsTimeKeys(params.timestamp);

    return {
        source: "authenticated_server",
        consentMode: "identified",
        globalPrivacyControl: false,
        eventName: params.eventName,
        userId: params.userId,
        username: params.username,
        timestamp: params.timestamp,
        pagePath: params.pagePath,
        sessionId: "",
        dayKey: timeKeys.dayKey,
        hourKey: timeKeys.hourKey,
        minuteKey: timeKeys.minuteKey,
        dropId: "",
        dropTitle: "",
        dropCategory: "",
        watchSeconds: 0,
        durationMs: params.durationMs ?? 0,
        loadMs: 0,
        viewportWidth: params.viewportWidth,
        viewportHeight: params.viewportHeight,
        isMobileViewport: params.isMobileViewport,
        authState: "authenticated",
        eventCategory: option?.category || "system",
        eventModules: option?.modules || [],
        trackingSources: option?.sources || [],
        eventIndexVersion: TELEMETRY_EVENT_INDEX_VERSION,
        trackingOrigin: "server",
        params: params.eventParams || {},
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
}

export async function POST(req: NextRequest) {
    try {
        const caller = await guardApiRequest(req, {
            routeName: "user/complete-onboarding",
            rateLimit: STRICT,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });
        if (!caller) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const { uid } = caller;
        const body = await req.json().catch(() => ({}));
        const startedAtMs = Math.max(0, toNumber(body?.startedAtMs));
        const durationMs = typeof body?.durationMs === "number" && Number.isFinite(body.durationMs) && body.durationMs > 0
            ? Math.max(0, Math.round(body.durationMs))
            : 0;
        const durationSeconds = durationMs > 0 ? Math.round(durationMs / 1000) : 0;
        const stepMetrics = sanitizeOnboardingStepMetrics(body?.stepMetrics);
        const viewportWidth = typeof body?.viewportWidth === "number" && Number.isFinite(body.viewportWidth) ? body.viewportWidth : undefined;
        const viewportHeight = typeof body?.viewportHeight === "number" && Number.isFinite(body.viewportHeight) ? body.viewportHeight : undefined;
        const isMobileViewport = typeof body?.isMobileViewport === "boolean" ? body.isMobileViewport : undefined;

        const userRef = adminDb.collection("users").doc(uid);
        const legacyProfileRef = userRef.collection("profile").doc("default");
        const balanceRef = adminDb.collection("users").doc(uid).collection("economy").doc("balance");
        const analyticsEventRef = adminDb.collection("analytics_event_facts").doc();
        const onboardingStepStartRefs = stepMetrics.map(() => adminDb.collection("analytics_event_facts").doc());
        const onboardingStepCompletionRefs = stepMetrics.map(() => adminDb.collection("analytics_event_facts").doc());
        const nowMs = Date.now();

        return await adminDb.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                return NextResponse.json({ error: "User not found" }, { status: 404 });
            }

            const userData = userDoc.data() || {};
            const legacyProfileDoc = await transaction.get(legacyProfileRef);
            const legacyProfileData = legacyProfileDoc.exists ? legacyProfileDoc.data() : null;

            // Check if already completed to prevent double-dipping the reward
            if (userData?.onboardingCompleted || legacyProfileData?.onboardingCompleted) {
                return NextResponse.json({ success: true, alreadyCompleted: true, message: "Onboarding already finished." });
            }

            // Award 50 Gumdrops
            const rewardAmount = 50;

            const balanceDoc = await transaction.get(balanceRef);
            const currentBalance = Number(userData?.gumDropsBalance)
                || (balanceDoc.exists ? Number(balanceDoc.data()?.gumDrops || 0) : 0);
            const newBalance = currentBalance + rewardAmount;

            transaction.set(userRef, {
                onboardingCompleted: true,
                gumDropsBalance: newBalance,
                updatedAt: Date.now(),
            }, { merge: true });

            // Keep legacy docs in sync for older clients/tools.
            transaction.set(legacyProfileRef, {
                onboardingCompleted: true,
            }, { merge: true });

            transaction.set(balanceRef, {
                gumDrops: newBalance,
                updatedAt: nowMs,
            }, { merge: true });

            const txRef = adminDb.collection("transactions").doc();
            transaction.set(txRef, {
                userId: uid,
                type: "onboarding_reward",
                status: "completed",
                amount: rewardAmount,
                currency: "USD",
                balanceAfter: newBalance,
                description: "Completed Guided Onboarding Flow",
                timestamp: nowMs,
            });

            const username = typeof userData?.username === "string" && userData.username.trim().length > 0
                ? userData.username.trim()
                : typeof userData?.displayName === "string" && userData.displayName.trim().length > 0
                    ? userData.displayName.trim()
                    : caller.email || uid;

            transaction.set(analyticsEventRef, buildAnalyticsEventFact({
                eventName: "guided_onboarding_completed",
                timestamp: nowMs,
                userId: uid,
                username,
                pagePath: "/drops",
                durationMs,
                viewportWidth,
                viewportHeight,
                isMobileViewport,
                eventParams: {
                    duration_ms: durationMs,
                    durationSeconds,
                    completed_step_count: stepMetrics.length,
                    started_at_ms: startedAtMs,
                    source: "complete_onboarding_route",
                },
            }));

            stepMetrics.forEach((stepMetric, index) => {
                transaction.set(onboardingStepStartRefs[index], buildAnalyticsEventFact({
                    eventName: "guided_onboarding_step_started",
                    timestamp: stepMetric.startedAtMs || nowMs,
                    userId: uid,
                    username,
                    pagePath: stepMetric.stepPath,
                    eventParams: {
                        step_key: stepMetric.stepId,
                        step_index: stepMetric.stepIndex,
                        step_title: stepMetric.stepTitle,
                        step_path: stepMetric.stepPath,
                        started_at_ms: stepMetric.startedAtMs,
                        overall_started_at_ms: startedAtMs,
                        source: "complete_onboarding_route",
                    },
                }));

                transaction.set(onboardingStepCompletionRefs[index], buildAnalyticsEventFact({
                    eventName: "guided_onboarding_step_completed",
                    timestamp: stepMetric.completedAtMs || nowMs,
                    userId: uid,
                    username,
                    pagePath: stepMetric.stepPath,
                    durationMs: stepMetric.durationMs,
                    eventParams: {
                        step_key: stepMetric.stepId,
                        step_index: stepMetric.stepIndex,
                        step_title: stepMetric.stepTitle,
                        step_path: stepMetric.stepPath,
                        started_at_ms: stepMetric.startedAtMs,
                        completed_at_ms: stepMetric.completedAtMs,
                        duration_ms: stepMetric.durationMs,
                        duration_seconds: Math.round(stepMetric.durationMs / 1000),
                        completion_reason: stepMetric.completionReason,
                        overall_started_at_ms: startedAtMs,
                        source: "complete_onboarding_route",
                    },
                }));
            });

            return NextResponse.json({
                success: true,
                rewardAmount,
                newBalance,
            });
        });

    } catch (error) {
        return handleApiError(error, "User.CompleteOnboarding");
    }
}
