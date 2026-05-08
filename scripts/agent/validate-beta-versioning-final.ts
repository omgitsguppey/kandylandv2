import { existsSync, readFileSync } from "node:fs";

const root = process.cwd();
const failures: string[] = [];

function readRequired(relativePath: string) {
  const fullPath = `${root}/${relativePath}`;
  if (!existsSync(fullPath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
}

function requireIncludes(source: string, expected: string, label: string) {
  if (!source.includes(expected)) failures.push(`${label} must include "${expected}".`);
}

function requireNotIncludes(source: string, forbidden: string, label: string) {
  if (source.includes(forbidden)) failures.push(`${label} must not include "${forbidden}".`);
}

const packageJson = readRequired("package.json");
const workflow = readRequired(".github/workflows/public-release-notes.yml");
const contract = readRequired("src/lib/release-notes/release-version-contract.ts");
const drawer = readRequired("src/components/ReleaseNotes/BetaReleaseNotesDrawer.tsx");
const script = readRequired("scripts/release/update-public-changelog.ts");
const hook = readRequired("src/hooks/usePublicReleaseNotes.ts");
const publicNotesSource = readRequired("public/kandydrops-release-notes.json");
const changelog = readRequired("CHANGELOG.md");
const doc = readRequired("docs/agent-truth/beta-versioning-final.md");

requireIncludes(packageJson, "\"check:beta-versioning-final\"", "package.json");
requireIncludes(packageJson, "\"release:notes\"", "package.json");
requireIncludes(workflow, "push:", "public-release-notes workflow");
requireIncludes(workflow, "branches:", "public-release-notes workflow");
requireIncludes(workflow, "- main", "public-release-notes workflow");
requireIncludes(workflow, "npm run release:notes", "public-release-notes workflow");
requireIncludes(workflow, "[skip release-notes]", "public-release-notes workflow");

requireIncludes(contract, "PUBLIC_RELEASE_NOTES_MAX_COUNT = 25", "release-version-contract");
requireIncludes(contract, "PUBLIC_RELEASE_NOTES_PAGE_SIZE = 5", "release-version-contract");
requireIncludes(contract, "PUBLIC_RELEASE_VERSION_SHAPE = \"MAJOR.MINOR.PATCH\"", "release-version-contract");
requireIncludes(contract, "\"Internal Reliability\"", "release-version-contract");

requireIncludes(drawer, "data-beta-release-page", "BetaReleaseNotesDrawer");
requireIncludes(drawer, "data-beta-release-page-size", "BetaReleaseNotesDrawer");
requireIncludes(drawer, "data-beta-release-total-visible", "BetaReleaseNotesDrawer");
requireIncludes(drawer, "data-beta-version-current", "BetaReleaseNotesDrawer");
requireIncludes(drawer, "Previous", "BetaReleaseNotesDrawer");
requireIncludes(drawer, "Next", "BetaReleaseNotesDrawer");
requireNotIncludes(drawer, "Technical details", "BetaReleaseNotesDrawer");

requireIncludes(script, "bumpVersion", "update-public-changelog.ts");
requireIncludes(script, "effectiveChangeCount", "update-public-changelog.ts");
requireIncludes(script, "[skip release-notes]", "update-public-changelog.ts");
requireIncludes(script, "PUBLIC_RELEASE_NOTES_MAX_COUNT", "update-public-changelog.ts");
requireIncludes(script, "hiddenFromPublic", "update-public-changelog.ts");
requireIncludes(script, "isReleaseGeneratedArtifactPath", "update-public-changelog.ts");
requireNotIncludes(script, "--accept", "update-public-changelog.ts");

requireIncludes(hook, "cache: \"no-store\"", "usePublicReleaseNotes");
requireIncludes(publicNotesSource, "\"currentVersion\"", "public/kandydrops-release-notes.json");
requireIncludes(publicNotesSource, "\"notes\"", "public/kandydrops-release-notes.json");
requireIncludes(changelog, "What’s new in KandyDrops Beta", "CHANGELOG.md");
requireIncludes(doc, "last 25 updates", "beta-versioning-final doc");
requireIncludes(doc, "5 at a time", "beta-versioning-final doc");

if (failures.length > 0) {
  console.error("Beta versioning final validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Beta versioning final validation passed.");
