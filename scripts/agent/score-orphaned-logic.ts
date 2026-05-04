import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative, sep } from "node:path";

type OrphanedLogicSeverity = "info" | "minor" | "moderate" | "major" | "critical";
type OrphanedLogicCategory =
  | "duplicate_normalizer"
  | "legacy_preview_ownership"
  | "use_drops_notes"
  | "duplicate_pr_audit"
  | "route_migration"
  | "stale_docs"
  | "vocabulary"
  | "realtime_hot_cache"
  | "telemetry_duplicate_intent"
  | "dead_import"
  | "autofix_policy";

type OrphanedLogicFinding = {
  id: string;
  severity: OrphanedLogicSeverity;
  category: OrphanedLogicCategory;
  title: string;
  filePath: string;
  line?: number;
  excerpt?: string;
  scoreImpact: number;
  suggestedFix: string;
  canAutofix: boolean;
  autofixPlan?: string;
  escalation: string;
  evidence: string[];
};

type OrphanedLogicReport = {
  score: number;
  status: "clean" | "pass" | "warning" | "beta-risk" | "fail";
  generatedAt: string;
  repoRoot: string;
  findings: OrphanedLogicFinding[];
  criticalCount: number;
  majorCount: number;
  safeAutofixesAvailable: number;
  scannedFileCount: number;
  checkedFiles: string[];
  rules: string[];
  commandBudget: {
    allowedCommands: string[];
    forbiddenCommands: string[];
  };
  summary: string;
};

type SourceFile = {
  path: string;
  source: string;
};

const root = process.cwd();
const REPORT_PATH = "agent/state/orphaned-logic-score.generated.json";

const severityImpact: Record<OrphanedLogicSeverity, number> = {
  info: 0,
  minor: -2,
  moderate: -5,
  major: -10,
  critical: -25,
};

const rules = [
  "duplicate normalizers for same domain",
  "old DropPreviewModal must not own locked preview after full-page route exists",
  "duplicate useDrops optimization notes",
  "duplicate PR audit chunks with broken template text",
  "unused route handlers after route migration",
  "stale docs contradicting current doctrine",
  "old Coins or wrong GumDrops vocabulary",
  "obsolete realtime logic where hot-cache doctrine applies",
  "duplicate telemetry events with same intent but different names",
  "dead imports in public beta surfaces",
  "safe autofix plans only for exact unused imports or exact duplicate broken doc chunks after TypeScript confirmation",
];

const commandBudget = {
  allowedCommands: [
    "npm run score:orphans",
    "npm run check:orphaned-logic",
    "npm run typecheck",
  ],
  forbiddenCommands: [
    "playwright",
    "cypress",
    "lighthouse",
    "npm run check",
    "npm run check:ui:audits",
    "npm run check:ui:lighthouse",
    "broad UI audits",
  ],
};

const requiredFiles = [
  "src/app/drops/[id]/preview/page.tsx",
  "src/app/drops/DropsClient.tsx",
  "src/components/DropCard.tsx",
  "src/components/DropPreviewModal.tsx",
  "src/components/FeaturedCarousel.tsx",
  "src/hooks/useDrops.ts",
  "src/lib/telemetry-catalog.ts",
  "src/lib/drop-normalizers.ts",
  "src/lib/drop-read-models.ts",
] as const;

const publicBetaImportSurfaces = [
  "src/app/drops/DropsClient.tsx",
  "src/components/DropCard.tsx",
  "src/components/DropCardLayout.tsx",
  "src/components/DropPreviewModal.tsx",
  "src/components/FeaturedCarousel.tsx",
  "src/components/Drops/LockedDropPreviewClient.tsx",
  "src/components/Drops/LockedDropPreviewView.tsx",
  "src/components/Chat/ChatExperience.tsx",
  "src/components/CoreLayoutWrapper.tsx",
] as const;

const skipDirectories = new Set([
  ".git",
  ".next",
  "node_modules",
  "playwright-report",
  "test-results",
  "lighthouse-results",
  "coverage",
  "dist",
  "build",
  "out",
]);

function stableHash(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function normalizePath(filePath: string) {
  return filePath.split(sep).join("/");
}

function readIfExists(filePath: string): string | null {
  const absolutePath = join(root, filePath);
  if (!existsSync(absolutePath)) return null;
  return readFileSync(absolutePath, "utf8");
}

function walkFiles(startDir: string, extensions: Set<string>) {
  const results: string[] = [];
  const absoluteStart = join(root, startDir);
  if (!existsSync(absoluteStart)) return results;

  function visit(absoluteDir: string) {
    for (const entry of readdirSync(absoluteDir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!skipDirectories.has(entry.name)) {
          visit(join(absoluteDir, entry.name));
        }
        continue;
      }
      if (!entry.isFile()) continue;
      const absoluteFile = join(absoluteDir, entry.name);
      if (extensions.has(extname(entry.name))) {
        results.push(normalizePath(relative(root, absoluteFile)));
      }
    }
  }

  visit(absoluteStart);
  return results;
}

function lineOf(source: string, needle: string) {
  const index = source.indexOf(needle);
  if (index < 0) return undefined;
  return source.slice(0, index).split(/\r?\n/u).length;
}

function excerptOf(source: string, needle: string) {
  return source.split(/\r?\n/u).find((line) => line.includes(needle))?.trim();
}

function readSourceFiles(filePaths: string[]): SourceFile[] {
  return filePaths
    .map((filePath) => {
      const source = readIfExists(filePath);
      return source ? { path: filePath, source } : null;
    })
    .filter((file): file is SourceFile => Boolean(file));
}

function addFinding(
  findings: OrphanedLogicFinding[],
  input: Omit<OrphanedLogicFinding, "id" | "scoreImpact" | "canAutofix"> & { canAutofix?: boolean },
) {
  findings.push({
    ...input,
    id: `orphaned-logic-${stableHash(`${input.category}:${input.title}:${input.filePath}:${input.line ?? ""}`)}`,
    scoreImpact: severityImpact[input.severity],
    canAutofix: input.canAutofix ?? false,
  });
}

function requireFile(findings: OrphanedLogicFinding[], filePath: string) {
  const source = readIfExists(filePath);
  if (!source) {
    addFinding(findings, {
      severity: "major",
      category: "route_migration",
      title: `Required orphaned-logic owner file is missing: ${filePath}`,
      filePath,
      suggestedFix: `Restore ${filePath} or update the orphaned-logic scorer to the new canonical owner.`,
      escalation: "Missing owners cannot be auto-cleaned because route/helper ownership may have moved.",
      evidence: [filePath],
    });
  }
  return source;
}

function scanDuplicateNormalizers(findings: OrphanedLogicFinding[], sourceFiles: SourceFile[]) {
  const exportRegex = /export\s+(?:async\s+)?(?:function|const)\s+([A-Za-z0-9_]+)/gu;
  const helpers = new Map<string, Array<{ filePath: string; line?: number; excerpt?: string }>>();

  for (const file of sourceFiles) {
    let match: RegExpExecArray | null;
    while ((match = exportRegex.exec(file.source)) !== null) {
      const name = match[1];
      if (!/^(normalize|resolve).*(Truth|State|Record|Projection|ReadModel|Profile|Drop|Creator|Gumdrop|GumDrops|Transaction|Support)|^normalize[A-Z]/u.test(name)) {
        continue;
      }
      const entries = helpers.get(name) ?? [];
      entries.push({
        filePath: file.path,
        line: lineOf(file.source, match[0]),
        excerpt: excerptOf(file.source, match[0]),
      });
      helpers.set(name, entries);
    }
  }

  for (const [name, entries] of helpers) {
    const uniqueFiles = Array.from(new Set(entries.map((entry) => entry.filePath)));
    if (uniqueFiles.length <= 1) continue;
    const first = entries[0];
    addFinding(findings, {
      severity: "major",
      category: "duplicate_normalizer",
      title: `Duplicate exported normalizer/truth helper: ${name}`,
      filePath: first.filePath,
      line: first.line,
      excerpt: first.excerpt,
      suggestedFix: `Pick one canonical ${name} owner and convert other exports to adapters or delete after tests prove no route depends on them.`,
      escalation: "Do not merge helper ownership automatically; duplicate source-of-truth helpers need owner review.",
      evidence: uniqueFiles,
    });
  }
}

function scanLegacyPreviewOwnership(findings: OrphanedLogicFinding[]) {
  const fullPagePreviewExists = existsSync(join(root, "src/app/drops/[id]/preview/page.tsx"));
  const modalSource = requireFile(findings, "src/components/DropPreviewModal.tsx");
  if (!fullPagePreviewExists || !modalSource) return;

  if (!modalSource.includes("Legacy fallback only. Locked Drop preview ownership moved to /drops/[id]/preview.")) {
    addFinding(findings, {
      severity: "major",
      category: "legacy_preview_ownership",
      title: "DropPreviewModal is not marked as legacy fallback",
      filePath: "src/components/DropPreviewModal.tsx",
      suggestedFix: "Add the legacy fallback marker or remove the modal after proving all locked preview entry points use the full-page route.",
      escalation: "Do not delete modal files automatically without explicit deprecated marker and route coverage.",
      evidence: ["Full-page preview route exists."],
    });
  }

  for (const forbidden of ["drop.contentUrl", "drop.contentUrls"]) {
    if (modalSource.includes(forbidden)) {
      addFinding(findings, {
        severity: "critical",
        category: "legacy_preview_ownership",
        title: "Legacy DropPreviewModal touches protected content URL fields",
        filePath: "src/components/DropPreviewModal.tsx",
        line: lineOf(modalSource, forbidden),
        excerpt: excerptOf(modalSource, forbidden),
        suggestedFix: "Keep the legacy modal from owning locked content. Use safe metadata/file counts only.",
        escalation: "Content exposure must be reviewed before release; do not auto-clean content access paths.",
        evidence: [forbidden],
      });
    }
  }

  for (const filePath of [
    "src/app/drops/DropsClient.tsx",
    "src/components/DropCard.tsx",
    "src/components/DropGrid.tsx",
    "src/components/FeaturedCarousel.tsx",
  ]) {
    const source = readIfExists(filePath);
    if (!source || !source.includes("DropPreviewModal")) continue;
    addFinding(findings, {
      severity: "major",
      category: "legacy_preview_ownership",
      title: "Locked preview entry surface still references DropPreviewModal",
      filePath,
      line: lineOf(source, "DropPreviewModal"),
      excerpt: excerptOf(source, "DropPreviewModal"),
      suggestedFix: "Route locked preview actions to /drops/[id]/preview and leave modal only as documented fallback if still needed.",
      escalation: "Preview migration affects conversion flow and must not be auto-fixed.",
      evidence: ["Full-page preview route exists.", "DropPreviewModal reference found."],
    });
  }
}

function scanUseDropsNotes(findings: OrphanedLogicFinding[], docFiles: SourceFile[]) {
  const optimizationNeedles = [
    "combine client drop filtering and next-expiration",
    "single-pass filtering/next-expiry",
    "primitive nextExpiryMs",
    "duplicate Bolt/Jules branch docs",
  ];
  const matches: Array<{ filePath: string; line?: number; excerpt?: string }> = [];

  for (const file of docFiles) {
    for (const needle of optimizationNeedles) {
      if (!file.source.includes(needle)) continue;
      matches.push({
        filePath: file.path,
        line: lineOf(file.source, needle),
        excerpt: excerptOf(file.source, needle),
      });
    }
  }

  const uniqueFiles = Array.from(new Set(matches.map((match) => match.filePath)));
  if (matches.length > 8 || uniqueFiles.length > 5) {
    const first = matches[0];
    addFinding(findings, {
      severity: "moderate",
      category: "use_drops_notes",
      title: "useDrops optimization note is duplicated across too many docs",
      filePath: first.filePath,
      line: first.line,
      excerpt: first.excerpt,
      suggestedFix: "Keep one canonical launch PR triage note and one memory/checklist pointer; remove duplicate broken branch notes only when exact duplicate chunks match.",
      canAutofix: false,
      autofixPlan: "Potential autofix only if two doc chunks are byte-for-byte identical and contain stale branch audit text.",
      escalation: "Do not delete current-source doctrine or verification history automatically.",
      evidence: uniqueFiles,
    });
  }
}

function scanBrokenDocChunks(findings: OrphanedLogicFinding[], docFiles: SourceFile[]) {
  const brokenPatterns = [
    { label: "unresolved template braces", pattern: /\{\{[^}\n]+\}\}/u },
    { label: "unresolved placeholder", pattern: /\b(?:INSERT_|BROKEN_TEMPLATE|REPLACE_ME)\b/u },
    { label: "HTML todo marker", pattern: /<!--\s*TODO/u },
  ];

  for (const file of docFiles) {
    for (const line of file.source.split(/\r?\n/u)) {
      for (const entry of brokenPatterns) {
        if (!entry.pattern.test(line)) continue;
        addFinding(findings, {
          severity: "moderate",
          category: "duplicate_pr_audit",
          title: `Generated doc contains ${entry.label}`,
          filePath: file.path,
          line: lineOf(file.source, line),
          excerpt: line.trim(),
          suggestedFix: "Remove exact duplicate broken generated doc chunk only if the surrounding canonical doctrine is preserved.",
          canAutofix: false,
          autofixPlan: "Safe cleanup requires an exact duplicate broken chunk and no unique source-of-truth content.",
          escalation: "Broken docs can hide stale PR logic; do not delete non-duplicate governance content automatically.",
          evidence: [entry.label],
        });
      }
    }
  }
}

function scanRouteMigration(findings: OrphanedLogicFinding[], sourceFiles: SourceFile[]) {
  for (const file of sourceFiles) {
    if (!file.path.endsWith("/route.ts") && !file.path.endsWith("/route.tsx")) continue;
    if (!/\b(?:Deprecated|deprecated|legacy fallback|Legacy fallback)\b/u.test(file.source)) continue;
    if (!/\bexport\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\b/u.test(file.source)) continue;
    addFinding(findings, {
      severity: "moderate",
      category: "route_migration",
      title: "Deprecated or legacy route handler is still exported",
      filePath: file.path,
      line: lineOf(file.source, "export async function"),
      excerpt: excerptOf(file.source, "export async function"),
      suggestedFix: "Confirm route migration is complete, then remove or wrap the route only with explicit owner approval.",
      escalation: "Route deletion can break deep links, integrations, or admin flows; do not auto-delete route handlers.",
      evidence: ["Deprecated/legacy marker and exported handler found."],
    });
  }
}

function scanStaleDocs(findings: OrphanedLogicFinding[], docFiles: SourceFile[]) {
  const staleClaims = [
    "DropPreviewModal owns locked preview",
    "locked preview modal owns",
    "locked preview is a bottom sheet",
    "locked drop preview is a bottom sheet",
    "min-h-[calc(68vh+3.75rem)]",
    "CHAT_LIST_FLOATING_ACTION_BOTTOM_OFFSET = \"0px\"",
  ];

  for (const file of docFiles) {
    if ([
      "docs/agent-truth/orphaned-logic-score.md",
      "docs/agent-truth/device-layout-contract.md",
      "docs/agent-truth/device-layout-repair.md",
      "docs/agent-truth/device-layout-score.md",
      "docs/agent-truth/ast-grep-rules.md",
    ].includes(file.path)) continue;
    const lines = file.source.split(/\r?\n/u);
    const lowerSource = file.source.toLowerCase();
    for (const claim of staleClaims) {
      const lowerClaim = claim.toLowerCase();
      if (!lowerSource.includes(lowerClaim)) continue;
      const matchingLine = lines.find((line) => line.toLowerCase().includes(lowerClaim)) ?? "";
      if (lineIsDetectionDoctrine(matchingLine)) continue;
      addFinding(findings, {
        severity: "moderate",
        category: "stale_docs",
        title: "Doc contains a stale layout/preview doctrine claim",
        filePath: file.path,
        line: lineOf(lowerSource, lowerClaim),
        excerpt: excerptOf(file.source, claim) ?? excerptOf(file.source, claim.replace(/"/gu, "\\\"")),
        suggestedFix: "Update the doc to point at the current full-page preview or shared shell token doctrine.",
        escalation: "Do not rewrite broad doctrine automatically; stale docs require context-aware cleanup.",
        evidence: [claim],
      });
    }
  }
}

function lineIsVocabularyDoctrine(line: string) {
  return /\b(?:no|forbidden|approved|banned|wrong|must not|do not|detect|scorer|validator|vocabulary|substitutes|token|tokens)\b/iu.test(line);
}

function lineIsDetectionDoctrine(line: string) {
  return /\b(?:flag|detect|replace|exact|forbidden|repair|score|validator|must not|do not|if|allowed|rule)\b/iu.test(line);
}

function scanVocabulary(findings: OrphanedLogicFinding[], files: SourceFile[]) {
  const forbiddenVocabulary = /\b(?:Coins|Tokens|Credits)\b/u;
  const excludedFiles = new Set([
    "docs/doctrine/kandydrops-vocabulary-index.md",
    "docs/doctrine/kandydrops-copy-doctrine.md",
    "docs/agent-truth/orphaned-logic-score.md",
    "scripts/agent/score-orphaned-logic.ts",
    "scripts/agent/validate-orphaned-logic.ts",
  ]);

  for (const file of files) {
    if (excludedFiles.has(file.path) || file.path.startsWith("agent/index/")) continue;
    for (const line of file.source.split(/\r?\n/u)) {
      const match = forbiddenVocabulary.exec(line);
      if (!match || lineIsVocabularyDoctrine(line)) continue;
      addFinding(findings, {
        severity: "moderate",
        category: "vocabulary",
        title: "Old economy vocabulary appears outside doctrine context",
        filePath: file.path,
        line: lineOf(file.source, line),
        excerpt: line.trim(),
        suggestedFix: "Replace user-facing economy vocabulary with GumDrops unless the line is explicitly documenting a forbidden term.",
        escalation: "Copy changes require doctrine review; do not bulk-rewrite without checking surface tone.",
        evidence: [match[0]],
      });
    }
  }
}

function scanRealtimeHotCache(findings: OrphanedLogicFinding[], sourceFiles: SourceFile[]) {
  for (const file of sourceFiles) {
    const isAdminAnalytics = file.path.startsWith("src/app/admin/analytics/") || /src\/components\/Admin\/.*Analytics/u.test(file.path);
    if (!isAdminAnalytics) continue;
    for (const needle of ["onSnapshot(", "setInterval("]) {
      if (!file.source.includes(needle)) continue;
      addFinding(findings, {
        severity: "major",
        category: "realtime_hot_cache",
        title: "Admin analytics surface still uses direct realtime/timer logic where hot-cache doctrine may apply",
        filePath: file.path,
        line: lineOf(file.source, needle),
        excerpt: excerptOf(file.source, needle),
        suggestedFix: "Confirm this admin analytics surface uses canonical hot-cache/materialized snapshots before retaining direct realtime or timer ownership.",
        escalation: "Realtime-to-hot-cache migration changes source truth and must not be auto-fixed.",
        evidence: [needle],
      });
    }
  }
}

function parseTelemetryEventNames(source: string) {
  const names: string[] = [];
  const eventRegex = /eventName:\s*["']([^"']+)["']/gu;
  let match: RegExpExecArray | null;
  while ((match = eventRegex.exec(source)) !== null) {
    names.push(match[1]);
  }
  return names;
}

function scanTelemetryDuplicateIntent(findings: OrphanedLogicFinding[]) {
  const catalog = requireFile(findings, "src/lib/telemetry-catalog.ts");
  if (!catalog) return;
  const eventNames = parseTelemetryEventNames(catalog);
  const counts = new Map<string, number>();
  for (const name of eventNames) {
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  for (const [name, count] of counts) {
    if (count <= 1) continue;
    addFinding(findings, {
      severity: "major",
      category: "telemetry_duplicate_intent",
      title: `Telemetry catalog declares duplicate event name: ${name}`,
      filePath: "src/lib/telemetry-catalog.ts",
      line: lineOf(catalog, `eventName: "${name}"`),
      excerpt: excerptOf(catalog, `eventName: "${name}"`),
      suggestedFix: "Keep one catalog row per event name and move alias/coverage metadata into the canonical row.",
      escalation: "Telemetry catalog cleanup affects analytics history and must be reviewed.",
      evidence: [`${name} count=${count}`],
    });
  }

  const duplicateIntentGroups = [
    ["drop_preview_opened", "drop_preview_page_viewed"],
    ["drop_unlock_attempted", "drop_unwrap_attempted"],
    ["wallet_opened", "purchase_modal_opened"],
    ["support_ticket_submitted", "feedback_submitted"],
  ];
  for (const group of duplicateIntentGroups) {
    const present = group.filter((name) => eventNames.includes(name));
    if (present.length <= 1) continue;
    addFinding(findings, {
      severity: "info",
      category: "telemetry_duplicate_intent",
      title: "Potential duplicate telemetry intent group is present",
      filePath: "src/lib/telemetry-catalog.ts",
      line: lineOf(catalog, `eventName: "${present[0]}"`),
      excerpt: excerptOf(catalog, `eventName: "${present[0]}"`),
      suggestedFix: "Keep both only if event-catalog docs define distinct lifecycle moments or audit coverage aliases.",
      escalation: "Do not rename telemetry events automatically; analytics history and validators must be updated together.",
      evidence: present,
    });
  }
}

function parseImportIdentifiers(statement: string) {
  if (/^import\s+type\b/u.test(statement.trim())) return [];
  const identifiers: string[] = [];
  const namespace = statement.match(/\*\s+as\s+([A-Za-z_$][A-Za-z0-9_$]*)/u);
  if (namespace) {
    identifiers.push(namespace[1]);
  }
  const named = statement.match(/\{([^}]+)\}/u);
  if (named) {
    for (const raw of named[1].split(",")) {
      const trimmed = raw.trim().replace(/^type\s+/u, "");
      if (!trimmed) continue;
      const alias = trimmed.match(/\bas\s+([A-Za-z_$][A-Za-z0-9_$]*)$/u);
      const local = alias?.[1] ?? trimmed.split(/\s+/u)[0];
      if (/^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(local)) {
        identifiers.push(local);
      }
    }
  }
  const defaultImport = statement.match(/^import\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*(?:,|\s+from)/u);
  if (defaultImport) {
    identifiers.push(defaultImport[1]);
  }
  return Array.from(new Set(identifiers));
}

function stripImportStatements(source: string) {
  return source.replace(/import[\s\S]*?from\s+["'][^"']+["'];?/gu, "");
}

function scanDeadImports(findings: OrphanedLogicFinding[]) {
  for (const filePath of publicBetaImportSurfaces) {
    const source = readIfExists(filePath);
    if (!source) continue;
    const importStatements = source.match(/import[\s\S]*?from\s+["'][^"']+["'];?/gu) ?? [];
    const body = stripImportStatements(source);
    for (const statement of importStatements) {
      if (statement.includes("server-only")) continue;
      for (const identifier of parseImportIdentifiers(statement)) {
        const usageRegex = new RegExp(`\\b${identifier.replace(/[$]/gu, "\\$")}\\b`, "u");
        if (usageRegex.test(body)) continue;
        addFinding(findings, {
          severity: "minor",
          category: "dead_import",
          title: `Potential dead import in public beta surface: ${identifier}`,
          filePath,
          line: lineOf(source, statement),
          excerpt: statement.replace(/\s+/gu, " ").trim(),
          suggestedFix: "Remove the exact unused import only after TypeScript confirms it is unused.",
          canAutofix: false,
          autofixPlan: "Safe autofix is allowed only for an exact import specifier and a passing TypeScript unused-import confirmation.",
          escalation: "Do not remove imports that may be type-only, dynamic, or side-effectful without TypeScript confirmation.",
          evidence: [identifier],
        });
      }
    }
  }
}

function collectFindings() {
  const findings: OrphanedLogicFinding[] = [];
  const sourceFilePaths = walkFiles("src", new Set([".ts", ".tsx", ".js", ".jsx"]));
  const scriptFilePaths = walkFiles("scripts", new Set([".ts", ".tsx", ".js", ".jsx"]));
  const docFilePaths = [
    ...walkFiles("docs", new Set([".md"])),
    "FULL_SCALE_CODEBASE_AUDIT.md",
    "REPO_MEMORY_LEDGER.md",
    "EVERY_FILE_FUNCTION_CHECKLIST.md",
    "AGENTS.md",
    "README.md",
  ].filter((filePath) => existsSync(join(root, filePath)));

  for (const filePath of requiredFiles) {
    requireFile(findings, filePath);
  }

  const sourceFiles = readSourceFiles(sourceFilePaths);
  const allScanFiles = readSourceFiles([...sourceFilePaths, ...scriptFilePaths, ...docFilePaths]);
  const docFiles = readSourceFiles(docFilePaths);

  scanDuplicateNormalizers(findings, sourceFiles);
  scanLegacyPreviewOwnership(findings);
  scanUseDropsNotes(findings, docFiles);
  scanBrokenDocChunks(findings, docFiles);
  scanRouteMigration(findings, sourceFiles);
  scanStaleDocs(findings, docFiles);
  scanVocabulary(findings, allScanFiles);
  scanRealtimeHotCache(findings, sourceFiles);
  scanTelemetryDuplicateIntent(findings);
  scanDeadImports(findings);

  return {
    findings,
    scannedFileCount: new Set([...sourceFilePaths, ...scriptFilePaths, ...docFilePaths]).size,
  };
}

function statusFor(score: number, criticalCount: number): OrphanedLogicReport["status"] {
  if (criticalCount > 0) return "fail";
  if (score >= 95) return "clean";
  if (score >= 90) return "pass";
  if (score >= 80) return "warning";
  if (score >= 70) return "beta-risk";
  return "fail";
}

function buildReport(): OrphanedLogicReport {
  const { findings, scannedFileCount } = collectFindings();
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
    scannedFileCount,
    checkedFiles: [...requiredFiles, ...publicBetaImportSurfaces],
    rules,
    commandBudget,
    summary: findings.length === 0
      ? "No deterministic orphaned logic or stale-artifact findings were detected."
      : `Detected ${findings.length} orphaned-logic/stale-artifact finding(s); behavior-changing cleanup requires escalation.`,
  };
}

function writeReport(report: OrphanedLogicReport) {
  const fullPath = join(root, REPORT_PATH);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

function printSummary(report: OrphanedLogicReport) {
  console.log(`Orphaned logic score: ${report.score}/100 (${report.status})`);
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
