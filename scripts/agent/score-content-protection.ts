import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

type ContentProtectionSeverity = "info" | "minor" | "moderate" | "major" | "critical";
type ContentProtectionCategory =
  | "locked_preview"
  | "safe_preview_fields"
  | "legacy_modal"
  | "api_entitlement"
  | "viewer_entitlement"
  | "public_feed_sanitization"
  | "internal_url"
  | "test_coverage"
  | "autofix_policy";

type ContentProtectionFinding = {
  id: string;
  severity: ContentProtectionSeverity;
  category: ContentProtectionCategory;
  title: string;
  filePath: string;
  line?: number;
  excerpt?: string;
  scoreImpact: number;
  suggestedFix: string;
  canAutofix: boolean;
  escalation: string;
  evidence: string[];
};

type ContentProtectionReport = {
  score: number;
  status: "clean" | "pass" | "warning" | "beta-risk" | "fail";
  generatedAt: string;
  repoRoot: string;
  findings: ContentProtectionFinding[];
  criticalCount: number;
  majorCount: number;
  safeAutofixesAvailable: number;
  checkedFiles: string[];
  protectedSurfaces: string[];
  tests: string[];
  commandBudget: {
    allowedCommands: string[];
    forbiddenCommands: string[];
  };
  summary: string;
};

const root = process.cwd();
const REPORT_PATH = "agent/state/content-protection-score.generated.json";

const checkedFiles = [
  "src/lib/server/drops.ts",
  "src/lib/locked-drop-preview-truth.ts",
  "src/app/drops/[id]/preview/page.tsx",
  "src/components/Drops/LockedDropPreviewClient.tsx",
  "src/components/Drops/LockedDropPreviewView.tsx",
  "src/components/DropPreviewModal.tsx",
  "src/app/api/drops/route.ts",
  "src/app/api/drops/content/route.ts",
  "src/app/api/drops/unlock/route.ts",
  "src/app/dashboard/viewer/page.tsx",
  "src/app/dashboard/viewer/ViewerClient.tsx",
  "src/lib/drop-view-access.ts",
  "src/app/dashboard/viewer/hooks/useViewerState.ts",
  "src/app/dashboard/viewer/ViewerHelpers.ts",
  "tests/unit/content-protection-truth.spec.ts",
  "tests/unit/drops-content-route.spec.ts",
  "tests/unit/dashboard-viewer-page.spec.tsx",
] as const;

const protectedSurfaces = [
  "full-page locked Drop preview",
  "legacy DropPreviewModal fallback",
  "public Drops feed API",
  "authenticated content proxy",
  "dashboard viewer route",
  "viewer client content loader",
] as const;

const commandBudget = {
  allowedCommands: [
    "npm run score:content-protection",
    "npm run check:content-protection",
    "npx vitest run --config vitest.contracts.config.ts tests/unit/content-protection-truth.spec.ts tests/unit/drops-content-route.spec.ts tests/unit/dashboard-viewer-page.spec.tsx",
  ],
  forbiddenCommands: [
    "playwright",
    "cypress",
    "lighthouse",
    "npm run check",
    "npm run check:ui:audits",
    "npm run check:ui:lighthouse",
    "broad integration tests",
  ],
};

const severityImpact: Record<ContentProtectionSeverity, number> = {
  info: 0,
  minor: -2,
  moderate: -5,
  major: -10,
  critical: -25,
};

function stableHash(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function readIfExists(filePath: string) {
  const fullPath = join(root, filePath);
  if (!existsSync(fullPath)) return null;
  return readFileSync(fullPath, "utf8");
}

function lineOf(source: string, needle: string) {
  const index = source.indexOf(needle);
  if (index < 0) return undefined;
  return source.slice(0, index).split(/\r?\n/u).length;
}

function excerptOf(source: string, needle: string) {
  return source.split(/\r?\n/u).find((line) => line.includes(needle))?.trim();
}

function indexOfAny(source: string, needles: string[]) {
  const found = needles
    .map((needle) => ({ needle, index: source.indexOf(needle) }))
    .filter((entry) => entry.index >= 0)
    .sort((left, right) => left.index - right.index);
  return found[0] ?? null;
}

function addFinding(
  findings: ContentProtectionFinding[],
  input: Omit<ContentProtectionFinding, "id" | "scoreImpact" | "canAutofix"> & { canAutofix?: boolean },
) {
  findings.push({
    ...input,
    id: `content-protection-${stableHash(`${input.category}:${input.title}:${input.filePath}:${input.line ?? ""}`)}`,
    scoreImpact: severityImpact[input.severity],
    canAutofix: input.canAutofix ?? false,
  });
}

function requireFile(findings: ContentProtectionFinding[], filePath: string) {
  const source = readIfExists(filePath);
  if (!source) {
    addFinding(findings, {
      severity: "critical",
      category: "safe_preview_fields",
      title: `Required content protection file is missing: ${filePath}`,
      filePath,
      suggestedFix: `Restore ${filePath} or update the scorer to the new canonical owner.`,
      escalation: "Missing content-protection owners cannot be auto-fixed because locked-content boundaries may have moved.",
      evidence: [filePath],
    });
  }
  return source;
}

function requireText(
  findings: ContentProtectionFinding[],
  filePath: string,
  expected: string,
  input: Pick<ContentProtectionFinding, "severity" | "category" | "title" | "suggestedFix" | "escalation">,
) {
  const source = requireFile(findings, filePath);
  if (!source || source.includes(expected)) return;

  addFinding(findings, {
    ...input,
    filePath,
    evidence: [expected],
  });
}

function forbidText(
  findings: ContentProtectionFinding[],
  filePath: string,
  forbidden: string,
  input: Pick<ContentProtectionFinding, "severity" | "category" | "title" | "suggestedFix" | "escalation">,
) {
  const source = readIfExists(filePath);
  if (!source || !source.includes(forbidden)) return;

  addFinding(findings, {
    ...input,
    filePath,
    line: lineOf(source, forbidden),
    excerpt: excerptOf(source, forbidden),
    evidence: [forbidden],
  });
}

function requireOrder(
  findings: ContentProtectionFinding[],
  filePath: string,
  beforeNeedles: string[],
  afterNeedles: string[],
  input: Pick<ContentProtectionFinding, "severity" | "category" | "title" | "suggestedFix" | "escalation">,
) {
  const source = requireFile(findings, filePath);
  if (!source) return;

  const before = indexOfAny(source, beforeNeedles);
  const after = indexOfAny(source, afterNeedles);
  if (!before || !after || before.index > after.index) {
    addFinding(findings, {
      ...input,
      filePath,
      line: after ? lineOf(source, after.needle) : undefined,
      excerpt: after ? excerptOf(source, after.needle) : undefined,
      evidence: [...beforeNeedles, ...afterNeedles],
    });
  }
}

function collectFindings() {
  const findings: ContentProtectionFinding[] = [];

  for (const filePath of checkedFiles) {
    requireFile(findings, filePath);
  }

  for (const filePath of [
    "src/app/drops/[id]/preview/page.tsx",
    "src/components/Drops/LockedDropPreviewClient.tsx",
    "src/components/Drops/LockedDropPreviewView.tsx",
  ]) {
    forbidText(findings, filePath, "contentUrls", {
      severity: "critical",
      category: "locked_preview",
      title: "Locked preview surface references contentUrls",
      suggestedFix: "Use safe preview fields, cover art, file counts, and public metadata only; never pass internal content URL arrays to locked preview UI.",
      escalation: "Content URL exposure requires security review and must not be auto-fixed.",
    });
    forbidText(findings, filePath, "contentUrl", {
      severity: "critical",
      category: "locked_preview",
      title: "Locked preview surface references contentUrl",
      suggestedFix: "Use cover image and safe metadata only before unlock; content streams belong behind the authenticated content proxy.",
      escalation: "Content URL exposure requires security review and must not be auto-fixed.",
    });
  }

  for (const expected of [
    "data-safe-preview-fields-only=\"true\"",
    "data-drop-preview-page=\"true\"",
    "data-drop-preview-cta-state={truth.ctaState}",
  ]) {
    requireText(findings, "src/components/Drops/LockedDropPreviewView.tsx", expected, {
      severity: "major",
      category: "safe_preview_fields",
      title: `Preview page must expose debug safety marker: ${expected}`,
      suggestedFix: "Restore locked preview data attributes so audits can verify safe preview state without runtime browser checks.",
      escalation: "Debug markers can be simple, but missing markers obscure content-protection truth.",
    });
  }

  for (const expected of [
    "safePreviewFieldsOnly: true",
    "export function toLockedDropPreviewSafeDrop",
    "return {",
    "fileMetadata: drop.fileMetadata ? { ...drop.fileMetadata } : undefined",
    "mediaCounts: drop.mediaCounts ? { ...drop.mediaCounts } : undefined",
  ]) {
    requireText(findings, "src/lib/locked-drop-preview-truth.ts", expected, {
      severity: "major",
      category: "safe_preview_fields",
      title: `Locked preview truth must preserve safe field contract: ${expected}`,
      suggestedFix: "Restore the safe preview view-model helper and keep only cover, metadata, counts, and public proof fields.",
      escalation: "Changing safe preview fields requires content-protection review.",
    });
  }
  forbidText(findings, "src/lib/locked-drop-preview-truth.ts", "contentUrls", {
    severity: "critical",
    category: "safe_preview_fields",
    title: "Safe preview view model includes contentUrls",
    suggestedFix: "Remove contentUrls from LockedDropPreviewSafeDrop and derive file counts from mediaCounts/fileMetadata only.",
    escalation: "Safe preview schema exposure requires security review.",
  });
  forbidText(findings, "src/lib/locked-drop-preview-truth.ts", "contentUrl", {
    severity: "critical",
    category: "safe_preview_fields",
    title: "Safe preview view model includes contentUrl",
    suggestedFix: "Remove contentUrl from LockedDropPreviewSafeDrop and use imageUrl only for public cover art.",
    escalation: "Safe preview schema exposure requires security review.",
  });

  for (const expected of [
    "export function sanitizeDropForClient",
    "drop.contentUrls.map(() => \"\")",
    "const { contentUrl, contentUrls, ...safe } = drop",
    "contentUrl: \"\"",
    "contentUrls: safeContentUrls",
    "drops.push(sanitizeDropForClient(resolved))",
    "return sanitizeDropForClient(resolved)",
  ]) {
    requireText(findings, "src/lib/server/drops.ts", expected, {
      severity: "critical",
      category: "public_feed_sanitization",
      title: `Public Drop reads must sanitize content URLs: ${expected}`,
      suggestedFix: "Restore sanitizeDropForClient and ensure public getDrops/getDrop never return raw content URLs.",
      escalation: "Public Drop payload exposure requires security review before release.",
    });
  }

  requireText(findings, "src/app/api/drops/route.ts", "const allDrops = await getDrops()", {
    severity: "critical",
    category: "public_feed_sanitization",
    title: "Public Drops API must read sanitized Drops",
    suggestedFix: "Use getDrops() from src/lib/server/drops so public API responses receive sanitized Drop records.",
    escalation: "Do not switch public feed to raw Firestore reads without a content-protection review.",
  });

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
    requireText(findings, "src/app/api/drops/content/route.ts", expected, {
      severity: "critical",
      category: "api_entitlement",
      title: `Content proxy must preserve entitlement guard: ${expected}`,
      suggestedFix: "Restore authenticated, same-origin, caller-scoped content proxy enforcement before reading or streaming content URLs.",
      escalation: "Content proxy changes require security review and targeted route tests.",
    });
  }

  requireOrder(findings, "src/app/api/drops/content/route.ts", [
    "if (!accessDecision.allowed)",
  ], [
    "const availableUrls = Array.isArray(dropRecord.contentUrls)",
    "const targetUrl = availableUrls[mediaIndex]",
    "fetch(targetUrl",
  ], {
    severity: "critical",
    category: "api_entitlement",
    title: "Content proxy reads/fetches internal URLs before entitlement is proven",
    suggestedFix: "Move ownership/unlock checks before any content URL selection or upstream fetch.",
    escalation: "Potential content exposure must be reviewed as a release blocker.",
  });

  for (const expected of [
    "const rawDrop = id ? await getDropRaw(id) : null",
    "const drop = rawDrop ? sanitizeDropForClient(rawDrop) : null",
    "return <ViewerClient drop={drop}",
  ]) {
    requireText(findings, "src/app/dashboard/viewer/page.tsx", expected, {
      severity: "critical",
      category: "viewer_entitlement",
      title: `Viewer server route must sanitize raw Drop before client render: ${expected}`,
      suggestedFix: "Keep raw Drop reads server-only and pass only sanitizeDropForClient output into ViewerClient.",
      escalation: "Viewer route content exposure requires security review.",
    });
  }

  for (const expected of [
    "resolveDropViewAccess",
    "const isAuthorized = accessState.allowed",
    "telemetryEventForDropViewAccess",
    "useViewerState({",
    "isAuthorized,",
  ]) {
    requireText(findings, "src/app/dashboard/viewer/ViewerClient.tsx", expected, {
      severity: "critical",
      category: "viewer_entitlement",
      title: `Viewer client must gate content loading by entitlement: ${expected}`,
      suggestedFix: "Keep viewer content hooks disabled until the user is creator or has server-written unlock timestamp.",
      escalation: "Viewer authorization changes require route and client tests.",
    });
  }

  for (const expected of [
    "unlockedContent",
    "unlockedContentTimestamps",
    "allowed_unwrapped",
    "denied_not_unwrapped",
    "loading_entitlement",
  ]) {
    requireText(findings, "src/lib/drop-view-access.ts", expected, {
      severity: "critical",
      category: "viewer_entitlement",
      title: `Viewer access resolver must preserve entitlement state: ${expected}`,
      suggestedFix: "Keep viewer authorization in resolveDropViewAccess and preserve missing-vs-denied entitlement states.",
      escalation: "Viewer authorization changes require route and client tests.",
    });
  }

  requireText(findings, "src/app/dashboard/viewer/hooks/useViewerState.ts", "if (!isAuthorized || !drop) return", {
    severity: "critical",
    category: "viewer_entitlement",
    title: "Viewer state must avoid content proxy fetch before authorization",
    suggestedFix: "Keep viewer content fetch orchestration behind isAuthorized checks.",
    escalation: "Viewer content loading changes require security review.",
  });
  for (const expected of [
    "export async function fetchSecureContent",
    "authFetch(`/api/drops/content?id=${encodeURIComponent(dropId)}&index=${index}`",
    "cache: \"no-store\"",
  ]) {
    requireText(findings, "src/app/dashboard/viewer/ViewerHelpers.ts", expected, {
      severity: "critical",
      category: "viewer_entitlement",
      title: `Viewer helper must fetch protected content only through the authenticated proxy: ${expected}`,
      suggestedFix: "Keep protected viewer media behind authFetch('/api/drops/content') with no-store cache.",
      escalation: "Viewer proxy loading changes require security review.",
    });
  }

  forbidText(findings, "src/components/DropPreviewModal.tsx", "drop.contentUrls", {
    severity: "major",
    category: "legacy_modal",
    title: "Legacy DropPreviewModal reads contentUrls",
    suggestedFix: "Use getDropMediaSummary/mediaCounts and keep the legacy fallback from touching content URL fields.",
    escalation: "Legacy preview fallback must remain documented and safe until removed.",
  });
  forbidText(findings, "src/components/DropPreviewModal.tsx", "drop.contentUrl", {
    severity: "major",
    category: "legacy_modal",
    title: "Legacy DropPreviewModal reads contentUrl",
    suggestedFix: "Use getDropMediaSummary/mediaCounts and keep the legacy fallback from touching content URL fields.",
    escalation: "Legacy preview fallback must remain documented and safe until removed.",
  });
  requireText(findings, "src/components/DropPreviewModal.tsx", "Legacy fallback only. Locked Drop preview ownership moved to /drops/[id]/preview.", {
    severity: "major",
    category: "legacy_modal",
    title: "Legacy DropPreviewModal must be marked as fallback",
    suggestedFix: "Document the modal as legacy fallback or remove it after route migration is complete.",
    escalation: "Legacy modal ownership must be explicit to avoid reactivating unsafe preview patterns.",
  });

  for (const filePath of [
    "src/app/drops/[id]/preview/page.tsx",
    "src/components/Drops/LockedDropPreviewClient.tsx",
    "src/components/Drops/LockedDropPreviewView.tsx",
    "src/components/DropPreviewModal.tsx",
    "src/app/dashboard/viewer/page.tsx",
    "src/app/dashboard/viewer/ViewerClient.tsx",
  ]) {
    const source = readIfExists(filePath);
    if (!source) continue;
    const rawUrl = indexOfAny(source, ["firebasestorage.googleapis.com", "storage.googleapis.com", "getDownloadURL("]);
    if (rawUrl) {
      addFinding(findings, {
        severity: "critical",
        category: "internal_url",
        title: "Public or viewer shell contains raw internal storage URL access",
        filePath,
        line: lineOf(source, rawUrl.needle),
        excerpt: excerptOf(source, rawUrl.needle),
        suggestedFix: "Route internal media through /api/drops/content after entitlement; preview surfaces may use cover art only.",
        escalation: "Raw storage URL exposure must be reviewed as a content-protection release blocker.",
        evidence: [rawUrl.needle],
      });
    }
  }

  for (const expected of [
    "sanitizeDropForClient(lockedDrop)",
    "toLockedDropPreviewSafeDrop",
    "safePreviewFieldsOnly",
    "guest_protected",
    "unlocked_success",
  ]) {
    requireText(findings, "tests/unit/content-protection-truth.spec.ts", expected, {
      severity: "major",
      category: "test_coverage",
      title: `Content protection unit test must cover ${expected}`,
      suggestedFix: "Add or restore targeted locked/unlocked safe-preview tests.",
      escalation: "Missing test coverage should block content-protection refactors.",
    });
  }
  for (const expected of [
    "blocks locked content for a caller without entitlement",
    "serves content after the user has unlocked the drop",
    "accepts the server-written unlock timestamp as entitlement evidence",
    "treats the drop creator as entitled",
  ]) {
    requireText(findings, "tests/unit/drops-content-route.spec.ts", expected, {
      severity: "major",
      category: "test_coverage",
      title: `Content proxy tests must cover ${expected}`,
      suggestedFix: "Restore targeted /api/drops/content locked/unlocked/creator tests.",
      escalation: "Content API changes require targeted entitlement tests.",
    });
  }
  requireText(findings, "tests/unit/dashboard-viewer-page.spec.tsx", "sanitizeDropForClient", {
    severity: "major",
    category: "test_coverage",
    title: "Viewer page test must verify sanitization before client render",
    suggestedFix: "Restore dashboard viewer page test coverage for raw Drop sanitization.",
    escalation: "Viewer route changes require targeted sanitization tests.",
  });

  return findings;
}

function statusFor(score: number, criticalCount: number): ContentProtectionReport["status"] {
  if (criticalCount > 0) return "fail";
  if (score >= 95) return "clean";
  if (score >= 90) return "pass";
  if (score >= 80) return "warning";
  if (score >= 70) return "beta-risk";
  return "fail";
}

function buildReport(): ContentProtectionReport {
  const findings = collectFindings();
  const criticalCount = findings.filter((finding) => finding.severity === "critical").length;
  const majorCount = findings.filter((finding) => finding.severity === "major").length;
  const score = Math.max(0, Math.min(100, 100 + findings.reduce((sum, finding) => sum + finding.scoreImpact, 0)));

  return {
    score,
    status: statusFor(score, criticalCount),
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    findings,
    criticalCount,
    majorCount,
    safeAutofixesAvailable: findings.filter((finding) => finding.canAutofix).length,
    checkedFiles: [...checkedFiles],
    protectedSurfaces: [...protectedSurfaces],
    tests: [
      "tests/unit/content-protection-truth.spec.ts",
      "tests/unit/drops-content-route.spec.ts",
      "tests/unit/dashboard-viewer-page.spec.tsx",
    ],
    commandBudget,
    summary: findings.length === 0
      ? "Locked content protection is clean for preview, public feed, content proxy, and viewer source contracts."
      : `Locked content protection found ${findings.length} issue(s); content exposure findings require escalation.`,
  };
}

function writeReport(report: ContentProtectionReport) {
  const fullPath = join(root, REPORT_PATH);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

function printSummary(report: ContentProtectionReport) {
  console.log(`Content protection score: ${report.score}/100 (${report.status})`);
  console.log(`Findings: ${report.findings.length} total, ${report.criticalCount} critical, ${report.majorCount} major`);
  console.log(`Safe autofixes available: ${report.safeAutofixesAvailable}`);
  for (const finding of report.findings.slice(0, 5)) {
    const location = finding.line ? `${finding.filePath}:${finding.line}` : finding.filePath;
    console.log(`- [${finding.severity}] ${finding.title} (${location})`);
  }
  console.log(`Allowed next commands: ${report.commandBudget.allowedCommands.join(", ")}`);
  console.log(`Forbidden by default: ${report.commandBudget.forbiddenCommands.join(", ")}`);
}

const report = buildReport();
writeReport(report);
printSummary(report);
