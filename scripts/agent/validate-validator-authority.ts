import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  VALIDATOR_AUTHORITY_PATH,
  listStandaloneValidatorFiles,
  listValidatorPackageScripts,
  readRootPackageScripts,
  readValidatorAuthority,
  resolvePackageScriptValidatorFiles,
  type ValidatorAuthorityDocument,
  type ValidatorAuthorityLevel,
  type ValidatorAuthorityPackageScriptEntry,
  type ValidatorAuthorityStatus,
  type ValidatorAuthorityValidatorEntry,
} from "./validator-authority-shared";

const root = process.cwd();
const failures: string[] = [];

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), "utf8");
}

function fail(message: string) {
  failures.push(message);
}

function requireIncludes(source: string, needle: string, label: string) {
  if (!source.includes(needle)) {
    fail(`${label} must include "${needle}".`);
  }
}

function expectedAuthorityForStatus(status: ValidatorAuthorityStatus): ValidatorAuthorityLevel[] {
  if (status === "canonical") return ["canonical_contract"];
  if (status === "supporting") return ["supporting_contract", "supporting_score"];
  if (status === "legacy") return ["legacy_reference"];
  return ["blocked_reference"];
}

function validateEntryShape(
  key: string,
  entry: ValidatorAuthorityValidatorEntry | ValidatorAuthorityPackageScriptEntry,
) {
  if (!entry.surface.trim()) {
    fail(`${key} must declare a surface.`);
  }
  if (!entry.reason.trim()) {
    fail(`${key} must declare a reason.`);
  }
  if (entry.canonicalContracts.length === 0) {
    fail(`${key} must declare canonical contracts.`);
  }
  if (!expectedAuthorityForStatus(entry.status).includes(entry.authority)) {
    fail(`${key} has mismatched authority ${entry.authority} for status ${entry.status}.`);
  }
}

function validateAdminAnalyticsContracts(filePath: string, entry: ValidatorAuthorityValidatorEntry, source: string) {
  if (!filePath.includes("admin-analytics")) {
    return;
  }

  for (const contract of [
    "src/lib/admin-analytics-contracts.ts",
    "src/lib/server/admin-user-truth-snapshot.ts",
    "src/lib/server/user-behavior-truth-rollup.ts",
  ]) {
    if (!entry.canonicalContracts.includes(contract)) {
      fail(`${filePath} must declare ${contract} as a canonical contract.`);
    }
  }

  const hasCanonicalReference =
    source.includes("src/lib/admin-analytics-contracts.ts")
    || source.includes("src/lib/server/admin-user-truth-snapshot.ts")
    || source.includes("src/lib/server/user-behavior-truth-rollup.ts")
    || source.includes("src/lib/server/admin-analytics-snapshots.ts")
    || source.includes("adminMetricSnapshot")
    || source.includes("resolveAdminAnalyticsDisplayState")
    || source.includes("AdminMetricSnapshot");
  if (!hasCanonicalReference) {
    fail(`${filePath} must reference canonical snapshot or rollup contracts in source.`);
  }
}

function validateServerTruthPriority(filePath: string, entry: ValidatorAuthorityValidatorEntry, source: string) {
  if (filePath.includes("purchase")) {
    for (const contract of [
      "src/app/api/paypal/capture/route.ts",
      "src/lib/server/gumdrop-ledger.ts",
      "src/lib/behavioral/metric-fact-contract.ts",
    ]) {
      if (!entry.canonicalContracts.includes(contract)) {
        fail(`${filePath} must declare ${contract} as purchase server truth.`);
      }
    }
    requireIncludes(source, "server_purchase", filePath);
  }

  if (filePath.includes("unlock")) {
    for (const contract of [
      "src/app/api/drops/unlock/route.ts",
      "src/lib/behavioral/metric-fact-contract.ts",
    ]) {
      if (!entry.canonicalContracts.includes(contract)) {
        fail(`${filePath} must declare ${contract} as unlock server truth.`);
      }
    }
    requireIncludes(source, "entitlement", filePath);
  }

  if (filePath.includes("watch-time") || filePath.includes("viewer")) {
    for (const contract of [
      "src/hooks/useViewerWatchSession.ts",
      "src/lib/viewer-watch-session.ts",
      "src/app/api/viewer/watch-session/route.ts",
    ]) {
      if (!entry.canonicalContracts.includes(contract)) {
        fail(`${filePath} must declare ${contract} as watch-session truth.`);
      }
    }
    requireIncludes(source, "watch_session", filePath);
  }
}

const authority = readValidatorAuthority();
const packageScripts = readRootPackageScripts();
const validatorFiles = listStandaloneValidatorFiles();
const validatorPackageScripts = listValidatorPackageScripts(packageScripts);

if (authority.version < 2) {
  fail(`${VALIDATOR_AUTHORITY_PATH} must be upgraded to version 2.`);
}

for (const [filePath, entry] of Object.entries(authority.validators)) {
  validateEntryShape(filePath, entry);
}
for (const [scriptName, entry] of Object.entries(authority.packageScripts)) {
  validateEntryShape(scriptName, entry);
}

for (const filePath of validatorFiles) {
  const entry = authority.validators[filePath];
  if (!entry) {
    fail(`Validator authority is missing ${filePath}.`);
    continue;
  }

  const source = read(filePath);
  validateAdminAnalyticsContracts(filePath, entry, source);
  validateServerTruthPriority(filePath, entry, source);
}

for (const scriptName of validatorPackageScripts) {
  const entry = authority.packageScripts[scriptName];
  if (!entry) {
    fail(`Validator authority is missing package script ${scriptName}.`);
    continue;
  }

  const resolvedFiles = resolvePackageScriptValidatorFiles(packageScripts, scriptName).sort((left, right) => left.localeCompare(right));
  const declaredFiles = [...entry.validators].sort((left, right) => left.localeCompare(right));
  if (JSON.stringify(resolvedFiles) !== JSON.stringify(declaredFiles)) {
    fail(`${scriptName} validator file set is stale. Expected ${resolvedFiles.join(", ")}, found ${declaredFiles.join(", ")}.`);
  }

  const referencedStatuses = declaredFiles.map((filePath) => authority.validators[filePath]?.status ?? "supporting");
  const hasBlocked = referencedStatuses.includes("blocked");
  const hasLegacy = referencedStatuses.includes("legacy");

  if ((hasBlocked || hasLegacy) && !scriptName.startsWith("legacy:")) {
    fail(`${scriptName} must not expose ${hasBlocked ? "blocked" : "legacy"} validators as a default check/score script.`);
  }

  if (entry.status === "blocked" && !scriptName.startsWith("legacy:")) {
    fail(`${scriptName} is blocked and may only appear as a legacy reference.`);
  }
}

const affectedPlanSource = read("scripts/agent/plan-affected-audits.ts");
requireIncludes(affectedPlanSource, "defaultAffectedAuditBlockedStatuses", "Affected audit planner");
requireIncludes(affectedPlanSource, "resolvePackageScriptValidatorFiles", "Affected audit planner");
requireIncludes(affectedPlanSource, "authority.validators[filePath]", "Affected audit planner");

if (packageScripts["score:validator-authority"] !== "tsx scripts/agent/score-validator-authority.ts") {
  fail("package.json must expose score:validator-authority.");
}
if (packageScripts["check:validator-authority"] !== "tsx scripts/agent/validate-validator-authority.ts") {
  fail("package.json must expose check:validator-authority.");
}

if (failures.length > 0) {
  console.error("Validator authority validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Validator authority validation passed.");
