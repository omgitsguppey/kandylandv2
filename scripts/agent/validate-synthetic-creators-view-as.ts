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

const helper = read("src/lib/admin/synthetic-creators-view-as.ts");
const actorMarkers = read("src/lib/identity-truth/identity/actor-markers.ts");
const rosterRoute = read("src/app/api/admin/roster/route.ts");
const viewAsRoute = read("src/app/api/admin/view-as-creator/route.ts");
const rosterPage = read("src/app/admin/roster/page.tsx");
const authFetch = read("src/lib/authFetch.ts");
const layout = read("src/app/layout.tsx");
const banner = read("src/components/Admin/AdminViewAsBanner.tsx");
const viewAsControls = read("src/components/Admin/AdminCreatorViewAsControls.tsx");
const telemetryCatalog = read("src/lib/telemetry-catalog.ts");
const docs = read("docs/agent-truth/synthetic-creators-view-as.md");
const securityDocs = read("docs/agent-truth/security-role-boundaries.md");
const identityDocs = read("docs/agent-truth/creator-identity-markers.md");
const tests = read("tests/unit/synthetic-creators-view-as.spec.ts");
const packageJson = read("package.json");

[
  "isSyntheticCreator",
  "syntheticCreatorType",
  "syntheticCreatedByUid",
  "syntheticCreatedAt",
  "syntheticReason",
  "syntheticLegalEvidenceMode",
  "humanOperatorRequired",
  "buildSyntheticCreatorMarker",
  "INTERNAL_SYNTHETIC_LEGAL_EVIDENCE_MODE",
  "getSyntheticCreatorMarkerMissingFields",
].forEach((needle) => requireIncludes(helper + rosterRoute, needle, "synthetic creator marker"));

[
  "Only the primary owner can create synthetic creators.",
  "Enter an internal reason before creating a synthetic creator.",
  "admin_synthetic_creator_created",
  "synthetic_legal_evidence_mode",
  "synthetic_creator_created",
].forEach((needle) => requireIncludes(rosterRoute, needle, "admin roster synthetic creation route"));

[
  "admin_view_as_creator_started",
  "admin_view_as_creator_ended",
  "admin_projection_write_blocked",
  "buildAdminViewAsTelemetryPayload",
  "admin_view_as_started",
  "admin_view_as_ended",
  "admin_view_as_action_blocked",
  "requireTrustedOrigin: true",
  "auth: \"admin\"",
].forEach((needle) => requireIncludes(viewAsRoute, needle, "admin view-as route"));

[
  "admin_view_as_creator",
  "Admin-on-behalf actor markers require targetUserId.",
].forEach((needle) => requireIncludes(actorMarkers, needle, "actor marker performedAs support"));

[
  "AdminViewAsProvider",
  "AdminViewAsBanner",
  "data-admin-view-as-banner=\"true\"",
  "Return to admin",
  "bottom-[calc(env(safe-area-inset-bottom)+0.75rem)]",
].forEach((needle) => requireIncludes(layout + banner, needle, "return-to-admin banner"));

[
  "isAdminViewAsBlockedRequest",
  "/api/admin/view-as-creator",
  "Blocked view-as state-changing request",
].forEach((needle) => requireIncludes(authFetch, needle, "view-as authFetch guard"));
requireIncludes(helper, "\"x-admin-view-as-user-id\"", "view-as helper headers");

[
  "SyntheticCreatorCreateFields",
  "AdminCreatorViewAsControls",
  "syntheticCreatorMarkerPresent",
  "destructiveActionsBlockedInViewAs",
].forEach((needle) => requireIncludes(rosterPage, needle, "admin roster view-as UI"));
[
  "View as creator",
  "View fan profile",
].forEach((needle) => requireIncludes(viewAsControls, needle, "admin roster view-as controls"));

[
  "admin_synthetic_creator_created",
  "admin_view_as_creator_started",
  "admin_view_as_creator_ended",
  "admin_projection_write_blocked",
  "admin_view_as_creator_action_blocked",
].forEach((eventName) => requireIncludes(telemetryCatalog, eventName, "telemetry catalog"));

[
  "safe simulation mode",
  "does not replace Firebase auth identity",
  "internal_synthetic_no_external_agreement",
  "Return to admin",
].forEach((needle) => requireIncludes(docs, needle, "synthetic creator docs"));

requireIncludes(securityDocs, "admin_view_as_creator", "security role boundary docs");
requireIncludes(identityDocs, "admin_view_as_creator", "creator identity marker docs");
requireIncludes(tests, "blocked purchase", "synthetic/view-as tests");
requireIncludes(packageJson, "check:synthetic-creators-view-as", "package scripts");

if (failures.length > 0) {
  console.error("Synthetic creators and view-as validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Synthetic creators and view-as validation passed.");
