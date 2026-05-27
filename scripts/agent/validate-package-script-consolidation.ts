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

write("agent/state/package-script-consolidation.generated.json", JSON.stringify({ ...report, validation }));
write("docs/agent-truth/package-script-consolidation.md", [
  "# Package Script Consolidation",
  "",
  `Generated: ${report.generatedAtUtc}`,
  `Package scripts audited: ${report.totalScripts}`,
  `Duplicate aliases classified: ${report.duplicateAliases.length}`,
  `Canonical exit scripts: ${report.canonicalExitScripts.join(", ")}`,
  "",
  "## Duplicate Aliases",
  "",
  ...(report.duplicateAliases.slice(0, 25).map((entry) => `- ${entry.scriptName}: duplicate of ${entry.duplicateOf}`)),
  ...(report.duplicateAliases.length > 25 ? [`- ${report.duplicateAliases.length - 25} additional aliases remain classified in artifact.`] : []),
  "",
].join("\n"));

if (!validation.ok) {
  console.error(validation.failures.join("\n"));
  process.exit(1);
}

console.log(`Package script consolidation passed: scripts=${report.totalScripts} duplicateAliases=${report.duplicateAliases.length}`);
