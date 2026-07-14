import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  LEGACY_PHASEOUT_DOC_PATH,
  LEGACY_PHASEOUT_REPORT_PATH,
  LEGACY_REGISTRY,
  LEGACY_STAGE_PENALTY,
  calculateLegacyDebtScore,
  type LegacyPhaseOutStage,
  type LegacyRegistryStatus,
} from "../../src/lib/legacy/legacy-registry";

type LegacyPhaseoutFinding = {
  severity: "info" | "warning" | "critical";
  itemId: string;
  title: string;
  recommendation: string;
  evidence: string[];
};

type LegacyPhaseoutReport = {
  generatedAt: string;
  registryVersion: string;
  legacyDebtScore: number;
  healthScore: number;
  status: "pass" | "warning" | "fail";
  registryCount: number;
  blockedReferenceCount: number;
  overdueCount: number;
  items: Array<{
    id: string;
    status: LegacyRegistryStatus;
    phaseOutStage: LegacyPhaseOutStage;
    ownerSurface: string;
    reviewBy: string;
    removeBy: string;
    debtScore: number;
    blockedReferenceCount: number;
    overdueState: string;
  }>;
  findings: LegacyPhaseoutFinding[];
  nextActions: string[];
  scoring: {
    formula: string;
    stagePenalty: Record<string, number>;
  };
  commandBudget: {
    allowedCommands: string[];
    forbiddenCommands: string[];
  };
};

const root = process.cwd();
const failures: string[] = [];
const warnings: string[] = [];
const validStatuses = new Set(["allowed_fallback", "deprecated", "blocked", "remove_by_deadline", "canonical"]);
const validStages = new Set(["documented", "guarded", "redirected", "unused", "removed"]);

function fail(message: string) {
  failures.push(message);
}

function warn(message: string) {
  warnings.push(message);
}

function readRequired(filePath: string) {
  const fullPath = join(root, filePath);
  if (!existsSync(fullPath)) {
    fail(`Missing required file: ${filePath}`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
}

function requireIncludes(source: string, expected: string, label: string) {
  if (!source.includes(expected)) {
    fail(`${label} must include "${expected}".`);
  }
}

function requireNotIncludes(source: string, forbidden: string, label: string) {
  if (source.includes(forbidden)) {
    fail(`${label} must not include "${forbidden}".`);
  }
}

function parseReport() {
  const source = readRequired(LEGACY_PHASEOUT_REPORT_PATH);
  if (!source) return null;
  try {
    return JSON.parse(source) as LegacyPhaseoutReport;
  } catch (error) {
    fail(`${LEGACY_PHASEOUT_REPORT_PATH} must be valid JSON: ${(error as Error).message}`);
    return null;
  }
}

function validateDate(value: string, label: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00.000Z`))) {
    fail(`${label} must be YYYY-MM-DD.`);
  }
}

function validateRegistryItemIds() {
  const ids = LEGACY_REGISTRY.map((item) => item.id);
  if (new Set(ids).size !== ids.length) {
    fail("Legacy registry ids must be unique.");
  }

  for (const requiredId of [
    "drop-preview-modal-fallback",
    "drops-query-modal-flow",
    "synthetic-view-as-local-projection",
    "old-moderation-screenshot-certainty",
    "admin-users-realtime-route",
    "old-wallet-total-only-balance-chip",
    "old-green-bonus-chips",
    "notification-opened-read-score-split",
  ]) {
    if (!ids.includes(requiredId)) {
      fail(`Legacy registry must include initial item ${requiredId}.`);
    }
  }
}

function validateRegistryShape() {
  validateRegistryItemIds();
  for (const item of LEGACY_REGISTRY) {
    for (const [key, value] of Object.entries(item)) {
      if (Array.isArray(value)) {
        if (value.length === 0) fail(`${item.id}.${key} must not be empty.`);
        continue;
      }
      if (typeof value !== "string" || value.trim().length === 0) {
        fail(`${item.id}.${key} must be a non-empty string.`);
      }
    }
    if (!validStatuses.has(item.status)) {
      fail(`${item.id}.status is invalid.`);
    }
    if (!validStages.has(item.phaseOutStage)) {
      fail(`${item.id}.phaseOutStage is invalid.`);
    }
    validateDate(item.createdAt, `${item.id}.createdAt`);
    validateDate(item.reviewBy, `${item.id}.reviewBy`);
    validateDate(item.removeBy, `${item.id}.removeBy`);
    if (Date.parse(item.removeBy) < Date.parse(item.reviewBy)) {
      fail(`${item.id}.removeBy must be on or after reviewBy.`);
    }
    if ((item.status === "deprecated" || item.status === "remove_by_deadline") && !item.removeBy) {
      warn(`${item.id} is deprecated/remove_by_deadline and lacks removeBy.`);
    }
  }

  const retiredUnsafeProjection = LEGACY_REGISTRY.find((item) => item.id === "synthetic-view-as-local-projection");
  if (retiredUnsafeProjection?.status !== "blocked" || retiredUnsafeProjection.phaseOutStage !== "removed") {
    fail("synthetic-view-as-local-projection must remain blocked with its unsafe semantics marked removed.");
  }
  if (retiredUnsafeProjection?.blockedReferences.includes("includeInUserBehavior: true")) {
    fail("synthetic-view-as-local-projection must delegate generic user-behavior eligibility to the canonical Admin projection exclusion owner.");
  }
}

function validateReport(report: LegacyPhaseoutReport | null) {
  if (!report) return;
  if (report.registryVersion !== "legacy-phaseout-v1") {
    fail("legacy phaseout report must use registryVersion legacy-phaseout-v1.");
  }
  if (report.registryCount !== LEGACY_REGISTRY.length) {
    fail("legacy phaseout report registryCount must match LEGACY_REGISTRY length.");
  }
  if (report.legacyDebtScore !== calculateLegacyDebtScore(LEGACY_REGISTRY, new Date(report.generatedAt))) {
    fail("legacyDebtScore must match sum(stagePenalty * riskWeight * overdueMultiplier).");
  }
  if (typeof report.healthScore !== "number" || report.healthScore < 0 || report.healthScore > 100) {
    fail("healthScore must be 0..100.");
  }
  if (!["pass", "warning", "fail"].includes(report.status)) {
    fail("status must be pass, warning, or fail.");
  }
  if (!Array.isArray(report.items) || report.items.length !== LEGACY_REGISTRY.length) {
    fail("report.items must include every registry item.");
  }
  const retiredUnsafeProjection = report.items.find((item) => item.id === "synthetic-view-as-local-projection");
  if (!retiredUnsafeProjection || retiredUnsafeProjection.debtScore !== 0 || retiredUnsafeProjection.overdueState !== "current") {
    fail("retired unsafe Admin projection semantics must have zero debt and no overdue state.");
  }
  if ((retiredUnsafeProjection?.blockedReferenceCount ?? 0) !== 0) {
    fail("retired unsafe Admin projection semantics must have no current runtime references.");
  }
  if (!Array.isArray(report.findings)) {
    fail("report.findings must be an array.");
  } else {
    const criticalFindings = report.findings.filter((finding) => finding.severity === "critical");
    if (criticalFindings.length > 0) {
      fail(`Blocked legacy appears in runtime path: ${criticalFindings.map((finding) => finding.itemId).join(", ")}.`);
    }
  }
  if (!Array.isArray(report.nextActions) || report.nextActions.length === 0) {
    fail("report.nextActions must list phase-out next actions.");
  } else {
    for (const item of report.items.filter((entry) => entry.phaseOutStage === "removed")) {
      if (report.nextActions.some((action) => action.includes(item.id))) {
        fail(`report.nextActions must not ask operators to phase out removed item ${item.id}.`);
      }
    }
  }
  if (report.scoring.formula !== "legacyDebtScore = sum(stagePenalty * riskWeight * overdueMultiplier); blocked but referenced is critical") {
    fail("report.scoring.formula must document the required legacy debt formula.");
  }
  for (const [stage, penalty] of Object.entries(LEGACY_STAGE_PENALTY)) {
    if (report.scoring.stagePenalty[stage] !== penalty) {
      fail(`report.scoring.stagePenalty.${stage} must equal ${penalty}.`);
    }
  }
  for (const forbidden of ["playwright", "cypress", "lighthouse", "npm run check"]) {
    if (!report.commandBudget.forbiddenCommands.includes(forbidden)) {
      fail(`commandBudget.forbiddenCommands must include ${forbidden}.`);
    }
  }
}

validateRegistryShape();
const report = parseReport();
validateReport(report);

const packageJson = JSON.parse(readRequired("package.json") || "{}") as { scripts?: Record<string, string> };
const registrySource = readRequired("src/lib/legacy/legacy-registry.ts");
const scorerSource = readRequired("scripts/agent/score-legacy-phaseout.ts");
const validatorSource = readRequired("scripts/agent/validate-legacy-phaseout.ts");
const orphanScorerSource = readRequired("scripts/agent/score-orphaned-logic.ts");
const docs = readRequired(LEGACY_PHASEOUT_DOC_PATH);
const orphanDocs = readRequired("docs/agent-truth/orphaned-logic-score.md");
const fullAudit = readRequired("FULL_SCALE_CODEBASE_AUDIT.md");
const memory = readRequired("REPO_MEMORY_LEDGER.md");
const checklist = readRequired("EVERY_FILE_FUNCTION_CHECKLIST.md");

if (packageJson.scripts?.["score:legacy-phaseout"] !== "tsx scripts/agent/score-legacy-phaseout.ts") {
  fail("package.json must expose score:legacy-phaseout.");
}
if (packageJson.scripts?.["check:legacy-phaseout"] !== "tsx scripts/agent/validate-legacy-phaseout.ts") {
  fail("package.json must expose check:legacy-phaseout.");
}

for (const expected of [
  "LegacyRegistryItem",
  "LEGACY_REGISTRY",
  "LEGACY_STAGE_PENALTY",
  "calculateLegacyDebtScore",
  "drop-preview-modal-fallback",
  "synthetic-view-as-local-projection",
  "old-moderation-screenshot-certainty",
  "old-wallet-total-only-balance-chip",
  "notification-opened-read-score-split",
]) {
  requireIncludes(registrySource, expected, "legacy registry");
}

for (const expected of [
  "legacyDebtScore = sum(stagePenalty * riskWeight * overdueMultiplier)",
  "scanBlockedReferences",
  "scanCanonicalImports",
  "nextActions",
  "blocked but referenced is critical",
  "LEGACY_PHASEOUT_REPORT_PATH",
]) {
  requireIncludes(scorerSource, expected, "legacy phaseout scorer");
}

for (const forbidden of ["node:child_process", "execSync", "spawnSync", "spawn("]) {
  requireNotIncludes(scorerSource, forbidden, "legacy phaseout scorer");
}

requireIncludes(orphanScorerSource, "legacy phase-out registry", "orphaned logic scorer integration");

for (const item of LEGACY_REGISTRY) {
  requireIncludes(docs, item.id, "legacy phaseout docs");
}
for (const expected of [
  "score:legacy-phaseout",
  "check:legacy-phaseout",
  "blocked but referenced is critical",
  "DropPreviewModal",
  "notification_read",
  "admin creator projection",
  "theft-risk scoring",
  "hot-cache",
]) {
  requireIncludes(docs, expected, "legacy phaseout docs");
}
for (const source of [orphanDocs, fullAudit, memory, checklist]) {
  requireIncludes(source, "KandyDrops legacy phaseout is a hardcoded registry", "governance docs");
}

if (warnings.length > 0) {
  console.warn("Legacy phaseout warnings:");
  for (const warning of warnings) {
    console.warn(`- ${warning}`);
  }
}

if (failures.length > 0) {
  console.error("Legacy phaseout validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Legacy phaseout registry validated.");
