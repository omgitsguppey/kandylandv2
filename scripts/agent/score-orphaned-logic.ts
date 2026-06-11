import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative, sep } from "node:path";

type OrphanedLogicSeverity = "info" | "minor" | "moderate" | "major" | "critical";
type OrphanedLogicCategory =
  | "duplicate_normalizer"
  | "duplicate_hook"
  | "duplicate_permission_role_resolver"
  | "legacy_preview_ownership"
  | "drops_query_handoff"
  | "use_drops_notes"
  | "duplicate_pr_audit"
  | "route_migration"
  | "stale_docs"
  | "wallet_subcopy_doctrine"
  | "vocabulary"
  | "chat_offset_token"
  | "support_route_expectation"
  | "realtime_hot_cache"
  | "telemetry_duplicate_intent"
  | "duplicate_telemetry_emitter"
  | "route_inline_business_logic"
  | "component_business_truth"
  | "stale_generated_report_consumed"
  | "disconnected_test_validator_doc"
  | "dead_import"
  | "autofix_policy";

type OrphanedLogicRiskClass = "low" | "medium" | "high" | "protected" | "manual_review";

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
  canonicalOwner: string;
  duplicateCandidate: string;
  affectedSurface: string;
  suggestedConsolidationTarget: string;
  validatorToRun: string;
  riskClass: OrphanedLogicRiskClass;
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
  findingCount: number;
  findingsTruncated: boolean;
  findingReportLimit: number;
  criticalCount: number;
  majorCount: number;
  severityCounts: Record<OrphanedLogicSeverity, number>;
  categoryCounts: Partial<Record<OrphanedLogicCategory, number>>;
  riskClassCounts: Record<OrphanedLogicRiskClass, number>;
  scoreImpactTotal: number;
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

type OrphanedLogicFindingInput = Omit<
  OrphanedLogicFinding,
  | "id"
  | "scoreImpact"
  | "canAutofix"
  | "canonicalOwner"
  | "duplicateCandidate"
  | "affectedSurface"
  | "suggestedConsolidationTarget"
  | "validatorToRun"
  | "riskClass"
> & {
  canAutofix?: boolean;
  canonicalOwner?: string;
  duplicateCandidate?: string;
  affectedSurface?: string;
  suggestedConsolidationTarget?: string;
  validatorToRun?: string;
  riskClass?: OrphanedLogicRiskClass;
};

const root = process.cwd();
const REPORT_PATH = "agent/state/orphaned-logic-score.generated.json";
const FINDING_REPORT_LIMIT = 40;

const severityImpact: Record<OrphanedLogicSeverity, number> = {
  info: 0,
  minor: -2,
  moderate: -5,
  major: -10,
  critical: -25,
};

const rules = [
  "duplicate normalizers for same domain",
  "duplicate hooks with same exported owner name",
  "duplicate permission or role resolvers",
  "old DropPreviewModal must not own locked preview after full-page route exists",
  "`/drops?drop=` modal flow still primary",
  "duplicate useDrops optimization notes",
  "duplicate PR audit chunks with broken template text",
  "unused route handlers after route migration",
  "stale docs contradicting current doctrine",
  "old wallet subcopy doctrine",
  "old Coins or wrong GumDrops vocabulary",
  "hardcoded chat offset token",
  "orphaned support route expectations",
  "obsolete realtime logic where hot-cache doctrine applies",
  "duplicate telemetry events with same intent but different names",
  "duplicate telemetry emitters outside a declared catalog/alias owner",
  "route handlers owning business logic inline",
  "components owning business truth instead of canonical hooks/services",
  "stale generated reports imported or consumed by runtime code",
  "moved files with disconnected tests, validators, or docs",
  "dead imports in public beta surfaces",
  "legacy phase-out registry ownership and deadlines",
  "safe autofix plans only for exact unused imports or exact duplicate broken doc chunks after TypeScript confirmation",
];

const commandBudget = {
  allowedCommands: [
    "npm run score:orphans",
    "npm run check:orphaned-logic",
    "npm run score:legacy-phaseout",
    "npm run check:legacy-phaseout",
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
  "src/lib/user-mobile-shell.ts",
  "src/lib/telemetry-catalog.ts",
  "src/lib/drop-normalizers.ts",
  "src/lib/drop-read-models.ts",
  "src/lib/legacy/legacy-registry.ts",
  "docs/agent-truth/support-recovery-flows.md",
  "docs/agent-truth/payment-wallet-unlock-entitlement.md",
  "docs/agent-truth/legacy-phaseout.md",
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

function affectedSurfaceFor(filePath: string) {
  if (filePath.startsWith("src/app/api/")) return "api_route";
  if (filePath.startsWith("src/app/admin/") || filePath.includes("admin")) return "admin_ui_debug";
  if (filePath.startsWith("src/components/")) return "component_ui";
  if (filePath.startsWith("src/hooks/")) return "hook_state";
  if (filePath.includes("telemetry") || filePath.includes("analytics")) return "telemetry_analytics";
  if (filePath.includes("auth") || filePath.includes("permission") || filePath.includes("role")) return "identity_auth_permission";
  if (filePath.includes("wallet") || filePath.includes("payment") || filePath.includes("purchase") || filePath.includes("gumdrop") || filePath.includes("unlock")) return "wallet_payment_unlock";
  if (filePath.startsWith("agent/")) return "agent_generated_evidence";
  if (filePath.startsWith("tests/")) return "test_fixture_validator";
  return "repo_source";
}

function canonicalOwnerFor(category: OrphanedLogicCategory, filePath: string) {
  if (category.includes("telemetry")) return "src/lib/telemetry-catalog.ts";
  if (category === "duplicate_hook") return filePath.startsWith("src/hooks/") ? filePath : "src/hooks/";
  if (category === "duplicate_permission_role_resolver") return "src/lib/identity-truth/";
  if (category === "route_inline_business_logic") return "src/lib/server/";
  if (category === "component_business_truth") return "canonical hook/service owner for the touched feature";
  if (category === "stale_generated_report_consumed") return "agent/state generated artifact owner; runtime code must not consume generated reports";
  if (category === "disconnected_test_validator_doc") return "current moved source path or package script owner";
  if (category === "realtime_hot_cache") return "src/lib/server/admin-analytics-data.ts";
  if (category === "legacy_preview_ownership" || category === "drops_query_handoff") return "src/app/drops/[id]/preview/page.tsx";
  return filePath;
}

function validatorFor(category: OrphanedLogicCategory, filePath: string) {
  if (category.includes("telemetry")) return "npm run check:telemetry-dependency-graph";
  if (category === "duplicate_permission_role_resolver") return "npm run check:role-permission-parity";
  if (category === "route_inline_business_logic") return `npm run agent:verify -- --paths=${filePath}`;
  if (category === "component_business_truth" || category === "duplicate_hook") return "npm run check:frontend-component-consolidation";
  if (category === "stale_generated_report_consumed") return "npm run check:generated-report-authority";
  if (category === "disconnected_test_validator_doc") return "npm run check:orphaned-logic";
  return "npm run check:orphaned-logic";
}

function riskClassFor(severity: OrphanedLogicSeverity, filePath: string): OrphanedLogicRiskClass {
  if (/paypal|payment|purchase|wallet|gumdrop|unlock|entitlement|auth|permission|middleware|rules/iu.test(filePath)) return "protected";
  if (severity === "critical" || severity === "major") return "high";
  if (severity === "moderate") return "medium";
  return "low";
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
  input: OrphanedLogicFindingInput,
) {
  const canonicalOwner = input.canonicalOwner ?? canonicalOwnerFor(input.category, input.filePath);
  findings.push({
    ...input,
    id: `orphaned-logic-${stableHash(`${input.category}:${input.title}:${input.filePath}:${input.line ?? ""}`)}`,
    scoreImpact: severityImpact[input.severity],
    canonicalOwner,
    duplicateCandidate: input.duplicateCandidate ?? "none",
    affectedSurface: input.affectedSurface ?? affectedSurfaceFor(input.filePath),
    suggestedConsolidationTarget: input.suggestedConsolidationTarget ?? canonicalOwner,
    validatorToRun: input.validatorToRun ?? validatorFor(input.category, input.filePath),
    riskClass: input.riskClass ?? riskClassFor(input.severity, input.filePath),
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

function scanDropsQueryHandoff(findings: OrphanedLogicFinding[], sourceFiles: SourceFile[]) {
  const fullPagePreviewExists = existsSync(join(root, "src/app/drops/[id]/preview/page.tsx"));
  if (!fullPagePreviewExists) return;

  const queryFlowNeedles = [
    "\"/drops?drop=",
    "'/drops?drop=",
    "`/drops?drop=",
    "searchParams.get(\"drop\")",
    "searchParams.get('drop')",
  ];

  for (const file of sourceFiles) {
    const isDropsSurface =
      file.path === "src/app/drops/DropsClient.tsx" ||
      file.path === "src/app/drops/page.tsx" ||
      file.path.startsWith("src/components/Drop") ||
      file.path.startsWith("src/components/Drops/") ||
      file.path === "src/components/FeaturedCarousel.tsx";
    if (!isDropsSurface) continue;

    const matchedNeedle = queryFlowNeedles.find((needle) => file.source.includes(needle));
    if (!matchedNeedle) continue;

    const isDocumentedHandoff =
      file.source.includes("/preview?source_component=") ||
      file.source.includes("redirect(") ||
      file.source.includes("router.replace(");
    const stillModalPrimary =
      file.source.includes("DropPreviewModal") ||
      file.source.includes("setSelectedDrop") ||
      file.source.includes("selectedDrop");

    if (!isDocumentedHandoff || stillModalPrimary) {
      addFinding(findings, {
        severity: "major",
        category: "drops_query_handoff",
        title: "`/drops?drop=` still appears to own a modal-first locked preview flow",
        filePath: file.path,
        line: lineOf(file.source, matchedNeedle),
        excerpt: excerptOf(file.source, matchedNeedle),
        suggestedFix: "Keep `/drops?drop=<id>` as redirect/handoff only and route canonical locked preview actions to /drops/[id]/preview.",
        escalation: "Preview route ownership affects conversion, deep links, and locked-content safety; do not auto-rewrite it.",
        evidence: [matchedNeedle, "Full-page preview route exists."],
      });
    }
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

function scanWalletSubcopyDoctrine(findings: OrphanedLogicFinding[], docFiles: SourceFile[]) {
  const staleWalletPatterns = [
    "Purchase UI must separate paid GumDrops from bonus GumDrops",
    "Package rows show total GumDrops, USD price, paid GumDrops, and bonus GumDrops",
    "Wallet package copy separates paid and bonus GumDrops",
    "success state repeats credited GumDrops, paid GumDrops, bonus GumDrops",
    "500 paid + 500 bonus GumDrops",
  ];

  for (const file of docFiles) {
    const matchingLines = file.source
      .split(/\r?\n/u)
      .filter((line) => staleWalletPatterns.some((pattern) => line.includes(pattern)));

    if (matchingLines.length === 0) continue;

    addFinding(findings, {
      severity: "moderate",
      category: "wallet_subcopy_doctrine",
      title: "Doc still describes old visible wallet paid/bonus subcopy",
      filePath: file.path,
      line: lineOf(file.source, matchingLines[0]),
      excerpt: matchingLines[0].trim(),
      suggestedFix: "Update wallet copy doctrine to compact rows: delivered total, package label, price, purple bonus chip, and source-aware free/paid balance chip.",
      escalation: "Wallet copy changes require doctrine review and must not alter source-of-funds accounting or package math.",
      evidence: matchingLines.map((line) => line.trim()),
    });
  }
}

function scanChatOffsetToken(findings: OrphanedLogicFinding[]) {
  const filePath = "src/lib/user-mobile-shell.ts";
  const source = requireFile(findings, filePath);
  if (!source) return;

  const hardcodedZeroPatterns = [
    "CHAT_LIST_FLOATING_ACTION_BOTTOM_OFFSET = \"0px\"",
    "CHAT_LIST_FLOATING_ACTION_BOTTOM_OFFSET = '0px'",
    "CHAT_LIST_FLOATING_ACTION_BOTTOM_OFFSET = `0px`",
  ];
  const matched = hardcodedZeroPatterns.find((pattern) => source.includes(pattern));
  if (!matched) return;

  addFinding(findings, {
    severity: "major",
    category: "chat_offset_token",
    title: "Chat floating action bottom offset is hardcoded to 0px",
    filePath,
    line: lineOf(source, matched),
    excerpt: excerptOf(source, matched),
    suggestedFix: "Point CHAT_LIST_FLOATING_ACTION_BOTTOM_OFFSET at the shared bottom-nav-safe chat token.",
    escalation: "Chat shell spacing affects keyboard/browser/PWA behavior; only exact token replacements are safe.",
    evidence: [matched],
  });
}

function scanSupportRouteExpectations(findings: OrphanedLogicFinding[], files: SourceFile[]) {
  const stalePatterns = [
    "flat support_messages collection",
    "top-level support_messages collection",
    "admin support dashboard reads Firestore directly",
    "admin support UI reads Firestore directly",
    "support route returns only flat messages",
  ];

  for (const file of files) {
    if (
      file.path === "scripts/agent/score-orphaned-logic.ts" ||
      file.path === "scripts/agent/validate-orphaned-logic.ts" ||
      file.path === "src/lib/legacy/legacy-registry.ts" ||
      file.path === "docs/agent-truth/orphaned-logic-score.md"
    ) {
      continue;
    }

    const lowerSource = file.source.toLowerCase();
    const matchedPattern = stalePatterns.find((pattern) => lowerSource.includes(pattern));
    const matchingLine = matchedPattern
      ? file.source.split(/\r?\n/u).find((line) => line.toLowerCase().includes(matchedPattern))
      : "";
    const matchedLineIsCurrentDoctrine = matchingLine
      ? /nested|not direct|must not|do not|forbidden|detect|validator|scorer/iu.test(matchingLine)
      : false;
    const flatCollectionPattern = file.path.startsWith("src/") && /collection\([^)]*["'`]support_messages["'`]/u.test(file.source);

    if ((!matchedPattern || matchedLineIsCurrentDoctrine) && !flatCollectionPattern) continue;

    const evidence = matchedPattern ?? "flat support_messages collection access";
    addFinding(findings, {
      severity: "major",
      category: "support_route_expectation",
      title: "Support surface appears to expect an orphaned flat/direct-message model",
      filePath: file.path,
      line: lineOf(lowerSource, evidence.toLowerCase()) ?? lineOf(file.source, "support_messages"),
      excerpt: excerptOf(file.source, evidence) ?? excerptOf(file.source, "support_messages"),
      suggestedFix: "Use the unified inbox model: admin routes list/read/reply to all threads and nested support_messages; user routes stay owner-scoped.",
      escalation: "Support permissions and privacy boundaries must be reviewed before changing route or Firestore access.",
      evidence: [evidence],
    });
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
    "scripts/agent/score-codebase-hardening.ts",
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

function scanDuplicateHooks(findings: OrphanedLogicFinding[], sourceFiles: SourceFile[]) {
  const hookExports = new Map<string, Array<{ filePath: string; line?: number; excerpt?: string }>>();
  const hookRegex = /export\s+(?:function|const)\s+(use[A-Z][A-Za-z0-9_]*)/gu;

  for (const file of sourceFiles.filter((entry) => entry.path.startsWith("src/"))) {
    let match: RegExpExecArray | null;
    while ((match = hookRegex.exec(file.source)) !== null) {
      const entries = hookExports.get(match[1]) ?? [];
      entries.push({ filePath: file.path, line: lineOf(file.source, match[0]), excerpt: excerptOf(file.source, match[0]) });
      hookExports.set(match[1], entries);
    }
  }

  for (const [hookName, entries] of hookExports) {
    const uniqueFiles = Array.from(new Set(entries.map((entry) => entry.filePath)));
    if (uniqueFiles.length <= 1) continue;
    const first = entries[0];
    addFinding(findings, {
      severity: "moderate",
      category: "duplicate_hook",
      title: `Duplicate exported hook name: ${hookName}`,
      filePath: first.filePath,
      line: first.line,
      excerpt: first.excerpt,
      duplicateCandidate: hookName,
      suggestedFix: "Pick the canonical hook owner and convert other hook exports into feature-local adapters only if still needed.",
      suggestedConsolidationTarget: uniqueFiles.find((filePath) => filePath.startsWith("src/hooks/")) ?? "src/hooks/",
      escalation: "Hook consolidation can affect hydration/state ownership; do not merge without targeted component tests.",
      evidence: uniqueFiles,
    });
  }
}

function scanDuplicatePermissionRoleResolvers(findings: OrphanedLogicFinding[], sourceFiles: SourceFile[]) {
  const resolverRegex = /export\s+(?:function|const)\s+((?:resolve|derive|can|is|has)[A-Za-z0-9_]*(?:Role|Permission|Access|Admin|Creator|Owner|Entitlement)[A-Za-z0-9_]*)/gu;
  const resolvers = new Map<string, Array<{ filePath: string; line?: number; excerpt?: string }>>();

  for (const file of sourceFiles) {
    if (!/(auth|identity|permission|role|creator|admin|entitlement|wallet|unlock)/iu.test(file.path + file.source.slice(0, 5000))) continue;
    let match: RegExpExecArray | null;
    while ((match = resolverRegex.exec(file.source)) !== null) {
      const entries = resolvers.get(match[1]) ?? [];
      entries.push({ filePath: file.path, line: lineOf(file.source, match[0]), excerpt: excerptOf(file.source, match[0]) });
      resolvers.set(match[1], entries);
    }
  }

  for (const [resolverName, entries] of resolvers) {
    const uniqueFiles = Array.from(new Set(entries.map((entry) => entry.filePath)));
    if (uniqueFiles.length <= 1) continue;
    const first = entries[0];
    addFinding(findings, {
      severity: "major",
      category: "duplicate_permission_role_resolver",
      title: `Duplicate permission/role resolver export: ${resolverName}`,
      filePath: first.filePath,
      line: first.line,
      excerpt: first.excerpt,
      duplicateCandidate: resolverName,
      suggestedFix: "Route role/permission truth through the canonical auth/identity/server owner and keep UI helpers as readers only.",
      suggestedConsolidationTarget: uniqueFiles.find((filePath) => filePath.startsWith("src/lib/identity-truth/") || filePath.startsWith("src/lib/server/")) ?? "src/lib/identity-truth/",
      escalation: "Protected auth/permission behavior must not be consolidated without targeted 4xx and permission tests.",
      evidence: uniqueFiles,
    });
  }
}

function scanDuplicateTelemetryEmitters(findings: OrphanedLogicFinding[], sourceFiles: SourceFile[]) {
  const emitters = new Map<string, Set<string>>();
  const eventPatterns = [
    /\btrackEvent\s*\(\s*["']([^"']+)["']/gu,
    /\beventName\s*:\s*["']([^"']+)["']/gu,
    /\b(?:sendTelemetryEvent|recordTelemetryEvent|trackTelemetry)\s*\(\s*["']([^"']+)["']/gu,
  ];

  for (const file of sourceFiles) {
    if (file.path === "src/lib/telemetry-catalog.ts" || file.path.includes("telemetry-intent-aliases")) continue;
    for (const pattern of eventPatterns) {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(file.source)) !== null) {
        if (!/^[a-z][a-z0-9_:-]+$/u.test(match[1])) continue;
        const files = emitters.get(match[1]) ?? new Set<string>();
        files.add(file.path);
        emitters.set(match[1], files);
      }
    }
  }

  for (const [eventName, files] of Array.from(emitters.entries()).sort((left, right) => right[1].size - left[1].size).slice(0, 25)) {
    if (files.size <= 3) continue;
    const evidence = Array.from(files).sort();
    addFinding(findings, {
      severity: "info",
      category: "duplicate_telemetry_emitter",
      title: `Telemetry event is emitted from many source files: ${eventName}`,
      filePath: evidence[0],
      duplicateCandidate: eventName,
      suggestedFix: "Confirm whether the repeated emitters share one canonical helper, alias group, or lifecycle owner before adding another callsite.",
      suggestedConsolidationTarget: "src/lib/telemetry-catalog.ts + src/lib/analytics/telemetry-intent-aliases.ts",
      escalation: "Repeated emitters can be legitimate lifecycle coverage; classify before consolidation.",
      evidence,
    });
  }
}

function scanInlineBusinessLogic(findings: OrphanedLogicFinding[], sourceFiles: SourceFile[]) {
  const businessNeedles = [
    "runTransaction(",
    "FieldValue.increment",
    "gumDropsPurchasedBalance",
    "entitlement",
    "identityLink",
    "materializer",
    "analytics_event_facts",
    "admin.firestore()",
  ];

  for (const file of sourceFiles) {
    const matchedNeedles = businessNeedles.filter((needle) => file.source.includes(needle));
    if (matchedNeedles.length === 0) continue;
    const lineCount = file.source.split(/\r?\n/u).length;
    if (file.path.endsWith("/route.ts") && (matchedNeedles.length >= 2 || lineCount > 220)) {
      addFinding(findings, {
        severity: /paypal|payment|wallet|unlock|entitlement|auth/iu.test(file.path + file.source) ? "major" : "moderate",
        category: "route_inline_business_logic",
        title: "Route handler appears to own business logic inline",
        filePath: file.path,
        line: lineOf(file.source, matchedNeedles[0]),
        excerpt: excerptOf(file.source, matchedNeedles[0]),
        duplicateCandidate: matchedNeedles.join(", "),
        suggestedFix: "Extract or route business math/persistence through the canonical server service owner during a targeted slice.",
        suggestedConsolidationTarget: "src/lib/server/",
        escalation: "Route thinning can affect auth, cost, telemetry, and failure codes; do not perform broad rewrites.",
        evidence: matchedNeedles,
      });
    }

    const isComponent = file.path.endsWith(".tsx") && (file.path.startsWith("src/components/") || file.path.startsWith("src/app/"));
    if (isComponent && matchedNeedles.length >= 2) {
      addFinding(findings, {
        severity: "moderate",
        category: "component_business_truth",
        title: "Component appears to own business truth instead of rendering canonical state",
        filePath: file.path,
        line: lineOf(file.source, matchedNeedles[0]),
        excerpt: excerptOf(file.source, matchedNeedles[0]),
        duplicateCandidate: matchedNeedles.join(", "),
        suggestedFix: "Move truth decisions to canonical hooks/services and keep the component as a renderer in a narrow follow-up.",
        escalation: "UI refactors require surface doctrine and targeted component tests.",
        evidence: matchedNeedles,
      });
    }
  }
}

function scanGeneratedReportConsumption(findings: OrphanedLogicFinding[], sourceFiles: SourceFile[]) {
  const runtimeFiles = sourceFiles.filter((file) => file.path.startsWith("src/") || file.path.startsWith("functions/src/"));
  for (const file of runtimeFiles) {
    const match = /["'](?:\.\.\/)*agent\/(?:state|index|context)\/[^"']+(?:\.generated)?\.json["']/u.exec(file.source)
      ?? /readJson(?:File)?\([^)]*agent\/(?:state|index|context)\//u.exec(file.source);
    if (!match) continue;
    addFinding(findings, {
      severity: file.path.startsWith("src/app/api/") || file.path.startsWith("functions/src/") ? "major" : "moderate",
      category: "stale_generated_report_consumed",
      title: "Runtime source appears to consume generated agent evidence",
      filePath: file.path,
      line: lineOf(file.source, match[0]),
      excerpt: excerptOf(file.source, match[0]),
      duplicateCandidate: match[0],
      suggestedFix: "Remove runtime dependency on generated agent snapshots; use verified runtime source/config instead.",
      suggestedConsolidationTarget: "runtime source truth, not agent/state generated evidence",
      escalation: "Generated reports are snapshots only and must not become app business truth.",
      riskClass: "manual_review",
      evidence: [match[0]],
    });
  }
}

function scanDisconnectedMovedReferences(findings: OrphanedLogicFinding[], files: SourceFile[]) {
  const repoPathRegex = /["'`]((?:src|functions\/src|shared|scripts\/agent|tests|docs)\/[^"'`\s)]+\.(?:ts|tsx|js|jsx|md))["'`]/gu;

  for (const file of files) {
    if (!(file.path.startsWith("tests/") || file.path.startsWith("scripts/agent/") || file.path.startsWith("docs/"))) continue;
    let match: RegExpExecArray | null;
    while ((match = repoPathRegex.exec(file.source)) !== null) {
      const rawPath = match[1].replace(/\\/g, "/");
      if (/[*${}#]/u.test(rawPath)) continue;
      const candidates = [
        rawPath,
        `${rawPath}/index.ts`,
        `${rawPath}/index.tsx`,
      ];
      if (candidates.some((candidate) => existsSync(join(root, candidate)))) continue;
      if (/node_modules|\.next|generated\.json/u.test(rawPath)) continue;
      addFinding(findings, {
        severity: file.path.startsWith("tests/") || file.path.startsWith("docs/") ? "minor" : "moderate",
        category: "disconnected_test_validator_doc",
        title: "Reference points at a missing or moved repo path",
        filePath: file.path,
        line: lineOf(file.source, match[0]),
        excerpt: excerptOf(file.source, match[0]),
        duplicateCandidate: rawPath,
        suggestedFix: "Update the reference only after confirming the target was moved, renamed, or intentionally retired.",
        suggestedConsolidationTarget: "current canonical moved path",
        escalation: "Missing references in tests/docs can disconnect validators from real owners after consolidation.",
        evidence: [rawPath],
      });
      break;
    }
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
  scanDropsQueryHandoff(findings, sourceFiles);
  scanUseDropsNotes(findings, docFiles);
  scanBrokenDocChunks(findings, docFiles);
  scanRouteMigration(findings, sourceFiles);
  scanStaleDocs(findings, docFiles);
  scanWalletSubcopyDoctrine(findings, docFiles);
  scanVocabulary(findings, allScanFiles);
  scanChatOffsetToken(findings);
  scanSupportRouteExpectations(findings, allScanFiles);
  scanRealtimeHotCache(findings, sourceFiles);
  scanTelemetryDuplicateIntent(findings);
  scanDuplicateHooks(findings, sourceFiles);
  scanDuplicatePermissionRoleResolvers(findings, sourceFiles);
  scanDuplicateTelemetryEmitters(findings, sourceFiles);
  scanInlineBusinessLogic(findings, sourceFiles);
  scanGeneratedReportConsumption(findings, sourceFiles);
  scanDisconnectedMovedReferences(findings, allScanFiles);
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

const severityRank: Record<OrphanedLogicSeverity, number> = {
  critical: 0,
  major: 1,
  moderate: 2,
  minor: 3,
  info: 4,
};

function countBy<T extends string>(values: readonly T[]) {
  return values.reduce<Partial<Record<T, number>>>((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function completeCounts<T extends string>(keys: readonly T[], values: readonly T[]) {
  const partial = countBy(values);
  return keys.reduce<Record<T, number>>((counts, key) => {
    counts[key] = partial[key] ?? 0;
    return counts;
  }, {} as Record<T, number>);
}

function compactFindingForReport(finding: OrphanedLogicFinding): OrphanedLogicFinding {
  return {
    ...finding,
    evidence: finding.evidence.slice(0, 12),
  };
}

function buildReport(): OrphanedLogicReport {
  const { findings, scannedFileCount } = collectFindings();
  const criticalCount = findings.filter((finding) => finding.severity === "critical").length;
  const majorCount = findings.filter((finding) => finding.severity === "major").length;
  const scoreImpactTotal = findings.reduce((sum, finding) => sum + finding.scoreImpact, 0);
  const score = Math.max(0, Math.min(100, 100 + scoreImpactTotal));
  const reportFindings = [...findings]
    .sort((left, right) =>
      severityRank[left.severity] - severityRank[right.severity]
      || left.riskClass.localeCompare(right.riskClass)
      || left.category.localeCompare(right.category)
      || left.filePath.localeCompare(right.filePath)
      || left.id.localeCompare(right.id),
    )
    .slice(0, FINDING_REPORT_LIMIT)
    .map(compactFindingForReport);

  return {
    score,
    status: statusFor(score, criticalCount),
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    findings: reportFindings,
    findingCount: findings.length,
    findingsTruncated: findings.length > reportFindings.length,
    findingReportLimit: FINDING_REPORT_LIMIT,
    criticalCount,
    majorCount,
    severityCounts: completeCounts(["critical", "major", "moderate", "minor", "info"], findings.map((finding) => finding.severity)),
    categoryCounts: countBy(findings.map((finding) => finding.category)),
    riskClassCounts: completeCounts(["low", "medium", "high", "protected", "manual_review"], findings.map((finding) => finding.riskClass)),
    scoreImpactTotal,
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
  console.log(`Findings: ${report.findingCount} total (${report.findings.length} shown), ${report.criticalCount} critical, ${report.majorCount} major`);
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
