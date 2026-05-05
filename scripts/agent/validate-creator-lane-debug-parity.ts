import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures: string[] = [];

function readRequired(relativePath: string) {
    const fullPath = join(root, relativePath);
    if (!existsSync(fullPath)) {
        failures.push(`Missing required file: ${relativePath}`);
        return "";
    }
    return readFileSync(fullPath, "utf8");
}

function readJson(relativePath: string) {
    const source = readRequired(relativePath);
    if (!source) return null;
    try {
        return JSON.parse(source) as Record<string, unknown>;
    } catch (error) {
        failures.push(`${relativePath} must contain valid JSON: ${(error as Error).message}`);
        return null;
    }
}

function requireIncludes(source: string, needle: string, label: string) {
    if (!source.includes(needle)) {
        failures.push(`${label} must include "${needle}".`);
    }
}

function requireNotIncludes(source: string, needle: string, label: string) {
    if (source.includes(needle)) {
        failures.push(`${label} must not include "${needle}".`);
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isIsoUtc(value: unknown) {
    return typeof value === "string" && value.endsWith("Z") && Number.isFinite(Date.parse(value));
}

const diagnostics = readRequired("src/lib/server/creator-onboarding-diagnostics.ts");
const serverOnboarding = readRequired("src/lib/server/creator-onboarding.ts");
const pureOnboarding = readRequired("src/lib/creator-onboarding.ts");
const creatorLaneHelper = readRequired("src/lib/creator-lane-debug-parity.ts");
const debugNow = readRequired("src/app/admin/debug/components/DebugTabNow.tsx");
const debugCreatorLane = readRequired("src/app/admin/debug/components/DebugCreatorLane.tsx");
const rosterPage = readRequired("src/app/admin/roster/page.tsx");
const rosterRoute = readRequired("src/app/api/admin/roster/route.ts");
const scorer = readRequired("scripts/agent/score-creator-lane-debug-parity.ts");
const repairScript = readRequired("scripts/agent/repair-creator-lifecycle-history-gap.ts");
const controlTower = readRequired("src/lib/admin-debug-control-tower.ts");
const doc = readRequired("docs/agent-truth/creator-lane-debug-parity.md");
const packageJsonSource = readRequired("package.json");
const generatedReport = readJson("agent/state/creator-lane-debug-parity.generated.json");
const packageJson = packageJsonSource ? JSON.parse(packageJsonSource) as { scripts?: Record<string, string> } : { scripts: {} };
const debugBundle = `${debugNow}\n${debugCreatorLane}`;

for (const issueKey of [
    "missing_queue_record",
    "missing_source_onboarding",
    "user_projection_mismatch",
    "role_status_mismatch",
    "legal_signed_without_matching_signatures",
    "creator_signature_missing_evidence",
    "admin_signature_missing_evidence",
    "id_verified_missing_metadata",
    "owner_override_missing_reason",
    "creator_settings_missing",
    "creator_restrictions_conflict",
    "sensitive_history_missing",
]) {
    requireIncludes(diagnostics, issueKey, "Creator lane parity diagnostics");
    requireIncludes(creatorLaneHelper, issueKey, "Creator lane mismatch surface map");
}

for (const warning of [
    "Review queue out of sync",
    "Role needs review",
    "Agreement evidence missing",
    "ID record needs review",
    "Settings need review",
]) {
    requireIncludes(diagnostics, warning, "Shared roster warning vocabulary");
    requireIncludes(rosterPage, "creatorLaneWarnings", "Roster short warning rendering");
    requireIncludes(doc, warning, "Creator lane parity doc");
}

for (const field of [
    "sourceSnapshots",
    "parityStatus",
    "mismatches",
    "historyCoverage",
    "lastMaterializedAt",
    "lastMaterializedAtUtc",
    "materializationFreshnessState",
    "generatedAtUtc",
    "recommendedFix",
    "canSelfHeal",
]) {
    requireIncludes(diagnostics, field, "Creator lane debug metadata");
    requireIncludes(debugBundle, field, "Admin Debug Creator Lane group");
}

for (const uiNeedle of [
    "Creator Lane",
    "Top creator lane mismatches",
    "creatorId",
    "surface",
    "Expected:",
    "Actual:",
    "Suggested action:",
    "Materializer has no recorded completion timestamp.",
    "Source snapshots loaded, but queue materializer completion was not recorded.",
    "data-creator-lane-generated-at-utc",
    "data-creator-lane-materialization-freshness",
    "Full source evidence stays here",
]) {
    requireIncludes(debugBundle, uiNeedle, "Creator Lane Debug card");
}

for (const helperNeedle of [
    "CreatorLaneDebugParityReport",
    "CreatorLaneParityMismatch",
    "getCreatorLaneMaterializationFreshnessState",
    "getCreatorLaneStatus",
    "toCreatorLaneParityMismatch",
    "History event(s):",
    "Evidence field(s):",
]) {
    requireIncludes(creatorLaneHelper, helperNeedle, "Creator lane parity helper");
}

for (const eventNeedle of [
    '"id_requested"',
    "CREATOR_ONBOARDING_REQUIRED_HISTORY_EVENT_TYPES",
    "id_requested: \"ID requested\"",
    "CreatorOnboardingHistoryEventType",
]) {
    requireIncludes(pureOnboarding, eventNeedle, "Creator onboarding canonical ID request history contract");
}

for (const repairNeedle of [
    "repairCreatorLifecycleHistoryGap",
    "system_debug_repair",
    "Debug parity repair",
    "ID request history restored from source state",
    "Creator source state had idVerificationStatus=id_requested but history was missing the matching lifecycle event.",
    "repairReason: \"missing_history_event\"",
    "missingHistoryEvent: \"id_requested\"",
    "sourceStatus: \"id_requested\"",
    "provenance: \"creator_lane_debug_parity\"",
    "doesNotChangeCreatorState: true",
    "canonical.idVerificationStatus !== \"id_requested\"",
]) {
    requireIncludes(serverOnboarding, repairNeedle, "Creator lifecycle history gap repair helper");
}

for (const repairScriptNeedle of [
    "repairCreatorLifecycleHistoryGap",
    "--userId",
    "--event",
    "--apply",
    "Dry run only",
    "does not change creator approval, role, legal, ID, queue, settings, or projection state",
]) {
    requireIncludes(repairScript, repairScriptNeedle, "Creator lifecycle history repair command");
}

for (const scorerNeedle of [
    "creator-lane-debug-parity.generated.json",
    "generatedAtUtc",
    "lastMaterializedAtUtc: null",
    "materializationFreshnessState",
    "Source-only local refresh",
    "repair:creator-lifecycle-history",
]) {
    requireIncludes(scorer, scorerNeedle, "Creator lane debug parity scorer");
}

for (const controlTowerNeedle of [
    "creator-lane-debug-parity.generated.json",
    "npm run score:creator-lane-debug-parity",
    "raw.mismatches",
]) {
    requireIncludes(controlTower, controlTowerNeedle, "Admin Debug Control Tower report wiring");
}

requireIncludes(rosterRoute, "buildCreatorLaneRosterWarnings", "Roster API shared warning builder");
requireIncludes(rosterPage, "Needs review", "Roster short action copy");

if (packageJson.scripts?.["score:creator-lane-debug-parity"] !== "tsx scripts/agent/score-creator-lane-debug-parity.ts") {
    failures.push("package.json must expose score:creator-lane-debug-parity.");
}
if (packageJson.scripts?.["repair:creator-lifecycle-history"] !== "tsx scripts/agent/repair-creator-lifecycle-history-gap.ts") {
    failures.push("package.json must expose repair:creator-lifecycle-history.");
}
if (packageJson.scripts?.["check:creator-lane-debug-parity"] !== "tsx scripts/agent/validate-creator-lane-debug-parity.ts") {
    failures.push("package.json must expose check:creator-lane-debug-parity.");
}

for (const hiddenTechnicalCopy of [
    "creator_onboarding/",
    "creator_review_queue/",
    "users/{uid}",
    "Firestore",
]) {
    requireNotIncludes(rosterPage, hiddenTechnicalCopy, "Admin Roster main UI");
}

for (const docNeedle of [
    "onboarding exists but the review queue record is missing",
    "review queue exists but canonical onboarding is missing",
    "user creatorApplication projection differs from canonical onboarding",
    "legal signed without matching creator/admin signature state",
    "owner override active without a reason",
    "required sensitive lifecycle history event is missing",
    "recommended fix",
    "creator-lane-debug-parity.generated.json",
    "Materializer has no recorded completion timestamp",
    "repair:creator-lifecycle-history",
    "ID request history restored from source state",
]) {
    requireIncludes(doc, docNeedle, "Creator lane debug parity doc");
}

if (generatedReport) {
    const generatedAtUtc = generatedReport.generatedAtUtc;
    if (!isIsoUtc(generatedAtUtc)) {
        failures.push("creator-lane-debug-parity.generated.json must include generatedAtUtc as an ISO UTC timestamp.");
    }
    if (generatedReport.status === "live" && generatedReport.lastMaterializedAtUtc == null) {
        failures.push("Creator Lane generated report must not be live when lastMaterializedAtUtc is missing.");
    }
    if (generatedReport.lastMaterializedAtUtc == null && generatedReport.materializationFreshnessState !== "not_recorded") {
        failures.push("Missing Last Materialized must use materializationFreshnessState not_recorded.");
    }
    if (!isRecord(generatedReport.sourceSnapshots)) {
        failures.push("Creator Lane generated report must include sourceSnapshots.");
    }
    if (!Array.isArray(generatedReport.nextActions)) {
        failures.push("Creator Lane generated report must include nextActions.");
    }

    const mismatches = Array.isArray(generatedReport.mismatches) ? generatedReport.mismatches : [];
    mismatches.forEach((entry, index) => {
        if (!isRecord(entry)) {
            failures.push(`Creator Lane mismatch ${index} must be an object.`);
            return;
        }
        for (const key of ["creatorId", "surface", "expected", "actual", "suggestedAction", "validator"]) {
            if (typeof entry[key] !== "string" || String(entry[key]).trim().length === 0) {
                failures.push(`Creator Lane mismatch ${index} must include ${key}.`);
            }
        }
        if (entry.surface === "history" && !String(entry.expected).toLowerCase().includes("history event")) {
            failures.push(`Creator Lane history mismatch ${index} must name the missing history event type.`);
        }
    });
}

if (failures.length > 0) {
    console.error("Creator lane debug parity validation failed:");
    for (const failure of failures) {
        console.error(`- ${failure}`);
    }
    process.exit(1);
}

console.log("Creator lane debug parity validation passed.");
