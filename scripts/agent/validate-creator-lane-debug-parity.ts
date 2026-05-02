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

const diagnostics = readRequired("src/lib/server/creator-onboarding-diagnostics.ts");
const debugNow = readRequired("src/app/admin/debug/components/DebugTabNow.tsx");
const rosterPage = readRequired("src/app/admin/roster/page.tsx");
const rosterRoute = readRequired("src/app/api/admin/roster/route.ts");
const doc = readRequired("docs/agent-truth/creator-lane-debug-parity.md");
const packageJson = readRequired("package.json");

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
    "recommendedFix",
    "canSelfHeal",
]) {
    requireIncludes(diagnostics, field, "Creator lane debug metadata");
    requireIncludes(debugNow, field, "Admin Debug Creator Lane group");
}

requireIncludes(debugNow, "Creator Lane", "Admin Debug group title");
requireIncludes(debugNow, "Full source evidence stays here", "Debug evidence location copy");
requireIncludes(rosterRoute, "buildCreatorLaneRosterWarnings", "Roster API shared warning builder");
requireIncludes(rosterPage, "Needs review", "Roster short action copy");
requireIncludes(packageJson, "check:creator-lane-debug-parity", "Package validation script");

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
]) {
    requireIncludes(doc, docNeedle, "Creator lane debug parity doc");
}

if (failures.length > 0) {
    console.error("Creator lane debug parity validation failed:");
    for (const failure of failures) {
        console.error(`- ${failure}`);
    }
    process.exit(1);
}

console.log("Creator lane debug parity validation passed.");
