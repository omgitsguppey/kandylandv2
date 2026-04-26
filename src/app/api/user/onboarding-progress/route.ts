import { NextRequest, NextResponse } from "next/server";

import { adminDb } from "@/lib/server/firebase-admin";
import { handleApiError } from "@/lib/server/auth";
import { STRICT } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import {
    buildOnboardingAnalyticsEventFact,
    buildOnboardingAnalyticsStorageKey,
    toOnboardingNumber,
    toOnboardingString,
} from "@/lib/server/onboarding-analytics";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";

const ALLOWED_EVENT_NAMES = new Set([
    "guided_onboarding_started",
    "guided_onboarding_step_started",
    "guided_onboarding_step_completed",
]);

function isAlreadyExistsError(error: unknown) {
    if (!error || typeof error !== "object") {
        return false;
    }

    const code = "code" in error ? (error as { code?: unknown }).code : undefined;
    return code === 6 || code === "already-exists" || code === "ALREADY_EXISTS";
}

async function POST_handler(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "user/onboarding-progress",
            rateLimit: STRICT,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });
        if (!caller || !adminDb) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json().catch(() => ({}));
        const eventName = toOnboardingString(body?.eventName);
        if (!ALLOWED_EVENT_NAMES.has(eventName)) {
            return NextResponse.json({ error: "Unsupported onboarding event" }, { status: 400 });
        }

        const userRef = adminDb.collection("users").doc(caller.uid);
        const userSnapshot = await userRef.get();
        if (!userSnapshot.exists) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const userData = userSnapshot.data() || {};
        const username = typeof userData.username === "string" && userData.username.trim().length > 0
            ? userData.username.trim()
            : typeof userData.displayName === "string" && userData.displayName.trim().length > 0
                ? userData.displayName.trim()
                : caller.email || caller.uid;
        const flowStartedAtMs = Math.max(0, toOnboardingNumber(body?.flowStartedAtMs));
        const stepId = toOnboardingString(body?.stepId).slice(0, 60);
        const stepTitle = toOnboardingString(body?.stepTitle).slice(0, 120);
        const stepPath = toOnboardingString(body?.stepPath).slice(0, 120) || "/dashboard";
        const startedAtMs = Math.max(0, toOnboardingNumber(body?.startedAtMs));
        const completedAtMs = Math.max(startedAtMs, toOnboardingNumber(body?.completedAtMs));
        const durationMs = Math.max(0, toOnboardingNumber(body?.durationMs));
        const durationSeconds = durationMs > 0 ? Math.round(durationMs / 1000) : 0;
        const completionReason = toOnboardingString(body?.completionReason).slice(0, 80);
        const stepIndex = Math.max(0, toOnboardingNumber(body?.stepIndex));
        const viewportWidth = toOnboardingNumber(body?.viewportWidth) || undefined;
        const viewportHeight = toOnboardingNumber(body?.viewportHeight) || undefined;
        const isMobileViewport = typeof body?.isMobileViewport === "boolean" ? body.isMobileViewport : undefined;
        const registrationMethod = toOnboardingString(body?.registrationMethod).slice(0, 20);
        const selectedFlavor = toOnboardingString(body?.selectedFlavor).slice(0, 20);

        const timestamp = eventName === "guided_onboarding_started"
            ? flowStartedAtMs || Date.now()
            : eventName === "guided_onboarding_step_started"
                ? startedAtMs || flowStartedAtMs || Date.now()
                : completedAtMs || Math.max(startedAtMs + durationMs, flowStartedAtMs, Date.now());
        const storageKey = buildOnboardingAnalyticsStorageKey({
            userId: caller.uid,
            eventName,
            flowStartedAtMs,
            stepId,
            timestamp,
        });

        const fact = buildOnboardingAnalyticsEventFact({
            eventName,
            timestamp,
            userId: caller.uid,
            username,
            pagePath: stepPath,
            source: "onboarding_progress_route",
            flowStartedAtMs,
            startedAtMs: eventName === "guided_onboarding_started" ? undefined : startedAtMs || undefined,
            durationMs: eventName === "guided_onboarding_step_completed" ? durationMs : undefined,
            durationSeconds: eventName === "guided_onboarding_step_completed" ? durationSeconds : undefined,
            completionReason: eventName === "guided_onboarding_step_completed" ? completionReason || "completed" : undefined,
            stepId: stepId || undefined,
            stepIndex: stepIndex || undefined,
            stepTitle: stepTitle || undefined,
            stepPath,
            viewportWidth,
            viewportHeight,
            isMobileViewport,
            eventParams: {
                ...(registrationMethod ? { registration_method: registrationMethod } : {}),
                ...(selectedFlavor ? { selected_flavor: selectedFlavor } : {}),
            },
        });

        const factRef = adminDb.collection("analytics_event_facts").doc(storageKey);
        let deduped = false;

        try {
            await adminDb.runTransaction(async (transaction) => {
                const existingFact = await transaction.get(factRef);
                if (existingFact.exists) {
                    deduped = true;
                    return;
                }

                transaction.create(factRef, fact);
            });
        } catch (error) {
            if (!isAlreadyExistsError(error)) {
                throw error;
            }
            deduped = true;
        }

        return NextResponse.json({ success: true, deduped });
    } catch (error) {
        return handleApiError(error, "User.OnboardingProgress");
    }
}

export let POST = withRouteRuntimeHealth("user/onboarding-progress:POST", POST_handler);
