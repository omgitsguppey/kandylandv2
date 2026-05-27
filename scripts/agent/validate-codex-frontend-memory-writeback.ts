import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { buildCodexFrontendMemoryWritebackReport, validateCodexFrontendMemoryWritebackReport } from "@/lib/frontend-hardening/client-state-ownership";

const ROOT = process.cwd();
const run = (command: string, args: readonly string[]) => {
  try { return execFileSync(command, args, { cwd: ROOT, encoding: "utf8" }).trim(); } catch { return ""; }
};
const write = (path: string, value: string) => {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value, "utf8");
};

const report = buildCodexFrontendMemoryWritebackReport({ currentHead: run("git", ["rev-parse", "--short", "HEAD"]) || "unknown" });
const validation = validateCodexFrontendMemoryWritebackReport(report);
write("agent/state/codex-frontend-memory-writeback.generated.json", JSON.stringify({ ...report, validationFailures: validation.failures }, null, 2));
write("docs/agent-truth/codex-frontend-memory-writeback.md", [
  "# Codex Frontend Memory Writeback",
  "",
  `Generated: ${report.generatedAtUtc}`,
  `Current head: ${report.currentHead}`,
  `Memory source: ${report.memorySource}`,
  `Entries added: ${report.entriesAdded}`,
  "",
  ...report.mistakePatternsCaptured.map((pattern) => `- ${pattern}`),
  "",
].join("\n"));
if (validation.failures.length) {
  console.error("Codex frontend memory writeback validation failed:");
  for (const failure of validation.failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("Codex frontend memory writeback validation passed.");
