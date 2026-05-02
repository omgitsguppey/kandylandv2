import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(relativePath: string) {
  const absolutePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing required file: ${relativePath}`);
  }
  return fs.readFileSync(absolutePath, "utf8");
}

function assertIncludes(source: string, needle: string, message: string) {
  if (!source.includes(needle)) {
    throw new Error(message);
  }
}

function assertNotIncludes(source: string, needle: string, message: string) {
  if (source.includes(needle)) {
    throw new Error(message);
  }
}

const routePath = "src/app/api/admin/creators/[userId]/action/route.ts";
const helperPath = "src/lib/server/creator-admin-actions.ts";
const contractPath = "src/lib/server/creator-admin-action-contract.ts";
const rosterPath = "src/app/admin/roster/page.tsx";
const docsPath = "docs/agent-truth/creator-admin-action-route.md";
const testPath = "tests/unit/admin-creator-action-route.spec.ts";

const route = read(routePath);
const helper = read(helperPath);
const contract = read(contractPath);
const serverActionSource = `${helper}\n${contract}`;
const roster = read(rosterPath);
const docs = read(docsPath);
const tests = read(testPath);
const packageJson = read("package.json");

[
  "send_agreement",
  "send_updated_agreement",
  "countersign_agreement",
  "request_id",
  "mark_id_verified",
  "mark_id_rejected",
  "approve_creator",
  "reject_creator",
  "request_changes",
  "apply_owner_override",
  "clear_owner_override",
  "activate_creator_role",
  "update_admin_notes",
].forEach((action) => {
  assertIncludes(serverActionSource, `"${action}"`, `Creator admin action contract must register ${action}.`);
});

assertIncludes(route, "guardApiRequest", "Typed creator action route must use guardApiRequest.");
assertIncludes(route, 'auth: "admin"', "Typed creator action route must require admin auth.");
assertIncludes(route, "requireTrustedOrigin: true", "Typed creator action route must require trusted origin.");
assertIncludes(route, "parseCreatorAdminActionRequest", "Typed creator action route must parse the typed request shape.");
assertIncludes(route, "executeCreatorAdminAction", "Typed creator action route must call the server action executor.");

assertIncludes(serverActionSource, "OWNER_ONLY_CREATOR_ADMIN_ACTIONS", "Owner-only action registry must exist.");
assertIncludes(serverActionSource, '"apply_owner_override"', "Owner override must be listed as owner-only.");
assertIncludes(serverActionSource, '"clear_owner_override"', "Clear owner override must be listed as owner-only.");
assertIncludes(serverActionSource, "Only the owner admin", "Owner-only actions must reject non-owner admins.");
assertIncludes(serverActionSource, "buildCreatorAdminLifecycleSource", "Lifecycle transitions must be derived on the server.");
assertIncludes(serverActionSource, "throw new AuthError", "Invalid transitions must be rejected server-side.");
assertIncludes(serverActionSource, "syncCreatorOnboardingDocuments", "Lifecycle actions must update canonical onboarding, user projection, and review queue together.");
assertIncludes(serverActionSource, "recordCreatorOnboardingHistoryEntries", "Lifecycle actions must append creator onboarding history.");
assertIncludes(serverActionSource, "buildCreatorOnboardingStatusChangeHistoryEntries", "Lifecycle actions must use the shared history normalizer.");
assertIncludes(serverActionSource, "trackServerEvent", "Lifecycle actions must emit telemetry.");
assertIncludes(serverActionSource, "actorMarkerToTelemetryPayload", "Telemetry must include actor markers.");

assertNotIncludes(roster, 'authFetch("/api/admin/users"', "Admin Roster must not submit lifecycle actions to the generic admin users route.");
assertNotIncludes(roster, "creatorApplication: {", "Admin Roster must not build mutable creatorApplication blobs for lifecycle actions.");
assertIncludes(roster, "`/api/admin/creators/${selectedUserId}/action`", "Admin Roster must call the typed creator action route.");
assertIncludes(roster, '"request_id"', "Admin Roster must use typed request_id action.");
assertIncludes(roster, '"approve_creator"', "Admin Roster must use typed approve_creator action.");
assertIncludes(roster, '"request_changes"', "Admin Roster must use typed request_changes action.");
assertIncludes(roster, '"reject_creator"', "Admin Roster must use typed reject_creator action.");
assertIncludes(roster, '"apply_owner_override"', "Admin Roster must use typed owner override action.");
assertIncludes(roster, '"send_agreement"', "Admin Roster agreement actions must use typed route actions.");

assertIncludes(docs, "creator_onboarding/{uid}", "Docs must identify canonical creator onboarding source.");
assertIncludes(docs, "/api/admin/creators/[userId]/action", "Docs must document the typed action route.");
assertIncludes(docs, "Forbidden", "Docs must document forbidden generic blob updates.");
assertIncludes(docs, "history", "Docs must document audit history.");
assertIncludes(docs, "creator_review_queue", "Docs must document review queue materialization.");

[
  "send agreement",
  "request ID",
  "countersign",
  "approve",
  "reject",
  "owner override",
  "invalid transition",
  "non-admin",
  "history",
  "queue",
].forEach((phrase) => {
  assertIncludes(tests.toLowerCase(), phrase.toLowerCase(), `Focused route tests must cover ${phrase}.`);
});

assertIncludes(packageJson, "check:creator-admin-action-route", "package.json must expose the targeted creator admin action route validation.");

console.log("Creator admin action route validation passed.");
