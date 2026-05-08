import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures: string[] = [];

function readRequired(relativePath: string) {
  const fullPath = join(root, relativePath);
  if (!existsSync(fullPath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }

  return readFileSync(fullPath, "utf8");
}

function requireIncludes(source: string, needle: string, label: string) {
  if (!source.includes(needle)) {
    failures.push(`${label} must include "${needle}".`);
  }
}

function requireArray(value: unknown, label: string, minLength = 1): unknown[] {
  if (!Array.isArray(value)) {
    failures.push(`${label} must be an array.`);
    return [];
  }

  if (value.length < minLength) {
    failures.push(`${label} must include at least ${minLength} item(s).`);
  }

  return value;
}

function requireObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    failures.push(`${label} must be an object.`);
    return {};
  }

  return value as Record<string, unknown>;
}

const scopeDocPath = "docs/agent-truth/launch-finalization-scope.md";
const baselinePath = "agent/state/launch-finalization-baseline.generated.json";
const validationPath = "scripts/agent/validate-launch-finalization-baseline.ts";

const scopeDoc = readRequired(scopeDocPath);
const baselineSource = readRequired(baselinePath);
const auditLedger = readRequired("FULL_SCALE_CODEBASE_AUDIT.md");
const memoryLedger = readRequired("REPO_MEMORY_LEDGER.md");
const checklist = readRequired("EVERY_FILE_FUNCTION_CHECKLIST.md");
const packageJsonSource = readRequired("package.json");

let baseline: Record<string, unknown> = {};
try {
  baseline = JSON.parse(baselineSource) as Record<string, unknown>;
} catch (error) {
  failures.push(`${baselinePath} must be valid JSON: ${(error as Error).message}`);
}

const launchSurfaces = [
  "Auth and onboarding",
  "Drops discovery",
  "Drop detail",
  "Wallet and Gum Drops balance",
  "Purchase flow",
  "Unlock flow",
  "Viewer/content access",
  "Chat/messages",
  "Notifications",
  "Creator profile routing",
  "404/recovery routes",
  "Admin overview/analytics/debug truth",
  "Security/payment/admin route protection",
  "Mobile bottom-nav and safe-area layout",
];

for (const surface of launchSurfaces) {
  requireIncludes(scopeDoc, surface, scopeDocPath);
}

for (const heading of [
  "## Launch-Critical Surfaces",
  "### Blocked",
  "### Warning",
  "### Deferred",
  "## Frozen Feature List",
  "## Allowed Change Types",
  "## Forbidden Change Types",
  "## Required Validation Gates",
  "## Risk Ranking",
  "## Current PR And Commit Risk Notes",
]) {
  requireIncludes(scopeDoc, heading, scopeDocPath);
}

for (const requiredCopy of [
  "Do not add new features.",
  "Do not redesign entire pages unless the current page blocks launch.",
  "Do not hide failures with cosmetic copy.",
  "Do not remove validation, source labels, audit metadata, or Debug truth.",
  "npm run check:launch-finalization-baseline",
]) {
  requireIncludes(scopeDoc, requiredCopy, scopeDocPath);
}

const baselineSurfaces = requireArray(baseline.launchCriticalSurfaces, "baseline.launchCriticalSurfaces", launchSurfaces.length);
const baselineSurfaceLabels = baselineSurfaces
  .map((surface) => requireObject(surface, "baseline.launchCriticalSurfaces item").label)
  .filter((label): label is string => typeof label === "string");

for (const surface of launchSurfaces) {
  if (!baselineSurfaceLabels.includes(surface)) {
    failures.push(`baseline.launchCriticalSurfaces is missing "${surface}".`);
  }
}

const categories = requireObject(baseline.categories, "baseline.categories");
requireArray(categories.blocked, "baseline.categories.blocked", 0);
requireArray(categories.warnings, "baseline.categories.warnings");
requireArray(categories.deferred, "baseline.categories.deferred");

requireArray(baseline.frozenFeatureList, "baseline.frozenFeatureList");
requireArray(baseline.allowedChangeTypes, "baseline.allowedChangeTypes");
requireArray(baseline.forbiddenChangeTypes, "baseline.forbiddenChangeTypes");
requireArray(baseline.requiredValidationGates, "baseline.requiredValidationGates");
requireArray(baseline.riskRanking, "baseline.riskRanking");
requireArray(baseline.commitRiskNotes, "baseline.commitRiskNotes");
requireArray(baseline.openPrRiskNotes, "baseline.openPrRiskNotes");
requireArray(baseline.scopeFreezeRules, "baseline.scopeFreezeRules");

const requiredGates = requireArray(baseline.requiredValidationGates, "baseline.requiredValidationGates")
  .filter((gate): gate is string => typeof gate === "string");

for (const gate of [
  "npm run check:launch-finalization-baseline",
  "npm run typecheck -- --pretty false",
  "npm run check:human-readable-admin-copy",
  "npm run check:refresh-based-hot-cache",
  "npm run check:global-loading-performance",
  "npm run check:admin-truth-replacement",
]) {
  if (!requiredGates.includes(gate)) {
    failures.push(`baseline.requiredValidationGates is missing "${gate}".`);
  }
}

const forbiddenChangeTypes = requireArray(baseline.forbiddenChangeTypes, "baseline.forbiddenChangeTypes")
  .filter((item): item is string => typeof item === "string")
  .join("\n");

for (const forbidden of ["New product features", "Full-page redesigns", "Fake zeros", "Touching unrelated modules"]) {
  requireIncludes(forbiddenChangeTypes, forbidden, "baseline.forbiddenChangeTypes");
}

for (const ledgerNeedle of [
  "Launch Finalization Scope Freeze",
  "launch-finalization-scope.md",
  "launch-finalization-baseline.generated.json",
]) {
  requireIncludes(auditLedger, ledgerNeedle, "FULL_SCALE_CODEBASE_AUDIT.md");
  requireIncludes(checklist, ledgerNeedle, "EVERY_FILE_FUNCTION_CHECKLIST.md");
}

for (const memoryNeedle of [
  "Launch finalization scope is frozen",
  "docs/agent-truth/launch-finalization-scope.md",
  "npm run check:launch-finalization-baseline",
]) {
  requireIncludes(memoryLedger, memoryNeedle, "REPO_MEMORY_LEDGER.md");
}

requireIncludes(packageJsonSource, "\"check:launch-finalization-baseline\"", "package.json");
requireIncludes(packageJsonSource, validationPath, "package.json");

if (failures.length > 0) {
  console.error("Launch finalization baseline validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Launch finalization baseline validation passed.");
