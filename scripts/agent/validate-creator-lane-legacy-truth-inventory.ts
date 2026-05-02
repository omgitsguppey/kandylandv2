import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const failures: string[] = [];

type InventoryEntry = {
  filePath: string;
  responsibility: string;
  readsCreatorApplication: boolean;
  writesCreatorApplication: boolean;
  readsCreatorOnboarding: boolean;
  writesCreatorOnboarding: boolean;
  readsCreatorReviewQueue: boolean;
  writesCreatorReviewQueue: boolean;
  readsHistory: boolean;
  writesHistory: boolean;
  classification: "canonical" | "projection" | "legacy" | "mixed" | "unknown";
  actorLanesInvolved: string[];
  risk: string;
  cleanupRecommendation: string;
  testsNeeded: string[];
};

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

function assertCondition(condition: boolean, message: string) {
  if (!condition) {
    failures.push(message);
  }
}

const reportPath = "agent/state/creator-lane-legacy-truth-inventory.generated.json";
const docPath = "docs/agent-truth/creator-lane-legacy-truth-inventory.md";
const reportText = read(reportPath);
const docs = read(docPath);
const packageJson = read("package.json");

let parsed: {
  doctrine?: Record<string, unknown>;
  auditedCollectionPaths?: string[];
  inventory?: InventoryEntry[];
  cleanupPlan?: string[];
  forbiddenFuturePatterns?: string[];
} = {};

if (reportText) {
  try {
    parsed = JSON.parse(reportText);
  } catch (error) {
    failures.push(`Inventory report must be valid JSON: ${(error as Error).message}`);
  }
}

const inventory = Array.isArray(parsed.inventory) ? parsed.inventory : [];
const byPath = new Map(inventory.map((entry) => [entry.filePath, entry]));

[
  "canonical source",
  "projection source",
  "legacy source",
  "cleanup plan",
  "creator_onboarding/{uid}",
  "creator_onboarding/{uid}/history/{eventId}",
  "creator_review_queue/{uid}",
  "users/{uid}.creatorApplication",
  "not the future canonical source",
].forEach((needle) => requireIncludes(docs.toLowerCase(), needle.toLowerCase(), docPath));

assertCondition(
  !/users\/\{uid\}\.creatorApplication\s+is\s+(the\s+)?canonical/i.test(docs),
  "Docs must not state that users/{uid}.creatorApplication is canonical.",
);

[
  "creator_onboarding/{uid}",
  "creator_onboarding/{uid}/history/{eventId}",
  "creator_review_queue/{uid}",
  "users/{uid}.creatorApplication",
].forEach((collectionPath) => {
  assertCondition(
    Array.isArray(parsed.auditedCollectionPaths) && parsed.auditedCollectionPaths.includes(collectionPath),
    `Inventory auditedCollectionPaths must include ${collectionPath}`,
  );
});

const knownFiles = [
  "src/lib/creator-onboarding.ts",
  "src/lib/server/creator-onboarding.ts",
  "src/lib/server/creator-onboarding-alerts.ts",
  "src/lib/server/creator-onboarding-diagnostics.ts",
  "src/app/api/user/register/route.ts",
  "src/app/api/admin/roster/route.ts",
  "src/app/api/admin/users/route.ts",
  "src/app/api/admin/user/[userId]/route.ts",
  "src/app/api/admin/creator-account-controls/route.ts",
  "src/app/api/admin/user/[userId]/creator-onboarding/id-document/route.ts",
  "src/app/api/admin/view-as-creator/route.ts",
  "src/app/admin/roster/page.tsx",
  "src/app/admin/roster/decision-queue.ts",
  "src/components/Admin/CreatorAuditTrailPanel.tsx",
  "src/components/Creators/CreatorExperiencesPanel.tsx",
  "src/lib/creator-contract.ts",
  "src/lib/creator-experiences.ts",
  "src/lib/server/creator-experiences.ts",
  "src/lib/creator-application.ts",
  "src/lib/creator-public-pages.ts",
  "src/lib/creator-agreement-documents.ts",
  "src/lib/server/creator-agreement-documents.ts",
  "src/lib/server/creator-agreement-templates.ts",
  "src/types/db.ts",
  "firestore.rules",
  "database.rules.json",
  "storage.rules",
  "tests/unit/creator-onboarding.spec.ts",
  "tests/unit/creator-onboarding-server.spec.ts",
  "tests/unit/creator-onboarding-diagnostics.spec.ts",
  "tests/unit/admin-roster-route.spec.ts",
  "tests/unit/admin-users-route.spec.ts",
  "tests/unit/user-register-route.spec.ts",
  "tests/unit/creator-experiences.spec.ts",
  "tests/unit/creator-experiences-panel.spec.tsx",
  "tests/unit/creator-agreement-documents.spec.ts",
  "tests/unit/creator-audit-trail-panel.spec.tsx",
];

knownFiles.forEach((filePath) => {
  assertCondition(byPath.has(filePath), `Inventory must classify ${filePath}`);
});

const classifications = new Set(["canonical", "projection", "legacy", "mixed", "unknown"]);
inventory.forEach((entry) => {
  assertCondition(Boolean(entry.filePath), "Each inventory entry must include filePath.");
  assertCondition(Boolean(entry.responsibility), `${entry.filePath} must include responsibility.`);
  [
    "readsCreatorApplication",
    "writesCreatorApplication",
    "readsCreatorOnboarding",
    "writesCreatorOnboarding",
    "readsCreatorReviewQueue",
    "writesCreatorReviewQueue",
    "readsHistory",
    "writesHistory",
  ].forEach((key) => {
    assertCondition(typeof entry[key as keyof InventoryEntry] === "boolean", `${entry.filePath} must include boolean ${key}.`);
  });
  assertCondition(classifications.has(entry.classification), `${entry.filePath} must use an allowed classification.`);
  assertCondition(Array.isArray(entry.actorLanesInvolved) && entry.actorLanesInvolved.length > 0, `${entry.filePath} must include actor lanes.`);
  assertCondition(Boolean(entry.risk), `${entry.filePath} must include risk.`);
  assertCondition(Boolean(entry.cleanupRecommendation), `${entry.filePath} must include cleanup recommendation.`);
  assertCondition(Array.isArray(entry.testsNeeded) && entry.testsNeeded.length > 0, `${entry.filePath} must include tests needed.`);
});

const creatorApplicationEntry = byPath.get("src/lib/creator-application.ts");
assertCondition(
  creatorApplicationEntry?.classification === "projection",
  "src/lib/creator-application.ts must be classified as projection.",
);
assertCondition(
  docs.includes("Do not treat `users/{uid}.creatorApplication` as canonical when `creator_onboarding/{uid}` exists."),
  "Docs must include the forbidden future pattern for users.creatorApplication.",
);

const serverOnboarding = byPath.get("src/lib/server/creator-onboarding.ts");
assertCondition(
  serverOnboarding?.writesCreatorOnboarding === true
    && serverOnboarding.writesCreatorReviewQueue === true
    && serverOnboarding.writesCreatorApplication === true
    && serverOnboarding.writesHistory === true,
  "Server creator onboarding entry must record canonical, queue, projection, and history writes.",
);

const diagnosticsEntry = byPath.get("src/lib/server/creator-onboarding-diagnostics.ts");
assertCondition(
  diagnosticsEntry?.readsCreatorApplication === true
    && diagnosticsEntry.readsCreatorOnboarding === true
    && diagnosticsEntry.readsCreatorReviewQueue === true,
  "Creator onboarding diagnostics must read projection, canonical, and queue lanes.",
);

assertCondition(
  Array.isArray(parsed.cleanupPlan) && parsed.cleanupPlan.some((item) => item.includes("creator_onboarding/{uid}")),
  "Inventory cleanupPlan must reference creator_onboarding/{uid}.",
);
assertCondition(
  Array.isArray(parsed.forbiddenFuturePatterns)
    && parsed.forbiddenFuturePatterns.some((item) => item.includes("users/{uid}.creatorApplication")),
  "Inventory forbiddenFuturePatterns must include users/{uid}.creatorApplication.",
);
requireIncludes(packageJson, "check:creator-lane-legacy-truth-inventory", "package scripts");

if (failures.length > 0) {
  console.error("Creator lane legacy truth inventory validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Creator lane legacy truth inventory validation passed.");
