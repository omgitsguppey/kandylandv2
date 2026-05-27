import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { buildConfigEnvContractReport, validateConfigEnvContractReport } from "@/lib/config-hardening/config-env-contract";

const ROOT = process.cwd();

function write(path: string, value: string) {
  const full = join(ROOT, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, value, "utf8");
}

const report = buildConfigEnvContractReport();
const validation = validateConfigEnvContractReport(report);

write("agent/state/config-env-contract.generated.json", JSON.stringify({ ...report, validation }));
write("docs/agent-truth/config-env-contract.md", [
  "# Config Env Contract",
  "",
  `Generated: ${report.generatedAtUtc}`,
  `Env vars audited: ${report.envVars.length}`,
  `Public env vars: ${report.publicEnvCount}`,
  `Server secrets: ${report.serverSecretCount}`,
  `Secret value leaks: ${report.secretValueLeakCount}`,
  "",
  "## Remaining Gaps",
  "",
  ...report.remainingGaps.map((gap) => `- ${gap}`),
  "",
].join("\n"));

if (!validation.ok) {
  console.error(validation.failures.join("\n"));
  process.exit(1);
}

console.log(`Config env contract passed: envVars=${report.envVars.length}`);
