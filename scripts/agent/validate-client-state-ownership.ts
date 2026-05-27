import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { buildClientStateOwnershipReport, validateClientStateOwnershipReport } from "@/lib/frontend-hardening/client-state-ownership";

const ROOT = process.cwd();
const run = (command: string, args: readonly string[]) => {
  try { return execFileSync(command, args, { cwd: ROOT, encoding: "utf8" }).trim(); } catch { return ""; }
};
const write = (path: string, value: string) => {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value, "utf8");
};

const report = buildClientStateOwnershipReport({ currentHead: run("git", ["rev-parse", "--short", "HEAD"]) || "unknown" });
const validation = validateClientStateOwnershipReport(report);
write("agent/state/client-state-ownership.generated.json", JSON.stringify({ ...report, validationFailures: validation.failures }, null, 2));
write("docs/agent-truth/client-state-ownership.md", [
  "# Client State Ownership",
  "",
  `Generated: ${report.generatedAtUtc}`,
  `Current head: ${report.currentHead}`,
  "",
  ...report.routesThroughCanonicalHooks.map((line) => `- ${line}`),
  "",
].join("\n"));
if (validation.failures.length) {
  console.error("Client state ownership validation failed:");
  for (const failure of validation.failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("Client state ownership validation passed.");
