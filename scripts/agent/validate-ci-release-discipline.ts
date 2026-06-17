import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { buildCiReleaseDisciplineReport, validateCiReleaseDisciplineReport } from "@/lib/config-hardening/ci-release-discipline";

const ROOT = process.cwd();
function write(path: string, value: string) {
  const full = join(ROOT, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, value, "utf8");
}

const report = buildCiReleaseDisciplineReport();
const validation = validateCiReleaseDisciplineReport(report);

write("agent/state/ci-release-discipline.generated.json", JSON.stringify({ ...report, validation }));
write("docs/agent-truth/ci-release-discipline.md", [
  "# CI Release Discipline",
  "",
  `Generated: ${report.generatedAtUtc}`,
  `Workflows audited: ${report.workflows.length}`,
  `Release notes owner: ${report.releaseNotesFreshnessOwner}`,
  `Open PR hygiene owner: ${report.openPrHygieneOwner}`,
  `Beta exit freshness owner: ${report.betaExitFreshnessOwner}`,
  "",
  "## Workflows",
  "",
  ...report.workflows.map((workflow) => `- ${workflow.file}: ${workflow.classification}, provider=${workflow.providerCallRisk}, deploy=${workflow.deploymentRisk}`),
  "",
  "## External Check Providers",
  "",
  ...report.externalCheckProviders.map((provider) => [
    `- ${provider.githubCheckName}: ${provider.releaseGateClassification}`,
    `  - authority: ${provider.authority}`,
    `  - can clear from source checks: ${provider.canBeClearedBySourceChecks ? "yes" : "no"}`,
    `  - required before beta exit: ${provider.requiredBeforeBetaExit ? "yes" : "no"}`,
    `  - source owner: ${provider.sourceValidationOwner}`,
    `  - next: ${provider.nextExactAction}`,
  ].join("\n")),
  "",
].join("\n"));

if (!validation.ok) {
  console.error(validation.failures.join("\n"));
  process.exit(1);
}

console.log(`CI release discipline passed: workflows=${report.workflows.length}`);
