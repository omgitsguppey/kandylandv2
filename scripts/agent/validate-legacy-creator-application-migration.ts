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

const adapterPath = "src/lib/server/creator-onboarding-legacy-adapter.ts";
const inventoryPath = "scripts/creators/inventory-legacy-creator-applications.ts";
const reportPath = "agent/state/legacy-creator-application-inventory.generated.json";
const adapter = read(adapterPath);
const inventoryScript = read(inventoryPath);
const serverOnboarding = read("src/lib/server/creator-onboarding.ts");
const packageJson = read("package.json");
const docs = read("docs/agent-truth/legacy-creator-application-migration.md");
const inventoryDoc = read("docs/agent-truth/creator-lane-legacy-truth-inventory.md");
const reportSource = read(reportPath);

[
  "readLegacyCreatorApplicationFromUser",
  "mapLegacyCreatorApplicationToCanonical",
  "buildCreatorApplicationProjection",
  "needsCreatorOnboardingBackfill",
  "explainLegacyMapping",
].forEach((name) => requireIncludes(adapter, `export function ${name}`, adapterPath));

[
  "legacyCreatorApplicationDetected",
  "legacyCreatorApplicationMapped",
  "legacyCreatorApplicationSkipped",
  "mappingConfidence",
  "mappingWarnings",
].forEach((field) => {
  requireIncludes(adapter, field, adapterPath);
  requireIncludes(inventoryScript, field, inventoryPath);
});

assertCondition(
  adapter.includes('"legacy_signed_without_signature_evidence"')
    && adapter.includes('source.creatorSignatureStatus = creatorSignatureEvidence ? "signature_signed" : "signature_pending"')
    && adapter.includes('source.adminSignatureStatus = adminSignatureEvidence ? "signature_signed" : "signature_pending"'),
  "Legacy adapter must not infer legal/signature completion without explicit evidence.",
);

assertCondition(
  adapter.includes("existingCanonical")
    && adapter.includes("do not overwrite it with weaker legacy projection data"),
  "Legacy adapter must skip legacy backfill when canonical onboarding already exists.",
);

assertCondition(
  inventoryScript.includes('const writeRequested = args.has("--write")')
    && inventoryScript.includes("Write mode is intentionally not implemented")
    && inventoryScript.includes('mode: "dry-run"'),
  "Legacy inventory script must default to dry-run and must not write without an explicit --write path.",
);

const onboardingWriteIndex = serverOnboarding.indexOf("transaction.set(onboardingRef");
const userProjectionWriteIndex = serverOnboarding.indexOf("transaction.set(userRef");
assertCondition(
  onboardingWriteIndex >= 0
    && userProjectionWriteIndex >= 0
    && onboardingWriteIndex < userProjectionWriteIndex,
  "syncCreatorOnboardingDocuments must write creator_onboarding before users.creatorApplication projection.",
);

assertCondition(
  serverOnboarding.includes("mapLegacyCreatorApplicationToCanonical")
    && serverOnboarding.includes("canonicalSource = existingCanonical ?? legacyMapping.canonical ?? existingProjection"),
  "Creator onboarding submission must prefer canonical onboarding, then legacy adapter mapping, then projection fallback.",
);

assertCondition(
  packageJson.includes('"check:legacy-creator-application-migration": "tsx scripts/agent/validate-legacy-creator-application-migration.ts"'),
  "package.json must expose npm run check:legacy-creator-application-migration.",
);

[
  "users/{uid}.creatorApplication is projection only",
  "creator_onboarding/{uid}",
  "dry-run",
  "mappingConfidence",
  "Do not overwrite canonical records",
  "Do not infer legacy legal or signature completion",
].forEach((needle) => requireIncludes(docs, needle, "docs/agent-truth/legacy-creator-application-migration.md"));

[
  "legacy-creator-application-migration.md",
  "creator-onboarding-legacy-adapter.ts",
  "forbidden future pattern",
].forEach((needle) => requireIncludes(inventoryDoc, needle, "docs/agent-truth/creator-lane-legacy-truth-inventory.md"));

if (reportSource) {
  try {
    const report = JSON.parse(reportSource) as {
      requiredEntryFields?: string[];
      entries?: Array<Record<string, unknown>>;
    };
    const requiredFields = [
      "userId",
      "hasLegacyCreatorApplication",
      "hasCanonicalCreatorOnboarding",
      "hasReviewQueueEntry",
      "migrationNeeded",
      "mappingConfidence",
      "missingFields",
      "blockingRisks",
      "recommendedAction",
    ];

    requiredFields.forEach((field) => {
      assertCondition(
        Array.isArray(report.requiredEntryFields) && report.requiredEntryFields.includes(field),
        `${reportPath} must declare required entry field ${field}.`,
      );
    });

    if (Array.isArray(report.entries)) {
      report.entries.forEach((entry, index) => {
        requiredFields.forEach((field) => {
          assertCondition(Object.prototype.hasOwnProperty.call(entry, field), `${reportPath} entry ${index} missing ${field}.`);
        });
      });
    } else {
      failures.push(`${reportPath} must contain entries array.`);
    }
  } catch (error) {
    failures.push(`${reportPath} must be valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failures.length > 0) {
  console.error("Legacy creatorApplication migration validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Legacy creatorApplication migration validation passed.");
