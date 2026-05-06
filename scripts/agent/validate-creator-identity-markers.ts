import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const failures: string[] = [];

function read(relativePath: string) {
  const absolutePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }
  return fs.readFileSync(absolutePath, "utf8");
}

function requireIncludes(source: string, needle: string, label: string) {
  if (!source.includes(needle)) {
    failures.push(`${label} must include ${needle}`);
  }
}

function requireNotIncludes(source: string, needle: string, label: string) {
  if (source.includes(needle)) {
    failures.push(`${label} must not include ${needle}`);
  }
}

const helper = read("src/lib/identity/actor-markers.ts");
const syntheticHelper = read("src/lib/admin/synthetic-creators-view-as.ts");
const analyticsContract = read("src/lib/analytics/analytics-event-contract.ts");
const serverAnalytics = read("src/lib/server/analytics.ts");
const creatorOnboardingServer = read("src/lib/server/creator-onboarding.ts");
const creatorOnboarding = read("src/lib/creator-onboarding.ts");
const userRegisterRoute = read("src/app/api/user/register/route.ts");
const adminRosterRoute = read("src/app/api/admin/roster/route.ts");
const adminUsersRoute = read("src/app/api/admin/users/route.ts");
const adminRosterPage = read("src/app/admin/roster/page.tsx");
const creatorIntroRoute = read("src/app/api/creator/onboarding/intro/route.ts");
const creatorApplicationRoute = read("src/app/api/creator/onboarding/application/route.ts");
const creatorContractRoute = read("src/app/api/creator/onboarding/contract-signature/route.ts");
const creatorIdSubmissionRoute = read("src/app/api/creator/onboarding/id-submission/route.ts");
const creatorSettingsRoute = read("src/app/api/creator/settings/route.ts");
const creatorFacingWaitlist = read("src/app/creators/waitlist/page.tsx");
const actorMarkerTest = read("tests/unit/actor-markers.spec.ts");
const packageJson = read("package.json");
const creatorIdentityDoc = read("docs/agent-truth/creator-identity-markers.md");
const actorTaxonomyDoc = read("docs/agent-truth/analytics-actor-taxonomy.md");
const repoLedger = read("REPO_MEMORY_LEDGER.md");
const fullAudit = read("FULL_SCALE_CODEBASE_AUDIT.md");
const fileChecklist = read("EVERY_FILE_FUNCTION_CHECKLIST.md");

[
  "classifyActorFromUser",
  "buildActorMarker",
  "buildAdminOnBehalfMarker",
  "assertKnownActor",
  "explainActorMarker",
  "actorMarkerToTelemetryPayload",
  "buildActorMarkerDebugFields",
  "actorMarkerPresent",
  "guest",
  "user",
  "creator",
  "admin",
  "owner_admin",
  "system",
  "unknown",
  "own_account",
  "admin_on_behalf",
  "owner_override",
  "system_job",
  "admin_roster",
  "creator_intake",
  "creator_experiences",
  "creator_account_admin",
  "unknownActorBlocked",
].forEach((needle) => requireIncludes(helper, needle, "actor marker helper"));

[
  "INTERNAL_SYNTHETIC_LEGAL_EVIDENCE_MODE",
  "syntheticLegalEvidenceMode",
  "getSyntheticCreatorMarkerMissingFields",
  "REQUIRED_SYNTHETIC_CREATOR_MARKER_FIELDS",
].forEach((needle) => requireIncludes(syntheticHelper, needle, "synthetic creator marker helper"));

[
  "synthetic_creator_marked",
  "syntheticLegalEvidenceMode",
].forEach((needle) => requireIncludes(creatorOnboarding, needle, "creator onboarding synthetic marker contract"));

requireIncludes(helper, "UnknownActorMarkerError", "actor marker helper");
requireIncludes(helper, "Admin-on-behalf actor markers require targetUserId", "actor marker helper");
requireIncludes(analyticsContract, "\"owner_admin\"", "analytics event contract actor types");
requireIncludes(analyticsContract, "classification.actorType === \"owner_admin\"", "analytics user-behavior exclusion");
requireIncludes(serverAnalytics, "explicitActorType", "server analytics explicit actor classification");
requireIncludes(serverAnalytics, "performedAs", "server analytics actor marker fields");
requireIncludes(serverAnalytics, "targetUserId", "server analytics actor marker fields");
requireIncludes(serverAnalytics, "userId && inclusion.includeInUserBehavior", "server analytics active-user guard");

[
  [creatorOnboardingServer, "buildActorMarkerDebugFields", "creator onboarding server history"],
  [userRegisterRoute, "buildCreatorSignupMarker", "user register creator signup marker"],
  [userRegisterRoute, "actorMarkerToTelemetryPayload", "user register creator signup telemetry"],
  [userRegisterRoute, "targetUserId: input.uid", "user register target self marker"],
  [adminRosterRoute, "buildAdminOnBehalfMarker", "admin roster route marker"],
  [adminRosterRoute, "owner_override", "admin roster owner override marker"],
  [adminRosterRoute, "admin_on_behalf", "admin roster admin marker"],
  [adminRosterRoute, "targetCreatorId", "admin roster target creator marker"],
  [adminUsersRoute, "buildAdminOnBehalfMarker", "admin users route marker"],
  [adminUsersRoute, "owner_override_creator_onboarding_update", "admin users owner override marker"],
  [adminUsersRoute, "buildActorMarkerDebugFields", "admin users debug marker fields"],
  [adminRosterPage, "actorType", "admin roster page telemetry marker"],
  [adminRosterPage, "performedAs", "admin roster page telemetry marker"],
  [adminRosterPage, "targetUserId", "admin roster page telemetry marker"],
  [adminRosterPage, "SyntheticCreatorCreateFields", "admin roster synthetic creator controls"],
  [creatorIntroRoute, "actorMarkerToTelemetryPayload", "creator intro telemetry marker"],
  [creatorApplicationRoute, "creator_application_updated", "creator application telemetry marker"],
  [creatorContractRoute, "agreement_version", "creator contract marker metadata"],
  [creatorIdSubmissionRoute, "unknownActorBlocked", "creator ID unknown actor safe state"],
  [creatorSettingsRoute, "creator_settings_updated", "creator settings marker telemetry"],
].forEach(([source, needle, label]) => requireIncludes(source, needle, label));

requireNotIncludes(creatorFacingWaitlist, "actorUid", "creator-facing waitlist UI");
requireNotIncludes(creatorFacingWaitlist, "targetUserId", "creator-facing waitlist UI");
requireNotIncludes(creatorFacingWaitlist, "actorClassificationReason", "creator-facing waitlist UI");

[
  "classifies user, creator, admin, owner_admin, system, guest, and unknown actors",
  "builds admin-on-behalf markers with target user identity",
  "marks creator signup as a user acting on their own creator intake",
  "marks owner override actions with owner_admin and owner_override",
  "blocks unknown actors instead of promoting them to user",
].forEach((needle) => requireIncludes(actorMarkerTest, needle, "actor marker tests"));

requireIncludes(packageJson, "check:creator-identity-markers", "package scripts");
requireIncludes(creatorIdentityDoc, "actorMarkerPresent", "creator identity marker doctrine");
requireIncludes(creatorIdentityDoc, "unknownActorBlocked", "creator identity marker doctrine");
requireIncludes(creatorIdentityDoc, "syntheticLegalEvidenceMode", "creator identity marker doctrine");
requireIncludes(creatorIdentityDoc, "Mark as internal synthetic creator", "creator identity marker doctrine");
requireIncludes(actorTaxonomyDoc, "owner_admin", "analytics actor taxonomy");
requireIncludes(repoLedger, "Creator identity markers are canonical", "repo memory ledger");
requireIncludes(fullAudit, "Creator Identity Marker Hardening", "full audit ledger");
requireIncludes(fileChecklist, "Creator Identity Marker Hardening Coverage", "file checklist");

if (failures.length > 0) {
  console.error("Creator identity marker validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Creator identity marker validation passed.");
