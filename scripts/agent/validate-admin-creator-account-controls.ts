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

const page = read("src/app/admin/roster/page.tsx");
const panel = read("src/components/Admin/CreatorAccountControlsPanel.tsx");
const helper = read("src/lib/admin/creator-account-controls.ts");
const route = read("src/app/api/admin/creator-account-controls/route.ts");
const usersRoute = read("src/app/api/admin/users/route.ts");
const decisionQueue = read("src/app/admin/roster/decision-queue.ts");
const creatorOnboarding = read("src/lib/creator-onboarding.ts");
const telemetryCatalog = read("src/lib/telemetry-catalog.ts");
const packageJson = read("package.json");
const routeTests = read("tests/unit/admin-creator-account-controls-route.spec.ts");
const adminUsersTests = read("tests/unit/admin-users-route.spec.ts");
const rosterTests = read("tests/unit/admin-roster-decision-queue.spec.ts");
const docs = read("docs/agent-truth/admin-creator-account-controls.md");
const securityDocs = read("docs/agent-truth/security-role-boundaries.md");
const identityDocs = read("docs/agent-truth/creator-identity-markers.md");
const fullAudit = read("FULL_SCALE_CODEBASE_AUDIT.md");
const repoLedger = read("REPO_MEMORY_LEDGER.md");
const checklist = read("EVERY_FILE_FUNCTION_CHECKLIST.md");

[
  "Account controls",
  "CreatorAccountControlsPanel",
  "account_controls: false",
  "handleAccountControlSubmit",
  "/api/admin/creator-account-controls",
  "lastAdminAccountActionAt",
  "passwordActionMode",
  "emailUpdateServerConfirmed",
  "roleUpdateServerConfirmed",
].forEach((needle) => requireIncludes(page, needle, "admin roster page"));

[
  "Confirm before changing login, role, or account access",
  "Temporary password",
  "Create reset link",
  "Only owner admin can grant admin access.",
  "Open public profile",
  "min-h-11",
].forEach((needle) => requireIncludes(panel, needle, "account controls panel"));

[
  "current password",
  "Current password",
  "plaintext",
  "plain text password",
  ">creator_pending<",
  ">signature_pending<",
].forEach((needle) => requireNotIncludes(panel, needle, "account controls visible UI"));

[
  "parseCreatorAccountControlCommand",
  "isDangerousCreatorAccountAction",
  "redactAccountControlValue",
  "[password hidden]",
  "formatCreatorApprovalStatus",
  "buildCreatorPublicProfilePath",
].forEach((needle) => requireIncludes(helper, needle, "account controls helper"));

[
  "auth: \"admin\"",
  "requireTrustedOrigin: true",
  "buildAdminOnBehalfMarker",
  "surface: \"creator_account_admin\"",
  "performedAs: \"admin_on_behalf\"",
  "adminAuth.updateUser",
  "generatePasswordResetLink",
  "admin_account_updated",
  "recordCreatorOnboardingHistoryEntries",
  "Only the owner admin can grant admin access.",
].forEach((needle) => requireIncludes(route, needle, "account controls route"));

[
  "admin_creator_account_updated",
  "admin_creator_email_updated",
  "admin_creator_password_reset_sent",
  "admin_creator_temporary_password_set",
  "admin_creator_role_updated",
  "admin_creator_status_updated",
].forEach((eventName) => {
  requireIncludes(route, `trackServerEvent("${eventName}"`, "account controls route telemetry");
  requireIncludes(telemetryCatalog, eventName, "telemetry catalog");
});

requireIncludes(usersRoute, "Only the owner admin can grant admin access.", "legacy admin users role boundary");
requireIncludes(decisionQueue, "\"account_controls\"", "roster detail section registry");
requireIncludes(creatorOnboarding, "\"admin_account_updated\"", "creator onboarding history event registry");

[
  "admin can update creator display name",
  "rejects non-admin callers",
  "does not expose or store plaintext temporary passwords",
  "audits role updates",
  "audits account status changes",
].forEach((needle) => requireIncludes(routeTests, needle, "account controls route tests"));
requireIncludes(adminUsersTests, "blocks non-owner admins from granting admin access", "admin users route tests");
requireIncludes(rosterTests, "account_controls", "roster decision queue tests");

requireIncludes(packageJson, "check:admin-creator-account-controls", "package scripts");
requireIncludes(docs, "Account controls", "account controls docs");
requireIncludes(securityDocs, "creator-account-controls", "security role boundary docs");
requireIncludes(identityDocs, "creator_account_admin", "creator identity marker docs");
requireIncludes(fullAudit, "Admin Roster Account Controls", "full audit ledger");
requireIncludes(repoLedger, "Admin Roster account controls", "repo memory ledger");
requireIncludes(checklist, "Admin Roster Account Controls Coverage", "file checklist");

if (failures.length > 0) {
  console.error("Admin creator account controls validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Admin creator account controls validation passed.");
