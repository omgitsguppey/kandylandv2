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

const creatorOnboarding = read("src/lib/creator-onboarding.ts");
const serverCreatorOnboarding = read("src/lib/server/creator-onboarding.ts");
const rosterPage = read("src/app/admin/roster/page.tsx");
const auditPanel = read("src/components/Admin/CreatorAuditTrailPanel.tsx");
const contractSignatureRoute = read("src/app/api/creator/onboarding/contract-signature/route.ts");
const adminAgreementServer = read("src/lib/server/creator-agreement-documents.ts");
const introRoute = read("src/app/api/creator/onboarding/intro/route.ts");
const idSubmissionRoute = read("src/app/api/creator/onboarding/id-submission/route.ts");
const accountControlsRoute = read("src/app/api/admin/creator-account-controls/route.ts");
const fanExperienceRoute = read("src/app/api/admin/creator-fan-experience-settings/route.ts");
const telemetryCatalog = read("src/lib/telemetry-catalog.ts");
const docs = read("docs/agent-truth/creator-onboarding-audit-trail.md");
const rosterDocs = read("docs/agent-truth/admin-roster-decision-queue.md");
const tests = read("tests/unit/creator-audit-trail-panel.spec.tsx") + read("tests/unit/creator-onboarding.spec.ts") + read("tests/unit/creator-onboarding-server.spec.ts");
const packageJson = read("package.json");

[
  "onboarding_started",
  "onboarding_submitted",
  "intro_acknowledged",
  "intake_step_completed",
  "legal_sent",
  "agreement_update_sent",
  "creator_contract_signed",
  "admin_contract_signed",
  "legal_signed",
  "id_requested",
  "id_submitted",
  "id_verified",
  "id_rejected",
  "creator_approved",
  "creator_rejected",
  "creator_needs_changes",
  "owner_override_applied",
  "owner_override_cleared",
  "creator_role_activated",
  "creator_role_activation_blocked",
  "creator_experience_settings_updated",
  "admin_account_updated",
  "synthetic_creator_created",
  "admin_view_as_started",
  "admin_view_as_ended",
].forEach((eventType) => requireIncludes(creatorOnboarding, `"${eventType}"`, "creator onboarding required history event types"));

[
  "buildCreatorOnboardingHistoryEntry",
  "actorMarker",
  "targetUserId",
  "agreementVersion",
  "agreementHash",
  "ip",
  "userAgent",
].forEach((needle) => requireIncludes(creatorOnboarding + serverCreatorOnboarding, needle, "normalized creator history entry contract"));

[
  "buildCreatorOnboardingHistoryEntry",
  "creator_contract_signed",
  "agreementVersion: dispatch.agreementVersion",
  "agreementHash: dispatch.agreementHash",
  "ip: signatureIp",
  "userAgent: signatureUserAgent",
].forEach((needle) => requireIncludes(contractSignatureRoute, needle, "creator signature audit history"));

[
  "buildCreatorOnboardingHistoryEntry",
  "agreement_update_sent",
  "agreementVersion: template.agreementVersion",
  "agreementHash: template.agreementHash",
].forEach((needle) => requireIncludes(adminAgreementServer, needle, "agreement dispatch audit history"));

[
  "intro_acknowledged",
  "id_requested",
  "id_submitted",
].forEach((needle) => requireIncludes(introRoute + idSubmissionRoute, needle, "creator intake and ID audit history"));

[
  "admin_account_updated",
  "creator_role_activation_blocked",
].forEach((needle) => requireIncludes(accountControlsRoute, needle, "admin account audit history"));
requireIncludes(fanExperienceRoute, "creator_experience_settings_updated", "fan experience settings audit history");

[
  "CreatorAuditTrailPanel",
  "Audit trail",
  "admin_creator_audit_trail_opened",
  "admin_creator_audit_event_expanded",
].forEach((needle) => requireIncludes(rosterPage + auditPanel, needle, "Admin Roster audit trail UI"));
requireIncludes(auditPanel, "data-audit-trail-default-count=\"3\"", "Admin Roster audit trail latest-three contract");
requireIncludes(auditPanel, "View full history", "Admin Roster audit trail full-history expansion");
requireIncludes(auditPanel, "Details", "Admin Roster audit metadata details");

[
  "admin_creator_audit_trail_opened",
  "admin_creator_audit_event_expanded",
].forEach((eventName) => requireIncludes(telemetryCatalog, eventName, "admin audit viewer telemetry catalog"));

[
  "Every intake, agreement, ID, approval, and owner action is recorded here.",
  "latest 3",
  "Admin Debug",
].forEach((needle) => requireIncludes(docs, needle, "creator audit trail docs"));

requireIncludes(rosterDocs, "Audit trail", "Admin Roster decision queue docs");
requireIncludes(tests, "latest three events", "creator audit trail tests");
requireIncludes(packageJson, "check:creator-audit-trail", "package scripts");

if (failures.length > 0) {
  console.error("Creator audit trail validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Creator audit trail validation passed.");
