import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

type ContentProtectionFinding = {
  id: string;
  severity: string;
  category: string;
  title: string;
  filePath: string;
  line?: number;
  excerpt?: string;
  scoreImpact: number;
  suggestedFix: string;
  canAutofix: boolean;
  escalation: string;
  evidence: unknown[];
};

type ContentProtectionReport = {
  score: number;
  status: string;
  generatedAt: string;
  repoRoot: string;
  findings: ContentProtectionFinding[];
  criticalCount: number;
  majorCount: number;
  safeAutofixesAvailable: number;
  checkedFiles: string[];
  protectedSurfaces: string[];
  tests: string[];
  commandBudget: { allowedCommands: string[]; forbiddenCommands: string[] };
  summary: string;
};

const root = process.cwd();
const failures: string[] = [];
const REPORT_PATH = "agent/state/content-protection-score.generated.json";

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

function requireNotIncludes(source: string, forbidden: string, label: string) {
  if (source.includes(forbidden)) {
    failures.push(`${label} must not include "${forbidden}".`);
  }
}

function requireOrderedOccurrences(source: string, expected: readonly string[], label: string) {
  let previousIndex = -1;
  for (const marker of expected) {
    const markerIndex = source.indexOf(marker, previousIndex + 1);
    if (markerIndex === -1) {
      failures.push(`${label} must include ordered marker "${marker}".`);
      return;
    }
    previousIndex = markerIndex;
  }
}

function requireExactOccurrences(source: string, expected: string, count: number, label: string) {
  let occurrences = 0;
  let markerIndex = source.indexOf(expected);
  while (markerIndex !== -1) {
    occurrences += 1;
    markerIndex = source.indexOf(expected, markerIndex + expected.length);
  }
  if (occurrences !== count) {
    failures.push(`${label} must include "${expected}" exactly ${count} time(s); found ${occurrences}.`);
  }
}

function requireNumber(value: unknown, label: string, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    failures.push(`${label} must be a number between ${min} and ${max}.`);
  }
}

function expectedStatus(score: number, criticalCount: number) {
  if (criticalCount > 0) return "fail";
  if (score >= 95) return "clean";
  if (score >= 90) return "pass";
  if (score >= 80) return "warning";
  if (score >= 70) return "beta-risk";
  return "fail";
}

function readReport() {
  const source = readRequired(REPORT_PATH);
  if (!source) return null;
  try {
    return JSON.parse(source) as ContentProtectionReport;
  } catch (error) {
    failures.push(`${REPORT_PATH} must be valid JSON: ${(error as Error).message}`);
    return null;
  }
}

function validateFinding(finding: ContentProtectionFinding, index: number) {
  for (const key of ["id", "severity", "category", "title", "filePath", "suggestedFix", "escalation"] as const) {
    if (typeof finding[key] !== "string" || finding[key].trim().length === 0) {
      failures.push(`findings[${index}].${key} must be a non-empty string.`);
    }
  }
  if (!["info", "minor", "moderate", "major", "critical"].includes(finding.severity)) {
    failures.push(`findings[${index}].severity is invalid.`);
  }
  if (![
    "locked_preview",
    "safe_preview_fields",
    "legacy_modal",
    "api_entitlement",
    "viewer_entitlement",
    "public_feed_sanitization",
    "internal_url",
    "test_coverage",
    "autofix_policy",
  ].includes(finding.category)) {
    failures.push(`findings[${index}].category is invalid.`);
  }
  requireNumber(finding.scoreImpact, `findings[${index}].scoreImpact`, -25, 0);
  if (typeof finding.canAutofix !== "boolean") {
    failures.push(`findings[${index}].canAutofix must be boolean.`);
  }
  if (finding.canAutofix) {
    failures.push(`findings[${index}] must not be autofixable by default for content protection.`);
  }
  if (!Array.isArray(finding.evidence)) {
    failures.push(`findings[${index}].evidence must be an array.`);
  }
}

const report = readReport();
if (report) {
  requireNumber(report.score, "score", 0, 100);
  if (!["clean", "pass", "warning", "beta-risk", "fail"].includes(report.status)) {
    failures.push("status must be a valid content protection status.");
  }
  if (report.status !== expectedStatus(report.score, report.criticalCount)) {
    failures.push("status must match score thresholds and critical auto-fail behavior.");
  }
  if (typeof report.generatedAt !== "string" || Number.isNaN(Date.parse(report.generatedAt))) {
    failures.push("generatedAt must be an ISO timestamp string.");
  }
  if (!Array.isArray(report.findings)) {
    failures.push("findings must be an array.");
  } else {
    report.findings.forEach(validateFinding);
    const criticalCount = report.findings.filter((finding) => finding.severity === "critical").length;
    const majorCount = report.findings.filter((finding) => finding.severity === "major").length;
    if (criticalCount !== report.criticalCount) {
      failures.push("criticalCount must match critical findings.");
    }
    if (majorCount !== report.majorCount) {
      failures.push("majorCount must match major findings.");
    }
  }
  if (report.safeAutofixesAvailable !== 0) {
    failures.push("safeAutofixesAvailable must remain 0 by default for locked content protection.");
  }
  for (const requiredFile of [
    "src/lib/server/drops.ts",
    "src/lib/locked-drop-preview-truth.ts",
    "src/app/drops/[id]/preview/page.tsx",
    "src/components/Drops/LockedDropPreviewView.tsx",
    "src/components/DropPreviewModal.tsx",
    "src/app/api/drops/content/route.ts",
    "src/app/dashboard/viewer/page.tsx",
    "src/app/dashboard/viewer/ViewerClient.tsx",
    "src/app/dashboard/viewer/hooks/useViewerState.ts",
    "src/app/dashboard/viewer/ViewerHelpers.ts",
    "tests/unit/content-protection-truth.spec.ts",
    "tests/unit/drops-content-route.spec.ts",
    "tests/unit/dashboard-viewer-page.spec.tsx",
  ]) {
    if (!report.checkedFiles?.includes(requiredFile)) {
      failures.push(`checkedFiles must include ${requiredFile}.`);
    }
  }
  for (const surface of ["full-page locked Drop preview", "authenticated content proxy", "dashboard viewer route"]) {
    if (!report.protectedSurfaces?.includes(surface)) {
      failures.push(`protectedSurfaces must include ${surface}.`);
    }
  }
  for (const forbidden of ["playwright", "cypress", "lighthouse", "npm run check"]) {
    if (!report.commandBudget?.forbiddenCommands?.includes(forbidden)) {
      failures.push(`commandBudget.forbiddenCommands must include ${forbidden}.`);
    }
  }
}

const packageJson = readRequired("package.json");
const scorer = readRequired("scripts/agent/score-content-protection.ts");
const validator = readRequired("scripts/agent/validate-content-protection.ts");
const docs = readRequired("docs/agent-truth/content-protection-score.md");
const serverDrops = readRequired("src/lib/server/drops.ts");
const previewPage = readRequired("src/app/drops/[id]/preview/page.tsx");
const previewTruth = readRequired("src/lib/locked-drop-preview-truth.ts");
const previewView = readRequired("src/components/Drops/LockedDropPreviewView.tsx");
const legacyModal = readRequired("src/components/DropPreviewModal.tsx");
const contentRoute = readRequired("src/app/api/drops/content/route.ts");
const viewerPage = readRequired("src/app/dashboard/viewer/page.tsx");
const viewerClient = readRequired("src/app/dashboard/viewer/ViewerClient.tsx");
const viewerState = readRequired("src/app/dashboard/viewer/hooks/useViewerState.ts");
const viewerHelpers = readRequired("src/app/dashboard/viewer/ViewerHelpers.ts");
const dropViewAccess = readRequired("src/lib/drop-view-access.ts");
const contentTests = readRequired("tests/unit/content-protection-truth.spec.ts");
const dropsContentTests = readRequired("tests/unit/drops-content-route.spec.ts");
const viewerTests = readRequired("tests/unit/dashboard-viewer-page.spec.tsx");
const audit = readRequired("FULL_SCALE_CODEBASE_AUDIT.md");
const ledger = readRequired("REPO_MEMORY_LEDGER.md");
const checklist = readRequired("EVERY_FILE_FUNCTION_CHECKLIST.md");

for (const expected of [
  "\"score:content-protection\": \"tsx scripts/agent/score-content-protection.ts\"",
  "\"check:content-protection\": \"tsx scripts/agent/validate-content-protection.ts\"",
]) {
  requireIncludes(packageJson, expected, "package scripts");
}

for (const expected of [
  "ContentProtectionFinding",
  "ContentProtectionReport",
  "contentUrls",
  "contentUrl",
  "data-safe-preview-fields-only",
  "sanitizeDropForClient",
  "getDropRaw",
  "auth: \\\"user\\\"",
  "requireTrustedOrigin: true",
  "scopeToCaller: true",
  "safeAutofixesAvailable",
  "canAutofix: input.canAutofix ?? false",
]) {
  requireIncludes(scorer, expected, "content protection scorer");
}
for (const forbidden of ["node:child_process", "execSync", "spawnSync", "spawn("]) {
  requireNotIncludes(scorer, forbidden, "content protection scorer default path");
}

for (const expected of [
  "export function sanitizeDropForClient",
  "drop.contentUrls.map(() => \"\")",
  "const { contentUrl, contentUrls, ...safe } = drop",
  "contentUrl: \"\"",
  "contentUrls: safeContentUrls",
  "drops.push(sanitizeDropForClient(resolved))",
  "return sanitizeDropForClient(resolved)",
]) {
  requireIncludes(serverDrops, expected, "server Drop sanitization");
}

for (const expected of [
  "const drop = await getDrop(id)",
  "toLockedDropPreviewSafeDrop(drop)",
]) {
  requireIncludes(previewPage, expected, "Drop preview page");
}
requireNotIncludes(previewPage, "getDropRaw(id)", "Drop preview page");

for (const expected of [
  "safePreviewFieldsOnly: true",
  "export function toLockedDropPreviewSafeDrop",
  "mediaCounts: drop.mediaCounts ? { ...drop.mediaCounts } : undefined",
]) {
  requireIncludes(previewTruth, expected, "locked preview truth");
}
requireNotIncludes(previewTruth, "contentUrl:", "locked preview truth safe fields");
requireNotIncludes(previewTruth, "contentUrls:", "locked preview truth safe fields");

for (const expected of [
  "data-drop-preview-page=\"true\"",
  "data-drop-preview-cta-state={truth.ctaState}",
  "data-safe-preview-fields-only=\"true\"",
]) {
  requireIncludes(previewView, expected, "locked preview view");
}
requireNotIncludes(previewView, "contentUrl", "locked preview view");
requireNotIncludes(previewView, "contentUrls", "locked preview view");

for (const expected of [
  "Legacy fallback only. Locked Drop preview ownership moved to /drops/[id]/preview.",
  "getDropMediaSummary(drop)",
]) {
  requireIncludes(legacyModal, expected, "legacy DropPreviewModal");
}
requireNotIncludes(legacyModal, "drop.contentUrl", "legacy DropPreviewModal");
requireNotIncludes(legacyModal, "drop.contentUrls", "legacy DropPreviewModal");

for (const expected of [
  "auth: \"user\"",
  "requireTrustedOrigin: true",
  "scopeToCaller: true",
  "const ownsDrop = creatorId === caller.uid",
  "const hasUnlockedDrop = userData.unlockedContent.includes(dropId)",
  "Object.prototype.hasOwnProperty.call(userData.unlockedContentTimestamps",
  "const accessDecision = resolveMediaAccess",
  "if (!accessDecision.allowed)",
  "return finalize(buildMediaAccessDeniedResponse(accessDecision))",
  "headers.set(\"Cache-Control\", \"private, no-store\")",
]) {
  requireIncludes(contentRoute, expected, "content proxy entitlement route");
}
if (contentRoute.indexOf("if (!accessDecision.allowed)") > contentRoute.indexOf("const availableUrls = Array.isArray(dropRecord.contentUrls)")) {
  failures.push("content proxy must prove entitlement before selecting internal content URLs.");
}
if (contentRoute.indexOf("if (!accessDecision.allowed)") > contentRoute.indexOf("fetch(targetUrl")) {
  failures.push("content proxy must prove entitlement before fetching internal content URLs.");
}

for (const expected of [
  'export const dynamic = "force-dynamic";',
  "export const revalidate = 0;",
]) {
  requireIncludes(viewerPage, expected, "dashboard viewer page cache boundary");
}
requireExactOccurrences(
  viewerPage,
  "const rawDrop = await getDropRaw(id);",
  1,
  "dashboard viewer raw Drop loading",
);
requireExactOccurrences(
  viewerPage,
  "const drop = sanitizeDropForClient(rawDrop);",
  1,
  "dashboard viewer Drop sanitation",
);
requireOrderedOccurrences(
  viewerPage,
  [
    "const navigationSession = await verifyNavigationSessionCookieValue(",
    "if (!navigationSession || !adminDb || !adminAuth) {",
    "redirect(viewerPreviewHref);",
    "const [viewerSnapshot, authUser] = await Promise.all([",
    'adminDb.collection("users").doc(navigationSession.uid).get(),',
    "adminAuth.getUser(navigationSession.uid).catch(() => null),",
    "if (!viewerSnapshot.exists || !authUser || authUser.disabled) {",
    "redirect(viewerPreviewHref);",
    "const viewerData = viewerSnapshot.data() ?? {};",
    'if (viewerData.status === "suspended" || viewerData.status === "banned") {',
    "redirect(viewerPreviewHref);",
    "const rawDrop = await getDropRaw(id);",
    "const viewerAccess = resolveDropViewAccess({",
    "if (!viewerAccess.allowed) {",
    "redirect(viewerPreviewHref);",
    "const drop = sanitizeDropForClient(rawDrop);",
    "return <ViewerClient",
  ],
  "dashboard viewer server entitlement boundary",
);
for (const expected of [
  "resolveDropViewAccess",
  "const isAuthorized = accessState.allowed",
  "telemetryEventForDropViewAccess",
  "isAuthorized,",
]) {
  requireIncludes(viewerClient, expected, "dashboard viewer client");
}
for (const expected of [
  "unlockedContent",
  "unlockedContentTimestamps",
  "allowed_unwrapped",
  "denied_not_unwrapped",
  "loading_entitlement",
]) {
  requireIncludes(dropViewAccess, expected, "dashboard viewer access resolver");
}
requireIncludes(viewerState, "if (!isAuthorized || !drop) return", "viewer state content loading");
for (const expected of [
  "export async function fetchSecureContent",
  "authFetch(`/api/drops/content?id=${encodeURIComponent(dropId)}&index=${index}`",
  "cache: \"no-store\"",
]) {
  requireIncludes(viewerHelpers, expected, "viewer helper content proxy loading");
}
for (const expected of ["fetchAssetRecord(currentDrop, activeIndex", "fetchAssetRecord(currentDrop, index"]) {
  requireIncludes(viewerState, expected, "viewer state content loading");
}

for (const expected of [
  "sanitizeDropForClient(lockedDrop)",
  "toLockedDropPreviewSafeDrop",
  "safePreviewFieldsOnly",
  "guest_protected",
  "unlocked_success",
]) {
  requireIncludes(contentTests, expected, "content protection truth tests");
}
for (const expected of [
  "blocks locked content for a caller without entitlement",
  "serves content after the user has unlocked the drop",
  "accepts the server-written unlock timestamp as entitlement evidence",
  "treats the drop creator as entitled",
]) {
  requireIncludes(dropsContentTests, expected, "content proxy route tests");
}
requireIncludes(viewerTests, "sanitizeDropForClient", "viewer page tests");

const doctrineNote = "KandyDrops locked content protection scoring is deterministic.";
for (const [label, source] of [
  ["content protection score docs", docs],
  ["full audit ledger", audit],
  ["repo memory ledger", ledger],
  ["file function checklist", checklist],
] as const) {
  requireIncludes(source, doctrineNote, label);
}
for (const expected of [
  "data-safe-preview-fields-only",
  "sanitizeDropForClient",
  "No autofix is enabled by default",
]) {
  requireIncludes(docs, expected, "content protection score docs");
}

if (failures.length > 0) {
  console.error("Content protection validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Content protection scorer validated.");
