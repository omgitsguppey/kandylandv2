import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { buildPrivacyConsoleState } from "../../src/lib/admin-privacy-console";

const root = process.cwd();
const failures: string[] = [];

function fail(message: string) {
    failures.push(message);
}

function readRequired(relativePath: string) {
    const fullPath = join(root, relativePath);
    if (!existsSync(fullPath)) {
        fail(`Missing required file: ${relativePath}`);
        return "";
    }
    return readFileSync(fullPath, "utf8");
}

function requireIncludes(source: string, expected: string, label: string) {
    if (!source.includes(expected)) {
        fail(`${label} must include "${expected}".`);
    }
}

function requireNotIncludes(source: string, forbidden: string, label: string) {
    if (source.includes(forbidden)) {
        fail(`${label} must not include "${forbidden}".`);
    }
}

const packageJson = JSON.parse(readRequired("package.json")) as { scripts?: Record<string, string> };
const privacyPage = readRequired("src/app/admin/privacy/page.tsx");
const privacyPanel = readRequired("src/app/admin/AdminPrivacyPreflight.tsx");
const privacyHook = readRequired("src/hooks/useAdminPrivacyPreflight.ts");
const privacyRoute = readRequired("src/app/api/admin/privacy/preflight/route.ts");
const privacyModel = readRequired("src/lib/admin-privacy-console.ts");
const routeRuntimeHealth = readRequired("src/lib/route-runtime-health.ts");

if (packageJson.scripts?.["check:privacy-consent-truth"] !== "tsx scripts/agent/validate-privacy-consent-truth.ts") {
    fail("package.json must expose check:privacy-consent-truth.");
}

for (const expected of [
    "PrivacyConsoleState",
    "PrivacyPreflightCheck",
    "\"event_pipeline\"",
    "\"deduplication\"",
    "\"consent_gating\"",
    "\"guest_tracking\"",
    "\"cloud_run_ingest\"",
    "\"bigquery_export\"",
]) {
    requireIncludes(privacyModel, expected, "Privacy console model");
}

for (const expected of [
    "authFetch(`/api/admin/privacy/preflight?range=",
    "useAuth()",
    "adminSessionState",
    "\"waiting_for_admin_session\"",
]) {
    requireIncludes(privacyHook, expected, "Privacy console hook");
}

for (const expected of [
    "guardApiRequest",
    "auth: \"admin\"",
    "withRouteRuntimeHealth(\"admin/privacy/preflight:GET\"",
]) {
    requireIncludes(privacyRoute, expected, "Privacy console admin route");
}

requireIncludes(routeRuntimeHealth, "\"admin/privacy/preflight:GET\"", "Route runtime health targets");

for (const expected of [
    "data-privacy-console-generated-at-utc",
    "data-privacy-check-id",
    "data-privacy-check-state",
    "data-privacy-check-evidence-state",
    "data-privacy-check-sample-count",
    "data-privacy-check-last-seen-at-utc",
    "data-privacy-check-reason-code",
    "data-privacy-check-source",
    "Waiting for admin session...",
]) {
    requireIncludes(privacyPanel, expected, "Privacy console panel");
}

for (const forbidden of [
    "No data",
    "Canonical key not proven",
    "0 denied",
    "Identifier missing",
    "No server origins",
    "Pipeline listener failed",
    "WAIT",
]) {
    requireNotIncludes(`${privacyPage}\n${privacyPanel}`, forbidden, "Privacy console UI copy");
}

const baseInput = {
    generatedAtUtc: "2026-05-06T00:00:00.000Z",
    range: "24h" as const,
    eventPipeline: {
        sampleCount: 1,
        lastSeenAtUtc: "2026-05-06T00:00:00.000Z",
        latestSource: "identified_event_fact",
        guestBatchCount: 0,
        identifiedEventCount: 1,
        ingestRoute: { status: "healthy", hasSample: true, lastSeenAtUtc: "2026-05-06T00:00:00.000Z" },
        identifiedIngestRoute: { status: "healthy", hasSample: true, lastSeenAtUtc: "2026-05-06T00:00:00.000Z" },
    },
    deduplication: {
        checkedEvents: 1,
        withKeyCount: 1,
        missingKeyCount: 0,
        duplicateSuppressionCount: null,
        lastSeenAtUtc: "2026-05-06T00:00:00.000Z",
    },
    consentGating: {
        allowedCount: 1,
        deniedCount: 0,
        unknownConsentCount: 0,
        blockedDueToConsentCount: 0,
        trackedDeniedConsentViolationCount: 0,
        lastSeenAtUtc: "2026-05-06T00:00:00.000Z",
        consentRoute: { status: "healthy", hasSample: true, lastSeenAtUtc: "2026-05-06T00:00:00.000Z" },
    },
    guestTracking: {
        guestEventCount: 0,
        anonymousIdPresentCount: 0,
        missingAnonymousIdCount: 0,
        lastGuestEventAtUtc: null,
    },
    cloudRunIngest: {
        serverOriginSampleCount: 1,
        clientOriginSampleCount: 0,
        lastIngestAtUtc: "2026-05-06T00:00:00.000Z",
        ingestRoute: { status: "healthy", hasSample: true, lastSeenAtUtc: "2026-05-06T00:00:00.000Z" },
        identifiedIngestRoute: { status: "healthy", hasSample: true, lastSeenAtUtc: "2026-05-06T00:00:00.000Z" },
    },
    bigqueryExport: {
        configured: true,
        listenerFailed: false,
        lastHeartbeatAtUtc: "2026-05-06T00:00:00.000Z",
        lastSuccessfulExportAtUtc: "2026-05-06T00:00:00.000Z",
        failureCount: 0,
        failureReason: null,
        affectedRange: null,
    },
} as const satisfies Parameters<typeof buildPrivacyConsoleState>[0];

const noDeniedState = buildPrivacyConsoleState(baseInput);
const consentCheck = noDeniedState.checks.find((check) => check.id === "consent_gating");
if (!consentCheck || consentCheck.state === "error") {
    fail("Consent gating must not mark deniedCount 0 as an error without a violation.");
}

const noGuestTrafficState = buildPrivacyConsoleState({
    ...baseInput,
    guestTracking: {
        guestEventCount: 0,
        anonymousIdPresentCount: 0,
        missingAnonymousIdCount: 0,
        lastGuestEventAtUtc: null,
    },
});
const guestQuietCheck = noGuestTrafficState.checks.find((check) => check.id === "guest_tracking");
if (!guestQuietCheck || guestQuietCheck.state !== "quiet" || guestQuietCheck.evidenceState !== "not_observed") {
    fail("Guest tracking must be quiet/not_observed when no guest events exist.");
}

const missingGuestIdState = buildPrivacyConsoleState({
    ...baseInput,
    guestTracking: {
        guestEventCount: 2,
        anonymousIdPresentCount: 1,
        missingAnonymousIdCount: 1,
        lastGuestEventAtUtc: "2026-05-06T00:00:00.000Z",
    },
});
const guestMissingCheck = missingGuestIdState.checks.find((check) => check.id === "guest_tracking");
if (!guestMissingCheck || guestMissingCheck.state !== "error") {
    fail("Guest tracking must error when guest events are missing anonymous identity.");
}

const noSamplesState = buildPrivacyConsoleState({
    ...baseInput,
    eventPipeline: {
        ...baseInput.eventPipeline,
        sampleCount: 0,
        lastSeenAtUtc: null,
        guestBatchCount: 0,
        identifiedEventCount: 0,
        ingestRoute: { status: "unseen", hasSample: false, lastSeenAtUtc: null },
        identifiedIngestRoute: { status: "unseen", hasSample: false, lastSeenAtUtc: null },
    },
    deduplication: {
        checkedEvents: 0,
        withKeyCount: 0,
        missingKeyCount: 0,
        duplicateSuppressionCount: null,
        lastSeenAtUtc: null,
    },
});
const dedupeNoSampleCheck = noSamplesState.checks.find((check) => check.id === "deduplication");
if (!dedupeNoSampleCheck || dedupeNoSampleCheck.state === "error" || dedupeNoSampleCheck.evidenceState !== "not_observed") {
    fail("Deduplication must be unknown/not_observed when no event samples exist.");
}
const pipelineNoTrafficCheck = noSamplesState.checks.find((check) => check.id === "event_pipeline");
if (!pipelineNoTrafficCheck || pipelineNoTrafficCheck.state !== "quiet") {
    fail("Event pipeline must distinguish no traffic from a broken ingest route.");
}

const exportFailedState = buildPrivacyConsoleState({
    ...baseInput,
    bigqueryExport: {
        configured: true,
        listenerFailed: true,
        lastHeartbeatAtUtc: "2026-05-06T00:00:00.000Z",
        lastSuccessfulExportAtUtc: "2026-05-05T00:00:00.000Z",
        failureCount: 3,
        failureReason: "listener disconnected",
        affectedRange: "2026-05-05/2026-05-06",
    },
});
const exportCheck = exportFailedState.checks.find((check) => check.id === "bigquery_export");
if (!exportCheck || exportCheck.state !== "error" || !exportCheck.explanation.includes("listener") || !exportCheck.nextAction.includes("affected range")) {
    fail("BigQuery export listener failures must include error state, reason, and actionable range guidance.");
}

if (failures.length > 0) {
    console.error("Privacy consent truth validation failed:");
    for (const failure of failures) {
        console.error(`- ${failure}`);
    }
    process.exit(1);
}

console.log("Privacy consent truth validation passed.");
