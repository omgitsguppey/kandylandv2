import { existsSync, readFileSync } from "node:fs";

const root = process.cwd();
const failures: string[] = [];

function readRequired(relativePath: string) {
  const fullPath = `${root}/${relativePath}`;
  if (!existsSync(fullPath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
}

function requireIncludes(source: string, expected: string, label: string) {
  if (!source.includes(expected)) {
    failures.push(`${label} must include "${expected}".`);
  }
}

const packageJson = readRequired("package.json");
const scanScript = readRequired("scripts/agent/scan-codebase-junk.ts");
const report = readRequired("agent/state/codebase-junk-cleanup.generated.json");
const doc = readRequired("docs/agent-truth/codebase-junk-cleanup.md");

requireIncludes(packageJson, "\"scan:codebase-junk\"", "package.json");
requireIncludes(packageJson, "\"check:codebase-junk-cleanup\"", "package.json");
requireIncludes(scanScript, "orphan_candidate", "scan-codebase-junk.ts");
requireIncludes(scanScript, "generated_snapshot", "scan-codebase-junk.ts");
requireIncludes(scanScript, "recordsTotalCount", "scan-codebase-junk.ts");
requireIncludes(scanScript, "recordCountsByClassification", "scan-codebase-junk.ts");
requireIncludes(scanScript, "compactRecords", "scan-codebase-junk.ts");
requireIncludes(report, "\"status\"", "codebase junk report");
requireIncludes(report, "\"records\"", "codebase junk report");
requireIncludes(report, "\"recordsTotalCount\"", "codebase junk report");
requireIncludes(report, "\"recordsEmittedCount\"", "codebase junk report");
requireIncludes(report, "\"recordsOmittedCount\"", "codebase junk report");
requireIncludes(report, "\"recordCountsByClassification\"", "codebase junk report");
requireIncludes(report, "\"recordsCapReason\"", "codebase junk report");
requireIncludes(doc, "Codebase junk cleanup", "docs/agent-truth/codebase-junk-cleanup.md");
requireIncludes(doc, "Classification", "docs/agent-truth/codebase-junk-cleanup.md");

if (failures.length > 0) {
  console.error("Codebase junk cleanup validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Codebase junk cleanup validation passed.");
