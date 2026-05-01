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

function parseJson(relativePath: string) {
  const source = readRequired(relativePath);
  try {
    return JSON.parse(source) as Record<string, unknown>;
  } catch (error) {
    failures.push(`${relativePath} must be valid JSON: ${(error as Error).message}`);
    return {};
  }
}

function requireIncludes(source: string, expected: string, label: string) {
  if (!source.includes(expected)) {
    failures.push(`${label} must include "${expected}".`);
  }
}

function requireNotIncludes(source: string, banned: string, label: string) {
  if (source.includes(banned)) {
    failures.push(`${label} must not include "${banned}".`);
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

function requireFile(relativePath: string, label: string) {
  if (!existsSync(join(root, relativePath))) {
    failures.push(`${label} is missing required file ${relativePath}.`);
  }
}

const audit = parseJson("agent/state/user-critical-path-audit.generated.json");
const report = parseJson("agent/state/user-critical-path-fix-report.generated.json");
const doc = readRequired("docs/agent-truth/user-critical-path-launch.md");
const dropsValidator = readRequired("scripts/agent/validate-drops-mobile-refinement.ts");
const criticalPathValidator = readRequired("scripts/agent/validate-user-critical-path-launch.ts");
const dropCardParts = readRequired("src/components/DropCardParts.tsx");
const dropCountdown = readRequired("src/lib/drop-countdown.ts");
const dropCountdownTest = readRequired("tests/unit/drop-countdown.spec.ts");
const packageJson = readRequired("package.json");
const auditLedger = readRequired("FULL_SCALE_CODEBASE_AUDIT.md");

const issues = requireArray(audit.issues, "audit.issues");
const blockerIds = issues
  .filter((issue) => {
    if (!issue || typeof issue !== "object") return false;
    const candidate = issue as Record<string, unknown>;
    return candidate.severity === "blocker" || candidate.severity === "high";
  })
  .map((issue) => (issue as Record<string, unknown>).id)
  .filter((id): id is string => typeof id === "string");

if (!blockerIds.includes("UCP-001")) {
  failures.push("Audit must include high-priority issue UCP-001.");
}

const fixedIssues = requireArray(report.fixedIssues, "report.fixedIssues");
const fixedIds = fixedIssues
  .map((issue) => (issue && typeof issue === "object" ? (issue as Record<string, unknown>).auditIssueId : null))
  .filter((id): id is string => typeof id === "string");

for (const id of blockerIds) {
  if (!fixedIds.includes(id)) {
    failures.push(`Fix report must include fixed blocker/high issue ${id}.`);
  }
  requireIncludes(doc, id, "User critical path launch doc");
}

for (const requiredRoute of [
  "src/app/page.tsx",
  "src/app/drops/page.tsx",
  "src/app/experiences/page.tsx",
  "src/app/dashboard/page.tsx",
  "src/app/dashboard/chat/page.tsx",
  "src/app/dashboard/library/page.tsx",
  "src/app/dashboard/viewer/page.tsx",
  "src/app/creators/[username]/page.tsx",
  "src/app/not-found.tsx",
  "src/app/api/drops/unlock/route.ts",
  "src/app/api/paypal/capture/route.ts",
  "src/app/api/notifications/route.ts",
  "src/app/api/chat/threads/[threadId]/route.ts",
]) {
  requireFile(requiredRoute, "Critical user route");
}

for (const expected of [
  "formatDropCountdown",
  "src/lib/drop-countdown.ts",
  "Always available",
]) {
  requireIncludes(dropsValidator, expected, "Drops mobile validator");
}

requireNotIncludes(dropsValidator, "\"formatTimer\"", "Drops mobile validator");
requireIncludes(dropCardParts, "formatDropCountdown", "DropCard timer component");
requireNotIncludes(dropCardParts, "setInterval", "DropCard timer component");
requireIncludes(dropCountdown, "Always available", "Drop countdown helper");
requireIncludes(dropCountdownTest, "Always available", "Drop countdown tests");

for (const command of [
  "npm run check:drops-mobile-refinement",
  "npm run check:user-chat-shell-routing",
  "npm run check:not-found",
  "npm run check:notification-pipeline",
  "npx vitest run tests/unit/drop-countdown.spec.ts",
  "npm run typecheck -- --pretty false",
]) {
  requireIncludes(JSON.stringify(report), command, "Fix report validation plan");
  requireIncludes(doc, command, "User critical path launch doc");
}

for (const expected of [
  "check:user-critical-path-launch",
  "scripts/agent/validate-user-critical-path-launch.ts",
]) {
  requireIncludes(packageJson, expected, "package.json");
}

for (const expected of [
  "User Critical Path Launch Fix",
  "UCP-001",
  "user-critical-path-fix-report.generated.json",
]) {
  requireIncludes(auditLedger, expected, "FULL_SCALE_CODEBASE_AUDIT.md");
}

requireIncludes(criticalPathValidator, "Critical user route", "Critical path validator");

if (failures.length > 0) {
  console.error("User critical path launch validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("User critical path launch validation passed.");
