import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { buildHydrationRaceCleanupReport, validateHydrationRaceCleanupReport } from "@/lib/frontend-hardening/hydration-race-guard";

const ROOT = process.cwd();
const run = (command: string, args: readonly string[]) => {
  try { return execFileSync(command, args, { cwd: ROOT, encoding: "utf8" }).trim(); } catch { return ""; }
};
const write = (path: string, value: string) => {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value, "utf8");
};

const report = buildHydrationRaceCleanupReport({ currentHead: run("git", ["rev-parse", "--short", "HEAD"]) || "unknown" });
const validation = validateHydrationRaceCleanupReport(report);
write("agent/state/hydration-race-cleanup.generated.json", JSON.stringify({ ...report, validationFailures: validation.failures }, null, 2));
write("docs/agent-truth/hydration-race-cleanup.md", [
  "# Hydration Race Cleanup",
  "",
  `Generated: ${report.generatedAtUtc}`,
  `Current head: ${report.currentHead}`,
  "",
  `- High-risk surfaces: ${report.highRiskSurfaces.join(", ")}`,
  `- Hydration risks classified: ${report.hydrationRaceRisksFixed}`,
  "",
  "## Remaining Risks",
  "",
  ...report.remainingRisks.map((risk) => `- ${risk}`),
  "",
].join("\n"));
if (validation.failures.length) {
  console.error("Hydration race cleanup validation failed:");
  for (const failure of validation.failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("Hydration race cleanup validation passed.");
