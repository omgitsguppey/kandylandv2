import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures: string[] = [];

function readRequired(relativePath: string) {
  const fullPath = join(root, relativePath);
  if (!existsSync(fullPath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
}

function requireIncludes(source: string, expected: string, label: string) {
  if (!source.includes(expected)) {
    failures.push(`${label} must include "${expected}".`);
  }
}

function requireNotIncludes(source: string, banned: string, label: string) {
  if (source.includes(banned)) {
    failures.push(`${label} must not include "${banned}".`);
  }
}

function walkSourceFiles(relativeDir: string): string[] {
  const absoluteDir = join(root, relativeDir);
  if (!existsSync(absoluteDir)) return [];

  const files: string[] = [];
  for (const entry of readdirSync(absoluteDir)) {
    const absoluteEntry = join(absoluteDir, entry);
    const stat = statSync(absoluteEntry);
    if (stat.isDirectory()) {
      files.push(...walkSourceFiles(join(relativeDir, entry)));
      continue;
    }
    if (/\.(ts|tsx)$/u.test(entry)) {
      files.push(join(relativeDir, entry).replace(/\\/gu, "/"));
    }
  }
  return files;
}

const routePage = readRequired("src/app/drops/[id]/preview/page.tsx");
const previewClient = readRequired("src/components/Drops/LockedDropPreviewClient.tsx");
const previewView = readRequired("src/components/Drops/LockedDropPreviewView.tsx");
const previewTruth = readRequired("src/lib/locked-drop-preview-truth.ts");
const dropsPage = readRequired("src/app/drops/page.tsx");
const dropsClient = readRequired("src/app/drops/DropsClient.tsx");
const dropCard = readRequired("src/components/DropCard.tsx");
const featuredCarousel = readRequired("src/components/FeaturedCarousel.tsx");
const creatorProfile = readRequired("src/app/creators/[username]/CreatorProfileClient.tsx");
const dropGrid = readRequired("src/components/DropGrid.tsx");
const dropPreviewModal = readRequired("src/components/DropPreviewModal.tsx");
const packageJson = readRequired("package.json");

requireIncludes(
  dropPreviewModal,
  "Legacy fallback only. Locked Drop preview ownership moved to /drops/[id]/preview.",
  "DropPreviewModal legacy comment",
);
requireIncludes(dropPreviewModal, 'data-drop-preview-modal-mode="legacy-fallback"', "DropPreviewModal data marker");
requireIncludes(dropPreviewModal, 'data-drop-preview-legacy-fallback="true"', "DropPreviewModal legacy data marker");
requireIncludes(
  dropPreviewModal,
  "`${window.location.origin}/drops/${encodeURIComponent(drop.id)}/preview`",
  "DropPreviewModal share URL",
);
requireNotIncludes(dropPreviewModal, "drop.contentUrl", "DropPreviewModal");
requireNotIncludes(dropPreviewModal, "drop.contentUrls", "DropPreviewModal");

requireIncludes(routePage, "toLockedDropPreviewSafeDrop(drop)", "Full-page preview route");
requireIncludes(routePage, "canonical: `/drops/${encodeURIComponent(drop.id)}/preview`", "Preview canonical URL");
requireIncludes(previewTruth, "safePreviewFieldsOnly: true", "Preview truth safe-fields marker");
requireIncludes(previewView, 'data-safe-preview-fields-only="true"', "Preview view safe-fields data marker");
requireIncludes(previewView, 'data-drop-preview-page="true"', "Preview page data marker");

for (const [source, label] of [
  [routePage, "preview route"],
  [previewClient, "preview client"],
  [previewView, "preview view"],
  [previewTruth, "preview truth helper"],
] as const) {
  requireNotIncludes(source, "contentUrl", label);
  requireNotIncludes(source, "contentUrls", label);
}

requireIncludes(
  dropsPage,
  "redirect(`/drops/${encodeURIComponent(requestedDropId)}/preview?source_component=legacy_drop_query`)",
  "Legacy /drops?drop redirect",
);
requireIncludes(
  dropsClient,
  "router.push(`/drops/${encodeURIComponent(drop.id)}/preview?source_component=${encodeURIComponent(sourceComponent)}`)",
  "Drops page preview handoff",
);
requireNotIncludes(dropsClient, "DropPreviewModal", "DropsClient canonical preview ownership");
requireIncludes(dropCard, 'onPreview(drop, "compact_drop_card")', "DropCard preview source handoff");
requireIncludes(featuredCarousel, 'onSelectDrop(drop, "compact_featured_carousel")', "Featured preview source handoff");
requireIncludes(
  creatorProfile,
  "router.push(`/drops/${encodeURIComponent(drop.id)}/preview?source_component=creator_profile_drop_grid`)",
  "Creator profile drop handoff",
);
requireNotIncludes(creatorProfile, "onSelectDrop={() => {}}", "Creator profile drop handoff");
requireIncludes(dropGrid, "onPreview={onSelectDrop}", "DropGrid delegates preview routing to caller");

for (const filePath of walkSourceFiles("src/app").concat(walkSourceFiles("src/components"))) {
  if (filePath === "src/components/DropPreviewModal.tsx") continue;
  const source = readRequired(filePath);
  if (source.includes("DropPreviewModal")) {
    failures.push(`${filePath} must not depend on legacy DropPreviewModal as a canonical entry point.`);
  }
}

requireIncludes(
  packageJson,
  '"check:drop-preview-legacy-handoff": "tsx scripts/agent/validate-drop-preview-legacy-handoff.ts"',
  "package.json",
);

if (failures.length > 0) {
  console.error("Drop preview legacy handoff validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Drop preview legacy handoff validation passed.");
