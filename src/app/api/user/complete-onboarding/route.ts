import { NextRequest, NextResponse } from "next/server";

import { adminDb } from "@/lib/server/firebase-admin";
import { handleApiError } from "@/lib/server/auth";
import { STRICT } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import {
    buildOnboardingAnalyticsEventFact,
    buildOnboardingAnalyticsStorageKey,
    sanitizeOnboardingStepMetrics,
    toOnboardingNumber,
} from "@/lib/server/onboarding-analytics";
import { normalizeGumdropBalance } from "@/lib/gumdrop-ledger";
import { buildCompletedGumdropTransaction } from "@/lib/server/gumdrop-ledger";

type OnboardingFactWrite = {
    key: string;
    data: FirebaseFirestore.DocumentData;
};

export async function POST(req: NextRequest) {
    try {
        const caller = await guardApiRequest(req, {
            routeName: "user/complete-onboarding",
            rateLimit: STRICT,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });
        if (!caller || !adminDb) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { uid } = caller;
        const body = await req.json().catch(() => ({}));
        const startedAtMs = Math.max(0, toOnboardingNumber(body?.startedAtMs));
        const durationMs = typeof body?.durationMs === "number" && Number.isFinite(body.durationMs) && body.durationMs > 0
            ? Math.max(0, Math.round(body.durationMs))
            : 0;
        const durationSeconds = durationMs > 0 ? Math.round(durationMs / 1000) : 0;
        const stepMetrics = sanitizeOnboardingStepMetrics(body?.stepMetrics);
        const viewportWidth = typeof body?.viewportWidth === "number" && Number.isFinite(body.viewportWidth) ? body.viewportWidth : undefined;
        const viewportHeight = typeof body?.viewportHeight === "number" && Number.isFinite(body.viewportHeight) ? body.viewportHeight : undefined;
        const isMobileViewport = typeof body?.isMobileViewport === "boolean" ? body.isMobileViewport : undefined;
        const selectedFlavor = typeof body?.selectedFlavor === "string" && body.selectedFlavor.trim().length > 0
            ? body.selectedFlavor.trim().slice(0, 20)
            : undefined;
        const pagePath = typeof body?.pagePath === "string" && body.pagePath.trim().startsWith("/")
            ? body.pagePath.trim().slice(0, 120)
            : "/dashboard";
        const nowMs = Date.now();

        const userRef = adminDb.collection("users").doc(uid);
        const legacyProfileRef = userRef.collection("profile").doc("default");
        const balanceRef = userRef.collection("economy").doc("balance");

        return await adminDb.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                return NextResponse.json({ error: "User not found" }, { status: 404 });
            }

            const userData = userDoc.data() || {};
            const legacyProfileDoc = await transaction.get(legacyProfileRef);
            const legacyProfileData = legacyProfileDoc.exists ? legacyProfileDoc.data() : null;

            if (userData?.onboardingCompleted || legacyProfileData?.onboardingCompleted) {
                return NextResponse.json({ success: true, alreadyCompleted: true, message: "Onboarding already finished." });
            }

            const rewardAmount = 50;
            const balanceDoc = await transaction.get(balanceRef);
            const currentBalance = normalizeGumdropBalance(Number(userData?.gumDropsBalance)
                || (balanceDoc.exists ? Number(balanceDoc.data()?.gumDrops || 0) : 0));
            const newBalance = currentBalance + rewardAmount;
            const username = typeof userData?.username === "string" && userData.username.trim().length > 0
                ? userData.username.trim()
                : typeof userData?.displayName === "string" && userData.displayName.trim().length > 0
                    ? userData.displayName.trim()
                    : caller.email || uid;

            transaction.set(userRef, {
                onboardingCompleted: true,
                gumDropsBalance: newBalance,
                ...(selectedFlavor ? {
                    preferences: {
                        flavor: selectedFlavor,
                    },
                } : {}),
                updatedAt: nowMs,
            }, { merge: true });

            transaction.set(legacyProfileRef, {
                onboardingCompleted: true,
            }, { merge: true });

            transaction.set(balanceRef, {
                gumDrops: newBalance,
                updatedAt: nowMs,
            }, { merge: true });

            const txRef = adminDb.collection("transactions").doc();
            transaction.set(txRef, buildCompletedGumdropTransaction({
                userId: uid,
                type: "onboarding_reward",
                rewardSource: "onboarding",
                amount: rewardAmount,
                description: "Completed Guided Onboarding Flow",
                balanceBefore: currentBalance,
                balanceAfter: newBalance,
                timestampMs: nowMs,
                extra: {
                    currency: "USD",
                },
            }));

            const onboardingFactWrites: OnboardingFactWrite[] = [];
            if (startedAtMs > 0) {
                onboardingFactWrites.push({
                    key: buildOnboardingAnalyticsStorageKey({
                        userId: uid,
                        eventName: "guided_onboarding_started",
                        flowStartedAtMs: startedAtMs,
                        timestamp: startedAtMs,
                    }),
                    data: buildOnboardingAnalyticsEventFact({
                        eventName: "guided_onboarding_started",
                        timestamp: startedAtMs,
                        userId: uid,
                        username,
                        pagePath: stepMetrics[0]?.stepPath || "/dashboard",
                        source: "onboarding_progress_route",
                        flowStartedAtMs: startedAtMs,
                        viewportWidth,
                        viewportHeight,
                        isMobileViewport,
                    }),
                });
            }

            stepMetrics.forEach((stepMetric) => {
                onboardingFactWrites.push({
                    key: buildOnboardingAnalyticsStorageKey({
                        userId: uid,
                        eventName: "guided_onboarding_step_started",
                        flowStartedAtMs: startedAtMs,
                        stepId: stepMetric.stepId,
                        timestamp: stepMetric.startedAtMs,
                    }),
                    data: buildOnboardingAnalyticsEventFact({
                        eventName: "guided_onboarding_step_started",
                        timestamp: stepMetric.startedAtMs || startedAtMs || nowMs,
                        userId: uid,
                        username,
                        pagePath: stepMetric.stepPath,
                        source: "onboarding_progress_route",
                        flowStartedAtMs: startedAtMs,
                        startedAtMs: stepMetric.startedAtMs,
                        stepId: stepMetric.stepId,
                        stepIndex: stepMetric.stepIndex,
                        stepTitle: stepMetric.stepTitle,
                        stepPath: stepMetric.stepPath,
                        viewportWidth,
                        viewportHeight,
                        isMobileViewport,
                    }),
                });

                onboardingFactWrites.push({
                    key: buildOnboardingAnalyticsStorageKey({
                        userId: uid,
                        eventName: "guided_onboarding_step_completed",
                        flowStartedAtMs: startedAtMs,
                        stepId: stepMetric.stepId,
                        timestamp: stepMetric.completedAtMs,
                    }),
                    data: buildOnboardingAnalyticsEventFact({
                        eventName: "guided_onboarding_step_completed",
                        timestamp: stepMetric.completedAtMs || nowMs,
                        userId: uid,
                        username,
                        pagePath: stepMetric.stepPath,
                        source: "onboarding_progress_route",
                        flowStartedAtMs: startedAtMs,
                        startedAtMs: stepMetric.startedAtMs,
                        durationMs: stepMetric.durationMs,
                        durationSeconds: Math.round(stepMetric.durationMs / 1000),
                        completionReason: stepMetric.completionReason,
                        stepId: stepMetric.stepId,
                        stepIndex: stepMetric.stepIndex,
                        stepTitle: stepMetric.stepTitle,
                        stepPath: stepMetric.stepPath,
                        viewportWidth,
                        viewportHeight,
                        isMobileViewport,
                        eventParams: {
                            ...(stepMetric.stepId === "flavor_preference" && selectedFlavor ? { selected_flavor: selectedFlavor } : {}),
                        },
                    }),
                });
            });

            onboardingFactWrites.push({
                key: buildOnboardingAnalyticsStorageKey({
                    userId: uid,
                    eventName: "guided_onboarding_completed",
                    flowStartedAtMs: startedAtMs,
                    timestamp: nowMs,
                }),
                data: buildOnboardingAnalyticsEventFact({
                    eventName: "guided_onboarding_completed",
                    timestamp: nowMs,
                    userId: uid,
                    username,
                    pagePath,
                    source: "complete_onboarding_route",
                    flowStartedAtMs: startedAtMs,
                    durationMs,
                    durationSeconds,
                    completedStepCount: stepMetrics.length,
                    viewportWidth,
                    viewportHeight,
                    isMobileViewport,
                    eventParams: {
                        ...(selectedFlavor ? { selected_flavor: selectedFlavor } : {}),
                    },
                }),
            });

            for (const factWrite of onboardingFactWrites) {
                const factRef = adminDb.collection("analytics_event_facts").doc(factWrite.key);
                const existingFact = await transaction.get(factRef);
                if (existingFact.exists) {
                    continue;
                }
                transaction.create(factRef, factWrite.data);
            }

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
