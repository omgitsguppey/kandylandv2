import { existsSync, readFileSync } from "node:fs";
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

function parseJson(relativePath: string) {
  const source = readRequired(relativePath);
  try {
    return JSON.parse(source) as Record<string, unknown>;
  } catch (error) {
    failures.push(`${relativePath} must be valid JSON: ${(error as Error).message}`);
    return {};
  }
}

function requireIncludes(source: string, expected: string, label: string) {
  if (!source.includes(expected)) {
    failures.push(`${label} must include "${expected}".`);
  }
}

function requireAbsent(source: string, forbidden: string, label: string) {
  if (source.includes(forbidden)) {
    failures.push(`${label} must not include "${forbidden}".`);
  }
}

function requireArray(value: unknown, label: string, minLength = 1) {
  if (!Array.isArray(value)) {
    failures.push(`${label} must be an array.`);
    return [] as unknown[];
  }
  if (value.length < minLength) {
    failures.push(`${label} must include at least ${minLength} item(s).`);
  }
  return value;
}

function requireAuditEntry(entries: unknown[], id: string, fixed: boolean) {
  const entry = entries.find((item) => (
    item
    && typeof item === "object"
    && (item as Record<string, unknown>).id === id
  )) as Record<string, unknown> | undefined;

  if (!entry) {
    failures.push(`audit.entries must include ${id}.`);
    return;
  }

  for (const key of [
    "area",
    "files",
    "currentRisk",
    "requiredFix",
    "fixedInThisPass",
    "validation",
  ]) {
    if (!(key in entry)) {
      failures.push(`${id} must include ${key}.`);
    }
  }

  if (entry.fixedInThisPass !== fixed) {
    failures.push(`${id} fixedInThisPass must be ${fixed}.`);
  }
}

const audit = parseJson("agent/state/content-media-pipeline-audit.generated.json");
const entries = requireArray(audit.entries, "audit.entries", 9);
const doc = readRequired("docs/agent-truth/content-media-pipeline.md");
const contentRoute = readRequired("src/app/api/drops/content/route.ts");
const creatorProfileRoute = readRequired("src/app/api/creators/[username]/route.ts");
const dropsServer = readRequired("src/lib/server/drops.ts");
const publicDropsRoute = readRequired("src/app/api/drops/route.ts");
const viewerPage = readRequired("src/app/dashboard/viewer/page.tsx");
const viewerClient = readRequired("src/app/dashboard/viewer/ViewerClient.tsx");
const viewerHelpers = readRequired("src/app/dashboard/viewer/ViewerHelpers.ts");
const mediaViewer = readRequired("src/app/dashboard/viewer/components/MediaViewer.tsx");
const libraryClient = readRequired("src/app/dashboard/library/LibraryClient.tsx");
const dropCardLayout = readRequired("src/components/DropCardLayout.tsx");
const ownedCard = readRequired("src/components/Dashboard/OwnedDropGalleryCard.tsx");
const fallbackHelper = readRequired("src/lib/drop-media-fallback.ts");
const adminContentRoute = readRequired("src/app/api/admin/content/route.ts");
const creatorAssetRoute = readRequired("src/app/api/creator/drops/assets/route.ts");
const storageRules = readRequired("storage.rules");
const packageJson = readRequired("package.json");
const unitContentRoute = readRequired("tests/unit/drops-content-route.spec.ts");
const unitCreatorProfileRoute = readRequired("tests/unit/creator-profile-route.spec.ts");
const unitAdminContentRoute = readRequired("tests/unit/admin-content-route.spec.ts");
const auditLedger = readRequired("FULL_SCALE_CODEBASE_AUDIT.md");
const repoLedger = readRequired("REPO_MEMORY_LEDGER.md");
const checklist = readRequired("EVERY_FILE_FUNCTION_CHECKLIST.md");

for (const [id, fixed] of [
  ["CMP-001", true],
  ["CMP-002", true],
  ["CMP-003", true],
  ["CMP-004", true],
  ["CMP-005", true],
  ["CMP-006", true],
  ["CMP-007", false],
  ["CMP-008", true],
  ["CMP-009", true],
] as const) {
  requireAuditEntry(entries, id, fixed);
}

requireIncludes(dropsServer, "sanitizeDropForClient", "drop server helper");
requireIncludes(dropsServer, "contentUrl: \"\"", "drop server helper");
requireIncludes(dropsServer, "contentUrls: safeContentUrls", "drop server helper");
requireIncludes(publicDropsRoute, "getDrops()", "public drops route");

requireIncludes(creatorProfileRoute, "sanitizeDropForClient(normalized)", "creator profile route");
requireAbsent(creatorProfileRoute, "? [normalized]", "creator profile route public payload");

requireIncludes(contentRoute, "routeName: \"drops/content\"", "content proxy");
requireIncludes(contentRoute, "requireTrustedOrigin: true", "content proxy");
requireIncludes(contentRoute, "auth: \"user\"", "content proxy");
requireIncludes(contentRoute, "scopeToCaller: true", "content proxy");
requireIncludes(contentRoute, "ownsDrop", "content proxy");
requireIncludes(contentRoute, "hasUnlockedDrop", "content proxy");
requireIncludes(contentRoute, "unlockedContentTimestamps", "content proxy");
requireIncludes(contentRoute, "isAllowedRemoteMediaUrl(targetUrl)", "content proxy");
requireIncludes(contentRoute, "Cache-Control\", \"private, no-store\"", "content proxy");
requireIncludes(contentRoute, "fetch(targetUrl", "content proxy");

requireIncludes(viewerPage, "getDropRaw", "viewer page");
requireIncludes(viewerPage, "sanitizeDropForClient(rawDrop)", "viewer page");
requireIncludes(viewerClient, "unlockedContentTimestamps", "viewer client entitlement");
requireIncludes(viewerClient, "useViewerState", "viewer client");
requireIncludes(viewerHelpers, "/api/drops/content?id=", "viewer secure content fetch");
requireIncludes(viewerHelpers, "buildThumbnailFetchOrder", "viewer stable thumbnail order");
requireIncludes(mediaViewer, "contentBlobUrl", "viewer media component");
requireAbsent(mediaViewer, "contentUrl", "viewer media component");

requireIncludes(libraryClient, "unlockedIds.has(drop.id)", "library owned filter");

requireIncludes(fallbackHelper, "DROP_COVER_FALLBACK_SRC", "drop media fallback helper");
requireIncludes(fallbackHelper, "/candy-3d-glass.png", "drop media fallback helper");
requireIncludes(dropCardLayout, "resolvePublicDropCoverSrc", "drop card cover fallback");
requireIncludes(dropCardLayout, "onError={onImageError}", "drop card broken image fallback");
requireIncludes(ownedCard, "resolvePublicDropCoverSrc", "owned drop cover fallback");
requireIncludes(ownedCard, "onError={() => setImageError(true)}", "owned drop broken image fallback");
requireIncludes(viewerHelpers, "resolvePublicDropCoverSrc", "viewer thumbnail fallback");
requireIncludes(mediaViewer, "resolvePublicDropCoverSrc", "viewer poster/art fallback");
requireAbsent(dropCardLayout, "/placeholder.jpg", "drop card cover fallback");

requireIncludes(adminContentRoute, "MAX_ADMIN_DROP_ASSET_BYTES", "admin content upload validation");
requireIncludes(adminContentRoute, "ALLOWED_ADMIN_DROP_ASSET_TYPES", "admin content upload validation");
requireIncludes(adminContentRoute, "Unsupported drop asset type", "admin content upload validation");
requireIncludes(adminContentRoute, "File exceeds upload limit", "admin content upload validation");
requireIncludes(creatorAssetRoute, "MAX_CREATOR_DROP_ASSET_BYTES", "creator asset upload validation");
requireIncludes(creatorAssetRoute, "isAllowedCreatorDropAssetType", "creator asset upload validation");

requireIncludes(storageRules, "match /drops/{allPaths=**}", "storage rules");
requireIncludes(storageRules, "allow get: if false", "storage rules");
requireIncludes(storageRules, "allow list: if false", "storage rules");
requireIncludes(storageRules, "allow write: if false", "storage rules");

requireIncludes(unitContentRoute, "blocks locked content", "content route tests");
requireIncludes(unitContentRoute, "accepts the server-written unlock timestamp", "content route tests");
requireIncludes(unitCreatorProfileRoute, "returns only public-safe drop media", "creator profile route tests");
requireIncludes(unitAdminContentRoute, "rejects unsupported drop asset upload types", "admin content route tests");

requireIncludes(doc, "Protected Drop assets are server mediated", "content media pipeline doc");
requireIncludes(doc, "Cover and preview media may be public-safe", "content media pipeline doc");
requireIncludes(doc, "Expired or archived Drops", "content media pipeline doc");
requireIncludes(packageJson, "\"check:content-media-pipeline\"", "package scripts");
requireIncludes(auditLedger, "Content Media Pipeline Launch Audit", "FULL_SCALE_CODEBASE_AUDIT");
requireIncludes(repoLedger, "Content/media launch gate", "REPO_MEMORY_LEDGER");
requireIncludes(checklist, "Content Media Pipeline Launch Audit Coverage", "EVERY_FILE_FUNCTION_CHECKLIST");

if (failures.length > 0) {
  console.error("Content/media pipeline validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Content/media pipeline validation passed.");
