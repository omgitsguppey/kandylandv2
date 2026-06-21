import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { buildPackageScriptConsolidationReport, validatePackageScriptConsolidationReport } from "@/lib/config-hardening/package-script-inventory";

const ROOT = process.cwd();
function write(path: string, value: string) {
  const full = join(ROOT, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, value, "utf8");
}

const report = buildPackageScriptConsolidationReport();
const validation = validatePackageScriptConsolidationReport(report);
const compactReport = {
  generatedAtUtc: report.generatedAtUtc,
  totalScripts: report.totalScripts,
  reportFormat: "compact_summary",
  omittedScriptCount: report.scripts.length,
  duplicateAliases: report.duplicateAliases,
  canonicalExitScripts: report.canonicalExitScripts,
  staleFastLoopScripts: report.staleFastLoopScripts,
  releaseDeployRiskScripts: report.releaseDeployRiskScripts,
  scoreScriptsWithoutFreshnessOwner: report.scoreScriptsWithoutFreshnessOwner,
  remainingGaps: report.remainingGaps,
  validation,
};

write("agent/state/package-script-consolidation.generated.json", JSON.stringify(compactReport));

if (!validation.ok) {
  console.error(validation.failures.join("\n"));
  process.exit(1);
}

console.log(`Package script consolidation passed: scripts=${report.totalScripts} duplicateAliases=${report.duplicateAliases.length}`);
