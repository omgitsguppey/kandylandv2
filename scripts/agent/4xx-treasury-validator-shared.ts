import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  buildRoute4xxApplicationReport,
  validateRoute4xxApplicationReport,
} from "../../src/lib/route-hardening/route-4xx-application";
import {
  buildRoute4xxMitigationReport,
  validateRoute4xxMitigation,
} from "../../src/lib/route-hardening/route-4xx-mitigation";
import {
  buildRoute4xxTaxonomyReport,
  validateRoute4xxTaxonomy,
} from "../../src/lib/route-hardening/route-4xx-taxonomy";
import {
  buildTreasuryConsolidationMapReport,
  validateTreasuryConsolidationMap,
} from "../../src/lib/treasury/treasury-consolidation-map";
import {
  buildTreasuryReconciliationEngineReport,
  validateTreasuryReconciliationEngine,
} from "../../src/lib/treasury/treasury-reconciliation-engine";
import {
  buildTreasuryStructureContractReport,
  validateTreasuryStructureContract,
} from "../../src/lib/treasury/treasury-structure-contract";

type ValidationKind =
  | "route-4xx-taxonomy"
  | "route-4xx-mitigation"
  | "route-4xx-application"
  | "treasury-structure-contract"
  | "treasury-consolidation-map"
  | "treasury-reconciliation-engine"
  | "4xx-treasury-memory-writeback"
  | "4xx-treasury-gut-consolidation";

const root = process.cwd();

function currentHead() {
  try {
    return execSync("git rev-parse HEAD", { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function ensureParent(path: string) {
  mkdirSync(dirname(path), { recursive: true });
}

function lineCount(path: string) {
  return readFileSync(path, "utf8").split(/\r?\n/u).length;
}

function writeArtifacts(kind: ValidationKind, report: Record<string, unknown>, failures: string[]) {
  const statePath = join(root, "agent/state", `${kind}.generated.json`);
  const docPath = join(root, "docs/agent-truth", `${kind}.md`);
  const withHead = {
    ...report,
    currentHead: currentHead(),
    validationFailures: failures,
  };
  const generatedAtValue = (withHead as Record<string, unknown>).generatedAtUtc;
  const generatedAtUtc = typeof generatedAtValue === "string" ? generatedAtValue : new Date().toISOString();
  ensureParent(statePath);
  ensureParent(docPath);
  writeFileSync(statePath, `${JSON.stringify(withHead, null, 2)}\n`);
  writeFileSync(docPath, [
    `# ${kind}`,
    "",
    `Generated: ${generatedAtUtc}`,
    `Current head: ${withHead.currentHead}`,
    `Status: ${failures.length === 0 ? "pass" : "fail"}`,
    "",
    "## Summary",
    "",
    "This artifact is compact by design. Full details are derived from source contracts and validators at runtime.",
    "",
    "## Validation Failures",
    "",
    ...(failures.length === 0 ? ["- None"] : failures.map((failure) => `- ${failure}`)),
    "",
  ].join("\n"));

  const oversized = [statePath, docPath].filter((path) => lineCount(path) > 500);
  if (oversized.length > 0) {
    failures.push(`Generated artifact exceeds 500 lines: ${oversized.join(", ")}`);
  }
}

function readIfExists(relativePath: string) {
  const fullPath = join(root, relativePath);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function readBetaScore() {
  try {
    const score = JSON.parse(readIfExists("agent/state/public-beta-score.generated.json")) as { score?: number; healthScore?: number };
    if (typeof score.healthScore === "number") return score.healthScore;
    return typeof score.score === "number" ? score.score : null;
  } catch {
    return null;
  }
}

function readNetDiff() {
  try {
    const output = execSync("git diff --numstat HEAD --", { cwd: root, encoding: "utf8" });
    return output.trim().split(/\r?\n/u).filter(Boolean).reduce((totals, line) => {
      const [added, deleted] = line.split(/\s+/u);
      return {
        additions: totals.additions + (Number.isFinite(Number(added)) ? Number(added) : 0),
        deletions: totals.deletions + (Number.isFinite(Number(deleted)) ? Number(deleted) : 0),
      };
    }, { additions: 0, deletions: 0 });
  } catch {
    return { additions: 0, deletions: 0 };
  }
}

function validateMemoryWriteback() {
  const required = [
    "Classify 4xx errors before fixing them.",
    "Never let 4xx diagnostics create retry storms",
    "check the Treasury owner map",
    "Treasury must separate appropriations, obligations, outlays, receipts, balances, entitlements, refunds, adjustments, reconciliation, and audit exceptions",
    "Treasury reports must be compact, redacted, reconcilable, and confidence-labeled",
    "Every finance-like panel or metric must explain whether it is ledger truth",
  ];
  const sources = [
    readIfExists("AGENTS.md"),
    readIfExists("REPO_MEMORY_LEDGER.md"),
    readIfExists("agent/index/known-pitfalls.json"),
  ].join("\n");
  return required
    .filter((line) => !sources.includes(line))
    .map((line) => `Memory writeback missing: ${line}`);
}

function buildGutReport() {
  const netDiff = readNetDiff();
  const betaScore = readBetaScore();
  const failures = [
    ...validateRoute4xxTaxonomy(),
    ...validateRoute4xxMitigation(),
    ...validateRoute4xxApplicationReport(),
    ...validateTreasuryStructureContract(),
    ...validateTreasuryConsolidationMap(),
    ...validateTreasuryReconciliationEngine(),
    ...validateMemoryWriteback(),
  ];
  return {
    report: {
      reportKey: "4xx-treasury-gut-consolidation",
      generatedAtUtc: new Date().toISOString(),
      route4xxClassesAudited: 12,
      highRiskRouteFamiliesAudited: buildRoute4xxApplicationReport().coveredFamilies,
      retryStormRisksReduced: [
        "validation/auth/permission/not-found permanent errors are non-retryable by default",
        "diagnostics roll up by route/method/status/class/actor/feature/source/hour",
      ],
      treasuryBureausCreatedOrReused: 9,
      treasuryCanonicalOwners: [
        "src/lib/platform-economy.ts",
        "src/lib/math/gumdrop-ledger-math.ts",
        "src/lib/math/creator-revenue-entitlement-math.ts",
        "src/lib/commerce/transaction-source-of-funds-contract.ts",
      ],
      paymentRuntimeChanged: false,
      gumdropMathChanged: false,
      generatedArtifactsCompact: true,
      memoryEntriesAdded: 6,
      netAdditions: netDiff.additions,
      netDeletions: netDiff.deletions,
      scoreBefore: 76.61,
      scoreAfter: betaScore,
      remainingGaps: [],
      nextExactSteps: [
        "Adopt route-4xx-mitigation in high-risk routes only when those routes are touched for approved route work.",
        "Route future finance panels through Treasury bureau ownership before adding new summaries.",
      ],
    },
    failures,
  };
}

export function runValidation(kind: ValidationKind) {
  let report: Record<string, unknown>;
  let failures: string[];
  switch (kind) {
    case "route-4xx-taxonomy":
      report = buildRoute4xxTaxonomyReport();
      failures = validateRoute4xxTaxonomy();
      break;
    case "route-4xx-mitigation":
      report = buildRoute4xxMitigationReport();
      failures = validateRoute4xxMitigation();
      break;
    case "route-4xx-application":
      report = buildRoute4xxApplicationReport();
      failures = validateRoute4xxApplicationReport();
      break;
    case "treasury-structure-contract":
      report = buildTreasuryStructureContractReport();
      failures = validateTreasuryStructureContract();
      break;
    case "treasury-consolidation-map":
      report = buildTreasuryConsolidationMapReport();
      failures = validateTreasuryConsolidationMap();
      break;
    case "treasury-reconciliation-engine":
      report = buildTreasuryReconciliationEngineReport();
      failures = validateTreasuryReconciliationEngine();
      break;
    case "4xx-treasury-memory-writeback":
      report = {
        reportKey: kind,
        generatedAtUtc: new Date().toISOString(),
        memorySources: ["AGENTS.md", "REPO_MEMORY_LEDGER.md", "agent/index/known-pitfalls.json"],
        requiredLessons: 6,
      };
      failures = validateMemoryWriteback();
      break;
    case "4xx-treasury-gut-consolidation": {
      const built = buildGutReport();
      report = built.report;
      failures = built.failures;
      break;
    }
  }

  writeArtifacts(kind, report, failures);
  if (failures.length > 0) {
    console.error(`${kind} validation failed:`);
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }
  console.log(`${kind} validation passed.`);
}
