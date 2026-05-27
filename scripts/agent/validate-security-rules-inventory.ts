import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { buildSecurityRulesInventoryReport, validateSecurityRulesInventoryReport } from "@/lib/config-hardening/security-rules-contract";

const ROOT = process.cwd();
function write(path: string, value: string) {
  const full = join(ROOT, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, value, "utf8");
}

const report = buildSecurityRulesInventoryReport();
const validation = validateSecurityRulesInventoryReport(report);

write("agent/state/security-rules-inventory.generated.json", JSON.stringify({ ...report, validation }));
write("docs/agent-truth/security-rules-inventory.md", [
  "# Security Rules Inventory",
  "",
  `Generated: ${report.generatedAtUtc}`,
  `Rules files audited: ${report.rulesFiles.length}`,
  `Protected data classes: ${report.protectedDataClasses.length}`,
  `Risky patterns: ${report.riskyPatternCount}`,
  "",
  "## Files",
  "",
  ...report.rulesFiles.map((entry) => `- ${entry.path}: ${entry.status}`),
  "",
].join("\n"));

if (!validation.ok) {
  console.error(validation.failures.join("\n"));
  process.exit(1);
}

console.log(`Security rules inventory passed: files=${report.rulesFiles.length}`);
