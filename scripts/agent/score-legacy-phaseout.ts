import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative, sep } from "node:path";

import {
  LEGACY_PHASEOUT_DOC_PATH,
  LEGACY_PHASEOUT_REPORT_PATH,
  LEGACY_REGISTRY,
  LEGACY_STAGE_PENALTY,
  calculateLegacyDebtScore,
  getLegacyOverdueMultiplier,
  getLegacyRiskWeight,
  isAllowedLegacyReference,
  type LegacyRegistryItem,
} from "../../src/lib/legacy/legacy-registry";

type LegacyPhaseoutSeverity = "info" | "warning" | "critical";

type LegacyPhaseoutFinding = {
  id: string;
  severity: LegacyPhaseoutSeverity;
  itemId: string;
  title: string;
  filePath?: string;
  line?: number;
  excerpt?: string;
  recommendation: string;
  evidence: string[];
};

type LegacyPhaseoutScoredItem = LegacyRegistryItem & {
  stagePenalty: number;
  riskWeight: number;
  overdueMultiplier: number;
  debtScore: number;
  referenceCount: number;
  blockedReferenceCount: number;
  overdueState: "current" | "review_overdue" | "remove_overdue";
};

type LegacyPhaseoutReport = {
  generatedAt: string;
  registryVersion: string;
  reportPath: string;
  docsPath: string;
  legacyDebtScore: number;
  healthScore: number;
  status: "pass" | "warning" | "fail";
  registryCount: number;
  blockedReferenceCount: number;
  overdueCount: number;
  items: LegacyPhaseoutScoredItem[];
  findings: LegacyPhaseoutFinding[];
  nextActions: string[];
  scoring: {
    formula: string;
    stagePenalty: typeof LEGACY_STAGE_PENALTY;
    overdueMultiplier: {
      beforeReviewBy: 1;
      afterReviewBy: 1.5;
      afterRemoveBy: 3;
    };
  };
  commandBudget: {
    allowedCommands: string[];
    forbiddenCommands: string[];
  };
};

type SourceFile = {
  path: string;
  source: string;
};

const root = process.cwd();
const registryVersion = "legacy-phaseout-v1";
const runtimeExtensions = new Set([".ts", ".tsx", ".js", ".jsx"]);
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

const commandBudget = {
  allowedCommands: [
    "npm run score:legacy-phaseout",
    "npm run check:legacy-phaseout",
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

function normalizePath(filePath: string) {
  return filePath.split(sep).join("/");
}

function stableHash(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function readIfExists(filePath: string) {
  const absolutePath = join(root, filePath);
  if (!existsSync(absolutePath)) return "";
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
      if (!entry.isFile() || !extensions.has(extname(entry.name))) continue;
      results.push(normalizePath(relative(root, join(absoluteDir, entry.name))));
    }
  }

  visit(absoluteStart);
  return results.sort((left, right) => left.localeCompare(right));
}

function readSourceFiles(filePaths: readonly string[]): SourceFile[] {
  return filePaths
    .map((filePath) => ({ path: filePath, source: readIfExists(filePath) }))
    .filter((file) => file.source.length > 0);
}

function lineOf(source: string, needle: string) {
  const index = source.indexOf(needle);
  if (index < 0) return undefined;
  return source.slice(0, index).split(/\r?\n/u).length;
}

function excerptOf(source: string, needle: string) {
  return source.split(/\r?\n/u).find((line) => line.includes(needle))?.trim();
}

function addFinding(findings: LegacyPhaseoutFinding[], input: Omit<LegacyPhaseoutFinding, "id">) {
  findings.push({
    ...input,
    id: `legacy-phaseout-${stableHash(`${input.itemId}:${input.title}:${input.filePath ?? ""}:${input.line ?? ""}`)}`,
  });
}

function overdueStateFor(item: LegacyRegistryItem, now: Date): LegacyPhaseoutScoredItem["overdueState"] {
  if (item.phaseOutStage === "removed" || item.status === "canonical") return "current";
  const current = now.getTime();
  const removeBy = Date.parse(`${item.removeBy}T00:00:00.000Z`);
  const reviewBy = Date.parse(`${item.reviewBy}T00:00:00.000Z`);
  if (Number.isFinite(removeBy) && current > removeBy) return "remove_overdue";
  if (Number.isFinite(reviewBy) && current > reviewBy) return "review_overdue";
  return "current";
}

function countAllowedReferences(item: LegacyRegistryItem, runtimeFiles: readonly SourceFile[]) {
  return runtimeFiles.reduce((total, file) => {
    if (!isAllowedLegacyReference(item, file.path)) return total;
    return total + item.blockedReferences.filter((reference) => file.source.includes(reference)).length;
  }, 0);
}

function scanBlockedReferences(item: LegacyRegistryItem, runtimeFiles: readonly SourceFile[], findings: LegacyPhaseoutFinding[]) {
  let blockedReferenceCount = 0;
  for (const file of runtimeFiles) {
    if (file.path === "src/lib/legacy/legacy-registry.ts") continue;
    if (isAllowedLegacyReference(item, file.path)) continue;
    for (const blockedReference of item.blockedReferences) {
      if (!file.source.includes(blockedReference)) continue;
      blockedReferenceCount += 1;
      addFinding(findings, {
        severity: "critical",
        itemId: item.id,
        title: "Blocked or non-canonical legacy reference appears in runtime source",
        filePath: file.path,
        line: lineOf(file.source, blockedReference),
        excerpt: excerptOf(file.source, blockedReference),
        recommendation: `Remove this reference or update ${item.id} in the legacy registry with an explicit owner-approved allowed reference.`,
        evidence: [blockedReference, `replacement=${item.canonicalReplacement}`],
      });
    }
  }
  return blockedReferenceCount;
}

function scanCanonicalImports(item: LegacyRegistryItem, runtimeFiles: readonly SourceFile[], findings: LegacyPhaseoutFinding[]) {
  if (item.status !== "blocked") return 0;
  if (!item.blockedReferences.some((reference) => reference.startsWith("import ") || reference.startsWith("from "))) return 0;
  const importTargets = item.paths
    .filter((filePath) => filePath.startsWith("src/") && runtimeExtensions.has(extname(filePath)))
    .flatMap((filePath) => {
      const withoutExtension = filePath.replace(/\.(tsx?|jsx?)$/u, "");
      const srcAlias = withoutExtension.replace(/^src\//u, "@/");
      return [withoutExtension, srcAlias];
    });

  let importCount = 0;
  for (const file of runtimeFiles) {
    if (isAllowedLegacyReference(item, file.path)) continue;
    for (const importTarget of importTargets) {
      const doubleQuoted = `from "${importTarget}"`;
      const singleQuoted = `from '${importTarget}'`;
      if (!file.source.includes(doubleQuoted) && !file.source.includes(singleQuoted)) continue;
      importCount += 1;
      addFinding(findings, {
        severity: "critical",
        itemId: item.id,
        title: "Canonical runtime source imports blocked legacy",
        filePath: file.path,
        line: lineOf(file.source, importTarget),
        excerpt: excerptOf(file.source, importTarget),
        recommendation: `Route this code to ${item.canonicalReplacement} instead of importing blocked legacy.`,
        evidence: [importTarget],
      });
    }
  }
  return importCount;
}

function scanRegistryShape(item: LegacyRegistryItem, findings: LegacyPhaseoutFinding[]) {
  if ((item.status === "deprecated" || item.status === "remove_by_deadline") && !item.removeBy) {
    addFinding(findings, {
      severity: "warning",
      itemId: item.id,
      title: "Deprecated legacy item lacks removeBy deadline",
      recommendation: "Add removeBy so legacy debt cannot hide indefinitely.",
      evidence: [item.status],
    });
  }
  if (!item.ownerSurface || !item.canonicalReplacement) {
    addFinding(findings, {
      severity: "warning",
      itemId: item.id,
      title: "Legacy registry item lacks owner or canonical replacement",
      recommendation: "Add explicit ownership and replacement before relying on this registry item.",
      evidence: [`ownerSurface=${item.ownerSurface}`, `canonicalReplacement=${item.canonicalReplacement}`],
    });
  }
}

function scanDocs(findings: LegacyPhaseoutFinding[]) {
  const docs = readIfExists(LEGACY_PHASEOUT_DOC_PATH);
  if (!docs) {
    addFinding(findings, {
      severity: "warning",
      itemId: "registry",
      title: "Legacy phaseout docs are missing",
      filePath: LEGACY_PHASEOUT_DOC_PATH,
      recommendation: "Create docs so registry status, scoring, and next actions are visible to agents.",
      evidence: [LEGACY_PHASEOUT_DOC_PATH],
    });
    return;
  }

  for (const item of LEGACY_REGISTRY) {
    if (docs.includes(item.id)) continue;
    addFinding(findings, {
      severity: "warning",
      itemId: item.id,
      title: "Legacy docs do not list registry item",
      filePath: LEGACY_PHASEOUT_DOC_PATH,
      recommendation: "Update legacy phaseout docs with this registry item and replacement.",
      evidence: [item.id],
    });
  }
}

function buildScoredItem(item: LegacyRegistryItem, blockedReferenceCount: number, runtimeFiles: readonly SourceFile[], now: Date): LegacyPhaseoutScoredItem {
  const stagePenalty = LEGACY_STAGE_PENALTY[item.phaseOutStage];
  const riskWeight = getLegacyRiskWeight(item);
  const overdueMultiplier = getLegacyOverdueMultiplier(item, now);
  return {
    ...item,
    stagePenalty,
    riskWeight,
    overdueMultiplier,
    debtScore: Number((stagePenalty * riskWeight * overdueMultiplier).toFixed(2)),
    referenceCount: countAllowedReferences(item, runtimeFiles),
    blockedReferenceCount,
    overdueState: overdueStateFor(item, now),
  };
}

function buildNextActions(items: readonly LegacyPhaseoutScoredItem[], findings: readonly LegacyPhaseoutFinding[]) {
  const actions = new Set<string>();
  for (const finding of findings.filter((entry) => entry.severity === "critical")) {
    actions.add(`Resolve critical legacy reference for ${finding.itemId}: ${finding.recommendation}`);
  }
  for (const item of items.filter((entry) => entry.overdueState !== "current")) {
    actions.add(`Review overdue legacy item ${item.id}; replacement is ${item.canonicalReplacement}.`);
  }
  for (const item of items
    .filter((entry) => entry.phaseOutStage !== "removed" && entry.debtScore > 0)
    .sort((left, right) => right.debtScore - left.debtScore)
    .slice(0, 5)) {
    actions.add(`Phase out ${item.id} by ${item.removeBy}; owner surface ${item.ownerSurface}.`);
  }
  if (actions.size === 0) {
    actions.add("No critical legacy references found; continue scheduled review of documented phase-out deadlines.");
  }
  return Array.from(actions);
}

function buildReport(): LegacyPhaseoutReport {
  const now = new Date();
  const runtimeFiles = readSourceFiles(walkFiles("src", runtimeExtensions));
  const findings: LegacyPhaseoutFinding[] = [];
  scanDocs(findings);

  const items = LEGACY_REGISTRY.map((item) => {
    scanRegistryShape(item, findings);
    const blockedReferenceCount = scanBlockedReferences(item, runtimeFiles, findings)
      + scanCanonicalImports(item, runtimeFiles, findings);
    return buildScoredItem(item, blockedReferenceCount, runtimeFiles, now);
  });

  const legacyDebtScore = calculateLegacyDebtScore(LEGACY_REGISTRY, now);
  const blockedReferenceCount = items.reduce((total, item) => total + item.blockedReferenceCount, 0);
  const criticalCount = findings.filter((finding) => finding.severity === "critical").length;
  const overdueCount = items.filter((item) => item.overdueState !== "current").length;

  return {
    generatedAt: now.toISOString(),
    registryVersion,
    reportPath: LEGACY_PHASEOUT_REPORT_PATH,
    docsPath: LEGACY_PHASEOUT_DOC_PATH,
    legacyDebtScore,
    healthScore: Math.max(0, Math.round(100 - Math.min(90, legacyDebtScore))),
    status: criticalCount > 0 ? "fail" : legacyDebtScore > 0 || overdueCount > 0 ? "warning" : "pass",
    registryCount: LEGACY_REGISTRY.length,
    blockedReferenceCount,
    overdueCount,
    items,
    findings,
    nextActions: buildNextActions(items, findings),
    scoring: {
      formula: "legacyDebtScore = sum(stagePenalty * riskWeight * overdueMultiplier); blocked but referenced is critical",
      stagePenalty: LEGACY_STAGE_PENALTY,
      overdueMultiplier: {
        beforeReviewBy: 1,
        afterReviewBy: 1.5,
        afterRemoveBy: 3,
      },
    },
    commandBudget,
  };
}

function writeReport(report: LegacyPhaseoutReport) {
  const fullPath = join(root, LEGACY_PHASEOUT_REPORT_PATH);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

function printSummary(report: LegacyPhaseoutReport) {
  console.log(`Legacy phaseout debt: ${report.legacyDebtScore} (${report.status})`);
  console.log(`Registry items: ${report.registryCount}; blocked references: ${report.blockedReferenceCount}; overdue: ${report.overdueCount}`);
  for (const action of report.nextActions.slice(0, 5)) {
    console.log(`- ${action}`);
  }
}

const report = buildReport();
writeReport(report);
printSummary(report);
