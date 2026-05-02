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

function assertCondition(condition: boolean, message: string) {
  if (!condition) {
    failures.push(message);
  }
}

function requireIncludes(source: string, needle: string, label: string) {
  assertCondition(source.includes(needle), `${label} must include ${needle}`);
}

const helperPath = "src/lib/creator-onboarding-projection.ts";
const helper = read(helperPath);
const rosterPage = read("src/app/admin/roster/page.tsx");
const decisionQueue = read("src/app/admin/roster/decision-queue.ts");
const adminUserPage = read("src/app/admin/user/[userId]/page.tsx");
const rosterRoute = read("src/app/api/admin/roster/route.ts");
const adminUserRoute = read("src/app/api/admin/user/[userId]/route.ts");
const packageJson = read("package.json");
const inventoryDoc = read("docs/agent-truth/creator-lane-legacy-truth-inventory.md");
const rosterDoc = read("docs/agent-truth/admin-roster-decision-queue.md");

[
  "normalizeCreatorOnboardingRecord",
  "normalizeCreatorReviewQueueEntry",
  "normalizeCreatorFacingApplication",
  "normalizeCreatorAdminDetail",
  "deriveCreatorRosterBucket",
  "deriveCreatorPrimaryAction",
  "deriveCreatorVisibleStatus",
  "CREATOR_ONBOARDING_VISIBLE_STATUS_LABELS",
].forEach((needle) => requireIncludes(helper, `export ${needle.startsWith("CREATOR_") ? "const" : "function"} ${needle}`, helperPath));

[
  "Waiting for signature",
  "Signed",
  "Agreement not sent",
  "Agreement sent",
  "Legal not started",
  "Waiting on signatures",
  "Agreement complete",
  "ID not requested",
  "Waiting for ID upload",
  "ID ready for review",
  "ID verified",
  "ID needs resubmission",
  "Not assigned",
  "Assigned",
  "Pending review",
  "Approved",
  "Rejected",
  "Needs changes",
].forEach((label) => requireIncludes(helper, label, helperPath));

assertCondition(
  packageJson.includes('"check:creator-projection-normalizer": "tsx scripts/agent/validate-creator-projection-normalizer.ts"'),
  "package.json must expose npm run check:creator-projection-normalizer.",
);

const primaryUiFiles = [
  ["src/app/admin/roster/page.tsx", rosterPage],
  ["src/app/admin/roster/decision-queue.ts", decisionQueue],
  ["src/app/admin/user/[userId]/page.tsx", adminUserPage],
] as const;

[
  ["src/app/admin/roster/page.tsx", rosterPage],
  ["src/app/admin/roster/decision-queue.ts", decisionQueue],
].forEach(([filePath, source]) => {
  assertCondition(
    !source.includes('.replaceAll("_", " ")'),
    `${filePath} must not display creator onboarding statuses via replaceAll("_", " ").`,
  );
});

assertCondition(
  decisionQueue.includes("deriveCreatorPrimaryAction") && !/return\s+"Request ID upload"/.test(decisionQueue),
  "Admin Roster primary action labels must be delegated to deriveCreatorPrimaryAction.",
);
assertCondition(
  decisionQueue.includes("deriveCreatorVisibleStatus") && !decisionQueue.includes("Waiting for creator signature"),
  "Admin Roster status labels must be delegated to deriveCreatorVisibleStatus.",
);

[
  "normalizedFromLegacy",
  "canonicalSourceUsed",
  "projectionSourceUsed",
  "rawStatusValues",
  "visibleStatusLabels",
].forEach((needle) => {
  requireIncludes(helper, needle, helperPath);
  requireIncludes(rosterPage, needle, "src/app/admin/roster/page.tsx");
});

[
  "normalizeCreatorAdminDetail",
  "creatorOnboardingProjection",
].forEach((needle) => requireIncludes(adminUserRoute, needle, "src/app/api/admin/user/[userId]/route.ts"));

[
  "visibleStatusLabels",
  "normalizedProjectionDebug",
  "primaryAction",
].forEach((needle) => requireIncludes(rosterRoute, needle, "src/app/api/admin/roster/route.ts"));

const rawEnumValues = [
  "signature_pending",
  "signature_signed",
  "contract_not_sent",
  "contract_sent",
  "legal_pending",
  "legal_sent",
  "legal_signed",
  "id_not_requested",
  "id_requested",
  "id_submitted",
  "id_verified",
  "id_rejected",
  "segment_unassigned",
  "segment_assigned",
  "creator_pending",
  "creator_approved",
  "creator_rejected",
  "creator_needs_changes",
];
primaryUiFiles.forEach(([filePath, source]) => {
  rawEnumValues.forEach((enumValue) => {
    assertCondition(
      !new RegExp(`>\\s*${enumValue}\\s*<`).test(source),
      `${filePath} must not render raw creator onboarding enum value ${enumValue} as primary visible copy.`,
    );
  });
});

assertCondition(
  !/function\s+formatCreatorStatusLabel/.test(adminUserPage),
  "Admin user detail must not keep a local raw creator status formatter.",
);

[
  "creator-onboarding-projection.ts",
  "normalized display labels",
  "users/{uid}.creatorApplication",
  "not the future canonical source",
].forEach((needle) => requireIncludes(inventoryDoc, needle, "docs/agent-truth/creator-lane-legacy-truth-inventory.md"));

[
  "centralized projection normalizer",
  "visibleStatusLabels",
  "raw enum",
].forEach((needle) => requireIncludes(rosterDoc, needle, "docs/agent-truth/admin-roster-decision-queue.md"));

if (failures.length > 0) {
  console.error("Creator projection normalizer validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Creator projection normalizer validation passed.");
