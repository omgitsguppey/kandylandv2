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
const helper = read("src/app/admin/roster/decision-queue.ts");
const telemetryCatalog = read("src/lib/telemetry-catalog.ts");
const validationPackage = read("package.json");
const docs = read("docs/agent-truth/admin-roster-decision-queue.md");
const identityDocs = read("docs/agent-truth/creator-identity-markers.md");
const tests = read("tests/unit/admin-roster-decision-queue.spec.ts");
const fullAudit = read("FULL_SCALE_CODEBASE_AUDIT.md");
const repoLedger = read("REPO_MEMORY_LEDGER.md");
const checklist = read("EVERY_FILE_FUNCTION_CHECKLIST.md");

[
  "Needs Review",
  "Waiting",
  "Approved",
  "Create",
  "ROSTER_DECISION_TABS",
  "classifyRosterDecisionEntry",
  "buildPrimaryActionLabel",
  "buildRosterTelemetryPayload",
].forEach((needle) => requireIncludes(helper, needle, "decision queue helper"));

[
  "Creator Review",
  "Review applications, send agreements, verify identity, and activate approved creators.",
  "Each row shows the next decision needed. Open a creator only when you need the full record.",
  "Select a creator to review their next step, agreement status, ID status, and audit trail.",
  "role=\"tablist\"",
  "role=\"tab\"",
  "data-roster-mode=\"decision_queue\"",
  "Agreement record",
  "ID files",
  "Audit trail",
  "Admin notes",
  "Owner controls",
  "isOwner ? (",
].forEach((needle) => requireIncludes(page, needle, "admin roster page"));

[
  ">Intake</button>",
  ">Live creators</button>",
  ">Create creator</button>",
  "Waiting on intro",
  "Send contract",
  ">Countersign</button>",
  ">Approve</button>",
  "Open intake",
  ".replaceAll(\"_\"",
  "border-amber",
  "bg-amber",
  "text-amber",
  "border-red",
  "bg-red",
  "text-red",
  "border-emerald",
  "bg-emerald",
  "text-emerald",
  "<span className=\"rounded-full border",
].forEach((needle) => requireNotIncludes(page, needle, "admin roster visible UI"));

[
  "signature_pending",
  "id_not_requested",
  "segment_unassigned",
].forEach((needle) => {
  requireNotIncludes(page.replace(/idVerificationStatus === \"id_not_requested\"/g, ""), `>${needle}<`, "admin roster raw enum visible text");
});

[
  "admin_roster_tab_changed",
  "admin_creator_record_opened",
  "admin_creator_primary_action_clicked",
  "admin_creator_section_expanded",
].forEach((eventName) => {
  requireIncludes(page, eventName, "admin roster telemetry");
  requireIncludes(telemetryCatalog, eventName, "telemetry catalog");
});

[
  "targetUserId",
  "actorType",
  "performedAs",
  "actorMarkerPresent",
  "selectedTab",
  "selectedCreatorId",
  "primaryAction",
  "collapsedSections",
  "ownerControlsVisible",
].forEach((needle) => requireIncludes(page, needle, "admin roster debug and identity metadata"));

requireIncludes(validationPackage, "check:admin-roster-decision-queue", "package scripts");
requireIncludes(tests, "classifies creator records by next decision", "decision queue tests");
requireIncludes(tests, "owner telemetry distinctly", "decision queue tests");
requireIncludes(docs, "decision queue", "admin roster decision queue docs");
requireIncludes(identityDocs, "Admin Roster", "creator identity marker docs");
requireIncludes(fullAudit, "Admin Roster Decision Queue Refactor", "full audit ledger");
requireIncludes(repoLedger, "Admin Roster is a decision queue", "repo memory ledger");
requireIncludes(checklist, "Admin Roster Decision Queue Coverage", "file checklist");

if (failures.length > 0) {
  console.error("Admin roster decision queue validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Admin roster decision queue validation passed.");
