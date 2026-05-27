import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { buildCiReleaseDisciplineReport } from "@/lib/config-hardening/ci-release-discipline";
import { buildConfigEnvContractReport } from "@/lib/config-hardening/config-env-contract";
import { buildConfigInfraMemoryWritebackReport, validateConfigInfraMemoryWritebackReport } from "@/lib/config-hardening/config-infra-memory-writeback";
import { buildDependencyToolchainPolicyReport } from "@/lib/config-hardening/dependency-toolchain-policy";
import { buildPackageScriptConsolidationReport } from "@/lib/config-hardening/package-script-inventory";
import { buildSecurityHeaderRouteConfigReport } from "@/lib/config-hardening/security-header-contract";
import { buildSecurityRulesInventoryReport } from "@/lib/config-hardening/security-rules-contract";

const ROOT = process.cwd();

function write(path: string, value: string) {
  const full = join(ROOT, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, value, "utf8");
}

function read(path: string) {
  const full = join(ROOT, path);
  return existsSync(full) ? readFileSync(full, "utf8") : "";
}

function run(command: string, args: readonly string[]) {
  try {
    return execFileSync(command, args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function numstat() {
  let additions = 0;
  let deletions = 0;
  for (const args of [["diff", "--numstat"], ["diff", "--cached", "--numstat"]] as const) {
    for (const line of run("git", args).split(/\r?\n/u)) {
      const [added, deleted] = line.split(/\s+/u);
      additions += Number(added) || 0;
      deletions += Number(deleted) || 0;
    }
  }
  for (const file of run("git", ["ls-files", "--others", "--exclude-standard"]).split(/\r?\n/u).filter(Boolean)) {
    additions += read(file).split(/\r?\n/u).length;
  }
  return { additions, deletions };
}

function betaScore() {
  try {
    const parsed = JSON.parse(read("agent/state/public-beta-score.generated.json")) as { healthScore?: number; scannerScore?: number };
    return parsed.healthScore ?? parsed.scannerScore ?? "unknown";
  } catch {
    return "unknown";
  }
}

const generatedAtUtc = new Date().toISOString();
const report = buildConfigInfraMemoryWritebackReport({ generatedAtUtc });
const validation = validateConfigInfraMemoryWritebackReport(report);
const env = buildConfigEnvContractReport({ generatedAtUtc });
const rules = buildSecurityRulesInventoryReport({ generatedAtUtc });
const scripts = buildPackageScriptConsolidationReport({ generatedAtUtc });
const ci = buildCiReleaseDisciplineReport({ generatedAtUtc });
const headers = buildSecurityHeaderRouteConfigReport({ generatedAtUtc });
const dependency = buildDependencyToolchainPolicyReport({ generatedAtUtc });
const diff = numstat();
const currentHead = run("git", ["rev-parse", "--short", "HEAD"]) || "unknown";
const score = betaScore();

write("agent/state/config-infra-memory-writeback.generated.json", JSON.stringify({ ...report, validation }));
write("docs/agent-truth/config-infra-memory-writeback.md", [
  "# Config Infra Memory Writeback",
  "",
  `Generated: ${report.generatedAtUtc}`,
  `Memory source: ${report.memorySource}`,
  `Required lessons: ${report.requiredLessons.length}`,
  `Entries present: ${report.entriesAdded}`,
  "",
].join("\n"));

write("agent/state/config-infra-gut-consolidation.generated.json", JSON.stringify({
  generatedAtUtc,
  currentHead,
  envVarsAudited: env.envVars.length,
  rulesFilesAudited: rules.rulesFiles.length,
  packageScriptsAudited: scripts.totalScripts,
  duplicateScriptsRetired: 0,
  workflowsAudited: ci.workflows.length,
  securityHeadersClassified: headers.securityHeaders.length,
  dependencyPolicyStatus: dependency.policyStatus,
  configRisksFound: rules.riskyPatternCount + env.unsafePublicSecretNames.length + ci.accidentalDeployRisks.length + headers.riskyPatterns.length,
  configRisksFixed: 0,
  memoryEntriesAdded: report.entriesAdded,
  netAdditions: diff.additions,
  netDeletions: diff.deletions,
  scoreBefore: score,
  scoreAfter: score,
  remainingGaps: [
    ...env.remainingGaps,
    ...rules.remainingGaps,
    ...ci.remainingGaps,
    ...headers.remainingGaps,
    ...dependency.remainingGaps,
    "No duplicate package scripts were deleted; aliases are classified for owner-safe retirement.",
  ],
  nextExactSteps: [
    "Retire classified package-script aliases only after callers are updated.",
    "Keep cloud/provider readiness as manual read-only evidence outside source validation.",
    "Run config validators before any future env, rules, CI, deployment, or dependency change.",
  ],
}));
write("docs/agent-truth/config-infra-gut-consolidation.md", [
  "# Config Infra Gut Consolidation",
  "",
  `Generated: ${generatedAtUtc}`,
  `Current head: ${currentHead}`,
  "",
  `- Env vars audited: ${env.envVars.length}`,
  `- Rules files audited: ${rules.rulesFiles.length}`,
  `- Package scripts audited: ${scripts.totalScripts}`,
  `- Workflows audited: ${ci.workflows.length}`,
  `- Security headers classified: ${headers.securityHeaders.length}`,
  `- Duplicate scripts retired: 0`,
  `- Net additions/deletions at generation time: ${diff.additions}/${diff.deletions}`,
  "",
  "## Remaining Gaps",
  "",
  "- Duplicate aliases are classified but not deleted until owners/callers are updated.",
  "- Provider deployment readiness remains external operator evidence, not source-test proof.",
  "",
].join("\n"));

if (!validation.ok) {
  console.error(validation.failures.join("\n"));
  process.exit(1);
}

console.log(`Config infra memory writeback passed: entries=${report.entriesAdded}`);
