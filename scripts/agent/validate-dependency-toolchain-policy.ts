import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { buildDependencyToolchainPolicyReport, validateDependencyToolchainPolicyReport } from "@/lib/config-hardening/dependency-toolchain-policy";

const ROOT = process.cwd();
function write(path: string, value: string) {
  const full = join(ROOT, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, value, "utf8");
}

const report = buildDependencyToolchainPolicyReport();
const validation = validateDependencyToolchainPolicyReport(report);

write("agent/state/dependency-toolchain-policy.generated.json", JSON.stringify({ ...report, validation }));
write("docs/agent-truth/dependency-toolchain-policy.md", [
  "# Dependency Toolchain Policy",
  "",
  `Generated: ${report.generatedAtUtc}`,
  `Policy status: ${report.policyStatus}`,
  `Provider SDK packages classified: ${report.providerSdkPackages.length}`,
  `Framework packages classified: ${report.frameworkPackages.length}`,
  `Test tooling packages classified: ${report.testToolingPackages.length}`,
  `Dependency PR classification: ${report.dependencyPrClassification}`,
  "",
].join("\n"));

if (!validation.ok) {
  console.error(validation.failures.join("\n"));
  process.exit(1);
}

console.log(`Dependency toolchain policy passed: providerSdkPackages=${report.providerSdkPackages.length}`);
