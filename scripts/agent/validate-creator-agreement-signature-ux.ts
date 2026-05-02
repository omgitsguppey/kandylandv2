import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const componentPath = "src/components/Creators/CreatorAgreementReview.tsx";
const fullTextComponentPath = "src/components/Creators/CreatorAgreementFullText.tsx";
const signatureComponentPath = "src/components/Creators/CreatorAgreementSignatureSection.tsx";
const helperPath = "src/lib/creator-agreement-signature-ux.ts";
const routePath = "src/app/api/creator/onboarding/contract-signature/route.ts";
const docsPath = "docs/agent-truth/creator-agreement-signature-ux.md";
const documentManagerDocsPath = "docs/agent-truth/creator-agreement-document-manager.md";
const waitlistPath = "src/app/creators/waitlist/page.tsx";

const component = read(componentPath);
const fullTextComponent = read(fullTextComponentPath);
const signatureComponent = read(signatureComponentPath);
const helper = read(helperPath);
const route = read(routePath);
const docs = read(docsPath);
const documentManagerDocs = read(documentManagerDocsPath);
const waitlist = read(waitlistPath);

[
  "Creator Service Agreement",
  "Review the full agreement before signing. Your signature, agreement version, timestamp, and device details are stored in the audit trail.",
  "Summary",
  "Important acknowledgements",
  "Full agreement",
  "Signature",
  "View/download PDF",
  "env(safe-area-inset-bottom)",
].forEach((required) => {
  assert(`${component}\n${fullTextComponent}\n${signatureComponent}`.includes(required), `Agreement viewer is missing required UI copy or mobile-safe CTA marker: ${required}`);
});

[
  "I understand creator tools activate only after approval.",
  "I understand KandyDrops may pause creator access for compliance, moderation, payout, or safety review.",
  "I understand my signed agreement version and signature record will be stored.",
  "I reviewed the full agreement before signing.",
].forEach((required) => {
  assert(helper.includes(required), `Required acknowledgement is missing from shared helper: ${required}`);
});

[
  "Agreement not sent yet",
  "Ready to review",
  "Waiting for your signature",
  "Waiting for admin countersign",
  "Agreement complete",
].forEach((copy) => {
  assert(helper.includes(copy) || component.includes(copy), `Creator-facing status copy is missing: ${copy}`);
});

assert(helper.includes("hasRequiredCreatorAgreementAcknowledgements"), "Shared acknowledgement gate helper is missing.");
assert(helper.includes("Agreement dispatch is missing."), "Signature readiness must block missing dispatch.");
assert(helper.includes("Agreement hash is missing."), "Signature readiness must block missing agreement hash.");
assert(helper.includes("buildCreatorAgreementTelemetryPayload"), "Creator agreement telemetry payload helper is missing.");

[
  "normalizeCreatorAgreementAcknowledgements",
  "hasRequiredCreatorAgreementAcknowledgements",
  "No active agreement dispatch exists for this account.",
  "Agreement hash is missing.",
  "signatureIp",
  "signatureUserAgent",
  "agreementSource: template.agreementSource",
  "pdfStoragePath: template.pdfStoragePath",
  "fullTextSnapshotPath: template.fullTextStoragePath",
  "creator_agreement_signed",
  "creator_contract_signed",
  "creator_contract_signed_",
  "merge: false",
].forEach((required) => {
  assert(route.includes(required), `Signature route is missing required evidence/gating behavior: ${required}`);
});

[
  "creator_agreement_viewed",
  "creator_agreement_section_opened",
  "creator_agreement_acknowledgement_checked",
  "creator_agreement_signed",
].forEach((eventName) => {
  assert(component.includes(eventName) || route.includes(eventName), `Agreement telemetry event is not emitted: ${eventName}`);
  assert(read("src/lib/telemetry-catalog.ts").includes(eventName), `Agreement telemetry event is not cataloged: ${eventName}`);
});

[
  "Read the full MGSA",
  "Sign agreement\"",
].forEach((oldCopy) => {
  assert(!waitlist.includes(oldCopy), `Old summary-only agreement copy remains in waitlist page: ${oldCopy}`);
});

assert(waitlist.includes("CreatorAgreementReview"), "Waitlist page must use the focused agreement review component.");
assert(docs.includes("full agreement viewer"), "Signature UX doctrine must document the full agreement viewer.");
assert(docs.includes("acknowledgements"), "Signature UX doctrine must document required acknowledgements.");
assert(documentManagerDocs.includes("Creator-facing signature UX"), "Agreement document manager doctrine must link the signature UX rule.");

console.log("Creator agreement signature UX validation passed.");
