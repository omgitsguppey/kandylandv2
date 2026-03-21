import "server-only";

import * as admin from "firebase-admin";

import { createAnalyticsStorageKey } from "@/lib/analytics-identifiers";
import { getTelemetryEventOption, TELEMETRY_EVENT_INDEX_VERSION } from "@/lib/telemetry-catalog";
import { buildAnalyticsTimeKeys } from "@/lib/server/analytics-event-utils";

export type OnboardingStepMetricInput = {
    stepId: string;
    stepIndex: number;
    stepTitle: string;
    stepPath: string;
    startedAtMs: number;
    completedAtMs: number;
    durationMs: number;
    completionReason: string;
};

export function toOnboardingNumber(value: unknown) {
    return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : 0;
}

export function toOnboardingString(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
}

export function sanitizeOnboardingStepMetrics(value: unknown) {
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
            const stepId = toOnboardingString(candidate.stepId).slice(0, 60);
            const stepTitle = toOnboardingString(candidate.stepTitle).slice(0, 120);
            const stepPath = toOnboardingString(candidate.stepPath).slice(0, 120) || "/dashboard";
            const completionReason = toOnboardingString(candidate.completionReason).slice(0, 80) || "completed";
            const stepIndex = Math.max(1, toOnboardingNumber(candidate.stepIndex));
            const startedAtMs = Math.max(0, toOnboardingNumber(candidate.startedAtMs));
            const completedAtMs = Math.max(startedAtMs, toOnboardingNumber(candidate.completedAtMs));
            const durationMs = Math.max(0, toOnboardingNumber(candidate.durationMs) || (completedAtMs - startedAtMs));

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

type BuildOnboardingAnalyticsFactInput = {
    eventName: string;
    timestamp: number;
    userId: string;
    username: string;
    pagePath: string;
    source: string;
    flowStartedAtMs?: number;
    startedAtMs?: number;
    durationMs?: number;
    durationSeconds?: number;
    completionReason?: string;
    completedStepCount?: number;
    stepId?: string;
    stepIndex?: number;
    stepTitle?: string;
    stepPath?: string;
    viewportWidth?: number;
    viewportHeight?: number;
    isMobileViewport?: boolean;
    eventParams?: Record<string, string | number | boolean>;
};

export function buildOnboardingAnalyticsStorageKey(input: {
    userId: string;
    eventName: string;
    flowStartedAtMs?: number;
    stepId?: string;
    timestamp?: number;
}) {
    return createAnalyticsStorageKey(
        "onboarding",
        input.userId,
        input.eventName,
        input.stepId || "flow",
        String(input.flowStartedAtMs || input.timestamp || 0),
    );
}

export function buildOnboardingAnalyticsEventFact(input: BuildOnboardingAnalyticsFactInput) {
    const { option } = getTelemetryEventOption(input.eventName);
    const timeKeys = buildAnalyticsTimeKeys(input.timestamp);

    return {
        source: "authenticated_server",
        consentMode: "identified",
        globalPrivacyControl: false,
        eventName: input.eventName,
        userId: input.userId,
        username: input.username,
        timestamp: input.timestamp,
        pagePath: input.pagePath,
        sessionId: "",
        dayKey: timeKeys.dayKey,
        hourKey: timeKeys.hourKey,
        minuteKey: timeKeys.minuteKey,
        dropId: "",
        dropTitle: "",
        dropCategory: "",
        watchSeconds: 0,
        durationMs: input.durationMs ?? 0,
        loadMs: 0,
        viewportWidth: input.viewportWidth,
        viewportHeight: input.viewportHeight,
        isMobileViewport: input.isMobileViewport,
        authState: "authenticated",
        semanticCategory: "user",
        semanticCategoryLabel: "User",
        semanticScopeKey: "user_onboarding",
        semanticScopeLabel: "User onboarding",
        semanticSurfaceKey: "user:onboarding",
        semanticSurfaceLabel: "User onboarding",
        eventCategory: option?.category || "system",
        eventModules: option?.modules || [],
        trackingSources: option?.sources || [],
        eventIndexVersion: TELEMETRY_EVENT_INDEX_VERSION,
        trackingOrigin: "server",
        params: {
            source: input.source,
            ...(input.flowStartedAtMs ? { overall_started_at_ms: input.flowStartedAtMs } : {}),
            ...(input.startedAtMs ? { started_at_ms: input.startedAtMs } : {}),
            ...(typeof input.durationMs === "number" ? { duration_ms: input.durationMs } : {}),
            ...(typeof input.durationSeconds === "number" ? { duration_seconds: input.durationSeconds } : {}),
            ...(input.completionReason ? { completion_reason: input.completionReason } : {}),
            ...(typeof input.completedStepCount === "number" ? { completed_step_count: input.completedStepCount } : {}),
            ...(input.stepId ? { step_key: input.stepId } : {}),
            ...(typeof input.stepIndex === "number" ? { step_index: input.stepIndex } : {}),
            ...(input.stepTitle ? { step_title: input.stepTitle } : {}),
            ...(input.stepPath ? { step_path: input.stepPath } : {}),
            ...(input.eventParams || {}),
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
}
