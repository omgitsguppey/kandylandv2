import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";
import { pathToFileURL } from "node:url";

import {
  CODE_ORGANIZATION_AGENT_TRUTH_DOC_PATH,
  CODE_ORGANIZATION_CONTEXT_INDEX_PATH,
  CODE_ORGANIZATION_DOCTRINE_DOC_PATH,
  CODE_ORGANIZATION_DOCTRINE_NOTE,
  CODE_ORGANIZATION_FEATURES,
  CODE_ORGANIZATION_FEATURE_CHILDREN,
  CODE_ORGANIZATION_FILE_SIZE_BUDGETS,
  CODE_ORGANIZATION_FORBIDDEN_COMMANDS,
  CODE_ORGANIZATION_HIERARCHY,
  CODE_ORGANIZATION_MINIMAL_COMMANDS,
  CODE_ORGANIZATION_REPORT_PATH,
  CODE_ORGANIZATION_ROUTE_GROUPS,
  CODE_ORGANIZATION_SCORE_BUCKETS,
  CODE_ORGANIZATION_SEVERITY_PENALTIES,
  CODE_ORGANIZATION_TRUTH_LAYER_ORDER,
  CODE_ORGANIZATION_VAGUE_FILE_NAMES,
  CODE_ORGANIZATION_VAGUE_NAME_ALLOWLIST,
  buildCodeOrganizationFinding,
  getCodeOrganizationSeverityRank,
  getCodeOrganizationStatus,
  normalizeCodeOrganizationPath,
  type CodeOrganizationBucket,
  type CodeOrganizationDuplicateFormula,
  type CodeOrganizationFeature,
  type CodeOrganizationFeatureOwnership,
  type CodeOrganizationFileEntry,
  type CodeOrganizationFinding,
  type CodeOrganizationFindingInput,
  type CodeOrganizationMigrationTarget,
  type CodeOrganizationReport,
  type CodeOrganizationRouteResponsibility,
  type CodeOrganizationSeverity,
} from "../../src/lib/code-organization/code-organization-contract";
import { LEGACY_REGISTRY, isAllowedLegacyReference } from "../../src/lib/legacy/legacy-registry";

type SourceFile = {
  filePath: string;
  source: string;
  lines: number;
  classification: string;
};

type FeatureRule = {
  targetPath: string;
  pathPatterns: RegExp[];
  contentPatterns: RegExp[];
  migrationReason: string;
  guardrails: string[];
};

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const SKIP_DIRECTORIES = new Set([
  ".git",
  ".next",
  ".turbo",
  "node_modules",
  "out",
  "coverage",
  "dist",
  "build",
  "playwright-report",
  "test-results",
  "lighthouse-results",
]);

const FEATURE_RULES: Record<CodeOrganizationFeature, FeatureRule> = {
  wallet: {
    targetPath: "src/features/wallet",
    pathPatterns: [/wallet/u, /paypal/u, /purchase/u, /gumdrop/u, /fan-pass/u, /booking/u],
    contentPatterns: [/PayPal|PurchaseModal|gumDropsPurchasedBalance|gumdrop|transaction_id|sourceTruth/u],
    migrationReason: "Wallet, PayPal, GumDrop ledger, and paid-source truth should have one feature owner.",
    guardrails: ["Server purchase facts stay in server modules.", "Client begin_checkout remains funnel context only."],
  },
  drops: {
    targetPath: "src/features/drops",
    pathPatterns: [/\/drops\//u, /DropCard/u, /LockedDrop/u, /FeaturedCarousel/u, /useDrops/u],
    contentPatterns: [/dropId|drop_unlocked|entitlement|DropCard|LockedDrop/u],
    migrationReason: "Drop discovery, preview, unlock, and entitlement UI need one migration lane.",
    guardrails: ["Locked content URLs stay out of pre-unlock UI.", "Unlock metrics come from server entitlement truth."],
  },
  viewer: {
    targetPath: "src/features/viewer",
    pathPatterns: [/viewer/u, /MediaViewer/u, /WatchSession/u],
    contentPatterns: [/viewerSessionId|file_viewed|watch_session|mediaIndex/u],
    migrationReason: "Viewer file continuity and watch sessions should colocate under viewer ownership.",
    guardrails: ["Telemetry must not include internal content URLs.", "File views connect to watch-session facts."],
  },
  "creator-profile": {
    targetPath: "src/features/creator-profile",
    pathPatterns: [/creators\/\[username\]/u, /CreatorProfile/u, /creator-profile/u],
    contentPatterns: [/creator profile|creatorId|targetCreatorId/u],
    migrationReason: "Public creator profile projection should be separate from creator dashboard operations.",
    guardrails: ["Fan actions target creators without becoming creator behavior."],
  },
  "creator-dashboard": {
    targetPath: "src/features/creator-dashboard",
    pathPatterns: [/creator-dashboard/u, /CreatorWorkspace/u, /api\/creator/u, /creator\/bookings/u, /creator\/subscriptions/u],
    contentPatterns: [/CreatorWorkspace|booking|Fan Pass|creator experience/u],
    migrationReason: "Creator operations and paid experience server truth need a dedicated feature owner.",
    guardrails: ["Paid-source spend rules stay server-truth first.", "Expected booking failures use typed safe errors."],
  },
  chat: {
    targetPath: "src/features/chat",
    pathPatterns: [/\/Chat\//u, /chat/u, /useChat/u],
    contentPatterns: [/ChatExperience|message thread|composer/u],
    migrationReason: "Chat shell, viewport, and message-state logic should not sprawl across shared primitives.",
    guardrails: ["Chat owns its stable viewport shell.", "Diagnostics cannot block input focus paths."],
  },
  support: {
    targetPath: "src/features/support",
    pathPatterns: [/Support/u, /Feedback/u, /support/u, /bug-report/u],
    contentPatterns: [/support_ticket_created|bug_report_submitted|threadId|debug evidence/u],
    migrationReason: "Support and bug-report user facts need one user/admin split owner.",
    guardrails: ["Admin support actions stay excluded from user behavior.", "Permission errors feed debug evidence."],
  },
  moderation: {
    targetPath: "src/features/moderation",
    pathPatterns: [/Moderation/u, /moderation/u, /theft/u, /scrape/u],
    contentPatterns: [/theft-risk|scrapeRisk|screenshot|moderation/u],
    migrationReason: "Moderation evidence, score, and admin display must stay evidence-weighted.",
    guardrails: ["Browser screenshot heuristics cannot be confirmed facts.", "Weak signals stay contextual."],
  },
  notifications: {
    targetPath: "src/features/notifications",
    pathPatterns: [/Notifications/u, /Notification/u, /useNotifications/u],
    contentPatterns: [/notification_read|notification_opened|mark.*read/u],
    migrationReason: "Notification read truth and UI diagnostics should not fragment across hooks/components.",
    guardrails: ["notification_read is the behavioral fact.", "Opened/clicked events are diagnostics unless promoted."],
  },
  "admin-users": {
    targetPath: "src/features/admin-users",
    pathPatterns: [/admin\/users/u, /admin-user/u, /user-metrics/u],
    contentPatterns: [/AdminUsers|userEngagement|userValue|behavior rollup/u],
    migrationReason: "Admin user metrics need one hot-cache and source-state owner.",
    guardrails: ["Admin/projection facts never contaminate user metrics.", "Cards expose live/cached/stale/error state."],
  },
  analytics: {
    targetPath: "src/features/analytics",
    pathPatterns: [/analytics/u, /telemetry/u, /event-fact/u, /tracking/u],
    contentPatterns: [/actorUserId|targetCreatorId|event_fact|telemetry|analytics/u],
    migrationReason: "Analytics contracts, ingestion, normalization, and admin projections need one ownership map.",
    guardrails: ["Actor and target ids remain separate.", "Client-only events cannot anchor revenue or unlock metrics."],
  },
  recommendations: {
    targetPath: "src/features/recommendations",
    pathPatterns: [/recommendation/u, /behavioral/u, /ranker/u],
    contentPatterns: [/recommendation|behavioral intelligence|deterministic ranker|rankScore/u],
    migrationReason: "Behavioral inputs and recommendation scoring should be separated from UI panels.",
    guardrails: ["Deterministic ranking remains baseline.", "ML promotion needs validator-backed evidence."],
  },
};

function readIfExists(root: string, filePath: string) {
  const fullPath = join(root, normalizeCodeOrganizationPath(filePath));
  if (!existsSync(fullPath)) return "";
  return readFileSync(fullPath, "utf8");
}

function lineCount(source: string) {
  return source.length === 0 ? 0 : source.split(/\r?\n/u).length;
}

function walkFiles(root: string, startPath: string): string[] {
  const fullStartPath = join(root, startPath);
  if (!existsSync(fullStartPath)) return [];
  const results: string[] = [];

  for (const entry of readdirSync(fullStartPath)) {
    if (SKIP_DIRECTORIES.has(entry)) continue;
    const fullPath = join(fullStartPath, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...walkFiles(root, join(startPath, entry)));
      continue;
    }
    results.push(normalizeCodeOrganizationPath(join(startPath, entry)));
  }

  return results.sort();
}

function readSourceFiles(root: string, files: string[]): SourceFile[] {
  return files
    .filter((filePath) => SOURCE_EXTENSIONS.has(extname(filePath)))
    .filter((filePath) => /^(src|functions\/src|scripts\/agent)\//u.test(filePath))
    .map((filePath) => {
      const source = readIfExists(root, filePath);
      return {
        filePath,
        source,
        lines: lineCount(source),
        classification: classifySourceFile(filePath),
      };
    });
}

function classifySourceFile(filePath: string) {
  if (/^src\/app\/.*\/route\.(?:ts|tsx|js|jsx)$/u.test(filePath)) return "routeHandler";
  if (/^scripts\/agent\/(?:score|validate|check|run|repair)-/u.test(filePath)) return "validator";
  if (filePath.startsWith("src/lib/server/") || filePath.startsWith("functions/src/")) return "serverHelper";
  if (filePath.endsWith(".tsx") && (filePath.startsWith("src/components/") || filePath.startsWith("src/app/"))) return "component";
  return "source";
}

function severityForSizedFile(entry: { filePath: string; lines: number; classification: string }): CodeOrganizationSeverity {
  if (SOURCE_EXTENSIONS.has(extname(entry.filePath)) && entry.lines > CODE_ORGANIZATION_FILE_SIZE_BUDGETS.critical.sourceFile) {
    return "critical";
  }

  if (entry.classification === "component") {
    if (entry.lines > CODE_ORGANIZATION_FILE_SIZE_BUDGETS.reviewRequired.component) return "review_required";
    if (entry.lines > CODE_ORGANIZATION_FILE_SIZE_BUDGETS.warning.component) return "warning";
  }
  if (entry.classification === "routeHandler") {
    if (entry.lines > CODE_ORGANIZATION_FILE_SIZE_BUDGETS.reviewRequired.routeHandler) return "review_required";
    if (entry.lines > CODE_ORGANIZATION_FILE_SIZE_BUDGETS.warning.routeHandler) return "warning";
  }
  if (entry.classification === "serverHelper") {
    if (entry.lines > CODE_ORGANIZATION_FILE_SIZE_BUDGETS.reviewRequired.serverHelper) return "review_required";
    if (entry.lines > CODE_ORGANIZATION_FILE_SIZE_BUDGETS.warning.serverHelper) return "warning";
  }
  if (entry.classification === "validator") {
    if (entry.lines > CODE_ORGANIZATION_FILE_SIZE_BUDGETS.reviewRequired.validator) return "review_required";
    if (entry.lines > CODE_ORGANIZATION_FILE_SIZE_BUDGETS.warning.validator) return "warning";
  }
  return "info";
}

function severityForMarkdown(lines: number): CodeOrganizationSeverity {
  if (lines > CODE_ORGANIZATION_FILE_SIZE_BUDGETS.reviewRequired.markdown) return "review_required";
  if (lines > CODE_ORGANIZATION_FILE_SIZE_BUDGETS.warning.markdown) return "warning";
  return "info";
}

function severityForGeneratedJson(filePath: string, lines: number): CodeOrganizationSeverity {
  if (filePath.endsWith(".jsonl") || filePath.includes("/shards/") || filePath.includes(".shard.")) return "info";
  if (lines > CODE_ORGANIZATION_FILE_SIZE_BUDGETS.critical.generatedJson) return "critical";
  if (lines > CODE_ORGANIZATION_FILE_SIZE_BUDGETS.reviewRequired.generatedJson) return "review_required";
  if (lines > CODE_ORGANIZATION_FILE_SIZE_BUDGETS.warning.generatedJson) return "warning";
  return "info";
}

function toFileEntry(filePath: string, lines: number, classification: string, severity: CodeOrganizationSeverity): CodeOrganizationFileEntry {
  return { filePath, lines, classification, severity };
}

function lineOf(source: string, needle: RegExp | string) {
  const index = typeof needle === "string" ? source.indexOf(needle) : source.search(needle);
  if (index < 0) return undefined;
  return source.slice(0, index).split(/\r?\n/u).length;
}

function pushFinding(findings: CodeOrganizationFindingInput[], finding: CodeOrganizationFindingInput) {
  findings.push(finding);
}

function getFeatureMatches(filePath: string, source: string) {
  const sample = `${filePath}\n${source.slice(0, 6000)}`;
  return CODE_ORGANIZATION_FEATURES.filter((feature) => {
    const rule = FEATURE_RULES[feature];
    return rule.pathPatterns.some((pattern) => pattern.test(filePath))
      || rule.contentPatterns.some((pattern) => pattern.test(sample));
  });
}

function detectResponsibilities(source: string) {
  const checks: Array<[string, RegExp]> = [
    ["auth", /guardApiRequest|requireAdmin|verifyIdToken|getServerSession|Authorization|currentUser/u],
    ["validation", /z\.object|safeParse|request\.json|searchParams|validate|schema/u],
    ["firestore", /adminDb|db\.collection|collection\(|doc\(|getDocs|setDoc|updateDoc|runTransaction|writeBatch/u],
    ["scoring", /score|weight|rank|rollup|formula|Math\.(?:round|floor|max|min)|\*\s*\d|\+\s*\d/u],
    ["formatting", /NextResponse\.json|Response\.json|return\s+new\s+Response|map\(|format/u],
    ["telemetry", /track|telemetry|analytics|event_fact|debug evidence|reportDebug/u],
    ["external", /fetch\(|paypal|PayPal|Vertex|Google|Storage|sendEmail/u],
    ["cache", /cache|no-store|revalidate|hotCache|unstable_cache/u],
  ];
  return checks.filter(([, pattern]) => pattern.test(source)).map(([name]) => name);
}

function scanFileSizes(sourceFiles: SourceFile[], allFiles: string[], root: string, findings: CodeOrganizationFindingInput[]) {
  const largestSourceFiles = sourceFiles
    .map((file) => toFileEntry(file.filePath, file.lines, file.classification, severityForSizedFile(file)))
    .sort((left, right) => right.lines - left.lines || left.filePath.localeCompare(right.filePath));

  for (const entry of largestSourceFiles) {
    if (entry.severity === "info") continue;
    pushFinding(findings, {
      bucket: "fileSizeHealth",
      severity: entry.severity,
      filePath: entry.filePath,
      title: `${entry.classification} exceeds code organization size budget`,
      evidence: [`${entry.filePath} is ${entry.lines} LOC.`],
      expectedRule: "Split large files into view, state, server, contract, telemetry, validator, or docs layers before they become whack-a-mole risk.",
      actualPattern: `${entry.classification} ${entry.lines} LOC`,
      suggestedFix: "Create a feature-folder migration slice or extract a stable contract/helper without changing runtime behavior.",
    });
  }

  const largestDocs = allFiles
    .filter((filePath) => filePath.endsWith(".md") && (/^(docs\/agent-truth|docs\/doctrine)\//u.test(filePath) || filePath === "AGENTS.md" || filePath === "REPO_MEMORY_LEDGER.md"))
    .map((filePath) => {
      const lines = lineCount(readIfExists(root, filePath));
      return toFileEntry(filePath, lines, "markdown", severityForMarkdown(lines));
    })
    .sort((left, right) => right.lines - left.lines || left.filePath.localeCompare(right.filePath));

  for (const entry of largestDocs.filter((doc) => doc.severity !== "info")) {
    pushFinding(findings, {
      bucket: "agentContextEfficiency",
      severity: entry.severity,
      filePath: entry.filePath,
      title: "Large doctrine Markdown should have compact agent context",
      evidence: [`${entry.filePath} is ${entry.lines} lines.`],
      expectedRule: "Agents load compact JSON/JSONL doctrine cards before reading long narrative docs.",
      actualPattern: `markdown ${entry.lines} lines`,
      suggestedFix: "Create or update a compact card/index entry before relying on the full Markdown file.",
    });
  }

  const largestGeneratedStateFiles = allFiles
    .filter((filePath) =>
      /\.(?:json|jsonl)$/u.test(filePath)
      && (/^agent\/(?:state|index|context)\//u.test(filePath)),
    )
    .map((filePath) => {
      const lines = lineCount(readIfExists(root, filePath));
      return toFileEntry(filePath, lines, filePath.endsWith(".jsonl") ? "generatedJsonl" : "generatedJson", severityForGeneratedJson(filePath, lines));
    })
    .sort((left, right) => right.lines - left.lines || left.filePath.localeCompare(right.filePath));

  for (const entry of largestGeneratedStateFiles.filter((file) => file.severity !== "info")) {
    pushFinding(findings, {
      bucket: "agentContextEfficiency",
      severity: entry.severity,
      filePath: entry.filePath,
      title: "Generated JSON exceeds compact context budget",
      evidence: [`${entry.filePath} is ${entry.lines} lines and is not JSONL/sharded.`],
      expectedRule: "Append-only or large generated history should use JSONL or sharded records.",
      actualPattern: `generated JSON ${entry.lines} lines`,
      suggestedFix: "Shard the report by surface or convert append-only history to JSONL.",
    });
  }

  return { largestSourceFiles, largestDocs, largestGeneratedStateFiles };
}

function scanVagueNames(sourceFiles: SourceFile[], findings: CodeOrganizationFindingInput[]) {
  const entries = sourceFiles
    .filter((file) => CODE_ORGANIZATION_VAGUE_FILE_NAMES.includes(basename(file.filePath) as never))
    .filter((file) => !(file.filePath in CODE_ORGANIZATION_VAGUE_NAME_ALLOWLIST))
    .map((file) => toFileEntry(file.filePath, file.lines, file.classification, "warning" as const));

  for (const entry of entries) {
    pushFinding(findings, {
      bucket: "hierarchyCompliance",
      severity: "warning",
      filePath: entry.filePath,
      title: "Vague helper filename hides ownership",
      evidence: [`${basename(entry.filePath)} is flagged unless allowlisted and documented.`],
      expectedRule: "Use explicit suffixes such as .contract.ts, .server.ts, .client.ts, .score.ts, .normalize.ts, .rollup.ts, .policy.ts, .validator.ts, .view.tsx, or .panel.tsx.",
      actualPattern: basename(entry.filePath),
      suggestedFix: "Rename during a narrow migration slice, or add an explicit allowlist entry with owner and scope.",
    });
  }

  return entries;
}

function scanHierarchy(sourceFiles: SourceFile[], findings: CodeOrganizationFindingInput[]) {
  const misplaced: CodeOrganizationFileEntry[] = [];
  for (const file of sourceFiles) {
    if (!file.filePath.startsWith("src/lib/") || file.filePath.startsWith("src/lib/server/")) continue;
    if (/^src\/lib\/(?:code-organization|agent-audit|legacy)\//u.test(file.filePath)) continue;

    const matchedFeatures = getFeatureMatches(file.filePath, file.source);
    if (matchedFeatures.length > 0) {
      const entry = toFileEntry(file.filePath, file.lines, `src/lib feature logic: ${matchedFeatures.slice(0, 3).join(", ")}`, "warning");
      misplaced.push(entry);
      pushFinding(findings, {
        bucket: "hierarchyCompliance",
        severity: "warning",
        filePath: file.filePath,
        title: "Feature-specific logic appears in shared src/lib",
        evidence: [`Matched feature ownership: ${matchedFeatures.slice(0, 4).join(", ")}.`],
        expectedRule: "src/lib is for shared primitives; product/domain ownership migrates to src/features/<feature>.",
        actualPattern: "src/lib contains feature-specific names or formulas",
        suggestedFix: `Plan migration into ${matchedFeatures.map((feature) => FEATURE_RULES[feature].targetPath).join(", ")} without changing runtime imports in this pass.`,
      });
    }

    if (/from\s+["']@\/(?:app|components|features)\//u.test(file.source) || /from\s+["']\.\.\/(?:app|components|features)\//u.test(file.source)) {
      pushFinding(findings, {
        bucket: "hierarchyCompliance",
        severity: "critical",
        filePath: file.filePath,
        line: lineOf(file.source, /from\s+["'](?:@\/|\.\.\/)(?:app|components|features)\//u),
        title: "Shared lib imports product or route layer",
        evidence: ["Shared primitives must not depend on feature, app, or component runtime layers."],
        expectedRule: "Dependency direction is feature/app -> shared lib, never shared lib -> feature/app UI.",
        actualPattern: "src/lib import from app/components/features",
        suggestedFix: "Invert the dependency by moving feature-specific logic behind a contract or feature-local adapter.",
      });
    }
  }
  return misplaced.sort((left, right) => right.lines - left.lines || left.filePath.localeCompare(right.filePath));
}

function scanRouteResponsibilities(sourceFiles: SourceFile[], findings: CodeOrganizationFindingInput[]) {
  const routes: CodeOrganizationRouteResponsibility[] = [];
  for (const file of sourceFiles.filter((candidate) => candidate.classification === "routeHandler")) {
    const responsibilities = detectResponsibilities(file.source);
    if (responsibilities.length >= 4) {
      const severity: CodeOrganizationSeverity = responsibilities.length >= 5 ? "critical" : "review_required";
      routes.push({ filePath: file.filePath, lines: file.lines, responsibilities, severity });
      pushFinding(findings, {
        bucket: "truthLayerSeparation",
        severity,
        filePath: file.filePath,
        title: "Route handler mixes too many responsibilities inline",
        evidence: [`Detected responsibilities: ${responsibilities.join(", ")}.`],
        expectedRule: "Route handlers orchestrate contracts and server truth helpers; auth, validation, Firestore, scoring, formatting, and telemetry should not all be inline.",
        actualPattern: `${responsibilities.length} inline responsibilities`,
        suggestedFix: "Extract stable server helpers/contracts in a narrow slice, then route imports the helper.",
      });
    }
    if (/\bscore\b|\bweight\b|\brank\b/u.test(file.source) && /[+\-*/]\s*(?:\d|Math\.)/u.test(file.source)) {
      pushFinding(findings, {
        bucket: "truthLayerSeparation",
        severity: "review_required",
        filePath: file.filePath,
        line: lineOf(file.source, /\bscore\b|\bweight\b|\brank\b/u),
        title: "Route handler appears to inline scoring formula",
        evidence: ["Routes should call feature/server scoring helpers instead of owning formulas."],
        expectedRule: "Routes cannot inline scoring formulas.",
        actualPattern: "score/rank/weight arithmetic in route",
        suggestedFix: "Move the formula into a .score.ts or .server.ts helper with tests/validator coverage.",
      });
    }
  }
  return routes.sort((left, right) => right.responsibilities.length - left.responsibilities.length || right.lines - left.lines);
}

function scanUiSourceTruth(sourceFiles: SourceFile[], findings: CodeOrganizationFindingInput[]) {
  for (const file of sourceFiles.filter((candidate) =>
    candidate.filePath.startsWith("src/components/")
    || (candidate.filePath.startsWith("src/app/") && !candidate.filePath.includes("/api/")),
  )) {
    const writesAuthoritativeState = /\b(?:setDoc|updateDoc|writeBatch|runTransaction)\b/u.test(file.source)
      && /\b(?:payment|purchase|paypal|auth|entitlement|unlock|balance|transaction|gumDropsPurchasedBalance)\b/ui.test(file.source);
    if (writesAuthoritativeState) {
      pushFinding(findings, {
        bucket: "truthLayerSeparation",
        severity: "critical",
        filePath: file.filePath,
        line: lineOf(file.source, /\b(?:setDoc|updateDoc|writeBatch|runTransaction)\b/u),
        title: "UI appears to duplicate payment/auth/entitlement source truth",
        evidence: ["A UI file contains Firestore write primitives near payment/auth/entitlement terms."],
        expectedRule: "UI cannot define source truth; payment, auth, and entitlement facts are server-truth first.",
        actualPattern: "UI Firestore write near source-truth terms",
        suggestedFix: "Move authoritative writes to a guarded route/server helper and keep UI events as funnel or context telemetry.",
      });
    }
  }
}

function normalizeFormula(line: string) {
  return line
    .replace(/\/\/.*$/u, "")
    .replace(/["'`][^"'`]*["'`]/gu, "\"s\"")
    .replace(/\b\d+(?:\.\d+)?\b/gu, "#")
    .replace(/\s+/gu, " ")
    .trim();
}

function scanDuplicateFormulas(sourceFiles: SourceFile[], findings: CodeOrganizationFindingInput[]) {
  const formulaMap = new Map<string, Set<string>>();
  for (const file of sourceFiles.filter((candidate) => /^(src\/app\/admin|src\/components\/Admin|src\/lib)\//u.test(candidate.filePath))) {
    const lines = file.source.split(/\r?\n/u);
    for (const line of lines) {
      if (!/(engagement|value|score|rate|revenue|metric|risk|conversion|watch)/iu.test(line)) continue;
      if (!/[+\-*/]/u.test(line)) continue;
      if (/^\s*(?:import|type|interface|console\.|\/\/|\*)/u.test(line)) continue;
      if (/className|bg-|text-|border-|shadow-|calc\(/u.test(line)) continue;
      const normalized = normalizeFormula(line);
      if (normalized.length < 20) continue;
      const files = formulaMap.get(normalized) ?? new Set<string>();
      files.add(file.filePath);
      formulaMap.set(normalized, files);
    }
  }

  const duplicates: CodeOrganizationDuplicateFormula[] = [];
  for (const [normalizedFormula, filesSet] of formulaMap) {
    const files = Array.from(filesSet).sort();
    if (files.length < 2) continue;
    const adminPanelFiles = files.filter((filePath) => /^(src\/app\/admin|src\/components\/Admin)\//u.test(filePath));
    const severity: CodeOrganizationSeverity = adminPanelFiles.length >= 2 ? "critical" : "review_required";
    duplicates.push({ normalizedFormula, files, severity });
    pushFinding(findings, {
      bucket: "truthLayerSeparation",
      severity,
      filePath: files[0],
      title: "Metric or scoring formula appears duplicated",
      evidence: [`Formula appears in ${files.length} files: ${files.slice(0, 5).join(", ")}.`],
      expectedRule: "Metrics cannot be calculated independently in multiple panels.",
      actualPattern: normalizedFormula,
      suggestedFix: "Move the formula into one .score.ts, .rollup.ts, or server truth helper and import it from panels.",
    });
  }

  return duplicates.sort((left, right) =>
    getCodeOrganizationSeverityRank(right.severity) - getCodeOrganizationSeverityRank(left.severity)
    || right.files.length - left.files.length
    || left.normalizedFormula.localeCompare(right.normalizedFormula));
}

function scanComponentImports(sourceFiles: SourceFile[], findings: CodeOrganizationFindingInput[]) {
  const candidates: CodeOrganizationFileEntry[] = [];
  for (const file of sourceFiles.filter((candidate) => candidate.classification === "component")) {
    const imports = Array.from(file.source.matchAll(/^\s*import\s+[\s\S]*?\s+from\s+["']([^"']+)["'];?/gmu), (match) => match[1]);
    const domainImports = imports.filter((importPath) =>
      /^@\/(?:lib|hooks|features|context|components\/(?!ui\/))/u.test(importPath)
      || /^\.\.?\//u.test(importPath),
    );
    if (new Set(domainImports).size > 8) {
      const entry = toFileEntry(file.filePath, file.lines, `${new Set(domainImports).size} domain imports`, "critical");
      candidates.push(entry);
      pushFinding(findings, {
        bucket: "truthLayerSeparation",
        severity: "critical",
        filePath: file.filePath,
        title: "Component imports more than 8 domain helpers",
        evidence: [`Detected ${new Set(domainImports).size} domain/helper imports.`],
        expectedRule: "Large components should split view, state, telemetry, diagnostics, and feature adapters before accumulating hidden source truth.",
        actualPattern: `${new Set(domainImports).size} domain imports`,
        suggestedFix: "Extract a feature-local hook, view component, or contract boundary in the migration plan.",
      });
    }
  }
  return candidates.sort((left, right) => right.lines - left.lines || left.filePath.localeCompare(right.filePath));
}

function buildFeatureOwnership(sourceFiles: SourceFile[], root: string, findings: CodeOrganizationFindingInput[]) {
  const ownership: CodeOrganizationFeatureOwnership[] = [];
  const migrations: CodeOrganizationMigrationTarget[] = [];

  for (const feature of CODE_ORGANIZATION_FEATURES) {
    const rule = FEATURE_RULES[feature];
    const targetExists = existsSync(join(root, rule.targetPath));
    const candidateFiles = sourceFiles
      .filter((file) => getFeatureMatches(file.filePath, file.source).includes(feature))
      .map((file) => file.filePath)
      .filter((filePath) => !filePath.startsWith(`${rule.targetPath}/`))
      .sort();
    const missingChildren = targetExists
      ? CODE_ORGANIZATION_FEATURE_CHILDREN.filter((child) => !existsSync(join(root, rule.targetPath, child)))
      : [...CODE_ORGANIZATION_FEATURE_CHILDREN];

    ownership.push({
      feature,
      targetPath: rule.targetPath,
      exists: targetExists,
      candidateFiles: candidateFiles.slice(0, 4),
      missingChildren: missingChildren.slice(0, 6),
      migrationReason: rule.migrationReason,
    });
    migrations.push({
      feature,
      targetPath: rule.targetPath,
      currentEntrypoints: candidateFiles.slice(0, 3),
      firstMoveCandidates: candidateFiles
        .filter((filePath) => !filePath.includes("/route."))
        .slice(0, 2),
      guardrails: rule.guardrails,
    });

    if (!targetExists || candidateFiles.length > 0) {
      pushFinding(findings, {
        bucket: "featureOwnership",
        severity: targetExists ? "warning" : "review_required",
        filePath: rule.targetPath,
        title: `Feature folder migration target needs ownership work: ${feature}`,
        evidence: [
          targetExists ? `${rule.targetPath} exists but has ${candidateFiles.length} external candidate files.` : `${rule.targetPath} does not exist yet.`,
        ],
        expectedRule: "Domain/product ownership migrates to src/features/<feature> with components, hooks, server, contracts, scoring, validators, tests, and index.ts exports only.",
        actualPattern: `${candidateFiles.length} candidate files outside feature folder`,
        suggestedFix: "Create a small migration map first; do not move routes automatically.",
      });
    }
  }

  return { ownership, migrations };
}

function scanLegacy(sourceFiles: SourceFile[], findings: CodeOrganizationFindingInput[]) {
  const registeredPaths = new Set(LEGACY_REGISTRY.flatMap((item) => item.paths));
  const legacyCandidates = sourceFiles
    .filter((file) =>
      /legacy|fallback|deprecated|synthetic|simulative|DropPreviewModal|AdminSupportQueue|AdminModerationConsole/u.test(file.filePath)
      || /legacy|fallback only|deprecated|synthetic|simulative/u.test(file.source.slice(0, 4000)),
    )
    .filter((file) => !registeredPaths.has(file.filePath))
    .map((file) => toFileEntry(file.filePath, file.lines, "legacy candidate", "warning" as const));

  for (const entry of legacyCandidates) {
    pushFinding(findings, {
      bucket: "legacyPhaseOut",
      severity: "warning",
      filePath: entry.filePath,
      title: "Legacy-looking file lacks phase-out registry coverage",
      evidence: ["Legacy, fallback, deprecated, synthetic, or simulative code must have owner, replacement, reviewBy, and removeBy."],
      expectedRule: "Legacy paths must be registered before they can remain as fallback or deprecated code.",
      actualPattern: "legacy candidate not in LEGACY_REGISTRY",
      suggestedFix: "Add a registry item or remove the stale marker in a separate approved cleanup.",
    });
  }

  for (const item of LEGACY_REGISTRY.filter((registryItem) => registryItem.status === "blocked")) {
    for (const file of sourceFiles) {
      if (isAllowedLegacyReference(item, file.filePath)) continue;
      const blockedPattern = item.blockedReferences.find((pattern) => file.source.includes(pattern));
      if (!blockedPattern) continue;
      pushFinding(findings, {
        bucket: "legacyPhaseOut",
        severity: "critical",
        filePath: file.filePath,
        line: lineOf(file.source, blockedPattern),
        title: "Blocked legacy pattern appears outside allowed references",
        evidence: [`Legacy item ${item.id} blocked pattern: ${blockedPattern}.`],
        expectedRule: "Blocked legacy cannot be imported or treated as canonical runtime.",
        actualPattern: blockedPattern,
        suggestedFix: "Remove the blocked reference or update the registry only after owner-approved promotion.",
      });
    }
  }

  return legacyCandidates.sort((left, right) => right.lines - left.lines || left.filePath.localeCompare(right.filePath));
}

function readJsonSafely<T>(root: string, filePath: string, fallback: T) {
  try {
    return JSON.parse(readIfExists(root, filePath)) as T;
  } catch {
    return fallback;
  }
}

function scanDocsCompactCards(allFiles: string[], root: string, findings: CodeOrganizationFindingInput[]) {
  const doctrineIndex = readJsonSafely<{ sourceDocs?: string[] }>(root, "agent/context/doctrine.index.json", {});
  const coveredDocs = new Set([
    ...(doctrineIndex.sourceDocs ?? []),
    CODE_ORGANIZATION_AGENT_TRUTH_DOC_PATH,
    CODE_ORGANIZATION_DOCTRINE_DOC_PATH,
  ]);
  const entries = allFiles
    .filter((filePath) => filePath.endsWith(".md") && /^(docs\/agent-truth|docs\/doctrine)\//u.test(filePath))
    .filter((filePath) => !coveredDocs.has(filePath))
    .map((filePath) => toFileEntry(filePath, lineCount(readIfExists(root, filePath)), "markdown without compact card", severityForMarkdown(lineCount(readIfExists(root, filePath)))))
    .sort((left, right) => right.lines - left.lines || left.filePath.localeCompare(right.filePath));

  for (const entry of entries.filter((doc) => doc.severity !== "info").slice(0, 25)) {
    pushFinding(findings, {
      bucket: "agentContextEfficiency",
      severity: entry.severity,
      filePath: entry.filePath,
      title: "Doctrine Markdown lacks compact card coverage",
      evidence: [`${entry.filePath} is ${entry.lines} lines and is not in agent/context/doctrine.index.json sourceDocs.`],
      expectedRule: "Large doctrine docs must have compact cards before agents load full Markdown.",
      actualPattern: "Markdown source doc missing compact card",
      suggestedFix: "Add a compact card or sourceDocs entry in the compact context lane.",
    });
  }

  return entries;
}

function scanValidatorCoverage(root: string, findings: CodeOrganizationFindingInput[]) {
  const packageJson = readJsonSafely<{ scripts?: Record<string, string> }>(root, "package.json", {});
  const scripts = packageJson.scripts ?? {};
  const requiredScripts = {
    "score:code-organization": "tsx scripts/agent/score-code-organization.ts",
    "check:code-organization": "tsx scripts/agent/validate-code-organization.ts",
  };

  for (const [scriptName, command] of Object.entries(requiredScripts)) {
    if (scripts[scriptName] !== command) {
      pushFinding(findings, {
        bucket: "validatorCoverage",
        severity: "critical",
        filePath: "package.json",
        title: `Missing package script ${scriptName}`,
        evidence: [`Expected "${scriptName}": "${command}".`],
        expectedRule: "Code organization doctrine must be executable through score:code-organization and check:code-organization.",
        actualPattern: scripts[scriptName] ?? "missing",
        suggestedFix: "Add the exact package script.",
      });
    }
  }

  for (const filePath of [
    CODE_ORGANIZATION_AGENT_TRUTH_DOC_PATH,
    CODE_ORGANIZATION_DOCTRINE_DOC_PATH,
    "src/lib/code-organization/code-organization-contract.ts",
    "scripts/agent/score-code-organization.ts",
    "scripts/agent/validate-code-organization.ts",
  ]) {
    if (!existsSync(join(root, filePath))) {
      pushFinding(findings, {
        bucket: "validatorCoverage",
        severity: "critical",
        filePath,
        title: "Required code organization artifact is missing",
        evidence: [`Missing ${filePath}.`],
        expectedRule: "Doctrine, contract, score, validator, report, and compact index must exist together.",
        actualPattern: "missing artifact",
        suggestedFix: "Create the required artifact before signoff.",
      });
    }
  }
}

function dedupeFindings(rawFindings: CodeOrganizationFindingInput[]) {
  const findings = rawFindings.map(buildCodeOrganizationFinding);
  const byKey = new Map<string, CodeOrganizationFinding>();
  for (const finding of findings) {
    const key = [finding.bucket, finding.filePath, finding.line ?? "", finding.title, finding.actualPattern].join("|");
    const existing = byKey.get(key);
    if (!existing || getCodeOrganizationSeverityRank(finding.severity) > getCodeOrganizationSeverityRank(existing.severity)) {
      byKey.set(key, finding);
    } else {
      byKey.set(key, {
        ...existing,
        evidence: Array.from(new Set([...existing.evidence, ...finding.evidence])),
      });
    }
  }
  return Array.from(byKey.values()).sort((left, right) =>
    getCodeOrganizationSeverityRank(right.severity) - getCodeOrganizationSeverityRank(left.severity)
    || left.bucket.localeCompare(right.bucket)
    || left.filePath.localeCompare(right.filePath)
    || left.title.localeCompare(right.title));
}

function scoreBucket(findings: CodeOrganizationFinding[]) {
  const penalty = findings.reduce((sum, finding) => sum + CODE_ORGANIZATION_SEVERITY_PENALTIES[finding.severity], 0);
  return Math.max(0, Math.min(100, 100 - penalty));
}

function buildBucketScores(findings: CodeOrganizationFinding[]) {
  const bucketScores = {} as CodeOrganizationReport["bucketScores"];
  let weightedScore = 0;
  let totalWeight = 0;

  for (const bucket of CODE_ORGANIZATION_SCORE_BUCKETS) {
    const bucketFindings = findings.filter((finding) => finding.bucket === bucket.key);
    const score = scoreBucket(bucketFindings);
    const criticalCount = bucketFindings.filter((finding) => finding.severity === "critical").length;
    const reviewRequiredCount = bucketFindings.filter((finding) => finding.severity === "review_required").length;
    bucketScores[bucket.key] = {
      weight: bucket.weight,
      score,
      status: getCodeOrganizationStatus(score, criticalCount > 0, reviewRequiredCount > 0),
      findingCount: bucketFindings.length,
      criticalCount,
      reviewRequiredCount,
    };
    weightedScore += score * bucket.weight;
    totalWeight += bucket.weight;
  }

  return {
    bucketScores,
    overallScore: Math.round(weightedScore / Math.max(1, totalWeight)),
  };
}

function buildTopRefactorTargets(findings: CodeOrganizationFinding[], largestSourceFiles: CodeOrganizationFileEntry[]) {
  const byPath = new Map<string, CodeOrganizationFileEntry>();
  for (const finding of findings) {
    const existing = byPath.get(finding.filePath);
    const source = largestSourceFiles.find((file) => file.filePath === finding.filePath);
    const severity = existing && getCodeOrganizationSeverityRank(existing.severity) > getCodeOrganizationSeverityRank(finding.severity)
      ? existing.severity
      : finding.severity;
    byPath.set(finding.filePath, toFileEntry(finding.filePath, source?.lines ?? 0, source?.classification ?? finding.bucket, severity));
  }
  return Array.from(byPath.values())
    .sort((left, right) =>
      getCodeOrganizationSeverityRank(right.severity) - getCodeOrganizationSeverityRank(left.severity)
      || right.lines - left.lines
      || left.filePath.localeCompare(right.filePath))
    .slice(0, 20);
}

function buildRouteGroupMigrationPlan() {
  return [
    "Do not move routes automatically; create route groups only in owner-approved migration slices.",
    ...CODE_ORGANIZATION_ROUTE_GROUPS.map((group) => `${group}: route group target for organizational grouping without URL changes.`),
    "Route moves require parity checks for URL, metadata, auth, telemetry, and adjacent validators before merge.",
  ];
}

function buildContextIndex(report: CodeOrganizationReport) {
  const compactCard = {
    id: "doctrine_card__code-organization",
    title: "Code Organization Doctrine",
    surface: "repo-governance",
    scope: [
      "src/app/**",
      "src/features/**",
      "src/lib/**",
      "src/components/**",
      "scripts/agent/**",
      "docs/agent-truth/**",
      "docs/doctrine/**",
      "agent/context/**",
    ],
    canonicalFiles: [
      "src/lib/code-organization/code-organization-contract.ts",
      "scripts/agent/score-code-organization.ts",
      "scripts/agent/validate-code-organization.ts",
      CODE_ORGANIZATION_REPORT_PATH,
    ],
    rules: [
      "Read this compact index before full organization doctrine Markdown.",
      "Route moves are migration-plan only unless explicitly approved.",
      "Source truth flows contract -> server truth -> client projection -> UI display -> telemetry -> validator -> docs.",
      "Use affected-file and cache-first audit lanes before broad checks.",
    ],
    blockedPatterns: [
      "route handler with 5+ inline responsibilities",
      "UI-owned payment/auth/entitlement truth",
      "duplicated admin metric formula",
      "blocked legacy imported by canonical runtime",
    ],
    requiredValidators: ["score:code-organization", "check:code-organization"],
    sourceDocs: [CODE_ORGANIZATION_AGENT_TRUTH_DOC_PATH, CODE_ORGANIZATION_DOCTRINE_DOC_PATH],
    tokenEstimate: 300,
  };

  return {
    generatedAt: report.generatedAt,
    version: 1,
    surface: "code-organization",
    researchBasis: [
      "Google code health and small CL doctrine: optimize maintainability, reviewability, rollback safety, and related tests.",
      "Next.js App Router: use route groups, private folders, colocation, and src separation without route URL churn.",
      "Nx affected model: changed files plus project/dependency graph choose minimum affected checks.",
      "Turborepo cache model: deterministic task inputs/outputs/logs make repeat audits cacheable.",
    ],
    loadPlan: [
      CODE_ORGANIZATION_CONTEXT_INDEX_PATH,
      CODE_ORGANIZATION_REPORT_PATH,
      CODE_ORGANIZATION_AGENT_TRUTH_DOC_PATH,
      CODE_ORGANIZATION_DOCTRINE_DOC_PATH,
    ],
    doctrineCard: compactCard,
    hierarchy: CODE_ORGANIZATION_HIERARCHY,
    featureTargets: CODE_ORGANIZATION_FEATURES.map((feature) => ({
      feature,
      targetPath: FEATURE_RULES[feature].targetPath,
      allowedChildren: [...CODE_ORGANIZATION_FEATURE_CHILDREN],
    })),
    truthLayerOrder: [...CODE_ORGANIZATION_TRUTH_LAYER_ORDER],
    reportDigest: {
      overallScore: report.overallScore,
      status: report.status,
      topRefactorTargets: report.topRefactorTargets.slice(0, 10),
      criticalCount: report.criticalFindings.length,
      missingFeatureOwnership: report.missingFeatureOwnership.filter((entry) => !entry.exists).length,
    },
  };
}

export function buildCodeOrganizationReport(root = process.cwd()): CodeOrganizationReport {
  const allFiles = walkFiles(root, ".");
  const sourceFiles = readSourceFiles(root, allFiles);
  const rawFindings: CodeOrganizationFindingInput[] = [];

  const { largestSourceFiles, largestDocs, largestGeneratedStateFiles } = scanFileSizes(sourceFiles, allFiles, root, rawFindings);
  const vagueHelperFiles = scanVagueNames(sourceFiles, rawFindings);
  const misplacedFeatureLogicInSrcLib = scanHierarchy(sourceFiles, rawFindings);
  const routeHandlersWithTooManyResponsibilities = scanRouteResponsibilities(sourceFiles, rawFindings);
  scanUiSourceTruth(sourceFiles, rawFindings);
  const duplicateMetricScoringFormulas = scanDuplicateFormulas(sourceFiles, rawFindings);
  const componentSplitCandidates = scanComponentImports(sourceFiles, rawFindings);
  const { ownership: missingFeatureOwnership, migrations: suggestedFeatureFolderMigrations } = buildFeatureOwnership(sourceFiles, root, rawFindings);
  const legacyFilesWithoutPhaseOut = scanLegacy(sourceFiles, rawFindings);
  const docsLackingCompactCards = scanDocsCompactCards(allFiles, root, rawFindings);
  scanValidatorCoverage(root, rawFindings);

  const allFindings = dedupeFindings(rawFindings);
  const { bucketScores, overallScore } = buildBucketScores(allFindings);
  const criticalFindings = allFindings.filter((finding) => finding.severity === "critical");
  const reviewRequiredCount = allFindings.filter((finding) => finding.severity === "review_required").length;
  const status = getCodeOrganizationStatus(overallScore, criticalFindings.length > 0, reviewRequiredCount > 0);
  const topRefactorTargets = buildTopRefactorTargets(allFindings, largestSourceFiles);

  return {
    generatedAt: new Date().toISOString(),
    doctrine: {
      note: CODE_ORGANIZATION_DOCTRINE_NOTE,
      agentTruthDoc: CODE_ORGANIZATION_AGENT_TRUTH_DOC_PATH,
      productDoctrineDoc: CODE_ORGANIZATION_DOCTRINE_DOC_PATH,
      compactIndex: CODE_ORGANIZATION_CONTEXT_INDEX_PATH,
    },
    overallScore,
    status,
    bucketScores,
    findings: allFindings.slice(0, 20),
    criticalFindings: criticalFindings.slice(0, 10),
    topRefactorTargets: topRefactorTargets.slice(0, 12),
    largestSourceFiles: largestSourceFiles.slice(0, 8),
    largestDocs: largestDocs.slice(0, 5),
    largestGeneratedStateFiles: largestGeneratedStateFiles.slice(0, 5),
    vagueHelperFiles: vagueHelperFiles.slice(0, 8),
    misplacedFeatureLogicInSrcLib: misplacedFeatureLogicInSrcLib.slice(0, 8),
    routeHandlersWithTooManyResponsibilities: routeHandlersWithTooManyResponsibilities.slice(0, 8),
    duplicateMetricScoringFormulas: duplicateMetricScoringFormulas.slice(0, 5),
    componentSplitCandidates: componentSplitCandidates.slice(0, 8),
    missingFeatureOwnership,
    legacyFilesWithoutPhaseOut: legacyFilesWithoutPhaseOut.slice(0, 5),
    docsLackingCompactCards: docsLackingCompactCards.slice(0, 5),
    suggestedFeatureFolderMigrations,
    routeGroupMigrationPlan: buildRouteGroupMigrationPlan(),
    minimalCommands: [...CODE_ORGANIZATION_MINIMAL_COMMANDS],
    forbiddenCommands: [...CODE_ORGANIZATION_FORBIDDEN_COMMANDS],
    summary: `${CODE_ORGANIZATION_DOCTRINE_NOTE} Current report scored ${overallScore}/100 with ${allFindings.length} organization findings; report arrays are capped for compact agent loading.`,
  };
}

export function writeCodeOrganizationReport(report: CodeOrganizationReport, root = process.cwd()) {
  const reportPath = join(root, CODE_ORGANIZATION_REPORT_PATH);
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  const contextPath = join(root, CODE_ORGANIZATION_CONTEXT_INDEX_PATH);
  mkdirSync(dirname(contextPath), { recursive: true });
  writeFileSync(contextPath, `${JSON.stringify(buildContextIndex(report), null, 2)}\n`, "utf8");
}

export function printCodeOrganizationSummary(report: CodeOrganizationReport) {
  console.log(`Code organization: ${report.overallScore}/100 (${report.status})`);
  console.log(`Findings: ${report.findings.length} shown; critical shown: ${report.criticalFindings.length}; compact index: ${CODE_ORGANIZATION_CONTEXT_INDEX_PATH}`);
  console.log("Top refactor targets:");
  for (const target of report.topRefactorTargets.slice(0, 8)) {
    console.log(`- [${target.severity}] ${target.filePath} (${target.lines} LOC, ${target.classification})`);
  }
  console.log("Suggested feature migrations:");
  for (const migration of report.suggestedFeatureFolderMigrations.slice(0, 6)) {
    console.log(`- ${migration.feature} -> ${migration.targetPath} (${migration.currentEntrypoints.length} current entrypoints shown)`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = buildCodeOrganizationReport();
  writeCodeOrganizationReport(report);
  printCodeOrganizationSummary(report);
}
