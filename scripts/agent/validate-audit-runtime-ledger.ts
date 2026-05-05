import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import {
  AUDIT_RUNTIME_DOC_PATH,
  AUDIT_RUNTIME_LEDGER_PATH,
  AUDIT_RUNTIME_SUMMARY_PATH,
  parseAuditRuntimeLedgerLine,
} from "../../src/lib/agent-audit/audit-runtime-contract";

const root = process.cwd();
const failures: string[] = [];

function fail(message: string) {
  failures.push(message);
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

function requireJsonObject(filePath: string) {
  const source = readRequired(filePath);
  if (!source) return null;
  try {
    const parsed = JSON.parse(source) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      fail(`${filePath} must be a JSON object, not an array.`);
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    fail(`${filePath} must be valid JSON: ${(error as Error).message}`);
    return null;
  }
}

function requireArrayField(record: Record<string, unknown> | null, field: string) {
  if (!record) return;
  if (!Array.isArray(record[field])) {
    fail(`${AUDIT_RUNTIME_SUMMARY_PATH}.${field} must be an array.`);
  }
}

const contract = readRequired("src/lib/agent-audit/audit-runtime-contract.ts");
const scorer = readRequired("src/lib/agent-audit/audit-speed-score.ts");
const runner = readRequired("scripts/agent/run-audit-with-ledger.ts");
const scoreScript = readRequired("scripts/agent/score-audit-runtime.ts");
const validator = readRequired("scripts/agent/validate-audit-runtime-ledger.ts");
const docs = readRequired(AUDIT_RUNTIME_DOC_PATH);
const packageJsonSource = readRequired("package.json");

let packageJson: { scripts?: Record<string, string> } | null = null;
try {
  packageJson = JSON.parse(packageJsonSource) as { scripts?: Record<string, string> };
} catch (error) {
  fail(`package.json must be valid JSON: ${(error as Error).message}`);
}

const expectedScripts: Record<string, string> = {
  "audit:run": "tsx scripts/agent/run-audit-with-ledger.ts",
  "score:audit-runtime": "tsx scripts/agent/score-audit-runtime.ts",
  "check:audit-runtime-ledger": "tsx scripts/agent/validate-audit-runtime-ledger.ts",
};

for (const [scriptName, command] of Object.entries(expectedScripts)) {
  if (packageJson?.scripts?.[scriptName] !== command) {
    fail(`package.json must expose "${scriptName}": "${command}".`);
  }
}

for (const field of [
  "runId",
  "auditName",
  "startedAt",
  "endedAt",
  "durationMs",
  "changedFiles",
  "inspectedFiles",
  "terminalCommands",
  "forbiddenCommandsAttempted",
  "cacheKey",
  "cacheHit",
  "findingsCount",
  "criticalCount",
  "majorCount",
  "accuracyStatus",
  "resourceClass",
  "triggerReason",
]) {
  requireIncludes(contract, field, "audit runtime contract");
}

for (const expected of [
  "100 -",
  "entry.durationMs / 1000",
  "terminalCommandCount * 4",
  "forbiddenCommandCount * 25",
  "calculateInspectedFileCountPenalty",
  "falsePositivePenalty",
  "cacheHitBonus",
  "confirmedFindingBonus",
  "confirmedFindings / Math.max(1, confirmedFindings + falsePositiveFindings)",
  "criticalFindingsConfirmed * 5",
  "falsePositiveFindings * 2",
  "entry.durationMs / 30_000",
]) {
  requireIncludes(scorer, expected, "audit speed scorer formula");
}

for (const expected of [
  "appendFileSync",
  "serializeAuditRuntimeLedgerEntry(entry)",
  "resolveDirectValidatorPath",
  "detectForbiddenAuditCommands",
  "forbiddenCommandsAttempted",
  "inferInspectedFilesFromScript",
  "spawnSync",
  "cacheHit",
]) {
  requireIncludes(runner, expected, "audit runtime runner");
}

for (const expected of [
  "slowestAudits",
  "mostUsefulAudits",
  "leastUsefulAudits",
  "mostFalsePositiveAudits",
  "terminalHeavyAudits",
]) {
  requireIncludes(scoreScript, expected, "audit runtime score script");
  requireIncludes(docs, expected, "audit runtime docs");
}
requireIncludes(scoreScript, "writeSummary", "audit runtime score script");

const ledgerSource = readRequired(AUDIT_RUNTIME_LEDGER_PATH);
if (ledgerSource.trimStart().startsWith("[")) {
  fail(`${AUDIT_RUNTIME_LEDGER_PATH} must be JSONL, not a giant JSON array.`);
}

const ledgerLines = ledgerSource.split(/\r?\n/u).filter((line) => line.trim().length > 0);
for (const [index, line] of ledgerLines.entries()) {
  const parsed = parseAuditRuntimeLedgerLine(line, index + 1);
  if (parsed.error) {
    fail(parsed.error);
  }
}

const summary = requireJsonObject(AUDIT_RUNTIME_SUMMARY_PATH);
for (const field of [
  "slowestAudits",
  "mostUsefulAudits",
  "leastUsefulAudits",
  "mostFalsePositiveAudits",
  "terminalHeavyAudits",
  "auditScores",
]) {
  requireArrayField(summary, field);
}

for (const expected of [
  "JSONL",
  "append-only",
  "npm run audit:run -- --audit check:wallet-density",
  "accuracyStatus",
  "resourceClass",
  "No validator should write a giant report without runtime metadata",
]) {
  requireIncludes(docs, expected, "audit runtime docs");
}

const validatorFiles = readdirSync(join(root, "scripts", "agent"))
  .filter((fileName) => /^validate-.+\.ts$/u.test(fileName))
  .map((fileName) => `scripts/agent/${fileName}`);
if (validatorFiles.length === 0) {
  fail("No scripts/agent validators were detected.");
}
for (const validatorPath of validatorFiles) {
  if (!runner.includes("resolveDirectValidatorPath") || !validatorPath.startsWith("scripts/agent/")) {
    fail(`${validatorPath} must be runnable through audit:run direct validator resolution.`);
  }
}

for (const forbidden of ["playwright", "lighthouse", "cypress", "full_npm_check"]) {
  requireIncludes(contract, forbidden, "audit runtime forbidden command contract");
}
requireIncludes(validator, "JSONL, not a giant JSON array", "audit runtime validator");

if (failures.length > 0) {
  console.error("Audit runtime ledger validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Audit runtime ledger validation passed for ${ledgerLines.length} ledger runs.`);
