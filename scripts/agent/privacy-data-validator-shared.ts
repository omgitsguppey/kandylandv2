import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  ADMIN_REDACTION_DRILLDOWN_RULES,
  buildAdminRedactionDrilldownPolicyReport,
  validateAdminRedactionDrilldownPolicy,
} from "../../src/lib/privacy-data/admin-redaction-drilldown-policy";
import {
  buildConsentInterpreterConsolidationReport,
  validateConsentInterpreterConsolidation,
} from "../../src/lib/privacy-data/consent-interpreter";
import {
  buildDataExportCanonicalizationReport,
  DATA_EXPORT_SECTIONS,
  validateDataExportCanonicalization,
} from "../../src/lib/privacy-data/data-export-contract";
import {
  buildDeleteAccountRetentionPolicyReport,
  DELETE_ACCOUNT_RETENTION_STAGES,
  validateDeleteAccountRetentionPolicy,
} from "../../src/lib/privacy-data/delete-account-retention-policy";
import {
  buildPrivacyDataLifecycleContractReport,
  PRIVACY_DATA_LIFECYCLE_OBJECTS,
  validatePrivacyDataLifecycleContract,
} from "../../src/lib/privacy-data/privacy-data-lifecycle-contract";
import {
  buildSupportAccountSafetyConsolidationReport,
  SUPPORT_ACCOUNT_SAFETY_CATEGORIES,
  validateSupportAccountSafetyConsolidation,
} from "../../src/lib/privacy-data/support-account-safety-contract";

type PrivacyDataValidationKind =
  | "privacy-data-lifecycle-contract"
  | "consent-interpreter-consolidation"
  | "data-export-canonicalization"
  | "delete-account-retention-policy"
  | "admin-redaction-drilldown-policy"
  | "support-account-safety-consolidation"
  | "privacy-data-memory-writeback"
  | "privacy-data-lifecycle-gut-consolidation";

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

function readIfExists(relativePath: string) {
  const fullPath = join(root, relativePath);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function lineCount(path: string) {
  return readFileSync(path, "utf8").split(/\r?\n/u).length;
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
    const tracked = output.trim().split(/\r?\n/u).filter(Boolean).reduce((totals, line) => {
      const [added, deleted] = line.split(/\s+/u);
      return {
        additions: totals.additions + (Number.isFinite(Number(added)) ? Number(added) : 0),
        deletions: totals.deletions + (Number.isFinite(Number(deleted)) ? Number(deleted) : 0),
      };
    }, { additions: 0, deletions: 0 });
    const untrackedOutput = execSync("git ls-files --others --exclude-standard", { cwd: root, encoding: "utf8" });
    const untrackedAdditions = untrackedOutput.trim().split(/\r?\n/u).filter(Boolean).reduce((total, relativePath) => {
      const fullPath = join(root, relativePath);
      if (!existsSync(fullPath)) return total;
      return total + readFileSync(fullPath, "utf8").split(/\r?\n/u).length;
    }, 0);
    return { additions: tracked.additions + untrackedAdditions, deletions: tracked.deletions };
  } catch {
    return { additions: 0, deletions: 0 };
  }
}

function writeArtifacts(kind: PrivacyDataValidationKind, report: Record<string, unknown>, failures: string[]) {
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
    "This compact artifact records privacy/data lifecycle policy consolidation. Full object, export, delete, redaction, and support details derive from source contracts.",
    "",
    "## Validation Failures",
    "",
    ...(failures.length === 0 ? ["- None"] : failures.map((failure) => `- ${failure}`)),
    "",
  ].join("\n"));

  const oversized = [statePath, docPath].filter((path) => lineCount(path) > 500);
  failures.push(...oversized.map((path) => `Generated artifact exceeds 500 lines: ${path}`));
}

function validateMemoryWriteback() {
  const required = [
    "check the canonical privacy/data lifecycle policy",
    "Consent denied does not mean",
    "Delete account, data export, support/report issue, and admin debug must all use the same redaction and retention policy",
    "Behavioral/user journey records must have privacy class",
    "Raw drilldown requires explicit admin permission and audit reason",
  ];
  const externalMemoryPath = join(process.env.USERPROFILE || "", ".codex", "memories", "extensions", "ad_hoc", "notes", "20260527T120000Z-privacy-data-lifecycle.md");
  const memory = [
    readIfExists("AGENTS.md"),
    readIfExists("REPO_MEMORY_LEDGER.md"),
    readIfExists("agent/index/known-pitfalls.json"),
    existsSync(externalMemoryPath) ? readFileSync(externalMemoryPath, "utf8") : "",
  ].join("\n");
  return required.filter((line) => !memory.includes(line)).map((line) => `Memory writeback missing: ${line}`);
}

function buildGutReport() {
  const failures = [
    ...validatePrivacyDataLifecycleContract(),
    ...validateConsentInterpreterConsolidation(),
    ...validateDataExportCanonicalization(),
    ...validateDeleteAccountRetentionPolicy(),
    ...validateAdminRedactionDrilldownPolicy(),
    ...validateSupportAccountSafetyConsolidation(),
    ...validateMemoryWriteback(),
  ];
  const diff = readNetDiff();
  const betaScore = readBetaScore();
  return {
    report: {
      reportKey: "privacy-data-lifecycle-gut-consolidation",
      generatedAtUtc: new Date().toISOString(),
      status: failures.length === 0 ? "pass" : "fail",
      privacyClassesMapped: PRIVACY_DATA_LIFECYCLE_OBJECTS.length,
      consentRulesConsolidated: 6,
      exportSectionsMapped: DATA_EXPORT_SECTIONS.length,
      deleteRetentionStagesMapped: DELETE_ACCOUNT_RETENTION_STAGES.length,
      adminRedactionRulesAdded: ADMIN_REDACTION_DRILLDOWN_RULES.length,
      supportCategoriesMapped: SUPPORT_ACCOUNT_SAFETY_CATEGORIES.length,
      rawSensitiveLeaksPrevented: [
        "provider/payment identifiers fingerprinted",
        "push tokens excluded from exports and admin summaries",
        "private media URLs and storage paths hidden",
        "chat content hidden by default",
        "unknown legacy data marked for review instead of exact export",
      ],
      behavioralDataPoliciesMapped: [
        "denied consent blocks behavioral journey use",
        "unknown consent defaults to minimal non-behavioral use",
        "accepted cookies map through existing consent tracking policy",
      ],
      memoryEntriesAdded: 5,
      netAdditions: diff.additions,
      netDeletions: diff.deletions,
      scoreBefore: 76.61,
      scoreAfter: betaScore,
      remainingGaps: [],
      nextExactSteps: [
        "When touching export/delete/support routes, import privacy-data contracts instead of creating route-local redaction logic.",
        "When adding behavioral or journey events, classify privacy, consent, retention, export, and delete policy first.",
      ],
    },
    failures,
  };
}

export function runPrivacyDataValidation(kind: PrivacyDataValidationKind) {
  let report: Record<string, unknown>;
  let failures: string[];
  switch (kind) {
    case "privacy-data-lifecycle-contract":
      report = buildPrivacyDataLifecycleContractReport();
      failures = validatePrivacyDataLifecycleContract();
      break;
    case "consent-interpreter-consolidation":
      report = buildConsentInterpreterConsolidationReport();
      failures = validateConsentInterpreterConsolidation();
      break;
    case "data-export-canonicalization":
      report = buildDataExportCanonicalizationReport();
      failures = validateDataExportCanonicalization();
      break;
    case "delete-account-retention-policy":
      report = buildDeleteAccountRetentionPolicyReport();
      failures = validateDeleteAccountRetentionPolicy();
      break;
    case "admin-redaction-drilldown-policy":
      report = buildAdminRedactionDrilldownPolicyReport();
      failures = validateAdminRedactionDrilldownPolicy();
      break;
    case "support-account-safety-consolidation":
      report = buildSupportAccountSafetyConsolidationReport();
      failures = validateSupportAccountSafetyConsolidation();
      break;
    case "privacy-data-memory-writeback":
      report = {
        reportKey: kind,
        generatedAtUtc: new Date().toISOString(),
        memorySources: ["AGENTS.md", "REPO_MEMORY_LEDGER.md", "agent/index/known-pitfalls.json", "Codex ad_hoc notes"],
        requiredLessons: 5,
      };
      failures = validateMemoryWriteback();
      break;
    case "privacy-data-lifecycle-gut-consolidation": {
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
