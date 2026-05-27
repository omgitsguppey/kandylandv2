import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { buildFrontendTelemetryConsolidationReport, validateFrontendTelemetryConsolidationReport } from "@/lib/frontend-hardening/frontend-telemetry-usage";

const ROOT = process.cwd();
const run = (command: string, args: readonly string[]) => {
  try { return execFileSync(command, args, { cwd: ROOT, encoding: "utf8" }).trim(); } catch { return ""; }
};
const write = (path: string, value: string) => {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value, "utf8");
};

const report = buildFrontendTelemetryConsolidationReport({ currentHead: run("git", ["rev-parse", "--short", "HEAD"]) || "unknown" });
const validation = validateFrontendTelemetryConsolidationReport(report);
write("agent/state/frontend-telemetry-consolidation.generated.json", JSON.stringify({ ...report, validationFailures: validation.failures }, null, 2));
write("docs/agent-truth/frontend-telemetry-consolidation.md", [
  "# Frontend Telemetry Consolidation",
  "",
  `Generated: ${report.generatedAtUtc}`,
  `Current head: ${report.currentHead}`,
  "",
  `- Direct telemetry calls audited: ${report.directTelemetryCallsAudited}`,
  `- Direct telemetry paths classified: ${report.directTelemetryCallsReduced}`,
  `- Owners: ${report.telemetryOwners.join(", ")}`,
  "",
].join("\n"));
if (validation.failures.length) {
  console.error("Frontend telemetry consolidation validation failed:");
  for (const failure of validation.failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("Frontend telemetry consolidation validation passed.");
