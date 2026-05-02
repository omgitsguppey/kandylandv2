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

const sharedContract = read("src/lib/creator-agreement-documents.ts");
const templateServer = read("src/lib/server/creator-agreement-templates.ts");
const dispatchServer = read("src/lib/server/creator-agreement-documents.ts");
const adminRoute = read("src/app/api/admin/creator-agreements/route.ts");
const creatorDocumentRoute = read("src/app/api/creator/onboarding/agreement-document/route.ts");
const signatureRoute = read("src/app/api/creator/onboarding/contract-signature/route.ts");
const onboardingServer = read("src/lib/server/creator-onboarding.ts");
const onboardingContract = read("src/lib/creator-onboarding.ts");
const rosterPage = read("src/app/admin/roster/page.tsx");
const waitlistPage = read("src/app/creators/waitlist/page.tsx");
const creatorAgreementReview = read("src/components/Creators/CreatorAgreementReview.tsx");
const creatorAgreementFullText = read("src/components/Creators/CreatorAgreementFullText.tsx");
const telemetryCatalog = read("src/lib/telemetry-catalog.ts");
const packageJson = read("package.json");
const helperTests = read("tests/unit/creator-agreement-documents.spec.ts");
const routeTests = read("tests/unit/admin-creator-agreements-route.spec.ts");
const signatureTests = read("tests/unit/creator-contract-signature-route.spec.ts");
const docs = read("docs/agent-truth/creator-agreement-document-manager.md");
const intakeDocs = read("docs/agent-truth/creator-intake-flow.md");
const rosterDocs = read("docs/agent-truth/admin-roster-decision-queue.md");
const fullAudit = read("FULL_SCALE_CODEBASE_AUDIT.md");
const repoLedger = read("REPO_MEMORY_LEDGER.md");
const checklist = read("EVERY_FILE_FUNCTION_CHECKLIST.md");

[
  "CreatorAgreementTemplate",
  "CreatorAgreementDispatch",
  "CreatorAgreementSignature",
  "agreementVersion",
  "agreementHash",
  "activeForNewCreators",
  "buildDefaultCreatorAgreementTemplate",
  "toCreatorAgreementTemplateAdminView",
].forEach((needle) => requireIncludes(sharedContract, needle, "shared agreement contract"));

[
  "getActiveCreatorAgreementTemplate",
  "activateCreatorAgreementTemplate",
  "CREATOR_AGREEMENT_ACTIVE_TEMPLATE_DOC_ID",
  "agreement_template_activated",
].forEach((needle) => requireIncludes(templateServer, needle, "agreement template server helper"));

[
  "sendCreatorAgreementDispatch",
  "sendUpdatedAgreement",
  "agreement_update_sent",
  "creatorSignatureStatus: \"signature_pending\"",
  "adminSignatureStatus: \"signature_pending\"",
  "supersededByDispatchId",
  "countersignCreatorAgreementDispatch",
  "Creator signature is required before admin countersign.",
  "buildCreatorAgreementSignature",
].forEach((needle) => requireIncludes(dispatchServer, needle, "agreement dispatch server helper"));

[
  "getActiveCreatorAgreementTemplate",
  "contractVersion",
  "agreementTemplateId",
  "agreementHash",
  "agreementSource",
].forEach((needle) => requireIncludes(onboardingServer, needle, "creator onboarding active agreement seeding"));

[
  "agreementTemplateId",
  "agreementTitle",
  "agreementHash",
  "agreementSource",
  "agreementDispatchId",
  "agreementDispatchStatus",
  "agreement_update_sent",
].forEach((needle) => requireIncludes(onboardingContract, needle, "creator onboarding agreement projection"));

[
  "guardApiRequest",
  "requireTrustedOrigin: true",
  "auth: \"admin\"",
  "create_template",
  "activate_template",
  "send_agreement",
  "send_updated_agreement",
  "countersign_agreement",
  "admin_creator_agreement_template_created",
  "admin_creator_agreement_template_activated",
  "admin_creator_agreement_sent",
  "admin_creator_agreement_update_sent",
  "admin_creator_agreement_countersigned",
  "actorMarkerToTelemetryPayload",
  "targetUserId",
  "Only the primary owner can activate",
].forEach((needle) => requireIncludes(adminRoute, needle, "admin creator agreements route"));

[
  "guardApiRequest",
  "scopeToCaller: true",
  "agreementHash !== canonical.agreementHash",
  "getSignedUrl",
].forEach((needle) => requireIncludes(creatorDocumentRoute, needle, "creator agreement document route"));

[
  "agreementVersion",
  "agreementHash",
  "templateId",
  "dispatchId",
  "CREATOR_AGREEMENT_SIGNATURES_SUBCOLLECTION",
  "creator_contract_signed",
].forEach((needle) => requireIncludes(signatureRoute, needle, "creator signature route evidence"));

[
  "Agreement document",
  "Current agreement version",
  "Full document available",
  "Agreement hash available",
  "Send updated agreement",
  "Agreement templates",
  "Upload or replace agreement source",
  "Mark as active for new creators",
  "activeAgreementVersion",
  "selectedCreatorAgreementHash",
  "signatureEvidenceComplete",
].forEach((needle) => requireIncludes(rosterPage, needle, "admin roster agreement UI"));

[
  "creator-agreements",
  "agreementFile",
  "handleCreatorAgreementAction",
  "handleAgreementTemplateSubmit",
  "handleViewAgreement",
].forEach((needle) => requireIncludes(rosterPage, needle, "admin roster agreement actions"));

[
  "creator-agreements/",
  "fullTextStoragePath",
  "pdfStoragePath",
].forEach((needle) => requireNotIncludes(rosterPage, needle, "admin roster visible UI must not expose storage paths"));

[
  "Agreement version",
  "Document title",
  "/api/creator/onboarding/agreement-document",
].forEach((needle) => requireIncludes(`${waitlistPage}\n${creatorAgreementReview}\n${creatorAgreementFullText}`, needle, "creator-facing agreement version view"));

[
  "admin_creator_agreement_template_created",
  "admin_creator_agreement_template_activated",
  "admin_creator_agreement_sent",
  "admin_creator_agreement_update_sent",
  "admin_creator_agreement_countersigned",
].forEach((eventName) => requireIncludes(telemetryCatalog, eventName, "telemetry catalog"));

requireIncludes(packageJson, "check:creator-agreement-document-manager", "package scripts");
requireIncludes(helperTests, "signature evidence", "creator agreement helper tests");
requireIncludes(routeTests, "sends updated agreements", "admin creator agreement route tests");
requireIncludes(signatureTests, "agreementHash: \"sha256:v2\"", "creator signature evidence tests");
requireIncludes(docs, "Creator agreement document manager", "agreement manager docs");
requireIncludes(intakeDocs, "active agreement", "creator intake docs");
requireIncludes(rosterDocs, "Agreement document", "admin roster docs");
requireIncludes(fullAudit, "Creator Agreement Document Manager", "full audit ledger");
requireIncludes(repoLedger, "creator agreement document manager", "repo memory ledger");
requireIncludes(checklist, "Creator Agreement Document Manager Coverage", "file checklist");

if (failures.length > 0) {
  console.error("Creator agreement document manager validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Creator agreement document manager validation passed.");
