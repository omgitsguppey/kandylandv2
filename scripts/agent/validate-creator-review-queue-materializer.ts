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

const helperPath = "src/lib/server/creator-review-queue.ts";
const helper = read(helperPath);
const serverOnboarding = read("src/lib/server/creator-onboarding.ts");
const pureOnboarding = read("src/lib/creator-onboarding.ts");
const registerRoute = read("src/app/api/user/register/route.ts");
const adminRosterRoute = read("src/app/api/admin/roster/route.ts");
const adminUsersRoute = read("src/app/api/admin/users/route.ts");
const creatorApplicationRoute = read("src/app/api/creator/onboarding/application/route.ts");
const creatorIntroRoute = read("src/app/api/creator/onboarding/intro/route.ts");
const creatorSignatureRoute = read("src/app/api/creator/onboarding/contract-signature/route.ts");
const creatorIdRoute = read("src/app/api/creator/onboarding/id-submission/route.ts");
const agreementDocuments = read("src/lib/server/creator-agreement-documents.ts");
const adminRosterPage = read("src/app/admin/roster/page.tsx");
const packageJson = read("package.json");
const reviewQueueDoc = read("docs/agent-truth/creator-review-queue.md");
const inventoryDoc = read("docs/agent-truth/creator-lane-legacy-truth-inventory.md");

[
  "materializeCreatorReviewQueueEntry",
  "removeCreatorReviewQueueEntry",
  "rebuildCreatorReviewQueueForUser",
  "compareOnboardingToQueue",
].forEach((name) => requireIncludes(helper, `export async function ${name}`, helperPath));

[
  "materializeCreatorReviewQueueEntryForTransaction",
  "buildMaterializedCreatorReviewQueueEntry",
  "compareCreatorOnboardingToQueueRecords",
].forEach((name) => requireIncludes(helper, `export function ${name}`, helperPath));

[
  "userId",
  "onboardingRefPath",
  "queueBucket",
  "queueSortAt",
  "queuePosition",
  "displayName",
  "creatorDisplayName",
  "creatorPrimaryPlatform",
  "creatorContentFocus",
  "email",
  "username",
  "photoURL",
  "role",
  "submissionStatus",
  "approvalStatus",
  "legalStatus",
  "idVerificationStatus",
  "segmentationStatus",
  "contractDocumentStatus",
  "creatorSignatureStatus",
  "adminSignatureStatus",
  "agreementBasis",
  "readyForApproval",
  "creatorReviewQueueVisible",
  "blockingReasons",
  "submittedAt",
  "updatedAt",
  "adminNotes",
  "idDocumentCount",
].forEach((field) => requireIncludes(helper, `"${field}"`, helperPath));

[
  "queueMaterializedAt",
  "sourceOnboardingUpdatedAt",
  "projectionLagMs",
  "queueParityOk",
  "queueParityDelta",
].forEach((field) => {
  requireIncludes(helper, field, helperPath);
  requireIncludes(adminRosterRoute, field, "src/app/api/admin/roster/route.ts");
  requireIncludes(adminRosterPage, field, "src/app/admin/roster/page.tsx");
});

assertCondition(
  serverOnboarding.includes("materializeCreatorReviewQueueEntryForTransaction")
    && serverOnboarding.includes("queueEntry: materializedQueue.queueEntry"),
  "syncCreatorOnboardingDocuments must materialize creator_review_queue through the queue materializer.",
);

assertCondition(
  registerRoute.includes("ensureCreatorOnboardingSubmission("),
  "Registration route must call ensureCreatorOnboardingSubmission for creator signup.",
);

[
  ["src/app/api/admin/roster/route.ts", adminRosterRoute],
  ["src/app/api/admin/users/route.ts", adminUsersRoute],
  ["src/app/api/creator/onboarding/application/route.ts", creatorApplicationRoute],
  ["src/app/api/creator/onboarding/intro/route.ts", creatorIntroRoute],
  ["src/app/api/creator/onboarding/contract-signature/route.ts", creatorSignatureRoute],
  ["src/app/api/creator/onboarding/id-submission/route.ts", creatorIdRoute],
  ["src/lib/server/creator-agreement-documents.ts", agreementDocuments],
].forEach(([filePath, source]) => {
  assertCondition(
    source.includes("syncCreatorOnboardingDocuments(") || source.includes("ensureCreatorOnboardingSubmission("),
    `${filePath} must route creator onboarding changes through syncCreatorOnboardingDocuments or ensureCreatorOnboardingSubmission.`,
  );
});

assertCondition(
  pureOnboarding.includes('role?: "user" | "creator" | "admin"')
    && pureOnboarding.includes('input.approvalStatus === "creator_approved" || input.role === "creator"'),
  "Queue bucket derivation must classify creator role or approved creator records as approved.",
);

assertCondition(
  adminRosterRoute.includes("queueSnapshot.docs")
    && adminRosterRoute.includes("creatorReviewQueue")
    && !adminRosterRoute.includes("const creatorReviewQueue = allUsers")
    && !adminRosterRoute.includes('creatorReviewQueue.filter((entry) => entry.role === "creator"'),
  "Admin Roster must read creator_review_queue projection and must not filter queue applicants by role === creator.",
);

assertCondition(
  helper.includes("queueParityDelta") && helper.includes("REQUIRED_QUEUE_FIELDS"),
  "Queue materializer must include parity comparison against required queue fields.",
);

assertCondition(
  packageJson.includes('"check:creator-review-queue-materializer": "tsx scripts/agent/validate-creator-review-queue-materializer.ts"'),
  "package.json must expose npm run check:creator-review-queue-materializer.",
);

[
  "creator_review_queue/{uid}",
  "deterministic projection",
  "creator_onboarding/{uid}",
  "queueMaterializedAt",
  "queueParityOk",
  "compareOnboardingToQueue",
].forEach((needle) => requireIncludes(reviewQueueDoc, needle, "docs/agent-truth/creator-review-queue.md"));

[
  "creator-review-queue.ts",
  "deterministic admin projection",
  "not a loose roster filter",
].forEach((needle) => requireIncludes(inventoryDoc, needle, "docs/agent-truth/creator-lane-legacy-truth-inventory.md"));

if (failures.length > 0) {
  console.error("Creator review queue materializer validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Creator review queue materializer validation passed.");
