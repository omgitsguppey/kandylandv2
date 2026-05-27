import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  buildCodexMemoryWritebackReport,
  validateCodexMemoryWritebackReport,
} from "@/lib/backend-hardening/backend-service-consolidator";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/codex-memory-writeback.generated.json";
const DOC_PATH = "docs/agent-truth/codex-memory-writeback.md";

function run(command: string, args: readonly string[]) {
  try {
    return execFileSync(command, args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function write(path: string, value: string) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value, "utf8");
}

function lineCount(path: string) {
  return existsSync(join(ROOT, path)) ? readFileSync(join(ROOT, path), "utf8").split(/\r?\n/u).length : 0;
}

function renderDoc(report: ReturnType<typeof buildCodexMemoryWritebackReport>) {
  return [
    "# Codex Memory Writeback",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current head: ${report.currentHead}`,
    "",
    "## Summary",
    "",
    `- Memory source: ${report.memoryWriteback.memorySource}`,
    `- Entries added: ${report.memoryWriteback.entriesAdded}`,
    `- Missing lessons: ${report.missingLessons.length}`,
    "",
    "## Mistake Patterns Captured",
    "",
    ...report.memoryWriteback.mistakePatternsCaptured.map((pattern) => `- ${pattern}`),
    "",
  ].join("\n");
}

const report = buildCodexMemoryWritebackReport({
  generatedAtUtc: new Date().toISOString(),
  currentHead: run("git", ["rev-parse", "--short", "HEAD"]) || "unknown",
});
const validation = validateCodexMemoryWritebackReport(report);
write(REPORT_PATH, JSON.stringify({ ...report, validationFailures: validation.failures }));
write(DOC_PATH, renderDoc(report));

const failures = [...validation.failures];
if (lineCount(REPORT_PATH) > 500) failures.push(`${REPORT_PATH} exceeds 500 lines.`);
if (failures.length) {
  console.error("Codex memory writeback validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Codex memory writeback validation passed.");
